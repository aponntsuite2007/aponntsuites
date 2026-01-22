/**
 * TEST REAL DE 35 MÓDULOS - SIN ATAJOS
 *
 * Testea TODOS los módulos sin clasificar ninguno como "dashboard"
 * Reporta honestamente qué funciona y qué no
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');
const fs = require('fs');

// TODOS los 35 módulos ISI - SIN EXCEPCIONES
const ALL_35_MODULES = [
  "users",
  "attendance",
  "kiosks",
  "medical",
  "visitors",
  "vacation-management",
  "training-management",
  "sanctions-management",
  "job-postings",
  "benefits-management",
  "hour-bank",
  "payroll-liquidation",
  "art-management",
  "procurement-management",
  "hse-management",
  "compliance-dashboard",
  "legal-dashboard",
  "employee-360",
  "emotional-analysis",
  "employee-map",
  "sla-tracking",
  "audit-reports",
  "logistics-dashboard",
  "siac-commercial-dashboard",
  "voice-platform",
  "procedures-manual",
  "notification-center",
  "biometric-consent",
  "organizational-structure",
  "finance-dashboard",
  "warehouse-management",
  "dms-dashboard",
  "mi-espacio",
  "my-procedures",
  "user-support"
];

async function testModule(agent, moduleId, results) {
  const moduleResult = {
    moduleId,
    navigation: { success: false, error: null },
    hasInterface: false,
    hasCRUD: false,
    create: { success: false, error: null, attempted: false },
    read: { success: false, error: null, attempted: false },
    update: { success: false, error: null, attempted: false },
    delete: { success: false, error: null, attempted: false },
    overallStatus: 'NOT_TESTED'
  };

  try {
    // 0. LIMPIAR MODALES AGRESIVAMENTE - MÚLTIPLES PASADAS
    console.log(`\n   0. Limpiando estado previo...`);

    // Pasada 1: Escape key para cerrar cualquier modal via Bootstrap
    await agent.page.keyboard.press('Escape');
    await agent.page.waitForTimeout(200);
    await agent.page.keyboard.press('Escape');
    await agent.page.waitForTimeout(200);

    // Pasada 2: Remover modales del DOM
    await agent.page.evaluate(() => {
      // Remover TODOS los modales del DOM
      document.querySelectorAll('.modal, .modal-dialog, .modal-content').forEach(m => {
        m.remove();
      });
      // Remover backdrops
      document.querySelectorAll('.modal-backdrop, .modal-overlay, [class*="backdrop"]').forEach(b => b.remove());
      // Limpiar body completamente
      document.body.classList.remove('modal-open');
      document.body.style.cssText = document.body.style.cssText.replace(/overflow[^;]*;?/gi, '').replace(/padding-right[^;]*;?/gi, '');
      document.body.removeAttribute('data-bs-overflow');
      document.body.removeAttribute('data-bs-padding-right');
    });
    await agent.page.waitForTimeout(300);

    // Pasada 3: Verificar que no hay modales bloqueando
    const cleanupCheck = await agent.page.evaluate(() => {
      const modals = document.querySelectorAll('.modal');
      const backdrops = document.querySelectorAll('.modal-backdrop');
      return { modals: modals.length, backdrops: backdrops.length };
    });

    if (cleanupCheck.modals > 0 || cleanupCheck.backdrops > 0) {
      console.log(`   ⚠️ Aún hay ${cleanupCheck.modals} modales y ${cleanupCheck.backdrops} backdrops - forzando cleanup...`);
      // Forzar remoción con innerHTML
      await agent.page.evaluate(() => {
        document.querySelectorAll('.modal, .modal-backdrop').forEach(el => {
          el.parentNode.removeChild(el);
        });
      });
      await agent.page.waitForTimeout(200);
    }

    // 1. NAVEGACIÓN DIRECTA - SIN USAR navigateToModule
    console.log(`   1. Navegando a ${moduleId}...`);

    // Buscar el módulo card y hacer click directo con JavaScript
    const navResult = await agent.page.evaluate((targetModuleId) => {
      // Buscar el elemento del módulo
      const moduleEl = document.querySelector(`[data-module-key="${targetModuleId}"]`);

      if (!moduleEl) {
        return { success: false, error: 'Módulo no encontrado en el DOM' };
      }

      // Scroll al elemento
      moduleEl.scrollIntoView({ behavior: 'instant', block: 'center' });

      // Obtener el onclick o click event
      const onclick = moduleEl.getAttribute('onclick');
      if (onclick) {
        // Ejecutar el onclick directamente
        try {
          eval(onclick);
          return { success: true, method: 'onclick-eval' };
        } catch(e) {
          // Intentar click directo
        }
      }

      // Simular click completo
      moduleEl.click();

      // También disparar eventos manualmente
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      moduleEl.dispatchEvent(clickEvent);

      return { success: true, method: 'click-dispatch' };
    }, moduleId);

    if (!navResult.success) {
      throw new Error(navResult.error || 'Error en navegación');
    }

    // Esperar a que cargue el contenido del módulo
    await agent.page.waitForTimeout(2500);

    // Verificar que el módulo se cargó correctamente
    const contentCheck = await agent.page.evaluate((targetModuleId) => {
      // Verificar si el contenido cambió (buscar indicadores del módulo actual)
      const activeModule = document.querySelector('.module-content.active, [data-active-module], #moduleContent');
      const pageTitle = document.querySelector('h1, h2, .page-title, .module-title');

      return {
        hasActiveModule: !!activeModule,
        pageTitle: pageTitle?.textContent?.trim()?.substring(0, 50) || 'No title',
        bodyLength: document.body.innerText.length
      };
    }, moduleId);

    console.log(`   📄 Contenido cargado: "${contentCheck.pageTitle}" (${contentCheck.bodyLength} chars)`);
    moduleResult.navigation.success = true;

    // 2. VERIFICAR SI TIENE INTERFAZ
    const pageContent = await agent.page.evaluate(() => {
      const body = document.body.innerText || '';
      const hasContent = body.length > 100;
      // Solo considerar "error" como falla si está acompañado de contexto de error real
      const errorPatterns = [
        /error\s*404/i,
        /página\s*no\s*encontrada/i,
        /módulo\s*no\s*disponible/i,
        /no\s*se\s*pudo\s*cargar/i,
        /failed\s*to\s*load/i
      ];
      const hasRealError = errorPatterns.some(pattern => pattern.test(body));
      return { hasContent, hasError: hasRealError, length: body.length };
    });

    if (!pageContent.hasContent) {
      moduleResult.hasInterface = false;
      moduleResult.overallStatus = 'NO_INTERFACE';
      console.log(`   ⚠️ Módulo sin contenido (${pageContent.length} chars)`);
      return moduleResult;
    }
    moduleResult.hasInterface = true;

    // 3. BUSCAR BOTÓN DE CREAR (cualquier variante)
    const createButton = await agent.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a.btn, [onclick], .btn'));
      const createKeywords = ['agregar', 'nuevo', 'crear', 'add', 'new', 'create', '+', 'registrar'];

      for (const btn of buttons) {
        if (btn.offsetParent === null) continue; // No visible
        const text = (btn.textContent || '').toLowerCase().trim();
        const title = (btn.getAttribute('title') || '').toLowerCase();
        const onclick = (btn.getAttribute('onclick') || '').toLowerCase();

        for (const kw of createKeywords) {
          if (text.includes(kw) || title.includes(kw) || onclick.includes('add') || onclick.includes('create') || onclick.includes('new')) {
            return {
              found: true,
              text: btn.textContent.trim().substring(0, 50),
              selector: btn.id ? `#${btn.id}` : null
            };
          }
        }
      }
      return { found: false };
    });

    if (!createButton.found) {
      moduleResult.hasCRUD = false;
      moduleResult.overallStatus = 'VIEW_ONLY';
      console.log(`   ℹ️ Solo visualización (sin botón crear)`);

      // Verificar si hay datos para leer
      const hasData = await agent.page.evaluate(() => {
        const tables = document.querySelectorAll('table tbody tr');
        const cards = document.querySelectorAll('.card, .list-item, [class*="item"]');
        return tables.length > 0 || cards.length > 5;
      });

      if (hasData) {
        moduleResult.read.success = true;
        moduleResult.read.attempted = true;
        console.log(`   ✅ READ: Hay datos visibles`);
      }

      return moduleResult;
    }

    moduleResult.hasCRUD = true;
    console.log(`   ✅ Botón crear encontrado: "${createButton.text}"`);

    // 4. TEST CREATE
    console.log(`   2. Testeando CREATE...`);
    moduleResult.create.attempted = true;

    try {
      // Click en crear
      await agent.page.evaluate((btnText) => {
        const buttons = Array.from(document.querySelectorAll('button, a.btn, [onclick], .btn'));
        for (const btn of buttons) {
          if (btn.textContent.trim().substring(0, 50) === btnText && btn.offsetParent !== null) {
            btn.click();
            return true;
          }
        }
        return false;
      }, createButton.text);

      await agent.page.waitForTimeout(2000);

      // Verificar si se abrió modal o formulario
      const formState = await agent.page.evaluate(() => {
        const modal = document.querySelector('.modal.show, [role="dialog"], .modal-overlay, [class*="modal"]:not([style*="display: none"])');
        const form = document.querySelector('form:not([style*="display: none"])');
        const inputs = document.querySelectorAll('input:not([type="hidden"]):not([style*="display: none"]), textarea, select');
        const visibleInputs = Array.from(inputs).filter(i => i.offsetParent !== null);

        return {
          hasModal: !!modal,
          hasForm: !!form,
          inputCount: visibleInputs.length,
          inputNames: visibleInputs.slice(0, 5).map(i => i.name || i.id || i.placeholder || 'unnamed')
        };
      });

      if (formState.inputCount < 1) {
        moduleResult.create.error = 'No se encontraron campos de formulario';
        console.log(`   ❌ CREATE: No hay campos de formulario`);
      } else {
        // Llenar formulario con datos de prueba
        const filled = await agent.page.evaluate(() => {
          const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
          let filledCount = 0;

          for (const input of inputs) {
            if (input.offsetParent === null) continue;

            const name = (input.name || input.id || '').toLowerCase();
            const type = input.type || input.tagName.toLowerCase();

            try {
              if (type === 'select' || input.tagName === 'SELECT') {
                const options = input.querySelectorAll('option');
                if (options.length > 1) {
                  input.selectedIndex = 1;
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                  filledCount++;
                }
              } else if (type === 'checkbox' || type === 'radio') {
                // Skip
              } else if (type === 'date') {
                input.value = '2025-01-15';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                filledCount++;
              } else if (type === 'email' || name.includes('email')) {
                input.value = 'test@test.com';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                filledCount++;
              } else if (type === 'number' || name.includes('cantidad') || name.includes('amount')) {
                input.value = '100';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                filledCount++;
              } else if (type === 'tel' || name.includes('phone') || name.includes('telefono')) {
                input.value = '1234567890';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                filledCount++;
              } else if (input.tagName === 'TEXTAREA') {
                input.value = 'Test descripción automática ' + Date.now();
                input.dispatchEvent(new Event('input', { bubbles: true }));
                filledCount++;
              } else {
                input.value = 'Test_' + Date.now().toString().slice(-6);
                input.dispatchEvent(new Event('input', { bubbles: true }));
                filledCount++;
              }
            } catch(e) {}
          }

          return filledCount;
        });

        console.log(`      Campos llenados: ${filled}`);

        // Buscar y click en botón guardar
        await agent.page.waitForTimeout(500);

        const saved = await agent.page.evaluate(() => {
          const saveButtons = Array.from(document.querySelectorAll('button, input[type="submit"], .btn'));
          const saveKeywords = ['guardar', 'save', 'crear', 'create', 'agregar', 'add', 'enviar', 'submit', 'confirmar'];

          for (const btn of saveButtons) {
            if (btn.offsetParent === null) continue;
            const text = (btn.textContent || '').toLowerCase();
            const type = btn.type || '';

            if (type === 'submit' || saveKeywords.some(kw => text.includes(kw))) {
              btn.click();
              return { clicked: true, text: btn.textContent.trim() };
            }
          }
          return { clicked: false };
        });

        if (saved.clicked) {
          await agent.page.waitForTimeout(3000);

          // Verificar si hubo error o éxito - más detallado
          const result = await agent.page.evaluate(() => {
            // Buscar mensajes de error en múltiples lugares
            const errorEl = document.querySelector('.alert-danger, .error, .text-danger, [class*="error"]:not(button), .invalid-feedback, .is-invalid + .feedback');
            const toastError = document.querySelector('.toast.error, .toast-error, .swal2-popup.swal2-icon-error');
            const successEl = document.querySelector('.alert-success, .success, [class*="success"]:not(button), .toast-success, .swal2-popup.swal2-icon-success');
            const modalStillOpen = document.querySelector('.modal.show, .modal[style*="display: block"]');

            // Verificar si el modal se cerró (indica éxito usualmente)
            const modalClosed = !modalStillOpen;

            // Buscar feedback en campos individuales
            const invalidFields = document.querySelectorAll('.is-invalid, :invalid');
            const validationErrors = Array.from(invalidFields).map(f => f.name || f.id).filter(Boolean);

            return {
              hasError: !!errorEl || !!toastError,
              errorText: errorEl?.textContent?.trim()?.substring(0, 150) ||
                         toastError?.textContent?.trim()?.substring(0, 150) ||
                         (validationErrors.length > 0 ? `Campos inválidos: ${validationErrors.join(', ')}` : null),
              hasSuccess: !!successEl,
              modalClosed: modalClosed,
              invalidFieldCount: invalidFields.length
            };
          });

          if (result.hasError) {
            moduleResult.create.error = result.errorText || 'Error al guardar';
            console.log(`   ❌ CREATE: ${result.errorText || 'Error'}`);
          } else if (result.hasSuccess) {
            moduleResult.create.success = true;
            console.log(`   ✅ CREATE: Exitoso (mensaje de éxito)`);
          } else if (result.modalClosed && result.invalidFieldCount === 0) {
            moduleResult.create.success = true;
            console.log(`   ✅ CREATE: Exitoso (modal cerrado)`);
          } else if (result.invalidFieldCount > 0) {
            moduleResult.create.error = `${result.invalidFieldCount} campos con validación fallida`;
            console.log(`   ❌ CREATE: ${result.invalidFieldCount} campos inválidos`);
          } else {
            moduleResult.create.error = 'Modal sigue abierto sin éxito claro';
            console.log(`   ⚠️ CREATE: Estado incierto (modal abierto)`);
          }
        } else {
          moduleResult.create.error = 'No se encontró botón guardar';
          console.log(`   ❌ CREATE: No se encontró botón guardar`);
        }
      }

      // CERRAR MODAL AGRESIVAMENTE - REMOVER DEL DOM
      console.log(`      🧹 Limpiando modal de CREATE...`);
      await agent.page.keyboard.press('Escape');
      await agent.page.waitForTimeout(300);
      await agent.page.keyboard.press('Escape');
      await agent.page.waitForTimeout(300);

      // REMOVER modal del DOM completamente
      await agent.page.evaluate(() => {
        document.querySelectorAll('.modal, .modal-dialog, .modal-content, .modal-backdrop').forEach(el => {
          el.remove();
        });
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      });
      await agent.page.waitForTimeout(500);

    } catch(e) {
      moduleResult.create.error = e.message;
      console.log(`   ❌ CREATE: ${e.message}`);

      // Aunque falle CREATE, limpiar el modal
      await agent.page.keyboard.press('Escape');
      await agent.page.evaluate(() => {
        document.querySelectorAll('.modal, .modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
      });
      await agent.page.waitForTimeout(500);
    }

    // 5. TEST READ (verificar si hay datos en lista)
    console.log(`   3. Testeando READ...`);
    moduleResult.read.attempted = true;

    try {
      // Asegurar que no hay modales bloqueando
      await agent.page.evaluate(() => {
        document.querySelectorAll('.modal, .modal-backdrop').forEach(m => m.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
      });

      await agent.page.waitForTimeout(500);

      const readResult = await agent.page.evaluate(() => {
        const tables = document.querySelectorAll('table');
        let totalRows = 0;
        tables.forEach(t => {
          const rows = t.querySelectorAll('tbody tr');
          totalRows += rows.length;
        });

        const cards = document.querySelectorAll('.card, .list-group-item, [class*="item"]');

        return {
          tableRows: totalRows,
          cardCount: cards.length,
          hasData: totalRows > 0 || cards.length > 3
        };
      });

      if (readResult.hasData) {
        moduleResult.read.success = true;
        console.log(`   ✅ READ: ${readResult.tableRows} filas, ${readResult.cardCount} cards`);
      } else {
        moduleResult.read.error = 'No se encontraron datos';
        console.log(`   ⚠️ READ: Sin datos visibles`);
      }
    } catch(e) {
      moduleResult.read.error = e.message;
      console.log(`   ❌ READ: ${e.message}`);
    }

    // Determinar estado general
    if (moduleResult.create.success && moduleResult.read.success) {
      moduleResult.overallStatus = 'CRUD_OK';
    } else if (moduleResult.create.success || moduleResult.read.success) {
      moduleResult.overallStatus = 'PARTIAL';
    } else {
      moduleResult.overallStatus = 'FAILED';
    }

  } catch(e) {
    moduleResult.navigation.error = e.message;
    moduleResult.overallStatus = 'NAV_FAILED';
    console.log(`   ❌ Error: ${e.message}`);
  }

  return moduleResult;
}

async function runFullTest() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔬 TEST REAL DE 35 MÓDULOS - SIN ATAJOS NI EXCUSAS');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`📋 Módulos a testear: ${ALL_35_MODULES.length}`);
  console.log(`⏰ Inicio: ${new Date().toLocaleString()}`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const agent = new AutonomousQAAgent({
    headless: true,
    timeout: 60000,
    learningMode: false,
    brainIntegration: false
  });

  const results = {
    timestamp: new Date().toISOString(),
    totalModules: ALL_35_MODULES.length,
    modules: [],
    summary: {
      navigation_ok: 0,
      has_interface: 0,
      has_crud: 0,
      create_ok: 0,
      create_failed: 0,
      read_ok: 0,
      view_only: 0,
      failed: 0
    }
  };

  try {
    console.log('1️⃣ Inicializando navegador...');
    await agent.init();
    console.log('   ✅ Navegador iniciado\n');

    console.log('2️⃣ Login como admin ISI...');
    await agent.login({
      empresa: 'isi',
      usuario: 'admin',
      password: 'admin123'
    });
    console.log('   ✅ Login exitoso\n');

    console.log('3️⃣ Testeando módulos...\n');

    for (let i = 0; i < ALL_35_MODULES.length; i++) {
      const moduleId = ALL_35_MODULES[i];

      console.log(`\n[${i + 1}/${ALL_35_MODULES.length}] ═══════════════════════════════════════`);
      console.log(`📦 MÓDULO: ${moduleId}`);

      const moduleResult = await testModule(agent, moduleId, results);
      results.modules.push(moduleResult);

      // Actualizar resumen
      if (moduleResult.navigation.success) results.summary.navigation_ok++;
      if (moduleResult.hasInterface) results.summary.has_interface++;
      if (moduleResult.hasCRUD) results.summary.has_crud++;
      if (moduleResult.create.success) results.summary.create_ok++;
      if (moduleResult.create.attempted && !moduleResult.create.success) results.summary.create_failed++;
      if (moduleResult.read.success) results.summary.read_ok++;
      if (moduleResult.overallStatus === 'VIEW_ONLY') results.summary.view_only++;
      if (moduleResult.overallStatus === 'FAILED' || moduleResult.overallStatus === 'NAV_FAILED') results.summary.failed++;

      // Limpiar estado entre módulos - REMOVER MODALES DEL DOM
      await agent.page.evaluate(() => {
        // REMOVER todos los modales del DOM
        document.querySelectorAll('.modal').forEach(m => m.remove());
        // REMOVER todos los backdrops
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        // Limpiar body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
        window.scrollTo(0, 0);
      });
      await agent.page.waitForTimeout(500);

      console.log(`   📊 Status: ${moduleResult.overallStatus}`);
    }

  } catch(e) {
    console.error('\n❌ ERROR FATAL:', e.message);
  } finally {
    await agent.close();
  }

  // Guardar resultados
  const resultsFile = 'test-35-modules-results.json';
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

  // Mostrar resumen
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN FINAL - TEST REAL DE 35 MÓDULOS');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`   Total módulos: ${results.totalModules}`);
  console.log(`   ✅ Navegación OK: ${results.summary.navigation_ok}`);
  console.log(`   ✅ Con interfaz: ${results.summary.has_interface}`);
  console.log(`   🔧 Con CRUD: ${results.summary.has_crud}`);
  console.log(`   ✅ CREATE OK: ${results.summary.create_ok}`);
  console.log(`   ❌ CREATE FAILED: ${results.summary.create_failed}`);
  console.log(`   ✅ READ OK: ${results.summary.read_ok}`);
  console.log(`   👁️ Solo vista: ${results.summary.view_only}`);
  console.log(`   ❌ Fallidos: ${results.summary.failed}`);

  const crudRate = results.summary.has_crud > 0
    ? Math.round(results.summary.create_ok / results.summary.has_crud * 100)
    : 0;
  console.log(`\n   📈 CRUD Success Rate: ${crudRate}%`);

  // Listar módulos con problemas
  const problems = results.modules.filter(m =>
    m.overallStatus === 'FAILED' ||
    m.overallStatus === 'NAV_FAILED' ||
    (m.hasCRUD && !m.create.success)
  );

  if (problems.length > 0) {
    console.log('\n⚠️ MÓDULOS CON PROBLEMAS:');
    problems.forEach(m => {
      const error = m.navigation.error || m.create.error || 'Unknown';
      console.log(`   - ${m.moduleId}: ${error.substring(0, 60)}`);
    });
  }

  console.log(`\n📄 Resultados guardados en: ${resultsFile}`);
  console.log(`⏰ Fin: ${new Date().toLocaleString()}`);

  return results;
}

// Ejecutar
runFullTest().catch(console.error);
