/**
 * FinanceModuleIntegration
 * Integración plug-and-play con módulos existentes
 * Finance Enterprise SSOT - Sistema Financiero Unificado
 */

const db = require('../config/database');
const { Op } = require('sequelize');

class FinanceModuleIntegration {
    /**
     * Configuración de integraciones disponibles
     */
    static INTEGRATIONS = {
        payroll: {
            module: 'payroll-liquidation',
            name: 'Liquidación de Sueldos',
            autoPost: {
                debit: { accountCode: '5101', name: 'Gastos de Personal' },
                credit: { accountCode: '2103.001', name: 'Sueldos y Jornales a Pagar' }
            },
            features: ['auto_post_salaries', 'budget_integration', 'cost_center_assignment']
        },
        billing: {
            module: 'siac-commercial',
            name: 'Facturación SIAC',
            autoPost: {
                debit: { accountCode: '1103.001', name: 'Deudores por Ventas' },
                credit: { accountCode: '4101', name: 'Ventas' }
            },
            features: ['auto_post_sales', 'receivables_tracking', 'cash_flow_forecast']
        },
        collections: {
            module: 'siac-collections',
            name: 'Cobranzas',
            autoPost: {
                debit: { accountCode: '1101', name: 'Caja y Bancos' },
                credit: { accountCode: '1103.001', name: 'Deudores por Ventas' }
            },
            features: ['auto_post_collections', 'bank_reconciliation']
        },
        procurement: {
            module: 'procurement-management',
            name: 'Gestión de Compras',
            autoPost: {
                debit: { accountCode: '5200', name: 'Gastos Generales' },
                credit: { accountCode: '2101.001', name: 'Proveedores' }
            },
            features: ['auto_post_purchases', 'payables_tracking', 'three_way_match', 'budget_control']
        },
        banking: {
            module: 'finance-enterprise',
            name: 'Tesorería',
            autoPost: null, // Siempre disponible
            features: ['bank_reconciliation', 'cash_position', 'cash_flow_forecast', 'auto_post_transactions']
        }
    };

    /**
     * Verificar disponibilidad de un módulo
     */
    async checkModuleAvailability(companyId, integrationKey) {
        const integration = FinanceModuleIntegration.INTEGRATIONS[integrationKey];
        if (!integration) {
            return { available: false, reason: 'Integración no encontrada' };
        }

        // Banking siempre disponible si Finance está activo
        if (integrationKey === 'banking') {
            return { available: true, integration };
        }

        const company = await db.Company.findByPk(companyId);
        if (!company) {
            return { available: false, reason: 'Empresa no encontrada' };
        }

        const activeModules = company.active_modules || [];
        const isAvailable = activeModules.includes(integration.module);

        return {
            available: isAvailable,
            integration,
            reason: isAvailable ? null : `Módulo ${integration.name} no contratado`
        };
    }

    /**
     * Obtener estado de todas las integraciones para una empresa
     */
    async getIntegrationStatus(companyId) {
        const company = await db.Company.findByPk(companyId);
        if (!company) {
            throw new Error('Empresa no encontrada');
        }

        // activeModules es string JSON en BD, hay que parsearlo
        let activeModules = {};
        try {
            activeModules = typeof company.activeModules === 'string'
                ? JSON.parse(company.activeModules)
                : (company.activeModules || {});
        } catch (e) {
            console.error('[FINANCE] Error parsing activeModules:', e.message);
            activeModules = {};
        }

        const status = {};

        for (const [key, integration] of Object.entries(FinanceModuleIntegration.INTEGRATIONS)) {
            // Verificar si el módulo existe en el objeto active_modules
            const available = key === 'banking' || activeModules[integration.module] === true;

            status[key] = {
                module: integration.module,
                name: integration.name,
                available,
                features: integration.features,
                features_enabled: available ? integration.features : []
            };
        }

        return status;
    }

    /**
     * Configurar cuentas de auto-posting para una integración
     */
    async configureAutoPosting(companyId, integrationKey, config) {
        const integration = FinanceModuleIntegration.INTEGRATIONS[integrationKey];
        if (!integration || !integration.autoPost) {
            throw new Error('Integración sin auto-posting');
        }

        const { debitAccountId, creditAccountId } = config;

        // Actualizar cuenta de débito
        if (debitAccountId) {
            await db.FinanceChartOfAccounts.update(
                {
                    auto_post_source: integrationKey,
                    auto_post_type: 'debit'
                },
                { where: { id: debitAccountId, company_id: companyId } }
            );
        }

        // Actualizar cuenta de crédito
        if (creditAccountId) {
            await db.FinanceChartOfAccounts.update(
                {
                    auto_post_source: integrationKey,
                    auto_post_type: 'credit'
                },
                { where: { id: creditAccountId, company_id: companyId } }
            );
        }

        return { success: true };
    }

    /**
     * Obtener configuración actual de auto-posting
     */
    async getAutoPostingConfig(companyId) {
        const accounts = await db.FinanceChartOfAccounts.findAll({
            where: {
                company_id: companyId,
                auto_post_source: { [Op.ne]: null }
            },
            attributes: ['id', 'account_code', 'name', 'auto_post_source', 'auto_post_type']
        });

        const config = {};
        for (const account of accounts) {
            if (!config[account.auto_post_source]) {
                config[account.auto_post_source] = {};
            }
            config[account.auto_post_source][account.auto_post_type] = {
                account_id: account.id,
                account_code: account.account_code,
                account_name: account.name
            };
        }

        return config;
    }

    /**
     * Inicializar Finance para una empresa (primera vez)
     */
    async initializeForCompany(companyId, userId) {
        const results = {
            chart_of_accounts: 0,
            fiscal_periods: 0,
            auto_posting_configured: false
        };

        // 1. Copiar plan de cuentas template
        const existingAccounts = await db.FinanceChartOfAccounts.count({
            where: { company_id: companyId }
        });

        if (existingAccounts === 0) {
            results.chart_of_accounts = await db.FinanceChartOfAccounts.copyTemplateToCompany(
                companyId,
                userId
            );
        } else {
            results.chart_of_accounts = existingAccounts;
        }

        // 2. Crear períodos fiscales del año actual
        const currentYear = new Date().getFullYear();
        const existingPeriods = await db.FinanceFiscalPeriod.count({
            where: { company_id: companyId, fiscal_year: currentYear }
        });

        if (existingPeriods === 0) {
            const periods = await db.FinanceFiscalPeriod.createYearPeriods(companyId, currentYear);
            results.fiscal_periods = periods.length;
        } else {
            results.fiscal_periods = existingPeriods;
        }

        // 3. Configurar auto-posting por defecto según módulos disponibles
        const integrationStatus = await this.getIntegrationStatus(companyId);

        for (const [key, status] of Object.entries(integrationStatus)) {
            if (status.available) {
                const integration = FinanceModuleIntegration.INTEGRATIONS[key];
                if (integration.autoPost) {
                    // Buscar cuentas por código
                    const debitAccount = await db.FinanceChartOfAccounts.findOne({
                        where: {
                            company_id: companyId,
                            account_code: { [Op.like]: `${integration.autoPost.debit.accountCode}%` },
                            is_header: false
                        }
                    });

                    const creditAccount = await db.FinanceChartOfAccounts.findOne({
                        where: {
                            company_id: companyId,
                            account_code: { [Op.like]: `${integration.autoPost.credit.accountCode}%` },
                            is_header: false
                        }
                    });

                    if (debitAccount && creditAccount) {
                        await this.configureAutoPosting(companyId, key, {
                            debitAccountId: debitAccount.id,
                            creditAccountId: creditAccount.id
                        });
                    }
                }
            }
        }

        results.auto_posting_configured = true;

        return results;
    }

    /**
     * Sincronizar centros de costo con departamentos
     */
    async syncCostCentersWithDepartments(companyId, userId) {
        const departments = await db.Department.findAll({
            where: { company_id: companyId, is_active: true }
        });

        let created = 0;
        let updated = 0;

        for (const dept of departments) {
            const existing = await db.FinanceCostCenter.findOne({
                where: { company_id: companyId, department_id: dept.id }
            });

            if (existing) {
                existing.name = dept.name;
                await existing.save();
                updated++;
            } else {
                await db.FinanceCostCenter.create({
                    company_id: companyId,
                    code: `CC-${dept.id.toString().padStart(3, '0')}`,
                    name: dept.name,
                    center_type: 'cost_center',
                    level: 3,
                    department_id: dept.id,
                    has_budget: true,
                    is_active: true,
                    allows_posting: true
                });
                created++;
            }
        }

        return { created, updated };
    }

    /**
     * Obtener sugerencias de bundles comerciales
     */
    async suggestBundles(companyId) {
        const integrationStatus = await this.getIntegrationStatus(companyId);
        const suggestions = [];

        // Sugerir módulos complementarios
        if (integrationStatus.payroll.available && !integrationStatus.billing.available) {
            suggestions.push({
                bundle: 'admin_complete',
                name: 'Administración Completa',
                description: 'Agregue Facturación SIAC para cerrar el ciclo contable',
                modules: ['siac-commercial'],
                benefit: 'Auto-posting de ventas + proyección de cobranzas'
            });
        }

        if (integrationStatus.procurement.available && !integrationStatus.payroll.available) {
            suggestions.push({
                bundle: 'rrhh_procurement',
                name: 'RRHH + Compras',
                description: 'Complete con Liquidación de Sueldos',
                modules: ['payroll-liquidation'],
                benefit: 'Control total de egresos + presupuesto integrado'
            });
        }

        // Bundle premium
        const allAvailable = Object.values(integrationStatus).every(s => s.available);
        if (!allAvailable) {
            const missingModules = Object.entries(integrationStatus)
                .filter(([k, v]) => !v.available && k !== 'banking')
                .map(([k, v]) => v.module);

            if (missingModules.length > 0) {
                suggestions.push({
                    bundle: 'finance_enterprise',
                    name: 'Finance Enterprise Completo',
                    description: 'Todos los módulos integrados con Finance',
                    modules: missingModules,
                    benefit: 'Contabilidad 100% automatizada + Dashboard OLAP completo'
                });
            }
        }

        return suggestions;
    }

    /**
     * Analizar impacto de desactivar un módulo
     */
    async analyzeDeactivationImpact(companyId, moduleName) {
        // Buscar qué integración afecta
        let affectedIntegration = null;
        for (const [key, integration] of Object.entries(FinanceModuleIntegration.INTEGRATIONS)) {
            if (integration.module === moduleName) {
                affectedIntegration = { key, ...integration };
                break;
            }
        }

        if (!affectedIntegration) {
            return { impact: 'none', message: 'Módulo no afecta Finance' };
        }

        const impacts = [];

        // Verificar asientos pendientes
        if (affectedIntegration.autoPost) {
            const pendingEntries = await db.FinanceJournalEntry.count({
                where: {
                    company_id: companyId,
                    source_module: moduleName,
                    status: 'draft'
                }
            });

            if (pendingEntries > 0) {
                impacts.push({
                    type: 'pending_entries',
                    count: pendingEntries,
                    message: `${pendingEntries} asientos pendientes de contabilizar`
                });
            }
        }

        // Verificar ejecución presupuestaria
        const budget = await db.FinanceBudget.getActive(companyId, new Date().getFullYear());
        if (budget) {
            impacts.push({
                type: 'budget_affected',
                message: 'El presupuesto dejará de recibir ejecución automática de este módulo'
            });
        }

        // Verificar proyección de cash flow
        if (affectedIntegration.features.includes('cash_flow_forecast')) {
            impacts.push({
                type: 'cash_flow_affected',
                message: 'Las proyecciones de flujo de caja perderán precisión'
            });
        }

        return {
            impact: impacts.length > 0 ? 'significant' : 'minimal',
            affected_integration: affectedIntegration.name,
            features_lost: affectedIntegration.features,
            impacts
        };
    }
}

module.exports = new FinanceModuleIntegration();
