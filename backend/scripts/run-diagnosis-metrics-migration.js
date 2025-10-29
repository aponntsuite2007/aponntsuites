/**
 * EJECUTAR MIGRACIÓN: Métricas de Diagnóstico
 *
 * Agrega columnas y vistas para tracking de precisión de Ollama/OpenAI
 */

const fs = require('fs');
const path = require('path');
const database = require('../src/config/database');

async function runMigration() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  📊 MIGRACIÓN: Métricas de Diagnóstico                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Leer archivo SQL
    const sqlPath = path.join(__dirname, '..', 'migrations', '20250123_add_audit_diagnosis_metrics.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Ejecutando migración...');
    console.log('');

    // Ejecutar SQL
    await database.sequelize.query(sql);

    console.log('✅ Migración completada exitosamente');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('COLUMNAS AGREGADAS:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  • diagnosis_source (VARCHAR) - Fuente del diagnóstico');
    console.log('  • diagnosis_model (VARCHAR) - Modelo usado');
    console.log('  • diagnosis_level (INTEGER) - Nivel del sistema híbrido');
    console.log('  • diagnosis_confidence (DECIMAL) - Confianza 0.0-1.0');
    console.log('  • diagnosis_specificity (DECIMAL) - Especificidad 0.0-1.0');
    console.log('  • diagnosis_actionable (BOOLEAN) - Si es accionable');
    console.log('  • diagnosis_duration_ms (INTEGER) - Tiempo de análisis');
    console.log('  • diagnosis_timestamp (TIMESTAMP) - Momento del análisis');
    console.log('  • repair_success (BOOLEAN) - Éxito de reparación');
    console.log('  • repair_attempts (INTEGER) - Intentos de reparación');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('VISTAS CREADAS:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  • audit_metrics_by_module - Métricas por módulo');
    console.log('  • audit_metrics_by_source - Comparación Ollama/OpenAI');
    console.log('  • audit_progress_timeline - Timeline últimas 24h');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('FUNCIONES CREADAS:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  • get_diagnosis_precision_stats() - Stats globales');
    console.log('');

    // Probar las vistas
    console.log('🧪 Probando vistas creadas...');
    console.log('');

    const [moduleMetrics] = await database.sequelize.query('SELECT * FROM audit_metrics_by_module LIMIT 5');
    console.log(`✅ audit_metrics_by_module: ${moduleMetrics.length} registros`);

    const [sourceMetrics] = await database.sequelize.query('SELECT * FROM audit_metrics_by_source');
    console.log(`✅ audit_metrics_by_source: ${sourceMetrics.length} registros`);

    const [timeline] = await database.sequelize.query('SELECT * FROM audit_progress_timeline LIMIT 10');
    console.log(`✅ audit_progress_timeline: ${timeline.length} registros`);

    const [stats] = await database.sequelize.query('SELECT * FROM get_diagnosis_precision_stats()');
    console.log(`✅ get_diagnosis_precision_stats(): OK`);
    console.log('');

    if (stats.length > 0 && stats[0].total_diagnoses > 0) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📈 ESTADÍSTICAS ACTUALES:');
      console.log('═══════════════════════════════════════════════════════════');
      const s = stats[0];
      console.log(`  Total diagnósticos: ${s.total_diagnoses}`);
      console.log(`  Ollama local: ${s.ollama_local_count}`);
      console.log(`  Ollama externo: ${s.ollama_external_count}`);
      console.log(`  OpenAI: ${s.openai_count}`);
      console.log(`  Pattern analysis: ${s.pattern_count}`);
      console.log('');
      console.log(`  Confidence promedio:`);
      console.log(`    - Ollama: ${s.avg_ollama_confidence || 'N/A'}`);
      console.log(`    - OpenAI: ${s.avg_openai_confidence || 'N/A'}`);
      console.log(`    - Pattern: ${s.avg_pattern_confidence || 'N/A'}`);
      console.log('');
      console.log(`  Tasa de éxito de reparación:`);
      console.log(`    - Ollama: ${s.ollama_repair_success_rate || 0}%`);
      console.log(`    - OpenAI: ${s.openai_repair_success_rate || 0}%`);
      console.log(`    - Pattern: ${s.pattern_repair_success_rate || 0}%`);
      console.log('');
      console.log(`  💡 Recomendación: ${s.recommendation}`);
      console.log('');
    } else {
      console.log('📊 No hay datos de diagnóstico aún. Ejecuta una auditoría para ver métricas.');
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✨ ¡TODO LISTO!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('Próximos pasos:');
    console.log('  1. Ejecutar auditoría para generar métricas');
    console.log('  2. Ver dashboard con métricas en tiempo real');
    console.log('  3. Comparar rendimiento Ollama vs OpenAI');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ ERROR EN MIGRACIÓN:');
    console.error(error);
    console.error('');
    process.exit(1);
  }
}

runMigration();
