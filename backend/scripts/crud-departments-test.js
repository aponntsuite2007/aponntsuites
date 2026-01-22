/**
 * CRUD TEST - Departments
 * Verificación CREATE con BD
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

const TEST_NAME = 'DEPT_TEST_' + Date.now().toString().slice(-6);

(async () => {
    console.log('='.repeat(70));
    console.log('CRUD TEST - DEPARTMENTS');
    console.log('='.repeat(70));
    console.log('Nombre de prueba:', TEST_NAME);
    console.log('');

    // Contar antes
    const [beforeCount] = await sequelize.query(
        `SELECT COUNT(*) as c FROM departments WHERE company_id = 11`
    );
    console.log('Departamentos antes:', beforeCount[0].c);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    let apiCreate = false;
    page.on('response', r => {
        if (r.url().includes('/api/') && r.request().method() === 'POST' && r.status() === 201) {
            apiCreate = true;
            console.log('  📡 API 201:', r.url().substring(0, 60));
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

        // Navegar a Estructura Organizacional (donde están los departamentos)
        console.log('[2] Navegar a Estructura Organizacional...');
        await page.click('text=Estructura Organizacional');
        await page.waitForTimeout(4000);
        console.log('    OK');

        await page.screenshot({ path: 'debug-dept-1-module.png', fullPage: true });

        // Click en Nuevo Departamento
        console.log('[3] Click en Nuevo Departamento...');
        const clickResult = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const addBtn = btns.find(b =>
                b.offsetParent && (
                    b.textContent.includes('Nuevo Departamento') ||
                    b.textContent.includes('Agregar') ||
                    b.textContent.includes('+ Nuevo')
                )
            );
            if (addBtn) {
                addBtn.click();
                return { ok: true, text: addBtn.textContent.trim() };
            }
            return { ok: false, btns: btns.filter(b => b.offsetParent).map(b => b.textContent.trim().substring(0, 30)) };
        });

        if (!clickResult.ok) {
            console.log('    Botón no encontrado');
            console.log('    Botones:', clickResult.btns?.join(', '));
            throw new Error('No add button');
        }
        console.log('    Click en:', clickResult.text);

        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'debug-dept-2-form.png', fullPage: true });

        // Llenar formulario
        console.log('[4] Llenando formulario...');
        const fillResult = await page.evaluate((name) => {
            const filled = [];
            const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));

            inputs.forEach(input => {
                if (!input.offsetParent) return;
                const ph = (input.placeholder || '').toLowerCase();
                const nm = (input.name || '').toLowerCase();
                const id = (input.id || '').toLowerCase();

                // Campo de nombre
                if (ph.includes('nombre') || ph.includes('name') || nm.includes('name') || id.includes('name')) {
                    input.value = name;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    filled.push('Nombre: ' + name);
                }
                // Campo de descripción
                if (ph.includes('descripción') || ph.includes('description') || nm.includes('desc')) {
                    input.value = 'Departamento de prueba CRUD';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    filled.push('Descripción');
                }
            });

            // Selects
            document.querySelectorAll('select').forEach(s => {
                if (s.offsetParent && s.options.length > 1) {
                    s.selectedIndex = 1;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                    filled.push('Select');
                }
            });

            return filled;
        }, TEST_NAME);

        fillResult.forEach(f => console.log('    ' + f));

        await page.screenshot({ path: 'debug-dept-3-filled.png', fullPage: true });

        // Click guardar
        console.log('[5] Click en Guardar...');
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const saveBtn = btns.find(b => {
                if (!b.offsetParent) return false;
                const t = b.textContent.toLowerCase();
                const c = b.className;
                return (c.includes('success') || c.includes('primary') || t.includes('guardar') || t.includes('save') || t.includes('crear')) &&
                       !t.includes('cancel');
            });
            if (saveBtn) {
                saveBtn.scrollIntoView({ block: 'center' });
                setTimeout(() => saveBtn.click(), 300);
            }
        });

        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'debug-dept-4-after.png', fullPage: true });

        // Verificar en BD
        console.log('\n[6] VERIFICACIÓN EN BD');
        console.log('-'.repeat(70));

        const [afterCount] = await sequelize.query(
            `SELECT COUNT(*) as c FROM departments WHERE company_id = 11`
        );
        console.log('Departamentos después:', afterCount[0].c);
        console.log('Diferencia:', parseInt(afterCount[0].c) - parseInt(beforeCount[0].c));

        const [found] = await sequelize.query(
            `SELECT id, name, description FROM departments WHERE name = $1`,
            { bind: [TEST_NAME] }
        );

        console.log('');
        if (found.length > 0) {
            console.log('*'.repeat(70));
            console.log('*** CREATE EXITOSO - DEPARTAMENTO PERSISTIDO EN BD ***');
            console.log('*'.repeat(70));
            console.log('');
            console.log('ID:', found[0].id);
            console.log('Nombre:', found[0].name);
            console.log('API 201:', apiCreate ? 'Sí' : 'No detectado');
        } else if (parseInt(afterCount[0].c) > parseInt(beforeCount[0].c)) {
            console.log('*'.repeat(70));
            console.log('*** CREATE EXITOSO - NUEVO REGISTRO DETECTADO ***');
            console.log('*'.repeat(70));
        } else {
            console.log('*'.repeat(70));
            console.log('*** CREATE FALLIDO - NO SE ENCONTRÓ NUEVO REGISTRO ***');
            console.log('*'.repeat(70));
            console.log('');
            console.log('API 201:', apiCreate ? 'Sí' : 'No');
        }

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-dept-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    console.log('');
    console.log('='.repeat(70));
})();
