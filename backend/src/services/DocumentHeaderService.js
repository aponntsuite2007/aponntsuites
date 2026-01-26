/**
 * DocumentHeaderService - Servicio Centralizado de Encabezados de Documentos
 *
 * Genera encabezados estándar para TODOS los documentos del sistema:
 * - Facturas, Presupuestos, Contratos
 * - Órdenes de Compra, Remitos
 * - Reportes, Recibos de Sueldo
 * - Consentimientos, Certificados
 *
 * Soporta múltiples formatos de salida:
 * - HTML (para browser print)
 * - PDFKit (para generación server-side)
 * - Texto plano (para emails)
 *
 * Multi-país: AR (CUIT), CL (RUT), BR (CNPJ), MX (RFC), etc.
 */

const { Company } = require('../config/database');

class DocumentHeaderService {

    // Configuración de labels por país
    static TAX_ID_LABELS = {
        AR: 'CUIT',
        CL: 'RUT',
        BR: 'CNPJ',
        MX: 'RFC',
        UY: 'RUT',
        CO: 'NIT',
        PE: 'RUC',
        EC: 'RUC',
        PY: 'RUC',
        VE: 'RIF',
        DEFAULT: 'Tax ID'
    };

    // Formato de Tax ID por país
    static TAX_ID_FORMATS = {
        AR: (id) => id ? id.replace(/(\d{2})(\d{8})(\d{1})/, '$1-$2-$3') : '',
        CL: (id) => id ? id.replace(/(\d+)(\d{1})/, '$1-$2') : '',
        BR: (id) => id ? id.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : '',
        MX: (id) => id || '',
        DEFAULT: (id) => id || ''
    };

    /**
     * Obtiene datos de empresa para encabezado
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Datos de la empresa formateados
     */
    static async getCompanyData(companyId) {
        try {
            const company = await Company.findByPk(companyId, {
                attributes: [
                    'company_id', 'name', 'legal_name', 'tax_id', 'address',
                    'city', 'province', 'country', 'postal_code',
                    'phone', 'contact_phone', 'email', 'contact_email',
                    'logo', 'website'
                ]
            });

            if (!company) {
                console.warn(`[DocumentHeader] Empresa ${companyId} no encontrada`);
                return this.getDefaultCompanyData();
            }

            const countryCode = company.country || 'AR';
            const taxIdLabel = this.TAX_ID_LABELS[countryCode] || this.TAX_ID_LABELS.DEFAULT;
            const taxIdFormatter = this.TAX_ID_FORMATS[countryCode] || this.TAX_ID_FORMATS.DEFAULT;

            return {
                id: company.company_id,
                name: company.legal_name || company.name,
                tradeName: company.name,
                taxId: taxIdFormatter(company.tax_id),
                taxIdLabel: taxIdLabel,
                taxIdRaw: company.tax_id,
                address: company.address,
                city: company.city,
                province: company.province,
                country: countryCode,
                postalCode: company.postal_code,
                fullAddress: this.formatFullAddress(company),
                phone: company.phone || company.contact_phone,
                email: company.email || company.contact_email,
                website: company.website,
                logo: company.logo, // Base64
                hasLogo: !!company.logo
            };
        } catch (error) {
            console.error('[DocumentHeader] Error obteniendo datos de empresa:', error.message);
            return this.getDefaultCompanyData();
        }
    }

    /**
     * Datos por defecto si no se encuentra la empresa
     */
    static getDefaultCompanyData() {
        return {
            id: null,
            name: 'Empresa no configurada',
            tradeName: '',
            taxId: '',
            taxIdLabel: 'CUIT',
            taxIdRaw: '',
            address: '',
            city: '',
            province: '',
            country: 'AR',
            postalCode: '',
            fullAddress: '',
            phone: '',
            email: '',
            website: '',
            logo: null,
            hasLogo: false
        };
    }

    /**
     * Formatea dirección completa
     */
    static formatFullAddress(company) {
        const parts = [];
        if (company.address) parts.push(company.address);
        if (company.city) parts.push(company.city);
        if (company.province) parts.push(company.province);
        if (company.postal_code) parts.push(`CP ${company.postal_code}`);
        return parts.join(', ');
    }

    /**
     * Genera encabezado HTML para browser print
     * @param {Object} options - Opciones de configuración
     * @returns {string} HTML del encabezado
     */
    static async generateHTMLHeader(options = {}) {
        const {
            companyId,
            documentType = 'DOCUMENTO',
            documentNumber = '',
            documentDate = new Date(),
            recipient = null, // { name, taxId, address, phone }
            showLogo = true,
            showRecipient = true,
            customTitle = null,
            style = 'standard' // 'standard', 'compact', 'formal'
        } = options;

        const company = await this.getCompanyData(companyId);
        const formattedDate = this.formatDate(documentDate);

        // Logo HTML
        const logoHTML = (showLogo && company.hasLogo)
            ? `<img src="${company.logo}" alt="${company.name}" style="max-height: 60px; max-width: 200px;">`
            : `<div style="font-size: 24px; font-weight: bold; color: #333;">${company.name}</div>`;

        // Recipient HTML
        const recipientHTML = (showRecipient && recipient) ? `
            <div class="doc-recipient" style="margin-top: 15px; padding: 10px; background: #f9f9f9; border-radius: 4px;">
                <div style="font-weight: 600; margin-bottom: 5px;">Cliente / Destinatario:</div>
                <div style="font-weight: bold;">${recipient.name || 'N/A'}</div>
                ${recipient.taxId ? `<div>${this.TAX_ID_LABELS[company.country] || 'ID'}: ${recipient.taxId}</div>` : ''}
                ${recipient.address ? `<div>${recipient.address}</div>` : ''}
                ${recipient.phone ? `<div>Tel: ${recipient.phone}</div>` : ''}
            </div>
        ` : '';

        return `
            <div class="document-header" style="font-family: Arial, sans-serif; padding: 20px; border-bottom: 2px solid #333; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <!-- Lado izquierdo: Logo y datos empresa -->
                    <div style="flex: 1;">
                        <div class="company-logo" style="margin-bottom: 10px;">
                            ${logoHTML}
                        </div>
                        <div class="company-info" style="font-size: 12px; color: #555; line-height: 1.5;">
                            <div><strong>${company.taxIdLabel}:</strong> ${company.taxId || 'No registrado'}</div>
                            <div>${company.fullAddress || company.address || 'Dirección no registrada'}</div>
                            ${company.phone ? `<div>Tel: ${company.phone}</div>` : ''}
                            ${company.email ? `<div>Email: ${company.email}</div>` : ''}
                            ${company.website ? `<div>Web: ${company.website}</div>` : ''}
                        </div>
                    </div>

                    <!-- Lado derecho: Tipo y número de documento -->
                    <div style="text-align: right; min-width: 200px;">
                        <div style="font-size: 18px; font-weight: bold; color: #333; padding: 10px 15px; background: #f0f0f0; border-radius: 4px;">
                            ${customTitle || documentType}
                        </div>
                        ${documentNumber ? `
                            <div style="font-size: 20px; font-weight: bold; color: #0066cc; margin-top: 10px;">
                                N° ${documentNumber}
                            </div>
                        ` : ''}
                        <div style="font-size: 12px; color: #666; margin-top: 5px;">
                            Fecha: ${formattedDate}
                        </div>
                    </div>
                </div>

                ${recipientHTML}
            </div>
        `;
    }

    /**
     * Genera encabezado para PDFKit
     * @param {PDFDocument} doc - Documento PDFKit
     * @param {Object} options - Opciones de configuración
     */
    static async addPDFHeader(doc, options = {}) {
        const {
            companyId,
            documentType = 'DOCUMENTO',
            documentNumber = '',
            documentDate = new Date(),
            recipient = null,
            showLogo = true,
            y = 50 // Posición Y inicial
        } = options;

        const company = await this.getCompanyData(companyId);
        const formattedDate = this.formatDate(documentDate);
        let currentY = y;

        // Logo o nombre de empresa
        if (showLogo && company.hasLogo) {
            try {
                const logoBuffer = Buffer.from(company.logo.replace(/^data:image\/\w+;base64,/, ''), 'base64');
                doc.image(logoBuffer, 50, currentY, { height: 50 });
            } catch (e) {
                doc.fontSize(18).font('Helvetica-Bold').text(company.name, 50, currentY);
            }
        } else {
            doc.fontSize(18).font('Helvetica-Bold').text(company.name, 50, currentY);
        }

        // Datos de empresa (lado izquierdo)
        currentY += 60;
        doc.fontSize(9).font('Helvetica').fillColor('#555');
        doc.text(`${company.taxIdLabel}: ${company.taxId || 'No registrado'}`, 50, currentY);
        currentY += 12;
        doc.text(company.fullAddress || company.address || '', 50, currentY);
        currentY += 12;
        if (company.phone) {
            doc.text(`Tel: ${company.phone}`, 50, currentY);
            currentY += 12;
        }
        if (company.email) {
            doc.text(`Email: ${company.email}`, 50, currentY);
        }

        // Tipo de documento (lado derecho)
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#333');
        doc.text(documentType, 400, y, { width: 150, align: 'right' });

        if (documentNumber) {
            doc.fontSize(16).fillColor('#0066cc');
            doc.text(`N° ${documentNumber}`, 400, y + 20, { width: 150, align: 'right' });
        }

        doc.fontSize(10).font('Helvetica').fillColor('#666');
        doc.text(`Fecha: ${formattedDate}`, 400, y + 45, { width: 150, align: 'right' });

        // Línea separadora
        currentY = Math.max(currentY, y + 70) + 15;
        doc.strokeColor('#333').lineWidth(1);
        doc.moveTo(50, currentY).lineTo(560, currentY).stroke();

        // Destinatario si aplica
        if (recipient) {
            currentY += 15;
            doc.fontSize(10).font('Helvetica-Bold').fillColor('#333');
            doc.text('Cliente / Destinatario:', 50, currentY);
            currentY += 15;
            doc.font('Helvetica').fontSize(10);
            doc.text(recipient.name || 'N/A', 50, currentY);
            if (recipient.taxId) {
                currentY += 12;
                doc.text(`${company.taxIdLabel}: ${recipient.taxId}`, 50, currentY);
            }
            if (recipient.address) {
                currentY += 12;
                doc.text(recipient.address, 50, currentY);
            }
            currentY += 20;
        } else {
            currentY += 20;
        }

        return currentY; // Retorna posición Y para continuar el documento
    }

    /**
     * Genera encabezado texto plano (para emails, logs)
     */
    static async generateTextHeader(options = {}) {
        const {
            companyId,
            documentType = 'DOCUMENTO',
            documentNumber = '',
            documentDate = new Date()
        } = options;

        const company = await this.getCompanyData(companyId);
        const formattedDate = this.formatDate(documentDate);

        return `
════════════════════════════════════════════════════════════════
${company.name.toUpperCase()}
${company.taxIdLabel}: ${company.taxId || 'No registrado'}
${company.fullAddress || company.address || ''}
${company.phone ? `Tel: ${company.phone}` : ''}
${company.email ? `Email: ${company.email}` : ''}
════════════════════════════════════════════════════════════════
${documentType}${documentNumber ? ` N° ${documentNumber}` : ''}
Fecha: ${formattedDate}
════════════════════════════════════════════════════════════════
        `.trim();
    }

    /**
     * Genera pie de página HTML
     */
    static async generateHTMLFooter(options = {}) {
        const {
            companyId,
            pageNumber = null,
            totalPages = null,
            showLegal = true,
            customText = ''
        } = options;

        const company = await this.getCompanyData(companyId);

        const pageInfo = (pageNumber && totalPages)
            ? `<div style="font-size: 10px;">Página ${pageNumber} de ${totalPages}</div>`
            : '';

        const legalText = showLegal
            ? `<div style="font-size: 9px; color: #888; margin-top: 5px;">
                Documento generado electrónicamente por ${company.name}.
                Este documento es válido sin firma según normativa vigente.
               </div>`
            : '';

        return `
            <div class="document-footer" style="font-family: Arial, sans-serif; padding: 15px; border-top: 1px solid #ccc; margin-top: 20px; text-align: center; color: #666;">
                ${customText ? `<div style="margin-bottom: 10px;">${customText}</div>` : ''}
                ${pageInfo}
                ${legalText}
                <div style="font-size: 10px; margin-top: 10px;">
                    ${company.name} | ${company.taxIdLabel}: ${company.taxId} | ${company.phone || ''} | ${company.email || ''}
                </div>
            </div>
        `;
    }

    /**
     * Agrega pie de página a PDFKit
     */
    static async addPDFFooter(doc, options = {}) {
        const {
            companyId,
            pageNumber = null,
            totalPages = null,
            y = 750 // Posición Y del footer
        } = options;

        const company = await this.getCompanyData(companyId);

        // Línea separadora
        doc.strokeColor('#ccc').lineWidth(0.5);
        doc.moveTo(50, y).lineTo(560, y).stroke();

        // Texto del footer
        doc.fontSize(8).font('Helvetica').fillColor('#888');

        const footerText = `${company.name} | ${company.taxIdLabel}: ${company.taxId} | ${company.phone || ''} | ${company.email || ''}`;
        doc.text(footerText, 50, y + 10, { width: 510, align: 'center' });

        if (pageNumber && totalPages) {
            doc.text(`Página ${pageNumber} de ${totalPages}`, 50, y + 22, { width: 510, align: 'center' });
        }

        doc.text('Documento generado electrónicamente', 50, y + 34, { width: 510, align: 'center' });
    }

    /**
     * Wrapper completo: genera documento HTML con header + content + footer
     */
    static async wrapHTMLDocument(options = {}) {
        const {
            companyId,
            documentType,
            documentNumber,
            documentDate,
            recipient,
            content = '',
            showLogo = true,
            showFooter = true,
            title = null,
            printStyles = true
        } = options;

        const header = await this.generateHTMLHeader({
            companyId, documentType, documentNumber, documentDate, recipient, showLogo
        });

        const footer = showFooter
            ? await this.generateHTMLFooter({ companyId })
            : '';

        const styles = printStyles ? `
            <style>
                @media print {
                    body { margin: 0; padding: 20px; }
                    .document-header { page-break-inside: avoid; }
                    .document-footer { position: fixed; bottom: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
                body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #333; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background: #f5f5f5; font-weight: bold; }
                .amount { text-align: right; }
                .total-row { font-weight: bold; background: #f0f0f0; }
            </style>
        ` : '';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${title || documentType} ${documentNumber || ''}</title>
                ${styles}
            </head>
            <body>
                ${header}
                <div class="document-content">
                    ${content}
                </div>
                ${footer}
            </body>
            </html>
        `;
    }

    /**
     * Formatea fecha según locale
     */
    static formatDate(date, locale = 'es-AR') {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Formatea fecha corta
     */
    static formatDateShort(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }
}

module.exports = DocumentHeaderService;
