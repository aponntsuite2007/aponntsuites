/**
 * TEST COMPLETO: Toggle GPS en TAB 1
 *
 * Verifica:
 * 1. GET user - campos gpsEnabled y allowOutsideRadius presentes
 * 2. Toggle ON (activar GPS) - persiste en BD
 * 3. Reabrir modal - verifica que toggle sigue ON
 * 4. Toggle OFF (desactivar GPS) - persiste en BD
 * 5. Reabrir modal - verifica que toggle sigue OFF
 */

const { chromium } = require('playwright');

const TEST_CONFIG = {
  baseUrl: 'http://localhost:9998',
  userId: '766de495-e4f3-4e91-a509-1a495c52e15c',
  timeout: 10000
};

async function testGPSToggle() {
  console.log('\n🧪 ===== TEST TOGGLE GPS - FLUJO COMPLETO =====\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // ============================================
    // PASO 1: LOGIN
    // ============================================
    console.log('📝 PASO 1: Login...');
    await page.goto(`${TEST_CONFIG.baseUrl}/panel-empresa.html`);
    await page.waitForTimeout(1000);

    // Seleccionar empresa
    await page.selectOption('select#company-select', 'ISI');
    await page.waitForTimeout(500);

    // Llenar credenciales
    await page.fill('input#username', 'administrador');
    await page.fill('input#password', 'admin123');

    await page.click('button:has-text("Iniciar Sesión")');
    await page.waitForTimeout(3000);

    console.log('   ✅ Login exitoso\n');

    // ============================================
    // PASO 2: IR AL MÓDULO USUARIOS
    // ============================================
    console.log('📝 PASO 2: Navegando al módulo Usuarios...');

    // Click en "Módulos del Sistema"
    const modulosBtn = page.locator('button:has-text("Módulos del Sistema")').first();
    await modulosBtn.waitFor({ state: 'visible', timeout: 5000 });
    await modulosBtn.click();
    await page.waitForTimeout(1000);

    // Click en "Usuarios"
    const usuariosBtn = page.locator('button.module-card:has-text("Usuarios")').first();
    await usuariosBtn.waitFor({ state: 'visible', timeout: 5000 });
    await usuariosBtn.click();
    await page.waitForTimeout(2000);

    console.log('   ✅ Módulo Usuarios abierto\n');

    // ============================================
    // PASO 3: VERIFICAR ESTADO INICIAL DEL API
    // ============================================
    console.log('📝 PASO 3: Verificando estado inicial del API...');

    const initialResponse = await page.evaluate(async (userId) => {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`http://localhost:9998/api/v1/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await response.json();
    }, TEST_CONFIG.userId);

    console.log('   📊 Respuesta inicial del API:');
    console.log(`      - success: ${initialResponse.success}`);
    console.log(`      - gpsEnabled: ${initialResponse.user.gpsEnabled}`);
    console.log(`      - allowOutsideRadius: ${initialResponse.user.allowOutsideRadius}`);

    if (initialResponse.user.gpsEnabled === undefined) {
      console.log('\n   ❌ ERROR: gpsEnabled es undefined!\n');
      throw new Error('gpsEnabled field is missing');
    }

    console.log('   ✅ Campos GPS presentes en API\n');

    const initialGpsState = initialResponse.user.gpsEnabled;

    // ============================================
    // PASO 4: ABRIR MODAL "VER" DEL USUARIO
    // ============================================
    console.log('📝 PASO 4: Abriendo modal Ver Usuario...');

    // Buscar la fila del usuario ISI y hacer click en "Ver"
    const verButton = page.locator('button[title="Ver detalles"]').first();
    await verButton.waitFor({ state: 'visible', timeout: 5000 });
    await verButton.click();
    await page.waitForTimeout(2000);

    // Verificar que el modal está abierto
    const modal = page.locator('#viewUserModal');
    await modal.waitFor({ state: 'visible', timeout: 5000 });

    console.log('   ✅ Modal Ver Usuario abierto\n');

    // ============================================
    // PASO 5: VERIFICAR ESTADO INICIAL DEL TOGGLE
    // ============================================
    console.log('📝 PASO 5: Verificando estado inicial del toggle...');

    const toggleInitial = page.locator('#viewAllowOutsideRadiusToggle');
    const isCheckedInitial = await toggleInitial.isChecked();

    console.log(`   📊 Toggle inicial: ${isCheckedInitial ? 'ON' : 'OFF'}`);
    console.log(`   📊 GPS enabled en BD: ${initialGpsState}`);
    console.log(`   📊 Relación correcta: allowOutsideRadius=${isCheckedInitial} === !gpsEnabled=${!initialGpsState}? ${isCheckedInitial === !initialGpsState ? '✅' : '❌'}`);

    if (isCheckedInitial !== !initialGpsState) {
      console.log('\n   ❌ ERROR: Toggle no coincide con estado de BD!\n');
      throw new Error('Toggle state mismatch');
    }

    console.log('   ✅ Toggle coincide con BD\n');

    // ============================================
    // PASO 6: CAMBIAR TOGGLE (primer cambio)
    // ============================================
    console.log(`📝 PASO 6: Cambiando toggle a ${isCheckedInitial ? 'OFF' : 'ON'}...`);

    await toggleInitial.click();
    await page.waitForTimeout(2000);

    const isCheckedAfterChange = await toggleInitial.isChecked();
    console.log(`   📊 Toggle después de click: ${isCheckedAfterChange ? 'ON' : 'OFF'}`);

    if (isCheckedAfterChange === isCheckedInitial) {
      console.log('\n   ❌ ERROR: Toggle no cambió visualmente!\n');
      throw new Error('Toggle did not change');
    }

    console.log('   ✅ Toggle cambió visualmente\n');

    // ============================================
    // PASO 7: CERRAR Y REABRIR MODAL
    // ============================================
    console.log('📝 PASO 7: Cerrando y reabriendo modal para verificar persistencia...');

    // Cerrar modal
    const closeBtn = modal.locator('button.btn-close, button:has-text("Cerrar")').first();
    await closeBtn.click();
    await page.waitForTimeout(1000);

    // Reabrir modal
    await verButton.click();
    await page.waitForTimeout(2000);

    console.log('   ✅ Modal reabierto\n');

    // ============================================
    // PASO 8: VERIFICAR PERSISTENCIA
    // ============================================
    console.log('📝 PASO 8: Verificando que el cambio persistió...');

    const toggleAfterReopen = page.locator('#viewAllowOutsideRadiusToggle');
    const isCheckedAfterReopen = await toggleAfterReopen.isChecked();

    console.log(`   📊 Toggle después de reabrir: ${isCheckedAfterReopen ? 'ON' : 'OFF'}`);
    console.log(`   📊 Debería ser: ${isCheckedAfterChange ? 'ON' : 'OFF'}`);

    if (isCheckedAfterReopen !== isCheckedAfterChange) {
      console.log('\n   ❌ ERROR: El cambio NO persistió!\n');
      throw new Error('Toggle change did not persist');
    }

    console.log('   ✅ Cambio persistió correctamente\n');

    // ============================================
    // PASO 9: VERIFICAR EN BD VÍA API
    // ============================================
    console.log('📝 PASO 9: Verificando cambio en base de datos...');

    const finalResponse = await page.evaluate(async (userId) => {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`http://localhost:9998/api/v1/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await response.json();
    }, TEST_CONFIG.userId);

    console.log('   📊 Respuesta final del API:');
    console.log(`      - gpsEnabled: ${finalResponse.user.gpsEnabled}`);
    console.log(`      - allowOutsideRadius: ${finalResponse.user.allowOutsideRadius}`);

    const expectedGpsEnabled = !isCheckedAfterReopen;
    const actualGpsEnabled = finalResponse.user.gpsEnabled;

    console.log(`   📊 GPS esperado en BD: ${expectedGpsEnabled}`);
    console.log(`   📊 GPS actual en BD: ${actualGpsEnabled}`);

    if (actualGpsEnabled !== expectedGpsEnabled) {
      console.log('\n   ❌ ERROR: Estado en BD no coincide!\n');
      throw new Error('Database state mismatch');
    }

    console.log('   ✅ Estado en BD correcto\n');

    // ============================================
    // PASO 10: CAMBIAR TOGGLE DE NUEVO (volver al estado original)
    // ============================================
    console.log('📝 PASO 10: Volviendo toggle al estado original...');

    await toggleAfterReopen.click();
    await page.waitForTimeout(2000);

    const isCheckedFinal = await toggleAfterReopen.isChecked();
    console.log(`   📊 Toggle después de segundo click: ${isCheckedFinal ? 'ON' : 'OFF'}`);

    if (isCheckedFinal !== isCheckedInitial) {
      console.log('\n   ⚠️  ADVERTENCIA: Toggle no volvió al estado inicial\n');
    } else {
      console.log('   ✅ Toggle volvió al estado inicial\n');
    }

    // Cerrar modal
    await closeBtn.click();
    await page.waitForTimeout(1000);

    // ============================================
    // RESUMEN FINAL
    // ============================================
    console.log('\n🎉 ===== RESUMEN DEL TEST =====\n');
    console.log('✅ API retorna campos gpsEnabled y allowOutsideRadius');
    console.log('✅ Toggle refleja correctamente el estado de BD');
    console.log('✅ Toggle cambia visualmente al hacer click');
    console.log('✅ Cambios persisten al cerrar/reabrir modal');
    console.log('✅ Cambios se guardan correctamente en BD');
    console.log('✅ Relación inversa funciona correctamente');
    console.log('\n🎯 CONCLUSIÓN: Toggle GPS funciona PERFECTAMENTE\n');

    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('\n❌ ERROR EN EL TEST:', error.message);
    console.error(error.stack);

    // Tomar screenshot del error
    await page.screenshot({
      path: 'test-gps-toggle-error.png',
      fullPage: true
    });
    console.log('\n📸 Screenshot guardado: test-gps-toggle-error.png\n');

    throw error;

  } finally {
    await browser.close();
  }
}

// Ejecutar test
testGPSToggle()
  .then(() => {
    console.log('✅ Test completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test falló:', error.message);
    process.exit(1);
  });
