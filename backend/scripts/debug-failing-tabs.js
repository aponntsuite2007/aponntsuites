/**
 * DEBUG - TABS QUE FALLAN (Sectores, Categorías, Roles)
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

(async () => {
    console.log('='.repeat(80));
    console.log('DEBUG - TABS QUE FALLAN');
    console.log('='.repeat(80));

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    page.on('response', async r => {
        if (r.url().includes('/api/')) {
            const method = r.request().method();
            const status = r.status();
            if (['POST', 'PUT', 'DELETE'].includes(method)) {
                console.log(`      📡 ${method} ${status}: ${r.url().split('/api/')[1]}`);
                if (status >= 400) {
                    try {
                        const body = await r.text();
                        console.log(`      ERROR: ${body.substring(0, 200)}`);
                    } catch {}
                }
            }
        }
    });

    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`      🔴 CONSOLE: ${msg.text().substring(0, 150)}`);
        }
    });

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
        // 1. DEBUG SECTORES
        // =========================================================================
        console.log('\n\n' + '='.repeat(80));
        console.log('DEBUG: SECTORES');
        console.log('='.repeat(80));

        await page.evaluate(() => OrgEngine.showTab('sectors'));
        await page.waitForTimeout(2000);

        // Ver si hay departamentos disponibles
        const deptCount = await page.evaluate(() => {
            return OrgState.departments ? OrgState.departments.length : 0;
        });
        console.log(`  Departamentos disponibles: ${deptCount}`);

        // Abrir modal
        await page.evaluate(() => {
            const btn = document.querySelector('button.org-btn-primary');
            if (btn && btn.textContent.includes('Nuevo Sector')) btn.click();
        });
        await page.waitForTimeout(2000);

        // Ver form
        const sectorFormInfo = await page.evaluate(() => {
            const form = document.getElementById('org-sector-form');
            if (!form) return { error: 'Form no encontrado' };

            const deptSel = form.querySelector('select[name="department_id"]');
            const name = form.querySelector('input[name="name"]');
            const code = form.querySelector('input[name="code"]');

            return {
                formExists: true,
                deptSelect: deptSel ? {
                    optionsCount: deptSel.options.length,
                    options: Array.from(deptSel.options).map(o => ({ value: o.value, text: o.text.substring(0, 30) }))
                } : 'no encontrado',
                nameInput: name ? 'encontrado' : 'no encontrado',
                codeInput: code ? 'encontrado' : 'no encontrado'
            };
        });
        console.log('  Form info:', JSON.stringify(sectorFormInfo, null, 2));

        // Llenar y guardar
        await page.evaluate((ts) => {
            const form = document.getElementById('org-sector-form');
            if (!form) return;

            const deptSel = form.querySelector('select[name="department_id"]');
            if (deptSel && deptSel.options.length > 1) {
                console.log('Setting department_id to option 1:', deptSel.options[1].value);
                deptSel.value = deptSel.options[1].value;
                deptSel.dispatchEvent(new Event('change', {bubbles: true}));
            }

            const name = form.querySelector('input[name="name"]');
            if (name) {
                name.value = 'DEBUG_SECTOR_' + ts;
                name.dispatchEvent(new Event('input', {bubbles: true}));
            }
        }, ts);

        await page.screenshot({ path: 'debug-sector-form-filled.png' });

        // Ver valores antes de guardar
        const sectorValues = await page.evaluate(() => {
            const form = document.getElementById('org-sector-form');
            if (!form) return null;
            return Object.fromEntries(new FormData(form).entries());
        });
        console.log('  Valores a guardar:', JSON.stringify(sectorValues));

        // Guardar
        console.log('  Clickeando Crear Sector...');
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Crear Sector')) {
                    console.log('Clicking:', btn.textContent);
                    btn.click();
                }
            }
        });
        await page.waitForTimeout(5000);

        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // =========================================================================
        // 2. DEBUG CATEGORÍAS
        // =========================================================================
        console.log('\n\n' + '='.repeat(80));
        console.log('DEBUG: CATEGORÍAS');
        console.log('='.repeat(80));

        await page.evaluate(() => OrgEngine.showTab('categories'));
        await page.waitForTimeout(2000);

        // Ver convenios disponibles
        const agreeCount = await page.evaluate(() => {
            return OrgState.agreements ? OrgState.agreements.length : 0;
        });
        console.log(`  Convenios disponibles: ${agreeCount}`);

        // Abrir modal
        await page.evaluate(() => {
            const btn = document.querySelector('button.org-btn-primary');
            if (btn && btn.textContent.includes('Nueva Categoría')) btn.click();
        });
        await page.waitForTimeout(2000);

        // Ver form
        const catFormInfo = await page.evaluate(() => {
            const form = document.getElementById('org-category-form');
            if (!form) return { error: 'Form no encontrado' };

            const agreeSel = form.querySelector('select[name="agreement_id"]');
            const code = form.querySelector('input[name="category_code"]');
            const name = form.querySelector('input[name="category_name"]');
            const salary = form.querySelector('input[name="base_salary"]');

            return {
                formExists: true,
                agreeSelect: agreeSel ? {
                    optionsCount: agreeSel.options.length,
                    options: Array.from(agreeSel.options).map(o => ({ value: o.value, text: o.text.substring(0, 30) }))
                } : 'no encontrado',
                codeInput: code ? 'encontrado' : 'no encontrado',
                nameInput: name ? 'encontrado' : 'no encontrado',
                salaryInput: salary ? 'encontrado' : 'no encontrado'
            };
        });
        console.log('  Form info:', JSON.stringify(catFormInfo, null, 2));

        // Llenar
        await page.evaluate((ts) => {
            const form = document.getElementById('org-category-form');
            if (!form) return;

            const agreeSel = form.querySelector('select[name="agreement_id"]');
            if (agreeSel && agreeSel.options.length > 1) {
                agreeSel.value = agreeSel.options[1].value;
                agreeSel.dispatchEvent(new Event('change', {bubbles: true}));
            }

            const code = form.querySelector('input[name="category_code"]');
            if (code) {
                code.value = 'CAT_' + ts;
                code.dispatchEvent(new Event('input', {bubbles: true}));
            }

            const name = form.querySelector('input[name="category_name"]');
            if (name) {
                name.value = 'DEBUG_CAT_' + ts;
                name.dispatchEvent(new Event('input', {bubbles: true}));
            }

            const salary = form.querySelector('input[name="base_salary"]');
            if (salary) {
                salary.value = '50000';
                salary.dispatchEvent(new Event('input', {bubbles: true}));
            }
        }, ts);

        await page.screenshot({ path: 'debug-category-form-filled.png' });

        const catValues = await page.evaluate(() => {
            const form = document.getElementById('org-category-form');
            if (!form) return null;
            return Object.fromEntries(new FormData(form).entries());
        });
        console.log('  Valores a guardar:', JSON.stringify(catValues));

        // Guardar
        console.log('  Clickeando Crear Categoría...');
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Crear Categoría')) btn.click();
            }
        });
        await page.waitForTimeout(5000);

        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // =========================================================================
        // 3. DEBUG ROLES
        // =========================================================================
        console.log('\n\n' + '='.repeat(80));
        console.log('DEBUG: ROLES');
        console.log('='.repeat(80));

        await page.evaluate(() => OrgEngine.showTab('roles'));
        await page.waitForTimeout(2000);

        // Abrir modal
        await page.evaluate(() => {
            const btn = document.querySelector('button.org-btn-primary');
            if (btn && btn.textContent.includes('Nuevo Rol')) btn.click();
        });
        await page.waitForTimeout(2000);

        // Ver form
        const roleFormInfo = await page.evaluate(() => {
            const form = document.getElementById('org-role-form');
            if (!form) return { error: 'Form no encontrado' };

            const key = form.querySelector('input[name="role_key"]');
            const name = form.querySelector('input[name="role_name"]');
            const level = form.querySelector('select[name="hierarchy_level"]');
            const desc = form.querySelector('textarea[name="description"]');

            return {
                formExists: true,
                keyInput: key ? 'encontrado' : 'no encontrado',
                nameInput: name ? 'encontrado' : 'no encontrado',
                levelSelect: level ? {
                    optionsCount: level.options.length,
                    options: Array.from(level.options).map(o => ({ value: o.value, text: o.text }))
                } : 'no encontrado',
                descTextarea: desc ? 'encontrado' : 'no encontrado'
            };
        });
        console.log('  Form info:', JSON.stringify(roleFormInfo, null, 2));

        // Llenar
        await page.evaluate((ts) => {
            const form = document.getElementById('org-role-form');
            if (!form) return;

            const key = form.querySelector('input[name="role_key"]');
            if (key) {
                key.value = 'debug_role_' + ts;
                key.dispatchEvent(new Event('input', {bubbles: true}));
            }

            const name = form.querySelector('input[name="role_name"]');
            if (name) {
                name.value = 'DEBUG_ROLE_' + ts;
                name.dispatchEvent(new Event('input', {bubbles: true}));
            }

            const level = form.querySelector('select[name="hierarchy_level"]');
            if (level && level.options.length > 1) {
                level.value = level.options[1].value;
                level.dispatchEvent(new Event('change', {bubbles: true}));
            }

            const desc = form.querySelector('textarea[name="description"]');
            if (desc) {
                desc.value = 'Test role';
                desc.dispatchEvent(new Event('input', {bubbles: true}));
            }
        }, ts);

        await page.screenshot({ path: 'debug-role-form-filled.png' });

        const roleValues = await page.evaluate(() => {
            const form = document.getElementById('org-role-form');
            if (!form) return null;
            return Object.fromEntries(new FormData(form).entries());
        });
        console.log('  Valores a guardar:', JSON.stringify(roleValues));

        // Guardar
        console.log('  Clickeando Crear Rol...');
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Crear Rol')) btn.click();
            }
        });
        await page.waitForTimeout(5000);

    } catch (error) {
        console.log('\nERROR:', error.message);
        console.log(error.stack);
    }

    await browser.close();
    await sequelize.close();
    console.log('\n' + '='.repeat(80));
    console.log('FIN DEBUG');
    console.log('='.repeat(80));
})();
