const { chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:9998';

async function testTurnosVisual() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎭 TEST VISUAL PLAYWRIGHT - TURNOS EN TAB 1');
  console.log('═══════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: false,  // VISIBLE para que lo veas
    slowMo: 1000      // Slow motion para ver cada paso
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // PASO 1: Login
    console.log('📋 PASO 1: Navegando a panel-empresa.html...');
    await page.goto(`${BASE_URL}/panel-empresa.html`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'playwright-step-01-login-page.png' });

    console.log('📋 PASO 2: Llenando formulario de login...');
    // Empresa ISI
    await page.selectOption('select[name="company"]', 'isi');
    await page.waitForTimeout(500);

    // Usuario admin
    await page.fill('input[name="usuario"]', 'admin');
    await page.waitForTimeout(500);

    // Clave admin123
    await page.fill('input[name="password"]', 'admin123');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'playwright-step-02-login-filled.png' });

    console.log('📋 PASO 3: Haciendo login...');
    await page.click('button[type="submit"]');

    // Esperar a que cargue el panel
    await page.waitForURL('**/panel-empresa.html', { timeout: 10000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'playwright-step-03-logged-in.png' });
    console.log('✅ Login exitoso');

    // PASO 4: Abrir módulo Usuarios
    console.log('\n📋 PASO 4: Buscando módulo "Usuarios"...');

    // Buscar el botón de Usuarios (puede tener diferentes selectores)
    const userButtonSelectors = [
      'button:has-text("Usuarios")',
      'div.module-button:has-text("Usuarios")',
      '[data-module="users"]',
      'button[onclick*="users"]'
    ];

    let usersButtonFound = false;
    for (const selector of userButtonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.click(selector);
        usersButtonFound = true;
        console.log(`✅ Encontrado módulo Usuarios con selector: ${selector}`);
        break;
      } catch (e) {
        continue;
      }
    }

    if (!usersButtonFound) {
      console.error('❌ No se encontró el botón de Usuarios');
      await page.screenshot({ path: 'playwright-error-no-users-button.png' });
      throw new Error('No se pudo encontrar el módulo Usuarios');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'playwright-step-04-users-module.png' });

    // PASO 5: Esperar a que cargue la tabla de usuarios
    console.log('\n📋 PASO 5: Esperando tabla de usuarios...');
    await page.waitForSelector('table', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'playwright-step-05-users-table.png' });

    // PASO 6: Click en botón "Ver" del primer usuario
    console.log('\n📋 PASO 6: Abriendo modal "Ver" del primer usuario...');

    const viewButtonSelectors = [
      'button:has-text("Ver")',
      'button.btn-info:has-text("Ver")',
      'i.fa-eye',
      'button[onclick*="viewUser"]'
    ];

    let viewButtonFound = false;
    for (const selector of viewButtonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.click(selector);
        viewButtonFound = true;
        console.log(`✅ Click en botón Ver con selector: ${selector}`);
        break;
      } catch (e) {
        continue;
      }
    }

    if (!viewButtonFound) {
      console.error('❌ No se encontró el botón Ver');
      await page.screenshot({ path: 'playwright-error-no-view-button.png' });
      throw new Error('No se pudo encontrar el botón Ver');
    }

    // PASO 7: Esperar modal
    console.log('\n📋 PASO 7: Esperando modal...');
    await page.waitForSelector('.modal.show', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'playwright-step-07-modal-opened.png' });
    console.log('✅ Modal abierto');

    // PASO 8: Verificar TAB 1 está activo
    console.log('\n📋 PASO 8: Verificando TAB 1 (Administración)...');
    const tab1Selectors = [
      'a[href="#tab-administracion"]',
      'button:has-text("Administración")',
      '.nav-link:has-text("Administración")'
    ];

    let tab1Found = false;
    for (const selector of tab1Selectors) {
      try {
        const tab1 = await page.waitForSelector(selector, { timeout: 2000 });
        const isActive = await tab1.evaluate(el => el.classList.contains('active'));
        if (!isActive) {
          await tab1.click();
          await page.waitForTimeout(1000);
        }
        tab1Found = true;
        console.log('✅ TAB 1 Administración activo');
        break;
      } catch (e) {
        continue;
      }
    }

    if (!tab1Found) {
      console.error('❌ No se encontró TAB 1');
      await page.screenshot({ path: 'playwright-error-no-tab1.png' });
      throw new Error('No se pudo encontrar TAB 1');
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'playwright-step-08-tab1-active.png' });

    // PASO 9: Buscar select de turnos
    console.log('\n📋 PASO 9: Buscando select de Turnos...');
    const shiftsSelectSelectors = [
      'select#viewUserShifts',
      'select[name="shifts"]',
      'select:has(option:text("Turno"))',
      '#tab-administracion select[multiple]'
    ];

    let shiftsSelect = null;
    for (const selector of shiftsSelectSelectors) {
      try {
        shiftsSelect = await page.waitForSelector(selector, { timeout: 2000 });
        console.log(`✅ Encontrado select de turnos: ${selector}`);
        break;
      } catch (e) {
        continue;
      }
    }

    if (!shiftsSelect) {
      console.error('❌ No se encontró el select de turnos');
      await page.screenshot({ path: 'playwright-error-no-shifts-select.png' });

      // Debug: mostrar todos los selects disponibles
      const allSelects = await page.$$eval('select', selects =>
        selects.map(s => ({ id: s.id, name: s.name, options: s.options.length }))
      );
      console.log('Todos los selects disponibles:', allSelects);

      throw new Error('No se pudo encontrar el select de turnos');
    }

    // PASO 10: Verificar opciones de turnos
    console.log('\n📋 PASO 10: Verificando opciones de turnos disponibles...');
    const options = await shiftsSelect.$$eval('option', opts =>
      opts.map(o => ({ value: o.value, text: o.textContent.trim() }))
    );

    console.log('✅ Opciones de turnos encontradas:');
    options.forEach((opt, i) => {
      console.log(`   ${i + 1}. ${opt.text} (value: ${opt.value})`);
    });

    if (options.length <= 1) {
      console.warn('⚠️ Solo hay', options.length, 'opción(es). Puede que no haya turnos creados.');
    }

    await page.screenshot({ path: 'playwright-step-10-shifts-options.png' });

    // PASO 11: Seleccionar turnos (si hay más de la opción vacía)
    if (options.length > 1) {
      console.log('\n📋 PASO 11: Seleccionando turnos...');

      // Seleccionar los primeros 2 turnos (excluyendo el vacío)
      const turnosToSelect = options
        .filter(opt => opt.value && opt.value !== '')
        .slice(0, 2)
        .map(opt => opt.value);

      if (turnosToSelect.length > 0) {
        await shiftsSelect.selectOption(turnosToSelect);
        console.log(`✅ Seleccionados ${turnosToSelect.length} turno(s)`);
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'playwright-step-11-shifts-selected.png' });
      }
    }

    // PASO 12: Guardar cambios
    console.log('\n📋 PASO 12: Buscando botón Guardar...');
    const saveButtonSelectors = [
      'button:has-text("Guardar")',
      'button.btn-primary:has-text("Guardar")',
      'button[type="submit"]'
    ];

    let saveButtonFound = false;
    for (const selector of saveButtonSelectors) {
      try {
        const saveButton = await page.waitForSelector(selector, { timeout: 2000 });
        await saveButton.click();
        saveButtonFound = true;
        console.log('✅ Click en Guardar');
        break;
      } catch (e) {
        continue;
      }
    }

    if (!saveButtonFound) {
      console.warn('⚠️ No se encontró botón Guardar');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'playwright-step-12-after-save.png' });

    // PASO 13: Cerrar modal (si se cerró automáticamente, skip)
    console.log('\n📋 PASO 13: Verificando si modal se cerró...');
    const modalStillOpen = await page.$('.modal.show');
    if (modalStillOpen) {
      console.log('Modal aún abierto, cerrando...');
      const closeSelectors = [
        'button.close',
        'button:has-text("Cerrar")',
        '.modal-header .close'
      ];

      for (const selector of closeSelectors) {
        try {
          await page.click(selector);
          break;
        } catch (e) {
          continue;
        }
      }
      await page.waitForTimeout(1000);
    } else {
      console.log('✅ Modal se cerró automáticamente');
    }

    // PASO 14: Reabrir modal para verificar persistencia
    console.log('\n📋 PASO 14: Reabriendo modal para verificar persistencia...');
    await page.waitForTimeout(2000);

    // Click de nuevo en Ver
    for (const selector of viewButtonSelectors) {
      try {
        await page.click(selector);
        break;
      } catch (e) {
        continue;
      }
    }

    await page.waitForSelector('.modal.show', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'playwright-step-14-modal-reopened.png' });

    // PASO 15: Verificar que los turnos siguen seleccionados
    console.log('\n📋 PASO 15: Verificando turnos seleccionados después de reabrir...');

    for (const selector of shiftsSelectSelectors) {
      try {
        shiftsSelect = await page.waitForSelector(selector, { timeout: 2000 });
        break;
      } catch (e) {
        continue;
      }
    }

    if (shiftsSelect) {
      const selectedOptions = await shiftsSelect.$$eval('option:checked', opts =>
        opts.map(o => o.textContent.trim())
      );

      console.log('✅ Turnos seleccionados después de reabrir:');
      selectedOptions.forEach((opt, i) => {
        console.log(`   ${i + 1}. ${opt}`);
      });

      if (selectedOptions.length === 0) {
        console.error('❌ FALLO: No hay turnos seleccionados (no persistieron)');
      } else {
        console.log('✅ ÉXITO: Los turnos persistieron correctamente');
      }

      await page.screenshot({ path: 'playwright-step-15-persistence-verified.png' });
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ TEST VISUAL COMPLETADO');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📸 Screenshots guardados en backend/');
    console.log('   - playwright-step-*.png (15 archivos)');

    // Pausa para que puedas ver el resultado
    console.log('\n⏸️ Pausando 10 segundos para que veas el resultado...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ ERROR EN TEST:', error.message);
    console.error('Stack:', error.stack);
    await page.screenshot({ path: 'playwright-final-error.png' });
  } finally {
    await browser.close();
  }
}

testTurnosVisual().catch(console.error);
