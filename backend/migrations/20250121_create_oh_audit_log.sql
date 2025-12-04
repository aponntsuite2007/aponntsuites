-- OH-V6-19: AUDIT TRAIL & ACTIVITY LOG
-- Tabla para registrar todas las acciones sobre certificaciones
-- Compatible con multi-tenant y soft delete

CREATE TABLE IF NOT EXISTS oh_certification_audit_log (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    certification_id INTEGER REFERENCES oh_employee_certifications(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'uploaded_doc', 'bulk_upload', 'status_changed', 'renewed'
    user_id UUID,
    user_name VARCHAR(255),
    changes JSONB, -- Store old/new values: {"old": {...}, "new": {...}}
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices para mejorar performance de consultas
CREATE INDEX idx_cert_audit_company ON oh_certification_audit_log(company_id);
CREATE INDEX idx_cert_audit_cert ON oh_certification_audit_log(certification_id);
CREATE INDEX idx_cert_audit_created ON oh_certification_audit_log(created_at DESC);
CREATE INDEX idx_cert_audit_action ON oh_certification_audit_log(action);
CREATE INDEX idx_cert_audit_user ON oh_certification_audit_log(user_id);

-- Comentarios para documentación
COMMENT ON TABLE oh_certification_audit_log IS 'OH-V6-19: Registro de auditoría de todas las acciones sobre certificaciones';
COMMENT ON COLUMN oh_certification_audit_log.action IS 'Tipo de acción: created, updated, deleted, uploaded_doc, bulk_upload, status_changed, renewed';
COMMENT ON COLUMN oh_certification_audit_log.changes IS 'Cambios realizados en formato JSONB: {"old": {...}, "new": {...}}';
COMMENT ON COLUMN oh_certification_audit_log.certification_id IS 'Nullable para soportar soft delete de certificaciones';

-- Vista para obtener historial legible de una certificación
CREATE OR REPLACE VIEW oh_certification_audit_trail AS
SELECT
    log.id,
    log.company_id,
    log.certification_id,
    log.action,
    log.user_id,
    log.user_name,
    log.changes,
    log.ip_address,
    log.created_at,
    ec.employee_id,
    ec.employee_name,
    ct.name_i18n->>'en' as certification_name
FROM oh_certification_audit_log log
LEFT JOIN oh_employee_certifications ec ON log.certification_id = ec.id
LEFT JOIN oh_certification_types ct ON ec.certification_type_id = ct.id
ORDER BY log.created_at DESC;

COMMENT ON VIEW oh_certification_audit_trail IS 'Vista con información completa del audit trail incluyendo datos de certificación';

-- Función para obtener estadísticas de auditoría
CREATE OR REPLACE FUNCTION get_audit_stats(p_company_id INTEGER, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    total_actions BIGINT,
    actions_by_type JSONB,
    most_active_users JSONB,
    recent_changes_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM oh_certification_audit_log WHERE company_id = p_company_id)::BIGINT as total_actions,
        (
            SELECT jsonb_object_agg(action, count)
            FROM (
                SELECT action, COUNT(*) as count
                FROM oh_certification_audit_log
                WHERE company_id = p_company_id
                GROUP BY action
            ) sub
        ) as actions_by_type,
        (
            SELECT jsonb_agg(jsonb_build_object('user_name', user_name, 'action_count', action_count))
            FROM (
                SELECT user_name, COUNT(*) as action_count
                FROM oh_certification_audit_log
                WHERE company_id = p_company_id AND user_name IS NOT NULL
                GROUP BY user_name
                ORDER BY action_count DESC
                LIMIT 10
            ) sub
        ) as most_active_users,
        (
            SELECT COUNT(*)
            FROM oh_certification_audit_log
            WHERE company_id = p_company_id
              AND created_at >= CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL
        )::BIGINT as recent_changes_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_audit_stats IS 'Obtiene estadísticas de auditoría para una empresa en los últimos N días';

-- Función para limpiar logs antiguos (opcional, para mantenimiento)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(p_days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM oh_certification_audit_log
    WHERE created_at < CURRENT_TIMESTAMP - (p_days_to_keep || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Elimina logs de auditoría más antiguos que N días (default: 365 días)';

-- Insertar ejemplo de cómo se verá un log (para documentación)
-- ESTE INSERT ES SOLO COMENTARIO, NO SE EJECUTA:
/*
INSERT INTO oh_certification_audit_log (
    company_id,
    certification_id,
    action,
    user_id,
    user_name,
    changes,
    ip_address,
    user_agent
) VALUES (
    11, -- company_id
    123, -- certification_id
    'updated', -- action
    'uuid-del-usuario',
    'Juan Pérez',
    '{"old": {"status": "active"}, "new": {"status": "expired"}}'::jsonb,
    '192.168.1.100',
    'Mozilla/5.0...'
);
*/
