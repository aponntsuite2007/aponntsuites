/**
 * FiscalStrategyFactory.js
 * Factory que resuelve: branch_id → country → TaxTemplate (SSOT) → Strategy
 *
 * Cadena de resolución:
 * 1. branch_id → Branch.country (ISO alpha-2)
 * 2. Si no hay branch, usa CompanyBranch.country_id → PayrollCountry.country_code
 * 3. Fallback: 'AR' (backward compatible)
 * 4. country_code → TaxTemplate.getByCountryCode() → carga conditions/concepts/rates
 * 5. Retorna strategy singleton cacheado por país
 */

const { TaxTemplate } = require('../../models/siac/TaxTemplate');

// Strategy imports
const ArFiscalStrategy = require('./strategies/ArFiscalStrategy');
const ClFiscalStrategy = require('./strategies/ClFiscalStrategy');
const BrFiscalStrategy = require('./strategies/BrFiscalStrategy');
const MxFiscalStrategy = require('./strategies/MxFiscalStrategy');
const UyFiscalStrategy = require('./strategies/UyFiscalStrategy');
const CoFiscalStrategy = require('./strategies/CoFiscalStrategy');

const STRATEGY_MAP = {
    AR: ArFiscalStrategy,
    CL: ClFiscalStrategy,
    BR: BrFiscalStrategy,
    MX: MxFiscalStrategy,
    UY: UyFiscalStrategy,
    CO: CoFiscalStrategy
};

const DEFAULT_COUNTRY = 'AR';

class FiscalStrategyFactory {
    constructor(db) {
        this.db = db;
        this.sequelize = db ? db.sequelize : null;
        this._cache = new Map(); // country_code → { strategy, loadedAt }
        this._cacheTTL = 5 * 60 * 1000; // 5 minutos
    }

    /**
     * Obtener strategy para un branch_id
     * @param {number|null} branchId - ID de la sucursal (nullable = fallback AR)
     * @returns {BaseFiscalStrategy}
     */
    async getStrategyForBranch(branchId) {
        const countryCode = await this.resolveCountryCode(branchId);
        return this.getStrategyForCountry(countryCode);
    }

    /**
     * Obtener strategy directamente por country code
     * @param {string} countryCode - ISO alpha-2 (AR, CL, BR, MX, UY, CO)
     * @returns {BaseFiscalStrategy}
     */
    async getStrategyForCountry(countryCode) {
        const code = (countryCode || DEFAULT_COUNTRY).toUpperCase();

        // Check cache
        const cached = this._cache.get(code);
        if (cached && (Date.now() - cached.loadedAt) < this._cacheTTL) {
            return cached.strategy;
        }

        // Cargar TaxTemplate (SSOT) con conditions/concepts/rates
        let taxTemplate = null;
        try {
            taxTemplate = await TaxTemplate.getByCountryCode(code);
        } catch (err) {
            console.warn(`[FiscalFactory] No se pudo cargar TaxTemplate para ${code}:`, err.message);
        }

        // Instanciar strategy
        const StrategyClass = STRATEGY_MAP[code];
        if (!StrategyClass) {
            console.warn(`[FiscalFactory] Sin strategy para ${code}, usando AR como fallback`);
            const fallbackTemplate = await TaxTemplate.getByCountryCode(DEFAULT_COUNTRY).catch(() => null);
            const fallback = new ArFiscalStrategy(fallbackTemplate);
            this._cache.set(code, { strategy: fallback, loadedAt: Date.now() });
            return fallback;
        }

        const strategy = new StrategyClass(taxTemplate);
        this._cache.set(code, { strategy, loadedAt: Date.now() });
        return strategy;
    }

    /**
     * Resolver country code desde branch_id
     * Cadena: Branch → CompanyBranch → PayrollCountry → fallback 'AR'
     */
    async resolveCountryCode(branchId) {
        if (!branchId) return DEFAULT_COUNTRY;

        try {
            // Intento 1: Tabla branches (tiene campo country directo)
            const [branchRow] = await this.sequelize.query(`
                SELECT country FROM branches WHERE id = :branchId LIMIT 1
            `, {
                replacements: { branchId },
                type: this.sequelize.QueryTypes.SELECT
            });

            if (branchRow?.country) {
                return branchRow.country.toUpperCase();
            }

            // Intento 2: Tabla company_branches → payroll_countries
            const [cbRow] = await this.sequelize.query(`
                SELECT pc.country_code
                FROM company_branches cb
                JOIN payroll_countries pc ON pc.id = cb.country_id
                WHERE cb.id = :branchId
                LIMIT 1
            `, {
                replacements: { branchId },
                type: this.sequelize.QueryTypes.SELECT
            });

            if (cbRow?.country_code) {
                return cbRow.country_code.toUpperCase();
            }
        } catch (err) {
            console.warn(`[FiscalFactory] Error resolviendo country para branch ${branchId}:`, err.message);
        }

        return DEFAULT_COUNTRY;
    }

    /**
     * Resolver country code desde company_id (busca branch principal)
     */
    async resolveCountryForCompany(companyId) {
        if (!companyId) return DEFAULT_COUNTRY;

        try {
            // Buscar branch principal de la empresa
            const [mainBranch] = await this.sequelize.query(`
                SELECT id, country FROM branches
                WHERE company_id = :companyId AND is_main = true
                LIMIT 1
            `, {
                replacements: { companyId },
                type: this.sequelize.QueryTypes.SELECT
            });

            if (mainBranch?.country) {
                return mainBranch.country.toUpperCase();
            }

            // Fallback: primer company_branch con country
            const [cbRow] = await this.sequelize.query(`
                SELECT pc.country_code
                FROM company_branches cb
                JOIN payroll_countries pc ON pc.id = cb.country_id
                WHERE cb.company_id = :companyId
                ORDER BY cb.is_main DESC NULLS LAST
                LIMIT 1
            `, {
                replacements: { companyId },
                type: this.sequelize.QueryTypes.SELECT
            });

            if (cbRow?.country_code) {
                return cbRow.country_code.toUpperCase();
            }
        } catch (err) {
            console.warn(`[FiscalFactory] Error resolviendo country para company ${companyId}:`, err.message);
        }

        return DEFAULT_COUNTRY;
    }

    /**
     * Listar todos los países soportados con su status
     */
    getSupportedCountries() {
        return Object.entries(STRATEGY_MAP).map(([code, StrategyClass]) => {
            const instance = new StrategyClass(null);
            return {
                code,
                name: instance.getCountryName(),
                isStub: instance.isStub(),
                currency: instance.getCurrencyConfig().currencyCode,
                taxIdName: instance.getTaxIdFieldName(),
                retentionTypes: instance.getRetentionTypes()
            };
        });
    }

    /**
     * Invalidar cache (cuando se actualiza un TaxTemplate)
     */
    invalidateCache(countryCode = null) {
        if (countryCode) {
            this._cache.delete(countryCode.toUpperCase());
        } else {
            this._cache.clear();
        }
    }
}

module.exports = FiscalStrategyFactory;
