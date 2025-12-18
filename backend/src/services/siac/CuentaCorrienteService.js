/**
 * ============================================================================
 * CUENTA CORRIENTE SERVICE - Gestión de Cuentas Corrientes de Clientes
 * ============================================================================
 *
 * Funcionalidades:
 * - Movimientos de cuenta corriente
 * - Resumen y aging por cliente
 * - Estado de cuenta
 * - Bloqueos automáticos
 *
 * Created: 2025-12-17
 */

const { Pool } = require('pg');

class CuentaCorrienteService {
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
     * Registrar movimiento en cuenta corriente
     */
    async registrarMovimiento(data) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Calcular saldo pendiente inicial
            const saldoPendiente = data.tipo === 'DEBITO' ? data.debe : data.haber;

            const result = await client.query(`
                INSERT INTO siac_cuenta_corriente (
                    company_id, cliente_id, fecha, fecha_vencimiento,
                    tipo, concepto, comprobante_tipo, comprobante_numero,
                    factura_id, recibo_id, nota_credito_id, nota_debito_id,
                    debe, haber, saldo_pendiente, estado,
                    moneda, cotizacion, monto_original,
                    observaciones, usuario_id
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                    $13, $14, $15, $16, $17, $18, $19, $20, $21
                )
                RETURNING *
            `, [
                data.company_id,
                data.cliente_id,
                data.fecha || new Date(),
                data.fecha_vencimiento,
                data.tipo,
                data.concepto,
                data.comprobante_tipo,
                data.comprobante_numero,
                data.factura_id,
                data.recibo_id,
                data.nota_credito_id,
                data.nota_debito_id,
                data.debe || 0,
                data.haber || 0,
                saldoPendiente,
                'PENDIENTE',
                data.moneda || 'ARS',
                data.cotizacion || 1,
                data.monto_original || (data.debe || data.haber),
                data.observaciones,
                data.usuario_id
            ]);

            // Actualizar crédito utilizado del cliente
            await this.actualizarCreditoCliente(client, data.cliente_id);

            await client.query('COMMIT');

            return result.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Registrar débito por factura
     */
    async registrarDebito(data) {
        return await this.registrarMovimiento({
            ...data,
            tipo: 'DEBITO',
            concepto: data.concepto || 'FACTURA',
            debe: data.monto,
            haber: 0
        });
    }

    /**
     * Registrar crédito por recibo/pago
     */
    async registrarCredito(data) {
        return await this.registrarMovimiento({
            ...data,
            tipo: 'CREDITO',
            concepto: data.concepto || 'RECIBO',
            debe: 0,
            haber: data.monto
        });
    }

    /**
     * Imputar pago a movimientos pendientes (FIFO)
     */
    async imputarPago(clienteId, monto, reciboId) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            let montoRestante = monto;
            const imputaciones = [];

            // Obtener movimientos pendientes ordenados por fecha (FIFO)
            const pendientes = await client.query(`
                SELECT * FROM siac_cuenta_corriente
                WHERE cliente_id = $1
                  AND tipo = 'DEBITO'
                  AND estado IN ('PENDIENTE', 'PARCIAL')
                ORDER BY fecha ASC, id ASC
            `, [clienteId]);

            for (const mov of pendientes.rows) {
                if (montoRestante <= 0) break;

                const montoImputar = Math.min(montoRestante, mov.saldo_pendiente);
                const nuevoSaldoPendiente = mov.saldo_pendiente - montoImputar;
                const nuevoEstado = nuevoSaldoPendiente <= 0 ? 'CANCELADO' : 'PARCIAL';

                // Actualizar movimiento
                await client.query(`
                    UPDATE siac_cuenta_corriente
                    SET saldo_pendiente = $1, estado = $2
                    WHERE id = $3
                `, [nuevoSaldoPendiente, nuevoEstado, mov.id]);

                // Registrar imputación
                imputaciones.push({
                    movimiento_id: mov.id,
                    factura_id: mov.factura_id,
                    comprobante_numero: mov.comprobante_numero,
                    monto_original: mov.debe,
                    saldo_anterior: mov.saldo_pendiente,
                    monto_imputado: montoImputar,
                    saldo_posterior: nuevoSaldoPendiente
                });

                montoRestante -= montoImputar;
            }

            // Actualizar crédito cliente
            const movPendiente = pendientes.rows[0];
            if (movPendiente) {
                await this.actualizarCreditoCliente(client, clienteId);
            }

            await client.query('COMMIT');

            return {
                imputaciones,
                monto_imputado: monto - montoRestante,
                monto_sobrante: montoRestante
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Obtener estado de cuenta de un cliente
     */
    async getEstadoCuenta(clienteId, filters = {}) {
        let query = `
            SELECT cc.*,
                f.numero_completo as factura_numero,
                f.fecha_factura
            FROM siac_cuenta_corriente cc
            LEFT JOIN siac_facturas f ON cc.factura_id = f.id
            WHERE cc.cliente_id = $1
        `;
        const params = [clienteId];
        let paramIndex = 2;

        if (filters.fecha_desde) {
            query += ` AND cc.fecha >= $${paramIndex++}`;
            params.push(filters.fecha_desde);
        }

        if (filters.fecha_hasta) {
            query += ` AND cc.fecha <= $${paramIndex++}`;
            params.push(filters.fecha_hasta);
        }

        if (filters.solo_pendientes) {
            query += ` AND cc.estado IN ('PENDIENTE', 'PARCIAL')`;
        }

        query += ' ORDER BY cc.fecha ASC, cc.id ASC';

        const movimientos = await this.pool.query(query, params);

        // Calcular saldo progresivo
        let saldoAcumulado = 0;
        const movimientosConSaldo = movimientos.rows.map(mov => {
            saldoAcumulado += (mov.debe - mov.haber);
            return {
                ...mov,
                saldo_acumulado: saldoAcumulado
            };
        });

        return movimientosConSaldo;
    }

    /**
     * Obtener resumen de cuenta corriente
     */
    async getResumen(clienteId) {
        const result = await this.pool.query(`
            SELECT * FROM siac_cuenta_corriente_resumen
            WHERE cliente_id = $1
        `, [clienteId]);

        if (result.rows.length === 0) {
            // Crear resumen si no existe
            await this.recalcularResumen(clienteId);
            const newResult = await this.pool.query(`
                SELECT * FROM siac_cuenta_corriente_resumen
                WHERE cliente_id = $1
            `, [clienteId]);
            return newResult.rows[0];
        }

        return result.rows[0];
    }

    /**
     * Obtener aging (antigüedad de saldos) de un cliente
     */
    async getAging(clienteId) {
        const resumen = await this.getResumen(clienteId);

        return {
            a_vencer: resumen?.a_vencer || 0,
            vencido_1_30: resumen?.vencido_1_30 || 0,
            vencido_31_60: resumen?.vencido_31_60 || 0,
            vencido_61_90: resumen?.vencido_61_90 || 0,
            vencido_mas_90: resumen?.vencido_mas_90 || 0,
            total_vencido: resumen?.monto_total_vencido || 0,
            dias_mayor_atraso: resumen?.dias_mayor_atraso || 0
        };
    }

    /**
     * Obtener comprobantes pendientes de un cliente
     */
    async getComprobantesPendientes(clienteId) {
        const result = await this.pool.query(`
            SELECT cc.*,
                f.numero_completo as factura_numero,
                f.total_factura as factura_total,
                CURRENT_DATE - cc.fecha_vencimiento as dias_vencido
            FROM siac_cuenta_corriente cc
            LEFT JOIN siac_facturas f ON cc.factura_id = f.id
            WHERE cc.cliente_id = $1
              AND cc.tipo = 'DEBITO'
              AND cc.estado IN ('PENDIENTE', 'PARCIAL')
            ORDER BY cc.fecha_vencimiento ASC NULLS LAST, cc.fecha ASC
        `, [clienteId]);

        return result.rows;
    }

    /**
     * Verificar si cliente puede operar (no bloqueado)
     */
    async verificarCliente(clienteId, montoOperacion = 0) {
        const result = await this.pool.query(`
            SELECT * FROM get_estado_cuenta_cliente($1)
        `, [clienteId]);

        const estado = result.rows[0];

        // Verificar crédito disponible adicional
        if (estado.puede_facturar && montoOperacion > 0) {
            const clienteResult = await this.pool.query(`
                SELECT credito_disponible FROM siac_clientes WHERE id = $1
            `, [clienteId]);

            if (clienteResult.rows.length > 0) {
                const creditoDisponible = clienteResult.rows[0].credito_disponible || 0;
                if (montoOperacion > creditoDisponible && creditoDisponible > 0) {
                    return {
                        ...estado,
                        puede_facturar: false,
                        motivo_bloqueo: `Monto excede crédito disponible ($${creditoDisponible})`
                    };
                }
            }
        }

        return estado;
    }

    /**
     * Actualizar crédito utilizado del cliente
     */
    async actualizarCreditoCliente(client, clienteId) {
        const saldoResult = await client.query(`
            SELECT COALESCE(SUM(debe) - SUM(haber), 0) as saldo
            FROM siac_cuenta_corriente
            WHERE cliente_id = $1
        `, [clienteId]);

        const saldoTotal = saldoResult.rows[0].saldo || 0;

        await client.query(`
            UPDATE siac_clientes
            SET credito_utilizado = $2,
                updated_at = NOW()
            WHERE id = $1
        `, [clienteId, Math.max(0, saldoTotal)]);
    }

    /**
     * Recalcular resumen de cuenta corriente
     */
    async recalcularResumen(clienteId) {
        // El trigger actualiza automáticamente, pero podemos forzar
        const client = await this.pool.connect();
        try {
            // Insertar un registro dummy y borrarlo para disparar trigger
            // O simplemente ejecutar la función manualmente

            const result = await client.query(`
                INSERT INTO siac_cuenta_corriente_resumen (
                    cliente_id, company_id, saldo_total, facturas_pendientes,
                    a_vencer, vencido_1_30, vencido_31_60, vencido_61_90, vencido_mas_90,
                    monto_total_vencido, dias_mayor_atraso, updated_at
                )
                SELECT
                    $1 as cliente_id,
                    c.company_id,
                    COALESCE(SUM(cc.debe) - SUM(cc.haber), 0) as saldo_total,
                    COUNT(*) FILTER (WHERE cc.concepto = 'FACTURA' AND cc.estado IN ('PENDIENTE', 'PARCIAL')) as facturas_pendientes,
                    COALESCE(SUM(cc.saldo_pendiente) FILTER (WHERE cc.fecha_vencimiento IS NULL OR cc.fecha_vencimiento >= CURRENT_DATE), 0) as a_vencer,
                    COALESCE(SUM(cc.saldo_pendiente) FILTER (WHERE cc.fecha_vencimiento < CURRENT_DATE AND cc.fecha_vencimiento >= CURRENT_DATE - 30), 0) as vencido_1_30,
                    COALESCE(SUM(cc.saldo_pendiente) FILTER (WHERE cc.fecha_vencimiento < CURRENT_DATE - 30 AND cc.fecha_vencimiento >= CURRENT_DATE - 60), 0) as vencido_31_60,
                    COALESCE(SUM(cc.saldo_pendiente) FILTER (WHERE cc.fecha_vencimiento < CURRENT_DATE - 60 AND cc.fecha_vencimiento >= CURRENT_DATE - 90), 0) as vencido_61_90,
                    COALESCE(SUM(cc.saldo_pendiente) FILTER (WHERE cc.fecha_vencimiento < CURRENT_DATE - 90), 0) as vencido_mas_90,
                    COALESCE(SUM(cc.saldo_pendiente) FILTER (WHERE cc.fecha_vencimiento < CURRENT_DATE), 0) as monto_total_vencido,
                    COALESCE(MAX(CURRENT_DATE - cc.fecha_vencimiento) FILTER (WHERE cc.fecha_vencimiento < CURRENT_DATE AND cc.saldo_pendiente > 0), 0) as dias_mayor_atraso,
                    NOW()
                FROM siac_clientes c
                LEFT JOIN siac_cuenta_corriente cc ON cc.cliente_id = c.id
                WHERE c.id = $1
                GROUP BY c.id, c.company_id
                ON CONFLICT (cliente_id) DO UPDATE SET
                    saldo_total = EXCLUDED.saldo_total,
                    facturas_pendientes = EXCLUDED.facturas_pendientes,
                    a_vencer = EXCLUDED.a_vencer,
                    vencido_1_30 = EXCLUDED.vencido_1_30,
                    vencido_31_60 = EXCLUDED.vencido_31_60,
                    vencido_61_90 = EXCLUDED.vencido_61_90,
                    vencido_mas_90 = EXCLUDED.vencido_mas_90,
                    monto_total_vencido = EXCLUDED.monto_total_vencido,
                    dias_mayor_atraso = EXCLUDED.dias_mayor_atraso,
                    updated_at = NOW()
                RETURNING *
            `, [clienteId]);

            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Listar clientes con saldo
     */
    async getClientesConSaldo(companyId, filters = {}) {
        let query = `
            SELECT
                c.id as cliente_id,
                c.codigo_cliente,
                c.razon_social,
                c.documento_numero as cuit,
                c.telefono,
                c.email,
                c.bloqueo_por_vencimiento,
                c.bloqueo_por_credito,
                r.saldo_total,
                r.facturas_pendientes,
                r.monto_total_vencido,
                r.dias_mayor_atraso,
                r.a_vencer,
                r.vencido_1_30,
                r.vencido_31_60,
                r.vencido_61_90,
                r.vencido_mas_90
            FROM siac_clientes c
            JOIN siac_cuenta_corriente_resumen r ON c.id = r.cliente_id
            WHERE c.company_id = $1
        `;
        const params = [companyId];
        let paramIndex = 2;

        if (filters.solo_con_saldo) {
            query += ` AND r.saldo_total > 0`;
        }

        if (filters.solo_vencidos) {
            query += ` AND r.monto_total_vencido > 0`;
        }

        if (filters.dias_vencido_minimo) {
            query += ` AND r.dias_mayor_atraso >= $${paramIndex++}`;
            params.push(filters.dias_vencido_minimo);
        }

        if (filters.search) {
            query += ` AND (
                c.razon_social ILIKE $${paramIndex} OR
                c.documento_numero ILIKE $${paramIndex} OR
                c.codigo_cliente ILIKE $${paramIndex}
            )`;
            params.push(`%${filters.search}%`);
            paramIndex++;
        }

        // Ordenamiento
        const orderBy = filters.order_by || 'saldo_total';
        const orderDir = filters.order_dir === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${orderBy} ${orderDir}`;

        if (filters.limit) {
            query += ` LIMIT $${paramIndex++}`;
            params.push(filters.limit);
        }

        const result = await this.pool.query(query, params);
        return result.rows;
    }

    /**
     * Obtener clientes morosos
     */
    async getClientesMorosos(companyId, diasMinimo = 30) {
        const result = await this.pool.query(`
            SELECT * FROM get_clientes_morosos($1, $2)
        `, [companyId, diasMinimo]);

        return result.rows;
    }

    /**
     * Aplicar interés por mora
     */
    async aplicarInteresMora(clienteId, tasaInteres, usuarioId) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Obtener movimientos vencidos sin interés aplicado
            const vencidosResult = await client.query(`
                SELECT * FROM siac_cuenta_corriente
                WHERE cliente_id = $1
                  AND tipo = 'DEBITO'
                  AND estado IN ('PENDIENTE', 'PARCIAL')
                  AND fecha_vencimiento < CURRENT_DATE
                  AND concepto != 'INTERES_MORA'
            `, [clienteId]);

            let totalIntereses = 0;
            const interesesAplicados = [];

            for (const mov of vencidosResult.rows) {
                const diasVencido = Math.floor((new Date() - new Date(mov.fecha_vencimiento)) / (1000 * 60 * 60 * 24));
                const interes = mov.saldo_pendiente * (tasaInteres / 100) * (diasVencido / 30);

                if (interes > 0) {
                    // Crear movimiento de interés
                    await this.registrarDebito({
                        company_id: mov.company_id,
                        cliente_id: clienteId,
                        concepto: 'INTERES_MORA',
                        monto: interes,
                        comprobante_tipo: 'INTERES',
                        comprobante_numero: `INT-${mov.id}`,
                        observaciones: `Interés por mora sobre ${mov.comprobante_numero} (${diasVencido} días, ${tasaInteres}%)`,
                        usuario_id: usuarioId
                    });

                    totalIntereses += interes;
                    interesesAplicados.push({
                        movimiento_id: mov.id,
                        comprobante: mov.comprobante_numero,
                        dias_vencido: diasVencido,
                        interes: interes
                    });
                }
            }

            await client.query('COMMIT');

            return {
                success: true,
                total_intereses: totalIntereses,
                intereses_aplicados: interesesAplicados
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Obtener estadísticas de cartera
     */
    async getEstadisticasCartera(companyId) {
        const result = await this.pool.query(`
            SELECT
                COUNT(DISTINCT cliente_id) as total_clientes_con_saldo,
                SUM(saldo_total) as cartera_total,
                SUM(a_vencer) as total_a_vencer,
                SUM(monto_total_vencido) as total_vencido,
                SUM(vencido_1_30) as total_vencido_1_30,
                SUM(vencido_31_60) as total_vencido_31_60,
                SUM(vencido_61_90) as total_vencido_61_90,
                SUM(vencido_mas_90) as total_vencido_mas_90,
                AVG(dias_mayor_atraso) as promedio_dias_atraso,
                MAX(dias_mayor_atraso) as max_dias_atraso
            FROM siac_cuenta_corriente_resumen
            WHERE company_id = $1 AND saldo_total > 0
        `, [companyId]);

        return result.rows[0];
    }
}

module.exports = new CuentaCorrienteService();
