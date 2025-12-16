const { sequelize } = require('../src/config/database');

(async () => {
  const [results] = await sequelize.query(`
    SELECT
      COUNT(*) as total_modules,
      COUNT(*) FILTER (WHERE ui_metadata IS NOT NULL AND (
        jsonb_array_length(ui_metadata->'mainButtons') > 0 OR
        jsonb_array_length(ui_metadata->'tabs') > 0 OR
        jsonb_array_length(ui_metadata->'inputs') > 0
      )) as modules_with_data,
      SUM(jsonb_array_length(ui_metadata->'mainButtons')) as total_buttons,
      SUM(jsonb_array_length(ui_metadata->'tabs')) as total_tabs
    FROM system_modules;
  `);

  console.log('\n📊 ESTADO ACTUAL DE UI METADATA EN BD:\n');
  console.log(`   Total módulos: ${results[0].total_modules}`);
  console.log(`   Módulos con UI data: ${results[0].modules_with_data}`);
  console.log(`   Total botones: ${results[0].total_buttons || 0}`);
  console.log(`   Total tabs: ${results[0].total_tabs || 0}\n`);

  process.exit(0);
})();
