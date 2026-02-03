/**
 * Test: Alta Manual completo con scroll
 */
const { chromium } = require('playwright');

(async () => {
    console.log('🚀 Test - Alta Manual Completo\n');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();

    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Error') || text.includes('error') || text.includes('[QUOTES]')) {
            console.log('📋', text);
        }
    });

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

        // Buscar PRES-2026-0001
        console.log('3. Abriendo PRES-2026-0001...');
        const viewButtons = await page.$$('button[onclick*="viewQuote"]');
        console.log('   Total presupuestos:', viewButtons.length);

        if (viewButtons.length >= 5) {
            await viewButtons[4].click();  // PRES-2026-0001
            await page.waitForTimeout(2000);

            // IMPORTANTE: Scroll al footer del modal
            console.log('4. Haciendo scroll al footer...');
            await page.evaluate(() => {
                const modal = document.querySelector('.quote-modal');
                if (modal) {
                    modal.scrollTop = modal.scrollHeight;
                }
            });
            await page.waitForTimeout(500);

            // Buscar botón Alta Manual
            const altaBtn = await page.$('button[onclick*="showManualOnboardingModal"]');
            if (altaBtn) {
                console.log('5. Click Alta Manual...');
                await altaBtn.click();
                await page.waitForTimeout(1500);

                // Scroll en el modal de Alta Manual también
                await page.evaluate(() => {
                    const modal = document.querySelector('.quote-modal-overlay[style*="z-index:2000"] .quote-modal');
                    if (modal) modal.scrollTop = modal.scrollHeight;
                });
                await page.waitForTimeout(300);

                console.log('6. Confirmando Alta...');
                await page.click('button:has-text("Confirmar Alta")');
                await page.waitForTimeout(4000);

                // Verificar resultado
                const result = await page.evaluate(() => {
                    // Verificar si hay mensaje de éxito
                    const body = document.body.textContent;
                    if (body.includes('Empresa activada')) return 'ÉXITO: Empresa activada';
                    if (body.includes('Error')) return 'ERROR encontrado';
                    return 'Sin mensaje claro';
                });
                console.log('7. Resultado:', result);

                await page.screenshot({ path: 'tests/screenshots/alta-completo.png' });
                console.log('📸 Screenshot guardado');
            } else {
                const status = await page.evaluate(() => {
                    const el = document.querySelector('[title*="Empresa Activa"], .status-badge');
                    return el ? el.textContent : 'No encontrado';
                });
                console.log('⚠️ Sin botón Alta Manual. Estado:', status);
            }
        }

        await page.waitForTimeout(3000);
    } catch (err) {
        console.error('❌', err.message);
    }

    await browser.close();
    console.log('✅ Fin');
})();
