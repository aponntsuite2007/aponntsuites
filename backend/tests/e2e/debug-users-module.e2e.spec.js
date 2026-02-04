/**
 * DEBUG: Test para diagnosticar el problema del módulo users
 */
const { test, expect } = require('@playwright/test');

const CONFIG = {
    BASE_URL: 'http://localhost:9998',
    EMPRESA_LABEL: 'WFTEST_Empresa Demo SA',
    USUARIO: 'soporte',
    PASSWORD: 'admin123'
};

test.describe('DEBUG: Módulo Users', () => {
    test('Capturar logs de consola al cargar módulo users', async ({ page }) => {
        // Capturar TODOS los logs de consola
        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push({
                type: msg.type(),
                text: msg.text()
            });
        });

        // Capturar errores de página
        const pageErrors = [];
        page.on('pageerror', error => {
            pageErrors.push(error.message);
        });

        // 1. Login (copiado del test que funciona)
        await page.goto(`${CONFIG.BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        await page.selectOption('#companySelect', { label: new RegExp(CONFIG.EMPRESA_LABEL, 'i') }).catch(async () => {
            await page.selectOption('#companySelect', 'wftest-empresa-demo');
        });
        await page.waitForTimeout(1500);

        await page.fill('#userInput', CONFIG.USUARIO);
        await page.fill('#passwordInput', CONFIG.PASSWORD);
        await page.click('#loginButton');

        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');

        // Verificar login
        const salirBtn = page.getByRole('button', { name: /Salir/i });
        await expect(salirBtn).toBeVisible({ timeout: 10000 });
        console.log('✅ Login exitoso');

        // 2. Click en módulo "Gestión de Usuarios"
        const usersModule = page.getByText('Gestión de Usuarios');
        await expect(usersModule).toBeVisible({ timeout: 10000 });
        await usersModule.click();

        // Esperar 8 segundos para que cargue completamente
        await page.waitForTimeout(8000);

        // 3. Mostrar logs relevantes
        console.log('\n============ CONSOLE LOGS RELEVANTES ============');
        consoleLogs
            .filter(log =>
                log.text.includes('[DYNAMIC-LOAD]') ||
                log.text.includes('[USERS]') ||
                log.text.includes('users') ||
                log.text.includes('Users') ||
                log.text.includes('error') ||
                log.text.includes('Error') ||
                log.text.includes('❌') ||
                log.text.includes('✅') ||
                log.type === 'error'
            )
            .forEach(log => {
                console.log(`[${log.type.toUpperCase()}] ${log.text}`);
            });

        console.log('\n============ PAGE ERRORS ============');
        if (pageErrors.length === 0) {
            console.log('No page errors detected');
        } else {
            pageErrors.forEach(err => console.log(`❌ ${err}`));
        }

        // 4. Verificar estado del DOM
        const mainContentHTML = await page.evaluate(() => {
            const mc = document.getElementById('mainContent');
            return mc ? mc.innerHTML.substring(0, 1000) : 'mainContent not found';
        });
        console.log('\n============ MAIN CONTENT (first 1000 chars) ============');
        console.log(mainContentHTML);

        // 5. Verificar si las funciones existen en window
        const windowCheck = await page.evaluate(() => {
            return {
                showUsersContent: typeof window.showUsersContent,
                ModulesExists: typeof window.Modules,
                ModulesUsers: typeof window.Modules?.users,
                ModulesUsersInit: typeof window.Modules?.users?.init,
                Users: typeof window.Users,
                allModuleKeys: window.Modules ? Object.keys(window.Modules) : []
            };
        });
        console.log('\n============ WINDOW CHECK ============');
        console.log(JSON.stringify(windowCheck, null, 2));

        // 6. Verificar scripts cargados
        const loadedScripts = await page.evaluate(() => {
            const scripts = document.querySelectorAll('script[data-module-id]');
            return Array.from(scripts).map(s => ({
                moduleId: s.getAttribute('data-module-id'),
                src: s.src
            }));
        });
        console.log('\n============ LOADED MODULE SCRIPTS ============');
        console.log(JSON.stringify(loadedScripts, null, 2));

        // El test "pasa" pero muestra toda la info debug
        expect(true).toBe(true);
    });
});
