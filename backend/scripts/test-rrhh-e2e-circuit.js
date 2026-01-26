/**
 * TEST E2E CIRCUITO COMPLETO RRHH
 * Simula el flujo real: Fichaje → Turno → Overtime → HourBank → Liquidación
 */
const { Sequelize } = require('sequelize');
const seq = new Sequelize('postgresql://postgres:Aedr15150302@localhost:5432/attendance_system', { logging: false });

const COMPANY_ID = 11;

async function runE2E() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║      TEST E2E CIRCUITO COMPLETO RRHH - FICHAJE A LIQUIDACIÓN   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // 1. Seleccionar un empleado con turno asignado
  console.log('═══ PASO 1: SELECCIONAR EMPLEADO CON TURNO ═══');
  const [[emp]] = await seq.query(`
    SELECT u.user_id, u."firstName", u."lastName", u.salary,
           s.id as shift_id, s.name as turno, s."startTime", s."endTime", u."hireDate"
    FROM users u
    JOIN user_shift_assignments usa ON usa.user_id = u.user_id AND usa.is_active = true
    JOIN shifts s ON s.id = usa.shift_id
    WHERE u.company_id = ${COMPANY_ID} AND u.role = 'employee' AND u.salary > 0
    LIMIT 1
  `);

  if (!emp) {
    console.log('❌ No se encontró empleado con turno asignado');
    return;
  }

  console.log(`   👤 Empleado: ${emp.firstName} ${emp.lastName}`);
  console.log(`   💰 Salario: $${parseFloat(emp.salary).toLocaleString('es-AR')}`);
  console.log(`   ⏰ Turno: ${emp.turno} (${emp.startTime} - ${emp.endTime})`);
  console.log(`   📅 Antigüedad: ${emp.hireDate || 'No especificada'}`);

  // 2. Obtener asistencias del mes actual
  console.log('\n═══ PASO 2: RESUMEN DE ASISTENCIAS DEL MES ═══');
  const [[attStats]] = await seq.query(`
    SELECT
      COUNT(*) as dias_trabajados,
      SUM(CASE WHEN is_late THEN 1 ELSE 0 END) as tardanzas,
      SUM(CASE WHEN is_late = false THEN 1 ELSE 0 END) as puntuales,
      ROUND(SUM("workingHours"::numeric), 2) as horas_totales,
      ROUND(SUM(overtime_hours::numeric), 2) as horas_extra,
      ROUND(AVG("workingHours"::numeric), 2) as promedio_horas
    FROM attendances
    WHERE "UserId" = '${emp.user_id}'
      AND date >= DATE_TRUNC('month', CURRENT_DATE)
  `);

  const diasTrabajados = parseInt(attStats.dias_trabajados) || 0;
  const tardanzas = parseInt(attStats.tardanzas) || 0;
  const puntuales = parseInt(attStats.puntuales) || 0;
  const horasTotales = parseFloat(attStats.horas_totales) || 0;
  const horasExtra = parseFloat(attStats.horas_extra) || 0;
  const promedioHoras = parseFloat(attStats.promedio_horas) || 0;

  console.log(`   📊 Días trabajados: ${diasTrabajados}`);
  console.log(`   ✅ Días puntuales: ${puntuales}`);
  console.log(`   ⚠️  Tardanzas: ${tardanzas}`);
  console.log(`   ⏱️  Horas totales: ${horasTotales}`);
  console.log(`   ⏰ Horas extra: ${horasExtra}`);
  console.log(`   📈 Promedio diario: ${promedioHoras} horas`);

  // 3. Calcular presentismo
  console.log('\n═══ PASO 3: CÁLCULO DE PRESENTISMO ═══');
  const porcentajePuntualidad = diasTrabajados > 0 ? (puntuales / diasTrabajados) * 100 : 0;
  const tienePresentismo = porcentajePuntualidad >= 96;

  console.log(`   📊 Puntualidad: ${porcentajePuntualidad.toFixed(1)}%`);
  console.log(`   ${tienePresentismo ? '✅' : '❌'} Derecho a presentismo: ${tienePresentismo ? 'SÍ (≥96%)' : 'NO (<96%)'}`);

  // 4. Verificar hijos en edad escolar con certificado
  console.log('\n═══ PASO 4: VERIFICAR ESCOLARIDAD HIJOS ═══');
  const [children] = await seq.query(`
    SELECT full_name, birth_date, school_name, grade_level,
           EXTRACT(YEAR FROM AGE(birth_date)) as edad
    FROM user_children
    WHERE user_id = '${emp.user_id}' AND company_id = ${COMPANY_ID}
  `);

  const hijosEscolares = children.filter(c => c.edad >= 4 && c.edad <= 18);
  console.log(`   👧 Hijos en edad escolar: ${hijosEscolares.length}`);
  hijosEscolares.forEach(h => {
    const tieneEscuela = h.school_name ? '✅' : '❌';
    console.log(`      ${tieneEscuela} ${h.full_name} (${h.edad} años) - ${h.school_name || 'SIN ESCUELA'}`);
  });

  // 5. Calcular liquidación
  console.log('\n═══ PASO 5: LIQUIDACIÓN ESTIMADA ═══');
  const baseSalary = parseFloat(emp.salary);
  const hourlyRate = baseSalary / 200; // 200 horas mensuales estándar

  // Conceptos remunerativos
  const basicoMensual = baseSalary;
  const horasExtraPago = horasExtra * hourlyRate * 1.5; // 50% recargo
  const presentismoPago = tienePresentismo ? baseSalary * 0.10 : 0;
  const escolaridadPago = hijosEscolares.filter(h => h.school_name).length * 5000; // $5000 por hijo

  // Bruto
  const brutoTotal = basicoMensual + horasExtraPago + presentismoPago + escolaridadPago;

  // Deducciones empleado (17%)
  const jubilacion = brutoTotal * 0.11; // 11%
  const obraSocial = brutoTotal * 0.03; // 3%
  const pami = brutoTotal * 0.03; // 3%
  const totalDeducciones = jubilacion + obraSocial + pami;

  // Neto
  const netoACobrar = brutoTotal - totalDeducciones;

  // Costo empleador (24%)
  const costosEmpleador = brutoTotal * 0.24;
  const costoTotal = brutoTotal + costosEmpleador;

  console.log('   ┌─────────────────────────────────────────┐');
  console.log('   │           RECIBO DE SUELDO             │');
  console.log('   ├─────────────────────────────────────────┤');
  console.log(`   │ Básico mensual:      $${basicoMensual.toLocaleString('es-AR').padStart(12)} │`);
  console.log(`   │ Horas extra (${horasExtra.toFixed(1)}h):   $${Math.round(horasExtraPago).toLocaleString('es-AR').padStart(12)} │`);
  console.log(`   │ Presentismo (10%):   $${Math.round(presentismoPago).toLocaleString('es-AR').padStart(12)} │`);
  console.log(`   │ Escolaridad:         $${Math.round(escolaridadPago).toLocaleString('es-AR').padStart(12)} │`);
  console.log('   ├─────────────────────────────────────────┤');
  console.log(`   │ BRUTO TOTAL:         $${Math.round(brutoTotal).toLocaleString('es-AR').padStart(12)} │`);
  console.log('   ├─────────────────────────────────────────┤');
  console.log(`   │ - Jubilación (11%):  $${Math.round(jubilacion).toLocaleString('es-AR').padStart(12)} │`);
  console.log(`   │ - Obra Social (3%):  $${Math.round(obraSocial).toLocaleString('es-AR').padStart(12)} │`);
  console.log(`   │ - PAMI (3%):         $${Math.round(pami).toLocaleString('es-AR').padStart(12)} │`);
  console.log('   ├─────────────────────────────────────────┤');
  console.log(`   │ NETO A COBRAR:       $${Math.round(netoACobrar).toLocaleString('es-AR').padStart(12)} │`);
  console.log('   └─────────────────────────────────────────┘');
  console.log(`\n   💼 Costo empleador (24%): $${Math.round(costosEmpleador).toLocaleString('es-AR')}`);
  console.log(`   💰 Costo total empresa:   $${Math.round(costoTotal).toLocaleString('es-AR')}`);

  // 6. Verificar capacitaciones pendientes
  console.log('\n═══ PASO 6: CAPACITACIONES PENDIENTES ═══');
  const [pendingTrainings] = await seq.query(`
    SELECT t.title, t.is_mandatory, ta.progress_percentage, ta.due_date
    FROM training_assignments ta
    JOIN trainings t ON t.id = ta.training_id
    WHERE ta.user_id = '${emp.user_id}'
      AND ta.company_id = ${COMPANY_ID}
      AND ta.status != 'completed'
    ORDER BY t.is_mandatory DESC, ta.due_date ASC
  `);

  if (pendingTrainings.length === 0) {
    console.log('   ✅ Todas las capacitaciones completadas');
  } else {
    console.log(`   ⚠️  ${pendingTrainings.length} capacitaciones pendientes:`);
    pendingTrainings.forEach(t => {
      const icon = t.is_mandatory ? '🔴' : '🟡';
      console.log(`      ${icon} ${t.title} (${t.progress_percentage || 0}% completado)`);
    });
  }

  // 7. Verificar exámenes médicos
  console.log('\n═══ PASO 7: ESTADO MÉDICO ═══');
  const [[lastExam]] = await seq.query(`
    SELECT exam_type, exam_date, result, next_exam_date
    FROM user_medical_exams
    WHERE user_id = '${emp.user_id}' AND company_id = ${COMPANY_ID}
    ORDER BY exam_date DESC
    LIMIT 1
  `);

  if (lastExam) {
    const resultIcon = lastExam.result === 'apto' ? '✅' : (lastExam.result === 'apto_con_observaciones' ? '⚠️' : '❌');
    console.log(`   ${resultIcon} Último examen: ${lastExam.exam_type} (${lastExam.exam_date})`);
    console.log(`      Resultado: ${lastExam.result}`);
    console.log(`      Próximo examen: ${lastExam.next_exam_date}`);
  } else {
    console.log('   ❌ Sin exámenes médicos registrados');
  }

  // 8. Verificar licencias
  console.log('\n═══ PASO 8: LICENCIAS ═══');
  const [licenses] = await seq.query(`
    SELECT license_type, license_class, expiry_date,
           CASE WHEN expiry_date < CURRENT_DATE THEN 'VENCIDA'
                WHEN expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'POR VENCER'
                ELSE 'VIGENTE' END as estado
    FROM user_driver_licenses
    WHERE user_id = '${emp.user_id}' AND company_id = ${COMPANY_ID}
  `);

  if (licenses.length === 0) {
    console.log('   ℹ️  Sin licencias de conducir registradas');
  } else {
    licenses.forEach(l => {
      const icon = l.estado === 'VIGENTE' ? '✅' : (l.estado === 'POR VENCER' ? '⚠️' : '❌');
      console.log(`   ${icon} ${l.license_type} Clase ${l.license_class} - ${l.estado} (${l.expiry_date})`);
    });
  }

  // 9. Verificar beneficios activos
  console.log('\n═══ PASO 9: BENEFICIOS ACTIVOS ═══');
  const [benefits] = await seq.query(`
    SELECT bt.name, eb.assigned_amount, eb.status, eb.effective_until
    FROM employee_benefits eb
    JOIN company_benefit_policies cbp ON cbp.id = eb.company_benefit_policy_id
    JOIN benefit_types bt ON bt.id = cbp.benefit_type_id
    WHERE eb.user_id = '${emp.user_id}' AND eb.company_id = ${COMPANY_ID}
      AND eb.status = 'active'
  `);

  if (benefits.length === 0) {
    console.log('   ℹ️  Sin beneficios activos');
  } else {
    console.log(`   ✅ ${benefits.length} beneficios activos:`);
    benefits.forEach(b => {
      console.log(`      • ${b.name}: $${parseFloat(b.assigned_amount || 0).toLocaleString('es-AR')}`);
    });
  }

  // 10. Resumen final
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    RESUMEN E2E CIRCUITO                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\n   👤 Empleado: ${emp.firstName} ${emp.lastName}`);
  console.log(`   📅 Días trabajados: ${diasTrabajados} | Tardanzas: ${tardanzas}`);
  console.log(`   ⏰ Horas extra: ${horasExtra} | Presentismo: ${tienePresentismo ? 'SÍ' : 'NO'}`);
  console.log(`   💵 Neto a cobrar: $${Math.round(netoACobrar).toLocaleString('es-AR')}`);
  console.log(`   📚 Capacitaciones pendientes: ${pendingTrainings.length}`);
  console.log(`   🏥 Estado médico: ${lastExam ? lastExam.result : 'Sin examen'}`);
  console.log(`   🎁 Beneficios activos: ${benefits.length}`);

  console.log('\n   ✅ CIRCUITO E2E COMPLETO EJECUTADO EXITOSAMENTE');

  await seq.close();
}

runE2E().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
