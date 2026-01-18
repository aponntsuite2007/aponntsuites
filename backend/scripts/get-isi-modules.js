const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'sistema_asistencia',
  user: 'postgres',
  password: 'admin123'
});

(async () => {
  try {
    const res = await pool.query('SELECT modules_data FROM companies WHERE id = 11');
    const modulesData = res.rows[0]?.modules_data || [];
    const activeModules = modulesData.filter(m => m.active).map(m => m.module_key);
    
    console.log('MÓDULOS ACTIVOS PARA ISI (company_id=11):');
    console.log('Total:', activeModules.length);
    console.log(JSON.stringify(activeModules, null, 2));
    
    await pool.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
