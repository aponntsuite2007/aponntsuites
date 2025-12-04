const db = require('../src/config/database');

async function checkTrigger() {
  await db.sequelize.authenticate();

  const [result] = await db.sequelize.query(`
    SELECT pg_get_functiondef(oid) as definition
    FROM pg_proc
    WHERE proname = 'auto_activate_bundled_modules'
  `);

  console.log('Función auto_activate_bundled_modules:');
  console.log(result[0]?.definition || 'No encontrada');

  await db.sequelize.close();
  process.exit(0);
}

checkTrigger();
