/**
 * Test SIMPLE: Solo verificar si educationModal aparece después del click
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');

async function main() {
  console.log('\n🔬 TEST SIMPLE: Verificar educationModal\n');

  const agent = new AutonomousQAAgent({
    headless: false,
    timeout: 60000,
    learningMode: false,
    brainIntegration: false
  });

  try {
    await agent.init();
    await agent.login({ empresa: 'isi', usuario: 'admin', password: 'admin123' });
    await agent.navigateToModule('users');

    console.log('1️⃣ Abrir employeeFileModal...');
    await agent.page.evaluate(() => {
      const viewBtn = document.querySelector('button.users-action-btn.view');
      if (viewBtn) viewBtn.click();
    });
    await agent.page.waitForTimeout(3000);
    console.log('✅ employeeFileModal abierto\n');

    console.log('2️⃣ Activar TAB 2...');
    await agent.page.evaluate(() => {
      const tabs = document.querySelectorAll('.custom-file-tab');
      if (tabs[1]) tabs[1].click();
    });
    await agent.page.waitForTimeout(1000);
    console.log('✅ TAB 2 activado\n');

    console.log('3️⃣ ANTES del click: Ver modales existentes...\n');
    const modalesAntes = await agent.page.evaluate(() => {
      const allModals = document.querySelectorAll('[id*="modal"], [id*="Modal"]');
      return Array.from(allModals).map(m => ({
        id: m.id,
        visible: m.offsetParent !== null || window.getComputedStyle(m).position === 'fixed',
        display: window.getComputedStyle(m).display,
        zIndex: window.getComputedStyle(m).zIndex
      }));
    });
    console.log('Modales ANTES:', JSON.stringify(modalesAntes, null, 2));

    console.log('\n4️⃣ Buscar botón "+ Agregar" y hacer click...\n');

    // Ejecutar addEducation() directamente
    const clickResult = await agent.page.evaluate(() => {
      // Obtener primer usuario de la tabla
      const firstRow = document.querySelector('.users-table tbody tr');
      if (!firstRow) return { success: false, reason: 'no-table' };

      const viewButton = firstRow.querySelector('button[onclick*="viewUser"]');
      if (!viewButton) return { success: false, reason: 'no-button' };

      const onclickAttr = viewButton.getAttribute('onclick');
      const userIdMatch = onclickAttr.match(/viewUser\('([^']+)'\)/);
      if (!userIdMatch) return { success: false, reason: 'no-userid' };

      const userId = userIdMatch[1];

      // Ejecutar addEducation directamente
      if (typeof addEducation === 'function') {
        addEducation(userId);
        return { success: true, userId };
      }

      return { success: false, reason: 'addEducation-not-found' };
    });

    console.log('Click result:', clickResult);

    if (!clickResult.success) {
      console.log(`❌ No se pudo ejecutar addEducation: ${clickResult.reason}`);
      await agent.close();
      process.exit(1);
    }

    console.log(`✅ addEducation('${clickResult.userId}') ejecutado\n`);

    console.log('⏳ Esperando 5 segundos...\n');
    await agent.page.waitForTimeout(5000);

    console.log('5️⃣ DESPUÉS del click: Ver modales existentes...\n');
    const modalesDespues = await agent.page.evaluate(() => {
      const allModals = document.querySelectorAll('[id*="modal"], [id*="Modal"]');
      return Array.from(allModals).map(m => ({
        id: m.id,
        visible: m.offsetParent !== null || window.getComputedStyle(m).position === 'fixed',
        display: window.getComputedStyle(m).display,
        visibility: window.getComputedStyle(m).visibility,
        zIndex: window.getComputedStyle(m).zIndex,
        position: window.getComputedStyle(m).position
      }));
    });
    console.log('Modales DESPUÉS:', JSON.stringify(modalesDespues, null, 2));

    console.log('\n6️⃣ Buscar específicamente educationModal...\n');
    const educationModal = await agent.page.evaluate(() => {
      const modal = document.getElementById('educationModal');
      if (!modal) return { found: false };

      const style = window.getComputedStyle(modal);
      const inputs = modal.querySelectorAll('input');
      const selects = modal.querySelectorAll('select');
      const textareas = modal.querySelectorAll('textarea');

      return {
        found: true,
        display: style.display,
        visibility: style.visibility,
        zIndex: style.zIndex,
        position: style.position,
        opacity: style.opacity,
        totalInputs: inputs.length,
        totalSelects: selects.length,
        totalTextareas: textareas.length,
        inputsList: Array.from(inputs).map(i => ({ id: i.id, type: i.type, visible: i.offsetParent !== null })),
        selectsList: Array.from(selects).map(s => ({ id: s.id, visible: s.offsetParent !== null }))
      };
    });

    console.log('educationModal:', JSON.stringify(educationModal, null, 2));

    if (educationModal.found) {
      console.log('\n✅ ✅ ✅ educationModal EXISTE y tiene campos:');
      console.log(`   Inputs: ${educationModal.totalInputs}`);
      console.log(`   Selects: ${educationModal.totalSelects}`);
      console.log(`   Textareas: ${educationModal.totalTextareas}`);
    } else {
      console.log('\n❌ educationModal NO se encontró en el DOM');
    }

    console.log('\n⏳ Esperando 20s para inspección manual...');
    await agent.page.waitForTimeout(20000);

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
