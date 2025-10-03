// Script para configurar el sistema biométrico completo
const { Pool } = require('pg');
const fs = require('fs');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT,
});

async function setupBiometricSystem() {
    try {
        console.log('🚀 [SETUP] Configurando sistema biométrico completo...\n');

        // 1. CREAR TABLAS BIOMÉTRICAS
        console.log('📋 [TABLES] Creando tablas biométricas...');
        const sql = fs.readFileSync('create_biometric_tables.sql', 'utf8');
        await pool.query(sql);
        console.log('✅ [TABLES] Tablas biométricas creadas exitosamente\n');

        // 2. ESTANDARIZAR SISTEMA DE USUARIOS (SIN EMAILS)
        console.log('👤 [USERS] Estandarizando sistema de usuarios...');

        // Verificar si ya existen usuarios admin simples
        const existingAdmins = await pool.query(`
            SELECT company_id, COUNT(*) as admin_count
            FROM users
            WHERE role = 'admin' AND usuario IS NOT NULL
            GROUP BY company_id
        `);

        console.log(`📊 [USERS] Empresas con admin existente: ${existingAdmins.rows.length}`);

        // 3. CREAR USUARIOS ADMIN SIMPLES PARA EMPRESAS SIN ADMIN
        const companiesQuery = await pool.query('SELECT company_id, name, slug FROM companies ORDER BY company_id');
        const companies = companiesQuery.rows;

        for (const company of companies) {
            const hasAdmin = existingAdmins.rows.find(row => row.company_id === company.company_id);

            if (!hasAdmin) {
                console.log(`🔧 [ADMIN] Creando admin para empresa: ${company.name}`);

                // Crear usuario admin específico por empresa: "admin[company_id]"
                const adminUser = `admin${company.company_id}`;
                const adminPassword = await bcrypt.hash('admin123', 12);

                // Verificar si el usuario ya existe
                const existingUser = await pool.query(`
                    SELECT usuario FROM users WHERE usuario = $1
                `, [adminUser]);

                if (existingUser.rows.length === 0) {
                    await pool.query(`
                        INSERT INTO users (
                            user_id, usuario, "firstName", "lastName", password, role,
                            company_id, "isActive", is_active, has_facial_data, biometric_enrolled,
                            "employeeId", email, dni, "createdAt", "updatedAt"
                        ) VALUES (
                            gen_random_uuid(),
                            $1,
                            'Administrador',
                            'Sistema',
                            $2,
                            'admin',
                            $3,
                            true,
                            true,
                            false,
                            false,
                            $4,
                            $5,
                            $6,
                            CURRENT_TIMESTAMP,
                            CURRENT_TIMESTAMP
                        )
                    `, [
                        adminUser,
                        adminPassword,
                        company.company_id,
                        `EMP${company.company_id}ADM001`, // employeeId único
                        `admin${company.company_id}@sistema.local`, // email único
                        `99999${String(company.company_id).padStart(3, '0')}` // dni único
                    ]);

                    console.log(`  ✅ Admin creado: usuario="${adminUser}", password="admin123"`);
                } else {
                    console.log(`  ⚠️  Usuario ${adminUser} ya existe`);
                }
            } else {
                console.log(`  ℹ️  Empresa ${company.name} ya tiene admin`);
            }
        }

        // 4. REMOVER DEPENDENCIA DE EMAILS EN AUTH
        console.log('\n🔐 [AUTH] Limpiando campos de email innecesarios...');

        // Actualizar usuarios que tengan email como username a usuario simple
        const emailUsers = await pool.query(`
            SELECT user_id, email, company_id
            FROM users
            WHERE email LIKE '%@%'
            AND (usuario IS NULL OR usuario = email)
            AND role = 'admin'
        `);

        console.log(`📧 [CLEAN] Usuarios con email encontrados: ${emailUsers.rows.length}`);

        for (const user of emailUsers.rows) {
            // Cambiar a usuario simple y actualizar email para evitar conflictos
            const newEmail = `admin${user.company_id}@sistema.local`;
            await pool.query(`
                UPDATE users
                SET usuario = $1, email = $2
                WHERE user_id = $3
            `, [`admin${user.company_id}`, newEmail, user.user_id]);

            console.log(`  🔄 Convertido: ${user.email} → usuario="admin${user.company_id}"`);
        }

        // 5. VERIFICACIÓN FINAL
        console.log('\n🔍 [VERIFY] Verificación final del sistema...');

        const finalCheck = await pool.query(`
            SELECT
                c.company_id,
                c.name as company_name,
                c.slug,
                COUNT(u.user_id) as total_users,
                COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admin_count,
                COUNT(CASE WHEN u.has_facial_data = true THEN 1 END) as users_with_face
            FROM companies c
            LEFT JOIN users u ON c.company_id = u.company_id
            GROUP BY c.company_id, c.name, c.slug
            ORDER BY c.company_id
        `);

        console.log('\n📊 [REPORT] Estado final del sistema:');
        console.log('─'.repeat(80));

        for (const row of finalCheck.rows) {
            console.log(`🏢 ${row.company_name} (ID: ${row.company_id})`);
            console.log(`   👥 Total usuarios: ${row.total_users}`);
            console.log(`   👤 Admins: ${row.admin_count}`);
            console.log(`   🎭 Con rostro: ${row.users_with_face}`);
            console.log('');
        }

        // 6. VERIFICAR TABLAS BIOMÉTRICAS
        const tablesCheck = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE '%biometric%'
            ORDER BY table_name
        `);

        console.log('📋 [BIOMETRIC] Tablas biométricas creadas:');
        for (const table of tablesCheck.rows) {
            console.log(`   ✅ ${table.table_name}`);
        }

        console.log('\n🎯 [SUCCESS] Sistema biométrico configurado completamente');
        console.log('🔑 [LOGIN] Usa: usuario="admin[company_id]", password="admin123"');
        console.log('🔑 [EXAMPLES] admin1, admin2, admin4, admin11, etc.');

    } catch (error) {
        console.error('❌ [ERROR] Error configurando sistema:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

setupBiometricSystem();