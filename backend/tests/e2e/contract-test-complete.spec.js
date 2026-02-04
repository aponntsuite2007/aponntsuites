/**
 * ═══════════════════════════════════════════════════════════════════════
 * CONTRACT TEST COMPLETO - 36 Módulos con CRUD + Verificación BD
 * ═══════════════════════════════════════════════════════════════════════
 *
 * PROPÓSITO:
 * Testear CRUD completo (Create, Read, Update, Delete) para los 36 módulos
 * comerciales de panel-empresa, verificando persistencia en PostgreSQL.
 *
 * FLOW:
 * 1. Login en panel-empresa (multi-tenant)
 * 2. Para CADA módulo de los 36:
 *    a. Navegar al módulo
 *    b. CREATE: Crear registro → Verificar en BD
 *    c. READ: Ver registro en lista
 *    d. UPDATE: Editar → Verificar cambios en BD
 *    e. DELETE: Eliminar → Verificar eliminación en BD
 * 3. Generar reporte HTML completo
 *
 * EJECUTAR:
 *   cd backend
 *   npx playwright test tests/e2e/contract-test-complete.spec.js --headed
 *
 * VER REPORTE:
 *   Abrir: backend/tests/test-results/contract-report-complete.html
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Importar configuración de módulos
const { allModules } = require('./modules-config');

// Importar helpers CRUD
const {
  createRecord,
  readRecord,
  updateRecord,
  deleteRecord,
  testModuleCRUD
} = require('./helpers/crud-helpers');

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:9998',
  timeout: 60000, // 60s por módulo (CRUD puede ser lento)

  // Credenciales de test
  credentials: {
    company: 'wftest-empresa-demo', // Slug de WFTEST_Empresa Demo SA
    username: 'admin',
    password: 'admin123'
  },

  // Directorio de resultados
  resultsDir: path.join(__dirname, '../test-results'),
  screenshotsDir: path.join(__dirname, '../test-results/screenshots-crud')
};

// Crear directorios si no existen
if (!fs.existsSync(CONFIG.resultsDir)) {
  fs.mkdirSync(CONFIG.resultsDir, { recursive: true });
}
if (!fs.existsSync(CONFIG.screenshotsDir)) {
  fs.mkdirSync(CONFIG.screenshotsDir, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Login en panel-empresa (multi-tenant: empresa → usuario → password)
 */
async function login(page) {
  console.log('🔐 Haciendo login...');

  // Forzar logout para limpiar sesiones
  await page.goto(`${CONFIG.baseUrl}/panel-empresa.html?forceLogin=true`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Paso 1: Seleccionar empresa
  await page.waitForSelector('#companySelect', { timeout: 10000 });

  // Esperar a que aparezcan opciones (carga dinámica)
  await page.waitForFunction(() => {
    const select = document.querySelector('#companySelect');
    return select && select.options.length > 1;
  }, { timeout: 10000 });

  await page.waitForTimeout(1000);

  // Seleccionar empresa
  await page.selectOption('#companySelect', CONFIG.credentials.company);
  await page.waitForTimeout(1000);

  // Paso 2: Ingresar usuario
  await page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
  await page.fill('#userInput', CONFIG.credentials.username);
  await page.waitForTimeout(500);

  // Paso 3: Ingresar password
  await page.fill('#passwordInput', CONFIG.credentials.password);
  await page.waitForTimeout(500);

  // Submit login
  await page.click('button:has-text("Ingresar"), button[type="submit"]');
  await page.waitForTimeout(3000);

  // Verificar login exitoso - debe desaparecer formulario de login y aparecer contenido
  try {
    // Esperar a que desaparezca el formulario de login
    await page.waitForSelector('#loginForm, #loginContainer, .login-container', {
      state: 'hidden',
      timeout: 5000
    }).catch(() => {});

    // O verificar que aparezca algún elemento del dashboard
    const dashboardVisible = await page.locator('body').evaluate(() => {
      // Verificar que ya no está el login visible
      const loginForm = document.querySelector('#loginForm, #loginContainer');
      if (loginForm && loginForm.style.display !== 'none') {
        return false;
      }
      // Verificar que hay contenido del dashboard (cualquier card de módulo)
      const moduleCards = document.querySelectorAll('[data-module-key], [data-module-name], .module-card');
      return moduleCards.length > 0;
    });

    if (dashboardVisible) {
      console.log('✅ Login exitoso');
      return true;
    } else {
      console.error('❌ Login falló - Dashboard no visible');
      return false;
    }
  } catch (error) {
    console.error('❌ Login falló -', error.message);
    return false;
  }
}

/**
 * Navegar a un módulo específico
 */
async function navigateToModule(page, moduleConfig) {
  console.log(`📂 Navegando a módulo: ${moduleConfig.name}...`);

  try {
    // Buscar el módulo en el menú/cards
    const moduleCard = page.locator(`[data-module-key="${moduleConfig.key}"], [data-module-name="${moduleConfig.menuText}"]`).first();

    // Si no se encuentra por atributos, buscar por texto
    if (await moduleCard.count() === 0) {
      const textCard = page.locator(`text="${moduleConfig.menuText}"`).first();
      if (await textCard.count() > 0) {
        await textCard.click();
      } else {
        throw new Error(`Módulo "${moduleConfig.menuText}" no encontrado en el panel`);
      }
    } else {
      await moduleCard.click();
    }

    await page.waitForTimeout(1000);

    // Esperar a que #mainContent tenga contenido (el módulo se carga ahí)
    // Basado en inspección DOM: mainContent recibe el HTML del módulo
    await page.waitForFunction(() => {
      const mainContent = document.getElementById('mainContent');
      return mainContent &&
             mainContent.style.display !== 'none' &&
             mainContent.children.length > 0 &&
             mainContent.innerHTML.length > 500;
    }, { timeout: 10000 });

    // Pequeña pausa para que termine de renderizar
    await page.waitForTimeout(500);

    console.log(`   ✅ Navegación exitosa a ${moduleConfig.name}`);
    return true;

  } catch (error) {
    console.error(`   ❌ Error navegando a ${moduleConfig.name}:`, error.message);
    return false;
  }
}

/**
 * Generar reporte HTML completo
 */
function generateHTMLReport(results) {
  const passedModules = results.filter(r => r.overallSuccess);
  const failedModules = results.filter(r => !r.overallSuccess);
  const successRate = ((passedModules.length / results.length) * 100).toFixed(1);

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contract Test - Reporte Completo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      min-height: 100vh;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    .header p {
      font-size: 1.2em;
      opacity: 0.9;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      padding: 40px;
      background: #f7f9fc;
    }
    .stat-card {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
    }
    .stat-value {
      font-size: 3em;
      font-weight: bold;
      margin: 10px 0;
    }
    .stat-label {
      color: #666;
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .success { color: #10b981; }
    .error { color: #ef4444; }
    .warning { color: #f59e0b; }
    .results {
      padding: 40px;
    }
    .module-result {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      transition: all 0.3s;
    }
    .module-result:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }
    .module-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e5e7eb;
    }
    .module-name {
      font-size: 1.3em;
      font-weight: 600;
    }
    .module-badge {
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-pass {
      background: #d1fae5;
      color: #065f46;
    }
    .badge-fail {
      background: #fee2e2;
      color: #991b1b;
    }
    .crud-operations {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-top: 15px;
    }
    .crud-op {
      text-align: center;
      padding: 15px;
      background: #f9fafb;
      border-radius: 6px;
    }
    .crud-op-name {
      font-size: 0.85em;
      color: #666;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .crud-op-status {
      font-size: 2em;
    }
    .error-details {
      margin-top: 15px;
      padding: 15px;
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      color: #991b1b;
    }
    .footer {
      background: #1f2937;
      color: white;
      padding: 30px;
      text-align: center;
    }
    .footer p {
      opacity: 0.7;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧪 Contract Test - Reporte Completo</h1>
      <p>Testing CRUD + Verificación BD - 36 Módulos Comerciales</p>
      <p style="margin-top: 10px; font-size: 0.9em;">
        ${new Date().toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'long' })}
      </p>
    </div>

    <div class="summary">
      <div class="stat-card">
        <div class="stat-label">Módulos Testeados</div>
        <div class="stat-value">${results.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Exitosos</div>
        <div class="stat-value success">${passedModules.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Fallidos</div>
        <div class="stat-value error">${failedModules.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tasa de Éxito</div>
        <div class="stat-value ${successRate >= 80 ? 'success' : 'warning'}">${successRate}%</div>
      </div>
    </div>

    <div class="results">
      <h2 style="margin-bottom: 30px; font-size: 1.8em;">Resultados por Módulo</h2>

      ${results.map(result => `
        <div class="module-result">
          <div class="module-header">
            <div class="module-name">${result.name}</div>
            <span class="module-badge ${result.overallSuccess ? 'badge-pass' : 'badge-fail'}">
              ${result.overallSuccess ? '✅ PASS' : '❌ FAIL'}
            </span>
          </div>

          <div class="crud-operations">
            <div class="crud-op">
              <div class="crud-op-name">Create</div>
              <div class="crud-op-status">${result.create.success ? '✅' : '❌'}</div>
            </div>
            <div class="crud-op">
              <div class="crud-op-name">Read</div>
              <div class="crud-op-status">${result.read.success ? '✅' : '❌'}</div>
            </div>
            <div class="crud-op">
              <div class="crud-op-name">Update</div>
              <div class="crud-op-status">${result.update.success ? '✅' : '❌'}</div>
            </div>
            <div class="crud-op">
              <div class="crud-op-name">Delete</div>
              <div class="crud-op-status">${result.delete.success ? '✅' : '❌'}</div>
            </div>
          </div>

          ${result.error ? `
            <div class="error-details">
              <strong>Error:</strong> ${result.error}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>

    <div class="footer">
      <p>🤖 Generado por Claude Code - Sistema de Testing Automatizado</p>
      <p style="margin-top: 10px;">
        ${successRate >= 90 ? '🎉 Excelente! La mayoría de los módulos funcionan correctamente.' : ''}
        ${successRate >= 70 && successRate < 90 ? '⚠️ Algunos módulos necesitan atención.' : ''}
        ${successRate < 70 ? '🔴 Se detectaron múltiples problemas. Revisar inmediatamente.' : ''}
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const reportPath = path.join(CONFIG.resultsDir, 'contract-report-complete.html');
  fs.writeFileSync(reportPath, html, 'utf8');

  console.log(`\n✅ Reporte generado: ${reportPath}`);
  console.log(`   Abrir con: start ${reportPath}\n`);

  return reportPath;
}

// ═══════════════════════════════════════════════════════════════════════
// TEST PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════

test.describe('Contract Test - 36 Módulos Comerciales', () => {
  test.setTimeout(120000); // 2 minutos por test (pueden ser muchos módulos)

  test('CRUD completo sobre 36 módulos con verificación BD', async ({ page }) => {
    console.log('\n' + '═'.repeat(70));
    console.log('🧪 INICIANDO CONTRACT TEST COMPLETO');
    console.log('═'.repeat(70));
    console.log(`📊 Total módulos a testear: ${allModules.length}`);
    console.log('═'.repeat(70) + '\n');

    // 1. LOGIN
    const loginSuccess = await login(page);
    expect(loginSuccess).toBe(true);

    // Screenshot inicial
    await page.screenshot({
      path: path.join(CONFIG.screenshotsDir, '00-post-login.png'),
      fullPage: true
    });

    // 2. LOOP SOBRE TODOS LOS MÓDULOS
    const results = [];
    let moduleIndex = 1;

    for (const moduleConfig of allModules) {
      console.log(`\n[${ moduleIndex}/${allModules.length}] ═════════════════════════════════════`);
      console.log(`🧪 Testeando: ${moduleConfig.name}`);
      console.log('═'.repeat(70));

      try {
        // Navegar al módulo
        const navigationSuccess = await navigateToModule(page, moduleConfig);

        if (!navigationSuccess) {
          results.push({
            module: moduleConfig.key,
            name: moduleConfig.name,
            create: { success: false },
            read: { success: false },
            update: { success: false },
            delete: { success: false },
            overallSuccess: false,
            error: 'No se pudo navegar al módulo'
          });
          moduleIndex++;
          continue;
        }

        // Screenshot del módulo
        await page.screenshot({
          path: path.join(CONFIG.screenshotsDir, `${moduleIndex.toString().padStart(2, '0')}-${moduleConfig.key}.png`),
          fullPage: true
        });

        // Ejecutar CRUD completo
        const crudResult = await testModuleCRUD(page, moduleConfig);
        results.push(crudResult);

      } catch (error) {
        console.error(`❌ Error crítico en ${moduleConfig.name}:`, error.message);
        results.push({
          module: moduleConfig.key,
          name: moduleConfig.name,
          create: { success: false },
          read: { success: false },
          update: { success: false },
          delete: { success: false },
          overallSuccess: false,
          error: error.message
        });
      } finally {
        // 🧹 CLEANUP AGRESIVO: Cerrar TODOS los modales antes del siguiente módulo
        try {
          await page.evaluate(() => {
            // 1. Cerrar modales Bootstrap usando jQuery si está disponible
            if (typeof $ !== 'undefined' && typeof $('.modal').modal === 'function') {
              $('.modal').modal('hide');
            }

            // 2. Buscar y remover TODOS los elementos de modal (by class, by ID, by attribute)
            const modalSelectors = [
              '.modal',
              '[role="dialog"]',
              '.modal-backdrop',
              '.modal-open',
              '[id*="Modal"]',           // Cualquier ID que contenga "Modal"
              '[id*="modal"]',           // Cualquier ID que contenga "modal"
              '[class*="modal"]',        // Cualquier class que contenga "modal"
              'form.modal-form',
              '.dialog',
              '[data-modal]'
            ];

            modalSelectors.forEach(selector => {
              document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.opacity = '0';
                el.style.pointerEvents = 'none';
                el.style.zIndex = '-9999';
                // Removerlo del DOM completamente
                if (el.parentNode) {
                  el.parentNode.removeChild(el);
                }
              });
            });

            // 3. Limpiar clases del body
            if (document.body.classList.contains('modal-open')) {
              document.body.classList.remove('modal-open');
            }

            // 4. Restaurar estilos del body
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';

            // 5. Remover cualquier overlay/backdrop
            document.querySelectorAll('.fade, .in, .show, [style*="backdrop"]').forEach(el => {
              if (el.style.backgroundColor && el.style.backgroundColor.includes('rgba')) {
                el.remove();
              }
            });
          });

          // Pequeña pausa adicional para asegurar que el DOM se limpió
          await page.waitForTimeout(500);

          console.log('   🧹 Cleanup AGRESIVO: Modales eliminados del DOM');
        } catch (cleanupError) {
          console.warn(`   ⚠️ Error en cleanup: ${cleanupError.message}`);
        }
      }

      moduleIndex++;

      // Pausa entre módulos
      await page.waitForTimeout(1000);
    }

    // 3. GENERAR REPORTE
    console.log('\n' + '═'.repeat(70));
    console.log('📊 GENERANDO REPORTE FINAL...');
    console.log('═'.repeat(70));

    const reportPath = generateHTMLReport(results);

    // 4. RESUMEN FINAL
    const passedCount = results.filter(r => r.overallSuccess).length;
    const failedCount = results.filter(r => !r.overallSuccess).length;
    const successRate = ((passedCount / results.length) * 100).toFixed(1);

    console.log('\n' + '═'.repeat(70));
    console.log('📊 RESUMEN FINAL');
    console.log('═'.repeat(70));
    console.log(`   Total módulos: ${results.length}`);
    console.log(`   ✅ Exitosos: ${passedCount}`);
    console.log(`   ❌ Fallidos: ${failedCount}`);
    console.log(`   📈 Tasa de éxito: ${successRate}%`);
    console.log('═'.repeat(70));

    // Listar módulos fallidos
    if (failedCount > 0) {
      console.log('\n❌ MÓDULOS FALLIDOS:');
      results.filter(r => !r.overallSuccess).forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.name} - ${r.error || 'Ver detalles en reporte'}`);
      });
    }

    console.log(`\n✅ Reporte completo: ${reportPath}\n`);

    // Asserción final: Si menos del 50% pasa, fallar el test
    expect(passedCount).toBeGreaterThanOrEqual(results.length * 0.5);
  });
});
