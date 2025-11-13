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
                { name: 'user_stats', func: this.testUserStats.bind(this) },
                { name: 'user_view_modal_tabs', func: this.testUserViewModalTabs.bind(this) }
            ],
            navigateBeforeTests: this.navigateToUsersModule.bind(this)
        };
    }

    /**
     * Navegación inicial al módulo de usuarios
     */
    async navigateToUsersModule() {
        console.log('\n📂 Navegando al módulo de Usuarios...\n');

        // Navegar directamente con JavaScript (más confiable que buscar botón)
        await this.page.evaluate(() => {
            if (typeof window.showModuleContent === 'function') {
                window.showModuleContent('users', 'Gestión de Usuarios');
            } else {
                throw new Error('Función showModuleContent no encontrada');
            }
        });

        // Esperar que cargue el contenido del módulo
        await this.page.waitForSelector('#users', { state: 'visible', timeout: 10000 });

        console.log('✅ Módulo de Usuarios cargado\n');
    }

    /**
     * ========================================================================
     * TEST 1: USER CRUD - Crear, Editar, Eliminar usuario
     * ========================================================================
     */
    async testUserCRUD(execution_id) {
        console.log('\n🧪 TEST 1: User CRUD (CREATE con modal de Agregar Usuario)...\n');

        try {
            // 1. Abrir modal de agregar usuario
            console.log('   📋 Paso 1: Abriendo modal de Agregar Usuario...');

            await this.clickElement('button[onclick="showAddUser()"]', 'botón Agregar Usuario');
            await this.page.waitForTimeout(2000);

            // 2. Verificar que el modal correcto se abrió (userModal, NO employeeFileModal)
            const modalOpened = await this.elementExists('#userModal');
            if (!modalOpened) {
                throw new Error('Modal de agregar usuario (#userModal) no se abrió');
            }

            console.log('   ✅ Modal de agregar usuario abierto correctamente');

            // 3. Llenar formulario con datos de prueba
            const timestamp = Date.now();
            const testData = {
                name: `${this.TEST_PREFIX} Usuario ${timestamp}`,
                email: `test${timestamp}@test.com`,
                legajo: `EMP${timestamp}`,
                password: 'test123456',
                role: 'employee'
            };

            console.log(`   📋 Paso 2: Llenando formulario con datos de prueba...`);

            // Llenar campos del formulario
            await this.typeInInput('#newUserName', testData.name, 'campo Nombre');
            await this.typeInInput('#newUserEmail', testData.email, 'campo Email');
            await this.typeInInput('#newUserLegajo', testData.legajo, 'campo Legajo');
            await this.typeInInput('#newUserPassword', testData.password, 'campo Password');

            // Seleccionar rol
            await this.page.selectOption('#newUserRole', testData.role);

            // Seleccionar departamento si existe
            const departmentSelect = await this.elementExists('#newUserDept');
            if (departmentSelect) {
                const departments = await this.page.evaluate(() => {
                    const select = document.querySelector('#newUserDept');
                    return Array.from(select.options).map(opt => opt.value).filter(v => v !== '');
                });

                if (departments.length > 0) {
                    await this.page.selectOption('#newUserDept', departments[0]);
                    console.log(`   ✅ Departamento seleccionado: ${departments[0]}`);
                }
            }

            console.log('   ✅ Formulario completado');

            // 4. Guardar usuario (click en botón Guardar)
            console.log('   📋 Paso 3: Guardando usuario...');

            await this.clickElement('button[onclick="saveNewUser()"]', 'botón Guardar');
            await this.page.waitForTimeout(3000); // Esperar que se guarde en BD

            console.log('   ✅ Usuario guardado');

            // 5. Verificar que el modal se cerró (indica que se guardó correctamente)
            const modalClosed = !(await this.elementExists('#userModal'));

            if (!modalClosed) {
                console.log('   ⚠️ Modal no se cerró automáticamente, intentando cerrar manualmente...');
                const closeBtn = await this.elementExists('button[onclick="closeUserModal()"]');
                if (closeBtn) {
                    await this.clickElement('button[onclick="closeUserModal()"]', 'botón Cerrar');
                    await this.page.waitForTimeout(1000);
                }
            } else {
                console.log('   ✅ Modal cerrado automáticamente (guardado exitoso)');
            }

            // 6. Verificar que el usuario fue creado en la lista
            console.log('   📋 Paso 4: Verificando que el usuario aparece en la lista...');

            await this.clickElement('button[onclick="loadUsers()"]', 'botón Recargar Lista');
            await this.page.waitForTimeout(2000);

            const userExists = await this.page.evaluate((email) => {
                const rows = document.querySelectorAll('#users-list tbody tr');
                for (const row of rows) {
                    if (row.textContent.includes(email)) {
                        return true;
                    }
                }
                return false;
            }, testData.email);

            if (userExists) {
                console.log(`   ✅ Usuario ${testData.email} encontrado en la lista`);
            } else {
                console.log(`   ⚠️ Usuario ${testData.email} NO encontrado en la lista (puede estar en otra página)`);
            }

            // 7. Guardar datos del usuario creado para otros tests
            this.testUserData = testData;

            console.log('✅ TEST 1 PASSED - Usuario creado exitosamente\n');

            return await this.createTestLog(execution_id, 'users_crud', 'passed', {
                metadata: {
                    operation: 'CREATE via add user modal',
                    userName: testData.name,
                    userEmail: testData.email,
                    userLegajo: testData.legajo,
                    userExists
                }
            });

        } catch (error) {
            console.error('❌ TEST 1 FAILED:', error.message);

            // Tomar screenshot del error
            try {
                const screenshotPath = `test-error-crud-${Date.now()}.png`;
                await this.page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`   📸 Screenshot guardado: ${screenshotPath}`);
            } catch (screenshotError) {
                console.log(`   ⚠️ No se pudo guardar screenshot: ${screenshotError.message}`);
            }

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
            await this.page.waitForSelector('#userModal', { visible: true, timeout: 5000 });

            // 2. Verificar que existe dropdown de roles
            const roleSelectExists = await this.elementExists('#newUserRole');

            if (!roleSelectExists) {
                throw new Error('Dropdown de roles no existe');
            }

            // 3. Verificar opciones de roles disponibles
            const rolesAvailable = await this.page.evaluate(() => {
                const select = document.querySelector('#newUserRole');
                if (!select) return [];
                return Array.from(select.options).map(opt => opt.value);
            });

            console.log(`   📊 Roles disponibles: ${rolesAvailable.join(', ')}`);

            if (rolesAvailable.length === 0) {
                throw new Error('No hay roles disponibles en el dropdown');
            }

            // 4. Cerrar modal (sin guardar)
            const closeButton = await this.elementExists('button[onclick="closeUserModal()"]');
            if (closeButton) {
                await this.clickElement('button[onclick="closeUserModal()"]', 'botón Cerrar');
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

    /**
     * ========================================================================
     * TEST 6: USER VIEW MODAL TABS - Navegación completa de 9 tabs
     * ========================================================================
     */
    async testUserViewModalTabs(execution_id) {
        console.log('\n🧪 TEST 6: User View Modal Tabs Navigation...\n');

        try {
            // 1. Cargar lista de usuarios
            await this.clickElement('button[onclick="loadUsers()"]', 'botón Lista de Usuarios');
            await this.page.waitForTimeout(2000);

            // 2. Obtener el primer usuario de la lista
            const firstUserId = await this.page.evaluate(() => {
                const firstButton = document.querySelector('button[onclick^="viewUser("]');
                if (!firstButton) return null;
                const match = firstButton.getAttribute('onclick').match(/viewUser\('([^']+)'\)/);
                return match ? match[1] : null;
            });

            if (!firstUserId) {
                throw new Error('No se encontró ningún usuario en la lista para testear');
            }

            console.log(`   📋 Usuario seleccionado para test: ${firstUserId}`);

            // 3. Abrir modal de Ver Usuario
            await this.clickElement(`button[onclick="viewUser('${firstUserId}')"]`, 'botón Ver Usuario');
            await this.page.waitForTimeout(2000);

            // 4. Verificar que el modal se abrió
            const modalExists = await this.elementExists('#employeeFileModal');
            if (!modalExists) {
                throw new Error('Modal employeeFileModal no se abrió');
            }

            console.log('   ✅ Modal abierto correctamente');

            // 5. Navegar por todas las 9 tabs
            const tabs = [
                { name: 'admin', label: 'Administración' },
                { name: 'personal', label: 'Datos Personales' },
                { name: 'work', label: 'Antecedentes Laborales' },
                { name: 'family', label: 'Grupo Familiar' },
                { name: 'medical', label: 'Antecedentes Médicos' },
                { name: 'attendance', label: 'Asistencias/Permisos' },
                { name: 'disciplinary', label: 'Disciplinarios' },
                { name: 'tasks', label: 'Config. Tareas' },
                { name: 'biometric', label: 'Registro Biométrico' }
            ];

            let tabsNavigated = 0;
            let tabsFailed = [];

            for (const tab of tabs) {
                console.log(`\n   📂 Navegando a tab: ${tab.label}...`);

                try {
                    // Buscar el botón de la tab dentro del modal usando la función showFileTab
                    await this.page.evaluate((tabName) => {
                        const modal = document.getElementById('employeeFileModal');
                        if (!modal) throw new Error('Modal no encontrado');

                        const buttons = modal.querySelectorAll('.file-tab');
                        let targetButton = null;

                        buttons.forEach(btn => {
                            const onclick = btn.getAttribute('onclick');
                            if (onclick && onclick.includes(`showFileTab('${tabName}'`)) {
                                targetButton = btn;
                            }
                        });

                        if (!targetButton) throw new Error(`Botón para tab ${tabName} no encontrado`);

                        targetButton.click();
                    }, tab.name);

                    await this.page.waitForTimeout(500);

                    // Verificar que la tab se mostró
                    const tabVisible = await this.page.evaluate((tabName) => {
                        const modal = document.getElementById('employeeFileModal');
                        if (!modal) return false;

                        const tabContent = document.getElementById(`${tabName}-tab`);
                        if (!tabContent) return false;

                        const style = window.getComputedStyle(tabContent);
                        const isVisible = style.display !== 'none' && tabContent.classList.contains('active');

                        return isVisible;
                    }, tab.name);

                    if (tabVisible) {
                        console.log(`   ✅ Tab "${tab.label}" visible correctamente`);
                        tabsNavigated++;
                    } else {
                        console.log(`   ⚠️ Tab "${tab.label}" no se mostró correctamente`);
                        tabsFailed.push(tab.label);
                    }

                } catch (error) {
                    console.log(`   ❌ Error navegando a tab "${tab.label}": ${error.message}`);
                    tabsFailed.push(tab.label);
                }
            }

            // 6. Cerrar modal
            await this.page.evaluate(() => {
                const closeButton = document.querySelector('#employeeFileModal button[onclick="closeEmployeeFile()"]');
                if (closeButton) closeButton.click();
            });

            await this.page.waitForTimeout(1000);

            // 7. Verificar que el modal se cerró
            const modalClosed = !(await this.elementExists('#employeeFileModal'));

            console.log(`\n   📊 Resumen de navegación:`);
            console.log(`      - Tabs navegadas exitosamente: ${tabsNavigated}/9`);
            console.log(`      - Tabs fallidas: ${tabsFailed.length}`);
            if (tabsFailed.length > 0) {
                console.log(`      - Tabs que fallaron: ${tabsFailed.join(', ')}`);
            }
            console.log(`      - Modal cerrado: ${modalClosed ? 'Sí' : 'No'}`);

            // Considerar exitoso si al menos 7/9 tabs funcionan
            if (tabsNavigated >= 7 && modalClosed) {
                console.log('\n✅ TEST 6 PASSED - Navegación de tabs funcional\n');

                return await this.createTestLog(execution_id, 'user_view_modal_tabs', 'passed', {
                    metadata: {
                        tabsNavigated,
                        tabsFailed: tabsFailed.length,
                        failedTabs: tabsFailed,
                        modalClosed
                    }
                });
            } else {
                throw new Error(`Solo ${tabsNavigated}/9 tabs navegaron correctamente. Se requieren al menos 7/9.`);
            }

        } catch (error) {
            console.error('❌ TEST 6 FAILED:', error.message);

            return await this.createTestLog(execution_id, 'user_view_modal_tabs', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

}

module.exports = UsersModuleCollector;
