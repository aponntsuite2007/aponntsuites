/**
 * TEST CRUD COMPLETO - TODOS LOS MÓDULOS DEL SISTEMA
 *
 * Testea cada módulo accesible buscando:
 * 1. Botones de agregar/crear
 * 2. Formularios/modales
 * 3. Operaciones CRUD
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');

// Módulos a testear (excluyendo 'users' ya testeado)
const MODULES_TO_TEST = [
  'attendance',
  'departments',
  'shifts',
  'kiosks',
  'medical',
  'vacation-management',
  'hour-bank',
  'payroll-liquidation',
  'training-management',
  'visitors',
  'hse-management',
  'job-postings',
  'sanctions-management',
  'benefits-management',
  'vendors',
  'partners',
  'temporary-access',
  'art-management',
  'procurement-management',
  'companies',
  'positions-management',
  'roles-permissions',
  'compliance-dashboard',
  'employee-360',
  'employee-map'
];

// Selectores comunes para botones de agregar
const ADD_BUTTON_PATTERNS = [
  'button:contains("Agregar")',
  'button:contains("Nuevo")',
  'button:contains("Crear")',
  'button:contains("+")',
  'button.btn-primary:contains("Add")',
  '[onclick*="add"]',
  '[onclick*="Add"]',
  '[onclick*="create"]',
  '[onclick*="nuevo"]'
];

async function testAllModulesCRUD() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔬 TEST CRUD COMPLETO - TODOS LOS MÓDULOS');
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
    skipped: 0,
    moduleResults: []
  };

  try {
    await agent.init();
    const page = agent.page;

    // Capturar errores de consola
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // LOGIN
    console.log('1️⃣  LOGIN...');
    await agent.login({ empresa: 'isi', usuario: 'admin', password: 'admin123' });
    console.log('   ✅ Login OK\n');

    // TESTEAR CADA MÓDULO
    for (let i = 0; i < MODULES_TO_TEST.length; i++) {
      const moduleId = MODULES_TO_TEST[i];
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`📦 MÓDULO ${i + 1}/${MODULES_TO_TEST.length}: ${moduleId}`);
      console.log('═══════════════════════════════════════════════════════════════');

      const moduleResult = {
        moduleId,
        navigated: false,
        hasAddButtons: false,
        crudTested: false,
        crudPassed: false,
        errors: []
      };

      try {
        // Navegar al módulo
        console.log(`   🔄 Navegando a ${moduleId}...`);

        const navResult = await agent.navigateToModule(moduleId);

        if (!navResult) {
          console.log(`   ⚠️ No se pudo navegar a ${moduleId}`);
          moduleResult.errors.push('Navigation failed');
          results.skipped++;
          results.moduleResults.push(moduleResult);
          continue;
        }

        moduleResult.navigated = true;
        await page.waitForTimeout(2000);
        console.log(`   ✅ Navegación OK`);

        // Buscar botones de agregar
        const addButtons = await page.evaluate(() => {
          const buttons = [];

          // Buscar botones con texto de agregar
          document.querySelectorAll('button, a.btn').forEach(btn => {
            const text = btn.textContent.toLowerCase().trim();
            const onclick = btn.getAttribute('onclick') || '';
            const isVisible = btn.offsetParent !== null;

            if (isVisible && (
              text.includes('agregar') ||
              text.includes('nuevo') ||
              text.includes('crear') ||
              text === '+' ||
              onclick.includes('add') ||
              onclick.includes('create') ||
              onclick.includes('nuevo')
            )) {
              buttons.push({
                text: btn.textContent.trim().substring(0, 50),
                onclick: onclick.substring(0, 80),
                tagName: btn.tagName
              });
            }
          });

          return buttons;
        });

        console.log(`   📋 Botones encontrados: ${addButtons.length}`);

        if (addButtons.length === 0) {
          console.log(`   ⏭️ Sin botones CRUD - saltando\n`);
          results.skipped++;
          results.moduleResults.push(moduleResult);
          continue;
        }

        moduleResult.hasAddButtons = true;
        addButtons.forEach(b => console.log(`      - "${b.text}"`));

        // Intentar CRUD con el primer botón
        console.log(`\n   🧪 TESTEANDO CRUD...`);

        // Click en el primer botón de agregar
        const clickResult = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button, a.btn');
          for (const btn of buttons) {
            const text = btn.textContent.toLowerCase().trim();
            const onclick = btn.getAttribute('onclick') || '';
            const isVisible = btn.offsetParent !== null;

            if (isVisible && (
              text.includes('agregar') ||
              text.includes('nuevo') ||
              text.includes('crear') ||
              text === '+' ||
              onclick.includes('add') ||
              onclick.includes('create')
            )) {
              btn.click();
              return { clicked: true, text: btn.textContent.trim() };
            }
          }
          return { clicked: false };
        });

        await page.waitForTimeout(2000);

        if (!clickResult.clicked) {
          console.log(`   ❌ No se pudo hacer click en botón\n`);
          moduleResult.errors.push('Click failed');
          results.failed++;
          results.moduleResults.push(moduleResult);
          continue;
        }

        console.log(`   ✅ Click en: "${clickResult.text}"`);
        moduleResult.crudTested = true;

        // Buscar modal/formulario abierto
        const modalInfo = await page.evaluate(() => {
          // Buscar modales Bootstrap visibles
          const modals = document.querySelectorAll('.modal.show, .modal[style*="display: block"]');
          for (const m of modals) {
            if (m.offsetParent !== null || getComputedStyle(m).display !== 'none') {
              return {
                found: true,
                id: m.id || 'unknown',
                title: m.querySelector('.modal-title, h4, h5')?.textContent?.trim() || '',
                inputs: m.querySelectorAll('input:not([type="hidden"])').length,
                selects: m.querySelectorAll('select').length,
                textareas: m.querySelectorAll('textarea').length
              };
            }
          }

          // Buscar cualquier elemento con z-index alto (modales dinámicos)
          const highZElements = document.querySelectorAll('[style*="z-index"]');
          for (const el of highZElements) {
            const style = getComputedStyle(el);
            const zIndex = parseInt(style.zIndex) || 0;
            if (zIndex >= 1000 && style.display !== 'none' && el.querySelector('form, input')) {
              return {
                found: true,
                id: el.id || 'dynamic',
                title: el.querySelector('h4, h5, .title')?.textContent?.trim() || '',
                inputs: el.querySelectorAll('input:not([type="hidden"])').length,
                selects: el.querySelectorAll('select').length,
                textareas: el.querySelectorAll('textarea').length
              };
            }
          }

          return { found: false };
        });

        if (!modalInfo.found) {
          console.log(`   ⚠️ No se detectó modal/formulario`);

          // Intentar cerrar cualquier cosa abierta
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);

          results.skipped++;
          results.moduleResults.push(moduleResult);
          continue;
        }

        console.log(`   ✅ Modal abierto: ${modalInfo.id}`);
        console.log(`      Campos: ${modalInfo.inputs} inputs, ${modalInfo.selects} selects`);

        // Llenar formulario
        const testMarker = `TEST-${moduleId}-${Date.now()}`;
        const fillResult = await page.evaluate((marker) => {
          const filled = [];

          // Buscar el modal/formulario visible
          let container = document.querySelector('.modal.show, .modal[style*="display: block"]');
          if (!container) {
            const highZ = document.querySelectorAll('[style*="z-index"]');
            for (const el of highZ) {
              if (parseInt(getComputedStyle(el).zIndex) >= 1000) {
                container = el;
                break;
              }
            }
          }

          if (!container) container = document.body;

          // Llenar inputs de texto
          container.querySelectorAll('input[type="text"], input:not([type])').forEach(input => {
            if (!input.disabled && !input.readOnly && input.offsetParent !== null) {
              input.value = marker;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              filled.push('text');
            }
          });

          // Llenar inputs numéricos
          container.querySelectorAll('input[type="number"]').forEach(input => {
            if (!input.disabled && input.offsetParent !== null) {
              const min = parseFloat(input.min) || 1;
              input.value = min + 100;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              filled.push('number');
            }
          });

          // Llenar fechas
          container.querySelectorAll('input[type="date"]').forEach(input => {
            if (!input.disabled) {
              input.value = '2024-06-15';
              input.dispatchEvent(new Event('change', { bubbles: true }));
              filled.push('date');
            }
          });

          // Llenar selects
          container.querySelectorAll('select').forEach(select => {
            if (!select.disabled && select.options.length > 1) {
              select.selectedIndex = 1;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              filled.push('select');
            }
          });

          // Llenar textareas
          container.querySelectorAll('textarea').forEach(ta => {
            if (!ta.disabled && !ta.readOnly) {
              ta.value = 'Test description ' + marker;
              ta.dispatchEvent(new Event('input', { bubbles: true }));
              filled.push('textarea');
            }
          });

          return { filled };
        }, testMarker);

        console.log(`   ✅ Campos llenados: ${fillResult.filled?.length || 0}`);

        // Click en guardar
        const saveResult = await page.evaluate(() => {
          // Buscar botón de guardar en el modal visible
          let container = document.querySelector('.modal.show, .modal[style*="display: block"]');
          if (!container) {
            const highZ = document.querySelectorAll('[style*="z-index"]');
            for (const el of highZ) {
              if (parseInt(getComputedStyle(el).zIndex) >= 1000) {
                container = el;
                break;
              }
            }
          }

          if (!container) return { clicked: false, reason: 'No container' };

          const saveBtn = container.querySelector('button[type="submit"]') ||
                         container.querySelector('.btn-primary:not([data-bs-dismiss])') ||
                         container.querySelector('.btn-success') ||
                         container.querySelector('button:contains("Guardar")');

          if (saveBtn) {
            saveBtn.click();
            return { clicked: true, text: saveBtn.textContent.trim() };
          }

          return { clicked: false, reason: 'No save button found' };
        });

        console.log(`   💾 Guardar: ${saveResult.clicked ? saveResult.text : 'No encontrado'}`);

        await page.waitForTimeout(3000);

        // Verificar si modal se cerró
        const modalClosed = await page.evaluate(() => {
          const visibleModals = document.querySelectorAll('.modal.show, .modal[style*="display: block"]');
          return visibleModals.length === 0;
        });

        if (modalClosed || saveResult.clicked) {
          console.log(`   ✅ CRUD SUCCESS`);
          moduleResult.crudPassed = true;
          results.passed++;
        } else {
          console.log(`   ⚠️ Modal no se cerró - posible error`);

          // Cerrar modal manualmente
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);

          results.failed++;
        }

      } catch (moduleError) {
        console.log(`   ❌ ERROR: ${moduleError.message}`);
        moduleResult.errors.push(moduleError.message);
        results.failed++;

        // Intentar recuperar
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }

      results.tested++;
      results.moduleResults.push(moduleResult);
      console.log('');
    }

    // RESUMEN FINAL
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN FINAL');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n   Total módulos: ${results.totalModules}`);
    console.log(`   Testeados: ${results.tested}`);
    console.log(`   ✅ Pasaron: ${results.passed}`);
    console.log(`   ❌ Fallaron: ${results.failed}`);
    console.log(`   ⏭️ Saltados: ${results.skipped}`);

    const successRate = results.tested > 0
      ? Math.round((results.passed / (results.passed + results.failed)) * 100)
      : 0;
    console.log(`   Success Rate: ${successRate}%`);

    // Mostrar módulos con problemas
    const failedModules = results.moduleResults.filter(m =>
      !m.crudPassed && m.hasAddButtons
    );

    if (failedModules.length > 0) {
      console.log('\n   ⚠️ MÓDULOS CON PROBLEMAS:');
      failedModules.forEach(m => {
        console.log(`      - ${m.moduleId}: ${m.errors.join(', ') || 'CRUD failed'}`);
      });
    }

    // Screenshot final
    await page.screenshot({ path: 'debug-all-modules-final.png' });
    console.log('\n   📸 Screenshot: debug-all-modules-final.png');

  } catch (error) {
    console.log('\n❌ ERROR FATAL:', error.message);
    console.log(error.stack);
  }

  await agent.close();
  console.log('\n🏁 Test finalizado');

  // Guardar resultados
  const fs = require('fs');
  fs.writeFileSync('all-modules-test-results.json', JSON.stringify(results, null, 2));
  console.log('📄 Resultados guardados en: all-modules-test-results.json');

  return results;
}

testAllModulesCRUD();
