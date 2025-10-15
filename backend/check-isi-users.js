/**
 * Verificar usuarios de ISI
 */

const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function checkISIUsers() {
  console.log('🔧 Conectando a PostgreSQL...\n');

  try {
    await sequelize.authenticate();

    // Buscar usuarios con email que contenga "isi" o nombre de empresa ISI
    console.log('📋 Usuarios con "ISI" en el nombre:\n');
    const [users] = await sequelize.query(`
      SELECT user_id, "firstName", "lastName", email, company_id, role, is_active
      FROM users
      WHERE LOWER("firstName") LIKE '%isi%'
         OR LOWER("lastName") LIKE '%isi%'
         OR LOWER(email) LIKE '%isi%'
      ORDER BY company_id, user_id
    `);
    console.table(users);

    // Buscar TODOS los usuarios de company_id = 1 (ISI)
    console.log('\n📋 Todos los usuarios de company_id = 1 (ISI):\n');
    const [isiUsers] = await sequelize.query(`
      SELECT user_id, "firstName", "lastName", email, company_id, role, is_active
      FROM users
      WHERE company_id = 1
      ORDER BY user_id
    `);

    if (isiUsers.length === 0) {
      console.log('⚠️ NO HAY USUARIOS con company_id = 1 (ISI)');
    } else {
      console.table(isiUsers);
    }

    // Buscar usuarios admin de todas las empresas
    console.log('\n📋 Usuarios admin de todas las empresas:\n');
    const [adminUsers] = await sequelize.query(`
      SELECT user_id, "firstName", "lastName", email, company_id, role
      FROM users
      WHERE role = 'admin' AND is_active = true
      ORDER BY company_id, user_id
    `);
    console.table(adminUsers);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkISIUsers();
