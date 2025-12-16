#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const database = require('../src/config/database');
const sequelize = database.sequelize;

(async () => {
  try {
    // Check system_modules for 'users'
    const systemModule = await sequelize.query(
      "SELECT id, module_key, name, is_core, is_active FROM system_modules WHERE module_key = 'users'",
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log('System Module (users):', JSON.stringify(systemModule, null, 2));

    // Check company_modules for ISI (company_id=11) and users
    const companyModules = await sequelize.query(
      "SELECT cm.*, sm.module_key, sm.name FROM company_modules cm INNER JOIN system_modules sm ON cm.system_module_id = sm.id WHERE cm.company_id = 11 AND sm.module_key = 'users'",
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log('Company Modules for ISI (users):', JSON.stringify(companyModules, null, 2));

    // Count all contracted modules for ISI
    const allContracted = await sequelize.query(
      "SELECT sm.module_key, cm.activo FROM company_modules cm INNER JOIN system_modules sm ON cm.system_module_id = sm.id WHERE cm.company_id = 11 LIMIT 15",
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log('First 15 ISI contracted modules:', JSON.stringify(allContracted, null, 2));

    // Check if 'users' is marked as is_core in system_modules
    const coreCheck = await sequelize.query(
      "SELECT module_key, is_core FROM system_modules WHERE module_key = 'users'",
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log('Users is_core check:', JSON.stringify(coreCheck, null, 2));

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
})();
