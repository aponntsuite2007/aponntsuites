/**
 * CRUD TEST COMPLETO - Valores y selectores corregidos
 * Maneja validaciones y botones específicos por formulario
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
    console.log('CRUD TEST COMPLETO - VALORES CORREGIDOS');
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
        console.log('▶ NAVEGAR A USUARIOS');
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
        // TEST 1: CREATE EDUCACIÓN - Tab Personal
        // ================================================================
        console.log('▶ TEST 1: CREATE EDUCACIÓN');
        console.log('-'.repeat(80));

        await page.evaluate(() => showFileTab('personal'));
        await page.waitForTimeout(2000);
        console.log('  ✓ Tab Personal');

        const eduBefore = await count('user_education');
        console.log(`  BD antes: ${eduBefore}`);

        // Click "+ Agregar" en sección Education
        apiCreate = false;
        await page.evaluate(() => {
            const tab = document.getElementById('personal-tab');
            if (!tab) return;
            // Buscar sección Education/Formación
            const btns = tab.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Agregar')) {
                    // Verificar que está en sección Education
                    const section = btn.closest('div, section');
                    if (section && (section.textContent.includes('Education') ||
                        section.textContent.includes('Formación') ||
                        section.textContent.includes('Académica'))) {
                        btn.click();
                        return;
                    }
                }
            }
            // Fallback: primer botón Agregar
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Agregar')) {
                    btn.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(2000);

        // Llenar formulario de educación
        await page.evaluate(() => {
            // 1. Selects
            document.querySelectorAll('select').forEach(s => {
                if (s.offsetParent && s.id !== 'companySelect' && s.options.length > 1) {
                    s.selectedIndex = 1;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // 2. Inputs - con valores apropiados según tipo
            document.querySelectorAll('input').forEach(input => {
                if (!input.offsetParent || input.disabled) return;
                if (input.type === 'file' || input.type === 'hidden' || input.type === 'checkbox') return;
                if (input.id === 'userInput' || input.id === 'passwordInput') return;

                const name = (input.name || '').toLowerCase();
                const ph = (input.placeholder || '').toLowerCase();

                if (input.type === 'number') {
                    // Para números, usar valor pequeño válido
                    const max = input.max ? parseInt(input.max) : 10;
                    input.value = Math.min(8, max).toString();
                } else if (input.type === 'date') {
                    input.value = '2020-06-15';
                } else {
                    input.value = 'Test_Educacion';
                }
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // 3. Textareas
            document.querySelectorAll('textarea').forEach(ta => {
                if (ta.offsetParent && !ta.disabled) {
                    ta.value = 'Descripción de prueba';
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        });
        console.log('  ✓ Formulario llenado');

        // Click en botón Save/Guardar/Agregar
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.trim().toLowerCase();
                // Buscar botón de guardar (Save, Guardar, o Agregar Formación)
                if (t === 'save' || t === 'guardar' ||
                    t.includes('agregar formación') || t.includes('agregar educación')) {
                    btn.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(4000);

        const eduAfter = await count('user_education');
        results.create = eduAfter > eduBefore || apiCreate;
        console.log(`  BD después: ${eduAfter} (${eduAfter > eduBefore ? '+' : ''}${eduAfter - eduBefore})`);
        console.log(results.create ? '  ✅ CREATE VERIFICADO' : '  ❌ CREATE pendiente');
        console.log('');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST 2: UPDATE - Editar datos básicos
        // ================================================================
        console.log('▶ TEST 2: UPDATE DATOS BÁSICOS');
        console.log('-'.repeat(80));

        await page.evaluate(() => showFileTab('personal'));
        await page.waitForTimeout(1000);

        // El botón de editar Basic Data es azul y dice "✏️ Editar" o "✏️ Edit"
        // NO es el botón de ayuda flotante (que es morado/azul redondo abajo-derecha)
        apiUpdate = false;

        // Buscar específicamente en la sección "Basic Data" o "Datos Básicos"
        const editResult = await page.evaluate(() => {
            const tab = document.getElementById('personal-tab');
            if (!tab) return { ok: false, error: 'Tab not found' };

            // Buscar cards/secciones
            const cards = tab.querySelectorAll('.card, .section, div');
            for (const card of cards) {
                const text = card.textContent || '';
                // La sección Basic Data contiene estos textos
                if ((text.includes('Basic') || text.includes('Básicos') || text.includes('Datos')) &&
                    (text.includes('Nombre') || text.includes('Email') || text.includes('DNI'))) {

                    // Buscar botón Edit/Editar dentro de esta card
                    const btns = card.querySelectorAll('button');
                    for (const btn of btns) {
                        if (!btn.offsetParent) continue;
                        const btnText = btn.textContent.trim();
                        const btnClass = btn.className || '';

                        // El botón correcto tiene icono de lápiz y es azul
                        if ((btnText.includes('Edit') || btnText.includes('Editar')) &&
                            !btnClass.includes('help') && !btnClass.includes('assistant') &&
                            !btnClass.includes('rounded-circle')) {
                            btn.click();
                            return { ok: true, text: btnText };
                        }
                    }
                }
            }

            return { ok: false, error: 'Button not found in Basic Data section' };
        });

        if (editResult.ok) {
            console.log(`  ✓ Click: "${editResult.text}"`);
            await page.waitForTimeout(2000);

            // Verificar modal correcto
            const modalTitle = await page.evaluate(() => {
                const titles = document.querySelectorAll('h4, h5, .modal-title');
                for (const t of titles) {
                    if (t.offsetParent) return t.textContent.trim();
                }
                return '';
            });
            console.log(`  Modal: ${modalTitle.substring(0, 40)}`);

            if (!modalTitle.includes('Asistente') && !modalTitle.includes('Ayuda') &&
                !modalTitle.includes('Pasaporte')) {
                // Modificar campo
                await page.evaluate(() => {
                    const inputs = document.querySelectorAll('input[type="text"], input[type="tel"]');
                    for (const input of inputs) {
                        if (input.offsetParent && !input.disabled &&
                            input.id !== 'userInput' && input.id !== 'passwordInput') {
                            input.value = 'UPDATED_TEST';
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
                        if (t.includes('save') || t.includes('guardar') || t.includes('update')) {
                            btn.click();
                            return;
                        }
                    }
                });
                await page.waitForTimeout(4000);

                results.update = apiUpdate;
                console.log(results.update ? '  ✅ UPDATE VERIFICADO' : '  ⚠️ UPDATE sin API confirm');
            } else {
                console.log('  ⚠️ Modal incorrecto');
            }
        } else {
            console.log(`  ⚠️ ${editResult.error}`);
        }
        console.log('');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST 3: DELETE - Crear y eliminar familiar
        // ================================================================
        console.log('▶ TEST 3: DELETE FAMILIAR');
        console.log('-'.repeat(80));

        await page.evaluate(() => showFileTab('family'));
        await page.waitForTimeout(2000);
        console.log('  ✓ Tab Family');

        const famBefore = await count('user_family_members');
        console.log(`  BD antes: ${famBefore}`);

        // Click en "+ Agregar Hijo" específicamente
        apiCreate = false;
        await page.evaluate(() => {
            const tab = document.getElementById('family-tab');
            if (!tab) return;
            const btns = tab.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && (btn.textContent.includes('Agregar Hijo') ||
                    btn.textContent.includes('+ Agregar'))) {
                    btn.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(2000);

        // Llenar formulario de hijo con VALORES CORRECTOS
        await page.evaluate(() => {
            // Selects
            document.querySelectorAll('select').forEach(s => {
                if (s.offsetParent && s.id !== 'companySelect' && s.options.length > 1) {
                    s.selectedIndex = 1;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // Inputs - con valores apropiados
            document.querySelectorAll('input').forEach(input => {
                if (!input.offsetParent || input.disabled) return;
                if (input.type === 'file') return;
                if (input.id === 'userInput' || input.id === 'passwordInput') return;

                const name = (input.name || '').toLowerCase();
                const id = (input.id || '').toLowerCase();

                if (input.type === 'date') {
                    input.value = '1990-06-15';
                } else if (input.type === 'number') {
                    // Para números (como año de cobertura médica)
                    const max = input.max ? parseInt(input.max) : 2030;
                    input.value = Math.min(2025, max).toString();
                } else if (name.includes('dni') || name.includes('id') || id.includes('dni')) {
                    input.value = '12345678';
                } else if (input.type === 'text' || !input.type) {
                    input.value = 'TestFamiliar';
                }
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });
        console.log('  ✓ Formulario llenado');
        await page.screenshot({ path: 'debug-familiar-form.png' });

        // Click en "Agregar Hijo" (botón verde del modal)
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.trim();
                const c = btn.className || '';
                // Buscar botón verde de agregar
                if ((t.includes('Agregar Hijo') || t === 'Agregar' ||
                     t.includes('Save') || t.includes('Guardar')) &&
                    (c.includes('success') || c.includes('primary') || c.includes('btn-info'))) {
                    btn.click();
                    return;
                }
            }
            // Fallback: cualquier botón Agregar visible
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Agregar') &&
                    !btn.textContent.includes('+')) {
                    btn.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(4000);

        const famAfterCreate = await count('user_family_members');
        const created = famAfterCreate > famBefore || apiCreate;
        console.log(`  Creado: ${created ? '✓' : '✗'} (${famAfterCreate - famBefore})`);

        if (created) {
            // Cerrar modal éxito
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    const t = btn.textContent.toLowerCase();
                    if (t.includes('entendido') || t.includes('ok') || t.includes('cerrar')) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(2000);

            // Ahora eliminar
            apiDelete = false;
            const deleteClicked = await page.evaluate(() => {
                const tab = document.getElementById('family-tab');
                if (!tab) return false;

                // Buscar botón rojo/danger o con icono trash
                const btns = tab.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const c = btn.className.toLowerCase();
                    const h = btn.innerHTML.toLowerCase();
                    if (c.includes('danger') || h.includes('trash') || h.includes('delete')) {
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
                            t.includes('delete') || t.includes('sí') || t === 'yes') {
                            btn.click();
                            return;
                        }
                    }
                });
                await page.waitForTimeout(4000);

                const famAfterDelete = await count('user_family_members');
                results.delete = famAfterDelete < famAfterCreate || apiDelete;
                console.log(`  BD después: ${famAfterDelete} (${famAfterDelete - famAfterCreate})`);
                console.log(results.delete ? '  ✅ DELETE VERIFICADO' : '  ⚠️ DELETE pendiente');
            } else {
                console.log('  ⚠️ Botón eliminar no encontrado');
            }
        } else {
            console.log('  ⚠️ No se pudo crear familiar para eliminar');
        }

        await page.screenshot({ path: 'debug-crud-complete.png', fullPage: true });

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN FINAL
    console.log('\n' + '='.repeat(80));
    console.log('RESUMEN FINAL - CRUD MÓDULO USUARIOS');
    console.log('='.repeat(80));
    console.log('');
    console.log(`  CREATE (Educación):  ${results.create ? '✅ VERIFICADO' : '❌ PENDIENTE'}`);
    console.log(`  UPDATE (Datos):      ${results.update ? '✅ VERIFICADO' : '❌ PENDIENTE'}`);
    console.log(`  DELETE (Familiar):   ${results.delete ? '✅ VERIFICADO' : '❌ PENDIENTE'}`);
    console.log('');
    const total = [results.create, results.update, results.delete].filter(Boolean).length;
    console.log(`  TOTAL: ${total}/3 operaciones CRUD`);
    console.log('');
    if (total === 3) {
        console.log('  🎉🎉🎉 CRUD 100% COMPLETO 🎉🎉🎉');
    } else if (total >= 2) {
        console.log('  ✓ CRUD mayoritariamente funcional');
    } else if (total >= 1) {
        console.log('  ⚠️ CRUD parcialmente funcional');
    }
    console.log('='.repeat(80));
})();
