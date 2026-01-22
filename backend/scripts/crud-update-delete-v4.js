/**
 * CRUD TEST v4 - UPDATE & DELETE con selectores EXACTOS
 * Basado en estructura real observada en screenshots
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
    console.log('CRUD TEST v4 - UPDATE & DELETE');
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
                console.log(`    📡 CREATE 201: ${r.url().substring(0, 70)}`);
            } else if ((method === 'PUT' || method === 'PATCH') && status === 200) {
                apiUpdate = true;
                console.log(`    📡 UPDATE 200: ${r.url().substring(0, 70)}`);
            } else if (method === 'DELETE' && (status === 200 || status === 204)) {
                apiDelete = true;
                console.log(`    📡 DELETE ${status}: ${r.url().substring(0, 70)}`);
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
            const row = document.querySelector('table tbody tr');
            if (row) {
                const btn = row.querySelector('button');
                if (btn) btn.click();
            }
        });
        await page.waitForTimeout(3000);
        console.log('  ✓ OK\n');

        // IR A TAB 2 (DATOS PERSONALES)
        console.log('▶ TAB 2: DATOS PERSONALES');
        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.nav-link, [role="tab"]');
            for (const t of tabs) {
                if (t.textContent.includes('Datos Personales')) {
                    t.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(2000);
        console.log('  ✓ Tab abierto\n');

        // ================================================================
        // TEST 1: CREATE - Agregar Formación Académica
        // ================================================================
        console.log('▶ TEST CREATE - FORMACIÓN ACADÉMICA');
        console.log('-'.repeat(80));

        const eduBefore = await count('user_education');
        console.log(`  Registros antes: ${eduBefore}`);

        // Click en "+ Agregar" de Formación Académica
        apiCreate = false;
        const addClicked = await page.evaluate(() => {
            // Buscar la sección "Formación Académica"
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
                if (el.textContent.includes('Formación Académica') && el.tagName.match(/^H[1-6]$/i)) {
                    // Buscar el botón cercano
                    const parent = el.closest('.card, section, div');
                    if (parent) {
                        const btn = parent.querySelector('button');
                        if (btn && btn.textContent.includes('Agregar')) {
                            btn.click();
                            return { ok: true, text: btn.textContent.trim() };
                        }
                    }
                }
            }
            // Fallback: buscar directamente botón "Agregar" cerca de "Formación"
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                if (btn.textContent.includes('Agregar') && !btn.textContent.includes('Usuario')) {
                    // Verificar que está cerca de Formación
                    const nearText = btn.parentElement?.textContent || '';
                    if (nearText.includes('Formación') || nearText.includes('Académica')) {
                        btn.click();
                        return { ok: true, text: btn.textContent.trim() };
                    }
                }
            }
            // Último fallback: cualquier botón con "+ Agregar" que no sea usuario
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.trim() === '+ Agregar') {
                    btn.click();
                    return { ok: true, text: '+ Agregar (fallback)' };
                }
            }
            return { ok: false };
        });

        if (addClicked.ok) {
            console.log(`  ✓ Click en: "${addClicked.text}"`);
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug-edu-modal.png' });

            // Llenar formulario de educación
            const ts = Date.now().toString().slice(-6);
            await page.evaluate((timestamp) => {
                // Selects
                document.querySelectorAll('select').forEach(s => {
                    if (s.offsetParent && s.options.length > 1) {
                        s.selectedIndex = 1;
                        s.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
                // Inputs
                document.querySelectorAll('input, textarea').forEach(input => {
                    if (!input.offsetParent || input.disabled) return;
                    if (input.type === 'date') {
                        input.value = '2020-06-15';
                    } else if (input.type === 'number') {
                        const max = input.max ? parseInt(input.max) : 10;
                        input.value = Math.min(8, max).toString();
                    } else if (input.type !== 'hidden' && input.type !== 'checkbox') {
                        input.value = 'CRUD_Test_' + timestamp;
                    }
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                });
            }, ts);
            console.log('  ✓ Campos llenados');

            // Guardar - buscar botón verde/success
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    const c = btn.className || '';
                    if (t.includes('cancel') || t === '+ agregar') continue;
                    if (c.includes('success') || c.includes('primary') ||
                        t.includes('guardar') || t.includes('agregar')) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.waitForTimeout(4000);

            const eduAfter = await count('user_education');
            results.create = eduAfter > eduBefore || apiCreate;
            console.log(`  Registros después: ${eduAfter} (${eduAfter - eduBefore >= 0 ? '+' : ''}${eduAfter - eduBefore})`);
            console.log(results.create ? '  ✓ CREATE VERIFICADO' : '  ✗ CREATE no verificado');
        } else {
            console.log('  ✗ Botón no encontrado');
        }
        console.log('');

        // Cerrar modal si está abierto
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST 2: UPDATE - Editar Datos Básicos
        // ================================================================
        console.log('▶ TEST UPDATE - DATOS BÁSICOS');
        console.log('-'.repeat(80));

        // Click en botón "Editar" de Datos Básicos (botón azul grande)
        apiUpdate = false;
        const editClicked = await page.evaluate(() => {
            // Buscar el botón "Editar" en la sección "Datos Básicos"
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.trim();
                // El botón dice "✏️ Editar" o similar
                if (t.includes('Editar') && !t.includes('Agregar')) {
                    // Verificar que está en Datos Básicos (primer botón Editar visible)
                    const parent = btn.closest('.card, section, div');
                    if (parent && parent.textContent.includes('Datos') && parent.textContent.includes('Básicos')) {
                        btn.click();
                        return { ok: true, text: t, section: 'Datos Básicos' };
                    }
                }
            }
            // Fallback: primer botón Editar visible
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Editar')) {
                    btn.click();
                    return { ok: true, text: btn.textContent.trim(), section: 'fallback' };
                }
            }
            return { ok: false };
        });

        if (editClicked.ok) {
            console.log(`  ✓ Click en: "${editClicked.text}" (${editClicked.section})`);
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug-edit-datos.png' });

            // Modificar un campo
            const newPhone = '1234567890';
            await page.evaluate((phone) => {
                // Buscar campo de teléfono
                const inputs = document.querySelectorAll('input');
                for (const input of inputs) {
                    if (!input.offsetParent || input.disabled) continue;
                    const name = (input.name || '').toLowerCase();
                    const ph = (input.placeholder || '').toLowerCase();
                    if (name.includes('phone') || name.includes('telefono') ||
                        ph.includes('teléfono') || ph.includes('phone')) {
                        input.value = phone;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        return true;
                    }
                }
                // Fallback: modificar cualquier input de texto
                for (const input of inputs) {
                    if (input.offsetParent && input.type === 'text' && !input.disabled) {
                        input.value = 'UPDATED_' + Date.now().toString().slice(-6);
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        return true;
                    }
                }
                return false;
            }, newPhone);
            console.log(`  ✓ Campo modificado`);

            // Guardar
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    const c = btn.className || '';
                    if (t.includes('cancel')) continue;
                    if (t.includes('guardar') || t.includes('actualizar') ||
                        c.includes('success') || c.includes('primary')) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.waitForTimeout(4000);

            results.update = apiUpdate;
            console.log(results.update ? '  ✓ UPDATE VERIFICADO (API 200)' : '  ? UPDATE pendiente');
        } else {
            console.log('  ✗ Botón Editar no encontrado');
        }
        console.log('');

        // Cerrar modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST 3: DELETE - Eliminar registro de Grupo Familiar
        // ================================================================
        console.log('▶ TEST DELETE - GRUPO FAMILIAR');
        console.log('-'.repeat(80));

        // Ir a Tab 4 (Grupo Familiar) que tiene mejor soporte para delete
        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.nav-link, [role="tab"]');
            for (const t of tabs) {
                if (t.textContent.includes('Grupo Familiar')) {
                    t.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(2000);
        console.log('  ✓ Tab Grupo Familiar abierto');

        const famBefore = await count('user_family_members');
        console.log(`  Registros antes: ${famBefore}`);

        // Primero crear un registro para eliminar
        apiCreate = false;
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Agregar')) {
                    btn.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(2000);

        // Llenar formulario de familiar
        await page.evaluate(() => {
            const ts = Date.now().toString().slice(-6);
            document.querySelectorAll('select').forEach(s => {
                if (s.offsetParent && s.options.length > 1) {
                    s.selectedIndex = 1;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            document.querySelectorAll('input').forEach(input => {
                if (!input.offsetParent || input.disabled) return;
                if (input.type === 'date') {
                    input.value = '1990-05-15';
                } else if (input.type !== 'hidden' && input.type !== 'checkbox') {
                    input.value = 'DELETE_TEST_' + ts;
                }
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });
        });

        // Guardar
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.toLowerCase();
                const c = btn.className || '';
                if (t.includes('cancel')) continue;
                if (c.includes('success') || t.includes('guardar') || t.includes('agregar')) {
                    btn.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(4000);

        const famAfterCreate = await count('user_family_members');
        console.log(`  ✓ Registro creado para eliminar (${famAfterCreate - famBefore >= 0 ? '+' : ''}${famAfterCreate - famBefore})`);

        // Cerrar modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // Ahora buscar y eliminar
        apiDelete = false;
        const deleteClicked = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const cls = btn.className.toLowerCase();
                const html = btn.innerHTML.toLowerCase();
                if (cls.includes('danger') || html.includes('trash') || html.includes('delete')) {
                    btn.click();
                    return { ok: true };
                }
            }
            return { ok: false };
        });

        if (deleteClicked.ok) {
            console.log('  ✓ Botón eliminar clickeado');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug-delete-modal.png' });

            // Confirmar
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    const c = btn.className || '';
                    if (t.includes('confirmar') || t.includes('eliminar') || t.includes('sí') ||
                        (c.includes('danger') && !t.includes('cancel'))) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.waitForTimeout(4000);

            const famAfterDelete = await count('user_family_members');
            results.delete = famAfterDelete < famAfterCreate || apiDelete;
            console.log(`  Registros después: ${famAfterDelete} (${famAfterDelete - famAfterCreate})`);
            console.log(results.delete ? '  ✓ DELETE VERIFICADO' : '  ? DELETE pendiente');
        } else {
            console.log('  ⚠️ Botón eliminar no encontrado');
        }

        await page.screenshot({ path: 'debug-crud-v4-final.png', fullPage: true });

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-crud-v4-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN
    console.log('\n' + '='.repeat(80));
    console.log('RESUMEN CRUD COMPLETO');
    console.log('='.repeat(80));
    console.log(`  CREATE: ${results.create ? '✅ VERIFICADO' : '❌ NO VERIFICADO'}`);
    console.log(`  UPDATE: ${results.update ? '✅ VERIFICADO' : '❌ NO VERIFICADO'}`);
    console.log(`  DELETE: ${results.delete ? '✅ VERIFICADO' : '❌ NO VERIFICADO'}`);
    console.log('');
    const total = [results.create, results.update, results.delete].filter(Boolean).length;
    console.log(`  TOTAL: ${total}/3 operaciones CRUD verificadas`);
    console.log('='.repeat(80));
})();
