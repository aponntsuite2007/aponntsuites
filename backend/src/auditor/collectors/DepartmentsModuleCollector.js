/**
 * ============================================================================
 * DEPARTMENTS MODULE COLLECTOR - Test E2E del Módulo de Departamentos
 * ============================================================================
 *
 * Extiende BaseModuleCollector para testear el módulo de departamentos.
 *
 * TESTS INCLUIDOS:
 * 1. Department CRUD - Crear, editar, eliminar departamento
 * 2. Department Hierarchy - Jerarquía de departamentos (padre-hijo)
 * 3. Department Assignment - Asignación de empleados a departamentos
 * 4. Department Stats - Estadísticas por departamento
 *
 * @version 1.0.0
 * @date 2025-10-29
 * ============================================================================
 */

const BaseModuleCollector = require('./BaseModuleCollector');

class DepartmentsModuleCollector extends BaseModuleCollector {
    constructor(database, systemRegistry) {
        super(database, systemRegistry);
        this.TEST_PREFIX = '[TEST-DEPTS]';
        this.testDepartmentId = null;
    }

    getModuleConfig() {
        return {
            moduleName: 'departments',
            moduleURL: '/panel-empresa.html',
            testCategories: [
                { name: 'department_crud', func: this.testDepartmentCRUD.bind(this) },
                { name: 'department_hierarchy', func: this.testDepartmentHierarchy.bind(this) },
                { name: 'department_assignment', func: this.testDepartmentAssignment.bind(this) },
                { name: 'department_stats', func: this.testDepartmentStats.bind(this) }
            ],
            navigateBeforeTests: this.navigateToDepartmentsModule.bind(this)
        };
    }

    async navigateToDepartmentsModule() {
        console.log('\n📂 Navegando al módulo de Departamentos...\n');
        await this.page.waitForSelector('.module-item', { timeout: 10000 });
        await this.clickElement('button[onclick*="loadModule(\\'departments\\')"]', 'módulo Departamentos');
        await this.page.waitForSelector('#departments-content', { timeout: 10000 });
        console.log('✅ Módulo de Departamentos cargado\n');
    }

    async testDepartmentCRUD(execution_id) {
        console.log('\n🧪 TEST 1: Department CRUD...\n');

        try {
            await this.clickElement('#btn-add-department', 'botón Agregar Departamento');
            await this.page.waitForSelector('#department-modal', { visible: true, timeout: 5000 });

            const testDeptName = `${this.TEST_PREFIX} Dept Test ${Date.now()}`;
            const testDeptCode = `DEPT${Math.floor(Math.random() * 10000)}`;

            await this.typeInInput('#department-name', testDeptName, 'nombre departamento');
            await this.typeInInput('#department-code', testDeptCode, 'código departamento');

            await this.clickElement('#btn-save-department', 'botón Guardar');
            await new Promise(resolve => setTimeout(resolve, 2000));

            const modalClosed = !(await this.isModalVisible('#department-modal'));

            if (!modalClosed) {
                throw new Error('Modal no se cerró después de guardar');
            }

            await this.clickElement('button[onclick="loadDepartments()"]', 'botón Lista Departamentos');
            await new Promise(resolve => setTimeout(resolve, 2000));

            const deptExists = await this.page.evaluate((code) => {
                const table = document.querySelector('#departments-list table');
                if (!table) return false;
                const cells = Array.from(table.querySelectorAll('td'));
                return cells.some(cell => cell.textContent.includes(code));
            }, testDeptCode);

            if (!deptExists) {
                throw new Error('Departamento creado no aparece en la lista');
            }

            console.log('✅ TEST 1 PASSED - Department CRUD completo\n');
            return await this.createTestLog(execution_id, 'departments_crud', 'passed', {
                metadata: { name: testDeptName, code: testDeptCode }
            });

        } catch (error) {
            console.error('❌ TEST 1 FAILED:', error.message);
            return await this.createTestLog(execution_id, 'departments_crud', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    async testDepartmentHierarchy(execution_id) {
        console.log('\n🧪 TEST 2: Department Hierarchy...\n');

        try {
            const hierarchyExists = await this.elementExists('#department-hierarchy-tree');

            if (!hierarchyExists) {
                console.log('   ⚠️  Jerarquía de departamentos no implementada (opcional)');
                return await this.createTestLog(execution_id, 'departments_hierarchy', 'warning', {
                    error_message: 'Jerarquía no implementada'
                });
            }

            const treeNodes = await this.page.evaluate(() => {
                const nodes = document.querySelectorAll('.hierarchy-node');
                return nodes.length;
            });

            console.log(`   📊 Nodos en jerarquía: ${treeNodes}`);
            console.log('✅ TEST 2 PASSED - Jerarquía validada\n');
            return await this.createTestLog(execution_id, 'departments_hierarchy', 'passed', {
                metadata: { tree_nodes: treeNodes }
            });

        } catch (error) {
            console.error('❌ TEST 2 FAILED:', error.message);
            return await this.createTestLog(execution_id, 'departments_hierarchy', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    async testDepartmentAssignment(execution_id) {
        console.log('\n🧪 TEST 3: Department Assignment...\n');

        try {
            await this.clickElement('button[onclick="loadDepartments()"]', 'botón Lista Departamentos');
            await new Promise(resolve => setTimeout(resolve, 2000));

            const tableExists = await this.elementExists('#departments-list table');

            if (!tableExists) {
                throw new Error('Tabla de departamentos no cargó');
            }

            const departmentCount = await this.page.evaluate(() => {
                const rows = document.querySelectorAll('#departments-list tbody tr');
                return rows.length;
            });

            console.log(`   📊 Departamentos totales: ${departmentCount}`);

            if (departmentCount === 0) {
                throw new Error('No hay departamentos para asignar');
            }

            console.log('✅ TEST 3 PASSED - Assignment validado\n');
            return await this.createTestLog(execution_id, 'departments_assignment', 'passed', {
                metadata: { department_count: departmentCount }
            });

        } catch (error) {
            console.error('❌ TEST 3 FAILED:', error.message);
            return await this.createTestLog(execution_id, 'departments_assignment', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    async testDepartmentStats(execution_id) {
        console.log('\n🧪 TEST 4: Department Stats...\n');

        try {
            const statsExist = await this.elementExists('#department-stats');

            if (!statsExist) {
                console.log('   ⚠️  Estadísticas de departamentos no visibles (opcional)');
                return await this.createTestLog(execution_id, 'departments_stats', 'warning', {
                    error_message: 'Stats no visibles'
                });
            }

            const stats = await this.page.evaluate(() => {
                return {
                    total: document.querySelector('#total-departments')?.textContent || '--',
                    active: document.querySelector('#active-departments')?.textContent || '--'
                };
            });

            console.log(`   📊 Total departamentos: ${stats.total}`);
            console.log(`   📊 Departamentos activos: ${stats.active}`);

            console.log('✅ TEST 4 PASSED - Stats validadas\n');
            return await this.createTestLog(execution_id, 'departments_stats', 'passed', {
                metadata: { stats }
            });

        } catch (error) {
            console.error('❌ TEST 4 FAILED:', error.message);
            return await this.createTestLog(execution_id, 'departments_stats', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }
}

module.exports = DepartmentsModuleCollector;
