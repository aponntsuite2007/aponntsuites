/**
 * CRUD TEST FINAL VERIFICADO
 * Selectores específicos para modales y formularios
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
    console.log('CRUD TEST FINAL VERIFICADO');
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
                console.log(`    📡 CREATE 201`);
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

        // NAVEGAR A USUARIOS
        console.log('▶ NAVEGAR A GESTIÓN DE USUARIOS');
        await page.click('text=Gestión de Usuarios');
        await page.waitForTimeout(4000);
        console.log('  ✓ OK\n');

        // ABRIR EXPEDIENTE
        console.log('▶ ABRIR EXPEDIENTE');
        await page.evaluate(() => {
            const btn = document.querySelector('table tbody tr button');
            if (btn) btn.click();
        });
        await page.waitForTimeout(3000);
        console.log('  ✓ OK\n');

        // ================================================================
        // TEST 1: CREATE EDUCACIÓN
        // ================================================================
        console.log('▶ TEST CREATE - EDUCACIÓN (Tab 2)');
        console.log('-'.repeat(80));

        // Ir a Tab Datos Personales
        await page.evaluate(() => showFileTab('personal'));
        await page.waitForTimeout(2000);
        console.log('  ✓ Tab Personal activo');

        const eduBefore = await count('user_education');
        console.log(`  Registros antes: ${eduBefore}`);

        // Click en "+ Agregar" de Formación Académica
        apiCreate = false;
        await page.evaluate(() => {
            const personalTab = document.getElementById('personal-tab');
            if (personalTab) {
                const btns = personalTab.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.textContent.includes('Agregar')) {
                        btn.click();
                        return true;
                    }
                }
            }
            return false;
        });
        await page.waitForTimeout(2000);
        console.log('  ✓ Modal abierto');

        // Llenar formulario dentro del modal
        const ts = Date.now().toString().slice(-6);
        await page.evaluate((timestamp) => {
            // Buscar selects VISIBLES (no el de login)
            document.querySelectorAll('select').forEach(s => {
                if (s.offsetParent && s.id !== 'companySelect' && s.options.length > 1) {
                    s.selectedIndex = 1;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // Buscar inputs VISIBLES en el modal
            document.querySelectorAll('input').forEach(input => {
                if (!input.offsetParent || input.disabled) return;
                if (input.type === 'file' || input.type === 'hidden' || input.type === 'checkbox') return;
                if (input.id === 'userInput' || input.id === 'passwordInput') return; // Skip login

                if (input.type === 'number') {
                    const max = input.max ? parseInt(input.max) : 10;
                    input.value = Math.min(8, max).toString();
                } else if (input.type === 'text' || !input.type) {
                    input.value = 'EDU_Test_' + timestamp;
                }
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Textareas
            document.querySelectorAll('textarea').forEach(ta => {
                if (ta.offsetParent && !ta.disabled) {
                    ta.value = 'Descripción ' + timestamp;
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        }, ts);
        console.log('  ✓ Campos llenados');

        await page.screenshot({ path: 'debug-edu-filled-final.png' });

        // Click Guardar
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.trim().toLowerCase() === 'guardar') {
                    btn.click();
                    return true;
                }
            }
            return false;
        });
        await page.waitForTimeout(4000);

        const eduAfter = await count('user_education');
        results.create = eduAfter > eduBefore || apiCreate;
        console.log(`  Registros después: ${eduAfter} (${eduAfter - eduBefore >= 0 ? '+' : ''}${eduAfter - eduBefore})`);
        console.log(results.create ? '  ✅ CREATE VERIFICADO EN BD' : '  ❌ CREATE no verificado');
        console.log('');

        // Cerrar modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST 2: UPDATE - Editar Datos Básicos
        // ================================================================
        console.log('▶ TEST UPDATE - DATOS BÁSICOS');
        console.log('-'.repeat(80));

        await page.evaluate(() => showFileTab('personal'));
        await page.waitForTimeout(1000);

        apiUpdate = false;
        // Buscar el botón "✏️ Editar" que está en la sección Datos Básicos
        // Es el botón azul grande visible en el tab
        const editClicked = await page.evaluate(() => {
            const personalTab = document.getElementById('personal-tab');
            if (!personalTab) return { ok: false };

            // El botón de editar Datos Básicos es el primero visible con "Editar"
            const btns = personalTab.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const text = btn.textContent.trim();
                if (text.includes('Editar') && !text.includes('Posición')) {
                    btn.click();
                    return { ok: true, text: text };
                }
            }
            return { ok: false };
        });

        if (editClicked.ok) {
            console.log(`  ✓ Click en: "${editClicked.text}"`);
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug-update-modal.png' });

            // Modificar campo
            await page.evaluate(() => {
                const inputs = document.querySelectorAll('input[type="text"]');
                for (const input of inputs) {
                    if (input.offsetParent && !input.disabled && !input.readOnly &&
                        input.id !== 'userInput') {
                        input.value = 'UPDATED_' + Date.now().toString().slice(-6);
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        break;
                    }
                }
            });
            console.log('  ✓ Campo modificado');

            // Guardar
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.offsetParent && btn.textContent.toLowerCase().includes('guardar')) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.waitForTimeout(4000);

            results.update = apiUpdate;
            console.log(results.update ? '  ✅ UPDATE VERIFICADO (API 200)' : '  ⚠️ UPDATE pendiente API');
        } else {
            console.log('  ⚠️ Botón Editar no encontrado');
        }
        console.log('');

        // Cerrar modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST 3: DELETE - Grupo Familiar
        // ================================================================
        console.log('▶ TEST DELETE - GRUPO FAMILIAR (Tab 4)');
        console.log('-'.repeat(80));

        await page.evaluate(() => showFileTab('family'));
        await page.waitForTimeout(2000);
        console.log('  ✓ Tab Familiar activo');

        const famBefore = await count('user_family_members');
        console.log(`  Registros antes: ${famBefore}`);

        // Crear familiar para eliminar
        apiCreate = false;
        const addFamClicked = await page.evaluate(() => {
            const familyTab = document.getElementById('family-tab');
            if (!familyTab) return false;

            const btns = familyTab.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Agregar')) {
                    btn.click();
                    return true;
                }
            }
            return false;
        });

        if (addFamClicked) {
            await page.waitForTimeout(2000);

            // Llenar (evitando file inputs)
            await page.evaluate(() => {
                const ts = Date.now().toString().slice(-6);

                document.querySelectorAll('select').forEach(s => {
                    if (s.offsetParent && s.id !== 'companySelect' && s.options.length > 1) {
                        s.selectedIndex = 1;
                        s.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });

                document.querySelectorAll('input').forEach(input => {
                    if (!input.offsetParent || input.disabled) return;
                    if (input.type === 'file') return;
                    if (input.id === 'userInput' || input.id === 'passwordInput') return;

                    if (input.type === 'date') {
                        input.value = '1990-06-15';
                    } else if (input.type === 'text' || input.type === 'tel' || !input.type) {
                        input.value = 'FAM_DEL_' + ts;
                    } else if (input.type === 'number') {
                        input.value = '12345678';
                    }
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                });
            });
            console.log('  ✓ Formulario llenado');

            // Guardar
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.offsetParent && btn.textContent.toLowerCase().includes('guardar')) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.waitForTimeout(4000);

            const famAfterCreate = await count('user_family_members');
            console.log(`  Familiar creado: ${famAfterCreate > famBefore ? '✓' : '✗'} (${famAfterCreate - famBefore})`);

            // Cerrar modal éxito
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.textContent.toLowerCase().includes('entendido')) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(2000);

            // Ahora eliminar
            apiDelete = false;
            await page.screenshot({ path: 'debug-family-before-delete.png' });

            const deleteClicked = await page.evaluate(() => {
                const familyTab = document.getElementById('family-tab');
                if (!familyTab) return false;

                const btns = familyTab.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const cls = btn.className.toLowerCase();
                    const html = btn.innerHTML.toLowerCase();
                    if (cls.includes('danger') || html.includes('trash')) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            });

            if (deleteClicked) {
                console.log('  ✓ Click en eliminar');
                await page.waitForTimeout(2000);
                await page.screenshot({ path: 'debug-delete-confirm-final.png' });

                // Confirmar
                await page.evaluate(() => {
                    const btns = document.querySelectorAll('button');
                    for (const btn of btns) {
                        if (!btn.offsetParent) continue;
                        const t = btn.textContent.toLowerCase();
                        if (t.includes('confirmar') || t.includes('eliminar') || t.includes('sí')) {
                            btn.click();
                            return;
                        }
                    }
                });
                await page.waitForTimeout(4000);

                const famAfterDelete = await count('user_family_members');
                results.delete = famAfterDelete < famAfterCreate || apiDelete;
                console.log(`  Registros después: ${famAfterDelete} (${famAfterDelete - famAfterCreate})`);
                console.log(results.delete ? '  ✅ DELETE VERIFICADO' : '  ⚠️ DELETE pendiente');
            } else {
                console.log('  ⚠️ Botón eliminar no encontrado');
            }
        }

        await page.screenshot({ path: 'debug-crud-final-result.png', fullPage: true });

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-crud-error-final.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN FINAL
    console.log('\n' + '='.repeat(80));
    console.log('RESUMEN FINAL - CRUD MÓDULO USUARIOS');
    console.log('='.repeat(80));
    console.log('');
    console.log(`  CREATE: ${results.create ? '✅ VERIFICADO' : '❌ PENDIENTE'}`);
    console.log(`  UPDATE: ${results.update ? '✅ VERIFICADO' : '❌ PENDIENTE'}`);
    console.log(`  DELETE: ${results.delete ? '✅ VERIFICADO' : '❌ PENDIENTE'}`);
    console.log('');
    const total = [results.create, results.update, results.delete].filter(Boolean).length;
    console.log(`  TOTAL: ${total}/3 operaciones CRUD verificadas`);
    console.log('='.repeat(80));
})();
