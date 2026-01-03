/**
 * Script para ver la estructura exacta del metadata devuelto por UnifiedKnowledgeService
 */
const database = require('./src/config/database');
const UnifiedKnowledgeService = require('./src/services/UnifiedKnowledgeService');

(async () => {
  try {
    const knowledgeService = new UnifiedKnowledgeService(database);
    await knowledgeService.initialize();

    console.log('\n===== METADATA STRUCTURE FROM KNOWLEDGE SERVICE =====\n');

    const modules = ['departments', 'shifts', 'roles-permissions', 'organizational-structure'];

    for (const moduleKey of modules) {
      const metadata = knowledgeService.getModuleMetadata(moduleKey);
      console.log(`${moduleKey}:`);
      console.log(`  metadata.parent_module_key: ${metadata?.parent_module_key}`);
      console.log(`  metadata.parentModuleKey: ${metadata?.parentModuleKey}`);
      console.log(`  metadata.hideFromDashboard: ${metadata?.hideFromDashboard}`);
      console.log(`  metadata.commercial: ${metadata?.commercial ? 'EXISTS' : 'NOT EXISTS'}`);
      if (metadata?.commercial) {
        console.log(`    commercial.parent_module_key: ${metadata.commercial.parent_module_key}`);
      }
      console.log('  Claves en metadata:', Object.keys(metadata || {}).slice(0, 10).join(', '));
      console.log('');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
