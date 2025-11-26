-- ============================================================================
-- MIGRACIÓN: Sistema de Auditoría de Cambios de Usuarios
-- ============================================================================
-- Fecha: 2025-01-25
-- Descripción: Tabla para registrar TODOS los cambios en datos de usuarios
-- NOTA: users.user_id es UUID, companies.company_id es INTEGER
-- ============================================================================

-- Crear tabla de auditoría de usuarios
CREATE TABLE IF NOT EXISTS user_audit_logs (
    id SERIAL PRIMARY KEY,

    -- Usuario que fue modificado (UUID porque users.user_id es UUID)
    user_id UUID NOT NULL,

    -- Usuario que realizó el cambio (NULL si fue el sistema)
    changed_by_user_id UUID,

    -- Empresa (para multi-tenant)
    company_id INTEGER,

    -- Tipo de acción
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'CREATE',
        'UPDATE',
        'DELETE',
        'ACTIVATE',
        'DEACTIVATE',
        'PASSWORD_RESET',
        'ROLE_CHANGE',
        'DEPARTMENT_CHANGE',
        'SHIFT_ASSIGN',
        'SHIFT_REMOVE',
        'BRANCH_CHANGE',
        'LOGIN',
        'LOGOUT',
        'LOGIN_FAILED',
        'BIOMETRIC_REGISTER',
        'CONSENT_GIVEN',
        'CONSENT_REVOKED',
        'GPS_CONFIG_CHANGE',
        'PROFILE_UPDATE',
        'BULK_UPDATE'
    )),

    -- Campo específico que cambió (para UPDATE)
    field_name VARCHAR(100),

    -- Valores antes y después
    old_value TEXT,
    new_value TEXT,

    -- Descripción legible del cambio
    description TEXT,

    -- Metadata adicional (JSON)
    metadata JSONB DEFAULT '{}',

    -- IP desde donde se realizó el cambio
    ip_address VARCHAR(45),

    -- User agent del navegador
    user_agent TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_user_id ON user_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_company_id ON user_audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_changed_by ON user_audit_logs(changed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_action ON user_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_created_at ON user_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_field_name ON user_audit_logs(field_name);

-- Índice compuesto para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_user_date
ON user_audit_logs(user_id, created_at DESC);

-- Comentarios de documentación
COMMENT ON TABLE user_audit_logs IS 'Registro de auditoría de todos los cambios en usuarios';
COMMENT ON COLUMN user_audit_logs.user_id IS 'ID del usuario que fue modificado (UUID)';
COMMENT ON COLUMN user_audit_logs.changed_by_user_id IS 'ID del usuario que realizó el cambio (NULL = sistema)';
COMMENT ON COLUMN user_audit_logs.action IS 'Tipo de acción realizada';
COMMENT ON COLUMN user_audit_logs.field_name IS 'Nombre del campo modificado (para UPDATE)';
COMMENT ON COLUMN user_audit_logs.old_value IS 'Valor anterior del campo';
COMMENT ON COLUMN user_audit_logs.new_value IS 'Nuevo valor del campo';
COMMENT ON COLUMN user_audit_logs.metadata IS 'Información adicional en formato JSON';

-- ============================================================================
-- FUNCIÓN: Registrar cambio de usuario
-- ============================================================================
CREATE OR REPLACE FUNCTION log_user_change(
    p_user_id UUID,
    p_changed_by_user_id UUID,
    p_company_id INTEGER,
    p_action VARCHAR(50),
    p_field_name VARCHAR(100) DEFAULT NULL,
    p_old_value TEXT DEFAULT NULL,
    p_new_value TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_ip_address VARCHAR(45) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_log_id INTEGER;
BEGIN
    INSERT INTO user_audit_logs (
        user_id, changed_by_user_id, company_id, action,
        field_name, old_value, new_value, description,
        metadata, ip_address, user_agent
    ) VALUES (
        p_user_id, p_changed_by_user_id, p_company_id, p_action,
        p_field_name, p_old_value, p_new_value, p_description,
        p_metadata, p_ip_address, p_user_agent
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Obtener historial de usuario con detalles
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_audit_history(
    p_user_id UUID,
    p_company_id INTEGER,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    log_id INTEGER,
    action VARCHAR(50),
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    description TEXT,
    changed_by_name TEXT,
    changed_by_id UUID,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ual.id AS log_id,
        ual.action,
        ual.field_name,
        ual.old_value,
        ual.new_value,
        ual.description,
        CASE
            WHEN u.user_id IS NOT NULL THEN u."firstName" || ' ' || u."lastName"
            ELSE 'Sistema'
        END AS changed_by_name,
        ual.changed_by_user_id AS changed_by_id,
        ual.ip_address,
        ual.created_at
    FROM user_audit_logs ual
    LEFT JOIN users u ON u.user_id = ual.changed_by_user_id
    WHERE ual.user_id = p_user_id
      AND ual.company_id = p_company_id
    ORDER BY ual.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Estadísticas de auditoría por usuario
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_audit_stats(p_user_id UUID, p_company_id INTEGER)
RETURNS TABLE (
    total_changes BIGINT,
    first_change TIMESTAMP WITH TIME ZONE,
    last_change TIMESTAMP WITH TIME ZONE,
    changes_by_action JSONB,
    most_changed_fields JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_changes,
        MIN(ual.created_at) AS first_change,
        MAX(ual.created_at) AS last_change,
        (
            SELECT jsonb_object_agg(sub.action, sub.cnt)
            FROM (
                SELECT ual2.action, COUNT(*) AS cnt
                FROM user_audit_logs ual2
                WHERE ual2.user_id = p_user_id AND ual2.company_id = p_company_id
                GROUP BY ual2.action
            ) sub
        ) AS changes_by_action,
        (
            SELECT jsonb_object_agg(sub2.field_name, sub2.cnt)
            FROM (
                SELECT ual3.field_name, COUNT(*) AS cnt
                FROM user_audit_logs ual3
                WHERE ual3.user_id = p_user_id
                  AND ual3.company_id = p_company_id
                  AND ual3.field_name IS NOT NULL
                GROUP BY ual3.field_name
                ORDER BY cnt DESC
                LIMIT 10
            ) sub2
        ) AS most_changed_fields
    FROM user_audit_logs ual
    WHERE ual.user_id = p_user_id AND ual.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Verificación
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migración user_audit_logs completada exitosamente';
    RAISE NOTICE '   - Tabla: user_audit_logs (user_id UUID, company_id INTEGER)';
    RAISE NOTICE '   - Función: log_user_change()';
    RAISE NOTICE '   - Función: get_user_audit_history()';
    RAISE NOTICE '   - Función: get_user_audit_stats()';
END $$;
