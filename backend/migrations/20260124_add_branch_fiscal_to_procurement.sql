-- ============================================================================
-- Migración: Agregar branch_id y country_code al circuito P2P
-- Fecha: 2026-01-24
-- Propósito: Soportar compliance fiscal por sucursal (multi-país)
-- SSOT: TaxTemplate (tax_templates → tax_conditions → tax_concepts → tax_rates)
-- ============================================================================

BEGIN;

-- 1. Agregar branch_id a procurement_orders (nullable = backward compatible)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'procurement_orders' AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE procurement_orders
            ADD COLUMN branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL;

        CREATE INDEX idx_procurement_orders_branch_id
            ON procurement_orders(branch_id) WHERE branch_id IS NOT NULL;

        COMMENT ON COLUMN procurement_orders.branch_id IS
            'Sucursal que emite la OC. Determina país/provincia para compliance fiscal.';
    END IF;
END $$;

-- 2. Agregar branch_id a procurement_invoices (nullable = backward compatible)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'procurement_invoices' AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE procurement_invoices
            ADD COLUMN branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL;

        CREATE INDEX idx_procurement_invoices_branch_id
            ON procurement_invoices(branch_id) WHERE branch_id IS NOT NULL;

        COMMENT ON COLUMN procurement_invoices.branch_id IS
            'Sucursal receptora de la factura. Determina régimen fiscal aplicable.';
    END IF;
END $$;

-- 3. Agregar country_code a procurement_accounting_config
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'procurement_accounting_config' AND column_name = 'country_code'
    ) THEN
        ALTER TABLE procurement_accounting_config
            ADD COLUMN country_code VARCHAR(3) DEFAULT 'AR';

        COMMENT ON COLUMN procurement_accounting_config.country_code IS
            'ISO alpha-2 del país. Permite configurar cuentas contables diferenciadas por país.';
    END IF;
END $$;

-- 4. Agregar campo fiscal_country_code a finance_payment_orders (para tracking)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'finance_payment_orders' AND column_name = 'fiscal_country_code'
    ) THEN
        ALTER TABLE finance_payment_orders
            ADD COLUMN fiscal_country_code VARCHAR(3) DEFAULT 'AR';

        COMMENT ON COLUMN finance_payment_orders.fiscal_country_code IS
            'País fiscal aplicado al calcular retenciones. Trazabilidad de qué strategy se usó.';
    END IF;
END $$;

-- 5. Seed: Asegurar que existe TaxTemplate para Argentina
INSERT INTO tax_templates (country, country_code, template_name, tax_id_format, tax_id_field_name,
                           tax_id_validation_regex, currencies, default_currency, is_active, created_at, updated_at)
SELECT 'Argentina', 'AR', 'Argentina - Régimen General', 'XX-XXXXXXXX-X', 'CUIT',
       '^\d{2}-?\d{8}-?\d{1}$', '["ARS","USD"]'::jsonb, 'ARS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM tax_templates WHERE country_code = 'AR');

-- 6. Seed: Condiciones fiscales AR (si no existen)
DO $$
DECLARE
    ar_template_id INTEGER;
BEGIN
    SELECT id INTO ar_template_id FROM tax_templates WHERE country_code = 'AR' LIMIT 1;
    IF ar_template_id IS NOT NULL THEN
        INSERT INTO tax_conditions (tax_template_id, condition_code, condition_name, description, display_order, is_active, created_at)
        SELECT ar_template_id, v.code, v.name, v.desc, v.ord, true, NOW()
        FROM (VALUES
            ('RI', 'Responsable Inscripto', 'Contribuyente inscripto en IVA', 1),
            ('MONO', 'Monotributista', 'Régimen Simplificado para Pequeños Contribuyentes', 2),
            ('EX', 'Exento', 'Exento de IVA', 3),
            ('CF', 'Consumidor Final', 'Consumidor Final', 4)
        ) AS v(code, name, desc, ord)
        WHERE NOT EXISTS (
            SELECT 1 FROM tax_conditions WHERE tax_template_id = ar_template_id AND condition_code = v.code
        );
    END IF;
END $$;

-- 7. Seed: Conceptos impositivos AR (IVA + Retenciones)
DO $$
DECLARE
    ar_template_id INTEGER;
    concept_id INTEGER;
BEGIN
    SELECT id INTO ar_template_id FROM tax_templates WHERE country_code = 'AR' LIMIT 1;
    IF ar_template_id IS NULL THEN RETURN; END IF;

    -- IVA
    INSERT INTO tax_concepts (tax_template_id, concept_code, concept_name, calculation_order, base_amount, concept_type, is_percentage, is_mandatory, is_active, created_at, updated_at)
    SELECT ar_template_id, 'IVA', 'Impuesto al Valor Agregado', 1, 'neto_final', 'tax', true, true, true, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM tax_concepts WHERE tax_template_id = ar_template_id AND concept_code = 'IVA');

    SELECT id INTO concept_id FROM tax_concepts WHERE tax_template_id = ar_template_id AND concept_code = 'IVA';
    IF concept_id IS NOT NULL THEN
        INSERT INTO tax_rates (tax_concept_id, rate_code, rate_name, rate_percentage, is_default, applicable_conditions, is_active, created_at)
        SELECT concept_id, v.code, v.name, v.rate, v.def, v.conds::jsonb, true, NOW()
        FROM (VALUES
            ('IVA_21', 'IVA 21%', 21.00, true, '["RI"]'),
            ('IVA_10_5', 'IVA 10.5%', 10.50, false, '["RI"]'),
            ('IVA_27', 'IVA 27%', 27.00, false, '["RI"]'),
            ('IVA_0', 'IVA 0%', 0.00, false, '["EX","MONO","CF"]')
        ) AS v(code, name, rate, def, conds)
        WHERE NOT EXISTS (SELECT 1 FROM tax_rates WHERE tax_concept_id = concept_id AND rate_code = v.code);
    END IF;

    -- Retención Ganancias
    INSERT INTO tax_concepts (tax_template_id, concept_code, concept_name, calculation_order, base_amount, concept_type, is_percentage, is_mandatory, is_active, created_at, updated_at)
    SELECT ar_template_id, 'RET_GANANCIAS', 'Retención Impuesto a las Ganancias', 2, 'neto_final', 'retention', true, false, true, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM tax_concepts WHERE tax_template_id = ar_template_id AND concept_code = 'RET_GANANCIAS');

    SELECT id INTO concept_id FROM tax_concepts WHERE tax_template_id = ar_template_id AND concept_code = 'RET_GANANCIAS';
    IF concept_id IS NOT NULL THEN
        INSERT INTO tax_rates (tax_concept_id, rate_code, rate_name, rate_percentage, is_default, applicable_conditions, is_active, created_at)
        SELECT concept_id, v.code, v.name, v.rate, v.def, v.conds::jsonb, true, NOW()
        FROM (VALUES
            ('RET_GAN_BIENES', 'Retención Ganancias Bienes', 2.00, true, '["goods","consumables","raw_materials"]'),
            ('RET_GAN_SERVICIOS', 'Retención Ganancias Servicios', 6.00, false, '["services","utilities"]')
        ) AS v(code, name, rate, def, conds)
        WHERE NOT EXISTS (SELECT 1 FROM tax_rates WHERE tax_concept_id = concept_id AND rate_code = v.code);
    END IF;

    -- Retención IVA
    INSERT INTO tax_concepts (tax_template_id, concept_code, concept_name, calculation_order, base_amount, concept_type, is_percentage, is_mandatory, is_active, created_at, updated_at)
    SELECT ar_template_id, 'RET_IVA', 'Retención IVA', 3, 'tax_amount', 'retention', true, false, true, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM tax_concepts WHERE tax_template_id = ar_template_id AND concept_code = 'RET_IVA');

    SELECT id INTO concept_id FROM tax_concepts WHERE tax_template_id = ar_template_id AND concept_code = 'RET_IVA';
    IF concept_id IS NOT NULL THEN
        INSERT INTO tax_rates (tax_concept_id, rate_code, rate_name, rate_percentage, minimum_amount, is_default, is_active, created_at)
        SELECT concept_id, 'RET_IVA_50', 'Retención 50% IVA', 50.00, 18000, true, true, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM tax_rates WHERE tax_concept_id = concept_id AND rate_code = 'RET_IVA_50');
    END IF;

    -- Retención IIBB
    INSERT INTO tax_concepts (tax_template_id, concept_code, concept_name, calculation_order, base_amount, concept_type, is_percentage, is_mandatory, is_active, created_at, updated_at)
    SELECT ar_template_id, 'RET_IIBB', 'Retención Ingresos Brutos', 4, 'neto_final', 'retention', true, false, true, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM tax_concepts WHERE tax_template_id = ar_template_id AND concept_code = 'RET_IIBB');

    SELECT id INTO concept_id FROM tax_concepts WHERE tax_template_id = ar_template_id AND concept_code = 'RET_IIBB';
    IF concept_id IS NOT NULL THEN
        INSERT INTO tax_rates (tax_concept_id, rate_code, rate_name, rate_percentage, is_default, applicable_conditions, is_active, created_at)
        SELECT concept_id, v.code, v.name, v.rate, v.def, v.conds::jsonb, true, NOW()
        FROM (VALUES
            ('IIBB_BSAS', 'IIBB Buenos Aires', 3.50, false, '["Buenos Aires"]'),
            ('IIBB_CABA', 'IIBB CABA', 3.00, true, '["CABA"]'),
            ('IIBB_CORDOBA', 'IIBB Córdoba', 3.00, false, '["Córdoba"]'),
            ('IIBB_SANTA_FE', 'IIBB Santa Fe', 3.60, false, '["Santa Fe"]'),
            ('IIBB_MENDOZA', 'IIBB Mendoza', 2.50, false, '["Mendoza"]'),
            ('IIBB_GENERAL', 'IIBB General', 3.00, false, '["general"]')
        ) AS v(code, name, rate, def, conds)
        WHERE NOT EXISTS (SELECT 1 FROM tax_rates WHERE tax_concept_id = concept_id AND rate_code = v.code);
    END IF;

    -- Retención SUSS
    INSERT INTO tax_concepts (tax_template_id, concept_code, concept_name, calculation_order, base_amount, concept_type, is_percentage, is_mandatory, is_active, created_at, updated_at)
    SELECT ar_template_id, 'RET_SUSS', 'Retención SUSS', 5, 'neto_final', 'retention', true, false, true, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM tax_concepts WHERE tax_template_id = ar_template_id AND concept_code = 'RET_SUSS');

    SELECT id INTO concept_id FROM tax_concepts WHERE tax_template_id = ar_template_id AND concept_code = 'RET_SUSS';
    IF concept_id IS NOT NULL THEN
        INSERT INTO tax_rates (tax_concept_id, rate_code, rate_name, rate_percentage, minimum_amount, is_default, applicable_conditions, is_active, created_at)
        SELECT concept_id, 'RET_SUSS_2', 'Retención SUSS 2%', 2.00, 50000, true, '["services"]'::jsonb, true, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM tax_rates WHERE tax_concept_id = concept_id AND rate_code = 'RET_SUSS_2');
    END IF;
END $$;

COMMIT;
