/**
 * PaymentOrderService
 * Servicio principal para Órdenes de Pago
 * Maneja: CRUD, Workflow de autorización, Integración con Finance
 */

const { Op } = require('sequelize');

class PaymentOrderService {
    constructor(db) {
        this.db = db;
        this.FinancePaymentOrder = db.FinancePaymentOrder;
        this.FinancePaymentOrderItem = db.FinancePaymentOrderItem;
        this.FinanceIssuedCheck = db.FinanceIssuedCheck;
        this.FinanceCheckBook = db.FinanceCheckBook;
        this.ProcurementInvoice = db.ProcurementInvoice;
        this.ProcurementSupplier = db.ProcurementSupplier;
    }

    /**
     * Obtener facturas pendientes de pago para un proveedor
     */
    async getPendingInvoices(companyId, supplierId = null) {
        const where = {
            company_id: companyId,
            status: { [Op.in]: ['approved', 'scheduled'] }
        };

        if (supplierId) {
            where.supplier_id = supplierId;
        }

        const invoices = await this.ProcurementInvoice.findAll({
            where,
            include: [{
                model: this.ProcurementSupplier,
                as: 'supplier',
                attributes: ['id', 'name', 'cuit', 'default_payment_terms']
            }],
            order: [['due_date', 'ASC']]
        });

        // Calcular saldo pendiente de cada factura
        return invoices.map(inv => {
            const pending = parseFloat(inv.total_amount) - parseFloat(inv.paid_amount || 0);
            return {
                ...inv.toJSON(),
                pending_amount: pending,
                is_overdue: new Date(inv.due_date) < new Date()
            };
        }).filter(inv => inv.pending_amount > 0);
    }

    /**
     * Crear orden de pago
     */
    async create(data, userId) {
        const transaction = await this.db.sequelize.transaction();

        try {
            // Generar número de orden
            const orderNumber = await this.FinancePaymentOrder.generateOrderNumber(data.company_id);

            // Obtener datos del proveedor
            const supplier = await this.ProcurementSupplier.findByPk(data.supplier_id);
            if (!supplier) {
                throw new Error('Proveedor no encontrado');
            }

            // Calcular totales desde los items
            let totalAmount = 0;
            let totalRetentions = 0;
            let totalDiscounts = 0;

            for (const item of data.items) {
                totalAmount += parseFloat(item.amount_to_pay);
                totalRetentions += parseFloat(item.retention_iibb || 0) +
                    parseFloat(item.retention_ganancias || 0) +
                    parseFloat(item.retention_iva || 0) +
                    parseFloat(item.retention_suss || 0) +
                    parseFloat(item.other_retentions || 0);
                totalDiscounts += parseFloat(item.early_payment_discount || 0) +
                    parseFloat(item.other_discounts || 0);
            }

            const netPaymentAmount = totalAmount - totalRetentions - totalDiscounts;

            // Determinar nivel de autorización requerido
            const authLevel = this.FinancePaymentOrder.getRequiredAuthorizationLevel(netPaymentAmount);

            // Crear la orden
            const order = await this.FinancePaymentOrder.create({
                company_id: data.company_id,
                branch_id: data.branch_id,
                order_number: orderNumber,
                order_date: data.order_date || new Date(),
                status: 'draft',
                scheduled_payment_date: data.scheduled_payment_date,
                total_amount: totalAmount,
                total_retentions: totalRetentions,
                total_discounts: totalDiscounts,
                net_payment_amount: netPaymentAmount,
                currency: data.currency || 'ARS',
                exchange_rate: data.exchange_rate || 1,
                supplier_id: data.supplier_id,
                supplier_name: supplier.name,
                supplier_cuit: supplier.cuit,
                supplier_bank_account: supplier.bank_accounts?.[0] || {},
                payment_method: data.payment_method,
                payment_details: data.payment_details || {},
                requires_authorization: true,
                authorization_level: authLevel,
                cost_center_id: data.cost_center_id,
                notes: data.notes,
                created_by: userId
            }, { transaction });

            // Crear los items
            for (const itemData of data.items) {
                const invoice = await this.ProcurementInvoice.findByPk(itemData.invoice_id);
                if (!invoice) {
                    throw new Error(`Factura ${itemData.invoice_id} no encontrada`);
                }

                const pendingAmount = parseFloat(invoice.total_amount) - parseFloat(invoice.paid_amount || 0);
                if (itemData.amount_to_pay > pendingAmount) {
                    throw new Error(`El monto a pagar (${itemData.amount_to_pay}) excede el pendiente (${pendingAmount}) de la factura ${invoice.invoice_number}`);
                }

                await this.FinancePaymentOrderItem.create({
                    payment_order_id: order.id,
                    invoice_id: itemData.invoice_id,
                    invoice_number: invoice.invoice_number,
                    invoice_date: invoice.invoice_date,
                    invoice_due_date: invoice.due_date,
                    invoice_total: invoice.total_amount,
                    invoice_pending: pendingAmount,
                    amount_to_pay: itemData.amount_to_pay,
                    is_partial_payment: itemData.amount_to_pay < pendingAmount,
                    retention_iibb: itemData.retention_iibb || 0,
                    retention_ganancias: itemData.retention_ganancias || 0,
                    retention_iva: itemData.retention_iva || 0,
                    retention_suss: itemData.retention_suss || 0,
                    other_retentions: itemData.other_retentions || 0,
                    retention_details: itemData.retention_details || {},
                    early_payment_discount: itemData.early_payment_discount || 0,
                    other_discounts: itemData.other_discounts || 0,
                    purchase_type: itemData.purchase_type,
                    category_id: itemData.category_id,
                    notes: itemData.notes
                }, { transaction });
            }

            order.addAuditEntry('created', userId, {
                items_count: data.items.length,
                net_amount: netPaymentAmount
            });
            await order.save({ transaction });

            await transaction.commit();

            return this.getById(order.id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Obtener orden por ID con items
     */
    async getById(id) {
        return this.FinancePaymentOrder.findByPk(id, {
            include: [
                {
                    model: this.FinancePaymentOrderItem,
                    as: 'items',
                    include: [{
                        model: this.ProcurementInvoice,
                        as: 'invoice',
                        attributes: ['id', 'invoice_number', 'total_amount', 'paid_amount', 'status']
                    }]
                },
                {
                    model: this.ProcurementSupplier,
                    as: 'supplier',
                    attributes: ['id', 'name', 'cuit', 'email', 'phone']
                },
                {
                    model: this.FinanceIssuedCheck,
                    as: 'issuedChecks'
                }
            ]
        });
    }

    /**
     * Listar órdenes de pago
     */
    async list(companyId, filters = {}) {
        const where = { company_id: companyId };

        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.supplier_id) {
            where.supplier_id = filters.supplier_id;
        }
        if (filters.date_from && filters.date_to) {
            where.order_date = {
                [Op.between]: [filters.date_from, filters.date_to]
            };
        }
        if (filters.scheduled_from && filters.scheduled_to) {
            where.scheduled_payment_date = {
                [Op.between]: [filters.scheduled_from, filters.scheduled_to]
            };
        }

        const options = {
            where,
            include: [{
                model: this.ProcurementSupplier,
                as: 'supplier',
                attributes: ['id', 'name', 'cuit']
            }],
            order: [[filters.sort_by || 'created_at', filters.sort_order || 'DESC']],
            limit: filters.limit || 50,
            offset: filters.offset || 0
        };

        const { count, rows } = await this.FinancePaymentOrder.findAndCountAll(options);

        return {
            total: count,
            data: rows,
            page: Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1,
            pages: Math.ceil(count / (filters.limit || 50))
        };
    }

    /**
     * Enviar a aprobación
     */
    async submitForApproval(id, userId) {
        const order = await this.FinancePaymentOrder.findByPk(id);
        if (!order) {
            throw new Error('Orden de pago no encontrada');
        }

        return order.submitForApproval(userId);
    }

    /**
     * Aprobar orden
     */
    async approve(id, userId, userRole, authMethod = 'password') {
        const order = await this.FinancePaymentOrder.findByPk(id);
        if (!order) {
            throw new Error('Orden de pago no encontrada');
        }

        return order.approve(userId, userRole, authMethod);
    }

    /**
     * Programar pago
     */
    async schedulePayment(id, paymentDate, userId) {
        const order = await this.FinancePaymentOrder.findByPk(id);
        if (!order) {
            throw new Error('Orden de pago no encontrada');
        }

        return order.schedulePayment(paymentDate, userId);
    }

    /**
     * Ejecutar pago completo
     * Integra con CashRegister, Cheques, Notificaciones
     */
    async execute(id, userId, paymentData = {}) {
        const transaction = await this.db.sequelize.transaction();

        try {
            const order = await this.FinancePaymentOrder.findByPk(id, {
                include: [{
                    model: this.FinancePaymentOrderItem,
                    as: 'items'
                }],
                transaction
            });

            if (!order) {
                throw new Error('Orden de pago no encontrada');
            }

            // Marcar como en ejecución
            await order.execute(userId, paymentData);
            await order.save({ transaction });

            // Si es pago con cheque, emitir el cheque
            if (order.payment_method === 'check' && paymentData.checkbook_id) {
                const checkbook = await this.FinanceCheckBook.findByPk(paymentData.checkbook_id);
                if (!checkbook) {
                    throw new Error('Chequera no encontrada');
                }

                const checkNumber = await checkbook.useCheck();

                await this.FinanceIssuedCheck.create({
                    company_id: order.company_id,
                    checkbook_id: checkbook.id,
                    check_number: checkNumber,
                    payment_order_id: order.id,
                    beneficiary_name: order.supplier_name,
                    beneficiary_cuit: order.supplier_cuit,
                    beneficiary_type: 'supplier',
                    beneficiary_id: order.supplier_id,
                    amount: order.net_payment_amount,
                    currency: order.currency,
                    amount_in_words: this.FinanceIssuedCheck.amountToWords(
                        parseFloat(order.net_payment_amount),
                        order.currency
                    ),
                    issue_date: new Date(),
                    payment_date: paymentData.check_payment_date || order.scheduled_payment_date,
                    check_type: paymentData.check_type || 'common',
                    status: 'issued',
                    created_by: userId
                }, { transaction });

                order.payment_details = {
                    ...order.payment_details,
                    check_number: checkNumber,
                    checkbook_id: checkbook.id
                };
            }

            // Crear movimiento en caja (si está integrado con Finance)
            let cashMovementId = null;
            if (this.db.FinanceCashMovement && paymentData.cash_register_id) {
                const CashRegisterService = require('./CashRegisterService');
                const cashService = new CashRegisterService(this.db);

                const movement = await cashService.createMovement({
                    company_id: order.company_id,
                    cash_register_id: paymentData.cash_register_id,
                    movement_type: 'payment',
                    direction: 'out',
                    amount: order.net_payment_amount,
                    currency: order.currency,
                    source_module: 'payment_order',
                    source_document_type: 'payment_order',
                    source_document_id: order.id,
                    source_document_number: order.order_number,
                    third_party_type: 'supplier',
                    third_party_id: order.supplier_id,
                    third_party_name: order.supplier_name,
                    description: `Pago OP ${order.order_number} - ${order.supplier_name}`,
                    created_by: userId
                }, transaction);

                cashMovementId = movement.id;
            }

            // Marcar como ejecutada
            await order.markExecuted(userId, cashMovementId, null);
            await order.save({ transaction });

            await transaction.commit();

            return this.getById(id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Cancelar orden
     */
    async cancel(id, reason, userId) {
        const order = await this.FinancePaymentOrder.findByPk(id);
        if (!order) {
            throw new Error('Orden de pago no encontrada');
        }

        return order.cancel(userId, reason);
    }

    /**
     * Enviar notificación al proveedor
     */
    async sendNotification(id, userId) {
        const order = await this.getById(id);
        if (!order) {
            throw new Error('Orden de pago no encontrada');
        }

        if (order.status !== 'executed') {
            throw new Error('Solo se pueden notificar órdenes ejecutadas');
        }

        try {
            // Obtener email del proveedor
            const supplier = await this.ProcurementSupplier.findByPk(order.supplier_id);
            const email = supplier?.email;

            if (!email) {
                throw new Error('El proveedor no tiene email configurado');
            }

            // Usar EmailService si está disponible
            if (this.db.EmailService) {
                await this.db.EmailService.sendFromAponnt({
                    to: email,
                    subject: `Pago realizado - ${order.order_number}`,
                    template: 'payment_notification',
                    data: {
                        order_number: order.order_number,
                        supplier_name: order.supplier_name,
                        amount: order.net_payment_amount,
                        currency: order.currency,
                        payment_date: order.actual_payment_date,
                        payment_method: order.payment_method,
                        items: order.items.map(item => ({
                            invoice_number: item.invoice_number,
                            amount: item.amount_to_pay,
                            retentions: item.total_retentions
                        }))
                    }
                });
            }

            await order.markNotificationSent(email);
            return order;
        } catch (error) {
            console.error('Error enviando notificación:', error);
            throw new Error(`Error enviando notificación: ${error.message}`);
        }
    }

    /**
     * Obtener órdenes pendientes de aprobación para un rol
     */
    async getPendingApproval(companyId, userRole) {
        return this.FinancePaymentOrder.getPendingApproval(companyId, userRole);
    }

    /**
     * Obtener estadísticas
     */
    async getStats(companyId, dateFrom = null, dateTo = null) {
        return this.FinancePaymentOrder.getStats(companyId, dateFrom, dateTo);
    }

    /**
     * Obtener órdenes próximas a vencer
     */
    async getUpcoming(companyId, days = 7) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days);

        return this.FinancePaymentOrder.findAll({
            where: {
                company_id: companyId,
                status: { [Op.in]: ['approved', 'scheduled'] },
                scheduled_payment_date: {
                    [Op.between]: [new Date(), endDate]
                }
            },
            include: [{
                model: this.ProcurementSupplier,
                as: 'supplier',
                attributes: ['id', 'name']
            }],
            order: [['scheduled_payment_date', 'ASC']]
        });
    }
}

module.exports = PaymentOrderService;
