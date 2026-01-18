/**
 * 🔬 DIAGNÓSTICO FINAL: Ver HTML completo de educationModal
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');
const fs = require('fs');

async function main() {
  console.log('\n🔬 DIAGNÓSTICO: HTML completo de educationModal\n');

  const agent = new AutonomousQAAgent({
    headless: false, // ⭐ VISIBLE para inspección manual
    timeout: 60000,
    learningMode: false,
    brainIntegration: false
  });

  try {
    await agent.init();
    await agent.login({ empresa: 'isi', usuario: 'admin', password: 'admin123' });
    await agent.navigateToModule('users');

    console.log('\n📝 PASO 1: Abrir employeeFileModal...');

    // ✅ FIX 63: Usar class-selector
    const opened = await agent.page.evaluate(() => {
      const viewBtn = document.querySelector('button.users-action-btn.view');
      if (viewBtn) {
        viewBtn.click();
        return true;
      }
      return false;
    });

    if (!opened) {
      console.log('❌ No se pudo abrir employeeFileModal');
      await agent.close();
      process.exit(1);
    }

    await agent.page.waitForTimeout(3000);
    console.log('✅ employeeFileModal abierto\n');

    console.log('📝 PASO 2: Activar TAB 2 (Datos Personales)...');

    await agent.page.evaluate(() => {
      const tabs = document.querySelectorAll('.custom-file-tab');
      if (tabs[1]) tabs[1].click();
    });

    await agent.page.waitForTimeout(1000);
    console.log('✅ TAB 2 activado\n');

    console.log('📝 PASO 3: Buscar y clickear botón "+ Agregar"...');

    // Ver botones disponibles DENTRO del contenido del TAB 2 (no los tabs mismos)
    const buttonsInTab = await agent.page.evaluate(() => {
      const modal = document.getElementById('employeeFileModal');
      if (!modal) return { success: false, reason: 'no-modal' };

      // Buscar el CONTENIDO del tab activo, NO los tabs
      // Los tabs tienen clase "custom-file-tab", el contenido está en otro lado
      const tabContents = modal.querySelectorAll('[id*="tab-content"], .tab-content, [data-tab-content]');

      // Si no hay contenedores específicos, buscar divs que NO sean tabs
      const allButtons = Array.from(modal.querySelectorAll('button'));

      // Excluir botones que sean tabs (tienen clase custom-file-tab o showFileTab en onclick)
      const contentButtons = allButtons.filter(btn =>
        !btn.classList.contains('custom-file-tab') &&
        !btn.getAttribute('onclick')?.includes('showFileTab') &&
        btn.offsetParent !== null
      );

      return {
        success: true,
        totalButtons: allButtons.length,
        tabButtons: allButtons.length - contentButtons.length,
        contentButtons: contentButtons.map(btn => ({
          text: btn.textContent.trim(),
          id: btn.id,
          onclick: btn.getAttribute('onclick'),
          classList: btn.className,
          visible: btn.offsetParent !== null
        }))
      };
    });

    if (!buttonsInTab.success) {
      console.log(`❌ Error obteniendo botones: ${buttonsInTab.reason}`);
      await agent.close();
      process.exit(1);
    }

    console.log(`Total botones: ${buttonsInTab.totalButtons}`);
    console.log(`Botones de tabs: ${buttonsInTab.tabButtons}`);
    console.log(`Botones de contenido: ${buttonsInTab.contentButtons.length}\n`);

    console.log('Botones del CONTENIDO (no tabs):');
    buttonsInTab.contentButtons.slice(0, 15).forEach((btn, i) => {
      console.log(`   ${i + 1}. "${btn.text}" (onclick: ${btn.onclick || 'none'})`);
    });

    // Buscar específicamente "+ Agregar" en Formación Académica
    const agregarBtn = buttonsInTab.contentButtons.find(btn =>
      btn.text.includes('Agregar') &&
      btn.onclick?.includes('addEducation')
    );

    if (!agregarBtn) {
      console.log('\n❌ No se encontró botón "+ Agregar" para Formación Académica');
      console.log('Botones con "Agregar":', buttonsInTab.contentButtons.filter(b => b.text.includes('Agregar')));
      await agent.close();
      process.exit(1);
    }

    console.log(`\n✅ Botón encontrado: "${agregarBtn.text}"`);
    console.log(`   onclick: ${agregarBtn.onclick}\n`);

    // Extraer userId del onclick
    const userIdMatch = agregarBtn.onclick.match(/addEducation\('([^']+)'\)/);
    const userId = userIdMatch ? userIdMatch[1] : null;

    console.log(`👤 userId extraído: ${userId}\n`);

    console.log('📝 PASO 4: Hacer click en botón...');

    await agent.page.evaluate((onclick) => {
      // Ejecutar el onclick directamente
      eval(onclick);
    }, agregarBtn.onclick);

    console.log('✅ Click ejecutado\n');
    console.log('⏳ Esperando 5 segundos a que se renderice el modal...\n');

    await agent.page.waitForTimeout(5000);

    console.log('📝 PASO 5: Inspeccionar educationModal...\n');

    // Inspección COMPLETA del modal
    const modalInspection = await agent.page.evaluate(() => {
      const modal = document.getElementById('educationModal');

      if (!modal) {
        return { found: false, reason: 'modal-not-found' };
      }

      const style = window.getComputedStyle(modal);

      // Buscar TODOS los elementos dentro
      const allElements = modal.querySelectorAll('*');
      const elementTypes = {};

      allElements.forEach(el => {
        const tag = el.tagName.toLowerCase();
        elementTypes[tag] = (elementTypes[tag] || 0) + 1;
      });

      // Buscar inputs específicamente
      const inputs = Array.from(modal.querySelectorAll('input')).map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        value: input.value,
        placeholder: input.placeholder,
        required: input.required,
        visible: input.offsetParent !== null
      }));

      const selects = Array.from(modal.querySelectorAll('select')).map(select => ({
        name: select.name,
        id: select.id,
        options: select.options.length,
        required: select.required,
        visible: select.offsetParent !== null
      }));

      const textareas = Array.from(modal.querySelectorAll('textarea')).map(ta => ({
        name: ta.name,
        id: ta.id,
        required: ta.required,
        visible: ta.offsetParent !== null
      }));

      const buttons = Array.from(modal.querySelectorAll('button')).map(btn => ({
        text: btn.textContent.trim(),
        id: btn.id,
        type: btn.type,
        onclick: btn.getAttribute('onclick')
      }));

      return {
        found: true,
        modalId: modal.id,
        display: style.display,
        visibility: style.visibility,
        zIndex: style.zIndex,
        position: style.position,
        width: style.width,
        height: style.height,
        innerHTML: modal.innerHTML, // HTML completo
        elementTypes,
        inputs,
        selects,
        textareas,
        buttons,
        totalElements: allElements.length
      };
    });

    if (!modalInspection.found) {
      console.log('❌ educationModal NO existe en el DOM');
      console.log(`   Razón: ${modalInspection.reason}`);

      // Ver todos los modales disponibles
      const allModals = await agent.page.evaluate(() => {
        return Array.from(document.querySelectorAll('[id*="modal"], [id*="Modal"]'))
          .map(m => ({
            id: m.id,
            display: window.getComputedStyle(m).display,
            zIndex: window.getComputedStyle(m).zIndex
          }));
      });

      console.log('\n📊 Modales disponibles en el DOM:');
      console.log(JSON.stringify(allModals, null, 2));

    } else {
      console.log('✅ educationModal ENCONTRADO\n');
      console.log('📊 PROPIEDADES DEL MODAL:');
      console.log(`   ID: ${modalInspection.modalId}`);
      console.log(`   Display: ${modalInspection.display}`);
      console.log(`   Visibility: ${modalInspection.visibility}`);
      console.log(`   Z-Index: ${modalInspection.zIndex}`);
      console.log(`   Position: ${modalInspection.position}`);
      console.log(`   Width: ${modalInspection.width}`);
      console.log(`   Height: ${modalInspection.height}`);
      console.log(`   Total elementos: ${modalInspection.totalElements}`);

      console.log('\n📊 TIPOS DE ELEMENTOS:');
      Object.entries(modalInspection.elementTypes).forEach(([tag, count]) => {
        console.log(`   ${tag}: ${count}`);
      });

      console.log('\n📊 INPUTS ENCONTRADOS:');
      console.log(`   Total: ${modalInspection.inputs.length}`);
      modalInspection.inputs.forEach((input, i) => {
        console.log(`   ${i + 1}. type="${input.type}" name="${input.name}" id="${input.id}" visible=${input.visible}`);
      });

      console.log('\n📊 SELECTS ENCONTRADOS:');
      console.log(`   Total: ${modalInspection.selects.length}`);
      modalInspection.selects.forEach((select, i) => {
        console.log(`   ${i + 1}. name="${select.name}" id="${select.id}" options=${select.options} visible=${select.visible}`);
      });

      console.log('\n📊 TEXTAREAS ENCONTRADOS:');
      console.log(`   Total: ${modalInspection.textareas.length}`);

      console.log('\n📊 BOTONES ENCONTRADOS:');
      console.log(`   Total: ${modalInspection.buttons.length}`);
      modalInspection.buttons.forEach((btn, i) => {
        console.log(`   ${i + 1}. "${btn.text}" (type: ${btn.type})`);
      });

      // Guardar HTML completo
      const htmlPath = 'C:/Bio/sistema_asistencia_biometrico/backend/education-modal-full.html';
      fs.writeFileSync(htmlPath, modalInspection.innerHTML, 'utf8');
      console.log(`\n✅ HTML completo guardado en: education-modal-full.html`);
      console.log(`   Tamaño: ${modalInspection.innerHTML.length} caracteres\n`);
    }

    console.log('\n⏳ Esperando 30 segundos para inspección visual...');
    console.log('💡 MIRA el navegador y confirma:\n');
    console.log('   1. ¿Se ve el modal educationModal?');
    console.log('   2. ¿Tiene campos de entrada visibles?');
    console.log('   3. ¿Los campos son inputs tradicionales o custom?');
    console.log('   4. ¿El formulario está realmente ahí?\n');

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
