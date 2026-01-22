/**
 * CRUD TEST - Departments v2
 * Con todos los campos requeridos
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

const TEST_NAME = 'DEPT_V2_' + Date.now().toString().slice(-6);
const TEST_CODE = 'COD' + Date.now().toString().slice(-4);

(async () => {
    console.log('='.repeat(70));
    console.log('CRUD TEST - DEPARTMENTS v2');
    console.log('='.repeat(70));
    console.log('Nombre:', TEST_NAME);
    console.log('Código:', TEST_CODE);
    console.log('');

    const [beforeCount] = await sequelize.query(
        `SELECT COUNT(*) as c FROM departments WHERE company_id = 11`
    );
    console.log('Departamentos antes:', beforeCount[0].c);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    let apiResponse = null;
    page.on('response', async r => {
        if (r.url().includes('/api/') && r.request().method() === 'POST') {
            const status = r.status();
            if (status === 201 || status === 200) {
                apiResponse = { status, url: r.url().substring(0, 60) };
                console.log(`  📡 API ${status}:`, r.url().substring(0, 60));
            } else if (status >= 400) {
                try {
                    const body = await r.json();
                    console.log(`  ❌ API ${status}:`, body.message || body.error || JSON.stringify(body).substring(0, 100));
                } catch {
                    console.log(`  ❌ API ${status}`);
                }
            }
        }
    });

    try {
        // Login
        console.log('\n[1] Login...');
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

        // Navegar
        console.log('[2] Navegar a Estructura Organizacional...');
        await page.click('text=Estructura Organizacional');
        await page.waitForTimeout(4000);
        console.log('    OK');

        // Click en Nuevo Departamento
        console.log('[3] Click en Nuevo Departamento...');
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b =>
                b.offsetParent && b.textContent.includes('Nuevo Departamento')
            );
            if (btn) btn.click();
        });
        await page.waitForTimeout(2000);
        console.log('    OK');

        // Llenar TODOS los campos
        console.log('[4] Llenando TODOS los campos...');
        const fillResult = await page.evaluate((data) => {
            const filled = [];
            const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]), textarea'));

            inputs.forEach(input => {
                if (!input.offsetParent) return;
                const ph = (input.placeholder || '').toLowerCase();
                const nm = (input.name || '').toLowerCase();
                const id = (input.id || '').toLowerCase();

                // Nombre
                if (ph.includes('nombre') || nm.includes('name') || id.includes('name')) {
                    input.value = data.name;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    filled.push('Nombre: ' + data.name);
                }
                // Código
                else if (ph.includes('codigo') || ph.includes('código') || ph.includes('sul') || nm.includes('code') || id.includes('code')) {
                    input.value = data.code;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    filled.push('Código: ' + data.code);
                }
                // Descripción
                else if (ph.includes('descripción') || ph.includes('description') || nm.includes('desc')) {
                    input.value = 'Departamento de prueba CRUD v2';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    filled.push('Descripción');
                }
                // Dirección
                else if (ph.includes('dirección') || ph.includes('piso') || ph.includes('oficina') || nm.includes('address') || nm.includes('location')) {
                    input.value = 'Piso 1, Oficina Test';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    filled.push('Dirección');
                }
            });

            // Selects - seleccionar opciones
            document.querySelectorAll('select').forEach(s => {
                if (s.offsetParent && s.options.length > 1) {
                    s.selectedIndex = 1;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                    filled.push('Select: ' + (s.options[1]?.text || 'opción 1'));
                }
            });

            // Checkboxes de kiosks - seleccionar al menos uno
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            let kioskSelected = false;
            checkboxes.forEach(cb => {
                if (cb.offsetParent && !kioskSelected && !cb.id?.includes('gps') && !cb.name?.includes('gps')) {
                    cb.checked = true;
                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                    kioskSelected = true;
                    filled.push('Kiosk checkbox seleccionado');
                }
            });

            return filled;
        }, { name: TEST_NAME, code: TEST_CODE });

        fillResult.forEach(f => console.log('    ' + f));

        await page.screenshot({ path: 'debug-dept-v2-filled.png', fullPage: true });

        // Click en Crear Departamento
        console.log('[5] Click en Crear Departamento...');
        const clickResult = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            // Buscar específicamente el botón "Crear Departamento"
            const createBtn = btns.find(b =>
                b.offsetParent && (
                    b.textContent.toLowerCase().includes('crear departamento') ||
                    b.textContent.toLowerCase().includes('create department') ||
                    (b.className.includes('primary') && b.textContent.toLowerCase().includes('crear'))
                )
            );

            if (createBtn) {
                createBtn.scrollIntoView({ block: 'center' });
                // Esperar y hacer click
                return new Promise(resolve => {
                    setTimeout(() => {
                        createBtn.click();
                        resolve({ ok: true, text: createBtn.textContent.trim() });
                    }, 500);
                });
            }

            return { ok: false, btns: btns.filter(b => b.offsetParent).map(b => b.textContent.trim().substring(0, 30)) };
        });

        if (clickResult.ok) {
            console.log('    Click en:', clickResult.text);
        } else {
            console.log('    Botón no encontrado:', clickResult.btns?.join(', '));
        }

        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'debug-dept-v2-after.png', fullPage: true });

        // Verificar en BD
        console.log('\n[6] VERIFICACIÓN EN BD');
        console.log('-'.repeat(70));

        const [afterCount] = await sequelize.query(
            `SELECT COUNT(*) as c FROM departments WHERE company_id = 11`
        );
        console.log('Departamentos después:', afterCount[0].c);
        console.log('Diferencia:', parseInt(afterCount[0].c) - parseInt(beforeCount[0].c));

        const [found] = await sequelize.query(
            `SELECT id, name, code, description FROM departments WHERE name = $1 OR code = $2`,
            { bind: [TEST_NAME, TEST_CODE] }
        );

        console.log('');
        if (found.length > 0) {
            console.log('*'.repeat(70));
            console.log('*** CREATE EXITOSO - DEPARTAMENTO PERSISTIDO EN BD ***');
            console.log('*'.repeat(70));
            console.log('');
            console.log('ID:', found[0].id);
            console.log('Nombre:', found[0].name);
            console.log('Código:', found[0].code);
        } else if (parseInt(afterCount[0].c) > parseInt(beforeCount[0].c)) {
            console.log('*'.repeat(70));
            console.log('*** CREATE EXITOSO - NUEVO REGISTRO DETECTADO ***');
            console.log('*'.repeat(70));
        } else {
            console.log('*'.repeat(70));
            console.log('*** CREATE FALLIDO ***');
            console.log('*'.repeat(70));
            console.log('');
            console.log('API Response:', apiResponse ? `${apiResponse.status}` : 'No 2xx detectado');
        }

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-dept-v2-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    console.log('');
    console.log('='.repeat(70));
})();
