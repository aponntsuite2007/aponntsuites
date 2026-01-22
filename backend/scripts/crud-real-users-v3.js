/**
 * CRUD REAL - Módulo Users v3
 * Con manejo correcto del botón Guardar/Save/Create
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
    console.log('CRUD REAL - MODULO USERS v3 - SELECTOR MEJORADO');
    console.log('='.repeat(70));
    console.log('Email de prueba:', TEST_EMAIL);
    console.log('');

    const countBefore = await countUsersInDB();
    console.log('Total usuarios ANTES:', countBefore);
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const apiErrors = [];
    const apiCalls = [];

    page.on('response', response => {
        const url = response.url();
        if (url.includes('/api/')) {
            apiCalls.push({ url: url.substring(0, 80), status: response.status() });
            if (response.status() >= 400) {
                apiErrors.push({ status: response.status(), url: url });
            }
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
            const btn = Array.from(document.querySelectorAll('button')).find(b =>
                b.textContent.includes('Agregar') || b.textContent.includes('Add')
            );
            if (btn) btn.click();
        });
        await page.waitForTimeout(2000);
        console.log('    OK');

        // Screenshot antes de llenar
        await page.screenshot({ path: 'debug-v3-1-modal-open.png', fullPage: true });

        // Llenar formulario
        console.log('[4] Llenando formulario...');
        const fillResult = await page.evaluate((data) => {
            const results = [];
            const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));

            inputs.forEach((input) => {
                const placeholder = input.placeholder || '';
                const isVisible = input.offsetParent !== null;

                if (!isVisible) return;

                if (placeholder.includes('Juan') || placeholder.includes('Pérez') || placeholder.toLowerCase().includes('name')) {
                    input.value = data.name;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    results.push('Nombre: ' + data.name);
                }
                else if (placeholder.includes('@') || input.type === 'email') {
                    input.value = data.email;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    results.push('Email: ' + data.email);
                }
                else if (placeholder.includes('EMP') || placeholder.toLowerCase().includes('legajo') || placeholder.toLowerCase().includes('id')) {
                    input.value = data.legajo;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    results.push('Legajo: ' + data.legajo);
                }
                else if (input.type === 'password') {
                    input.value = 'Test123!';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    results.push('Password: ***');
                }
            });

            // Seleccionar departamento
            const selects = Array.from(document.querySelectorAll('select'));
            selects.forEach(select => {
                if (select.options.length > 1 && select.offsetParent !== null) {
                    select.selectedIndex = 1;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    results.push('Select: opción 1');
                }
            });

            return results;
        }, { name: TEST_NAME, email: TEST_EMAIL, legajo: TEST_LEGAJO });

        fillResult.forEach(r => console.log('    ' + r));

        // Screenshot después de llenar
        await page.screenshot({ path: 'debug-v3-2-filled.png', fullPage: true });

        // CLAVE: Encontrar y clickear el botón de guardar usando múltiples selectores
        console.log('[5] Buscando botón de guardar...');

        // Primero, identificar todos los botones visibles en el modal/drawer
        const buttonInfo = await page.evaluate(() => {
            const allBtns = Array.from(document.querySelectorAll('button'));
            const visibleBtns = allBtns.filter(b => b.offsetParent !== null);

            return visibleBtns.map(b => ({
                text: b.textContent.trim().substring(0, 50),
                classes: b.className,
                rect: b.getBoundingClientRect(),
                hasSuccessClass: b.className.includes('success') || b.className.includes('primary'),
                hasGuardarIcon: b.textContent.includes('💾') || b.textContent.includes('✓') || b.textContent.includes('✔')
            }));
        });

        console.log('    Botones visibles:', buttonInfo.length);
        buttonInfo.forEach((b, i) => {
            if (b.hasSuccessClass || b.text.toLowerCase().includes('guard') || b.text.toLowerCase().includes('save') || b.text.toLowerCase().includes('crear') || b.text.toLowerCase().includes('create')) {
                console.log(`    [${i}] "${b.text}" classes="${b.classes.substring(0,40)}"`);
            }
        });

        // Click en el botón correcto
        const clickResult = await page.evaluate(() => {
            const allBtns = Array.from(document.querySelectorAll('button'));
            const visibleBtns = allBtns.filter(b => b.offsetParent !== null);

            // Buscar por múltiples criterios (priorizado)
            let saveBtn = null;

            // 1. Buscar botón con texto "Guardar" o "Save"
            saveBtn = visibleBtns.find(b => {
                const text = b.textContent.toLowerCase();
                return text.includes('guardar') || (text.includes('save') && !text.includes('saved'));
            });

            // 2. Si no, buscar botón con clase btn-success y texto relevante
            if (!saveBtn) {
                saveBtn = visibleBtns.find(b =>
                    b.className.includes('btn-success') &&
                    !b.textContent.toLowerCase().includes('cancel')
                );
            }

            // 3. Si no, buscar botón verde/success que NO sea cancelar
            if (!saveBtn) {
                saveBtn = visibleBtns.find(b => {
                    const text = b.textContent.toLowerCase();
                    const isAction = text.includes('crear') || text.includes('create') || text.includes('add') || text.includes('agregar');
                    return b.className.includes('success') && isAction;
                });
            }

            // 4. Buscar por ícono de guardar
            if (!saveBtn) {
                saveBtn = visibleBtns.find(b => b.textContent.includes('💾'));
            }

            if (!saveBtn) {
                return {
                    success: false,
                    error: 'No se encontró botón de guardar',
                    buttons: visibleBtns.map(b => ({ text: b.textContent.trim().substring(0,30), class: b.className.substring(0,30) }))
                };
            }

            // Scroll al botón
            saveBtn.scrollIntoView({ block: 'center', behavior: 'instant' });

            return new Promise(resolve => {
                setTimeout(() => {
                    try {
                        // Verificar que el botón siga visible
                        const rect = saveBtn.getBoundingClientRect();
                        if (rect.width === 0 || rect.height === 0) {
                            resolve({ success: false, error: 'Botón no visible después de scroll' });
                            return;
                        }

                        saveBtn.click();
                        resolve({
                            success: true,
                            text: saveBtn.textContent.trim(),
                            classes: saveBtn.className
                        });
                    } catch (e) {
                        resolve({ success: false, error: e.message });
                    }
                }, 500);
            });
        });

        if (clickResult.success) {
            console.log('    Click en:', clickResult.text);
            console.log('    Classes:', clickResult.classes);
        } else {
            console.log('    ERROR:', clickResult.error);
            if (clickResult.buttons) {
                console.log('    Botones disponibles:');
                clickResult.buttons.slice(0, 10).forEach(b => console.log(`      - "${b.text}" (${b.class})`));
            }
        }

        // Esperar respuesta
        await page.waitForTimeout(5000);

        // Screenshot post-save
        await page.screenshot({ path: 'debug-v3-3-after-save.png', fullPage: true });

        // Mostrar llamadas API recientes
        console.log('');
        console.log('[6] LLAMADAS API DETECTADAS');
        console.log('-'.repeat(70));
        const recentCalls = apiCalls.slice(-10);
        recentCalls.forEach(c => {
            const indicator = c.status >= 400 ? '❌' : '✓';
            console.log(`    ${indicator} ${c.status} ${c.url}`);
        });

        // Verificar BD
        console.log('');
        console.log('[7] VERIFICACION EN BASE DE DATOS');
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
        await page.screenshot({ path: 'debug-v3-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    console.log('');
    console.log('='.repeat(70));
})();
