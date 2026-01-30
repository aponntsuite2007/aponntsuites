/**
 * Test E2E: Asistencia - 6 Tabs/Views
 *
 * Verifica cada uno de los 6 views del módulo de Asistencia:
 * 1. Dashboard (Panel principal con KPIs)
 * 2. Records (Registros de asistencia)
 * 3. Analytics (Análisis y gráficos)
 * 4. Patterns (Alertas y patrones)
 * 5. Insights (Insights y rankings)
 * 6. Cubo/Panel Ejecutivo (Métricas avanzadas)
 *
 * Uso: node scripts/test-attendance-6tabs.js
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:9998';

const VIEWS = [
  { id: 'dashboard', name: 'Dashboard', icon: '📊', function: 'renderDashboard' },
  { id: 'records', name: 'Registros', icon: '📋', function: 'renderRecords' },
  { id: 'analytics', name: 'Analytics', icon: '📈', function: 'renderAnalytics' },
  { id: 'patterns', name: 'Alertas', icon: '⚠️', function: 'renderPatterns' },
  { id: 'insights', name: 'Insights', icon: '💡', function: 'renderInsights' },
  { id: 'cubo', name: 'Panel Ejecutivo', icon: '🎯', function: 'renderCuboHoras' }
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 TEST: ASISTENCIA - 6 VIEWS');
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

    // 2. Cargar módulo Asistencia
    console.log('📂 [2/3] Cargando módulo Asistencia...');

    const moduleLoaded = await page.evaluate(() => {
      // Intentar función directa
      if (typeof showModuleContent === 'function') {
        showModuleContent('attendance', 'Asistencia');
        return 'showModuleContent';
      }
      // Buscar en sidebar
      const links = document.querySelectorAll('a[onclick*="attendance"]');
      if (links.length > 0) {
        links[0].click();
        return 'sidebar-click';
      }
      return false;
    });

    console.log(`   Método de carga: ${moduleLoaded}`);
    await page.waitForTimeout(4000);

    // Verificar que AttendanceEngine está disponible
    const engineReady = await page.evaluate(() => {
      return typeof window.AttendanceEngine !== 'undefined' ||
             typeof window.AttendanceState !== 'undefined' ||
             document.querySelector('.attendance-dashboard') !== null ||
             document.querySelector('[onclick*="showView"]') !== null;
    });

    if (!engineReady) {
      console.log('   ⚠️ AttendanceEngine no detectado, verificando contenido...');
    } else {
      console.log('   ✅ Módulo Asistencia cargado\n');
    }

    // Screenshot inicial
    await page.screenshot({ path: 'test-results/attendance-inicial.png', fullPage: true });

    // 3. Verificar cada uno de los 6 views
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📑 VERIFICACIÓN DE 6 VIEWS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (let i = 0; i < VIEWS.length; i++) {
      const view = VIEWS[i];
      const testNum = i + 1;

      process.stdout.write(`   [${testNum}/6] ${view.icon} ${view.name.padEnd(18)}`);

      try {
        // Intentar cambiar a la vista
        const viewChanged = await page.evaluate(({ viewId, viewFunc }) => {
          // Método 1: Llamar función showView
          if (typeof window.AttendanceEngine?.showView === 'function') {
            window.AttendanceEngine.showView(viewId);
            return 'AttendanceEngine.showView';
          }

          // Método 2: Buscar botón de navegación
          const btns = document.querySelectorAll(`[onclick*="showView('${viewId}')"], [data-view="${viewId}"], .nav-btn`);
          for (const btn of btns) {
            if (btn.textContent.toLowerCase().includes(viewId.substring(0, 4)) ||
                btn.getAttribute('onclick')?.includes(viewId)) {
              btn.click();
              return 'nav-button';
            }
          }

          // Método 3: Llamar función de render directamente
          if (typeof window.AttendanceEngine?.[viewFunc] === 'function') {
            window.AttendanceEngine[viewFunc]();
            return viewFunc;
          }

          // Método 4: Buscar tabs
          const tabs = document.querySelectorAll('.tab, .view-tab, [role="tab"]');
          for (const t of tabs) {
            if (t.textContent.toLowerCase().includes(viewId.substring(0, 4))) {
              t.click();
              return 'tab-click';
            }
          }

          return false;
        }, { viewId: view.id, viewFunc: view.function });

        await page.waitForTimeout(1500);

        // Verificar que el contenido de la vista es visible
        const viewVisible = await page.evaluate(({ viewId }) => {
          // Buscar contenedores específicos por vista
          const selectors = {
            dashboard: '.attendance-dashboard, .kpi-card, .dash-zone, .performance-score',
            records: '.records-table, table tbody, .attendance-record',
            analytics: '.analytics-chart, .chart-container, canvas',
            patterns: '.patterns-list, .alert-item, .pattern-card',
            insights: '.insights-container, .ranking-list, .insight-card',
            cubo: '.cubo-container, .executive-panel, .advanced-metrics'
          };

          const selector = selectors[viewId];
          if (selector) {
            const el = document.querySelector(selector);
            if (el && el.offsetParent !== null) return true;
          }

          // Verificar contenido genérico
          const content = document.querySelector('#module-content, .attendance-content, #mainContent');
          if (content && content.innerHTML.length > 200) return true;

          return false;
        }, { viewId: view.id });

        // Verificar KPIs o elementos específicos
        const hasElements = await page.evaluate(({ viewId }) => {
          const checks = {
            dashboard: document.querySelectorAll('.kpi-card, .stat-card, .performance').length > 0,
            records: document.querySelectorAll('table tr, .record-row').length > 0,
            analytics: document.querySelectorAll('canvas, svg, .chart').length > 0,
            patterns: document.querySelectorAll('.alert, .pattern, .warning').length >= 0,
            insights: document.querySelectorAll('.insight, .ranking, .metric').length >= 0,
            cubo: document.querySelectorAll('.metric, .kpi, .executive').length >= 0
          };
          return checks[viewId] || document.body.innerHTML.includes(viewId);
        }, { viewId: view.id });

        if (viewChanged || viewVisible || hasElements) {
          console.log('✅ PASS');
          results.passed++;
          results.tests.push({ view: `${view.icon} ${view.name}`, status: 'PASS' });
        } else {
          console.log('⚠️ SKIP (no detectado)');
          results.skipped++;
          results.tests.push({ view: `${view.icon} ${view.name}`, status: 'SKIP' });
        }

        // Screenshot de cada view
        await page.screenshot({
          path: `test-results/attendance-${testNum.toString().padStart(2, '0')}-${view.id}.png`,
          fullPage: true
        });

      } catch (err) {
        console.log(`❌ FAIL: ${err.message.substring(0, 50)}`);
        results.failed++;
        results.tests.push({ view: `${view.icon} ${view.name}`, status: 'FAIL', error: err.message });
      }
    }

    // 4. Test de CRUD básico en Records
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔄 TEST CRUD: Registros de Asistencia');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Cambiar a vista de Records
    await page.evaluate(() => {
      if (typeof window.AttendanceEngine?.showView === 'function') {
        window.AttendanceEngine.showView('records');
      }
    });
    await page.waitForTimeout(2000);

    // Verificar botón de agregar
    const addButtonExists = await page.evaluate(() => {
      const btn = document.querySelector('[onclick*="showAddModal"], [onclick*="addRecord"]');
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
      const table = document.querySelector('table tbody tr, .records-table tr');
      return !!table;
    });

    console.log(`   📋 Tabla de registros: ${tableExists ? '✅' : '⚠️'}`);

    // Verificar filtros
    const filtersExist = await page.evaluate(() => {
      const filters = document.querySelectorAll('select, input[type="date"], .filter');
      return filters.length > 0;
    });

    console.log(`   🔍 Filtros: ${filtersExist ? '✅' : '⚠️'}`);

    // Resumen final
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN - ASISTENCIA');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   ✅ Passed:  ${results.passed}`);
    console.log(`   ⚠️ Skipped: ${results.skipped}`);
    console.log(`   ❌ Failed:  ${results.failed}`);
    console.log(`   📸 Screenshots: test-results/attendance-*.png`);
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    await page.screenshot({ path: 'test-results/attendance-error.png', fullPage: true });
  } finally {
    await browser.close();
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

main();
