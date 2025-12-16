-- ============================================================================
-- MIGRACIÓN: Sistema de Usuario SOPORTE Inmutable para Testing
-- Fecha: 2025-12-13
-- Descripción: Crea usuario 'soporte' con password 'admin123' en TODAS las empresas
--              Este usuario es SOLO-LECTURA e INMUTABLE (para testing automatizado)
-- ============================================================================

-- PASO 1: Agregar campo is_support_user (similar a is_core_user)
-- ============================================================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_support_user BOOLEAN DEFAULT FALSE;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_users_is_support ON users(is_support_user) WHERE is_support_user = TRUE;

-- Constraint: solo puede haber 1 usuario SOPORTE por empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_one_support_per_company
ON users(company_id)
WHERE is_support_user = TRUE;

-- Constraint: usuario SOPORTE debe tener usuario 'soporte'
ALTER TABLE users
DROP CONSTRAINT IF EXISTS support_user_usuario_must_be_soporte;

ALTER TABLE users
ADD CONSTRAINT support_user_usuario_must_be_soporte CHECK (
  (is_support_user = FALSE) OR
  (is_support_user = TRUE AND usuario = 'soporte')
);

-- Constraint: usuario SOPORTE debe ser admin (para testing con todos los permisos)
ALTER TABLE users
DROP CONSTRAINT IF EXISTS support_user_must_be_admin;

ALTER TABLE users
ADD CONSTRAINT support_user_must_be_admin CHECK (
  (is_support_user = FALSE) OR
  (is_support_user = TRUE AND role = 'admin')
);

-- PASO 2: Función para crear usuario SOPORTE automáticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION create_support_user_for_company(
  p_company_id INTEGER,
  p_onboarding_trace_id VARCHAR DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_default_password VARCHAR := 'admin123'; -- Password FIJO para testing
  v_password_hash VARCHAR;
  v_company_email VARCHAR;
BEGIN
  -- Verificar que no exista ya un usuario SOPORTE
  IF EXISTS (SELECT 1 FROM users WHERE company_id = p_company_id AND is_support_user = TRUE) THEN
    RAISE EXCEPTION 'Company already has a SUPPORT user';
  END IF;

  -- Obtener email de la empresa (fallback a soporte@empresa.com)
  SELECT contact_email INTO v_company_email FROM companies WHERE company_id = p_company_id;
  IF v_company_email IS NULL THEN
    v_company_email := 'soporte@' || (SELECT slug FROM companies WHERE company_id = p_company_id) || '.com';
  END IF;

  -- Generar hash del password (bcrypt con 10 rounds)
  v_password_hash := crypt(v_default_password, gen_salt('bf', 10));

  -- Crear usuario SOPORTE
  INSERT INTO users (
    company_id,
    usuario,
    password,
    email,
    role,
    is_support_user,
    force_password_change,
    is_active,
    onboarding_trace_id,
    "createdAt",
    "updatedAt"
  )
  VALUES (
    p_company_id,
    'soporte',
    v_password_hash,
    v_company_email,
    'admin',
    TRUE,
    FALSE, -- NO forzar cambio de password (es para testing automatizado)
    TRUE,
    p_onboarding_trace_id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  RETURNING user_id INTO v_user_id;

  -- Log de auditoría
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    INSERT INTO audit_logs (
      trace_id,
      action,
      entity_type,
      entity_id,
      performed_by,
      details,
      created_at
    )
    VALUES (
      COALESCE(p_onboarding_trace_id, 'BACKFILL_SUPPORT_USERS'),
      'CREATE_SUPPORT_USER',
      'user',
      v_user_id,
      p_created_by,
      jsonb_build_object(
        'company_id', p_company_id,
        'usuario', 'soporte',
        'is_support_user', true,
        'purpose', 'automated_testing'
      ),
      CURRENT_TIMESTAMP
    );
  END IF;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- PASO 3: Función para prevenir eliminación de usuario SOPORTE
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_support_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_support_user = TRUE THEN
    RAISE EXCEPTION 'Cannot delete SUPPORT user. SUPPORT users are immutable and required for testing.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger para prevenir eliminación de usuario SOPORTE
DROP TRIGGER IF EXISTS users_prevent_support_deletion ON users;

CREATE TRIGGER users_prevent_support_deletion
  BEFORE DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_support_user_deletion();

-- PASO 4: Función para validar inmutabilidad del usuario SOPORTE
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_support_user_immutable_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Si es usuario SOPORTE, validar campos inmutables
  IF NEW.is_support_user = TRUE THEN
    -- Username NO puede cambiar
    IF NEW.usuario != OLD.usuario THEN
      RAISE EXCEPTION 'Cannot change usuario of SUPPORT user. Username must remain "soporte".';
    END IF;

    -- Role NO puede cambiar (debe ser siempre admin)
    IF NEW.role != 'admin' THEN
      RAISE EXCEPTION 'Cannot change role of SUPPORT user. Role must remain "admin".';
    END IF;

    -- is_support_user NO puede cambiar
    IF NEW.is_support_user != OLD.is_support_user THEN
      RAISE EXCEPTION 'Cannot change is_support_user flag.';
    END IF;

    -- company_id NO puede cambiar
    IF NEW.company_id != OLD.company_id THEN
      RAISE EXCEPTION 'Cannot change company_id of SUPPORT user.';
    END IF;

    -- Password NO puede cambiar (siempre debe ser admin123 para testing)
    IF NEW.password != OLD.password THEN
      RAISE EXCEPTION 'Cannot change password of SUPPORT user. Password is fixed for automated testing.';
    END IF;

    -- Email NO puede cambiar
    IF NEW.email != OLD.email THEN
      RAISE EXCEPTION 'Cannot change email of SUPPORT user.';
    END IF;

    -- is_active NO puede cambiar (siempre TRUE)
    IF NEW.is_active != TRUE THEN
      RAISE EXCEPTION 'Cannot deactivate SUPPORT user. Must remain active for testing.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar inmutabilidad de SUPPORT user
DROP TRIGGER IF EXISTS users_support_immutable ON users;

CREATE TRIGGER users_support_immutable
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_support_user_immutable_changes();

-- PASO 5: BACKFILL - Convertir usuarios 'soporte' existentes en inmutables
-- ============================================================================
UPDATE users
SET
  is_support_user = TRUE,
  force_password_change = FALSE,
  role = 'admin',
  is_active = TRUE
WHERE
  usuario = 'soporte'
  AND role = 'admin'
  AND (is_support_user IS NULL OR is_support_user = FALSE)
  AND NOT EXISTS (
    SELECT 1
    FROM users u2
    WHERE u2.company_id = users.company_id
      AND u2.is_support_user = TRUE
  );

-- PASO 6: BACKFILL - Crear usuarios 'soporte' para empresas que no lo tienen
-- ============================================================================
DO $$
DECLARE
  v_company RECORD;
  v_created_user_id UUID;
BEGIN
  FOR v_company IN
    SELECT company_id, slug
    FROM companies
    WHERE is_active = TRUE
      AND NOT EXISTS (
        SELECT 1
        FROM users
        WHERE users.company_id = companies.company_id
          AND usuario = 'soporte'
      )
  LOOP
    BEGIN
      SELECT create_support_user_for_company(
        v_company.company_id,
        'BACKFILL_' || v_company.slug,
        NULL
      ) INTO v_created_user_id;

      RAISE NOTICE 'Created SUPPORT user for company_id=% (slug=%): user_id=%',
        v_company.company_id, v_company.slug, v_created_user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create SUPPORT user for company_id=%: %',
        v_company.company_id, SQLERRM;
    END;
  END LOOP;
END $$;

-- PASO 7: BACKFILL - Crear usuarios 'administrador' para empresas que no lo tienen
-- ============================================================================
-- (Reutilizamos la función create_core_user_for_company() existente)
DO $$
DECLARE
  v_company RECORD;
  v_created_user_id UUID;
BEGIN
  FOR v_company IN
    SELECT company_id, slug
    FROM companies
    WHERE is_active = TRUE
      AND NOT EXISTS (
        SELECT 1
        FROM users
        WHERE users.company_id = companies.company_id
          AND usuario = 'administrador'
      )
  LOOP
    BEGIN
      SELECT create_core_user_for_company(
        v_company.company_id,
        'BACKFILL_' || v_company.slug,
        NULL
      ) INTO v_created_user_id;

      RAISE NOTICE 'Created CORE user (administrador) for company_id=% (slug=%): user_id=%',
        v_company.company_id, v_company.slug, v_created_user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create CORE user for company_id=%: %',
        v_company.company_id, SQLERRM;
    END;
  END LOOP;
END $$;

-- PASO 8: Verificación final
-- ============================================================================
DO $$
DECLARE
  v_total_companies INTEGER;
  v_companies_with_admin INTEGER;
  v_companies_with_support INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_companies FROM companies WHERE is_active = TRUE;
  SELECT COUNT(DISTINCT company_id) INTO v_companies_with_admin FROM users WHERE usuario = 'administrador';
  SELECT COUNT(DISTINCT company_id) INTO v_companies_with_support FROM users WHERE usuario = 'soporte';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICACIÓN FINAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total empresas activas: %', v_total_companies;
  RAISE NOTICE 'Empresas con usuario "administrador": %', v_companies_with_admin;
  RAISE NOTICE 'Empresas con usuario "soporte": %', v_companies_with_support;

  IF v_companies_with_admin = v_total_companies AND v_companies_with_support = v_total_companies THEN
    RAISE NOTICE '✅ SUCCESS: Todas las empresas tienen ambos usuarios';
  ELSE
    RAISE WARNING '⚠️  INCOMPLETE: Algunas empresas no tienen usuarios de testing';
  END IF;
END $$;

-- Comentarios de documentación
COMMENT ON COLUMN users.is_support_user IS 'TRUE si es el usuario SOPORTE inmutable para testing automatizado (usuario: soporte, role: admin, password: admin123 FIJO)';
COMMENT ON FUNCTION create_support_user_for_company IS 'Crea usuario "soporte" inmutable con password fijo "admin123" para testing automatizado. Un usuario por empresa.';
