const { Client } = require('pg');

async function assignNotificationModules() {
    const client = new Client({
        connectionString: 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Conectando a PostgreSQL...');
        await client.connect();
        console.log('✅ Conectado\n');

        const companyId = 11; // ISI

        // 1. Verificar módulos actuales de ISI
        console.log('📋 Verificando módulos actuales de ISI...');
        const currentModules = await client.query(`
            SELECT cm.id, cm.module_code, sm.module_name, cm.is_active
            FROM company_modules cm
            JOIN system_modules sm ON cm.module_code = sm.module_code
            WHERE cm.company_id = $1
            ORDER BY sm.module_name
        `, [companyId]);

        console.log(`✅ ISI tiene ${currentModules.rows.length} módulos contratados:\n`);
        currentModules.rows.forEach((m, i) => {
            console.log(`   ${i + 1}. ${m.module_code} - ${m.module_name} (${m.is_active ? 'Activo' : 'Inactivo'})`);
        });

        // 2. Verificar si existen los módulos del Sistema de Notificaciones V2.0 en system_modules
        console.log('\n📋 Verificando módulos de Sistema de Notificaciones V2.0...');
        const notificationModules = [
            'compliance-dashboard',
            'sla-tracking',
            'audit-reports',
            'proactive-notifications',
            'resource-center'
        ];

        const existingSystemModules = await client.query(`
            SELECT module_code, module_name
            FROM system_modules
            WHERE module_code = ANY($1::text[])
        `, [notificationModules]);

        console.log(`\n✅ Encontrados ${existingSystemModules.rows.length} módulos en system_modules:`);
        existingSystemModules.rows.forEach((m, i) => {
            console.log(`   ${i + 1}. ${m.module_code} - ${m.module_name}`);
        });

        // 3. Si no existen, crearlos en system_modules
        if (existingSystemModules.rows.length === 0) {
            console.log('\n📝 Creando módulos en system_modules...');

            const modulesToCreate = [
                {
                    code: 'compliance-dashboard',
                    name: 'Compliance Dashboard',
                    description: 'Dashboard de cumplimiento legal argentino (LCT)',
                    icon: 'fas fa-gavel',
                    color: '#e74c3c',
                    category: 'notifications'
                },
                {
                    code: 'sla-tracking',
                    name: 'SLA Tracking',
                    description: 'Seguimiento de tiempos de respuesta y métricas SLA',
                    icon: 'fas fa-clock',
                    color: '#3498db',
                    category: 'notifications'
                },
                {
                    code: 'audit-reports',
                    name: 'Reportes de Auditoría',
                    description: 'Generación de reportes con validez legal y firma digital',
                    icon: 'fas fa-file-contract',
                    color: '#9b59b6',
                    category: 'notifications'
                },
                {
                    code: 'proactive-notifications',
                    name: 'Notificaciones Proactivas',
                    description: 'Sistema de alertas automáticas y reglas proactivas',
                    icon: 'fas fa-brain',
                    color: '#f39c12',
                    category: 'notifications'
                },
                {
                    code: 'resource-center',
                    name: 'Centro de Recursos',
                    description: 'Documentación y recursos del sistema de notificaciones',
                    icon: 'fas fa-book',
                    color: '#16a085',
                    category: 'notifications'
                }
            ];

            for (const mod of modulesToCreate) {
                await client.query(`
                    INSERT INTO system_modules (
                        module_code, module_name, description, icon, color, category,
                        is_active, is_core, display_order, version, rubro
                    ) VALUES ($1, $2, $3, $4, $5, $6, true, false, 100, '2.0', 'Notificaciones Avanzadas')
                    ON CONFLICT (module_code) DO NOTHING
                `, [mod.code, mod.name, mod.description, mod.icon, mod.color, mod.category]);

                console.log(`   ✅ Creado: ${mod.name}`);
            }
        }

        // 4. Asignar módulos a ISI
        console.log('\n📝 Asignando módulos a ISI...');

        for (const moduleCode of notificationModules) {
            // Verificar si ya está asignado
            const existing = await client.query(`
                SELECT id FROM company_modules
                WHERE company_id = $1 AND module_code = $2
            `, [companyId, moduleCode]);

            if (existing.rows.length === 0) {
                await client.query(`
                    INSERT INTO company_modules (
                        company_id, module_code, is_active, licensed_since
                    ) VALUES ($1, $2, true, NOW())
                `, [companyId, moduleCode]);

                console.log(`   ✅ Asignado: ${moduleCode}`);
            } else {
                console.log(`   ⏭️  Ya existe: ${moduleCode}`);
            }
        }

        // 5. Verificar módulos finales
        console.log('\n📋 Módulos finales de ISI:');
        const finalModules = await client.query(`
            SELECT cm.module_code, sm.module_name, cm.is_active
            FROM company_modules cm
            JOIN system_modules sm ON cm.module_code = sm.module_code
            WHERE cm.company_id = $1
            ORDER BY sm.module_name
        `, [companyId]);

        finalModules.rows.forEach((m, i) => {
            const icon = m.is_active ? '✅' : '❌';
            console.log(`   ${icon} ${i + 1}. ${m.module_code} - ${m.module_name}`);
        });

        console.log(`\n🎉 Total: ${finalModules.rows.length} módulos contratados por ISI`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

assignNotificationModules();
