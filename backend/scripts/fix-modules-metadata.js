const { Pool } = require('pg');
const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

(async () => {
    const pool = new Pool({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    const modules = [
        'art-management', 'training-management', 'sanctions-management',
        'vacation-management', 'legal-dashboard', 'medical',
        'payroll-liquidation', 'logistics-dashboard', 'procedures-manual',
        'employee-map', 'marketplace', 'my-procedures', 'audit-reports'
    ];

    console.log('Actualizando metadata de los 13 módulos...\n');

    for (const key of modules) {
        try {
            const newMetadata = {
                visibility: {
                    panel: 'company',
                    scope: 'commercial',
                    showAsCard: true
                }
            };

            await client.query(`
                UPDATE system_modules
                SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
                WHERE module_key = $1
            `, [key, JSON.stringify(newMetadata)]);
            console.log('✅', key);
        } catch (e) {
            console.log('❌', key, e.message);
        }
    }

    // Verificar
    const check = await client.query(`
        SELECT module_key, metadata->'visibility'->>'showAsCard' as show_as_card
        FROM system_modules
        WHERE module_key = ANY($1)
    `, [modules]);

    console.log('\nVerificación:');
    check.rows.forEach(r => console.log(r.module_key + ':', r.show_as_card || 'null'));

    client.release();
    await pool.end();
})();
