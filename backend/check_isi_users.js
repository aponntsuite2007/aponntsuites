const { sequelize } = require('./src/config/database');

async function checkIsiUsers() {
  try {
    // Verificar usuarios de ISI
    const [isiUsers] = await sequelize.query(`
      SELECT id, first_name, last_name, email, company_id
      FROM users
      WHERE company_id = 11
      LIMIT 5
    `);
    console.log('👥 USUARIOS DE ISI (ID 11):');
    isiUsers.forEach(u => console.log('  -', u.first_name, u.last_name, '|', u.email, '| ID:', u.id));

    // Verificar si existen módulos asignados pero INACTIVOS para ISI
    const [inactiveModules] = await sequelize.query(`
      SELECT cm.id, cm.activo, sm.module_key, sm.name
      FROM company_modules cm
      JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE cm.company_id = 11 AND cm.activo = false
    `);
    console.log('\n❌ MÓDULOS ASIGNADOS PERO INACTIVOS EN ISI:');
    inactiveModules.forEach(m => console.log('  -', m.module_key, '|', m.name, '| Activo:', m.activo));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkIsiUsers();