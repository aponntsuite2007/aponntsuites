/**
 * Ver VISUALMENTE qué hay en el modal después de clickear
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');

async function main() {
  console.log('\n🔍 DEBUG VISUAL: Ver qué aparece en los modales\n');

  const agent = new AutonomousQAAgent({
    headless: false, // ⭐ VISIBLE para ver qué pasa
    timeout: 60000,
    learningMode: false,
    brainIntegration: false
  });

  try {
    await agent.init();
    await agent.login({ empresa: 'isi', usuario: 'admin', password: 'admin123' });
    await agent.navigateToModule('users');

    // Abrir employeeFileModal
    await agent.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const verUsuarioBtn = buttons.find(btn => btn.textContent.includes('Ver Usuario'));
      if (verUsuarioBtn) verUsuarioBtn.click();
    });

    await agent.page.waitForTimeout(2000);

    // Activar TAB 2
    await agent.page.evaluate(() => {
      const tabs = document.querySelectorAll('.custom-file-tab');
      if (tabs[1]) tabs[1].click();
    });

    await agent.page.waitForTimeout(1000);

    // Click en "+ Agregar"
    console.log('⭐ Haciendo click en "+ Agregar"...\n');
    await agent.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const agregarBtn = buttons.find(btn =>
        btn.textContent.trim() === '+ Agregar' && btn.offsetParent !== null
      );
      if (agregarBtn) {
        console.log('Clickeando:', agregarBtn.textContent);
        agregarBtn.click();
      }
    });

    await agent.page.waitForTimeout(2000);

    // INSPECCIÓN EXHAUSTIVA
    const domReport = await agent.page.evaluate(() => {
      const report = {
        allVisibleElements: [],
        contentEditables: [],
        customInputs: [],
        clickableElements: []
      };

      // 1. TODOS los elementos visibles con contenteditable
      document.querySelectorAll('[contenteditable]').forEach(el => {
        if (el.offsetParent !== null) {
          report.contentEditables.push({
            tag: el.tagName,
            id: el.id,
            class: el.className,
            text: el.textContent.substring(0, 50)
          });
        }
      });

      // 2. TODOS los elementos con data-* que puedan ser inputs custom
      document.querySelectorAll('[data-field], [data-input], [data-value]').forEach(el => {
        if (el.offsetParent !== null) {
          report.customInputs.push({
            tag: el.tagName,
            id: el.id,
            class: el.className,
            dataset: Object.keys(el.dataset).join(', ')
          });
        }
      });

      // 3. Divs/spans que parezcan inputs (por clase)
      const inputLikeClasses = ['form-control', 'input', 'field', 'editable', 'picker', 'selector'];
      inputLikeClasses.forEach(cls => {
        document.querySelectorAll(`div.${cls}, span.${cls}`).forEach(el => {
          if (el.offsetParent !== null && !el.querySelector('input, select, textarea')) {
            report.clickableElements.push({
              tag: el.tagName,
              id: el.id,
              class: el.className,
              text: el.textContent.substring(0, 30)
            });
          }
        });
      });

      // 4. TODOS los elementos en el modal topmost
      const modals = Array.from(document.querySelectorAll('[id*="Modal"], [id*="modal"]'))
        .filter(m => window.getComputedStyle(m).display !== 'none')
        .sort((a, b) => {
          const zA = parseInt(window.getComputedStyle(a).zIndex) || 0;
          const zB = parseInt(window.getComputedStyle(b).zIndex) || 0;
          return zB - zA;
        });

      if (modals[0]) {
        const topModal = modals[0];
        const allElements = topModal.querySelectorAll('*');

        allElements.forEach(el => {
          if (el.offsetParent !== null && el.children.length === 0) {
            const style = window.getComputedStyle(el);
            if (style.cursor === 'pointer' || style.cursor === 'text') {
              report.allVisibleElements.push({
                tag: el.tagName,
                id: el.id,
                class: el.className,
                cursor: style.cursor,
                text: el.textContent.substring(0, 30)
              });
            }
          }
        });
      }

      return report;
    });

    console.log('\n📊 REPORTE DOM EXHAUSTIVO:\n');
    console.log('ContentEditables:', domReport.contentEditables.length);
    console.log(JSON.stringify(domReport.contentEditables, null, 2));

    console.log('\nCustom Inputs:', domReport.customInputs.length);
    console.log(JSON.stringify(domReport.customInputs, null, 2));

    console.log('\nClickable Elements:', domReport.clickableElements.length);
    console.log(JSON.stringify(domReport.clickableElements.slice(0, 10), null, 2));

    console.log('\nAll Visible (cursor: pointer/text):', domReport.allVisibleElements.length);
    console.log(JSON.stringify(domReport.allVisibleElements.slice(0, 20), null, 2));

    console.log('\n⏳ Esperando 30 segundos para inspección manual...');
    console.log('💡 MIRA el navegador y dime qué ves después del click\n');
    await agent.page.waitForTimeout(30000);

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
