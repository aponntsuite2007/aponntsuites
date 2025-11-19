const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
  });

  const branchId = 'cd0228cb-a01a-4ea6-aa23-e5c05b05554b';

  console.log('\n🔍 VERIFICANDO SI LA SUCURSAL EXISTE\n');
  console.log('   Branch ID:', branchId);

  // Verificar si existe
  const result = await pool.query(`
    SELECT id, name, address, company_id
    FROM branches
    WHERE id = $1
  `, [branchId]);

  if (result.rows.length > 0) {
    console.log('\n✅ Sucursal ENCONTRADA:');
    console.log('   ID:', result.rows[0].id);
    console.log('   Nombre:', result.rows[0].name);
    console.log('   Dirección:', result.rows[0].address || 'Sin dirección');
    console.log('   Company ID:', result.rows[0].company_id);
  } else {
    console.log('\n❌ Sucursal NO EXISTE en la tabla branches');

    // Ver qué sucursales SÍ existen para ISI
    console.log('\n📋 Sucursales disponibles para ISI (company_id=11):');
    const branches = await pool.query(`
      SELECT id, name, address
      FROM branches
      WHERE company_id = 11
      ORDER BY name
    `);

    if (branches.rows.length > 0) {
      branches.rows.forEach(b => {
        console.log(`   ${b.id} - ${b.name}`);
      });
    } else {
      console.log('   ⚠️ NO HAY SUCURSALES para company_id=11');
    }
  }

  await pool.end();
})();
