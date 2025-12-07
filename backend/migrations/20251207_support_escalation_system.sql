-- ============================================================================
-- MIGRACIÓN: Sistema de Soporte con Escalamiento Jerárquico
-- ============================================================================
-- Configura el sistema de soporte con 3 niveles de escalamiento:
-- 1. Soporte asignado a empresa (por defecto el vendedor)
-- 2. Coordinador de Soporte (aponntcoordinacionsoporte@gmail.com)
-- 3. Email Institucional Aponnt (aponntsuite@gmail.com)
--
-- Fecha: 2024-12-07
-- ============================================================================

-- 1. Modificar CHECK constraint para permitir más tipos de email
-- ============================================================================
ALTER TABLE aponnt_email_config DROP CONSTRAINT IF EXISTS chk_aponnt_config_type;
ALTER TABLE aponnt_email_config ADD CONSTRAINT chk_aponnt_config_type
    CHECK (config_type IN ('transactional', 'marketing', 'support', 'billing', 'institutional', 'support_coordinator'));

-- 2. Actualizar emails existentes con los correos reales de Gmail
-- ============================================================================
-- Email de soporte principal (nivel 1 - soporte asignado usa su propio email)
UPDATE aponnt_email_config
SET
    from_email = 'aponntsuite@gmail.com',
    from_name = 'Aponnt Soporte',
    smtp_host = 'smtp.gmail.com',
    smtp_port = 587,
    smtp_user = 'aponntsuite@gmail.com',
    smtp_password = 'YOUR_APP_PASSWORD_HERE',  -- Necesitarás generar una contraseña de aplicación en Gmail
    smtp_secure = false,  -- Puerto 587 usa STARTTLS, no SSL directo
    updated_at = NOW()
WHERE config_type = 'support';

-- Email transaccional
UPDATE aponnt_email_config
SET
    from_email = 'aponntsuite@gmail.com',
    from_name = 'Aponnt Sistema',
    smtp_host = 'smtp.gmail.com',
    smtp_port = 587,
    smtp_user = 'aponntsuite@gmail.com',
    smtp_password = 'YOUR_APP_PASSWORD_HERE',
    smtp_secure = false,
    updated_at = NOW()
WHERE config_type = 'transactional';

-- 3. Insertar email institucional (nivel más alto de escalamiento)
-- ============================================================================
INSERT INTO aponnt_email_config (config_type, from_email, from_name, reply_to, smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure)
VALUES (
    'institutional',
    'aponntsuite@gmail.com',
    'Aponnt Suite - Dirección',
    'aponntsuite@gmail.com',
    'smtp.gmail.com',
    587,
    'aponntsuite@gmail.com',
    'YOUR_APP_PASSWORD_HERE',
    false
)
ON CONFLICT (config_type) DO UPDATE SET
    from_email = EXCLUDED.from_email,
    from_name = EXCLUDED.from_name,
    reply_to = EXCLUDED.reply_to,
    smtp_host = EXCLUDED.smtp_host,
    smtp_port = EXCLUDED.smtp_port,
    smtp_user = EXCLUDED.smtp_user,
    smtp_password = EXCLUDED.smtp_password,
    smtp_secure = EXCLUDED.smtp_secure,
    updated_at = NOW();

-- 4. Insertar email del coordinador de soporte (nivel 2 de escalamiento)
-- ============================================================================
INSERT INTO aponnt_email_config (config_type, from_email, from_name, reply_to, smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure)
VALUES (
    'support_coordinator',
    'aponntcoordinacionsoporte@gmail.com',
    'Aponnt - Coordinación de Soporte',
    'aponntcoordinacionsoporte@gmail.com',
    'smtp.gmail.com',
    587,
    'aponntcoordinacionsoporte@gmail.com',
    'YOUR_APP_PASSWORD_HERE',
    false
)
ON CONFLICT (config_type) DO UPDATE SET
    from_email = EXCLUDED.from_email,
    from_name = EXCLUDED.from_name,
    reply_to = EXCLUDED.reply_to,
    smtp_host = EXCLUDED.smtp_host,
    smtp_port = EXCLUDED.smtp_port,
    smtp_user = EXCLUDED.smtp_user,
    smtp_password = EXCLUDED.smtp_password,
    smtp_secure = EXCLUDED.smtp_secure,
    updated_at = NOW();

-- 5. Crear roles de soporte si no existen
-- ============================================================================
INSERT INTO aponnt_staff_roles (role_code, role_name, role_area, level, description, reports_to_role_code)
VALUES
    ('SUP', 'Soporte Técnico', 'soporte', 4, 'Soporte técnico de primera línea asignado a empresas', 'CSUP'),
    ('CSUP', 'Coordinador de Soporte', 'soporte', 2, 'Coordinador de equipo de soporte - segundo nivel de escalamiento', 'GA'),
    ('DIR', 'Director General', 'direccion', 0, 'Dirección General de Aponnt - último nivel de escalamiento', NULL)
ON CONFLICT (role_code) DO UPDATE SET
    role_name = EXCLUDED.role_name,
    role_area = EXCLUDED.role_area,
    level = EXCLUDED.level,
    description = EXCLUDED.description,
    reports_to_role_code = EXCLUDED.reports_to_role_code,
    updated_at = NOW();

-- 6. Crear el staff del Director General (email institucional)
-- ============================================================================
INSERT INTO aponnt_staff (
    first_name, last_name, email, phone, role_id, country, level, area, is_active
)
SELECT
    'Dirección', 'General', 'aponntsuite@gmail.com', NULL,
    r.role_id, 'AR', 0, 'direccion', true
FROM aponnt_staff_roles r
WHERE r.role_code = 'DIR'
ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role_id = EXCLUDED.role_id,
    level = EXCLUDED.level,
    area = EXCLUDED.area,
    updated_at = NOW();

-- 7. Crear el staff del Coordinador de Soporte
-- ============================================================================
INSERT INTO aponnt_staff (
    first_name, last_name, email, phone, role_id, reports_to_staff_id, country, level, area, is_active
)
SELECT
    'Coordinación', 'Soporte', 'aponntcoordinacionsoporte@gmail.com', NULL,
    r.role_id,
    (SELECT staff_id FROM aponnt_staff WHERE email = 'aponntsuite@gmail.com'),
    'AR', 2, 'soporte', true
FROM aponnt_staff_roles r
WHERE r.role_code = 'CSUP'
ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role_id = EXCLUDED.role_id,
    reports_to_staff_id = (SELECT staff_id FROM aponnt_staff WHERE email = 'aponntsuite@gmail.com'),
    level = EXCLUDED.level,
    area = EXCLUDED.area,
    updated_at = NOW();

-- 8. Crear el staff de soporte para ISI (Pablo Rivas Jordan)
-- ============================================================================
INSERT INTO aponnt_staff (
    first_name, last_name, email, phone, role_id, reports_to_staff_id, country, level, area, is_active
)
SELECT
    'Pablo', 'Rivas Jordan', 'pablorivasjordan52@gmail.com', NULL,
    r.role_id,
    (SELECT staff_id FROM aponnt_staff WHERE email = 'aponntcoordinacionsoporte@gmail.com'),
    'AR', 4, 'soporte', true
FROM aponnt_staff_roles r
WHERE r.role_code = 'SUP'
ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role_id = EXCLUDED.role_id,
    reports_to_staff_id = (SELECT staff_id FROM aponnt_staff WHERE email = 'aponntcoordinacionsoporte@gmail.com'),
    level = EXCLUDED.level,
    area = EXCLUDED.area,
    updated_at = NOW();

-- 9. Asignar Pablo Rivas Jordan como soporte de empresa ISI (company_id = 11)
-- ============================================================================
INSERT INTO aponnt_staff_companies (staff_id, company_id, assignment_note, is_active)
SELECT
    s.staff_id, 11, 'Soporte técnico asignado a ISI', true
FROM aponnt_staff s
WHERE s.email = 'pablorivasjordan52@gmail.com'
ON CONFLICT (staff_id, company_id) DO UPDATE SET
    assignment_note = EXCLUDED.assignment_note,
    is_active = true,
    updated_at = NOW();

-- 10. Crear tabla de configuración de SLA para soporte si no existe
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_sla_config (
    id SERIAL PRIMARY KEY,
    priority VARCHAR(20) NOT NULL,
    response_time_hours INTEGER NOT NULL,  -- Tiempo máximo para primera respuesta
    resolution_time_hours INTEGER NOT NULL, -- Tiempo máximo para resolución
    escalation_time_hours INTEGER NOT NULL, -- Tiempo para escalar si no hay respuesta
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_priority UNIQUE (priority)
);

-- Insertar configuración de SLA por prioridad
INSERT INTO support_sla_config (priority, response_time_hours, resolution_time_hours, escalation_time_hours)
VALUES
    ('critical', 1, 4, 2),     -- Crítico: 1h respuesta, 4h resolución, escala a las 2h
    ('high', 4, 24, 8),        -- Alta: 4h respuesta, 24h resolución, escala a las 8h
    ('medium', 8, 48, 24),     -- Media: 8h respuesta, 48h resolución, escala a las 24h
    ('low', 24, 72, 48)        -- Baja: 24h respuesta, 72h resolución, escala a las 48h
ON CONFLICT (priority) DO UPDATE SET
    response_time_hours = EXCLUDED.response_time_hours,
    resolution_time_hours = EXCLUDED.resolution_time_hours,
    escalation_time_hours = EXCLUDED.escalation_time_hours,
    updated_at = NOW();

-- 11. Agregar columnas de escalamiento a support_tickets si no existen
-- ============================================================================
DO $$
BEGIN
    -- Nivel de escalamiento actual
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'support_tickets' AND column_name = 'escalation_level') THEN
        ALTER TABLE support_tickets ADD COLUMN escalation_level INTEGER DEFAULT 1;
        COMMENT ON COLUMN support_tickets.escalation_level IS '1=Soporte asignado, 2=Coordinador, 3=Dirección';
    END IF;

    -- Staff asignado actualmente
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'support_tickets' AND column_name = 'assigned_staff_id') THEN
        ALTER TABLE support_tickets ADD COLUMN assigned_staff_id UUID REFERENCES aponnt_staff(staff_id);
    END IF;

    -- Fecha de última escalación
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'support_tickets' AND column_name = 'escalated_at') THEN
        ALTER TABLE support_tickets ADD COLUMN escalated_at TIMESTAMPTZ;
    END IF;

    -- Motivo de escalación
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'support_tickets' AND column_name = 'escalation_reason') THEN
        ALTER TABLE support_tickets ADD COLUMN escalation_reason TEXT;
    END IF;

    -- Fecha de SLA breach
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'support_tickets' AND column_name = 'sla_breach_at') THEN
        ALTER TABLE support_tickets ADD COLUMN sla_breach_at TIMESTAMPTZ;
    END IF;
END $$;

-- 12. Crear tabla de historial de escalamiento
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_ticket_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id),
    from_level INTEGER NOT NULL,
    to_level INTEGER NOT NULL,
    from_staff_id UUID REFERENCES aponnt_staff(staff_id),
    to_staff_id UUID REFERENCES aponnt_staff(staff_id),
    escalation_type VARCHAR(20) NOT NULL, -- 'automatic' o 'voluntary'
    reason TEXT,
    escalated_by UUID, -- NULL si es automático
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalations_ticket ON support_ticket_escalations(ticket_id);
CREATE INDEX IF NOT EXISTS idx_escalations_created ON support_ticket_escalations(created_at DESC);

-- 13. Función para obtener el soporte asignado a una empresa
-- ============================================================================
CREATE OR REPLACE FUNCTION get_company_support_staff(p_company_id INTEGER)
RETURNS TABLE (
    staff_id UUID,
    staff_name TEXT,
    email VARCHAR(255),
    level INTEGER,
    role_code VARCHAR(10)
) AS $$
BEGIN
    -- Primero buscar staff de soporte asignado específicamente
    RETURN QUERY
    SELECT
        s.staff_id,
        (s.first_name || ' ' || s.last_name)::TEXT as staff_name,
        s.email,
        s.level,
        r.role_code
    FROM aponnt_staff s
    JOIN aponnt_staff_roles r ON s.role_id = r.role_id
    JOIN aponnt_staff_companies sc ON s.staff_id = sc.staff_id
    WHERE sc.company_id = p_company_id
      AND sc.is_active = true
      AND s.is_active = true
      AND r.role_area = 'soporte'
    ORDER BY s.level ASC
    LIMIT 1;

    -- Si no hay soporte específico, buscar el vendedor asignado
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            s.staff_id,
            (s.first_name || ' ' || s.last_name)::TEXT as staff_name,
            s.email,
            s.level,
            r.role_code
        FROM companies c
        JOIN aponnt_staff s ON c.vendor_id = s.staff_id
        JOIN aponnt_staff_roles r ON s.role_id = r.role_id
        WHERE c.company_id = p_company_id
          AND s.is_active = true
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 14. Función para obtener la cadena de escalamiento
-- ============================================================================
CREATE OR REPLACE FUNCTION get_escalation_chain(p_current_level INTEGER DEFAULT 1)
RETURNS TABLE (
    staff_id UUID,
    staff_name TEXT,
    email VARCHAR(255),
    escalation_level INTEGER,
    role_code VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.staff_id,
        (s.first_name || ' ' || s.last_name)::TEXT as staff_name,
        s.email,
        CASE
            WHEN r.role_code = 'CSUP' THEN 2
            WHEN r.role_code = 'DIR' THEN 3
            ELSE 1
        END as escalation_level,
        r.role_code
    FROM aponnt_staff s
    JOIN aponnt_staff_roles r ON s.role_id = r.role_id
    WHERE r.role_code IN ('CSUP', 'DIR')
      AND s.is_active = true
      AND CASE
            WHEN r.role_code = 'CSUP' THEN 2
            WHEN r.role_code = 'DIR' THEN 3
          END > p_current_level
    ORDER BY escalation_level ASC;
END;
$$ LANGUAGE plpgsql;

-- 15. Comentarios
-- ============================================================================
COMMENT ON TABLE support_sla_config IS 'Configuración de SLA por prioridad de ticket';
COMMENT ON TABLE support_ticket_escalations IS 'Historial de escalamientos de tickets';
COMMENT ON FUNCTION get_company_support_staff IS 'Obtiene el staff de soporte asignado a una empresa';
COMMENT ON FUNCTION get_escalation_chain IS 'Obtiene la cadena de escalamiento desde un nivel dado';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
