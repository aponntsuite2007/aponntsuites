/**
 * TEST DE TODOS LOS MÓDULOS
 * ========================
 * Verifica que todos los módulos se abran correctamente
 */

require('dotenv').config();
const { chromium } = require('playwright');

const config = {
    baseUrl: 'http://localhost:9998',
    companySlug: 'isi',
    username: 'soporte',
    password: 'admin123'
};

async function testAllModules() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TEST DE TODOS LOS MÓDULOS');
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
        console.log('   ✅ Navegador iniciado\n');

        // 2. Login
        console.log('📋 Realizando login...');
        await page.goto(config.baseUrl + '/panel-empresa.html');
        await page.waitForLoadState('networkidle');

        // Seleccionar empresa
        const companyDropdown = await page.locator('select').first();
        if (await companyDropdown.isVisible()) {
            console.log('   📋 Seleccionando empresa...');
            await companyDropdown.selectOption({ index: 1 });
            await page.waitForTimeout(1000); // Esperar más tiempo
        }

        // Esperar a que el campo de usuario esté habilitado
        console.log('   📋 Esperando campo de usuario...');
        await page.waitForFunction(
            () => {
                const input = document.querySelector('input#userInput');
                return input && !input.disabled;
            },
            { timeout: 10000 }
        );

        // Usuario
        const userField = await page.locator('input#userInput').first();
        await userField.clear();
        await userField.fill(config.username);
        console.log('   ✅ Usuario ingresado');

        // Contraseña
        const passwordField = await page.locator('input[type="password"]').first();
        await passwordField.clear();
        await passwordField.fill(config.password);
        console.log('   ✅ Contraseña ingresada');

        // Login
        const loginButton = await page.locator('button').filter({
            hasText: /iniciar.*sesión|login|ingresar/i
        }).first();
        await loginButton.click();
        console.log('   📋 Click en login...');

        // Esperar a que aparezcan los módulos
        await page.waitForSelector('.module-grid, .modules-container, #mainContent', { timeout: 10000 });
        await page.waitForTimeout(2000);
        console.log('   ✅ Login exitoso\n');

        // 3. Obtener todos los módulos
        console.log('📋 Buscando módulos disponibles...');

        // Probar diferentes selectores para encontrar los módulos
        let modules = await page.locator('.module-card').all();

        if (modules.length === 0) {
            // Intentar con el contenedor de módulos
            modules = await page.locator('#modulesContainer > div > div[onclick]').all();
        }

        if (modules.length === 0) {
            // Intentar con cualquier div con onclick que parezca un módulo
            modules = await page.locator('div[onclick*="openModuleDirect"], div[onclick*="loadModule"]').all();
        }

        if (modules.length === 0) {
            // Tomar screenshot para debug
            await page.screenshot({ path: 'debug-no-modules.png' });
            console.log('   ❌ No se encontraron módulos. Screenshot guardado en debug-no-modules.png');
        }

        console.log(`   ✅ Encontrados ${modules.length} módulos\n`);

        // 4. Testear cada módulo
        const results = [];

        for (let i = 0; i < modules.length; i++) {
            const module = modules[i];

            // Obtener texto del módulo
            const moduleText = await module.textContent();
            const moduleName = moduleText.trim().split('\n')[0];

            console.log(`📋 Módulo ${i + 1}/${modules.length}: ${moduleName}`);

            // Click en el módulo
            await module.scrollIntoViewIfNeeded();
            await module.click();
            await page.waitForTimeout(2000);

            // Verificar qué pasó
            const hasError = await page.locator('text=/sin función de inicialización|error|Error/i').isVisible().catch(() => false);
            const hasContent = await page.locator('#mainContent').textContent().then(text => text.length > 100).catch(() => false);
            const stillInDashboard = await page.locator('.module-card').filter({ hasText: moduleName }).isVisible();

            let status = '❓ Desconocido';
            if (hasError) {
                status = '❌ Error de inicialización';
            } else if (hasContent && !stillInDashboard) {
                status = '✅ Funciona';
            } else if (stillInDashboard) {
                status = '⚠️ No cargó (sigue en dashboard)';
            }

            results.push({ name: moduleName, status });
            console.log(`   ${status}\n`);

            // Volver al dashboard si es necesario
            if (!stillInDashboard) {
                // Intentar volver con el botón de inicio o recargando
                const homeButton = await page.locator('button, a').filter({ hasText: /inicio|home|dashboard/i }).first();
                if (await homeButton.isVisible()) {
                    await homeButton.click();
                } else {
                    // Recargar y hacer login de nuevo
                    await page.reload();
                    await page.waitForTimeout(2000);

                    // Re-login si es necesario
                    const needsLogin = await page.locator('input[type="password"]').isVisible().catch(() => false);
                    if (needsLogin) {
                        // Repetir login
                        const dropdown = await page.locator('select').first();
                        if (await dropdown.isVisible()) {
                            await dropdown.selectOption({ index: 1 });
                        }
                        await page.waitForTimeout(500);

                        const user = await page.locator('input#userInput').first();
                        await page.waitForFunction(
                            () => {
                                const input = document.querySelector('input#userInput');
                                return input && !input.disabled;
                            },
                            { timeout: 5000 }
                        );
                        await user.fill(config.username);

                        const pass = await page.locator('input[type="password"]').first();
                        await pass.fill(config.password);

                        const btn = await page.locator('button').filter({
                            hasText: /iniciar.*sesión|login/i
                        }).first();
                        await btn.click();

                        await page.waitForTimeout(2000);
                    }
                }

                // Re-obtener los módulos después de volver
                modules.length = 0;
                modules.push(...await page.locator('.module-card').all());
            }
        }

        // 5. Reporte final
        console.log('\n' + '='.repeat(80));
        console.log('📊 REPORTE FINAL');
        console.log('='.repeat(80) + '\n');

        const working = results.filter(r => r.status.includes('✅')).length;
        const errors = results.filter(r => r.status.includes('❌')).length;
        const warnings = results.filter(r => r.status.includes('⚠️')).length;

        console.log(`Total módulos: ${results.length}`);
        console.log(`✅ Funcionando: ${working}`);
        console.log(`❌ Con errores: ${errors}`);
        console.log(`⚠️ Con warnings: ${warnings}\n`);

        console.log('Detalle por módulo:');
        console.log('-'.repeat(50));
        results.forEach(r => {
            console.log(`${r.status} ${r.name}`);
        });

    } catch (error) {
        console.error('❌ Error en test:', error.message);
    } finally {
        if (browser) {
            await browser.close();
            console.log('\n✅ Navegador cerrado');
        }
    }
}

// Ejecutar
testAllModules().catch(console.error);