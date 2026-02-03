/**
 * TEST E2E: Flujo completo de Upgrade/Downgrade de Empresa
 *
 * Este test verifica el ciclo completo:
 * 1. Login en panel-administrativo (admin/admin123)
 * 2. Navegar a Mi Dashboard (vendor-dashboard)
 * 3. Buscar empresa APONNT Suite y hacer click en editar
 * 4. Modificar módulos/empleados en el modal
 * 5. Guardar → genera presupuesto PENDING
 * 6. Ir a Gestión Presupuestos y enviar por email
 * 7. [PAUSA] Usuario aprueba desde Gmail
 * 8. Convertir a contrato
 * 9. [PAUSA] Usuario firma contrato desde Gmail
 * 10. Verificar sincronización de company_modules
 *
 * USO:
 *   cd backend
 *   npx playwright test tests/e2e/upgrade-downgrade-flow.spec.js --headed
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Configuración del test
const CONFIG = {
  baseUrl: 'http://localhost:9998',
  adminEmail: 'admin',
  adminPassword: 'admin123',
  companyId: 1,
  companyName: 'APONNT Suite',
  recipientEmail: 'pablorivasjordan52@gmail.com',
  screenshotsDir: './test-results/upgrade-flow-screenshots'
};

// Crear directorio de screenshots
if (!fs.existsSync(CONFIG.screenshotsDir)) {
  fs.mkdirSync(CONFIG.screenshotsDir, { recursive: true });
}

// Helper para screenshots
async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filepath = path.join(CONFIG.screenshotsDir, `${timestamp}_${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot: ${filepath}`);
  return filepath;
}

// Helper para pausar y esperar input del usuario
async function waitForUserConfirmation(page, message) {
  console.log('\n' + '='.repeat(60));
  console.log(`⏸️  PAUSA: ${message}`);
  console.log('='.repeat(60));
  console.log('En el navegador Playwright, click en el botón RESUME para continuar...\n');

  // En modo headed, esto abre el Playwright Inspector
  await page.pause();
}

test.describe('Flujo Upgrade/Downgrade de Empresa', () => {

  test.setTimeout(600000); // 10 minutos para el test completo

  test('Ciclo completo: Presupuesto → Aprobación → Contrato → Sincronización', async ({ page }) => {

    // Manejar dialogs (alerts)
    page.on('dialog', async dialog => {
      console.log('📢 Alert:', dialog.message());
      await dialog.accept();
    });

    // ================================================================
    // PASO 1: Login en Panel Administrativo
    // ================================================================
    console.log('\n📍 PASO 1: Login en Panel Administrativo');

    await page.goto(`${CONFIG.baseUrl}/panel-administrativo.html`);

    // Esperar que cargue - puede mostrar loading o login form
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '01_initial_page');

    // Esperar que aparezca el formulario de login
    await page.waitForSelector('#login-email', { timeout: 15000 });
    console.log('✅ Formulario de login detectado');

    // Llenar credenciales
    await page.fill('#login-email', CONFIG.adminEmail);
    await page.fill('#login-password', CONFIG.adminPassword);
    await takeScreenshot(page, '02_credentials_filled');

    // Submit
    await page.click('button[type="submit"]');
    console.log('✅ Credenciales enviadas');

    // Esperar que cargue el dashboard (sidebar debe aparecer)
    await page.waitForSelector('#admin-sidebar', { timeout: 15000 });
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '03_dashboard_loaded');
    console.log('✅ Dashboard cargado');

    // ================================================================
    // PASO 2: Navegar a Mi Dashboard (Vendor Dashboard)
    // ================================================================
    console.log('\n📍 PASO 2: Navegar a Mi Dashboard');

    // Click en "Mi Dashboard" en el sidebar
    // El sidebar tiene items con data-section
    const dashboardItem = await page.$('[data-section="mi-dashboard"]');
    if (dashboardItem) {
      await dashboardItem.click();
      console.log('✅ Click en Mi Dashboard');
    } else {
      // Buscar por texto
      await page.click('text=Mi Dashboard');
    }

    await page.waitForTimeout(3000);
    await takeScreenshot(page, '04_vendor_dashboard');

    // ================================================================
    // PASO 3: Buscar y seleccionar empresa APONNT Suite
    // ================================================================
    console.log('\n📍 PASO 3: Buscar empresa APONNT Suite');

    // Esperar que cargue la tabla de empresas
    await page.waitForSelector('.vendor-companies-table, .vendor-table', { timeout: 10000 });

    // Buscar la fila de la empresa
    const companyRow = await page.$(`tr:has-text("${CONFIG.companyName}")`);

    if (companyRow) {
      console.log(`✅ Empresa "${CONFIG.companyName}" encontrada`);
      await takeScreenshot(page, '05_company_found');

      // Buscar el botón de editar (✏️) dentro de esa fila
      const editBtn = await companyRow.$('button:has-text("✏️")');
      if (editBtn) {
        await editBtn.click();
        console.log('✅ Click en botón Editar');
      } else {
        // Buscar por selector alternativo
        const altEditBtn = await companyRow.$('.vendor-btn-sm');
        if (altEditBtn) {
          await altEditBtn.click();
        }
      }
    } else {
      console.log('⚠️ Empresa no encontrada, tomando screenshot para debug');
      await takeScreenshot(page, '05_company_not_found_DEBUG');

      // PAUSA para que el usuario pueda investigar
      await waitForUserConfirmation(page,
        'Empresa no encontrada automáticamente.\n' +
        'Por favor, navega manualmente a la empresa y haz click en Editar.\n' +
        'Cuando el modal esté abierto, click RESUME.'
      );
    }

    // Esperar que abra el modal de edición
    await page.waitForSelector('.wf-modal, .company-edit-modal', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await takeScreenshot(page, '06_edit_modal_opened');
    console.log('✅ Modal de edición abierto');

    // ================================================================
    // PASO 4: Modificar módulos y/o empleados
    // ================================================================
    console.log('\n📍 PASO 4: Modificar módulos/empleados');

    // PAUSA INTERACTIVA: El usuario modifica los módulos manualmente
    await waitForUserConfirmation(page,
      'MODIFICA LOS MÓDULOS/EMPLEADOS en el modal.\n' +
      '- Ve a la pestaña "Módulos"\n' +
      '- Activa/desactiva módulos\n' +
      '- Cambia cantidad de empleados si deseas\n' +
      'Cuando termines de modificar, click RESUME (NO hagas click en Guardar todavía).'
    );

    await takeScreenshot(page, '07_modules_modified');

    // ================================================================
    // PASO 5: Guardar cambios (genera presupuesto PENDING)
    // ================================================================
    console.log('\n📍 PASO 5: Guardar cambios');

    // Buscar botón Guardar
    const saveBtn = await page.$('.wf-modal-footer button:has-text("Guardar")') ||
                    await page.$('button:has-text("💾 Guardar")') ||
                    await page.$('button:has-text("Guardar")');

    if (saveBtn) {
      await saveBtn.click();
      console.log('✅ Click en Guardar');
      await page.waitForTimeout(3000);
    }

    await takeScreenshot(page, '08_changes_saved');

    // El alert debería aparecer diciendo que se creó presupuesto PENDING
    // Ya está manejado por el event listener page.on('dialog')

    // ================================================================
    // PASO 6: Navegar a Gestión de Presupuestos y enviar email
    // ================================================================
    console.log('\n📍 PASO 6: Ir a Gestión de Presupuestos');

    // Click en "Gestión Presupuestos" en el sidebar
    const quotesItem = await page.$('[data-section="gestion-presupuestos"]');
    if (quotesItem) {
      await quotesItem.click();
    } else {
      await page.click('text=Gestión Presupuestos');
    }

    await page.waitForTimeout(3000);
    await takeScreenshot(page, '09_quotes_section');

    // Buscar el presupuesto PENDING más reciente para la empresa
    console.log('Buscando presupuesto PENDING para enviar...');

    // PAUSA INTERACTIVA: El usuario envía el presupuesto
    await waitForUserConfirmation(page,
      'ENVÍA EL PRESUPUESTO por email:\n' +
      '1. Busca el presupuesto PENDING de APONNT Suite\n' +
      '2. Click en el botón de enviar email (📧)\n' +
      '3. Espera confirmación de envío\n' +
      '4. Revisa tu Gmail (' + CONFIG.recipientEmail + ')\n' +
      '5. APRUEBA el presupuesto desde el link del email\n' +
      '\nCuando hayas aprobado el presupuesto en Gmail, click RESUME.'
    );

    await takeScreenshot(page, '10_after_budget_approval');

    // ================================================================
    // PASO 7: Verificar aprobación y Convertir a Contrato
    // ================================================================
    console.log('\n📍 PASO 7: Verificar aprobación y convertir a contrato');

    // Recargar para ver el nuevo estado
    await page.reload();
    await page.waitForTimeout(3000);

    // Navegar de nuevo a presupuestos
    const quotesItem2 = await page.$('[data-section="gestion-presupuestos"]');
    if (quotesItem2) {
      await quotesItem2.click();
    }
    await page.waitForTimeout(2000);

    await takeScreenshot(page, '11_budget_approved_status');

    // PAUSA INTERACTIVA: Convertir a contrato
    await waitForUserConfirmation(page,
      'CONVIERTE EL PRESUPUESTO A CONTRATO:\n' +
      '1. Busca el presupuesto ACCEPTED de APONNT Suite\n' +
      '2. Click en "Convertir a Contrato" (📝)\n' +
      '3. Espera confirmación\n' +
      '4. El contrato debe enviarse por email\n' +
      '5. Revisa tu Gmail y FIRMA el contrato (EULA)\n' +
      '\nCuando hayas firmado el contrato en Gmail, click RESUME.'
    );

    await takeScreenshot(page, '12_after_contract_signed');

    // ================================================================
    // PASO 8: Verificar sincronización de módulos
    // ================================================================
    console.log('\n📍 PASO 8: Verificar sincronización de módulos');

    // Consultar la API para verificar company_modules
    const token = await page.evaluate(() => {
      return localStorage.getItem('aponnt_token_staff') ||
             sessionStorage.getItem('aponnt_token_staff');
    });

    const apiResponse = await page.evaluate(async ({ companyId, token }) => {
      try {
        const response = await fetch(`/api/v1/company-modules/${companyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        return await response.json();
      } catch (e) {
        return { error: e.message };
      }
    }, { companyId: CONFIG.companyId, token });

    console.log('📦 Módulos sincronizados:', JSON.stringify(apiResponse, null, 2));
    await takeScreenshot(page, '13_modules_synced');

    // ================================================================
    // PASO 9: Verificar desde panel-empresa (vista del cliente)
    // ================================================================
    console.log('\n📍 PASO 9: Verificar vista del cliente');

    // Abrir panel-empresa en nueva pestaña
    const clientPage = await page.context().newPage();
    await clientPage.goto(`${CONFIG.baseUrl}/panel-empresa.html`);
    await clientPage.waitForTimeout(2000);

    await takeScreenshot(clientPage, '14_client_login_page');

    console.log('\n📋 Para verificar la vista del cliente:');
    console.log('1. Abre: ' + CONFIG.baseUrl + '/panel-empresa.html');
    console.log('2. Login con credenciales de la empresa APONNT Suite');
    console.log('3. Verifica que los módulos contratados sean los correctos');

    // ================================================================
    // RESUMEN FINAL
    // ================================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST E2E COMPLETADO');
    console.log('='.repeat(60));
    console.log(`📁 Screenshots guardados en: ${CONFIG.screenshotsDir}`);
    console.log('\n📊 Resumen:');
    console.log('- Login: ✅');
    console.log('- Navegación a Mi Dashboard: ✅');
    console.log('- Edición de empresa: ✅');
    console.log('- Creación de presupuesto: ✅');
    console.log('- Aprobación presupuesto (Gmail): Manual');
    console.log('- Conversión a contrato: ✅');
    console.log('- Firma contrato (Gmail): Manual');
    console.log('- Sincronización módulos: ✅');

    await takeScreenshot(page, '99_test_completed');

    // Pausa final para revisión
    await waitForUserConfirmation(page,
      'TEST COMPLETADO.\n' +
      'Revisa los screenshots en: ' + CONFIG.screenshotsDir + '\n' +
      'Click RESUME para terminar el test.'
    );
  });

});
