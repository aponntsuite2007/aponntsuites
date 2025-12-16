const { sequelize } = require('../src/config/database');

async function checkColumns() {
    try {
        const [cols] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `);
        console.log('COLUMNAS DE USERS:');
        cols.forEach(c => console.log('  - ' + c.column_name + ': ' + c.data_type));

        const [cols2] = await sequelize.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'user_shift_assignments'
            ORDER BY ordinal_position
        `);
        console.log('\nCOLUMNAS DE USER_SHIFT_ASSIGNMENTS:');
        cols2.forEach(c => console.log('  - ' + c.column_name));

        const [cols3] = await sequelize.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'biometric_templates'
            ORDER BY ordinal_position
        `);
        console.log('\nCOLUMNAS DE BIOMETRIC_TEMPLATES:');
        cols3.forEach(c => console.log('  - ' + c.column_name));

        const [cols4] = await sequelize.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'kiosks'
            ORDER BY ordinal_position
        `);
        console.log('\nCOLUMNAS DE KIOSKS:');
        cols4.forEach(c => console.log('  - ' + c.column_name));

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await sequelize.close();
    }
}

checkColumns();
