const { sequelize } = require('../src/config/database');

async function check() {
    const companies = await sequelize.query(`
        SELECT company_id, name, is_active, status_manual, status_manual_reason
        FROM companies ORDER BY company_id
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('Estado real en BD:');
    console.log('='.repeat(80));
    companies.forEach(c => {
        console.log(`${c.company_id} | ${c.name} | is_active=${c.is_active} | manual=${c.status_manual} | reason=${c.status_manual_reason || '-'}`);
    });
    await sequelize.close();
}

check();
