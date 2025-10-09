const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:9999';
const LOGIN_CREDENTIALS = {
  identifier: 'admin',
  password: '123456',
  companyId: 11
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(icon, message, color = 'reset') {
  console.log(`${colors[color]}${icon} ${message}${colors.reset}`);
}

async function loginToSystem(page) {
  log('🔐', 'Intentando login en panel-empresa.html...', 'cyan');

  await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle2' });

  // Esperar formulario de login
  await page.waitForSelector('#loginUsername', { timeout: 10000 });

  // Llenar formulario
  await page.type('#loginUsername', LOGIN_CREDENTIALS.identifier);
  await page.type('#loginPassword', LOGIN_CREDENTIALS.password);

  // Click en login
  await page.click('#loginButton');

  // Esperar que cargue el dashboard
  await page.waitForTimeout(2000);

  // Verificar que se haya logueado (buscar elemento del dashboard)
  const dashboardVisible = await page.$('.dashboard-container') !== null ||
                          await page.$('#mainContent') !== null;

  if (dashboardVisible) {
    log('✅', 'Login exitoso - Dashboard cargado', 'green');
    return true;
  } else {
    log('❌', 'Login falló - Dashboard no visible', 'red');
    return false;
  }
}

async function createUsers(page, count = 100) {
  log('\n👥', `CREANDO ${count} USUARIOS DESDE INTERFAZ...`, 'cyan');
  console.log('='.repeat(70));

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < count; i++) {
    try {
      const timestamp = Date.now() + i;

      // Navegar a módulo de usuarios
      await page.click('a[href="#usuarios"]').catch(() => {});
      await page.waitForTimeout(500);

      // Abrir modal de crear usuario
      const createButton = await page.$('button[onclick*="modalAgregarUsuario"]') ||
                          await page.$('button#btnNuevoUsuario') ||
                          await page.$('button:has-text("Nuevo Usuario")');

      if (!createButton) {
        log('⚠️', `Usuario ${i + 1}: No se encontró botón Nuevo Usuario`, 'yellow');
        failCount++;
        continue;
      }

      await createButton.click();
      await page.waitForTimeout(1000);

      // Llenar formulario del modal
      await page.evaluate((data) => {
        const fields = {
          '#txtLegajo': data.legajo,
          '#txtFirstName': data.firstName,
          '#txtLastName': data.lastName,
          '#txtEmail': data.email,
          '#txtDNI': data.dni,
          '#txtPassword': data.password,
          '#selectRole': data.role,
          '#selectDepartment': '1'
        };

        for (const [selector, value] of Object.entries(fields)) {
          const element = document.querySelector(selector);
          if (element) {
            element.value = value;
            // Trigger change event
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }, {
        legajo: `AUTO-${timestamp}`,
        firstName: `Usuario`,
        lastName: `Automatizado ${i + 1}`,
        email: `usuario${timestamp}@testing.com`,
        dni: `${30000000 + i}`,
        password: 'testing123',
        role: 'employee'
      });

      await page.waitForTimeout(500);

      // Guardar
      const saveButton = await page.$('button[onclick*="guardarUsuario"]') ||
                        await page.$('button#btnGuardarUsuario') ||
                        await page.$('button:has-text("Guardar")');

      if (saveButton) {
        await saveButton.click();
        await page.waitForTimeout(1500);

        // Verificar éxito (buscar mensaje de éxito o cerrar modal)
        const modalClosed = await page.$('.modal.show') === null;

        if (modalClosed) {
          successCount++;
          if ((i + 1) % 10 === 0) {
            log('✅', `Progreso: ${i + 1}/${count} usuarios creados`, 'green');
          }
        } else {
          log('⚠️', `Usuario ${i + 1}: Modal no se cerró, posible error`, 'yellow');
          failCount++;
          // Cerrar modal manualmente
          await page.click('.modal .close').catch(() => {});
          await page.waitForTimeout(500);
        }
      } else {
        log('⚠️', `Usuario ${i + 1}: No se encontró botón Guardar`, 'yellow');
        failCount++;
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }

    } catch (error) {
      log('❌', `Usuario ${i + 1}: Error - ${error.message}`, 'red');
      failCount++;
      // Intentar cerrar cualquier modal abierto
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  console.log('\n' + '='.repeat(70));
  log('📊', 'RESUMEN CREACIÓN DE USUARIOS:', 'cyan');
  log('✅', `Exitosos: ${successCount}`, 'green');
  log('❌', `Fallidos: ${failCount}`, 'red');
  log('📈', `Tasa de éxito: ${((successCount/count)*100).toFixed(1)}%`, 'blue');
  console.log('='.repeat(70) + '\n');
}

async function createDepartments(page, count = 50) {
  log('\n🏢', `CREANDO ${count} DEPARTAMENTOS DESDE INTERFAZ...`, 'cyan');
  console.log('='.repeat(70));

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < count; i++) {
    try {
      const timestamp = Date.now() + i;

      // Navegar a módulo de departamentos
      await page.click('a[href="#departamentos"]').catch(() => {});
      await page.waitForTimeout(500);

      // Abrir modal de crear departamento
      const createButton = await page.$('button[onclick*="modalAgregarDepartamento"]') ||
                          await page.$('button#btnNuevoDepartamento');

      if (!createButton) {
        log('⚠️', `Departamento ${i + 1}: No se encontró botón`, 'yellow');
        failCount++;
        continue;
      }

      await createButton.click();
      await page.waitForTimeout(1000);

      // Llenar formulario
      await page.evaluate((data) => {
        const fields = {
          '#txtNombreDepartamento': data.name,
          '#txtDescripcionDepartamento': data.description,
          '#txtCodigoDepartamento': data.code,
          '#selectSucursal': '1',
          '#txtLatitud': data.lat,
          '#txtLongitud': data.lng,
          '#txtRadio': data.radius
        };

        for (const [selector, value] of Object.entries(fields)) {
          const element = document.querySelector(selector);
          if (element) {
            element.value = value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }, {
        name: `Departamento Auto ${i + 1}`,
        description: `Departamento creado automáticamente`,
        code: `DEPT-AUTO-${timestamp}`,
        lat: -25.2637 + (Math.random() * 0.01),
        lng: -57.5759 + (Math.random() * 0.01),
        radius: 100
      });

      await page.waitForTimeout(500);

      // Guardar
      const saveButton = await page.$('button[onclick*="guardarDepartamento"]') ||
                        await page.$('button#btnGuardarDepartamento');

      if (saveButton) {
        await saveButton.click();
        await page.waitForTimeout(1500);

        const modalClosed = await page.$('.modal.show') === null;

        if (modalClosed) {
          successCount++;
          if ((i + 1) % 10 === 0) {
            log('✅', `Progreso: ${i + 1}/${count} departamentos creados`, 'green');
          }
        } else {
          failCount++;
          await page.click('.modal .close').catch(() => {});
          await page.waitForTimeout(500);
        }
      } else {
        failCount++;
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }

    } catch (error) {
      log('❌', `Departamento ${i + 1}: Error - ${error.message}`, 'red');
      failCount++;
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  console.log('\n' + '='.repeat(70));
  log('📊', 'RESUMEN CREACIÓN DE DEPARTAMENTOS:', 'cyan');
  log('✅', `Exitosos: ${successCount}`, 'green');
  log('❌', `Fallidos: ${failCount}`, 'red');
  log('📈', `Tasa de éxito: ${((successCount/count)*100).toFixed(1)}%`, 'blue');
  console.log('='.repeat(70) + '\n');
}

async function createShifts(page, count = 30) {
  log('\n⏰', `CREANDO ${count} TURNOS DESDE INTERFAZ...`, 'cyan');
  console.log('='.repeat(70));

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < count; i++) {
    try {
      const timestamp = Date.now() + i;

      // Navegar a módulo de turnos
      await page.click('a[href="#turnos"]').catch(() => {});
      await page.waitForTimeout(500);

      // Abrir modal de crear turno
      const createButton = await page.$('button[onclick*="modalAgregarTurno"]') ||
                          await page.$('button#btnNuevoTurno');

      if (!createButton) {
        log('⚠️', `Turno ${i + 1}: No se encontró botón`, 'yellow');
        failCount++;
        continue;
      }

      await createButton.click();
      await page.waitForTimeout(1000);

      // Llenar formulario
      await page.evaluate((data) => {
        const fields = {
          '#txtNombreTurno': data.name,
          '#txtHoraEntrada': data.startTime,
          '#txtHoraSalida': data.endTime,
          '#txtToleranciaEntrada': data.tolerance,
          '#txtTolerancia Salida': data.tolerance
        };

        for (const [selector, value] of Object.entries(fields)) {
          const element = document.querySelector(selector);
          if (element) {
            element.value = value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }, {
        name: `Turno Auto ${i + 1}`,
        startTime: '08:00',
        endTime: '17:00',
        tolerance: 15
      });

      await page.waitForTimeout(500);

      // Guardar
      const saveButton = await page.$('button[onclick*="guardarTurno"]') ||
                        await page.$('button#btnGuardarTurno');

      if (saveButton) {
        await saveButton.click();
        await page.waitForTimeout(1500);

        const modalClosed = await page.$('.modal.show') === null;

        if (modalClosed) {
          successCount++;
          if ((i + 1) % 10 === 0) {
            log('✅', `Progreso: ${i + 1}/${count} turnos creados`, 'green');
          }
        } else {
          failCount++;
          await page.click('.modal .close').catch(() => {});
          await page.waitForTimeout(500);
        }
      } else {
        failCount++;
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }

    } catch (error) {
      log('❌', `Turno ${i + 1}: Error - ${error.message}`, 'red');
      failCount++;
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  console.log('\n' + '='.repeat(70));
  log('📊', 'RESUMEN CREACIÓN DE TURNOS:', 'cyan');
  log('✅', `Exitosos: ${successCount}`, 'green');
  log('❌', `Fallidos: ${failCount}`, 'red');
  log('📈', `Tasa de éxito: ${((successCount/count)*100).toFixed(1)}%`, 'blue');
  console.log('='.repeat(70) + '\n');
}

async function testUserModuleEndToEnd(page) {
  log('\n🔍', 'TESTING MÓDULO USUARIOS END-TO-END...', 'cyan');
  console.log('='.repeat(70));

  const tests = [];

  // Test 1: Verificar que la lista carga
  try {
    await page.click('a[href="#usuarios"]');
    await page.waitForTimeout(1000);

    const hasTable = await page.$('table') !== null || await page.$('.user-list') !== null;
    tests.push({ test: 'Lista de usuarios carga', passed: hasTable });
  } catch (e) {
    tests.push({ test: 'Lista de usuarios carga', passed: false, error: e.message });
  }

  // Test 2: Botón nuevo usuario funciona
  try {
    const btn = await page.$('button[onclick*="modalAgregarUsuario"]');
    tests.push({ test: 'Botón Nuevo Usuario existe', passed: btn !== null });
  } catch (e) {
    tests.push({ test: 'Botón Nuevo Usuario existe', passed: false, error: e.message });
  }

  // Test 3: Campos del formulario existen
  try {
    await page.click('button[onclick*="modalAgregarUsuario"]');
    await page.waitForTimeout(1000);

    const fields = [
      '#txtLegajo',
      '#txtFirstName',
      '#txtLastName',
      '#txtEmail',
      '#txtDNI',
      '#txtPassword',
      '#selectRole',
      '#selectDepartment'
    ];

    let allFieldsExist = true;
    for (const field of fields) {
      const exists = await page.$(field) !== null;
      if (!exists) {
        allFieldsExist = false;
        log('⚠️', `Campo ${field} no encontrado`, 'yellow');
      }
    }

    tests.push({ test: 'Todos los campos del formulario existen', passed: allFieldsExist });

    // Cerrar modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } catch (e) {
    tests.push({ test: 'Todos los campos del formulario existen', passed: false, error: e.message });
  }

  // Test 4: Buscar funciona
  try {
    const searchInput = await page.$('input[placeholder*="Buscar"]') ||
                       await page.$('input#txtBuscarUsuario');
    tests.push({ test: 'Campo de búsqueda existe', passed: searchInput !== null });
  } catch (e) {
    tests.push({ test: 'Campo de búsqueda existe', passed: false, error: e.message });
  }

  // Mostrar resultados
  console.log('\n📋 RESULTADOS DE TESTS:');
  tests.forEach((t, i) => {
    const status = t.passed ? '✅' : '❌';
    const color = t.passed ? 'green' : 'red';
    log(status, `${i + 1}. ${t.test}`, color);
    if (t.error) {
      log('  ', `   Error: ${t.error}`, 'yellow');
    }
  });

  const passedCount = tests.filter(t => t.passed).length;
  console.log('\n' + '='.repeat(70));
  log('📊', `Tests pasados: ${passedCount}/${tests.length}`, passedCount === tests.length ? 'green' : 'yellow');
  console.log('='.repeat(70) + '\n');
}

async function run() {
  console.log('\n' + '='.repeat(70));
  log('🚀', 'INICIANDO TESTING AUTOMATIZADO DE FRONTEND', 'cyan');
  console.log('='.repeat(70) + '\n');

  const browser = await puppeteer.launch({
    headless: false, // Mostrar navegador para que el usuario pueda ver
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  try {
    // Login
    const loginSuccess = await loginToSystem(page);

    if (!loginSuccess) {
      log('❌', 'No se pudo hacer login. Abortando tests.', 'red');
      await browser.close();
      process.exit(1);
    }

    // Testing end-to-end del módulo de usuarios
    await testUserModuleEndToEnd(page);

    // Crear 100+ usuarios
    await createUsers(page, 100);

    // Crear 50 departamentos
    await createDepartments(page, 50);

    // Crear 30 turnos
    await createShifts(page, 30);

    console.log('\n' + '='.repeat(70));
    log('🎉', 'TESTING AUTOMATIZADO COMPLETADO', 'green');
    console.log('='.repeat(70) + '\n');

    log('💡', 'Navegador permanecerá abierto para inspección manual', 'blue');
    log('💡', 'Presiona Ctrl+C para cerrar', 'blue');

    // Mantener navegador abierto
    await page.waitForTimeout(3600000); // 1 hora

  } catch (error) {
    log('❌', `Error fatal: ${error.message}`, 'red');
    console.error(error);
  } finally {
    // No cerrar automáticamente para que el usuario pueda inspeccionar
    // await browser.close();
  }
}

run();
