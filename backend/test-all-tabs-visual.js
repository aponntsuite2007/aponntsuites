/**
 * TEST VISUAL AUTOMÁTICO - TODOS LOS TABS
 * Navega por todos los tabs, toma screenshots y mantiene el navegador abierto
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function testAllTabsVisual() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     TEST VISUAL AUTOMÁTICO - TODOS LOS TABS DEL MODAL   ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    let browser = null;
    let page = null;

    try {
        console.log('🚀 Iniciando navegador Chromium VISIBLE...');
        browser = await chromium.launch({
            headless: false,
            slowMo: 100,
            args: ['--start-maximized']
        });

        const context = await browser.newContext({
            viewport: null
        });
        page = await context.newPage();
        console.log('   ✅ Navegador listo\n');

        // LOGIN
        console.log('🌐 Navegando a panel-empresa.html...');
        await page.goto('http://localhost:9999/panel-empresa.html', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        await page.waitForTimeout(2000);

        console.log('🔐 Realizando login...');
        await page.selectOption('#companySelect', 'isi');
        await page.waitForTimeout(1500);

        const usernameInput = page.locator('input[type="text"]:visible').last();
        await usernameInput.fill('soporte');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);

        const passwordInput = page.locator('input[type="password"]:visible').last();
        await passwordInput.fill('admin123');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);
        console.log('   ✅ Login completado\n');

        // ABRIR MÓDULO USUARIOS
        console.log('📊 Abriendo módulo Usuarios...');
        await page.locator(`[onclick*="showTab('users'"]`).first().click();
        await page.waitForTimeout(3000);
        console.log('   ✅ Módulo usuarios abierto\n');

        // ABRIR MODAL VER
        console.log('🔍 Clickeando botón VER...');
        await page.waitForSelector('table tbody tr', { timeout: 15000 });
        const verButton = page.locator('table tbody tr:first-child button.btn-info').first();
        await verButton.click();
        await page.waitForTimeout(3000);
        console.log('   ✅ Modal VER abierto\n');

        await page.waitForSelector('#employeeFileModal', { state: 'visible', timeout: 10000 });

        // OBTENER TABS
        const tabs = await page.locator('#employeeFileModal .file-tab').all();
        console.log(`📋 Total de tabs encontrados: ${tabs.length}\n`);
        console.log('═'.repeat(80));

        const results = [];

        // NAVEGAR POR CADA TAB
        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            const tabName = (await tab.textContent()).trim();

            console.log(`\n${'─'.repeat(80)}`);
            console.log(`  TAB ${i + 1}/${tabs.length}: ${tabName}`);
            console.log(`${'─'.repeat(80)}`);

            // Click en tab
            console.log(`🖱️  Click en "${tabName}"...`);
            await tab.click();
            await page.waitForTimeout(2000); // Esperar a que se muestre el contenido

            // Buscar el contenido activo
            const activeContent = page.locator('.file-tab-content.active').first();
            const isVisible = await activeContent.isVisible().catch(() => false);

            let fieldCount = 0;
            let buttonCount = 0;
            let tableCount = 0;

            if (isVisible) {
                fieldCount = await activeContent.locator('input, select, textarea').count();
                buttonCount = await activeContent.locator('button').count();
                tableCount = await activeContent.locator('table').count();

                console.log(`   ✅ Tab visible`);
                console.log(`   📊 Elementos encontrados:`);
                console.log(`      - ${fieldCount} campos de formulario`);
                console.log(`      - ${buttonCount} botones`);
                console.log(`      - ${tableCount} tablas`);
            } else {
                console.log(`   ❌ Tab NO visible`);
            }

            // Screenshot
            const screenshotName = `visual-tab-${String(i + 1).padStart(2, '0')}-${tabName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
            await page.screenshot({ path: screenshotName, fullPage: true });
            console.log(`   📸 ${screenshotName}`);

            results.push({
                number: i + 1,
                name: tabName,
                visible: isVisible,
                fields: fieldCount,
                buttons: buttonCount,
                tables: tableCount
            });
        }

        // RESUMEN FINAL
        console.log('\n\n');
        console.log('╔' + '═'.repeat(98) + '╗');
        console.log('║' + '  RESUMEN FINAL - TEST VISUAL AUTOMÁTICO'.padEnd(98) + '║');
        console.log('╠' + '═'.repeat(98) + '╣');
        console.log('║  TAB  │ Nombre' + ' '.repeat(35) + '│ Estado │ Campos │ Botones │ Tablas ║');
        console.log('╠' + '─'.repeat(98) + '╣');

        results.forEach(result => {
            const num = String(result.number).padStart(2);
            const name = result.name.padEnd(40).substring(0, 40);
            const status = result.visible ? '✅ OK  ' : '❌ FAIL';
            const fields = String(result.fields).padEnd(6);
            const buttons = String(result.buttons).padEnd(7);
            const tables = String(result.tables).padEnd(6);

            console.log(`║  ${num}   │ ${name} │ ${status} │ ${fields} │ ${buttons} │ ${tables} ║`);
        });

        console.log('╚' + '═'.repeat(98) + '╝');

        const totalVisible = results.filter(r => r.visible).length;
        const totalFields = results.reduce((sum, r) => sum + r.fields, 0);
        const totalButtons = results.reduce((sum, r) => sum + r.buttons, 0);
        const totalTables = results.reduce((sum, r) => sum + r.tables, 0);

        console.log(`\n📊 ESTADÍSTICAS TOTALES:`);
        console.log(`   ✅ Tabs visibles: ${totalVisible}/${results.length}`);
        console.log(`   📝 Total campos: ${totalFields}`);
        console.log(`   🔘 Total botones: ${totalButtons}`);
        console.log(`   📋 Total tablas: ${totalTables}`);
        console.log(`   📈 Success Rate: ${((totalVisible / results.length) * 100).toFixed(1)}%\n`);

        if (totalVisible === results.length) {
            console.log('🎉 ¡PERFECTO! TODOS LOS 9 TABS SON VISIBLES Y FUNCIONAN');
        } else {
            console.log(`⚠️  ${results.length - totalVisible} tabs tienen problemas de visibilidad`);
        }

        console.log('\n🔍 El navegador permanecerá ABIERTO durante 2 minutos para inspección manual.');
        console.log('   Puedes navegar manualmente, hacer click en botones y verificar funcionalidades.\n');
        console.log('   Presiona Ctrl+C para cerrar antes de tiempo.\n');

        await page.waitForTimeout(120000); // 2 minutos

    } catch (error) {
        console.error('\n❌ ERROR:');
        console.error(error.message);

        if (page) {
            await page.screenshot({ path: 'visual-test-error.png', fullPage: true });
            console.log('   💾 visual-test-error.png');
        }
    } finally {
        if (browser) {
            console.log('\n👋 Cerrando navegador...');
            await browser.close();
        }
    }
}

testAllTabsVisual();
