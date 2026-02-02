/**
 * Visual Test - Módulo de Compras y Proveedores (Procurement)
 * Verifica carga del módulo y captura errores
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:9998';
// __dirname es scripts/, así que subir un nivel y entrar a test-results
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results');

// Crear directorio si no existe
console.log('📁 Screenshot dir:', path.resolve(SCREENSHOT_DIR));
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    console.log('   Directorio creado');
} else {
    console.log('   Directorio existe');
}

async function runTest() {
    console.log('🚀 Iniciando test visual de Procurement...\n');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    // Capturar errores de consola
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    page.on('pageerror', err => {
        consoleErrors.push(`PAGE ERROR: ${err.message}`);
    });

    let testsPassed = 0;
    let testsFailed = 0;

    try {
        // ========== TEST 1: Login ==========
        console.log('📋 TEST 1: Login como admin...');
        await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Esperar a que cargue el select de empresas
        await page.waitForSelector('#companySelect', { timeout: 10000 });
        await page.waitForTimeout(3000);

        // Listar opciones disponibles
        const options = await page.locator('#companySelect option').allTextContents();
        console.log('   📋 Empresas disponibles:', options.filter(o => o && !o.includes('Selecciona')));

        // Seleccionar "APONNT Suite" (con emoji)
        await page.selectOption('#companySelect', { label: '🏢 APONNT Suite' });
        console.log('   ✅ Empresa seleccionada: 🏢 APONNT Suite');

        // Esperar a que se habiliten los campos
        await page.waitForTimeout(2000);
        await page.waitForSelector('#userInput:not([disabled])', { timeout: 10000 });

        // Llenar usuario y contraseña
        await page.fill('#userInput', 'administrador');
        await page.fill('#passwordInput', 'admin123');
        console.log('   ✅ Credenciales ingresadas');

        // Click en botón de login
        await page.click('#loginButton');
        await page.waitForTimeout(4000);

        const screenshotPath1 = path.join(SCREENSHOT_DIR, 'procurement-01-after-login.png');
        console.log('   📸 Guardando screenshot en:', screenshotPath1);
        await page.screenshot({ path: screenshotPath1, fullPage: true });
        console.log('   ✅ Screenshot guardado');

        // Verificar login exitoso
        const loggedIn = await page.locator('text=Bienvenido').first().isVisible().catch(() => false) ||
                        await page.locator('.module-grid').first().isVisible().catch(() => false) ||
                        await page.locator('.module-card').first().isVisible().catch(() => false);

        if (loggedIn) {
            console.log('✅ TEST 1 PASSED: Login exitoso');
            testsPassed++;
        } else {
            console.log('❌ TEST 1 FAILED: Login falló');
            testsFailed++;
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'procurement-01-login-failed.png'), fullPage: true });
        }

        // ========== TEST 2: Buscar módulo Compras ==========
        console.log('\n📋 TEST 2: Buscando módulo Compras y Proveedores...');

        // Buscar el módulo en la página
        const procurementCard = await page.locator('[data-module-key="procurement-management"], [data-module-key="procurement"], [data-module-name*="Compras"]').first();
        const cardVisible = await procurementCard.isVisible().catch(() => false);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'procurement-02-module-grid.png'), fullPage: true });

        if (cardVisible) {
            console.log('✅ TEST 2 PASSED: Módulo encontrado en grid');
            testsPassed++;

            // Obtener info del módulo
            const moduleKey = await procurementCard.getAttribute('data-module-key').catch(() => 'unknown');
            const moduleName = await procurementCard.getAttribute('data-module-name').catch(() => 'unknown');
            console.log(`   📦 module_key: ${moduleKey}`);
            console.log(`   📦 module_name: ${moduleName}`);
        } else {
            console.log('❌ TEST 2 FAILED: Módulo NO encontrado');
            testsFailed++;

            // Listar TODOS los módulos visibles
            const allCards = await page.locator('.module-card').all();
            console.log(`   📊 Total cards visibles: ${allCards.length}`);
            for (let i = 0; i < allCards.length; i++) {
                const key = await allCards[i].getAttribute('data-module-key').catch(() => '?');
                const name = await allCards[i].getAttribute('data-module-name').catch(() => '?');
                // Resaltar si es procurement
                const prefix = key?.includes('procurement') || name?.toLowerCase().includes('compras') ? '✅' : '-';
                console.log(`   ${prefix} ${key}: ${name}`);
            }
        }

        // ========== TEST 3: Click en módulo Compras ==========
        console.log('\n📋 TEST 3: Haciendo click en módulo Compras...');

        if (cardVisible) {
            // Capturar estado antes del click
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'procurement-03-before-click.png'), fullPage: true });

            // Click en el módulo
            await procurementCard.click();
            console.log('   🖱️ Click realizado, esperando carga...');

            // Esperar a que cargue
            await page.waitForTimeout(3000);

            // Capturar estado después del click
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'procurement-04-after-click.png'), fullPage: true });

            // Verificar si el módulo cargó
            const moduleLoaded = await page.locator('.procurement-container, #procurement-container, [class*="procurement"], text=Solicitudes, text=Requisiciones, text=Dashboard de Compras').first().isVisible().catch(() => false);

            const hasError = await page.locator('text=Error, text=no cargado, text=fallback').first().isVisible().catch(() => false);

            // Verificar mainContent
            const mainContent = await page.locator('#mainContent').first();
            const mainContentHTML = await mainContent.innerHTML().catch(() => '');

            console.log(`   📊 mainContent length: ${mainContentHTML.length} chars`);
            console.log(`   📊 Contains "Solicitudes": ${mainContentHTML.includes('Solicitudes')}`);
            console.log(`   📊 Contains "procurement": ${mainContentHTML.toLowerCase().includes('procurement')}`);
            console.log(`   📊 Contains "Error": ${mainContentHTML.includes('Error')}`);

            if (moduleLoaded || mainContentHTML.includes('Solicitudes') || mainContentHTML.toLowerCase().includes('procurement')) {
                console.log('✅ TEST 3 PASSED: Módulo cargó correctamente');
                testsPassed++;
            } else if (hasError || mainContentHTML.includes('Error') || mainContentHTML.includes('fallback')) {
                console.log('❌ TEST 3 FAILED: Módulo mostró error');
                testsFailed++;
                console.log('   📄 HTML preview:', mainContentHTML.substring(0, 500));
            } else {
                console.log('⚠️ TEST 3 WARNING: Estado indeterminado');
                testsFailed++;
                console.log('   📄 HTML preview:', mainContentHTML.substring(0, 500));
            }
        } else {
            console.log('⏭️ TEST 3 SKIPPED: Módulo no encontrado');
            testsFailed++;
        }

        // ========== TEST 4: Verificar tabs del módulo ==========
        console.log('\n📋 TEST 4: Verificando tabs del módulo...');

        const tabs = ['Dashboard', 'Solicitudes', 'Órdenes', 'Recepciones', 'Facturas', 'Proveedores'];
        let tabsFound = 0;

        for (const tab of tabs) {
            const tabVisible = await page.locator(`text=${tab}`).first().isVisible().catch(() => false);
            if (tabVisible) {
                tabsFound++;
                console.log(`   ✅ Tab "${tab}" visible`);
            }
        }

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'procurement-05-tabs.png'), fullPage: true });

        if (tabsFound >= 3) {
            console.log(`✅ TEST 4 PASSED: ${tabsFound}/${tabs.length} tabs encontrados`);
            testsPassed++;
        } else {
            console.log(`❌ TEST 4 FAILED: Solo ${tabsFound}/${tabs.length} tabs encontrados`);
            testsFailed++;
        }

        // ========== TEST 5: Click en tab Solicitudes ==========
        console.log('\n📋 TEST 5: Navegando a tab Solicitudes...');

        const solicitudesTab = await page.locator('text=Solicitudes, button:has-text("Solicitudes"), [data-tab="requisitions"]').first();
        const solicitudesVisible = await solicitudesTab.isVisible().catch(() => false);

        if (solicitudesVisible) {
            await solicitudesTab.click();
            await page.waitForTimeout(2000);

            await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'procurement-06-solicitudes.png'), fullPage: true });

            // Verificar contenido de solicitudes
            const hasSolicitudesContent = await page.locator('text=Nueva Solicitud, text=requisition, table, .data-table').first().isVisible().catch(() => false);

            if (hasSolicitudesContent) {
                console.log('✅ TEST 5 PASSED: Tab Solicitudes cargó');
                testsPassed++;
            } else {
                console.log('⚠️ TEST 5 WARNING: Tab Solicitudes sin contenido esperado');
                testsFailed++;
            }
        } else {
            console.log('⏭️ TEST 5 SKIPPED: Tab Solicitudes no visible');
            testsFailed++;
        }

        // ========== RESUMEN ==========
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE TESTS');
        console.log('='.repeat(60));
        console.log(`✅ Passed: ${testsPassed}`);
        console.log(`❌ Failed: ${testsFailed}`);
        console.log(`📸 Screenshots guardados en: ${SCREENSHOT_DIR}`);

        if (consoleErrors.length > 0) {
            console.log('\n⚠️ ERRORES DE CONSOLA CAPTURADOS:');
            consoleErrors.forEach((err, i) => {
                console.log(`   ${i + 1}. ${err.substring(0, 200)}`);
            });
        }

    } catch (error) {
        console.error('\n❌ ERROR CRÍTICO:', error.message);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'procurement-ERROR.png'), fullPage: true });
    } finally {
        await browser.close();
    }
}

runTest();
