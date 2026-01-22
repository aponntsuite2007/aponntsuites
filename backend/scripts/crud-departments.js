/**
 * CRUD TEST - GESTIÓN DE DEPARTAMENTOS
 * Verifica CREATE, UPDATE, DELETE
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

async function count(table) {
    try {
        const [r] = await sequelize.query(`SELECT COUNT(*) as c FROM ${table}`);
        return parseInt(r[0].c);
    } catch { return -1; }
}

(async () => {
    console.log('='.repeat(80));
    console.log('CRUD TEST - GESTIÓN DE DEPARTAMENTOS');
    console.log('='.repeat(80));
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    let apiCreate = false, apiUpdate = false, apiDelete = false;

    page.on('response', async r => {
        if (r.url().includes('/api/')) {
            const method = r.request().method();
            const status = r.status();
            const url = r.url();
            if (method === 'POST' && status === 201) {
                apiCreate = true;
                console.log(`    📡 CREATE 201: ${url.split('/').slice(-2).join('/')}`);
            } else if ((method === 'PUT' || method === 'PATCH') && status === 200) {
                apiUpdate = true;
                console.log(`    📡 UPDATE 200`);
            } else if (method === 'DELETE' && (status === 200 || status === 204)) {
                apiDelete = true;
                console.log(`    📡 DELETE ${status}`);
            }
        }
    });

    const results = { create: false, update: false, delete: false };

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

        // NAVEGAR A DEPARTAMENTOS
        console.log('▶ NAVEGAR A DEPARTAMENTOS');

        // Buscar el módulo de Departamentos
        const moduleClicked = await page.evaluate(() => {
            // Buscar en módulos visibles
            const cards = document.querySelectorAll('.module-card, [data-module-name]');
            for (const card of cards) {
                const text = card.textContent.toLowerCase();
                if (text.includes('departamento') || text.includes('estructura organizacional')) {
                    card.click();
                    return { clicked: true, text: card.textContent.trim().substring(0, 50) };
                }
            }
            // Buscar link en menú
            const links = document.querySelectorAll('a, button');
            for (const link of links) {
                const text = link.textContent.toLowerCase();
                if (text.includes('departamento')) {
                    link.click();
                    return { clicked: true, text: link.textContent.trim() };
                }
            }
            return { clicked: false };
        });

        if (!moduleClicked.clicked) {
            // Intentar por texto
            try {
                await page.click('text=Estructura Organizacional', { timeout: 3000 });
                console.log('  ✓ Click en Estructura Organizacional');
            } catch {
                try {
                    await page.click('text=Departamentos', { timeout: 3000 });
                    console.log('  ✓ Click en Departamentos');
                } catch {
                    console.log('  ⚠️ No se encontró módulo de Departamentos');
                }
            }
        } else {
            console.log(`  ✓ Click en: ${moduleClicked.text}`);
        }

        await page.waitForTimeout(4000);
        await page.screenshot({ path: 'debug-dept-module.png' });

        const deptBefore = await count('departments');
        console.log(`  BD antes: ${deptBefore} departamentos\n`);

        // ================================================================
        // TEST 1: CREATE DEPARTAMENTO
        // ================================================================
        console.log('▶ TEST CREATE - DEPARTAMENTO');
        console.log('-'.repeat(80));

        apiCreate = false;

        // Buscar botón de agregar
        const addClicked = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const text = btn.textContent.toLowerCase();
                if (text.includes('nuevo') || text.includes('agregar') || text.includes('crear') || text.includes('add')) {
                    btn.click();
                    return { clicked: true, text: btn.textContent.trim() };
                }
            }
            return { clicked: false };
        });

        if (addClicked.clicked) {
            console.log(`  ✓ Click en: "${addClicked.text}"`);
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug-dept-modal.png' });

            // Llenar formulario
            const ts = Date.now().toString().slice(-6);
            await page.evaluate((timestamp) => {
                // Inputs de texto
                const textInputs = document.querySelectorAll('input[type="text"], input:not([type])');
                for (const input of textInputs) {
                    if (!input.offsetParent || input.disabled) continue;
                    if (input.id === 'userInput' || input.id === 'passwordInput') continue;
                    if (input.value === '' || input.placeholder) {
                        input.value = 'Dept_Test_' + timestamp;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }

                // Selects
                const selects = document.querySelectorAll('select');
                for (const s of selects) {
                    if (!s.offsetParent || s.id === 'companySelect') continue;
                    const hasLang = Array.from(s.options).some(o =>
                        o.text.includes('English') || o.text.includes('Español'));
                    if (hasLang) continue;
                    if (s.options.length > 1) {
                        s.selectedIndex = 1;
                        s.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }

                // Textarea
                const ta = document.querySelector('textarea');
                if (ta && ta.offsetParent) {
                    ta.value = 'Descripción departamento test ' + timestamp;
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }, ts);

            console.log('  ✓ Formulario llenado');
            await page.screenshot({ path: 'debug-dept-filled.png' });

            // Click guardar
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    if (t.includes('guardar') || t.includes('save') || t.includes('crear') || t.includes('create')) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.waitForTimeout(4000);

            const deptAfterCreate = await count('departments');
            results.create = deptAfterCreate > deptBefore || apiCreate;
            console.log(`  BD después: ${deptAfterCreate} (${deptAfterCreate > deptBefore ? '+' : ''}${deptAfterCreate - deptBefore})`);
            console.log(results.create ? '  ✅ CREATE OK' : '  ❌ CREATE pendiente');

            // Cerrar modal
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
        } else {
            console.log('  ⚠️ No se encontró botón de agregar');
        }
        console.log('');

        // ================================================================
        // TEST 2: UPDATE DEPARTAMENTO
        // ================================================================
        console.log('▶ TEST UPDATE - DEPARTAMENTO');
        console.log('-'.repeat(80));

        apiUpdate = false;

        // Buscar botón de editar (en la tabla/lista)
        const editClicked = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const text = btn.textContent.toLowerCase();
                const html = btn.innerHTML.toLowerCase();
                const cls = btn.className.toLowerCase();

                if (text.includes('editar') || text.includes('edit') ||
                    html.includes('fa-edit') || html.includes('fa-pen') ||
                    cls.includes('edit') || cls.includes('warning')) {
                    btn.click();
                    return { clicked: true };
                }
            }
            return { clicked: false };
        });

        if (editClicked.clicked) {
            console.log('  ✓ Click en Editar');
            await page.waitForTimeout(2000);

            // Modificar un campo
            await page.evaluate(() => {
                const inputs = document.querySelectorAll('input[type="text"]');
                for (const input of inputs) {
                    if (!input.offsetParent || input.disabled) continue;
                    if (input.id === 'userInput') continue;
                    input.value = 'UPDATED_' + Date.now().toString().slice(-6);
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                }
            });
            console.log('  ✓ Campo modificado');

            // Guardar
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    if (t.includes('guardar') || t.includes('save') || t.includes('actualizar') || t.includes('update')) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.waitForTimeout(4000);

            results.update = apiUpdate;
            console.log(results.update ? '  ✅ UPDATE OK (API 200)' : '  ⚠️ UPDATE sin confirmación API');

            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
        } else {
            console.log('  ⚠️ No se encontró botón de editar');
        }
        console.log('');

        // ================================================================
        // TEST 3: DELETE DEPARTAMENTO
        // ================================================================
        console.log('▶ TEST DELETE - DEPARTAMENTO');
        console.log('-'.repeat(80));

        apiDelete = false;
        const deptBeforeDelete = await count('departments');

        // Buscar botón de eliminar
        const deleteClicked = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const text = btn.textContent.toLowerCase();
                const html = btn.innerHTML.toLowerCase();
                const cls = btn.className.toLowerCase();

                if (text.includes('eliminar') || text.includes('delete') ||
                    html.includes('fa-trash') || cls.includes('danger')) {
                    btn.click();
                    return { clicked: true };
                }
            }
            return { clicked: false };
        });

        if (deleteClicked.clicked) {
            console.log('  ✓ Click en Eliminar');
            await page.waitForTimeout(2000);

            // Confirmar
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    if (t.includes('confirmar') || t.includes('eliminar') ||
                        t.includes('sí') || t.includes('yes') || t.includes('confirm')) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.waitForTimeout(4000);

            const deptAfterDelete = await count('departments');
            results.delete = deptAfterDelete < deptBeforeDelete || apiDelete;
            console.log(`  BD: ${deptBeforeDelete} → ${deptAfterDelete}`);
            console.log(results.delete ? '  ✅ DELETE OK' : '  ⚠️ DELETE pendiente');
        } else {
            console.log('  ⚠️ No se encontró botón de eliminar');
        }

        await page.screenshot({ path: 'debug-dept-final.png', fullPage: true });

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-dept-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN
    console.log('\n' + '='.repeat(80));
    console.log('RESUMEN CRUD - GESTIÓN DE DEPARTAMENTOS');
    console.log('='.repeat(80));
    console.log('');
    console.log(`  CREATE: ${results.create ? '✅ VERIFICADO' : '❌ PENDIENTE'}`);
    console.log(`  UPDATE: ${results.update ? '✅ VERIFICADO' : '❌ PENDIENTE'}`);
    console.log(`  DELETE: ${results.delete ? '✅ VERIFICADO' : '❌ PENDIENTE'}`);
    console.log('');
    const total = [results.create, results.update, results.delete].filter(Boolean).length;
    console.log(`  TOTAL: ${total}/3`);
    if (total === 3) console.log('\n  🎉 CRUD 100% COMPLETO 🎉');
    console.log('='.repeat(80));
})();
