const { chromium } = require('playwright');

(async () => {
    console.log('🚀 Test detallado de apertura de módulo...');
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // Capturar logs relevantes
    page.on('console', msg => {
        const t = msg.text();
        if (t.includes('MODULE') || t.includes('DYNAMIC') || t.includes('my-proc') || t.includes('MyProc') || t.includes('showModuleContent')) {
            console.log('[LOG]', t.slice(0,120));
        }
    });

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
    await page.waitForTimeout(4000);
    console.log('✅ Login OK');

    // Buscar Mis Procedimientos específicamente
    const allCards = await page.locator('.module-card').all();
    let targetCard = null;

    for (const card of allCards) {
        const text = await card.textContent();
        if (text.toLowerCase().includes('procedimiento')) {
            targetCard = card;
            console.log('📦 Encontrado: Mis Procedimientos');
            break;
        }
    }

    if (targetCard === null) {
        // Usar cualquier módulo clickeable
        targetCard = await page.locator('.module-card[data-clickable="true"]').first();
        const t = await targetCard.textContent();
        console.log('📦 Usando módulo alternativo:', t.slice(0,30));
    }

    console.log('\n🖱️ Haciendo click...');
    await targetCard.click();
    await page.waitForTimeout(5000);

    // Estado del DOM
    const state = await page.evaluate(() => {
        const grid = document.querySelector('.module-grid');
        const main = document.getElementById('mainContent');
        return {
            gridDisplay: grid ? getComputedStyle(grid).display : 'not found',
            mainDisplay: main ? getComputedStyle(main).display : 'not found',
            mainHTML: main ? main.innerHTML.slice(0,300) : 'empty'
        };
    });

    console.log('\n📊 ESTADO DEL DOM:');
    console.log('   module-grid display:', state.gridDisplay);
    console.log('   mainContent display:', state.mainDisplay);
    console.log('   mainContent HTML:', state.mainHTML.slice(0,150) + '...');

    if (state.gridDisplay === 'none') {
        console.log('\n✅ ¡MÓDULO ABRIÓ! (grid oculto)');
    } else {
        console.log('\n❌ Módulo NO abrió correctamente (grid sigue visible)');
    }

    await page.waitForTimeout(15000);
    await browser.close();
    console.log('Done');
})();
