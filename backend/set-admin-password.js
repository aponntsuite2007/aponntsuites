const bcrypt = require('bcrypt');
const { User } = require('./src/config/database');

async function setAdminPassword() {
    try {
        console.log('🔍 Buscando administrador...');
        
        const admin = await User.findOne({
            where: { 
                email: 'admin@empresa.com'
            }
        });
        
        if (!admin) {
            console.log('❌ Administrador no encontrado');
            return;
        }
        
        // Establecer password simple: "admin123"
        const newPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await admin.update({
            password: hashedPassword
        });
        
        console.log('✅ Contraseña actualizada exitosamente');
        console.log('📋 Credenciales de acceso:');
        console.log(`    - Email: ${admin.email}`);
        console.log(`    - Password: ${newPassword}`);
        console.log(`    - Employee ID: ${admin.employeeId}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

setAdminPassword();