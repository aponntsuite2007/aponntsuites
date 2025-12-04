require('dotenv').config();
const db = require('../src/config/database');

async function check() {
  try {
    // Ver feriados existentes
    const [holidays] = await db.sequelize.query(`
      SELECT id, country, state_province, date, name, is_national, is_provincial, year
      FROM holidays
      ORDER BY country, date;
    `);

    console.log('=== FERIADOS EN BD ===\n');
    let currentCountry = '';
    holidays.forEach(h => {
      if (h.country !== currentCountry) {
        currentCountry = h.country;
        console.log(`\n📍 ${currentCountry}:`);
      }
      const tipo = h.is_national ? '🇦🇷 Nacional' : (h.is_provincial ? '🏛️ Provincial' : '📅');
      const dateStr = typeof h.date === 'string' ? h.date : h.date.toISOString().split('T')[0];
      console.log(`  ${dateStr} - ${h.name} (${tipo})`);
    });

    // Ver sucursales en tabla branches
    const [branches] = await db.sequelize.query(`
      SELECT id, name, country, state_province, company_id
      FROM branches
      ORDER BY company_id;
    `);
    console.log('\n\n=== SUCURSALES (tabla branches) ===');
    if (branches.length === 0) {
      console.log('  (No hay sucursales)');
    } else {
      branches.forEach(b => console.log(`  [${b.company_id}] ${b.name} - ${b.country || 'Sin país'} / ${b.state_province || 'Sin provincia'}`));
    }

    // Ver turnos y su branch_id
    const [shifts] = await db.sequelize.query(`
      SELECT s.id, s.name, s.branch_id, s.respect_national_holidays, s.respect_provincial_holidays, s.custom_non_working_days,
             b.name as branch_name, b.country, b.state_province
      FROM shifts s
      LEFT JOIN branches b ON b.id = s.branch_id
      WHERE s.company_id = 11
      ORDER BY s.name;
    `);
    console.log('\n\n=== TURNOS DE ISI (company_id=11) ===');
    shifts.forEach(s => {
      const nat = s.respect_national_holidays ? '✅' : '❌';
      const prov = s.respect_provincial_holidays ? '✅' : '❌';
      const customDays = s.custom_non_working_days ? JSON.stringify(s.custom_non_working_days) : '[]';
      console.log(`  ${s.name}`);
      console.log(`    - Sucursal: ${s.branch_name || 'SIN ASIGNAR'} (${s.country || 'Sin país'})`);
      console.log(`    - Feriados: Nacional ${nat} | Provincial ${prov}`);
      console.log(`    - Días no laborables personalizados: ${customDays}`);
    });

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
check();
