/**
 * Test: Ejecutar Alta Manual completo
 */
const { chromium } = require('playwright');

(async () => {
    console.log('🚀 Test - Ejecutar Alta Manual\n');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();

    page.on('console', msg => console.log('📋', msg.text()));

    try {
        // 1. Login
        console.log('1. Login...');
        await page.goto('http://localhost:9998/panel-administrativo.html', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);
        await page.fill('#login-email', 'admin');
        await page.fill('#login-password', 'admin123');
        await page.click('button[type="submit"], .login-btn');
        await page.waitForTimeout(4000);

        // 2. Ir a Presupuestos
        console.log('2. Navegando a quotes...');
        await page.evaluate(() => AdminSidebar.navigateTo('quotes'));
        await page.waitForTimeout(4000);

        // 3. Abrir presupuesto
        console.log('3. Abriendo presupuesto...');
        const viewButtons = await page.$$('button[onclick*="viewQuote"]');
        if (viewButtons.length > 0) {
            await viewButtons[0].click();
            await page.waitForTimeout(2000);

            // 4. Click en Alta Manual
            console.log('4. Abriendo modal Alta Manual...');
            const altaBtn = await page.$('button[onclick*="showManualOnboardingModal"]');
            if (altaBtn) {
                await altaBtn.click();
                await page.waitForTimeout(1500);

                // 5. Verificar que el motivo está pre-llenado
                const reasonValue = await page.evaluate(() => {
                    return document.getElementById('manual-onboarding-reason')?.value || '';
                });
                console.log('5. Motivo pre-llenado:', reasonValue.substring(0, 60) + '...');

                if (reasonValue.length >= 10) {
                    // 6. Ejecutar Alta Manual
                    console.log('6. Confirmando Alta Manual...');
                    await page.click('button:has-text("Confirmar Alta")');
                    await page.waitForTimeout(3000);

                    // 7. Screenshot del resultado
                    await page.screenshot({ path: 'tests/screenshots/alta-manual-result.png' });
                    console.log('📸 Screenshot: alta-manual-result.png');

                    // 8. Verificar si hubo error o éxito
                    const hasError = await page.evaluate(() => {
                        const toasts = document.querySelectorAll('.toast, .notification, [class*="error"], [class*="success"]');
                        return Array.from(toasts).map(t => t.textContent).join(' | ');
                    });
                    console.log('7. Mensajes:', hasError || 'Sin mensajes visibles');
                } else {
                    console.log('⚠️ El motivo no tiene 10+ caracteres');
                }
            } else {
                console.log('⚠️ Botón Alta Manual no encontrado');
            }
        }

        console.log('\nEsperando 3s...');
        await page.waitForTimeout(3000);

    } catch (err) {
        console.error('❌ ERROR:', err.message);
        await page.screenshot({ path: 'tests/screenshots/alta-manual-error.png' });
    }

    await browser.close();
    console.log('✅ Fin');
})();
