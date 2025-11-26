/**
 * Script para ejecutar la migración de FK de vendor_commissions
 * Ejecuta: 20250122_fix_vendor_commission_fk.sql
 */

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/database');

async function runMigration() {
  console.log('🔄 Iniciando migración de FK de vendor_commissions...\n');

  try {
    // Leer archivo de migración
    const migrationPath = path.join(__dirname, '../migrations/20250122_fix_vendor_commission_fk.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Archivo de migración cargado:', migrationPath);
    console.log('📏 Tamaño:', migrationSQL.length, 'caracteres\n');

    // Ejecutar migración
    console.log('⚙️  Ejecutando migración...\n');

    await sequelize.query(migrationSQL);

    console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE\n');

    // Verificar FKs actualizadas
    console.log('🔍 Verificando foreign keys...\n');

    const [constraints] = await sequelize.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_name = 'vendor_commissions'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND (kcu.column_name = 'vendor_id' OR kcu.column_name = 'original_vendor_id')
      ORDER BY tc.constraint_name;
    `);

    if (constraints.length > 0) {
      console.log('✅ Foreign keys encontradas:\n');
      constraints.forEach(fk => {
        console.log(`   ${fk.constraint_name}:`);
        console.log(`     ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('⚠️  No se encontraron FK en vendor_commissions');
    }

    // Verificar índices
    console.log('\n🔍 Verificando índices...\n');

    const [indexes] = await sequelize.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'vendor_commissions'
        AND (indexname LIKE '%vendor_id%')
      ORDER BY indexname;
    `);

    if (indexes.length > 0) {
      console.log('✅ Índices encontrados:\n');
      indexes.forEach(idx => {
        console.log(`   ${idx.indexname}`);
      });
    } else {
      console.log('⚠️  No se encontraron índices');
    }

    console.log('\n✅ TODAS LAS VERIFICACIONES COMPLETADAS\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Foreign keys de vendor_commissions actualizadas correctamente');
    console.log('═══════════════════════════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR ejecutando migración:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Ejecutar migración
runMigration();
