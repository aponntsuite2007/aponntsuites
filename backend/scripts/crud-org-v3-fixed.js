/**
 * CRUD TEST - ESTRUCTURA ORGANIZACIONAL V3 FIXED
 * Corrige validaciones específicas por tab (kiosks, selects, etc.)
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

const COMPANY_ID = 11;

// Configuración específica por tab
const TABS = {
    departments: {
        name: 'Departamentos',
        table: 'departments',
        createBtn: 'Nuevo Departamento',
        saveCreate: 'Crear Departamento',
        saveEdit: 'Guardar Cambios',
        // Validación especial: necesita kiosk O GPS
        specialValidation: 'kiosk-or-gps'
    },
    sectors: {
        name: 'Sectores',
        table: 'sectors',
        createBtn: 'Nuevo Sector',
        saveCreate: 'Crear Sector',
        saveEdit: 'Guardar Cambios',
        requiredSelects: ['department_id']
    },
    agreements: {
        name: 'Convenios',
        table: 'labor_agreements_v2',
        createBtn: 'Nuevo Convenio',
        saveCreate: 'Crear Convenio',
        saveEdit: 'Guardar Cambios'
    },
    categories: {
        name: 'Categorías',
        table: 'salary_categories_v2',
        createBtn: 'Nueva Categoría',
        saveCreate: 'Crear Categoría',
        saveEdit: 'Guardar Cambios',
        requiredSelects: ['agreement_id']
    },
    roles: {
        name: 'Roles',
        table: 'role_definitions',
        createBtn: 'Nuevo Rol',
        saveCreate: 'Crear Rol',
        saveEdit: 'Guardar Cambios'
    },
    positions: {
        name: 'Posiciones',
        table: 'organizational_positions',
        createBtn: 'Nueva Posición',
        saveCreate: 'Crear Posición',
        saveEdit: 'Guardar Cambios',
        requiredSelects: ['hierarchy_level']
    }
};

async function count(table) {
    try {
        const [r] = await sequelize.query(`SELECT COUNT(*) as c FROM ${table} WHERE company_id = ${COMPANY_ID}`);
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
    console.log('CRUD TEST - ESTRUCTURA ORGANIZACIONAL V3 FIXED');
    console.log('='.repeat(90));
    console.log('Incluye correcciones de validación (kiosks, selects requeridos)\n');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    let apiResponse = { method: null, status: null };
    page.on('response', async r => {
        if (r.url().includes('/api/')) {
            const method = r.request().method();
            const status = r.status();
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && status >= 200 && status < 300) {
                apiResponse = { method, status };
                console.log(`      📡 ${method} ${status}`);
            }
        }
    });

    const results = {};
    for (const key in TABS) results[key] = { create: false, update: false, delete: false };

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
        console.log('▶ NAVEGAR A ESTRUCTURA ORGANIZACIONAL');
        await page.click('text=Estructura Organizacional');
        await page.waitForTimeout(4000);
        console.log('  ✓ OK\n');

        // PROBAR CADA TAB
        for (const [tabKey, tab] of Object.entries(TABS)) {
            console.log('\n' + '='.repeat(90));
            console.log(`▶ ${tab.name.toUpperCase()} (${tabKey})`);
            console.log('='.repeat(90));

            const ts = Date.now().toString().slice(-6);
            const TEST_NAME = `T_${tabKey.slice(0,4).toUpperCase()}_${ts}`;

            // Navegar al tab
            await page.evaluate((key) => {
                if (typeof OrgEngine !== 'undefined' && OrgEngine.showTab) {
                    OrgEngine.showTab(key);
                }
            }, tabKey);
            await page.waitForTimeout(2000);

            const countBefore = await count(tab.table);
            console.log(`\n  BD antes: ${countBefore} en ${tab.table}`);

            // ============ CREATE ============
            console.log('\n  [CREATE]');
            apiResponse = { method: null, status: null };

            // Click botón crear
            const createClicked = await page.evaluate((btnText) => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    if (btn.textContent.includes(btnText)) {
                        btn.click();
                        return true;
                    }
                }
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    if (btn.textContent.includes('+') || btn.textContent.toLowerCase().includes('nuevo')) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            }, tab.createBtn);

            if (!createClicked) {
                console.log(`    ⚠️ No se encontró botón "${tab.createBtn}"`);
                continue;
            }
            console.log(`    ✓ Click en "${tab.createBtn}"`);
            await page.waitForTimeout(1500);

            // Llenar formulario según tab
            await page.evaluate((config) => {
                const { testName, ts, specialValidation, requiredSelects } = config;

                // 1. Llenar campos de texto
                document.querySelectorAll('input[type="text"], input:not([type])').forEach(input => {
                    if (!input.offsetParent || input.disabled || input.readOnly) return;
                    if (input.closest('#loginForm')) return;
                    if (!input.value || input.value === '') {
                        const nm = (input.name || '').toLowerCase();
                        const ph = (input.placeholder || '').toLowerCase();

                        if (nm.includes('code') || nm.includes('key') || ph.includes('código')) {
                            input.value = `CODE_${ts}`;
                        } else if (nm.includes('salary') || nm.includes('base')) {
                            input.value = '50000';
                        } else {
                            input.value = testName;
                        }
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });

                // 2. Llenar textarea
                document.querySelectorAll('textarea').forEach(ta => {
                    if (ta.offsetParent && !ta.value) {
                        ta.value = 'Descripción test ' + testName;
                        ta.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });

                // 3. Manejar selects
                document.querySelectorAll('select').forEach(sel => {
                    if (!sel.offsetParent || sel.id === 'companySelect') return;
                    // Evitar selector de idioma
                    const hasLang = Array.from(sel.options).some(o =>
                        o.text.includes('English') || o.text.includes('Español'));
                    if (hasLang) return;

                    // Si es un select requerido o tiene solo placeholder seleccionado
                    const nm = sel.name;
                    const isRequired = requiredSelects && requiredSelects.includes(nm);
                    const isPlaceholder = sel.selectedIndex <= 0 || !sel.value;

                    if (isRequired || isPlaceholder) {
                        // Buscar primera opción válida
                        for (let i = 1; i < sel.options.length; i++) {
                            if (sel.options[i].value && sel.options[i].value !== '') {
                                sel.selectedIndex = i;
                                sel.dispatchEvent(new Event('change', { bubbles: true }));
                                break;
                            }
                        }
                    }
                });

                // 4. Validación especial para Departamentos: kiosk o GPS
                if (specialValidation === 'kiosk-or-gps') {
                    // Opción A: Seleccionar al menos un kiosk
                    const kioskCheckboxes = document.querySelectorAll('.dept-kiosk-cb, input[type="checkbox"][class*="kiosk"]');
                    if (kioskCheckboxes.length > 0) {
                        kioskCheckboxes[0].checked = true;
                        kioskCheckboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
                    }

                    // Si no hay kiosks, habilitar GPS
                    if (kioskCheckboxes.length === 0) {
                        const gpsCheckbox = document.getElementById('dept-allow-gps') ||
                            document.querySelector('input[name="allow_gps_attendance"]');
                        if (gpsCheckbox && !gpsCheckbox.checked) {
                            gpsCheckbox.checked = true;
                            gpsCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

                            // Agregar coordenadas GPS
                            const latInput = document.querySelector('input[name="gps_lat"]');
                            const lngInput = document.querySelector('input[name="gps_lng"]');
                            if (latInput) {
                                latInput.value = '-34.6037';
                                latInput.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                            if (lngInput) {
                                lngInput.value = '-58.3816';
                                lngInput.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        }
                    }
                }

                // 5. Manejar inputs numéricos
                document.querySelectorAll('input[type="number"]').forEach(input => {
                    if (!input.offsetParent || input.disabled) return;
                    if (!input.value || input.value === '' || input.value === '0') {
                        input.value = '1000';
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });

            }, { testName: TEST_NAME, ts, specialValidation: tab.specialValidation, requiredSelects: tab.requiredSelects });

            console.log('    ✓ Formulario llenado');
            await page.screenshot({ path: `debug-org-v3-${tabKey}-create.png` });

            // Click guardar
            await page.evaluate((saveText) => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    if (t.includes(saveText.toLowerCase()) || t.includes('crear') || t.includes('guardar')) {
                        btn.click();
                        return;
                    }
                }
            }, tab.saveCreate);

            await page.waitForTimeout(4000);
            const countAfterCreate = await count(tab.table);
            const createOk = countAfterCreate > countBefore ||
                (apiResponse.method === 'POST' && apiResponse.status === 201);

            results[tabKey].create = createOk;
            console.log(`    BD: ${countBefore} → ${countAfterCreate}`);
            console.log(createOk ? '    ✅ CREATE OK' : '    ❌ CREATE FAIL');

            // Verificar si hay toast de error
            const errorToast = await page.evaluate(() => {
                const toasts = document.querySelectorAll('.toast, .swal2-popup, .alert-danger, [class*="toast"]');
                for (const t of toasts) {
                    if (t.offsetParent && t.textContent.toLowerCase().includes('error')) {
                        return t.textContent.substring(0, 100);
                    }
                }
                return null;
            });
            if (errorToast) {
                console.log(`    ⚠️ Toast error: ${errorToast}`);
            }

            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);

            // ============ UPDATE ============
            console.log('\n  [UPDATE]');
            apiResponse = { method: null, status: null };

            const editClicked = await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    if (btn.textContent.includes('✏️') || btn.title?.includes('Editar')) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            });

            if (editClicked) {
                console.log('    ✓ Modal editar abierto');
                await page.waitForTimeout(1500);

                await page.evaluate((ts) => {
                    const inputs = document.querySelectorAll('input[type="text"]');
                    for (const input of inputs) {
                        if (!input.offsetParent || input.disabled || input.readOnly) continue;
                        if (input.closest('#loginForm')) continue;
                        input.value = 'UPD_' + ts;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        break;
                    }
                }, ts);

                await page.evaluate((saveText) => {
                    const btns = document.querySelectorAll('button');
                    for (const btn of btns) {
                        if (!btn.offsetParent) continue;
                        const t = btn.textContent.toLowerCase();
                        if (t.includes(saveText.toLowerCase()) || t.includes('guardar')) {
                            btn.click();
                            return;
                        }
                    }
                }, tab.saveEdit);

                await page.waitForTimeout(4000);
                results[tabKey].update = apiResponse.method === 'PUT' && apiResponse.status === 200;
                console.log(results[tabKey].update ? '    ✅ UPDATE OK' : '    ⚠️ UPDATE sin confirmación API');

                await page.keyboard.press('Escape');
                await page.waitForTimeout(1000);
            } else {
                console.log('    ⚠️ No hay registros para editar');
            }

            // ============ DELETE ============
            console.log('\n  [DELETE]');
            apiResponse = { method: null, status: null };
            const countBeforeDelete = await count(tab.table);

            const dialogHandler = async dialog => {
                try { await dialog.accept(); } catch {}
            };
            page.on('dialog', dialogHandler);

            const deleteClicked = await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    if (btn.textContent.includes('🗑️') ||
                        btn.className.includes('danger') ||
                        btn.title?.includes('Eliminar')) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            });

            if (deleteClicked) {
                console.log('    ✓ Click eliminar');
                await page.waitForTimeout(3000);

                const countAfterDelete = await count(tab.table);
                results[tabKey].delete = countAfterDelete < countBeforeDelete ||
                    (apiResponse.method === 'DELETE' && apiResponse.status >= 200);

                console.log(`    BD: ${countBeforeDelete} → ${countAfterDelete}`);
                console.log(results[tabKey].delete ? '    ✅ DELETE OK' : '    ⚠️ DELETE pendiente');
            } else {
                console.log('    ⚠️ No hay registros para eliminar');
            }

            page.removeListener('dialog', dialogHandler);
            await page.screenshot({ path: `debug-org-v3-${tabKey}-final.png` });
        }

    } catch (error) {
        console.log('\nERROR:', error.message);
        await page.screenshot({ path: 'debug-org-v3-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN
    console.log('\n\n' + '='.repeat(90));
    console.log('RESUMEN - ESTRUCTURA ORGANIZACIONAL');
    console.log('='.repeat(90));
    console.log('\nTab'.padEnd(15) + 'CREATE'.padEnd(10) + 'UPDATE'.padEnd(10) + 'DELETE'.padEnd(10) + 'TOTAL');
    console.log('-'.repeat(55));

    let total = 0, passed = 0;
    for (const [key, tab] of Object.entries(TABS)) {
        const r = results[key];
        const c = r.create ? '✅' : '❌';
        const u = r.update ? '✅' : '❌';
        const d = r.delete ? '✅' : '❌';
        const p = [r.create, r.update, r.delete].filter(Boolean).length;
        total += 3;
        passed += p;
        console.log(`${tab.name.padEnd(15)}${c.padEnd(10)}${u.padEnd(10)}${d.padEnd(10)}${p}/3`);
    }

    console.log('-'.repeat(55));
    console.log(`TOTAL: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    console.log('\nNota: Turnos es READ-ONLY (sin CRUD en este módulo)');

    if (passed === total) {
        console.log('\n🎉 ESTRUCTURA ORGANIZACIONAL 100% COMPLETO 🎉');
    }
    console.log('='.repeat(90));
})();
