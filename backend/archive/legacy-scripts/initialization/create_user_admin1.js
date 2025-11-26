// ============================================
// PANEL-TRANSPORTE - CREAR USUARIO ADMIN1
// ============================================
// 📅 Fecha: 2025-09-23
// 🎯 Objetivo: Crear usuario ADMIN1 con estructura real de la tabla users

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

async function createUserAdmin1() {
    try {
        console.log('🔄 [USER] Conectando a PostgreSQL...');

        await sequelize.authenticate();
        console.log('✅ [USER] Conectado exitosamente');

        // Verificar estructura de tabla users
        console.log('🔍 [USER] Verificando estructura de tabla users...');
        const userColumns = await sequelize.query(
            `SELECT column_name, data_type, is_nullable
             FROM information_schema.columns
             WHERE table_name = 'users'
             ORDER BY ordinal_position`,
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log('📋 [USER] Columnas en tabla users:');
        userColumns.forEach(col => {
            console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

        // Buscar empresa de transporte
        const companies = await sequelize.query(
            `SELECT company_id, name FROM companies WHERE metadata->>'created_for' = 'panel-transporte' ORDER BY name LIMIT 1`,
            { type: sequelize.QueryTypes.SELECT }
        );

        if (companies.length === 0) {
            console.log('❌ [USER] No se encontraron empresas de transporte');
            return;
        }

        const company = companies[0];
        console.log(`🏢 [USER] Usando empresa: ${company.name} (ID: ${company.company_id})`);

        // Verificar si existe usuario con email admin1@transportes.com o employeeId ADMIN1
        const existingUser = await sequelize.query(
            `SELECT user_id, email FROM users WHERE email = 'admin1@transportes.com' OR "employeeId" = 'ADMIN1' OR dni = '88888888'`,
            { type: sequelize.QueryTypes.SELECT }
        );

        if (existingUser.length > 0) {
            console.log('⚠️ [USER] Usuario con email admin1@transportes.com ya existe, actualizando...');

            const hashedPassword = await bcrypt.hash('123', 10);

            await sequelize.query(`
                UPDATE users SET
                    password = '${hashedPassword}',
                    company_id = ${company.company_id},
                    is_active = true,
                    "updatedAt" = NOW()
                WHERE email = 'admin1@transportes.com' OR "employeeId" = 'ADMIN1' OR dni = '88888888';
            `);
            console.log('✅ [USER] Usuario actualizado exitosamente');
        } else {
            console.log('🔄 [USER] Creando nuevo usuario ADMIN1...');

            const hashedPassword = await bcrypt.hash('123', 10);

            // Identificar campos obligatorios
            const requiredFields = userColumns.filter(col => col.is_nullable === 'NO');
            console.log('📋 [USER] Campos obligatorios:', requiredFields.map(f => f.column_name));

            // Crear usuario con campos mínimos usando estructura real
            await sequelize.query(`
                INSERT INTO users (
                    id, "employeeId", "firstName", "lastName", email, dni, password,
                    company_id, "allowOutsideRadius", "createdAt", "updatedAt"
                ) VALUES (
                    gen_random_uuid(),
                    'ADMIN1',
                    'Admin',
                    'Panel Transporte',
                    'admin1@transportes.com',
                    '88888888',
                    '${hashedPassword}',
                    ${company.company_id},
                    false,
                    NOW(),
                    NOW()
                );
            `);
            console.log('✅ [USER] Usuario ADMIN1 creado exitosamente');
        }

        // Verificar el usuario creado
        const finalUser = await sequelize.query(
            `SELECT id, "firstName", "lastName", email, company_id, is_active
             FROM users WHERE email = 'admin1@transportes.com'`,
            { type: sequelize.QueryTypes.SELECT }
        );

        if (finalUser.length > 0) {
            const user = finalUser[0];
            console.log('\n📊 [USER] Usuario configurado:');
            console.log(`   🆔 ID: ${user.user_id}`);
            console.log(`   👤 Nombre: ${user.firstName} ${user.lastName}`);
            console.log(`   📧 Email: ${user.email}`);
            console.log(`   🏢 Empresa ID: ${user.company_id}`);
            console.log(`   ✅ Activo: ${user.is_active}`);
            console.log('\n🔑 [USER] Credenciales para testing:');
            console.log('   👤 Usuario: admin1@transportes.com');
            console.log('   🔒 Contraseña: 123');
        }

        console.log('\n🎯 [USER] USUARIO ADMIN1 LISTO PARA TESTING');

    } catch (error) {
        console.error('❌ [USER] Error:', error);
        throw error;
    } finally {
        await sequelize.close();
        console.log('\n🔐 [USER] Conexión cerrada');
    }
}

// Ejecutar
if (require.main === module) {
    createUserAdmin1()
        .then(() => {
            console.log('\n🎉 [USER] USUARIO DE TESTING CREADO EXITOSAMENTE');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 [USER] FALLO:', error.message);
            process.exit(1);
        });
}

module.exports = { createUserAdmin1 };