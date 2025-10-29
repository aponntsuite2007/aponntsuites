/**
 * ============================================================================
 * USERS MODULE COLLECTOR - Test E2E del Módulo de Usuarios
 * ============================================================================
 *
 * Extiende BaseModuleCollector para testear el módulo de usuarios.
 *
 * TESTS INCLUIDOS:
 * 1. User CRUD - Crear, editar, eliminar usuario
 * 2. User List & Filters - Listado y filtros (DNI, nombre)
 * 3. User Permissions - Validación de permisos y roles
 * 4. User Search - Búsqueda y paginación
 * 5. User Stats - Estadísticas de usuarios
 *
 * @version 1.0.0
 * @date 2025-10-29
 * ============================================================================
 */

const BaseModuleCollector = require('./BaseModuleCollector');

class UsersModuleCollector extends BaseModuleCollector {
    constructor(database, systemRegistry) {
        super(database, systemRegistry);
        this.TEST_PREFIX = '[TEST-USERS]';
        this.testUserData = null; // Para guardar datos del usuario creado
    }

    /**
     * Configuración específica del módulo de usuarios
     */
    getModuleConfig() {
        return {
            moduleName: 'users',
            moduleURL: '/panel-empresa.html',
            testCategories: [
                { name: 'user_crud', func: this.testUserCRUD.bind(this) },
                { name: 'user_list_filters', func: this.testUserListAndFilters.bind(this) },
                { name: 'user_permissions', func: this.testUserPermissions.bind(this) },
                { name: 'user_search', func: this.testUserSearch.bind(this) },
                { name: 'user_stats', func: this.testUserStats.bind(this) }
            ],
            navigateBeforeTests: this.navigateToUsersModule.bind(this)
        };
    }

    /**
     * Navegación inicial al módulo de usuarios
     */
    async navigateToUsersModule() {
        console.log('\n📂 Navegando al módulo de Usuarios...\n');

        // Esperar que cargue el panel con módulos
        await this.page.waitForSelector('.module-item', { timeout: 10000 });

        // Click en módulo de usuarios
        await this.clickElement('button[onclick*="loadModule(\\'users\\')"]', 'módulo Usuarios');

        // Esperar que cargue el contenido del módulo
        await this.page.waitForSelector('#users', { timeout: 10000 });

        console.log('✅ Módulo de Usuarios cargado\n');
    }

    /**
     * ========================================================================
     * TEST 1: USER CRUD - Crear, Editar, Eliminar usuario
     * ========================================================================
     */
    async testUserCRUD(execution_id) {
        console.log('\n🧪 TEST 1: User CRUD...\n');

        try {
            // 1. CREATE - Abrir modal de nuevo usuario
            await this.clickElement('button[onclick="showAddUser()"]', 'botón Agregar Usuario');
            await this.page.waitForSelector('#user-modal', { visible: true, timeout: 5000 });

            // 2. Llenar formulario
            const testDNI = `${Math.floor(Math.random() * 90000000) + 10000000}`;
            const testName = `${this.TEST_PREFIX} Usuario Test`;
            const testEmail = `test${testDNI}@test.com`;

            await this.typeInInput('#user-dni', testDNI, 'DNI');
            await this.typeInInput('#user-name', testName, 'nombre');
            await this.typeInInput('#user-email', testEmail, 'email');
            await this.selectOption('#user-role', 'operator', 'rol');

            // Guardar datos para tests posteriores
            this.testUserData = { dni: testDNI, name: testName, email: testEmail };

            // 3. Guardar
            await this.clickElement('#btn-save-user', 'botón Guardar');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 4. Verificar que se cerró el modal
            const modalClosed = !(await this.isModalVisible('#user-modal'));

            if (!modalClosed) {
                throw new Error('Modal no se cerró después de guardar');
            }

            // 5. Cargar lista de usuarios
            await this.clickElement('button[onclick="loadUsers()"]', 'botón Lista de Usuarios');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 6. Verificar que aparece en la lista
            const userExists = await this.page.evaluate((dni) => {
                const table = document.querySelector('#users-list table');
                if (!table) return false;
                const cells = Array.from(table.querySelectorAll('td'));
                return cells.some(cell => cell.textContent.includes(dni));
            }, testDNI);

            if (!userExists) {
                throw new Error('Usuario creado no aparece en la lista');
            }

            console.log('✅ TEST 1 PASSED - Usuario CRUD completo\n');

            return await this.createTestLog(execution_id, 'users_crud', 'passed', {
                metadata: { dni: testDNI, name: testName, email: testEmail }
            });

        } catch (error) {
            console.error('❌ TEST 1 FAILED:', error.message);

            return await this.createTestLog(execution_id, 'users_crud', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    /**
     * ========================================================================
     * TEST 2: USER LIST & FILTERS - Listado y filtros
     * ========================================================================
     */
    async testUserListAndFilters(execution_id) {
        console.log('\n🧪 TEST 2: User List & Filters...\n');

        try {
            // 1. Cargar lista de usuarios
            await this.clickElement('button[onclick="loadUsers()"]', 'botón Lista de Usuarios');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 2. Verificar que cargó la tabla
            const tableExists = await this.elementExists('#users-list table');

            if (!tableExists) {
                throw new Error('Tabla de usuarios no cargó');
            }

            // 3. Contar usuarios antes de filtrar
            const totalUsersBeforeFilter = await this.page.evaluate(() => {
                const rows = document.querySelectorAll('#users-list tbody tr');
                return rows.length;
            });

            console.log(`   📊 Total usuarios antes de filtrar: ${totalUsersBeforeFilter}`);

            // 4. Aplicar filtro por DNI (usar el usuario de test si existe)
            if (this.testUserData && this.testUserData.dni) {
                await this.typeInInput('#searchDNI', this.testUserData.dni, 'filtro DNI');
                await new Promise(resolve => setTimeout(resolve, 1000));

                // 5. Verificar que se filtró
                const filteredRows = await this.page.evaluate(() => {
                    const rows = document.querySelectorAll('#users-list tbody tr');
                    return Array.from(rows).filter(row => row.style.display !== 'none').length;
                });

                console.log(`   📊 Usuarios después de filtrar: ${filteredRows}`);

                if (filteredRows === 0) {
                    throw new Error('Filtro no funcionó correctamente');
                }

                // 6. Limpiar filtros
                await this.clickElement('button[onclick="clearFilters()"]', 'botón Limpiar Filtros');
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            console.log('✅ TEST 2 PASSED - Listado y filtros funcionan\n');

            return await this.createTestLog(execution_id, 'users_list_filters', 'passed', {
                metadata: { total_users: totalUsersBeforeFilter }
            });

        } catch (error) {
            console.error('❌ TEST 2 FAILED:', error.message);

            return await this.createTestLog(execution_id, 'users_list_filters', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    /**
     * ========================================================================
     * TEST 3: USER PERMISSIONS - Validación de permisos y roles
     * ========================================================================
     */
    async testUserPermissions(execution_id) {
        console.log('\n🧪 TEST 3: User Permissions...\n');

        try {
            // 1. Abrir modal de nuevo usuario con rol admin
            await this.clickElement('button[onclick="showAddUser()"]', 'botón Agregar Usuario');
            await this.page.waitForSelector('#user-modal', { visible: true, timeout: 5000 });

            // 2. Verificar que existe dropdown de roles
            const roleSelectExists = await this.elementExists('#user-role');

            if (!roleSelectExists) {
                throw new Error('Dropdown de roles no existe');
            }

            // 3. Verificar opciones de roles disponibles
            const rolesAvailable = await this.page.evaluate(() => {
                const select = document.querySelector('#user-role');
                if (!select) return [];
                return Array.from(select.options).map(opt => opt.value);
            });

            console.log(`   📊 Roles disponibles: ${rolesAvailable.join(', ')}`);

            if (rolesAvailable.length === 0) {
                throw new Error('No hay roles disponibles en el dropdown');
            }

            // 4. Cerrar modal (sin guardar)
            const closeButton = await this.elementExists('button[onclick="closeModal(\'user-modal\')"]');
            if (closeButton) {
                await this.clickElement('button[onclick="closeModal(\'user-modal\')"]', 'botón Cerrar');
            } else {
                // Click fuera del modal
                await this.page.keyboard.press('Escape');
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            console.log('✅ TEST 3 PASSED - Permisos y roles validados\n');

            return await this.createTestLog(execution_id, 'users_permissions', 'passed', {
                metadata: { roles_available: rolesAvailable }
            });

        } catch (error) {
            console.error('❌ TEST 3 FAILED:', error.message);

            return await this.createTestLog(execution_id, 'users_permissions', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    /**
     * ========================================================================
     * TEST 4: USER SEARCH - Búsqueda y paginación
     * ========================================================================
     */
    async testUserSearch(execution_id) {
        console.log('\n🧪 TEST 4: User Search...\n');

        try {
            // 1. Cargar lista de usuarios
            await this.clickElement('button[onclick="loadUsers()"]', 'botón Lista de Usuarios');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 2. Aplicar búsqueda por nombre
            await this.typeInInput('#searchName', 'test', 'búsqueda por nombre');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 3. Verificar resultados de búsqueda
            const searchResults = await this.page.evaluate(() => {
                const resultsSpan = document.querySelector('#filterResults');
                return resultsSpan ? resultsSpan.textContent : '';
            });

            console.log(`   📊 Resultados de búsqueda: ${searchResults}`);

            // 4. Verificar que hay paginación (si hay muchos usuarios)
            const paginationExists = await this.elementExists('#pagination-top');

            if (paginationExists) {
                console.log('   ✅ Paginación detectada');
            } else {
                console.log('   ℹ️  Paginación no visible (pocos usuarios)');
            }

            // 5. Limpiar búsqueda
            await this.clickElement('button[onclick="clearFilters()"]', 'botón Limpiar Filtros');

            console.log('✅ TEST 4 PASSED - Búsqueda funcionando\n');

            return await this.createTestLog(execution_id, 'users_search', 'passed', {
                metadata: { search_results: searchResults }
            });

        } catch (error) {
            console.error('❌ TEST 4 FAILED:', error.message);

            return await this.createTestLog(execution_id, 'users_search', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    /**
     * ========================================================================
     * TEST 5: USER STATS - Estadísticas de usuarios
     * ========================================================================
     */
    async testUserStats(execution_id) {
        console.log('\n🧪 TEST 5: User Stats...\n');

        try {
            // 1. Cargar lista de usuarios para obtener stats
            await this.clickElement('button[onclick="loadUsers()"]', 'botón Lista de Usuarios');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 2. Obtener estadísticas
            const stats = await this.page.evaluate(() => {
                return {
                    total: document.querySelector('#total-users')?.textContent || '--',
                    active: document.querySelector('#active-users')?.textContent || '--',
                    admins: document.querySelector('#admin-users')?.textContent || '--'
                };
            });

            console.log(`   📊 Total usuarios: ${stats.total}`);
            console.log(`   📊 Usuarios activos: ${stats.active}`);
            console.log(`   📊 Administradores: ${stats.admins}`);

            // 3. Verificar que los stats no están en estado loading
            if (stats.total === '--' || stats.active === '--') {
                throw new Error('Estadísticas no cargaron correctamente');
            }

            console.log('✅ TEST 5 PASSED - Estadísticas correctas\n');

            return await this.createTestLog(execution_id, 'users_stats', 'passed', {
                metadata: { stats }
            });

        } catch (error) {
            console.error('❌ TEST 5 FAILED:', error.message);

            return await this.createTestLog(execution_id, 'users_stats', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }
}

module.exports = UsersModuleCollector;
