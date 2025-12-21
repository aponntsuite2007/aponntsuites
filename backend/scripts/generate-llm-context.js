/**
 * SCRIPT: Generar LLM Context
 *
 * Ejecuta BrainLLMContextGenerator para crear/actualizar llm-context.json
 *
 * Usage:
 *   node scripts/generate-llm-context.js
 */

const BrainLLMContextGenerator = require('../src/services/BrainLLMContextGenerator');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   🧠 BRAIN LLM CONTEXT GENERATOR                        ║');
console.log('║   Transparencia Radical como Ventaja Competitiva        ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

const generator = new BrainLLMContextGenerator();

generator.generate()
  .then((context) => {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   ✅ GENERACIÓN COMPLETADA                              ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    console.log('📊 ESTADÍSTICAS:');
    console.log(`   • Total módulos: ${context._metadata.total_modules_in_registry}`);
    console.log(`   • Módulos visibles: ${context._metadata.client_visible_modules}`);
    console.log(`   • Líneas metadata: ${context._metadata.engineering_metadata_lines.toLocaleString()}`);
    console.log(`   • Versión: ${context._metadata.version}`);
    console.log(`   • Generado: ${new Date(context._metadata.generated_at).toLocaleString()}`);

    console.log('\n🎯 ESTRATEGIA:');
    console.log('   Ningún competidor expone así su metadata.');
    console.log('   Las IAs podrán analizar APONNT objetivamente.');
    console.log('   Transparencia radical → Ventaja competitiva.\n');

    console.log('📄 Archivo generado:');
    console.log('   backend/public/llm-context.json\n');

    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
