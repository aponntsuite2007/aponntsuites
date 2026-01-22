/**
 * DEBUG - TEST ALL UPDATE OPERATIONS
 */
const { chromium } = require('playwright');

(async () => {
    console.log('='.repeat(80));
    console.log('DEBUG - TEST ALL UPDATE OPERATIONS');
    console.log('='.repeat(80));

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    page.on('response', async r => {
        if (r.url().includes('/api/')) {
            const method = r.request().method();
            const status = r.status();
            if (['PUT', 'POST'].includes(method)) {
                console.log(`  📡 ${method} ${status}: ${r.url().split('/api/')[1]?.substring(0, 60)}`);
                if (status >= 400) {
                    try {
                        const body = await r.text();
                        console.log(`     ERROR: ${body.substring(0, 200)}`);
                    } catch {}
                }
            }
        }
    });

    const results = { sectors: false, categories: false, roles: false };

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

        // NAVEGAR
        await page.click('text=Estructura Organizacional');
        await page.waitForTimeout(4000);

        const ts = Date.now().toString().slice(-6);

        // =========================================================================
        // 1. SECTORS UPDATE
        // =========================================================================
        console.log('\n' + '='.repeat(60));
        console.log('TEST: SECTORS UPDATE');
        console.log('='.repeat(60));

        await page.evaluate(() => OrgEngine.showTab('sectors'));
        await page.waitForTimeout(2000);

        const sectorCount = await page.evaluate(() => OrgState.sectors?.length || 0);
        if (sectorCount > 0) {
            const firstSector = await page.evaluate(() => OrgState.sectors[0]);
            console.log(`  Editando sector ID: ${firstSector.id}`);

            // Open edit modal
            await page.evaluate((id) => OrgEngine.openSectorModal(id), firstSector.id);
            await page.waitForTimeout(1500);

            // Modify name
            const newName = 'UPDATED_' + ts;
            await page.evaluate((name) => {
                const form = document.getElementById('org-sector-form');
                const input = form.querySelector('input[name="name"]');
                if (input) input.value = name;
            }, newName);

            // Save
            await page.evaluate(() => OrgEngine.saveSector());
            await page.waitForTimeout(3000);

            // Verify
            const updated = await page.evaluate((id) => OrgState.sectors.find(s => s.id === id), firstSector.id);
            if (updated && updated.name === newName) {
                console.log(`  ✅ SECTOR UPDATE OK: ${newName}`);
                results.sectors = true;
            } else {
                console.log(`  ❌ SECTOR UPDATE FAILED`);
            }
        } else {
            console.log('  ⚠️ No sectors to edit');
        }

        // =========================================================================
        // 2. CATEGORIES UPDATE
        // =========================================================================
        console.log('\n' + '='.repeat(60));
        console.log('TEST: CATEGORIES UPDATE');
        console.log('='.repeat(60));

        await page.evaluate(() => OrgEngine.showTab('categories'));
        await page.waitForTimeout(2000);

        const catCount = await page.evaluate(() => OrgState.categories?.length || 0);
        if (catCount > 0) {
            // Buscar una categoría que pertenezca a la empresa actual (company_id = 11)
            const firstCat = await page.evaluate(() => OrgState.categories.find(c => c.company_id === 11) || OrgState.categories[0]);
            console.log(`  Editando categoría ID: ${firstCat.category_id}, company_id: ${firstCat.company_id}, name: ${firstCat.category_name}`);

            // Open edit modal
            await page.evaluate((id) => OrgEngine.openCategoryModal(id), firstCat.category_id);
            await page.waitForTimeout(1500);

            // Modify name
            const newName = 'UPDATED_CAT_' + ts;
            await page.evaluate((name) => {
                const form = document.getElementById('org-category-form');
                const input = form.querySelector('input[name="category_name"]');
                if (input) input.value = name;
            }, newName);

            // Save
            await page.evaluate(() => OrgEngine.saveCategory());
            await page.waitForTimeout(3000);

            // Verify
            const updated = await page.evaluate((id) => OrgState.categories.find(c => c.category_id === id), firstCat.category_id);
            if (updated && updated.category_name === newName) {
                console.log(`  ✅ CATEGORY UPDATE OK: ${newName}`);
                results.categories = true;
            } else {
                console.log(`  ❌ CATEGORY UPDATE FAILED`);
                console.log(`     Expected: ${newName}, Got: ${updated?.category_name}`);
            }
        } else {
            console.log('  ⚠️ No categories to edit');
        }

        // =========================================================================
        // 3. ROLES UPDATE
        // =========================================================================
        console.log('\n' + '='.repeat(60));
        console.log('TEST: ROLES UPDATE');
        console.log('='.repeat(60));

        await page.evaluate(() => OrgEngine.showTab('roles'));
        await page.waitForTimeout(2000);

        const roleCount = await page.evaluate(() => OrgState.roles?.length || 0);
        if (roleCount > 0) {
            const firstRole = await page.evaluate(() => OrgState.roles[0]);
            console.log(`  Editando rol ID: ${firstRole.id}, name: ${firstRole.role_name}`);

            // Open edit modal
            await page.evaluate((id) => OrgEngine.openRoleModal(id), firstRole.id);
            await page.waitForTimeout(1500);

            // Modify name
            const newName = 'UPDATED_ROLE_' + ts;
            await page.evaluate((name) => {
                const form = document.getElementById('org-role-form');
                const input = form.querySelector('input[name="role_name"]');
                if (input) input.value = name;
            }, newName);

            // Save
            await page.evaluate(() => OrgEngine.saveRole());
            await page.waitForTimeout(3000);

            // Verify
            const updated = await page.evaluate((id) => OrgState.roles.find(r => r.id === id), firstRole.id);
            if (updated && updated.role_name === newName) {
                console.log(`  ✅ ROLE UPDATE OK: ${newName}`);
                results.roles = true;
            } else {
                console.log(`  ❌ ROLE UPDATE FAILED`);
                console.log(`     Expected: ${newName}, Got: ${updated?.role_name}`);
            }
        } else {
            console.log('  ⚠️ No roles to edit');
        }

    } catch (error) {
        console.log('\nERROR:', error.message);
        await page.screenshot({ path: 'debug-update-all-error.png' });
    }

    await browser.close();

    console.log('\n' + '='.repeat(80));
    console.log('RESUMEN UPDATE TESTS');
    console.log('='.repeat(80));
    console.log(`  Sectors:    ${results.sectors ? '✅' : '❌'}`);
    console.log(`  Categories: ${results.categories ? '✅' : '❌'}`);
    console.log(`  Roles:      ${results.roles ? '✅' : '❌'}`);
    console.log('='.repeat(80));
})();
