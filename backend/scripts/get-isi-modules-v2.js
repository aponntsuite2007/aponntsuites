/**
 * Obtener módulos EXACTOS de ISI usando AutonomousQAAgent
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');

async function getISIModules() {
  console.log('\n🔍 OBTENIENDO MÓDULOS ASIGNADOS A EMPRESA ISI\n');

  const agent = new AutonomousQAAgent({
    baseURL: 'http://localhost:9998',
    headless: true
  });

  try {
    await agent.init();
    console.log('✅ Agent inicializado\n');

    // Login
    await agent.login({
      empresa: 'isi',
      usuario: 'admin',
      password: 'admin123'
    });
    console.log('✅ Login exitoso\n');

    // Extraer módulos del DOM
    console.log('📊 Extrayendo módulos del panel...\n');

    const modules = await agent.page.evaluate(() => {
      const moduleCards = document.querySelectorAll('[data-module-key]');
      const result = [];

      moduleCards.forEach(card => {
        const key = card.getAttribute('data-module-key');
        const name = card.querySelector('.module-name')?.textContent ||
                     card.getAttribute('data-module-name') ||
                     card.textContent?.trim() ||
                     'Unknown';
        const visible = card.offsetParent !== null;

        if (visible) {
          result.push({
            id: key,
            name: name.trim().substring(0, 50)
          });
        }
      });

      return result;
    });

    console.log(`✅ Módulos encontrados: ${modules.length}\n`);
    console.log('━'.repeat(70));
    console.log('MÓDULOS ASIGNADOS A ISI (visibles en panel):\n');

    modules.forEach((mod, i) => {
      console.log(`${(i+1).toString().padStart(2)}. ${mod.id.padEnd(35)} - ${mod.name}`);
    });

    console.log('━'.repeat(70));

    // Guardar
    const fs = require('fs');
    const path = require('path');

    const moduleIds = modules.map(m => m.id);
    const outputFile = path.join(__dirname, '../isi-assigned-modules.json');

    fs.writeFileSync(outputFile, JSON.stringify(moduleIds, null, 2));
    console.log(`\n💾 Lista guardada: isi-assigned-modules.json`);
    console.log(`\n📊 Total módulos ISI: ${moduleIds.length}\n`);

    await agent.cleanup();
    return moduleIds;

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getISIModules()
  .then(modules => {
    console.log(`✅ Completado - ${modules.length} módulos identificados\n`);
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Error:', err);
    process.exit(1);
  });
