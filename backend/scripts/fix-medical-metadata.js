const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  'attendance_system',
  'postgres',
  'Aedr15150302',
  {
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
  }
);

(async () => {
  try {
    console.log('🔍 [CHECK] Verificando metadata actual...');

    const [results] = await sequelize.query(`
      SELECT module_key, metadata
      FROM system_modules
      WHERE module_key = 'medical'
    `);

    console.log('📦 [METADATA] Actual:', JSON.stringify(results[0]?.metadata, null, 2));

    console.log('\n✏️ [UPDATE] Actualizando metadata...');

    await sequelize.query(`
      UPDATE system_modules
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{frontend_file}',
        '"/js/modules/medical-dashboard-professional.js"'::jsonb
      )
      WHERE module_key = 'medical'
    `);

    await sequelize.query(`
      UPDATE system_modules
      SET metadata = jsonb_set(
        metadata,
        '{init_function}',
        '"initMedicalDashboard"'::jsonb
      )
      WHERE module_key = 'medical'
    `);

    console.log('✅ [UPDATE] Metadata actualizado');

    const [newResults] = await sequelize.query(`
      SELECT module_key, metadata
      FROM system_modules
      WHERE module_key = 'medical'
    `);

    console.log('📦 [METADATA] Nuevo:', JSON.stringify(newResults[0]?.metadata, null, 2));

    await sequelize.close();
    console.log('\n✅ [DONE] Script completado exitosamente');

  } catch (error) {
    console.error('❌ [ERROR]', error.message);
    process.exit(1);
  }
})();
