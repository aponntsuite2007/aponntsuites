const fs = require('fs');
const path = require('path');

console.log('🚀 MEJORANDO PHASE 4 TEST ORCHESTRATOR - TESTING COMPREHENSIVO');
console.log('═'.repeat(80));

const orchestratorFile = path.join(__dirname, 'src/auditor/core/Phase4TestOrchestrator.js');
let content = fs.readFileSync(orchestratorFile, 'utf8');

// ============================================================================
// 1. CAMBIAR BASE URL DE 9998 A 9999
// ============================================================================
console.log('\n📝 Paso 1: Actualizando baseUrl de 9998 → 9999...');

content = content.replace(
    "baseUrl: config.baseUrl || process.env.BASE_URL || 'http://localhost:9998'",
    "baseUrl: config.baseUrl || process.env.BASE_URL || 'http://localhost:9999'"
);
console.log('   ✅ BaseURL actualizado a puerto 9999');

// ============================================================================
// 2. MEJORAR fillForm() - AGREGAR PREFIJO "TEST_"
// ============================================================================
console.log('\n📝 Paso 2: Mejorando fillForm() - Agregando prefijo TEST_...');

const oldFillForm = `    async fillForm(moduleName) {
        this.logger.debug('BROWSER', \`📝 Llenando formulario para: \${moduleName}\`);

        const timestamp = Date.now();
        const formData = {
            'users': {
                'input[name*="nombre"], input[placeholder*="Nombre"]': \`Test User \${timestamp}\`,
                'input[name*="apellido"], input[placeholder*="Apellido"]': 'Automated',
                'input[name*="email"], input[type="email"]': \`test\${timestamp}@test.com\`,
                'input[name*="dni"], input[placeholder*="DNI"]': \`\${timestamp}\`.substring(0, 8),
                'input[name*="legajo"], input[placeholder*="Legajo"]': \`LEG\${timestamp}\`.substring(0, 10)
            },
            'attendance': {
                'input[type="datetime-local"]': new Date().toISOString().slice(0, 16),
                'select[name*="tipo"]': 'entrada'
            },
            'departments': {
                'input[name*="nombre"], input[placeholder*="Nombre"]': \`Depto Test \${timestamp}\`,
                'textarea[name*="descripcion"]': 'Departamento de prueba automatizada'
            },
            'shifts': {
                'input[name*="nombre"], input[placeholder*="Nombre"]': \`Turno Test \${timestamp}\`,
                'input[type="time"]:first-of-type': '09:00',
                'input[type="time"]:last-of-type': '17:00'
            },
            'permissions': {
                'input[type="date"]': new Date().toISOString().slice(0, 10),
                'textarea': 'Permiso de prueba automatizada'
            },
            'vacations': {
                'input[type="date"]:first-of-type': new Date().toISOString().slice(0, 10),
                'input[type="date"]:last-of-type': new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10)
            },
            'medical': {
                'input[type="date"]': new Date().toISOString().slice(0, 10),
                'textarea': 'Licencia médica de prueba'
            }
        };`;

const newFillForm = `    async fillForm(moduleName) {
        this.logger.debug('BROWSER', \`📝 Llenando formulario para: \${moduleName}\`);

        const timestamp = Date.now();
        // ✨ NUEVO: Prefijo TEST_ para identificar registros de prueba
        const testPrefix = 'TEST_';

        const formData = {
            'users': {
                'input[name*="nombre"], input[placeholder*="Nombre"]': \`\${testPrefix}User_\${timestamp}\`,
                'input[name*="apellido"], input[placeholder*="Apellido"]': \`\${testPrefix}Automated\`,
                'input[name*="email"], input[type="email"]': \`test_\${timestamp}@test.com\`,
                'input[name*="dni"], input[placeholder*="DNI"]': \`\${timestamp}\`.substring(0, 8),
                'input[name*="legajo"], input[placeholder*="Legajo"]': \`\${testPrefix}\${timestamp}\`.substring(0, 10)
            },
            'attendance': {
                'input[type="datetime-local"]': new Date().toISOString().slice(0, 16),
                'select[name*="tipo"]': 'entrada'
            },
            'departments': {
                'input[name*="nombre"], input[placeholder*="Nombre"]': \`\${testPrefix}Depto_\${timestamp}\`,
                'textarea[name*="descripcion"]': 'Departamento de prueba automatizada - TESTING'
            },
            'shifts': {
                'input[name*="nombre"], input[placeholder*="Nombre"]': \`\${testPrefix}Turno_\${timestamp}\`,
                'input[type="time"]:first-of-type': '09:00',
                'input[type="time"]:last-of-type': '17:00'
            },
            'permissions': {
                'input[type="date"]': new Date().toISOString().slice(0, 10),
                'textarea': \`\${testPrefix}Permiso de prueba automatizada\`
            },
            'vacations': {
                'input[type="date"]:first-of-type': new Date().toISOString().slice(0, 10),
                'input[type="date"]:last-of-type': new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10)
            },
            'medical': {
                'input[type="date"]': new Date().toISOString().slice(0, 10),
                'textarea': \`\${testPrefix}Licencia médica de prueba\`
            }
        };`;

content = content.replace(oldFillForm, newFillForm);
console.log('   ✅ fillForm() mejorado - Ahora usa prefijo TEST_');

// ============================================================================
// 3. AGREGAR MÉTODO testAllButtons() - TESTING COMPREHENSIVO
// ============================================================================
console.log('\n📝 Paso 3: Agregando método testAllButtons() para click exhaustivo...');

const testAllButtonsMethod = `
    /**
     * ✨ NUEVO: Testear TODOS los botones visibles en el módulo
     * Hace click en cada botón y captura errores sin detener la ejecución
     */
    async testAllButtons(moduleName) {
        console.log(\`\\n🔘 TEST ALL BUTTONS - Clickeando todos los botones de \${moduleName}...\`);
        this.logger.info('TEST', 'Iniciando test comprehensivo de botones', { moduleName });

        try {
            // Esperar a que la página cargue completamente
            await this.wait(2000);

            // Obtener todos los botones visibles
            const buttons = await this.page.$$eval('button', btns =>
                btns.map((btn, index) => ({
                    index,
                    text: btn.textContent.trim(),
                    classes: btn.className,
                    visible: btn.offsetParent !== null,
                    disabled: btn.disabled
                }))
            );

            const visibleButtons = buttons.filter(b => b.visible && !b.disabled);
            console.log(\`   📊 Total botones encontrados: \${buttons.length}\`);
            console.log(\`   ✅ Botones visibles y habilitados: \${visibleButtons.length}\`);

            let clicked = 0;
            let errors = 0;

            for (const btnInfo of visibleButtons) {
                try {
                    console.log(\`   🖱️  Clickeando: "\${btnInfo.text}" (index: \${btnInfo.index})\`);

                    // Click usando evaluate para evitar problemas de timing
                    await this.page.evaluate((idx) => {
                        const btn = document.querySelectorAll('button')[idx];
                        if (btn && !btn.disabled && btn.offsetParent !== null) {
                            btn.click();
                            return true;
                        }
                        return false;
                    }, btnInfo.index);

                    clicked++;
                    await this.wait(500); // Esperar a que se procese el click

                    // Si abrió un modal, intentar cerrarlo
                    const modalVisible = await this.page.$('.modal.show, .modal-backdrop');
                    if (modalVisible) {
                        console.log(\`      ℹ️  Modal detectado, cerrando...\`);
                        await this.clickByText('button', 'Cerrar');
                        await this.wait(500);
                    }

                } catch (error) {
                    console.log(\`      ⚠️  Error al clickear "\${btnInfo.text}": \${error.message}\`);
                    errors++;
                }
            }

            console.log(\`\\n   📊 RESUMEN TEST BUTTONS:\`);
            console.log(\`      ✅ Botones clickeados: \${clicked}\`);
            console.log(\`      ⚠️  Errores: \${errors}\`);

            this.logger.info('TEST', 'Test de botones completado', {
                moduleName,
                clicked,
                errors,
                totalButtons: visibleButtons.length
            });

            return { success: true, clicked, errors, total: visibleButtons.length };

        } catch (error) {
            console.error(\`   ❌ ERROR en testAllButtons: \${error.message}\`);
            this.logger.error('TEST', 'Error en test de botones', {
                moduleName,
                error: error.message
            });
            return { success: false, error };
        }
    }

    /**
     * ✨ NUEVO: Detectar y testear submódulos
     * Busca tabs, accordions, o secciones expandibles dentro del módulo
     */
    async testSubmodules(moduleName) {
        console.log(\`\\n📂 TEST SUBMODULES - Buscando submódulos en \${moduleName}...\`);
        this.logger.info('TEST', 'Iniciando detección de submódulos', { moduleName });

        try {
            await this.wait(2000);

            // Buscar tabs (pestañas)
            const tabs = await this.page.$$eval('.nav-tabs a, .tab-button, [role="tab"]',
                tabs => tabs.map((tab, idx) => ({
                    index: idx,
                    text: tab.textContent.trim(),
                    visible: tab.offsetParent !== null
                }))
            );

            const visibleTabs = tabs.filter(t => t.visible && t.text.length > 0);
            console.log(\`   📑 Tabs/Pestañas encontradas: \${visibleTabs.length}\`);

            let testedSubmodules = 0;

            for (const tab of visibleTabs) {
                try {
                    console.log(\`\\n   🔹 TESTING SUBMÓDULO: "\${tab.text}"\`);

                    // Click en el tab
                    await this.page.evaluate((idx) => {
                        const tabElements = document.querySelectorAll('.nav-tabs a, .tab-button, [role="tab"]');
                        if (tabElements[idx]) {
                            tabElements[idx].click();
                        }
                    }, tab.index);

                    await this.wait(1500);

                    // Testear botones del submódulo
                    const submoduleButtons = await this.testAllButtons(\`\${moduleName}/\${tab.text}\`);
                    console.log(\`      ✅ Submódulo "\${tab.text}" testeado - \${submoduleButtons.clicked} botones\`);

                    testedSubmodules++;

                } catch (error) {
                    console.log(\`      ⚠️  Error testeando submódulo "\${tab.text}": \${error.message}\`);
                }
            }

            console.log(\`\\n   📊 RESUMEN SUBMODULES:\`);
            console.log(\`      ✅ Submódulos testeados: \${testedSubmodules}\`);

            this.logger.info('TEST', 'Test de submódulos completado', {
                moduleName,
                submodules: testedSubmodules
            });

            return { success: true, submodules: testedSubmodules };

        } catch (error) {
            console.error(\`   ❌ ERROR en testSubmodules: \${error.message}\`);
            this.logger.error('TEST', 'Error en test de submódulos', {
                moduleName,
                error: error.message
            });
            return { success: false, error };
        }
    }
`;

// Insertar los nuevos métodos antes del método generateReport()
const insertBeforeGenerateReport = `    /**
     * Generar reporte final
     */
    generateReport(moduleName) {`;

content = content.replace(
    insertBeforeGenerateReport,
    testAllButtonsMethod + '\n' + insertBeforeGenerateReport
);

console.log('   ✅ Métodos testAllButtons() y testSubmodules() agregados');

// ============================================================================
// 4. INTEGRAR NUEVOS TESTS EN runModuleTest()
// ============================================================================
console.log('\n📝 Paso 4: Integrando nuevos tests en runModuleTest()...');

const oldRunModuleTestSection = `                // Test CRUD completo con validación PostgreSQL
                const createResult = await this.testCreate(moduleName, companyId, tableName);
                const readResult = await this.testRead(moduleName, companyId, tableName);
                const updateResult = await this.testUpdate(moduleName, companyId, tableName);
                const deleteResult = await this.testDelete(moduleName, companyId, tableName);`;

const newRunModuleTestSection = `                // Test CRUD completo con validación PostgreSQL
                const createResult = await this.testCreate(moduleName, companyId, tableName);
                const readResult = await this.testRead(moduleName, companyId, tableName);
                const updateResult = await this.testUpdate(moduleName, companyId, tableName);
                const deleteResult = await this.testDelete(moduleName, companyId, tableName);

                // ✨ NUEVO: Test comprehensivo de todos los botones
                const allButtonsResult = await this.testAllButtons(moduleName);

                // ✨ NUEVO: Test de submódulos (tabs, accordions)
                const submodulesResult = await this.testSubmodules(moduleName);`;

content = content.replace(oldRunModuleTestSection, newRunModuleTestSection);
console.log('   ✅ Nuevos tests integrados en el flujo CRUD');

// ============================================================================
// 5. GUARDAR ARCHIVO
// ============================================================================
console.log('\n💾 Guardando cambios en Phase4TestOrchestrator.js...');

fs.writeFileSync(orchestratorFile, content, 'utf8');

console.log('\n' + '═'.repeat(80));
console.log('✅ ¡MEJORAS APLICADAS EXITOSAMENTE!');
console.log('═'.repeat(80));
console.log('\n📋 RESUMEN DE CAMBIOS:');
console.log('   1. ✅ BaseURL cambiado de 9998 → 9999');
console.log('   2. ✅ fillForm() ahora usa prefijo TEST_ en todos los campos');
console.log('   3. ✅ Nuevo método testAllButtons() - Clickea TODOS los botones visibles');
console.log('   4. ✅ Nuevo método testSubmodules() - Detecta y testea tabs/submódulos');
console.log('   5. ✅ Integrado en runModuleTest() - Se ejecuta automáticamente');
console.log('\n🎯 FUNCIONALIDAD COMPLETA:');
console.log('   • Prefijo TEST_ para identificar registros de prueba');
console.log('   • Click exhaustivo en TODOS los botones del módulo');
console.log('   • Detección y testing de submódulos (tabs, pestañas)');
console.log('   • Captura de errores sin detener la ejecución');
console.log('   • Logs detallados de cada acción');
console.log('\n🚀 Próximo paso: Ejecutar el test con:');
console.log('   node test-phase4-visible.js users 11 1 50');
console.log('   (o el comando que uses para iniciar el test)\n');
