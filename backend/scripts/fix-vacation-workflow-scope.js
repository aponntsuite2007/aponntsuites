const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');

async function fixVacationWorkflows() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');

    // Update vacation workflows to be scope='aponnt' (global)
    const [result, metadata] = await sequelize.query(`
      UPDATE notification_workflows
      SET scope = 'aponnt'
      WHERE module = 'vacation'
        AND scope = 'company'
        AND company_id IS NULL
        AND is_active = true
      RETURNING process_key, process_name, scope
    `);

    console.log(`\n✅ Workflows actualizados: ${result.length}`);
    result.forEach(w => {
      console.log(`  - ${w.process_key}: scope → 'aponnt'`);
    });

    // Verify
    const workflows = await sequelize.query(`
      SELECT process_key, scope, company_id
      FROM notification_workflows
      WHERE module = 'vacation'
        AND is_active = true
      ORDER BY process_key
    `, { type: QueryTypes.SELECT });

    console.log(`\n📋 Estado final de workflows de vacation:`);
    workflows.forEach(w => {
      console.log(`  - ${w.process_key}: scope=${w.scope}, company=${w.company_id || 'NULL'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixVacationWorkflows();
