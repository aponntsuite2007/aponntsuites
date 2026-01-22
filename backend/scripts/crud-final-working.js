/**
 * CRUD TEST FINAL WORKING
 * Campo Cobertura Médica corregido: necesita año >= 1950
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
    console.log('CRUD TEST FINAL - COBERTURA MÉDICA CORREGIDA');
    console.log('='.repeat(80));
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    let apiCreate = false, apiUpdate = false, apiDelete = false;

    page.on('response', async r => {
        if (r.url().includes('/api/')) {
            const method = r.request().method();
            const status = r.status();
            if (method === 'POST' && status === 201) {
                apiCreate = true;
                console.log(`    📡 CREATE 201: ${r.url().split('/').slice(-2).join('/')}`);
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

        // NAVEGAR
        await page.click('text=Gestión de Usuarios');
        await page.waitForTimeout(4000);
        console.log('▶ USUARIOS CARGADO\n');

        // ABRIR EXPEDIENTE
        await page.evaluate(() => {
            const btn = document.querySelector('table tbody tr button');
            if (btn) btn.click();
        });
        await page.waitForTimeout(3000);
        console.log('▶ EXPEDIENTE ABIERTO\n');

        // ================================================================
        // TEST 1: CREATE EDUCACIÓN
        // ================================================================
        console.log('▶ TEST CREATE - EDUCACIÓN');
        console.log('-'.repeat(80));

        await page.evaluate(() => showFileTab('personal'));
        await page.waitForTimeout(2000);

        const eduBefore = await count('user_education');
        console.log(`  BD antes: ${eduBefore}`);

        apiCreate = false;
        await page.evaluate(() => {
            const tab = document.getElementById('personal-tab');
            if (tab) {
                const btns = tab.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.offsetParent && btn.textContent.includes('Agregar')) {
                        btn.click();
                        return;
                    }
                }
            }
        });
        await page.waitForTimeout(2000);

        // Llenar formulario educación
        await page.evaluate(() => {
            // Selects
            document.querySelectorAll('select').forEach(s => {
                if (s.offsetParent && s.id !== 'companySelect' && s.options.length > 1) {
                    s.selectedIndex = 1;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            // Inputs
            document.querySelectorAll('input').forEach(input => {
                if (!input.offsetParent || input.disabled) return;
                if (input.type === 'file' || input.type === 'hidden' || input.type === 'checkbox') return;
                if (input.id === 'userInput' || input.id === 'passwordInput') return;
                if (input.type === 'number') {
                    input.value = '8';
                } else if (input.type !== 'date') {
                    input.value = 'Test_Educacion';
                }
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });
            document.querySelectorAll('textarea').forEach(ta => {
                if (ta.offsetParent) {
                    ta.value = 'Descripcion test';
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        });
        console.log('  ✓ Formulario llenado');

        // Click Save
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.trim().toLowerCase();
                if (t === 'save' || t === 'guardar') {
                    btn.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(4000);

        const eduAfter = await count('user_education');
        results.create = eduAfter > eduBefore || apiCreate;
        console.log(`  BD después: ${eduAfter} (${eduAfter > eduBefore ? '+' : ''}${eduAfter - eduBefore})`);
        console.log(results.create ? '  ✅ CREATE OK' : '  ❌ CREATE pendiente');
        console.log('');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST 2: UPDATE DATOS
        // ================================================================
        console.log('▶ TEST UPDATE - BASIC DATA');
        console.log('-'.repeat(80));

        await page.evaluate(() => showFileTab('personal'));
        await page.waitForTimeout(1000);

        apiUpdate = false;
        // Click en botón Edit de Basic Data (azul)
        await page.evaluate(() => {
            const tab = document.getElementById('personal-tab');
            if (!tab) return;
            const btns = tab.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.trim();
                const c = btn.className || '';
                if ((t.includes('Edit') || t.includes('Editar')) &&
                    (c.includes('primary') || c.includes('info') || c.includes('btn-block'))) {
                    btn.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(2000);

        // Modificar
        await page.evaluate(() => {
            const inputs = document.querySelectorAll('input[type="text"], input[type="tel"]');
            for (const input of inputs) {
                if (input.offsetParent && !input.disabled &&
                    input.id !== 'userInput' && input.id !== 'passwordInput') {
                    input.value = 'UPDATED_DATA';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    break;
                }
            }
        });

        // Guardar
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.toLowerCase();
                if (t.includes('save') || t.includes('guardar')) {
                    btn.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(4000);

        results.update = apiUpdate;
        console.log(results.update ? '  ✅ UPDATE OK' : '  ⚠️ UPDATE pendiente API');
        console.log('');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST 3: DELETE FAMILIAR
        // ================================================================
        console.log('▶ TEST DELETE - FAMILIAR');
        console.log('-'.repeat(80));

        await page.evaluate(() => showFileTab('family'));
        await page.waitForTimeout(2000);

        const famBefore = await count('user_family_members');
        console.log(`  BD antes: ${famBefore}`);

        apiCreate = false;
        // Click Agregar Hijo
        await page.evaluate(() => {
            const tab = document.getElementById('family-tab');
            if (tab) {
                const btns = tab.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.offsetParent && btn.textContent.includes('Agregar')) {
                        btn.click();
                        return;
                    }
                }
            }
        });
        await page.waitForTimeout(2000);

        // Llenar formulario con VALORES CORRECTOS
        // Cobertura Médica necesita año >= 1950
        await page.evaluate(() => {
            // Selects
            document.querySelectorAll('select').forEach(s => {
                if (s.offsetParent && s.id !== 'companySelect' && s.options.length > 1) {
                    s.selectedIndex = 1;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // Inputs con valores específicos
            document.querySelectorAll('input').forEach(input => {
                if (!input.offsetParent || input.disabled) return;
                if (input.type === 'file') return;
                if (input.id === 'userInput' || input.id === 'passwordInput') return;

                const name = (input.name || '').toLowerCase();
                const id = (input.id || '').toLowerCase();
                const placeholder = (input.placeholder || '').toLowerCase();

                if (input.type === 'date') {
                    input.value = '1990-06-15';
                } else if (input.type === 'number') {
                    // COBERTURA MÉDICA: necesita año >= 1950 y <= 2030
                    // El campo de cobertura médica es un año
                    const min = input.min ? parseInt(input.min) : 1950;
                    const max = input.max ? parseInt(input.max) : 2030;
                    // Usar un año válido: 2020
                    input.value = '2020';
                } else if (name.includes('dni') || name.includes('id') ||
                           placeholder.includes('dni') || id.includes('dni')) {
                    input.value = '12345678';
                } else if (input.type === 'text' || !input.type) {
                    input.value = 'TestHijo';
                }
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });
        console.log('  ✓ Formulario llenado (Cobertura=2020)');

        // Click Agregar Hijo (verde)
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.trim();
                if (t === 'Agregar Hijo' || t.includes('Agregar Hijo')) {
                    btn.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(4000);

        const famAfterCreate = await count('user_family_members');
        const created = famAfterCreate > famBefore || apiCreate;
        console.log(`  Creado: ${created ? '✓' : '✗'} (BD: ${famAfterCreate - famBefore})`);

        if (created) {
            // Cerrar modal éxito
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    const t = btn.textContent.toLowerCase();
                    if (t.includes('entendido') || t.includes('ok')) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(2000);

            // Eliminar
            apiDelete = false;
            const delClicked = await page.evaluate(() => {
                const tab = document.getElementById('family-tab');
                if (!tab) return false;
                const btns = tab.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const c = btn.className.toLowerCase();
                    const h = btn.innerHTML.toLowerCase();
                    if (c.includes('danger') || h.includes('trash')) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            });

            if (delClicked) {
                console.log('  ✓ Click eliminar');
                await page.waitForTimeout(2000);

                // Confirmar
                await page.evaluate(() => {
                    const btns = document.querySelectorAll('button');
                    for (const btn of btns) {
                        if (!btn.offsetParent) continue;
                        const t = btn.textContent.toLowerCase();
                        if (t.includes('confirm') || t.includes('eliminar') ||
                            t.includes('sí') || t === 'yes') {
                            btn.click();
                            return;
                        }
                    }
                });
                await page.waitForTimeout(4000);

                const famAfterDelete = await count('user_family_members');
                results.delete = famAfterDelete < famAfterCreate || apiDelete;
                console.log(`  BD después: ${famAfterDelete} (${famAfterDelete - famAfterCreate})`);
                console.log(results.delete ? '  ✅ DELETE OK' : '  ⚠️ DELETE pendiente');
            }
        } else {
            console.log('  ⚠️ Familiar no creado - verificando errores...');
            await page.screenshot({ path: 'debug-familiar-error.png' });
        }

        await page.screenshot({ path: 'debug-final.png', fullPage: true });

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN
    console.log('\n' + '='.repeat(80));
    console.log('RESUMEN CRUD - MÓDULO USUARIOS');
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
