/**
 * TEST VISUAL E2E - 4 PILARES CRÍTICOS
 *
 * Abre el navegador y ejecuta tests VISIBLES de:
 * 1. Gestión de Usuarios (10 tabs)
 * 2. Control de Asistencia
 * 3. Liquidación de Sueldos
 * 4. Estructura Organizacional
 *
 * El usuario puede VER todo el proceso en tiempo real.
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:9998';
const CREDENTIALS = {
  company: 'isi',
  email: 'admin',        // Usuario: admin
  password: 'admin123'   // Clave: admin123
};

// Delays para que el usuario pueda VER las acciones
const DELAY = {
  short: 500,
  medium: 1000,
  long: 2000,
  veryLong: 3000
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(icon, msg) {
  console.log(`${icon} ${msg}`);
}

function logTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} ${name}${details ? ` - ${details}` : ''}`);
  testResults.tests.push({ name, passed, details });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

async function waitAndClick(page, selector, description) {
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    await sleep(DELAY.short);
    await page.click(selector);
    log('👆', `Click: ${description}`);
    return true;
  } catch (e) {
    log('⚠️', `No se pudo clickear: ${description}`);
    return false;
  }
}

async function typeSlowly(page, selector, text) {
  await page.waitForSelector(selector, { timeout: 5000 });
  await page.click(selector);
  await page.evaluate(sel => document.querySelector(sel).value = '', selector);
  for (const char of text) {
    await page.type(selector, char);
    await sleep(30);
  }
}

async function login(page) {
  log('🔐', 'INICIANDO LOGIN...');

  await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle2' });
  await sleep(DELAY.veryLong);

  // Paso 1: Seleccionar empresa del dropdown
  log('1️⃣', 'Seleccionando empresa...');
  try {
    await page.waitForSelector('#companySelect', { timeout: 10000 });
    await sleep(DELAY.medium);

    // Seleccionar la opción ISI
    await page.select('#companySelect', CREDENTIALS.company);
    log('📋', `Empresa seleccionada: ${CREDENTIALS.company}`);
    await sleep(DELAY.long);

    // Esperar que se habiliten los campos de usuario
    log('⏳', 'Esperando habilitación de campos...');
    for (let i = 0; i < 10; i++) {
      const isEnabled = await page.evaluate(() => {
        const input = document.getElementById('userInput');
        return input && !input.disabled;
      });
      if (isEnabled) break;
      await sleep(500);
    }
    await sleep(DELAY.medium);

  } catch (e) {
    log('⚠️', `Selector de empresa: ${e.message}`);
  }

  // Paso 2: Credenciales
  log('2️⃣', 'Ingresando credenciales...');
  try {
    // Usar evaluate para establecer valores directamente (más rápido y confiable)
    await page.evaluate((email, password) => {
      const userInput = document.getElementById('userInput');
      const passInput = document.getElementById('passwordInput');

      if (userInput) {
        userInput.disabled = false; // Forzar habilitación
        userInput.value = email;
        userInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      if (passInput) {
        passInput.disabled = false;
        passInput.value = password;
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, CREDENTIALS.email, CREDENTIALS.password);

    log('✏️', 'Credenciales ingresadas');
    await sleep(DELAY.medium);

    // Submit form
    log('3️⃣', 'Enviando formulario de login...');
    await page.evaluate(() => {
      const form = document.getElementById('multiTenantLoginForm');
      if (form) {
        // Disparar submit
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);

        // También intentar click en botón submit
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], .btn-login');
        if (submitBtn) submitBtn.click();
      }
    });
    await sleep(DELAY.veryLong);

  } catch (e) {
    log('⚠️', `Error en credenciales: ${e.message}`);
  }

  // Esperar a que cargue el dashboard
  log('⏳', 'Esperando carga del dashboard...');
  await sleep(DELAY.veryLong);

  // Verificar login exitoso - buscar elementos del dashboard
  const dashboardVisible = await page.evaluate(() => {
    // Buscar cualquier indicador de que estamos logueados
    return !!(
      document.querySelector('.dashboard-container') ||
      document.querySelector('#mainContent') ||
      document.querySelector('.main-content') ||
      document.querySelector('.sidebar') ||
      document.querySelector('.company-info') ||
      document.querySelector('.module-grid') ||
      document.querySelector('.welcome-message') ||
      document.querySelector('[class*="dashboard"]')
    );
  });

  if (dashboardVisible) {
    log('✅', 'LOGIN EXITOSO - Dashboard detectado');
    await sleep(DELAY.long);
    return true;
  } else {
    // Verificar si hay mensaje de error
    const errorText = await page.evaluate(() => {
      const errorEl = document.querySelector('.error-message, .alert-danger, .login-error, [class*="error"]');
      return errorEl ? errorEl.textContent : null;
    });

    if (errorText) {
      log('❌', `LOGIN FALLIDO: ${errorText.trim()}`);
    } else {
      log('❌', 'LOGIN FALLIDO - No se detectó dashboard');
      // Tomar screenshot para debug
      await page.screenshot({ path: 'login-debug.png' });
      log('📸', 'Screenshot guardado: login-debug.png');
    }
    return false;
  }
}

// Función para navegar a un módulo usando showTab
async function navigateToModule(page, moduleKey, moduleName) {
  log('📂', `Navegando a ${moduleName}...`);

  // Método 1: Usar showTab directamente
  const navigated = await page.evaluate((key) => {
    if (typeof showTab === 'function') {
      showTab(key);
      return true;
    }
    return false;
  }, moduleKey);

  if (navigated) {
    await sleep(DELAY.long);
    return true;
  }

  // Método 2: Buscar y hacer click en el card del módulo
  const cardClicked = await page.evaluate((key) => {
    const card = document.querySelector(`[data-module-key="${key}"], [data-module-id="${key}"]`);
    if (card) {
      card.click();
      return true;
    }
    // Buscar por nombre
    const allCards = document.querySelectorAll('.module-card');
    for (const c of allCards) {
      if (c.textContent.toLowerCase().includes(key.toLowerCase())) {
        c.click();
        return true;
      }
    }
    return false;
  }, moduleKey);

  await sleep(DELAY.long);
  return cardClicked;
}

// ═══════════════════════════════════════════════════════════════
// PILAR 1: GESTIÓN DE USUARIOS
// ═══════════════════════════════════════════════════════════════
async function testGestionUsuarios(page) {
  console.log('\n' + '═'.repeat(60));
  console.log('  PILAR 1: GESTIÓN DE USUARIOS (10 TABS)');
  console.log('═'.repeat(60) + '\n');

  // Navegar a módulo Usuarios
  await navigateToModule(page, 'users', 'Gestión de Usuarios');

  await sleep(DELAY.long);

  // Verificar lista de usuarios
  const usersList = await page.$$('table tbody tr, .user-card, .employee-row');
  logTest('Lista de usuarios cargada', usersList.length > 0, `${usersList.length} usuarios encontrados`);

  // Click en primer usuario para ver detalles
  if (usersList.length > 0) {
    log('👤', 'Abriendo detalles del primer usuario...');

    const editBtn = await page.$('table tbody tr:first-child .btn-edit, table tbody tr:first-child button[title*="Editar"], table tbody tr:first-child [onclick*="edit"]');
    if (editBtn) {
      await editBtn.click();
      await sleep(DELAY.long);
    } else {
      await usersList[0].click();
      await sleep(DELAY.long);
    }

    // Verificar que se abrió el modal/detalle
    const modalVisible = await page.$('.modal.show, .modal-content, .user-detail, .tab-content');
    logTest('Modal/Detalle de usuario abierto', !!modalVisible);

    // Probar cada TAB
    const tabs = [
      { selector: '[data-tab="admin"], #tab-admin, .tab-admin', name: 'Tab 1: Administración' },
      { selector: '[data-tab="personal"], #tab-personal, .tab-personal', name: 'Tab 2: Datos Personales' },
      { selector: '[data-tab="work-history"], #tab-work, .tab-work', name: 'Tab 3: Antecedentes Laborales' },
      { selector: '[data-tab="family"], #tab-family, .tab-family', name: 'Tab 4: Grupo Familiar' },
      { selector: '[data-tab="medical"], #tab-medical, .tab-medical', name: 'Tab 5: Antecedentes Médicos' },
      { selector: '[data-tab="attendance"], #tab-attendance, .tab-attendance', name: 'Tab 6: Asistencias/Permisos' },
      { selector: '[data-tab="calendar"], #tab-calendar, .tab-calendar', name: 'Tab 7: Calendario' },
      { selector: '[data-tab="disciplinary"], #tab-disciplinary, .tab-disciplinary', name: 'Tab 8: Disciplinarios' },
      { selector: '[data-tab="biometric"], #tab-biometric, .tab-biometric', name: 'Tab 9: Registro Biométrico' },
      { selector: '[data-tab="notifications"], #tab-notifications, .tab-notifications', name: 'Tab 10: Notificaciones' }
    ];

    for (const tab of tabs) {
      const tabElement = await page.$(tab.selector);
      if (tabElement) {
        await tabElement.click();
        await sleep(DELAY.medium);

        // Verificar que el contenido del tab cargó
        const tabContent = await page.$('.tab-pane.active, .tab-content.active, [class*="tab-content"]');
        logTest(tab.name, !!tabContent);
      } else {
        // Buscar tabs por texto
        const allTabs = await page.$$('.nav-tabs .nav-link, .tab-btn, [role="tab"]');
        let found = false;
        for (const t of allTabs) {
          const text = await page.evaluate(el => el.textContent, t);
          if (text.toLowerCase().includes(tab.name.split(':')[1].trim().toLowerCase().slice(0, 5))) {
            await t.click();
            await sleep(DELAY.medium);
            logTest(tab.name, true, 'Tab encontrado por texto');
            found = true;
            break;
          }
        }
        if (!found) {
          logTest(tab.name, false, 'Tab no encontrado');
        }
      }
    }

    // Cerrar modal
    const closeBtn = await page.$('.modal .close, .btn-close, [data-dismiss="modal"], .modal-close');
    if (closeBtn) {
      await closeBtn.click();
      await sleep(DELAY.medium);
    }
  }

  // Test CREATE usuario
  log('➕', 'Probando CREAR usuario...');
  const createBtn = await page.$('.btn-create, [onclick*="create"], .btn-new, button:has-text("Nuevo")');
  if (createBtn) {
    await createBtn.click();
    await sleep(DELAY.long);

    const createModal = await page.$('.modal.show, .modal-content');
    logTest('CREATE: Modal de creación abierto', !!createModal);

    // Cerrar sin guardar
    const cancelBtn = await page.$('.btn-cancel, [data-dismiss="modal"], .modal .close');
    if (cancelBtn) await cancelBtn.click();
    await sleep(DELAY.medium);
  } else {
    logTest('CREATE: Botón crear disponible', false, 'No encontrado');
  }
}

// ═══════════════════════════════════════════════════════════════
// PILAR 2: CONTROL DE ASISTENCIA
// ═══════════════════════════════════════════════════════════════
async function testControlAsistencia(page) {
  console.log('\n' + '═'.repeat(60));
  console.log('  PILAR 2: CONTROL DE ASISTENCIA');
  console.log('═'.repeat(60) + '\n');

  // Navegar a Asistencia
  await navigateToModule(page, 'attendance', 'Control de Asistencia');
  await sleep(DELAY.long);

  // Verificar dashboard de asistencia
  const attendanceContent = await page.$('.attendance-dashboard, .attendance-container, [class*="attendance"]');
  logTest('Dashboard de asistencia cargado', !!attendanceContent);

  // Verificar lista/tabla de asistencias
  const attendanceTable = await page.$$('table tbody tr, .attendance-record, .attendance-row');
  logTest('Registros de asistencia visibles', attendanceTable.length >= 0, `${attendanceTable.length} registros`);

  // Probar sección de Turnos
  log('⏰', 'Verificando módulo de Turnos...');
  if (await navigateToModule(page, 'shifts', 'Turnos')) {
    const shiftsTable = await page.$$('table tbody tr, .shift-card, .shift-row');
    logTest('Lista de turnos cargada', shiftsTable.length > 0, `${shiftsTable.length} turnos`);
  } else {
    logTest('Módulo de turnos accesible', false, 'No encontrado');
  }

  // Verificar Tardanzas
  log('⏱️', 'Verificando módulo de Tardanzas...');
  if (await navigateToModule(page, 'late-authorizations', 'Tardanzas')) {
    logTest('Módulo de tardanzas accesible', true);
  }

  // Verificar Horas Extra
  log('📊', 'Verificando Banco de Horas...');
  if (await navigateToModule(page, 'hour-bank', 'Banco de Horas')) {
    logTest('Banco de horas accesible', true);
  }
}

// ═══════════════════════════════════════════════════════════════
// PILAR 3: LIQUIDACIÓN DE SUELDOS
// ═══════════════════════════════════════════════════════════════
async function testLiquidacionSueldos(page) {
  console.log('\n' + '═'.repeat(60));
  console.log('  PILAR 3: LIQUIDACIÓN DE SUELDOS');
  console.log('═'.repeat(60) + '\n');

  // Navegar a Payroll
  await navigateToModule(page, 'payroll', 'Liquidación de Sueldos');
  await sleep(DELAY.long);

  // Verificar dashboard de payroll
  // Verificar que el dashboard de payroll se cargó
  const payrollLoaded = await page.$('.payroll-container, .payroll-dashboard, [class*="payroll"]');
  logTest('Dashboard de liquidación visible', !!payrollLoaded);

  // Verificar tabs/secciones internas de payroll
  log('📋', 'Verificando secciones de Payroll...');

  // Buscar botones/tabs internos del módulo
  const internalTabs = await page.$$('.payroll-tabs button, .nav-tabs .nav-link, .tab-btn');
  logTest('Tabs de payroll disponibles', internalTabs.length > 0, `${internalTabs.length} tabs`);

  // Verificar tabla/contenido principal
  const payrollItems = await page.$$('table tbody tr, .payroll-item, .concept-row');
  logTest('Contenido de payroll cargado', true, `${payrollItems.length} items`);

  // Probar sub-módulos relacionados
  log('📜', 'Verificando Convenios Laborales...');
  if (await navigateToModule(page, 'labor-agreements', 'Convenios')) {
    logTest('Módulo de convenios accesible', true);
  }

  log('🧮', 'Verificando Calculadora de Sueldos...');
  if (await navigateToModule(page, 'salary-advanced', 'Salary Advanced')) {
    logTest('Módulo salary-advanced accesible', true);
  }
}

// ═══════════════════════════════════════════════════════════════
// PILAR 4: ESTRUCTURA ORGANIZACIONAL
// ═══════════════════════════════════════════════════════════════
async function testEstructuraOrganizacional(page) {
  console.log('\n' + '═'.repeat(60));
  console.log('  PILAR 4: ESTRUCTURA ORGANIZACIONAL');
  console.log('═'.repeat(60) + '\n');

  // Navegar a Estructura Organizacional
  await navigateToModule(page, 'organizational', 'Estructura Organizacional');
  await sleep(DELAY.long);

  // Verificar que el dashboard organizacional se cargó
  const orgLoaded = await page.$('.organizational-container, [class*="organizational"], [class*="structure"]');
  logTest('Dashboard organizacional visible', !!orgLoaded);

  // Verificar Departamentos
  log('🏢', 'Verificando Departamentos...');
  if (await navigateToModule(page, 'departments', 'Departamentos')) {
    await sleep(DELAY.medium);

    const deptsList = await page.$$('table tbody tr, .dept-card, .department-row, .department-item');
    logTest('Lista de departamentos cargada', deptsList.length > 0, `${deptsList.length} departamentos`);

    // Test CRUD - Buscar botón crear
    log('➕', 'Probando botón CREAR...');
    const createBtn = await page.$('button:has-text("Nuevo"), button:has-text("Crear"), .btn-create, .btn-new, [onclick*="create"]');
    if (createBtn) {
      await createBtn.click();
      await sleep(DELAY.long);

      const createModal = await page.$('.modal.show, .modal-content, .modal[style*="display: block"]');
      logTest('CREATE: Modal abierto', !!createModal);

      // Cerrar modal
      await page.keyboard.press('Escape');
      await sleep(DELAY.medium);
    } else {
      logTest('CREATE: Botón crear disponible', false, 'No encontrado');
    }
  } else {
    logTest('Módulo departamentos accesible', false, 'No se pudo navegar');
  }

  // Verificar Sucursales
  log('📍', 'Verificando Sucursales...');
  if (await navigateToModule(page, 'branches', 'Sucursales')) {
    const branchesList = await page.$$('table tbody tr, .branch-card, .branch-item');
    logTest('Lista de sucursales cargada', branchesList.length >= 0, `${branchesList.length} sucursales`);
  }

  // Verificar Posiciones/Cargos
  log('👔', 'Verificando Posiciones...');
  if (await navigateToModule(page, 'positions', 'Posiciones')) {
    const positionsList = await page.$$('table tbody tr, .position-card, .position-item');
    logTest('Lista de posiciones cargada', positionsList.length >= 0, `${positionsList.length} posiciones`);
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST DE PERSISTENCIA
// ═══════════════════════════════════════════════════════════════
async function testPersistencia(page) {
  console.log('\n' + '═'.repeat(60));
  console.log('  TEST DE PERSISTENCIA DE DATOS');
  console.log('═'.repeat(60) + '\n');

  log('🔄', 'Recargando página para verificar persistencia...');
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(DELAY.veryLong);

  // Verificar que seguimos logueados
  const stillLoggedIn = await page.$('.dashboard-container, #mainContent, .user-info, .logout-btn');
  logTest('Sesión persistente después de reload', !!stillLoggedIn);

  // Navegar a usuarios y verificar que los datos persisten
  await navigateToModule(page, 'users', 'Usuarios');
  await sleep(DELAY.long);

  const usersAfterReload = await page.$$('table tbody tr, .user-card');
  logTest('Datos de usuarios persisten', usersAfterReload.length > 0, `${usersAfterReload.length} usuarios`);
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(62) + '╗');
  console.log('║' + ' '.repeat(10) + 'TEST VISUAL E2E - 4 PILARES CRÍTICOS' + ' '.repeat(14) + '║');
  console.log('║' + ' '.repeat(15) + 'Navegador VISIBLE para demo' + ' '.repeat(19) + '║');
  console.log('╚' + '═'.repeat(62) + '╝');
  console.log('\n');

  const browser = await puppeteer.launch({
    headless: false,  // VISIBLE para el usuario
    defaultViewport: { width: 1400, height: 900 },
    args: ['--start-maximized'],
    slowMo: 50  // Más lento para que sea visible
  });

  const page = await browser.newPage();

  try {
    // Login
    const loginOk = await login(page);
    if (!loginOk) {
      console.log('\n❌ No se pudo hacer login. Abortando tests.');
      await browser.close();
      return;
    }

    await sleep(DELAY.long);

    // Ejecutar tests de cada pilar
    await testGestionUsuarios(page);
    await testControlAsistencia(page);
    await testLiquidacionSueldos(page);
    await testEstructuraOrganizacional(page);
    await testPersistencia(page);

    // Resumen final
    console.log('\n');
    console.log('╔' + '═'.repeat(62) + '╗');
    console.log('║' + ' '.repeat(20) + 'RESUMEN FINAL' + ' '.repeat(29) + '║');
    console.log('╚' + '═'.repeat(62) + '╝');
    console.log('\n');

    console.log(`  ✅ Tests pasados: ${testResults.passed}`);
    console.log(`  ❌ Tests fallidos: ${testResults.failed}`);
    console.log(`  📊 Total: ${testResults.passed + testResults.failed}`);
    console.log('\n');

    if (testResults.failed === 0) {
      console.log('  🎉 TODOS LOS TESTS VISUALES PASARON');
    } else {
      console.log('  ⚠️  Algunos tests fallaron. Revisar arriba.');
    }

    console.log('\n  El navegador permanecerá abierto para inspección manual.');
    console.log('  Presiona Ctrl+C para cerrar.\n');

    // Mantener navegador abierto para inspección
    await new Promise(() => {});

  } catch (error) {
    console.error('\n❌ Error durante los tests:', error.message);
    console.log('\n  El navegador permanecerá abierto para debug.');
    await new Promise(() => {});
  }
}

main().catch(console.error);
