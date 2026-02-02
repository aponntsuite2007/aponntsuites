const { chromium } = require('playwright');

(async () => {
    console.log('🚀 Test de FIX: moduleContentActive flag...');
    const browser = await chromium.launch({
        headless: false,
        args: ['--window-size=1280,800']
    });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    // Capturar logs relevantes
    page.on('console', msg => {
        const t = msg.text();
        if (t.includes('moduleContentActive') || t.includes('DEBUG') || t.includes('BACK-TO-GRID') || t.includes('Grid')) {
            console.log('[LOG]', t.slice(0,150));
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
    await page.locator('button[type=\"submit\"], button:has-text(\"Iniciar\")').first().click();
    await page.waitForTimeout(4000);
    console.log('✅ Login OK');

    // Verificar estado inicial del flag
    const flagBefore = await page.evaluate(() => window.moduleContentActive);
    console.log('📊 Flag ANTES de click:', flagBefore);

    // Buscar cualquier módulo clickeable
    const targetCard = await page.locator('.module-card[data-clickable="true"]').first();
    const cardText = await targetCard.textContent();
    console.log('📦 Haciendo click en:', cardText.slice(0,30));

    await targetCard.click();
    await page.waitForTimeout(3000);

    // Verificar estado después del click
    const state = await page.evaluate(() => {
        const grid = document.querySelector('.module-grid');
        return {
            flagActive: window.moduleContentActive,
            gridDisplay: grid ? getComputedStyle(grid).display : 'not found',
            gridStyle: grid ? grid.style.display : 'not found'
        };
    });

    console.log('\n📊 ESTADO DESPUÉS DEL CLICK:');
    console.log('   moduleContentActive:', state.flagActive);
    console.log('   grid computed display:', state.gridDisplay);
    console.log('   grid inline display:', state.gridStyle);

    if (state.gridDisplay === 'none' && state.flagActive === true) {
        console.log('\n✅ ¡FIX FUNCIONA! Módulo abierto, grid oculto, flag activo');
    } else if (state.gridDisplay !== 'none') {
        console.log('\n❌ FAIL: Grid sigue visible después de abrir módulo');
    } else if (state.flagActive !== true) {
        console.log('\n⚠️ WARNING: Grid oculto pero flag no está activo');
    }

    // Mantener abierto para inspección manual
    await page.waitForTimeout(10000);
    await browser.close();
    console.log('Done');
})();
