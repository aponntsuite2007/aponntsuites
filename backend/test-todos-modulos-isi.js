/**
 * TEST DE TODOS LOS MÓDULOS - CON ISI
 * ====================================
 * Usa la empresa ISI para las pruebas
 */

require('dotenv').config();
const { chromium } = require('playwright');

const config = {
    baseUrl: 'http://localhost:9998',
    companyName: 'ISI',  // Buscar específicamente ISI
    username: 'soporte',
    password: 'admin123'
};

async function testAllModulesISI() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TEST DE TODOS LOS MÓDULOS - EMPRESA ISI');
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

        // Capturar mensajes de consola para debug
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('❌ [ERROR CONSOLA]:', msg.text());
            }
        });

        console.log('   ✅ Navegador iniciado\n');

        // 2. Login con ISI
        console.log('📋 Realizando login con empresa ISI...');
        await page.goto(config.baseUrl + '/panel-empresa.html');
        await page.waitForLoadState('networkidle');

        // Buscar y seleccionar ISI específicamente
        console.log('   📋 Buscando empresa ISI...');
        const isiSelected = await page.evaluate(() => {
            const select = document.getElementById('companySelect');
            if (!select) return { success: false, error: 'No se encontró el select' };

            // Buscar ISI en las opciones
            let isiIndex = -1;
            for (let i = 0; i < select.options.length; i++) {
                const option = select.options[i];
                const text = option.textContent.toUpperCase();
                if (text.includes('ISI')) {
                    isiIndex = i;
                    break;
                }
            }

            if (isiIndex === -1) {
                // Listar todas las opciones disponibles
                const options = Array.from(select.options).map(o => o.textContent);
                return { success: false, error: 'ISI no encontrado', available: options };
            }

            // Seleccionar ISI
            select.selectedIndex = isiIndex;
            const selectedOption = select.options[isiIndex];

            // Disparar evento change
            const event = new Event('change', { bubbles: true });
            select.dispatchEvent(event);

            return {
                success: true,
                company: selectedOption.textContent,
                companyId: selectedOption.dataset.companyId,
                index: isiIndex
            };
        });

        if (!isiSelected.success) {
            console.log('   ❌ Error:', isiSelected.error);
            if (isiSelected.available) {
                console.log('   Empresas disponibles:');
                isiSelected.available.forEach((opt, i) => {
                    console.log(`     [${i}] ${opt}`);
                });
            }
            throw new Error('No se pudo seleccionar ISI');
        }

        console.log(`   ✅ ISI seleccionado: ${isiSelected.company} (ID: ${isiSelected.companyId})`);
        await page.waitForTimeout(1500);

        // Esperar a que los campos estén habilitados
        console.log('   📋 Esperando habilitación de campos...');
        await page.waitForFunction(
            () => {
                const input = document.querySelector('#userInput');
                return input && !input.disabled;
            },
            { timeout: 10000 }
        );

        // Llenar credenciales
        console.log('   📋 Ingresando credenciales...');
        await page.fill('#userInput', config.username);
        await page.fill('#passwordInput', config.password);

        // Hacer login
        console.log('   📋 Haciendo click en login...');
        await page.click('#loginButton');

        // Esperar respuesta
        console.log('   📋 Esperando respuesta del servidor...');
        await page.waitForTimeout(5000);

        // Verificar si el login fue exitoso
        const loginStatus = await page.evaluate(() => {
            const loginContainer = document.getElementById('loginContainer');
            const isHidden = loginContainer && (
                loginContainer.style.display === 'none' ||
                !loginContainer.offsetParent
            );

            // Buscar módulos de cualquier forma
            const moduleSelectors = [
                '.module-card',
                '#modulesContainer div[onclick]',
                'div[onclick*="openModule"]',
                'div[onclick*="loadModule"]',
                '.module-item'
            ];

            let modulesFound = 0;
            for (const selector of moduleSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    modulesFound = elements.length;
                    break;
                }
            }

            return {
                loginHidden: isHidden,
                modulesFound: modulesFound,
                authToken: window.authToken ? true : false,
                currentUser: window.currentUser
            };
        });

        console.log('   📊 Estado del login:', {
            loginOculto: loginStatus.loginHidden,
            módulosEncontrados: loginStatus.modulesFound,
            tokenPresente: loginStatus.authToken,
            usuario: loginStatus.currentUser?.username
        });

        if (!loginStatus.loginHidden) {
            await page.screenshot({ path: 'isi-login-failed.png' });
            throw new Error('Login falló - el formulario sigue visible');
        }

        console.log('   ✅ Login exitoso con ISI\n');

        // 3. Buscar y testear módulos
        console.log('📋 Buscando módulos disponibles...');

        const modules = await page.evaluate(() => {
            // Buscar módulos con múltiples estrategias
            const selectors = [
                { selector: '.module-card', name: 'module-card' },
                { selector: '#modulesContainer div[onclick]', name: 'modulesContainer' },
                { selector: 'div[onclick*="openModule"]', name: 'openModule' },
                { selector: 'div[onclick*="loadModule"]', name: 'loadModule' }
            ];

            for (const { selector, name } of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    return {
                        found: true,
                        selector: name,
                        count: elements.length,
                        modules: Array.from(elements).slice(0, 10).map(el => {
                            const text = el.textContent.trim();
                            const lines = text.split('\n');
                            return {
                                name: lines[0] || text,
                                fullText: text,
                                onclick: el.getAttribute('onclick'),
                                id: el.id || null
                            };
                        })
                    };
                }
            }

            return { found: false, count: 0, modules: [] };
        });

        if (!modules.found) {
            await page.screenshot({ path: 'isi-no-modules.png' });
            console.log('   ❌ No se encontraron módulos. Screenshot: isi-no-modules.png');
            return;
        }

        console.log(`   ✅ Encontrados ${modules.count} módulos usando: ${modules.selector}\n`);

        // 4. Testear cada módulo
        const results = [];
        const modulesToTest = Math.min(modules.count, 5); // Probar máximo 5

        for (let i = 0; i < modulesToTest; i++) {
            const module = modules.modules[i];
            console.log(`📋 Probando módulo ${i + 1}/${modulesToTest}: ${module.name}`);

            // Hacer click en el módulo
            let clicked = false;

            if (module.onclick) {
                // Si tiene onclick, ejecutarlo
                clicked = await page.evaluate((onclickStr) => {
                    try {
                        // Buscar el elemento por su onclick
                        const el = document.querySelector(`[onclick="${onclickStr}"]`);
                        if (el) {
                            el.click();
                            return true;
                        }
                    } catch (e) {
                        console.error('Error clicking:', e);
                    }
                    return false;
                }, module.onclick);
            }

            if (!clicked && module.id) {
                // Intentar por ID
                clicked = await page.evaluate((id) => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.click();
                        return true;
                    }
                    return false;
                }, module.id);
            }

            if (!clicked) {
                // Intentar por texto
                clicked = await page.evaluate((text) => {
                    const elements = Array.from(document.querySelectorAll('div[onclick]'));
                    const el = elements.find(e => e.textContent.includes(text));
                    if (el) {
                        el.click();
                        return true;
                    }
                    return false;
                }, module.name);
            }

            if (!clicked) {
                console.log('   ⚠️ No se pudo hacer click');
                results.push({ name: module.name, status: '⚠️ No clickeable' });
                continue;
            }

            await page.waitForTimeout(3000);

            // Analizar resultado
            const moduleResult = await page.evaluate(() => {
                // Buscar errores conocidos
                const errorPatterns = [
                    'sin función de inicialización',
                    'Error al cargar',
                    'Error loading',
                    'undefined is not a function'
                ];

                let hasError = false;
                const bodyText = document.body.textContent;
                for (const pattern of errorPatterns) {
                    if (bodyText.includes(pattern)) {
                        hasError = true;
                        break;
                    }
                }

                // Ver si cargó contenido
                const mainContent = document.getElementById('mainContent');
                const hasContent = mainContent && mainContent.textContent.length > 200;

                // Ver si seguimos en el dashboard
                const stillInDashboard = document.querySelector('.module-grid')?.offsetParent !== null;

                return { hasError, hasContent, stillInDashboard };
            });

            let status = '❓ Desconocido';
            if (moduleResult.hasError) {
                status = '❌ Error';
            } else if (moduleResult.hasContent && !moduleResult.stillInDashboard) {
                status = '✅ Funciona';
            } else if (moduleResult.stillInDashboard) {
                status = '⚠️ No cargó';
            }

            results.push({ name: module.name, status });
            console.log(`   ${status}\n`);

            // Volver al dashboard
            await page.reload();
            await page.waitForTimeout(2000);

            // Si se necesita re-login
            const needsLogin = await page.evaluate(() => {
                return document.getElementById('loginContainer')?.offsetParent !== null;
            });

            if (needsLogin) {
                console.log('   📋 Re-autenticando con ISI...');
                // Repetir el proceso de login con ISI
                await page.evaluate(() => {
                    const select = document.getElementById('companySelect');
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].textContent.includes('ISI')) {
                            select.selectedIndex = i;
                            const event = new Event('change', { bubbles: true });
                            select.dispatchEvent(event);
                            break;
                        }
                    }
                });
                await page.waitForTimeout(1500);
                await page.fill('#userInput', config.username);
                await page.fill('#passwordInput', config.password);
                await page.click('#loginButton');
                await page.waitForTimeout(3000);
            }
        }

        // 5. Reporte final
        console.log('\n' + '='.repeat(80));
        console.log('📊 REPORTE FINAL - EMPRESA ISI');
        console.log('='.repeat(80) + '\n');

        const working = results.filter(r => r.status.includes('✅')).length;
        const errors = results.filter(r => r.status.includes('❌')).length;
        const warnings = results.filter(r => r.status.includes('⚠️')).length;

        console.log(`Total módulos testeados: ${results.length}`);
        console.log(`✅ Funcionando: ${working}`);
        console.log(`❌ Con errores: ${errors}`);
        console.log(`⚠️ Con warnings: ${warnings}\n`);

        console.log('Detalle por módulo:');
        console.log('-'.repeat(50));
        results.forEach(r => {
            console.log(`${r.status} ${r.name}`);
        });

        if (modules.count > modulesToTest) {
            console.log(`\n📝 Módulos no testeados (${modules.count - modulesToTest}):`);
            for (let i = modulesToTest; i < Math.min(modules.count, 10); i++) {
                console.log(`  - ${modules.modules[i].name}`);
            }
        }

    } catch (error) {
        console.error('\n❌ Error en test:', error.message);
        await page?.screenshot({ path: 'isi-error-test.png' });
    } finally {
        if (browser) {
            await browser.close();
            console.log('\n✅ Navegador cerrado');
        }
    }
}

// Ejecutar
testAllModulesISI().catch(console.error);