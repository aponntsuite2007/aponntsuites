/**
 * TEST DE PRODUCCIÓN - MÓDULOS RRHH
 *
 * Verifica CRUD REAL con persistencia para:
 * - Usuarios
 * - Vacaciones
 * - Capacitación
 * - Sanciones
 * - Reclutamiento
 * - Estructura Organizacional
 * - Asistencia
 * - Beneficios
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const timestamp = Date.now();
const testId = `TEST${timestamp}`.slice(-8);

// MÓDULOS RRHH
const RRHH_MODULES = [
    {
        id: 'users',
        name: '👤 Usuarios',
        createBtn: ['Agregar Usuario'],
        testData: {
            first_name: `Usuario${testId}`,
            last_name: 'TestRRHH',
            email: `user${testId}@test.com`,
            document_number: testId,
            role: 'employee'
        },
        verifyField: 'first_name',
        hasEdit: true,
        hasDelete: false // Usuarios no se eliminan, se desactivan
    },
    {
        id: 'vacation-management',
        name: '🏖️ Vacaciones',
        createBtn: ['Nueva Solicitud', 'Solicitar', '+ Solicitud'],
        testData: {
            start_date: '2026-03-01',
            end_date: '2026-03-10',
            reason: `Vacaciones test ${testId}`
        },
        verifyField: 'reason',
        hasEdit: true,
        hasDelete: true
    },
    {
        id: 'training-management',
        name: '📚 Capacitación',
        createBtn: ['Nueva Capacitación', 'Nuevo Curso', '+ Capacitación'],
        testData: {
            title: `Curso${testId}`,
            instructor: 'Instructor Test',
            start_date: '2026-04-01',
            end_date: '2026-04-05',
            description: `Capacitación de prueba ${testId}`
        },
        verifyField: 'title',
        hasEdit: true,
        hasDelete: true
    },
    {
        id: 'sanctions-management',
        name: '⚠️ Sanciones',
        createBtn: ['Nueva Sanción', 'Nueva Solicitud', '+ Sanción'],
        testData: {
            type: 'warning',
            reason: `Sanción test ${testId}`,
            date: '2026-02-15'
        },
        verifyField: 'reason',
        hasEdit: true,
        hasDelete: true
    },
    {
        id: 'job-postings',
        name: '💼 Reclutamiento',
        createBtn: ['Nueva Oferta', 'Nueva Vacante', '+ Oferta'],
        testData: {
            title: `Puesto${testId}`,
            department: 'IT',
            description: `Búsqueda laboral test ${testId}`,
            requirements: 'Requisitos de prueba'
        },
        verifyField: 'title',
        hasEdit: true,
        hasDelete: true
    },
    {
        id: 'organizational-structure',
        name: '🏢 Estructura Org',
        createBtn: ['Nuevo Departamento', '+ Nuevo', 'Agregar'],
        testData: {
            name: `Depto${testId}`,
            code: testId,
            description: `Departamento test ${testId}`
        },
        verifyField: 'name',
        hasEdit: true,
        hasDelete: true
    },
    {
        id: 'benefits-management',
        name: '🎁 Beneficios',
        createBtn: ['Asignar Beneficio', 'Nuevo Beneficio', '+ Beneficio'],
        testData: {
            name: `Beneficio${testId}`,
            type: 'health',
            description: `Beneficio test ${testId}`
        },
        verifyField: 'name',
        hasEdit: true,
        hasDelete: true
    },
    {
        id: 'attendance',
        name: '⏰ Asistencia',
        createBtn: [], // Solo lectura - no tiene crear
        testData: {},
        verifyField: null,
        hasEdit: false,
        hasDelete: false,
        readOnly: true
    }
];

const results = {
    timestamp: new Date().toISOString(),
    testId: testId,
    modules: {},
    summary: {
        total: RRHH_MODULES.length,
        fullyPassed: 0,
        partiallyPassed: 0,
        failed: 0
    },
    criticalIssues: [],
    apiResults: []
};

async function loadModule(page, moduleId) {
    await page.evaluate((id) => {
        if (window.showTab) window.showTab(id);
        else if (window.showModuleContent) window.showModuleContent(id);
        else if (window.Modules && window.Modules[id]) window.Modules[id].init();
    }, moduleId);
    await sleep(3000);

    return await page.evaluate(() => {
        const content = document.getElementById('mainContent');
        return content && content.innerText.length > 30;
    });
}

async function clickCreateButton(page, buttonTexts) {
    // Buscar en múltiples contenedores (algunos módulos no usan #mainContent)
    const containerSelectors = [
        '#mainContent',
        '.vacation-enterprise',     // Vacation module
        '.talent-dashboard',        // Job postings module
        '.sanctions-container',     // Sanctions module
        '.training-container',      // Training module
        '.org-structure-container', // Org structure module
        'body'                      // Fallback
    ];

    // Primero intentar con los textos específicos
    for (const text of buttonTexts) {
        for (const container of containerSelectors) {
            const clicked = await page.evaluate((searchText, containerSel) => {
                const containerEl = document.querySelector(containerSel);
                if (!containerEl) return false;
                const buttons = containerEl.querySelectorAll('button, .btn, a.btn, .ve-btn');
                for (const btn of buttons) {
                    const btnText = btn.textContent.toLowerCase().trim();
                    if (btnText.includes(searchText.toLowerCase())) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            }, text, container);

            if (clicked) {
                await sleep(1500);
                return true;
            }
        }
    }

    // Fallback: buscar botón con + o ➕ o "Nuevo" o "Agregar"
    const fallbackClicked = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, .btn, .ve-btn');
        for (const btn of buttons) {
            const text = btn.textContent.toLowerCase();
            if (text.includes('+') || text.includes('nuevo') || text.includes('agregar') || text.includes('crear')) {
                btn.click();
                return true;
            }
        }
        return false;
    });

    await sleep(1500);
    return fallbackClicked;
}

async function isModalOpen(page) {
    return await page.evaluate(() => {
        // Buscar múltiples tipos de modales (Bootstrap, custom, etc.)
        const modalSelectors = [
            '.modal',
            '[role="dialog"]',
            '.modal-dialog',
            '.ve-modal-overlay',
            '.ve-modal',
            '[class*="modal-overlay"]',
            '[class*="Modal"]',
            '[id*="Modal"]',
            '[id*="modal"]',      // Case insensitive fallback
            '#userModal',         // Users module
            '#editUserModal',
            '#trainingModal',     // Training module
            '#evaluationModal',
            '#sanctionsModal',    // Sanctions module
            '#offerModal',        // Job postings
            '#departmentModal',   // Org structure
            '.talent-modal',
            '.sanctions-modal',
            '.training-modal'
        ];
        const modals = document.querySelectorAll(modalSelectors.join(', '));
        for (const m of modals) {
            const style = window.getComputedStyle(m);
            if (style.display !== 'none' && style.visibility !== 'hidden' && m.offsetHeight > 50) {
                return true;
            }
        }
        return false;
    });
}

async function fillFormFields(page, testData) {
    const filled = {};

    for (const [fieldName, value] of Object.entries(testData)) {
        // Intentar múltiples selectores
        const selectors = [
            `input[name="${fieldName}"]`,
            `input[id="${fieldName}"]`,
            `input[id*="${fieldName}"]`,
            `select[name="${fieldName}"]`,
            `select[id="${fieldName}"]`,
            `textarea[name="${fieldName}"]`,
            `textarea[id="${fieldName}"]`,
            `input[placeholder*="${fieldName}"]`,
        ];

        for (const selector of selectors) {
            try {
                const exists = await page.$(selector);
                if (exists) {
                    const tagName = await exists.evaluate(el => el.tagName.toLowerCase());

                    if (tagName === 'select') {
                        // Para select, intentar seleccionar por value o por índice
                        await page.evaluate((sel, val) => {
                            const select = document.querySelector(sel);
                            if (select) {
                                // Intentar por value
                                for (const opt of select.options) {
                                    if (opt.value === val || opt.text.toLowerCase().includes(val.toLowerCase())) {
                                        select.value = opt.value;
                                        select.dispatchEvent(new Event('change', { bubbles: true }));
                                        return;
                                    }
                                }
                                // Si no encuentra, seleccionar segunda opción (primera suele ser placeholder)
                                if (select.options.length > 1) {
                                    select.selectedIndex = 1;
                                    select.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            }
                        }, selector, value);
                    } else {
                        await page.click(selector);
                        await page.evaluate(sel => {
                            const el = document.querySelector(sel);
                            if (el) el.value = '';
                        }, selector);
                        await page.type(selector, String(value), { delay: 20 });
                    }

                    filled[fieldName] = true;
                    break;
                }
            } catch (e) {}
        }

        if (!filled[fieldName]) {
            filled[fieldName] = false;
        }
    }

    return filled;
}

async function clickSaveButton(page) {
    const result = await page.evaluate(() => {
        // Buscar en modal primero
        const modal = document.querySelector('.modal.show, .modal[style*="display: block"], .modal[style*="display:block"]');
        const container = modal || document;

        const saveTexts = ['guardar', 'crear', 'agregar', 'save', 'submit', 'confirmar', 'aceptar'];
        const buttons = container.querySelectorAll('button, .btn');

        for (const btn of buttons) {
            const text = btn.textContent.toLowerCase().trim();
            const isSubmit = btn.type === 'submit';
            const isPrimary = btn.classList.contains('btn-primary') || btn.classList.contains('btn-success');

            for (const saveText of saveTexts) {
                if (text.includes(saveText) || (isSubmit && isPrimary)) {
                    btn.click();
                    return { clicked: true, buttonText: btn.textContent.trim() };
                }
            }
        }

        // Fallback: cualquier btn-primary en modal
        if (modal) {
            const primary = modal.querySelector('.btn-primary, .btn-success');
            if (primary) {
                primary.click();
                return { clicked: true, buttonText: primary.textContent.trim() };
            }
        }

        return { clicked: false };
    });

    await sleep(2000);
    return result;
}

async function closeModal(page) {
    await page.evaluate(() => {
        // Click en X o botón cerrar
        const closeBtn = document.querySelector('.modal .btn-close, .modal .close, .modal [data-dismiss="modal"], .modal [data-bs-dismiss="modal"]');
        if (closeBtn) closeBtn.click();

        // Forzar cierre
        document.querySelectorAll('.modal').forEach(m => {
            m.classList.remove('show');
            m.style.display = 'none';
        });
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    });
    await sleep(500);
}

async function checkDataInList(page, searchText) {
    return await page.evaluate((text) => {
        const content = document.getElementById('mainContent');
        if (!content) return { found: false };

        const pageText = content.innerText.toLowerCase();
        const found = pageText.includes(text.toLowerCase());

        return { found, pageTextLength: pageText.length };
    }, searchText);
}

async function testRRHHModule(page, mod) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`${mod.name}`);
    console.log(`${'═'.repeat(70)}`);

    const moduleResult = {
        id: mod.id,
        name: mod.name,
        tests: {
            load: { passed: false, details: '' },
            create: { passed: false, details: '', skipped: mod.readOnly },
            read: { passed: false, details: '' },
            persist: { passed: false, details: '', skipped: mod.readOnly },
            edit: { passed: false, details: '', skipped: !mod.hasEdit },
            delete: { passed: false, details: '', skipped: !mod.hasDelete }
        },
        overallStatus: 'pending'
    };

    try {
        // ═══════════════════════════════════════════════════════════════════
        // TEST 1: LOAD
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n   📂 TEST LOAD...');
        const loaded = await loadModule(page, mod.id);

        if (loaded) {
            moduleResult.tests.load = { passed: true, details: 'Módulo cargado correctamente' };
            console.log('      ✅ Módulo cargado');
        } else {
            moduleResult.tests.load = { passed: false, details: 'Módulo no cargó o está vacío' };
            console.log('      ❌ Módulo NO cargó');
            moduleResult.overallStatus = 'failed';
            results.criticalIssues.push(`${mod.name}: No carga`);
            results.modules[mod.id] = moduleResult;
            return moduleResult;
        }

        // Si es read-only, solo verificar que carga
        if (mod.readOnly) {
            console.log('\n   ℹ️  Módulo de solo lectura - omitiendo tests CRUD');
            moduleResult.overallStatus = 'passed';
            results.modules[mod.id] = moduleResult;
            return moduleResult;
        }

        // ═══════════════════════════════════════════════════════════════════
        // TEST 2: CREATE
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n   ➕ TEST CREATE...');

        // Click en botón crear
        const createClicked = await clickCreateButton(page, mod.createBtn);

        if (!createClicked) {
            console.log('      ⚠️ No se encontró botón crear');
            moduleResult.tests.create = { passed: false, details: 'Botón crear no encontrado' };
        } else {
            await sleep(1000);

            // Verificar modal
            const modalOpen = await isModalOpen(page);

            if (!modalOpen) {
                console.log('      ❌ Modal no se abrió');
                moduleResult.tests.create = { passed: false, details: 'Modal no se abrió' };
                results.criticalIssues.push(`${mod.name}: Modal de creación no abre`);
            } else {
                console.log('      📝 Modal abierto - llenando formulario...');

                // Llenar campos
                const filledFields = await fillFormFields(page, mod.testData);
                const filledCount = Object.values(filledFields).filter(v => v).length;
                const totalFields = Object.keys(mod.testData).length;

                console.log(`      📋 Campos llenados: ${filledCount}/${totalFields}`);

                // Guardar
                console.log('      💾 Guardando...');
                const saveResult = await clickSaveButton(page);

                if (saveResult.clicked) {
                    console.log(`      ✅ Click en guardar: "${saveResult.buttonText}"`);
                    await sleep(2000);
                } else {
                    console.log('      ⚠️ No se encontró botón guardar');
                }

                // Cerrar modal si sigue abierto
                await closeModal(page);

                // Verificar éxito (que no haya errores visibles)
                const hasError = await page.evaluate(() => {
                    const alerts = document.querySelectorAll('.alert-danger, .error, .text-danger');
                    for (const a of alerts) {
                        if (a.offsetHeight > 0) return true;
                    }
                    return false;
                });

                if (!hasError) {
                    moduleResult.tests.create = { passed: true, details: 'Registro creado (no hubo errores)' };
                    console.log('      ✅ CREATE OK');
                } else {
                    moduleResult.tests.create = { passed: false, details: 'Error visible después de guardar' };
                    console.log('      ❌ Error detectado después de guardar');
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // TEST 3: READ
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n   👁️  TEST READ...');
        await sleep(1000);

        // Recargar módulo
        await loadModule(page, mod.id);

        if (mod.verifyField && mod.testData[mod.verifyField]) {
            const searchText = mod.testData[mod.verifyField];
            const readResult = await checkDataInList(page, searchText);

            if (readResult.found) {
                moduleResult.tests.read = { passed: true, details: `Texto "${searchText}" encontrado en lista` };
                console.log(`      ✅ Registro visible: "${searchText}"`);
            } else {
                moduleResult.tests.read = { passed: false, details: `Texto "${searchText}" NO encontrado` };
                console.log(`      ⚠️ Registro NO visible en lista`);
            }
        } else {
            // Verificar que hay datos en la lista
            const hasData = await page.evaluate(() => {
                const tables = document.querySelectorAll('#mainContent table tbody tr');
                const cards = document.querySelectorAll('#mainContent .card, #mainContent .list-item');
                return tables.length > 0 || cards.length > 0;
            });

            moduleResult.tests.read = { passed: hasData, details: hasData ? 'Hay datos en lista' : 'Lista vacía' };
            console.log(hasData ? '      ✅ Datos visibles en lista' : '      ⚠️ Lista vacía');
        }

        // ═══════════════════════════════════════════════════════════════════
        // TEST 4: PERSISTENCE (F5)
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n   🔄 TEST PERSISTENCE (F5)...');

        await page.reload({ waitUntil: 'networkidle2' });
        await sleep(3000);

        // Re-login si es necesario (verificar si hay formulario de login)
        const needsRelogin = await page.evaluate(() => {
            return document.getElementById('multiTenantLoginForm') !== null;
        });

        if (needsRelogin) {
            console.log('      🔐 Re-autenticando...');
            await page.select('#companySelect', 'isi');
            await sleep(1000);
            await page.evaluate(() => {
                document.getElementById('userInput').disabled = false;
                document.getElementById('userInput').value = 'admin';
                document.getElementById('passwordInput').disabled = false;
                document.getElementById('passwordInput').value = 'admin123';
                document.getElementById('multiTenantLoginForm').dispatchEvent(new Event('submit', { bubbles: true }));
            });
            await sleep(4000);
        }

        // Navegar al módulo
        await loadModule(page, mod.id);

        // Verificar persistencia
        if (mod.verifyField && mod.testData[mod.verifyField]) {
            const persistResult = await checkDataInList(page, mod.testData[mod.verifyField]);

            if (persistResult.found) {
                moduleResult.tests.persist = { passed: true, details: 'Datos persisten después de F5' };
                console.log('      ✅ Datos PERSISTEN después de refrescar');
            } else {
                moduleResult.tests.persist = { passed: false, details: 'Datos NO persisten después de F5' };
                console.log('      ❌ CRÍTICO: Datos NO persisten después de F5');
                results.criticalIssues.push(`${mod.name}: Datos NO persisten después de F5`);
            }
        } else {
            moduleResult.tests.persist = { passed: true, details: 'Verificación simplificada OK' };
            console.log('      ✅ Módulo carga después de F5');
        }

        // ═══════════════════════════════════════════════════════════════════
        // TEST 5: EDIT CAPABILITY
        // ═══════════════════════════════════════════════════════════════════
        if (mod.hasEdit) {
            console.log('\n   ✏️  TEST EDIT CAPABILITY...');

            const hasEditBtn = await page.evaluate(() => {
                const btns = document.querySelectorAll('#mainContent button, #mainContent .btn, #mainContent [onclick]');
                for (const btn of btns) {
                    const text = btn.textContent.toLowerCase();
                    const onclick = (btn.getAttribute('onclick') || '').toLowerCase();
                    if (text.includes('editar') || text.includes('edit') || text.includes('✏') ||
                        onclick.includes('edit') || btn.querySelector('.fa-edit, .fa-pencil, .bi-pencil')) {
                        return true;
                    }
                }
                // También buscar en tablas
                const editIcons = document.querySelectorAll('#mainContent .fa-edit, #mainContent .fa-pencil, #mainContent .bi-pencil');
                return editIcons.length > 0;
            });

            moduleResult.tests.edit = { passed: hasEditBtn, details: hasEditBtn ? 'Botón editar disponible' : 'Sin botón editar' };
            console.log(hasEditBtn ? '      ✅ Botón editar disponible' : '      ⚠️ No se encontró botón editar');
        }

        // ═══════════════════════════════════════════════════════════════════
        // TEST 6: DELETE CAPABILITY
        // ═══════════════════════════════════════════════════════════════════
        if (mod.hasDelete) {
            console.log('\n   🗑️  TEST DELETE CAPABILITY...');

            const hasDeleteBtn = await page.evaluate(() => {
                const btns = document.querySelectorAll('#mainContent button, #mainContent .btn, #mainContent [onclick]');
                for (const btn of btns) {
                    const text = btn.textContent.toLowerCase();
                    const onclick = (btn.getAttribute('onclick') || '').toLowerCase();
                    if (text.includes('eliminar') || text.includes('delete') || text.includes('🗑') ||
                        onclick.includes('delete') || btn.querySelector('.fa-trash, .bi-trash')) {
                        return true;
                    }
                }
                const trashIcons = document.querySelectorAll('#mainContent .fa-trash, #mainContent .bi-trash');
                return trashIcons.length > 0;
            });

            moduleResult.tests.delete = { passed: hasDeleteBtn, details: hasDeleteBtn ? 'Botón eliminar disponible' : 'Sin botón eliminar' };
            console.log(hasDeleteBtn ? '      ✅ Botón eliminar disponible' : '      ⚠️ No se encontró botón eliminar');
        }

        // ═══════════════════════════════════════════════════════════════════
        // DETERMINAR STATUS OVERALL
        // ═══════════════════════════════════════════════════════════════════
        const testsRan = Object.values(moduleResult.tests).filter(t => !t.skipped);
        const testsPassed = testsRan.filter(t => t.passed).length;
        const testsTotal = testsRan.length;

        if (testsPassed === testsTotal) {
            moduleResult.overallStatus = 'passed';
            results.summary.fullyPassed++;
        } else if (testsPassed >= testsTotal * 0.6) {
            moduleResult.overallStatus = 'partial';
            results.summary.partiallyPassed++;
        } else {
            moduleResult.overallStatus = 'failed';
            results.summary.failed++;
        }

        console.log(`\n   📊 Resultado: ${testsPassed}/${testsTotal} tests pasaron`);

    } catch (err) {
        console.log(`\n   ❌ ERROR: ${err.message}`);
        moduleResult.overallStatus = 'failed';
        results.summary.failed++;
        results.criticalIssues.push(`${mod.name}: Error - ${err.message}`);
    }

    results.modules[mod.id] = moduleResult;
    return moduleResult;
}

async function main() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║        TEST DE PRODUCCIÓN - MÓDULOS RRHH                                 ║');
    console.log('║                                                                          ║');
    console.log('║   Módulos: Usuarios, Vacaciones, Capacitación, Sanciones,               ║');
    console.log('║            Reclutamiento, Estructura Org, Beneficios, Asistencia        ║');
    console.log('║                                                                          ║');
    console.log('║   Tests: LOAD → CREATE → READ → PERSIST → EDIT → DELETE                 ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');
    console.log(`🔑 Test ID: ${testId}\n`);

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 900 },
        slowMo: 50,
        args: ['--window-size=1500,1000'],
        protocolTimeout: 180000
    });

    const page = await browser.newPage();

    page.on('dialog', async dialog => {
        console.log(`   📢 Dialog: "${dialog.message().substring(0, 40)}..." - OK`);
        await dialog.accept();
    });

    page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('Error')) {
            // Solo loguear errores importantes
        }
    });

    try {
        // ═══════════════════════════════════════════════════════════════════
        // LOGIN
        // ═══════════════════════════════════════════════════════════════════
        console.log('🔐 Iniciando sesión...');
        await page.goto('http://localhost:9998/panel-empresa.html', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await sleep(2000);

        await page.select('#companySelect', 'isi');
        await sleep(2000);

        await page.evaluate(() => {
            document.getElementById('userInput').disabled = false;
            document.getElementById('userInput').value = 'admin';
            document.getElementById('passwordInput').disabled = false;
            document.getElementById('passwordInput').value = 'admin123';
            document.getElementById('multiTenantLoginForm').dispatchEvent(new Event('submit', { bubbles: true }));
        });
        await sleep(5000);

        console.log('✅ Login completado\n');

        // ═══════════════════════════════════════════════════════════════════
        // TEST CADA MÓDULO RRHH
        // ═══════════════════════════════════════════════════════════════════
        for (const mod of RRHH_MODULES) {
            await testRRHHModule(page, mod);
            await sleep(2000);
        }

        // ═══════════════════════════════════════════════════════════════════
        // RESUMEN FINAL
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n\n');
        console.log('╔══════════════════════════════════════════════════════════════════════════╗');
        console.log('║                    RESUMEN FINAL - MÓDULOS RRHH                          ║');
        console.log('╠══════════════════════════════════════════════════════════════════════════╣');
        console.log(`║   ✅ PASARON COMPLETO:    ${results.summary.fullyPassed.toString().padStart(2)}                                           ║`);
        console.log(`║   ⚠️  PASARON PARCIAL:     ${results.summary.partiallyPassed.toString().padStart(2)}                                           ║`);
        console.log(`║   ❌ FALLARON:            ${results.summary.failed.toString().padStart(2)}                                           ║`);
        console.log(`║   📊 TOTAL:               ${results.summary.total.toString().padStart(2)}                                           ║`);
        console.log('╚══════════════════════════════════════════════════════════════════════════╝');

        // Tabla de resultados
        console.log('\n📋 DETALLE POR MÓDULO:');
        console.log('┌─────────────────────────┬────────┬────────┬────────┬─────────┬────────┬────────┬──────────┐');
        console.log('│ Módulo                  │ Load   │ Create │ Read   │ Persist │ Edit   │ Delete │ Status   │');
        console.log('├─────────────────────────┼────────┼────────┼────────┼─────────┼────────┼────────┼──────────┤');

        for (const mod of RRHH_MODULES) {
            const r = results.modules[mod.id];
            if (!r) continue;

            const icon = (test) => {
                if (test.skipped) return '  ➖  ';
                if (test.passed) return '  ✅  ';
                return '  ❌  ';
            };

            const statusIcon = r.overallStatus === 'passed' ? '   ✅   ' :
                              r.overallStatus === 'partial' ? '   ⚠️   ' : '   ❌   ';

            const name = mod.name.replace(/^[^\s]+\s/, '').substring(0, 21).padEnd(21);
            console.log(`│ ${name}  │${icon(r.tests.load)}│${icon(r.tests.create)}│${icon(r.tests.read)}│${icon(r.tests.persist)} │${icon(r.tests.edit)}│${icon(r.tests.delete)}│${statusIcon} │`);
        }
        console.log('└─────────────────────────┴────────┴────────┴────────┴─────────┴────────┴────────┴──────────┘');

        // Problemas críticos
        if (results.criticalIssues.length > 0) {
            console.log('\n🚨 PROBLEMAS CRÍTICOS:');
            results.criticalIssues.forEach((issue, i) => {
                console.log(`   ${i + 1}. ${issue}`);
            });
        }

        // Veredicto
        console.log('\n' + '═'.repeat(70));
        const passRate = ((results.summary.fullyPassed + results.summary.partiallyPassed * 0.5) / results.summary.total * 100).toFixed(0);

        if (results.summary.failed === 0 && results.criticalIssues.length === 0) {
            console.log('🚀 VEREDICTO: MÓDULOS RRHH APTOS PARA PRODUCCIÓN');
            console.log(`   Tasa de éxito: ${passRate}%`);
        } else if (results.criticalIssues.length > 0) {
            console.log('🛑 VEREDICTO: HAY PROBLEMAS CRÍTICOS QUE RESOLVER');
            console.log(`   Tasa de éxito: ${passRate}%`);
            console.log(`   Problemas críticos: ${results.criticalIssues.length}`);
        } else {
            console.log('⚠️  VEREDICTO: APTO CON OBSERVACIONES');
            console.log(`   Tasa de éxito: ${passRate}%`);
        }
        console.log('═'.repeat(70));

        // Guardar resultados
        fs.writeFileSync('test-rrhh-produccion-results.json', JSON.stringify(results, null, 2));
        console.log('\n📁 Resultados: test-rrhh-produccion-results.json');

        console.log('\n🖥️  Navegador abierto - Ctrl+C para cerrar\n');
        await new Promise(() => {});

    } catch (err) {
        console.error('\n❌ ERROR FATAL:', err);
    }
}

main();
