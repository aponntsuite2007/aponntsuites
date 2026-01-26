/**
 * TEST CRUD SIN RELOAD - Operación Manual Completa
 *
 * NO hace reload para evitar pérdida de sesión.
 * Opera cada módulo completamente.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const CREDENTIALS = { company: 'isi', user: 'admin', password: 'admin123' };
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'test-screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
let screenshotCounter = 1;

async function screenshot(page, name) {
  const filename = `${String(screenshotCounter++).padStart(2, '0')}-${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`  📸 ${filename}`);
  return filepath;
}

async function login(page) {
  console.log('🔐 LOGIN...');
  await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle2' });
  await sleep(2000);

  await page.select('#companySelect', CREDENTIALS.company);
  await sleep(1500);

  await page.evaluate((user, pass) => {
    const userInput = document.getElementById('userInput');
    const passInput = document.getElementById('passwordInput');
    if (userInput) { userInput.disabled = false; userInput.value = user; }
    if (passInput) { passInput.disabled = false; passInput.value = pass; }
  }, CREDENTIALS.user, CREDENTIALS.password);
  await sleep(500);

  await page.evaluate(() => {
    const form = document.getElementById('multiTenantLoginForm');
    if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
  });
  await sleep(3000);

  await screenshot(page, 'login-ok');
  console.log('✅ LOGIN EXITOSO\n');
}

async function navigateTo(page, moduleKey, name) {
  console.log(`\n📂 Navegando a ${name}...`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);

  await page.evaluate((key) => {
    if (typeof showTab === 'function') showTab(key);
  }, moduleKey);
  await sleep(2000);
}

// ═══════════════════════════════════════════════════════════════
// CRUD USUARIOS
// ═══════════════════════════════════════════════════════════════
async function testUsuarios(page) {
  console.log('\n' + '═'.repeat(50));
  console.log('  CRUD USUARIOS');
  console.log('═'.repeat(50));

  await navigateTo(page, 'users', 'Gestión de Usuarios');
  await screenshot(page, 'usuarios-lista');

  // Contar usuarios
  const stats = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr');
    const totalEl = document.querySelector('[class*="total"], .stat-total');
    return {
      rowCount: rows.length,
      totalText: totalEl ? totalEl.textContent : 'N/A'
    };
  });
  console.log(`  📊 ${stats.rowCount} filas en tabla`);

  // Scroll hacia abajo para ver botones de acción
  await page.evaluate(() => {
    const table = document.querySelector('table');
    if (table) table.scrollIntoView({ block: 'start' });
  });
  await sleep(500);

  // Click en botón EDITAR (naranja) del primer usuario
  console.log('\n  📝 Clickeando botón EDITAR...');

  const editResult = await page.evaluate(() => {
    // Buscar el botón naranja de editar
    const editBtns = document.querySelectorAll('.users-action-btn.edit, button[style*="f59e0b"], button[onclick*="editUser"]');
    if (editBtns.length > 0) {
      const btn = editBtns[0];
      // Scroll al botón
      btn.scrollIntoView({ block: 'center' });
      return { found: true, count: editBtns.length };
    }
    return { found: false };
  });

  if (editResult.found) {
    console.log(`  ✅ Encontrados ${editResult.count} botones de editar`);
    await sleep(500);
    await screenshot(page, 'usuarios-boton-editar-visible');

    // Ahora hacer click
    await page.click('.users-action-btn.edit');
    await sleep(2000);
    await screenshot(page, 'usuarios-modal-edicion');

    // Verificar modal
    const modalInfo = await page.evaluate(() => {
      const modal = document.getElementById('editUserModal');
      if (modal && modal.style.display !== 'none') {
        const inputs = modal.querySelectorAll('input, select, textarea');
        const headers = modal.querySelectorAll('h3, h4');
        return {
          open: true,
          fields: inputs.length,
          sections: Array.from(headers).map(h => h.textContent.substring(0, 25))
        };
      }
      return { open: false };
    });

    if (modalInfo.open) {
      console.log(`  ✅ Modal abierto con ${modalInfo.fields} campos`);
      console.log(`  📑 Secciones: ${modalInfo.sections.join(', ')}`);

      // Scroll dentro del modal para ver todos los campos
      await page.evaluate(() => {
        const modal = document.getElementById('editUserModal');
        if (modal) {
          const content = modal.querySelector('div');
          if (content) content.scrollTop = 0;
        }
      });
      await sleep(500);
      await screenshot(page, 'usuarios-modal-seccion1');

      // Scroll al medio del modal
      await page.evaluate(() => {
        const modal = document.getElementById('editUserModal');
        if (modal) {
          const content = modal.querySelector('div');
          if (content) content.scrollTop = content.scrollHeight / 2;
        }
      });
      await sleep(500);
      await screenshot(page, 'usuarios-modal-seccion2');

      // Scroll al final del modal
      await page.evaluate(() => {
        const modal = document.getElementById('editUserModal');
        if (modal) {
          const content = modal.querySelector('div');
          if (content) content.scrollTop = content.scrollHeight;
        }
      });
      await sleep(500);
      await screenshot(page, 'usuarios-modal-seccion3');

      // Cerrar modal con Escape
      await page.keyboard.press('Escape');
      await sleep(500);
    } else {
      console.log('  ❌ Modal NO se abrió');
    }
  } else {
    console.log('  ❌ No se encontraron botones de editar');
  }

  // Probar botón AGREGAR USUARIO
  console.log('\n  ➕ Probando botón Agregar Usuario...');
  const addBtnResult = await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const btn of btns) {
      if (btn.textContent.includes('Agregar Usuario')) {
        btn.scrollIntoView({ block: 'center' });
        return { found: true, text: btn.textContent };
      }
    }
    return { found: false };
  });

  if (addBtnResult.found) {
    console.log(`  ✅ Botón encontrado: "${addBtnResult.text}"`);
    await sleep(500);

    // Click en agregar
    await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent.includes('Agregar Usuario')) {
          btn.click();
          break;
        }
      }
    });
    await sleep(2000);
    await screenshot(page, 'usuarios-modal-crear');

    // Verificar modal de creación
    const createModal = await page.evaluate(() => {
      const modals = document.querySelectorAll('.modal, [id*="Modal"], [style*="position: fixed"]');
      for (const m of modals) {
        if (m.style.display !== 'none' && m.offsetParent !== null) {
          return { open: true };
        }
      }
      return { open: false };
    });

    if (createModal.open) {
      console.log('  ✅ Modal de creación abierto');
      await page.keyboard.press('Escape');
      await sleep(500);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// CRUD TURNOS
// ═══════════════════════════════════════════════════════════════
async function testTurnos(page) {
  console.log('\n' + '═'.repeat(50));
  console.log('  CRUD TURNOS');
  console.log('═'.repeat(50));

  await navigateTo(page, 'shifts', 'Gestión de Turnos');
  await screenshot(page, 'turnos-lista');

  const stats = await page.evaluate(() => {
    const cards = document.querySelectorAll('.shift-card, .card, [class*="shift"]');
    const rows = document.querySelectorAll('table tbody tr');
    return { cards: cards.length, rows: rows.length };
  });
  console.log(`  📊 ${stats.cards} cards, ${stats.rows} filas`);
}

// ═══════════════════════════════════════════════════════════════
// CRUD DEPARTAMENTOS
// ═══════════════════════════════════════════════════════════════
async function testDepartamentos(page) {
  console.log('\n' + '═'.repeat(50));
  console.log('  CRUD DEPARTAMENTOS');
  console.log('═'.repeat(50));

  await navigateTo(page, 'departments', 'Departamentos');
  await screenshot(page, 'departamentos-lista');

  const stats = await page.evaluate(() => {
    const items = document.querySelectorAll('.tree-item, .department-card, table tbody tr');
    return { count: items.length };
  });
  console.log(`  📊 ${stats.count} departamentos`);
}

// ═══════════════════════════════════════════════════════════════
// CRUD ASISTENCIA
// ═══════════════════════════════════════════════════════════════
async function testAsistencia(page) {
  console.log('\n' + '═'.repeat(50));
  console.log('  CRUD ASISTENCIA');
  console.log('═'.repeat(50));

  await navigateTo(page, 'attendance', 'Control de Asistencia');
  await screenshot(page, 'asistencia-dashboard');

  const stats = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr');
    const filters = document.querySelectorAll('select, input[type="date"]');
    return { rows: rows.length, filters: filters.length };
  });
  console.log(`  📊 ${stats.rows} registros, ${stats.filters} filtros`);
}

// ═══════════════════════════════════════════════════════════════
// CRUD VACACIONES
// ═══════════════════════════════════════════════════════════════
async function testVacaciones(page) {
  console.log('\n' + '═'.repeat(50));
  console.log('  CRUD VACACIONES');
  console.log('═'.repeat(50));

  await navigateTo(page, 'vacation-management', 'Gestión de Vacaciones');
  await screenshot(page, 'vacaciones-lista');

  const stats = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr, .vacation-card');
    return { count: rows.length };
  });
  console.log(`  📊 ${stats.count} solicitudes`);
}

// ═══════════════════════════════════════════════════════════════
// CRUD PAYROLL
// ═══════════════════════════════════════════════════════════════
async function testPayroll(page) {
  console.log('\n' + '═'.repeat(50));
  console.log('  CRUD LIQUIDACIÓN');
  console.log('═'.repeat(50));

  await navigateTo(page, 'payroll', 'Liquidación de Sueldos');
  await screenshot(page, 'payroll-dashboard');

  const stats = await page.evaluate(() => {
    const tabs = document.querySelectorAll('.nav-tabs .nav-link, .tab-btn');
    const sections = document.querySelectorAll('h3, h4, .section-title');
    return { tabs: tabs.length, sections: sections.length };
  });
  console.log(`  📊 ${stats.tabs} tabs, ${stats.sections} secciones`);
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('\n╔' + '═'.repeat(50) + '╗');
  console.log('║  TEST CRUD COMPLETO - SIN RELOAD              ║');
  console.log('╚' + '═'.repeat(50) + '╝\n');

  // Limpiar screenshots anteriores
  const oldFiles = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.match(/^\d{2}-/));
  oldFiles.forEach(f => fs.unlinkSync(path.join(SCREENSHOTS_DIR, f)));
  console.log(`🗑️ Limpiados ${oldFiles.length} screenshots anteriores\n`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--start-maximized'],
    slowMo: 30
  });

  const page = await browser.newPage();

  try {
    await login(page);

    await testUsuarios(page);
    await testTurnos(page);
    await testDepartamentos(page);
    await testAsistencia(page);
    await testVacaciones(page);
    await testPayroll(page);

    // Resumen
    console.log('\n\n╔' + '═'.repeat(50) + '╗');
    console.log('║            TEST COMPLETADO                    ║');
    console.log('╚' + '═'.repeat(50) + '╝\n');

    const screenshots = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.match(/^\d{2}-/));
    console.log(`📸 ${screenshots.length} screenshots en: test-screenshots/`);
    screenshots.forEach(s => console.log(`   - ${s}`));

    console.log('\n🖥️ Navegador abierto para inspección manual.');
    console.log('   Presiona Ctrl+C para cerrar.\n');

    await new Promise(() => {});

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await screenshot(page, 'ERROR');
    await new Promise(() => {});
  }
}

main().catch(console.error);
