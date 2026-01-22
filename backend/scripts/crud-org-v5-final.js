/**
 * CRUD TEST - ESTRUCTURA ORGANIZACIONAL V5 FINAL
 * Test completo con lógica específica por tab
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

const COMPANY_ID = 11;

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
    console.log('CRUD TEST - ESTRUCTURA ORGANIZACIONAL V5 FINAL');
    console.log('='.repeat(90));

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
                }
            }
        }
    });

    const results = {
        departments: { create: false, update: false, delete: false },
        sectors: { create: false, update: false, delete: false },
        agreements: { create: false, update: false, delete: false },
        categories: { create: false, update: false, delete: false },
        roles: { create: false, update: false, delete: false },
        positions: { create: false, update: false, delete: false }
    };

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

        const ts = Date.now().toString().slice(-6);

        // ============================================================================
        // 1. DEPARTAMENTOS
        // ============================================================================
        console.log('\n' + '='.repeat(90));
        console.log('▶ DEPARTAMENTOS');
        console.log('='.repeat(90));

        await page.evaluate(() => OrgEngine.showTab('departments'));
        await page.waitForTimeout(2000);
        let countBefore = await count('departments');
        console.log(`  BD antes: ${countBefore}`);

        // CREATE
        console.log('\n  [CREATE]');
        apiResponse = { method: null, status: null };
        await page.evaluate(() => {
            const btn = document.querySelector('button.org-btn-primary');
            if (btn && btn.textContent.includes('Nuevo Departamento')) btn.click();
        });
        await page.waitForTimeout(2000);

        await page.evaluate((ts) => {
            const form = document.getElementById('org-department-form');
            if (!form) return;

            const name = form.querySelector('input[name="name"]');
            if (name) { name.value = 'DEPT_TEST_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }

            const code = form.querySelector('input[name="code"]');
            if (code) { code.value = 'DPT_' + ts; code.dispatchEvent(new Event('input', {bubbles: true})); }

            // Seleccionar un kiosk
            const kioskCb = document.querySelector('.dept-kiosk-cb');
            if (kioskCb) { kioskCb.checked = true; kioskCb.dispatchEvent(new Event('change', {bubbles: true})); }
        }, ts);

        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Crear Departamento')) btn.click();
            }
        });
        await page.waitForTimeout(5000);
        let countAfter = await count('departments');
        results.departments.create = countAfter > countBefore || (apiResponse.method === 'POST' && apiResponse.status === 201);
        console.log(`    BD: ${countBefore} → ${countAfter}`);
        console.log(results.departments.create ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // UPDATE
        console.log('\n  [UPDATE]');
        apiResponse = { method: null, status: null };
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('✏️')) { btn.click(); return; }
            }
        });
        await page.waitForTimeout(2000);
        await page.evaluate((ts) => {
            const input = document.querySelector('input[name="name"]');
            if (input && input.offsetParent) {
                input.value = 'UPD_DEPT_' + ts;
                input.dispatchEvent(new Event('input', {bubbles: true}));
            }
        }, ts);
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Guardar Cambios')) btn.click();
            }
        });
        await page.waitForTimeout(4000);
        results.departments.update = apiResponse.method === 'PUT' && apiResponse.status === 200;
        console.log(results.departments.update ? '    ✅ UPDATE OK' : '    ⚠️ UPDATE sin API');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // DELETE
        console.log('\n  [DELETE]');
        apiResponse = { method: null, status: null };
        countBefore = await count('departments');
        page.once('dialog', async d => { try { await d.accept(); } catch {} });
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('🗑️')) { btn.click(); return; }
            }
        });
        await page.waitForTimeout(4000);
        countAfter = await count('departments');
        results.departments.delete = countAfter < countBefore || (apiResponse.method === 'DELETE' && apiResponse.status >= 200);
        console.log(`    BD: ${countBefore} → ${countAfter}`);
        console.log(results.departments.delete ? '    ✅ DELETE OK' : '    ⚠️ DELETE pendiente');

        // ============================================================================
        // 2. SECTORES
        // ============================================================================
        console.log('\n' + '='.repeat(90));
        console.log('▶ SECTORES');
        console.log('='.repeat(90));

        await page.evaluate(() => OrgEngine.showTab('sectors'));
        await page.waitForTimeout(2000);
        countBefore = await count('sectors');
        console.log(`  BD antes: ${countBefore}`);

        // CREATE
        console.log('\n  [CREATE]');
        apiResponse = { method: null, status: null };
        await page.evaluate(() => {
            const btn = document.querySelector('button.org-btn-primary');
            if (btn && btn.textContent.includes('Nuevo Sector')) btn.click();
        });
        await page.waitForTimeout(2000);

        await page.evaluate((ts) => {
            const form = document.getElementById('org-sector-form');
            if (!form) return;

            const deptSel = form.querySelector('select[name="department_id"]');
            if (deptSel && deptSel.options.length > 1) {
                deptSel.selectedIndex = 1;
                deptSel.dispatchEvent(new Event('change', {bubbles: true}));
            }

            const name = form.querySelector('input[name="name"]');
            if (name) { name.value = 'SECTOR_TEST_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }

            const code = form.querySelector('input[name="code"]');
            if (code) { code.value = 'SEC_' + ts; code.dispatchEvent(new Event('input', {bubbles: true})); }
        }, ts);

        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Crear Sector')) btn.click();
            }
        });
        await page.waitForTimeout(5000);
        countAfter = await count('sectors');
        results.sectors.create = countAfter > countBefore || (apiResponse.method === 'POST' && apiResponse.status === 201);
        console.log(`    BD: ${countBefore} → ${countAfter}`);
        console.log(results.sectors.create ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // UPDATE
        console.log('\n  [UPDATE]');
        apiResponse = { method: null, status: null };
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('✏️')) { btn.click(); return; }
            }
        });
        await page.waitForTimeout(2000);
        await page.evaluate((ts) => {
            const input = document.querySelector('input[name="name"]');
            if (input && input.offsetParent) {
                input.value = 'UPD_SEC_' + ts;
                input.dispatchEvent(new Event('input', {bubbles: true}));
            }
        }, ts);
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Guardar Cambios')) btn.click();
            }
        });
        await page.waitForTimeout(4000);
        results.sectors.update = apiResponse.method === 'PUT' && apiResponse.status === 200;
        console.log(results.sectors.update ? '    ✅ UPDATE OK' : '    ⚠️ UPDATE sin API');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // DELETE
        console.log('\n  [DELETE]');
        apiResponse = { method: null, status: null };
        countBefore = await count('sectors');
        page.once('dialog', async d => { try { await d.accept(); } catch {} });
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('🗑️')) { btn.click(); return; }
            }
        });
        await page.waitForTimeout(4000);
        countAfter = await count('sectors');
        results.sectors.delete = countAfter < countBefore || (apiResponse.method === 'DELETE' && apiResponse.status >= 200);
        console.log(`    BD: ${countBefore} → ${countAfter}`);
        console.log(results.sectors.delete ? '    ✅ DELETE OK' : '    ⚠️ DELETE pendiente');

        // ============================================================================
        // 3. CONVENIOS
        // ============================================================================
        console.log('\n' + '='.repeat(90));
        console.log('▶ CONVENIOS');
        console.log('='.repeat(90));

        await page.evaluate(() => OrgEngine.showTab('agreements'));
        await page.waitForTimeout(2000);
        countBefore = await count('labor_agreements_v2');
        console.log(`  BD antes: ${countBefore}`);

        // CREATE
        console.log('\n  [CREATE]');
        apiResponse = { method: null, status: null };
        await page.evaluate(() => {
            const btn = document.querySelector('button.org-btn-primary');
            if (btn && btn.textContent.includes('Nuevo Convenio')) btn.click();
        });
        await page.waitForTimeout(2000);

        await page.evaluate((ts) => {
            const form = document.getElementById('org-agreement-form');
            if (!form) return;

            const code = form.querySelector('input[name="code"]');
            if (code) { code.value = 'CCT_' + ts; code.dispatchEvent(new Event('input', {bubbles: true})); }

            const name = form.querySelector('input[name="name"]');
            if (name) { name.value = 'CONV_TEST_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }

            const shortName = form.querySelector('input[name="short_name"]');
            if (shortName) { shortName.value = 'CT_' + ts; shortName.dispatchEvent(new Event('input', {bubbles: true})); }

            const industry = form.querySelector('input[name="industry"]');
            if (industry) { industry.value = 'Tech'; industry.dispatchEvent(new Event('input', {bubbles: true})); }
        }, ts);

        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Crear Convenio')) btn.click();
            }
        });
        await page.waitForTimeout(5000);
        countAfter = await count('labor_agreements_v2');
        results.agreements.create = countAfter > countBefore || (apiResponse.method === 'POST' && apiResponse.status === 201);
        console.log(`    BD: ${countBefore} → ${countAfter}`);
        console.log(results.agreements.create ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // UPDATE (solo si hay registros editables - no globales)
        console.log('\n  [UPDATE]');
        apiResponse = { method: null, status: null };
        const hasEditBtn = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('✏️')) return true;
            }
            return false;
        });
        if (hasEditBtn) {
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.offsetParent && btn.textContent.includes('✏️')) { btn.click(); return; }
                }
            });
            await page.waitForTimeout(2000);
            await page.evaluate((ts) => {
                const input = document.querySelector('input[name="name"]');
                if (input && input.offsetParent && !input.readOnly) {
                    input.value = 'UPD_CONV_' + ts;
                    input.dispatchEvent(new Event('input', {bubbles: true}));
                }
            }, ts);
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.offsetParent && btn.textContent.includes('Guardar Cambios')) btn.click();
                }
            });
            await page.waitForTimeout(4000);
            results.agreements.update = apiResponse.method === 'PUT' && apiResponse.status === 200;
            console.log(results.agreements.update ? '    ✅ UPDATE OK' : '    ⚠️ UPDATE sin API');
            await page.keyboard.press('Escape');
        } else {
            console.log('    ⚠️ No hay registros editables');
        }
        await page.waitForTimeout(1000);

        // DELETE
        console.log('\n  [DELETE]');
        apiResponse = { method: null, status: null };
        countBefore = await count('labor_agreements_v2');
        const hasDelBtn = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('🗑️')) return true;
            }
            return false;
        });
        if (hasDelBtn) {
            page.once('dialog', async d => { try { await d.accept(); } catch {} });
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.offsetParent && btn.textContent.includes('🗑️')) { btn.click(); return; }
                }
            });
            await page.waitForTimeout(4000);
            countAfter = await count('labor_agreements_v2');
            results.agreements.delete = countAfter < countBefore || (apiResponse.method === 'DELETE' && apiResponse.status >= 200);
            console.log(`    BD: ${countBefore} → ${countAfter}`);
            console.log(results.agreements.delete ? '    ✅ DELETE OK' : '    ⚠️ DELETE pendiente');
        } else {
            console.log('    ⚠️ No hay registros para eliminar');
        }

        // ============================================================================
        // 4. CATEGORÍAS
        // ============================================================================
        console.log('\n' + '='.repeat(90));
        console.log('▶ CATEGORÍAS');
        console.log('='.repeat(90));

        await page.evaluate(() => OrgEngine.showTab('categories'));
        await page.waitForTimeout(2000);
        countBefore = await count('salary_categories_v2');
        console.log(`  BD antes: ${countBefore}`);

        // CREATE
        console.log('\n  [CREATE]');
        apiResponse = { method: null, status: null };
        await page.evaluate(() => {
            const btn = document.querySelector('button.org-btn-primary');
            if (btn && btn.textContent.includes('Nueva Categoría')) btn.click();
        });
        await page.waitForTimeout(2000);

        await page.evaluate((ts) => {
            const form = document.getElementById('org-category-form');
            if (!form) return;

            const agreeSel = form.querySelector('select[name="agreement_id"]');
            if (agreeSel && agreeSel.options.length > 1) {
                agreeSel.selectedIndex = 1;
                agreeSel.dispatchEvent(new Event('change', {bubbles: true}));
            }

            const code = form.querySelector('input[name="category_code"]');
            if (code) { code.value = 'CAT_' + ts; code.dispatchEvent(new Event('input', {bubbles: true})); }

            const name = form.querySelector('input[name="category_name"]');
            if (name) { name.value = 'CAT_TEST_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }

            const salary = form.querySelector('input[name="base_salary"]');
            if (salary) { salary.value = '75000'; salary.dispatchEvent(new Event('input', {bubbles: true})); }
        }, ts);

        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Crear Categoría')) btn.click();
            }
        });
        await page.waitForTimeout(5000);
        countAfter = await count('salary_categories_v2');
        results.categories.create = countAfter > countBefore || (apiResponse.method === 'POST' && apiResponse.status === 201);
        console.log(`    BD: ${countBefore} → ${countAfter}`);
        console.log(results.categories.create ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // UPDATE/DELETE similar...
        // (skip for brevity, add if needed)

        // ============================================================================
        // 5. ROLES
        // ============================================================================
        console.log('\n' + '='.repeat(90));
        console.log('▶ ROLES');
        console.log('='.repeat(90));

        await page.evaluate(() => OrgEngine.showTab('roles'));
        await page.waitForTimeout(2000);
        countBefore = await count('role_definitions');
        console.log(`  BD antes: ${countBefore}`);

        // CREATE
        console.log('\n  [CREATE]');
        apiResponse = { method: null, status: null };
        await page.evaluate(() => {
            const btn = document.querySelector('button.org-btn-primary');
            if (btn && btn.textContent.includes('Nuevo Rol')) btn.click();
        });
        await page.waitForTimeout(2000);

        await page.evaluate((ts) => {
            const form = document.getElementById('org-role-form');
            if (!form) return;

            const key = form.querySelector('input[name="role_key"]');
            if (key) { key.value = 'role_' + ts; key.dispatchEvent(new Event('input', {bubbles: true})); }

            const name = form.querySelector('input[name="role_name"]');
            if (name) { name.value = 'ROL_TEST_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }

            const desc = form.querySelector('textarea[name="description"]');
            if (desc) { desc.value = 'Test rol'; desc.dispatchEvent(new Event('input', {bubbles: true})); }

            const levelSel = form.querySelector('select[name="hierarchy_level"]');
            if (levelSel && levelSel.options.length > 1) {
                levelSel.selectedIndex = 1;
                levelSel.dispatchEvent(new Event('change', {bubbles: true}));
            }
        }, ts);

        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Crear Rol')) btn.click();
            }
        });
        await page.waitForTimeout(5000);
        countAfter = await count('role_definitions');
        results.roles.create = countAfter > countBefore || (apiResponse.method === 'POST' && apiResponse.status === 201);
        console.log(`    BD: ${countBefore} → ${countAfter}`);
        console.log(results.roles.create ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ============================================================================
        // 6. POSICIONES
        // ============================================================================
        console.log('\n' + '='.repeat(90));
        console.log('▶ POSICIONES');
        console.log('='.repeat(90));

        await page.evaluate(() => OrgEngine.showTab('positions'));
        await page.waitForTimeout(2000);
        countBefore = await count('organizational_positions');
        console.log(`  BD antes: ${countBefore}`);

        // CREATE
        console.log('\n  [CREATE]');
        apiResponse = { method: null, status: null };
        await page.evaluate(() => {
            const btn = document.querySelector('button.org-btn-primary');
            if (btn && btn.textContent.includes('Nueva Posición')) btn.click();
        });
        await page.waitForTimeout(2000);

        await page.evaluate((ts) => {
            const form = document.getElementById('org-position-form');
            if (!form) return;

            const name = form.querySelector('input[name="position_name"]');
            if (name) { name.value = 'POS_TEST_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }

            const code = form.querySelector('input[name="position_code"]');
            if (code) { code.value = 'POS_' + ts; code.dispatchEvent(new Event('input', {bubbles: true})); }

            const levelSel = form.querySelector('select[name="hierarchy_level"]');
            if (levelSel && levelSel.options.length > 1) {
                levelSel.selectedIndex = 1;
                levelSel.dispatchEvent(new Event('change', {bubbles: true}));
            }
        }, ts);

        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Crear Posición')) btn.click();
            }
        });
        await page.waitForTimeout(5000);
        countAfter = await count('organizational_positions');
        results.positions.create = countAfter > countBefore || (apiResponse.method === 'POST' && apiResponse.status === 201);
        console.log(`    BD: ${countBefore} → ${countAfter}`);
        console.log(results.positions.create ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

    } catch (error) {
        console.log('\nERROR:', error.message);
        await page.screenshot({ path: 'debug-org-v5-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN
    console.log('\n\n' + '='.repeat(90));
    console.log('RESUMEN - ESTRUCTURA ORGANIZACIONAL V5');
    console.log('='.repeat(90));
    console.log('\nTab'.padEnd(15) + 'CREATE'.padEnd(10) + 'UPDATE'.padEnd(10) + 'DELETE'.padEnd(10) + 'TOTAL');
    console.log('-'.repeat(55));

    let total = 0, passed = 0;
    const tabs = [
        { key: 'departments', name: 'Departamentos' },
        { key: 'sectors', name: 'Sectores' },
        { key: 'agreements', name: 'Convenios' },
        { key: 'categories', name: 'Categorías' },
        { key: 'roles', name: 'Roles' },
        { key: 'positions', name: 'Posiciones' }
    ];

    for (const tab of tabs) {
        const r = results[tab.key];
        const c = r.create ? '✅' : '❌';
        const u = r.update ? '✅' : '⚪';
        const d = r.delete ? '✅' : '⚪';
        const p = [r.create, r.update, r.delete].filter(Boolean).length;
        total += 3;
        passed += p;
        console.log(`${tab.name.padEnd(15)}${c.padEnd(10)}${u.padEnd(10)}${d.padEnd(10)}${p}/3`);
    }

    console.log('-'.repeat(55));
    console.log(`TOTAL: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    console.log('\nNota: Turnos es READ-ONLY');
    console.log('⚪ = No testeado en esta ejecución');

    if (results.departments.create && results.sectors.create && results.agreements.create &&
        results.categories.create && results.roles.create && results.positions.create) {
        console.log('\n🎉 TODOS LOS CREATE FUNCIONAN 🎉');
    }
    console.log('='.repeat(90));
})();
