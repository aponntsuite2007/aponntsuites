#!/usr/bin/env node
/**
 * Script simple para activar módulos en la empresa ISI
 * Actualiza el campo active_modules de la empresa
 */

const { sequelize } = require('./src/config/database');

async function activateISIModules() {
    try {
        console.log('🚀 [ISI-MODULES] Activando módulos para empresa ISI...');

        // Módulos principales del sistema biométrico
        const activeModules = {
            // Módulos Core
            biometric: true,
            attendance: true,
            dashboard: true,
            users: true,

            // Módulos de gestión
            departments: true,
            shifts: true,
            reports: true,
            employees: true,

            // Módulos avanzados
            medical: true,
            notifications: true,
            gpsTracking: true,
            realTimeSync: true,

            // Módulos administrativos
            companies: true,
            permissions: true,
            audit: true,
            backup: true,

            // Módulos específicos
            vacation: true,
            absence: true,
            overtime: true,
            payroll: true,

            // Módulos de comunicación
            alerts: true,
            messaging: true,

            // Módulos de análisis
            analytics: true,
            kpi: true,

            // Módulos de integración
            apiAccess: true,
            webhooks: true
        };

        // Actualizar empresa ISI (company_id = 11)
        const result = await sequelize.query(`
            UPDATE companies
            SET active_modules = :active_modules,
                updated_at = NOW()
            WHERE company_id = 11
            RETURNING name, active_modules
        `, {
            replacements: {
                active_modules: JSON.stringify(activeModules)
            },
            type: sequelize.QueryTypes.UPDATE
        });

        console.log('✅ [ISI-MODULES] Módulos actualizados para empresa ISI');

        // Verificar la actualización
        const company = await sequelize.query(
            'SELECT name, active_modules FROM companies WHERE company_id = 11',
            { type: sequelize.QueryTypes.SELECT, plain: true }
        );

        if (company) {
            console.log(`\n📋 [ISI-MODULES] Empresa: ${company.name}`);
            console.log('📦 [ISI-MODULES] Módulos activos:');

            const modules = JSON.parse(company.active_modules || '{}');
            const activeModulesList = Object.entries(modules)
                .filter(([key, value]) => value === true)
                .map(([key]) => key);

            activeModulesList.forEach(module => {
                console.log(`  ✅ ${module}`);
            });

            console.log(`\n🎉 [ISI-MODULES] Total módulos activos: ${activeModulesList.length}`);
        }

    } catch (error) {
        console.error('❌ [ISI-MODULES] Error:', error.message);
        throw error;
    }
}

// Ejecutar el script
if (require.main === module) {
    activateISIModules()
        .then(() => {
            console.log('🏁 [ISI-MODULES] Script completado exitosamente');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 [ISI-MODULES] Script falló:', error.message);
            process.exit(1);
        });
}

module.exports = activateISIModules;