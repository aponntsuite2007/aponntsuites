/**
 * BaseFiscalStrategy.js
 * Clase abstracta que define la interface fiscal por país.
 *
 * SSOT: TaxTemplate (tax_templates + tax_conditions + tax_concepts + tax_rates)
 * Las strategies implementan LÓGICA de cálculo; los DATOS vienen de TaxTemplate.
 *
 * Resolución: Branch.country → TaxTemplate.countryCode → Strategy
 */

class BaseFiscalStrategy {
    constructor(countryCode, taxTemplate = null) {
        if (new.target === BaseFiscalStrategy) {
            throw new Error('BaseFiscalStrategy es abstracta, usar una implementación concreta');
        }
        this.countryCode = countryCode;
        this.taxTemplate = taxTemplate; // TaxTemplate con conditions/concepts/rates cargados
    }

    /**
     * Indica si es un stub (implementación pendiente)
     */
    isStub() {
        return false;
    }

    /**
     * Nombre del país
     */
    getCountryName() {
        throw new Error('getCountryName() no implementado');
    }

    /**
     * Calcular impuesto de compra (IVA/tax principal)
     * @param {Object} params - { subtotal, taxConditionBuyer, taxConditionSeller, purchaseType, conceptCode? }
     * @returns {{ taxAmount, taxPercent, taxName, breakdown[] }}
     */
    calculatePurchaseTax(params) {
        throw new Error('calculatePurchaseTax() no implementado');
    }

    /**
     * Calcular retenciones según régimen fiscal
     * @param {Object} params - { amount, supplierTaxCondition, buyerTaxCondition, purchaseType, province?, conceptRates[] }
     * @returns {{ totalRetentions, breakdown: [{ type, name, percent, amount, minimumExempt, certificate? }] }}
     */
    calculateRetentions(params) {
        throw new Error('calculateRetentions() no implementado');
    }

    /**
     * Determinar tipo de factura/documento fiscal
     * @param {Object} params - { buyerCondition, sellerCondition, amount? }
     * @returns {{ invoiceType, invoiceTypeName, electronicRequired }}
     */
    determineInvoiceType(params) {
        throw new Error('determineInvoiceType() no implementado');
    }

    /**
     * Validar factura según reglas fiscales del país
     * @param {Object} invoice - Datos de la factura
     * @returns {{ valid, errors[], warnings[] }}
     */
    validateInvoice(invoice) {
        throw new Error('validateInvoice() no implementado');
    }

    /**
     * Obtener provider de facturación electrónica
     * @returns {{ provider, name, apiVersion, wsUrl? }}
     */
    getElectronicInvoicingProvider() {
        throw new Error('getElectronicInvoicingProvider() no implementado');
    }

    /**
     * Mapeo de cuentas contables para asientos del P2P
     * @param {Object} params - { purchaseType, retentionType? }
     * @returns {{ accountKey, description }}
     */
    getAccountCodeMappings(params) {
        throw new Error('getAccountCodeMappings() no implementado');
    }

    /**
     * Validar identificación tributaria (CUIT/RUT/CNPJ/RFC/NIT)
     * @param {string} taxId
     * @returns {{ valid, formatted, error? }}
     */
    validateTaxId(taxId) {
        throw new Error('validateTaxId() no implementado');
    }

    /**
     * Configuración de moneda del país
     * @returns {{ currencyCode, currencyName, symbol, decimalPlaces, thousandsSeparator, decimalSeparator }}
     */
    getCurrencyConfig() {
        throw new Error('getCurrencyConfig() no implementado');
    }

    /**
     * Obtener tipos de retención soportados por este país
     * @returns {string[]} - ['iibb', 'ganancias', 'iva', 'suss'] para AR
     */
    getRetentionTypes() {
        throw new Error('getRetentionTypes() no implementado');
    }

    /**
     * Obtener condiciones fiscales válidas para este país desde TaxTemplate
     * @returns {Array<{ code, name, description }>}
     */
    getTaxConditions() {
        if (!this.taxTemplate || !this.taxTemplate.conditions) return [];
        return this.taxTemplate.conditions.map(c => ({
            code: c.conditionCode,
            name: c.conditionName,
            description: c.description
        }));
    }

    /**
     * Obtener tasa de un concepto desde TaxTemplate (SSOT)
     * @param {string} conceptCode - Código del concepto (ej: 'IVA', 'RET_GANANCIAS')
     * @param {Object} filters - { conditionCode?, amount?, date? }
     * @returns {number|null} - Porcentaje o null si no encontrado
     */
    getRateFromTemplate(conceptCode, filters = {}) {
        if (!this.taxTemplate || !this.taxTemplate.concepts) return null;

        const concept = this.taxTemplate.concepts.find(c => c.conceptCode === conceptCode && c.isActive);
        if (!concept || !concept.rates) return null;

        const today = filters.date || new Date();
        const amount = filters.amount || 0;

        // Filtrar rates activas y vigentes
        let applicableRates = concept.rates.filter(r => {
            if (!r.isActive) return false;
            if (r.dateFrom && new Date(r.dateFrom) > today) return false;
            if (r.dateTo && new Date(r.dateTo) < today) return false;
            if (r.minimumAmount && amount < parseFloat(r.minimumAmount)) return false;
            if (r.maximumAmount && amount > parseFloat(r.maximumAmount)) return false;
            return true;
        });

        // Filtrar por condición fiscal si aplica
        if (filters.conditionCode && applicableRates.length > 1) {
            const condFiltered = applicableRates.filter(r => {
                if (!r.applicableConditions) return true;
                return r.applicableConditions.includes(filters.conditionCode);
            });
            if (condFiltered.length > 0) applicableRates = condFiltered;
        }

        // Retornar default o primera aplicable
        const defaultRate = applicableRates.find(r => r.isDefault);
        const rate = defaultRate || applicableRates[0];
        return rate ? parseFloat(rate.ratePercentage) : null;
    }

    /**
     * Obtener concepto completo con todas sus rates desde TaxTemplate
     * @param {string} conceptCode
     * @returns {{ concept, rates[] } | null}
     */
    getConceptFromTemplate(conceptCode) {
        if (!this.taxTemplate || !this.taxTemplate.concepts) return null;
        const concept = this.taxTemplate.concepts.find(c => c.conceptCode === conceptCode && c.isActive);
        if (!concept) return null;
        return {
            concept: {
                code: concept.conceptCode,
                name: concept.conceptName,
                type: concept.conceptType,
                baseAmount: concept.baseAmount,
                calculationOrder: concept.calculationOrder,
                isMandatory: concept.isMandatory
            },
            rates: (concept.rates || []).filter(r => r.isActive).map(r => ({
                code: r.rateCode,
                name: r.rateName,
                percentage: parseFloat(r.ratePercentage),
                minimum: r.minimumAmount ? parseFloat(r.minimumAmount) : null,
                maximum: r.maximumAmount ? parseFloat(r.maximumAmount) : null,
                conditions: r.applicableConditions,
                isDefault: r.isDefault
            }))
        };
    }

    /**
     * Nombre del campo de identificación tributaria
     */
    getTaxIdFieldName() {
        if (this.taxTemplate) return this.taxTemplate.taxIdFieldName;
        return 'Tax ID';
    }

    /**
     * Moneda por defecto del template
     */
    getDefaultCurrency() {
        if (this.taxTemplate) return this.taxTemplate.defaultCurrency;
        return this.getCurrencyConfig().currencyCode;
    }
}

module.exports = BaseFiscalStrategy;
