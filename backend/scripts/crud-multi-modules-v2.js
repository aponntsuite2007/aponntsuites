/**
 * CRUD MULTI-MÓDULO v2 - Test con verificación BD
 * Usando click directo de Playwright
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

const MODULES_CONFIG = [
    {
        name: 'users',
        clickText: 'Gestión de Usuarios',
        table: 'users',
        verifyField: 'email',
        testData: { email: `multi-test-${Date.now()}@test.com`, name: 'MultiTest Usuario' },
        companyFilter: 'company_id = 11'
    },
    {
        name: 'kiosks',
        clickText: 'Gestión de Kioscos',
        table: 'kiosks',
        verifyField: 'name',
        testData: { name: `KIOSK_TEST_${Date.now().toString().slice(-6)}` },
        companyFilter: 'company_id = 11'
    },
    {
        name: 'shifts',
        clickText: 'Control de Asistencia',
        table: 'shifts',
        verifyField: 'name',
        testData: { name: `SHIFT_TEST_${Date.now().toString().slice(-6)}` },
        companyFilter: 'company_id = 11'
    },
    {
        name: 'notifications',
        clickText: 'Centro de Notificaciones',
        table: 'notifications',
        verifyField: 'title',
        testData: { title: `NOTIF_TEST_${Date.now().toString().slice(-6)}` },
        companyFilter: 'company_id = 11'
    },
    {
        name: 'visitors',
        clickText: 'Control de Visitantes',
        table: 'visitors',
        verifyField: 'full_name',
        testData: { full_name: `VISITOR_TEST_${Date.now().toString().slice(-6)}` },
        companyFilter: 'company_id = 11'
    }
];

async function countRecords(table, filter) {
    try {
        const [results] = await sequelize.query(`SELECT COUNT(*) as total FROM ${table} WHERE ${filter}`);
        return parseInt(results[0].total);
    } catch (e) {
        console.log(`    ⚠️ Error contando ${table}: ${e.message}`);
        return -1;
    }
}

async function findRecord(table, column, value) {
    try {
        const [results] = await sequelize.query(
            `SELECT * FROM ${table} WHERE ${column} = $1 LIMIT 1`,
            { bind: [value] }
        );
        return results.length > 0 ? results[0] : null;
    } catch (e) {
        return null;
    }
}

(async () => {
    console.log('='.repeat(80));
    console.log('CRUD MULTI-MÓDULO v2 - TEST CON VERIFICACIÓN BD');
    console.log('='.repeat(80));
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const results = [];

    try {
        // LOGIN
        console.log('▶ LOGIN');
        console.log('-'.repeat(80));
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
        console.log('  ✓ Login exitoso\n');

        // TEST CADA MÓDULO
        for (const mod of MODULES_CONFIG) {
            console.log(`▶ MÓDULO: ${mod.name.toUpperCase()}`);
            console.log('-'.repeat(80));

            const moduleResult = {
                module: mod.name,
                navigation: false,
                formOpen: false,
                create: false
            };

            try {
                const countBefore = await countRecords(mod.table, mod.companyFilter);
                console.log(`  Registros antes: ${countBefore}`);

                // Navegar usando click directo de Playwright
                try {
                    await page.click(`text=${mod.clickText}`, { timeout: 5000 });
                    await page.waitForTimeout(4000);
                    moduleResult.navigation = true;
                    console.log('  ✓ Navegación');
                } catch (navError) {
                    console.log(`  ✗ Navegación falló: ${navError.message.substring(0, 50)}`);
                    results.push(moduleResult);
                    continue;
                }

                // Screenshot del módulo
                await page.screenshot({ path: `debug-crud-${mod.name}.png`, fullPage: true });

                // Buscar y clickear botón de agregar
                const addClicked = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const addBtn = buttons.find(b => {
                        if (!b.offsetParent) return false;
                        const text = b.textContent.toLowerCase();
                        return text.includes('agregar') || text.includes('add') ||
                               text.includes('nuevo') || text.includes('new') ||
                               text.includes('crear') || text.includes('+');
                    });
                    if (addBtn) {
                        addBtn.click();
                        return { success: true, text: addBtn.textContent.trim() };
                    }
                    return { success: false, buttons: buttons.filter(b => b.offsetParent).map(b => b.textContent.trim().substring(0,30)) };
                });

                if (addClicked.success) {
                    moduleResult.formOpen = true;
                    console.log(`  ✓ Formulario abierto: "${addClicked.text}"`);
                    await page.waitForTimeout(2000);

                    // Llenar campos del formulario
                    await page.evaluate((testData) => {
                        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
                        const selects = Array.from(document.querySelectorAll('select'));

                        inputs.forEach(input => {
                            if (!input.offsetParent) return;

                            // Detectar tipo de campo por placeholder o name
                            const ph = (input.placeholder || '').toLowerCase();
                            const nm = (input.name || '').toLowerCase();

                            if (testData.name && (ph.includes('nombre') || ph.includes('name') || nm.includes('name'))) {
                                input.value = testData.name;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                            if (testData.email && (ph.includes('@') || input.type === 'email' || nm.includes('email'))) {
                                input.value = testData.email;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                            if (testData.title && (ph.includes('título') || ph.includes('title') || nm.includes('title'))) {
                                input.value = testData.title;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                            if (testData.full_name && (ph.includes('nombre') || nm.includes('name'))) {
                                input.value = testData.full_name;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                            if (input.type === 'password') {
                                input.value = 'Test123!';
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                            // Si es input de legajo/id
                            if (ph.includes('emp') || ph.includes('id') || nm.includes('legajo')) {
                                input.value = 'TST-' + Date.now().toString().slice(-6);
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        });

                        // Seleccionar primera opción en selects
                        selects.forEach(select => {
                            if (select.offsetParent && select.options.length > 1) {
                                select.selectedIndex = 1;
                                select.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        });
                    }, mod.testData);

                    console.log('  ✓ Campos llenados');

                    // Click en guardar
                    await page.evaluate(() => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const saveBtn = buttons.find(b => {
                            if (!b.offsetParent) return false;
                            const cls = b.className || '';
                            const txt = b.textContent.toLowerCase();
                            return (cls.includes('success') || cls.includes('primary') || txt.includes('💾')) &&
                                   !txt.includes('cancel');
                        });
                        if (saveBtn) {
                            saveBtn.scrollIntoView({ block: 'center' });
                            setTimeout(() => saveBtn.click(), 300);
                        }
                    });

                    await page.waitForTimeout(5000);

                    // Verificar en BD
                    const countAfter = await countRecords(mod.table, mod.companyFilter);
                    const verifyValue = mod.testData[mod.verifyField];
                    const record = await findRecord(mod.table, mod.verifyField, verifyValue);

                    if (record) {
                        moduleResult.create = true;
                        console.log(`  ✓ CREATE: Registro encontrado en BD`);
                    } else if (countAfter > countBefore) {
                        moduleResult.create = true;
                        console.log(`  ✓ CREATE: Nuevo registro (+${countAfter - countBefore})`);
                    } else {
                        console.log(`  ✗ CREATE: No se detectó nuevo registro`);
                    }

                } else {
                    console.log('  ✗ No se encontró botón de agregar');
                    console.log(`    Botones disponibles: ${addClicked.buttons?.slice(0, 5).join(', ')}`);
                }

            } catch (error) {
                console.log(`  ✗ ERROR: ${error.message.substring(0, 60)}`);
            }

            results.push(moduleResult);
            console.log('');

            // Volver al dashboard
            await page.goto('http://localhost:9998/panel-empresa.html');
            await page.waitForTimeout(3000);
        }

    } catch (error) {
        console.log('ERROR GLOBAL:', error.message);
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN
    console.log('='.repeat(80));
    console.log('RESUMEN CRUD MULTI-MÓDULO');
    console.log('='.repeat(80));
    console.log('');
    console.log('Módulo          | Nav | Form | CREATE');
    console.log('-'.repeat(50));

    let createPassed = 0;

    results.forEach(r => {
        const nav = r.navigation ? '✓' : '✗';
        const form = r.formOpen ? '✓' : '✗';
        const create = r.create ? '✓ PASS' : '✗ FAIL';
        if (r.create) createPassed++;
        console.log(`${r.module.padEnd(15)} | ${nav}   | ${form}    | ${create}`);
    });

    console.log('-'.repeat(50));
    console.log(`CREATE exitoso: ${createPassed}/${results.length} (${Math.round(createPassed/results.length*100)}%)`);
    console.log('');
    console.log('='.repeat(80));
})();
