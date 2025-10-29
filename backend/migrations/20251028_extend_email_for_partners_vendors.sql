-- ============================================================================
-- EXTENSIÓN: SISTEMA DE EMAILS PARA PARTNERS, VENDEDORES Y SOPORTE
-- ============================================================================
-- Extiende el sistema de emails multicapa para incluir:
-- - Partners/Asociados (sistema de soporte técnico)
-- - Vendedores (equipo comercial de Aponnt)
-- - Soporte (tickets y atención al cliente)
-- ============================================================================

-- ============================================================================
-- TABLA: partner_emails
-- Propósito: Emails de Partners/Asociados con sus preferencias
-- ============================================================================
CREATE TABLE IF NOT EXISTS partner_emails (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

    -- Email del partner
    email VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT true,

    -- Verificación
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    verified_at TIMESTAMP,

    -- Preferencias de notificaciones
    receive_service_requests BOOLEAN DEFAULT true,     -- Nuevas solicitudes de servicio
    receive_commission_alerts BOOLEAN DEFAULT true,    -- Alertas de comisiones
    receive_payment_notifications BOOLEAN DEFAULT true, -- Pagos recibidos
    receive_review_notifications BOOLEAN DEFAULT true,  -- Nuevas reseñas
    receive_support_tickets BOOLEAN DEFAULT true,       -- Tickets asignados
    receive_mediation_alerts BOOLEAN DEFAULT true,      -- Casos de mediación
    receive_document_reminders BOOLEAN DEFAULT true,    -- Vencimiento de documentos
    receive_marketing_emails BOOLEAN DEFAULT false,     -- Marketing de Aponnt

    -- Formato de emails
    email_format VARCHAR(20) DEFAULT 'html', -- html, text
    email_frequency VARCHAR(20) DEFAULT 'instant', -- instant, daily_digest, weekly_digest

    -- Estado
    is_active BOOLEAN DEFAULT true,
    bounced BOOLEAN DEFAULT false,
    bounced_at TIMESTAMP,
    bounce_count INTEGER DEFAULT 0,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_email_sent TIMESTAMP,

    CONSTRAINT chk_partner_email_format CHECK (email_format IN ('html', 'text')),
    CONSTRAINT chk_partner_email_frequency CHECK (email_frequency IN ('instant', 'daily_digest', 'weekly_digest')),
    CONSTRAINT uq_partner_email UNIQUE(partner_id, email)
);

CREATE INDEX idx_partner_emails_partner ON partner_emails(partner_id);
CREATE INDEX idx_partner_emails_email ON partner_emails(email);
CREATE INDEX idx_partner_emails_active ON partner_emails(is_active);

COMMENT ON TABLE partner_emails IS 'Emails de partners con preferencias de notificaciones';
COMMENT ON COLUMN partner_emails.receive_service_requests IS 'Recibir notificaciones de nuevas solicitudes';
COMMENT ON COLUMN partner_emails.receive_commission_alerts IS 'Recibir alertas de comisiones ganadas';

-- ============================================================================
-- TABLA: vendor_emails (Vendedores de Aponnt)
-- Propósito: Emails del equipo de ventas de Aponnt
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendor_emails (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE, -- Usuario vendedor

    -- Email del vendedor
    email VARCHAR(255) NOT NULL UNIQUE,
    is_primary BOOLEAN DEFAULT true,

    -- Verificación
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    verified_at TIMESTAMP,

    -- Preferencias de notificaciones
    receive_lead_notifications BOOLEAN DEFAULT true,    -- Nuevos leads
    receive_contract_signed BOOLEAN DEFAULT true,       -- Contratos firmados
    receive_payment_alerts BOOLEAN DEFAULT true,        -- Pagos de clientes
    receive_renewal_reminders BOOLEAN DEFAULT true,     -- Recordatorios de renovación
    receive_trial_expiry BOOLEAN DEFAULT true,          -- Trials por expirar
    receive_sales_reports BOOLEAN DEFAULT true,         -- Reportes de ventas

    -- Formato de emails
    email_format VARCHAR(20) DEFAULT 'html',
    email_frequency VARCHAR(20) DEFAULT 'instant',

    -- Estado
    is_active BOOLEAN DEFAULT true,
    bounced BOOLEAN DEFAULT false,
    bounced_at TIMESTAMP,
    bounce_count INTEGER DEFAULT 0,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_email_sent TIMESTAMP,

    CONSTRAINT chk_vendor_email_format CHECK (email_format IN ('html', 'text')),
    CONSTRAINT chk_vendor_email_frequency CHECK (email_frequency IN ('instant', 'daily_digest', 'weekly_digest'))
);

CREATE INDEX idx_vendor_emails_user ON vendor_emails(user_id);
CREATE INDEX idx_vendor_emails_email ON vendor_emails(email);
CREATE INDEX idx_vendor_emails_active ON vendor_emails(is_active);

COMMENT ON TABLE vendor_emails IS 'Emails del equipo de ventas de Aponnt';

-- ============================================================================
-- TABLA: support_emails
-- Propósito: Emails del equipo de soporte técnico
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_emails (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE, -- Usuario soporte

    -- Email del agente de soporte
    email VARCHAR(255) NOT NULL UNIQUE,
    is_primary BOOLEAN DEFAULT true,

    -- Verificación
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    verified_at TIMESTAMP,

    -- Preferencias de notificaciones
    receive_ticket_assignments BOOLEAN DEFAULT true,    -- Tickets asignados
    receive_ticket_updates BOOLEAN DEFAULT true,        -- Actualizaciones de tickets
    receive_priority_alerts BOOLEAN DEFAULT true,       -- Tickets de alta prioridad
    receive_escalation_alerts BOOLEAN DEFAULT true,     -- Escalaciones
    receive_sla_warnings BOOLEAN DEFAULT true,          -- Avisos de SLA
    receive_customer_feedback BOOLEAN DEFAULT true,     -- Feedback de clientes

    -- Formato de emails
    email_format VARCHAR(20) DEFAULT 'html',
    email_frequency VARCHAR(20) DEFAULT 'instant',

    -- Estado
    is_active BOOLEAN DEFAULT true,
    bounced BOOLEAN DEFAULT false,
    bounced_at TIMESTAMP,
    bounce_count INTEGER DEFAULT 0,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_email_sent TIMESTAMP,

    CONSTRAINT chk_support_email_format CHECK (email_format IN ('html', 'text')),
    CONSTRAINT chk_support_email_frequency CHECK (email_frequency IN ('instant', 'daily_digest', 'weekly_digest'))
);

CREATE INDEX idx_support_emails_user ON support_emails(user_id);
CREATE INDEX idx_support_emails_email ON support_emails(email);
CREATE INDEX idx_support_emails_active ON support_emails(is_active);

COMMENT ON TABLE support_emails IS 'Emails del equipo de soporte técnico';

-- ============================================================================
-- EXTENDER: email_logs para incluir nuevos sender_type
-- ============================================================================

-- Modificar constraint de sender_type para incluir nuevos tipos
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS chk_sender_type;
ALTER TABLE email_logs ADD CONSTRAINT chk_sender_type
    CHECK (sender_type IN ('aponnt', 'company', 'employee', 'partner', 'vendor', 'support'));

COMMENT ON COLUMN email_logs.sender_type IS 'Tipo de remitente: aponnt, company, employee, partner, vendor, support';

-- ============================================================================
-- TRIGGERS: Sincronización automática para partners
-- ============================================================================

-- Trigger 1: Sincronizar email de partners
CREATE OR REPLACE FUNCTION sync_partner_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Si se actualiza el email en partners, sincronizar con partner_emails
    IF TG_OP = 'UPDATE' AND OLD.email IS DISTINCT FROM NEW.email THEN
        -- Marcar el email anterior como inactivo
        UPDATE partner_emails
        SET is_active = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE partner_id = NEW.id AND email = OLD.email;

        -- Insertar o activar el nuevo email
        INSERT INTO partner_emails (partner_id, email, is_primary, is_active)
        VALUES (NEW.id, NEW.email, true, true)
        ON CONFLICT (partner_id, email)
        DO UPDATE SET
            is_active = true,
            is_primary = true,
            updated_at = CURRENT_TIMESTAMP;
    END IF;

    -- Si es un nuevo partner, crear registro en partner_emails
    IF TG_OP = 'INSERT' AND NEW.email IS NOT NULL THEN
        INSERT INTO partner_emails (partner_id, email, is_primary, is_active)
        VALUES (NEW.id, NEW.email, true, true)
        ON CONFLICT (partner_id, email) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_partner_email ON partners;
CREATE TRIGGER trigger_sync_partner_email
    AFTER INSERT OR UPDATE ON partners
    FOR EACH ROW
    EXECUTE FUNCTION sync_partner_email();

-- Trigger 2: Actualizar updated_at en partner_emails
CREATE OR REPLACE FUNCTION update_partner_email_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_partner_email_timestamp ON partner_emails;
CREATE TRIGGER trigger_update_partner_email_timestamp
    BEFORE UPDATE ON partner_emails
    FOR EACH ROW
    EXECUTE FUNCTION update_partner_email_timestamp();

-- ============================================================================
-- FUNCIONES HELPER
-- ============================================================================

-- Función: Enviar email a partner con respeto de preferencias
CREATE OR REPLACE FUNCTION should_send_email_to_partner(
    p_partner_id INTEGER,
    p_notification_type VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_partner_email RECORD;
BEGIN
    SELECT * INTO v_partner_email
    FROM partner_emails
    WHERE partner_id = p_partner_id
    AND is_active = true
    AND is_primary = true
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Verificar preferencia según tipo de notificación
    CASE p_notification_type
        WHEN 'service_request' THEN RETURN v_partner_email.receive_service_requests;
        WHEN 'commission' THEN RETURN v_partner_email.receive_commission_alerts;
        WHEN 'payment' THEN RETURN v_partner_email.receive_payment_notifications;
        WHEN 'review' THEN RETURN v_partner_email.receive_review_notifications;
        WHEN 'support_ticket' THEN RETURN v_partner_email.receive_support_tickets;
        WHEN 'mediation' THEN RETURN v_partner_email.receive_mediation_alerts;
        WHEN 'document' THEN RETURN v_partner_email.receive_document_reminders;
        WHEN 'marketing' THEN RETURN v_partner_email.receive_marketing_emails;
        ELSE RETURN true;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener emails de todos los partners activos
CREATE OR REPLACE FUNCTION get_active_partner_emails()
RETURNS TABLE (
    partner_id INTEGER,
    email VARCHAR,
    partner_name VARCHAR,
    is_verified BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id as partner_id,
        pe.email,
        CONCAT(p.first_name, ' ', p.last_name) as partner_name,
        pe.is_verified
    FROM partners p
    JOIN partner_emails pe ON p.id = pe.partner_id
    WHERE p.status = 'active'
    AND pe.is_active = true
    AND pe.is_primary = true
    ORDER BY p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener emails de vendedores activos
CREATE OR REPLACE FUNCTION get_active_vendor_emails()
RETURNS TABLE (
    user_id UUID,
    email VARCHAR,
    vendor_name VARCHAR,
    is_verified BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.user_id,
        ve.email,
        CONCAT(u."firstName", ' ', u."lastName") as vendor_name,
        ve.is_verified
    FROM users u
    JOIN vendor_emails ve ON u.user_id = ve.user_id
    WHERE u.role = 'vendor'
    AND u.is_active = true
    AND ve.is_active = true
    ORDER BY u."firstName", u."lastName";
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener emails de equipo de soporte
CREATE OR REPLACE FUNCTION get_active_support_emails()
RETURNS TABLE (
    user_id UUID,
    email VARCHAR,
    support_name VARCHAR,
    is_verified BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.user_id,
        se.email,
        CONCAT(u."firstName", ' ', u."lastName") as support_name,
        se.is_verified
    FROM users u
    JOIN support_emails se ON u.user_id = se.user_id
    WHERE u.role = 'support'
    AND u.is_active = true
    AND se.is_active = true
    ORDER BY u."firstName", u."lastName";
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VISTAS
-- ============================================================================

-- Vista: Resumen de emails por tipo de usuario
CREATE OR REPLACE VIEW v_email_summary_by_type AS
SELECT
    'company' as user_type,
    COUNT(DISTINCT ec.company_id) as total_users,
    COUNT(*) as total_email_configs,
    SUM(CASE WHEN ec.is_verified THEN 1 ELSE 0 END) as verified_configs,
    SUM(ec.current_daily_count) as total_emails_today
FROM email_configurations ec
WHERE ec.is_active = true

UNION ALL

SELECT
    'employee' as user_type,
    COUNT(DISTINCT ue.user_id) as total_users,
    COUNT(*) as total_email_configs,
    SUM(CASE WHEN ue.is_verified THEN 1 ELSE 0 END) as verified_configs,
    NULL as total_emails_today
FROM user_emails ue
WHERE ue.is_active = true

UNION ALL

SELECT
    'partner' as user_type,
    COUNT(DISTINCT pe.partner_id) as total_users,
    COUNT(*) as total_email_configs,
    SUM(CASE WHEN pe.is_verified THEN 1 ELSE 0 END) as verified_configs,
    NULL as total_emails_today
FROM partner_emails pe
WHERE pe.is_active = true

UNION ALL

SELECT
    'vendor' as user_type,
    COUNT(DISTINCT ve.user_id) as total_users,
    COUNT(*) as total_email_configs,
    SUM(CASE WHEN ve.is_verified THEN 1 ELSE 0 END) as verified_configs,
    NULL as total_emails_today
FROM vendor_emails ve
WHERE ve.is_active = true

UNION ALL

SELECT
    'support' as user_type,
    COUNT(DISTINCT se.user_id) as total_users,
    COUNT(*) as total_email_configs,
    SUM(CASE WHEN se.is_verified THEN 1 ELSE 0 END) as verified_configs,
    NULL as total_emails_today
FROM support_emails se
WHERE se.is_active = true;

-- Vista: Estadísticas de emails por tipo de sender
CREATE OR REPLACE VIEW v_email_logs_by_sender_type AS
SELECT
    sender_type,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE status = 'sent') as sent_success,
    COUNT(*) FILTER (WHERE status = 'failed') as sent_failed,
    COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
    COUNT(*) FILTER (WHERE status = 'opened') as opened,
    ROUND((COUNT(*) FILTER (WHERE status = 'sent')::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as success_rate,
    ROUND((COUNT(*) FILTER (WHERE status = 'opened')::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE status = 'sent'), 0)) * 100, 2) as open_rate
FROM email_logs
GROUP BY sender_type;

-- ============================================================================
-- DATOS INICIALES: Templates por defecto para partners y vendors
-- ============================================================================

INSERT INTO email_templates (company_id, template_key, template_name, description, subject, body_html, category, is_default)
VALUES
    -- Template para partners
    (NULL, 'partner_service_request', 'Nueva Solicitud de Servicio', 'Notifica a un partner de una nueva solicitud',
     'Nueva Solicitud de Servicio - {{company_name}}',
     '<h2>Nueva Solicitud de Servicio</h2>
      <p>Hola {{partner_name}},</p>
      <p>Tienes una nueva solicitud de servicio de <strong>{{company_name}}</strong>:</p>
      <ul>
        <li><strong>Tipo:</strong> {{service_type}}</li>
        <li><strong>Prioridad:</strong> {{priority}}</li>
        <li><strong>Fecha:</strong> {{request_date}}</li>
      </ul>
      <p>Por favor, responde a la solicitud lo antes posible.</p>
      <p><a href="{{service_url}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Solicitud</a></p>',
     'partner', true),

    -- Template para vendors
    (NULL, 'vendor_lead_notification', 'Nuevo Lead Asignado', 'Notifica a un vendedor de un nuevo lead',
     'Nuevo Lead Asignado - {{lead_company}}',
     '<h2>Nuevo Lead Asignado</h2>
      <p>Hola {{vendor_name}},</p>
      <p>Se te ha asignado un nuevo lead:</p>
      <ul>
        <li><strong>Empresa:</strong> {{lead_company}}</li>
        <li><strong>Contacto:</strong> {{lead_contact_name}}</li>
        <li><strong>Email:</strong> {{lead_email}}</li>
        <li><strong>Teléfono:</strong> {{lead_phone}}</li>
        <li><strong>Interés:</strong> {{interest_level}}</li>
      </ul>
      <p>Realiza el seguimiento lo antes posible.</p>
      <p><a href="{{lead_url}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Lead</a></p>',
     'vendor', true),

    -- Template para soporte
    (NULL, 'support_ticket_assigned', 'Ticket Asignado', 'Notifica a un agente de soporte de un ticket asignado',
     'Ticket #{{ticket_id}} Asignado - {{company_name}}',
     '<h2>Nuevo Ticket Asignado</h2>
      <p>Hola {{support_name}},</p>
      <p>Se te ha asignado el ticket #{{ticket_id}}:</p>
      <ul>
        <li><strong>Empresa:</strong> {{company_name}}</li>
        <li><strong>Prioridad:</strong> {{priority}}</li>
        <li><strong>Asunto:</strong> {{ticket_subject}}</li>
        <li><strong>SLA:</strong> {{sla_deadline}}</li>
      </ul>
      <p>Por favor, atiende este ticket de acuerdo al SLA establecido.</p>
      <p><a href="{{ticket_url}}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Ticket</a></p>',
     'support', true)
ON CONFLICT (company_id, template_key) DO NOTHING;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE partner_emails IS 'Emails de partners/asociados con preferencias de notificaciones';
COMMENT ON TABLE vendor_emails IS 'Emails del equipo de ventas de Aponnt';
COMMENT ON TABLE support_emails IS 'Emails del equipo de soporte técnico';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de Emails extendido para Partners, Vendedores y Soporte';
    RAISE NOTICE '📧 5 Capas completas: Aponnt → Partners → Vendedores → Empresa → Empleados';
    RAISE NOTICE '🔄 Sincronización automática habilitada para partners';
    RAISE NOTICE '📊 Vistas y estadísticas disponibles';
    RAISE NOTICE '📝 Templates por defecto creados';
END $$;
