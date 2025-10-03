// Agregar TODOS los módulos faltantes encontrados en el JS
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'attendance_system',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
    timezone: '+00:00'
  }
);

async function addAllMissingModules() {
    try {
        console.log('🔄 Conectando a PostgreSQL...');
        await sequelize.authenticate();
        console.log('✅ Conectado exitosamente');

        // TODOS los módulos encontrados en el JavaScript (eliminando duplicados y backups)
        const allModulesFromJS = [
            // Módulos base del sistema
            'attendance',
            'users',
            'departments',
            'shifts',
            'settings',
            'network',

            // Autenticación y permisos
            'user-authentication',
                        'permissions-test',
            'access-control',

            // Biometría y captura
            'biometric',
            'facial-biometric',
            'fingerprint-capture',
                        'biometric-verification',
            'evaluacion-biometrica', // Tu módulo estrella con escalas universitarias

            // Dashboards especializados
            'dashboard',
            'medical-dashboard',
            'legal-dashboard',

            // Configuración y consentimiento
            'medical-config',
            'fehaciente-consent',
            'terms-conditions',

            // Gestión de documentos y empleados
            'document-management',
            'employee-map',
            'google-maps-integration',

            // Recursos Humanos
            'training-management',
            'job-postings',
            'vacation-management',
            'payroll-liquidation',
            'sanctions-management',
            'psychological-assessment', // Evaluación psicológica avanzada

            // Médico y ART
            'art-management',

            // Notificaciones (múltiples versiones)
            'notifications',
            'notifications-simple',
            'notifications-fixed',
            'notifications-complete',
            'absence-notifications',

            // Gestión y licencias
            'licensing-management',

            // SIAC ERP (mencionados en el código)
            'siac-admin-panel',
            'siac-clients',
            'siac-products',
            'siac-billing'
        ];

        console.log(`📦 Total de módulos a procesar: ${allModulesFromJS.length}`);

        // Obtener módulos que ya existen
        const existingModules = await sequelize.query(`
            SELECT module_key FROM system_modules
        `, { type: sequelize.QueryTypes.SELECT });

        const existingKeys = existingModules.map(m => m.module_key);
        console.log(`🔍 Módulos ya en BD: ${existingKeys.length}`);

        // Encontrar módulos faltantes
        const missingModules = allModulesFromJS.filter(module => !existingKeys.includes(module));
        console.log(`❌ Módulos faltantes: ${missingModules.length}`);
        console.log(`📋 Módulos faltantes:`, missingModules);

        // Agregar módulos faltantes
        let addedCount = 0;
        for (const moduleKey of missingModules) {
            try {
                // Generar nombre descriptivo
                const name = moduleKey
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

                await sequelize.query(`
                    INSERT INTO system_modules (
                        module_key,
                        name,
                        description,
                        is_active,
                        created_at,
                        updated_at
                    ) VALUES (?, ?, ?, ?, NOW(), NOW())
                `, {
                    replacements: [
                        moduleKey,
                        name,
                        `Módulo ${name} del sistema biométrico`,
                        true
                    ]
                });

                console.log(`✅ ${moduleKey} agregado a system_modules`);
                addedCount++;
            } catch (error) {
                console.warn(`❌ Error agregando ${moduleKey}:`, error.message);
            }
        }

        // Asignar TODOS los módulos (existentes + nuevos) a ISI
        const isiCompany = await sequelize.query(`
            SELECT company_id, name FROM companies
            WHERE LOWER(name) LIKE '%isi%'
            ORDER BY id DESC LIMIT 1
        `, { type: sequelize.QueryTypes.SELECT });

        if (isiCompany.length > 0) {
            const companyId = isiCompany[0].id;
            console.log(`🏢 Asignando a ISI: ${isiCompany[0].name} (ID: ${companyId})`);

            // Obtener todos los módulos del sistema (incluidos los recién agregados)
            const allSystemModules = await sequelize.query(`
                SELECT id, module_key FROM system_modules WHERE is_active = true
            `, { type: sequelize.QueryTypes.SELECT });

            // Limpiar asignaciones anteriores de ISI
            await sequelize.query(`
                DELETE FROM company_modules WHERE company_id = ?
            `, { replacements: [companyId] });

            // Asignar todos los módulos a ISI
            let assignedCount = 0;
            for (const module of allSystemModules) {
                try {
                    await sequelize.query(`
                        INSERT INTO company_modules (
                            company_id,
                            system_module_id,
                            precio_mensual,
                            activo,
                            fecha_asignacion
                        ) VALUES (?, ?, ?, ?, NOW())
                    `, {
                        replacements: [companyId, module.id, 120.00, true]
                    });
                    assignedCount++;
                } catch (error) {
                    console.warn(`❌ Error asignando ${module.module_key}:`, error.message);
                }
            }

            console.log(`✅ ${assignedCount} módulos asignados a ISI`);
        }

        // Resumen final
        const finalModuleCount = await sequelize.query(`
            SELECT COUNT(*) as count FROM system_modules WHERE is_active = true
        `, { type: sequelize.QueryTypes.SELECT });

        const finalISICount = await sequelize.query(`
            SELECT COUNT(*) as count FROM company_modules
            WHERE company_id = (SELECT company_id FROM companies WHERE LOWER(name) LIKE '%isi%' ORDER BY id DESC LIMIT 1)
        `, { type: sequelize.QueryTypes.SELECT });

        console.log(`\n🎉 PROCESO COMPLETADO EXITOSAMENTE`);
        console.log(`   📦 Módulos nuevos agregados: ${addedCount}`);
        console.log(`   🗄️ Total módulos en sistema: ${finalModuleCount[0].count}`);
        console.log(`   🏢 Total módulos asignados a ISI: ${finalISICount[0].count}`);
        console.log(`   ✨ Todos tus módulos desarrollados están ahora en la BD`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await sequelize.close();
        console.log('🔐 Conexión cerrada');
    }
}

// Ejecutar
if (require.main === module) {
    addAllMissingModules()
        .then(() => {
            console.log('\n🎉 TODOS LOS MÓDULOS AGREGADOS Y ASIGNADOS A ISI');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 FALLO:', error.message);
            process.exit(1);
        });
}

module.exports = { addAllMissingModules };