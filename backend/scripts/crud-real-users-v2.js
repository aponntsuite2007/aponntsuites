/**
 * CRUD REAL - Módulo Users v2
 * Con manejo correcto del drawer/panel lateral
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const TEST_EMAIL = `crud-test-${Date.now()}@prueba.com`;
const TEST_NAME = 'CRUD_Test Verificacion_BD';
const TEST_LEGAJO = 'EMP-TEST-' + Date.now().toString().slice(-6);

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

async function checkUserInDB(email) {
    const [results] = await sequelize.query(
        `SELECT user_id, "firstName", "lastName", email, "createdAt" FROM users WHERE email = '${email}'`
    );
    return results.length > 0 ? results[0] : null;
}

async function countUsersInDB() {
    const [results] = await sequelize.query(
        `SELECT COUNT(*) as total FROM users WHERE company_id = 11`
    );
    return parseInt(results[0].total);
}

(async () => {
    console.log('='.repeat(70));
    console.log('CRUD REAL - MODULO USERS v2 - CON VERIFICACION BD');
    console.log('='.repeat(70));
    console.log('Email de prueba:', TEST_EMAIL);
    console.log('');

    const countBefore = await countUsersInDB();
    console.log('Total usuarios ANTES:', countBefore);
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const apiErrors = [];
    page.on('response', response => {
        if (response.url().includes('/api/') && response.status() >= 400) {
            apiErrors.push({ status: response.status(), url: response.url() });
        }
    });

    try {
        // Login
        console.log('[1] Login...');
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForSelector('#companySelect', { timeout: 15000 });
        await page.selectOption('#companySelect', 'isi');
        await page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
        await page.fill('#userInput', 'admin');
        await page.fill('#passwordInput', 'admin123');
        await page.evaluate(() => {
            document.getElementById('loginButton').disabled = false;
            document.getElementById('loginButton').click();
        });
        await page.waitForTimeout(5000);
        console.log('    OK');

        // Navegar a Users
        console.log('[2] Navegar a Gestión de Usuarios...');
        await page.click('text=Gestión de Usuarios');
        await page.waitForTimeout(4000);
        console.log('    OK');

        // Abrir modal de crear
        console.log('[3] Click en Agregar Usuario...');
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Agregar'));
            if (btn) btn.click();
        });
        await page.waitForTimeout(2000);
        console.log('    OK');

        // Screenshot fullpage
        await page.screenshot({ path: 'debug-v2-1-modal-open.png', fullPage: true });

        // Llenar formulario
        console.log('[4] Llenando formulario...');
        const fillResult = await page.evaluate((data) => {
            const results = [];
            const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));

            inputs.forEach((input, idx) => {
                const placeholder = input.placeholder || '';

                if (placeholder.includes('Juan')) {
                    input.value = data.name;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    results.push('Nombre: ' + data.name);
                }
                else if (placeholder.includes('@') || input.type === 'email') {
                    input.value = data.email;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    results.push('Email: ' + data.email);
                }
                else if (placeholder.includes('EMP')) {
                    input.value = data.legajo;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    results.push('Legajo: ' + data.legajo);
                }
                else if (input.type === 'password' && input.offsetParent !== null) {
                    input.value = 'Test123!';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    results.push('Password: ***');
                }
            });

            // Seleccionar departamento (primer select con opciones)
            const selects = Array.from(document.querySelectorAll('select'));
            selects.forEach(select => {
                if (select.options.length > 1 && select.offsetParent !== null) {
                    select.selectedIndex = 1;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            return results;
        }, { name: TEST_NAME, email: TEST_EMAIL, legajo: TEST_LEGAJO });

        fillResult.forEach(r => console.log('    ' + r));

        // Screenshot después de llenar
        await page.screenshot({ path: 'debug-v2-2-filled.png', fullPage: true });

        // CLAVE: Scroll dentro del contenedor del drawer y click en Guardar
        console.log('[5] Scroll y click en Guardar...');

        const clickResult = await page.evaluate(() => {
            // Buscar TODOS los botones
            const allButtons = Array.from(document.querySelectorAll('button'));

            // Encontrar el botón Guardar
            const saveBtn = allButtons.find(b => b.textContent.includes('Guardar'));

            if (!saveBtn) {
                return { success: false, error: 'Botón Guardar no encontrado', buttons: allButtons.map(b => b.textContent.substring(0,20)) };
            }

            // Encontrar el contenedor scrolleable del drawer
            let scrollContainer = saveBtn.closest('[style*="overflow"]') ||
                                 saveBtn.closest('.drawer') ||
                                 saveBtn.closest('.panel') ||
                                 saveBtn.closest('.sidebar') ||
                                 saveBtn.parentElement?.parentElement;

            // Hacer scroll hasta el botón
            saveBtn.scrollIntoView({ block: 'center', behavior: 'instant' });

            // Esperar un momento y hacer click
            return new Promise(resolve => {
                setTimeout(() => {
                    try {
                        saveBtn.click();
                        resolve({ success: true, text: saveBtn.textContent.trim() });
                    } catch (e) {
                        resolve({ success: false, error: e.message });
                    }
                }, 300);
            });
        });

        if (clickResult.success) {
            console.log('    Click en:', clickResult.text);
        } else {
            console.log('    ERROR:', clickResult.error);
            if (clickResult.buttons) {
                console.log('    Botones:', clickResult.buttons.slice(0, 10));
            }
        }

        // Esperar respuesta
        await page.waitForTimeout(4000);

        // Screenshot post-save
        await page.screenshot({ path: 'debug-v2-3-after-save.png', fullPage: true });

        // Verificar BD
        console.log('');
        console.log('[6] VERIFICACION EN BASE DE DATOS');
        console.log('-'.repeat(70));

        const countAfter = await countUsersInDB();
        console.log('Total usuarios DESPUES:', countAfter);
        console.log('Diferencia:', countAfter - countBefore);

        const userInDB = await checkUserInDB(TEST_EMAIL);

        console.log('');
        if (userInDB) {
            console.log('*'.repeat(70));
            console.log('*** CREATE EXITOSO - USUARIO PERSISTIDO EN BD ***');
            console.log('*'.repeat(70));
            console.log('');
            console.log('user_id:', userInDB.user_id);
            console.log('firstName:', userInDB.firstName);
            console.log('lastName:', userInDB.lastName);
            console.log('email:', userInDB.email);
            console.log('createdAt:', userInDB.createdAt);
        } else {
            console.log('*'.repeat(70));
            console.log('*** CREATE FALLIDO - USUARIO NO EXISTE EN BD ***');
            console.log('*'.repeat(70));

            if (apiErrors.length > 0) {
                console.log('');
                console.log('Errores API:');
                apiErrors.forEach(e => console.log('  -', e.status, e.url.substring(0, 60)));
            }
        }

    } catch (error) {
        console.log('ERROR:', error.message);
    }

    await browser.close();
    await sequelize.close();

    console.log('');
    console.log('='.repeat(70));
})();
