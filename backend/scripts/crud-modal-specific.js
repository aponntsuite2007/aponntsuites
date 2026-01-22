/**
 * CRUD TEST - MODAL ESPECÍFICO
 * Basado en estructura real de modales (screenshots)
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
    console.log('CRUD TEST - MODAL ESPECÍFICO');
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
        // Modal: "Agregar Formación Académica"
        // Campos: Type (select), Status (select), Institución, Año, Título, Promedio, Descripción
        // Botón: "Save"
        // ================================================================
        console.log('▶ TEST CREATE - EDUCACIÓN');
        console.log('-'.repeat(80));

        await page.evaluate(() => showFileTab('personal'));
        await page.waitForTimeout(2000);

        const eduBefore = await count('user_education');
        console.log(`  BD antes: ${eduBefore}`);

        // Click en "+ Agregar" de Education
        apiCreate = false;
        await page.evaluate(() => {
            const personalTab = document.getElementById('personal-tab');
            if (personalTab) {
                const btns = personalTab.querySelectorAll('button');
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
        console.log('  ✓ Modal abierto');

        // Llenar modal de educación ESPECÍFICAMENTE
        const ts = Date.now().toString().slice(-6);
        const eduFilled = await page.evaluate((timestamp) => {
            const results = [];

            // El modal de educación tiene 2 selects: Type y Status
            // Buscar TODOS los selects que tengan opción "Seleccionar..."
            const modalSelects = Array.from(document.querySelectorAll('select')).filter(s => {
                // Debe ser visible y NO ser el select de empresa/idioma
                if (!s.offsetParent) return false;
                if (s.id === 'companySelect') return false;
                // El select del idioma tiene opciones como "English", "Español"
                const firstOption = s.options[0]?.text || '';
                const hasLangOption = Array.from(s.options).some(o =>
                    o.text.includes('English') || o.text.includes('Español'));
                if (hasLangOption) return false;
                return true;
            });

            // Seleccionar opción en cada select del modal
            for (const s of modalSelects) {
                if (s.options.length > 1) {
                    // Si el primer option es "Seleccionar...", elegir el segundo
                    const firstText = s.options[0]?.text || '';
                    if (firstText.includes('Seleccionar') || firstText === '') {
                        s.selectedIndex = 1;
                    } else {
                        s.selectedIndex = 0;
                    }
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                    results.push(`Select "${s.name || s.id || 'anon'}": ${s.options[s.selectedIndex]?.text}`);
                }
            }

            // Inputs de texto en el modal (Institución, Título)
            const textInputs = document.querySelectorAll('input[type="text"], input:not([type])');
            for (const input of textInputs) {
                if (!input.offsetParent || input.disabled) continue;
                if (input.id === 'userInput' || input.id === 'passwordInput') continue;
                if (input.closest('#loginForm')) continue;
                // Solo si está vacío o tiene placeholder
                if (input.value === '' || input.placeholder) {
                    input.value = 'Edu_' + timestamp;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
            results.push('Text inputs filled');

            // Inputs numéricos (Año, Promedio)
            const numInputs = document.querySelectorAll('input[type="number"]');
            for (const input of numInputs) {
                if (!input.offsetParent || input.disabled) continue;
                const min = parseInt(input.min) || 1;
                const max = parseInt(input.max) || 2030;
                // Para año usar 2020, para promedio usar 8
                if (max > 100) {
                    input.value = '2020'; // Año
                } else {
                    input.value = '8'; // Promedio
                }
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            results.push('Number inputs filled');

            // Textarea (Descripción)
            const ta = document.querySelector('textarea');
            if (ta && ta.offsetParent) {
                ta.value = 'Descripción test ' + timestamp;
                ta.dispatchEvent(new Event('input', { bubbles: true }));
            }

            return results;
        }, ts);

        console.log(`  ✓ Campos: ${eduFilled.join(', ')}`);
        await page.screenshot({ path: 'debug-edu-modal-filled.png' });

        // Click en botón "Save" del modal
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.trim();
                if (t === 'Save' || t === 'Guardar') {
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
        console.log('');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST 2: UPDATE DATOS BÁSICOS
        // Modal: "Editar Datos Básicos"
        // Campos: Nombre, Apellido, Email (con validación), Teléfono, Fechas, Dirección
        // Botón: "💾 Guardar Cambios"
        // ================================================================
        console.log('▶ TEST UPDATE - DATOS BÁSICOS');
        console.log('-'.repeat(80));

        await page.evaluate(() => showFileTab('personal'));
        await page.waitForTimeout(1000);

        // Buscar y click en "✏️ Edit" de Basic Data
        apiUpdate = false;
        await page.evaluate(() => {
            const personalTab = document.getElementById('personal-tab');
            if (!personalTab) return false;
            const btns = personalTab.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.trim();
                // Botón de editar datos básicos (no pasaporte, no contactos)
                if ((t.includes('Edit') || t.includes('Editar')) &&
                    !t.toLowerCase().includes('pasaporte') &&
                    !t.toLowerCase().includes('passport')) {
                    btn.click();
                    return true;
                }
            }
            return false;
        });
        await page.waitForTimeout(2000);
        console.log('  ✓ Modal "Editar Datos Básicos" abierto');

        // Modificar campo TELÉFONO (no tiene validación especial)
        const updateResult = await page.evaluate(() => {
            // Buscar input de teléfono específicamente
            const telInput = document.querySelector('input[type="tel"]');
            if (telInput && telInput.offsetParent && !telInput.disabled) {
                const oldVal = telInput.value;
                telInput.value = '+54 11 ' + Date.now().toString().slice(-8);
                telInput.dispatchEvent(new Event('input', { bubbles: true }));
                telInput.dispatchEvent(new Event('change', { bubbles: true }));
                return { field: 'teléfono', old: oldVal, new: telInput.value };
            }

            // Fallback: modificar Dirección (textarea o input)
            const dirInput = document.querySelector('input[name*="direccion"], input[name*="address"], input[placeholder*="Calle"]');
            if (dirInput && dirInput.offsetParent) {
                const oldVal = dirInput.value;
                dirInput.value = 'Calle Test ' + Date.now().toString().slice(-6);
                dirInput.dispatchEvent(new Event('input', { bubbles: true }));
                dirInput.dispatchEvent(new Event('change', { bubbles: true }));
                return { field: 'dirección', old: oldVal, new: dirInput.value };
            }

            return null;
        });

        if (updateResult) {
            console.log(`  ✓ Campo modificado: ${updateResult.field}`);
            await page.screenshot({ path: 'debug-update-modified.png' });

            // Click en "💾 Guardar Cambios"
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    if (t.includes('guardar cambios') || t.includes('save changes') ||
                        t.includes('guardar') || t.includes('save')) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            });
            await page.waitForTimeout(4000);

            results.update = apiUpdate;
            console.log(results.update ? '  ✅ UPDATE OK (API 200)' : '  ⚠️ UPDATE sin confirmación API');
        } else {
            console.log('  ⚠️ No se encontró campo modificable');
        }
        console.log('');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST 3: DELETE FAMILIAR
        // Modal: "Agregar Hijo"
        // Campos: Nombre, Apellido, Fecha Nacimiento, DNI, Sexo, etc.
        // Botón: "Agregar Hijo" (verde)
        // ================================================================
        console.log('▶ TEST DELETE - FAMILIAR');
        console.log('-'.repeat(80));

        await page.evaluate(() => showFileTab('family'));
        await page.waitForTimeout(2000);

        const famBefore = await count('user_family_members');
        console.log(`  BD antes: ${famBefore}`);

        // Click en "+ Agregar" en sección Hijos
        apiCreate = false;
        await page.evaluate(() => {
            const familyTab = document.getElementById('family-tab');
            if (familyTab) {
                // Buscar específicamente el botón de agregar en Hijos
                const hijosSection = Array.from(familyTab.querySelectorAll('h4, h5, h6')).find(h =>
                    h.textContent.includes('Hijos'));
                if (hijosSection) {
                    const section = hijosSection.closest('.card, section, div');
                    if (section) {
                        const btn = section.querySelector('button');
                        if (btn && btn.textContent.includes('Agregar')) {
                            btn.click();
                            return true;
                        }
                    }
                }
                // Fallback: primer botón Agregar
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

        // Llenar formulario de hijo
        const ts2 = Date.now().toString().slice(-6);
        await page.evaluate((timestamp) => {
            // 1. Campos de texto: Nombre, Apellido
            const textInputs = document.querySelectorAll('input[type="text"], input:not([type])');
            let nameCount = 0;
            for (const input of textInputs) {
                if (!input.offsetParent || input.disabled) continue;
                if (input.id === 'userInput' || input.id === 'passwordInput') continue;
                if (input.closest('#loginForm')) continue;
                if (input.value === '' || input.value === input.placeholder) {
                    if (nameCount === 0) {
                        input.value = 'HijoTest'; // Nombre
                    } else {
                        input.value = 'ApellidoTest_' + timestamp; // Apellido
                    }
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    nameCount++;
                }
            }

            // 2. Fecha de nacimiento
            const dateInputs = document.querySelectorAll('input[type="date"]');
            for (const input of dateInputs) {
                if (input.offsetParent && !input.disabled) {
                    input.value = '1995-06-15';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // 3. Selects: Sexo, Cobertura Médica, etc.
            const selects = document.querySelectorAll('select');
            for (const s of selects) {
                if (!s.offsetParent || s.id === 'companySelect') continue;
                // Evitar select de idioma
                const hasLang = Array.from(s.options).some(o =>
                    o.text.includes('English') || o.text.includes('Español'));
                if (hasLang) continue;

                if (s.options.length > 1) {
                    s.selectedIndex = 1;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // 4. Textarea: Observaciones
            const ta = document.querySelector('textarea');
            if (ta && ta.offsetParent) {
                ta.value = 'Observación test ' + timestamp;
                ta.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }, ts2);

        console.log('  ✓ Formulario llenado');
        await page.screenshot({ path: 'debug-hijo-filled.png' });

        // Click en botón "Agregar Hijo" (verde)
        const addClicked = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.trim();
                const cls = btn.className || '';
                // Buscar botón verde "Agregar Hijo"
                if (t === 'Agregar Hijo' ||
                    (t.includes('Agregar') && cls.includes('success')) ||
                    (t.includes('Agregar') && cls.includes('btn-success'))) {
                    btn.click();
                    return { clicked: t };
                }
            }
            // Fallback
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

        console.log(`  ✓ Click en: "${addClicked.clicked}"`);
        await page.waitForTimeout(4000);
        await page.screenshot({ path: 'debug-after-add-hijo.png' });

        const famAfterCreate = await count('user_family_members');
        const created = famAfterCreate > famBefore || apiCreate;
        console.log(`  Creado: ${created ? '✓' : '✗'} (BD: ${famAfterCreate - famBefore})`);

        if (created) {
            // Cerrar modal éxito
            await page.evaluate(() => {
                document.querySelectorAll('button').forEach(btn => {
                    const t = btn.textContent.toLowerCase();
                    if (t.includes('entendido') || t.includes('ok') || t.includes('aceptar')) {
                        btn.click();
                    }
                });
            });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(2000);

            // ELIMINAR
            apiDelete = false;
            const delClicked = await page.evaluate(() => {
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

            if (delClicked) {
                console.log('  ✓ Click eliminar');
                await page.waitForTimeout(2000);

                // Confirmar
                await page.evaluate(() => {
                    document.querySelectorAll('button').forEach(btn => {
                        if (!btn.offsetParent) return;
                        const t = btn.textContent.toLowerCase();
                        if (t.includes('confirmar') || t.includes('eliminar') ||
                            t.includes('sí') || t.includes('confirm')) {
                            btn.click();
                        }
                    });
                });
                await page.waitForTimeout(4000);

                const famAfterDelete = await count('user_family_members');
                results.delete = famAfterDelete < famAfterCreate || apiDelete;
                console.log(`  BD después: ${famAfterDelete} (${famAfterDelete - famAfterCreate})`);
                console.log(results.delete ? '  ✅ DELETE OK' : '  ⚠️ DELETE pendiente');
            }
        } else {
            console.log('  ⚠️ No se creó - verificando error');
            await page.screenshot({ path: 'debug-hijo-error.png' });
        }

        await page.screenshot({ path: 'debug-crud-modal-final.png', fullPage: true });

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
