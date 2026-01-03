#!/usr/bin/env node

/**
 * SYNAPSE INTELLIGENT - CLI
 *
 * Ejecuta SYNAPSE con Discovery + Config Auto-Gen + Deadend Detection
 *
 * Uso:
 * - node scripts/synapse-intelligent.js                    // Todos los módulos
 * - node scripts/synapse-intelligent.js users              // Un módulo
 * - node scripts/synapse-intelligent.js users attendance   // Varios módulos
 * - npm run synapse:intelligent                            // Todos (alias)
 * - npm run synapse:test users                             // Un módulo (alias)
 */

const SynapseOrchestrator = require('../src/synapse/SynapseOrchestrator');

async function main() {
  const args = process.argv.slice(2);

  console.log('🤖 SYNAPSE INTELLIGENT MODE\n');

  const orchestrator = new SynapseOrchestrator({
    maxRetries: 3,
    discoveryTimeout: 300000, // 5 min
    testTimeout: 600000       // 10 min
  });

  if (args.length > 0) {
    console.log(`🎯 Ejecutando módulos específicos: ${args.join(', ')}\n`);
    await orchestrator.run(args);
  } else {
    console.log('🎯 Ejecutando TODOS los módulos desde BD\n');
    await orchestrator.run();
  }

  console.log('\n✅ Ejecución completada');
}

main().catch((error) => {
  console.error('\n❌ Error fatal:', error.message);
  console.error(error.stack);
  process.exit(1);
});
