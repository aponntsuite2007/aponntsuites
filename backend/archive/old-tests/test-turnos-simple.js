const { chromium } = require('@playwright/test');

async function testTurnos() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎭 TEST TURNOS - PLAYWRIGHT SIMPLE');
  console.log('═══════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const page = await browser.newPage();

  try {
    console.log('📋 PASO 1: Navegando a panel-empresa.html...');
    await page.goto('http://localhost:9998/panel-empresa.html');
    await page.screenshot({ path: 'step-01-loaded.png' });

    console.log('📋 PASO 2: Esperando a que carguen las empresas...');
    // Esperar a que el select tenga opciones (más de 1, porque 1 es el placeholder)
    await page.waitForFunction(() => {
      const select = document.getElementById('companySelect');
      return select && select.options.length > 1;
    }, { timeout: 10000 });

    console.log('✅ Empresas cargadas');
    await page.screenshot({ path: 'step-02-companies-loaded.png' });

    console.log('📋 PASO 3: Seleccionando empresa ISI...');
    await page.selectOption('#companySelect', 'isi');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'step-03-company-selected.png' });

    console.log('📋 PASO 4: Ingresando usuario...');
    await page.fill('#userInput', 'admin');
    await page.waitForTimeout(500);

    console.log('📋 PASO 5: Ingresando contraseña...');
    await page.fill('#passwordInput', 'admin123');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'step-05-credentials-filled.png' });

    console.log('📋 PASO 6: Haciendo login...');
    await page.click('button[type="submit"]');

    // Esperar navegación o mensaje de éxito
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'step-06-after-login.png' });

    const url = page.url();
    console.log('URL actual:', url);

    if (url.includes('panel-empresa.html')) {
      console.log('✅ Login aparentemente exitoso');
    }

    console.log('\n📋 PASO 7: Buscando módulo Usuarios...');
    await page.waitForTimeout(2000);

    // Intentar hacer click en el módulo de usuarios
    const userModuleClicked = await page.evaluate(() => {
      // Buscar todos los botones/divs que puedan ser el módulo
      const buttons = Array.from(document.querySelectorAll('button, div[onclick], a'));
      const userButton = buttons.find(b =>
        b.textContent.includes('Usuarios') ||
        b.textContent.includes('usuarios') ||
        b.getAttribute('onclick')?.includes('users')
      );

      if (userButton) {
        userButton.click();
        return true;
      }
      return false;
    });

    if (!userModuleClicked) {
      console.error('❌ No se encontró botón de Usuarios');
      await page.screenshot({ path: 'error-no-users-button.png' });

      // Guardar HTML para debug
      const html = await page.content();
      require('fs').writeFileSync('debug-page-content.html', html);
      console.log('💾 HTML guardado en debug-page-content.html');
    } else {
      console.log('✅ Click en módulo Usuarios');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'step-07-users-module.png' });

      console.log('\n📋 PASO 8: Esperando tabla de usuarios...');
      await page.waitForSelector('table', { timeout: 10000 });
      await page.screenshot({ path: 'step-08-users-table.png' });

      console.log('\n📋 PASO 9: Buscando botón Ver...');
      const viewButton = await page.$('button:has-text("Ver"), i.fa-eye');

      if (viewButton) {
        await viewButton.click();
        console.log('✅ Click en Ver');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'step-09-modal-opening.png' });

        console.log('\n📋 PASO 10: Esperando modal...');
        await page.waitForSelector('.modal.show', { timeout: 10000 });
        await page.screenshot({ path: 'step-10-modal-opened.png' });

        console.log('\n✅ TEST COMPLETADO - Modal abierto');
        console.log('\n⏸️ Pausando 15 segundos para inspección manual...');
        await page.waitForTimeout(15000);
      } else {
        console.error('❌ No se encontró botón Ver');
        await page.screenshot({ path: 'error-no-view-button.png' });
      }
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: 'final-error.png' });
  } finally {
    await browser.close();
  }
}

testTurnos();
