/**
 * Check the schema of permissions related tables
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    dialect: 'postgresql',
    port: 5432,
    logging: false
});

async function checkPermissionsSchema() {
    try {
        await sequelize.authenticate();
        console.log('✅ Checking permissions table schema...');

        // Check user_permissions table
        const [userPermissionsSchema] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'user_permissions'
            ORDER BY ordinal_position;
        `);

        console.log(`\n📋 user_permissions table structure:`);
        userPermissionsSchema.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        // Check module_actions table
        const [moduleActionsSchema] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'module_actions'
            ORDER BY ordinal_position;
        `);

        console.log(`\n📋 module_actions table structure:`);
        if (moduleActionsSchema.length > 0) {
            moduleActionsSchema.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });
        } else {
            console.log(`  ❌ Table 'module_actions' does not exist`);
        }

        // Show sample user_permissions data
        const [samplePermissions] = await sequelize.query(`
            SELECT * FROM user_permissions LIMIT 3;
        `);

        console.log(`\n📋 Sample user_permissions data:`);
        samplePermissions.forEach((perm, index) => {
            console.log(`  ${index + 1}.`, JSON.stringify(perm, null, 2));
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

checkPermissionsSchema();