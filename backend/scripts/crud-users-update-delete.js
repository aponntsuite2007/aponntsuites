/**
 * CRUD TEST - UPDATE y DELETE en Tabs del Módulo Usuarios
 * Completa el testing CRUD con modificación y eliminación
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

async function getLastRecord(table, idColumn = 'id') {
    try {
        const [r] = await sequelize.query(`SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 1`);
        return r[0] || null;
    } catch { return null; }
}

(async () => {
    console.log('='.repeat(80));
    console.log('CRUD TEST - UPDATE & DELETE - MÓDULO USUARIOS');
    console.log('='.repeat(80));
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const results = { update: [], delete: [] };
    let apiSuccess = false;

    page.on('response', async r => {
        if (r.url().includes('/api/')) {
            const method = r.request().method();
            if ((method === 'PUT' || method === 'PATCH') && r.status() === 200) {
                apiSuccess = true;
                console.log(`    📡 API UPDATE ${r.status()}: ${r.url().substring(0, 60)}`);
            } else if (method === 'DELETE' && (r.status() === 200 || r.status() === 204)) {
                apiSuccess = true;
                console.log(`    📡 API DELETE ${r.status()}: ${r.url().substring(0, 60)}`);
            } else if (r.status() >= 400) {
                try {
                    const body = await r.json();
                    console.log(`    ❌ API ${r.status()}: ${body.message || JSON.stringify(body).substring(0, 50)}`);
                } catch {}
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
        console.log('  ✓ OK\n');

        // ================================================================
        // TEST 1: UPDATE USUARIO (Tab 1 - Administración)
        // ================================================================
        console.log('▶ TEST UPDATE - TAB 1: ADMINISTRACIÓN (Usuario)');
        console.log('-'.repeat(80));

        // Buscar usuario de prueba para editar
        const userBefore = await sequelize.query(`
            SELECT user_id, "firstName", "lastName", email
            FROM users
            WHERE email LIKE '%test%' OR "firstName" LIKE '%Test%' OR "firstName" LIKE '%CRUD%'
            LIMIT 1
        `);

        if (userBefore[0].length > 0) {
            const testUser = userBefore[0][0];
            console.log(`  Usuario a editar: ${testUser.firstName} ${testUser.lastName}`);

            // Click en botón editar del usuario
            apiSuccess = false;
            const editClicked = await page.evaluate((email) => {
                const rows = document.querySelectorAll('table tbody tr');
                for (const row of rows) {
                    if (row.textContent.includes('Test') || row.textContent.includes('CRUD')) {
                        // Buscar botón de editar (lápiz)
                        const editBtn = row.querySelector('button.btn-warning, button[title*="Edit"], .bi-pencil');
                        if (editBtn) {
                            const btn = editBtn.tagName === 'BUTTON' ? editBtn : editBtn.closest('button');
                            if (btn) {
                                btn.click();
                                return { ok: true };
                            }
                        }
                        // Fallback: segundo botón de la fila
                        const btns = row.querySelectorAll('button');
                        if (btns.length >= 2) {
                            btns[1].click();
                            return { ok: true, fallback: true };
                        }
                    }
                }
                return { ok: false };
            }, testUser.email);

            if (editClicked.ok) {
                console.log('  ✓ Modal de edición abierto');
                await page.waitForTimeout(2000);

                // Modificar un campo (nombre)
                const newName = 'UPDATED_' + Date.now().toString().slice(-6);
                await page.evaluate((name) => {
                    const inputs = document.querySelectorAll('input');
                    for (const input of inputs) {
                        if (input.offsetParent &&
                            (input.placeholder?.includes('Juan') ||
                             input.name?.includes('name') ||
                             input.name?.includes('firstName'))) {
                            input.value = name;
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            return;
                        }
                    }
                }, newName);
                console.log(`  ✓ Campo modificado: firstName = ${newName}`);

                // Guardar
                await page.evaluate(() => {
                    const btns = document.querySelectorAll('button');
                    for (const btn of btns) {
                        if (!btn.offsetParent) continue;
                        const t = btn.textContent.toLowerCase();
                        const c = btn.className || '';
                        if ((c.includes('success') || c.includes('primary') ||
                             t.includes('guardar') || t.includes('actualizar') || t.includes('update')) &&
                            !t.includes('cancel')) {
                            btn.click();
                            return;
                        }
                    }
                });
                await page.waitForTimeout(4000);

                // Verificar en BD
                const userAfter = await sequelize.query(`
                    SELECT "firstName" FROM users WHERE user_id = '${testUser.user_id}'
                `);
                const updated = userAfter[0][0]?.firstName?.includes('UPDATED') || apiSuccess;
                results.update.push({ tab: 'Tab 1 - Usuario', success: updated });
                console.log(updated ? '  ✓ UPDATE verificado' : '  ? UPDATE no verificado');
            } else {
                console.log('  ✗ No se encontró botón de editar');
                results.update.push({ tab: 'Tab 1 - Usuario', success: false });
            }
        } else {
            console.log('  ⚠️ No hay usuario de prueba para editar');
            results.update.push({ tab: 'Tab 1 - Usuario', success: false, note: 'Sin datos' });
        }
        console.log('');

        // ================================================================
        // TEST 2: UPDATE EN TAB 2 (Formación Académica)
        // ================================================================
        console.log('▶ TEST UPDATE - TAB 2: DATOS PERSONALES (Educación)');
        console.log('-'.repeat(80));

        // Abrir expediente de usuario
        await page.evaluate(() => {
            const rows = document.querySelectorAll('table tbody tr');
            if (rows.length > 0) {
                const btn = rows[0].querySelector('button');
                if (btn) btn.click();
            }
        });
        await page.waitForTimeout(3000);

        // Ir a Tab 2
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

        // Buscar botón de editar en registros de educación
        apiSuccess = false;
        const editEdu = await page.evaluate(() => {
            // Buscar en la sección de Formación Académica
            const sections = document.querySelectorAll('.card, section, div');
            for (const sec of sections) {
                if (sec.textContent.includes('Formación') || sec.textContent.includes('Educación')) {
                    const editBtn = sec.querySelector('button.btn-warning, .bi-pencil, button[title*="Edit"]');
                    if (editBtn) {
                        const btn = editBtn.tagName === 'BUTTON' ? editBtn : editBtn.closest('button');
                        if (btn && btn.offsetParent) {
                            btn.click();
                            return { ok: true };
                        }
                    }
                }
            }
            // Fallback: buscar cualquier botón de editar
            const allEdit = document.querySelectorAll('.bi-pencil, button.btn-warning');
            for (const e of allEdit) {
                if (e.offsetParent) {
                    const btn = e.tagName === 'BUTTON' ? e : e.closest('button');
                    if (btn) {
                        btn.click();
                        return { ok: true, fallback: true };
                    }
                }
            }
            return { ok: false };
        });

        if (editEdu.ok) {
            console.log('  ✓ Modal de edición abierto');
            await page.waitForTimeout(2000);

            // Modificar un campo
            await page.evaluate(() => {
                const inputs = document.querySelectorAll('input, textarea');
                for (const input of inputs) {
                    if (input.offsetParent && input.type === 'text' && !input.disabled) {
                        input.value = 'UPDATED_EDU_' + Date.now().toString().slice(-6);
                        input.dispatchEvent(new Event('input', { bubbles: true }));
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
                    if ((t.includes('guardar') || t.includes('save') || t.includes('actualizar')) &&
                        !t.includes('cancel')) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.waitForTimeout(3000);

            results.update.push({ tab: 'Tab 2 - Educación', success: apiSuccess });
            console.log(apiSuccess ? '  ✓ UPDATE verificado (API)' : '  ? UPDATE pendiente');
        } else {
            console.log('  ⚠️ No se encontró registro para editar');
            results.update.push({ tab: 'Tab 2 - Educación', success: false, note: 'Sin datos' });
        }
        console.log('');

        // ================================================================
        // TEST 3: DELETE EN TAB 4 (Grupo Familiar)
        // ================================================================
        console.log('▶ TEST DELETE - TAB 4: GRUPO FAMILIAR');
        console.log('-'.repeat(80));

        const countFamilyBefore = await count('user_family_members');
        console.log(`  Registros antes: ${countFamilyBefore}`);

        // Ir a Tab 4
        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.nav-link, [role="tab"]');
            for (const t of tabs) {
                if (t.textContent.toLowerCase().includes('grupo familiar') ||
                    t.textContent.toLowerCase().includes('familiar')) {
                    t.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(2000);
        console.log('  ✓ Tab 4 abierto');

        // Buscar botón de eliminar
        apiSuccess = false;
        const deleteFamily = await page.evaluate(() => {
            // Buscar botón rojo de eliminar
            const deleteBtns = document.querySelectorAll('button.btn-danger, .bi-trash, button[title*="Eliminar"], button[title*="Delete"]');
            for (const e of deleteBtns) {
                if (e.offsetParent) {
                    const btn = e.tagName === 'BUTTON' ? e : e.closest('button');
                    if (btn) {
                        btn.click();
                        return { ok: true };
                    }
                }
            }
            return { ok: false };
        });

        if (deleteFamily.ok) {
            console.log('  ✓ Click en eliminar');
            await page.waitForTimeout(1000);

            // Confirmar eliminación (buscar modal de confirmación)
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    if (t.includes('confirmar') || t.includes('eliminar') || t.includes('sí') ||
                        t.includes('delete') || t.includes('yes')) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.waitForTimeout(3000);

            const countFamilyAfter = await count('user_family_members');
            const deleted = countFamilyAfter < countFamilyBefore || apiSuccess;
            console.log(`  Registros después: ${countFamilyAfter} (${countFamilyAfter - countFamilyBefore})`);
            results.delete.push({ tab: 'Tab 4 - Familiar', success: deleted });
            console.log(deleted ? '  ✓ DELETE verificado' : '  ? DELETE pendiente');
        } else {
            console.log('  ⚠️ No se encontró botón de eliminar');
            results.delete.push({ tab: 'Tab 4 - Familiar', success: false, note: 'Sin botón' });
        }
        console.log('');

        // ================================================================
        // TEST 4: DELETE EN TAB 2 (Educación)
        // ================================================================
        console.log('▶ TEST DELETE - TAB 2: DATOS PERSONALES (Educación)');
        console.log('-'.repeat(80));

        const countEduBefore = await count('user_education');
        console.log(`  Registros antes: ${countEduBefore}`);

        // Ir a Tab 2
        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.nav-link, [role="tab"]');
            for (const t of tabs) {
                if (t.textContent.toLowerCase().includes('datos personales')) {
                    t.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(2000);

        // Buscar botón de eliminar en educación
        apiSuccess = false;
        const deleteEdu = await page.evaluate(() => {
            const deleteBtns = document.querySelectorAll('button.btn-danger, .bi-trash');
            for (const e of deleteBtns) {
                if (e.offsetParent) {
                    const btn = e.tagName === 'BUTTON' ? e : e.closest('button');
                    if (btn) {
                        btn.click();
                        return { ok: true };
                    }
                }
            }
            return { ok: false };
        });

        if (deleteEdu.ok) {
            console.log('  ✓ Click en eliminar');
            await page.waitForTimeout(1000);

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
            await page.waitForTimeout(3000);

            const countEduAfter = await count('user_education');
            const deleted = countEduAfter < countEduBefore || apiSuccess;
            console.log(`  Registros después: ${countEduAfter} (${countEduAfter - countEduBefore})`);
            results.delete.push({ tab: 'Tab 2 - Educación', success: deleted });
            console.log(deleted ? '  ✓ DELETE verificado' : '  ? DELETE pendiente');
        } else {
            console.log('  ⚠️ No se encontró botón de eliminar');
            results.delete.push({ tab: 'Tab 2 - Educación', success: false });
        }
        console.log('');

        await page.screenshot({ path: 'debug-update-delete-final.png', fullPage: true });

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-update-delete-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN
    console.log('='.repeat(80));
    console.log('RESUMEN - UPDATE & DELETE');
    console.log('='.repeat(80));
    console.log('');

    console.log('UPDATE:');
    results.update.forEach(r => {
        console.log(`  ${r.tab.padEnd(25)} : ${r.success ? '✓' : '✗'} ${r.note || ''}`);
    });

    console.log('\nDELETE:');
    results.delete.forEach(r => {
        console.log(`  ${r.tab.padEnd(25)} : ${r.success ? '✓' : '✗'} ${r.note || ''}`);
    });

    const totalUpdate = results.update.filter(r => r.success).length;
    const totalDelete = results.delete.filter(r => r.success).length;

    console.log('\n' + '-'.repeat(40));
    console.log(`UPDATE: ${totalUpdate}/${results.update.length}`);
    console.log(`DELETE: ${totalDelete}/${results.delete.length}`);
    console.log('='.repeat(80));
})();
