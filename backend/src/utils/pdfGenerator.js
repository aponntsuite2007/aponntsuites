const puppeteer = require('puppeteer');
const path = require('path');

class PDFGenerator {
    constructor() {
        this.browser = null;
    }

    async init() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
        return this.browser;
    }

    async generateLegalDocumentPDF(communicationData, templateContent) {
        try {
            await this.init();
            const page = await this.browser.newPage();
            
            const html = this.generateHTML(communicationData, templateContent);
            
            await page.setContent(html, { 
                waitUntil: 'networkidle0',
                timeout: 10000 
            });

            const pdf = await page.pdf({
                format: 'A4',
                margin: {
                    top: '20mm',
                    right: '20mm',
                    bottom: '20mm',
                    left: '20mm'
                },
                displayHeaderFooter: true,
                headerTemplate: `
                    <div style="width: 100%; font-size: 10px; padding: 0 20px; display: flex; justify-content: space-between;">
                        <span>Documento Legal - ${communicationData.company_name || 'Empresa'}</span>
                        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
                    </div>
                `,
                footerTemplate: `
                    <div style="width: 100%; font-size: 9px; padding: 0 20px; text-align: center; color: #666;">
                        Generado automáticamente el ${new Date().toLocaleDateString('es-AR')} - 
                        Sistema de Comunicaciones Legales v1.0
                    </div>
                `,
                printBackground: true
            });

            await page.close();
            return pdf;
            
        } catch (error) {
            console.error('Error generando PDF:', error);
            throw new Error(`Error al generar PDF: ${error.message}`);
        }
    }

    generateHTML(data, templateContent) {
        const processedContent = this.replaceTemplateVariables(templateContent, data);
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Documento Legal - ${data.communication_type_name}</title>
            <style>
                body {
                    font-family: 'Times New Roman', serif;
                    font-size: 12pt;
                    line-height: 1.6;
                    color: #000;
                    margin: 0;
                    padding: 20px;
                }
                
                .header {
                    text-align: center;
                    border-bottom: 3px solid #000;
                    padding-bottom: 15px;
                    margin-bottom: 30px;
                }
                
                .company-info {
                    font-size: 14pt;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                
                .document-title {
                    font-size: 16pt;
                    font-weight: bold;
                    text-decoration: underline;
                    margin: 20px 0;
                }
                
                .content {
                    white-space: pre-line;
                    text-align: justify;
                    margin-bottom: 40px;
                }
                
                .legal-footer {
                    margin-top: 40px;
                    border-top: 1px solid #ccc;
                    padding-top: 20px;
                    font-size: 10pt;
                    color: #666;
                }
                
                .signature-area {
                    margin-top: 60px;
                    text-align: right;
                }
                
                .reference-box {
                    border: 1px solid #000;
                    padding: 10px;
                    margin: 20px 0;
                    background-color: #f9f9f9;
                }
                
                .legal-basis {
                    font-style: italic;
                    background-color: #f0f0f0;
                    padding: 10px;
                    margin: 15px 0;
                    border-left: 4px solid #333;
                }
                
                @media print {
                    body { margin: 0; }
                    .header { break-after: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-info">${data.company_name || 'EMPRESA'}</div>
                <div>CUIT: ${data.company_cuit || 'XX-XXXXXXXX-X'}</div>
                <div>Domicilio: ${data.company_address || 'Dirección de la Empresa'}</div>
            </div>
            
            <div class="reference-box">
                <strong>REFERENCIA:</strong> ${data.reference_number || 'DOC-' + Date.now()}<br>
                <strong>FECHA:</strong> ${new Date().toLocaleDateString('es-AR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric'
                })}<br>
                <strong>TIPO:</strong> ${data.communication_type_name}<br>
                ${data.legal_basis ? `<strong>BASE LEGAL:</strong> ${data.legal_basis}` : ''}
            </div>
            
            <div class="document-title">${data.communication_type_name.toUpperCase()}</div>
            
            <div class="content">${processedContent}</div>
            
            ${data.legal_basis ? `
            <div class="legal-basis">
                <strong>FUNDAMENTO LEGAL:</strong><br>
                ${data.legal_basis}
            </div>
            ` : ''}
            
            <div class="signature-area">
                <div style="margin-top: 40px; border-top: 1px solid #000; width: 200px; margin-left: auto;">
                    Firma y Aclaración<br>
                    ${data.company_name || 'EMPLEADOR'}
                </div>
            </div>
            
            <div class="legal-footer">
                <p><strong>AVISO LEGAL:</strong> Este documento ha sido generado conforme a la legislación 
                laboral argentina vigente (Ley de Contrato de Trabajo N° 20.744 y modificatorias). 
                El empleado tiene derecho a impugnar esta medida conforme a las normas aplicables.</p>
                
                <p><strong>NOTIFICACIÓN:</strong> Se deja constancia que el presente documento fue 
                notificado en legal forma conforme a las disposiciones del Art. 243 de la LCT.</p>
                
                <p style="text-align: center; font-size: 9pt; color: #999;">
                    Documento generado electrónicamente - ${new Date().toISOString()}
                </p>
            </div>
        </body>
        </html>
        `;
    }

    replaceTemplateVariables(template, data) {
        let content = template;
        
        const variables = {
            employee_name: data.employee_name || '[NOMBRE DEL EMPLEADO]',
            employee_id: data.employee_id || '[ID EMPLEADO]',
            employee_address: data.employee_address || '[DOMICILIO DEL EMPLEADO]',
            issue_date: data.issue_date || new Date().toLocaleDateString('es-AR'),
            reference_number: data.reference_number || 'REF-' + Date.now(),
            facts_description: data.facts_description || '[DESCRIPCIÓN DE LOS HECHOS]',
            legal_basis: data.legal_basis || '[BASE LEGAL]',
            description: data.description || '[DESCRIPCIÓN]',
            termination_date: data.termination_date || new Date().toLocaleDateString('es-AR'),
            start_date: data.start_date || new Date().toLocaleDateString('es-AR'),
            company_name: data.company_name || '[NOMBRE DE LA EMPRESA]',
            suspension_days: data.suspension_days || '[DÍAS]',
            salary_amount: data.salary_amount || '[MONTO]'
        };

        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            content = content.replace(regex, variables[key]);
        });

        return content;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

// Singleton instance
const pdfGenerator = new PDFGenerator();

// Graceful shutdown
process.on('SIGINT', async () => {
    await pdfGenerator.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await pdfGenerator.close();
    process.exit(0);
});

module.exports = pdfGenerator;