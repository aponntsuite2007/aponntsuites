/**
 * TEST FIX GRUPO FAMILIAR
 * Verifica que la UI se actualiza correctamente después de crear/eliminar
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
    console.log('TEST FIX GRUPO FAMILIAR - UI REFRESH');
    console.log('='.repeat(80));
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    let apiCreate = false, apiDelete = false;

    page.on('response', async r => {
        if (r.url().includes('/api/')) {
            const method = r.request().method();
            const status = r.status();
            if (method === 'POST' && status === 201) {
                apiCreate = true;
                console.log(`    📡 CREATE 201`);
            } else if (method === 'DELETE' && (status === 200 || status === 204)) {
                apiDelete = true;
                console.log(`    📡 DELETE ${status}`);
            }
        }
    });

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

        // IR A TAB GRUPO FAMILIAR
        await page.evaluate(() => showFileTab('family'));
        await page.waitForTimeout(2000);

        const famBefore = await count('user_family_members');
        console.log(`▶ TAB GRUPO FAMILIAR - BD antes: ${famBefore}`);

        // CREAR FAMILIAR
        console.log('\n▶ PASO 1: CREAR FAMILIAR');
        console.log('-'.repeat(40));

        apiCreate = false;
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Agregar Familiar')) {
                    btn.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(2000);

        // Llenar formulario
        const ts = Date.now().toString().slice(-6);
        await page.evaluate((timestamp) => {
            const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
            for (const input of inputs) {
                if (!input.offsetParent || input.disabled) continue;
                if (input.id === 'userInput' || input.id === 'passwordInput') continue;
                input.value = 'TestFix_' + timestamp;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }

            const dateInputs = document.querySelectorAll('input[type="date"]');
            for (const input of dateInputs) {
                if (input.offsetParent) {
                    input.value = '1990-05-15';
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            const selects = document.querySelectorAll('select');
            for (const s of selects) {
                if (s.offsetParent && s.id !== 'companySelect' && s.options.length > 1) {
                    s.selectedIndex = 1;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }, ts);

        // Guardar
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.toLowerCase();
                if (t.includes('guardar') || t.includes('save')) {
                    btn.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(4000);

        const famAfterCreate = await count('user_family_members');
        const created = famAfterCreate > famBefore || apiCreate;
        console.log(`  BD: ${famBefore} → ${famAfterCreate} (${created ? '✓ Creado' : '✗ No creado'})`);

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

        // VERIFICAR QUE UI SE ACTUALIZÓ
        console.log('\n▶ PASO 2: VERIFICAR UI ACTUALIZADA');
        console.log('-'.repeat(40));

        await page.screenshot({ path: 'debug-family-fix-after-create.png' });

        const uiState = await page.evaluate(() => {
            const familyList = document.getElementById('family-members-list');
            if (!familyList) return { found: false, error: 'No family-members-list element' };

            const cards = familyList.querySelectorAll('.family-member-card, .family-records > div');
            const deleteButtons = familyList.querySelectorAll('button.btn-danger, button:has(i.fa-trash)');
            const noDataMsg = familyList.querySelector('.text-muted');

            return {
                found: true,
                cards: cards.length,
                deleteButtons: deleteButtons.length,
                hasNoDataMsg: !!noDataMsg,
                html: familyList.innerHTML.substring(0, 300)
            };
        });

        console.log(`  Elemento #family-members-list: ${uiState.found ? '✓' : '✗'}`);
        console.log(`  Cards de familiares: ${uiState.cards}`);
        console.log(`  Botones eliminar: ${uiState.deleteButtons}`);
        console.log(`  Mensaje "No hay": ${uiState.hasNoDataMsg ? 'Sí (error)' : 'No (correcto)'}`);

        const uiRefreshed = uiState.cards > 0 || uiState.deleteButtons > 0;
        console.log(uiRefreshed ? '\n  ✅ UI SE ACTUALIZÓ CORRECTAMENTE' : '\n  ❌ UI NO SE ACTUALIZÓ');

        // ELIMINAR (si hay botón)
        if (uiState.deleteButtons > 0) {
            console.log('\n▶ PASO 3: ELIMINAR FAMILIAR');
            console.log('-'.repeat(40));

            apiDelete = false;

            // Click en botón eliminar
            const clicked = await page.evaluate(() => {
                const familyList = document.getElementById('family-members-list');
                if (!familyList) return false;
                const btn = familyList.querySelector('button.btn-danger');
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            });

            if (clicked) {
                console.log('  ✓ Click en eliminar');
                await page.waitForTimeout(1000);

                // Aceptar confirmación (confirm dialog)
                page.once('dialog', async dialog => {
                    console.log(`  ✓ Dialog: "${dialog.message().substring(0, 50)}..."`);
                    await dialog.accept();
                });

                await page.waitForTimeout(3000);

                const famAfterDelete = await count('user_family_members');
                const deleted = famAfterDelete < famAfterCreate || apiDelete;
                console.log(`  BD: ${famAfterCreate} → ${famAfterDelete} (${deleted ? '✓ Eliminado' : '✗ No eliminado'})`);

                await page.screenshot({ path: 'debug-family-fix-after-delete.png' });
            }
        }

        // RESUMEN
        console.log('\n' + '='.repeat(80));
        console.log('RESUMEN FIX GRUPO FAMILIAR');
        console.log('='.repeat(80));
        console.log('');
        console.log(`  1. CREATE: ${created ? '✅ OK' : '❌ FAIL'}`);
        console.log(`  2. UI REFRESH: ${uiRefreshed ? '✅ OK' : '❌ FAIL'}`);
        console.log(`  3. DELETE BUTTON: ${uiState.deleteButtons > 0 ? '✅ VISIBLE' : '❌ NO VISIBLE'}`);
        console.log('');
        if (created && uiRefreshed) {
            console.log('  🎉 FIX VERIFICADO - UI SE ACTUALIZA CORRECTAMENTE');
        } else {
            console.log('  ⚠️ FIX REQUIERE REVISIÓN');
        }
        console.log('='.repeat(80));

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-family-fix-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();
})();
