/**
 * Script para ejecutar la migración del sistema de comisiones piramidales
 * Ejecuta: 20250122_fix_commission_system_complete.sql
 */

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/database');

async function runMigration() {
  console.log('🔄 Iniciando migración del sistema de comisiones piramidales...\n');

  try {
    // Leer archivo de migración
    const migrationPath = path.join(__dirname, '../migrations/20250122_fix_commission_system_complete.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Archivo de migración cargado:', migrationPath);
    console.log('📏 Tamaño:', migrationSQL.length, 'caracteres\n');

    // Ejecutar migración
    console.log('⚙️  Ejecutando migración...\n');

    await sequelize.query(migrationSQL);

    console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE\n');

    // Verificar que los campos fueron agregados
    console.log('🔍 Verificando campos agregados...\n');

    const [rolesColumns] = await sequelize.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'aponnt_staff_roles'
        AND column_name = 'pyramid_commission_percentage';
    `);

    const [staffColumns] = await sequelize.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'aponnt_staff'
        AND column_name = 'pyramid_commission_percentage_override';
    `);

    if (rolesColumns.length > 0) {
      console.log('✅ Campo pyramid_commission_percentage agregado a aponnt_staff_roles');
      console.log('   Tipo:', rolesColumns[0].data_type);
      console.log('   Default:', rolesColumns[0].column_default);
    } else {
      console.log('⚠️  Campo pyramid_commission_percentage NO encontrado en aponnt_staff_roles');
    }

    if (staffColumns.length > 0) {
      console.log('✅ Campo pyramid_commission_percentage_override agregado a aponnt_staff');
      console.log('   Tipo:', staffColumns[0].data_type);
      console.log('   Default:', staffColumns[0].column_default);
    } else {
      console.log('⚠️  Campo pyramid_commission_percentage_override NO encontrado en aponnt_staff');
    }

    // Verificar vista creada
    console.log('\n🔍 Verificando vista v_staff_pyramid_percentage...\n');

    const [views] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_name = 'v_staff_pyramid_percentage';
    `);

    if (views.length > 0) {
      console.log('✅ Vista v_staff_pyramid_percentage creada exitosamente');
    } else {
      console.log('⚠️  Vista v_staff_pyramid_percentage NO encontrada');
    }

    // Verificar funciones creadas
    console.log('\n🔍 Verificando funciones PostgreSQL...\n');

    const [functions] = await sequelize.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN (
          'calculate_pyramid_commission',
          'get_staff_commission_summary',
          'get_staff_subordinates_recursive'
        );
    `);

    functions.forEach(func => {
      console.log('✅ Función creada:', func.routine_name);
    });

    // Verificar porcentajes poblados
    console.log('\n🔍 Verificando porcentajes por defecto en roles...\n');

    const [rolePercentages] = await sequelize.query(`
      SELECT role_code, role_name, role_area, pyramid_commission_percentage
      FROM aponnt_staff_roles
      WHERE pyramid_commission_percentage > 0
      ORDER BY pyramid_commission_percentage DESC;
    `);

    if (rolePercentages.length > 0) {
      console.log('✅ Porcentajes piramidales configurados:\n');
      rolePercentages.forEach(role => {
        console.log(`   ${role.role_code} (${role.role_name}): ${role.pyramid_commission_percentage}%`);
      });
    } else {
      console.log('⚠️  No se encontraron roles con porcentajes piramidales configurados');
    }

    console.log('\n✅ TODAS LAS VERIFICACIONES COMPLETADAS\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Sistema de Comisiones Piramidales listo para usar');
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
