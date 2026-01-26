/**
 * Verificar datos creados para ISI
 */
const { Sequelize } = require('sequelize');
const seq = new Sequelize('postgresql://postgres:Aedr15150302@localhost:5432/attendance_system', { logging: false });

async function verify() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                VERIFICACIÓN DE DATOS ISI                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Empleados
  const [emps] = await seq.query('SELECT COUNT(*) as total FROM users WHERE company_id = 11');
  console.log('👥 Empleados:', emps[0].total);

  // Turnos
  const [shifts] = await seq.query('SELECT name FROM shifts WHERE company_id = 11');
  console.log('\n⏰ Turnos:', shifts.length);
  shifts.forEach(s => console.log('   ', s.name));

  // Asistencias
  const [attStats] = await seq.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN is_late THEN 1 ELSE 0 END) as tardanzas,
      SUM(CASE WHEN overtime_hours::numeric > 0 THEN 1 ELSE 0 END) as con_overtime
    FROM attendances WHERE company_id = 11
  `);
  console.log('\n📊 Asistencias:');
  console.log('    Total:', attStats[0].total);
  console.log('    Tardanzas:', attStats[0].tardanzas);
  console.log('    Con overtime:', attStats[0].con_overtime);

  // Licencias médicas
  const [medical] = await seq.query('SELECT COUNT(*) as total FROM medical_leaves WHERE company_id = 11');
  console.log('\n🏥 Licencias médicas:', medical[0].total);

  // Muestra de empleados
  const [sample] = await seq.query(`
    SELECT u."firstName", u."lastName", u.position, u.salary
    FROM users u
    WHERE u.company_id = 11 AND u.role = 'employee'
    ORDER BY u.salary DESC
    LIMIT 5
  `);
  console.log('\n📋 Top 5 salarios:');
  sample.forEach(e => console.log('   ', e.firstName, e.lastName, '|', e.position, '| $' + (e.salary || 0).toLocaleString()));

  console.log('\n✅ Verificación completada');
  await seq.close();
}

verify().catch(e => console.error('ERROR:', e.message));
