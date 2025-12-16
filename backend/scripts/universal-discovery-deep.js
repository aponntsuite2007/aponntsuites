/**
 * ============================================================================
 * UNIVERSAL MODULE DISCOVERY SYSTEM - DEEP DISCOVERY
 * ============================================================================
 *
 * Este script hace un discovery PROFUNDO:
 * 1. Descubre vista principal (como universal-discovery-demo.js)
 * 2. Clickea botón "Agregar/Crear/Nuevo" para abrir modal
 * 3. Descubre tabs DENTRO del modal
 * 4. Clickea cada tab para descubrir su contenido
 * 5. Detecta file uploads y DMS integration
 * 6. Busca modales anidados (botones "Ver" que abren otro modal)
 * 7. Cross-reference COMPLETO con Brain
 *
 * @version 2.0.0
 * @date 2025-12-11
 * ============================================================================
 */

const Phase4TestOrchestrator = require('../src/auditor/core/Phase4TestOrchestrator');
const database = require('../src/config/database');
const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  UNIVERSAL MODULE DISCOVERY - DEEP DISCOVERY              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

(async () => {
    const orchestrator = new Phase4TestOrchestrator({
        headless: false,
        slowMo: 100,
        timeout: 60000
    }, database.sequelize);

    try {
        // Iniciar orchestrator
        await orchestrator.start();

        // Login
        console.log('🔐 LOGIN...\n');
        await orchestrator.login('isi', 'admin', 'admin123');
        console.log('✅ Login exitoso\n');

        // Navegar al módulo users
        const MODULE_KEY = 'users';
        console.log(`📂 NAVEGANDO AL MÓDULO: ${MODULE_KEY}...\n`);
        await orchestrator.navigateToModule(MODULE_KEY);
        await orchestrator.wait(2000);
        console.log('✅ Módulo cargado\n');

        console.log('═'.repeat(70));
        console.log('FASE 1: DESCUBRIMIENTO DE VISTA PRINCIPAL');
        console.log('═'.repeat(70));
        console.log('');

        // ========================================================================
        // FASE 1: DESCUBRIMIENTO VISTA PRINCIPAL
        // ========================================================================
        const discoveryMain = await orchestrator.discoverModuleStructure(MODULE_KEY);

        console.log('✅ DESCUBRIMIENTO VISTA PRINCIPAL COMPLETADO\n');
        console.log('📊 ESTRUCTURA VISTA PRINCIPAL:\n');
        console.log(`   🔘 Botones: ${discoveryMain.structure.buttons.count}`);
        console.log(`   💬 Modales: ${discoveryMain.structure.modals.count}`);
        console.log(`   📑 Tabs: ${discoveryMain.structure.tabs.count}`);
        console.log(`   📤 File Uploads: ${discoveryMain.structure.fileUploads.count}`);
        console.log(`   📝 Total Inputs: ${discoveryMain.structure.totalInputs}\n`);

        // ========================================================================
        // FASE 2: ABRIR MODAL Y DESCUBRIR ESTRUCTURA INTERNA
        // ========================================================================
        console.log('═'.repeat(70));
        console.log('FASE 2: DESCUBRIMIENTO PROFUNDO - MODAL + TABS');
        console.log('═'.repeat(70));
        console.log('');

        // Buscar botón de crear/agregar/nuevo
        console.log('🔍 Buscando botón CREAR/AGREGAR...\n');
        const createBtn = await orchestrator.findButtonByKeywords(
            ['crear', 'nuevo', 'agregar', 'add', 'new'],
            'create'
        );

        if (!createBtn) {
            throw new Error('No se encontró botón de crear');
        }

        console.log(`   ✅ Botón encontrado: "${createBtn.text}"\n`);

        // Clickear botón
        console.log('🔘 Clickeando botón...\n');
        const clicked = await orchestrator.clickButtonByText(createBtn.text);

        if (!clicked) {
            throw new Error('No se pudo clickear el botón');
        }

        console.log('   ✅ Click exitoso\n');

        // Esperar a que el modal se abra
        console.log('⏳ Esperando modal (10 reintentos, 2s c/u)...\n');

        // Debug: Ver qué elementos hay en la página después del click
        await orchestrator.wait(2000);
        const debugInfo = await orchestrator.page.evaluate(() => {
            const modals = document.querySelectorAll('[class*="modal"], [role="dialog"]');
            const allDivs = document.querySelectorAll('div');
            let largestDivs = [];

            allDivs.forEach(div => {
                const rect = div.getBoundingClientRect();
                if (rect.width > 400 && rect.height > 300) {
                    largestDivs.push({
                        classes: div.className,
                        id: div.id,
                        width: rect.width,
                        height: rect.height,
                        display: window.getComputedStyle(div).display,
                        visibility: window.getComputedStyle(div).visibility
                    });
                }
            });

            return {
                modalCount: modals.length,
                largestDivsCount: largestDivs.length,
                largestDivs: largestDivs.slice(0, 5) // Top 5
            };
        });

        console.log('   🔍 DEBUG - Elementos en página:');
        console.log(`      Modales detectados: ${debugInfo.modalCount}`);
        console.log(`      Divs grandes (>400x300): ${debugInfo.largestDivsCount}`);
        if (debugInfo.largestDivs.length > 0) {
            console.log('      Top divs grandes:');
            debugInfo.largestDivs.forEach((div, i) => {
                console.log(`         ${i + 1}. ${div.width}x${div.height}px - class="${div.classes.substring(0, 50)}" display=${div.display}`);
            });
        }
        console.log('');

        const modal = await orchestrator.discoverModalStructure(10, 2000);

        if (!modal.found) {
            console.error('❌ No se encontró modal después de 10 intentos (20 segundos total)');
            console.error('   Esto puede significar que:');
            console.error('   1. El módulo usa una vista/página en vez de modal');
            console.error('   2. El modal usa selectores diferentes');
            console.error('   3. Se requiere más tiempo de espera\n');

            // Guardar screenshot para debugging
            await orchestrator.page.screenshot({
                path: path.join(__dirname, '../logs/debug-no-modal.png'),
                fullPage: true
            });
            console.log('   📸 Screenshot guardado en: logs/debug-no-modal.png\n');

            throw new Error('No se abrió el modal');
        }

        console.log('   ✅ MODAL ENCONTRADO:');
        console.log(`      Selector: ${modal.selector}`);
        console.log(`      Inputs: ${modal.inputCount}`);
        console.log(`      Botones: ${modal.buttons.length}\n`);

        // Descubrir tabs DENTRO del modal
        console.log('📑 Descubriendo tabs dentro del modal...\n');
        const modalTabs = await orchestrator.discoverTabs();

        if (modalTabs.found) {
            console.log(`   ✅ TABS ENCONTRADOS: ${modalTabs.count}`);
            modalTabs.tabs.forEach((tab, i) => {
                console.log(`      ${i + 1}. "${tab.label}"${tab.active ? ' [ACTIVE]' : ''} (id: ${tab.id})`);
            });
            console.log('');
        } else {
            console.log('   ⚠️  No se encontraron tabs dentro del modal\n');
        }

        // Descubrir file uploads DENTRO del modal
        console.log('📤 Descubriendo file uploads dentro del modal...\n');
        const modalUploads = await orchestrator.discoverFileUploads();

        if (modalUploads.found) {
            console.log(`   ✅ FILE UPLOADS ENCONTRADOS: ${modalUploads.count}`);
            modalUploads.uploads.forEach((upload, i) => {
                console.log(`      ${i + 1}. "${upload.label || upload.name}"${upload.dmsIntegration ? ' [DMS]' : ''}`);
                console.log(`         Accept: ${upload.accept || 'any'}`);
                console.log(`         Multiple: ${upload.multiple ? 'Sí' : 'No'}`);
            });
            console.log('');
        } else {
            console.log('   ⚠️  No se encontraron file uploads\n');
        }

        // ========================================================================
        // FASE 3: EXPLORAR CADA TAB
        // ========================================================================
        const tabsDiscovery = [];

        if (modalTabs.found && modalTabs.count > 0) {
            console.log('═'.repeat(70));
            console.log('FASE 3: EXPLORACIÓN DE CADA TAB');
            console.log('═'.repeat(70));
            console.log('');

            for (let i = 0; i < modalTabs.tabs.length; i++) {
                const tab = modalTabs.tabs[i];
                console.log(`\n📑 Explorando TAB ${i + 1}: "${tab.label}"\n`);

                // Clickear el tab
                const tabClicked = await orchestrator.page.evaluate((tabId) => {
                    const tabElement = document.querySelector(`#${tabId}`) ||
                                     document.querySelector(`[id="${tabId}"]`);
                    if (tabElement) {
                        tabElement.click();
                        return true;
                    }
                    return false;
                }, tab.id);

                if (!tabClicked) {
                    console.log(`   ⚠️  No se pudo clickear el tab "${tab.label}"\n`);
                    continue;
                }

                await orchestrator.wait(500);

                // Descubrir contenido del tab
                const tabContent = await orchestrator.page.evaluate(() => {
                    const activeTabPane = document.querySelector('.tab-pane.active') ||
                                        document.querySelector('[role="tabpanel"]:not([hidden])');

                    if (!activeTabPane) {
                        return { found: false };
                    }

                    const inputs = Array.from(activeTabPane.querySelectorAll('input, select, textarea'));
                    const buttons = Array.from(activeTabPane.querySelectorAll('button'));
                    const fileUploads = Array.from(activeTabPane.querySelectorAll('input[type="file"]'));

                    return {
                        found: true,
                        inputs: inputs.length,
                        buttons: buttons.length,
                        fileUploads: fileUploads.length,
                        hasDMS: !!activeTabPane.querySelector('[data-dms], [class*="dms"]'),
                        hasVencimientos: !!activeTabPane.querySelector('[data-vencimiento], [class*="vencimiento"]'),
                        buttonsDetails: buttons.map(btn => ({
                            text: btn.textContent.trim(),
                            onclick: btn.getAttribute('onclick')
                        }))
                    };
                });

                if (tabContent.found) {
                    console.log(`   ✅ Contenido del tab "${tab.label}":`);
                    console.log(`      Inputs: ${tabContent.inputs}`);
                    console.log(`      Botones: ${tabContent.buttons}`);
                    console.log(`      File Uploads: ${tabContent.fileUploads}`);
                    console.log(`      DMS Integration: ${tabContent.hasDMS ? '✅' : '❌'}`);
                    console.log(`      Vencimientos: ${tabContent.hasVencimientos ? '✅' : '❌'}`);

                    if (tabContent.buttonsDetails.length > 0) {
                        console.log(`      Botones en tab:`);
                        tabContent.buttonsDetails.forEach((btn, idx) => {
                            console.log(`         ${idx + 1}. "${btn.text}"${btn.onclick ? ' [onclick]' : ''}`);
                        });
                    }

                    tabsDiscovery.push({
                        tab: tab.label,
                        ...tabContent
                    });
                } else {
                    console.log(`   ⚠️  No se pudo acceder al contenido del tab\n`);
                }
            }
        }

        // ========================================================================
        // FASE 4: BUSCAR MODALES ANIDADOS (botones "Ver" que abren otro modal)
        // ========================================================================
        console.log('\n' + '═'.repeat(70));
        console.log('FASE 4: DETECCIÓN DE MODALES ANIDADOS');
        console.log('═'.repeat(70));
        console.log('');

        const nestedModalButtons = await orchestrator.page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('.modal button, .modal a[onclick]'));
            return buttons
                .filter(btn => {
                    const text = btn.textContent.toLowerCase();
                    const onclick = btn.getAttribute('onclick') || '';
                    return text.includes('ver') ||
                           text.includes('view') ||
                           text.includes('detalle') ||
                           onclick.includes('show') ||
                           onclick.includes('open');
                })
                .map(btn => ({
                    text: btn.textContent.trim(),
                    onclick: btn.getAttribute('onclick')
                }));
        });

        if (nestedModalButtons.length > 0) {
            console.log(`   ⚠️  POSIBLES MODALES ANIDADOS: ${nestedModalButtons.length} botones detectados`);
            nestedModalButtons.forEach((btn, i) => {
                console.log(`      ${i + 1}. "${btn.text}" (onclick: ${btn.onclick || 'N/A'})`);
            });
            console.log('');
        } else {
            console.log('   ✅ No se detectaron modales anidados\n');
        }

        // ========================================================================
        // FASE 5: REPORTE CONSOLIDADO
        // ========================================================================
        console.log('═'.repeat(70));
        console.log('FASE 5: CROSS-REFERENCE CON BRAIN');
        console.log('═'.repeat(70));
        console.log('');

        const comparisonMain = await orchestrator.crossReferenceWithBrain(discoveryMain, MODULE_KEY);

        // Consolidar discovery completo
        const fullDiscovery = {
            moduleName: MODULE_KEY,
            timestamp: new Date().toISOString(),

            mainView: {
                buttons: discoveryMain.structure.buttons.count,
                inputs: discoveryMain.structure.totalInputs,
                tabs: discoveryMain.structure.tabs.count
            },

            modalView: {
                found: modal.found,
                inputs: modal.inputCount,
                buttons: modal.buttons.length,
                tabs: modalTabs.found ? modalTabs.count : 0,
                fileUploads: modalUploads.found ? modalUploads.count : 0
            },

            tabsExplored: tabsDiscovery,

            nestedModals: {
                detected: nestedModalButtons.length > 0,
                count: nestedModalButtons.length,
                buttons: nestedModalButtons
            },

            integrations: {
                dms: tabsDiscovery.some(tab => tab.hasDMS),
                vencimientos: tabsDiscovery.some(tab => tab.hasVencimientos)
            },

            brainComparison: comparisonMain
        };

        // Guardar reporte completo
        const reportPath = path.join(__dirname, `../logs/discovery-deep-${MODULE_KEY}-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(fullDiscovery, null, 2));

        console.log(`✅ Reporte guardado en: ${reportPath}\n`);

        // ========================================================================
        // RESUMEN FINAL
        // ========================================================================
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║                    RESUMEN FINAL                           ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        console.log('📊 VISTA PRINCIPAL:');
        console.log(`   - ${discoveryMain.structure.buttons.count} botones`);
        console.log(`   - ${discoveryMain.structure.totalInputs} inputs\n`);

        console.log('💬 MODAL DESCUBIERTO:');
        console.log(`   - ${modal.inputCount} inputs en modal`);
        console.log(`   - ${modalTabs.found ? modalTabs.count : 0} tabs dentro del modal`);
        console.log(`   - ${modalUploads.found ? modalUploads.count : 0} file uploads\n`);

        if (tabsDiscovery.length > 0) {
            console.log('📑 TABS EXPLORADOS:');
            tabsDiscovery.forEach((tab, i) => {
                console.log(`   ${i + 1}. "${tab.tab}": ${tab.inputs} inputs, ${tab.buttons} botones, ${tab.fileUploads} uploads`);
            });
            console.log('');
        }

        if (nestedModalButtons.length > 0) {
            console.log('⚠️  MODALES ANIDADOS POTENCIALES:');
            console.log(`   ${nestedModalButtons.length} botones "Ver/Detalle" detectados\n`);
        }

        console.log('🔗 INTEGRACIONES DETECTADAS:');
        console.log(`   DMS: ${fullDiscovery.integrations.dms ? '✅' : '❌'}`);
        console.log(`   Vencimientos: ${fullDiscovery.integrations.vencimientos ? '✅' : '❌'}\n`);

        console.log('🧠 BRAIN STATUS:');
        console.log(`   Elementos NO documentados: ${comparisonMain.gaps.undocumented.length}`);
        console.log(`   Recomendaciones: ${comparisonMain.gaps.recommendations.length}\n`);

        console.log('🎯 PRÓXIMOS PASOS:');
        if (comparisonMain.gaps.undocumented.length > 0) {
            console.log('   1. Actualizar Brain metadata con elementos descubiertos');
            console.log('   2. Documentar tabs y su contenido');
            console.log('   3. Documentar file uploads y DMS integration\n');
        } else {
            console.log('   ✅ Brain metadata está actualizado\n');
        }

        await orchestrator.stop();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        await orchestrator.stop();
        process.exit(1);
    }
})();
