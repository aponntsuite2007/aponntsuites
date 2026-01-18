/**
 * TEST FIX 74: Validar que showFileTab() activa tabs correctamente
 *
 * ROOT CAUSE (FIX 73 descubrió):
 * - Modal abre con admin-tab activo
 * - .click() en tab button NO activa el tab content (no agrega clase .active)
 *
 * FIX 74:
 * - Ejecutar showFileTab(tabName) después del click
 * - Esto asegura que el .file-tab-content reciba clase .active
 *
 * EXPECTED RESULT:
 * - TAB 2 (personal-tab) debe tener clase .active después de clickear
 * - Botones "+ Agregar" deben aparecer en TAB 2
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');

async function main() {
  console.log('\n🔍 TEST FIX 74: showFileTab() activation\n');

  const agent = new AutonomousQAAgent({
    headless: false,
    timeout: 60000
  });

  try {
    await agent.init();
    await agent.login({
      empresa: 'isi',
      usuario: 'admin',
      password: 'admin123'
    });

    await agent.navigateToModule('users');
    console.log('\n⭐ Abriendo employeeFileModal...\n');

    // Abrir modal
    const opened = await agent.page.evaluate(() => {
      const viewBtn = document.querySelector('button.users-action-btn.view');
      if (viewBtn) {
        viewBtn.click();
        return true;
      }
      return false;
    });

    if (!opened) {
      throw new Error('No se pudo abrir modal');
    }

    await agent.page.waitForTimeout(2000);

    console.log('📊 Estado INICIAL (modal recién abierto):\n');

    const initialState = await agent.page.evaluate(() => {
      const allTabs = document.querySelectorAll('#employeeFileModal .file-tab-content');
      return Array.from(allTabs).map(tab => ({
        id: tab.id,
        hasActive: tab.classList.contains('active'),
        display: window.getComputedStyle(tab).display
      }));
    });

    initialState.forEach(tab => {
      const icon = tab.hasActive ? '✅' : '❌';
      console.log(`   ${icon} ${tab.id}: active=${tab.hasActive}, display=${tab.display}`);
    });

    const initialActive = initialState.find(t => t.hasActive);
    console.log(`\n   🎯 Tab activo inicial: ${initialActive?.id || 'NINGUNO'}\n`);

    // FIX 74: Ejecutar showFileTab('personal') para activar TAB 2
    console.log('⚡ [FIX 74] Ejecutando showFileTab(\'personal\')...\n');

    const activated = await agent.page.evaluate(() => {
      if (typeof window.showFileTab === 'function') {
        const personalTab = document.querySelector('.file-tab[onclick*="personal"]');
        window.showFileTab('personal', personalTab);
        return { success: true };
      }
      return { success: false, reason: 'function-not-found' };
    });

    if (!activated.success) {
      console.log(`   ❌ showFileTab() no disponible: ${activated.reason}\n`);
      throw new Error('showFileTab() not found');
    }

    console.log('   ✅ showFileTab() ejecutado\n');
    await agent.page.waitForTimeout(1000);

    console.log('📊 Estado DESPUÉS de FIX 74:\n');

    const afterState = await agent.page.evaluate(() => {
      const allTabs = document.querySelectorAll('#employeeFileModal .file-tab-content');
      return Array.from(allTabs).map(tab => ({
        id: tab.id,
        hasActive: tab.classList.contains('active'),
        display: window.getComputedStyle(tab).display
      }));
    });

    afterState.forEach(tab => {
      const icon = tab.hasActive ? '✅' : '❌';
      console.log(`   ${icon} ${tab.id}: active=${tab.hasActive}, display=${tab.display}`);
    });

    const afterActive = afterState.find(t => t.hasActive);
    console.log(`\n   🎯 Tab activo después: ${afterActive?.id || 'NINGUNO'}\n`);

    // Buscar botones en el tab activo
    console.log('🔍 Buscando botones en tab activo (.active)...\n');

    const buttonsInActive = await agent.page.evaluate(() => {
      const activeTab = document.querySelector('#employeeFileModal .file-tab-content.active');
      if (!activeTab) return [];

      const buttons = activeTab.querySelectorAll('button');
      return Array.from(buttons).slice(0, 20).map(btn => ({
        text: btn.textContent?.trim(),
        onclick: btn.getAttribute('onclick'),
        hasPlus: btn.textContent?.includes('+')
      }));
    });

    console.log(`   Total botones en tab activo: ${buttonsInActive.length}`);
    buttonsInActive.forEach((btn, i) => {
      const plusIcon = btn.hasPlus ? '➕' : '  ';
      console.log(`   ${plusIcon} ${i + 1}. "${btn.text}" → ${btn.onclick || 'sin onclick'}`);
    });

    const crudButtons = buttonsInActive.filter(b => b.hasPlus);
    console.log(`\n   📊 Botones CRUD (con "+"): ${crudButtons.length}\n`);

    console.log('📊 RESULTADO FINAL:\n');

    const success = afterActive?.id === 'personal-tab' && crudButtons.length > 0;

    if (success) {
      console.log('   ✅ FIX 74 EXITOSO');
      console.log('   ✅ personal-tab tiene clase .active');
      console.log(`   ✅ Se encontraron ${crudButtons.length} botones CRUD\n`);
    } else {
      console.log('   ❌ FIX 74 FALLÓ');
      if (afterActive?.id !== 'personal-tab') {
        console.log(`   ❌ Tab activo es ${afterActive?.id} en vez de personal-tab`);
      }
      if (crudButtons.length === 0) {
        console.log('   ❌ No se encontraron botones CRUD\n');
      }
    }

    await agent.page.screenshot({ path: 'debug-fix74-showtab.png', fullPage: true });
    console.log('   📸 Screenshot: debug-fix74-showtab.png\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await agent.page.screenshot({ path: 'debug-fix74-error.png' });
  } finally {
    await agent.close();
  }
}

main().catch(console.error);
