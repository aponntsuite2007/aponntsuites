/**
 * Debug - Module Click Issue
 * Detecta qué error ocurre cuando se hace clic en módulos
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:9998';

async function debug() {
    console.log('='.repeat(70));
    console.log('🔍 DEBUG: Module Click Issue');
    console.log('='.repeat(70));

    const browser = await chromium.launch({ headless: false }); // headless: false para ver
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    // Capturar TODOS los logs de consola
    const consoleLogs = [];
    page.on('console', msg => {
        const text = `[${msg.type()}] ${msg.text()}`;
        consoleLogs.push(text);
        if (msg.type() === 'error') {
            console.log('❌ CONSOLE ERROR:', msg.text());
        }
    });

    // Capturar errores de página
    page.on('pageerror', error => {
        console.log('💥 PAGE ERROR:', error.message);
    });

    // Capturar requests fallidas
    page.on('requestfailed', request => {
        console.log('🚫 REQUEST FAILED:', request.url(), request.failure()?.errorText);
    });

    try {
        console.log('\n📍 Navegando a panel-empresa.html...');
        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Login
        console.log('\n🔐 Haciendo login...');

        const selectEmpresa = page.locator('select').first();
        if (await selectEmpresa.count() > 0) {
            await page.waitForTimeout(500);
            const options = await selectEmpresa.locator('option').allTextContents();
            const isiOption = options.find(o => o.toLowerCase().includes('isi'));
            if (isiOption) {
                await selectEmpresa.selectOption({ label: isiOption });
            }
        }

        await page.locator('input[type="text"]').first().fill('admin');
        await page.locator('input[type="password"]').first().fill('admin123');
        await page.locator('button[type="submit"], button:has-text("Iniciar")').first().click();
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');

        console.log('✅ Login completado');

        // Buscar tarjeta "Mis Procedimientos"
        console.log('\n🔍 Buscando tarjeta "Mis Procedimientos"...');

        const cards = await page.locator('.module-card, [data-module-key], [data-module-id]').all();
        console.log(`   Encontradas ${cards.length} tarjetas de módulo`);

        // Buscar específicamente "Mis Procedimientos"
        let targetCard = null;
        for (const card of cards) {
            const text = await card.textContent();
            if (text.toLowerCase().includes('procedimientos') || text.toLowerCase().includes('mis proc')) {
                targetCard = card;
                console.log('   ✅ Encontrada tarjeta:', text.slice(0, 50));
                break;
            }
        }

        if (!targetCard) {
            // Buscar cualquier módulo para probar
            console.log('   ⚠️ No encontrada "Mis Procedimientos", buscando alternativa...');

            for (const card of cards) {
                const text = await card.textContent();
                // Saltar módulos especiales
                if (text.includes('Auditor') || text.includes('Engineering')) continue;

                if (text.length > 5) {
                    targetCard = card;
                    console.log('   📦 Usando módulo alternativo:', text.slice(0, 50));
                    break;
                }
            }
        }

        if (targetCard) {
            console.log('\n🖱️ Haciendo clic en módulo...');
            consoleLogs.length = 0; // Limpiar logs anteriores

            await targetCard.click();
            console.log('   ⏳ Esperando respuesta...');
            await page.waitForTimeout(3000);

            // Mostrar logs relevantes
            console.log('\n📋 LOGS DE CONSOLA DESPUÉS DEL CLIC:');
            const relevantLogs = consoleLogs.filter(log =>
                log.includes('error') ||
                log.includes('Error') ||
                log.includes('❌') ||
                log.includes('MODULE') ||
                log.includes('DYNAMIC') ||
                log.includes('undefined') ||
                log.includes('null') ||
                log.includes('failed')
            );

            if (relevantLogs.length > 0) {
                relevantLogs.forEach(log => console.log('   ', log));
            } else {
                console.log('   (Sin errores detectados)');
            }

            // Ver estado del DOM
            const moduleGridDisplay = await page.locator('.module-grid').first().evaluate(el => {
                return window.getComputedStyle(el).display;
            }).catch(() => 'not found');

            const mainContentDisplay = await page.locator('#mainContent').evaluate(el => {
                return window.getComputedStyle(el).display;
            }).catch(() => 'not found');

            console.log('\n📊 ESTADO DEL DOM:');
            console.log(`   module-grid display: ${moduleGridDisplay}`);
            console.log(`   mainContent display: ${mainContentDisplay}`);

            // Tomar screenshot
            await page.screenshot({ path: 'test-results/debug-module-click.png', fullPage: true });
            console.log('\n📸 Screenshot guardado: test-results/debug-module-click.png');

            // Esperar un poco más para ver si se cierra
            console.log('\n⏳ Esperando 5 segundos más para detectar cierre automático...');
            await page.waitForTimeout(5000);

            const moduleGridDisplayAfter = await page.locator('.module-grid').first().evaluate(el => {
                return window.getComputedStyle(el).display;
            }).catch(() => 'not found');

            console.log(`   module-grid display DESPUÉS: ${moduleGridDisplayAfter}`);

            if (moduleGridDisplayAfter !== moduleGridDisplay) {
                console.log('   ⚠️ ¡EL MÓDULO SE CERRÓ SOLO!');
            }
        } else {
            console.log('❌ No se encontraron tarjetas de módulo');
        }

        // Mantener abierto para inspección manual
        console.log('\n🔍 Navegador abierto para inspección manual...');
        console.log('   Presiona Ctrl+C para cerrar');
        await page.waitForTimeout(60000);

    } catch (error) {
        console.error('❌ Error en debug:', error.message);
        await page.screenshot({ path: 'test-results/debug-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

debug().catch(console.error);
