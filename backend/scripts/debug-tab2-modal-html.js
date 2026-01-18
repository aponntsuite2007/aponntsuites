/**
 * 🔬 DIAGNÓSTICO ULTRA-ESPECÍFICO: Ver HTML completo del modal TAB 2
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');
const fs = require('fs');

async function main() {
  console.log('\n🔬 DIAGNÓSTICO: Modal TAB 2 HTML completo\n');

  const agent = new AutonomousQAAgent({
    headless: false, // ⭐ VISIBLE
    timeout: 60000,
    learningMode: false,
    brainIntegration: false
  });

  try {
    await agent.init();
    await agent.login({ empresa: 'isi', usuario: 'admin', password: 'admin123' });
    await agent.navigateToModule('users');

    console.log('\n📝 PASO 1: Abrir employeeFileModal...');

    await agent.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const verUsuarioBtn = buttons.find(btn => btn.textContent.includes('Ver Usuario'));
      if (verUsuarioBtn) verUsuarioBtn.click();
    });

    await agent.page.waitForTimeout(2000);

    console.log('📝 PASO 2: Activar TAB 2...');

    await agent.page.evaluate(() => {
      const tabs = document.querySelectorAll('.custom-file-tab');
      if (tabs[1]) tabs[1].click();
    });

    await agent.page.waitForTimeout(1000);

    console.log('📝 PASO 3: Ver botones disponibles ANTES del click...\n');

    const botonesAntesClick = await agent.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const visibleButtons = buttons.filter(btn => btn.offsetParent !== null);

      return visibleButtons
        .filter(btn => btn.textContent.trim().length > 0 && btn.textContent.trim().length < 50)
        .map(btn => ({
          text: btn.textContent.trim(),
          id: btn.id,
          onclick: btn.getAttribute('onclick'),
          className: btn.className
        }));
    });

    console.log('Botones ANTES del click:', JSON.stringify(botonesAntesClick, null, 2));
    console.log(`Total: ${botonesAntesClick.length} botones visibles\n`);

    // Encontrar "+ Agregar" específicamente en TAB 2
    const agregarBtnFound = botonesAntesClick.find(btn =>
      btn.text.includes('Agregar') ||
      btn.text.includes('agregar')
    );

    if (agregarBtnFound) {
      console.log('✅ Botón "+ Agregar" encontrado:', agregarBtnFound);
    } else {
      console.log('❌ No se encontró botón "+ Agregar"');
      console.log('Botones que contienen "Agregar":', botonesAntesClick.filter(b =>
        b.text.toLowerCase().includes('agregar')
      ));
    }

    console.log('\n📝 PASO 4: Hacer click en "+ Agregar"...');

    const clickResult = await agent.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const agregarBtn = buttons.find(btn =>
        btn.textContent.trim() === '+ Agregar' && btn.offsetParent !== null
      );

      if (agregarBtn) {
        agregarBtn.click();
        return { success: true, text: agregarBtn.textContent.trim() };
      }
      return { success: false };
    });

    console.log('Click result:', clickResult);

    console.log('\n⏳ Esperando 3 segundos...');
    await agent.page.waitForTimeout(3000);

    console.log('\n📝 PASO 5: Inspección COMPLETA del DOM después del click...\n');

    // 1. Ver todos los modales en el DOM
    const modales = await agent.page.evaluate(() => {
      const allModals = document.querySelectorAll('[id*="modal"], [id*="Modal"]');

      return Array.from(allModals).map(modal => {
        const style = window.getComputedStyle(modal);

        return {
          id: modal.id,
          display: style.display,
          visibility: style.visibility,
          zIndex: style.zIndex,
          position: style.position,
          innerHTML: modal.innerHTML.substring(0, 500) // Primeros 500 chars
        };
      });
    });

    console.log('📊 MODALES EN EL DOM:');
    console.log(JSON.stringify(modales, null, 2));

    // 2. Buscar específicamente "educationModal" (del código users.js)
    const educationModalHTML = await agent.page.evaluate(() => {
      const modal = document.getElementById('educationModal');

      if (!modal) {
        return { found: false };
      }

      const style = window.getComputedStyle(modal);

      return {
        found: true,
        display: style.display,
        visibility: style.visibility,
        zIndex: style.zIndex,
        innerHTML: modal.innerHTML
      };
    });

    console.log('\n📊 EDUCATION MODAL:');
    console.log(JSON.stringify(educationModalHTML, null, 2));

    // 3. Ver TODOS los inputs en la página (sin importar dónde estén)
    const todosLosInputs = await agent.page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      const selects = document.querySelectorAll('select');
      const textareas = document.querySelectorAll('textarea');

      return {
        inputs: Array.from(inputs).map(input => ({
          type: input.type,
          name: input.name,
          id: input.id,
          visible: input.offsetParent !== null,
          parentId: input.parentElement?.id
        })),
        selects: Array.from(selects).map(select => ({
          name: select.name,
          id: select.id,
          visible: select.offsetParent !== null,
          parentId: select.parentElement?.id
        })),
        textareas: Array.from(textareas).map(ta => ({
          name: ta.name,
          id: ta.id,
          visible: ta.offsetParent !== null,
          parentId: ta.parentElement?.id
        }))
      };
    });

    console.log('\n📊 TODOS LOS INPUTS EN LA PÁGINA:');
    console.log('Total inputs:', todosLosInputs.inputs.length);
    console.log('Total selects:', todosLosInputs.selects.length);
    console.log('Total textareas:', todosLosInputs.textareas.length);

    console.log('\nInputs VISIBLES:');
    console.log(JSON.stringify(todosLosInputs.inputs.filter(i => i.visible), null, 2));

    console.log('\nSelects VISIBLES:');
    console.log(JSON.stringify(todosLosInputs.selects.filter(s => s.visible), null, 2));

    // 4. Guardar HTML completo del modal (si existe)
    if (educationModalHTML.found) {
      fs.writeFileSync(
        'C:/Bio/sistema_asistencia_biometrico/backend/education-modal-dump.html',
        educationModalHTML.innerHTML,
        'utf8'
      );
      console.log('\n✅ HTML del modal guardado en: education-modal-dump.html');
    }

    console.log('\n⏳ Esperando 30 segundos para inspección manual...');
    console.log('💡 MIRA el navegador y revisa:\n');
    console.log('   1. ¿Se abrió el modal visualmente?');
    console.log('   2. ¿Tiene campos de entrada?');
    console.log('   3. ¿Qué ID tiene el modal?');
    console.log('   4. ¿Los campos están visibles?\n');

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
