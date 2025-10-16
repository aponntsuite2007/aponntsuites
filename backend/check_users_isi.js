const { sequelize } = require('./src/config/database');

async function checkUsers() {
    try {
        const [users] = await sequelize.query(`
            SELECT user_id, usuario, email, "firstName", "lastName", company_id, is_active
            FROM users
            WHERE company_id = 11
            LIMIT 10
        `);

        console.log('\n👥 Usuarios de company_id=11 (ISI):\n');
        if (users.length === 0) {
            console.log('  ⚠️ NO HAY USUARIOS para company_id=11');
        } else {
            users.forEach(u => {
                console.log(`  📧 Usuario: ${u.usuario || 'NULL'}`);
                console.log(`     Email: ${u.email}`);
                console.log(`     Nombre: ${u.firstName} ${u.lastName}`);
                console.log(`     Activo: ${u.is_active}`);
                console.log(``);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkUsers();
