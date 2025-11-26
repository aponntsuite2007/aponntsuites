-- ============================================================================
-- MIGRACIÓN: Sistema de Entidades de Liquidación y Consolidación v1.0
-- Fecha: 2025-11-26
-- Descripción: Agrega entidades (AFIP, Obras Sociales, Sindicatos, etc.)
--              para agrupar deducciones y generar liquidaciones consolidadas
-- ============================================================================

-- ============================================================================
-- 1. TABLA: payroll_entities - Entidades receptoras de deducciones
-- ============================================================================
CREATE TABLE IF NOT EXISTS payroll_entities (
    entity_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id),  -- NULL = entidad global (ej: AFIP)
    country_id INTEGER REFERENCES payroll_countries(id),

    entity_code VARCHAR(30) NOT NULL,
    entity_name VARCHAR(200) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,  -- TAX_AUTHORITY, SOCIAL_SECURITY, UNION, HEALTH_INSURANCE, PENSION_FUND, BANK, OTHER

    -- Datos de la entidad
    tax_id VARCHAR(30),               -- CUIT de la entidad
    legal_name VARCHAR(200),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(200),

    -- Datos bancarios para pagos
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_account_type VARCHAR(30),    -- savings, checking
    bank_cbu VARCHAR(30),             -- CBU en Argentina
    bank_alias VARCHAR(100),

    -- Configuración de presentación
    presentation_format VARCHAR(50),   -- AFIP_SICOSS, AFIP_F931, CUSTOM, EXCEL, TXT
    presentation_frequency VARCHAR(20) DEFAULT 'monthly',  -- monthly, biweekly, yearly
    presentation_deadline_day INTEGER, -- Día del mes para presentación

    -- Configuración adicional
    settings JSONB DEFAULT '{}',

    is_government BOOLEAN DEFAULT false,
    is_mandatory BOOLEAN DEFAULT false,  -- Si es obligatoria (ej: jubilación)
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payroll_entities_company ON payroll_entities(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entities_country ON payroll_entities(country_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entities_type ON payroll_entities(entity_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_entities_code ON payroll_entities(company_id, entity_code) WHERE company_id IS NOT NULL;

-- ============================================================================
-- 2. AGREGAR CAMPO entity_id A payroll_template_concepts
-- ============================================================================
ALTER TABLE payroll_template_concepts
ADD COLUMN IF NOT EXISTS entity_id INTEGER REFERENCES payroll_entities(entity_id);

ALTER TABLE payroll_template_concepts
ADD COLUMN IF NOT EXISTS entity_account_code VARCHAR(50);  -- Código de cuenta para la entidad

-- Índice para búsqueda por entidad
CREATE INDEX IF NOT EXISTS idx_template_concepts_entity ON payroll_template_concepts(entity_id);

-- ============================================================================
-- 3. AGREGAR CAMPO entity_id A payroll_run_concept_details
-- ============================================================================
ALTER TABLE payroll_run_concept_details
ADD COLUMN IF NOT EXISTS entity_id INTEGER REFERENCES payroll_entities(entity_id);

ALTER TABLE payroll_run_concept_details
ADD COLUMN IF NOT EXISTS entity_code VARCHAR(30);

ALTER TABLE payroll_run_concept_details
ADD COLUMN IF NOT EXISTS entity_name VARCHAR(200);

-- ============================================================================
-- 4. TABLA: payroll_entity_settlements - Liquidaciones consolidadas por entidad
-- ============================================================================
CREATE TABLE IF NOT EXISTS payroll_entity_settlements (
    settlement_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    branch_id INTEGER REFERENCES company_branches(id),
    entity_id INTEGER NOT NULL REFERENCES payroll_entities(entity_id),

    -- Período
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Referencia a la corrida de nómina
    run_id INTEGER REFERENCES payroll_runs(id),

    -- Código único de liquidación
    settlement_code VARCHAR(50) NOT NULL,

    -- Totales
    total_employees INTEGER DEFAULT 0,
    total_amount DECIMAL(18,2) DEFAULT 0,
    total_employer_contribution DECIMAL(18,2) DEFAULT 0,  -- Aportes patronales
    total_employee_contribution DECIMAL(18,2) DEFAULT 0,  -- Aportes del empleado
    grand_total DECIMAL(18,2) DEFAULT 0,

    -- Estado
    status VARCHAR(20) DEFAULT 'pending',  -- pending, generated, reviewed, approved, submitted, paid, rejected

    -- Fechas de proceso
    generated_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    approved_at TIMESTAMP,
    submitted_at TIMESTAMP,  -- Cuando se presentó a la entidad
    paid_at TIMESTAMP,

    -- Usuarios responsables
    generated_by UUID REFERENCES users(user_id),
    reviewed_by UUID REFERENCES users(user_id),
    approved_by UUID REFERENCES users(user_id),

    -- Datos de pago
    payment_reference VARCHAR(100),
    payment_date DATE,
    payment_method VARCHAR(30),
    payment_receipt_url VARCHAR(500),

    -- Datos de presentación
    presentation_file_url VARCHAR(500),
    presentation_format VARCHAR(50),
    presentation_response JSONB,  -- Respuesta de la entidad

    -- Notas y metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_entity_settlements_company ON payroll_entity_settlements(company_id);
CREATE INDEX IF NOT EXISTS idx_entity_settlements_entity ON payroll_entity_settlements(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_settlements_period ON payroll_entity_settlements(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_entity_settlements_status ON payroll_entity_settlements(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_settlements_unique ON payroll_entity_settlements(company_id, entity_id, period_year, period_month);

-- ============================================================================
-- 5. TABLA: payroll_entity_settlement_details - Detalle por empleado en la liquidación
-- ============================================================================
CREATE TABLE IF NOT EXISTS payroll_entity_settlement_details (
    detail_id SERIAL PRIMARY KEY,
    settlement_id INTEGER NOT NULL REFERENCES payroll_entity_settlements(settlement_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id),
    run_detail_id INTEGER REFERENCES payroll_run_details(id),

    -- Datos del empleado (snapshot)
    employee_name VARCHAR(200),
    employee_tax_id VARCHAR(30),  -- CUIL/CUIT
    employee_code VARCHAR(50),

    -- Montos
    base_amount DECIMAL(15,2) DEFAULT 0,      -- Base de cálculo
    employee_amount DECIMAL(15,2) DEFAULT 0,  -- Aporte del empleado
    employer_amount DECIMAL(15,2) DEFAULT 0,  -- Aporte patronal
    total_amount DECIMAL(15,2) DEFAULT 0,

    -- Desglose por concepto (JSON con array de conceptos)
    concepts_breakdown JSONB DEFAULT '[]',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_entity_settlement_details_settlement ON payroll_entity_settlement_details(settlement_id);
CREATE INDEX IF NOT EXISTS idx_entity_settlement_details_user ON payroll_entity_settlement_details(user_id);

-- ============================================================================
-- 6. INSERT: Entidades predeterminadas para Argentina
-- ============================================================================
INSERT INTO payroll_entities (country_id, entity_code, entity_name, entity_type, is_government, is_mandatory, presentation_format, settings)
SELECT
    pc.id,
    e.entity_code,
    e.entity_name,
    e.entity_type,
    e.is_government,
    e.is_mandatory,
    e.presentation_format,
    e.settings::jsonb
FROM payroll_countries pc
CROSS JOIN (VALUES
    ('AFIP_JUBILACION', 'AFIP - Jubilación (SIPA)', 'TAX_AUTHORITY', true, true, 'AFIP_F931', '{"percentage_employee": 11, "percentage_employer": 10.17}'),
    ('AFIP_OBRA_SOCIAL', 'AFIP - Obra Social', 'HEALTH_INSURANCE', true, true, 'AFIP_F931', '{"percentage_employee": 3, "percentage_employer": 6}'),
    ('AFIP_PAMI', 'AFIP - PAMI (INSSJP)', 'HEALTH_INSURANCE', true, true, 'AFIP_F931', '{"percentage_employee": 3, "percentage_employer": 2}'),
    ('AFIP_CUOTA_SINDICAL', 'AFIP - Cuota Sindical', 'UNION', true, false, 'AFIP_F931', '{"percentage_employee": 2.5}'),
    ('AFIP_ART', 'ART - Aseguradora Riesgos Trabajo', 'OTHER', false, true, 'CUSTOM', '{"type": "insurance"}'),
    ('AFIP_GANANCIAS', 'AFIP - Impuesto a las Ganancias', 'TAX_AUTHORITY', true, false, 'AFIP_SICORE', '{"type": "income_tax"}'),
    ('ANSSAL', 'ANSSAL - Administración Nacional SS Salud', 'HEALTH_INSURANCE', true, true, 'AFIP_F931', '{"percentage_employer": 0.9}'),
    ('FNE', 'Fondo Nacional de Empleo', 'TAX_AUTHORITY', true, true, 'AFIP_F931', '{"percentage_employer": 1.5}')
) AS e(entity_code, entity_name, entity_type, is_government, is_mandatory, presentation_format, settings)
WHERE pc.country_code = 'ARG'
ON CONFLICT DO NOTHING;

-- Entidades para Chile
INSERT INTO payroll_entities (country_id, entity_code, entity_name, entity_type, is_government, is_mandatory, presentation_format, settings)
SELECT
    pc.id,
    e.entity_code,
    e.entity_name,
    e.entity_type,
    e.is_government,
    e.is_mandatory,
    e.presentation_format,
    e.settings::jsonb
FROM payroll_countries pc
CROSS JOIN (VALUES
    ('AFP', 'AFP - Administradora Fondo Pensiones', 'PENSION_FUND', false, true, 'PREVIRED', '{"percentage_employee": 10}'),
    ('FONASA', 'FONASA - Fondo Nacional de Salud', 'HEALTH_INSURANCE', true, true, 'PREVIRED', '{"percentage_employee": 7}'),
    ('ISAPRE', 'ISAPRE - Institución Salud Previsional', 'HEALTH_INSURANCE', false, false, 'PREVIRED', '{"percentage_employee": 7}'),
    ('SII_RENTA', 'SII - Impuesto a la Renta', 'TAX_AUTHORITY', true, false, 'SII_DJ', '{}'),
    ('AFC', 'AFC - Seguro de Cesantía', 'SOCIAL_SECURITY', true, true, 'PREVIRED', '{"percentage_employee": 0.6, "percentage_employer": 2.4}')
) AS e(entity_code, entity_name, entity_type, is_government, is_mandatory, presentation_format, settings)
WHERE pc.country_code = 'CHL'
ON CONFLICT DO NOTHING;

-- Entidades para México
INSERT INTO payroll_entities (country_id, entity_code, entity_name, entity_type, is_government, is_mandatory, presentation_format, settings)
SELECT
    pc.id,
    e.entity_code,
    e.entity_name,
    e.entity_type,
    e.is_government,
    e.is_mandatory,
    e.presentation_format,
    e.settings::jsonb
FROM payroll_countries pc
CROSS JOIN (VALUES
    ('IMSS', 'IMSS - Instituto Mexicano Seguro Social', 'SOCIAL_SECURITY', true, true, 'IDSE', '{}'),
    ('INFONAVIT', 'INFONAVIT - Instituto Fondo Nacional Vivienda', 'OTHER', true, true, 'SUA', '{"percentage_employer": 5}'),
    ('SAR', 'SAR - Sistema Ahorro para Retiro', 'PENSION_FUND', true, true, 'SUA', '{"percentage_employer": 2}'),
    ('ISR', 'SAT - Impuesto Sobre la Renta', 'TAX_AUTHORITY', true, false, 'SAT_CFDI', '{}')
) AS e(entity_code, entity_name, entity_type, is_government, is_mandatory, presentation_format, settings)
WHERE pc.country_code = 'MEX'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. FUNCIÓN: Generar liquidación consolidada por entidad
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_entity_settlement(
    p_company_id INTEGER,
    p_entity_id INTEGER,
    p_run_id INTEGER,
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_settlement_id INTEGER;
    v_period_year INTEGER;
    v_period_month INTEGER;
    v_period_start DATE;
    v_period_end DATE;
    v_settlement_code VARCHAR(50);
    v_total_employees INTEGER;
    v_total_amount DECIMAL(18,2);
    v_total_employer DECIMAL(18,2);
    v_total_employee DECIMAL(18,2);
BEGIN
    -- Obtener datos del período de la corrida
    SELECT period_year, period_month, period_start, period_end
    INTO v_period_year, v_period_month, v_period_start, v_period_end
    FROM payroll_runs
    WHERE id = p_run_id;

    -- Generar código único
    v_settlement_code := 'SET-' || p_company_id || '-' || p_entity_id || '-' ||
                         v_period_year || LPAD(v_period_month::TEXT, 2, '0');

    -- Calcular totales
    SELECT
        COUNT(DISTINCT prd.user_id),
        COALESCE(SUM(CASE WHEN pct.is_employer_cost THEN prcd.calculated_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN pct.is_deduction AND NOT pct.is_employer_cost THEN prcd.calculated_amount ELSE 0 END), 0)
    INTO v_total_employees, v_total_employer, v_total_employee
    FROM payroll_run_concept_details prcd
    JOIN payroll_run_details prd ON prcd.run_detail_id = prd.id
    JOIN payroll_template_concepts ptc ON prcd.template_concept_id = ptc.id
    JOIN payroll_concept_types pct ON ptc.concept_type_id = pct.id
    WHERE prd.run_id = p_run_id
    AND ptc.entity_id = p_entity_id;

    v_total_amount := v_total_employer + v_total_employee;

    -- Crear o actualizar liquidación
    INSERT INTO payroll_entity_settlements (
        company_id, entity_id, run_id,
        period_year, period_month, period_start, period_end,
        settlement_code,
        total_employees, total_amount,
        total_employer_contribution, total_employee_contribution, grand_total,
        status, generated_at, generated_by
    ) VALUES (
        p_company_id, p_entity_id, p_run_id,
        v_period_year, v_period_month, v_period_start, v_period_end,
        v_settlement_code,
        v_total_employees, v_total_amount,
        v_total_employer, v_total_employee, v_total_amount,
        'generated', NOW(), p_user_id
    )
    ON CONFLICT (company_id, entity_id, period_year, period_month)
    DO UPDATE SET
        run_id = EXCLUDED.run_id,
        total_employees = EXCLUDED.total_employees,
        total_amount = EXCLUDED.total_amount,
        total_employer_contribution = EXCLUDED.total_employer_contribution,
        total_employee_contribution = EXCLUDED.total_employee_contribution,
        grand_total = EXCLUDED.grand_total,
        status = 'generated',
        generated_at = NOW(),
        generated_by = p_user_id,
        updated_at = NOW()
    RETURNING settlement_id INTO v_settlement_id;

    -- Eliminar detalles anteriores
    DELETE FROM payroll_entity_settlement_details WHERE settlement_id = v_settlement_id;

    -- Insertar detalles por empleado
    INSERT INTO payroll_entity_settlement_details (
        settlement_id, user_id, run_detail_id,
        employee_name, employee_tax_id, employee_code,
        base_amount, employee_amount, employer_amount, total_amount,
        concepts_breakdown
    )
    SELECT
        v_settlement_id,
        prd.user_id,
        prd.id,
        u."firstName" || ' ' || u."lastName",
        u.dni,
        u.employee_code,
        prd.gross_earnings,
        COALESCE(SUM(CASE WHEN pct.is_deduction AND NOT pct.is_employer_cost THEN prcd.calculated_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN pct.is_employer_cost THEN prcd.calculated_amount ELSE 0 END), 0),
        COALESCE(SUM(prcd.calculated_amount), 0),
        jsonb_agg(jsonb_build_object(
            'concept_code', prcd.concept_code,
            'concept_name', prcd.concept_name,
            'amount', prcd.calculated_amount,
            'is_employer', pct.is_employer_cost
        ))
    FROM payroll_run_details prd
    JOIN users u ON prd.user_id = u.user_id
    JOIN payroll_run_concept_details prcd ON prd.id = prcd.run_detail_id
    JOIN payroll_template_concepts ptc ON prcd.template_concept_id = ptc.id
    JOIN payroll_concept_types pct ON ptc.concept_type_id = pct.id
    WHERE prd.run_id = p_run_id
    AND ptc.entity_id = p_entity_id
    GROUP BY prd.user_id, prd.id, u."firstName", u."lastName", u.dni, u.employee_code, prd.gross_earnings;

    RETURN v_settlement_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. VISTA: Resumen de liquidaciones por entidad
-- ============================================================================
CREATE OR REPLACE VIEW v_entity_settlements_summary AS
SELECT
    es.settlement_id,
    es.company_id,
    c.name as company_name,
    es.entity_id,
    pe.entity_code,
    pe.entity_name,
    pe.entity_type,
    es.period_year,
    es.period_month,
    es.period_start,
    es.period_end,
    es.settlement_code,
    es.total_employees,
    es.total_employer_contribution,
    es.total_employee_contribution,
    es.grand_total,
    es.status,
    es.generated_at,
    es.approved_at,
    es.paid_at,
    es.payment_reference
FROM payroll_entity_settlements es
JOIN companies c ON es.company_id = c.company_id
JOIN payroll_entities pe ON es.entity_id = pe.entity_id;

-- ============================================================================
-- 9. TABLA: payroll_payslip_templates - Plantillas de recibos de sueldo
-- ============================================================================
CREATE TABLE IF NOT EXISTS payroll_payslip_templates (
    template_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id),
    country_id INTEGER REFERENCES payroll_countries(id),

    template_code VARCHAR(50) NOT NULL,
    template_name VARCHAR(200) NOT NULL,

    -- Tipo de plantilla
    template_type VARCHAR(30) DEFAULT 'standard',  -- standard, detailed, summary, legal
    output_format VARCHAR(20) DEFAULT 'pdf',       -- pdf, html, both

    -- Contenido HTML de la plantilla
    header_html TEXT,
    body_html TEXT,
    footer_html TEXT,

    -- Estilos CSS
    styles_css TEXT,

    -- Configuración
    page_size VARCHAR(10) DEFAULT 'A4',
    page_orientation VARCHAR(10) DEFAULT 'portrait',
    margins JSONB DEFAULT '{"top": 20, "right": 15, "bottom": 20, "left": 15}',

    -- Logo y firma
    show_company_logo BOOLEAN DEFAULT true,
    show_employee_signature BOOLEAN DEFAULT true,
    show_employer_signature BOOLEAN DEFAULT true,

    -- Secciones a mostrar
    sections_config JSONB DEFAULT '{
        "header": true,
        "employee_info": true,
        "earnings": true,
        "deductions": true,
        "non_remunerative": true,
        "employer_contributions": false,
        "totals": true,
        "footer": true,
        "legal_text": true
    }',

    -- Texto legal (pie de recibo)
    legal_disclaimer TEXT,

    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payslip_templates_company ON payroll_payslip_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_payslip_templates_country ON payroll_payslip_templates(country_id);

-- ============================================================================
-- 10. INSERT: Plantilla de recibo predeterminada
-- ============================================================================
INSERT INTO payroll_payslip_templates (
    template_code, template_name, template_type, output_format,
    header_html, body_html, footer_html, styles_css, legal_disclaimer, is_default
) VALUES (
    'DEFAULT_ARG',
    'Recibo de Sueldo - Argentina (Estándar)',
    'standard',
    'pdf',
    -- Header HTML
    '<div class="header">
        <div class="company-info">
            {{#if company.logo_url}}<img src="{{company.logo_url}}" class="company-logo" />{{/if}}
            <h1>{{company.name}}</h1>
            <p>{{company.legal_name}}</p>
            <p>CUIT: {{company.tax_id}}</p>
            <p>{{company.address}}</p>
        </div>
        <div class="payslip-info">
            <h2>RECIBO DE HABERES</h2>
            <p><strong>Período:</strong> {{period.month_name}} {{period.year}}</p>
            <p><strong>Liquidación:</strong> {{period.start}} al {{period.end}}</p>
        </div>
    </div>',
    -- Body HTML
    '<div class="employee-section">
        <h3>DATOS DEL EMPLEADO</h3>
        <table class="info-table">
            <tr>
                <td><strong>Nombre:</strong> {{employee.full_name}}</td>
                <td><strong>CUIL:</strong> {{employee.tax_id}}</td>
            </tr>
            <tr>
                <td><strong>Legajo:</strong> {{employee.code}}</td>
                <td><strong>Categoría:</strong> {{employee.category}}</td>
            </tr>
            <tr>
                <td><strong>Fecha Ingreso:</strong> {{employee.hire_date}}</td>
                <td><strong>Antigüedad:</strong> {{employee.seniority}}</td>
            </tr>
            <tr>
                <td><strong>Departamento:</strong> {{employee.department}}</td>
                <td><strong>Convenio:</strong> {{employee.agreement}}</td>
            </tr>
        </table>
    </div>

    <div class="concepts-section">
        <table class="concepts-table">
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Concepto</th>
                    <th>Cantidad</th>
                    <th>Haberes</th>
                    <th>Deducciones</th>
                </tr>
            </thead>
            <tbody>
                {{#each concepts}}
                <tr class="{{type_class}}">
                    <td>{{code}}</td>
                    <td>{{name}}</td>
                    <td>{{quantity}}</td>
                    <td class="amount">{{#if is_earning}}{{amount}}{{/if}}</td>
                    <td class="amount">{{#if is_deduction}}{{amount}}{{/if}}</td>
                </tr>
                {{/each}}
            </tbody>
            <tfoot>
                <tr class="subtotal">
                    <td colspan="3"><strong>TOTAL HABERES REMUNERATIVOS</strong></td>
                    <td class="amount"><strong>{{totals.gross_remunerative}}</strong></td>
                    <td></td>
                </tr>
                <tr class="subtotal">
                    <td colspan="3"><strong>TOTAL NO REMUNERATIVO</strong></td>
                    <td class="amount"><strong>{{totals.non_remunerative}}</strong></td>
                    <td></td>
                </tr>
                <tr class="subtotal">
                    <td colspan="3"><strong>TOTAL DEDUCCIONES</strong></td>
                    <td></td>
                    <td class="amount"><strong>{{totals.deductions}}</strong></td>
                </tr>
                <tr class="total-row">
                    <td colspan="3"><strong>NETO A COBRAR</strong></td>
                    <td colspan="2" class="amount net-amount"><strong>{{totals.net_salary}}</strong></td>
                </tr>
            </tfoot>
        </table>
    </div>

    {{#if show_employer_contributions}}
    <div class="employer-section">
        <h4>Contribuciones Patronales (No afectan el neto)</h4>
        <table class="employer-table">
            {{#each employer_contributions}}
            <tr>
                <td>{{name}}</td>
                <td class="amount">{{amount}}</td>
            </tr>
            {{/each}}
            <tr class="total-row">
                <td><strong>Total Costo Empleador</strong></td>
                <td class="amount"><strong>{{totals.employer_cost}}</strong></td>
            </tr>
        </table>
    </div>
    {{/if}}',
    -- Footer HTML
    '<div class="footer">
        <div class="signatures">
            <div class="signature-box">
                <div class="signature-line"></div>
                <p>Firma del Empleador</p>
            </div>
            <div class="signature-box">
                <div class="signature-line"></div>
                <p>Firma Conforme del Empleado</p>
                <p class="small">{{employee.full_name}}</p>
            </div>
        </div>
        <div class="legal-text">
            <p>{{legal_disclaimer}}</p>
        </div>
        <div class="generation-info">
            <p>Generado el {{generation_date}} | Documento válido como recibo de haberes</p>
        </div>
    </div>',
    -- CSS Styles
    '* { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
    .company-info h1 { font-size: 18px; margin-bottom: 5px; }
    .company-logo { max-height: 60px; margin-bottom: 10px; }
    .payslip-info { text-align: right; }
    .payslip-info h2 { font-size: 16px; color: #333; }
    .employee-section { margin-bottom: 20px; }
    .employee-section h3 { background: #f0f0f0; padding: 5px 10px; margin-bottom: 10px; }
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table td { padding: 5px 10px; border: 1px solid #ddd; width: 50%; }
    .concepts-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .concepts-table th, .concepts-table td { padding: 6px 8px; border: 1px solid #ddd; }
    .concepts-table th { background: #333; color: white; text-align: left; }
    .concepts-table .amount { text-align: right; font-family: monospace; }
    .concepts-table .subtotal { background: #f5f5f5; }
    .concepts-table .total-row { background: #333; color: white; font-size: 13px; }
    .concepts-table .net-amount { font-size: 14px; }
    .earning-row { background: #e8f5e9; }
    .deduction-row { background: #ffebee; }
    .non-remun-row { background: #e3f2fd; }
    .employer-section { margin-top: 15px; padding: 10px; background: #fff3e0; }
    .employer-section h4 { margin-bottom: 10px; }
    .employer-table { width: 50%; }
    .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
    .signatures { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .signature-box { width: 45%; text-align: center; }
    .signature-line { border-top: 1px solid #333; margin-bottom: 5px; margin-top: 50px; }
    .signature-box .small { font-size: 9px; color: #666; }
    .legal-text { font-size: 8px; color: #666; margin-bottom: 10px; }
    .generation-info { font-size: 8px; color: #999; text-align: center; }',
    -- Legal disclaimer
    'Recibo de haberes emitido de conformidad con lo establecido en la Ley de Contrato de Trabajo N° 20.744. El empleado dispone de 30 días para impugnar cualquier aspecto de la liquidación. Este documento tiene carácter de declaración jurada para el empleador.',
    true
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMENTARIOS FINALES
-- ============================================================================
COMMENT ON TABLE payroll_entities IS 'Entidades receptoras de deducciones (AFIP, Obras Sociales, Sindicatos, etc.)';
COMMENT ON TABLE payroll_entity_settlements IS 'Liquidaciones consolidadas por entidad para presentación y pago';
COMMENT ON TABLE payroll_entity_settlement_details IS 'Detalle por empleado de cada liquidación consolidada';
COMMENT ON TABLE payroll_payslip_templates IS 'Plantillas HTML/CSS para generación de recibos de sueldo';
COMMENT ON FUNCTION generate_entity_settlement IS 'Genera liquidación consolidada por entidad a partir de una corrida de nómina';
