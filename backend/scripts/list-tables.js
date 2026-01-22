const { Sequelize } = require('sequelize');

const s = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
});

(async () => {
    try {
        const [tables] = await s.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        console.log('TABLAS EN LA BD (' + tables.length + '):');
        console.log('-'.repeat(40));
        tables.forEach(t => console.log('  ' + t.table_name));
    } catch (e) {
        console.log('ERROR:', e.message);
    }
    await s.close();
})();
