/**
 * Script para agregar branch_code a organizational_positions
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const LOCAL_DB = {
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
};

async function addBranchCodeField() {
  const client = new Client(LOCAL_DB);

  try {
    console.log('📊 Conectando a base de datos LOCAL...');
    await client.connect();
    console.log('✅ Conexión establecida\n');

    // Leer archivo de migración
    const migrationPath = path.join(__dirname, '..', 'migrations', '20251209_add_branch_code_to_positions.sql');
    console.log(`📄 Leyendo migración: ${migrationPath}\n`);

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Ejecutar migración
    console.log('🚀 Ejecutando migración...\n');
    await client.query(sql);

    console.log('✅ Migración ejecutada correctamente\n');

    // Verificar que el campo existe
    console.log('🔍 Verificando campo branch_code...\n');
    const checkResult = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'organizational_positions'
      AND column_name = 'branch_code'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Campo branch_code agregado correctamente:');
      console.log(`   - Tipo: ${checkResult.rows[0].data_type}`);
      console.log(`   - Longitud: ${checkResult.rows[0].character_maximum_length}`);
    } else {
      console.log('❌ Error: Campo branch_code no encontrado');
    }

    // Verificar índice
    console.log('\n🔍 Verificando índice idx_org_positions_branch...\n');
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'organizational_positions'
      AND indexname = 'idx_org_positions_branch'
    `);

    if (indexResult.rows.length > 0) {
      console.log('✅ Índice creado correctamente');
      console.log(`   ${indexResult.rows[0].indexdef}`);
    } else {
      console.log('⚠️  Índice no encontrado');
    }

    // Mostrar estructura actual de la tabla
    console.log('\n📊 Estructura actual de organizational_positions:\n');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'organizational_positions'
      ORDER BY ordinal_position
    `);

    columnsResult.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const maxLen = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`   - ${col.column_name}: ${col.data_type}${maxLen} ${nullable}${defaultVal}`);
    });

    console.log('\n🎉 ¡Migración completada exitosamente!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada\n');
  }
}

addBranchCodeField();
