/**
 * Test: Verificar modal reorganizado con dark theme
 */
const { chromium } = require('playwright');

(async () => {
    console.log('🚀 Test - Modal Reorganizado\n');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 },
        bypassCSP: true
    });

    // Limpiar cache
    await context.clearCookies();

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

        // 3. Click en botón Ver del primer presupuesto
        console.log('3. Click en Ver...');
        const viewButtons = await page.$$('button[onclick*="viewQuote"]');
        if (viewButtons.length > 0) {
            await viewButtons[0].click();
            await page.waitForTimeout(3000);

            // 4. Screenshot del modal completo
            console.log('4. Screenshot del modal...');
            await page.screenshot({ path: 'tests/screenshots/modal-reorganized.png', fullPage: false });
            console.log('📸 Screenshot: modal-reorganized.png');

            // 5. Scroll al footer y screenshot
            console.log('5. Scroll al footer...');
            await page.evaluate(() => {
                const modal = document.querySelector('.quote-modal');
                if (modal) modal.scrollTop = modal.scrollHeight;
            });
            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'tests/screenshots/modal-footer-reorganized.png', fullPage: false });
            console.log('📸 Screenshot: modal-footer-reorganized.png');

            // 6. Verificar estructura del footer
            console.log('6. Verificando estructura del footer...');
            const footerInfo = await page.evaluate(() => {
                const footer = document.querySelector('.quote-modal-footer');
                if (!footer) return { error: 'Footer no encontrado' };

                const leftGroup = footer.querySelector('.footer-left');
                const rightGroup = footer.querySelector('.footer-right');
                const allButtons = footer.querySelectorAll('button');

                return {
                    hasLeftGroup: !!leftGroup,
                    hasRightGroup: !!rightGroup,
                    leftButtons: leftGroup ? Array.from(leftGroup.querySelectorAll('button')).map(b => b.textContent.trim()) : [],
                    rightButtons: rightGroup ? Array.from(rightGroup.querySelectorAll('button')).map(b => b.textContent.trim()) : [],
                    totalButtons: allButtons.length,
                    allButtonTexts: Array.from(allButtons).map(b => b.textContent.trim())
                };
            });
            console.log('   Footer info:', JSON.stringify(footerInfo, null, 2));

            // 7. Verificar si hay botón PDF en el footer (no debería estar)
            const hasPDFInFooter = await page.evaluate(() => {
                const footer = document.querySelector('.quote-modal-footer');
                return footer ? footer.innerHTML.includes('downloadPDF') : false;
            });
            console.log('   ¿PDF en footer?:', hasPDFInFooter ? '❌ SÍ (error)' : '✅ NO (correcto)');

            // 8. Click en tab Contrato & Pago
            console.log('7. Navegando a tab Contrato & Pago...');
            await page.evaluate(() => {
                const tabs = document.querySelectorAll('.quote-tab');
                tabs.forEach(t => {
                    if (t.textContent.includes('Contrato')) t.click();
                });
            });
            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'tests/screenshots/modal-contrato-tab.png', fullPage: false });
            console.log('📸 Screenshot: modal-contrato-tab.png');
        }

        console.log('\nEsperando 3s...');
        await page.waitForTimeout(3000);

    } catch (err) {
        console.error('❌ ERROR:', err.message);
    }

    await browser.close();
    console.log('✅ Fin');
})();
