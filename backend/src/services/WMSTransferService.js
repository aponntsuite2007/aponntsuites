/**
 * WMS Transfer Service
 * Sistema de Transferencias entre Depósitos con Trazabilidad por Lotes
 *
 * Features:
 * - Transferencias multi-línea (una línea por lote)
 * - Bloqueo concurrente de stock (reservas hasta confirmar/cancelar)
 * - Verificación FIFO con alertas para salón de ventas
 * - Flujo completo: draft → approved → dispatched → received → confirmed
 * - Historial de trazabilidad
 */

const db = require('../config/database');
const { Op } = require('sequelize');

class WMSTransferService {

    // =========================================================================
    // TRANSFERENCIAS - CRUD
    // =========================================================================

    /**
     * Crear nueva transferencia
     */
    static async createTransfer(companyId, userId, data) {
        const transaction = await db.sequelize.transaction();

        try {
            // Validar almacenes
            const sourceWarehouse = await this.validateWarehouse(data.source_warehouse_id, companyId, transaction);
            const destWarehouse = await this.validateWarehouse(data.destination_warehouse_id, companyId, transaction);

            if (sourceWarehouse.id === destWarehouse.id) {
                throw new Error('El almacén origen y destino no pueden ser el mismo');
            }

            // Generar número de transferencia
            const [transferNumber] = await db.sequelize.query(
                'SELECT wms_generate_transfer_number($1) as number',
                { replacements: [companyId], type: db.sequelize.QueryTypes.SELECT, transaction }
            );

            // Crear transferencia
            const [transfer] = await db.sequelize.query(`
                INSERT INTO wms_transfers (
                    transfer_number, source_warehouse_id, destination_warehouse_id,
                    status, created_by, transfer_reason, notes, priority,
                    expected_delivery_date, created_at, updated_at
                ) VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, NOW(), NOW())
                RETURNING *
            `, {
                replacements: [
                    transferNumber.number,
                    data.source_warehouse_id,
                    data.destination_warehouse_id,
                    userId,
                    data.transfer_reason || null,
                    data.notes || null,
                    data.priority || 'normal',
                    data.expected_delivery_date || null
                ],
                type: db.sequelize.QueryTypes.SELECT,
                transaction
            });

            // Agregar líneas si se proporcionan
            if (data.lines && data.lines.length > 0) {
                await this.addTransferLines(transfer.id, data.lines, userId, destWarehouse.is_sales_point, transaction);
            }

            await transaction.commit();

            return await this.getTransferById(transfer.id, companyId);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Agregar líneas a una transferencia
     */
    static async addTransferLines(transferId, lines, userId, isDestinationShowroom, transaction) {
        const fifoViolations = [];

        for (const line of lines) {
            // Validar stock disponible
            const stock = await this.getStockForProduct(line.product_id, line.source_warehouse_id || line.source_stock_id, transaction);

            if (!stock) {
                throw new Error(`Producto ${line.product_id} no encontrado en el almacén origen`);
            }

            // Si tiene lote, validar disponibilidad del lote específico
            if (line.batch_id) {
                const [available] = await db.sequelize.query(
                    'SELECT wms_get_available_stock($1, $2) as qty',
                    { replacements: [stock.id, line.batch_id], type: db.sequelize.QueryTypes.SELECT, transaction }
                );

                if (available.qty < line.quantity_requested) {
                    const batch = await this.getBatchInfo(line.batch_id, transaction);
                    throw new Error(
                        `Stock insuficiente para lote ${batch?.lot_number || line.batch_id}. ` +
                        `Disponible: ${available.qty}, Solicitado: ${line.quantity_requested}`
                    );
                }

                // Verificar FIFO si destino es showroom
                if (isDestinationShowroom) {
                    const [fifoCheck] = await db.sequelize.query(
                        'SELECT * FROM wms_check_fifo_violation($1, $2, $3)',
                        { replacements: [stock.id, line.batch_id, true], type: db.sequelize.QueryTypes.SELECT, transaction }
                    );

                    if (fifoCheck && fifoCheck.has_violation) {
                        fifoViolations.push({
                            product_id: line.product_id,
                            selected_batch_id: line.batch_id,
                            recommended_batch_id: fifoCheck.recommended_batch_id,
                            recommended_lot_number: fifoCheck.recommended_lot_number,
                            recommended_expiry_date: fifoCheck.recommended_expiry_date,
                            days_difference: fifoCheck.days_difference
                        });
                    }
                }

                // Crear reserva de stock
                await this.createStockReservation(
                    stock.id, line.batch_id, line.quantity_requested,
                    userId, 'transfer', 'wms_transfers', transferId, transaction
                );
            } else {
                // Sin lote - validar stock general
                const [available] = await db.sequelize.query(
                    'SELECT wms_get_available_stock($1, NULL) as qty',
                    { replacements: [stock.id], type: db.sequelize.QueryTypes.SELECT, transaction }
                );

                if (available.qty < line.quantity_requested) {
                    throw new Error(
                        `Stock insuficiente. Disponible: ${available.qty}, Solicitado: ${line.quantity_requested}`
                    );
                }

                // Reserva sin lote
                await this.createStockReservation(
                    stock.id, null, line.quantity_requested,
                    userId, 'transfer', 'wms_transfers', transferId, transaction
                );
            }

            // Obtener info del lote para la línea
            const batchInfo = line.batch_id ? await this.getBatchInfo(line.batch_id, transaction) : null;

            // Insertar línea
            await db.sequelize.query(`
                INSERT INTO wms_transfer_lines (
                    transfer_id, product_id, source_stock_id, source_batch_id,
                    quantity_requested, lot_number, expiry_date, notes, line_status,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW(), NOW())
            `, {
                replacements: [
                    transferId,
                    line.product_id,
                    stock.id,
                    line.batch_id || null,
                    line.quantity_requested,
                    batchInfo?.lot_number || line.lot_number || null,
                    batchInfo?.expiry_date || line.expiry_date || null,
                    line.notes || null
                ],
                type: db.sequelize.QueryTypes.INSERT,
                transaction
            });
        }

        // Registrar violaciones FIFO si las hay
        if (fifoViolations.length > 0) {
            for (const violation of fifoViolations) {
                await db.sequelize.query(`
                    INSERT INTO wms_fifo_violations (
                        transfer_id, product_id, selected_batch_id,
                        recommended_batch_id, recommended_lot_number,
                        recommended_expiry_date, days_difference, status, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
                `, {
                    replacements: [
                        transferId,
                        violation.product_id,
                        violation.selected_batch_id,
                        violation.recommended_batch_id,
                        violation.recommended_lot_number,
                        violation.recommended_expiry_date,
                        violation.days_difference
                    ],
                    type: db.sequelize.QueryTypes.INSERT,
                    transaction
                });
            }

            // Actualizar transferencia con warning FIFO
            await db.sequelize.query(`
                UPDATE wms_transfers SET fifo_warning_details = $1 WHERE id = $2
            `, {
                replacements: [JSON.stringify(fifoViolations), transferId],
                type: db.sequelize.QueryTypes.UPDATE,
                transaction
            });
        }

        return fifoViolations;
    }

    /**
     * Obtener transferencia por ID
     */
    static async getTransferById(transferId, companyId) {
        const [transfer] = await db.sequelize.query(`
            SELECT t.*,
                   sw.name as source_warehouse_name,
                   dw.name as destination_warehouse_name,
                   dw.is_sales_point as destination_is_showroom,
                   u_created."firstName" || ' ' || u_created."lastName" as created_by_name
            FROM wms_transfers t
            JOIN wms_warehouses sw ON t.source_warehouse_id = sw.id
            JOIN wms_warehouses dw ON t.destination_warehouse_id = dw.id
            JOIN wms_branches sb ON sw.branch_id = sb.id
            LEFT JOIN users u_created ON t.created_by = u_created.user_id
            WHERE t.id = $1 AND sb.company_id = $2
        `, { replacements: [transferId, companyId], type: db.sequelize.QueryTypes.SELECT });

        if (!transfer) {
            throw new Error('Transferencia no encontrada');
        }

        // Obtener líneas
        const lines = await db.sequelize.query(`
            SELECT tl.*,
                   p.name as product_name,
                   p.internal_code as product_code
            FROM wms_transfer_lines tl
            JOIN wms_products p ON tl.product_id = p.id
            WHERE tl.transfer_id = $1
            ORDER BY tl.id
        `, { replacements: [transferId], type: db.sequelize.QueryTypes.SELECT });

        // Obtener violaciones FIFO
        const fifoViolations = await db.sequelize.query(`
            SELECT * FROM wms_fifo_violations WHERE transfer_id = $1
        `, { replacements: [transferId], type: db.sequelize.QueryTypes.SELECT });

        return {
            ...transfer,
            lines,
            fifo_violations: fifoViolations
        };
    }

    /**
     * Listar transferencias
     */
    static async listTransfers(companyId, filters = {}) {
        let whereClause = 'WHERE sb.company_id = $1';
        const replacements = [companyId];
        let paramIndex = 2;

        if (filters.status) {
            whereClause += ` AND t.status = $${paramIndex}`;
            replacements.push(filters.status);
            paramIndex++;
        }

        if (filters.source_warehouse_id) {
            whereClause += ` AND t.source_warehouse_id = $${paramIndex}`;
            replacements.push(filters.source_warehouse_id);
            paramIndex++;
        }

        if (filters.destination_warehouse_id) {
            whereClause += ` AND t.destination_warehouse_id = $${paramIndex}`;
            replacements.push(filters.destination_warehouse_id);
            paramIndex++;
        }

        if (filters.from_date) {
            whereClause += ` AND t.created_at >= $${paramIndex}`;
            replacements.push(filters.from_date);
            paramIndex++;
        }

        if (filters.to_date) {
            whereClause += ` AND t.created_at <= $${paramIndex}`;
            replacements.push(filters.to_date);
            paramIndex++;
        }

        const transfers = await db.sequelize.query(`
            SELECT t.*,
                   sw.name as source_warehouse_name,
                   dw.name as destination_warehouse_name,
                   COUNT(tl.id) as total_lines,
                   SUM(tl.quantity_requested) as total_quantity
            FROM wms_transfers t
            JOIN wms_warehouses sw ON t.source_warehouse_id = sw.id
            JOIN wms_warehouses dw ON t.destination_warehouse_id = dw.id
            JOIN wms_branches sb ON sw.branch_id = sb.id
            LEFT JOIN wms_transfer_lines tl ON tl.transfer_id = t.id
            ${whereClause}
            GROUP BY t.id, sw.name, dw.name
            ORDER BY t.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, {
            replacements: [...replacements, filters.limit || 50, filters.offset || 0],
            type: db.sequelize.QueryTypes.SELECT
        });

        return transfers;
    }

    // =========================================================================
    // FLUJO DE ESTADOS
    // =========================================================================

    /**
     * Aprobar transferencia
     */
    static async approveTransfer(transferId, companyId, userId) {
        const transfer = await this.getTransferById(transferId, companyId);

        if (transfer.status !== 'draft' && transfer.status !== 'pending_approval') {
            throw new Error(`No se puede aprobar una transferencia en estado: ${transfer.status}`);
        }

        // Verificar si hay violaciones FIFO pendientes
        if (transfer.fifo_violations && transfer.fifo_violations.length > 0) {
            const pending = transfer.fifo_violations.filter(v => v.status === 'pending');
            if (pending.length > 0) {
                throw new Error('Hay alertas FIFO pendientes de resolver. Debe ignorarlas explícitamente o corregir los lotes.');
            }
        }

        await db.sequelize.query(`
            UPDATE wms_transfers SET
                status = 'approved',
                approved_by = $1,
                approved_at = NOW(),
                updated_at = NOW()
            WHERE id = $2
        `, { replacements: [userId, transferId], type: db.sequelize.QueryTypes.UPDATE });

        await this.logLifecycleEvent(transfer, 'transfer_approved', userId);

        return await this.getTransferById(transferId, companyId);
    }

    /**
     * Ignorar alertas FIFO
     */
    static async ignoreFifoViolations(transferId, companyId, userId, reason) {
        const transfer = await this.getTransferById(transferId, companyId);

        if (transfer.status !== 'draft' && transfer.status !== 'pending_approval') {
            throw new Error('Solo se pueden ignorar alertas FIFO en transferencias en borrador');
        }

        await db.sequelize.query(`
            UPDATE wms_fifo_violations SET
                status = 'ignored',
                ignored_by = $1,
                ignored_at = NOW(),
                ignore_reason = $2
            WHERE transfer_id = $3 AND status = 'pending'
        `, { replacements: [userId, reason, transferId], type: db.sequelize.QueryTypes.UPDATE });

        await db.sequelize.query(`
            UPDATE wms_transfers SET
                fifo_warnings_ignored = TRUE,
                updated_at = NOW()
            WHERE id = $1
        `, { replacements: [transferId], type: db.sequelize.QueryTypes.UPDATE });

        // Crear notificación de escalamiento
        await this.createFifoEscalationNotification(transfer, userId, reason);

        return await this.getTransferById(transferId, companyId);
    }

    /**
     * Despachar transferencia
     */
    static async dispatchTransfer(transferId, companyId, userId, dispatchData = {}) {
        const transaction = await db.sequelize.transaction();

        try {
            const transfer = await this.getTransferById(transferId, companyId);

            if (transfer.status !== 'approved') {
                throw new Error(`No se puede despachar una transferencia en estado: ${transfer.status}`);
            }

            // Actualizar cantidades despachadas
            for (const line of transfer.lines) {
                const dispatchedQty = dispatchData.lines?.[line.id]?.quantity_dispatched ?? line.quantity_requested;

                await db.sequelize.query(`
                    UPDATE wms_transfer_lines SET
                        quantity_dispatched = $1,
                        line_status = 'dispatched',
                        updated_at = NOW()
                    WHERE id = $2
                `, { replacements: [dispatchedQty, line.id], type: db.sequelize.QueryTypes.UPDATE, transaction });

                // Registrar en lifecycle
                await this.logProductMovement(
                    line.product_id, line.source_stock_id, line.source_batch_id,
                    'transfer_dispatched', dispatchedQty,
                    transfer.source_warehouse_id, transfer.destination_warehouse_id,
                    'wms_transfers', transferId, transfer.transfer_number,
                    userId, transaction
                );
            }

            await db.sequelize.query(`
                UPDATE wms_transfers SET
                    status = 'dispatched',
                    dispatched_by = $1,
                    dispatched_at = NOW(),
                    updated_at = NOW()
                WHERE id = $2
            `, { replacements: [userId, transferId], type: db.sequelize.QueryTypes.UPDATE, transaction });

            await transaction.commit();

            return await this.getTransferById(transferId, companyId);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Recibir transferencia
     */
    static async receiveTransfer(transferId, companyId, userId, receptionData = {}) {
        const transaction = await db.sequelize.transaction();

        try {
            const transfer = await this.getTransferById(transferId, companyId);

            if (transfer.status !== 'dispatched' && transfer.status !== 'in_transit') {
                throw new Error(`No se puede recibir una transferencia en estado: ${transfer.status}`);
            }

            // Actualizar cantidades recibidas
            for (const line of transfer.lines) {
                const lineData = receptionData.lines?.[line.id] || {};
                const receivedQty = lineData.quantity_received ?? line.quantity_dispatched;

                await db.sequelize.query(`
                    UPDATE wms_transfer_lines SET
                        quantity_received = $1,
                        difference_reason = $2,
                        line_status = 'received',
                        updated_at = NOW()
                    WHERE id = $3
                `, {
                    replacements: [receivedQty, lineData.difference_reason || null, line.id],
                    type: db.sequelize.QueryTypes.UPDATE,
                    transaction
                });
            }

            await db.sequelize.query(`
                UPDATE wms_transfers SET
                    status = 'received',
                    received_by = $1,
                    received_at = NOW(),
                    reception_notes = $2,
                    updated_at = NOW()
                WHERE id = $3
            `, {
                replacements: [userId, receptionData.notes || null, transferId],
                type: db.sequelize.QueryTypes.UPDATE,
                transaction
            });

            await transaction.commit();

            return await this.getTransferById(transferId, companyId);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Confirmar transferencia (ejecuta movimientos de stock)
     */
    static async confirmTransfer(transferId, companyId, userId) {
        const transaction = await db.sequelize.transaction();

        try {
            const transfer = await this.getTransferById(transferId, companyId);

            if (transfer.status !== 'received') {
                throw new Error(`No se puede confirmar una transferencia en estado: ${transfer.status}`);
            }

            for (const line of transfer.lines) {
                const confirmedQty = line.quantity_received;

                // 1. Descontar del origen
                await this.decreaseStock(
                    line.source_stock_id, line.source_batch_id, confirmedQty, transaction
                );

                // 2. Aumentar en destino
                await this.increaseStockInDestination(
                    line.product_id, transfer.destination_warehouse_id,
                    line.source_batch_id, confirmedQty, line.lot_number, line.expiry_date,
                    transaction
                );

                // 3. Liberar reserva
                await this.releaseReservation(
                    line.source_stock_id, line.source_batch_id,
                    'wms_transfers', transferId, transaction
                );

                // 4. Registrar en lifecycle
                await this.logProductMovement(
                    line.product_id, line.source_stock_id, line.source_batch_id,
                    'transfer_confirmed', confirmedQty,
                    transfer.source_warehouse_id, transfer.destination_warehouse_id,
                    'wms_transfers', transferId, transfer.transfer_number,
                    userId, transaction
                );

                // 5. Actualizar línea
                await db.sequelize.query(`
                    UPDATE wms_transfer_lines SET
                        quantity_confirmed = $1,
                        line_status = 'confirmed',
                        updated_at = NOW()
                    WHERE id = $2
                `, { replacements: [confirmedQty, line.id], type: db.sequelize.QueryTypes.UPDATE, transaction });
            }

            // Actualizar transferencia
            await db.sequelize.query(`
                UPDATE wms_transfers SET
                    status = 'confirmed',
                    confirmed_by = $1,
                    confirmed_at = NOW(),
                    updated_at = NOW()
                WHERE id = $2
            `, { replacements: [userId, transferId], type: db.sequelize.QueryTypes.UPDATE, transaction });

            await transaction.commit();

            return await this.getTransferById(transferId, companyId);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Cancelar transferencia
     */
    static async cancelTransfer(transferId, companyId, userId, reason) {
        const transaction = await db.sequelize.transaction();

        try {
            const transfer = await this.getTransferById(transferId, companyId);

            const cancellableStatuses = ['draft', 'pending_approval', 'approved', 'dispatched'];
            if (!cancellableStatuses.includes(transfer.status)) {
                throw new Error(`No se puede cancelar una transferencia en estado: ${transfer.status}`);
            }

            // Liberar todas las reservas
            for (const line of transfer.lines) {
                await this.releaseReservation(
                    line.source_stock_id, line.source_batch_id,
                    'wms_transfers', transferId, transaction
                );
            }

            await db.sequelize.query(`
                UPDATE wms_transfers SET
                    status = 'cancelled',
                    cancelled_by = $1,
                    cancelled_at = NOW(),
                    cancellation_reason = $2,
                    updated_at = NOW()
                WHERE id = $3
            `, { replacements: [userId, reason, transferId], type: db.sequelize.QueryTypes.UPDATE, transaction });

            await transaction.commit();

            return await this.getTransferById(transferId, companyId);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    // =========================================================================
    // STOCK Y RESERVAS
    // =========================================================================

    /**
     * Crear reserva de stock
     */
    static async createStockReservation(stockId, batchId, quantity, userId, type, refType, refId, transaction) {
        await db.sequelize.query(`
            INSERT INTO wms_stock_reservations (
                stock_id, batch_id, quantity_reserved,
                reserved_by, reservation_type, reference_type, reference_id,
                status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())
        `, {
            replacements: [stockId, batchId, quantity, userId, type, refType, refId],
            type: db.sequelize.QueryTypes.INSERT,
            transaction
        });
    }

    /**
     * Liberar reserva de stock
     */
    static async releaseReservation(stockId, batchId, refType, refId, transaction) {
        await db.sequelize.query(`
            UPDATE wms_stock_reservations SET
                status = 'completed',
                completed_at = NOW()
            WHERE stock_id = $1
              AND ($2::INTEGER IS NULL OR batch_id = $2)
              AND reference_type = $3
              AND reference_id = $4
              AND status = 'active'
        `, {
            replacements: [stockId, batchId, refType, refId],
            type: db.sequelize.QueryTypes.UPDATE,
            transaction
        });
    }

    /**
     * Disminuir stock
     */
    static async decreaseStock(stockId, batchId, quantity, transaction) {
        if (batchId) {
            await db.sequelize.query(`
                UPDATE wms_stock_batches SET
                    quantity = quantity - $1,
                    updated_at = NOW()
                WHERE id = $2
            `, { replacements: [quantity, batchId], type: db.sequelize.QueryTypes.UPDATE, transaction });
        }

        await db.sequelize.query(`
            UPDATE wms_stock SET
                quantity_on_hand = quantity_on_hand - $1,
                last_movement_date = NOW(),
                updated_at = NOW()
            WHERE id = $2
        `, { replacements: [quantity, stockId], type: db.sequelize.QueryTypes.UPDATE, transaction });
    }

    /**
     * Aumentar stock en destino
     */
    static async increaseStockInDestination(productId, warehouseId, sourceBatchId, quantity, lotNumber, expiryDate, transaction) {
        // Buscar o crear stock en destino
        let [destStock] = await db.sequelize.query(`
            SELECT id FROM wms_stock WHERE product_id = $1 AND warehouse_id = $2
        `, { replacements: [productId, warehouseId], type: db.sequelize.QueryTypes.SELECT, transaction });

        if (!destStock) {
            [destStock] = await db.sequelize.query(`
                INSERT INTO wms_stock (product_id, warehouse_id, quantity_on_hand, created_at, updated_at)
                VALUES ($1, $2, 0, NOW(), NOW())
                RETURNING id
            `, { replacements: [productId, warehouseId], type: db.sequelize.QueryTypes.SELECT, transaction });
        }

        // Si hay lote, crear/actualizar batch en destino
        if (lotNumber) {
            // Buscar batch existente con mismo lote
            let [destBatch] = await db.sequelize.query(`
                SELECT id FROM wms_stock_batches
                WHERE stock_id = $1 AND lot_number = $2
            `, { replacements: [destStock.id, lotNumber], type: db.sequelize.QueryTypes.SELECT, transaction });

            if (destBatch) {
                await db.sequelize.query(`
                    UPDATE wms_stock_batches SET
                        quantity = quantity + $1,
                        updated_at = NOW()
                    WHERE id = $2
                `, { replacements: [quantity, destBatch.id], type: db.sequelize.QueryTypes.UPDATE, transaction });
            } else {
                await db.sequelize.query(`
                    INSERT INTO wms_stock_batches (
                        stock_id, lot_number, quantity, expiry_date,
                        received_date, status, created_at
                    ) VALUES ($1, $2, $3, $4, NOW(), 'active', NOW())
                `, {
                    replacements: [destStock.id, lotNumber, quantity, expiryDate],
                    type: db.sequelize.QueryTypes.INSERT,
                    transaction
                });
            }
        }

        // Actualizar stock general
        await db.sequelize.query(`
            UPDATE wms_stock SET
                quantity_on_hand = quantity_on_hand + $1,
                last_movement_date = NOW(),
                updated_at = NOW()
            WHERE id = $2
        `, { replacements: [quantity, destStock.id], type: db.sequelize.QueryTypes.UPDATE, transaction });
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    static async validateWarehouse(warehouseId, companyId, transaction) {
        const [warehouse] = await db.sequelize.query(`
            SELECT w.*, b.company_id
            FROM wms_warehouses w
            JOIN wms_branches b ON w.branch_id = b.id
            WHERE w.id = $1 AND b.company_id = $2 AND w.is_active = TRUE
        `, { replacements: [warehouseId, companyId], type: db.sequelize.QueryTypes.SELECT, transaction });

        if (!warehouse) {
            throw new Error(`Almacén ${warehouseId} no válido o no pertenece a la empresa`);
        }

        return warehouse;
    }

    static async getStockForProduct(productId, warehouseIdOrStockId, transaction) {
        // Si es stock_id directo
        let [stock] = await db.sequelize.query(`
            SELECT * FROM wms_stock WHERE id = $1
        `, { replacements: [warehouseIdOrStockId], type: db.sequelize.QueryTypes.SELECT, transaction });

        if (!stock) {
            // Buscar por product_id + warehouse_id
            [stock] = await db.sequelize.query(`
                SELECT * FROM wms_stock WHERE product_id = $1 AND warehouse_id = $2
            `, { replacements: [productId, warehouseIdOrStockId], type: db.sequelize.QueryTypes.SELECT, transaction });
        }

        return stock;
    }

    static async getBatchInfo(batchId, transaction) {
        const [batch] = await db.sequelize.query(`
            SELECT * FROM wms_stock_batches WHERE id = $1
        `, { replacements: [batchId], type: db.sequelize.QueryTypes.SELECT, transaction });
        return batch;
    }

    static async logLifecycleEvent(transfer, eventType, userId) {
        // Implementación básica de log
        console.log(`[WMS] Transfer ${transfer.transfer_number}: ${eventType} by ${userId}`);
    }

    static async logProductMovement(productId, stockId, batchId, eventType, quantity, sourceWarehouseId, destWarehouseId, refType, refId, refNumber, userId, transaction) {
        await db.sequelize.query(`
            INSERT INTO wms_product_lifecycle (
                product_id, stock_id, batch_id, event_type, quantity,
                source_warehouse_id, destination_warehouse_id,
                reference_type, reference_id, reference_number,
                performed_by, performed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        `, {
            replacements: [
                productId, stockId, batchId, eventType, quantity,
                sourceWarehouseId, destWarehouseId,
                refType, refId, refNumber, userId
            ],
            type: db.sequelize.QueryTypes.INSERT,
            transaction
        });
    }

    static async createFifoEscalationNotification(transfer, userId, reason) {
        // Integrar con sistema de notificaciones
        // Por ahora solo log
        console.log(`[WMS] FIFO Violation ignored on transfer ${transfer.transfer_number}: ${reason}`);
        // TODO: Crear notificación en unified_notifications siguiendo jerarquía
    }

    // =========================================================================
    // CONSULTAS DE STOCK DISPONIBLE
    // =========================================================================

    /**
     * Obtener lotes disponibles para un producto en un almacén (ordenados FIFO)
     */
    static async getAvailableBatches(productId, warehouseId, orderBy = 'expiry_date') {
        const [stock] = await db.sequelize.query(`
            SELECT id FROM wms_stock WHERE product_id = $1 AND warehouse_id = $2
        `, { replacements: [productId, warehouseId], type: db.sequelize.QueryTypes.SELECT });

        if (!stock) {
            return [];
        }

        const batches = await db.sequelize.query(`
            SELECT * FROM wms_get_batches_fifo($1, $2)
        `, { replacements: [stock.id, orderBy], type: db.sequelize.QueryTypes.SELECT });

        return batches;
    }

    /**
     * Obtener stock total disponible (incluyendo reservas)
     */
    static async getStockAvailability(warehouseId, productId = null) {
        let query = `
            SELECT * FROM wms_stock_availability
            WHERE warehouse_id = $1
        `;
        const replacements = [warehouseId];

        if (productId) {
            query += ' AND product_id = $2';
            replacements.push(productId);
        }

        query += ' ORDER BY days_to_expiry ASC NULLS LAST';

        return await db.sequelize.query(query, {
            replacements,
            type: db.sequelize.QueryTypes.SELECT
        });
    }
}

module.exports = WMSTransferService;
