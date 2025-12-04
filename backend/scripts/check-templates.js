const { Sequelize, QueryTypes } = require('sequelize');
const seq = new Sequelize('postgresql://postgres:Aedr15150302@localhost:5432/attendance_system', { logging: false });

async function check() {
  try {
    // Ver el biometric_template que existe
    const [templates] = await seq.query('SELECT * FROM biometric_templates LIMIT 5');
    console.log('BIOMETRIC_TEMPLATES:', templates.length, 'registros');
    if (templates.length > 0) {
      console.log('Columnas:', Object.keys(templates[0]).join(', '));
      templates.forEach(t => {
        console.log('---');
        console.log('  user_id:', t.user_id);
        console.log('  company_id:', t.company_id);
        console.log('  type:', t.type);
        console.log('  has_embedding:', t.embedding ? 'SI' : 'NO');
        console.log('  created_at:', t.created_at);
      });
    }

    // Ver empresas
    const [companies] = await seq.query('SELECT id, name, slug FROM companies WHERE is_active = true');
    console.log('\nEMPRESAS ACTIVAS:');
    companies.forEach(c => console.log('  -', c.id, c.slug));

  } catch(e) {
    console.log('Error:', e.message);
  }
  await seq.close();
}
check();
