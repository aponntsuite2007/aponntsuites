/**
 * Script para verificar la migración de entidades
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sequelize } = require('../src/config/database');

async function verify() {
    try {
        // Verificar entidades
        const [entities] = await sequelize.query(`
            SELECT pe.entity_code, pe.entity_name, pe.entity_type, pc.country_code
            FROM payroll_entities pe
            LEFT JOIN payroll_countries pc ON pe.country_id = pc.id
            ORDER BY pc.country_code, pe.entity_type, pe.entity_name
        `);

        console.log('🏢 Entidades por país:');
        let currentCountry = '';
        entities.forEach(e => {
            if (e.country_code !== currentCountry) {
                currentCountry = e.country_code || 'GLOBAL';
                console.log('\n📍 ' + currentCountry + ':');
            }
            const icon = e.entity_type === 'TAX_AUTHORITY' ? '🏛️' :
                        e.entity_type === 'HEALTH_INSURANCE' ? '🏥' :
                        e.entity_type === 'UNION' ? '👷' :
                        e.entity_type === 'PENSION_FUND' ? '💰' : '🏢';
            console.log('   ' + icon + ' ' + e.entity_code + ': ' + e.entity_name);
        });

        // Verificar columna entity_id
        const [cols] = await sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'payroll_template_concepts' AND column_name = 'entity_id'
        `);
        console.log('\n✅ Campo entity_id en payroll_template_concepts:', cols.length > 0 ? 'Sí' : 'No');

        // Verificar plantilla de recibo
        const [[template]] = await sequelize.query('SELECT COUNT(*) as count FROM payroll_payslip_templates');
        console.log('📄 Plantillas de recibo:', template.count);

        console.log('\n🎉 Sistema de Entidades listo!');
    } catch(e) {
        console.error('Error:', e.message);
    } finally {
        await sequelize.close();
    }
}

verify();
