/**
 * CoFiscalStrategy.js - Colombia (Stub)
 * IVA 19%, NIT, DIAN, COP
 * Pendiente de implementación completa.
 */

const BaseFiscalStrategy = require('../BaseFiscalStrategy');

class CoFiscalStrategy extends BaseFiscalStrategy {
    constructor(taxTemplate) {
        super('CO', taxTemplate);
    }

    getCountryName() { return 'Colombia'; }
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
     * Retenciones Colombia:
     * - ReteFuente (Renta): 2.5% bienes, 4% servicios generales, 11% honorarios
     * - ReteIVA: 15% del IVA (cuando base > 4 UVT = ~$189.000 COP 2024)
     * - ReteICA: 0.414% servicios, 0.69% comercio, 0.966% industria (Bogotá)
     */
    calculateRetentions({ amount, purchaseType, taxAmount }) {
        const breakdown = [];
        const UVT_2024 = 47065; // Valor UVT 2024
        const MIN_RETEFUENTE_BIENES = 27 * UVT_2024; // 27 UVT para bienes
        const MIN_RETEFUENTE_SERVICIOS = 4 * UVT_2024; // 4 UVT para servicios
        const MIN_RETEIVA = 4 * UVT_2024; // 4 UVT para ReteIVA

        // ReteFuente
        let retefuenteRate;
        let minimo;
        if (purchaseType === 'services') {
            retefuenteRate = 4; // Servicios generales
            minimo = MIN_RETEFUENTE_SERVICIOS;
        } else {
            retefuenteRate = 2.5; // Compra de bienes
            minimo = MIN_RETEFUENTE_BIENES;
        }

        if (amount >= minimo) {
            breakdown.push({
                type: 'retefuente',
                name: 'Retención en la Fuente (Renta)',
                percent: retefuenteRate,
                amount: parseFloat((amount * retefuenteRate / 100).toFixed(2)),
                minimumExempt: minimo
            });
        }

        // ReteIVA (15% del IVA cuando base > 4 UVT)
        if (taxAmount && taxAmount > 0 && amount >= MIN_RETEIVA) {
            const reteIvaRate = 15;
            breakdown.push({
                type: 'reteiva',
                name: 'ReteIVA (15% del IVA)',
                percent: reteIvaRate,
                amount: parseFloat((taxAmount * reteIvaRate / 100).toFixed(2)),
                minimumExempt: MIN_RETEIVA,
                baseAmount: taxAmount
            });
        }

        // ReteICA (Bogotá genérico: 0.966% industria y comercio)
        const reteIcaRate = purchaseType === 'services' ? 0.414 : 0.69;
        breakdown.push({
            type: 'reteica',
            name: 'ReteICA (Industria y Comercio)',
            percent: reteIcaRate,
            amount: parseFloat((amount * reteIcaRate / 100).toFixed(2)),
            minimumExempt: 0
        });

        const totalRetentions = breakdown.reduce((sum, r) => sum + r.amount, 0);
        return { totalRetentions: parseFloat(totalRetentions.toFixed(2)), breakdown };
    }

    determineInvoiceType() {
        return {
            invoiceType: 'FE',
            invoiceTypeName: 'Factura Electrónica de Venta',
            electronicRequired: true,
            discriminatesVat: true
        };
    }

    validateInvoice(invoice) {
        const errors = [];
        if (!invoice.total_amount || parseFloat(invoice.total_amount) <= 0) {
            errors.push('Monto total inválido');
        }
        return { valid: errors.length === 0, errors, warnings: ['Validación CO es stub'] };
    }

    getElectronicInvoicingProvider() {
        return {
            provider: 'DIAN',
            name: 'Dirección de Impuestos y Aduanas Nacionales',
            apiVersion: 'FE UBL 2.1',
            wsUrl: 'https://facturaelectronica.dian.gov.co'
        };
    }

    getAccountCodeMappings({ purchaseType, retentionType }) {
        return { accountKey: `account_${retentionType || purchaseType || 'general'}`, description: `Cuenta ${purchaseType || 'general'} (CO)` };
    }

    validateTaxId(taxId) {
        if (!taxId) return { valid: false, error: 'NIT vacío' };
        const clean = taxId.replace(/[\s\-\.]/g, '');
        if (!/^\d{9,10}$/.test(clean)) {
            return { valid: false, error: 'NIT debe tener 9 o 10 dígitos' };
        }
        // Validación dígito de verificación NIT colombiano
        const weights = [41, 37, 29, 23, 19, 17, 13, 7, 3];
        const body = clean.slice(0, -1).padStart(9, '0');
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(body[i]) * weights[i];
        }
        const remainder = sum % 11;
        let expected;
        if (remainder === 0) expected = 0;
        else if (remainder === 1) expected = 1;
        else expected = 11 - remainder;

        const actual = parseInt(clean.slice(-1));
        if (actual !== expected) {
            return { valid: false, error: 'Dígito de verificación inválido' };
        }

        const formatted = `${body.slice(0,3)}.${body.slice(3,6)}.${body.slice(6)}-${clean.slice(-1)}`;
        return { valid: true, formatted };
    }

    getCurrencyConfig() {
        return {
            currencyCode: 'COP',
            currencyName: 'Peso Colombiano',
            symbol: '$',
            decimalPlaces: 0,
            thousandsSeparator: '.',
            decimalSeparator: ','
        };
    }

    getRetentionTypes() {
        return ['retefuente', 'reteiva', 'reteica'];
    }

    getTaxIdFieldName() { return 'NIT'; }
}

module.exports = CoFiscalStrategy;
