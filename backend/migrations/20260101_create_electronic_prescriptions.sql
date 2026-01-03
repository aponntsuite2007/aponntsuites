-- Electronic Prescriptions Module - Database Migration
-- Sistema de Recetas Electrónicas Multi-País
-- Versión: 1.0.0
-- Fecha: 2026-01-01

-- Crear tabla principal
CREATE TABLE IF NOT EXISTS electronic_prescriptions (
    id SERIAL PRIMARY KEY,

    -- Relaciones
    employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    doctor_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    medical_case_id INTEGER REFERENCES medical_cases(id) ON DELETE SET NULL,

    -- Información del medicamento
    medication_name VARCHAR(255) NOT NULL,
    medication_type VARCHAR(20) DEFAULT 'generic' CHECK (medication_type IN ('brand', 'generic')),
    active_ingredient VARCHAR(255),
    dosage VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    duration_days INTEGER NOT NULL,
    instructions TEXT,

    -- Clasificación
    is_controlled BOOLEAN DEFAULT FALSE,
    control_level VARCHAR(20) DEFAULT 'none' CHECK (control_level IN ('none', 'level_1', 'level_2', 'level_3', 'level_4', 'level_5')),

    -- Normativa por país
    country VARCHAR(2) NOT NULL,
    regulation VARCHAR(255),

    -- Número de receta
    prescription_number VARCHAR(255) UNIQUE NOT NULL,

    -- Firma digital
    digital_signature TEXT,
    signature_type VARCHAR(50) DEFAULT 'none' CHECK (signature_type IN ('afip', 'icp_brasil', 'fiel_mexico', 'dea_usa', 'none')),
    signature_timestamp TIMESTAMP,

    -- QR Code y Barcode
    qr_code TEXT,
    barcode VARCHAR(255),

    -- Validez
    valid_from TIMESTAMP NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMP NOT NULL,

    -- Estado
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'dispensed', 'expired', 'cancelled')),

    -- Específicos por país
    anmat_registration VARCHAR(255),
    anvisa_registration VARCHAR(255),
    notification_b BOOLEAN DEFAULT FALSE,
    cofepris_registration VARCHAR(255),
    dea_number VARCHAR(255),

    -- Farmacia
    pharmacy_id INTEGER,
    dispensed_at TIMESTAMP,
    dispensed_by VARCHAR(255),

    -- Metadata
    pdf_url VARCHAR(500),
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_epresc_employee ON electronic_prescriptions(employee_id);
CREATE INDEX idx_epresc_doctor ON electronic_prescriptions(doctor_id);
CREATE INDEX idx_epresc_company ON electronic_prescriptions(company_id);
CREATE INDEX idx_epresc_status ON electronic_prescriptions(status);
CREATE INDEX idx_epresc_country ON electronic_prescriptions(country);
CREATE INDEX idx_epresc_valid_until ON electronic_prescriptions(valid_until);
CREATE INDEX idx_epresc_controlled ON electronic_prescriptions(is_controlled);
CREATE INDEX idx_epresc_created_at ON electronic_prescriptions(created_at);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_electronic_prescriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_electronic_prescriptions_updated_at
    BEFORE UPDATE ON electronic_prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_electronic_prescriptions_updated_at();

-- Función para auto-expirar recetas vencidas
CREATE OR REPLACE FUNCTION auto_expire_prescriptions()
RETURNS void AS $$
BEGIN
    UPDATE electronic_prescriptions
    SET status = 'expired'
    WHERE status IN ('pending', 'signed')
      AND valid_until < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE electronic_prescriptions IS 'Recetas electrónicas con normativas multi-país (AR, BR, MX, US)';
COMMENT ON COLUMN electronic_prescriptions.prescription_number IS 'Número único de receta según formato país';
COMMENT ON COLUMN electronic_prescriptions.digital_signature IS 'Hash de firma digital (AFIP/ICP-Brasil/FIEL/DEA)';
COMMENT ON COLUMN electronic_prescriptions.qr_code IS 'QR Code en formato data URL (base64)';
COMMENT ON COLUMN electronic_prescriptions.control_level IS 'Nivel de control según país (Lista I-V ARG, Portaria 344 BR, DEA Schedule USA)';
COMMENT ON COLUMN electronic_prescriptions.anmat_registration IS 'Registro ANMAT Argentina para medicamentos controlados';
COMMENT ON COLUMN electronic_prescriptions.anvisa_registration IS 'Registro ANVISA Brasil';
COMMENT ON COLUMN electronic_prescriptions.notification_b IS 'Requiere Notificação de Receita B (Brasil Portaria 344)';
COMMENT ON COLUMN electronic_prescriptions.cofepris_registration IS 'Registro COFEPRIS México';
COMMENT ON COLUMN electronic_prescriptions.dea_number IS 'DEA number del médico (USA controlled substances)';

-- Datos iniciales (ejemplo para testing)
-- NOTA: En producción, estos datos se crean via API

-- Función helper para generar número de receta según país
CREATE OR REPLACE FUNCTION generate_prescription_number(p_country VARCHAR(2), p_company_id INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    v_count INTEGER;
    v_prefix VARCHAR(10);
    v_number VARCHAR(255);
BEGIN
    -- Contar recetas de la empresa en el país
    SELECT COUNT(*) INTO v_count
    FROM electronic_prescriptions
    WHERE country = p_country AND company_id = p_company_id;

    -- Prefijo según país
    CASE p_country
        WHEN 'AR' THEN v_prefix := 'AR-EP-';
        WHEN 'BR' THEN v_prefix := 'BR-RX-';
        WHEN 'MX' THEN v_prefix := 'MX-PR-';
        WHEN 'US' THEN v_prefix := 'US-EP-';
        ELSE v_prefix := 'XX-EP-';
    END CASE;

    -- Número: PREFIX-COMPANYID-SEQUENCE-YEAR
    v_number := v_prefix || p_company_id || '-' || LPAD((v_count + 1)::TEXT, 6, '0') || '-' || EXTRACT(YEAR FROM NOW());

    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_prescription_number IS 'Genera número único de receta según formato de cada país';

-- Vista helper: Recetas activas
CREATE OR REPLACE VIEW active_prescriptions AS
SELECT
    ep.*,
    u.full_name as employee_name,
    p.name as doctor_name,
    c.name as company_name
FROM electronic_prescriptions ep
JOIN users u ON ep.employee_id = u.id
JOIN partners p ON ep.doctor_id = p.id
JOIN companies c ON ep.company_id = c.id
WHERE ep.status IN ('pending', 'signed')
  AND ep.valid_until >= NOW();

COMMENT ON VIEW active_prescriptions IS 'Recetas activas (pendientes o firmadas, no vencidas)';

-- Vista: Recetas por vencer (próximos 7 días)
CREATE OR REPLACE VIEW expiring_soon_prescriptions AS
SELECT
    ep.*,
    u.full_name as employee_name,
    p.name as doctor_name,
    EXTRACT(DAY FROM (ep.valid_until - NOW())) as days_until_expiry
FROM electronic_prescriptions ep
JOIN users u ON ep.employee_id = u.id
JOIN partners p ON ep.doctor_id = p.id
WHERE ep.status IN ('pending', 'signed')
  AND ep.valid_until BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY ep.valid_until;

COMMENT ON VIEW expiring_soon_prescriptions IS 'Recetas que vencen en los próximos 7 días';

-- Función para obtener estadísticas de recetas por empresa
CREATE OR REPLACE FUNCTION get_prescription_stats(p_company_id INTEGER)
RETURNS TABLE (
    total_prescriptions BIGINT,
    active_prescriptions BIGINT,
    dispensed_prescriptions BIGINT,
    expired_prescriptions BIGINT,
    controlled_substances BIGINT,
    by_country JSONB,
    by_status JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_prescriptions,
        COUNT(*) FILTER (WHERE status IN ('pending', 'signed'))::BIGINT as active_prescriptions,
        COUNT(*) FILTER (WHERE status = 'dispensed')::BIGINT as dispensed_prescriptions,
        COUNT(*) FILTER (WHERE status = 'expired')::BIGINT as expired_prescriptions,
        COUNT(*) FILTER (WHERE is_controlled = TRUE)::BIGINT as controlled_substances,

        -- Agrupar por país
        (SELECT jsonb_object_agg(country, count)
         FROM (
             SELECT country, COUNT(*)::INTEGER as count
             FROM electronic_prescriptions
             WHERE company_id = p_company_id
             GROUP BY country
         ) sub1) as by_country,

        -- Agrupar por estado
        (SELECT jsonb_object_agg(status, count)
         FROM (
             SELECT status, COUNT(*)::INTEGER as count
             FROM electronic_prescriptions
             WHERE company_id = p_company_id
             GROUP BY status
         ) sub2) as by_status
    FROM electronic_prescriptions
    WHERE company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_prescription_stats IS 'Estadísticas de recetas electrónicas por empresa';

-- Job para auto-expirar recetas (ejecutar diariamente via cron o pg_cron)
-- Ejemplo con pg_cron (si está instalado):
-- SELECT cron.schedule('auto-expire-prescriptions', '0 0 * * *', $$SELECT auto_expire_prescriptions()$$);
