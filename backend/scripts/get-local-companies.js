const { sequelize } = require('../src/config/database');

(async () => {
  console.log('📊 EMPRESAS Y USUARIOS EN LOCAL:\n');

  // Ver empresas
  const [companies] = await sequelize.query(`
    SELECT company_id, name, slug, is_active
    FROM companies
    WHERE is_active = true
    ORDER BY company_id
    LIMIT 10
  `);

  console.log('🏢 EMPRESAS DISPONIBLES:');
  companies.forEach(c => {
    console.log(`  ${c.company_id}. ${c.name} (slug: ${c.slug})`);
  });

  console.log('\n👥 USUARIOS POR EMPRESA:\n');

  // Ver usuarios de cada empresa
  for (const company of companies) {
    const [users] = await sequelize.query(`
      SELECT user_id, usuario, email, role, "firstName", "lastName"
      FROM users
      WHERE company_id = :companyId
      AND is_active = true
      LIMIT 5
    `, {
      replacements: { companyId: company.company_id }
    });

    if (users.length > 0) {
      console.log(`📁 ${company.name} (${company.slug}):`);
      users.forEach(u => {
        const displayName = u.usuario || u.email?.split('@')[0] || `${u.firstName} ${u.lastName}`.trim();
        console.log(`   - Usuario: ${displayName} | Email: ${u.email || 'N/A'} | Rol: ${u.role}`);
      });
      console.log('');
    }
  }

  console.log('\n💡 PARA LOGIN EN PANEL-EMPRESA:');
  console.log('   PASO 1: Empresa slug (el que aparece arriba)');
  console.log('   PASO 2: Username del usuario (el que aparece arriba)');
  console.log('   PASO 3: Password (probablemente "admin123" o similar)\n');

  process.exit(0);
})();
