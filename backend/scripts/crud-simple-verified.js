/**
 * CRUD TEST SIMPLE - Verificación directa
 * Usa Playwright selectors nativos para mayor confiabilidad
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
    console.log('CRUD TEST SIMPLE - VERIFICACIÓN DIRECTA');
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
                console.log(`    📡 CREATE 201: ${r.url().split('/').slice(-3).join('/')}`);
            } else if ((method === 'PUT' || method === 'PATCH') && status === 200) {
                apiUpdate = true;
                console.log(`    📡 UPDATE 200: ${r.url().split('/').slice(-3).join('/')}`);
            } else if (method === 'DELETE' && (status === 200 || status === 204)) {
                apiDelete = true;
                console.log(`    📡 DELETE ${status}: ${r.url().split('/').slice(-3).join('/')}`);
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
        await page.click('#loginButton');
        await page.waitForTimeout(5000);
        console.log('  ✓ OK\n');

        // NAVEGAR A USUARIOS
        console.log('▶ NAVEGAR A GESTIÓN DE USUARIOS');
        await page.click('text=Gestión de Usuarios');
        await page.waitForTimeout(4000);
        console.log('  ✓ OK\n');

        // ABRIR EXPEDIENTE
        console.log('▶ ABRIR EXPEDIENTE');
        await page.click('table tbody tr button');
        await page.waitForTimeout(3000);
        console.log('  ✓ OK\n');

        // ================================================================
        // TEST 1: CREATE EDUCACIÓN
        // ================================================================
        console.log('▶ TEST CREATE - EDUCACIÓN');
        console.log('-'.repeat(80));

        // Ir a Tab Datos Personales usando click directo
        await page.click('button:has-text("Datos Personales")');
        await page.waitForTimeout(2000);
        console.log('  ✓ Tab Datos Personales');

        const eduBefore = await count('user_education');
        console.log(`  Registros antes: ${eduBefore}`);

        // Click en "+ Agregar" de Formación Académica
        apiCreate = false;
        await page.click('button:has-text("+ Agregar")');
        await page.waitForTimeout(2000);
        console.log('  ✓ Modal abierto');

        // Llenar formulario usando locators específicos
        // 1. Select Tipo - OBLIGATORIO
        const tipoSelect = await page.locator('select').first();
        await tipoSelect.selectOption({ index: 1 });
        console.log('  ✓ Tipo seleccionado');

        // 2. Llenar campos de texto
        const ts = Date.now().toString().slice(-6);

        // Institución
        const institucion = await page.locator('input').filter({ hasText: '' }).nth(0);
        if (await institucion.isVisible()) {
            await institucion.fill('Universidad Test ' + ts);
        }

        // Usar evaluate para llenar todos los campos visibles
        await page.evaluate((timestamp) => {
            const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="file"])');
            inputs.forEach(input => {
                if (input.offsetParent && !input.disabled && !input.readOnly && input.value === '') {
                    if (input.type === 'number') {
                        const max = input.max ? parseInt(input.max) : 10;
                        input.value = Math.min(8, max).toString();
                    } else if (input.type === 'text' || input.type === '') {
                        input.value = 'Test_' + timestamp;
                    }
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // Textareas
            document.querySelectorAll('textarea').forEach(ta => {
                if (ta.offsetParent && !ta.disabled && ta.value === '') {
                    ta.value = 'Descripción test ' + timestamp;
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        }, ts);
        console.log('  ✓ Campos llenados');

        await page.screenshot({ path: 'debug-edu-form-filled.png' });

        // Click Guardar
        await page.click('button:has-text("Guardar")');
        await page.waitForTimeout(4000);

        const eduAfter = await count('user_education');
        results.create = eduAfter > eduBefore || apiCreate;
        console.log(`  Registros después: ${eduAfter} (${eduAfter - eduBefore >= 0 ? '+' : ''}${eduAfter - eduBefore})`);
        console.log(results.create ? '  ✅ CREATE VERIFICADO' : '  ❌ CREATE no verificado');
        console.log('');

        // Cerrar modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST 2: UPDATE - Editar Datos Básicos
        // ================================================================
        console.log('▶ TEST UPDATE - DATOS BÁSICOS');
        console.log('-'.repeat(80));

        // Asegurar Tab Datos Personales
        await page.click('button:has-text("Datos Personales")');
        await page.waitForTimeout(1000);

        // El botón "✏️ Editar" en Datos Básicos es el botón azul grande
        // Buscar específicamente dentro de la sección Datos Básicos
        apiUpdate = false;

        const editBtn = await page.locator('button:has-text("Editar")').first();
        if (await editBtn.isVisible()) {
            await editBtn.click();
            console.log('  ✓ Click en Editar');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug-edit-datos-basicos.png' });

            // Verificar que no es modal de crear usuario
            const modalTitle = await page.locator('h4, h5').first().textContent().catch(() => '');
            console.log(`  Modal: ${modalTitle?.substring(0, 40)}`);

            if (!modalTitle?.includes('Nuevo Usuario')) {
                // Modificar un campo
                const firstInput = await page.locator('input[type="text"]:not([disabled])').first();
                if (await firstInput.isVisible()) {
                    await firstInput.fill('UPDATED_' + Date.now().toString().slice(-6));
                    console.log('  ✓ Campo modificado');
                }

                // Guardar
                await page.click('button:has-text("Guardar")');
                await page.waitForTimeout(4000);

                results.update = apiUpdate;
                console.log(results.update ? '  ✅ UPDATE VERIFICADO (API)' : '  ⚠️ UPDATE sin API confirmación');
            } else {
                console.log('  ⚠️ Modal incorrecto abierto');
            }
        } else {
            console.log('  ⚠️ Botón Editar no visible');
        }
        console.log('');

        // Cerrar modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST 3: DELETE - Tab Grupo Familiar
        // ================================================================
        console.log('▶ TEST DELETE - GRUPO FAMILIAR');
        console.log('-'.repeat(80));

        // Ir a Tab Grupo Familiar
        await page.click('button:has-text("Grupo Familiar")');
        await page.waitForTimeout(2000);
        console.log('  ✓ Tab Grupo Familiar');

        const famBefore = await count('user_family_members');
        console.log(`  Registros antes: ${famBefore}`);

        // Crear familiar para eliminar
        apiCreate = false;
        try {
            await page.click('button:has-text("Agregar")', { timeout: 3000 });
            await page.waitForTimeout(2000);
            console.log('  ✓ Modal agregar familiar');

            // Llenar formulario (evitar file inputs)
            await page.evaluate(() => {
                const ts = Date.now().toString().slice(-6);

                // Selects
                document.querySelectorAll('select').forEach(s => {
                    if (s.offsetParent && s.options.length > 1) {
                        s.selectedIndex = 1;
                        s.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });

                // Inputs (NO file)
                document.querySelectorAll('input').forEach(input => {
                    if (!input.offsetParent || input.disabled) return;
                    if (input.type === 'file') return; // SKIP FILE INPUTS

                    if (input.type === 'date') {
                        input.value = '1990-06-15';
                    } else if (input.type === 'text' || input.type === '') {
                        input.value = 'DEL_Test_' + ts;
                    } else if (input.type === 'number') {
                        input.value = '12345678';
                    }
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                });
            });
            console.log('  ✓ Formulario llenado');

            // Guardar
            await page.click('button:has-text("Guardar")');
            await page.waitForTimeout(4000);

            const famAfterCreate = await count('user_family_members');
            const created = famAfterCreate > famBefore || apiCreate;
            console.log(`  Familiar creado: ${created ? '✓' : '✗'} (${famAfterCreate - famBefore})`);

            // Cerrar modal de éxito
            try {
                await page.click('button:has-text("Entendido")', { timeout: 2000 });
            } catch {}
            await page.keyboard.press('Escape');
            await page.waitForTimeout(2000);

            // Ahora eliminar
            apiDelete = false;
            await page.screenshot({ path: 'debug-family-list.png' });

            // Buscar botón eliminar (trash/danger)
            const deleteBtn = await page.locator('button.btn-danger, button:has(i.fa-trash)').first();
            if (await deleteBtn.isVisible().catch(() => false)) {
                await deleteBtn.click();
                console.log('  ✓ Click en eliminar');
                await page.waitForTimeout(2000);

                // Confirmar
                try {
                    await page.click('button:has-text("Confirmar")', { timeout: 3000 });
                } catch {
                    await page.click('button:has-text("Eliminar")', { timeout: 3000 }).catch(() => {});
                }
                await page.waitForTimeout(4000);

                const famAfterDelete = await count('user_family_members');
                results.delete = famAfterDelete < famAfterCreate || apiDelete;
                console.log(`  Registros después: ${famAfterDelete} (${famAfterDelete - famAfterCreate})`);
                console.log(results.delete ? '  ✅ DELETE VERIFICADO' : '  ⚠️ DELETE pendiente');
            } else {
                console.log('  ⚠️ Botón eliminar no visible');
            }
        } catch (err) {
            console.log(`  Error: ${err.message}`);
        }

        await page.screenshot({ path: 'debug-final-state.png', fullPage: true });

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN
    console.log('\n' + '='.repeat(80));
    console.log('RESUMEN CRUD COMPLETO - MÓDULO USUARIOS');
    console.log('='.repeat(80));
    console.log('');
    console.log(`  CREATE (Educación):  ${results.create ? '✅ VERIFICADO BD' : '❌ NO VERIFICADO'}`);
    console.log(`  UPDATE (Datos):      ${results.update ? '✅ VERIFICADO API' : '❌ NO VERIFICADO'}`);
    console.log(`  DELETE (Familiar):   ${results.delete ? '✅ VERIFICADO BD' : '❌ NO VERIFICADO'}`);
    console.log('');
    const total = [results.create, results.update, results.delete].filter(Boolean).length;
    console.log(`  TOTAL: ${total}/3 operaciones CRUD`);
    if (total >= 2) {
        console.log('  🎉 CRUD MAYORITARIAMENTE FUNCIONAL');
    }
    console.log('='.repeat(80));
})();
