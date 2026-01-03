/**
 * WAREHOUSE SERVICE - WMS Core Service
 * Gestiona almacenes, ubicaciones, stock y movimientos
 *
 * Created: 2025-12-31
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

class WarehouseService {

    // =========================================================================
    // ALMACENES
    // =========================================================================

    static async getWarehouses(companyId, filters = {}) {
        let query = `
            SELECT w.*,
                   (SELECT COUNT(*) FROM logistics_locations l WHERE l.warehouse_id = w.id AND l.active = true) as location_count,
                   (SELECT COUNT(DISTINCT q.product_id) FROM logistics_quants q WHERE q.warehouse_id = w.id AND q.quantity > 0) as sku_count
            FROM logistics_warehouses w
            WHERE w.company_id = $1
        `;
        const params = [companyId];
        let paramIndex = 2;

        if (filters.active !== undefined) {
            query += ` AND w.active = $${paramIndex++}`;
            params.push(filters.active);
        }

        if (filters.type) {
            query += ` AND w.type = $${paramIndex++}`;
            params.push(filters.type);
        }

        query += ' ORDER BY w.name';

        const result = await pool.query(query, params);
        return result.rows;
    }

    static async getWarehouseById(id) {
        const result = await pool.query(`
            SELECT w.*,
                   wc.*,
                   (SELECT COUNT(*) FROM logistics_locations l WHERE l.warehouse_id = w.id AND l.active = true) as location_count
            FROM logistics_warehouses w
            LEFT JOIN logistics_warehouse_config wc ON wc.warehouse_id = w.id
            WHERE w.id = $1
        `, [id]);
        return result.rows[0];
    }

    static async createWarehouse(data) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Crear almacen
            const warehouseResult = await client.query(`
                INSERT INTO logistics_warehouses (
                    company_id, code, name, type, address, city, province, country, postal_code,
                    latitude, longitude, timezone, operation_mode, picking_strategy, putaway_strategy,
                    total_area_m2, storage_area_m2, max_pallets, max_sku, working_days, shift_start, shift_end,
                    manager_id, manager_name
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
                RETURNING *
            `, [
                data.company_id, data.code, data.name, data.type || 'PROPIO',
                data.address, data.city, data.province, data.country || 'Argentina', data.postal_code,
                data.latitude, data.longitude, data.timezone || 'America/Argentina/Buenos_Aires',
                data.operation_mode || 'STANDARD', data.picking_strategy || 'FIFO', data.putaway_strategy || 'DIRECTED',
                data.total_area_m2, data.storage_area_m2, data.max_pallets, data.max_sku,
                JSON.stringify(data.working_days || { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false }),
                data.shift_start || '08:00', data.shift_end || '18:00',
                data.manager_id, data.manager_name
            ]);

            const warehouse = warehouseResult.rows[0];

            // Crear configuracion por defecto
            await client.query(`
                INSERT INTO logistics_warehouse_config (warehouse_id)
                VALUES ($1)
            `, [warehouse.id]);

            // Crear ubicaciones virtuales basicas
            const locationTypes = await client.query(`
                SELECT id, code FROM logistics_location_types
                WHERE company_id = $1 AND code IN ('RECEIVING', 'SHIPPING', 'STAGING')
            `, [data.company_id]);

            for (const lt of locationTypes.rows) {
                await client.query(`
                    INSERT INTO logistics_locations (
                        company_id, warehouse_id, location_type_id, code, name, zone_code
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                `, [data.company_id, warehouse.id, lt.id, lt.code + '-01', lt.code + ' Principal', lt.code]);
            }

            await client.query('COMMIT');
            return warehouse;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async updateWarehouse(id, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        const allowedFields = [
            'name', 'type', 'address', 'city', 'province', 'country', 'postal_code',
            'latitude', 'longitude', 'timezone', 'operation_mode', 'picking_strategy', 'putaway_strategy',
            'total_area_m2', 'storage_area_m2', 'max_pallets', 'max_sku', 'working_days',
            'shift_start', 'shift_end', 'manager_id', 'manager_name', 'active'
        ];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = $${paramIndex++}`);
                values.push(field === 'working_days' ? JSON.stringify(data[field]) : data[field]);
            }
        }

        if (fields.length === 0) return this.getWarehouseById(id);

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const result = await pool.query(`
            UPDATE logistics_warehouses SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `, values);

        return result.rows[0];
    }

    static async updateWarehouseConfig(warehouseId, config) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(config)) {
            fields.push(`${key} = $${paramIndex++}`);
            values.push(value);
        }

        if (fields.length === 0) return;

        fields.push(`updated_at = NOW()`);
        values.push(warehouseId);

        await pool.query(`
            UPDATE logistics_warehouse_config SET ${fields.join(', ')}
            WHERE warehouse_id = $${paramIndex}
        `, values);
    }

    // =========================================================================
    // UBICACIONES
    // =========================================================================

    static async getLocations(warehouseId, filters = {}) {
        let query = `
            SELECT l.*, lt.name as location_type_name, lt.category, lt.zone_sequence,
                   COALESCE(SUM(q.quantity), 0) as total_qty,
                   COUNT(DISTINCT q.product_id) as sku_count
            FROM logistics_locations l
            JOIN logistics_location_types lt ON lt.id = l.location_type_id
            LEFT JOIN logistics_quants q ON q.location_id = l.id AND q.quantity > 0
            WHERE l.warehouse_id = $1
        `;
        const params = [warehouseId];
        let paramIndex = 2;

        if (filters.active !== undefined) {
            query += ` AND l.active = $${paramIndex++}`;
            params.push(filters.active);
        }

        if (filters.zone_code) {
            query += ` AND l.zone_code = $${paramIndex++}`;
            params.push(filters.zone_code);
        }

        if (filters.velocity_class) {
            query += ` AND l.velocity_class = $${paramIndex++}`;
            params.push(filters.velocity_class);
        }

        if (filters.location_type_id) {
            query += ` AND l.location_type_id = $${paramIndex++}`;
            params.push(filters.location_type_id);
        }

        if (filters.is_pickable) {
            query += ` AND lt.is_pickable = true`;
        }

        if (filters.is_empty) {
            query += ` AND NOT EXISTS (SELECT 1 FROM logistics_quants q2 WHERE q2.location_id = l.id AND q2.quantity > 0)`;
        }

        query += ` GROUP BY l.id, lt.id ORDER BY lt.zone_sequence, l.code`;

        const result = await pool.query(query, params);
        return result.rows;
    }

    static async getLocationById(id) {
        const result = await pool.query(`
            SELECT l.*, lt.name as location_type_name, lt.category
            FROM logistics_locations l
            JOIN logistics_location_types lt ON lt.id = l.location_type_id
            WHERE l.id = $1
        `, [id]);
        return result.rows[0];
    }

    static async createLocation(data) {
        const result = await pool.query(`
            INSERT INTO logistics_locations (
                company_id, warehouse_id, location_type_id, code, name, parent_id,
                zone_code, aisle, rack, level, position,
                width_cm, height_cm, depth_cm, max_weight_kg, max_volume_m3,
                temperature_controlled, min_temperature, max_temperature,
                velocity_class, golden_zone
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            RETURNING *
        `, [
            data.company_id, data.warehouse_id, data.location_type_id, data.code, data.name, data.parent_id,
            data.zone_code, data.aisle, data.rack, data.level, data.position,
            data.width_cm, data.height_cm, data.depth_cm, data.max_weight_kg, data.max_volume_m3,
            data.temperature_controlled || false, data.min_temperature, data.max_temperature,
            data.velocity_class || 'C', data.golden_zone || false
        ]);
        return result.rows[0];
    }

    static async createLocationsBulk(warehouseId, companyId, config) {
        // Crear ubicaciones en masa basado en configuracion
        // config: { zone: 'PICK', aisles: 5, racks_per_aisle: 10, levels: 4, positions: 2 }
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const locationTypeResult = await client.query(`
                SELECT id FROM logistics_location_types
                WHERE company_id = $1 AND code = $2
            `, [companyId, config.zone || 'BULK']);

            if (locationTypeResult.rows.length === 0) {
                throw new Error(`Tipo de ubicacion ${config.zone} no encontrado`);
            }

            const locationTypeId = locationTypeResult.rows[0].id;
            const locations = [];

            for (let a = 1; a <= (config.aisles || 1); a++) {
                for (let r = 1; r <= (config.racks_per_aisle || 1); r++) {
                    for (let l = 1; l <= (config.levels || 1); l++) {
                        for (let p = 1; p <= (config.positions || 1); p++) {
                            const aisle = String(a).padStart(2, '0');
                            const rack = String(r).padStart(2, '0');
                            const level = String(l).padStart(2, '0');
                            const position = String(p).padStart(2, '0');
                            const code = `${config.zone || 'A'}-${aisle}-${rack}-${level}-${position}`;

                            await client.query(`
                                INSERT INTO logistics_locations (
                                    company_id, warehouse_id, location_type_id, code, zone_code,
                                    aisle, rack, level, position, velocity_class, golden_zone
                                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                                ON CONFLICT (warehouse_id, code) DO NOTHING
                            `, [
                                companyId, warehouseId, locationTypeId, code, config.zone,
                                aisle, rack, level, position,
                                l <= 2 ? 'A' : (l <= 3 ? 'B' : 'C'), // Golden zone en niveles bajos
                                l >= 2 && l <= 3 // Altura optima
                            ]);

                            locations.push(code);
                        }
                    }
                }
            }

            await client.query('COMMIT');
            return { created: locations.length, locations };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // =========================================================================
    // STOCK (QUANTS)
    // =========================================================================

    static async getStock(warehouseId, filters = {}) {
        let query = `
            SELECT q.*, l.code as location_code, l.zone_code,
                   p.name as product_name, p.sku as product_sku
            FROM logistics_quants q
            JOIN logistics_locations l ON l.id = q.location_id
            LEFT JOIN products p ON p.id = q.product_id
            WHERE q.warehouse_id = $1
        `;
        const params = [warehouseId];
        let paramIndex = 2;

        if (filters.product_id) {
            query += ` AND q.product_id = $${paramIndex++}`;
            params.push(filters.product_id);
        }

        if (filters.location_id) {
            query += ` AND q.location_id = $${paramIndex++}`;
            params.push(filters.location_id);
        }

        if (filters.lot_number) {
            query += ` AND q.lot_number = $${paramIndex++}`;
            params.push(filters.lot_number);
        }

        if (filters.available_only) {
            query += ` AND (q.quantity - q.reserved_quantity) > 0`;
        }

        if (filters.expiring_days) {
            query += ` AND q.expiry_date IS NOT NULL AND q.expiry_date <= CURRENT_DATE + $${paramIndex++}::INTEGER`;
            params.push(filters.expiring_days);
        }

        query += ' ORDER BY l.zone_code, l.code, q.expiry_date NULLS LAST';

        const result = await pool.query(query, params);
        return result.rows;
    }

    static async getProductStock(companyId, productId) {
        const result = await pool.query(`
            SELECT w.code as warehouse_code, w.name as warehouse_name,
                   l.code as location_code, l.zone_code,
                   q.quantity, q.reserved_quantity,
                   (q.quantity - q.reserved_quantity) as available,
                   q.lot_number, q.expiry_date, q.unit_cost
            FROM logistics_quants q
            JOIN logistics_warehouses w ON w.id = q.warehouse_id
            JOIN logistics_locations l ON l.id = q.location_id
            WHERE q.company_id = $1 AND q.product_id = $2 AND q.quantity > 0
            ORDER BY w.name, l.code
        `, [companyId, productId]);
        return result.rows;
    }

    static async adjustStock(data) {
        // Ajuste de inventario (entrada/salida manual)
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Buscar o crear quant
            let quant = await client.query(`
                SELECT * FROM logistics_quants
                WHERE location_id = $1 AND product_id = $2
                AND COALESCE(lot_number, '') = COALESCE($3, '')
                AND COALESCE(serial_number, '') = COALESCE($4, '')
            `, [data.location_id, data.product_id, data.lot_number, data.serial_number]);

            const isIncrease = data.quantity > 0;
            const absQty = Math.abs(data.quantity);

            if (quant.rows.length === 0) {
                if (!isIncrease) {
                    throw new Error('No hay stock para ajustar en esta ubicacion');
                }
                // Crear nuevo quant
                await client.query(`
                    INSERT INTO logistics_quants (
                        company_id, warehouse_id, location_id, product_id, product_code, product_name,
                        lot_number, serial_number, expiry_date, quantity, uom_id, uom_code,
                        unit_cost, incoming_date, last_movement_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_DATE, NOW())
                `, [
                    data.company_id, data.warehouse_id, data.location_id, data.product_id,
                    data.product_code, data.product_name, data.lot_number, data.serial_number,
                    data.expiry_date, absQty, data.uom_id, data.uom_code, data.unit_cost
                ]);
            } else {
                const currentQty = parseFloat(quant.rows[0].quantity);
                const newQty = isIncrease ? currentQty + absQty : currentQty - absQty;

                if (newQty < 0) {
                    throw new Error(`Stock insuficiente. Disponible: ${currentQty}`);
                }

                if (newQty === 0) {
                    await client.query('DELETE FROM logistics_quants WHERE id = $1', [quant.rows[0].id]);
                } else {
                    await client.query(`
                        UPDATE logistics_quants SET quantity = $1, last_movement_at = NOW(), updated_at = NOW()
                        WHERE id = $2
                    `, [newQty, quant.rows[0].id]);
                }
            }

            // Registrar movimiento
            await client.query(`
                INSERT INTO logistics_inventory_movements (
                    company_id, warehouse_id, movement_type, source_type, source_number,
                    product_id, product_code, product_name, quantity, uom_id, uom_code,
                    lot_number, serial_number, expiry_date,
                    from_location_id, from_location_code, to_location_id, to_location_code,
                    unit_cost, total_cost, executed_by, executed_by_name, notes
                ) VALUES ($1, $2, 'ADJUSTMENT', 'MANUAL', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            `, [
                data.company_id, data.warehouse_id, data.reference_number || 'ADJ-' + Date.now(),
                data.product_id, data.product_code, data.product_name,
                data.quantity, data.uom_id, data.uom_code,
                data.lot_number, data.serial_number, data.expiry_date,
                isIncrease ? null : data.location_id,
                isIncrease ? null : data.location_code,
                isIncrease ? data.location_id : null,
                isIncrease ? data.location_code : null,
                data.unit_cost, Math.abs(data.quantity * (data.unit_cost || 0)),
                data.user_id, data.user_name, data.notes
            ]);

            await client.query('COMMIT');
            return { success: true, quantity: data.quantity };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async transferStock(data) {
        // Transferencia entre ubicaciones
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Validar stock origen
            const sourceQuant = await client.query(`
                SELECT * FROM logistics_quants
                WHERE location_id = $1 AND product_id = $2
                AND COALESCE(lot_number, '') = COALESCE($3, '')
                AND (quantity - reserved_quantity) >= $4
            `, [data.from_location_id, data.product_id, data.lot_number, data.quantity]);

            if (sourceQuant.rows.length === 0) {
                throw new Error('Stock insuficiente en ubicacion origen');
            }

            const sq = sourceQuant.rows[0];

            // Reducir stock origen
            const newSourceQty = parseFloat(sq.quantity) - data.quantity;
            if (newSourceQty === 0) {
                await client.query('DELETE FROM logistics_quants WHERE id = $1', [sq.id]);
            } else {
                await client.query(`
                    UPDATE logistics_quants SET quantity = $1, last_movement_at = NOW() WHERE id = $2
                `, [newSourceQty, sq.id]);
            }

            // Buscar o crear quant destino
            const destQuant = await client.query(`
                SELECT * FROM logistics_quants
                WHERE location_id = $1 AND product_id = $2
                AND COALESCE(lot_number, '') = COALESCE($3, '')
            `, [data.to_location_id, data.product_id, data.lot_number]);

            if (destQuant.rows.length === 0) {
                await client.query(`
                    INSERT INTO logistics_quants (
                        company_id, warehouse_id, location_id, product_id, product_code, product_name,
                        lot_number, expiry_date, quantity, uom_id, uom_code, unit_cost, incoming_date, last_movement_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
                `, [
                    sq.company_id, data.to_warehouse_id || sq.warehouse_id, data.to_location_id,
                    data.product_id, sq.product_code, sq.product_name,
                    data.lot_number, sq.expiry_date, data.quantity, sq.uom_id, sq.uom_code,
                    sq.unit_cost, sq.incoming_date
                ]);
            } else {
                await client.query(`
                    UPDATE logistics_quants SET quantity = quantity + $1, last_movement_at = NOW() WHERE id = $2
                `, [data.quantity, destQuant.rows[0].id]);
            }

            // Registrar movimiento
            await client.query(`
                INSERT INTO logistics_inventory_movements (
                    company_id, warehouse_id, movement_type, source_type,
                    product_id, product_code, product_name, quantity, uom_id, uom_code,
                    lot_number, expiry_date,
                    from_location_id, from_location_code, to_location_id, to_location_code,
                    executed_by, executed_by_name, notes
                ) VALUES ($1, $2, 'TRANSFER', 'INTERNAL', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            `, [
                sq.company_id, sq.warehouse_id, data.product_id, sq.product_code, sq.product_name,
                data.quantity, sq.uom_id, sq.uom_code, data.lot_number, sq.expiry_date,
                data.from_location_id, data.from_location_code,
                data.to_location_id, data.to_location_code,
                data.user_id, data.user_name, data.notes
            ]);

            await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // =========================================================================
    // MOVIMIENTOS
    // =========================================================================

    static async getMovements(warehouseId, filters = {}) {
        let query = `
            SELECT m.*
            FROM logistics_inventory_movements m
            WHERE m.warehouse_id = $1
        `;
        const params = [warehouseId];
        let paramIndex = 2;

        if (filters.movement_type) {
            query += ` AND m.movement_type = $${paramIndex++}`;
            params.push(filters.movement_type);
        }

        if (filters.product_id) {
            query += ` AND m.product_id = $${paramIndex++}`;
            params.push(filters.product_id);
        }

        if (filters.date_from) {
            query += ` AND m.executed_at >= $${paramIndex++}`;
            params.push(filters.date_from);
        }

        if (filters.date_to) {
            query += ` AND m.executed_at <= $${paramIndex++}`;
            params.push(filters.date_to);
        }

        query += ' ORDER BY m.executed_at DESC LIMIT $' + paramIndex;
        params.push(filters.limit || 100);

        const result = await pool.query(query, params);
        return result.rows;
    }

    // =========================================================================
    // LOCATION TYPES
    // =========================================================================

    static async getLocationTypes(companyId) {
        const result = await pool.query(`
            SELECT * FROM logistics_location_types
            WHERE company_id = $1 AND active = true
            ORDER BY zone_sequence, name
        `, [companyId]);
        return result.rows;
    }

    static async createLocationType(data) {
        const result = await pool.query(`
            INSERT INTO logistics_location_types (
                company_id, code, name, category, affects_inventory, allows_negative,
                requires_lot, requires_serial, requires_expiry, is_pickable, is_puttable, zone_sequence
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [
            data.company_id, data.code, data.name, data.category || 'INTERNAL',
            data.affects_inventory !== false, data.allows_negative || false,
            data.requires_lot || false, data.requires_serial || false, data.requires_expiry || false,
            data.is_pickable !== false, data.is_puttable !== false, data.zone_sequence || 0
        ]);
        return result.rows[0];
    }

    // =========================================================================
    // KPIs
    // =========================================================================

    static async getWarehouseKPIs(warehouseId) {
        const [stockStats, locationStats, movementStats] = await Promise.all([
            // Stock stats
            pool.query(`
                SELECT
                    COUNT(DISTINCT product_id) as total_skus,
                    SUM(quantity) as total_units,
                    SUM(quantity * COALESCE(unit_cost, 0)) as total_value,
                    COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + 30) as expiring_soon
                FROM logistics_quants
                WHERE warehouse_id = $1 AND quantity > 0
            `, [warehouseId]),

            // Location stats
            pool.query(`
                SELECT
                    COUNT(*) as total_locations,
                    COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM logistics_quants q WHERE q.location_id = l.id AND q.quantity > 0)) as occupied_locations
                FROM logistics_locations l
                WHERE l.warehouse_id = $1 AND l.active = true
            `, [warehouseId]),

            // Movement stats (last 7 days)
            pool.query(`
                SELECT
                    movement_type,
                    COUNT(*) as count,
                    SUM(quantity) as total_qty
                FROM logistics_inventory_movements
                WHERE warehouse_id = $1 AND executed_at >= CURRENT_DATE - INTERVAL '7 days'
                GROUP BY movement_type
            `, [warehouseId])
        ]);

        const stock = stockStats.rows[0] || {};
        const locations = locationStats.rows[0] || {};
        const movements = movementStats.rows.reduce((acc, m) => {
            acc[m.movement_type.toLowerCase()] = { count: parseInt(m.count), qty: parseFloat(m.total_qty) };
            return acc;
        }, {});

        return {
            stock: {
                total_skus: parseInt(stock.total_skus) || 0,
                total_units: parseFloat(stock.total_units) || 0,
                total_value: parseFloat(stock.total_value) || 0,
                expiring_soon: parseInt(stock.expiring_soon) || 0
            },
            locations: {
                total: parseInt(locations.total_locations) || 0,
                occupied: parseInt(locations.occupied_locations) || 0,
                utilization_pct: locations.total_locations > 0
                    ? Math.round((locations.occupied_locations / locations.total_locations) * 100)
                    : 0
            },
            movements_7d: movements
        };
    }
}

module.exports = WarehouseService;
