/**
 * Script para verificar estado de los módulos después de unificación
 */
const { sequelize } = require('../src/config/database');

async function checkModules() {
    try {
        // 1. Verificar estado de privacy-regulations en system_modules
        const [privacyMod] = await sequelize.query(
            "SELECT module_key, name, is_active, metadata FROM system_modules WHERE module_key = 'privacy-regulations'"
        );
        console.log('=== privacy-regulations en system_modules ===');
        if (privacyMod.length > 0) {
            console.log('  module_key:', privacyMod[0].module_key);
            console.log('  name:', privacyMod[0].name);
            console.log('  is_active:', privacyMod[0].is_active);
        } else {
            console.log('  NO EXISTE');
        }

        // 2. Verificar estado de biometric-consent
        const [bioConsent] = await sequelize.query(
            "SELECT module_key, name, is_active, metadata FROM system_modules WHERE module_key = 'biometric-consent'"
        );
        console.log('\n=== biometric-consent en system_modules ===');
        if (bioConsent.length > 0) {
            console.log('  module_key:', bioConsent[0].module_key);
            console.log('  name:', bioConsent[0].name);
            console.log('  is_active:', bioConsent[0].is_active);
            console.log('  metadata:', JSON.stringify(bioConsent[0].metadata));
        } else {
            console.log('  NO EXISTE');
        }

        // 3. Verificar active_modules de ISI
        const [isi] = await sequelize.query(
            "SELECT active_modules FROM companies WHERE company_id = 11"
        );
        if (isi.length > 0) {
            const mods = typeof isi[0].active_modules === 'string'
                ? JSON.parse(isi[0].active_modules || '[]')
                : (isi[0].active_modules || []);
            console.log('\n=== active_modules de ISI (company_id=11) ===');
            console.log('  Has privacy-regulations:', mods.includes('privacy-regulations'));
            console.log('  Has biometric-consent:', mods.includes('biometric-consent'));
        }

        console.log('\n✅ Verificación completada');
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}
checkModules();
