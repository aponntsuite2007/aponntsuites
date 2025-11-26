-- ============================================================================
-- MIGRACIÓN: Sistema de Liquidación de Sueldos 100% Parametrizable
-- Fecha: 2025-11-26
-- Versión: 3.0.0
-- ============================================================================
--
-- ARQUITECTURA DE AISLAMIENTO:
-- 1. PAÍS (configuración legal por país)
-- 2. EMPRESA (multi-tenant)
-- 3. SUCURSAL (branch, puede estar en distintos países)
-- 4. CONVENIO LABORAL (parametrizable por país)
-- 5. PLANTILLA REMUNERATIVA (template reutilizable)
-- 6. CONCEPTOS (haberes, deducciones, no remunerativos, aportes)
-- 7. USUARIO (asignación de plantilla + overrides individuales)
-- ============================================================================

-- ============================================================================
-- 1. CONFIGURACIÓN DE PAÍSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS payroll_countries (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL UNIQUE,  -- ISO 3166-1 alpha-3 (ARG, USA, BRA, etc.)
    country_name VARCHAR(100) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,  -- ISO 4217 (ARS, USD, BRL, etc.)
    currency_symbol VARCHAR(10) DEFAULT '$',
    decimal_places INTEGER DEFAULT 2,
    thousand_separator VARCHAR(1) DEFAULT '.',
    decimal_separator VARCHAR(1) DEFAULT ',',

    -- Configuración legal
    labor_law_name VARCHAR(200),  -- "Ley de Contrato de Trabajo" en Argentina
    labor_law_reference VARCHAR(500),  -- Referencias legales
    collective_agreement_name VARCHAR(100) DEFAULT 'Convenio Colectivo de Trabajo',  -- Como se llama el CCT en ese país

    -- Configuración de períodos
    default_pay_frequency VARCHAR(20) DEFAULT 'monthly',  -- weekly, biweekly, monthly
    fiscal_year_start_month INTEGER DEFAULT 1,  -- Enero
    aguinaldo_enabled BOOLEAN DEFAULT false,  -- SAC/Aguinaldo/13th salary
    aguinaldo_frequency VARCHAR(20) DEFAULT 'biannual',  -- biannual, annual
    vacation_calculation_method VARCHAR(50) DEFAULT 'calendar_days',

    -- Topes y configuraciones impositivas
    tax_id_name VARCHAR(50) DEFAULT 'CUIL',  -- CUIL, SSN, CPF, etc.
    tax_id_format VARCHAR(100),  -- Regex o formato

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Datos iniciales de países
INSERT INTO payroll_countries (country_code, country_name, currency_code, currency_symbol, labor_law_name, collective_agreement_name, aguinaldo_enabled, tax_id_name) VALUES
('ARG', 'Argentina', 'ARS', '$', 'Ley de Contrato de Trabajo N° 20.744', 'Convenio Colectivo de Trabajo (CCT)', true, 'CUIL'),
('USA', 'Estados Unidos', 'USD', '$', 'Fair Labor Standards Act (FLSA)', 'Collective Bargaining Agreement', false, 'SSN'),
('BRA', 'Brasil', 'BRL', 'R$', 'Consolidação das Leis do Trabalho (CLT)', 'Convenção Coletiva de Trabalho', true, 'CPF'),
('MEX', 'México', 'MXN', '$', 'Ley Federal del Trabajo', 'Contrato Colectivo de Trabajo', true, 'RFC'),
('CHL', 'Chile', 'CLP', '$', 'Código del Trabajo', 'Contrato Colectivo', true, 'RUT'),
('COL', 'Colombia', 'COP', '$', 'Código Sustantivo del Trabajo', 'Convención Colectiva', true, 'NIT'),
('ESP', 'España', 'EUR', '€', 'Estatuto de los Trabajadores', 'Convenio Colectivo', true, 'NIF'),
('URY', 'Uruguay', 'UYU', '$', 'Ley N° 18.441', 'Convenio Colectivo', true, 'RUT'),
('PER', 'Perú', 'PEN', 'S/', 'Decreto Legislativo N° 728', 'Convenio Colectivo', true, 'RUC'),
('PRY', 'Paraguay', 'PYG', '₲', 'Código del Trabajo', 'Contrato Colectivo', true, 'RUC')
ON CONFLICT (country_code) DO NOTHING;

-- ============================================================================
-- 2. SUCURSALES/BRANCHES POR EMPRESA (multi-país)
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_branches (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    country_id INTEGER REFERENCES payroll_countries(id),

    branch_code VARCHAR(20) NOT NULL,  -- Código interno de la sucursal
    branch_name VARCHAR(200) NOT NULL,

    -- Ubicación
    address TEXT,
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(200),

    -- Configuración legal local
    local_tax_id VARCHAR(50),  -- CUIT de la sucursal si aplica
    local_registration_number VARCHAR(100),  -- Inscripción en organismos locales
    local_labor_authority VARCHAR(200),  -- Ministerio de Trabajo local

    -- Configuración de nómina
    default_pay_day INTEGER DEFAULT 5,  -- Día del mes de pago
    pay_frequency_override VARCHAR(20),  -- Si difiere del país
    timezone VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires',

    is_headquarters BOOLEAN DEFAULT false,  -- Casa matriz
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, branch_code)
);

CREATE INDEX idx_company_branches_company ON company_branches(company_id);
CREATE INDEX idx_company_branches_country ON company_branches(country_id);

-- ============================================================================
-- 3. CONVENIOS LABORALES MEJORADOS (parametrizable por país)
-- ============================================================================
DROP TABLE IF EXISTS labor_agreements_v2 CASCADE;
CREATE TABLE labor_agreements_v2 (
    id SERIAL PRIMARY KEY,
    country_id INTEGER REFERENCES payroll_countries(id),
    company_id INTEGER REFERENCES companies(company_id),  -- NULL = catálogo global, con valor = privado de empresa

    code VARCHAR(50) NOT NULL,  -- Número del convenio
    name VARCHAR(300) NOT NULL,
    short_name VARCHAR(100),
    industry VARCHAR(200),

    -- Referencias legales (parametrizable)
    legal_references JSONB DEFAULT '[]',  -- Array de {law_number, law_name, article, description}
    effective_date DATE,
    expiration_date DATE,

    -- Configuraciones del convenio
    base_work_hours_weekly DECIMAL(5,2) DEFAULT 48,
    base_work_hours_daily DECIMAL(5,2) DEFAULT 8,
    overtime_threshold_daily DECIMAL(5,2) DEFAULT 8,
    overtime_50_multiplier DECIMAL(4,2) DEFAULT 1.50,
    overtime_100_multiplier DECIMAL(4,2) DEFAULT 2.00,
    night_shift_multiplier DECIMAL(4,2) DEFAULT 1.00,

    -- Configuración de vacaciones
    vacation_days_by_seniority JSONB DEFAULT '[
        {"min_years": 0, "max_years": 5, "days": 14},
        {"min_years": 5, "max_years": 10, "days": 21},
        {"min_years": 10, "max_years": 20, "days": 28},
        {"min_years": 20, "max_years": null, "days": 35}
    ]',

    -- Texto legal para recibo (opcional)
    receipt_legal_text TEXT,
    receipt_footer_text TEXT,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_labor_agreements_v2_country ON labor_agreements_v2(country_id);
CREATE INDEX idx_labor_agreements_v2_company ON labor_agreements_v2(company_id);

-- ============================================================================
-- 4. TIPOS DE CONCEPTOS (catálogo)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payroll_concept_types (
    id SERIAL PRIMARY KEY,
    type_code VARCHAR(30) NOT NULL UNIQUE,
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    affects_gross BOOLEAN DEFAULT true,  -- Suma al bruto
    affects_net BOOLEAN DEFAULT true,   -- Suma/resta al neto
    is_taxable BOOLEAN DEFAULT true,    -- Aplica impuestos
    is_deduction BOOLEAN DEFAULT false, -- Es deducción
    is_employer_cost BOOLEAN DEFAULT false,  -- Costo patronal (no va al recibo del empleado)
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO payroll_concept_types (type_code, type_name, description, affects_gross, affects_net, is_taxable, is_deduction, is_employer_cost, display_order) VALUES
-- Haberes (remunerativos)
('EARNING_FIXED', 'Haber Fijo Remunerativo', 'Concepto fijo que suma al bruto (ej: sueldo básico)', true, true, true, false, false, 1),
('EARNING_VARIABLE', 'Haber Variable Remunerativo', 'Concepto variable (ej: comisiones, horas extras)', true, true, true, false, false, 2),
('EARNING_SENIORITY', 'Adicional por Antigüedad', 'Bonificación por años de servicio', true, true, true, false, false, 3),
('EARNING_ATTENDANCE', 'Adicional por Presentismo', 'Premio por asistencia perfecta', true, true, true, false, false, 4),

-- No remunerativos (no aplican deducciones)
('NON_REMUN_FIXED', 'No Remunerativo Fijo', 'Concepto fijo sin aportes (ej: viáticos fijos)', true, true, false, false, false, 10),
('NON_REMUN_VARIABLE', 'No Remunerativo Variable', 'Concepto variable sin aportes (ej: reintegros)', true, true, false, false, false, 11),
('NON_REMUN_TRAVEL', 'Viáticos No Remunerativos', 'Viáticos y gastos de movilidad', true, true, false, false, false, 12),
('NON_REMUN_FOOD', 'Tickets/Comida No Remunerativo', 'Vales de almuerzo, tickets canasta', true, true, false, false, false, 13),

-- Deducciones del empleado
('DEDUCTION_RETIREMENT', 'Aporte Jubilatorio', 'Aporte del empleado a jubilación', false, true, false, true, false, 20),
('DEDUCTION_HEALTH', 'Obra Social/Salud', 'Aporte a obra social o seguro médico', false, true, false, true, false, 21),
('DEDUCTION_UNION', 'Cuota Sindical', 'Aporte al sindicato', false, true, false, true, false, 22),
('DEDUCTION_TAX', 'Impuesto a las Ganancias', 'Retención de impuesto sobre ingresos', false, true, false, true, false, 23),
('DEDUCTION_OTHER', 'Otra Deducción', 'Deducciones varias (adelantos, préstamos, embargos)', false, true, false, true, false, 24),

-- Contribuciones patronales (no van al recibo del empleado, pero se calculan)
('EMPLOYER_RETIREMENT', 'Contrib. Patronal Jubilación', 'Aporte del empleador a jubilación', false, false, false, false, true, 30),
('EMPLOYER_HEALTH', 'Contrib. Patronal Obra Social', 'Aporte del empleador a salud', false, false, false, false, true, 31),
('EMPLOYER_RISK', 'ART/Riesgos del Trabajo', 'Seguro de riesgos laborales', false, false, false, false, true, 32),
('EMPLOYER_FAMILY', 'Asignaciones Familiares Patronal', 'Contribución a asignaciones familiares', false, false, false, false, true, 33),
('EMPLOYER_OTHER', 'Otra Contrib. Patronal', 'Otras contribuciones del empleador', false, false, false, false, true, 34)
ON CONFLICT (type_code) DO NOTHING;

-- ============================================================================
-- 5. PLANTILLAS REMUNERATIVAS (template principal)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payroll_templates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    country_id INTEGER REFERENCES payroll_countries(id),
    branch_id INTEGER REFERENCES company_branches(id),  -- NULL = aplica a toda la empresa en ese país
    labor_agreement_id INTEGER REFERENCES labor_agreements_v2(id),

    template_code VARCHAR(50) NOT NULL,
    template_name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Configuración de liquidación
    pay_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',  -- weekly, biweekly, semimonthly, monthly
    calculation_basis VARCHAR(20) NOT NULL DEFAULT 'monthly',  -- hourly, daily, monthly
    work_hours_per_day DECIMAL(5,2) DEFAULT 8,
    work_days_per_week DECIMAL(3,1) DEFAULT 5,
    work_hours_per_month DECIMAL(6,2) DEFAULT 200,  -- Para cálculo de hora

    -- Configuración de extras
    overtime_50_after_hours DECIMAL(5,2) DEFAULT 8,  -- Hora extra 50% después de X horas diarias
    overtime_100_after_hours DECIMAL(5,2) DEFAULT 12,  -- Hora extra 100% después de X horas
    night_shift_start TIME DEFAULT '21:00',
    night_shift_end TIME DEFAULT '06:00',

    -- Reglas de redondeo
    round_to_cents BOOLEAN DEFAULT true,
    round_method VARCHAR(20) DEFAULT 'nearest',  -- nearest, up, down

    -- Textos legales para recibo
    receipt_header TEXT,
    receipt_legal_text TEXT,
    receipt_footer TEXT,

    -- Control de versiones
    version INTEGER DEFAULT 1,
    is_current_version BOOLEAN DEFAULT true,
    parent_template_id INTEGER REFERENCES payroll_templates(id),  -- Para versionado

    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, template_code, version)
);

CREATE INDEX idx_payroll_templates_company ON payroll_templates(company_id);
CREATE INDEX idx_payroll_templates_country ON payroll_templates(country_id);
CREATE INDEX idx_payroll_templates_branch ON payroll_templates(branch_id);

-- ============================================================================
-- 6. CONCEPTOS DE PLANTILLA (los conceptos que tiene cada plantilla)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payroll_template_concepts (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES payroll_templates(id) ON DELETE CASCADE,
    concept_type_id INTEGER NOT NULL REFERENCES payroll_concept_types(id),

    concept_code VARCHAR(50) NOT NULL,  -- Código único dentro de la plantilla
    concept_name VARCHAR(200) NOT NULL,
    short_name VARCHAR(50),  -- Para mostrar en recibo
    description TEXT,

    -- Configuración de cálculo
    calculation_type VARCHAR(30) NOT NULL DEFAULT 'fixed',  -- fixed, percentage, formula, hours, days

    -- Valores base (se pueden override por usuario)
    default_value DECIMAL(15,4) DEFAULT 0,  -- Valor fijo o porcentaje base
    percentage_base VARCHAR(100),  -- 'gross', 'basic_salary', 'concept:CODIGO', etc.
    formula TEXT,  -- Fórmula personalizada si calculation_type = 'formula'

    -- Límites
    min_value DECIMAL(15,4),
    max_value DECIMAL(15,4),
    cap_value DECIMAL(15,4),  -- Tope (ej: tope para aportes)

    -- Configuración de aplicación
    applies_to_hourly BOOLEAN DEFAULT true,
    applies_to_monthly BOOLEAN DEFAULT true,
    is_mandatory BOOLEAN DEFAULT false,  -- Si es obligatorio calcular siempre
    is_visible_receipt BOOLEAN DEFAULT true,  -- Si aparece en el recibo
    is_editable_per_user BOOLEAN DEFAULT true,  -- Si se puede personalizar por empleado

    -- Aportes asociados (para calcular contribuciones)
    employee_contribution_rate DECIMAL(6,4),  -- % que aporta el empleado sobre este concepto
    employer_contribution_rate DECIMAL(6,4),  -- % que aporta el empleador

    -- Referencia legal (opcional, para el recibo)
    legal_reference TEXT,

    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(template_id, concept_code)
);

CREATE INDEX idx_template_concepts_template ON payroll_template_concepts(template_id);

-- ============================================================================
-- 7. CATEGORÍAS SALARIALES MEJORADAS (por convenio)
-- ============================================================================
DROP TABLE IF EXISTS salary_categories_v2 CASCADE;
CREATE TABLE salary_categories_v2 (
    id SERIAL PRIMARY KEY,
    labor_agreement_id INTEGER REFERENCES labor_agreements_v2(id),
    company_id INTEGER REFERENCES companies(company_id),  -- NULL = del convenio, con valor = privado

    category_code VARCHAR(50) NOT NULL,
    category_name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Rangos salariales
    base_salary_min DECIMAL(15,2),
    base_salary_max DECIMAL(15,2),
    hourly_rate_min DECIMAL(10,4),
    hourly_rate_max DECIMAL(10,4),

    -- Valores recomendados
    recommended_base_salary DECIMAL(15,2),
    recommended_hourly_rate DECIMAL(10,4),

    seniority_level INTEGER DEFAULT 1,  -- Nivel de antigüedad/jerarquía

    is_active BOOLEAN DEFAULT true,
    effective_from DATE,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_salary_categories_v2_agreement ON salary_categories_v2(labor_agreement_id);

-- ============================================================================
-- 8. ASIGNACIÓN DE PLANTILLA A USUARIO
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_payroll_assignment (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    branch_id INTEGER REFERENCES company_branches(id),
    template_id INTEGER NOT NULL REFERENCES payroll_templates(id),
    category_id INTEGER REFERENCES salary_categories_v2(id),

    -- Configuración base del usuario
    base_salary DECIMAL(15,2) NOT NULL,
    hourly_rate DECIMAL(10,4),  -- Calculado o manual
    calculation_basis VARCHAR(20) DEFAULT 'monthly',  -- hourly, daily, monthly (override de template)

    -- Fechas
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_current BOOLEAN DEFAULT true,

    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, effective_from)
);

CREATE INDEX idx_user_payroll_assignment_user ON user_payroll_assignment(user_id);
CREATE INDEX idx_user_payroll_assignment_template ON user_payroll_assignment(template_id);

-- ============================================================================
-- 9. OVERRIDES DE CONCEPTOS POR USUARIO
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_payroll_concept_overrides (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    assignment_id INTEGER NOT NULL REFERENCES user_payroll_assignment(id) ON DELETE CASCADE,
    template_concept_id INTEGER REFERENCES payroll_template_concepts(id),

    -- Para conceptos adicionales no en la plantilla
    concept_type_id INTEGER REFERENCES payroll_concept_types(id),
    custom_concept_code VARCHAR(50),
    custom_concept_name VARCHAR(200),

    -- Override de valores
    override_value DECIMAL(15,4),
    override_percentage DECIMAL(6,4),
    is_percentage BOOLEAN DEFAULT false,

    -- Control
    is_active BOOLEAN DEFAULT true,
    applies_from DATE,
    applies_to DATE,
    reason TEXT,  -- Motivo del override

    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_concept_overrides_user ON user_payroll_concept_overrides(user_id);
CREATE INDEX idx_user_concept_overrides_assignment ON user_payroll_concept_overrides(assignment_id);

-- ============================================================================
-- 10. BONOS ADICIONALES POR USUARIO
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_payroll_bonuses (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    bonus_code VARCHAR(50) NOT NULL,
    bonus_name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Tipo y cálculo
    bonus_type VARCHAR(30) NOT NULL,  -- fixed, percentage, target_based, discretionary
    concept_type_id INTEGER REFERENCES payroll_concept_types(id),

    -- Valores
    amount DECIMAL(15,2),
    percentage DECIMAL(6,4),
    percentage_base VARCHAR(100),  -- 'gross', 'base_salary', etc.

    -- Frecuencia
    frequency VARCHAR(30) NOT NULL DEFAULT 'monthly',  -- once, monthly, quarterly, biannual, annual
    next_payment_date DATE,
    last_payment_date DATE,

    -- Condiciones
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,

    -- Vigencia
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,

    -- Motivo/categoría
    reason_category VARCHAR(50),  -- performance, retention, project, sales, attendance, etc.
    reason_detail TEXT,

    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_bonuses_user ON user_payroll_bonuses(user_id);
CREATE INDEX idx_user_bonuses_company ON user_payroll_bonuses(company_id);
CREATE INDEX idx_user_bonuses_next_payment ON user_payroll_bonuses(next_payment_date);

-- ============================================================================
-- 11. HISTORIAL DE LIQUIDACIONES (mejorado)
-- ============================================================================
DROP TABLE IF EXISTS payroll_runs CASCADE;
CREATE TABLE payroll_runs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    branch_id INTEGER REFERENCES company_branches(id),

    run_code VARCHAR(50) NOT NULL,  -- Identificador único de la corrida
    run_name VARCHAR(200),

    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    period_half INTEGER,  -- 1 o 2 para quincenas
    period_week INTEGER,  -- Para semanales

    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    payment_date DATE,

    -- Totales de la corrida
    total_employees INTEGER DEFAULT 0,
    total_gross DECIMAL(18,2) DEFAULT 0,
    total_deductions DECIMAL(18,2) DEFAULT 0,
    total_net DECIMAL(18,2) DEFAULT 0,
    total_employer_cost DECIMAL(18,2) DEFAULT 0,

    status VARCHAR(30) DEFAULT 'draft',  -- draft, calculating, review, approved, paid, cancelled

    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,

    notes TEXT,

    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, run_code)
);

CREATE INDEX idx_payroll_runs_company ON payroll_runs(company_id);
CREATE INDEX idx_payroll_runs_period ON payroll_runs(period_year, period_month);

-- ============================================================================
-- 12. DETALLE DE LIQUIDACIÓN POR EMPLEADO
-- ============================================================================
CREATE TABLE IF NOT EXISTS payroll_run_details (
    id SERIAL PRIMARY KEY,
    run_id INTEGER NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id),
    assignment_id INTEGER REFERENCES user_payroll_assignment(id),

    -- Datos del período
    worked_days DECIMAL(5,2),
    worked_hours DECIMAL(7,2),
    overtime_50_hours DECIMAL(6,2) DEFAULT 0,
    overtime_100_hours DECIMAL(6,2) DEFAULT 0,
    night_hours DECIMAL(6,2) DEFAULT 0,
    absent_days DECIMAL(5,2) DEFAULT 0,

    -- Totales
    gross_earnings DECIMAL(15,2) DEFAULT 0,
    non_remunerative DECIMAL(15,2) DEFAULT 0,
    total_deductions DECIMAL(15,2) DEFAULT 0,
    net_salary DECIMAL(15,2) DEFAULT 0,
    employer_contributions DECIMAL(15,2) DEFAULT 0,

    -- Detalle en JSON (todos los conceptos calculados)
    earnings_detail JSONB DEFAULT '[]',
    deductions_detail JSONB DEFAULT '[]',
    employer_detail JSONB DEFAULT '[]',

    -- Estado individual
    status VARCHAR(30) DEFAULT 'calculated',  -- calculated, reviewed, approved, paid, error
    error_message TEXT,

    -- Recibo
    receipt_number VARCHAR(50),
    receipt_generated_at TIMESTAMP,
    receipt_url TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payroll_run_details_run ON payroll_run_details(run_id);
CREATE INDEX idx_payroll_run_details_user ON payroll_run_details(user_id);

-- ============================================================================
-- 13. DETALLE DE CONCEPTOS POR LIQUIDACIÓN
-- ============================================================================
CREATE TABLE IF NOT EXISTS payroll_run_concept_details (
    id SERIAL PRIMARY KEY,
    run_detail_id INTEGER NOT NULL REFERENCES payroll_run_details(id) ON DELETE CASCADE,
    template_concept_id INTEGER REFERENCES payroll_template_concepts(id),
    concept_type_id INTEGER REFERENCES payroll_concept_types(id),

    concept_code VARCHAR(50) NOT NULL,
    concept_name VARCHAR(200) NOT NULL,

    -- Valores calculados
    quantity DECIMAL(10,4),  -- Horas, días, unidades
    rate DECIMAL(15,4),  -- Tasa por unidad
    amount DECIMAL(15,2) NOT NULL,  -- Monto final

    -- Referencias
    calculation_detail TEXT,  -- Detalle del cálculo para auditoría
    is_override BOOLEAN DEFAULT false,  -- Si vino de un override del usuario

    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_run_concept_details_run ON payroll_run_concept_details(run_detail_id);

-- ============================================================================
-- 14. AGREGAR CAMPO branch_id A USUARIOS
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'branch_id') THEN
        ALTER TABLE users ADD COLUMN branch_id INTEGER REFERENCES company_branches(id);
        CREATE INDEX idx_users_branch ON users(branch_id);
    END IF;
END $$;

-- ============================================================================
-- FUNCIONES AUXILIARES
-- ============================================================================

-- Función para duplicar plantilla entre sucursales
CREATE OR REPLACE FUNCTION duplicate_payroll_template(
    p_source_template_id INTEGER,
    p_target_branch_id INTEGER,
    p_new_code VARCHAR(50),
    p_created_by INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_new_template_id INTEGER;
    v_source_template RECORD;
BEGIN
    -- Obtener plantilla origen
    SELECT * INTO v_source_template FROM payroll_templates WHERE id = p_source_template_id;

    -- Crear nueva plantilla
    INSERT INTO payroll_templates (
        company_id, country_id, branch_id, labor_agreement_id,
        template_code, template_name, description,
        pay_frequency, calculation_basis, work_hours_per_day, work_days_per_week, work_hours_per_month,
        overtime_50_after_hours, overtime_100_after_hours, night_shift_start, night_shift_end,
        round_to_cents, round_method, receipt_header, receipt_legal_text, receipt_footer,
        is_active, created_by
    )
    SELECT
        company_id, country_id, p_target_branch_id, labor_agreement_id,
        p_new_code, template_name || ' (Copia)', description,
        pay_frequency, calculation_basis, work_hours_per_day, work_days_per_week, work_hours_per_month,
        overtime_50_after_hours, overtime_100_after_hours, night_shift_start, night_shift_end,
        round_to_cents, round_method, receipt_header, receipt_legal_text, receipt_footer,
        true, p_created_by
    FROM payroll_templates WHERE id = p_source_template_id
    RETURNING id INTO v_new_template_id;

    -- Copiar conceptos
    INSERT INTO payroll_template_concepts (
        template_id, concept_type_id, concept_code, concept_name, short_name, description,
        calculation_type, default_value, percentage_base, formula,
        min_value, max_value, cap_value,
        applies_to_hourly, applies_to_monthly, is_mandatory, is_visible_receipt, is_editable_per_user,
        employee_contribution_rate, employer_contribution_rate,
        legal_reference, display_order, is_active
    )
    SELECT
        v_new_template_id, concept_type_id, concept_code, concept_name, short_name, description,
        calculation_type, default_value, percentage_base, formula,
        min_value, max_value, cap_value,
        applies_to_hourly, applies_to_monthly, is_mandatory, is_visible_receipt, is_editable_per_user,
        employee_contribution_rate, employer_contribution_rate,
        legal_reference, display_order, is_active
    FROM payroll_template_concepts WHERE template_id = p_source_template_id;

    RETURN v_new_template_id;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener plantillas disponibles para un usuario según su branch
CREATE OR REPLACE FUNCTION get_available_templates_for_user(
    p_user_id UUID
) RETURNS TABLE (
    template_id INTEGER,
    template_code VARCHAR(50),
    template_name VARCHAR(200),
    country_name VARCHAR(100),
    branch_name VARCHAR(200),
    pay_frequency VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pt.id as template_id,
        pt.template_code,
        pt.template_name,
        pc.country_name,
        cb.branch_name,
        pt.pay_frequency
    FROM payroll_templates pt
    LEFT JOIN payroll_countries pc ON pt.country_id = pc.id
    LEFT JOIN company_branches cb ON pt.branch_id = cb.id
    JOIN users u ON u.company_id = pt.company_id
    WHERE u.id = p_user_id
      AND pt.is_active = true
      AND pt.is_current_version = true
      AND (pt.branch_id IS NULL OR pt.branch_id = u.branch_id)
    ORDER BY pt.template_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MENSAJE DE CONFIRMACIÓN
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada: Sistema de Liquidación 100%% Parametrizable v3.0';
    RAISE NOTICE '📊 Tablas creadas:';
    RAISE NOTICE '   - payroll_countries (10 países pre-cargados)';
    RAISE NOTICE '   - company_branches (sucursales multi-país)';
    RAISE NOTICE '   - labor_agreements_v2 (convenios parametrizables)';
    RAISE NOTICE '   - payroll_concept_types (catálogo de tipos)';
    RAISE NOTICE '   - payroll_templates (plantillas por país/sucursal)';
    RAISE NOTICE '   - payroll_template_concepts (conceptos de plantilla)';
    RAISE NOTICE '   - salary_categories_v2 (categorías mejoradas)';
    RAISE NOTICE '   - user_payroll_assignment (asignación a usuario)';
    RAISE NOTICE '   - user_payroll_concept_overrides (overrides)';
    RAISE NOTICE '   - user_payroll_bonuses (bonos adicionales)';
    RAISE NOTICE '   - payroll_runs (corridas de liquidación)';
    RAISE NOTICE '   - payroll_run_details (detalle por empleado)';
    RAISE NOTICE '   - payroll_run_concept_details (detalle de conceptos)';
END $$;
