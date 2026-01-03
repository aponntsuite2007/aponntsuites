/**
 * WMS Expiry Monitor Service
 * Agente de Monitoreo de Vencimientos y Algoritmo FIFO Estimativo
 *
 * Features:
 * - Monitoreo automático de lotes próximos a vencer
 * - Algoritmo FIFO estimativo para ventas en salón
 * - Integración con sistema de notificaciones
 * - Escalamiento jerárquico de alertas
 */

const db = require('../config/database');
const cron = require('node-cron');

class WMSExpiryMonitorService {

    static isRunning = false;
    static cronJob = null;

    // =========================================================================
    // INICIALIZACIÓN DEL AGENTE
    // =========================================================================

    /**
     * Iniciar el agente de monitoreo
     */
    static start() {
        if (this.cronJob) {
            console.log('[WMS-MONITOR] Agente ya está corriendo');
            return;
        }

        // Ejecutar cada hora
        this.cronJob = cron.schedule('0 * * * *', async () => {
            await this.runExpiryCheck();
        });

        console.log('[WMS-MONITOR] ✅ Agente de monitoreo de vencimientos iniciado');

        // Ejecutar inmediatamente al iniciar
        this.runExpiryCheck();
    }

    /**
     * Detener el agente
     */
    static stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
            console.log('[WMS-MONITOR] Agente detenido');
        }
    }

    // =========================================================================
    // MONITOREO DE VENCIMIENTOS
    // =========================================================================

    /**
     * Ejecutar verificación de vencimientos
     */
    static async runExpiryCheck() {
        if (this.isRunning) {
            console.log('[WMS-MONITOR] Check ya en ejecución, saltando...');
            return;
        }

        this.isRunning = true;
        console.log('[WMS-MONITOR] Iniciando verificación de vencimientos...');

        try {
            // Obtener configuración de todas las empresas con WMS
            const configs = await db.sequelize.query(`
                SELECT mc.*, c.name as company_name
                FROM wms_monitoring_config mc
                JOIN companies c ON mc.company_id = c.company_id
                WHERE mc.expiry_check_enabled = TRUE
            `, { type: db.sequelize.QueryTypes.SELECT });

            const results = {
                companies_checked: 0,
                alerts_created: 0,
                notifications_sent: 0
            };

            for (const config of configs) {
                const companyResult = await this.checkCompanyExpiry(config);
                results.companies_checked++;
                results.alerts_created += companyResult.alerts_created;
                results.notifications_sent += companyResult.notifications_sent;
            }

            // Actualizar timestamp de última ejecución
            await db.sequelize.query(`
                UPDATE wms_monitoring_config SET
                    last_expiry_check_at = NOW(),
                    last_expiry_check_result = $1
            `, { replacements: [JSON.stringify(results)], type: db.sequelize.QueryTypes.UPDATE });

            console.log(`[WMS-MONITOR] ✅ Check completado: ${results.alerts_created} alertas, ${results.notifications_sent} notificaciones`);

        } catch (error) {
            console.error('[WMS-MONITOR] ❌ Error en verificación:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Verificar vencimientos de una empresa
     */
    static async checkCompanyExpiry(config) {
        const result = { alerts_created: 0, notifications_sent: 0 };

        // Buscar lotes próximos a vencer
        const expiringBatches = await db.sequelize.query(`
            SELECT
                sb.id as batch_id,
                sb.stock_id,
                sb.lot_number,
                sb.expiry_date,
                sb.quantity,
                s.product_id,
                s.warehouse_id,
                p.name as product_name,
                p.expiry_alert_days,
                w.name as warehouse_name,
                b.company_id,
                (sb.expiry_date - CURRENT_DATE) as days_to_expiry
            FROM wms_stock_batches sb
            JOIN wms_stock s ON sb.stock_id = s.id
            JOIN wms_products p ON s.product_id = p.id
            JOIN wms_warehouses w ON s.warehouse_id = w.id
            JOIN wms_branches b ON w.branch_id = b.id
            WHERE b.company_id = $1
              AND sb.expiry_date IS NOT NULL
              AND sb.quantity > 0
              AND sb.status = 'active'
              AND sb.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * COALESCE(p.expiry_alert_days, $2)
              AND NOT EXISTS (
                  SELECT 1 FROM wms_expiry_alerts ea
                  WHERE ea.batch_id = sb.id
                    AND ea.status IN ('pending', 'acknowledged')
              )
            ORDER BY sb.expiry_date ASC
        `, {
            replacements: [config.company_id, config.expiry_alert_days_default],
            type: db.sequelize.QueryTypes.SELECT
        });

        for (const batch of expiringBatches) {
            // Determinar tipo de alerta
            let alertType = 'approaching';
            if (batch.days_to_expiry <= 0) {
                alertType = 'expired';
            } else if (batch.days_to_expiry <= config.expiry_imminent_days) {
                alertType = 'imminent';
            }

            // Crear alerta
            const [alert] = await db.sequelize.query(`
                INSERT INTO wms_expiry_alerts (
                    product_id, stock_id, batch_id, warehouse_id,
                    lot_number, expiry_date, quantity_remaining,
                    alert_type, days_to_expiry, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW())
                RETURNING id
            `, {
                replacements: [
                    batch.product_id, batch.stock_id, batch.batch_id, batch.warehouse_id,
                    batch.lot_number, batch.expiry_date, batch.quantity,
                    alertType, batch.days_to_expiry
                ],
                type: db.sequelize.QueryTypes.SELECT
            });

            result.alerts_created++;

            // Crear notificación
            const notificationSent = await this.createExpiryNotification(
                config, batch, alertType, alert.id
            );

            if (notificationSent) {
                result.notifications_sent++;

                // Actualizar alerta con ID de notificación
                await db.sequelize.query(`
                    UPDATE wms_expiry_alerts SET notification_sent = TRUE WHERE id = $1
                `, { replacements: [alert.id], type: db.sequelize.QueryTypes.UPDATE });
            }
        }

        return result;
    }

    /**
     * Crear notificación de vencimiento
     */
    static async createExpiryNotification(config, batch, alertType, alertId) {
        try {
            const priority = alertType === 'expired' ? 'critical' :
                            alertType === 'imminent' ? 'high' : 'medium';

            const title = alertType === 'expired'
                ? `🚨 Producto VENCIDO: ${batch.product_name}`
                : alertType === 'imminent'
                    ? `⚠️ Vencimiento INMINENTE: ${batch.product_name}`
                    : `📦 Próximo a vencer: ${batch.product_name}`;

            const message = `
Producto: ${batch.product_name}
Lote: ${batch.lot_number}
Almacén: ${batch.warehouse_name}
Fecha vencimiento: ${new Date(batch.expiry_date).toLocaleDateString()}
Días restantes: ${batch.days_to_expiry}
Cantidad: ${batch.quantity}
            `.trim();

            // Obtener destinatarios según jerarquía
            const recipients = await this.getAlertRecipients(config, batch.warehouse_id);

            if (recipients.length === 0) {
                console.log(`[WMS-MONITOR] No hay destinatarios para alerta en empresa ${config.company_id}`);
                return false;
            }

            // Crear notificación en sistema unificado
            await db.sequelize.query(`
                INSERT INTO unified_notifications (
                    company_id, notification_type, title, message,
                    priority, metadata, created_at
                ) VALUES ($1, 'wms_expiry_alert', $2, $3, $4, $5, NOW())
            `, {
                replacements: [
                    config.company_id,
                    title,
                    message,
                    priority,
                    JSON.stringify({
                        alert_id: alertId,
                        alert_type: alertType,
                        product_id: batch.product_id,
                        batch_id: batch.batch_id,
                        warehouse_id: batch.warehouse_id,
                        lot_number: batch.lot_number,
                        expiry_date: batch.expiry_date,
                        recipients: recipients
                    })
                ],
                type: db.sequelize.QueryTypes.INSERT
            });

            return true;
        } catch (error) {
            console.error('[WMS-MONITOR] Error creando notificación:', error);
            return false;
        }
    }

    /**
     * Obtener destinatarios de alertas según jerarquía
     */
    static async getAlertRecipients(config, warehouseId) {
        const recipients = [];
        const hierarchy = config.alert_hierarchy || ['warehouse_manager', 'operations_supervisor', 'operations_manager'];

        // Buscar responsable del almacén
        const [warehouse] = await db.sequelize.query(`
            SELECT manager_email FROM wms_warehouses WHERE id = $1
        `, { replacements: [warehouseId], type: db.sequelize.QueryTypes.SELECT });

        if (warehouse?.manager_email) {
            recipients.push({ role: 'warehouse_manager', email: warehouse.manager_email });
        }

        // Buscar usuarios con roles específicos en la empresa
        for (const role of hierarchy) {
            const users = await db.sequelize.query(`
                SELECT u.user_id, u.email, u."firstName", u."lastName"
                FROM users u
                WHERE u.company_id = $1
                  AND u.is_active = TRUE
                  AND (u.role = $2 OR u.position ILIKE $3)
                LIMIT 3
            `, {
                replacements: [config.company_id, role, `%${role.replace('_', ' ')}%`],
                type: db.sequelize.QueryTypes.SELECT
            });

            for (const user of users) {
                if (!recipients.find(r => r.email === user.email)) {
                    recipients.push({
                        role,
                        user_id: user.user_id,
                        email: user.email,
                        name: `${user.firstName} ${user.lastName}`
                    });
                }
            }
        }

        return recipients;
    }

    // =========================================================================
    // ALGORITMO FIFO ESTIMATIVO PARA VENTAS
    // =========================================================================

    /**
     * Registrar venta y asignar lotes FIFO automáticamente
     * (Para usar en POS/Caja cuando no se escanea lote)
     */
    static async allocateSaleFIFO(saleData) {
        const transaction = await db.sequelize.transaction();

        try {
            const allocations = [];

            for (const item of saleData.items) {
                // Obtener stock en el almacén/salón
                const [stock] = await db.sequelize.query(`
                    SELECT s.id as stock_id
                    FROM wms_stock s
                    JOIN wms_warehouses w ON s.warehouse_id = w.id
                    WHERE s.product_id = $1 AND s.warehouse_id = $2
                `, {
                    replacements: [item.product_id, saleData.warehouse_id],
                    type: db.sequelize.QueryTypes.SELECT,
                    transaction
                });

                if (!stock) {
                    throw new Error(`Stock no encontrado para producto ${item.product_id}`);
                }

                // Obtener lotes ordenados por FIFO (fecha entrada o vencimiento)
                const batches = await db.sequelize.query(`
                    SELECT * FROM wms_get_batches_fifo($1, 'entry_date')
                `, { replacements: [stock.stock_id], type: db.sequelize.QueryTypes.SELECT, transaction });

                let remainingQty = item.quantity;

                for (const batch of batches) {
                    if (remainingQty <= 0) break;

                    const allocateQty = Math.min(remainingQty, batch.quantity_available);

                    // Registrar asignación FIFO
                    await db.sequelize.query(`
                        INSERT INTO wms_sales_fifo_allocation (
                            sale_id, sale_line_id, sale_date,
                            product_id, stock_id, warehouse_id,
                            batch_id, lot_number, quantity_allocated,
                            allocation_method, is_estimated, allocated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'fifo_entry_date', TRUE, NOW())
                    `, {
                        replacements: [
                            saleData.sale_id, item.line_id, saleData.sale_date,
                            item.product_id, stock.stock_id, saleData.warehouse_id,
                            batch.batch_id, batch.lot_number, allocateQty
                        ],
                        type: db.sequelize.QueryTypes.INSERT,
                        transaction
                    });

                    // Descontar del lote
                    await db.sequelize.query(`
                        UPDATE wms_stock_batches SET
                            quantity = quantity - $1,
                            updated_at = NOW()
                        WHERE id = $2
                    `, { replacements: [allocateQty, batch.batch_id], type: db.sequelize.QueryTypes.UPDATE, transaction });

                    // Registrar en lifecycle
                    await db.sequelize.query(`
                        INSERT INTO wms_product_lifecycle (
                            product_id, stock_id, batch_id, lot_number,
                            event_type, quantity, warehouse_id,
                            reference_type, reference_id,
                            is_estimated, estimation_method, performed_at
                        ) VALUES ($1, $2, $3, $4, 'sale_estimated_fifo', $5, $6, 'sale', $7, TRUE, 'fifo_entry_date', NOW())
                    `, {
                        replacements: [
                            item.product_id, stock.stock_id, batch.batch_id, batch.lot_number,
                            allocateQty, saleData.warehouse_id, saleData.sale_id
                        ],
                        type: db.sequelize.QueryTypes.INSERT,
                        transaction
                    });

                    allocations.push({
                        product_id: item.product_id,
                        batch_id: batch.batch_id,
                        lot_number: batch.lot_number,
                        quantity: allocateQty
                    });

                    remainingQty -= allocateQty;
                }

                // Actualizar stock general
                await db.sequelize.query(`
                    UPDATE wms_stock SET
                        quantity_on_hand = quantity_on_hand - $1,
                        last_sale_date = NOW(),
                        updated_at = NOW()
                    WHERE id = $2
                `, { replacements: [item.quantity, stock.stock_id], type: db.sequelize.QueryTypes.UPDATE, transaction });

                if (remainingQty > 0) {
                    console.warn(`[WMS-FIFO] Stock insuficiente para producto ${item.product_id}. Faltante: ${remainingQty}`);
                }
            }

            await transaction.commit();

            return {
                success: true,
                allocations,
                message: 'Venta registrada con asignación FIFO estimativa'
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Registrar devolución y re-ingresar lote
     */
    static async processReturn(returnData) {
        const transaction = await db.sequelize.transaction();

        try {
            for (const item of returnData.items) {
                // Buscar stock
                let [stock] = await db.sequelize.query(`
                    SELECT id FROM wms_stock WHERE product_id = $1 AND warehouse_id = $2
                `, { replacements: [item.product_id, returnData.warehouse_id], type: db.sequelize.QueryTypes.SELECT, transaction });

                if (!stock) {
                    // Crear stock si no existe
                    [stock] = await db.sequelize.query(`
                        INSERT INTO wms_stock (product_id, warehouse_id, quantity_on_hand, created_at, updated_at)
                        VALUES ($1, $2, 0, NOW(), NOW()) RETURNING id
                    `, { replacements: [item.product_id, returnData.warehouse_id], type: db.sequelize.QueryTypes.SELECT, transaction });
                }

                // Si tiene lote, crear o actualizar batch
                if (item.lot_number) {
                    let [batch] = await db.sequelize.query(`
                        SELECT id FROM wms_stock_batches WHERE stock_id = $1 AND lot_number = $2
                    `, { replacements: [stock.id, item.lot_number], type: db.sequelize.QueryTypes.SELECT, transaction });

                    if (batch) {
                        await db.sequelize.query(`
                            UPDATE wms_stock_batches SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2
                        `, { replacements: [item.quantity, batch.id], type: db.sequelize.QueryTypes.UPDATE, transaction });
                    } else {
                        await db.sequelize.query(`
                            INSERT INTO wms_stock_batches (stock_id, lot_number, quantity, expiry_date, received_date, status, notes, created_at)
                            VALUES ($1, $2, $3, $4, NOW(), 'active', 'Reingreso por devolución', NOW())
                        `, {
                            replacements: [stock.id, item.lot_number, item.quantity, item.expiry_date],
                            type: db.sequelize.QueryTypes.INSERT,
                            transaction
                        });
                    }
                }

                // Actualizar stock general
                await db.sequelize.query(`
                    UPDATE wms_stock SET quantity_on_hand = quantity_on_hand + $1, updated_at = NOW() WHERE id = $2
                `, { replacements: [item.quantity, stock.id], type: db.sequelize.QueryTypes.UPDATE, transaction });

                // Registrar en lifecycle
                await db.sequelize.query(`
                    INSERT INTO wms_product_lifecycle (
                        product_id, stock_id, lot_number, event_type, quantity,
                        warehouse_id, reference_type, reference_id, reason, performed_at
                    ) VALUES ($1, $2, $3, 'return_received', $4, $5, 'return', $6, $7, NOW())
                `, {
                    replacements: [
                        item.product_id, stock.id, item.lot_number, item.quantity,
                        returnData.warehouse_id, returnData.return_id, returnData.reason
                    ],
                    type: db.sequelize.QueryTypes.INSERT,
                    transaction
                });
            }

            await transaction.commit();

            return { success: true, message: 'Devolución procesada correctamente' };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    // =========================================================================
    // CONSULTAS Y REPORTES
    // =========================================================================

    /**
     * Obtener alertas de vencimiento pendientes
     */
    static async getPendingAlerts(companyId, warehouseId = null) {
        let query = `
            SELECT ea.*,
                   p.name as product_name,
                   p.internal_code as product_code,
                   w.name as warehouse_name
            FROM wms_expiry_alerts ea
            JOIN wms_products p ON ea.product_id = p.id
            JOIN wms_warehouses w ON ea.warehouse_id = w.id
            JOIN wms_branches b ON w.branch_id = b.id
            WHERE b.company_id = $1
              AND ea.status = 'pending'
        `;
        const replacements = [companyId];

        if (warehouseId) {
            query += ' AND ea.warehouse_id = $2';
            replacements.push(warehouseId);
        }

        query += ' ORDER BY ea.expiry_date ASC';

        return await db.sequelize.query(query, {
            replacements,
            type: db.sequelize.QueryTypes.SELECT
        });
    }

    /**
     * Obtener historial de trazabilidad de un producto/lote
     */
    static async getProductTraceability(productId, batchId = null, companyId) {
        let query = `
            SELECT pl.*,
                   p.name as product_name,
                   sw.name as source_warehouse_name,
                   dw.name as destination_warehouse_name,
                   u."firstName" || ' ' || u."lastName" as performed_by_name
            FROM wms_product_lifecycle pl
            JOIN wms_products p ON pl.product_id = p.id
            LEFT JOIN wms_warehouses sw ON pl.source_warehouse_id = sw.id
            LEFT JOIN wms_warehouses dw ON pl.destination_warehouse_id = dw.id
            LEFT JOIN wms_warehouses w ON pl.warehouse_id = w.id
            LEFT JOIN wms_branches b ON w.branch_id = b.id OR sw.branch_id = b.id
            LEFT JOIN users u ON pl.performed_by = u.user_id
            WHERE pl.product_id = $1
              AND (b.company_id = $2 OR b.company_id IS NULL)
        `;
        const replacements = [productId, companyId];

        if (batchId) {
            query += ' AND pl.batch_id = $3';
            replacements.push(batchId);
        }

        query += ' ORDER BY pl.performed_at DESC';

        return await db.sequelize.query(query, {
            replacements,
            type: db.sequelize.QueryTypes.SELECT
        });
    }

    /**
     * Obtener resumen de stock por vencimiento
     */
    static async getExpiryReport(companyId, warehouseId = null, days = 30) {
        let query = `
            SELECT
                p.id as product_id,
                p.name as product_name,
                p.internal_code,
                w.id as warehouse_id,
                w.name as warehouse_name,
                sb.lot_number,
                sb.expiry_date,
                sb.quantity,
                (sb.expiry_date - CURRENT_DATE) as days_to_expiry,
                CASE
                    WHEN sb.expiry_date <= CURRENT_DATE THEN 'expired'
                    WHEN sb.expiry_date <= CURRENT_DATE + 7 THEN 'imminent'
                    WHEN sb.expiry_date <= CURRENT_DATE + $3 THEN 'approaching'
                    ELSE 'ok'
                END as status
            FROM wms_stock_batches sb
            JOIN wms_stock s ON sb.stock_id = s.id
            JOIN wms_products p ON s.product_id = p.id
            JOIN wms_warehouses w ON s.warehouse_id = w.id
            JOIN wms_branches b ON w.branch_id = b.id
            WHERE b.company_id = $1
              AND sb.expiry_date IS NOT NULL
              AND sb.quantity > 0
              AND sb.expiry_date <= CURRENT_DATE + $3
        `;
        const replacements = [companyId];

        if (warehouseId) {
            query += ' AND w.id = $2';
            replacements.push(warehouseId);
            replacements.push(days);
        } else {
            replacements.push(days);
        }

        query += ' ORDER BY sb.expiry_date ASC';

        return await db.sequelize.query(query, {
            replacements,
            type: db.sequelize.QueryTypes.SELECT
        });
    }

    /**
     * Reconocer alerta (marcar como vista)
     */
    static async acknowledgeAlert(alertId, userId) {
        await db.sequelize.query(`
            UPDATE wms_expiry_alerts SET
                status = 'acknowledged',
                acknowledged_by = $1,
                acknowledged_at = NOW(),
                updated_at = NOW()
            WHERE id = $2
        `, { replacements: [userId, alertId], type: db.sequelize.QueryTypes.UPDATE });

        return { success: true };
    }

    /**
     * Resolver alerta
     */
    static async resolveAlert(alertId, userId, notes) {
        await db.sequelize.query(`
            UPDATE wms_expiry_alerts SET
                status = 'resolved',
                resolution_notes = $1,
                updated_at = NOW()
            WHERE id = $2
        `, { replacements: [notes, alertId], type: db.sequelize.QueryTypes.UPDATE });

        return { success: true };
    }
}

module.exports = WMSExpiryMonitorService;
