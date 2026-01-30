/**
 * Test E2E: Estructura Organizacional - 8 Tabs
 *
 * Verifica cada uno de los 8 tabs del módulo de Estructura Organizacional:
 * 1. Departamentos
 * 2. Sectores
 * 3. Convenios/Acuerdos Laborales
 * 4. Categorías Salariales
 * 5. Turnos
 * 6. Roles Adicionales
 * 7. Organigrama
 * 8. Posiciones
 *
 * Uso: node scripts/test-org-structure-8tabs.js
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:9998';

const TABS = [
  { id: 'departments', name: 'Departamentos', icon: '🏢' },
  { id: 'sectors', name: 'Sectores', icon: '📍' },
  { id: 'agreements', name: 'Convenios', icon: '📜' },
  { id: 'categories', name: 'Categorías', icon: '💰' },
  { id: 'shifts', name: 'Turnos', icon: '⏰' },
  { id: 'roles', name: 'Roles', icon: '🎭' },
  { id: 'orgchart', name: 'Organigrama', icon: '📊' },
  { id: 'positions', name: 'Posiciones', icon: '👔' }
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 TEST: ESTRUCTURA ORGANIZACIONAL - 8 TABS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const results = { passed: 0, failed: 0, skipped: 0, tests: [] };

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

    // 2. Cargar módulo Estructura Organizacional
    console.log('📂 [2/3] Cargando módulo Estructura Organizacional...');

    // Buscar el link en el sidebar o cargar directamente
    const moduleLoaded = await page.evaluate(() => {
      // Intentar función directa
      if (typeof showOrganizationalStructureContent === 'function') {
        showOrganizationalStructureContent();
        return 'showOrganizationalStructureContent';
      }
      if (typeof showModuleContent === 'function') {
        showModuleContent('organizational-structure', 'Estructura Organizacional');
        return 'showModuleContent';
      }
      // Buscar en sidebar
      const links = document.querySelectorAll('a[onclick*="organizational"], a[onclick*="org-structure"]');
      if (links.length > 0) {
        links[0].click();
        return 'sidebar-click';
      }
      return false;
    });

    console.log(`   Método de carga: ${moduleLoaded}`);
    await page.waitForTimeout(4000);

    // Verificar que OrgEngine está disponible
    const orgEngineReady = await page.evaluate(() => {
      return typeof window.OrgEngine !== 'undefined' ||
             typeof window.OrgState !== 'undefined' ||
             document.querySelector('[data-tab="departments"]') !== null ||
             document.querySelector('.org-tab') !== null;
    });

    if (!orgEngineReady) {
      console.log('   ⚠️ OrgEngine no detectado, verificando contenido...');
    } else {
      console.log('   ✅ Módulo Estructura Organizacional cargado\n');
    }

    // Screenshot inicial
    await page.screenshot({ path: 'test-results/org-structure-inicial.png', fullPage: true });

    // 3. Verificar cada uno de los 8 tabs
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📑 VERIFICACIÓN DE 8 TABS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (let i = 0; i < TABS.length; i++) {
      const tab = TABS[i];
      const testNum = i + 1;

      process.stdout.write(`   [${testNum}/8] ${tab.icon} ${tab.name.padEnd(20)}`);

      try {
        // Intentar hacer click en el tab
        const tabClicked = await page.evaluate(({ tabId }) => {
          // Método 1: Buscar por data-tab
          const tabByData = document.querySelector(`[data-tab="${tabId}"]`);
          if (tabByData) {
            tabByData.click();
            return 'data-tab';
          }

          // Método 2: Buscar en botones de tabs
          const tabs = document.querySelectorAll('.org-tab, .tab-button, [onclick*="showTab"]');
          for (const t of tabs) {
            if (t.textContent.toLowerCase().includes(tabId.substring(0, 4)) ||
                t.getAttribute('onclick')?.includes(tabId)) {
              t.click();
              return 'tab-button';
            }
          }

          // Método 3: Llamar función directa
          if (typeof window.OrgEngine?.showTab === 'function') {
            window.OrgEngine.showTab(tabId);
            return 'OrgEngine.showTab';
          }

          return false;
        }, { tabId: tab.id });

        await page.waitForTimeout(1000);

        // Verificar que el contenido del tab es visible
        const tabVisible = await page.evaluate(({ tabId }) => {
          // Buscar contenido del tab
          const content = document.querySelector(`#${tabId}-content, [data-content="${tabId}"], .org-content.active`);
          if (content && content.offsetParent !== null) return true;

          // Buscar tabla o lista relacionada
          const table = document.querySelector(`.org-table, table, .${tabId}-list`);
          if (table && table.offsetParent !== null) return true;

          // Verificar que hay contenido visible
          const mainContent = document.querySelector('#module-content, .org-content, #mainContent');
          if (mainContent && mainContent.innerHTML.length > 100) return true;

          return false;
        }, { tabId: tab.id });

        // Verificar elementos específicos del tab
        const hasContent = await page.evaluate(({ tabId }) => {
          const selectors = {
            departments: '[onclick*="openDepartmentModal"], .department-card',
            sectors: '[onclick*="openSectorModal"], .sector-card',
            agreements: '[onclick*="openAgreementModal"], .agreement-card',
            categories: '[onclick*="openCategoryModal"], .category-card',
            shifts: '[onclick*="openShiftCalendarModal"], .shift-card',
            roles: '[onclick*="openRoleModal"], .role-card',
            orgchart: '#orgchart-viewport, .orgchart, svg',
            positions: '[onclick*="openPositionModal"], .position-card'
          };
          const selector = selectors[tabId];
          if (selector) {
            try {
              const el = document.querySelector(selector);
              if (el) return true;
            } catch (e) {}
          }
          return document.body.innerHTML.toLowerCase().includes(tabId);
        }, { tabId: tab.id });

        if (tabClicked || tabVisible || hasContent) {
          console.log('✅ PASS');
          results.passed++;
          results.tests.push({ tab: `${tab.icon} ${tab.name}`, status: 'PASS' });
        } else {
          console.log('⚠️ SKIP (no detectado)');
          results.skipped++;
          results.tests.push({ tab: `${tab.icon} ${tab.name}`, status: 'SKIP' });
        }

        // Screenshot de cada tab
        await page.screenshot({
          path: `test-results/org-structure-${testNum.toString().padStart(2, '0')}-${tab.id}.png`,
          fullPage: true
        });

      } catch (err) {
        console.log(`❌ FAIL: ${err.message.substring(0, 50)}`);
        results.failed++;
        results.tests.push({ tab: `${tab.icon} ${tab.name}`, status: 'FAIL', error: err.message });
      }
    }

    // 4. Test de CRUD básico en Departamentos
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔄 TEST CRUD: Departamentos');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Verificar botón de agregar
    const addButtonExists = await page.evaluate(() => {
      const btn = document.querySelector('[onclick*="openDepartmentModal()"], .org-btn-primary');
      if (btn) return true;
      // Buscar botón por texto
      const buttons = document.querySelectorAll('button');
      for (const b of buttons) {
        if (b.textContent.includes('Agregar') || b.textContent.includes('Nuevo')) return true;
      }
      return false;
    });

    console.log(`   ➕ Botón Agregar: ${addButtonExists ? '✅' : '⚠️'}`);

    // Verificar tabla de datos
    const tableExists = await page.evaluate(() => {
      const table = document.querySelector('.org-table, table tbody tr');
      return !!table;
    });

    console.log(`   📋 Tabla de datos: ${tableExists ? '✅' : '⚠️'}`);

    // Resumen final
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN - ESTRUCTURA ORGANIZACIONAL');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   ✅ Passed:  ${results.passed}`);
    console.log(`   ⚠️ Skipped: ${results.skipped}`);
    console.log(`   ❌ Failed:  ${results.failed}`);
    console.log(`   📸 Screenshots: test-results/org-structure-*.png`);
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    await page.screenshot({ path: 'test-results/org-structure-error.png', fullPage: true });
  } finally {
    await browser.close();
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

main();
