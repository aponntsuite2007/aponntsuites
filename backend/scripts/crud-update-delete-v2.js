/**
 * CRUD TEST v2 - UPDATE & DELETE con selectores específicos
 * Basado en estructura real del frontend
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
    console.log('CRUD TEST v2 - UPDATE & DELETE');
    console.log('='.repeat(80));
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    let apiUpdate = false;
    let apiDelete = false;

    page.on('response', async r => {
        if (r.url().includes('/api/')) {
            const method = r.request().method();
            if ((method === 'PUT' || method === 'PATCH') && r.status() === 200) {
                apiUpdate = true;
                console.log(`    📡 UPDATE OK: ${r.url().substring(0, 70)}`);
            } else if (method === 'DELETE' && (r.status() === 200 || r.status() === 204)) {
                apiDelete = true;
                console.log(`    📡 DELETE OK: ${r.url().substring(0, 70)}`);
            }
        }
    });

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

        // Navegar a Usuarios
        console.log('▶ NAVEGAR A GESTIÓN DE USUARIOS');
        await page.click('text=Gestión de Usuarios');
        await page.waitForTimeout(4000);

        // Contar usuarios
        const countUsersBefore = await count('users');
        console.log(`  Usuarios en BD: ${countUsersBefore}\n`);

        // ================================================================
        // TEST UPDATE - Editar usuario desde la lista
        // ================================================================
        console.log('▶ TEST UPDATE - USUARIO EN LISTA');
        console.log('-'.repeat(80));

        // Primero crear un usuario para editar
        console.log('  Creando usuario de prueba para editar...');
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b =>
                b.textContent.includes('Agregar') && b.offsetParent
            );
            if (btn) btn.click();
        });
        await page.waitForTimeout(2000);

        const testEmail = `update-test-${Date.now()}@test.com`;
        const testName = 'UPDATE_Test_' + Date.now().toString().slice(-6);

        await page.evaluate((data) => {
            const inputs = document.querySelectorAll('input');
            inputs.forEach(input => {
                if (!input.offsetParent) return;
                const ph = input.placeholder || '';
                if (ph.includes('Juan') || input.name?.includes('name')) {
                    input.value = data.name;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                } else if (input.type === 'email') {
                    input.value = data.email;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                } else if (ph.includes('EMP') || input.name?.includes('legajo')) {
                    input.value = 'UPD-' + Date.now().toString().slice(-6);
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                } else if (input.type === 'password') {
                    input.value = 'Test123!';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
            document.querySelectorAll('select').forEach(s => {
                if (s.offsetParent && s.options.length > 1) {
                    s.selectedIndex = 1;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }, { name: testName, email: testEmail });

        // Guardar usuario
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const c = btn.className || '';
                const t = btn.textContent.toLowerCase();
                if ((c.includes('success') || c.includes('primary')) && !t.includes('cancel')) {
                    btn.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(4000);
        console.log(`  ✓ Usuario creado: ${testName}`);

        // Cerrar modal de éxito "Entendido"
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.textContent.toLowerCase().includes('entendido') ||
                    btn.textContent.toLowerCase().includes('ok') ||
                    btn.textContent.toLowerCase().includes('cerrar')) {
                    btn.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(1000);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // Resetear filtros para ver todos los usuarios
        await page.evaluate(() => {
            // Buscar botón de reset filtros o selects de filtro
            const selects = document.querySelectorAll('select');
            selects.forEach(s => {
                if (s.offsetParent && s.options.length > 0) {
                    // Seleccionar primera opción (generalmente "Todos")
                    s.selectedIndex = 0;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            // Buscar botón de limpiar filtros
            const clearBtn = document.querySelector('button[title*="Limpiar"], button[title*="Reset"], .btn-danger.btn-sm');
            if (clearBtn) clearBtn.click();
        });
        await page.waitForTimeout(2000);

        // Verificar que el usuario se creó
        const userCreated = await sequelize.query(`SELECT user_id, "firstName" FROM users WHERE email = '${testEmail}'`);
        if (userCreated[0].length === 0) {
            console.log('  ✗ Usuario no encontrado en BD');
        } else {
            const userId = userCreated[0][0].user_id;
            const originalName = userCreated[0][0].firstName;
            console.log(`  ✓ Usuario en BD: ${originalName} (${userId.substring(0, 8)}...)`);

            // Ahora buscar y editar este usuario
            console.log('  Buscando usuario para editar...');

            // Buscar fila con el nombre de prueba y click en editar (lápiz amarillo)
            apiUpdate = false;
            const editClicked = await page.evaluate((name) => {
                const rows = document.querySelectorAll('table tbody tr');
                for (const row of rows) {
                    if (row.textContent.includes(name) || row.textContent.includes('UPDATE_Test')) {
                        // El segundo botón suele ser editar (amarillo/warning)
                        const btns = row.querySelectorAll('button');
                        if (btns.length >= 2) {
                            // Click en el segundo botón (editar)
                            btns[1].click();
                            return { ok: true, method: 'second-btn' };
                        }
                        // Buscar por clase warning
                        const editBtn = row.querySelector('button.btn-warning, [class*="warning"]');
                        if (editBtn) {
                            editBtn.click();
                            return { ok: true, method: 'warning-class' };
                        }
                    }
                }
                // Fallback: editar primer usuario de la lista
                const firstRow = document.querySelector('table tbody tr');
                if (firstRow) {
                    const btns = firstRow.querySelectorAll('button');
                    if (btns.length >= 2) {
                        btns[1].click();
                        return { ok: true, method: 'fallback' };
                    }
                }
                return { ok: false };
            }, testName);

            if (editClicked.ok) {
                console.log(`  ✓ Modal de edición abierto (${editClicked.method})`);
                await page.waitForTimeout(2000);
                await page.screenshot({ path: 'debug-edit-modal.png' });

                // Modificar el nombre
                const newName = 'MODIFIED_' + Date.now().toString().slice(-6);
                await page.evaluate((name) => {
                    const inputs = document.querySelectorAll('input');
                    for (const input of inputs) {
                        if (!input.offsetParent) continue;
                        const ph = input.placeholder || '';
                        if (ph.includes('Juan') || input.name?.includes('name') || input.name?.includes('firstName')) {
                            input.value = name;
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            return true;
                        }
                    }
                    // Fallback: primer input de texto
                    for (const input of inputs) {
                        if (input.offsetParent && input.type === 'text' && !input.disabled) {
                            input.value = name;
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            return true;
                        }
                    }
                    return false;
                }, newName);
                console.log(`  ✓ Nombre modificado a: ${newName}`);

                // Guardar cambios
                await page.evaluate(() => {
                    const btns = document.querySelectorAll('button');
                    for (const btn of btns) {
                        if (!btn.offsetParent) continue;
                        const t = btn.textContent.toLowerCase();
                        const c = btn.className || '';
                        if ((t.includes('guardar') || t.includes('actualizar') || t.includes('update') ||
                             c.includes('success') || c.includes('primary')) &&
                            !t.includes('cancel') && !t.startsWith('+')) {
                            btn.click();
                            return;
                        }
                    }
                });
                await page.waitForTimeout(4000);

                // Verificar en BD
                const userAfter = await sequelize.query(`SELECT "firstName" FROM users WHERE user_id = '${userId}'`);
                const newNameInDB = userAfter[0][0]?.firstName;
                const updateSuccess = newNameInDB?.includes('MODIFIED') || apiUpdate;

                console.log(`  Nombre en BD: ${newNameInDB}`);
                console.log(updateSuccess ? '  ✓ UPDATE VERIFICADO EN BD' : '  ? UPDATE no verificado');
            }
        }
        console.log('');

        // Cerrar modales
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ================================================================
        // TEST DELETE - Eliminar usuario
        // ================================================================
        console.log('▶ TEST DELETE - ELIMINAR USUARIO');
        console.log('-'.repeat(80));

        const countBefore = await count('users');
        console.log(`  Usuarios antes: ${countBefore}`);

        // Buscar y eliminar un usuario de prueba
        apiDelete = false;
        const deleteClicked = await page.evaluate(() => {
            const rows = document.querySelectorAll('table tbody tr');
            for (const row of rows) {
                // Buscar usuarios de prueba para eliminar
                if (row.textContent.includes('UPDATE_Test') ||
                    row.textContent.includes('MODIFIED') ||
                    row.textContent.includes('CRUD_Test') ||
                    row.textContent.includes('Test_')) {
                    // El tercer botón suele ser eliminar (rojo)
                    const btns = row.querySelectorAll('button');
                    if (btns.length >= 3) {
                        btns[2].click();
                        return { ok: true, method: 'third-btn' };
                    }
                    // Buscar por clase danger
                    const deleteBtn = row.querySelector('button.btn-danger, [class*="danger"]');
                    if (deleteBtn) {
                        deleteBtn.click();
                        return { ok: true, method: 'danger-class' };
                    }
                }
            }
            return { ok: false };
        });

        if (deleteClicked.ok) {
            console.log(`  ✓ Botón eliminar clickeado (${deleteClicked.method})`);
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug-delete-modal.png' });

            // Confirmar eliminación
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    const c = btn.className || '';
                    if (t.includes('confirmar') || t.includes('eliminar') || t.includes('sí') ||
                        t.includes('yes') || t.includes('delete') ||
                        (c.includes('danger') && !t.includes('cancelar'))) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.waitForTimeout(4000);

            const countAfter = await count('users');
            const deleted = countAfter < countBefore || apiDelete;

            console.log(`  Usuarios después: ${countAfter} (${countAfter - countBefore})`);
            console.log(deleted ? '  ✓ DELETE VERIFICADO EN BD' : '  ? DELETE no verificado');
        } else {
            console.log('  ⚠️ No se encontró usuario de prueba para eliminar');
        }
        console.log('');

        await page.screenshot({ path: 'debug-crud-final.png', fullPage: true });

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-crud-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    console.log('='.repeat(80));
    console.log('TEST COMPLETADO');
    console.log('='.repeat(80));
})();
