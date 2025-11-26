const { Client } = require('pg');

async function checkMissingTables() {
    const client = new Client({
        connectionString: 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Tablas que deberían existir según el SQL
        const expectedTables = [
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

        // Verificar cuáles existen
        const existingTablesResult = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = ANY($1::text[])
        `, [expectedTables]);

        const existingTables = existingTablesResult.rows.map(r => r.table_name);
        const missingTables = expectedTables.filter(t => !existingTables.includes(t));

        console.log(`✅ Tablas existentes (${existingTables.length}/${expectedTables.length}):`);
        existingTables.sort().forEach((t, i) => console.log(`   ${i + 1}. ${t}`));

        console.log(`\n❌ Tablas faltantes (${missingTables.length}):`);
        missingTables.sort().forEach((t, i) => console.log(`   ${i + 1}. ${t}`));

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

checkMissingTables();
