/**
 * Test Pipeline RRHH con empleado ISI
 */
const { Sequelize } = require('sequelize');
const seq = new Sequelize('postgresql://postgres:Aedr15150302@localhost:5432/attendance_system', { logging: false });

async function testPipeline() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  TEST PIPELINE RRHH - Empleado ISI con Turno');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Buscar empleado ISI con turno asignado
  const [emp] = await seq.query(`
    SELECT u.user_id, u."firstName", u."lastName", u.salary,
           s.name as turno, s.id as shift_id, s."startTime", s."endTime"
    FROM users u
    JOIN user_shift_assignments usa ON usa.user_id = u.user_id AND usa.is_active = true
    JOIN shifts s ON s.id = usa.shift_id
    WHERE u.company_id = 11 AND u.role = 'employee'
    LIMIT 1
  `);

  if (!emp.length) {
    console.log('No hay empleados con turno asignado');
    return;
  }

  const e = emp[0];
  console.log('👤 Empleado:', e.firstName, e.lastName);
  console.log('💰 Salario:', '$' + (e.salary || 0).toLocaleString());
  console.log('⏰ Turno:', e.turno, '(' + e.startTime + '-' + e.endTime + ')');
  console.log('');

  // 2. Verificar asistencias del empleado
  const [att] = await seq.query(`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN is_late THEN 1 ELSE 0 END) as tardanzas,
           SUM(CASE WHEN overtime_hours::numeric > 0 THEN 1 ELSE 0 END) as overtime,
           ROUND(SUM("workingHours"::numeric), 2) as total_hours,
           ROUND(SUM(overtime_hours::numeric), 2) as total_overtime
    FROM attendances
    WHERE "UserId" = :userId
  `, { replacements: { userId: e.user_id } });

  const stats = att[0];
  console.log('📊 Estadísticas del mes:');
  console.log('    Días trabajados:', stats.total);
  console.log('    Tardanzas:', stats.tardanzas);
  console.log('    Días con overtime:', stats.overtime);
  console.log('    Horas totales:', stats.total_hours);
  console.log('    Horas extra totales:', stats.total_overtime);

  // 3. Calcular liquidación estimada
  const baseSalary = parseFloat(e.salary) || 500000;
  const hourlyRate = baseSalary / 200;
  const overtimeHours = parseFloat(stats.total_overtime) || 0;
  const overtimePay = overtimeHours * hourlyRate * 1.5;
  const daysWorked = parseInt(stats.total) || 0;
  const presentismo = daysWorked >= 20 ? baseSalary * 0.10 : 0;

  const grossSalary = baseSalary + overtimePay + presentismo;
  const deductions = grossSalary * 0.17; // 17% aportes empleado
  const netSalary = grossSalary - deductions;
  const employerCost = grossSalary * 1.24; // 24% contrib empleador

  console.log('\n💵 LIQUIDACIÓN ESTIMADA:');
  console.log('    Básico:           $' + baseSalary.toLocaleString('es-AR'));
  console.log('    Horas extra:      $' + Math.round(overtimePay).toLocaleString('es-AR'));
  console.log('    Presentismo:      $' + Math.round(presentismo).toLocaleString('es-AR'));
  console.log('    ─────────────────────────');
  console.log('    BRUTO:            $' + Math.round(grossSalary).toLocaleString('es-AR'));
  console.log('    Deducciones (17%):$' + Math.round(deductions).toLocaleString('es-AR'));
  console.log('    ─────────────────────────');
  console.log('    NETO A COBRAR:    $' + Math.round(netSalary).toLocaleString('es-AR'));
  console.log('    Costo empleador:  $' + Math.round(employerCost).toLocaleString('es-AR'));

  // 4. Test ShiftCalculator
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  TEST SHIFT CALCULATOR SERVICE');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    const ShiftCalculatorService = require('../src/services/ShiftCalculatorService');
    const today = new Date().toISOString().split('T')[0];
    const shiftResult = await ShiftCalculatorService.calculateUserShiftForDate(e.user_id, today);

    console.log('Resultado ShiftCalculator:');
    console.log('    hasAssignment:', shiftResult.hasAssignment);
    if (shiftResult.hasAssignment) {
      console.log('    ✅ Turno detectado:', shiftResult.shift?.name);
      console.log('    Horario:', shiftResult.shift?.startTime, '-', shiftResult.shift?.endTime);
      console.log('    shouldWork:', shiftResult.shouldWork);
    } else {
      console.log('    ⚠️  Sin turno:', shiftResult.reason);
    }
  } catch (err) {
    console.log('    ❌ Error:', err.message);
  }

  console.log('\n✅ Pipeline RRHH completado');
  await seq.close();
}

testPipeline().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
