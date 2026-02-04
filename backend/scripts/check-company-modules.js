/**
 * Script para verificar qué módulos tiene activados cada empresa
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

async function checkCompanyModules() {
    try {
        console.log('🔍 Verificando módulos activos por empresa...\n');

        // Obtener empresas
        const companiesResult = await pool.query(`
            SELECT company_id, name, slug, is_active
            FROM companies
            WHERE is_active = true
            ORDER BY company_id
        `);

        console.log(`📊 Empresas activas: ${companiesResult.rows.length}\n`);

        for (const company of companiesResult.rows) {
            console.log(`\n${'='.repeat(70)}`);
            console.log(`🏢 EMPRESA: ${company.name} (${company.slug})`);
            console.log(`${'='.repeat(70)}`);

            // Obtener módulos activos de esta empresa
            const modulesResult = await pool.query(`
                SELECT
                    m.module_key,
                    m.name,
                    m.category,
                    m.is_core,
                    cm.is_active,
                    cm.created_at
                FROM company_modules cm
                JOIN system_modules m ON m.id = cm.system_module_id
                WHERE cm.company_id = $1
                  AND cm.is_active = true
                  AND m.is_active = true
                ORDER BY m.category, m.name
            `, [company.company_id]);

            console.log(`📦 Módulos activos: ${modulesResult.rows.length}/36\n`);

            if (modulesResult.rows.length === 0) {
                console.log('   ⚠️  Esta empresa NO tiene módulos activos\n');
                continue;
            }

            // Agrupar por categoría
            const byCategory = {};
            modulesResult.rows.forEach(row => {
                if (!byCategory[row.category]) {
                    byCategory[row.category] = [];
                }
                byCategory[row.category].push(row);
            });

            // Mostrar por categoría
            Object.keys(byCategory).sort().forEach(category => {
                console.log(`\n   📁 ${category.toUpperCase()}:`);
                byCategory[category].forEach(mod => {
                    console.log(`      ✅ ${mod.name} (${mod.module_key})`);
                });
            });

            // Resumen
            console.log(`\n   📊 RESUMEN:`);
            console.log(`      Total: ${modulesResult.rows.length} módulos`);
            Object.keys(byCategory).forEach(cat => {
                console.log(`      ${cat}: ${byCategory[cat].length} módulos`);
            });
        }

        console.log(`\n\n${'='.repeat(70)}`);
        console.log('💡 RECOMENDACIÓN:');
        console.log(`${'='.repeat(70)}`);

        // Encontrar la empresa con más módulos
        let maxModules = 0;
        let bestCompany = null;

        for (const company of companiesResult.rows) {
            const count = await pool.query(`
                SELECT COUNT(*) as count
                FROM company_modules cm
                JOIN system_modules m ON m.id = cm.system_module_id
                WHERE cm.company_id = $1
                  AND cm.is_active = true
                  AND m.is_active = true
            `, [company.company_id]);

            const moduleCount = parseInt(count.rows[0].count);
            if (moduleCount > maxModules) {
                maxModules = moduleCount;
                bestCompany = company;
            }
        }

        if (bestCompany) {
            console.log(`\n✅ USAR para testing: ${bestCompany.slug}`);
            console.log(`   Tiene ${maxModules}/36 módulos activos`);

            if (maxModules < 36) {
                console.log(`\n⚠️  IMPORTANTE: Esta empresa NO tiene los 36 módulos completos.`);
                console.log(`   Opciones:`);
                console.log(`   1. Activar módulos faltantes manualmente en la BD`);
                console.log(`   2. Ajustar el test para solo testear los ${maxModules} disponibles`);
                console.log(`   3. Crear una empresa de prueba con todos los módulos`);
            } else {
                console.log(`\n🎯 PERFECTO: Tiene todos los 36 módulos comerciales`);
            }
        } else {
            console.log('\n❌ No se encontró ninguna empresa con módulos activos');
        }

        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

checkCompanyModules();
