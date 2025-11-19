const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
  });

  const userId = '0393c9cd-5ae4-410d-a9d9-9446b7f15bd2';

  console.log('\n🔍 VERIFICANDO SUCURSAL DEL USUARIO\n');

  // 1. Ver qué branch tiene asignado el usuario
  const userResult = await pool.query(`
    SELECT user_id, "firstName", "lastName", default_branch_id
    FROM users
    WHERE user_id = $1
  `, [userId]);

  const user = userResult.rows[0];
  console.log('📋 Usuario:', user.firstName, user.lastName);
  console.log('🏢 default_branch_id:', user.default_branch_id);
  console.log('   Tipo:', typeof user.default_branch_id);

  if (user.default_branch_id) {
    // 2. Verificar si esa branch existe
    console.log('\n🔍 Verificando si la sucursal existe...');
    const branchResult = await pool.query(`
      SELECT id, name, company_id
      FROM branches
      WHERE id = $1
    `, [user.default_branch_id]);

    if (branchResult.rows.length > 0) {
      console.log('✅ Sucursal encontrada:', branchResult.rows[0]);
    } else {
      console.log('❌ Sucursal NO EXISTE en la tabla branches');
      console.log('   El usuario tiene branch_id', user.default_branch_id, 'pero no existe');

      // 3. Ver qué sucursales SÍ existen para ISI (company_id=11)
      console.log('\n📋 Sucursales disponibles para ISI (company_id=11):');
      const branchesResult = await pool.query(`
        SELECT id, name, address
        FROM branches
        WHERE company_id = 11
        ORDER BY id
      `);

      if (branchesResult.rows.length > 0) {
        branchesResult.rows.forEach(b => {
          console.log(`   ID: ${b.id} - ${b.name} (${b.address || 'Sin dirección'})`);
        });
      } else {
        console.log('   ⚠️ NO HAY SUCURSALES para company_id=11');
      }
    }
  } else {
    console.log('\nℹ️ Usuario no tiene sucursal asignada (default_branch_id es NULL)');
  }

  await pool.end();
})();
