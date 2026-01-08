/**
 * supplierPortalRoutes.js
 * API endpoints para el Portal de Proveedores P2P
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const SupplierPortalService = require('../services/SupplierPortalService');
const SupplierDocumentService = require('../services/SupplierDocumentService');
const { uploadSingle, uploadMultiple, cleanupTempFile } = require('../middleware/supplierUpload');
const { pool } = require('../config/database');

// Integración NCE - Notificaciones
const SuppliersNotifications = require('../services/integrations/suppliers-notifications');

// Inicializar servicio de documentos
let supplierDocumentService = null;
try {
    // Intentar cargar DMSIntegrationService si está disponible
    let dmsService = null;
    try {
        const DMSIntegrationService = require('../services/dms/DMSIntegrationService');
        dmsService = new DMSIntegrationService(pool);
    } catch (e) {
        console.log('⚠️ [SUPPLIER-DOC] DMS no disponible, documentos se guardarán solo en BD');
    }

    supplierDocumentService = new SupplierDocumentService(pool, dmsService);
    console.log('✅ [SUPPLIER-DOC] Servicio de documentos inicializado');
} catch (error) {
    console.error('❌ [SUPPLIER-DOC] Error inicializando servicio de documentos:', error.message);
}

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE DE AUTENTICACIÓN DEL PORTAL
// ═══════════════════════════════════════════════════════════════════════════

const authenticateSupplier = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token de autenticación requerido' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supplier_portal_secret_key');

        if (decoded.type !== 'supplier_portal') {
            return res.status(403).json({ error: 'Token no válido para portal de proveedores' });
        }

        req.supplierUser = decoded;
        req.supplierId = decoded.supplierId;
        req.portalUserId = decoded.userId;

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado' });
        }
        return res.status(401).json({ error: 'Token inválido' });
    }
};

/**
 * Middleware de validación de compliance
 * Bloquea operaciones sensibles si el proveedor no completó los pasos obligatorios
 */
const requireCompliance = async (req, res, next) => {
    try {
        const complianceStatus = await SupplierPortalService.getComplianceStatus(
            req.portalUserId,
            req.supplierId
        );

        if (!complianceStatus.canQuote) {
            return res.status(403).json({
                error: 'Debe completar el proceso de compliance antes de realizar esta acción',
                reason: complianceStatus.reason,
                missingSteps: complianceStatus.missingSteps,
                details: complianceStatus.details,
                instructions: {
                    email_verification: 'Verifique su email haciendo clic en el enlace que le enviamos',
                    password_change: 'Cambie su contraseña por defecto en Perfil > Cambiar Contraseña',
                    banking_info: 'Complete sus datos bancarios en Perfil > Información Bancaria'
                }
            });
        }

        next();
    } catch (error) {
        console.error('❌ [COMPLIANCE] Error al verificar compliance:', error.message);
        return res.status(500).json({ error: 'Error al verificar estado de compliance' });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// AUTENTICACIÓN
// ═══════════════════════════════════════════════════════════════════════════

// Login al portal
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        const result = await SupplierPortalService.loginPortal(email, password);
        res.json(result);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Login error:', error.message);
        res.status(401).json({ error: error.message });
    }
});

// Registrar usuario del portal (requiere autenticación de admin del proveedor)
router.post('/auth/register', authenticateSupplier, async (req, res) => {
    try {
        if (req.supplierUser.role !== 'admin') {
            return res.status(403).json({ error: 'Solo administradores pueden registrar usuarios' });
        }

        const result = await SupplierPortalService.registerPortalUser(req.supplierId, req.body);
        res.status(201).json(result);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Register error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Verificar token
router.get('/auth/verify', authenticateSupplier, (req, res) => {
    res.json({
        valid: true,
        user: req.supplierUser
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// SELF-SERVICE - GESTIÓN DE PERFIL
// ═══════════════════════════════════════════════════════════════════════════

// Cambiar contraseña (self-service)
router.post('/profile/change-password', authenticateSupplier, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Contraseña actual y nueva contraseña son requeridas' });
        }

        const result = await SupplierPortalService.changeSelfPassword(
            req.portalUserId,
            req.supplierId,
            currentPassword,
            newPassword
        );

        res.json(result);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Change password error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Solicitar token 2FA para actualizar datos bancarios
router.post('/profile/request-banking-token', authenticateSupplier, async (req, res) => {
    try {
        const ipAddress = req.ip || req.connection.remoteAddress || '0.0.0.0';

        const result = await SupplierPortalService.requestBankingToken(
            req.portalUserId,
            req.supplierId,
            ipAddress
        );

        res.json(result);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Request banking token error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Actualizar información bancaria (requiere 2FA)
router.put('/profile/banking', authenticateSupplier, async (req, res) => {
    try {
        const { bankName, bankAccountNumber, bankAccountType, bankRoutingNumber, accountHolderName, token2FA } = req.body;

        if (!bankName || !bankAccountNumber || !token2FA) {
            return res.status(400).json({
                error: 'Nombre del banco, número de cuenta y código de verificación son requeridos'
            });
        }

        const ipAddress = req.ip || req.connection.remoteAddress || '0.0.0.0';

        const result = await SupplierPortalService.updateBankingInfo(
            req.portalUserId,
            req.supplierId,
            { bankName, bankAccountNumber, bankAccountType, bankRoutingNumber, accountHolderName },
            token2FA,
            ipAddress
        );

        res.json(result);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Update banking info error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Obtener estado de compliance (si puede cotizar)
router.get('/profile/compliance-status', authenticateSupplier, async (req, res) => {
    try {
        const status = await SupplierPortalService.getComplianceStatus(
            req.portalUserId,
            req.supplierId
        );

        res.json(status);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get compliance status error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard', authenticateSupplier, async (req, res) => {
    try {
        const dashboard = await SupplierPortalService.getSupplierDashboard(req.supplierId);
        res.json(dashboard);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Dashboard error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// RFQ - SOLICITUDES DE COTIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════

// Listar RFQs del proveedor
router.get('/rfqs', authenticateSupplier, async (req, res) => {
    try {
        const { status, page, limit } = req.query;
        const rfqs = await SupplierPortalService.getSupplierRfqs(req.supplierId, {
            status,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });
        res.json(rfqs);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get RFQs error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Detalle de RFQ
router.get('/rfqs/:id', authenticateSupplier, async (req, res) => {
    try {
        const rfq = await SupplierPortalService.getRfqDetails(req.params.id, req.supplierId);
        if (!rfq.rfq) {
            return res.status(404).json({ error: 'RFQ no encontrada' });
        }
        res.json(rfq);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get RFQ detail error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Enviar cotización (requiere compliance completo)
router.post('/rfqs/:id/quote', authenticateSupplier, requireCompliance, async (req, res) => {
    try {
        const quotation = await SupplierPortalService.submitQuotation(
            req.supplierId,
            req.params.id,
            req.body,
            req.portalUserId
        );
        res.status(201).json(quotation);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Submit quotation error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Declinar RFQ
router.post('/rfqs/:id/decline', authenticateSupplier, async (req, res) => {
    try {
        const { reason } = req.body;
        const result = await SupplierPortalService.declineRfq(req.supplierId, req.params.id, reason);
        res.json(result);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Decline RFQ error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTOS Y ADJUNTOS
// ═══════════════════════════════════════════════════════════════════════════

// Subir adjunto a cotización (requiere compliance)
router.post('/rfqs/:id/upload-attachment',
    authenticateSupplier,
    requireCompliance,
    uploadSingle('attachment'),
    async (req, res) => {
        try {
            if (!supplierDocumentService) {
                return res.status(503).json({ error: 'Servicio de documentos no disponible' });
            }

            const { description } = req.body;
            const file = req.file;

            const result = await supplierDocumentService.uploadRfqAttachment(
                parseInt(req.params.id),
                req.supplierId,
                file,
                req.portalUserId,
                description
            );

            // Cleanup archivo temporal
            await cleanupTempFile(file.path);

            res.status(201).json(result);

        } catch (error) {
            // Cleanup en caso de error
            if (req.file) {
                await cleanupTempFile(req.file.path);
            }
            console.error('❌ [SUPPLIER PORTAL] Upload attachment error:', error.message);
            res.status(400).json({ error: error.message });
        }
    }
);

// Listar adjuntos de un RFQ
router.get('/rfqs/:id/attachments', authenticateSupplier, async (req, res) => {
    try {
        if (!supplierDocumentService) {
            return res.status(503).json({ error: 'Servicio de documentos no disponible' });
        }

        const attachments = await supplierDocumentService.getRfqAttachments(
            parseInt(req.params.id),
            req.supplierId
        );

        res.json({ success: true, attachments });

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get attachments error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Eliminar adjunto
router.delete('/attachments/:id', authenticateSupplier, async (req, res) => {
    try {
        if (!supplierDocumentService) {
            return res.status(503).json({ error: 'Servicio de documentos no disponible' });
        }

        const result = await supplierDocumentService.deleteRfqAttachment(
            parseInt(req.params.id),
            req.supplierId
        );

        res.json(result);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Delete attachment error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Subir factura con archivo PDF (requiere compliance)
router.post('/invoices/upload',
    authenticateSupplier,
    requireCompliance,
    uploadSingle('invoice'),
    async (req, res) => {
        try {
            if (!supplierDocumentService) {
                return res.status(503).json({ error: 'Servicio de documentos no disponible' });
            }

            const {
                invoiceNumber,
                invoiceDate,
                purchaseOrderId,
                subtotal,
                taxAmount,
                total,
                notes
            } = req.body;

            const file = req.file;

            // Validar campos requeridos
            if (!invoiceNumber || !invoiceDate || !subtotal || !taxAmount || !total) {
                await cleanupTempFile(file.path);
                return res.status(400).json({
                    error: 'Campos requeridos faltantes',
                    required: ['invoiceNumber', 'invoiceDate', 'subtotal', 'taxAmount', 'total']
                });
            }

            // Obtener companyId del proveedor
            const supplierResult = await pool.query(
                'SELECT company_id FROM wms_suppliers WHERE id = $1',
                [req.supplierId]
            );

            if (supplierResult.rows.length === 0) {
                await cleanupTempFile(file.path);
                return res.status(404).json({ error: 'Proveedor no encontrado' });
            }

            const companyId = supplierResult.rows[0].company_id;

            const result = await supplierDocumentService.uploadInvoice(
                req.supplierId,
                companyId,
                file,
                {
                    invoiceNumber,
                    invoiceDate,
                    purchaseOrderId: purchaseOrderId || null,
                    subtotal: parseFloat(subtotal),
                    taxAmount: parseFloat(taxAmount),
                    total: parseFloat(total),
                    notes
                },
                req.portalUserId
            );

            // Cleanup archivo temporal
            await cleanupTempFile(file.path);

            res.status(201).json(result);

        } catch (error) {
            // Cleanup en caso de error
            if (req.file) {
                await cleanupTempFile(req.file.path);
            }
            console.error('❌ [SUPPLIER PORTAL] Upload invoice error:', error.message);
            res.status(400).json({ error: error.message });
        }
    }
);

// Obtener URL de descarga de documento
router.get('/documents/:id/download', authenticateSupplier, async (req, res) => {
    try {
        if (!supplierDocumentService) {
            return res.status(503).json({ error: 'Servicio de documentos no disponible' });
        }

        const downloadInfo = await supplierDocumentService.getDownloadUrl(
            parseInt(req.params.id),
            req.supplierId
        );

        res.json(downloadInfo);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get download URL error:', error.message);
        res.status(404).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// ÓRDENES DE COMPRA
// ═══════════════════════════════════════════════════════════════════════════

// Listar órdenes
router.get('/orders', authenticateSupplier, async (req, res) => {
    try {
        const { status, dateFrom, dateTo, page, limit } = req.query;
        const orders = await SupplierPortalService.getSupplierOrders(req.supplierId, {
            status,
            dateFrom,
            dateTo,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });
        res.json(orders);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get orders error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Detalle de orden
router.get('/orders/:id', authenticateSupplier, async (req, res) => {
    try {
        const order = await SupplierPortalService.getOrderDetails(req.params.id, req.supplierId);
        if (!order.order) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }
        res.json(order);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get order detail error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Confirmar orden
router.post('/orders/:id/confirm', authenticateSupplier, async (req, res) => {
    try {
        const order = await SupplierPortalService.confirmOrder(req.params.id, req.supplierId, req.body);
        res.json(order);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Confirm order error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// FACTURAS
// ═══════════════════════════════════════════════════════════════════════════

// Listar facturas
router.get('/invoices', authenticateSupplier, async (req, res) => {
    try {
        const { status, paymentStatus, page, limit } = req.query;
        const invoices = await SupplierPortalService.getSupplierInvoices(req.supplierId, {
            status,
            paymentStatus,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });
        res.json(invoices);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get invoices error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Detalle de factura
router.get('/invoices/:id', authenticateSupplier, async (req, res) => {
    try {
        const invoice = await SupplierPortalService.getInvoiceDetails(req.params.id, req.supplierId);
        if (!invoice.invoice) {
            return res.status(404).json({ error: 'Factura no encontrada' });
        }
        res.json(invoice);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get invoice detail error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// RECLAMOS
// ═══════════════════════════════════════════════════════════════════════════

// Listar reclamos
router.get('/claims', authenticateSupplier, async (req, res) => {
    try {
        const { status, page, limit } = req.query;
        const claims = await SupplierPortalService.getSupplierClaims(req.supplierId, {
            status,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });
        res.json(claims);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get claims error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Detalle de reclamo
router.get('/claims/:id', authenticateSupplier, async (req, res) => {
    try {
        const claim = await SupplierPortalService.getClaimDetails(req.params.id, req.supplierId);
        if (!claim.claim) {
            return res.status(404).json({ error: 'Reclamo no encontrado' });
        }
        res.json(claim);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get claim detail error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Acusar recibo del reclamo
router.post('/claims/:id/acknowledge', authenticateSupplier, async (req, res) => {
    try {
        const claim = await SupplierPortalService.acknowledgeClaimSupplier(
            req.params.id,
            req.supplierId,
            req.portalUserId
        );
        res.json(claim);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Acknowledge claim error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Responder al reclamo
router.post('/claims/:id/respond', authenticateSupplier, async (req, res) => {
    try {
        const result = await SupplierPortalService.respondToClaim(
            req.params.id,
            req.supplierId,
            req.body,
            req.portalUserId
        );
        res.json(result);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Respond claim error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Enviar nota de crédito
router.post('/claims/:id/credit-note', authenticateSupplier, async (req, res) => {
    try {
        const creditNote = await SupplierPortalService.submitCreditNote(
            req.params.id,
            req.supplierId,
            req.body
        );
        res.status(201).json(creditNote);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Submit credit note error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// PAGOS
// ═══════════════════════════════════════════════════════════════════════════

// Listar pagos
router.get('/payments', authenticateSupplier, async (req, res) => {
    try {
        const { status, page, limit } = req.query;
        const payments = await SupplierPortalService.getSupplierPayments(req.supplierId, {
            status,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });
        res.json(payments);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get payments error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Detalle de pago
router.get('/payments/:id', authenticateSupplier, async (req, res) => {
    try {
        const payment = await SupplierPortalService.getPaymentDetails(req.params.id, req.supplierId);
        if (!payment.payment) {
            return res.status(404).json({ error: 'Pago no encontrado' });
        }
        res.json(payment);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get payment detail error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// OFERTAS Y PROMOCIONES
// ═══════════════════════════════════════════════════════════════════════════

// Listar ofertas
router.get('/offers', authenticateSupplier, async (req, res) => {
    try {
        const { status, page, limit } = req.query;
        const offers = await SupplierPortalService.getSupplierOffers(req.supplierId, {
            status,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });
        res.json(offers);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get offers error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Crear oferta
router.post('/offers', authenticateSupplier, async (req, res) => {
    try {
        const offer = await SupplierPortalService.createOffer(req.supplierId, req.body, req.portalUserId);
        res.status(201).json(offer);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Create offer error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Actualizar oferta
router.put('/offers/:id', authenticateSupplier, async (req, res) => {
    try {
        const offer = await SupplierPortalService.updateOffer(req.params.id, req.supplierId, req.body);
        if (!offer) {
            return res.status(404).json({ error: 'Oferta no encontrada o no puede ser modificada' });
        }
        res.json(offer);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Update offer error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Cancelar oferta
router.delete('/offers/:id', authenticateSupplier, async (req, res) => {
    try {
        const offer = await SupplierPortalService.cancelOffer(req.params.id, req.supplierId);
        if (!offer) {
            return res.status(404).json({ error: 'Oferta no encontrada' });
        }
        res.json({ success: true, offer });

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Cancel offer error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// ESTADÍSTICAS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/statistics', authenticateSupplier, async (req, res) => {
    try {
        const { period = 'year' } = req.query;
        const statistics = await SupplierPortalService.getSupplierStatistics(req.supplierId, period);
        res.json(statistics);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get statistics error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICACIONES
// ═══════════════════════════════════════════════════════════════════════════

// Listar notificaciones
router.get('/notifications', authenticateSupplier, async (req, res) => {
    try {
        const { unreadOnly, page, limit } = req.query;
        const notifications = await SupplierPortalService.getSupplierNotifications(req.supplierId, {
            unreadOnly: unreadOnly === 'true',
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });
        res.json(notifications);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get notifications error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Marcar notificación como leída
router.post('/notifications/:id/read', authenticateSupplier, async (req, res) => {
    try {
        const result = await SupplierPortalService.markNotificationRead(req.params.id, req.supplierId);
        res.json(result);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Mark notification read error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Marcar todas las notificaciones como leídas
router.post('/notifications/read-all', authenticateSupplier, async (req, res) => {
    try {
        const result = await SupplierPortalService.markAllNotificationsRead(req.supplierId);
        res.json(result);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Mark all notifications read error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// PERFIL Y CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════

// Obtener perfil del proveedor
router.get('/profile', authenticateSupplier, async (req, res) => {
    try {
        const profile = await SupplierPortalService.getSupplierProfile(
            req.supplierId,
            req.portalUserId
        );
        res.json(profile);
    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get profile error:', error.message);
        res.status(500).json({ error: 'Error al cargar perfil' });
    }
});

// Actualizar perfil del proveedor
router.put('/profile', authenticateSupplier, async (req, res) => {
    try {
        const updated = await SupplierPortalService.updateSupplierProfile(
            req.supplierId,
            req.portalUserId,
            req.body
        );
        res.json({ message: 'Perfil actualizado correctamente', data: updated });
    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Update profile error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Cambiar contraseña del proveedor
router.post('/profile/change-password', authenticateSupplier, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validar campos requeridos
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                error: 'Campos requeridos: currentPassword, newPassword, confirmPassword'
            });
        }

        // Validar que las contraseñas coincidan
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'Las contraseñas nuevas no coinciden' });
        }

        // Validar longitud mínima
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
        }

        // Validar que no sea la contraseña por defecto
        if (newPassword === 'changeme123' || newPassword === 'password') {
            return res.status(400).json({ error: 'Contraseña demasiado común, elige otra' });
        }

        const result = await SupplierPortalService.changePassword(
            req.portalUserId,
            currentPassword,
            newPassword
        );

        res.json({ message: 'Contraseña cambiada correctamente', data: result });
    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Change password error:', error.message);

        if (error.message === 'Contraseña actual incorrecta') {
            return res.status(401).json({ error: error.message });
        }

        res.status(400).json({ error: error.message });
    }
});

// Actualizar información bancaria
router.put('/profile/banking', authenticateSupplier, async (req, res) => {
    try {
        const result = await SupplierPortalService.updateBankingInfo(
            req.supplierId,
            req.body
        );
        res.json({ message: 'Información bancaria actualizada', data: result });
    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Update banking error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Obtener estado de compliance
router.get('/profile/compliance-status', authenticateSupplier, async (req, res) => {
    try {
        const status = await SupplierPortalService.getComplianceStatus(
            req.portalUserId,
            req.supplierId
        );
        res.json(status);
    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get compliance status error:', error.message);
        res.status(500).json({ error: 'Error al cargar estado de compliance' });
    }
});

module.exports = router;
