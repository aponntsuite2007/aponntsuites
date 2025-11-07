/**
 * TEST COMPLETO - MODAL VER - TODOS LOS TABS
 *
 * Este test:
 * 1. Hace login
 * 2. Abre el módulo usuarios
 * 3. Hace click en el botón VER de la primera fila
 * 4. Prueba TODOS los tabs del modal uno por uno
 * 5. Genera reporte completo con screenshots
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function testVerModalTabs() {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   TEST COMPLETO - MODAL VER - TODOS LOS TABS  ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    let browser = null;
    let page = null;

    try {
        // 1. INICIAR NAVEGADOR
        console.log('🚀 Paso 1/8: Iniciando navegador Chromium...');
        browser = await chromium.launch({
            headless: false,
            slowMo: 200
        });

        const context = await browser.newContext();
        page = await context.newPage();

        // Capturar logs del navegador
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (type === 'error') {
                console.log(`   ❌ [BROWSER ERROR]: ${text}`);
            }
        });
        console.log('   ✅ Navegador iniciado\n');

        // 2. ABRIR PANEL EMPRESA
        console.log('🌐 Paso 2/8: Abriendo panel-empresa.html...');
        await page.goto('http://localhost:9999/panel-empresa.html', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        await page.waitForTimeout(2000);
        console.log('   ✅ Panel abierto\n');

        // 3. LOGIN - 3 PASOS
        console.log('🔐 Paso 3/8: Realizando login...');

        // Paso 1: Seleccionar empresa
        console.log('   📍 Seleccionando empresa ISI...');
        await page.selectOption('#companySelect', 'isi');
        await page.waitForTimeout(3000);
        console.log('      ✅ Empresa seleccionada');

        // Paso 2: Ingresar usuario
        console.log('   👤 Ingresando usuario soporte...');
        const usernameInput = page.locator('input[type="text"]:visible').last();
        await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
        await usernameInput.fill('soporte');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        console.log('      ✅ Usuario ingresado');

        // Paso 3: Ingresar password
        console.log('   🔑 Ingresando password...');
        const passwordInput = page.locator('input[type="password"]:visible').last();
        await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
        await passwordInput.fill('admin123');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);
        console.log('      ✅ Password ingresado\n');
        console.log('   ✅ LOGIN COMPLETADO\n');

        // 4. ABRIR MÓDULO USUARIOS
        console.log('📊 Paso 4/8: Abriendo módulo Usuarios...');
        await page.locator(`[onclick*="showTab('users'"]`).first().click();
        await page.waitForTimeout(3000);
        console.log('   ✅ Módulo usuarios abierto\n');

        // Tomar screenshot de la tabla
        await page.screenshot({ path: 'ver-test-01-users-table.png', fullPage: true });
        console.log('   💾 Screenshot: ver-test-01-users-table.png\n');

        // 5. BUSCAR Y HACER CLICK EN BOTÓN VER
        console.log('🔍 Paso 5/8: Buscando botón VER en primera fila...');

        // Esperar a que la tabla cargue
        await page.waitForSelector('table tbody tr', { timeout: 15000 });
        const rowCount = await page.locator('table tbody tr').count();
        console.log(`   ✅ Tabla cargada con ${rowCount} usuarios`);

        // Buscar el botón VER en la primera fila
        // Intentar varios selectores posibles
        const verButtonSelectors = [
            'table tbody tr:first-child button.btn-info',
            'table tbody tr:first-child button:has-text("Ver")',
            'table tbody tr:first-child .btn-info',
            'table tbody tr:first-child button[title*="Ver"]',
            'table tbody tr:first-child i.fa-eye',
            'table tbody tr:first-child .action-buttons button:nth-child(1)'
        ];

        let verButtonFound = false;
        for (const selector of verButtonSelectors) {
            const button = page.locator(selector).first();
            const count = await button.count();
            if (count > 0) {
                console.log(`   ✅ Botón VER encontrado con: ${selector}`);
                console.log('   🖱️  Haciendo click en botón VER...');
                await button.click();
                verButtonFound = true;
                break;
            }
        }

        if (!verButtonFound) {
            console.log('   ❌ No se encontró el botón VER');
            console.log('   📸 Tomando screenshot para diagnóstico...');
            await page.screenshot({ path: 'ver-test-ERROR-no-button.png', fullPage: true });

            // Listar todos los botones en la primera fila
            const buttons = await page.locator('table tbody tr:first-child button').all();
            console.log(`   🔍 Botones encontrados en primera fila: ${buttons.length}`);
            for (let i = 0; i < buttons.length; i++) {
                const text = await buttons[i].textContent();
                const classes = await buttons[i].getAttribute('class');
                console.log(`      ${i + 1}. "${text}" - ${classes}`);
            }

            throw new Error('Botón VER no encontrado');
        }

        await page.waitForTimeout(3000); // Más tiempo para que el modal se abra
        console.log('   ✅ Click en botón VER ejecutado\n');

        // Screenshot inmediatamente después del click
        await page.screenshot({ path: 'ver-test-02-after-click.png', fullPage: true });
        console.log('   💾 Screenshot después de click: ver-test-02-after-click.png\n');

        // 6. VERIFICAR QUE EL MODAL SE ABRIÓ
        console.log('🪟 Paso 6/8: Verificando apertura del modal...');

        // Esperar a que aparezca el modal correcto - employeeFileModal
        await page.waitForTimeout(3000); // Más tiempo para animación y fetch de datos

        // Buscar específicamente el modal del usuario por ID
        const modalSelectors = [
            '#employeeFileModal',
            '[id="employeeFileModal"]',
            'div[id="employeeFileModal"]'
        ];

        let modal = null;
        let modalFound = false;

        for (const selector of modalSelectors) {
            modal = page.locator(selector).first();
            const count = await modal.count();
            if (count > 0) {
                console.log(`   ✅ Modal encontrado con selector: ${selector}`);
                modalFound = true;
                break;
            }
        }

        if (!modalFound) {
            console.log('   ❌ Modal employeeFileModal no se encontró');
            console.log('   🔍 Buscando otros modals...');

            const allModals = await page.locator('div[id$="Modal"], div[class*="modal"]').count();
            console.log(`      - Total de elementos tipo modal: ${allModals}`);

            if (allModals > 0) {
                const modalIds = await page.locator('div[id$="Modal"], div[class*="modal"]').evaluateAll(
                    elements => elements.map(el => el.id || el.className).slice(0, 5)
                );
                console.log(`      - IDs/Classes encontrados: ${JSON.stringify(modalIds)}`);
            }

            await page.screenshot({ path: 'ver-test-ERROR-no-modal.png', fullPage: true });
            throw new Error('Modal employeeFileModal no se abrió');
        }

        // Verificar si el modal está visible
        const isVisible = await modal.isVisible().catch(() => false);

        if (!isVisible) {
            console.log('   ⚠️  Modal existe pero no está visible');
            await page.screenshot({ path: 'ver-test-ERROR-modal-not-visible.png', fullPage: true });
        } else {
            console.log('   ✅ Modal está visible');
        }

        await page.waitForTimeout(1000);

        // Screenshot del modal
        await page.screenshot({ path: 'ver-test-02-modal-opened.png', fullPage: true });
        console.log('   💾 Screenshot: ver-test-02-modal-opened.png\n');

        // 7. ENCONTRAR TODOS LOS TABS
        console.log('📑 Paso 7/8: Encontrando tabs del modal...');

        // Buscar tabs dentro del modal - ESPECÍFICOS DEL EXPEDIENTE
        const tabSelectors = [
            '#employeeFileModal .file-tab',
            '#employeeFileModal button.file-tab',
            '.file-tab',
            'button.file-tab',
            'button[onclick*="showFileTab"]',
            '.nav-tabs .nav-link',
            '.nav-tabs a',
            '[role="tab"]',
            '.nav-pills .nav-link',
            'ul.nav li a',
            '.nav li a',
            'a[data-toggle="tab"]',
            'button[data-toggle="tab"]',
            '.tabs a'
        ];

        let tabs = null;
        let tabCount = 0;

        for (const selector of tabSelectors) {
            const elements = page.locator(selector);
            const count = await elements.count();
            if (count > 0) {
                tabs = elements;
                tabCount = count;
                console.log(`   ✅ Encontrados ${count} tabs con: ${selector}\n`);
                break;
            }
        }

        if (!tabs || tabCount === 0) {
            console.log('   ⚠️  No se encontraron tabs en el modal');
            await page.screenshot({ path: 'ver-test-ERROR-no-tabs.png', fullPage: true });

            // Debug: Listar todos los elementos nav y links
            console.log('   🔍 Debug: Buscando elementos nav...');
            const navCount = await page.locator('nav, .nav, ul.nav').count();
            console.log(`      - Elementos nav: ${navCount}`);

            const linksCount = await page.locator('a').count();
            console.log(`      - Total de links: ${linksCount}`);

            // Intentar ver la estructura del modal
            const modalHTML = await page.locator('.modal').first().innerHTML().catch(() => 'No se pudo obtener HTML');
            if (modalHTML !== 'No se pudo obtener HTML') {
                console.log('   🔍 HTML del modal (primeros 1000 chars):');
                console.log(modalHTML.substring(0, 1000));
            }

            throw new Error('No se encontraron tabs en el modal');
        }

        // 8. ITERAR Y TESTEAR CADA TAB
        console.log('═'.repeat(80));
        console.log(`  TESTING DE ${tabCount} TABS DEL MODAL VER`);
        console.log('═'.repeat(80));
        console.log('');

        const results = [];

        for (let i = 0; i < tabCount; i++) {
            const tab = tabs.nth(i);
            const tabText = await tab.textContent();
            const tabName = tabText.trim();

            console.log(`\n${'─'.repeat(80)}`);
            console.log(`📌 TAB ${i + 1}/${tabCount}: "${tabName}"`);
            console.log(`${'─'.repeat(80)}`);

            try {
                // Click en el tab
                console.log(`   🖱️  Click en tab "${tabName}"...`);
                await tab.click();
                await page.waitForTimeout(1500);

                // Verificar si está activo
                const isActive = await tab.evaluate(el => {
                    return el.classList.contains('active') ||
                           el.getAttribute('aria-selected') === 'true' ||
                           el.classList.contains('show');
                });

                if (isActive) {
                    console.log(`   ✅ Tab activado correctamente`);
                } else {
                    console.log(`   ⚠️  Tab puede no estar activo visualmente`);
                }

                // Buscar el contenido del tab - usando IDs específicos del expediente
                // Los tabs del expediente usan: admin-tab, personal-tab, work-tab, etc.
                const tabPaneSelectors = [
                    `.file-tab-content.active`,
                    `#admin-tab`,
                    `#personal-tab`,
                    `#work-tab`,
                    `#family-tab`,
                    `#medical-tab`,
                    `#attendance-tab`,
                    `#disciplinary-tab`,
                    `#tasks-tab`,
                    `#biometric-tab`,
                    `.modal .tab-pane.active`,
                    `.modal .tab-pane.show`,
                    `.modal [role="tabpanel"].active`,
                    `.modal .tab-content > div:visible`
                ];

                let tabContent = null;
                let foundSelector = '';

                for (const selector of tabPaneSelectors) {
                    const pane = page.locator(selector).first();
                    const count = await pane.count();
                    if (count > 0) {
                        // Verificar si está visible
                        const isVis = await pane.isVisible().catch(() => false);
                        if (isVis) {
                            tabContent = pane;
                            foundSelector = selector;
                            break;
                        }
                    }
                }

                if (tabContent) {
                    console.log(`   🔍 Contenido encontrado con: ${foundSelector}`);
                }

                if (tabContent) {
                    const contentText = await tabContent.textContent();
                    const contentLength = contentText.trim().length;

                    if (contentLength > 0) {
                        console.log(`   ✅ Contenido cargado (${contentLength} chars)`);

                        // Contar elementos
                        const inputs = await tabContent.locator('input, select, textarea').count();
                        const tables = await tabContent.locator('table').count();
                        const buttons = await tabContent.locator('button').count();

                        if (inputs > 0) console.log(`   📝 ${inputs} campos de formulario`);
                        if (tables > 0) console.log(`   📊 ${tables} tablas`);
                        if (buttons > 0) console.log(`   🔘 ${buttons} botones`);

                        // Screenshot
                        const screenshotName = `ver-test-tab-${String(i + 1).padStart(2, '0')}-${tabName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
                        await page.screenshot({ path: screenshotName, fullPage: true });
                        console.log(`   📸 ${screenshotName}`);

                        results.push({
                            number: i + 1,
                            name: tabName,
                            status: '✅ OK',
                            content: contentLength,
                            inputs,
                            tables,
                            buttons
                        });

                    } else {
                        console.log(`   ⚠️  Tab vacío (sin contenido)`);
                        results.push({
                            number: i + 1,
                            name: tabName,
                            status: '⚠️  VACÍO',
                            content: 0
                        });
                    }
                } else {
                    console.log(`   ❌ No se encontró contenido del tab`);
                    results.push({
                        number: i + 1,
                        name: tabName,
                        status: '❌ ERROR',
                        error: 'Contenido no encontrado'
                    });
                }

            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
                results.push({
                    number: i + 1,
                    name: tabName,
                    status: '❌ ERROR',
                    error: error.message
                });
            }
        }

        // RESUMEN FINAL
        console.log('\n\n');
        console.log('╔' + '═'.repeat(98) + '╗');
        console.log('║' + '  RESUMEN FINAL - TESTING DE TABS DEL MODAL VER'.padEnd(98) + '║');
        console.log('╠' + '═'.repeat(98) + '╣');
        console.log('║  #  │ Tab Name' + ' '.repeat(25) + '│ Status       │ Chars   │ Inputs │ Tables │ Btns ║');
        console.log('╠' + '─'.repeat(98) + '╣');

        results.forEach(result => {
            const num = String(result.number).padStart(2);
            const name = result.name.padEnd(30).substring(0, 30);
            const status = (result.status || '').padEnd(12);
            const content = (result.content !== undefined ? String(result.content) : '-').padEnd(7);
            const inputs = (result.inputs !== undefined ? String(result.inputs) : '-').padEnd(6);
            const tables = (result.tables !== undefined ? String(result.tables) : '-').padEnd(6);
            const buttons = (result.buttons !== undefined ? String(result.buttons) : '-').padEnd(4);

            console.log(`║  ${num} │ ${name} │ ${status} │ ${content} │ ${inputs} │ ${tables} │ ${buttons} ║`);
        });

        console.log('╚' + '═'.repeat(98) + '╝');

        const successCount = results.filter(r => r.status === '✅ OK').length;
        const warningCount = results.filter(r => r.status === '⚠️  VACÍO').length;
        const errorCount = results.filter(r => r.status.startsWith('❌')).length;

        console.log(`\n📊 ESTADÍSTICAS FINALES:`);
        console.log(`   ✅ Tabs OK: ${successCount}/${tabCount}`);
        console.log(`   ⚠️  Tabs vacíos: ${warningCount}/${tabCount}`);
        console.log(`   ❌ Tabs con error: ${errorCount}/${tabCount}`);
        console.log(`   🎯 Tasa de éxito: ${Math.round((successCount / tabCount) * 100)}%\n`);

        if (successCount === tabCount) {
            console.log('🎉 ¡PERFECTO! TODOS LOS TABS FUNCIONAN AL 100%');
        } else if (successCount + warningCount === tabCount) {
            console.log('✅ Todos los tabs cargan correctamente (algunos están vacíos)');
        } else {
            console.log('⚠️  Algunos tabs tienen errores - revisar screenshots');
        }

        console.log('\n✅ TEST COMPLETADO');
        console.log('📸 Todos los screenshots guardados en: backend/');
        console.log('\n⏳ Navegador permanecerá abierto 60 segundos para inspección...');

        // Mantener navegador abierto
        await page.waitForTimeout(60000);

    } catch (error) {
        console.error('\n❌ ERROR EN EL TEST:');
        console.error(error.message);
        console.log('\n📸 Tomando screenshot final de error...');
        if (page) {
            await page.screenshot({ path: 'ver-test-ERROR-final.png', fullPage: true });
            console.log('   💾 ver-test-ERROR-final.png');
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testVerModalTabs();
