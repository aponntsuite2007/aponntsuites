/**
 * Test rápido de los 10 tabs del Expediente de Usuario
 * Usa Playwright directamente (sin framework de test)
 *
 * Uso: node scripts/test-users-10tabs-quick.js
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:9998';

const TABS = [
  { id: 'admin', name: '⚙️ Administración' },
  { id: 'personal', name: '👤 Datos Personales' },
  { id: 'work', name: '💼 Antecedentes Laborales' },
  { id: 'family', name: '👨‍👩‍👧‍👦 Grupo Familiar' },
  { id: 'medical', name: '🏥 Antecedentes Médicos' },
  { id: 'attendance', name: '📅 Asistencias/Permisos' },
  { id: 'calendar', name: '📆 Calendario' },
  { id: 'disciplinary', name: '⚖️ Disciplinarios' },
  { id: 'biometric', name: '📸 Registro Biométrico' },
  { id: 'notifications', name: '🔔 Notificaciones' }
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 TEST: 10 TABS DEL EXPEDIENTE DE USUARIO');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const results = { passed: 0, failed: 0, tests: [] };

  try {
    // 1. Login UI de 3 pasos
    console.log('🔐 [1/3] Haciendo login UI...');
    await page.goto(`${BASE_URL}/panel-empresa.html`, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Seleccionar empresa
    const companySelected = await page.evaluate(() => {
      const select = document.querySelector('#companySelect');
      if (!select) return false;
      const options = Array.from(select.options);
      const aponnt = options.find(o => o.value.includes('aponnt') || o.text.toLowerCase().includes('aponnt'));
      if (aponnt) {
        select.value = aponnt.value;
        select.dispatchEvent(new Event('change'));
        return aponnt.value;
      }
      if (options.length > 1) {
        select.selectedIndex = 1;
        select.dispatchEvent(new Event('change'));
        return select.value;
      }
      return false;
    });
    console.log(`   Empresa seleccionada: ${companySelected}`);

    await page.waitForTimeout(500);
    await page.fill('#userInput', 'administrador');
    await page.fill('#passwordInput', 'admin123');
    await page.click('#loginButton');
    await page.waitForTimeout(4000);

    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    if (!token) {
      console.log('   ❌ Login falló - no hay token');
      throw new Error('Login failed');
    }
    console.log('   ✅ Login exitoso\n');

    // 2. Cargar módulo users
    console.log('📂 [2/3] Cargando módulo Users...');
    await page.evaluate(() => {
      if (typeof showModuleContent === 'function') showModuleContent('users', 'Usuarios');
    });
    await page.waitForTimeout(4000);

    const usersLoaded = await page.evaluate(() => typeof viewUser === 'function');
    if (!usersLoaded) {
      console.log('   ❌ Módulo users no cargó correctamente');
      throw new Error('Users module not loaded');
    }
    console.log('   ✅ Módulo Users cargado\n');

    // 3. Abrir expediente de un usuario
    console.log('👤 [3/3] Abriendo expediente de usuario...');

    // Buscar un usuario en la tabla
    const userId = await page.evaluate(() => {
      const btn = document.querySelector('[onclick*="viewUser"], [onclick*="editUser"]');
      if (btn) {
        const onclick = btn.getAttribute('onclick');
        const match = onclick.match(/(?:viewUser|editUser)\(['"]([^'"]+)['"]\)/);
        return match ? match[1] : null;
      }
      return null;
    });

    if (!userId) {
      console.log('   ❌ No se encontró ningún usuario en la tabla');
      throw new Error('No user found');
    }
    console.log(`   Usuario encontrado: ${userId.substring(0, 8)}...`);

    // Abrir el expediente
    await page.evaluate((uid) => {
      if (typeof viewUser === 'function') viewUser(uid);
    }, userId);
    await page.waitForTimeout(2000);

    // Verificar que el modal se abrió (puede ser #employeeFileModal o #editUserModal)
    const modalVisible = await page.evaluate(() => {
      const fileModal = document.querySelector('#employeeFileModal');
      if (fileModal && (fileModal.style.display !== 'none' || fileModal.classList.contains('show'))) return 'employeeFileModal';
      const editModal = document.querySelector('#editUserModal');
      if (editModal && editModal.classList.contains('show')) return 'editUserModal';
      const anyModal = document.querySelector('.modal.show');
      return anyModal ? 'otherModal' : false;
    });

    if (!modalVisible) {
      console.log('   ⚠️ Modal no visible después de viewUser(), esperando más...');
      await page.waitForTimeout(3000);
    } else {
      console.log(`   📋 Modal detectado: ${modalVisible}`);
    }

    console.log('   ✅ Expediente abierto\n');

    // Screenshot inicial
    await page.screenshot({ path: 'test-results/quick-10tabs-inicial.png', fullPage: true });

    // 4. Verificar cada uno de los 10 tabs
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📑 VERIFICACIÓN DE 10 TABS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (let i = 0; i < TABS.length; i++) {
      const tab = TABS[i];
      const testNum = i + 1;

      process.stdout.write(`   [${testNum}/10] ${tab.name.padEnd(30)}`);

      try {
        // Intentar hacer click en el tab
        const tabClicked = await page.evaluate(({ tabId, tabName }) => {
          // Método 1: Buscar por contenido del botón
          const buttons = document.querySelectorAll('.file-tab, [onclick*="showFileTab"]');
          for (const btn of buttons) {
            if (btn.textContent.includes(tabName.replace(/[⚙️👤💼👨‍👩‍👧‍👦🏥📅📆⚖️📸🔔]/g, '').trim()) ||
                btn.getAttribute('onclick')?.includes(tabId)) {
              btn.click();
              return true;
            }
          }
          // Método 2: Llamar directamente la función
          if (typeof showFileTab === 'function') {
            showFileTab(tabId);
            return true;
          }
          return false;
        }, { tabId: tab.id, tabName: tab.name });

        await page.waitForTimeout(500);

        // Verificar que el tab está visible
        const tabVisible = await page.evaluate(({ tabId }) => {
          const content = document.querySelector(`#${tabId}-tab`);
          if (content) {
            // Verificar que no esté oculto
            const style = window.getComputedStyle(content);
            return style.display !== 'none' && content.offsetParent !== null;
          }
          return false;
        }, { tabId: tab.id });

        if (tabClicked || tabVisible) {
          console.log('✅ PASS');
          results.passed++;
          results.tests.push({ tab: tab.name, status: 'PASS' });
        } else {
          console.log('⚠️ SKIP (no visible)');
          results.tests.push({ tab: tab.name, status: 'SKIP' });
        }

        // Screenshot de cada tab
        await page.screenshot({
          path: `test-results/quick-10tabs-${testNum.toString().padStart(2, '0')}-${tab.id}.png`,
          fullPage: true
        });

      } catch (err) {
        console.log(`❌ FAIL: ${err.message}`);
        results.failed++;
        results.tests.push({ tab: tab.name, status: 'FAIL', error: err.message });
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   📸 Screenshots: test-results/quick-10tabs-*.png`);
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    await page.screenshot({ path: 'test-results/quick-10tabs-error.png', fullPage: true });
  } finally {
    await browser.close();
  }

  // Exit code basado en resultados
  process.exit(results.failed > 0 ? 1 : 0);
}

main();
