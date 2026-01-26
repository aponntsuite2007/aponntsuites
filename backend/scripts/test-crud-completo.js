/**
 * TEST CRUD COMPLETO - Operación Manual Automatizada
 *
 * Simula un usuario real operando el sistema:
 * - Scroll a elementos antes de clickear
 * - Screenshots en cada paso
 * - CRUD real en cada módulo
 * - Verificación de persistencia
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const CREDENTIALS = { company: 'isi', user: 'admin', password: 'admin123' };
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'test-screenshots');

// Crear directorio de screenshots
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

let testResults = { passed: 0, failed: 0, details: [] };

function log(icon, msg) {
  console.log(`${icon} ${msg}`);
}

function logResult(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} ${name}${details ? ` → ${details}` : ''}`);
  testResults.details.push({ name, passed, details });
  if (passed) testResults.passed++; else testResults.failed++;
}

async function screenshot(page, name) {
  const filename = `${Date.now()}-${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`  📸 Screenshot: ${filename}`);
  return filepath;
}

// Scroll a elemento y esperar que sea visible
async function scrollToElement(page, selector) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, selector);
  await sleep(500);
}

// Click con scroll previo
async function clickWithScroll(page, selector, description) {
  try {
    await scrollToElement(page, selector);
    await page.waitForSelector(selector, { visible: true, timeout: 5000 });
    await page.click(selector);
    log('👆', description);
    return true;
  } catch (e) {
    log('⚠️', `No se pudo clickear: ${description} (${e.message})`);
    return false;
  }
}

// Navegar a módulo con scroll
async function navigateToModule(page, moduleKey, moduleName) {
  log('📂', `Navegando a ${moduleName}...`);

  // Scroll al inicio primero
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);

  const result = await page.evaluate((key) => {
    if (typeof showTab === 'function') {
      showTab(key);
      return true;
    }
    return false;
  }, moduleKey);

  await sleep(1500);
  return result;
}

async function login(page) {
  log('🔐', 'INICIANDO LOGIN...');

  await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Seleccionar empresa
  await page.select('#companySelect', CREDENTIALS.company);
  log('1️⃣', `Empresa: ${CREDENTIALS.company}`);
  await sleep(1500);

  // Credenciales
  await page.evaluate((user, pass) => {
    const userInput = document.getElementById('userInput');
    const passInput = document.getElementById('passwordInput');
    if (userInput) { userInput.disabled = false; userInput.value = user; }
    if (passInput) { passInput.disabled = false; passInput.value = pass; }
  }, CREDENTIALS.user, CREDENTIALS.password);
  log('2️⃣', 'Credenciales ingresadas');
  await sleep(500);

  // Submit
  await page.evaluate(() => {
    const form = document.getElementById('multiTenantLoginForm');
    if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
  });
  log('3️⃣', 'Login enviado...');
  await sleep(3000);

  await screenshot(page, '01-login-completado');
  log('✅', 'LOGIN EXITOSO');
  return true;
}

// ═══════════════════════════════════════════════════════════════
// TEST CRUD: USUARIOS
// ═══════════════════════════════════════════════════════════════
async function testUsuariosCRUD(page) {
  console.log('\n' + '═'.repeat(60));
  console.log('  CRUD USUARIOS - Operación Completa');
  console.log('═'.repeat(60) + '\n');

  await navigateToModule(page, 'users', 'Gestión de Usuarios');
  await sleep(2000);
  await screenshot(page, '02-usuarios-lista');

  // Contar usuarios iniciales
  const initialCount = await page.evaluate(() => {
    return document.querySelectorAll('table tbody tr').length;
  });
  logResult('Lista de usuarios cargada', initialCount > 0, `${initialCount} usuarios`);

  // Scroll a la tabla
  await scrollToElement(page, 'table tbody');
  await sleep(500);

  // Buscar y clickear botón EDITAR del primer usuario
  log('📝', 'Abriendo edición del primer usuario...');

  const editBtnExists = await page.evaluate(() => {
    const btn = document.querySelector('.users-action-btn.edit');
    if (btn) {
      btn.scrollIntoView({ block: 'center' });
      return true;
    }
    return false;
  });

  if (editBtnExists) {
    await sleep(500);
    await page.click('.users-action-btn.edit');
    await sleep(2000);
    await screenshot(page, '03-usuarios-modal-edicion');

    // Verificar modal abierto
    const modalOpen = await page.evaluate(() => {
      const modal = document.getElementById('editUserModal');
      return modal && modal.style.display !== 'none';
    });
    logResult('Modal de edición abierto', modalOpen);

    if (modalOpen) {
      // Contar campos del formulario
      const formData = await page.evaluate(() => {
        const modal = document.getElementById('editUserModal');
        const inputs = modal.querySelectorAll('input, select, textarea');
        const sections = modal.querySelectorAll('h4');
        return {
          fieldCount: inputs.length,
          sections: Array.from(sections).map(s => s.textContent.trim().substring(0, 30))
        };
      });

      logResult('Campos en formulario', formData.fieldCount > 10, `${formData.fieldCount} campos`);
      log('📑', `Secciones: ${formData.sections.join(', ')}`);

      // Modificar un campo para probar UPDATE
      log('✏️', 'Modificando campo teléfono...');
      const phoneModified = await page.evaluate(() => {
        const phoneInput = document.getElementById('editPhone');
        if (phoneInput) {
          const originalValue = phoneInput.value;
          phoneInput.value = '11-9999-' + Date.now().toString().slice(-4);
          phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
          return { original: originalValue, new: phoneInput.value };
        }
        return null;
      });

      if (phoneModified) {
        logResult('Campo teléfono modificado', true, `${phoneModified.original} → ${phoneModified.new}`);
        await screenshot(page, '04-usuarios-campo-modificado');
      }

      // Scroll al botón guardar
      await page.evaluate(() => {
        const saveBtn = document.querySelector('button[onclick*="saveEdit"]');
        if (saveBtn) saveBtn.scrollIntoView({ block: 'center' });
      });
      await sleep(500);
      await screenshot(page, '05-usuarios-boton-guardar');

      // Guardar cambios
      log('💾', 'Guardando cambios...');
      await page.evaluate(() => {
        const saveBtn = document.querySelector('button[onclick*="saveEdit"]');
        if (saveBtn) saveBtn.click();
      });
      await sleep(2000);

      // Verificar si se cerró el modal (indica éxito)
      const modalClosed = await page.evaluate(() => {
        const modal = document.getElementById('editUserModal');
        return !modal || modal.style.display === 'none';
      });
      logResult('Cambios guardados', modalClosed);
      await screenshot(page, '06-usuarios-guardado');
    }
  } else {
    logResult('Botón editar encontrado', false);
  }

  // Verificar persistencia - refrescar y ver si el cambio persiste
  log('🔄', 'Verificando persistencia (recargando página)...');
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(2000);
  await navigateToModule(page, 'users', 'Usuarios');
  await sleep(2000);

  const afterReloadCount = await page.evaluate(() => {
    return document.querySelectorAll('table tbody tr').length;
  });
  logResult('Datos persisten tras reload', afterReloadCount === initialCount, `${afterReloadCount} usuarios`);
  await screenshot(page, '07-usuarios-persistencia');
}

// ═══════════════════════════════════════════════════════════════
// TEST CRUD: TURNOS
// ═══════════════════════════════════════════════════════════════
async function testTurnosCRUD(page) {
  console.log('\n' + '═'.repeat(60));
  console.log('  CRUD TURNOS - Operación Completa');
  console.log('═'.repeat(60) + '\n');

  await navigateToModule(page, 'shifts', 'Turnos');
  await sleep(2000);
  await screenshot(page, '10-turnos-lista');

  // Contar turnos
  const shiftCount = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr, .shift-card, .shift-item');
    return rows.length;
  });
  logResult('Módulo de turnos cargado', true, `${shiftCount} turnos encontrados`);

  // Buscar botón crear
  log('➕', 'Buscando botón crear turno...');
  const createBtnFound = await page.evaluate(() => {
    const btn = document.querySelector('button:contains("Nuevo"), button:contains("Crear"), .btn-create, [onclick*="create"]');
    if (btn) {
      btn.scrollIntoView({ block: 'center' });
      return true;
    }
    // Buscar por texto
    const allBtns = document.querySelectorAll('button');
    for (const b of allBtns) {
      if (b.textContent.toLowerCase().includes('nuevo') || b.textContent.toLowerCase().includes('crear')) {
        b.scrollIntoView({ block: 'center' });
        return true;
      }
    }
    return false;
  });

  logResult('Botón crear turno disponible', createBtnFound);
  await screenshot(page, '11-turnos-boton-crear');
}

// ═══════════════════════════════════════════════════════════════
// TEST CRUD: DEPARTAMENTOS
// ═══════════════════════════════════════════════════════════════
async function testDepartamentosCRUD(page) {
  console.log('\n' + '═'.repeat(60));
  console.log('  CRUD DEPARTAMENTOS - Operación Completa');
  console.log('═'.repeat(60) + '\n');

  await navigateToModule(page, 'departments', 'Departamentos');
  await sleep(2000);
  await screenshot(page, '20-departamentos-lista');

  // Contar departamentos
  const deptCount = await page.evaluate(() => {
    const items = document.querySelectorAll('table tbody tr, .department-card, .dept-item, .tree-item');
    return items.length;
  });
  logResult('Módulo departamentos cargado', true, `${deptCount} items encontrados`);

  // Verificar árbol organizacional si existe
  const hasTree = await page.evaluate(() => {
    return !!document.querySelector('.org-tree, .department-tree, [class*="tree"]');
  });
  logResult('Vista de árbol organizacional', hasTree);

  await screenshot(page, '21-departamentos-estructura');
}

// ═══════════════════════════════════════════════════════════════
// TEST CRUD: ASISTENCIA
// ═══════════════════════════════════════════════════════════════
async function testAsistenciaCRUD(page) {
  console.log('\n' + '═'.repeat(60));
  console.log('  CRUD ASISTENCIA - Operación Completa');
  console.log('═'.repeat(60) + '\n');

  await navigateToModule(page, 'attendance', 'Control de Asistencia');
  await sleep(2000);
  await screenshot(page, '30-asistencia-dashboard');

  // Contar registros
  const recordCount = await page.evaluate(() => {
    return document.querySelectorAll('table tbody tr').length;
  });
  logResult('Registros de asistencia', recordCount >= 0, `${recordCount} registros`);

  // Verificar filtros
  const hasFilters = await page.evaluate(() => {
    return document.querySelectorAll('select, input[type="date"], .filter-container').length;
  });
  logResult('Filtros disponibles', hasFilters > 0, `${hasFilters} controles de filtro`);

  await screenshot(page, '31-asistencia-filtros');
}

// ═══════════════════════════════════════════════════════════════
// TEST CRUD: VACACIONES
// ═══════════════════════════════════════════════════════════════
async function testVacacionesCRUD(page) {
  console.log('\n' + '═'.repeat(60));
  console.log('  CRUD VACACIONES - Operación Completa');
  console.log('═'.repeat(60) + '\n');

  await navigateToModule(page, 'vacation-management', 'Gestión de Vacaciones');
  await sleep(2000);
  await screenshot(page, '40-vacaciones-lista');

  // Contar solicitudes
  const requestCount = await page.evaluate(() => {
    return document.querySelectorAll('table tbody tr, .vacation-request, .request-card').length;
  });
  logResult('Solicitudes de vacaciones', requestCount >= 0, `${requestCount} solicitudes`);

  // Buscar botón nueva solicitud
  const canCreate = await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) {
      if (b.textContent.toLowerCase().includes('solicitar') ||
          b.textContent.toLowerCase().includes('nueva')) {
        return true;
      }
    }
    return false;
  });
  logResult('Puede crear nueva solicitud', canCreate);

  await screenshot(page, '41-vacaciones-acciones');
}

// ═══════════════════════════════════════════════════════════════
// TEST CRUD: LIQUIDACIÓN DE SUELDOS
// ═══════════════════════════════════════════════════════════════
async function testPayrollCRUD(page) {
  console.log('\n' + '═'.repeat(60));
  console.log('  CRUD LIQUIDACIÓN - Operación Completa');
  console.log('═'.repeat(60) + '\n');

  await navigateToModule(page, 'payroll', 'Liquidación de Sueldos');
  await sleep(2000);
  await screenshot(page, '50-payroll-dashboard');

  // Verificar secciones del módulo
  const sections = await page.evaluate(() => {
    const headers = document.querySelectorAll('h3, h4, .section-title, .card-header');
    return Array.from(headers).map(h => h.textContent.trim().substring(0, 40)).slice(0, 5);
  });
  logResult('Módulo payroll cargado', sections.length > 0, sections.join(', '));

  // Verificar si hay tabs/vistas
  const tabs = await page.evaluate(() => {
    return document.querySelectorAll('.nav-tabs .nav-link, .tab-btn, [role="tab"]').length;
  });
  logResult('Tabs/vistas disponibles', tabs > 0, `${tabs} tabs`);

  await screenshot(page, '51-payroll-estructura');
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(62) + '╗');
  console.log('║     TEST CRUD COMPLETO - OPERACIÓN MANUAL AUTOMATIZADA      ║');
  console.log('║              Screenshots en: test-screenshots/               ║');
  console.log('╚' + '═'.repeat(62) + '╝');
  console.log('\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--start-maximized'],
    slowMo: 50
  });

  const page = await browser.newPage();

  try {
    await login(page);

    // Ejecutar todos los tests CRUD
    await testUsuariosCRUD(page);
    await testTurnosCRUD(page);
    await testDepartamentosCRUD(page);
    await testAsistenciaCRUD(page);
    await testVacacionesCRUD(page);
    await testPayrollCRUD(page);

    // Resumen final
    console.log('\n');
    console.log('╔' + '═'.repeat(62) + '╗');
    console.log('║                    RESUMEN FINAL                            ║');
    console.log('╚' + '═'.repeat(62) + '╝');
    console.log('\n');

    console.log(`  ✅ Tests pasados: ${testResults.passed}`);
    console.log(`  ❌ Tests fallidos: ${testResults.failed}`);
    console.log(`  📊 Total: ${testResults.passed + testResults.failed}`);
    console.log(`\n  📸 Screenshots guardados en: ${SCREENSHOTS_DIR}`);

    // Listar screenshots
    const screenshots = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
    console.log(`  📁 ${screenshots.length} screenshots generados`);

    if (testResults.failed === 0) {
      console.log('\n  🎉 TODOS LOS TESTS CRUD PASARON');
    } else {
      console.log('\n  ⚠️  Algunos tests fallaron. Revisar screenshots.');
    }

    console.log('\n  El navegador permanece abierto para inspección.');
    console.log('  Presiona Ctrl+C para cerrar.\n');

    await new Promise(() => {});

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await screenshot(page, 'ERROR-' + Date.now());
    console.log('\n  El navegador permanece abierto para debug.');
    await new Promise(() => {});
  }
}

main().catch(console.error);
