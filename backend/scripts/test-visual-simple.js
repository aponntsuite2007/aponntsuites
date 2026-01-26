/**
 * TEST VISUAL SIMPLE - Navegación por Módulos Principales
 *
 * Abre el navegador y navega visualmente por:
 * 1. Gestión de Usuarios
 * 2. Turnos
 * 3. Asistencia
 * 4. Departamentos
 * 5. Vacaciones
 *
 * El usuario VE todo en tiempo real.
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:9998';
const CREDENTIALS = {
  company: 'isi',
  user: 'admin',
  password: 'admin123'
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║         TEST VISUAL SIMPLE - MÓDULOS PRINCIPALES             ║');
  console.log('║                  Navegador VISIBLE                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1600, height: 900 },
    args: ['--start-maximized'],
    slowMo: 100
  });

  const page = await browser.newPage();

  try {
    // === LOGIN ===
    console.log('🔐 INICIANDO LOGIN...');
    await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Seleccionar empresa
    console.log('1️⃣ Seleccionando empresa ISI...');
    await page.waitForSelector('#companySelect', { timeout: 10000 });
    await page.select('#companySelect', CREDENTIALS.company);
    await sleep(1500);

    // Ingresar credenciales
    console.log('2️⃣ Ingresando credenciales...');
    await page.evaluate((user, pass) => {
      const userInput = document.getElementById('userInput');
      const passInput = document.getElementById('passwordInput');
      if (userInput) { userInput.disabled = false; userInput.value = user; }
      if (passInput) { passInput.disabled = false; passInput.value = pass; }
    }, CREDENTIALS.user, CREDENTIALS.password);
    await sleep(1000);

    // Submit
    console.log('3️⃣ Enviando login...');
    await page.evaluate(() => {
      const form = document.getElementById('multiTenantLoginForm');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
    });
    await sleep(3000);

    console.log('✅ LOGIN COMPLETADO\n');

    // === NAVEGACIÓN POR MÓDULOS ===
    const modules = [
      { key: 'users', name: '👥 Gestión de Usuarios', wait: 3000 },
      { key: 'shifts', name: '⏰ Turnos', wait: 2000 },
      { key: 'attendance', name: '📊 Asistencia', wait: 2000 },
      { key: 'departments', name: '🏢 Departamentos', wait: 2000 },
      { key: 'vacation-management', name: '🏖️ Vacaciones', wait: 2000 },
      { key: 'payroll', name: '💰 Liquidación', wait: 2000 },
      { key: 'organizational', name: '🏛️ Estructura Organizacional', wait: 2000 },
      { key: 'hour-bank', name: '⏱️ Banco de Horas', wait: 2000 },
      { key: 'employee-benefits', name: '🎁 Beneficios', wait: 2000 },
      { key: 'inbox', name: '📬 Notificaciones', wait: 2000 }
    ];

    for (const mod of modules) {
      console.log(`\n📂 Navegando a: ${mod.name}...`);

      const navigated = await page.evaluate((key) => {
        if (typeof showTab === 'function') {
          showTab(key);
          return 'showTab';
        }
        // Buscar card del módulo
        const card = document.querySelector(`[data-module-key="${key}"], [data-module-id="${key}"]`);
        if (card) {
          card.click();
          return 'card';
        }
        // Buscar por texto
        const allCards = document.querySelectorAll('.module-card, [onclick*="showTab"]');
        for (const c of allCards) {
          if (c.textContent.toLowerCase().includes(key.replace('-', ' '))) {
            c.click();
            return 'text';
          }
        }
        return false;
      }, mod.key);

      if (navigated) {
        console.log(`   ✅ Navegado via: ${navigated}`);
        await sleep(mod.wait);

        // Verificar qué hay visible
        const stats = await page.evaluate(() => {
          const tables = document.querySelectorAll('table tbody tr').length;
          const cards = document.querySelectorAll('.card, .module-card, .item-card').length;
          const modals = document.querySelectorAll('.modal[style*="display: block"], .modal.show').length;
          const forms = document.querySelectorAll('form input, form select').length;
          return { tables, cards, modals, forms };
        });

        console.log(`   📊 Elementos: ${stats.tables} filas tabla, ${stats.cards} cards, ${stats.forms} inputs`);
      } else {
        console.log(`   ⚠️ No se pudo navegar a ${mod.key}`);
      }
    }

    // === PRUEBA CRUD EN USUARIOS ===
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('  PRUEBA CRUD: GESTIÓN DE USUARIOS');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Navegar a usuarios
    await page.evaluate(() => showTab('users'));
    await sleep(2000);

    // Contar usuarios
    const userCount = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr, .user-row, .employee-card');
      return rows.length;
    });
    console.log(`📋 Usuarios encontrados: ${userCount}`);

    // Buscar botón editar del primer usuario - CON SCROLL
    console.log('\n👤 Abriendo modal de edición del primer usuario...');

    // Primero hacer scroll hasta la tabla de usuarios
    await page.evaluate(() => {
      const table = document.querySelector('table tbody');
      if (table) table.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await sleep(1000);

    // Ahora buscar el botón de editar y hacer scroll hacia él
    const editClicked = await page.evaluate(() => {
      // Buscar botón de editar
      const editBtn = document.querySelector('.users-action-btn.edit, button[onclick*="editUser"], [title*="Editar"]');
      if (editBtn) {
        // Scroll al botón para hacerlo visible
        editBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return 'found';
      }
      return false;
    });

    if (editClicked === 'found') {
      await sleep(500);
      // Ahora sí hacer click
      await page.click('.users-action-btn.edit, button[onclick*="editUser"], [title*="Editar"]');
    }

    if (editClicked) {
      await sleep(2000);

      // Verificar que se abrió el modal
      const modalOpen = await page.evaluate(() => {
        const modal = document.getElementById('editUserModal');
        return modal && modal.style.display !== 'none';
      });

      if (modalOpen) {
        console.log('   ✅ Modal de edición abierto');

        // Contar campos del formulario
        const fieldCount = await page.evaluate(() => {
          const modal = document.getElementById('editUserModal');
          if (!modal) return 0;
          return modal.querySelectorAll('input, select, textarea').length;
        });
        console.log(`   📝 Campos en formulario: ${fieldCount}`);

        // Verificar secciones
        const sections = await page.evaluate(() => {
          const modal = document.getElementById('editUserModal');
          if (!modal) return [];
          const headers = modal.querySelectorAll('h4');
          return Array.from(headers).map(h => h.textContent.trim());
        });
        console.log(`   📑 Secciones encontradas:`);
        sections.forEach(s => console.log(`      - ${s}`));

        // Cerrar modal
        await page.keyboard.press('Escape');
        await sleep(500);
      } else {
        console.log('   ❌ Modal no se abrió');
      }
    } else {
      console.log('   ⚠️ No se encontró botón de editar');
    }

    // === RESUMEN ===
    console.log('\n\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST COMPLETADO                            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('  El navegador permanece abierto para inspección manual.');
    console.log('  Puedes navegar libremente por los módulos.');
    console.log('\n  Presiona Ctrl+C en la terminal para cerrar.\n');

    // Mantener abierto
    await new Promise(() => {});

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n  El navegador permanece abierto para debug.');
    await new Promise(() => {});
  }
}

main().catch(console.error);
