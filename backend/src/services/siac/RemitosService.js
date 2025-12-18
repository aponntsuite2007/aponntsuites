/**
 * ============================================================================
 * REMITOS SERVICE - Gestión de Remitos de Mercadería
 * ============================================================================
 *
 * Funcionalidades:
 * - CRUD de remitos
 * - Generación desde presupuesto
 * - Facturación de remitos (siempre a cuenta corriente)
 * - Control de entregas parciales
 *
 * Created: 2025-12-17
 */

const { Pool } = require('pg');

class RemitosService {
    constructor() {
        this.pool = new Pool({
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT || '5432'),
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DB || 'attendance_system'
        });
    }

    /**
     * Crear remito nuevo (directo o desde presupuesto)
     */
    async create(data) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Obtener próximo número de remito
            const numResult = await client.query(
                'SELECT get_proximo_numero_remito($1, $2) as numero',
                [data.company_id, data.punto_venta]
            );
            const numeroRemito = numResult.rows[0].numero;

            // Insertar remito
            const remitoResult = await client.query(`
                INSERT INTO siac_remitos (
                    company_id, tipo_remito, punto_venta, numero_remito,
                    fecha, cai, cai_vencimiento,
                    cliente_id, cliente_nombre, cliente_cuit, cliente_domicilio,
                    entrega_domicilio, entrega_localidad, entrega_provincia,
                    entrega_codigo_postal, entrega_contacto, entrega_telefono,
                    transporte, patente, chofer, chofer_dni,
                    presupuesto_id, observaciones, usuario_id
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                    $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
                    $22, $23, $24
                )
                RETURNING *
            `, [
                data.company_id,
                data.tipo_remito || 'R',
                data.punto_venta,
                numeroRemito,
                data.fecha || new Date(),
                data.cai,
                data.cai_vencimiento,
                data.cliente_id,
                data.cliente_nombre,
                data.cliente_cuit,
                data.cliente_domicilio,
                data.entrega_domicilio,
                data.entrega_localidad,
                data.entrega_provincia,
                data.entrega_codigo_postal,
                data.entrega_contacto,
                data.entrega_telefono,
                data.transporte,
                data.patente,
                data.chofer,
                data.chofer_dni,
                data.presupuesto_id,
                data.observaciones,
                data.usuario_id
            ]);

            const remito = remitoResult.rows[0];

            // Insertar items
            if (data.items && data.items.length > 0) {
                for (let i = 0; i < data.items.length; i++) {
                    const item = data.items[i];
                    await client.query(`
                        INSERT INTO siac_remitos_items (
                            remito_id, producto_id, codigo, descripcion,
                            unidad_medida, cantidad, presupuesto_item_id,
                            lote, numero_serie, fecha_vencimiento, orden, observaciones
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    `, [
                        remito.id,
                        item.producto_id,
                        item.codigo,
                        item.descripcion,
                        item.unidad_medida || 'UN',
                        item.cantidad,
                        item.presupuesto_item_id,
                        item.lote,
                        item.numero_serie,
                        item.fecha_vencimiento,
                        i + 1,
                        item.observaciones
                    ]);
                }

                // Actualizar cantidad de items
                await client.query(
                    'UPDATE siac_remitos SET cantidad_items = $1 WHERE id = $2',
                    [data.items.length, remito.id]
                );
            }

            // Si viene de presupuesto, actualizar estado
            if (data.presupuesto_id) {
                await client.query(`
                    UPDATE siac_presupuestos
                    SET estado = 'REMITADO', updated_at = NOW()
                    WHERE id = $1
                `, [data.presupuesto_id]);
            }

            await client.query('COMMIT');

            return await this.getById(remito.id);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Crear remito desde presupuesto
     */
    async createFromPresupuesto(presupuestoId, data) {
        const client = await this.pool.connect();

        try {
            // Obtener presupuesto con sus items
            const presResult = await client.query(`
                SELECT p.*,
                    c.razon_social as cliente_nombre_db,
                    c.documento_numero as cliente_cuit_db,
                    c.domicilio_completo as cliente_domicilio_db
                FROM siac_presupuestos p
                LEFT JOIN siac_clientes c ON p.cliente_id = c.id
                WHERE p.id = $1
            `, [presupuestoId]);

            if (presResult.rows.length === 0) {
                throw new Error('Presupuesto no encontrado');
            }

            const presupuesto = presResult.rows[0];

            if (!['APROBADO', 'ACEPTADO'].includes(presupuesto.estado)) {
                throw new Error(`No se puede generar remito. Estado actual: ${presupuesto.estado}`);
            }

            // Obtener items del presupuesto (si hay tabla de items)
            let items = [];
            if (presupuesto.items && typeof presupuesto.items === 'object') {
                // Items vienen como JSONB
                items = presupuesto.items.map((item, index) => ({
                    producto_id: item.producto_id,
                    codigo: item.codigo_producto || item.codigo,
                    descripcion: item.nombre_producto || item.descripcion,
                    unidad_medida: item.unidad_medida || 'UN',
                    cantidad: item.cantidad,
                    presupuesto_item_id: item.id,
                    orden: index + 1
                }));
            }

            // Crear remito
            const remitoData = {
                company_id: presupuesto.company_id,
                tipo_remito: data.tipo_remito || 'R',
                punto_venta: data.punto_venta || 1,
                fecha: data.fecha || new Date(),
                cai: data.cai,
                cai_vencimiento: data.cai_vencimiento,
                cliente_id: presupuesto.cliente_id,
                cliente_nombre: presupuesto.cliente_nombre_db || presupuesto.cliente_razon_social,
                cliente_cuit: presupuesto.cliente_cuit_db || presupuesto.cliente_documento_numero,
                cliente_domicilio: presupuesto.cliente_domicilio_db || presupuesto.cliente_direccion,
                entrega_domicilio: data.entrega_domicilio,
                entrega_localidad: data.entrega_localidad,
                entrega_provincia: data.entrega_provincia,
                entrega_codigo_postal: data.entrega_codigo_postal,
                entrega_contacto: data.entrega_contacto,
                entrega_telefono: data.entrega_telefono,
                transporte: data.transporte,
                patente: data.patente,
                chofer: data.chofer,
                chofer_dni: data.chofer_dni,
                presupuesto_id: presupuestoId,
                observaciones: data.observaciones,
                usuario_id: data.usuario_id,
                items: items.length > 0 ? items : data.items
            };

            return await this.create(remitoData);

        } finally {
            client.release();
        }
    }

    /**
     * Obtener remito por ID con items
     */
    async getById(id) {
        const remitoResult = await this.pool.query(`
            SELECT r.*,
                c.razon_social as cliente_razon_social,
                c.email as cliente_email,
                c.telefono as cliente_telefono
            FROM siac_remitos r
            LEFT JOIN siac_clientes c ON r.cliente_id = c.id
            WHERE r.id = $1
        `, [id]);

        if (remitoResult.rows.length === 0) {
            return null;
        }

        const remito = remitoResult.rows[0];

        // Obtener items
        const itemsResult = await this.pool.query(`
            SELECT ri.*,
                p.nombre_producto,
                p.codigo_barras
            FROM siac_remitos_items ri
            LEFT JOIN siac_productos p ON ri.producto_id = p.id
            WHERE ri.remito_id = $1
            ORDER BY ri.orden
        `, [id]);

        remito.items = itemsResult.rows;

        return remito;
    }

    /**
     * Listar remitos con filtros
     */
    async list(filters = {}) {
        let query = `
            SELECT r.*,
                c.razon_social as cliente_razon_social,
                c.documento_numero as cliente_documento
            FROM siac_remitos r
            LEFT JOIN siac_clientes c ON r.cliente_id = c.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.company_id) {
            query += ` AND r.company_id = $${paramIndex++}`;
            params.push(filters.company_id);
        }

        if (filters.cliente_id) {
            query += ` AND r.cliente_id = $${paramIndex++}`;
            params.push(filters.cliente_id);
        }

        if (filters.estado) {
            query += ` AND r.estado = $${paramIndex++}`;
            params.push(filters.estado);
        }

        if (filters.pendientes_facturar) {
            query += ` AND r.estado IN ('EMITIDO', 'ENTREGADO', 'PARCIAL')`;
        }

        if (filters.fecha_desde) {
            query += ` AND r.fecha >= $${paramIndex++}`;
            params.push(filters.fecha_desde);
        }

        if (filters.fecha_hasta) {
            query += ` AND r.fecha <= $${paramIndex++}`;
            params.push(filters.fecha_hasta);
        }

        if (filters.search) {
            query += ` AND (
                r.numero_completo ILIKE $${paramIndex} OR
                r.cliente_nombre ILIKE $${paramIndex} OR
                c.razon_social ILIKE $${paramIndex}
            )`;
            params.push(`%${filters.search}%`);
            paramIndex++;
        }

        query += ' ORDER BY r.fecha DESC, r.id DESC';

        if (filters.limit) {
            query += ` LIMIT $${paramIndex++}`;
            params.push(filters.limit);
        }

        if (filters.offset) {
            query += ` OFFSET $${paramIndex++}`;
            params.push(filters.offset);
        }

        const result = await this.pool.query(query, params);
        return result.rows;
    }

    /**
     * Obtener remitos pendientes de facturar
     */
    async getPendientesFacurar(companyId) {
        return await this.list({
            company_id: companyId,
            pendientes_facturar: true
        });
    }

    /**
     * Marcar remito como entregado
     */
    async marcarEntregado(id, data = {}) {
        const result = await this.pool.query(`
            UPDATE siac_remitos
            SET estado = 'ENTREGADO',
                observaciones = COALESCE($2, observaciones),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [id, data.observaciones]);

        return result.rows[0];
    }

    /**
     * Facturar remito (crear factura desde remito)
     * NOTA: Los remitos SIEMPRE se facturan a cuenta corriente
     */
    async facturar(remitoId, facturaData) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Obtener remito
            const remito = await this.getById(remitoId);

            if (!remito) {
                throw new Error('Remito no encontrado');
            }

            if (remito.estado === 'FACTURADO') {
                throw new Error('Este remito ya fue facturado');
            }

            if (remito.estado === 'ANULADO') {
                throw new Error('No se puede facturar un remito anulado');
            }

            // Verificar que el cliente pueda facturar en cuenta corriente
            const clienteResult = await client.query(`
                SELECT * FROM get_estado_cuenta_cliente($1)
            `, [remito.cliente_id]);

            const estadoCliente = clienteResult.rows[0];

            if (!estadoCliente.puede_facturar) {
                throw new Error(`No se puede facturar: ${estadoCliente.motivo_bloqueo}`);
            }

            // La factura se crea llamando al servicio de facturas
            // Aquí solo marcamos el remito y devolvemos los datos necesarios

            await client.query(`
                UPDATE siac_remitos
                SET estado = 'FACTURADO',
                    factura_id = $2,
                    facturado_at = NOW(),
                    updated_at = NOW()
                WHERE id = $1
            `, [remitoId, facturaData.factura_id]);

            // Actualizar items como facturados (100%)
            await client.query(`
                UPDATE siac_remitos_items
                SET cantidad_facturada = cantidad
                WHERE remito_id = $1
            `, [remitoId]);

            await client.query('COMMIT');

            return {
                success: true,
                remito_id: remitoId,
                factura_id: facturaData.factura_id,
                message: 'Remito facturado correctamente'
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Anular remito
     */
    async anular(id, data) {
        const remito = await this.getById(id);

        if (!remito) {
            throw new Error('Remito no encontrado');
        }

        if (remito.estado === 'FACTURADO') {
            throw new Error('No se puede anular un remito ya facturado');
        }

        const result = await this.pool.query(`
            UPDATE siac_remitos
            SET estado = 'ANULADO',
                anulado_por = $2,
                anulado_at = NOW(),
                motivo_anulacion = $3,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [id, data.usuario_id, data.motivo]);

        // Si tenía presupuesto asociado, revertir estado
        if (remito.presupuesto_id) {
            await this.pool.query(`
                UPDATE siac_presupuestos
                SET estado = 'APROBADO', updated_at = NOW()
                WHERE id = $1 AND estado = 'REMITADO'
            `, [remito.presupuesto_id]);
        }

        return result.rows[0];
    }

    /**
     * Obtener datos para crear factura desde remito
     */
    async getDatosParaFactura(remitoId) {
        const remito = await this.getById(remitoId);

        if (!remito) {
            throw new Error('Remito no encontrado');
        }

        // Obtener datos completos del cliente
        const clienteResult = await this.pool.query(`
            SELECT *,
                condicion_fiscal_code as condicion_iva_code
            FROM siac_clientes
            WHERE id = $1
        `, [remito.cliente_id]);

        const cliente = clienteResult.rows[0];

        // Preparar items para factura (necesitan precios)
        const itemsResult = await this.pool.query(`
            SELECT ri.*,
                p.precio_venta,
                p.alicuota_iva
            FROM siac_remitos_items ri
            LEFT JOIN siac_productos p ON ri.producto_id = p.id
            WHERE ri.remito_id = $1
            ORDER BY ri.orden
        `, [remitoId]);

        return {
            remito,
            cliente,
            items: itemsResult.rows,
            condicion_venta: 'CUENTA_CORRIENTE' // Remitos siempre a cta cte
        };
    }

    /**
     * Obtener estadísticas de remitos
     */
    async getEstadisticas(companyId, periodo = 'month') {
        let fechaDesde;
        const hoy = new Date();

        switch (periodo) {
            case 'week':
                fechaDesde = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                fechaDesde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                break;
            case 'year':
                fechaDesde = new Date(hoy.getFullYear(), 0, 1);
                break;
            default:
                fechaDesde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        }

        const result = await this.pool.query(`
            SELECT
                COUNT(*) as total_remitos,
                COUNT(*) FILTER (WHERE estado = 'EMITIDO') as emitidos,
                COUNT(*) FILTER (WHERE estado = 'ENTREGADO') as entregados,
                COUNT(*) FILTER (WHERE estado = 'FACTURADO') as facturados,
                COUNT(*) FILTER (WHERE estado IN ('EMITIDO', 'ENTREGADO', 'PARCIAL')) as pendientes_facturar,
                COUNT(*) FILTER (WHERE estado = 'ANULADO') as anulados
            FROM siac_remitos
            WHERE company_id = $1 AND fecha >= $2
        `, [companyId, fechaDesde]);

        return result.rows[0];
    }
}

module.exports = new RemitosService();
