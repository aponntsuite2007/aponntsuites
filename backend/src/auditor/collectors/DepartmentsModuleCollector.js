/**
 * ============================================================================
 * DEPARTMENTS MODULE COLLECTOR - Testing CRUD Completo con PostgreSQL
 * ============================================================================
 *
 * Test completo del módulo de Departamentos con navegación real, CRUD y
 * verificación de persistencia en PostgreSQL.
 *
 * TESTS INCLUIDOS:
 * 1. Navegación al módulo
 * 2. Carga de lista de departamentos
 * 3. CREATE - Crear departamento con GPS
 * 4. READ - Verificar en lista y BD
 * 5. UPDATE - Editar departamento
 * 6. DELETE - Eliminar departamento
 * 7. Estadísticas
 *
 * @version 2.0.0
 * @date 2025-11-08
 * @pattern Sigue patrón de UsersCrudCollector.js
 * ============================================================================
 */

const BaseModuleCollector = require('./BaseModuleCollector');
const { Pool } = require('pg');

class DepartmentsModuleCollector extends BaseModuleCollector {
    constructor(database, systemRegistry) {
        super(database, systemRegistry);
        this.TEST_PREFIX = '[DEPT-TEST]';
        this.testDepartmentId = null;
        this.testDepartmentName = null;

        // PostgreSQL connection
        this.pool = new Pool({
            host: process.env.POSTGRES_HOST || 'localhost',
            port: process.env.POSTGRES_PORT || 5432,
            database: process.env.POSTGRES_DB || 'attendance_system',
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD
        });
    }

    getModuleConfig() {
        return {
            moduleName: 'departments',
            moduleURL: '/panel-empresa.html',
            testCategories: [
                { name: 'departments_navigation', func: this.testNavigation.bind(this) },
                { name: 'departments_list_load', func: this.testListLoad.bind(this) },
                { name: 'departments_create', func: this.testCreate.bind(this) },
                { name: 'departments_read', func: this.testRead.bind(this) },
                { name: 'departments_update', func: this.testUpdate.bind(this) },
                { name: 'departments_delete', func: this.testDelete.bind(this) },
                { name: 'departments_stats', func: this.testStats.bind(this) }
            ],
            navigateBeforeTests: this.navigateToDepartmentsModule.bind(this)
        };
    }

    /**
     * Helper: Ejecutar query en PostgreSQL
     */
    async queryDB(sql, params = []) {
        try {
            const result = await this.pool.query(sql, params);
            return result.rows;
        } catch (error) {
            console.error('❌ Error en query PostgreSQL:', error.message);
            throw error;
        }
    }

    /**
     * PASO 1: Navegar al módulo de Departamentos
     */
    async navigateToDepartmentsModule() {
        console.log('\n📂 [DEPARTMENTS] Navegando al módulo de Departamentos...');

        try {
            // Esperar a que cargue el panel
            await this.page.waitForSelector('a[href="#departments"]', { timeout: 10000 });

            // Click en el link de departamentos
            await this.page.click('a[href="#departments"]');
            await this.page.waitForTimeout(2000);

            // Verificar que el contenido del módulo se cargó
            const moduleLoaded = await this.page.evaluate(() => {
                const content = document.getElementById('mainContent');
                return content && content.innerHTML.includes('Gestión de Departamentos');
            });

            if (!moduleLoaded) {
                throw new Error('Módulo de departamentos no cargó correctamente');
            }

            console.log('   ✅ Módulo de Departamentos cargado correctamente\n');
            return true;

        } catch (error) {
            console.error('   ❌ Error navegando al módulo:', error.message);
            throw error;
        }
    }

    /**
     * TEST 1: Navegación al módulo
     */
    async testNavigation(execution_id) {
        console.log('\n🧪 TEST 1: NAVEGACIÓN AL MÓDULO');
        console.log('─'.repeat(80));

        try {
            const hasQuickActions = await this.page.evaluate(() => {
                return document.querySelector('.quick-actions') !== null;
            });

            if (!hasQuickActions) {
                throw new Error('Quick actions no encontradas');
            }

            const buttons = await this.page.evaluate(() => {
                const actions = document.querySelector('.quick-actions');
                return actions ? actions.querySelectorAll('button').length : 0;
            });

            console.log(`   ✅ Quick actions visible con ${buttons} botones`);
            console.log('   ✅ TEST 1 PASSED\n');

            return await this.createTestLog(execution_id, 'departments_navigation', 'passed', {
                metadata: { buttons_count: buttons }
            });

        } catch (error) {
            console.error('   ❌ TEST 1 FAILED:', error.message);
            return await this.createTestLog(execution_id, 'departments_navigation', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    /**
     * TEST 2: Cargar lista de departamentos
     */
    async testListLoad(execution_id) {
        console.log('\n🧪 TEST 2: CARGAR LISTA DE DEPARTAMENTOS');
        console.log('─'.repeat(80));

        try {
            // Click en botón "Lista de Departamentos"
            await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const loadBtn = buttons.find(btn => btn.textContent.includes('Lista de Departamentos'));
                if (loadBtn) loadBtn.click();
            });

            await this.page.waitForTimeout(3000);

            // Verificar que la tabla se cargó
            const tableLoaded = await this.page.evaluate(() => {
                const container = document.getElementById('departments-list');
                if (!container) return false;

                const table = container.querySelector('table.users-table');
                if (!table) return false;

                const rows = table.querySelectorAll('tbody tr');
                return rows.length;
            });

            if (tableLoaded === false) {
                throw new Error('Tabla de departamentos no cargó');
            }

            console.log(`   ✅ Tabla cargada con ${tableLoaded} departamentos`);
            console.log('   ✅ TEST 2 PASSED\n');

            return await this.createTestLog(execution_id, 'departments_list_load', 'passed', {
                metadata: { departments_count: tableLoaded }
            });

        } catch (error) {
            console.error('   ❌ TEST 2 FAILED:', error.message);
            return await this.createTestLog(execution_id, 'departments_list_load', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    /**
     * TEST 3: CREATE - Crear nuevo departamento
     */
    async testCreate(execution_id) {
        console.log('\n🧪 TEST 3: CREATE - CREAR NUEVO DEPARTAMENTO');
        console.log('─'.repeat(80));

        try {
            // Click en botón "Crear Departamento"
            await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const createBtn = buttons.find(btn => btn.textContent.includes('Crear Departamento'));
                if (createBtn) createBtn.click();
            });

            await this.page.waitForTimeout(2000);

            // Verificar que el modal se abrió
            const modalOpened = await this.page.evaluate(() => {
                const modal = document.querySelector('.modal-overlay');
                return modal !== null;
            });

            if (!modalOpened) {
                throw new Error('Modal de crear departamento no se abrió');
            }

            console.log('   ✅ Modal CREATE abierto');

            // Generar datos de prueba
            this.testDepartmentName = `${this.TEST_PREFIX} Dept ${Date.now()}`;
            const testDescription = `Departamento de prueba automatizado - ${new Date().toISOString()}`;
            const testAddress = 'Av. Siempreviva 742, Springfield';
            const testGpsLat = -34.603722;
            const testGpsLng = -58.381592;
            const testRadius = 150;

            console.log(`   📝 Datos de prueba:`);
            console.log(`      Nombre: ${this.testDepartmentName}`);
            console.log(`      GPS: ${testGpsLat}, ${testGpsLng}`);
            console.log(`      Radio: ${testRadius}m`);

            // Llenar formulario
            await this.page.fill('#newDeptName', this.testDepartmentName);
            await this.page.fill('#newDeptDescription', testDescription);
            await this.page.fill('#newDeptAddress', testAddress);
            await this.page.fill('#newDeptGpsLat', testGpsLat.toString());
            await this.page.fill('#newDeptGpsLng', testGpsLng.toString());
            await this.page.fill('#newDeptCoverageRadius', testRadius.toString());

            console.log('   ✅ Formulario llenado');

            // Click en Guardar
            await this.page.evaluate(() => {
                const modal = document.querySelector('.modal-overlay');
                if (!modal) return;
                const saveBtn = modal.querySelector('button.btn-primary');
                if (saveBtn) saveBtn.click();
            });

            await this.page.waitForTimeout(3000);

            // Verificar que el modal se cerró
            const modalClosed = await this.page.evaluate(() => {
                const modal = document.querySelector('.modal-overlay');
                return modal === null;
            });

            if (!modalClosed) {
                throw new Error('Modal no se cerró - posible error en guardado');
            }

            console.log('   ✅ Modal cerrado (guardado exitoso)');

            // Verificar en BD
            const dbResult = await this.queryDB(`
                SELECT id, name, description, address, gps_lat, gps_lng, coverage_radius, is_active
                FROM departments
                WHERE name = $1
                ORDER BY created_at DESC
                LIMIT 1
            `, [this.testDepartmentName]);

            if (dbResult.length === 0) {
                throw new Error('Departamento no encontrado en PostgreSQL');
            }

            this.testDepartmentId = dbResult[0].id;

            console.log(`   ✅ Departamento guardado en PostgreSQL (ID: ${this.testDepartmentId})`);
            console.log(`      • Nombre: ${dbResult[0].name}`);
            console.log(`      • GPS: ${dbResult[0].gps_lat}, ${dbResult[0].gps_lng}`);
            console.log(`      • Radio: ${dbResult[0].coverage_radius}m`);
            console.log(`      • Activo: ${dbResult[0].is_active}`);
            console.log('   ✅ TEST 3 PASSED\n');

            return await this.createTestLog(execution_id, 'departments_create', 'passed', {
                metadata: {
                    department_id: this.testDepartmentId,
                    department_name: this.testDepartmentName
                }
            });

        } catch (error) {
            console.error('   ❌ TEST 3 FAILED:', error.message);
            return await this.createTestLog(execution_id, 'departments_create', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    /**
     * TEST 4: READ - Verificar departamento en lista
     */
    async testRead(execution_id) {
        console.log('\n🧪 TEST 4: READ - VERIFICAR EN LISTA');
        console.log('─'.repeat(80));

        try {
            if (!this.testDepartmentId) {
                throw new Error('No hay departamento creado para verificar');
            }

            // Recargar lista
            await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const loadBtn = buttons.find(btn => btn.textContent.includes('Lista de Departamentos'));
                if (loadBtn) loadBtn.click();
            });

            await this.page.waitForTimeout(3000);

            // Buscar en la tabla
            const foundInTable = await this.page.evaluate((deptName) => {
                const container = document.getElementById('departments-list');
                if (!container) return false;

                const table = container.querySelector('table.users-table');
                if (!table) return false;

                const cells = Array.from(table.querySelectorAll('tbody td'));
                return cells.some(cell => cell.textContent.includes(deptName));
            }, this.testDepartmentName);

            if (!foundInTable) {
                throw new Error('Departamento no encontrado en la tabla');
            }

            console.log(`   ✅ Departamento "${this.testDepartmentName}" visible en tabla`);

            // Verificar botones de acción
            const hasActionButtons = await this.page.evaluate((deptName) => {
                const container = document.getElementById('departments-list');
                if (!container) return false;

                const rows = Array.from(container.querySelectorAll('tbody tr'));
                const row = rows.find(r => r.textContent.includes(deptName));
                if (!row) return false;

                const viewBtn = row.querySelector('button[onclick*="viewDepartment"]');
                const editBtn = row.querySelector('button[onclick*="editDepartment"]');
                const deleteBtn = row.querySelector('button[onclick*="deleteDepartment"]');

                return viewBtn && editBtn && deleteBtn;
            }, this.testDepartmentName);

            if (!hasActionButtons) {
                throw new Error('Botones de acción no encontrados en la fila');
            }

            console.log('   ✅ Botones de acción presentes (VER, EDITAR, ELIMINAR)');
            console.log('   ✅ TEST 4 PASSED\n');

            return await this.createTestLog(execution_id, 'departments_read', 'passed', {
                metadata: { found_in_table: true, action_buttons: true }
            });

        } catch (error) {
            console.error('   ❌ TEST 4 FAILED:', error.message);
            return await this.createTestLog(execution_id, 'departments_read', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    /**
     * TEST 5: UPDATE - Editar departamento
     */
    async testUpdate(execution_id) {
        console.log('\n🧪 TEST 5: UPDATE - EDITAR DEPARTAMENTO');
        console.log('─'.repeat(80));

        try {
            if (!this.testDepartmentId) {
                throw new Error('No hay departamento para editar');
            }

            // Click en botón EDITAR
            await this.page.evaluate((deptName) => {
                const container = document.getElementById('departments-list');
                if (!container) return;

                const rows = Array.from(container.querySelectorAll('tbody tr'));
                const row = rows.find(r => r.textContent.includes(deptName));
                if (!row) return;

                const editBtn = row.querySelector('button[onclick*="editDepartment"]');
                if (editBtn) editBtn.click();
            }, this.testDepartmentName);

            await this.page.waitForTimeout(2000);

            // Verificar que el modal de edición se abrió
            const editModalOpened = await this.page.evaluate(() => {
                const modal = document.querySelector('.modal-overlay');
                if (!modal) return false;

                const title = modal.querySelector('h2');
                return title && title.textContent.includes('Editar');
            });

            if (!editModalOpened) {
                throw new Error('Modal de EDITAR no se abrió');
            }

            console.log('   ✅ Modal EDIT abierto');

            // Modificar descripción
            const newDescription = `${this.testDepartmentName} - EDITADO - ${Date.now()}`;
            const newRadius = 200;

            await this.page.fill('#editDeptDescription', newDescription);
            await this.page.fill('#editDeptCoverageRadius', newRadius.toString());

            console.log(`   ✅ Campos modificados`);
            console.log(`      Nueva descripción: ${newDescription}`);
            console.log(`      Nuevo radio: ${newRadius}m`);

            // Click en Guardar Cambios
            await this.page.evaluate(() => {
                const modal = document.querySelector('.modal-overlay');
                if (!modal) return;
                const saveBtn = modal.querySelector('button.btn-primary');
                if (saveBtn) saveBtn.click();
            });

            await this.page.waitForTimeout(3000);

            // Verificar que el modal se cerró
            const modalClosed = await this.page.evaluate(() => {
                const modal = document.querySelector('.modal-overlay');
                return modal === null;
            });

            if (!modalClosed) {
                throw new Error('Modal no se cerró - posible error en actualización');
            }

            console.log('   ✅ Modal cerrado (actualización exitosa)');

            // Verificar cambios en BD
            const dbResult = await this.queryDB(`
                SELECT description, coverage_radius
                FROM departments
                WHERE id = $1
            `, [this.testDepartmentId]);

            if (dbResult.length === 0) {
                throw new Error('Departamento no encontrado en BD después de editar');
            }

            const updatedDesc = dbResult[0].description;
            const updatedRadius = dbResult[0].coverage_radius;

            if (!updatedDesc.includes('EDITADO')) {
                throw new Error('Descripción no se actualizó en BD');
            }

            if (updatedRadius !== newRadius) {
                throw new Error(`Radio no se actualizó (esperado: ${newRadius}, obtenido: ${updatedRadius})`);
            }

            console.log('   ✅ Cambios verificados en PostgreSQL');
            console.log(`      Descripción actualizada: ${updatedDesc}`);
            console.log(`      Radio actualizado: ${updatedRadius}m`);
            console.log('   ✅ TEST 5 PASSED\n');

            return await this.createTestLog(execution_id, 'departments_update', 'passed', {
                metadata: { updated_fields: ['description', 'coverage_radius'] }
            });

        } catch (error) {
            console.error('   ❌ TEST 5 FAILED:', error.message);
            return await this.createTestLog(execution_id, 'departments_update', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    /**
     * TEST 6: DELETE - Eliminar departamento
     */
    async testDelete(execution_id) {
        console.log('\n🧪 TEST 6: DELETE - ELIMINAR DEPARTAMENTO');
        console.log('─'.repeat(80));

        try {
            if (!this.testDepartmentId) {
                throw new Error('No hay departamento para eliminar');
            }

            // Recargar lista antes de eliminar
            await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const loadBtn = buttons.find(btn => btn.textContent.includes('Lista de Departamentos'));
                if (loadBtn) loadBtn.click();
            });

            await this.page.waitForTimeout(2000);

            // Click en botón ELIMINAR
            await this.page.evaluate((deptName) => {
                const container = document.getElementById('departments-list');
                if (!container) return;

                const rows = Array.from(container.querySelectorAll('tbody tr'));
                const row = rows.find(r => r.textContent.includes(deptName));
                if (!row) return;

                const deleteBtn = row.querySelector('button[onclick*="deleteDepartment"]');
                if (deleteBtn) deleteBtn.click();
            }, this.testDepartmentName);

            await this.page.waitForTimeout(1000);

            // Confirmar en el diálogo (alert/confirm)
            this.page.on('dialog', async dialog => {
                console.log(`   📋 Diálogo de confirmación: "${dialog.message()}"`);
                await dialog.accept();
            });

            // Esperar el diálogo y aceptarlo
            await this.page.waitForTimeout(2000);

            console.log('   ✅ Eliminación confirmada');

            // Esperar a que se procese la eliminación
            await this.page.waitForTimeout(3000);

            // Verificar en BD (soft delete: is_active = false)
            const dbResult = await this.queryDB(`
                SELECT is_active
                FROM departments
                WHERE id = $1
            `, [this.testDepartmentId]);

            if (dbResult.length === 0) {
                // Hard delete - departamento eliminado completamente
                console.log('   ✅ Departamento eliminado completamente (HARD DELETE)');
            } else if (dbResult[0].is_active === false) {
                // Soft delete - is_active = false
                console.log('   ✅ Departamento desactivado (SOFT DELETE)');
            } else {
                throw new Error('Departamento sigue activo después de eliminar');
            }

            // Verificar que NO aparece en la tabla
            await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const loadBtn = buttons.find(btn => btn.textContent.includes('Lista de Departamentos'));
                if (loadBtn) loadBtn.click();
            });

            await this.page.waitForTimeout(2000);

            const stillInTable = await this.page.evaluate((deptName) => {
                const container = document.getElementById('departments-list');
                if (!container) return false;

                const table = container.querySelector('table.users-table');
                if (!table) return false;

                const cells = Array.from(table.querySelectorAll('tbody td'));
                return cells.some(cell => cell.textContent.includes(deptName));
            }, this.testDepartmentName);

            if (stillInTable) {
                throw new Error('Departamento eliminado sigue apareciendo en la lista');
            }

            console.log('   ✅ Departamento no aparece en la tabla (lista actualizada)');
            console.log('   ✅ TEST 6 PASSED\n');

            return await this.createTestLog(execution_id, 'departments_delete', 'passed', {
                metadata: { department_id: this.testDepartmentId }
            });

        } catch (error) {
            console.error('   ❌ TEST 6 FAILED:', error.message);
            return await this.createTestLog(execution_id, 'departments_delete', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    /**
     * TEST 7: Verificar estadísticas
     */
    async testStats(execution_id) {
        console.log('\n🧪 TEST 7: ESTADÍSTICAS');
        console.log('─'.repeat(80));

        try {
            // Click en botón "Estadísticas"
            await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const statsBtn = buttons.find(btn => btn.textContent.includes('Estadísticas'));
                if (statsBtn) statsBtn.click();
            });

            await this.page.waitForTimeout(2000);

            // Leer estadísticas
            const stats = await this.page.evaluate(() => {
                const total = document.getElementById('total-departments');
                const gpsEnabled = document.getElementById('gps-enabled-departments');
                const avgRadius = document.getElementById('avg-coverage-radius');

                return {
                    total: total ? total.textContent : '--',
                    gpsEnabled: gpsEnabled ? gpsEnabled.textContent : '--',
                    avgRadius: avgRadius ? avgRadius.textContent : '--'
                };
            });

            console.log('   📊 Estadísticas actuales:');
            console.log(`      Total departamentos: ${stats.total}`);
            console.log(`      Con GPS configurado: ${stats.gpsEnabled}`);
            console.log(`      Radio promedio: ${stats.avgRadius}m`);

            if (stats.total === '--' && stats.gpsEnabled === '--' && stats.avgRadius === '--') {
                throw new Error('Estadísticas no se cargaron');
            }

            console.log('   ✅ TEST 7 PASSED\n');

            return await this.createTestLog(execution_id, 'departments_stats', 'passed', {
                metadata: { stats }
            });

        } catch (error) {
            console.error('   ❌ TEST 7 FAILED:', error.message);
            return await this.createTestLog(execution_id, 'departments_stats', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    /**
     * Cleanup - Cerrar conexión a BD
     */
    async cleanup() {
        if (this.pool) {
            await this.pool.end();
            console.log('🔌 Conexión a PostgreSQL cerrada');
        }
    }
}

module.exports = DepartmentsModuleCollector;
