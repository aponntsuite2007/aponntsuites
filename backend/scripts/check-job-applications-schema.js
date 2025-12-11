/**
 * Script para verificar el schema de la tabla job_applications
 */

const { sequelize } = require('../src/config/database');

async function checkSchema() {
  try {
    console.log('🔍 Verificando schema de job_applications...\n');

    const [results] = await sequelize.query(`
      SELECT
        column_name,
        data_type,
        character_maximum_length,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'job_applications'
        AND column_name IN (
          'reviewed_by',
          'interviewer_id',
          'admin_approved_by',
          'medical_approved_by',
          'hired_by',
          'rejected_by',
          'employee_user_id',
          'referrer_employee_id'
        )
      ORDER BY ordinal_position;
    `);

    if (results.length === 0) {
      console.log('❌ Tabla job_applications NO existe o no tiene las columnas esperadas');
      return;
    }

    console.log('📋 Columnas relacionadas con users:\n');
    results.forEach(row => {
      const status = row.data_type === 'uuid' ? '✅' : '❌';
      console.log(`${status} ${row.column_name.padEnd(25)} → ${row.data_type.toUpperCase()}`);
    });

    console.log('\n');

    // Verificar si alguna es INTEGER
    const integerColumns = results.filter(r => r.data_type === 'integer');
    if (integerColumns.length > 0) {
      console.log('⚠️  PROBLEMA ENCONTRADO: Las siguientes columnas son INTEGER pero deberían ser UUID:\n');
      integerColumns.forEach(col => {
        console.log(`   - ${col.column_name}`);
      });
      console.log('\n💡 Solución: Ejecutar migración de corrección');
    } else {
      console.log('✅ Todas las columnas tienen el tipo correcto (UUID)');
    }

  } catch (error) {
    console.error('❌ Error verificando schema:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkSchema();
