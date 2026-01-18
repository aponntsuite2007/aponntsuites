/**
 * Confirmar si employeeFileModal se abre correctamente
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');

async function main() {
  console.log('\n🔬 DIAGNÓSTICO: ¿Se abre employeeFileModal?\n');

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

    console.log('\n📝 VERIFICACIÓN 1: ¿Existe el botón "Ver Usuario"?');

    const verUsuarioBtnExists = await agent.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const verUsuarioBtn = buttons.find(btn =>
        btn.textContent.includes('Ver Usuario') ||
        btn.textContent.includes('ver usuario')
      );

      return verUsuarioBtn ? {
        found: true,
        text: verUsuarioBtn.textContent.trim(),
        visible: verUsuarioBtn.offsetParent !== null
      } : { found: false };
    });

    console.log('Resultado:', JSON.stringify(verUsuarioBtnExists, null, 2));

    if (!verUsuarioBtnExists.found) {
      console.log('\n❌ NO se encontró botón "Ver Usuario"');
      console.log('⚠️  Necesitamos ese botón para abrir employeeFileModal\n');

      // Ver todos los botones disponibles
      const allButtons = await agent.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons
          .filter(btn => btn.offsetParent !== null && btn.textContent.trim().length > 0)
          .map(btn => btn.textContent.trim())
          .slice(0, 20);
      });

      console.log('Botones disponibles:', allButtons);

      // Intentar abrir programáticamente
      console.log('\n🔧 Intentando abrir employeeFileModal programáticamente...');

      const openResult = await agent.page.evaluate(() => {
        // Ver si hay tabla de usuarios
        const firstRow = document.querySelector('#usersTable tbody tr');

        if (!firstRow) {
          return { success: false, reason: 'no-users-table' };
        }

        const userId = firstRow.getAttribute('data-user-id') ||
                      firstRow.cells[0]?.textContent;

        if (!userId) {
          return { success: false, reason: 'no-user-id' };
        }

        // Llamar a viewUser directamente
        if (typeof viewUser === 'function') {
          viewUser(userId);
          return { success: true, userId };
        }

        return { success: false, reason: 'viewUser-not-defined' };
      });

      console.log('Resultado apertura programática:', openResult);

      if (!openResult.success) {
        console.log('\n❌ NO se pudo abrir el modal de ninguna forma');
        await agent.close();
        process.exit(1);
      }
    } else {
      // Hacer click normalmente
      console.log('\n✅ Botón "Ver Usuario" encontrado, haciendo click...');

      await agent.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const verUsuarioBtn = buttons.find(btn => btn.textContent.includes('Ver Usuario'));
        verUsuarioBtn.click();
      });
    }

    console.log('\n⏳ Esperando 3 segundos a que se abra el modal...');
    await agent.page.waitForTimeout(3000);

    console.log('\n📝 VERIFICACIÓN 2: ¿Existe employeeFileModal en el DOM?');

    const modalStatus = await agent.page.evaluate(() => {
      const modal = document.getElementById('employeeFileModal');

      if (!modal) {
        return { found: false };
      }

      const style = window.getComputedStyle(modal);

      return {
        found: true,
        display: style.display,
        visibility: style.visibility,
        zIndex: style.zIndex,
        width: style.width,
        height: style.height,
        hasContent: modal.innerHTML.length > 100
      };
    });

    console.log('Status del modal:', JSON.stringify(modalStatus, null, 2));

    if (!modalStatus.found) {
      console.log('\n❌ employeeFileModal NO existe en el DOM');
      console.log('⚠️  El modal nunca se creó\n');
    } else if (modalStatus.display === 'none' || modalStatus.visibility === 'hidden') {
      console.log('\n⚠️  employeeFileModal existe pero está OCULTO');
      console.log('   display:', modalStatus.display);
      console.log('   visibility:', modalStatus.visibility);
    } else {
      console.log('\n✅ employeeFileModal existe y está VISIBLE');

      // Ahora verificar si hay tabs
      console.log('\n📝 VERIFICACIÓN 3: ¿Hay tabs dentro del modal?');

      const tabsStatus = await agent.page.evaluate(() => {
        const tabs = document.querySelectorAll('.custom-file-tab');

        return {
          total: tabs.length,
          tabs: Array.from(tabs).map((tab, i) => ({
            index: i,
            text: tab.textContent.trim(),
            active: tab.classList.contains('active'),
            visible: tab.offsetParent !== null
          }))
        };
      });

      console.log('Tabs encontrados:', JSON.stringify(tabsStatus, null, 2));

      if (tabsStatus.total === 0) {
        console.log('\n❌ NO hay tabs en el modal');
      } else {
        console.log(`\n✅ ${tabsStatus.total} tabs encontrados`);

        // Activar TAB 2
        console.log('\n📝 VERIFICACIÓN 4: Activando TAB 2...');

        await agent.page.evaluate(() => {
          const tabs = document.querySelectorAll('.custom-file-tab');
          if (tabs[1]) tabs[1].click();
        });

        await agent.page.waitForTimeout(1000);

        // Buscar botones en TAB 2
        console.log('\n📝 VERIFICACIÓN 5: ¿Hay botones en TAB 2?');

        const tab2Buttons = await agent.page.evaluate(() => {
          // Buscar todos los botones dentro de employeeFileModal
          const modal = document.getElementById('employeeFileModal');
          if (!modal) return { found: false };

          const buttons = Array.from(modal.querySelectorAll('button'));
          const visibleButtons = buttons.filter(btn => btn.offsetParent !== null);

          return {
            found: true,
            total: visibleButtons.length,
            buttons: visibleButtons
              .filter(btn => btn.textContent.trim().length > 0 && btn.textContent.trim().length < 50)
              .map(btn => ({
                text: btn.textContent.trim(),
                id: btn.id,
                onclick: btn.getAttribute('onclick')
              }))
          };
        });

        console.log('Botones en TAB 2:', JSON.stringify(tab2Buttons, null, 2));

        const agregarBtn = tab2Buttons.buttons?.find(btn =>
          btn.text.includes('Agregar') && !btn.text.includes('Usuario')
        );

        if (agregarBtn) {
          console.log('\n✅ Botón "+ Agregar" ENCONTRADO:', agregarBtn);
        } else {
          console.log('\n❌ Botón "+ Agregar" NO encontrado');
          console.log('Botones disponibles:', tab2Buttons.buttons?.map(b => b.text));
        }
      }
    }

    console.log('\n⏳ Esperando 30 segundos para inspección visual...');
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
