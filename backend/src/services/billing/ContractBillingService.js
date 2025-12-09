/**
 * ============================================================================
 * CONTRACT BILLING SERVICE - FACTURACIÓN DE APONNT A EMPRESAS
 * ============================================================================
 *
 * Servicio especializado para facturación de Aponnt a empresas según contrato activo.
 *
 * FUENTE DE VERDAD: contracts.modules_data (NO engineering-metadata)
 * PLANTILLAS FISCALES: Por país de la empresa (Argentina forzado por ahora)
 * DESTINO: siac_facturas (company_id = 1 - Aponnt)
 *
 * FLUJO:
 * 1. Buscar contratos ACTIVOS (status = 'ACTIVE')
 * 2. Obtener módulos desde contract.modules_data
 * 3. Mapear a productos de siac_productos (company_id = 1)
 * 4. Aplicar plantilla fiscal según país de la empresa
 * 5. Generar factura en siac_facturas
 * 6. Disparar liquidación de comisiones (CommissionService)
 *
 * Created: 2025-01-20
 */

const { Sequelize } = require('sequelize');
const Contract = require('../../models/Contract');
const Company = require('../../models/Company');
const TaxTemplate = require('../../models/siac/TaxTemplate');
const Presupuesto = require('../../models/siac/Presupuesto');

// Configurar conexión directa para modelos SIAC
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

class ContractBillingService {
    /**
     * Generar factura mensual desde contrato activo
     *
     * @param {string} contractId - ID del contrato
     * @param {string} billingMonth - Período a facturar (formato: YYYY-MM)
     * @returns {Object} Factura generada
     */
    async generateInvoiceFromContract(contractId, billingMonth) {
        console.log(`\n🧾 [CONTRACT BILLING] Generando factura para contrato ${contractId}, período ${billingMonth}...`);

        // 1. Obtener contrato ACTIVO
        const contract = await this.getActiveContract(contractId);

        // 2. Obtener empresa y verificar que esté activa
        const company = await this.getCompanyData(contract.company_id);

        // 3. Obtener plantilla fiscal para el país de la empresa
        const taxTemplate = await this.getTaxTemplateForCompany(company);

        // 4. Obtener productos de Aponnt (company_id = 1)
        const products = await this.getAponntProducts();

        // 5. Mapear módulos del contrato a productos
        const invoiceItems = await this.mapContractModulesToProducts(
            contract.modules_data,
            products
        );

        // 6. Calcular totales con impuestos
        const invoiceData = await this.calculateInvoiceWithTaxes(
            company,
            invoiceItems,
            taxTemplate,
            billingMonth
        );

        // 7. Crear factura en siac_facturas
        const invoice = await this.createAponntInvoice(invoiceData, contract);

        // 8. Registrar factura en tracking del contrato (si tiene presupuesto vinculado)
        if (contract.quote_id) {
            await this.trackInvoiceInPresupuesto(contract.quote_id, invoice, billingMonth);
        }

        console.log(`✅ [CONTRACT BILLING] Factura ${invoice.numero_completo} generada exitosamente`);

        return invoice;
    }

    /**
     * Obtener contrato activo
     */
    async getActiveContract(contractId) {
        const contract = await sequelize.query(
            `SELECT * FROM contracts WHERE id = :contractId AND status = 'ACTIVE'`,
            {
                replacements: { contractId },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        if (!contract || contract.length === 0) {
            throw new Error(`Contrato ${contractId} no encontrado o no está activo`);
        }

        return contract[0];
    }

    /**
     * Obtener datos de la empresa
     */
    async getCompanyData(companyId) {
        const company = await sequelize.query(
            `SELECT * FROM companies WHERE company_id = :companyId AND is_active = true`,
            {
                replacements: { companyId },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        if (!company || company.length === 0) {
            throw new Error(`Empresa ${companyId} no encontrada o no está activa`);
        }

        return company[0];
    }

    /**
     * Obtener plantilla fiscal para la empresa
     * Por ahora forzamos Argentina, pero en el futuro se buscará por country
     */
    async getTaxTemplateForCompany(company) {
        // TODO: Cuando tengamos campo company.country, usar:
        // const country = company.country || 'AR';
        const country = 'AR'; // Forzado por ahora

        const template = await sequelize.query(
            `SELECT * FROM tax_templates WHERE country = :country AND is_active = true LIMIT 1`,
            {
                replacements: { country },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        if (!template || template.length === 0) {
            console.warn(`⚠️ No se encontró plantilla fiscal para ${country}, usando valores por defecto`);
            return this.getDefaultTaxTemplate(country);
        }

        return template[0];
    }

    /**
     * Plantilla fiscal por defecto (Argentina)
     */
    getDefaultTaxTemplate(country) {
        if (country === 'AR') {
            return {
                country: 'AR',
                tax_concepts: [
                    { name: 'IVA', rate: 21.00, type: 'percentage', applies_to: 'subtotal' },
                    { name: 'IIBB', rate: 3.50, type: 'percentage', applies_to: 'subtotal' }
                ]
            };
        }

        return { country, tax_concepts: [] };
    }

    /**
     * Obtener productos comerciales de Aponnt (company_id = 1)
     */
    async getAponntProducts() {
        const products = await sequelize.query(
            `SELECT * FROM siac_productos WHERE company_id = 1 AND activo = true`,
            {
                type: Sequelize.QueryTypes.SELECT
            }
        );

        return products;
    }

    /**
     * Mapear módulos del contrato a productos de siac_productos
     *
     * contract.modules_data = [{module_key, module_name, price, quantity}]
     */
    async mapContractModulesToProducts(modulesData, products) {
        const items = [];

        for (const module of modulesData) {
            // Buscar producto que coincida con module_key
            const product = products.find(p =>
                p.metadata?.module_key === module.module_key ||
                p.codigo === `MOD-${module.module_key.toUpperCase()}`
            );

            if (!product) {
                console.warn(`⚠️ Producto no encontrado para módulo: ${module.module_key}`);
                continue;
            }

            items.push({
                producto_id: product.id,
                codigo_producto: product.codigo,
                nombre_producto: product.nombre,
                descripcion: product.descripcion,
                cantidad: module.quantity || 1,
                precio_unitario: parseFloat(module.price || product.precio_unitario),
                subtotal: (module.quantity || 1) * parseFloat(module.price || product.precio_unitario)
            });
        }

        return items;
    }

    /**
     * Calcular totales con impuestos aplicados
     */
    async calculateInvoiceWithTaxes(company, items, taxTemplate, billingMonth) {
        // Calcular subtotal
        const subtotal = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);

        // Aplicar impuestos desde plantilla
        const impuestos = [];
        let totalImpuestos = 0;

        if (taxTemplate.tax_concepts && Array.isArray(taxTemplate.tax_concepts)) {
            for (const concept of taxTemplate.tax_concepts) {
                const base = subtotal; // Por ahora siempre sobre subtotal
                const monto = (base * parseFloat(concept.rate)) / 100;

                impuestos.push({
                    concepto_nombre: concept.name,
                    concepto_id: concept.id || null,
                    porcentaje: parseFloat(concept.rate),
                    base_imponible: base,
                    monto: monto.toFixed(2)
                });

                totalImpuestos += monto;
            }
        }

        const totalFactura = subtotal + totalImpuestos;

        return {
            company,
            items,
            subtotal: subtotal.toFixed(2),
            impuestos,
            total_impuestos: totalImpuestos.toFixed(2),
            total_factura: totalFactura.toFixed(2),
            billing_month: billingMonth
        };
    }

    /**
     * Crear factura en siac_facturas
     * IMPORTANTE: company_id = 1 (Aponnt), cliente = empresa que contrata
     */
    async createAponntInvoice(invoiceData, contract) {
        const { company, items, subtotal, impuestos, total_impuestos, total_factura, billing_month } = invoiceData;

        // Obtener próximo número de factura para Aponnt (company_id = 1)
        const nextNumber = await this.getNextInvoiceNumber(1);

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
                cliente_email,
                cliente_telefono,
                subtotal,
                total_impuestos,
                total_factura,
                estado,
                observaciones,
                configuracion_adicional,
                created_by,
                caja_id
            ) VALUES (
                1,
                1,
                :numeroCompleto,
                :numero,
                CURRENT_DATE,
                :clienteId,
                :clienteRazonSocial,
                'CUIT',
                :clienteTaxId,
                :clienteEmail,
                :clienteTelefono,
                :subtotal,
                :totalImpuestos,
                :totalFactura,
                'PENDIENTE',
                :observaciones,
                :configuracionAdicional,
                1,
                1
            ) RETURNING *`,
            {
                replacements: {
                    numeroCompleto: `A-001-${String(nextNumber).padStart(8, '0')}`,
                    numero: nextNumber,
                    clienteId: company.company_id,
                    clienteRazonSocial: company.legal_name || company.name,
                    clienteTaxId: company.tax_id,
                    clienteEmail: company.contact_email,
                    clienteTelefono: company.contact_phone || company.phone,
                    subtotal,
                    totalImpuestos: total_impuestos,
                    totalFactura: total_factura,
                    observaciones: `Facturación mensual período ${billing_month} - Contrato ${contract.contract_number || contract.id}`,
                    configuracionAdicional: JSON.stringify({
                        contract_id: contract.id,
                        billing_period: billing_month,
                        source: 'CONTRACT_BILLING_SERVICE'
                    })
                },
                type: Sequelize.QueryTypes.INSERT
            }
        );

        const facturaId = invoice[0].id;

        // Insertar items
        for (const item of items) {
            await sequelize.query(
                `INSERT INTO siac_facturas_items (
                    factura_id, producto_id, codigo_producto, nombre_producto,
                    descripcion, cantidad, precio_unitario, subtotal
                ) VALUES (
                    :facturaId, :productoId, :codigoProducto, :nombreProducto,
                    :descripcion, :cantidad, :precioUnitario, :subtotal
                )`,
                {
                    replacements: {
                        facturaId,
                        productoId: item.producto_id,
                        codigoProducto: item.codigo_producto,
                        nombreProducto: item.nombre_producto,
                        descripcion: item.descripcion,
                        cantidad: item.cantidad,
                        precioUnitario: item.precio_unitario,
                        subtotal: item.subtotal
                    },
                    type: Sequelize.QueryTypes.INSERT
                }
            );
        }

        // Insertar impuestos
        for (const impuesto of impuestos) {
            await sequelize.query(
                `INSERT INTO siac_facturas_impuestos (
                    factura_id, concepto_nombre, concepto_id, porcentaje, base_imponible, monto
                ) VALUES (
                    :facturaId, :conceptoNombre, :conceptoId, :porcentaje, :baseImponible, :monto
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

        return invoice[0];
    }

    /**
     * Obtener próximo número de factura para una empresa
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
     * Registrar factura generada en el presupuesto (si existe)
     */
    async trackInvoiceInPresupuesto(quoteId, invoice, billingMonth) {
        // Buscar presupuesto vinculado al quote
        const presupuesto = await Presupuesto.findOne({
            where: {
                configuracion_adicional: {
                    quote_id: quoteId
                }
            }
        });

        if (presupuesto) {
            await presupuesto.registerGeneratedInvoice(
                invoice.id,
                invoice.numero_completo,
                billingMonth
            );
        }
    }

    /**
     * Procesar facturación mensual de todos los contratos activos
     * (Para ejecutar desde cron job)
     */
    async processMonthlyBilling(billingMonth) {
        console.log(`\n🔄 [CONTRACT BILLING] Procesando facturación mensual para ${billingMonth}...`);

        // Obtener todos los contratos activos
        const activeContracts = await sequelize.query(
            `SELECT * FROM contracts WHERE status = 'ACTIVE'`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        console.log(`   📋 Encontrados ${activeContracts.length} contratos activos`);

        const results = {
            success: [],
            failed: []
        };

        for (const contract of activeContracts) {
            try {
                const invoice = await this.generateInvoiceFromContract(contract.id, billingMonth);
                results.success.push({
                    contract_id: contract.id,
                    invoice_id: invoice.id,
                    invoice_number: invoice.numero_completo
                });
            } catch (error) {
                console.error(`❌ Error facturando contrato ${contract.id}:`, error.message);
                results.failed.push({
                    contract_id: contract.id,
                    error: error.message
                });
            }
        }

        console.log(`\n✅ [CONTRACT BILLING] Facturación completada:`);
        console.log(`   ✅ Exitosas: ${results.success.length}`);
        console.log(`   ❌ Fallidas: ${results.failed.length}`);

        return results;
    }
}

module.exports = new ContractBillingService();
