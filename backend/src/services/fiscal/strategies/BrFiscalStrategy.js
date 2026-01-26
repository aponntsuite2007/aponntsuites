/**
 * BrFiscalStrategy.js - Brasil (Stub)
 * ICMS 17-25%, CNPJ, SEFAZ, BRL
 * Pendiente de implementación completa.
 */

const BaseFiscalStrategy = require('../BaseFiscalStrategy');

class BrFiscalStrategy extends BaseFiscalStrategy {
    constructor(taxTemplate) {
        super('BR', taxTemplate);
    }

    getCountryName() { return 'Brasil'; }
    isStub() { return true; }

    calculatePurchaseTax({ subtotal }) {
        // ICMS estándar São Paulo 18%, pero varía por estado
        const rate = this.getRateFromTemplate('ICMS') || 18;
        return {
            taxAmount: parseFloat((subtotal * rate / 100).toFixed(2)),
            taxPercent: rate,
            taxName: `ICMS ${rate}%`
        };
    }

    /**
     * Retenciones Brasil (simplificado):
     * - IRRF: 1.5% servicios, 1% bienes (mínimo R$10)
     * - PIS: 0.65%
     * - COFINS: 3%
     * - CSLL: 1%
     * - INSS: 11% servicios persona física (tope R$7.786)
     * - ISS: 2-5% servicios municipales
     * Nota: PIS+COFINS+CSLL solo se retienen si valor > R$5.000
     */
    calculateRetentions({ amount, purchaseType, taxAmount }) {
        const breakdown = [];
        const MIN_PCC = 5000; // Mínimo para retener PIS/COFINS/CSLL

        // IRRF siempre
        const irrfRate = purchaseType === 'services' ? 1.5 : 1.0;
        const irrfAmount = amount * (irrfRate / 100);
        if (irrfAmount >= 10) { // Mínimo R$10
            breakdown.push({
                type: 'irrf',
                name: 'IRRF (Imposto de Renda Retido na Fonte)',
                percent: irrfRate,
                amount: parseFloat(irrfAmount.toFixed(2)),
                minimumExempt: 10
            });
        }

        // PIS + COFINS + CSLL (solo si > R$5.000)
        if (amount > MIN_PCC) {
            breakdown.push({
                type: 'pis',
                name: 'PIS',
                percent: 0.65,
                amount: parseFloat((amount * 0.0065).toFixed(2)),
                minimumExempt: MIN_PCC
            });
            breakdown.push({
                type: 'cofins',
                name: 'COFINS',
                percent: 3.0,
                amount: parseFloat((amount * 0.03).toFixed(2)),
                minimumExempt: MIN_PCC
            });
            breakdown.push({
                type: 'csll',
                name: 'CSLL',
                percent: 1.0,
                amount: parseFloat((amount * 0.01).toFixed(2)),
                minimumExempt: MIN_PCC
            });
        }

        // ISS para servicios (alícuota genérica 5%)
        if (purchaseType === 'services') {
            const issRate = 5.0;
            breakdown.push({
                type: 'iss',
                name: 'ISS (Imposto sobre Serviços)',
                percent: issRate,
                amount: parseFloat((amount * issRate / 100).toFixed(2)),
                minimumExempt: 0
            });
        }

        const totalRetentions = breakdown.reduce((sum, r) => sum + r.amount, 0);
        return { totalRetentions: parseFloat(totalRetentions.toFixed(2)), breakdown };
    }

    determineInvoiceType() {
        return {
            invoiceType: 'NFe',
            invoiceTypeName: 'Nota Fiscal Eletrônica',
            electronicRequired: true,
            discriminatesVat: true
        };
    }

    validateInvoice(invoice) {
        const errors = [];
        if (!invoice.total_amount || parseFloat(invoice.total_amount) <= 0) {
            errors.push('Valor total inválido');
        }
        return { valid: errors.length === 0, errors, warnings: ['Validação BR é stub'] };
    }

    getElectronicInvoicingProvider() {
        return {
            provider: 'SEFAZ',
            name: 'Secretaria da Fazenda',
            apiVersion: 'NFe 4.0',
            wsUrl: 'https://nfe.fazenda.gov.br'
        };
    }

    getAccountCodeMappings({ purchaseType, retentionType }) {
        return { accountKey: `account_${retentionType || purchaseType || 'general'}`, description: `Conta ${purchaseType || 'geral'} (BR)` };
    }

    validateTaxId(taxId) {
        if (!taxId) return { valid: false, error: 'CNPJ vazio' };
        const clean = taxId.replace(/[.\-\/\s]/g, '');
        if (!/^\d{14}$/.test(clean)) {
            return { valid: false, error: 'CNPJ deve ter 14 dígitos' };
        }
        // Validación CNPJ (2 dígitos verificadores)
        const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

        let sum = 0;
        for (let i = 0; i < 12; i++) sum += parseInt(clean[i]) * weights1[i];
        let d1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        if (parseInt(clean[12]) !== d1) return { valid: false, error: 'Dígito verificador 1 inválido' };

        sum = 0;
        for (let i = 0; i < 13; i++) sum += parseInt(clean[i]) * weights2[i];
        let d2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        if (parseInt(clean[13]) !== d2) return { valid: false, error: 'Dígito verificador 2 inválido' };

        const formatted = `${clean.slice(0,2)}.${clean.slice(2,5)}.${clean.slice(5,8)}/${clean.slice(8,12)}-${clean.slice(12)}`;
        return { valid: true, formatted };
    }

    getCurrencyConfig() {
        return {
            currencyCode: 'BRL',
            currencyName: 'Real Brasileiro',
            symbol: 'R$',
            decimalPlaces: 2,
            thousandsSeparator: '.',
            decimalSeparator: ','
        };
    }

    getRetentionTypes() {
        return ['irrf', 'pis', 'cofins', 'csll', 'inss', 'iss'];
    }

    getTaxIdFieldName() { return 'CNPJ'; }
}

module.exports = BrFiscalStrategy;
