const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class PDFGenerationService {
    constructor() {
        this.browser = null;
    }

    /**
     * Inicializar navegador de Puppeteer (reutilizable)
     */
    async initBrowser() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            });
        }
        return this.browser;
    }

    /**
     * Generar PDF del documento de consentimiento legal
     */
    async generateConsentPDF(userData, companyData, consentData) {
        try {
            const browser = await this.initBrowser();
            const page = await browser.newPage();

            // HTML del documento legal
            const html = this.generateConsentHTML(userData, companyData, consentData);

            await page.setContent(html, { waitUntil: 'networkidle0' });

            // Configuración del PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm'
                },
                displayHeaderFooter: true,
                headerTemplate: `
                    <div style="width: 100%; font-size: 10px; padding: 0 15mm; text-align: center; color: #64748b;">
                        <span>Consentimiento Biométrico - APONNT</span>
                    </div>
                `,
                footerTemplate: `
                    <div style="width: 100%; font-size: 9px; padding: 0 15mm; display: flex; justify-content: space-between; color: #64748b;">
                        <span>Ley 25.326 (ARG) · GDPR · BIPA</span>
                        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
                        <span>${new Date().toLocaleDateString('es-AR')}</span>
                    </div>
                `
            });

            await page.close();

            // Generar hash del PDF para integridad
            const pdfHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

            return {
                buffer: pdfBuffer,
                hash: pdfHash,
                filename: `Consentimiento_${userData.lastName}_${userData.firstName}_${Date.now()}.pdf`
            };

        } catch (error) {
            console.error('Error generando PDF:', error);
            throw error;
        }
    }

    /**
     * Generar HTML formateado para el PDF
     */
    generateConsentHTML(userData, companyData, consentData) {
        const { consentDate, expiresAt, immutableSignature, version, consentText, ipAddress, userAgent } = consentData;

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            color: #1e293b;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
        }

        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }

        .header p {
            font-size: 14px;
            opacity: 0.9;
        }

        .section {
            margin-bottom: 30px;
        }

        .section h2 {
            font-size: 20px;
            color: #667eea;
            margin-bottom: 15px;
            border-bottom: 2px solid #667eea;
            padding-bottom: 8px;
        }

        .section h3 {
            font-size: 16px;
            color: #334155;
            margin-bottom: 10px;
            margin-top: 20px;
        }

        .info-box {
            background: #f1f5f9;
            padding: 20px;
            border-radius: 8px;
            margin: 15px 0;
            border-left: 4px solid #667eea;
        }

        .info-row {
            display: flex;
            margin: 8px 0;
            font-size: 14px;
        }

        .info-label {
            font-weight: 600;
            min-width: 180px;
            color: #475569;
        }

        .info-value {
            color: #1e293b;
        }

        .legal-text {
            text-align: justify;
            font-size: 13px;
            line-height: 1.8;
            color: #334155;
            margin: 15px 0;
        }

        .highlight-box {
            background: #fef3c7;
            border: 2px solid #f59e0b;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }

        .highlight-box h3 {
            color: #92400e;
            margin-bottom: 10px;
        }

        .highlight-box p {
            color: #78350f;
            font-size: 13px;
        }

        ul {
            margin-left: 25px;
            margin-top: 10px;
        }

        li {
            margin: 8px 0;
            font-size: 13px;
            line-height: 1.6;
        }

        .signature-box {
            background: #d1fae5;
            border: 2px solid #10b981;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
        }

        .signature-box h3 {
            color: #065f46;
            margin-bottom: 15px;
        }

        .signature-hash {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            word-break: break-all;
            background: white;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }

        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            font-size: 11px;
            color: #64748b;
        }

        .page-break {
            page-break-after: always;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }

        table td {
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 13px;
        }

        table td:first-child {
            font-weight: 600;
            color: #475569;
            width: 40%;
        }

        .alert-box {
            background: #fee2e2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }

        .alert-box strong {
            color: #991b1b;
        }
    </style>
</head>
<body>
    <!-- Encabezado -->
    <div class="header">
        <h1>🔐 CONSENTIMIENTO INFORMADO</h1>
        <h2>TRATAMIENTO DE DATOS BIOMÉTRICOS</h2>
        <p>Sistema APONNT - ${companyData.name}</p>
        <p>Documento versión ${version} - Cumplimiento Ley 25.326 (ARG), GDPR, BIPA</p>
    </div>

    <!-- Información del Empleado -->
    <div class="section">
        <h2>1. INFORMACIÓN DEL TITULAR</h2>
        <div class="info-box">
            <table>
                <tr>
                    <td><strong>Nombre completo:</strong></td>
                    <td>${userData.firstName} ${userData.lastName}</td>
                </tr>
                <tr>
                    <td><strong>Email:</strong></td>
                    <td>${userData.email}</td>
                </tr>
                <tr>
                    <td><strong>Empresa:</strong></td>
                    <td>${companyData.name}</td>
                </tr>
                <tr>
                    <td><strong>Fecha de aceptación:</strong></td>
                    <td>${new Date(consentDate).toLocaleString('es-AR', {
                        dateStyle: 'full',
                        timeStyle: 'medium',
                        timeZone: 'America/Argentina/Buenos_Aires'
                    })}</td>
                </tr>
                <tr>
                    <td><strong>Válido hasta:</strong></td>
                    <td>${new Date(expiresAt).toLocaleDateString('es-AR', {
                        dateStyle: 'long',
                        timeZone: 'America/Argentina/Buenos_Aires'
                    })} (1 año)</td>
                </tr>
            </table>
        </div>
    </div>

    <!-- Responsable del Tratamiento -->
    <div class="section">
        <h2>2. RESPONSABLE DEL TRATAMIENTO</h2>
        <p class="legal-text">
            <strong>${companyData.name}</strong> (en adelante "el Responsable"), con domicilio en
            ${companyData.address || '[Domicilio registrado]'}, en su carácter de empleador,
            es responsable del tratamiento de los datos biométricos del titular mencionado.
        </p>
        <p class="legal-text">
            <strong>Contacto:</strong> ${companyData.email || process.env.SUPPORT_EMAIL || 'soporte@aponnt.com'}
        </p>
    </div>

    <!-- Finalidad del Tratamiento -->
    <div class="section">
        <h2>3. FINALIDAD DEL TRATAMIENTO</h2>
        <p class="legal-text">
            Los datos biométricos del titular serán tratados con las siguientes finalidades:
        </p>
        <ul>
            <li><strong>Control de asistencia:</strong> Registro biométrico de entradas y salidas del lugar de trabajo</li>
            <li><strong>Identificación segura:</strong> Verificación inequívoca de la identidad del empleado</li>
            <li><strong>Análisis biométrico:</strong> Evaluación de parámetros relacionados con bienestar y fatiga laboral</li>
            <li><strong>Seguridad:</strong> Control de acceso a áreas restringidas mediante reconocimiento facial</li>
            <li><strong>Cumplimiento legal:</strong> Cumplimiento de obligaciones laborales y normativas vigentes</li>
        </ul>
    </div>

    <!-- Datos Recopilados -->
    <div class="section">
        <h2>4. DATOS BIOMÉTRICOS RECOPILADOS</h2>
        <div class="info-box">
            <h3>Categorías de datos:</h3>
            <ul>
                <li><strong>Imagen facial:</strong> Fotografía del rostro del titular</li>
                <li><strong>Características faciales:</strong> Vectores matemáticos derivados de la imagen facial</li>
                <li><strong>Parámetros biométricos:</strong> Mediciones relacionadas con estado emocional y fatiga</li>
                <li><strong>Timestamps:</strong> Fecha y hora de cada registro biométrico</li>
                <li><strong>Metadatos:</strong> Dispositivo, ubicación y contexto del registro</li>
            </ul>
        </div>
    </div>

    <div class="page-break"></div>

    <!-- Base Legal -->
    <div class="section">
        <h2>5. BASE LEGAL DEL TRATAMIENTO</h2>
        <p class="legal-text">
            El tratamiento de datos biométricos se fundamenta en:
        </p>
        <ul>
            <li><strong>Ley 25.326</strong> de Protección de Datos Personales (Argentina)</li>
            <li><strong>Reglamento General de Protección de Datos (GDPR)</strong> - Artículo 9</li>
            <li><strong>Biometric Information Privacy Act (BIPA)</strong> - Illinois, USA</li>
            <li><strong>Consentimiento informado</strong> del titular (Art. 5 y 11 Ley 25.326)</li>
            <li><strong>Interés legítimo</strong> del empleador en el control de asistencia</li>
        </ul>
    </div>

    <!-- Tecnología Utilizada -->
    <div class="section">
        <h2>6. TECNOLOGÍA Y PROCESAMIENTO</h2>
        <div class="info-box">
            <p class="legal-text">
                <strong>Proveedor de servicios:</strong> Microsoft Azure Cognitive Services - Face API
            </p>
            <p class="legal-text">
                <strong>Ubicación de servidores:</strong> Microsoft Azure - Región seleccionada con cumplimiento GDPR
            </p>
            <p class="legal-text">
                <strong>Cifrado:</strong> Cifrado en tránsito (TLS 1.3) y en reposo (AES-256)
            </p>
            <p class="legal-text">
                <strong>Retención:</strong> Los datos se conservan durante la vigencia de la relación laboral
                más 90 días adicionales, salvo obligación legal de conservación mayor.
            </p>
        </div>
    </div>

    <!-- Derechos del Titular -->
    <div class="section">
        <h2>7. DERECHOS DEL TITULAR (Art. 14-16 Ley 25.326)</h2>

        <div class="highlight-box">
            <h3>⚖️ Sus Derechos Garantizados:</h3>
            <ul>
                <li><strong>Derecho de acceso:</strong> Solicitar copia de sus datos biométricos almacenados</li>
                <li><strong>Derecho de rectificación:</strong> Corregir datos inexactos o incompletos</li>
                <li><strong>Derecho de supresión:</strong> Solicitar eliminación de sus datos ("derecho al olvido")</li>
                <li><strong>Derecho de oposición:</strong> Oponerse al tratamiento en circunstancias particulares</li>
                <li><strong>Derecho de portabilidad:</strong> Recibir sus datos en formato estructurado</li>
                <li><strong>Derecho de revocación:</strong> Revocar este consentimiento en cualquier momento</li>
            </ul>
        </div>

        <p class="legal-text">
            <strong>¿Cómo ejercer sus derechos?</strong><br>
            Puede ejercer cualquiera de estos derechos enviando un email a:
            <strong>${companyData.email || process.env.SUPPORT_EMAIL || 'soporte@aponnt.com'}</strong>
        </p>
        <p class="legal-text">
            El Responsable responderá su solicitud en un plazo máximo de <strong>10 días hábiles</strong>
            desde la recepción de la misma.
        </p>
    </div>

    <!-- Revocación -->
    <div class="section">
        <h2>8. REVOCACIÓN DEL CONSENTIMIENTO</h2>
        <div class="alert-box">
            <p>
                <strong>Importante:</strong> Este consentimiento es <strong>totalmente voluntario</strong>
                y puede ser revocado en cualquier momento sin que ello afecte negativamente su situación laboral.
            </p>
        </div>
        <p class="legal-text">
            La revocación debe realizarse por escrito dirigido a ${companyData.email || 'RRHH'} y
            surtirá efecto en un plazo máximo de <strong>10 días hábiles</strong> desde su recepción.
        </p>
        <p class="legal-text">
            Una vez revocado el consentimiento, sus datos biométricos serán eliminados de todos los
            sistemas en un plazo no mayor a <strong>30 días</strong>, salvo obligación legal de conservación.
        </p>
    </div>

    <div class="page-break"></div>

    <!-- Documento Legal Completo -->
    <div class="section">
        <h2>9. TEXTO LEGAL COMPLETO</h2>
        <div class="legal-text">
            ${consentText.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')}
        </div>
    </div>

    <!-- Firma Digital -->
    <div class="signature-box">
        <h3>🔐 FIRMA DIGITAL Y VALIDACIÓN</h3>
        <table>
            <tr>
                <td><strong>Algoritmo:</strong></td>
                <td>HMAC-SHA256</td>
            </tr>
            <tr>
                <td><strong>Firma digital:</strong></td>
                <td class="signature-hash">${immutableSignature}</td>
            </tr>
            <tr>
                <td><strong>IP de aceptación:</strong></td>
                <td>${ipAddress || 'No registrado'}</td>
            </tr>
            <tr>
                <td><strong>User Agent:</strong></td>
                <td style="font-size: 10px;">${(userAgent || 'No registrado').substring(0, 80)}...</td>
            </tr>
            <tr>
                <td><strong>Método de validación:</strong></td>
                <td>Email con token único</td>
            </tr>
        </table>
        <p style="margin-top: 15px; font-size: 12px; color: #065f46;">
            <strong>Integridad garantizada:</strong> Este documento está protegido con firma digital HMAC-SHA256.
            Cualquier modificación posterior invalidará la firma y será detectada.
        </p>
    </div>

    <!-- Footer -->
    <div class="footer">
        <p><strong>APONNT - Sistema de Gestión Biométrica</strong></p>
        <p>Documento generado electrónicamente el ${new Date().toLocaleString('es-AR', {
            dateStyle: 'full',
            timeStyle: 'medium',
            timeZone: 'America/Argentina/Buenos_Aires'
        })}</p>
        <p style="margin-top: 10px;">
            Cumplimiento normativo: Ley 25.326 (ARG) · GDPR (UE) · BIPA (USA)<br>
            Este es un documento legal válido y vinculante.
        </p>
    </div>
</body>
</html>
        `;
    }

    /**
     * Guardar PDF en disco
     */
    async savePDF(pdfBuffer, filename, directory = 'public/pdfs/consents') {
        try {
            const fullPath = path.join(__dirname, '..', '..', directory);

            // Crear directorio si no existe
            await fs.mkdir(fullPath, { recursive: true });

            const filepath = path.join(fullPath, filename);
            await fs.writeFile(filepath, pdfBuffer);

            console.log(`✅ PDF guardado: ${filepath}`);
            return filepath;

        } catch (error) {
            console.error('Error guardando PDF:', error);
            throw error;
        }
    }

    /**
     * Cerrar navegador (cleanup)
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

module.exports = new PDFGenerationService();
