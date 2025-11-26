const { Client } = require('pg');

async function verifyAllTables() {
    const client = new Client({
        connectionString: 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Lista completa de tablas del Sistema de Notificaciones V2.0
        const systemTables = [
            'notification_groups',
            'notification_messages',
            'notification_audit_log',
            'notification_participant_types',
            'request_types',
            'notification_flow_templates',
            'system_modules',
            'company_modules',
            'business_validations',
            'compliance_rules',
            'compliance_violations',
            'sla_metrics',
            'notification_context_data',
            'cost_budgets',
            'cost_transactions',
            'proactive_rules',
            'proactive_executions',
            'approved_shift_swaps',
            'calendar_integrations',
            'calendar_events',
            'used_tokens',
            'notification_escalations',
            'audit_reports',
            'report_access_log'
        ];

        console.log('═══════════════════════════════════════════════════════════');
        console.log('  VERIFICACIÓN COMPLETA - SISTEMA DE NOTIFICACIONES V2.0');
        console.log('═══════════════════════════════════════════════════════════\n');

        // Verificar cada tabla
        const results = [];
        for (const tableName of systemTables) {
            const checkResult = await client.query(`
                SELECT
                    COUNT(*) as column_count
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = $1
            `, [tableName]);

            const exists = checkResult.rows[0].column_count > 0;
            results.push({
                name: tableName,
                exists: exists,
                columns: exists ? parseInt(checkResult.rows[0].column_count) : 0
            });
        }

        // Separar por categoría
        const categories = {
            'Notificaciones Base': ['notification_groups', 'notification_messages', 'notification_audit_log'],
            'Flujos y Participantes': ['notification_participant_types', 'request_types', 'notification_flow_templates'],
            'Sistema Modular': ['system_modules', 'company_modules', 'business_validations'],
            'Compliance y Métricas': ['compliance_rules', 'compliance_violations', 'sla_metrics', 'notification_context_data'],
            'Centro de Costos': ['cost_budgets', 'cost_transactions'],
            'Notificaciones Proactivas': ['proactive_rules', 'proactive_executions'],
            'Cambios de Turno': ['approved_shift_swaps'],
            'Integraciones': ['calendar_integrations', 'calendar_events'],
            'Seguridad': ['used_tokens', 'notification_escalations'],
            'Reportes de Auditoría': ['audit_reports', 'report_access_log']
        };

        let totalCreated = 0;
        let totalMissing = 0;

        for (const [category, tables] of Object.entries(categories)) {
            console.log(`📂 ${category}`);
            for (const tableName of tables) {
                const result = results.find(r => r.name === tableName);
                if (result.exists) {
                    console.log(`   ✅ ${tableName} (${result.columns} columnas)`);
                    totalCreated++;
                } else {
                    console.log(`   ❌ ${tableName} - NO CREADA`);
                    totalMissing++;
                }
            }
            console.log('');
        }

        // Verificar datos
        console.log('📊 DATOS INSERTADOS:');

        const participantTypesCount = await client.query('SELECT COUNT(*) FROM notification_participant_types');
        console.log(`   ✅ Tipos de participantes: ${participantTypesCount.rows[0].count}`);

        const complianceRulesCount = await client.query('SELECT COUNT(*) FROM compliance_rules');
        console.log(`   ✅ Reglas de cumplimiento LCT: ${complianceRulesCount.rows[0].count}`);

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  RESUMEN FINAL');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`✅ Tablas creadas: ${totalCreated}/${systemTables.length}`);
        console.log(`❌ Tablas faltantes: ${totalMissing}`);
        console.log(`📋 Base de datos: Render PostgreSQL`);
        console.log(`🎯 Estado: ${totalMissing === 0 ? 'COMPLETO' : 'PARCIAL'}`);
        console.log('═══════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

verifyAllTables();
