/**
 * CRUD VERIFICATION - Estructura Organizacional
 * Tests all operations using company-specific records
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

(async () => {
    console.log('='.repeat(80));
    console.log('CRUD FINAL VERIFICATION - ESTRUCTURA ORGANIZACIONAL');
    console.log('='.repeat(80));

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    let apiResponse = {};
    page.on('response', async r => {
        if (r.url().includes('/api/')) {
            const method = r.request().method();
            const status = r.status();
            if (['POST', 'PUT', 'DELETE'].includes(method)) {
                apiResponse = { method, status };
                console.log(`      📡 ${method} ${status}: ${r.url().split('/api/')[1]?.substring(0, 50)}`);
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
        console.log('\n▶ LOGIN');
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
        console.log('  ✓ OK');

        await page.click('text=Estructura Organizacional');
        await page.waitForTimeout(4000);

        const ts = Date.now().toString().slice(-6);

        // =========================================================================
        // 1. DEPARTAMENTOS - Full CRUD
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ DEPARTAMENTOS');
        console.log('═'.repeat(60));

        await page.evaluate(() => OrgEngine.showTab('departments'));
        await page.waitForTimeout(2000);

        // CREATE
        console.log('  [CREATE]');
        apiResponse = {};
        await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Nuevo Departamento'));
            if (btn) btn.click();
        });
        await page.waitForTimeout(2000);
        await page.evaluate((ts) => {
            const form = document.getElementById('org-department-form');
            if (!form) return;
            const name = form.querySelector('input[name="name"]');
            if (name) { name.value = 'DEPT_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }
            // Select a kiosk to satisfy validation
            const kioskCb = form.querySelector('.dept-kiosk-cb');
            if (kioskCb) kioskCb.checked = true;
        }, ts);
        await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.offsetParent && b.textContent.includes('Crear Departamento'));
            if (btn) btn.click();
        });
        await page.waitForTimeout(5000);
        results.departments.create = apiResponse.method === 'POST' && apiResponse.status === 201;
        console.log(results.departments.create ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // UPDATE - Find department created by this company
        console.log('  [UPDATE]');
        apiResponse = {};
        const deptId = await page.evaluate(() => {
            const dept = OrgState.departments.find(d => d.company_id === 11);
            return dept?.id;
        });
        if (deptId) {
            await page.evaluate((id) => OrgEngine.openDepartmentModal(id), deptId);
            await page.waitForTimeout(2000);
            await page.evaluate((ts) => {
                const form = document.getElementById('org-department-form');
                const name = form?.querySelector('input[name="name"]');
                if (name) { name.value = 'DEPT_UPD_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }
            }, ts);
            await page.evaluate(() => {
                const btn = [...document.querySelectorAll('button')].find(b => b.offsetParent && b.textContent.includes('Guardar Cambios'));
                if (btn) btn.click();
            });
            await page.waitForTimeout(4000);
            results.departments.update = apiResponse.method === 'PUT' && apiResponse.status === 200;
        }
        console.log(results.departments.update ? '    ✅ UPDATE OK' : '    ❌ UPDATE FAIL');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // DELETE
        console.log('  [DELETE]');
        apiResponse = {};
        page.on('dialog', async d => { await d.accept(); });
        await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.offsetParent && b.textContent.includes('🗑️'));
            if (btn) btn.click();
        });
        await page.waitForTimeout(4000);
        results.departments.delete = apiResponse.method === 'DELETE' && apiResponse.status === 200;
        console.log(results.departments.delete ? '    ✅ DELETE OK' : '    ❌ DELETE FAIL');

        // =========================================================================
        // 2. SECTORES - Full CRUD
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ SECTORES');
        console.log('═'.repeat(60));

        await page.evaluate(() => OrgEngine.showTab('sectors'));
        await page.waitForTimeout(2000);

        // CREATE
        console.log('  [CREATE]');
        apiResponse = {};
        await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Nuevo Sector'));
            if (btn) btn.click();
        });
        await page.waitForTimeout(2000);
        await page.evaluate((ts) => {
            const form = document.getElementById('org-sector-form');
            if (!form) return;
            const deptSel = form.querySelector('select[name="department_id"]');
            if (deptSel && deptSel.options.length > 1) deptSel.selectedIndex = 1;
            const name = form.querySelector('input[name="name"]');
            if (name) { name.value = 'SECTOR_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }
        }, ts);
        await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.offsetParent && b.textContent.includes('Crear Sector'));
            if (btn) btn.click();
        });
        await page.waitForTimeout(5000);
        results.sectors.create = apiResponse.method === 'POST' && apiResponse.status === 201;
        console.log(results.sectors.create ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // UPDATE
        console.log('  [UPDATE]');
        apiResponse = {};
        const sectorId = await page.evaluate(() => {
            const sector = OrgState.sectors.find(s => s.company_id === 11);
            return sector?.id;
        });
        if (sectorId) {
            await page.evaluate((id) => OrgEngine.openSectorModal(id), sectorId);
            await page.waitForTimeout(2000);
            await page.evaluate((ts) => {
                const form = document.getElementById('org-sector-form');
                const name = form?.querySelector('input[name="name"]');
                if (name) { name.value = 'SECTOR_UPD_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }
            }, ts);
            await page.evaluate(() => OrgEngine.saveSector());
            await page.waitForTimeout(4000);
            results.sectors.update = apiResponse.method === 'PUT' && apiResponse.status === 200;
        }
        console.log(results.sectors.update ? '    ✅ UPDATE OK' : '    ❌ UPDATE FAIL');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // DELETE
        console.log('  [DELETE]');
        apiResponse = {};
        await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.offsetParent && b.textContent.includes('🗑️'));
            if (btn) btn.click();
        });
        await page.waitForTimeout(4000);
        results.sectors.delete = apiResponse.method === 'DELETE' && apiResponse.status === 200;
        console.log(results.sectors.delete ? '    ✅ DELETE OK' : '    ❌ DELETE FAIL');

        // =========================================================================
        // 3. CONVENIOS - Full CRUD (company-specific only)
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ CONVENIOS');
        console.log('═'.repeat(60));

        await page.evaluate(() => OrgEngine.showTab('agreements'));
        await page.waitForTimeout(2000);

        // CREATE
        console.log('  [CREATE]');
        apiResponse = {};
        await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Nuevo Convenio'));
            if (btn) btn.click();
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
            const btn = [...document.querySelectorAll('button')].find(b => b.offsetParent && b.textContent.includes('Crear Convenio'));
            if (btn) btn.click();
        });
        await page.waitForTimeout(5000);
        results.agreements.create = apiResponse.method === 'POST' && apiResponse.status === 201;
        console.log(results.agreements.create ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // UPDATE - Find company-specific agreement
        console.log('  [UPDATE]');
        apiResponse = {};
        const agreeId = await page.evaluate(() => {
            const agree = OrgState.agreements.find(a => a.company_id === 11);
            return agree?.id;
        });
        if (agreeId) {
            await page.evaluate((id) => OrgEngine.openAgreementModal(id), agreeId);
            await page.waitForTimeout(2000);
            await page.evaluate((ts) => {
                const form = document.getElementById('org-agreement-form');
                const name = form?.querySelector('input[name="name"]');
                if (name) { name.value = 'CONV_UPD_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }
            }, ts);
            await page.evaluate(() => OrgEngine.saveAgreement());
            await page.waitForTimeout(4000);
            results.agreements.update = apiResponse.method === 'PUT' && apiResponse.status === 200;
        } else {
            console.log('    ⚠️ No hay convenios de empresa (solo globales)');
        }
        console.log(results.agreements.update ? '    ✅ UPDATE OK' : '    ❌ UPDATE FAIL');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // DELETE
        console.log('  [DELETE]');
        apiResponse = {};
        const agreeIdDel = await page.evaluate(() => {
            const agree = OrgState.agreements.find(a => a.company_id === 11);
            return agree?.id;
        });
        if (agreeIdDel) {
            await page.evaluate((id) => OrgEngine.deleteAgreement(id), agreeIdDel);
            await page.waitForTimeout(4000);
            results.agreements.delete = apiResponse.method === 'DELETE' && apiResponse.status === 200;
        }
        console.log(results.agreements.delete ? '    ✅ DELETE OK' : '    ❌ DELETE FAIL');

        // =========================================================================
        // 4. CATEGORÍAS - Full CRUD (company-specific only)
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ CATEGORÍAS');
        console.log('═'.repeat(60));

        await page.evaluate(() => OrgEngine.showTab('categories'));
        await page.waitForTimeout(2000);

        // CREATE
        console.log('  [CREATE]');
        apiResponse = {};
        await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Nueva Categoría'));
            if (btn) btn.click();
        });
        await page.waitForTimeout(2000);
        await page.evaluate((ts) => {
            const form = document.getElementById('org-category-form');
            if (!form) return;
            const agreeSel = form.querySelector('select[name="agreement_id"]');
            if (agreeSel && agreeSel.options.length > 1) agreeSel.selectedIndex = 1;
            const code = form.querySelector('input[name="category_code"]');
            if (code) { code.value = 'CAT_' + ts; code.dispatchEvent(new Event('input', {bubbles: true})); }
            const name = form.querySelector('input[name="category_name"]');
            if (name) { name.value = 'CAT_NAME_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }
            const salary = form.querySelector('input[name="base_salary"]');
            if (salary) { salary.value = '50000'; salary.dispatchEvent(new Event('input', {bubbles: true})); }
        }, ts);
        await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.offsetParent && b.textContent.includes('Crear Categoría'));
            if (btn) btn.click();
        });
        await page.waitForTimeout(5000);
        results.categories.create = apiResponse.method === 'POST' && apiResponse.status === 201;
        console.log(results.categories.create ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // UPDATE - Find company-specific category
        console.log('  [UPDATE]');
        apiResponse = {};
        const catId = await page.evaluate(() => {
            const cat = OrgState.categories.find(c => c.company_id === 11);
            return cat?.category_id || cat?.id;
        });
        if (catId) {
            await page.evaluate((id) => OrgEngine.openCategoryModal(id), catId);
            await page.waitForTimeout(2000);
            await page.evaluate((ts) => {
                const form = document.getElementById('org-category-form');
                const name = form?.querySelector('input[name="category_name"]');
                if (name) { name.value = 'CAT_UPD_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }
            }, ts);
            await page.evaluate(() => OrgEngine.saveCategory());
            await page.waitForTimeout(4000);
            results.categories.update = apiResponse.method === 'PUT' && apiResponse.status === 200;
        }
        console.log(results.categories.update ? '    ✅ UPDATE OK' : '    ❌ UPDATE FAIL');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // DELETE
        console.log('  [DELETE]');
        apiResponse = {};
        const catIdDel = await page.evaluate(() => {
            const cat = OrgState.categories.find(c => c.company_id === 11);
            return cat?.category_id || cat?.id;
        });
        if (catIdDel) {
            await page.evaluate((id) => OrgEngine.deleteCategory(id), catIdDel);
            await page.waitForTimeout(4000);
            results.categories.delete = apiResponse.method === 'DELETE' && apiResponse.status === 200;
        }
        console.log(results.categories.delete ? '    ✅ DELETE OK' : '    ❌ DELETE FAIL');

        // =========================================================================
        // 5. ROLES - Full CRUD (company-specific only)
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ ROLES');
        console.log('═'.repeat(60));

        await page.evaluate(() => OrgEngine.showTab('roles'));
        await page.waitForTimeout(2000);

        // CREATE
        console.log('  [CREATE]');
        apiResponse = {};
        await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Nuevo Rol'));
            if (btn) btn.click();
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
            const btn = [...document.querySelectorAll('button')].find(b => b.offsetParent && b.textContent.includes('Crear Rol'));
            if (btn) btn.click();
        });
        await page.waitForTimeout(5000);
        results.roles.create = apiResponse.method === 'POST' && apiResponse.status === 201;
        console.log(results.roles.create ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // UPDATE - Find company-specific role
        console.log('  [UPDATE]');
        apiResponse = {};
        const roleId = await page.evaluate(() => {
            const role = OrgState.roles.find(r => r.company_id === 11);
            return role?.id;
        });
        if (roleId) {
            await page.evaluate((id) => OrgEngine.openRoleModal(id), roleId);
            await page.waitForTimeout(2000);
            await page.evaluate((ts) => {
                const form = document.getElementById('org-role-form');
                const name = form?.querySelector('input[name="role_name"]');
                if (name) { name.value = 'ROLE_UPD_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }
            }, ts);
            await page.evaluate(() => OrgEngine.saveRole());
            await page.waitForTimeout(4000);
            results.roles.update = apiResponse.method === 'PUT' && apiResponse.status === 200;
        }
        console.log(results.roles.update ? '    ✅ UPDATE OK' : '    ❌ UPDATE FAIL');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // DELETE
        console.log('  [DELETE]');
        apiResponse = {};
        const roleIdDel = await page.evaluate(() => {
            const role = OrgState.roles.find(r => r.company_id === 11);
            return role?.id;
        });
        if (roleIdDel) {
            await page.evaluate((id) => OrgEngine.deleteRole(id), roleIdDel);
            await page.waitForTimeout(4000);
            results.roles.delete = apiResponse.method === 'DELETE' && apiResponse.status === 200;
        }
        console.log(results.roles.delete ? '    ✅ DELETE OK' : '    ❌ DELETE FAIL');

        // =========================================================================
        // 6. POSICIONES - Full CRUD
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ POSICIONES');
        console.log('═'.repeat(60));

        await page.evaluate(() => OrgEngine.showTab('positions'));
        await page.waitForTimeout(2000);

        // CREATE
        console.log('  [CREATE]');
        apiResponse = {};
        await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Nueva Posición'));
            if (btn) btn.click();
        });
        await page.waitForTimeout(2000);
        await page.evaluate((ts) => {
            const form = document.getElementById('org-position-form');
            if (!form) return;
            const name = form.querySelector('input[name="position_name"]');
            if (name) { name.value = 'POS_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }
        }, ts);
        await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.offsetParent && b.textContent.includes('Crear Posición'));
            if (btn) btn.click();
        });
        await page.waitForTimeout(5000);
        results.positions.create = apiResponse.method === 'POST' && apiResponse.status === 201;
        console.log(results.positions.create ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // UPDATE
        console.log('  [UPDATE]');
        apiResponse = {};
        const posId = await page.evaluate(async () => {
            const response = await fetch('/api/v1/organizational/positions?company_id=11', {
                headers: { 'Authorization': `Bearer ${OrgAPI.getToken()}` }
            });
            const result = await response.json();
            const positions = result.data || result.positions || [];
            return positions[0]?.id;
        });
        if (posId) {
            await page.evaluate((id) => OrgEngine.openPositionModal(id), posId);
            await page.waitForTimeout(2000);
            await page.evaluate((ts) => {
                const form = document.getElementById('org-position-form');
                const name = form?.querySelector('input[name="position_name"]');
                if (name) { name.value = 'POS_UPD_' + ts; name.dispatchEvent(new Event('input', {bubbles: true})); }
            }, ts);
            await page.evaluate(() => OrgEngine.savePosition());
            await page.waitForTimeout(4000);
            results.positions.update = apiResponse.method === 'PUT' && apiResponse.status === 200;
        }
        console.log(results.positions.update ? '    ✅ UPDATE OK' : '    ❌ UPDATE FAIL');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // DELETE
        console.log('  [DELETE]');
        apiResponse = {};
        if (posId) {
            await page.evaluate((id) => OrgEngine.deletePosition(id), posId);
            await page.waitForTimeout(4000);
            results.positions.delete = apiResponse.method === 'DELETE' && (apiResponse.status === 200 || apiResponse.status === 204);
        }
        console.log(results.positions.delete ? '    ✅ DELETE OK' : '    ❌ DELETE FAIL');

    } catch (error) {
        console.log('\nERROR:', error.message);
        await page.screenshot({ path: 'crud-final-error.png' });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN
    console.log('\n' + '═'.repeat(80));
    console.log('RESUMEN FINAL - ESTRUCTURA ORGANIZACIONAL');
    console.log('═'.repeat(80));

    let total = 0, passed = 0;
    const tabs = ['departments', 'sectors', 'agreements', 'categories', 'roles', 'positions'];
    const names = ['Departamentos', 'Sectores', 'Convenios', 'Categorías', 'Roles', 'Posiciones'];

    console.log('\nTab           CREATE    UPDATE    DELETE    TOTAL');
    console.log('-'.repeat(55));

    tabs.forEach((tab, i) => {
        const c = results[tab].create ? '✅' : '❌';
        const u = results[tab].update ? '✅' : '❌';
        const d = results[tab].delete ? '✅' : '❌';
        const t = (results[tab].create ? 1 : 0) + (results[tab].update ? 1 : 0) + (results[tab].delete ? 1 : 0);
        total += 3;
        passed += t;
        console.log(`${names[i].padEnd(14)} ${c}         ${u}         ${d}         ${t}/3`);
    });

    console.log('-'.repeat(55));
    const pct = Math.round((passed / total) * 100);
    console.log(`TOTAL: ${passed}/${total} (${pct}%)`);
    console.log('\nNota: Turnos es READ-ONLY (no incluido)');
    console.log('═'.repeat(80));
})();
