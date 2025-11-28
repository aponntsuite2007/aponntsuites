-- ============================================================================
-- MIGRACIÓN: Agregar campos de usuario CORE a tabla users
-- Workflow: altaEmpresa - FASE 4
-- Descripción: Usuario CORE inmutable creado automáticamente al alta
-- ============================================================================

-- Campo 1: is_core_user (flag para identificar usuario CORE inmutable)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_core_user BOOLEAN DEFAULT FALSE;

-- Campo 2: force_password_change (obligar a cambiar password en primer login)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;

-- Campo 3: password_changed_at (última vez que se cambió el password)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- Campo 4: core_user_created_at (fecha de creación del usuario CORE)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS core_user_created_at TIMESTAMP;

-- Campo 5: onboarding_trace_id (vincula usuario CORE con proceso de onboarding)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS onboarding_trace_id VARCHAR(100);

-- Constraint: solo puede haber 1 usuario CORE por empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_one_core_per_company
ON users(company_id)
WHERE is_core_user = TRUE;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_is_core ON users(is_core_user) WHERE is_core_user = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_force_password_change ON users(force_password_change) WHERE force_password_change = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_onboarding_trace ON users(onboarding_trace_id);

-- Constraint: usuario CORE debe tener usuario 'administrador'
ALTER TABLE users
DROP CONSTRAINT IF EXISTS core_user_usuario_must_be_administrador;

ALTER TABLE users
ADD CONSTRAINT core_user_usuario_must_be_administrador CHECK (
  (is_core_user = FALSE) OR
  (is_core_user = TRUE AND usuario = 'administrador')
);

-- Constraint: usuario CORE debe ser admin
ALTER TABLE users
DROP CONSTRAINT IF EXISTS core_user_must_be_admin;

ALTER TABLE users
ADD CONSTRAINT core_user_must_be_admin CHECK (
  (is_core_user = FALSE) OR
  (is_core_user = TRUE AND role = 'admin')
);

-- Función para crear usuario CORE automáticamente
CREATE OR REPLACE FUNCTION create_core_user_for_company(
  p_company_id INTEGER,
  p_onboarding_trace_id VARCHAR,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_default_password VARCHAR := 'admin123'; -- Password inicial (debe cambiarse)
  v_password_hash VARCHAR;
BEGIN
  -- Verificar que no exista ya un usuario CORE
  IF EXISTS (SELECT 1 FROM users WHERE company_id = p_company_id AND is_core_user = TRUE) THEN
    RAISE EXCEPTION 'Company already has a CORE user';
  END IF;

  -- Generar hash del password (asumiendo bcrypt con 10 rounds)
  -- En producción esto debería usar la función de hash que uses en el backend
  v_password_hash := crypt(v_default_password, gen_salt('bf', 10));

  -- Crear usuario CORE
  INSERT INTO users (
    company_id,
    usuario,
    password,
    email,
    role,
    is_core_user,
    force_password_change,
    core_user_created_at,
    onboarding_trace_id,
    is_active,
    "createdAt"
  )
  VALUES (
    p_company_id,
    'administrador',
    v_password_hash,
    (SELECT contact_email FROM companies WHERE company_id = p_company_id),
    'admin',
    TRUE,
    TRUE, -- Debe cambiar password en primer login
    CURRENT_TIMESTAMP,
    p_onboarding_trace_id,
    TRUE,
    CURRENT_TIMESTAMP
  )
  RETURNING id INTO v_user_id;

  -- Log de auditoría
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
    p_onboarding_trace_id,
    'CREATE_CORE_USER',
    'user',
    v_user_id,
    p_created_by,
    jsonb_build_object(
      'company_id', p_company_id,
      'usuario', 'administrador',
      'is_core_user', true,
      'force_password_change', true
    ),
    CURRENT_TIMESTAMP
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Función para validar que usuario CORE no pueda ser eliminado
CREATE OR REPLACE FUNCTION prevent_core_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_core_user = TRUE THEN
    RAISE EXCEPTION 'Cannot delete CORE user. CORE users are immutable.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger para prevenir eliminación de usuario CORE
DROP TRIGGER IF EXISTS users_prevent_core_deletion ON users;

CREATE TRIGGER users_prevent_core_deletion
  BEFORE DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_core_user_deletion();

-- Función para validar que campos inmutables del CORE user no cambien
CREATE OR REPLACE FUNCTION prevent_core_user_immutable_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Si es usuario CORE, validar campos inmutables
  IF NEW.is_core_user = TRUE THEN
    -- Username NO puede cambiar
    IF NEW.usuario != OLD.usuario THEN
      RAISE EXCEPTION 'Cannot change usuario of CORE user. Username must remain "administrador".';
    END IF;

    -- Role NO puede cambiar (debe ser siempre admin)
    IF NEW.role != 'admin' THEN
      RAISE EXCEPTION 'Cannot change role of CORE user. Role must remain "admin".';
    END IF;

    -- is_core_user NO puede cambiar
    IF NEW.is_core_user != OLD.is_core_user THEN
      RAISE EXCEPTION 'Cannot change is_core_user flag.';
    END IF;

    -- company_id NO puede cambiar
    IF NEW.company_id != OLD.company_id THEN
      RAISE EXCEPTION 'Cannot change company_id of CORE user.';
    END IF;
  END IF;

  -- Actualizar password_changed_at si cambió el password
  IF NEW.password != OLD.password THEN
    NEW.password_changed_at := CURRENT_TIMESTAMP;

    -- Si estaba forzado a cambiar password, quitar el flag
    IF OLD.force_password_change = TRUE THEN
      NEW.force_password_change := FALSE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar inmutabilidad de CORE user
DROP TRIGGER IF EXISTS users_core_immutable ON users;

CREATE TRIGGER users_core_immutable
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_core_user_immutable_changes();

-- Función para obtener usuario CORE de una empresa
CREATE OR REPLACE FUNCTION get_core_user(p_company_id UUID)
RETURNS TABLE(
  user_id UUID,
  usuario VARCHAR,
  email VARCHAR,
  "createdAt" TIMESTAMP,
  force_password_change BOOLEAN,
  password_changed_at TIMESTAMP,
  onboarding_trace_id VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    users.usuario,
    users.email,
    users."createdAt",
    users.force_password_change,
    users.password_changed_at,
    users.onboarding_trace_id
  FROM users
  WHERE
    users.company_id = p_company_id
    AND is_core_user = TRUE
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Actualizar usuarios existentes llamados 'administrador' a CORE
UPDATE users
SET
  is_core_user = TRUE,
  force_password_change = FALSE, -- Ya están activos
  core_user_created_at = "createdAt"
WHERE
  usuario = 'administrador'
  AND role = 'admin'
  AND is_core_user IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM users u2
    WHERE u2.company_id = users.company_id
      AND u2.is_core_user = TRUE
  );

-- Comentarios de documentación
COMMENT ON COLUMN users.is_core_user IS 'TRUE si es el usuario CORE inmutable creado automáticamente al alta (usuario: administrador, role: admin)';
COMMENT ON COLUMN users.force_password_change IS 'TRUE si debe cambiar password en próximo login (común en usuario CORE recién creado)';
COMMENT ON COLUMN users.password_changed_at IS 'Fecha y hora del último cambio de password';
COMMENT ON COLUMN users.core_user_created_at IS 'Fecha de creación del usuario CORE (solo para is_core_user = TRUE)';
COMMENT ON COLUMN users.onboarding_trace_id IS 'Trace ID del proceso de onboarding que creó este usuario CORE';

-- Grant permisos
-- GRANT SELECT, UPDATE ON users TO attendance_system_user;
