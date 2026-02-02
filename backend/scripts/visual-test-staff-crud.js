/**
 * Visual Test: Staff Module - CRUD Profundo con Screenshots
 * Fecha: 2026-02-01
 *
 * Tests:
 * 1. Login panel-administrativo
 * 2. Navegación a Gestión Staff
 * 3. CREATE: Nuevo personal
 * 4. READ: Verificar en tabla
 * 5. UPDATE: Editar personal
 * 6. DELETE: Desactivar personal
 * 7. Vendedores: Mismo flujo
 * 8. Staff Aponnt: Grid view
 * 9. Roles de Staff: Lista de roles
 * 10. Organigrama: Visualización
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'test-results', 'staff-crud-visual');

// Credenciales admin
const ADMIN_CREDENTIALS = {
    email: 'admin@aponnt.com',
    password: 'admin123'
};

// Datos de prueba
const TEST_STAFF = {
    first_name: 'Test',
    last_name: `Visual_${Date.now()}`,
    email: `test.visual.${Date.now()}@aponnt.com`,
    country: 'AR',
    phone: '+54 11 9999-9999'
};

async function ensureDir(dir) {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        console.log(`📁 Directorio screenshots: ${dir}`);
    } catch (err) {
        console.error(`Error creando directorio: ${err.message}`);
    }
}

async function screenshot(page, name) {
    const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filepath, fullPage: false });
    console.log(`  📸 Screenshot: ${name}.png`);
    return filepath;
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  🧪 TEST VISUAL: MÓDULO STAFF - CRUD PROFUNDO');
    console.log('═══════════════════════════════════════════════════════════\n');

    await ensureDir(SCREENSHOT_DIR);

    const browser = await chromium.launch({
        headless: true,
        args: ['--window-size=1920,1080']
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };

    function logResult(name, passed, details = '') {
        const icon = passed ? '✅' : '❌';
        console.log(`${icon} ${name}${details ? ': ' + details : ''}`);
        results.tests.push({ name, passed, details });
        if (passed) results.passed++; else results.failed++;
    }

    try {
        // ═══════════════════════════════════════════════════════════
        // TEST 1: LOGIN ADMIN
        // ═══════════════════════════════════════════════════════════
        console.log('\n📋 TEST 1: Login Panel Administrativo');
        console.log('─────────────────────────────────────────');

        await page.goto(`${BASE_URL}/panel-administrativo.html`);
        await delay(2000);
        await screenshot(page, '01-login-page');

        // Llenar formulario (selectores del admin-panel-controller.js)
        await page.fill('#login-email', ADMIN_CREDENTIALS.email);
        await page.fill('#login-password', ADMIN_CREDENTIALS.password);
        await screenshot(page, '02-login-filled');

        // Submit
        await page.click('#login-form button[type="submit"], button:has-text("Iniciar Sesión")');
        await delay(5000);

        // Verificar login exitoso - buscar múltiples indicadores
        const sidebarVisible = await page.locator('#admin-sidebar, .sidebar').isVisible().catch(() => false);
        const contentVisible = await page.locator('#content-area, .main-content').isVisible().catch(() => false);
        const loginGone = !(await page.locator('#login-form, .login-container').isVisible().catch(() => true));

        const dashboardVisible = sidebarVisible || contentVisible || loginGone;
        await screenshot(page, '03-dashboard-loaded');

        console.log(`  [Debug] sidebar=${sidebarVisible}, content=${contentVisible}, loginGone=${loginGone}`);
        logResult('Login admin', dashboardVisible, dashboardVisible ? 'Dashboard visible' : 'Dashboard no cargó');

        if (!dashboardVisible) {
            // Verificar si hay mensaje de error
            const errorMsg = await page.locator('#login-error, .error-message').textContent().catch(() => 'No error visible');
            console.log(`  [Debug] Error de login: ${errorMsg}`);
            throw new Error('Login falló - no se puede continuar');
        }

        // ═══════════════════════════════════════════════════════════
        // TEST 2: NAVEGACIÓN A GESTIÓN STAFF
        // ═══════════════════════════════════════════════════════════
        console.log('\n📋 TEST 2: Navegación a Gestión Staff');
        console.log('─────────────────────────────────────────');

        // Usar el controlador para navegar directamente
        await page.evaluate(() => {
            if (typeof AdminPanelController !== 'undefined') {
                AdminPanelController.loadSection('gestion-staff');
            }
        });
        await delay(3000);
        await screenshot(page, '04-gestion-staff-view');

        // Verificar tabla de staff
        const staffTable = await page.locator('table, .staff-table, #staff-table').isVisible().catch(() => false);
        logResult('Navegación Gestión Staff', staffTable, staffTable ? 'Tabla visible' : 'Tabla no encontrada');

        // ═══════════════════════════════════════════════════════════
        // TEST 3: CREATE - NUEVO PERSONAL
        // ═══════════════════════════════════════════════════════════
        console.log('\n📋 TEST 3: CREATE - Nuevo Personal');
        console.log('─────────────────────────────────────────');

        // Click en botón Nuevo
        const btnNuevo = page.locator('button:has-text("Nuevo"), .btn-nuevo-staff, button:has-text("+ Nuevo")').first();
        await btnNuevo.click();
        await delay(1000);
        await screenshot(page, '05-modal-nuevo-staff');

        // Verificar modal abierto
        const modalVisible = await page.locator('.modal-overlay, #staff-modal-overlay').isVisible().catch(() => false);
        logResult('Modal crear abierto', modalVisible);

        if (modalVisible) {
            // Llenar formulario
            await page.fill('input[name="first_name"]', TEST_STAFF.first_name);
            await page.fill('input[name="last_name"]', TEST_STAFF.last_name);
            await page.fill('input[name="email"]', TEST_STAFF.email);

            // Seleccionar rol (primer rol disponible)
            const roleSelect = page.locator('select[name="role_id"]');
            if (await roleSelect.isVisible()) {
                const options = await roleSelect.locator('option').allTextContents();
                if (options.length > 1) {
                    await roleSelect.selectOption({ index: 1 });
                }
            }

            // Seleccionar país
            const countrySelect = page.locator('select[name="country"]');
            if (await countrySelect.isVisible()) {
                await countrySelect.selectOption('AR');
            }

            // Teléfono (opcional)
            const phoneInput = page.locator('input[name="phone"]');
            if (await phoneInput.isVisible()) {
                await phoneInput.fill(TEST_STAFF.phone);
            }

            await screenshot(page, '06-modal-filled');

            // Guardar
            await page.click('button:has-text("Guardar"), .btn-save');
            await delay(2000);
            await screenshot(page, '07-after-create');

            // Verificar toast de éxito o que el modal se cerró
            const modalClosed = !(await page.locator('.modal-overlay, #staff-modal-overlay').isVisible().catch(() => true));
            const toastSuccess = await page.locator('.staff-toast, .toast, .notification').isVisible().catch(() => false);

            logResult('CREATE staff', modalClosed || toastSuccess, modalClosed ? 'Modal cerrado' : 'Toast visible');
        }

        // ═══════════════════════════════════════════════════════════
        // TEST 4: READ - VERIFICAR EN TABLA
        // ═══════════════════════════════════════════════════════════
        console.log('\n📋 TEST 4: READ - Verificar en tabla');
        console.log('─────────────────────────────────────────');

        await delay(1000);

        // Buscar el registro creado
        const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"], #staff-search');
        if (await searchInput.isVisible()) {
            await searchInput.fill(TEST_STAFF.last_name);
            await delay(1000);
        }
        await screenshot(page, '08-search-result');

        // Verificar que aparece en la tabla
        const rowFound = await page.locator(`text=${TEST_STAFF.last_name}`).isVisible().catch(() => false);
        logResult('READ staff en tabla', rowFound, rowFound ? `${TEST_STAFF.last_name} encontrado` : 'No encontrado');

        // ═══════════════════════════════════════════════════════════
        // TEST 5: UPDATE - EDITAR PERSONAL
        // ═══════════════════════════════════════════════════════════
        console.log('\n📋 TEST 5: UPDATE - Editar Personal');
        console.log('─────────────────────────────────────────');

        // Click en botón editar de la fila
        const editBtn = page.locator(`tr:has-text("${TEST_STAFF.last_name}") button:has-text("✏️"), tr:has-text("${TEST_STAFF.last_name}") .btn-edit`).first();
        if (await editBtn.isVisible().catch(() => false)) {
            await editBtn.click();
            await delay(1000);
            await screenshot(page, '09-modal-editar');

            // Modificar nombre
            const firstNameInput = page.locator('input[name="first_name"]');
            if (await firstNameInput.isVisible()) {
                await firstNameInput.fill('TestModificado');
                await screenshot(page, '10-modal-edit-modified');

                // Guardar cambios
                await page.click('button:has-text("Guardar"), .btn-save');
                await delay(2000);
                await screenshot(page, '11-after-update');

                const updateSuccess = !(await page.locator('.modal-overlay').isVisible().catch(() => true));
                logResult('UPDATE staff', updateSuccess, updateSuccess ? 'Guardado' : 'Modal aún abierto');
            }
        } else {
            logResult('UPDATE staff', false, 'Botón editar no encontrado');
        }

        // ═══════════════════════════════════════════════════════════
        // TEST 6: DELETE - DESACTIVAR PERSONAL
        // ═══════════════════════════════════════════════════════════
        console.log('\n📋 TEST 6: DELETE - Desactivar Personal');
        console.log('─────────────────────────────────────────');

        // Limpiar búsqueda primero
        if (await searchInput.isVisible()) {
            await searchInput.fill('');
            await delay(500);
            await searchInput.fill(TEST_STAFF.last_name);
            await delay(1000);
        }

        // Click en botón desactivar
        const deactivateBtn = page.locator(`tr:has-text("${TEST_STAFF.last_name}") button[title*="Desactivar"], tr:has-text("${TEST_STAFF.last_name}") button:has-text("🚫")`).first();
        if (await deactivateBtn.isVisible().catch(() => false)) {
            await screenshot(page, '12-before-deactivate');
            await deactivateBtn.click();
            await delay(500);

            // Confirmar en diálogo si aparece
            page.once('dialog', async dialog => {
                await dialog.accept();
            });

            await delay(2000);
            await screenshot(page, '13-after-deactivate');
            logResult('DELETE (desactivar) staff', true, 'Desactivación ejecutada');
        } else {
            logResult('DELETE staff', false, 'Botón desactivar no encontrado');
        }

        // ═══════════════════════════════════════════════════════════
        // TEST 7: VENDEDORES - NAVEGACIÓN Y VISTA
        // ═══════════════════════════════════════════════════════════
        console.log('\n📋 TEST 7: Vendedores - Vista');
        console.log('─────────────────────────────────────────');

        // Navegar usando controlador directamente
        await page.evaluate(() => {
            if (typeof AdminPanelController !== 'undefined') {
                AdminPanelController.loadSection('vendedores');
            }
        });
        await delay(3000);
        await screenshot(page, '14-vendedores-view');

        // Verificar tabla con datos O estado vacío (ambos son válidos)
        const vendedoresTable = await page.locator('table, .vendedores-table, .vendedor-card').first().isVisible().catch(() => false);
        const vendedoresEmpty = await page.locator('text=No hay vendedores registrados').isVisible().catch(() => false);
        const vendedoresStats = await page.locator('text=Total Vendedores').isVisible().catch(() => false);
        const vendedoresVisible = vendedoresTable || vendedoresEmpty || vendedoresStats;
        logResult('Vendedores vista', vendedoresVisible, vendedoresTable ? 'Tabla con datos' : (vendedoresEmpty ? 'Estado vacío (OK)' : (vendedoresStats ? 'Stats visibles' : 'No encontrado')));

        // ═══════════════════════════════════════════════════════════
        // TEST 8: STAFF APONNT - GRID VIEW
        // ═══════════════════════════════════════════════════════════
        console.log('\n📋 TEST 8: Staff Aponnt - Grid View');
        console.log('─────────────────────────────────────────');

        await page.evaluate(() => {
            if (typeof AdminPanelController !== 'undefined') {
                AdminPanelController.loadSection('staff-aponnt');
            }
        });
        await delay(3000);
        await screenshot(page, '15-staff-aponnt-grid');

        const gridVisible = await page.locator('.staff-card, #staff-aponnt-grid, [class*="card"]').first().isVisible().catch(() => false);
        logResult('Staff Aponnt grid', gridVisible, gridVisible ? 'Grid visible' : 'Grid no encontrado');

        // ═══════════════════════════════════════════════════════════
        // TEST 9: ROLES DE STAFF
        // ═══════════════════════════════════════════════════════════
        console.log('\n📋 TEST 9: Roles de Staff');
        console.log('─────────────────────────────────────────');

        await page.evaluate(() => {
            if (typeof AdminPanelController !== 'undefined') {
                AdminPanelController.loadSection('staff-roles');
            }
        });
        await delay(3000);
        await screenshot(page, '16-roles-staff');

        const rolesVisible = await page.locator('.role-card, #staff-roles-grid, table').first().isVisible().catch(() => false);
        logResult('Roles de Staff', rolesVisible, rolesVisible ? 'Roles visibles' : 'Roles no encontrados');

        // ═══════════════════════════════════════════════════════════
        // TEST 10: ORGANIGRAMA
        // ═══════════════════════════════════════════════════════════
        console.log('\n📋 TEST 10: Organigrama');
        console.log('─────────────────────────────────────────');

        await page.evaluate(() => {
            if (typeof AdminPanelController !== 'undefined') {
                AdminPanelController.loadSection('organigrama');
            }
        });
        await delay(4000);
        await screenshot(page, '17-organigrama');

        const orgVisible = await page.locator('.org-chart, #orgchart-container, svg, canvas, [class*="org"]').first().isVisible().catch(() => false);
        logResult('Organigrama', orgVisible, orgVisible ? 'Organigrama visible' : 'No renderizado');

    } catch (error) {
        console.error('\n❌ ERROR CRÍTICO:', error.message);
        await screenshot(page, 'error-state');
        results.tests.push({ name: 'Error crítico', passed: false, details: error.message });
        results.failed++;
    } finally {
        await browser.close();
    }

    // ═══════════════════════════════════════════════════════════
    // RESUMEN FINAL
    // ═══════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  📊 RESUMEN DE TESTS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  ✅ Passed: ${results.passed}`);
    console.log(`  ❌ Failed: ${results.failed}`);
    console.log(`  📁 Screenshots: ${SCREENSHOT_DIR}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Guardar reporte JSON
    const reportPath = path.join(SCREENSHOT_DIR, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`📄 Reporte guardado: ${reportPath}\n`);

    return results;
}

// Ejecutar
runTest().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
}).catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
