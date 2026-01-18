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
    const result = await agent.discoverAndTestTabs();

    // 4. Mostrar resultados
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTADOS FINALES - CRUD TABS');
    console.log('='.repeat(80));
    console.log(`\n✅ Tabs descubiertos: ${result.tabs?.length || 0}`);
    console.log(`✅ Botones en tabs: ${result.totalButtons || 0}`);
    console.log(`✅ CRUD tests ejecutados: ${result.crudTests || 0}`);

    if (result.tabs) {
      let totalCrudSuccess = 0;
      let totalCrudApplicable = 0; // ⭐ FIX 92: Solo contar operaciones aplicables
      let totalNA = 0;

      result.tabs.forEach((tab, i) => {
        console.log(`\n📑 TAB ${i + 1}: "${tab.name}"`);
        if (tab.crudTests && tab.crudTests.length > 0) {
          const crudTests = tab.crudTests;

          crudTests.forEach(test => {
            const crud = test; // El test ES el crudResult directamente

            // ⭐ FIX 112: Manejar N/A para CREATE, READ, PERSISTENCE (ej: biometric sin cámara)
            const createNA = crud.create?.notApplicable || false;
            const readNA = crud.read?.notApplicable || false;
            const persistNA = crud.persistence?.notApplicable || false;

            const createOk = !createNA && (crud.create?.success || false);
            const readOk = !readNA && (crud.read?.success || false);
            const persistOk = !persistNA && (crud.persistence?.success || false);

            // ⭐ FIX 92: Manejar N/A para UPDATE y DELETE
            const updateNA = crud.update?.notApplicable || false;
            const deleteNA = crud.delete?.notApplicable || false;
            const updateOk = !updateNA && (crud.update?.success || false);
            const deleteOk = !deleteNA && (crud.delete?.success || false);

            // Contar operaciones aplicables (excluyendo N/A)
            // ⭐ FIX 112: También excluir CREATE/READ/PERSIST si son N/A
            const applicableOps = (createNA ? 0 : 1) + (readNA ? 0 : 1) + (persistNA ? 0 : 1) +
                                 (updateNA ? 0 : 1) + (deleteNA ? 0 : 1);
            totalCrudApplicable += applicableOps;
            if (createNA) totalNA++;
            if (readNA) totalNA++;
            if (persistNA) totalNA++;
            if (updateNA) totalNA++;
            if (deleteNA) totalNA++;

            // Contar éxitos
            let successCount = 0;
            if (!createNA && createOk) successCount++;
            if (!readNA && readOk) successCount++;
            if (!persistNA && persistOk) successCount++;
            if (!updateNA && updateOk) successCount++;
            if (!deleteNA && deleteOk) successCount++;
            totalCrudSuccess += successCount;

            // Mostrar resultados con N/A
            // ⭐ FIX 112: Mostrar N/A también para CREATE/READ/PERSISTENCE
            console.log(`   CREATE: ${createNA ? '⏭️ N/A (requiere hardware)' : (createOk ? '✅ PASS' : '❌ FAIL')}`);
            console.log(`   READ: ${readNA ? '⏭️ N/A (requiere hardware)' : (readOk ? '✅ PASS' : '❌ FAIL')}`);
            console.log(`   PERSISTENCE: ${persistNA ? '⏭️ N/A (requiere hardware)' : (persistOk ? '✅ PASS' : '❌ FAIL')}`);
            console.log(`   UPDATE: ${updateNA ? '⏭️ N/A (no existe botón editar)' : (updateOk ? '✅ PASS' : '❌ FAIL')}`);
            console.log(`   DELETE: ${deleteNA ? '⏭️ N/A (no existe botón eliminar)' : (deleteOk ? '✅ PASS' : '❌ FAIL')}`);
          });
        }
      });

      // ⭐ FIX 92: Calcular success rate solo sobre operaciones aplicables
      const successRate = totalCrudApplicable > 0 ? (totalCrudSuccess / totalCrudApplicable * 100) : 0;

      console.log('\n' + '='.repeat(80));
      console.log('🎯 CRUD SUCCESS RATE');
      console.log('='.repeat(80));
      console.log(`Operaciones aplicables: ${totalCrudApplicable}`);
      console.log(`Operaciones N/A (excluidas): ${totalNA}`);
      console.log(`Total CRUD exitosas: ${totalCrudSuccess}/${totalCrudApplicable}`);
      console.log(`Success rate: ${successRate.toFixed(1)}%`);
      console.log(`Status: ${successRate >= 80 ? '✅ PASS' : '❌ FAIL'}`);
    }

    // 5. Cleanup
    await agent.close();

  } catch (error) {
    console.error('\n❌ Error en test:', error.message);
    console.error(error.stack);

    try {
      await agent.close();
    } catch (cleanupError) {
      // Ignorar errores de cleanup
    }

    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
