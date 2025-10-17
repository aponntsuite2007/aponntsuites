/**
 * ARREGLAR DEFINITIVAMENTE TODOS LOS ÍCONOS
 * 1. Primero amplía el campo icon para aceptar cadenas más largas
 * 2. Luego actualiza todos los íconos
 */

const { Client } = require('pg');

async function fixIconsDefinitively() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔧 ARREGLANDO DEFINITIVAMENTE TODOS LOS ÍCONOS...\n');
        await client.connect();

        // 1. AMPLIAR LA COLUMNA icon
        console.log('📐 Ampliando columna icon para aceptar íconos Font Awesome...');
        await client.query(`
            ALTER TABLE system_modules
            ALTER COLUMN icon TYPE VARCHAR(50)
        `);
        console.log('✅ Columna icon ampliada a VARCHAR(50)\n');

        // 2. ACTUALIZAR TODOS LOS ÍCONOS PROBLEMÁTICOS
        console.log('🔄 Actualizando íconos...\n');

        const updates = [
            // Sistema de Notificaciones V2.0 - CRÍTICOS
            { module_key: 'comply', icon: 'fas fa-gavel' },
            { module_key: 'sla', icon: 'fas fa-clock' },
            { module_key: 'audit', icon: 'fas fa-file-contract' },
            { module_key: 'proactive', icon: 'fas fa-brain' },
            { module_key: 'resources', icon: 'fas fa-book' },

            // Otros módulos que pueden tener problemas
            { module_key: 'biometric_basic', icon: 'fas fa-fingerprint' },
            { module_key: 'facial_recognition', icon: 'fas fa-user-circle' },
            { module_key: 'emotional_analysis', icon: 'fas fa-smile' },
            { module_key: 'biometric_consent', icon: 'fas fa-handshake' },
            { module_key: 'vacation', icon: 'fas fa-umbrella-beach' },
            { module_key: 'absence', icon: 'fas fa-user-times' },
            { module_key: 'transport', icon: 'fas fa-truck' },
            { module_key: 'siac', icon: 'fas fa-building' },
            { module_key: 'permissions', icon: 'fas fa-user-shield' },
            { module_key: 'legal', icon: 'fas fa-balance-scale' },
            { module_key: 'notifications', icon: 'fas fa-bell' },
            { module_key: 'dashboard', icon: 'fas fa-tachometer-alt' },
            { module_key: 'reports', icon: 'fas fa-file-alt' },
            { module_key: 'analytics', icon: 'fas fa-chart-bar' },
            { module_key: 'settings', icon: 'fas fa-cogs' },
            { module_key: 'users', icon: 'fas fa-users' },
            { module_key: 'companies', icon: 'fas fa-building' },
            { module_key: 'departments', icon: 'fas fa-sitemap' },
            { module_key: 'attendance', icon: 'fas fa-calendar-check' },
            { module_key: 'shifts', icon: 'fas fa-business-time' }
        ];

        for (const update of updates) {
            const result = await client.query(`
                UPDATE system_modules
                SET icon = $1
                WHERE module_key = $2
                RETURNING name
            `, [update.icon, update.module_key]);

            if (result.rowCount > 0) {
                console.log(`✅ ${result.rows[0].name}: ${update.icon}`);
            }
        }

        // 3. Actualizar cualquier ícono que no tenga el prefijo fa
        console.log('\n🔍 Buscando y corrigiendo íconos sin prefijo Font Awesome...\n');

        const badIcons = await client.query(`
            SELECT id, module_key, name, icon
            FROM system_modules
            WHERE icon IS NOT NULL
            AND icon != ''
            AND icon NOT LIKE 'fa%'
        `);

        if (badIcons.rows.length > 0) {
            for (const module of badIcons.rows) {
                let newIcon = module.icon;

                // Mapeo de íconos simples a Font Awesome
                const iconMap = {
                    'gavel': 'fas fa-gavel',
                    'clock': 'fas fa-clock',
                    'contract': 'fas fa-file-contract',
                    'brain': 'fas fa-brain',
                    'book': 'fas fa-book',
                    'user': 'fas fa-user',
                    'users': 'fas fa-users',
                    'building': 'fas fa-building',
                    'chart': 'fas fa-chart-bar',
                    'calendar': 'fas fa-calendar',
                    'file': 'fas fa-file',
                    'check': 'fas fa-check',
                    'bell': 'fas fa-bell',
                    'cog': 'fas fa-cog',
                    'shield': 'fas fa-shield-alt',
                    'fingerprint': 'fas fa-fingerprint',
                    'truck': 'fas fa-truck',
                    'home': 'fas fa-home'
                };

                if (iconMap[module.icon]) {
                    newIcon = iconMap[module.icon];
                } else {
                    // Si no está en el mapeo, intentar agregar prefijo
                    newIcon = `fas fa-${module.icon}`;
                }

                await client.query(`
                    UPDATE system_modules
                    SET icon = $1
                    WHERE id = $2
                `, [newIcon, module.id]);

                console.log(`✅ ${module.name}: ${module.icon} → ${newIcon}`);
            }
        } else {
            console.log('✅ Todos los módulos tienen íconos válidos');
        }

        // 4. VERIFICACIÓN FINAL
        console.log('\n📊 VERIFICACIÓN FINAL DE MÓDULOS CRÍTICOS:\n');

        const criticalModules = await client.query(`
            SELECT module_key, name, icon
            FROM system_modules
            WHERE module_key IN ('comply', 'sla', 'audit', 'proactive', 'resources',
                                 'biometric_basic', 'facial_recognition', 'emotional_analysis')
            ORDER BY name
        `);

        criticalModules.rows.forEach(m => {
            const check = m.icon && m.icon.startsWith('fa') ? '✅' : '❌';
            console.log(`   ${check} ${m.name}: ${m.icon || 'SIN ÍCONO'}`);
        });

        // 5. Resumen final
        const finalCount = await client.query(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN icon LIKE 'fa%' THEN 1 END) as with_fa_icon,
                COUNT(CASE WHEN icon IS NULL OR icon = '' THEN 1 END) as without_icon
            FROM system_modules
        `);

        const stats = finalCount.rows[0];
        console.log('\n📈 ESTADÍSTICAS FINALES:');
        console.log(`   Total módulos: ${stats.total}`);
        console.log(`   Con íconos Font Awesome: ${stats.with_fa_icon}`);
        console.log(`   Sin ícono: ${stats.without_icon}`);

        if (stats.with_fa_icon === stats.total - stats.without_icon) {
            console.log('\n✅ TODOS LOS ÍCONOS HAN SIDO CORREGIDOS EXITOSAMENTE');
        } else {
            console.log(`\n⚠️ Aún hay ${stats.total - stats.with_fa_icon - stats.without_icon} módulos con íconos incorrectos`);
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Detalles:', error.stack);
    } finally {
        await client.end();
        console.log('\n🔌 Conexión cerrada');
    }
}

// Ejecutar
fixIconsDefinitively();