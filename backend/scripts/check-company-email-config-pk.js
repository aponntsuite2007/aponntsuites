require('dotenv').config();
const { sequelize } = require('../src/config/database');

async function check() {
    const [r] = await sequelize.query(`
        SELECT
            a.attname as column_name,
            format_type(a.atttypid, a.atttypmod) as data_type,
            (SELECT constraint_type FROM information_schema.table_constraints tc
             JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
             WHERE tc.table_name = 'company_email_config' AND ccu.column_name = a.attname AND constraint_type = 'PRIMARY KEY') as is_pk
        FROM pg_attribute a
        WHERE a.attrelid = 'company_email_config'::regclass
          AND a.attnum > 0
          AND NOT a.attisdropped
        ORDER BY a.attnum
    `);
    console.table(r);
    process.exit(0);
}
check();
