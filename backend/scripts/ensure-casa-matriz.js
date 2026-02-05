/**
 * Script para asegurar que todas las empresas tengan su sucursal "Casa Matriz"
 *
 * PROPÓSITO: Crear automáticamente la sucursal principal (Casa Matriz) para todas
 * las empresas que no la tengan.
 *
 * EJECUTAR:
 *   cd backend
 *   node scripts/ensure-casa-matriz.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB || 'attendance_system'
});

async function ensureCasaMatriz() {
    console.log('🏢 Verificando sucursales "Casa Matriz" para todas las empresas...\n');

    try {
        // Obtener todas las empresas activas
        const companiesResult = await pool.query(`
            SELECT company_id, name, slug
            FROM companies
            WHERE is_active = true
            ORDER BY company_id
        `);

        console.log(`📊 Empresas encontradas: ${companiesResult.rows.length}\n`);

        let created = 0;
        let skipped = 0;

        for (const company of companiesResult.rows) {
            console.log(`\n🔍 Verificando: ${company.name} (${company.slug})`);

            // Verificar si ya tiene una sucursal principal
            const existingBranch = await pool.query(`
                SELECT id, name, is_main
                FROM branches
                WHERE company_id = $1
                  AND (is_main = true OR LOWER(name) LIKE '%casa matriz%' OR LOWER(name) LIKE '%central%')
                LIMIT 1
            `, [company.company_id]);

            if (existingBranch.rows.length > 0) {
                console.log(`   ✅ Ya tiene sucursal principal: ${existingBranch.rows[0].name}`);
                skipped++;
                continue;
            }

            // Crear Casa Matriz
            const newBranch = await pool.query(`
                INSERT INTO branches (
                    id,
                    company_id,
                    name,
                    code,
                    address,
                    is_main,
                    is_active,
                    country,
                    created_at,
                    updated_at
                )
                VALUES (
                    gen_random_uuid(),
                    $1,
                    'Casa Matriz',
                    'CM-001',
                    'Dirección de casa matriz',
                    true,
                    true,
                    'Argentina',
                    NOW(),
                    NOW()
                )
                RETURNING id, name
            `, [company.company_id]);

            console.log(`   ✅ Casa Matriz creada: ${newBranch.rows[0].id}`);
            created++;
        }

        console.log('\n' + '='.repeat(70));
        console.log('📊 RESUMEN:');
        console.log('='.repeat(70));
        console.log(`   Empresas procesadas: ${companiesResult.rows.length}`);
        console.log(`   Casa Matriz creadas: ${created}`);
        console.log(`   Ya tenían sucursal: ${skipped}`);
        console.log('='.repeat(70) + '\n');

        if (created > 0) {
            console.log('✅ Proceso completado exitosamente!');
            console.log('💡 Las empresas ahora tienen su Casa Matriz por defecto.\n');
        } else {
            console.log('✅ Todas las empresas ya tenían su sucursal principal.\n');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Ejecutar
ensureCasaMatriz();
