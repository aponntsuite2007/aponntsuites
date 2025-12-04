require('dotenv').config();
const db = require('../src/config/database');

async function check() {
  try {
    // Ver todas las tablas con 'branch' en el nombre
    const [tables] = await db.sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name LIKE '%branch%' AND table_schema = 'public';
    `);
    console.log('=== TABLAS CON "branch" ===');
    tables.forEach(t => console.log('  ' + t.table_name));

    // Ver si hay tabla branches (no company_branches)
    const [branchCols] = await db.sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'branches'
      ORDER BY ordinal_position;
    `);
    if (branchCols.length > 0) {
      console.log('\n=== BRANCHES (tabla separada) ===');
      branchCols.forEach(c => console.log('  ' + c.column_name + ': ' + c.data_type));
    }

    // Ver sucursales de company_id=11 (ISI)
    const [branchData] = await db.sequelize.query(`
      SELECT cb.id, cb.branch_name, cb.country_id, pc.country_code, pc.country_name
      FROM company_branches cb
      LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
      WHERE cb.company_id = 11;
    `);
    console.log('\n=== SUCURSALES DE ISI (company_id=11) ===');
    if (branchData.length === 0) {
      console.log('  (No hay sucursales para esta empresa)');
    } else {
      branchData.forEach(b => console.log('  ID:' + b.id + ' | ' + b.branch_name + ' | País: ' + (b.country_code || 'SIN') + ' - ' + (b.country_name || 'NO ASIGNADO')));
    }

    // Ver datos de holidays
    const [holidayCount] = await db.sequelize.query(`SELECT COUNT(*) as count FROM holidays;`);
    console.log('\n=== FERIADOS EN BD ===');
    console.log('  Total:', holidayCount[0].count);

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
check();
