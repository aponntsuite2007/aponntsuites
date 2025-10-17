const db = require('./src/config/database');

(async () => {
    try {
        const [modules] = await db.sequelize.query('SELECT id, module_code, module_name, icon FROM system_modules ORDER BY id');

        console.log('MÓDULOS ACTUALES:\n');
        modules.forEach(m => {
            console.log(`${m.id}. ${m.module_code.padEnd(35)} | Icon: ${m.icon || 'NULL'}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
