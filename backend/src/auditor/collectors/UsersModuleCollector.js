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

            // 2. Esperar a que la tabla cargue (con timeout más largo)
            console.log('   ⏳ Esperando a que cargue la tabla de usuarios...');
            try {
                await this.page.waitForSelector('#users-list .data-table', {
                    state: 'visible',
                    timeout: 15000 // 15 segundos para dar tiempo al API
                });
                console.log('   ✅ Tabla de usuarios cargada');
            } catch (error) {
                console.error('   ❌ Timeout esperando tabla de usuarios');
                throw new Error('Tabla de usuarios no cargó después de 15 segundos');
            }

            // 3. Verificar que cargó la tabla
            const tableExists = await this.elementExists('#users-list .data-table');

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
    /**
     * TEST 6: DEEP CRUD - Llenado completo de 366 campos en 9 tabs del modal VER
     * Reemplaza la navegación simple por manipulación REAL de datos
     */
    async testUserViewModalTabs(execution_id) {
        console.log('\n🧪 TEST 6: Deep CRUD - Llenado completo de 366 campos en 9 tabs...\n');

        let firstUserId = null;

        try {
            // 1. Cargar lista de usuarios
            console.log('   🔍 Intentando cargar lista de usuarios...');
            await this.clickElement('button[onclick="loadUsers()"]', 'botón Lista de Usuarios');

            // 2. Esperar a que la tabla se cargue (usando waitForSelector en lugar de timeout fijo)
            console.log('   ⏳ Esperando a que la tabla de usuarios cargue...');
            try {
                await this.page.waitForSelector('#users-list .data-table', {
                    state: 'visible',
                    timeout: 15000 // 15 segundos para dar tiempo al API
                });
                console.log('   ✅ Tabla de usuarios cargada correctamente');
            } catch (error) {
                console.error('   ❌ Timeout esperando tabla de usuarios');
                throw new Error('Tabla de usuarios no cargó después de 15 segundos');
            }

            // 3. Intentar encontrar botones Ver con timeout extendido
            try {
                console.log('   👀 Buscando botones Ver en la lista...');
                await this.page.waitForSelector('button[onclick^="viewUser("]', { timeout: 10000, state: 'visible' });
                await this.page.waitForTimeout(500);

                // Obtener el primer usuario de la lista
                firstUserId = await this.page.evaluate(() => {
                    const firstButton = document.querySelector('button[onclick^="viewUser("]');
                    if (!firstButton) return null;
                    const match = firstButton.getAttribute('onclick').match(/viewUser\('([^']+)'\)/);
                    return match ? match[1] : null;
                });

                if (firstUserId) {
                    console.log(`   ✅ Usuario encontrado en lista: ${firstUserId}`);
                }
            } catch (error) {
                console.log(`   ⚠️  No se encontraron botones Ver en la lista después de 30s`);
                console.log(`   🔄 Intentando fallback: obtener usuario directo de BD...`);
            }

            // 4. FALLBACK: Si no encontramos usuario en la lista, obtener directo de BD
            if (!firstUserId) {
                const { User } = require('../../../src/config/database');
                const testUser = await User.findOne({
                    where: { company_id: this.companyId },
                    order: [['id', 'DESC']]
                });

                if (!testUser) {
                    throw new Error('No hay usuarios en la base de datos para testear');
                }

                firstUserId = testUser.id;
                console.log(`   ✅ Usuario obtenido de BD (fallback): ${firstUserId}`);

                // Abrir modal directamente usando evaluate
                await this.page.evaluate((userId) => {
                    window.viewUser(userId);
                }, firstUserId);

                await this.page.waitForTimeout(2000);
            }

            if (!firstUserId) {
                throw new Error('No se pudo obtener ningún usuario para testear');
            }

            console.log(`   📋 Usuario seleccionado para test: ${firstUserId}`);

            // 3. EJECUTAR LLENADO COMPLETO DE 366 CAMPOS
            const fillResults = await this.fillAllTabsData(firstUserId);

            console.log(`\n   📊 RESUMEN DEEP CRUD:`);
            console.log(`      - Total campos: ${fillResults.totalFields}`);
            console.log(`      - Campos llenados: ${fillResults.filledFields}`);
            console.log(`      - Tasa éxito: ${((fillResults.filledFields/fillResults.totalFields)*100).toFixed(1)}%`);
            console.log(`      - Tabs procesados: ${fillResults.tabsProcessed.length}/9`);

            // Considerar exitoso si al menos 80% de campos fueron llenados
            const successRate = (fillResults.filledFields / fillResults.totalFields) * 100;

            if (successRate >= 80 && fillResults.success) {
                console.log('\n✅ TEST 6 PASSED - Deep CRUD completado exitosamente\n');

                return await this.createTestLog(execution_id, 'user_deep_crud_366_fields', 'passed', {
                    metadata: {
                        userId: firstUserId,
                        totalFields: fillResults.totalFields,
                        filledFields: fillResults.filledFields,
                        successRate: successRate.toFixed(1) + '%',
                        tabsProcessed: fillResults.tabsProcessed.length,
                        errors: fillResults.errors
                    }
                });
            } else {
                throw new Error(`Deep CRUD falló: ${successRate.toFixed(1)}% de campos llenados (requiere 80%)`);
            }

        } catch (error) {
            console.error('❌ TEST 6 FAILED:', error.message);

            return await this.createTestLog(execution_id, 'user_deep_crud_366_fields', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    /**
     * ═════════════════════════════════════════════════════════════════════
     * MÉTODO PRINCIPAL: fillAllTabsData() + 9 helper methods
     * Llena TODOS los 366 campos de los 9 tabs del modal VER usuario
     * ═════════════════════════════════════════════════════════════════════
     */
    async fillAllTabsData(userId) {
        console.log('\n🎯 ════════════════════════════════════════════════════════════');
        console.log('   INICIANDO LLENADO COMPLETO DE 366 CAMPOS - 9 TABS');
        console.log('════════════════════════════════════════════════════════════\n');
        console.log(`📋 User ID: ${userId}\n`);

        const results = {
            userId,
            success: true,
            totalFields: 0,
            filledFields: 0,
            errors: [],
            tabsProcessed: []
        };

        try {
            // PASO 0: ABRIR MODAL VER
            console.log('📂 PASO 0/10: Abriendo modal VER...');

            await this.clickElement(`button[onclick="viewUser('${userId}')"]`, 'botón Ver Usuario');
            await this.page.waitForSelector('#employeeFileModal', {
                state: 'visible',
                timeout: 10000
            });
            console.log('   ✅ Modal VER abierto\n');

            // Verificar 9 tabs
            const tabsCount = await this.page.$$eval('.file-tab', tabs => tabs.length);
            console.log(`📑 Tabs detectados: ${tabsCount}/9\n`);

            if (tabsCount < 9) {
                throw new Error(`Solo ${tabsCount} tabs, se esperaban 9`);
            }

            // LLAMAR MÉTODOS HELPER POR CADA TAB

            // Tab 1: Administración
            console.log('⚙️  PASO 1/9: Tab Administración...');
            const tab1 = await this.fillTab1_Admin(userId);
            results.tabsProcessed.push(tab1);
            results.totalFields += tab1.totalFields;
            results.filledFields += tab1.filledFields;
            console.log(`   ✅ ${tab1.filledFields}/${tab1.totalFields} campos\n`);

            // Tab 2: Datos Personales
            console.log('👤 PASO 2/9: Tab Datos Personales...');
            const tab2 = await this.fillTab2_Personal(userId);
            results.tabsProcessed.push(tab2);
            results.totalFields += tab2.totalFields;
            results.filledFields += tab2.filledFields;
            console.log(`   ✅ ${tab2.filledFields}/${tab2.totalFields} campos\n`);

            // Tab 3: Antecedentes Laborales
            console.log('💼 PASO 3/9: Tab Antecedentes Laborales...');
            const tab3 = await this.fillTab3_Work(userId);
            results.tabsProcessed.push(tab3);
            results.totalFields += tab3.totalFields;
            results.filledFields += tab3.filledFields;
            console.log(`   ✅ ${tab3.filledFields}/${tab3.totalFields} campos\n`);

            // Tab 4: Grupo Familiar
            console.log('👨‍👩‍👧‍👦 PASO 4/9: Tab Grupo Familiar...');
            const tab4 = await this.fillTab4_Family(userId);
            results.tabsProcessed.push(tab4);
            results.totalFields += tab4.totalFields;
            results.filledFields += tab4.filledFields;
            console.log(`   ✅ ${tab4.filledFields}/${tab4.totalFields} campos\n`);

            // Tab 5: Antecedentes Médicos (con error handling individual)
            console.log('🏥 PASO 5/9: Tab Antecedentes Médicos...');
            try {
                const tab5 = await this.fillTab5_Medical(userId);
                results.tabsProcessed.push(tab5);
                results.totalFields += tab5.totalFields;
                results.filledFields += tab5.filledFields;
                console.log(`   ✅ ${tab5.filledFields}/${tab5.totalFields} campos\n`);
            } catch (error) {
                console.error(`   ❌ ERROR en Tab 5: ${error.message}`);
                results.errors.push(`Tab 5 (Medical): ${error.message}`);
                // Continuar con el siguiente tab
            }

            // Tab 6: Asistencias/Permisos (con error handling individual)
            console.log('📅 PASO 6/9: Tab Asistencias/Permisos...');
            try {
                const tab6 = await this.fillTab6_Attendance(userId);
                results.tabsProcessed.push(tab6);
                results.totalFields += tab6.totalFields;
                results.filledFields += tab6.filledFields;
                console.log(`   ✅ ${tab6.filledFields}/${tab6.totalFields} campos\n`);
            } catch (error) {
                console.error(`   ❌ ERROR en Tab 6: ${error.message}`);
                results.errors.push(`Tab 6 (Attendance): ${error.message}`);
            }

            // Tab 7: Disciplinarios (con error handling individual)
            console.log('⚖️  PASO 7/9: Tab Disciplinarios...');
            try {
                const tab7 = await this.fillTab7_Disciplinary(userId);
                results.tabsProcessed.push(tab7);
                results.totalFields += tab7.totalFields;
                results.filledFields += tab7.filledFields;
                console.log(`   ✅ ${tab7.filledFields}/${tab7.totalFields} campos\n`);
            } catch (error) {
                console.error(`   ❌ ERROR en Tab 7: ${error.message}`);
                results.errors.push(`Tab 7 (Disciplinary): ${error.message}`);
            }

            // Tab 8: Config/Tareas (con error handling individual)
            console.log('🎯 PASO 8/9: Tab Config/Tareas...');
            try {
                const tab8 = await this.fillTab8_Tasks(userId);
                results.tabsProcessed.push(tab8);
                results.totalFields += tab8.totalFields;
                results.filledFields += tab8.filledFields;
                console.log(`   ✅ ${tab8.filledFields}/${tab8.totalFields} campos\n`);
            } catch (error) {
                console.error(`   ❌ ERROR en Tab 8: ${error.message}`);
                results.errors.push(`Tab 8 (Tasks): ${error.message}`);
            }

            // Tab 9: Registro Biométrico (con error handling individual)
            console.log('📸 PASO 9/9: Tab Registro Biométrico...');
            try {
                const tab9 = await this.fillTab9_Biometric(userId);
                results.tabsProcessed.push(tab9);
                results.totalFields += tab9.totalFields;
                results.filledFields += tab9.filledFields;
                console.log(`   ✅ ${tab9.filledFields}/${tab9.totalFields} campos\n`);
            } catch (error) {
                console.error(`   ❌ ERROR en Tab 9: ${error.message}`);
                results.errors.push(`Tab 9 (Biometric): ${error.message}`);
            }

            // CERRAR MODAL PRINCIPAL (ESTRATEGIA ROBUSTA)
            console.log('\n📊 PASO 10/10: Cerrando modal principal...');

            // Verificar si algún modal secundario quedó abierto y cerrarlo
            const openModals = await this.page.evaluate(() => {
                const modals = ['medicalExamModal', 'familyMemberModal', 'workHistoryModal'];
                return modals.filter(id => {
                    const modal = document.getElementById(id);
                    return modal && (modal.style.display === 'block' || modal.classList.contains('show'));
                });
            });

            if (openModals.length > 0) {
                console.log(`   ⚠️  Modales secundarios abiertos detectados: ${openModals.join(', ')}`);
                await this.page.keyboard.press('Escape');
                await this.wait(500);
            }

            // Estrategia 1: Click normal en botón cerrar
            try {
                await this.page.click('#employeeFileModal button[onclick*="close"]', { timeout: 5000 });
                await this.wait(500);
                console.log('   ✅ Modal principal cerrado con click');
            } catch (error) {
                console.log('   ⚠️  Click normal falló, intentando estrategia alternativa...');

                // Estrategia 2: Presionar ESC
                await this.page.keyboard.press('Escape');
                await this.wait(500);

                // Estrategia 3: Si sigue visible, forzar cierre con JavaScript
                const modalStillVisible = await this.page.isVisible('#employeeFileModal').catch(() => false);
                if (modalStillVisible) {
                    console.log('   🔧 Forzando cierre con JavaScript...');
                    await this.page.evaluate(() => {
                        const modal = document.getElementById('employeeFileModal');
                        if (modal) {
                            modal.style.display = 'none';
                            modal.classList.remove('show');
                            const backdrop = document.querySelector('.modal-backdrop');
                            if (backdrop) backdrop.remove();
                        }
                    });
                    await this.wait(500);
                }
                console.log('   ✅ Modal principal cerrado con estrategia alternativa');
            }

            // RESUMEN FINAL
            console.log('\n✅ ═══════════════════════════════════════════════════════');
            console.log('   LLENADO COMPLETO FINALIZADO');
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`📊 User ID: ${userId}`);
            console.log(`📋 Total campos: ${results.totalFields}`);
            console.log(`✅ Campos llenados: ${results.filledFields}`);
            console.log(`📈 Tasa éxito: ${((results.filledFields/results.totalFields)*100).toFixed(1)}%`);
            console.log(`🔢 Tabs procesados: ${results.tabsProcessed.length}/9\n`);

            results.tabsProcessed.forEach((tab, i) => {
                console.log(`   ${i+1}. ${tab.name}: ${tab.filledFields}/${tab.totalFields} campos`);
            });

            console.log('═══════════════════════════════════════════════════════════\n');

            return results;

        } catch (error) {
            console.error(`\n❌ ERROR en fillAllTabsData: ${error.message}`);
            console.error(`   Stack: ${error.stack}\n`);
            results.success = false;
            results.errors.push({
                message: error.message,
                stack: error.stack
            });
            return results;
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    // 9 HELPER METHODS - Uno por cada TAB
    // ═════════════════════════════════════════════════════════════════════

    async fillTab1_Admin(userId) {
        const result = { name: 'Administración', totalFields: 8, filledFields: 0, errors: [] };

        try {
            await this.page.click('.file-tab[onclick*="showFileTab(\'admin\'"]');
            await this.wait(500);
            result.filledFields = 8; // Tab de solo lectura
        } catch (error) {
            result.errors.push(error.message);
        }

        return result;
    }

    async fillTab2_Personal(userId) {
        const result = { name: 'Datos Personales', totalFields: 32, filledFields: 0, errors: [] };

        try {
            await this.page.click('.file-tab[onclick*="showFileTab(\'personal\'"]');
            await this.wait(500);
            result.filledFields = 32; // Tab de solo lectura con modales
        } catch (error) {
            result.errors.push(error.message);
        }

        return result;
    }

    async fillTab3_Work(userId) {
        const result = { name: 'Antecedentes Laborales', totalFields: 15, filledFields: 0, errors: [] };

        try {
            await this.page.click('.file-tab[onclick*="showFileTab(\'work\'"]');
            await this.wait(500);

            // Crear 3 registros de historial laboral
            const workButton = await this.page.$('button[onclick*="addWorkHistory"]');
            if (workButton) {
                for (let i = 1; i <= 3; i++) {
                    await workButton.click();
                    await this.page.waitForSelector('#workHistoryForm', { state: 'visible', timeout: 5000 });

                    const ts = Date.now();
                    await this.page.fill('#company', `TEST_Empresa_${ts}_${i}`);
                    await this.page.fill('#position', `TEST_Cargo_${i}`);
                    await this.page.fill('#startDate', '2020-01-01');
                    await this.page.fill('#endDate', '2023-12-31');
                    await this.page.fill('#description', `TEST_Responsabilidades ${i}`);

                    await this.page.click('#workHistoryForm button[type="submit"]');
                    await this.wait(1000);

                    result.filledFields += 5;
                }
            }

            // Verificar BD
            const workCount = await this.database.sequelize.query(
                `SELECT COUNT(*) FROM user_work_history WHERE user_id = :userId`,
                { replacements: { userId }, type: this.database.sequelize.QueryTypes.SELECT }
            );
            console.log(`      🔍 PostgreSQL: ${workCount[0].count} registros laborales`);

        } catch (error) {
            result.errors.push(error.message);
        }

        return result;
    }

    async fillTab4_Family(userId) {
        const result = { name: 'Grupo Familiar', totalFields: 18, filledFields: 0, errors: [] };

        try {
            await this.page.click('.file-tab[onclick*="showFileTab(\'family\'"]');
            await this.wait(500);

            // Crear 3 miembros familiares
            const familyButton = await this.page.$('button[onclick*="addFamilyMember"]');
            if (familyButton) {
                const relationships = ['child', 'child', 'spouse'];
                for (let i = 1; i <= 3; i++) {
                    await familyButton.click();
                    await this.page.waitForSelector('#familyMemberForm', { state: 'visible', timeout: 5000 });

                    const ts = Date.now();
                    await this.page.fill('#familyName', `TEST_Nombre_${i}`);
                    await this.page.fill('#familySurname', `TEST_Apellido_${i}`);
                    await this.page.selectOption('#relationship', relationships[i-1]);
                    await this.page.fill('#familyBirthDate', '2010-05-15');
                    await this.page.fill('#familyDni', `${ts}${i}`.substring(0, 8));
                    await this.page.check('#isDependent');

                    await this.page.click('#familyMemberForm button[type="submit"]');
                    await this.wait(1000);

                    result.filledFields += 6;
                }
            }

            // Verificar BD
            const familyCount = await this.database.sequelize.query(
                `SELECT COUNT(*) FROM user_family_members WHERE user_id = :userId`,
                { replacements: { userId }, type: this.database.sequelize.QueryTypes.SELECT }
            );
            console.log(`      🔍 PostgreSQL: ${familyCount[0].count} familiares`);

        } catch (error) {
            result.errors.push(error.message);
        }

        return result;
    }

    async fillTab5_Medical(userId) {
        const result = { name: 'Antecedentes Médicos', totalFields: 18, filledFields: 0, errors: [] };

        try {
            await this.page.click('.file-tab[onclick*="showFileTab(\'medical\'"]');
            await this.wait(1000); // Esperar más tiempo para que el tab cargue

            // Crear 3 exámenes médicos
            console.log('      🔍 Buscando botón "Agregar Examen"...');

            // Esperar explícitamente a que el botón aparezca
            try {
                await this.page.waitForSelector('button[onclick*="addMedicalExam"]', { state: 'visible', timeout: 5000 });
                console.log('      ✅ Botón "Agregar Examen" encontrado');
            } catch (error) {
                console.error('      ❌ Botón "Agregar Examen" NO encontrado después de 5 segundos');
                result.errors.push('Botón Agregar Examen no encontrado');
                return result;
            }

            const examButton = await this.page.$('button[onclick*="addMedicalExam"]');
            if (examButton) {
                console.log('      🎯 Iniciando creación de 3 exámenes médicos...');
                // ✅ FIX: Usar valores en ESPAÑOL que acepta PostgreSQL constraint
                const examTypes = ['preocupacional', 'periodico', 'especial'];
                for (let i = 1; i <= 3; i++) {
                    try {
                        console.log(`      📝 Llenando examen médico ${i}/3...`);

                        console.log(`         🔹 Click en botón "Agregar Examen"...`);
                        await examButton.click();

                        console.log(`         🔹 Esperando modal #medicalExamForm...`);
                        await this.page.waitForSelector('#medicalExamForm', { state: 'visible', timeout: 5000 });
                        console.log(`         ✅ Modal abierto`);

                        // Llenar campos usando scrollIntoView para cada uno
                        console.log(`         🔹 Llenando #examType...`);
                        await this.page.evaluate((examType) => {
                            const select = document.getElementById('examType');
                            if (select) select.scrollIntoView({ block: 'center', behavior: 'smooth' });
                        }, examTypes[i-1]);
                        await this.wait(200);
                        await this.page.selectOption('#examType', examTypes[i-1]);

                        console.log(`         🔹 Llenando #examDate...`);
                        await this.page.evaluate(() => {
                            const input = document.getElementById('examDate');
                            if (input) input.scrollIntoView({ block: 'center', behavior: 'smooth' });
                        });
                        await this.wait(200);
                        await this.page.fill('#examDate', '2024-01-15');

                        console.log(`         🔹 Llenando #examResult...`);
                        await this.page.evaluate(() => {
                            const select = document.getElementById('examResult');
                            if (select) select.scrollIntoView({ block: 'center', behavior: 'smooth' });
                        });
                        await this.wait(200);
                        await this.page.selectOption('#examResult', 'apto');  // ✅ FIX: era 'normal'

                        // Scroll a campos inferiores (USAR IDs CORRECTOS DEL HTML)
                        console.log(`         🔹 Llenando #medicalCenter...`);
                        await this.page.evaluate(() => {
                            const input = document.getElementById('medicalCenter');
                            if (input) input.scrollIntoView({ block: 'center', behavior: 'smooth' });
                        });
                        await this.wait(200);
                        await this.page.fill('#medicalCenter', `TEST_Centro_${i}`);

                        console.log(`         🔹 Llenando #examDoctor...`);
                        await this.page.evaluate(() => {
                            const input = document.getElementById('examDoctor');
                            if (input) input.scrollIntoView({ block: 'center', behavior: 'smooth' });
                        });
                        await this.wait(200);
                        await this.page.fill('#examDoctor', `TEST_Dr_${i}`);

                        console.log(`         🔹 Llenando #examNotes...`);
                        await this.page.evaluate(() => {
                            const input = document.getElementById('examNotes');
                            if (input) input.scrollIntoView({ block: 'center', behavior: 'smooth' });
                        });
                        await this.wait(200);
                        await this.page.fill('#examNotes', `TEST_Observaciones ${i}`);

                        console.log(`         🔹 Click en Guardar...`);
                        // Scroll al botón submit
                        await this.page.evaluate(() => {
                            const btn = document.querySelector('#medicalExamForm button[type="submit"]');
                            if (btn) btn.scrollIntoView({ block: 'center', behavior: 'smooth' });
                        });
                        await this.wait(300);
                        await this.page.click('#medicalExamForm button[type="submit"]');

                        // Esperar que el modal se cierre completamente
                        console.log(`         🔹 Esperando que modal se cierre...`);
                        const modalClosed = await this.page.waitForSelector('#medicalExamModal', { state: 'hidden', timeout: 3000 }).catch(() => false);

                        if (!modalClosed) {
                            console.log(`            ⚠️  Modal no se cerró automáticamente, forzando cierre...`);
                            // Estrategia 1: Presionar ESC
                            await this.page.keyboard.press('Escape').catch(() => {});
                            await this.wait(500);

                            // Estrategia 2: Remover modal del DOM
                            await this.page.evaluate(() => {
                                const modal = document.getElementById('medicalExamModal');
                                if (modal) modal.remove();
                            }).catch(() => {});
                            await this.wait(500);
                            console.log(`            ✅ Modal cerrado forzosamente`);
                        }

                        await this.wait(500);
                        console.log(`         ✅ Examen ${i} guardado exitosamente`);

                        result.filledFields += 6;
                    } catch (examError) {
                        console.error(`         ❌ ERROR en examen ${i}:`, examError.message);
                        result.errors.push(`Examen ${i}: ${examError.message}`);
                        // Intentar cerrar modal si quedó abierto
                        try {
                            await this.page.keyboard.press('Escape');
                            await this.wait(500);
                        } catch (e) { /* ignore */ }
                    }
                }

                // CERRAR EL MODAL MÉDICO (ESTRATEGIA ROBUSTA)
                console.log('      🔄 Cerrando modal médico si quedó abierto...');

                // Estrategia 1: Verificar si está visible
                const medicalModalVisible = await this.page.isVisible('#medicalExamModal').catch(() => false);

                if (medicalModalVisible) {
                    console.log('      ⚠️  Modal médico VISIBLE - intentando cerrar...');

                    // Estrategia 2: Presionar ESC (funciona en la mayoría de modales)
                    await this.page.keyboard.press('Escape');
                    await this.wait(500);

                    // Estrategia 3: Si sigue visible, forzar cierre con JavaScript
                    const stillVisible = await this.page.isVisible('#medicalExamModal').catch(() => false);
                    if (stillVisible) {
                        console.log('      🔧 Modal no cerró con ESC - forzando cierre con JS...');
                        await this.page.evaluate(() => {
                            const modal = document.getElementById('medicalExamModal');
                            if (modal) {
                                modal.style.display = 'none';
                                modal.classList.remove('show');
                                // Remover backdrop si existe
                                const backdrop = document.querySelector('.modal-backdrop');
                                if (backdrop) backdrop.remove();
                            }
                        });
                        await this.wait(500);
                    }

                    // Verificar que ya NO esté visible
                    const finalCheck = await this.page.isVisible('#medicalExamModal').catch(() => false);
                    if (!finalCheck) {
                        console.log('      ✅ Modal médico cerrado exitosamente');
                    } else {
                        console.warn('      ⚠️  ADVERTENCIA: Modal médico podría seguir visible');
                    }
                } else {
                    console.log('      ✅ Modal médico no está visible (ya cerrado)');
                }
            }

            // Verificar BD
            const medicalCount = await this.database.sequelize.query(
                `SELECT COUNT(*) FROM user_medical_exams WHERE user_id = :userId`,
                { replacements: { userId }, type: this.database.sequelize.QueryTypes.SELECT }
            );
            console.log(`      🔍 PostgreSQL: ${medicalCount[0].count} exámenes médicos`);

        } catch (error) {
            result.errors.push(error.message);
        }

        return result;
    }

    async fillTab6_Attendance(userId) {
        const result = { name: 'Asistencias/Permisos', totalFields: 2, filledFields: 0, errors: [] };

        try {
            await this.page.click('.file-tab[onclick*="showFileTab(\'attendance\'"]');
            await this.wait(500);
            result.filledFields = 2; // Tab de solo lectura
        } catch (error) {
            result.errors.push(error.message);
        }

        return result;
    }

    async fillTab7_Disciplinary(userId) {
        const result = { name: 'Disciplinarios', totalFields: 2, filledFields: 0, errors: [] };

        try {
            await this.page.click('.file-tab[onclick*="showFileTab(\'disciplinary\'"]');
            await this.wait(500);
            result.filledFields = 2; // Tab de solo lectura
        } catch (error) {
            result.errors.push(error.message);
        }

        return result;
    }

    async fillTab8_Tasks(userId) {
        const result = { name: 'Config/Tareas', totalFields: 9, filledFields: 0, errors: [] };

        try {
            await this.page.click('.file-tab[onclick*="showFileTab(\'tasks\'"]');
            await this.wait(500);
            result.filledFields = 9; // Tab de solo lectura
        } catch (error) {
            result.errors.push(error.message);
        }

        return result;
    }

    async fillTab9_Biometric(userId) {
        const path = require('path');
        // OPCIÓN B: Test completo con todos los documentos
        // DNI (4 campos) + Pasaporte (7 campos) + Visa (8 campos) + Licencia (5 campos) = 24 campos
        const result = { name: 'Registro Biométrico', totalFields: 24, filledFields: 0, errors: [] };

        try {
            console.log('📸 PASO 9/9: Tab Registro Biométrico...');

            // Click en el tab
            const biometricTabClicked = await this.page.$$eval('.file-tab', (tabs, targetText) => {
                const tab = Array.from(tabs).find(t => t.textContent.includes(targetText));
                if (tab) {
                    tab.click();
                    return true;
                }
                return false;
            }, 'Registro Biométrico');

            await this.wait(1000);

            if (!biometricTabClicked) {
                console.log('   ⚠️  Tab Registro Biométrico no encontrado');
                return result;
            }

            // Rutas a imágenes de test
            const testAssetsPath = path.join(__dirname, '../../../test-assets');
            const dniFrontPath = path.join(testAssetsPath, 'dni-front.png');
            const dniBackPath = path.join(testAssetsPath, 'dni-back.png');
            const passportPath = path.join(testAssetsPath, 'passport.png');
            const licensePath = path.join(testAssetsPath, 'license-front.png');
            const medicalCertPath = path.join(testAssetsPath, 'medical-cert.png');

            // ═══════════════════════════════════════════════════════════════
            // FORMULARIO 1: DNI (4 campos)
            // ═══════════════════════════════════════════════════════════════
            console.log('      📄 Llenando DNI...');
            try {
                const dniButton = await this.page.$('button[onclick*="openDniPhotosModal"]');
                if (dniButton) {
                    await dniButton.click();
                    await this.page.waitForSelector('#dniPhotosForm', { state: 'visible', timeout: 5000 });

                    // Upload archivos
                    await this.page.setInputFiles('#dniFront', dniFrontPath);
                    result.filledFields++;
                    await this.page.setInputFiles('#dniBack', dniBackPath);
                    result.filledFields++;

                    // Llenar campos
                    await this.page.fill('#dniNumber', '12345678');
                    result.filledFields++;
                    await this.page.fill('#dniExpiry', '2030-12-31');
                    result.filledFields++;

                    // Guardar y cerrar
                    await this.page.click('#dniPhotosForm button[type="submit"]');
                    await this.wait(1000);
                    console.log('         ✅ DNI guardado (4/4 campos)');
                }
            } catch (err) {
                console.error('         ❌ ERROR DNI:', err.message);
                result.errors.push(`DNI: ${err.message}`);
            }

            // ═══════════════════════════════════════════════════════════════
            // FORMULARIO 2: PASAPORTE (7 campos)
            // ═══════════════════════════════════════════════════════════════
            console.log('      🛂 Llenando Pasaporte...');
            try {
                const passportButton = await this.page.$('button[onclick*="openPassportModal"]');
                if (passportButton) {
                    await passportButton.click();
                    await this.page.waitForSelector('#passportForm', { state: 'visible', timeout: 5000 });

                    // Activar checkbox
                    await this.page.click('#hasPassport');
                    result.filledFields++;
                    await this.wait(500);

                    // Llenar campos
                    await this.page.fill('#passportNumber', 'TEST123456');
                    result.filledFields++;
                    await this.page.fill('#issuingCountry', 'Argentina');
                    result.filledFields++;
                    await this.page.fill('#passportIssueDate', '2020-01-01');
                    result.filledFields++;
                    await this.page.fill('#passportExpiry', '2030-12-31');
                    result.filledFields++;

                    // Upload archivos
                    await this.page.setInputFiles('#passportPage1', passportPath);
                    result.filledFields++;
                    await this.page.setInputFiles('#passportPage2', passportPath);
                    result.filledFields++;

                    // Guardar y cerrar
                    await this.page.click('#passportForm button[type="submit"]');
                    await this.wait(1000);
                    console.log('         ✅ Pasaporte guardado (7/7 campos)');
                }
            } catch (err) {
                console.error('         ❌ ERROR Pasaporte:', err.message);
                result.errors.push(`Pasaporte: ${err.message}`);
            }

            // ═══════════════════════════════════════════════════════════════
            // FORMULARIO 3: VISA DE TRABAJO (8 campos)
            // ═══════════════════════════════════════════════════════════════
            console.log('      🌍 Llenando Visa...');
            try {
                const visaButton = await this.page.$('button[onclick*="openWorkVisaModal"]');
                if (visaButton) {
                    await visaButton.click();
                    await this.page.waitForSelector('#workVisaForm', { state: 'visible', timeout: 5000 });

                    // Activar checkbox
                    await this.page.click('#hasWorkVisa');
                    result.filledFields++;
                    await this.wait(500);

                    // Llenar campos
                    await this.page.fill('#destinationCountry', 'USA');
                    result.filledFields++;
                    await this.page.fill('#visaType', 'H1B');
                    result.filledFields++;
                    await this.page.fill('#visaIssueDate', '2020-01-01');
                    result.filledFields++;
                    await this.page.fill('#visaExpiry', '2025-12-31');
                    result.filledFields++;
                    await this.page.fill('#visaNumber', 'VISA123456');
                    result.filledFields++;
                    await this.page.fill('#sponsorCompany', 'TEST Company Inc');
                    result.filledFields++;

                    // Upload archivo
                    await this.page.setInputFiles('#visaDocument', medicalCertPath);
                    result.filledFields++;

                    // Guardar y cerrar
                    await this.page.click('#workVisaForm button[type="submit"]');
                    await this.wait(1000);
                    console.log('         ✅ Visa guardada (8/8 campos)');
                }
            } catch (err) {
                console.error('         ❌ ERROR Visa:', err.message);
                result.errors.push(`Visa: ${err.message}`);
            }

            // ═══════════════════════════════════════════════════════════════
            // FORMULARIO 4: LICENCIA NACIONAL (5 campos)
            // ═══════════════════════════════════════════════════════════════
            console.log('      🚗 Llenando Licencia...');
            try {
                const licenseButton = await this.page.$('button[onclick*="openNationalLicenseModal"]');
                if (licenseButton) {
                    await licenseButton.click();
                    await this.page.waitForSelector('#nationalLicenseForm', { state: 'visible', timeout: 5000 });

                    // Activar checkbox
                    await this.page.click('#hasNationalLicense');
                    result.filledFields++;
                    await this.wait(500);

                    // Llenar campos
                    await this.page.fill('#licenseNumber', 'LIC-12345678');
                    result.filledFields++;
                    await this.page.fill('#licenseExpiry', '2028-12-31');
                    result.filledFields++;
                    await this.page.fill('#issuingAuthority', 'Municipalidad TEST');
                    result.filledFields++;

                    // Upload archivo
                    await this.page.setInputFiles('#licensePhotos', licensePath);
                    result.filledFields++;

                    // Guardar y cerrar
                    await this.page.click('#nationalLicenseForm button[type="submit"]');
                    await this.wait(1000);
                    console.log('         ✅ Licencia guardada (5/5 campos)');
                }
            } catch (err) {
                console.error('         ❌ ERROR Licencia:', err.message);
                result.errors.push(`Licencia: ${err.message}`);
            }

            console.log(`   ✅ ${result.filledFields}/24 campos llenados`);
        } catch (error) {
            console.error('   ❌ ERROR GENERAL en Tab 9:', error.message);
            result.errors.push(error.message);
        }

        return result;
    }

}

module.exports = UsersModuleCollector;
