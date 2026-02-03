const { chromium } = require('playwright');

(async () => {
    console.log('🚀 Test - Alta Manual\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    page.on('console', msg => console.log('📋', msg.text()));

    try {
        // 1. Login
        console.log('1. Login...');
        await page.goto('http://localhost:9998/panel-administrativo.html');
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
        console.log('3. Click en Ver...');
        const viewButtons = await page.$$('button[onclick*="viewQuote"]');
        if (viewButtons.length > 0) {
            await viewButtons[0].click();
            await page.waitForTimeout(3000);

            // 4. Scroll del modal al footer
            console.log('4. Haciendo scroll al footer...');
            await page.evaluate(() => {
                const modal = document.querySelector('.quote-modal');
                if (modal) {
                    modal.scrollTop = modal.scrollHeight;
                }
            });
            await page.waitForTimeout(1000);

            // Screenshot del footer
            await page.screenshot({ path: 'tests/screenshots/footer-scroll.png' });
            console.log('📸 Screenshot guardado: footer-scroll.png');

            // También marcar el botón Alta Manual si existe
            await page.evaluate(() => {
                const btn = document.querySelector('button[onclick*="showManualOnboardingModal"]');
                if (btn) {
                    btn.style.border = '4px solid red';
                    btn.style.boxShadow = '0 0 20px red';
                }
            });
            await page.waitForTimeout(500);
            await page.screenshot({ path: 'tests/screenshots/footer-highlighted.png' });
            console.log('📸 Screenshot con highlight: footer-highlighted.png');
        }

        console.log('\nEsperando 5s...');
        await page.waitForTimeout(5000);

    } catch (err) {
        console.error('❌ ERROR:', err.message);
    }

    await browser.close();
    console.log('✅ Fin');
})();
