/**
 * TEST CON CAPTURA DE CONSOLE - DEBUGGING TAB SWITCHING
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function testTabsWithConsole() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     TEST DEBUGGING - CAPTURA DE ERRORES CONSOLE         ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    let browser = null;
    let page = null;

    try {
        console.log('🚀 Iniciando navegador...');
        browser = await chromium.launch({
            headless: false,
            slowMo: 100
        });

        const context = await browser.newContext();
        page = await context.newPage();

        // CAPTURAR TODOS LOS LOGS Y ERRORES
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (type === 'error') {
                console.log(`   ❌ [BROWSER ERROR]: ${text}`);
            } else if (type === 'warning') {
                console.log(`   ⚠️  [BROWSER WARNING]: ${text}`);
            } else if (text.includes('TABS') || text.includes('showFileTab')) {
                console.log(`   🔍 [BROWSER LOG]: ${text}`);
            }
        });

        page.on('pageerror', err => {
            console.log(`   💥 [PAGE ERROR]: ${err.message}`);
            console.log(`   Stack: ${err.stack}`);
        });

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

        // VERIFICAR SI showFileTab ESTÁ DEFINIDO
        console.log('🔍 Verificando si showFileTab está definido...');
        const functionExists = await page.evaluate(() => {
            return {
                windowHasFunction: typeof window.showFileTab === 'function',
                modalElement: !!document.getElementById('employeeFileModal'),
                tabButtons: document.querySelectorAll('#employeeFileModal .file-tab').length,
                tabContents: document.querySelectorAll('#employeeFileModal .file-tab-content').length
            };
        });

        console.log('   📊 Estado del modal:');
        console.log(`      - window.showFileTab existe: ${functionExists.windowHasFunction}`);
        console.log(`      - Modal presente: ${functionExists.modalElement}`);
        console.log(`      - Botones de tabs: ${functionExists.tabButtons}`);
        console.log(`      - Contenidos de tabs: ${functionExists.tabContents}\n`);

        // PROBAR CLICKS EN TABS 2 Y 3
        console.log('═'.repeat(80));
        console.log('  TESTING TAB CLICKS CON CONSOLE CAPTURE');
        console.log('═'.repeat(80));

        const tabs = await page.locator('#employeeFileModal .file-tab').all();

        for (let i = 0; i < Math.min(tabs.length, 3); i++) {
            const tab = tabs[i];
            const tabName = (await tab.textContent()).trim();

            console.log(`\n${'─'.repeat(80)}`);
            console.log(`  TAB ${i + 1}: ${tabName}`);
            console.log(`${'─'.repeat(80)}`);

            console.log(`🖱️  Haciendo click en tab "${tabName}"...`);
            await tab.click();
            await page.waitForTimeout(2000);

            // VERIFICAR ESTADO DESPUÉS DEL CLICK
            const afterClick = await page.evaluate((index) => {
                const allContents = document.querySelectorAll('#employeeFileModal .file-tab-content');
                const results = [];

                allContents.forEach((content, idx) => {
                    const computedStyle = window.getComputedStyle(content);
                    results.push({
                        id: content.id,
                        display: computedStyle.display,
                        visibility: computedStyle.visibility,
                        hasActiveClass: content.classList.contains('active'),
                        innerHTML: content.innerHTML.length
                    });
                });

                return results;
            }, i);

            console.log('   📊 Estado de todos los tabs después del click:');
            afterClick.forEach((state, idx) => {
                const isVisible = state.display !== 'none' && state.visibility !== 'hidden';
                const icon = isVisible ? '✅' : '❌';
                console.log(`      ${icon} Tab ${idx + 1} (${state.id}): display=${state.display}, visible=${state.visibility}, active=${state.hasActiveClass}, content=${state.innerHTML} chars`);
            });

            await page.screenshot({ path: `debug-tab-${i + 1}-${tabName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`, fullPage: true });
        }

        console.log('\n\n🔍 Navegador permanecerá abierto 60 segundos para inspección manual...');
        await page.waitForTimeout(60000);

    } catch (error) {
        console.error('\n❌ ERROR:');
        console.error(error.message);
        console.error(error.stack);

        if (page) {
            await page.screenshot({ path: 'debug-error.png', fullPage: true });
            console.log('   💾 debug-error.png');
        }
    } finally {
        if (browser) {
            console.log('\n👋 Cerrando navegador...');
            await browser.close();
        }
    }
}

testTabsWithConsole();
