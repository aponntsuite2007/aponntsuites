const { Sequelize } = require('sequelize');
const  sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    dialect: 'postgresql',
    logging: false
});

async function checkUsers() {
    try {
        const [result] = await sequelize.query(
            'SELECT COUNT(*) as count FROM users WHERE company_id = :companyId',
            { replacements: { companyId: 11 }, type: Sequelize.QueryTypes.SELECT }
        );

        console.log(`\n📊 USUARIOS EN BD PARA EMPRESA 11:`);
        console.log(`   Total: ${result.count} usuarios`);

        if (parseInt(result.count) > 0) {
            const users = await sequelize.query(
                'SELECT user_id, usuario, "firstName", "lastName", email, role FROM users WHERE company_id = :companyId LIMIT 5',
                { replacements: { companyId: 11 }, type: Sequelize.QueryTypes.SELECT }
            );

            console.log(`\n📋 PRIMEROS 5 USUARIOS:`);
            users.forEach(u => {
                console.log(`   - ${u.usuario} (${u.firstName} ${u.lastName}) - ${u.role}`);
            });
        } else {
            console.log(`\n⚠️ NO HAY USUARIOS para empresa 11`);
            console.log(`   El test no puede pasar si no hay datos.`);
        }

        await sequelize.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkUsers();
