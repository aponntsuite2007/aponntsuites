/**
 * TEST CIRCUITO RRHH COMPLETO
 *
 * Usuario: Franco Romero (user_id: d6493c18-4dbb-45ac-bb0c-01deb197943a)
 * Empresa: ISI (company_id: 11)
 * Turno: Turno Tarde (14:00-22:00)
 *
 * Prueba:
 * 1. ShiftCalculatorService - Detecta turno asignado
 * 2. Attendance Create - Con shift_id
 * 3. OvertimeCalculatorService - Calcula horas extra
 * 4. HourBankService - Registra en banco de horas
 */

const { Sequelize } = require('sequelize');

// Datos del test
const TEST_USER = {
  user_id: 'd6493c18-4dbb-45ac-bb0c-01deb197943a',
  company_id: 11,
  nombre: 'Franco Romero',
  turno: 'Turno Tarde (14:00-22:00)'
};

async function testShiftCalculator() {
  console.log('========================================');
  console.log('  1. TEST SHIFT CALCULATOR SERVICE');
  console.log('========================================\n');

  const ShiftCalculatorService = require('./src/services/ShiftCalculatorService');

  const today = new Date().toISOString().split('T')[0];
  console.log('Usuario:', TEST_USER.nombre);
  console.log('Fecha:', today);
  console.log('Turno esperado:', TEST_USER.turno);
  console.log('');

  try {
    const result = await ShiftCalculatorService.calculateUserShiftForDate(
      TEST_USER.user_id,
      today
    );

    console.log('=== RESULTADO ===');
    console.log('hasAssignment:', result.hasAssignment);

    if (result.hasAssignment) {
      console.log('✅ TURNO DETECTADO');
      console.log('  shift.name:', result.shift?.name);
      console.log('  shift.id:', result.shift?.id);
      console.log('  startTime:', result.shift?.startTime);
      console.log('  endTime:', result.shift?.endTime);
      console.log('  shiftType:', result.shiftType);
      console.log('  shouldWork:', result.shouldWork);
      console.log('  phase:', result.phase);
      return { success: true, shift: result.shift };
    } else {
      console.log('❌ SIN TURNO:', result.reason);
      return { success: false, reason: result.reason };
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

async function testAttendanceWithShift(shiftId) {
  console.log('\n========================================');
  console.log('  2. TEST ATTENDANCE CREATE CON SHIFT');
  console.log('========================================\n');

  const seq = new Sequelize('postgresql://postgres:Aedr15150302@localhost:5432/attendance_system', {logging: false});
  const today = new Date().toISOString().split('T')[0];

  try {
    // Limpiar attendance previo del mismo día
    await seq.query(`
      DELETE FROM attendances
      WHERE "UserId" = '${TEST_USER.user_id}'
      AND DATE("checkInTime") = '${today}'
    `);

    // Crear check-in (simula las 14:00 - inicio de Turno Tarde)
    const checkInTime = new Date();
    checkInTime.setHours(14, 5, 0, 0); // 14:05 (5 min tarde)

    const [created] = await seq.query(`
      INSERT INTO attendances
      (id, "UserId", company_id, date, "checkInTime", "checkInMethod", origin_type, status, shift_id, "createdAt", "updatedAt")
      VALUES
      (gen_random_uuid(), '${TEST_USER.user_id}', ${TEST_USER.company_id}, '${today}',
       '${checkInTime.toISOString()}', 'mobile', 'mobile_app', 'present',
       ${shiftId ? `'${shiftId}'` : 'NULL'}, NOW(), NOW())
      RETURNING *
    `);

    const attendance = created[0];
    console.log('✅ ATTENDANCE CREADO');
    console.log('  id:', attendance.id);
    console.log('  checkInTime:', attendance.checkInTime);
    console.log('  shift_id:', attendance.shift_id || '(ninguno)');

    // Verificar is_late (tolerancia 15 min normalmente)
    const isLate = checkInTime.getHours() * 60 + checkInTime.getMinutes() > 14 * 60 + 15;
    console.log('  is_late esperado:', isLate ? 'Sí (llegó después de 14:15)' : 'No');

    return { success: true, attendance };
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return { success: false, error: error.message };
  } finally {
    await seq.close();
  }
}

async function testOvertimeCalculator(attendanceId) {
  console.log('\n========================================');
  console.log('  3. TEST OVERTIME CALCULATOR SERVICE');
  console.log('========================================\n');

  const overtimeCalculator = require('./src/services/OvertimeCalculatorService');
  const { Attendance } = require('./src/config/database');
  const seq = new Sequelize('postgresql://postgres:Aedr15150302@localhost:5432/attendance_system', {logging: false});

  try {
    // Simular checkout a las 23:00 (1 hora extra después de las 22:00)
    const checkOutTime = new Date();
    checkOutTime.setHours(23, 0, 0, 0);

    // Actualizar attendance con checkout
    await seq.query(`
      UPDATE attendances
      SET "checkOutTime" = '${checkOutTime.toISOString()}',
          "checkOutMethod" = 'mobile',
          "updatedAt" = NOW()
      WHERE id = '${attendanceId}'
    `);

    // Obtener attendance actualizado
    const attendance = await Attendance.findByPk(attendanceId);
    console.log('Attendance actualizado con checkout:');
    console.log('  checkInTime:', attendance.check_in);
    console.log('  checkOutTime:', attendance.check_out);

    // Calcular horas trabajadas
    const hoursWorked = (new Date(attendance.check_out) - new Date(attendance.check_in)) / (1000 * 60 * 60);
    console.log('  Horas trabajadas:', hoursWorked.toFixed(2));

    // Calcular overtime (ya es instancia)
    const overtimeCalc = overtimeCalculator;
    console.log('\n=== PROCESANDO OVERTIME ===');

    const result = await overtimeCalc.processCheckoutForHourBank(
      attendance,
      TEST_USER.company_id,
      TEST_USER.user_id
    );

    console.log('\n=== RESULTADO OVERTIME ===');
    console.log('overtimeDetected:', result.overtimeDetected);
    if (result.overtimeDetected) {
      console.log('✅ HORAS EXTRA DETECTADAS');
      console.log('  overtimeHours:', result.overtimeHours);
      console.log('  hourBankResult:', result.hourBankResult ? 'procesado' : 'no procesado');
    } else {
      console.log('ℹ️  Sin horas extra');
    }

    return { success: true, result };
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.log('Stack:', error.stack);
    return { success: false, error: error.message };
  } finally {
    await seq.close();
  }
}

async function testPayrollCalculator() {
  console.log('\n========================================');
  console.log('  4. TEST PAYROLL CALCULATOR SERVICE');
  console.log('========================================\n');

  const payrollCalculator = require('./src/services/PayrollCalculatorService');

  try {
    const calculator = payrollCalculator; // Ya es una instancia

    // Obtener datos de attendance del mes actual
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    console.log('Consultando attendances:');
    console.log('  Usuario:', TEST_USER.nombre);
    console.log('  Período:', startDate.toISOString().split('T')[0], 'a', endDate.toISOString().split('T')[0]);

    const attendanceData = await calculator.getAttendanceData(
      TEST_USER.user_id,
      TEST_USER.company_id,
      startDate.toISOString(),
      endDate.toISOString()
    );

    console.log('\n=== RESULTADO ===');
    console.log('Registros encontrados:', attendanceData.length);

    if (attendanceData.length > 0) {
      console.log('\n✅ DATOS DE ASISTENCIA PARA PAYROLL:');
      attendanceData.forEach((att, i) => {
        const hours = att.raw_hours ? parseFloat(att.raw_hours).toFixed(2) : 'N/A';
        console.log(`  ${i+1}. Fecha: ${att.work_date}, Horas: ${hours}, Status: ${att.status}`);
      });
    } else {
      console.log('ℹ️  Sin registros de asistencia en el período');
    }

    return { success: true, records: attendanceData.length };
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

async function runFullTest() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   TEST CIRCUITO RRHH COMPLETO          ║');
  console.log('║   Attendance → Shift → Overtime → Payroll ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('Usuario de prueba:', TEST_USER.nombre);
  console.log('Empresa ID:', TEST_USER.company_id);
  console.log('Turno asignado:', TEST_USER.turno);
  console.log('');

  const results = {};

  // 1. Test ShiftCalculator
  results.shift = await testShiftCalculator();

  // 2. Test Attendance con Shift
  if (results.shift.success && results.shift.shift) {
    results.attendance = await testAttendanceWithShift(results.shift.shift.id);
  } else {
    results.attendance = await testAttendanceWithShift(null);
  }

  // 3. Test OvertimeCalculator (solo si hay attendance)
  if (results.attendance.success && results.attendance.attendance) {
    results.overtime = await testOvertimeCalculator(results.attendance.attendance.id);
  }

  // 4. Test PayrollCalculator
  results.payroll = await testPayrollCalculator();

  // Resumen final
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║            RESUMEN FINAL               ║');
  console.log('╚════════════════════════════════════════╝\n');

  const checks = [
    ['1. ShiftCalculator detecta turno', results.shift?.success && results.shift?.shift],
    ['2. Attendance creado con shift_id', results.attendance?.success && results.attendance?.attendance?.shift_id],
    ['3. OvertimeCalculator procesa', results.overtime?.success],
    ['4. PayrollCalculator lee datos', results.payroll?.success],
  ];

  let passed = 0;
  checks.forEach(([name, ok]) => {
    console.log(ok ? '  ✅' : '  ❌', name);
    if (ok) passed++;
  });

  console.log(`\n=== RESULTADO: ${passed}/${checks.length} verificaciones pasadas ===`);

  // Cleanup - eliminar attendance de prueba
  const seq = new Sequelize('postgresql://postgres:Aedr15150302@localhost:5432/attendance_system', {logging: false});
  const today = new Date().toISOString().split('T')[0];
  await seq.query(`
    DELETE FROM attendances
    WHERE "UserId" = '${TEST_USER.user_id}'
    AND DATE("checkInTime") = '${today}'
  `);
  await seq.close();
  console.log('\n(Datos de prueba limpiados)');
}

// Ejecutar
runFullTest().catch(e => {
  console.error('ERROR FATAL:', e.message);
  console.error(e.stack);
});
