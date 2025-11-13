require('dotenv').config();
const db = require('./src/config/database');

db.sequelize.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position
`).then(([cols]) => {
    console.log('\n═══ COLUMNAS EN TABLA USERS ═══\n');
    cols.forEach(c => {
        console.log(`  ${c.column_name.padEnd(40)} (${c.data_type})`);
    });
    console.log('');
    process.exit(0);
}).catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
