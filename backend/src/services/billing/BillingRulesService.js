/**
 * ============================================================================
 * BILLING RULES SERVICE - REGLAS DE FACTURACIÓN (Database-Driven)
 * ============================================================================
 *
 * Servicio para gestionar reglas de negocio de facturación usando
 * plantillas fiscales de la base de datos (tax_templates).
 *
 * FEATURES:
 * - Cálculo de impuestos según país/región (desde tax_templates)
 * - Descuentos automáticos por volumen/antigüedad
 * - Condiciones comerciales especiales
 * - Validaciones de facturación
 * - Soporte multi-país dinámico
 *
 * DATABASE TABLES:
 * - tax_templates: Configuraciones por país
 * - tax_concepts: IVA, IIBB, retenciones, percepciones, etc.
 * - tax_rates: Alícuotas por concepto
 * - tax_conditions: Condiciones fiscales (RI, RM, EX, CF)
 * - company_tax_config: Configuración específica por empresa
 *
 * Created: 2025-01-20
 * Updated: 2025-01-20 - Migrated to database-driven approach
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

class BillingRulesService {
    /**
     * Obtener configuración fiscal de empresa
     * (incluye configuración específica de la empresa + plantilla del país)
     *
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Configuración fiscal completa
     */
    async getCompanyBillingRules(companyId) {
        console.log(`📋 [BILLING RULES] Obteniendo reglas para company ${companyId}...`);

        // 1. Obtener configuración de la empresa
        const [companyConfig] = await sequelize.query(
            `SELECT
                configuracion_adicional->>'pais' as pais,
                configuracion_adicional->>'condicion_iva' as condicion_iva,
                configuracion_adicional->>'moneda' as moneda
             FROM companies
             WHERE company_id = :companyId`,
            {
                replacements: { companyId },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        const countryCode = companyConfig?.pais || 'AR'; // Default Argentina
        const condicionIva = companyConfig?.condicion_iva || 'RESPONSABLE_INSCRIPTO';
        const moneda = companyConfig?.moneda || 'ARS';

        // 2. Obtener plantilla fiscal del país
        const countryRules = await this.getCountryRulesFromDatabase(countryCode);

        // 3. Obtener configuración específica de la empresa (overrides)
        const companyOverrides = await this.getCompanyTaxConfig(companyId);

        // 4. Merge configuraciones
        return {
            companyId,
            pais: countryCode,
            condicionIva,
            moneda,
            ...countryRules,
            overrides: companyOverrides
        };
    }

    /**
     * Obtener reglas fiscales del país desde tax_templates
     *
     * @param {string} countryCode - Código del país (AR, UY, CL, BR, etc.)
     * @returns {Object} Reglas fiscales del país
     */
    async getCountryRulesFromDatabase(countryCode) {
        // Obtener plantilla del país
        const [template] = await sequelize.query(
            `SELECT
                id,
                country_code,
                country_name,
                currency,
                invoice_format,
                requires_cae,
                cae_expiration_days,
                invoice_prefix_format,
                supported_document_types,
                billing_configuration,
                validation_rules,
                is_active
             FROM tax_templates
             WHERE country_code = :countryCode
               AND is_active = true
             LIMIT 1`,
            {
                replacements: { countryCode },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        if (!template) {
            console.warn(`⚠️ [BILLING RULES] No se encontró plantilla para ${countryCode}, usando AR por defecto`);
            return this.getCountryRulesFromDatabase('AR');
        }

        // Obtener conceptos fiscales del país
        const concepts = await sequelize.query(
            `SELECT
                tc.id,
                tc.concept_name,
                tc.concept_code,
                tc.description,
                tr.rate_value,
                tr.is_percentage,
                tr.applies_to,
                tr.valid_from,
                tr.valid_to
             FROM tax_concepts tc
             LEFT JOIN tax_rates tr ON tc.id = tr.concept_id
             WHERE tc.template_id = :templateId
               AND tc.is_active = true
               AND (tr.valid_to IS NULL OR tr.valid_to > CURRENT_DATE)
             ORDER BY tc.concept_code`,
            {
                replacements: { templateId: template.id },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        // Obtener condiciones fiscales (RI, RM, EX, CF, etc.)
        const conditions = await sequelize.query(
            `SELECT
                condition_code,
                condition_name,
                description,
                applies_iva,
                iva_rate_override,
                applies_retentions,
                retention_rules
             FROM tax_conditions
             WHERE template_id = :templateId
               AND is_active = true`,
            {
                replacements: { templateId: template.id },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        // Estructurar respuesta
        return {
            templateId: template.id,
            countryCode: template.country_code,
            countryName: template.country_name,
            currency: template.currency,
            formatoFactura: template.invoice_format,
            requiereCae: template.requires_cae,
            caeExpirationDays: template.cae_expiration_days,
            prefixFormat: template.invoice_prefix_format,
            tiposComprobante: template.supported_document_types || [],
            billingConfiguration: template.billing_configuration || {},
            validationRules: template.validation_rules || {},
            concepts: this.structureConcepts(concepts),
            conditions: this.structureConditions(conditions)
        };
    }

    /**
     * Estructurar conceptos fiscales para fácil acceso
     */
    structureConcepts(concepts) {
        const structured = {
            iva: null,
            percepciones: [],
            retenciones: [],
            otros: []
        };

        for (const concept of concepts) {
            const data = {
                id: concept.id,
                name: concept.concept_name,
                code: concept.concept_code,
                description: concept.description,
                rate: concept.rate_value,
                isPercentage: concept.is_percentage,
                appliesTo: concept.applies_to,
                validFrom: concept.valid_from,
                validTo: concept.valid_to
            };

            if (concept.concept_code.startsWith('IVA')) {
                structured.iva = data;
            } else if (concept.concept_code.includes('PERCEP')) {
                structured.percepciones.push(data);
            } else if (concept.concept_code.includes('RETEN')) {
                structured.retenciones.push(data);
            } else {
                structured.otros.push(data);
            }
        }

        return structured;
    }

    /**
     * Estructurar condiciones fiscales
     */
    structureConditions(conditions) {
        const structured = {};

        for (const cond of conditions) {
            structured[cond.condition_code] = {
                name: cond.condition_name,
                description: cond.description,
                appliesIva: cond.applies_iva,
                ivaRateOverride: cond.iva_rate_override,
                appliesRetentions: cond.applies_retentions,
                retentionRules: cond.retention_rules || {}
            };
        }

        return structured;
    }

    /**
     * Obtener configuración específica de la empresa (overrides)
     *
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Configuración específica
     */
    async getCompanyTaxConfig(companyId) {
        const [config] = await sequelize.query(
            `SELECT
                tax_condition_override,
                custom_rates,
                special_rules,
                exemptions
             FROM company_tax_config
             WHERE company_id = :companyId`,
            {
                replacements: { companyId },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        return config || {};
    }

    /**
     * Calcular impuestos según plantillas fiscales del país
     *
     * @param {number} companyId - ID de la empresa
     * @param {number} subtotal - Subtotal antes de impuestos
     * @param {string} condicionIvaCliente - Condición IVA del cliente (RI, RM, EX, CF)
     * @returns {Array} Impuestos calculados desde plantillas
     */
    async calculateTaxes(companyId, subtotal, condicionIvaCliente = 'CF') {
        console.log(`💰 [BILLING RULES] Calculando impuestos para subtotal ${subtotal}, condición ${condicionIvaCliente}...`);

        // Obtener reglas fiscales de la empresa
        const rules = await this.getCompanyBillingRules(companyId);
        const impuestos = [];

        // Verificar condición fiscal del cliente
        const clientCondition = rules.conditions[condicionIvaCliente] || rules.conditions['CF'];

        // 1. CALCULAR IVA (si aplica según condición)
        if (clientCondition.appliesIva && rules.concepts.iva) {
            const ivaRate = clientCondition.ivaRateOverride || rules.concepts.iva.rate;
            const montoIva = (subtotal * ivaRate) / 100;

            impuestos.push({
                concepto_id: rules.concepts.iva.id,
                concepto_nombre: `${rules.concepts.iva.name} (${ivaRate}%)`,
                concepto_codigo: rules.concepts.iva.code,
                porcentaje: ivaRate,
                base_imponible: subtotal.toFixed(2),
                monto: montoIva.toFixed(2)
            });
        }

        // 2. CALCULAR PERCEPCIONES (IIBB, etc.)
        for (const percepcion of rules.concepts.percepciones) {
            if (this.shouldApplyTax(percepcion, subtotal, condicionIvaCliente)) {
                const monto = (subtotal * percepcion.rate) / 100;

                impuestos.push({
                    concepto_id: percepcion.id,
                    concepto_nombre: `${percepcion.name} (${percepcion.rate}%)`,
                    concepto_codigo: percepcion.code,
                    porcentaje: percepcion.rate,
                    base_imponible: subtotal.toFixed(2),
                    monto: monto.toFixed(2)
                });
            }
        }

        // 3. CALCULAR RETENCIONES (si aplican según condición)
        if (clientCondition.appliesRetentions) {
            for (const retencion of rules.concepts.retenciones) {
                if (this.shouldApplyTax(retencion, subtotal, condicionIvaCliente)) {
                    const monto = (subtotal * retencion.rate) / 100;

                    impuestos.push({
                        concepto_id: retencion.id,
                        concepto_nombre: `${retencion.name} (${retencion.rate}%)`,
                        concepto_codigo: retencion.code,
                        porcentaje: retencion.rate,
                        base_imponible: subtotal.toFixed(2),
                        monto: monto.toFixed(2)
                    });
                }
            }
        }

        // 4. APLICAR OVERRIDES DE EMPRESA (si existen)
        if (rules.overrides.custom_rates) {
            for (const customRate of rules.overrides.custom_rates) {
                if (this.shouldApplyCustomRate(customRate, subtotal)) {
                    const monto = (subtotal * customRate.rate) / 100;

                    impuestos.push({
                        concepto_nombre: customRate.name,
                        porcentaje: customRate.rate,
                        base_imponible: subtotal.toFixed(2),
                        monto: monto.toFixed(2),
                        is_custom: true
                    });
                }
            }
        }

        console.log(`✅ [BILLING RULES] ${impuestos.length} impuestos calculados`);
        return impuestos;
    }

    /**
     * Determinar si un concepto fiscal aplica
     */
    shouldApplyTax(concept, subtotal, condicionIvaCliente) {
        // Verificar applies_to
        if (concept.appliesTo) {
            const appliesTo = concept.appliesTo;

            // Si tiene threshold mínimo
            if (appliesTo.min_amount && subtotal < appliesTo.min_amount) {
                return false;
            }

            // Si tiene condiciones específicas
            if (appliesTo.conditions && !appliesTo.conditions.includes(condicionIvaCliente)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Verificar si aplica un rate custom de empresa
     */
    shouldApplyCustomRate(customRate, subtotal) {
        if (customRate.min_amount && subtotal < customRate.min_amount) {
            return false;
        }

        if (customRate.max_amount && subtotal > customRate.max_amount) {
            return false;
        }

        return true;
    }

    /**
     * Calcular descuentos automáticos según reglas
     *
     * @param {number} companyId - ID de la empresa
     * @param {number} subtotal - Subtotal de la factura
     * @param {number} clienteId - ID del cliente
     * @returns {Object} Descuento calculado
     */
    async calculateAutomaticDiscounts(companyId, subtotal, clienteId = null) {
        let descuentoPorcentaje = 0;
        let motivo = '';

        // Descuento por volumen (ejemplo: >$100,000 = 5%)
        if (subtotal > 100000) {
            descuentoPorcentaje = 5;
            motivo = 'Descuento por volumen (>$100,000)';
        } else if (subtotal > 50000) {
            descuentoPorcentaje = 3;
            motivo = 'Descuento por volumen (>$50,000)';
        }

        // Descuento por antigüedad del cliente (si existe)
        if (clienteId) {
            const [cliente] = await sequelize.query(
                `SELECT
                    EXTRACT(YEAR FROM AGE(CURRENT_DATE, created_at)) as antiguedad
                 FROM siac_clientes
                 WHERE id = :clienteId`,
                {
                    replacements: { clienteId },
                    type: Sequelize.QueryTypes.SELECT
                }
            );

            if (cliente && cliente.antiguedad >= 5) {
                descuentoPorcentaje = Math.max(descuentoPorcentaje, 10);
                motivo = 'Descuento por antigüedad (>5 años)';
            } else if (cliente && cliente.antiguedad >= 2) {
                descuentoPorcentaje = Math.max(descuentoPorcentaje, 5);
                motivo = 'Descuento por antigüedad (>2 años)';
            }
        }

        const descuentoImporte = (subtotal * descuentoPorcentaje) / 100;

        return {
            descuento_porcentaje: descuentoPorcentaje,
            descuento_importe: descuentoImporte.toFixed(2),
            motivo
        };
    }

    /**
     * Validar factura según reglas de negocio
     *
     * @param {Object} invoiceData - Datos de la factura
     * @returns {Object} Resultado de validación
     */
    validateInvoice(invoiceData) {
        const errors = [];
        const warnings = [];

        // Validación: Cliente requerido
        if (!invoiceData.cliente_razon_social) {
            errors.push('Se requiere razón social del cliente');
        }

        // Validación: Al menos 1 item
        if (!invoiceData.items || invoiceData.items.length === 0) {
            errors.push('La factura debe tener al menos 1 item');
        }

        // Validación: Totales coherentes
        const subtotalCalculado = invoiceData.items?.reduce((sum, item) => {
            return sum + (parseFloat(item.cantidad || 1) * parseFloat(item.precio_unitario || 0));
        }, 0) || 0;

        if (Math.abs(subtotalCalculado - parseFloat(invoiceData.subtotal || 0)) > 0.01) {
            errors.push(`Subtotal inconsistente: esperado ${subtotalCalculado.toFixed(2)}, recibido ${invoiceData.subtotal}`);
        }

        // Warning: Facturas muy grandes
        if (parseFloat(invoiceData.total_factura || 0) > 1000000) {
            warnings.push('Factura superior a $1,000,000 - verificar autorización');
        }

        // Warning: Descuentos muy altos
        if (parseFloat(invoiceData.descuento_porcentaje || 0) > 20) {
            warnings.push(`Descuento muy alto (${invoiceData.descuento_porcentaje}%) - verificar autorización`);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Obtener próximo número de comprobante
     *
     * @param {number} companyId - ID de la empresa
     * @param {number} tipoComprobanteId - Tipo de comprobante
     * @returns {Object} Próximo número
     */
    async getNextInvoiceNumber(companyId, tipoComprobanteId = 1) {
        const [result] = await sequelize.query(
            `SELECT COALESCE(MAX(numero), 0) + 1 as next_number
             FROM siac_facturas
             WHERE company_id = :companyId
               AND tipo_comprobante_id = :tipoComprobanteId`,
            {
                replacements: { companyId, tipoComprobanteId },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        return {
            numero: result.next_number,
            numero_completo: this.formatInvoiceNumber(tipoComprobanteId, result.next_number)
        };
    }

    /**
     * Formatear número de factura según tipo
     */
    formatInvoiceNumber(tipoComprobanteId, numero) {
        const prefijos = {
            1: 'A-001',  // Factura A
            2: 'B-001',  // Factura B
            3: 'C-001',  // Factura C
            6: 'NCA-001', // Nota Crédito A
            7: 'NCB-001', // Nota Crédito B
            8: 'NCC-001'  // Nota Crédito C
        };

        const prefijo = prefijos[tipoComprobanteId] || 'A-001';
        return `${prefijo}-${String(numero).padStart(8, '0')}`;
    }

    /**
     * Aplicar reglas completas a una factura
     *
     * @param {number} companyId - ID de la empresa
     * @param {Object} invoiceData - Datos de la factura
     * @returns {Object} Factura con reglas aplicadas
     */
    async applyBillingRules(companyId, invoiceData) {
        // 1. Validar datos básicos
        const validation = this.validateInvoice(invoiceData);
        if (!validation.valid) {
            throw new Error(`Validación fallida: ${validation.errors.join(', ')}`);
        }

        // 2. Calcular descuentos automáticos (si no vienen especificados)
        if (!invoiceData.descuento_porcentaje) {
            const descuento = await this.calculateAutomaticDiscounts(
                companyId,
                parseFloat(invoiceData.subtotal),
                invoiceData.cliente_id
            );
            invoiceData.descuento_porcentaje = descuento.descuento_porcentaje;
            invoiceData.descuento_importe = descuento.descuento_importe;
        }

        // 3. Calcular impuestos
        const subtotalConDescuento = parseFloat(invoiceData.subtotal) - parseFloat(invoiceData.descuento_importe || 0);
        const impuestos = await this.calculateTaxes(
            companyId,
            subtotalConDescuento,
            invoiceData.cliente_condicion_iva
        );

        // 4. Calcular totales finales
        const totalImpuestos = impuestos.reduce((sum, imp) => sum + parseFloat(imp.monto), 0);
        const totalFactura = subtotalConDescuento + totalImpuestos;

        return {
            ...invoiceData,
            impuestos,
            total_impuestos: totalImpuestos.toFixed(2),
            total_neto: subtotalConDescuento.toFixed(2),
            total_factura: totalFactura.toFixed(2),
            validation_warnings: validation.warnings
        };
    }
}

module.exports = new BillingRulesService();
