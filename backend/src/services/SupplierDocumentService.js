/**
 * SupplierDocumentService.js
 * Servicio de gestión de documentos para el Portal de Proveedores
 *
 * Integración con DMS para:
 * - Adjuntos de cotizaciones (RFQ)
 * - Facturas del proveedor
 * - Notas de crédito
 * - Documentación legal (contratos, certificados, etc.)
 * - Prospectos y catálogos de productos
 */

const path = require('path');
const fs = require('fs').promises;

class SupplierDocumentService {
    constructor(pool, dmsService) {
        this.pool = pool;
        this.dmsService = dmsService;

        // Configuración de tipos de archivo permitidos
        this.ALLOWED_MIMETYPES = {
            // Documentos
            'application/pdf': { ext: '.pdf', maxSize: 10 * 1024 * 1024 }, // 10MB
            'application/msword': { ext: '.doc', maxSize: 5 * 1024 * 1024 },
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', maxSize: 5 * 1024 * 1024 },

            // Hojas de cálculo
            'application/vnd.ms-excel': { ext: '.xls', maxSize: 5 * 1024 * 1024 },
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: '.xlsx', maxSize: 5 * 1024 * 1024 },

            // Imágenes
            'image/jpeg': { ext: '.jpg', maxSize: 5 * 1024 * 1024 },
            'image/png': { ext: '.png', maxSize: 5 * 1024 * 1024 },
            'image/gif': { ext: '.gif', maxSize: 2 * 1024 * 1024 },

            // Comprimidos
            'application/zip': { ext: '.zip', maxSize: 20 * 1024 * 1024 },
            'application/x-rar-compressed': { ext: '.rar', maxSize: 20 * 1024 * 1024 }
        };
    }

    /**
     * Validar archivo antes de upload
     */
    validateFile(file) {
        if (!file) {
            throw new Error('No se proporcionó ningún archivo');
        }

        // Validar tipo MIME
        const config = this.ALLOWED_MIMETYPES[file.mimetype];
        if (!config) {
            throw new Error(`Tipo de archivo no permitido: ${file.mimetype}`);
        }

        // Validar tamaño
        if (file.size > config.maxSize) {
            const maxSizeMB = (config.maxSize / (1024 * 1024)).toFixed(2);
            throw new Error(`Archivo demasiado grande. Máximo: ${maxSizeMB}MB`);
        }

        // Validar nombre de archivo
        if (!file.originalname || file.originalname.length > 255) {
            throw new Error('Nombre de archivo inválido');
        }

        return true;
    }

    /**
     * Upload de adjunto a cotización (RFQ)
     */
    async uploadRfqAttachment(rfqId, supplierId, file, uploadedByUserId, description = null) {
        this.validateFile(file);

        // Verificar que el RFQ existe y el proveedor está invitado
        const rfqCheck = await this.pool.query(`
            SELECT rfq.id, rfq.company_id, rfq.rfq_number
            FROM request_for_quotations rfq
            JOIN rfq_invitations ri ON rfq.id = ri.rfq_id
            WHERE rfq.id = $1 AND ri.supplier_id = $2 AND ri.status != 'declined'
        `, [rfqId, supplierId]);

        if (rfqCheck.rows.length === 0) {
            throw new Error('RFQ no encontrada o proveedor no autorizado');
        }

        const rfq = rfqCheck.rows[0];

        // Registrar en DMS si está disponible
        let dmsDocumentId = null;
        if (this.dmsService) {
            try {
                const dmsResult = await this.dmsService.registerDocument({
                    module: 'procurement',
                    documentType: 'rfq_attachment',
                    companyId: rfq.company_id,
                    createdById: uploadedByUserId,
                    sourceEntityType: 'rfq',
                    sourceEntityId: rfqId,
                    file: file,
                    title: `Adjunto RFQ ${rfq.rfq_number}`,
                    description: description || `Adjunto de proveedor ${supplierId}`,
                    metadata: {
                        supplier_id: supplierId,
                        rfq_id: rfqId,
                        uploaded_by: 'supplier_portal'
                    }
                });
                dmsDocumentId = dmsResult.document.id;
            } catch (dmsError) {
                console.error('⚠️ [SUPPLIER-DOC] Error registrando en DMS:', dmsError.message);
            }
        }

        // Guardar en tabla específica de adjuntos de RFQ
        const result = await this.pool.query(`
            INSERT INTO rfq_attachments
            (rfq_id, supplier_id, file_name, file_path, file_size, mime_type,
             description, dms_document_id, uploaded_by, uploaded_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            RETURNING *
        `, [
            rfqId,
            supplierId,
            file.originalname,
            `/uploads/rfq/${rfqId}/${file.filename}`,
            file.size,
            file.mimetype,
            description,
            dmsDocumentId,
            uploadedByUserId
        ]);

        console.log(`📎 [SUPPLIER-DOC] Adjunto RFQ subido: ${file.originalname} → RFQ ${rfqId}`);

        return {
            success: true,
            attachment: result.rows[0],
            dmsDocumentId
        };
    }

    /**
     * Upload de factura del proveedor
     */
    async uploadInvoice(supplierId, companyId, file, invoiceData, uploadedByUserId) {
        this.validateFile(file);

        const {
            invoiceNumber,
            invoiceDate,
            purchaseOrderId = null,
            subtotal,
            taxAmount,
            total,
            notes = null
        } = invoiceData;

        // Validar que la factura no exista ya
        const existingInvoice = await this.pool.query(`
            SELECT id FROM supplier_invoices
            WHERE supplier_id = $1 AND invoice_number = $2
        `, [supplierId, invoiceNumber]);

        if (existingInvoice.rows.length > 0) {
            throw new Error(`Ya existe una factura con el número ${invoiceNumber}`);
        }

        // Registrar en DMS
        let dmsDocumentId = null;
        if (this.dmsService) {
            try {
                const dmsResult = await this.dmsService.registerDocument({
                    module: 'procurement',
                    documentType: 'invoice',
                    companyId: companyId,
                    createdById: uploadedByUserId,
                    sourceEntityType: 'supplier_invoice',
                    sourceEntityId: invoiceNumber,
                    file: file,
                    title: `Factura ${invoiceNumber} - Proveedor ${supplierId}`,
                    description: notes || `Factura del proveedor`,
                    metadata: {
                        supplier_id: supplierId,
                        invoice_number: invoiceNumber,
                        invoice_date: invoiceDate,
                        total: total,
                        uploaded_by: 'supplier_portal'
                    }
                });
                dmsDocumentId = dmsResult.document.id;
            } catch (dmsError) {
                console.error('⚠️ [SUPPLIER-DOC] Error registrando factura en DMS:', dmsError.message);
            }
        }

        // Crear factura en BD
        const result = await this.pool.query(`
            INSERT INTO supplier_invoices
            (company_id, supplier_id, purchase_order_id, invoice_number, invoice_date,
             file_name, file_path, file_size, mime_type, dms_document_id,
             subtotal, tax_amount, total, balance_due, notes, status, payment_status,
             uploaded_by, uploaded_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13, $14, 'pending_review', 'pending', $15, NOW())
            RETURNING *
        `, [
            companyId,
            supplierId,
            purchaseOrderId,
            invoiceNumber,
            invoiceDate,
            file.originalname,
            `/uploads/invoices/${supplierId}/${file.filename}`,
            file.size,
            file.mimetype,
            dmsDocumentId,
            subtotal,
            taxAmount,
            total,
            notes,
            uploadedByUserId
        ]);

        console.log(`📄 [SUPPLIER-DOC] Factura subida: ${invoiceNumber} → Proveedor ${supplierId}`);

        return {
            success: true,
            invoice: result.rows[0],
            dmsDocumentId
        };
    }

    /**
     * Listar adjuntos de un RFQ
     */
    async getRfqAttachments(rfqId, supplierId) {
        const result = await this.pool.query(`
            SELECT * FROM rfq_attachments
            WHERE rfq_id = $1 AND supplier_id = $2
            ORDER BY uploaded_at DESC
        `, [rfqId, supplierId]);

        return result.rows;
    }

    /**
     * Eliminar adjunto de RFQ
     */
    async deleteRfqAttachment(attachmentId, supplierId) {
        const result = await this.pool.query(`
            DELETE FROM rfq_attachments
            WHERE id = $1 AND supplier_id = $2
            RETURNING *
        `, [attachmentId, supplierId]);

        if (result.rows.length === 0) {
            throw new Error('Adjunto no encontrado');
        }

        // TODO: Eliminar archivo físico del storage
        // TODO: Marcar como eliminado en DMS

        return { success: true, deleted: result.rows[0] };
    }

    /**
     * Obtener URL de descarga de un documento
     */
    async getDownloadUrl(documentId, supplierId) {
        // Verificar que el documento pertenece al proveedor
        const result = await this.pool.query(`
            SELECT file_path, file_name, mime_type
            FROM rfq_attachments
            WHERE id = $1 AND supplier_id = $2
            UNION
            SELECT file_path, file_name, mime_type
            FROM supplier_invoices
            WHERE id = $1 AND supplier_id = $2
        `, [documentId, supplierId]);

        if (result.rows.length === 0) {
            throw new Error('Documento no encontrado o no autorizado');
        }

        const doc = result.rows[0];

        // Generar URL temporal (firmada)
        // TODO: Implementar firma de URL con expiración
        const downloadUrl = `/api/supplier-portal/documents/${documentId}/download`;

        return {
            url: downloadUrl,
            fileName: doc.file_name,
            mimeType: doc.mime_type
        };
    }
}

module.exports = SupplierDocumentService;
