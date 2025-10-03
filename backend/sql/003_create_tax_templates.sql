-- ========================================
-- PLANTILLAS FISCALES CONFIGURABLES
-- Sistema dinámico de matriz impositiva por país
-- ========================================

-- Tabla principal de plantillas por país
CREATE TABLE IF NOT EXISTS tax_templates (
    id SERIAL PRIMARY KEY,
    country VARCHAR(50) NOT NULL,
    country_code VARCHAR(3) NOT NULL, -- ARG, URU, BRA, etc.
    template_name VARCHAR(100) NOT NULL,

    -- Configuración de identificación tributaria
    tax_id_format VARCHAR(50), -- "XX-XXXXXXXX-X" para Argentina
    tax_id_field_name VARCHAR(50) DEFAULT 'CUIT', -- CUIT, RUT, CNPJ, etc.
    tax_id_validation_regex VARCHAR(200),
    remove_separators BOOLEAN DEFAULT true,

    -- Monedas permitidas para este país
    currencies JSONB DEFAULT '["ARS"]',
    default_currency VARCHAR(3) DEFAULT 'ARS',

    -- Estado y auditoría
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(country_code)
);

-- Condiciones impositivas por país
CREATE TABLE IF NOT EXISTS tax_conditions (
    id SERIAL PRIMARY KEY,
    tax_template_id INTEGER NOT NULL REFERENCES tax_templates(id) ON DELETE CASCADE,

    -- Datos de la condición
    condition_code VARCHAR(20) NOT NULL, -- RI, RM, EX, NI
    condition_name VARCHAR(100) NOT NULL, -- "Responsable Inscripto"
    description TEXT,

    -- Orden de mostrado
    display_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(tax_template_id, condition_code)
);

-- Conceptos impositivos configurables
CREATE TABLE IF NOT EXISTS tax_concepts (
    id SERIAL PRIMARY KEY,
    tax_template_id INTEGER NOT NULL REFERENCES tax_templates(id) ON DELETE CASCADE,

    -- Identificación del concepto
    concept_code VARCHAR(20) NOT NULL, -- IVA, RET_IVA, RET_GAN, etc.
    concept_name VARCHAR(100) NOT NULL, -- "IVA", "Retención IVA"
    description TEXT,

    -- Configuración del cálculo
    calculation_order INTEGER NOT NULL DEFAULT 1,
    base_amount VARCHAR(20) NOT NULL DEFAULT 'neto_final', -- neto_final, subtotal, total_with_taxes
    concept_type VARCHAR(20) NOT NULL DEFAULT 'tax', -- tax, retention, perception

    -- Configuración de aplicación
    is_percentage BOOLEAN DEFAULT true,
    is_compound BOOLEAN DEFAULT false, -- Si se calcula sobre otros impuestos
    affects_total BOOLEAN DEFAULT true, -- Si suma/resta del total
    is_mandatory BOOLEAN DEFAULT false,

    -- Estado
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(tax_template_id, concept_code),
    CHECK (calculation_order > 0)
);

-- Alícuotas por concepto impositivo
CREATE TABLE IF NOT EXISTS tax_rates (
    id SERIAL PRIMARY KEY,
    tax_concept_id INTEGER NOT NULL REFERENCES tax_concepts(id) ON DELETE CASCADE,

    -- Datos de la alícuota
    rate_code VARCHAR(20) NOT NULL, -- IVA_21, IVA_10_5, etc.
    rate_name VARCHAR(100) NOT NULL, -- "IVA 21%", "IVA 10.5%"
    rate_percentage DECIMAL(8,4) NOT NULL, -- 21.0000, 10.5000

    -- Configuración adicional
    minimum_amount DECIMAL(15,4) DEFAULT 0,
    maximum_amount DECIMAL(15,4),
    is_default BOOLEAN DEFAULT false,

    -- Condiciones de aplicación
    applicable_conditions JSONB, -- Condiciones bajo las cuales aplica esta alícuota
    date_from DATE,
    date_to DATE,

    -- Estado
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(tax_concept_id, rate_code),
    CHECK (rate_percentage >= 0),
    CHECK (minimum_amount >= 0)
);

-- Configuración específica de empresa (override de plantilla)
CREATE TABLE IF NOT EXISTS company_tax_config (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    tax_template_id INTEGER NOT NULL REFERENCES tax_templates(id),

    -- Configuración específica de la empresa
    custom_tax_id VARCHAR(50), -- CUIT sin guiones específico
    custom_condition_code VARCHAR(20),
    custom_currencies JSONB,

    -- Overrides de conceptos específicos
    concept_overrides JSONB DEFAULT '{}', -- {"IVA": {"rate": 21, "active": true}}

    -- SIAC - Numeración específica
    factura_a_numero INTEGER DEFAULT 1,
    factura_b_numero INTEGER DEFAULT 1,
    factura_c_numero INTEGER DEFAULT 1,
    remito_numero INTEGER DEFAULT 1,
    recibo_numero INTEGER DEFAULT 1,

    -- SIAC - Configuración operativa
    punto_venta INTEGER DEFAULT 1,
    actividad_principal VARCHAR(200),
    descuento_maximo DECIMAL(5,2) DEFAULT 0,
    recargo_maximo DECIMAL(5,2) DEFAULT 0,

    -- Estado
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(company_id),
    CHECK (punto_venta > 0 AND punto_venta <= 9999),
    CHECK (descuento_maximo >= 0 AND descuento_maximo <= 100),
    CHECK (recargo_maximo >= 0 AND recargo_maximo <= 100)
);

-- Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_tax_templates_country ON tax_templates(country_code);
CREATE INDEX IF NOT EXISTS idx_tax_conditions_template ON tax_conditions(tax_template_id);
CREATE INDEX IF NOT EXISTS idx_tax_concepts_template_order ON tax_concepts(tax_template_id, calculation_order);
CREATE INDEX IF NOT EXISTS idx_tax_rates_concept ON tax_rates(tax_concept_id);
CREATE INDEX IF NOT EXISTS idx_company_tax_config_company ON company_tax_config(company_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_tax_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tax_templates_updated_at
    BEFORE UPDATE ON tax_templates
    FOR EACH ROW EXECUTE FUNCTION update_tax_updated_at();

CREATE TRIGGER trigger_tax_concepts_updated_at
    BEFORE UPDATE ON tax_concepts
    FOR EACH ROW EXECUTE FUNCTION update_tax_updated_at();

CREATE TRIGGER trigger_company_tax_config_updated_at
    BEFORE UPDATE ON company_tax_config
    FOR EACH ROW EXECUTE FUNCTION update_tax_updated_at();

-- Función para obtener configuración fiscal completa de una empresa
CREATE OR REPLACE FUNCTION get_company_tax_configuration(p_company_id INTEGER)
RETURNS TABLE(
    template_country VARCHAR,
    template_name VARCHAR,
    tax_id_format VARCHAR,
    tax_id_field_name VARCHAR,
    currencies JSONB,
    conditions JSONB,
    concepts JSONB,
    company_config JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tt.country,
        tt.template_name,
        tt.tax_id_format,
        tt.tax_id_field_name,
        tt.currencies,

        -- Condiciones disponibles
        (SELECT json_agg(
            json_build_object(
                'code', tc.condition_code,
                'name', tc.condition_name,
                'description', tc.description
            ) ORDER BY tc.display_order
        ) FROM tax_conditions tc WHERE tc.tax_template_id = tt.id AND tc.is_active = true),

        -- Conceptos con alícuotas
        (SELECT json_agg(
            json_build_object(
                'code', tcon.concept_code,
                'name', tcon.concept_name,
                'order', tcon.calculation_order,
                'base_amount', tcon.base_amount,
                'type', tcon.concept_type,
                'rates', (
                    SELECT json_agg(
                        json_build_object(
                            'code', tr.rate_code,
                            'name', tr.rate_name,
                            'percentage', tr.rate_percentage,
                            'is_default', tr.is_default
                        ) ORDER BY tr.rate_percentage
                    ) FROM tax_rates tr
                    WHERE tr.tax_concept_id = tcon.id AND tr.is_active = true
                )
            ) ORDER BY tcon.calculation_order
        ) FROM tax_concepts tcon WHERE tcon.tax_template_id = tt.id AND tcon.is_active = true),

        -- Configuración específica de la empresa
        (SELECT json_build_object(
            'custom_tax_id', ctc.custom_tax_id,
            'custom_condition', ctc.custom_condition_code,
            'factura_a_numero', ctc.factura_a_numero,
            'factura_b_numero', ctc.factura_b_numero,
            'factura_c_numero', ctc.factura_c_numero,
            'remito_numero', ctc.remito_numero,
            'recibo_numero', ctc.recibo_numero,
            'punto_venta', ctc.punto_venta,
            'actividad_principal', ctc.actividad_principal,
            'descuento_maximo', ctc.descuento_maximo,
            'recargo_maximo', ctc.recargo_maximo,
            'concept_overrides', ctc.concept_overrides
        ) FROM company_tax_config ctc WHERE ctc.company_id = p_company_id)

    FROM tax_templates tt
    JOIN company_tax_config ctc ON ctc.tax_template_id = tt.id
    WHERE ctc.company_id = p_company_id AND tt.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Insertar plantillas básicas para arrancar
INSERT INTO tax_templates (country, country_code, template_name, tax_id_format, tax_id_field_name, currencies, default_currency) VALUES
('Argentina', 'ARG', 'Plantilla Fiscal Argentina', 'XX-XXXXXXXX-X', 'CUIT', '["ARS", "USD"]', 'ARS'),
('Uruguay', 'URY', 'Plantilla Fiscal Uruguay', 'XXXXXXXXXXXX', 'RUT', '["UYU", "USD"]', 'UYU'),
('Brasil', 'BRA', 'Plantilla Fiscal Brasil', 'XX.XXX.XXX/XXXX-XX', 'CNPJ', '["BRL", "USD"]', 'BRL')
ON CONFLICT (country_code) DO NOTHING;

-- Insertar condiciones para Argentina
INSERT INTO tax_conditions (tax_template_id, condition_code, condition_name, display_order)
SELECT tt.id, 'RI', 'Responsable Inscripto', 1 FROM tax_templates tt WHERE tt.country_code = 'ARG'
UNION ALL
SELECT tt.id, 'RM', 'Responsable Monotributo', 2 FROM tax_templates tt WHERE tt.country_code = 'ARG'
UNION ALL
SELECT tt.id, 'EX', 'Exento', 3 FROM tax_templates tt WHERE tt.country_code = 'ARG'
UNION ALL
SELECT tt.id, 'NI', 'No Inscripto', 4 FROM tax_templates tt WHERE tt.country_code = 'ARG'
ON CONFLICT (tax_template_id, condition_code) DO NOTHING;

COMMIT;