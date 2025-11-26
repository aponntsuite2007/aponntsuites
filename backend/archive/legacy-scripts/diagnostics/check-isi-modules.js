const { sequelize } = require('./src/config/database');

async function checkISIModules() {
  try {
    const [companies] = await sequelize.query(`
      SELECT company_id, name, slug, active_modules
      FROM companies
      WHERE company_id = 11
    `);

    console.log('🏢 Empresa ISI (company_id 11):');
    console.log(JSON.stringify(companies[0], null, 2));

    if (companies[0] && companies[0].active_modules) {
      console.log('\n📦 Módulos activos:');
      console.log(companies[0].active_modules);
      console.log('\n📊 Total módulos:', companies[0].active_modules.length);
      console.log('\n📝 Lista de módulos:');
      companies[0].active_modules.forEach((mod, idx) => {
        console.log(`  ${idx + 1}. ${mod}`);
      });
    } else {
      console.log('\n⚠️  No hay módulos activos (NULL o vacío)');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkISIModules();
