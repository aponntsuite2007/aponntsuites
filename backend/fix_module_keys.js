const { Client } = require('pg');

async function fixModuleKeys() {
    const client = new Client({
        connectionString: 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Conectando a PostgreSQL...');
        await client.connect();
        console.log('✅ Conectado\n');

        // Mapeo de keys incorrectas a correctas
        const keyMappings = [
            { old: 'comply', new: 'compliance-dashboard' },
            { old: 'sla', new: 'sla-tracking' },
            { old: 'audit', new: 'audit-reports' },
            { old: 'proactive', new: 'proactive-notifications' },
            { old: 'resources', new: 'resource-center' }
        ];

        console.log('📝 Actualizando module_keys...\n');

        for (const mapping of keyMappings) {
            const result = await client.query(`
                UPDATE system_modules
                SET module_key = $1
                WHERE module_key = $2
                RETURNING id, name, module_key
            `, [mapping.new, mapping.old]);

            if (result.rows.length > 0) {
                console.log(`   ✅ Actualizado: ${mapping.old} → ${mapping.new}`);
                console.log(`      Nombre: ${result.rows[0].name}`);
            } else {
                console.log(`   ⏭️  No encontrado: ${mapping.old}`);
            }
        }

        // Verificar resultado final
        console.log('\n📋 Verificando módulos de notificaciones:\n');
        const finalModules = await client.query(`
            SELECT module_key, name
            FROM system_modules
            WHERE module_key LIKE '%compliance%'
               OR module_key LIKE '%sla%'
               OR module_key LIKE '%audit%'
               OR module_key LIKE '%proactive%'
               OR module_key LIKE '%resource%'
            ORDER BY name
        `);

        finalModules.rows.forEach((m, i) => {
            console.log(`   ✅ ${i + 1}. ${m.module_key} - ${m.name}`);
        });

        console.log('\n🎉 Keys actualizadas correctamente');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

fixModuleKeys();
