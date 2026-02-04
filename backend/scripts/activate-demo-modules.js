/**
 * Script para activar los 14 módulos faltantes en APONNT Demo
 * Ejecutar en producción con: node scripts/activate-demo-modules.js
 */

const { Pool } = require('pg');

// URL de Render
const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

// Módulos que faltan activar (los 14 "NO ENCONTRADO")
const MODULES_TO_ACTIVATE = [
    'art-management',
    'training-management',
    'sanctions-management',
    'vacation-management',
    'legal-dashboard',
    'medical',
    'payroll-liquidation',
    'logistics-dashboard',
    'procedures-manual',
    'employee-map',
    'marketplace',
    'my-procedures',
    'audit-reports',
    'compliance-dashboard'
];

async function activateModules() {
    const pool = new Pool({
        connectionString: RENDER_URL,
        ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();

    try {
        console.log('🔍 Buscando empresa APONNT Demo...');

        // Buscar la empresa APONNT Demo
        const companyResult = await client.query(`
            SELECT company_id, name, slug, active_modules
            FROM companies
            WHERE LOWER(name) LIKE '%aponnt%demo%'
               OR LOWER(slug) LIKE '%aponnt%demo%'
            LIMIT 1
        `);

        if (companyResult.rows.length === 0) {
            // Intentar buscar de otra forma
            const altResult = await client.query(`
                SELECT company_id, name, slug, active_modules
                FROM companies
                WHERE LOWER(name) LIKE '%aponnt%'
                ORDER BY company_id
                LIMIT 5
            `);
            console.log('Empresas encontradas:', altResult.rows);
            throw new Error('No se encontró empresa APONNT Demo');
        }

        const company = companyResult.rows[0];
        console.log(`✅ Empresa encontrada: ${company.name} (ID: ${company.company_id})`);

        // Obtener módulos actuales
        let currentModules = [];
        if (company.active_modules) {
            try {
                currentModules = typeof company.active_modules === 'string'
                    ? JSON.parse(company.active_modules)
                    : company.active_modules;
            } catch (e) {
                currentModules = [];
            }
        }
        console.log(`📦 Módulos actuales: ${currentModules.length}`);

        // Combinar módulos actuales con los nuevos (sin duplicados)
        const allModules = [...new Set([...currentModules, ...MODULES_TO_ACTIVATE])];
        console.log(`📦 Total módulos después de agregar: ${allModules.length}`);

        await client.query('BEGIN');

        // Actualizar active_modules en companies
        await client.query(`
            UPDATE companies
            SET active_modules = $1, updated_at = NOW()
            WHERE company_id = $2
        `, [JSON.stringify(allModules), company.company_id]);
        console.log('✅ active_modules actualizado en companies');

        // Insertar en company_modules (fuente de verdad)
        const insertResult = await client.query(`
            INSERT INTO company_modules (company_id, system_module_id, activo, contracted_at, created_at, updated_at)
            SELECT $1, sm.id, true, NOW(), NOW(), NOW()
            FROM system_modules sm
            WHERE sm.module_key = ANY($2::varchar[])
            ON CONFLICT (company_id, system_module_id) DO UPDATE SET activo = true, updated_at = NOW()
            RETURNING id
        `, [company.company_id, MODULES_TO_ACTIVATE]);

        console.log(`✅ Insertados/actualizados ${insertResult.rowCount} registros en company_modules`);

        await client.query('COMMIT');

        console.log('\n════════════════════════════════════════════════════════════');
        console.log('✅ MÓDULOS ACTIVADOS EXITOSAMENTE');
        console.log('════════════════════════════════════════════════════════════');
        console.log(`Empresa: ${company.name}`);
        console.log(`Módulos nuevos: ${MODULES_TO_ACTIVATE.length}`);
        console.log(`Total módulos activos: ${allModules.length}`);
        console.log('════════════════════════════════════════════════════════════\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

activateModules()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
