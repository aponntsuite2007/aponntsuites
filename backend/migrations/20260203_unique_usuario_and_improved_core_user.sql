-- ============================================================================
-- MIGRACIÓN: Usuario único por empresa + Función mejorada de CORE user
-- ============================================================================
-- 1. Agregar UNIQUE constraint en (company_id, usuario)
-- 2. Función para obtener usuario disponible (con auto-sufijo)
-- 3. Función mejorada create_core_user_for_company
-- ============================================================================

-- ============================================================================
-- PARTE 1: UNIQUE CONSTRAINT
-- ============================================================================

-- Primero verificar si hay duplicados existentes y corregirlos
DO $$
DECLARE
    r RECORD;
    v_counter INTEGER;
BEGIN
    -- Encontrar usuarios duplicados por empresa
    FOR r IN
        SELECT company_id, usuario, COUNT(*) as cnt
        FROM users
        WHERE usuario IS NOT NULL
        GROUP BY company_id, usuario
        HAVING COUNT(*) > 1
    LOOP
        v_counter := 2;
        -- Renombrar los duplicados (excepto el primero)
        FOR r IN
            SELECT user_id
            FROM users
            WHERE company_id = r.company_id AND usuario = r.usuario
            ORDER BY "createdAt" ASC
            OFFSET 1
        LOOP
            UPDATE users
            SET usuario = r.usuario || v_counter::TEXT
            WHERE user_id = r.user_id;
            v_counter := v_counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- Ahora agregar el constraint (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_usuario_per_company'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT unique_usuario_per_company
        UNIQUE (company_id, usuario);
        RAISE NOTICE 'Constraint unique_usuario_per_company creado';
    ELSE
        RAISE NOTICE 'Constraint unique_usuario_per_company ya existe';
    END IF;
END $$;

-- ============================================================================
-- PARTE 2: FUNCIÓN PARA OBTENER USUARIO DISPONIBLE
-- ============================================================================

CREATE OR REPLACE FUNCTION get_available_username(
    p_company_id INTEGER,
    p_desired_username VARCHAR
)
RETURNS VARCHAR AS $$
DECLARE
    v_username VARCHAR;
    v_counter INTEGER := 2;
BEGIN
    -- Normalizar: minúsculas, sin espacios
    v_username := LOWER(TRIM(REGEXP_REPLACE(p_desired_username, '\s+', '', 'g')));

    -- Si está vacío, usar 'usuario'
    IF v_username IS NULL OR v_username = '' THEN
        v_username := 'usuario';
    END IF;

    -- Verificar si está disponible
    IF NOT EXISTS (SELECT 1 FROM users WHERE company_id = p_company_id AND usuario = v_username) THEN
        RETURN v_username;
    END IF;

    -- Buscar uno disponible con sufijo numérico
    WHILE EXISTS (SELECT 1 FROM users WHERE company_id = p_company_id AND usuario = v_username || v_counter::TEXT) LOOP
        v_counter := v_counter + 1;
        IF v_counter > 999 THEN
            RAISE EXCEPTION 'No se pudo generar usuario único después de 999 intentos';
        END IF;
    END LOOP;

    RETURN v_username || v_counter::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PARTE 3: FUNCIÓN MEJORADA CREATE_CORE_USER_FOR_COMPANY
-- ============================================================================

CREATE OR REPLACE FUNCTION create_core_user_for_company(
    p_company_id INTEGER,
    p_onboarding_trace_id UUID DEFAULT NULL,
    p_created_by INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_default_password VARCHAR := 'admin123';
    v_password_hash VARCHAR;
    v_company_name VARCHAR;
    v_company_email VARCHAR;
    v_signer_name VARCHAR;
    v_signer_dni VARCHAR;
    v_signer_email VARCHAR;
    v_first_name VARCHAR;
    v_last_name VARCHAR;
    v_employee_id VARCHAR;
    v_username VARCHAR;
    v_space_pos INTEGER;
BEGIN
    -- ═══════════════════════════════════════════════════════════════════════
    -- VERIFICAR SI YA EXISTE USUARIO CORE O ADMINISTRADOR
    -- ═══════════════════════════════════════════════════════════════════════

    -- Si ya existe un usuario CORE, retornarlo
    IF EXISTS (SELECT 1 FROM users WHERE company_id = p_company_id AND is_core_user = TRUE) THEN
        SELECT user_id INTO v_user_id
        FROM users WHERE company_id = p_company_id AND is_core_user = TRUE LIMIT 1;
        RETURN v_user_id;
    END IF;

    -- Si ya existe "administrador", convertirlo a CORE y actualizar password
    IF EXISTS (SELECT 1 FROM users WHERE company_id = p_company_id AND usuario = 'administrador') THEN
        UPDATE users
        SET is_core_user = TRUE,
            force_password_change = TRUE,
            password = crypt(v_default_password, gen_salt('bf', 10)),
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE company_id = p_company_id AND usuario = 'administrador'
        RETURNING user_id INTO v_user_id;
        RETURN v_user_id;
    END IF;

    -- ═══════════════════════════════════════════════════════════════════════
    -- OBTENER DATOS DE LA EMPRESA
    -- ═══════════════════════════════════════════════════════════════════════

    SELECT name, contact_email INTO v_company_name, v_company_email
    FROM companies WHERE company_id = p_company_id;

    IF v_company_name IS NULL THEN
        RAISE EXCEPTION 'Empresa no encontrada: %', p_company_id;
    END IF;

    -- ═══════════════════════════════════════════════════════════════════════
    -- BUSCAR DATOS DEL FIRMANTE EN EL QUOTE MÁS RECIENTE (cualquier dato)
    -- ═══════════════════════════════════════════════════════════════════════

    SELECT
        contract_signer_name,
        COALESCE(
            contract_signer_dni,
            contract_acceptance_data->>'cuit',
            contract_acceptance_data->>'dni',
            contract_acceptance_data->>'tax_id'
        ),
        contract_acceptance_data->>'accepted_by_email'
    INTO v_signer_name, v_signer_dni, v_signer_email
    FROM quotes
    WHERE company_id = p_company_id
      AND (
          contract_signer_name IS NOT NULL
          OR contract_signer_dni IS NOT NULL
          OR contract_acceptance_data->>'accepted_by_email' IS NOT NULL
          OR contract_acceptance_data->>'cuit' IS NOT NULL
      )
    ORDER BY accepted_date DESC NULLS LAST, created_at DESC
    LIMIT 1;

    -- ═══════════════════════════════════════════════════════════════════════
    -- SEPARAR NOMBRE Y APELLIDO
    -- ═══════════════════════════════════════════════════════════════════════

    IF v_signer_name IS NOT NULL AND LENGTH(TRIM(v_signer_name)) > 0 THEN
        v_signer_name := TRIM(v_signer_name);
        v_space_pos := POSITION(' ' IN v_signer_name);

        IF v_space_pos > 0 THEN
            v_first_name := SUBSTRING(v_signer_name FROM 1 FOR v_space_pos - 1);
            v_last_name := SUBSTRING(v_signer_name FROM v_space_pos + 1);
        ELSE
            v_first_name := v_signer_name;
            v_last_name := v_company_name;
        END IF;
    ELSE
        v_first_name := 'Administrador';
        v_last_name := v_company_name;
    END IF;

    -- ═══════════════════════════════════════════════════════════════════════
    -- GENERAR VALORES AUTOMÁTICOS
    -- ═══════════════════════════════════════════════════════════════════════

    -- user_id: UUID automático
    v_user_id := gen_random_uuid();

    -- employeeId: CORE-{company_id}-{timestamp}
    v_employee_id := 'CORE-' || p_company_id || '-' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT;

    -- usuario: "administrador" (o con sufijo si ya existe)
    v_username := get_available_username(p_company_id, 'administrador');

    -- password hash
    v_password_hash := crypt(v_default_password, gen_salt('bf', 10));

    -- ═══════════════════════════════════════════════════════════════════════
    -- CREAR USUARIO CORE
    -- ═══════════════════════════════════════════════════════════════════════

    INSERT INTO users (
        user_id,
        company_id,
        "employeeId",
        usuario,
        password,
        email,
        dni,
        "firstName",
        "lastName",
        role,
        is_core_user,
        force_password_change,
        core_user_created_at,
        onboarding_trace_id,
        is_active,
        "createdAt",
        "updatedAt"
    )
    VALUES (
        v_user_id,
        p_company_id,
        v_employee_id,
        v_username,
        v_password_hash,
        COALESCE(v_signer_email, v_company_email, 'admin@empresa' || p_company_id || '.local'),
        COALESCE(v_signer_dni, 'CORE' || p_company_id || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT),
        v_first_name,
        v_last_name,
        'admin',
        TRUE,
        TRUE,
        CURRENT_TIMESTAMP,
        p_onboarding_trace_id,
        TRUE,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    RAISE NOTICE 'Usuario CORE creado: % (%) para empresa %', v_username, v_user_id, p_company_id;

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICAR EXTENSIONES NECESARIAS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
