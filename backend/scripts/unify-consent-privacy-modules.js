/**
 * Script para unificar los módulos biometric-consent y privacy-regulations
 * El módulo biometric-consent ahora incluye ambas funcionalidades
 */
const { sequelize } = require('../src/config/database');

async function main() {
    try {
        console.log('=== Unificando módulos de Consentimientos y Privacidad ===\n');

        // 1. Actualizar el módulo biometric-consent con nuevo nombre y descripción
        console.log('1. Actualizando módulo biometric-consent...');

        await sequelize.query(`
            UPDATE system_modules
            SET
                name = 'Consentimientos y Privacidad',
                description = 'Gestión unificada de consentimientos biométricos y cumplimiento de regulaciones de privacidad multi-país (GDPR, LGPD, CCPA, Ley 25.326)',
                metadata = jsonb_set(
                    jsonb_set(
                        COALESCE(metadata, '{}'),
                        '{frontend_file}',
                        '"/js/modules/biometric-consent.js"'
                    ),
                    '{init_function}',
                    '"showBiometricConsentContent"'
                )
            WHERE module_key = 'biometric-consent'
        `);
        console.log('   ✅ Módulo biometric-consent actualizado');

        // 2. Verificar si privacy-regulations existe en system_modules
        const [privacyModule] = await sequelize.query(`
            SELECT module_key, name FROM system_modules WHERE module_key = 'privacy-regulations'
        `);

        if (privacyModule.length > 0) {
            console.log('\n2. Desactivando módulo privacy-regulations...');

            // Desactivar el módulo en system_modules
            await sequelize.query(`
                UPDATE system_modules
                SET is_active = false
                WHERE module_key = 'privacy-regulations'
            `);
            console.log('   ✅ Módulo privacy-regulations desactivado');
        } else {
            console.log('\n2. El módulo privacy-regulations no existe en system_modules (OK)');
        }

        // 3. Remover privacy-regulations de active_modules de ISI (company_id=11)
        console.log('\n3. Limpiando active_modules de ISI...');

        const [companies] = await sequelize.query(`
            SELECT company_id, name, active_modules FROM companies WHERE company_id = 11
        `);

        if (companies.length > 0) {
            let activeModules = [];
            const company = companies[0];

            if (company.active_modules) {
                if (typeof company.active_modules === 'string') {
                    activeModules = JSON.parse(company.active_modules);
                } else if (Array.isArray(company.active_modules)) {
                    activeModules = company.active_modules;
                }
            }

            // Remover privacy-regulations si existe
            const originalLength = activeModules.length;
            activeModules = activeModules.filter(m => m !== 'privacy-regulations');

            // Asegurar que biometric-consent esté presente
            if (!activeModules.includes('biometric-consent')) {
                activeModules.push('biometric-consent');
            }

            if (activeModules.length !== originalLength || !activeModules.includes('biometric-consent')) {
                await sequelize.query(`
                    UPDATE companies SET active_modules = :modules WHERE company_id = 11
                `, {
                    replacements: { modules: JSON.stringify(activeModules) },
                    type: sequelize.QueryTypes.UPDATE
                });
                console.log('   ✅ active_modules actualizado');
            } else {
                console.log('   ℹ️  No se requieren cambios en active_modules');
            }
        }

        // 4. Verificar resultado
        console.log('\n=== Verificación Final ===\n');

        const [updatedModule] = await sequelize.query(`
            SELECT module_key, name, description, is_active, metadata
            FROM system_modules
            WHERE module_key = 'biometric-consent'
        `);

        if (updatedModule.length > 0) {
            const mod = updatedModule[0];
            console.log('Módulo unificado:');
            console.log(`  - Key: ${mod.module_key}`);
            console.log(`  - Nombre: ${mod.name}`);
            console.log(`  - Activo: ${mod.is_active}`);
            console.log(`  - Metadata: ${JSON.stringify(mod.metadata)}`);
        }

        const [finalCompany] = await sequelize.query(`
            SELECT active_modules FROM companies WHERE company_id = 11
        `);

        if (finalCompany.length > 0) {
            const modules = JSON.parse(finalCompany[0].active_modules);
            console.log('\nMódulos activos de ISI:');
            console.log(`  - Total: ${modules.length}`);
            console.log(`  - Incluye biometric-consent: ${modules.includes('biometric-consent')}`);
            console.log(`  - Incluye privacy-regulations: ${modules.includes('privacy-regulations')}`);
        }

        console.log('\n✅ Unificación completada exitosamente\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
