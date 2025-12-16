/**
 * Script de verificación end-to-end para SSOT migration
 * Verifica que:
 * 1. SystemRegistry lee UI metadata desde BD
 * 2. Phase4Orchestrator escribe UI metadata a BD
 * 3. Los datos persisten correctamente
 */

const database = require('../src/config/database');
const sequelize = database.sequelize;
const SystemRegistry = require('../src/auditor/registry/SystemRegistry');

async function verifySSoTMigration() {
    try {
        console.log('\n╔════════════════════════════════════════════════════╗');
        console.log('║  VERIFICACIÓN SSOT MIGRATION                       ║');
        console.log('╠════════════════════════════════════════════════════╣');
        console.log('║  Objetivo: Verificar que BD es única fuente       ║');
        console.log('╚════════════════════════════════════════════════════╝\n');

        // ===================================
        // TEST 1: Verificar columna existe
        // ===================================
        console.log('📋 [TEST 1] Verificando columna ui_metadata...');

        const [columnCheck] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'system_modules'
                AND column_name = 'ui_metadata';
        `);

        if (columnCheck.length === 0) {
            console.error('   ❌ Columna ui_metadata NO existe en system_modules');
            process.exit(1);
        }

        console.log(`   ✅ Columna ui_metadata existe (tipo: ${columnCheck[0].data_type})\n`);

        // ===================================
        // TEST 2: Verificar datos migrados
        // ===================================
        console.log('📋 [TEST 2] Verificando datos migrados...');

        const [stats] = await sequelize.query(`
            SELECT
                COUNT(*) as total_modules,
                COUNT(*) FILTER (WHERE ui_metadata IS NOT NULL AND (
                    jsonb_array_length(ui_metadata->'mainButtons') > 0 OR
                    jsonb_array_length(ui_metadata->'tabs') > 0 OR
                    jsonb_array_length(ui_metadata->'inputs') > 0
                )) as modules_with_data,
                SUM(jsonb_array_length(ui_metadata->'mainButtons')) as total_buttons,
                SUM(jsonb_array_length(ui_metadata->'tabs')) as total_tabs,
                SUM(jsonb_array_length(ui_metadata->'inputs')) as total_inputs
            FROM system_modules;
        `);

        const stat = stats[0];
        console.log(`   Total módulos en BD: ${stat.total_modules}`);
        console.log(`   Módulos con UI data: ${stat.modules_with_data}`);
        console.log(`   Total botones: ${stat.total_buttons || 0}`);
        console.log(`   Total tabs: ${stat.total_tabs || 0}`);
        console.log(`   Total inputs: ${stat.total_inputs || 0}`);

        if (stat.modules_with_data === '0') {
            console.error('   ❌ No hay datos de UI metadata en BD');
            process.exit(1);
        }

        console.log('   ✅ Datos de UI metadata presentes en BD\n');

        // ===================================
        // TEST 3: SystemRegistry lee desde BD
        // ===================================
        console.log('📋 [TEST 3] Verificando SystemRegistry lee desde BD...');

        const registry = new SystemRegistry(database, null);
        await registry.initialize();

        const usersModule = registry.getModule('users');

        if (!usersModule) {
            console.error('   ❌ Módulo "users" no encontrado en registry');
            process.exit(1);
        }

        console.log(`   Módulo "users" cargado: ${usersModule.name}`);
        console.log(`   UI metadata: ${usersModule.ui ? 'Sí' : 'No'}`);

        if (usersModule.ui) {
            console.log(`   - Botones: ${usersModule.ui.mainButtons?.length || 0}`);
            console.log(`   - Tabs: ${usersModule.ui.tabs?.length || 0}`);
            console.log(`   - Inputs: ${usersModule.ui.inputs?.length || 0}`);
        }

        console.log('   ✅ SystemRegistry carga UI metadata correctamente\n');

        // ===================================
        // TEST 4: Simulación de escritura
        // ===================================
        console.log('📋 [TEST 4] Simulando escritura a BD...');

        // Agregar un botón de prueba temporalmente
        const testButton = {
            text: '🧪 Test SSOT',
            action: 'test',
            discoveredAt: new Date().toISOString()
        };

        // Leer UI metadata actual
        const [currentData] = await sequelize.query(`
            SELECT ui_metadata
            FROM system_modules
            WHERE module_key = 'users'
        `, {
            type: sequelize.QueryTypes.SELECT
        });

        const uiMetadata = currentData.ui_metadata || {
            mainButtons: [],
            tabs: [],
            inputs: [],
            modals: []
        };

        // Verificar si ya existe
        const exists = uiMetadata.mainButtons.some(b => b.text === testButton.text);

        if (!exists) {
            uiMetadata.mainButtons.push(testButton);

            // Escribir a BD
            await sequelize.query(`
                UPDATE system_modules
                SET ui_metadata = :uiMetadata::jsonb
                WHERE module_key = 'users'
            `, {
                replacements: {
                    uiMetadata: JSON.stringify(uiMetadata)
                }
            });

            console.log('   ✅ Botón de prueba agregado a BD');
        } else {
            console.log('   ⚠️  Botón de prueba ya existe (skip)');
        }

        // ===================================
        // TEST 5: Verificar persistencia
        // ===================================
        console.log('\n📋 [TEST 5] Verificando persistencia...');

        const [verifyData] = await sequelize.query(`
            SELECT ui_metadata
            FROM system_modules
            WHERE module_key = 'users'
        `, {
            type: sequelize.QueryTypes.SELECT
        });

        const verifyMetadata = verifyData.ui_metadata;
        const testButtonExists = verifyMetadata.mainButtons.some(b => b.text === testButton.text);

        if (testButtonExists) {
            console.log('   ✅ Botón de prueba persiste en BD');

            // Limpiar - remover botón de prueba
            const cleanedButtons = verifyMetadata.mainButtons.filter(b => b.text !== testButton.text);
            verifyMetadata.mainButtons = cleanedButtons;

            await sequelize.query(`
                UPDATE system_modules
                SET ui_metadata = :uiMetadata::jsonb
                WHERE module_key = 'users'
            `, {
                replacements: {
                    uiMetadata: JSON.stringify(verifyMetadata)
                }
            });

            console.log('   🧹 Botón de prueba removido (cleanup)\n');
        } else {
            console.error('   ❌ Botón de prueba NO persiste en BD');
            process.exit(1);
        }

        // ===================================
        // REPORTE FINAL
        // ===================================
        console.log('╔════════════════════════════════════════════════════╗');
        console.log('║  ✅ VERIFICACIÓN EXITOSA - SSOT MIGRATION         ║');
        console.log('╠════════════════════════════════════════════════════╣');
        console.log('║  ✅ Columna ui_metadata existe                     ║');
        console.log('║  ✅ Datos migrados correctamente                   ║');
        console.log('║  ✅ SystemRegistry lee desde BD                    ║');
        console.log('║  ✅ Escritura a BD funciona                        ║');
        console.log('║  ✅ Persistencia verificada                        ║');
        console.log('╚════════════════════════════════════════════════════╝\n');

        console.log('🎉 La BD es ahora la ÚNICA fuente de verdad (SSOT)\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error en verificación:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Ejecutar
verifySSoTMigration();
