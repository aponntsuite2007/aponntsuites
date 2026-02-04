-- ============================================================================
-- FIX: Función create_core_user_for_company
-- ============================================================================
-- Correcciones:
--   1. RETURNING user_id (no "id" que no existe)
--   2. Agregar firstName y lastName
--   3. Agregar updatedAt
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
BEGIN
    -- Verificar que no exista ya un usuario CORE para esta empresa
    IF EXISTS (SELECT 1 FROM users WHERE company_id = p_company_id AND is_core_user = TRUE) THEN
        -- Si ya existe, retornar el user_id existente
        SELECT user_id INTO v_user_id FROM users WHERE company_id = p_company_id AND is_core_user = TRUE LIMIT 1;
        RETURN v_user_id;
    END IF;

    -- Verificar que no exista ya un usuario "administrador" para esta empresa
    IF EXISTS (SELECT 1 FROM users WHERE company_id = p_company_id AND usuario = 'administrador') THEN
        -- Si ya existe, actualizar a CORE y retornar
        UPDATE users
        SET is_core_user = TRUE,
            force_password_change = TRUE,
            password = crypt(v_default_password, gen_salt('bf', 10))
        WHERE company_id = p_company_id AND usuario = 'administrador'
        RETURNING user_id INTO v_user_id;
        RETURN v_user_id;
    END IF;

    -- Obtener datos de la empresa
    SELECT name, contact_email INTO v_company_name, v_company_email
    FROM companies WHERE company_id = p_company_id;

    IF v_company_name IS NULL THEN
        RAISE EXCEPTION 'Company not found: %', p_company_id;
    END IF;

    -- Generar hash del password con bcrypt (10 rounds)
    v_password_hash := crypt(v_default_password, gen_salt('bf', 10));

    -- Crear usuario CORE con todos los campos necesarios
    INSERT INTO users (
        company_id,
        usuario,
        password,
        email,
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
        p_company_id,
        'administrador',
        v_password_hash,
        COALESCE(v_company_email, 'admin@empresa' || p_company_id || '.local'),
        'Administrador',
        COALESCE(v_company_name, 'Empresa'),
        'admin',
        TRUE,
        TRUE,
        CURRENT_TIMESTAMP,
        p_onboarding_trace_id,
        TRUE,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
    RETURNING user_id INTO v_user_id;

    RAISE NOTICE 'Created CORE user % for company %', v_user_id, p_company_id;

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Verificar que la extensión pgcrypto está instalada (para crypt y gen_salt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
