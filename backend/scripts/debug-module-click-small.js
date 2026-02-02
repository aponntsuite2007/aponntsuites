/**
 * Debug - Module Click Issue (Pantalla pequeña)
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:9998';

async function debug() {
    console.log('🔍 DEBUG: Module Click Issue');

    const browser = await chromium.launch({
        headless: false,
        args: ['--window-size=1280,800']  // Pantalla más pequeña
    });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }  // Viewport ajustado
    });
    const page = await context.newPage();

    // Capturar errores
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('❌ ERROR:', msg.text().slice(0, 100));
        }
    });

    try {
        console.log('📍 Navegando...');
        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);

        // Login
        console.log('🔐 Login...');
        const selectEmpresa = page.locator('select').first();
        if (await selectEmpresa.count() > 0) {
            await page.waitForTimeout(500);
            const options = await selectEmpresa.locator('option').allTextContents();
            const isiOption = options.find(o => o.toLowerCase().includes('isi'));
            if (isiOption) await selectEmpresa.selectOption({ label: isiOption });
        }

        await page.locator('input[type="text"]').first().fill('admin');
        await page.locator('input[type="password"]').first().fill('admin123');
        await page.locator('button[type="submit"], button:has-text("Iniciar")').first().click();
        await page.waitForTimeout(3000);

        console.log('✅ Login OK - Buscando módulo...');

        // Buscar cualquier módulo clickeable
        const cards = await page.locator('.module-card[data-clickable="true"]').all();
        console.log(`   ${cards.length} módulos disponibles`);

        if (cards.length > 0) {
            // Click en el primer módulo disponible
            const firstCard = cards[0];
            const cardText = await firstCard.textContent();
            console.log(`🖱️ Haciendo clic en: ${cardText.slice(0, 40).trim()}...`);

            await firstCard.click();
            await page.waitForTimeout(3000);

            // Verificar estado
            const gridVisible = await page.locator('.module-grid').first().isVisible();
            const mainVisible = await page.locator('#mainContent').isVisible();

            console.log(`📊 module-grid visible: ${gridVisible}`);
            console.log(`📊 mainContent visible: ${mainVisible}`);

            if (gridVisible && !mainVisible) {
                console.log('❌ BUG: Módulo se cerró inmediatamente');
            } else if (!gridVisible && mainVisible) {
                console.log('✅ OK: Módulo abierto correctamente');
            }
        }

        console.log('\n🔍 Navegador abierto - presiona Ctrl+C para cerrar');
        await page.waitForTimeout(30000);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
}

debug().catch(console.error);
