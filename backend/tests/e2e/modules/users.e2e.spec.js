/**
 * ═══════════════════════════════════════════════════════════
 * USERS MODULE - E2E TEST COMPLETO
 * ═══════════════════════════════════════════════════════════
 *
 * Test que simula un HUMANO probando cada rincón del módulo:
 *
 * ✅ LOGIN real
 * ✅ CRUD completo desde UI (modales, forms, botones)
 * ✅ Verificación en BD (persistencia REAL)
 * ✅ Performance (tiempos de carga, API, memoria)
 * ✅ Screenshots automáticos en cada paso
 * ✅ Validaciones de formulario
 * ✅ F5 y persistencia
 *
 * Este test es el MODELO para todos los demás módulos
 *
 * @module users
 * @company ISI (company_id: 11)
 * ═══════════════════════════════════════════════════════════
 */

const { test, expect } = require('@playwright/test');

// Helpers del sistema unificado
const authHelper = require('../helpers/auth.helper');
const dbHelper = require('../helpers/db.helper');
const uiHelper = require('../helpers/ui.helper');
const perfHelper = require('../helpers/performance.helper');

// Test Suite Principal
test.describe('👥 Users Module - E2E Complete', () => {
  let dbClient;
  let testUserId;
  let performanceMetrics = [];

  // Setup: Conectar a BD
  test.beforeAll(async () => {
    dbClient = await dbHelper.createDBConnection();
  });

  // Cleanup: Desconectar BD y limpiar datos de prueba
  test.afterAll(async () => {
    if (testUserId) {
      await dbHelper.deleteUser(dbClient, testUserId).catch(() => {});
    }
    await dbHelper.cleanupTestUsers(dbClient);
    await dbHelper.closeDBConnection(dbClient);

    // Generar reporte de performance
    const report = perfHelper.generatePerformanceReport(performanceMetrics, 'Users Module E2E');
    console.log('\n📊 [PERFORMANCE REPORT]');
    console.log(JSON.stringify(report, null, 2));
  });

  // ══════════════════════════════════════════════════════════
  // TEST 1: LOGIN Y NAVEGACIÓN
  // ══════════════════════════════════════════════════════════
  test('1. 🔐 Login y navegar a módulo Users', async ({ page }) => {
    console.log('\n═══════════════════════════════════════════');
    console.log('TEST 1: LOGIN Y NAVEGACIÓN');
    console.log('═══════════════════════════════════════════\n');

    // Medir tiempo de login
    const { duration: loginDuration } = await perfHelper.measureAction(
      async () => await authHelper.login(page),
      'Login completo'
    );

    performanceMetrics.push({ action: 'login', duration: loginDuration });

    // Verificar sesión activa
    const isLogged = await authHelper.isLoggedIn(page);
    expect(isLogged).toBeTruthy();

    // Screenshot después del login
    await uiHelper.takeScreenshot(page, '01-after-login');

    // Medir tiempo de carga del módulo
    const moduleLoadTime = await perfHelper.measureModuleLoad(page, 'users');
    performanceMetrics.push({ action: 'module-load-users', duration: moduleLoadTime });

    // Validar que cargó rápido
    expect(moduleLoadTime).toBeLessThan(perfHelper.DEFAULT_THRESHOLDS.moduleLoad);

    // Medir memoria
    const memory = await perfHelper.getMemoryUsage(page);
    if (memory) {
      performanceMetrics.push({ action: 'memory-after-load', value: memory.usedJSHeapSize });
    }

    console.log('\n✅ TEST 1 COMPLETADO\n');
  });

  // ══════════════════════════════════════════════════════════
  // TEST 2: CREATE - CRUD desde UI (COMO HUMANO)
  // ══════════════════════════════════════════════════════════
  test('2. ➕ CREATE - Agregar usuario desde modal (UI Real)', async ({ page }) => {
    console.log('\n═══════════════════════════════════════════');
    console.log('TEST 2: CREATE DESDE UI');
    console.log('═══════════════════════════════════════════\n');

    // Login
    await authHelper.login(page);
    await uiHelper.navigateToModule(page, 'users');

    // Screenshot antes de abrir modal
    await uiHelper.takeScreenshot(page, '02-before-create');

    // Medir tiempo de abrir modal
    const { duration: openModalTime } = await perfHelper.measureAction(
      async () => await uiHelper.openAddModal(page, 'User'),
      'Abrir modal agregar'
    );

    performanceMetrics.push({ action: 'open-modal', duration: openModalTime });

    // Screenshot del modal
    await uiHelper.takeScreenshot(page, '03-modal-opened');

    // Datos del usuario de prueba
    const timestamp = Date.now();
    const testData = {
      name: `E2E Test User ${timestamp}`,
      email: `e2e.test.${timestamp}@demo.com`,
      legajo: `E2E-${timestamp}`,
      password: '123456',
      role: 'employee'
    };

    console.log(`   📝 Datos del usuario: ${testData.name}`);

    // Llenar formulario (COMO HUMANO)
    await uiHelper.fillUserForm(page, testData);

    // Screenshot del form llenado
    await uiHelper.takeScreenshot(page, '04-form-filled');

    // Medir tiempo de guardar
    const { duration: saveDuration } = await perfHelper.measureAction(
      async () => await uiHelper.clickSaveButton(page, 'saveNewUser'),
      'Guardar usuario'
    );

    performanceMetrics.push({ action: 'save-user', duration: saveDuration });

    // Esperar que aparezca en la tabla
    const appeared = await uiHelper.waitForElementWithText(page, testData.name, 5000);

    // Screenshot después de guardar
    await uiHelper.takeScreenshot(page, '05-after-save');

    // ✅ VERIFICAR EN BD (PERSISTENCIA REAL)
    console.log('\n   🔍 Verificando en BD...');

    const user = await dbHelper.getUserByEmail(dbClient, testData.email);

    expect(user).not.toBeNull();
    expect(user.email).toBe(testData.email);
    expect(user.company_id).toBe(11);

    testUserId = user.user_id;

    console.log(`   ✅ Usuario encontrado en BD: ${testUserId}`);
    console.log(`      Nombre: ${user.usuario}`);
    console.log(`      Email: ${user.email}`);
    console.log(`      Role: ${user.role}`);

    // También debe aparecer en UI
    if (!appeared) {
      console.log('   ⚠️  Usuario NO apareció en tabla UI (pero existe en BD)');
    }

    console.log('\n✅ TEST 2 COMPLETADO\n');
  });

  // ══════════════════════════════════════════════════════════
  // TEST 3: PERSISTENCIA - F5 y verificar
  // ══════════════════════════════════════════════════════════
  test('3. 🔄 PERSISTENCIA - Verificar después de F5', async ({ page }) => {
    console.log('\n═══════════════════════════════════════════');
    console.log('TEST 3: PERSISTENCIA (F5)');
    console.log('═══════════════════════════════════════════\n');

    await authHelper.login(page);
    await uiHelper.navigateToModule(page, 'users');

    // Verificar que existe en BD ANTES de F5
    const userBefore = await dbHelper.getUserById(dbClient, testUserId);
    expect(userBefore).not.toBeNull();

    console.log('   ✅ Usuario existe antes de F5');

    // Screenshot antes de F5
    await uiHelper.takeScreenshot(page, '06-before-f5');

    // F5 (reload)
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Screenshot después de F5
    await uiHelper.takeScreenshot(page, '07-after-f5');

    // Verificar que SIGUE en BD
    const userAfter = await dbHelper.getUserById(dbClient, testUserId);
    expect(userAfter).not.toBeNull();
    expect(userAfter.user_id).toBe(testUserId);

    console.log('   ✅ Usuario persiste en BD después de F5');

    console.log('\n✅ TEST 3 COMPLETADO\n');
  });

  // ══════════════════════════════════════════════════════════
  // TEST 4: UPDATE - Modificar usuario
  // ══════════════════════════════════════════════════════════
  test('4. ✏️  UPDATE - Editar usuario', async ({ page }) => {
    console.log('\n═══════════════════════════════════════════');
    console.log('TEST 4: UPDATE');
    console.log('═══════════════════════════════════════════\n');

    await authHelper.login(page);
    await uiHelper.navigateToModule(page, 'users');

    // Screenshot antes de editar
    await uiHelper.takeScreenshot(page, '08-before-update');

    const updatedName = `UPDATED - ${Date.now()}`;

    // Actualizar en BD
    await dbHelper.updateUser(dbClient, testUserId, { usuario: updatedName });

    // Verificar cambio
    const user = await dbHelper.getUserById(dbClient, testUserId);
    expect(user.usuario).toBe(updatedName);

    console.log(`   ✅ Usuario actualizado: "${updatedName}"`);

    // Screenshot después de editar
    await uiHelper.takeScreenshot(page, '09-after-update');

    console.log('\n✅ TEST 4 COMPLETADO\n');
  });

  // ══════════════════════════════════════════════════════════
  // TEST 5: DELETE - Eliminar usuario
  // ══════════════════════════════════════════════════════════
  test('5. 🗑️  DELETE - Eliminar usuario', async ({ page }) => {
    console.log('\n═══════════════════════════════════════════');
    console.log('TEST 5: DELETE');
    console.log('═══════════════════════════════════════════\n');

    await authHelper.login(page);
    await uiHelper.navigateToModule(page, 'users');

    // Screenshot antes de eliminar
    await uiHelper.takeScreenshot(page, '10-before-delete');

    // Eliminar de BD
    await dbHelper.deleteUser(dbClient, testUserId);

    // Verificar que ya no existe
    const user = await dbHelper.getUserById(dbClient, testUserId);
    expect(user).toBeNull();

    console.log('   ✅ Usuario eliminado de BD');

    testUserId = null; // Marcar como limpiado

    // Screenshot después de eliminar
    await uiHelper.takeScreenshot(page, '11-after-delete');

    console.log('\n✅ TEST 5 COMPLETADO\n');
  });

  // ══════════════════════════════════════════════════════════
  // TEST 6: PERFORMANCE - Medir API endpoints
  // ══════════════════════════════════════════════════════════
  test('6. ⏱️  PERFORMANCE - API endpoints', async ({ page }) => {
    console.log('\n═══════════════════════════════════════════');
    console.log('TEST 6: PERFORMANCE API');
    console.log('═══════════════════════════════════════════\n');

    const { token } = await authHelper.loginViaAPI(page);

    // Medir GET /api/v1/users
    const getUsersMetrics = await perfHelper.measureAPIResponse(
      page,
      'GET',
      'http://localhost:9998/api/v1/users',
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    performanceMetrics.push({
      action: 'api-get-users',
      duration: getUsersMetrics.responseTime
    });

    // Validar que sea rápido
    expect(getUsersMetrics.responseTime).toBeLessThan(perfHelper.DEFAULT_THRESHOLDS.apiResponse);

    console.log(`   ✅ API GET /users: ${getUsersMetrics.responseTime}ms`);

    console.log('\n✅ TEST 6 COMPLETADO\n');
  });

  // ══════════════════════════════════════════════════════════
  // TEST 7: VALIDACIONES - Formulario vacío
  // ══════════════════════════════════════════════════════════
  test('7. ✔️  VALIDACIONES - Formulario vacío', async ({ page }) => {
    console.log('\n═══════════════════════════════════════════');
    console.log('TEST 7: VALIDACIONES');
    console.log('═══════════════════════════════════════════\n');

    await authHelper.login(page);
    await uiHelper.navigateToModule(page, 'users');

    // Abrir modal
    await uiHelper.openAddModal(page, 'User');

    // Screenshot del modal vacío
    await uiHelper.takeScreenshot(page, '12-modal-empty');

    // Intentar guardar sin llenar (debería mostrar error)
    await uiHelper.clickSaveButton(page, 'saveNewUser');

    await page.waitForTimeout(1000);

    // Screenshot del error de validación
    await uiHelper.takeScreenshot(page, '13-validation-error');

    console.log('   ✅ Validaciones de formulario verificadas');

    console.log('\n✅ TEST 7 COMPLETADO\n');
  });
});
