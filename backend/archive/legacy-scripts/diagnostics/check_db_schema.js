const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'attendance_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Aedr15150302'
});

async function checkSchema() {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // 1. Verificar columnas de la tabla users
    console.log('📋 COLUMNAS DE LA TABLA users:');
    console.log('='.repeat(80));
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `;
    const columns = await client.query(columnsQuery);

    let hasLegajo = false;
    let hasIsActive = false;

    columns.rows.forEach(col => {
      if (col.column_name === 'legajo') hasLegajo = true;
      if (col.column_name === 'is_active') hasIsActive = true;
      console.log(`  ${col.column_name.padEnd(30)} | ${col.data_type.padEnd(20)} | Nullable: ${col.is_nullable}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n🔍 Campo 'legajo' existe: ${hasLegajo ? '✅ SI' : '❌ NO'}`);
    console.log(`🔍 Campo 'is_active' existe: ${hasIsActive ? '✅ SI' : '❌ NO'}`);

    // 2. Verificar usuario de prueba reciente
    console.log('\n\n📊 ÚLTIMOS 3 USUARIOS CREADOS:');
    console.log('='.repeat(80));
    const usersQuery = `
      SELECT user_id, "firstName", "lastName", legajo, is_active, "createdAt"
      FROM users
      ORDER BY "createdAt" DESC
      LIMIT 3;
    `;

    try {
      const users = await client.query(usersQuery);
      users.rows.forEach(user => {
        console.log(`\nID: ${user.user_id}`);
        console.log(`  Nombre: ${user.firstName} ${user.lastName}`);
        console.log(`  Legajo: ${user.legajo || 'NULL'}`);
        console.log(`  is_active: ${user.is_active}`);
        console.log(`  Creado: ${user.createdAt}`);
      });
    } catch (err) {
      console.log(`❌ Error al consultar usuarios: ${err.message}`);
    }

    // 3. Test de UPDATE is_active
    console.log('\n\n🧪 TESTING UPDATE is_active:');
    console.log('='.repeat(80));

    const testUserQuery = `
      SELECT user_id, "firstName", is_active
      FROM users
      WHERE "firstName" LIKE 'Usuario%'
      ORDER BY "createdAt" DESC
      LIMIT 1;
    `;

    const testUser = await client.query(testUserQuery);

    if (testUser.rows.length > 0) {
      const userId = testUser.rows[0].user_id;
      const nombre = testUser.rows[0].firstName;
      const isActiveBefore = testUser.rows[0].is_active;

      console.log(`Usuario de prueba: ${nombre} (ID: ${userId})`);
      console.log(`is_active ANTES del UPDATE: ${isActiveBefore}`);

      // Ejecutar UPDATE
      await client.query('UPDATE users SET is_active = false WHERE user_id = $1', [userId]);
      console.log('✅ UPDATE ejecutado: SET is_active = false');

      // Verificar cambio
      const verify = await client.query('SELECT is_active FROM users WHERE user_id = $1', [userId]);
      const isActiveAfter = verify.rows[0].is_active;
      console.log(`is_active DESPUÉS del UPDATE: ${isActiveAfter}`);

      if (isActiveAfter === false) {
        console.log('\n✅ UPDATE FUNCIONA CORRECTAMENTE en PostgreSQL directo');
      } else {
        console.log('\n❌ UPDATE NO funcionó (posible problema de permisos o triggers)');
      }

      // Restaurar
      await client.query('UPDATE users SET is_active = true WHERE user_id = $1', [userId]);
      console.log('🔄 Usuario restaurado a is_active = true');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSchema();
