const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');

(async () => {
    await sequelize.authenticate();
    const results = await sequelize.query(`
        SELECT process_key, process_name, module, scope
        FROM notification_workflows
        WHERE is_active = true
        ORDER BY module, process_key
    `, { type: QueryTypes.SELECT });

    console.log('Total workflows:', results.length);
    console.log('\nBy module:');

    const byModule = {};
    results.forEach(w => {
        if (!byModule[w.module]) byModule[w.module] = [];
        byModule[w.module].push(w.process_key);
    });

    Object.keys(byModule).sort().forEach(m => {
        console.log(`\n${m}: (${byModule[m].length} workflows)`);
        byModule[m].forEach(pk => console.log(`  - ${pk}`));
    });

    await sequelize.close();
})();
