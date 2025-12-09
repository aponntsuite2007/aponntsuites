/**
 * ============================================================================
 * AFIP BILLING SERVICE - Facturación Electrónica Multi-Tenant
 * ============================================================================
 *
 * Servicio para solicitar CAE (Código de Autorización Electrónica) a AFIP
 * usando WSFEv1 (Web Service de Facturación Electrónica versión 1).
 *
 * FEATURES:
 * - 100% Multi-tenant (usa configuración fiscal de cada empresa)
 * - Gestión de puntos de venta por sucursal
 * - Soporte Facturas A, B, C (Responsable Inscripto, Monotributo, Consumidor Final)
 * - Cálculo automático de IVA según condiciones
 * - Log completo de CAEs obtenidos
 * - Validaciones previas antes de enviar a AFIP
 *
 * FLUJO:
 * 1. Validar datos de factura
 * 2. Obtener Token de Acceso (WSAA)
 * 3. Obtener próximo número de comprobante
 * 4. Construir request SOAP para FECAESolicitar
 * 5. Enviar a WSFEv1
 * 6. Parsear respuesta y extraer CAE
 * 7. Guardar CAE en BD y actualizar factura
 *
 * Created: 2025-01-20
 */

const soap = require('soap');
const moment = require('moment');
const { Sequelize } = require('sequelize');
const AfipAuthService = require('./AfipAuthService');
const {
    ENDPOINTS,
    TIPOS_COMPROBANTE,
    TIPOS_DOCUMENTO,
    ALICUOTAS_IVA,
    CONCEPTOS,
    TIPOS_MONEDA,
    RESULTADOS_AFIP,
    ESTADOS_CAE,
    validarCUIT,
    getAlicuotaIVACode
} = require('./utils/afip-constants');

// Configurar conexión directa
const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD,
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        dialect: 'postgres',
        logging: false
    }
);

class AfipBillingService {
    /**
     * Solicitar CAE para una factura
     *
     * @param {number} companyId - ID de la empresa
     * @param {number} invoiceId - ID de la factura (siac_facturas)
     * @returns {Object} { cae, caeVencimiento, resultado, observaciones }
     */
    async solicitarCAE(companyId, invoiceId) {
        console.log(`📋 [AFIP] Solicitando CAE para factura ${invoiceId} de company ${companyId}...`);

        try {
            // 1. Obtener datos de la factura
            const invoice = await this.getInvoiceData(invoiceId, companyId);

            // 2. Obtener configuración fiscal de la empresa
            const fiscalConfig = await this.getCompanyFiscalConfig(companyId);

            // 3. Obtener configuración del punto de venta
            const branchConfig = await this.getBranchConfig(companyId, invoice.punto_venta);

            // 4. Validar datos antes de enviar a AFIP
            this.validateInvoiceData(invoice, fiscalConfig, branchConfig);

            // 5. Obtener Token de Acceso (WSAA)
            const { token, sign } = await AfipAuthService.getAccessTicket(companyId, 'wsfe');

            // 6. Obtener próximo número de comprobante
            const numeroComprobante = await this.getNextComprobanteNumber(
                companyId,
                invoice.punto_venta,
                invoice.tipo_comprobante
            );

            // 7. Construir request SOAP
            const soapRequest = this.buildFECAESolicitarRequest(
                fiscalConfig,
                branchConfig,
                invoice,
                numeroComprobante,
                token,
                sign
            );

            // 8. Enviar a WSFEv1
            const endpoint = fiscalConfig.afip_environment === 'PRODUCTION'
                ? ENDPOINTS.WSFE.PRODUCTION
                : ENDPOINTS.WSFE.TESTING;

            console.log(`   🌐 Endpoint WSFEv1: ${endpoint}`);

            const response = await this.callWSFEFECAESolicitar(endpoint, soapRequest);

            // 9. Parsear respuesta
            const caeData = this.parseCAEResponse(response);

            // 10. Guardar CAE en log
            await this.saveCAELog(
                companyId,
                invoiceId,
                invoice.punto_venta,
                invoice.tipo_comprobante,
                numeroComprobante,
                caeData,
                soapRequest,
                response
            );

            // 11. Actualizar factura con CAE
            await this.updateInvoiceWithCAE(invoiceId, numeroComprobante, caeData);

            console.log(`✅ [AFIP] CAE obtenido: ${caeData.cae} (vence ${caeData.caeVencimiento})`);

            return caeData;

        } catch (error) {
            console.error('❌ [AFIP] Error al solicitar CAE:', error.message);

            // Log de error
            await this.logCAEError(companyId, invoiceId, error);

            throw error;
        }
    }

    /**
     * Obtener datos de la factura de BD
     */
    async getInvoiceData(invoiceId, companyId) {
        const [invoice] = await sequelize.query(
            `SELECT
                id,
                company_id,
                invoice_number,
                cliente_cuit,
                cliente_razon_social,
                cliente_condicion_iva,
                cliente_tipo_documento,
                cliente_numero_documento,
                subtotal,
                impuestos,
                total,
                fecha_emision,
                fecha_vencimiento,
                concepto,
                moneda,
                cotizacion,
                observaciones,
                items
             FROM siac_facturas
             WHERE id = :invoiceId
               AND company_id = :companyId`,
            {
                replacements: { invoiceId, companyId },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        if (!invoice) {
            throw new Error(`Factura ${invoiceId} no encontrada para company ${companyId}`);
        }

        // Parsear JSON fields
        invoice.impuestos = JSON.parse(invoice.impuestos || '[]');
        invoice.items = JSON.parse(invoice.items || '[]');

        // Obtener punto de venta y tipo de comprobante desde invoice_number
        // Format: TIPO-PV-NUM (ej: "FAC-A-0001-00000123")
        const parts = invoice.invoice_number.split('-');
        invoice.tipo_factura = parts[1]; // A, B, C
        invoice.punto_venta = parseInt(parts[2]);

        // Mapear tipo de factura a código AFIP
        const tipoMap = {
            'A': TIPOS_COMPROBANTE.FACTURA_A,
            'B': TIPOS_COMPROBANTE.FACTURA_B,
            'C': TIPOS_COMPROBANTE.FACTURA_C
        };
        invoice.tipo_comprobante = tipoMap[invoice.tipo_factura] || TIPOS_COMPROBANTE.FACTURA_B;

        return invoice;
    }

    /**
     * Obtener configuración fiscal de empresa
     */
    async getCompanyFiscalConfig(companyId) {
        const [config] = await sequelize.query(
            `SELECT
                cuit,
                razon_social,
                condicion_iva,
                afip_environment
             FROM company_fiscal_config
             WHERE company_id = :companyId
               AND is_active = true`,
            {
                replacements: { companyId },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        if (!config) {
            throw new Error(`Empresa ${companyId} no tiene configuración fiscal activa`);
        }

        return config;
    }

    /**
     * Obtener configuración de sucursal/punto de venta
     */
    async getBranchConfig(companyId, puntoVenta) {
        const [branch] = await sequelize.query(
            `SELECT
                punto_venta,
                domicilio_fiscal,
                codigo_postal,
                localidad,
                provincia
             FROM branch_offices_fiscal
             WHERE company_id = :companyId
               AND punto_venta = :puntoVenta
               AND is_active = true`,
            {
                replacements: { companyId, puntoVenta },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        if (!branch) {
            throw new Error(`Punto de venta ${puntoVenta} no configurado para company ${companyId}`);
        }

        return branch;
    }

    /**
     * Validar datos de factura antes de enviar a AFIP
     */
    validateInvoiceData(invoice, fiscalConfig, branchConfig) {
        // Validar CUIT de empresa
        if (!validarCUIT(fiscalConfig.cuit)) {
            throw new Error(`CUIT de empresa inválido: ${fiscalConfig.cuit}`);
        }

        // Validar CUIT de cliente (solo para facturas A)
        if (invoice.tipo_comprobante === TIPOS_COMPROBANTE.FACTURA_A) {
            if (!invoice.cliente_cuit || !validarCUIT(invoice.cliente_cuit)) {
                throw new Error('Factura A requiere CUIT válido del cliente');
            }
        }

        // Validar montos
        if (invoice.subtotal <= 0 || invoice.total <= 0) {
            throw new Error('Subtotal y total deben ser mayores a 0');
        }

        // Validar fecha de emisión
        const fechaEmision = moment(invoice.fecha_emision);
        const hoy = moment();
        const diferenciaDias = hoy.diff(fechaEmision, 'days');

        if (diferenciaDias > 5) {
            throw new Error('La fecha de emisión no puede ser mayor a 5 días en el pasado');
        }

        if (diferenciaDias < 0) {
            throw new Error('La fecha de emisión no puede ser futura');
        }

        console.log('   ✅ Validaciones previas OK');
    }

    /**
     * Obtener próximo número de comprobante
     */
    async getNextComprobanteNumber(companyId, puntoVenta, tipoComprobante) {
        const [result] = await sequelize.query(
            `SELECT get_next_comprobante_number(:companyId, :puntoVenta, :tipoComprobante) as next_number`,
            {
                replacements: { companyId, puntoVenta, tipoComprobante },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        return result.next_number;
    }

    /**
     * Construir request SOAP para FECAESolicitar
     */
    buildFECAESolicitarRequest(fiscalConfig, branchConfig, invoice, numeroComprobante, token, sign) {
        // Calcular IVA
        const ivaArray = this.buildIVAArray(invoice);

        // Fecha en formato YYYYMMDD
        const fechaEmision = moment(invoice.fecha_emision).format('YYYYMMDD');
        const fechaVencimiento = invoice.fecha_vencimiento
            ? moment(invoice.fecha_vencimiento).format('YYYYMMDD')
            : fechaEmision;

        const request = {
            Auth: {
                Token: token,
                Sign: sign,
                Cuit: fiscalConfig.cuit.replace(/-/g, '') // Sin guiones
            },
            FeCAEReq: {
                FeCabReq: {
                    CantReg: 1,
                    PtoVta: branchConfig.punto_venta,
                    CbteTipo: invoice.tipo_comprobante
                },
                FeDetReq: {
                    FECAEDetRequest: {
                        Concepto: invoice.concepto || CONCEPTOS.PRODUCTOS,
                        DocTipo: invoice.cliente_tipo_documento || TIPOS_DOCUMENTO.CUIT,
                        DocNro: invoice.cliente_numero_documento || 0,
                        CbteDesde: numeroComprobante,
                        CbteHasta: numeroComprobante,
                        CbteFch: fechaEmision,
                        ImpTotal: parseFloat(invoice.total).toFixed(2),
                        ImpTotConc: 0, // Importe neto no gravado
                        ImpNeto: parseFloat(invoice.subtotal).toFixed(2),
                        ImpOpEx: 0, // Importe exento
                        ImpIVA: this.calculateTotalIVA(invoice).toFixed(2),
                        ImpTrib: 0, // Otros tributos
                        FchServDesde: invoice.concepto === CONCEPTOS.SERVICIOS ? fechaEmision : null,
                        FchServHasta: invoice.concepto === CONCEPTOS.SERVICIOS ? fechaVencimiento : null,
                        FchVtoPago: fechaVencimiento,
                        MonId: invoice.moneda || TIPOS_MONEDA.PES,
                        MonCotiz: invoice.cotizacion || 1,
                        Iva: ivaArray.length > 0 ? { AlicIva: ivaArray } : null
                    }
                }
            }
        };

        return request;
    }

    /**
     * Construir array de IVA para AFIP
     */
    buildIVAArray(invoice) {
        const ivaArray = [];

        // Agrupar IVA por alícuota
        const ivaMap = {};

        invoice.impuestos.forEach(imp => {
            if (imp.concepto_nombre && imp.concepto_nombre.includes('IVA')) {
                // Extraer porcentaje del nombre (ej: "IVA (21%)")
                const match = imp.concepto_nombre.match(/\((\d+(?:\.\d+)?)\%\)/);
                if (match) {
                    const percentage = parseFloat(match[1]);
                    const alicuotaId = getAlicuotaIVACode(percentage);

                    if (!ivaMap[alicuotaId]) {
                        ivaMap[alicuotaId] = 0;
                    }
                    ivaMap[alicuotaId] += parseFloat(imp.monto);
                }
            }
        });

        // Convertir a formato AFIP
        Object.keys(ivaMap).forEach(alicuotaId => {
            const importe = ivaMap[alicuotaId];
            const baseImponible = invoice.subtotal; // Simplificado

            ivaArray.push({
                Id: parseInt(alicuotaId),
                BaseImp: parseFloat(baseImponible).toFixed(2),
                Importe: parseFloat(importe).toFixed(2)
            });
        });

        return ivaArray;
    }

    /**
     * Calcular total de IVA
     */
    calculateTotalIVA(invoice) {
        let totalIVA = 0;

        invoice.impuestos.forEach(imp => {
            if (imp.concepto_nombre && imp.concepto_nombre.includes('IVA')) {
                totalIVA += parseFloat(imp.monto);
            }
        });

        return totalIVA;
    }

    /**
     * Llamar a WSFEv1 FECAESolicitar vía SOAP
     */
    async callWSFEFECAESolicitar(endpoint, request) {
        try {
            const client = await soap.createClientAsync(endpoint);

            const [result] = await client.FECAESolicitarAsync(request);

            return result;

        } catch (error) {
            console.error('❌ [WSFEv1] Error en FECAESolicitar:', error.message);
            throw new Error(`Error en WSFEv1 FECAESolicitar: ${error.message}`);
        }
    }

    /**
     * Parsear respuesta de AFIP y extraer CAE
     */
    parseCAEResponse(response) {
        try {
            const feDetResp = response.FECAESolicitarResult.FeDetResp.FECAEDetResponse;

            // Verificar resultado
            const resultado = feDetResp.Resultado;

            if (resultado === RESULTADOS_AFIP.RECHAZADO) {
                const errores = feDetResp.Observaciones?.Obs || [];
                const errorMsgs = errores.map(e => `[${e.Code}] ${e.Msg}`).join(', ');
                throw new Error(`AFIP rechazó la solicitud: ${errorMsgs}`);
            }

            // Extraer CAE
            const cae = feDetResp.CAE;
            const caeVencimiento = feDetResp.CAEFchVto;

            if (!cae) {
                throw new Error('AFIP no retornó CAE');
            }

            // Observaciones (warnings)
            const observaciones = feDetResp.Observaciones?.Obs || [];
            const obsTexto = observaciones.map(o => `[${o.Code}] ${o.Msg}`).join(', ');

            return {
                cae,
                caeVencimiento: moment(caeVencimiento, 'YYYYMMDD').format('YYYY-MM-DD'),
                resultado,
                observaciones: obsTexto,
                fechaProceso: feDetResp.CbteFch,
                estado: resultado === RESULTADOS_AFIP.APROBADO ? ESTADOS_CAE.APROBADO : ESTADOS_CAE.RECHAZADO
            };

        } catch (error) {
            console.error('❌ [AFIP] Error parseando respuesta CAE:', error.message);
            throw new Error(`Error al parsear respuesta de AFIP: ${error.message}`);
        }
    }

    /**
     * Guardar CAE en log
     */
    async saveCAELog(companyId, invoiceId, puntoVenta, tipoComprobante, numeroComprobante, caeData, request, response) {
        await sequelize.query(
            `INSERT INTO afip_cae_log (
                company_id,
                factura_id,
                punto_venta,
                tipo_comprobante,
                numero_comprobante,
                cae,
                cae_vencimiento,
                request_xml,
                response_xml,
                resultado,
                fecha_proceso,
                observaciones,
                created_at
            ) VALUES (
                :companyId,
                :invoiceId,
                :puntoVenta,
                :tipoComprobante,
                :numeroComprobante,
                :cae,
                :caeVencimiento,
                :requestXML,
                :responseXML,
                :resultado,
                :fechaProceso,
                :observaciones,
                CURRENT_TIMESTAMP
            )`,
            {
                replacements: {
                    companyId,
                    invoiceId,
                    puntoVenta,
                    tipoComprobante,
                    numeroComprobante,
                    cae: caeData.cae,
                    caeVencimiento: caeData.caeVencimiento,
                    requestXML: JSON.stringify(request, null, 2),
                    responseXML: JSON.stringify(response, null, 2),
                    resultado: caeData.resultado,
                    fechaProceso: caeData.fechaProceso,
                    observaciones: caeData.observaciones
                },
                type: Sequelize.QueryTypes.INSERT
            }
        );
    }

    /**
     * Actualizar factura con CAE
     */
    async updateInvoiceWithCAE(invoiceId, numeroComprobante, caeData) {
        await sequelize.query(
            `UPDATE siac_facturas
             SET cae = :cae,
                 cae_vencimiento = :caeVencimiento,
                 numero_comprobante = :numeroComprobante,
                 estado_afip = :estadoAfip,
                 observaciones_afip = :observaciones,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :invoiceId`,
            {
                replacements: {
                    invoiceId,
                    cae: caeData.cae,
                    caeVencimiento: caeData.caeVencimiento,
                    numeroComprobante,
                    estadoAfip: caeData.estado,
                    observaciones: caeData.observaciones
                },
                type: Sequelize.QueryTypes.UPDATE
            }
        );
    }

    /**
     * Log de error de CAE
     */
    async logCAEError(companyId, invoiceId, error) {
        try {
            await sequelize.query(
                `INSERT INTO afip_cae_log (
                    company_id,
                    factura_id,
                    resultado,
                    errores,
                    created_at
                ) VALUES (
                    :companyId,
                    :invoiceId,
                    'R',
                    :errores,
                    CURRENT_TIMESTAMP
                )`,
                {
                    replacements: {
                        companyId,
                        invoiceId,
                        errores: error.message
                    },
                    type: Sequelize.QueryTypes.INSERT
                }
            );
        } catch (logError) {
            console.error('❌ [AFIP] Error al guardar log de error:', logError.message);
        }
    }

    /**
     * Consultar estado de CAE en AFIP (FECAEConsultar)
     */
    async consultarCAE(companyId, puntoVenta, tipoComprobante, numeroComprobante) {
        console.log(`🔍 [AFIP] Consultando CAE: PV ${puntoVenta}, Tipo ${tipoComprobante}, Nro ${numeroComprobante}`);

        try {
            // 1. Obtener configuración fiscal
            const fiscalConfig = await this.getCompanyFiscalConfig(companyId);

            // 2. Obtener Token de Acceso
            const { token, sign } = await AfipAuthService.getAccessTicket(companyId, 'wsfe');

            // 3. Construir request
            const request = {
                Auth: {
                    Token: token,
                    Sign: sign,
                    Cuit: fiscalConfig.cuit.replace(/-/g, '')
                },
                FeCAEAConsultarReq: {
                    PtoVta: puntoVenta,
                    CbteTipo: tipoComprobante,
                    CbteNro: numeroComprobante
                }
            };

            // 4. Llamar a WSFEv1
            const endpoint = fiscalConfig.afip_environment === 'PRODUCTION'
                ? ENDPOINTS.WSFE.PRODUCTION
                : ENDPOINTS.WSFE.TESTING;

            const client = await soap.createClientAsync(endpoint);
            const [result] = await client.FECAEConsultarAsync(request);

            return result;

        } catch (error) {
            console.error('❌ [AFIP] Error al consultar CAE:', error.message);
            throw error;
        }
    }
}

module.exports = new AfipBillingService();
