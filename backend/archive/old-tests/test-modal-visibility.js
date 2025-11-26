/**
 * TEST VISIBILIDAD MODAL
 * Verifica por qué el modal no se muestra
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function testModalVisibility() {
    console.log('\n🔍 TEST VISIBILIDAD DEL MODAL\n');

    let browser, page;

    try {
        browser = await chromium.launch({
            headless: false,
            slowMo: 200
        });

        const context = await browser.newContext({
            viewport: { width: 1366, height: 768 }
        });

        page = await context.newPage();

        // Login rápido con ISI
        console.log('1️⃣ Login rápido con ISI...');
        await page.goto('http://localhost:9998/panel-empresa.html');

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
        await page.fill('#userInput', 'soporte');
        await page.fill('#passwordInput', 'admin123');
        await page.click('#loginButton');
        await page.waitForTimeout(3000);
        console.log('   ✅ Login exitoso\n');

        // Abrir módulo usuarios
        console.log('2️⃣ Abriendo módulo usuarios...');
        await page.evaluate(() => {
            window.showModuleContent('users', 'Gestión de Usuarios');
        });
        await page.waitForTimeout(3000);
        console.log('   ✅ Módulo abierto\n');

        // Ejecutar showAddUser() directamente y verificar
        console.log('3️⃣ Ejecutando showAddUser() directamente...');

        const modalCreated = await page.evaluate(() => {
            // Primero eliminar cualquier modal existente
            const existingModal = document.getElementById('userModal');
            if (existingModal) {
                existingModal.remove();
                console.log('Modal existente eliminado');
            }

            // Verificar que la función existe
            if (typeof showAddUser !== 'function') {
                return { error: 'Función showAddUser no existe' };
            }

            // Ejecutar la función
            showAddUser();

            // Esperar un momento para que se cree
            return new Promise(resolve => {
                setTimeout(() => {
                    const modal = document.getElementById('userModal');
                    if (!modal) {
                        resolve({ error: 'Modal no creado' });
                        return;
                    }

                    // Analizar el modal
                    const computed = window.getComputedStyle(modal);
                    const modalContent = modal.querySelector('div');
                    const contentComputed = modalContent ? window.getComputedStyle(modalContent) : null;

                    resolve({
                        exists: true,
                        display: computed.display,
                        visibility: computed.visibility,
                        opacity: computed.opacity,
                        position: computed.position,
                        zIndex: computed.zIndex,
                        width: computed.width,
                        height: computed.height,
                        background: computed.background.substring(0, 50),
                        hasContent: !!modalContent,
                        contentDisplay: contentComputed?.display,
                        hasNameField: !!document.getElementById('newUserName'),
                        offsetParent: modal.offsetParent !== null,
                        clientHeight: modal.clientHeight,
                        scrollHeight: modal.scrollHeight
                    });
                }, 500);
            });
        });

        console.log('\n   📊 Estado del modal:');
        if (modalCreated.error) {
            console.log('   ❌ Error:', modalCreated.error);
        } else {
            console.log('   • Existe:', modalCreated.exists);
            console.log('   • Display:', modalCreated.display);
            console.log('   • Visibility:', modalCreated.visibility);
            console.log('   • Opacity:', modalCreated.opacity);
            console.log('   • Position:', modalCreated.position);
            console.log('   • Z-Index:', modalCreated.zIndex);
            console.log('   • Width:', modalCreated.width);
            console.log('   • Height:', modalCreated.height);
            console.log('   • Background:', modalCreated.background);
            console.log('   • Tiene contenido:', modalCreated.hasContent);
            console.log('   • Display del contenido:', modalCreated.contentDisplay);
            console.log('   • Campo nombre existe:', modalCreated.hasNameField);
            console.log('   • OffsetParent !== null:', modalCreated.offsetParent);
            console.log('   • ClientHeight:', modalCreated.clientHeight);
            console.log('   • ScrollHeight:', modalCreated.scrollHeight);
        }

        // Si el modal existe pero no es visible, intentar hacerlo visible
        if (modalCreated.exists && !modalCreated.offsetParent) {
            console.log('\n4️⃣ Modal existe pero no es visible. Forzando visibilidad...');

            await page.evaluate(() => {
                const modal = document.getElementById('userModal');
                if (modal) {
                    // Forzar estilos de visibilidad
                    modal.style.display = 'flex';
                    modal.style.visibility = 'visible';
                    modal.style.opacity = '1';

                    // Asegurar que esté en el frente
                    modal.style.zIndex = '99999';

                    console.log('Estilos forzados aplicados');
                }
            });

            await page.waitForTimeout(1000);

            // Verificar de nuevo
            const afterForce = await page.evaluate(() => {
                const modal = document.getElementById('userModal');
                return {
                    visible: modal?.offsetParent !== null,
                    display: modal ? window.getComputedStyle(modal).display : 'no modal'
                };
            });

            console.log('\n   📊 Después de forzar visibilidad:');
            console.log('   • Visible:', afterForce.visible);
            console.log('   • Display:', afterForce.display);
        }

        // Intentar llenar campos si el modal está visible
        const modalVisible = await page.evaluate(() => {
            return document.getElementById('userModal')?.offsetParent !== null;
        });

        if (modalVisible) {
            console.log('\n5️⃣ Modal visible! Intentando llenar campos...');

            await page.fill('#newUserName', 'Test Usuario Modal');
            await page.waitForTimeout(500);

            await page.fill('#newUserEmail', 'modal@test.com');
            await page.waitForTimeout(500);

            await page.fill('#newUserLegajo', 'MODAL-001');
            await page.waitForTimeout(500);

            const values = await page.evaluate(() => {
                return {
                    name: document.getElementById('newUserName')?.value,
                    email: document.getElementById('newUserEmail')?.value,
                    legajo: document.getElementById('newUserLegajo')?.value
                };
            });

            console.log('\n   ✅ Campos llenados:');
            console.log('   • Nombre:', values.name);
            console.log('   • Email:', values.email);
            console.log('   • Legajo:', values.legajo);

        } else {
            console.log('\n⚠️ Modal sigue sin ser visible');
            await page.screenshot({ path: 'modal-not-visible.png', fullPage: true });
            console.log('📸 Screenshot: modal-not-visible.png');
        }

        console.log('\n✅ Test completado. Navegador abierto 5 segundos más...');
        await page.waitForTimeout(5000);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (page) {
            await page.screenshot({ path: 'modal-error.png' });
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testModalVisibility().catch(console.error);