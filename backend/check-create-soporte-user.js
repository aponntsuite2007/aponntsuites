/**
 * Script para verificar/crear usuario SOPORTE para testing
 * Usuario oculto exclusivo para Phase 4 Testing
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function checkCreateSoporteUser() {
    try {
        console.log('\n🔍 Verificando usuario SOPORTE para testing...\n');

        // Obtener todas las empresas activas
        const [companies] = await sequelize.query(`
            SELECT company_id, name, slug FROM companies WHERE is_active = true
        `);

        console.log(`📊 Empresas encontradas: ${companies.length}\n`);

        let created = 0;
        let existing = 0;

        for (const company of companies) {
            console.log(`\n🏢 Empresa: ${company.name} (${company.slug})`);

            // Verificar si existe usuario soporte (mismo nombre para todas las empresas)
            const existingUsers = await sequelize.query(`
                SELECT user_id, usuario, role, "isActive"
                FROM users
                WHERE company_id = :companyId AND usuario = 'soporte'
            `, {
                replacements: {
                    companyId: company.company_id
                },
                type: sequelize.QueryTypes.SELECT
            });

            if (existingUsers && existingUsers.length > 0) {
                const user = existingUsers[0];
                console.log(`   ✅ Usuario 'soporte' YA EXISTE`);
                console.log(`      - ID: ${user.user_id}`);
                console.log(`      - Role: ${user.role}`);
                console.log(`      - Active: ${user.isActive}`);
                existing++;
            } else {
                console.log(`   ⚠️  Usuario 'soporte' NO EXISTE - Creando...`);

                // Hash de la contraseña
                const hashedPassword = await bcrypt.hash('admin123', 10);

                // DNI único por empresa (usando company_id)
                const uniqueDni = `SOPORTE_${company.company_id}`;

                // Crear usuario soporte (con UUID generado por PostgreSQL)
                await sequelize.query(`
                    INSERT INTO users (
                        user_id,
                        company_id,
                        usuario,
                        password,
                        "firstName",
                        "lastName",
                        "employeeId",
                        dni,
                        email,
                        role,
                        "isActive",
                        notes,
                        "createdAt",
                        "updatedAt"
                    ) VALUES (
                        gen_random_uuid(),
                        :companyId,
                        'soporte',
                        :password,
                        'Sistema',
                        'Testing',
                        :employeeId,
                        :dni,
                        :email,
                        'admin',
                        true,
                        'SYSTEM_USER_TESTING_ONLY',
                        NOW(),
                        NOW()
                    )
                `, {
                    replacements: {
                        companyId: company.company_id,
                        password: hashedPassword,
                        employeeId: `SOPORTE_${company.company_id}`,
                        dni: uniqueDni,
                        email: `soporte-${company.company_id}@aponnt.internal`
                    }
                });

                console.log(`   ✅ Usuario 'soporte' CREADO exitosamente`);
                console.log(`      - Usuario: soporte`);
                console.log(`      - Password: admin123`);
                console.log(`      - Role: admin`);
                console.log(`      - Sistema: true (marcado en notes)`);
                created++;
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('📊 RESUMEN:');
        console.log(`   ✅ Usuarios soporte existentes: ${existing}`);
        console.log(`   🆕 Usuarios soporte creados: ${created}`);
        console.log(`   📊 Total empresas: ${companies.length}`);
        console.log('='.repeat(80) + '\n');

        console.log('✅ Proceso completado exitosamente\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
    }
}

checkCreateSoporteUser();
