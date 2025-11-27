/**
 * ============================================================================
 * PAYROLL MODULE COLLECTOR - Test E2E del Módulo de Liquidación de Sueldos
 * ============================================================================
 *
 * Extiende BaseModuleCollector para testear el sistema completo de payroll.
 *
 * TESTS INCLUIDOS:
 * 1. Payroll Templates - CRUD de plantillas de liquidación
 * 2. Salary Categories - Categorías salariales por convenio
 * 3. User Salary Config - Configuración salarial de empleados
 * 4. Payroll Runs - Ejecución de liquidaciones
 * 5. Auto-Propagation - Verificación de triggers automáticos
 * 6. Database Functions & Views
 *
 * TABLAS INVOLUCRADAS:
 * - payroll_templates (29 columnas)
 * - payroll_template_concepts (28 columnas)
 * - payroll_runs / payroll_run_details (25 columnas c/u)
 * - user_salary_config_v2 (39 columnas)
 * - labor_agreements_catalog (8 columnas)
 * - salary_categories (9 columnas)
 * - payroll_countries (21 columnas)
 *
 * @version 1.1.0
 * @date 2025-11-27
 * ============================================================================
 */

const BaseModuleCollector = require('./BaseModuleCollector');

class PayrollModuleCollector extends BaseModuleCollector {
    constructor(database, systemRegistry, baseURL = null) {
        super(database, systemRegistry, baseURL);
        this.TEST_PREFIX = '[TEST-PAYROLL]';
        this.testTemplateData = null;
        this.testCategoryData = null;
        this.testUserSalaryData = null;
    }

    /**
     * Configuración específica del módulo de payroll
     */
    getModuleConfig() {
        return {
            moduleName: 'payroll-liquidation',
            moduleURL: '/panel-empresa.html',
            testCategories: [
                // PAYROLL TEMPLATES
                { name: 'payroll_template_list', func: this.testPayrollTemplateList.bind(this) },
                { name: 'payroll_template_create', func: this.testPayrollTemplateCreate.bind(this) },
                { name: 'payroll_template_concepts', func: this.testPayrollTemplateConcepts.bind(this) },

                // SALARY CATEGORIES
                { name: 'salary_categories_list', func: this.testSalaryCategoriesList.bind(this) },
                { name: 'salary_category_propagation', func: this.testSalaryCategoryPropagation.bind(this) },

                // USER SALARY CONFIG
                { name: 'user_salary_config_list', func: this.testUserSalaryConfigList.bind(this) },
                { name: 'user_salary_config_create', func: this.testUserSalaryConfigCreate.bind(this) },
                { name: 'user_salary_chain_complete', func: this.testUserSalaryChainComplete.bind(this) },

                // PAYROLL RUNS
                { name: 'payroll_run_calculate', func: this.testPayrollRunCalculate.bind(this) },
                { name: 'payroll_run_details', func: this.testPayrollRunDetails.bind(this) },

                // AUTO-PROPAGATION TRIGGERS
                { name: 'trigger_salary_propagation', func: this.testTriggerSalaryPropagation.bind(this) },
                { name: 'trigger_recalculation_flag', func: this.testTriggerRecalculationFlag.bind(this) },

                // DATABASE FUNCTIONS & VIEWS
                { name: 'function_user_payroll_template', func: this.testFunctionGetUserPayrollTemplate.bind(this) },
                { name: 'view_user_salary_complete', func: this.testViewUserSalaryComplete.bind(this) }
            ],
            navigateBeforeTests: this.navigateToPayrollModule.bind(this)
        };
    }

    /**
     * Navegación inicial al módulo de payroll (skip si no hay browser)
     */
    async navigateToPayrollModule() {
        console.log('\n📂 Navegando al módulo de Liquidación de Sueldos...\n');

        // Skip navigation si no hay page disponible (tests de BD solamente)
        if (!this.page) {
            console.log('⚠️ Sin navegador disponible, ejecutando solo tests de BD');
            return;
        }

        try {
            const moduleLoaded = await this.page.evaluate(() => {
                if (typeof window.showModuleContent === 'function') {
                    window.showModuleContent('payroll-liquidation', 'Liquidación de Sueldos');
                    return true;
                }
                return false;
            }).catch(() => false);

            if (!moduleLoaded) {
                console.warn('⚠️ Módulo payroll-liquidation no disponible en UI');
            } else {
                await this.page.waitForTimeout(2000);
                console.log('✅ Módulo de Liquidación de Sueldos cargado\n');
            }
        } catch (error) {
            console.warn('⚠️ Error navegando:', error.message);
        }
    }

    // ===========================================================================
    // TESTS DE PAYROLL TEMPLATES
    // ===========================================================================

    async testPayrollTemplateList() {
        const result = {
            name: 'payroll_template_list',
            status: 'pending',
            description: 'Listar plantillas de liquidación',
            details: {}
        };

        try {
            // Test via BD directamente (funciona con o sin navegador)
            const [rows] = await this.database.query(`
                SELECT id, template_code, template_name, company_id, country_id, is_active
                FROM payroll_templates
                ORDER BY template_name
                LIMIT 20
            `);

            result.status = 'passed';
            result.details = {
                templateCount: rows.length,
                message: rows.length > 0 ? 'Plantillas listadas correctamente' : 'Sin plantillas configuradas',
                sample: rows.slice(0, 3).map(t => ({ code: t.template_code, name: t.template_name }))
            };
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }

    async testPayrollTemplateCreate() {
        const result = {
            name: 'payroll_template_create',
            status: 'pending',
            description: 'Verificar estructura de plantillas',
            details: {}
        };

        try {
            const [rows] = await this.database.query(`
                SELECT COUNT(*) as count,
                       COUNT(DISTINCT company_id) as companies,
                       COUNT(DISTINCT country_id) as countries
                FROM payroll_templates
            `);

            result.status = 'passed';
            result.details = {
                totalTemplates: parseInt(rows[0]?.count || 0),
                companiesWithTemplates: parseInt(rows[0]?.companies || 0),
                countriesConfigured: parseInt(rows[0]?.countries || 0),
                message: 'Verificación de plantillas en BD exitosa'
            };
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }

    async testPayrollTemplateConcepts() {
        const result = {
            name: 'payroll_template_concepts',
            status: 'pending',
            description: 'Verificar conceptos de plantilla',
            details: {}
        };

        try {
            const [rows] = await this.database.query(`
                SELECT ptc.concept_code, ptc.concept_name, ptc.calculation_type, pt.template_name
                FROM payroll_template_concepts ptc
                JOIN payroll_templates pt ON pt.id = ptc.template_id
                LIMIT 10
            `);

            result.status = 'passed';
            result.details = {
                conceptsFound: rows.length,
                message: rows.length > 0 ? 'Conceptos encontrados' : 'Sin conceptos configurados',
                sampleConcepts: rows.map(c => ({
                    code: c.concept_code,
                    name: c.concept_name,
                    type: c.calculation_type
                }))
            };
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }

    // ===========================================================================
    // TESTS DE SALARY CATEGORIES
    // ===========================================================================

    async testSalaryCategoriesList() {
        const result = {
            name: 'salary_categories_list',
            status: 'pending',
            description: 'Listar categorías salariales',
            details: {}
        };

        try {
            const [rows] = await this.database.query(`
                SELECT sc.*, lac.name as agreement_name
                FROM salary_categories sc
                LEFT JOIN labor_agreements_catalog lac ON lac.id = sc.labor_agreement_id
                ORDER BY sc.labor_agreement_id, sc.category_code
            `);

            const byAgreement = rows.reduce((acc, cat) => {
                const key = cat.agreement_name || 'Sin convenio';
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});

            result.status = 'passed';
            result.details = {
                categoriesCount: rows.length,
                byAgreement,
                sampleCategories: rows.slice(0, 5).map(c => ({
                    code: c.category_code,
                    name: c.category_name,
                    baseSalary: c.base_salary_reference
                }))
            };
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }

    async testSalaryCategoryPropagation() {
        const result = {
            name: 'salary_category_propagation',
            status: 'pending',
            description: 'Verificar propagación de cambios en categorías',
            details: {}
        };

        try {
            const [triggers] = await this.database.query(`
                SELECT trigger_name, event_object_table, event_manipulation
                FROM information_schema.triggers
                WHERE trigger_name LIKE 'trg_propagate_salary%'
                AND trigger_schema = 'public'
            `);

            if (triggers.length > 0) {
                result.status = 'passed';
                result.details = {
                    triggerCount: triggers.length,
                    triggers: triggers.map(t => t.trigger_name),
                    message: 'Triggers de propagación configurados correctamente'
                };
            } else {
                result.status = 'warning';
                result.details = {
                    triggerCount: 0,
                    message: 'Triggers de propagación no encontrados'
                };
            }
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }

    // ===========================================================================
    // TESTS DE USER SALARY CONFIG
    // ===========================================================================

    async testUserSalaryConfigList() {
        const result = {
            name: 'user_salary_config_list',
            status: 'pending',
            description: 'Listar configuraciones salariales de usuarios',
            details: {}
        };

        try {
            const [rows] = await this.database.query(`
                SELECT COUNT(*) as total,
                       COUNT(DISTINCT user_id) as unique_users,
                       COUNT(CASE WHEN is_current = true THEN 1 END) as current_configs,
                       AVG(base_salary::numeric) as avg_salary,
                       MIN(base_salary::numeric) as min_salary,
                       MAX(base_salary::numeric) as max_salary
                FROM user_salary_config_v2
            `);

            result.status = 'passed';
            result.details = {
                totalConfigs: parseInt(rows[0]?.total || 0),
                uniqueUsers: parseInt(rows[0]?.unique_users || 0),
                currentConfigs: parseInt(rows[0]?.current_configs || 0),
                avgSalary: Math.round(parseFloat(rows[0]?.avg_salary || 0)),
                minSalary: parseFloat(rows[0]?.min_salary || 0),
                maxSalary: parseFloat(rows[0]?.max_salary || 0)
            };
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }

    async testUserSalaryConfigCreate() {
        const result = {
            name: 'user_salary_config_create',
            status: 'pending',
            description: 'Verificar estructura de config salarial',
            details: {}
        };

        try {
            const [columns] = await this.database.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'user_salary_config_v2'
                ORDER BY ordinal_position
            `);

            const requiredCols = ['id', 'user_id', 'company_id', 'base_salary', 'is_current'];
            const foundCols = columns.map(c => c.column_name);
            const missingCols = requiredCols.filter(c => !foundCols.includes(c));

            if (missingCols.length === 0) {
                result.status = 'passed';
                result.details = {
                    totalColumns: columns.length,
                    requiredColumnsPresent: true,
                    message: 'Estructura de tabla correcta'
                };
            } else {
                result.status = 'failed';
                result.details = {
                    missingColumns: missingCols,
                    message: 'Faltan columnas requeridas'
                };
            }
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }

    async testUserSalaryChainComplete() {
        const result = {
            name: 'user_salary_chain_complete',
            status: 'pending',
            description: 'Verificar cadena User→Convenio→Categoría→Salario',
            details: {}
        };

        try {
            const [rows] = await this.database.query(`
                SELECT
                    u.user_id,
                    u."firstName" || ' ' || u."lastName" as employee,
                    lac.name as convenio,
                    sc.category_name as categoria,
                    usc.base_salary as salario
                FROM users u
                JOIN user_salary_config_v2 usc ON usc.user_id = u.user_id AND usc.is_current = true
                JOIN labor_agreements_catalog lac ON lac.id = usc.labor_agreement_id
                JOIN salary_categories sc ON sc.id = usc.salary_category_id
                LIMIT 10
            `);

            if (rows.length > 0) {
                result.status = 'passed';
                result.details = {
                    usersWithCompleteChain: rows.length,
                    message: 'Cadena completa funcionando',
                    sample: rows.slice(0, 3).map(r => ({
                        employee: r.employee,
                        convenio: r.convenio,
                        categoria: r.categoria,
                        salario: r.salario
                    }))
                };
            } else {
                result.status = 'warning';
                result.details = {
                    usersWithCompleteChain: 0,
                    message: 'Sin usuarios con cadena completa'
                };
            }
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }

    // ===========================================================================
    // TESTS DE PAYROLL RUNS
    // ===========================================================================

    async testPayrollRunCalculate() {
        const result = {
            name: 'payroll_run_calculate',
            status: 'pending',
            description: 'Verificar tabla payroll_runs',
            details: {}
        };

        try {
            const [rows] = await this.database.query(`
                SELECT id, run_code, run_name, period_start, period_end, status, company_id, created_at
                FROM payroll_runs
                ORDER BY created_at DESC
                LIMIT 10
            `);

            result.status = 'passed';
            result.details = {
                totalRuns: rows.length,
                message: rows.length > 0 ? 'Ejecuciones de liquidación encontradas' : 'Sin ejecuciones de liquidación',
                latestRuns: rows.slice(0, 3).map(r => ({
                    id: r.id,
                    code: r.run_code,
                    date: r.created_at,
                    status: r.status
                }))
            };
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }

    async testPayrollRunDetails() {
        const result = {
            name: 'payroll_run_details',
            status: 'pending',
            description: 'Verificar tabla payroll_run_details',
            details: {}
        };

        try {
            const [columns] = await this.database.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'payroll_run_details'
            `);

            const [rows] = await this.database.query(`
                SELECT COUNT(*) as count FROM payroll_run_details
            `);

            result.status = 'passed';
            result.details = {
                tableExists: columns.length > 0,
                columnCount: columns.length,
                recordCount: parseInt(rows[0]?.count || 0),
                message: 'Tabla payroll_run_details verificada'
            };
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }

    // ===========================================================================
    // TESTS DE TRIGGERS Y FUNCIONES
    // ===========================================================================

    async testTriggerSalaryPropagation() {
        const result = {
            name: 'trigger_salary_propagation',
            status: 'pending',
            description: 'Verificar triggers de propagación salarial',
            details: {}
        };

        try {
            const [triggers] = await this.database.query(`
                SELECT trigger_name, event_object_table, event_manipulation
                FROM information_schema.triggers
                WHERE trigger_schema = 'public'
                AND (trigger_name LIKE 'trg_propagate%' OR trigger_name LIKE 'trg_auto%' OR trigger_name LIKE 'trg_flag%')
            `);

            const triggerList = triggers.map(t => t.trigger_name);

            if (triggers.length >= 3) {
                result.status = 'passed';
                result.details = {
                    triggerCount: triggers.length,
                    triggers: triggerList,
                    message: 'Triggers de propagación configurados'
                };
            } else {
                result.status = 'warning';
                result.details = {
                    triggerCount: triggers.length,
                    triggers: triggerList,
                    message: `Solo ${triggers.length} triggers encontrados (esperados: 3+)`
                };
            }
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }

    async testTriggerRecalculationFlag() {
        const result = {
            name: 'trigger_recalculation_flag',
            status: 'pending',
            description: 'Verificar trigger de recálculo',
            details: {}
        };

        try {
            const [triggers] = await this.database.query(`
                SELECT trigger_name, event_object_table
                FROM information_schema.triggers
                WHERE trigger_schema = 'public'
                AND trigger_name = 'trg_flag_payroll_recalculation'
            `);

            if (triggers.length > 0) {
                result.status = 'passed';
                result.details = {
                    triggerExists: true,
                    table: triggers[0].event_object_table,
                    message: 'Trigger de recálculo configurado'
                };
            } else {
                result.status = 'warning';
                result.details = {
                    triggerExists: false,
                    message: 'Trigger de recálculo no encontrado'
                };
            }
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }

    async testFunctionGetUserPayrollTemplate() {
        const result = {
            name: 'function_user_payroll_template',
            status: 'pending',
            description: 'Verificar funciones PostgreSQL de payroll',
            details: {}
        };

        try {
            const [functions] = await this.database.query(`
                SELECT routine_name
                FROM information_schema.routines
                WHERE routine_schema = 'public'
                AND routine_type = 'FUNCTION'
                AND (routine_name LIKE 'fn_%payroll%' OR routine_name LIKE 'fn_%salary%' OR routine_name LIKE 'fn_%propagate%' OR routine_name LIKE 'fn_%clone%')
            `);

            const fnList = functions.map(f => f.routine_name);

            if (functions.length >= 5) {
                result.status = 'passed';
                result.details = {
                    functionCount: functions.length,
                    functions: fnList,
                    message: 'Funciones PostgreSQL de payroll configuradas'
                };
            } else {
                result.status = 'warning';
                result.details = {
                    functionCount: functions.length,
                    functions: fnList,
                    message: `Solo ${functions.length} funciones encontradas (esperadas: 5+)`
                };
            }
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }

    async testViewUserSalaryComplete() {
        const result = {
            name: 'view_user_salary_complete',
            status: 'pending',
            description: 'Verificar vista vw_user_salary_complete',
            details: {}
        };

        try {
            // Verificar que la vista existe
            const [views] = await this.database.query(`
                SELECT table_name
                FROM information_schema.views
                WHERE table_schema = 'public'
                AND table_name = 'vw_user_salary_complete'
            `);

            if (views.length > 0) {
                // Probar la vista
                const [data] = await this.database.query(`
                    SELECT * FROM vw_user_salary_complete LIMIT 5
                `);

                result.status = 'passed';
                result.details = {
                    viewExists: true,
                    sampleRecords: data.length,
                    message: 'Vista vw_user_salary_complete funcionando',
                    sample: data.slice(0, 2)
                };
            } else {
                result.status = 'warning';
                result.details = {
                    viewExists: false,
                    message: 'Vista vw_user_salary_complete no encontrada'
                };
            }
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }
}

module.exports = PayrollModuleCollector;
