-- Sistema de Pricing Modular + Modelo B2B2C (Hospitales/Clínicas)
-- Permite vender módulos individuales o bundles con pricing por usuario
-- Soporta 3 tipos de clientes: Empresas, Hospitales, Clínicas
-- Versión: 1.0.0
-- Fecha: 2026-01-01

-- =================================================================
-- TABLA: module_catalog (Catálogo de módulos disponibles)
-- =================================================================

CREATE TABLE IF NOT EXISTS module_catalog (
    id SERIAL PRIMARY KEY,
    module_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'medical', 'hse', 'legal', 'analytics', 'integration'

    -- Clasificación
    type VARCHAR(20) DEFAULT 'premium' CHECK (type IN ('core', 'premium', 'enterprise')),
    is_standalone BOOLEAN DEFAULT TRUE, -- ¿Puede venderse solo?

    -- Pricing base
    base_price_monthly_usd DECIMAL(10,2) DEFAULT 0,
    price_per_user_usd DECIMAL(10,2) DEFAULT 0,

    -- Tiers de precios por volumen
    price_tiers JSONB DEFAULT '[]'::JSONB,
    -- Ejemplo: [
    --   {"min_users": 1, "max_users": 50, "price_per_user": 5.00},
    --   {"min_users": 51, "max_users": 200, "price_per_user": 4.00},
    --   {"min_users": 201, "max_users": null, "price_per_user": 3.00}
    -- ]

    -- Modelos de negocio
    business_models JSONB DEFAULT '[]'::JSONB,
    -- Ejemplo: ["b2b_enterprise", "b2b_hospital", "b2b_clinic", "b2c_individual"]

    -- Dependencias
    dependencies JSONB DEFAULT '[]'::JSONB,
    -- Ejemplo: ["medical-dashboard", "associate-marketplace"]

    -- Metadata
    icon VARCHAR(50),
    color VARCHAR(20),
    demo_url VARCHAR(500),
    documentation_url VARCHAR(500),

    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    available_from DATE DEFAULT NOW(),
    deprecated_at DATE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_module_catalog_category ON module_catalog(category);
CREATE INDEX idx_module_catalog_type ON module_catalog(type);
CREATE INDEX idx_module_catalog_active ON module_catalog(is_active);

-- =================================================================
-- TABLA: organization_types (Tipos de organización - B2B2C)
-- =================================================================

CREATE TYPE organization_type AS ENUM (
    'enterprise',        -- Empresa industrial/comercial (B2B)
    'hospital',          -- Hospital (B2B2C)
    'clinic',            -- Clínica/Centro médico (B2B2C)
    'laboratory',        -- Laboratorio (B2B partner)
    'pharmacy',          -- Farmacia (B2B partner)
    'insurance_company', -- Aseguradora/ART (B2B partner)
    'individual'         -- Usuario individual (B2C - futuro)
);

-- Actualizar tabla companies para incluir tipo de organización
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS organization_type organization_type DEFAULT 'enterprise';

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS is_medical_provider BOOLEAN DEFAULT FALSE;

-- Índice
CREATE INDEX IF NOT EXISTS idx_companies_org_type ON companies(organization_type);
CREATE INDEX IF NOT EXISTS idx_companies_medical_provider ON companies(is_medical_provider);

COMMENT ON COLUMN companies.organization_type IS 'Tipo de organización (empresa, hospital, clínica, etc.)';
COMMENT ON COLUMN companies.is_medical_provider IS 'TRUE si es proveedor médico (hospital/clínica que ofrece servicios a empresas)';

-- =================================================================
-- TABLA: company_modules (Módulos contratados por empresa)
-- =================================================================

CREATE TABLE IF NOT EXISTS company_modules (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    module_key VARCHAR(100) NOT NULL REFERENCES module_catalog(module_key) ON DELETE RESTRICT,

    -- Pricing
    contracted_users INTEGER DEFAULT 0, -- 0 = ilimitado
    price_per_user_usd DECIMAL(10,2),
    base_price_monthly_usd DECIMAL(10,2),
    total_monthly_usd DECIMAL(10,2),

    -- Contrato
    contracted_at TIMESTAMP DEFAULT NOW(),
    contract_start_date DATE NOT NULL,
    contract_end_date DATE,

    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    is_trial BOOLEAN DEFAULT FALSE,
    trial_ends_at TIMESTAMP,

    -- Límites
    max_users INTEGER, -- NULL = ilimitado
    max_monthly_api_calls INTEGER,
    max_storage_gb INTEGER,

    -- Features adicionales (customización por cliente)
    enabled_features JSONB DEFAULT '[]'::JSONB,
    disabled_features JSONB DEFAULT '[]'::JSONB,
    custom_config JSONB,

    -- Facturación
    last_billed_at TIMESTAMP,
    next_billing_date DATE,
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'quarterly', 'yearly'

    -- Metadata
    notes TEXT,
    contracted_by INTEGER REFERENCES users(id), -- Usuario que contrató

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, module_key)
);

-- Índices
CREATE INDEX idx_company_modules_company ON company_modules(company_id);
CREATE INDEX idx_company_modules_module ON company_modules(module_key);
CREATE INDEX idx_company_modules_active ON company_modules(is_active);
CREATE INDEX idx_company_modules_trial ON company_modules(is_trial);
CREATE INDEX idx_company_modules_next_billing ON company_modules(next_billing_date);

-- =================================================================
-- TABLA: module_bundles (Paquetes de módulos)
-- =================================================================

CREATE TABLE IF NOT EXISTS module_bundles (
    id SERIAL PRIMARY KEY,
    bundle_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Módulos incluidos
    included_modules JSONB NOT NULL,
    -- Ejemplo: [
    --   {"module_key": "medical-dashboard", "required": true},
    --   {"module_key": "telemedicine", "required": false}
    -- ]

    -- Pricing
    bundle_price_monthly_usd DECIMAL(10,2),
    price_per_user_usd DECIMAL(10,2),
    discount_percentage DECIMAL(5,2) DEFAULT 0,

    -- Comparación vs módulos individuales
    individual_modules_price_usd DECIMAL(10,2),
    savings_usd DECIMAL(10,2),

    -- Target
    target_organization_types VARCHAR(50)[], -- ['enterprise', 'hospital', 'clinic']
    target_industries VARCHAR(50)[],         -- ['construccion', 'mineria', 'salud']
    min_users INTEGER DEFAULT 1,

    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,

    -- Metadata
    icon VARCHAR(50),
    color VARCHAR(20),
    badge VARCHAR(50), -- 'popular', 'recommended', 'best_value'

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_module_bundles_active ON module_bundles(is_active);
CREATE INDEX idx_module_bundles_featured ON module_bundles(is_featured);

-- =================================================================
-- TABLA: pricing_history (Historial de cambios de precio)
-- =================================================================

CREATE TABLE IF NOT EXISTS pricing_history (
    id SERIAL PRIMARY KEY,
    module_key VARCHAR(100) REFERENCES module_catalog(module_key),
    bundle_key VARCHAR(100) REFERENCES module_bundles(bundle_key),

    -- Precio anterior y nuevo
    old_price_per_user_usd DECIMAL(10,2),
    new_price_per_user_usd DECIMAL(10,2),
    old_base_price_usd DECIMAL(10,2),
    new_base_price_usd DECIMAL(10,2),

    -- Razón del cambio
    reason VARCHAR(255),
    change_type VARCHAR(50), -- 'increase', 'decrease', 'promotion', 'market_adjustment'

    -- Grandfathering (clientes actuales mantienen precio anterior)
    affects_existing_customers BOOLEAN DEFAULT FALSE,

    -- Vigencia
    effective_from DATE NOT NULL,
    effective_until DATE,

    changed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_pricing_history_module ON pricing_history(module_key);
CREATE INDEX idx_pricing_history_bundle ON pricing_history(bundle_key);
CREATE INDEX idx_pricing_history_effective ON pricing_history(effective_from);

-- =================================================================
-- TABLA: medical_services (Servicios médicos para hospitales/clínicas)
-- =================================================================

CREATE TABLE IF NOT EXISTS medical_services (
    id SERIAL PRIMARY KEY,

    -- Proveedor médico (hospital/clínica)
    medical_provider_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Tipo de servicio
    service_type VARCHAR(50) NOT NULL,
    -- 'pre_occupational', 'periodic', 'post_occupational',
    -- 'telemedicine', 'vaccination', 'lab_tests', 'pharmacy'

    service_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Pricing del servicio
    price_per_service_usd DECIMAL(10,2),
    billing_type VARCHAR(50) DEFAULT 'per_service', -- 'per_service', 'monthly_flat', 'per_employee'

    -- Disponibilidad
    is_available BOOLEAN DEFAULT TRUE,
    max_capacity_per_month INTEGER,

    -- Metadata
    duration_minutes INTEGER,
    requires_appointment BOOLEAN DEFAULT TRUE,
    location VARCHAR(255),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT chk_medical_provider CHECK (
        (SELECT organization_type FROM companies WHERE id = medical_provider_id) IN ('hospital', 'clinic')
    )
);

-- Índices
CREATE INDEX idx_medical_services_provider ON medical_services(medical_provider_id);
CREATE INDEX idx_medical_services_type ON medical_services(service_type);
CREATE INDEX idx_medical_services_available ON medical_services(is_available);

-- =================================================================
-- TABLA: enterprise_medical_contracts (Contratos empresa-hospital)
-- =================================================================

CREATE TABLE IF NOT EXISTS enterprise_medical_contracts (
    id SERIAL PRIMARY KEY,

    -- Partes
    enterprise_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    medical_provider_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,

    -- Servicios incluidos
    included_services INTEGER[] NOT NULL, -- IDs de medical_services

    -- Pricing
    monthly_fee_usd DECIMAL(10,2),
    price_per_employee_usd DECIMAL(10,2),
    contracted_employees INTEGER,

    -- Contrato
    contract_start_date DATE NOT NULL,
    contract_end_date DATE,
    auto_renewal BOOLEAN DEFAULT TRUE,

    -- SLA
    max_response_time_hours INTEGER DEFAULT 24,
    guaranteed_availability_percentage DECIMAL(5,2) DEFAULT 99.5,
    penalty_for_sla_breach_usd DECIMAL(10,2),

    -- Estado
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    contract_pdf_url VARCHAR(500),
    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT chk_different_companies CHECK (enterprise_id != medical_provider_id),
    CONSTRAINT chk_enterprise_type CHECK (
        (SELECT organization_type FROM companies WHERE id = enterprise_id) = 'enterprise'
    ),
    CONSTRAINT chk_medical_provider_type CHECK (
        (SELECT organization_type FROM companies WHERE id = medical_provider_id) IN ('hospital', 'clinic')
    )
);

-- Índices
CREATE INDEX idx_enterprise_contracts_enterprise ON enterprise_medical_contracts(enterprise_id);
CREATE INDEX idx_enterprise_contracts_provider ON enterprise_medical_contracts(medical_provider_id);
CREATE INDEX idx_enterprise_contracts_active ON enterprise_medical_contracts(is_active);

-- =================================================================
-- FUNCIONES HELPER
-- =================================================================

-- Calcular precio total de módulo según usuarios
CREATE OR REPLACE FUNCTION calculate_module_price(
    p_module_key VARCHAR(100),
    p_users INTEGER
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_base_price DECIMAL(10,2);
    v_price_per_user DECIMAL(10,2);
    v_tier JSONB;
    v_total DECIMAL(10,2);
BEGIN
    -- Obtener pricing base
    SELECT base_price_monthly_usd, price_per_user_usd
    INTO v_base_price, v_price_per_user
    FROM module_catalog
    WHERE module_key = p_module_key AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Módulo % no encontrado o inactivo', p_module_key;
    END IF;

    -- Buscar tier de precio aplicable
    SELECT tier INTO v_tier
    FROM module_catalog mc,
         LATERAL jsonb_array_elements(mc.price_tiers) tier
    WHERE mc.module_key = p_module_key
      AND (tier->>'min_users')::INTEGER <= p_users
      AND ((tier->>'max_users') IS NULL OR (tier->>'max_users')::INTEGER >= p_users)
    LIMIT 1;

    IF v_tier IS NOT NULL THEN
        v_price_per_user := (v_tier->>'price_per_user')::DECIMAL(10,2);
    END IF;

    -- Calcular total
    v_total := COALESCE(v_base_price, 0) + (COALESCE(v_price_per_user, 0) * p_users);

    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Obtener módulos activos de una empresa
CREATE OR REPLACE FUNCTION get_company_active_modules(p_company_id INTEGER)
RETURNS TABLE (
    module_key VARCHAR(100),
    module_name VARCHAR(255),
    is_trial BOOLEAN,
    days_until_expiry INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cm.module_key,
        mc.name,
        cm.is_trial,
        CASE
            WHEN cm.is_trial THEN EXTRACT(DAY FROM (cm.trial_ends_at - NOW()))::INTEGER
            WHEN cm.contract_end_date IS NOT NULL THEN EXTRACT(DAY FROM (cm.contract_end_date - NOW()::DATE))::INTEGER
            ELSE NULL
        END as days_until_expiry
    FROM company_modules cm
    JOIN module_catalog mc ON cm.module_key = mc.module_key
    WHERE cm.company_id = p_company_id
      AND cm.is_active = TRUE
      AND (
          (cm.is_trial AND cm.trial_ends_at > NOW())
          OR (NOT cm.is_trial AND (cm.contract_end_date IS NULL OR cm.contract_end_date >= NOW()::DATE))
      )
    ORDER BY mc.category, mc.name;
END;
$$ LANGUAGE plpgsql;

-- Verificar si empresa tiene acceso a módulo
CREATE OR REPLACE FUNCTION has_module_access(p_company_id INTEGER, p_module_key VARCHAR(100))
RETURNS BOOLEAN AS $$
DECLARE
    v_has_access BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM company_modules
        WHERE company_id = p_company_id
          AND module_key = p_module_key
          AND is_active = TRUE
          AND (
              (is_trial AND trial_ends_at > NOW())
              OR (NOT is_trial AND (contract_end_date IS NULL OR contract_end_date >= NOW()::DATE))
          )
    ) INTO v_has_access;

    RETURN v_has_access;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- DATOS INICIALES (Seed)
-- =================================================================

-- Módulos del catálogo
INSERT INTO module_catalog (module_key, name, description, category, type, is_standalone, base_price_monthly_usd, price_per_user_usd, business_models, dependencies) VALUES
('medical-dashboard', 'Dashboard Médico Profesional', 'Gestión completa de salud ocupacional (PRE/POST exámenes, historial clínico)', 'medical', 'core', TRUE, 50, 2.5, '["b2b_enterprise", "b2b_hospital", "b2b_clinic"]', '[]'),
('electronic-prescriptions', 'Recetas Electrónicas', 'Prescripciones digitales con firma electrónica multi-país (AR, BR, MX, US)', 'medical', 'premium', TRUE, 30, 1.5, '["b2b_enterprise", "b2b_hospital", "b2b_clinic"]', '["medical-dashboard"]'),
('telemedicine', 'Telemedicina', 'Consultas médicas por videollamada con Jitsi', 'medical', 'premium', TRUE, 100, 3.0, '["b2b_enterprise", "b2b_hospital", "b2b_clinic"]', '["medical-dashboard", "associate-marketplace"]'),
('art-incidents', 'Gestión de Incidentes ART', 'Registro y seguimiento de accidentes laborales', 'medical', 'core', TRUE, 40, 1.0, '["b2b_enterprise"]', '["medical-dashboard", "hse-management"]'),
('medical-epidemiology', 'Epidemiología Médica', 'Analytics de tendencias médicas y detección de brotes', 'medical', 'enterprise', FALSE, 150, 2.0, '["b2b_enterprise", "b2b_hospital"]', '["medical-dashboard"]'),
('vaccination-management', 'Gestión de Vacunación', 'Registro de vacunas, carnet digital, campañas', 'medical', 'premium', TRUE, 20, 0.5, '["b2b_enterprise", "b2b_hospital", "b2b_clinic"]', '["medical-dashboard"]'),
('laboratory-integration', 'Integración con Laboratorios', 'Importación automática de resultados vía HL7/FHIR', 'medical', 'enterprise', FALSE, 200, 1.0, '["b2b_enterprise", "b2b_hospital", "b2b_clinic"]', '["medical-dashboard"]'),
('hse-management', 'Seguridad e Higiene (HSE)', 'Gestión de EPP, inspecciones, compliance ISO 45001', 'hse', 'core', TRUE, 60, 1.5, '["b2b_enterprise"]', '[]'),
('legal-dashboard', 'Dashboard Legal', 'Gestión de casos legales laborales (43 estados)', 'legal', 'core', TRUE, 80, 2.0, '["b2b_enterprise"]', '[]'),
('associate-marketplace', 'Marketplace de Asociados', 'Red de profesionales médicos, abogados, auditores', 'marketplace', 'core', TRUE, 0, 0, '["b2b_enterprise", "b2b_hospital", "b2b_clinic"]', '[]')
ON CONFLICT (module_key) DO NOTHING;

-- Bundles
INSERT INTO module_bundles (bundle_key, name, description, included_modules, bundle_price_monthly_usd, price_per_user_usd, discount_percentage, target_organization_types) VALUES
('bundle-medical-complete', 'Bundle Médico Completo', 'Todos los módulos médicos: Dashboard + Recetas + Telemedicina + Vacunación',
 '[{"module_key": "medical-dashboard", "required": true}, {"module_key": "electronic-prescriptions", "required": true}, {"module_key": "telemedicine", "required": true}, {"module_key": "vaccination-management", "required": true}]',
 150, 5.0, 25, ARRAY['hospital', 'clinic']),

('bundle-enterprise-safety', 'Bundle Seguridad Empresarial', 'Medical + HSE + ART para empresas',
 '[{"module_key": "medical-dashboard", "required": true}, {"module_key": "hse-management", "required": true}, {"module_key": "art-incidents", "required": true}]',
 100, 3.5, 20, ARRAY['enterprise']),

('bundle-legal-complete', 'Bundle Legal + Médico', 'Medical + Legal + HSE para riesgos laborales',
 '[{"module_key": "medical-dashboard", "required": true}, {"module_key": "legal-dashboard", "required": true}, {"module_key": "hse-management", "required": true}]',
 130, 4.0, 20, ARRAY['enterprise'])
ON CONFLICT (bundle_key) DO NOTHING;

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_module_pricing_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_module_catalog_updated_at
    BEFORE UPDATE ON module_catalog
    FOR EACH ROW EXECUTE FUNCTION update_module_pricing_tables_updated_at();

CREATE TRIGGER trigger_update_company_modules_updated_at
    BEFORE UPDATE ON company_modules
    FOR EACH ROW EXECUTE FUNCTION update_module_pricing_tables_updated_at();

CREATE TRIGGER trigger_update_module_bundles_updated_at
    BEFORE UPDATE ON module_bundles
    FOR EACH ROW EXECUTE FUNCTION update_module_pricing_tables_updated_at();

CREATE TRIGGER trigger_update_medical_services_updated_at
    BEFORE UPDATE ON medical_services
    FOR EACH ROW EXECUTE FUNCTION update_module_pricing_tables_updated_at();

CREATE TRIGGER trigger_update_enterprise_medical_contracts_updated_at
    BEFORE UPDATE ON enterprise_medical_contracts
    FOR EACH ROW EXECUTE FUNCTION update_module_pricing_tables_updated_at();

-- Comentarios
COMMENT ON TABLE module_catalog IS 'Catálogo de módulos disponibles con pricing multi-tier';
COMMENT ON TABLE company_modules IS 'Módulos contratados por cada empresa con pricing personalizado';
COMMENT ON TABLE module_bundles IS 'Paquetes de módulos con descuento';
COMMENT ON TABLE pricing_history IS 'Historial de cambios de precio (grandfathering)';
COMMENT ON TABLE medical_services IS 'Servicios médicos ofrecidos por hospitales/clínicas';
COMMENT ON TABLE enterprise_medical_contracts IS 'Contratos entre empresas y proveedores médicos (B2B2C)';

COMMENT ON FUNCTION calculate_module_price IS 'Calcula precio total de módulo según cantidad de usuarios (aplica tiers)';
COMMENT ON FUNCTION get_company_active_modules IS 'Lista módulos activos de una empresa (incluyendo trials)';
COMMENT ON FUNCTION has_module_access IS 'Verifica si empresa tiene acceso válido a un módulo';
