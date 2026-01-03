/**
 * ============================================================================
 * MEDIOS DE PAGO SERVICE - Gestión de Medios de Pago y Beneficios/Recargos
 * ============================================================================
 *
 * Funcionalidades:
 * - CRUD de medios de pago configurables por empresa
 * - Cálculo de descuentos y recargos según medio de pago
 * - Cálculo de retenciones automáticas basadas en TaxTemplate
 * - Validación de límites y plazos
 * - Integración con TaxTemplate para retenciones dinámicas por país
 *
 * Tablas utilizadas:
 * - siac_medios_pago (catálogo de medios de pago)
 * - siac_config_cuenta_corriente (configuración general)
 * - siac_clientes_config (excepciones por cliente)
 * - tax_templates, tax_concepts, tax_rates (matriz fiscal)
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

class MediosPagoService {

    // =============================================================================
    // MEDIOS DE PAGO - CRUD
    // =============================================================================

    /**
     * Obtener todos los medios de pago activos de una empresa
     */
    static async getMediosPago(companyId) {
        return await execQuery(`
            SELECT *
            FROM siac_medios_pago
            WHERE company_id = $1
              AND activo = true
            ORDER BY orden_mostrar ASC, nombre ASC
        `, [companyId]);
    }

    /**
     * Obtener un medio de pago por ID
     */
    static async getMedioPagoById(id) {
        const result = await execQuery(`
            SELECT * FROM siac_medios_pago WHERE id = $1
        `, [id]);
        return result[0] || null;
    }

    /**
     * Crear medio de pago
     */
    static async createMedioPago(data) {
        const result = await execInsert(`
            INSERT INTO siac_medios_pago (
                company_id, codigo, nombre, tipo,
                aplica_descuento, porcentaje_descuento,
                aplica_recargo, porcentaje_recargo,
                dias_descuento_pronto_pago, porcentaje_pronto_pago,
                plazo_maximo_dias, plazo_minimo_dias,
                aplica_retencion_iva, porcentaje_retencion_iva,
                aplica_retencion_ganancias, porcentaje_retencion_ganancias,
                aplica_retencion_iibb, porcentaje_retencion_iibb,
                requiere_autorizacion, monto_minimo_autorizacion,
                monto_minimo, monto_maximo, afecta_caja,
                activo, orden_mostrar
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18,
                $19, $20, $21, $22, $23, $24, $25
            ) RETURNING *
        `, [
            data.company_id, data.codigo, data.nombre, data.tipo,
            data.aplica_descuento || false, data.porcentaje_descuento || 0,
            data.aplica_recargo || false, data.porcentaje_recargo || 0,
            data.dias_descuento_pronto_pago, data.porcentaje_pronto_pago || 0,
            data.plazo_maximo_dias || 180, data.plazo_minimo_dias || 0,
            data.aplica_retencion_iva || false, data.porcentaje_retencion_iva || 0,
            data.aplica_retencion_ganancias || false, data.porcentaje_retencion_ganancias || 0,
            data.aplica_retencion_iibb || false, data.porcentaje_retencion_iibb || 0,
            data.requiere_autorizacion || false, data.monto_minimo_autorizacion || 100000,
            data.monto_minimo, data.monto_maximo,
            data.afecta_caja !== false, data.activo !== false,
            data.orden_mostrar || 99
        ]);
        return result[0];
    }

    /**
     * Actualizar medio de pago
     */
    static async updateMedioPago(id, data) {
        const fields = [];
        const params = [];
        let paramIndex = 1;

        const allowedFields = [
            'nombre', 'tipo',
            'aplica_descuento', 'porcentaje_descuento',
            'aplica_recargo', 'porcentaje_recargo',
            'dias_descuento_pronto_pago', 'porcentaje_pronto_pago',
            'plazo_maximo_dias', 'plazo_minimo_dias',
            'aplica_retencion_iva', 'porcentaje_retencion_iva',
            'aplica_retencion_ganancias', 'porcentaje_retencion_ganancias',
            'aplica_retencion_iibb', 'porcentaje_retencion_iibb',
            'requiere_autorizacion', 'monto_minimo_autorizacion',
            'monto_minimo', 'monto_maximo', 'afecta_caja',
            'activo', 'orden_mostrar'
        ];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = $${paramIndex}`);
                params.push(data[field]);
                paramIndex++;
            }
        }

        if (fields.length === 0) {
            return await this.getMedioPagoById(id);
        }

        fields.push(`updated_at = NOW()`);
        params.push(id);

        const result = await execInsert(`
            UPDATE siac_medios_pago
            SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `, params);

        return result[0];
    }

    /**
     * Desactivar medio de pago (soft delete)
     */
    static async deleteMedioPago(id) {
        const result = await execInsert(`
            UPDATE siac_medios_pago
            SET activo = false, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [id]);
        return result[0];
    }

    // =============================================================================
    // CÁLCULOS DE BENEFICIOS/RECARGOS
    // =============================================================================

    /**
     * Calcular monto con descuento/recargo según medio de pago
     * @param {number} medioPagoId - ID del medio de pago
     * @param {number} montoBase - Monto base a calcular
     * @param {Date} fechaFactura - Fecha de la factura (para pronto pago)
     * @returns {Object} - { montoBase, descuento, recargo, montoFinal, detalle }
     */
    static async calcularMontoConMedioPago(medioPagoId, montoBase, fechaFactura = new Date()) {
        const medio = await this.getMedioPagoById(medioPagoId);

        if (!medio) {
            return {
                montoBase,
                descuento: 0,
                recargo: 0,
                montoFinal: montoBase,
                detalle: { error: 'Medio de pago no encontrado' }
            };
        }

        let descuento = 0;
        let recargo = 0;
        let detalleDescuento = null;
        let detalleRecargo = null;

        // Calcular descuento por pronto pago si aplica
        if (medio.dias_descuento_pronto_pago && medio.porcentaje_pronto_pago > 0) {
            const diasDesdeFactura = Math.floor((new Date() - new Date(fechaFactura)) / (1000 * 60 * 60 * 24));
            if (diasDesdeFactura <= medio.dias_descuento_pronto_pago) {
                const descuentoProntoPago = parseFloat((montoBase * medio.porcentaje_pronto_pago / 100).toFixed(2));
                descuento += descuentoProntoPago;
                detalleDescuento = {
                    tipo: 'PRONTO_PAGO',
                    porcentaje: parseFloat(medio.porcentaje_pronto_pago),
                    monto: descuentoProntoPago,
                    diasRestantes: medio.dias_descuento_pronto_pago - diasDesdeFactura
                };
            }
        }

        // Calcular descuento estándar del medio de pago
        if (medio.aplica_descuento && medio.porcentaje_descuento > 0) {
            const descuentoMedio = parseFloat((montoBase * medio.porcentaje_descuento / 100).toFixed(2));
            descuento += descuentoMedio;
            detalleDescuento = detalleDescuento || {};
            detalleDescuento.descuentoMedioPago = {
                porcentaje: parseFloat(medio.porcentaje_descuento),
                monto: descuentoMedio
            };
        }

        // Calcular recargo del medio de pago
        if (medio.aplica_recargo && medio.porcentaje_recargo > 0) {
            recargo = parseFloat((montoBase * medio.porcentaje_recargo / 100).toFixed(2));
            detalleRecargo = {
                tipo: medio.tipo,
                porcentaje: parseFloat(medio.porcentaje_recargo),
                monto: recargo
            };
        }

        const montoFinal = parseFloat((montoBase - descuento + recargo).toFixed(2));

        return {
            montoBase,
            descuento,
            recargo,
            montoFinal,
            medioPago: {
                id: medio.id,
                codigo: medio.codigo,
                nombre: medio.nombre,
                tipo: medio.tipo
            },
            detalle: {
                descuento: detalleDescuento,
                recargo: detalleRecargo
            }
        };
    }

    /**
     * Calcular múltiples medios de pago (para recibos con varios medios)
     */
    static async calcularMultiplesMediosPago(mediosPago, fechaFactura = new Date()) {
        const resultados = [];
        let totalDescuentos = 0;
        let totalRecargos = 0;
        let totalFinal = 0;

        for (const mp of mediosPago) {
            const calculo = await this.calcularMontoConMedioPago(mp.medioPagoId, mp.monto, fechaFactura);
            resultados.push({
                ...calculo,
                montoOriginal: mp.monto
            });
            totalDescuentos += calculo.descuento;
            totalRecargos += calculo.recargo;
            totalFinal += calculo.montoFinal;
        }

        return {
            mediosPago: resultados,
            totales: {
                montoBase: mediosPago.reduce((sum, mp) => sum + mp.monto, 0),
                descuentos: totalDescuentos,
                recargos: totalRecargos,
                montoFinal: totalFinal
            }
        };
    }

    // =============================================================================
    // RETENCIONES AUTOMÁTICAS
    // =============================================================================

    /**
     * Calcular retenciones automáticas basadas en TaxTemplate del país
     * @param {number} clienteId - ID del cliente
     * @param {number} montoBase - Monto base para calcular retenciones
     * @param {number} companyId - ID de la empresa
     * @returns {Array} - Array de retenciones calculadas
     */
    static async calcularRetenciones(clienteId, montoBase, companyId) {
        // Usar función PostgreSQL para calcular retenciones
        const retenciones = await execQuery(`
            SELECT * FROM siac_calcular_retenciones_automaticas($1, $2, $3)
        `, [clienteId, montoBase, companyId]);

        // Formatear resultado
        return retenciones.map(r => ({
            tipoRetencion: r.tipo_retencion,
            descripcion: r.descripcion,
            baseImponible: parseFloat(r.base_imponible),
            porcentaje: parseFloat(r.porcentaje),
            montoRetenido: parseFloat(r.monto_retenido)
        }));
    }

    /**
     * Obtener exenciones de retenciones de un cliente
     */
    static async getExencionesCliente(clienteId) {
        const result = await execQuery(`
            SELECT * FROM siac_get_exenciones_retenciones($1)
        `, [clienteId]);
        return result[0] || {
            exento_iva: false,
            exento_ganancias: false,
            exento_iibb: false,
            certificado_vigente: false
        };
    }

    // =============================================================================
    // CONFIGURACIÓN DE CHEQUES DIFERIDOS
    // =============================================================================

    /**
     * Obtener configuración de cheques diferidos para un cliente
     * Prioridad: Config cliente > Config empresa > Default
     */
    static async getConfigChequesDiferidos(clienteId) {
        const result = await execQuery(`
            SELECT * FROM siac_get_config_cheques_diferidos($1)
        `, [clienteId]);
        return result[0] || {
            plazo_maximo_dias: 30,
            interes_mensual: 0,
            fuente: 'DEFAULT'
        };
    }

    /**
     * Validar cheque diferido según configuración del cliente
     */
    static async validarChequeDiferido(clienteId, fechaVencimiento, monto) {
        const config = await this.getConfigChequesDiferidos(clienteId);
        const hoy = new Date();
        const vencimiento = new Date(fechaVencimiento);
        const diasDiferido = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));

        const validacion = {
            valido: true,
            diasDiferido,
            plazoMaximo: config.plazo_maximo_dias,
            interesMensual: parseFloat(config.interes_mensual),
            interesCalculado: 0,
            montoConInteres: monto,
            errores: [],
            config
        };

        // Validar plazo máximo
        if (diasDiferido > config.plazo_maximo_dias) {
            validacion.valido = false;
            validacion.errores.push(
                `El cheque supera el plazo máximo de ${config.plazo_maximo_dias} días (tiene ${diasDiferido} días)`
            );
        }

        // Calcular interés si aplica
        if (config.interes_mensual > 0 && diasDiferido > 0) {
            const meses = diasDiferido / 30;
            const interes = parseFloat((monto * config.interes_mensual / 100 * meses).toFixed(2));
            validacion.interesCalculado = interes;
            validacion.montoConInteres = parseFloat((monto + interes).toFixed(2));
        }

        return validacion;
    }

    // =============================================================================
    // CONFIGURACIÓN DE INTERESES POR MORA
    // =============================================================================

    /**
     * Obtener configuración de intereses por mora para un cliente
     */
    static async getConfigInteresesMora(clienteId) {
        const result = await execQuery(`
            SELECT * FROM siac_get_config_intereses_mora($1)
        `, [clienteId]);
        return result[0] || {
            aplica_intereses: false,
            tasa_diaria: 0.001,
            tasa_mensual: 3.00,
            tipo_calculo: 'DIARIO',
            dias_gracia: 0,
            fuente: 'DEFAULT'
        };
    }

    /**
     * Calcular intereses por mora sobre un monto vencido
     */
    static async calcularInteresesMora(clienteId, montoVencido, diasVencido) {
        const config = await this.getConfigInteresesMora(clienteId);

        if (!config.aplica_intereses || diasVencido <= config.dias_gracia) {
            return {
                aplica: false,
                montoBase: montoVencido,
                diasVencido,
                diasGracia: config.dias_gracia,
                intereses: 0,
                montoTotal: montoVencido,
                config
            };
        }

        const diasEfectivos = diasVencido - config.dias_gracia;
        let intereses = 0;

        if (config.tipo_calculo === 'DIARIO') {
            intereses = parseFloat((montoVencido * config.tasa_diaria * diasEfectivos).toFixed(2));
        } else {
            // MENSUAL
            const meses = diasEfectivos / 30;
            intereses = parseFloat((montoVencido * config.tasa_mensual / 100 * meses).toFixed(2));
        }

        return {
            aplica: true,
            montoBase: montoVencido,
            diasVencido,
            diasGracia: config.dias_gracia,
            diasEfectivos,
            tipoCalculo: config.tipo_calculo,
            tasa: config.tipo_calculo === 'DIARIO'
                ? `${(config.tasa_diaria * 100).toFixed(3)}% diario`
                : `${config.tasa_mensual}% mensual`,
            intereses,
            montoTotal: parseFloat((montoVencido + intereses).toFixed(2)),
            config
        };
    }

    // =============================================================================
    // VALIDACIONES
    // =============================================================================

    /**
     * Validar si un medio de pago puede usarse para un monto dado
     */
    static async validarMedioPago(medioPagoId, monto, clienteId = null) {
        const medio = await this.getMedioPagoById(medioPagoId);

        const validacion = {
            valido: true,
            errores: [],
            warnings: [],
            requiereAutorizacion: false
        };

        if (!medio) {
            validacion.valido = false;
            validacion.errores.push('Medio de pago no encontrado');
            return validacion;
        }

        if (!medio.activo) {
            validacion.valido = false;
            validacion.errores.push('Medio de pago no está activo');
            return validacion;
        }

        // Validar monto mínimo
        if (medio.monto_minimo && monto < medio.monto_minimo) {
            validacion.valido = false;
            validacion.errores.push(
                `Monto mínimo para ${medio.nombre}: $${medio.monto_minimo.toLocaleString()}`
            );
        }

        // Validar monto máximo
        if (medio.monto_maximo && monto > medio.monto_maximo) {
            validacion.valido = false;
            validacion.errores.push(
                `Monto máximo para ${medio.nombre}: $${medio.monto_maximo.toLocaleString()}`
            );
        }

        // Verificar si requiere autorización
        if (medio.requiere_autorizacion) {
            if (!medio.monto_minimo_autorizacion || monto >= medio.monto_minimo_autorizacion) {
                validacion.requiereAutorizacion = true;
                validacion.warnings.push(
                    `Monto superior a $${(medio.monto_minimo_autorizacion || 0).toLocaleString()} requiere autorización`
                );
            }
        }

        return validacion;
    }

    // =============================================================================
    // HELPERS
    // =============================================================================

    /**
     * Crear medios de pago por defecto para una empresa nueva
     */
    static async crearMediosPagoDefault(companyId) {
        await sequelize.query(`SELECT siac_crear_medios_pago_default($1)`, {
            bind: [companyId],
            type: QueryTypes.RAW
        });
        return await this.getMediosPago(companyId);
    }

    /**
     * Obtener tipos de medios de pago disponibles
     */
    static getTiposMedioPago() {
        return [
            { codigo: 'EFECTIVO', nombre: 'Efectivo', afectaCaja: true },
            { codigo: 'CHEQUE_AL_DIA', nombre: 'Cheque al Día', afectaCaja: true },
            { codigo: 'CHEQUE_DIFERIDO', nombre: 'Cheque Diferido', afectaCaja: false },
            { codigo: 'TRANSFERENCIA', nombre: 'Transferencia Bancaria', afectaCaja: true },
            { codigo: 'TARJETA_DEBITO', nombre: 'Tarjeta Débito', afectaCaja: true },
            { codigo: 'TARJETA_CREDITO', nombre: 'Tarjeta Crédito', afectaCaja: true },
            { codigo: 'MERCADOPAGO', nombre: 'MercadoPago', afectaCaja: true },
            { codigo: 'CUENTA_CORRIENTE', nombre: 'Cuenta Corriente', afectaCaja: false },
            { codigo: 'OTRO', nombre: 'Otro', afectaCaja: true }
        ];
    }
}

module.exports = MediosPagoService;
