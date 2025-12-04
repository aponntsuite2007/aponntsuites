-- ============================================================================
-- SISTEMA DE NOTIFICACIONES UNIFICADO v3.0
-- Fecha: 2025-12-03
-- Descripcion: Sistema unico para todo el ecosistema (Admin, Empresa, APK)
-- ============================================================================

-- ============================================================================
-- 1. TABLA PRINCIPAL: unified_notifications
-- ============================================================================

DROP TABLE IF EXISTS unified_notifications CASCADE;
CREATE TABLE unified_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenant
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Threading/Conversaciones
    thread_id UUID,  -- Agrupa mensajes en conversacion
    parent_id UUID REFERENCES unified_notifications(id) ON DELETE SET NULL,
    sequence_in_thread INTEGER DEFAULT 1,

    -- Origen y Destino
    origin_type VARCHAR(50) NOT NULL,  -- 'aponnt', 'company', 'employee', 'system', 'apk'
    origin_id VARCHAR(100),
    origin_name VARCHAR(255),
    origin_role VARCHAR(50),

    recipient_type VARCHAR(50) NOT NULL,  -- 'user', 'role', 'department', 'company', 'broadcast'
    recipient_id VARCHAR(100),
    recipient_name VARCHAR(255),
    recipient_role VARCHAR(50),
    recipient_department_id INTEGER,
    recipient_hierarchy_level INTEGER DEFAULT 0,  -- 0=employee, 1=supervisor, 2=manager, 3=rrhh, 4=admin

    -- Contenido
    category VARCHAR(50) NOT NULL DEFAULT 'general',  -- 'approval', 'alert', 'info', 'proactive', 'chat'
    module VARCHAR(50),  -- 'attendance', 'vacation', 'medical', 'payroll', etc.
    notification_type VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium',  -- 'critical', 'high', 'medium', 'low'

    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    short_message VARCHAR(280),

    -- Metadata contextual
    metadata JSONB DEFAULT '{}',
    related_entity_type VARCHAR(50),
    related_entity_id VARCHAR(100),

    -- Estado de lectura
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    read_by UUID,

    -- Workflow y Acciones
    requires_action BOOLEAN DEFAULT FALSE,
    action_type VARCHAR(50),  -- 'approve_reject', 'acknowledge', 'respond', 'choice'
    action_options JSONB DEFAULT '[]',
    action_status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'acknowledged', 'expired'
    action_deadline TIMESTAMP,
    action_taken_at TIMESTAMP,
    action_taken_by UUID,
    action_response TEXT,
    action_notes TEXT,

    -- Workflow Multi-nivel
    workflow_id INTEGER,
    workflow_step INTEGER DEFAULT 0,
    workflow_status VARCHAR(50),  -- 'in_progress', 'completed', 'rejected', 'escalated'

    -- SLA y Escalamiento
    sla_hours INTEGER,
    sla_deadline TIMESTAMP,
    sla_breached BOOLEAN DEFAULT FALSE,
    sla_breach_at TIMESTAMP,
    escalation_level INTEGER DEFAULT 0,
    escalated_from_id UUID REFERENCES unified_notifications(id),
    escalated_to_id UUID,
    escalation_reason TEXT,

    -- Canales de envio
    channels JSONB DEFAULT '["app"]',  -- ['app', 'email', 'whatsapp', 'sms', 'push']
    sent_via_app BOOLEAN DEFAULT TRUE,
    sent_via_email BOOLEAN DEFAULT FALSE,
    sent_via_push BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    push_sent_at TIMESTAMP,

    -- AI Integration
    ai_analyzed BOOLEAN DEFAULT FALSE,
    ai_analyzed_at TIMESTAMP,
    ai_suggested_response TEXT,
    ai_confidence DECIMAL(5,4),
    ai_auto_responded BOOLEAN DEFAULT FALSE,
    ai_topic VARCHAR(100),
    ai_sentiment VARCHAR(20),  -- 'positive', 'neutral', 'negative'

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,
    expires_at TIMESTAMP,
    deleted_at TIMESTAMP,
    deleted_by UUID
);

-- Indices para performance
CREATE INDEX idx_unified_notif_company ON unified_notifications(company_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_unified_notif_recipient ON unified_notifications(recipient_id, is_read, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_unified_notif_thread ON unified_notifications(thread_id, sequence_in_thread) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_unified_notif_origin ON unified_notifications(origin_type, origin_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_unified_notif_action ON unified_notifications(action_status, action_deadline) WHERE requires_action = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_unified_notif_module ON unified_notifications(module, category) WHERE deleted_at IS NULL;
CREATE INDEX idx_unified_notif_sla ON unified_notifications(sla_deadline) WHERE sla_deadline IS NOT NULL AND sla_breached = FALSE;
CREATE INDEX idx_unified_notif_hierarchy ON unified_notifications(recipient_hierarchy_level, company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_unified_notif_metadata ON unified_notifications USING GIN (metadata);

-- ============================================================================
-- 2. TABLA: notification_threads (Agrupacion de conversaciones)
-- ============================================================================

DROP TABLE IF EXISTS notification_threads CASCADE;
CREATE TABLE notification_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Identificacion
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    module VARCHAR(50),
    thread_type VARCHAR(50) NOT NULL,  -- 'request', 'approval', 'chat', 'alert', 'proactive'

    -- Participantes
    initiator_type VARCHAR(50),
    initiator_id VARCHAR(100),
    initiator_name VARCHAR(255),
    participants JSONB DEFAULT '[]',  -- [{id, name, role, type}]

    -- Estado
    status VARCHAR(50) DEFAULT 'open',  -- 'open', 'pending', 'resolved', 'closed', 'escalated'
    priority VARCHAR(20) DEFAULT 'medium',

    -- Contadores
    message_count INTEGER DEFAULT 0,
    unread_count INTEGER DEFAULT 0,

    -- Workflow
    current_workflow_step INTEGER DEFAULT 0,
    workflow_id INTEGER,

    -- SLA
    sla_deadline TIMESTAMP,
    sla_breached BOOLEAN DEFAULT FALSE,

    -- AI
    ai_summary TEXT,
    ai_topic VARCHAR(100),
    ai_resolution_status VARCHAR(50),  -- 'unknown', 'pending', 'resolved', 'needs_human'

    -- Timestamps
    last_message_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP,
    closed_by UUID
);

CREATE INDEX idx_threads_company ON notification_threads(company_id, status, last_message_at DESC);
CREATE INDEX idx_threads_initiator ON notification_threads(initiator_id, status);
CREATE INDEX idx_threads_module ON notification_threads(module, category);

-- ============================================================================
-- 3. TABLA: notification_workflows (Flujos de aprobacion)
-- ============================================================================

DROP TABLE IF EXISTS notification_workflows CASCADE;
CREATE TABLE notification_workflows (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,  -- NULL = global

    workflow_key VARCHAR(100) NOT NULL,
    workflow_name VARCHAR(255) NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,

    is_active BOOLEAN DEFAULT TRUE,

    -- Pasos del workflow
    steps JSONB NOT NULL DEFAULT '[]',
    -- Ejemplo: [{"step": 1, "name": "Supervisor", "approver_role": "supervisor", "timeout_hours": 24, "escalate": true}]

    -- Condiciones
    activation_conditions JSONB DEFAULT '{}',

    -- Acciones automaticas
    on_approval_actions JSONB DEFAULT '[]',
    on_rejection_actions JSONB DEFAULT '[]',
    on_timeout_actions JSONB DEFAULT '[]',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, workflow_key)
);

-- ============================================================================
-- 4. TABLA: notification_templates (Plantillas reutilizables)
-- ============================================================================

DROP TABLE IF EXISTS notification_templates CASCADE;
CREATE TABLE notification_templates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,  -- NULL = global

    template_key VARCHAR(100) NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    module VARCHAR(50) NOT NULL,
    category VARCHAR(50) DEFAULT 'general',

    -- Templates con placeholders {{variable}}
    title_template VARCHAR(255),
    message_template TEXT,
    short_message_template VARCHAR(280),

    -- Variables disponibles
    available_variables JSONB DEFAULT '[]',

    -- Configuracion por defecto
    default_priority VARCHAR(20) DEFAULT 'medium',
    default_channels JSONB DEFAULT '["app"]',
    requires_action BOOLEAN DEFAULT FALSE,
    default_action_type VARCHAR(50),

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, template_key)
);

-- ============================================================================
-- 5. TABLA: notification_actions_log (Historial de acciones)
-- ============================================================================

DROP TABLE IF EXISTS notification_actions_log CASCADE;
CREATE TABLE notification_actions_log (
    id BIGSERIAL PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES unified_notifications(id) ON DELETE CASCADE,
    thread_id UUID,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,

    action VARCHAR(50) NOT NULL,  -- 'created', 'read', 'approved', 'rejected', 'escalated', 'ai_response'
    action_by UUID,
    action_by_name VARCHAR(255),
    action_by_role VARCHAR(50),
    action_at TIMESTAMP DEFAULT NOW(),

    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    -- Auditoria web/app
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50)  -- 'web', 'apk', 'ios', 'api'
);

CREATE INDEX idx_actions_notification ON notification_actions_log(notification_id, action_at DESC);
CREATE INDEX idx_actions_thread ON notification_actions_log(thread_id, action_at DESC);
CREATE INDEX idx_actions_company ON notification_actions_log(company_id, action_at DESC);

-- ============================================================================
-- 6. TABLA: user_notification_preferences
-- ============================================================================

DROP TABLE IF EXISTS user_notification_preferences CASCADE;
CREATE TABLE user_notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Por modulo
    module VARCHAR(50),  -- NULL = global preferences

    -- Canales
    receive_app BOOLEAN DEFAULT TRUE,
    receive_email BOOLEAN DEFAULT TRUE,
    receive_push BOOLEAN DEFAULT TRUE,
    receive_whatsapp BOOLEAN DEFAULT FALSE,
    receive_sms BOOLEAN DEFAULT FALSE,

    -- Horarios (no molestar)
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    quiet_days JSONB DEFAULT '[]',  -- [0, 6] = domingo, sabado

    -- Resumenes
    daily_digest BOOLEAN DEFAULT FALSE,
    digest_time TIME DEFAULT '08:00',

    -- AI
    allow_ai_responses BOOLEAN DEFAULT TRUE,
    ai_auto_respond_threshold DECIMAL(3,2) DEFAULT 0.85,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, company_id, module)
);

-- ============================================================================
-- 7. TABLA: notification_ai_learning (Aprendizaje AI)
-- ============================================================================

DROP TABLE IF EXISTS notification_ai_learning CASCADE;
CREATE TABLE notification_ai_learning (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,  -- NULL = global

    category VARCHAR(100),
    module VARCHAR(50),

    -- Patron de pregunta
    question_pattern TEXT NOT NULL,
    question_keywords TEXT[],

    -- Respuesta aprendida
    answer_content TEXT NOT NULL,
    answer_summary VARCHAR(500),

    -- Origen
    learned_from_thread_id UUID,
    learned_from_notification_id UUID,
    answered_by_user_id UUID,
    answered_by_role VARCHAR(50),

    -- Metricas
    times_suggested INTEGER DEFAULT 0,
    times_accepted INTEGER DEFAULT 0,
    times_rejected INTEGER DEFAULT 0,
    confidence_score DECIMAL(5,4) DEFAULT 0.5,

    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID,
    verified_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_learning_pattern ON notification_ai_learning USING GIN (question_keywords);
CREATE INDEX idx_ai_learning_category ON notification_ai_learning(category, module, is_active);

-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_unified_notif_updated ON unified_notifications;
CREATE TRIGGER trg_unified_notif_updated
    BEFORE UPDATE ON unified_notifications
    FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

DROP TRIGGER IF EXISTS trg_threads_updated ON notification_threads;
CREATE TRIGGER trg_threads_updated
    BEFORE UPDATE ON notification_threads
    FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

-- Trigger para actualizar contadores del thread
CREATE OR REPLACE FUNCTION update_thread_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE notification_threads
        SET message_count = message_count + 1,
            last_message_at = NOW(),
            unread_count = unread_count + 1
        WHERE id = NEW.thread_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.is_read = FALSE AND NEW.is_read = TRUE THEN
        UPDATE notification_threads
        SET unread_count = GREATEST(unread_count - 1, 0)
        WHERE id = NEW.thread_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notif_thread_counters ON unified_notifications;
CREATE TRIGGER trg_notif_thread_counters
    AFTER INSERT OR UPDATE ON unified_notifications
    FOR EACH ROW
    WHEN (NEW.thread_id IS NOT NULL)
    EXECUTE FUNCTION update_thread_counters();

-- ============================================================================
-- 9. DATOS SEMILLA: Templates globales
-- ============================================================================

INSERT INTO notification_templates (company_id, template_key, template_name, module, category, title_template, message_template, requires_action, default_action_type, available_variables) VALUES
-- Attendance
(NULL, 'late_arrival_approval', 'Llegada tarde - Aprobacion', 'attendance', 'approval',
 '{{employee_name}} llego {{minutes_late}} min tarde',
 'El empleado {{employee_name}} del departamento {{department}} llego {{minutes_late}} minutos tarde.\n\nKiosk: {{kiosk_name}}\nHora: {{check_in_time}}\nTolerancia: {{tolerance_minutes}} min\n\nRequiere aprobacion.',
 TRUE, 'approve_reject',
 '["employee_name", "department", "minutes_late", "kiosk_name", "check_in_time", "tolerance_minutes"]'),

-- Vacation
(NULL, 'vacation_request', 'Solicitud de vacaciones', 'vacation', 'approval',
 '{{employee_name}} solicita {{days}} dias de vacaciones',
 '{{employee_name}} solicita vacaciones del {{start_date}} al {{end_date}} ({{days}} dias).\n\nMotivo: {{reason}}\nDias disponibles: {{available_days}}',
 TRUE, 'approve_reject',
 '["employee_name", "days", "start_date", "end_date", "reason", "available_days"]'),

-- Medical
(NULL, 'medical_certificate_expiry', 'Certificado medico por vencer', 'medical', 'proactive',
 'Certificado medico de {{employee_name}} vence en {{days_until}} dias',
 'El certificado medico de {{employee_name}} ({{certificate_type}}) vence el {{expiry_date}}.\n\nAccion requerida: Renovar antes del vencimiento.',
 TRUE, 'acknowledge',
 '["employee_name", "certificate_type", "expiry_date", "days_until"]'),

-- System
(NULL, 'system_update', 'Actualizacion del sistema', 'system', 'info',
 'Nueva actualizacion disponible: {{version}}',
 '{{description}}\n\nFecha de aplicacion: {{apply_date}}',
 FALSE, NULL,
 '["version", "description", "apply_date"]'),

-- Aponnt
(NULL, 'aponnt_announcement', 'Comunicado de Aponnt', 'aponnt', 'info',
 '{{title}}',
 '{{message}}',
 FALSE, NULL,
 '["title", "message"]');

-- ============================================================================
-- 10. DATOS SEMILLA: Workflows globales
-- ============================================================================

INSERT INTO notification_workflows (company_id, workflow_key, workflow_name, module, description, steps, on_approval_actions, on_rejection_actions) VALUES
-- Workflow de vacaciones
(NULL, 'vacation_approval', 'Aprobacion de vacaciones', 'vacation',
 'Flujo: Empleado -> Supervisor -> RRHH',
 '[
   {"step": 1, "name": "Supervisor", "approver_role": "supervisor", "timeout_hours": 48, "escalate": true},
   {"step": 2, "name": "RRHH", "approver_role": "rrhh", "timeout_hours": 24, "escalate": false}
 ]'::jsonb,
 '["update_vacation_status_approved", "notify_employee_approved", "update_calendar"]'::jsonb,
 '["update_vacation_status_rejected", "notify_employee_rejected"]'::jsonb),

-- Workflow de llegadas tarde
(NULL, 'late_arrival_approval', 'Aprobacion llegada tarde', 'attendance',
 'Flujo: Sistema -> Supervisor -> RRHH',
 '[
   {"step": 1, "name": "Supervisor", "approver_role": "supervisor", "timeout_hours": 8, "escalate": true},
   {"step": 2, "name": "RRHH", "approver_role": "rrhh", "timeout_hours": 4, "escalate": false}
 ]'::jsonb,
 '["mark_attendance_valid", "notify_employee"]'::jsonb,
 '["mark_attendance_invalid", "create_sanction_record", "notify_employee"]'::jsonb);

-- ============================================================================
-- FIN DE MIGRACION
-- ============================================================================

COMMENT ON TABLE unified_notifications IS 'Sistema unificado de notificaciones v3.0 - Usado por Admin, Empresa y APKs';
COMMENT ON TABLE notification_threads IS 'Agrupacion de notificaciones en conversaciones';
COMMENT ON TABLE notification_workflows IS 'Definicion de flujos de aprobacion multi-nivel';
COMMENT ON TABLE notification_templates IS 'Plantillas reutilizables con variables';
COMMENT ON TABLE notification_actions_log IS 'Historial completo de todas las acciones';
COMMENT ON TABLE notification_ai_learning IS 'Base de conocimiento para respuestas automaticas con IA';
