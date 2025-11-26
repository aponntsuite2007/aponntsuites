/**
 * TEST LOGIN CON CAPTURA DE CONSOLA
 * Captura todos los mensajes de consola y errores para debug
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function testLoginWithConsole() {
    console.log('\n🔍 TEST LOGIN CON DEBUG DE CONSOLA\n');

    let browser;
    let page;

    try {
        browser = await chromium.launch({
            headless: false,
            slowMo: 100
        });

        const context = await browser.newContext({
            viewport: { width: 1366, height: 768 }
        });

        page = await context.newPage();

        // Capturar todos los mensajes de consola
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (type === 'error') {
                console.log('❌ [CONSOLA ERROR]:', text);
            } else if (type === 'warning') {
                console.log('⚠️ [CONSOLA WARN]:', text);
            } else {
                console.log('📝 [CONSOLA]:', text);
            }
        });

        // Capturar errores de página
        page.on('pageerror', error => {
            console.log('💀 [ERROR PÁGINA]:', error);
        });

        // Capturar respuestas de red
        page.on('response', response => {
            if (response.url().includes('/api/v1/auth/login')) {
                console.log('🌐 [RESPUESTA LOGIN]:', {
                    status: response.status(),
                    statusText: response.statusText(),
                    url: response.url()
                });
            }
        });

        console.log('1. Navegando a panel-empresa...');
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForLoadState('networkidle');

        console.log('2. Verificando que handleLogin existe...');
        const hasHandleLogin = await page.evaluate(() => {
            return typeof handleLogin === 'function';
        });
        console.log('   handleLogin existe:', hasHandleLogin);

        console.log('3. Seleccionando empresa...');
        const companyInfo = await page.evaluate(() => {
            const select = document.getElementById('companySelect');
            if (select && select.options.length > 1) {
                select.selectedIndex = 1;
                const selectedOption = select.options[1];
                const companyId = selectedOption.dataset.companyId;

                // Disparar evento change
                const event = new Event('change', { bubbles: true });
                select.dispatchEvent(event);

                return {
                    text: selectedOption.textContent,
                    value: selectedOption.value,
                    companyId: companyId
                };
            }
            return null;
        });
        console.log('   Empresa seleccionada:', companyInfo);

        await page.waitForTimeout(1500);

        console.log('4. Esperando que campos estén habilitados...');
        await page.waitForFunction(
            () => {
                const input = document.querySelector('#userInput');
                return input && !input.disabled;
            },
            { timeout: 10000 }
        );

        console.log('5. Llenando formulario...');
        await page.fill('#userInput', 'soporte');
        await page.fill('#passwordInput', 'admin123');

        console.log('6. Verificando valores antes de enviar...');
        const formData = await page.evaluate(() => {
            return {
                company: document.getElementById('companySelect').selectedOptions[0]?.dataset.companyId,
                user: document.getElementById('userInput').value,
                password: document.getElementById('passwordInput').value ? '****' : '(vacío)'
            };
        });
        console.log('   Datos del formulario:', formData);

        console.log('7. Haciendo click en login...');

        // Primero intentar con click normal
        await page.click('#loginButton');

        console.log('8. Esperando respuesta (5 segundos)...');
        await page.waitForTimeout(5000);

        console.log('9. Verificando estado después del login...');
        const postLoginState = await page.evaluate(() => {
            const loginContainer = document.getElementById('loginContainer');
            const moduleGrid = document.querySelector('.module-grid');
            const modulesContainer = document.getElementById('modulesContainer');
            const mainContent = document.getElementById('mainContent');
            const errorMsg = document.querySelector('.error-message, .alert-danger, [id*="error"]');

            return {
                loginVisible: loginContainer && loginContainer.offsetParent !== null,
                loginDisplay: loginContainer ? loginContainer.style.display : 'no_element',
                moduleGridExists: moduleGrid !== null,
                moduleGridVisible: moduleGrid && moduleGrid.offsetParent !== null,
                modulesContainerExists: modulesContainer !== null,
                modulesContainerVisible: modulesContainer && modulesContainer.offsetParent !== null,
                mainContentHTML: mainContent ? mainContent.innerHTML.substring(0, 200) : 'no_content',
                errorMessage: errorMsg ? errorMsg.textContent : null,
                authToken: window.authToken || null,
                currentUser: window.currentUser || null
            };
        });

        console.log('\n📊 ESTADO POST-LOGIN:');
        console.log('   Login visible:', postLoginState.loginVisible);
        console.log('   Login display:', postLoginState.loginDisplay);
        console.log('   Module grid existe:', postLoginState.moduleGridExists);
        console.log('   Module grid visible:', postLoginState.moduleGridVisible);
        console.log('   Modules container existe:', postLoginState.modulesContainerExists);
        console.log('   Modules container visible:', postLoginState.modulesContainerVisible);
        console.log('   Error message:', postLoginState.errorMessage);
        console.log('   Auth token:', postLoginState.authToken ? 'Presente' : 'Ausente');
        console.log('   Current user:', postLoginState.currentUser ? 'Presente' : 'Ausente');

        if (postLoginState.loginVisible) {
            console.log('\n⚠️ LOGIN NO COMPLETADO - Intentando llamar handleLogin directamente...');

            // Intentar llamar handleLogin directamente
            const directLoginResult = await page.evaluate(async () => {
                try {
                    // Crear un evento fake
                    const fakeEvent = {
                        preventDefault: () => {},
                        stopPropagation: () => {}
                    };

                    if (typeof handleLogin === 'function') {
                        // Llamar handleLogin
                        await handleLogin(fakeEvent);
                        return 'called';
                    }
                    return 'no_function';
                } catch (error) {
                    return 'error: ' + error.message;
                }
            });

            console.log('   Resultado de handleLogin directo:', directLoginResult);

            await page.waitForTimeout(5000);

            // Verificar nuevamente
            const finalState = await page.evaluate(() => {
                return {
                    loginHidden: document.getElementById('loginContainer')?.style.display === 'none',
                    hasModules: document.querySelectorAll('.module-card, [onclick*="Module"]').length > 0
                };
            });

            console.log('\n📊 ESTADO FINAL:');
            console.log('   Login oculto:', finalState.loginHidden);
            console.log('   Tiene módulos:', finalState.hasModules);
        }

        // Tomar screenshot final
        await page.screenshot({ path: 'login-console-debug.png' });
        console.log('\n📸 Screenshot guardado: login-console-debug.png');

    } catch (error) {
        console.error('\n❌ ERROR FATAL:', error.message);
    } finally {
        console.log('\nPresiona ENTER para cerrar el navegador...');
        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });

        if (browser) {
            await browser.close();
            console.log('✅ Navegador cerrado');
        }
    }
}

// Ejecutar
testLoginWithConsole().catch(console.error);