const { Client } = require('pg');

async function verifyDeployment() {
    const client = new Client({
        connectionString: 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Conectando a Render...');
        await client.connect();
        console.log('✅ Conectado\n');

        // 1. Verificar todas las tablas del sistema de notificaciones
        console.log('📋 Verificando tablas del sistema de notificaciones...');
        const tablesResult = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND (
                table_name LIKE '%notification%'
                OR table_name LIKE '%compliance%'
                OR table_name LIKE '%sla%'
                OR table_name LIKE '%proactive%'
                OR table_name LIKE '%audit%'
            )
            ORDER BY table_name
        `);

        console.log(`✅ Encontradas ${tablesResult.rows.length} tablas:\n`);
        tablesResult.rows.forEach((row, i) => {
            console.log(`   ${i + 1}. ${row.table_name}`);
        });

        // 2. Verificar datos en notification_participant_types
        console.log('\n📋 Verificando tipos de participantes...');
        const participantTypesResult = await client.query(`
            SELECT type_code, name FROM notification_participant_types ORDER BY type_code
        `);

        console.log(`✅ ${participantTypesResult.rows.length} tipos de participantes:\n`);
        participantTypesResult.rows.forEach((row, i) => {
            console.log(`   ${i + 1}. ${row.type_code} - ${row.name}`);
        });

        // 3. Verificar datos en compliance_rules
        console.log('\n📋 Verificando reglas de cumplimiento LCT...');
        const complianceRulesResult = await client.query(`
            SELECT rule_code, legal_reference, severity FROM compliance_rules ORDER BY rule_code
        `);

        console.log(`✅ ${complianceRulesResult.rows.length} reglas de cumplimiento:\n`);
        complianceRulesResult.rows.forEach((row, i) => {
            console.log(`   ${i + 1}. ${row.rule_code}`);
            console.log(`      ${row.legal_reference} [${row.severity}]`);
        });

        // 4. Verificar estructura de tablas principales
        console.log('\n📋 Verificando estructura de notification_groups...');
        const groupsStructure = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'notification_groups'
            ORDER BY ordinal_position
        `);
        console.log(`✅ ${groupsStructure.rows.length} columnas en notification_groups`);

        console.log('\n📋 Verificando estructura de notification_messages...');
        const messagesStructure = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'notification_messages'
            ORDER BY ordinal_position
        `);
        console.log(`✅ ${messagesStructure.rows.length} columnas en notification_messages`);

        // 5. Resumen final
        console.log('\n' + '='.repeat(60));
        console.log('🎉 VERIFICACIÓN COMPLETA - SISTEMA OPERACIONAL');
        console.log('='.repeat(60));
        console.log(`✅ Tablas creadas: ${tablesResult.rows.length}`);
        console.log(`✅ Tipos de participantes: ${participantTypesResult.rows.length}`);
        console.log(`✅ Reglas LCT: ${complianceRulesResult.rows.length}`);
        console.log(`✅ Base de datos: Render PostgreSQL`);
        console.log(`✅ Estado: Listo para pruebas\n`);

    } catch (error) {
        console.error('❌ Error en verificación:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Conexión cerrada');
    }
}

verifyDeployment();
