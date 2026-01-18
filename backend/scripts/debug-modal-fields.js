/**
 * Script de debug para investigar por qué no se detectan campos
 * después de hacer clic en botones dentro de employeeFileModal
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');

async function main() {
  console.log('\n🔍 DEBUG: Investigación de campos en modales\n');

  const agent = new AutonomousQAAgent({
    headless: false, // ⭐ headless: false para ver qué pasa
    timeout: 60000,
    learningMode: false,
    brainIntegration: false
  });

  try {
    await agent.init();
    await agent.login({ empresa: 'isi', usuario: 'admin', password: 'admin123' });
    await agent.navigateToModule('users');

    // Abrir employeeFileModal
    console.log('⭐ Abriendo employeeFileModal...\n');
    const buttonFound = await agent.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const verUsuarioBtn = buttons.find(btn =>
        btn.textContent.includes('Ver Usuario') ||
        btn.getAttribute('onclick')?.includes('openEmployeeFile')
      );

      if (verUsuarioBtn) {
        verUsuarioBtn.click();
        return true;
      }
      return false;
    });

    if (!buttonFound) {
      console.log('❌ No se pudo abrir employeeFileModal');
      return;
    }

    await agent.page.waitForTimeout(2000);
    console.log('✅ employeeFileModal abierto\n');

    // Activar TAB 2: "👤 Datos Personales" (tiene botón "+ Agregar")
    console.log('⭐ Activando TAB 2: "👤 Datos Personales"...\n');
    await agent.page.evaluate(() => {
      const tabs = document.querySelectorAll('.custom-file-tab');
      if (tabs[1]) {
        tabs[1].click();
      }
    });

    await agent.page.waitForTimeout(1000);

    // Hacer clic en "+ Agregar"
    console.log('⭐ Haciendo clic en botón "+ Agregar"...\n');
    const clickResult = await agent.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const agregarBtn = buttons.find(btn =>
        btn.textContent.trim() === '+ Agregar' &&
        btn.offsetParent !== null
      );

      if (agregarBtn) {
        agregarBtn.click();
        return {
          found: true,
          text: agregarBtn.textContent.trim(),
          onclick: agregarBtn.getAttribute('onclick')
        };
      }
      return { found: false };
    });

    console.log('📊 Click result:', JSON.stringify(clickResult, null, 2));

    if (!clickResult.found) {
      console.log('❌ No se encontró botón "+ Agregar"');
      return;
    }

    await agent.page.waitForTimeout(2000);

    // INSPECCIÓN EXHAUSTIVA DEL DOM
    console.log('\n' + '='.repeat(80));
    console.log('🔍 INSPECCIÓN EXHAUSTIVA DEL DOM');
    console.log('='.repeat(80) + '\n');

    const domReport = await agent.page.evaluate(() => {
      const report = {
        modals: [],
        allInputs: [],
        allSelects: [],
        allTextareas: [],
        employeeFileModalContent: null
      };

      // 1. TODOS los modales visibles
      const allModals = document.querySelectorAll('.modal, [class*="modal"], [id*="modal"], [id*="Modal"]');
      allModals.forEach(m => {
        const style = window.getComputedStyle(m);
        const isVisible = style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        style.opacity !== '0';

        if (isVisible) {
          const inputs = m.querySelectorAll('input:not([type="hidden"])');
          const selects = m.querySelectorAll('select');
          const textareas = m.querySelectorAll('textarea');

          report.modals.push({
            id: m.id || 'unknown',
            classes: m.className,
            zIndex: style.zIndex,
            display: style.display,
            visible: m.offsetParent !== null || style.position === 'fixed',
            totalInputs: inputs.length,
            totalSelects: selects.length,
            totalTextareas: textareas.length,
            firstInputs: Array.from(inputs).slice(0, 3).map(i => ({
              type: i.type,
              name: i.name,
              id: i.id,
              value: i.value,
              visible: i.offsetParent !== null
            }))
          });
        }
      });

      // 2. Inspeccionar employeeFileModal específicamente
      const employeeModal = document.getElementById('employeeFileModal');
      if (employeeModal) {
        const activeTab = employeeModal.querySelector('.custom-tab-content.active');
        const allTabContents = employeeModal.querySelectorAll('.custom-tab-content');

        report.employeeFileModalContent = {
          totalTabs: allTabContents.length,
          activeTabIndex: Array.from(allTabContents).findIndex(t => t.classList.contains('active')),
          activeTabInputs: activeTab ? activeTab.querySelectorAll('input:not([type="hidden"])').length : 0,
          activeTabSelects: activeTab ? activeTab.querySelectorAll('select').length : 0,
          activeTabTextareas: activeTab ? activeTab.querySelectorAll('textarea').length : 0,
          activeTabHTML: activeTab ? activeTab.innerHTML.substring(0, 500) : null
        };
      }

      // 3. TODOS los inputs en la página (sin filtro)
      document.querySelectorAll('input:not([type="hidden"])').forEach(i => {
        if (i.offsetParent !== null) {
          report.allInputs.push({
            type: i.type,
            name: i.name,
            id: i.id,
            parentModal: i.closest('[id*="Modal"], [id*="modal"]')?.id || 'none'
          });
        }
      });

      // 4. TODOS los selects visibles
      document.querySelectorAll('select').forEach(s => {
        if (s.offsetParent !== null) {
          report.allSelects.push({
            name: s.name,
            id: s.id,
            parentModal: s.closest('[id*="Modal"], [id*="modal"]')?.id || 'none'
          });
        }
      });

      // 5. TODOS los textareas visibles
      document.querySelectorAll('textarea').forEach(t => {
        if (t.offsetParent !== null) {
          report.allTextareas.push({
            name: t.name,
            id: t.id,
            parentModal: t.closest('[id*="Modal"], [id*="modal"]')?.id || 'none'
          });
        }
      });

      return report;
    });

    console.log('📊 REPORTE COMPLETO:\n');
    console.log(JSON.stringify(domReport, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('📋 RESUMEN');
    console.log('='.repeat(80) + '\n');

    console.log(`Modales visibles: ${domReport.modals.length}`);
    domReport.modals.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.id} (z-index: ${m.zIndex})`);
      console.log(`     Inputs: ${m.totalInputs}, Selects: ${m.totalSelects}, Textareas: ${m.totalTextareas}`);
    });

    console.log(`\nInputs visibles en TODA la página: ${domReport.allInputs.length}`);
    console.log(`Selects visibles en TODA la página: ${domReport.allSelects.length}`);
    console.log(`Textareas visibles en TODA la página: ${domReport.allTextareas.length}`);

    if (domReport.employeeFileModalContent) {
      const efc = domReport.employeeFileModalContent;
      console.log(`\nemployeeFileModal - Tab activo (${efc.activeTabIndex + 1}/${efc.totalTabs}):`);
      console.log(`  Inputs: ${efc.activeTabInputs}`);
      console.log(`  Selects: ${efc.activeTabSelects}`);
      console.log(`  Textareas: ${efc.activeTabTextareas}`);
    }

    console.log('\n⏳ Esperando 10 segundos para inspección manual...');
    await agent.page.waitForTimeout(10000);

    await agent.close();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    try {
      await agent.close();
    } catch (e) {}
    process.exit(1);
  }
}

main().catch(console.error);
