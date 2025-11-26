/**
 * Script para ejecutar análisis completo de Base de Datos
 * Genera "instructivo precioso" para coordinar 10 sesiones de Claude Code
 */

const DatabaseAnalyzer = require('../src/services/DatabaseAnalyzer');

async function main() {
  console.log('🔍 [DATABASE ANALYSIS] Iniciando...\n');

  try {
    // Ejecutar análisis completo
    const result = await DatabaseAnalyzer.analyzeCompleteSchema();

    console.log('\n📊 Resultado guardado en engineering-metadata.js');
    console.log('\n✅ Ya puedes usar el Engineering Dashboard tab "Base de Datos"');
    console.log('   para ver todos los campos y sus dependencias.\n');

    // Cerrar conexión
    await DatabaseAnalyzer.close();

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    await DatabaseAnalyzer.close();
    process.exit(1);
  }
}

main();
