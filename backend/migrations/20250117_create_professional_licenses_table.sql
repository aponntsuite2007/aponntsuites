-- ============================================================================
-- MIGRACIÓN: TAB 2 - Licencias Profesionales
-- Fecha: 2025-01-17
-- Descripción: Crea tabla para licencias profesionales (médicos, abogados, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_professional_licenses (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Información de la licencia
    license_name VARCHAR(255) NOT NULL, -- ej: "Matrícula Médica", "Matrícula de Abogado"
    profession VARCHAR(255), -- ej: "Médico", "Abogado", "Contador", "Arquitecto"
    license_number VARCHAR(100),

    -- Emisión
    issuing_body VARCHAR(255), -- ej: "Colegio Médico de Buenos Aires", "Colegio de Abogados"
    issuing_country VARCHAR(100) DEFAULT 'Argentina',
    jurisdiction VARCHAR(255), -- ej: "Buenos Aires", "Nacional", "Córdoba"

    -- Fechas
    issue_date DATE,
    expiry_date DATE, -- 🔔 VENCIMIENTO - Sistema de alertas (algunas profesiones requieren renovación)

    -- Documentación
    certificate_url TEXT, -- URL del certificado escaneado
    verification_url TEXT, -- URL para verificar online (ej: web del colegio profesional)

    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    requires_renewal BOOLEAN DEFAULT TRUE, -- Si requiere renovación periódica
    renewal_frequency VARCHAR(50), -- ej: 'anual', 'bienal', 'quinquenal'
    last_renewal_date DATE,

    -- Suspensiones
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_start_date DATE,
    suspension_end_date DATE,
    suspension_reason TEXT,

    -- Observaciones
    specializations TEXT, -- Especialidades adicionales
    observations TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_professional_licenses_user ON user_professional_licenses(user_id);
CREATE INDEX idx_professional_licenses_company ON user_professional_licenses(company_id);
CREATE INDEX idx_professional_licenses_profession ON user_professional_licenses(profession);
CREATE INDEX idx_professional_licenses_expiry ON user_professional_licenses(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_professional_licenses_active ON user_professional_licenses(is_active);
CREATE INDEX idx_professional_licenses_suspended ON user_professional_licenses(is_suspended);

-- Comentarios
COMMENT ON TABLE user_professional_licenses IS 'Licencias y matrículas profesionales del empleado';
COMMENT ON COLUMN user_professional_licenses.license_name IS 'Nombre de la licencia/matrícula (ej: Matrícula Médica)';
COMMENT ON COLUMN user_professional_licenses.profession IS 'Profesión (ej: Médico, Abogado, Ingeniero, Contador)';
COMMENT ON COLUMN user_professional_licenses.issuing_body IS 'Organismo emisor (ej: Colegio Médico, Colegio de Abogados)';
COMMENT ON COLUMN user_professional_licenses.expiry_date IS '🔔 VENCIMIENTO - Algunas profesiones requieren renovación periódica';
COMMENT ON COLUMN user_professional_licenses.verification_url IS 'URL para verificar la licencia online en el sitio del organismo emisor';

-- Trigger para updated_at
CREATE TRIGGER update_professional_licenses_updated_at
BEFORE UPDATE ON user_professional_licenses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
