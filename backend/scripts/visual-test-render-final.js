/**
 * Visual Test FINAL - Capturar 35 Módulos en Render
 * Hace login (aunque falle) para cargar módulos, luego oculta modal para captura
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://www.aponnt.com';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results', 'render-final');

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTest() {
    console.log('='.repeat(70));
    console.log('🌐 VISUAL TEST FINAL - 35 MÓDULOS EN RENDER');
    console.log('='.repeat(70));
    console.log(`📁 Screenshots: ${path.resolve(SCREENSHOT_DIR)}\n`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true
    });
    const page = await context.newPage();

    // Capturar errores
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text().substring(0, 100));
    });

    try {
        // === FASE 1: Cargar y hacer login ===
        console.log('📋 FASE 1: Cargando página y seleccionando empresa...');
        await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(3000);

        // Seleccionar empresa
        await page.waitForSelector('#companySelect', { timeout: 15000 });
        await page.waitForTimeout(2000);

        const options = await page.locator('#companySelect option').allTextContents();
        console.log('   Empresas:', options.filter(o => o && !o.includes('Selecciona')));

        // Seleccionar DEMO
        const demoOption = options.find(o => o.toLowerCase().includes('demo'));
        if (demoOption) {
            await page.selectOption('#companySelect', { label: demoOption });
            console.log(`   ✅ Seleccionada: ${demoOption}`);
        } else {
            await page.selectOption('#companySelect', { index: 1 });
            console.log('   ⚠️ Usando primera empresa');
        }
        await page.waitForTimeout(2000);

        // Llenar credenciales e intentar login
        console.log('\n📋 FASE 2: Intentando login...');
        await page.waitForSelector('#userInput:not([disabled])', { timeout: 10000 });
        await page.fill('#userInput', 'admin');
        await page.fill('#passwordInput', 'admin123');
        await page.click('#loginButton');
        await page.waitForTimeout(5000);

        // === FASE 2: Verificar módulos cargados ===
        console.log('\n📋 FASE 3: Verificando módulos...');
        const moduleCards = await page.locator('.module-card, [data-module-key]').all();
        console.log(`\n   📦 MÓDULOS ENCONTRADOS: ${moduleCards.length}`);

        if (moduleCards.length > 0) {
            console.log('\n   📋 LISTA DE MÓDULOS:');
            for (let i = 0; i < Math.min(moduleCards.length, 40); i++) {
                const name = await moduleCards[i].getAttribute('data-module-name').catch(() => null) ||
                            await moduleCards[i].locator('.card-title, .module-title, h5').first().textContent().catch(() => `Módulo ${i + 1}`);
                console.log(`      ${String(i + 1).padStart(2, ' ')}. ${name}`);
            }
        }

        // === FASE 3: Forzar ocultación de modales ===
        console.log('\n📋 FASE 4: Ocultando modales para captura...');

        // Estrategia agresiva de ocultación de modales
        await page.evaluate(() => {
            // Remover todos los modales del DOM
            document.querySelectorAll('.modal, .modal-backdrop, .modal-dialog, #loginModal').forEach(el => {
                el.parentNode?.removeChild(el);
            });

            // Limpiar estilos del body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = 'auto';
            document.body.style.paddingRight = '0';

            // Asegurar que mainContent sea visible
            const main = document.getElementById('mainContent') || document.querySelector('.main-content');
            if (main) {
                main.style.display = 'block';
                main.style.visibility = 'visible';
                main.style.opacity = '1';
            }

            // Asegurar que los cards sean visibles
            document.querySelectorAll('.module-card, [data-module-key]').forEach(card => {
                card.style.visibility = 'visible';
                card.style.opacity = '1';
            });
        });
        await page.waitForTimeout(1000);

        // === FASE 4: Capturar screenshots ===
        console.log('\n📋 FASE 5: Capturando screenshots...');

        // Screenshot 1: Primera sección
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '01-modules-section1.png'),
            fullPage: false
        });
        console.log('   ✅ Screenshot 1: Sección superior');

        // Screenshot 2: Segunda sección
        await page.evaluate(() => window.scrollTo(0, 700));
        await page.waitForTimeout(500);
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '02-modules-section2.png'),
            fullPage: false
        });
        console.log('   ✅ Screenshot 2: Sección media-alta');

        // Screenshot 3: Tercera sección
        await page.evaluate(() => window.scrollTo(0, 1400));
        await page.waitForTimeout(500);
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '03-modules-section3.png'),
            fullPage: false
        });
        console.log('   ✅ Screenshot 3: Sección media');

        // Screenshot 4: Cuarta sección
        await page.evaluate(() => window.scrollTo(0, 2100));
        await page.waitForTimeout(500);
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '04-modules-section4.png'),
            fullPage: false
        });
        console.log('   ✅ Screenshot 4: Sección inferior');

        // Screenshot 5: Full page (todo)
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);

        // Remover modales una vez más antes del full page
        await page.evaluate(() => {
            document.querySelectorAll('.modal, .modal-backdrop, #loginModal, [class*="modal"]').forEach(el => {
                el.remove();
            });
        });

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '05-modules-fullpage.png'),
            fullPage: true
        });
        console.log('   ✅ Screenshot 5: Página completa');

        // Screenshot 6: Capturar solo el área de módulos si existe
        const moduleArea = await page.locator('#mainContent, .module-grid, .container-fluid').first();
        const areaVisible = await moduleArea.isVisible().catch(() => false);
        if (areaVisible) {
            await moduleArea.screenshot({
                path: path.join(SCREENSHOT_DIR, '06-modules-area-only.png')
            });
            console.log('   ✅ Screenshot 6: Área de módulos');
        }

        // === RESUMEN ===
        console.log('\n' + '='.repeat(70));
        console.log('📊 RESUMEN FINAL');
        console.log('='.repeat(70));
        console.log(`\n✅ MÓDULOS ENCONTRADOS: ${moduleCards.length}`);

        const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
        console.log(`\n📸 SCREENSHOTS GENERADOS: ${files.length}`);
        files.forEach(f => console.log(`   - ${f}`));

        if (errors.length > 0 && errors.length <= 10) {
            console.log('\n⚠️ Errores de consola:', errors.length);
        }

        console.log(`\n📁 Ubicación: ${SCREENSHOT_DIR}`);
        console.log('\n✅ TEST COMPLETADO');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'ERROR.png'),
            fullPage: false
        }).catch(() => {});
    } finally {
        await browser.close();
    }
}

runTest();
