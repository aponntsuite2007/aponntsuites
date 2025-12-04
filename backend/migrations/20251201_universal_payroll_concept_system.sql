-- ============================================================================
-- MIGRACIÓN: Sistema Universal de Conceptos de Nómina
-- Fecha: 2025-12-01
-- Versión: 5.0.0
--
-- OBJETIVO: Transformar el sistema de conceptos Argentina-céntrico a uno
--           verdaderamente universal que funcione para cualquier país.
--
-- BASADO EN: Estándares internacionales (ADP, Oyster, Remote.com)
--   - Pre-tax vs Post-tax deductions
--   - Mandatory vs Voluntary
--   - Employee vs Employer contributions
--   - Remunerative vs Non-remunerative
--   - Proportional vs Fixed
-- ============================================================================

-- ============================================================================
-- 1. NUEVA TABLA: payroll_concept_classifications
-- Clasificación base UNIVERSAL (inmutable, solo 4 tipos fundamentales)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_concept_classifications (
    id SERIAL PRIMARY KEY,

    classification_code VARCHAR(30) NOT NULL UNIQUE,
    classification_name VARCHAR(100) NOT NULL,

    -- Descripción multi-idioma (JSONB)
    descriptions JSONB DEFAULT '{}',
    -- Ejemplo: {"en": "...", "es": "...", "pt": "...", "fr": "..."}

    -- Efecto en la liquidación
    sign INTEGER NOT NULL,  -- +1 = suma, -1 = resta, 0 = informativo
    affects_employee_net BOOLEAN NOT NULL DEFAULT false,
    affects_employer_cost BOOLEAN NOT NULL DEFAULT false,

    -- Orden de cálculo
    calculation_order INTEGER NOT NULL DEFAULT 0,

    is_system BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Las 4 clasificaciones universales fundamentales
INSERT INTO payroll_concept_classifications
(classification_code, classification_name, descriptions, sign, affects_employee_net, affects_employer_cost, calculation_order, is_system)
VALUES
('GROSS_EARNING', 'Gross Earning',
 '{"en": "Amount added to employee gross pay", "es": "Monto que se suma al bruto del empleado", "pt": "Valor adicionado ao bruto do funcionário"}',
 1, true, false, 1, true),

('EMPLOYEE_DEDUCTION', 'Employee Deduction',
 '{"en": "Amount deducted from employee pay", "es": "Monto descontado del sueldo del empleado", "pt": "Valor descontado do salário do funcionário"}',
 -1, true, false, 2, true),

('EMPLOYER_CONTRIBUTION', 'Employer Contribution',
 '{"en": "Amount paid by employer (not deducted from employee)", "es": "Monto pagado por el empleador (no se descuenta al empleado)", "pt": "Valor pago pelo empregador (não descontado do funcionário)"}',
 0, false, true, 3, true),

('INFORMATIVE', 'Informative Only',
 '{"en": "Displayed for information, no monetary effect", "es": "Solo informativo, sin efecto monetario", "pt": "Apenas informativo, sem efeito monetário"}',
 0, false, false, 4, true)
ON CONFLICT (classification_code) DO NOTHING;

-- ============================================================================
-- 2. AGREGAR CAMPOS UNIVERSALES A payroll_concept_types
-- ============================================================================

-- Scope (país/empresa)
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS country_id INTEGER REFERENCES payroll_countries(id);
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(company_id);

-- Clasificación base
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS classification_id INTEGER REFERENCES payroll_concept_classifications(id);

-- Comportamiento fiscal y legal
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS is_remunerative BOOLEAN DEFAULT true;
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS is_pre_tax BOOLEAN DEFAULT false;
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT false;
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS is_social_security_base BOOLEAN DEFAULT true;

-- Proporcionalidad
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS is_proportional_to_time BOOLEAN DEFAULT true;
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS is_one_time BOOLEAN DEFAULT false;

-- Tasas por defecto (parametrizables)
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS default_employee_rate DECIMAL(8,4) DEFAULT 0;
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS default_employer_rate DECIMAL(8,4) DEFAULT 0;
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS rate_ceiling DECIMAL(15,2);

-- Base de cálculo
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS calculation_base_type VARCHAR(30) DEFAULT 'GROSS';
-- Opciones: GROSS, NET, BASIC, TAXABLE, SOCIAL_SECURITY_BASE, CUSTOM

-- Sistema de ayuda contextual
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS help_tooltip VARCHAR(200);
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS help_detailed TEXT;
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS legal_reference TEXT;
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS examples_by_country JSONB DEFAULT '{}';
-- Ejemplo: {"ARG": "Ej: Jubilación 11%", "MEX": "Ej: IMSS 2.375%", "USA": "Ex: Social Security 6.2%"}

-- Ícono y color para UI
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS icon_name VARCHAR(50);
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS color_hex VARCHAR(7);

-- Nombre localizado
ALTER TABLE payroll_concept_types ADD COLUMN IF NOT EXISTS names_by_locale JSONB DEFAULT '{}';
-- Ejemplo: {"es": "Jubilación", "en": "Retirement", "pt": "Aposentadoria"}

-- Índices
CREATE INDEX IF NOT EXISTS idx_concept_types_country ON payroll_concept_types(country_id);
CREATE INDEX IF NOT EXISTS idx_concept_types_company ON payroll_concept_types(company_id);
CREATE INDEX IF NOT EXISTS idx_concept_types_classification ON payroll_concept_types(classification_id);

-- ============================================================================
-- 3. ACTUALIZAR TIPOS EXISTENTES CON CLASIFICACIÓN
-- ============================================================================

-- Mapear tipos existentes a clasificaciones
UPDATE payroll_concept_types SET classification_id = (
    SELECT id FROM payroll_concept_classifications WHERE classification_code = 'GROSS_EARNING'
) WHERE type_code IN ('EARNING', 'EARNING_FIXED', 'EARNING_VARIABLE', 'EARNING_SENIORITY', 'EARNING_ATTENDANCE', 'NON_REMUN_FIXED', 'NON_REMUN_VARIABLE', 'NON_REMUN_TRAVEL', 'NON_REMUN_FOOD');

UPDATE payroll_concept_types SET classification_id = (
    SELECT id FROM payroll_concept_classifications WHERE classification_code = 'EMPLOYEE_DEDUCTION'
) WHERE type_code IN ('DEDUCTION', 'DEDUCTION_RETIREMENT', 'DEDUCTION_HEALTH', 'DEDUCTION_UNION', 'DEDUCTION_TAX', 'DEDUCTION_OTHER');

UPDATE payroll_concept_types SET classification_id = (
    SELECT id FROM payroll_concept_classifications WHERE classification_code = 'EMPLOYER_CONTRIBUTION'
) WHERE type_code IN ('EMPLOYER', 'EMPLOYER_RETIREMENT', 'EMPLOYER_HEALTH', 'EMPLOYER_RISK', 'EMPLOYER_FAMILY', 'EMPLOYER_OTHER');

-- Configurar is_remunerative para no remunerativos
UPDATE payroll_concept_types SET is_remunerative = false
WHERE type_code LIKE 'NON_REMUN%';

-- Configurar tasas por defecto argentinas
UPDATE payroll_concept_types SET
    default_employee_rate = 11,
    is_mandatory = true,
    is_pre_tax = true,
    help_tooltip = 'Aporte obligatorio al sistema jubilatorio',
    legal_reference = 'Ley 24.241 - Sistema Integrado de Jubilaciones y Pensiones'
WHERE type_code = 'DEDUCTION_RETIREMENT';

UPDATE payroll_concept_types SET
    default_employee_rate = 3,
    is_mandatory = true,
    is_pre_tax = true,
    help_tooltip = 'Aporte obligatorio a obra social',
    legal_reference = 'Ley 23.660 - Obras Sociales'
WHERE type_code = 'DEDUCTION_HEALTH';

UPDATE payroll_concept_types SET
    default_employer_rate = 10.17,
    is_mandatory = true,
    help_tooltip = 'Contribución patronal jubilación',
    legal_reference = 'Ley 24.241'
WHERE type_code = 'EMPLOYER_RETIREMENT';

UPDATE payroll_concept_types SET
    default_employer_rate = 6,
    is_mandatory = true,
    help_tooltip = 'Contribución patronal obra social',
    legal_reference = 'Ley 23.660'
WHERE type_code = 'EMPLOYER_HEALTH';

-- ============================================================================
-- 4. CREAR TIPOS BASE UNIVERSALES (sin terminología de país)
-- ============================================================================

INSERT INTO payroll_concept_types
(type_code, type_name, description, classification_id, is_deduction, is_employer_cost, is_taxable,
 is_remunerative, is_mandatory, is_pre_tax, default_employee_rate, default_employer_rate,
 help_tooltip, help_detailed, icon_name, color_hex, display_order, names_by_locale, is_active)
VALUES
-- === EARNINGS (Haberes) - UNIVERSAL ===
('BASIC_SALARY', 'Basic Salary', 'Base salary before any additions',
 (SELECT id FROM payroll_concept_classifications WHERE classification_code = 'GROSS_EARNING'),
 false, false, true, true, true, false, 0, 0,
 'The contractual base salary',
 'The fixed amount agreed upon in the employment contract. This is the base for most calculations.',
 'wallet', '#10B981', 1,
 '{"es": "Salario Base", "en": "Basic Salary", "pt": "Salário Base", "fr": "Salaire de Base"}', true),

('OVERTIME_REGULAR', 'Regular Overtime', 'Hours worked beyond standard schedule',
 (SELECT id FROM payroll_concept_classifications WHERE classification_code = 'GROSS_EARNING'),
 false, false, true, true, false, false, 0, 0,
 'Additional pay for overtime hours',
 'Compensation for hours worked beyond the standard work schedule. Rate varies by country law.',
 'clock', '#F59E0B', 5,
 '{"es": "Horas Extra", "en": "Overtime", "pt": "Horas Extras", "fr": "Heures Supplémentaires"}', true),

('BONUS_PERFORMANCE', 'Performance Bonus', 'Variable compensation based on performance',
 (SELECT id FROM payroll_concept_classifications WHERE classification_code = 'GROSS_EARNING'),
 false, false, true, true, false, false, 0, 0,
 'Bonus based on individual or company performance',
 'Variable compensation tied to achieving specific goals or metrics.',
 'trophy', '#EAB308', 10,
 '{"es": "Bono por Desempeño", "en": "Performance Bonus", "pt": "Bônus de Desempenho", "fr": "Prime de Performance"}', true),

('ALLOWANCE_TRANSPORT', 'Transport Allowance', 'Compensation for commuting expenses',
 (SELECT id FROM payroll_concept_classifications WHERE classification_code = 'GROSS_EARNING'),
 false, false, false, false, false, false, 0, 0,
 'Allowance for transportation costs',
 'Amount provided to cover commuting or transportation expenses. Tax treatment varies by country.',
 'car', '#6366F1', 15,
 '{"es": "Viáticos Transporte", "en": "Transport Allowance", "pt": "Vale Transporte", "fr": "Indemnité Transport"}', true),

('ALLOWANCE_MEAL', 'Meal Allowance', 'Compensation for food expenses',
 (SELECT id FROM payroll_concept_classifications WHERE classification_code = 'GROSS_EARNING'),
 false, false, false, false, false, false, 0, 0,
 'Allowance for meal expenses',
 'Amount provided to cover food expenses during work. Tax treatment varies by country.',
 'utensils', '#14B8A6', 16,
 '{"es": "Viáticos Comida", "en": "Meal Allowance", "pt": "Vale Refeição", "fr": "Tickets Restaurant"}', true),

-- === EMPLOYEE DEDUCTIONS - UNIVERSAL ===
('PENSION_EMPLOYEE', 'Pension Contribution (Employee)', 'Employee contribution to pension/retirement fund',
 (SELECT id FROM payroll_concept_classifications WHERE classification_code = 'EMPLOYEE_DEDUCTION'),
 true, false, false, true, true, true, 0, 0,
 'Your contribution to retirement savings',
 'Mandatory or voluntary contribution to your pension/retirement fund. Rate varies by country.',
 'piggy-bank', '#8B5CF6', 50,
 '{"es": "Aporte Jubilación", "en": "Pension Contribution", "pt": "Contribuição Previdência", "fr": "Cotisation Retraite"}', true),

('HEALTH_EMPLOYEE', 'Health Insurance (Employee)', 'Employee contribution to health insurance',
 (SELECT id FROM payroll_concept_classifications WHERE classification_code = 'EMPLOYEE_DEDUCTION'),
 true, false, false, true, true, true, 0, 0,
 'Your contribution to health coverage',
 'Contribution to public or private health insurance system.',
 'heart', '#EF4444', 51,
 '{"es": "Aporte Salud", "en": "Health Insurance", "pt": "Plano de Saúde", "fr": "Assurance Maladie"}', true),

('INCOME_TAX', 'Income Tax Withholding', 'Tax withheld from earnings',
 (SELECT id FROM payroll_concept_classifications WHERE classification_code = 'EMPLOYEE_DEDUCTION'),
 true, false, false, true, true, false, 0, 0,
 'Income tax withheld from your pay',
 'Tax withheld by employer and remitted to tax authority on your behalf.',
 'receipt-tax', '#10B981', 52,
 '{"es": "Impuesto a la Renta", "en": "Income Tax", "pt": "Imposto de Renda", "fr": "Impôt sur le Revenu"}', true),

('UNION_DUES', 'Union Dues', 'Contribution to labor union',
 (SELECT id FROM payroll_concept_classifications WHERE classification_code = 'EMPLOYEE_DEDUCTION'),
 true, false, false, true, false, true, 0, 0,
 'Your union membership fee',
 'Voluntary or mandatory contribution to your labor union.',
 'users', '#F97316', 55,
 '{"es": "Cuota Sindical", "en": "Union Dues", "pt": "Contribuição Sindical", "fr": "Cotisation Syndicale"}', true),

('LOAN_REPAYMENT', 'Loan Repayment', 'Deduction for employer-provided loan',
 (SELECT id FROM payroll_concept_classifications WHERE classification_code = 'EMPLOYEE_DEDUCTION'),
 true, false, false, false, false, false, 0, 0,
 'Repayment of company loan or advance',
 'Scheduled repayment of loans or advances provided by the employer.',
 'credit-card', '#64748B', 60,
 '{"es": "Descuento Préstamo", "en": "Loan Repayment", "pt": "Desconto Empréstimo", "fr": "Remboursement Prêt"}', true),

('GARNISHMENT', 'Wage Garnishment', 'Court-ordered wage deduction',
 (SELECT id FROM payroll_concept_classifications WHERE classification_code = 'EMPLOYEE_DEDUCTION'),
 true, false, false, false, true, false, 0, 0,
 'Legally mandated wage deduction',
 'Deduction required by court order for child support, alimony, tax debt, or other obligations.',
 'gavel', '#991B1B', 65,
 '{"es": "Embargo Judicial", "en": "Garnishment", "pt": "Penhora Judicial", "fr": "Saisie sur Salaire"}', true),

-- === EMPLOYER CONTRIBUTIONS - UNIVERSAL ===
('PENSION_EMPLOYER', 'Pension Contribution (Employer)', 'Employer contribution to pension fund',
 (SELECT id FROM payroll_concept_classifications WHERE classification_code = 'EMPLOYER_CONTRIBUTION'),
 false, true, false, false, true, false, 0, 0,
 'Employer contribution to your retirement',
 'Amount your employer contributes to your pension/retirement fund on your behalf.',
 'building', '#7C3AED', 70,
 '{"es": "Contrib. Patronal Jubilación", "en": "Employer Pension", "pt": "Contribuição Patronal INSS", "fr": "Cotisation Patronale Retraite"}', true),

('HEALTH_EMPLOYER', 'Health Insurance (Employer)', 'Employer contribution to health insurance',
 (SELECT id FROM payroll_concept_classifications WHERE classification_code = 'EMPLOYER_CONTRIBUTION'),
 false, true, false, false, true, false, 0, 0,
 'Employer contribution to health coverage',
 'Amount your employer contributes to health insurance on your behalf.',
 'heart-pulse', '#DC2626', 71,
 '{"es": "Contrib. Patronal Salud", "en": "Employer Health", "pt": "Contribuição Patronal Saúde", "fr": "Cotisation Patronale Santé"}', true),

('WORKERS_COMP', 'Workers Compensation Insurance', 'Insurance for workplace injuries',
 (SELECT id FROM payroll_concept_classifications WHERE classification_code = 'EMPLOYER_CONTRIBUTION'),
 false, true, false, false, true, false, 0, 0,
 'Insurance covering workplace injuries',
 'Employer-paid insurance providing benefits for work-related injuries or illnesses.',
 'shield-check', '#3B82F6', 72,
 '{"es": "Seguro Riesgos Trabajo", "en": "Workers Comp", "pt": "Seguro Acidente Trabalho", "fr": "Assurance Accidents Travail"}', true),

('UNEMPLOYMENT_EMPLOYER', 'Unemployment Insurance (Employer)', 'Contribution to unemployment fund',
 (SELECT id FROM payroll_concept_classifications WHERE classification_code = 'EMPLOYER_CONTRIBUTION'),
 false, true, false, false, true, false, 0, 0,
 'Employer unemployment fund contribution',
 'Employer contribution to the unemployment insurance system.',
 'briefcase-medical', '#EC4899', 73,
 '{"es": "Seguro Desempleo", "en": "Unemployment Insurance", "pt": "Seguro Desemprego", "fr": "Assurance Chômage"}', true)

ON CONFLICT (type_code) DO UPDATE SET
    names_by_locale = EXCLUDED.names_by_locale,
    help_tooltip = EXCLUDED.help_tooltip,
    help_detailed = EXCLUDED.help_detailed,
    icon_name = EXCLUDED.icon_name,
    color_hex = EXCLUDED.color_hex;

-- ============================================================================
-- 5. TABLA: payroll_concept_type_rates (Tasas por país)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_concept_type_rates (
    id SERIAL PRIMARY KEY,
    concept_type_id INTEGER NOT NULL REFERENCES payroll_concept_types(id),
    country_id INTEGER REFERENCES payroll_countries(id),

    -- Tasas
    employee_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
    employer_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
    rate_ceiling DECIMAL(15,2),
    rate_floor DECIMAL(15,2),

    -- Base de cálculo
    calculation_base VARCHAR(30) DEFAULT 'GROSS',
    -- GROSS, NET, BASIC, TAXABLE, SOCIAL_SECURITY_BASE, CUSTOM

    -- Fechas de vigencia
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,

    -- Referencia legal
    legal_reference TEXT,
    legal_url VARCHAR(500),

    -- Ayuda contextual específica del país
    help_text TEXT,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(concept_type_id, country_id, effective_from)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_concept_rates_type ON payroll_concept_type_rates(concept_type_id);
CREATE INDEX IF NOT EXISTS idx_concept_rates_country ON payroll_concept_type_rates(country_id);
CREATE INDEX IF NOT EXISTS idx_concept_rates_effective ON payroll_concept_type_rates(effective_from, effective_to);

COMMENT ON TABLE payroll_concept_type_rates IS 'Tasas de conceptos por país con historial de vigencia';

-- ============================================================================
-- 6. INSERTAR TASAS POR PAÍS
-- ============================================================================

-- Argentina (ARG)
INSERT INTO payroll_concept_type_rates (concept_type_id, country_id, employee_rate, employer_rate, calculation_base, legal_reference, help_text)
SELECT
    pct.id,
    pc.id,
    CASE
        WHEN pct.type_code = 'PENSION_EMPLOYEE' THEN 11
        WHEN pct.type_code = 'HEALTH_EMPLOYEE' THEN 3
        ELSE 0
    END,
    CASE
        WHEN pct.type_code = 'PENSION_EMPLOYER' THEN 10.17
        WHEN pct.type_code = 'HEALTH_EMPLOYER' THEN 6
        WHEN pct.type_code = 'WORKERS_COMP' THEN 2.5  -- ART promedio
        ELSE 0
    END,
    'GROSS',
    CASE
        WHEN pct.type_code LIKE 'PENSION%' THEN 'Ley 24.241 - SIJP'
        WHEN pct.type_code LIKE 'HEALTH%' THEN 'Ley 23.660 - Obras Sociales'
        WHEN pct.type_code = 'WORKERS_COMP' THEN 'Ley 24.557 - ART'
        ELSE NULL
    END,
    CASE
        WHEN pct.type_code = 'PENSION_EMPLOYEE' THEN 'En Argentina, el aporte jubilatorio del empleado es 11% del bruto remunerativo'
        WHEN pct.type_code = 'HEALTH_EMPLOYEE' THEN 'Aporte a obra social: 3% del bruto. Puedes elegir tu obra social.'
        WHEN pct.type_code = 'PENSION_EMPLOYER' THEN 'Contribución patronal a jubilación: 10.17% del bruto'
        WHEN pct.type_code = 'HEALTH_EMPLOYER' THEN 'Contribución patronal a obra social: 6% del bruto'
        WHEN pct.type_code = 'WORKERS_COMP' THEN 'ART (Aseguradora de Riesgos del Trabajo): tasa variable según actividad'
        ELSE NULL
    END
FROM payroll_concept_types pct
CROSS JOIN payroll_countries pc
WHERE pc.country_code = 'ARG'
AND pct.type_code IN ('PENSION_EMPLOYEE', 'HEALTH_EMPLOYEE', 'PENSION_EMPLOYER', 'HEALTH_EMPLOYER', 'WORKERS_COMP')
ON CONFLICT DO NOTHING;

-- México (MEX)
INSERT INTO payroll_concept_type_rates (concept_type_id, country_id, employee_rate, employer_rate, calculation_base, legal_reference, help_text)
SELECT
    pct.id,
    pc.id,
    CASE
        WHEN pct.type_code = 'PENSION_EMPLOYEE' THEN 1.125  -- IMSS cuota obrera
        WHEN pct.type_code = 'HEALTH_EMPLOYEE' THEN 0.375  -- IMSS enfermedad
        ELSE 0
    END,
    CASE
        WHEN pct.type_code = 'PENSION_EMPLOYER' THEN 5.15  -- IMSS patronal
        WHEN pct.type_code = 'HEALTH_EMPLOYER' THEN 1.05  -- IMSS enfermedad
        WHEN pct.type_code = 'WORKERS_COMP' THEN 0.5  -- Riesgo trabajo clase I
        ELSE 0
    END,
    'GROSS',
    CASE
        WHEN pct.type_code LIKE '%' THEN 'Ley del Seguro Social - IMSS'
        ELSE NULL
    END,
    CASE
        WHEN pct.type_code = 'PENSION_EMPLOYEE' THEN 'Cuota obrera IMSS: 1.125% del SBC (Salario Base de Cotización)'
        WHEN pct.type_code = 'PENSION_EMPLOYER' THEN 'Cuota patronal IMSS para retiro: 5.15% del SBC'
        ELSE NULL
    END
FROM payroll_concept_types pct
CROSS JOIN payroll_countries pc
WHERE pc.country_code = 'MEX'
AND pct.type_code IN ('PENSION_EMPLOYEE', 'HEALTH_EMPLOYEE', 'PENSION_EMPLOYER', 'HEALTH_EMPLOYER', 'WORKERS_COMP')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. VISTA: Tipos de concepto con ayuda contextual por país
-- ============================================================================

DROP VIEW IF EXISTS v_concept_types_with_help;
CREATE OR REPLACE VIEW v_concept_types_with_help AS
SELECT
    pct.id,
    pct.type_code,
    pct.type_name,
    pct.description,
    pcc.classification_code,
    pcc.classification_name,
    pcc.sign as monetary_sign,
    pct.is_deduction,
    pct.is_employer_cost,
    pct.is_taxable,
    pct.is_remunerative,
    pct.is_mandatory,
    pct.is_pre_tax,
    pct.is_proportional_to_time,
    pct.calculation_base_type,
    pct.default_employee_rate,
    pct.default_employer_rate,
    pct.rate_ceiling,
    pct.icon_name,
    pct.color_hex,
    pct.help_tooltip,
    pct.help_detailed,
    pct.legal_reference,
    pct.names_by_locale,
    pct.examples_by_country,
    pct.display_order,
    pct.is_active,
    pct.country_id,
    pc.country_code,
    pc.country_name
FROM payroll_concept_types pct
LEFT JOIN payroll_concept_classifications pcc ON pct.classification_id = pcc.id
LEFT JOIN payroll_countries pc ON pct.country_id = pc.id
WHERE pct.is_active = true;

COMMENT ON VIEW v_concept_types_with_help IS 'Vista de tipos de concepto con toda la ayuda contextual';

-- ============================================================================
-- 8. FUNCIÓN: Obtener ayuda contextual para un concepto
-- ============================================================================

CREATE OR REPLACE FUNCTION get_concept_help(
    p_concept_type_id INTEGER,
    p_country_id INTEGER DEFAULT NULL,
    p_locale VARCHAR(5) DEFAULT 'es'
)
RETURNS TABLE (
    type_code VARCHAR(30),
    display_name VARCHAR(100),
    tooltip VARCHAR(200),
    detailed_help TEXT,
    legal_ref TEXT,
    employee_rate DECIMAL(8,4),
    employer_rate DECIMAL(8,4),
    rate_ceiling DECIMAL(15,2),
    calculation_base VARCHAR(30),
    country_specific_help TEXT,
    example TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pct.type_code,
        COALESCE(
            pct.names_by_locale->>p_locale,
            pct.type_name
        )::VARCHAR(100) as display_name,
        pct.help_tooltip,
        pct.help_detailed,
        COALESCE(pctr.legal_reference, pct.legal_reference),
        COALESCE(pctr.employee_rate, pct.default_employee_rate),
        COALESCE(pctr.employer_rate, pct.default_employer_rate),
        COALESCE(pctr.rate_ceiling, pct.rate_ceiling),
        COALESCE(pctr.calculation_base, pct.calculation_base_type),
        pctr.help_text,
        pct.examples_by_country->>(SELECT country_code FROM payroll_countries WHERE id = p_country_id)
    FROM payroll_concept_types pct
    LEFT JOIN payroll_concept_type_rates pctr ON (
        pct.id = pctr.concept_type_id
        AND pctr.country_id = p_country_id
        AND pctr.is_active = true
        AND CURRENT_DATE BETWEEN pctr.effective_from AND COALESCE(pctr.effective_to, '9999-12-31')
    )
    WHERE pct.id = p_concept_type_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. FUNCIÓN: Obtener todos los conceptos disponibles para un país
-- ============================================================================

CREATE OR REPLACE FUNCTION get_concept_types_for_country(
    p_country_id INTEGER,
    p_locale VARCHAR(5) DEFAULT 'es'
)
RETURNS TABLE (
    id INTEGER,
    type_code VARCHAR(30),
    display_name TEXT,
    classification_code VARCHAR(30),
    is_earning BOOLEAN,
    is_deduction BOOLEAN,
    is_employer_contribution BOOLEAN,
    is_remunerative BOOLEAN,
    is_mandatory BOOLEAN,
    employee_rate DECIMAL(8,4),
    employer_rate DECIMAL(8,4),
    rate_ceiling DECIMAL(15,2),
    icon_name VARCHAR(50),
    color_hex VARCHAR(7),
    tooltip VARCHAR(200),
    detailed_help TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pct.id,
        pct.type_code,
        COALESCE(pct.names_by_locale->>p_locale, pct.type_name)::TEXT,
        pcc.classification_code,
        (pcc.classification_code = 'GROSS_EARNING'),
        (pcc.classification_code = 'EMPLOYEE_DEDUCTION'),
        (pcc.classification_code = 'EMPLOYER_CONTRIBUTION'),
        pct.is_remunerative,
        pct.is_mandatory,
        COALESCE(pctr.employee_rate, pct.default_employee_rate),
        COALESCE(pctr.employer_rate, pct.default_employer_rate),
        COALESCE(pctr.rate_ceiling, pct.rate_ceiling),
        pct.icon_name,
        pct.color_hex,
        pct.help_tooltip,
        COALESCE(pctr.help_text, pct.help_detailed)
    FROM payroll_concept_types pct
    LEFT JOIN payroll_concept_classifications pcc ON pct.classification_id = pcc.id
    LEFT JOIN payroll_concept_type_rates pctr ON (
        pct.id = pctr.concept_type_id
        AND pctr.country_id = p_country_id
        AND pctr.is_active = true
        AND CURRENT_DATE BETWEEN pctr.effective_from AND COALESCE(pctr.effective_to, '9999-12-31')
    )
    WHERE pct.is_active = true
    AND (pct.country_id IS NULL OR pct.country_id = p_country_id)
    ORDER BY pcc.calculation_order, pct.display_order;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RESUMEN
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ Migración Sistema Universal de Conceptos v5.0';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 NUEVA ARQUITECTURA:';
    RAISE NOTICE '   - 4 clasificaciones base universales (GROSS_EARNING, EMPLOYEE_DEDUCTION, EMPLOYER_CONTRIBUTION, INFORMATIVE)';
    RAISE NOTICE '   - Tipos de concepto con scope por país/empresa';
    RAISE NOTICE '   - Tasas parametrizables por país con vigencia histórica';
    RAISE NOTICE '   - Nombres localizados (es, en, pt, fr)';
    RAISE NOTICE '   - Sistema de ayuda contextual integrado';
    RAISE NOTICE '';
    RAISE NOTICE '🌍 SOPORTE INTERNACIONAL:';
    RAISE NOTICE '   - Pre-tax vs Post-tax deductions';
    RAISE NOTICE '   - Mandatory vs Voluntary';
    RAISE NOTICE '   - Remunerative vs Non-remunerative';
    RAISE NOTICE '   - Employee rate + Employer rate independientes';
    RAISE NOTICE '   - Topes/techos configurables';
    RAISE NOTICE '';
    RAISE NOTICE '💡 AYUDA CONTEXTUAL:';
    RAISE NOTICE '   - Tooltip corto para cada concepto';
    RAISE NOTICE '   - Ayuda detallada por país';
    RAISE NOTICE '   - Referencias legales con URLs';
    RAISE NOTICE '   - Ejemplos por país';
END $$;
