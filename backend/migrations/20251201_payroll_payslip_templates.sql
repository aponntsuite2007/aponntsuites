-- ============================================================================
-- PAYROLL PAYSLIP TEMPLATES - Editor Visual de Recibos de Sueldo
-- Sistema de diseño de recibos parametrizable por país/empresa
-- ============================================================================

-- 1. TABLA PRINCIPAL: Templates de Recibos
CREATE TABLE IF NOT EXISTS payroll_payslip_templates (
    id SERIAL PRIMARY KEY,

    -- Scope
    country_id INTEGER REFERENCES payroll_countries(id),
    company_id INTEGER REFERENCES companies(company_id),

    -- Identificación
    template_code VARCHAR(30) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Layout visual (bloques configurables)
    layout_config JSONB NOT NULL DEFAULT '{
        "blocks": [],
        "style": {
            "font_family": "Arial",
            "font_size": 10,
            "primary_color": "#1a1a2e",
            "secondary_color": "#4a5568",
            "paper_size": "A4",
            "orientation": "portrait",
            "margins": {"top": 20, "right": 15, "bottom": 20, "left": 15}
        }
    }'::jsonb,

    -- Campos obligatorios por ley del país
    required_fields JSONB DEFAULT '[]'::jsonb,

    -- Leyendas legales obligatorias
    legal_disclaimers JSONB DEFAULT '[]'::jsonb,

    -- Logo de empresa (path o base64)
    logo_url VARCHAR(500),

    -- Configuración de firmas
    signature_config JSONB DEFAULT '{
        "employer_signature": true,
        "employee_signature": true,
        "digital_signature_enabled": false
    }'::jsonb,

    -- Estado
    is_default BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, template_code)
);

-- 2. BLOQUES DISPONIBLES (catálogo de tipos de bloques)
CREATE TABLE IF NOT EXISTS payroll_payslip_block_types (
    id SERIAL PRIMARY KEY,
    block_type VARCHAR(50) NOT NULL UNIQUE,
    block_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Icono para el editor
    icon VARCHAR(50),

    -- Campos configurables del bloque
    configurable_fields JSONB DEFAULT '[]'::jsonb,

    -- Template HTML base del bloque
    html_template TEXT,

    -- Orden sugerido
    suggested_order INTEGER DEFAULT 50,

    -- Es obligatorio para ciertos países?
    required_for_countries JSONB DEFAULT '[]'::jsonb,

    is_active BOOLEAN DEFAULT true
);

-- 3. Insertar tipos de bloques disponibles
INSERT INTO payroll_payslip_block_types (block_type, block_name, description, icon, configurable_fields, html_template, suggested_order) VALUES

-- Header
('header', 'Encabezado', 'Logo, nombre empresa, título del recibo', 'bi-card-heading',
 '[
    {"field": "show_logo", "type": "boolean", "label": "Mostrar Logo", "default": true},
    {"field": "logo_position", "type": "select", "label": "Posición Logo", "options": ["left", "center", "right"], "default": "left"},
    {"field": "title", "type": "text", "label": "Título", "default": "RECIBO DE SUELDO"},
    {"field": "show_period", "type": "boolean", "label": "Mostrar Período", "default": true},
    {"field": "show_company_tax_id", "type": "boolean", "label": "Mostrar CUIT/RFC", "default": true}
 ]'::jsonb,
 '<div class="payslip-header {{logo_position}}">
    {{#show_logo}}<img src="{{logo_url}}" class="company-logo" />{{/show_logo}}
    <div class="header-text">
        <h1>{{title}}</h1>
        <p class="company-name">{{company.name}}</p>
        {{#show_company_tax_id}}<p class="company-tax-id">{{company.tax_id_label}}: {{company.tax_id}}</p>{{/show_company_tax_id}}
        {{#show_period}}<p class="period">Período: {{period.month}}/{{period.year}}</p>{{/show_period}}
    </div>
</div>',
 10),

-- Datos del empleado
('employee_data', 'Datos del Empleado', 'Información personal y laboral del empleado', 'bi-person-badge',
 '[
    {"field": "fields", "type": "multiselect", "label": "Campos a mostrar",
     "options": ["full_name", "tax_id", "hire_date", "position", "department", "category", "contract_type", "bank_account", "address"],
     "default": ["full_name", "tax_id", "hire_date", "position", "department"]},
    {"field": "layout", "type": "select", "label": "Disposición", "options": ["one_column", "two_columns", "three_columns"], "default": "two_columns"}
 ]'::jsonb,
 '<div class="employee-data layout-{{layout}}">
    {{#fields}}
    <div class="field">
        <label>{{label}}</label>
        <span>{{value}}</span>
    </div>
    {{/fields}}
</div>',
 20),

-- Grilla de conceptos
('concepts_grid', 'Grilla de Conceptos', 'Tabla con haberes y deducciones', 'bi-table',
 '[
    {"field": "columns", "type": "multiselect", "label": "Columnas",
     "options": ["concept_code", "concept_name", "units", "rate", "earnings", "deductions"],
     "default": ["concept_name", "earnings", "deductions"]},
    {"field": "show_subtotals", "type": "boolean", "label": "Mostrar Subtotales", "default": true},
    {"field": "group_by_classification", "type": "boolean", "label": "Agrupar por Clasificación", "default": false},
    {"field": "alternate_row_colors", "type": "boolean", "label": "Colores Alternados", "default": true}
 ]'::jsonb,
 '<table class="concepts-grid {{#alternate_row_colors}}striped{{/alternate_row_colors}}">
    <thead>
        <tr>
            {{#columns}}<th>{{label}}</th>{{/columns}}
        </tr>
    </thead>
    <tbody>
        {{#concepts}}
        <tr class="{{classification}}">
            {{#columns}}<td class="{{type}}">{{value}}</td>{{/columns}}
        </tr>
        {{/concepts}}
    </tbody>
    {{#show_subtotals}}
    <tfoot>
        <tr class="subtotal">
            <td colspan="{{colspan_before}}">SUBTOTALES</td>
            <td class="amount">{{subtotal_earnings}}</td>
            <td class="amount">{{subtotal_deductions}}</td>
        </tr>
    </tfoot>
    {{/show_subtotals}}
</table>',
 30),

-- Totales
('totals', 'Totales', 'Bruto, deducciones totales y neto a cobrar', 'bi-calculator',
 '[
    {"field": "show_gross", "type": "boolean", "label": "Mostrar Bruto", "default": true},
    {"field": "show_total_deductions", "type": "boolean", "label": "Mostrar Total Deducciones", "default": true},
    {"field": "show_net", "type": "boolean", "label": "Mostrar Neto", "default": true},
    {"field": "net_in_words", "type": "boolean", "label": "Neto en Letras", "default": true},
    {"field": "highlight_net", "type": "boolean", "label": "Destacar Neto", "default": true}
 ]'::jsonb,
 '<div class="totals-section">
    {{#show_gross}}<div class="total-row"><span>TOTAL HABERES:</span><span class="amount">{{gross}}</span></div>{{/show_gross}}
    {{#show_total_deductions}}<div class="total-row"><span>TOTAL DEDUCCIONES:</span><span class="amount">{{total_deductions}}</span></div>{{/show_total_deductions}}
    {{#show_net}}<div class="total-row net {{#highlight_net}}highlighted{{/highlight_net}}"><span>NETO A COBRAR:</span><span class="amount">{{net}}</span></div>{{/show_net}}
    {{#net_in_words}}<div class="net-words">Son: {{net_in_words}}</div>{{/net_in_words}}
</div>',
 40),

-- Firmas
('signatures', 'Firmas', 'Espacio para firma de empleador y empleado', 'bi-pen',
 '[
    {"field": "employer_signature", "type": "boolean", "label": "Firma Empleador", "default": true},
    {"field": "employee_signature", "type": "boolean", "label": "Firma Empleado", "default": true},
    {"field": "show_date_line", "type": "boolean", "label": "Línea de Fecha", "default": true},
    {"field": "signature_labels", "type": "object", "label": "Etiquetas",
     "default": {"employer": "Firma y Sello Empleador", "employee": "Firma Empleado"}}
 ]'::jsonb,
 '<div class="signatures-section">
    {{#employer_signature}}
    <div class="signature-box">
        <div class="signature-line"></div>
        <p>{{signature_labels.employer}}</p>
    </div>
    {{/employer_signature}}
    {{#employee_signature}}
    <div class="signature-box">
        <div class="signature-line"></div>
        <p>{{signature_labels.employee}}</p>
    </div>
    {{/employee_signature}}
    {{#show_date_line}}
    <div class="date-line">
        <span>Lugar y Fecha: _______________________</span>
    </div>
    {{/show_date_line}}
</div>',
 50),

-- Leyenda legal
('legal_footer', 'Leyenda Legal', 'Texto legal obligatorio según país', 'bi-file-earmark-text',
 '[
    {"field": "text", "type": "textarea", "label": "Texto Legal", "default": ""},
    {"field": "font_size", "type": "number", "label": "Tamaño Fuente", "default": 8},
    {"field": "show_qr", "type": "boolean", "label": "Mostrar QR Validación", "default": false}
 ]'::jsonb,
 '<div class="legal-footer" style="font-size: {{font_size}}px;">
    <p>{{text}}</p>
    {{#show_qr}}<div class="qr-code"><img src="{{qr_url}}" /></div>{{/show_qr}}
</div>',
 60),

-- Información bancaria
('bank_info', 'Información Bancaria', 'Datos de depósito bancario', 'bi-bank',
 '[
    {"field": "show_bank_name", "type": "boolean", "label": "Mostrar Banco", "default": true},
    {"field": "show_account_number", "type": "boolean", "label": "Mostrar Nº Cuenta", "default": true},
    {"field": "show_cbu", "type": "boolean", "label": "Mostrar CBU/CLABE", "default": true}
 ]'::jsonb,
 '<div class="bank-info">
    <h4>Datos de Depósito</h4>
    {{#show_bank_name}}<p><strong>Banco:</strong> {{bank_name}}</p>{{/show_bank_name}}
    {{#show_account_number}}<p><strong>Cuenta:</strong> {{account_number}}</p>{{/show_account_number}}
    {{#show_cbu}}<p><strong>CBU:</strong> {{cbu}}</p>{{/show_cbu}}
</div>',
 35),

-- Separador
('separator', 'Separador', 'Línea divisoria entre secciones', 'bi-hr',
 '[
    {"field": "style", "type": "select", "label": "Estilo", "options": ["solid", "dashed", "dotted", "double"], "default": "solid"},
    {"field": "thickness", "type": "number", "label": "Grosor (px)", "default": 1},
    {"field": "margin", "type": "number", "label": "Margen (px)", "default": 10}
 ]'::jsonb,
 '<hr class="separator" style="border-style: {{style}}; border-width: {{thickness}}px; margin: {{margin}}px 0;" />',
 25),

-- Texto libre
('custom_text', 'Texto Personalizado', 'Bloque de texto libre', 'bi-fonts',
 '[
    {"field": "content", "type": "richtext", "label": "Contenido", "default": ""},
    {"field": "alignment", "type": "select", "label": "Alineación", "options": ["left", "center", "right", "justify"], "default": "left"}
 ]'::jsonb,
 '<div class="custom-text" style="text-align: {{alignment}};">{{content}}</div>',
 55)

ON CONFLICT (block_type) DO NOTHING;

-- 4. Crear templates base por país
INSERT INTO payroll_payslip_templates (country_id, template_code, template_name, description, is_system, is_default, layout_config, required_fields, legal_disclaimers)
SELECT
    c.id,
    'ARG_STANDARD',
    'Recibo Argentina Estándar',
    'Formato estándar que cumple con requisitos legales argentinos (Ley 20.744)',
    true,
    true,
    '{
        "blocks": [
            {"type": "header", "order": 1, "config": {"show_logo": true, "logo_position": "left", "title": "RECIBO DE HABERES", "show_period": true, "show_company_tax_id": true}},
            {"type": "separator", "order": 2, "config": {"style": "solid", "thickness": 1}},
            {"type": "employee_data", "order": 3, "config": {"fields": ["full_name", "tax_id", "hire_date", "position", "department", "category"], "layout": "two_columns"}},
            {"type": "separator", "order": 4, "config": {"style": "solid", "thickness": 1}},
            {"type": "concepts_grid", "order": 5, "config": {"columns": ["concept_name", "units", "earnings", "deductions"], "show_subtotals": true, "group_by_classification": true, "alternate_row_colors": true}},
            {"type": "totals", "order": 6, "config": {"show_gross": true, "show_total_deductions": true, "show_net": true, "net_in_words": true, "highlight_net": true}},
            {"type": "separator", "order": 7, "config": {"style": "dashed", "thickness": 1}},
            {"type": "bank_info", "order": 8, "config": {"show_bank_name": true, "show_account_number": true, "show_cbu": true}},
            {"type": "signatures", "order": 9, "config": {"employer_signature": true, "employee_signature": true, "show_date_line": true}},
            {"type": "legal_footer", "order": 10, "config": {"text": "Recibi conforme duplicado del presente recibo. El presente tiene caracter de declaracion jurada.", "font_size": 8, "show_qr": false}}
        ],
        "style": {
            "font_family": "Arial",
            "font_size": 10,
            "primary_color": "#1a1a2e",
            "secondary_color": "#4a5568",
            "paper_size": "A4",
            "orientation": "portrait",
            "margins": {"top": 15, "right": 15, "bottom": 15, "left": 15}
        }
    }'::jsonb,
    '["employee_name", "employee_tax_id", "hire_date", "gross", "deductions", "net", "employer_signature", "employee_signature"]'::jsonb,
    '["El presente recibo tiene caracter de declaracion jurada conforme Ley 20.744", "Conservar este comprobante por el plazo de 2 años"]'::jsonb
FROM payroll_countries c WHERE c.country_code = 'ARG'
ON CONFLICT DO NOTHING;

-- Template México
INSERT INTO payroll_payslip_templates (country_id, template_code, template_name, description, is_system, is_default, layout_config, required_fields)
SELECT
    c.id,
    'MEX_CFDI',
    'Recibo México CFDI',
    'Formato con timbrado fiscal SAT',
    true,
    true,
    '{
        "blocks": [
            {"type": "header", "order": 1, "config": {"show_logo": true, "title": "RECIBO DE NÓMINA", "show_period": true}},
            {"type": "employee_data", "order": 2, "config": {"fields": ["full_name", "tax_id", "curp", "hire_date", "position", "department"], "layout": "two_columns"}},
            {"type": "concepts_grid", "order": 3, "config": {"columns": ["concept_code", "concept_name", "earnings", "deductions"], "show_subtotals": true}},
            {"type": "totals", "order": 4, "config": {"show_gross": true, "show_total_deductions": true, "show_net": true, "net_in_words": true}},
            {"type": "custom_text", "order": 5, "config": {"content": "<strong>UUID:</strong> {{cfdi_uuid}}<br><strong>Fecha Timbrado:</strong> {{cfdi_date}}", "alignment": "left"}},
            {"type": "legal_footer", "order": 6, "config": {"text": "Este documento es una representación impresa de un CFDI", "show_qr": true}}
        ],
        "style": {"font_family": "Arial", "font_size": 9, "primary_color": "#006847", "paper_size": "Letter"}
    }'::jsonb,
    '["employee_name", "employee_rfc", "employee_curp", "cfdi_uuid", "cfdi_stamp"]'::jsonb
FROM payroll_countries c WHERE c.country_code = 'MEX'
ON CONFLICT DO NOTHING;

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_payslip_templates_company ON payroll_payslip_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_payslip_templates_country ON payroll_payslip_templates(country_id);
CREATE INDEX IF NOT EXISTS idx_payslip_templates_active ON payroll_payslip_templates(is_active);

-- 6. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_payslip_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payslip_template_updated ON payroll_payslip_templates;
CREATE TRIGGER trg_payslip_template_updated
    BEFORE UPDATE ON payroll_payslip_templates
    FOR EACH ROW EXECUTE FUNCTION update_payslip_template_timestamp();

-- 7. Vista para obtener templates con info de país
CREATE OR REPLACE VIEW v_payslip_templates_full AS
SELECT
    pt.*,
    pc.country_code,
    pc.country_name,
    c.name as company_name
FROM payroll_payslip_templates pt
LEFT JOIN payroll_countries pc ON pt.country_id = pc.id
LEFT JOIN companies c ON pt.company_id = c.company_id
WHERE pt.is_active = true;

SELECT 'Migración payroll_payslip_templates completada' as status;
