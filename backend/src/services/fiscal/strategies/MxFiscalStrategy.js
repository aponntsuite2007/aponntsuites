/**
 * MxFiscalStrategy.js - México (Stub)
 * IVA 16%, RFC, SAT, MXN
 * Pendiente de implementación completa.
 */

const BaseFiscalStrategy = require('../BaseFiscalStrategy');

class MxFiscalStrategy extends BaseFiscalStrategy {
    constructor(taxTemplate) {
        super('MX', taxTemplate);
    }

    getCountryName() { return 'México'; }
    isStub() { return true; }

    calculatePurchaseTax({ subtotal }) {
        const rate = this.getRateFromTemplate('IVA') || 16;
        return {
            taxAmount: parseFloat((subtotal * rate / 100).toFixed(2)),
            taxPercent: rate,
            taxName: `IVA ${rate}%`
        };
    }

    /**
     * Retenciones México:
     * - ISR: 10% servicios profesionales (persona física)
     * - IVA Retenido: 2/3 del IVA = 10.6667% del subtotal en servicios profesionales
     * Solo aplica cuando persona moral paga a persona física
     */
    calculateRetentions({ amount, purchaseType, taxAmount }) {
        const breakdown = [];

        if (purchaseType === 'services') {
            // Retención ISR 10% (servicios profesionales)
            const isrRate = 10;
            breakdown.push({
                type: 'isr',
                name: 'Retención ISR (Servicios Profesionales)',
                percent: isrRate,
                amount: parseFloat((amount * isrRate / 100).toFixed(2)),
                minimumExempt: 0
            });

            // Retención IVA (2/3 del IVA = 10.6667% del subtotal)
            const ivaRetRate = 10.6667;
            breakdown.push({
                type: 'iva_retenido',
                name: 'Retención IVA (2/3)',
                percent: ivaRetRate,
                amount: parseFloat((amount * ivaRetRate / 100).toFixed(2)),
                minimumExempt: 0
            });
        } else {
            // Para bienes: solo ISR 1.25% (resico)
            const isrBienesRate = 1.25;
            breakdown.push({
                type: 'isr',
                name: 'Retención ISR (Bienes)',
                percent: isrBienesRate,
                amount: parseFloat((amount * isrBienesRate / 100).toFixed(2)),
                minimumExempt: 0
            });
        }

        const totalRetentions = breakdown.reduce((sum, r) => sum + r.amount, 0);
        return { totalRetentions: parseFloat(totalRetentions.toFixed(2)), breakdown };
    }

    determineInvoiceType() {
        return {
            invoiceType: 'CFDI',
            invoiceTypeName: 'Comprobante Fiscal Digital por Internet',
            electronicRequired: true,
            discriminatesVat: true
        };
    }

    validateInvoice(invoice) {
        const errors = [];
        if (!invoice.total_amount || parseFloat(invoice.total_amount) <= 0) {
            errors.push('Monto total inválido');
        }
        return { valid: errors.length === 0, errors, warnings: ['Validación MX es stub'] };
    }

    getElectronicInvoicingProvider() {
        return {
            provider: 'SAT',
            name: 'Servicio de Administración Tributaria',
            apiVersion: 'CFDI 4.0',
            wsUrl: 'https://www.sat.gob.mx'
        };
    }

    getAccountCodeMappings({ purchaseType, retentionType }) {
        return { accountKey: `account_${retentionType || purchaseType || 'general'}`, description: `Cuenta ${purchaseType || 'general'} (MX)` };
    }

    validateTaxId(taxId) {
        if (!taxId) return { valid: false, error: 'RFC vacío' };
        const clean = taxId.replace(/[\s\-]/g, '').toUpperCase();
        // RFC persona moral: 3 letras + 6 dígitos fecha + 3 homoclave
        // RFC persona física: 4 letras + 6 dígitos fecha + 3 homoclave
        if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(clean)) {
            return { valid: false, error: 'RFC formato inválido (debe ser 12 o 13 caracteres)' };
        }
        const type = clean.length === 12 ? 'persona_moral' : 'persona_fisica';
        return { valid: true, formatted: clean, type };
    }

    getCurrencyConfig() {
        return {
            currencyCode: 'MXN',
            currencyName: 'Peso Mexicano',
            symbol: '$',
            decimalPlaces: 2,
            thousandsSeparator: ',',
            decimalSeparator: '.'
        };
    }

    getRetentionTypes() {
        return ['isr', 'iva_retenido'];
    }

    getTaxIdFieldName() { return 'RFC'; }
}

module.exports = MxFiscalStrategy;
