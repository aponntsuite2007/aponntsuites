const db = require('../src/config/database');

async function verify() {
  await db.sequelize.authenticate();

  const [result] = await db.sequelize.query(`
    SELECT id, module_key, name FROM system_modules
    WHERE module_key = 'psychological-assessment'
  `);

  console.log('\n📊 VERIFICACIÓN: psychological-assessment\n');
  console.log('Módulos encontrados en BD: ' + result.length);

  if (result.length > 0) {
    console.log('\n⚠️  MÓDULO AÚN EXISTE:');
    result.forEach(m => {
      console.log('   ID: ' + m.id);
      console.log('   Key: ' + m.module_key);
      console.log('   Name: ' + m.name);
    });
    console.log('\n❌ La eliminación NO fue exitosa');
  } else {
    console.log('\n✅ Módulo NO encontrado en BD');
    console.log('✅ Eliminación exitosa');
  }

  await db.sequelize.close();
  process.exit(0);
}

verify();
