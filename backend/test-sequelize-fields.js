const { User, sequelize } = require('./src/config/database');

async function testSequelizeFields() {
    try {
        console.log('🔍 Testing Sequelize field access...\n');

        // Get user by email (admin@isi.com)
        const user = await User.findOne({
            where: { email: 'admin@isi.com' },
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            console.log('❌ Usuario no encontrado');
            await sequelize.close();
            return;
        }

        console.log('📊 RAW Sequelize instance:');
        console.log('user.isActive:', user.isActive);
        console.log('user.gpsEnabled:', user.gpsEnabled);
        console.log('user.firstName:', user.firstName);
        console.log('user.lastName:', user.lastName);
        console.log('user.departmentId:', user.departmentId);

        console.log('\n📋 user.toJSON():');
        const userData = user.toJSON();
        console.log('userData.isActive:', userData.isActive);
        console.log('userData.gpsEnabled:', userData.gpsEnabled);
        console.log('userData.firstName:', userData.firstName);
        console.log('userData.lastName:', userData.lastName);
        console.log('userData.departmentId:', userData.departmentId);

        console.log('\n📝 user.dataValues:');
        console.log('user.dataValues.isActive:', user.dataValues.isActive);
        console.log('user.dataValues.gpsEnabled:', user.dataValues.gpsEnabled);
        console.log('user.dataValues.firstName:', user.dataValues.firstName);
        console.log('user.dataValues.lastName:', user.dataValues.lastName);
        console.log('user.dataValues.departmentId:', user.dataValues.departmentId);

        console.log('\n📐 Full user.toJSON() keys:', Object.keys(userData));
        console.log('\n📐 Full user.toJSON():', JSON.stringify(userData, null, 2));

        await sequelize.close();
        console.log('\n✅ Test completado');
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        await sequelize.close();
    }
}

testSequelizeFields();
