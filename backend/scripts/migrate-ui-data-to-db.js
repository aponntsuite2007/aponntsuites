/**
 * Script para migrar UI metadata desde JSON a BD
 * Copia datos de modules-registry.json a system_modules.ui_metadata
 */

const { sequelize } = require('../src/config/database');
const fs = require('fs/promises');
const path = require('path');

async function migrateUIData() {
    try {
        console.log('🚀 [DATA-MIGRATION] Iniciando migración de UI metadata JSON → BD...\n');

        // 1. Leer modules-registry.json
        const registryPath = path.join(__dirname, '../src/auditor/registry/modules-registry.json');
        const registryData = await fs.readFile(registryPath, 'utf8');
        const registry = JSON.parse(registryData);

        console.log(`📋 [DATA-MIGRATION] Archivo JSON leído: ${registry.modules.length} módulos\n`);

        let modulesWithUI = 0;
        let modulesUpdated = 0;
        let errors = [];

        // 2. Iterar sobre cada módulo
        for (const module of registry.modules) {
            const moduleKey = module.id;
            const uiData = module.ui;

            // Verificar si tiene UI metadata
            if (!uiData || (
                (!uiData.mainButtons || uiData.mainButtons.length === 0) &&
                (!uiData.tabs || uiData.tabs.length === 0) &&
                (!uiData.inputs || uiData.inputs.length === 0) &&
                (!uiData.modals || uiData.modals.length === 0)
            )) {
                // No tiene UI metadata, skip
                continue;
            }

            modulesWithUI++;

            // Preparar objeto UI metadata (asegurar estructura completa)
            const uiMetadata = {
                mainButtons: uiData.mainButtons || [],
                tabs: uiData.tabs || [],
                inputs: uiData.inputs || [],
                modals: uiData.modals || []
            };

            console.log(`   📦 ${moduleKey}:`);
            console.log(`      - Buttons: ${uiMetadata.mainButtons.length}`);
            console.log(`      - Tabs: ${uiMetadata.tabs.length}`);
            console.log(`      - Inputs: ${uiMetadata.inputs.length}`);
            console.log(`      - Modals: ${uiMetadata.modals.length}`);

            try {
                // 3. Actualizar en BD
                const [result] = await sequelize.query(`
                    UPDATE system_modules
                    SET ui_metadata = :uiMetadata::jsonb
                    WHERE module_key = :moduleKey;
                `, {
                    replacements: {
                        moduleKey: moduleKey,
                        uiMetadata: JSON.stringify(uiMetadata)
                    }
                });

                if (result && result.rowCount > 0) {
                    modulesUpdated++;
                    console.log(`      ✅ Actualizado en BD\n`);
                } else {
                    console.log(`      ⚠️  Módulo no existe en BD (skip)\n`);
                }

            } catch (error) {
                errors.push({ moduleKey, error: error.message });
                console.log(`      ❌ Error: ${error.message}\n`);
            }
        }

        // 4. Reporte final
        console.log('\n╔════════════════════════════════════════════════════╗');
        console.log('║  REPORTE FINAL - MIGRACIÓN UI METADATA            ║');
        console.log('╠════════════════════════════════════════════════════╣');
        console.log(`║  Total módulos en JSON: ${registry.modules.length.toString().padEnd(26)} ║`);
        console.log(`║  Módulos con UI metadata: ${modulesWithUI.toString().padEnd(24)} ║`);
        console.log(`║  Módulos actualizados en BD: ${modulesUpdated.toString().padEnd(19)} ║`);
        console.log(`║  Errores: ${errors.length.toString().padEnd(38)} ║`);
        console.log('╚════════════════════════════════════════════════════╝\n');

        if (errors.length > 0) {
            console.log('⚠️  Errores encontrados:');
            errors.forEach(e => {
                console.log(`   - ${e.moduleKey}: ${e.error}`);
            });
            console.log('');
        }

        // 5. Verificación final - Leer desde BD
        console.log('🔍 [VERIFICATION] Verificando datos migrados...\n');

        const [verificationResults] = await sequelize.query(`
            SELECT
                module_key,
                ui_metadata IS NOT NULL as has_ui,
                jsonb_array_length(ui_metadata->'mainButtons') as buttons_count,
                jsonb_array_length(ui_metadata->'tabs') as tabs_count,
                jsonb_array_length(ui_metadata->'inputs') as inputs_count,
                jsonb_array_length(ui_metadata->'modals') as modals_count
            FROM system_modules
            WHERE ui_metadata IS NOT NULL
                AND (
                    jsonb_array_length(ui_metadata->'mainButtons') > 0
                    OR jsonb_array_length(ui_metadata->'tabs') > 0
                    OR jsonb_array_length(ui_metadata->'inputs') > 0
                    OR jsonb_array_length(ui_metadata->'modals') > 0
                )
            ORDER BY module_key
            LIMIT 10;
        `);

        console.log('📊 Primeros 10 módulos con UI metadata en BD:');
        verificationResults.forEach(m => {
            console.log(`   - ${m.module_key}: B=${m.buttons_count || 0}, T=${m.tabs_count || 0}, I=${m.inputs_count || 0}, M=${m.modals_count || 0}`);
        });

        console.log('\n🎉 [DATA-MIGRATION] Migración completada exitosamente!\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ [DATA-MIGRATION] Error fatal:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Ejecutar
migrateUIData();
