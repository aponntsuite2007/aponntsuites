/**
 * Test: Alta Manual con PRES-2026-0001 (empresa 120)
 */
const { chromium } = require('playwright');

(async () => {
    console.log('🚀 Test - Alta Manual v2\n');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();

    page.on('console', msg => console.log('📋', msg.text()));

    try {
        // Login
        console.log('1. Login...');
        await page.goto('http://localhost:9998/panel-administrativo.html', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);
        await page.fill('#login-email', 'admin');
        await page.fill('#login-password', 'admin123');
        await page.click('button[type="submit"], .login-btn');
        await page.waitForTimeout(4000);

        // Ir a Presupuestos
        console.log('2. Navegando a quotes...');
        await page.evaluate(() => AdminSidebar.navigateTo('quotes'));
        await page.waitForTimeout(4000);

        // Buscar PRES-2026-0001 (índice 4 desde arriba)
        console.log('3. Buscando PRES-2026-0001...');
        const viewButtons = await page.$$('button[onclick*="viewQuote"]');
        if (viewButtons.length >= 5) {
            await viewButtons[4].click();  // Último presupuesto
            await page.waitForTimeout(2000);

            const quoteInfo = await page.evaluate(() => {
                const header = document.querySelector('.quote-modal-header h3');
                return header ? header.textContent : 'No encontrado';
            });
            console.log('   Abrió:', quoteInfo);

            // Buscar botón Alta Manual
            const altaBtn = await page.$('button[onclick*="showManualOnboardingModal"]');
            if (altaBtn) {
                console.log('4. Click Alta Manual...');
                await altaBtn.click();
                await page.waitForTimeout(1500);

                console.log('5. Confirmando...');
                await page.click('button:has-text("Confirmar Alta")');
                await page.waitForTimeout(4000);

                await page.screenshot({ path: 'tests/screenshots/alta-v2-result.png' });
                console.log('📸 Screenshot guardado');
            } else {
                console.log('⚠️ Empresa ya activa');
                await page.screenshot({ path: 'tests/screenshots/alta-v2-activa.png' });
            }
        }

        await page.waitForTimeout(3000);
    } catch (err) {
        console.error('❌', err.message);
    }

    await browser.close();
    console.log('✅ Fin');
})();
