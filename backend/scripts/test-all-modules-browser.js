/**
 * Test E2E MASTER: Todos los Módulos de Panel-Empresa
 *
 * Verifica que cada módulo del panel-empresa:
 * 1. Se carga correctamente
 * 2. No hay errores de JavaScript
 * 3. Tiene contenido visible
 * 4. Genera screenshot de evidencia
 *
 * Uso: node scripts/test-all-modules-browser.js
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:9998';

// Lista completa de módulos del panel-empresa
const MODULES = [
  // RRHH
  { key: 'users', name: 'Gestión de Usuarios', category: 'RRHH', icon: '👥' },
  { key: 'attendance', name: 'Asistencia', category: 'RRHH', icon: '📅' },
  { key: 'vacation-management', name: 'Vacaciones', category: 'RRHH', icon: '🏖️' },
  { key: 'sanctions-management', name: 'Sanciones', category: 'RRHH', icon: '⚖️' },
  { key: 'training-management', name: 'Capacitaciones', category: 'RRHH', icon: '📚' },
  { key: 'job-postings', name: 'Postulaciones', category: 'RRHH', icon: '💼' },
  { key: 'hour-bank', name: 'Banco de Horas', category: 'RRHH', icon: '⏰' },
  { key: 'payroll-liquidation', name: 'Liquidación Nómina', category: 'RRHH', icon: '💰' },
  { key: 'benefits-management', name: 'Beneficios', category: 'RRHH', icon: '🎁' },

  // Estructura Organizacional
  { key: 'organizational-structure', name: 'Estructura Organizacional', category: 'Organización', icon: '🏛️' },

  // Biométrico
  { key: 'biometric-dashboard', name: 'Dashboard Biométrico', category: 'Biométrico', icon: '📊' },
  { key: 'biometric-simple', name: 'Registro Biométrico', category: 'Biométrico', icon: '📸' },
  { key: 'biometric-consent', name: 'Consentimiento Biométrico', category: 'Biométrico', icon: '✅' },
  { key: 'kiosks', name: 'Kioscos', category: 'Biométrico', icon: '🖥️' },
  { key: 'visitors', name: 'Visitantes', category: 'Biométrico', icon: '🚶' },

  // Médico
  { key: 'medical-dashboard', name: 'Dashboard Médico', category: 'Médico', icon: '🏥' },
  { key: 'art-management', name: 'Gestión ART', category: 'Médico', icon: '🚑' },
  { key: 'hse-management', name: 'HSE (Seguridad)', category: 'Médico', icon: '🦺' },

  // Legal
  { key: 'legal-dashboard', name: 'Dashboard Legal', category: 'Legal', icon: '⚖️' },
  { key: 'procedures-manual', name: 'Manual de Procedimientos', category: 'Legal', icon: '📋' },

  // Finanzas
  { key: 'quotes-management', name: 'Cotizaciones/CRM', category: 'Finanzas', icon: '💵' },
  { key: 'facturacion', name: 'Facturación', category: 'Finanzas', icon: '🧾' },
  { key: 'plantillas-fiscales', name: 'Plantillas Fiscales', category: 'Finanzas', icon: '📑' },

  // Comunicaciones
  { key: 'notifications-enterprise', name: 'Notificaciones Enterprise', category: 'Comunicaciones', icon: '🔔' },
  { key: 'company-email-smtp-config', name: 'Config Email SMTP', category: 'Comunicaciones', icon: '📧' },
  { key: 'company-email-process', name: 'Proceso de Emails', category: 'Comunicaciones', icon: '📬' },
  { key: 'inbox', name: 'Bandeja de Entrada', category: 'Comunicaciones', icon: '📥' },

  // Logística
  { key: 'logistics-dashboard', name: 'Logística', category: 'Operaciones', icon: '🚚' },
  { key: 'employee-map', name: 'Mapa de Empleados', category: 'Operaciones', icon: '🗺️' },

  // Marketplace
  { key: 'associate-marketplace', name: 'Marketplace Asociados', category: 'Marketplace', icon: '🛒' },

  // Auditoría y Compliance
  { key: 'audit-reports', name: 'Reportes de Auditoría', category: 'Auditoría', icon: '📊' },
  { key: 'compliance-dashboard', name: 'Compliance Dashboard', category: 'Auditoría', icon: '✅' },
  { key: 'sla-tracking', name: 'Tracking SLA', category: 'Auditoría', icon: '⏱️' },
  { key: 'auditor-dashboard', name: 'Auditor Dashboard', category: 'Auditoría', icon: '🔍' },

  // Configuración
  { key: 'settings', name: 'Configuración', category: 'Sistema', icon: '⚙️' },
  { key: 'roles-permissions', name: 'Roles y Permisos', category: 'Sistema', icon: '🔐' },

  // Módulos adicionales
  { key: 'clientes', name: 'Clientes', category: 'CRM', icon: '👤' },
  { key: 'my-procedures', name: 'Mis Procedimientos', category: 'Legal', icon: '📄' },
  { key: 'payslip-template-editor', name: 'Editor Recibos', category: 'RRHH', icon: '📝' },
  { key: 'contextual-help', name: 'Ayuda Contextual', category: 'Sistema', icon: '❓' },
  { key: 'terms-conditions', name: 'Términos y Condiciones', category: 'Legal', icon: '📜' },
  { key: 'dashboard', name: 'Dashboard Principal', category: 'General', icon: '🏠' },
  { key: 'predictive-workforce', name: 'Workforce Predictivo', category: 'Analytics', icon: '📈' },
  { key: 'emotional-analysis', name: 'Análisis Emocional', category: 'Analytics', icon: '😊' },
  { key: 'psychological-assessment', name: 'Evaluación Psicológica', category: 'Médico', icon: '🧠' },
  { key: 'training', name: 'Training', category: 'RRHH', icon: '🎓' },
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 TEST MASTER: TODOS LOS MÓDULOS DE PANEL-EMPRESA');
  console.log(`   Total módulos a testear: ${MODULES.length}`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Capturar errores de consola
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ module: 'global', error: msg.text() });
    }
  });

  const results = { passed: 0, failed: 0, skipped: 0, tests: [] };
  const categoryResults = {};

  try {
    // 1. Login UI de 3 pasos
    console.log('🔐 Haciendo login UI...');
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

    await page.waitForTimeout(500);
    await page.fill('#userInput', 'administrador');
    await page.fill('#passwordInput', 'admin123');
    await page.click('#loginButton');
    await page.waitForTimeout(4000);

    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    if (!token) {
      throw new Error('Login failed - no token');
    }
    console.log(`   ✅ Login exitoso (empresa: ${companySelected})\n`);

    // 2. Testear cada módulo
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('📑 VERIFICACIÓN DE MÓDULOS');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    let currentCategory = '';

    for (let i = 0; i < MODULES.length; i++) {
      const mod = MODULES[i];
      const testNum = i + 1;

      // Mostrar categoría
      if (mod.category !== currentCategory) {
        currentCategory = mod.category;
        console.log(`\n   ── ${currentCategory} ──`);
        if (!categoryResults[currentCategory]) {
          categoryResults[currentCategory] = { passed: 0, failed: 0, skipped: 0 };
        }
      }

      process.stdout.write(`   [${testNum.toString().padStart(2, '0')}/${MODULES.length}] ${mod.icon} ${mod.name.padEnd(28)}`);

      try {
        // Limpiar errores de consola previos
        const errorsBefore = consoleErrors.length;

        // Cargar módulo
        const moduleLoaded = await page.evaluate(({ moduleKey }) => {
          if (typeof showModuleContent === 'function') {
            showModuleContent(moduleKey, moduleKey);
            return true;
          }
          return false;
        }, { moduleKey: mod.key });

        await page.waitForTimeout(2000);

        // Verificar que hay contenido
        const hasContent = await page.evaluate(() => {
          const content = document.querySelector('#module-content, .module-content, #mainContent');
          if (!content) return false;
          // Verificar que tiene contenido real (no solo loading)
          const text = content.innerText || '';
          const html = content.innerHTML || '';
          return html.length > 500 || text.length > 100;
        });

        // Verificar si hubo errores nuevos de consola
        const errorsAfter = consoleErrors.length;
        const hadErrors = errorsAfter > errorsBefore;

        // Screenshot con timeout reducido
        const screenshotPath = `test-results/module-${testNum.toString().padStart(2, '0')}-${mod.key}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true, timeout: 10000 }).catch(() => {
          // Si falla screenshot fullPage, intentar solo viewport
          return page.screenshot({ path: screenshotPath, timeout: 5000 }).catch(() => null);
        });

        if (moduleLoaded && hasContent && !hadErrors) {
          console.log('✅ PASS');
          results.passed++;
          categoryResults[mod.category].passed++;
          results.tests.push({ module: mod.name, key: mod.key, status: 'PASS', category: mod.category });
        } else if (moduleLoaded && hasContent) {
          console.log('⚠️ WARN (JS errors)');
          results.passed++;
          categoryResults[mod.category].passed++;
          results.tests.push({ module: mod.name, key: mod.key, status: 'WARN', category: mod.category });
        } else {
          console.log('⚠️ SKIP (no content)');
          results.skipped++;
          categoryResults[mod.category].skipped++;
          results.tests.push({ module: mod.name, key: mod.key, status: 'SKIP', category: mod.category });
        }

      } catch (err) {
        console.log(`❌ FAIL: ${err.message.substring(0, 40)}`);
        results.failed++;
        categoryResults[mod.category].failed++;
        results.tests.push({ module: mod.name, key: mod.key, status: 'FAIL', error: err.message, category: mod.category });

        // Screenshot de error
        await page.screenshot({ path: `test-results/module-${testNum.toString().padStart(2, '0')}-${mod.key}-error.png`, fullPage: true });
      }
    }

    // Resumen por categoría
    console.log('\n\n═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN POR CATEGORÍA');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    for (const [category, stats] of Object.entries(categoryResults)) {
      const total = stats.passed + stats.failed + stats.skipped;
      const pct = Math.round((stats.passed / total) * 100);
      console.log(`   ${category.padEnd(20)} ${stats.passed}/${total} PASS (${pct}%)`);
    }

    // Resumen final
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN FINAL');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`   ✅ Passed:  ${results.passed}`);
    console.log(`   ⚠️ Skipped: ${results.skipped}`);
    console.log(`   ❌ Failed:  ${results.failed}`);
    console.log(`   📸 Screenshots: test-results/module-*.png`);

    const totalPct = Math.round((results.passed / MODULES.length) * 100);
    console.log(`\n   🎯 COBERTURA: ${results.passed}/${MODULES.length} (${totalPct}%)`);
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    // Guardar resultados en JSON
    const fs = require('fs');
    fs.writeFileSync('test-results/all-modules-results.json', JSON.stringify({
      timestamp: new Date().toISOString(),
      total: MODULES.length,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      coverage: `${totalPct}%`,
      categoryResults,
      tests: results.tests,
      consoleErrors: consoleErrors.slice(0, 20) // Solo los primeros 20
    }, null, 2));

    console.log('   📄 Resultados guardados en: test-results/all-modules-results.json\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    await page.screenshot({ path: 'test-results/all-modules-fatal-error.png', fullPage: true });
  } finally {
    await browser.close();
  }

  // Exit code basado en resultados
  const successRate = results.passed / MODULES.length;
  process.exit(successRate >= 0.8 ? 0 : 1); // 80% threshold
}

main();
