/**
 * FIX: Actualizar nombres legibles de los 13 módulos en system_modules
 * Problema: La API retorna name=module_key en lugar del nombre legible
 */
const { Pool } = require('pg');
const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

const MODULE_NAMES = {
    'art-management': 'ART',
    'training-management': 'Gestión Capacitaciones',
    'sanctions-management': 'Gestión de Sanciones',
    'vacation-management': 'Gestión de Vacaciones',
    'legal-dashboard': 'Legal',
    'payroll-liquidation': 'Liquidación Sueldos',
    'logistics-dashboard': 'Logistica Avanzada',
    'procedures-manual': 'Manual de Procedimientos',
    'employee-map': 'Mapa Empleados',
    'marketplace': 'Marketplace',
    'my-procedures': 'Mis Procedimientos',
    'audit-reports': 'Reportes Auditoría',
    // medical ya tiene el nombre correcto "Gestión Médica"
};

const MODULE_ICONS = {
    'art-management': '🏥',
    'training-management': '🎓',
    'sanctions-management': '⚠️',
    'vacation-management': '🏖️',
    'legal-dashboard': '⚖️',
    'payroll-liquidation': '💰',
    'logistics-dashboard': '🚚',
    'procedures-manual': '📋',
    'employee-map': '🗺️',
    'marketplace': '🛒',
    'my-procedures': '📝',
    'audit-reports': '📊',
};

(async () => {
    const pool = new Pool({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    console.log('=== ACTUALIZANDO NOMBRES DE MÓDULOS EN SYSTEM_MODULES ===\n');

    for (const [moduleKey, name] of Object.entries(MODULE_NAMES)) {
        try {
            const icon = MODULE_ICONS[moduleKey] || '📦';

            const result = await client.query(`
                UPDATE system_modules
                SET name = $2, icon = $3
                WHERE module_key = $1
                RETURNING module_key, name, icon
            `, [moduleKey, name, icon]);

            if (result.rowCount > 0) {
                console.log(`✅ ${moduleKey}: name="${name}", icon="${icon}"`);
            } else {
                console.log(`⚠️  ${moduleKey}: No encontrado en system_modules`);
            }
        } catch (e) {
            console.log(`❌ ${moduleKey}: Error - ${e.message}`);
        }
    }

    // Verificar
    console.log('\n=== VERIFICACIÓN ===\n');
    const check = await client.query(`
        SELECT module_key, name, icon
        FROM system_modules
        WHERE module_key = ANY($1)
        ORDER BY module_key
    `, [Object.keys(MODULE_NAMES)]);

    check.rows.forEach(r => {
        console.log(`${r.icon} ${r.module_key}: "${r.name}"`);
    });

    client.release();
    await pool.end();

    console.log('\n✅ Migración completada. Reinicia el servidor para que los cambios tomen efecto.');
})();
