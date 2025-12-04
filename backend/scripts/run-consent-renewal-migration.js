/**
 * Script para ejecutar migración de regla de renovación de consentimiento
 */
const { sequelize } = require('../src/config/database');

async function runMigration() {
    try {
        console.log('🚀 Ejecutando migración de regla consent_renewal...');

        // Insertar regla para cada empresa existente (solo si no existe ya)
        const result = await sequelize.query(`
            INSERT INTO proactive_rules (
                company_id,
                rule_name,
                rule_type,
                trigger_threshold,
                auto_action,
                notification_recipients,
                priority,
                check_frequency,
                active
            )
            SELECT
                c.company_id,
                'Renovación de Consentimiento Biométrico',
                'consent_renewal',
                '{"days_before_expiry": 30}'::jsonb,
                'notify',
                '["hr_admin", "employee"]'::jsonb,
                'high',
                'daily',
                true
            FROM companies c
            WHERE c.is_active = true
            AND NOT EXISTS (
                SELECT 1 FROM proactive_rules pr
                WHERE pr.company_id = c.company_id
                AND pr.rule_type = 'consent_renewal'
            )
            RETURNING company_id, rule_name
        `);

        const createdRules = result[0] || [];
        console.log(`✅ Se crearon ${createdRules.length} reglas de renovación de consentimiento:`);
        createdRules.forEach(r => {
            console.log(`   - Empresa ${r.company_id}: ${r.rule_name}`);
        });

        // Verificar reglas existentes
        const existingRules = await sequelize.query(`
            SELECT pr.id, pr.company_id, c.name as company_name, pr.rule_name, pr.active
            FROM proactive_rules pr
            JOIN companies c ON c.company_id = pr.company_id
            WHERE pr.rule_type = 'consent_renewal'
            ORDER BY pr.company_id
        `);

        console.log('\n📋 Reglas consent_renewal existentes:');
        (existingRules[0] || []).forEach(r => {
            console.log(`   ID ${r.id}: ${r.company_name} - ${r.rule_name} (${r.active ? 'activa' : 'inactiva'})`);
        });

        console.log('\n✅ Migración completada exitosamente');

    } catch (error) {
        console.error('❌ Error en migración:', error.message);
        if (error.message.includes('proactive_rules')) {
            console.log('ℹ️  Es posible que la tabla proactive_rules no exista todavía.');
            console.log('   La regla se creará automáticamente cuando se configure el módulo de notificaciones.');
        }
    }

    process.exit(0);
}

runMigration();
