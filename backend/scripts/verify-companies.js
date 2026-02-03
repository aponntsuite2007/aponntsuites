const { sequelize } = require('../src/config/database');

async function verify() {
    const companies = await sequelize.query(`
        SELECT c.company_id, c.name, c.is_active,
               q.quote_number, q.status as quote_status
        FROM companies c
        LEFT JOIN quotes q ON q.company_id = c.company_id
        ORDER BY c.company_id
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('=== EMPRESAS EN BD ===');
    companies.forEach(c => {
        const quote = c.quote_number ? `${c.quote_number} (${c.quote_status})` : 'SIN PRESUPUESTO';
        console.log(`${c.company_id} | ${c.name} | ${c.is_active ? 'Activa' : 'Inactiva'} | ${quote}`);
    });

    await sequelize.close();
}

verify();
