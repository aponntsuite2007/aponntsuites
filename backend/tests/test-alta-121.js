/**
 * Test: Alta Manual con PRES-2026-0002 (company 121)
 */
const { chromium } = require('playwright');

(async () => {
    console.log('🚀 Test - Alta Manual (Company 121)\n');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();

    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Error') || text.includes('[QUOTES]') || text.includes('Alta')) {
            console.log('📋', text);
        }
    });

    try {
        // Login
        await page.goto('http://localhost:9998/panel-administrativo.html', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);
        await page.fill('#login-email', 'admin');
        await page.fill('#login-password', 'admin123');
        await page.click('button[type="submit"], .login-btn');
        await page.waitForTimeout(4000);

        // Ir a Presupuestos
        console.log('1. Navegando a quotes...');
        await page.evaluate(() => AdminSidebar.navigateTo('quotes'));
        await page.waitForTimeout(4000);

        // PRES-2026-0002 está en índice 3 (ordenados DESC: 0005, 0004, 0003, 0002, 0001)
        console.log('2. Abriendo PRES-2026-0002 (índice 3)...');
        const viewButtons = await page.$$('button[onclick*="viewQuote"]');
        console.log('   Total:', viewButtons.length);

        if (viewButtons.length >= 4) {
            await viewButtons[3].click();  // PRES-2026-0002
            await page.waitForTimeout(2000);

            // Scroll al footer
            await page.evaluate(() => {
                const modal = document.querySelector('.quote-modal');
                if (modal) modal.scrollTop = modal.scrollHeight;
            });
            await page.waitForTimeout(500);

            // Verificar qué presupuesto abrimos
            const info = await page.evaluate(() => {
                const header = document.querySelector('.quote-modal-header h3');
                return header ? header.textContent : 'No encontrado';
            });
            console.log('   Abrió:', info);

            const altaBtn = await page.$('button[onclick*="showManualOnboardingModal"]');
            if (altaBtn) {
                console.log('3. Click Alta Manual...');
                await altaBtn.click();
                await page.waitForTimeout(1500);

                // Scroll en modal Alta Manual
                await page.evaluate(() => {
                    const m = document.querySelector('.quote-modal-overlay[style*="z-index:2000"] .quote-modal');
                    if (m) m.scrollTop = m.scrollHeight;
                });
                await page.waitForTimeout(300);

                console.log('4. Confirmando...');
                await page.click('button:has-text("Confirmar Alta")');
                await page.waitForTimeout(5000);

                await page.screenshot({ path: 'tests/screenshots/alta-121-result.png' });
                console.log('📸 Screenshot guardado');

                // Verificar resultado
                const hasError = await page.evaluate(() => {
                    return document.body.textContent.includes('Error') || document.body.textContent.includes('error');
                });
                console.log('5. ¿Tiene error?:', hasError ? 'SÍ' : 'NO');

            } else {
                console.log('⚠️ Empresa ya activa');
            }
        }

        await page.waitForTimeout(3000);
    } catch (err) {
        console.error('❌', err.message);
    }

    await browser.close();
    console.log('✅ Fin');
})();
