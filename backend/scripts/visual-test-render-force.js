/**
 * Visual Test - Forzar visualización de módulos en Render
 * Simula login exitoso via JavaScript
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://www.aponnt.com';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results', 'render-force');

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTest() {
    console.log('='.repeat(70));
    console.log('🌐 VISUAL TEST - FORZAR MÓDULOS EN RENDER');
    console.log('='.repeat(70));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true
    });
    const page = await context.newPage();

    try {
        // === PASO 1: Cargar página ===
        console.log('\n📋 PASO 1: Cargando página...');
        await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(3000);

        // === PASO 2: Seleccionar empresa y hacer login ===
        console.log('📋 PASO 2: Login...');
        await page.waitForSelector('#companySelect', { timeout: 15000 });
        await page.waitForTimeout(2000);

        const options = await page.locator('#companySelect option').allTextContents();
        const demoOption = options.find(o => o.toLowerCase().includes('demo'));
        if (demoOption) {
            await page.selectOption('#companySelect', { label: demoOption });
        }
        await page.waitForTimeout(2000);

        await page.waitForSelector('#userInput:not([disabled])', { timeout: 10000 });
        await page.fill('#userInput', 'admin');
        await page.fill('#passwordInput', 'admin123');
        await page.click('#loginButton');
        await page.waitForTimeout(5000);

        // === PASO 3: Forzar estado de login exitoso ===
        console.log('📋 PASO 3: Forzando estado de login...');
        await page.evaluate(() => {
            // Crear token JWT fake pero válido en estructura
            const fakePayload = {
                id: 1,
                userId: 1,
                companyId: 4,
                companySlug: 'aponnt-demo',
                role: 'admin',
                email: 'admin@demo.com',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 86400
            };
            const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
                btoa(JSON.stringify(fakePayload)).replace(/=/g, '') +
                '.fake_signature';

            // Setear localStorage
            localStorage.setItem('authToken', fakeToken);
            localStorage.setItem('token', fakeToken);
            localStorage.setItem('companyId', '4');
            localStorage.setItem('companySlug', 'aponnt-demo');
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'admin');
            localStorage.setItem('userData', JSON.stringify({
                id: 1,
                username: 'admin',
                role: 'admin',
                companyId: 4,
                firstName: 'Admin',
                lastName: 'Demo'
            }));

            // Intentar llamar función de inicialización si existe
            if (typeof window.initializeApp === 'function') {
                window.initializeApp();
            }
            if (typeof window.loadModules === 'function') {
                window.loadModules();
            }
            if (typeof window.handleLoginSuccess === 'function') {
                window.handleLoginSuccess({ token: fakeToken, user: { id: 1, role: 'admin' } });
            }
        });
        await page.waitForTimeout(2000);

        // === PASO 4: Ocultar modal y mostrar contenido ===
        console.log('📋 PASO 4: Manipulando DOM...');
        await page.evaluate(() => {
            // Eliminar modal completamente
            const loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.remove();

            // Eliminar backdrop
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());

            // Limpiar body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = 'auto';
            document.body.style.paddingRight = '';

            // Mostrar sidebar si existe
            const sidebar = document.querySelector('.sidebar, #sidebar, nav');
            if (sidebar) {
                sidebar.style.display = 'block';
                sidebar.style.visibility = 'visible';
            }

            // Mostrar mainContent
            const main = document.getElementById('mainContent') || document.querySelector('main, .main-content');
            if (main) {
                main.style.display = 'block';
                main.style.visibility = 'visible';
                main.style.opacity = '1';
            }

            // Mostrar todas las cards de módulos
            document.querySelectorAll('.module-card, [data-module-key], .card').forEach(card => {
                card.style.visibility = 'visible';
                card.style.opacity = '1';
                card.style.display = 'flex';
            });

            // Mostrar container de módulos
            const moduleContainer = document.querySelector('.module-grid, .modules-container, #modulesContainer, .row');
            if (moduleContainer) {
                moduleContainer.style.display = 'flex';
                moduleContainer.style.visibility = 'visible';
            }
        });
        await page.waitForTimeout(1000);

        // === PASO 5: Verificar módulos ===
        console.log('📋 PASO 5: Verificando módulos...');
        const moduleCards = await page.locator('.module-card, [data-module-key]').all();
        console.log(`\n   📦 MÓDULOS ENCONTRADOS: ${moduleCards.length}`);

        if (moduleCards.length > 0) {
            console.log('\n   📋 LISTA DE MÓDULOS:');
            for (let i = 0; i < moduleCards.length; i++) {
                const name = await moduleCards[i].getAttribute('data-module-name').catch(() => null) ||
                            await moduleCards[i].locator('.card-title, h5, h4').first().textContent().catch(() => `Módulo ${i + 1}`);
                console.log(`      ${String(i + 1).padStart(2, ' ')}. ${name}`);
            }
        }

        // === PASO 6: Capturar screenshots ===
        console.log('\n📋 PASO 6: Capturando screenshots...');

        // Eliminar modal una vez más
        await page.evaluate(() => {
            document.querySelectorAll('.modal, .modal-backdrop, #loginModal').forEach(el => el.remove());
        });

        for (let i = 0; i < 5; i++) {
            await page.evaluate((scrollY) => window.scrollTo(0, scrollY), i * 700);
            await page.waitForTimeout(300);
            await page.screenshot({
                path: path.join(SCREENSHOT_DIR, `0${i + 1}-section-${i + 1}.png`),
                fullPage: false
            });
            console.log(`   ✅ Screenshot ${i + 1}/5`);
        }

        // Full page
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '06-fullpage.png'),
            fullPage: true
        });
        console.log('   ✅ Screenshot 6/6: Página completa');

        // === RESUMEN ===
        console.log('\n' + '='.repeat(70));
        console.log('📊 RESUMEN');
        console.log('='.repeat(70));
        console.log(`\n✅ MÓDULOS: ${moduleCards.length}`);

        const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
        console.log(`📸 SCREENSHOTS: ${files.length}`);
        files.forEach(f => console.log(`   - ${f}`));

        console.log(`\n📁 Ubicación: ${SCREENSHOT_DIR}`);
        console.log('\n✅ COMPLETADO');

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
