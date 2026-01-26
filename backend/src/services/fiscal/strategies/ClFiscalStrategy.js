/**
 * ClFiscalStrategy.js - Chile (Stub)
 * IVA 19%, RUT, SII, CLP
 * Pendiente de implementación completa.
 */

const BaseFiscalStrategy = require('../BaseFiscalStrategy');

class ClFiscalStrategy extends BaseFiscalStrategy {
    constructor(taxTemplate) {
        super('CL', taxTemplate);
    }

    getCountryName() { return 'Chile'; }
    isStub() { return true; }

    calculatePurchaseTax({ subtotal }) {
        const rate = this.getRateFromTemplate('IVA') || 19;
        return {
            taxAmount: parseFloat((subtotal * rate / 100).toFixed(2)),
            taxPercent: rate,
            taxName: `IVA ${rate}%`
        };
    }

    /**
     * Retenciones Chile:
     * - Boleta de Honorarios: 13.75% (2024-2026, bajará a 12.25% en 2027)
     * - PPM (Pago Provisional Mensual): 1% servicios profesionales
     */
    calculateRetentions({ amount, purchaseType }) {
        const breakdown = [];

        if (purchaseType === 'services' || purchaseType === 'honorarios') {
            // Retención de Boleta de Honorarios (personas naturales)
            const honorariosRate = 13.75;
            const honorariosAmount = amount * (honorariosRate / 100);
            breakdown.push({
                type: 'honorarios',
                name: 'Retención Boleta de Honorarios',
                percent: honorariosRate,
                amount: parseFloat(honorariosAmount.toFixed(2)),
                minimumExempt: 0
            });
        } else {
            // PPM para compras de bienes (1%)
            const ppmRate = 1;
            const ppmAmount = amount * (ppmRate / 100);
            breakdown.push({
                type: 'ppm',
                name: 'PPM (Pago Provisional Mensual)',
                percent: ppmRate,
                amount: parseFloat(ppmAmount.toFixed(2)),
                minimumExempt: 0
            });
        }

        const totalRetentions = breakdown.reduce((sum, r) => sum + r.amount, 0);
        return { totalRetentions: parseFloat(totalRetentions.toFixed(2)), breakdown };
    }

    determineInvoiceType({ buyerCondition, sellerCondition }) {
        return {
            invoiceType: 'DTE',
            invoiceTypeName: 'Documento Tributario Electrónico',
            electronicRequired: true,
            discriminatesVat: true
        };
    }

    validateInvoice(invoice) {
        const errors = [];
        if (!invoice.total_amount || parseFloat(invoice.total_amount) <= 0) {
            errors.push('Monto total inválido');
        }
        return { valid: errors.length === 0, errors, warnings: ['Validación CL es stub'] };
    }

    getElectronicInvoicingProvider() {
        return {
            provider: 'SII',
            name: 'Servicio de Impuestos Internos',
            apiVersion: 'DTE v2',
            wsUrl: 'https://palena.sii.cl'
        };
    }

    getAccountCodeMappings({ purchaseType, retentionType }) {
        return { accountKey: `account_${retentionType || purchaseType || 'general'}`, description: `Cuenta ${purchaseType || 'general'} (CL)` };
    }

    validateTaxId(taxId) {
        if (!taxId) return { valid: false, error: 'RUT vacío' };
        const clean = taxId.replace(/[.\-\s]/g, '').toUpperCase();
        if (!/^\d{7,8}[0-9K]$/.test(clean)) {
            return { valid: false, error: 'RUT debe tener 8-9 caracteres (dígitos + verificador)' };
        }
        // Validación módulo 11 chileno
        const body = clean.slice(0, -1);
        const verifier = clean.slice(-1);
        let sum = 0;
        let multiplier = 2;
        for (let i = body.length - 1; i >= 0; i--) {
            sum += parseInt(body[i]) * multiplier;
            multiplier = multiplier === 7 ? 2 : multiplier + 1;
        }
        const remainder = 11 - (sum % 11);
        let expected;
        if (remainder === 11) expected = '0';
        else if (remainder === 10) expected = 'K';
        else expected = String(remainder);

        if (verifier !== expected) {
            return { valid: false, error: 'Dígito verificador inválido' };
        }
        const formatted = `${body.slice(0, -3)}.${body.slice(-3)}-${verifier}`;
        return { valid: true, formatted };
    }

    getCurrencyConfig() {
        return {
            currencyCode: 'CLP',
            currencyName: 'Peso Chileno',
            symbol: '$',
            decimalPlaces: 0,
            thousandsSeparator: '.',
            decimalSeparator: ','
        };
    }

    getRetentionTypes() {
        return ['honorarios', 'boleta_honorarios'];
    }

    getTaxIdFieldName() { return 'RUT'; }
}

module.exports = ClFiscalStrategy;
