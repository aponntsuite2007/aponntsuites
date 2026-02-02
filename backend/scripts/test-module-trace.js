const { chromium } = require('playwright');

(async () => {
    console.log('🚀 Test con stack trace...');
    const browser = await chromium.launch({
        headless: false,
        args: ['--window-size=1280,800']
    });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    // Capturar TODOS los logs de showModuleContent incluyendo traces
    page.on('console', msg => {
        const t = msg.text();
        if (t.includes('showModuleContent') || t.includes('Stack trace')) {
            console.log('[TRACE]', t.slice(0,500));
        }
    });

    await page.goto('http://localhost:9998/panel-empresa.html');
    console.log('📍 Página cargada, esperando 5s para ver traces...');
    await page.waitForTimeout(5000);

    console.log('\n📊 Resumen:');
    const state = await page.evaluate(() => {
        const grid = document.querySelector('.module-grid');
        return {
            flag: window.moduleContentActive,
            gridClass: grid?.classList.contains('module-content-active'),
            gridDisplay: grid ? getComputedStyle(grid).display : 'not found'
        };
    });
    console.log('   moduleContentActive:', state.flag);
    console.log('   grid tiene clase module-content-active:', state.gridClass);
    console.log('   grid computed display:', state.gridDisplay);

    await browser.close();
    console.log('Done');
})();
