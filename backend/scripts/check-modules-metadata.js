/**
 * Script para revisar metadata de módulos y actualizar privacy-regulations
 */
const { sequelize } = require('../src/config/database');

async function main() {
    try {
        console.log('=== Revisando UnifiedKnowledgeService ===\n');

        // Ver un módulo que funcione para entender el patrón
        const [existingModules] = await sequelize.query(`
            SELECT module_key, name, metadata
            FROM system_modules
            WHERE module_key IN ('users', 'attendance', 'biometric-consent')
        `);

        console.log('Módulos existentes:');
        existingModules.forEach(m => {
            console.log(`  - ${m.module_key}: metadata = ${JSON.stringify(m.metadata)}`);
        });

        // Actualizar el módulo privacy-regulations con la metadata correcta
        console.log('\n=== Actualizando privacy-regulations con frontend_file ===\n');

        await sequelize.query(`
            UPDATE system_modules
            SET metadata = jsonb_set(
                COALESCE(metadata, '{}'),
                '{frontend_file}',
                '"/js/modules/privacy-regulations.js"'
            )
            WHERE module_key = 'privacy-regulations'
        `);

        await sequelize.query(`
            UPDATE system_modules
            SET metadata = jsonb_set(
                metadata,
                '{init_function}',
                '"PrivacyRegulationsDashboard.init"'
            )
            WHERE module_key = 'privacy-regulations'
        `);

        // Verificar resultado
        const [updated] = await sequelize.query(`
            SELECT module_key, name, metadata
            FROM system_modules
            WHERE module_key = 'privacy-regulations'
        `);

        console.log('Módulo actualizado:');
        console.log(JSON.stringify(updated[0], null, 2));

        console.log('\n✅ Done');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
