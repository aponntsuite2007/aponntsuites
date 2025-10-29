/**
 * PARTNERS SYSTEM - PARTE 1: TABLAS BASE
 *
 * Tablas sin dependencias externas:
 * - partner_roles
 * - partners
 */

-- ========================================
-- 1. PARTNER ROLES (Tipos de partners)
-- ========================================

CREATE TABLE IF NOT EXISTS partner_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL, -- 'legal', 'medical', 'safety', 'hr', 'operations'
    description TEXT,

    -- Requirements
    requires_license BOOLEAN DEFAULT false,
    requires_insurance BOOLEAN DEFAULT false,
    requires_certification BOOLEAN DEFAULT false,

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 2. PARTNERS (Profesionales/Empresas)
-- ========================================

CREATE TABLE IF NOT EXISTS partners (
    id SERIAL PRIMARY KEY,

    -- Basic Info
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,

    -- Personal/Company Info
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company_name VARCHAR(255),
    tax_id VARCHAR(50),

    -- Role
    partner_role_id INTEGER NOT NULL REFERENCES partner_roles(id) ON DELETE RESTRICT,

    -- Contact
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Argentina',
    postal_code VARCHAR(10),

    -- Professional Info
    professional_licenses JSONB, -- [{ jurisdiction, license_number, expiry_date }]
    certifications JSONB, -- [{ name, issuer, date, expiry }]
    education JSONB, -- [{ degree, institution, year }]

    years_experience INTEGER,
    specializations TEXT[],
    languages TEXT[] DEFAULT ARRAY['Español'],

    -- Insurance
    has_insurance BOOLEAN DEFAULT false,
    insurance_provider VARCHAR(255),
    insurance_policy_number VARCHAR(100),
    insurance_expiry_date DATE,

    -- Business Model
    contract_type VARCHAR(50) NOT NULL DEFAULT 'per_service',
    -- 'per_service', 'eventual', 'part_time', 'full_time'

    commission_calculation VARCHAR(50) NOT NULL DEFAULT 'per_module_user',
    -- 'per_module_user', 'per_employee', 'per_company', 'per_service'

    commission_percentage DECIMAL(5, 2),
    fixed_rate_per_employee DECIMAL(10, 2),
    fixed_rate_per_service DECIMAL(10, 2),

    -- Availability
    available_hours JSONB, -- { monday: ['09:00-13:00', '14:00-18:00'], ... }
    service_radius_km INTEGER, -- for on-site services
    accepts_emergency BOOLEAN DEFAULT false,

    -- Profile
    bio TEXT,
    website VARCHAR(255),
    linkedin_url VARCHAR(255),
    profile_photo_url TEXT,

    -- Ratings & Reviews
    rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    total_reviews INTEGER DEFAULT 0,
    total_services INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending', 'under_review', 'approved', 'active', 'suspended', 'rejected'

    verification_status VARCHAR(20) DEFAULT 'unverified',
    -- 'unverified', 'documents_pending', 'verified'

    rejection_reason TEXT,

    -- Legal
    accepted_terms BOOLEAN DEFAULT false,
    terms_accepted_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    last_login_at TIMESTAMP,

    CONSTRAINT valid_commission_calc CHECK (
        commission_calculation IN ('per_module_user', 'per_employee', 'per_company', 'per_service')
    ),

    CONSTRAINT valid_contract_type CHECK (
        contract_type IN ('per_service', 'eventual', 'part_time', 'full_time')
    ),

    CONSTRAINT valid_status CHECK (
        status IN ('pending', 'under_review', 'approved', 'active', 'suspended', 'rejected')
    )
);

-- ========================================
-- INDEXES (PARTE 1)
-- ========================================

CREATE INDEX idx_partners_email ON partners(email);
CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_role ON partners(partner_role_id);
CREATE INDEX idx_partners_rating ON partners(rating DESC);
CREATE INDEX idx_partners_location ON partners(city, province);

-- ========================================
-- INITIAL DATA (PARTE 1)
-- ========================================

INSERT INTO partner_roles (role_name, category, description, requires_license, requires_insurance) VALUES
('Abogado Laboralista', 'legal', 'Asesoramiento legal en temas laborales y relaciones con empleados', true, true),
('Médico Laboral', 'medical', 'Exámenes médicos pre-ocupacionales y seguimiento de salud laboral', true, true),
('Responsable de Seguridad e Higiene', 'safety', 'Gestión de seguridad e higiene en el trabajo', true, true),
('Coach Empresarial', 'hr', 'Coaching y desarrollo de equipos', false, false),
('Auditor Externo', 'operations', 'Auditorías de procesos y sistemas', false, true),
('Servicio de Emergencias', 'medical', 'Atención médica de emergencias en el lugar de trabajo', true, true),
('Enfermero/a', 'medical', 'Atención de enfermería y primeros auxilios', true, true),
('Nutricionista', 'medical', 'Planes nutricionales y asesoramiento', true, false),
('Psicólogo Laboral', 'hr', 'Evaluaciones psicológicas y bienestar mental', true, true),
('Transporte de Personal', 'operations', 'Servicio de transporte para empleados', false, true)
ON CONFLICT (role_name) DO NOTHING;

COMMENT ON TABLE partner_roles IS 'Tipos de partners/profesionales disponibles en el marketplace';
COMMENT ON TABLE partners IS 'Profesionales y empresas proveedoras de servicios';
COMMENT ON COLUMN partners.commission_calculation IS 'Método de cálculo de comisiones';
COMMENT ON COLUMN partners.contract_type IS 'Tipo de contrato con Aponnt';
