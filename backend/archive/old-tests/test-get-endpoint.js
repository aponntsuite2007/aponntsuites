const { User, sequelize } = require('./src/config/database');

// Import formatUserForFrontend from userRoutes
const fs = require('fs');
const userRoutesCode = fs.readFileSync('./src/routes/userRoutes.js', 'utf8');

// Extract formatUserForFrontend function by executing it
eval(userRoutesCode.split('function formatUserForFrontend')[1].split('router.get')[0]);

async function testGetEndpoint() {
    try {
        console.log('🧪 Testing GET endpoint simulation...\n');

        // Get user by UUID (from what you provided in console)
        const userId = '766de495-e4f3-4e91-a509-1a495c52e15c';

        const user = await User.findOne({
            where: { user_id: userId },
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            console.log('❌ Usuario no encontrado');
            await sequelize.close();
            return;
        }

        console.log('📊 RAW user from DB:');
        console.log('   user.isActive:', user.isActive);
        console.log('   user.gpsEnabled:', user.gpsEnabled);
        console.log('   user.departmentId:', user.departmentId);
        console.log('   user.firstName:', user.firstName);
        console.log('   user.lastName:', user.lastName);

        console.log('\n🔧 Calling formatUserForFrontend()...');
        const formattedUser = formatUserForFrontend(user);

        console.log('\n📋 FORMATTED user (what endpoint returns):');
        console.log('   formattedUser.isActive:', formattedUser.isActive);
        console.log('   formattedUser.gpsEnabled:', formattedUser.gpsEnabled);
        console.log('   formattedUser.allowOutsideRadius:', formattedUser.allowOutsideRadius);
        console.log('   formattedUser.departmentId:', formattedUser.departmentId);

        console.log('\n📄 Full formattedUser keys:', Object.keys(formattedUser).join(', '));

        console.log('\n✅ Simulation completed');
        await sequelize.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        await sequelize.close();
    }
}

testGetEndpoint();
