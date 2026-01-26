const { Sequelize } = require('sequelize');
async function check() {
    const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
        host: 'localhost', port: 5432, dialect: 'postgres', logging: false
    });
    try {
        await sequelize.authenticate();
        console.log('DB conectada OK\n');

        const results = await sequelize.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            AND (table_name LIKE 'procurement%' OR table_name LIKE 'finance%'
                 OR table_name LIKE 'tax%' OR table_name LIKE '%branch%')
            ORDER BY table_name
        `, { type: Sequelize.QueryTypes.SELECT });

        console.log('Tablas encontradas (' + results.length + '):');
        if (results.length > 0) {
            console.log('  First row keys:', Object.keys(results[0]));
            console.log('  First row:', JSON.stringify(results[0]));
        }
        results.forEach(r => {
            const vals = Object.values(r);
            console.log('  -', vals[0] || JSON.stringify(r));
        });

        await sequelize.close();
    } catch(e) {
        console.error('ERR:', e.message);
        await sequelize.close().catch(()=>{});
    }
}
check();
