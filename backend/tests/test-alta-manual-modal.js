/**
 * Test: Verificar modal de Alta Manual con notas pre-llenadas
 */
const { chromium } = require('playwright');

(async () => {
    console.log('🚀 Test - Modal Alta Manual Mejorado\n');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();

    page.on('console', msg => {
        if (msg.text().includes('[QUOTES]') || msg.text().includes('Alta')) {
            console.log('📋', msg.text());
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

        // 3. Click en botón Ver
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

                // 5. Screenshot del modal de Alta Manual
                await page.screenshot({ path: 'tests/screenshots/alta-manual-modal.png' });
                console.log('📸 Screenshot: alta-manual-modal.png');

                // 6. Verificar contenido del modal
                const modalInfo = await page.evaluate(() => {
                    const modal = document.querySelector('.quote-modal-overlay[style*="z-index:2000"], .quote-modal-overlay[style*="z-index: 2000"]');
                    if (!modal) return { error: 'Modal no encontrado' };

                    const textarea = modal.querySelector('#manual-onboarding-reason');
                    const notesBox = modal.querySelector('p[style*="font-style:italic"]');
                    const useAsReasonBtn = modal.querySelector('button[onclick*="Usar como motivo"]');

                    return {
                        hasTextarea: !!textarea,
                        textareaValue: textarea ? textarea.value : '',
                        hasNotesBox: !!notesBox,
                        notesText: notesBox ? notesBox.textContent : '',
                        hasUseAsReasonBtn: !!useAsReasonBtn
                    };
                });
                console.log('5. Info del modal:', JSON.stringify(modalInfo, null, 2));

                // 7. Si hay botón "Usar como motivo", clickearlo
                if (modalInfo.hasUseAsReasonBtn) {
                    console.log('6. Clickeando "Usar como motivo"...');
                    await page.click('button[onclick*="manual-onboarding-reason"]');
                    await page.waitForTimeout(500);

                    const newValue = await page.evaluate(() => {
                        return document.getElementById('manual-onboarding-reason')?.value || '';
                    });
                    console.log('   Nuevo valor del textarea:', newValue.substring(0, 80) + '...');
                }

                // 8. Screenshot final
                await page.screenshot({ path: 'tests/screenshots/alta-manual-filled.png' });
                console.log('📸 Screenshot: alta-manual-filled.png');

            } else {
                console.log('⚠️ Botón Alta Manual no encontrado');
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
