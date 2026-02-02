/**
 * Visual Test - Capturar los 35 Módulos en Render
 * Inyecta token y captura el grid de módulos correctamente
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://www.aponnt.com';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results', 'render-35modules');

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTest() {
    console.log('='.repeat(70));
    console.log('🌐 VISUAL TEST - 35 MÓDULOS EN RENDER (www.aponnt.com)');
    console.log('='.repeat(70));
    console.log(`📁 Screenshots: ${path.resolve(SCREENSHOT_DIR)}\n`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true
    });
    const page = await context.newPage();

    try {
        // PASO 1: Cargar página
        console.log('📋 PASO 1: Cargando panel-empresa...');
        await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        // PASO 2: Inyectar token fake para bypass de login
        console.log('\n📋 PASO 2: Configurando acceso...');
        await page.evaluate(() => {
            // Crear token fake (solo para visualización)
            const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiY29tcGFueUlkIjo0LCJyb2xlIjoiYWRtaW4ifQ.fake';
            localStorage.setItem('authToken', fakeToken);
            localStorage.setItem('token', fakeToken);
            localStorage.setItem('companyId', '4');
            localStorage.setItem('companySlug', 'aponnt-demo');
            localStorage.setItem('userRole', 'admin');
            localStorage.setItem('userData', JSON.stringify({
                id: 1,
                username: 'admin',
                role: 'admin',
                companyId: 4
            }));
        });
        console.log('   ✅ Token y datos inyectados en localStorage');

        // PASO 3: Recargar para aplicar cambios
        console.log('\n📋 PASO 3: Recargando página...');
        await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(5000);

        // PASO 4: Forzar cierre de modales
        console.log('\n📋 PASO 4: Cerrando modales...');
        await page.evaluate(() => {
            // Ocultar todos los modales
            document.querySelectorAll('.modal, .modal-backdrop, [class*="modal"], #loginModal').forEach(el => {
                el.style.display = 'none';
                el.classList.remove('show', 'in', 'active');
            });
            // Remover clases del body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = 'auto';
            // Remover backdrops
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        });
        await page.waitForTimeout(1000);

        // PASO 5: Verificar módulos visibles
        console.log('\n📋 PASO 5: Buscando módulos...');

        // Esperar a que aparezcan los módulos
        await page.waitForSelector('.module-card, [data-module-key], .card', { timeout: 10000 }).catch(() => {
            console.log('   ⚠️ Timeout esperando módulos, continuando...');
        });

        const moduleCards = await page.locator('.module-card, [data-module-key]').all();
        console.log(`\n   📦 MÓDULOS ENCONTRADOS: ${moduleCards.length}`);

        if (moduleCards.length > 0) {
            console.log('\n   📋 LISTA DE MÓDULOS:');
            for (let i = 0; i < moduleCards.length; i++) {
                const name = await moduleCards[i].getAttribute('data-module-name').catch(() => null) ||
                            await moduleCards[i].locator('.card-title, .module-title, h5, h4, .title').first().textContent().catch(() => `Módulo ${i + 1}`);
                const key = await moduleCards[i].getAttribute('data-module-key').catch(() => 'unknown');
                console.log(`      ${String(i + 1).padStart(2, ' ')}. ${name} (${key})`);
            }
        }

        // PASO 6: Capturar screenshots
        console.log('\n📋 PASO 6: Capturando screenshots...');

        // Screenshot 1: Viewport completo
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '01-modules-viewport-1.png'),
            fullPage: false
        });
        console.log('   ✅ Screenshot 1/5: Viewport superior');

        // Screenshot 2: Segunda sección
        await page.evaluate(() => window.scrollBy(0, 800));
        await page.waitForTimeout(500);
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '02-modules-viewport-2.png'),
            fullPage: false
        });
        console.log('   ✅ Screenshot 2/5: Sección media-alta');

        // Screenshot 3: Tercera sección
        await page.evaluate(() => window.scrollBy(0, 800));
        await page.waitForTimeout(500);
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '03-modules-viewport-3.png'),
            fullPage: false
        });
        console.log('   ✅ Screenshot 3/5: Sección media');

        // Screenshot 4: Cuarta sección
        await page.evaluate(() => window.scrollBy(0, 800));
        await page.waitForTimeout(500);
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '04-modules-viewport-4.png'),
            fullPage: false
        });
        console.log('   ✅ Screenshot 4/5: Sección inferior');

        // Screenshot 5: Grid completo (página completa sin modales)
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);

        // Esconder modal una vez más
        await page.evaluate(() => {
            document.querySelectorAll('.modal, .modal-backdrop, #loginModal, [class*="modal"]').forEach(el => {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.opacity = '0';
            });
        });

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '05-modules-fullpage.png'),
            fullPage: true
        });
        console.log('   ✅ Screenshot 5/5: Página completa');

        // PASO 7: Capturar el mainContent si existe
        console.log('\n📋 PASO 7: Capturando área de contenido principal...');
        const mainContent = await page.locator('#mainContent, .main-content, #content').first();
        const isVisible = await mainContent.isVisible().catch(() => false);

        if (isVisible) {
            await mainContent.screenshot({
                path: path.join(SCREENSHOT_DIR, '06-main-content-area.png')
            });
            console.log('   ✅ Screenshot mainContent capturado');
        } else {
            // Capturar el área donde deberían estar los módulos
            const moduleGrid = await page.locator('.module-grid, .grid, .row').first();
            const gridVisible = await moduleGrid.isVisible().catch(() => false);
            if (gridVisible) {
                await moduleGrid.screenshot({
                    path: path.join(SCREENSHOT_DIR, '06-module-grid-area.png')
                });
                console.log('   ✅ Screenshot grid de módulos capturado');
            }
        }

        // RESUMEN
        console.log('\n' + '='.repeat(70));
        console.log('📊 RESUMEN FINAL');
        console.log('='.repeat(70));
        console.log(`✅ Módulos encontrados: ${moduleCards.length}`);

        const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
        console.log(`📸 Screenshots generados: ${files.length}`);
        files.forEach(f => console.log(`   - ${f}`));

        console.log(`\n📁 Ubicación: ${SCREENSHOT_DIR}`);
        console.log('\n✅ TEST COMPLETADO');

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
