const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
  host: 'localhost',
  dialect: 'postgresql',
  logging: false,
  pool: { max: 5, min: 0, idle: 10000 }
});

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.UUID,
    primaryKey: true,
  },
  email: DataTypes.STRING,
  first_name: DataTypes.STRING,
  last_name: DataTypes.STRING,
  gps_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'gps_enabled'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    field: 'is_active'
  }
}, {
  tableName: 'users',
  timestamps: false
});

async function checkGPS() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');

    const userId = '766de495-e4f3-4e91-a509-1a495c52e15c';

    // Raw query
    const [rawResults] = await sequelize.query(`
      SELECT user_id, email, first_name, last_name, gps_enabled, is_active
      FROM users
      WHERE user_id = '${userId}'
    `);

    console.log('\n📊 RAW QUERY (directo de PostgreSQL):');
    console.log(JSON.stringify(rawResults[0], null, 2));

    // Sequelize query
    const user = await User.findOne({
      where: { user_id: userId },
      raw: true
    });

    console.log('\n🔍 SEQUELIZE QUERY (con mapeo):');
    console.log(JSON.stringify(user, null, 2));

    console.log('\n🎯 COMPARACIÓN:');
    console.log(`Raw gps_enabled: ${rawResults[0].gps_enabled}`);
    console.log(`Sequelize gps_enabled: ${user.gps_enabled}`);

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkGPS();
