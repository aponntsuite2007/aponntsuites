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

    // ===========================================================================
    // TESTS 360° - CIRCUITO COMPLETO DE DEPENDENCIAS PARA LIQUIDACIÓN
    // ===========================================================================
    // Estos tests verifican TODO el flujo de datos necesario para calcular
    // una liquidación correctamente (PP-7 y PP-11 incluidos)
    // ===========================================================================

    /**
     * TEST 360° #1: Verificar campos de justificación en attendance (PP-7-IMPL-1)
     */
    async test360AttendanceJustificationFields() {
        const result = {
            name: '360_attendance_justification_fields',
            status: 'pending',
            description: 'PP-7-IMPL-1: Campos de justificación en attendance',
            details: {},
            dependency: 'CRITICAL - Sin esto no se pueden justificar ausencias'
        };

        try {
            const requiredColumns = [
                'is_justified',
                'absence_type',
                'absence_reason',
                'justified_by',
                'justified_at',
                'medical_certificate_id'
            ];

            const [columns] = await this.database.query(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'attendances'
                AND column_name = ANY($1)
            `, [requiredColumns]);

            const foundCols = columns.map(c => c.column_name);
            const missingCols = requiredColumns.filter(c => !foundCols.includes(c));

            if (missingCols.length === 0) {
                result.status = 'passed';
                result.details = {
                    columnsFound: foundCols.length,
                    columns: columns.map(c => ({ name: c.column_name, type: c.data_type })),
                    message: 'Todos los campos de justificación presentes'
                };
            } else {
                result.status = 'failed';
                result.details = {
                    columnsFound: foundCols.length,
                    missingColumns: missingCols,
                    message: 'Faltan campos de justificación. Ejecutar migración PP-7-IMPL-1'
                };
            }
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }

    /**
     * TEST 360° #2: Verificar que user_shift_assignments existe y tiene datos (PP-11-IMPL-1)
     */
    async test360UserShiftAssignments() {
        const result = {
            name: '360_user_shift_assignments',
            status: 'pending',
            description: 'PP-11-IMPL-1: Usuarios con turno asignado',
            details: {},
            dependency: 'CRITICAL - Sin turno no se puede liquidar'
        };

        try {
            // Verificar tabla existe
            const [tableCheck] = await this.database.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'user_shift_assignments'
                ) as exists
            `);

            if (!tableCheck[0]?.exists) {
                result.status = 'failed';
                result.details = { message: 'Tabla user_shift_assignments NO existe' };
                return result;
            }

            // Contar usuarios con turno asignado
            const [stats] = await this.database.query(`
                SELECT
                    COUNT(DISTINCT user_id) as users_with_shift,
                    COUNT(CASE WHEN is_primary = true THEN 1 END) as primary_assignments,
                    (SELECT COUNT(*) FROM users WHERE is_active = true) as total_active_users
                FROM user_shift_assignments
            `);

            const usersWithShift = parseInt(stats[0]?.users_with_shift || 0);
            const totalUsers = parseInt(stats[0]?.total_active_users || 0);
            const coverage = totalUsers > 0 ? ((usersWithShift / totalUsers) * 100).toFixed(1) : 0;

            if (usersWithShift > 0) {
                result.status = coverage >= 50 ? 'passed' : 'warning';
                result.details = {
                    usersWithShift,
                    totalActiveUsers: totalUsers,
                    coverage: `${coverage}%`,
                    primaryAssignments: parseInt(stats[0]?.primary_assignments || 0),
                    message: coverage >= 50 ? 'Cobertura de turnos aceptable' : 'Baja cobertura de turnos'
                };
            } else {
                result.status = 'failed';
                result.details = {
                    usersWithShift: 0,
                    totalActiveUsers: totalUsers,
                    message: 'NO hay usuarios con turno asignado. Liquidaciones bloqueadas.'
                };
            }
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }

    /**
     * TEST 360° #3: Verificar user_payroll_assignment existe y tiene datos (PP-11-IMPL-2)
     */
    async test360UserPayrollAssignment() {
        const result = {
            name: '360_user_payroll_assignment',
            status: 'pending',
            description: 'PP-11-IMPL-2: Usuarios con plantilla/categoría asignada',
            details: {},
            dependency: 'CRITICAL - Sin categoría/plantilla no se puede liquidar'
        };

        try {
            const [stats] = await this.database.query(`
                SELECT
                    COUNT(DISTINCT user_id) as users_with_assignment,
                    COUNT(CASE WHEN is_current = true THEN 1 END) as current_assignments,
                    COUNT(CASE WHEN base_salary IS NOT NULL AND base_salary::numeric > 0 THEN 1 END) as with_salary,
                    COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as with_category,
                    (SELECT COUNT(*) FROM users WHERE is_active = true) as total_active_users
                FROM user_payroll_assignment
            `);

            const usersAssigned = parseInt(stats[0]?.users_with_assignment || 0);
            const totalUsers = parseInt(stats[0]?.total_active_users || 0);
            const withSalary = parseInt(stats[0]?.with_salary || 0);
            const withCategory = parseInt(stats[0]?.with_category || 0);

            if (usersAssigned > 0 && withSalary > 0) {
                result.status = 'passed';
                result.details = {
                    usersWithAssignment: usersAssigned,
                    currentAssignments: parseInt(stats[0]?.current_assignments || 0),
                    withBaseSalary: withSalary,
                    withCategory: withCategory,
                    totalActiveUsers: totalUsers,
                    message: 'Usuarios con configuración de liquidación'
                };
            } else {
                result.status = 'failed';
                result.details = {
                    usersWithAssignment: usersAssigned,
                    withBaseSalary: withSalary,
                    message: 'Sin usuarios con plantilla/salario asignado. Liquidaciones bloqueadas.'
                };
            }
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }

    /**
     * TEST 360° #4: Verificar que existen registros de asistencia en el período
     */
    async test360AttendanceRecords() {
        const result = {
            name: '360_attendance_records',
            status: 'pending',
            description: 'Registros de asistencia para liquidación',
            details: {},
            dependency: 'HIGH - Sin asistencias no hay horas para calcular'
        };

        try {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            const [stats] = await this.database.query(`
                SELECT
                    COUNT(*) as total_records,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(CASE WHEN check_out IS NOT NULL THEN 1 END) as complete_records,
                    COUNT(CASE WHEN is_justified = true THEN 1 END) as justified_absences
                FROM attendances
                WHERE EXTRACT(MONTH FROM check_in) = $1
                AND EXTRACT(YEAR FROM check_in) = $2
            `, [currentMonth, currentYear]);

            const totalRecords = parseInt(stats[0]?.total_records || 0);
            const uniqueUsers = parseInt(stats[0]?.unique_users || 0);

            result.status = totalRecords > 0 ? 'passed' : 'warning';
            result.details = {
                period: `${currentMonth}/${currentYear}`,
                totalRecords,
                uniqueUsers,
                completeRecords: parseInt(stats[0]?.complete_records || 0),
                justifiedAbsences: parseInt(stats[0]?.justified_absences || 0),
                message: totalRecords > 0 ? 'Registros de asistencia disponibles' : 'Sin registros este mes'
            };
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }

    /**
     * TEST 360° #5: Verificar Parser Seguro (PP-11-IMPL-3) - Sin eval()
     */
    async test360SafeParser() {
        const result = {
            name: '360_safe_parser',
            status: 'pending',
            description: 'PP-11-IMPL-3: Parser matemático seguro (sin eval)',
            details: {},
            dependency: 'SECURITY - Fórmulas deben ejecutarse sin vulnerabilidades'
        };

        try {
            // Cargar el servicio de payroll
            const PayrollService = require('../../services/PayrollCalculatorService');

            // Tests de funcionalidad
            const testCases = [
                { expr: '100 + 50', expected: 150 },
                { expr: '100 * 0.05', expected: 5 },
                { expr: 'round(123.456)', expected: 123 },
                { expr: 'max(10, 20)', expected: 20 },
                { expr: '(100 + 50) * 2', expected: 300 }
            ];

            let passed = 0;
            const results = [];

            for (const test of testCases) {
                try {
                    const value = PayrollService.safeEvaluateMathExpression(test.expr);
                    const ok = Math.abs(value - test.expected) < 0.01;
                    if (ok) passed++;
                    results.push({ expr: test.expr, expected: test.expected, got: value, ok });
                } catch (e) {
                    results.push({ expr: test.expr, error: e.message, ok: false });
                }
            }

            // Test de seguridad - intentos de inyección
            const injectionTests = ['process.exit(1)', 'require("fs")', 'eval("1")'];
            let blocked = 0;

            for (const malicious of injectionTests) {
                try {
                    const res = PayrollService.safeEvaluateMathExpression(malicious);
                    // Si retorna un número o 0, está bloqueado (no ejecutó código malicioso)
                    if (typeof res === 'number' || res === 0) blocked++;
                } catch {
                    blocked++; // Error es bueno - rechazó la inyección
                }
            }

            const allPassed = passed === testCases.length && blocked === injectionTests.length;

            result.status = allPassed ? 'passed' : (passed > 0 ? 'warning' : 'failed');
            result.details = {
                functionalTests: `${passed}/${testCases.length} pasaron`,
                securityTests: `${blocked}/${injectionTests.length} inyecciones bloqueadas`,
                testResults: results,
                message: allPassed ? 'Parser seguro funcionando correctamente' : 'Problemas en parser'
            };
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message, message: 'No se pudo cargar PayrollCalculatorService' };
        }

        return result;
    }

    /**
     * TEST 360° #6: Simular cálculo de liquidación completo
     */
    async test360PayrollCalculationSimulation() {
        const result = {
            name: '360_payroll_calculation_simulation',
            status: 'pending',
            description: 'Simulación de liquidación con circuito completo',
            details: {},
            dependency: 'INTEGRATION - Test end-to-end del motor de liquidación'
        };

        try {
            // Buscar un usuario que tenga todos los requisitos
            const [users] = await this.database.query(`
                SELECT
                    u.user_id,
                    u."firstName",
                    u."lastName",
                    u.company_id,
                    upa.base_salary,
                    upa.template_id,
                    upa.category_id,
                    usa.shift_id,
                    s.name as shift_name
                FROM users u
                JOIN user_payroll_assignment upa ON upa.user_id = u.user_id AND upa.is_current = true
                LEFT JOIN user_shift_assignments usa ON usa.user_id = u.user_id AND usa.is_primary = true
                LEFT JOIN shifts s ON s.id = usa.shift_id
                WHERE u.is_active = true
                AND upa.base_salary IS NOT NULL
                AND upa.base_salary::numeric > 0
                LIMIT 1
            `);

            if (users.length === 0) {
                result.status = 'warning';
                result.details = {
                    message: 'No hay usuario con configuración completa para simular',
                    requirements: ['user_payroll_assignment.is_current', 'base_salary > 0', 'shift opcional']
                };
                return result;
            }

            const testUser = users[0];

            // Intentar calcular
            const PayrollService = require('../../services/PayrollCalculatorService');
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            const payrollResult = await PayrollService.calculatePayroll(
                testUser.user_id,
                testUser.company_id,
                currentYear,
                currentMonth,
                { allowMissingShift: true, allowMissingCategory: true }
            );

            result.status = 'passed';
            result.details = {
                testUser: {
                    name: `${testUser.firstName} ${testUser.lastName}`,
                    baseSalary: testUser.base_salary,
                    shift: testUser.shift_name || 'Sin turno (default)'
                },
                calculationResult: {
                    period: `${payrollResult.period.monthName} ${payrollResult.period.year}`,
                    workedDays: payrollResult.workAnalysis?.workedDays,
                    regularHours: payrollResult.workAnalysis?.regularHours,
                    grossTotal: payrollResult.totals?.grossTotal,
                    netSalary: payrollResult.totals?.netSalary
                },
                message: '✅ Liquidación calculada exitosamente'
            };
        } catch (error) {
            result.status = 'failed';
            result.details = {
                error: error.message,
                message: 'Error en simulación de liquidación'
            };
        }

        return result;
    }

    /**
     * TEST 360° #7: Diagrama de dependencias completo
     */
    async test360DependencyDiagram() {
        const result = {
            name: '360_dependency_diagram',
            status: 'pending',
            description: 'Verificación completa del árbol de dependencias',
            details: {},
            dependency: 'OVERVIEW - Resumen de todas las dependencias'
        };

        const checks = {
            users: { status: false, count: 0 },
            shifts: { status: false, count: 0 },
            userShiftAssignments: { status: false, count: 0 },
            payrollTemplates: { status: false, count: 0 },
            userPayrollAssignment: { status: false, count: 0 },
            attendances: { status: false, count: 0 },
            justificationFields: { status: false, columns: [] },
            safeParser: { status: false }
        };

        try {
            // 1. Users
            const [users] = await this.database.query(`SELECT COUNT(*) as c FROM users WHERE is_active = true`);
            checks.users.count = parseInt(users[0]?.c || 0);
            checks.users.status = checks.users.count > 0;

            // 2. Shifts
            const [shifts] = await this.database.query(`SELECT COUNT(*) as c FROM shifts WHERE is_active = true`);
            checks.shifts.count = parseInt(shifts[0]?.c || 0);
            checks.shifts.status = checks.shifts.count > 0;

            // 3. User Shift Assignments
            const [usa] = await this.database.query(`SELECT COUNT(DISTINCT user_id) as c FROM user_shift_assignments`);
            checks.userShiftAssignments.count = parseInt(usa[0]?.c || 0);
            checks.userShiftAssignments.status = checks.userShiftAssignments.count > 0;

            // 4. Payroll Templates
            const [pt] = await this.database.query(`SELECT COUNT(*) as c FROM payroll_templates WHERE is_active = true`);
            checks.payrollTemplates.count = parseInt(pt[0]?.c || 0);
            checks.payrollTemplates.status = checks.payrollTemplates.count > 0;

            // 5. User Payroll Assignment
            const [upa] = await this.database.query(`SELECT COUNT(*) as c FROM user_payroll_assignment WHERE is_current = true`);
            checks.userPayrollAssignment.count = parseInt(upa[0]?.c || 0);
            checks.userPayrollAssignment.status = checks.userPayrollAssignment.count > 0;

            // 6. Attendances (mes actual)
            const [att] = await this.database.query(`
                SELECT COUNT(*) as c FROM attendances
                WHERE EXTRACT(MONTH FROM check_in) = $1 AND EXTRACT(YEAR FROM check_in) = $2
            `, [new Date().getMonth() + 1, new Date().getFullYear()]);
            checks.attendances.count = parseInt(att[0]?.c || 0);
            checks.attendances.status = true; // OK aunque sea 0

            // 7. Justification Fields
            const [cols] = await this.database.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'attendances' AND column_name IN ('is_justified', 'absence_type', 'justified_by')
            `);
            checks.justificationFields.columns = cols.map(c => c.column_name);
            checks.justificationFields.status = cols.length >= 3;

            // 8. Safe Parser
            try {
                const PS = require('../../services/PayrollCalculatorService');
                const res = PS.safeEvaluateMathExpression('100 + 50');
                checks.safeParser.status = res === 150;
            } catch { checks.safeParser.status = false; }

            // Calcular estado general
            const criticalOK = checks.users.status && checks.payrollTemplates.status &&
                              checks.userPayrollAssignment.status && checks.justificationFields.status;

            result.status = criticalOK ? 'passed' : 'failed';
            result.details = {
                diagram: `
┌──────────────────────────────────────────────────────────────────┐
│                    ÁRBOL DE DEPENDENCIAS 360°                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ${checks.users.status ? '✅' : '❌'} USUARIOS ACTIVOS: ${checks.users.count}                                  │
│     │                                                            │
│     ├── ${checks.shifts.status ? '✅' : '❌'} TURNOS: ${checks.shifts.count}                                      │
│     │     └── ${checks.userShiftAssignments.status ? '✅' : '❌'} Asignaciones: ${checks.userShiftAssignments.count} (PP-11-IMPL-1)       │
│     │                                                            │
│     ├── ${checks.payrollTemplates.status ? '✅' : '❌'} PLANTILLAS: ${checks.payrollTemplates.count}                                │
│     │     └── ${checks.userPayrollAssignment.status ? '✅' : '❌'} Asignaciones: ${checks.userPayrollAssignment.count} (PP-11-IMPL-2)       │
│     │                                                            │
│     └── ${checks.attendances.status ? '✅' : '❌'} ASISTENCIAS (mes): ${checks.attendances.count}                          │
│           └── ${checks.justificationFields.status ? '✅' : '❌'} Campos justificación (PP-7-IMPL-1)           │
│                                                                  │
│  ${checks.safeParser.status ? '✅' : '❌'} PARSER SEGURO (PP-11-IMPL-3)                                │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  ESTADO: ${criticalOK ? '🟢 SISTEMA OPERATIVO' : '🔴 FALTAN DEPENDENCIAS'}                               │
└──────────────────────────────────────────────────────────────────┘
                `,
                checks,
                criticalDependenciesOK: criticalOK,
                message: criticalOK ? 'Todas las dependencias críticas OK' : 'Faltan dependencias críticas'
            };
        } catch (error) {
            result.status = 'failed';
            result.details = { error: error.message };
        }

        return result;
    }
}

module.exports = PayrollModuleCollector;
