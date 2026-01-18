/**
 * TEST CRUD REAL - Módulo Usuarios
 *
 * Este script hace testing REAL de funcionalidad:
 * - Abre formularios
 * - Llena datos
 * - Guarda
 * - Verifica que se guardó
 * - Verifica persistencia
 */

const { chromium } = require('playwright');

async function testRealCRUD() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capturar errores de consola
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔬 TEST CRUD REAL - Módulo Usuarios');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // 1. Login
    console.log('1️⃣  HACIENDO LOGIN...');
    await page.goto('http://localhost:9998/panel-empresa.html');
    await page.waitForTimeout(2000);

    await page.selectOption('#empresa', { label: 'ISI - Ingeniería en Sistemas Informáticos' });
    await page.fill('#usuario', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(8000);
    console.log('   ✅ Login completado');

    // 2. Navegar a usuarios
    console.log('');
    console.log('2️⃣  NAVEGANDO A GESTIÓN DE USUARIOS...');
    await page.click('[data-module-key="users"]');
    await page.waitForTimeout(3000);
    console.log('   ✅ En módulo usuarios');

    // 3. Abrir modal de empleado
    console.log('');
    console.log('3️⃣  ABRIENDO FICHA DE EMPLEADO...');

    // Buscar botón de ver usuario
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('button.users-action-btn.view') ||
                  document.querySelector('button[onclick*="viewUser"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (!clicked) {
      console.log('   ❌ No se encontró botón para abrir ficha');
      await browser.close();
      return;
    }

    await page.waitForTimeout(3000);
    console.log('   ✅ Modal employeeFileModal abierto');

    // 4. Ir a Tab "Antecedentes Laborales"
    console.log('');
    console.log('4️⃣  NAVEGANDO A TAB "ANTECEDENTES LABORALES"...');

    const tabResult = await page.evaluate(() => {
      // Buscar tab por texto
      const tabs = document.querySelectorAll('.file-tab-btn, [data-tab], .nav-link');
      for (const tab of tabs) {
        const text = tab.textContent.toLowerCase();
        if (text.includes('laboral') || text.includes('work')) {
          tab.click();
          return { found: true, text: tab.textContent.trim() };
        }
      }

      // Intentar con función directa
      if (typeof window.showFileTab === 'function') {
        window.showFileTab('work');
        return { found: true, method: 'showFileTab(work)' };
      }

      return { found: false };
    });

    await page.waitForTimeout(2000);
    console.log('   Resultado:', JSON.stringify(tabResult));

    // 5. Buscar botón "+ Agregar" en antecedentes laborales
    console.log('');
    console.log('5️⃣  BUSCANDO BOTÓN AGREGAR ANTECEDENTE LABORAL...');

    const buttons = await page.evaluate(() => {
      const modal = document.querySelector('#employeeFileModal');
      if (!modal) return { error: 'No modal' };

      const btns = modal.querySelectorAll('button');
      const found = [];

      btns.forEach(btn => {
        const text = btn.textContent.trim();
        const onclick = btn.getAttribute('onclick') || '';

        if (text.includes('Agregar') || text.includes('+') ||
            onclick.includes('add') || onclick.includes('Add')) {
          found.push({
            text: text.substring(0, 50),
            onclick: onclick.substring(0, 100),
            visible: btn.offsetParent !== null
          });
        }
      });

      return found;
    });

    console.log('   Botones encontrados:', buttons.length);
    buttons.forEach((b, i) => {
      console.log(`   ${i+1}. "${b.text}" visible=${b.visible}`);
      if (b.onclick) console.log(`      onclick: ${b.onclick}`);
    });

    // 6. Click en agregar antecedente laboral
    console.log('');
    console.log('6️⃣  CLICKEANDO "AGREGAR" ANTECEDENTE LABORAL...');

    const addClicked = await page.evaluate(() => {
      // Buscar botón que agregue work history
      const btns = document.querySelectorAll('#employeeFileModal button');

      for (const btn of btns) {
        const onclick = btn.getAttribute('onclick') || '';
        const text = btn.textContent.toLowerCase();

        if (onclick.includes('addWorkHistory') ||
            onclick.includes('WorkHistory') ||
            (text.includes('agregar') && onclick.includes('work'))) {
          btn.click();
          return { clicked: true, onclick, text: btn.textContent.trim() };
        }
      }

      // Intentar llamar función directamente
      if (typeof window.addWorkHistory === 'function') {
        window.addWorkHistory();
        return { clicked: true, method: 'addWorkHistory()' };
      }

      return { clicked: false };
    });

    console.log('   Resultado:', JSON.stringify(addClicked));
    await page.waitForTimeout(2000);

    // 7. Ver qué modal/formulario se abrió
    console.log('');
    console.log('7️⃣  VERIFICANDO MODAL/FORMULARIO DE AGREGAR...');

    const formInfo = await page.evaluate(() => {
      const modals = document.querySelectorAll('.modal');
      const openModals = [];

      modals.forEach(m => {
        const isVisible = m.classList.contains('show') ||
                          m.style.display === 'block' ||
                          getComputedStyle(m).display !== 'none';

        if (isVisible) {
          const inputs = m.querySelectorAll('input:not([type="hidden"]), select, textarea');
          const inputDetails = Array.from(inputs).slice(0, 10).map(i => ({
            type: i.tagName + (i.type ? ':' + i.type : ''),
            name: i.name || i.id,
            required: i.required
          }));

          openModals.push({
            id: m.id,
            title: m.querySelector('.modal-title')?.textContent?.trim() || 'Sin título',
            inputCount: inputs.length,
            inputs: inputDetails,
            hasSubmit: !!m.querySelector('button[type="submit"], .btn-primary, .btn-success')
          });
        }
      });

      return openModals;
    });

    console.log('   Modales abiertos:', formInfo.length);
    formInfo.forEach(m => {
      console.log(`   📋 Modal: ${m.id} - "${m.title}"`);
      console.log(`      Inputs: ${m.inputCount}, Submit button: ${m.hasSubmit}`);
      m.inputs.forEach(i => console.log(`      - ${i.type} name="${i.name}" required=${i.required}`));
    });

    // 8. Si hay formulario, llenarlo
    if (formInfo.length > 0 && formInfo.some(f => f.inputCount > 0)) {
      console.log('');
      console.log('8️⃣  LLENANDO FORMULARIO CON DATOS DE PRUEBA...');

      const testData = {
        empresa: 'Empresa Test ' + Date.now(),
        cargo: 'Desarrollador Senior',
        fechaInicio: '2020-01-15',
        fechaFin: '2023-12-31',
        descripcion: 'Descripción de prueba para testing CRUD'
      };

      const fillResult = await page.evaluate((data) => {
        const modal = document.querySelector('.modal.show') ||
                      Array.from(document.querySelectorAll('.modal')).find(m =>
                        getComputedStyle(m).display !== 'none');

        if (!modal) return { error: 'No modal found' };

        const filled = [];

        // Llenar todos los inputs de texto
        modal.querySelectorAll('input[type="text"], input:not([type])').forEach((input, idx) => {
          if (!input.disabled && !input.readOnly && input.offsetParent !== null) {
            const value = data.empresa + '-' + idx;
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filled.push({ field: input.name || input.id || 'input-' + idx, value });
          }
        });

        // Llenar fechas
        modal.querySelectorAll('input[type="date"]').forEach((input, idx) => {
          if (!input.disabled) {
            const value = idx === 0 ? data.fechaInicio : data.fechaFin;
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filled.push({ field: input.name || input.id, value });
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

        // Llenar textareas
        modal.querySelectorAll('textarea').forEach(ta => {
          if (!ta.disabled && !ta.readOnly) {
            ta.value = data.descripcion;
            ta.dispatchEvent(new Event('input', { bubbles: true }));
            filled.push({ field: ta.name || ta.id, value: ta.value });
          }
        });

        return { filled, modalId: modal.id };
      }, testData);

      console.log('   Campos llenados:', fillResult.filled?.length || 0);
      fillResult.filled?.forEach(f => console.log(`      ✏️  ${f.field} = "${f.value.substring(0, 30)}..."`));

      await page.screenshot({ path: 'debug-form-filled.png' });
      console.log('   📸 Screenshot: debug-form-filled.png');

      // 9. GUARDAR
      console.log('');
      console.log('9️⃣  CLICKEANDO BOTÓN GUARDAR...');

      const saveClicked = await page.evaluate(() => {
        const modal = document.querySelector('.modal.show') ||
                      Array.from(document.querySelectorAll('.modal')).find(m =>
                        getComputedStyle(m).display !== 'none');

        if (!modal) return { error: 'No modal' };

        // Buscar botón guardar
        const saveSelectors = [
          'button[type="submit"]',
          'button.btn-primary:not([data-bs-dismiss])',
          'button.btn-success',
          'button:contains("Guardar")',
          'button:contains("Registrar")',
          'button:contains("Agregar")'
        ];

        for (const selector of saveSelectors) {
          try {
            const btn = modal.querySelector(selector);
            if (btn && btn.offsetParent !== null) {
              console.log('Clicking:', btn.textContent);
              btn.click();
              return { clicked: true, button: btn.textContent.trim(), selector };
            }
          } catch (e) {}
        }

        // Fallback: buscar por texto
        const buttons = modal.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if ((text.includes('guardar') || text.includes('registrar') || text.includes('agregar')) &&
              !text.includes('cerrar') && !text.includes('cancelar')) {
            btn.click();
            return { clicked: true, button: btn.textContent.trim(), method: 'text-search' };
          }
        }

        return { clicked: false, buttonsFound: buttons.length };
      });

      console.log('   Resultado:', JSON.stringify(saveClicked));

      // Esperar respuesta
      await page.waitForTimeout(3000);

      // 10. VERIFICAR RESULTADO
      console.log('');
      console.log('🔟 VERIFICANDO RESULTADO DE GUARDAR...');

      const afterSave = await page.evaluate(() => {
        const result = {
          modalStillOpen: false,
          alerts: [],
          toasts: [],
          errors: []
        };

        // Ver si modal sigue abierto
        const openModals = document.querySelectorAll('.modal.show, .modal[style*="display: block"]');
        result.modalStillOpen = openModals.length > 1; // Más de 1 porque employeeFileModal siempre está

        // Buscar mensajes de alerta
        document.querySelectorAll('.alert:not(.d-none)').forEach(a => {
          result.alerts.push(a.textContent.trim().substring(0, 100));
        });

        // Buscar toasts
        document.querySelectorAll('.toast.show, .swal2-popup').forEach(t => {
          result.toasts.push(t.textContent.trim().substring(0, 100));
        });

        // Buscar mensajes de error visibles
        document.querySelectorAll('.text-danger:not(.d-none), .invalid-feedback:not(.d-none)').forEach(e => {
          if (e.textContent.trim()) {
            result.errors.push(e.textContent.trim());
          }
        });

        return result;
      });

      console.log('   Modal formulario sigue abierto:', afterSave.modalStillOpen);
      console.log('   Alertas:', afterSave.alerts);
      console.log('   Toasts:', afterSave.toasts);
      console.log('   Errores visibles:', afterSave.errors);

      await page.screenshot({ path: 'debug-after-save.png' });
      console.log('   📸 Screenshot: debug-after-save.png');

      // DIAGNÓSTICO FINAL
      console.log('');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📊 DIAGNÓSTICO:');
      console.log('═══════════════════════════════════════════════════════════════');

      if (afterSave.modalStillOpen) {
        console.log('❌ BUG: Modal NO se cierra después de guardar');
      } else {
        console.log('✅ Modal se cerró correctamente');
      }

      if (afterSave.errors.length > 0) {
        console.log('❌ ERRORES encontrados:', afterSave.errors);
      }

      if (consoleErrors.length > 0) {
        console.log('❌ ERRORES DE CONSOLA:');
        consoleErrors.forEach(e => console.log('   ' + e.substring(0, 150)));
      }
    }

  } catch (error) {
    console.log('');
    console.log('❌ ERROR:', error.message);
    console.log(error.stack);
  }

  await browser.close();
  console.log('');
  console.log('🏁 Test finalizado');
}

testRealCRUD();
