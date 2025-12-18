/**
 * ============================================================================
 * COBRANZAS SERVICE - Gestión de Cobranzas, Recibos y Cheques
 * ============================================================================
 *
 * Funcionalidades:
 * - Emisión de recibos de cobro
 * - Imputación a facturas
 * - Gestión de cheques en cartera
 * - Seguimiento de cobranza
 *
 * Created: 2025-12-17
 */

const { Pool } = require('pg');
const CuentaCorrienteService = require('./CuentaCorrienteService');

class CobranzasService {
    constructor() {
        this.pool = new Pool({
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT || '5432'),
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DB || 'attendance_system'
        });
    }

    // =========================================================================
    // RECIBOS
    // =========================================================================

    /**
     * Crear recibo de cobro
     */
    async crearRecibo(data) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Obtener próximo número de recibo
            const numResult = await client.query(
                'SELECT get_proximo_numero_recibo($1, $2) as numero',
                [data.company_id, data.punto_venta || 1]
            );
            const numeroRecibo = numResult.rows[0].numero;

            // Calcular total de medios de pago
            let totalRecibo = 0;
            if (data.medios_pago && data.medios_pago.length > 0) {
                totalRecibo = data.medios_pago.reduce((sum, mp) => sum + parseFloat(mp.monto), 0);
            } else {
                totalRecibo = data.total || 0;
            }

            // Insertar recibo
            const reciboResult = await client.query(`
                INSERT INTO siac_recibos (
                    company_id, punto_venta, numero_recibo, fecha,
                    cliente_id, cliente_nombre, total, moneda, cotizacion,
                    cobrador_id, sesion_caja_id, observaciones, usuario_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
            `, [
                data.company_id,
                data.punto_venta || 1,
                numeroRecibo,
                data.fecha || new Date(),
                data.cliente_id,
                data.cliente_nombre,
                totalRecibo,
                data.moneda || 'ARS',
                data.cotizacion || 1,
                data.cobrador_id,
                data.sesion_caja_id,
                data.observaciones,
                data.usuario_id
            ]);

            const recibo = reciboResult.rows[0];

            // Insertar medios de pago
            if (data.medios_pago && data.medios_pago.length > 0) {
                for (const mp of data.medios_pago) {
                    const mpResult = await client.query(`
                        INSERT INTO siac_recibos_medios_pago (
                            recibo_id, medio_pago, monto,
                            cheque_numero, cheque_banco, cheque_sucursal,
                            cheque_cuit_emisor, cheque_titular, cheque_fecha_emision,
                            cheque_fecha_cobro, cheque_a_la_orden, cheque_cruzado,
                            transferencia_referencia, transferencia_banco,
                            transferencia_fecha, transferencia_cbu_origen,
                            tarjeta_tipo, tarjeta_ultimos_digitos,
                            tarjeta_cuotas, tarjeta_autorizacion
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                        RETURNING *
                    `, [
                        recibo.id,
                        mp.medio_pago,
                        mp.monto,
                        mp.cheque_numero,
                        mp.cheque_banco,
                        mp.cheque_sucursal,
                        mp.cheque_cuit_emisor,
                        mp.cheque_titular,
                        mp.cheque_fecha_emision,
                        mp.cheque_fecha_cobro,
                        mp.cheque_a_la_orden,
                        mp.cheque_cruzado || false,
                        mp.transferencia_referencia,
                        mp.transferencia_banco,
                        mp.transferencia_fecha,
                        mp.transferencia_cbu_origen,
                        mp.tarjeta_tipo,
                        mp.tarjeta_ultimos_digitos,
                        mp.tarjeta_cuotas || 1,
                        mp.tarjeta_autorizacion
                    ]);

                    // Si es cheque, agregar a cartera
                    if (mp.medio_pago.startsWith('CHEQUE')) {
                        await this.agregarChequeCartera({
                            company_id: data.company_id,
                            recibo_medio_pago_id: mpResult.rows[0].id,
                            cliente_origen_id: data.cliente_id,
                            numero: mp.cheque_numero,
                            banco: mp.cheque_banco,
                            sucursal: mp.cheque_sucursal,
                            cuit_emisor: mp.cheque_cuit_emisor,
                            titular: mp.cheque_titular,
                            fecha_emision: mp.cheque_fecha_emision,
                            fecha_cobro: mp.cheque_fecha_cobro,
                            a_la_orden: mp.cheque_a_la_orden,
                            cruzado: mp.cheque_cruzado,
                            monto: mp.monto,
                            usuario_id: data.usuario_id
                        }, client);
                    }
                }
            }

            // Insertar imputaciones
            if (data.imputaciones && data.imputaciones.length > 0) {
                for (const imp of data.imputaciones) {
                    await client.query(`
                        INSERT INTO siac_recibos_imputaciones (
                            recibo_id, factura_id, movimiento_cta_cte_id,
                            factura_numero, factura_fecha, factura_total,
                            saldo_anterior, monto_imputado, saldo_posterior,
                            es_anticipo
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    `, [
                        recibo.id,
                        imp.factura_id,
                        imp.movimiento_cta_cte_id,
                        imp.factura_numero,
                        imp.factura_fecha,
                        imp.factura_total,
                        imp.saldo_anterior,
                        imp.monto_imputado,
                        imp.saldo_posterior,
                        imp.es_anticipo || false
                    ]);
                }
            }

            // Registrar crédito en cuenta corriente
            await CuentaCorrienteService.registrarCredito({
                company_id: data.company_id,
                cliente_id: data.cliente_id,
                monto: totalRecibo,
                concepto: 'RECIBO',
                comprobante_tipo: 'RECIBO',
                comprobante_numero: recibo.numero_completo,
                recibo_id: recibo.id,
                fecha: data.fecha,
                observaciones: data.observaciones,
                usuario_id: data.usuario_id
            });

            // Imputar pago a comprobantes pendientes (FIFO)
            if (totalRecibo > 0) {
                await CuentaCorrienteService.imputarPago(data.cliente_id, totalRecibo, recibo.id);
            }

            await client.query('COMMIT');

            return await this.getReciboById(recibo.id);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Obtener recibo por ID con detalles
     */
    async getReciboById(id) {
        const reciboResult = await this.pool.query(`
            SELECT r.*,
                c.razon_social as cliente_razon_social,
                c.documento_numero as cliente_documento
            FROM siac_recibos r
            LEFT JOIN siac_clientes c ON r.cliente_id = c.id
            WHERE r.id = $1
        `, [id]);

        if (reciboResult.rows.length === 0) {
            return null;
        }

        const recibo = reciboResult.rows[0];

        // Obtener medios de pago
        const mpResult = await this.pool.query(`
            SELECT * FROM siac_recibos_medios_pago WHERE recibo_id = $1
        `, [id]);
        recibo.medios_pago = mpResult.rows;

        // Obtener imputaciones
        const impResult = await this.pool.query(`
            SELECT i.*, f.numero_completo as factura_numero_completo
            FROM siac_recibos_imputaciones i
            LEFT JOIN siac_facturas f ON i.factura_id = f.id
            WHERE i.recibo_id = $1
        `, [id]);
        recibo.imputaciones = impResult.rows;

        return recibo;
    }

    /**
     * Listar recibos
     */
    async listarRecibos(filters = {}) {
        let query = `
            SELECT r.*,
                c.razon_social as cliente_razon_social,
                c.documento_numero as cliente_documento
            FROM siac_recibos r
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

        if (filters.fecha_desde) {
            query += ` AND r.fecha >= $${paramIndex++}`;
            params.push(filters.fecha_desde);
        }

        if (filters.fecha_hasta) {
            query += ` AND r.fecha <= $${paramIndex++}`;
            params.push(filters.fecha_hasta);
        }

        if (filters.estado) {
            query += ` AND r.estado = $${paramIndex++}`;
            params.push(filters.estado);
        }

        if (filters.search) {
            query += ` AND (
                r.numero_completo ILIKE $${paramIndex} OR
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

        const result = await this.pool.query(query, params);
        return result.rows;
    }

    /**
     * Anular recibo
     */
    async anularRecibo(id, data) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const recibo = await this.getReciboById(id);

            if (!recibo) {
                throw new Error('Recibo no encontrado');
            }

            if (recibo.estado === 'ANULADO') {
                throw new Error('El recibo ya está anulado');
            }

            // Anular recibo
            await client.query(`
                UPDATE siac_recibos
                SET estado = 'ANULADO',
                    anulado_por = $2,
                    anulado_at = NOW(),
                    motivo_anulacion = $3
                WHERE id = $1
            `, [id, data.usuario_id, data.motivo]);

            // Reversar movimiento de cuenta corriente
            await CuentaCorrienteService.registrarDebito({
                company_id: recibo.company_id,
                cliente_id: recibo.cliente_id,
                monto: recibo.total,
                concepto: 'AJUSTE_DEBITO',
                comprobante_tipo: 'ANULACION_RECIBO',
                comprobante_numero: `ANUL-${recibo.numero_completo}`,
                observaciones: `Anulación de recibo ${recibo.numero_completo}: ${data.motivo}`,
                usuario_id: data.usuario_id
            });

            // Anular cheques si los hay
            for (const mp of recibo.medios_pago) {
                if (mp.medio_pago.startsWith('CHEQUE')) {
                    await client.query(`
                        UPDATE siac_cheques_cartera
                        SET estado = 'ANULADO', updated_at = NOW()
                        WHERE recibo_medio_pago_id = $1
                    `, [mp.id]);
                }
            }

            await client.query('COMMIT');

            return await this.getReciboById(id);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // =========================================================================
    // CHEQUES EN CARTERA
    // =========================================================================

    /**
     * Agregar cheque a cartera
     */
    async agregarChequeCartera(data, existingClient = null) {
        const client = existingClient || await this.pool.connect();
        const shouldRelease = !existingClient;

        try {
            const result = await client.query(`
                INSERT INTO siac_cheques_cartera (
                    company_id, recibo_medio_pago_id, cliente_origen_id,
                    numero, banco, sucursal, plaza, cuit_emisor, titular,
                    fecha_emision, fecha_cobro, a_la_orden, cruzado, monto,
                    usuario_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING *
            `, [
                data.company_id,
                data.recibo_medio_pago_id,
                data.cliente_origen_id,
                data.numero,
                data.banco,
                data.sucursal,
                data.plaza,
                data.cuit_emisor,
                data.titular,
                data.fecha_emision,
                data.fecha_cobro,
                data.a_la_orden,
                data.cruzado || false,
                data.monto,
                data.usuario_id
            ]);

            return result.rows[0];

        } finally {
            if (shouldRelease) {
                client.release();
            }
        }
    }

    /**
     * Listar cheques en cartera
     */
    async listarChequesCartera(filters = {}) {
        let query = `
            SELECT c.*,
                cl.razon_social as cliente_nombre
            FROM siac_cheques_cartera c
            LEFT JOIN siac_clientes cl ON c.cliente_origen_id = cl.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.company_id) {
            query += ` AND c.company_id = $${paramIndex++}`;
            params.push(filters.company_id);
        }

        if (filters.estado) {
            query += ` AND c.estado = $${paramIndex++}`;
            params.push(filters.estado);
        }

        if (filters.estados) {
            query += ` AND c.estado = ANY($${paramIndex++})`;
            params.push(filters.estados);
        }

        if (filters.fecha_cobro_desde) {
            query += ` AND c.fecha_cobro >= $${paramIndex++}`;
            params.push(filters.fecha_cobro_desde);
        }

        if (filters.fecha_cobro_hasta) {
            query += ` AND c.fecha_cobro <= $${paramIndex++}`;
            params.push(filters.fecha_cobro_hasta);
        }

        if (filters.banco) {
            query += ` AND c.banco ILIKE $${paramIndex++}`;
            params.push(`%${filters.banco}%`);
        }

        query += ' ORDER BY c.fecha_cobro ASC';

        if (filters.limit) {
            query += ` LIMIT $${paramIndex++}`;
            params.push(filters.limit);
        }

        const result = await this.pool.query(query, params);
        return result.rows;
    }

    /**
     * Obtener cheques a vencer
     */
    async getChequesAVencer(companyId, dias = 7) {
        const result = await this.pool.query(`
            SELECT * FROM get_cheques_a_vencer($1, $2)
        `, [companyId, dias]);

        return result.rows;
    }

    /**
     * Depositar cheque
     */
    async depositarCheque(chequeId, data) {
        const result = await this.pool.query(`
            UPDATE siac_cheques_cartera
            SET estado = 'DEPOSITADO',
                fecha_deposito = $2,
                banco_deposito = $3,
                cuenta_deposito = $4,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [chequeId, data.fecha_deposito || new Date(), data.banco_deposito, data.cuenta_deposito]);

        return result.rows[0];
    }

    /**
     * Marcar cheque como cobrado
     */
    async cobrarCheque(chequeId, data = {}) {
        const result = await this.pool.query(`
            UPDATE siac_cheques_cartera
            SET estado = 'COBRADO',
                fecha_cobro_real = $2,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [chequeId, data.fecha_cobro_real || new Date()]);

        return result.rows[0];
    }

    /**
     * Rechazar cheque
     */
    async rechazarCheque(chequeId, data) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const chequeResult = await client.query(`
                UPDATE siac_cheques_cartera
                SET estado = 'RECHAZADO',
                    fecha_rechazo = $2,
                    motivo_rechazo = $3,
                    gastos_rechazo = $4,
                    updated_at = NOW()
                WHERE id = $1
                RETURNING *
            `, [chequeId, new Date(), data.motivo_rechazo, data.gastos_rechazo || 0]);

            const cheque = chequeResult.rows[0];

            // Registrar débito en cuenta corriente del cliente
            if (cheque.cliente_origen_id) {
                const montoTotal = parseFloat(cheque.monto) + parseFloat(data.gastos_rechazo || 0);

                await CuentaCorrienteService.registrarDebito({
                    company_id: cheque.company_id,
                    cliente_id: cheque.cliente_origen_id,
                    monto: montoTotal,
                    concepto: 'AJUSTE_DEBITO',
                    comprobante_tipo: 'CHEQUE_RECHAZADO',
                    comprobante_numero: `CHK-RECH-${cheque.numero}`,
                    observaciones: `Cheque rechazado Nro ${cheque.numero} - ${data.motivo_rechazo}`,
                    usuario_id: data.usuario_id
                });
            }

            await client.query('COMMIT');

            return cheque;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Endosar cheque
     */
    async endosarCheque(chequeId, data) {
        const result = await this.pool.query(`
            UPDATE siac_cheques_cartera
            SET estado = 'ENDOSADO',
                fecha_endoso = $2,
                endosado_a = $3,
                proveedor_endoso_id = $4,
                observaciones = COALESCE(observaciones, '') || E'\nEndosado: ' || $3,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [chequeId, new Date(), data.endosado_a, data.proveedor_endoso_id]);

        return result.rows[0];
    }

    /**
     * Obtener estadísticas de cheques
     */
    async getEstadisticasCheques(companyId) {
        const result = await this.pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE estado = 'EN_CARTERA') as en_cartera_cantidad,
                COALESCE(SUM(monto) FILTER (WHERE estado = 'EN_CARTERA'), 0) as en_cartera_monto,
                COUNT(*) FILTER (WHERE estado = 'DEPOSITADO') as depositados_cantidad,
                COALESCE(SUM(monto) FILTER (WHERE estado = 'DEPOSITADO'), 0) as depositados_monto,
                COUNT(*) FILTER (WHERE estado = 'EN_CARTERA' AND fecha_cobro <= CURRENT_DATE + 7) as a_vencer_7_dias,
                COALESCE(SUM(monto) FILTER (WHERE estado = 'EN_CARTERA' AND fecha_cobro <= CURRENT_DATE + 7), 0) as a_vencer_7_dias_monto,
                COUNT(*) FILTER (WHERE estado = 'RECHAZADO') as rechazados_cantidad,
                COALESCE(SUM(monto) FILTER (WHERE estado = 'RECHAZADO'), 0) as rechazados_monto
            FROM siac_cheques_cartera
            WHERE company_id = $1
        `, [companyId]);

        return result.rows[0];
    }

    // =========================================================================
    // SEGUIMIENTO DE COBRANZA
    // =========================================================================

    /**
     * Registrar gestión de cobranza
     */
    async registrarGestion(data) {
        const result = await this.pool.query(`
            INSERT INTO siac_cobranza_seguimiento (
                company_id, cliente_id, fecha, hora,
                tipo_accion, resultado, contacto_nombre, contacto_telefono,
                promesa_fecha, promesa_monto, proxima_accion_fecha,
                proxima_accion_tipo, proxima_accion_asignado_id,
                observaciones, cobrador_id, usuario_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
        `, [
            data.company_id,
            data.cliente_id,
            data.fecha || new Date(),
            data.hora || new Date().toTimeString().slice(0, 8),
            data.tipo_accion,
            data.resultado,
            data.contacto_nombre,
            data.contacto_telefono,
            data.promesa_fecha,
            data.promesa_monto,
            data.proxima_accion_fecha,
            data.proxima_accion_tipo,
            data.proxima_accion_asignado_id,
            data.observaciones,
            data.cobrador_id,
            data.usuario_id
        ]);

        return result.rows[0];
    }

    /**
     * Listar gestiones de un cliente
     */
    async listarGestionesCliente(clienteId, limit = 50) {
        const result = await this.pool.query(`
            SELECT s.*,
                CONCAT(u."firstName", ' ', u."lastName") as usuario_nombre,
                CONCAT(cb."firstName", ' ', cb."lastName") as cobrador_nombre
            FROM siac_cobranza_seguimiento s
            LEFT JOIN users u ON s.usuario_id = u.user_id
            LEFT JOIN users cb ON s.cobrador_id = cb.user_id
            WHERE s.cliente_id = $1
            ORDER BY s.fecha DESC, s.hora DESC
            LIMIT $2
        `, [clienteId, limit]);

        return result.rows;
    }

    /**
     * Obtener próximas acciones pendientes
     */
    async getProximasAcciones(companyId, diasAdelante = 7) {
        const result = await this.pool.query(`
            SELECT s.*,
                c.razon_social as cliente_nombre,
                c.telefono as cliente_telefono,
                r.saldo_total,
                r.dias_mayor_atraso
            FROM siac_cobranza_seguimiento s
            JOIN siac_clientes c ON s.cliente_id = c.id
            LEFT JOIN siac_cuenta_corriente_resumen r ON s.cliente_id = r.cliente_id
            WHERE s.company_id = $1
              AND s.proxima_accion_fecha IS NOT NULL
              AND s.proxima_accion_fecha <= CURRENT_DATE + ($2::integer)
              AND s.proxima_accion_fecha >= CURRENT_DATE
            ORDER BY s.proxima_accion_fecha ASC
        `, [companyId, diasAdelante]);

        return result.rows;
    }

    /**
     * Marcar promesa como cumplida/incumplida
     */
    async actualizarPromesa(gestionId, cumplida) {
        const result = await this.pool.query(`
            UPDATE siac_cobranza_seguimiento
            SET promesa_cumplida = $2
            WHERE id = $1
            RETURNING *
        `, [gestionId, cumplida]);

        return result.rows[0];
    }

    /**
     * Obtener promesas vencidas no cumplidas
     */
    async getPromesasVencidas(companyId) {
        const result = await this.pool.query(`
            SELECT s.*,
                c.razon_social as cliente_nombre,
                c.telefono as cliente_telefono,
                r.saldo_total
            FROM siac_cobranza_seguimiento s
            JOIN siac_clientes c ON s.cliente_id = c.id
            LEFT JOIN siac_cuenta_corriente_resumen r ON s.cliente_id = r.cliente_id
            WHERE s.company_id = $1
              AND s.resultado = 'PROMESA_PAGO'
              AND s.promesa_fecha < CURRENT_DATE
              AND (s.promesa_cumplida IS NULL OR s.promesa_cumplida = false)
            ORDER BY s.promesa_fecha ASC
        `, [companyId]);

        return result.rows;
    }

    /**
     * Obtener estadísticas de cobranza
     */
    async getEstadisticasCobranza(companyId, periodo = 'month') {
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
                COUNT(*) as total_gestiones,
                COUNT(*) FILTER (WHERE tipo_accion = 'LLAMADA') as llamadas,
                COUNT(*) FILTER (WHERE tipo_accion = 'VISITA') as visitas,
                COUNT(*) FILTER (WHERE tipo_accion = 'EMAIL') as emails,
                COUNT(*) FILTER (WHERE tipo_accion = 'WHATSAPP') as whatsapp,
                COUNT(*) FILTER (WHERE resultado = 'CONTACTADO') as contactados,
                COUNT(*) FILTER (WHERE resultado = 'PROMESA_PAGO') as promesas,
                COUNT(*) FILTER (WHERE resultado = 'PAGO_REALIZADO') as pagos_realizados,
                COUNT(*) FILTER (WHERE resultado = 'ILOCALIZABLE') as ilocalizables,
                COUNT(DISTINCT cliente_id) as clientes_gestionados
            FROM siac_cobranza_seguimiento
            WHERE company_id = $1 AND fecha >= $2
        `, [companyId, fechaDesde]);

        return result.rows[0];
    }
}

module.exports = new CobranzasService();
