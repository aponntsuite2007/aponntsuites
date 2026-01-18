/**
 * TEST CRUD V3 - MÓDULOS DEL PANEL-EMPRESA
 *
 * Versión con cierre de modales antes de navegación
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');

// Módulos con CRUD (excluyendo users ya testeado)
const MODULES_TO_TEST = [
  'kiosks',
  'training-management',
  'visitors',
  'job-postings',
  'vacation-management',
  'medical',
  'sanctions-management',
  'art-management',
  'hse-management',
  'employee-360',
  'hour-bank',
  'payroll-liquidation',
  'procurement-management'
];

async function closeAllModals(page) {
  await page.evaluate(() => {
    // Cerrar modales Bootstrap
    document.querySelectorAll('.modal.show, .modal[style*="display: block"]').forEach(m => {
      m.classList.remove('show');
      m.style.display = 'none';
    });

    // Quitar backdrop
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());

    // Cerrar userModal específicamente
    const userModal = document.getElementById('userModal');
    if (userModal) {
      userModal.classList.remove('show');
      userModal.style.display = 'none';
    }

    // Cerrar employeeFileModal
    const empModal = document.getElementById('employeeFileModal');
    if (empModal) {
      empModal.classList.remove('show');
      empModal.style.display = 'none';
    }

    // Restaurar body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  await page.waitForTimeout(500);
}

async function testModulesCRUDv3() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔬 TEST CRUD V3 - MÓDULOS PANEL-EMPRESA (CON LIMPIEZA MODALES)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📋 Módulos a testear: ${MODULES_TO_TEST.length}\n`);

  const agent = new AutonomousQAAgent({
    headless: true,
    timeout: 60000,  // Reducido a 60s
    learningMode: false,
    brainIntegration: false
  });

  const results = {
    totalModules: MODULES_TO_TEST.length,
    tested: 0,
    passed: 0,
    failed: 0,
    noButtons: 0,
    moduleResults: []
  };

  try {
    await agent.init();
    const page = agent.page;

    // LOGIN
    console.log('1️⃣ LOGIN...');
    await agent.login({ empresa: 'isi', usuario: 'admin', password: 'admin123' });
    console.log('   ✅ Login OK\n');

    // Cerrar cualquier modal inicial
    await closeAllModals(page);

    for (let i = 0; i < MODULES_TO_TEST.length; i++) {
      const moduleId = MODULES_TO_TEST[i];
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`📦 [${i + 1}/${MODULES_TO_TEST.length}] ${moduleId}`);
      console.log('═══════════════════════════════════════════════════════════════');

      const moduleResult = {
        moduleId,
        navigated: false,
        hasButtons: false,
        crudTested: false,
        crudPassed: false,
        error: null
      };

      try {
        // IMPORTANTE: Cerrar modales antes de cada navegación
        await closeAllModals(page);

        // Navegar
        console.log(`   🔄 Navegando...`);

        try {
          await agent.navigateToModule(moduleId);
          moduleResult.navigated = true;
          console.log(`   ✅ Navegación OK`);
        } catch (navError) {
          console.log(`   ❌ Nav error: ${navError.message.substring(0, 80)}`);
          moduleResult.error = 'Navigation failed';
          results.failed++;
          results.tested++;
          results.moduleResults.push(moduleResult);
          continue;
        }

        await page.waitForTimeout(2000);

        // Buscar botones CRUD
        const addButtons = await page.evaluate(() => {
          const btns = [];
          document.querySelectorAll('button, a.btn').forEach(btn => {
            const text = (btn.textContent || '').toLowerCase();
            const onclick = btn.getAttribute('onclick') || '';
            const visible = btn.offsetParent !== null;

            if (visible && (
              text.includes('agregar') || text.includes('nuevo') ||
              text.includes('crear') || text === '+' ||
              onclick.includes('add') || onclick.includes('create')
            )) {
              btns.push(btn.textContent.trim().substring(0, 40));
            }
          });
          return btns;
        });

        console.log(`   📋 Botones CRUD: ${addButtons.length}`);

        if (addButtons.length === 0) {
          console.log(`   ⏭️ Sin CRUD (dashboard)\n`);
          results.noButtons++;
          results.tested++;
          results.moduleResults.push(moduleResult);
          continue;
        }

        moduleResult.hasButtons = true;
        addButtons.slice(0, 3).forEach(b => console.log(`      - ${b}`));

        // Click en primer botón
        console.log(`\n   🧪 Test CRUD...`);

        const clicked = await page.evaluate(() => {
          for (const btn of document.querySelectorAll('button, a.btn')) {
            const text = (btn.textContent || '').toLowerCase();
            const onclick = btn.getAttribute('onclick') || '';
            if (btn.offsetParent && (
              text.includes('agregar') || text.includes('nuevo') ||
              text.includes('crear') || text === '+' ||
              onclick.includes('add') || onclick.includes('create')
            )) {
              btn.click();
              return true;
            }
          }
          return false;
        });

        if (!clicked) {
          console.log(`   ❌ Click fallido\n`);
          results.failed++;
          results.tested++;
          results.moduleResults.push(moduleResult);
          continue;
        }

        moduleResult.crudTested = true;
        await page.waitForTimeout(2000);

        // Verificar modal
        const modal = await page.evaluate(() => {
          const m = document.querySelector('.modal.show, [style*="z-index: 10"]');
          if (m && m.offsetParent !== null) {
            return {
              found: true,
              id: m.id || 'modal',
              inputs: m.querySelectorAll('input:not([type="hidden"]), select, textarea').length
            };
          }
          return { found: false };
        });

        if (!modal.found) {
          console.log(`   ⚠️ No modal\n`);
          results.failed++;
          results.tested++;
          results.moduleResults.push(moduleResult);
          continue;
        }

        console.log(`   ✅ Modal: ${modal.id} (${modal.inputs} campos)`);

        // Llenar formulario
        await page.evaluate(() => {
          const marker = 'TEST-' + Date.now();
          document.querySelectorAll('.modal.show input[type="text"], .modal.show input:not([type])').forEach(i => {
            if (!i.disabled && !i.readOnly) { i.value = marker; i.dispatchEvent(new Event('input', { bubbles: true })); }
          });
          document.querySelectorAll('.modal.show input[type="number"]').forEach(i => {
            if (!i.disabled) { i.value = '100'; i.dispatchEvent(new Event('input', { bubbles: true })); }
          });
          document.querySelectorAll('.modal.show input[type="date"]').forEach(i => {
            if (!i.disabled) { i.value = '2024-06-15'; i.dispatchEvent(new Event('change', { bubbles: true })); }
          });
          document.querySelectorAll('.modal.show select').forEach(s => {
            if (!s.disabled && s.options.length > 1) { s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })); }
          });
          document.querySelectorAll('.modal.show textarea').forEach(t => {
            if (!t.disabled) { t.value = 'Test ' + marker; t.dispatchEvent(new Event('input', { bubbles: true })); }
          });
        });

        console.log(`   ✅ Formulario llenado`);

        // Guardar
        const saved = await page.evaluate(() => {
          const m = document.querySelector('.modal.show');
          if (!m) return false;
          const btn = m.querySelector('button[type="submit"], .btn-primary:not([data-bs-dismiss]), .btn-success');
          if (btn) { btn.click(); return true; }
          return false;
        });

        console.log(`   💾 Guardar: ${saved ? 'OK' : 'No encontrado'}`);
        await page.waitForTimeout(2000);

        // Verificar cierre
        const closed = await page.evaluate(() => {
          return !document.querySelector('.modal.show');
        });

        if (closed || saved) {
          console.log(`   ✅ CRUD SUCCESS\n`);
          moduleResult.crudPassed = true;
          results.passed++;
        } else {
          console.log(`   ⚠️ Modal no cerró\n`);
          results.failed++;
        }

        // Limpiar
        await closeAllModals(page);

      } catch (err) {
        console.log(`   ❌ Error: ${err.message.substring(0, 60)}\n`);
        moduleResult.error = err.message;
        results.failed++;
        await closeAllModals(page);
      }

      results.tested++;
      results.moduleResults.push(moduleResult);
    }

    // RESUMEN
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN FINAL');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n   Total: ${results.totalModules}`);
    console.log(`   ✅ CRUD OK: ${results.passed}`);
    console.log(`   ❌ CRUD Failed: ${results.failed}`);
    console.log(`   ⏭️ Dashboards: ${results.noButtons}`);

    const crudTotal = results.passed + results.failed;
    console.log(`   Success Rate: ${crudTotal > 0 ? Math.round((results.passed / crudTotal) * 100) : 0}%`);

    const failed = results.moduleResults.filter(m => m.hasButtons && !m.crudPassed);
    if (failed.length > 0) {
      console.log('\n   ⚠️ MÓDULOS CON PROBLEMAS:');
      failed.forEach(m => console.log(`      - ${m.moduleId}`));
    }

    await page.screenshot({ path: 'debug-modules-v3.png' });

  } catch (error) {
    console.log('\n❌ FATAL:', error.message);
  }

  await agent.close();
  console.log('\n🏁 Fin');

  require('fs').writeFileSync('modules-v3-results.json', JSON.stringify(results, null, 2));
  return results;
}

testModulesCRUDv3();
