const SystemRegistry = require('../src/auditor/registry/SystemRegistry');
const database = require('../src/config/database');

(async () => {
  const registry = new SystemRegistry(database, null);
  await registry.initialize();

  const modules = await registry.listModules();
  console.log('\nMODULOS EN SYSTEMREGISTRY:\n');

  // Buscar modules relacionados con departments u organizational
  const relevant = modules.filter(m =>
    m.id.includes('depart') ||
    m.id.includes('organiz') ||
    m.name.toLowerCase().includes('depart') ||
    m.name.toLowerCase().includes('organiz') ||
    m.name.toLowerCase().includes('estructura')
  );

  console.log('Modulos relevantes (departments/organizational):');
  relevant.forEach(m => {
    console.log(`  - ${m.id} -> ${m.name}`);
  });

  console.log(`\nTotal modulos en registry: ${modules.length}`);
  process.exit(0);
})();
