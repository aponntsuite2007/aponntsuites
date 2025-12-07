const { sequelize } = require('../src/config/database');

async function main() {
    const [cols] = await sequelize.query(`
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users' AND table_schema = 'public'
        ORDER BY ordinal_position
    `);

    console.log('// TODAS las columnas de users en LOCAL:');
    console.log('const ALL_USER_COLUMNS = [');
    cols.forEach(c => {
        let type = c.data_type.toUpperCase();
        if (type === 'CHARACTER VARYING') type = 'VARCHAR(255)';
        if (type === 'TIMESTAMP WITH TIME ZONE') type = 'TIMESTAMPTZ';
        if (type === 'TIMESTAMP WITHOUT TIME ZONE') type = 'TIMESTAMP';
        if (type === 'ARRAY') type = 'TEXT[]';
        if (type === 'USER-DEFINED') type = 'JSONB';
        if (type === 'BIGINT') type = 'BIGINT';
        if (type === 'INTEGER') type = 'INTEGER';
        if (type === 'BOOLEAN') type = 'BOOLEAN';
        if (type === 'NUMERIC') type = 'DECIMAL(12,2)';
        if (type === 'DATE') type = 'DATE';
        if (type === 'TEXT') type = 'TEXT';
        if (type === 'UUID') type = 'UUID';

        let def = '';
        if (c.column_default) {
            if (c.column_default.includes('nextval')) def = '';
            else def = ' DEFAULT ' + c.column_default.replace(/'/g, "\\'");
        }

        console.log(`    { col: '${c.column_name}', type: '${type}${def}' },`);
    });
    console.log('];');
    console.log(`\n// Total: ${cols.length} columnas`);

    await sequelize.close();
}
main().catch(e => { console.error(e); process.exit(1); });
