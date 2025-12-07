#!/usr/bin/env node
/**
 * Script para agregar módulo DMS a todas las empresas
 */
const { Sequelize } = require('sequelize');

const DB_URL = 'postgresql://postgres:Aedr15150302@localhost:5432/attendance_system';
const sequelize = new Sequelize(DB_URL, { logging: false });

async function addDMSToCompanies() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL');

        // 1. Obtener ID del módulo dms-dashboard
        const [modules] = await sequelize.query(`
            SELECT id, module_key, name FROM system_modules
            WHERE module_key = 'dms-dashboard'
        `);

        if (modules.length === 0) {
            console.log('❌ Módulo dms-dashboard no encontrado en system_modules');
            return;
        }

        const dmsModuleId = modules[0].id;
        console.log('📁 Módulo DMS encontrado:', dmsModuleId);

        // 2. Obtener todas las empresas activas
        const [companies] = await sequelize.query(`
            SELECT company_id, name FROM companies WHERE is_active = true
        `);
        console.log('🏢 Empresas activas:', companies.length);

        // 3. Agregar módulo DMS a cada empresa (si no existe)
        let added = 0;
        for (const company of companies) {
            const [exists] = await sequelize.query(`
                SELECT id FROM company_modules
                WHERE company_id = ${company.company_id} AND system_module_id = '${dmsModuleId}'
            `);

            if (exists.length === 0) {
                await sequelize.query(`
                    INSERT INTO company_modules (
                        id, company_id, system_module_id,
                        precio_mensual, activo, is_active, auto_activated,
                        fecha_asignacion, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), ${company.company_id}, '${dmsModuleId}',
                        0, true, true, true,
                        NOW(), NOW(), NOW()
                    )
                `);
                added++;
                console.log('  ✅ DMS agregado a:', company.name);
            } else {
                console.log('  ⏭️ DMS ya existe en:', company.name);
            }
        }

        console.log('\n═══════════════════════════════════════');
        console.log('✅ DMS agregado a', added, 'empresas');
        console.log('═══════════════════════════════════════');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await sequelize.close();
    }
}

addDMSToCompanies();
