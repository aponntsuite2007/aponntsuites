#!/usr/bin/env node
/**
 * Script para verificar el módulo de roles
 */
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkRoles() {
    try {
        // 1. Buscar módulos con 'rol' en el nombre
        console.log('=== 1. Módulos con ROL en system_modules ===');
        const rolesModules = await pool.query(`
            SELECT module_id, module_key, module_name, category, is_active
            FROM system_modules
            WHERE LOWER(module_name) LIKE '%rol%' OR LOWER(module_key) LIKE '%rol%'
            ORDER BY module_id
        `);
        console.log('Encontrados:', rolesModules.rows.length);
        rolesModules.rows.forEach(r => console.log(r));

        // 2. Ver todos los módulos activos de la empresa ISI (company_id=11)
        console.log('\n=== 2. Módulos asignados a ISI (company_id=11) ===');
        const isiModules = await pool.query(`
            SELECT cm.module_id, sm.module_key, sm.module_name, cm.is_active
            FROM company_modules cm
            JOIN system_modules sm ON cm.module_id = sm.module_id
            WHERE cm.company_id = 11
            ORDER BY sm.module_name
        `);
        console.log('Total módulos ISI:', isiModules.rows.length);
        isiModules.rows.forEach(r => console.log(`  ${r.module_id}: ${r.module_key} - ${r.module_name} [${r.is_active ? '✓' : '✗'}]`));

        // 3. Buscar específicamente módulo roles
        console.log('\n=== 3. Buscar módulo ROLES específico ===');
        const rolesSearch = await pool.query(`
            SELECT * FROM system_modules
            WHERE LOWER(module_key) IN ('roles', 'role-management', 'roles-management', 'employee-roles', 'staff-roles')
        `);
        console.log('Encontrados:', rolesSearch.rows.length);
        rolesSearch.rows.forEach(r => console.log(r));

        // 4. Listar todos los módulos del sistema
        console.log('\n=== 4. Todos los módulos del sistema (primeros 50) ===');
        const allModules = await pool.query(`
            SELECT module_id, module_key, module_name, is_active
            FROM system_modules
            ORDER BY module_key
            LIMIT 50
        `);
        allModules.rows.forEach(r => console.log(`${r.module_id}: ${r.module_key} - ${r.module_name} [${r.is_active ? '✓' : '✗'}]`));

        // 5. Buscar en archivos JS si existe un módulo de roles
        console.log('\n=== 5. Módulos en BD que NO están asignados a ISI ===');
        const notInIsi = await pool.query(`
            SELECT sm.module_id, sm.module_key, sm.module_name
            FROM system_modules sm
            WHERE sm.module_id NOT IN (
                SELECT cm.module_id FROM company_modules cm WHERE cm.company_id = 11
            )
            ORDER BY sm.module_key
        `);
        console.log('Módulos no asignados a ISI:', notInIsi.rows.length);
        notInIsi.rows.forEach(r => console.log(`  ${r.module_id}: ${r.module_key} - ${r.module_name}`));

        await pool.end();
    } catch(e) {
        console.error('Error:', e.message);
        console.error(e.stack);
    }
}

checkRoles();
