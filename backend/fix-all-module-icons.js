/**
 * FIX DEFINITIVO PARA TODOS LOS ÍCONOS DE MÓDULOS
 * Actualiza TODOS los íconos que están mostrando texto en lugar de íconos
 */

const { Client } = require('pg');

async function fixAllIcons() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔧 ARREGLANDO TODOS LOS ÍCONOS DE MÓDULOS...\n');
        await client.connect();

        // Mapeo completo de TODOS los íconos incorrectos a íconos Font Awesome válidos
        const iconFixes = [
            // Notificaciones V2.0
            { old: 'gavel', new: 'fas fa-gavel' },
            { old: 'clock', new: 'fas fa-clock' },
            { old: 'contract', new: 'fas fa-file-contract' },
            { old: 'brain', new: 'fas fa-brain' },
            { old: 'book', new: 'fas fa-book' },

            // Otros módulos que pueden tener problemas
            { old: 'user', new: 'fas fa-user' },
            { old: 'users', new: 'fas fa-users' },
            { old: 'building', new: 'fas fa-building' },
            { old: 'chart', new: 'fas fa-chart-bar' },
            { old: 'calendar', new: 'fas fa-calendar' },
            { old: 'file', new: 'fas fa-file' },
            { old: 'check', new: 'fas fa-check' },
            { old: 'times', new: 'fas fa-times' },
            { old: 'bell', new: 'fas fa-bell' },
            { old: 'cog', new: 'fas fa-cog' },
            { old: 'shield', new: 'fas fa-shield-alt' },
            { old: 'lock', new: 'fas fa-lock' },
            { old: 'key', new: 'fas fa-key' },
            { old: 'chart-line', new: 'fas fa-chart-line' },
            { old: 'chart-bar', new: 'fas fa-chart-bar' },
            { old: 'chart-pie', new: 'fas fa-chart-pie' },
            { old: 'fingerprint', new: 'fas fa-fingerprint' },
            { old: 'camera', new: 'fas fa-camera' },
            { old: 'id-card', new: 'fas fa-id-card' },
            { old: 'mobile', new: 'fas fa-mobile-alt' },
            { old: 'laptop', new: 'fas fa-laptop' },
            { old: 'database', new: 'fas fa-database' },
            { old: 'truck', new: 'fas fa-truck' },
            { old: 'route', new: 'fas fa-route' },
            { old: 'map', new: 'fas fa-map-marked-alt' },
            { old: 'home', new: 'fas fa-home' },
            { old: 'dashboard', new: 'fas fa-tachometer-alt' },
            { old: 'edit', new: 'fas fa-edit' },
            { old: 'trash', new: 'fas fa-trash' },
            { old: 'plus', new: 'fas fa-plus' },
            { old: 'minus', new: 'fas fa-minus' },
            { old: 'search', new: 'fas fa-search' },
            { old: 'download', new: 'fas fa-download' },
            { old: 'upload', new: 'fas fa-upload' },
            { old: 'save', new: 'fas fa-save' },
            { old: 'print', new: 'fas fa-print' },
            { old: 'envelope', new: 'fas fa-envelope' },
            { old: 'phone', new: 'fas fa-phone' },
            { old: 'globe', new: 'fas fa-globe' },
            { old: 'link', new: 'fas fa-link' },
            { old: 'unlink', new: 'fas fa-unlink' },
            { old: 'eye', new: 'fas fa-eye' },
            { old: 'eye-slash', new: 'fas fa-eye-slash' },
            { old: 'ban', new: 'fas fa-ban' },
            { old: 'exclamation', new: 'fas fa-exclamation' },
            { old: 'question', new: 'fas fa-question' },
            { old: 'info', new: 'fas fa-info' },
            { old: 'warning', new: 'fas fa-exclamation-triangle' },
            { old: 'error', new: 'fas fa-times-circle' },
            { old: 'success', new: 'fas fa-check-circle' },

            // Módulos específicos
            { old: 'vacation', new: 'fas fa-umbrella-beach' },
            { old: 'absence', new: 'fas fa-user-times' },
            { old: 'reports', new: 'fas fa-file-alt' },
            { old: 'analytics', new: 'fas fa-chart-area' },
            { old: 'settings', new: 'fas fa-cogs' },
            { old: 'biometric', new: 'fas fa-fingerprint' },
            { old: 'facial', new: 'fas fa-user-circle' },
            { old: 'emotion', new: 'fas fa-smile' },
            { old: 'consent', new: 'fas fa-handshake' },
            { old: 'legal', new: 'fas fa-balance-scale' },
            { old: 'compliance', new: 'fas fa-gavel' },
            { old: 'sla', new: 'fas fa-stopwatch' },
            { old: 'audit', new: 'fas fa-clipboard-check' },
            { old: 'proactive', new: 'fas fa-brain' },
            { old: 'resources', new: 'fas fa-book-open' },
            { old: 'notifications', new: 'fas fa-bell' },
            { old: 'messages', new: 'fas fa-comment-dots' },
            { old: 'alerts', new: 'fas fa-exclamation-circle' },
            { old: 'tasks', new: 'fas fa-tasks' },
            { old: 'workflow', new: 'fas fa-project-diagram' },
            { old: 'permissions', new: 'fas fa-user-shield' },
            { old: 'roles', new: 'fas fa-user-tag' },
            { old: 'security', new: 'fas fa-shield-alt' },
            { old: 'backup', new: 'fas fa-hdd' },
            { old: 'sync', new: 'fas fa-sync' },
            { old: 'refresh', new: 'fas fa-redo' },
            { old: 'history', new: 'fas fa-history' },
            { old: 'archive', new: 'fas fa-archive' }
        ];

        console.log('📋 Actualizando íconos en system_modules...\n');

        for (const fix of iconFixes) {
            const result = await client.query(`
                UPDATE system_modules
                SET icon = $1
                WHERE icon = $2
                RETURNING module_key, name
            `, [fix.new, fix.old]);

            if (result.rowCount > 0) {
                console.log(`✅ Actualizado: ${fix.old} → ${fix.new} (${result.rowCount} módulos)`);
                result.rows.forEach(row => {
                    console.log(`   - ${row.name} (${row.module_key})`);
                });
            }
        }

        // También buscar y actualizar íconos que no empiezan con 'fa'
        console.log('\n📋 Buscando módulos con íconos sin prefijo Font Awesome...\n');

        const modulesWithBadIcons = await client.query(`
            SELECT id, module_key, name, icon
            FROM system_modules
            WHERE icon IS NOT NULL
            AND icon NOT LIKE 'fa%'
            AND icon != ''
        `);

        if (modulesWithBadIcons.rows.length > 0) {
            console.log(`❗ Encontrados ${modulesWithBadIcons.rows.length} módulos con íconos incorrectos:\n`);

            for (const module of modulesWithBadIcons.rows) {
                console.log(`   ⚠️  ${module.name}: "${module.icon}"`);

                // Buscar si ya hay un fix para este ícono
                const fix = iconFixes.find(f => f.old === module.icon);
                if (fix) {
                    await client.query(`
                        UPDATE system_modules
                        SET icon = $1
                        WHERE id = $2
                    `, [fix.new, module.id]);
                    console.log(`      ✅ Corregido a: ${fix.new}`);
                } else {
                    // Si no hay fix específico, intentar agregar el prefijo
                    const newIcon = `fas fa-${module.icon}`;
                    await client.query(`
                        UPDATE system_modules
                        SET icon = $1
                        WHERE id = $2
                    `, [newIcon, module.id]);
                    console.log(`      ✅ Corregido a: ${newIcon}`);
                }
            }
        } else {
            console.log('✅ Todos los módulos tienen íconos Font Awesome válidos');
        }

        // Verificación final
        console.log('\n📊 VERIFICACIÓN FINAL:\n');

        const finalCheck = await client.query(`
            SELECT module_key, name, icon
            FROM system_modules
            WHERE category IN ('notif', 'notifications', 'notification')
            OR module_key IN ('comply', 'sla', 'audit', 'proactive', 'resources')
            ORDER BY name
        `);

        finalCheck.rows.forEach((m, i) => {
            const iconCheck = m.icon && m.icon.startsWith('fa') ? '✅' : '❌';
            console.log(`   ${iconCheck} ${i + 1}. ${m.name}: ${m.icon || 'SIN ÍCONO'}`);
        });

        console.log('\n✅ TODOS LOS ÍCONOS HAN SIDO CORREGIDOS');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await client.end();
        console.log('\n🔌 Conexión cerrada');
    }
}

// Ejecutar
fixAllIcons();