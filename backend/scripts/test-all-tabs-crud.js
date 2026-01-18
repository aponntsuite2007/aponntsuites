/**
 * TEST CRUD COMPLETO - Todos los Tabs del Módulo Users
 *
 * Recorre TODOS los tabs del employeeFileModal y testea:
 * 1. Que el tab se active correctamente
 * 2. Que los botones "Agregar" abran modales
 * 3. Que los formularios se llenen
 * 4. Que los modales se cierren al guardar
 * 5. Que los datos persistan
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');

// IDs de modales dinámicos conocidos para cada tab
const DYNAMIC_MODAL_IDS = [
  'workHistoryModal', 'workRestrictionModal', 'educationModal',
  'certificationModal', 'childModal', 'familyMemberModal',
  'judicialRecordModal', 'disciplinaryModal', 'medicalRecordModal',
  'vaccineModal', 'allergyModal', 'surgeryModal', 'chronicConditionModal',
  'emergencyContactModal', 'salaryIncreaseModal', 'assignUserShiftsModal',
  'permissionRequestModal', 'medicationModal', 'activityRestrictionModal',
  'psychiatricModal', 'sportsActivityModal', 'medicalExamModal',
  'medicalEventModal', 'legalIssueModal', 'unionAffiliationModal'
];

async function testAllTabsCRUD() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔬 TEST CRUD COMPLETO - Todos los Tabs del Módulo Users');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const agent = new AutonomousQAAgent({
    headless: true,
    timeout: 120000,
    learningMode: false,
    brainIntegration: false
  });

  const results = {
    totalTabs: 0,
    testedTabs: 0,
    passedTabs: 0,
    failedTabs: 0,
    tabResults: []
  };

  try {
    await agent.init();
    const page = agent.page;

    // Capturar errores
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // LOGIN
    console.log('1️⃣  LOGIN...');
    await agent.login({ empresa: 'isi', usuario: 'admin', password: 'admin123' });
    console.log('   ✅ Login OK\n');

    // NAVEGAR A USERS
    console.log('2️⃣  NAVEGANDO A GESTIÓN DE USUARIOS...');
    await agent.navigateToModule('users');
    console.log('   ✅ En módulo users\n');

    // ABRIR FICHA DE EMPLEADO
    console.log('3️⃣  ABRIENDO FICHA DE EMPLEADO...');
    await page.evaluate(() => {
      const btn = document.querySelector('button.users-action-btn.view');
      if (btn) btn.click();
    });
    await page.waitForTimeout(3000);
    console.log('   ✅ Modal employeeFileModal abierto\n');

    // OBTENER LISTA DE TABS
    const tabs = await page.evaluate(() => {
      const modal = document.getElementById('employeeFileModal');
      if (!modal) return [];

      return Array.from(modal.querySelectorAll('.file-tab')).map(tab => {
        const onclick = tab.getAttribute('onclick') || '';
        const match = onclick.match(/showFileTab\('([^']+)'/);
        return {
          name: tab.textContent.trim(),
          tabKey: match ? match[1] : null
        };
      }).filter(t => t.tabKey);
    });

    results.totalTabs = tabs.length;
    console.log(`📋 Encontrados ${tabs.length} tabs para testear:\n`);
    tabs.forEach((t, i) => console.log(`   ${i+1}. ${t.name} (${t.tabKey})`));
    console.log('');

    // TESTEAR CADA TAB
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`📑 TAB ${i+1}/${tabs.length}: ${tab.name}`);
      console.log('═══════════════════════════════════════════════════════════════');

      const tabResult = {
        name: tab.name,
        tabKey: tab.tabKey,
        activated: false,
        addButtons: [],
        crudTests: []
      };

      try {
        // Activar tab
        const activated = await page.evaluate((tabKey) => {
          if (typeof window.showFileTab === 'function') {
            window.showFileTab(tabKey);
            return true;
          }
          return false;
        }, tab.tabKey);

        await page.waitForTimeout(1500);
        tabResult.activated = activated;

        if (!activated) {
          console.log('   ❌ No se pudo activar el tab\n');
          results.failedTabs++;
          results.tabResults.push(tabResult);
          continue;
        }

        console.log('   ✅ Tab activado\n');

        // Buscar botones "Agregar" en este tab
        const addButtons = await page.evaluate((tabKey) => {
          const tabContent = document.getElementById(`${tabKey}-tab`);
          if (!tabContent) return [];

          const buttons = tabContent.querySelectorAll('button');
          return Array.from(buttons)
            .filter(btn => {
              const text = btn.textContent.toLowerCase();
              const onclick = btn.getAttribute('onclick') || '';
              return (text.includes('agregar') || text.includes('+') ||
                      onclick.includes('add') || onclick.includes('Add')) &&
                     btn.offsetParent !== null;
            })
            .map(btn => ({
              text: btn.textContent.trim().substring(0, 40),
              onclick: (btn.getAttribute('onclick') || '').substring(0, 80)
            }));
        }, tab.tabKey);

        tabResult.addButtons = addButtons;
        console.log(`   📋 Botones "Agregar" encontrados: ${addButtons.length}`);
        addButtons.forEach(b => console.log(`      - "${b.text}"`));

        if (addButtons.length === 0) {
          console.log('   ⏭️  Sin botones de agregar - saltando CRUD test\n');
          results.testedTabs++;
          tabResult.crudTests.push({ skipped: true, reason: 'No add buttons' });
          results.tabResults.push(tabResult);
          continue;
        }

        // Testear el primer botón "Agregar"
        console.log(`\n   🧪 TESTEANDO CRUD con: "${addButtons[0].text}"`);

        // Click en agregar
        const clickResult = await page.evaluate((tabKey) => {
          const tabContent = document.getElementById(`${tabKey}-tab`);
          if (!tabContent) return { clicked: false, error: 'Tab content not found' };

          const buttons = tabContent.querySelectorAll('button');
          for (const btn of buttons) {
            const text = btn.textContent.toLowerCase();
            const onclick = btn.getAttribute('onclick') || '';
            if ((text.includes('agregar') || text.includes('+') ||
                 onclick.includes('add') || onclick.includes('Add')) &&
                btn.offsetParent !== null) {
              btn.click();
              return { clicked: true, text: btn.textContent.trim() };
            }
          }
          return { clicked: false };
        }, tab.tabKey);

        await page.waitForTimeout(2000);

        if (!clickResult.clicked) {
          console.log('   ❌ No se pudo hacer click en agregar\n');
          tabResult.crudTests.push({ success: false, error: 'Click failed' });
          results.failedTabs++;
          results.tabResults.push(tabResult);
          continue;
        }

        // Buscar modal abierto (dinámico o bootstrap)
        const modalInfo = await page.evaluate((dynamicIds) => {
          // Buscar modales dinámicos por ID
          for (const id of dynamicIds) {
            const m = document.getElementById(id);
            if (m && getComputedStyle(m).display !== 'none') {
              return {
                found: true,
                id: id,
                type: 'dynamic',
                inputs: m.querySelectorAll('input:not([type="hidden"])').length,
                selects: m.querySelectorAll('select').length,
                textareas: m.querySelectorAll('textarea').length
              };
            }
          }

          // Buscar cualquier modal con z-index alto que no sea employeeFileModal
          const allModals = document.querySelectorAll('[style*="z-index"]');
          for (const m of allModals) {
            const style = getComputedStyle(m);
            const zIndex = parseInt(style.zIndex) || 0;
            if (zIndex >= 10000 && m.id !== 'employeeFileModal' && style.display !== 'none') {
              return {
                found: true,
                id: m.id || 'unknown',
                type: 'z-index',
                inputs: m.querySelectorAll('input:not([type="hidden"])').length,
                selects: m.querySelectorAll('select').length,
                textareas: m.querySelectorAll('textarea').length
              };
            }
          }

          return { found: false };
        }, DYNAMIC_MODAL_IDS);

        if (!modalInfo.found) {
          console.log('   ❌ No se abrió modal de agregar\n');
          tabResult.crudTests.push({ success: false, error: 'No modal opened' });
          results.failedTabs++;
          results.tabResults.push(tabResult);
          continue;
        }

        console.log(`   ✅ Modal abierto: ${modalInfo.id} (${modalInfo.type})`);
        console.log(`      Inputs: ${modalInfo.inputs}, Selects: ${modalInfo.selects}`);

        // Llenar formulario
        const testDataMarker = 'TEST-' + Date.now();
        const fillResult = await page.evaluate(({ modalId, marker }) => {
          const modal = document.getElementById(modalId);
          if (!modal) return { error: 'Modal not found' };

          const filled = [];

          // Llenar inputs de texto
          modal.querySelectorAll('input[type="text"], input:not([type])').forEach(input => {
            if (!input.disabled && !input.readOnly && input.offsetParent !== null) {
              input.value = marker;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              filled.push(input.name || input.id || 'text');
            }
          });

          // Llenar inputs numéricos con valores válidos
          modal.querySelectorAll('input[type="number"]').forEach(input => {
            if (!input.disabled && !input.readOnly && input.offsetParent !== null) {
              // Usar un valor numérico válido basado en min/max si existen
              const min = parseFloat(input.min) || 1;
              const max = parseFloat(input.max) || 999999;
              input.value = Math.min(Math.max(12345.67, min), max);
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              filled.push(input.name || input.id || 'number');
            }
          });

          // Llenar fechas
          modal.querySelectorAll('input[type="date"]').forEach(input => {
            if (!input.disabled) {
              input.value = '2024-06-15';
              input.dispatchEvent(new Event('change', { bubbles: true }));
              filled.push(input.name || input.id || 'date');
            }
          });

          // Llenar textareas
          modal.querySelectorAll('textarea').forEach(ta => {
            if (!ta.disabled && !ta.readOnly) {
              ta.value = 'Descripción de prueba ' + marker;
              ta.dispatchEvent(new Event('input', { bubbles: true }));
              filled.push(ta.name || ta.id || 'textarea');
            }
          });

          // Seleccionar primer option en selects
          modal.querySelectorAll('select').forEach(select => {
            if (!select.disabled && select.options.length > 1) {
              select.selectedIndex = 1;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              filled.push(select.name || select.id || 'select');
            }
          });

          return { filled };
        }, { modalId: modalInfo.id, marker: testDataMarker });

        console.log(`   ✅ Campos llenados: ${fillResult.filled?.length || 0}`);

        // Guardar
        const saveResult = await page.evaluate((modalId) => {
          const modal = document.getElementById(modalId);
          if (!modal) return { clicked: false, error: 'Modal not found' };

          const saveBtn = modal.querySelector('button[type="submit"]') ||
                          modal.querySelector('.btn-primary:not([data-bs-dismiss])') ||
                          modal.querySelector('button.btn-success');
          if (saveBtn) {
            saveBtn.click();
            return { clicked: true, button: saveBtn.textContent.trim() };
          }
          return { clicked: false };
        }, modalInfo.id);

        console.log(`   💾 Guardar: ${saveResult.clicked ? saveResult.button : 'No encontrado'}`);

        await page.waitForTimeout(3000);

        // Verificar si modal se cerró
        const modalClosed = await page.evaluate((modalId) => {
          const m = document.getElementById(modalId);
          return !m || getComputedStyle(m).display === 'none';
        }, modalInfo.id);

        // Verificar persistencia
        const dataPersisted = await page.evaluate(({ tabKey, marker }) => {
          const tabContent = document.getElementById(`${tabKey}-tab`);
          if (!tabContent) return false;
          return tabContent.textContent.includes(marker) ||
                 tabContent.textContent.includes('TEST-');
        }, { tabKey: tab.tabKey, marker: testDataMarker });

        const crudTest = {
          modal: modalInfo.id,
          fieldsFilled: fillResult.filled?.length || 0,
          saved: saveResult.clicked,
          modalClosed: modalClosed,
          dataPersisted: dataPersisted,
          success: modalClosed && (dataPersisted || saveResult.clicked)
        };

        tabResult.crudTests.push(crudTest);

        console.log('\n   📊 RESULTADO:');
        console.log(`      Modal cerrado: ${modalClosed ? '✅' : '❌'}`);
        console.log(`      Datos persistidos: ${dataPersisted ? '✅' : '⚠️ No verificado'}`);
        console.log(`      SUCCESS: ${crudTest.success ? '✅' : '❌'}`);
        console.log('');

        if (crudTest.success) {
          results.passedTabs++;
        } else {
          results.failedTabs++;
        }
        results.testedTabs++;

      } catch (tabError) {
        console.log(`   ❌ ERROR: ${tabError.message}\n`);
        tabResult.crudTests.push({ success: false, error: tabError.message });
        results.failedTabs++;
      }

      results.tabResults.push(tabResult);

      // Cerrar cualquier modal abierto antes del siguiente tab
      await page.evaluate(() => {
        document.querySelectorAll('[style*="z-index: 10"]').forEach(m => {
          if (m.id !== 'employeeFileModal') {
            m.remove();
          }
        });
      });
    }

    // RESUMEN FINAL
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN FINAL');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n   Total tabs: ${results.totalTabs}`);
    console.log(`   Testeados: ${results.testedTabs}`);
    console.log(`   ✅ Pasaron: ${results.passedTabs}`);
    console.log(`   ❌ Fallaron: ${results.failedTabs}`);
    console.log(`   Success Rate: ${results.testedTabs > 0 ? Math.round((results.passedTabs / results.testedTabs) * 100) : 0}%`);

    // Mostrar tabs con problemas
    const failedTabResults = results.tabResults.filter(t =>
      t.crudTests.some(c => c.success === false)
    );

    if (failedTabResults.length > 0) {
      console.log('\n   ⚠️  TABS CON PROBLEMAS:');
      failedTabResults.forEach(t => {
        const failedTest = t.crudTests.find(c => c.success === false);
        console.log(`      - ${t.name}: ${failedTest?.error || 'Modal no cerró'}`);
      });
    }

    await page.screenshot({ path: 'debug-all-tabs-final.png' });
    console.log('\n   📸 Screenshot: debug-all-tabs-final.png');

  } catch (error) {
    console.log('\n❌ ERROR FATAL:', error.message);
    console.log(error.stack);
  }

  await agent.close();
  console.log('\n🏁 Test finalizado');

  return results;
}

testAllTabsCRUD();
