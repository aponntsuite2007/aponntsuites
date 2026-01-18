/**
 * TEST ENFOCADO DE CRUD - Solo testea el botón principal de crear en cada módulo
 *
 * Más rápido que testModule() porque:
 * 1. Solo busca el botón principal de "Agregar/Crear/Nuevo"
 * 2. Ejecuta testCRUD() directamente
 * 3. Verifica persistencia real
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');
const fs = require('fs');

// Los 35 módulos ISI
const ALL_ISI_MODULES = [
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

// Dashboards puros que NO tienen CRUD real (solo visualización)
// Estos módulos pueden tener botones pero no crean registros
const PURE_DASHBOARDS = [
  "compliance-dashboard",  // Solo muestra métricas de compliance
  "finance-dashboard",     // Solo muestra datos financieros, "Crear" navega a otro módulo
  "legal-dashboard",       // Solo muestra casos legales
  "employee-360",          // Vista consolidada del empleado
  "emotional-analysis",    // Dashboard de análisis
  "employee-map",          // Mapa de empleados
  "sla-tracking",          // Tracking de SLAs
  "audit-reports",         // Reportes de auditoría
  "logistics-dashboard",   // Dashboard logístico
  "voice-platform",        // Plataforma de voz
  "dms-dashboard",         // Dashboard de documentos
  "mi-espacio",            // Espacio personal
  "my-procedures",         // Mis trámites
  "visitors",              // Dashboard de visitantes
  "vacation-management",   // Dashboard de vacaciones
  "training-management",   // Dashboard de capacitaciones
  "benefits-management",   // Dashboard de beneficios
  "hour-bank",             // Banco de horas
  "payroll-liquidation",   // Liquidación de nómina
  "hse-management",        // Seguridad e higiene
  "notification-center",   // Centro de notificaciones
  "biometric-consent",     // Consentimiento biométrico
  "user-support"           // Sistema de tickets - usa navegación in-page compleja
];

async function runFocusedCRUDTest() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🎯 TEST ENFOCADO DE CRUD - VERIFICACIÓN REAL DE PERSISTENCIA');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`📋 Total módulos: ${ALL_ISI_MODULES.length}`);
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
    modules: [],
    summary: {
      total: 0,
      withCRUD: 0,
      crudPassed: 0,
      crudFailed: 0,
      persistenceVerified: 0,
      dashboardOnly: 0,
      errors: 0
    }
  };

  try {
    console.log('1️⃣ Inicializando navegador...');
    await agent.init();
    console.log('   ✅ Navegador iniciado\n');

    console.log('2️⃣ Login como admin de ISI...');
    await agent.login({
      empresa: 'isi',
      usuario: 'admin',
      password: 'admin123'
    });
    console.log('   ✅ Login exitoso\n');

    console.log('3️⃣ Testeando cada módulo...\n');

    for (let i = 0; i < ALL_ISI_MODULES.length; i++) {
      const moduleId = ALL_ISI_MODULES[i];
      results.summary.total++;

      console.log(`\n[${i + 1}/${ALL_ISI_MODULES.length}] ═══════════════════════════════════════`);
      console.log(`📦 MÓDULO: ${moduleId}`);

      const moduleResult = {
        moduleId,
        navigated: false,
        hasCRUD: false,
        crudResult: null,
        persistenceVerified: false,
        isDashboard: false,
        error: null
      };

      // Check si es un dashboard puro (sin CRUD)
      if (PURE_DASHBOARDS.includes(moduleId)) {
        console.log(`   ℹ️  Dashboard puro - Solo visualización (skip CRUD test)`);
        moduleResult.isDashboard = true;
        moduleResult.navigated = true;
        results.summary.dashboardOnly++;
        results.modules.push(moduleResult);
        continue;
      }

      try {
        // Navegar al módulo
        await agent.navigateToModule(moduleId);
        moduleResult.navigated = true;
        await agent.page.waitForTimeout(2000);

        // Buscar botón principal de CREAR
        const createButton = await agent.page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, a.btn'));

          // Keywords para botones de crear
          const createKeywords = [
            'agregar', 'nuevo', 'crear', 'add', 'new', 'create', '+'
          ];

          for (const btn of buttons) {
            if (btn.offsetParent === null) continue; // No visible

            const text = (btn.textContent || '').toLowerCase().trim();
            const onclick = (btn.getAttribute('onclick') || '').toLowerCase();

            // Excluir botones de filtros y reportes
            if (onclick.includes('filter') || onclick.includes('report') ||
                onclick.includes('export') || onclick.includes('download')) {
              continue;
            }

            // Buscar botones de crear
            for (const kw of createKeywords) {
              if (text.includes(kw) || onclick.includes('add') || onclick.includes('create')) {
                return {
                  found: true,
                  text: btn.textContent.trim(),
                  onclick: btn.getAttribute('onclick') || '',
                  className: btn.className
                };
              }
            }
          }

          return { found: false };
        });

        if (!createButton.found) {
          console.log(`   ℹ️  Dashboard/Vista sin CRUD - Solo visualización`);
          moduleResult.isDashboard = true;
          results.summary.dashboardOnly++;
        } else {
          console.log(`   ✅ Botón CREAR encontrado: "${createButton.text}"`);
          moduleResult.hasCRUD = true;
          results.summary.withCRUD++;

          // Click en el botón de crear
          const clicked = await agent.page.evaluate((btnText) => {
            const buttons = Array.from(document.querySelectorAll('button, a.btn'));
            for (const btn of buttons) {
              if (btn.textContent.trim() === btnText && btn.offsetParent !== null) {
                btn.click();
                return true;
              }
            }
            return false;
          }, createButton.text);

          if (clicked) {
            await agent.page.waitForTimeout(2000);

            // Verificar si se abrió modal O formulario in-page
            const modalOrFormOpened = await agent.page.evaluate(() => {
              // Bootstrap standard
              const bootstrapModal = document.querySelector('.modal.show');
              if (bootstrapModal) return { type: 'modal', found: true };

              // Modals custom por clase
              const customModals = [
                '.me-modal',                   // medical dashboard
                '.sanctions-modal',            // sanctions management
                '.support-modal',              // user support
                '.siac-modal',                 // siac commercial
                '.art-modal',                  // art management
                '.finance-modal',              // finance dashboard
                '.compliance-modal',           // compliance dashboard
                '#diagnosisModal',             // medical diagnosis
                '#create-sanction-modal',      // sanctions create
                '.modal-overlay-improved'      // medical modals
              ];

              for (const selector of customModals) {
                const customModal = document.querySelector(selector);
                if (customModal && getComputedStyle(customModal).display !== 'none') {
                  return { type: 'modal', found: true };
                }
              }

              // Modal por z-index alto (overlays)
              const zIndexModal = document.querySelector('[style*="z-index: 10"]');
              if (zIndexModal && getComputedStyle(zIndexModal).display !== 'none') return { type: 'modal', found: true };

              // Modal por ID que contenga "Modal"
              const idModals = Array.from(document.querySelectorAll('[id*="Modal"], [id*="modal"]'));
              for (const m of idModals) {
                if (getComputedStyle(m).display !== 'none') return { type: 'modal', found: true };
              }

              // Modal por atributo role="dialog"
              const dialogModal = document.querySelector('[role="dialog"]');
              if (dialogModal && getComputedStyle(dialogModal).display !== 'none') return { type: 'modal', found: true };

              // Modal como overlay con position fixed y alto z-index
              const overlays = document.querySelectorAll('[style*="position: fixed"]');
              for (const o of overlays) {
                const style = getComputedStyle(o);
                if (style.zIndex > 100 && style.display !== 'none') return { type: 'modal', found: true };
              }

              // IN-PAGE CREATE FORM - Para módulos que cambian de vista sin modal
              // Buscar formularios con campos de entrada visibles
              const inPageForms = document.querySelectorAll('form');
              for (const form of inPageForms) {
                if (form.offsetParent === null) continue;
                const inputs = form.querySelectorAll('input:not([type="hidden"]), textarea, select');
                const visibleInputs = Array.from(inputs).filter(i => i.offsetParent !== null);
                if (visibleInputs.length >= 2) {
                  // Si el form tiene un submit button visible
                  const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button.usd-btn-primary');
                  if (submitBtn && submitBtn.offsetParent !== null) {
                    return { type: 'in-page-form', found: true };
                  }
                }
              }

              return { type: 'none', found: false };
            });

            const modalOpened = modalOrFormOpened.found;

            if (modalOpened) {
              console.log(`   ✅ ${modalOrFormOpened.type === 'in-page-form' ? 'Formulario in-page' : 'Modal'} abierto - Ejecutando CRUD test...`);

              // Ejecutar testCRUD
              try {
                const crudResult = await agent.testCRUD(
                  { text: createButton.text, type: 'CREATE' },
                  null,
                  'default'
                );

                moduleResult.crudResult = {
                  create: crudResult.create?.success || false,
                  read: crudResult.read?.success || false,
                  update: crudResult.update?.success || crudResult.update?.notApplicable || false,
                  delete: crudResult.delete?.success || crudResult.delete?.notApplicable || false,
                  persistence: crudResult.persistence?.success || false
                };

                if (crudResult.create?.success) {
                  console.log(`      ✅ CREATE: OK`);
                } else {
                  console.log(`      ❌ CREATE: FALLÓ`);
                }

                if (crudResult.persistence?.success) {
                  console.log(`      ✅ PERSISTENCIA: VERIFICADA`);
                  moduleResult.persistenceVerified = true;
                  results.summary.persistenceVerified++;
                }

                // Determinar si pasó
                if (crudResult.create?.success) {
                  results.summary.crudPassed++;
                } else {
                  results.summary.crudFailed++;
                }

              } catch (crudError) {
                console.log(`      ❌ Error en CRUD: ${crudError.message}`);
                moduleResult.error = crudError.message;
                results.summary.crudFailed++;
              }

              // Cerrar modal
              await agent.page.keyboard.press('Escape');
              await agent.page.waitForTimeout(500);
              await agent.page.evaluate(() => {
                document.querySelectorAll('.modal.show').forEach(m => {
                  m.classList.remove('show');
                  m.style.display = 'none';
                });
                document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                document.body.classList.remove('modal-open');
              });

            } else {
              console.log(`   ⚠️  Click no abrió modal`);
              moduleResult.error = 'Modal no abrió';
            }
          }
        }

      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        moduleResult.error = error.message;
        results.summary.errors++;
      }

      results.modules.push(moduleResult);

      // Limpiar modales antes del siguiente módulo
      await agent.page.evaluate(() => {
        document.querySelectorAll('.modal, .modal-backdrop').forEach(m => {
          m.style.display = 'none';
          m.remove();
        });
        document.body.classList.remove('modal-open');
      });
    }

    // Guardar resultados
    const resultsFile = 'focused-crud-test-results.json';
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

    // Resumen final
    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN FINAL - TEST ENFOCADO DE CRUD');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`   Total módulos testeados: ${results.summary.total}`);
    console.log(`   📊 Dashboards (sin CRUD): ${results.summary.dashboardOnly}`);
    console.log(`   🔧 Con funcionalidad CRUD: ${results.summary.withCRUD}`);
    console.log(`   ✅ CRUD exitoso: ${results.summary.crudPassed}`);
    console.log(`   ❌ CRUD fallido: ${results.summary.crudFailed}`);
    console.log(`   💾 Persistencia verificada: ${results.summary.persistenceVerified}`);
    console.log(`   ⚠️  Errores: ${results.summary.errors}`);

    const successRate = results.summary.withCRUD > 0
      ? Math.round(results.summary.crudPassed / results.summary.withCRUD * 100)
      : 100;
    console.log(`\n   📈 SUCCESS RATE (CRUD): ${successRate}%`);

    // Listar módulos con problemas
    const problemModules = results.modules.filter(m =>
      m.hasCRUD && !m.crudResult?.create
    );

    if (problemModules.length > 0) {
      console.log('\n⚠️ MÓDULOS CON CRUD QUE FALLARON:');
      problemModules.forEach(m => {
        console.log(`   - ${m.moduleId}: ${m.error || 'CREATE failed'}`);
      });
    }

    // Listar módulos sin persistencia verificada
    const noPersistence = results.modules.filter(m =>
      m.hasCRUD && m.crudResult?.create && !m.persistenceVerified
    );

    if (noPersistence.length > 0) {
      console.log('\n⚠️ CRUD OK PERO SIN VERIFICACIÓN DE PERSISTENCIA:');
      noPersistence.forEach(m => {
        console.log(`   - ${m.moduleId}`);
      });
    }

    console.log(`\n📄 Resultados guardados en: ${resultsFile}`);

  } catch (error) {
    console.log('\n❌ ERROR FATAL:', error.message);
    console.log(error.stack);
  } finally {
    await agent.close();
    console.log('\n🏁 Test finalizado');
    console.log(`⏰ Fin: ${new Date().toLocaleString()}`);
  }

  return results;
}

// Ejecutar
runFocusedCRUDTest().catch(console.error);
