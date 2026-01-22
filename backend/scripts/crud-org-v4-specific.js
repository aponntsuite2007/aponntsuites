/**
 * CRUD TEST - ESTRUCTURA ORGANIZACIONAL V4 SPECIFIC
 * Usa lógica específica por tab con form IDs explícitos
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

const COMPANY_ID = 11;

// Form IDs y campos específicos por tab
const TAB_CONFIG = {
    departments: {
        name: 'Departamentos',
        table: 'departments',
        formId: 'org-department-form',
        createBtn: 'Nuevo Departamento',
        saveBtn: 'Crear Departamento',
        editSaveBtn: 'Guardar Cambios',
        fillForm: (testName, ts) => `
            // Campos básicos
            const form = document.getElementById('org-department-form');
            if (!form) return false;

            const name = form.querySelector('input[name="name"]');
            if (name) { name.value = '${testName}'; name.dispatchEvent(new Event('input', {bubbles: true})); }

            const code = form.querySelector('input[name="code"]');
            if (code) { code.value = 'CODE_${ts}'; code.dispatchEvent(new Event('input', {bubbles: true})); }

            const desc = form.querySelector('textarea[name="description"]');
            if (desc) { desc.value = 'Test Dept ${ts}'; desc.dispatchEvent(new Event('input', {bubbles: true})); }

            const addr = form.querySelector('input[name="address"]');
            if (addr) { addr.value = 'Piso ${ts}'; addr.dispatchEvent(new Event('input', {bubbles: true})); }

            // Seleccionar al menos un kiosk
            const kioskCb = document.querySelector('.dept-kiosk-cb');
            if (kioskCb) { kioskCb.checked = true; kioskCb.dispatchEvent(new Event('change', {bubbles: true})); }

            return true;
        `
    },
    sectors: {
        name: 'Sectores',
        table: 'sectors',
        formId: 'org-sector-form',
        createBtn: 'Nuevo Sector',
        saveBtn: 'Crear Sector',
        editSaveBtn: 'Guardar Cambios',
        fillForm: (testName, ts) => `
            const form = document.getElementById('org-sector-form');
            if (!form) return false;

            // Primero seleccionar departamento
            const deptSel = form.querySelector('select[name="department_id"]');
            if (deptSel && deptSel.options.length > 1) {
                deptSel.selectedIndex = 1;
                deptSel.dispatchEvent(new Event('change', {bubbles: true}));
            }

            const name = form.querySelector('input[name="name"]');
            if (name) { name.value = '${testName}'; name.dispatchEvent(new Event('input', {bubbles: true})); }

            const code = form.querySelector('input[name="code"]');
            if (code) { code.value = 'SEC_${ts}'; code.dispatchEvent(new Event('input', {bubbles: true})); }

            return true;
        `
    },
    agreements: {
        name: 'Convenios',
        table: 'labor_agreements_v2',
        formId: 'org-agreement-form',
        createBtn: 'Nuevo Convenio',
        saveBtn: 'Crear Convenio',
        editSaveBtn: 'Guardar Cambios',
        fillForm: (testName, ts) => `
            const form = document.getElementById('org-agreement-form');
            if (!form) return false;

            const code = form.querySelector('input[name="code"]');
            if (code) { code.value = 'CCT_${ts}'; code.dispatchEvent(new Event('input', {bubbles: true})); }

            const name = form.querySelector('input[name="name"]');
            if (name) { name.value = '${testName}'; name.dispatchEvent(new Event('input', {bubbles: true})); }

            const shortName = form.querySelector('input[name="short_name"]');
            if (shortName) { shortName.value = 'SH_${ts}'; shortName.dispatchEvent(new Event('input', {bubbles: true})); }

            const industry = form.querySelector('input[name="industry"]');
            if (industry) { industry.value = 'Tech_${ts}'; industry.dispatchEvent(new Event('input', {bubbles: true})); }

            return true;
        `
    },
    categories: {
        name: 'Categorías',
        table: 'salary_categories_v2',
        formId: 'org-category-form',
        createBtn: 'Nueva Categoría',
        saveBtn: 'Crear Categoría',
        editSaveBtn: 'Guardar Cambios',
        fillForm: (testName, ts) => `
            const form = document.getElementById('org-category-form');
            if (!form) return false;

            // Primero seleccionar convenio
            const agreeSel = form.querySelector('select[name="agreement_id"]');
            if (agreeSel && agreeSel.options.length > 1) {
                agreeSel.selectedIndex = 1;
                agreeSel.dispatchEvent(new Event('change', {bubbles: true}));
            }

            const code = form.querySelector('input[name="category_code"]');
            if (code) { code.value = 'CAT_${ts}'; code.dispatchEvent(new Event('input', {bubbles: true})); }

            const name = form.querySelector('input[name="category_name"]');
            if (name) { name.value = '${testName}'; name.dispatchEvent(new Event('input', {bubbles: true})); }

            const salary = form.querySelector('input[name="base_salary"]');
            if (salary) { salary.value = '50000'; salary.dispatchEvent(new Event('input', {bubbles: true})); }

            return true;
        `
    },
    roles: {
        name: 'Roles',
        table: 'role_definitions',
        formId: 'org-role-form',
        createBtn: 'Nuevo Rol',
        saveBtn: 'Crear Rol',
        editSaveBtn: 'Guardar Cambios',
        fillForm: (testName, ts) => `
            const form = document.getElementById('org-role-form');
            if (!form) return false;

            const key = form.querySelector('input[name="role_key"]');
            if (key) { key.value = 'role_${ts}'; key.dispatchEvent(new Event('input', {bubbles: true})); }

            const name = form.querySelector('input[name="role_name"]');
            if (name) { name.value = '${testName}'; name.dispatchEvent(new Event('input', {bubbles: true})); }

            const desc = form.querySelector('textarea[name="description"]');
            if (desc) { desc.value = 'Test role ${ts}'; desc.dispatchEvent(new Event('input', {bubbles: true})); }

            // Seleccionar nivel
            const levelSel = form.querySelector('select[name="hierarchy_level"]');
            if (levelSel && levelSel.options.length > 1) {
                levelSel.selectedIndex = 1;
                levelSel.dispatchEvent(new Event('change', {bubbles: true}));
            }

            return true;
        `
    },
    positions: {
        name: 'Posiciones',
        table: 'organizational_positions',
        formId: 'org-position-form',
        createBtn: 'Nueva Posición',
        saveBtn: 'Crear Posición',
        editSaveBtn: 'Guardar Cambios',
        fillForm: (testName, ts) => `
            const form = document.getElementById('org-position-form');
            if (!form) return false;

            const name = form.querySelector('input[name="position_name"]');
            if (name) { name.value = '${testName}'; name.dispatchEvent(new Event('input', {bubbles: true})); }

            const code = form.querySelector('input[name="position_code"]');
            if (code) { code.value = 'POS_${ts}'; code.dispatchEvent(new Event('input', {bubbles: true})); }

            // Seleccionar nivel de jerarquía
            const levelSel = form.querySelector('select[name="hierarchy_level"]');
            if (levelSel && levelSel.options.length > 1) {
                levelSel.selectedIndex = 1;
                levelSel.dispatchEvent(new Event('change', {bubbles: true}));
            }

            return true;
        `
    }
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
    console.log('CRUD TEST - ESTRUCTURA ORGANIZACIONAL V4 SPECIFIC');
    console.log('='.repeat(90));
    console.log('Usa form IDs específicos y llenado explícito por tab\n');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    let apiResponse = { method: null, status: null };
    page.on('response', async r => {
        if (r.url().includes('/api/')) {
            const method = r.request().method();
            const status = r.status();
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
                apiResponse = { method, status };
                if (status >= 200 && status < 300) {
                    console.log(`      📡 ${method} ${status}`);
                } else {
                    console.log(`      ⚠️ ${method} ${status}`);
                }
            }
        }
    });

    const results = {};
    for (const key in TAB_CONFIG) results[key] = { create: false, update: false, delete: false };

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
        for (const [tabKey, config] of Object.entries(TAB_CONFIG)) {
            console.log('\n' + '='.repeat(90));
            console.log(`▶ ${config.name.toUpperCase()} (${tabKey})`);
            console.log('='.repeat(90));

            const ts = Date.now().toString().slice(-6);
            const TEST_NAME = `T_${tabKey.slice(0,4).toUpperCase()}_${ts}`;

            // Navegar al tab
            await page.evaluate((key) => {
                if (typeof OrgEngine !== 'undefined' && OrgEngine.showTab) {
                    OrgEngine.showTab(key);
                }
            }, tabKey);
            await page.waitForTimeout(2000);

            const countBefore = await count(config.table);
            console.log(`\n  BD antes: ${countBefore} en ${config.table}`);

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
                return false;
            }, config.createBtn);

            if (!createClicked) {
                console.log(`    ⚠️ No se encontró botón "${config.createBtn}"`);
                continue;
            }
            console.log(`    ✓ Click en "${config.createBtn}"`);
            await page.waitForTimeout(2000);

            // Verificar form
            const formExists = await page.evaluate((formId) => {
                return !!document.getElementById(formId);
            }, config.formId);

            if (!formExists) {
                console.log(`    ⚠️ Form ${config.formId} no encontrado`);
                await page.screenshot({ path: `debug-org-v4-${tabKey}-no-form.png` });
                await page.keyboard.press('Escape');
                continue;
            }

            // Llenar formulario con función específica
            const fillScript = config.fillForm(TEST_NAME, ts);
            const filled = await page.evaluate((script) => {
                return eval(script);
            }, fillScript);
            console.log(`    ✓ Formulario llenado: ${filled}`);
            await page.screenshot({ path: `debug-org-v4-${tabKey}-create.png` });

            // Click guardar
            await page.evaluate((saveText) => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    if (btn.textContent.includes(saveText)) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            }, config.saveBtn);

            await page.waitForTimeout(5000);
            const countAfterCreate = await count(config.table);
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

            const editClicked = await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    if (btn.textContent.includes('✏️')) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            });

            if (editClicked) {
                console.log('    ✓ Modal editar abierto');
                await page.waitForTimeout(2000);

                // Modificar primer input visible
                await page.evaluate((ts) => {
                    const inputs = document.querySelectorAll('input[type="text"]');
                    for (const input of inputs) {
                        if (!input.offsetParent || input.disabled || input.readOnly) continue;
                        if (input.name === 'name' || input.name === 'role_name' || input.name === 'position_name' || input.name === 'category_name') {
                            input.value = 'UPD_' + ts;
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            return;
                        }
                    }
                }, ts);

                await page.evaluate((saveText) => {
                    const btns = document.querySelectorAll('button');
                    for (const btn of btns) {
                        if (!btn.offsetParent) continue;
                        if (btn.textContent.includes(saveText)) {
                            btn.click();
                            return;
                        }
                    }
                }, config.editSaveBtn);

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
            const countBeforeDelete = await count(config.table);

            const dialogHandler = async dialog => {
                try { await dialog.accept(); } catch {}
            };
            page.on('dialog', dialogHandler);

            const deleteClicked = await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    if (btn.textContent.includes('🗑️')) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            });

            if (deleteClicked) {
                console.log('    ✓ Click eliminar');
                await page.waitForTimeout(4000);

                const countAfterDelete = await count(config.table);
                results[tabKey].delete = countAfterDelete < countBeforeDelete ||
                    (apiResponse.method === 'DELETE' && apiResponse.status >= 200);

                console.log(`    BD: ${countBeforeDelete} → ${countAfterDelete}`);
                console.log(results[tabKey].delete ? '    ✅ DELETE OK' : '    ⚠️ DELETE pendiente');
            } else {
                console.log('    ⚠️ No hay registros para eliminar');
            }

            page.removeListener('dialog', dialogHandler);
        }

    } catch (error) {
        console.log('\nERROR:', error.message);
        await page.screenshot({ path: 'debug-org-v4-error.png', fullPage: true });
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
    for (const [key, config] of Object.entries(TAB_CONFIG)) {
        const r = results[key];
        const c = r.create ? '✅' : '❌';
        const u = r.update ? '✅' : '❌';
        const d = r.delete ? '✅' : '❌';
        const p = [r.create, r.update, r.delete].filter(Boolean).length;
        total += 3;
        passed += p;
        console.log(`${config.name.padEnd(15)}${c.padEnd(10)}${u.padEnd(10)}${d.padEnd(10)}${p}/3`);
    }

    console.log('-'.repeat(55));
    console.log(`TOTAL: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    console.log('\nNota: Turnos es READ-ONLY (no incluido en test)');

    if (passed === total) {
        console.log('\n🎉 ESTRUCTURA ORGANIZACIONAL 100% COMPLETO 🎉');
    }
    console.log('='.repeat(90));
})();
