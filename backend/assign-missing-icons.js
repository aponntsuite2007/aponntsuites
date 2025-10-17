/**
 * Asignar íconos a TODOS los módulos que no tienen
 */

const { Client } = require('pg');

async function assignMissingIcons() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔧 ASIGNANDO ÍCONOS FALTANTES A TODOS LOS MÓDULOS...\n');
        await client.connect();

        const updates = [
            ['Dashboard Legal', 'fas fa-balance-scale'],
            ['Dashboard Médico', 'fas fa-stethoscope'],
            ['Facturación SIAC', 'fas fa-file-invoice-dollar'],
            ['Gestión ART', 'fas fa-hard-hat'],
            ['Gestión de Capacitaciones', 'fas fa-graduation-cap'],
            ['Gestión de Clientes SIAC', 'fas fa-user-tie'],
            ['Gestión de Kioscos', 'fas fa-store'],
            ['Gestión de Licencias', 'fas fa-id-card'],
            ['Gestión de Sanciones', 'fas fa-gavel'],
            ['Gestión de Vacaciones', 'fas fa-umbrella-beach'],
            ['Gestión Documental', 'fas fa-folder-open'],
            ['Integración Google Maps', 'fas fa-map-marked-alt'],
            ['Liquidación de Sueldos', 'fas fa-money-check-alt'],
            ['Mapa de Empleados', 'fas fa-map-pin'],
            ['Notificaciones Completas', 'fas fa-bell'],
            ['Plantillas Fiscales SIAC', 'fas fa-file-alt'],
            ['Postulaciones Laborales', 'fas fa-briefcase'],
            ['Términos y Condiciones', 'fas fa-handshake']
        ];

        for (const [name, icon] of updates) {
            const result = await client.query(
                'UPDATE system_modules SET icon = $1 WHERE name = $2',
                [icon, name]
            );

            if (result.rowCount > 0) {
                console.log(`✅ ${name} → ${icon}`);
            }
        }

        // Verificar resultado final
        console.log('\n📊 VERIFICACIÓN FINAL:\n');

        const finalCheck = await client.query(`
            SELECT name, icon
            FROM system_modules
            WHERE icon IS NULL OR icon = ''
            OR icon NOT LIKE 'fa%'
            ORDER BY name
        `);

        if (finalCheck.rows.length === 0) {
            console.log('✅ TODOS LOS MÓDULOS TIENEN ÍCONOS FONT AWESOME VÁLIDOS');
        } else {
            console.log('⚠️ Aún hay módulos sin íconos válidos:');
            finalCheck.rows.forEach(r => {
                console.log(`   - ${r.name}: ${r.icon || 'NULL'}`);
            });
        }

        // Mostrar estadísticas
        const stats = await client.query(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN icon LIKE 'fa%' THEN 1 END) as with_icon,
                COUNT(CASE WHEN icon IS NULL OR icon = '' THEN 1 END) as without_icon
            FROM system_modules
        `);

        const s = stats.rows[0];
        console.log('\n📈 ESTADÍSTICAS:');
        console.log(`   Total módulos: ${s.total}`);
        console.log(`   Con íconos Font Awesome: ${s.with_icon}`);
        console.log(`   Sin ícono: ${s.without_icon}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
        console.log('\n✅ PROCESO COMPLETADO');
    }
}

assignMissingIcons();