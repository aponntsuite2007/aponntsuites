/**
 * RouteService.js - Servicio de Gestión de Rutas y Transporte (TMS)
 * Carriers, Vehículos, Conductores, Zonas de Entrega, Rutas
 * Basado en mejores prácticas de SAP TM, Oracle OTM, Odoo Delivery
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

class RouteService {

    // ==================== CARRIERS (Transportistas) ====================

    /**
     * Obtener transportistas
     */
    static async getCarriers(companyId, filters = {}) {
        const { is_active, service_type, limit = 50, offset = 0 } = filters;

        let query = `
            SELECT
                c.*,
                COUNT(DISTINCT v.id) as vehicles_count,
                COUNT(DISTINCT d.id) as drivers_count,
                COUNT(DISTINCT s.id) as shipments_last_30_days
            FROM logistics_carriers c
            LEFT JOIN logistics_vehicles v ON c.id = v.carrier_id AND v.is_active = true
            LEFT JOIN logistics_drivers d ON c.id = d.carrier_id AND d.is_active = true
            LEFT JOIN logistics_shipments s ON c.id = s.carrier_id
                AND s.created_at > NOW() - INTERVAL '30 days'
            WHERE c.company_id = $1
        `;
        const params = [companyId];
        let paramIndex = 2;

        if (is_active !== undefined) {
            query += ` AND c.is_active = $${paramIndex++}`;
            params.push(is_active);
        }
        if (service_type) {
            query += ` AND $${paramIndex++} = ANY(c.service_types)`;
            params.push(service_type);
        }

        query += `
            GROUP BY c.id
            ORDER BY c.name
            LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Obtener carrier por ID
     */
    static async getCarrierById(id) {
        const query = `
            SELECT * FROM logistics_carriers WHERE id = $1
        `;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) return null;

        const carrier = result.rows[0];

        // Obtener vehículos
        const vehiclesResult = await pool.query(`
            SELECT * FROM logistics_vehicles
            WHERE carrier_id = $1 AND is_active = true
            ORDER BY plate_number
        `, [id]);
        carrier.vehicles = vehiclesResult.rows;

        // Obtener conductores
        const driversResult = await pool.query(`
            SELECT * FROM logistics_drivers
            WHERE carrier_id = $1 AND is_active = true
            ORDER BY name
        `, [id]);
        carrier.drivers = driversResult.rows;

        return carrier;
    }

    /**
     * Crear transportista
     */
    static async createCarrier(data) {
        const {
            company_id, code, name, type, contact_name,
            phone, contact_phone, email, contact_email, website,
            tax_id, legal_name, services, service_types,
            coverage_zones, has_flat_rate, flat_rate,
            has_weight_rate, weight_rate_per_kg, rate_per_kg,
            has_volume_rate, volume_rate_per_m3,
            min_charge, fuel_surcharge_pct,
            service_type, is_active
        } = data;

        const query = `
            INSERT INTO logistics_carriers (
                company_id, code, name, type, contact_name,
                phone, email, website,
                tax_id, legal_name, services, coverage_zones,
                has_flat_rate, flat_rate,
                has_weight_rate, weight_rate_per_kg,
                has_volume_rate, volume_rate_per_m3,
                min_charge, fuel_surcharge_pct,
                active, created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12,
                $13, $14, $15, $16, $17, $18, $19, $20,
                $21, NOW()
            )
            RETURNING *
        `;

        const resolvedPhone = phone || contact_phone || null;
        const resolvedEmail = email || contact_email || null;
        const resolvedServices = services || (service_types ? JSON.stringify(service_types) : (service_type ? JSON.stringify([service_type]) : JSON.stringify(['STANDARD'])));
        const resolvedServicesStr = typeof resolvedServices === 'string' ? resolvedServices : JSON.stringify(resolvedServices);

        const result = await pool.query(query, [
            company_id,
            code || (name ? name.substring(0, 20).toUpperCase().replace(/\s+/g, '-') : 'CARRIER'),
            name,
            type || 'EXTERNAL',
            contact_name || null,
            resolvedPhone,
            resolvedEmail,
            website || null,
            tax_id || null,
            legal_name || null,
            resolvedServicesStr,
            coverage_zones ? JSON.stringify(coverage_zones) : null,
            has_flat_rate || false,
            flat_rate || null,
            has_weight_rate !== undefined ? has_weight_rate : true,
            weight_rate_per_kg || rate_per_kg || null,
            has_volume_rate || false,
            volume_rate_per_m3 || null,
            min_charge || null,
            fuel_surcharge_pct || 0,
            is_active !== undefined ? is_active : true
        ]);

        return result.rows[0];
    }

    /**
     * Actualizar transportista
     */
    static async updateCarrier(id, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        const allowedFields = [
            'name', 'tax_id', 'contact_name', 'contact_email', 'contact_phone',
            'address', 'is_own_fleet', 'service_types', 'insurance_number',
            'insurance_expiry', 'contract_start', 'contract_end',
            'rate_type', 'base_rate', 'rate_per_km', 'rate_per_kg',
            'is_active', 'notes'
        ];

        for (const [key, value] of Object.entries(data)) {
            if (allowedFields.includes(key) && value !== undefined) {
                fields.push(`${key} = $${paramIndex++}`);
                values.push(value);
            }
        }

        if (fields.length === 0) return null;

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const query = `
            UPDATE logistics_carriers
            SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // ==================== VEHICLES (Vehículos) ====================

    /**
     * Obtener vehículos
     */
    static async getVehicles(companyId, filters = {}) {
        const { carrier_id, vehicle_type, is_available, limit = 50, offset = 0 } = filters;

        let query = `
            SELECT
                v.*,
                c.name as carrier_name,
                d.name as current_driver_name
            FROM logistics_vehicles v
            LEFT JOIN logistics_carriers c ON v.carrier_id = c.id
            LEFT JOIN logistics_drivers d ON v.current_driver_id = d.id
            WHERE v.company_id = $1
        `;
        const params = [companyId];
        let paramIndex = 2;

        if (carrier_id) {
            query += ` AND v.carrier_id = $${paramIndex++}`;
            params.push(carrier_id);
        }
        if (vehicle_type) {
            query += ` AND v.vehicle_type = $${paramIndex++}`;
            params.push(vehicle_type);
        }
        if (is_available !== undefined) {
            query += ` AND v.is_available = $${paramIndex++}`;
            params.push(is_available);
        }

        query += `
            ORDER BY v.plate_number
            LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Crear vehículo
     */
    static async createVehicle(data) {
        const {
            company_id, carrier_id, plate_number, vehicle_type,
            brand, model, year, vin, max_weight, max_volume,
            fuel_type, current_driver_id, gps_device_id,
            insurance_number, insurance_expiry, vtv_expiry,
            notes, created_by
        } = data;

        const query = `
            INSERT INTO logistics_vehicles (
                company_id, carrier_id, plate_number, vehicle_type,
                brand, model, year, vin, max_weight, max_volume,
                fuel_type, current_driver_id, gps_device_id,
                insurance_number, insurance_expiry, vtv_expiry,
                is_active, is_available, notes, created_by, created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, true, true, $17, $18, NOW()
            )
            RETURNING *
        `;

        const result = await pool.query(query, [
            company_id, carrier_id, plate_number, vehicle_type || 'VAN',
            brand, model, year, vin, max_weight, max_volume,
            fuel_type || 'DIESEL', current_driver_id, gps_device_id,
            insurance_number, insurance_expiry, vtv_expiry,
            notes, created_by
        ]);

        return result.rows[0];
    }

    /**
     * Actualizar disponibilidad de vehículo
     */
    static async updateVehicleAvailability(id, isAvailable, currentDriverId = null) {
        const query = `
            UPDATE logistics_vehicles
            SET is_available = $2,
                current_driver_id = $3,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;
        const result = await pool.query(query, [id, isAvailable, currentDriverId]);
        return result.rows[0];
    }

    // ==================== DRIVERS (Conductores) ====================

    /**
     * Obtener conductores
     */
    static async getDrivers(companyId, filters = {}) {
        const { carrier_id, is_available, limit = 50, offset = 0 } = filters;

        let query = `
            SELECT
                d.*,
                c.name as carrier_name,
                v.plate_number as current_vehicle
            FROM logistics_drivers d
            LEFT JOIN logistics_carriers c ON d.carrier_id = c.id
            LEFT JOIN logistics_vehicles v ON d.current_vehicle_id = v.id
            WHERE d.company_id = $1
        `;
        const params = [companyId];
        let paramIndex = 2;

        if (carrier_id) {
            query += ` AND d.carrier_id = $${paramIndex++}`;
            params.push(carrier_id);
        }
        if (is_available !== undefined) {
            query += ` AND d.is_available = $${paramIndex++}`;
            params.push(is_available);
        }

        query += `
            ORDER BY d.name
            LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Crear conductor
     */
    static async createDriver(data) {
        const {
            company_id, carrier_id, user_id, name, document_number,
            document_type, license_number, license_type, license_expiry,
            phone, email, emergency_contact, emergency_phone,
            notes, created_by
        } = data;

        const query = `
            INSERT INTO logistics_drivers (
                company_id, carrier_id, user_id, name, document_number,
                document_type, license_number, license_type, license_expiry,
                phone, email, emergency_contact, emergency_phone,
                is_active, is_available, notes, created_by, created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, true, true, $14, $15, NOW()
            )
            RETURNING *
        `;

        const result = await pool.query(query, [
            company_id, carrier_id, user_id, name, document_number,
            document_type || 'DNI', license_number, license_type,
            license_expiry, phone, email, emergency_contact, emergency_phone,
            notes, created_by
        ]);

        return result.rows[0];
    }

    // ==================== DELIVERY ZONES (Zonas de Entrega) ====================

    /**
     * Obtener zonas de entrega
     */
    static async getDeliveryZones(companyId, filters = {}) {
        const { is_active, limit = 100, offset = 0 } = filters;

        let query = `
            SELECT
                z.*,
                COUNT(DISTINCT czc.id) as customers_with_override
            FROM logistics_delivery_zones z
            LEFT JOIN logistics_customer_zone_config czc ON z.id = czc.zone_id
            WHERE z.company_id = $1
        `;
        const params = [companyId];
        let paramIndex = 2;

        if (is_active !== undefined) {
            query += ` AND z.is_active = $${paramIndex++}`;
            params.push(is_active);
        }

        query += `
            GROUP BY z.id
            ORDER BY z.name
            LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Obtener zona por ID con configuraciones
     */
    static async getDeliveryZoneById(id) {
        const query = `SELECT * FROM logistics_delivery_zones WHERE id = $1`;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) return null;

        const zone = result.rows[0];

        // Obtener clientes con configuración específica
        const customersQuery = `
            SELECT
                czc.*,
                c.razon_social as customer_name
            FROM logistics_customer_zone_config czc
            JOIN siac_clientes c ON czc.customer_id = c.id
            WHERE czc.zone_id = $1
        `;
        const customersResult = await pool.query(customersQuery, [id]);
        zone.customer_configs = customersResult.rows;

        return zone;
    }

    /**
     * Crear zona de entrega
     */
    static async createDeliveryZone(data) {
        const {
            company_id, warehouse_id, code, name, zone_type,
            country, province, city, localities, postal_codes,
            polygon_geojson, polygon_coordinates,
            delivery_days, delivery_time_from, delivery_hours_from,
            delivery_time_to, delivery_hours_to,
            frequency, delivery_frequency,
            default_carrier_id, carrier_id,
            carrier_service_type,
            delivery_cost, free_shipping_threshold, free_delivery_threshold,
            express_surcharge, lead_time_hours, lead_time_days,
            cutoff_time, min_order_value, min_order_amount,
            max_weight_kg, max_volume_m3, priority,
            is_active
        } = data;

        const query = `
            INSERT INTO logistics_delivery_zones (
                company_id, warehouse_id, code, name, zone_type,
                country, province, city, localities, postal_codes,
                polygon_geojson, delivery_days,
                delivery_time_from, delivery_time_to,
                frequency, default_carrier_id, carrier_service_type,
                delivery_cost, free_shipping_threshold, express_surcharge,
                lead_time_hours, cutoff_time,
                min_order_value, max_weight_kg, max_volume_m3,
                priority, active, created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17,
                $18, $19, $20, $21, $22, $23, $24, $25,
                $26, $27, NOW()
            )
            RETURNING *
        `;

        const defaultDays = JSON.stringify({mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false});
        const resolvedDays = delivery_days ? (typeof delivery_days === 'string' ? delivery_days : JSON.stringify(delivery_days)) : defaultDays;

        const result = await pool.query(query, [
            company_id,
            warehouse_id || null,
            code || (name ? name.substring(0, 20).toUpperCase().replace(/\s+/g, '-') : 'ZONE'),
            name,
            zone_type || 'GEOGRAPHIC',
            country || 'Argentina',
            province || null,
            city || null,
            localities ? JSON.stringify(localities) : null,
            postal_codes ? JSON.stringify(postal_codes) : null,
            polygon_geojson ? JSON.stringify(polygon_geojson) : (polygon_coordinates ? JSON.stringify(polygon_coordinates) : null),
            resolvedDays,
            delivery_time_from || delivery_hours_from || '08:00',
            delivery_time_to || delivery_hours_to || '18:00',
            frequency || delivery_frequency || 'DAILY',
            default_carrier_id || carrier_id || null,
            carrier_service_type || null,
            delivery_cost || null,
            free_shipping_threshold || free_delivery_threshold || null,
            express_surcharge || null,
            lead_time_hours || (lead_time_days ? lead_time_days * 24 : 24),
            cutoff_time || '14:00',
            min_order_value || min_order_amount || null,
            max_weight_kg || null,
            max_volume_m3 || null,
            priority || 10,
            is_active !== undefined ? is_active : true
        ]);

        return result.rows[0];
    }

    /**
     * Actualizar zona de entrega
     */
    static async updateDeliveryZone(id, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        const allowedFields = [
            'name', 'description', 'polygon_coordinates',
            'delivery_days', 'delivery_hours_from', 'delivery_hours_to',
            'delivery_frequency', 'min_order_amount', 'delivery_cost',
            'free_delivery_threshold', 'lead_time_days',
            'carrier_id', 'is_active', 'notes'
        ];

        for (const [key, value] of Object.entries(data)) {
            if (allowedFields.includes(key) && value !== undefined) {
                if (key === 'polygon_coordinates') {
                    fields.push(`${key} = $${paramIndex++}`);
                    values.push(JSON.stringify(value));
                } else {
                    fields.push(`${key} = $${paramIndex++}`);
                    values.push(value);
                }
            }
        }

        if (fields.length === 0) return null;

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const query = `
            UPDATE logistics_delivery_zones
            SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    /**
     * Configurar zona específica para cliente
     */
    static async setCustomerZoneConfig(data) {
        const {
            customer_id, zone_id, company_id,
            custom_delivery_days, custom_delivery_hours_from,
            custom_delivery_hours_to, custom_delivery_cost,
            preferred_carrier_id, delivery_instructions,
            requires_appointment, priority
        } = data;

        const query = `
            INSERT INTO logistics_customer_zone_config (
                customer_id, zone_id, company_id,
                custom_delivery_days, custom_delivery_hours_from,
                custom_delivery_hours_to, custom_delivery_cost,
                preferred_carrier_id, delivery_instructions,
                requires_appointment, priority, is_active, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW())
            ON CONFLICT (customer_id, zone_id)
            DO UPDATE SET
                custom_delivery_days = EXCLUDED.custom_delivery_days,
                custom_delivery_hours_from = EXCLUDED.custom_delivery_hours_from,
                custom_delivery_hours_to = EXCLUDED.custom_delivery_hours_to,
                custom_delivery_cost = EXCLUDED.custom_delivery_cost,
                preferred_carrier_id = EXCLUDED.preferred_carrier_id,
                delivery_instructions = EXCLUDED.delivery_instructions,
                requires_appointment = EXCLUDED.requires_appointment,
                priority = EXCLUDED.priority,
                updated_at = NOW()
            RETURNING *
        `;

        const result = await pool.query(query, [
            customer_id, zone_id, company_id,
            custom_delivery_days, custom_delivery_hours_from,
            custom_delivery_hours_to, custom_delivery_cost,
            preferred_carrier_id, delivery_instructions,
            requires_appointment || false, priority || 'NORMAL'
        ]);

        return result.rows[0];
    }

    /**
     * Obtener configuración de entrega efectiva para cliente
     * (Considera override del cliente sobre zona general)
     */
    static async getEffectiveDeliveryConfig(customerId, zoneId) {
        const query = `
            SELECT
                z.id as zone_id,
                z.name as zone_name,
                COALESCE(czc.custom_delivery_days, z.delivery_days) as delivery_days,
                COALESCE(czc.custom_delivery_hours_from, z.delivery_hours_from) as delivery_hours_from,
                COALESCE(czc.custom_delivery_hours_to, z.delivery_hours_to) as delivery_hours_to,
                COALESCE(czc.custom_delivery_cost, z.delivery_cost) as delivery_cost,
                z.free_delivery_threshold,
                z.min_order_amount,
                z.lead_time_days,
                COALESCE(czc.preferred_carrier_id, z.carrier_id) as carrier_id,
                czc.delivery_instructions,
                COALESCE(czc.requires_appointment, false) as requires_appointment,
                COALESCE(czc.priority, 'NORMAL') as priority,
                CASE WHEN czc.id IS NOT NULL THEN true ELSE false END as has_custom_config
            FROM logistics_delivery_zones z
            LEFT JOIN logistics_customer_zone_config czc
                ON z.id = czc.zone_id AND czc.customer_id = $1
            WHERE z.id = $2
        `;

        const result = await pool.query(query, [customerId, zoneId]);
        return result.rows[0];
    }

    // ==================== ROUTES (Rutas) ====================

    /**
     * Obtener rutas
     */
    static async getRoutes(companyId, filters = {}) {
        const { status, carrier_id, date, limit = 50, offset = 0 } = filters;

        let query = `
            SELECT
                r.*,
                c.name as carrier_name,
                v.plate_number as vehicle_plate,
                d.name as driver_name,
                COUNT(rs.id) as stops_count,
                SUM(CASE WHEN rs.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_stops
            FROM logistics_routes r
            LEFT JOIN logistics_carriers c ON r.carrier_id = c.id
            LEFT JOIN logistics_vehicles v ON r.vehicle_id = v.id
            LEFT JOIN logistics_drivers d ON r.driver_id = d.id
            LEFT JOIN logistics_route_stops rs ON r.id = rs.route_id
            WHERE r.company_id = $1
        `;
        const params = [companyId];
        let paramIndex = 2;

        if (status) {
            query += ` AND r.status = $${paramIndex++}`;
            params.push(status);
        }
        if (carrier_id) {
            query += ` AND r.carrier_id = $${paramIndex++}`;
            params.push(carrier_id);
        }
        if (date) {
            query += ` AND r.route_date = $${paramIndex++}`;
            params.push(date);
        }

        query += `
            GROUP BY r.id, c.name, v.plate_number, d.name
            ORDER BY r.route_date DESC, r.created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Obtener ruta por ID con paradas
     */
    static async getRouteById(id) {
        const routeQuery = `
            SELECT
                r.*,
                c.name as carrier_name,
                v.plate_number as vehicle_plate,
                v.brand as vehicle_brand,
                v.model as vehicle_model,
                d.name as driver_name,
                d.phone as driver_phone
            FROM logistics_routes r
            LEFT JOIN logistics_carriers c ON r.carrier_id = c.id
            LEFT JOIN logistics_vehicles v ON r.vehicle_id = v.id
            LEFT JOIN logistics_drivers d ON r.driver_id = d.id
            WHERE r.id = $1
        `;
        const routeResult = await pool.query(routeQuery, [id]);
        if (routeResult.rows.length === 0) return null;

        const route = routeResult.rows[0];

        // Obtener paradas ordenadas
        const stopsQuery = `
            SELECT
                rs.*,
                s.tracking_number as shipment_tracking,
                c.razon_social as customer_name,
                c.domicilio_calle as customer_address
            FROM logistics_route_stops rs
            LEFT JOIN logistics_shipments s ON rs.shipment_id = s.id
            LEFT JOIN siac_clientes c ON rs.customer_id = c.id
            WHERE rs.route_id = $1
            ORDER BY rs.sequence
        `;
        const stopsResult = await pool.query(stopsQuery, [id]);
        route.stops = stopsResult.rows;

        return route;
    }

    /**
     * Crear ruta
     */
    static async createRoute(data) {
        const {
            company_id, warehouse_id, carrier_id, vehicle_id, driver_id,
            route_date, planned_departure, planned_return,
            planned_distance_km, planned_duration_minutes,
            notes, created_by
        } = data;

        const query = `
            INSERT INTO logistics_routes (
                company_id, warehouse_id, carrier_id, vehicle_id, driver_id,
                route_date, planned_departure, planned_return,
                planned_distance_km, planned_duration_minutes,
                status, notes, created_by, created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                'PLANNED', $11, $12, NOW()
            )
            RETURNING *
        `;

        const result = await pool.query(query, [
            company_id, warehouse_id, carrier_id, vehicle_id, driver_id,
            route_date, planned_departure, planned_return,
            planned_distance_km || 0, planned_duration_minutes || 0,
            notes, created_by
        ]);

        return result.rows[0];
    }

    /**
     * Agregar parada a ruta
     */
    static async addRouteStop(data) {
        const {
            route_id, shipment_id, customer_id, sequence,
            address, latitude, longitude,
            estimated_arrival_time, time_window_from, time_window_to,
            service_time_minutes, notes
        } = data;

        const query = `
            INSERT INTO logistics_route_stops (
                route_id, shipment_id, customer_id, sequence,
                address, latitude, longitude,
                estimated_arrival_time, time_window_from, time_window_to,
                service_time_minutes, status, notes, created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', $12, NOW()
            )
            RETURNING *
        `;

        const result = await pool.query(query, [
            route_id, shipment_id, customer_id, sequence,
            address, latitude, longitude,
            estimated_arrival_time, time_window_from, time_window_to,
            service_time_minutes || 15, notes
        ]);

        return result.rows[0];
    }

    /**
     * Actualizar estado de parada (para app móvil del conductor)
     */
    static async updateStopStatus(stopId, data) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const { status, actual_arrival_time, actual_departure_time,
                signature_data, photo_urls, notes, updated_by } = data;

            // Actualizar parada
            await client.query(`
                UPDATE logistics_route_stops
                SET status = $2,
                    actual_arrival_time = COALESCE($3, actual_arrival_time),
                    actual_departure_time = COALESCE($4, actual_departure_time),
                    signature_data = COALESCE($5, signature_data),
                    photo_urls = COALESCE($6, photo_urls),
                    notes = COALESCE($7, notes),
                    updated_at = NOW()
                WHERE id = $1
            `, [stopId, status, actual_arrival_time, actual_departure_time,
                signature_data, photo_urls ? JSON.stringify(photo_urls) : null, notes]);

            // Obtener info de la parada
            const stopResult = await client.query(`
                SELECT route_id, shipment_id FROM logistics_route_stops WHERE id = $1
            `, [stopId]);
            const stop = stopResult.rows[0];

            // Si hay envío asociado, actualizar su estado también
            if (stop.shipment_id && status === 'COMPLETED') {
                await client.query(`
                    UPDATE logistics_shipments
                    SET status = 'DELIVERED',
                        actual_delivery_date = NOW(),
                        updated_at = NOW()
                    WHERE id = $1
                `, [stop.shipment_id]);

                // Agregar tracking
                await client.query(`
                    INSERT INTO logistics_shipment_tracking (
                        shipment_id, status, location, notes, created_by, created_at
                    ) VALUES ($1, 'DELIVERED', $2, 'Entregado al cliente', $3, NOW())
                `, [stop.shipment_id, 'En destino', updated_by]);
            }

            // Verificar si ruta está completa
            const pendingStops = await client.query(`
                SELECT COUNT(*) as count FROM logistics_route_stops
                WHERE route_id = $1 AND status IN ('PENDING', 'IN_PROGRESS')
            `, [stop.route_id]);

            if (parseInt(pendingStops.rows[0].count) === 0) {
                await client.query(`
                    UPDATE logistics_routes
                    SET status = 'COMPLETED',
                        actual_end_time = NOW(),
                        updated_at = NOW()
                    WHERE id = $1
                `, [stop.route_id]);
            }

            await client.query('COMMIT');

            return await this.getRouteById(stop.route_id);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Iniciar ruta
     */
    static async startRoute(routeId, driverId) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Actualizar ruta
            await client.query(`
                UPDATE logistics_routes
                SET status = 'IN_PROGRESS',
                    actual_start_time = NOW(),
                    driver_id = COALESCE(driver_id, $2),
                    updated_at = NOW()
                WHERE id = $1
            `, [routeId, driverId]);

            // Marcar primera parada como en progreso
            await client.query(`
                UPDATE logistics_route_stops
                SET status = 'IN_PROGRESS'
                WHERE route_id = $1 AND sequence = 1
            `, [routeId]);

            await client.query('COMMIT');

            return await this.getRouteById(routeId);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ==================== ROUTE OPTIMIZATION ====================

    /**
     * Optimizar orden de paradas (algoritmo básico por distancia)
     */
    static async optimizeRoute(routeId) {
        // Obtener paradas con coordenadas
        const stopsResult = await pool.query(`
            SELECT id, latitude, longitude
            FROM logistics_route_stops
            WHERE route_id = $1 AND latitude IS NOT NULL
            ORDER BY sequence
        `, [routeId]);

        if (stopsResult.rows.length < 3) {
            return { message: 'Route too short to optimize' };
        }

        const stops = stopsResult.rows;

        // Algoritmo simple: nearest neighbor
        const optimized = [stops[0]]; // Empezar desde primera parada
        const remaining = stops.slice(1);

        while (remaining.length > 0) {
            const current = optimized[optimized.length - 1];
            let nearestIndex = 0;
            let nearestDistance = Infinity;

            for (let i = 0; i < remaining.length; i++) {
                const dist = this._haversineDistance(
                    current.latitude, current.longitude,
                    remaining[i].latitude, remaining[i].longitude
                );
                if (dist < nearestDistance) {
                    nearestDistance = dist;
                    nearestIndex = i;
                }
            }

            optimized.push(remaining.splice(nearestIndex, 1)[0]);
        }

        // Actualizar secuencias
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (let i = 0; i < optimized.length; i++) {
                await client.query(`
                    UPDATE logistics_route_stops
                    SET sequence = $2
                    WHERE id = $1
                `, [optimized[i].id, i + 1]);
            }

            await client.query('COMMIT');

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        return await this.getRouteById(routeId);
    }

    /**
     * Calcular distancia Haversine entre dos puntos
     */
    static _haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // ==================== KPIs ====================

    /**
     * Obtener KPIs de rutas
     */
    static async getRouteKPIs(companyId, dateRange = {}) {
        const { dateFrom, dateTo } = dateRange;

        let dateFilter = '';
        const params = [companyId];

        if (dateFrom && dateTo) {
            dateFilter = 'AND r.route_date BETWEEN $2 AND $3';
            params.push(dateFrom, dateTo);
        }

        const query = `
            SELECT
                COUNT(DISTINCT r.id) as total_routes,
                COUNT(DISTINCT rs.id) as total_stops,
                SUM(CASE WHEN r.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_routes,
                SUM(CASE WHEN rs.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_stops,
                AVG(r.actual_distance_km) as avg_distance_km,
                AVG(EXTRACT(EPOCH FROM (r.actual_end_time - r.actual_start_time))/60) as avg_route_duration_min,
                SUM(CASE WHEN rs.actual_arrival_time <= rs.time_window_to THEN 1 ELSE 0 END)::float /
                    NULLIF(COUNT(rs.id), 0) * 100 as on_time_delivery_percent
            FROM logistics_routes r
            LEFT JOIN logistics_route_stops rs ON r.id = rs.route_id
            WHERE r.company_id = $1
            ${dateFilter}
        `;

        const result = await pool.query(query, params);
        return result.rows[0];
    }
}

module.exports = RouteService;
