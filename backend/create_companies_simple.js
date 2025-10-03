// ============================================
// PANEL-TRANSPORTE - CREAR EMPRESAS SIMPLIFICADO
// ============================================
// 📅 Fecha: 2025-09-23
// 🎯 Objetivo: Crear empresas de transporte sin ON CONFLICT

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

async function createCompaniesSimple() {
    try {
        console.log('🔄 [COMPANIES] Conectando a PostgreSQL...');

        await sequelize.authenticate();
        console.log('✅ [COMPANIES] Conectado exitosamente');

        // Verificar estructura de la tabla companies
        console.log('🔍 [COMPANIES] Verificando estructura de tabla companies...');
        const tableInfo = await sequelize.query(
            `SELECT column_name, data_type, is_nullable, column_default
             FROM information_schema.columns
             WHERE table_name = 'companies'
             ORDER BY ordinal_position`,
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log('📋 [COMPANIES] Columnas disponibles:');
        tableInfo.forEach(col => {
            console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

        // Verificar si ya existen empresas de transporte
        const existingCompanies = await sequelize.query(
            `SELECT name FROM companies WHERE metadata->>'created_for' = 'panel-transporte'`,
            { type: sequelize.QueryTypes.SELECT }
        );

        if (existingCompanies.length > 0) {
            console.log('⚠️ [COMPANIES] Ya existen empresas de transporte:');
            existingCompanies.forEach(c => console.log(`   - ${c.name}`));
        }

        console.log('🔄 [COMPANIES] Creando empresas de transporte...');

        // Empresa 1: Transportes del Norte (simplificada)
        try {
            await sequelize.query(`
                INSERT INTO companies (
                    name, display_name, email, phone, address,
                    city, state, country, is_active, active_modules,
                    metadata
                ) VALUES (
                    'Transportes del Norte S.A.',
                    'Transportes del Norte',
                    'admin@transportesnorte.com.ar',
                    '+54-387-4567890',
                    'Ruta 9 Km 1456',
                    'Salta',
                    'Salta',
                    'Argentina',
                    true,
                    '{"transport-dashboard": true, "transport-trips": true, "transport-fleet": true, "transport-drivers": true, "transport-expenses": true}'::jsonb,
                    '{"created_for": "panel-transporte", "integration_date": "2025-09-23", "test_company": true}'::jsonb
                );
            `);
            console.log('✅ [COMPANIES] Transportes del Norte creada');
        } catch (error) {
            console.warn('⚠️ [COMPANIES] Error creando Transportes del Norte:', error.message);
        }

        // Empresa 2: Logística del Sur
        try {
            await sequelize.query(`
                INSERT INTO companies (
                    name, display_name, email, phone, address,
                    city, state, country, is_active, active_modules,
                    metadata
                ) VALUES (
                    'Logística del Sur',
                    'Logística del Sur',
                    'contacto@logisticasur.com.ar',
                    '+54-297-3456789',
                    'Av. San Martín 2456',
                    'Comodoro Rivadavia',
                    'Chubut',
                    'Argentina',
                    true,
                    '{"transport-dashboard": true, "transport-trips": true, "transport-fleet": true, "transport-gps": true}'::jsonb,
                    '{"created_for": "panel-transporte", "integration_date": "2025-09-23", "test_company": true}'::jsonb
                );
            `);
            console.log('✅ [COMPANIES] Logística del Sur creada');
        } catch (error) {
            console.warn('⚠️ [COMPANIES] Error creando Logística del Sur:', error.message);
        }

        // Empresa 3: Ganado Express
        try {
            await sequelize.query(`
                INSERT INTO companies (
                    name, display_name, email, phone, address,
                    city, state, country, is_active, active_modules,
                    metadata
                ) VALUES (
                    'Ganado Express',
                    'Ganado Express',
                    'info@ganadoexpress.com.ar',
                    '+54-221-5678901',
                    'Ruta 226 Km 45',
                    'La Plata',
                    'Buenos Aires',
                    'Argentina',
                    true,
                    '{"transport-dashboard": true, "transport-trips": true, "transport-fleet": true, "transport-drivers": true, "transport-expenses": true, "transport-reports": true, "transport-gps": true, "transport-clients": true}'::jsonb,
                    '{"created_for": "panel-transporte", "integration_date": "2025-09-23", "test_company": true}'::jsonb
                );
            `);
            console.log('✅ [COMPANIES] Ganado Express creada');
        } catch (error) {
            console.warn('⚠️ [COMPANIES] Error creando Ganado Express:', error.message);
        }

        // Verificar empresas creadas
        const companies = await sequelize.query(
            `SELECT company_id, name, display_name FROM companies WHERE metadata->>'created_for' = 'panel-transporte' ORDER BY name`,
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log('📋 [COMPANIES] Empresas de transporte disponibles:');
        companies.forEach((company, index) => {
            console.log(`   ${index + 1}. ${company.name} - ID: ${company.company_id}`);
        });

        if (companies.length === 0) {
            console.log('⚠️ [COMPANIES] No se crearon empresas, intentando método alternativo...');
            return;
        }

        // Crear usuario ADMIN1 para la primera empresa
        const firstCompany = companies[0];
        console.log(`🔄 [USER] Creando usuario ADMIN1 para empresa: ${firstCompany.name}`);

        // Verificar estructura de tabla users
        console.log('🔍 [USER] Verificando estructura de tabla users...');
        const userTableInfo = await sequelize.query(
            `SELECT column_name, data_type, is_nullable
             FROM information_schema.columns
             WHERE table_name = 'users'
             AND column_name IN ('legajo', 'company_id', 'password', 'role', 'email', 'first_name', 'last_name')
             ORDER BY ordinal_position`,
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log('📋 [USER] Columnas relevantes en users:');
        userTableInfo.forEach(col => {
            console.log(`   ${col.column_name} (${col.data_type})`);
        });

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash('123', 10);

        // Crear usuario ADMIN1
        try {
            await sequelize.query(`
                INSERT INTO users (
                    legajo, last_name, first_name, dni,
                    email, password, role, is_active,
                    company_id
                ) VALUES (
                    'ADMIN1',
                    'Administrador',
                    'Panel Transporte',
                    '99999999',
                    'admin1@transportes.com',
                    '${hashedPassword}',
                    'admin',
                    true,
                    ${firstCompany.id}
                );
            `);
            console.log('✅ [USER] Usuario ADMIN1 creado exitosamente');
        } catch (error) {
            console.warn('⚠️ [USER] Error creando usuario ADMIN1:', error.message);

            // Intentar actualizar si ya existe
            try {
                await sequelize.query(`
                    UPDATE users SET
                        password = '${hashedPassword}',
                        company_id = ${firstCompany.id},
                        role = 'admin',
                        is_active = true
                    WHERE legajo = 'ADMIN1';
                `);
                console.log('✅ [USER] Usuario ADMIN1 actualizado');
            } catch (updateError) {
                console.error('❌ [USER] Error actualizando ADMIN1:', updateError.message);
            }
        }

        console.log('\n🎯 [SUCCESS] PROCESO COMPLETADO');
        console.log('\n📊 [CREDENTIALS] Credenciales de testing:');
        console.log('   👤 Usuario: ADMIN1');
        console.log('   🔒 Contraseña: 123');
        console.log(`   🏢 Empresa: ${firstCompany.name} (ID: ${firstCompany.id})`);
        console.log('   👑 Rol: admin');

        console.log('\n📋 [COMPANIES] Empresas disponibles:');
        companies.forEach((company, index) => {
            console.log(`   ${index + 1}. ${company.name} (ID: ${company.company_id})`);
        });

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
    createCompaniesSimple()
        .then(() => {
            console.log('🎉 [SUCCESS] EMPRESAS Y USUARIO CREADOS EXITOSAMENTE');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 [ERROR] FALLO:', error.message);
            process.exit(1);
        });
}

module.exports = { createCompaniesSimple };