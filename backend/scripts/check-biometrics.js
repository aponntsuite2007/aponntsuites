const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgresql://postgres:Aedr15150302@localhost:5432/sistema_asistencia',
  { logging: false }
);

async function check() {
  try {
    // Verificar biometrías guardadas
    const [biometrics] = await sequelize.query(`
      SELECT fb.id, fb.user_id, u.name, u.email, c.name as company_name,
             fb.created_at, fb.updated_at,
             CASE WHEN fb.face_encoding IS NOT NULL THEN 'SI' ELSE 'NO' END as tiene_encoding,
             LENGTH(fb.face_encoding::text) as encoding_length
      FROM facial_biometrics fb
      JOIN users u ON fb.user_id = u.id
      JOIN companies c ON u.company_id = c.id
      ORDER BY fb.created_at DESC
      LIMIT 20
    `);

    console.log('\n📊 BIOMETRÍAS FACIALES GUARDADAS:');
    console.log('================================');
    if (biometrics.length === 0) {
      console.log('❌ No hay biometrías registradas');
    } else {
      biometrics.forEach(b => {
        console.log(`👤 ${b.name} (${b.email})`);
        console.log(`   Empresa: ${b.company_name}`);
        console.log(`   Encoding: ${b.tiene_encoding} (length: ${b.encoding_length})`);
        console.log(`   Creado: ${b.created_at}`);
        console.log('');
      });
    }

    // Contar total
    const [[count]] = await sequelize.query('SELECT COUNT(*) as total FROM facial_biometrics');
    console.log(`\n📈 Total biometrías: ${count.total}`);

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await sequelize.close();
  }
}

check();
