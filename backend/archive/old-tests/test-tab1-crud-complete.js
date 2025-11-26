/**
 * TEST COMPLETO - TAB 1 ADMINISTRACIÓN
 * Modal "Ver Usuario" → TAB 1
 *
 * Tests:
 * 1. BUG #1: Botón Activar/Desactivar
 * 2. BUG #2: Botón GPS
 * 3. BUG #3: Asignar Sucursal
 * 4. BUG #7: Asignar Turno
 *
 * Fecha: 2025-01-13
 * Empresa: ISI (company_id=11)
 */

const { chromium } = require('playwright');

const CONFIG = {
    baseURL: 'http://localhost:9998',
    company: 'isi',
    username: 'soporte',
    password: 'admin123',
    timeout: 30000
};

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function login(page) {
    console.log('\n📝 PASO 1: LOGIN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await page.goto(`${CONFIG.baseURL}/panel-empresa.html`);
    await delay(2000);

    // Esperar a que cargue el selector de empresa
    await page.waitForSelector('#companySelect', { timeout: CONFIG.timeout });

    // Esperar a que las empresas se carguen (el dropdown debe tener más de 1 opción)
    await page.waitForFunction(() => {
        const select = document.getElementById('companySelect');
        return select && select.options.length > 1;
    }, { timeout: CONFIG.timeout });
    console.log('✓ Empresas cargadas en dropdown');

    // Listar opciones disponibles
    const opciones = await page.evaluate(() => {
        const select = document.getElementById('companySelect');
        return Array.from(select.options).map(opt => ({ value: opt.value, text: opt.text }));
    });
    console.log('Opciones disponibles:', opciones);

    // Buscar opción que contenga "isi" (case insensitive)
    const opcionISI = opciones.find(opt => opt.text.toLowerCase().includes(CONFIG.company.toLowerCase()));

    if (!opcionISI) {
        throw new Error(`❌ No se encontró empresa "${CONFIG.company}" en el dropdown`);
    }

    // Seleccionar empresa por value
    await page.selectOption('select#companySelect', opcionISI.value);
    console.log(`✓ Empresa seleccionada: ${opcionISI.text}`);
    await delay(1000);

    // Llenar usuario
    await page.fill('input#userInput', CONFIG.username);
    console.log(`✓ Usuario ingresado: ${CONFIG.username}`);
    await delay(500);

    // Llenar password
    await page.fill('input#passwordInput', CONFIG.password);
    console.log(`✓ Password ingresado`);
    await delay(500);

    // Click login
    await page.click('button#loginButton');
    console.log('✓ Click en botón Login');
    await delay(3000);

    // Capturar screenshot después del login
    await page.screenshot({ path: 'test-tab1-01-after-login.png' });

    // Verificar si hay algún error de login (solo si tiene texto)
    const loginError = await page.locator('.error-message, .alert-danger').count();
    if (loginError > 0) {
        const errorText = await page.locator('.error-message, .alert-danger').first().textContent();
        if (errorText && errorText.trim().length > 0) {
            throw new Error(`❌ Error de login: ${errorText}`);
        }
    }

    // Esperar a que cargue el panel (buscando diferentes selectores posibles)
    try {
        await page.waitForSelector('.module-button, .module-card, [class*="module"]', { timeout: CONFIG.timeout });
        console.log('✅ Login exitoso - Panel cargado');
    } catch (error) {
        console.log('⚠️ No se encontró .module-button, intentando selectores alternativos...');
        // Intentar con selectores más generales
        await page.waitForSelector('#dashboard, .dashboard-container, main', { timeout: 10000 });
        console.log('✅ Login exitoso - Panel cargado (selector alternativo)');
    }

    await page.screenshot({ path: 'test-tab1-01-login-exitoso.png' });
}

async function navigateToUsers(page) {
    console.log('\n📝 PASO 2: NAVEGAR AL MÓDULO USUARIOS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Hacer scroll al inicio de la página
    await page.evaluate(() => window.scrollTo(0, 0));
    await delay(500);

    // Esperar a que se carguen los módulos (pueden cargarse dinámicamente)
    await delay(3000);

    // Hacer scroll para asegurar que todos los módulos se cargan
    await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
    });
    await delay(1000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await delay(1000);

    // Listar todos los módulos disponibles (buscar dentro de module-grid)
    const modulos = await page.evaluate(() => {
        // Buscar TODOS los hijos directos del grid
        const grid = document.querySelector('.module-grid');
        if (!grid) return [];

        const children = Array.from(grid.children);
        return children.map(child => ({
            text: child.textContent?.trim().substring(0, 80),
            className: child.className,
            tagName: child.tagName,
            id: child.id,
            onclick: child.onclick !== null
        }));
    });
    console.log(`Módulos encontrados (${modulos.length}):`);
    modulos.slice(0, 15).forEach((mod, i) => {
        console.log(`  ${i+1}. [${mod.tagName}] ${mod.text}`);
    });

    // Buscar y clickear el módulo de Usuarios
    // Hacer click en el elemento que contenga "Usuarios"
    const clicked = await page.evaluate(() => {
        const grid = document.querySelector('.module-grid');
        if (!grid) return false;

        const children = Array.from(grid.children);
        const userModule = children.find(child => child.textContent.includes('Usuarios'));

        if (!userModule) return false;

        userModule.click();
        return true;
    });

    if (!clicked) {
        throw new Error('❌ No se encontró el módulo con "Usuarios"');
    }

    console.log('✓ Click en módulo "Gestión de Usuarios"');

    await delay(2000);

    // Esperar tabla de usuarios
    await page.waitForSelector('#usersTable, table, .users-table', { timeout: CONFIG.timeout });
    console.log('✅ Tabla de usuarios cargada');

    await page.screenshot({ path: 'test-tab1-02-modulo-usuarios.png' });
}

async function openUserModal(page) {
    console.log('\n📝 PASO 3: ABRIR MODAL VER USUARIO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Obtener el primer usuario de la tabla
    const firstViewButton = await page.locator('#usersTable tbody tr button.btn-view').first();

    if (await firstViewButton.count() === 0) {
        throw new Error('❌ No se encontró ningún botón "Ver" en la tabla');
    }

    // Obtener nombre del usuario antes de abrir modal
    const userRow = await page.locator('#usersTable tbody tr').first();
    const userName = await userRow.locator('td').nth(1).textContent();
    console.log(`✓ Usuario seleccionado: ${userName}`);

    // Click en botón Ver
    await firstViewButton.click();
    console.log('✓ Click en botón "Ver"');
    await delay(2000);

    // Esperar modal
    const modal = await page.locator('#employeeFileModal');
    await modal.waitFor({ state: 'visible', timeout: CONFIG.timeout });
    console.log('✅ Modal abierto');

    // Verificar que TAB 1 esté visible
    const tab1 = await page.locator('.nav-link:has-text("Administración")');
    if (await tab1.count() > 0) {
        console.log('✅ TAB 1 "Administración" visible');
    } else {
        throw new Error('❌ TAB 1 no encontrado');
    }

    await page.screenshot({ path: 'test-tab1-03-modal-abierto.png' });

    return userName;
}

async function getUserId(page) {
    // Obtener userId del modal abierto
    // Método 1: Desde el DOM
    const modalTitle = await page.locator('#employeeFileModal .modal-title').textContent();
    console.log(`Modal title: ${modalTitle}`);

    // Método 2: Desde la primera fila de la tabla
    const firstRow = await page.locator('#usersTable tbody tr').first();
    const userId = await firstRow.getAttribute('data-user-id') || await firstRow.locator('td').first().textContent();

    console.log(`✓ User ID detectado: ${userId}`);
    return userId.trim();
}

async function testBug1_ActivarDesactivar(page, userName) {
    console.log('\n📝 TEST BUG #1: BOTÓN ACTIVAR/DESACTIVAR');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Obtener estado actual
    const estadoActual = await page.locator('#employeeFileModal #admin-tab span:has-text("Estado:")').locator('..').textContent();
    console.log(`Estado actual: ${estadoActual}`);

    const esActivo = estadoActual.includes('Activo');
    console.log(`¿Usuario activo?: ${esActivo}`);

    // Obtener rol actual ANTES del click
    const rolAntes = await page.locator('#employeeFileModal #admin-tab span:has-text("Rol:")').locator('..').textContent();
    console.log(`Rol ANTES: ${rolAntes}`);

    // Click en botón Activar/Desactivar
    const toggleButton = await page.locator('button:has-text("Desactivar Usuario"), button:has-text("Activar Usuario")').first();
    await toggleButton.click();
    console.log('✓ Click en botón Activar/Desactivar');
    await delay(1000);

    // Confirmar diálogo
    page.on('dialog', async dialog => {
        console.log(`Dialog: ${dialog.message()}`);
        await dialog.accept();
    });
    await delay(3000);

    // Esperar a que se recargue el modal
    await delay(3000);

    // Verificar que el modal se cerró y reabrió
    console.log('✓ Modal actualizado');

    // Obtener rol actual DESPUÉS del click
    const rolDespues = await page.locator('#employeeFileModal #admin-tab span:has-text("Rol:")').locator('..').textContent();
    console.log(`Rol DESPUÉS: ${rolDespues}`);

    // Verificar que el rol NO cambió
    if (rolAntes === rolDespues) {
        console.log('✅ TEST PASSED: El rol NO cambió (correcto)');
        await page.screenshot({ path: 'test-tab1-04-bug1-PASSED.png' });
        return true;
    } else {
        console.log('❌ TEST FAILED: El rol SÍ cambió (incorrecto)');
        console.log(`   Antes: ${rolAntes}`);
        console.log(`   Después: ${rolDespues}`);
        await page.screenshot({ path: 'test-tab1-04-bug1-FAILED.png' });
        return false;
    }
}

async function testBug2_GPS(page, userName) {
    console.log('\n📝 TEST BUG #2: BOTÓN GPS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Obtener estado GPS actual
    const gpsAntes = await page.locator('#employeeFileModal #admin-tab span:has-text("GPS:")').locator('..').textContent();
    console.log(`GPS ANTES: ${gpsAntes}`);

    const tieneRestriccion = gpsAntes.includes('Restringido') || gpsAntes.includes('área autorizada');
    console.log(`¿GPS restringido?: ${tieneRestriccion}`);

    // Click en botón GPS
    const gpsButton = await page.locator('button:has-text("Permitir fuera de área"), button:has-text("Restringir a área")').first();
    await gpsButton.click();
    console.log('✓ Click en botón GPS');
    await delay(1000);

    // Confirmar diálogo
    page.on('dialog', async dialog => {
        console.log(`Dialog: ${dialog.message()}`);
        await dialog.accept();
    });
    await delay(3000);

    // Esperar recarga del modal
    await delay(3000);

    // Obtener estado GPS DESPUÉS
    const gpsDespues = await page.locator('#employeeFileModal #admin-tab span:has-text("GPS:")').locator('..').textContent();
    console.log(`GPS DESPUÉS: ${gpsDespues}`);

    // Verificar que el GPS SÍ cambió
    if (gpsAntes !== gpsDespues) {
        console.log('✅ TEST PASSED: El GPS cambió correctamente');
        await page.screenshot({ path: 'test-tab1-05-bug2-PASSED.png' });
        return true;
    } else {
        console.log('❌ TEST FAILED: El GPS NO cambió');
        await page.screenshot({ path: 'test-tab1-05-bug2-FAILED.png' });
        return false;
    }
}

async function testBug3_AsignarSucursal(page, userName) {
    console.log('\n📝 TEST BUG #3: ASIGNAR SUCURSAL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Click en botón Configurar Sucursales
    const sucursalButton = await page.locator('button:has-text("Configurar Sucursales")').first();
    await sucursalButton.click();
    console.log('✓ Click en botón "Configurar Sucursales"');
    await delay(2000);

    // Esperar modal secundario
    const modalSucursal = await page.locator('#branchesModal');
    await modalSucursal.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Modal de sucursales abierto');

    await page.screenshot({ path: 'test-tab1-06-bug3-modal-sucursales.png' });

    // Verificar que el dropdown tiene opciones
    const dropdown = await page.locator('#branchesModal select').first();
    const opciones = await dropdown.locator('option').count();
    console.log(`Opciones encontradas: ${opciones}`);

    if (opciones > 0) {
        // Obtener texto de la primera opción
        const primeraOpcion = await dropdown.locator('option').first().textContent();
        console.log(`Primera opción: ${primeraOpcion}`);

        // Verificar si es sucursal o departamento
        const esDepartamento = primeraOpcion.toLowerCase().includes('ventas') ||
                              primeraOpcion.toLowerCase().includes('recursos humanos') ||
                              primeraOpcion.toLowerCase().includes('marketing');

        if (esDepartamento) {
            console.log('❌ TEST FAILED: El dropdown muestra DEPARTAMENTOS en vez de SUCURSALES');
            await page.screenshot({ path: 'test-tab1-06-bug3-FAILED.png' });
            return false;
        } else {
            console.log('✅ TEST PASSED: El dropdown muestra SUCURSALES correctamente');
            await page.screenshot({ path: 'test-tab1-06-bug3-PASSED.png' });
            return true;
        }
    } else {
        console.log('⚠️ WARNING: No hay opciones en el dropdown');
        await page.screenshot({ path: 'test-tab1-06-bug3-WARNING.png' });
        return false;
    }
}

async function testBug7_AsignarTurno(page, userName) {
    console.log('\n📝 TEST BUG #7: ASIGNAR TURNO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Cerrar modal de sucursales si está abierto
    const closeButton = await page.locator('#branchesModal .btn-close, #branchesModal button:has-text("Cerrar")');
    if (await closeButton.count() > 0) {
        await closeButton.first().click();
        await delay(1000);
    }

    // Click en botón Asignar Turno
    const turnoButton = await page.locator('button:has-text("Asignar Turno")').first();
    await turnoButton.click();
    console.log('✓ Click en botón "Asignar Turno"');

    // Esperar 5 segundos para ver si carga o se queda infinito
    await delay(5000);

    // Verificar si el modal de turnos se abrió
    const modalTurno = await page.locator('#shiftsModal, .modal:has-text("Asignar Turno")');
    const modalVisible = await modalTurno.count() > 0 && await modalTurno.isVisible();

    if (modalVisible) {
        console.log('✅ Modal de turnos abierto');

        // Verificar si hay un spinner o loading infinito
        const spinner = await page.locator('.spinner, .loading, [class*="spin"]');
        const haySpinner = await spinner.count() > 0 && await spinner.isVisible();

        if (haySpinner) {
            console.log('❌ TEST FAILED: Modal se quedó cargando infinitamente');
            await page.screenshot({ path: 'test-tab1-07-bug7-FAILED.png' });
            return false;
        } else {
            console.log('✅ TEST PASSED: Modal cargó correctamente sin spinner infinito');
            await page.screenshot({ path: 'test-tab1-07-bug7-PASSED.png' });
            return true;
        }
    } else {
        console.log('❌ TEST FAILED: Modal de turnos NO se abrió');
        await page.screenshot({ path: 'test-tab1-07-bug7-FAILED-no-modal.png' });
        return false;
    }
}

async function generateReport(results) {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║          📊 REPORTE DE TESTING - TAB 1                    ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    const total = Object.keys(results).length;
    const passed = Object.values(results).filter(r => r === true).length;
    const failed = total - passed;
    const percentage = ((passed / total) * 100).toFixed(1);

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success Rate: ${percentage}%`);
    console.log('');
    console.log('Detalles:');
    console.log('─────────────────────────────────────────────────────────────');

    for (const [bug, passed] of Object.entries(results)) {
        const status = passed ? '✅ PASSED' : '❌ FAILED';
        console.log(`${status} - ${bug}`);
    }

    console.log('─────────────────────────────────────────────────────────────');
    console.log('');

    if (failed === 0) {
        console.log('🎉 ¡TODOS LOS TESTS PASARON! El TAB 1 está 100% funcional.');
    } else {
        console.log(`⚠️ ${failed} test(s) fallaron. Revisar screenshots para más detalles.`);
    }

    console.log('');
    console.log('Screenshots generados:');
    console.log('  - test-tab1-01-login-exitoso.png');
    console.log('  - test-tab1-02-modulo-usuarios.png');
    console.log('  - test-tab1-03-modal-abierto.png');
    console.log('  - test-tab1-04-bug1-*.png');
    console.log('  - test-tab1-05-bug2-*.png');
    console.log('  - test-tab1-06-bug3-*.png');
    console.log('  - test-tab1-07-bug7-*.png');
    console.log('');
}

async function main() {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });

    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 }  // Tamaño estándar de monitor (ajustado para responsive)
    });

    const page = await context.newPage();

    const results = {};

    try {
        // Login
        await login(page);

        // Navegar a Usuarios
        await navigateToUsers(page);

        // Abrir modal Ver Usuario
        const userName = await openUserModal(page);

        // TEST BUG #1
        results['BUG #1: Botón Activar/Desactivar'] = await testBug1_ActivarDesactivar(page, userName);

        // TEST BUG #2
        results['BUG #2: Botón GPS'] = await testBug2_GPS(page, userName);

        // TEST BUG #3
        results['BUG #3: Asignar Sucursal'] = await testBug3_AsignarSucursal(page, userName);

        // TEST BUG #7
        results['BUG #7: Asignar Turno'] = await testBug7_AsignarTurno(page, userName);

        // Generar reporte
        await generateReport(results);

    } catch (error) {
        console.error('\n❌ ERROR DURANTE EL TEST:');
        console.error(error.message);
        console.error(error.stack);
        await page.screenshot({ path: 'test-tab1-ERROR.png' });
    } finally {
        await delay(3000);
        await browser.close();
    }
}

main();
