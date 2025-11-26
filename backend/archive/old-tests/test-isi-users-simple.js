/**
 * TEST SIMPLE - ISI + Módulo Usuarios
 * Verifica que se puede abrir el modal y llenar datos
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function testISIUsers() {
    console.log('\n🎯 TEST ISI + MÓDULO USUARIOS\n');

    let browser, page;

    try {
        // 1. Iniciar navegador VISIBLE con movimientos lentos
        browser = await chromium.launch({
            headless: false,
            slowMo: 300 // Lento para ver cada acción
        });

        const context = await browser.newContext({
            viewport: { width: 1366, height: 768 }
        });

        page = await context.newPage();

        // 2. Ir a panel-empresa
        console.log('1️⃣ Navegando a panel-empresa...');
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForLoadState('networkidle');
        console.log('   ✅ Página cargada\n');

        // 3. SELECCIONAR ISI CORRECTAMENTE
        console.log('2️⃣ Seleccionando empresa ISI...');

        // Buscar ISI específicamente por texto
        await page.evaluate(() => {
            const select = document.getElementById('companySelect');
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].textContent.includes('ISI')) {
                    select.selectedIndex = i;
                    console.log('✅ ISI encontrado en índice:', i);
                    const event = new Event('change', { bubbles: true });
                    select.dispatchEvent(event);
                    break;
                }
            }
        });

        await page.waitForTimeout(2000);
        console.log('   ✅ ISI seleccionado\n');

        // 4. Login con soporte
        console.log('3️⃣ Ingresando credenciales...');

        // Esperar que campos estén habilitados
        await page.waitForFunction(() => {
            const input = document.querySelector('#userInput');
            return input && !input.disabled;
        });

        await page.fill('#userInput', 'soporte');
        await page.fill('#passwordInput', 'admin123');
        console.log('   ✅ Credenciales ingresadas\n');

        // 5. Hacer login
        console.log('4️⃣ Haciendo login...');
        await page.click('#loginButton');
        await page.waitForTimeout(5000);

        // Verificar que login fue exitoso
        const loginHidden = await page.evaluate(() => {
            const loginContainer = document.getElementById('loginContainer');
            return loginContainer && loginContainer.style.display === 'none';
        });

        if (!loginHidden) {
            throw new Error('Login falló - el formulario sigue visible');
        }

        console.log('   ✅ Login exitoso\n');

        // 6. Buscar y abrir módulo de usuarios
        console.log('5️⃣ Buscando módulo de usuarios...');

        // Buscar el módulo de usuarios entre los módulos disponibles
        const userModuleFound = await page.evaluate(() => {
            // Buscar por texto "Usuarios" o "users"
            const modules = document.querySelectorAll('.module-card, [onclick*="Module"], [onclick*="users"]');
            for (const mod of modules) {
                const text = mod.textContent.toLowerCase();
                if (text.includes('usuario') || text.includes('user') || text.includes('gestión de usuarios')) {
                    console.log('✅ Módulo encontrado:', mod.textContent);
                    mod.click();
                    return true;
                }
            }

            // Si no se encuentra, intentar con showModuleContent
            if (typeof window.showModuleContent === 'function') {
                console.log('📦 Usando showModuleContent directamente');
                window.showModuleContent('users', 'Gestión de Usuarios');
                return true;
            }

            return false;
        });

        if (!userModuleFound) {
            throw new Error('No se pudo encontrar/abrir el módulo de usuarios');
        }

        await page.waitForTimeout(3000);
        console.log('   ✅ Módulo de usuarios abierto\n');

        // 7. Click en "Agregar Usuario"
        console.log('6️⃣ Haciendo click en "Agregar Usuario"...');

        // Buscar el botón de agregar usuario
        const addButtonClicked = await page.evaluate(() => {
            // Buscar por onclick
            const button1 = document.querySelector('button[onclick="showAddUser()"]');
            if (button1) {
                button1.click();
                return 'onclick';
            }

            // Buscar por texto
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                if (btn.textContent.includes('Agregar Usuario') || btn.textContent.includes('➕')) {
                    btn.click();
                    return 'texto';
                }
            }

            return false;
        });

        if (!addButtonClicked) {
            throw new Error('No se encontró el botón "Agregar Usuario"');
        }

        console.log(`   ✅ Botón clickeado (método: ${addButtonClicked})\n`);
        await page.waitForTimeout(2000);

        // 8. Verificar qué modal se abrió
        console.log('7️⃣ Verificando modal abierto...');

        const modalInfo = await page.evaluate(() => {
            const userModal = document.getElementById('userModal');
            const allModals = document.querySelectorAll('[id*="modal"], [id*="Modal"], .modal');
            const visibleModals = [];

            for (const modal of allModals) {
                if (modal.offsetParent !== null) {
                    const title = modal.querySelector('h2, h3, h4')?.textContent || 'Sin título';
                    visibleModals.push({
                        id: modal.id,
                        title: title,
                        hasNameField: !!modal.querySelector('#newUserName'),
                        hasEmailField: !!modal.querySelector('#newUserEmail'),
                        hasLegajoField: !!modal.querySelector('#newUserLegajo')
                    });
                }
            }

            return {
                userModalExists: !!userModal,
                userModalVisible: userModal?.offsetParent !== null,
                visibleModals: visibleModals
            };
        });

        console.log('   📊 Información del modal:');
        console.log('      • userModal existe:', modalInfo.userModalExists);
        console.log('      • userModal visible:', modalInfo.userModalVisible);
        console.log('      • Modales visibles:', modalInfo.visibleModals.length);

        if (modalInfo.visibleModals.length > 0) {
            modalInfo.visibleModals.forEach(m => {
                console.log(`      • Modal: ${m.id} - "${m.title}"`);
                console.log(`        - Tiene campo nombre: ${m.hasNameField}`);
                console.log(`        - Tiene campo email: ${m.hasEmailField}`);
                console.log(`        - Tiene campo legajo: ${m.hasLegajoField}`);
            });
        }
        console.log('');

        // 9. Si el modal correcto está abierto, llenar datos
        if (modalInfo.userModalVisible) {
            console.log('8️⃣ Llenando formulario de usuario...');

            // Llenar campos lentamente para ver que funciona
            console.log('   📝 Escribiendo nombre...');
            await page.fill('#newUserName', 'Usuario Test ISI');
            await page.waitForTimeout(1000);

            console.log('   📝 Escribiendo email...');
            await page.fill('#newUserEmail', 'test.isi@example.com');
            await page.waitForTimeout(1000);

            console.log('   📝 Escribiendo legajo...');
            await page.fill('#newUserLegajo', 'ISI-TEST-001');
            await page.waitForTimeout(1000);

            console.log('   📝 Seleccionando rol...');
            await page.selectOption('#newUserRole', 'employee');
            await page.waitForTimeout(1000);

            // Verificar valores
            const formValues = await page.evaluate(() => {
                return {
                    name: document.getElementById('newUserName')?.value,
                    email: document.getElementById('newUserEmail')?.value,
                    legajo: document.getElementById('newUserLegajo')?.value,
                    role: document.getElementById('newUserRole')?.value
                };
            });

            console.log('\n   ✅ Formulario llenado:');
            console.log('      • Nombre:', formValues.name);
            console.log('      • Email:', formValues.email);
            console.log('      • Legajo:', formValues.legajo);
            console.log('      • Rol:', formValues.role);

        } else {
            console.log('⚠️ El modal de usuario NO está visible');
            console.log('   Tomando screenshot para análisis...');
            await page.screenshot({ path: 'isi-modal-not-visible.png', fullPage: true });
        }

        console.log('\n✅ TEST COMPLETADO EXITOSAMENTE');
        console.log('   El navegador permanecerá abierto 10 segundos...');
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        if (page) {
            await page.screenshot({ path: 'isi-test-error.png', fullPage: true });
            console.log('📸 Screenshot guardado: isi-test-error.png');
        }
    } finally {
        if (browser) {
            await browser.close();
            console.log('\n🔒 Navegador cerrado');
        }
    }
}

// Ejecutar
testISIUsers().catch(console.error);