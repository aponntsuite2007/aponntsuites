/**
 * 🚀 EJECUTAR MIGRACIÓN: ANÁLISIS EMOCIONAL PROFESIONAL
 * ===================================================
 * Script para crear tablas del sistema profesional
 */

const { createEmotionalAnalysisTables } = require('./src/migrations/create-emotional-analysis-tables');

console.log('🚀 ========================================');
console.log('🚀 EJECUTANDO MIGRACIÓN PROFESIONAL');
console.log('🚀 Sistema de Análisis Emocional Real');
console.log('🚀 ========================================');
console.log('');

createEmotionalAnalysisTables()
  .then((result) => {
    console.log('');
    console.log('✅ ========================================');
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('✅ ========================================');
    console.log('');
    console.log(`📊 Tablas creadas: ${result.tablesCreated}`);
    console.log(`🔍 Vistas creadas: ${result.viewsCreated}`);
    console.log(`⚡ Índices creados: ${result.indexesCreated}`);
    console.log(`🔧 Funciones creadas: ${result.functionsCreated}`);
    console.log('');
    console.log('🎯 PRÓXIMOS PASOS:');
    console.log('   1. Reiniciar servidor backend');
    console.log('   2. Probar endpoint /api/v1/emotional-analysis/test');
    console.log('   3. Verificar consentimientos funcionan');
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ ========================================');
    console.error('❌ ERROR EN MIGRACIÓN');
    console.error('❌ ========================================');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('💡 SOLUCIÓN:');
    console.error('   1. Verificar que DATABASE_URL esté configurado');
    console.error('   2. Verificar conexión a PostgreSQL');
    console.error('   3. Revisar logs arriba para detalles');
    console.error('');
    process.exit(1);
  });
