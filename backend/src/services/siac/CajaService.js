/**
 * ============================================================================
 * CAJA SERVICE - Gestión de Caja, Movimientos y Arqueo
 * ============================================================================
 *
 * Funcionalidades:
 * - Apertura/Cierre de sesiones de caja
 * - Registro de movimientos (ingresos/egresos)
 * - Arqueo de caja (reconciliación)
 * - Reportes y estadísticas
 *
 * Tablas utilizadas:
 * - siac_cajas (maestro de cajas)
 * - siac_sesiones_caja (sesiones de apertura/cierre)
 * - siac_caja_movimientos (movimientos individuales)
 * - siac_caja_arqueo (reconciliaciones)
 *
 * Created: 2025-12-17
 */

const { sequelize } = require('../../config/database');
const { QueryTypes } = require('sequelize');

// Helper para ejecutar queries raw de forma compatible
const execQuery = async (sql, params = []) => {
    const result = await sequelize.query(sql, {
        bind: params,
        type: QueryTypes.SELECT
    });
    return result;
};

// Helper para INSERT/UPDATE/DELETE que retornan RETURNING *
const execInsert = async (sql, params = []) => {
    const [result] = await sequelize.query(sql, {
        bind: params,
        type: QueryTypes.RAW
    });
    return result;
};

class CajaService {

    // =============================================================================
    // CAJAS (Maestro)
    // =============================================================================

    /**
     * Obtener cajas de una empresa
     */
    static async getCajas(companyId) {
        const result = await execQuery(`
            SELECT c.*,
                   pv.company_id,
                   pv.nombre_punto_venta,
                   (SELECT COUNT(*) FROM siac_sesiones_caja sc
                    WHERE sc.caja_id = c.id AND sc.estado = 'ABIERTA') as tiene_sesion_abierta
            FROM siac_cajas c
            JOIN siac_puntos_venta pv ON c.punto_venta_id = pv.id
            WHERE pv.company_id = $1
              AND c.activo = true
            ORDER BY c.nombre_caja
        `, [companyId]);

        return result;
    }

    /**
     * Obtener caja por ID
     */
    static async getCajaById(cajaId) {
        const result = await execQuery(`
            SELECT c.*,
                   (SELECT json_agg(json_build_object(
                       'id', sc.id,
                       'fecha_apertura', sc.fecha_apertura,
                       'estado', sc.estado,
                       'saldo_apertura', sc.saldo_apertura
                   )) FROM siac_sesiones_caja sc
                    WHERE sc.caja_id = c.id AND sc.estado = 'ABIERTA') as sesiones_abiertas
            FROM siac_cajas c
            WHERE c.id = $1
        `, [cajaId]);

        return result[0];
    }

    /**
     * Crear nueva caja
     */
    static async createCaja(data) {
        const { company_id, nombre, descripcion, sucursal_id, punto_venta } = data;

        const result = await execQuery(`
            INSERT INTO siac_cajas (
                company_id, nombre, descripcion, sucursal_id, punto_venta,
                activa, created_at
            ) VALUES ($1, $2, $3, $4, $5, true, NOW())
            RETURNING *
        `, [company_id, nombre, descripcion, sucursal_id, punto_venta || 1]);

        return result[0];
    }

    // =============================================================================
    // SESIONES DE CAJA
    // =============================================================================

    /**
     * Abrir sesión de caja
     */
    static async abrirSesion(data) {
        const { caja_id, usuario_id, saldo_apertura, observaciones } = data;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Verificar que no haya sesión abierta para esta caja
            const sesionAbierta = await client.query(`
                SELECT id FROM siac_sesiones_caja
                WHERE caja_id = $1 AND estado = 'ABIERTA'
            `, [caja_id]);

            if (sesionAbierta.rows.length > 0) {
                throw new Error('Ya existe una sesión abierta para esta caja');
            }

            // Crear sesión
            const result = await client.query(`
                INSERT INTO siac_sesiones_caja (
                    caja_id, usuario_id, fecha_apertura, saldo_apertura,
                    saldo_actual, estado, observaciones_apertura, created_at
                ) VALUES ($1, $2, NOW(), $3, $3, 'ABIERTA', $4, NOW())
                RETURNING *
            `, [caja_id, usuario_id, saldo_apertura || 0, observaciones]);

            // Registrar movimiento de apertura si hay saldo inicial
            if (saldo_apertura > 0) {
                await client.query(`
                    INSERT INTO siac_caja_movimientos (
                        sesion_caja_id, tipo, concepto, monto,
                        forma_pago, usuario_id, observaciones, created_at
                    ) VALUES ($1, 'INGRESO', 'APERTURA', $2, 'EFECTIVO', $3, 'Saldo inicial de apertura', NOW())
                `, [result[0].id, saldo_apertura, usuario_id]);
            }

            await client.query('COMMIT');
            return result[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Cerrar sesión de caja
     */
    static async cerrarSesion(sesionId, data) {
        const { usuario_id, saldo_cierre_declarado, observaciones } = data;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Obtener sesión actual
            const sesion = await client.query(`
                SELECT * FROM siac_sesiones_caja
                WHERE id = $1 AND estado = 'ABIERTA'
            `, [sesionId]);

            if (sesion.rows.length === 0) {
                throw new Error('Sesión no encontrada o ya cerrada');
            }

            const sesionActual = sesion.rows[0];

            // Calcular totales de movimientos
            const totales = await client.query(`
                SELECT
                    COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE 0 END), 0) as total_ingresos,
                    COALESCE(SUM(CASE WHEN tipo = 'EGRESO' THEN monto ELSE 0 END), 0) as total_egresos,
                    COUNT(CASE WHEN tipo = 'INGRESO' THEN 1 END) as cant_ingresos,
                    COUNT(CASE WHEN tipo = 'EGRESO' THEN 1 END) as cant_egresos
                FROM siac_caja_movimientos
                WHERE sesion_caja_id = $1
            `, [sesionId]);

            const { total_ingresos, total_egresos, cant_ingresos, cant_egresos } = totales.rows[0];
            const saldo_sistema = parseFloat(sesionActual.saldo_apertura) + parseFloat(total_ingresos) - parseFloat(total_egresos);
            const diferencia = parseFloat(saldo_cierre_declarado) - saldo_sistema;

            // Actualizar sesión
            const result = await client.query(`
                UPDATE siac_sesiones_caja SET
                    fecha_cierre = NOW(),
                    saldo_cierre = $2,
                    total_ingresos = $3,
                    total_egresos = $4,
                    diferencia = $5,
                    estado = 'CERRADA',
                    observaciones_cierre = $6,
                    updated_at = NOW()
                WHERE id = $1
                RETURNING *
            `, [sesionId, saldo_cierre_declarado, total_ingresos, total_egresos, diferencia, observaciones]);

            // Si hay diferencia, registrar movimiento de ajuste
            if (Math.abs(diferencia) > 0.01) {
                const tipoAjuste = diferencia > 0 ? 'INGRESO' : 'EGRESO';
                await client.query(`
                    INSERT INTO siac_caja_movimientos (
                        sesion_caja_id, tipo, concepto, monto,
                        forma_pago, usuario_id, observaciones, created_at
                    ) VALUES ($1, $2, 'AJUSTE', $3, 'EFECTIVO', $4, $5, NOW())
                `, [
                    sesionId,
                    tipoAjuste,
                    Math.abs(diferencia),
                    usuario_id,
                    `Ajuste por diferencia de caja: ${diferencia > 0 ? 'sobrante' : 'faltante'}`
                ]);
            }

            await client.query('COMMIT');

            return {
                ...result[0],
                resumen: {
                    saldo_apertura: sesionActual.saldo_apertura,
                    total_ingresos,
                    total_egresos,
                    cant_ingresos,
                    cant_egresos,
                    saldo_sistema,
                    saldo_declarado: saldo_cierre_declarado,
                    diferencia
                }
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Obtener sesión activa de una caja
     */
    static async getSesionActiva(cajaId) {
        const result = await execQuery(`
            SELECT s.*,
                   c.nombre as caja_nombre,
                   CONCAT(u."firstName", ' ', u."lastName") as usuario_nombre
            FROM siac_sesiones_caja s
            JOIN siac_cajas c ON s.caja_id = c.id
            LEFT JOIN users u ON s.usuario_id = u.user_id
            WHERE s.caja_id = $1 AND s.estado = 'ABIERTA'
        `, [cajaId]);

        if (result.length === 0) {
            return null;
        }

        // Obtener movimientos de la sesión
        const movimientos = await execQuery(`
            SELECT * FROM siac_caja_movimientos
            WHERE sesion_caja_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [result[0].id]);

        return {
            ...result[0],
            movimientos: movimientos.rows
        };
    }

    /**
     * Obtener historial de sesiones
     */
    static async getHistorialSesiones(cajaId, filters = {}) {
        const { fecha_desde, fecha_hasta, limit = 20 } = filters;

        let sql = `
            SELECT s.*,
                   c.nombre as caja_nombre,
                   CONCAT(u."firstName", ' ', u."lastName") as usuario_nombre
            FROM siac_sesiones_caja s
            JOIN siac_cajas c ON s.caja_id = c.id
            LEFT JOIN users u ON s.usuario_id = u.user_id
            WHERE s.caja_id = $1
        `;
        const params = [cajaId];
        let paramIndex = 2;

        if (fecha_desde) {
            sql += ` AND s.fecha_apertura >= $${paramIndex}`;
            params.push(fecha_desde);
            paramIndex++;
        }

        if (fecha_hasta) {
            sql += ` AND s.fecha_apertura <= $${paramIndex}`;
            params.push(fecha_hasta);
            paramIndex++;
        }

        sql += ` ORDER BY s.fecha_apertura DESC LIMIT $${paramIndex}`;
        params.push(limit);

        const result = await execQuery(sql, params);
        return result;
    }

    // =============================================================================
    // MOVIMIENTOS DE CAJA
    // =============================================================================

    /**
     * Registrar movimiento de caja
     */
    static async registrarMovimiento(data) {
        const {
            sesion_caja_id, tipo, concepto, monto, forma_pago,
            documento_tipo, documento_id, cliente_id, proveedor_id,
            usuario_id, observaciones
        } = data;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Verificar que la sesión esté abierta
            const sesion = await client.query(`
                SELECT id, saldo_actual FROM siac_sesiones_caja
                WHERE id = $1 AND estado = 'ABIERTA'
            `, [sesion_caja_id]);

            if (sesion.rows.length === 0) {
                throw new Error('La sesión de caja no está abierta');
            }

            // Validar que hay saldo suficiente para egresos
            if (tipo === 'EGRESO') {
                const saldoActual = parseFloat(sesion.rows[0].saldo_actual);
                if (saldoActual < monto) {
                    throw new Error(`Saldo insuficiente. Disponible: $${saldoActual.toFixed(2)}`);
                }
            }

            // Insertar movimiento
            const result = await client.query(`
                INSERT INTO siac_caja_movimientos (
                    sesion_caja_id, tipo, concepto, monto, forma_pago,
                    documento_tipo, documento_id, cliente_id, proveedor_id,
                    usuario_id, observaciones, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
                RETURNING *
            `, [
                sesion_caja_id, tipo, concepto, monto, forma_pago || 'EFECTIVO',
                documento_tipo, documento_id, cliente_id, proveedor_id,
                usuario_id, observaciones
            ]);

            // Actualizar saldo de la sesión
            const nuevoSaldo = tipo === 'INGRESO'
                ? parseFloat(sesion.rows[0].saldo_actual) + parseFloat(monto)
                : parseFloat(sesion.rows[0].saldo_actual) - parseFloat(monto);

            await client.query(`
                UPDATE siac_sesiones_caja
                SET saldo_actual = $2, updated_at = NOW()
                WHERE id = $1
            `, [sesion_caja_id, nuevoSaldo]);

            await client.query('COMMIT');

            return {
                ...result[0],
                saldo_anterior: sesion.rows[0].saldo_actual,
                saldo_nuevo: nuevoSaldo
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Registrar ingreso (helper)
     */
    static async registrarIngreso(data) {
        return this.registrarMovimiento({ ...data, tipo: 'INGRESO' });
    }

    /**
     * Registrar egreso (helper)
     */
    static async registrarEgreso(data) {
        return this.registrarMovimiento({ ...data, tipo: 'EGRESO' });
    }

    /**
     * Listar movimientos de una sesión
     */
    static async getMovimientosSesion(sesionId, filters = {}) {
        const { tipo, concepto, forma_pago, limit = 100 } = filters;

        let sql = `
            SELECT m.*,
                   CONCAT(u."firstName", ' ', u."lastName") as usuario_nombre,
                   c.razon_social as cliente_nombre
            FROM siac_caja_movimientos m
            LEFT JOIN users u ON m.usuario_id = u.user_id
            LEFT JOIN siac_clientes c ON m.cliente_id = c.id
            WHERE m.sesion_caja_id = $1
        `;
        const params = [sesionId];
        let paramIndex = 2;

        if (tipo) {
            sql += ` AND m.tipo = $${paramIndex}`;
            params.push(tipo);
            paramIndex++;
        }

        if (concepto) {
            sql += ` AND m.concepto = $${paramIndex}`;
            params.push(concepto);
            paramIndex++;
        }

        if (forma_pago) {
            sql += ` AND m.forma_pago = $${paramIndex}`;
            params.push(forma_pago);
            paramIndex++;
        }

        sql += ` ORDER BY m.created_at DESC LIMIT $${paramIndex}`;
        params.push(limit);

        const result = await execQuery(sql, params);
        return result;
    }

    /**
     * Obtener movimiento por ID
     */
    static async getMovimientoById(movimientoId) {
        const result = await execQuery(`
            SELECT m.*,
                   s.caja_id,
                   s.fecha_apertura as sesion_apertura,
                   c.nombre as caja_nombre,
                   CONCAT(u."firstName", ' ', u."lastName") as usuario_nombre
            FROM siac_caja_movimientos m
            JOIN siac_sesiones_caja s ON m.sesion_caja_id = s.id
            JOIN siac_cajas c ON s.caja_id = c.id
            LEFT JOIN users u ON m.usuario_id = u.user_id
            WHERE m.id = $1
        `, [movimientoId]);

        return result[0];
    }

    /**
     * Anular movimiento
     */
    static async anularMovimiento(movimientoId, data) {
        const { usuario_id, motivo } = data;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Obtener movimiento original
            const movimiento = await client.query(`
                SELECT m.*, s.estado as sesion_estado, s.saldo_actual
                FROM siac_caja_movimientos m
                JOIN siac_sesiones_caja s ON m.sesion_caja_id = s.id
                WHERE m.id = $1
            `, [movimientoId]);

            if (movimiento.rows.length === 0) {
                throw new Error('Movimiento no encontrado');
            }

            const mov = movimiento.rows[0];

            // Verificar que la sesión esté abierta
            if (mov.sesion_estado !== 'ABIERTA') {
                throw new Error('No se puede anular un movimiento de una sesión cerrada');
            }

            // Verificar que no sea un movimiento de apertura/cierre
            if (['APERTURA', 'CIERRE', 'AJUSTE'].includes(mov.concepto)) {
                throw new Error(`No se puede anular un movimiento de ${mov.concepto}`);
            }

            // Crear movimiento de reversión
            const tipoReverso = mov.tipo === 'INGRESO' ? 'EGRESO' : 'INGRESO';
            await client.query(`
                INSERT INTO siac_caja_movimientos (
                    sesion_caja_id, tipo, concepto, monto, forma_pago,
                    documento_tipo, documento_id, usuario_id, observaciones,
                    movimiento_anulado_id, created_at
                ) VALUES ($1, $2, 'ANULACION', $3, $4, $5, $6, $7, $8, $9, NOW())
            `, [
                mov.sesion_caja_id, tipoReverso, mov.monto, mov.forma_pago,
                mov.documento_tipo, mov.documento_id, usuario_id,
                `Anulación de movimiento #${movimientoId}: ${motivo}`,
                movimientoId
            ]);

            // Actualizar saldo de la sesión
            const ajuste = mov.tipo === 'INGRESO' ? -parseFloat(mov.monto) : parseFloat(mov.monto);
            await client.query(`
                UPDATE siac_sesiones_caja
                SET saldo_actual = saldo_actual + $2, updated_at = NOW()
                WHERE id = $1
            `, [mov.sesion_caja_id, ajuste]);

            // Marcar movimiento original como anulado
            await client.query(`
                UPDATE siac_caja_movimientos
                SET anulado = true, updated_at = NOW()
                WHERE id = $1
            `, [movimientoId]);

            await client.query('COMMIT');

            return { success: true, message: 'Movimiento anulado correctamente' };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // =============================================================================
    // ARQUEO DE CAJA
    // =============================================================================

    /**
     * Registrar arqueo de caja
     */
    static async registrarArqueo(data) {
        const {
            sesion_caja_id, usuario_id, observaciones,
            // Desglose de efectivo
            billetes_1000 = 0, billetes_500 = 0, billetes_200 = 0,
            billetes_100 = 0, billetes_50 = 0, billetes_20 = 0,
            billetes_10 = 0, monedas = 0,
            // Otros valores
            cheques_monto = 0, tarjetas_monto = 0, transferencias_monto = 0,
            otros_valores = 0
        } = data;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Obtener sesión y saldo actual
            const sesion = await client.query(`
                SELECT s.*, c.nombre as caja_nombre
                FROM siac_sesiones_caja s
                JOIN siac_cajas c ON s.caja_id = c.id
                WHERE s.id = $1 AND s.estado = 'ABIERTA'
            `, [sesion_caja_id]);

            if (sesion.rows.length === 0) {
                throw new Error('Sesión no encontrada o cerrada');
            }

            // Calcular total efectivo
            const total_efectivo =
                (billetes_1000 * 1000) + (billetes_500 * 500) + (billetes_200 * 200) +
                (billetes_100 * 100) + (billetes_50 * 50) + (billetes_20 * 20) +
                (billetes_10 * 10) + parseFloat(monedas);

            const total_arqueo = total_efectivo + parseFloat(cheques_monto) +
                parseFloat(tarjetas_monto) + parseFloat(transferencias_monto) +
                parseFloat(otros_valores);

            const saldo_sistema = parseFloat(sesion.rows[0].saldo_actual);
            const diferencia = total_arqueo - saldo_sistema;

            // Insertar arqueo
            const result = await client.query(`
                INSERT INTO siac_caja_arqueo (
                    sesion_caja_id, usuario_id, fecha_arqueo,
                    billetes_1000, billetes_500, billetes_200, billetes_100,
                    billetes_50, billetes_20, billetes_10, monedas,
                    total_efectivo, cheques_monto, tarjetas_monto,
                    transferencias_monto, otros_valores, total_arqueo,
                    saldo_sistema, diferencia, observaciones, created_at
                ) VALUES (
                    $1, $2, NOW(),
                    $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW()
                )
                RETURNING *
            `, [
                sesion_caja_id, usuario_id,
                billetes_1000, billetes_500, billetes_200, billetes_100,
                billetes_50, billetes_20, billetes_10, monedas,
                total_efectivo, cheques_monto, tarjetas_monto,
                transferencias_monto, otros_valores, total_arqueo,
                saldo_sistema, diferencia, observaciones
            ]);

            await client.query('COMMIT');

            return {
                ...result[0],
                estado: diferencia === 0 ? 'CUADRADO' : (diferencia > 0 ? 'SOBRANTE' : 'FALTANTE'),
                caja_nombre: sesion.rows[0].caja_nombre
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Obtener historial de arqueos
     */
    static async getHistorialArqueos(sesionId) {
        const result = await execQuery(`
            SELECT a.*,
                   CONCAT(u."firstName", ' ', u."lastName") as usuario_nombre
            FROM siac_caja_arqueo a
            LEFT JOIN users u ON a.usuario_id = u.user_id
            WHERE a.sesion_caja_id = $1
            ORDER BY a.fecha_arqueo DESC
        `, [sesionId]);

        return result;
    }

    // =============================================================================
    // REPORTES Y ESTADÍSTICAS
    // =============================================================================

    /**
     * Obtener resumen del día para una caja
     */
    static async getResumenDia(cajaId, fecha = null) {
        const fechaConsulta = fecha || new Date().toISOString().split('T')[0];

        const result = await execQuery(`
            SELECT
                COUNT(DISTINCT s.id) as sesiones,
                COALESCE(SUM(m.monto) FILTER (WHERE m.tipo = 'INGRESO'), 0) as total_ingresos,
                COALESCE(SUM(m.monto) FILTER (WHERE m.tipo = 'EGRESO'), 0) as total_egresos,
                COUNT(*) FILTER (WHERE m.tipo = 'INGRESO') as cant_ingresos,
                COUNT(*) FILTER (WHERE m.tipo = 'EGRESO') as cant_egresos,
                -- Por forma de pago
                COALESCE(SUM(m.monto) FILTER (WHERE m.forma_pago = 'EFECTIVO' AND m.tipo = 'INGRESO'), 0) as efectivo_ingresos,
                COALESCE(SUM(m.monto) FILTER (WHERE m.forma_pago = 'TARJETA_DEBITO' AND m.tipo = 'INGRESO'), 0) as tarjeta_debito_ingresos,
                COALESCE(SUM(m.monto) FILTER (WHERE m.forma_pago = 'TARJETA_CREDITO' AND m.tipo = 'INGRESO'), 0) as tarjeta_credito_ingresos,
                COALESCE(SUM(m.monto) FILTER (WHERE m.forma_pago = 'TRANSFERENCIA' AND m.tipo = 'INGRESO'), 0) as transferencia_ingresos,
                -- Por concepto
                COALESCE(SUM(m.monto) FILTER (WHERE m.concepto = 'VENTA'), 0) as ventas,
                COALESCE(SUM(m.monto) FILTER (WHERE m.concepto = 'COBRANZA'), 0) as cobranzas,
                COALESCE(SUM(m.monto) FILTER (WHERE m.concepto = 'DEPOSITO_CHEQUE'), 0) as depositos_cheque
            FROM siac_sesiones_caja s
            JOIN siac_caja_movimientos m ON s.id = m.sesion_caja_id
            WHERE s.caja_id = $1
              AND DATE(s.fecha_apertura) = $2
              AND m.anulado = false
        `, [cajaId, fechaConsulta]);

        return result[0];
    }

    /**
     * Obtener estadísticas de caja por período
     */
    static async getEstadisticas(companyId, periodo = 'month') {
        let fechaInicio;
        const hoy = new Date();

        switch (periodo) {
            case 'week':
                fechaInicio = new Date(hoy.setDate(hoy.getDate() - 7));
                break;
            case 'month':
                fechaInicio = new Date(hoy.setMonth(hoy.getMonth() - 1));
                break;
            case 'year':
                fechaInicio = new Date(hoy.setFullYear(hoy.getFullYear() - 1));
                break;
            default:
                fechaInicio = new Date(hoy.setMonth(hoy.getMonth() - 1));
        }

        const result = await execQuery(`
            WITH movimientos_periodo AS (
                SELECT m.*, s.caja_id, c.nombre_caja as caja_nombre
                FROM siac_caja_movimientos m
                JOIN siac_sesiones_caja s ON m.sesion_caja_id = s.id
                JOIN siac_cajas c ON s.caja_id = c.id
                JOIN siac_puntos_venta pv ON c.punto_venta_id = pv.id
                WHERE pv.company_id = $1
                  AND m.fecha >= $2
                  AND m.anulado = false
            )
            SELECT
                -- Totales generales
                COALESCE(SUM(monto) FILTER (WHERE tipo = 'INGRESO'), 0) as total_ingresos,
                COALESCE(SUM(monto) FILTER (WHERE tipo = 'EGRESO'), 0) as total_egresos,
                COUNT(*) FILTER (WHERE tipo = 'INGRESO') as cant_ingresos,
                COUNT(*) FILTER (WHERE tipo = 'EGRESO') as cant_egresos,

                -- Por medio de pago
                COALESCE(SUM(monto) FILTER (WHERE medio_pago = 'EFECTIVO'), 0) as total_efectivo,
                COALESCE(SUM(monto) FILTER (WHERE medio_pago LIKE 'TARJETA%'), 0) as total_tarjetas,
                COALESCE(SUM(monto) FILTER (WHERE medio_pago = 'TRANSFERENCIA'), 0) as total_transferencias,
                COALESCE(SUM(monto) FILTER (WHERE medio_pago = 'CHEQUE'), 0) as total_cheques,

                -- Por categoria
                json_agg(DISTINCT jsonb_build_object(
                    'concepto', categoria,
                    'total', (SELECT SUM(m2.monto) FROM movimientos_periodo m2 WHERE m2.categoria = movimientos_periodo.categoria)
                )) as por_concepto,

                -- Por caja
                json_agg(DISTINCT jsonb_build_object(
                    'caja_id', caja_id,
                    'caja_nombre', caja_nombre,
                    'ingresos', (SELECT SUM(m2.monto) FROM movimientos_periodo m2 WHERE m2.caja_id = movimientos_periodo.caja_id AND m2.tipo = 'INGRESO'),
                    'egresos', (SELECT SUM(m2.monto) FROM movimientos_periodo m2 WHERE m2.caja_id = movimientos_periodo.caja_id AND m2.tipo = 'EGRESO')
                )) as por_caja

            FROM movimientos_periodo
        `, [companyId, fechaInicio.toISOString()]);

        // Diferencias de arqueo
        const diferencias = await execQuery(`
            SELECT
                COUNT(*) as total_arqueos,
                COUNT(*) FILTER (WHERE diferencia_efectivo = 0) as cuadrados,
                COUNT(*) FILTER (WHERE diferencia_efectivo > 0) as sobrantes,
                COUNT(*) FILTER (WHERE diferencia_efectivo < 0) as faltantes,
                COALESCE(SUM(diferencia_efectivo) FILTER (WHERE diferencia_efectivo > 0), 0) as total_sobrante,
                COALESCE(SUM(ABS(diferencia_efectivo)) FILTER (WHERE diferencia_efectivo < 0), 0) as total_faltante
            FROM siac_sesiones_caja s
            JOIN siac_cajas c ON s.caja_id = c.id
            JOIN siac_puntos_venta pv ON c.punto_venta_id = pv.id
            WHERE pv.company_id = $1
              AND s.fecha_cierre IS NOT NULL
              AND s.fecha_cierre >= $2
        `, [companyId, fechaInicio.toISOString()]);

        return {
            periodo,
            fecha_desde: fechaInicio.toISOString().split('T')[0],
            fecha_hasta: new Date().toISOString().split('T')[0],
            ...result[0],
            arqueos: diferencias[0] || {}
        };
    }

    /**
     * Obtener movimientos por concepto (para gráficos)
     */
    static async getMovimientosPorConcepto(companyId, dias = 30) {
        const result = await execQuery(`
            SELECT
                m.concepto,
                m.tipo,
                DATE(m.created_at) as fecha,
                SUM(m.monto) as total,
                COUNT(*) as cantidad
            FROM siac_caja_movimientos m
            JOIN siac_sesiones_caja s ON m.sesion_caja_id = s.id
            JOIN siac_cajas c ON s.caja_id = c.id
            WHERE c.company_id = $1
              AND m.created_at >= NOW() - INTERVAL '${dias} days'
              AND m.anulado = false
            GROUP BY m.concepto, m.tipo, DATE(m.created_at)
            ORDER BY fecha DESC, concepto
        `, [companyId]);

        return result;
    }

    /**
     * Obtener estado actual de todas las cajas
     */
    static async getEstadoCajas(companyId) {
        const result = await execQuery(`
            SELECT
                c.id,
                c.nombre_caja as nombre,
                c.descripcion,
                c.punto_venta_id as punto_venta,
                pv.nombre_punto_venta,
                s.id as sesion_id,
                s.estado as sesion_estado,
                s.fecha_apertura,
                s.monto_inicial_efectivo as saldo_apertura,
                COALESCE(s.monto_inicial_efectivo, 0) + COALESCE(s.total_ventas_efectivo, 0) as saldo_actual,
                CONCAT(u."firstName", ' ', u."lastName") as usuario_nombre,
                (SELECT COUNT(*) FROM siac_caja_movimientos m
                 WHERE m.sesion_caja_id = s.id) as total_movimientos
            FROM siac_cajas c
            JOIN siac_puntos_venta pv ON c.punto_venta_id = pv.id
            LEFT JOIN siac_sesiones_caja s ON c.id = s.caja_id AND s.estado = 'ABIERTA'
            LEFT JOIN users u ON s.usuario_apertura::text = u.user_id::text
            WHERE pv.company_id = $1
              AND c.activo = true
            ORDER BY c.nombre_caja
        `, [companyId]);

        return result;
    }
}

module.exports = CajaService;
