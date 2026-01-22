/**
 * CRUD TEST - ESTRUCTURA ORGANIZACIONAL V6 COMPLETE
 * Test completo CREATE, UPDATE, DELETE para todos los tabs
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
    console.log('CRUD TEST - ESTRUCTURA ORGANIZACIONAL V6 COMPLETE');
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

        // Helper para test UPDATE
        async function testUpdate(tabName, saveBtn) {
            apiResponse = { method: null, status: null };
            const editClicked = await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.offsetParent && btn.textContent.includes('✏️')) { btn.click(); return true; }
                }
                return false;
            });
            if (!editClicked) {
                console.log('    ⚠️ No hay botón editar');
                return false;
            }
            console.log('    ✓ Modal editar abierto');
            await page.waitForTimeout(2000);

            // Modificar primer input
            await page.evaluate((ts) => {
                const inputs = document.querySelectorAll('input[type="text"]');
                for (const input of inputs) {
                    if (!input.offsetParent || input.disabled || input.readOnly) continue;
                    if (input.name && !input.name.includes('id')) {
                        input.value = 'UPD_' + ts;
                        input.dispatchEvent(new Event('input', {bubbles: true}));
                        return;
                    }
                }
            }, ts);

            await page.evaluate((saveText) => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.offsetParent && btn.textContent.includes(saveText)) btn.click();
                }
            }, saveBtn);
            await page.waitForTimeout(4000);

            const ok = apiResponse.method === 'PUT' && apiResponse.status === 200;
            console.log(ok ? '    ✅ UPDATE OK' : '    ⚠️ UPDATE sin confirmación API');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
            return ok;
        }

        // Helper para test DELETE
        async function testDelete(table) {
            apiResponse = { method: null, status: null };
            const countBefore = await count(table);
            const dialogHandler = async d => { try { await d.accept(); } catch {} };
            page.on('dialog', dialogHandler);

            const deleteClicked = await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.offsetParent && btn.textContent.includes('🗑️')) { btn.click(); return true; }
                }
                return false;
            });
            if (!deleteClicked) {
                page.removeListener('dialog', dialogHandler);
                console.log('    ⚠️ No hay botón eliminar');
                return false;
            }
            console.log('    ✓ Click eliminar');
            await page.waitForTimeout(4000);

            page.removeListener('dialog', dialogHandler);
            const countAfter = await count(table);
            const ok = countAfter < countBefore || (apiResponse.method === 'DELETE' && apiResponse.status >= 200);
            console.log(`    BD: ${countBefore} → ${countAfter}`);
            console.log(ok ? '    ✅ DELETE OK' : '    ⚠️ DELETE pendiente');
            return ok;
        }

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
            if (name) { name.value = 'DEPT_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }
            const kioskCb = document.querySelector('.dept-kiosk-cb');
            if (kioskCb) { kioskCb.checked = true; kioskCb.dispatchEvent(new Event('change', {bubbles: true})); }
        }, ts);
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) { if (btn.offsetParent && btn.textContent.includes('Crear Departamento')) btn.click(); }
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
        results.departments.update = await testUpdate('departments', 'Guardar Cambios');

        // DELETE
        console.log('\n  [DELETE]');
        results.departments.delete = await testDelete('departments');

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
            if (deptSel && deptSel.options.length > 1) { deptSel.selectedIndex = 1; deptSel.dispatchEvent(new Event('change', {bubbles: true})); }
            const name = form.querySelector('input[name="name"]');
            if (name) { name.value = 'SECTOR_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }
        }, ts);
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) { if (btn.offsetParent && btn.textContent.includes('Crear Sector')) btn.click(); }
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
        results.sectors.update = await testUpdate('sectors', 'Guardar Cambios');

        // DELETE
        console.log('\n  [DELETE]');
        results.sectors.delete = await testDelete('sectors');

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
            if (name) { name.value = 'CONV_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }
        }, ts);
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) { if (btn.offsetParent && btn.textContent.includes('Crear Convenio')) btn.click(); }
        });
        await page.waitForTimeout(5000);
        countAfter = await count('labor_agreements_v2');
        results.agreements.create = countAfter > countBefore || (apiResponse.method === 'POST' && apiResponse.status === 201);
        console.log(`    BD: ${countBefore} → ${countAfter}`);
        console.log(results.agreements.create ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // UPDATE - buscar registros no globales
        console.log('\n  [UPDATE]');
        results.agreements.update = await testUpdate('agreements', 'Guardar Cambios');

        // DELETE
        console.log('\n  [DELETE]');
        results.agreements.delete = await testDelete('labor_agreements_v2');

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
            if (agreeSel && agreeSel.options.length > 1) { agreeSel.selectedIndex = 1; agreeSel.dispatchEvent(new Event('change', {bubbles: true})); }
            const code = form.querySelector('input[name="category_code"]');
            if (code) { code.value = 'CAT_' + ts; code.dispatchEvent(new Event('input', {bubbles: true})); }
            const name = form.querySelector('input[name="category_name"]');
            if (name) { name.value = 'CAT_NAME_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }
            const salary = form.querySelector('input[name="base_salary"]');
            if (salary) { salary.value = '50000'; salary.dispatchEvent(new Event('input', {bubbles: true})); }
        }, ts);
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) { if (btn.offsetParent && btn.textContent.includes('Crear Categoría')) btn.click(); }
        });
        await page.waitForTimeout(5000);
        countAfter = await count('salary_categories_v2');
        results.categories.create = countAfter > countBefore || (apiResponse.method === 'POST' && apiResponse.status === 201);
        console.log(`    BD: ${countBefore} → ${countAfter}`);
        console.log(results.categories.create ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // UPDATE
        console.log('\n  [UPDATE]');
        results.categories.update = await testUpdate('categories', 'Guardar Cambios');

        // DELETE
        console.log('\n  [DELETE]');
        results.categories.delete = await testDelete('salary_categories_v2');

        // ============================================================================
        // 5. ROLES
        // ============================================================================
        console.log('\n' + '='.repeat(90));
        console.log('▶ ROLES');
        console.log('='.repeat(90));

        await page.evaluate(() => OrgEngine.showTab('roles'));
        await page.waitForTimeout(2000);
        countBefore = await count('additional_role_types');
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
            if (name) { name.value = 'ROLE_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }
        }, ts);
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) { if (btn.offsetParent && btn.textContent.includes('Crear Rol')) btn.click(); }
        });
        await page.waitForTimeout(5000);
        countAfter = await count('additional_role_types');
        results.roles.create = countAfter > countBefore || (apiResponse.method === 'POST' && apiResponse.status === 201);
        console.log(`    BD: ${countBefore} → ${countAfter}`);
        console.log(results.roles.create ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // UPDATE
        console.log('\n  [UPDATE]');
        results.roles.update = await testUpdate('roles', 'Guardar Cambios');

        // DELETE
        console.log('\n  [DELETE]');
        results.roles.delete = await testDelete('additional_role_types');

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
            if (name) { name.value = 'POS_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }
            const code = form.querySelector('input[name="position_code"]');
            if (code) { code.value = 'PC_' + ts; code.dispatchEvent(new Event('input', {bubbles: true})); }
            const levelSel = form.querySelector('select[name="hierarchy_level"]');
            if (levelSel && levelSel.options.length > 1) { levelSel.selectedIndex = 1; levelSel.dispatchEvent(new Event('change', {bubbles: true})); }
        }, ts);
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) { if (btn.offsetParent && btn.textContent.includes('Crear Posición')) btn.click(); }
        });
        await page.waitForTimeout(5000);
        countAfter = await count('organizational_positions');
        results.positions.create = countAfter > countBefore || (apiResponse.method === 'POST' && apiResponse.status === 201);
        console.log(`    BD: ${countBefore} → ${countAfter}`);
        console.log(results.positions.create ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // UPDATE
        console.log('\n  [UPDATE]');
        results.positions.update = await testUpdate('positions', 'Guardar Cambios');

        // DELETE
        console.log('\n  [DELETE]');
        results.positions.delete = await testDelete('organizational_positions');

    } catch (error) {
        console.log('\nERROR:', error.message);
        await page.screenshot({ path: 'debug-org-v6-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN
    console.log('\n\n' + '='.repeat(90));
    console.log('RESUMEN - ESTRUCTURA ORGANIZACIONAL V6 COMPLETE');
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
        const u = r.update ? '✅' : '❌';
        const d = r.delete ? '✅' : '❌';
        const p = [r.create, r.update, r.delete].filter(Boolean).length;
        total += 3;
        passed += p;
        console.log(`${tab.name.padEnd(15)}${c.padEnd(10)}${u.padEnd(10)}${d.padEnd(10)}${p}/3`);
    }

    console.log('-'.repeat(55));
    console.log(`TOTAL: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    console.log('\nNota: Turnos es READ-ONLY (no incluido)');

    if (passed === total) {
        console.log('\n🎉 ESTRUCTURA ORGANIZACIONAL 100% COMPLETO 🎉');
    } else if (passed >= total * 0.8) {
        console.log('\n✨ CRUD mayormente funcional (>80%)');
    }
    console.log('='.repeat(90));
})();
