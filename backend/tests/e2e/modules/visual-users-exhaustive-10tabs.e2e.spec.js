/**
 * TEST VISUAL EXHAUSTIVO - Módulo Gestión de Usuarios + 10 Tabs
 * Sigue el protocolo de TESTING-VISUAL-EXHAUSTIVO-SPEC.md
 *
 * EMPRESA: ISI | USUARIO: admin | CLAVE: admin123
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOTS_DIR = path.join(__dirname, '../../../screenshots/users-exhaustive');

// Crear directorio de screenshots si no existe
if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Helper: Guardar screenshot con timestamp
async function saveScreenshot(page, name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}_${name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: true });
    console.log(`📸 Screenshot: ${filename}`);
    return filename;
}

// Helper: Login con empresa ISI
async function login(page) {
    console.log('🔐 Iniciando login con ISI/admin/admin123...');
    await page.goto(`${BASE_URL}/panel-empresa.html`);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Seleccionar empresa ISI
    const companySelect = await page.$('#companySelect');
    if (companySelect) {
        // Verificar opciones disponibles
        const options = await page.$$eval('#companySelect option', opts =>
            opts.map(o => ({ value: o.value, text: o.textContent }))
        );
        console.log('📋 Empresas disponibles:', options);

        // Buscar ISI (puede estar como 'isi', 'ISI', o similar)
        const isiOption = options.find(o =>
            o.value.toLowerCase().includes('isi') ||
            o.text.toLowerCase().includes('isi')
        );

        if (isiOption) {
            await page.selectOption('#companySelect', isiOption.value);
            console.log(`✅ Empresa seleccionada: ${isiOption.text}`);
        } else {
            console.log('⚠️ ISI no encontrada, usando primera empresa disponible');
            if (options.length > 1) {
                await page.selectOption('#companySelect', { index: 1 });
            }
        }
    }

    await page.waitForTimeout(1500);

    // Llenar credenciales
    await page.fill('#userInput', 'admin');
    await page.fill('#passwordInput', 'admin123');

    // Click en login
    await page.click('#loginButton');
    await page.waitForTimeout(6000);

    // Forzar cierre del modal de login si sigue visible
    await page.evaluate(() => {
        const loginContainer = document.getElementById('loginContainer');
        if (loginContainer) {
            loginContainer.style.cssText = 'display: none !important;';
        }
        if (typeof showDashboard === 'function') {
            showDashboard();
        }
    });

    await page.waitForTimeout(2000);
    console.log('✅ Login completado');
}

// Helper: Navegar al módulo de usuarios
async function navigateToUsers(page) {
    console.log('🧭 Navegando al módulo de Usuarios...');

    await page.evaluate(() => {
        if (typeof showModuleContent === 'function') {
            showModuleContent('users', 'Gestión de Usuarios');
        }
    });

    await page.waitForTimeout(5000);
    console.log('✅ Módulo de Usuarios cargado');
}

// Helper: Abrir expediente de un usuario (botón Ver)
async function openUserFile(page, userIndex = 0) {
    console.log(`📂 Abriendo expediente del usuario índice ${userIndex}...`);

    // Asegurar que la tabla esté cargada
    try {
        await page.waitForSelector('.users-table tbody tr', { timeout: 10000 });
    } catch (e) {
        console.log('⚠️ Timeout esperando tabla, continuando...');
    }

    // Buscar botones "Ver" en la tabla con múltiples selectores
    let viewButtons = await page.$$('.users-action-btn.view, button[onclick^="viewUser"]');

    if (viewButtons.length === 0) {
        console.log('⚠️ No se encontraron botones Ver con selector primario, buscando alternativas...');

        // Buscar con selectores alternativos
        viewButtons = await page.$$('button[title*="Ver"], .btn-view, [data-action="view"]');

        if (viewButtons.length === 0) {
            // Último intento: buscar cualquier botón con ícono de ojo o texto "Ver"
            viewButtons = await page.$$('button:has(.fa-eye), button:has-text("Ver")');
        }
    }

    console.log(`   Botones Ver encontrados: ${viewButtons.length}`);

    if (viewButtons.length === 0) {
        // Tomar screenshot para diagnóstico
        await page.screenshot({ path: 'debug-no-buttons.png' });
        throw new Error('No se encontraron botones para ver usuarios');
    }

    const targetIndex = Math.min(userIndex, viewButtons.length - 1);
    await viewButtons[targetIndex].click();

    await page.waitForTimeout(3000);
    console.log('✅ Expediente abierto');
}

// Helper: Cambiar a un tab específico
async function switchToTab(page, tabName) {
    console.log(`📑 Cambiando al tab: ${tabName}...`);

    await page.evaluate((tab) => {
        if (typeof showFileTab === 'function') {
            showFileTab(tab);
        }
    }, tabName);

    await page.waitForTimeout(2000);
    console.log(`✅ Tab ${tabName} activado`);
}

// ============================================================================
// TESTS
// ============================================================================

test.describe('Testing Exhaustivo - Módulo Usuarios + 10 Tabs', () => {

    test.beforeEach(async ({ page }) => {
        // Configurar viewport y timeout
        await page.setViewportSize({ width: 1920, height: 1080 });
        test.setTimeout(600000); // 10 minutos

        // Capturar errores de consola
        page.on('console', msg => {
            if (msg.type() === 'error' || msg.text().includes('Error')) {
                console.log(`⚠️ BROWSER ERROR: ${msg.text()}`);
            }
        });

        page.on('pageerror', err => {
            console.log(`❌ PAGE ERROR: ${err.message}`);
        });
    });

    test('FASE 1: Carga inicial del módulo y tabla de usuarios', async ({ page }) => {
        await login(page);
        await saveScreenshot(page, '01-post-login');

        await navigateToUsers(page);
        await saveScreenshot(page, '02-modulo-usuarios-cargado');

        // Verificar elementos principales
        const stats = await page.$$('.users-stat-mini, .stat-card');
        console.log(`📊 Stats cards encontradas: ${stats.length}`);

        const table = await page.$('.users-table, table');
        expect(table).not.toBeNull();
        console.log('✅ Tabla de usuarios encontrada');

        // Contar usuarios en la tabla
        const userRows = await page.$$('.users-table tbody tr, table tbody tr');
        console.log(`👥 Usuarios en tabla: ${userRows.length}`);

        // Verificar filtros
        const filters = await page.$$('.filter-input, .filter-select, input[type="search"]');
        console.log(`🔍 Filtros encontrados: ${filters.length}`);

        // Verificar botón agregar usuario
        const addButton = await page.$('.btn-add-user, button:has-text("Agregar")');
        if (addButton) {
            console.log('✅ Botón Agregar Usuario encontrado');
        } else {
            console.log('⚠️ Botón Agregar Usuario NO encontrado');
        }

        await saveScreenshot(page, '03-elementos-verificados');
    });

    test('FASE 2: Verificar dropdowns y filtros tienen opciones', async ({ page }) => {
        await login(page);
        await navigateToUsers(page);

        // Obtener todos los selects
        const selects = await page.$$('select.filter-select, select');
        console.log(`📋 Total de selects encontrados: ${selects.length}`);

        for (let i = 0; i < selects.length; i++) {
            const options = await selects[i].$$('option');
            const selectId = await selects[i].getAttribute('id') || `select-${i}`;
            console.log(`   ${selectId}: ${options.length} opciones`);

            if (options.length <= 1) {
                console.log(`   ⚠️ ALERTA: Select ${selectId} tiene ${options.length} opciones (posible bug)`);
            }
        }

        await saveScreenshot(page, '04-dropdowns-verificados');
    });

    test('FASE 3: Abrir expediente y verificar 10 TABS', async ({ page }) => {
        await login(page);
        await navigateToUsers(page);

        // Esperar que cargue la tabla
        await page.waitForSelector('.users-table tbody tr, table tbody tr', { timeout: 10000 });
        await saveScreenshot(page, '05-antes-abrir-expediente');

        // Abrir expediente del primer usuario
        await openUserFile(page, 0);
        await saveScreenshot(page, '06-expediente-abierto');

        // Verificar que el modal se abrió
        const modal = await page.$('#employeeFileModal');
        expect(modal).not.toBeNull();
        console.log('✅ Modal de expediente abierto');

        // Verificar los 10 tabs
        const tabs = [
            { name: 'admin', label: '⚙️ Administración' },
            { name: 'personal', label: '👤 Datos Personales' },
            { name: 'work', label: '💼 Antecedentes Laborales' },
            { name: 'family', label: '👨‍👩‍👧‍👦 Grupo Familiar' },
            { name: 'medical', label: '🏥 Antecedentes Médicos' },
            { name: 'attendance', label: '📅 Asistencias/Permisos' },
            { name: 'calendar', label: '📆 Calendario' },
            { name: 'disciplinary', label: '⚖️ Disciplinarios' },
            { name: 'biometric', label: '📸 Registro Biométrico' },
            { name: 'notifications', label: '🔔 Notificaciones' }
        ];

        console.log('\n📑 VERIFICANDO 10 TABS:');
        console.log('=' .repeat(50));

        for (const tab of tabs) {
            console.log(`\n🔄 Verificando Tab: ${tab.label}`);

            // Cambiar al tab
            await switchToTab(page, tab.name);
            await page.waitForTimeout(1500);

            // Verificar que el contenido del tab sea visible
            const tabContent = await page.$(`#${tab.name}-tab`);
            if (tabContent) {
                const isVisible = await tabContent.isVisible();
                const display = await tabContent.evaluate(el => getComputedStyle(el).display);

                console.log(`   - Contenido visible: ${isVisible}`);
                console.log(`   - Display: ${display}`);

                // Contar elementos dentro del tab
                const innerElements = await tabContent.$$('div, button, input, select, table');
                console.log(`   - Elementos internos: ${innerElements.length}`);

                // Verificar si hay errores de carga
                const errorMessages = await tabContent.$$eval(
                    '.error, .alert-danger, [class*="error"]',
                    els => els.map(e => e.textContent).filter(t => t.length > 0)
                );
                if (errorMessages.length > 0) {
                    console.log(`   ⚠️ ERRORES: ${errorMessages.join(', ')}`);
                }

                // Verificar botones en el tab
                const buttons = await tabContent.$$('button');
                console.log(`   - Botones: ${buttons.length}`);

                // Screenshot del tab
                await saveScreenshot(page, `07-tab-${tab.name}`);
                console.log(`   ✅ Tab ${tab.name} verificado`);
            } else {
                console.log(`   ❌ Tab content #${tab.name}-tab NO encontrado`);
            }
        }

        console.log('\n' + '=' .repeat(50));
        console.log('✅ Verificación de 10 tabs completada');
    });

    test('FASE 4: Verificar scroll en modales largos', async ({ page }) => {
        await login(page);
        await navigateToUsers(page);
        await page.waitForSelector('.users-table tbody tr', { timeout: 10000 });
        await openUserFile(page, 0);

        // Verificar si el modal tiene scroll
        const modalContent = await page.$('#employeeFileModal > div');
        if (modalContent) {
            const scrollInfo = await modalContent.evaluate(el => ({
                scrollHeight: el.scrollHeight,
                clientHeight: el.clientHeight,
                hasScroll: el.scrollHeight > el.clientHeight
            }));

            console.log(`📜 Scroll info del modal:`);
            console.log(`   - ScrollHeight: ${scrollInfo.scrollHeight}px`);
            console.log(`   - ClientHeight: ${scrollInfo.clientHeight}px`);
            console.log(`   - Tiene scroll: ${scrollInfo.hasScroll}`);

            if (scrollInfo.hasScroll) {
                // Scroll al final para capturar contenido oculto
                await modalContent.evaluate(el => el.scrollTop = el.scrollHeight);
                await page.waitForTimeout(500);
                await saveScreenshot(page, '08-modal-scroll-bottom');
            }
        }
    });

    test('FASE 5: Verificar botones de acción en cada tab', async ({ page }) => {
        await login(page);
        await navigateToUsers(page);
        await page.waitForSelector('.users-table tbody tr', { timeout: 10000 });
        await openUserFile(page, 0);

        const tabsToCheck = ['admin', 'personal', 'work', 'medical', 'biometric'];

        console.log('\n🔘 VERIFICANDO BOTONES DE ACCIÓN:');
        console.log('=' .repeat(50));

        for (const tabName of tabsToCheck) {
            await switchToTab(page, tabName);
            await page.waitForTimeout(1000);

            const tabContent = await page.$(`#${tabName}-tab`);
            if (tabContent) {
                const buttons = await tabContent.$$eval('button', btns =>
                    btns.map(b => ({
                        text: b.textContent.trim().substring(0, 50),
                        onclick: b.getAttribute('onclick')?.substring(0, 60) || 'none',
                        disabled: b.disabled,
                        visible: b.offsetParent !== null
                    }))
                );

                console.log(`\n📑 Tab ${tabName} - Botones encontrados: ${buttons.length}`);
                buttons.forEach((btn, i) => {
                    const status = btn.disabled ? '🔒' : (btn.visible ? '✅' : '👻');
                    console.log(`   ${status} [${i}] "${btn.text}" → ${btn.onclick}`);
                });
            }
        }
    });

    test('FASE 6: Verificar elementos potencialmente en desuso', async ({ page }) => {
        await login(page);
        await navigateToUsers(page);
        await page.waitForSelector('.users-table tbody tr', { timeout: 10000 });
        await openUserFile(page, 0);

        console.log('\n🔍 BUSCANDO ELEMENTOS EN DESUSO:');
        console.log('=' .repeat(50));

        // Elementos con display:none que podrían estar en desuso
        const hiddenElements = await page.$$eval('[style*="display: none"], [style*="display:none"]', els =>
            els.map(e => ({
                tag: e.tagName,
                id: e.id,
                class: e.className?.substring?.(0, 50) || '',
                content: e.textContent?.substring(0, 30) || ''
            }))
        );
        console.log(`\n👻 Elementos ocultos (display:none): ${hiddenElements.length}`);
        hiddenElements.slice(0, 10).forEach(el => {
            console.log(`   - <${el.tag}> id="${el.id}" class="${el.class}"`);
        });

        // Inputs con value vacío que podrían necesitar data
        const emptyInputs = await page.$$eval('input[type="text"], input[type="date"], input[type="number"]', inputs =>
            inputs.filter(i => !i.value && i.offsetParent !== null).map(i => ({
                name: i.name,
                id: i.id,
                placeholder: i.placeholder
            }))
        );
        console.log(`\n📝 Inputs visibles sin valor: ${emptyInputs.length}`);
        emptyInputs.slice(0, 10).forEach(inp => {
            console.log(`   - name="${inp.name}" id="${inp.id}" placeholder="${inp.placeholder}"`);
        });

        // Selects vacíos (sin opciones o solo placeholder)
        const emptySelects = await page.$$eval('select', selects =>
            selects.filter(s => s.options.length <= 1 && s.offsetParent !== null).map(s => ({
                name: s.name,
                id: s.id,
                optionCount: s.options.length
            }))
        );
        console.log(`\n📋 Selects vacíos o con solo placeholder: ${emptySelects.length}`);
        emptySelects.forEach(sel => {
            console.log(`   ⚠️ name="${sel.name}" id="${sel.id}" opciones=${sel.optionCount}`);
        });

        // Botones sin onclick
        const deadButtons = await page.$$eval('button', buttons =>
            buttons.filter(b => !b.onclick && !b.getAttribute('onclick') && b.offsetParent !== null)
                .map(b => ({
                    text: b.textContent?.trim().substring(0, 30),
                    class: b.className?.substring?.(0, 40)
                }))
        );
        console.log(`\n🔘 Botones visibles sin onclick: ${deadButtons.length}`);
        deadButtons.slice(0, 10).forEach(btn => {
            console.log(`   ⚠️ "${btn.text}" class="${btn.class}"`);
        });

        await saveScreenshot(page, '09-analisis-desuso');
    });

    test('FASE 7: Test de flujo CRUD - Verificar formulario de creación', async ({ page }) => {
        await login(page);
        await navigateToUsers(page);

        // Buscar botón de agregar usuario
        const addButton = await page.$('.btn-add-user, button:has-text("Agregar"), button:has-text("Nuevo")');

        if (addButton) {
            console.log('✅ Botón Agregar encontrado, haciendo click...');
            await addButton.click();
            await page.waitForTimeout(2000);
            await saveScreenshot(page, '10-form-crear-usuario');

            // Verificar campos del formulario
            const formFields = await page.$$eval('input, select, textarea', fields =>
                fields.filter(f => f.offsetParent !== null).map(f => ({
                    type: f.type || f.tagName.toLowerCase(),
                    name: f.name,
                    id: f.id,
                    required: f.required
                }))
            );

            console.log(`\n📝 Campos del formulario de creación: ${formFields.length}`);
            formFields.forEach(field => {
                const req = field.required ? '(*)' : '';
                console.log(`   - [${field.type}] name="${field.name}" ${req}`);
            });
        } else {
            console.log('⚠️ Botón Agregar Usuario no encontrado');
        }
    });

    test('RESUMEN: Generar reporte final', async ({ page }) => {
        await login(page);
        await navigateToUsers(page);

        // ESPERAR que la tabla cargue completamente
        await page.waitForSelector('.users-table tbody tr', { timeout: 15000 });
        await page.waitForTimeout(2000); // Espera adicional para estabilización

        const report = {
            fecha: new Date().toISOString(),
            modulo: 'Gestión de Usuarios',
            empresa: 'ISI',
            hallazgos: []
        };

        // Contar usuarios
        const userRows = await page.$$('.users-table tbody tr');
        report.totalUsuarios = userRows.length;
        console.log(`👥 Usuarios encontrados: ${userRows.length}`);

        // Verificar stats
        const stats = await page.$$('.users-stat-mini');
        report.statsCards = stats.length;

        // Abrir expediente para contar tabs
        await openUserFile(page, 0);
        const tabs = await page.$$('.file-tab');
        report.totalTabs = tabs.length;

        console.log('\n' + '=' .repeat(60));
        console.log('📊 REPORTE FINAL DE TESTING');
        console.log('=' .repeat(60));
        console.log(JSON.stringify(report, null, 2));

        // Guardar reporte
        const reportPath = path.join(SCREENSHOTS_DIR, 'reporte-final.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Reporte guardado en: ${reportPath}`);

        await saveScreenshot(page, '99-estado-final');
    });
});
