const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u', {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

async function checkKioskTables() {
  try {
    console.log('🔍 Verificando tablas necesarias para APK Kiosk en Render...\n');

    const tablesToCheck = [
      'biometric_templates', // Para match facial
      'attendances',         // Para registrar asistencia
      'biometric_detections', // Para log de detecciones
      'users',               // Para datos de empleados
      'kiosks',              // Para configuración de kiosks
      'departments',         // Para autorización por departamento
      'shifts'               // Para verificar horarios y llegadas tardías
    ];

    for (const tableName of tablesToCheck) {
      // Check if table exists
      const [tables] = await sequelize.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '${tableName}'
      `);

      if (tables.length === 0) {
        console.log(`❌ Tabla ${tableName} NO EXISTE\n`);
        continue;
      }

      console.log(`✅ Tabla ${tableName} existe`);

      // Get columns
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
        ORDER BY ordinal_position
      `);

      console.log(`   Columnas:`);
      columns.forEach(col => {
        console.log(`     - ${col.column_name} (${col.data_type})`);
      });

      // Get count for company 11 (MLK IT)
      let countQuery = `SELECT COUNT(*) as total FROM ${tableName}`;

      // Add company_id filter if table has it
      const hasCompanyId = columns.some(col => col.column_name === 'company_id');
      if (hasCompanyId) {
        countQuery += ` WHERE company_id = 11`;
      }

      const [count] = await sequelize.query(countQuery);
      console.log(`   Total registros (company_id=11): ${count[0].total}\n`);
    }

    // Check specific data for company 11
    console.log('📊 Verificando datos específicos para MLK IT (company_id=11):\n');

    // Count biometric templates
    const [templatesCount] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM biometric_templates
      WHERE company_id = 11 AND is_active = true
    `);
    console.log(`✅ Templates biométricos activos: ${templatesCount[0].total}`);

    // Count users with templates
    const [usersWithTemplates] = await sequelize.query(`
      SELECT COUNT(DISTINCT bt.employee_id) as total
      FROM biometric_templates bt
      WHERE bt.company_id = 11 AND bt.is_active = true
    `);
    console.log(`✅ Empleados con biometría: ${usersWithTemplates[0].total}`);

    // Count attendances today
    const [attendancesToday] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM attendances a
      JOIN users u ON a.user_id = u.user_id
      WHERE u.company_id = 11
        AND DATE(a.check_in) = CURRENT_DATE
    `);
    console.log(`✅ Asistencias hoy: ${attendancesToday[0].total}`);

    // Count detections today
    const [detectionsToday] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM biometric_detections
      WHERE company_id = 11
        AND DATE(detection_timestamp) = CURRENT_DATE
    `);
    console.log(`✅ Detecciones biométricas hoy: ${detectionsToday[0].total}\n`);

    await sequelize.close();
    console.log('✅ Verificación completada');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

checkKioskTables();
