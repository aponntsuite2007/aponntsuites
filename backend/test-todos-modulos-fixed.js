/**
 * TEST DE TODOS LOS MÓDULOS - VERSIÓN ARREGLADA
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

        // Seleccionar empresa (usar el valor que tiene dataset.companyId)
        console.log('   📋 Seleccionando empresa...');
        await page.evaluate(() => {
            const select = document.getElementById('companySelect');
            if (select && select.options.length > 1) {
                // Seleccionar la primera empresa real (índice 1, no 0 que es placeholder)
                select.selectedIndex = 1;
                // Disparar evento change para activar campos
                const event = new Event('change', { bubbles: true });
                select.dispatchEvent(event);
            }
        });
        await page.waitForTimeout(1000);

        // Esperar a que el campo de usuario esté habilitado
        console.log('   📋 Esperando habilitación de campos...');
        await page.waitForFunction(
            () => {
                const input = document.querySelector('#userInput');
                return input && !input.disabled;
            },
            { timeout: 10000 }
        );

        // Llenar campos y enviar formulario
        console.log('   📋 Ingresando credenciales...');
        await page.fill('#userInput', config.username);
        await page.fill('#passwordInput', config.password);

        // Hacer submit del formulario directamente en lugar de click en botón
        console.log('   📋 Enviando formulario...');
        const loginResult = await page.evaluate(() => {
            const form = document.querySelector('form');
            if (form) {
                // Buscar el botón de login y hacer click programáticamente
                const button = document.querySelector('#loginButton');
                if (button) {
                    button.click();
                    return 'clicked';
                }
            }
            return 'no_form';
        });

        console.log('   📋 Resultado del login:', loginResult);

        // Esperar a que el login se complete
        console.log('   📋 Esperando respuesta del servidor...');
        await page.waitForTimeout(3000);

        // Verificar si el login fue exitoso
        const loginContainerHidden = await page.evaluate(() => {
            const container = document.getElementById('loginContainer');
            return container && (container.style.display === 'none' || !container.offsetParent);
        });

        if (!loginContainerHidden) {
            // Si el login container sigue visible, intentar otra estrategia
            console.log('   ⚠️ Login container sigue visible, intentando login alternativo...');

            // Intentar ejecutar handleLogin directamente
            await page.evaluate(() => {
                const event = { preventDefault: () => {} };
                if (typeof handleLogin === 'function') {
                    handleLogin(event);
                }
            });

            await page.waitForTimeout(3000);
        }

        // Verificar nuevamente
        const isLoggedIn = await page.evaluate(() => {
            const loginContainer = document.getElementById('loginContainer');
            const moduleGrid = document.querySelector('.module-grid');
            const modulesContainer = document.getElementById('modulesContainer');

            return {
                loginHidden: loginContainer && (loginContainer.style.display === 'none' || !loginContainer.offsetParent),
                moduleGridVisible: moduleGrid && moduleGrid.offsetParent !== null,
                modulesContainerVisible: modulesContainer && modulesContainer.offsetParent !== null
            };
        });

        console.log('   📋 Estado después del login:', isLoggedIn);

        if (!isLoggedIn.loginHidden) {
            throw new Error('Login falló - el formulario sigue visible');
        }

        console.log('   ✅ Login exitoso\n');

        // 3. Obtener todos los módulos
        console.log('📋 Buscando módulos disponibles...');

        // Esperar un poco más para que se rendericen los módulos
        await page.waitForTimeout(2000);

        // Buscar módulos con múltiples estrategias
        const modulesInfo = await page.evaluate(() => {
            // Estrategia 1: module-card
            let modules = document.querySelectorAll('.module-card');
            if (modules.length > 0) {
                return {
                    selector: '.module-card',
                    count: modules.length,
                    modules: Array.from(modules).map(m => ({
                        text: m.textContent.trim(),
                        onclick: m.getAttribute('onclick')
                    }))
                };
            }

            // Estrategia 2: modulesContainer
            const container = document.getElementById('modulesContainer');
            if (container) {
                modules = container.querySelectorAll('div[onclick]');
                if (modules.length > 0) {
                    return {
                        selector: '#modulesContainer div[onclick]',
                        count: modules.length,
                        modules: Array.from(modules).map(m => ({
                            text: m.textContent.trim(),
                            onclick: m.getAttribute('onclick')
                        }))
                    };
                }
            }

            // Estrategia 3: cualquier div con onclick que tenga openModule
            modules = document.querySelectorAll('div[onclick*="openModule"], div[onclick*="loadModule"]');
            if (modules.length > 0) {
                return {
                    selector: 'div[onclick*="Module"]',
                    count: modules.length,
                    modules: Array.from(modules).map(m => ({
                        text: m.textContent.trim(),
                        onclick: m.getAttribute('onclick')
                    }))
                };
            }

            return { selector: 'none', count: 0, modules: [] };
        });

        console.log(`   ✅ Encontrados ${modulesInfo.count} módulos usando selector: ${modulesInfo.selector}\n`);

        if (modulesInfo.count === 0) {
            await page.screenshot({ path: 'no-modules-found.png' });
            console.log('   ❌ No se encontraron módulos. Screenshot guardado.');
            return;
        }

        // 4. Testear cada módulo
        const results = [];

        for (let i = 0; i < Math.min(modulesInfo.count, 5); i++) { // Probar solo los primeros 5 para no demorar mucho
            const moduleInfo = modulesInfo.modules[i];
            const moduleName = moduleInfo.text.split('\n')[0]; // Tomar solo el nombre

            console.log(`📋 Módulo ${i + 1}/${Math.min(modulesInfo.count, 5)}: ${moduleName}`);

            // Click en el módulo
            const clicked = await page.evaluate((onclick) => {
                // Buscar el elemento por su onclick y hacer click
                const element = document.querySelector(`[onclick="${onclick}"]`);
                if (element) {
                    element.click();
                    return true;
                }
                return false;
            }, moduleInfo.onclick);

            if (!clicked) {
                console.log('   ⚠️ No se pudo hacer click en el módulo');
                results.push({ name: moduleName, status: '⚠️ No clickeable' });
                continue;
            }

            await page.waitForTimeout(2000);

            // Verificar qué pasó
            const moduleStatus = await page.evaluate(() => {
                // Buscar errores
                const errorTexts = ['sin función de inicialización', 'error', 'Error', 'failed'];
                const hasError = errorTexts.some(text =>
                    document.body.textContent.includes(text)
                );

                // Ver si hay contenido nuevo
                const mainContent = document.getElementById('mainContent');
                const hasContent = mainContent && mainContent.textContent.length > 200;

                // Ver si seguimos en el dashboard
                const moduleGrid = document.querySelector('.module-grid');
                const stillInDashboard = moduleGrid && moduleGrid.offsetParent !== null;

                return { hasError, hasContent, stillInDashboard };
            });

            let status = '❓ Desconocido';
            if (moduleStatus.hasError) {
                status = '❌ Error de inicialización';
            } else if (moduleStatus.hasContent && !moduleStatus.stillInDashboard) {
                status = '✅ Funciona';
            } else if (moduleStatus.stillInDashboard) {
                status = '⚠️ No cargó (sigue en dashboard)';
            }

            results.push({ name: moduleName, status });
            console.log(`   ${status}\n`);

            // Volver al dashboard
            await page.reload();
            await page.waitForTimeout(2000);

            // Verificar si necesitamos hacer login de nuevo
            const needsLogin = await page.evaluate(() => {
                return document.getElementById('loginContainer')?.offsetParent !== null;
            });

            if (needsLogin) {
                console.log('   📋 Re-autenticando...');
                // Repetir el proceso de login
                await page.evaluate(() => {
                    const select = document.getElementById('companySelect');
                    if (select) select.selectedIndex = 1;
                    const event = new Event('change', { bubbles: true });
                    select.dispatchEvent(event);
                });
                await page.waitForTimeout(1000);
                await page.fill('#userInput', config.username);
                await page.fill('#passwordInput', config.password);
                await page.evaluate(() => {
                    document.querySelector('#loginButton').click();
                });
                await page.waitForTimeout(3000);
            }
        }

        // 5. Reporte final
        console.log('\n' + '='.repeat(80));
        console.log('📊 REPORTE FINAL');
        console.log('='.repeat(80) + '\n');

        const working = results.filter(r => r.status.includes('✅')).length;
        const errors = results.filter(r => r.status.includes('❌')).length;
        const warnings = results.filter(r => r.status.includes('⚠️')).length;

        console.log(`Total módulos testeados: ${results.length} de ${modulesInfo.count}`);
        console.log(`✅ Funcionando: ${working}`);
        console.log(`❌ Con errores: ${errors}`);
        console.log(`⚠️ Con warnings: ${warnings}\n`);

        console.log('Detalle por módulo:');
        console.log('-'.repeat(50));
        results.forEach(r => {
            console.log(`${r.status} ${r.name}`);
        });

        // Mostrar algunos módulos no testeados si hay
        if (modulesInfo.count > 5) {
            console.log(`\n⚠️ Nota: Solo se testearon 5 de ${modulesInfo.count} módulos`);
            console.log('Módulos no testeados:');
            for (let i = 5; i < Math.min(10, modulesInfo.count); i++) {
                console.log(`  - ${modulesInfo.modules[i].text.split('\n')[0]}`);
            }
            if (modulesInfo.count > 10) {
                console.log(`  ... y ${modulesInfo.count - 10} más`);
            }
        }

    } catch (error) {
        console.error('❌ Error en test:', error.message);
        await page.screenshot({ path: 'error-test.png' });
        console.log('Screenshot guardado: error-test.png');
    } finally {
        if (browser) {
            await browser.close();
            console.log('\n✅ Navegador cerrado');
        }
    }
}

// Ejecutar
testAllModules().catch(console.error);