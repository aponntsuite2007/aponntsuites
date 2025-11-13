/**
 * TEST DEBUG - Solo CREATE del módulo users
 * Para detectar exactamente qué está fallando
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function testUserCreate() {
    console.log('🧪 TEST DEBUG - USER CREATE\n');

    let browser, page;

    try {
        // 1. Abrir navegador
        browser = await chromium.launch({
            headless: false,
            slowMo: 200
        });

        page = await browser.newPage();

        // 2. Login
        console.log('📍 Login...');
        await page.goto('http://localhost:9998/panel-empresa.html');

        // Empresa
        await page.waitForSelector('#companySelect', { timeout: 10000 });
        await page.selectOption('#companySelect', 'isi');
        await page.waitForTimeout(5000);

        // Usuario
        await page.fill('input[type="text"]:visible', 'soporte');
        await page.press('input[type="text"]:visible', 'Enter');
        await page.waitForTimeout(3000);

        // Password
        await page.fill('input[type="password"]:visible', 'admin123');
        await page.press('input[type="password"]:visible', 'Enter');
        await page.waitForTimeout(3000);

        console.log('✅ Login completado\n');

        // 3. Navegar a Users
        console.log('📍 Navegando a módulo Users...');
        await page.click('button[onclick*="loadModule(\'users\')"]');
        await page.waitForSelector('#users', { timeout: 10000 });
        console.log('✅ Módulo Users cargado\n');

        // 4. Abrir modal de Agregar Usuario
        console.log('📍 Abriendo modal Agregar Usuario...');
        await page.click('button[onclick="showAddUser()"]');
        await page.waitForSelector('#user-modal', { visible: true, timeout: 10000 });
        console.log('✅ Modal abierto\n');

        // 5. Capturar screenshot
        await page.screenshot({ path: 'backend/debug-modal-users.png', fullPage: true });
        console.log('📸 Screenshot guardado: debug-modal-users.png\n');

        // 6. Verificar selectores
        console.log('📍 Verificando selectores...');
        const selectors = ['#user-dni', '#user-name', '#user-email', '#user-role', '#btn-save-user'];

        for (const selector of selectors) {
            const exists = await page.locator(selector).count() > 0;
            const visible = exists ? await page.locator(selector).isVisible() : false;
            console.log(`   ${exists && visible ? '✅' : '❌'} ${selector} - Exists: ${exists}, Visible: ${visible}`);
        }

        // 7. Intentar llenar formulario
        console.log('\n📍 Llenando formulario...');
        const testDNI = `${Math.floor(Math.random() * 90000000) + 10000000}`;
        const testName = `TEST Usuario ${testDNI}`;
        const testEmail = `test${testDNI}@test.com`;

        await page.fill('#user-dni', testDNI);
        console.log(`   ✅ DNI: ${testDNI}`);

        await page.fill('#user-name', testName);
        console.log(`   ✅ Name: ${testName}`);

        await page.fill('#user-email', testEmail);
        console.log(`   ✅ Email: ${testEmail}`);

        await page.selectOption('#user-role', 'operator');
        console.log(`   ✅ Role: operator`);

        // 8. Guardar
        console.log('\n📍 Guardando usuario...');
        await page.click('#btn-save-user');
        await page.waitForTimeout(3000);

        // 9. Verificar si modal se cerró
        const modalVisible = await page.locator('#user-modal').isVisible();
        console.log(`   ${modalVisible ? '❌' : '✅'} Modal cerrado: ${!modalVisible}\n`);

        console.log('✅ TEST COMPLETADO - Navegador permanecerá abierto');
        console.log('   Presiona Ctrl+C para cerrar\n');

        // Mantener abierto
        await new Promise(() => {});

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.error('Stack:', error.stack);

        if (page) {
            await page.screenshot({ path: 'backend/debug-error.png', fullPage: true });
            console.log('📸 Screenshot de error guardado: debug-error.png');
        }
    }
}

testUserCreate();
