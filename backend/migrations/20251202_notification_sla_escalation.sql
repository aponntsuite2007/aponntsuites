-- ============================================================================
-- MIGRATION: Sistema de SLA y Escalamiento para Notificaciones
-- Fecha: 2025-12-02
-- Descripción: Agrega campos para control de SLA, escalamiento automático,
--              notificación a ambos extremos y registro en evaluación
-- ============================================================================

-- 1. Agregar campos a notification_messages para SLA y estados de notificación
ALTER TABLE notification_messages
ADD COLUMN IF NOT EXISTS sla_response_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS sla_breach BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sla_breach_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS sender_notified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS sender_notified_response BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recipient_notified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS escalation_status VARCHAR(20) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS escalated_to_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS impact_on_evaluation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS evaluation_score_impact DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discharge_reason TEXT,
ADD COLUMN IF NOT EXISTS discharge_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS discharge_accepted BOOLEAN;

-- Comentarios descriptivos
COMMENT ON COLUMN notification_messages.sla_response_hours IS 'Horas esperadas para respuesta según SLA (default 24h)';
COMMENT ON COLUMN notification_messages.sla_breach IS 'TRUE si el destinatario no respondió dentro del SLA';
COMMENT ON COLUMN notification_messages.sla_breach_at IS 'Momento en que se detectó el incumplimiento de SLA';
COMMENT ON COLUMN notification_messages.sender_notified_at IS 'Cuando el remitente fue notificado de la respuesta o incumplimiento';
COMMENT ON COLUMN notification_messages.sender_notified_response IS 'TRUE si el remitente ya fue notificado de la respuesta';
COMMENT ON COLUMN notification_messages.recipient_notified_at IS 'Cuando el destinatario fue notificado de que debe responder';
COMMENT ON COLUMN notification_messages.escalation_status IS 'none, pending, escalated, resolved, discharged';
COMMENT ON COLUMN notification_messages.escalation_level IS '0=ninguno, 1=supervisor, 2=RRHH, 3=gerencia';
COMMENT ON COLUMN notification_messages.escalated_to_id IS 'ID del usuario/departamento al que se escaló';
COMMENT ON COLUMN notification_messages.escalated_at IS 'Momento del escalamiento';
COMMENT ON COLUMN notification_messages.impact_on_evaluation IS 'TRUE si el incumplimiento impacta evaluación del empleado';
COMMENT ON COLUMN notification_messages.evaluation_score_impact IS 'Puntos negativos en evaluación (ej: -5.00)';
COMMENT ON COLUMN notification_messages.discharge_reason IS 'Descargo del empleado que incumplió';
COMMENT ON COLUMN notification_messages.discharge_at IS 'Fecha del descargo';
COMMENT ON COLUMN notification_messages.discharge_accepted IS 'Si el descargo fue aceptado por RRHH';

-- 2. Agregar campos a notification_groups para tracking general
ALTER TABLE notification_groups
ADD COLUMN IF NOT EXISTS requires_sla BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS default_sla_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS auto_escalate BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS escalation_chain JSONB DEFAULT '["supervisor", "rrhh", "gerencia"]'::jsonb,
ADD COLUMN IF NOT EXISTS total_escalations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP;

COMMENT ON COLUMN notification_groups.requires_sla IS 'Si este grupo requiere control de SLA';
COMMENT ON COLUMN notification_groups.default_sla_hours IS 'Horas por defecto para SLA en este grupo';
COMMENT ON COLUMN notification_groups.auto_escalate IS 'Si se escala automáticamente al vencer SLA';
COMMENT ON COLUMN notification_groups.escalation_chain IS 'Cadena de escalamiento: ["supervisor","rrhh","gerencia"]';
COMMENT ON COLUMN notification_groups.total_escalations IS 'Contador de escalamientos en este hilo';
COMMENT ON COLUMN notification_groups.last_activity_at IS 'Última actividad en el hilo';

-- 3. Crear tabla de registro de SLA para scoring de empleados
CREATE TABLE IF NOT EXISTS notification_sla_records (
    id SERIAL PRIMARY KEY,
    message_id UUID REFERENCES notification_messages(id) ON DELETE CASCADE,
    employee_id VARCHAR(100) NOT NULL,
    company_id INTEGER NOT NULL,
    sla_type VARCHAR(50) NOT NULL, -- 'response_required', 'acknowledgment', 'action_required'
    expected_response_at TIMESTAMP NOT NULL,
    actual_response_at TIMESTAMP,
    sla_met BOOLEAN,
    breach_minutes INTEGER, -- Minutos de retraso
    escalation_triggered BOOLEAN DEFAULT FALSE,
    escalation_level INTEGER DEFAULT 0,
    evaluation_impact DECIMAL(5,2) DEFAULT 0,
    discharge_filed BOOLEAN DEFAULT FALSE,
    discharge_reason TEXT,
    discharge_verdict VARCHAR(20), -- 'accepted', 'rejected', 'pending'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sla_records_employee ON notification_sla_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_sla_records_company ON notification_sla_records(company_id);
CREATE INDEX IF NOT EXISTS idx_sla_records_sla_met ON notification_sla_records(sla_met);
CREATE INDEX IF NOT EXISTS idx_sla_records_breach ON notification_sla_records(sla_met) WHERE sla_met = FALSE;

COMMENT ON TABLE notification_sla_records IS 'Registro histórico de cumplimiento de SLA para scoring de empleados';

-- 4. Crear tabla de configuración de SLA por empresa/tipo
CREATE TABLE IF NOT EXISTS notification_sla_config (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'vacation_request', 'late_arrival', etc
    sla_hours INTEGER DEFAULT 24,
    warning_hours INTEGER DEFAULT 4, -- Horas antes de vencimiento para avisar
    escalation_enabled BOOLEAN DEFAULT TRUE,
    escalation_chain JSONB DEFAULT '["supervisor","rrhh"]'::jsonb,
    evaluation_impact DECIMAL(5,2) DEFAULT -2.00, -- Impacto en evaluación
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, notification_type)
);

-- Insertar configuración por defecto para company 11
INSERT INTO notification_sla_config (company_id, notification_type, sla_hours, warning_hours, evaluation_impact)
VALUES
    (11, 'vacation_request', 48, 8, -1.00),
    (11, 'leave_request', 24, 4, -2.00),
    (11, 'overtime_request', 12, 2, -1.50),
    (11, 'late_arrival', 8, 2, -3.00),
    (11, 'shift_swap', 24, 4, -1.00),
    (11, 'training_mandatory', 72, 24, -5.00),
    (11, 'document_request', 48, 8, -2.00),
    (11, 'general', 24, 4, -1.00)
ON CONFLICT (company_id, notification_type) DO NOTHING;

COMMENT ON TABLE notification_sla_config IS 'Configuración de SLA por tipo de notificación y empresa';

-- 5. Índices adicionales para notification_messages
CREATE INDEX IF NOT EXISTS idx_notif_msg_requires_response ON notification_messages(requires_response) WHERE requires_response = TRUE;
CREATE INDEX IF NOT EXISTS idx_notif_msg_sla_breach ON notification_messages(sla_breach) WHERE sla_breach = TRUE;
CREATE INDEX IF NOT EXISTS idx_notif_msg_deadline ON notification_messages(deadline_at) WHERE deadline_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notif_msg_escalation ON notification_messages(escalation_status) WHERE escalation_status != 'none';
CREATE INDEX IF NOT EXISTS idx_notif_msg_recipient ON notification_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notif_msg_sender ON notification_messages(sender_id);

-- 6. Función para calcular score de SLA de un empleado
CREATE OR REPLACE FUNCTION get_employee_sla_score(p_employee_id VARCHAR(100), p_company_id INTEGER)
RETURNS TABLE (
    total_sla_records INTEGER,
    sla_met_count INTEGER,
    sla_breach_count INTEGER,
    compliance_rate DECIMAL(5,2),
    total_breach_minutes INTEGER,
    avg_response_minutes DECIMAL(10,2),
    total_evaluation_impact DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_sla_records,
        COUNT(*) FILTER (WHERE r.sla_met = TRUE)::INTEGER as sla_met_count,
        COUNT(*) FILTER (WHERE r.sla_met = FALSE)::INTEGER as sla_breach_count,
        ROUND(
            (COUNT(*) FILTER (WHERE r.sla_met = TRUE)::DECIMAL / NULLIF(COUNT(*), 0) * 100), 2
        ) as compliance_rate,
        COALESCE(SUM(r.breach_minutes) FILTER (WHERE r.sla_met = FALSE), 0)::INTEGER as total_breach_minutes,
        ROUND(AVG(
            EXTRACT(EPOCH FROM (r.actual_response_at - r.created_at)) / 60
        ) FILTER (WHERE r.actual_response_at IS NOT NULL), 2) as avg_response_minutes,
        COALESCE(SUM(r.evaluation_impact), 0)::DECIMAL(5,2) as total_evaluation_impact
    FROM notification_sla_records r
    WHERE r.employee_id = p_employee_id
      AND r.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Función para obtener notificaciones pendientes de respuesta de un empleado
CREATE OR REPLACE FUNCTION get_pending_notifications_for_employee(p_employee_id VARCHAR(100), p_company_id INTEGER)
RETURNS TABLE (
    message_id UUID,
    group_id UUID,
    subject VARCHAR(255),
    content TEXT,
    sender_name VARCHAR(255),
    deadline_at TIMESTAMP,
    hours_remaining INTEGER,
    is_overdue BOOLEAN,
    escalation_status VARCHAR(20),
    requires_response BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id as message_id,
        m.group_id,
        g.subject,
        m.content,
        m.sender_name,
        m.deadline_at,
        EXTRACT(EPOCH FROM (m.deadline_at - NOW()) / 3600)::INTEGER as hours_remaining,
        (m.deadline_at < NOW()) as is_overdue,
        m.escalation_status,
        m.requires_response
    FROM notification_messages m
    JOIN notification_groups g ON g.id = m.group_id
    WHERE m.recipient_id = p_employee_id
      AND m.company_id = p_company_id
      AND m.requires_response = TRUE
      AND m.responded_at IS NULL
      AND m.is_deleted = FALSE
    ORDER BY
        (m.deadline_at < NOW()) DESC,
        m.deadline_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 8. Vista para resumen de notificaciones pendientes
CREATE OR REPLACE VIEW v_notification_pending_summary AS
SELECT
    m.recipient_id as employee_id,
    m.company_id,
    COUNT(*) FILTER (WHERE m.requires_response = TRUE AND m.responded_at IS NULL) as pending_responses,
    COUNT(*) FILTER (WHERE m.deadline_at < NOW() AND m.responded_at IS NULL) as overdue_responses,
    COUNT(*) FILTER (WHERE m.read_at IS NULL) as unread_messages,
    COUNT(*) FILTER (WHERE m.escalation_status = 'escalated') as escalated_count,
    COUNT(*) FILTER (WHERE m.sla_breach = TRUE) as sla_breaches,
    MAX(m.created_at) as last_notification_at
FROM notification_messages m
WHERE m.is_deleted = FALSE
GROUP BY m.recipient_id, m.company_id;

COMMENT ON VIEW v_notification_pending_summary IS 'Resumen de notificaciones pendientes por empleado';

-- 9. Vista para notificaciones enviadas sin respuesta (para el remitente)
CREATE OR REPLACE VIEW v_sent_notifications_awaiting_response AS
SELECT
    m.sender_id as employee_id,
    m.company_id,
    COUNT(*) FILTER (WHERE m.requires_response = TRUE AND m.responded_at IS NULL) as awaiting_response,
    COUNT(*) FILTER (WHERE m.deadline_at < NOW() AND m.responded_at IS NULL) as overdue_no_response,
    COUNT(*) FILTER (WHERE m.escalation_status = 'escalated') as escalated_count
FROM notification_messages m
WHERE m.is_deleted = FALSE
  AND m.requires_response = TRUE
GROUP BY m.sender_id, m.company_id;

COMMENT ON VIEW v_sent_notifications_awaiting_response IS 'Notificaciones enviadas que esperan respuesta';

-- 10. Trigger para actualizar last_activity_at en grupos
CREATE OR REPLACE FUNCTION update_group_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE notification_groups
    SET last_activity_at = NOW()
    WHERE id = NEW.group_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_group_activity ON notification_messages;
CREATE TRIGGER trg_update_group_activity
    AFTER INSERT OR UPDATE ON notification_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_group_last_activity();

-- Mensaje de éxito
DO $$
BEGIN
    RAISE NOTICE 'Migración de SLA y Escalamiento completada exitosamente';
END $$;
