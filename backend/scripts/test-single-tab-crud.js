/**
 * TEST CRUD REAL - Un solo Tab específico
 *
 * Prueba el tab "Antecedentes Laborales" del módulo Users
 * para verificar:
 * 1. Modal se abre al click en "+ Agregar"
 * 2. Formulario se llena
 * 3. Modal se cierra al guardar
 * 4. Datos aparecen en el tab
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');

async function testSingleTabCRUD() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔬 TEST CRUD REAL - Tab "Antecedentes Laborales"');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const agent = new AutonomousQAAgent({
    headless: true,
    timeout: 60000,
    learningMode: false,
    brainIntegration: false
  });

  // Capturar errores
  const errors = [];

  try {
    await agent.init();
    const page = agent.page;

    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // 1. LOGIN
    console.log('1️⃣  LOGIN...');
    await agent.login({
      empresa: 'isi',
      usuario: 'admin',
      password: 'admin123'
    });
    console.log('   ✅ Login OK\n');

    // 2. NAVEGAR A USERS
    console.log('2️⃣  NAVEGANDO A GESTIÓN DE USUARIOS...');
    await agent.navigateToModule('users');
    console.log('   ✅ En módulo users\n');

    // 3. ABRIR FICHA DE EMPLEADO
    console.log('3️⃣  ABRIENDO FICHA DE EMPLEADO...');
    await page.evaluate(() => {
      const btn = document.querySelector('button.users-action-btn.view');
      if (btn) btn.click();
    });
    await page.waitForTimeout(3000);
    console.log('   ✅ Modal employeeFileModal abierto\n');

    // 4. IR A TAB "ANTECEDENTES LABORALES"
    console.log('4️⃣  NAVEGANDO A TAB "ANTECEDENTES LABORALES"...');
    await page.evaluate(() => {
      if (typeof window.showFileTab === 'function') {
        window.showFileTab('work');
      }
    });
    await page.waitForTimeout(2000);
    console.log('   ✅ En tab Antecedentes Laborales\n');

    // 5. BUSCAR BOTÓN "+ AGREGAR" para Work History
    console.log('5️⃣  BUSCANDO BOTÓN "+ AGREGAR" ANTECEDENTE LABORAL...');

    const addButtonInfo = await page.evaluate(() => {
      const modal = document.querySelector('#employeeFileModal');
      if (!modal) return { error: 'No modal' };

      const buttons = modal.querySelectorAll('button');
      const candidates = [];

      for (const btn of buttons) {
        const text = btn.textContent.trim();
        const onclick = btn.getAttribute('onclick') || '';

        if ((text.includes('Agregar') || text.includes('+')) &&
            (onclick.includes('WorkHistory') || onclick.includes('addWork'))) {
          candidates.push({
            text: text.substring(0, 50),
            onclick: onclick.substring(0, 100),
            visible: btn.offsetParent !== null
          });
        }
      }

      return candidates;
    });

    console.log('   Botones encontrados:', JSON.stringify(addButtonInfo, null, 2));

    // 6. CLICK EN AGREGAR
    console.log('\n6️⃣  CLICKEANDO BOTÓN AGREGAR...');

    const clicked = await page.evaluate(() => {
      const modal = document.querySelector('#employeeFileModal');
      if (!modal) return { clicked: false, error: 'No modal' };

      // Buscar botón addWorkHistory
      const buttons = modal.querySelectorAll('button');
      for (const btn of buttons) {
        const onclick = btn.getAttribute('onclick') || '';
        if (onclick.includes('addWorkHistory')) {
          btn.click();
          return { clicked: true, text: btn.textContent.trim() };
        }
      }

      // Fallback: llamar función directamente
      if (typeof window.addWorkHistory === 'function') {
        window.addWorkHistory();
        return { clicked: true, method: 'function-call' };
      }

      return { clicked: false };
    });

    console.log('   Resultado click:', JSON.stringify(clicked));
    await page.waitForTimeout(2000);

    // 7. VERIFICAR SI SE ABRIÓ MODAL DE AGREGAR
    console.log('\n7️⃣  VERIFICANDO MODAL DE AGREGAR...');

    const modalInfo = await page.evaluate(() => {
      const openModals = [];

      // Buscar modales Bootstrap (.modal)
      document.querySelectorAll('.modal').forEach(m => {
        const style = getComputedStyle(m);
        if (style.display !== 'none') {
          openModals.push({
            id: m.id,
            type: 'bootstrap',
            title: m.querySelector('.modal-title')?.textContent?.trim() || 'Sin título',
            inputs: m.querySelectorAll('input:not([type="hidden"])').length,
            selects: m.querySelectorAll('select').length,
            hasForm: !!m.querySelector('form'),
            submitBtn: m.querySelector('button[type="submit"], .btn-primary')?.textContent?.trim()
          });
        }
      });

      // Buscar modales dinámicos (creados con createElement, z-index alto)
      const dynamicModalIds = ['workHistoryModal', 'workRestrictionModal', 'educationModal',
                               'certificationModal', 'childModal', 'familyMemberModal',
                               'judicialRecordModal', 'disciplinaryModal', 'medicalRecordModal',
                               'vaccineModal', 'allergyModal', 'surgeryModal', 'chronicConditionModal',
                               'emergencyContactModal', 'salaryIncreaseModal', 'assignUserShiftsModal',
                               'permissionRequestModal', 'medicationModal', 'activityRestrictionModal',
                               'psychiatricModal', 'sportsActivityModal', 'medicalExamModal',
                               'medicalEventModal', 'legalIssueModal', 'unionAffiliationModal'];

      dynamicModalIds.forEach(modalId => {
        const m = document.getElementById(modalId);
        if (m && getComputedStyle(m).display !== 'none') {
          openModals.push({
            id: m.id,
            type: 'dynamic',
            title: m.querySelector('h4, h5, .modal-title')?.textContent?.trim() || 'Sin título',
            inputs: m.querySelectorAll('input:not([type="hidden"])').length,
            selects: m.querySelectorAll('select').length,
            hasForm: !!m.querySelector('form'),
            submitBtn: m.querySelector('button[type="submit"], .btn-primary')?.textContent?.trim()
          });
        }
      });

      return openModals;
    });

    console.log('   Modales abiertos:', JSON.stringify(modalInfo, null, 2));

    // 8. SI HAY FORMULARIO, LLENARLO
    // Buscar modal con formulario (dinámico o bootstrap)
    const formModal = modalInfo.find(m => m.id !== 'employeeFileModal' && m.inputs > 0);

    if (formModal) {
      console.log(`\n8️⃣  ENCONTRADO MODAL: ${formModal.id} (${formModal.type})`);
      console.log(`    Título: ${formModal.title}`);
      console.log(`    Inputs: ${formModal.inputs}, Selects: ${formModal.selects}`);

      console.log('\n9️⃣  LLENANDO FORMULARIO...');

      // Usar el ID del modal encontrado para llenar
      const targetModalId = formModal.id;
      const fillResult = await page.evaluate((modalId) => {
        const modal = document.getElementById(modalId);
        if (!modal) return { error: `Modal ${modalId} no encontrado` };

        const filled = [];
        const testData = 'TEST-CRUD-' + Date.now();

        // Llenar inputs de texto
        modal.querySelectorAll('input[type="text"], input:not([type])').forEach(input => {
          if (!input.disabled && !input.readOnly && input.offsetParent !== null) {
            input.value = testData;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filled.push({ field: input.name || input.id, value: testData });
          }
        });

        // Llenar fechas
        modal.querySelectorAll('input[type="date"]').forEach(input => {
          if (!input.disabled) {
            input.value = '2024-01-15';
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filled.push({ field: input.name || input.id, value: '2024-01-15' });
          }
        });

        // Llenar textareas
        modal.querySelectorAll('textarea').forEach(ta => {
          if (!ta.disabled && !ta.readOnly) {
            ta.value = 'Descripción de prueba CRUD ' + Date.now();
            ta.dispatchEvent(new Event('input', { bubbles: true }));
            filled.push({ field: ta.name || ta.id, value: ta.value });
          }
        });

        // Seleccionar primer option en selects
        modal.querySelectorAll('select').forEach(select => {
          if (!select.disabled && select.options.length > 1) {
            select.selectedIndex = 1;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            filled.push({ field: select.name || select.id, value: select.value });
          }
        });

        return { filled, modalId };
      }, targetModalId);

      console.log('   Campos llenados:', fillResult.filled?.length || 0);
      fillResult.filled?.forEach(f => console.log(`      ✏️  ${f.field} = ${f.value}`));

      // 10. GUARDAR
      console.log('\n🔟  CLICKEANDO GUARDAR...');

      // Contar modales abiertos ANTES de guardar (para verificar cierre)
      const modalsBeforeSave = await page.evaluate(() => {
        // Contar modales visibles (bootstrap + dinámicos conocidos)
        let count = 0;
        document.querySelectorAll('.modal').forEach(m => {
          if (getComputedStyle(m).display !== 'none') count++;
        });
        ['workHistoryModal', 'educationModal', 'childModal', 'disciplinaryModal'].forEach(id => {
          const m = document.getElementById(id);
          if (m && getComputedStyle(m).display !== 'none') count++;
        });
        return count;
      });
      console.log(`   Modales abiertos ANTES: ${modalsBeforeSave}`);

      const saveResult = await page.evaluate((modalId) => {
        const modal = document.getElementById(modalId);
        if (!modal) return { clicked: false, error: 'Modal no encontrado' };

        // Buscar botón guardar dentro del modal
        const saveBtn = modal.querySelector('button[type="submit"]') ||
                        modal.querySelector('.btn-primary:not([data-bs-dismiss])') ||
                        modal.querySelector('button.btn-success');
        if (saveBtn) {
          saveBtn.click();
          return { clicked: true, button: saveBtn.textContent.trim(), modalId };
        }
        return { clicked: false };
      }, targetModalId);

      console.log('   Save click:', JSON.stringify(saveResult));

      // Esperar respuesta del servidor
      await page.waitForTimeout(3000);

      // 11. VERIFICAR RESULTADO
      console.log('\n1️⃣1️⃣ VERIFICANDO RESULTADO...');

      // Contar modales DESPUÉS de guardar
      const modalsAfterSave = await page.evaluate(() => {
        let count = 0;
        document.querySelectorAll('.modal').forEach(m => {
          if (getComputedStyle(m).display !== 'none') count++;
        });
        ['workHistoryModal', 'educationModal', 'childModal', 'disciplinaryModal'].forEach(id => {
          const m = document.getElementById(id);
          if (m && getComputedStyle(m).display !== 'none') count++;
        });
        return count;
      });
      console.log(`   Modales abiertos DESPUÉS: ${modalsAfterSave}`);

      // Verificar si el modal específico se cerró
      const targetModalStillOpen = await page.evaluate((modalId) => {
        const m = document.getElementById(modalId);
        return m && getComputedStyle(m).display !== 'none';
      }, targetModalId);

      // Verificar errores o mensajes
      const messages = await page.evaluate(() => {
        const alerts = document.querySelectorAll('.alert:not(.d-none), .toast.show, .swal2-popup');
        return Array.from(alerts).map(a => a.textContent.trim().substring(0, 100));
      });

      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('📊 RESULTADOS:');
      console.log('═══════════════════════════════════════════════════════════════');

      if (!targetModalStillOpen) {
        console.log('   ✅ Modal SE CERRÓ correctamente después de guardar');
      } else {
        console.log('   ❌ BUG: Modal NO se cerró después de guardar');
      }

      if (messages.length > 0) {
        console.log('   📨 Mensajes:', messages);
      }

      if (errors.length > 0) {
        console.log('\n   ⚠️  Errores de consola:');
        errors.slice(-5).forEach(e => console.log('      ' + e.substring(0, 100)));
      }

      // 12. VERIFICAR PERSISTENCIA - Buscar el dato creado en la lista
      console.log('\n1️⃣2️⃣ VERIFICANDO PERSISTENCIA...');

      // Verificar que el dato aparece en la lista del tab
      const persistenceResult = await page.evaluate(() => {
        const workTab = document.getElementById('work-tab');
        if (!workTab) return { found: false, error: 'Tab work no encontrado' };

        // Buscar en cualquier elemento que contenga el texto TEST-CRUD
        const allText = workTab.innerText || workTab.textContent;
        const hasTestData = allText.includes('TEST-CRUD');

        // Buscar en tablas específicas de work history
        const tables = workTab.querySelectorAll('table tbody tr');
        const rows = Array.from(tables).map(tr => tr.innerText.substring(0, 100));

        return {
          found: hasTestData,
          totalRows: rows.length,
          rowsSample: rows.slice(0, 3)
        };
      });

      if (persistenceResult.found) {
        console.log('   ✅ DATO PERSISTIDO - TEST-CRUD encontrado en el tab');
      } else {
        console.log('   ⚠️  No se encontró TEST-CRUD en el tab');
        console.log(`   Rows en tabla: ${persistenceResult.totalRows}`);
        if (persistenceResult.rowsSample?.length > 0) {
          console.log('   Sample rows:');
          persistenceResult.rowsSample.forEach(r => console.log(`      ${r}`));
        }
      }

      // Screenshot
      await page.screenshot({ path: 'debug-crud-result.png' });
      console.log('\n   📸 Screenshot: debug-crud-result.png');

    } else {
      console.log('   ⚠️  No se encontró modal de formulario para llenar');
    }

  } catch (error) {
    console.log('\n❌ ERROR:', error.message);
    console.log(error.stack);
  }

  await agent.close();
  console.log('\n🏁 Test finalizado');
}

testSingleTabCRUD();
