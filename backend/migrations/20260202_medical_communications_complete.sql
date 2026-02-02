-- ============================================================================
-- MIGRACIÓN: Sistema Completo de Comunicaciones Médicas Fehacientes
-- Fecha: 2026-02-02
-- Descripción: Crea tabla communication_logs para tracking legal de comunicaciones
--              + workflows de notificación para módulo médico
-- ============================================================================

-- =============================================================================
-- PARTE 1: TABLA communication_logs (Tracking Fehaciente)
-- =============================================================================

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS communication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Empresa (multi-tenant)
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Receptor de la comunicación
    user_id UUID NOT NULL,

    -- Emisor de la comunicación (médico/admin/sistema)
    sender_id UUID,
    sender_type VARCHAR(20) DEFAULT 'user', -- user, system, doctor

    -- Tipo y canal de comunicación
    communication_type VARCHAR(20) NOT NULL CHECK (communication_type IN ('email', 'sms', 'whatsapp', 'internal_message', 'push')),
    communication_channel VARCHAR(255), -- email address, phone number, etc.

    -- Contenido
    subject VARCHAR(500),
    content TEXT NOT NULL,
    html_content TEXT, -- Contenido HTML para emails

    -- Relación con entidades médicas
    related_entity_type VARCHAR(50), -- certificate, study, photo, exam, case
    related_entity_id UUID,

    -- Referencia al notification_log de NCE (para trazabilidad)
    notification_log_id UUID,
    notification_group_id UUID,

    -- ===== TRACKING DE ESTADOS (CRÍTICO LEGAL) =====
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'acknowledged', 'complied', 'failed', 'expired')),

    -- Timestamps de tracking
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,  -- ACUSE DE RECIBO
    complied_at TIMESTAMP WITH TIME ZONE,      -- Cuando el empleado cumplió (subió documento, etc.)

    -- Confirmación de entrega del proveedor
    delivery_confirmation JSONB,
    delivery_provider VARCHAR(50), -- sendgrid, twilio, etc.
    provider_message_id VARCHAR(255),

    -- Validez legal
    is_legally_valid BOOLEAN DEFAULT TRUE,
    legal_validity_reason TEXT,

    -- Urgencia y deadlines
    urgency VARCHAR(20) DEFAULT 'normal' CHECK (urgency IN ('critical', 'high', 'medium', 'low')),
    response_deadline TIMESTAMP WITH TIME ZONE,

    -- Si requiere acción
    requires_action BOOLEAN DEFAULT FALSE,
    action_type VARCHAR(50), -- acknowledge, upload_document, respond
    action_completed BOOLEAN DEFAULT FALSE,
    action_completed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata adicional
    metadata JSONB DEFAULT '{}',

    -- Error tracking
    error_message TEXT,
    error_code VARCHAR(50),
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP WITH TIME ZONE,

    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_comm_logs_company ON communication_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_user ON communication_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_sender ON communication_logs(sender_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_status ON communication_logs(status);
CREATE INDEX IF NOT EXISTS idx_comm_logs_entity ON communication_logs(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_pending ON communication_logs(user_id, status) WHERE status NOT IN ('acknowledged', 'complied', 'failed', 'expired');
CREATE INDEX IF NOT EXISTS idx_comm_logs_legal ON communication_logs(company_id, is_legally_valid, acknowledged_at);
CREATE INDEX IF NOT EXISTS idx_comm_logs_notification ON communication_logs(notification_log_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_communication_logs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_communication_logs ON communication_logs;
CREATE TRIGGER trigger_update_communication_logs
    BEFORE UPDATE ON communication_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_communication_logs_timestamp();

-- Comentarios de documentación
COMMENT ON TABLE communication_logs IS 'Registro de comunicaciones fehacientes para tracking legal (módulo médico y otros)';
COMMENT ON COLUMN communication_logs.acknowledged_at IS 'Timestamp del acuse de recibo - CRÍTICO LEGAL';
COMMENT ON COLUMN communication_logs.is_legally_valid IS 'Indica si la comunicación tiene validez legal como fehaciente';

-- =============================================================================
-- PARTE 2: WORKFLOWS DE NOTIFICACIÓN PARA MÓDULO MÉDICO
-- =============================================================================

-- Limpiar workflows médicos existentes para evitar duplicados
DELETE FROM notification_workflows WHERE process_key LIKE 'medical.%' AND company_id IS NULL;

-- Workflow: Certificado médico enviado para revisión
INSERT INTO notification_workflows (
    company_id,
    process_key,
    process_name,
    module,
    description,
    scope,
    is_active,
    priority,
    requires_response,
    channels,
    sla_response_hours
) VALUES (
    NULL,
    'medical.certificate_submitted',
    'Certificado Médico Enviado para Revisión',
    'medical',
    'Notifica a RRHH/Médico cuando un empleado envía un certificado médico',
    'aponnt',
    TRUE,
    'high',
    TRUE,
    '["email", "inbox"]'::jsonb,
    24
);

-- Workflow: Respuesta a certificado médico
INSERT INTO notification_workflows (
    company_id,
    process_key,
    process_name,
    module,
    description,
    scope,
    is_active,
    priority,
    requires_response,
    channels,
    sla_response_hours
) VALUES (
    NULL,
    'medical.certificate_response',
    'Respuesta a Certificado Médico',
    'medical',
    'Notifica al empleado cuando su certificado es aprobado o rechazado',
    'aponnt',
    TRUE,
    'high',
    FALSE,
    '["email", "inbox"]'::jsonb,
    1
);

-- Workflow: Solicitud de documento médico
INSERT INTO notification_workflows (
    company_id,
    process_key,
    process_name,
    module,
    description,
    scope,
    is_active,
    priority,
    requires_response,
    channels,
    sla_response_hours
) VALUES (
    NULL,
    'medical.document_requested',
    'Solicitud de Documento Médico',
    'medical',
    'Solicita al empleado un documento médico (certificado, receta, estudio, foto)',
    'aponnt',
    TRUE,
    'high',
    TRUE,
    '["email", "inbox"]'::jsonb,
    72
);

-- Workflow: Recordatorio de examen médico vencido
INSERT INTO notification_workflows (
    company_id,
    process_key,
    process_name,
    module,
    description,
    scope,
    is_active,
    priority,
    requires_response,
    channels,
    sla_response_hours
) VALUES (
    NULL,
    'medical.exam_expiring',
    'Examen Médico por Vencer',
    'medical',
    'Notifica al empleado y RRHH cuando un examen ocupacional está por vencer',
    'aponnt',
    TRUE,
    'medium',
    FALSE,
    '["email", "inbox"]'::jsonb,
    168
);

-- Workflow: Acuse de recibo confirmado
INSERT INTO notification_workflows (
    company_id,
    process_key,
    process_name,
    module,
    description,
    scope,
    is_active,
    priority,
    requires_response,
    channels,
    sla_response_hours
) VALUES (
    NULL,
    'medical.acknowledgment_confirmed',
    'Acuse de Recibo Confirmado',
    'medical',
    'Notifica al médico/RRHH cuando el empleado confirma recepción',
    'aponnt',
    TRUE,
    'medium',
    FALSE,
    '["email", "inbox"]'::jsonb,
    1
);

-- Workflow: Documento médico subido
INSERT INTO notification_workflows (
    company_id,
    process_key,
    process_name,
    module,
    description,
    scope,
    is_active,
    priority,
    requires_response,
    channels,
    sla_response_hours
) VALUES (
    NULL,
    'medical.document_uploaded',
    'Documento Médico Subido',
    'medical',
    'Notifica al médico cuando el empleado sube un documento solicitado',
    'aponnt',
    TRUE,
    'high',
    TRUE,
    '["email", "inbox"]'::jsonb,
    24
);

-- Workflow: Recordatorio de solicitud pendiente
INSERT INTO notification_workflows (
    company_id,
    process_key,
    process_name,
    module,
    description,
    scope,
    is_active,
    priority,
    requires_response,
    channels,
    sla_response_hours
) VALUES (
    NULL,
    'medical.request_reminder',
    'Recordatorio de Solicitud Pendiente',
    'medical',
    'Recordatorio automático para solicitudes médicas no respondidas',
    'aponnt',
    TRUE,
    'high',
    TRUE,
    '["email", "inbox"]'::jsonb,
    24
);

-- =============================================================================
-- PARTE 3: VISTAS ÚTILES
-- =============================================================================

-- Vista: Comunicaciones pendientes de acuse de recibo
CREATE OR REPLACE VIEW v_pending_medical_acknowledgments AS
SELECT
    cl.id,
    cl.company_id,
    cl.user_id,
    COALESCE(u."firstName", '') || ' ' || COALESCE(u."lastName", '') AS employee_name,
    u.email AS employee_email,
    cl.sender_id,
    COALESCE(s."firstName", '') || ' ' || COALESCE(s."lastName", '') AS sender_name,
    cl.subject,
    cl.communication_type,
    cl.related_entity_type,
    cl.related_entity_id,
    cl.status,
    cl.urgency,
    cl.sent_at,
    cl.response_deadline,
    cl.requires_action,
    cl.action_type,
    CASE
        WHEN cl.response_deadline IS NOT NULL AND NOW() > cl.response_deadline THEN TRUE
        ELSE FALSE
    END AS is_overdue,
    EXTRACT(EPOCH FROM (NOW() - cl.sent_at)) / 3600 AS hours_since_sent
FROM communication_logs cl
LEFT JOIN users u ON u.user_id = cl.user_id
LEFT JOIN users s ON s.user_id = cl.sender_id
WHERE cl.status NOT IN ('acknowledged', 'complied', 'failed', 'expired')
  AND cl.related_entity_type IN ('certificate', 'study', 'photo', 'exam', 'case', 'medical_request')
ORDER BY
    CASE cl.urgency
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        ELSE 4
    END,
    cl.sent_at ASC;

COMMENT ON VIEW v_pending_medical_acknowledgments IS 'Vista de comunicaciones médicas pendientes de acuse de recibo';

-- =============================================================================
-- PARTE 4: FUNCIONES HELPER
-- =============================================================================

-- Función: Registrar comunicación fehaciente
CREATE OR REPLACE FUNCTION register_medical_communication(
    p_company_id INTEGER,
    p_user_id UUID,
    p_sender_id UUID,
    p_communication_type VARCHAR(20),
    p_subject VARCHAR(500),
    p_content TEXT,
    p_related_entity_type VARCHAR(50),
    p_related_entity_id UUID,
    p_urgency VARCHAR(20) DEFAULT 'medium',
    p_requires_action BOOLEAN DEFAULT FALSE,
    p_action_type VARCHAR(50) DEFAULT NULL,
    p_response_deadline_hours INTEGER DEFAULT NULL,
    p_notification_log_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_communication_id UUID;
    v_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calcular deadline si se especificó
    IF p_response_deadline_hours IS NOT NULL THEN
        v_deadline := NOW() + (p_response_deadline_hours || ' hours')::INTERVAL;
    END IF;

    INSERT INTO communication_logs (
        company_id,
        user_id,
        sender_id,
        sender_type,
        communication_type,
        subject,
        content,
        related_entity_type,
        related_entity_id,
        urgency,
        requires_action,
        action_type,
        response_deadline,
        notification_log_id,
        status,
        sent_at
    ) VALUES (
        p_company_id,
        p_user_id,
        p_sender_id,
        'user',
        p_communication_type,
        p_subject,
        p_content,
        p_related_entity_type,
        p_related_entity_id,
        p_urgency,
        p_requires_action,
        p_action_type,
        v_deadline,
        p_notification_log_id,
        'sent',
        NOW()
    )
    RETURNING id INTO v_communication_id;

    RETURN v_communication_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION register_medical_communication IS 'Registra una comunicación médica fehaciente con tracking legal';

-- Función: Confirmar acuse de recibo
CREATE OR REPLACE FUNCTION confirm_acknowledgment(
    p_communication_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE communication_logs
    SET
        acknowledged_at = NOW(),
        status = 'acknowledged',
        updated_at = NOW()
    WHERE id = p_communication_id
      AND user_id = p_user_id
      AND acknowledged_at IS NULL;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION confirm_acknowledgment IS 'Confirma el acuse de recibo de una comunicación médica';

-- Función: Marcar como cumplido
CREATE OR REPLACE FUNCTION mark_communication_complied(
    p_communication_id UUID,
    p_user_id UUID,
    p_compliance_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE communication_logs
    SET
        complied_at = NOW(),
        status = 'complied',
        action_completed = TRUE,
        action_completed_at = NOW(),
        metadata = metadata || p_compliance_metadata,
        updated_at = NOW()
    WHERE id = p_communication_id
      AND user_id = p_user_id
      AND complied_at IS NULL;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_communication_complied IS 'Marca una comunicación como cumplida (documento subido, etc.)';

-- =============================================================================
-- FIN DE MIGRACIÓN
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migración medical_communications_complete ejecutada correctamente';
    RAISE NOTICE '   - Tabla communication_logs creada';
    RAISE NOTICE '   - 7 workflows de notificación médica creados';
    RAISE NOTICE '   - Vista v_pending_medical_acknowledgments creada';
    RAISE NOTICE '   - Funciones helper creadas';
END $$;
