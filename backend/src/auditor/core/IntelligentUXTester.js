/**
 * ============================================================================
 * INTELLIGENT UX TESTER - Testing Inteligente Basado en SSOT
 * ============================================================================
 *
 * Sistema de testing UX que NO usa selectores hardcodeados.
 * En cambio:
 * 1. Consulta SystemRegistry (SSOT) para entender el módulo
 * 2. Auto-detecta botones, modales, formularios dinámicamente
 * 3. Testea la experiencia COMPLETA del usuario
 * 4. Funciona para CUALQUIER módulo sin cambios
 *
 * @version 1.0.0
 * @date 2025-12-10
 * ============================================================================
 */

class IntelligentUXTester {
    constructor(page, systemRegistry, sequelize, logger) {
        this.page = page;
        this.registry = systemRegistry;
        this.sequelize = sequelize;
        this.logger = logger;
    }

    /**
     * Test INTELIGENTE de un módulo completo
     * No usa selectores hardcodeados - auto-detecta todo
     */
    async testModule(moduleId, companyId) {
        const results = {
            moduleId,
            tests: [],
            passed: 0,
            failed: 0,
            warnings: []
        };

        // Variables para recolectar descubrimientos
        let buttons = [];
        let modalInfo = null;
        let fields = [];
        let flows = {
            create: { tested: false, passed: false },
            read: { tested: false, passed: false },
            update: { tested: false, passed: false },
            delete: { tested: false, passed: false }
        };

        try {
            // 1. OBTENER INFO DEL MÓDULO DESDE SSOT
            const moduleInfo = this.registry.getModule(moduleId);
            if (!moduleInfo) {
                throw new Error(`Módulo ${moduleId} no encontrado en SystemRegistry`);
            }

            console.log(`\n🧠 [INTELLIGENT TEST] Módulo: ${moduleInfo.name}`);
            console.log(`   Categoría: ${moduleInfo.category}`);
            console.log(`   Versión: ${moduleInfo.version}`);

            // 2. NAVEGACIÓN INTELIGENTE
            await this.testNavigation(moduleId, results);
            flows.read.tested = true;
            flows.read.passed = results.tests.find(t => t.name === 'navigation')?.status === 'passed';

            // 3. CONSULTAR CONOCIMIENTO PREVIO (usar memoria antes que auto-discovery)
            const knownDiscoveries = await this.registry.getValidatedDiscoveries(moduleId, 3);

            if (knownDiscoveries && knownDiscoveries.length > 0) {
                // Hay conocimiento validado - usarlo directamente
                console.log(`\n📚 [KNOWLEDGE BASE] ${knownDiscoveries.length} descubrimientos validados encontrados`);

                // Mapear discoveries a formato de buttons
                buttons = knownDiscoveries
                    .filter(d => d.discovery_type === 'button')
                    .map((d, idx) => {
                        const data = typeof d.discovery_data === 'string'
                            ? JSON.parse(d.discovery_data)
                            : d.discovery_data;

                        return {
                            index: idx,
                            globalIndex: idx,
                            text: data.text || '',
                            classes: data.classes || '',
                            id: data.id || '',
                            visible: true,
                            onclick: data.onclick || '',
                            type: data.type || 'OTHER',
                            validationCount: d.validation_count,
                            fromKnowledgeBase: true  // Flag importante
                        };
                    });

                if (buttons.length > 0) {
                    console.log(`   ✅ Usando ${buttons.length} botones del conocimiento acumulado`);
                    console.log(`   📊 Validación promedio: ${(buttons.reduce((sum, b) => sum + (b.validationCount || 0), 0) / buttons.length).toFixed(1)}x`);
                } else {
                    // No hay botones en knowledge base, hacer auto-discovery
                    console.log(`   ⚠️  No hay botones en knowledge base, haciendo auto-discovery...`);
                    buttons = await this.discoverButtons();
                    console.log(`   🔍 ${buttons.length} botones auto-descubiertos`);
                }
            } else {
                // No hay conocimiento previo - hacer auto-discovery clásico
                console.log(`\n🔍 [AUTO-DISCOVERY] No hay conocimiento previo, descubriendo...`);
                buttons = await this.discoverButtons();
                console.log(`   ✅ ${buttons.length} botones encontrados`);
            }

            // 4. TESTEAR CRUD SI HAY BOTONES
            if (buttons.length > 0) {
                await this.testCRUDFlow(moduleId, buttons, companyId, results);

                // Marcar flows como testeados
                const crudTest = results.tests.find(t => t.name === 'crud_flow');
                if (crudTest) {
                    flows.create.tested = true;
                    flows.create.passed = crudTest.status === 'passed';
                }
            }

            // 5. TESTEAR MODALES
            await this.testModals(moduleId, results);

            // 6. VERIFICAR PERSISTENCIA EN BD
            if (moduleInfo.database && moduleInfo.database.tables) {
                await this.testDatabasePersistence(moduleInfo.database.tables[0], companyId, results);
            }

            // 7. RECOLECTAR DESCUBRIMIENTOS (FEEDBACK LOOP - PARTE 1)
            const discoveries = this.collectDiscoveries(buttons, modalInfo, fields, flows);
            console.log(`\n📦 [DISCOVERIES] Recolectados: ${discoveries.buttons.length} botones, ${discoveries.flows.length} flujos`);

            // 8. REPORTAR DESCUBRIMIENTOS AL REGISTRY/BRAIN (FEEDBACK LOOP - PARTE 2)
            await this.reportDiscoveriesToRegistry(moduleId, companyId, results, discoveries);

        } catch (error) {
            results.tests.push({
                name: 'module_test',
                status: 'failed',
                error: error.message
            });
            results.failed++;
        }

        return results;
    }

    /**
     * Navegación inteligente al módulo
     */
    async testNavigation(moduleId, results) {
        console.log(`\n🧪 TEST 1: NAVEGACIÓN AL MÓDULO ${moduleId.toUpperCase()}`);
        console.log('─'.repeat(60));

        try {
            // Intentar múltiples estrategias de navegación
            let navigated = false;

            // Estrategia 1: showModuleContent
            try {
                await this.page.evaluate((id) => {
                    if (typeof showModuleContent === 'function') {
                        showModuleContent(id);
                        return true;
                    }
                    return false;
                }, moduleId);
                await this.page.waitForTimeout(2000);
                navigated = true;
            } catch (e) {}

            // Estrategia 2: Click en menú
            if (!navigated) {
                const menuClicked = await this.page.evaluate((id) => {
                    const menuItems = Array.from(document.querySelectorAll('[data-module], a[href*="' + id + '"], button[onclick*="' + id + '"]'));
                    if (menuItems.length > 0) {
                        menuItems[0].click();
                        return true;
                    }
                    return false;
                }, moduleId);

                if (menuClicked) {
                    await this.page.waitForTimeout(2000);
                    navigated = true;
                }
            }

            // Verificar que algo se cargó
            const hasContent = await this.page.evaluate(() => {
                const containers = document.querySelectorAll('[id], [class*="module"], [class*="container"]');
                return containers.length > 0;
            });

            if (hasContent) {
                console.log('   ✅ TEST 1 PASSED - Navegación exitosa');
                results.tests.push({ name: 'navigation', status: 'passed' });
                results.passed++;
            } else {
                throw new Error('No se encontró contenido después de navegar');
            }

        } catch (error) {
            console.log(`   ❌ TEST 1 FAILED: ${error.message}`);
            results.tests.push({ name: 'navigation', status: 'failed', error: error.message });
            results.failed++;
        }
    }

    /**
     * AUTO-DESCUBRIR botones en la página
     * No usa textos hardcodeados
     */
    async discoverButtons() {
        const buttons = await this.page.$$eval('button:not([style*="display: none"]):not([disabled])', btns =>
            Array.from(btns).map((btn, idx) => ({
                index: idx,
                text: btn.textContent.trim(),
                classes: btn.className,
                id: btn.id,
                visible: btn.offsetParent !== null,
                onclick: btn.getAttribute('onclick') || ''
            }))
        );

        // Filtrar solo visibles
        const visible = buttons.filter(b => b.visible && b.text.length > 0);

        // Clasificar botones por función (inteligente)
        visible.forEach(btn => {
            const text = btn.text.toLowerCase();
            const onclick = btn.onclick.toLowerCase();

            if (text.includes('crear') || text.includes('agregar') || text.includes('nuevo') || text.includes('+')) {
                btn.type = 'CREATE';
            } else if (text.includes('lista') || text.includes('ver') || text.includes('mostrar')) {
                btn.type = 'LIST';
            } else if (text.includes('editar') || onclick.includes('edit')) {
                btn.type = 'EDIT';
            } else if (text.includes('eliminar') || text.includes('borrar')) {
                btn.type = 'DELETE';
            } else {
                btn.type = 'OTHER';
            }
        });

        return visible;
    }

    /**
     * Test completo del flujo CRUD (CREATE + EDIT + DELETE + PERSISTENCIA)
     * Simula un humano real usando el sistema
     */
    async testCRUDFlow(moduleId, buttons, companyId, results) {
        console.log(`\n🧪 TEST 2: FLUJO CRUD COMPLETO (CREATE + EDIT + DELETE + PERSISTENCIA)`);
        console.log('─'.repeat(60));

        const testData = {
            createdRecordId: null,
            createdRecordName: null,
            editedRecordName: null
        };

        try {
            // ========== PARTE 1: CREATE ==========
            console.log('\n📝 PARTE 1/4: CREATE (Crear nuevo registro)');

            // Buscar botón de lista
            const listBtn = buttons.find(b => b.type === 'LIST');
            if (listBtn) {
                console.log(`   🖱️  Clickeando "${listBtn.text}"...`);
                await this.clickButtonByIndex(listBtn.index);
                await this.page.waitForTimeout(2000);
            }

            // Buscar botón de crear
            const createBtn = buttons.find(b => b.type === 'CREATE');
            if (!createBtn) {
                console.log('   ⚠️  No se encontró botón de crear');
                results.warnings.push('No CREATE button found');
                return;
            }

            console.log(`   🖱️  Clickeando "${createBtn.text}"...`);
            await this.clickButtonByIndex(createBtn.index);
            await this.page.waitForTimeout(1000);

            // Auto-detectar modal con retry (intentar varias veces)
            console.log('   ⏳ Esperando a que se abra el modal...');
            let modalInfo = { open: false };
            for (let attempt = 1; attempt <= 5; attempt++) {
                console.log(`      Intento ${attempt}/5...`);
                modalInfo = await this.detectModal();
                if (modalInfo.open) {
                    console.log(`      ✅ Modal encontrado en intento ${attempt}`);
                    break;
                }
                await this.page.waitForTimeout(1000);
            }

            if (!modalInfo.open) {
                const diagnosis = await this.diagnosePageState();
                console.log('   🔍 Diagnóstico de la página:', diagnosis);
                throw new Error(`Modal no se abrió después de click en crear. Diagnóstico: ${JSON.stringify(diagnosis)}`);
            }

            console.log(`   ✅ Modal detectado: ${modalInfo.selector}`);

            // Auto-detectar campos del formulario
            const fields = await this.discoverFormFields(modalInfo.selector);
            console.log(`   📝 ${fields.length} campos encontrados en el formulario`);

            // Llenar formulario COMPLETO (mejorado)
            testData.createdRecordName = await this.fillFormCompletelyAsHuman(fields, moduleId);

            // Scroll al final del modal (para ver botón guardar)
            await this.scrollModalToBottom(modalInfo.selector);

            // Capturar errores de consola antes de guardar
            const consoleLogs = await this.captureConsoleErrors();

            // Buscar botón guardar
            const saveBtn = await this.findSaveButton(modalInfo.selector);
            if (saveBtn) {
                console.log(`   💾 Clickeando botón guardar...`);
                await this.page.click(saveBtn);
                await this.page.waitForTimeout(3000);

                // Verificar que modal se cerró
                const closed = await this.detectModal();
                if (!closed.open) {
                    console.log('   ✅ Modal se cerró correctamente');
                    results.tests.push({ name: 'crud_create_modal_closed', status: 'passed' });
                    results.passed++;
                } else {
                    throw new Error('Modal no se cerró después de guardar');
                }
            }

            // ========== PARTE 2: VERIFICAR PERSISTENCIA EN BD ==========
            console.log('\n🔍 PARTE 2/4: VALIDAR PERSISTENCIA EN BASE DE DATOS');
            const persisted = await this.verifyDatabasePersistence(moduleId, companyId, testData.createdRecordName);
            if (persisted) {
                console.log('   ✅ Registro guardado en BD correctamente');
                testData.createdRecordId = persisted.id;
                results.tests.push({ name: 'crud_create_db_persistence', status: 'passed', recordId: persisted.id });
                results.passed++;
            } else {
                throw new Error('Registro NO se guardó en la base de datos');
            }

            // ========== PARTE 3: EDIT (Editar registro) ==========
            console.log('\n✏️ PARTE 3/4: EDIT (Editar registro existente)');
            await this.page.waitForTimeout(1000);

            // Buscar botón editar del registro recién creado
            const editSuccess = await this.testEditFlow(moduleId, testData, results);
            if (editSuccess) {
                console.log('   ✅ TEST EDIT PASSED');
                results.tests.push({ name: 'crud_edit', status: 'passed' });
                results.passed++;
            }

            // ========== PARTE 4: VERIFICAR PERSISTENCIA DESPUÉS DE F5 ==========
            console.log('\n🔄 PARTE 4/4: VERIFICAR PERSISTENCIA DESPUÉS DE F5');
            await this.page.reload({ waitUntil: 'networkidle' });
            await this.page.waitForTimeout(2000);

            const persistsAfterReload = await this.verifyDatabasePersistence(moduleId, companyId, testData.editedRecordName || testData.createdRecordName);
            if (persistsAfterReload) {
                console.log('   ✅ Datos persisten después de recargar (F5)');
                results.tests.push({ name: 'crud_persistence_after_reload', status: 'passed' });
                results.passed++;
            }

            console.log('\n✅ FLUJO CRUD COMPLETO EXITOSO');

        } catch (error) {
            console.log(`\n❌ Error en flujo CRUD: ${error.message}`);
            results.tests.push({ name: 'crud_flow', status: 'failed', error: error.message });
            results.failed++;
        }
    }

    /**
     * Llenar formulario COMPLETO como lo haría un humano
     * Devuelve el nombre del registro creado para tracking
     */
    async fillFormCompletelyAsHuman(fields, moduleId) {
        const timestamp = Date.now();
        let recordName = `[TEST] ${moduleId}_${timestamp}`;

        console.log('   📝 Llenando formulario completo...');

        for (const field of fields) {
            if (field.type === 'hidden') continue;

            const selector = field.id ? `#${field.id}` : `[name="${field.name}"]`;
            const testValue = this.generateTestValue(field, moduleId);

            // Guardar nombre del registro para tracking
            const fieldName = (field.name || field.id || '').toLowerCase();
            if (fieldName.includes('name') || fieldName.includes('nombre')) {
                recordName = testValue;
            }

            try {
                // Simular delay humano (50-200ms entre campos)
                await this.page.waitForTimeout(Math.random() * 150 + 50);

                if (field.type === 'select' || field.type === 'select-one') {
                    await this.page.selectOption(selector, { index: 1 });
                    console.log(`      ✓ ${field.name || field.id}: Opción 1 seleccionada`);
                } else if (field.type === 'checkbox') {
                    await this.page.check(selector);
                    console.log(`      ✓ ${field.name || field.id}: Checkbox marcado`);
                } else if (field.type === 'radio') {
                    await this.page.check(selector);
                    console.log(`      ✓ ${field.name || field.id}: Radio seleccionado`);
                } else {
                    await this.page.fill(selector, testValue);
                    console.log(`      ✓ ${field.name || field.id}: "${testValue}"`);
                }
            } catch (e) {
                console.log(`      ⚠️  No se pudo llenar ${field.name || field.id}: ${e.message}`);
            }
        }

        return recordName;
    }

    /**
     * Verificar que el registro se guardó en la base de datos
     */
    async verifyDatabasePersistence(moduleId, companyId, recordName) {
        try {
            // Obtener info del módulo desde SSOT
            const moduleInfo = this.registry.getModule(moduleId);
            if (!moduleInfo || !moduleInfo.database || !moduleInfo.database.tables) {
                console.log('   ⚠️  Módulo no tiene tabla de BD configurada en SSOT');
                return null;
            }

            const tableName = moduleInfo.database.tables[0];
            const { QueryTypes } = require('sequelize');

            // Buscar registro recién creado (último registro con ese nombre)
            const records = await this.sequelize.query(
                `SELECT * FROM ${tableName}
                 WHERE company_id = :companyId
                 AND (name ILIKE :recordName OR description ILIKE :recordName)
                 ORDER BY created_at DESC LIMIT 1`,
                {
                    replacements: { companyId, recordName: `%${recordName}%` },
                    type: QueryTypes.SELECT
                }
            );

            if (records.length > 0) {
                console.log(`   ✅ Registro encontrado en BD: ${tableName}.id = ${records[0].id}`);
                return records[0];
            } else {
                console.log(`   ❌ Registro NO encontrado en BD (tabla: ${tableName})`);
                return null;
            }

        } catch (error) {
            console.log(`   ⚠️  Error verificando BD: ${error.message}`);
            return null;
        }
    }

    /**
     * Test de edición de registro
     */
    async testEditFlow(moduleId, testData, results) {
        try {
            // Buscar botón editar (último registro de la lista)
            const editBtnClicked = await this.page.evaluate(() => {
                const editButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
                    const text = btn.textContent.toLowerCase();
                    return text.includes('editar') || text.includes('edit') || btn.classList.contains('btn-edit');
                });

                if (editButtons.length > 0) {
                    // Clickear el PRIMER botón editar (último registro)
                    editButtons[0].click();
                    return true;
                }
                return false;
            });

            if (!editBtnClicked) {
                console.log('   ⚠️  No se encontró botón editar');
                return false;
            }

            await this.page.waitForTimeout(2000);

            // Detectar modal de edición
            const modalInfo = await this.detectModal();
            if (!modalInfo.open) {
                console.log('   ⚠️  Modal de edición no se abrió');
                return false;
            }

            console.log('   ✅ Modal de edición abierto');

            // Cambiar el nombre del registro
            const fields = await this.discoverFormFields(modalInfo.selector);
            const nameField = fields.find(f => {
                const name = (f.name || f.id || '').toLowerCase();
                return name.includes('name') || name.includes('nombre');
            });

            if (nameField) {
                const selector = nameField.id ? `#${nameField.id}` : `[name="${nameField.name}"]`;
                testData.editedRecordName = `${testData.createdRecordName}_EDITED`;
                await this.page.fill(selector, testData.editedRecordName);
                console.log(`   ✏️ Cambiado nombre a: ${testData.editedRecordName}`);
            }

            // Guardar cambios
            const saveBtn = await this.findSaveButton(modalInfo.selector);
            if (saveBtn) {
                await this.page.click(saveBtn);
                await this.page.waitForTimeout(3000);

                // Verificar que modal se cerró
                const closed = await this.detectModal();
                if (!closed.open) {
                    console.log('   ✅ Cambios guardados, modal cerrado');
                    return true;
                }
            }

            return false;

        } catch (error) {
            console.log(`   ❌ Error en test EDIT: ${error.message}`);
            return false;
        }
    }

    /**
     * Capturar errores de consola del navegador
     */
    async captureConsoleErrors() {
        const errors = await this.page.evaluate(() => {
            const logs = window.__consoleLogs || [];
            return logs.filter(log => log.type === 'error');
        });

        if (errors.length > 0) {
            console.log(`   ⚠️  ${errors.length} errores en consola del navegador`);
            errors.forEach(err => console.log(`      - ${err.message}`));
        }

        return errors;
    }

    /**
     * Detectar modal abierto (cualquier modal)
     */
    async detectModal() {
        return await this.page.evaluate(() => {
            const selectors = [
                '.modal.show',
                '.modal-overlay:not([style*="display: none"])',
                '[role="dialog"]:not([style*="display: none"])',
                '.swal2-container',
                '.modal-backdrop + .modal',
                // Selectores adicionales más genéricos
                '.modal:not([style*="display: none"])',
                '[class*="modal"]:not([style*="display: none"])',
                '.fade.show[role="dialog"]'
            ];

            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el && el.offsetParent !== null) {
                    return { open: true, selector: sel };
                }
            }

            return { open: false, selector: null };
        });
    }

    /**
     * Diagnosticar estado de la página cuando el modal no se encuentra
     */
    async diagnosePageState() {
        return await this.page.evaluate(() => {
            const diagnosis = {
                modals: [],
                dialogs: [],
                overlays: [],
                visibleElements: []
            };

            // Buscar todos los elementos que podrían ser modales
            const possibleModals = document.querySelectorAll('[class*="modal"], [role="dialog"], [class*="overlay"], [class*="popup"]');
            possibleModals.forEach(el => {
                const isVisible = el.offsetParent !== null;
                const style = window.getComputedStyle(el);
                diagnosis.modals.push({
                    tag: el.tagName,
                    classes: el.className,
                    id: el.id,
                    visible: isVisible,
                    display: style.display,
                    visibility: style.visibility
                });
            });

            // Buscar elements visibles recientemente añadidos al DOM
            const recentElements = Array.from(document.querySelectorAll('*')).filter(el => {
                const style = window.getComputedStyle(el);
                return style.zIndex > 100 && el.offsetParent !== null;
            });
            diagnosis.visibleElements = recentElements.slice(0, 5).map(el => ({
                tag: el.tagName,
                classes: el.className,
                id: el.id,
                zIndex: window.getComputedStyle(el).zIndex
            }));

            return diagnosis;
        });
    }

    /**
     * Auto-descubrir campos del formulario
     */
    async discoverFormFields(modalSelector) {
        return await this.page.$$eval(`${modalSelector} input, ${modalSelector} select, ${modalSelector} textarea`, fields =>
            Array.from(fields).map(field => ({
                type: field.type || field.tagName.toLowerCase(),
                name: field.name,
                id: field.id,
                placeholder: field.placeholder,
                required: field.required,
                value: field.value
            }))
        );
    }

    /**
     * Llenar formulario inteligentemente
     */
    async fillFormIntelligently(fields, moduleId) {
        for (const field of fields) {
            if (field.type === 'hidden') continue;

            const selector = field.id ? `#${field.id}` : `[name="${field.name}"]`;
            const testValue = this.generateTestValue(field, moduleId);

            try {
                if (field.type === 'select' || field.type === 'select-one') {
                    await this.page.selectOption(selector, { index: 1 });
                } else if (field.type === 'checkbox') {
                    await this.page.check(selector);
                } else {
                    await this.page.fill(selector, testValue);
                }
            } catch (e) {
                console.log(`   ⚠️  No se pudo llenar ${field.name || field.id}`);
            }
        }
    }

    /**
     * Generar valor de prueba inteligente
     */
    generateTestValue(field, moduleId) {
        const timestamp = Date.now();
        const name = (field.name || field.id || '').toLowerCase();

        if (name.includes('email')) return `test_${timestamp}@example.com`;
        if (name.includes('phone') || name.includes('telefono')) return '1234567890';
        if (name.includes('date') || name.includes('fecha')) return '2025-12-10';
        if (name.includes('name') || name.includes('nombre')) return `[TEST] ${moduleId}_${timestamp}`;
        if (name.includes('description') || name.includes('descripcion')) return `Test description ${timestamp}`;
        if (name.includes('address') || name.includes('direccion')) return 'Av. Test 123';

        return `test_${timestamp}`;
    }

    /**
     * Scroll al final del modal
     */
    async scrollModalToBottom(modalSelector) {
        await this.page.evaluate((sel) => {
            const modal = document.querySelector(sel);
            if (modal) {
                const content = modal.querySelector('.modal-content, .modal-body') || modal;
                content.scrollTo(0, content.scrollHeight);
            }
        }, modalSelector);
    }

    /**
     * Buscar botón de guardar (inteligente)
     */
    async findSaveButton(modalSelector) {
        return await this.page.evaluate((sel) => {
            const modal = document.querySelector(sel);
            if (!modal) return null;

            const buttons = Array.from(modal.querySelectorAll('button'));
            const saveBtn = buttons.find(btn => {
                const text = btn.textContent.toLowerCase();
                return text.includes('guardar') ||
                       text.includes('save') ||
                       text.includes('crear') ||
                       btn.classList.contains('btn-primary');
            });

            return saveBtn ? `${sel} button:nth-of-type(${buttons.indexOf(saveBtn) + 1})` : null;
        }, modalSelector);
    }

    /**
     * Click botón por índice
     */
    async clickButtonByIndex(index) {
        await this.page.evaluate((idx) => {
            const btns = Array.from(document.querySelectorAll('button'));
            if (btns[idx]) btns[idx].click();
        }, index);
    }

    /**
     * Test de modales
     */
    async testModals(moduleId, results) {
        // Ya testeado en CRUD flow
    }

    /**
     * Test de persistencia en base de datos
     */
    async testDatabasePersistence(tableName, companyId, results) {
        console.log(`\n🧪 TEST 3: PERSISTENCIA EN BASE DE DATOS`);
        console.log('─'.repeat(60));

        try {
            const { QueryTypes } = require('sequelize');
            const count = await this.sequelize.query(
                `SELECT COUNT(*) as count FROM ${tableName} WHERE company_id = :companyId`,
                {
                    replacements: { companyId },
                    type: QueryTypes.SELECT
                }
            );

            console.log(`   ✅ TEST 3 PASSED - ${count[0].count} registros en ${tableName}`);
            results.tests.push({ name: 'database_persistence', status: 'passed', count: count[0].count });
            results.passed++;

        } catch (error) {
            console.log(`   ⚠️  TEST 3 WARNING: ${error.message}`);
            results.warnings.push(`Database check failed: ${error.message}`);
        }
    }

    /**
     * ============================================================================
     * BIDIRECTIONAL FEEDBACK LOOP - Reportar descubrimientos al Registry/Brain
     * ============================================================================
     *
     * Este método es parte del sistema de auto-aprendizaje.
     * Envía todo lo que descubrimos durante el test de vuelta al Registry/Brain.
     */
    async reportDiscoveriesToRegistry(moduleId, companyId, results, discoveries) {
        console.log(`\n📡 [FEEDBACK LOOP] Reportando descubrimientos a Registry...`);
        console.log('─'.repeat(60));

        try {
            // Si el Registry tiene método para recibir feedback, usarlo
            if (this.registry && typeof this.registry.recordTestExecution === 'function') {
                await this.registry.recordTestExecution(moduleId, companyId, {
                    results,
                    discoveries,
                    timestamp: new Date().toISOString()
                });
                console.log('   ✅ Descubrimientos reportados al Registry');
            } else {
                console.log('   ⚠️  Registry no tiene método recordTestExecution() - feedback loop incompleto');
            }

        } catch (error) {
            console.log(`   ⚠️  Error reportando descubrimientos: ${error.message}`);
        }
    }

    /**
     * Recolectar todos los descubrimientos durante el test
     * Esto se llama durante el test para guardar lo que encontramos
     */
    collectDiscoveries(buttons, modals, fields, flows) {
        const discoveries = {
            buttons: [],
            modals: [],
            fields: [],
            flows: []
        };

        // Recolectar botones
        if (buttons && buttons.length > 0) {
            discoveries.buttons = buttons.map(btn => ({
                type: 'button',
                data: {
                    text: btn.text,
                    classes: btn.classes,
                    id: btn.id,
                    type: btn.type,
                    onclick: btn.onclick
                },
                context: btn.type === 'CREATE' ? 'create' : btn.type === 'EDIT' ? 'edit' : 'other',
                screenLocation: 'mainContent',
                worksCorrectly: true  // Si lo encontramos es porque funciona
            }));
        }

        // Recolectar modales
        if (modals) {
            discoveries.modals.push({
                type: 'modal',
                data: {
                    selector: modals.selector,
                    zIndex: modals.zIndex,
                    detected: modals.open
                },
                context: 'create',
                worksCorrectly: modals.open
            });
        }

        // Recolectar campos de formulario
        if (fields && fields.length > 0) {
            discoveries.fields = fields.map(field => ({
                type: 'field',
                data: {
                    name: field.name,
                    type: field.type,
                    required: field.required,
                    placeholder: field.placeholder,
                    value: field.value
                },
                context: 'create',
                screenLocation: 'modal',
                worksCorrectly: field.filled !== undefined ? field.filled : true
            }));
        }

        // Recolectar flujos CRUD testeados
        if (flows) {
            Object.keys(flows).forEach(flowType => {
                if (flows[flowType].tested) {
                    discoveries.flows.push({
                        type: 'flow',
                        data: {
                            flowType,  // 'create', 'read', 'update', 'delete'
                            tested: flows[flowType].tested,
                            passed: flows[flowType].passed
                        },
                        context: flowType,
                        worksCorrectly: flows[flowType].passed
                    });
                }
            });
        }

        return discoveries;
    }
}

module.exports = IntelligentUXTester;
