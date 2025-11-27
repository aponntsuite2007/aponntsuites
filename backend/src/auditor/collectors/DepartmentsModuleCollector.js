/**
 * ============================================================================
 * DEPARTMENTS MODULE COLLECTOR - Test E2E del Módulo de Departamentos
 * ============================================================================
 *
 * Extiende BaseModuleCollector para testear el módulo de departamentos.
 *
 * TESTS INCLUIDOS:
 * 1. Department CRUD - Crear, editar, eliminar departamento
 * 2. Department List & Filters - Listado y filtros
 * 3. Department Stats - Estadísticas de departamentos
 * 4. Department Users - Usuarios asignados
 *
 * @version 1.0.0
 * @date 2025-11-27
 * ============================================================================
 */

const BaseModuleCollector = require('./BaseModuleCollector');

class DepartmentsModuleCollector extends BaseModuleCollector {
    constructor(database, systemRegistry, baseURL = null) {
        super(database, systemRegistry, baseURL);
        this.TEST_PREFIX = '[TEST-DEPARTMENTS]';
        this.testDepartmentData = null;
    }

    /**
     * Configuración específica del módulo de departamentos
     */
    getModuleConfig() {
        return {
            moduleName: 'departments',
            moduleURL: '/panel-empresa.html',
            testCategories: [
                // CRUD
                { name: 'department_list', func: this.testDepartmentList.bind(this) },
                { name: 'department_create', func: this.testDepartmentCreate.bind(this) },
                { name: 'department_update', func: this.testDepartmentUpdate.bind(this) },
                { name: 'department_delete', func: this.testDepartmentDelete.bind(this) },

                // Verificación de BD
                { name: 'department_db_structure', func: this.testDepartmentDBStructure.bind(this) },
                { name: 'department_user_count', func: this.testDepartmentUserCount.bind(this) }
            ],
            navigateBeforeTests: this.navigateToDepartmentsModule.bind(this)
        };
    }

    /**
     * Navegación inicial al módulo de departamentos
     */
    async navigateToDepartmentsModule() {
        console.log('\n📂 Navegando al módulo de Departamentos...\n');

        if (this.page) {
            await this.page.evaluate(() => {
                if (typeof window.showModuleContent === 'function') {
                    window.showModuleContent('departments', 'Gestión de Departamentos');
                }
            });
            await this.page.waitForTimeout(2000);
        }
    }

    // ========================================================================
    // TESTS DE BD (sin navegador)
    // ========================================================================

    /**
     * Test: Verificar estructura de tabla departments
     */
    async testDepartmentDBStructure() {
        console.log(`${this.TEST_PREFIX} Verificando estructura de tabla departments...`);

        try {
            const [columns] = await this.database.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'departments'
                ORDER BY ordinal_position
            `);

            const requiredColumns = ['id', 'name', 'company_id'];
            const foundColumns = columns.map(c => c.column_name);

            const missingColumns = requiredColumns.filter(c => !foundColumns.includes(c));

            if (missingColumns.length > 0) {
                return {
                    name: 'department_db_structure',
                    status: 'failed',
                    details: {
                        message: `Columnas faltantes: ${missingColumns.join(', ')}`,
                        foundColumns: foundColumns.length,
                        missingColumns
                    }
                };
            }

            return {
                name: 'department_db_structure',
                status: 'passed',
                details: {
                    message: 'Estructura de tabla OK',
                    totalColumns: columns.length,
                    columns: foundColumns.slice(0, 10)
                }
            };
        } catch (error) {
            return {
                name: 'department_db_structure',
                status: 'failed',
                details: { error: error.message }
            };
        }
    }

    /**
     * Test: Listar departamentos desde BD
     */
    async testDepartmentList() {
        console.log(`${this.TEST_PREFIX} Listando departamentos desde BD...`);

        try {
            const [departments] = await this.database.query(`
                SELECT id, name, company_id, description, is_active, created_at
                FROM departments
                ORDER BY name
                LIMIT 20
            `);

            if (departments.length === 0) {
                return {
                    name: 'department_list',
                    status: 'warning',
                    details: {
                        message: 'No hay departamentos en BD',
                        count: 0
                    }
                };
            }

            return {
                name: 'department_list',
                status: 'passed',
                details: {
                    message: `${departments.length} departamentos encontrados`,
                    count: departments.length,
                    sample: departments.slice(0, 3).map(d => ({ id: d.id, name: d.name }))
                }
            };
        } catch (error) {
            return {
                name: 'department_list',
                status: 'failed',
                details: { error: error.message }
            };
        }
    }

    /**
     * Test: Crear departamento de prueba
     */
    async testDepartmentCreate() {
        console.log(`${this.TEST_PREFIX} Creando departamento de prueba...`);

        try {
            // Obtener company_id válido
            const [companies] = await this.database.query(`
                SELECT id FROM companies WHERE is_active = true LIMIT 1
            `);

            if (companies.length === 0) {
                return {
                    name: 'department_create',
                    status: 'warning',
                    details: { message: 'No hay empresas activas para crear departamento' }
                };
            }

            const companyId = companies[0].id;
            const testName = `TEST_DEPT_${Date.now()}`;

            // Crear departamento
            const [result] = await this.database.query(`
                INSERT INTO departments (name, company_id, description, is_active, created_at)
                VALUES ($1, $2, 'Departamento de prueba Phase4', true, NOW())
                RETURNING id, name
            `, {
                bind: [testName, companyId]
            });

            if (result.length > 0) {
                this.testDepartmentData = { id: result[0].id, name: result[0].name };

                return {
                    name: 'department_create',
                    status: 'passed',
                    details: {
                        message: 'Departamento creado exitosamente',
                        departmentId: result[0].id,
                        departmentName: result[0].name
                    }
                };
            }

            return {
                name: 'department_create',
                status: 'failed',
                details: { message: 'No se pudo crear el departamento' }
            };
        } catch (error) {
            return {
                name: 'department_create',
                status: 'failed',
                details: { error: error.message }
            };
        }
    }

    /**
     * Test: Actualizar departamento de prueba
     */
    async testDepartmentUpdate() {
        console.log(`${this.TEST_PREFIX} Actualizando departamento de prueba...`);

        try {
            if (!this.testDepartmentData?.id) {
                // Buscar un departamento existente para actualizar
                const [depts] = await this.database.query(`
                    SELECT id, name FROM departments LIMIT 1
                `);

                if (depts.length === 0) {
                    return {
                        name: 'department_update',
                        status: 'warning',
                        details: { message: 'No hay departamentos para actualizar' }
                    };
                }

                this.testDepartmentData = { id: depts[0].id, name: depts[0].name };
            }

            const newDescription = `Updated by Phase4 at ${new Date().toISOString()}`;

            await this.database.query(`
                UPDATE departments
                SET description = $1, updated_at = NOW()
                WHERE id = $2
            `, {
                bind: [newDescription, this.testDepartmentData.id]
            });

            // Verificar update
            const [verify] = await this.database.query(`
                SELECT description FROM departments WHERE id = $1
            `, {
                bind: [this.testDepartmentData.id]
            });

            if (verify.length > 0 && verify[0].description === newDescription) {
                return {
                    name: 'department_update',
                    status: 'passed',
                    details: {
                        message: 'Departamento actualizado exitosamente',
                        departmentId: this.testDepartmentData.id,
                        newDescription
                    }
                };
            }

            return {
                name: 'department_update',
                status: 'failed',
                details: { message: 'Update no se reflejó en BD' }
            };
        } catch (error) {
            return {
                name: 'department_update',
                status: 'failed',
                details: { error: error.message }
            };
        }
    }

    /**
     * Test: Eliminar departamento de prueba (soft delete)
     */
    async testDepartmentDelete() {
        console.log(`${this.TEST_PREFIX} Eliminando departamento de prueba...`);

        try {
            // Buscar departamento de prueba
            const [testDepts] = await this.database.query(`
                SELECT id, name FROM departments
                WHERE name LIKE 'TEST_DEPT_%'
                ORDER BY created_at DESC
                LIMIT 1
            `);

            if (testDepts.length === 0) {
                return {
                    name: 'department_delete',
                    status: 'warning',
                    details: { message: 'No hay departamentos de prueba para eliminar' }
                };
            }

            const deptId = testDepts[0].id;

            // Soft delete (desactivar)
            await this.database.query(`
                UPDATE departments SET is_active = false WHERE id = $1
            `, {
                bind: [deptId]
            });

            // Verificar
            const [verify] = await this.database.query(`
                SELECT is_active FROM departments WHERE id = $1
            `, {
                bind: [deptId]
            });

            if (verify.length > 0 && verify[0].is_active === false) {
                // Limpiar: eliminar físicamente
                await this.database.query(`DELETE FROM departments WHERE id = $1`, {
                    bind: [deptId]
                });

                return {
                    name: 'department_delete',
                    status: 'passed',
                    details: {
                        message: 'Departamento eliminado exitosamente',
                        deletedId: deptId
                    }
                };
            }

            return {
                name: 'department_delete',
                status: 'failed',
                details: { message: 'No se pudo eliminar el departamento' }
            };
        } catch (error) {
            return {
                name: 'department_delete',
                status: 'failed',
                details: { error: error.message }
            };
        }
    }

    /**
     * Test: Contar usuarios por departamento
     */
    async testDepartmentUserCount() {
        console.log(`${this.TEST_PREFIX} Contando usuarios por departamento...`);

        try {
            const [counts] = await this.database.query(`
                SELECT d.id, d.name, COUNT(u.user_id) as user_count
                FROM departments d
                LEFT JOIN users u ON u.department_id = d.id
                GROUP BY d.id, d.name
                ORDER BY user_count DESC
                LIMIT 10
            `);

            const totalUsers = counts.reduce((sum, d) => sum + parseInt(d.user_count || 0), 0);

            return {
                name: 'department_user_count',
                status: 'passed',
                details: {
                    message: `${counts.length} departamentos con ${totalUsers} usuarios totales`,
                    departmentsChecked: counts.length,
                    totalUsers,
                    top3: counts.slice(0, 3).map(d => ({ name: d.name, users: d.user_count }))
                }
            };
        } catch (error) {
            return {
                name: 'department_user_count',
                status: 'failed',
                details: { error: error.message }
            };
        }
    }
}

module.exports = DepartmentsModuleCollector;
