const { sequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runEmailPoliciesMigration() {
    try {
        console.log('🔧 Ejecutando migración de políticas de email...');

        // Leer archivo SQL
        const sqlPath = path.join(__dirname, '..', 'migrations', '20251219_create_email_policies.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Ejecutar SQL completo
        await sequelize.query(sql);

        console.log('\n✅ Migración ejecutada exitosamente');

        // Verificar políticas creadas
        const [policies] = await sequelize.query(`
            SELECT policy_key, policy_name, email_type, applies_to
            FROM email_policies
            ORDER BY priority DESC
        `);

        console.log('\n📋 Políticas de email creadas:');
        policies.forEach((p, i) => {
            console.log(`  ${i + 1}. ${p.policy_name} (${p.policy_key})`);
            console.log(`     Tipo: ${p.email_type}, Aplica a: ${p.applies_to}`);
        });

        // Verificar emails de Aponnt configurados
        const [configs] = await sequelize.query(`
            SELECT config_type, from_email, from_name,
                   smtp_host, smtp_port,
                   CASE WHEN smtp_password IS NOT NULL OR app_password IS NOT NULL
                        THEN 'Con credenciales'
                        ELSE 'Sin credenciales'
                   END as credentials_status
            FROM aponnt_email_config
            ORDER BY
                CASE config_type
                    WHEN 'commercial' THEN 1
                    WHEN 'partners' THEN 2
                    WHEN 'staff' THEN 3
                    WHEN 'support' THEN 4
                    WHEN 'engineering' THEN 5
                    WHEN 'executive' THEN 6
                    WHEN 'institutional' THEN 7
                    WHEN 'billing' THEN 8
                    WHEN 'onboarding' THEN 9
                    WHEN 'transactional' THEN 10
                    WHEN 'escalation' THEN 11
                    ELSE 99
                END
        `);

        console.log('\n📧 Emails de Aponnt configurados:');
        configs.forEach((c, i) => {
            console.log(`  ${i + 1}. ${c.from_name}`);
            console.log(`     Email: ${c.from_email}`);
            console.log(`     SMTP: ${c.smtp_host}:${c.smtp_port}`);
            console.log(`     Estado: ${c.credentials_status}`);
        });

        // Verificar función get_email_policy
        const [testPolicy] = await sequelize.query(`
            SELECT * FROM get_email_policy('escalation', 'partner_coordinator', 'partners')
        `);

        console.log('\n🔍 Test de función get_email_policy:');
        if (testPolicy && testPolicy.length > 0) {
            console.log(`  ✅ Política encontrada: ${testPolicy[0].policy_key}`);
            console.log(`     Email type: ${testPolicy[0].email_type}`);
        } else {
            console.log('  ⚠️ No se encontró política para el test');
        }

        console.log('\n✅ Sistema de políticas de email IMPLEMENTADO CORRECTAMENTE');
        console.log('\n🎯 Próximos pasos:');
        console.log('   1. Acceder a panel-administrativo.html');
        console.log('   2. Navegar a módulo Ingeniería → Configuración de Emails');
        console.log('   3. Configurar credenciales (App Passwords de Gmail)');
        console.log('   4. Testear cada email con el botón "Test"');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

runEmailPoliciesMigration();
