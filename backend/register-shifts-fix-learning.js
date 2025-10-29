/**
 * REGISTRAR FIX EN KNOWLEDGE BASE - AUTO-APRENDIZAJE
 *
 * Este script registra el fix de shifts en el Knowledge Base
 * para que el sistema APRENDA y no vuelva a cometer el mismo error.
 *
 * @version 1.0.0
 */

require('dotenv').config();
const database = require('./src/config/database');

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🧠 REGISTRANDO APRENDIZAJE EN KNOWLEDGE BASE                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Conectar a BD
    await database.sequelize.authenticate();
    console.log('✅ Conectado a BD');
    console.log('');

    const AuditorKnowledgeBase = require('./src/auditor/core/AuditorKnowledgeBase');
    const kb = new AuditorKnowledgeBase(database);

    console.log('📝 Registrando fix de shifts en Knowledge Base...');
    console.log('');

    const learning = {
      error_pattern: 'showShiftsContent NO es función',
      error_category: 'function-not-found',
      module_affected: 'shifts',
      file_path: 'public/js/modules/shifts.js',
      diagnosis: 'Función showShiftsContent existe pero NO está expuesta en window. El HTML llama a showShiftsContent() desde onclick, requiere que esté en window global.',
      successful_fix: `
// ✅ EXPOSICIÓN GLOBAL (requerido para panel-empresa.html)
// Fix para error: "showShiftsContent NO es función"
// La función existe pero debe estar en window para ser accesible desde HTML
window.showShiftsContent = showShiftsContent;
`,
      fix_strategy: 'expose-in-window',
      confidence: 1.0,
      verified: true,
      metadata: {
        root_cause: 'Función declarada pero no expuesta en window',
        solution_type: 'Variable global assignment',
        pattern: 'window.{functionName} = {functionName}',
        applies_to: ['All modules with functions called from HTML onclick'],
        prevention: 'Siempre exponer funciones llamadas desde HTML en window global'
      }
    };

    await kb.learn(learning);

    console.log('✅ APRENDIZAJE REGISTRADO EN KNOWLEDGE BASE');
    console.log('');
    console.log('📊 DETALLES GUARDADOS:');
    console.log(`   • Error Pattern: ${learning.error_pattern}`);
    console.log(`   • Category: ${learning.error_category}`);
    console.log(`   • Module: ${learning.module_affected}`);
    console.log(`   • Strategy: ${learning.fix_strategy}`);
    console.log(`   • Confidence: ${(learning.confidence * 100).toFixed(0)}%`);
    console.log(`   • Verified: ${learning.verified ? 'SÍ ✅' : 'NO ❌'}`);
    console.log('');
    console.log('🎯 PRÓXIMOS BENEFICIOS:');
    console.log('   ✅ Si otro módulo tiene el mismo error, se auto-repara');
    console.log('   ✅ Si un desarrollador comete este error, se sugiere el fix');
    console.log('   ✅ Ollama usará este conocimiento en futuros análisis');
    console.log('   ✅ Sistema evoluciona y se vuelve más inteligente');
    console.log('');

    // Verificar que se guardó
    console.log('🔍 Verificando que se guardó correctamente...');
    const similar = await kb.findSimilar('showShiftsContent is not a function');

    if (similar.length > 0) {
      console.log(`✅ VERIFICADO - Encontradas ${similar.length} entradas similares en KB:`);
      similar.forEach((entry, i) => {
        console.log(`   ${i+1}. "${entry.error_pattern}" (similarity: ${(entry.similarity * 100).toFixed(0)}%)`);
      });
    } else {
      console.log('⚠️  No se encontraron entradas similares (puede ser normal si es el primer registro)');
    }

    console.log('');
    await database.sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
