const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');

async function checkVacationWorkflows() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');

    const workflows = await sequelize.query(`
      SELECT process_key, process_name, module, scope, company_id
      FROM notification_workflows
      WHERE module = 'vacation'
        AND is_active = true
      ORDER BY process_key
    `, { type: QueryTypes.SELECT });

    console.log(`\n📋 Workflows de VACATION disponibles: ${workflows.length}`);
    workflows.forEach(w => {
      console.log(`  - ${w.process_key} (scope: ${w.scope}, company: ${w.company_id || 'N/A'})`);
    });

    // Also check all available modules
    const allWorkflows = await sequelize.query(`
      SELECT DISTINCT module
      FROM notification_workflows
      WHERE is_active = true
      ORDER BY module
    `, { type: QueryTypes.SELECT });

    console.log(`\n📋 Módulos con workflows disponibles:`);
    allWorkflows.forEach(w => {
      console.log(`  - ${w.module}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkVacationWorkflows();
