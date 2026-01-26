/**
 * Procurement Routes
 * API REST completa para el módulo de Compras P2P
 * 50+ endpoints para gestión integral del ciclo Procure-to-Pay
 *
 * Módulo Procurement - Gestión de Compras y Proveedores
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ProcurementService = require('../services/ProcurementService');
const SupplierItemMappingService = require('../services/SupplierItemMappingService');
const P2PIntegrationService = require('../services/P2PIntegrationService');
const db = require('../config/database');

// Inicializar servicios usando el módulo database que exporta todos los modelos
let procurementService = null;
let itemMappingService = null;
let p2pIntegrationService = null;

const initServices = (req, res, next) => {
    if (!procurementService) {
        procurementService = new ProcurementService(db);
    }
    if (!itemMappingService) {
        itemMappingService = new SupplierItemMappingService(db.sequelize);
    }
    if (!p2pIntegrationService) {
        p2pIntegrationService = new P2PIntegrationService(db);
    }
    req.procurementService = procurementService;
    req.itemMappingService = itemMappingService;
    req.p2pService = p2pIntegrationService;
    next();
};

router.use(auth);
router.use(initServices);

// ============================================
// DASHBOARD Y ESTADÍSTICAS
// ============================================

/**
 * GET /api/procurement/dashboard
 * Obtener estadísticas del dashboard de compras
 */
router.get('/dashboard', async (req, res) => {
    try {
        const stats = await req.procurementService.getDashboardStats(req.user.company_id);
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('❌ [Procurement] Error en dashboard:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/dashboard/pending
 * Obtener items pendientes (aprobaciones, recepciones, pagos)
 */
router.get('/dashboard/pending', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const companyId = req.user.company_id;

        const [pending] = await sequelize.query(`
            SELECT
                (SELECT COUNT(*) FROM procurement_requisitions WHERE company_id = :companyId AND status = 'pending_approval') as requisitions_pending,
                (SELECT COUNT(*) FROM procurement_orders WHERE company_id = :companyId AND status = 'pending_approval') as orders_pending,
                (SELECT COUNT(*) FROM procurement_orders WHERE company_id = :companyId AND status = 'approved' AND pending_delivery_qty > 0) as orders_pending_delivery,
                (SELECT COUNT(*) FROM procurement_receipts WHERE company_id = :companyId AND status = 'pending') as receipts_pending,
                (SELECT COUNT(*) FROM procurement_invoices WHERE company_id = :companyId AND status = 'pending_verification') as invoices_pending,
                (SELECT COUNT(*) FROM procurement_invoices WHERE company_id = :companyId AND status = 'verified' AND payment_status = 'pending') as invoices_to_pay
        `, {
            replacements: { companyId },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: pending });
    } catch (error) {
        console.error('❌ [Procurement] Error en pendientes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// REQUISICIONES (SOLICITUDES DE COMPRA)
// ============================================

/**
 * POST /api/procurement/requisitions
 * Crear nueva requisición de compra
 */
router.post('/requisitions', async (req, res) => {
    try {
        const requisition = await req.procurementService.createRequisition({
            ...req.body,
            companyId: req.user.company_id,
            requesterId: req.user.user_id,
            requesterName: req.user.name,
            requesterEmail: req.user.email
        });
        res.status(201).json({ success: true, data: requisition });
    } catch (error) {
        console.error('❌ [Procurement] Error creando requisición:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/requisitions
 * Listar requisiciones
 */
router.get('/requisitions', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { status, page = 1, limit = 20, myOnly } = req.query;

        const where = { company_id: req.user.company_id };
        if (status) where.status = status;
        if (myOnly === 'true') where.requester_id = req.user.user_id;

        const { count, rows } = await sequelize.models.ProcurementRequisition.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error listando requisiciones:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/requisitions/:id
 * Obtener detalle de requisición
 */
router.get('/requisitions/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const requisition = await sequelize.models.ProcurementRequisition.findOne({
            where: { id: req.params.id, company_id: req.user.company_id },
            include: [{ model: sequelize.models.ProcurementRequisitionItem, as: 'items' }]
        });

        if (!requisition) {
            return res.status(404).json({ success: false, error: 'Requisición no encontrada' });
        }

        res.json({ success: true, data: requisition });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo requisición:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/procurement/requisitions/:id
 * Actualizar requisición (solo en estado draft)
 */
router.put('/requisitions/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const requisition = await sequelize.models.ProcurementRequisition.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!requisition) {
            return res.status(404).json({ success: false, error: 'Requisición no encontrada' });
        }

        if (requisition.status !== 'draft') {
            return res.status(400).json({ success: false, error: 'Solo se pueden editar requisiciones en borrador' });
        }

        await requisition.update(req.body);
        res.json({ success: true, data: requisition });
    } catch (error) {
        console.error('❌ [Procurement] Error actualizando requisición:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/requisitions/:id/submit
 * Enviar requisición para aprobación
 */
router.post('/requisitions/:id/submit', async (req, res) => {
    try {
        const result = await req.procurementService.submitRequisition(
            req.params.id,
            req.user.company_id
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ [Procurement] Error enviando requisición:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/requisitions/:id/approve
 * Aprobar requisición
 */
router.post('/requisitions/:id/approve', async (req, res) => {
    try {
        const result = await req.procurementService.approveRequisition(
            req.params.id,
            req.user.company_id,
            req.user.user_id,
            req.user.name,
            req.body.comments
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ [Procurement] Error aprobando requisición:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/requisitions/:id/reject
 * Rechazar requisición
 */
router.post('/requisitions/:id/reject', async (req, res) => {
    try {
        const result = await req.procurementService.rejectRequisition(
            req.params.id,
            req.user.company_id,
            req.user.user_id,
            req.user.name,
            req.body.reason
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ [Procurement] Error rechazando requisición:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/procurement/requisitions/:id
 * Cancelar requisición
 */
router.delete('/requisitions/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const requisition = await sequelize.models.ProcurementRequisition.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!requisition) {
            return res.status(404).json({ success: false, error: 'Requisición no encontrada' });
        }

        if (!['draft', 'rejected'].includes(requisition.status)) {
            return res.status(400).json({ success: false, error: 'No se puede eliminar esta requisición' });
        }

        await requisition.update({ status: 'cancelled' });
        res.json({ success: true, message: 'Requisición cancelada' });
    } catch (error) {
        console.error('❌ [Procurement] Error cancelando requisición:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// RFQ - SOLICITUDES DE COTIZACIÓN
// ============================================

/**
 * POST /api/procurement/rfqs
 * Crear nueva solicitud de cotización (RFQ)
 */
router.post('/rfqs', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const companyId = req.user.company_id;
        const userId = req.user.user_id;

        const transaction = await sequelize.transaction();

        try {
            // Generar número de RFQ
            const [lastRfq] = await sequelize.query(
                `SELECT rfq_number FROM request_for_quotations
                 WHERE company_id = :companyId ORDER BY id DESC LIMIT 1`,
                { replacements: { companyId }, type: sequelize.QueryTypes.SELECT, transaction }
            );

            let nextNumber = 1;
            if (lastRfq && lastRfq.rfq_number) {
                const match = lastRfq.rfq_number.match(/RFQ-(\d+)/);
                nextNumber = match ? parseInt(match[1]) + 1 : 1;
            }
            const rfqNumber = `RFQ-${nextNumber.toString().padStart(6, '0')}`;

            // Crear RFQ
            const [rfqResult] = await sequelize.query(`
                INSERT INTO request_for_quotations
                (company_id, rfq_number, requisition_id, title, description, rfq_type,
                 quotation_deadline, delivery_deadline, delivery_address, payment_terms_required,
                 warranty_required, evaluation_criteria, allow_partial_quotation, allow_alternatives,
                 requires_samples, min_suppliers_required, status, notes, internal_notes, created_by)
                VALUES
                (:companyId, :rfqNumber, :requisitionId, :title, :description, :rfqType,
                 :quotationDeadline, :deliveryDeadline, :deliveryAddress, :paymentTerms,
                 :warranty, :evaluationCriteria, :allowPartial, :allowAlternatives,
                 :requiresSamples, :minSuppliers, 'draft', :notes, :internalNotes, :userId)
                RETURNING *
            `, {
                replacements: {
                    companyId,
                    rfqNumber,
                    requisitionId: req.body.requisitionId || null,
                    title: req.body.title,
                    description: req.body.description,
                    rfqType: req.body.rfqType || 'standard',
                    quotationDeadline: req.body.quotationDeadline,
                    deliveryDeadline: req.body.deliveryDeadline || null,
                    deliveryAddress: req.body.deliveryAddress || null,
                    paymentTerms: req.body.paymentTerms || null,
                    warranty: req.body.warranty || null,
                    evaluationCriteria: JSON.stringify(req.body.evaluationCriteria || { price: 60, quality: 20, delivery: 20 }),
                    allowPartial: req.body.allowPartialQuotation !== false,
                    allowAlternatives: req.body.allowAlternatives || false,
                    requiresSamples: req.body.requiresSamples || false,
                    minSuppliers: req.body.minSuppliersRequired || 1,
                    notes: req.body.notes || null,
                    internalNotes: req.body.internalNotes || null,
                    userId
                },
                type: sequelize.QueryTypes.INSERT,
                transaction
            });

            const rfqId = rfqResult[0].id;

            // Crear items
            if (req.body.items && req.body.items.length > 0) {
                for (let i = 0; i < req.body.items.length; i++) {
                    const item = req.body.items[i];
                    await sequelize.query(`
                        INSERT INTO rfq_items
                        (rfq_id, line_number, item_code, description, quantity, unit_of_measure,
                         specifications, notes, category_id, estimated_unit_price)
                        VALUES
                        (:rfqId, :lineNumber, :itemCode, :description, :quantity, :uom,
                         :specifications, :notes, :categoryId, :estimatedPrice)
                    `, {
                        replacements: {
                            rfqId,
                            lineNumber: i + 1,
                            itemCode: item.itemCode || null,
                            description: item.description,
                            quantity: item.quantity,
                            uom: item.unitOfMeasure || 'UN',
                            specifications: item.specifications || null,
                            notes: item.notes || null,
                            categoryId: item.categoryId || null,
                            estimatedPrice: item.estimatedPrice || null
                        },
                        transaction
                    });
                }
            }

            await transaction.commit();

            res.status(201).json({
                success: true,
                data: {
                    id: rfqId,
                    rfqNumber: rfqNumber,
                    status: 'draft',
                    message: 'RFQ creada exitosamente'
                }
            });

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error('❌ [Procurement] Error creando RFQ:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/rfqs
 * Listar RFQs de la empresa
 */
router.get('/rfqs', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { status, page = 1, limit = 20 } = req.query;

        const where = { company_id: req.user.company_id };
        if (status) where.status = status;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const [rfqs] = await sequelize.query(`
            SELECT
                r.*,
                (SELECT COUNT(*) FROM rfq_items WHERE rfq_id = r.id) as items_count,
                (SELECT COUNT(*) FROM rfq_invitations WHERE rfq_id = r.id) as invitations_count,
                (SELECT COUNT(*) FROM rfq_invitations WHERE rfq_id = r.id AND responded = true) as responses_count,
                (SELECT COUNT(*) FROM supplier_quotations WHERE rfq_id = r.id) as quotations_count
            FROM request_for_quotations r
            WHERE r.company_id = :companyId
            ${status ? 'AND r.status = :status' : ''}
            ORDER BY r.created_at DESC
            LIMIT :limit OFFSET :offset
        `, {
            replacements: { companyId: req.user.company_id, status, limit: parseInt(limit), offset },
            type: sequelize.QueryTypes.SELECT
        });

        const [countResult] = await sequelize.query(`
            SELECT COUNT(*) as total FROM request_for_quotations
            WHERE company_id = :companyId ${status ? 'AND status = :status' : ''}
        `, {
            replacements: { companyId: req.user.company_id, status },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: rfqs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems: parseInt(countResult.total),
                totalPages: Math.ceil(countResult.total / limit)
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error listando RFQs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/rfqs/:id
 * Obtener detalle de RFQ
 */
router.get('/rfqs/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');

        const [rfq] = await sequelize.query(`
            SELECT * FROM request_for_quotations
            WHERE id = :id AND company_id = :companyId
        `, {
            replacements: { id: req.params.id, companyId: req.user.company_id },
            type: sequelize.QueryTypes.SELECT
        });

        if (!rfq) {
            return res.status(404).json({ success: false, error: 'RFQ no encontrada' });
        }

        // Obtener items
        const [items] = await sequelize.query(`
            SELECT * FROM rfq_items WHERE rfq_id = :rfqId ORDER BY line_number
        `, {
            replacements: { rfqId: req.params.id },
            type: sequelize.QueryTypes.SELECT
        });

        // Obtener invitaciones
        const [invitations] = await sequelize.query(`
            SELECT
                i.*,
                s.name as supplier_name,
                s.email as supplier_email,
                s.contact_name
            FROM rfq_invitations i
            JOIN wms_suppliers s ON i.supplier_id = s.id
            WHERE i.rfq_id = :rfqId
        `, {
            replacements: { rfqId: req.params.id },
            type: sequelize.QueryTypes.SELECT
        });

        // Obtener cotizaciones recibidas
        const [quotations] = await sequelize.query(`
            SELECT
                q.*,
                s.name as supplier_name,
                (SELECT COUNT(*) FROM supplier_quotation_items WHERE quotation_id = q.id) as items_count
            FROM supplier_quotations q
            JOIN wms_suppliers s ON q.supplier_id = s.id
            WHERE q.rfq_id = :rfqId
        `, {
            replacements: { rfqId: req.params.id },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: {
                rfq,
                items,
                invitations,
                quotations
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo RFQ:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/rfqs/:id/publish
 * Publicar RFQ y enviar invitaciones a proveedores
 */
router.post('/rfqs/:id/publish', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const rfqId = req.params.id;

        const transaction = await sequelize.transaction();

        try {
            // Verificar que existe y pertenece a la empresa
            const [rfq] = await sequelize.query(`
                SELECT * FROM request_for_quotations WHERE id = :rfqId AND company_id = :companyId
            `, {
                replacements: { rfqId, companyId },
                type: sequelize.QueryTypes.SELECT,
                transaction
            });

            if (!rfq) {
                await transaction.rollback();
                return res.status(404).json({ success: false, error: 'RFQ no encontrada' });
            }

            if (rfq.status !== 'draft') {
                await transaction.rollback();
                return res.status(400).json({ success: false, error: 'Solo RFQs en borrador pueden publicarse' });
            }

            // Verificar que tenga items
            const [itemCount] = await sequelize.query(`
                SELECT COUNT(*) as count FROM rfq_items WHERE rfq_id = :rfqId
            `, {
                replacements: { rfqId },
                type: sequelize.QueryTypes.SELECT,
                transaction
            });

            if (itemCount.count === 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, error: 'La RFQ debe tener al menos un item' });
            }

            // Actualizar estado
            await sequelize.query(`
                UPDATE request_for_quotations
                SET status = 'published', published_at = NOW(), published_by = :userId, updated_at = NOW()
                WHERE id = :rfqId
            `, {
                replacements: { rfqId, userId },
                transaction
            });

            // Crear invitaciones a proveedores
            const supplierIds = req.body.supplierIds || [];
            const invitedSuppliers = [];

            for (const supplierId of supplierIds) {
                // Obtener datos del proveedor
                const [supplier] = await sequelize.query(`
                    SELECT id, name, email, contact_email FROM wms_suppliers
                    WHERE id = :supplierId AND company_id = :companyId AND status = 'active'
                `, {
                    replacements: { supplierId, companyId },
                    type: sequelize.QueryTypes.SELECT,
                    transaction
                });

                if (supplier) {
                    const emailTo = supplier.contact_email || supplier.email;

                    await sequelize.query(`
                        INSERT INTO rfq_invitations
                        (rfq_id, supplier_id, invitation_sent_at, invitation_method, email_sent_to)
                        VALUES (:rfqId, :supplierId, NOW(), 'email', :emailTo)
                        ON CONFLICT (rfq_id, supplier_id) DO NOTHING
                    `, {
                        replacements: { rfqId, supplierId, emailTo },
                        transaction
                    });

                    invitedSuppliers.push({
                        id: supplier.id,
                        name: supplier.name,
                        email: emailTo
                    });

                    // Enviar notificación por email (asyncrónicamente)
                    try {
                        const SupplierEmailService = require('../services/SupplierEmailService');
                        const emailService = new SupplierEmailService(sequelize);

                        // Obtener empresa
                        const [company] = await sequelize.query(
                            `SELECT name FROM companies WHERE company_id = :companyId`,
                            { replacements: { companyId }, type: sequelize.QueryTypes.SELECT, transaction }
                        );

                        await emailService.sendRfqInvitation({
                            supplier: {
                                id: supplier.id,
                                name: supplier.name,
                                email: emailTo
                            },
                            company: company || { name: 'APONNT' },
                            rfq: {
                                id: rfqId,
                                rfqNumber: rfq.rfq_number,
                                title: rfq.title,
                                description: rfq.description,
                                quotationDeadline: rfq.quotation_deadline
                            }
                        });
                    } catch (emailError) {
                        console.error('⚠️ [Procurement] Error enviando email RFQ:', emailError.message);
                    }
                }
            }

            await transaction.commit();

            res.json({
                success: true,
                data: {
                    rfq_id: rfqId,
                    status: 'published',
                    invited_suppliers: invitedSuppliers,
                    message: `RFQ publicada exitosamente. ${invitedSuppliers.length} proveedores invitados.`
                }
            });

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error('❌ [Procurement] Error publicando RFQ:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/rfqs/:id/invite
 * Invitar proveedor adicional a RFQ ya publicada
 */
router.post('/rfqs/:id/invite', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const companyId = req.user.company_id;
        const rfqId = req.params.id;
        const { supplierId } = req.body;

        if (!supplierId) {
            return res.status(400).json({ success: false, error: 'supplierId es requerido' });
        }

        // Verificar RFQ
        const [rfq] = await sequelize.query(`
            SELECT * FROM request_for_quotations WHERE id = :rfqId AND company_id = :companyId
        `, {
            replacements: { rfqId, companyId },
            type: sequelize.QueryTypes.SELECT
        });

        if (!rfq) {
            return res.status(404).json({ success: false, error: 'RFQ no encontrada' });
        }

        if (!['published', 'open'].includes(rfq.status)) {
            return res.status(400).json({ success: false, error: 'RFQ debe estar publicada para enviar invitaciones' });
        }

        // Obtener proveedor
        const [supplier] = await sequelize.query(`
            SELECT id, name, email, contact_email FROM wms_suppliers
            WHERE id = :supplierId AND company_id = :companyId AND status = 'active'
        `, {
            replacements: { supplierId, companyId },
            type: sequelize.QueryTypes.SELECT
        });

        if (!supplier) {
            return res.status(404).json({ success: false, error: 'Proveedor no encontrado o inactivo' });
        }

        const emailTo = supplier.contact_email || supplier.email;

        // Crear invitación
        await sequelize.query(`
            INSERT INTO rfq_invitations
            (rfq_id, supplier_id, invitation_sent_at, invitation_method, email_sent_to)
            VALUES (:rfqId, :supplierId, NOW(), 'email', :emailTo)
            ON CONFLICT (rfq_id, supplier_id) DO UPDATE
            SET reminder_sent_at = NOW(), reminder_count = rfq_invitations.reminder_count + 1
        `, {
            replacements: { rfqId, supplierId, emailTo }
        });

        // Enviar email
        try {
            const SupplierEmailService = require('../services/SupplierEmailService');
            const emailService = new SupplierEmailService(sequelize);

            const [company] = await sequelize.query(
                `SELECT name FROM companies WHERE company_id = :companyId`,
                { replacements: { companyId }, type: sequelize.QueryTypes.SELECT }
            );

            await emailService.sendRfqInvitation({
                supplier: { id: supplier.id, name: supplier.name, email: emailTo },
                company: company || { name: 'APONNT' },
                rfq: {
                    id: rfqId,
                    rfqNumber: rfq.rfq_number,
                    title: rfq.title,
                    description: rfq.description,
                    quotationDeadline: rfq.quotation_deadline
                }
            });
        } catch (emailError) {
            console.error('⚠️ [Procurement] Error enviando email:', emailError.message);
        }

        res.json({
            success: true,
            data: {
                supplier: { id: supplier.id, name: supplier.name },
                email_sent: emailTo,
                message: 'Invitación enviada exitosamente'
            }
        });

    } catch (error) {
        console.error('❌ [Procurement] Error invitando proveedor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/rfqs/:id/close
 * Cerrar RFQ (no acepta más cotizaciones)
 */
router.post('/rfqs/:id/close', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');

        const [result] = await sequelize.query(`
            UPDATE request_for_quotations
            SET status = 'closed', closed_at = NOW(), updated_at = NOW()
            WHERE id = :rfqId AND company_id = :companyId AND status IN ('published', 'open')
            RETURNING *
        `, {
            replacements: { rfqId: req.params.id, companyId: req.user.company_id },
            type: sequelize.QueryTypes.UPDATE
        });

        if (result.length === 0) {
            return res.status(404).json({ success: false, error: 'RFQ no encontrada o no puede cerrarse' });
        }

        res.json({ success: true, data: result[0], message: 'RFQ cerrada exitosamente' });
    } catch (error) {
        console.error('❌ [Procurement] Error cerrando RFQ:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/procurement/rfqs/:id
 * Actualizar RFQ (solo en estado draft)
 */
router.put('/rfqs/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const rfqId = req.params.id;
        const companyId = req.user.company_id;

        const [rfq] = await sequelize.query(`
            SELECT status FROM request_for_quotations WHERE id = :rfqId AND company_id = :companyId
        `, {
            replacements: { rfqId, companyId },
            type: sequelize.QueryTypes.SELECT
        });

        if (!rfq) {
            return res.status(404).json({ success: false, error: 'RFQ no encontrada' });
        }

        if (rfq.status !== 'draft') {
            return res.status(400).json({ success: false, error: 'Solo RFQs en borrador pueden editarse' });
        }

        // Actualizar campos permitidos
        const updates = [];
        const replacements = { rfqId, companyId };

        if (req.body.title) { updates.push('title = :title'); replacements.title = req.body.title; }
        if (req.body.description) { updates.push('description = :description'); replacements.description = req.body.description; }
        if (req.body.quotationDeadline) { updates.push('quotation_deadline = :quotationDeadline'); replacements.quotationDeadline = req.body.quotationDeadline; }
        if (req.body.deliveryDeadline) { updates.push('delivery_deadline = :deliveryDeadline'); replacements.deliveryDeadline = req.body.deliveryDeadline; }
        if (req.body.notes) { updates.push('notes = :notes'); replacements.notes = req.body.notes; }

        if (updates.length > 0) {
            updates.push('updated_at = NOW()');
            await sequelize.query(`
                UPDATE request_for_quotations
                SET ${updates.join(', ')}
                WHERE id = :rfqId AND company_id = :companyId
            `, { replacements });
        }

        res.json({ success: true, message: 'RFQ actualizada exitosamente' });
    } catch (error) {
        console.error('❌ [Procurement] Error actualizando RFQ:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/procurement/rfqs/:id
 * Cancelar/Eliminar RFQ
 */
router.delete('/rfqs/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');

        await sequelize.query(`
            UPDATE request_for_quotations
            SET status = 'cancelled', cancellation_reason = :reason, updated_at = NOW()
            WHERE id = :rfqId AND company_id = :companyId AND status IN ('draft', 'published')
        `, {
            replacements: {
                rfqId: req.params.id,
                companyId: req.user.company_id,
                reason: req.body.reason || 'Cancelada por usuario'
            }
        });

        res.json({ success: true, message: 'RFQ cancelada exitosamente' });
    } catch (error) {
        console.error('❌ [Procurement] Error cancelando RFQ:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// RFQ - SCORING Y COMPARACIÓN DE COTIZACIONES
// ============================================

/**
 * POST /api/procurement/rfqs/:id/evaluate
 * Evaluar todas las cotizaciones de un RFQ y recomendar la mejor
 */
router.post('/rfqs/:id/evaluate', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const QuotationScoringService = require('../services/QuotationScoringService');
        const scoringService = new QuotationScoringService(sequelize);

        const rfqId = req.params.id;
        const companyId = req.user.company_id;

        // Ejecutar evaluación
        const evaluation = await scoringService.evaluateRfqQuotations(rfqId, companyId);

        res.json(evaluation);
    } catch (error) {
        console.error('❌ [Procurement] Error evaluando cotizaciones:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/rfqs/:id/comparison-report
 * Generar reporte de comparación para dashboard
 */
router.get('/rfqs/:id/comparison-report', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const QuotationScoringService = require('../services/QuotationScoringService');
        const scoringService = new QuotationScoringService(sequelize);

        const rfqId = req.params.id;
        const companyId = req.user.company_id;

        // Generar reporte con estadísticas
        const report = await scoringService.generateComparisonReport(rfqId, companyId);

        res.json(report);
    } catch (error) {
        console.error('❌ [Procurement] Error generando reporte:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/quotations/compare
 * Comparar dos cotizaciones específicas lado a lado
 * Body: { quotationId1: number, quotationId2: number }
 */
router.post('/quotations/compare', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const QuotationScoringService = require('../services/QuotationScoringService');
        const scoringService = new QuotationScoringService(sequelize);

        const { quotationId1, quotationId2 } = req.body;
        const companyId = req.user.company_id;

        if (!quotationId1 || !quotationId2) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren quotationId1 y quotationId2'
            });
        }

        // Comparar cotizaciones
        const comparison = await scoringService.compareQuotations(
            quotationId1,
            quotationId2,
            companyId
        );

        res.json(comparison);
    } catch (error) {
        console.error('❌ [Procurement] Error comparando cotizaciones:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// ÓRDENES DE COMPRA
// ============================================

/**
 * POST /api/procurement/orders
 * Crear orden de compra desde requisición aprobada
 */
router.post('/orders', async (req, res) => {
    try {
        const order = await req.procurementService.createOrderFromRequisition(
            req.body.requisitionId,
            req.body.supplierId,
            req.body.items,
            req.user.company_id,
            req.user.user_id
        );
        res.status(201).json({ success: true, data: order });
    } catch (error) {
        console.error('❌ [Procurement] Error creando orden:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/orders
 * Listar órdenes de compra
 */
router.get('/orders', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { status, supplierId, page = 1, limit = 20 } = req.query;

        const where = { company_id: req.user.company_id };
        if (status) where.status = status;
        if (supplierId) where.supplier_id = supplierId;

        const { count, rows } = await sequelize.models.ProcurementOrder.findAndCountAll({
            where,
            include: [{ model: sequelize.models.ProcurementSupplier, as: 'supplier', attributes: ['id', 'name', 'legal_name'] }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error listando órdenes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/orders/:id
 * Obtener detalle de orden de compra
 */
router.get('/orders/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const order = await sequelize.models.ProcurementOrder.findOne({
            where: { id: req.params.id, company_id: req.user.company_id },
            include: [
                { model: sequelize.models.ProcurementOrderItem, as: 'items' },
                { model: sequelize.models.ProcurementSupplier, as: 'supplier' },
                { model: sequelize.models.ProcurementReceipt, as: 'receipts' }
            ]
        });

        if (!order) {
            return res.status(404).json({ success: false, error: 'Orden no encontrada' });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo orden:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/orders/:id/approve
 * Aprobar orden de compra
 */
router.post('/orders/:id/approve', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const order = await sequelize.models.ProcurementOrder.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!order) {
            return res.status(404).json({ success: false, error: 'Orden no encontrada' });
        }

        await order.approve(req.user.user_id, req.user.name, req.body.comments);
        res.json({ success: true, data: order });
    } catch (error) {
        console.error('❌ [Procurement] Error aprobando orden:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/orders/:id/send
 * Enviar orden al proveedor
 */
router.post('/orders/:id/send', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const order = await sequelize.models.ProcurementOrder.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!order) {
            return res.status(404).json({ success: false, error: 'Orden no encontrada' });
        }

        await order.sendToSupplier(req.user.user_id, req.body.method || 'email');
        res.json({ success: true, data: order, message: 'Orden enviada al proveedor' });
    } catch (error) {
        console.error('❌ [Procurement] Error enviando orden:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/orders/:id/cancel
 * Cancelar orden de compra
 */
router.post('/orders/:id/cancel', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const order = await sequelize.models.ProcurementOrder.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!order) {
            return res.status(404).json({ success: false, error: 'Orden no encontrada' });
        }

        await order.cancel(req.user.user_id, req.body.reason);
        res.json({ success: true, message: 'Orden cancelada' });
    } catch (error) {
        console.error('❌ [Procurement] Error cancelando orden:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// RECEPCIÓN DE MERCADERÍA
// ============================================

/**
 * POST /api/procurement/receipts
 * Crear recepción de mercadería
 */
router.post('/receipts', async (req, res) => {
    try {
        const receipt = await req.procurementService.createReceipt({
            ...req.body,
            companyId: req.user.company_id,
            receivedBy: req.user.user_id,
            receivedByName: req.user.name
        });
        res.status(201).json({ success: true, data: receipt });
    } catch (error) {
        console.error('❌ [Procurement] Error creando recepción:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/receipts
 * Listar recepciones
 */
router.get('/receipts', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { orderId, status, page = 1, limit = 20 } = req.query;

        const where = { company_id: req.user.company_id };
        if (orderId) where.order_id = orderId;
        if (status) where.status = status;

        const { count, rows } = await sequelize.models.ProcurementReceipt.findAndCountAll({
            where,
            include: [{ model: sequelize.models.ProcurementOrder, as: 'order', attributes: ['id', 'order_number'] }],
            order: [['receipt_date', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error listando recepciones:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/receipts/:id
 * Obtener detalle de recepción
 */
router.get('/receipts/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const receipt = await sequelize.models.ProcurementReceipt.findOne({
            where: { id: req.params.id, company_id: req.user.company_id },
            include: [
                { model: sequelize.models.ProcurementReceiptItem, as: 'items' },
                { model: sequelize.models.ProcurementOrder, as: 'order' }
            ]
        });

        if (!receipt) {
            return res.status(404).json({ success: false, error: 'Recepción no encontrada' });
        }

        res.json({ success: true, data: receipt });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo recepción:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/receipts/:id/confirm
 * Confirmar recepción
 */
router.post('/receipts/:id/confirm', async (req, res) => {
    try {
        const receipt = await db.ProcurementReceipt.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!receipt) {
            return res.status(404).json({ success: false, error: 'Recepción no encontrada' });
        }

        await receipt.confirm(req.user.user_id || req.user.id, req.body.isComplete);

        // P2P Integration: Actualizar stock en WMS
        let stockResult = null;
        try {
            stockResult = await req.p2pService.processReceiptToStock(receipt.id, req.user.user_id || req.user.id);
        } catch (stockError) {
            console.error('[P2P] Error actualizando stock (recepción confirmada igualmente):', stockError.message);
        }

        // P2P Integration: Generar asiento contable de recepción
        let journalEntry = null;
        try {
            journalEntry = await req.p2pService.generateReceiptJournalEntry(receipt.id, req.user.user_id || req.user.id);
        } catch (accountingError) {
            console.error('[P2P] Error generando asiento contable:', accountingError.message);
        }

        res.json({
            success: true,
            data: receipt,
            stockUpdate: stockResult,
            journalEntry: journalEntry ? { id: journalEntry.id, number: journalEntry.entry_number } : null
        });
    } catch (error) {
        console.error('❌ [Procurement] Error confirmando recepción:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/receipts/:id/quality
 * Actualizar estado de calidad
 */
router.post('/receipts/:id/quality', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const receipt = await sequelize.models.ProcurementReceipt.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!receipt) {
            return res.status(404).json({ success: false, error: 'Recepción no encontrada' });
        }

        const { status, notes } = req.body;
        if (status === 'approved') {
            await receipt.approveQuality(req.user.user_id, notes);
        } else if (status === 'rejected') {
            await receipt.rejectQuality(req.user.user_id, notes);
        } else if (status === 'conditional') {
            await receipt.conditionalApproval(req.user.user_id, notes);
        }

        res.json({ success: true, data: receipt });
    } catch (error) {
        console.error('❌ [Procurement] Error actualizando calidad:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// REMITOS INTERNOS
// ============================================

/**
 * POST /api/procurement/internal-receipts
 * Crear remito interno (cuando no hay documento del proveedor)
 */
router.post('/internal-receipts', async (req, res) => {
    try {
        const internalReceipt = await req.procurementService.createInternalReceipt({
            ...req.body,
            companyId: req.user.company_id,
            createdBy: req.user.user_id
        });
        res.status(201).json({ success: true, data: internalReceipt });
    } catch (error) {
        console.error('❌ [Procurement] Error creando remito interno:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/internal-receipts
 * Listar remitos internos
 */
router.get('/internal-receipts', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { page = 1, limit = 20 } = req.query;

        const { count, rows } = await sequelize.models.ProcurementInternalReceipt.findAndCountAll({
            where: { company_id: req.user.company_id },
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error listando remitos internos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// FACTURAS DE COMPRA
// ============================================

/**
 * POST /api/procurement/invoices
 * Registrar factura de compra
 */
router.post('/invoices', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const invoice = await sequelize.models.ProcurementInvoice.create({
            ...req.body,
            company_id: req.user.company_id,
            registered_by: req.user.user_id
        });
        res.status(201).json({ success: true, data: invoice });
    } catch (error) {
        console.error('❌ [Procurement] Error registrando factura:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/invoices
 * Listar facturas de compra
 */
router.get('/invoices', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { status, paymentStatus, supplierId, page = 1, limit = 20 } = req.query;

        const where = { company_id: req.user.company_id };
        if (status) where.status = status;
        if (paymentStatus) where.payment_status = paymentStatus;
        if (supplierId) where.supplier_id = supplierId;

        const { count, rows } = await sequelize.models.ProcurementInvoice.findAndCountAll({
            where,
            include: [{ model: sequelize.models.ProcurementSupplier, as: 'supplier', attributes: ['id', 'name', 'legal_name'] }],
            order: [['invoice_date', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error listando facturas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/invoices/pending-payment
 * Facturas pendientes de pago
 */
router.get('/invoices/pending-payment', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');

        const invoices = await sequelize.models.ProcurementInvoice.findAll({
            where: {
                company_id: req.user.company_id,
                status: 'verified',
                payment_status: { [sequelize.Sequelize.Op.in]: ['pending', 'partial'] }
            },
            include: [{ model: sequelize.models.ProcurementSupplier, as: 'supplier', attributes: ['id', 'name', 'legal_name'] }],
            order: [['due_date', 'ASC']]
        });

        res.json({ success: true, data: invoices });
    } catch (error) {
        console.error('❌ [Procurement] Error listando facturas pendientes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/invoices/:id
 * Obtener detalle de factura
 */
router.get('/invoices/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const invoice = await sequelize.models.ProcurementInvoice.findOne({
            where: { id: req.params.id, company_id: req.user.company_id },
            include: [
                { model: sequelize.models.ProcurementSupplier, as: 'supplier' },
                { model: sequelize.models.ProcurementOrder, as: 'order' },
                { model: sequelize.models.ProcurementReceipt, as: 'receipt' }
            ]
        });

        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Factura no encontrada' });
        }

        res.json({ success: true, data: invoice });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo factura:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/invoices/:id/three-way-match
 * Ejecutar verificación Three-Way Match: OC ↔ Recepción ↔ Factura
 */
router.get('/invoices/:id/three-way-match', async (req, res) => {
    try {
        const invoice = await db.ProcurementInvoice.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Factura no encontrada' });
        }

        const tolerance = parseFloat(req.query.tolerance) || 2.0;
        const result = await req.p2pService.performThreeWayMatch(invoice.id, tolerance);

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ [Procurement] Error en Three-Way Match:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/orders/:id/circuit-status
 * Estado completo del circuito P2P de una OC
 */
router.get('/orders/:id/circuit-status', async (req, res) => {
    try {
        const result = await req.p2pService.getOrderCircuitStatus(req.params.id);
        if (!result) {
            return res.status(404).json({ success: false, error: 'Orden no encontrada' });
        }
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo circuit status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/orders/:id/close-circuit
 * Intentar cerrar el circuito P2P de una OC
 */
router.post('/orders/:id/close-circuit', async (req, res) => {
    try {
        const result = await req.p2pService.checkAndCloseOrderCircuit(req.params.id);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ [Procurement] Error cerrando circuito:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/invoices/:id/execute-match
 * Ejecutar three-way matching y actualizar estado de la factura
 */
router.post('/invoices/:id/execute-match', async (req, res) => {
    try {
        const invoice = await db.ProcurementInvoice.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });
        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Factura no encontrada' });
        }

        const tolerance = parseFloat(req.body.tolerance) || 2.0;
        const matchResult = await req.p2pService.performThreeWayMatch(invoice.id, tolerance);

        // Si el matching fue exitoso, generar asiento contable
        if (matchResult.status === 'matched') {
            try {
                await req.p2pService.generateInvoiceJournalEntry(invoice.id, req.user.user_id || req.user.id);
            } catch (err) {
                console.error('[P2P] Error generando asiento de factura:', err.message);
            }
        }

        res.json({ success: true, data: matchResult });
    } catch (error) {
        console.error('❌ [Procurement] Error ejecutando matching:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/payment-orders/from-invoices
 * Crear orden de pago desde facturas aprobadas (bridge P2P → Finance)
 */
router.post('/payment-orders/from-invoices', async (req, res) => {
    try {
        const { invoice_ids, payment_date, payment_method, retentions_detail, notes, cost_center_id } = req.body;

        if (!invoice_ids || !Array.isArray(invoice_ids) || invoice_ids.length === 0) {
            return res.status(400).json({ success: false, error: 'Se requiere al menos una factura' });
        }

        const result = await req.p2pService.createPaymentOrderFromInvoices(
            req.user.company_id,
            invoice_ids,
            { payment_date, payment_method, retentions_detail, notes, cost_center_id },
            req.user.user_id || req.user.id
        );

        res.json(result);
    } catch (error) {
        console.error('❌ [Procurement] Error creando orden de pago:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/invoices/:id/verify
 * Verificar factura (three-way matching)
 */
router.post('/invoices/:id/verify', async (req, res) => {
    try {
        const invoice = await db.ProcurementInvoice.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Factura no encontrada' });
        }

        await invoice.verify(req.user.user_id, req.body.notes);
        res.json({ success: true, data: invoice });
    } catch (error) {
        console.error('❌ [Procurement] Error verificando factura:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/invoices/:id/dispute
 * Marcar factura en disputa
 */
router.post('/invoices/:id/dispute', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const invoice = await sequelize.models.ProcurementInvoice.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Factura no encontrada' });
        }

        await invoice.update({
            status: 'disputed',
            dispute_reason: req.body.reason,
            disputed_by: req.user.user_id,
            disputed_at: new Date(),
            audit_trail: [
                ...(invoice.audit_trail || []),
                {
                    action: 'disputed',
                    user_id: req.user.user_id,
                    reason: req.body.reason,
                    timestamp: new Date().toISOString()
                }
            ]
        });

        res.json({ success: true, data: invoice });
    } catch (error) {
        console.error('❌ [Procurement] Error marcando disputa:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// PROVEEDORES
// ============================================

/**
 * POST /api/procurement/suppliers
 * Crear proveedor
 */
router.post('/suppliers', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const supplier = await sequelize.models.ProcurementSupplier.create({
            ...req.body,
            company_id: req.user.company_id
        });
        res.status(201).json({ success: true, data: supplier });
    } catch (error) {
        console.error('❌ [Procurement] Error creando proveedor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/suppliers
 * Listar proveedores
 */
router.get('/suppliers', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { status, search, page = 1, limit = 50 } = req.query;

        const where = { company_id: req.user.company_id };
        if (status) where.status = status;
        if (search) {
            where[sequelize.Sequelize.Op.or] = [
                { name: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
                { legal_name: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
                { tax_id: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } }
            ];
        }

        const { count, rows } = await sequelize.models.ProcurementSupplier.findAndCountAll({
            where,
            order: [['name', 'ASC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error listando proveedores:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/suppliers/suggested
 * Proveedores sugeridos para una compra
 */
router.get('/suppliers/suggested', async (req, res) => {
    try {
        const { categoryId, productIds, minAmount } = req.query;
        const suggestions = await req.procurementService.getSuggestedSuppliers(
            req.user.company_id,
            categoryId,
            productIds ? productIds.split(',').map(Number) : [],
            parseFloat(minAmount) || 0
        );
        res.json({ success: true, data: suggestions });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo sugerencias:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/suppliers/:id
 * Obtener detalle de proveedor
 */
router.get('/suppliers/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const supplier = await sequelize.models.ProcurementSupplier.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!supplier) {
            return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
        }

        res.json({ success: true, data: supplier });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo proveedor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/suppliers/:id/pending-claims
 * Verificar reclamos pendientes de un proveedor
 * IMPORTANTE: Usado para validar antes de crear órdenes de pago
 */
router.get('/suppliers/:id/pending-claims', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const supplierId = req.params.id;
        const companyId = req.user.company_id;

        // Verificar que el proveedor pertenece a la empresa
        const supplier = await sequelize.models.ProcurementSupplier.findOne({
            where: { id: supplierId, company_id: companyId }
        });

        if (!supplier) {
            return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
        }

        // Buscar reclamos pendientes
        const [pendingClaims] = await sequelize.query(`
            SELECT
                id,
                claim_number,
                claim_type,
                claim_date,
                description,
                priority,
                status,
                total_affected_amount,
                resolution_deadline
            FROM supplier_claims
            WHERE supplier_id = :supplierId
              AND company_id = :companyId
              AND status IN ('submitted', 'acknowledged', 'in_progress', 'escalated')
            ORDER BY priority DESC, claim_date ASC
        `, {
            replacements: { supplierId, companyId },
            type: sequelize.QueryTypes.SELECT
        });

        const hasPendingClaims = pendingClaims && pendingClaims.length > 0;

        res.json({
            success: true,
            data: {
                supplier_id: supplierId,
                supplier_name: supplier.name,
                has_pending_claims: hasPendingClaims,
                pending_claims_count: pendingClaims ? pendingClaims.length : 0,
                claims: pendingClaims || [],
                payment_blocked: hasPendingClaims,
                warning_message: hasPendingClaims
                    ? `El proveedor tiene ${pendingClaims.length} reclamo(s) pendiente(s). No se podrán crear órdenes de pago hasta resolver los reclamos.`
                    : 'No hay reclamos pendientes. El proveedor está habilitado para pagos.'
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error verificando reclamos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/procurement/suppliers/:id
 * Actualizar proveedor
 */
router.put('/suppliers/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const supplier = await sequelize.models.ProcurementSupplier.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!supplier) {
            return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
        }

        await supplier.update(req.body);
        res.json({ success: true, data: supplier });
    } catch (error) {
        console.error('❌ [Procurement] Error actualizando proveedor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/suppliers/:id/enable-portal
 * Habilitar acceso al portal de proveedores
 * Crea usuario de portal, genera contraseña temporal y envía email de bienvenida
 */
router.post('/suppliers/:id/enable-portal', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const bcrypt = require('bcrypt');
        const crypto = require('crypto');
        const supplierId = req.params.id;
        const companyId = req.user.company_id;

        // 1. Obtener proveedor
        const supplier = await sequelize.models.ProcurementSupplier.findOne({
            where: { id: supplierId, company_id: companyId }
        });

        if (!supplier) {
            return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
        }

        if (!supplier.email) {
            return res.status(400).json({
                success: false,
                error: 'El proveedor debe tener un email configurado para habilitar el portal'
            });
        }

        // 2. Verificar si ya existe usuario de portal para este proveedor
        const existingUser = await sequelize.query(
            `SELECT id FROM supplier_portal_users WHERE supplier_id = :supplierId AND is_active = true`,
            { replacements: { supplierId }, type: sequelize.QueryTypes.SELECT }
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Este proveedor ya tiene un usuario de portal activo'
            });
        }

        // 3. Generar contraseña temporal
        const tempPassword = crypto.randomBytes(6).toString('hex'); // 12 caracteres
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        // 4. Crear usuario de portal
        const [result] = await sequelize.query(`
            INSERT INTO supplier_portal_users
            (supplier_id, email, password_hash, role, first_name, last_name, is_active,
             email_verified, must_change_password, created_at, updated_at)
            VALUES
            (:supplierId, :email, :passwordHash, 'admin', :firstName, :lastName, true,
             false, true, NOW(), NOW())
            RETURNING id
        `, {
            replacements: {
                supplierId,
                email: supplier.email,
                passwordHash,
                firstName: supplier.contact_name?.split(' ')[0] || 'Usuario',
                lastName: supplier.contact_name?.split(' ').slice(1).join(' ') || 'Proveedor'
            },
            type: sequelize.QueryTypes.INSERT
        });

        // 5. Actualizar proveedor con portal_enabled
        await supplier.update({
            portal_enabled: true,
            portal_activated_at: new Date()
        });

        // 6. Obtener datos de la empresa para el email
        const company = await sequelize.query(
            `SELECT name, slug FROM companies WHERE company_id = :companyId`,
            { replacements: { companyId }, type: sequelize.QueryTypes.SELECT }
        );

        // 7. Enviar email de bienvenida (usando SupplierEmailService)
        try {
            const SupplierEmailService = require('../services/SupplierEmailService');
            const emailService = new SupplierEmailService(sequelize);

            await emailService.sendWelcomeEmail({
                supplier: {
                    id: supplierId,
                    name: supplier.name,
                    email: supplier.email,
                    contact_name: supplier.contact_name
                },
                company: company[0] || { name: 'APONNT' },
                credentials: {
                    email: supplier.email,
                    password: tempPassword,
                    portalUrl: 'https://www.aponnt.com/panel-proveedores.html'
                }
            });
        } catch (emailError) {
            console.error('⚠️ [Procurement] Error enviando email de bienvenida:', emailError.message);
            // No fallamos la operación por el email
        }

        // 8. Respuesta exitosa
        res.json({
            success: true,
            data: {
                supplier_id: supplierId,
                portal_user_email: supplier.email,
                portal_enabled: true,
                message: 'Portal habilitado correctamente. Se enviaron las credenciales al email del proveedor.'
            }
        });

    } catch (error) {
        console.error('❌ [Procurement] Error habilitando portal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/suppliers/:id/disable-portal
 * Deshabilitar acceso al portal de proveedores
 */
router.post('/suppliers/:id/disable-portal', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const supplierId = req.params.id;
        const companyId = req.user.company_id;

        // 1. Obtener proveedor
        const supplier = await sequelize.models.ProcurementSupplier.findOne({
            where: { id: supplierId, company_id: companyId }
        });

        if (!supplier) {
            return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
        }

        // 2. Desactivar usuario de portal
        await sequelize.query(
            `UPDATE supplier_portal_users SET is_active = false, updated_at = NOW()
             WHERE supplier_id = :supplierId`,
            { replacements: { supplierId } }
        );

        // 3. Deshabilitar portal en proveedor
        await supplier.update({
            portal_enabled: false
        });

        res.json({
            success: true,
            data: {
                supplier_id: supplierId,
                portal_enabled: false,
                message: 'Acceso al portal deshabilitado'
            }
        });

    } catch (error) {
        console.error('❌ [Procurement] Error deshabilitando portal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/suppliers/:id/reset-portal-password
 * Resetear contraseña del portal de proveedor
 */
router.post('/suppliers/:id/reset-portal-password', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const bcrypt = require('bcrypt');
        const crypto = require('crypto');
        const supplierId = req.params.id;
        const companyId = req.user.company_id;

        // 1. Obtener proveedor
        const supplier = await sequelize.models.ProcurementSupplier.findOne({
            where: { id: supplierId, company_id: companyId }
        });

        if (!supplier) {
            return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
        }

        // 2. Verificar que tiene usuario de portal
        const portalUser = await sequelize.query(
            `SELECT id, email FROM supplier_portal_users WHERE supplier_id = :supplierId AND is_active = true`,
            { replacements: { supplierId }, type: sequelize.QueryTypes.SELECT }
        );

        if (portalUser.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Este proveedor no tiene usuario de portal activo'
            });
        }

        // 3. Generar nueva contraseña temporal
        const tempPassword = crypto.randomBytes(6).toString('hex');
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        // 4. Actualizar contraseña
        await sequelize.query(
            `UPDATE supplier_portal_users
             SET password_hash = :passwordHash, must_change_password = true, updated_at = NOW()
             WHERE id = :userId`,
            { replacements: { passwordHash, userId: portalUser[0].id } }
        );

        // 5. Enviar email con nueva contraseña
        try {
            const SupplierEmailService = require('../services/SupplierEmailService');
            const emailService = new SupplierEmailService(sequelize);

            await emailService.sendPasswordResetEmail({
                supplier: {
                    id: supplierId,
                    name: supplier.name,
                    email: supplier.email,
                    contact_name: supplier.contact_name
                },
                credentials: {
                    email: portalUser[0].email,
                    password: tempPassword,
                    portalUrl: 'https://www.aponnt.com/panel-proveedores.html'
                }
            });
        } catch (emailError) {
            console.error('⚠️ [Procurement] Error enviando email de reset:', emailError.message);
        }

        res.json({
            success: true,
            data: {
                supplier_id: supplierId,
                message: 'Contraseña reseteada. Se enviaron las nuevas credenciales al email del proveedor.'
            }
        });

    } catch (error) {
        console.error('❌ [Procurement] Error reseteando contraseña:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/suppliers/:id/history
 * Historial de compras del proveedor
 */
router.get('/suppliers/:id/history', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const supplierId = req.params.id;
        const companyId = req.user.company_id;

        const [stats] = await sequelize.query(`
            SELECT
                COUNT(po.id) as total_orders,
                SUM(po.total_amount) as total_purchased,
                AVG(po.total_amount) as avg_order_value,
                MIN(po.order_date) as first_order,
                MAX(po.order_date) as last_order,
                COUNT(DISTINCT EXTRACT(YEAR FROM po.order_date)) as years_active
            FROM procurement_orders po
            WHERE po.company_id = :companyId
              AND po.supplier_id = :supplierId
              AND po.status NOT IN ('cancelled', 'draft')
        `, {
            replacements: { companyId, supplierId },
            type: sequelize.QueryTypes.SELECT
        });

        const recentOrders = await sequelize.models.ProcurementOrder.findAll({
            where: {
                company_id: companyId,
                supplier_id: supplierId,
                status: { [sequelize.Sequelize.Op.notIn]: ['cancelled', 'draft'] }
            },
            order: [['order_date', 'DESC']],
            limit: 10
        });

        res.json({
            success: true,
            data: {
                stats: stats || {},
                recentOrders
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo historial:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// MAPEO DE ARTÍCULOS PROVEEDOR
// ============================================

/**
 * POST /api/procurement/item-mappings
 * Crear mapeo de artículo
 */
router.post('/item-mappings', async (req, res) => {
    try {
        const { mapping, created } = await req.itemMappingService.upsertMapping({
            ...req.body,
            companyId: req.user.company_id
        });
        res.status(created ? 201 : 200).json({ success: true, data: mapping, created });
    } catch (error) {
        console.error('❌ [Procurement] Error creando mapeo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/item-mappings
 * Listar mapeos de un proveedor
 */
router.get('/item-mappings', async (req, res) => {
    try {
        const { supplierId, search, page = 1, limit = 50 } = req.query;

        if (!supplierId) {
            return res.status(400).json({ success: false, error: 'supplierId requerido' });
        }

        const result = await req.itemMappingService.listBySupplier(
            req.user.company_id,
            parseInt(supplierId),
            { page: parseInt(page), limit: parseInt(limit), search }
        );
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('❌ [Procurement] Error listando mapeos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/item-mappings/resolve
 * Resolver código de proveedor a producto interno
 */
router.post('/item-mappings/resolve', async (req, res) => {
    try {
        const { supplierId, supplierCode, supplierDescription } = req.body;

        const result = await req.itemMappingService.resolveSupplierCode(
            req.user.company_id,
            supplierId,
            supplierCode,
            supplierDescription
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ [Procurement] Error resolviendo código:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/item-mappings/bulk-import
 * Importar mapeos masivamente
 */
router.post('/item-mappings/bulk-import', async (req, res) => {
    try {
        const { supplierId, items } = req.body;

        const result = await req.itemMappingService.bulkImport(
            req.user.company_id,
            supplierId,
            items
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ [Procurement] Error en importación:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/item-mappings/stats
 * Estadísticas de mapeos
 */
router.get('/item-mappings/stats', async (req, res) => {
    try {
        const stats = await req.itemMappingService.getStats(req.user.company_id);
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/item-mappings/unmapped/:supplierId
 * Artículos comprados sin mapear
 */
router.get('/item-mappings/unmapped/:supplierId', async (req, res) => {
    try {
        const items = await req.itemMappingService.getUnmappedItems(
            req.user.company_id,
            parseInt(req.params.supplierId)
        );
        res.json({ success: true, data: items });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo sin mapear:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/procurement/item-mappings/:id
 * Desactivar mapeo
 */
router.delete('/item-mappings/:id', async (req, res) => {
    try {
        const result = await req.itemMappingService.deactivateMapping(parseInt(req.params.id));
        res.json({ success: result, message: result ? 'Mapeo desactivado' : 'No se pudo desactivar' });
    } catch (error) {
        console.error('❌ [Procurement] Error desactivando mapeo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// CATEGORÍAS
// ============================================

/**
 * GET /api/procurement/categories
 * Listar categorías de compra
 */
router.get('/categories', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const categories = await sequelize.models.ProcurementCategory.findAll({
            where: { company_id: req.user.company_id, is_active: true },
            order: [['name', 'ASC']]
        });
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('❌ [Procurement] Error listando categorías:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/categories
 * Crear categoría
 */
router.post('/categories', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const category = await sequelize.models.ProcurementCategory.create({
            ...req.body,
            company_id: req.user.company_id
        });
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        console.error('❌ [Procurement] Error creando categoría:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// SECTORES
// ============================================

/**
 * GET /api/procurement/sectors
 * Listar sectores organizacionales
 */
router.get('/sectors', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const sectors = await sequelize.models.ProcurementSector.findAll({
            where: { company_id: req.user.company_id, is_active: true },
            order: [['name', 'ASC']]
        });
        res.json({ success: true, data: sectors });
    } catch (error) {
        console.error('❌ [Procurement] Error listando sectores:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/sectors
 * Crear sector
 */
router.post('/sectors', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const sector = await sequelize.models.ProcurementSector.create({
            ...req.body,
            company_id: req.user.company_id
        });
        res.status(201).json({ success: true, data: sector });
    } catch (error) {
        console.error('❌ [Procurement] Error creando sector:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// CONFIGURACIÓN DE APROBACIONES
// ============================================

/**
 * GET /api/procurement/approval-config
 * Obtener configuración de aprobaciones
 */
router.get('/approval-config', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const configs = await sequelize.models.ProcurementApprovalConfig.findAll({
            where: { company_id: req.user.company_id, is_active: true },
            order: [['document_type', 'ASC'], ['approval_level', 'ASC']]
        });
        res.json({ success: true, data: configs });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo config aprobaciones:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/approval-config
 * Guardar configuración de aprobación
 */
router.post('/approval-config', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const [config, created] = await sequelize.models.ProcurementApprovalConfig.findOrCreate({
            where: {
                company_id: req.user.company_id,
                document_type: req.body.document_type,
                approval_level: req.body.approval_level
            },
            defaults: { ...req.body, company_id: req.user.company_id }
        });

        if (!created) {
            await config.update(req.body);
        }

        res.json({ success: true, data: config, created });
    } catch (error) {
        console.error('❌ [Procurement] Error guardando config aprobaciones:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// CONFIGURACIÓN CONTABLE
// ============================================

/**
 * GET /api/procurement/accounting-config
 * Obtener configuración contable
 */
router.get('/accounting-config', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const configs = await sequelize.models.ProcurementAccountingConfig.findAll({
            where: { company_id: req.user.company_id, is_active: true },
            order: [['purchase_type', 'ASC']]
        });
        res.json({ success: true, data: configs });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo config contable:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/accounting-config
 * Guardar configuración contable
 */
router.post('/accounting-config', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const [config, created] = await sequelize.models.ProcurementAccountingConfig.findOrCreate({
            where: {
                company_id: req.user.company_id,
                purchase_type: req.body.purchase_type,
                category_id: req.body.category_id || null
            },
            defaults: { ...req.body, company_id: req.user.company_id }
        });

        if (!created) {
            await config.update(req.body);
        }

        res.json({ success: true, data: config, created });
    } catch (error) {
        console.error('❌ [Procurement] Error guardando config contable:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// INTEGRACIÓN CON FINANCE Y WAREHOUSE
// ============================================

/**
 * GET /api/procurement/finance/cost-centers
 * Obtener centros de costo disponibles
 */
router.get('/finance/cost-centers', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');

        // Verificar si existe el modelo Finance
        if (!sequelize.models.FinanceCostCenter) {
            return res.json({ success: true, data: [], message: 'Módulo Finance no disponible' });
        }

        const costCenters = await sequelize.models.FinanceCostCenter.findAll({
            where: { company_id: req.user.company_id, is_active: true, allows_posting: true },
            order: [['code', 'ASC']]
        });
        res.json({ success: true, data: costCenters });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo centros de costo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/finance/accounts
 * Obtener cuentas contables disponibles
 */
router.get('/finance/accounts', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');

        if (!sequelize.models.FinanceChartOfAccounts) {
            return res.json({ success: true, data: [], message: 'Módulo Finance no disponible' });
        }

        const accounts = await sequelize.models.FinanceChartOfAccounts.findAll({
            where: {
                company_id: req.user.company_id,
                is_active: true,
                blocked_for_posting: false,
                is_header: false
            },
            order: [['account_code', 'ASC']]
        });
        res.json({ success: true, data: accounts });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo cuentas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/warehouse/list
 * Obtener depósitos disponibles
 */
router.get('/warehouse/list', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');

        if (!sequelize.models.WmsWarehouse) {
            return res.json({ success: true, data: [], message: 'Módulo WMS no disponible' });
        }

        const warehouses = await sequelize.models.WmsWarehouse.findAll({
            where: { company_id: req.user.company_id, is_active: true },
            order: [['name', 'ASC']]
        });
        res.json({ success: true, data: warehouses });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo depósitos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/warehouse/products
 * Buscar productos en el catálogo WMS
 */
router.get('/warehouse/products', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { search, categoryId, page = 1, limit = 50 } = req.query;

        if (!sequelize.models.WmsProduct) {
            return res.json({ success: true, data: [], message: 'Módulo WMS no disponible' });
        }

        const where = { company_id: req.user.company_id, is_active: true };
        if (categoryId) where.category_id = categoryId;
        if (search) {
            where[sequelize.Sequelize.Op.or] = [
                { name: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
                { sku: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
                { barcode: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } }
            ];
        }

        const { count, rows } = await sequelize.models.WmsProduct.findAndCountAll({
            where,
            order: [['name', 'ASC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error buscando productos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// REPORTES
// ============================================

/**
 * GET /api/procurement/reports/by-supplier
 * Reporte de compras por proveedor
 */
router.get('/reports/by-supplier', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { startDate, endDate } = req.query;

        const [report] = await sequelize.query(`
            SELECT
                ps.id as supplier_id,
                ps.name as trade_name,
                ps.legal_name,
                COUNT(po.id) as total_orders,
                SUM(po.total_amount) as total_amount,
                AVG(po.total_amount) as avg_order_value,
                ps.rating_score as overall_score
            FROM wms_suppliers ps
            LEFT JOIN procurement_orders po ON po.supplier_id = ps.id
                AND po.company_id = :companyId
                AND po.status NOT IN ('cancelled', 'draft')
                ${startDate ? "AND po.order_date >= :startDate" : ""}
                ${endDate ? "AND po.order_date <= :endDate" : ""}
            WHERE ps.company_id = :companyId
            GROUP BY ps.id
            ORDER BY total_amount DESC NULLS LAST
        `, {
            replacements: { companyId: req.user.company_id, startDate, endDate },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: report });
    } catch (error) {
        console.error('❌ [Procurement] Error en reporte:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/reports/by-category
 * Reporte de compras por categoría
 */
router.get('/reports/by-category', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { startDate, endDate } = req.query;

        const [report] = await sequelize.query(`
            SELECT
                pc.id as category_id,
                pc.name as category_name,
                COUNT(DISTINCT po.id) as total_orders,
                SUM(poi.total_price) as total_amount,
                COUNT(DISTINCT po.supplier_id) as suppliers_count
            FROM procurement_categories pc
            LEFT JOIN procurement_order_items poi ON poi.category_id = pc.id
            LEFT JOIN procurement_orders po ON poi.order_id = po.id
                AND po.company_id = :companyId
                AND po.status NOT IN ('cancelled', 'draft')
                ${startDate ? "AND po.order_date >= :startDate" : ""}
                ${endDate ? "AND po.order_date <= :endDate" : ""}
            WHERE pc.company_id = :companyId
            GROUP BY pc.id
            ORDER BY total_amount DESC NULLS LAST
        `, {
            replacements: { companyId: req.user.company_id, startDate, endDate },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: report });
    } catch (error) {
        console.error('❌ [Procurement] Error en reporte:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/reports/pending-deliveries
 * Reporte de entregas pendientes
 */
router.get('/reports/pending-deliveries', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');

        const orders = await sequelize.models.ProcurementOrder.findAll({
            where: {
                company_id: req.user.company_id,
                status: { [sequelize.Sequelize.Op.in]: ['approved', 'sent', 'acknowledged'] },
                pending_delivery_qty: { [sequelize.Sequelize.Op.gt]: 0 }
            },
            include: [
                { model: sequelize.models.ProcurementSupplier, as: 'supplier', attributes: ['id', 'name'] },
                { model: sequelize.models.ProcurementOrderItem, as: 'items' }
            ],
            order: [['expected_delivery_date', 'ASC']]
        });

        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('❌ [Procurement] Error en reporte:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// FISCAL STRATEGY API
// ============================================

/**
 * GET /api/procurement/fiscal/countries
 * Obtener países fiscales soportados con su estado
 */
router.get('/fiscal/countries', async (req, res) => {
    try {
        const countries = req.p2pService.fiscalFactory.getSupportedCountries();
        res.json({ success: true, data: countries });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/fiscal/calculate-tax
 * Calcular impuesto de compra (IVA/tax) según sucursal
 */
router.post('/fiscal/calculate-tax', async (req, res) => {
    try {
        const { subtotal, branchId, countryCode, taxConditionBuyer, taxConditionSeller, purchaseType } = req.body;
        // Resolver strategy: countryCode directo o via branchId
        let strategy;
        if (countryCode) {
            strategy = await req.p2pService.fiscalFactory.getStrategyForCountry(countryCode);
        } else {
            strategy = await req.p2pService.getFiscalStrategy(branchId || null);
        }
        const result = strategy.calculatePurchaseTax({
            subtotal: parseFloat(subtotal) || 0,
            taxConditionBuyer: taxConditionBuyer || 'RI',
            taxConditionSeller: taxConditionSeller || 'RI',
            purchaseType: purchaseType || 'goods'
        });
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/fiscal/calculate-retentions
 * Calcular retenciones según régimen fiscal del proveedor y sucursal
 */
router.post('/fiscal/calculate-retentions', async (req, res) => {
    try {
        const { amount, taxAmount, branchId, countryCode, purchaseType,
                supplierTaxCondition, buyerTaxCondition, province } = req.body;
        // Resolver strategy: countryCode directo o via branchId
        let strategy;
        if (countryCode) {
            strategy = await req.p2pService.fiscalFactory.getStrategyForCountry(countryCode);
        } else {
            strategy = await req.p2pService.getFiscalStrategy(branchId || null);
        }
        const result = strategy.calculateRetentions({
            amount: parseFloat(amount) || 0,
            taxAmount: parseFloat(taxAmount) || 0,
            purchaseType: purchaseType || 'goods',
            supplierTaxCondition: supplierTaxCondition || 'RI',
            buyerTaxCondition: buyerTaxCondition || 'RI',
            province: province || null
        });
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/fiscal/determine-invoice-type
 * Determinar tipo de factura según condiciones fiscales
 */
router.post('/fiscal/determine-invoice-type', async (req, res) => {
    try {
        const { branchId, countryCode, buyerCondition, sellerCondition, amount } = req.body;
        let strategy;
        if (countryCode) {
            strategy = await req.p2pService.fiscalFactory.getStrategyForCountry(countryCode);
        } else {
            strategy = await req.p2pService.getFiscalStrategy(branchId || null);
        }
        const result = strategy.determineInvoiceType({
            buyerCondition: buyerCondition || 'RI',
            sellerCondition: sellerCondition || 'RI',
            amount: parseFloat(amount) || 0
        });
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/fiscal/validate-tax-id
 * Validar identificación tributaria del proveedor (CUIT/RUT/CNPJ/RFC/NIT)
 */
router.post('/fiscal/validate-tax-id', async (req, res) => {
    try {
        const { taxId, branchId, countryCode } = req.body;
        let strategy;
        if (countryCode) {
            strategy = await req.p2pService.fiscalFactory.getStrategyForCountry(countryCode);
        } else {
            strategy = await req.p2pService.getFiscalStrategy(branchId || null);
        }
        const result = strategy.validateTaxId(taxId);
        result.taxIdFieldName = strategy.getTaxIdFieldName();
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// COMPANY TAX CONFIG (Overrides fiscales por empresa)
// ============================================

const { CompanyTaxConfig, TaxTemplate, TaxConcept } = require('../models/siac/TaxTemplate');

/**
 * GET /api/procurement/company-tax-config
 * Obtener configuración fiscal de la empresa actual
 */
router.get('/company-tax-config', async (req, res) => {
    try {
        const companyId = req.user.company_id;

        // Intentar obtener config existente
        let config = await CompanyTaxConfig.findOne({
            where: { companyId, isActive: true },
            include: [{
                model: TaxTemplate,
                as: 'template',
                attributes: ['id', 'country_code', 'template_name', 'default_currency']
            }]
        });

        // Si no existe, crear una por defecto con template AR
        if (!config) {
            const arTemplate = await TaxTemplate.findOne({ where: { countryCode: 'AR', isActive: true } });
            if (arTemplate) {
                config = await CompanyTaxConfig.create({
                    companyId,
                    taxTemplateId: arTemplate.id,
                    conceptOverrides: {},
                    isActive: true
                });
                config = await CompanyTaxConfig.findByPk(config.id, {
                    include: [{ model: TaxTemplate, as: 'template' }]
                });
            }
        }

        // Obtener conceptos del template para mostrar opciones de override
        const concepts = config?.taxTemplateId
            ? await TaxConcept.findAll({
                where: { taxTemplateId: config.taxTemplateId, isActive: true },
                attributes: ['id', 'concept_code', 'concept_name'],
                order: [['calculation_order', 'ASC']]
            })
            : [];

        res.json({
            success: true,
            data: {
                config: config ? {
                    id: config.id,
                    companyId: config.companyId,
                    taxTemplateId: config.taxTemplateId,
                    templateName: config.template?.templateName || config.template?.template_name,
                    countryCode: config.template?.countryCode || config.template?.country_code,
                    customTaxId: config.customTaxId,
                    customConditionCode: config.customConditionCode,
                    conceptOverrides: config.conceptOverrides || {},
                    puntoVenta: config.puntoVenta,
                    descuentoMaximo: config.descuentoMaximo,
                    recargoMaximo: config.recargoMaximo
                } : null,
                concepts: concepts.map(c => ({
                    id: c.id,
                    code: c.concept_code,
                    name: c.concept_name
                }))
            }
        });
    } catch (error) {
        console.error('[CompanyTaxConfig] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/procurement/company-tax-config
 * Actualizar configuración fiscal de la empresa
 */
router.put('/company-tax-config', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { customTaxId, customConditionCode, conceptOverrides, puntoVenta, descuentoMaximo, recargoMaximo } = req.body;

        let config = await CompanyTaxConfig.findOne({ where: { companyId, isActive: true } });

        if (!config) {
            // Crear nueva config
            const arTemplate = await TaxTemplate.findOne({ where: { countryCode: 'AR', isActive: true } });
            config = await CompanyTaxConfig.create({
                companyId,
                taxTemplateId: arTemplate?.id || 1,
                customTaxId,
                customConditionCode,
                conceptOverrides: conceptOverrides || {},
                puntoVenta: puntoVenta || 1,
                descuentoMaximo: descuentoMaximo || 0,
                recargoMaximo: recargoMaximo || 0,
                isActive: true
            });
        } else {
            // Actualizar existente
            await config.update({
                customTaxId: customTaxId !== undefined ? customTaxId : config.customTaxId,
                customConditionCode: customConditionCode !== undefined ? customConditionCode : config.customConditionCode,
                conceptOverrides: conceptOverrides !== undefined ? conceptOverrides : config.conceptOverrides,
                puntoVenta: puntoVenta !== undefined ? puntoVenta : config.puntoVenta,
                descuentoMaximo: descuentoMaximo !== undefined ? descuentoMaximo : config.descuentoMaximo,
                recargoMaximo: recargoMaximo !== undefined ? recargoMaximo : config.recargoMaximo
            });
        }

        res.json({ success: true, data: config, message: 'Configuración fiscal actualizada' });
    } catch (error) {
        console.error('[CompanyTaxConfig] Error updating:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/company-tax-config/override
 * Agregar/actualizar un override de concepto específico
 */
router.post('/company-tax-config/override', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { conceptCode, percentage } = req.body;

        if (!conceptCode || percentage === undefined) {
            return res.status(400).json({ success: false, error: 'conceptCode y percentage son requeridos' });
        }

        let config = await CompanyTaxConfig.findOne({ where: { companyId, isActive: true } });

        if (!config) {
            const arTemplate = await TaxTemplate.findOne({ where: { countryCode: 'AR', isActive: true } });
            config = await CompanyTaxConfig.create({
                companyId,
                taxTemplateId: arTemplate?.id || 1,
                conceptOverrides: { [conceptCode]: parseFloat(percentage) },
                isActive: true
            });
        } else {
            // Copiar objeto para forzar que Sequelize detecte el cambio (JSONB requiere nuevo objeto)
            const overrides = { ...(config.conceptOverrides || {}) };
            overrides[conceptCode] = parseFloat(percentage);
            config.conceptOverrides = overrides;
            config.changed('conceptOverrides', true); // Forzar cambio para JSONB
            await config.save();
        }

        res.json({
            success: true,
            data: { conceptCode, percentage: parseFloat(percentage) },
            message: `Override para ${conceptCode} guardado: ${percentage}%`
        });
    } catch (error) {
        console.error('[CompanyTaxConfig] Error adding override:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/procurement/company-tax-config/override/:conceptCode
 * Eliminar un override de concepto
 */
router.delete('/company-tax-config/override/:conceptCode', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { conceptCode } = req.params;

        const config = await CompanyTaxConfig.findOne({ where: { companyId, isActive: true } });

        if (!config) {
            return res.status(404).json({ success: false, error: 'No hay configuración fiscal para esta empresa' });
        }

        const overrides = { ...(config.conceptOverrides || {}) };
        if (conceptCode in overrides) {
            delete overrides[conceptCode];
            config.conceptOverrides = overrides;
            config.changed('conceptOverrides', true);
            await config.save();
        }

        res.json({
            success: true,
            message: `Override para ${conceptCode} eliminado`
        });
    } catch (error) {
        console.error('[CompanyTaxConfig] Error deleting override:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
