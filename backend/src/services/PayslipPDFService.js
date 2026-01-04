/**
 * PayslipPDFService - Generador de Recibos de Sueldo en PDF
 * Usa templates con bloques configurables + Puppeteer para generar PDF
 */

const Mustache = require('mustache');
const path = require('path');

// 🛡️ PRODUCTION-SAFE: Puppeteer es opcional
let puppeteer = null;
let PUPPETEER_AVAILABLE = false;

try {
    puppeteer = require('puppeteer');
    PUPPETEER_AVAILABLE = true;
    console.log('✅ [PAYSLIP-PDF] Puppeteer cargado correctamente');
} catch (e) {
    console.log('⚠️ [PAYSLIP-PDF] Puppeteer no disponible (opcional en producción):', e.message);
}

class PayslipPDFService {
    constructor() {
        this.browser = null;
    }

    /**
     * Inicializa el browser de Puppeteer (singleton)
     */
    async initBrowser() {
        // 🛡️ Verificar si Puppeteer está disponible
        if (!PUPPETEER_AVAILABLE || !puppeteer) {
            throw new Error('Puppeteer no disponible en este ambiente. Generación de PDF deshabilitada.');
        }
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
        return this.browser;
    }

    /**
     * Cierra el browser
     */
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * Genera un recibo de sueldo en PDF
     * @param {Object} template - Template con layout_config y bloques
     * @param {Object} data - Datos del empleado y liquidación
     * @returns {Buffer} - Buffer del PDF generado
     */
    async generatePayslip(template, data) {
        const browser = await this.initBrowser();
        const page = await browser.newPage();

        try {
            // Renderizar HTML desde el template
            const html = this.renderTemplate(template, data);

            // Configurar página
            await page.setContent(html, { waitUntil: 'networkidle0' });

            // Obtener configuración de estilo del template
            const style = template.layout_config?.style || {};
            const paperSize = style.paper_size || 'A4';
            const orientation = style.orientation || 'portrait';

            // Generar PDF
            const pdfBuffer = await page.pdf({
                format: paperSize,
                landscape: orientation === 'landscape',
                printBackground: true,
                margin: {
                    top: `${style.margins?.top || 15}mm`,
                    right: `${style.margins?.right || 15}mm`,
                    bottom: `${style.margins?.bottom || 15}mm`,
                    left: `${style.margins?.left || 15}mm`
                }
            });

            return pdfBuffer;
        } finally {
            await page.close();
        }
    }

    /**
     * Renderiza el template completo como HTML
     */
    renderTemplate(template, data) {
        const style = template.layout_config?.style || {};
        const blocks = template.layout_config?.blocks || [];

        // Agrupar bloques por fila
        const rows = {};
        blocks.forEach((block, index) => {
            const rowNum = block.row || index + 1;
            if (!rows[rowNum]) rows[rowNum] = [];
            rows[rowNum].push(block);
        });

        // Ordenar filas y renderizar
        const sortedRowNums = Object.keys(rows).map(Number).sort((a, b) => a - b);

        const blocksHtml = sortedRowNums.map(rowNum => {
            const rowBlocks = rows[rowNum];
            const rowBlocksHtml = rowBlocks.map(block => {
                const width = block.width || 12;
                const widthPercent = Math.round((width / 12) * 100);
                const blockHtml = this.renderBlock(block, data, template.blockTypes);
                return `<div class="payslip-col" style="flex: 0 0 ${widthPercent}%; max-width: ${widthPercent}%; box-sizing: border-box;">${blockHtml}</div>`;
            }).join('\n');

            return `<div class="payslip-row">${rowBlocksHtml}</div>`;
        }).join('\n');

        // HTML completo con estilos
        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recibo de Sueldo - ${data.employee?.full_name || 'Empleado'}</title>
    <style>
        ${this.getBaseStyles(style)}
        ${this.getBlockStyles()}
        ${this.getGridStyles()}
    </style>
</head>
<body>
    <div class="payslip-container">
        ${blocksHtml}
    </div>
</body>
</html>`;
    }

    /**
     * Estilos para el sistema de grid
     */
    getGridStyles() {
        return `
        .payslip-row {
            display: flex;
            flex-wrap: wrap;
            margin: 0 -4px;
        }
        .payslip-col {
            padding: 0 4px;
            margin-bottom: 8px;
        }
        .payslip-col > * {
            height: 100%;
        }
        `;
    }

    /**
     * Renderiza un bloque individual
     */
    renderBlock(block, data, blockTypes = []) {
        const blockType = blockTypes?.find(bt => bt.block_type === block.type);
        const htmlTemplate = blockType?.html_template || this.getDefaultBlockTemplate(block.type);

        // Preparar datos para el bloque
        const blockData = this.prepareBlockData(block, data);

        // Renderizar con Mustache
        try {
            return Mustache.render(htmlTemplate, blockData);
        } catch (e) {
            console.error(`[PayslipPDF] Error rendering block ${block.type}:`, e);
            return `<div class="block-error">Error en bloque: ${block.type}</div>`;
        }
    }

    /**
     * Prepara los datos específicos para cada tipo de bloque
     */
    prepareBlockData(block, data) {
        const config = block.config || {};
        const employee = data.employee || {};
        const company = data.company || {};
        const period = data.period || {};
        const concepts = data.concepts || [];
        const totals = data.totals || {};

        switch (block.type) {
            case 'header':
                return {
                    ...config,
                    logo_url: company.logo || data.logo_url,
                    company: {
                        name: company.name || company.display_name,
                        tax_id: company.tax_id,
                        tax_id_label: company.tax_id_label || 'CUIT',
                        address: company.address
                    },
                    period: {
                        month: period.month,
                        year: period.year,
                        formatted: `${this.getMonthName(period.month)} ${period.year}`
                    }
                };

            case 'employee_data':
                const fields = (config.fields || ['full_name', 'tax_id', 'hire_date']).map(fieldName => ({
                    label: this.getFieldLabel(fieldName),
                    value: this.getFieldValue(fieldName, employee)
                }));
                return { ...config, fields };

            case 'concepts_grid':
                const columns = config.columns || ['concept_name', 'earnings', 'deductions'];
                return {
                    ...config,
                    columns: columns.map(col => ({ label: this.getColumnLabel(col), type: col })),
                    concepts: this.formatConcepts(concepts, columns),
                    colspan_before: columns.length - 2,
                    subtotal_earnings: this.formatCurrency(totals.gross || 0, data.currency),
                    subtotal_deductions: this.formatCurrency(totals.deductions || 0, data.currency)
                };

            case 'totals':
                return {
                    ...config,
                    gross: this.formatCurrency(totals.gross || 0, data.currency),
                    total_deductions: this.formatCurrency(totals.deductions || 0, data.currency),
                    net: this.formatCurrency(totals.net || 0, data.currency),
                    net_in_words: config.net_in_words ? this.numberToWords(totals.net || 0, data.currency) : null
                };

            case 'signatures':
                return {
                    ...config,
                    signature_labels: config.signature_labels || {
                        employee: 'Firma del Empleado',
                        employer: 'Firma y Sello del Empleador'
                    }
                };

            case 'bank_info':
                return {
                    ...config,
                    bank_name: employee.bank_name,
                    account_number: employee.bank_account,
                    cbu: employee.cbu || employee.clabe
                };

            case 'legal_footer':
                return {
                    ...config,
                    text: config.text || template?.legal_disclaimers?.join('\n') || '',
                    qr_url: data.qr_url
                };

            case 'separator':
                return config;

            case 'custom_text':
                // Renderizar variables en el contenido personalizado
                return {
                    ...config,
                    content: Mustache.render(config.content || '', { ...data, employee, company, period, totals })
                };

            default:
                return { ...config, ...data };
        }
    }

    /**
     * Estilos base del documento
     */
    getBaseStyles(style) {
        return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: ${style.font_family || 'Arial'}, sans-serif;
            font-size: ${style.font_size || 10}pt;
            color: #333;
            line-height: 1.4;
        }
        .payslip-container {
            max-width: 100%;
            padding: 10px;
        }
        .block-error {
            padding: 10px;
            background: #fee;
            border: 1px solid #f00;
            color: #900;
            margin: 5px 0;
        }
        `;
    }

    /**
     * Estilos para los bloques
     */
    getBlockStyles() {
        return `
        /* Header */
        .payslip-header {
            display: flex;
            align-items: flex-start;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #333;
        }
        .payslip-header.left { flex-direction: row; }
        .payslip-header.center { flex-direction: column; align-items: center; text-align: center; }
        .payslip-header.right { flex-direction: row-reverse; }
        .payslip-header .company-logo {
            max-height: 60px;
            max-width: 150px;
            margin-right: 20px;
        }
        .payslip-header .header-text h1 {
            font-size: 16pt;
            margin-bottom: 5px;
        }
        .payslip-header .company-name {
            font-size: 12pt;
            font-weight: bold;
        }
        .payslip-header .company-tax-id,
        .payslip-header .period {
            font-size: 9pt;
            color: #666;
        }

        /* Employee Data */
        .employee-data {
            display: grid;
            gap: 8px;
            margin: 15px 0;
            padding: 10px;
            background: #f9f9f9;
            border-radius: 4px;
        }
        .employee-data.layout-one_column { grid-template-columns: 1fr; }
        .employee-data.layout-two_columns { grid-template-columns: 1fr 1fr; }
        .employee-data.layout-three_columns { grid-template-columns: 1fr 1fr 1fr; }
        .employee-data .field {
            display: flex;
            gap: 5px;
        }
        .employee-data .field label {
            font-weight: bold;
            min-width: 120px;
        }

        /* Concepts Grid */
        .concepts-grid {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 9pt;
        }
        .concepts-grid th,
        .concepts-grid td {
            padding: 6px 8px;
            border: 1px solid #ddd;
            text-align: left;
        }
        .concepts-grid th {
            background: #333;
            color: white;
            font-weight: bold;
        }
        .concepts-grid.striped tbody tr:nth-child(even) {
            background: #f5f5f5;
        }
        .concepts-grid .amount {
            text-align: right;
            font-family: 'Courier New', monospace;
        }
        .concepts-grid .subtotal td {
            font-weight: bold;
            background: #eee;
        }

        /* Totals */
        .totals-section {
            margin: 15px 0;
            padding: 10px;
            background: #f0f0f0;
            border-radius: 4px;
        }
        .totals-section .total-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px dotted #ccc;
        }
        .totals-section .total-row.net {
            font-size: 12pt;
            font-weight: bold;
            border-bottom: none;
            margin-top: 5px;
            padding-top: 10px;
            border-top: 2px solid #333;
        }
        .totals-section .total-row.net.highlighted {
            background: #333;
            color: white;
            padding: 10px;
            margin: 5px -10px -10px;
            border-radius: 0 0 4px 4px;
        }
        .totals-section .net-words {
            font-style: italic;
            font-size: 9pt;
            margin-top: 5px;
            color: #666;
        }

        /* Signatures */
        .signatures-section {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            padding-top: 20px;
        }
        .signatures-section .signature-box {
            text-align: center;
            width: 200px;
        }
        .signatures-section .signature-line {
            border-top: 1px solid #333;
            margin-bottom: 5px;
            height: 40px;
        }
        .signatures-section .date-line {
            margin-top: 20px;
            font-size: 9pt;
        }

        /* Bank Info */
        .bank-info {
            margin: 15px 0;
            padding: 10px;
            background: #f5f5f5;
            border-left: 3px solid #333;
        }
        .bank-info h4 {
            margin-bottom: 8px;
        }
        .bank-info p {
            margin: 3px 0;
            font-size: 9pt;
        }

        /* Legal Footer */
        .legal-footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #ccc;
            color: #666;
        }
        .legal-footer .qr-code {
            float: right;
            width: 80px;
        }
        .legal-footer .qr-code img {
            width: 100%;
        }

        /* Separator */
        .separator {
            border: none;
            border-top: 1px solid #ccc;
        }

        /* Custom Text */
        .custom-text {
            margin: 10px 0;
            padding: 10px;
        }
        `;
    }

    /**
     * Templates por defecto para cada tipo de bloque
     */
    getDefaultBlockTemplate(blockType) {
        const templates = {
            header: `
                <div class="payslip-header {{logo_position}}">
                    {{#show_logo}}<img src="{{logo_url}}" class="company-logo" />{{/show_logo}}
                    <div class="header-text">
                        <h1>{{title}}</h1>
                        <p class="company-name">{{company.name}}</p>
                        {{#show_company_tax_id}}<p class="company-tax-id">{{company.tax_id_label}}: {{company.tax_id}}</p>{{/show_company_tax_id}}
                        {{#show_period}}<p class="period">Período: {{period.formatted}}</p>{{/show_period}}
                    </div>
                </div>
            `,
            employee_data: `
                <div class="employee-data layout-{{layout}}">
                    {{#fields}}
                    <div class="field">
                        <label>{{label}}:</label>
                        <span>{{value}}</span>
                    </div>
                    {{/fields}}
                </div>
            `,
            concepts_grid: `
                <table class="concepts-grid {{#alternate_row_colors}}striped{{/alternate_row_colors}}">
                    <thead>
                        <tr>
                            {{#columns}}<th>{{label}}</th>{{/columns}}
                        </tr>
                    </thead>
                    <tbody>
                        {{#concepts}}
                        <tr>
                            {{#values}}<td class="{{type}}">{{value}}</td>{{/values}}
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
                </table>
            `,
            totals: `
                <div class="totals-section">
                    {{#show_gross}}<div class="total-row"><span>TOTAL HABERES:</span><span class="amount">{{gross}}</span></div>{{/show_gross}}
                    {{#show_total_deductions}}<div class="total-row"><span>TOTAL DEDUCCIONES:</span><span class="amount">{{total_deductions}}</span></div>{{/show_total_deductions}}
                    {{#show_net}}<div class="total-row net {{#highlight_net}}highlighted{{/highlight_net}}"><span>NETO A COBRAR:</span><span class="amount">{{net}}</span></div>{{/show_net}}
                    {{#net_in_words}}<div class="net-words">Son: {{net_in_words}}</div>{{/net_in_words}}
                </div>
            `,
            signatures: `
                <div class="signatures-section">
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
                </div>
            `,
            bank_info: `
                <div class="bank-info">
                    <h4>Datos de Depósito</h4>
                    {{#show_bank_name}}<p><strong>Banco:</strong> {{bank_name}}</p>{{/show_bank_name}}
                    {{#show_account_number}}<p><strong>Cuenta:</strong> {{account_number}}</p>{{/show_account_number}}
                    {{#show_cbu}}<p><strong>CBU:</strong> {{cbu}}</p>{{/show_cbu}}
                </div>
            `,
            legal_footer: `
                <div class="legal-footer" style="font-size: {{font_size}}px;">
                    <p>{{text}}</p>
                    {{#show_qr}}<div class="qr-code"><img src="{{qr_url}}" /></div>{{/show_qr}}
                </div>
            `,
            separator: `<hr class="separator" style="border-style: {{style}}; border-width: {{thickness}}px; margin: {{margin}}px 0;" />`,
            custom_text: `<div class="custom-text" style="text-align: {{alignment}};">{{content}}</div>`
        };

        return templates[blockType] || '<div>Bloque no definido: {{type}}</div>';
    }

    // Helpers
    getMonthName(month) {
        const months = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return months[month] || '';
    }

    getFieldLabel(fieldName) {
        const labels = {
            full_name: 'Nombre',
            tax_id: 'CUIL/RFC',
            hire_date: 'Fecha Ingreso',
            position: 'Cargo',
            department: 'Departamento',
            category: 'Categoría',
            contract_type: 'Tipo Contrato',
            bank_account: 'Cuenta Bancaria',
            address: 'Domicilio',
            curp: 'CURP'
        };
        return labels[fieldName] || fieldName;
    }

    getFieldValue(fieldName, employee) {
        if (fieldName === 'hire_date' && employee[fieldName]) {
            return new Date(employee[fieldName]).toLocaleDateString('es-AR');
        }
        return employee[fieldName] || '-';
    }

    getColumnLabel(col) {
        const labels = {
            concept_code: 'Código',
            concept_name: 'Concepto',
            units: 'Unidades',
            rate: 'Valor Unitario',
            earnings: 'Haberes',
            deductions: 'Deducciones'
        };
        return labels[col] || col;
    }

    formatConcepts(concepts, columns) {
        return concepts.map(concept => ({
            classification: concept.classification,
            values: columns.map(col => ({
                type: col === 'earnings' || col === 'deductions' || col === 'rate' ? 'amount' : 'text',
                value: col === 'earnings' ? (concept.is_deduction ? '' : this.formatCurrency(concept.amount)) :
                       col === 'deductions' ? (concept.is_deduction ? this.formatCurrency(concept.amount) : '') :
                       col === 'rate' ? this.formatCurrency(concept.rate || 0) :
                       col === 'units' ? (concept.units || concept.quantity || '-') :
                       concept[col] || '-'
            }))
        }));
    }

    formatCurrency(amount, currency = 'ARS') {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency
        }).format(amount || 0);
    }

    numberToWords(num, currency = 'ARS') {
        // Implementación básica - en producción usar librería como 'numero-a-letras'
        const currencyNames = {
            'ARS': 'pesos',
            'MXN': 'pesos mexicanos',
            'USD': 'dólares'
        };
        // Simplificado - devolver formato numérico con texto
        const formatted = this.formatCurrency(num, currency);
        return `${formatted} (${currencyNames[currency] || 'unidades'})`;
    }

    /**
     * Genera múltiples recibos en un solo PDF
     */
    async generateBulkPayslips(template, employeesData, blockTypes = []) {
        const browser = await this.initBrowser();
        const page = await browser.newPage();

        try {
            // Agregar blockTypes al template
            const templateWithTypes = { ...template, blockTypes };

            // Renderizar todos los recibos
            const allHtml = employeesData.map((data, index) => {
                const html = this.renderTemplate(templateWithTypes, data);
                // Agregar page-break entre recibos excepto el último
                return index < employeesData.length - 1
                    ? html.replace('</body>', '<div style="page-break-after: always;"></div></body>')
                    : html;
            }).join('');

            await page.setContent(allHtml, { waitUntil: 'networkidle0' });

            const style = template.layout_config?.style || {};
            const pdfBuffer = await page.pdf({
                format: style.paper_size || 'A4',
                landscape: style.orientation === 'landscape',
                printBackground: true,
                margin: {
                    top: `${style.margins?.top || 15}mm`,
                    right: `${style.margins?.right || 15}mm`,
                    bottom: `${style.margins?.bottom || 15}mm`,
                    left: `${style.margins?.left || 15}mm`
                }
            });

            return pdfBuffer;
        } finally {
            await page.close();
        }
    }
}

// Singleton instance
const payslipPDFService = new PayslipPDFService();

module.exports = payslipPDFService;
