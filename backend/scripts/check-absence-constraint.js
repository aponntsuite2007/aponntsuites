const { sequelize } = require('../src/config/database');

async function run() {
    try {
        // Ver constraint
        const [constraint] = await sequelize.query(`
            SELECT pg_get_constraintdef(c.oid) as constraint_def
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            WHERE t.relname = 'absence_cases'
            AND c.conname = 'absence_cases_absence_type_check'
        `);
        console.log('Constraint definition:', JSON.stringify(constraint, null, 2));

        // Ver datos existentes para entender los valores válidos
        const [samples] = await sequelize.query(`
            SELECT DISTINCT absence_type FROM absence_cases LIMIT 10
        `);
        console.log('Valores existentes:', JSON.stringify(samples, null, 2));

        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}
run();
