/**
 * TEST DEBUG - Modal de Usuario
 * Para entender por qué no se cargan los datos
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function testUserModal() {
    console.log('\n🔍 TEST DEBUG - Modal de Usuario\n');

    let browser, page;

    try {
        // 1. Iniciar navegador VISIBLE
        browser = await chromium.launch({
            headless: false,
            slowMo: 500 // MUY LENTO para ver qué pasa
        });

        const context = await browser.newContext({
            viewport: { width: 1366, height: 768 }
        });

        page = await context.newPage();

        // Capturar errores
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('❌ ERROR:', msg.text());
            } else {
                console.log('📝 LOG:', msg.text());
            }
        });

        // 2. Login rápido con ISI
        console.log('1️⃣ Login con ISI...');
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForLoadState('networkidle');

        // Seleccionar ISI
        await page.selectOption('#companySelect', { index: 1 });
        await page.waitForTimeout(1500);

        // Credenciales
        await page.fill('#userInput', 'soporte');
        await page.fill('#passwordInput', 'admin123');
        await page.click('#loginButton');
        await page.waitForTimeout(3000);

        console.log('   ✅ Login exitoso\n');

        // 3. Abrir módulo de usuarios
        console.log('2️⃣ Abriendo módulo de usuarios...');
        await page.evaluate(() => {
            window.showModuleContent('users', 'Gestión de Usuarios');
        });
        await page.waitForSelector('#users', { state: 'visible' });
        console.log('   ✅ Módulo cargado\n');

        // 4. Click en "Agregar Usuario"
        console.log('3️⃣ Haciendo click en "Agregar Usuario"...');
        await page.click('button[onclick="showAddUser()"]');
        await page.waitForTimeout(2000);

        // 5. Verificar qué modal se abrió
        console.log('4️⃣ Verificando modal abierto...');

        const modalInfo = await page.evaluate(() => {
            // Buscar todos los modales visibles
            const modals = Array.from(document.querySelectorAll('[id*="modal"], [id*="Modal"], .modal'));
            const visibleModals = modals.filter(m => {
                const style = window.getComputedStyle(m);
                return style.display !== 'none' && m.offsetParent !== null;
            });

            return {
                totalModals: modals.length,
                visibleModals: visibleModals.length,
                modalIds: visibleModals.map(m => m.id || 'sin-id'),
                modalTitles: visibleModals.map(m => {
                    const h3 = m.querySelector('h3');
                    const h2 = m.querySelector('h2');
                    return h3?.textContent || h2?.textContent || 'sin-título';
                }),
                userModalExists: document.getElementById('userModal') !== null,
                userModalVisible: document.getElementById('userModal')?.offsetParent !== null,
                newUserNameExists: document.getElementById('newUserName') !== null,
                newUserNameVisible: document.getElementById('newUserName')?.offsetParent !== null
            };
        });

        console.log('   📊 Estado de modales:');
        console.log('      • Modales totales:', modalInfo.totalModals);
        console.log('      • Modales visibles:', modalInfo.visibleModals);
        console.log('      • IDs:', modalInfo.modalIds);
        console.log('      • Títulos:', modalInfo.modalTitles);
        console.log('      • userModal existe:', modalInfo.userModalExists);
        console.log('      • userModal visible:', modalInfo.userModalVisible);
        console.log('      • Campo newUserName existe:', modalInfo.newUserNameExists);
        console.log('      • Campo newUserName visible:', modalInfo.newUserNameVisible);

        // 6. Si el modal correcto está visible, intentar llenar campos
        if (modalInfo.userModalVisible && modalInfo.newUserNameExists) {
            console.log('\n5️⃣ Intentando llenar campos del formulario...');

            // Intentar con fill directo
            console.log('   📝 Llenando nombre...');
            await page.fill('#newUserName', 'Test Usuario Debug');
            await page.waitForTimeout(1000);

            console.log('   📝 Llenando email...');
            await page.fill('#newUserEmail', 'test@debug.com');
            await page.waitForTimeout(1000);

            console.log('   📝 Llenando legajo...');
            await page.fill('#newUserLegajo', 'TEST123');
            await page.waitForTimeout(1000);

            // Verificar valores
            const values = await page.evaluate(() => {
                return {
                    name: document.getElementById('newUserName').value,
                    email: document.getElementById('newUserEmail').value,
                    legajo: document.getElementById('newUserLegajo').value
                };
            });

            console.log('\n   📊 Valores en los campos:');
            console.log('      • Nombre:', values.name);
            console.log('      • Email:', values.email);
            console.log('      • Legajo:', values.legajo);

        } else {
            console.log('\n⚠️ El modal correcto NO está visible');
            console.log('   Tomando screenshot para análisis...');
            await page.screenshot({ path: 'debug-modal-issue.png', fullPage: true });
            console.log('   📸 Screenshot: debug-modal-issue.png');
        }

        console.log('\n✅ Test completado. Manteniendo navegador abierto...');
        console.log('   Presiona ENTER para cerrar...');

        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (page) {
            await page.screenshot({ path: 'debug-error.png', fullPage: true });
            console.log('📸 Screenshot de error: debug-error.png');
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Ejecutar
testUserModal().catch(console.error);