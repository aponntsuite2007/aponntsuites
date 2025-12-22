/**
 * ============================================================================
 * MIGRACIÓN: Sistema de Workflows de Notificaciones Multi-Canal
 * ============================================================================
 *
 * Sistema SSOT (Single Source of Truth) para gestión de notificaciones
 * con soporte multi-canal (Email, WhatsApp, SMS, Push) y workflows
 * con respuesta automática.
 *
 * ARQUITECTURA:
 * - notification_workflows: SSOT de todos los procesos de notificación
 * - notification_log: Tracking de envíos y respuestas
 * - notification_templates: Plantillas de contenido por canal
 *
 * SCOPE:
 * - Procesos Aponnt (scope='aponnt'): 56 procesos globales
 * - Procesos Empresa (scope='company'): 22 procesos multi-tenant
 *
 * ============================================================================
 */

-- ============================================================================
-- TABLA 1: notification_workflows (SSOT)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_workflows (
    id SERIAL PRIMARY KEY,

    -- Identificación del proceso
    process_key VARCHAR(100) NOT NULL,
    process_name VARCHAR(255) NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,

    -- Scope: Aponnt (global) vs Empresa (multi-tenant)
    scope VARCHAR(20) NOT NULL DEFAULT 'aponnt',
    -- Valores: 'aponnt' (global para toda la plataforma)
    --          'company' (específico de cada empresa, multi-tenant)

    company_id INT,
    -- NULL si scope='aponnt'
    -- NOT NULL si scope='company' → Multi-tenant

    -- ========================================================================
    -- WORKFLOW DEFINITION (Steps secuenciales)
    -- ========================================================================
    workflow_steps JSONB NOT NULL DEFAULT '{"steps": []}',
    /*
    Ejemplo workflow completo:
    {
      "steps": [
        {
          "step": 1,
          "action": "send_notification",
          "channels": ["email", "whatsapp"],
          "template_key": "payroll_receipt",
          "description": "Enviar recibo de sueldo"
        },
        {
          "step": 2,
          "action": "wait_for_response",
          "timeout_hours": 48,
          "response_type": "boolean",
          "description": "Esperar confirmación de recepción"
        },
        {
          "step": 3,
          "action": "process_response",
          "on_accept": "mark_received",
          "on_reject": "escalate_to_manager",
          "on_timeout": "send_reminder",
          "description": "Procesar respuesta o timeout"
        }
      ]
    }
    */

    -- ========================================================================
    -- CANALES DE COMUNICACIÓN
    -- ========================================================================
    channels JSONB DEFAULT '["email"]',
    -- Array de canales: ["email", "whatsapp", "sms", "push"]
    -- Se envía por TODOS los canales configurados

    primary_channel VARCHAR(20) DEFAULT 'email',
    -- Canal principal si hay que elegir uno solo

    -- ========================================================================
    -- CONFIGURACIÓN DE RESPUESTA
    -- ========================================================================
    requires_response BOOLEAN DEFAULT FALSE,
    -- Si TRUE, el workflow espera respuesta del usuario

    response_type VARCHAR(20),
    -- 'boolean': SI/NO, ACEPTO/RECHAZO
    -- 'choice': Múltiples opciones
    -- 'text': Respuesta abierta
    -- 'action': Click en botón (sin texto)

    response_options JSONB,
    /*
    Para response_type='boolean':
      ["SI", "NO"] o ["ACEPTO", "RECHAZO"] o ["CONFIRMAR", "CANCELAR"]

    Para response_type='choice':
      ["OPCION_1", "OPCION_2", "OPCION_3"]

    Para response_type='action':
      [
        {"label": "Aprobar", "value": "APPROVE", "style": "success"},
        {"label": "Rechazar", "value": "REJECT", "style": "danger"}
      ]
    */

    response_timeout_hours INT DEFAULT 48,
    -- Timeout para recibir respuesta (en horas)

    auto_action_on_timeout VARCHAR(50),
    -- Acción automática si no responde en tiempo
    -- 'send_reminder', 'escalate', 'auto_approve', 'auto_reject', 'mark_expired'

    -- ========================================================================
    -- PRIORIDAD Y SLA
    -- ========================================================================
    priority VARCHAR(20) DEFAULT 'medium',
    -- 'low', 'medium', 'high', 'critical'

    sla_delivery_minutes INT,
    -- SLA de entrega (ej: 5 min para emails críticos)

    sla_response_hours INT,
    -- SLA de respuesta del usuario (ej: 24hs para aprobaciones)

    -- ========================================================================
    -- TEMPLATES POR CANAL
    -- ========================================================================
    email_template_key VARCHAR(100),
    -- Referencia a notification_templates

    whatsapp_template_key VARCHAR(100),
    sms_template_key VARCHAR(100),
    push_template_key VARCHAR(100),

    -- ========================================================================
    -- DESTINATARIOS
    -- ========================================================================
    recipient_type VARCHAR(20),
    -- 'employee', 'user', 'partner', 'staff', 'admin', 'manager'

    recipient_rules JSONB,
    /*
    Reglas para determinar destinatarios:
    {
      "type": "employee",
      "filter": {
        "department": "RRHH",
        "role": "admin"
      },
      "fallback": "manager"
    }
    */

    -- ========================================================================
    -- CONFIGURACIÓN EMAIL (si se usa email_config separado)
    -- ========================================================================
    email_config_source VARCHAR(20) DEFAULT 'process_mapping',
    -- 'process_mapping': Usa email_process_mapping (sistema anterior)
    -- 'direct': Especifica email_type directamente aquí

    email_type VARCHAR(50),
    -- Si email_config_source='direct' → Email type a usar

    -- ========================================================================
    -- METADATA Y ESTADO
    -- ========================================================================
    is_active BOOLEAN DEFAULT TRUE,
    -- Si FALSE, el workflow no se ejecuta

    metadata JSONB DEFAULT '{}',
    /*
    Metadata adicional:
    {
      "tags": ["finance", "critical"],
      "business_owner": "RRHH",
      "compliance_required": true,
      "audit_retention_days": 365
    }
    */

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,

    -- ========================================================================
    -- CONSTRAINTS
    -- ========================================================================
    CONSTRAINT unique_process_per_scope UNIQUE (process_key, scope, company_id),
    -- Un proceso puede existir en scope='aponnt' Y en scope='company' para cada empresa

    CONSTRAINT valid_scope CHECK (scope IN ('aponnt', 'company')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_response_type CHECK (response_type IN ('boolean', 'choice', 'text', 'action') OR response_type IS NULL),
    CONSTRAINT valid_primary_channel CHECK (primary_channel IN ('email', 'whatsapp', 'sms', 'push')),

    -- Si scope='company', company_id es obligatorio
    CONSTRAINT company_id_required_for_company_scope
        CHECK ((scope = 'aponnt' AND company_id IS NULL) OR (scope = 'company' AND company_id IS NOT NULL)),

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Índices para búsqueda rápida
CREATE INDEX idx_notification_workflows_scope ON notification_workflows(scope);
CREATE INDEX idx_notification_workflows_company ON notification_workflows(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_notification_workflows_module ON notification_workflows(module);
CREATE INDEX idx_notification_workflows_process_key ON notification_workflows(process_key);
CREATE INDEX idx_notification_workflows_is_active ON notification_workflows(is_active);
CREATE INDEX idx_notification_workflows_priority ON notification_workflows(priority);

-- ============================================================================
-- TABLA 2: notification_log (Tracking de envíos y respuestas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Workflow asociado
    workflow_id INT NOT NULL,
    process_key VARCHAR(100) NOT NULL,
    company_id INT,

    -- Destinatario
    recipient_type VARCHAR(20) NOT NULL,
    -- 'employee', 'user', 'partner', 'staff', 'admin'

    recipient_id UUID,
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    recipient_push_token VARCHAR(500),

    -- Canal usado
    channel VARCHAR(20) NOT NULL,
    -- 'email', 'whatsapp', 'sms', 'push'

    -- Timestamps de tracking
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    response_at TIMESTAMP,

    -- Respuesta del usuario
    response TEXT,
    response_metadata JSONB,
    /*
    {
      "button_clicked": "APPROVE",
      "response_time_seconds": 3600,
      "ip_address": "192.168.1.1",
      "user_agent": "...",
      "location": "Buenos Aires, AR"
    }
    */

    -- Estado del envío
    status VARCHAR(20) DEFAULT 'pending',
    -- 'pending': En cola
    -- 'sent': Enviado
    -- 'delivered': Entregado al proveedor (email/whatsapp)
    -- 'read': Leído por el usuario
    -- 'responded': Usuario respondió
    -- 'expired': Timeout vencido sin respuesta
    -- 'failed': Error en envío

    error_message TEXT,
    error_code VARCHAR(50),

    -- Proveedor de envío
    provider VARCHAR(50),
    -- 'sendgrid', 'mailgun', 'twilio', 'firebase', etc.

    provider_message_id VARCHAR(255),
    -- ID del mensaje en el proveedor (para tracking)

    -- Metadata
    metadata JSONB DEFAULT '{}',
    /*
    {
      "subject": "Recibo de sueldo",
      "template_used": "payroll_receipt_v2",
      "variables": {"amount": 5000, "period": "2025-12"},
      "attachments": ["https://..."]
    }
    */

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (workflow_id) REFERENCES notification_workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX idx_notification_log_workflow ON notification_log(workflow_id);
CREATE INDEX idx_notification_log_company ON notification_log(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_notification_log_recipient ON notification_log(recipient_id);
CREATE INDEX idx_notification_log_status ON notification_log(status);
CREATE INDEX idx_notification_log_channel ON notification_log(channel);
CREATE INDEX idx_notification_log_sent_at ON notification_log(sent_at DESC);
CREATE INDEX idx_notification_log_process_key ON notification_log(process_key);

-- Índice compuesto para métricas
CREATE INDEX idx_notification_log_metrics ON notification_log(process_key, channel, status, sent_at DESC);

-- ============================================================================
-- TABLA 3: notification_templates (Plantillas de contenido)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,

    template_key VARCHAR(100) NOT NULL,
    -- Identificador único del template

    channel VARCHAR(20) NOT NULL,
    -- 'email', 'whatsapp', 'sms', 'push'

    language VARCHAR(10) DEFAULT 'es',
    -- 'es', 'en', 'pt', etc.

    scope VARCHAR(20) NOT NULL DEFAULT 'aponnt',
    company_id INT,
    -- Multi-tenant: empresas pueden customizar templates

    -- Contenido del template
    subject VARCHAR(255),
    -- Para email y push

    body TEXT NOT NULL,
    -- Contenido con variables: {{user_name}}, {{amount}}, etc.

    html_body TEXT,
    -- Para emails con HTML

    -- Variables disponibles
    available_variables JSONB,
    /*
    [
      {"key": "user_name", "type": "string", "description": "Nombre del usuario"},
      {"key": "amount", "type": "number", "description": "Monto en $"},
      {"key": "date", "type": "date", "description": "Fecha del evento"}
    ]
    */

    -- Botones de respuesta (para email/whatsapp)
    response_buttons JSONB,
    /*
    [
      {
        "label": "Confirmar Recepción",
        "value": "CONFIRM",
        "style": "primary",
        "action": "https://app.aponnt.com/api/notifications/response/{{log_id}}?response=CONFIRM"
      },
      {
        "label": "Reportar Problema",
        "value": "REJECT",
        "style": "danger",
        "action": "https://app.aponnt.com/api/notifications/response/{{log_id}}?response=REJECT"
      }
    ]
    */

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    version INT DEFAULT 1,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_template_per_scope UNIQUE (template_key, channel, language, scope, company_id),
    CONSTRAINT valid_channel CHECK (channel IN ('email', 'whatsapp', 'sms', 'push')),
    CONSTRAINT valid_scope_template CHECK (scope IN ('aponnt', 'company')),

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_notification_templates_key ON notification_templates(template_key);
CREATE INDEX idx_notification_templates_channel ON notification_templates(channel);
CREATE INDEX idx_notification_templates_scope ON notification_templates(scope);
CREATE INDEX idx_notification_templates_company ON notification_templates(company_id) WHERE company_id IS NOT NULL;

-- ============================================================================
-- FUNCIONES HELPER
-- ============================================================================

/**
 * Actualizar timestamp automáticamente
 */
CREATE OR REPLACE FUNCTION update_notification_workflow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_notification_workflow_timestamp
    BEFORE UPDATE ON notification_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_workflow_timestamp();

CREATE TRIGGER trg_update_notification_template_timestamp
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_workflow_timestamp();

/**
 * Obtener métricas de un proceso
 */
CREATE OR REPLACE FUNCTION get_notification_process_metrics(
    p_process_key VARCHAR,
    p_company_id INT DEFAULT NULL,
    p_days INT DEFAULT 30
)
RETURNS TABLE (
    total_sent BIGINT,
    total_delivered BIGINT,
    total_read BIGINT,
    total_responded BIGINT,
    total_failed BIGINT,
    avg_delivery_time_seconds NUMERIC,
    avg_read_time_seconds NUMERIC,
    avg_response_time_seconds NUMERIC,
    delivery_rate NUMERIC,
    read_rate NUMERIC,
    response_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_sent,
        COUNT(*) FILTER (WHERE status IN ('delivered', 'read', 'responded')) as total_delivered,
        COUNT(*) FILTER (WHERE status IN ('read', 'responded')) as total_read,
        COUNT(*) FILTER (WHERE status = 'responded') as total_responded,
        COUNT(*) FILTER (WHERE status = 'failed') as total_failed,

        AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at))) FILTER (WHERE delivered_at IS NOT NULL) as avg_delivery_time_seconds,
        AVG(EXTRACT(EPOCH FROM (read_at - sent_at))) FILTER (WHERE read_at IS NOT NULL) as avg_read_time_seconds,
        AVG(EXTRACT(EPOCH FROM (response_at - sent_at))) FILTER (WHERE response_at IS NOT NULL) as avg_response_time_seconds,

        (COUNT(*) FILTER (WHERE status IN ('delivered', 'read', 'responded'))::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100) as delivery_rate,
        (COUNT(*) FILTER (WHERE status IN ('read', 'responded'))::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100) as read_rate,
        (COUNT(*) FILTER (WHERE status = 'responded')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100) as response_rate
    FROM notification_log
    WHERE process_key = p_process_key
      AND (p_company_id IS NULL OR company_id = p_company_id)
      AND sent_at > CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

/**
 * Obtener estadísticas globales por canal
 */
CREATE OR REPLACE FUNCTION get_notification_channel_stats(p_days INT DEFAULT 30)
RETURNS TABLE (
    channel VARCHAR,
    total_sent BIGINT,
    delivery_rate NUMERIC,
    read_rate NUMERIC,
    avg_delivery_seconds NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        nl.channel,
        COUNT(*) as total_sent,
        (COUNT(*) FILTER (WHERE status IN ('delivered', 'read', 'responded'))::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100) as delivery_rate,
        (COUNT(*) FILTER (WHERE status IN ('read', 'responded'))::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100) as read_rate,
        AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at))) FILTER (WHERE delivered_at IS NOT NULL) as avg_delivery_seconds
    FROM notification_log nl
    WHERE sent_at > CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL
    GROUP BY nl.channel
    ORDER BY total_sent DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE notification_workflows IS 'SSOT del sistema de notificaciones multi-canal con workflows y respuestas automáticas';
COMMENT ON COLUMN notification_workflows.scope IS 'aponnt=global para toda la plataforma, company=multi-tenant por empresa';
COMMENT ON COLUMN notification_workflows.workflow_steps IS 'Definición completa del workflow con steps secuenciales (JSONB)';
COMMENT ON COLUMN notification_workflows.requires_response IS 'Si TRUE, el workflow espera respuesta del usuario (botones SI/NO, ACEPTO/RECHAZO, etc.)';
COMMENT ON COLUMN notification_workflows.channels IS 'Array de canales por los que se envía: ["email", "whatsapp", "sms", "push"]';

COMMENT ON TABLE notification_log IS 'Log de tracking de todas las notificaciones enviadas con métricas de entrega, lectura y respuesta';
COMMENT ON TABLE notification_templates IS 'Templates de contenido por canal (email, whatsapp, sms, push) con soporte multi-idioma y multi-tenant';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
