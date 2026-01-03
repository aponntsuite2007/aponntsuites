/**
 * FIX COMPANY_MODULES TABLE - Insertar módulos core en tabla company_modules
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
});

async function fixCompanyModulesTable() {
    try {
        console.log('🔧 [FIX] Insertando módulos core en tabla company_modules...\n');

        // 1. Ver módulos del sistema
        const systemModulesResult = await pool.query(`
            SELECT id, module_key, name
            FROM system_modules
            WHERE is_active = true
            ORDER BY module_key
        `);

        console.log(`📋 [INFO] Módulos del sistema encontrados: ${systemModulesResult.rows.length}\n`);

        // Módulos core que necesitamos
        const coreModuleKeys = [
            'dashboard', 'users', 'attendance', 'departments', 'shifts',
            'reports', 'kiosks', 'notifications', 'medical', 'partners',
            'procedures', 'my-procedures', 'dms', 'employee-map',
            'legal-dashboard', 'hse-management', 'job-postings',
            'employee-360', 'vacation-management', 'hour-bank',
            'organizational-structure', 'mi-espacio', 'biometric-consent',
            'company-account', 'roles-permissions', 'admin-consent-management',
            'compliance-dashboard', 'payroll-liquidation',
            'associate-workflow-panel', 'associate-marketplace',
            'notification-center', 'inbox'
        ];

        // Crear mapa de module_key → id
        const moduleMap = {};
        for (const mod of systemModulesResult.rows) {
            moduleMap[mod.module_key] = mod.id;
        }

        console.log('📦 Módulos mapeados:');
        for (const key of coreModuleKeys.slice(0, 5)) {
            console.log(`   ${key} → ID: ${moduleMap[key] || 'NOT FOUND'}`);
        }
        console.log(`   ... y ${coreModuleKeys.length - 5} más\n`);

        // 2. Insertar en company_modules para empresa ISI (ID 11)
        const companyId = 11;

        console.log(`🏢 [FIX] Insertando módulos para empresa ISI (ID: ${companyId})...\n`);

        let insertedCount = 0;
        let skippedCount = 0;

        for (const moduleKey of coreModuleKeys) {
            const systemModuleId = moduleMap[moduleKey];

            if (!systemModuleId) {
                console.log(`   ⚠️ Módulo ${moduleKey} no encontrado en system_modules, skip`);
                skippedCount++;
                continue;
            }

            // Verificar si ya existe
            const existsResult = await pool.query(`
                SELECT id FROM company_modules
                WHERE company_id = $1 AND system_module_id = $2
            `, [companyId, systemModuleId]);

            if (existsResult.rows.length > 0) {
                // Ya existe, solo actualizar activo = true
                await pool.query(`
                    UPDATE company_modules
                    SET activo = true, updated_at = NOW()
                    WHERE company_id = $1 AND system_module_id = $2
                `, [companyId, systemModuleId]);
                console.log(`   ✅ ${moduleKey} actualizado (ya existía)`);
            } else {
                // No existe, insertar
                await pool.query(`
                    INSERT INTO company_modules (company_id, system_module_id, activo, created_at, updated_at)
                    VALUES ($1, $2, true, NOW(), NOW())
                `, [companyId, systemModuleId]);
                console.log(`   ✅ ${moduleKey} insertado (nuevo)`);
                insertedCount++;
            }
        }

        console.log(`\n📊 [RESULTADO]:`);
        console.log(`   ✅ Insertados: ${insertedCount}`);
        console.log(`   ⚠️ Skipped (no en system_modules): ${skippedCount}`);

        // 3. Verificar resultado
        console.log(`\n📊 [VERIFICACIÓN] Módulos activos de ISI:\n`);

        const verifyResult = await pool.query(`
            SELECT sm.module_key, sm.name, cm.activo
            FROM company_modules cm
            INNER JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE cm.company_id = $1 AND cm.activo = true
            ORDER BY sm.module_key
        `, [companyId]);

        console.log(`   Total módulos activos: ${verifyResult.rows.length}\n`);
        console.log('   Primeros 10 módulos:');
        for (const mod of verifyResult.rows.slice(0, 10)) {
            console.log(`   ✅ ${mod.module_key} - ${mod.name}`);
        }

        console.log(`\n✅ [SUCCESS] Reparación completada!`);
        console.log(`\n🔄 Ahora recarga la página: http://localhost:9998/panel-empresa.html\n`);

    } catch (error) {
        console.error('❌ [ERROR]:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

fixCompanyModulesTable();
