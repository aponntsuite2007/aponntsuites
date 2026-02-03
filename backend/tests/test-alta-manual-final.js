/**
 * Test: Ejecutar Alta Manual con empresa no activa
 */
const { chromium } = require('playwright');

(async () => {
    console.log('🚀 Test - Alta Manual Final\n');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();

    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[QUOTES]') || text.includes('Alta') || text.includes('Error') || text.includes('error')) {
            console.log('📋', text);
        }
    });

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

        // 3. Buscar y abrir presupuesto con empresa no activa (PRES-2026-0004)
        console.log('3. Buscando PRES-2026-0004...');

        // Click en el segundo presupuesto (que debería ser 0004)
        const viewButtons = await page.$$('button[onclick*="viewQuote"]');
        console.log('   Encontrados', viewButtons.length, 'presupuestos');

        // El índice 1 debería ser PRES-2026-0004 (están ordenados DESC por id)
        if (viewButtons.length > 1) {
            await viewButtons[1].click();  // Segundo presupuesto
            await page.waitForTimeout(2000);

            // Verificar cuál se abrió
            const quoteInfo = await page.evaluate(() => {
                const header = document.querySelector('.quote-modal-header h3');
                return header ? header.textContent : 'No encontrado';
            });
            console.log('   Abrió:', quoteInfo);

            // 4. Buscar botón Alta Manual
            const altaBtn = await page.$('button[onclick*="showManualOnboardingModal"]');
            if (altaBtn) {
                console.log('4. Abriendo modal Alta Manual...');
                await altaBtn.click();
                await page.waitForTimeout(1500);

                // Verificar textarea
                const reasonValue = await page.evaluate(() => {
                    const textarea = document.getElementById('manual-onboarding-reason');
                    return textarea ? textarea.value : '';
                });
                console.log('5. Motivo:', reasonValue.substring(0, 50) + '...');

                // Ejecutar Alta Manual
                console.log('6. Confirmando Alta...');
                await page.click('button:has-text("Confirmar Alta")');
                await page.waitForTimeout(4000);

                // Screenshot resultado
                await page.screenshot({ path: 'tests/screenshots/alta-final-result.png' });
                console.log('📸 Screenshot: alta-final-result.png');

                // Verificar resultado
                const result = await page.evaluate(() => {
                    // Buscar toasts o mensajes
                    const msgs = [];
                    document.querySelectorAll('.toast, [class*="toast"], [class*="notification"]').forEach(el => {
                        msgs.push(el.textContent.trim());
                    });
                    return msgs.length ? msgs.join(' | ') : 'Sin mensajes';
                });
                console.log('7. Resultado:', result);

            } else {
                // Verificar si hay badge de empresa activa
                const activeStatus = await page.evaluate(() => {
                    const badge = document.querySelector('.status-badge, [style*="Empresa Activa"]');
                    return badge ? badge.textContent : 'No encontrado';
                });
                console.log('⚠️ Sin botón Alta Manual. Estado:', activeStatus);
            }
        }

        console.log('\nEsperando 3s...');
        await page.waitForTimeout(3000);

    } catch (err) {
        console.error('❌ ERROR:', err.message);
    }

    await browser.close();
    console.log('✅ Fin');
})();
