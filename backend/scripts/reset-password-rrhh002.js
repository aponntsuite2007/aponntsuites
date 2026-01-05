/**
 * Reset password para usuario RRHH-002 de ISI
 */

const bcrypt = require('bcryptjs');
const db = require('../src/config/database');

async function resetPassword() {
    console.log('🔐 Reseteando password para RRHH-002...\n');

    try {
        await db.sequelize.authenticate();
        console.log('✅ Conectado a la base de datos\n');

        // Buscar usuario
        const user = await db.User.findOne({
            where: {
                employeeId: 'RRHH-002',
                company_id: 11
            }
        });

        if (!user) {
            console.log('❌ Usuario RRHH-002 no encontrado');
            process.exit(1);
        }

        console.log('✅ Usuario encontrado:', {
            id: user.user_id,
            employeeId: user.employeeId,
            email: user.email,
            company_id: user.company_id
        });

        // Nueva password: test123
        const newPassword = 'test123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Actualizar password
        await db.User.update(
            { password: hashedPassword },
            { where: { user_id: user.user_id } }
        );

        console.log('\n✅ Password actualizada exitosamente!');
        console.log('📋 Credenciales para login:');
        console.log('   Email: rrhh2@isi.test');
        console.log('   Password: test123');
        console.log('   Company Slug: isi');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}

resetPassword();
