const { sequelize } = require('../src/config/database');

async function listTables() {
    try {
        const [tables] = await sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('=== TABLAS CON attendance/record/entry ===');
        tables.forEach(t => {
            if (t.table_name.match(/attend|record|clock|entry|marca|biom|punch|time/i)) {
                console.log('  ✅ ' + t.table_name);
            }
        });

        console.log('\n=== TODAS LAS TABLAS ===');
        tables.forEach(t => console.log('  - ' + t.table_name));

    } catch(e) {
        console.error('Error:', e.message);
    } finally {
        await sequelize.close();
    }
}

listTables();
