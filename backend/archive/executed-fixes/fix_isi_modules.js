const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'attendance_system',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function fixISIModules() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL');

        await sequelize.query(\);

        console.log('✅ Módulos de ISI actualizados como contratados');

        const finalCheck = await sequelize.query(\, { type: sequelize.QueryTypes.SELECT });

        console.log(\);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

fixISIModules();
