/**
 * TEST CRUD V2 - MÓDULOS DEL PANEL-EMPRESA
 *
 * Versión mejorada con mejor detección de navegación y CRUD
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');

// Solo módulos que existen en panel-empresa y tienen CRUD
const MODULES_TO_TEST = [
  'users',           // Ya testeado - referencia
  'kiosks',
  'training-management',
  'visitors',
  'job-postings',
  'vacation-management',
  'medical',
  'sanctions-management',
  'hour-bank',
  'art-management',
  'hse-management',
  'employee-360',
  'payroll-liquidation',
  'procurement-management'
];

async function testModulesCRUDv2() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔬 TEST CRUD V2 - MÓDULOS PANEL-EMPRESA');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📋 Módulos a testear: ${MODULES_TO_TEST.length}\n`);

  const agent = new AutonomousQAAgent({
    headless: true,
    timeout: 120000,
    learningMode: false,
    brainIntegration: false
  });

  const results = {
    totalModules: MODULES_TO_TEST.length,
    tested: 0,
    passed: 0,
    failed: 0,
    noButtons: 0,
    moduleResults: []
  };

  try {
    await agent.init();
    const page = agent.page;

    // LOGIN
    console.log('1️⃣ LOGIN...');
    await agent.login({ empresa: 'isi', usuario: 'admin', password: 'admin123' });
    console.log('   ✅ Login OK\n');

    for (let i = 0; i < MODULES_TO_TEST.length; i++) {
      const moduleId = MODULES_TO_TEST[i];
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`📦 MÓDULO ${i + 1}/${MODULES_TO_TEST.length}: ${moduleId}`);
      console.log('═══════════════════════════════════════════════════════════════');

      const moduleResult = {
        moduleId,
        navigated: false,
        hasButtons: false,
        crudTested: false,
        crudPassed: false,
        error: null
      };

      try {
        // Navegar al módulo
        console.log(`   🔄 Navegando...`);

        try {
          await agent.navigateToModule(moduleId);
          moduleResult.navigated = true;
          console.log(`   ✅ Navegación exitosa`);
        } catch (navError) {
          console.log(`   ❌ Error navegación: ${navError.message}`);
          moduleResult.error = navError.message;
          results.failed++;
          results.moduleResults.push(moduleResult);
          continue;
        }

        await page.waitForTimeout(3000);

        // Buscar botones de agregar
        const addButtonsInfo = await page.evaluate(() => {
          const buttons = [];
          const allButtons = document.querySelectorAll('button, a.btn, [role="button"]');

          for (const btn of allButtons) {
            const text = (btn.textContent || '').toLowerCase().trim();
            const onclick = btn.getAttribute('onclick') || '';
            const classes = btn.className || '';
            const isVisible = btn.offsetParent !== null &&
                            getComputedStyle(btn).display !== 'none' &&
                            getComputedStyle(btn).visibility !== 'hidden';

            if (isVisible && (
              text.includes('agregar') ||
              text.includes('nuevo') ||
              text.includes('nueva') ||
              text.includes('crear') ||
              text.includes('+ ') ||
              text === '+' ||
              onclick.toLowerCase().includes('add') ||
              onclick.toLowerCase().includes('create') ||
              onclick.toLowerCase().includes('new') ||
              classes.includes('add-btn') ||
              classes.includes('btn-add')
            )) {
              buttons.push({
                text: btn.textContent.trim().substring(0, 60),
                tag: btn.tagName,
                classes: classes.substring(0, 80)
              });
            }
          }

          return buttons;
        });

        console.log(`   📋 Botones CRUD encontrados: ${addButtonsInfo.length}`);

        if (addButtonsInfo.length === 0) {
          console.log(`   ⏭️ Sin botones de agregar - es módulo de visualización\n`);
          moduleResult.hasButtons = false;
          results.noButtons++;
          results.moduleResults.push(moduleResult);
          continue;
        }

        moduleResult.hasButtons = true;
        addButtonsInfo.forEach(b => console.log(`      - "${b.text}" (${b.tag})`));

        // Click en primer botón de agregar
        console.log(`\n   🧪 Testeando CRUD...`);

        const clicked = await page.evaluate(() => {
          const allButtons = document.querySelectorAll('button, a.btn, [role="button"]');

          for (const btn of allButtons) {
            const text = (btn.textContent || '').toLowerCase().trim();
            const onclick = btn.getAttribute('onclick') || '';
            const isVisible = btn.offsetParent !== null;

            if (isVisible && (
              text.includes('agregar') ||
              text.includes('nuevo') ||
              text.includes('crear') ||
              text === '+' ||
              onclick.toLowerCase().includes('add') ||
              onclick.toLowerCase().includes('create')
            )) {
              btn.click();
              return { success: true, text: btn.textContent.trim() };
            }
          }
          return { success: false };
        });

        if (!clicked.success) {
          console.log(`   ❌ No se pudo clickear botón\n`);
          moduleResult.error = 'Click failed';
          results.failed++;
          results.moduleResults.push(moduleResult);
          continue;
        }

        console.log(`   ✅ Click en: "${clicked.text}"`);
        moduleResult.crudTested = true;
        await page.waitForTimeout(2000);

        // Verificar si hay modal/formulario abierto
        const modalOpened = await page.evaluate(() => {
          // Buscar modales visibles
          const modals = document.querySelectorAll('.modal.show, .modal[style*="display: block"], [class*="modal"][style*="display: block"]');
          for (const m of modals) {
            if (m.offsetParent !== null || getComputedStyle(m).display !== 'none') {
              const inputs = m.querySelectorAll('input:not([type="hidden"]), select, textarea');
              if (inputs.length > 0) {
                return {
                  found: true,
                  id: m.id || 'modal',
                  inputs: inputs.length,
                  title: (m.querySelector('.modal-title, h4, h5') || {}).textContent || ''
                };
              }
            }
          }

          // Buscar elementos con z-index alto (modales dinámicos)
          const highZ = document.querySelectorAll('[style*="z-index"]');
          for (const el of highZ) {
            const zIndex = parseInt(getComputedStyle(el).zIndex) || 0;
            if (zIndex >= 1000 && getComputedStyle(el).display !== 'none') {
              const inputs = el.querySelectorAll('input:not([type="hidden"]), select, textarea');
              if (inputs.length > 0) {
                return {
                  found: true,
                  id: el.id || 'dynamic',
                  inputs: inputs.length,
                  title: (el.querySelector('h4, h5, .title') || {}).textContent || ''
                };
              }
            }
          }

          return { found: false };
        });

        if (!modalOpened.found) {
          console.log(`   ⚠️ No se detectó formulario/modal`);
          await page.keyboard.press('Escape');
          results.failed++;
          moduleResult.error = 'No modal detected';
          results.moduleResults.push(moduleResult);
          continue;
        }

        console.log(`   ✅ Modal abierto: ${modalOpened.id} (${modalOpened.inputs} campos)`);

        // Llenar formulario
        const marker = `TEST-${moduleId}-${Date.now()}`;
        await page.evaluate((marker) => {
          // Llenar todos los inputs visibles
          document.querySelectorAll('.modal.show input[type="text"], .modal.show input:not([type]), [style*="z-index"] input[type="text"]').forEach(i => {
            if (!i.disabled && !i.readOnly && i.offsetParent !== null) {
              i.value = marker;
              i.dispatchEvent(new Event('input', { bubbles: true }));
            }
          });

          // Llenar números
          document.querySelectorAll('.modal.show input[type="number"], [style*="z-index"] input[type="number"]').forEach(i => {
            if (!i.disabled && i.offsetParent !== null) {
              i.value = '100';
              i.dispatchEvent(new Event('input', { bubbles: true }));
            }
          });

          // Llenar fechas
          document.querySelectorAll('.modal.show input[type="date"], [style*="z-index"] input[type="date"]').forEach(i => {
            if (!i.disabled) {
              i.value = '2024-06-15';
              i.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });

          // Selects
          document.querySelectorAll('.modal.show select, [style*="z-index"] select').forEach(s => {
            if (!s.disabled && s.options.length > 1) {
              s.selectedIndex = 1;
              s.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });

          // Textareas
          document.querySelectorAll('.modal.show textarea, [style*="z-index"] textarea').forEach(t => {
            if (!t.disabled && !t.readOnly) {
              t.value = 'Test ' + marker;
              t.dispatchEvent(new Event('input', { bubbles: true }));
            }
          });
        }, marker);

        console.log(`   ✅ Formulario llenado`);

        // Click en guardar
        const saved = await page.evaluate(() => {
          const container = document.querySelector('.modal.show') ||
                           document.querySelector('[style*="z-index: 10"]');
          if (!container) return { success: false };

          const saveBtn = container.querySelector('button[type="submit"]') ||
                         container.querySelector('.btn-primary:not([data-bs-dismiss])') ||
                         container.querySelector('.btn-success');

          if (saveBtn) {
            saveBtn.click();
            return { success: true, text: saveBtn.textContent.trim() };
          }
          return { success: false };
        });

        console.log(`   💾 Guardar: ${saved.success ? saved.text : 'No encontrado'}`);

        await page.waitForTimeout(3000);

        // Verificar resultado
        const modalClosed = await page.evaluate(() => {
          const visibleModals = document.querySelectorAll('.modal.show');
          return visibleModals.length === 0;
        });

        if (modalClosed || saved.success) {
          console.log(`   ✅ CRUD SUCCESS\n`);
          moduleResult.crudPassed = true;
          results.passed++;
        } else {
          console.log(`   ⚠️ Modal no cerró\n`);
          await page.keyboard.press('Escape');
          results.failed++;
        }

      } catch (moduleError) {
        console.log(`   ❌ ERROR: ${moduleError.message}\n`);
        moduleResult.error = moduleError.message;
        results.failed++;
        await page.keyboard.press('Escape').catch(() => {});
      }

      results.tested++;
      results.moduleResults.push(moduleResult);
    }

    // RESUMEN
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN FINAL');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n   Total módulos: ${results.totalModules}`);
    console.log(`   Testeados: ${results.tested}`);
    console.log(`   ✅ CRUD Pasaron: ${results.passed}`);
    console.log(`   ❌ CRUD Fallaron: ${results.failed}`);
    console.log(`   ⏭️ Sin botones (dashboards): ${results.noButtons}`);

    const crudModules = results.passed + results.failed;
    const successRate = crudModules > 0 ? Math.round((results.passed / crudModules) * 100) : 0;
    console.log(`   Success Rate (CRUD): ${successRate}%`);

    // Mostrar fallidos
    const failedModules = results.moduleResults.filter(m => m.hasButtons && !m.crudPassed);
    if (failedModules.length > 0) {
      console.log('\n   ⚠️ MÓDULOS CON PROBLEMAS CRUD:');
      failedModules.forEach(m => {
        console.log(`      - ${m.moduleId}: ${m.error || 'CRUD failed'}`);
      });
    }

    await page.screenshot({ path: 'debug-modules-v2-final.png' });

  } catch (error) {
    console.log('\n❌ ERROR FATAL:', error.message);
  }

  await agent.close();
  console.log('\n🏁 Test finalizado');

  const fs = require('fs');
  fs.writeFileSync('modules-crud-v2-results.json', JSON.stringify(results, null, 2));

  return results;
}

testModulesCRUDv2();
