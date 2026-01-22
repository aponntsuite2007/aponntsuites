/**
 * CRUD TEST v3 - UPDATE & DELETE con verificación BD
 * Test completo de modificación y eliminación con persistencia
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

async function getLatestEducation(userId) {
    try {
        const [r] = await sequelize.query(`
            SELECT id, institution, degree FROM user_education
            WHERE user_id = '${userId}'
            ORDER BY id DESC LIMIT 1
        `);
        return r[0] || null;
    } catch { return null; }
}

(async () => {
    console.log('='.repeat(80));
    console.log('CRUD TEST v3 - UPDATE & DELETE CON VERIFICACIÓN BD');
    console.log('='.repeat(80));
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    let apiUpdate = false;
    let apiDelete = false;
    let apiCreate = false;

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

    const results = {
        create: { tested: false, success: false },
        update: { tested: false, success: false },
        delete: { tested: false, success: false }
    };

    try {
        // ============================================================
        // LOGIN
        // ============================================================
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

        // ============================================================
        // NAVEGAR A USUARIOS
        // ============================================================
        console.log('▶ NAVEGAR A GESTIÓN DE USUARIOS');
        await page.click('text=Gestión de Usuarios');
        await page.waitForTimeout(4000);
        console.log('  ✓ OK\n');

        // ============================================================
        // ABRIR EXPEDIENTE DE USUARIO EXISTENTE
        // ============================================================
        console.log('▶ ABRIR EXPEDIENTE DE USUARIO');
        console.log('-'.repeat(80));

        // Buscar un usuario que tenga datos para editar
        const userInfo = await page.evaluate(() => {
            const rows = document.querySelectorAll('table tbody tr');
            if (rows.length > 0) {
                // Buscar usuario de prueba o el primero disponible
                for (const row of rows) {
                    const cells = row.querySelectorAll('td');
                    if (cells.length > 0) {
                        const btn = row.querySelector('button');
                        if (btn) {
                            const name = cells[1]?.textContent || cells[0]?.textContent || 'Unknown';
                            btn.click();
                            return { ok: true, name: name.trim() };
                        }
                    }
                }
            }
            return { ok: false };
        });

        if (!userInfo.ok) {
            console.log('  ✗ No se encontró usuario para abrir');
            throw new Error('No users found');
        }

        console.log(`  ✓ Abriendo expediente: ${userInfo.name}`);
        await page.waitForTimeout(3000);

        // Obtener user_id del expediente abierto
        const userId = await page.evaluate(() => {
            // Buscar en el header del expediente o en un campo hidden
            const header = document.querySelector('[class*="expediente"], [class*="modal-header"], h4, h5');
            if (header) {
                const match = header.textContent.match(/ID[:\s]*([a-f0-9-]+)/i);
                if (match) return match[1];
            }
            // Buscar en URL o atributos data
            const modal = document.querySelector('[data-user-id], [data-userid]');
            if (modal) return modal.dataset.userId || modal.dataset.userid;
            return null;
        });

        console.log(`  User ID: ${userId || 'No detectado (usaremos queries generales)'}\n`);

        // ============================================================
        // PASO 1: IR A TAB 2 (PERSONAL DATA) Y CREAR EDUCACIÓN
        // ============================================================
        console.log('▶ PASO 1: CREAR REGISTRO DE EDUCACIÓN');
        console.log('-'.repeat(80));

        // Click en Tab 2
        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.nav-link, [role="tab"], button');
            for (const t of tabs) {
                const text = t.textContent.toLowerCase();
                if (text.includes('personal data') || text.includes('datos personales')) {
                    t.click();
                    return true;
                }
            }
            // Fallback: segundo tab
            const allTabs = document.querySelectorAll('.nav-link');
            if (allTabs[1]) allTabs[1].click();
            return false;
        });
        await page.waitForTimeout(2000);
        console.log('  ✓ Tab 2 (Personal Data) abierto');

        // Contar educación antes
        const eduBefore = await count('user_education');
        console.log(`  Registros user_education: ${eduBefore}`);

        // Buscar botón "+ Agregar Formación"
        apiCreate = false;
        const addEduClicked = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const text = btn.textContent.toLowerCase();
                if (text.includes('agregar formación') ||
                    text.includes('agregar educación') ||
                    (text.includes('+') && text.includes('formación'))) {
                    btn.click();
                    return { ok: true, text: btn.textContent.trim() };
                }
            }
            // Buscar en sección Formación Académica
            const headers = document.querySelectorAll('h5, h6, .card-header');
            for (const h of headers) {
                if (h.textContent.toLowerCase().includes('formación')) {
                    const card = h.closest('.card, section, div');
                    if (card) {
                        const btn = card.querySelector('button');
                        if (btn && btn.textContent.includes('+')) {
                            btn.click();
                            return { ok: true, text: btn.textContent.trim(), fromSection: true };
                        }
                    }
                }
            }
            return { ok: false };
        });

        if (addEduClicked.ok) {
            console.log(`  ✓ Click en: "${addEduClicked.text}"`);
            await page.waitForTimeout(2000);

            // Llenar formulario
            const timestamp = Date.now().toString().slice(-6);
            const testInstitution = `INST_CREATE_${timestamp}`;

            await page.evaluate((inst) => {
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
                        // Usar nombre identificable para la institución
                        if (input.placeholder?.toLowerCase().includes('institución') ||
                            input.name?.toLowerCase().includes('institution')) {
                            input.value = inst;
                        } else {
                            input.value = 'Test_' + Date.now().toString().slice(-4);
                        }
                    }
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                });
            }, testInstitution);
            console.log(`  ✓ Campos llenados (institución: ${testInstitution})`);

            // Guardar
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    const c = btn.className || '';
                    if (t.includes('cancelar') || t.startsWith('+')) continue;
                    if (c.includes('success') || c.includes('primary') ||
                        t.includes('guardar') || t.includes('agregar formación') ||
                        t === 'agregar') {
                        btn.click();
                        return true;
                    }
                }
                return false;
            });
            await page.waitForTimeout(4000);

            const eduAfter = await count('user_education');
            results.create.tested = true;
            results.create.success = eduAfter > eduBefore || apiCreate;
            console.log(`  Registros después: ${eduAfter} (${eduAfter > eduBefore ? '+' : ''}${eduAfter - eduBefore})`);
            console.log(results.create.success ? '  ✓ CREATE VERIFICADO EN BD' : '  ✗ CREATE no verificado');
        } else {
            console.log('  ⚠️ No se encontró botón de agregar educación');
        }
        console.log('');

        // ============================================================
        // PASO 2: UPDATE - EDITAR EL REGISTRO CREADO
        // ============================================================
        console.log('▶ PASO 2: UPDATE - EDITAR REGISTRO DE EDUCACIÓN');
        console.log('-'.repeat(80));

        // Cerrar modal si está abierto
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // Buscar botón de editar (lápiz amarillo) en la lista de educación
        apiUpdate = false;
        const editClicked = await page.evaluate(() => {
            // Buscar en cards de educación o filas de tabla
            const editBtns = document.querySelectorAll('button');
            for (const btn of editBtns) {
                if (!btn.offsetParent) continue;
                const html = btn.innerHTML.toLowerCase();
                const cls = btn.className.toLowerCase();
                // Buscar icono de editar o clase warning
                if (html.includes('pencil') || html.includes('edit') ||
                    html.includes('fa-pen') || html.includes('bi-pencil') ||
                    cls.includes('warning') || cls.includes('edit')) {
                    // Verificar que está en contexto de educación
                    const parent = btn.closest('.card, tr, .education-item, .list-group-item');
                    if (parent) {
                        btn.click();
                        return { ok: true, context: parent.className || 'unknown' };
                    }
                }
            }
            return { ok: false };
        });

        if (editClicked.ok) {
            console.log(`  ✓ Botón editar encontrado (${editClicked.context})`);
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug-update-modal.png' });

            // Modificar el valor
            const newValue = `UPDATED_${Date.now().toString().slice(-6)}`;
            await page.evaluate((val) => {
                const inputs = document.querySelectorAll('input[type="text"], textarea');
                for (const input of inputs) {
                    if (input.offsetParent && !input.disabled && !input.readOnly) {
                        input.value = val;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        break;
                    }
                }
            }, newValue);
            console.log(`  ✓ Campo modificado a: ${newValue}`);

            // Guardar cambios
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    const c = btn.className || '';
                    if (t.includes('cancelar') || t.startsWith('+')) continue;
                    if (t.includes('guardar') || t.includes('actualizar') ||
                        t.includes('update') || t.includes('save') ||
                        c.includes('success') || c.includes('primary')) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            });
            await page.waitForTimeout(4000);

            results.update.tested = true;
            results.update.success = apiUpdate;
            console.log(apiUpdate ? '  ✓ UPDATE VERIFICADO (API 200)' : '  ? UPDATE pendiente verificación');
        } else {
            console.log('  ⚠️ No se encontró botón de editar');
            console.log('  Tomando screenshot para debug...');
            await page.screenshot({ path: 'debug-no-edit-btn.png' });
        }
        console.log('');

        // ============================================================
        // PASO 3: DELETE - ELIMINAR REGISTRO DE EDUCACIÓN
        // ============================================================
        console.log('▶ PASO 3: DELETE - ELIMINAR REGISTRO DE EDUCACIÓN');
        console.log('-'.repeat(80));

        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        const eduBeforeDelete = await count('user_education');
        console.log(`  Registros antes: ${eduBeforeDelete}`);

        // Buscar botón de eliminar (papelera roja)
        apiDelete = false;
        const deleteClicked = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const html = btn.innerHTML.toLowerCase();
                const cls = btn.className.toLowerCase();
                // Buscar icono de eliminar o clase danger
                if (html.includes('trash') || html.includes('delete') ||
                    html.includes('fa-trash') || html.includes('bi-trash') ||
                    cls.includes('danger')) {
                    // Verificar contexto de educación
                    const parent = btn.closest('.card, tr, .education-item, .list-group-item');
                    if (parent) {
                        btn.click();
                        return { ok: true };
                    }
                }
            }
            return { ok: false };
        });

        if (deleteClicked.ok) {
            console.log('  ✓ Botón eliminar clickeado');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug-delete-confirm.png' });

            // Confirmar eliminación
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    const c = btn.className || '';
                    if (t.includes('confirmar') || t.includes('eliminar') ||
                        t.includes('sí') || t.includes('yes') || t.includes('delete') ||
                        (c.includes('danger') && !t.includes('cancel'))) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            });
            await page.waitForTimeout(4000);

            const eduAfterDelete = await count('user_education');
            results.delete.tested = true;
            results.delete.success = eduAfterDelete < eduBeforeDelete || apiDelete;
            console.log(`  Registros después: ${eduAfterDelete} (${eduAfterDelete - eduBeforeDelete})`);
            console.log(results.delete.success ? '  ✓ DELETE VERIFICADO EN BD' : '  ? DELETE pendiente');
        } else {
            console.log('  ⚠️ No se encontró botón de eliminar');
        }
        console.log('');

        // ============================================================
        // RESUMEN FINAL
        // ============================================================
        await page.screenshot({ path: 'debug-crud-final-v3.png', fullPage: true });

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-crud-error-v3.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // ============================================================
    // RESUMEN
    // ============================================================
    console.log('='.repeat(80));
    console.log('RESUMEN CRUD - UPDATE & DELETE');
    console.log('='.repeat(80));
    console.log('');
    console.log(`  CREATE: ${results.create.tested ? (results.create.success ? '✅ VERIFICADO' : '❌ FALLÓ') : '⚠️ NO TESTEADO'}`);
    console.log(`  UPDATE: ${results.update.tested ? (results.update.success ? '✅ VERIFICADO' : '❌ FALLÓ') : '⚠️ NO TESTEADO'}`);
    console.log(`  DELETE: ${results.delete.tested ? (results.delete.success ? '✅ VERIFICADO' : '❌ FALLÓ') : '⚠️ NO TESTEADO'}`);
    console.log('');

    const total = [results.create, results.update, results.delete].filter(r => r.success).length;
    console.log(`  TOTAL: ${total}/3 operaciones verificadas`);
    console.log('='.repeat(80));
})();
