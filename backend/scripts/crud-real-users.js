/**
 * CRUD REAL - Módulo Users
 * Navegación desde frontend + verificación en PostgreSQL
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
    console.log('CRUD REAL - MODULO USERS - CON VERIFICACION BD');
    console.log('='.repeat(70));
    console.log('Email de prueba:', TEST_EMAIL);
    console.log('Nombre:', TEST_NAME);
    console.log('Legajo:', TEST_LEGAJO);
    console.log('');

    // PASO 1: Estado inicial
    console.log('PASO 1: ESTADO INICIAL DE LA BD');
    console.log('-'.repeat(70));
    const countBefore = await countUsersInDB();
    console.log('Total usuarios ISI ANTES:', countBefore);
    console.log('');

    // PASO 2: Navegación frontend
    console.log('PASO 2: NAVEGACION FRONTEND');
    console.log('-'.repeat(70));

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Capturar errores y responses
    const jsErrors = [];
    const apiResponses = [];
    page.on('pageerror', err => jsErrors.push(err.message));
    page.on('response', response => {
        if (response.url().includes('/api/') && response.status() >= 400) {
            apiResponses.push({ url: response.url(), status: response.status() });
        }
    });

    try {
        // Login
        console.log('  [2.1] Navegando a panel-empresa.html...');
        await page.goto('http://localhost:9998/panel-empresa.html');

        console.log('  [2.2] Login como admin ISI...');
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
        console.log('  [2.3] Login OK');

        // Navegar a Users
        console.log('  [2.4] Click en "Gestión de Usuarios"...');
        await page.click('text=Gestión de Usuarios');
        await page.waitForTimeout(4000);
        await page.screenshot({ path: 'debug-crud-users-1-module.png' });

        // PASO 3: CREATE
        console.log('');
        console.log('PASO 3: CREATE - Llenar formulario y guardar');
        console.log('-'.repeat(70));

        // Click en Agregar Usuario
        console.log('  [3.1] Buscando boton "Agregar Usuario"...');
        const addBtn = await page.$('button:has-text("Agregar"), button:has-text("Nuevo Usuario"), [onclick*="add"], [onclick*="create"]');
        if (addBtn) {
            await addBtn.click();
            console.log('       Click OK');
        } else {
            // Buscar cualquier botón que abra el modal
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const addBtn = btns.find(b => b.textContent.includes('Agregar') || b.textContent.includes('Nuevo'));
                if (addBtn) addBtn.click();
            });
            console.log('       Click via evaluate');
        }
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'debug-crud-users-2-modal.png' });

        // Llenar formulario usando evaluate para acceso directo al DOM
        console.log('  [3.2] Llenando campos del formulario...');

        const fillResult = await page.evaluate((data) => {
            const results = [];

            // Buscar todos los inputs visibles
            const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
            const visibleInputs = inputs.filter(i => i.offsetParent !== null);

            results.push(`Inputs visibles: ${visibleInputs.length}`);

            // Llenar por placeholder o label
            visibleInputs.forEach((input, idx) => {
                const placeholder = input.placeholder || '';
                const label = input.closest('div')?.querySelector('label')?.textContent || '';

                // Nombre completo
                if (placeholder.includes('Juan') || label.includes('Nombre')) {
                    input.value = data.name;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    results.push(`Campo ${idx} (Nombre): ${data.name}`);
                }
                // Email
                else if (placeholder.includes('@') || input.type === 'email' || label.includes('Email')) {
                    input.value = data.email;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    results.push(`Campo ${idx} (Email): ${data.email}`);
                }
                // Legajo
                else if (placeholder.includes('EMP') || label.includes('Legajo') || label.includes('ID')) {
                    input.value = data.legajo;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    results.push(`Campo ${idx} (Legajo): ${data.legajo}`);
                }
                // Password
                else if (input.type === 'password') {
                    input.value = 'Test123!';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    results.push(`Campo ${idx} (Password): ***`);
                }
            });

            // Seleccionar departamento si hay select
            const selects = Array.from(document.querySelectorAll('select'));
            selects.forEach((select, idx) => {
                if (select.options.length > 1) {
                    select.selectedIndex = 1; // Seleccionar primera opción real
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    results.push(`Select ${idx}: opción 1 seleccionada`);
                }
            });

            return results;
        }, { name: TEST_NAME, email: TEST_EMAIL, legajo: TEST_LEGAJO });

        fillResult.forEach(r => console.log('       ' + r));

        await page.screenshot({ path: 'debug-crud-users-3-filled.png' });
        console.log('  [3.3] Screenshot: debug-crud-users-3-filled.png');

        // Hacer scroll para que el botón Guardar sea visible
        console.log('  [3.4] Haciendo scroll al boton Guardar...');
        await page.evaluate(() => {
            // Buscar el botón Guardar y hacer scroll hacia él
            const buttons = Array.from(document.querySelectorAll('button'));
            const saveBtn = buttons.find(b => b.textContent.includes('Guardar'));
            if (saveBtn) {
                saveBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
            }
        });
        await page.waitForTimeout(500);

        await page.screenshot({ path: 'debug-crud-users-3b-scrolled.png' });
        console.log('       Screenshot con scroll: debug-crud-users-3b-scrolled.png');

        // Ahora hacer click en el botón Guardar
        console.log('  [3.5] Click en boton "Guardar"...');
        const clicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const saveBtn = buttons.find(b => b.textContent.includes('Guardar'));
            if (saveBtn) {
                saveBtn.click();
                return { success: true, text: saveBtn.textContent.trim() };
            }
            return { success: false };
        });

        if (clicked.success) {
            console.log('       Click en:', clicked.text);
        } else {
            console.log('       NO encontrado boton de guardar');
        }

        // Esperar respuesta del servidor
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'debug-crud-users-4-after-save.png' });
        console.log('  [3.5] Screenshot post-save: debug-crud-users-4-after-save.png');

        // PASO 4: Verificación en BD
        console.log('');
        console.log('PASO 4: VERIFICACION EN BASE DE DATOS');
        console.log('-'.repeat(70));

        // Esperar un poco más para que la BD se actualice
        await page.waitForTimeout(2000);

        const countAfter = await countUsersInDB();
        console.log('Total usuarios ISI DESPUES:', countAfter);
        console.log('Diferencia:', countAfter - countBefore);

        const userInDB = await checkUserInDB(TEST_EMAIL);

        console.log('');
        if (userInDB) {
            console.log('*'.repeat(70));
            console.log('*** RESULTADO: CREATE EXITOSO - PERSISTIO EN BD ***');
            console.log('*'.repeat(70));
            console.log('');
            console.log('Usuario encontrado en PostgreSQL:');
            console.log('  user_id:', userInDB.user_id);
            console.log('  firstName:', userInDB.firstName);
            console.log('  lastName:', userInDB.lastName);
            console.log('  email:', userInDB.email);
            console.log('  createdAt:', userInDB.createdAt);
        } else {
            console.log('*'.repeat(70));
            console.log('*** RESULTADO: CREATE FALLIDO - NO PERSISTIO EN BD ***');
            console.log('*'.repeat(70));
            console.log('');
            console.log('El usuario NO existe en la base de datos.');
            console.log('');
            console.log('Errores API detectados:');
            if (apiResponses.length > 0) {
                apiResponses.forEach(r => console.log('  -', r.status, r.url.substring(0, 60)));
            } else {
                console.log('  (ninguno capturado)');
            }
            console.log('');
            console.log('Errores JavaScript:');
            if (jsErrors.length > 0) {
                jsErrors.slice(0, 5).forEach(e => console.log('  -', e.substring(0, 80)));
            } else {
                console.log('  (ninguno)');
            }
        }

    } catch (error) {
        console.log('');
        console.log('*** ERROR DURANTE EL TEST ***');
        console.log(error.message);
    }

    await browser.close();
    await sequelize.close();

    console.log('');
    console.log('='.repeat(70));
    console.log('FIN DEL TEST CRUD USERS');
    console.log('='.repeat(70));
})();
