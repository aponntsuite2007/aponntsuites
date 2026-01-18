/**
 * TEST FIX 73: Validar selector .active para encontrar botones del tab correcto
 *
 * ROOT CAUSE identificado por FIX 71:
 * - Selector anterior encontraba botones de TAB 1 (Administración) en vez de TAB 2 (Datos Personales)
 *
 * FIX 73:
 * - Cambiar de :not([style*="display: none"]) a .active
 * - Buscar: #employeeFileModal .file-tab-content.active button
 *
 * EXPECTED RESULT:
 * - Debe encontrar botones de TAB 2: "+ Agregar" (educación, familia, etc.)
 * - NO debe encontrar botones de TAB 1: "✏️ Cambiar Rol", "🔒 Desactivar", etc.
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');

async function main() {
  console.log('\n🔍 TEST FIX 73: Selector .active para tab correcto\n');

  const agent = new AutonomousQAAgent({
    headless: false,
    timeout: 60000
  });

  try {
    console.log('📦 Inicializando agent...\n');
    await agent.init();

    console.log('🔐 Haciendo login...\n');
    await agent.login({
      empresa: 'isi',
      usuario: 'admin',
      password: 'admin123'
    });
    console.log('✅ Login completado\n');

    console.log('🧭 Navegando a módulo users...\n');
    await agent.navigateToModule('users');
    console.log('✅ En módulo users\n');

    // ✅ FIX 63: Buscar botón "Ver Usuario" con 3 estrategias
    console.log('⭐ [USERS] Buscando botón "Ver Usuario" (icono de ojo) en tabla...');
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
      // Fallback: Abrir programáticamente
      console.log('   ⚠️  No se encontró botón "Ver Usuario", abriendo modal programáticamente...');
      const firstRow = await agent.page.evaluate(() => {
        const firstRow = document.querySelector('.users-table tbody tr');
        if (firstRow) {
          const userId = firstRow.getAttribute('data-user-id');
          if (window.viewUser && userId) {
            window.viewUser(userId);
            return { userId, opened: true };
          }
        }
        return { opened: false };
      });

      if (!firstRow.opened) {
        throw new Error('❌ NO se pudo abrir employeeFileModal');
      }
    } else {
      console.log(`   ✅ Botón encontrado y clickeado (método: ${buttonFound.method})`);
    }

    console.log('   ⏳ Esperando a que se abra employeeFileModal...');
    await agent.page.waitForSelector('#employeeFileModal', { timeout: 5000 });

    // Verificar que modal está abierto y visible
    const modalState = await agent.page.evaluate(() => {
      const modal = document.getElementById('employeeFileModal');
      if (!modal) return { exists: false };

      const style = window.getComputedStyle(modal);
      return {
        exists: true,
        display: style.display,
        visibility: style.visibility,
        zIndex: style.zIndex
      };
    });

    console.log('   📊 Estado del modal:', JSON.stringify(modalState));

    if (!modalState.exists || modalState.display === 'none') {
      throw new Error('❌ employeeFileModal NO está visible');
    }

    console.log('   ✅ employeeFileModal abierto correctamente\n');

    // Esperar a que tabs se rendericen
    await agent.page.waitForTimeout(1000);

    console.log('📊 [FIX 72] Verificando estado de TODOS los tabs...\n');

    const tabsState = await agent.page.evaluate(() => {
      const allTabs = document.querySelectorAll('#employeeFileModal .file-tab-content');
      return Array.from(allTabs).map(tab => ({
        id: tab.id,
        display: window.getComputedStyle(tab).display,
        hasActive: tab.classList.contains('active'),
        styleAttr: tab.getAttribute('style'),
        classList: Array.from(tab.classList)
      }));
    });

    console.log('   Tabs encontrados:');
    tabsState.forEach(tab => {
      const indicator = tab.hasActive ? '✅ ACTIVE' : '❌';
      console.log(`   ${indicator} ${tab.id}: display=${tab.display}, classes=[${tab.classList.join(', ')}]`);
    });

    // Identificar tab activo
    const activeTab = tabsState.find(t => t.hasActive);
    if (!activeTab) {
      console.log('   ⚠️  NO se encontró tab con clase .active');
    } else {
      console.log(`   🎯 Tab activo: ${activeTab.id}\n`);
    }

    console.log('🔍 [FIX 73] Buscando botones con SELECTOR ANTERIOR (:not([style*="display: none"]))...\n');

    const oldSelectorResults = await agent.page.evaluate(() => {
      const buttons = document.querySelectorAll('#employeeFileModal .file-tab-content:not([style*="display: none"]) button');
      return Array.from(buttons).slice(0, 20).map(btn => ({
        text: btn.textContent?.trim(),
        onclick: btn.getAttribute('onclick'),
        parentTabId: btn.closest('.file-tab-content')?.id
      }));
    });

    console.log(`   Botones encontrados (primeros 20): ${oldSelectorResults.length}`);
    oldSelectorResults.forEach((btn, i) => {
      console.log(`   ${i + 1}. "${btn.text}" (tab: ${btn.parentTabId}) → ${btn.onclick || 'sin onclick'}`);
    });

    console.log('\n🎯 [FIX 73] Buscando botones con SELECTOR NUEVO (.active)...\n');

    const newSelectorResults = await agent.page.evaluate(() => {
      const buttons = document.querySelectorAll('#employeeFileModal .file-tab-content.active button');
      return Array.from(buttons).map(btn => ({
        text: btn.textContent?.trim(),
        onclick: btn.getAttribute('onclick'),
        parentTabId: btn.closest('.file-tab-content')?.id,
        hasPlus: btn.textContent?.includes('+')
      }));
    });

    console.log(`   Botones encontrados: ${newSelectorResults.length}`);
    newSelectorResults.forEach((btn, i) => {
      const plusIndicator = btn.hasPlus ? '➕' : '  ';
      console.log(`   ${plusIndicator} ${i + 1}. "${btn.text}" (tab: ${btn.parentTabId}) → ${btn.onclick || 'sin onclick'}`);
    });

    // Contar botones CRUD (con +)
    const crudButtons = newSelectorResults.filter(b => b.hasPlus);
    console.log(`\n   📊 Botones CRUD (con "+"): ${crudButtons.length}`);
    crudButtons.forEach(btn => {
      console.log(`      ✅ "${btn.text}" → ${btn.onclick}`);
    });

    console.log('\n📊 RESULTADOS FINALES:\n');

    console.log(`   SELECTOR ANTERIOR (:not([style*="display: none"])): ${oldSelectorResults.length} botones`);
    console.log(`   SELECTOR NUEVO (.active): ${newSelectorResults.length} botones`);
    console.log(`   Botones CRUD encontrados: ${crudButtons.length}`);

    if (crudButtons.length > 0) {
      console.log('\n   ✅ FIX 73 EXITOSO - Se encontraron botones CRUD en el tab activo');
      console.log('   ✅ Los botones "+ Agregar" ahora están disponibles para testing\n');
    } else {
      console.log('\n   ❌ FIX 73 FALLÓ - NO se encontraron botones CRUD');
      console.log('   ⚠️  Posible causa: Tab activo no es el correcto o clase .active no está presente\n');
    }

    // Captura de pantalla
    await agent.page.screenshot({ path: 'debug-fix73-active-tab.png', fullPage: true });
    console.log('   📸 Screenshot guardado: debug-fix73-active-tab.png\n');

  } catch (error) {
    console.error('❌ Error en test:', error.message);
    await agent.page.screenshot({ path: 'debug-fix73-error.png', fullPage: true });
  } finally {
    console.log('🧹 Limpiando...\n');
    await agent.cleanup();
  }
}

main().catch(console.error);
