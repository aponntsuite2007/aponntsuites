/**
 * UyFiscalStrategy.js - Uruguay (Stub)
 * IVA 22%, RUT, DGI, UYU
 * Pendiente de implementación completa.
 */

const BaseFiscalStrategy = require('../BaseFiscalStrategy');

class UyFiscalStrategy extends BaseFiscalStrategy {
    constructor(taxTemplate) {
        super('UY', taxTemplate);
    }

    getCountryName() { return 'Uruguay'; }
    isStub() { return true; }

    calculatePurchaseTax({ subtotal }) {
        const rate = this.getRateFromTemplate('IVA') || 22;
        return {
            taxAmount: parseFloat((subtotal * rate / 100).toFixed(2)),
            taxPercent: rate,
            taxName: `IVA ${rate}%`
        };
    }

    /**
     * Retenciones Uruguay:
     * - IRPF/IRNR: 12% servicios profesionales (no residentes/independientes)
     * - IRAE anticipo: 1.5% bienes
     * - IVA Retenido: 100% en servicios cuando proveedor no es contribuyente IVA
     */
    calculateRetentions({ amount, purchaseType, taxAmount }) {
        const breakdown = [];

        if (purchaseType === 'services') {
            // IRPF 12% sobre servicios personales
            const irpfRate = 12;
            breakdown.push({
                type: 'irpf',
                name: 'Retención IRPF (Servicios)',
                percent: irpfRate,
                amount: parseFloat((amount * irpfRate / 100).toFixed(2)),
                minimumExempt: 0
            });

            // IVA Retenido (si corresponde) - 22% del monto
            if (taxAmount && taxAmount > 0) {
                const ivaRetRate = 100; // 100% del IVA
                const ivaRetAmount = taxAmount;
                breakdown.push({
                    type: 'iva_retenido',
                    name: 'Retención IVA (100%)',
                    percent: ivaRetRate,
                    amount: parseFloat(ivaRetAmount.toFixed(2)),
                    minimumExempt: 0,
                    baseAmount: taxAmount
                });
            }
        } else {
            // IRAE anticipo 1.5% sobre bienes
            const iraeRate = 1.5;
            breakdown.push({
                type: 'irae',
                name: 'Anticipo IRAE',
                percent: iraeRate,
                amount: parseFloat((amount * iraeRate / 100).toFixed(2)),
                minimumExempt: 0
            });
        }

        const totalRetentions = breakdown.reduce((sum, r) => sum + r.amount, 0);
        return { totalRetentions: parseFloat(totalRetentions.toFixed(2)), breakdown };
    }

    determineInvoiceType() {
        return {
            invoiceType: 'CFE',
            invoiceTypeName: 'Comprobante Fiscal Electrónico',
            electronicRequired: true,
            discriminatesVat: true
        };
    }

    validateInvoice(invoice) {
        const errors = [];
        if (!invoice.total_amount || parseFloat(invoice.total_amount) <= 0) {
            errors.push('Monto total inválido');
        }
        return { valid: errors.length === 0, errors, warnings: ['Validación UY es stub'] };
    }

    getElectronicInvoicingProvider() {
        return {
            provider: 'DGI',
            name: 'Dirección General Impositiva',
            apiVersion: 'CFE v3',
            wsUrl: 'https://efactura.dgi.gub.uy'
        };
    }

    getAccountCodeMappings({ purchaseType, retentionType }) {
        return { accountKey: `account_${retentionType || purchaseType || 'general'}`, description: `Cuenta ${purchaseType || 'general'} (UY)` };
    }

    validateTaxId(taxId) {
        if (!taxId) return { valid: false, error: 'RUT vacío' };
        const clean = taxId.replace(/[\s\-\.]/g, '');
        if (!/^\d{12}$/.test(clean)) {
            return { valid: false, error: 'RUT Uruguay debe tener 12 dígitos' };
        }
        // Formato: XX XXXXXX XXXX XX
        const formatted = `${clean.slice(0,2)}-${clean.slice(2,8)}-${clean.slice(8,12)}`;
        return { valid: true, formatted };
    }

    getCurrencyConfig() {
        return {
            currencyCode: 'UYU',
            currencyName: 'Peso Uruguayo',
            symbol: '$U',
            decimalPlaces: 2,
            thousandsSeparator: '.',
            decimalSeparator: ','
        };
    }

    getRetentionTypes() {
        return ['irpf', 'irae', 'iva_retenido'];
    }

    getTaxIdFieldName() { return 'RUT'; }
}

module.exports = UyFiscalStrategy;
