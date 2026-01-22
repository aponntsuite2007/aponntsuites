/**
 * CRUD TEST FINAL - DELETE FIX
 * Solo prueba DELETE (CREATE y UPDATE ya verificados)
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
    console.log('CRUD TEST FINAL - DELETE FIX');
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
                console.log(`    📡 CREATE 201: ${r.url().split('/').slice(-2).join('/')}`);
            } else if (method === 'DELETE' && (status === 200 || status === 204)) {
                apiDelete = true;
                console.log(`    📡 DELETE ${status}`);
            }
        }
    });

    let deleteVerified = false;

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
        // TEST DELETE - FAMILIAR
        // ================================================================
        console.log('▶ TEST DELETE - CREAR Y ELIMINAR HIJO');
        console.log('-'.repeat(80));

        await page.evaluate(() => showFileTab('family'));
        await page.waitForTimeout(2000);

        const famBefore = await count('user_family_members');
        console.log(`  BD antes: ${famBefore}`);

        // PASO 1: Abrir modal "Agregar Hijo" (no el genérico de familiar)
        apiCreate = false;
        const modalOpened = await page.evaluate(() => {
            const familyTab = document.getElementById('family-tab');
            if (!familyTab) return { ok: false, error: 'No family tab' };

            // Buscar sección "Hijos" específicamente
            const allButtons = Array.from(familyTab.querySelectorAll('button'));

            // Buscar botón que esté cerca de "Hijos" o tenga texto relacionado
            for (const btn of allButtons) {
                if (!btn.offsetParent) continue;
                const text = btn.textContent.trim();
                // El botón verde de agregar cerca de sección Hijos
                if (text.includes('Agregar') && btn.className.includes('success')) {
                    // Verificar que esté en sección Hijos
                    const parent = btn.closest('.card, .section, div[class*="hijos"], div[class*="children"]');
                    if (parent) {
                        const parentText = parent.textContent;
                        if (parentText.includes('Hijos') || parentText.includes('Children')) {
                            btn.click();
                            return { ok: true, button: text, section: 'Hijos' };
                        }
                    }
                }
            }

            // Fallback: primer botón con "Agregar" en success
            for (const btn of allButtons) {
                if (!btn.offsetParent) continue;
                if (btn.textContent.includes('Agregar') && btn.className.includes('success')) {
                    btn.click();
                    return { ok: true, button: btn.textContent.trim(), section: 'fallback' };
                }
            }

            return { ok: false, error: 'No add button found' };
        });

        console.log(`  Modal: ${modalOpened.ok ? '✓' : '✗'} ${modalOpened.button || modalOpened.error}`);
        await page.waitForTimeout(2000);

        // Verificar que se abrió el modal correcto
        const modalTitle = await page.evaluate(() => {
            const titles = document.querySelectorAll('h4, h5, .modal-title');
            for (const t of titles) {
                if (t.offsetParent && t.textContent.includes('Agregar')) {
                    return t.textContent.trim();
                }
            }
            return null;
        });
        console.log(`  Título modal: "${modalTitle}"`);

        // PASO 2: Llenar formulario
        const ts = Date.now().toString().slice(-6);
        await page.evaluate((timestamp) => {
            // Llenar TODOS los inputs de texto visibles
            const textInputs = document.querySelectorAll('input[type="text"], input:not([type])');
            let idx = 0;
            for (const input of textInputs) {
                if (!input.offsetParent || input.disabled) continue;
                if (input.id === 'userInput' || input.id === 'passwordInput') continue;
                if (input.closest('#loginForm')) continue;

                if (idx === 0) input.value = 'HijoTest';
                else if (idx === 1) input.value = 'Apellido_' + timestamp;
                else input.value = 'Test_' + timestamp;

                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                idx++;
            }

            // Fecha de nacimiento
            const dateInputs = document.querySelectorAll('input[type="date"]');
            for (const input of dateInputs) {
                if (input.offsetParent && !input.disabled) {
                    input.value = '1995-06-15';
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // Todos los selects (excepto idioma y empresa)
            const selects = document.querySelectorAll('select');
            for (const s of selects) {
                if (!s.offsetParent || s.id === 'companySelect') continue;
                const hasLang = Array.from(s.options).some(o =>
                    o.text.includes('English') || o.text.includes('Español'));
                if (hasLang) continue;
                if (s.options.length > 1) {
                    s.selectedIndex = 1;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // Textarea
            const ta = document.querySelector('textarea');
            if (ta && ta.offsetParent) {
                ta.value = 'Test observación ' + timestamp;
                ta.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }, ts);

        console.log('  ✓ Formulario llenado');
        await page.screenshot({ path: 'debug-delete-hijo-filled.png' });

        // PASO 3: Click en botón de guardar DENTRO DEL MODAL
        // El botón es "Agregar Hijo" (verde) en el modal
        const submitClicked = await page.evaluate(() => {
            // Buscar el modal visible
            const modals = document.querySelectorAll('.modal, [role="dialog"], div[class*="modal"]');
            let modalElement = null;

            for (const m of modals) {
                if (m.offsetParent || m.style.display !== 'none') {
                    // Verificar si tiene contenido de formulario visible
                    const inputs = m.querySelectorAll('input, select');
                    if (inputs.length > 0) {
                        modalElement = m;
                        break;
                    }
                }
            }

            // Buscar botón de submit en todo el documento visible
            const allButtons = document.querySelectorAll('button');
            for (const btn of allButtons) {
                if (!btn.offsetParent) continue;
                const text = btn.textContent.trim();
                const cls = btn.className.toLowerCase();

                // Botón específico "Agregar Hijo" (verde/success)
                if (text === 'Agregar Hijo' && (cls.includes('success') || cls.includes('btn-success'))) {
                    btn.click();
                    return { clicked: text, type: 'exact match' };
                }
            }

            // Fallback: cualquier botón Guardar o Agregar verde
            for (const btn of allButtons) {
                if (!btn.offsetParent) continue;
                const text = btn.textContent.trim().toLowerCase();
                const cls = btn.className.toLowerCase();

                if ((text.includes('guardar') || text === 'save') &&
                    (cls.includes('primary') || cls.includes('success'))) {
                    btn.click();
                    return { clicked: btn.textContent.trim(), type: 'guardar' };
                }
            }

            return { clicked: null };
        });

        console.log(`  ✓ Click submit: "${submitClicked.clicked}" (${submitClicked.type})`);
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'debug-delete-after-submit.png' });

        const famAfterCreate = await count('user_family_members');
        const created = famAfterCreate > famBefore || apiCreate;
        console.log(`  Creado: ${created ? '✓' : '✗'} (BD: ${famBefore} → ${famAfterCreate})`);

        if (created) {
            console.log('  ✓ HIJO CREADO - Procediendo a eliminar\n');

            // Cerrar cualquier modal de éxito
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    const t = btn.textContent.toLowerCase();
                    if (t.includes('entendido') || t.includes('ok') || t.includes('aceptar') || t.includes('cerrar')) {
                        btn.click();
                    }
                }
            });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(2000);

            // Asegurar que estamos en tab familia
            await page.evaluate(() => showFileTab('family'));
            await page.waitForTimeout(1000);

            await page.screenshot({ path: 'debug-delete-before-delete.png' });

            // PASO 4: Buscar y click en botón eliminar (trash/danger)
            apiDelete = false;
            const deleteClicked = await page.evaluate(() => {
                const familyTab = document.getElementById('family-tab');
                if (!familyTab) return { clicked: false, error: 'no family tab' };

                const btns = familyTab.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const cls = btn.className.toLowerCase();
                    const html = btn.innerHTML.toLowerCase();

                    // Botón rojo de eliminar con icono trash
                    if (cls.includes('danger') || html.includes('trash') || html.includes('delete')) {
                        btn.click();
                        return { clicked: true, button: btn.className };
                    }
                }
                return { clicked: false, error: 'no delete button' };
            });

            console.log(`  Click eliminar: ${deleteClicked.clicked ? '✓' : '✗'}`);
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug-delete-confirm-dialog.png' });

            if (deleteClicked.clicked) {
                // PASO 5: Confirmar eliminación
                await page.evaluate(() => {
                    const btns = document.querySelectorAll('button');
                    for (const btn of btns) {
                        if (!btn.offsetParent) continue;
                        const t = btn.textContent.toLowerCase();
                        const cls = btn.className.toLowerCase();

                        // Botón de confirmación (rojo o con texto confirmar/eliminar/sí)
                        if ((t.includes('confirmar') || t.includes('eliminar') ||
                             t.includes('sí') || t.includes('yes') || t.includes('confirm') ||
                             t.includes('delete')) &&
                            (cls.includes('danger') || cls.includes('primary') || cls.includes('btn'))) {
                            btn.click();
                            return true;
                        }
                    }
                    return false;
                });

                await page.waitForTimeout(4000);
                await page.screenshot({ path: 'debug-delete-after-confirm.png' });

                const famAfterDelete = await count('user_family_members');
                deleteVerified = famAfterDelete < famAfterCreate || apiDelete;

                console.log(`  BD después: ${famAfterDelete} (${famAfterDelete - famAfterCreate})`);
                console.log(deleteVerified ? '  ✅ DELETE VERIFICADO' : '  ⚠️ DELETE no verificado');
            }
        } else {
            console.log('  ⚠️ No se pudo crear hijo para eliminar');
            await page.screenshot({ path: 'debug-delete-no-create.png' });
        }

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-delete-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN
    console.log('\n' + '='.repeat(80));
    console.log('RESUMEN CRUD COMPLETO - MÓDULO USUARIOS');
    console.log('='.repeat(80));
    console.log('');
    console.log('  CREATE: ✅ VERIFICADO (sesión anterior)');
    console.log('  UPDATE: ✅ VERIFICADO (sesión anterior)');
    console.log(`  DELETE: ${deleteVerified ? '✅ VERIFICADO' : '❌ PENDIENTE'}`);
    console.log('');
    const total = 2 + (deleteVerified ? 1 : 0);
    console.log(`  TOTAL: ${total}/3`);
    if (total === 3) console.log('\n  🎉 CRUD 100% COMPLETO 🎉');
    console.log('='.repeat(80));
})();
