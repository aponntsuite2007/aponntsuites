/**
 * CRUD TEST FINAL - Selectores CORRECTOS basados en código fuente
 * Usa showFileTab() para cambiar tabs y IDs específicos para botones
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
    console.log('CRUD TEST FINAL - SELECTORES CORRECTOS');
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

        // Verificar que el expediente está abierto
        const expedienteOpen = await page.evaluate(() => {
            return document.querySelector('.file-tab') !== null;
        });
        console.log(`  ✓ Expediente abierto: ${expedienteOpen}\n`);

        // ================================================================
        // TEST 1: CREATE - Tab Personal (educación)
        // ================================================================
        console.log('▶ TEST CREATE - FORMACIÓN ACADÉMICA');
        console.log('-'.repeat(80));

        // Usar showFileTab directamente para ir a Tab Personal
        await page.evaluate(() => {
            if (typeof showFileTab === 'function') {
                showFileTab('personal');
            }
        });
        await page.waitForTimeout(2000);

        // Verificar que el tab correcto está activo
        const personalTabVisible = await page.evaluate(() => {
            const tab = document.getElementById('personal-tab');
            return tab && tab.style.display !== 'none';
        });
        console.log(`  Tab Personal activo: ${personalTabVisible}`);
        await page.screenshot({ path: 'debug-tab-personal.png' });

        const eduBefore = await count('user_education');
        console.log(`  Registros user_education antes: ${eduBefore}`);

        // Buscar botón de agregar formación dentro del tab personal
        apiCreate = false;
        const addEduResult = await page.evaluate(() => {
            const personalTab = document.getElementById('personal-tab');
            if (!personalTab) return { ok: false, error: 'Tab personal no encontrado' };

            // Buscar botón "+ Agregar" específico de Formación Académica
            const btns = personalTab.querySelectorAll('button');
            for (const btn of btns) {
                const text = btn.textContent.trim();
                // Buscar botón de agregar cerca de "Formación Académica"
                if (text.includes('Agregar') || text.includes('+')) {
                    const parent = btn.closest('.card, section, div');
                    if (parent && parent.textContent.includes('Formación')) {
                        btn.click();
                        return { ok: true, text: text };
                    }
                }
            }
            return { ok: false, error: 'Botón no encontrado' };
        });

        if (addEduResult.ok) {
            console.log(`  ✓ Click en: "${addEduResult.text}"`);
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug-edu-modal-open.png' });

            // Llenar formulario de educación
            const ts = Date.now().toString().slice(-6);
            await page.evaluate((timestamp) => {
                // 1. Selects - seleccionar primera opción válida
                document.querySelectorAll('select').forEach(s => {
                    if (s.offsetParent && s.options.length > 1) {
                        s.selectedIndex = 1;
                        s.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });

                // 2. Inputs
                document.querySelectorAll('input, textarea').forEach(input => {
                    if (!input.offsetParent || input.disabled) return;
                    if (input.type === 'number') {
                        const max = input.max ? parseInt(input.max) : 10;
                        input.value = Math.min(8, max).toString();
                    } else if (input.type !== 'hidden' && input.type !== 'checkbox' && input.type !== 'date') {
                        input.value = 'CRUD_Edu_' + timestamp;
                    }
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                });
            }, ts);
            console.log('  ✓ Campos llenados');

            // Click en Guardar
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.trim().toLowerCase();
                    if (t === 'guardar') {
                        btn.click();
                        return;
                    }
                }
            });
            await page.waitForTimeout(4000);

            const eduAfter = await count('user_education');
            results.create = eduAfter > eduBefore || apiCreate;
            console.log(`  Registros después: ${eduAfter} (${eduAfter - eduBefore >= 0 ? '+' : ''}${eduAfter - eduBefore})`);
            console.log(results.create ? '  ✅ CREATE VERIFICADO' : '  ❌ CREATE no verificado');
        } else {
            console.log(`  ⚠️ ${addEduResult.error}`);
        }
        console.log('');

        // Cerrar modal si existe
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST 2: UPDATE - Editar datos en Tab Personal
        // ================================================================
        console.log('▶ TEST UPDATE - DATOS BÁSICOS');
        console.log('-'.repeat(80));

        // Asegurar que estamos en Tab Personal
        await page.evaluate(() => {
            if (typeof showFileTab === 'function') {
                showFileTab('personal');
            }
        });
        await page.waitForTimeout(2000);

        // Buscar botón "Editar" dentro de la sección Datos Básicos
        apiUpdate = false;
        const editResult = await page.evaluate(() => {
            const personalTab = document.getElementById('personal-tab');
            if (!personalTab) return { ok: false };

            // El botón "✏️ Editar" está dentro de la sección "Datos Básicos"
            const btns = personalTab.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const text = btn.textContent.trim();
                // Buscar botón que diga exactamente "✏️ Editar" o "Editar"
                if ((text === '✏️ Editar' || text === 'Editar') &&
                    !text.includes('Posición') && !text.includes('Usuario')) {
                    const parent = btn.closest('div, section');
                    if (parent && (parent.textContent.includes('Datos') || parent.textContent.includes('Básicos'))) {
                        btn.click();
                        return { ok: true, text: text };
                    }
                }
            }
            // Fallback: primer botón con "Editar" en el tab personal
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Editar') &&
                    !btn.textContent.includes('Usuario') && !btn.textContent.includes('Posición')) {
                    btn.click();
                    return { ok: true, text: btn.textContent.trim(), fallback: true };
                }
            }
            return { ok: false };
        });

        if (editResult.ok) {
            console.log(`  ✓ Click en: "${editResult.text}"`);
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug-edit-modal.png' });

            // Verificar que NO es modal de "Agregar Nuevo Usuario"
            const isCorrectModal = await page.evaluate(() => {
                const titles = document.querySelectorAll('h4, h5, .modal-title');
                for (const t of titles) {
                    if (t.offsetParent && t.textContent.includes('Agregar Nuevo Usuario')) {
                        return false;
                    }
                }
                return true;
            });

            if (isCorrectModal) {
                // Modificar un campo
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
                        if (btn.offsetParent && btn.textContent.toLowerCase().includes('guardar')) {
                            btn.click();
                            return;
                        }
                    }
                });
                await page.waitForTimeout(4000);

                results.update = apiUpdate;
                console.log(results.update ? '  ✅ UPDATE VERIFICADO (API)' : '  ⚠️ UPDATE pendiente');
            } else {
                console.log('  ⚠️ Se abrió modal incorrecto (Agregar Usuario)');
            }
        } else {
            console.log('  ⚠️ Botón Editar no encontrado');
        }
        console.log('');

        // Cerrar modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST 3: DELETE - Tab Familiar
        // ================================================================
        console.log('▶ TEST DELETE - GRUPO FAMILIAR');
        console.log('-'.repeat(80));

        // Ir a Tab Familiar
        await page.evaluate(() => {
            if (typeof showFileTab === 'function') {
                showFileTab('family');
            }
        });
        await page.waitForTimeout(2000);
        console.log('  ✓ Tab Familiar activo');
        await page.screenshot({ path: 'debug-tab-family.png' });

        const famBefore = await count('user_family_members');
        console.log(`  Registros antes: ${famBefore}`);

        // Primero crear un registro para poder eliminarlo
        apiCreate = false;
        const addFamResult = await page.evaluate(() => {
            const familyTab = document.getElementById('family-tab');
            if (!familyTab) return { ok: false };

            const btns = familyTab.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && (btn.textContent.includes('Agregar') || btn.textContent.includes('+'))) {
                    btn.click();
                    return { ok: true };
                }
            }
            return { ok: false };
        });

        if (addFamResult.ok) {
            await page.waitForTimeout(2000);

            // Llenar formulario
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
                        input.value = '1990-06-15';
                    } else if (input.type !== 'hidden' && input.type !== 'checkbox') {
                        input.value = 'DEL_TEST_' + ts;
                    }
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                });
            });

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
            console.log(`  Registro creado: ${famAfterCreate > famBefore ? '✓' : '✗'}`);

            // Cerrar modal de éxito
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    const t = btn.textContent.toLowerCase();
                    if (t.includes('entendido') || t.includes('cerrar') || t === 'ok') {
                        btn.click();
                        return;
                    }
                }
            });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(2000);

            // Ahora buscar y eliminar
            apiDelete = false;
            await page.screenshot({ path: 'debug-before-delete-family.png' });

            const deleteResult = await page.evaluate(() => {
                const familyTab = document.getElementById('family-tab');
                if (!familyTab) return { ok: false };

                // Buscar botón de eliminar (trash icon o btn-danger)
                const btns = familyTab.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const html = btn.innerHTML.toLowerCase();
                    const cls = btn.className.toLowerCase();
                    if (html.includes('trash') || cls.includes('danger')) {
                        btn.click();
                        return { ok: true };
                    }
                }
                return { ok: false };
            });

            if (deleteResult.ok) {
                console.log('  ✓ Botón eliminar clickeado');
                await page.waitForTimeout(2000);
                await page.screenshot({ path: 'debug-delete-confirm-family.png' });

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
                console.log('  ⚠️ Botón eliminar no encontrado en Tab Familiar');
            }
        }

        await page.screenshot({ path: 'debug-crud-final.png', fullPage: true });

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
    console.log(`  CREATE: ${results.create ? '✅ VERIFICADO' : '❌ NO VERIFICADO'}`);
    console.log(`  UPDATE: ${results.update ? '✅ VERIFICADO' : '❌ NO VERIFICADO'}`);
    console.log(`  DELETE: ${results.delete ? '✅ VERIFICADO' : '❌ NO VERIFICADO'}`);
    console.log('');
    const total = [results.create, results.update, results.delete].filter(Boolean).length;
    console.log(`  TOTAL: ${total}/3 operaciones CRUD verificadas`);
    console.log('='.repeat(80));
})();
