/**
 * Script para verificar la estructura de system_modules
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'attendance_system',
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  dialect: 'postgres',
  logging: false
};

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);

async function checkTable() {
  try {
    await sequelize.authenticate();
    console.log('Conexión exitosa');

    // Ver estructura de la tabla
    const cols = await sequelize.query(
      `SELECT column_name, data_type, column_default
       FROM information_schema.columns
       WHERE table_name = 'system_modules'
       ORDER BY ordinal_position`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log('\\nColumnas de system_modules:');
    cols.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type} (default: ${c.column_default})`));

    // Ver max ID
    const maxId = await sequelize.query('SELECT MAX(id) as max_id FROM system_modules', { type: Sequelize.QueryTypes.SELECT });
    console.log('\\nMax ID:', maxId[0]?.max_id);

    // Ver si ya existe hours-cube-dashboard
    const existing = await sequelize.query(
      `SELECT id, module_key, name FROM system_modules WHERE module_key = 'hours-cube-dashboard'`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log('\\nExistente hours-cube-dashboard:', existing.length > 0 ? existing : 'No existe');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
  }
}

checkTable();
