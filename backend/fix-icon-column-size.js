const database = require('./src/config/database');

async function fixIconColumnSize() {
    try {
        console.log('🔍 Verificando tamaño de columna icon...\n');

        // Verificar tamaño actual
        const [columns] = await database.sequelize.query(`
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'system_modules'
            AND column_name = 'icon'
        `);

        if (columns.length > 0) {
            console.log('📊 Columna actual:');
            console.log(`   Nombre: ${columns[0].column_name}`);
            console.log(`   Tipo: ${columns[0].data_type}`);
            console.log(`   Tamaño: ${columns[0].character_maximum_length || 'N/A'}\n`);
        }

        // Ampliar la columna a 50 caracteres (suficiente para Font Awesome)
        console.log('🔧 Ampliando columna icon a VARCHAR(50)...');
        await database.sequelize.query(`
            ALTER TABLE system_modules
            ALTER COLUMN icon TYPE VARCHAR(50)
        `);

        console.log('✅ Columna ampliada exitosamente\n');

        // Verificar cambio
        const [columnsAfter] = await database.sequelize.query(`
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'system_modules'
            AND column_name = 'icon'
        `);

        console.log('📊 Columna después del cambio:');
        console.log(`   Nombre: ${columnsAfter[0].column_name}`);
        console.log(`   Tipo: ${columnsAfter[0].data_type}`);
        console.log(`   Tamaño: ${columnsAfter[0].character_maximum_length || 'N/A'}\n`);

        console.log('🎉 Ahora puedes ejecutar fix-module-icons.js');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await database.sequelize.close();
    }
}

fixIconColumnSize();
