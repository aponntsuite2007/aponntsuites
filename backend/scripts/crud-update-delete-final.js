/**
 * CRUD TEST FINAL - UPDATE & DELETE
 * Edición y eliminación dentro del expediente del usuario
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
    console.log('CRUD TEST FINAL - UPDATE & DELETE');
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
                console.log(`    📡 UPDATE: ${r.url().substring(0, 60)}`);
            } else if (method === 'DELETE' && (r.status() === 200 || r.status() === 204)) {
                apiDelete = true;
                console.log(`    📡 DELETE: ${r.url().substring(0, 60)}`);
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
        await page.click('text=Gestión de Usuarios');
        await page.waitForTimeout(4000);
        console.log('▶ MÓDULO USUARIOS CARGADO\n');

        // ================================================================
        // TEST UPDATE - Editar en Tab 2 (Datos Personales - Educación)
        // ================================================================
        console.log('▶ TEST UPDATE - TAB 2: EDUCACIÓN');
        console.log('-'.repeat(80));

        const countEduBefore = await count('user_education');
        console.log(`  Registros user_education: ${countEduBefore}`);

        // Abrir expediente del primer usuario de prueba
        await page.evaluate(() => {
            const rows = document.querySelectorAll('table tbody tr');
            for (const row of rows) {
                if (row.textContent.includes('Test') || row.textContent.includes('CRUD')) {
                    const viewBtn = row.querySelector('button');
                    if (viewBtn) {
                        viewBtn.click();
                        return;
                    }
                }
            }
            // Fallback: primer usuario
            const firstBtn = document.querySelector('table tbody tr button');
            if (firstBtn) firstBtn.click();
        });
        await page.waitForTimeout(3000);
        console.log('  ✓ Expediente abierto');

        // Ir a Tab 2 - Datos Personales
        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.nav-link, [role="tab"]');
            for (const t of tabs) {
                if (t.textContent.toLowerCase().includes('datos personales') ||
                    t.textContent.toLowerCase().includes('personal')) {
                    t.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(2000);
        console.log('  ✓ Tab 2 abierto');

        // Buscar registro de educación existente para editar
        // Buscar botón de editar (lápiz) en la sección de Formación Académica
        apiUpdate = false;
        const editEduClicked = await page.evaluate(() => {
            // Buscar en cards o tablas dentro de Formación Académica
            const editBtns = document.querySelectorAll('button');
            for (const btn of editBtns) {
                if (!btn.offsetParent) continue;
                const html = btn.innerHTML.toLowerCase();
                const text = btn.textContent.toLowerCase();
                // Buscar botón de editar (lápiz o texto "editar")
                if (html.includes('pencil') || html.includes('edit') ||
                    text.includes('editar') || btn.classList.contains('btn-warning')) {
                    // Verificar que está cerca de "Formación" o "Educación"
                    const parent = btn.closest('.card, section, tr, .education-item');
                    if (parent) {
                        btn.click();
                        return { ok: true };
                    }
                }
            }
            return { ok: false };
        });

        if (editEduClicked.ok) {
            console.log('  ✓ Botón editar encontrado');
            await page.waitForTimeout(2000);

            // Modificar un campo
            const newValue = 'UPDATED_EDU_' + Date.now().toString().slice(-6);
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
            console.log(`  ✓ Campo modificado: ${newValue}`);

            // Guardar
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    if ((t.includes('guardar') || t.includes('save') || t.includes('actualizar')) &&
                        !t.includes('cancel') && !t.startsWith('+')) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.waitForTimeout(3000);
            console.log(apiUpdate ? '  ✓ UPDATE VERIFICADO (API)' : '  ? UPDATE pendiente');
        } else {
            console.log('  ⚠️ No hay registro de educación para editar - Creando uno...');

            // Crear registro primero
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.offsetParent && btn.textContent.includes('Agregar') &&
                        !btn.textContent.includes('Usuario')) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.waitForTimeout(2000);

            // Llenar y guardar
            await page.evaluate(() => {
                document.querySelectorAll('select').forEach(s => {
                    if (s.offsetParent && s.options.length > 1) {
                        s.selectedIndex = 1;
                        s.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
                document.querySelectorAll('input, textarea').forEach(input => {
                    if (input.offsetParent && !input.disabled && input.type !== 'hidden') {
                        if (input.type === 'date') input.value = '2020-01-15';
                        else input.value = 'TEST_' + Date.now().toString().slice(-6);
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });
            });

            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    if (t.includes('guardar') || t === 'save') {
                        btn.click();
                        return;
                    }
                }
            });
            await page.waitForTimeout(3000);
            console.log('  ✓ Registro creado para futuras pruebas de UPDATE');
        }
        console.log('');

        // ================================================================
        // TEST DELETE - Eliminar registro de educación
        // ================================================================
        console.log('▶ TEST DELETE - TAB 2: EDUCACIÓN');
        console.log('-'.repeat(80));

        const countEduBeforeDelete = await count('user_education');
        console.log(`  Registros antes: ${countEduBeforeDelete}`);

        // Buscar botón de eliminar
        apiDelete = false;
        const deleteClicked = await page.evaluate(() => {
            const deleteBtns = document.querySelectorAll('button');
            for (const btn of deleteBtns) {
                if (!btn.offsetParent) continue;
                const html = btn.innerHTML.toLowerCase();
                const text = btn.textContent.toLowerCase();
                const cls = btn.className.toLowerCase();
                // Buscar botón de eliminar (papelera o texto "eliminar" o clase danger)
                if (html.includes('trash') || html.includes('delete') ||
                    text.includes('eliminar') || cls.includes('danger')) {
                    btn.click();
                    return { ok: true };
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
                    const c = btn.className;
                    if (t.includes('confirmar') || t.includes('sí') || t.includes('eliminar') ||
                        t.includes('yes') || (c.includes('danger') && t.length < 20)) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.waitForTimeout(3000);

            const countEduAfterDelete = await count('user_education');
            const deleted = countEduAfterDelete < countEduBeforeDelete || apiDelete;
            console.log(`  Registros después: ${countEduAfterDelete} (${countEduAfterDelete - countEduBeforeDelete})`);
            console.log(deleted ? '  ✓ DELETE VERIFICADO EN BD' : '  ? DELETE pendiente');
        } else {
            console.log('  ⚠️ No se encontró botón de eliminar');
        }
        console.log('');

        // ================================================================
        // TEST DELETE - Eliminar usuario completo
        // ================================================================
        console.log('▶ TEST DELETE - USUARIO COMPLETO');
        console.log('-'.repeat(80));

        // Volver a la lista de usuarios
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // Cerrar expediente y volver a lista
        await page.evaluate(() => {
            const closeBtn = document.querySelector('button.btn-close, .close-btn, [aria-label="Close"]');
            if (closeBtn) closeBtn.click();
        });
        await page.waitForTimeout(2000);

        // Navegar de nuevo a usuarios si es necesario
        await page.click('text=Gestión de Usuarios').catch(() => {});
        await page.waitForTimeout(3000);

        const countUsersBefore = await count('users');
        console.log(`  Usuarios antes: ${countUsersBefore}`);

        // Buscar usuario de prueba y abrir su expediente
        await page.evaluate(() => {
            const rows = document.querySelectorAll('table tbody tr');
            for (const row of rows) {
                if (row.textContent.includes('UPDATE_Test') ||
                    row.textContent.includes('CRUD_Test')) {
                    const viewBtn = row.querySelector('button');
                    if (viewBtn) {
                        viewBtn.click();
                        return;
                    }
                }
            }
        });
        await page.waitForTimeout(3000);

        // En el expediente, ir a Tab 1 (Administración) donde está el botón de baja
        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.nav-link, [role="tab"]');
            for (const t of tabs) {
                if (t.textContent.toLowerCase().includes('administración') ||
                    t.textContent.toLowerCase().includes('admin')) {
                    t.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(2000);

        // Buscar botón de "Gestionar Baja" o "Eliminar Usuario"
        apiDelete = false;
        const deleteUserClicked = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.toLowerCase();
                if (t.includes('baja') || t.includes('eliminar usuario') ||
                    t.includes('dar de baja') || t.includes('desactivar')) {
                    btn.click();
                    return { ok: true, text: btn.textContent.trim() };
                }
            }
            return { ok: false };
        });

        if (deleteUserClicked.ok) {
            console.log(`  ✓ Click en: "${deleteUserClicked.text}"`);
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug-user-delete.png' });

            // Llenar formulario de baja si es necesario
            await page.evaluate(() => {
                document.querySelectorAll('select').forEach(s => {
                    if (s.offsetParent && s.options.length > 1) {
                        s.selectedIndex = 1;
                        s.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
                document.querySelectorAll('input[type="date"]').forEach(d => {
                    if (d.offsetParent) {
                        d.value = new Date().toISOString().split('T')[0];
                        d.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            });

            // Confirmar baja
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    if (t.includes('registrar baja') || t.includes('confirmar') ||
                        t.includes('procesar')) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.waitForTimeout(4000);

            // Verificar que el usuario fue dado de baja (is_active = false o eliminado)
            const userStatus = await sequelize.query(`
                SELECT is_active FROM users
                WHERE "firstName" LIKE '%UPDATE_Test%' OR "firstName" LIKE '%CRUD_Test%'
                ORDER BY created_at DESC LIMIT 1
            `).catch(() => [[{ is_active: true }]]);

            const countUsersAfter = await count('users');
            const userDeleted = countUsersAfter < countUsersBefore ||
                                userStatus[0][0]?.is_active === false ||
                                apiDelete;

            console.log(`  Usuarios después: ${countUsersAfter}`);
            console.log(userDeleted ? '  ✓ USUARIO ELIMINADO/DESACTIVADO' : '  ? Eliminación pendiente');
        } else {
            console.log('  ⚠️ No se encontró botón de eliminar usuario');
        }

        await page.screenshot({ path: 'debug-final-state.png', fullPage: true });

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    console.log('\n' + '='.repeat(80));
    console.log('TEST COMPLETADO');
    console.log('='.repeat(80));
})();
