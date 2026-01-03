/**
 * ShipmentService.js - Servicio de Gestión de Envíos
 * Creación, tracking y gestión de envíos
 * Basado en mejores prácticas de SAP TM, Oracle OTM, DHL, FedEx
 */

const { sequelize } = require('../../config/database');
const { QueryTypes } = require('sequelize');

// Helper para mantener compatibilidad con patrón pool.query
const pool = {
    async query(sql, params = []) {
        // Convertir $1, $2, etc a ? para Sequelize
        let convertedSql = sql;
        let convertedParams = params;

        // Si usa $1, $2 (pg style), convertir a ? (sequelize style)
        if (sql.includes('$1')) {
            convertedSql = sql.replace(/\$(\d+)/g, '?');
        }

        const result = await sequelize.query(convertedSql, {
            replacements: convertedParams,
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

class ShipmentService {

    // ==================== SHIPMENTS ====================

    /**
     * Obtener envíos con filtros
     */
    static async getShipments(companyId, filters = {}) {
        const { warehouse_id, customer_id, carrier_id, status,
            dateFrom, dateTo, limit = 50, offset = 0 } = filters;

        let query = `
            SELECT
                s.*,
                wh.name as warehouse_name,
                c.razon_social as customer_name,
                c.domicilio_calle as customer_address,
                cr.name as carrier_name,
                v.plate_number as vehicle_plate,
                d.name as driver_name,
                COUNT(pkg.id) as packages_count,
                SUM(pkg.weight_kg) as total_weight
            FROM logistics_shipments s
            LEFT JOIN logistics_warehouses wh ON s.warehouse_id = wh.id
            LEFT JOIN siac_clientes c ON s.customer_id = c.id
            LEFT JOIN logistics_carriers cr ON s.carrier_id = cr.id
            LEFT JOIN logistics_vehicles v ON s.vehicle_id = v.id
            LEFT JOIN logistics_drivers d ON s.driver_id = d.id
            LEFT JOIN logistics_packages pkg ON s.pack_order_id = pkg.pack_order_id
            WHERE s.company_id = $1
        `;
        const params = [companyId];
        let paramIndex = 2;

        if (warehouse_id) {
            query += ` AND s.warehouse_id = $${paramIndex++}`;
            params.push(warehouse_id);
        }
        if (customer_id) {
            query += ` AND s.customer_id = $${paramIndex++}`;
            params.push(customer_id);
        }
        if (carrier_id) {
            query += ` AND s.carrier_id = $${paramIndex++}`;
            params.push(carrier_id);
        }
        if (status) {
            query += ` AND s.status = $${paramIndex++}`;
            params.push(status);
        }
        if (dateFrom) {
            query += ` AND s.created_at >= $${paramIndex++}`;
            params.push(dateFrom);
        }
        if (dateTo) {
            query += ` AND s.created_at <= $${paramIndex++}`;
            params.push(dateTo);
        }

        query += `
            GROUP BY s.id, wh.name, c.razon_social, c.domicilio_calle,
                     cr.name, v.plate_number, d.name
            ORDER BY s.created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Obtener envío por ID con detalles completos
     */
    static async getShipmentById(id) {
        const shipmentQuery = `
            SELECT
                s.*,
                wh.name as warehouse_name,
                wh.address as warehouse_address,
                c.razon_social as customer_name,
                c.domicilio_calle as customer_address,
                c.telefono as customer_phone,
                c.email as customer_email,
                cr.name as carrier_name,
                cr.contact_phone as carrier_phone,
                v.plate_number as vehicle_plate,
                v.brand as vehicle_brand,
                v.model as vehicle_model,
                d.name as driver_name,
                d.phone as driver_phone,
                z.name as delivery_zone_name
            FROM logistics_shipments s
            LEFT JOIN logistics_warehouses wh ON s.warehouse_id = wh.id
            LEFT JOIN siac_clientes c ON s.customer_id = c.id
            LEFT JOIN logistics_carriers cr ON s.carrier_id = cr.id
            LEFT JOIN logistics_vehicles v ON s.vehicle_id = v.id
            LEFT JOIN logistics_drivers d ON s.driver_id = d.id
            LEFT JOIN logistics_delivery_zones z ON s.delivery_zone_id = z.id
            WHERE s.id = $1
        `;
        const shipmentResult = await pool.query(shipmentQuery, [id]);
        if (shipmentResult.rows.length === 0) return null;

        const shipment = shipmentResult.rows[0];

        // Obtener paquetes
        const packagesQuery = `
            SELECT
                pkg.*,
                pt.name as package_type_name
            FROM logistics_packages pkg
            LEFT JOIN logistics_package_types pt ON pkg.package_type_id = pt.id
            WHERE pkg.pack_order_id = (
                SELECT pack_order_id FROM logistics_shipments WHERE id = $1
            )
        `;
        const packagesResult = await pool.query(packagesQuery, [id]);
        shipment.packages = packagesResult.rows;

        // Obtener tracking history
        const trackingQuery = `
            SELECT
                t.*,
                u.first_name || ' ' || u.last_name as created_by_name
            FROM logistics_shipment_tracking t
            LEFT JOIN users u ON t.created_by = u.id
            WHERE t.shipment_id = $1
            ORDER BY t.created_at DESC
        `;
        const trackingResult = await pool.query(trackingQuery, [id]);
        shipment.tracking_history = trackingResult.rows;

        return shipment;
    }

    /**
     * Obtener envío por tracking number (para portal de clientes)
     */
    static async getShipmentByTracking(trackingNumber) {
        const query = `
            SELECT
                s.id, s.tracking_number, s.status,
                s.estimated_delivery_date, s.actual_delivery_date,
                s.delivery_address, s.delivery_city, s.delivery_state,
                s.delivery_instructions,
                cr.name as carrier_name,
                c.razon_social as customer_name
            FROM logistics_shipments s
            LEFT JOIN logistics_carriers cr ON s.carrier_id = cr.id
            LEFT JOIN siac_clientes c ON s.customer_id = c.id
            WHERE s.tracking_number = $1
        `;
        const result = await pool.query(query, [trackingNumber]);
        if (result.rows.length === 0) return null;

        const shipment = result.rows[0];

        // Obtener tracking (solo info pública)
        const trackingQuery = `
            SELECT status, location, notes, created_at
            FROM logistics_shipment_tracking
            WHERE shipment_id = $1
            ORDER BY created_at DESC
        `;
        const trackingResult = await pool.query(trackingQuery, [shipment.id]);
        shipment.tracking_history = trackingResult.rows;

        return shipment;
    }

    /**
     * Crear envío
     */
    static async createShipment(data) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const {
                company_id, warehouse_id, customer_id, pack_order_id,
                carrier_id, vehicle_id, driver_id, delivery_zone_id,
                source_document_type, source_document_id,
                delivery_address, delivery_city, delivery_state,
                delivery_postal_code, delivery_country,
                delivery_contact_name, delivery_contact_phone,
                delivery_instructions, delivery_priority,
                estimated_delivery_date, time_window_from, time_window_to,
                service_type, requires_signature, requires_photo,
                declared_value, insurance_amount,
                notes, created_by
            } = data;

            // Generar tracking number
            const trackingNumber = this._generateTrackingNumber(company_id);

            const query = `
                INSERT INTO logistics_shipments (
                    company_id, warehouse_id, customer_id, pack_order_id,
                    carrier_id, vehicle_id, driver_id, delivery_zone_id,
                    tracking_number, source_document_type, source_document_id,
                    delivery_address, delivery_city, delivery_state,
                    delivery_postal_code, delivery_country,
                    delivery_contact_name, delivery_contact_phone,
                    delivery_instructions, delivery_priority,
                    estimated_delivery_date, time_window_from, time_window_to,
                    service_type, requires_signature, requires_photo,
                    declared_value, insurance_amount,
                    status, notes, created_by, created_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                    $21, $22, $23, $24, $25, $26, $27, $28,
                    'CREATED', $29, $30, NOW()
                )
                RETURNING *
            `;

            const result = await client.query(query, [
                company_id, warehouse_id, customer_id, pack_order_id,
                carrier_id, vehicle_id, driver_id, delivery_zone_id,
                trackingNumber, source_document_type, source_document_id,
                delivery_address, delivery_city, delivery_state,
                delivery_postal_code, delivery_country || 'Argentina',
                delivery_contact_name, delivery_contact_phone,
                delivery_instructions, delivery_priority || 'NORMAL',
                estimated_delivery_date, time_window_from, time_window_to,
                service_type || 'STANDARD',
                requires_signature !== false,
                requires_photo || false,
                declared_value || 0, insurance_amount || 0,
                notes, created_by
            ]);

            const shipment = result.rows[0];

            // Agregar primer evento de tracking
            await client.query(`
                INSERT INTO logistics_shipment_tracking (
                    shipment_id, status, location, notes, created_by, created_at
                ) VALUES ($1, 'CREATED', $2, 'Envío creado', $3, NOW())
            `, [shipment.id, 'Sistema', created_by]);

            await client.query('COMMIT');

            return await this.getShipmentById(shipment.id);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Crear envíos masivos desde pack orders
     */
    static async createShipmentsFromPackOrders(packOrderIds, commonData) {
        const client = await pool.connect();
        const shipments = [];

        try {
            await client.query('BEGIN');

            for (const packOrderId of packOrderIds) {
                // Obtener info del pack order
                const poResult = await client.query(`
                    SELECT
                        po.*,
                        pl.wave_id,
                        c.id as customer_id,
                        c.domicilio_calle as delivery_address,
                        c.ciudad as delivery_city,
                        c.provincia as delivery_state,
                        c.codigo_postal as delivery_postal_code,
                        c.razon_social as customer_name,
                        c.telefono as customer_phone
                    FROM logistics_pack_orders po
                    JOIN logistics_pick_lists pl ON po.pick_list_id = pl.id
                    LEFT JOIN logistics_pick_list_lines pll ON pl.id = pll.pick_list_id
                    LEFT JOIN siac_pedidos p ON pll.source_document_id = p.id
                    LEFT JOIN siac_clientes c ON p.cliente_id = c.id
                    WHERE po.id = $1
                    LIMIT 1
                `, [packOrderId]);

                if (poResult.rows.length === 0) continue;
                const packOrder = poResult.rows[0];

                const shipmentData = {
                    ...commonData,
                    company_id: packOrder.company_id,
                    warehouse_id: packOrder.warehouse_id,
                    customer_id: packOrder.customer_id,
                    pack_order_id: packOrderId,
                    delivery_address: packOrder.delivery_address,
                    delivery_city: packOrder.delivery_city,
                    delivery_state: packOrder.delivery_state,
                    delivery_postal_code: packOrder.delivery_postal_code,
                    delivery_contact_name: packOrder.customer_name,
                    delivery_contact_phone: packOrder.customer_phone
                };

                // Usar la función de crear envío
                const trackingNumber = this._generateTrackingNumber(packOrder.company_id);

                const insertResult = await client.query(`
                    INSERT INTO logistics_shipments (
                        company_id, warehouse_id, customer_id, pack_order_id,
                        carrier_id, tracking_number,
                        delivery_address, delivery_city, delivery_state,
                        delivery_postal_code, delivery_country,
                        delivery_contact_name, delivery_contact_phone,
                        delivery_priority, service_type,
                        status, created_by, created_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                        'Argentina', $11, $12, $13, $14, 'CREATED', $15, NOW()
                    )
                    RETURNING id
                `, [
                    packOrder.company_id, packOrder.warehouse_id,
                    packOrder.customer_id, packOrderId,
                    commonData.carrier_id, trackingNumber,
                    packOrder.delivery_address, packOrder.delivery_city,
                    packOrder.delivery_state, packOrder.delivery_postal_code,
                    packOrder.customer_name, packOrder.customer_phone,
                    commonData.delivery_priority || 'NORMAL',
                    commonData.service_type || 'STANDARD',
                    commonData.created_by
                ]);

                shipments.push(insertResult.rows[0].id);

                // Agregar tracking inicial
                await client.query(`
                    INSERT INTO logistics_shipment_tracking (
                        shipment_id, status, location, notes, created_by, created_at
                    ) VALUES ($1, 'CREATED', 'Sistema', 'Envío creado', $2, NOW())
                `, [insertResult.rows[0].id, commonData.created_by]);
            }

            await client.query('COMMIT');

            return { created: shipments.length, shipment_ids: shipments };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Actualizar estado del envío
     */
    static async updateShipmentStatus(shipmentId, data) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const { status, location, notes, updated_by,
                actual_delivery_date, signature_data, delivery_photo_urls,
                recipient_name, latitude, longitude } = data;

            // Actualizar envío
            const updateFields = ['status = $2', 'updated_at = NOW()'];
            const updateValues = [shipmentId, status];
            let paramIndex = 3;

            if (actual_delivery_date) {
                updateFields.push(`actual_delivery_date = $${paramIndex++}`);
                updateValues.push(actual_delivery_date);
            }
            if (signature_data) {
                updateFields.push(`signature_data = $${paramIndex++}`);
                updateValues.push(signature_data);
            }
            if (delivery_photo_urls) {
                updateFields.push(`delivery_photo_urls = $${paramIndex++}`);
                updateValues.push(JSON.stringify(delivery_photo_urls));
            }
            if (recipient_name) {
                updateFields.push(`recipient_name = $${paramIndex++}`);
                updateValues.push(recipient_name);
            }

            await client.query(`
                UPDATE logistics_shipments
                SET ${updateFields.join(', ')}
                WHERE id = $1
            `, updateValues);

            // Agregar evento de tracking
            await client.query(`
                INSERT INTO logistics_shipment_tracking (
                    shipment_id, status, location, latitude, longitude,
                    notes, created_by, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            `, [shipmentId, status, location, latitude, longitude, notes, updated_by]);

            await client.query('COMMIT');

            return await this.getShipmentById(shipmentId);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Agregar evento de tracking
     */
    static async addTrackingEvent(shipmentId, data) {
        const { status, location, latitude, longitude, notes, created_by } = data;

        const query = `
            INSERT INTO logistics_shipment_tracking (
                shipment_id, status, location, latitude, longitude,
                notes, created_by, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING *
        `;

        const result = await pool.query(query, [
            shipmentId, status, location, latitude, longitude, notes, created_by
        ]);

        return result.rows[0];
    }

    /**
     * Asignar carrier a envío
     */
    static async assignCarrier(shipmentId, carrierId, vehicleId = null, driverId = null) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            await client.query(`
                UPDATE logistics_shipments
                SET carrier_id = $2,
                    vehicle_id = $3,
                    driver_id = $4,
                    status = CASE WHEN status = 'CREATED' THEN 'ASSIGNED' ELSE status END,
                    updated_at = NOW()
                WHERE id = $1
            `, [shipmentId, carrierId, vehicleId, driverId]);

            // Agregar tracking
            await client.query(`
                INSERT INTO logistics_shipment_tracking (
                    shipment_id, status, location, notes, created_at
                ) VALUES ($1, 'ASSIGNED', 'Sistema', 'Transportista asignado', NOW())
            `, [shipmentId]);

            await client.query('COMMIT');

            return await this.getShipmentById(shipmentId);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Marcar envío como en tránsito
     */
    static async markInTransit(shipmentId, data = {}) {
        const { location, notes, updated_by } = data;

        return await this.updateShipmentStatus(shipmentId, {
            status: 'IN_TRANSIT',
            location: location || 'En camino',
            notes: notes || 'Envío en tránsito',
            updated_by
        });
    }

    /**
     * Confirmar entrega
     */
    static async confirmDelivery(shipmentId, data) {
        const { recipient_name, signature_data, photo_urls, notes, updated_by,
            latitude, longitude } = data;

        return await this.updateShipmentStatus(shipmentId, {
            status: 'DELIVERED',
            actual_delivery_date: new Date(),
            recipient_name,
            signature_data,
            delivery_photo_urls: photo_urls,
            location: 'Entregado',
            latitude,
            longitude,
            notes: notes || 'Entrega confirmada',
            updated_by
        });
    }

    /**
     * Reportar problema de entrega
     */
    static async reportDeliveryIssue(shipmentId, data) {
        const { issue_type, notes, reschedule_date, updated_by, latitude, longitude } = data;

        let status = 'ISSUE';
        if (issue_type === 'NO_ONE_HOME') status = 'FAILED_ATTEMPT';
        if (issue_type === 'REFUSED') status = 'REFUSED';
        if (issue_type === 'WRONG_ADDRESS') status = 'WRONG_ADDRESS';

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            await client.query(`
                UPDATE logistics_shipments
                SET status = $2,
                    delivery_attempts = delivery_attempts + 1,
                    last_attempt_date = NOW(),
                    next_attempt_date = $3,
                    updated_at = NOW()
                WHERE id = $1
            `, [shipmentId, status, reschedule_date]);

            await client.query(`
                INSERT INTO logistics_shipment_tracking (
                    shipment_id, status, location, latitude, longitude,
                    notes, created_by, created_at
                ) VALUES ($1, $2, 'En destino', $3, $4, $5, $6, NOW())
            `, [shipmentId, status, latitude, longitude, notes, updated_by]);

            await client.query('COMMIT');

            return await this.getShipmentById(shipmentId);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Cancelar envío
     */
    static async cancelShipment(shipmentId, reason, cancelledBy) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Verificar que se puede cancelar
            const shipment = await client.query(`
                SELECT status FROM logistics_shipments WHERE id = $1
            `, [shipmentId]);

            if (shipment.rows.length === 0) {
                throw new Error('Envío no encontrado');
            }

            const currentStatus = shipment.rows[0].status;
            if (['DELIVERED', 'CANCELLED'].includes(currentStatus)) {
                throw new Error(`No se puede cancelar un envío en estado ${currentStatus}`);
            }

            await client.query(`
                UPDATE logistics_shipments
                SET status = 'CANCELLED',
                    cancellation_reason = $2,
                    cancelled_at = NOW(),
                    cancelled_by = $3,
                    updated_at = NOW()
                WHERE id = $1
            `, [shipmentId, reason, cancelledBy]);

            await client.query(`
                INSERT INTO logistics_shipment_tracking (
                    shipment_id, status, location, notes, created_by, created_at
                ) VALUES ($1, 'CANCELLED', 'Sistema', $2, $3, NOW())
            `, [shipmentId, `Cancelado: ${reason}`, cancelledBy]);

            await client.query('COMMIT');

            return await this.getShipmentById(shipmentId);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ==================== PROOF OF DELIVERY (POD) ====================

    /**
     * Obtener POD de un envío
     */
    static async getProofOfDelivery(shipmentId) {
        const query = `
            SELECT
                s.tracking_number,
                s.status,
                s.actual_delivery_date,
                s.recipient_name,
                s.signature_data,
                s.delivery_photo_urls,
                c.razon_social as customer_name,
                s.delivery_address,
                s.delivery_city,
                t.latitude,
                t.longitude,
                t.notes as delivery_notes
            FROM logistics_shipments s
            LEFT JOIN siac_clientes c ON s.customer_id = c.id
            LEFT JOIN logistics_shipment_tracking t ON s.id = t.shipment_id
                AND t.status = 'DELIVERED'
            WHERE s.id = $1
        `;

        const result = await pool.query(query, [shipmentId]);
        return result.rows[0];
    }

    // ==================== LABELS & DOCUMENTS ====================

    /**
     * Generar datos para etiqueta de envío
     */
    static async getShippingLabelData(shipmentId) {
        const query = `
            SELECT
                s.tracking_number,
                s.delivery_priority,
                s.service_type,
                s.delivery_address,
                s.delivery_city,
                s.delivery_state,
                s.delivery_postal_code,
                s.delivery_country,
                s.delivery_contact_name,
                s.delivery_contact_phone,
                c.razon_social as customer_name,
                wh.name as origin_warehouse,
                wh.address as origin_address,
                wh.city as origin_city,
                comp.name as company_name,
                cr.name as carrier_name,
                COUNT(pkg.id) as packages_count,
                SUM(pkg.weight_kg) as total_weight
            FROM logistics_shipments s
            LEFT JOIN siac_clientes c ON s.customer_id = c.id
            LEFT JOIN logistics_warehouses wh ON s.warehouse_id = wh.id
            LEFT JOIN companies comp ON s.company_id = comp.id
            LEFT JOIN logistics_carriers cr ON s.carrier_id = cr.id
            LEFT JOIN logistics_packages pkg ON s.pack_order_id = pkg.pack_order_id
            WHERE s.id = $1
            GROUP BY s.id, c.razon_social, wh.name, wh.address, wh.city,
                     comp.name, cr.name
        `;

        const result = await pool.query(query, [shipmentId]);
        return result.rows[0];
    }

    // ==================== REPORTS & KPIs ====================

    /**
     * Obtener KPIs de envíos
     */
    static async getShipmentKPIs(companyId, dateRange = {}) {
        const { dateFrom, dateTo } = dateRange;

        let dateFilter = '';
        const params = [companyId];

        if (dateFrom && dateTo) {
            dateFilter = 'AND s.created_at BETWEEN $2 AND $3';
            params.push(dateFrom, dateTo);
        }

        const query = `
            SELECT
                COUNT(*) as total_shipments,
                SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN status = 'IN_TRANSIT' THEN 1 ELSE 0 END) as in_transit,
                SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN status IN ('FAILED_ATTEMPT', 'ISSUE', 'REFUSED') THEN 1 ELSE 0 END) as with_issues,

                -- Delivery rate
                SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END)::float /
                    NULLIF(COUNT(*), 0) * 100 as delivery_rate,

                -- On-time delivery (delivered before or on estimated date)
                SUM(CASE WHEN status = 'DELIVERED'
                    AND actual_delivery_date <= estimated_delivery_date THEN 1 ELSE 0 END)::float /
                    NULLIF(SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END), 0) * 100 as on_time_rate,

                -- Average delivery time
                AVG(CASE WHEN status = 'DELIVERED'
                    THEN EXTRACT(EPOCH FROM (actual_delivery_date - created_at))/3600 END) as avg_delivery_hours,

                -- Attempts average
                AVG(delivery_attempts) as avg_delivery_attempts
            FROM logistics_shipments s
            WHERE s.company_id = $1
            ${dateFilter}
        `;

        const result = await pool.query(query, params);

        // Por carrier
        const byCarrierQuery = `
            SELECT
                cr.id as carrier_id,
                cr.name as carrier_name,
                COUNT(*) as total,
                SUM(CASE WHEN s.status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN s.status = 'DELIVERED' THEN 1 ELSE 0 END)::float /
                    NULLIF(COUNT(*), 0) * 100 as delivery_rate
            FROM logistics_shipments s
            JOIN logistics_carriers cr ON s.carrier_id = cr.id
            WHERE s.company_id = $1
            ${dateFilter}
            GROUP BY cr.id, cr.name
            ORDER BY total DESC
        `;
        const byCarrierResult = await pool.query(byCarrierQuery, params);

        // Por zona
        const byZoneQuery = `
            SELECT
                z.id as zone_id,
                z.name as zone_name,
                COUNT(*) as total,
                SUM(CASE WHEN s.status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN s.status = 'DELIVERED' THEN 1 ELSE 0 END)::float /
                    NULLIF(COUNT(*), 0) * 100 as delivery_rate
            FROM logistics_shipments s
            LEFT JOIN logistics_delivery_zones z ON s.delivery_zone_id = z.id
            WHERE s.company_id = $1
            ${dateFilter}
            GROUP BY z.id, z.name
            ORDER BY total DESC
        `;
        const byZoneResult = await pool.query(byZoneQuery, params);

        return {
            summary: result.rows[0],
            by_carrier: byCarrierResult.rows,
            by_zone: byZoneResult.rows
        };
    }

    /**
     * Obtener envíos pendientes de entrega
     */
    static async getPendingDeliveries(companyId, filters = {}) {
        const { carrier_id, zone_id, date, limit = 100 } = filters;

        let query = `
            SELECT
                s.*,
                c.razon_social as customer_name,
                c.telefono as customer_phone,
                cr.name as carrier_name,
                z.name as zone_name,
                CASE
                    WHEN s.estimated_delivery_date < CURRENT_DATE THEN 'OVERDUE'
                    WHEN s.estimated_delivery_date = CURRENT_DATE THEN 'TODAY'
                    ELSE 'UPCOMING'
                END as urgency
            FROM logistics_shipments s
            LEFT JOIN siac_clientes c ON s.customer_id = c.id
            LEFT JOIN logistics_carriers cr ON s.carrier_id = cr.id
            LEFT JOIN logistics_delivery_zones z ON s.delivery_zone_id = z.id
            WHERE s.company_id = $1
            AND s.status IN ('CREATED', 'ASSIGNED', 'IN_TRANSIT', 'FAILED_ATTEMPT')
        `;
        const params = [companyId];
        let paramIndex = 2;

        if (carrier_id) {
            query += ` AND s.carrier_id = $${paramIndex++}`;
            params.push(carrier_id);
        }
        if (zone_id) {
            query += ` AND s.delivery_zone_id = $${paramIndex++}`;
            params.push(zone_id);
        }
        if (date) {
            query += ` AND s.estimated_delivery_date = $${paramIndex++}`;
            params.push(date);
        }

        query += `
            ORDER BY
                CASE WHEN s.estimated_delivery_date < CURRENT_DATE THEN 0
                     WHEN s.estimated_delivery_date = CURRENT_DATE THEN 1
                     ELSE 2 END,
                s.delivery_priority DESC,
                s.estimated_delivery_date
            LIMIT $${paramIndex}
        `;
        params.push(limit);

        const result = await pool.query(query, params);
        return result.rows;
    }

    // ==================== HELPERS ====================

    /**
     * Generar número de tracking único
     */
    static _generateTrackingNumber(companyId) {
        const prefix = 'TRK';
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}${companyId}${timestamp}${random}`;
    }
}

module.exports = ShipmentService;
