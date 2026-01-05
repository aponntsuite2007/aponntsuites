/**
 * PickingService.js - Servicio de Picking y Packing
 * Gestión de olas de picking, listas de picking y packing
 * Basado en mejores prácticas de SAP EWM, Oracle WMS, Odoo
 */

const { sequelize } = require('../../config/database');
const { QueryTypes } = require('sequelize');

// Helper para mantener compatibilidad con patrón pool.query
const pool = {
    async query(sql, params = []) {
        // Convertir $1, $2, etc a ? para Sequelize
        let convertedSql = sql;
        if (sql.includes('$1')) {
            convertedSql = sql.replace(/\$(\d+)/g, '?');
        }

        const result = await sequelize.query(convertedSql, {
            replacements: params,
            type: QueryTypes.SELECT
        });
        return { rows: result };
    },
    async connect() {
        return {
            async query(sql, params = []) {
                let convertedSql = sql;
                if (sql.includes('$1')) {
                    convertedSql = sql.replace(/\$(\d+)/g, '?');
                }

                // Detectar tipo de query
                const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
                const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
                const isUpdate = sql.trim().toUpperCase().startsWith('UPDATE');

                let queryType = QueryTypes.SELECT;
                if (isInsert) queryType = QueryTypes.INSERT;
                if (isUpdate) queryType = QueryTypes.UPDATE;

                const result = await sequelize.query(convertedSql, {
                    replacements: params,
                    type: queryType
                });

                // Para INSERT/UPDATE con RETURNING, el resultado está en result[0]
                if ((isInsert || isUpdate) && sql.includes('RETURNING')) {
                    return { rows: Array.isArray(result[0]) ? result[0] : [result[0]] };
                }

                return { rows: Array.isArray(result) ? result : (result[0] || []) };
            },
            release() {}
        };
    }
};

class PickingService {

    // ==================== WAVES (Olas de Picking) ====================

    /**
     * Obtener olas de picking con filtros
     */
    static async getWaves(warehouseId, filters = {}) {
        const { status, dateFrom, dateTo, limit = 50, offset = 0 } = filters;

        let query = `
            SELECT
                w.*,
                COUNT(DISTINCT pl.id) as pick_lists_count,
                SUM(pll.qty_requested) as total_units,
                SUM(CASE WHEN pll.qty_picked = pll.qty_requested THEN 1 ELSE 0 END) as lines_completed
            FROM logistics_waves w
            LEFT JOIN logistics_pick_lists pl ON w.id = pl.wave_id
            LEFT JOIN logistics_pick_list_lines pll ON pl.id = pll.pick_list_id
            WHERE w.warehouse_id = $1
        `;
        const params = [warehouseId];
        let paramIndex = 2;

        if (status) {
            query += ` AND w.status = $${paramIndex++}`;
            params.push(status);
        }
        if (dateFrom) {
            query += ` AND w.created_at >= $${paramIndex++}`;
            params.push(dateFrom);
        }
        if (dateTo) {
            query += ` AND w.created_at <= $${paramIndex++}`;
            params.push(dateTo);
        }

        query += `
            GROUP BY w.id
            ORDER BY w.created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Obtener ola por ID con detalles
     */
    static async getWaveById(id) {
        const waveQuery = `
            SELECT w.*, wh.name as warehouse_name
            FROM logistics_waves w
            JOIN logistics_warehouses wh ON w.warehouse_id = wh.id
            WHERE w.id = $1
        `;
        const waveResult = await pool.query(waveQuery, [id]);
        if (waveResult.rows.length === 0) return null;

        const wave = waveResult.rows[0];

        // Obtener pick lists de la ola
        const pickListsQuery = `
            SELECT
                pl.*,
                u.first_name || ' ' || u.last_name as picker_name,
                COUNT(pll.id) as total_lines,
                SUM(CASE WHEN pll.qty_picked = pll.qty_requested THEN 1 ELSE 0 END) as completed_lines
            FROM logistics_pick_lists pl
            LEFT JOIN users u ON pl.picker_id = u.id
            LEFT JOIN logistics_pick_list_lines pll ON pl.id = pll.pick_list_id
            WHERE pl.wave_id = $1
            GROUP BY pl.id, u.first_name, u.last_name
            ORDER BY pl.sequence
        `;
        const pickListsResult = await pool.query(pickListsQuery, [id]);
        wave.pick_lists = pickListsResult.rows;

        return wave;
    }

    /**
     * Crear ola de picking
     */
    static async createWave(data) {
        const { warehouse_id, company_id, name, wave_type, priority, notes, created_by } = data;

        const query = `
            INSERT INTO logistics_waves (
                warehouse_id, company_id, name, wave_type, priority,
                status, notes, created_by, created_at
            ) VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7, NOW())
            RETURNING *
        `;

        const result = await pool.query(query, [
            warehouse_id, company_id, name, wave_type || 'STANDARD',
            priority || 'NORMAL', notes, created_by
        ]);

        return result.rows[0];
    }

    /**
     * Generar ola automática desde pedidos pendientes
     */
    static async generateWaveFromOrders(warehouseId, companyId, orderIds, options = {}) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const { wave_type = 'BATCH', priority = 'NORMAL', created_by } = options;

            // Crear la ola
            const waveResult = await client.query(`
                INSERT INTO logistics_waves (
                    warehouse_id, company_id, name, wave_type, priority,
                    status, created_by, created_at
                ) VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, NOW())
                RETURNING *
            `, [
                warehouseId, companyId,
                `OLA-${Date.now()}`,
                wave_type, priority, created_by
            ]);

            const wave = waveResult.rows[0];

            // Obtener líneas de pedidos y agrupar por zona para optimizar picking
            const orderLinesQuery = `
                SELECT
                    sol.product_id,
                    sol.quantity,
                    sol.order_id,
                    p.name as product_name,
                    p.sku,
                    lq.location_id,
                    l.zone,
                    l.aisle,
                    l.rack,
                    l.level,
                    l.position,
                    l.picking_sequence
                FROM siac_order_lines sol
                JOIN siac_products p ON sol.product_id = p.id
                LEFT JOIN logistics_quants lq ON sol.product_id = lq.product_id
                    AND lq.warehouse_id = $1 AND lq.quantity > 0
                LEFT JOIN logistics_locations l ON lq.location_id = l.id
                WHERE sol.order_id = ANY($2)
                ORDER BY l.picking_sequence, l.zone, l.aisle, l.rack, l.level
            `;

            const linesResult = await client.query(orderLinesQuery, [warehouseId, orderIds]);

            // Crear pick list
            const pickListResult = await client.query(`
                INSERT INTO logistics_pick_lists (
                    wave_id, warehouse_id, company_id, status,
                    sequence, created_at
                ) VALUES ($1, $2, $3, 'PENDING', 1, NOW())
                RETURNING *
            `, [wave.id, warehouseId, companyId]);

            const pickList = pickListResult.rows[0];

            // Crear líneas de pick list
            let sequence = 1;
            for (const line of linesResult.rows) {
                await client.query(`
                    INSERT INTO logistics_pick_list_lines (
                        pick_list_id, product_id,
                        qty_requested, qty_picked, pick_sequence,
                        status
                    ) VALUES ($1, $2, $3, 0, $4, 'PENDING')
                `, [
                    pickList.id, line.product_id,
                    line.quantity, sequence++
                ]);
            }

            // Actualizar contadores de la ola
            await client.query(`
                UPDATE logistics_waves
                SET total_lines = $2, total_units = $3
                WHERE id = $1
            `, [wave.id, linesResult.rows.length,
                linesResult.rows.reduce((sum, l) => sum + parseFloat(l.quantity), 0)]);

            await client.query('COMMIT');

            return await this.getWaveById(wave.id);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Iniciar ola (asignar pickers)
     */
    static async startWave(waveId, pickerAssignments = []) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Actualizar estado de la ola
            await client.query(`
                UPDATE logistics_waves
                SET status = 'IN_PROGRESS', started_at = NOW()
                WHERE id = $1
            `, [waveId]);

            // Asignar pickers a pick lists
            for (const assignment of pickerAssignments) {
                await client.query(`
                    UPDATE logistics_pick_lists
                    SET picker_id = $2, status = 'ASSIGNED'
                    WHERE id = $1
                `, [assignment.pick_list_id, assignment.picker_id]);
            }

            await client.query('COMMIT');

            return await this.getWaveById(waveId);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Completar ola
     */
    static async completeWave(waveId) {
        const query = `
            UPDATE logistics_waves
            SET status = 'COMPLETED', completed_at = NOW()
            WHERE id = $1
            RETURNING *
        `;
        const result = await pool.query(query, [waveId]);
        return result.rows[0];
    }

    // ==================== PICK LISTS ====================

    /**
     * Obtener pick lists con filtros
     */
    static async getPickLists(warehouseId, filters = {}) {
        const { wave_id, picker_id, status, limit = 50, offset = 0 } = filters;

        let query = `
            SELECT
                pl.*,
                w.name as wave_name,
                u.first_name || ' ' || u.last_name as picker_name,
                COUNT(pll.id) as total_lines,
                SUM(pll.qty_requested) as total_units,
                SUM(pll.qty_picked) as picked_units,
                SUM(CASE WHEN pll.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_lines
            FROM logistics_pick_lists pl
            LEFT JOIN logistics_waves w ON pl.wave_id = w.id
            LEFT JOIN users u ON pl.picker_id = u.id
            LEFT JOIN logistics_pick_list_lines pll ON pl.id = pll.pick_list_id
            WHERE pl.warehouse_id = $1
        `;
        const params = [warehouseId];
        let paramIndex = 2;

        if (wave_id) {
            query += ` AND pl.wave_id = $${paramIndex++}`;
            params.push(wave_id);
        }
        if (picker_id) {
            query += ` AND pl.picker_id = $${paramIndex++}`;
            params.push(picker_id);
        }
        if (status) {
            query += ` AND pl.status = $${paramIndex++}`;
            params.push(status);
        }

        query += `
            GROUP BY pl.id, w.name, u.first_name, u.last_name
            ORDER BY pl.created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Obtener pick list por ID con líneas
     */
    static async getPickListById(id) {
        const pickListQuery = `
            SELECT
                pl.*,
                w.name as wave_name,
                wh.name as warehouse_name,
                u.first_name || ' ' || u.last_name as picker_name
            FROM logistics_pick_lists pl
            LEFT JOIN logistics_waves w ON pl.wave_id = w.id
            JOIN logistics_warehouses wh ON pl.warehouse_id = wh.id
            LEFT JOIN users u ON pl.picker_id = u.id
            WHERE pl.id = $1
        `;
        const pickListResult = await pool.query(pickListQuery, [id]);
        if (pickListResult.rows.length === 0) return null;

        const pickList = pickListResult.rows[0];

        // Obtener líneas ordenadas por secuencia de picking
        const linesQuery = `
            SELECT
                pll.*,
                p.name as product_name,
                p.sku,
                p.barcode,
                l.name as location_name,
                l.barcode as location_barcode,
                l.zone,
                l.aisle,
                l.rack,
                l.level,
                l.position
            FROM logistics_pick_list_lines pll
            JOIN siac_products p ON pll.product_id = p.id
            LEFT JOIN logistics_locations l ON pll.location_id = l.id
            WHERE pll.pick_list_id = $1
            ORDER BY pll.sequence
        `;
        const linesResult = await pool.query(linesQuery, [id]);
        pickList.lines = linesResult.rows;

        return pickList;
    }

    /**
     * Confirmar línea de picking (para escáner móvil)
     */
    static async confirmPickLine(lineId, data) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const { qty_picked, lot_number, serial_numbers, picker_id, notes } = data;

            // Obtener info de la línea
            const lineQuery = await client.query(`
                SELECT pll.*, pl.warehouse_id, pl.company_id
                FROM logistics_pick_list_lines pll
                JOIN logistics_pick_lists pl ON pll.pick_list_id = pl.id
                WHERE pll.id = $1
            `, [lineId]);

            if (lineQuery.rows.length === 0) {
                throw new Error('Línea de picking no encontrada');
            }

            const line = lineQuery.rows[0];

            // Determinar estado
            let status = 'COMPLETED';
            if (qty_picked < line.qty_requested) {
                status = 'PARTIAL';
            } else if (qty_picked === 0) {
                status = 'SKIPPED';
            }

            // Actualizar línea
            await client.query(`
                UPDATE logistics_pick_list_lines
                SET qty_picked = $2,
                    lot_number = $3,
                    serial_numbers = $4,
                    status = $5,
                    notes = $6,
                    picked_at = NOW()
                WHERE id = $1
            `, [lineId, qty_picked, lot_number, serial_numbers, status, notes]);

            // Descontar stock de la ubicación
            if (qty_picked > 0) {
                await client.query(`
                    UPDATE logistics_quants
                    SET quantity = quantity - $3,
                        reserved_quantity = GREATEST(0, reserved_quantity - $3),
                        updated_at = NOW()
                    WHERE location_id = $1 AND product_id = $2
                `, [line.location_id, line.product_id, qty_picked]);

                // Registrar movimiento
                await client.query(`
                    INSERT INTO logistics_inventory_movements (
                        warehouse_id, company_id, product_id,
                        from_location_id, movement_type, quantity,
                        reference_type, reference_id, user_id, created_at
                    ) VALUES ($1, $2, $3, $4, 'PICK', $5, 'PICK_LIST', $6, $7, NOW())
                `, [
                    line.warehouse_id, line.company_id, line.product_id,
                    line.location_id, qty_picked, line.pick_list_id, picker_id
                ]);
            }

            // Verificar si pick list está completa
            const pendingLines = await client.query(`
                SELECT COUNT(*) as count
                FROM logistics_pick_list_lines
                WHERE pick_list_id = $1 AND status IN ('PENDING', 'PARTIAL')
            `, [line.pick_list_id]);

            if (parseInt(pendingLines.rows[0].count) === 0) {
                await client.query(`
                    UPDATE logistics_pick_lists
                    SET status = 'COMPLETED', completed_at = NOW()
                    WHERE id = $1
                `, [line.pick_list_id]);
            }

            await client.query('COMMIT');

            return await this.getPickListById(line.pick_list_id);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ==================== PACKING ====================

    /**
     * Obtener órdenes de empaque
     */
    static async getPackOrders(warehouseId, filters = {}) {
        const { status, dateFrom, dateTo, limit = 50, offset = 0 } = filters;

        let query = `
            SELECT
                po.*,
                u.first_name || ' ' || u.last_name as packer_name,
                COUNT(pkg.id) as packages_count
            FROM logistics_pack_orders po
            LEFT JOIN users u ON po.packer_id = u.id
            LEFT JOIN logistics_packages pkg ON po.id = pkg.pack_order_id
            WHERE po.warehouse_id = $1
        `;
        const params = [warehouseId];
        let paramIndex = 2;

        if (status) {
            query += ` AND po.status = $${paramIndex++}`;
            params.push(status);
        }
        if (dateFrom) {
            query += ` AND po.created_at >= $${paramIndex++}`;
            params.push(dateFrom);
        }
        if (dateTo) {
            query += ` AND po.created_at <= $${paramIndex++}`;
            params.push(dateTo);
        }

        query += `
            GROUP BY po.id, u.first_name, u.last_name
            ORDER BY po.created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Crear orden de empaque desde pick list completada
     */
    static async createPackOrderFromPickList(pickListId, packerId) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Obtener pick list
            const pickList = await this.getPickListById(pickListId);
            if (!pickList || pickList.status !== 'COMPLETED') {
                throw new Error('Pick list no encontrada o no completada');
            }

            // Crear orden de empaque
            const packOrderResult = await client.query(`
                INSERT INTO logistics_pack_orders (
                    warehouse_id, company_id, pick_list_id,
                    packer_id, status, created_at
                ) VALUES ($1, $2, $3, $4, 'PENDING', NOW())
                RETURNING *
            `, [pickList.warehouse_id, pickList.company_id, pickListId, packerId]);

            const packOrder = packOrderResult.rows[0];

            await client.query('COMMIT');

            return packOrder;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Crear paquete en orden de empaque
     */
    static async createPackage(data) {
        const {
            pack_order_id, package_type_id, tracking_number,
            weight, length, width, height, created_by
        } = data;

        const query = `
            INSERT INTO logistics_packages (
                pack_order_id, package_type_id, tracking_number,
                weight, length, width, height, status,
                created_by, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN', $8, NOW())
            RETURNING *
        `;

        const result = await pool.query(query, [
            pack_order_id, package_type_id, tracking_number,
            weight || 0, length || 0, width || 0, height || 0, created_by
        ]);

        return result.rows[0];
    }

    /**
     * Agregar item a paquete
     */
    static async addItemToPackage(packageId, data) {
        const { product_id, quantity, lot_number, serial_number, pick_list_line_id } = data;

        const query = `
            INSERT INTO logistics_package_items (
                package_id, product_id, quantity,
                lot_number, serial_number, pick_list_line_id
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await pool.query(query, [
            packageId, product_id, quantity, lot_number, serial_number, pick_list_line_id
        ]);

        return result.rows[0];
    }

    /**
     * Cerrar paquete
     */
    static async closePackage(packageId, finalWeight) {
        const query = `
            UPDATE logistics_packages
            SET status = 'CLOSED',
                weight = COALESCE($2, weight),
                closed_at = NOW()
            WHERE id = $1
            RETURNING *
        `;
        const result = await pool.query(query, [packageId, finalWeight]);
        return result.rows[0];
    }

    /**
     * Completar orden de empaque
     */
    static async completePackOrder(packOrderId) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Cerrar paquetes abiertos
            await client.query(`
                UPDATE logistics_packages
                SET status = 'CLOSED', closed_at = NOW()
                WHERE pack_order_id = $1 AND status = 'OPEN'
            `, [packOrderId]);

            // Completar orden
            await client.query(`
                UPDATE logistics_pack_orders
                SET status = 'COMPLETED', completed_at = NOW()
                WHERE id = $1
            `, [packOrderId]);

            await client.query('COMMIT');

            // Retornar orden actualizada
            const result = await pool.query(`
                SELECT po.*, COUNT(pkg.id) as packages_count
                FROM logistics_pack_orders po
                LEFT JOIN logistics_packages pkg ON po.id = pkg.pack_order_id
                WHERE po.id = $1
                GROUP BY po.id
            `, [packOrderId]);

            return result.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ==================== PACKAGE TYPES ====================

    /**
     * Obtener tipos de paquete
     */
    static async getPackageTypes(companyId) {
        const query = `
            SELECT * FROM logistics_package_types
            WHERE company_id = $1 AND active = true
            ORDER BY name
        `;
        const result = await pool.query(query, [companyId]);
        return result.rows;
    }

    /**
     * Crear tipo de paquete
     */
    static async createPackageType(data) {
        const {
            company_id, code, name, max_weight,
            max_length, max_width, max_height, max_volume,
            tare_weight
        } = data;

        const query = `
            INSERT INTO logistics_package_types (
                company_id, code, name, max_weight,
                max_length, max_width, max_height, max_volume,
                tare_weight, active, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW())
            RETURNING *
        `;

        const result = await pool.query(query, [
            company_id, code, name, max_weight,
            max_length, max_width, max_height, max_volume,
            tare_weight || 0
        ]);

        return result.rows[0];
    }

    // ==================== KPIs DE PICKING ====================

    /**
     * Obtener KPIs de picking
     */
    static async getPickingKPIs(warehouseId, dateRange = {}) {
        const { dateFrom, dateTo } = dateRange;

        let dateFilter = '';
        const params = [warehouseId];

        if (dateFrom && dateTo) {
            dateFilter = 'AND pll.picked_at BETWEEN $2 AND $3';
            params.push(dateFrom, dateTo);
        }

        const query = `
            SELECT
                COUNT(DISTINCT pl.id) as total_pick_lists,
                COUNT(pll.id) as total_lines_picked,
                SUM(pll.qty_picked) as total_units_picked,
                AVG(EXTRACT(EPOCH FROM (pll.picked_at - pl.started_at))/60) as avg_pick_time_minutes,
                COUNT(DISTINCT pl.picker_id) as active_pickers,
                SUM(CASE WHEN pll.status = 'COMPLETED' THEN 1 ELSE 0 END)::float /
                    NULLIF(COUNT(pll.id), 0) * 100 as pick_accuracy_percent
            FROM logistics_pick_lists pl
            JOIN logistics_pick_list_lines pll ON pl.id = pll.pick_list_id
            WHERE pl.warehouse_id = $1
            AND pll.status IN ('COMPLETED', 'PARTIAL')
            ${dateFilter}
        `;

        const result = await pool.query(query, params);

        // Obtener líneas por hora por picker
        const productivityQuery = `
            SELECT
                u.id as picker_id,
                u.first_name || ' ' || u.last_name as picker_name,
                COUNT(pll.id) as lines_picked,
                SUM(pll.qty_picked) as units_picked,
                COUNT(pll.id)::float / NULLIF(EXTRACT(EPOCH FROM (MAX(pll.picked_at) - MIN(pll.picked_at)))/3600, 0) as lines_per_hour
            FROM logistics_pick_list_lines pll
            JOIN logistics_pick_lists pl ON pll.pick_list_id = pl.id
            JOIN users u ON pl.picker_id = u.id
            WHERE pl.warehouse_id = $1
            AND pll.status = 'COMPLETED'
            ${dateFilter}
            GROUP BY u.id, u.first_name, u.last_name
            ORDER BY lines_picked DESC
        `;

        const productivityResult = await pool.query(productivityQuery, params);

        return {
            summary: result.rows[0],
            picker_productivity: productivityResult.rows
        };
    }
}

module.exports = PickingService;
