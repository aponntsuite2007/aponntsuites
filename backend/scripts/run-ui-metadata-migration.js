/**
 * Script para ejecutar migración de ui_metadata a BD
 * Agrega columna ui_metadata JSONB a system_modules
 */

const { sequelize } = require('../src/config/database');

async function runMigration() {
    try {
        console.log('🚀 [MIGRATION] Iniciando migración ui_metadata...\n');

        // 1. Agregar columna ui_metadata JSONB
        console.log('📋 [MIGRATION] Agregando columna ui_metadata...');
        try {
            await sequelize.query(`
                ALTER TABLE system_modules
                ADD COLUMN IF NOT EXISTS ui_metadata JSONB DEFAULT '{
                  "mainButtons": [],
                  "tabs": [],
                  "inputs": [],
                  "modals": []
                }'::jsonb;
            `);
            console.log('   ✅ Columna agregada\n');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('   ⚠️  Columna ya existe (skip)\n');
            } else {
                throw error;
            }
        }

        // 2. Crear índice GIN para búsquedas rápidas
        console.log('📋 [MIGRATION] Creando índice GIN...');
        try {
            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_system_modules_ui_metadata
                ON system_modules USING GIN (ui_metadata);
            `);
            console.log('   ✅ Índice creado\n');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('   ⚠️  Índice ya existe (skip)\n');
            } else {
                throw error;
            }
        }

        // 3. Agregar comentario descriptivo
        console.log('📋 [MIGRATION] Agregando comentario...');
        try {
            await sequelize.query(`
                COMMENT ON COLUMN system_modules.ui_metadata IS
                'UI metadata discovered by Phase4 Auto-Healing (buttons, tabs, inputs, modals)';
            `);
            console.log('   ✅ Comentario agregado\n');
        } catch (error) {
            console.log('   ⚠️  Error agregando comentario (skip)\n');
        }

        // Verificar que se agregó correctamente
        console.log('🔍 [MIGRATION] Verificando columna agregada...\n');

        const [results] = await sequelize.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'system_modules' AND column_name = 'ui_metadata';
        `);

        if (results.length > 0) {
            console.log('✅ [MIGRATION] Columna ui_metadata agregada exitosamente:');
            console.log(`   - Tipo: ${results[0].data_type}`);
            console.log(`   - Default: ${results[0].column_default ? 'Sí' : 'No'}\n`);

            // Verificar data en 5 módulos
            const [modules] = await sequelize.query(`
                SELECT
                    module_key,
                    ui_metadata IS NOT NULL as has_ui_metadata,
                    CASE
                        WHEN ui_metadata IS NOT NULL THEN jsonb_array_length(ui_metadata->'mainButtons')
                        ELSE 0
                    END as buttons_count
                FROM system_modules
                LIMIT 5;
            `);

            console.log('📊 [MIGRATION] Primeros 5 módulos:');
            modules.forEach(m => {
                console.log(`   - ${m.module_key}: has_ui=${m.has_ui_metadata}, buttons=${m.buttons_count || 0}`);
            });

            console.log('\n🎉 [MIGRATION] Migración completada exitosamente!\n');
            process.exit(0);

        } else {
            console.error('❌ [MIGRATION] Columna ui_metadata NO fue agregada');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ [MIGRATION] Error ejecutando migración:', error.message);
        process.exit(1);
    }
}

// Ejecutar
runMigration();
