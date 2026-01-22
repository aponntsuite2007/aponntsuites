/**
 * TEST COMPLETO - MÓDULO GESTIÓN DE KIOSCOS
 * Verifica: Dependencias, SSOT, CRUD, Multi-tenant, E2E Usuario
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:9998';
const COMPANY_ID = 11; // ISI

(async () => {
    console.log('═'.repeat(80));
    console.log('TEST COMPLETO - MÓDULO GESTIÓN DE KIOSCOS');
    console.log('═'.repeat(80));

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const results = {
        dependencias: { companies: false, users: false, departments: false, attendance: false, branches: false },
        ssot: { moduleRegistry: false, companyModules: false },
        crud: { create: false, read: false, update: false, delete: false },
        multiTenant: { isolation: false, filtering: false },
        e2e: { login: false, navegacion: false, tabla: false, filtros: false, modal: false }
    };

    let authToken = '';
    let testKioskId = null;

    try {
        // =========================================================================
        // 1. LOGIN
        // =========================================================================
        console.log('\n▶ 1. LOGIN');
        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForSelector('#companySelect', { timeout: 15000 });
        await page.selectOption('#companySelect', 'isi');
        await page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
        await page.fill('#userInput', 'admin');
        await page.fill('#passwordInput', 'admin123');
        await page.click('#loginButton');
        await page.waitForTimeout(5000);

        authToken = await page.evaluate(() => localStorage.getItem('authToken'));
        results.e2e.login = !!authToken;
        console.log('   Login:', authToken ? '✅' : '❌');

        // =========================================================================
        // 2. VERIFICAR DEPENDENCIAS (API)
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ 2. VERIFICACIÓN DE DEPENDENCIAS');
        console.log('═'.repeat(60));

        const depsResult = await page.evaluate(async () => {
            const token = localStorage.getItem('authToken');
            const headers = { 'Authorization': `Bearer ${token}` };

            const tests = {};

            // Test 1: Companies dependency
            try {
                const r1 = await fetch('/api/v1/companies/current', { headers });
                tests.companies = { status: r1.status, ok: r1.status === 200 };
            } catch (e) {
                tests.companies = { status: 0, ok: false, error: e.message };
            }

            // Test 2: Users dependency (kiosks need users for attendance)
            try {
                const r2 = await fetch('/api/v1/users?limit=1', { headers });
                tests.users = { status: r2.status, ok: r2.status === 200 };
            } catch (e) {
                tests.users = { status: 0, ok: false, error: e.message };
            }

            // Test 3: Departments dependency
            try {
                const r3 = await fetch('/api/v1/departments', { headers });
                tests.departments = { status: r3.status, ok: r3.status === 200 };
            } catch (e) {
                tests.departments = { status: 0, ok: false, error: e.message };
            }

            // Test 4: Attendance dependency (kiosks register attendance)
            try {
                const r4 = await fetch('/api/v1/attendance?limit=1', { headers });
                tests.attendance = { status: r4.status, ok: r4.status === 200 };
            } catch (e) {
                tests.attendance = { status: 0, ok: false, error: e.message };
            }

            // Test 5: Branches dependency
            try {
                const r5 = await fetch('/api/v1/branches', { headers });
                tests.branches = { status: r5.status, ok: r5.status === 200 };
            } catch (e) {
                tests.branches = { status: 0, ok: false, error: e.message };
            }

            return tests;
        });

        results.dependencias.companies = depsResult.companies?.ok || false;
        results.dependencias.users = depsResult.users?.ok || false;
        results.dependencias.departments = depsResult.departments?.ok || false;
        results.dependencias.attendance = depsResult.attendance?.ok || false;
        results.dependencias.branches = depsResult.branches?.ok || false;

        console.log('   Companies API:', depsResult.companies?.ok ? '✅' : '❌', `(${depsResult.companies?.status})`);
        console.log('   Users API:', depsResult.users?.ok ? '✅' : '❌', `(${depsResult.users?.status})`);
        console.log('   Departments API:', depsResult.departments?.ok ? '✅' : '❌', `(${depsResult.departments?.status})`);
        console.log('   Attendance API:', depsResult.attendance?.ok ? '✅' : '❌', `(${depsResult.attendance?.status})`);
        console.log('   Branches API:', depsResult.branches?.ok ? '✅' : '❌', `(${depsResult.branches?.status})`);

        // =========================================================================
        // 3. VERIFICAR SSOT (Single Source of Truth)
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ 3. VERIFICACIÓN SSOT');
        console.log('═'.repeat(60));

        const ssotResult = await page.evaluate(async () => {
            const token = localStorage.getItem('authToken');
            const headers = { 'Authorization': `Bearer ${token}` };

            const tests = {};

            // Test 1: Module Registry (auditor)
            try {
                const r1 = await fetch('/api/audit/registry', { headers });
                if (r1.status === 200) {
                    const data = await r1.json();
                    const hasKiosks = data.modules?.kiosks || data.kiosks;
                    tests.moduleRegistry = { ok: !!hasKiosks, found: !!hasKiosks };
                } else {
                    tests.moduleRegistry = { ok: false, status: r1.status };
                }
            } catch (e) {
                tests.moduleRegistry = { ok: false, error: e.message };
            }

            // Test 2: Company Modules (contracted modules)
            try {
                const r2 = await fetch('/api/modules/active?panel=company&role=admin', { headers });
                if (r2.status === 200) {
                    const data = await r2.json();
                    const modules = data.modules || data;
                    const hasKiosks = Array.isArray(modules)
                        ? modules.some(m => m.key === 'kiosks' || m.module_key === 'kiosks')
                        : false;
                    tests.companyModules = { ok: true, hasKiosks, count: modules.length };
                } else {
                    tests.companyModules = { ok: false, status: r2.status };
                }
            } catch (e) {
                tests.companyModules = { ok: false, error: e.message };
            }

            return tests;
        });

        results.ssot.moduleRegistry = ssotResult.moduleRegistry?.found || false;
        results.ssot.companyModules = ssotResult.companyModules?.ok || false;

        console.log('   Module Registry:', ssotResult.moduleRegistry?.found ? '✅ Kiosks registrado' : '❌');
        console.log('   Company Modules:', ssotResult.companyModules?.ok ? `✅ ${ssotResult.companyModules?.count} módulos` : '❌');
        console.log('   Kiosks contratado:', ssotResult.companyModules?.hasKiosks ? '✅' : '⚠️ No contratado');

        // =========================================================================
        // 4. CRUD COMPLETO - KIOSKS API
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ 4. CRUD COMPLETO - API');
        console.log('═'.repeat(60));

        // 4.1 READ - Listar kioscos
        console.log('\n   4.1 READ - Listar kioscos');
        const readResult = await page.evaluate(async () => {
            const token = localStorage.getItem('authToken');
            const r = await fetch('/api/v1/kiosks', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await r.json();
            return {
                status: r.status,
                count: Array.isArray(data) ? data.length : (data.data?.length || 0),
                sample: Array.isArray(data) ? data[0] : data.data?.[0]
            };
        });

        results.crud.read = readResult.status === 200;
        console.log('       Status:', readResult.status === 200 ? '✅' : '❌', `(${readResult.status})`);
        console.log('       Kioscos encontrados:', readResult.count);
        if (readResult.sample) {
            console.log('       Sample:', readResult.sample.name, '- ID:', readResult.sample.id);
        }

        // 4.2 CREATE - Crear kiosko de prueba
        console.log('\n   4.2 CREATE - Crear kiosko de prueba');
        const timestamp = Date.now().toString().slice(-6);
        const createResult = await page.evaluate(async (ts) => {
            const token = localStorage.getItem('authToken');
            const newKiosk = {
                name: `TEST_KIOSK_${ts}`,
                description: 'Kiosk de prueba creado por test automatizado',
                location: 'Sala de pruebas',
                gps_lat: -33.4569,
                gps_lng: -70.6483,
                is_active: true
            };

            const r = await fetch('/api/v1/kiosks', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newKiosk)
            });

            let data;
            try {
                data = await r.json();
            } catch (e) {
                data = { error: 'No JSON response' };
            }

            return {
                status: r.status,
                success: r.status === 201 || r.status === 200,
                id: data.id || data.data?.id,
                name: data.name || data.data?.name,
                error: data.error || data.message
            };
        }, timestamp);

        results.crud.create = createResult.success;
        testKioskId = createResult.id;
        console.log('       Status:', createResult.success ? '✅' : '❌', `(${createResult.status})`);
        if (createResult.success) {
            console.log('       ID creado:', createResult.id);
            console.log('       Nombre:', createResult.name);
        } else {
            console.log('       Error:', createResult.error);
        }

        // 4.3 UPDATE - Actualizar kiosko
        if (testKioskId) {
            console.log('\n   4.3 UPDATE - Actualizar kiosko');
            const updateResult = await page.evaluate(async (id, ts) => {
                const token = localStorage.getItem('authToken');
                const updateData = {
                    name: `TEST_KIOSK_UPDATED_${ts}`,
                    description: 'Descripción actualizada por test',
                    location: 'Sala de pruebas - Actualizado'
                };

                const r = await fetch(`/api/v1/kiosks/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });

                let data;
                try {
                    data = await r.json();
                } catch (e) {
                    data = { error: 'No JSON response' };
                }

                return {
                    status: r.status,
                    success: r.status === 200,
                    name: data.name || data.data?.name,
                    error: data.error || data.message
                };
            }, testKioskId, timestamp);

            results.crud.update = updateResult.success;
            console.log('       Status:', updateResult.success ? '✅' : '❌', `(${updateResult.status})`);
            if (updateResult.success) {
                console.log('       Nuevo nombre:', updateResult.name);
            } else {
                console.log('       Error:', updateResult.error);
            }
        }

        // 4.4 DELETE - Eliminar kiosko (soft delete)
        if (testKioskId) {
            console.log('\n   4.4 DELETE - Eliminar kiosko (soft delete)');
            const deleteResult = await page.evaluate(async (id) => {
                const token = localStorage.getItem('authToken');

                const r = await fetch(`/api/v1/kiosks/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                let data;
                try {
                    data = await r.json();
                } catch (e) {
                    data = {};
                }

                return {
                    status: r.status,
                    success: r.status === 200 || r.status === 204,
                    message: data.message || data.error
                };
            }, testKioskId);

            results.crud.delete = deleteResult.success;
            console.log('       Status:', deleteResult.success ? '✅' : '❌', `(${deleteResult.status})`);
            if (deleteResult.message) {
                console.log('       Mensaje:', deleteResult.message);
            }
        }

        // =========================================================================
        // 5. MULTI-TENANT VERIFICATION
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ 5. VERIFICACIÓN MULTI-TENANT');
        console.log('═'.repeat(60));

        const mtResult = await page.evaluate(async (companyId) => {
            const token = localStorage.getItem('authToken');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Get all kiosks and check company_id
            const r = await fetch('/api/v1/kiosks', { headers });
            const data = await r.json();
            const kiosks = Array.isArray(data) ? data : (data.data || []);

            // Check isolation - all kiosks should belong to user's company
            const allSameCompany = kiosks.every(k =>
                k.company_id === companyId || k.companyId === companyId
            );

            // Check that we can't access other company's kiosks
            const companyIds = [...new Set(kiosks.map(k => k.company_id || k.companyId))];

            return {
                total: kiosks.length,
                allSameCompany,
                companyIds,
                isolation: companyIds.length <= 1
            };
        }, COMPANY_ID);

        results.multiTenant.isolation = mtResult.isolation;
        results.multiTenant.filtering = mtResult.allSameCompany;

        console.log('   Total kiosks:', mtResult.total);
        console.log('   Company IDs encontrados:', mtResult.companyIds.join(', ') || 'ninguno');
        console.log('   Aislamiento multi-tenant:', mtResult.isolation ? '✅' : '❌');
        console.log('   Filtrado por empresa:', mtResult.allSameCompany ? '✅' : '❌');

        // =========================================================================
        // 6. TEST E2E - EXPERIENCIA DE USUARIO
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ 6. TEST E2E - EXPERIENCIA DE USUARIO');
        console.log('═'.repeat(60));

        // Navegar al módulo de kioscos
        console.log('\n   6.1 Navegación al módulo');
        try {
            await page.locator('text=Gestión de Kioscos').first().click();
            results.e2e.navegacion = true;
            console.log('       ✅ Click en "Gestión de Kioscos"');
        } catch (e) {
            // Intentar alternativas
            try {
                await page.locator('text=Kioscos').first().click();
                results.e2e.navegacion = true;
                console.log('       ✅ Click en "Kioscos"');
            } catch (e2) {
                console.log('       ❌ No se encontró el módulo en el menú');
            }
        }

        await page.waitForTimeout(4000);
        await page.screenshot({ path: 'debug-kiosks-module.png' });
        console.log('       📸 Screenshot: debug-kiosks-module.png');

        // Verificar tabla
        console.log('\n   6.2 Verificar tabla de datos');
        const tableInfo = await page.evaluate(() => {
            const tables = document.querySelectorAll('table');
            const rows = document.querySelectorAll('tbody tr');
            const cards = document.querySelectorAll('.card, .kiosk-card, [class*="kiosk"]');

            return {
                tables: tables.length,
                rows: rows.length,
                cards: cards.length
            };
        });

        results.e2e.tabla = tableInfo.tables > 0 || tableInfo.rows > 0 || tableInfo.cards > 0;
        console.log('       Tablas:', tableInfo.tables);
        console.log('       Filas:', tableInfo.rows);
        console.log('       Cards:', tableInfo.cards);

        // Verificar filtros
        console.log('\n   6.3 Verificar filtros');
        const filterInfo = await page.evaluate(() => {
            return {
                selects: document.querySelectorAll('select').length,
                inputs: document.querySelectorAll('input[type="text"], input[type="search"]').length,
                buttons: document.querySelectorAll('button').length
            };
        });

        results.e2e.filtros = filterInfo.selects > 0 || filterInfo.inputs > 0;
        console.log('       Selects:', filterInfo.selects);
        console.log('       Inputs:', filterInfo.inputs);
        console.log('       Buttons:', filterInfo.buttons);

        // Verificar modal de crear/editar
        console.log('\n   6.4 Verificar modal de creación');
        const modalInfo = await page.evaluate(() => {
            // Buscar botón de crear
            const createButtons = document.querySelectorAll('button');
            let createBtn = null;
            for (const btn of createButtons) {
                const text = btn.textContent.toLowerCase();
                if (text.includes('nuevo') || text.includes('crear') || text.includes('agregar') || text.includes('+')) {
                    createBtn = btn;
                    break;
                }
            }

            return {
                hasCreateButton: !!createBtn,
                buttonText: createBtn?.textContent?.trim()
            };
        });

        if (modalInfo.hasCreateButton) {
            console.log('       Botón crear:', '✅', modalInfo.buttonText);

            // Intentar abrir modal
            try {
                const btnText = modalInfo.buttonText;
                await page.locator(`button:has-text("${btnText}")`).first().click();
                await page.waitForTimeout(1500);

                const modalVisible = await page.evaluate(() => {
                    const modals = document.querySelectorAll('.modal, [class*="modal"], [role="dialog"]');
                    for (const modal of modals) {
                        if (modal.offsetParent !== null || getComputedStyle(modal).display !== 'none') {
                            return true;
                        }
                    }
                    return false;
                });

                results.e2e.modal = modalVisible;
                console.log('       Modal visible:', modalVisible ? '✅' : '❌');

                await page.screenshot({ path: 'debug-kiosks-modal.png' });

                // Cerrar modal
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);
            } catch (e) {
                console.log('       ⚠️ No se pudo abrir el modal:', e.message);
            }
        } else {
            console.log('       ⚠️ No se encontró botón de crear');
        }

        // Screenshot final
        await page.screenshot({ path: 'debug-kiosks-final.png' });

    } catch (error) {
        console.log('\n❌ ERROR GENERAL:', error.message);
        await page.screenshot({ path: 'debug-kiosks-error.png' });
    }

    await browser.close();

    // =========================================================================
    // RESUMEN FINAL
    // =========================================================================
    console.log('\n' + '═'.repeat(80));
    console.log('RESUMEN FINAL - MÓDULO GESTIÓN DE KIOSCOS');
    console.log('═'.repeat(80));

    // Dependencias
    const depsPass = Object.values(results.dependencias).filter(Boolean).length;
    const depsTotal = Object.keys(results.dependencias).length;
    console.log(`\n📦 DEPENDENCIAS: ${depsPass}/${depsTotal}`);
    Object.entries(results.dependencias).forEach(([k, v]) => {
        console.log(`   ${k}: ${v ? '✅' : '❌'}`);
    });

    // SSOT
    const ssotPass = Object.values(results.ssot).filter(Boolean).length;
    const ssotTotal = Object.keys(results.ssot).length;
    console.log(`\n🎯 SSOT: ${ssotPass}/${ssotTotal}`);
    Object.entries(results.ssot).forEach(([k, v]) => {
        console.log(`   ${k}: ${v ? '✅' : '❌'}`);
    });

    // CRUD
    const crudPass = Object.values(results.crud).filter(Boolean).length;
    const crudTotal = Object.keys(results.crud).length;
    console.log(`\n🔧 CRUD: ${crudPass}/${crudTotal}`);
    Object.entries(results.crud).forEach(([k, v]) => {
        console.log(`   ${k}: ${v ? '✅' : '❌'}`);
    });

    // Multi-tenant
    const mtPass = Object.values(results.multiTenant).filter(Boolean).length;
    const mtTotal = Object.keys(results.multiTenant).length;
    console.log(`\n🏢 MULTI-TENANT: ${mtPass}/${mtTotal}`);
    Object.entries(results.multiTenant).forEach(([k, v]) => {
        console.log(`   ${k}: ${v ? '✅' : '❌'}`);
    });

    // E2E
    const e2ePass = Object.values(results.e2e).filter(Boolean).length;
    const e2eTotal = Object.keys(results.e2e).length;
    console.log(`\n👤 E2E USUARIO: ${e2ePass}/${e2eTotal}`);
    Object.entries(results.e2e).forEach(([k, v]) => {
        console.log(`   ${k}: ${v ? '✅' : '❌'}`);
    });

    // TOTAL
    const totalPass = depsPass + ssotPass + crudPass + mtPass + e2ePass;
    const totalTests = depsTotal + ssotTotal + crudTotal + mtTotal + e2eTotal;
    const pct = Math.round(totalPass / totalTests * 100);

    console.log('\n' + '═'.repeat(80));
    if (pct >= 80) {
        console.log(`✅ RESULTADO TOTAL: ${totalPass}/${totalTests} (${pct}%) - LISTO PARA PRODUCCIÓN`);
    } else if (pct >= 60) {
        console.log(`⚠️ RESULTADO TOTAL: ${totalPass}/${totalTests} (${pct}%) - FUNCIONAL CON OBSERVACIONES`);
    } else {
        console.log(`❌ RESULTADO TOTAL: ${totalPass}/${totalTests} (${pct}%) - NECESITA TRABAJO`);
    }
    console.log('═'.repeat(80));
})();
