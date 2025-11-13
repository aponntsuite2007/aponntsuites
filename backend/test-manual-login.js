/**
 * TEST MANUAL - LOGIN Y LUEGO VERIFICAR MÓDULOS
 * El usuario hace el login manualmente
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function testManualLogin() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TEST MANUAL DE MÓDULOS');
    console.log('='.repeat(80) + '\n');

    let browser;
    let page;

    try {
        // 1. Iniciar navegador
        console.log('📋 Iniciando navegador...');
        browser = await chromium.launch({
            headless: false,
            slowMo: 50,
            args: ['--window-size=1366,768']
        });

        const context = await browser.newContext({
            viewport: { width: 1366, height: 768 }
        });

        page = await context.newPage();

        // 2. Ir a la página
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForLoadState('networkidle');

        console.log('\n⚠️  POR FAVOR REALIZA EL LOGIN MANUALMENTE');
        console.log('   1. Selecciona la empresa');
        console.log('   2. Ingresa usuario: soporte');
        console.log('   3. Ingresa contraseña: admin123');
        console.log('   4. Click en Iniciar Sesión');
        console.log('\nPresiona ENTER cuando hayas completado el login...\n');

        // Esperar input del usuario
        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });

        console.log('✅ Continuando con el test...\n');

        // 3. Verificar qué hay visible
        console.log('📋 Analizando página después del login:');

        const loginVisible = await page.locator('#loginContainer').isVisible().catch(() => false);
        console.log('   Login container visible:', loginVisible);

        const moduleGridVisible = await page.locator('.module-grid').isVisible().catch(() => false);
        console.log('   Module grid visible:', moduleGridVisible);

        const modulesContainerVisible = await page.locator('#modulesContainer').isVisible().catch(() => false);
        console.log('   Modules container visible:', modulesContainerVisible);

        // 4. Buscar módulos con diferentes selectores
        console.log('\n📋 Buscando módulos:');

        let modules = await page.locator('.module-card').all();
        console.log('   .module-card:', modules.length);

        if (modules.length === 0) {
            modules = await page.locator('#modulesContainer div[onclick]').all();
            console.log('   #modulesContainer div[onclick]:', modules.length);
        }

        if (modules.length === 0) {
            modules = await page.locator('div[onclick*="openModule"], div[onclick*="loadModule"]').all();
            console.log('   div[onclick*="Module"]:', modules.length);
        }

        // 5. Si encontramos módulos, probar hacer click en ellos
        if (modules.length > 0) {
            console.log(`\n✅ Encontrados ${modules.length} módulos\n`);
            console.log('📋 Probando click en el primer módulo...');

            const firstModule = modules[0];
            const moduleText = await firstModule.textContent();
            console.log(`   Módulo: ${moduleText.trim()}`);

            await firstModule.click();
            await page.waitForTimeout(3000);

            // Verificar si se cargó algo
            const hasError = await page.locator('text=/error|Error|sin función/i').isVisible().catch(() => false);
            const stillInGrid = await page.locator('.module-grid').isVisible().catch(() => false);

            if (hasError) {
                console.log('   ❌ El módulo tiene error de inicialización');
            } else if (!stillInGrid) {
                console.log('   ✅ El módulo se cargó correctamente');
            } else {
                console.log('   ⚠️ No se detectó cambio después del click');
            }

            // Tomar screenshot
            await page.screenshot({ path: 'manual-test-after-click.png' });
            console.log('\n📸 Screenshot guardado: manual-test-after-click.png');

        } else {
            console.log('\n❌ No se encontraron módulos');
            await page.screenshot({ path: 'manual-test-no-modules.png' });
            console.log('📸 Screenshot guardado: manual-test-no-modules.png');
        }

        console.log('\nPresiona ENTER para cerrar el navegador...');
        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (browser) {
            await browser.close();
            console.log('✅ Navegador cerrado');
        }
    }
}

// Ejecutar
testManualLogin().catch(console.error);