/**
 * TEST COMPLETO DEL SISTEMA - 35 MÓDULOS ISI
 *
 * Testea cada módulo como un humano:
 * 1. Navega al módulo
 * 2. Explora tabs/submódulos
 * 3. Prueba botones CRUD
 * 4. Verifica formularios
 * 5. Reporta errores
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');
const fs = require('fs');

// 35 módulos de ISI
const ALL_MODULES = [
  "notification-center",
  "biometric-consent",
  "organizational-structure",
  "finance-dashboard",
  "warehouse-management",
  "dms-dashboard",
  "mi-espacio",
  "my-procedures",
  "user-support",
  "users",
  "attendance",
  "legal-dashboard",
  "kiosks",
  "employee-360",
  "medical",
  "vacation-management",
  "procurement-management",
  "hour-bank",
  "payroll-liquidation",
  "art-management",
  "training-management",
  "compliance-dashboard",
  "visitors",
  "hse-management",
  "emotional-analysis",
  "employee-map",
  "job-postings",
  "sanctions-management",
  "sla-tracking",
  "audit-reports",
  "benefits-management",
  "logistics-dashboard",
  "siac-commercial-dashboard",
  "voice-platform",
  "procedures-manual"
];

async function closeAllModals(page) {
  await page.evaluate(() => {
    // Cerrar todos los modales
    document.querySelectorAll('.modal').forEach(m => {
      m.classList.remove('show');
      m.style.display = 'none';
    });
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
  });
  await page.waitForTimeout(300);
}

async function exploreModule(page, moduleId) {
  const result = {
    moduleId,
    loaded: false,
    tabs: [],
    buttons: [],
    forms: [],
    tables: [],
    errors: [],
    crudTests: []
  };

  try {
    await page.waitForTimeout(2000);

    // Analizar contenido del módulo
    const analysis = await page.evaluate(() => {
      const data = {
        tabs: [],
        buttons: [],
        forms: [],
        tables: [],
        modals: []
      };

      // Buscar tabs
      document.querySelectorAll('.nav-tabs .nav-link, .tab-btn, [data-tab], [role="tab"]').forEach(tab => {
        if (tab.offsetParent !== null) {
          data.tabs.push({
            text: tab.textContent.trim().substring(0, 50),
            id: tab.id || tab.getAttribute('data-tab') || ''
          });
        }
      });

      // Buscar botones de acción
      document.querySelectorAll('button, a.btn').forEach(btn => {
        const text = (btn.textContent || '').toLowerCase();
        const visible = btn.offsetParent !== null;
        if (visible && (
          text.includes('agregar') || text.includes('nuevo') || text.includes('crear') ||
          text.includes('editar') || text.includes('eliminar') || text.includes('guardar') ||
          text.includes('add') || text.includes('new') || text.includes('create') ||
          text.includes('edit') || text.includes('delete') || text.includes('save') ||
          text === '+' || text.includes('exportar') || text.includes('importar')
        )) {
          data.buttons.push({
            text: btn.textContent.trim().substring(0, 60),
            type: btn.type || 'button',
            onclick: (btn.getAttribute('onclick') || '').substring(0, 80)
          });
        }
      });

      // Buscar formularios
      document.querySelectorAll('form').forEach(form => {
        const inputs = form.querySelectorAll('input:not([type="hidden"]), select, textarea');
        if (inputs.length > 0) {
          data.forms.push({
            id: form.id || 'form',
            inputs: inputs.length
          });
        }
      });

      // Buscar tablas con datos
      document.querySelectorAll('table').forEach(table => {
        const rows = table.querySelectorAll('tbody tr');
        if (rows.length > 0 || table.querySelector('thead')) {
          data.tables.push({
            id: table.id || 'table',
            rows: rows.length,
            hasHeader: !!table.querySelector('thead')
          });
        }
      });

      return data;
    });

    result.loaded = true;
    result.tabs = analysis.tabs;
    result.buttons = analysis.buttons;
    result.forms = analysis.forms;
    result.tables = analysis.tables;

    // Si hay botones CRUD, intentar testearlos
    const crudButtons = analysis.buttons.filter(b =>
      b.text.toLowerCase().includes('agregar') ||
      b.text.toLowerCase().includes('nuevo') ||
      b.text.toLowerCase().includes('crear') ||
      b.text === '+'
    );

    if (crudButtons.length > 0) {
      // Intentar click en primer botón CRUD
      const clicked = await page.evaluate(() => {
        const btns = document.querySelectorAll('button, a.btn');
        for (const btn of btns) {
          const text = (btn.textContent || '').toLowerCase();
          if (btn.offsetParent && (
            text.includes('agregar') || text.includes('nuevo') ||
            text.includes('crear') || text === '+'
          )) {
            btn.click();
            return { success: true, text: btn.textContent.trim() };
          }
        }
        return { success: false };
      });

      if (clicked.success) {
        await page.waitForTimeout(1500);

        // Verificar si abrió modal
        const modalOpened = await page.evaluate(() => {
          const modal = document.querySelector('.modal.show, [style*="z-index: 10"]');
          if (modal && modal.offsetParent !== null) {
            const inputs = modal.querySelectorAll('input:not([type="hidden"]), select, textarea');
            return {
              opened: true,
              id: modal.id || 'modal',
              inputs: inputs.length,
              hasSubmit: !!modal.querySelector('button[type="submit"], .btn-primary, .btn-success')
            };
          }
          return { opened: false };
        });

        if (modalOpened.opened) {
          result.crudTests.push({
            button: clicked.text,
            modalOpened: true,
            modalId: modalOpened.id,
            formFields: modalOpened.inputs,
            hasSubmit: modalOpened.hasSubmit
          });

          // Cerrar modal
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        } else {
          result.crudTests.push({
            button: clicked.text,
            modalOpened: false
          });
        }
      }
    }

    // Explorar tabs si existen
    if (analysis.tabs.length > 0) {
      for (const tab of analysis.tabs.slice(0, 5)) { // Max 5 tabs por módulo
        try {
          const tabClicked = await page.evaluate((tabText) => {
            const tabs = document.querySelectorAll('.nav-tabs .nav-link, .tab-btn, [data-tab], [role="tab"]');
            for (const t of tabs) {
              if (t.textContent.trim().includes(tabText) && t.offsetParent !== null) {
                t.click();
                return true;
              }
            }
            return false;
          }, tab.text.substring(0, 20));

          if (tabClicked) {
            await page.waitForTimeout(1000);

            // Buscar CRUD en este tab
            const tabCrud = await page.evaluate(() => {
              const btns = [];
              document.querySelectorAll('button, a.btn').forEach(btn => {
                const text = (btn.textContent || '').toLowerCase();
                if (btn.offsetParent && (
                  text.includes('agregar') || text.includes('nuevo') || text === '+'
                )) {
                  btns.push(btn.textContent.trim().substring(0, 40));
                }
              });
              return btns;
            });

            if (tabCrud.length > 0) {
              result.crudTests.push({
                tab: tab.text,
                crudButtons: tabCrud
              });
            }
          }
        } catch (tabError) {
          // Ignorar errores de tabs
        }
      }
    }

  } catch (error) {
    result.errors.push(error.message);
  }

  return result;
}

async function testCompleteSystem() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔬 TEST COMPLETO DEL SISTEMA - 35 MÓDULOS ISI');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📋 Total módulos: ${ALL_MODULES.length}\n`);

  const agent = new AutonomousQAAgent({
    headless: true,
    timeout: 45000,
    learningMode: false,
    brainIntegration: false
  });

  const results = {
    timestamp: new Date().toISOString(),
    totalModules: ALL_MODULES.length,
    modulesLoaded: 0,
    modulesWithCrud: 0,
    modulesWithErrors: 0,
    totalTabs: 0,
    totalCrudButtons: 0,
    moduleDetails: []
  };

  try {
    await agent.init();
    const page = agent.page;

    // Capturar errores
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('404') && !text.includes('favicon')) {
          consoleErrors.push(text.substring(0, 150));
        }
      }
    });

    // LOGIN
    console.log('1️⃣ LOGIN...');
    await agent.login({ empresa: 'isi', usuario: 'admin', password: 'admin123' });
    console.log('   ✅ Login OK\n');

    await closeAllModals(page);

    // TESTEAR CADA MÓDULO
    for (let i = 0; i < ALL_MODULES.length; i++) {
      const moduleId = ALL_MODULES[i];
      const progress = `[${i + 1}/${ALL_MODULES.length}]`;

      console.log('───────────────────────────────────────────────────────────────');
      console.log(`${progress} 📦 ${moduleId}`);

      await closeAllModals(page);

      let moduleResult = {
        moduleId,
        navigated: false,
        loaded: false,
        tabs: 0,
        crudButtons: 0,
        tables: 0,
        errors: [],
        crudTests: []
      };

      try {
        // Navegar
        await agent.navigateToModule(moduleId);
        moduleResult.navigated = true;

        // Explorar módulo
        const exploration = await exploreModule(page, moduleId);

        moduleResult.loaded = exploration.loaded;
        moduleResult.tabs = exploration.tabs.length;
        moduleResult.crudButtons = exploration.buttons.length;
        moduleResult.tables = exploration.tables.length;
        moduleResult.errors = exploration.errors;
        moduleResult.crudTests = exploration.crudTests;

        // Estadísticas
        if (exploration.loaded) results.modulesLoaded++;
        if (exploration.buttons.length > 0) results.modulesWithCrud++;
        results.totalTabs += exploration.tabs.length;
        results.totalCrudButtons += exploration.buttons.length;

        // Log resultado
        const status = exploration.loaded ? '✅' : '❌';
        console.log(`   ${status} Tabs: ${exploration.tabs.length} | Botones: ${exploration.buttons.length} | Tablas: ${exploration.tables.length}`);

        if (exploration.crudTests.length > 0) {
          console.log(`   🧪 CRUD tests: ${exploration.crudTests.length}`);
          exploration.crudTests.forEach(ct => {
            if (ct.modalOpened !== undefined) {
              console.log(`      - "${ct.button}": Modal ${ct.modalOpened ? '✅' : '❌'} (${ct.formFields || 0} campos)`);
            } else if (ct.tab) {
              console.log(`      - Tab "${ct.tab}": ${ct.crudButtons.length} botones CRUD`);
            }
          });
        }

        if (exploration.errors.length > 0) {
          results.modulesWithErrors++;
          console.log(`   ⚠️ Errores: ${exploration.errors.length}`);
        }

      } catch (navError) {
        console.log(`   ❌ Error: ${navError.message.substring(0, 60)}`);
        moduleResult.errors.push(navError.message);
        results.modulesWithErrors++;
      }

      results.moduleDetails.push(moduleResult);
    }

    // RESUMEN FINAL
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN FINAL');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n   📦 Total módulos: ${results.totalModules}`);
    console.log(`   ✅ Cargados correctamente: ${results.modulesLoaded}`);
    console.log(`   🔧 Con funcionalidad CRUD: ${results.modulesWithCrud}`);
    console.log(`   ⚠️ Con errores: ${results.modulesWithErrors}`);
    console.log(`   📑 Total tabs encontrados: ${results.totalTabs}`);
    console.log(`   🔘 Total botones CRUD: ${results.totalCrudButtons}`);

    // Módulos con problemas
    const problematicModules = results.moduleDetails.filter(m =>
      m.errors.length > 0 || !m.loaded
    );

    if (problematicModules.length > 0) {
      console.log('\n   ⚠️ MÓDULOS CON PROBLEMAS:');
      problematicModules.forEach(m => {
        console.log(`      - ${m.moduleId}: ${m.errors[0] || 'No cargó'}`);
      });
    }

    // Módulos con CRUD exitoso
    const crudSuccessModules = results.moduleDetails.filter(m =>
      m.crudTests.some(ct => ct.modalOpened === true)
    );

    if (crudSuccessModules.length > 0) {
      console.log('\n   ✅ MÓDULOS CON CRUD FUNCIONAL:');
      crudSuccessModules.forEach(m => {
        const tests = m.crudTests.filter(ct => ct.modalOpened === true);
        console.log(`      - ${m.moduleId}: ${tests.length} modales OK`);
      });
    }

    // Errores de consola únicos
    const uniqueErrors = [...new Set(consoleErrors)].slice(0, 10);
    if (uniqueErrors.length > 0) {
      console.log('\n   🔴 ERRORES DE CONSOLA (top 10):');
      uniqueErrors.forEach(e => console.log(`      - ${e.substring(0, 100)}`));
    }

    // Calcular success rate
    const successRate = Math.round((results.modulesLoaded / results.totalModules) * 100);
    console.log(`\n   📈 SUCCESS RATE: ${successRate}%`);

    await page.screenshot({ path: 'debug-complete-system-test.png' });
    console.log('\n   📸 Screenshot guardado');

  } catch (error) {
    console.log('\n❌ ERROR FATAL:', error.message);
    results.fatalError = error.message;
  }

  await agent.close();

  // Guardar resultados
  fs.writeFileSync('complete-system-test-results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Resultados guardados en: complete-system-test-results.json');
  console.log('🏁 Test finalizado\n');

  return results;
}

testCompleteSystem();
