const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function verifyTables() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
  });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // 1. Verificar estructura de e2e_advanced_executions
    console.log('📋 Estructura de e2e_advanced_executions:');
    const structureResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'e2e_advanced_executions'
      ORDER BY ordinal_position
    `);
    console.table(structureResult.rows.slice(0, 10));

    // 2. Test: Insertar un registro de prueba
    console.log('\n🧪 Insertando registro de prueba...');
    const testExecutionId = uuidv4();

    const insertResult = await client.query(`
      INSERT INTO e2e_advanced_executions (
        execution_id,
        status,
        mode,
        phases_executed,
        modules_tested,
        total_tests,
        tests_passed,
        tests_failed,
        overall_score,
        production_ready
      ) VALUES (
        $1, 'passed', 'full',
        '["e2e"]'::jsonb,
        '["users"]'::jsonb,
        10, 10, 0, 98.50, true
      ) RETURNING *
    `, [testExecutionId]);

    console.log('✅ Registro insertado:');
    console.log('   execution_id:', insertResult.rows[0].execution_id);
    console.log('   status:', insertResult.rows[0].status);
    console.log('   overall_score:', insertResult.rows[0].overall_score);
    console.log('   production_ready:', insertResult.rows[0].production_ready);

    // 3. Test: Insertar resultado detallado
    console.log('\n🧪 Insertando resultado detallado...');
    await client.query(`
      INSERT INTO e2e_test_results_detailed (
        execution_id,
        phase_name,
        module_name,
        status,
        tests_passed,
        tests_failed,
        duration,
        metrics
      ) VALUES (
        $1, 'e2e', 'users', 'passed', 10, 0, 5000,
        '{"confidence": 98.5}'::jsonb
      )
    `, [testExecutionId]);
    console.log('✅ Resultado detallado insertado');

    // 4. Test: Insertar confidence score
    console.log('\n🧪 Insertando confidence score...');
    await client.query(`
      INSERT INTO e2e_confidence_scores (
        execution_id,
        overall_score,
        e2e_score,
        production_ready,
        confidence_level,
        blockers,
        calculation_breakdown
      ) VALUES (
        $1, 98.50, 98.50, true, 'production',
        '[]'::jsonb,
        '{"e2e": 98.5, "weight": 0.25}'::jsonb
      )
    `, [testExecutionId]);
    console.log('✅ Confidence score insertado');

    // 5. Test: Query con JOIN
    console.log('\n🔍 Consultando datos con JOIN...');
    const joinResult = await client.query(`
      SELECT
        e.execution_id,
        e.status,
        e.overall_score,
        e.production_ready,
        c.confidence_level,
        COUNT(r.id) as detailed_results_count
      FROM e2e_advanced_executions e
      LEFT JOIN e2e_confidence_scores c ON c.execution_id = e.execution_id
      LEFT JOIN e2e_test_results_detailed r ON r.execution_id = e.execution_id
      WHERE e.execution_id = $1
      GROUP BY e.execution_id, e.status, e.overall_score, e.production_ready, c.confidence_level
    `, [testExecutionId]);

    console.log('✅ Query JOIN exitoso:');
    console.table(joinResult.rows);

    // 6. Test: Ejecutar función helper
    console.log('\n🔧 Probando función get_e2e_execution_summary...');
    const functionResult = await client.query(`
      SELECT * FROM get_e2e_execution_summary($1)
    `, [testExecutionId]);

    if (functionResult.rows.length > 0) {
      console.log('✅ Función ejecutada correctamente:');
      console.table(functionResult.rows);
    }

    // 7. Limpiar datos de prueba
    console.log('\n🧹 Limpiando datos de prueba...');
    await client.query('DELETE FROM e2e_advanced_executions WHERE execution_id = $1', [testExecutionId]);
    console.log('✅ Datos de prueba eliminados');

    console.log('\n🎉 VERIFICACIÓN COMPLETA - Todas las tablas funcionan correctamente\n');

  } catch (error) {
    console.error('\n❌ Error durante verificación:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
    console.log('👋 Desconectado de PostgreSQL');
  }
}

verifyTables();
