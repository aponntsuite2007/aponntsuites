/**
 * Fiscal Strategy Module
 * Sistema de compliance fiscal multi-país para el circuito P2P.
 *
 * SSOT: TaxTemplate (tax_templates → tax_conditions → tax_concepts → tax_rates)
 * Resolución: Branch.country → TaxTemplate.countryCode → Strategy
 *
 * Países soportados:
 * - AR (Argentina): Implementación completa
 * - CL (Chile): Stub con IVA 19%, RUT, SII
 * - BR (Brasil): Stub con ICMS 18%, CNPJ, SEFAZ
 * - MX (México): Stub con IVA 16%, RFC, SAT
 * - UY (Uruguay): Stub con IVA 22%, RUT, DGI
 * - CO (Colombia): Stub con IVA 19%, NIT, DIAN
 */

const BaseFiscalStrategy = require('./BaseFiscalStrategy');
const FiscalStrategyFactory = require('./FiscalStrategyFactory');
const RetentionCalculator = require('./RetentionCalculator');

module.exports = {
    BaseFiscalStrategy,
    FiscalStrategyFactory,
    RetentionCalculator
};
