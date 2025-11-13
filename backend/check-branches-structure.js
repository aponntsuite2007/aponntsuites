/**
 * Verificar estructura de tabla branches
 */

require('dotenv').config();
const database = require('./src/config/database');

async function checkBranchesStructure() {
    try {
        console.log('\n📊 Estructura de tabla branches:\n');

        const [columns] = await database.sequelize.query(`
            SELECT
                column_name,
                data_type,
                column_default,
                is_nullable,
                character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'branches'
            ORDER BY ordinal_position
        `);

        columns.forEach(col => {
            console.log(`- ${col.column_name}:`);
            console.log(`  Tipo: ${col.data_type}`);
            console.log(`  Default: ${col.column_default || 'NULL'}`);
            console.log(`  Nullable: ${col.is_nullable}`);
            console.log('');
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkBranchesStructure();
