-- ============================================================================
-- MANUAL DE PROCEDIMIENTOS - Sistema de Alcance Parametrizable + Control de Borradores
--
-- Mejoras:
-- 1. Alcance parametrizable vinculado a estructura organizacional (SSOT)
--    - Empresa completa, sucursal, departamento, sector, rol, cargo, personas
-- 2. Control de borradores concurrentes (un usuario a la vez)
-- 3. TTL de borradores (máximo 7 días, luego auto-eliminación)
--
-- @version 1.2.0
-- @date 2025-12-07
-- ============================================================================

-- 1. ENUM para tipos de alcance
DO $$ BEGIN
    CREATE TYPE procedure_scope_type AS ENUM (
        'company',      -- Toda la empresa
        'branch',       -- Sucursales específicas
        'department',   -- Departamentos específicos
        'sector',       -- Sectores específicos
        'role',         -- Roles específicos (admin, supervisor, etc.)
        'position',     -- Cargos organizacionales específicos
        'users'         -- Usuarios específicos
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Agregar campos para alcance parametrizable
ALTER TABLE procedures
ADD COLUMN IF NOT EXISTS scope_type procedure_scope_type DEFAULT 'company';

-- scope_entities: Array de IDs según scope_type
-- Estructura: [{ "id": 1, "name": "Departamento X" }, ...]
ALTER TABLE procedures
ADD COLUMN IF NOT EXISTS scope_entities JSONB DEFAULT '[]'::jsonb;

-- 3. Campos para control de borradores concurrentes
ALTER TABLE procedures
ADD COLUMN IF NOT EXISTS draft_locked_by UUID REFERENCES users(user_id) ON DELETE SET NULL;

ALTER TABLE procedures
ADD COLUMN IF NOT EXISTS draft_locked_at TIMESTAMP;

-- draft_expires_at: El borrador expira 7 días después de ser creado/bloqueado
ALTER TABLE procedures
ADD COLUMN IF NOT EXISTS draft_expires_at TIMESTAMP;

-- 4. Tabla para historial de bloqueos (auditoría)
CREATE TABLE IF NOT EXISTS procedure_draft_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
    locked_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    locked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unlocked_at TIMESTAMP,
    unlock_reason VARCHAR(50), -- 'published', 'manual', 'expired', 'stolen'
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_procedure_draft_locks_procedure ON procedure_draft_locks(procedure_id);
CREATE INDEX IF NOT EXISTS idx_procedure_draft_locks_user ON procedure_draft_locks(locked_by);

-- 5. Comentarios
COMMENT ON COLUMN procedures.scope_type IS 'Tipo de alcance: company, branch, department, sector, role, position, users';
COMMENT ON COLUMN procedures.scope_entities IS 'Entidades específicas alcanzadas según scope_type [{id, name, ...}]';
COMMENT ON COLUMN procedures.draft_locked_by IS 'Usuario que tiene bloqueado el borrador actualmente';
COMMENT ON COLUMN procedures.draft_locked_at IS 'Momento en que se bloqueó el borrador';
COMMENT ON COLUMN procedures.draft_expires_at IS 'Momento en que expira el borrador (máx 7 días)';

-- 6. Función para obtener usuarios alcanzados según scope (SSOT)
CREATE OR REPLACE FUNCTION get_procedure_scope_users(
    p_procedure_id UUID,
    p_company_id INTEGER
)
RETURNS TABLE (
    user_id UUID,
    employee_id VARCHAR(50),
    full_name VARCHAR(255),
    email VARCHAR(255),
    department_name VARCHAR(100),
    position_name VARCHAR(100),
    branch_name VARCHAR(100)
) AS $$
DECLARE
    v_scope_type procedure_scope_type;
    v_scope_entities JSONB;
BEGIN
    -- Obtener tipo de alcance y entidades del procedimiento
    SELECT p.scope_type, COALESCE(p.scope_entities, '[]'::jsonb)
    INTO v_scope_type, v_scope_entities
    FROM procedures p
    WHERE p.id = p_procedure_id;

    RETURN QUERY
    SELECT DISTINCT
        u.user_id,
        u."employeeId" as employee_id,
        u."firstName" || ' ' || u."lastName" as full_name,
        u.email,
        COALESCE(d.name, 'Sin departamento') as department_name,
        COALESCE(op.position_name, 'Sin cargo') as position_name,
        COALESCE(b.name, 'Sin sucursal') as branch_name
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN organizational_positions op ON u.organizational_position_id = op.id
    LEFT JOIN branches b ON u.branch_id = b.id
    LEFT JOIN sectors s ON u.sector_id = s.id
    WHERE u.company_id = p_company_id
      AND u.is_active = true
      AND (
        -- Toda la empresa
        (v_scope_type = 'company')
        OR
        -- Sucursales específicas
        (v_scope_type = 'branch' AND u.branch_id IN (
            SELECT (value->>'id')::INTEGER FROM jsonb_array_elements(v_scope_entities) AS value
        ))
        OR
        -- Departamentos específicos
        (v_scope_type = 'department' AND u.department_id IN (
            SELECT (value->>'id')::INTEGER FROM jsonb_array_elements(v_scope_entities) AS value
        ))
        OR
        -- Sectores específicos
        (v_scope_type = 'sector' AND u.sector_id IN (
            SELECT (value->>'id')::INTEGER FROM jsonb_array_elements(v_scope_entities) AS value
        ))
        OR
        -- Roles específicos
        (v_scope_type = 'role' AND u.role IN (
            SELECT value->>'id' FROM jsonb_array_elements(v_scope_entities) AS value
        ))
        OR
        -- Cargos organizacionales específicos
        (v_scope_type = 'position' AND u.organizational_position_id IN (
            SELECT (value->>'id')::INTEGER FROM jsonb_array_elements(v_scope_entities) AS value
        ))
        OR
        -- Usuarios específicos
        (v_scope_type = 'users' AND u.user_id IN (
            SELECT (value->>'id')::UUID FROM jsonb_array_elements(v_scope_entities) AS value
        ))
      );
END;
$$ LANGUAGE plpgsql;

-- 7. Función para intentar bloquear un borrador
CREATE OR REPLACE FUNCTION try_lock_procedure_draft(
    p_procedure_id UUID,
    p_user_id UUID,
    p_ttl_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    locked_by UUID,
    locked_by_name TEXT,
    locked_at TIMESTAMP,
    expires_at TIMESTAMP
) AS $$
DECLARE
    v_current_lock RECORD;
    v_user_name TEXT;
    v_expires TIMESTAMP;
BEGIN
    -- Verificar estado actual del procedimiento
    SELECT
        p.draft_locked_by,
        p.draft_locked_at,
        p.draft_expires_at,
        p.status,
        u."firstName" || ' ' || u."lastName" as locked_by_name
    INTO v_current_lock
    FROM procedures p
    LEFT JOIN users u ON p.draft_locked_by = u.user_id
    WHERE p.id = p_procedure_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Procedimiento no encontrado'::TEXT, NULL::UUID, NULL::TEXT, NULL::TIMESTAMP, NULL::TIMESTAMP;
        RETURN;
    END IF;

    -- Si no está en borrador, no se puede bloquear
    IF v_current_lock.status != 'draft' THEN
        RETURN QUERY SELECT false, 'Solo se pueden bloquear procedimientos en borrador'::TEXT, NULL::UUID, NULL::TEXT, NULL::TIMESTAMP, NULL::TIMESTAMP;
        RETURN;
    END IF;

    -- Si ya está bloqueado por otro usuario y no ha expirado
    IF v_current_lock.draft_locked_by IS NOT NULL
       AND v_current_lock.draft_locked_by != p_user_id
       AND v_current_lock.draft_expires_at > NOW() THEN
        RETURN QUERY SELECT
            false,
            format('Borrador bloqueado por %s hasta %s', v_current_lock.locked_by_name, v_current_lock.draft_expires_at)::TEXT,
            v_current_lock.draft_locked_by,
            v_current_lock.locked_by_name,
            v_current_lock.draft_locked_at,
            v_current_lock.draft_expires_at;
        RETURN;
    END IF;

    -- Si estaba bloqueado pero expiró, registrar desbloqueo
    IF v_current_lock.draft_locked_by IS NOT NULL AND v_current_lock.draft_expires_at <= NOW() THEN
        UPDATE procedure_draft_locks
        SET unlocked_at = NOW(), unlock_reason = 'expired'
        WHERE procedure_id = p_procedure_id AND unlocked_at IS NULL;
    END IF;

    -- Calcular expiración
    v_expires := NOW() + (p_ttl_days || ' days')::INTERVAL;

    -- Obtener nombre del usuario que bloquea
    SELECT u."firstName" || ' ' || u."lastName" INTO v_user_name
    FROM users u WHERE u.user_id = p_user_id;

    -- Bloquear el borrador
    UPDATE procedures
    SET draft_locked_by = p_user_id,
        draft_locked_at = NOW(),
        draft_expires_at = v_expires,
        updated_at = NOW()
    WHERE id = p_procedure_id;

    -- Registrar en historial
    INSERT INTO procedure_draft_locks (procedure_id, locked_by, locked_at, expires_at)
    VALUES (p_procedure_id, p_user_id, NOW(), v_expires);

    RETURN QUERY SELECT
        true,
        'Borrador bloqueado exitosamente'::TEXT,
        p_user_id,
        v_user_name,
        NOW()::TIMESTAMP,
        v_expires;
END;
$$ LANGUAGE plpgsql;

-- 8. Función para liberar bloqueo de borrador
CREATE OR REPLACE FUNCTION unlock_procedure_draft(
    p_procedure_id UUID,
    p_user_id UUID,
    p_reason VARCHAR DEFAULT 'manual'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_lock UUID;
BEGIN
    SELECT draft_locked_by INTO v_current_lock
    FROM procedures WHERE id = p_procedure_id;

    -- Solo el que tiene el bloqueo puede liberarlo (o si expiró)
    IF v_current_lock IS NULL THEN
        RETURN true; -- Ya está desbloqueado
    END IF;

    IF v_current_lock != p_user_id THEN
        -- Verificar si expiró
        IF (SELECT draft_expires_at FROM procedures WHERE id = p_procedure_id) > NOW() THEN
            RETURN false; -- No puede liberar el bloqueo de otro
        END IF;
    END IF;

    -- Liberar bloqueo
    UPDATE procedures
    SET draft_locked_by = NULL,
        draft_locked_at = NULL,
        draft_expires_at = NULL,
        updated_at = NOW()
    WHERE id = p_procedure_id;

    -- Registrar en historial
    UPDATE procedure_draft_locks
    SET unlocked_at = NOW(), unlock_reason = p_reason
    WHERE procedure_id = p_procedure_id AND unlocked_at IS NULL;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 9. Función para limpiar borradores expirados (se llama desde scheduler)
CREATE OR REPLACE FUNCTION cleanup_expired_drafts()
RETURNS TABLE (
    deleted_count INTEGER,
    deleted_procedures JSONB
) AS $$
DECLARE
    v_deleted JSONB;
    v_count INTEGER;
BEGIN
    -- Obtener lista de borradores a eliminar
    SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'code', code,
        'title', title,
        'company_id', company_id,
        'created_by', created_by,
        'draft_expires_at', draft_expires_at
    ))
    INTO v_deleted
    FROM procedures
    WHERE status = 'draft'
      AND draft_expires_at IS NOT NULL
      AND draft_expires_at < NOW();

    -- Eliminar borradores expirados
    DELETE FROM procedures
    WHERE status = 'draft'
      AND draft_expires_at IS NOT NULL
      AND draft_expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN QUERY SELECT v_count, COALESCE(v_deleted, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 10. Función para contar usuarios alcanzados (para preview)
CREATE OR REPLACE FUNCTION count_procedure_scope_users(
    p_company_id INTEGER,
    p_scope_type procedure_scope_type,
    p_scope_entities JSONB
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT u.user_id)
    INTO v_count
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN organizational_positions op ON u.organizational_position_id = op.id
    LEFT JOIN branches b ON u.branch_id = b.id
    LEFT JOIN sectors s ON u.sector_id = s.id
    WHERE u.company_id = p_company_id
      AND u.is_active = true
      AND (
        (p_scope_type = 'company')
        OR
        (p_scope_type = 'branch' AND u.branch_id IN (
            SELECT (value->>'id')::INTEGER FROM jsonb_array_elements(p_scope_entities) AS value
        ))
        OR
        (p_scope_type = 'department' AND u.department_id IN (
            SELECT (value->>'id')::INTEGER FROM jsonb_array_elements(p_scope_entities) AS value
        ))
        OR
        (p_scope_type = 'sector' AND u.sector_id IN (
            SELECT (value->>'id')::INTEGER FROM jsonb_array_elements(p_scope_entities) AS value
        ))
        OR
        (p_scope_type = 'role' AND u.role IN (
            SELECT value->>'id' FROM jsonb_array_elements(p_scope_entities) AS value
        ))
        OR
        (p_scope_type = 'position' AND u.organizational_position_id IN (
            SELECT (value->>'id')::INTEGER FROM jsonb_array_elements(p_scope_entities) AS value
        ))
        OR
        (p_scope_type = 'users' AND u.user_id IN (
            SELECT (value->>'id')::UUID FROM jsonb_array_elements(p_scope_entities) AS value
        ))
      );

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 11. Índices para performance
CREATE INDEX IF NOT EXISTS idx_procedures_scope_type ON procedures(scope_type);
CREATE INDEX IF NOT EXISTS idx_procedures_scope_entities ON procedures USING GIN (scope_entities);
CREATE INDEX IF NOT EXISTS idx_procedures_draft_locked_by ON procedures(draft_locked_by) WHERE draft_locked_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_procedures_draft_expires ON procedures(draft_expires_at) WHERE draft_expires_at IS NOT NULL;

-- 12. Actualizar procedimientos existentes para tener scope_type 'company' por defecto
UPDATE procedures
SET scope_type = 'company', scope_entities = '[]'::jsonb
WHERE scope_type IS NULL;

-- ============================================================================
-- RESULTADO ESPERADO:
-- - Campo scope_type para definir tipo de alcance
-- - Campo scope_entities para entidades específicas
-- - Campos draft_locked_by, draft_locked_at, draft_expires_at para control de borradores
-- - Tabla procedure_draft_locks para historial de bloqueos
-- - Función get_procedure_scope_users() para obtener usuarios alcanzados desde SSOT
-- - Función try_lock_procedure_draft() para bloquear borradores
-- - Función unlock_procedure_draft() para liberar bloqueos
-- - Función cleanup_expired_drafts() para limpiar borradores expirados
-- - Función count_procedure_scope_users() para preview de usuarios
-- ============================================================================
