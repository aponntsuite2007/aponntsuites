/**
 * ============================================================================
 * TEST UX - DETECCIÓN DE PROBLEMAS REALES DE EXPERIENCIA DE USUARIO
 * ============================================================================
 *
 * Este test detecta:
 * 1. Burbujas de ayuda duplicadas/múltiples
 * 2. Modales que no se abren correctamente
 * 3. Overlays que bloquean la UI
 * 4. Botones que no funcionan
 * 5. Elementos de UI duplicados
 *
 * @version 1.0.0
 * @date 2025-12-11
 * ============================================================================
 */

const { chromium } = require('playwright');
const database = require('../src/config/database');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  TEST UX - DETECCIÓN DE PROBLEMAS REALES                  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    issues: []
};

function logIssue(severity, module, problem, details) {
    const icon = severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${severity.toUpperCase()}] ${module}: ${problem}`);
    if (details) console.log(`   ${details}`);

    results.issues.push({ severity, module, problem, details });
    if (severity === 'error') results.failed++;
    else if (severity === 'warning') results.warnings++;
}

(async () => {
    const browser = await chromium.launch({ headless: false, slowMo: 100 });
    const page = await browser.newPage();

    try {
        console.log('\n🔐 Login en ISI...\n');

        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForTimeout(1000);

        // Login 3 pasos
        await page.fill('input[name="companySlug"]', 'isi');
        await page.click('button:has-text("Continuar")');
        await page.waitForTimeout(500);

        await page.fill('input[name="username"]', 'admin');
        await page.click('button:has-text("Continuar")');
        await page.waitForTimeout(500);

        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);

        console.log('✅ Login exitoso\n');

        // ============================================================
        // TEST 1: Detectar burbujas de ayuda duplicadas
        // ============================================================
        console.log('🔍 TEST 1: Detectando burbujas de ayuda...\n');

        const helpBubbles = await page.evaluate(() => {
            const selectors = [
                '.help-bubble',
                '.ai-assistant-chat',
                '.chat-bubble',
                '.support-bubble',
                '.help-widget',
                '.ticket-widget',
                '[class*="help"]',
                '[class*="chat"]',
                '[id*="help"]',
                '[id*="chat"]',
                '[id*="assistant"]'
            ];

            const found = [];
            selectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        const rect = el.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            found.push({
                                selector,
                                tag: el.tagName,
                                id: el.id,
                                classes: el.className,
                                visible: el.offsetParent !== null,
                                position: {
                                    bottom: getComputedStyle(el).bottom,
                                    right: getComputedStyle(el).right,
                                    position: getComputedStyle(el).position
                                },
                                zIndex: getComputedStyle(el).zIndex,
                                text: el.innerText?.substring(0, 100)
                            });
                        }
                    });
                } catch (e) {}
            });
            return found;
        });

        console.log(`   Burbujas de ayuda encontradas: ${helpBubbles.length}`);

        if (helpBubbles.length === 0) {
            logIssue('info', 'DASHBOARD', 'No hay burbujas de ayuda', 'Sistema no tiene ayuda contextual');
        } else if (helpBubbles.length === 1) {
            console.log('   ✅ 1 burbuja de ayuda (correcto)\n');
            results.passed++;
        } else {
            logIssue('error', 'DASHBOARD', `${helpBubbles.length} burbujas de ayuda encontradas (DUPLICADAS)`,
                'Debería haber solo 1 sistema de ayuda unificado');
            console.log('   Detalles de burbujas encontradas:');
            helpBubbles.forEach((bubble, i) => {
                console.log(`   ${i + 1}. ${bubble.tag} - ${bubble.classes || bubble.id}`);
                console.log(`      Position: ${bubble.position.position} (bottom: ${bubble.position.bottom}, right: ${bubble.position.right})`);
                console.log(`      Z-Index: ${bubble.zIndex}`);
                console.log(`      Visible: ${bubble.visible}`);
                console.log(`      Text: ${bubble.text}\n`);
            });
        }

        // ============================================================
        // TEST 2: Detectar overlays bloqueantes
        // ============================================================
        console.log('🔍 TEST 2: Detectando overlays bloqueantes...\n');

        const overlays = await page.evaluate(() => {
            const elements = document.querySelectorAll('[class*="overlay"], [class*="backdrop"]');
            const found = [];

            elements.forEach(el => {
                const style = getComputedStyle(el);
                const rect = el.getBoundingClientRect();

                if ((style.display !== 'none' || style.visibility !== 'hidden') && rect.width > 0) {
                    found.push({
                        tag: el.tagName,
                        id: el.id,
                        classes: el.className,
                        display: style.display,
                        visibility: style.visibility,
                        position: style.position,
                        zIndex: style.zIndex,
                        width: rect.width,
                        height: rect.height
                    });
                }
            });
            return found;
        });

        console.log(`   Overlays encontrados: ${overlays.length}`);

        const activeOverlays = overlays.filter(o =>
            o.display !== 'none' &&
            o.visibility !== 'hidden' &&
            o.width > 100 &&
            o.height > 100
        );

        if (activeOverlays.length > 0) {
            logIssue('warning', 'DASHBOARD', `${activeOverlays.length} overlays activos bloqueando UI`,
                'Overlays pueden estar bloqueando interacción con la página');
            activeOverlays.forEach((overlay, i) => {
                console.log(`   ${i + 1}. ${overlay.classes}`);
                console.log(`      Display: ${overlay.display}, Visibility: ${overlay.visibility}`);
                console.log(`      Size: ${overlay.width}x${overlay.height}, Z-Index: ${overlay.zIndex}\n`);
            });
        } else {
            console.log('   ✅ No hay overlays bloqueantes\n');
            results.passed++;
        }

        // ============================================================
        // TEST 3: Probar que modales se abren correctamente
        // ============================================================
        console.log('🔍 TEST 3: Probando apertura de modales críticos...\n');

        const criticalModules = [
            { name: 'Estructura Organizacional', module: 'organizational-structure', createButton: 'Nuevo Departamento' },
            { name: 'Gestión de Usuarios', module: 'users', createButton: 'Agregar Usuario' },
            { name: 'Control de Asistencia', module: 'attendance', createButton: 'Nuevo Registro' }
        ];

        for (const mod of criticalModules) {
            console.log(`   📦 Testeando: ${mod.name}...`);

            try {
                // Navegar al módulo
                await page.click(`#btn-module-${mod.module}`);
                await page.waitForTimeout(2000);

                // Buscar botón de crear
                const createButtonSelectors = [
                    `button:has-text("${mod.createButton}")`,
                    `a:has-text("${mod.createButton}")`,
                    `[data-action="create"]`,
                    `.btn-create`,
                    `#btn-create`
                ];

                let buttonFound = false;
                let buttonSelector = null;

                for (const selector of createButtonSelectors) {
                    try {
                        const button = await page.$(selector);
                        if (button) {
                            buttonFound = true;
                            buttonSelector = selector;
                            break;
                        }
                    } catch (e) {}
                }

                if (!buttonFound) {
                    logIssue('warning', mod.name, 'Botón de crear NO encontrado',
                        `No se encontró botón con texto "${mod.createButton}"`);
                    continue;
                }

                console.log(`      ✓ Botón encontrado: ${buttonSelector}`);

                // Clickear el botón
                await page.click(buttonSelector);
                await page.waitForTimeout(2000);

                // Verificar si se abrió un modal
                const modalOpened = await page.evaluate(() => {
                    const modalSelectors = [
                        '.modal[style*="display: block"]',
                        '.modal[style*="display:block"]',
                        '.modal.show',
                        '.modal.active',
                        '[role="dialog"]',
                        '.dialog[style*="display: block"]'
                    ];

                    for (const selector of modalSelectors) {
                        const modals = document.querySelectorAll(selector);
                        for (const modal of modals) {
                            const rect = modal.getBoundingClientRect();
                            if (rect.width > 200 && rect.height > 200) {
                                return true;
                            }
                        }
                    }
                    return false;
                });

                if (modalOpened) {
                    console.log(`      ✅ Modal se abrió correctamente`);
                    results.passed++;

                    // Cerrar modal
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(500);
                } else {
                    logIssue('error', mod.name, 'Modal NO se abrió después de clickear botón',
                        `El botón "${mod.createButton}" no abre ningún modal visible`);
                }

            } catch (error) {
                logIssue('error', mod.name, 'Error al testear módulo', error.message);
            }

            console.log('');
        }

        // ============================================================
        // TEST 4: Detectar elementos UI duplicados
        // ============================================================
        console.log('🔍 TEST 4: Detectando elementos UI duplicados...\n');

        const duplicates = await page.evaluate(() => {
            const found = {};
            const duplicated = [];

            // Buscar elementos con mismo ID (GRAVE)
            const allElements = document.querySelectorAll('[id]');
            allElements.forEach(el => {
                if (el.id) {
                    if (!found[el.id]) {
                        found[el.id] = 0;
                    }
                    found[el.id]++;
                }
            });

            for (const [id, count] of Object.entries(found)) {
                if (count > 1) {
                    duplicated.push({ type: 'ID', value: id, count });
                }
            }

            return duplicated;
        });

        if (duplicates.length > 0) {
            logIssue('error', 'DASHBOARD', `${duplicates.length} IDs duplicados encontrados`,
                'HTML inválido - IDs deben ser únicos');
            duplicates.forEach(dup => {
                console.log(`   ❌ ID "${dup.value}" usado ${dup.count} veces`);
            });
        } else {
            console.log('   ✅ No hay IDs duplicados\n');
            results.passed++;
        }

        // ============================================================
        // RESUMEN FINAL
        // ============================================================
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                    RESUMEN FINAL                           ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        console.log(`✅ Tests PASSED:   ${results.passed}`);
        console.log(`❌ Tests FAILED:   ${results.failed}`);
        console.log(`⚠️  WARNINGS:       ${results.warnings}`);
        console.log(`📋 Total issues:   ${results.issues.length}\n`);

        if (results.issues.length > 0) {
            console.log('📋 LISTA DE PROBLEMAS DETECTADOS:\n');
            results.issues.forEach((issue, i) => {
                const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
                console.log(`${i + 1}. ${icon} [${issue.module}] ${issue.problem}`);
                if (issue.details) console.log(`   ${issue.details}\n`);
            });
        }

        await browser.close();

        process.exit(results.failed === 0 ? 0 : 1);

    } catch (error) {
        console.error('\n❌ ERROR en test:', error.message);
        console.error(error.stack);
        await browser.close();
        process.exit(1);
    }
})();
