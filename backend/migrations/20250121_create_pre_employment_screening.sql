-- ============================================================================
-- OH V6.0 - PRE-EMPLOYMENT MEDICAL SCREENING
-- Migration: 20250121_create_pre_employment_screening.sql
-- Task: OH-V6-2
-- Multi-Country: LATAM, USA, EU parametrizable
-- ============================================================================

-- ============================================================================
-- 1. SCREENING TYPES (Parametrizable por país)
-- ============================================================================
CREATE TABLE IF NOT EXISTS oh_screening_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL,                     -- 'pre_employment_physical', 'drug_test', 'vision_test'
    name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {"en": "Pre-Employment Physical", "es": "Examen Preocupacional", "pt": "Exame Pré-Admissional"}
    description_i18n JSONB DEFAULT '{}'::jsonb,
    category VARCHAR(50) NOT NULL,                  -- 'medical', 'lab', 'psychological', 'physical'

    -- Multi-Country Configuration
    country_codes TEXT[] DEFAULT ARRAY['*'],        -- ['*'] = global, ['US', 'CA'] = específicos
    region VARCHAR(50),                             -- 'LATAM', 'USA', 'EU', 'APAC'

    -- Requirements
    is_mandatory BOOLEAN DEFAULT false,             -- ¿Es obligatorio por defecto?
    required_for_roles TEXT[],                      -- ['driver', 'operator', 'healthcare_worker']
    requires_physician BOOLEAN DEFAULT false,       -- ¿Requiere médico certificado?
    requires_lab BOOLEAN DEFAULT false,             -- ¿Requiere laboratorio?

    -- Validity & Renewal
    validity_days INTEGER,                          -- Días de validez (NULL = no expira)
    renewal_reminder_days INTEGER DEFAULT 30,       -- Días antes para recordar renovación

    -- Results Configuration
    result_types JSONB DEFAULT '["pass", "fail", "conditional"]'::jsonb,
    pass_criteria JSONB,                            -- Criterios de aprobación parametrizables

    -- Cost & Duration
    estimated_cost_usd DECIMAL(10, 2),
    estimated_duration_minutes INTEGER,

    -- Status & Order
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,

    -- Audit
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    UNIQUE(code, region)
);

CREATE INDEX idx_oh_screening_types_code ON oh_screening_types(code);
CREATE INDEX idx_oh_screening_types_region ON oh_screening_types(region);
CREATE INDEX idx_oh_screening_types_active ON oh_screening_types(is_active) WHERE is_active = true;
CREATE INDEX idx_oh_screening_types_country ON oh_screening_types USING GIN(country_codes);

COMMENT ON TABLE oh_screening_types IS 'Tipos de screening médico parametrizables por país/región';
COMMENT ON COLUMN oh_screening_types.country_codes IS 'ISO 3166-1 alpha-2 codes o [*] para global';
COMMENT ON COLUMN oh_screening_types.name_i18n IS 'Nombre en múltiples idiomas: {"en": "...", "es": "...", "pt": "..."}';

-- ============================================================================
-- 2. PRE-EMPLOYMENT SCREENINGS (Registro de screenings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS oh_pre_employment_screenings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Candidate Information
    candidate_first_name VARCHAR(255) NOT NULL,
    candidate_last_name VARCHAR(255) NOT NULL,
    candidate_email VARCHAR(255),
    candidate_phone VARCHAR(50),
    candidate_id_number VARCHAR(100),               -- DNI, SSN, NIF, etc.
    candidate_date_of_birth DATE,
    candidate_gender VARCHAR(20),                   -- 'male', 'female', 'other', 'prefer_not_to_say'

    -- Position Information
    position_title VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    position_level VARCHAR(100),                    -- 'entry', 'mid', 'senior', 'executive'
    job_category VARCHAR(100),                      -- 'office', 'field', 'healthcare', 'driver'
    expected_start_date DATE,

    -- Screening Details
    screening_type_id INTEGER REFERENCES oh_screening_types(id),
    screening_type_code VARCHAR(100),               -- Denormalized for performance
    scheduled_date TIMESTAMP,
    completed_date TIMESTAMP,

    -- Location & Provider
    country_code VARCHAR(2) NOT NULL,               -- ISO 3166-1 alpha-2
    location_address TEXT,
    location_city VARCHAR(255),
    location_state VARCHAR(100),
    location_postal_code VARCHAR(20),

    provider_name VARCHAR(255),                     -- Medical facility/lab name
    provider_license_number VARCHAR(100),
    physician_name VARCHAR(255),
    physician_license_number VARCHAR(100),

    -- Results
    overall_result VARCHAR(50),                     -- 'pass', 'fail', 'conditional', 'pending', 'cancelled'
    result_summary TEXT,
    result_details JSONB,                           -- Flexible JSON for country-specific results

    -- Restrictions & Accommodations
    has_restrictions BOOLEAN DEFAULT false,
    restrictions_description TEXT,
    requires_accommodations BOOLEAN DEFAULT false,
    accommodations_description TEXT,
    accommodation_cost_estimate DECIMAL(10, 2),

    -- Follow-up
    requires_follow_up BOOLEAN DEFAULT false,
    follow_up_date DATE,
    follow_up_reason TEXT,
    follow_up_completed BOOLEAN DEFAULT false,

    -- Documents
    has_documents BOOLEAN DEFAULT false,
    documents_count INTEGER DEFAULT 0,

    -- Validity
    valid_from DATE,
    valid_until DATE,
    -- Note: is_expired calculado en consultas como: (valid_until < CURRENT_DATE)

    -- Cost
    screening_cost_usd DECIMAL(10, 2),
    paid_by VARCHAR(50) DEFAULT 'company',          -- 'company', 'candidate', 'insurance'
    payment_status VARCHAR(50) DEFAULT 'pending',   -- 'pending', 'paid', 'reimbursed'

    -- Status & Workflow
    status VARCHAR(50) DEFAULT 'scheduled',         -- 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'
    workflow_stage VARCHAR(100),                    -- 'booking', 'screening', 'review', 'approved', 'rejected'
    reviewed_by VARCHAR(255),                       -- HR/Medical staff who reviewed
    reviewed_at TIMESTAMP,
    review_notes TEXT,

    -- Hiring Decision
    approved_for_hiring BOOLEAN,
    approval_date TIMESTAMP,
    approved_by VARCHAR(255),
    rejection_reason TEXT,

    -- Notifications
    candidate_notified BOOLEAN DEFAULT false,
    candidate_notified_at TIMESTAMP,
    hr_notified BOOLEAN DEFAULT false,
    hr_notified_at TIMESTAMP,

    -- Compliance & Privacy
    consent_signed BOOLEAN DEFAULT false,
    consent_signed_at TIMESTAMP,
    consent_document_url TEXT,
    hipaa_compliant BOOLEAN DEFAULT true,           -- USA
    gdpr_compliant BOOLEAN DEFAULT true,            -- EU
    lgpd_compliant BOOLEAN DEFAULT true,            -- Brazil

    -- Metadata
    metadata JSONB,                                 -- Country-specific fields
    tags TEXT[],

    -- Audit
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    CONSTRAINT chk_overall_result CHECK (overall_result IN ('pass', 'fail', 'conditional', 'pending', 'cancelled')),
    CONSTRAINT chk_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'))
);

CREATE INDEX idx_oh_screenings_company ON oh_pre_employment_screenings(company_id);
CREATE INDEX idx_oh_screenings_candidate_email ON oh_pre_employment_screenings(candidate_email);
CREATE INDEX idx_oh_screenings_status ON oh_pre_employment_screenings(status);
CREATE INDEX idx_oh_screenings_overall_result ON oh_pre_employment_screenings(overall_result);
CREATE INDEX idx_oh_screenings_country ON oh_pre_employment_screenings(country_code);
CREATE INDEX idx_oh_screenings_scheduled_date ON oh_pre_employment_screenings(scheduled_date);
CREATE INDEX idx_oh_screenings_approved ON oh_pre_employment_screenings(approved_for_hiring);
-- Note: is_expired calculado dinámicamente como (valid_until < CURRENT_DATE)
CREATE INDEX idx_oh_screenings_valid_until ON oh_pre_employment_screenings(valid_until);
CREATE INDEX idx_oh_screenings_type ON oh_pre_employment_screenings(screening_type_id);

COMMENT ON TABLE oh_pre_employment_screenings IS 'Registro de screenings médicos pre-empleo (multi-country)';
COMMENT ON COLUMN oh_pre_employment_screenings.country_code IS 'ISO 3166-1 alpha-2: US, MX, BR, AR, DE, etc.';
COMMENT ON COLUMN oh_pre_employment_screenings.metadata IS 'Campos específicos por país en JSON';

-- ============================================================================
-- 3. SCREENING RESULTS DETAIL (Resultados detallados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS oh_screening_results (
    id SERIAL PRIMARY KEY,
    screening_id UUID NOT NULL REFERENCES oh_pre_employment_screenings(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Test Information
    test_category VARCHAR(100) NOT NULL,            -- 'vitals', 'lab', 'physical_exam', 'drug_test', 'vision', 'hearing'
    test_name VARCHAR(255) NOT NULL,
    test_code VARCHAR(100),

    -- Results
    result_value VARCHAR(500),                      -- Valor del resultado
    result_unit VARCHAR(50),                        -- 'mg/dL', 'mmHg', '20/20', 'dB'
    result_status VARCHAR(50),                      -- 'normal', 'abnormal', 'critical', 'borderline'
    reference_range VARCHAR(255),                   -- '70-100 mg/dL', '120/80 mmHg'

    -- Interpretation
    interpretation TEXT,
    is_within_normal BOOLEAN,
    requires_attention BOOLEAN DEFAULT false,
    clinical_significance VARCHAR(100),             -- 'none', 'minor', 'moderate', 'major'

    -- Additional Data
    result_data JSONB,                              -- Datos estructurados del resultado
    notes TEXT,

    -- Metadata
    tested_at TIMESTAMP,
    reported_at TIMESTAMP,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_result_status CHECK (result_status IN ('normal', 'abnormal', 'critical', 'borderline', 'pending'))
);

CREATE INDEX idx_oh_results_screening ON oh_screening_results(screening_id);
CREATE INDEX idx_oh_results_company ON oh_screening_results(company_id);
CREATE INDEX idx_oh_results_category ON oh_screening_results(test_category);
CREATE INDEX idx_oh_results_status ON oh_screening_results(result_status);
CREATE INDEX idx_oh_results_attention ON oh_screening_results(requires_attention) WHERE requires_attention = true;

COMMENT ON TABLE oh_screening_results IS 'Resultados detallados de cada test dentro del screening';

-- ============================================================================
-- 4. SCREENING DOCUMENTS (Documentos adjuntos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS oh_screening_documents (
    id SERIAL PRIMARY KEY,
    screening_id UUID NOT NULL REFERENCES oh_pre_employment_screenings(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Document Information
    document_type VARCHAR(100) NOT NULL,            -- 'medical_report', 'lab_results', 'consent_form', 'xray', 'certificate'
    document_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),

    -- Document Metadata
    document_date DATE,
    issued_by VARCHAR(255),
    language VARCHAR(10),                           -- 'en', 'es', 'pt', 'fr'

    -- Security & Access
    is_confidential BOOLEAN DEFAULT true,
    requires_physician_review BOOLEAN DEFAULT false,
    viewed_by TEXT[],
    view_count INTEGER DEFAULT 0,

    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_by VARCHAR(255),
    verified_at TIMESTAMP,

    -- Status
    status VARCHAR(50) DEFAULT 'active',            -- 'active', 'archived', 'deleted'

    -- Audit
    uploaded_by VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_oh_docs_screening ON oh_screening_documents(screening_id);
CREATE INDEX idx_oh_docs_company ON oh_screening_documents(company_id);
CREATE INDEX idx_oh_docs_type ON oh_screening_documents(document_type);
CREATE INDEX idx_oh_docs_status ON oh_screening_documents(status);

COMMENT ON TABLE oh_screening_documents IS 'Documentos adjuntos al screening (reportes, certificados, etc.)';

-- ============================================================================
-- 5. SCREENING CONFIGURATION (Configuración por empresa/país)
-- ============================================================================
CREATE TABLE IF NOT EXISTS oh_screening_config (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    country_code VARCHAR(2) NOT NULL,               -- ISO 3166-1 alpha-2

    -- Required Screening Types
    required_screening_types INTEGER[] DEFAULT ARRAY[]::INTEGER[],  -- Array of screening_type_ids

    -- Validity Rules
    default_validity_days INTEGER DEFAULT 365,
    require_renewal BOOLEAN DEFAULT true,
    renewal_reminder_days INTEGER DEFAULT 30,

    -- Approval Workflow
    requires_hr_approval BOOLEAN DEFAULT true,
    requires_medical_approval BOOLEAN DEFAULT false,
    requires_manager_approval BOOLEAN DEFAULT false,
    auto_approve_pass_results BOOLEAN DEFAULT false,

    -- Cost Rules
    company_pays BOOLEAN DEFAULT true,
    max_reimbursement_usd DECIMAL(10, 2),

    -- Provider Preferences
    preferred_providers TEXT[],
    blacklisted_providers TEXT[],

    -- Notification Settings
    notify_candidate_on_schedule BOOLEAN DEFAULT true,
    notify_candidate_on_results BOOLEAN DEFAULT true,
    notify_hr_on_results BOOLEAN DEFAULT true,
    notification_template_id INTEGER,

    -- Compliance Settings
    require_consent_form BOOLEAN DEFAULT true,
    consent_template_url TEXT,
    data_retention_days INTEGER DEFAULT 2555,       -- 7 years default

    -- Country-Specific Configuration
    config_data JSONB DEFAULT '{}'::jsonb,          -- Configuración específica por país

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, country_code)
);

CREATE INDEX idx_oh_config_company ON oh_screening_config(company_id);
CREATE INDEX idx_oh_config_country ON oh_screening_config(country_code);
CREATE INDEX idx_oh_config_active ON oh_screening_config(is_active) WHERE is_active = true;

COMMENT ON TABLE oh_screening_config IS 'Configuración de screening por empresa y país';
COMMENT ON COLUMN oh_screening_config.config_data IS 'Configuración específica por país (leyes locales, requisitos)';

-- ============================================================================
-- 6. SEED DATA - Common Screening Types (Multi-Country)
-- ============================================================================

-- GLOBAL - Physical Examination
INSERT INTO oh_screening_types (code, name_i18n, description_i18n, category, country_codes, region, is_mandatory, requires_physician, validity_days, estimated_duration_minutes)
VALUES (
    'pre_employment_physical',
    '{"en": "Pre-Employment Physical Examination", "es": "Examen Médico Preocupacional", "pt": "Exame Físico Pré-Admissional", "fr": "Examen Physique Pré-Embauche"}'::jsonb,
    '{"en": "Complete physical examination", "es": "Examen físico completo", "pt": "Exame físico completo"}'::jsonb,
    'medical',
    ARRAY['*'],
    'GLOBAL',
    true,
    true,
    365,
    60
);

-- USA - Drug Screening (5-Panel)
INSERT INTO oh_screening_types (code, name_i18n, description_i18n, category, country_codes, region, is_mandatory, requires_lab, validity_days, estimated_duration_minutes)
VALUES (
    'drug_test_5panel_usa',
    '{"en": "5-Panel Drug Test", "es": "Test de Drogas 5 Paneles"}'::jsonb,
    '{"en": "Standard 5-panel drug screening (THC, Cocaine, PCP, Opiates, Amphetamines)", "es": "Test estándar de 5 paneles"}'::jsonb,
    'lab',
    ARRAY['US'],
    'USA',
    true,
    true,
    NULL,
    30
);

-- LATAM - Examen Psicotécnico
INSERT INTO oh_screening_types (code, name_i18n, description_i18n, category, country_codes, region, requires_physician, validity_days, estimated_duration_minutes)
VALUES (
    'psychotechnical_exam_latam',
    '{"es": "Examen Psicotécnico", "pt": "Exame Psicotécnico", "en": "Psychotechnical Assessment"}'::jsonb,
    '{"es": "Evaluación psicológica y aptitudes", "pt": "Avaliação psicológica e aptidões"}'::jsonb,
    'psychological',
    ARRAY['MX', 'AR', 'CL', 'CO', 'PE'],
    'LATAM',
    true,
    730,
    120
);

-- EU - Vision Test
INSERT INTO oh_screening_types (code, name_i18n, description_i18n, category, country_codes, region, required_for_roles, validity_days, estimated_duration_minutes)
VALUES (
    'vision_test_eu',
    '{"en": "Vision Screening", "es": "Examen de Visión", "fr": "Test de Vision", "de": "Sehtest"}'::jsonb,
    '{"en": "Visual acuity and color vision test", "es": "Agudeza visual y percepción de colores"}'::jsonb,
    'physical',
    ARRAY['DE', 'FR', 'ES', 'IT', 'NL'],
    'EU',
    ARRAY['driver', 'operator', 'pilot'],
    1095,
    20
);

-- GLOBAL - Hearing Test
INSERT INTO oh_screening_types (code, name_i18n, description_i18n, category, country_codes, region, required_for_roles, validity_days, estimated_duration_minutes)
VALUES (
    'hearing_test',
    '{"en": "Hearing Screening", "es": "Audiometría", "pt": "Teste Auditivo", "fr": "Test Auditif"}'::jsonb,
    '{"en": "Audiometric hearing test", "es": "Prueba audiométrica"}'::jsonb,
    'physical',
    ARRAY['*'],
    'GLOBAL',
    ARRAY['operator', 'manufacturing', 'construction'],
    1095,
    30
);

-- USA - TB Test (Tuberculosis)
INSERT INTO oh_screening_types (code, name_i18n, description_i18n, category, country_codes, region, required_for_roles, requires_lab, validity_days, estimated_duration_minutes)
VALUES (
    'tb_test_usa',
    '{"en": "TB Test (Tuberculosis Screening)", "es": "Test de Tuberculosis"}'::jsonb,
    '{"en": "PPD skin test or QuantiFERON blood test", "es": "Prueba cutánea PPD o sangre QuantiFERON"}'::jsonb,
    'lab',
    ARRAY['US', 'CA'],
    'USA',
    ARRAY['healthcare_worker', 'teacher', 'food_service'],
    true,
    365,
    15
);

-- LATAM - Radiografía de Tórax
INSERT INTO oh_screening_types (code, name_i18n, description_i18n, category, country_codes, region, requires_physician, validity_days, estimated_duration_minutes)
VALUES (
    'chest_xray_latam',
    '{"es": "Radiografía de Tórax", "pt": "Raio-X de Tórax", "en": "Chest X-Ray"}'::jsonb,
    '{"es": "Radiografía para detectar anomalías pulmonares", "pt": "Radiografia para detectar anomalias pulmonares"}'::jsonb,
    'medical',
    ARRAY['MX', 'BR', 'AR', 'CL'],
    'LATAM',
    true,
    730,
    15
);

-- GLOBAL - Blood Tests
INSERT INTO oh_screening_types (code, name_i18n, description_i18n, category, country_codes, region, requires_lab, validity_days, estimated_duration_minutes)
VALUES (
    'blood_test_complete',
    '{"en": "Complete Blood Count (CBC)", "es": "Hemograma Completo", "pt": "Hemograma Completo", "fr": "Numération Sanguine"}'::jsonb,
    '{"en": "Complete blood count and chemistry panel", "es": "Conteo sanguíneo completo y panel químico"}'::jsonb,
    'lab',
    ARRAY['*'],
    'GLOBAL',
    true,
    365,
    10
);

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function: Get active screening types for country
CREATE OR REPLACE FUNCTION get_screening_types_for_country(p_country_code VARCHAR(2))
RETURNS TABLE (
    id INTEGER,
    code VARCHAR(100),
    name_i18n JSONB,
    category VARCHAR(50),
    is_mandatory BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        st.id,
        st.code,
        st.name_i18n,
        st.category,
        st.is_mandatory
    FROM oh_screening_types st
    WHERE st.is_active = true
      AND st.deleted_at IS NULL
      AND (
          '*' = ANY(st.country_codes)
          OR p_country_code = ANY(st.country_codes)
      )
    ORDER BY st.display_order, st.code;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if screening is expired
CREATE OR REPLACE FUNCTION check_screening_expiration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.valid_until < CURRENT_DATE THEN
        -- Send notification (implementation would go here)
        RAISE NOTICE 'Screening % has expired', NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_screening_expiration_check
    BEFORE UPDATE ON oh_pre_employment_screenings
    FOR EACH ROW
    WHEN (NEW.valid_until IS NOT NULL)
    EXECUTE FUNCTION check_screening_expiration();

-- Function: Auto-update screening documents count
CREATE OR REPLACE FUNCTION update_screening_documents_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE oh_pre_employment_screenings
        SET
            documents_count = (
                SELECT COUNT(*)
                FROM oh_screening_documents
                WHERE screening_id = NEW.screening_id
                  AND deleted_at IS NULL
            ),
            has_documents = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.screening_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE oh_pre_employment_screenings
        SET
            documents_count = (
                SELECT COUNT(*)
                FROM oh_screening_documents
                WHERE screening_id = OLD.screening_id
                  AND deleted_at IS NULL
            ),
            has_documents = (
                SELECT COUNT(*) > 0
                FROM oh_screening_documents
                WHERE screening_id = OLD.screening_id
                  AND deleted_at IS NULL
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.screening_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_documents_count
    AFTER INSERT OR UPDATE OR DELETE ON oh_screening_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_screening_documents_count();

-- ============================================================================
-- 8. VIEWS FOR REPORTING
-- ============================================================================

-- View: Active Screenings Summary
CREATE OR REPLACE VIEW v_oh_active_screenings AS
SELECT
    s.id,
    s.company_id,
    s.candidate_first_name || ' ' || s.candidate_last_name AS candidate_name,
    s.candidate_email,
    s.position_title,
    st.code AS screening_type_code,
    st.name_i18n->>'en' AS screening_type_name,
    s.scheduled_date,
    s.overall_result,
    s.status,
    s.country_code,
    s.approved_for_hiring,
    s.created_at,
    CASE
        WHEN s.valid_until < CURRENT_DATE THEN 'expired'
        WHEN s.valid_until < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
        ELSE 'valid'
    END AS validity_status
FROM oh_pre_employment_screenings s
LEFT JOIN oh_screening_types st ON s.screening_type_id = st.id
WHERE s.deleted_at IS NULL
  AND s.status != 'cancelled';

COMMENT ON VIEW v_oh_active_screenings IS 'Vista de screenings activos con información básica';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Multi-Country Pre-Employment Screening Schema
-- Tables: 5
-- Functions: 3
-- Triggers: 2
-- Views: 1
-- Seed Data: 8 screening types
-- ============================================================================
