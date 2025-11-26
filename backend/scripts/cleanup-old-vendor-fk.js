/**
 * Script para limpiar FK residual de vendor_commissions que todavía apunta a users
 */

const { sequelize } = require('../src/config/database');

async function cleanup() {
  console.log('🧹 Limpiando FK residual de vendor_commissions...\n');

  try {
    // Buscar todos los FKs que apuntan a users
    const [oldFKs] = await sequelize.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'vendor_commissions'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'users'
      ORDER BY tc.constraint_name;
    `);

    if (oldFKs.length === 0) {
      console.log('✅ No hay FK residuales apuntando a users\n');
      process.exit(0);
      return;
    }

    console.log(`⚠️  Encontrados ${oldFKs.length} FK(s) apuntando a users:\n`);
    oldFKs.forEach(fk => {
      console.log(`   ${fk.constraint_name}: vendor_commissions.${fk.column_name} → users.${fk.foreign_column_name}`);
    });

    console.log('\n🔧 Eliminando FK residuales...\n');

    for (const fk of oldFKs) {
      console.log(`   Eliminando ${fk.constraint_name}...`);
      await sequelize.query(`ALTER TABLE vendor_commissions DROP CONSTRAINT ${fk.constraint_name}`);
      console.log(`   ✅ Eliminado`);
    }

    console.log('\n🔍 Verificando que solo queden FKs a aponnt_staff...\n');

    const [currentFKs] = await sequelize.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'vendor_commissions'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND (kcu.column_name = 'vendor_id' OR kcu.column_name = 'original_vendor_id')
      ORDER BY tc.constraint_name;
    `);

    console.log('✅ FKs actuales en vendor_commissions:\n');
    currentFKs.forEach(fk => {
      const emoji = fk.foreign_table_name === 'aponnt_staff' ? '✅' : '❌';
      console.log(`   ${emoji} ${fk.constraint_name}:`);
      console.log(`       vendor_commissions.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    const badFKs = currentFKs.filter(fk => fk.foreign_table_name !== 'aponnt_staff');
    if (badFKs.length > 0) {
      console.log('\n⚠️  ADVERTENCIA: Todavía hay FKs que no apuntan a aponnt_staff');
      process.exit(1);
    } else {
      console.log('\n✅ LIMPIEZA COMPLETADA - Todos los FKs apuntan correctamente a aponnt_staff\n');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

cleanup();
