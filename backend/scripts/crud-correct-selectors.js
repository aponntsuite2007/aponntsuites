/**
 * CRUD TEST - SELECTORES CORRECTOS
 * Basado en análisis de screenshots reales
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
    console.log('CRUD TEST - SELECTORES CORRECTOS');
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
        // TEST 1: CREATE - EDUCACIÓN (Tab Datos Personales)
        // ================================================================
        console.log('▶ TEST CREATE - EDUCACIÓN');
        console.log('-'.repeat(80));

        await page.evaluate(() => showFileTab('personal'));
        await page.waitForTimeout(2000);

        const eduBefore = await count('user_education');
        console.log(`  BD antes: ${eduBefore}`);

        // Click en botón "+ Agregar" de Formación Académica
        apiCreate = false;
        const addEduClicked = await page.evaluate(() => {
            const personalTab = document.getElementById('personal-tab');
            if (!personalTab) return false;
            const btns = personalTab.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Agregar')) {
                    btn.click();
                    return true;
                }
            }
            return false;
        });

        if (addEduClicked) {
            await page.waitForTimeout(2000);
            console.log('  ✓ Modal educación abierto');

            // Llenar formulario de educación - campos específicos del modal
            const ts = Date.now().toString().slice(-6);
            const filled = await page.evaluate((timestamp) => {
                const results = [];

                // 1. SELECT - Tipo de educación (primer select visible en modal)
                const selects = document.querySelectorAll('select');
                for (const s of selects) {
                    if (s.offsetParent && s.id !== 'companySelect' && s.options.length > 1) {
                        s.selectedIndex = 1;
                        s.dispatchEvent(new Event('change', { bubbles: true }));
                        results.push(`Select: ${s.options[1].text}`);
                        break;
                    }
                }

                // 2. INPUTS de texto visibles (Institución, Título, etc.)
                const textInputs = document.querySelectorAll('input[type="text"], input:not([type])');
                let textFilled = 0;
                for (const input of textInputs) {
                    if (!input.offsetParent || input.disabled || input.readOnly) continue;
                    if (input.id === 'userInput' || input.id === 'passwordInput') continue;
                    if (input.closest('#loginForm')) continue;

                    input.value = 'Test_EDU_' + timestamp;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    textFilled++;
                }
                results.push(`Text inputs: ${textFilled}`);

                // 3. INPUTS number (Duración, Promedio, etc.)
                const numberInputs = document.querySelectorAll('input[type="number"]');
                let numFilled = 0;
                for (const input of numberInputs) {
                    if (!input.offsetParent || input.disabled) continue;
                    const max = input.max ? parseInt(input.max) : 10;
                    const min = input.min ? parseInt(input.min) : 1;
                    input.value = Math.max(min, Math.min(8, max)).toString();
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    numFilled++;
                }
                results.push(`Number inputs: ${numFilled}`);

                // 4. TEXTAREA (Descripción)
                const textareas = document.querySelectorAll('textarea');
                for (const ta of textareas) {
                    if (ta.offsetParent && !ta.disabled) {
                        ta.value = 'Descripción educación ' + timestamp;
                        ta.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }

                return results;
            }, ts);

            console.log(`  ✓ Formulario llenado: ${filled.join(', ')}`);
            await page.screenshot({ path: 'debug-edu-filled-correct.png' });

            // Click en botón Guardar/Save
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.trim().toLowerCase();
                    if (t === 'guardar' || t === 'save') {
                        console.log('Clicking:', btn.textContent);
                        btn.click();
                        return true;
                    }
                }
                return false;
            });
            await page.waitForTimeout(4000);

            const eduAfter = await count('user_education');
            results.create = eduAfter > eduBefore || apiCreate;
            console.log(`  BD después: ${eduAfter} (${eduAfter > eduBefore ? '+' : ''}${eduAfter - eduBefore})`);
            console.log(results.create ? '  ✅ CREATE OK' : '  ❌ CREATE pendiente');
        }
        console.log('');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST 2: UPDATE - Basic Data
        // ================================================================
        console.log('▶ TEST UPDATE - BASIC DATA');
        console.log('-'.repeat(80));

        await page.evaluate(() => showFileTab('personal'));
        await page.waitForTimeout(1000);

        apiUpdate = false;
        // Buscar botón "✏️ Editar" en sección Datos Básicos (NO el de Pasaporte, NO el de contacto)
        const editResult = await page.evaluate(() => {
            const personalTab = document.getElementById('personal-tab');
            if (!personalTab) return { ok: false, error: 'No personal tab' };

            // Buscar todos los botones con "Editar"
            const allEditBtns = Array.from(personalTab.querySelectorAll('button')).filter(btn => {
                return btn.offsetParent &&
                       (btn.textContent.includes('Editar') || btn.textContent.includes('Edit'));
            });

            // El primer botón Editar visible suele ser el de Datos Básicos
            // (NO queremos el de Pasaporte que dice "✏️ Editar Pasaporte")
            for (const btn of allEditBtns) {
                const text = btn.textContent.trim();
                // Saltar si es específicamente de pasaporte
                if (text.toLowerCase().includes('pasaporte') || text.toLowerCase().includes('passport')) {
                    continue;
                }
                // El botón genérico "✏️ Editar" o "Edit" es el de datos básicos
                btn.click();
                return { ok: true, clicked: text };
            }
            return { ok: false, error: 'No edit button found', buttons: allEditBtns.map(b => b.textContent.trim()) };
        });

        if (editResult.ok) {
            console.log(`  ✓ Click en: "${editResult.clicked}"`);
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug-update-basic-data.png' });

            // Modificar un campo de texto
            const modified = await page.evaluate(() => {
                const inputs = document.querySelectorAll('input[type="text"], input[type="tel"]');
                for (const input of inputs) {
                    if (!input.offsetParent || input.disabled || input.readOnly) continue;
                    if (input.id === 'userInput' || input.id === 'passwordInput') continue;
                    if (input.closest('#loginForm')) continue;

                    const oldVal = input.value;
                    input.value = 'UPD_' + Date.now().toString().slice(-6);
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    return { field: input.name || input.id || 'unknown', old: oldVal, new: input.value };
                }
                return null;
            });

            if (modified) {
                console.log(`  ✓ Campo modificado: ${modified.field} (${modified.old} → ${modified.new})`);

                // Click Guardar
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

                results.update = apiUpdate;
                console.log(results.update ? '  ✅ UPDATE OK (API 200)' : '  ⚠️ UPDATE sin confirmación API');
            }
        } else {
            console.log(`  ⚠️ ${editResult.error}`);
            if (editResult.buttons) console.log(`     Botones encontrados: ${editResult.buttons.join(', ')}`);
        }
        console.log('');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST 3: DELETE - Grupo Familiar
        // ================================================================
        console.log('▶ TEST DELETE - FAMILIAR');
        console.log('-'.repeat(80));

        await page.evaluate(() => showFileTab('family'));
        await page.waitForTimeout(2000);

        const famBefore = await count('user_family_members');
        console.log(`  BD antes: ${famBefore}`);

        // Click "+ Agregar" en Hijos
        apiCreate = false;
        await page.evaluate(() => {
            const familyTab = document.getElementById('family-tab');
            if (familyTab) {
                const btns = familyTab.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.offsetParent && btn.textContent.includes('Agregar')) {
                        btn.click();
                        return true;
                    }
                }
            }
            return false;
        });
        await page.waitForTimeout(2000);
        console.log('  ✓ Modal "Agregar Hijo" abierto');

        // LLENAR FORMULARIO AGREGAR HIJO - Campos específicos vistos en screenshot
        const ts2 = Date.now().toString().slice(-6);
        const famFilled = await page.evaluate((timestamp) => {
            const results = [];

            // El modal de Agregar Hijo tiene:
            // - Nombre (text)
            // - Apellido (text)
            // - Fecha de Nacimiento (date)
            // - DNI (text)
            // - Sexo (select)
            // - ¿Vive con el empleado? (select o text)
            // - ¿A cargo económicamente? (select o text)
            // - Cobertura Médica (select)
            // - Observaciones (textarea)

            // 1. Todos los inputs de texto
            const textInputs = Array.from(document.querySelectorAll('input')).filter(i => {
                return i.offsetParent &&
                       !i.disabled &&
                       i.type !== 'file' &&
                       i.type !== 'hidden' &&
                       i.type !== 'checkbox' &&
                       i.id !== 'userInput' &&
                       i.id !== 'passwordInput' &&
                       !i.closest('#loginForm');
            });

            let filled = 0;
            for (const input of textInputs) {
                if (input.type === 'date') {
                    input.value = '1995-06-15';
                    filled++;
                } else if (input.type === 'number') {
                    input.value = '12345678';
                    filled++;
                } else {
                    // text o sin type
                    input.value = 'Hijo_Test_' + timestamp;
                    filled++;
                }
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            results.push(`Inputs: ${filled}`);

            // 2. Todos los selects (Sexo, Cobertura, etc.)
            let selectsFilled = 0;
            const selects = document.querySelectorAll('select');
            for (const s of selects) {
                if (s.offsetParent && s.id !== 'companySelect' && s.options.length > 1) {
                    s.selectedIndex = 1;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                    selectsFilled++;
                }
            }
            results.push(`Selects: ${selectsFilled}`);

            // 3. Textarea (Observaciones)
            const textareas = document.querySelectorAll('textarea');
            for (const ta of textareas) {
                if (ta.offsetParent && !ta.disabled) {
                    ta.value = 'Observación test ' + timestamp;
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }

            return results;
        }, ts2);

        console.log(`  ✓ Formulario llenado: ${famFilled.join(', ')}`);
        await page.screenshot({ path: 'debug-familiar-filled-correct.png' });

        // Click en botón "Agregar Hijo" (verde)
        const addChildClicked = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.trim();
                // Buscar específicamente "Agregar Hijo" o el botón verde de submit
                if (t === 'Agregar Hijo' ||
                    (t.toLowerCase().includes('agregar') && btn.className.includes('success'))) {
                    btn.click();
                    return { clicked: t };
                }
            }
            // Fallback: buscar Guardar/Save
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.toLowerCase();
                if (t.includes('guardar') || t.includes('save')) {
                    btn.click();
                    return { clicked: btn.textContent.trim() };
                }
            }
            return { clicked: null };
        });

        console.log(`  ✓ Click en: "${addChildClicked.clicked}"`);
        await page.waitForTimeout(4000);
        await page.screenshot({ path: 'debug-after-add-child.png' });

        const famAfterCreate = await count('user_family_members');
        const created = famAfterCreate > famBefore || apiCreate;
        console.log(`  Creado: ${created ? '✓' : '✗'} (BD: ${famAfterCreate - famBefore})`);

        if (created) {
            // Cerrar modal éxito
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    const t = btn.textContent.toLowerCase();
                    if (t.includes('entendido') || t.includes('ok') || t.includes('aceptar')) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(2000);

            // ELIMINAR
            apiDelete = false;
            const delClicked = await page.evaluate(() => {
                const familyTab = document.getElementById('family-tab');
                if (!familyTab) return { clicked: false };

                const btns = familyTab.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const c = btn.className.toLowerCase();
                    const h = btn.innerHTML.toLowerCase();
                    if (c.includes('danger') || h.includes('trash') || h.includes('delete')) {
                        btn.click();
                        return { clicked: true };
                    }
                }
                return { clicked: false };
            });

            if (delClicked.clicked) {
                console.log('  ✓ Click en eliminar');
                await page.waitForTimeout(2000);
                await page.screenshot({ path: 'debug-confirm-delete.png' });

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

                const famAfterDelete = await count('user_family_members');
                results.delete = famAfterDelete < famAfterCreate || apiDelete;
                console.log(`  BD después: ${famAfterDelete} (${famAfterDelete - famAfterCreate})`);
                console.log(results.delete ? '  ✅ DELETE OK' : '  ⚠️ DELETE pendiente');
            }
        } else {
            console.log('  ⚠️ No se creó familiar - no se puede probar DELETE');
            await page.screenshot({ path: 'debug-familiar-no-create.png' });
        }

        await page.screenshot({ path: 'debug-crud-correct-final.png', fullPage: true });

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-crud-error.png', fullPage: true });
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
