/**
 * BUSCAR Y ACTUALIZAR USUARIO SOPORTE A ROL ADMIN
 */

require('dotenv').config();
const database = require('./src/config/database');

async function main() {
  try {
    await database.sequelize.authenticate();
    console.log('✅ Conectado a BD\n');

    // 1. BUSCAR usuario soporte
    console.log('🔍 Buscando usuario "soporte"...\n');
    const [users] = await database.sequelize.query(`
      SELECT user_id, usuario, role, email, company_id, "firstName", "lastName"
      FROM users
      WHERE usuario ILIKE '%soporte%' OR usuario = 'soporte'
      LIMIT 10
    `);

    if (users.length === 0) {
      console.log('❌ No se encontró usuario "soporte"');
      console.log('\n📋 Mostrando algunos usuarios de company_id 11:\n');

      const [allUsers] = await database.sequelize.query(`
        SELECT usuario, role, email, company_id
        FROM users
        WHERE company_id = 11
        LIMIT 10
      `);

      console.table(allUsers);
      process.exit(0);
    }

    console.log('✅ USUARIOS ENCONTRADOS:\n');
    console.table(users);

    // 2. ACTUALIZAR a admin si no lo es
    for (const user of users) {
      if (user.role !== 'admin') {
        console.log(`\n🔧 Actualizando ${user.usuario} de "${user.role}" a "admin"...`);

        await database.sequelize.query(`
          UPDATE users
          SET role = 'admin'
          WHERE user_id = :user_id
        `, {
          replacements: { user_id: user.user_id }
        });

        console.log(`✅ Usuario ${user.usuario} actualizado a admin`);
      } else {
        console.log(`\n✅ Usuario ${user.usuario} ya es admin`);
      }
    }

    console.log('\n🎯 PROCESO COMPLETADO');
    await database.sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
