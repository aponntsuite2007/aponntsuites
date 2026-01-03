/**
 * ProcurementService - Servicio de Orquestación del Ciclo P2P Completo
 * Gestión integral de Compras: Solicitud → Cotización → Orden → Recepción → Factura → Pago
 *
 * Features:
 * - Selección inteligente de proveedores basada en historial
 * - Workflow de aprobación configurable por empresa
 * - Integración con Finance (plan de cuentas, centros de costo)
 * - Integración con Warehouse (stock, depósitos)
 * - Three-way matching para facturas
 */

const { Op, QueryTypes } = require('sequelize');

class ProcurementService {
    constructor(db) {
        this.db = db;
        this.sequelize = db.sequelize;

        // Modelos
        this.Requisition = db.ProcurementRequisition;
        this.RequisitionItem = db.ProcurementRequisitionItem;
        this.Supplier = db.ProcurementSupplier;
        this.Order = db.ProcurementOrder;
        this.OrderItem = db.ProcurementOrderItem;
        this.Receipt = db.ProcurementReceipt;
        this.ReceiptItem = db.ProcurementReceiptItem;
        this.Invoice = db.ProcurementInvoice;
        this.Rfq = db.ProcurementRfq;
        this.RfqItem = db.ProcurementRfqItem;
        this.RfqSupplier = db.ProcurementRfqSupplier;
        this.RfqQuote = db.ProcurementRfqQuote;

        // Nuevos modelos P2P Complete
        this.Sector = db.ProcurementSector;
        this.SupplierItemMapping = db.ProcurementSupplierItemMapping;
        this.InternalReceipt = db.ProcurementInternalReceipt;
        this.InternalReceiptItem = db.ProcurementInternalReceiptItem;
        this.ApprovalConfig = db.ProcurementApprovalConfig;
        this.AccountingConfig = db.ProcurementAccountingConfig;
    }

    // ============================================================================
    // REQUISICIONES (Solicitudes de Compra)
    // ============================================================================

    /**
     * Crear nueva solicitud de compra
     */
    async createRequisition(companyId, data, userId) {
        const transaction = await this.sequelize.transaction();

        try {
            // Generar número de requisición
            const requisitionNumber = await this.generateRequisitionNumber(companyId);

            // Crear requisición
            const requisition = await this.Requisition.create({
                company_id: companyId,
                requisition_number: requisitionNumber,
                title: data.title,
                description: data.description,
                requester_id: userId,
                requester_department_id: data.department_id,
                requester_name: data.requester_name,
                requester_email: data.requester_email,
                priority: data.priority || 'medium',
                required_date: data.required_date,
                justification: data.justification,
                branch_id: data.branch_id,
                sector_id: data.sector_id,
                finance_cost_center_id: data.cost_center_id,
                finance_account_id: data.account_id,
                delivery_warehouse_id: data.warehouse_id,
                cost_center: data.cost_center_code,
                budget_code: data.budget_code,
                project_code: data.project_code,
                observations: data.observations,
                urgency_reason: data.urgency_reason,
                tags: data.tags || [],
                currency: data.currency || 'ARS',
                status: 'draft'
            }, { transaction });

            // Crear items
            let totalEstimated = 0;
            if (data.items && data.items.length > 0) {
                for (let i = 0; i < data.items.length; i++) {
                    const item = data.items[i];
                    const itemTotal = (item.quantity || 0) * (item.estimated_price || 0);
                    totalEstimated += itemTotal;

                    await this.RequisitionItem.create({
                        requisition_id: requisition.id,
                        line_number: i + 1,
                        item_id: item.item_id,
                        description: item.description,
                        quantity: item.quantity,
                        unit_of_measure: item.unit_of_measure || 'UN',
                        estimated_unit_price: item.estimated_price,
                        total_price: itemTotal,
                        specifications: item.specifications,
                        suggested_supplier_id: item.suggested_supplier_id,
                        internal_item_type: item.internal_item_type,
                        internal_item_id: item.internal_item_id,
                        delivery_warehouse_id: item.warehouse_id
                    }, { transaction });
                }
            }

            // Actualizar totales
            await requisition.update({
                estimated_total: totalEstimated,
                item_count: data.items?.length || 0
            }, { transaction });

            // Calcular pasos de aprobación
            const approvalSteps = await this.getApprovalSteps(companyId, 'requisition', totalEstimated);
            await requisition.update({
                max_approval_steps: approvalSteps.length,
                current_approval_step: 1
            }, { transaction });

            // Agregar al audit trail
            const auditTrail = [{
                action: 'created',
                user_id: userId,
                timestamp: new Date().toISOString(),
                details: { items_count: data.items?.length || 0, estimated_total: totalEstimated }
            }];
            await requisition.update({ audit_trail: auditTrail }, { transaction });

            await transaction.commit();

            return {
                success: true,
                requisition: await this.getRequisitionById(companyId, requisition.id)
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Enviar requisición para aprobación
     */
    async submitRequisition(companyId, requisitionId, userId) {
        const requisition = await this.Requisition.findOne({
            where: { id: requisitionId, company_id: companyId }
        });

        if (!requisition) throw new Error('Requisición no encontrada');
        if (requisition.status !== 'draft') throw new Error('Solo requisiciones en borrador pueden enviarse');

        // Validar que tenga items
        const itemCount = await this.RequisitionItem.count({ where: { requisition_id: requisitionId } });
        if (itemCount === 0) throw new Error('La requisición debe tener al menos un item');

        // Verificar disponibilidad presupuestaria si está configurado
        if (requisition.finance_cost_center_id && requisition.finance_account_id) {
            const budgetCheck = await this.checkBudgetAvailability(
                companyId,
                requisition.finance_cost_center_id,
                requisition.finance_account_id,
                parseFloat(requisition.estimated_total)
            );

            if (!budgetCheck.has_budget) {
                return {
                    success: false,
                    error: 'budget_exceeded',
                    message: `Presupuesto insuficiente. Disponible: ${budgetCheck.available_amount}, Requerido: ${requisition.estimated_total}`,
                    budget_info: budgetCheck
                };
            }
        }

        // Actualizar estado
        requisition.status = 'pending_approval';
        requisition.audit_trail = [
            ...(requisition.audit_trail || []),
            { action: 'submitted', user_id: userId, timestamp: new Date().toISOString() }
        ];
        await requisition.save();

        // Enviar notificación a aprobadores
        try {
            await this.notifyApprovers(companyId, 'requisition', requisition);
        } catch (notifError) {
            console.warn('[Procurement] Error enviando notificación a aprobadores:', notifError.message);
        }

        return { success: true, requisition };
    }

    /**
     * Aprobar requisición
     */
    async approveRequisition(companyId, requisitionId, userId, userName, comments = '') {
        const requisition = await this.Requisition.findOne({
            where: { id: requisitionId, company_id: companyId }
        });

        if (!requisition) throw new Error('Requisición no encontrada');
        if (requisition.status !== 'pending_approval') throw new Error('Requisición no está pendiente de aprobación');

        // Verificar que el usuario puede aprobar
        const canApprove = await this.canUserApprove(
            companyId,
            'requisition',
            parseFloat(requisition.estimated_total),
            userId
        );

        if (!canApprove.canApprove) {
            throw new Error('No tiene permisos para aprobar esta requisición');
        }

        // Aprobar
        await requisition.approve(userId, userName, comments);

        return { success: true, requisition };
    }

    /**
     * Rechazar requisición
     */
    async rejectRequisition(companyId, requisitionId, userId, userName, reason) {
        const requisition = await this.Requisition.findOne({
            where: { id: requisitionId, company_id: companyId }
        });

        if (!requisition) throw new Error('Requisición no encontrada');
        if (requisition.status !== 'pending_approval') throw new Error('Requisición no está pendiente de aprobación');

        await requisition.reject(userId, userName, reason);

        return { success: true, requisition };
    }

    /**
     * Obtener requisición por ID con items
     */
    async getRequisitionById(companyId, requisitionId) {
        const requisition = await this.Requisition.findOne({
            where: { id: requisitionId, company_id: companyId }
        });

        if (!requisition) return null;

        const items = await this.RequisitionItem.findAll({
            where: { requisition_id: requisitionId },
            order: [['line_number', 'ASC']]
        });

        return {
            ...requisition.toJSON(),
            items: items.map(i => i.toJSON())
        };
    }

    /**
     * Listar requisiciones con filtros
     */
    async listRequisitions(companyId, filters = {}) {
        const where = { company_id: companyId };

        if (filters.status) {
            where.status = Array.isArray(filters.status) ? { [Op.in]: filters.status } : filters.status;
        }
        if (filters.requester_id) where.requester_id = filters.requester_id;
        if (filters.branch_id) where.branch_id = filters.branch_id;
        if (filters.sector_id) where.sector_id = filters.sector_id;
        if (filters.priority) where.priority = filters.priority;
        if (filters.from_date && filters.to_date) {
            where.created_at = { [Op.between]: [filters.from_date, filters.to_date] };
        }

        const { rows, count } = await this.Requisition.findAndCountAll({
            where,
            order: [[filters.sort_by || 'created_at', filters.sort_order || 'DESC']],
            limit: filters.limit || 50,
            offset: filters.offset || 0
        });

        return { requisitions: rows, total: count };
    }

    // ============================================================================
    // SELECCIÓN INTELIGENTE DE PROVEEDORES
    // ============================================================================

    /**
     * Obtener proveedores sugeridos para un artículo
     */
    async getSuggestedSuppliers(companyId, itemType, itemId, criteria = 'balanced', limit = 5) {
        // Usar la función SQL si existe
        try {
            const results = await this.sequelize.query(
                `SELECT * FROM get_suggested_suppliers(:companyId, :itemType, :itemId, :limit)`,
                {
                    replacements: { companyId, itemType, itemId, limit },
                    type: QueryTypes.SELECT
                }
            );
            return results;
        } catch (error) {
            // Fallback: usar el modelo directamente
            if (this.SupplierItemMapping) {
                return this.SupplierItemMapping.getSupplierRanking(companyId, itemType, itemId, criteria);
            }
            return [];
        }
    }

    /**
     * Obtener historial de compras de un proveedor
     */
    async getSupplierPurchaseHistory(companyId, supplierId, options = {}) {
        const where = { company_id: companyId, supplier_id: supplierId };

        if (options.from_date && options.to_date) {
            where.order_date = { [Op.between]: [options.from_date, options.to_date] };
        }

        const orders = await this.Order.findAll({
            where,
            order: [['order_date', 'DESC']],
            limit: options.limit || 100
        });

        // Calcular estadísticas
        let totalAmount = 0;
        let totalOrders = orders.length;
        let completedOrders = 0;
        let cancelledOrders = 0;

        orders.forEach(order => {
            totalAmount += parseFloat(order.total_amount) || 0;
            if (['received', 'closed_complete'].includes(order.status)) completedOrders++;
            if (order.status === 'cancelled') cancelledOrders++;
        });

        return {
            orders,
            stats: {
                total_orders: totalOrders,
                completed_orders: completedOrders,
                cancelled_orders: cancelledOrders,
                total_amount: totalAmount,
                completion_rate: totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(2) : 0
            }
        };
    }

    /**
     * Evaluar proveedor para una compra
     */
    async evaluateSupplierForPurchase(companyId, supplierId, items) {
        const supplier = await this.Supplier.findOne({
            where: { id: supplierId, company_id: companyId }
        });

        if (!supplier) throw new Error('Proveedor no encontrado');

        // Verificar estado
        if (supplier.status !== 'active') {
            return {
                approved: false,
                reason: `Proveedor no activo. Estado: ${supplier.status}`,
                supplier
            };
        }

        // Verificar onboarding
        if (supplier.onboarding_status !== 'approved') {
            return {
                approved: false,
                reason: `Proveedor no aprobado. Estado onboarding: ${supplier.onboarding_status}`,
                supplier
            };
        }

        // Verificar límite de crédito
        const orderTotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        if (supplier.credit_limit) {
            const creditUsed = parseFloat(supplier.credit_used) || 0;
            const creditLimit = parseFloat(supplier.credit_limit);
            const available = creditLimit - creditUsed;

            if (orderTotal > available) {
                return {
                    approved: false,
                    reason: `Excede límite de crédito. Disponible: ${available}, Requerido: ${orderTotal}`,
                    supplier,
                    credit_info: { limit: creditLimit, used: creditUsed, available, required: orderTotal }
                };
            }
        }

        // Buscar mapeo de items
        const itemMappings = [];
        for (const item of items) {
            if (item.internal_item_type && item.internal_item_id) {
                const mapping = await this.SupplierItemMapping?.findOne({
                    where: {
                        company_id: companyId,
                        supplier_id: supplierId,
                        internal_item_type: item.internal_item_type,
                        internal_item_id: item.internal_item_id,
                        is_active: true
                    }
                });

                itemMappings.push({
                    ...item,
                    mapping,
                    has_history: !!mapping,
                    last_price: mapping?.last_purchase_price,
                    quality_rating: mapping?.quality_rating
                });
            }
        }

        return {
            approved: true,
            supplier,
            item_mappings: itemMappings,
            scores: {
                overall: parseFloat(supplier.overall_score) || 0,
                quality: parseFloat(supplier.quality_score) || 0,
                delivery: parseFloat(supplier.delivery_score) || 0,
                price: parseFloat(supplier.price_score) || 0
            }
        };
    }

    // ============================================================================
    // ÓRDENES DE COMPRA
    // ============================================================================

    /**
     * Crear orden de compra desde requisición
     */
    async createOrderFromRequisition(companyId, requisitionId, supplierId, data, userId) {
        const transaction = await this.sequelize.transaction();

        try {
            const requisition = await this.Requisition.findOne({
                where: { id: requisitionId, company_id: companyId }
            });

            if (!requisition) throw new Error('Requisición no encontrada');
            if (requisition.status !== 'approved') throw new Error('Requisición debe estar aprobada');

            // Evaluar proveedor
            const items = await this.RequisitionItem.findAll({
                where: { requisition_id: requisitionId }
            });

            const evaluation = await this.evaluateSupplierForPurchase(
                companyId,
                supplierId,
                items.map(i => i.toJSON())
            );

            if (!evaluation.approved) {
                throw new Error(evaluation.reason);
            }

            // Generar número de orden
            const orderNumber = await this.generateOrderNumber(companyId);

            // Crear orden
            const order = await this.Order.create({
                company_id: companyId,
                order_number: orderNumber,
                requisition_id: requisitionId,
                supplier_id: supplierId,
                order_date: new Date(),
                expected_delivery_date: data.expected_delivery_date || requisition.required_date,
                branch_id: data.branch_id || requisition.branch_id,
                sector_id: data.sector_id || requisition.sector_id,
                finance_cost_center_id: data.cost_center_id || requisition.finance_cost_center_id,
                finance_account_id: data.account_id || requisition.finance_account_id,
                delivery_warehouse_id: data.warehouse_id || requisition.delivery_warehouse_id,
                delivery_address: data.delivery_address,
                delivery_instructions: data.delivery_instructions,
                payment_terms: data.payment_terms,
                payment_method: data.payment_method,
                payment_days: data.payment_days || 30,
                currency: data.currency || requisition.currency,
                tax_percent: data.tax_percent || 21,
                special_conditions: data.special_conditions,
                status: 'draft',
                created_by: userId
            }, { transaction });

            // Crear items de la orden
            let subtotal = 0;
            for (const item of items) {
                const orderItem = data.items?.find(i => i.requisition_item_id === item.id);
                const unitPrice = orderItem?.unit_price || item.estimated_unit_price || 0;
                const quantity = orderItem?.quantity || item.quantity;
                const itemTotal = quantity * unitPrice;
                subtotal += itemTotal;

                await this.OrderItem.create({
                    order_id: order.id,
                    requisition_item_id: item.id,
                    item_id: item.item_id,
                    description: item.description,
                    quantity: quantity,
                    unit_of_measure: item.unit_of_measure,
                    unit_price: unitPrice,
                    total_price: itemTotal,
                    supplier_item_code: orderItem?.supplier_item_code,
                    internal_item_type: item.internal_item_type,
                    internal_item_id: item.internal_item_id,
                    delivery_warehouse_id: item.delivery_warehouse_id,
                    promised_delivery_date: orderItem?.promised_delivery_date
                }, { transaction });
            }

            // Calcular totales
            const taxAmount = subtotal * (parseFloat(order.tax_percent) / 100);
            const totalAmount = subtotal + taxAmount;

            await order.update({
                subtotal,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                audit_trail: [{
                    action: 'created',
                    user_id: userId,
                    timestamp: new Date().toISOString(),
                    details: { from_requisition: requisitionId, supplier_id: supplierId }
                }]
            }, { transaction });

            // Actualizar requisición
            const orderIds = [...(requisition.order_ids || []), order.id];
            await requisition.update({
                order_ids: orderIds,
                status: 'in_purchase'
            }, { transaction });

            await transaction.commit();

            return {
                success: true,
                order: await this.getOrderById(companyId, order.id)
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Aprobar y enviar orden de compra
     */
    async approveAndSendOrder(companyId, orderId, userId, userName) {
        const order = await this.Order.findOne({
            where: { id: orderId, company_id: companyId }
        });

        if (!order) throw new Error('Orden no encontrada');
        if (!['draft', 'pending_approval'].includes(order.status)) {
            throw new Error('Orden no puede ser aprobada en este estado');
        }

        // Verificar permisos
        const canApprove = await this.canUserApprove(
            companyId,
            'order',
            parseFloat(order.total_amount),
            userId
        );

        if (!canApprove.canApprove) {
            throw new Error('No tiene permisos para aprobar esta orden');
        }

        // Aprobar
        await order.approve(userId, userName);

        // Enviar notificación al proveedor
        try {
            await this.notifySupplier(companyId, order);
        } catch (notifError) {
            console.warn('[Procurement] Error enviando notificación al proveedor:', notifError.message);
        }

        return { success: true, order };
    }

    /**
     * Obtener orden por ID
     */
    async getOrderById(companyId, orderId) {
        const order = await this.Order.findOne({
            where: { id: orderId, company_id: companyId }
        });

        if (!order) return null;

        const items = await this.OrderItem.findAll({
            where: { order_id: orderId },
            order: [['id', 'ASC']]
        });

        const supplier = await this.Supplier.findByPk(order.supplier_id);

        return {
            ...order.toJSON(),
            items: items.map(i => i.toJSON()),
            supplier: supplier?.toJSON()
        };
    }

    // ============================================================================
    // RECEPCIÓN DE MERCADERÍA
    // ============================================================================

    /**
     * Crear recepción de mercadería
     */
    async createReceipt(companyId, orderId, data, userId) {
        const transaction = await this.sequelize.transaction();

        try {
            const order = await this.Order.findOne({
                where: { id: orderId, company_id: companyId }
            });

            if (!order) throw new Error('Orden no encontrada');
            if (!['sent', 'acknowledged', 'partial_received'].includes(order.status)) {
                throw new Error('La orden no está en estado para recibir');
            }

            // Generar número de recepción
            const receiptNumber = await this.generateReceiptNumber(companyId);

            // Crear recepción
            const receipt = await this.Receipt.create({
                company_id: companyId,
                receipt_number: receiptNumber,
                order_id: orderId,
                receipt_date: data.receipt_date || new Date(),
                received_by: userId,
                received_by_name: data.received_by_name,
                document_type: data.document_type || 'delivery_note',
                delivery_note_number: data.delivery_note_number,
                delivery_note_date: data.delivery_note_date,
                supplier_document_number: data.supplier_document_number,
                supplier_document_date: data.supplier_document_date,
                warehouse_id: data.warehouse_id || order.delivery_warehouse_id,
                carrier_name: data.carrier_name,
                carrier_document: data.carrier_document,
                general_observations: data.observations,
                status: 'pending'
            }, { transaction });

            // Crear items de recepción
            let allComplete = true;
            for (const item of data.items) {
                const orderItem = await this.OrderItem.findByPk(item.order_item_id);
                if (!orderItem) continue;

                await this.ReceiptItem.create({
                    receipt_id: receipt.id,
                    order_item_id: item.order_item_id,
                    quantity_ordered: orderItem.quantity,
                    quantity_received: item.quantity_received,
                    quantity_rejected: item.quantity_rejected || 0,
                    unit_of_measure: orderItem.unit_of_measure,
                    supplier_item_code: item.supplier_item_code || orderItem.supplier_item_code,
                    internal_item_type: orderItem.internal_item_type,
                    internal_item_id: orderItem.internal_item_id,
                    warehouse_id: item.warehouse_id || data.warehouse_id,
                    location_code: item.location_code,
                    lot_number: item.lot_number,
                    expiry_date: item.expiry_date,
                    serial_numbers: item.serial_numbers || [],
                    quality_status: 'pending',
                    notes: item.notes
                }, { transaction });

                // Verificar si la recepción es completa
                const totalReceived = await this.getTotalReceivedForOrderItem(item.order_item_id);
                if (totalReceived + item.quantity_received < parseFloat(orderItem.quantity)) {
                    allComplete = false;
                }
            }

            // Actualizar recepción
            await receipt.update({
                is_complete_delivery: allComplete
            }, { transaction });

            // Actualizar estado de la orden
            await order.update({
                status: allComplete ? 'received' : 'partial_received',
                received_at: allComplete ? new Date() : order.received_at,
                received_by: allComplete ? userId : order.received_by
            }, { transaction });

            // Si no hay documento del proveedor, crear remito interno
            if (data.document_type === 'internal' || (!data.delivery_note_number && !data.supplier_document_number)) {
                const internalReceipt = await this.createInternalReceipt(
                    companyId,
                    receipt,
                    data,
                    userId,
                    transaction
                );
                await receipt.update({ internal_receipt_id: internalReceipt.id }, { transaction });
            }

            await transaction.commit();

            return {
                success: true,
                receipt: await this.getReceiptById(companyId, receipt.id)
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Crear remito interno
     */
    async createInternalReceipt(companyId, receipt, data, userId, transaction = null) {
        const receiptNumber = await this.InternalReceipt?.generateNumber(companyId) ||
            `RI-${new Date().getFullYear()}-${Date.now()}`;

        const internalReceipt = await this.InternalReceipt.create({
            company_id: companyId,
            receipt_number: receiptNumber,
            receipt_date: data.receipt_date || new Date(),
            procurement_receipt_id: receipt.id,
            origin_type: 'purchase_order',
            origin_document_id: receipt.order_id,
            supplier_id: data.supplier_id,
            warehouse_id: data.warehouse_id,
            carrier_name: data.carrier_name,
            carrier_document: data.carrier_document,
            vehicle_plate: data.vehicle_plate,
            driver_name: data.driver_name,
            driver_document: data.driver_document,
            observations: data.observations,
            status: 'draft',
            created_by: userId
        }, { transaction });

        // Crear items del remito interno
        for (let i = 0; i < data.items.length; i++) {
            const item = data.items[i];

            await this.InternalReceiptItem.create({
                internal_receipt_id: internalReceipt.id,
                line_number: i + 1,
                internal_item_type: item.internal_item_type || 'wms',
                internal_item_id: item.internal_item_id,
                item_code: item.item_code,
                item_description: item.description,
                supplier_item_code: item.supplier_item_code,
                quantity_expected: item.quantity_expected,
                quantity_received: item.quantity_received,
                quantity_rejected: item.quantity_rejected || 0,
                unit_of_measure: item.unit_of_measure,
                warehouse_id: item.warehouse_id || data.warehouse_id,
                location_code: item.location_code,
                lot_number: item.lot_number,
                expiry_date: item.expiry_date,
                unit_cost: item.unit_cost,
                notes: item.notes
            }, { transaction });
        }

        // Calcular totales
        await internalReceipt.calculateTotals();

        return internalReceipt;
    }

    /**
     * Obtener recepción por ID
     */
    async getReceiptById(companyId, receiptId) {
        const receipt = await this.Receipt.findOne({
            where: { id: receiptId, company_id: companyId }
        });

        if (!receipt) return null;

        const items = await this.ReceiptItem.findAll({
            where: { receipt_id: receiptId }
        });

        const order = await this.Order.findByPk(receipt.order_id);
        const supplier = order ? await this.Supplier.findByPk(order.supplier_id) : null;

        let internalReceipt = null;
        if (receipt.internal_receipt_id && this.InternalReceipt) {
            internalReceipt = await this.InternalReceipt.findByPk(receipt.internal_receipt_id);
        }

        return {
            ...receipt.toJSON(),
            items: items.map(i => i.toJSON()),
            order: order?.toJSON(),
            supplier: supplier?.toJSON(),
            internal_receipt: internalReceipt?.toJSON()
        };
    }

    // ============================================================================
    // HELPERS
    // ============================================================================

    async generateRequisitionNumber(companyId) {
        const year = new Date().getFullYear();
        const last = await this.Requisition.findOne({
            where: {
                company_id: companyId,
                requisition_number: { [Op.like]: `REQ-${year}-%` }
            },
            order: [['requisition_number', 'DESC']]
        });

        let sequence = 1;
        if (last) {
            const match = last.requisition_number.match(/REQ-\d{4}-(\d+)/);
            if (match) sequence = parseInt(match[1]) + 1;
        }

        return `REQ-${year}-${sequence.toString().padStart(6, '0')}`;
    }

    async generateOrderNumber(companyId) {
        const year = new Date().getFullYear();
        const last = await this.Order.findOne({
            where: {
                company_id: companyId,
                order_number: { [Op.like]: `OC-${year}-%` }
            },
            order: [['order_number', 'DESC']]
        });

        let sequence = 1;
        if (last) {
            const match = last.order_number.match(/OC-\d{4}-(\d+)/);
            if (match) sequence = parseInt(match[1]) + 1;
        }

        return `OC-${year}-${sequence.toString().padStart(6, '0')}`;
    }

    async generateReceiptNumber(companyId) {
        const year = new Date().getFullYear();
        const last = await this.Receipt.findOne({
            where: {
                company_id: companyId,
                receipt_number: { [Op.like]: `REC-${year}-%` }
            },
            order: [['receipt_number', 'DESC']]
        });

        let sequence = 1;
        if (last) {
            const match = last.receipt_number.match(/REC-\d{4}-(\d+)/);
            if (match) sequence = parseInt(match[1]) + 1;
        }

        return `REC-${year}-${sequence.toString().padStart(6, '0')}`;
    }

    async getApprovalSteps(companyId, documentType, amount) {
        if (this.ApprovalConfig) {
            return this.ApprovalConfig.getApprovalSteps(companyId, documentType, amount);
        }

        // Fallback: pasos por defecto
        const steps = [{ level: 1, role: 'supervisor', roleName: 'Supervisor' }];
        if (amount > 50000) steps.push({ level: 2, role: 'manager', roleName: 'Gerente' });
        if (amount > 200000) steps.push({ level: 3, role: 'director', roleName: 'Director' });
        return steps;
    }

    async canUserApprove(companyId, documentType, amount, userId) {
        if (this.ApprovalConfig) {
            // Obtener rol del usuario desde la DB
            const userRole = await this.getUserRole(userId, companyId);
            return this.ApprovalConfig.canUserApprove(companyId, documentType, amount, userId, userRole);
        }
        return { canApprove: true };
    }

    /**
     * Obtener rol del usuario desde la base de datos
     */
    async getUserRole(userId, companyId) {
        try {
            const [user] = await this.sequelize.query(`
                SELECT u.role, u.admin_type
                FROM users u
                WHERE u.user_id = :userId
                AND (u.company_id = :companyId OR u.admin_type = 'super')
            `, {
                replacements: { userId, companyId },
                type: QueryTypes.SELECT
            });

            if (!user) return 'employee';

            // Mapeo de roles
            if (user.admin_type === 'super') return 'admin';
            if (user.role === 'admin') return 'manager';
            if (user.role === 'supervisor') return 'supervisor';
            if (user.role === 'manager' || user.role === 'gerente') return 'manager';
            if (user.role === 'director') return 'director';

            return user.role || 'employee';
        } catch (error) {
            console.warn('[Procurement] Error obteniendo rol de usuario:', error.message);
            return 'employee';
        }
    }

    async checkBudgetAvailability(companyId, costCenterId, accountId, amount) {
        try {
            const [result] = await this.sequelize.query(
                `SELECT * FROM check_budget_availability(:companyId, :costCenterId, :accountId, :amount)`,
                {
                    replacements: { companyId, costCenterId, accountId, amount },
                    type: QueryTypes.SELECT
                }
            );
            return result || { has_budget: true };
        } catch (error) {
            // Si la función no existe, permitir la operación
            return { has_budget: true };
        }
    }

    async getTotalReceivedForOrderItem(orderItemId) {
        const result = await this.ReceiptItem.findOne({
            attributes: [
                [this.sequelize.fn('SUM', this.sequelize.col('quantity_received')), 'total']
            ],
            where: { order_item_id: orderItemId }
        });
        return parseFloat(result?.dataValues?.total) || 0;
    }

    // ============================================================================
    // DASHBOARD Y ESTADÍSTICAS
    // ============================================================================

    async getDashboardStats(companyId) {
        const [requisitions, orders, receipts, invoices] = await Promise.all([
            this.Requisition.findAll({
                where: { company_id: companyId },
                attributes: ['status'],
                raw: true
            }),
            this.Order.findAll({
                where: { company_id: companyId },
                attributes: ['status', 'total_amount'],
                raw: true
            }),
            this.Receipt.findAll({
                where: { company_id: companyId },
                attributes: ['status', 'quality_status'],
                raw: true
            }),
            this.Invoice?.findAll({
                where: { company_id: companyId },
                attributes: ['status', 'total_amount', 'due_date'],
                raw: true
            }) || []
        ]);

        // Calcular estadísticas
        const stats = {
            requisitions: {
                total: requisitions.length,
                pending_approval: requisitions.filter(r => r.status === 'pending_approval').length,
                approved: requisitions.filter(r => r.status === 'approved').length,
                draft: requisitions.filter(r => r.status === 'draft').length
            },
            orders: {
                total: orders.length,
                pending: orders.filter(o => ['draft', 'pending_approval'].includes(o.status)).length,
                sent: orders.filter(o => o.status === 'sent').length,
                total_amount: orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0)
            },
            receipts: {
                total: receipts.length,
                pending_quality: receipts.filter(r => r.quality_status === 'pending').length,
                today: await this.countTodayReceipts(companyId)
            },
            invoices: {
                total: invoices.length,
                pending_payment: invoices.filter(i => ['approved', 'scheduled'].includes(i.status)).length,
                overdue: invoices.filter(i =>
                    ['approved', 'scheduled'].includes(i.status) &&
                    new Date(i.due_date) < new Date()
                ).length,
                total_payable: invoices
                    .filter(i => ['approved', 'scheduled'].includes(i.status))
                    .reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0)
            }
        };

        return stats;
    }

    /**
     * Contar recepciones de hoy
     */
    async countTodayReceipts(companyId) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const count = await this.Receipt.count({
                where: {
                    company_id: companyId,
                    receipt_date: {
                        [Op.gte]: today
                    }
                }
            });
            return count;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Notificar a aprobadores sobre documento pendiente
     */
    async notifyApprovers(companyId, documentType, document) {
        // Obtener usuarios aprobadores según configuración
        const steps = await this.getApprovalSteps(
            companyId,
            documentType,
            parseFloat(document.estimated_total || document.total_amount || 0)
        );

        if (!steps || steps.length === 0) return;

        const firstStep = steps[0];

        // Buscar usuarios con el rol requerido
        const [approvers] = await this.sequelize.query(`
            SELECT user_id, email, name
            FROM users
            WHERE company_id = :companyId
            AND (role = :role OR admin_type = 'super')
            AND is_active = true
        `, {
            replacements: { companyId, role: firstStep.role },
            type: QueryTypes.SELECT
        });

        if (!approvers || approvers.length === 0) return;

        // Crear notificaciones en la base de datos
        const notifications = approvers.map(approver => ({
            company_id: companyId,
            user_id: approver.user_id,
            type: 'procurement_approval',
            title: `${documentType === 'requisition' ? 'Solicitud' : 'Orden'} pendiente de aprobación`,
            message: `Hay una ${documentType === 'requisition' ? 'solicitud de compra' : 'orden de compra'} que requiere su aprobación: ${document.requisition_number || document.order_number}`,
            data: {
                document_type: documentType,
                document_id: document.id,
                document_number: document.requisition_number || document.order_number,
                amount: document.estimated_total || document.total_amount
            },
            created_at: new Date()
        }));

        // Insertar notificaciones si existe la tabla
        try {
            await this.sequelize.query(`
                INSERT INTO notifications (company_id, user_id, type, title, message, data, created_at)
                SELECT * FROM unnest(
                    :companyIds::int[], :userIds::uuid[], :types::varchar[], :titles::varchar[],
                    :messages::text[], :datas::jsonb[], :createdAts::timestamp[]
                )
            `, {
                replacements: {
                    companyIds: notifications.map(n => n.company_id),
                    userIds: notifications.map(n => n.user_id),
                    types: notifications.map(n => n.type),
                    titles: notifications.map(n => n.title),
                    messages: notifications.map(n => n.message),
                    datas: notifications.map(n => JSON.stringify(n.data)),
                    createdAts: notifications.map(n => n.created_at)
                },
                type: QueryTypes.INSERT
            });
        } catch (insertError) {
            // Tabla de notificaciones puede no existir, ignorar
            console.debug('[Procurement] Tabla notifications no disponible:', insertError.message);
        }

        console.log(`[Procurement] Notificación enviada a ${approvers.length} aprobadores`);
    }

    /**
     * Notificar al proveedor sobre orden aprobada
     */
    async notifySupplier(companyId, order) {
        // Obtener información del proveedor
        const supplier = await this.Supplier.findByPk(order.supplier_id);
        if (!supplier || !supplier.email) {
            console.warn('[Procurement] Proveedor sin email, no se puede notificar');
            return;
        }

        // Registrar intento de notificación
        try {
            await this.sequelize.query(`
                INSERT INTO email_queue (company_id, to_email, to_name, subject, template, template_data, status, created_at)
                VALUES (:companyId, :toEmail, :toName, :subject, :template, :templateData, 'pending', NOW())
            `, {
                replacements: {
                    companyId,
                    toEmail: supplier.email,
                    toName: supplier.contact_name || supplier.trade_name || supplier.legal_name,
                    subject: `Nueva Orden de Compra ${order.order_number}`,
                    template: 'procurement_order_notification',
                    templateData: JSON.stringify({
                        order_number: order.order_number,
                        order_date: order.order_date,
                        total_amount: order.total_amount,
                        expected_delivery_date: order.expected_delivery_date,
                        supplier_name: supplier.trade_name || supplier.legal_name
                    })
                },
                type: QueryTypes.INSERT
            });
            console.log(`[Procurement] Email encolado para proveedor ${supplier.email}`);
        } catch (queueError) {
            // Cola de emails puede no existir, registrar en log
            console.log(`[Procurement] Notificación a proveedor: ${supplier.email} - OC ${order.order_number} (cola no disponible)`);
        }
    }
}

module.exports = ProcurementService;
