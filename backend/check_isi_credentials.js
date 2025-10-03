const { sequelize } = require('./src/config/database');

async function checkISICredentials() {
  console.log('🔍 Verificando credenciales para empresa ISI (ID: 11)...\n');

  try {
    // Usuarios de ISI
    const users = await sequelize.query(`
      SELECT
        id,
        email,
        password,
        first_name,
        last_name,
        company_id,
        is_active
      FROM users
      WHERE company_id = 11 AND is_active = true
      ORDER BY email
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`📋 Usuarios encontrados para ISI: ${users.length}\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. EMAIL: ${user.email}`);
      console.log(`   NOMBRE: ${user.first_name} ${user.last_name}`);
      console.log(`   PASSWORD: ${user.password}`);
      console.log(`   COMPANY_ID: ${user.company_id}`);
      console.log(`   ACTIVO: ${user.is_active}`);
      console.log('   ---');
    });

    // Verificar empresa ISI
    const company = await sequelize.query(`
      SELECT company_id, name FROM companies WHERE company_id = 11
    `, { type: sequelize.QueryTypes.SELECT });

    if (company.length) {
      console.log(`\n🏢 EMPRESA: ${company[0].name} (ID: ${company[0].id})`);
    }

    // Intentar login directo
    console.log('\n🧪 PROBANDO CREDENCIALES:');

    const testCreds = [
      { identifier: 'admin1', password: '123', companyId: 11 },
      { identifier: 'adminisi', password: '123', companyId: 11 }
    ];

    for (const cred of testCreds) {
      const user = await sequelize.query(`
        SELECT id, email, first_name, last_name, password
        FROM users
        WHERE (email = ? OR first_name = ? OR LOWER(email) LIKE ?)
        AND company_id = ?
        AND is_active = true
      `, {
        replacements: [cred.identifier, cred.identifier, `%${cred.identifier}%`, cred.companyId],
        type: sequelize.QueryTypes.SELECT
      });

      console.log(`\n📝 Probando: ${cred.identifier}/${cred.password}`);
      console.log(`   Usuarios encontrados: ${user.length}`);

      if (user.length > 0) {
        const u = user[0];
        console.log(`   ✅ Usuario: ${u.first_name} ${u.last_name} (${u.email})`);
        console.log(`   🔐 Password en DB: ${u.password}`);
        console.log(`   ✔️ Match: ${u.password === cred.password ? 'SÍ' : 'NO'}`);
      } else {
        console.log(`   ❌ No se encontró usuario`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

checkISICredentials();