/**
 * CRUD TEST - DEPARTAMENTOS V3 (COMPLETO)
 * CREATE, UPDATE, DELETE con verificación BD
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

async function count(companyId = 11) {
    try {
        const [r] = await sequelize.query(`SELECT COUNT(*) as c FROM departments WHERE company_id = ${companyId}`);
        return parseInt(r[0].c);
    } catch { return -1; }
}

const TEST_NAME = 'DEPT_V3_' + Date.now().toString().slice(-6);

(async () => {
    console.log('='.repeat(80));
    console.log('CRUD TEST COMPLETO - DEPARTAMENTOS V3');
    console.log('='.repeat(80));
    console.log('Test name:', TEST_NAME);
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    let apiCreate = false, apiUpdate = false, apiDelete = false;

    page.on('response', async r => {
        if (r.url().includes('/api/')) {
            const method = r.request().method();
            const status = r.status();
            const url = r.url();

            // Log todas las llamadas a departments
            if (url.includes('department')) {
                console.log(`    📡 ${method} ${status}: ${url.split('/').slice(-3).join('/')}`);
            }

            if (method === 'POST' && status === 201) {
                apiCreate = true;
            } else if ((method === 'PUT' || method === 'PATCH') && status === 200) {
                apiUpdate = true;
            } else if (method === 'POST' && status === 200 && url.includes('department')) {
                // Algunos APIs usan POST para update también
                apiUpdate = true;
            } else if (method === 'DELETE' && (status === 200 || status === 204)) {
                apiDelete = true;
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

        // NAVEGAR A ESTRUCTURA ORGANIZACIONAL
        console.log('▶ NAVEGAR A ESTRUCTURA ORGANIZACIONAL');
        await page.click('text=Estructura Organizacional');
        await page.waitForTimeout(4000);
        console.log('  ✓ OK\n');

        const deptBefore = await count();
        console.log(`  BD antes: ${deptBefore} departamentos\n`);

        // ================================================================
        // TEST 1: CREATE DEPARTAMENTO
        // ================================================================
        console.log('▶ TEST CREATE - DEPARTAMENTO');
        console.log('-'.repeat(80));

        apiCreate = false;

        // Click en "+ Nuevo Departamento"
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b =>
                b.offsetParent && b.textContent.includes('Nuevo Departamento')
            );
            if (btn) btn.click();
        });
        await page.waitForTimeout(2000);
        console.log('  ✓ Modal abierto');

        // Llenar formulario - Solo campos que existen en la tabla
        await page.evaluate((testName) => {
            const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]), textarea'));

            inputs.forEach(input => {
                if (!input.offsetParent) return;
                const ph = (input.placeholder || '').toLowerCase();
                const nm = (input.name || '').toLowerCase();
                const id = (input.id || '').toLowerCase();

                // Nombre del departamento
                if (ph.includes('nombre') || nm.includes('name') || id.includes('name')) {
                    input.value = testName;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
                // Descripción
                else if (ph.includes('descripción') || nm.includes('desc') || id.includes('desc')) {
                    input.value = 'Departamento test CRUD v3';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
                // Dirección
                else if (ph.includes('dirección') || ph.includes('piso') || nm.includes('address') || id.includes('address')) {
                    input.value = 'Piso 1, Oficina Test';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });

            // Selects
            document.querySelectorAll('select').forEach(s => {
                if (s.offsetParent && s.options.length > 1 && s.id !== 'companySelect') {
                    // Evitar selector de idioma
                    const hasLang = Array.from(s.options).some(o =>
                        o.text.includes('English') || o.text.includes('Español'));
                    if (!hasLang) {
                        s.selectedIndex = 1;
                        s.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            });

            // Checkbox de kiosk - seleccionar al menos uno
            const cb = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(c =>
                c.offsetParent && !c.id?.includes('gps') && !c.name?.includes('gps')
            );
            if (cb) {
                cb.checked = true;
                cb.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, TEST_NAME);

        console.log('  ✓ Formulario llenado');
        await page.screenshot({ path: 'debug-dept-v3-filled.png' });

        // Click en "Crear Departamento"
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b =>
                b.offsetParent && (
                    b.textContent.toLowerCase().includes('crear departamento') ||
                    (b.className.includes('primary') && b.textContent.toLowerCase().includes('crear'))
                )
            );
            if (btn) btn.click();
        });
        await page.waitForTimeout(4000);

        const deptAfterCreate = await count();

        // Verificar en BD por nombre
        let createdInDB = false;
        try {
            const [found] = await sequelize.query(
                `SELECT id, name FROM departments WHERE name = $1`,
                { bind: [TEST_NAME] }
            );
            createdInDB = found.length > 0;
            if (createdInDB) {
                console.log(`  ✓ Encontrado en BD: ID ${found[0].id}`);
            }
        } catch (e) {
            console.log(`  ⚠️ Error verificando BD: ${e.message}`);
        }

        results.create = deptAfterCreate > deptBefore || apiCreate || createdInDB;
        console.log(`  BD después: ${deptAfterCreate} (+${deptAfterCreate - deptBefore})`);
        console.log(results.create ? '  ✅ CREATE OK' : '  ❌ CREATE pendiente');

        // Cerrar modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        console.log('');

        // ================================================================
        // TEST 2: UPDATE DEPARTAMENTO
        // ================================================================
        console.log('▶ TEST UPDATE - DEPARTAMENTO');
        console.log('-'.repeat(80));

        apiUpdate = false;

        // Click en botón de editar (emoji ✏️ o clase org-btn-secondary)
        const editClicked = await page.evaluate(() => {
            // Buscar en tabla - org-structure usa clases específicas
            const rows = document.querySelectorAll('table tbody tr, .org-table tbody tr');
            for (const row of rows) {
                // Buscar botón con emoji de editar o clase secondary
                const btns = row.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const text = btn.textContent.trim();
                    const cls = btn.className;
                    // Prioridad 1: emoji ✏️
                    if (text.includes('✏️') || text.includes('✏')) {
                        btn.click();
                        return { clicked: true, method: 'emoji ✏️' };
                    }
                    // Prioridad 2: clase org-btn-secondary (sin danger)
                    if (cls.includes('org-btn-secondary') && !cls.includes('danger')) {
                        btn.click();
                        return { clicked: true, method: 'org-btn-secondary' };
                    }
                    // Prioridad 3: title Editar
                    if (btn.title?.toLowerCase().includes('editar')) {
                        btn.click();
                        return { clicked: true, method: 'title Editar' };
                    }
                }
            }
            // Fallback: cualquier botón visible con emoji editar
            const allBtns = document.querySelectorAll('button');
            for (const btn of allBtns) {
                if (!btn.offsetParent) continue;
                if (btn.textContent.includes('✏️')) {
                    btn.click();
                    return { clicked: true, method: 'fallback emoji' };
                }
            }
            return { clicked: false };
        });

        if (editClicked.clicked) {
            console.log(`  ✓ Click en editar (${editClicked.method})`);
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug-dept-v3-edit-modal.png' });

            // Modificar nombre usando Playwright fill() para mejor compatibilidad
            const updateValue = 'UPDATED_' + Date.now().toString().slice(-6);

            // Buscar el input de nombre en el modal
            const nameInput = await page.$('input[name="name"], input[placeholder*="nombre" i]');
            if (nameInput) {
                await nameInput.fill(updateValue);
                console.log(`  ✓ Campo modificado a: ${updateValue}`);
            } else {
                // Fallback: usar evaluate con más eventos
                await page.evaluate((newVal) => {
                    const inputs = document.querySelectorAll('input[type="text"]');
                    for (const input of inputs) {
                        if (!input.offsetParent) continue;
                        if (input.closest('#loginForm')) continue;
                        const ph = (input.placeholder || '').toLowerCase();
                        const nm = (input.name || '').toLowerCase();
                        if (ph.includes('nombre') || nm.includes('name') || nm === '') {
                            input.focus();
                            input.value = newVal;
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            input.blur();
                            return;
                        }
                    }
                }, updateValue);
                console.log(`  ✓ Campo modificado (fallback) a: ${updateValue}`);
            }

            // Guardar - buscar "Guardar Cambios" específicamente
            const saveClicked = await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                // Prioridad 1: "Guardar Cambios"
                let btn = btns.find(b => b.offsetParent && b.textContent.toLowerCase().includes('guardar cambios'));
                if (btn) {
                    btn.click();
                    return 'Guardar Cambios';
                }
                // Prioridad 2: cualquier "guardar"
                btn = btns.find(b => b.offsetParent && b.textContent.toLowerCase().includes('guardar'));
                if (btn) {
                    btn.click();
                    return btn.textContent.trim();
                }
                return null;
            });
            console.log(`  ✓ Click en: ${saveClicked || 'no encontrado'}`);
            await page.waitForTimeout(4000);

            results.update = apiUpdate;
            console.log(results.update ? '  ✅ UPDATE OK' : '  ⚠️ UPDATE sin confirmación API');

            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
        } else {
            console.log('  ⚠️ No se encontró botón editar');
        }
        console.log('');

        // ================================================================
        // TEST 3: DELETE DEPARTAMENTO
        // ================================================================
        console.log('▶ TEST DELETE - DEPARTAMENTO');
        console.log('-'.repeat(80));

        apiDelete = false;
        const deptBeforeDelete = await count();

        // Configurar listener para dialog de confirmación (window.confirm)
        page.once('dialog', async dialog => {
            console.log(`  ✓ Dialog detectado: "${dialog.message().substring(0, 50)}..."`);
            await dialog.accept();
        });

        // Click en botón de eliminar (emoji 🗑️ o clase org-btn-danger)
        const deleteClicked = await page.evaluate(() => {
            // Buscar en tabla - org-structure usa clases específicas
            const rows = document.querySelectorAll('table tbody tr, .org-table tbody tr');
            for (const row of rows) {
                const btns = row.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const text = btn.textContent.trim();
                    const cls = btn.className;
                    // Prioridad 1: emoji 🗑️
                    if (text.includes('🗑️') || text.includes('🗑')) {
                        btn.click();
                        return { clicked: true, method: 'emoji 🗑️' };
                    }
                    // Prioridad 2: clase org-btn-danger
                    if (cls.includes('org-btn-danger') || cls.includes('btn-danger')) {
                        btn.click();
                        return { clicked: true, method: 'org-btn-danger' };
                    }
                    // Prioridad 3: title Eliminar
                    if (btn.title?.toLowerCase().includes('eliminar')) {
                        btn.click();
                        return { clicked: true, method: 'title Eliminar' };
                    }
                }
            }
            // Fallback
            const allBtns = document.querySelectorAll('button');
            for (const btn of allBtns) {
                if (!btn.offsetParent) continue;
                if (btn.textContent.includes('🗑️')) {
                    btn.click();
                    return { clicked: true, method: 'fallback emoji' };
                }
            }
            return { clicked: false };
        });

        if (deleteClicked.clicked) {
            console.log('  ✓ Click eliminar');
            await page.waitForTimeout(3000);
            await page.screenshot({ path: 'debug-dept-v3-delete-confirm.png' });

            // Si hay modal de confirmación visible, hacer click en botón
            await page.evaluate(() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b =>
                    b.offsetParent && (
                        b.textContent.toLowerCase().includes('confirmar') ||
                        b.textContent.toLowerCase().includes('eliminar') ||
                        b.textContent.toLowerCase().includes('sí') ||
                        b.textContent.toLowerCase().includes('aceptar') ||
                        b.textContent.toLowerCase().includes('ok')
                    )
                );
                if (btn) btn.click();
            });
            await page.waitForTimeout(4000);

            const deptAfterDelete = await count();
            results.delete = deptAfterDelete < deptBeforeDelete || apiDelete;
            console.log(`  BD: ${deptBeforeDelete} → ${deptAfterDelete}`);
            console.log(results.delete ? '  ✅ DELETE OK' : '  ⚠️ DELETE pendiente');
        } else {
            console.log('  ⚠️ No se encontró botón eliminar');
        }

        await page.screenshot({ path: 'debug-dept-v3-final.png', fullPage: true });

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-dept-v3-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN
    console.log('\n' + '='.repeat(80));
    console.log('RESUMEN CRUD - DEPARTAMENTOS');
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
