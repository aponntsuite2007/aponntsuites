const { chromium } = require('playwright');

(async () => {
    console.log('🚀 Test post-login state...');
    const browser = await chromium.launch({
        headless: false,
        args: ['--window-size=1280,800']
    });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    await page.goto('http://localhost:9998/panel-empresa.html');
    await page.waitForTimeout(2000);

    // Login
    const select = page.locator('select').first();
    const opts = await select.locator('option').allTextContents();
    const isi = opts.find(o => o.toLowerCase().includes('isi'));
    if (isi) await select.selectOption({ label: isi });

    await page.locator('input[type="text"]').first().fill('admin');
    await page.locator('input[type="password"]').first().fill('admin123');
    await page.locator('button[type="submit"], button:has-text("Iniciar")').first().click();
    await page.waitForTimeout(5000);
    console.log('✅ Login OK - Verificando estado...');

    // Estado completo
    const state = await page.evaluate(() => {
        const grid = document.querySelector('.module-grid');
        const card = document.querySelector('.module-card[data-clickable="true"]');
        const body = document.body;

        return {
            // Flag
            flag: window.moduleContentActive,

            // Grid
            gridExists: !!grid,
            gridDisplay: grid ? getComputedStyle(grid).display : 'not found',
            gridVisibility: grid ? getComputedStyle(grid).visibility : 'not found',
            gridOpacity: grid ? getComputedStyle(grid).opacity : 'not found',
            gridClass: grid?.className,
            gridStyle: grid?.getAttribute('style'),

            // Card
            cardExists: !!card,
            cardDisplay: card ? getComputedStyle(card).display : 'not found',
            cardVisibility: card ? getComputedStyle(card).visibility : 'not found',
            cardOpacity: card ? getComputedStyle(card).opacity : 'not found',
            cardRect: card ? card.getBoundingClientRect() : null,

            // Body
            bodyClass: body.className,
            bodyAuthenticated: body.classList.contains('authenticated'),

            // Login container
            loginVisible: (() => {
                const login = document.querySelector('.company-login-modal');
                return login ? getComputedStyle(login).display !== 'none' : 'not found';
            })()
        };
    });

    console.log('\n📊 ESTADO POST-LOGIN:');
    console.log('   moduleContentActive:', state.flag);
    console.log('');
    console.log('   GRID:');
    console.log('     exists:', state.gridExists);
    console.log('     display:', state.gridDisplay);
    console.log('     visibility:', state.gridVisibility);
    console.log('     opacity:', state.gridOpacity);
    console.log('     class:', state.gridClass);
    console.log('     inline style:', state.gridStyle);
    console.log('');
    console.log('   CARD:');
    console.log('     exists:', state.cardExists);
    console.log('     display:', state.cardDisplay);
    console.log('     visibility:', state.cardVisibility);
    console.log('     opacity:', state.cardOpacity);
    console.log('     rect:', state.cardRect);
    console.log('');
    console.log('   BODY:');
    console.log('     class:', state.bodyClass);
    console.log('     authenticated:', state.bodyAuthenticated);
    console.log('');
    console.log('   LOGIN visible:', state.loginVisible);

    // Mantener abierto para inspección
    await page.waitForTimeout(15000);
    await browser.close();
    console.log('Done');
})();
