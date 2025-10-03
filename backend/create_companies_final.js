// ============================================
// PANEL-TRANSPORTE - CREAR EMPRESAS FINAL
// ============================================
// 📅 Fecha: 2025-09-23
// 🎯 Objetivo: Crear empresas con todos los campos obligatorios

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

async function createCompaniesFinal() {
    try {
        console.log('🔄 [COMPANIES] Conectando a PostgreSQL...');

        await sequelize.authenticate();
        console.log('✅ [COMPANIES] Conectado exitosamente');

        console.log('🔄 [COMPANIES] Creando empresas de transporte con campos obligatorios...');

        // Empresa 1: Transportes del Norte
        try {
            await sequelize.query(`
                INSERT INTO companies (
                    name, slug, display_name, email, phone, address,
                    city, state, country, timezone, locale, currency,
                    subscription_type, status, is_trial, contracted_employees,
                    two_factor_required, session_timeout, is_active,
                    active_modules, metadata
                ) VALUES (
                    'Transportes del Norte S.A.',
                    'transportes-norte',
                    'Transportes del Norte',
                    'admin@transportesnorte.com.ar',
                    '+54-387-4567890',
                    'Ruta 9 Km 1456',
                    'Salta',
                    'Salta',
                    'Argentina',
                    'America/Argentina/Salta',
                    'es-AR',
                    'ARS',
                    'professional',
                    'active',
                    false,
                    25,
                    false,
                    3600,
                    true,
                    '{"transport-dashboard": true, "transport-trips": true, "transport-fleet": true, "transport-drivers": true, "transport-expenses": true}'::jsonb,
                    '{"created_for": "panel-transporte", "integration_date": "2025-09-23", "test_company": true}'::jsonb
                );
            `);
            console.log('✅ [COMPANIES] Transportes del Norte creada');
        } catch (error) {
            if (error.message.includes('llave duplicada')) {
                console.log('⚠️ [COMPANIES] Transportes del Norte ya existe');
            } else {
                console.error('❌ [COMPANIES] Error creando Transportes del Norte:', error.message);
            }
        }

        // Empresa 2: Logística del Sur
        try {
            await sequelize.query(`
                INSERT INTO companies (
                    name, slug, display_name, email, phone, address,
                    city, state, country, timezone, locale, currency,
                    subscription_type, status, is_trial, contracted_employees,
                    two_factor_required, session_timeout, is_active,
                    active_modules, metadata
                ) VALUES (
                    'Logística del Sur',
                    'logistica-sur',
                    'Logística del Sur',
                    'contacto@logisticasur.com.ar',
                    '+54-297-3456789',
                    'Av. San Martín 2456',
                    'Comodoro Rivadavia',
                    'Chubut',
                    'Argentina',
                    'America/Argentina/Buenos_Aires',
                    'es-AR',
                    'ARS',
                    'basic',
                    'active',
                    false,
                    18,
                    false,
                    3600,
                    true,
                    '{"transport-dashboard": true, "transport-trips": true, "transport-fleet": true, "transport-gps": true}'::jsonb,
                    '{"created_for": "panel-transporte", "integration_date": "2025-09-23", "test_company": true}'::jsonb
                );
            `);
            console.log('✅ [COMPANIES] Logística del Sur creada');
        } catch (error) {
            if (error.message.includes('llave duplicada')) {
                console.log('⚠️ [COMPANIES] Logística del Sur ya existe');
            } else {
                console.error('❌ [COMPANIES] Error creando Logística del Sur:', error.message);
            }
        }

        // Empresa 3: Ganado Express
        try {
            await sequelize.query(`
                INSERT INTO companies (
                    name, slug, display_name, email, phone, address,
                    city, state, country, timezone, locale, currency,
                    subscription_type, status, is_trial, contracted_employees,
                    two_factor_required, session_timeout, is_active,
                    active_modules, metadata
                ) VALUES (
                    'Ganado Express',
                    'ganado-express',
                    'Ganado Express',
                    'info@ganadoexpress.com.ar',
                    '+54-221-5678901',
                    'Ruta 226 Km 45',
                    'La Plata',
                    'Buenos Aires',
                    'Argentina',
                    'America/Argentina/Buenos_Aires',
                    'es-AR',
                    'ARS',
                    'enterprise',
                    'active',
                    false,
                    42,
                    false,
                    3600,
                    true,
                    '{"transport-dashboard": true, "transport-trips": true, "transport-fleet": true, "transport-drivers": true, "transport-expenses": true, "transport-reports": true, "transport-gps": true, "transport-clients": true}'::jsonb,
                    '{"created_for": "panel-transporte", "integration_date": "2025-09-23", "test_company": true}'::jsonb
                );
            `);
            console.log('✅ [COMPANIES] Ganado Express creada');
        } catch (error) {
            if (error.message.includes('llave duplicada')) {
                console.log('⚠️ [COMPANIES] Ganado Express ya existe');
            } else {
                console.error('❌ [COMPANIES] Error creando Ganado Express:', error.message);
            }
        }

        // Verificar empresas creadas
        const companies = await sequelize.query(
            `SELECT company_id, name, slug, display_name FROM companies WHERE metadata->>'created_for' = 'panel-transporte' ORDER BY name`,
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log('\n📋 [COMPANIES] Empresas de transporte disponibles:');
        companies.forEach((company, index) => {
            console.log(`   ${index + 1}. ${company.name} (${company.slug}) - ID: ${company.company_id}`);
        });

        if (companies.length === 0) {
            console.log('❌ [COMPANIES] No se encontraron empresas de transporte');
            return;
        }

        // Crear usuario ADMIN1 para la primera empresa
        const firstCompany = companies[0];
        console.log(`\n🔄 [USER] Creando usuario ADMIN1 para empresa: ${firstCompany.name}`);

        // Verificar si el usuario ya existe
        const existingUser = await sequelize.query(
            `SELECT user_id, legajo FROM users WHERE legajo = 'ADMIN1'`,
            { type: sequelize.QueryTypes.SELECT }
        );

        if (existingUser.length > 0) {
            console.log('⚠️ [USER] Usuario ADMIN1 ya existe, actualizando...');

            const hashedPassword = await bcrypt.hash('123', 10);

            await sequelize.query(`
                UPDATE users SET
                    password = '${hashedPassword}',
                    company_id = ${firstCompany.id},
                    role = 'admin',
                    is_active = true,
                    updated_at = NOW()
                WHERE legajo = 'ADMIN1';
            `);
            console.log('✅ [USER] Usuario ADMIN1 actualizado');
        } else {
            // Crear nuevo usuario
            const hashedPassword = await bcrypt.hash('123', 10);

            await sequelize.query(`
                INSERT INTO users (
                    legajo, last_name, first_name, dni,
                    email, password, role, is_active,
                    company_id, created_at, updated_at
                ) VALUES (
                    'ADMIN1',
                    'Administrador',
                    'Panel Transporte',
                    '99999999',
                    'admin1@transportes.com',
                    '${hashedPassword}',
                    'admin',
                    true,
                    ${firstCompany.id},
                    NOW(),
                    NOW()
                );
            `);
            console.log('✅ [USER] Usuario ADMIN1 creado exitosamente');
        }

        // Asignar módulos a las empresas
        console.log('\n🔄 [MODULES] Asignando módulos a empresas...');

        // Obtener módulos de transporte
        const modules = await sequelize.query(
            `SELECT id, module_key, name, base_price FROM system_modules WHERE module_key LIKE 'transport-%' ORDER BY display_order`,
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log(`📦 [MODULES] Módulos disponibles: ${modules.length}`);

        // Verificar si existe la tabla company_modules
        try {
            await sequelize.query(`SELECT 1 FROM company_modules LIMIT 1`);
            console.log('✅ [MODULES] Tabla company_modules existe');

            // Asignar módulos a cada empresa
            for (const company of companies) {
                console.log(`\n🔄 [MODULES] Procesando ${company.name}...`);

                // Obtener módulos activos de la empresa
                const companyData = await sequelize.query(
                    `SELECT active_modules FROM companies WHERE company_id = ${company.company_id}`,
                    { type: sequelize.QueryTypes.SELECT }
                );

                const activeModules = companyData[0]?.active_modules || {};
                const activeModuleKeys = Object.keys(activeModules).filter(k => activeModules[k]);
                console.log(`   📋 Módulos activos: ${activeModuleKeys.join(', ')}`);

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
                                    ${module.base_price},
                                    ${company.company_id === firstCompany.id ? 25 : 20},
                                    NOW(),
                                    '{"monthly_usage": 100}'::jsonb,
                                    '{"test_assignment": true}'::jsonb
                                );
                            `);
                            console.log(`   ✅ ${module.module_key} asignado`);
                        } catch (error) {
                            if (error.message.includes('llave duplicada')) {
                                console.log(`   ⚠️ ${module.module_key} ya asignado`);
                            } else {
                                console.warn(`   ❌ Error asignando ${module.module_key}:`, error.message);
                            }
                        }
                    }
                }
            }

        } catch (error) {
            console.warn('⚠️ [MODULES] Tabla company_modules no existe o error:', error.message);
        }

        console.log('\n🎯 [SUCCESS] PROCESO COMPLETADO');
        console.log('\n📊 [CREDENTIALS] Credenciales de testing:');
        console.log('   👤 Usuario: ADMIN1');
        console.log('   🔒 Contraseña: 123');
        console.log(`   🏢 Empresa: ${firstCompany.name} (ID: ${firstCompany.id})`);
        console.log('   👑 Rol: admin');

        console.log('\n📋 [SUMMARY] Resumen final:');
        console.log(`   🏢 Empresas de transporte: ${companies.length}`);
        console.log(`   📦 Módulos disponibles: ${modules.length}`);
        console.log('   ✅ Usuario ADMIN1 configurado');

    } catch (error) {
        console.error('❌ [ERROR] Error:', error);
        throw error;
    } finally {
        await sequelize.close();
        console.log('\n🔐 [COMPANIES] Conexión cerrada');
    }
}

// Ejecutar
if (require.main === module) {
    createCompaniesFinal()
        .then(() => {
            console.log('\n🎉 [SUCCESS] EMPRESAS Y USUARIO DE TESTING LISTOS PARA USAR');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 [ERROR] FALLO:', error.message);
            process.exit(1);
        });
}

module.exports = { createCompaniesFinal };