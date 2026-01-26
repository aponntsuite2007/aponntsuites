/**
 * P2PIntegrationService.js
 * Servicio de integración del circuito Procure-to-Pay completo
 *
 * Responsabilidades:
 * 1. Receipt → Stock (WMS): Actualizar inventario al confirmar recepción
 * 2. Asientos contables automáticos en cada paso del P2P
 * 3. Bridge ProcurementPayment ↔ FinancePaymentOrder
 * 4. Three-way matching corregido (OC ↔ Remito ↔ Factura)
 * 5. Propagación de estados entre entidades
 */

const { Op, QueryTypes } = require('sequelize');
const FiscalStrategyFactory = require('./fiscal/FiscalStrategyFactory');
const RetentionCalculator = require('./fiscal/RetentionCalculator');
const FiscalNotifications = require('./integrations/fiscal-notifications');

class P2PIntegrationService {
    constructor(db) {
        this.db = db;
        this.sequelize = db.sequelize;

        // Procurement models
        this.Order = db.ProcurementOrder;
        this.OrderItem = db.ProcurementOrderItem;
        this.Receipt = db.ProcurementReceipt;
        this.ReceiptItem = db.ProcurementReceiptItem;
        this.Invoice = db.ProcurementInvoice;
        this.Payment = db.ProcurementPayment;
        this.Supplier = db.ProcurementSupplier;

        // Finance models
        this.FinancePaymentOrder = db.FinancePaymentOrder;
        this.FinancePaymentOrderItem = db.FinancePaymentOrderItem;
        this.FinanceIssuedCheck = db.FinanceIssuedCheck;
        this.JournalEntry = db.FinanceJournalEntry;
        this.JournalEntryLine = db.FinanceJournalEntryLine;
        this.AccountingConfig = db.ProcurementAccountingConfig;

        // Fiscal strategy (TaxTemplate SSOT)
        this.fiscalFactory = new FiscalStrategyFactory(db);
        this.retentionCalc = new RetentionCalculator(db, this.fiscalFactory);
    }

    // =========================================================================
    // FISCAL: Calcular retenciones para un pago (delega a RetentionCalculator)
    // =========================================================================

    /**
     * Calcular retenciones automáticas basándose en TaxTemplate (SSOT)
     * @param {Object} params - { companyId, supplierId, amount, branchId, purchaseType, taxAmount }
     * @returns {{ totalRetentions, netAmount, breakdown[], retentions_detail[], countryCode }}
     */
    async calculateRetentions(params) {
        return this.retentionCalc.calculate(params);
    }

    /**
     * Obtener strategy fiscal para una sucursal
     */
    async getFiscalStrategy(branchId) {
        return this.fiscalFactory.getStrategyForBranch(branchId);
    }

    // =========================================================================
    // 1. RECEIPT → STOCK (WMS Integration)
    // =========================================================================

    /**
     * Procesar recepción confirmada y actualizar stock
     * Se llama cuando un ProcurementReceipt pasa a status 'confirmed'
     */
    async processReceiptToStock(receiptId, userId) {
        const transaction = await this.sequelize.transaction();

        try {
            // Obtener recepción con items
            const receipt = await this.Receipt.findByPk(receiptId, {
                include: [
                    { model: this.ReceiptItem, as: 'items' },
                    { model: this.Order, as: 'order', include: [{ model: this.OrderItem, as: 'items' }] }
                ],
                transaction
            });

            if (!receipt) {
                throw new Error('Recepción no encontrada');
            }

            if (!receipt.warehouse_id) {
                throw new Error('La recepción no tiene depósito asignado');
            }

            const stockMovements = [];
            const companyId = receipt.company_id;

            // Crear movimientos de stock para cada item recibido
            for (const receiptItem of receipt.items) {
                if (receiptItem.quantity_received <= 0) continue;

                // Buscar el item de la OC para obtener product_id y precio
                const orderItem = receipt.order?.items?.find(
                    oi => oi.id === receiptItem.order_item_id
                );

                if (!orderItem || !orderItem.item_id) continue;

                // Crear movimiento de stock tipo 'purchase'
                const movementQuery = `
                    INSERT INTO wms_stock_movements (
                        warehouse_id, product_id, movement_type, quantity,
                        previous_quantity, new_quantity, unit_cost,
                        reference_type, reference_id, notes, created_by
                    )
                    SELECT
                        :warehouseId, :productId, 'purchase', :quantity,
                        COALESCE(s.quantity, 0),
                        COALESCE(s.quantity, 0) + :quantity,
                        :unitCost,
                        'procurement_receipt', :receiptId,
                        :notes, :userId
                    FROM (SELECT 1) dummy
                    LEFT JOIN wms_stock s ON s.product_id = :productId AND s.warehouse_id = :warehouseId
                    RETURNING id
                `;

                const [movement] = await this.sequelize.query(movementQuery, {
                    replacements: {
                        warehouseId: receipt.warehouse_id,
                        productId: orderItem.item_id,
                        quantity: receiptItem.quantity_received,
                        unitCost: orderItem.unit_price || 0,
                        receiptId: receipt.id,
                        notes: `Recepción OC #${receipt.order?.order_number || ''} - Remito #${receipt.receipt_number}`,
                        userId
                    },
                    type: QueryTypes.SELECT,
                    transaction
                });

                // Actualizar o crear registro de stock
                const upsertStockQuery = `
                    INSERT INTO wms_stock (warehouse_id, product_id, quantity, last_entry_date, last_entry_quantity, updated_at)
                    VALUES (:warehouseId, :productId, :quantity, CURRENT_TIMESTAMP, :quantity, CURRENT_TIMESTAMP)
                    ON CONFLICT (warehouse_id, product_id)
                    DO UPDATE SET
                        quantity = wms_stock.quantity + :quantity,
                        last_entry_date = CURRENT_TIMESTAMP,
                        last_entry_quantity = :quantity,
                        updated_at = CURRENT_TIMESTAMP
                `;

                await this.sequelize.query(upsertStockQuery, {
                    replacements: {
                        warehouseId: receipt.warehouse_id,
                        productId: orderItem.item_id,
                        quantity: receiptItem.quantity_received
                    },
                    transaction
                });

                if (movement) {
                    stockMovements.push(movement.id);
                }

                // Actualizar cantidad recibida en el item de la OC
                await this.OrderItem.update(
                    {
                        quantity_received: this.sequelize.literal(
                            `COALESCE(quantity_received, 0) + ${parseFloat(receiptItem.quantity_received)}`
                        ),
                        reception_status: receiptItem.quantity_received >= orderItem.quantity_ordered
                            ? 'complete' : 'partial'
                    },
                    { where: { id: orderItem.id }, transaction }
                );
            }

            // Actualizar receipt con stock_movement_id
            await receipt.update({
                stock_movement_id: stockMovements.length > 0 ? stockMovements[0] : null
            }, { transaction });

            // Verificar si la OC está completamente recibida
            await this.checkAndUpdateOrderReceiptStatus(receipt.order_id, transaction);

            await transaction.commit();

            return {
                success: true,
                stockMovements: stockMovements.length,
                message: `${stockMovements.length} movimientos de stock generados`
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Verificar si una OC está completamente recibida y actualizar su estado
     */
    async checkAndUpdateOrderReceiptStatus(orderId, transaction) {
        const order = await this.Order.findByPk(orderId, {
            include: [{ model: this.OrderItem, as: 'items' }],
            transaction
        });

        if (!order) return;

        const allReceived = order.items.every(
            item => parseFloat(item.quantity_received || 0) >= parseFloat(item.quantity_ordered)
        );
        const anyReceived = order.items.some(
            item => parseFloat(item.quantity_received || 0) > 0
        );

        let newStatus = order.status;
        if (allReceived) {
            newStatus = 'received';
        } else if (anyReceived) {
            newStatus = 'partial_received';
        }

        if (newStatus !== order.status) {
            await order.update({
                status: newStatus,
                received_at: allReceived ? new Date() : null
            }, { transaction });
        }
    }

    // =========================================================================
    // 2. ASIENTOS CONTABLES AUTOMÁTICOS
    // =========================================================================

    /**
     * Obtener configuración contable para una empresa
     */
    async getAccountingConfig(companyId) {
        let config = await this.AccountingConfig?.findOne({
            where: { company_id: companyId }
        });

        // Configuración por defecto si no existe
        if (!config) {
            config = {
                account_merchandise: null,        // DB: Mercaderías
                account_suppliers: null,           // CR: Proveedores
                account_iva_cf: null,              // DB: IVA Crédito Fiscal
                account_bank: null,                // DB: Banco (para pagos)
                account_retentions_iibb: null,     // CR: Retenciones IIBB
                account_retentions_ganancias: null, // CR: Retenciones Ganancias
                account_retentions_iva: null,      // CR: Retenciones IVA
                account_retentions_suss: null      // CR: Retenciones SUSS
            };
        }

        return config;
    }

    /**
     * Generar asiento contable por recepción de mercadería
     * DB: Mercaderías (activo) | CR: Proveedores (pasivo)
     */
    async generateReceiptJournalEntry(receiptId, userId) {
        const transaction = await this.sequelize.transaction();

        try {
            const receipt = await this.Receipt.findByPk(receiptId, {
                include: [
                    { model: this.ReceiptItem, as: 'items' },
                    { model: this.Order, as: 'order', include: [{ model: this.OrderItem, as: 'items' }] }
                ],
                transaction
            });

            if (!receipt || !receipt.order) return null;

            const config = await this.getAccountingConfig(receipt.company_id);
            if (!config.account_merchandise || !config.account_suppliers) {
                // Sin configuración contable, no generar asiento
                return null;
            }

            // Calcular total de la recepción
            let totalAmount = 0;
            for (const receiptItem of receipt.items) {
                const orderItem = receipt.order.items.find(oi => oi.id === receiptItem.order_item_id);
                if (orderItem) {
                    totalAmount += parseFloat(receiptItem.quantity_received) * parseFloat(orderItem.unit_price || 0);
                }
            }

            if (totalAmount <= 0) return null;

            // Obtener próximo número de asiento
            const currentYear = new Date().getFullYear();
            const entryNumber = await this.JournalEntry.getNextNumber(receipt.company_id, currentYear);

            // Crear asiento
            const entry = await this.JournalEntry.create({
                company_id: receipt.company_id,
                entry_number: entryNumber,
                fiscal_year: currentYear,
                entry_date: receipt.receipt_date || new Date(),
                description: `Recepción Mercadería - OC #${receipt.order.order_number} - Remito #${receipt.receipt_number}`,
                source_module: 'procurement',
                source_document_id: receipt.id,
                source_document_type: 'receipt',
                total_debit: totalAmount,
                total_credit: totalAmount,
                status: 'draft',
                created_by: userId
            }, { transaction });

            // Línea DB: Mercaderías
            await this.JournalEntryLine.create({
                journal_entry_id: entry.id,
                line_number: 1,
                account_id: config.account_merchandise,
                description: `Mercadería recibida - Proveedor ${receipt.order.supplier_id}`,
                debit_amount: totalAmount,
                credit_amount: 0,
                cost_center_id: receipt.order.cost_center_id || null
            }, { transaction });

            // Línea CR: Proveedores
            await this.JournalEntryLine.create({
                journal_entry_id: entry.id,
                line_number: 2,
                account_id: config.account_suppliers,
                description: `Deuda proveedor - OC #${receipt.order.order_number}`,
                debit_amount: 0,
                credit_amount: totalAmount,
                cost_center_id: receipt.order.cost_center_id || null
            }, { transaction });

            await transaction.commit();
            return entry;
        } catch (error) {
            await transaction.rollback();
            console.error('[P2P] Error generando asiento de recepción:', error.message);
            return null;
        }
    }

    /**
     * Generar asiento contable por factura de proveedor aprobada
     * DB: IVA Crédito Fiscal | CR: Proveedores (ajuste por diferencia)
     */
    async generateInvoiceJournalEntry(invoiceId, userId) {
        const transaction = await this.sequelize.transaction();

        try {
            const invoice = await this.Invoice.findByPk(invoiceId, { transaction });
            if (!invoice) return null;

            const config = await this.getAccountingConfig(invoice.company_id);
            if (!config.account_iva_cf || !config.account_suppliers) return null;

            const taxAmount = parseFloat(invoice.tax_amount || 0);
            if (taxAmount <= 0) return null;

            const currentYear = new Date().getFullYear();
            const entryNumber = await this.JournalEntry.getNextNumber(invoice.company_id, currentYear);

            const entry = await this.JournalEntry.create({
                company_id: invoice.company_id,
                entry_number: entryNumber,
                fiscal_year: currentYear,
                entry_date: invoice.invoice_date || new Date(),
                description: `Factura Proveedor #${invoice.invoice_number} - IVA CF`,
                source_module: 'procurement',
                source_document_id: invoice.id,
                source_document_type: 'invoice',
                total_debit: taxAmount,
                total_credit: taxAmount,
                status: 'draft',
                created_by: userId
            }, { transaction });

            // DB: IVA Crédito Fiscal
            await this.JournalEntryLine.create({
                journal_entry_id: entry.id,
                line_number: 1,
                account_id: config.account_iva_cf,
                description: `IVA CF - Factura #${invoice.invoice_number}`,
                debit_amount: taxAmount,
                credit_amount: 0
            }, { transaction });

            // CR: Proveedores (el IVA incrementa la deuda)
            await this.JournalEntryLine.create({
                journal_entry_id: entry.id,
                line_number: 2,
                account_id: config.account_suppliers,
                description: `IVA Proveedor - Factura #${invoice.invoice_number}`,
                debit_amount: 0,
                credit_amount: taxAmount
            }, { transaction });

            // Vincular asiento a la factura
            await invoice.update({ journal_entry_id: entry.id }, { transaction });

            await transaction.commit();
            return entry;
        } catch (error) {
            await transaction.rollback();
            console.error('[P2P] Error generando asiento de factura:', error.message);
            return null;
        }
    }

    /**
     * Generar asiento contable por pago a proveedor
     * DB: Proveedores | CR: Banco/Caja + Retenciones
     */
    async generatePaymentJournalEntry(paymentOrderId, userId) {
        const transaction = await this.sequelize.transaction();

        try {
            const order = await this.FinancePaymentOrder.findByPk(paymentOrderId, {
                include: [{ model: this.FinancePaymentOrderItem, as: 'items' }],
                transaction
            });

            if (!order) return null;

            const config = await this.getAccountingConfig(order.company_id);
            if (!config.account_suppliers || !config.account_bank) return null;

            const totalAmount = parseFloat(order.total_amount || 0);
            const retentionsAmount = parseFloat(order.total_retentions || 0);
            const netAmount = totalAmount - retentionsAmount;

            if (totalAmount <= 0) return null;

            const currentYear = new Date().getFullYear();
            const entryNumber = await this.JournalEntry.getNextNumber(order.company_id, currentYear);

            const entry = await this.JournalEntry.create({
                company_id: order.company_id,
                entry_number: entryNumber,
                fiscal_year: currentYear,
                entry_date: order.executed_at || new Date(),
                description: `Pago Proveedor - OP #${order.order_number}`,
                source_module: 'finance',
                source_document_id: order.id,
                source_document_type: 'payment_order',
                total_debit: totalAmount,
                total_credit: totalAmount,
                status: 'draft',
                created_by: userId
            }, { transaction });

            let lineNumber = 1;

            // DB: Proveedores (cancela la deuda)
            await this.JournalEntryLine.create({
                journal_entry_id: entry.id,
                line_number: lineNumber++,
                account_id: config.account_suppliers,
                description: `Pago OP #${order.order_number}`,
                debit_amount: totalAmount,
                credit_amount: 0,
                cost_center_id: order.cost_center_id || null
            }, { transaction });

            // CR: Banco (monto neto)
            await this.JournalEntryLine.create({
                journal_entry_id: entry.id,
                line_number: lineNumber++,
                account_id: config.account_bank,
                description: `Transferencia/Cheque - OP #${order.order_number}`,
                debit_amount: 0,
                credit_amount: netAmount,
                cost_center_id: order.cost_center_id || null
            }, { transaction });

            // CR: Retenciones (si hay) - resuelve cuentas via fiscal strategy
            if (retentionsAmount > 0 && order.retentions_detail) {
                const retentions = typeof order.retentions_detail === 'string'
                    ? JSON.parse(order.retentions_detail) : order.retentions_detail;

                // Obtener strategy para resolver nombres de cuentas por país
                let strategy;
                try {
                    const countryCode = order.fiscal_country_code || 'AR';
                    strategy = await this.fiscalFactory.getStrategyForCountry(countryCode);
                } catch { strategy = null; }

                for (const retention of (retentions || [])) {
                    // Resolver account key via strategy (multi-país) o fallback directo
                    let retAccountKey;
                    if (strategy) {
                        const mapping = strategy.getAccountCodeMappings({ retentionType: retention.type });
                        retAccountKey = mapping.accountKey;
                    } else {
                        retAccountKey = `account_retentions_${retention.type}`;
                    }

                    const retAccountId = config[retAccountKey];
                    if (!retAccountId) continue;

                    await this.JournalEntryLine.create({
                        journal_entry_id: entry.id,
                        line_number: lineNumber++,
                        account_id: retAccountId,
                        description: `Retención ${(retention.name || retention.type).toUpperCase()} - ${retention.percent || 0}%`,
                        debit_amount: 0,
                        credit_amount: parseFloat(retention.amount || 0)
                    }, { transaction });
                }
            }

            // Vincular asiento a la OP
            await order.update({ journal_entry_id: entry.id }, { transaction });

            await transaction.commit();
            return entry;
        } catch (error) {
            await transaction.rollback();
            console.error('[P2P] Error generando asiento de pago:', error.message);
            return null;
        }
    }

    // =========================================================================
    // 3. THREE-WAY MATCHING CORREGIDO
    // =========================================================================

    /**
     * Ejecutar three-way matching: OC ↔ Remito ↔ Factura
     * Compara cantidades Y montos con tolerancias configurables
     */
    async performThreeWayMatch(invoiceId, tolerancePercent = 2.0) {
        const transaction = await this.sequelize.transaction();

        try {
            const invoice = await this.Invoice.findByPk(invoiceId, { transaction });
            if (!invoice) throw new Error('Factura no encontrada');

            const orderIds = invoice.order_ids || [];
            if (orderIds.length === 0) {
                await invoice.update({
                    matching_status: 'pending',
                    matching_notes: 'Sin órdenes de compra vinculadas'
                }, { transaction });
                await transaction.commit();
                return { status: 'pending', message: 'Sin OC vinculadas' };
            }

            // Obtener todas las OC vinculadas con sus items y recepciones
            const orders = await this.Order.findAll({
                where: { id: { [Op.in]: orderIds } },
                include: [
                    { model: this.OrderItem, as: 'items' },
                    {
                        model: this.Receipt, as: 'receipts',
                        where: { status: 'confirmed' },
                        required: false,
                        include: [{ model: this.ReceiptItem, as: 'items' }]
                    }
                ],
                transaction
            });

            // Calcular totales de OC
            let orderTotal = 0;
            let orderedQuantityTotal = 0;
            for (const order of orders) {
                for (const item of (order.items || [])) {
                    orderTotal += parseFloat(item.total_price || 0);
                    orderedQuantityTotal += parseFloat(item.quantity_ordered || 0);
                }
            }

            // Calcular totales recibidos (de remitos confirmados)
            let receivedTotal = 0;
            let receivedQuantityTotal = 0;
            for (const order of orders) {
                for (const receipt of (order.receipts || [])) {
                    for (const rItem of (receipt.items || [])) {
                        const orderItem = order.items?.find(oi => oi.id === rItem.order_item_id);
                        if (orderItem) {
                            receivedTotal += parseFloat(rItem.quantity_received || 0) * parseFloat(orderItem.unit_price || 0);
                            receivedQuantityTotal += parseFloat(rItem.quantity_received || 0);
                        }
                    }
                }
            }

            // Totales de la factura
            const invoiceTotal = parseFloat(invoice.subtotal || invoice.total_amount || 0);

            // Calcular discrepancias
            const baseAmount = orderTotal || 1; // evitar division por 0
            const discrepancyVsOrder = Math.abs(invoiceTotal - orderTotal);
            const discrepancyPercentVsOrder = (discrepancyVsOrder / baseAmount) * 100;

            const discrepancyVsReceived = Math.abs(invoiceTotal - receivedTotal);
            const discrepancyPercentVsReceived = receivedTotal > 0
                ? (discrepancyVsReceived / receivedTotal) * 100 : 100;

            // Determinar status del matching
            let matchingStatus;
            let matchingNotes = '';

            if (receivedQuantityTotal === 0) {
                matchingStatus = 'rejected';
                matchingNotes = 'No hay mercadería recibida para esta factura. Remito pendiente.';
            } else if (discrepancyPercentVsOrder <= tolerancePercent && discrepancyPercentVsReceived <= tolerancePercent) {
                matchingStatus = 'matched';
                matchingNotes = 'Matching exitoso dentro de tolerancia';
            } else if (discrepancyPercentVsOrder <= tolerancePercent * 5) {
                // Entre tolerancia y 5x tolerancia: requiere aprobación manual
                matchingStatus = 'discrepancy';
                matchingNotes = `Discrepancia ${discrepancyPercentVsOrder.toFixed(2)}% vs OC, ${discrepancyPercentVsReceived.toFixed(2)}% vs Recibido`;
            } else {
                matchingStatus = 'rejected';
                matchingNotes = `Discrepancia excede límite: ${discrepancyPercentVsOrder.toFixed(2)}% vs OC`;
            }

            // Actualizar factura
            await invoice.update({
                matching_status: matchingStatus,
                matching_discrepancy: discrepancyVsOrder,
                matching_discrepancy_percent: discrepancyPercentVsOrder,
                matching_notes: matchingNotes,
                matching_details: JSON.stringify({
                    order_total: orderTotal,
                    received_total: receivedTotal,
                    invoice_total: invoiceTotal,
                    ordered_quantity: orderedQuantityTotal,
                    received_quantity: receivedQuantityTotal,
                    tolerance_percent: tolerancePercent,
                    discrepancy_vs_order_percent: discrepancyPercentVsOrder,
                    discrepancy_vs_received_percent: discrepancyPercentVsReceived,
                    matched_at: new Date()
                })
            }, { transaction });

            await transaction.commit();

            return {
                status: matchingStatus,
                orderTotal,
                receivedTotal,
                invoiceTotal,
                discrepancyPercent: discrepancyPercentVsOrder,
                notes: matchingNotes
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    // =========================================================================
    // 4. BRIDGE: ProcurementPayment ↔ FinancePaymentOrder
    // =========================================================================

    /**
     * Crear FinancePaymentOrder desde ProcurementInvoices aprobadas
     * Bridge entre el módulo de procurement y el módulo financiero
     */
    async createPaymentOrderFromInvoices(companyId, invoiceIds, paymentData, userId) {
        const transaction = await this.sequelize.transaction();

        try {
            // Validar facturas
            const invoices = await this.Invoice.findAll({
                where: {
                    id: { [Op.in]: invoiceIds },
                    company_id: companyId,
                    status: { [Op.in]: ['approved', 'verified'] },
                    matching_status: { [Op.in]: ['matched', 'approved_with_tolerance'] }
                },
                transaction
            });

            if (invoices.length === 0) {
                throw new Error('No hay facturas aprobadas y matcheadas para pagar');
            }

            // Verificar que todas son del mismo proveedor
            const supplierIds = [...new Set(invoices.map(i => i.supplier_id))];
            if (supplierIds.length > 1) {
                throw new Error('Las facturas deben ser del mismo proveedor');
            }

            // Calcular totales
            const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);

            // Resolver moneda via fiscal strategy (branch de la primera factura)
            const fiscalBranchId = invoices[0]?.branch_id || null;
            const strategy = await this.fiscalFactory.getStrategyForBranch(fiscalBranchId);
            const defaultCurrency = strategy.getDefaultCurrency();
            const fiscalCountryCode = strategy.countryCode;

            // Generar número de OP
            const [lastOrder] = await this.sequelize.query(`
                SELECT order_number FROM finance_payment_orders
                WHERE company_id = :companyId
                ORDER BY created_at DESC LIMIT 1
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT,
                transaction
            });

            const lastNum = lastOrder?.order_number?.match(/OP-(\d+)/);
            const nextNum = lastNum ? parseInt(lastNum[1]) + 1 : 1;
            const orderNumber = `OP-${String(nextNum).padStart(6, '0')}`;

            // Crear FinancePaymentOrder
            const paymentOrder = await this.FinancePaymentOrder.create({
                company_id: companyId,
                order_number: orderNumber,
                supplier_id: supplierIds[0],
                payment_date: paymentData.payment_date || null,
                payment_method: paymentData.payment_method || 'transfer',
                total_amount: totalAmount,
                total_retentions: paymentData.total_retentions || 0,
                net_amount: totalAmount - (paymentData.total_retentions || 0),
                retentions_detail: paymentData.retentions_detail || null,
                currency: paymentData.currency || defaultCurrency,
                fiscal_country_code: fiscalCountryCode,
                status: 'draft',
                notes: paymentData.notes || '',
                cost_center_id: paymentData.cost_center_id || null,
                created_by: userId
            }, { transaction });

            // Crear items vinculando cada factura
            for (const invoice of invoices) {
                await this.FinancePaymentOrderItem.create({
                    payment_order_id: paymentOrder.id,
                    invoice_id: invoice.id,
                    amount: parseFloat(invoice.total_amount || 0),
                    description: `Factura #${invoice.invoice_number}`,
                    category_id: null
                }, { transaction });

                // Actualizar estado de la factura
                await invoice.update({
                    status: 'scheduled',
                    payment_scheduled_date: paymentData.payment_date
                }, { transaction });
            }

            await transaction.commit();

            // === NOTIFICACIONES FISCALES ===
            // Enviar después del commit para no afectar la transacción
            if (paymentData.total_retentions > 0 || paymentData.retentions_detail?.length > 0) {
                try {
                    // Cargar datos del proveedor para notificación
                    const supplier = await this.Supplier?.findByPk(supplierIds[0]).catch(() => null);

                    await FiscalNotifications.notifyPaymentRetentions({
                        companyId,
                        userId,
                        paymentOrder: {
                            id: paymentOrder.id,
                            order_number: orderNumber,
                            total_amount: totalAmount,
                            supplier_name: supplier?.name || 'Proveedor'
                        },
                        retentionResult: {
                            totalRetentions: paymentData.total_retentions || 0,
                            breakdown: paymentData.retentions_detail || [],
                            netAmount: totalAmount - (paymentData.total_retentions || 0)
                        },
                        supplier: supplier ? {
                            id: supplier.id,
                            name: supplier.name,
                            tax_id: supplier.tax_id,
                            email: supplier.contact_email || supplier.email
                        } : null,
                        strategy
                    });
                } catch (notifError) {
                    // No fallar si notificación falla - el pago ya está creado
                    console.error('[P2P] Error enviando notificaciones fiscales:', notifError.message);
                }
            }

            return {
                success: true,
                paymentOrder,
                invoicesLinked: invoices.length,
                totalAmount
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Ejecutar pago y propagar estado a todas las entidades del P2P
     * Actualiza: FinancePaymentOrder → ProcurementInvoice → ProcurementOrder
     */
    async executePaymentAndPropagate(paymentOrderId, paymentData, userId) {
        const transaction = await this.sequelize.transaction();

        try {
            const order = await this.FinancePaymentOrder.findByPk(paymentOrderId, {
                include: [
                    {
                        model: this.FinancePaymentOrderItem, as: 'items',
                        include: [{ model: this.Invoice, as: 'invoice' }]
                    }
                ],
                transaction
            });

            if (!order) throw new Error('Orden de pago no encontrada');
            if (order.status !== 'approved' && order.status !== 'scheduled') {
                throw new Error(`No se puede ejecutar OP en estado: ${order.status}`);
            }

            // Marcar OP como ejecutada
            await order.update({
                status: 'executed',
                executed_at: new Date(),
                executed_by: userId,
                bank_reference: paymentData.bank_reference || null
            }, { transaction });

            // Actualizar cada factura vinculada
            for (const item of (order.items || [])) {
                if (!item.invoice) continue;

                await item.invoice.update({
                    status: 'paid',
                    paid_at: new Date(),
                    paid_amount: parseFloat(item.amount || 0),
                    payment_method: order.payment_method,
                    payment_reference: paymentData.bank_reference || null,
                    payment_id: order.id
                }, { transaction });

                // Propagar estado de pago a las OC vinculadas
                const invoiceOrderIds = item.invoice.order_ids || [];
                if (invoiceOrderIds.length > 0) {
                    for (const orderId of invoiceOrderIds) {
                        await this.updateOrderPaymentStatus(orderId, transaction);
                    }
                }
            }

            // Generar asiento contable
            await transaction.commit();

            // Generar asiento fuera de la transacción principal (no bloquea el pago)
            try {
                await this.generatePaymentJournalEntry(paymentOrderId, userId);
            } catch (accountingError) {
                console.error('[P2P] Error en asiento contable (pago ejecutado igualmente):', accountingError.message);
            }

            return { success: true, message: 'Pago ejecutado y propagado correctamente' };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Actualizar el estado de pago de una OC basado en sus facturas
     */
    async updateOrderPaymentStatus(orderId, transaction) {
        const order = await this.Order.findByPk(orderId, { transaction });
        if (!order) return;

        // Buscar todas las facturas vinculadas a esta OC
        const invoices = await this.Invoice.findAll({
            where: this.sequelize.literal(
                `order_ids @> '[${orderId}]'::jsonb`
            ),
            transaction
        });

        if (invoices.length === 0) {
            await order.update({ payment_status: 'pending' }, { transaction });
            return;
        }

        const totalInvoiced = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
        const totalPaid = invoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + parseFloat(inv.paid_amount || inv.total_amount || 0), 0);

        let paymentStatus;
        if (totalPaid >= totalInvoiced) {
            paymentStatus = 'paid';
        } else if (totalPaid > 0) {
            paymentStatus = 'partial_paid';
        } else if (invoices.some(inv => inv.status === 'scheduled')) {
            paymentStatus = 'scheduled';
        } else {
            paymentStatus = 'pending';
        }

        await order.update({
            payment_status: paymentStatus,
            paid_amount: totalPaid,
            paid_at: paymentStatus === 'paid' ? new Date() : null
        }, { transaction });

        // Si la OC está totalmente recibida y pagada, cerrarla
        if (paymentStatus === 'paid' && (order.status === 'received' || order.status === 'partial_received')) {
            await order.update({ status: 'closed_complete' }, { transaction });
        }
    }

    // =========================================================================
    // 5. CIERRE AUTOMÁTICO DE CIRCUITO
    // =========================================================================

    /**
     * Verificar si el circuito P2P de una OC está completo y cerrarlo
     * Circuito completo: OC confirmada + Recepción total + Factura matcheada + Pago ejecutado
     */
    async checkAndCloseOrderCircuit(orderId) {
        const order = await this.Order.findByPk(orderId, {
            include: [
                { model: this.OrderItem, as: 'items' },
                { model: this.Receipt, as: 'receipts', where: { status: 'confirmed' }, required: false }
            ]
        });

        if (!order) return { closed: false, reason: 'OC no encontrada' };

        // 1. Verificar recepción completa
        const allReceived = order.items.every(
            item => parseFloat(item.quantity_received || 0) >= parseFloat(item.quantity_ordered)
        );
        if (!allReceived) {
            return { closed: false, reason: 'Recepción incompleta', pending: 'receipt' };
        }

        // 2. Verificar factura existente y matcheada
        const invoices = await this.Invoice.findAll({
            where: this.sequelize.literal(`order_ids @> '[${orderId}]'::jsonb`)
        });
        const hasMatchedInvoice = invoices.some(
            inv => ['matched', 'approved_with_tolerance'].includes(inv.matching_status)
        );
        if (!hasMatchedInvoice) {
            return { closed: false, reason: 'Sin factura matcheada', pending: 'invoice' };
        }

        // 3. Verificar pago
        const allPaid = invoices.every(inv => inv.status === 'paid');
        if (!allPaid) {
            return { closed: false, reason: 'Pago pendiente', pending: 'payment' };
        }

        // Todo completo - cerrar OC
        await order.update({ status: 'closed_complete' });

        return { closed: true, reason: 'Circuito P2P completo' };
    }

    /**
     * Identificar qué queda pendiente para cerrar el circuito de una OC
     */
    async getOrderCircuitStatus(orderId) {
        const order = await this.Order.findByPk(orderId, {
            include: [
                { model: this.OrderItem, as: 'items' },
                { model: this.Receipt, as: 'receipts', required: false },
                { model: this.Supplier, as: 'supplier' }
            ]
        });

        if (!order) return null;

        // Receipt status
        const totalItems = order.items.length;
        const receivedItems = order.items.filter(
            i => parseFloat(i.quantity_received || 0) >= parseFloat(i.quantity_ordered)
        ).length;

        // Invoice status
        const invoices = await this.Invoice.findAll({
            where: this.sequelize.literal(`order_ids @> '[${orderId}]'::jsonb`)
        });

        // Determinar tipo de documento de recepción
        const hasRemito = order.receipts?.some(r => r.document_type === 'delivery_note');
        const hasInvoiceReceipt = order.receipts?.some(r => r.document_type === 'invoice');

        return {
            order: {
                id: order.id,
                number: order.order_number,
                status: order.status,
                supplier: order.supplier?.name || 'N/A',
                total: order.total_amount
            },
            reception: {
                status: receivedItems === totalItems ? 'complete' : receivedItems > 0 ? 'partial' : 'pending',
                items_total: totalItems,
                items_received: receivedItems,
                document_type: hasRemito ? 'remito' : hasInvoiceReceipt ? 'factura' : 'pendiente',
                receipts: (order.receipts || []).map(r => ({
                    id: r.id, number: r.receipt_number, date: r.receipt_date,
                    status: r.status, type: r.document_type
                }))
            },
            invoicing: {
                status: invoices.length > 0
                    ? invoices.every(i => i.matching_status === 'matched') ? 'matched' : 'pending_match'
                    : 'no_invoice',
                invoices: invoices.map(i => ({
                    id: i.id, number: i.invoice_number, total: i.total_amount,
                    status: i.status, matching: i.matching_status
                }))
            },
            payment: {
                status: order.payment_status || 'pending',
                paid_amount: order.paid_amount || 0,
                pending_amount: parseFloat(order.total_amount || 0) - parseFloat(order.paid_amount || 0)
            },
            circuit_complete: order.status === 'closed_complete',
            next_action: this.getNextAction(order, invoices)
        };
    }

    /**
     * Determinar la próxima acción requerida para cerrar el circuito
     */
    getNextAction(order, invoices) {
        if (order.status === 'closed_complete') return 'Circuito cerrado';
        if (order.status === 'draft') return 'Enviar OC al proveedor';
        if (order.status === 'sent' || order.status === 'acknowledged') return 'Esperar entrega de mercadería';

        const allReceived = order.items?.every(
            i => parseFloat(i.quantity_received || 0) >= parseFloat(i.quantity_ordered)
        );
        if (!allReceived) return 'Registrar recepción de mercadería';

        if (invoices.length === 0) return 'Cargar factura del proveedor';

        const unmatched = invoices.filter(i => i.matching_status !== 'matched' && i.matching_status !== 'approved_with_tolerance');
        if (unmatched.length > 0) return 'Ejecutar three-way matching';

        const unpaid = invoices.filter(i => i.status !== 'paid');
        if (unpaid.length > 0) return 'Generar orden de pago';

        return 'Cerrar circuito';
    }

    // =========================================================================
    // 6. NUMERACIÓN SEGURA (Sin race conditions)
    // =========================================================================

    /**
     * Generar número secuencial con lock de base de datos (sin race conditions)
     */
    async generateSequentialNumber(companyId, prefix, tableName, columnName, transaction) {
        const [result] = await this.sequelize.query(`
            SELECT ${columnName} FROM ${tableName}
            WHERE company_id = :companyId
            ORDER BY created_at DESC
            LIMIT 1
            FOR UPDATE
        `, {
            replacements: { companyId },
            type: QueryTypes.SELECT,
            transaction
        });

        const lastNumber = result?.[columnName]?.match(new RegExp(`${prefix}-(\\d+)`));
        const nextNum = lastNumber ? parseInt(lastNumber[1]) + 1 : 1;
        return `${prefix}-${String(nextNum).padStart(6, '0')}`;
    }
}

module.exports = P2PIntegrationService;
