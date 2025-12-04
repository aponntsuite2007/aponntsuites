/**
 * Script para arreglar active_modules de ISI
 * Reemplaza privacy-regulations por biometric-consent
 */
const { sequelize } = require('../src/config/database');

async function fix() {
    console.log('🔧 Fixing active_modules for ISI (company_id=11)...');

    // Obtener y limpiar el JSON
    const [rows] = await sequelize.query('SELECT active_modules FROM companies WHERE company_id = 11');
    let rawMods = rows[0]?.active_modules || '[]';

    console.log('Original length:', rawMods.length);

    // Detectar si hay arrays concatenados (][)
    if (rawMods.includes('][')) {
        console.log('⚠️  Arrays concatenados detectados - tomando primer array');
        const firstBracket = rawMods.indexOf(']');
        rawMods = rawMods.substring(0, firstBracket + 1);
    }

    // Parsear
    let mods;
    try {
        mods = JSON.parse(rawMods);
    } catch (e) {
        console.error('Error parseando JSON:', e.message);
        console.log('Raw:', rawMods.substring(0, 200));
        process.exit(1);
    }

    console.log('Módulos antes:', mods.length);
    console.log('Has privacy-regulations:', mods.includes('privacy-regulations'));
    console.log('Has biometric-consent:', mods.includes('biometric-consent'));

    // Reemplazar privacy-regulations por biometric-consent
    mods = mods.filter(m => m !== 'privacy-regulations');
    if (!mods.includes('biometric-consent')) {
        mods.push('biometric-consent');
    }

    // Guardar
    const newJson = JSON.stringify(mods);
    await sequelize.query('UPDATE companies SET active_modules = :mods WHERE company_id = 11', {
        replacements: { mods: newJson }
    });

    console.log('\n✅ Actualizado correctamente');
    console.log('Módulos después:', mods.length);
    console.log('Has biometric-consent:', mods.includes('biometric-consent'));
    console.log('Has privacy-regulations:', mods.includes('privacy-regulations'));

    process.exit(0);
}

fix().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
