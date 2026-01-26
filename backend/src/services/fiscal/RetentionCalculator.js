/**
 * RetentionCalculator.js
 * Orquestador de cálculo de retenciones multi-país.
 *
 * Flujo:
 * 1. Obtiene strategy via FiscalStrategyFactory (branch → country)
 * 2. Carga tax_condition del proveedor desde BD
 * 3. Carga config de sucursal (provincia para IIBB en AR)
 * 4. Lee rates de TaxTemplate (SSOT) + CompanyTaxConfig (overrides)
 * 5. Llama strategy.calculateRetentions() con params enriquecidos
 * 6. Retorna formato compatible con FinancePaymentOrder.retentions_detail
 */

const { CompanyTaxConfig } = require('../../models/siac/TaxTemplate');

class RetentionCalculator {
    constructor(db, fiscalFactory) {
        this.db = db;
        this.sequelize = db ? db.sequelize : null;
        this.fiscalFactory = fiscalFactory;
    }

    /**
     * Calcular retenciones para un pago
     * @param {Object} params
     * @param {number} params.companyId - Empresa que paga
     * @param {number} params.supplierId - Proveedor que cobra
     * @param {number} params.amount - Monto bruto del pago
     * @param {number|null} params.branchId - Sucursal (determina país/provincia)
     * @param {string} params.purchaseType - 'goods' | 'services' | 'assets' | etc.
     * @param {number|null} params.taxAmount - Monto de IVA (para retención de IVA)
     * @returns {{ totalRetentions, netAmount, breakdown[], countryCode, isStub }}
     */
    async calculate(params) {
        const { companyId, supplierId, amount, branchId, purchaseType, taxAmount } = params;

        // 1. Obtener strategy fiscal
        const strategy = await this.fiscalFactory.getStrategyForBranch(branchId);
        const countryCode = strategy.countryCode;

        // 2. Si es stub, retornar sin retenciones
        if (strategy.isStub()) {
            return {
                totalRetentions: 0,
                netAmount: amount,
                breakdown: [],
                countryCode,
                isStub: true,
                message: `Retenciones no implementadas para ${strategy.getCountryName()}`
            };
        }

        // 3. Cargar condición fiscal del proveedor
        const supplierCondition = await this._getSupplierTaxCondition(supplierId);

        // 4. Cargar condición fiscal del comprador (empresa)
        const buyerCondition = await this._getBuyerTaxCondition(companyId);

        // 5. Cargar provincia de la sucursal (para IIBB en AR)
        const branchProvince = await this._getBranchProvince(branchId);

        // 6. Cargar overrides de CompanyTaxConfig
        const companyOverrides = await this._getCompanyOverrides(companyId);

        // 7. Delegar cálculo a la strategy
        const result = strategy.calculateRetentions({
            amount: parseFloat(amount) || 0,
            taxAmount: parseFloat(taxAmount) || 0,
            supplierTaxCondition: supplierCondition,
            buyerTaxCondition: buyerCondition,
            purchaseType: purchaseType || 'goods',
            province: branchProvince,
            companyOverrides
        });

        // 8. Formatear resultado compatible con FinancePaymentOrder.retentions_detail
        return {
            totalRetentions: result.totalRetentions,
            netAmount: parseFloat(amount) - result.totalRetentions,
            breakdown: result.breakdown,
            countryCode,
            isStub: false,
            retentions_detail: this._formatForPaymentOrder(result.breakdown)
        };
    }

    /**
     * Calcular impuesto de compra (IVA/tax)
     * @param {Object} params - { companyId, supplierId, subtotal, branchId, purchaseType }
     * @returns {{ taxAmount, taxPercent, taxName }}
     */
    async calculatePurchaseTax(params) {
        const { companyId, supplierId, subtotal, branchId, purchaseType } = params;

        const strategy = await this.fiscalFactory.getStrategyForBranch(branchId);
        const supplierCondition = await this._getSupplierTaxCondition(supplierId);
        const buyerCondition = await this._getBuyerTaxCondition(companyId);

        return strategy.calculatePurchaseTax({
            subtotal: parseFloat(subtotal) || 0,
            taxConditionBuyer: buyerCondition,
            taxConditionSeller: supplierCondition,
            purchaseType: purchaseType || 'goods'
        });
    }

    /**
     * Determinar tipo de factura
     */
    async determineInvoiceType(params) {
        const { companyId, supplierId, branchId, amount } = params;

        const strategy = await this.fiscalFactory.getStrategyForBranch(branchId);
        const supplierCondition = await this._getSupplierTaxCondition(supplierId);
        const buyerCondition = await this._getBuyerTaxCondition(companyId);

        return strategy.determineInvoiceType({
            buyerCondition,
            sellerCondition: supplierCondition,
            amount: parseFloat(amount) || 0
        });
    }

    /**
     * Validar tax ID del proveedor
     */
    async validateSupplierTaxId(supplierId, branchId) {
        const strategy = await this.fiscalFactory.getStrategyForBranch(branchId);
        const supplier = await this._getSupplier(supplierId);
        if (!supplier?.tax_id) return { valid: false, error: 'Sin identificación tributaria' };
        return strategy.validateTaxId(supplier.tax_id);
    }

    // =========================================================================
    // HELPERS PRIVADOS
    // =========================================================================

    async _getSupplierTaxCondition(supplierId) {
        if (!supplierId) return 'RI'; // default Responsable Inscripto

        try {
            const [row] = await this.sequelize.query(`
                SELECT tax_condition, tax_id FROM wms_suppliers WHERE id = :supplierId LIMIT 1
            `, {
                replacements: { supplierId },
                type: this.sequelize.QueryTypes.SELECT
            });
            return row?.tax_condition || 'RI';
        } catch {
            return 'RI';
        }
    }

    async _getBuyerTaxCondition(companyId) {
        if (!companyId) return 'RI';

        try {
            // Primero intentar CompanyTaxConfig
            const config = await CompanyTaxConfig.getCompanyConfig(companyId).catch(() => null);
            if (config?.customConditionCode) return config.customConditionCode;

            // Fallback: campo tax_condition en companies
            const [row] = await this.sequelize.query(`
                SELECT tax_condition FROM companies WHERE id = :companyId LIMIT 1
            `, {
                replacements: { companyId },
                type: this.sequelize.QueryTypes.SELECT
            });
            return row?.tax_condition || 'RI';
        } catch {
            return 'RI';
        }
    }

    async _getBranchProvince(branchId) {
        if (!branchId) return null;

        try {
            const [row] = await this.sequelize.query(`
                SELECT state_province, city FROM branches WHERE id = :branchId LIMIT 1
            `, {
                replacements: { branchId },
                type: this.sequelize.QueryTypes.SELECT
            });
            return row?.state_province || null;
        } catch {
            return null;
        }
    }

    async _getCompanyOverrides(companyId) {
        if (!companyId) return {};

        try {
            const config = await CompanyTaxConfig.getCompanyConfig(companyId).catch(() => null);
            return config?.conceptOverrides || {};
        } catch {
            return {};
        }
    }

    async _getSupplier(supplierId) {
        if (!supplierId) return null;
        try {
            const [row] = await this.sequelize.query(`
                SELECT id, name, tax_id, tax_condition FROM wms_suppliers WHERE id = :supplierId LIMIT 1
            `, {
                replacements: { supplierId },
                type: this.sequelize.QueryTypes.SELECT
            });
            return row || null;
        } catch {
            return null;
        }
    }

    /**
     * Formatear breakdown para FinancePaymentOrder.retentions_detail (JSONB array)
     * Formato esperado: [{ type, percent, amount, certificate? }]
     */
    _formatForPaymentOrder(breakdown) {
        return (breakdown || []).filter(r => r.amount > 0).map(r => ({
            type: r.type,
            name: r.name,
            percent: r.percent,
            amount: parseFloat(r.amount.toFixed(2)),
            minimumExempt: r.minimumExempt || 0,
            certificate: r.certificate || null
        }));
    }
}

module.exports = RetentionCalculator;
