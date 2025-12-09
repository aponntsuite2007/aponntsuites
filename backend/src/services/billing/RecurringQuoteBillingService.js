/**
 * ============================================================================
 * RECURRING QUOTE BILLING SERVICE - FACTURACIÓN DESDE PRESUPUESTOS RECURRENTES
 * ============================================================================
 *
 * Servicio para facturación periódica desde presupuestos RECURRENTES.
 * Funciona tanto para Aponnt como para empresas.
 *
 * MODO DE FACTURACIÓN: RECURRENTE
 * FRECUENCIA: MONTHLY | QUARTERLY | YEARLY
 * FUENTE: siac_presupuestos (tipo_facturacion = 'RECURRENTE', estado = 'ACTIVO')
 * DESTINO: siac_facturas
 *
 * DIFERENCIA CON ContractBillingService:
 * - ContractBillingService: Solo Aponnt, desde contracts
 * - RecurringQuoteBillingService: Aponnt + Empresas, desde siac_presupuestos
 *
 * FLUJO:
 * 1. Buscar presupuestos RECURRENTES ACTIVOS listos para facturar
 * 2. Generar factura desde items del presupuesto
 * 3. Registrar factura en tracking (facturas_generadas)
 * 4. Avanzar proximo_periodo_facturacion
 * 5. Si llegó a fecha_fin_facturacion, marcar como FINALIZADO
 *
 * Created: 2025-01-20
 */

const { Sequelize } = require('sequelize');
const Presupuesto = require('../../models/siac/Presupuesto');

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

class RecurringQuoteBillingService {
    /**
     * Generar factura desde presupuesto recurrente
     *
     * @param {number} presupuestoId - ID del presupuesto
     * @returns {Object} Factura generada
     */
    async generateInvoiceFromRecurringQuote(presupuestoId) {
        console.log(`\n🔄 [RECURRING BILLING] Generando factura desde presupuesto ${presupuestoId}...`);

        // 1. Obtener presupuesto RECURRENTE ACTIVO
        const presupuesto = await this.getRecurringQuote(presupuestoId);

        // 2. Verificar que esté listo para facturar
        if (!this.isReadyToBill(presupuesto)) {
            throw new Error(`Presupuesto ${presupuestoId} no está listo para facturar`);
        }

        // 3. Determinar período actual
        const billingPeriod = this.getCurrentPeriod(presupuesto);

        // 4. Generar factura
        const invoice = await this.createInvoiceFromQuote(presupuesto, billingPeriod);

        // 5. Registrar factura en presupuesto
        await this.registerGeneratedInvoice(presupuesto, invoice, billingPeriod);

        // 6. Avanzar al próximo período
        await this.advanceToNextPeriod(presupuesto);

        // 7. Verificar si llegó a fin de facturación
        await this.checkIfFinalized(presupuesto);

        console.log(`✅ [RECURRING BILLING] Factura ${invoice.numero_completo} generada exitosamente`);

        return invoice;
    }

    /**
     * Obtener presupuesto recurrente activo
     */
    async getRecurringQuote(presupuestoId) {
        const presupuesto = await Presupuesto.findOne({
            where: {
                id: presupuestoId,
                tipoFacturacion: 'RECURRENTE',
                estado: 'ACTIVO'
            }
        });

        if (!presupuesto) {
            throw new Error(`Presupuesto ${presupuestoId} no encontrado o no es RECURRENTE ACTIVO`);
        }

        return presupuesto;
    }

    /**
     * Verificar si presupuesto está listo para facturar
     */
    isReadyToBill(presupuesto) {
        if (!presupuesto.proximoPeriodoFacturacion) {
            return false;
        }

        const today = new Date();
        const nextPeriod = new Date(presupuesto.proximoPeriodoFacturacion);

        return nextPeriod <= today;
    }

    /**
     * Obtener período actual de facturación
     */
    getCurrentPeriod(presupuesto) {
        const date = presupuesto.proximoPeriodoFacturacion
            ? new Date(presupuesto.proximoPeriodoFacturacion)
            : new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');

        switch (presupuesto.frecuenciaFacturacion) {
            case 'MONTHLY':
                return `${year}-${month}`;
            case 'QUARTERLY':
                const quarter = Math.ceil((date.getMonth() + 1) / 3);
                return `${year}-Q${quarter}`;
            case 'YEARLY':
                return `${year}`;
            default:
                return `${year}-${month}`;
        }
    }

    /**
     * Crear factura desde presupuesto
     */
    async createInvoiceFromQuote(presupuesto, billingPeriod) {
        const companyId = presupuesto.companyId;

        // Obtener próximo número de factura
        const nextNumber = await this.getNextInvoiceNumber(companyId);

        // Crear factura
        const [invoice] = await sequelize.query(
            `INSERT INTO siac_facturas (
                company_id,
                tipo_comprobante_id,
                numero_completo,
                numero,
                fecha_factura,
                cliente_id,
                cliente_razon_social,
                cliente_documento_tipo,
                cliente_documento_numero,
                cliente_direccion,
                cliente_telefono,
                cliente_email,
                cliente_condicion_iva,
                subtotal,
                descuento_porcentaje,
                descuento_importe,
                total_impuestos,
                total_neto,
                total_factura,
                estado,
                observaciones,
                presupuesto_id,
                configuracion_adicional,
                created_by,
                caja_id
            ) VALUES (
                :companyId,
                1,
                :numeroCompleto,
                :numero,
                CURRENT_DATE,
                :clienteId,
                :clienteRazonSocial,
                :clienteDocumentoTipo,
                :clienteDocumentoNumero,
                :clienteDireccion,
                :clienteTelefono,
                :clienteEmail,
                :clienteCondicionIva,
                :subtotal,
                :descuentoPorcentaje,
                :descuentoImporte,
                :totalImpuestos,
                :totalNeto,
                :totalFactura,
                'PENDIENTE',
                :observaciones,
                :presupuestoId,
                :configuracionAdicional,
                1,
                1
            ) RETURNING *`,
            {
                replacements: {
                    companyId,
                    numeroCompleto: `A-001-${String(nextNumber).padStart(8, '0')}`,
                    numero: nextNumber,
                    clienteId: presupuesto.clienteId,
                    clienteRazonSocial: presupuesto.clienteRazonSocial,
                    clienteDocumentoTipo: presupuesto.clienteDocumentoTipo,
                    clienteDocumentoNumero: presupuesto.clienteDocumentoNumero,
                    clienteDireccion: presupuesto.clienteDireccion,
                    clienteTelefono: presupuesto.clienteTelefono,
                    clienteEmail: presupuesto.clienteEmail,
                    clienteCondicionIva: presupuesto.clienteCondicionIva,
                    subtotal: presupuesto.subtotal,
                    descuentoPorcentaje: presupuesto.descuentoPorcentaje,
                    descuentoImporte: presupuesto.descuentoImporte,
                    totalImpuestos: presupuesto.totalImpuestos,
                    totalNeto: presupuesto.totalNeto,
                    totalFactura: presupuesto.totalPresupuesto,
                    observaciones: `Factura periódica ${presupuesto.frecuenciaFacturacion} - Período ${billingPeriod} - Presupuesto ${presupuesto.numeroPresupuesto}`,
                    presupuestoId: presupuesto.id,
                    configuracionAdicional: JSON.stringify({
                        presupuesto_id: presupuesto.id,
                        billing_period: billingPeriod,
                        frecuencia: presupuesto.frecuenciaFacturacion,
                        source: 'RECURRING_QUOTE_BILLING_SERVICE'
                    })
                },
                type: Sequelize.QueryTypes.INSERT
            }
        );

        const facturaId = invoice[0].id;

        // Insertar items desde presupuesto
        if (presupuesto.items && Array.isArray(presupuesto.items)) {
            let numeroItem = 1;
            for (const item of presupuesto.items) {
                const cantidad = parseFloat(item.cantidad || 1);
                const precioUnitario = parseFloat(item.precioUnitario || item.precio_unitario || 0);
                const subtotal = cantidad * precioUnitario;

                await sequelize.query(
                    `INSERT INTO siac_facturas_items (
                        factura_id, numero_item, producto_id, producto_codigo,
                        producto_descripcion, cantidad, precio_unitario,
                        subtotal, subtotal_con_descuento, total_item
                    ) VALUES (
                        :facturaId, :numeroItem, :productoId, :productoCodigo,
                        :productoDescripcion, :cantidad, :precioUnitario,
                        :subtotal, :subtotal, :subtotal
                    )`,
                    {
                        replacements: {
                            facturaId,
                            numeroItem: numeroItem++,
                            productoId: item.producto_id || null,
                            productoCodigo: item.codigo_producto || item.codigo || 'SERV-001',
                            productoDescripcion: item.descripcion || item.nombre_producto || item.nombre || 'Servicio',
                            cantidad: cantidad,
                            precioUnitario: precioUnitario,
                            subtotal: subtotal.toFixed(2)
                        },
                        type: Sequelize.QueryTypes.INSERT
                    }
                );
            }
        }

        return invoice[0];
    }

    /**
     * Obtener próximo número de factura
     */
    async getNextInvoiceNumber(companyId) {
        const result = await sequelize.query(
            `SELECT COALESCE(MAX(numero), 0) + 1 as next_number
             FROM siac_facturas
             WHERE company_id = :companyId`,
            {
                replacements: { companyId },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        return result[0].next_number;
    }

    /**
     * Registrar factura generada en el presupuesto
     */
    async registerGeneratedInvoice(presupuesto, invoice, billingPeriod) {
        await presupuesto.registerGeneratedInvoice(
            invoice.id,
            invoice.numero_completo,
            billingPeriod
        );
    }

    /**
     * Avanzar al próximo período de facturación
     */
    async advanceToNextPeriod(presupuesto) {
        const nextPeriod = presupuesto.calculateNextPeriod();

        await sequelize.query(
            `UPDATE siac_presupuestos
             SET proximo_periodo_facturacion = :nextPeriod,
                 cantidad_facturas_generadas = cantidad_facturas_generadas + 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :presupuestoId`,
            {
                replacements: {
                    nextPeriod,
                    presupuestoId: presupuesto.id
                },
                type: Sequelize.QueryTypes.UPDATE
            }
        );
    }

    /**
     * Verificar si llegó a fecha de finalización
     */
    async checkIfFinalized(presupuesto) {
        if (!presupuesto.fechaFinFacturacion) {
            return; // Sin fecha fin = indefinido
        }

        const today = new Date();
        const endDate = new Date(presupuesto.fechaFinFacturacion);

        if (today >= endDate) {
            await sequelize.query(
                `UPDATE siac_presupuestos
                 SET estado = 'FINALIZADO',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = :presupuestoId`,
                {
                    replacements: { presupuestoId: presupuesto.id },
                    type: Sequelize.QueryTypes.UPDATE
                }
            );

            console.log(`🏁 [RECURRING BILLING] Presupuesto ${presupuesto.id} FINALIZADO (llegó a fecha fin)`);
        }
    }

    /**
     * Procesar facturación de todos los presupuestos recurrentes listos
     * (Para ejecutar desde cron job)
     */
    async processRecurringBilling() {
        console.log(`\n🔄 [RECURRING BILLING] Procesando facturación recurrente...`);

        // Obtener presupuestos listos para facturar
        const readyQuotes = await Presupuesto.getReadyToBill();

        console.log(`   📋 Encontrados ${readyQuotes.length} presupuestos listos para facturar`);

        const results = {
            success: [],
            failed: []
        };

        for (const quote of readyQuotes) {
            try {
                const invoice = await this.generateInvoiceFromRecurringQuote(quote.id);
                results.success.push({
                    presupuesto_id: quote.id,
                    invoice_id: invoice.id,
                    invoice_number: invoice.numero_completo
                });
            } catch (error) {
                console.error(`❌ Error facturando presupuesto ${quote.id}:`, error.message);
                results.failed.push({
                    presupuesto_id: quote.id,
                    error: error.message
                });
            }
        }

        console.log(`\n✅ [RECURRING BILLING] Facturación completada:`);
        console.log(`   ✅ Exitosas: ${results.success.length}`);
        console.log(`   ❌ Fallidas: ${results.failed.length}`);

        return results;
    }
}

module.exports = new RecurringQuoteBillingService();
