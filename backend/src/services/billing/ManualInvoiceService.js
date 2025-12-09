/**
 * ============================================================================
 * MANUAL INVOICE SERVICE - FACTURACIÓN MANUAL DIRECTA
 * ============================================================================
 *
 * Servicio para facturación manual directa SIN presupuesto previo.
 * Para ventas ad-hoc, servicios puntuales, correcciones, etc.
 *
 * MODO DE FACTURACIÓN: MANUAL (sin presupuesto)
 * FUENTE: Datos proporcionados directamente por el usuario
 * DESTINO: siac_facturas (presupuesto_id = NULL)
 *
 * CASOS DE USO:
 * - Venta puntual sin cotización previa
 * - Corrección/Ajuste de facturación
 * - Servicios extraordinarios
 * - Cargos adicionales no contemplados en presupuesto
 *
 * DIFERENCIAS:
 * - ContractBillingService: Desde contracts (solo Aponnt)
 * - RecurringQuoteBillingService: Desde presupuestos RECURRENTES
 * - ManualInvoiceService: Sin presupuesto, datos manuales
 *
 * Created: 2025-01-20
 */

const { Sequelize } = require('sequelize');

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

class ManualInvoiceService {
    /**
     * Crear factura manual directa (sin presupuesto)
     *
     * @param {number} companyId - ID de la empresa que factura
     * @param {Object} invoiceData - Datos de la factura
     * @returns {Object} Factura creada
     */
    async createManualInvoice(companyId, invoiceData) {
        console.log(`\n📝 [MANUAL INVOICE] Creando factura manual para company ${companyId}...`);

        // 1. Validar datos requeridos
        this.validateInvoiceData(invoiceData);

        // 2. Calcular totales
        const calculatedData = this.calculateTotals(invoiceData);

        // 3. Crear factura
        const invoice = await this.createInvoice(companyId, calculatedData);

        // 4. Insertar items
        await this.insertInvoiceItems(invoice.id, calculatedData.items);

        // 5. Insertar impuestos (si existen)
        if (calculatedData.impuestos && calculatedData.impuestos.length > 0) {
            await this.insertTaxes(invoice.id, calculatedData.impuestos);
        }

        console.log(`✅ [MANUAL INVOICE] Factura ${invoice.numero_completo} creada exitosamente`);

        return invoice;
    }

    /**
     * Validar datos mínimos requeridos
     */
    validateInvoiceData(invoiceData) {
        const required = ['cliente', 'items'];

        for (const field of required) {
            if (!invoiceData[field]) {
                throw new Error(`Campo requerido faltante: ${field}`);
            }
        }

        if (!invoiceData.items || invoiceData.items.length === 0) {
            throw new Error('La factura debe tener al menos 1 item');
        }

        if (!invoiceData.cliente.razon_social) {
            throw new Error('Se requiere razón social del cliente');
        }
    }

    /**
     * Calcular totales de la factura
     */
    calculateTotals(invoiceData) {
        const { items, descuento_porcentaje = 0, impuestos = [] } = invoiceData;

        // Calcular subtotal de items
        let subtotal = 0;
        const calculatedItems = items.map(item => {
            const cantidad = parseFloat(item.cantidad || 1);
            const precioUnitario = parseFloat(item.precio_unitario);
            const itemSubtotal = cantidad * precioUnitario;

            subtotal += itemSubtotal;

            return {
                ...item,
                cantidad,
                precio_unitario: precioUnitario,
                subtotal: itemSubtotal.toFixed(2)
            };
        });

        // Aplicar descuento
        const descuentoPorcentaje = parseFloat(descuento_porcentaje);
        const descuentoImporte = (subtotal * descuentoPorcentaje) / 100;
        const subtotalConDescuento = subtotal - descuentoImporte;

        // Calcular impuestos
        let totalImpuestos = 0;
        const calculatedImpuestos = impuestos.map(imp => {
            const base = subtotalConDescuento;
            const monto = (base * parseFloat(imp.porcentaje)) / 100;
            totalImpuestos += monto;

            return {
                concepto_nombre: imp.nombre,
                concepto_id: imp.concepto_id || null,
                porcentaje: parseFloat(imp.porcentaje),
                base_imponible: base.toFixed(2),
                monto: monto.toFixed(2)
            };
        });

        // Total final
        const totalNeto = subtotalConDescuento;
        const totalFactura = subtotalConDescuento + totalImpuestos;

        return {
            ...invoiceData,
            items: calculatedItems,
            impuestos: calculatedImpuestos,
            subtotal: subtotal.toFixed(2),
            descuento_porcentaje: descuentoPorcentaje,
            descuento_importe: descuentoImporte.toFixed(2),
            total_impuestos: totalImpuestos.toFixed(2),
            total_neto: totalNeto.toFixed(2),
            total_factura: totalFactura.toFixed(2)
        };
    }

    /**
     * Crear factura en siac_facturas
     */
    async createInvoice(companyId, invoiceData) {
        const { cliente } = invoiceData;

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
                fecha_vencimiento,
                cliente_id,
                cliente_codigo,
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
                notas_internas,
                presupuesto_id,
                configuracion_adicional,
                created_by,
                caja_id
            ) VALUES (
                :companyId,
                :tipoComprobanteId,
                :numeroCompleto,
                :numero,
                :fechaFactura,
                :fechaVencimiento,
                :clienteId,
                :clienteCodigo,
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
                :estado,
                :observaciones,
                :notasInternas,
                NULL,
                :configuracionAdicional,
                :createdBy,
                :cajaId
            ) RETURNING *`,
            {
                replacements: {
                    companyId,
                    tipoComprobanteId: invoiceData.tipo_comprobante_id || 1,
                    numeroCompleto: `A-001-${String(nextNumber).padStart(8, '0')}`,
                    numero: nextNumber,
                    fechaFactura: invoiceData.fecha_factura || new Date(),
                    fechaVencimiento: invoiceData.fecha_vencimiento || null,
                    clienteId: cliente.id || null,
                    clienteCodigo: cliente.codigo || null,
                    clienteRazonSocial: cliente.razon_social,
                    clienteDocumentoTipo: cliente.documento_tipo || 'CUIT',
                    clienteDocumentoNumero: cliente.documento_numero || '',
                    clienteDireccion: cliente.direccion || '',
                    clienteTelefono: cliente.telefono || '',
                    clienteEmail: cliente.email || '',
                    clienteCondicionIva: cliente.condicion_iva || 'CONSUMIDOR_FINAL',
                    subtotal: invoiceData.subtotal,
                    descuentoPorcentaje: invoiceData.descuento_porcentaje,
                    descuentoImporte: invoiceData.descuento_importe,
                    totalImpuestos: invoiceData.total_impuestos,
                    totalNeto: invoiceData.total_neto,
                    totalFactura: invoiceData.total_factura,
                    estado: invoiceData.estado || 'PENDIENTE',
                    observaciones: invoiceData.observaciones || 'Factura manual directa',
                    notasInternas: invoiceData.notas_internas || null,
                    configuracionAdicional: JSON.stringify({
                        source: 'MANUAL_INVOICE_SERVICE',
                        created_by_user: invoiceData.created_by_user || null,
                        manual: true
                    }),
                    createdBy: invoiceData.created_by || 1,
                    cajaId: invoiceData.caja_id || 1
                },
                type: Sequelize.QueryTypes.INSERT
            }
        );

        return invoice[0];
    }

    /**
     * Insertar items de la factura
     */
    async insertInvoiceItems(facturaId, items) {
        for (const item of items) {
            await sequelize.query(
                `INSERT INTO siac_facturas_items (
                    factura_id,
                    numero_item,
                    producto_id,
                    producto_codigo,
                    producto_descripcion,
                    cantidad,
                    precio_unitario,
                    subtotal,
                    subtotal_con_descuento,
                    total_item
                ) VALUES (
                    :facturaId,
                    :numeroItem,
                    :productoId,
                    :productoCodigo,
                    :productoDescripcion,
                    :cantidad,
                    :precioUnitario,
                    :subtotal,
                    :subtotal,
                    :subtotal
                )`,
                {
                    replacements: {
                        facturaId,
                        numeroItem: item.numero_item || 1,
                        productoId: item.producto_id || null,
                        productoCodigo: item.codigo_producto || item.codigo || 'SERV-001',
                        productoDescripcion: item.nombre_producto || item.nombre || item.descripcion || 'Servicio',
                        cantidad: item.cantidad,
                        precioUnitario: item.precio_unitario,
                        subtotal: item.subtotal
                    },
                    type: Sequelize.QueryTypes.INSERT
                }
            );
        }
    }

    /**
     * Insertar impuestos de la factura
     */
    async insertTaxes(facturaId, impuestos) {
        for (const impuesto of impuestos) {
            await sequelize.query(
                `INSERT INTO siac_facturas_impuestos (
                    factura_id,
                    concepto_nombre,
                    concepto_id,
                    porcentaje,
                    base_imponible,
                    monto
                ) VALUES (
                    :facturaId,
                    :conceptoNombre,
                    :conceptoId,
                    :porcentaje,
                    :baseImponible,
                    :monto
                )`,
                {
                    replacements: {
                        facturaId,
                        conceptoNombre: impuesto.concepto_nombre,
                        conceptoId: impuesto.concepto_id,
                        porcentaje: impuesto.porcentaje,
                        baseImponible: impuesto.base_imponible,
                        monto: impuesto.monto
                    },
                    type: Sequelize.QueryTypes.INSERT
                }
            );
        }
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
     * Actualizar estado de factura
     */
    async updateInvoiceStatus(facturaId, newStatus, notes = null) {
        await sequelize.query(
            `UPDATE siac_facturas
             SET estado = :newStatus,
                 notas_internas = COALESCE(:notes, notas_internas),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :facturaId`,
            {
                replacements: {
                    facturaId,
                    newStatus,
                    notes
                },
                type: Sequelize.QueryTypes.UPDATE
            }
        );

        console.log(`✅ [MANUAL INVOICE] Factura ${facturaId} actualizada a estado: ${newStatus}`);
    }

    /**
     * Anular factura
     */
    async cancelInvoice(facturaId, cancelReason, userId) {
        await sequelize.query(
            `UPDATE siac_facturas
             SET estado = 'ANULADA',
                 motivo_anulacion = :cancelReason,
                 autorizada_por = :userId,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :facturaId`,
            {
                replacements: {
                    facturaId,
                    cancelReason,
                    userId
                },
                type: Sequelize.QueryTypes.UPDATE
            }
        );

        console.log(`🚫 [MANUAL INVOICE] Factura ${facturaId} ANULADA: ${cancelReason}`);
    }
}

module.exports = new ManualInvoiceService();
