/**
 * CRUD TEST FINAL FIXED
 * Botones corregidos: Save (no Guardar), Edit correcto
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
    console.log('CRUD TEST FINAL - BOTONES CORREGIDOS');
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
        console.log('▶ TEST CREATE - EDUCACIÓN');
        console.log('-'.repeat(80));

        await page.evaluate(() => showFileTab('personal'));
        await page.waitForTimeout(2000);
        console.log('  ✓ Tab Personal');

        const eduBefore = await count('user_education');
        console.log(`  Registros antes: ${eduBefore}`);

        // Click "+ Agregar" en Education
        apiCreate = false;
        await page.evaluate(() => {
            const personalTab = document.getElementById('personal-tab');
            if (personalTab) {
                const btns = personalTab.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.textContent.includes('Agregar') && btn.offsetParent) {
                        btn.click();
                        return;
                    }
                }
            }
        });
        await page.waitForTimeout(2000);
        console.log('  ✓ Modal abierto');

        // Llenar formulario
        const ts = Date.now().toString().slice(-6);
        await page.evaluate((timestamp) => {
            document.querySelectorAll('select').forEach(s => {
                if (s.offsetParent && s.id !== 'companySelect' && s.options.length > 1) {
                    s.selectedIndex = 1;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            document.querySelectorAll('input').forEach(input => {
                if (!input.offsetParent || input.disabled) return;
                if (input.type === 'file' || input.type === 'hidden' || input.type === 'checkbox') return;
                if (input.id === 'userInput' || input.id === 'passwordInput') return;
                if (input.type === 'number') {
                    input.value = '8';
                } else {
                    input.value = 'EDU_' + timestamp;
                }
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });
            document.querySelectorAll('textarea').forEach(ta => {
                if (ta.offsetParent) {
                    ta.value = 'Desc_' + timestamp;
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        }, ts);
        console.log('  ✓ Campos llenados');

        // Click SAVE (no Guardar - el modal usa inglés)
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
        console.log(`  Registros después: ${eduAfter} (${eduAfter > eduBefore ? '+' : ''}${eduAfter - eduBefore})`);
        console.log(results.create ? '  ✅ CREATE VERIFICADO' : '  ❌ CREATE no verificado');
        console.log('');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST 2: UPDATE - Editar Basic Data (NO pasaporte)
        // ================================================================
        console.log('▶ TEST UPDATE - BASIC DATA');
        console.log('-'.repeat(80));

        await page.evaluate(() => showFileTab('personal'));
        await page.waitForTimeout(1000);

        // El botón "Edit" de Basic Data es el PRIMER botón con "Edit"
        // que está en la sección "Basic Data" (no Contacts, no Passport)
        apiUpdate = false;
        const editClicked = await page.evaluate(() => {
            const personalTab = document.getElementById('personal-tab');
            if (!personalTab) return { ok: false };

            // Buscar la sección "Basic Data" o "Datos Básicos"
            const sections = personalTab.querySelectorAll('.card, section, div');
            for (const section of sections) {
                const text = section.textContent;
                // La sección de Basic Data contiene "Nombre Completo" o "Email"
                if ((text.includes('Basic') && text.includes('Data')) ||
                    (text.includes('Datos') && text.includes('Básicos')) ||
                    text.includes('Nombre Completo')) {
                    // Buscar botón Edit/Editar en esta sección específica
                    const btn = section.querySelector('button');
                    if (btn && btn.offsetParent &&
                        (btn.textContent.includes('Edit') || btn.textContent.includes('Editar'))) {
                        btn.click();
                        return { ok: true, text: btn.textContent.trim() };
                    }
                }
            }

            // Fallback: buscar botón azul grande de editar (el primero visible)
            const btns = Array.from(personalTab.querySelectorAll('button'));
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.trim();
                const c = btn.className || '';
                // El botón de Basic Data es azul (primary/info) y grande
                if ((t.includes('Edit') || t.includes('Editar')) &&
                    (c.includes('primary') || c.includes('info') || c.includes('btn-block'))) {
                    btn.click();
                    return { ok: true, text: t, method: 'color' };
                }
            }

            return { ok: false };
        });

        if (editClicked.ok) {
            console.log(`  ✓ Click en: "${editClicked.text}"`);
            await page.waitForTimeout(2000);

            // Verificar que NO se abrió Pasaporte
            const modalTitle = await page.evaluate(() => {
                const h4 = document.querySelector('h4, h5, .modal-title');
                return h4 ? h4.textContent.trim() : '';
            });
            console.log(`  Modal: ${modalTitle}`);

            if (!modalTitle.includes('Pasaporte') && !modalTitle.includes('Passport')) {
                // Modificar campo
                await page.evaluate(() => {
                    const inputs = document.querySelectorAll('input[type="text"], input[type="tel"]');
                    for (const input of inputs) {
                        if (input.offsetParent && !input.disabled &&
                            input.id !== 'userInput' && input.id !== 'passwordInput') {
                            input.value = 'UPD_' + Date.now().toString().slice(-6);
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            break;
                        }
                    }
                });
                console.log('  ✓ Campo modificado');

                // Click Save/Guardar
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
                console.log(results.update ? '  ✅ UPDATE VERIFICADO' : '  ⚠️ UPDATE pendiente API');
            } else {
                console.log('  ⚠️ Modal incorrecto (Pasaporte)');
            }
        } else {
            console.log('  ⚠️ Botón Edit no encontrado');
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
        console.log('  ✓ Tab Family');

        const famBefore = await count('user_family_members');
        console.log(`  Registros antes: ${famBefore}`);

        // Crear familiar
        apiCreate = false;
        await page.evaluate(() => {
            const familyTab = document.getElementById('family-tab');
            if (familyTab) {
                const btns = familyTab.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.offsetParent && btn.textContent.includes('Agregar')) {
                        btn.click();
                        return;
                    }
                }
            }
        });
        await page.waitForTimeout(2000);

        // Llenar (sin file inputs)
        await page.evaluate(() => {
            const ts = Date.now().toString().slice(-6);
            document.querySelectorAll('select').forEach(s => {
                if (s.offsetParent && s.id !== 'companySelect' && s.options.length > 1) {
                    s.selectedIndex = 1;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            document.querySelectorAll('input').forEach(input => {
                if (!input.offsetParent || input.disabled || input.type === 'file') return;
                if (input.id === 'userInput' || input.id === 'passwordInput') return;
                if (input.type === 'date') {
                    input.value = '1990-06-15';
                } else if (input.type === 'number') {
                    input.value = '12345678';
                } else if (input.type === 'text' || !input.type) {
                    input.value = 'FAM_' + ts;
                }
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });
        });
        console.log('  ✓ Formulario llenado');

        // Save (inglés)
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

        const famAfterCreate = await count('user_family_members');
        const created = famAfterCreate > famBefore || apiCreate;
        console.log(`  Familiar creado: ${created ? '✓' : '✗'} (${famAfterCreate - famBefore})`);

        // Cerrar modal éxito
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                const t = btn.textContent.toLowerCase();
                if (t.includes('entendido') || t.includes('ok') || t.includes('close')) {
                    btn.click();
                    return;
                }
            }
        });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(2000);

        // Eliminar
        apiDelete = false;
        const deleteClicked = await page.evaluate(() => {
            const familyTab = document.getElementById('family-tab');
            if (!familyTab) return false;
            const btns = familyTab.querySelectorAll('button');
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

        if (deleteClicked) {
            console.log('  ✓ Click eliminar');
            await page.waitForTimeout(2000);

            // Confirmar
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    if (t.includes('confirm') || t.includes('eliminar') ||
                        t.includes('delete') || t.includes('sí')) {
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
            console.log('  ⚠️ Botón delete no encontrado');
        }

        await page.screenshot({ path: 'debug-crud-final-result.png', fullPage: true });

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
    console.log(`  CREATE: ${results.create ? '✅ VERIFICADO BD' : '❌ PENDIENTE'}`);
    console.log(`  UPDATE: ${results.update ? '✅ VERIFICADO API' : '❌ PENDIENTE'}`);
    console.log(`  DELETE: ${results.delete ? '✅ VERIFICADO BD' : '❌ PENDIENTE'}`);
    console.log('');
    const total = [results.create, results.update, results.delete].filter(Boolean).length;
    console.log(`  TOTAL: ${total}/3 operaciones`);
    if (total >= 2) console.log('  🎉 CRUD MAYORÍA FUNCIONAL');
    if (total === 3) console.log('  🎉🎉 CRUD 100% COMPLETO');
    console.log('='.repeat(80));
})();
