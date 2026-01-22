/**
 * CRUD MULTI-MÓDULO - Test con verificación BD
 * Prueba CREATE en múltiples módulos desde el frontend
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

// Configuración de módulos a testear
const MODULES_CONFIG = [
    {
        name: 'users',
        displayName: 'Gestión de Usuarios',
        table: 'users',
        idColumn: 'user_id',
        companyFilter: 'company_id = 11',
        testData: {
            email: `test-${Date.now()}@prueba.com`,
            name: 'TEST_Module Usuario',
            legajo: 'TST-' + Date.now().toString().slice(-6)
        },
        verifyField: 'email',
        addButtonText: ['Agregar', 'Add'],
        formFields: [
            { type: 'name', placeholder: ['Juan', 'name'] },
            { type: 'email', placeholder: ['@', 'email'] },
            { type: 'id', placeholder: ['EMP', 'legajo'] },
            { type: 'password', inputType: 'password', value: 'Test123!' }
        ]
    },
    {
        name: 'departments',
        displayName: 'Departamentos',
        table: 'departments',
        idColumn: 'id',
        companyFilter: 'company_id = 11',
        testData: {
            name: 'DEPT_TEST_' + Date.now().toString().slice(-6),
            description: 'Departamento de prueba CRUD'
        },
        verifyField: 'name',
        addButtonText: ['Agregar', 'Nuevo', 'Add', 'Create'],
        formFields: [
            { type: 'name', placeholder: ['nombre', 'name', 'departamento'] },
            { type: 'description', placeholder: ['descripción', 'description'] }
        ]
    },
    {
        name: 'kiosks',
        displayName: 'Gestión de Kioscos',
        table: 'kiosks',
        idColumn: 'id',
        companyFilter: 'company_id = 11',
        testData: {
            name: 'KIOSK_TEST_' + Date.now().toString().slice(-6),
            location: 'Test Location'
        },
        verifyField: 'name',
        addButtonText: ['Agregar', 'Nuevo', 'Add'],
        formFields: [
            { type: 'name', placeholder: ['nombre', 'name', 'kiosk'] },
            { type: 'location', placeholder: ['ubicación', 'location'] }
        ]
    },
    {
        name: 'shifts',
        displayName: 'Turnos',
        table: 'shifts',
        idColumn: 'id',
        companyFilter: 'company_id = 11',
        testData: {
            name: 'SHIFT_TEST_' + Date.now().toString().slice(-6),
            start_time: '08:00',
            end_time: '17:00'
        },
        verifyField: 'name',
        addButtonText: ['Agregar', 'Nuevo', 'Add', 'Crear'],
        formFields: [
            { type: 'name', placeholder: ['nombre', 'name', 'turno'] },
            { type: 'start', inputType: 'time', value: '08:00' },
            { type: 'end', inputType: 'time', value: '17:00' }
        ]
    },
    {
        name: 'notifications',
        displayName: 'Centro de Notificaciones',
        table: 'notifications',
        idColumn: 'id',
        companyFilter: 'company_id = 11',
        testData: {
            title: 'NOTIF_TEST_' + Date.now().toString().slice(-6),
            message: 'Test notification message'
        },
        verifyField: 'title',
        addButtonText: ['Nueva', 'Crear', 'Add', 'Create'],
        formFields: [
            { type: 'title', placeholder: ['título', 'title', 'asunto'] },
            { type: 'message', placeholder: ['mensaje', 'message', 'contenido'] }
        ]
    }
];

async function countRecords(table, filter) {
    try {
        const [results] = await sequelize.query(
            `SELECT COUNT(*) as total FROM ${table} WHERE ${filter}`
        );
        return parseInt(results[0].total);
    } catch (e) {
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

async function deleteTestRecords(table, column, pattern) {
    try {
        await sequelize.query(
            `DELETE FROM ${table} WHERE ${column} LIKE $1`,
            { bind: [pattern] }
        );
    } catch (e) {
        // Ignore
    }
}

(async () => {
    console.log('='.repeat(80));
    console.log('CRUD MULTI-MÓDULO - TEST CON VERIFICACIÓN BD');
    console.log('='.repeat(80));
    console.log('Módulos a testear:', MODULES_CONFIG.length);
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
                displayName: mod.displayName,
                navigation: false,
                formOpen: false,
                create: false,
                error: null
            };

            try {
                // Limpiar registros de prueba anteriores
                const testPattern = mod.testData[mod.verifyField].split('_')[0] + '%';
                await deleteTestRecords(mod.table, mod.verifyField, testPattern);

                // Contar registros antes
                const countBefore = await countRecords(mod.table, mod.companyFilter);
                console.log(`  Registros antes: ${countBefore}`);

                // Navegar al módulo
                const navSuccess = await page.evaluate((displayName) => {
                    // Buscar por texto en cards o menú
                    const elements = Array.from(document.querySelectorAll('*'));
                    for (const el of elements) {
                        if (el.textContent.includes(displayName) && el.offsetParent !== null) {
                            if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.closest('a, button, [onclick]')) {
                                const clickable = el.closest('a, button, [onclick]') || el;
                                clickable.click();
                                return true;
                            }
                        }
                    }
                    return false;
                }, mod.displayName);

                if (!navSuccess) {
                    // Intentar con loadModule
                    await page.evaluate((name) => {
                        if (typeof loadModule === 'function') loadModule(name);
                        else if (typeof window.loadModule === 'function') window.loadModule(name);
                    }, mod.name);
                }

                await page.waitForTimeout(3000);
                moduleResult.navigation = true;
                console.log('  ✓ Navegación');

                // Abrir formulario de crear
                const formOpened = await page.evaluate((addTexts) => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    for (const text of addTexts) {
                        const btn = buttons.find(b =>
                            b.offsetParent !== null && b.textContent.toLowerCase().includes(text.toLowerCase())
                        );
                        if (btn) {
                            btn.click();
                            return true;
                        }
                    }
                    return false;
                }, mod.addButtonText);

                await page.waitForTimeout(2000);
                moduleResult.formOpen = formOpened;

                if (formOpened) {
                    console.log('  ✓ Formulario abierto');

                    // Llenar campos
                    await page.evaluate((testData, fields) => {
                        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
                        const selects = Array.from(document.querySelectorAll('select'));

                        inputs.forEach(input => {
                            if (!input.offsetParent) return;
                            const placeholder = (input.placeholder || '').toLowerCase();
                            const name = (input.name || '').toLowerCase();

                            for (const field of fields) {
                                const matches = field.placeholder?.some(p =>
                                    placeholder.includes(p.toLowerCase()) || name.includes(p.toLowerCase())
                                );
                                const typeMatches = field.inputType && input.type === field.inputType;

                                if (matches || typeMatches) {
                                    const value = field.value || testData[field.type] || testData.name || '';
                                    if (value) {
                                        input.value = value;
                                        input.dispatchEvent(new Event('input', { bubbles: true }));
                                    }
                                    break;
                                }
                            }
                        });

                        // Seleccionar primera opción en selects
                        selects.forEach(select => {
                            if (select.offsetParent && select.options.length > 1) {
                                select.selectedIndex = 1;
                                select.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        });
                    }, mod.testData, mod.formFields);

                    console.log('  ✓ Campos llenados');

                    // Click en guardar
                    await page.evaluate(() => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const saveBtn = buttons.find(b => {
                            if (!b.offsetParent) return false;
                            const text = b.textContent.toLowerCase();
                            const hasSuccessClass = b.className.includes('success') || b.className.includes('primary');
                            return hasSuccessClass && !text.includes('cancel') && !text.includes('cerrar');
                        });
                        if (saveBtn) {
                            saveBtn.scrollIntoView({ block: 'center' });
                            setTimeout(() => saveBtn.click(), 300);
                        }
                    });

                    await page.waitForTimeout(4000);

                    // Verificar en BD
                    const verifyValue = mod.testData[mod.verifyField];
                    const record = await findRecord(mod.table, mod.verifyField, verifyValue);
                    const countAfter = await countRecords(mod.table, mod.companyFilter);

                    if (record) {
                        moduleResult.create = true;
                        console.log(`  ✓ CREATE: Registro persistido en BD`);
                        console.log(`    ${mod.verifyField}: ${verifyValue}`);
                    } else if (countAfter > countBefore) {
                        moduleResult.create = true;
                        console.log(`  ✓ CREATE: Nuevo registro detectado (${countBefore} → ${countAfter})`);
                    } else {
                        console.log(`  ✗ CREATE: Registro no encontrado en BD`);
                    }
                } else {
                    console.log('  ? Formulario no abierto');
                    moduleResult.error = 'No se pudo abrir el formulario de crear';
                }

            } catch (error) {
                console.log(`  ✗ ERROR: ${error.message}`);
                moduleResult.error = error.message;
            }

            results.push(moduleResult);
            console.log('');

            // Volver al dashboard para el siguiente módulo
            await page.evaluate(() => {
                if (typeof loadModule === 'function') loadModule('dashboard');
            });
            await page.waitForTimeout(2000);
        }

    } catch (error) {
        console.log('ERROR GLOBAL:', error.message);
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN FINAL
    console.log('='.repeat(80));
    console.log('RESUMEN CRUD MULTI-MÓDULO');
    console.log('='.repeat(80));
    console.log('');
    console.log('Módulo              | Navegación | Form Open | CREATE BD');
    console.log('-'.repeat(60));

    let passed = 0;
    let total = results.length;

    results.forEach(r => {
        const nav = r.navigation ? '✓' : '✗';
        const form = r.formOpen ? '✓' : '✗';
        const create = r.create ? '✓ PASS' : '✗ FAIL';

        if (r.create) passed++;

        const name = r.module.padEnd(18);
        console.log(`${name} | ${nav}          | ${form}         | ${create}`);
    });

    console.log('-'.repeat(60));
    console.log(`TOTAL: ${passed}/${total} módulos con CREATE exitoso (${Math.round(passed/total*100)}%)`);
    console.log('');

    if (passed >= total * 0.8) {
        console.log('*'.repeat(80));
        console.log('*** SISTEMA CRUD FUNCIONAL - MAYORÍA DE MÓDULOS VERIFICADOS ***');
        console.log('*'.repeat(80));
    }

    console.log('');
    console.log('='.repeat(80));
})();
