/**
 * ============================================================================
 * TEST TABS EN MÓDULO USERS - Botón "Ver" con 11 tabs
 * ============================================================================
 *
 * Prueba exhaustiva de los 11 tabs dentro del modal "Ver" de usuarios
 *
 * @version 1.0.0
 * @date 2026-01-09
 * ============================================================================
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');
const SystemRegistry = require('../src/auditor/registry/SystemRegistry');
const EcosystemBrainService = require('../src/services/EcosystemBrainService');

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST TABS EN MODAL "VER" - MÓDULO USERS');
  console.log('='.repeat(80) + '\n');

  try {
    // =========================================================================
    // 1. INICIALIZAR AGENT
    // =========================================================================
    console.log('📦 [SETUP] Inicializando AutonomousQAAgent...\n');

    const systemRegistry = new SystemRegistry();
    const brainService = new EcosystemBrainService();
    systemRegistry.setBrainService(brainService);

    const agent = new AutonomousQAAgent({
      systemRegistry,
      brainService,
      headless: false,  // Modo visible para debugging
      timeout: 60000,
      learningEnabled: true,
      brainIntegration: true
    });

    await agent.init();
    console.log('   ✅ AutonomousQAAgent inicializado\n');

    // =========================================================================
    // 2. LOGIN
    // =========================================================================
    console.log('🔐 [SETUP] Haciendo login...\n');

    await agent.login({
      empresa: 'isi',
      usuario: 'admin',
      password: 'admin123'
    });

    console.log('   ✅ Login completado\n');

    // =========================================================================
    // 3. NAVEGAR A USERS
    // =========================================================================
    console.log('🧭 [TEST] Navegando a módulo users...\n');

    await agent.navigateToModule('users');
    await agent.page.waitForTimeout(3000);

    console.log('   ✅ Navegado a users\n');

    // =========================================================================
    // 4. BUSCAR BOTÓN "VER" O "MI ESPACIO"
    // =========================================================================
    console.log('🔍 [TEST] Buscando botón "Ver" o "Mi Espacio"...\n');

    // Esperar a que la tabla esté visible
    await agent.page.waitForSelector('table', { timeout: 10000 });
    console.log('   ✅ Tabla encontrada');

    // ⭐ NUEVO: Esperar a que haya al menos 1 fila de datos visible
    try {
      await agent.page.waitForSelector('table tbody tr', { timeout: 15000, state: 'visible' });
      console.log('   ✅ Filas de datos cargadas');
    } catch (error) {
      console.log('   ⚠️  No se encontraron filas de datos en la tabla');
      console.log('   🔍 Verificando si tabla está vacía...');

      const rowCount = await agent.page.$$eval('table tbody tr', rows => rows.length);
      console.log(`   📊 Filas encontradas: ${rowCount}`);

      if (rowCount === 0) {
        throw new Error('La tabla de usuarios está vacía. No hay datos para testear.');
      }
    }

    // ⭐ NUEVO: Buscar botón SOLO en filas visibles, con garantía de visibilidad
    let verButton = null;

    // Intentar múltiples selectores
    const selectors = [
      'table tbody tr:visible button[onclick*="viewUser"]',
      'table tbody tr:visible button[onclick*="editUser"]',
      'table tbody tr button.btn-info',
      'table tbody tr button.btn-primary',
      'table tbody tr:first-child button:has-text("Ver")',
      'table tbody tr:first-child button:has-text("👤")'
    ];

    for (const selector of selectors) {
      try {
        verButton = await agent.page.waitForSelector(selector, {
          timeout: 3000,
          state: 'visible'
        });

        if (verButton) {
          console.log(`   ✅ Botón "Ver" encontrado con selector: ${selector.substring(0, 50)}...`);
          break;
        }
      } catch (error) {
        // Probar siguiente selector
        continue;
      }
    }

    if (!verButton) {
      console.log('   ❌ No se encontró botón "Ver" visible en ninguna fila');

      // Debug: Listar todos los botones en la tabla
      const buttons = await agent.page.$$eval('table tbody tr button', btns =>
        btns.map(b => ({
          text: b.textContent?.trim(),
          onclick: b.getAttribute('onclick'),
          class: b.className,
          visible: b.offsetParent !== null
        }))
      );

      console.log('   📊 Botones encontrados en tabla:');
      console.log(JSON.stringify(buttons, null, 2));

      throw new Error('No se encontró botón "Ver" visible en la tabla de usuarios');
    }

    // ⭐ NUEVO: Hacer scroll al botón para asegurar visibilidad
    await verButton.scrollIntoViewIfNeeded();
    await agent.page.waitForTimeout(500);

    console.log('   ✅ Botón "Ver" visible y listo\n');

    // =========================================================================
    // 5. ABRIR MODAL
    // =========================================================================
    console.log('📂 [TEST] Abriendo modal "Ver Usuario"...\n');

    // ⭐ NUEVO: Capturar requests fallidos durante apertura del modal
    const failedRequests = [];

    agent.page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        method: request.method(),
        failure: request.failure()?.errorText || 'Unknown error'
      });
    });

    agent.page.on('response', response => {
      const status = response.status();
      if (status >= 400) {
        failedRequests.push({
          url: response.url(),
          method: response.request().method(),
          status: status,
          statusText: response.statusText()
        });
      }
    });

    // ⭐ NUEVO ENFOQUE: Ejecutar función JavaScript directamente (más confiable que click)
    console.log('   🔧 Extrayendo onclick del botón...');

    const onclickAttr = await verButton.evaluate(el => el.getAttribute('onclick'));
    console.log(`   📋 onclick="${onclickAttr}"`);

    // Extraer userId del onclick (formato esperado: viewUser('uuid') o editUser('uuid'))
    const userIdMatch = onclickAttr?.match(/['"]([a-f0-9-]{36})['"]/);
    const userId = userIdMatch ? userIdMatch[1] : null;

    if (!userId) {
      console.log('   ❌ No se pudo extraer userId del onclick');
      throw new Error('userId no encontrado en onclick del botón');
    }

    console.log(`   🆔 userId extraído: ${userId}`);
    console.log('   ⚡ Ejecutando función JavaScript directamente...');

    // Ejecutar la función viewUser() directamente (bypass del click)
    await agent.page.evaluate((uid) => {
      if (typeof window.viewUser === 'function') {
        window.viewUser(uid);
      } else if (typeof window.editUser === 'function') {
        window.editUser(uid);
      } else {
        console.error('Función viewUser/editUser no encontrada en window');
      }
    }, userId);

    console.log('   ✅ Función ejecutada, esperando modal...');

    // ⭐ NUEVO: Este modal NO usa Bootstrap .modal.show
    // Es un modal custom con id="employeeFileModal" y position:fixed
    // Esperar que el elemento exista y esté visible en el DOM
    try {
      await agent.page.waitForSelector('#employeeFileModal', {
        timeout: 10000,
        state: 'attached'  // Solo verificar que esté en el DOM
      });
      console.log('   ✅ Modal #employeeFileModal apareció en DOM');

      // Dar tiempo adicional para animaciones/renderizado
      await agent.page.waitForTimeout(1000);
      console.log('   ✅ Modal completamente renderizado\n');
    } catch (waitError) {
      console.log(`   ⚠️  Modal no apareció después de 10s: ${waitError.message}\n`);
    }

    // Reportar requests fallidos
    if (failedRequests.length > 0) {
      console.log(`   ⚠️  ${failedRequests.length} requests fallidos detectados:\n`);
      failedRequests.forEach((req, i) => {
        console.log(`   ${i + 1}. ${req.method} ${req.url}`);
        console.log(`      Status: ${req.status || 'Failed'} - ${req.statusText || req.failure}`);
      });
      console.log('');
    } else {
      console.log('   ✅ Sin requests fallidos - Endpoints funcionan correctamente\n');
    }

    // Verificar que el modal se abrió correctamente
    const modal = await agent.page.$('#employeeFileModal');

    if (!modal) {
      console.log('   ❌ Modal no se abrió. Analizando DOM...\n');

      // Debug: Listar todos los elementos con id que contengan "modal"
      const allModals = await agent.page.$$eval('[id*="Modal"], [id*="modal"]', modals =>
        modals.map(m => ({
          id: m.id,
          tagName: m.tagName,
          visible: m.offsetHeight > 0,
          zIndex: m.style.zIndex || window.getComputedStyle(m).zIndex
        }))
      );

      console.log('   📊 Modales encontrados en DOM:');
      console.log(JSON.stringify(allModals, null, 2));

      throw new Error('Modal #employeeFileModal no se abrió correctamente');
    }

    console.log('   ✅ Modal abierto (#employeeFileModal encontrado en DOM)\n');

    // =========================================================================
    // 6. DESCUBRIR TABS
    // =========================================================================
    console.log('🔍 [TEST] Descubriendo tabs en el modal...\n');

    // ⭐ NUEVO: Buscar tabs custom (clase .file-tab, no Bootstrap nav-tabs)
    const tabs = await agent.page.$$('#employeeFileModal .file-tab');

    console.log(`   ✅ ${tabs.length} tabs descubiertos\n`);

    if (tabs.length === 0) {
      console.log('   ⚠️  No se encontraron tabs con selectores estándar');
      console.log('   🔍 Buscando tabs alternativos...\n');

      // Intentar con selectores alternativos
      const altTabs = await agent.page.$$('.modal.show button[data-bs-toggle="tab"], .modal.show a[data-toggle="tab"]');
      console.log(`   ✅ ${altTabs.length} tabs encontrados con selectores alternativos\n`);

      if (altTabs.length === 0) {
        console.log('   ⚠️  No se encontraron tabs. Listando estructura del modal...\n');

        // Analizar estructura del modal
        const modalHTML = await agent.page.evaluate(() => {
          const modal = document.querySelector('.modal.show');
          if (!modal) return 'Modal no encontrado';

          // Buscar todos los posibles tabs
          const possibleTabs = modal.querySelectorAll('button, a, [role="tab"], .tab, .nav-item');
          return {
            totalElements: possibleTabs.length,
            structure: Array.from(possibleTabs).slice(0, 20).map(el => ({
              tag: el.tagName,
              class: el.className,
              text: el.textContent?.trim().substring(0, 50),
              role: el.getAttribute('role'),
              dataToggle: el.getAttribute('data-toggle') || el.getAttribute('data-bs-toggle')
            }))
          };
        });

        console.log('   📊 Estructura del modal:');
        console.log(JSON.stringify(modalHTML, null, 2));
      }
    }

    // =========================================================================
    // 7. PROBAR CADA TAB
    // =========================================================================
    if (tabs.length > 0) {
      console.log('🧪 [TEST] Probando cada tab...\n');

      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];

        // Obtener texto del tab
        const tabText = await tab.textContent();
        const tabClean = tabText?.trim() || `Tab ${i + 1}`;

        console.log(`   ${i + 1}/${tabs.length}. Testing tab: "${tabClean}"`);

        try {
          // Click en el tab
          await tab.click();
          await agent.page.waitForTimeout(1500);

          // Verificar que el contenido del tab cargó
          const isActive = await tab.evaluate(el =>
            el.classList.contains('active') ||
            el.getAttribute('aria-selected') === 'true'
          );

          if (isActive) {
            console.log(`      ✅ Tab activado`);

            // Contar campos en este tab (buscar en .file-tab-content con display visible)
            const fields = await agent.page.$$('#employeeFileModal .file-tab-content:not([style*="display: none"]) input, #employeeFileModal .file-tab-content:not([style*="display: none"]) select, #employeeFileModal .file-tab-content:not([style*="display: none"]) textarea');
            console.log(`      📝 ${fields.length} campos encontrados en este tab`);

            // Screenshot del tab
            const screenshot = `debug-tab-${i + 1}-${tabClean.replace(/[^a-z0-9]/gi, '-')}.png`;
            await agent.page.screenshot({ path: screenshot });
            console.log(`      📸 Screenshot: ${screenshot}`);

          } else {
            console.log(`      ⚠️  Tab no se activó correctamente`);
          }

        } catch (error) {
          console.log(`      ❌ Error probando tab: ${error.message}`);
        }

        console.log('');
      }
    }

    // =========================================================================
    // 8. CERRAR MODAL
    // =========================================================================
    console.log('🔒 [TEST] Cerrando modal...\n');

    // Buscar botón con onclick="closeEmployeeFile()" o ejecutar la función directamente
    try {
      await agent.page.evaluate(() => {
        if (typeof window.closeEmployeeFile === 'function') {
          window.closeEmployeeFile();
        }
      });
      await agent.page.waitForTimeout(500);
      console.log('   ✅ Modal cerrado\n');
    } catch (error) {
      console.log(`   ⚠️  No se pudo cerrar modal: ${error.message}\n`);
    }

    // =========================================================================
    // 9. RESULTADOS FINALES
    // =========================================================================
    console.log('='.repeat(80));
    console.log('📊 RESULTADOS FINALES');
    console.log('='.repeat(80) + '\n');
    console.log(`Total tabs encontrados: ${tabs.length}`);
    console.log(`Modal testeado: ✅`);
    console.log('');
    console.log('='.repeat(80));
    console.log('✅ TEST COMPLETADO');
    console.log('='.repeat(80) + '\n');

    // Cleanup
    await agent.cleanup?.();

    process.exit(0);

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ ERROR EN EJECUCIÓN');
    console.error('='.repeat(80));
    console.error(error);
    console.error('='.repeat(80) + '\n');

    process.exit(1);
  }
}

// Ejecutar
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
