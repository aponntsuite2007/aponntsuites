/**
 * Visual Test - Verificar 35 Módulos en Render (www.aponnt.com)
 * Captura screenshots del panel-empresa con todos los módulos asignados
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://www.aponnt.com';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results', 'render-modules');

// Crear directorio si no existe
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTest() {
    console.log('='.repeat(70));
    console.log('🌐 TEST VISUAL - MÓDULOS EN RENDER (www.aponnt.com)');
    console.log('='.repeat(70));
    console.log(`📁 Screenshots se guardarán en: ${path.resolve(SCREENSHOT_DIR)}\n`);

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true
    });

    const page = await context.newPage();

    // Capturar errores de consola
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    try {
        // ========== PASO 1: Cargar página de login ==========
        console.log('📋 PASO 1: Cargando página de login...');
        await page.goto(`${BASE_URL}/panel-empresa.html`, {
            waitUntil: 'networkidle',
            timeout: 60000
        });
        await page.waitForTimeout(3000);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '01-login-page.png'),
            fullPage: false
        });
        console.log('   ✅ Página de login cargada');

        // ========== PASO 2: Seleccionar empresa DEMO ==========
        console.log('\n📋 PASO 2: Seleccionando empresa DEMO...');

        // Esperar selector de empresas
        await page.waitForSelector('#companySelect', { timeout: 15000 });
        await page.waitForTimeout(2000);

        // Listar empresas disponibles
        const options = await page.locator('#companySelect option').allTextContents();
        console.log('   📋 Empresas disponibles:', options.filter(o => o && !o.includes('Selecciona')));

        // Buscar y seleccionar DEMO
        const demoOption = options.find(o => o.toLowerCase().includes('demo'));
        if (demoOption) {
            await page.selectOption('#companySelect', { label: demoOption });
            console.log(`   ✅ Empresa seleccionada: ${demoOption}`);
        } else {
            // Intentar por valor
            await page.selectOption('#companySelect', { index: 1 }); // Primer empresa real
            console.log('   ⚠️ DEMO no encontrada, usando primera empresa');
        }

        await page.waitForTimeout(2000);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '02-empresa-selected.png'),
            fullPage: false
        });

        // ========== PASO 3: Login ==========
        console.log('\n📋 PASO 3: Realizando login...');

        // Esperar que campos estén habilitados
        await page.waitForSelector('#userInput:not([disabled])', { timeout: 10000 });

        // Llenar credenciales
        await page.fill('#userInput', 'admin');
        await page.fill('#passwordInput', 'admin123');
        console.log('   ✅ Credenciales: admin / admin123');

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '03-credentials-filled.png'),
            fullPage: false
        });

        // Click en login
        await page.click('#loginButton');
        console.log('   🖱️ Click en botón login...');

        // Esperar que cargue el dashboard
        await page.waitForTimeout(5000);

        // ========== PASO 4: Cerrar modal de login si sigue visible ==========
        console.log('\n📋 PASO 4: Verificando estado del modal...');

        // Intentar cerrar cualquier modal visible
        const closeButtons = [
            '.modal-close',
            '.close-modal',
            '[data-dismiss="modal"]',
            'button.close',
            '.modal .close',
            '#loginModal .close'
        ];

        for (const selector of closeButtons) {
            const btn = await page.locator(selector).first();
            const isVisible = await btn.isVisible().catch(() => false);
            if (isVisible) {
                await btn.click().catch(() => {});
                console.log(`   🖱️ Click en ${selector}`);
                await page.waitForTimeout(500);
            }
        }

        // Presionar Escape para cerrar modales
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // Click fuera del modal
        await page.mouse.click(50, 50);
        await page.waitForTimeout(1000);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '04-after-modal-close.png'),
            fullPage: false
        });

        // ========== PASO 5: Verificar módulos cargados ==========
        console.log('\n📋 PASO 5: Verificando módulos...');

        // Esperar grid de módulos
        await page.waitForSelector('.module-card, .card, [data-module-key]', { timeout: 15000 }).catch(() => {
            console.log('   ⚠️ No se encontró selector de módulos, continuando...');
        });

        await page.waitForTimeout(2000);

        // Contar módulos
        const moduleCards = await page.locator('.module-card, [data-module-key]').all();
        console.log(`   📦 Módulos encontrados: ${moduleCards.length}`);

        // Listar todos los módulos
        if (moduleCards.length > 0) {
            console.log('\n   📋 Lista de módulos:');
            for (let i = 0; i < moduleCards.length; i++) {
                const name = await moduleCards[i].getAttribute('data-module-name').catch(() => null) ||
                            await moduleCards[i].locator('.card-title, .module-title, h5, h4, .title').first().textContent().catch(() => 'Sin nombre');
                console.log(`      ${i + 1}. ${name}`);
            }
        }

        // ========== PASO 6: Screenshot del grid completo ==========
        console.log('\n📋 PASO 6: Capturando grid de módulos...');

        // Scroll al inicio
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);

        // Screenshot viewport (sin modal)
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '05-module-grid-viewport.png'),
            fullPage: false
        });
        console.log('   ✅ Screenshot viewport guardado');

        // Screenshot de cada sección del grid
        const totalHeight = await page.evaluate(() => document.body.scrollHeight);
        const viewportHeight = 1080;
        const scrollSteps = Math.ceil(totalHeight / viewportHeight);

        console.log(`   📐 Total height: ${totalHeight}px, Steps: ${scrollSteps}`);

        for (let step = 0; step < Math.min(scrollSteps, 5); step++) {
            await page.evaluate((y) => window.scrollTo(0, y), step * viewportHeight);
            await page.waitForTimeout(300);
            await page.screenshot({
                path: path.join(SCREENSHOT_DIR, `06-grid-section-${step + 1}.png`),
                fullPage: false
            });
            console.log(`   ✅ Screenshot sección ${step + 1}/${scrollSteps} guardado`);
        }

        // ========== PASO 7: Screenshot de mainContent específico ==========
        console.log('\n📋 PASO 7: Capturando área de contenido principal...');

        const mainContent = await page.locator('#mainContent, .main-content, main, .container-fluid').first();
        const mainContentVisible = await mainContent.isVisible().catch(() => false);

        if (mainContentVisible) {
            await mainContent.screenshot({
                path: path.join(SCREENSHOT_DIR, '07-main-content.png')
            });
            console.log('   ✅ Screenshot mainContent guardado');
        } else {
            console.log('   ⚠️ mainContent no visible');
        }

        // ========== RESUMEN ==========
        console.log('\n' + '='.repeat(70));
        console.log('📊 RESUMEN');
        console.log('='.repeat(70));
        console.log(`📦 Módulos encontrados: ${moduleCards.length}`);
        console.log(`📸 Screenshots guardados en: ${SCREENSHOT_DIR}`);

        // Listar archivos generados
        const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
        console.log(`\n📁 Archivos generados (${files.length}):`);
        files.forEach(f => console.log(`   - ${f}`));

        if (consoleErrors.length > 0) {
            console.log('\n⚠️ ERRORES DE CONSOLA:');
            consoleErrors.slice(0, 10).forEach((err, i) => {
                console.log(`   ${i + 1}. ${err.substring(0, 150)}`);
            });
        }

        console.log('\n✅ Test completado');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'ERROR-screenshot.png'),
            fullPage: false
        }).catch(() => {});
    } finally {
        await browser.close();
    }
}

runTest();
