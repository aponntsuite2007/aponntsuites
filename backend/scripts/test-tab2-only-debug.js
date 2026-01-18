/**
 * Test enfocado en CRUD de tabs del employeeFileModal
 * Solo testea los 10 tabs, sin otros botones
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');

async function main() {
  console.log('\n🔍 TEST CRUD TABS ONLY - employeeFileModal\n');

  const agent = new AutonomousQAAgent({
    headless: true,
    timeout: 60000,
    learningMode: false,
    brainIntegration: false
  });

  try {
    // 1. Inicializar y login
    console.log('📦 Inicializando agent...\n');
    await agent.init();

    console.log('🔐 Haciendo login...\n');
    await agent.login({
      empresa: 'isi',
      usuario: 'admin',
      password: 'admin123'
    });

    console.log('✅ Login completado\n');

    // 2. Navegar a users
    console.log('🧭 Navegando a módulo users...\n');
    await agent.navigateToModule('users');
    console.log('✅ En módulo users\n');

    // 3. Testing SOLO de tabs
    console.log('🔬 Testing tabs del módulo...\n');

    // Abrir employeeFileModal
    console.log('⭐ [USERS] Buscando botón "Ver Usuario" (icono de ojo) en tabla...');

    // ✅ FIX 63: El botón es un ICONO (fas fa-eye), NO tiene texto
    // Buscar por clase "users-action-btn view" o por onclick que contenga viewUser()
    const buttonFound = await agent.page.evaluate(() => {
      // Estrategia 1: Buscar por clase users-action-btn view
      const viewBtn = document.querySelector('button.users-action-btn.view');
      if (viewBtn) {
        viewBtn.click();
        return { success: true, method: 'class-selector' };
      }

      // Estrategia 2: Buscar por onclick que contenga viewUser
      const buttons = Array.from(document.querySelectorAll('button'));
      const verUsuarioBtn = buttons.find(btn =>
        btn.getAttribute('onclick')?.includes('viewUser')
      );

      if (verUsuarioBtn) {
        verUsuarioBtn.click();
        return { success: true, method: 'onclick-viewUser' };
      }

      // Estrategia 3: Buscar icono de ojo (fas fa-eye)
      const eyeIcon = document.querySelector('button i.fa-eye');
      if (eyeIcon && eyeIcon.closest('button')) {
        eyeIcon.closest('button').click();
        return { success: true, method: 'eye-icon' };
      }

      return { success: false };
    });

    if (!buttonFound.success) {
      console.log('   ❌ Botón "Ver Usuario" (icono de ojo) no encontrado');
      console.log('   💡 Intentando abrir modal directamente...');

      // Fallback: intentar abrir modal programáticamente
      const modalOpened = await agent.page.evaluate(() => {
        if (typeof viewUser === 'function') {
          // ✅ FIX 63: La tabla es .users-table (clase), NO #usersTable (id)
          const firstRow = document.querySelector('.users-table tbody tr');
          if (firstRow) {
            // El onclick del botón tiene el userId: onclick="viewUser('user-id-aqui')"
            const viewButton = firstRow.querySelector('button[onclick*="viewUser"]');
            if (viewButton) {
              const onclickAttr = viewButton.getAttribute('onclick');
              const userIdMatch = onclickAttr.match(/viewUser\('([^']+)'\)/);
              if (userIdMatch) {
                const userId = userIdMatch[1];
                viewUser(userId);
                return true;
              }
            }
          }
        }
        return false;
      });

      if (!modalOpened) {
        console.log('   ❌ No se pudo abrir employeeFileModal');
        return;
      }
    }

    console.log(`   ✅ Botón encontrado y clickeado (método: ${buttonFound.method || 'programático'})`);
    console.log('   ⏳ Esperando a que se abra employeeFileModal...');

    await agent.page.waitForTimeout(2000);

    const modalOpen = await agent.page.$('#employeeFileModal');
    if (!modalOpen) {
      console.log('   ❌ employeeFileModal no se abrió');
      return;
    }

    console.log('   ✅ employeeFileModal abierto correctamente');
    console.log('   🔍 Descubriendo tabs en employeeFileModal...\n');

    // Descubrir y testear tabs

    // SOLO TAB 2 para debug
    const tabs = await agent.page.evaluate(() => {
      const modal = document.getElementById('employeeFileModal');
      if (\!modal) return [];
      
      const tabButtons = Array.from(modal.querySelectorAll('.custom-file-tab'));
      return tabButtons.map((t, i) => ({
        name: t.textContent.trim(),
        index: i
      }));
    });
    
    if (tabs.length >= 2) {
      console.log('Activando TAB 2...');
      await agent.page.evaluate((idx) => {
        const tabButtons = document.querySelectorAll('.custom-file-tab');
        if (tabButtons[idx]) tabButtons[idx].click();
      }, 1);
      
      await agent.page.waitForTimeout(1000);
      
      // Test solo TAB 2
      const tabResult = await agent.testTabContent(tabs[1].name, 1);
      console.log('\nResultado TAB 2:', JSON.stringify(tabResult, null, 2));
    }
    
    await agent.close();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await agent.close();
  }
}

main().catch(console.error);

