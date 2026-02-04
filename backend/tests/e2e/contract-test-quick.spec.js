/**
 * ═══════════════════════════════════════════════════════════════════════
 * CONTRACT TEST RÁPIDO - 5 Módulos para validar estrategia
 * ═══════════════════════════════════════════════════════════════════════
 */

const { test } = require('@playwright/test');
const path = require('path');

// Importar solo los primeros 5 módulos
const { allModules } = require('./modules-config');
const testModules = allModules.slice(0, 5); // Solo los primeros 5

const { testModuleCRUD } = require('./helpers/crud-helpers');

const CONFIG = {
  baseUrl: 'http://localhost:9998',
  timeout: 60000,
  credentials: {
    company: 'wftest-empresa-demo',
    username: 'admin',
    password: 'admin123'
  }
};

async function login(page) {
  console.log('🔐 Haciendo login...');

  await page.goto(`${CONFIG.baseUrl}/panel-empresa.html?forceLogin=true`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await page.waitForSelector('#companySelect', { timeout: 10000 });
  await page.waitForFunction(() => {
    const select = document.querySelector('#companySelect');
    return select && select.options.length > 1;
  }, { timeout: 10000 });

  await page.waitForTimeout(1000);
  await page.selectOption('#companySelect', CONFIG.credentials.company);
  await page.waitForTimeout(1000);

  await page.waitForSelector('#userInput', { timeout: 10000 });
  await page.fill('#userInput', CONFIG.credentials.username);
  await page.waitForTimeout(500);

  await page.fill('#passwordInput', CONFIG.credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  const dashboardVisible = await page.locator('body').evaluate(() => {
    const loginForm = document.querySelector('#loginForm, #loginContainer');
    if (loginForm && loginForm.style.display !== 'none') {
      return false;
    }
    const moduleCards = document.querySelectorAll('[data-module-key], [data-module-name], .module-card');
    return moduleCards.length > 0;
  });

  if (dashboardVisible) {
    console.log('✅ Login exitoso');
    return true;
  } else {
    console.error('❌ Login falló');
    return false;
  }
}

async function navigateToModule(page, moduleConfig) {
  console.log(`📂 Navegando a módulo: ${moduleConfig.name}...`);

  try {
    const moduleCard = page.locator(`[data-module-key="${moduleConfig.key}"], [data-module-name="${moduleConfig.menuText}"]`).first();

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

    await page.waitForFunction(() => {
      const mainContent = document.getElementById('mainContent');
      return mainContent &&
             mainContent.style.display !== 'none' &&
             mainContent.children.length > 0 &&
             mainContent.innerHTML.length > 500;
    }, { timeout: 10000 });

    await page.waitForTimeout(500);

    console.log(`   ✅ Navegación exitosa a ${moduleConfig.name}`);
    return true;

  } catch (error) {
    console.error(`   ❌ Error navegando a ${moduleConfig.name}:`, error.message);
    return false;
  }
}

test.describe('Contract Test RÁPIDO - 5 Módulos', () => {
  test.setTimeout(120000);

  test('Validar estrategia de CRUD en 5 módulos', async ({ page }) => {
    console.log('\n' + '═'.repeat(70));
    console.log('🧪 TEST RÁPIDO - 5 MÓDULOS');
    console.log('═'.repeat(70));
    console.log(`📊 Módulos a testear: ${testModules.length}`);
    console.log('═'.repeat(70) + '\n');

    const loginSuccess = await login(page);
    if (!loginSuccess) {
      throw new Error('Login falló');
    }

    const results = [];
    let moduleIndex = 1;

    for (const moduleConfig of testModules) {
      console.log(`\n[${moduleIndex}/${testModules.length}] ═════════════════════════════════════`);
      console.log(`🧪 Testeando: ${moduleConfig.name}`);
      console.log('═'.repeat(70));

      try {
        const navigationSuccess = await navigateToModule(page, moduleConfig);

        if (!navigationSuccess) {
          results.push({
            module: moduleConfig.key,
            name: moduleConfig.name,
            overallSuccess: false,
            error: 'No se pudo navegar al módulo'
          });
          moduleIndex++;
          continue;
        }

        const crudResult = await testModuleCRUD(page, moduleConfig);
        results.push(crudResult);

      } catch (error) {
        console.error(`❌ Error crítico en ${moduleConfig.name}:`, error.message);
        results.push({
          module: moduleConfig.key,
          name: moduleConfig.name,
          overallSuccess: false,
          error: error.message
        });
      } finally {
        // 🧹 CLEANUP AGRESIVO
        try {
          await page.evaluate(() => {
            // 1. jQuery Bootstrap
            if (typeof $ !== 'undefined' && typeof $('.modal').modal === 'function') {
              $('.modal').modal('hide');
            }

            // 2. Remover TODOS los modales
            const modalSelectors = [
              '.modal', '[role="dialog"]', '.modal-backdrop',
              '[id*="Modal"]', '[id*="modal"]', '[class*="modal"]',
              'form.modal-form', '.dialog', '[data-modal]'
            ];

            modalSelectors.forEach(selector => {
              document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.opacity = '0';
                el.style.pointerEvents = 'none';
                if (el.parentNode) {
                  el.parentNode.removeChild(el);
                }
              });
            });

            // 3. Limpiar body
            if (document.body.classList.contains('modal-open')) {
              document.body.classList.remove('modal-open');
            }
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
          });

          await page.waitForTimeout(500);
          console.log('   🧹 Cleanup: Modales eliminados');
        } catch (cleanupError) {
          console.warn(`   ⚠️ Error en cleanup: ${cleanupError.message}`);
        }
      }

      moduleIndex++;
      await page.waitForTimeout(1000);
    }

    // RESUMEN
    const passedCount = results.filter(r => r.overallSuccess).length;
    const successRate = ((passedCount / results.length) * 100).toFixed(1);

    console.log('\n' + '═'.repeat(70));
    console.log('📊 RESUMEN TEST RÁPIDO');
    console.log('═'.repeat(70));
    console.log(`   ✅ Exitosos: ${passedCount}/${results.length}`);
    console.log(`   📈 Tasa de éxito: ${successRate}%`);
    console.log('═'.repeat(70) + '\n');

    if (passedCount === 0) {
      console.error('\n❌ FALLOS:');
      results.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.name} - ${r.error || 'Ver detalles'}`);
      });
    }
  });
});
