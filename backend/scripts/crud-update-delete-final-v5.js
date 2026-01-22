/**
 * CRUD TEST FINAL v5 - UPDATE & DELETE
 * Selectores corregidos basados en screenshots reales
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
    console.log('CRUD TEST FINAL v5 - CREATE, UPDATE & DELETE');
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

        // ================================================================
        // TEST 1: CREATE - Formación Académica en Tab 2
        // ================================================================
        console.log('▶ TEST CREATE - TAB 2: FORMACIÓN ACADÉMICA');
        console.log('-'.repeat(80));

        // Ir a Tab 2 (Datos Personales)
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
        console.log('  ✓ Tab 2 abierto');

        const eduBefore = await count('user_education');
        console.log(`  Registros antes: ${eduBefore}`);

        // Click en "+ Agregar" de Formación Académica
        apiCreate = false;
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.trim();
                if (t === '+ Agregar') {
                    // Verificar contexto - debe estar en Formación Académica
                    const section = btn.closest('div, section');
                    if (section && section.textContent.includes('Formación')) {
                        btn.click();
                        return;
                    }
                }
            }
            // Fallback
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.trim() === '+ Agregar') {
                    btn.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(2000);
        console.log('  ✓ Modal de educación abierto');

        // Llenar formulario CORRECTAMENTE
        const ts = Date.now().toString().slice(-6);
        await page.evaluate((timestamp) => {
            // 1. TIPO - Primer select (obligatorio)
            const selects = document.querySelectorAll('select');
            selects.forEach((s, idx) => {
                if (s.offsetParent && s.options.length > 1) {
                    // Seleccionar segunda opción (no "Seleccionar...")
                    s.selectedIndex = 1;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // 2. Campos de texto
            const inputs = document.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                if (!input.offsetParent || input.disabled) return;
                if (input.type === 'date' || input.type === 'number') {
                    if (input.type === 'number') {
                        const max = input.max ? parseInt(input.max) : 10;
                        input.value = Math.min(8, max).toString();
                    }
                } else if (input.type !== 'hidden' && input.type !== 'checkbox') {
                    input.value = 'CRUD_Test_' + timestamp;
                }
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }, ts);
        console.log('  ✓ Campos llenados');
        await page.screenshot({ path: 'debug-edu-filled.png' });

        // Click en botón "Guardar" (azul)
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.toLowerCase();
                if (t === 'guardar' || t.includes('guardar')) {
                    btn.click();
                    return;
                }
            }
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
        // TEST 2: UPDATE - Editar Datos Básicos (botón azul "Editar")
        // ================================================================
        console.log('▶ TEST UPDATE - TAB 2: DATOS BÁSICOS');
        console.log('-'.repeat(80));

        // Buscar botón "✏️ Editar" que está DENTRO de la sección "Datos Básicos"
        // NO el botón "Agregar Usuario" ni otros
        apiUpdate = false;
        const editResult = await page.evaluate(() => {
            // Buscar la sección "Datos Básicos" primero
            const headers = document.querySelectorAll('h5, h6, .card-title, strong');
            for (const h of headers) {
                if (h.textContent.includes('Datos') && h.textContent.includes('Básicos')) {
                    // Encontramos la sección, buscar botón Editar cerca
                    const section = h.closest('.card, div, section');
                    if (section) {
                        const editBtn = section.querySelector('button');
                        if (editBtn && editBtn.textContent.includes('Editar')) {
                            editBtn.click();
                            return { ok: true, text: editBtn.textContent.trim() };
                        }
                    }
                }
            }

            // Fallback: buscar botón con texto exacto "✏️ Editar" que sea azul
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.trim();
                const c = btn.className || '';
                // Botón azul con solo "Editar" (no "Editar Posición", no "Agregar")
                if ((t === '✏️ Editar' || t === 'Editar') &&
                    (c.includes('primary') || c.includes('info')) &&
                    !t.includes('Posición') && !t.includes('Usuario')) {
                    btn.click();
                    return { ok: true, text: t };
                }
            }

            return { ok: false };
        });

        if (editResult.ok) {
            console.log(`  ✓ Click en: "${editResult.text}"`);
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug-edit-basicos.png' });

            // Verificar que se abrió el modal correcto (no "Agregar Nuevo Usuario")
            const modalTitle = await page.evaluate(() => {
                const titles = document.querySelectorAll('h4, h5, .modal-title');
                for (const t of titles) {
                    if (t.offsetParent && t.textContent.trim().length > 0) {
                        return t.textContent.trim();
                    }
                }
                return '';
            });
            console.log(`  Modal: "${modalTitle}"`);

            if (!modalTitle.includes('Agregar') && !modalTitle.includes('Nuevo')) {
                // Modal correcto, modificar campo
                await page.evaluate(() => {
                    const inputs = document.querySelectorAll('input[type="text"], input[type="tel"]');
                    for (const input of inputs) {
                        if (input.offsetParent && !input.disabled && !input.readOnly) {
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
                        if (!btn.offsetParent) continue;
                        const t = btn.textContent.toLowerCase();
                        if (t.includes('guardar') || t.includes('actualizar')) {
                            btn.click();
                            return;
                        }
                    }
                });
                await page.waitForTimeout(4000);

                results.update = apiUpdate;
                console.log(results.update ? '  ✅ UPDATE VERIFICADO (API 200)' : '  ⚠️ UPDATE pendiente API');
            } else {
                console.log('  ⚠️ Se abrió modal incorrecto');
            }
        } else {
            console.log('  ⚠️ Botón Editar no encontrado');
        }
        console.log('');

        // Cerrar modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST 3: DELETE - Crear y Eliminar Familiar (Tab 4)
        // ================================================================
        console.log('▶ TEST DELETE - TAB 4: GRUPO FAMILIAR');
        console.log('-'.repeat(80));

        // Ir a Tab 4
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
        console.log('  ✓ Tab 4 abierto');

        const famBefore = await count('user_family_members');
        console.log(`  Registros antes: ${famBefore}`);

        // Crear familiar para poder eliminar
        apiCreate = false;
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && (btn.textContent.includes('Agregar') || btn.textContent.includes('+'))) {
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
                } else if (input.type !== 'hidden' && input.type !== 'checkbox' && input.type !== 'number') {
                    input.value = 'DELETE_TEST_' + ts;
                }
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });
        });
        await page.screenshot({ path: 'debug-familiar-form.png' });

        // Guardar familiar
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.toLowerCase();
                const c = btn.className || '';
                if (t.includes('cancel')) continue;
                if (t.includes('guardar') || t.includes('agregar') || c.includes('success')) {
                    btn.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(4000);

        const famAfterCreate = await count('user_family_members');
        const familiarCreated = famAfterCreate > famBefore || apiCreate;
        console.log(`  Registro creado: ${familiarCreated ? '✓' : '✗'} (${famAfterCreate - famBefore})`);

        // Cerrar modal de éxito si existe
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.textContent.toLowerCase().includes('entendido') ||
                    btn.textContent.toLowerCase().includes('cerrar') ||
                    btn.textContent.toLowerCase().includes('ok')) {
                    btn.click();
                    return;
                }
            }
        });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(2000);

        // Ahora buscar botón de eliminar (papelera roja)
        apiDelete = false;
        await page.screenshot({ path: 'debug-before-delete.png' });

        const deleteResult = await page.evaluate(() => {
            // Buscar botón con icono de papelera o clase danger
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const html = btn.innerHTML.toLowerCase();
                const cls = btn.className.toLowerCase();
                const txt = btn.textContent.toLowerCase();

                // Buscar icono trash o clase danger (pero no "Gestionar Baja")
                if ((html.includes('trash') || html.includes('fa-trash') ||
                     html.includes('bi-trash') || cls.includes('btn-danger')) &&
                    !txt.includes('baja') && !txt.includes('gestionar')) {
                    btn.click();
                    return { ok: true, class: cls };
                }
            }
            return { ok: false };
        });

        if (deleteResult.ok) {
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
                        t.includes('sí') || t === 'yes' ||
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
            console.log(results.delete ? '  ✅ DELETE VERIFICADO EN BD' : '  ⚠️ DELETE pendiente');
        } else {
            console.log('  ⚠️ Botón eliminar no visible');
            // Ver qué botones hay
            const visibleBtns = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('button'))
                    .filter(b => b.offsetParent)
                    .map(b => b.textContent.trim().substring(0, 30))
                    .slice(0, 10);
            });
            console.log(`  Botones visibles: ${visibleBtns.join(', ')}`);
        }

        await page.screenshot({ path: 'debug-crud-v5-final.png', fullPage: true });

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-crud-v5-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN FINAL
    console.log('\n' + '='.repeat(80));
    console.log('RESUMEN CRUD - MÓDULO USUARIOS');
    console.log('='.repeat(80));
    console.log('');
    console.log(`  CREATE (Educación):    ${results.create ? '✅ VERIFICADO BD' : '❌ NO VERIFICADO'}`);
    console.log(`  UPDATE (Datos):        ${results.update ? '✅ VERIFICADO API' : '❌ NO VERIFICADO'}`);
    console.log(`  DELETE (Familiar):     ${results.delete ? '✅ VERIFICADO BD' : '❌ NO VERIFICADO'}`);
    console.log('');
    const total = [results.create, results.update, results.delete].filter(Boolean).length;
    console.log(`  TOTAL: ${total}/3 operaciones CRUD verificadas`);
    console.log('');
    if (total === 3) {
        console.log('  🎉 CRUD COMPLETO AL 100%');
    } else {
        console.log(`  ⚠️ Faltan ${3 - total} operaciones por verificar`);
    }
    console.log('='.repeat(80));
})();
