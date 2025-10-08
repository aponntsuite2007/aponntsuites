/**
 * Script para ejecutar el fix de schema directamente en Render
 * Uso: DATABASE_URL="postgresql://..." node execute-fix-render.js
 */

const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

async function executeSqlFix() {
  console.log('🔧 [FIX-RENDER] Iniciando corrección de schema...\n');

  // Conectar a la base de datos de Render
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL no está definida');
    console.log('Uso: DATABASE_URL="postgresql://..." node execute-fix-render.js');
    process.exit(1);
  }

  const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });

  try {
    // Verificar conexión
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos Render\n');

    // Leer el script SQL
    const sqlPath = path.join(__dirname, 'fix-render-schema.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Ejecutando script SQL...\n');

    // Ejecutar el script completo
    await sequelize.query(sqlScript);

    console.log('\n✅ ¡Script ejecutado exitosamente!\n');

    // Verificar columnas agregadas
    console.log('🔍 Verificando columnas agregadas...\n');

    const [attendanceColumns] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'attendances'
      ORDER BY ordinal_position
    `);

    const hasStatus = attendanceColumns.some(col => col.column_name === 'status');
    console.log(`  attendances.status: ${hasStatus ? '✅ EXISTE' : '❌ FALTA'}`);

    const [userColumns] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    const hasPhone = userColumns.some(col => col.column_name === 'phone');
    const hasDepartmentId = userColumns.some(col => col.column_name === 'departmentId');
    const hasCanUseMobile = userColumns.some(col => col.column_name === 'can_use_mobile_app');

    console.log(`  users.phone: ${hasPhone ? '✅ EXISTE' : '❌ FALTA'}`);
    console.log(`  users.departmentId: ${hasDepartmentId ? '✅ EXISTE' : '❌ FALTA'}`);
    console.log(`  users.can_use_mobile_app: ${hasCanUseMobile ? '✅ EXISTE' : '❌ FALTA'}`);

    const [deptColumns] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'departments'
      ORDER BY ordinal_position
    `);

    const hasDescription = deptColumns.some(col => col.column_name === 'description');
    const hasGpsLat = deptColumns.some(col => col.column_name === 'gps_lat');

    console.log(`  departments.description: ${hasDescription ? '✅ EXISTE' : '❌ FALTA'}`);
    console.log(`  departments.gps_lat: ${hasGpsLat ? '✅ EXISTE' : '❌ FALTA'}`);

    console.log('\n✅ [FIX-RENDER] Corrección completada exitosamente\n');

    // Registrar las migraciones como ejecutadas
    console.log('📝 Registrando migraciones en SequelizeMeta...\n');

    const migrations = [
      '20251007120002-add-missing-department-columns.js',
      '20251007120003-add-missing-user-columns.js',
      '20251007120004-add-status-to-attendances.js'
    ];

    for (const migration of migrations) {
      await sequelize.query(`
        INSERT INTO "SequelizeMeta" (name)
        VALUES (:name)
        ON CONFLICT (name) DO NOTHING
      `, {
        replacements: { name: migration }
      });
      console.log(`  ✅ ${migration}`);
    }

    console.log('\n🎉 ¡TODO LISTO! El schema está completamente arreglado.\n');

  } catch (error) {
    console.error('\n❌ Error ejecutando el fix:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar
executeSqlFix().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
