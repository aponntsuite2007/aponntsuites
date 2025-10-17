/**
 * FIX FINAL Y DEFINITIVO DE ÍCONOS
 * Cambia el formato de los íconos para que funcionen correctamente en el frontend
 */

const { Client } = require('pg');

async function fixIconsFormatFinal() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔧 ARREGLANDO FORMATO DE ÍCONOS DEFINITIVAMENTE...\n');
        await client.connect();

        // Primero, obtener todos los módulos con sus íconos actuales
        const modules = await client.query(`
            SELECT id, module_key, name, icon
            FROM system_modules
            WHERE icon IS NOT NULL AND icon != ''
            ORDER BY name
        `);

        console.log(`📊 Procesando ${modules.rows.length} módulos...\n`);

        // Mapeo de íconos: convertir de "fas fa-xxx" a solo el nombre del ícono
        for (const module of modules.rows) {
            let newIcon = module.icon;

            // Si el ícono empieza con "fas fa-" o "fa-", extraer solo el nombre
            if (newIcon.startsWith('fas fa-')) {
                newIcon = newIcon.replace('fas fa-', '');
            } else if (newIcon.startsWith('fa fa-')) {
                newIcon = newIcon.replace('fa fa-', '');
            } else if (newIcon.startsWith('fab fa-')) {
                newIcon = newIcon.replace('fab fa-', '');
            } else if (newIcon.startsWith('far fa-')) {
                newIcon = newIcon.replace('far fa-', '');
            } else if (newIcon.startsWith('fa-')) {
                newIcon = newIcon.replace('fa-', '');
            }

            // Actualizar solo si cambió
            if (newIcon !== module.icon) {
                await client.query(
                    'UPDATE system_modules SET icon = $1 WHERE id = $2',
                    [newIcon, module.id]
                );
                console.log(`✅ ${module.name}: "${module.icon}" → "${newIcon}"`);
            }
        }

        // Verificación final
        console.log('\n📊 VERIFICACIÓN FINAL:\n');

        const finalCheck = await client.query(`
            SELECT module_key, name, icon
            FROM system_modules
            WHERE module_key IN ('comply', 'sla', 'audit', 'proactive', 'resources',
                                 'biometric_basic', 'facial_recognition', 'vacation',
                                 'siac', 'transport')
            ORDER BY name
        `);

        finalCheck.rows.forEach(m => {
            console.log(`   ${m.name}: "${m.icon}"`);
        });

        // Estadísticas
        const stats = await client.query(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN icon NOT LIKE '%fa-%' AND icon != '' THEN 1 END) as simple_icons,
                COUNT(CASE WHEN icon IS NULL OR icon = '' THEN 1 END) as without_icon
            FROM system_modules
        `);

        const s = stats.rows[0];
        console.log('\n📈 ESTADÍSTICAS FINALES:');
        console.log(`   Total módulos: ${s.total}`);
        console.log(`   Con íconos simples: ${s.simple_icons}`);
        console.log(`   Sin ícono: ${s.without_icon}`);

        console.log('\n✅ FORMATO DE ÍCONOS CORREGIDO');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
        console.log('\n🔌 Proceso completado');
    }
}

// Ejecutar
fixIconsFormatFinal();