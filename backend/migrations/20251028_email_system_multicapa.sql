-- ============================================================================
-- SISTEMA DE EMAILS MULTICAPA - ARQUITECTURA PROFESIONAL
-- ============================================================================
-- Autor: Sistema Biométrico
-- Fecha: 2025-10-28
-- Descripción: Sistema de emails con 3 capas (Aponnt, Empresa, Empleados)
--              con validación, verificación y sincronización automática
-- ============================================================================

-- ============================================================================
-- TABLA: email_configurations
-- Propósito: Configuraciones SMTP para cada empresa cliente
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_configurations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Identificación del email institucional
    institutional_email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL, -- Ej: "ISI - Sistema de Asistencia"

    -- Configuración SMTP (REQUERIDA para crear empresa)
    smtp_host VARCHAR(255) NOT NULL, -- Ej: smtp.gmail.com
    smtp_port INTEGER NOT NULL, -- Ej: 587
    smtp_user VARCHAR(255) NOT NULL, -- Usuario SMTP
    smtp_password TEXT NOT NULL, -- Encriptado en aplicación
    smtp_secure BOOLEAN DEFAULT false, -- true = SSL/TLS, false = STARTTLS

    -- Estado de verificación
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    verified_at TIMESTAMP,
    last_verification_attempt TIMESTAMP,
    verification_attempts INTEGER DEFAULT 0,

    -- Límites y cuotas
    daily_limit INTEGER DEFAULT 500, -- Emails por día
    monthly_limit INTEGER DEFAULT 10000,
    current_daily_count INTEGER DEFAULT 0,
    current_monthly_count INTEGER DEFAULT 0,
    last_reset_daily TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_reset_monthly TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Configuración avanzada
    from_name VARCHAR(255), -- Nombre personalizado
    reply_to VARCHAR(255), -- Email de respuesta
    cc_copy VARCHAR(255), -- Copia a admin empresa
    bcc_copy VARCHAR(255), -- Copia oculta

    -- Templates
    use_company_templates BOOLEAN DEFAULT true,
    signature TEXT, -- Firma HTML para emails

    -- Estado operativo
    is_active BOOLEAN DEFAULT true,
    suspended BOOLEAN DEFAULT false,
    suspended_reason TEXT,
    suspended_at TIMESTAMP,

    -- Logs de errores
    last_error TEXT,
    last_error_at TIMESTAMP,
    error_count INTEGER DEFAULT 0,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    updated_by UUID REFERENCES users(user_id),

    -- Constraints
    CONSTRAINT chk_smtp_port CHECK (smtp_port BETWEEN 1 AND 65535),
    CONSTRAINT chk_limits CHECK (daily_limit > 0 AND monthly_limit > 0)
);

CREATE INDEX IF NOT EXISTS idx_email_config_company ON email_configurations(company_id);
CREATE INDEX IF NOT EXISTS idx_email_config_email ON email_configurations(institutional_email);
CREATE INDEX IF NOT EXISTS idx_email_config_active ON email_configurations(is_active, is_verified);

-- ============================================================================
-- TABLA: user_emails
-- Propósito: Emails de empleados con sincronización automática
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_emails (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Email del empleado
    email VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT true,

    -- Verificación
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    verified_at TIMESTAMP,

    -- Preferencias de notificaciones
    receive_system_notifications BOOLEAN DEFAULT true,
    receive_attendance_alerts BOOLEAN DEFAULT true,
    receive_vacation_updates BOOLEAN DEFAULT true,
    receive_medical_notifications BOOLEAN DEFAULT true,
    receive_legal_notices BOOLEAN DEFAULT true,
    receive_shifts_changes BOOLEAN DEFAULT true,
    receive_payroll_notifications BOOLEAN DEFAULT true,

    -- Formato de emails
    email_format VARCHAR(20) DEFAULT 'html', -- html, text
    email_frequency VARCHAR(20) DEFAULT 'instant', -- instant, daily_digest, weekly_digest

    -- Estado
    is_active BOOLEAN DEFAULT true,
    bounced BOOLEAN DEFAULT false, -- Email rebotado
    bounced_at TIMESTAMP,
    bounce_count INTEGER DEFAULT 0,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_email_sent TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_email_format CHECK (email_format IN ('html', 'text')),
    CONSTRAINT chk_email_frequency CHECK (email_frequency IN ('instant', 'daily_digest', 'weekly_digest')),
    CONSTRAINT uq_user_email UNIQUE(user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_user_emails_user ON user_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_user_emails_company ON user_emails(company_id);
CREATE INDEX IF NOT EXISTS idx_user_emails_email ON user_emails(email);
CREATE INDEX IF NOT EXISTS idx_user_emails_verified ON user_emails(is_verified);
CREATE INDEX IF NOT EXISTS idx_user_emails_active ON user_emails(is_active);

-- ============================================================================
-- TABLA: email_logs
-- Propósito: Log completo de TODOS los emails enviados
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,

    -- Origen
    sender_type VARCHAR(50) NOT NULL, -- 'aponnt', 'company', 'employee'
    sender_id VARCHAR(255), -- company_id o user_id según tipo
    email_config_id INTEGER REFERENCES email_configurations(id),

    -- Destinatario
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    recipient_type VARCHAR(50), -- 'company', 'employee', 'external'
    recipient_id VARCHAR(255),

    -- Email
    subject TEXT NOT NULL,
    body_html TEXT,
    body_text TEXT,

    -- Metadata
    notification_id INTEGER, -- Si viene del sistema de notificaciones
    template_id INTEGER, -- Si usa template
    category VARCHAR(100), -- 'welcome', 'alert', 'notification', 'invoice', etc.
    priority VARCHAR(20) DEFAULT 'normal', -- 'high', 'normal', 'low'

    -- Adjuntos
    has_attachments BOOLEAN DEFAULT false,
    attachments JSONB, -- [{name, size, type, path}]

    -- Estado de envío
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced', 'opened', 'clicked'
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    bounced_at TIMESTAMP,

    -- Tracking
    message_id VARCHAR(255), -- ID del proveedor SMTP
    tracking_id UUID DEFAULT gen_random_uuid(),

    -- Errores
    error_message TEXT,
    error_code VARCHAR(50),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_sender_type CHECK (sender_type IN ('aponnt', 'company', 'employee')),
    CONSTRAINT chk_email_status CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked')),
    CONSTRAINT chk_priority CHECK (priority IN ('high', 'normal', 'low'))
);

CREATE INDEX IF NOT EXISTS idx_email_logs_sender ON email_logs(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_category ON email_logs(category);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_tracking ON email_logs(tracking_id);

-- ============================================================================
-- TABLA: email_templates
-- Propósito: Templates reutilizables por empresa
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Identificación
    template_key VARCHAR(100) NOT NULL, -- 'welcome_employee', 'late_arrival_alert', etc.
    template_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Contenido
    subject VARCHAR(500) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,

    -- Variables disponibles
    available_variables JSONB, -- {user_name, company_name, date, etc.}

    -- Categoría
    category VARCHAR(100), -- 'attendance', 'vacation', 'medical', 'payroll', etc.

    -- Estado
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- Template por defecto del sistema

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),

    CONSTRAINT uq_template_key UNIQUE(company_id, template_key)
);

CREATE INDEX IF NOT EXISTS idx_email_templates_company ON email_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);

-- ============================================================================
-- TABLA: aponnt_email_config
-- Propósito: Configuración de emails de APONNT (plataforma)
-- ============================================================================
CREATE TABLE IF NOT EXISTS aponnt_email_config (
    id SERIAL PRIMARY KEY,

    -- Tipo de email de Aponnt
    config_type VARCHAR(50) NOT NULL UNIQUE, -- 'transactional', 'marketing', 'support', 'billing'

    -- Email institucional de Aponnt
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255) NOT NULL,
    reply_to VARCHAR(255),

    -- Configuración SMTP
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER NOT NULL,
    smtp_user VARCHAR(255) NOT NULL,
    smtp_password TEXT NOT NULL,
    smtp_secure BOOLEAN DEFAULT true,

    -- Estado
    is_active BOOLEAN DEFAULT true,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_aponnt_config_type CHECK (config_type IN ('transactional', 'marketing', 'support', 'billing'))
);

-- Configuración por defecto de Aponnt
INSERT INTO aponnt_email_config (config_type, from_email, from_name, smtp_host, smtp_port, smtp_user, smtp_password)
VALUES
    ('transactional', 'noreply@aponnt.com', 'Aponnt - Sistema Biométrico', 'smtp.gmail.com', 587, 'noreply@aponnt.com', 'CHANGE_ME'),
    ('support', 'soporte@aponnt.com', 'Aponnt - Soporte Técnico', 'smtp.gmail.com', 587, 'soporte@aponnt.com', 'CHANGE_ME'),
    ('billing', 'facturacion@aponnt.com', 'Aponnt - Facturación', 'smtp.gmail.com', 587, 'facturacion@aponnt.com', 'CHANGE_ME')
ON CONFLICT (config_type) DO NOTHING;

-- ============================================================================
-- TRIGGERS: Sincronización automática
-- ============================================================================

-- Trigger 1: Sincronizar email de users con user_emails
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Si se actualiza el email en users, sincronizar con user_emails
    IF TG_OP = 'UPDATE' AND OLD.email IS DISTINCT FROM NEW.email THEN
        -- Marcar el email anterior como inactivo
        UPDATE user_emails
        SET is_active = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id AND email = OLD.email;

        -- Insertar o activar el nuevo email
        INSERT INTO user_emails (user_id, company_id, email, is_primary, is_active)
        VALUES (NEW.user_id, NEW.company_id, NEW.email, true, true)
        ON CONFLICT (user_id, email)
        DO UPDATE SET
            is_active = true,
            is_primary = true,
            updated_at = CURRENT_TIMESTAMP;
    END IF;

    -- Si es un nuevo usuario, crear registro en user_emails
    IF TG_OP = 'INSERT' AND NEW.email IS NOT NULL THEN
        INSERT INTO user_emails (user_id, company_id, email, is_primary, is_active)
        VALUES (NEW.user_id, NEW.company_id, NEW.email, true, true)
        ON CONFLICT (user_id, email) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_user_email ON users;
CREATE TRIGGER trigger_sync_user_email
    AFTER INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_email();

-- Trigger 2: Validar configuración SMTP antes de insertar
CREATE OR REPLACE FUNCTION validate_email_config()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar que todos los campos SMTP estén completos
    IF NEW.smtp_host IS NULL OR NEW.smtp_host = '' THEN
        RAISE EXCEPTION 'SMTP Host es obligatorio para configurar el email institucional';
    END IF;

    IF NEW.smtp_port IS NULL THEN
        RAISE EXCEPTION 'SMTP Port es obligatorio';
    END IF;

    IF NEW.smtp_user IS NULL OR NEW.smtp_user = '' THEN
        RAISE EXCEPTION 'SMTP User es obligatorio';
    END IF;

    IF NEW.smtp_password IS NULL OR NEW.smtp_password = '' THEN
        RAISE EXCEPTION 'SMTP Password es obligatoria';
    END IF;

    IF NEW.institutional_email IS NULL OR NEW.institutional_email = '' THEN
        RAISE EXCEPTION 'Email institucional es obligatorio';
    END IF;

    -- Validar formato de email
    IF NEW.institutional_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Formato de email institucional inválido';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_email_config ON email_configurations;
CREATE TRIGGER trigger_validate_email_config
    BEFORE INSERT OR UPDATE ON email_configurations
    FOR EACH ROW
    EXECUTE FUNCTION validate_email_config();

-- Trigger 3: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_email_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_email_config_timestamp ON email_configurations;
CREATE TRIGGER trigger_update_email_config_timestamp
    BEFORE UPDATE ON email_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_email_timestamp();

DROP TRIGGER IF EXISTS trigger_update_user_emails_timestamp ON user_emails;
CREATE TRIGGER trigger_update_user_emails_timestamp
    BEFORE UPDATE ON user_emails
    FOR EACH ROW
    EXECUTE FUNCTION update_email_timestamp();

-- Trigger 4: Reset de contadores diarios/mensuales
CREATE OR REPLACE FUNCTION reset_email_counters()
RETURNS TRIGGER AS $$
BEGIN
    -- Reset contador diario
    IF NEW.last_reset_daily < CURRENT_DATE THEN
        NEW.current_daily_count = 0;
        NEW.last_reset_daily = CURRENT_TIMESTAMP;
    END IF;

    -- Reset contador mensual
    IF EXTRACT(MONTH FROM NEW.last_reset_monthly) < EXTRACT(MONTH FROM CURRENT_TIMESTAMP)
       OR EXTRACT(YEAR FROM NEW.last_reset_monthly) < EXTRACT(YEAR FROM CURRENT_TIMESTAMP) THEN
        NEW.current_monthly_count = 0;
        NEW.last_reset_monthly = CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reset_email_counters ON email_configurations;
CREATE TRIGGER trigger_reset_email_counters
    BEFORE UPDATE ON email_configurations
    FOR EACH ROW
    EXECUTE FUNCTION reset_email_counters();

-- ============================================================================
-- FUNCIONES HELPER
-- ============================================================================

-- Función: Verificar si una empresa tiene email configurado
CREATE OR REPLACE FUNCTION company_has_email_configured(p_company_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM email_configurations
        WHERE company_id = p_company_id
        AND is_active = true
        AND is_verified = true
    );
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener configuración de email de una empresa
CREATE OR REPLACE FUNCTION get_company_email_config(p_company_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    institutional_email VARCHAR,
    smtp_host VARCHAR,
    smtp_port INTEGER,
    smtp_user VARCHAR,
    is_verified BOOLEAN,
    daily_limit INTEGER,
    current_daily_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ec.id,
        ec.institutional_email,
        ec.smtp_host,
        ec.smtp_port,
        ec.smtp_user,
        ec.is_verified,
        ec.daily_limit,
        ec.current_daily_count
    FROM email_configurations ec
    WHERE ec.company_id = p_company_id
    AND ec.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener emails de empleados de una empresa
CREATE OR REPLACE FUNCTION get_company_employee_emails(p_company_id INTEGER)
RETURNS TABLE (
    user_id UUID,
    email VARCHAR,
    is_verified BOOLEAN,
    receive_notifications BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ue.user_id,
        ue.email,
        ue.is_verified,
        ue.receive_system_notifications
    FROM user_emails ue
    WHERE ue.company_id = p_company_id
    AND ue.is_active = true
    AND ue.is_primary = true
    ORDER BY ue.email;
END;
$$ LANGUAGE plpgsql;

-- Función: Incrementar contador de emails enviados
CREATE OR REPLACE FUNCTION increment_email_counter(p_company_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE email_configurations
    SET
        current_daily_count = current_daily_count + 1,
        current_monthly_count = current_monthly_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;

-- Función: Verificar límites de envío
CREATE OR REPLACE FUNCTION check_email_limits(p_company_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_config RECORD;
BEGIN
    SELECT
        daily_limit,
        monthly_limit,
        current_daily_count,
        current_monthly_count
    INTO v_config
    FROM email_configurations
    WHERE company_id = p_company_id
    AND is_active = true;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Verificar límites
    IF v_config.current_daily_count >= v_config.daily_limit THEN
        RETURN false;
    END IF;

    IF v_config.current_monthly_count >= v_config.monthly_limit THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VISTAS
-- ============================================================================

-- Vista: Resumen de configuraciones de email por empresa
CREATE OR REPLACE VIEW v_email_configurations_summary AS
SELECT
    c.company_id as company_id,
    c.name as company_name,
    ec.institutional_email,
    ec.is_verified,
    ec.is_active,
    ec.current_daily_count,
    ec.daily_limit,
    ec.current_monthly_count,
    ec.monthly_limit,
    ec.last_error,
    ec.error_count,
    (SELECT COUNT(*) FROM user_emails ue WHERE ue.company_id = c.company_id AND ue.is_active = true) as total_employee_emails,
    (SELECT COUNT(*) FROM email_logs el WHERE el.sender_id::INTEGER = c.company_id AND el.sender_type = 'company' AND el.created_at >= CURRENT_DATE) as emails_sent_today
FROM companies c
LEFT JOIN email_configurations ec ON c.company_id = ec.company_id AND ec.is_active = true;

-- Vista: Estadísticas de emails por empresa
CREATE OR REPLACE VIEW v_email_stats_by_company AS
SELECT
    company_id,
    company_name,
    total_sent,
    total_delivered,
    total_bounced,
    total_opened,
    ROUND((total_delivered::DECIMAL / NULLIF(total_sent, 0)) * 100, 2) as delivery_rate,
    ROUND((total_opened::DECIMAL / NULLIF(total_delivered, 0)) * 100, 2) as open_rate
FROM (
    SELECT
        c.company_id as company_id,
        c.name as company_name,
        COUNT(*) FILTER (WHERE el.status IN ('sent', 'delivered', 'opened')) as total_sent,
        COUNT(*) FILTER (WHERE el.status IN ('delivered', 'opened')) as total_delivered,
        COUNT(*) FILTER (WHERE el.status = 'bounced') as total_bounced,
        COUNT(*) FILTER (WHERE el.status = 'opened') as total_opened
    FROM companies c
    LEFT JOIN email_logs el ON el.sender_id::INTEGER = c.company_id AND el.sender_type = 'company'
    GROUP BY c.company_id, c.name
) stats;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE email_configurations IS 'Configuraciones SMTP por empresa - REQUERIDA para crear empresa';
COMMENT ON TABLE user_emails IS 'Emails de empleados con sincronización automática desde tabla users';
COMMENT ON TABLE email_logs IS 'Log completo de todos los emails enviados en el sistema';
COMMENT ON TABLE email_templates IS 'Templates HTML reutilizables por empresa';
COMMENT ON TABLE aponnt_email_config IS 'Configuraciones de email de la plataforma Aponnt';

COMMENT ON COLUMN email_configurations.institutional_email IS 'Email institucional de la empresa - ÚNICO en todo el sistema';
COMMENT ON COLUMN email_configurations.is_verified IS 'Email verificado mediante test de envío SMTP';
COMMENT ON COLUMN user_emails.email IS 'Email del empleado - se sincroniza automáticamente con users.email';
COMMENT ON COLUMN email_logs.tracking_id IS 'UUID único para tracking de apertura/clicks';

-- ============================================================================
-- PERMISOS
-- ============================================================================

-- Solo superadmins pueden modificar configuración de Aponnt
-- Admins de empresa pueden modificar su email_configuration
-- Empleados pueden ver/editar sus preferencias en user_emails

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

-- Mensaje de éxito
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de Emails Multicapa creado exitosamente';
    RAISE NOTICE '📧 3 Capas: Aponnt → Empresa → Empleados';
    RAISE NOTICE '🔐 Validación SMTP obligatoria para crear empresas';
    RAISE NOTICE '🔄 Sincronización automática de emails de empleados';
    RAISE NOTICE '📊 Logs completos y estadísticas disponibles';
END $$;
