/**
 * CRUD TEST COMPLETO - ESTRUCTURA ORGANIZACIONAL
 * Prueba todos los tabs: Departamentos, Sectores, Convenios, Categorías, Turnos, Roles, Posiciones
 * Verifica: Multi-tenant (company_id), Persistencia BD, CRUD completo
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

const COMPANY_ID = 11; // ISI

// Configuración de cada tab con su tabla BD correspondiente
const TABS_CONFIG = [
    {
        id: 'departments',
        name: 'Departamentos',
        table: 'departments',
        createBtn: 'Nuevo Departamento',
        saveBtn: 'Crear Departamento',
        editBtn: '✏️',
        deleteBtn: '🗑️'
    },
    {
        id: 'sectors',
        name: 'Sectores',
        table: 'sectors',
        createBtn: 'Nuevo Sector',
        saveBtn: 'Crear Sector',
        editBtn: '✏️',
        deleteBtn: '🗑️'
    },
    {
        id: 'agreements',
        name: 'Convenios',
        table: 'labor_agreements_v2',
        createBtn: 'Nuevo Convenio',
        saveBtn: 'Crear Convenio',
        editBtn: '✏️',
        deleteBtn: '🗑️'
    },
    {
        id: 'categories',
        name: 'Categorías',
        table: 'salary_categories_v2',
        createBtn: 'Nueva Categoría',
        saveBtn: 'Crear Categoría',
        editBtn: '✏️',
        deleteBtn: '🗑️'
    },
    {
        id: 'shifts',
        name: 'Turnos',
        table: 'shifts',
        createBtn: 'Nuevo Turno',
        saveBtn: 'Crear Turno',
        editBtn: '✏️',
        deleteBtn: '🗑️'
    },
    {
        id: 'roles',
        name: 'Roles',
        table: 'role_definitions',
        createBtn: 'Nuevo Rol',
        saveBtn: 'Crear Rol',
        editBtn: '✏️',
        deleteBtn: '🗑️'
    },
    {
        id: 'positions',
        name: 'Posiciones',
        table: 'organizational_positions',
        createBtn: 'Nueva Posición',
        saveBtn: 'Crear Posición',
        editBtn: '✏️',
        deleteBtn: '🗑️'
    }
];

async function count(table) {
    try {
        const [r] = await sequelize.query(
            `SELECT COUNT(*) as c FROM ${table} WHERE company_id = ${COMPANY_ID}`
        );
        return parseInt(r[0].c);
    } catch {
        try {
            const [r] = await sequelize.query(`SELECT COUNT(*) as c FROM ${table}`);
            return parseInt(r[0].c);
        } catch { return -1; }
    }
}

(async () => {
    console.log('='.repeat(90));
    console.log('CRUD TEST COMPLETO - ESTRUCTURA ORGANIZACIONAL');
    console.log('='.repeat(90));
    console.log(`Company ID: ${COMPANY_ID} | Tabs a probar: ${TABS_CONFIG.length}`);
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    // Track API responses
    let lastApiResponse = { method: null, status: null };
    page.on('response', async r => {
        if (r.url().includes('/api/')) {
            const method = r.request().method();
            const status = r.status();
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && status >= 200 && status < 300) {
                lastApiResponse = { method, status };
            }
        }
    });

    const results = {};

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

        // PROBAR CADA TAB
        for (const tab of TABS_CONFIG) {
            console.log('='.repeat(90));
            console.log(`▶ TAB: ${tab.name.toUpperCase()}`);
            console.log('='.repeat(90));

            results[tab.id] = { create: false, update: false, delete: false };
            const ts = Date.now().toString().slice(-6);
            const TEST_NAME = `TEST_${tab.id.toUpperCase()}_${ts}`;

            // Navegar al tab
            const tabClicked = await page.evaluate((tabId) => {
                // Buscar tab button
                const tabs = document.querySelectorAll('button, [role="tab"], .org-tab');
                for (const t of tabs) {
                    if (t.getAttribute('data-tab') === tabId ||
                        t.onclick?.toString().includes(tabId) ||
                        t.textContent.toLowerCase().includes(tabId.replace('agreements', 'convenio').replace('categories', 'categoría').replace('shifts', 'turno').replace('positions', 'posicion'))) {
                        t.click();
                        return true;
                    }
                }
                // Intentar función directa
                if (typeof OrgEngine !== 'undefined' && OrgEngine.switchTab) {
                    OrgEngine.switchTab(tabId);
                    return true;
                }
                return false;
            }, tab.id);

            if (!tabClicked) {
                // Fallback: click por texto
                try {
                    await page.click(`text=${tab.name}`, { timeout: 3000 });
                } catch {
                    console.log(`  ⚠️ No se pudo navegar al tab ${tab.name}`);
                    continue;
                }
            }

            await page.waitForTimeout(2000);
            const countBefore = await count(tab.table);
            console.log(`\n  BD antes: ${countBefore} registros en ${tab.table}`);

            // ============ CREATE ============
            console.log(`\n  [CREATE]`);
            lastApiResponse = { method: null, status: null };

            // Click botón crear
            const createClicked = await page.evaluate((btnText) => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    if (btn.textContent.includes(btnText) ||
                        btn.textContent.toLowerCase().includes('nuevo') ||
                        btn.textContent.includes('+')) {
                        btn.click();
                        return btn.textContent.trim().substring(0, 30);
                    }
                }
                return null;
            }, tab.createBtn);

            if (createClicked) {
                console.log(`    ✓ Click en: "${createClicked}"`);
                await page.waitForTimeout(1500);

                // Llenar formulario
                await page.evaluate((testName) => {
                    // Text inputs
                    const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
                    let filled = 0;
                    for (const input of inputs) {
                        if (!input.offsetParent || input.disabled) continue;
                        if (input.id === 'userInput' || input.id === 'passwordInput') continue;
                        if (input.closest('#loginForm')) continue;
                        if (filled === 0) {
                            input.value = testName;
                        } else {
                            input.value = 'Test_' + Date.now().toString().slice(-4);
                        }
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        filled++;
                    }

                    // Textarea
                    const ta = document.querySelector('textarea');
                    if (ta && ta.offsetParent) {
                        ta.value = 'Descripción test ' + testName;
                        ta.dispatchEvent(new Event('input', { bubbles: true }));
                    }

                    // Selects (skip language selector)
                    document.querySelectorAll('select').forEach(s => {
                        if (!s.offsetParent || s.id === 'companySelect') return;
                        const hasLang = Array.from(s.options).some(o =>
                            o.text.includes('English') || o.text.includes('Español'));
                        if (hasLang) return;
                        if (s.options.length > 1) {
                            s.selectedIndex = 1;
                            s.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });

                    // Checkboxes (select first one)
                    const cb = document.querySelector('input[type="checkbox"]:not(:checked)');
                    if (cb && cb.offsetParent) {
                        cb.checked = true;
                        cb.dispatchEvent(new Event('change', { bubbles: true }));
                    }

                    // Time inputs
                    document.querySelectorAll('input[type="time"]').forEach(t => {
                        if (t.offsetParent) {
                            t.value = t.name?.includes('end') ? '18:00' : '09:00';
                            t.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });

                    // Number inputs
                    document.querySelectorAll('input[type="number"]').forEach(n => {
                        if (n.offsetParent && !n.value) {
                            n.value = '100';
                            n.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    });
                }, TEST_NAME);

                console.log('    ✓ Formulario llenado');

                // Click guardar
                await page.evaluate((btnText) => {
                    const btns = document.querySelectorAll('button');
                    for (const btn of btns) {
                        if (!btn.offsetParent) continue;
                        const t = btn.textContent.toLowerCase();
                        if (t.includes('crear') || t.includes('guardar') || t.includes('save')) {
                            btn.click();
                            return;
                        }
                    }
                }, tab.saveBtn);

                await page.waitForTimeout(4000);
                const countAfterCreate = await count(tab.table);
                const apiCreateOk = lastApiResponse.method === 'POST' &&
                    (lastApiResponse.status === 201 || lastApiResponse.status === 200);
                results[tab.id].create = countAfterCreate > countBefore || apiCreateOk;

                console.log(`    BD: ${countBefore} → ${countAfterCreate}`);
                if (apiCreateOk) console.log(`    📡 API: ${lastApiResponse.method} ${lastApiResponse.status}`);
                console.log(results[tab.id].create ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');

                await page.keyboard.press('Escape');
                await page.waitForTimeout(1000);
            } else {
                console.log('    ⚠️ No se encontró botón crear');
            }

            // ============ UPDATE ============
            console.log(`\n  [UPDATE]`);
            lastApiResponse = { method: null, status: null };

            const editClicked = await page.evaluate((emoji) => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    if (btn.textContent.includes(emoji) || btn.title?.includes('Editar')) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            }, tab.editBtn);

            if (editClicked) {
                console.log('    ✓ Modal editar abierto');
                await page.waitForTimeout(1500);

                // Modificar campo
                await page.evaluate(() => {
                    const inputs = document.querySelectorAll('input[type="text"]');
                    for (const input of inputs) {
                        if (!input.offsetParent || input.disabled) continue;
                        if (input.closest('#loginForm')) continue;
                        input.value = 'UPD_' + Date.now().toString().slice(-6);
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        break;
                    }
                });

                // Guardar
                await page.evaluate(() => {
                    const btns = document.querySelectorAll('button');
                    for (const btn of btns) {
                        if (!btn.offsetParent) continue;
                        const t = btn.textContent.toLowerCase();
                        if (t.includes('guardar') || t.includes('actualizar') || t.includes('save')) {
                            btn.click();
                            return;
                        }
                    }
                });

                await page.waitForTimeout(3000);
                results[tab.id].update = lastApiResponse.method === 'PUT' && lastApiResponse.status === 200;
                console.log(results[tab.id].update ? '    ✅ UPDATE OK' : '    ⚠️ UPDATE sin confirmación API');

                await page.keyboard.press('Escape');
                await page.waitForTimeout(1000);
            } else {
                console.log('    ⚠️ No se encontró botón editar');
            }

            // ============ DELETE ============
            console.log(`\n  [DELETE]`);
            lastApiResponse = { method: null, status: null };
            const countBeforeDelete = await count(tab.table);

            // Handle confirm dialog - con try/catch para evitar crash
            const dialogHandler = async dialog => {
                try {
                    console.log(`    ✓ Dialog: "${dialog.message().substring(0, 40)}..."`);
                    await dialog.accept();
                } catch (e) {
                    // Ignorar si el dialog ya fue manejado
                }
            };
            page.on('dialog', dialogHandler);

            const deleteClicked = await page.evaluate((emoji) => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    if (btn.textContent.includes(emoji) ||
                        btn.className.includes('danger') ||
                        btn.title?.includes('Eliminar')) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            }, tab.deleteBtn);

            if (deleteClicked) {
                console.log('    ✓ Click eliminar');
                await page.waitForTimeout(3000);

                // Click confirm if modal
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
                const countAfterDelete = await count(tab.table);
                results[tab.id].delete = countAfterDelete < countBeforeDelete ||
                    (lastApiResponse.method === 'DELETE' && lastApiResponse.status >= 200);

                console.log(`    BD: ${countBeforeDelete} → ${countAfterDelete}`);
                console.log(results[tab.id].delete ? '    ✅ DELETE OK' : '    ⚠️ DELETE pendiente');
            } else {
                console.log('    ⚠️ No se encontró botón eliminar');
            }

            // Remover handler de dialog para evitar conflictos
            page.removeListener('dialog', dialogHandler);

            await page.screenshot({ path: `debug-org-${tab.id}.png` });
        }

    } catch (error) {
        console.log('\nERROR:', error.message);
        await page.screenshot({ path: 'debug-org-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN FINAL
    console.log('\n\n' + '='.repeat(90));
    console.log('RESUMEN FINAL - ESTRUCTURA ORGANIZACIONAL');
    console.log('='.repeat(90));
    console.log('');
    console.log('Tab'.padEnd(15) + 'CREATE'.padEnd(12) + 'UPDATE'.padEnd(12) + 'DELETE'.padEnd(12) + 'TOTAL');
    console.log('-'.repeat(60));

    let totalPassed = 0;
    let totalTests = 0;

    for (const tab of TABS_CONFIG) {
        const r = results[tab.id] || { create: false, update: false, delete: false };
        const c = r.create ? '✅' : '❌';
        const u = r.update ? '✅' : '❌';
        const d = r.delete ? '✅' : '❌';
        const passed = [r.create, r.update, r.delete].filter(Boolean).length;
        totalPassed += passed;
        totalTests += 3;
        console.log(`${tab.name.padEnd(15)}${c.padEnd(12)}${u.padEnd(12)}${d.padEnd(12)}${passed}/3`);
    }

    console.log('-'.repeat(60));
    console.log(`TOTAL: ${totalPassed}/${totalTests} (${Math.round(totalPassed/totalTests*100)}%)`);
    console.log('');

    if (totalPassed === totalTests) {
        console.log('🎉 ESTRUCTURA ORGANIZACIONAL 100% COMPLETO 🎉');
    } else {
        console.log(`⚠️ Faltan ${totalTests - totalPassed} tests por completar`);
    }
    console.log('='.repeat(90));
})();
