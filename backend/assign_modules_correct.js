const { Client } = require('pg');

async function assignModules() {
    const client = new Client({
        connectionString: 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Conectando a PostgreSQL...');
        await client.connect();
        console.log('✅ Conectado\n');

        const companyId = 11; // ISI

        // 1. Crear módulos en system_modules si no existen
        console.log('📝 Creando módulos del Sistema de Notificaciones V2.0...\n');

        const modulesToCreate = [
            {
                key: 'comply',
                name: 'Compliance Dashboard',
                description: 'Dashboard de cumplimiento legal argentino (LCT)',
                icon: 'gavel',
                color: '#e74c3c'
            },
            {
                key: 'sla',
                name: 'SLA Tracking',
                description: 'Seguimiento de tiempos de respuesta y métricas SLA',
                icon: 'clock',
                color: '#3498db'
            },
            {
                key: 'audit',
                name: 'Reportes de Auditoría',
                description: 'Generación de reportes con validez legal y firma digital',
                icon: 'contract',
                color: '#9b59b6'
            },
            {
                key: 'proactive',
                name: 'Notificaciones Proactivas',
                description: 'Sistema de alertas automáticas y reglas proactivas',
                icon: 'brain',
                color: '#f39c12'
            },
            {
                key: 'resources',
                name: 'Centro de Recursos',
                description: 'Documentación y recursos del sistema de notificaciones',
                icon: 'book',
                color: '#16a085'
            }
        ];

        const moduleIds = [];

        for (const mod of modulesToCreate) {
            // Verificar si existe
            const existing = await client.query(`
                SELECT id FROM system_modules WHERE module_key = $1
            `, [mod.key]);

            let moduleId;

            if (existing.rows.length === 0) {
                // Crear el módulo
                const result = await client.query(`
                    INSERT INTO system_modules (
                        module_key, name, description, icon, category,
                        is_active, is_core, display_order, rubro
                    ) VALUES ($1, $2, $3, $4, 'notif', true, false, 100, 'Notificaciones Avanzadas')
                    RETURNING id
                `, [mod.key, mod.name, mod.description, mod.icon]);

                moduleId = result.rows[0].id;
                console.log(`   ✅ Creado: ${mod.name} (${moduleId})`);
            } else {
                moduleId = existing.rows[0].id;
                console.log(`   ⏭️  Ya existe: ${mod.name} (${moduleId})`);
            }

            moduleIds.push({ key: mod.key, name: mod.name, id: moduleId });
        }

        // 2. Asignar módulos a ISI
        console.log('\n📝 Asignando módulos a empresa ISI (ID 11)...\n');

        for (const mod of moduleIds) {
            // Verificar si ya está asignado
            const existing = await client.query(`
                SELECT id FROM company_modules
                WHERE company_id = $1 AND system_module_id = $2
            `, [companyId, mod.id]);

            if (existing.rows.length === 0) {
                await client.query(`
                    INSERT INTO company_modules (
                        company_id, system_module_id, is_active, contracted_price, contracted_at
                    ) VALUES ($1, $2, true, 0.00, NOW())
                `, [companyId, mod.id]);

                console.log(`   ✅ Asignado: ${mod.name}`);
            } else {
                console.log(`   ⏭️  Ya asignado: ${mod.name}`);
            }
        }

        // 3. Verificar módulos finales
        console.log('\n📋 Módulos contratados por ISI:\n');
        const finalModules = await client.query(`
            SELECT sm.name, sm.module_key, cm.is_active, cm.contracted_at
            FROM company_modules cm
            JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE cm.company_id = $1
            ORDER BY sm.name
        `, [companyId]);

        finalModules.rows.forEach((m, i) => {
            const icon = m.is_active ? '✅' : '❌';
            console.log(`   ${icon} ${i + 1}. ${m.name} (${m.module_key})`);
        });

        console.log(`\n🎉 Total: ${finalModules.rows.length} módulos contratados`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await client.end();
    }
}

assignModules();
