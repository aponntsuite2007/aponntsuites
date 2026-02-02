/**
 * Visual Test - Módulos en LOCAL (localhost:9998)
 * Para comparar con Render
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results', 'local-modules');

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTest() {
    console.log('='.repeat(70));
    console.log('🏠 VISUAL TEST - MÓDULOS EN LOCAL (localhost:9998)');
    console.log('='.repeat(70));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    try {
        console.log('\n📋 Cargando página...');
        await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Login con ISI
        console.log('📋 Seleccionando empresa ISI...');
        await page.waitForSelector('#companySelect', { timeout: 10000 });
        await page.waitForTimeout(2000);

        const options = await page.locator('#companySelect option').allTextContents();
        console.log('   Empresas:', options.filter(o => o && !o.includes('Selecciona')).slice(0, 5));

        // Buscar ISI
        const isiOption = options.find(o => o.toLowerCase().includes('isi') || o.toLowerCase().includes('suite'));
        if (isiOption) {
            await page.selectOption('#companySelect', { label: isiOption });
            console.log(`   ✅ Seleccionada: ${isiOption}`);
        } else {
            await page.selectOption('#companySelect', { index: 1 });
        }
        await page.waitForTimeout(2000);

        // Login
        console.log('\n📋 Login...');
        await page.waitForSelector('#userInput:not([disabled])', { timeout: 10000 });
        await page.fill('#userInput', 'administrador');
        await page.fill('#passwordInput', 'admin123');
        await page.click('#loginButton');
        await page.waitForTimeout(5000);

        // Verificar login exitoso
        const loggedIn = await page.locator('.module-card, [data-module-key], text=Bienvenido').first().isVisible().catch(() => false);
        console.log(`   Login exitoso: ${loggedIn ? '✅ SÍ' : '❌ NO'}`);

        // Cerrar modal si existe
        await page.evaluate(() => {
            document.querySelectorAll('.modal, .modal-backdrop').forEach(el => el.remove());
            document.body.classList.remove('modal-open');
        });
        await page.waitForTimeout(500);

        // Obtener módulos
        console.log('\n📋 Obteniendo módulos...');
        const moduleCards = await page.locator('.module-card, [data-module-key]').all();
        console.log(`\n   📦 MÓDULOS ENCONTRADOS: ${moduleCards.length}`);

        if (moduleCards.length > 0) {
            console.log('\n   📋 LISTA DE MÓDULOS:');
            console.log('-'.repeat(50));
            for (let i = 0; i < moduleCards.length; i++) {
                const name = await moduleCards[i].getAttribute('data-module-name').catch(() => null) ||
                            await moduleCards[i].locator('.card-title, h5').first().textContent().catch(() => `Módulo ${i + 1}`);
                console.log(`${String(i + 1).padStart(2, ' ')}. ${name}`);
            }
            console.log('-'.repeat(50));
        }

        // Capturar screenshots
        console.log('\n📸 Capturando screenshots...');

        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '01-local-modules-top.png'),
            fullPage: false
        });
        console.log('   ✅ Screenshot 1: Sección superior');

        await page.evaluate(() => window.scrollTo(0, 700));
        await page.waitForTimeout(500);
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '02-local-modules-mid.png'),
            fullPage: false
        });
        console.log('   ✅ Screenshot 2: Sección media');

        await page.evaluate(() => window.scrollTo(0, 1400));
        await page.waitForTimeout(500);
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '03-local-modules-bottom.png'),
            fullPage: false
        });
        console.log('   ✅ Screenshot 3: Sección inferior');

        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '04-local-fullpage.png'),
            fullPage: true
        });
        console.log('   ✅ Screenshot 4: Página completa');

        // Resumen
        console.log('\n' + '='.repeat(70));
        console.log('📊 RESUMEN');
        console.log('='.repeat(70));
        console.log(`\n✅ MÓDULOS LOCAL: ${moduleCards.length}`);

        const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
        console.log(`📸 Screenshots: ${files.length}`);
        files.forEach(f => console.log(`   - ${f}`));

        console.log(`\n📁 Ubicación: ${SCREENSHOT_DIR}`);
        console.log('\n✅ COMPLETADO');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    } finally {
        await browser.close();
    }
}

runTest();
