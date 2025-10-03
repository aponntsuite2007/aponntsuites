// ============================================
// PANEL-TRANSPORTE - CREAR EMPRESAS Y USUARIO DE TESTING
// ============================================
// 📅 Fecha: 2025-09-23
// 🎯 Objetivo: Crear empresas de transporte y usuario ADMIN1 para testing

const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');

// Configuración directa de PostgreSQL
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

async function createCompaniesAndUser() {
    try {
        console.log('🔄 [COMPANIES] Conectando a PostgreSQL...');

        await sequelize.authenticate();
        console.log('✅ [COMPANIES] Conectado exitosamente');

        // Verificar valores del ENUM para subscription_type y license_type
        console.log('🔍 [COMPANIES] Verificando ENUMs disponibles...');

        try {
            const subscriptionTypes = await sequelize.query(
                `SELECT unnest(enum_range(NULL::enum_companies_subscription_type)) as enum_value`,
                { type: sequelize.QueryTypes.SELECT }
            );
            console.log('📋 [COMPANIES] Subscription types:', subscriptionTypes.map(v => v.enum_value));
        } catch (error) {
            console.log('⚠️ [COMPANIES] No hay ENUM subscription_type, usando valores libres');
        }

        try {
            const licenseTypes = await sequelize.query(
                `SELECT unnest(enum_range(NULL::enum_companies_license_type)) as enum_value`,
                { type: sequelize.QueryTypes.SELECT }
            );
            console.log('📋 [COMPANIES] License types:', licenseTypes.map(v => v.enum_value));
        } catch (error) {
            console.log('⚠️ [COMPANIES] No hay ENUM license_type, usando valores libres');
        }

        console.log('🔄 [COMPANIES] Creando empresas de transporte...');

        // Empresa 1: Transportes del Norte
        await sequelize.query(`
            INSERT INTO companies (
              name, slug, display_name, legal_name, description,
              email, phone, address, city, state, country,
              tax_id, registration_number, timezone, locale, currency,
              max_employees, contracted_employees, max_branches,
              is_active, is_trial, active_modules, features,
              primary_color, secondary_color, settings, metadata
            ) VALUES (
              'Transportes del Norte S.A.', 'transportes-norte', 'Transportes del Norte', 'Transportes del Norte S.A.',
              'Empresa especializada en logística ganadera del norte argentino',
              'admin@transportesnorte.com.ar', '+54-387-4567890', 'Ruta 9 Km 1456', 'Salta', 'Salta', 'Argentina',
              '30-68475829-6', 'IG-2023-001', 'America/Argentina/Salta', 'es-AR', 'ARS',
              50, 25, 5,
              true, false,
              '{"transport-dashboard": true, "transport-trips": true, "transport-fleet": true, "transport-drivers": true, "transport-expenses": true}'::jsonb,
              '{"gps_tracking": true, "biometric_access": false, "advanced_analytics": true}'::jsonb,
              '#28a745', '#20c997',
              '{"transport_zones": ["NOA", "Cuyo"], "fleet_specialization": "ganado_bovino"}'::jsonb,
              '{"created_for": "panel-transporte", "integration_date": "2025-09-23", "test_company": true}'::jsonb
            ) ON CONFLICT (slug) DO NOTHING;
        `);
        console.log('✅ [COMPANIES] Transportes del Norte creada');

        // Empresa 2: Logística del Sur
        await sequelize.query(`
            INSERT INTO companies (
              name, slug, display_name, legal_name, description,
              email, phone, address, city, state, country,
              tax_id, registration_number, timezone, locale, currency,
              max_employees, contracted_employees, max_branches,
              is_active, is_trial, active_modules, features,
              primary_color, secondary_color, settings, metadata
            ) VALUES (
              'Logística del Sur', 'logistica-sur', 'Logística del Sur', 'Logística del Sur S.R.L.',
              'Transporte especializado de ganado en la Patagonia',
              'contacto@logisticasur.com.ar', '+54-297-3456789', 'Av. San Martín 2456', 'Comodoro Rivadavia', 'Chubut', 'Argentina',
              '30-74859631-2', 'IG-2023-002', 'America/Argentina/Buenos_Aires', 'es-AR', 'ARS',
              30, 18, 3,
              true, false,
              '{"transport-dashboard": true, "transport-trips": true, "transport-fleet": true, "transport-expenses": true, "transport-gps": true}'::jsonb,
              '{"gps_tracking": true, "biometric_access": false, "advanced_analytics": false}'::jsonb,
              '#007bff', '#6610f2',
              '{"transport_zones": ["Patagonia"], "fleet_specialization": "ganado_ovino"}'::jsonb,
              '{"created_for": "panel-transporte", "integration_date": "2025-09-23", "test_company": true}'::jsonb
            ) ON CONFLICT (slug) DO NOTHING;
        `);
        console.log('✅ [COMPANIES] Logística del Sur creada');

        // Empresa 3: Ganado Express (Premium)
        await sequelize.query(`
            INSERT INTO companies (
              name, slug, display_name, legal_name, description,
              email, phone, address, city, state, country,
              tax_id, registration_number, timezone, locale, currency,
              max_employees, contracted_employees, max_branches,
              is_active, is_trial, active_modules, features,
              primary_color, secondary_color, settings, metadata
            ) VALUES (
              'Ganado Express', 'ganado-express', 'Ganado Express', 'Ganado Express S.A.',
              'Servicios express de transporte ganadero en zona pampeana',
              'info@ganadoexpress.com.ar', '+54-221-5678901', 'Ruta 226 Km 45', 'La Plata', 'Buenos Aires', 'Argentina',
              '30-69852741-8', 'IG-2023-003', 'America/Argentina/Buenos_Aires', 'es-AR', 'ARS',
              75, 42, 8,
              true, false,
              '{"transport-dashboard": true, "transport-trips": true, "transport-fleet": true, "transport-drivers": true, "transport-expenses": true, "transport-reports": true, "transport-gps": true, "transport-clients": true}'::jsonb,
              '{"gps_tracking": true, "biometric_access": true, "advanced_analytics": true}'::jsonb,
              '#fd7e14', '#e83e8c',
              '{"transport_zones": ["Pampa_Húmeda", "CABA"], "fleet_specialization": "mixto"}'::jsonb,
              '{"created_for": "panel-transporte", "integration_date": "2025-09-23", "test_company": true}'::jsonb
            ) ON CONFLICT (slug) DO NOTHING;
        `);
        console.log('✅ [COMPANIES] Ganado Express creada');

        // Obtener IDs de las empresas creadas
        const companies = await sequelize.query(
            `SELECT company_id, name, slug FROM companies WHERE metadata->>'created_for' = 'panel-transporte' ORDER BY name`,
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log('📋 [COMPANIES] Empresas de transporte creadas:');
        companies.forEach((company, index) => {
            console.log(`   ${index + 1}. ${company.name} (${company.slug}) - ID: ${company.company_id}`);
        });

        // Usar la primera empresa para el usuario ADMIN1
        const firstCompany = companies[0];
        if (!firstCompany) {
            throw new Error('No se encontraron empresas de transporte');
        }

        console.log(`🔄 [USER] Creando usuario ADMIN1 para empresa: ${firstCompany.name}`);

        // Encriptar la contraseña
        const hashedPassword = await bcrypt.hash('123', 10);

        // Crear usuario ADMIN1
        await sequelize.query(`
            INSERT INTO users (
                id, legajo, last_name, first_name, dni, company_id,
                email, phone, password, role, is_active,
                default_branch_id, can_work_in_other_branches,
                vacation_days, special_permission_days,
                send_notifications, require_overtime_alert,
                created_at, updated_at
            ) VALUES (
                gen_random_uuid(),
                'ADMIN001',
                'Administrador',
                'Panel Transporte',
                '99999999',
                ${firstCompany.id},
                'admin1@transportes.com',
                '+54-9-11-0000-0000',
                '${hashedPassword}',
                'admin',
                true,
                null,
                true,
                0,
                0,
                true,
                false,
                NOW(),
                NOW()
            ) ON CONFLICT (legajo) DO UPDATE SET
                password = EXCLUDED.password,
                company_id = EXCLUDED.company_id,
                updated_at = NOW();
        `);

        console.log('✅ [USER] Usuario ADMIN1 creado exitosamente');
        console.log('📋 [USER] Credenciales:');
        console.log('   👤 Usuario: ADMIN1');
        console.log('   🔒 Contraseña: 123');
        console.log(`   🏢 Empresa: ${firstCompany.name}`);
        console.log('   👑 Rol: admin');

        // Asignar módulos a las empresas
        console.log('🔄 [MODULES] Asignando módulos a empresas...');

        // Obtener IDs de módulos de transporte
        const modules = await sequelize.query(
            `SELECT id, module_key, name FROM system_modules WHERE module_key LIKE 'transport-%' ORDER BY display_order`,
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log(`📦 [MODULES] Módulos disponibles: ${modules.length}`);

        // Asignar módulos a cada empresa según su configuración
        for (const company of companies) {
            console.log(`🔄 [MODULES] Asignando módulos a ${company.name}...`);

            // Obtener módulos activos de la empresa
            const companyData = await sequelize.query(
                `SELECT active_modules FROM companies WHERE company_id = ${company.company_id}`,
                { type: sequelize.QueryTypes.SELECT }
            );

            const activeModules = companyData[0]?.active_modules || {};
            console.log(`📋 [MODULES] Módulos activos para ${company.name}:`, Object.keys(activeModules).filter(k => activeModules[k]));

            // Asignar cada módulo activo
            for (const module of modules) {
                if (activeModules[module.module_key]) {
                    try {
                        await sequelize.query(`
                            INSERT INTO company_modules (
                                company_id, system_module_id, is_active,
                                contracted_price, employee_tier, contracted_at,
                                usage_stats, configuration
                            ) VALUES (
                                ${company.company_id},
                                '${module.id}',
                                true,
                                (SELECT base_price FROM system_modules WHERE id = '${module.id}'),
                                ${company.company_id === firstCompany.id ? 25 : 20},
                                NOW(),
                                '{"monthly_usage": 100}'::jsonb,
                                '{"test_assignment": true}'::jsonb
                            ) ON CONFLICT (company_id, system_module_id) DO NOTHING;
                        `);
                        console.log(`   ✅ ${module.module_key} asignado a ${company.name}`);
                    } catch (error) {
                        console.warn(`   ⚠️ Error asignando ${module.module_key} a ${company.name}:`, error.message);
                    }
                }
            }
        }

        // Verificar asignaciones
        console.log('🔍 [MODULES] Verificando asignaciones...');
        const assignments = await sequelize.query(`
            SELECT
                c.name as company_name,
                sm.module_key,
                sm.name as module_name,
                cm.contracted_price
            FROM company_modules cm
            JOIN companies c ON cm.company_id = c.id
            JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE sm.module_key LIKE 'transport-%'
            ORDER BY c.name, sm.display_order
        `, { type: sequelize.QueryTypes.SELECT });

        console.log('📋 [MODULES] Asignaciones realizadas:');
        let currentCompany = '';
        assignments.forEach(assignment => {
            if (assignment.company_name !== currentCompany) {
                currentCompany = assignment.company_name;
                console.log(`\n🏢 ${currentCompany}:`);
            }
            console.log(`   📦 ${assignment.module_key} - ${assignment.module_name} ($${assignment.contracted_price})`);
        });

        console.log('\n🎯 [SUCCESS] EMPRESAS Y USUARIO CREADOS EXITOSAMENTE');
        console.log('\n📊 [SUMMARY] Resumen:');
        console.log(`   🏢 Empresas creadas: ${companies.length}`);
        console.log(`   📦 Módulos disponibles: ${modules.length}`);
        console.log(`   🔗 Asignaciones realizadas: ${assignments.length}`);
        console.log(`   👤 Usuario de testing: ADMIN1 (contraseña: 123)`);

    } catch (error) {
        console.error('❌ [ERROR] Error:', error);
        throw error;
    } finally {
        await sequelize.close();
        console.log('🔐 [COMPANIES] Conexión cerrada');
    }
}

// Ejecutar
if (require.main === module) {
    createCompaniesAndUser()
        .then(() => {
            console.log('🎉 [SUCCESS] EMPRESAS DE TRANSPORTE Y USUARIO DE TESTING CREADOS');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 [ERROR] FALLO:', error.message);
            process.exit(1);
        });
}

module.exports = { createCompaniesAndUser };