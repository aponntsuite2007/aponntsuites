/**
 * DEBUG LOGIN Y MÓDULOS
 */

require('dotenv').config();
const { chromium } = require('playwright');

const config = {
    baseUrl: 'http://localhost:9998',
    companySlug: 'isi',
    username: 'soporte',
    password: 'admin123'
};

async function debugLogin() {
    console.log('\n🔍 DEBUG: Login y Módulos\n');

    let browser;
    let page;

    try {
        // Iniciar navegador
        browser = await chromium.launch({
            headless: false,
            slowMo: 100
        });

        const context = await browser.newContext({
            viewport: { width: 1366, height: 768 }
        });

        page = await context.newPage();

        // Ir a la página
        console.log('1. Navegando a panel-empresa...');
        await page.goto(config.baseUrl + '/panel-empresa.html');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'debug-1-initial.png' });

        // Seleccionar empresa
        console.log('2. Seleccionando empresa...');
        const companyDropdown = await page.locator('select').first();
        if (await companyDropdown.isVisible()) {
            await companyDropdown.selectOption({ index: 1 });
            console.log('   ✅ Empresa seleccionada');
        }
        await page.waitForTimeout(1500);
        await page.screenshot({ path: 'debug-2-company-selected.png' });

        // Esperar a que el campo esté habilitado
        console.log('3. Esperando campo de usuario...');
        await page.waitForFunction(
            () => {
                const input = document.querySelector('input#userInput');
                return input && !input.disabled;
            },
            { timeout: 10000 }
        );
        console.log('   ✅ Campo habilitado');

        // Usuario
        console.log('4. Ingresando usuario...');
        const userField = await page.locator('input#userInput').first();
        await userField.clear();
        await userField.fill(config.username);
        await page.screenshot({ path: 'debug-3-user-filled.png' });

        // Contraseña
        console.log('5. Ingresando contraseña...');
        const passwordField = await page.locator('input[type="password"]').first();
        await passwordField.clear();
        await passwordField.fill(config.password);
        await page.screenshot({ path: 'debug-4-password-filled.png' });

        // Click en login
        console.log('6. Haciendo click en login...');
        const loginButton = await page.locator('button').filter({
            hasText: /iniciar.*sesión|login|ingresar/i
        }).first();
        await loginButton.click();

        console.log('7. Esperando respuesta...');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'debug-5-after-login.png' });

        // Verificar qué hay en la página
        console.log('\n8. Analizando elementos en la página:');

        // Login container visible?
        const loginVisible = await page.locator('#loginContainer').isVisible().catch(() => false);
        console.log('   Login container visible:', loginVisible);

        // Module grid visible?
        const moduleGridVisible = await page.locator('.module-grid').isVisible().catch(() => false);
        console.log('   Module grid visible:', moduleGridVisible);

        // Modules container visible?
        const modulesContainerVisible = await page.locator('#modulesContainer').isVisible().catch(() => false);
        console.log('   Modules container visible:', modulesContainerVisible);

        // Main content visible?
        const mainContentVisible = await page.locator('#mainContent').isVisible().catch(() => false);
        console.log('   Main content visible:', mainContentVisible);

        // Contar elementos clickables
        const clickables = await page.locator('div[onclick]').all();
        console.log('   Elementos con onclick:', clickables.length);

        // Ver si hay módulos visibles
        const visibleDivs = await page.locator('div:visible').all();
        console.log('   Divs visibles totales:', visibleDivs.length);

        // Obtener el HTML del body (primeros 500 caracteres)
        const bodyHTML = await page.locator('body').innerHTML();
        console.log('\n9. HTML Body (primeros 500 chars):');
        console.log(bodyHTML.substring(0, 500) + '...');

        console.log('\n✅ Debug completado. Revisa las capturas: debug-1 a debug-5.png');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (browser) {
            console.log('\nPresiona Enter para cerrar el navegador...');
            await new Promise(resolve => {
                process.stdin.once('data', resolve);
            });
            await browser.close();
        }
    }
}

// Ejecutar
debugLogin().catch(console.error);