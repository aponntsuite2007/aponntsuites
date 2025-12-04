-- =====================================================
-- OH-V6-8: AUTOMATED CERTIFICATION ALERTS - DATABASE SCHEMA
-- =====================================================
-- Sistema completo de gestión de certificaciones de empleados
-- con alertas automáticas de vencimiento
--
-- FEATURES:
-- - Multi-tenant (filtrado por company_id)
-- - Alertas automáticas configurables (días antes de vencimiento)
-- - Tipos de certificación parametrizables
-- - Tracking de alertas enviadas
-- - Historial de renovaciones
-- - Document storage
-- - Status lifecycle (active, expiring_soon, expired, revoked)
-- =====================================================

-- ============================================
-- TABLE 1: oh_certification_types
-- ============================================
-- Catálogo de tipos de certificación
CREATE TABLE IF NOT EXISTS oh_certification_types (
    id SERIAL PRIMARY KEY,
    type_code VARCHAR(100) NOT NULL UNIQUE,
    name_i18n JSONB NOT NULL DEFAULT '{}',
    description_i18n JSONB DEFAULT '{}',
    category VARCHAR(50) NOT NULL, -- safety, medical, professional, technical, compliance

    -- Configuración de alertas
    default_alert_days INTEGER DEFAULT 30, -- Días antes de vencimiento para alertar
    is_mandatory BOOLEAN DEFAULT false, -- ¿Es obligatoria esta certificación?
    requires_renewal BOOLEAN DEFAULT true,

    -- Validez estándar
    standard_validity_months INTEGER DEFAULT 12, -- Meses de validez típica

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cert_types_category ON oh_certification_types(category);
CREATE INDEX idx_cert_types_active ON oh_certification_types(is_active);

-- ============================================
-- TABLE 2: oh_employee_certifications
-- ============================================
-- Certificaciones de empleados
CREATE TABLE IF NOT EXISTS oh_employee_certifications (
    id SERIAL PRIMARY KEY,

    -- Multi-tenant
    company_id INTEGER NOT NULL,

    -- Empleado
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(200),
    employee_email VARCHAR(200),
    department VARCHAR(100),

    -- Certificación
    certification_type_id INTEGER NOT NULL REFERENCES oh_certification_types(id),
    certification_number VARCHAR(200),

    -- Fechas
    issue_date DATE NOT NULL,
    expiration_date DATE NOT NULL,

    -- Alertas
    alert_days_before INTEGER DEFAULT 30, -- Días antes de vencer para generar alerta
    last_alert_sent_at TIMESTAMP WITH TIME ZONE,
    alert_count INTEGER DEFAULT 0,

    -- Estado
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, expiring_soon, expired, revoked, renewed

    -- Emisor
    issuing_authority VARCHAR(200),
    issuing_country VARCHAR(10),

    -- Documento
    document_path TEXT,
    document_filename VARCHAR(500),
    document_size BIGINT,
    document_type VARCHAR(100),

    -- Renovación
    renewed_by_certification_id INTEGER REFERENCES oh_employee_certifications(id),
    is_renewal_of_certification_id INTEGER REFERENCES oh_employee_certifications(id),

    -- Notas
    notes TEXT,

    -- Auditoría
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_by VARCHAR(100),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Foreign Keys
    CONSTRAINT fk_cert_company FOREIGN KEY (company_id)
        REFERENCES companies(company_id) ON DELETE CASCADE
);

-- Indexes para performance y búsquedas
CREATE INDEX idx_emp_cert_company ON oh_employee_certifications(company_id);
CREATE INDEX idx_emp_cert_employee ON oh_employee_certifications(employee_id);
CREATE INDEX idx_emp_cert_expiration ON oh_employee_certifications(expiration_date);
CREATE INDEX idx_emp_cert_status ON oh_employee_certifications(status);
CREATE INDEX idx_emp_cert_type ON oh_employee_certifications(certification_type_id);
CREATE INDEX idx_emp_cert_active ON oh_employee_certifications(deleted_at) WHERE deleted_at IS NULL;

-- Index compuesto para alertas (query principal del cron job)
CREATE INDEX idx_emp_cert_alerts ON oh_employee_certifications(company_id, status, expiration_date, deleted_at)
WHERE deleted_at IS NULL AND status IN ('active', 'expiring_soon');

-- ============================================
-- TABLE 3: oh_certification_alerts
-- ============================================
-- Historial de alertas enviadas
CREATE TABLE IF NOT EXISTS oh_certification_alerts (
    id SERIAL PRIMARY KEY,

    -- Relación con certificación
    certification_id INTEGER NOT NULL REFERENCES oh_employee_certifications(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL,
    employee_id VARCHAR(50) NOT NULL,

    -- Tipo de alerta
    alert_type VARCHAR(50) NOT NULL, -- expiring_soon, expired, reminder
    days_until_expiration INTEGER NOT NULL,

    -- Envío
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_to VARCHAR(500) NOT NULL, -- Email(s) destinatarios
    sent_via VARCHAR(50) DEFAULT 'email', -- email, sms, notification

    -- Estado
    status VARCHAR(50) DEFAULT 'sent', -- sent, delivered, failed, bounced

    -- Contenido
    subject TEXT,
    message_body TEXT,

    -- Respuesta del sistema de envío
    send_response JSONB,
    error_message TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cert_alerts_certification ON oh_certification_alerts(certification_id);
CREATE INDEX idx_cert_alerts_company ON oh_certification_alerts(company_id);
CREATE INDEX idx_cert_alerts_employee ON oh_certification_alerts(employee_id);
CREATE INDEX idx_cert_alerts_sent_at ON oh_certification_alerts(sent_at);
CREATE INDEX idx_cert_alerts_type ON oh_certification_alerts(alert_type);

-- ============================================
-- TABLE 4: oh_certification_alert_config
-- ============================================
-- Configuración de alertas por empresa
CREATE TABLE IF NOT EXISTS oh_certification_alert_config (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL UNIQUE,

    -- Configuración de días de alerta (JSON array)
    alert_days_schedule INTEGER[] DEFAULT '{30, 15, 7, 1}', -- Alertar 30, 15, 7 y 1 días antes

    -- Habilitación
    alerts_enabled BOOLEAN DEFAULT true,

    -- Destinatarios
    default_recipients TEXT[], -- Emails adicionales que siempre reciben alertas
    notify_employee BOOLEAN DEFAULT true, -- ¿Notificar al empleado?
    notify_supervisor BOOLEAN DEFAULT true, -- ¿Notificar al supervisor?
    notify_hr BOOLEAN DEFAULT true, -- ¿Notificar a RRHH?

    -- Email de RRHH
    hr_email VARCHAR(200),

    -- Horario de envío
    send_time TIME DEFAULT '09:00:00', -- Hora del día para enviar alertas
    timezone VARCHAR(50) DEFAULT 'America/Buenos_Aires',

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_by VARCHAR(100),

    CONSTRAINT fk_alert_config_company FOREIGN KEY (company_id)
        REFERENCES companies(company_id) ON DELETE CASCADE
);

CREATE INDEX idx_alert_config_company ON oh_certification_alert_config(company_id);
CREATE INDEX idx_alert_config_enabled ON oh_certification_alert_config(alerts_enabled);

-- ============================================
-- FUNCTION 1: get_certifications_requiring_alert()
-- ============================================
-- Función que retorna certificaciones que requieren alerta HOY
-- Usado por el cron job diario
CREATE OR REPLACE FUNCTION get_certifications_requiring_alert()
RETURNS TABLE (
    cert_id INTEGER,
    company_id INTEGER,
    employee_id VARCHAR,
    employee_name VARCHAR,
    employee_email VARCHAR,
    certification_type_code VARCHAR,
    certification_type_name JSONB,
    expiration_date DATE,
    days_until_expiration INTEGER,
    alert_days_before INTEGER,
    last_alert_sent_at TIMESTAMP WITH TIME ZONE,
    config_alerts_enabled BOOLEAN,
    config_alert_days_schedule INTEGER[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ec.id AS cert_id,
        ec.company_id,
        ec.employee_id,
        ec.employee_name,
        ec.employee_email,
        ct.type_code AS certification_type_code,
        ct.name_i18n AS certification_type_name,
        ec.expiration_date,
        (ec.expiration_date - CURRENT_DATE) AS days_until_expiration,
        ec.alert_days_before,
        ec.last_alert_sent_at,
        COALESCE(cfg.alerts_enabled, true) AS config_alerts_enabled,
        COALESCE(cfg.alert_days_schedule, ARRAY[30, 15, 7, 1]) AS config_alert_days_schedule
    FROM oh_employee_certifications ec
    INNER JOIN oh_certification_types ct ON ec.certification_type_id = ct.id
    LEFT JOIN oh_certification_alert_config cfg ON ec.company_id = cfg.company_id
    WHERE
        ec.deleted_at IS NULL
        AND ec.status IN ('active', 'expiring_soon')
        AND ec.expiration_date >= CURRENT_DATE
        AND COALESCE(cfg.alerts_enabled, true) = true
        AND (
            -- Alerta debe enviarse hoy según configuración
            (ec.expiration_date - CURRENT_DATE) = ANY(COALESCE(cfg.alert_days_schedule, ARRAY[30, 15, 7, 1]))
            OR
            -- O nunca se ha enviado alerta y ya está dentro del período
            (ec.last_alert_sent_at IS NULL AND (ec.expiration_date - CURRENT_DATE) <= ec.alert_days_before)
        )
    ORDER BY ec.company_id, ec.expiration_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION 2: update_certification_status()
-- ============================================
-- Actualiza el status de certificaciones según fecha de expiración
-- Usado por cron job para marcar como 'expiring_soon' o 'expired'
CREATE OR REPLACE FUNCTION update_certification_status()
RETURNS TABLE (
    updated_count INTEGER,
    expired_count INTEGER,
    expiring_soon_count INTEGER
) AS $$
DECLARE
    v_updated_count INTEGER := 0;
    v_expired_count INTEGER := 0;
    v_expiring_soon_count INTEGER := 0;
BEGIN
    -- Marcar como EXPIRED (vencidas)
    UPDATE oh_employee_certifications
    SET
        status = 'expired',
        last_updated_at = NOW()
    WHERE
        deleted_at IS NULL
        AND status != 'expired'
        AND expiration_date < CURRENT_DATE;

    GET DIAGNOSTICS v_expired_count = ROW_COUNT;

    -- Marcar como EXPIRING_SOON (próximas a vencer)
    UPDATE oh_employee_certifications
    SET
        status = 'expiring_soon',
        last_updated_at = NOW()
    WHERE
        deleted_at IS NULL
        AND status = 'active'
        AND expiration_date >= CURRENT_DATE
        AND (expiration_date - CURRENT_DATE) <= alert_days_before;

    GET DIAGNOSTICS v_expiring_soon_count = ROW_COUNT;

    v_updated_count := v_expired_count + v_expiring_soon_count;

    RETURN QUERY SELECT v_updated_count, v_expired_count, v_expiring_soon_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION 3: get_company_certification_stats()
-- ============================================
-- Estadísticas de certificaciones por empresa
CREATE OR REPLACE FUNCTION get_company_certification_stats(p_company_id INTEGER)
RETURNS TABLE (
    total_certifications INTEGER,
    active_certifications INTEGER,
    expiring_soon_certifications INTEGER,
    expired_certifications INTEGER,
    renewed_certifications INTEGER,
    employees_with_certifications INTEGER,
    certification_types_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER AS total_certifications,
        COUNT(*) FILTER (WHERE status = 'active')::INTEGER AS active_certifications,
        COUNT(*) FILTER (WHERE status = 'expiring_soon')::INTEGER AS expiring_soon_certifications,
        COUNT(*) FILTER (WHERE status = 'expired')::INTEGER AS expired_certifications,
        COUNT(*) FILTER (WHERE status = 'renewed')::INTEGER AS renewed_certifications,
        COUNT(DISTINCT employee_id)::INTEGER AS employees_with_certifications,
        COUNT(DISTINCT certification_type_id)::INTEGER AS certification_types_count
    FROM oh_employee_certifications
    WHERE company_id = p_company_id
      AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DATA: oh_certification_types
-- ============================================
-- Tipos comunes de certificaciones (seguridad, médicas, profesionales)

INSERT INTO oh_certification_types (type_code, name_i18n, description_i18n, category, default_alert_days, is_mandatory, standard_validity_months) VALUES

-- === SAFETY CERTIFICATIONS ===
('SAFETY_OSHA_10',
 '{"en": "OSHA 10-Hour", "es": "OSHA 10 Horas"}'::jsonb,
 '{"en": "OSHA 10-hour safety training", "es": "Capacitación de seguridad OSHA 10 horas"}'::jsonb,
 'safety', 60, true, 60),

('SAFETY_OSHA_30',
 '{"en": "OSHA 30-Hour", "es": "OSHA 30 Horas"}'::jsonb,
 '{"en": "OSHA 30-hour safety training", "es": "Capacitación de seguridad OSHA 30 horas"}'::jsonb,
 'safety', 60, true, 60),

('SAFETY_FIRST_AID',
 '{"en": "First Aid & CPR", "es": "Primeros Auxilios y RCP"}'::jsonb,
 '{"en": "First aid and CPR certification", "es": "Certificación de primeros auxilios y RCP"}'::jsonb,
 'safety', 30, true, 24),

('SAFETY_FIRE_EXTINGUISHER',
 '{"en": "Fire Extinguisher Training", "es": "Entrenamiento en Extintor de Incendios"}'::jsonb,
 '{"en": "Fire extinguisher use training", "es": "Capacitación uso de extintores"}'::jsonb,
 'safety', 30, true, 12),

('SAFETY_CONFINED_SPACE',
 '{"en": "Confined Space Entry", "es": "Entrada a Espacios Confinados"}'::jsonb,
 '{"en": "Confined space entry certification", "es": "Certificación para espacios confinados"}'::jsonb,
 'safety', 45, true, 12),

('SAFETY_FALL_PROTECTION',
 '{"en": "Fall Protection", "es": "Protección contra Caídas"}'::jsonb,
 '{"en": "Fall protection and harness use", "es": "Protección contra caídas y uso de arnés"}'::jsonb,
 'safety', 45, true, 12),

('SAFETY_LOCKOUT_TAGOUT',
 '{"en": "Lockout/Tagout (LOTO)", "es": "Bloqueo/Etiquetado (LOTO)"}'::jsonb,
 '{"en": "Lockout/tagout procedures", "es": "Procedimientos de bloqueo/etiquetado"}'::jsonb,
 'safety', 30, true, 12),

('SAFETY_FORKLIFT',
 '{"en": "Forklift Operator", "es": "Operador de Montacargas"}'::jsonb,
 '{"en": "Forklift operation certification", "es": "Certificación de operación de montacargas"}'::jsonb,
 'safety', 30, true, 36),

-- === MEDICAL CERTIFICATIONS ===
('MEDICAL_PHYSICAL_EXAM',
 '{"en": "Annual Physical Exam", "es": "Examen Físico Anual"}'::jsonb,
 '{"en": "Annual physical examination", "es": "Examen físico anual"}'::jsonb,
 'medical', 30, true, 12),

('MEDICAL_DOT_PHYSICAL',
 '{"en": "DOT Physical (CDL)", "es": "Examen Físico DOT (CDL)"}'::jsonb,
 '{"en": "Department of Transportation physical for commercial drivers", "es": "Examen físico DOT para conductores comerciales"}'::jsonb,
 'medical', 45, true, 24),

('MEDICAL_RESPIRATORY_FIT',
 '{"en": "Respirator Fit Test", "es": "Prueba de Ajuste Respirador"}'::jsonb,
 '{"en": "Annual respirator fit testing", "es": "Prueba anual de ajuste de respirador"}'::jsonb,
 'medical', 30, true, 12),

('MEDICAL_HEARING_TEST',
 '{"en": "Hearing Test (Audiometry)", "es": "Examen Auditivo (Audiometría)"}'::jsonb,
 '{"en": "Annual hearing test", "es": "Examen auditivo anual"}'::jsonb,
 'medical', 30, true, 12),

('MEDICAL_VISION_TEST',
 '{"en": "Vision Screening", "es": "Examen de Visión"}'::jsonb,
 '{"en": "Vision screening for safety-sensitive positions", "es": "Examen de visión para puestos sensibles"}'::jsonb,
 'medical', 30, true, 24),

('MEDICAL_DRUG_TEST',
 '{"en": "Drug & Alcohol Screening", "es": "Prueba de Drogas y Alcohol"}'::jsonb,
 '{"en": "Random drug and alcohol screening", "es": "Prueba aleatoria de drogas y alcohol"}'::jsonb,
 'medical', 15, false, 12),

-- === PROFESSIONAL CERTIFICATIONS ===
('PROF_DRIVER_LICENSE',
 '{"en": "Driver License", "es": "Licencia de Conducir"}'::jsonb,
 '{"en": "Valid driver license", "es": "Licencia de conducir válida"}'::jsonb,
 'professional', 60, true, 48),

('PROF_CDL_CLASS_A',
 '{"en": "CDL Class A", "es": "CDL Clase A"}'::jsonb,
 '{"en": "Commercial driver license Class A", "es": "Licencia comercial Clase A"}'::jsonb,
 'professional', 60, true, 60),

('PROF_ELECTRICIAN',
 '{"en": "Licensed Electrician", "es": "Electricista Matriculado"}'::jsonb,
 '{"en": "State licensed electrician", "es": "Electricista matriculado estatal"}'::jsonb,
 'professional', 90, true, 60),

('PROF_PLUMBER',
 '{"en": "Licensed Plumber", "es": "Plomero Matriculado"}'::jsonb,
 '{"en": "State licensed plumber", "es": "Plomero matriculado estatal"}'::jsonb,
 'professional', 90, true, 60),

-- === TECHNICAL CERTIFICATIONS ===
('TECH_WELDING',
 '{"en": "Welding Certification", "es": "Certificación de Soldadura"}'::jsonb,
 '{"en": "AWS welding certification", "es": "Certificación AWS de soldadura"}'::jsonb,
 'technical', 60, false, 36),

('TECH_CRANE_OPERATOR',
 '{"en": "Crane Operator", "es": "Operador de Grúa"}'::jsonb,
 '{"en": "Certified crane operator", "es": "Operador certificado de grúa"}'::jsonb,
 'technical', 60, true, 60),

('TECH_SCAFFOLDING',
 '{"en": "Scaffolding Erector", "es": "Montador de Andamios"}'::jsonb,
 '{"en": "Scaffolding erection certification", "es": "Certificación montaje de andamios"}'::jsonb,
 'technical', 45, true, 36),

-- === COMPLIANCE CERTIFICATIONS ===
('COMP_FOOD_HANDLER',
 '{"en": "Food Handler Certificate", "es": "Certificado Manipulador de Alimentos"}'::jsonb,
 '{"en": "Food safety and handling", "es": "Seguridad y manipulación de alimentos"}'::jsonb,
 'compliance', 30, true, 24),

('COMP_HAZMAT',
 '{"en": "HAZMAT Handling", "es": "Manejo de Materiales Peligrosos"}'::jsonb,
 '{"en": "Hazardous materials handling", "es": "Manejo de materiales peligrosos"}'::jsonb,
 'compliance', 45, true, 36),

('COMP_WORKPLACE_HARASSMENT',
 '{"en": "Sexual Harassment Training", "es": "Capacitación Acoso Laboral"}'::jsonb,
 '{"en": "Workplace harassment prevention", "es": "Prevención de acoso laboral"}'::jsonb,
 'compliance', 30, true, 12);

-- ============================================
-- COMENTARIOS FINALES
-- ============================================
--
-- MIGRATION COMPLETADA: oh_certification_types, oh_employee_certifications,
--                       oh_certification_alerts, oh_certification_alert_config
--
-- FUNCTIONS CREADAS:
-- - get_certifications_requiring_alert() → Usado por cron job
-- - update_certification_status() → Actualiza status automáticamente
-- - get_company_certification_stats() → Stats para dashboard
--
-- SEED DATA: 26 tipos de certificaciones comunes
--
-- PRÓXIMO PASO: OH-V6-9 - Implementar Cron Job que:
--   1. Ejecuta update_certification_status() diariamente
--   2. Ejecuta get_certifications_requiring_alert()
--   3. Envía emails a empleados/supervisores/RRHH
--   4. Registra alertas en oh_certification_alerts
--
-- ============================================
