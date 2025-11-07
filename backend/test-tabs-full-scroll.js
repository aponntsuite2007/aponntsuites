/**
 * TEST COMPLETO CON SCROLL - TODOS LOS TABS
 * Hace scroll en cada tab para capturar TODO el contenido
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function testTabsWithFullScroll() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     TEST CON SCROLL COMPLETO - TODOS LOS TABS           ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    let browser = null;
    let page = null;

    try {
        console.log('🚀 Iniciando navegador...');
        browser = await chromium.launch({
            headless: false,
            slowMo: 100
        });

        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });
        page = await context.newPage();

        // LOGIN
        console.log('🌐 LOGIN...');
        await page.goto('http://localhost:9999/panel-empresa.html', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        await page.waitForTimeout(2000);

        await page.selectOption('#companySelect', 'isi');
        await page.waitForTimeout(1000);

        const usernameInput = page.locator('input[type="text"]:visible').last();
        await usernameInput.fill('soporte');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        const passwordInput = page.locator('input[type="password"]:visible').last();
        await passwordInput.fill('admin123');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);
        console.log('   ✅ Login OK\n');

        // ABRIR MÓDULO USUARIOS
        console.log('📊 Abriendo módulo Usuarios...');
        await page.locator(`[onclick*="showTab('users'"]`).first().click();
        await page.waitForTimeout(3000);

        // ABRIR MODAL VER
        console.log('🔍 Abriendo modal VER...');
        await page.waitForSelector('table tbody tr', { timeout: 15000 });
        const verButton = page.locator('table tbody tr:first-child button.btn-info').first();
        await verButton.click();
        await page.waitForTimeout(3000);
        await page.waitForSelector('#employeeFileModal', { state: 'visible', timeout: 10000 });
        console.log('   ✅ Modal VER abierto\n');

        const tabs = await page.locator('#employeeFileModal .file-tab').all();
        console.log(`📋 Total de tabs: ${tabs.length}\n`);
        console.log('═'.repeat(100));

        const results = [];

        // NAVEGAR POR CADA TAB CON SCROLL COMPLETO
        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            const tabName = (await tab.textContent()).trim();

            console.log(`\n${'─'.repeat(100)}`);
            console.log(`  TAB ${i + 1}/${tabs.length}: ${tabName}`);
            console.log(`${'─'.repeat(100)}`);

            // Click en tab
            console.log(`🖱️  Click en "${tabName}"...`);
            await tab.click();
            await page.waitForTimeout(1500);

            // Obtener el contenedor scrolleable
            const scrollContainer = page.locator('.file-tab-content.active').first();

            // Verificar si es visible
            const isVisible = await scrollContainer.isVisible().catch(() => false);

            if (!isVisible) {
                console.log(`   ❌ Tab NO visible`);
                results.push({ tab: tabName, visible: false, elements: 0 });
                continue;
            }

            console.log(`   ✅ Tab visible`);

            // Hacer scroll completo hacia abajo y contar elementos
            console.log(`   🔄 Haciendo scroll completo...`);

            let totalButtons = 0;
            let totalInputs = 0;
            let totalTables = 0;
            let totalSections = 0;

            // Scroll paso a paso
            let previousHeight = 0;
            let scrollAttempts = 0;
            const maxScrollAttempts = 20;

            while (scrollAttempts < maxScrollAttempts) {
                // Evaluar elementos visibles en esta posición del scroll
                const elementsAtPosition = await page.evaluate(() => {
                    const activeTab = document.querySelector('.file-tab-content.active');
                    if (!activeTab) return { buttons: 0, inputs: 0, tables: 0, sections: 0 };

                    return {
                        buttons: activeTab.querySelectorAll('button').length,
                        inputs: activeTab.querySelectorAll('input, select, textarea').length,
                        tables: activeTab.querySelectorAll('table').length,
                        sections: activeTab.querySelectorAll('h3, h4, .section-title, [style*="font-weight: bold"]').length
                    };
                });

                totalButtons = Math.max(totalButtons, elementsAtPosition.buttons);
                totalInputs = Math.max(totalInputs, elementsAtPosition.inputs);
                totalTables = Math.max(totalTables, elementsAtPosition.tables);
                totalSections = Math.max(totalSections, elementsAtPosition.sections);

                // Hacer scroll hacia abajo
                const currentHeight = await scrollContainer.evaluate(el => {
                    el.scrollBy(0, 300);
                    return el.scrollTop + el.clientHeight;
                });

                // Si ya llegamos al final o no hubo cambio
                if (currentHeight === previousHeight) {
                    break;
                }

                previousHeight = currentHeight;
                scrollAttempts++;
                await page.waitForTimeout(300);
            }

            console.log(`   📊 Elementos encontrados después de scroll completo:`);
            console.log(`      - ${totalButtons} botones`);
            console.log(`      - ${totalInputs} campos de entrada`);
            console.log(`      - ${totalTables} tablas`);
            console.log(`      - ${totalSections} secciones`);

            // Screenshot final
            const screenshotName = `scroll-tab-${String(i + 1).padStart(2, '0')}-${tabName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
            await page.screenshot({ path: screenshotName, fullPage: true });
            console.log(`   📸 ${screenshotName}`);

            results.push({
                number: i + 1,
                name: tabName,
                visible: true,
                buttons: totalButtons,
                inputs: totalInputs,
                tables: totalTables,
                sections: totalSections
            });

            // Scroll de vuelta arriba para el próximo tab
            await scrollContainer.evaluate(el => el.scrollTo(0, 0));
            await page.waitForTimeout(500);
        }

        // RESUMEN FINAL
        console.log('\n\n');
        console.log('╔' + '═'.repeat(118) + '╗');
        console.log('║' + '  RESUMEN FINAL - TEST CON SCROLL COMPLETO'.padEnd(118) + '║');
        console.log('╠' + '═'.repeat(118) + '╣');
        console.log('║  TAB  │ Nombre' + ' '.repeat(35) + '│ Botones │ Inputs │ Tablas │ Secciones ║');
        console.log('╠' + '─'.repeat(118) + '╣');

        results.forEach(result => {
            const num = String(result.number).padStart(2);
            const name = result.name.padEnd(40).substring(0, 40);
            const buttons = String(result.buttons).padEnd(7);
            const inputs = String(result.inputs).padEnd(6);
            const tables = String(result.tables).padEnd(6);
            const sections = String(result.sections).padEnd(9);

            console.log(`║  ${num}   │ ${name} │ ${buttons} │ ${inputs} │ ${tables} │ ${sections} ║`);
        });

        console.log('╚' + '═'.repeat(118) + '╝');

        const totalButtons = results.reduce((sum, r) => sum + r.buttons, 0);
        const totalInputs = results.reduce((sum, r) => sum + r.inputs, 0);
        const totalTables = results.reduce((sum, r) => sum + r.tables, 0);
        const totalSections = results.reduce((sum, r) => sum + r.sections, 0);

        console.log(`\n📊 TOTALES DESPUÉS DE SCROLL COMPLETO:`);
        console.log(`   🔘 Total botones: ${totalButtons}`);
        console.log(`   📝 Total inputs: ${totalInputs}`);
        console.log(`   📋 Total tablas: ${totalTables}`);
        console.log(`   📑 Total secciones: ${totalSections}`);
        console.log(`   ✅ Tabs visibles: ${results.filter(r => r.visible).length}/${results.length}\n`);

        console.log('🔍 Navegador permanecerá abierto 60 segundos...');
        await page.waitForTimeout(60000);

    } catch (error) {
        console.error('\n❌ ERROR:');
        console.error(error.message);

        if (page) {
            await page.screenshot({ path: 'scroll-error.png', fullPage: true });
            console.log('   💾 scroll-error.png');
        }
    } finally {
        if (browser) {
            console.log('\n👋 Cerrando navegador...');
            await browser.close();
        }
    }
}

testTabsWithFullScroll();
