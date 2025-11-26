const { sequelize } = require('./src/config/database');
const bcrypt = require('bcrypt');

async function createAdminUserISI() {
    try {
        console.log('🔄 Creando usuario admin para empresa ISI...');

        // 1. Verificar que empresa ISI existe
        const isiCompany = await sequelize.query(`
            SELECT company_id, name FROM companies
            WHERE LOWER(name) LIKE '%isi%'
            ORDER BY company_id
            LIMIT 1
        `, {
            type: sequelize.QueryTypes.SELECT
        });

        if (isiCompany.length === 0) {
            throw new Error('Empresa ISI no encontrada');
        }

        const companyId = isiCompany[0].company_id;
        console.log(`✅ Empresa ISI encontrada: ${isiCompany[0].name} (ID: ${companyId})`);

        // 2. Buscar usuario admin@isi.com que no tiene campo usuario
        const existingUser = await sequelize.query(`
            SELECT user_id, usuario, email FROM users
            WHERE company_id = ? AND (usuario = 'admin' OR email = 'admin@isi.com')
        `, {
            replacements: [companyId],
            type: sequelize.QueryTypes.SELECT
        });

        if (existingUser.length > 0) {
            console.log('⚠️ Usuario admin existente en ISI:', existingUser[0]);

            // Actualizar para que tenga usuario='admin' y contraseña='123'
            const hashedPassword = await bcrypt.hash('123', 10);

            await sequelize.query(`
                UPDATE users
                SET usuario = 'admin', password = ?
                WHERE user_id = ?
            `, {
                replacements: [hashedPassword, existingUser[0].user_id],
                type: sequelize.QueryTypes.UPDATE
            });

            console.log('✅ Usuario actualizado: usuario="admin", contraseña="123"');
            return existingUser[0].user_id;
        }

        // 3. Hash de la contraseña
        const hashedPassword = await bcrypt.hash('123', 10);

        // 4. Crear usuario admin (solo campos básicos que sabemos que existen)
        const userId = await sequelize.query(`
            INSERT INTO users (
                company_id,
                usuario,
                password,
                email,
                role,
                is_active,
                created_at,
                updated_at
            ) VALUES (?, 'admin', ?, 'admin@isi.com', 'admin', true, NOW(), NOW())
            RETURNING user_id
        `, {
            replacements: [companyId, hashedPassword],
            type: sequelize.QueryTypes.INSERT
        });

        const newUserId = userId[0][0].user_id;
        console.log(`✅ Usuario admin creado para ISI: ${newUserId}`);

        // 5. Verificar creación
        const verification = await sequelize.query(`
            SELECT
                u.user_id,
                u.usuario,
                u.email,
                u.firstName,
                u.lastName,
                u.role,
                u.is_active,
                c.name as company_name
            FROM users u
            INNER JOIN companies c ON u.company_id = c.company_id
            WHERE u.user_id = ?
        `, {
            replacements: [newUserId],
            type: sequelize.QueryTypes.SELECT
        });

        console.log('\n🎯 USUARIO CREADO:');
        console.log('   • ID:', verification[0].user_id);
        console.log('   • Usuario:', verification[0].usuario);
        console.log('   • Contraseña: 123');
        console.log('   • Email:', verification[0].email);
        console.log('   • Nombre:', verification[0].firstName, verification[0].lastName);
        console.log('   • Rol:', verification[0].role);
        console.log('   • Empresa:', verification[0].company_name);
        console.log('   • Activo:', verification[0].is_active);

        console.log('\n✅ ¡Usuario admin creado exitosamente para ISI!');
        console.log('📋 Credenciales: usuario="admin", contraseña="123"');

    } catch (error) {
        console.error('❌ Error creando usuario admin:', error);
    } finally {
        process.exit(0);
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    createAdminUserISI();
}

module.exports = { createAdminUserISI };