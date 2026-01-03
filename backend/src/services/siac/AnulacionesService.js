/**
 * ============================================================================
 * ANULACIONES SERVICE - Gestión de Anulaciones y Reversiones
 * ============================================================================
 *
 * Funcionalidades:
 * - Validar si un documento puede ser anulado
 * - Anular facturas (contado y cuenta corriente)
 * - Anular recibos (restaurar deuda + reversar caja + devolver cheques)
 * - Workflow de autorización para anulaciones
 * - Log completo de auditoría
 *
 * Flujos de reversión:
 * 1. Factura Contado → Reversa caja
 * 2. Factura CCC → Acredita en cuenta corriente
 * 3. Recibo → Restaura deuda + reversa caja + devuelve cheques
 *
 * Tablas utilizadas:
 * - siac_anulaciones_log (auditoría)
 * - siac_facturas (SSOT de facturas)
 * - siac_recibos (recibos de pago)
 * - siac_caja_movimientos (movimientos de caja)
 * - siac_cuenta_corriente (movimientos CCC)
 * - siac_cheques_cartera (cartera de cheques)
 *
 * Created: 2025-12-31
 */

const { sequelize } = require('../../config/database');
const { QueryTypes } = require('sequelize');

// Helper para ejecutar queries SELECT
const execQuery = async (sql, params = []) => {
    const result = await sequelize.query(sql, {
        bind: params,
        type: QueryTypes.SELECT
    });
    return result;
};

// Helper para INSERT/UPDATE/DELETE con RETURNING
const execInsert = async (sql, params = []) => {
    const [result] = await sequelize.query(sql, {
        bind: params,
        type: QueryTypes.RAW
    });
    return result;
};

class AnulacionesService {

    // =============================================================================
    // VALIDACIÓN DE ANULACIÓN
    // =============================================================================

    /**
     * Validar si un documento puede ser anulado
     * @param {string} tipoDocumento - FACTURA, RECIBO, NOTA_CREDITO
     * @param {number} documentoId - ID del documento
     * @returns {Object} - { puedeAnular, motivo, impacto, requiereAutorizacion }
     */
    static async validarAnulacion(tipoDocumento, documentoId) {
        const validacion = {
            puedeAnular: true,
            motivos: [],
            impacto: {
                afectaCaja: false,
                afectaCuentaCorriente: false,
                afectaCheques: false,
                montoTotal: 0,
                movimientosRelacionados: []
            },
            requiereAutorizacion: false
        };

        switch (tipoDocumento.toUpperCase()) {
            case 'FACTURA':
                return await this._validarAnulacionFactura(documentoId, validacion);
            case 'RECIBO':
                return await this._validarAnulacionRecibo(documentoId, validacion);
            case 'NOTA_CREDITO':
                return await this._validarAnulacionNotaCredito(documentoId, validacion);
            default:
                validacion.puedeAnular = false;
                validacion.motivos.push(`Tipo de documento no soportado: ${tipoDocumento}`);
                return validacion;
        }
    }

    /**
     * Validar anulación de factura
     */
    static async _validarAnulacionFactura(facturaId, validacion) {
        // Obtener factura
        const [factura] = await execQuery(`
            SELECT f.*, c.razon_social as cliente_nombre
            FROM siac_facturas f
            LEFT JOIN siac_clientes c ON f.cliente_id = c.id
            WHERE f.id = $1
        `, [facturaId]);

        if (!factura) {
            validacion.puedeAnular = false;
            validacion.motivos.push('Factura no encontrada');
            return validacion;
        }

        if (factura.estado === 'ANULADA') {
            validacion.puedeAnular = false;
            validacion.motivos.push('La factura ya está anulada');
            return validacion;
        }

        validacion.documento = factura;
        validacion.impacto.montoTotal = parseFloat(factura.total);

        // Verificar si tiene pagos aplicados
        const pagos = await execQuery(`
            SELECT ri.*, r.numero as recibo_numero, r.estado as recibo_estado
            FROM siac_recibos_imputaciones ri
            JOIN siac_recibos r ON ri.recibo_id = r.id
            WHERE ri.factura_id = $1 AND r.estado = 'EMITIDO'
        `, [facturaId]);

        if (pagos.length > 0) {
            const totalPagado = pagos.reduce((sum, p) => sum + parseFloat(p.monto_imputado), 0);

            if (totalPagado === parseFloat(factura.total)) {
                // Factura totalmente pagada - no se puede anular sin anular recibos
                validacion.puedeAnular = false;
                validacion.motivos.push(
                    `La factura tiene pagos aplicados por $${totalPagado.toLocaleString()}. ` +
                    `Debe anular primero los recibos: ${pagos.map(p => p.recibo_numero).join(', ')}`
                );
            } else if (totalPagado > 0) {
                // Pago parcial
                validacion.motivos.push(
                    `La factura tiene pagos parciales por $${totalPagado.toLocaleString()}`
                );
                validacion.impacto.pagosAplicados = pagos;
            }
        }

        // Verificar movimiento de caja (si fue contado)
        if (factura.condicion_pago === 'CONTADO') {
            const movCaja = await execQuery(`
                SELECT * FROM siac_caja_movimientos
                WHERE documento_tipo = 'FACTURA'
                  AND documento_id = $1
                  AND tipo_movimiento = 'INGRESO'
            `, [facturaId]);

            if (movCaja.length > 0) {
                validacion.impacto.afectaCaja = true;
                validacion.impacto.movimientosCaja = movCaja;
            }
        }

        // Verificar si afecta cuenta corriente
        if (factura.condicion_pago === 'CUENTA_CORRIENTE' || factura.condicion_pago === 'CTA_CTE') {
            const movCCC = await execQuery(`
                SELECT * FROM siac_cuenta_corriente
                WHERE documento_tipo = 'FACTURA'
                  AND documento_id = $1
            `, [facturaId]);

            if (movCCC.length > 0) {
                validacion.impacto.afectaCuentaCorriente = true;
                validacion.impacto.movimientosCCC = movCCC;
            }
        }

        // Verificar si requiere autorización
        const [config] = await execQuery(`
            SELECT * FROM siac_config_cuenta_corriente
            WHERE company_id = $1
        `, [factura.company_id]);

        if (config?.requiere_autorizacion_anulacion) {
            if (parseFloat(factura.total) >= parseFloat(config.monto_minimo_autorizacion_anulacion || 0)) {
                validacion.requiereAutorizacion = true;
            }
        }

        return validacion;
    }

    /**
     * Validar anulación de recibo
     */
    static async _validarAnulacionRecibo(reciboId, validacion) {
        // Obtener recibo
        const [recibo] = await execQuery(`
            SELECT r.*, c.razon_social as cliente_nombre
            FROM siac_recibos r
            LEFT JOIN siac_clientes c ON r.cliente_id = c.id
            WHERE r.id = $1
        `, [reciboId]);

        if (!recibo) {
            validacion.puedeAnular = false;
            validacion.motivos.push('Recibo no encontrado');
            return validacion;
        }

        if (recibo.estado === 'ANULADO') {
            validacion.puedeAnular = false;
            validacion.motivos.push('El recibo ya está anulado');
            return validacion;
        }

        validacion.documento = recibo;
        validacion.impacto.montoTotal = parseFloat(recibo.total);
        validacion.impacto.afectaCuentaCorriente = true;

        // Obtener facturas imputadas (para restaurar deuda)
        const imputaciones = await execQuery(`
            SELECT ri.*, f.numero as factura_numero, f.total as factura_total
            FROM siac_recibos_imputaciones ri
            JOIN siac_facturas f ON ri.factura_id = f.id
            WHERE ri.recibo_id = $1
        `, [reciboId]);

        validacion.impacto.facturasImputadas = imputaciones;

        // Obtener movimientos de caja a reversar
        const movCaja = await execQuery(`
            SELECT * FROM siac_caja_movimientos
            WHERE documento_tipo = 'RECIBO'
              AND documento_id = $1
        `, [reciboId]);

        if (movCaja.length > 0) {
            validacion.impacto.afectaCaja = true;
            validacion.impacto.movimientosCaja = movCaja;
        }

        // Obtener cheques asociados
        const cheques = await execQuery(`
            SELECT ch.*
            FROM siac_cheques_cartera ch
            JOIN siac_recibos_medios_pago rmp ON rmp.cheque_id = ch.id
            WHERE rmp.recibo_id = $1
        `, [reciboId]);

        if (cheques.length > 0) {
            validacion.impacto.afectaCheques = true;
            validacion.impacto.cheques = cheques;

            // Verificar estado de cheques
            for (const cheque of cheques) {
                if (cheque.estado === 'DEPOSITADO' || cheque.estado === 'COBRADO') {
                    validacion.puedeAnular = false;
                    validacion.motivos.push(
                        `Cheque N° ${cheque.numero} del banco ${cheque.banco} ` +
                        `ya fue ${cheque.estado.toLowerCase()}. No se puede anular.`
                    );
                }
            }
        }

        // Verificar si requiere autorización
        const [config] = await execQuery(`
            SELECT * FROM siac_config_cuenta_corriente
            WHERE company_id = $1
        `, [recibo.company_id]);

        if (config?.requiere_autorizacion_anulacion) {
            if (parseFloat(recibo.total) >= parseFloat(config.monto_minimo_autorizacion_anulacion || 0)) {
                validacion.requiereAutorizacion = true;
            }
        }

        return validacion;
    }

    /**
     * Validar anulación de nota de crédito
     */
    static async _validarAnulacionNotaCredito(notaCreditoId, validacion) {
        // Similar a factura pero inverso
        validacion.puedeAnular = false;
        validacion.motivos.push('Anulación de notas de crédito no implementada aún');
        return validacion;
    }

    // =============================================================================
    // ANULACIÓN DE FACTURAS
    // =============================================================================

    /**
     * Anular una factura
     * @param {number} facturaId - ID de la factura
     * @param {string} motivo - Motivo de anulación
     * @param {number} usuarioId - ID del usuario que anula
     * @param {string} usuarioNombre - Nombre del usuario
     */
    static async anularFactura(facturaId, motivo, usuarioId, usuarioNombre) {
        const transaction = await sequelize.transaction();

        try {
            // Validar primero
            const validacion = await this.validarAnulacion('FACTURA', facturaId);
            if (!validacion.puedeAnular) {
                throw new Error(validacion.motivos.join('. '));
            }

            const factura = validacion.documento;
            let movimientoCajaReversoId = null;
            let movimientoCCCReversoId = null;
            const saldoClienteAnterior = 0;
            let saldoClientePosterior = 0;

            // 1. Si fue contado, reversar caja
            if (validacion.impacto.afectaCaja && validacion.impacto.movimientosCaja) {
                for (const mov of validacion.impacto.movimientosCaja) {
                    const [reverso] = await sequelize.query(`
                        INSERT INTO siac_caja_movimientos (
                            sesion_id, tipo_movimiento, monto, descripcion,
                            documento_tipo, documento_id, documento_numero,
                            usuario_id, created_at
                        ) VALUES (
                            $1, 'EGRESO', $2, $3,
                            'ANULACION_FACTURA', $4, $5,
                            $6, NOW()
                        ) RETURNING id
                    `, {
                        bind: [
                            mov.sesion_id, mov.monto,
                            `Reversión por anulación de Factura ${factura.numero}`,
                            facturaId, factura.numero,
                            usuarioId
                        ],
                        type: QueryTypes.RAW,
                        transaction
                    });
                    movimientoCajaReversoId = reverso[0]?.id;
                }
            }

            // 2. Si fue cuenta corriente, acreditar
            if (validacion.impacto.afectaCuentaCorriente) {
                // Obtener saldo anterior
                const [resumen] = await sequelize.query(`
                    SELECT saldo FROM siac_cuenta_corriente_resumen WHERE cliente_id = $1
                `, { bind: [factura.cliente_id], type: QueryTypes.SELECT, transaction });

                const saldoAnterior = parseFloat(resumen?.saldo || 0);

                // Crear movimiento de crédito (reversa el débito de la factura)
                const [movCCC] = await sequelize.query(`
                    INSERT INTO siac_cuenta_corriente (
                        company_id, cliente_id, tipo_movimiento, monto,
                        documento_tipo, documento_id, documento_numero,
                        fecha, descripcion, saldo_anterior, saldo_posterior
                    ) VALUES (
                        $1, $2, 'CREDITO', $3,
                        'ANULACION_FACTURA', $4, $5,
                        NOW(), $6, $7, $8
                    ) RETURNING id
                `, {
                    bind: [
                        factura.company_id, factura.cliente_id, factura.total,
                        facturaId, factura.numero,
                        `Anulación de Factura ${factura.numero}`,
                        saldoAnterior, saldoAnterior - parseFloat(factura.total)
                    ],
                    type: QueryTypes.RAW,
                    transaction
                });
                movimientoCCCReversoId = movCCC[0]?.id;
                saldoClientePosterior = saldoAnterior - parseFloat(factura.total);

                // Actualizar resumen de cuenta corriente
                await sequelize.query(`
                    UPDATE siac_cuenta_corriente_resumen
                    SET saldo = saldo - $1, updated_at = NOW()
                    WHERE cliente_id = $2
                `, { bind: [factura.total, factura.cliente_id], transaction });

                // Actualizar crédito utilizado del cliente
                await sequelize.query(`
                    UPDATE siac_clientes
                    SET credito_utilizado = credito_utilizado - $1, updated_at = NOW()
                    WHERE id = $2
                `, { bind: [factura.total, factura.cliente_id], transaction });
            }

            // 3. Marcar factura como anulada
            await sequelize.query(`
                UPDATE siac_facturas
                SET estado = 'ANULADA',
                    fecha_anulacion = NOW(),
                    motivo_anulacion = $1,
                    anulada_por = $2,
                    updated_at = NOW()
                WHERE id = $3
            `, { bind: [motivo, usuarioId, facturaId], transaction });

            // 4. Registrar en log de anulaciones
            await sequelize.query(`
                INSERT INTO siac_anulaciones_log (
                    company_id, tipo_documento, documento_id, documento_numero,
                    documento_fecha, documento_monto, cliente_id, cliente_nombre,
                    motivo_anulacion, usuario_solicitante_id, usuario_solicitante_nombre,
                    afecto_caja, movimiento_caja_reverso_id, monto_caja_reversado,
                    afecto_cuenta_corriente, movimiento_cta_cte_reverso_id,
                    saldo_cliente_anterior, saldo_cliente_posterior,
                    estado
                ) VALUES (
                    $1, 'FACTURA', $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, 'COMPLETADA'
                )
            `, {
                bind: [
                    factura.company_id, facturaId, factura.numero,
                    factura.fecha, factura.total,
                    factura.cliente_id, factura.cliente_nombre,
                    motivo, usuarioId, usuarioNombre,
                    validacion.impacto.afectaCaja, movimientoCajaReversoId,
                    validacion.impacto.afectaCaja ? factura.total : null,
                    validacion.impacto.afectaCuentaCorriente, movimientoCCCReversoId,
                    saldoClienteAnterior, saldoClientePosterior
                ],
                transaction
            });

            await transaction.commit();

            return {
                success: true,
                mensaje: `Factura ${factura.numero} anulada correctamente`,
                impacto: {
                    cajareversada: validacion.impacto.afectaCaja,
                    cuentaCorrienteAcreditada: validacion.impacto.afectaCuentaCorriente,
                    montoReversado: parseFloat(factura.total)
                }
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    // =============================================================================
    // ANULACIÓN DE RECIBOS
    // =============================================================================

    /**
     * Anular un recibo
     * @param {number} reciboId - ID del recibo
     * @param {string} motivo - Motivo de anulación
     * @param {number} usuarioId - ID del usuario que anula
     * @param {string} usuarioNombre - Nombre del usuario
     */
    static async anularRecibo(reciboId, motivo, usuarioId, usuarioNombre) {
        const transaction = await sequelize.transaction();

        try {
            // Validar primero
            const validacion = await this.validarAnulacion('RECIBO', reciboId);
            if (!validacion.puedeAnular) {
                throw new Error(validacion.motivos.join('. '));
            }

            const recibo = validacion.documento;
            const chequesAfectados = [];
            let montoChequesDevueltos = 0;

            // 1. Restaurar deuda en facturas imputadas
            for (const imputacion of validacion.impacto.facturasImputadas || []) {
                await sequelize.query(`
                    UPDATE siac_facturas
                    SET saldo_pendiente = saldo_pendiente + $1,
                        estado_pago = CASE
                            WHEN saldo_pendiente + $1 >= total THEN 'PENDIENTE'
                            ELSE 'PARCIAL'
                        END,
                        updated_at = NOW()
                    WHERE id = $2
                `, { bind: [imputacion.monto_imputado, imputacion.factura_id], transaction });
            }

            // 2. Reversar movimientos de caja
            for (const mov of validacion.impacto.movimientosCaja || []) {
                await sequelize.query(`
                    INSERT INTO siac_caja_movimientos (
                        sesion_id, tipo_movimiento, monto, descripcion,
                        documento_tipo, documento_id, documento_numero,
                        usuario_id, created_at
                    ) VALUES (
                        $1, 'EGRESO', $2, $3,
                        'ANULACION_RECIBO', $4, $5,
                        $6, NOW()
                    )
                `, {
                    bind: [
                        mov.sesion_id, mov.monto,
                        `Reversión por anulación de Recibo ${recibo.numero}`,
                        reciboId, recibo.numero,
                        usuarioId
                    ],
                    transaction
                });
            }

            // 3. Devolver cheques
            for (const cheque of validacion.impacto.cheques || []) {
                const estadoAnterior = cheque.estado;
                await sequelize.query(`
                    UPDATE siac_cheques_cartera
                    SET estado = 'DEVUELTO',
                        fecha_devolucion = NOW(),
                        motivo_devolucion = $1,
                        updated_by = $2,
                        updated_at = NOW()
                    WHERE id = $3
                `, {
                    bind: [`Anulación de Recibo ${recibo.numero}`, usuarioId, cheque.id],
                    transaction
                });

                chequesAfectados.push({
                    cheque_id: cheque.id,
                    numero: cheque.numero,
                    banco: cheque.banco,
                    monto: parseFloat(cheque.monto),
                    estado_anterior: estadoAnterior,
                    estado_nuevo: 'DEVUELTO'
                });
                montoChequesDevueltos += parseFloat(cheque.monto);
            }

            // 4. Registrar débito en cuenta corriente (restaura la deuda)
            const [resumen] = await sequelize.query(`
                SELECT saldo FROM siac_cuenta_corriente_resumen WHERE cliente_id = $1
            `, { bind: [recibo.cliente_id], type: QueryTypes.SELECT, transaction });

            const saldoAnterior = parseFloat(resumen?.saldo || 0);

            await sequelize.query(`
                INSERT INTO siac_cuenta_corriente (
                    company_id, cliente_id, tipo_movimiento, monto,
                    documento_tipo, documento_id, documento_numero,
                    fecha, descripcion, saldo_anterior, saldo_posterior
                ) VALUES (
                    $1, $2, 'DEBITO', $3,
                    'ANULACION_RECIBO', $4, $5,
                    NOW(), $6, $7, $8
                )
            `, {
                bind: [
                    recibo.company_id, recibo.cliente_id, recibo.total,
                    reciboId, recibo.numero,
                    `Anulación de Recibo ${recibo.numero} - Restaura deuda`,
                    saldoAnterior, saldoAnterior + parseFloat(recibo.total)
                ],
                transaction
            });

            // Actualizar resumen
            await sequelize.query(`
                UPDATE siac_cuenta_corriente_resumen
                SET saldo = saldo + $1, updated_at = NOW()
                WHERE cliente_id = $2
            `, { bind: [recibo.total, recibo.cliente_id], transaction });

            // 5. Marcar recibo como anulado
            await sequelize.query(`
                UPDATE siac_recibos
                SET estado = 'ANULADO',
                    fecha_anulacion = NOW(),
                    motivo_anulacion = $1,
                    anulado_por = $2,
                    updated_at = NOW()
                WHERE id = $3
            `, { bind: [motivo, usuarioId, reciboId], transaction });

            // 6. Anular imputaciones
            await sequelize.query(`
                UPDATE siac_recibos_imputaciones
                SET anulado = true, fecha_anulacion = NOW()
                WHERE recibo_id = $1
            `, { bind: [reciboId], transaction });

            // 7. Registrar en log de anulaciones
            await sequelize.query(`
                INSERT INTO siac_anulaciones_log (
                    company_id, tipo_documento, documento_id, documento_numero,
                    documento_fecha, documento_monto, cliente_id, cliente_nombre,
                    motivo_anulacion, usuario_solicitante_id, usuario_solicitante_nombre,
                    afecto_caja, monto_caja_reversado,
                    afecto_cuenta_corriente,
                    saldo_cliente_anterior, saldo_cliente_posterior,
                    afecto_cheques, cheques_afectados,
                    cantidad_cheques_devueltos, monto_cheques_devueltos,
                    facturas_afectadas, estado
                ) VALUES (
                    $1, 'RECIBO', $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, true, $13, $14, $15, $16::jsonb,
                    $17, $18, $19::jsonb, 'COMPLETADA'
                )
            `, {
                bind: [
                    recibo.company_id, reciboId, recibo.numero,
                    recibo.fecha, recibo.total,
                    recibo.cliente_id, recibo.cliente_nombre,
                    motivo, usuarioId, usuarioNombre,
                    (validacion.impacto.movimientosCaja?.length || 0) > 0,
                    recibo.total,
                    saldoAnterior, saldoAnterior + parseFloat(recibo.total),
                    chequesAfectados.length > 0,
                    JSON.stringify(chequesAfectados),
                    chequesAfectados.length, montoChequesDevueltos,
                    JSON.stringify(validacion.impacto.facturasImputadas?.map(f => ({
                        factura_id: f.factura_id,
                        numero: f.factura_numero,
                        monto_imputado: parseFloat(f.monto_imputado)
                    })) || [])
                ],
                transaction
            });

            await transaction.commit();

            return {
                success: true,
                mensaje: `Recibo ${recibo.numero} anulado correctamente`,
                impacto: {
                    facturasRestauradas: validacion.impacto.facturasImputadas?.length || 0,
                    chequesDevueltos: chequesAfectados.length,
                    montoChequesDevueltos,
                    deudaRestaurada: parseFloat(recibo.total)
                }
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    // =============================================================================
    // WORKFLOW DE AUTORIZACIÓN
    // =============================================================================

    /**
     * Solicitar autorización para anulación
     */
    static async solicitarAutorizacion(tipoDocumento, documentoId, motivo, usuarioId, usuarioNombre) {
        const validacion = await this.validarAnulacion(tipoDocumento, documentoId);

        if (!validacion.puedeAnular) {
            throw new Error(validacion.motivos.join('. '));
        }

        const documento = validacion.documento;

        const [solicitud] = await execInsert(`
            INSERT INTO siac_anulaciones_log (
                company_id, tipo_documento, documento_id, documento_numero,
                documento_fecha, documento_monto, cliente_id, cliente_nombre,
                motivo_anulacion, usuario_solicitante_id, usuario_solicitante_nombre,
                requirio_autorizacion, autorizado, estado
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, false, 'PENDIENTE'
            ) RETURNING *
        `, [
            documento.company_id, tipoDocumento, documentoId, documento.numero,
            documento.fecha, documento.total,
            documento.cliente_id, documento.cliente_nombre,
            motivo, usuarioId, usuarioNombre
        ]);

        return {
            success: true,
            solicitudId: solicitud.id,
            mensaje: 'Solicitud de anulación creada. Pendiente de autorización.',
            requiereAutorizacion: true
        };
    }

    /**
     * Autorizar anulación pendiente
     */
    static async autorizarAnulacion(solicitudId, autorizanteId, autorizanteNombre) {
        const [solicitud] = await execQuery(`
            SELECT * FROM siac_anulaciones_log WHERE id = $1 AND estado = 'PENDIENTE'
        `, [solicitudId]);

        if (!solicitud) {
            throw new Error('Solicitud de anulación no encontrada o ya procesada');
        }

        // Ejecutar la anulación según tipo
        let resultado;
        if (solicitud.tipo_documento === 'FACTURA') {
            resultado = await this.anularFactura(
                solicitud.documento_id,
                solicitud.motivo_anulacion,
                solicitud.usuario_solicitante_id,
                solicitud.usuario_solicitante_nombre
            );
        } else if (solicitud.tipo_documento === 'RECIBO') {
            resultado = await this.anularRecibo(
                solicitud.documento_id,
                solicitud.motivo_anulacion,
                solicitud.usuario_solicitante_id,
                solicitud.usuario_solicitante_nombre
            );
        }

        // Actualizar solicitud
        await execInsert(`
            UPDATE siac_anulaciones_log
            SET autorizado = true,
                usuario_autorizante_id = $1,
                usuario_autorizante_nombre = $2,
                fecha_autorizacion = NOW(),
                estado = 'COMPLETADA'
            WHERE id = $3
        `, [autorizanteId, autorizanteNombre, solicitudId]);

        return {
            ...resultado,
            autorizadoPor: autorizanteNombre
        };
    }

    /**
     * Rechazar anulación pendiente
     */
    static async rechazarAnulacion(solicitudId, autorizanteId, autorizanteNombre, motivoRechazo) {
        await execInsert(`
            UPDATE siac_anulaciones_log
            SET autorizado = false,
                usuario_autorizante_id = $1,
                usuario_autorizante_nombre = $2,
                fecha_autorizacion = NOW(),
                estado = 'RECHAZADA',
                observaciones = $3
            WHERE id = $4
        `, [autorizanteId, autorizanteNombre, motivoRechazo, solicitudId]);

        return {
            success: true,
            mensaje: 'Solicitud de anulación rechazada'
        };
    }

    // =============================================================================
    // CONSULTAS
    // =============================================================================

    /**
     * Obtener solicitudes pendientes de autorización
     */
    static async getPendientes(companyId) {
        return await execQuery(`
            SELECT *
            FROM siac_anulaciones_log
            WHERE company_id = $1
              AND estado = 'PENDIENTE'
            ORDER BY created_at DESC
        `, [companyId]);
    }

    /**
     * Obtener log de anulaciones
     */
    static async getLog(companyId, filtros = {}) {
        let sql = `
            SELECT *
            FROM siac_anulaciones_log
            WHERE company_id = $1
        `;
        const params = [companyId];
        let paramIndex = 2;

        if (filtros.tipoDocumento) {
            sql += ` AND tipo_documento = $${paramIndex}`;
            params.push(filtros.tipoDocumento);
            paramIndex++;
        }

        if (filtros.clienteId) {
            sql += ` AND cliente_id = $${paramIndex}`;
            params.push(filtros.clienteId);
            paramIndex++;
        }

        if (filtros.fechaDesde) {
            sql += ` AND fecha_anulacion >= $${paramIndex}`;
            params.push(filtros.fechaDesde);
            paramIndex++;
        }

        if (filtros.fechaHasta) {
            sql += ` AND fecha_anulacion <= $${paramIndex}`;
            params.push(filtros.fechaHasta);
            paramIndex++;
        }

        sql += ` ORDER BY created_at DESC LIMIT 100`;

        return await execQuery(sql, params);
    }
}

module.exports = AnulacionesService;
