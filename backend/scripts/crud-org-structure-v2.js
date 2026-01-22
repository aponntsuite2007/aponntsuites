/**
 * CRUD TEST - ESTRUCTURA ORGANIZACIONAL V2
 * Con campos específicos por tab y manejo de dependencias
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

const COMPANY_ID = 11;

// Tabs con sus configuraciones específicas
const TABS = {
    departments: {
        name: 'Departamentos',
        table: 'departments',
        createBtn: 'Nuevo Departamento',
        fields: { name: true },
        saveCreate: 'Crear Departamento',
        saveEdit: 'Guardar Cambios'
    },
    sectors: {
        name: 'Sectores',
        table: 'sectors',
        createBtn: 'Nuevo Sector',
        fields: { department_id: 'select', name: true },
        saveCreate: 'Crear Sector',
        saveEdit: 'Guardar Cambios',
        dependsOn: 'departments'
    },
    agreements: {
        name: 'Convenios',
        table: 'labor_agreements_v2',
        createBtn: 'Nuevo Convenio',
        fields: { name: true },
        saveCreate: 'Crear Convenio',
        saveEdit: 'Guardar Cambios'
    },
    categories: {
        name: 'Categorías',
        table: 'salary_categories_v2',
        createBtn: 'Nueva Categoría',
        fields: { agreement_id: 'select', category_code: true, category_name: true, base_salary: 'number' },
        saveCreate: 'Crear Categoría',
        saveEdit: 'Guardar Cambios',
        dependsOn: 'agreements'
    },
    roles: {
        name: 'Roles',
        table: 'role_definitions',
        createBtn: 'Nuevo Rol',
        fields: { role_key: true, role_name: true },
        saveCreate: 'Crear Rol',
        saveEdit: 'Guardar Cambios'
    },
    positions: {
        name: 'Posiciones',
        table: 'organizational_positions',
        createBtn: 'Nueva Posición',
        fields: { position_name: true, position_code: true, hierarchy_level: 'select' },
        saveCreate: 'Crear Posición',
        saveEdit: 'Guardar Cambios'
    }
    // Turnos es READ-ONLY en este módulo
};

async function count(table) {
    try {
        const [r] = await sequelize.query(`SELECT COUNT(*) as c FROM ${table} WHERE company_id = ${COMPANY_ID}`);
        return parseInt(r[0].c);
    } catch {
        try {
            const [r] = await sequelize.query(`SELECT COUNT(*) as c FROM ${table}`);
            return parseInt(r[0].c);
        } catch { return -1; }
    }
}

(async () => {
    console.log('='.repeat(90));
    console.log('CRUD TEST - ESTRUCTURA ORGANIZACIONAL V2');
    console.log('='.repeat(90));
    console.log('Nota: Turnos es READ-ONLY en este módulo\n');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    let apiResponse = { method: null, status: null };
    page.on('response', async r => {
        if (r.url().includes('/api/')) {
            const method = r.request().method();
            const status = r.status();
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && status >= 200 && status < 300) {
                apiResponse = { method, status };
                console.log(`      📡 ${method} ${status}`);
            }
        }
    });

    const results = {};
    for (const key in TABS) results[key] = { create: false, update: false, delete: false };

    try {
        // LOGIN
        console.log('▶ LOGIN');
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
        console.log('  ✓ OK\n');

        // NAVEGAR
        console.log('▶ NAVEGAR A ESTRUCTURA ORGANIZACIONAL');
        await page.click('text=Estructura Organizacional');
        await page.waitForTimeout(4000);
        console.log('  ✓ OK\n');

        // PROBAR CADA TAB
        for (const [tabKey, tab] of Object.entries(TABS)) {
            console.log('\n' + '='.repeat(90));
            console.log(`▶ ${tab.name.toUpperCase()} (${tabKey})`);
            console.log('='.repeat(90));

            const ts = Date.now().toString().slice(-6);
            const TEST_NAME = `TEST_${tabKey.toUpperCase()}_${ts}`;

            // Navegar al tab
            await page.evaluate((key) => {
                if (typeof OrgEngine !== 'undefined' && OrgEngine.showTab) {
                    OrgEngine.showTab(key);
                }
            }, tabKey);
            await page.waitForTimeout(2000);

            const countBefore = await count(tab.table);
            console.log(`\n  BD antes: ${countBefore} en ${tab.table}`);

            // ============ CREATE ============
            console.log('\n  [CREATE]');
            apiResponse = { method: null, status: null };

            // Click botón crear
            const createClicked = await page.evaluate((btnText) => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    if (btn.textContent.includes(btnText)) {
                        btn.click();
                        return true;
                    }
                }
                // Fallback: buscar "+" o "Nuevo"
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    if (btn.textContent.includes('+') || btn.textContent.toLowerCase().includes('nuevo')) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            }, tab.createBtn);

            if (!createClicked) {
                console.log(`    ⚠️ No se encontró botón "${tab.createBtn}"`);
                continue;
            }
            console.log(`    ✓ Click en "${tab.createBtn}"`);
            await page.waitForTimeout(1500);

            // Llenar formulario según campos específicos
            await page.evaluate((config) => {
                const { fields, testName, ts } = config;

                for (const [fieldName, fieldType] of Object.entries(fields)) {
                    if (fieldType === 'select') {
                        // Seleccionar primera opción válida
                        const sel = document.querySelector(`select[name="${fieldName}"]`);
                        if (sel && sel.offsetParent) {
                            // Buscar primera opción con value (no vacía)
                            for (let i = 0; i < sel.options.length; i++) {
                                if (sel.options[i].value && sel.options[i].value !== '') {
                                    sel.selectedIndex = i;
                                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                                    break;
                                }
                            }
                        }
                    } else if (fieldType === 'number') {
                        const input = document.querySelector(`input[name="${fieldName}"]`);
                        if (input && input.offsetParent) {
                            input.value = '1000';
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    } else {
                        // Text field
                        const input = document.querySelector(`input[name="${fieldName}"], textarea[name="${fieldName}"]`);
                        if (input && input.offsetParent) {
                            // Generar valor único
                            if (fieldName.includes('code') || fieldName.includes('key')) {
                                input.value = `${fieldName}_${ts}`;
                            } else {
                                input.value = testName;
                            }
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }
                }

                // Llenar cualquier otro input de texto vacío
                document.querySelectorAll('input[type="text"], input:not([type])').forEach(input => {
                    if (!input.offsetParent || input.disabled) return;
                    if (input.closest('#loginForm')) return;
                    if (!input.value || input.value === '') {
                        input.value = 'Test_' + ts;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });

                // Llenar textarea si está vacío
                const ta = document.querySelector('textarea');
                if (ta && ta.offsetParent && !ta.value) {
                    ta.value = 'Descripción test ' + testName;
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                }

                // Seleccionar hierarchy_level si existe
                const hierarchySelect = document.querySelector('select[name="hierarchy_level"]');
                if (hierarchySelect && hierarchySelect.offsetParent && hierarchySelect.selectedIndex <= 0) {
                    hierarchySelect.selectedIndex = 1;
                    hierarchySelect.dispatchEvent(new Event('change', { bubbles: true }));
                }

            }, { fields: tab.fields, testName: TEST_NAME, ts });

            console.log('    ✓ Formulario llenado');
            await page.screenshot({ path: `debug-org-v2-${tabKey}-create.png` });

            // Click guardar
            await page.evaluate((saveText) => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    if (t.includes(saveText.toLowerCase()) || t.includes('crear') || t.includes('guardar')) {
                        btn.click();
                        return;
                    }
                }
            }, tab.saveCreate);

            await page.waitForTimeout(4000);
            const countAfterCreate = await count(tab.table);
            const createOk = countAfterCreate > countBefore ||
                (apiResponse.method === 'POST' && apiResponse.status === 201);

            results[tabKey].create = createOk;
            console.log(`    BD: ${countBefore} → ${countAfterCreate}`);
            console.log(createOk ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');

            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);

            // ============ UPDATE ============
            console.log('\n  [UPDATE]');
            apiResponse = { method: null, status: null };

            // Click en editar (emoji ✏️)
            const editClicked = await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    if (btn.textContent.includes('✏️') || btn.title?.includes('Editar')) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            });

            if (editClicked) {
                console.log('    ✓ Modal editar abierto');
                await page.waitForTimeout(1500);

                // Modificar primer campo de texto
                await page.evaluate((ts) => {
                    const inputs = document.querySelectorAll('input[type="text"]');
                    for (const input of inputs) {
                        if (!input.offsetParent || input.disabled || input.readOnly) continue;
                        if (input.closest('#loginForm')) continue;
                        input.value = 'UPD_' + ts;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        break;
                    }
                }, ts);

                // Guardar
                await page.evaluate((saveText) => {
                    const btns = document.querySelectorAll('button');
                    for (const btn of btns) {
                        if (!btn.offsetParent) continue;
                        const t = btn.textContent.toLowerCase();
                        if (t.includes(saveText.toLowerCase()) || t.includes('guardar')) {
                            btn.click();
                            return;
                        }
                    }
                }, tab.saveEdit);

                await page.waitForTimeout(4000);
                results[tabKey].update = apiResponse.method === 'PUT' && apiResponse.status === 200;
                console.log(results[tabKey].update ? '    ✅ UPDATE OK' : '    ⚠️ UPDATE sin confirmación API');

                await page.keyboard.press('Escape');
                await page.waitForTimeout(1000);
            } else {
                console.log('    ⚠️ No hay registros para editar');
            }

            // ============ DELETE ============
            console.log('\n  [DELETE]');
            apiResponse = { method: null, status: null };
            const countBeforeDelete = await count(tab.table);

            // Handler para dialog
            const dialogHandler = async dialog => {
                try { await dialog.accept(); } catch {}
            };
            page.on('dialog', dialogHandler);

            // Click en eliminar (emoji 🗑️)
            const deleteClicked = await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    if (btn.textContent.includes('🗑️') ||
                        btn.className.includes('danger') ||
                        btn.title?.includes('Eliminar')) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            });

            if (deleteClicked) {
                console.log('    ✓ Click eliminar');
                await page.waitForTimeout(3000);

                const countAfterDelete = await count(tab.table);
                results[tabKey].delete = countAfterDelete < countBeforeDelete ||
                    (apiResponse.method === 'DELETE' && apiResponse.status >= 200);

                console.log(`    BD: ${countBeforeDelete} → ${countAfterDelete}`);
                console.log(results[tabKey].delete ? '    ✅ DELETE OK' : '    ⚠️ DELETE pendiente');
            } else {
                console.log('    ⚠️ No hay registros para eliminar');
            }

            page.removeListener('dialog', dialogHandler);
            await page.screenshot({ path: `debug-org-v2-${tabKey}-final.png` });
        }

    } catch (error) {
        console.log('\nERROR:', error.message);
        await page.screenshot({ path: 'debug-org-v2-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN
    console.log('\n\n' + '='.repeat(90));
    console.log('RESUMEN - ESTRUCTURA ORGANIZACIONAL');
    console.log('='.repeat(90));
    console.log('\nTab'.padEnd(15) + 'CREATE'.padEnd(10) + 'UPDATE'.padEnd(10) + 'DELETE'.padEnd(10) + 'TOTAL');
    console.log('-'.repeat(55));

    let total = 0, passed = 0;
    for (const [key, tab] of Object.entries(TABS)) {
        const r = results[key];
        const c = r.create ? '✅' : '❌';
        const u = r.update ? '✅' : '❌';
        const d = r.delete ? '✅' : '❌';
        const p = [r.create, r.update, r.delete].filter(Boolean).length;
        total += 3;
        passed += p;
        console.log(`${tab.name.padEnd(15)}${c.padEnd(10)}${u.padEnd(10)}${d.padEnd(10)}${p}/3`);
    }

    console.log('-'.repeat(55));
    console.log(`TOTAL: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    console.log('\nNota: Turnos es READ-ONLY (sin CRUD en este módulo)');

    if (passed === total) {
        console.log('\n🎉 ESTRUCTURA ORGANIZACIONAL 100% COMPLETO 🎉');
    }
    console.log('='.repeat(90));
})();
