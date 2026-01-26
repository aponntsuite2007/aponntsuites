/**
 * ArFiscalStrategy.js
 * Implementación fiscal completa para Argentina.
 *
 * SSOT de rates: TaxTemplate (country_code='AR')
 * Fallback: Constantes locales cuando TaxTemplate no tiene datos.
 *
 * Reglas implementadas:
 * - IVA: 21% (RI), 10.5% (reducido), 0% (exento/monotributo)
 * - Retención Ganancias: 2% bienes, 6% servicios
 * - Retención IVA: 50% del IVA si supera mínimo
 * - Retención IIBB: variable por provincia (2.5%-3.6%)
 * - Retención SUSS: 2% servicios RI
 * - Tipo factura: Matriz comprador×vendedor → A/B/C
 * - CUIT: Algoritmo módulo 11
 */

const BaseFiscalStrategy = require('../BaseFiscalStrategy');

// Fallback rates (cuando TaxTemplate no tiene datos cargados)
const FALLBACK_RATES = {
    IVA_GENERAL: 21,
    IVA_REDUCIDO: 10.5,
    IVA_DIFERENCIAL: 27,
    RET_GANANCIAS_BIENES: 2,
    RET_GANANCIAS_SERVICIOS: 6,
    RET_IVA_PERCENT: 50, // 50% del IVA
    RET_IVA_MINIMO: 18000, // Mínimo no sujeto a retención
    RET_SUSS_PERCENT: 2,
    RET_SUSS_MINIMO: 50000
};

// IIBB por provincia (fallback cuando no está en TaxTemplate)
const IIBB_RATES_BY_PROVINCE = {
    'Buenos Aires': 3.5,
    'CABA': 3.0,
    'Córdoba': 3.0,
    'Santa Fe': 3.6,
    'Mendoza': 2.5,
    'Tucumán': 3.5,
    'Entre Ríos': 3.0,
    'Salta': 3.6,
    'Misiones': 3.0,
    'Chaco': 3.5,
    'Corrientes': 3.5,
    'Santiago del Estero': 3.0,
    'San Juan': 2.5,
    'Jujuy': 3.0,
    'Río Negro': 3.0,
    'Neuquén': 3.0,
    'Formosa': 3.5,
    'Chubut': 3.0,
    'San Luis': 2.5,
    'Catamarca': 3.0,
    'La Rioja': 3.0,
    'La Pampa': 2.5,
    'Santa Cruz': 2.5,
    'Tierra del Fuego': 0 // Exenta
};

// Matriz de tipo de factura: INVOICE_TYPE_MATRIX[seller][buyer] → tipo
// RI vende: A a RI, B a CF/MONO/EX
// MONO/EX/CF vende: siempre C
const INVOICE_TYPE_MATRIX = {
    RI: { RI: 'A', MONO: 'B', EX: 'B', CF: 'B' },
    MONO: { RI: 'C', MONO: 'C', EX: 'C', CF: 'C' },
    EX: { RI: 'C', MONO: 'C', EX: 'C', CF: 'C' },
    CF: { RI: 'C', MONO: 'C', EX: 'C', CF: 'C' }
};

class ArFiscalStrategy extends BaseFiscalStrategy {
    constructor(taxTemplate) {
        super('AR', taxTemplate);
    }

    getCountryName() {
        return 'Argentina';
    }

    isStub() {
        return false;
    }

    // =========================================================================
    // IVA
    // =========================================================================

    calculatePurchaseTax({ subtotal, taxConditionBuyer, taxConditionSeller, purchaseType }) {
        const buyer = this._normalizeCondition(taxConditionBuyer);
        const seller = this._normalizeCondition(taxConditionSeller);

        // Monotributistas y Exentos no discriminan IVA
        if (seller === 'MONO' || seller === 'EX') {
            return { taxAmount: 0, taxPercent: 0, taxName: 'IVA (No discrimina)' };
        }

        // RI emite factura A con IVA discriminado
        let ivaRate = this.getRateFromTemplate('IVA', {
            conditionCode: buyer,
            amount: subtotal
        });

        // Fallback a constantes si TaxTemplate no tiene datos
        if (ivaRate === null) {
            ivaRate = FALLBACK_RATES.IVA_GENERAL;
        }

        const taxAmount = subtotal * (ivaRate / 100);

        return {
            taxAmount: parseFloat(taxAmount.toFixed(2)),
            taxPercent: ivaRate,
            taxName: `IVA ${ivaRate}%`
        };
    }

    // =========================================================================
    // RETENCIONES
    // =========================================================================

    calculateRetentions({ amount, taxAmount, supplierTaxCondition, buyerTaxCondition, purchaseType, province, companyOverrides }) {
        const supplier = this._normalizeCondition(supplierTaxCondition);
        const buyer = this._normalizeCondition(buyerTaxCondition);
        const breakdown = [];

        // Solo RI retiene (Monotributistas y Exentos no retienen)
        if (buyer !== 'RI') {
            return { totalRetentions: 0, breakdown };
        }

        // 1. Retención Ganancias (solo a RI)
        if (supplier === 'RI') {
            const gananciasBrk = this._calcRetGanancias(amount, purchaseType, companyOverrides);
            if (gananciasBrk) breakdown.push(gananciasBrk);
        }

        // 2. Retención IVA (solo a RI, sobre el IVA)
        if (supplier === 'RI' && taxAmount > 0) {
            const ivaBrk = this._calcRetIVA(taxAmount, companyOverrides);
            if (ivaBrk) breakdown.push(ivaBrk);
        }

        // 3. Retención IIBB (según provincia, a RI y MONO)
        if (['RI', 'MONO'].includes(supplier) && province) {
            const iibbBrk = this._calcRetIIBB(amount, province, companyOverrides);
            if (iibbBrk) breakdown.push(iibbBrk);
        }

        // 4. Retención SUSS (solo servicios a RI)
        if (supplier === 'RI' && purchaseType === 'services') {
            const sussBrk = this._calcRetSUSS(amount, companyOverrides);
            if (sussBrk) breakdown.push(sussBrk);
        }

        const totalRetentions = breakdown.reduce((sum, r) => sum + r.amount, 0);

        return {
            totalRetentions: parseFloat(totalRetentions.toFixed(2)),
            breakdown
        };
    }

    _calcRetGanancias(amount, purchaseType, overrides) {
        const conceptCode = 'RET_GANANCIAS';
        let rate;

        // Intentar desde TaxTemplate (SSOT)
        const concept = this.getConceptFromTemplate(conceptCode);
        if (concept && concept.rates.length > 0) {
            // Buscar rate por tipo de compra
            const typeRate = concept.rates.find(r =>
                r.conditions && r.conditions.includes(purchaseType)
            );
            rate = typeRate ? typeRate.percentage : concept.rates[0].percentage;
        }

        // Override de empresa
        if (overrides?.[conceptCode]) {
            rate = parseFloat(overrides[conceptCode]);
        }

        // Fallback
        if (rate === undefined || rate === null) {
            rate = purchaseType === 'services'
                ? FALLBACK_RATES.RET_GANANCIAS_SERVICIOS
                : FALLBACK_RATES.RET_GANANCIAS_BIENES;
        }

        const retAmount = amount * (rate / 100);

        return {
            type: 'ganancias',
            name: 'Retención Ganancias',
            percent: rate,
            amount: parseFloat(retAmount.toFixed(2)),
            minimumExempt: 0
        };
    }

    _calcRetIVA(taxAmount, overrides) {
        const conceptCode = 'RET_IVA';
        let percent = null;
        let minimo = null;

        // SSOT
        const concept = this.getConceptFromTemplate(conceptCode);
        if (concept && concept.rates.length > 0) {
            const defaultRate = concept.rates.find(r => r.isDefault) || concept.rates[0];
            percent = defaultRate.percentage;
            minimo = defaultRate.minimum;
        }

        if (overrides?.[conceptCode]) {
            percent = parseFloat(overrides[conceptCode]);
        }

        if (percent === null) percent = FALLBACK_RATES.RET_IVA_PERCENT;
        if (minimo === null) minimo = FALLBACK_RATES.RET_IVA_MINIMO;

        // Si el IVA no supera el mínimo, no se retiene
        if (taxAmount < minimo) {
            return null;
        }

        const retAmount = taxAmount * (percent / 100);

        return {
            type: 'iva',
            name: 'Retención IVA',
            percent,
            amount: parseFloat(retAmount.toFixed(2)),
            minimumExempt: minimo
        };
    }

    _calcRetIIBB(amount, province, overrides) {
        const conceptCode = 'RET_IIBB';
        let rate = null;

        // SSOT - buscar rate por provincia
        const concept = this.getConceptFromTemplate(conceptCode);
        if (concept && concept.rates.length > 0) {
            const provincialRate = concept.rates.find(r =>
                r.conditions && r.conditions.includes(province)
            );
            rate = provincialRate ? provincialRate.percentage : null;
        }

        if (overrides?.[conceptCode]) {
            rate = parseFloat(overrides[conceptCode]);
        }

        // Fallback por provincia
        if (rate === null) {
            const looked = IIBB_RATES_BY_PROVINCE[province];
            rate = (looked !== undefined && looked !== null) ? looked : 3.0;
        }

        if (rate === 0) return null; // Tierra del Fuego exenta

        const retAmount = amount * (rate / 100);

        return {
            type: 'iibb',
            name: `Retención IIBB (${province || 'General'})`,
            percent: rate,
            amount: parseFloat(retAmount.toFixed(2)),
            minimumExempt: 0,
            province
        };
    }

    _calcRetSUSS(amount, overrides) {
        const conceptCode = 'RET_SUSS';
        let rate = null;
        let minimo = null;

        const concept = this.getConceptFromTemplate(conceptCode);
        if (concept && concept.rates.length > 0) {
            const defaultRate = concept.rates.find(r => r.isDefault) || concept.rates[0];
            rate = defaultRate.percentage;
            minimo = defaultRate.minimum;
        }

        if (overrides?.[conceptCode]) {
            rate = parseFloat(overrides[conceptCode]);
        }

        if (rate === null) rate = FALLBACK_RATES.RET_SUSS_PERCENT;
        if (minimo === null) minimo = FALLBACK_RATES.RET_SUSS_MINIMO;

        if (amount < minimo) return null;

        const retAmount = amount * (rate / 100);

        return {
            type: 'suss',
            name: 'Retención SUSS',
            percent: rate,
            amount: parseFloat(retAmount.toFixed(2)),
            minimumExempt: minimo
        };
    }

    // =========================================================================
    // TIPO DE FACTURA
    // =========================================================================

    determineInvoiceType({ buyerCondition, sellerCondition, amount }) {
        const buyer = this._normalizeCondition(buyerCondition);
        const seller = this._normalizeCondition(sellerCondition);

        const matrix = INVOICE_TYPE_MATRIX[seller] || INVOICE_TYPE_MATRIX.RI;
        const invoiceType = matrix[buyer] || 'B';

        const typeNames = { A: 'Factura A', B: 'Factura B', C: 'Factura C', M: 'Factura M', E: 'Factura E' };

        return {
            invoiceType,
            invoiceTypeName: typeNames[invoiceType] || `Factura ${invoiceType}`,
            electronicRequired: true, // En AR siempre obligatorio
            discriminatesVat: invoiceType === 'A'
        };
    }

    // =========================================================================
    // VALIDACIÓN DE FACTURA
    // =========================================================================

    validateInvoice(invoice) {
        const errors = [];
        const warnings = [];

        // Tipo de factura válido
        if (!['A', 'B', 'C', 'M', 'E'].includes(invoice.invoice_type)) {
            errors.push(`Tipo de factura inválido: ${invoice.invoice_type}`);
        }

        // CAE obligatorio para facturas electrónicas
        if (!invoice.cae && invoice.invoice_type) {
            warnings.push('CAE no informado (requerido para factura electrónica)');
        }

        // Vencimiento de CAE
        if (invoice.cae_expiry) {
            const expiry = new Date(invoice.cae_expiry);
            if (expiry < new Date()) {
                errors.push(`CAE vencido: ${invoice.cae_expiry}`);
            }
        }

        // IVA en factura A
        if (invoice.invoice_type === 'A' && (!invoice.tax_amount || parseFloat(invoice.tax_amount) <= 0)) {
            warnings.push('Factura A sin IVA discriminado');
        }

        // Monto total debe coincidir con subtotal + IVA + otros
        const expectedTotal = parseFloat(invoice.subtotal || 0) +
            parseFloat(invoice.tax_amount || 0) +
            parseFloat(invoice.other_taxes || 0);
        const actualTotal = parseFloat(invoice.total_amount || 0);
        if (Math.abs(expectedTotal - actualTotal) > 0.01) {
            errors.push(`Total no coincide: esperado ${expectedTotal.toFixed(2)}, informado ${actualTotal.toFixed(2)}`);
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    // =========================================================================
    // ELECTRONIC INVOICING
    // =========================================================================

    getElectronicInvoicingProvider() {
        return {
            provider: 'AFIP',
            name: 'Administración Federal de Ingresos Públicos',
            apiVersion: 'WSFEv1',
            wsUrl: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx'
        };
    }

    // =========================================================================
    // ACCOUNT MAPPINGS
    // =========================================================================

    getAccountCodeMappings({ purchaseType, retentionType }) {
        if (retentionType) {
            const retentionMappings = {
                ganancias: { accountKey: 'account_retentions_ganancias', description: 'Retenciones Impuesto a las Ganancias' },
                iva: { accountKey: 'account_retentions_iva', description: 'Retenciones IVA' },
                iibb: { accountKey: 'account_retentions_iibb', description: 'Retenciones Ingresos Brutos' },
                suss: { accountKey: 'account_retentions_suss', description: 'Retenciones SUSS' }
            };
            return retentionMappings[retentionType] || { accountKey: `account_retentions_${retentionType}`, description: `Retención ${retentionType}` };
        }

        const purchaseMappings = {
            goods: { accountKey: 'account_merchandise', description: 'Mercaderías' },
            services: { accountKey: 'account_services_expense', description: 'Gastos por Servicios' },
            assets: { accountKey: 'account_fixed_assets', description: 'Bienes de Uso' },
            consumables: { accountKey: 'account_consumables', description: 'Materiales de Consumo' },
            raw_materials: { accountKey: 'account_raw_materials', description: 'Materias Primas' },
            utilities: { accountKey: 'account_utilities', description: 'Servicios Públicos' }
        };

        return purchaseMappings[purchaseType] || purchaseMappings.goods;
    }

    // =========================================================================
    // VALIDACIÓN CUIT
    // =========================================================================

    validateTaxId(taxId) {
        if (!taxId) return { valid: false, error: 'CUIT vacío' };

        // Limpiar separadores
        const clean = taxId.replace(/[-.\s]/g, '');

        if (!/^\d{11}$/.test(clean)) {
            return { valid: false, error: 'CUIT debe tener 11 dígitos', formatted: null };
        }

        // Algoritmo módulo 11
        const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
        let sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(clean[i]) * multipliers[i];
        }
        const mod = sum % 11;
        let expectedDigit;
        if (mod === 0) expectedDigit = 0;
        else if (mod === 1) expectedDigit = 9; // caso especial
        else expectedDigit = 11 - mod;

        const actualDigit = parseInt(clean[10]);
        if (actualDigit !== expectedDigit) {
            return { valid: false, error: 'Dígito verificador inválido', formatted: null };
        }

        // Formatear XX-XXXXXXXX-X
        const formatted = `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;

        return { valid: true, formatted, type: this._getCuitType(clean) };
    }

    _getCuitType(clean) {
        const prefix = clean.slice(0, 2);
        if (['20', '23', '24', '27'].includes(prefix)) return 'persona_fisica';
        if (['30', '33', '34'].includes(prefix)) return 'persona_juridica';
        return 'otro';
    }

    // =========================================================================
    // MONEDA
    // =========================================================================

    getCurrencyConfig() {
        return {
            currencyCode: 'ARS',
            currencyName: 'Peso Argentino',
            symbol: '$',
            decimalPlaces: 2,
            thousandsSeparator: '.',
            decimalSeparator: ','
        };
    }

    getRetentionTypes() {
        return ['ganancias', 'iva', 'iibb', 'suss'];
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    _normalizeCondition(condition) {
        if (!condition) return 'RI';
        const normalized = condition.toUpperCase().replace(/[^A-Z]/g, '');
        const aliases = {
            RI: 'RI', RESPONSABLEINSCRIPTO: 'RI', INSCRIPTO: 'RI',
            MONO: 'MONO', MONOTRIBUTISTA: 'MONO', MONOTRIBUTO: 'MONO',
            EX: 'EX', EXENTO: 'EX', EXENTA: 'EX',
            CF: 'CF', CONSUMIDORFINAL: 'CF', FINAL: 'CF'
        };
        return aliases[normalized] || 'RI';
    }
}

module.exports = ArFiscalStrategy;
