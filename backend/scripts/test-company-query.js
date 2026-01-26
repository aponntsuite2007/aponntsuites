const { sequelize } = require('../src/config/database');

async function test() {
  try {
    console.log('Testing direct query for company...');

    const results = await sequelize.query(
      `SELECT id as company_id, name, slug, logo, is_active as "isActive"
       FROM companies WHERE slug = $1 AND is_active = true LIMIT 1`,
      { bind: ['isi'], type: sequelize.QueryTypes.SELECT }
    );

    console.log('Query results:', results);
    console.log('First result:', results[0]);

    // Alternative query
    console.log('\nAlternative query with named replacement:');
    const results2 = await sequelize.query(
      `SELECT id, name, slug FROM companies WHERE slug = :slug LIMIT 1`,
      { replacements: { slug: 'isi' }, type: sequelize.QueryTypes.SELECT }
    );
    console.log('Results2:', results2);

  } catch (e) {
    console.error('Error:', e.message);
    console.error('Stack:', e.stack);
  } finally {
    process.exit();
  }
}

test();
