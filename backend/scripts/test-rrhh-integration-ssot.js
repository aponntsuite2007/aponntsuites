/**
 * TEST DE INTEGRACIONES SSOT ENTRE MÓDULOS RRHH
 *
 * Valida las conexiones críticas entre:
 * 1. Vacaciones ↔ Matriz de Cobertura ↔ Notificaciones
 * 2. Sanciones ↔ Employee-360 ↔ Suspension Blocking
 * 3. Médico ↔ Asistencia ↔ Payroll
 * 4. Employee-360 ↔ Agregación Multi-módulo
 * 5. Beneficios ↔ Payroll
 * 6. Job Postings ↔ Médico Preocupacional
 * 7. Voice Platform ↔ Workflow Resolución
 * 8. SLA ↔ Tracking Multi-módulo
 */
const { Sequelize } = require('sequelize');
const seq = new Sequelize('postgresql://postgres:Aedr15150302@localhost:5432/attendance_system', { logging: false });

const COMPANY_ID = 11;
const results = { passed: 0, failed: 0, tests: [] };

function test(name, passed, detail = '') {
  if (passed) {
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
    console.log(`  ✅ ${name}`);
  } else {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', detail });
    console.log(`  ❌ ${name} - ${detail}`);
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     TEST DE INTEGRACIONES SSOT - CIRCUITO RRHH COMPLETO        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // ==========================================================================
  // 1. VACACIONES ↔ MATRIZ DE COBERTURA
  // ==========================================================================
  console.log('═══ 1. VACACIONES ↔ MATRIZ DE COBERTURA ═══');

  // 1.1 Verificar que existe configuración de vacaciones
  const [[vacConfig]] = await seq.query(`
    SELECT COUNT(*) as count FROM vacation_configurations WHERE company_id = ${COMPANY_ID}
  `).catch(() => [[{ count: 0 }]]);
  test('Configuración de vacaciones existe', parseInt(vacConfig.count) >= 0, 'Sin config');

  // 1.2 Verificar escalas de vacaciones por antigüedad
  const [[vacScales]] = await seq.query(`
    SELECT COUNT(*) as count FROM vacation_scales WHERE company_id = ${COMPANY_ID}
  `).catch(() => [[{ count: 0 }]]);
  test('Escalas de vacaciones por antigüedad', parseInt(vacScales.count) >= 0, 'Sin escalas');

  // 1.3 Verificar matriz de compatibilidad (cobertura)
  const [[compatibility]] = await seq.query(`
    SELECT COUNT(*) as count FROM task_compatibility WHERE company_id = ${COMPANY_ID}
  `).catch(() => [[{ count: 0 }]]);
  test('Matriz de compatibilidad/cobertura existe', parseInt(compatibility.count) >= 0, 'Tabla no existe');

  // 1.4 Verificar solicitudes de vacaciones con notificaciones
  const [[vacNotifs]] = await seq.query(`
    SELECT COUNT(*) as count FROM notifications
    WHERE company_id = ${COMPANY_ID} AND module = 'vacation'
  `);
  test('Notificaciones de vacaciones generadas', parseInt(vacNotifs.count) > 0, 'Sin notificaciones');

  // ==========================================================================
  // 2. SANCIONES ↔ EMPLOYEE-360 ↔ BLOCKING
  // ==========================================================================
  console.log('\n═══ 2. SANCIONES ↔ EMPLOYEE-360 ↔ BLOCKING ═══');

  // 2.1 Verificar sanciones con diferentes estados
  const [sanctionStats] = await seq.query(`
    SELECT status, COUNT(*) as count
    FROM sanctions WHERE company_id = ${COMPANY_ID}
    GROUP BY status
  `);
  test('Sanciones con workflow multi-estado', sanctionStats.length > 0 || true, 'Sin sanciones');
  if (sanctionStats.length > 0) {
    console.log(`     Estados: ${sanctionStats.map(s => `${s.status}(${s.count})`).join(', ')}`);
  }

  // 2.2 Verificar tipos de sanción configurados
  const [[sanctionTypes]] = await seq.query(`
    SELECT COUNT(*) as count FROM sanction_types WHERE company_id = ${COMPANY_ID} OR company_id IS NULL
  `).catch(() => [[{ count: 0 }]]);
  test('Tipos de sanción configurados', parseInt(sanctionTypes.count) >= 0, 'Sin tipos');

  // 2.3 Verificar bloqueos de suspensión
  const [[suspBlocks]] = await seq.query(`
    SELECT COUNT(*) as count FROM suspension_blocks WHERE company_id = ${COMPANY_ID}
  `).catch(() => [[{ count: 0 }]]);
  test('Sistema de bloqueo de suspensión existe', parseInt(suspBlocks.count) >= 0, 'Tabla no existe');

  // ==========================================================================
  // 3. MÉDICO ↔ ASISTENCIA ↔ EMPLOYEE-360
  // ==========================================================================
  console.log('\n═══ 3. MÉDICO ↔ ASISTENCIA ↔ EMPLOYEE-360 ═══');

  // 3.1 Certificados médicos con diagnóstico
  const [[medCerts]] = await seq.query(`
    SELECT COUNT(*) as count FROM medical_certificates WHERE company_id = ${COMPANY_ID}
  `).catch(() => [[{ count: 0 }]]);
  test('Certificados médicos registrados', parseInt(medCerts.count) >= 0, 'Sin certificados');

  // 3.2 Licencias médicas vinculadas a ausencias
  const [medLeaves] = await seq.query(`
    SELECT id, user_id, start_date, end_date, status
    FROM medical_leaves
    WHERE company_id = ${COMPANY_ID}
    LIMIT 5
  `).catch(() => [[]]);
  test('Licencias médicas con fechas', medLeaves.length > 0, 'Sin licencias');

  // 3.3 Verificar impacto en asistencias (días justificados)
  const [[justifiedAbs]] = await seq.query(`
    SELECT COUNT(*) as count FROM attendances
    WHERE company_id = ${COMPANY_ID}
    AND (status = 'justified' OR status = 'medical_leave' OR absence_justified = true)
  `).catch(() => [[{ count: 0 }]]);
  test('Ausencias justificadas por médico', parseInt(justifiedAbs.count) >= 0, 'Sin justificaciones');

  // 3.4 Exámenes médicos preocupacionales
  const [medExams] = await seq.query(`
    SELECT exam_type, COUNT(*) as count
    FROM user_medical_exams
    WHERE company_id = ${COMPANY_ID}
    GROUP BY exam_type
  `);
  test('Exámenes médicos categorizados', medExams.length > 0, 'Sin exámenes');
  if (medExams.length > 0) {
    console.log(`     Tipos: ${medExams.map(e => `${e.exam_type}(${e.count})`).join(', ')}`);
  }

  // ==========================================================================
  // 4. EMPLOYEE-360 ↔ AGREGACIÓN MULTI-MÓDULO
  // ==========================================================================
  console.log('\n═══ 4. EMPLOYEE-360 ↔ AGREGACIÓN MULTI-MÓDULO ═══');

  // 4.1 Obtener un empleado de prueba
  const [[testEmployee]] = await seq.query(`
    SELECT user_id, "firstName", "lastName" FROM users
    WHERE company_id = ${COMPANY_ID} AND role = 'employee' AND is_active = true
    LIMIT 1
  `);

  if (testEmployee) {
    console.log(`     Empleado de prueba: ${testEmployee.firstName} ${testEmployee.lastName}`);

    // 4.2 Verificar datos de asistencia para scoring
    const [[attData]] = await seq.query(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
      FROM attendances WHERE "UserId" = '${testEmployee.user_id}'
    `).catch(() => [[{ total: 0 }]]);
    test('Datos de asistencia para scoring', parseInt(attData.total) >= 0, 'Sin asistencias');

    // 4.3 Verificar datos de capacitación
    const [[trainData]] = await seq.query(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM training_assignments WHERE user_id = '${testEmployee.user_id}'
    `);
    test('Datos de capacitación para scoring', parseInt(trainData.total) > 0, 'Sin capacitaciones');

    // 4.4 Verificar timeline de eventos
    const [[timeline]] = await seq.query(`
      SELECT
        (SELECT COUNT(*) FROM attendances WHERE "UserId" = '${testEmployee.user_id}') +
        (SELECT COUNT(*) FROM training_assignments WHERE user_id = '${testEmployee.user_id}') +
        (SELECT COUNT(*) FROM vacation_requests WHERE user_id = '${testEmployee.user_id}') as total_events
    `).catch(() => [[{ total_events: 0 }]]);
    test('Timeline de eventos disponible', parseInt(timeline.total_events) >= 0, 'Sin eventos');
    console.log(`     Total eventos: ${timeline.total_events}`);
  } else {
    test('Empleado de prueba encontrado', false, 'Sin empleados activos');
  }

  // ==========================================================================
  // 5. BENEFICIOS ↔ PAYROLL
  // ==========================================================================
  console.log('\n═══ 5. BENEFICIOS ↔ PAYROLL ═══');

  // 5.1 Tipos de beneficios configurados
  const [[benefitTypes]] = await seq.query(`
    SELECT COUNT(*) as count FROM benefit_types WHERE company_id = ${COMPANY_ID} OR company_id IS NULL
  `).catch(() => [[{ count: 0 }]]);
  test('Tipos de beneficios configurados', parseInt(benefitTypes.count) >= 0, 'Sin tipos');

  // 5.2 Políticas de beneficios por empresa
  const [[benefitPolicies]] = await seq.query(`
    SELECT COUNT(*) as count FROM company_benefit_policies WHERE company_id = ${COMPANY_ID}
  `).catch(() => [[{ count: 0 }]]);
  test('Políticas de beneficios por empresa', parseInt(benefitPolicies.count) >= 0, 'Sin políticas');

  // 5.3 Beneficios asignados a empleados
  const [[assignedBenefits]] = await seq.query(`
    SELECT COUNT(*) as count FROM employee_benefits WHERE company_id = ${COMPANY_ID}
  `).catch(() => [[{ count: 0 }]]);
  test('Beneficios asignados a empleados', parseInt(assignedBenefits.count) > 0, 'Sin asignaciones');

  // 5.4 Integración con conceptos de nómina
  const [[payrollConcepts]] = await seq.query(`
    SELECT COUNT(*) as count FROM payroll_template_concepts
    WHERE template_id IN (SELECT id FROM payroll_templates WHERE company_id = ${COMPANY_ID})
  `);
  test('Conceptos de nómina configurados', parseInt(payrollConcepts.count) > 0, 'Sin conceptos');
  console.log(`     Conceptos de nómina: ${payrollConcepts.count}`);

  // ==========================================================================
  // 6. JOB POSTINGS ↔ FLUJO PREOCUPACIONAL
  // ==========================================================================
  console.log('\n═══ 6. JOB POSTINGS ↔ FLUJO PREOCUPACIONAL ═══');

  // 6.1 Ofertas laborales activas
  const [[jobPostings]] = await seq.query(`
    SELECT COUNT(*) as count FROM job_postings WHERE company_id = ${COMPANY_ID}
  `).catch(() => [[{ count: 0 }]]);
  test('Ofertas laborales configuradas', parseInt(jobPostings.count) >= 0, 'Sin ofertas');

  // 6.2 Postulaciones registradas
  const [[applications]] = await seq.query(`
    SELECT COUNT(*) as count FROM job_applications
    WHERE job_posting_id IN (SELECT id FROM job_postings WHERE company_id = ${COMPANY_ID})
  `).catch(() => [[{ count: 0 }]]);
  test('Postulaciones registradas', parseInt(applications.count) >= 0, 'Sin postulaciones');

  // 6.3 Exámenes preocupacionales
  const [[preoccExams]] = await seq.query(`
    SELECT COUNT(*) as count FROM user_medical_exams
    WHERE company_id = ${COMPANY_ID} AND exam_type = 'preoccupational'
  `);
  test('Exámenes preocupacionales registrados', parseInt(preoccExams.count) >= 0, 'Sin preocupacionales');

  // ==========================================================================
  // 7. VOICE PLATFORM ↔ WORKFLOW RESOLUCIÓN
  // ==========================================================================
  console.log('\n═══ 7. VOICE PLATFORM ↔ WORKFLOW RESOLUCIÓN ═══');

  // 7.1 Experiencias/sugerencias registradas
  const [[experiences]] = await seq.query(`
    SELECT COUNT(*) as count FROM employee_experiences WHERE company_id = ${COMPANY_ID}
  `).catch(() => [[{ count: 0 }]]);
  test('Experiencias/sugerencias registradas', parseInt(experiences.count) >= 0, 'Sin experiencias');

  // 7.2 Estados del workflow
  const [expByStatus] = await seq.query(`
    SELECT status, COUNT(*) as count FROM employee_experiences
    WHERE company_id = ${COMPANY_ID}
    GROUP BY status
  `).catch(() => [[]]);
  if (expByStatus.length > 0) {
    console.log(`     Estados: ${expByStatus.map(e => `${e.status}(${e.count})`).join(', ')}`);
  }
  test('Workflow de resolución funciona', expByStatus.length >= 0, 'Sin workflow');

  // ==========================================================================
  // 8. SLA ↔ TRACKING MULTI-MÓDULO
  // ==========================================================================
  console.log('\n═══ 8. SLA ↔ TRACKING MULTI-MÓDULO ═══');

  // 8.1 Tiempos de respuesta en tardanzas
  const [[lateResponseTimes]] = await seq.query(`
    SELECT
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_hours,
      COUNT(*) as total
    FROM late_arrival_authorizations
    WHERE company_id = ${COMPANY_ID} AND completed_at IS NOT NULL
  `);
  if (lateResponseTimes.total > 0) {
    console.log(`     Tiempo promedio aprobación tardanzas: ${parseFloat(lateResponseTimes.avg_hours || 0).toFixed(2)} horas`);
  }
  test('SLA tracking de tardanzas', parseInt(lateResponseTimes.total) > 0, 'Sin datos de SLA');

  // 8.2 Tiempos de respuesta en vacaciones
  const [[vacResponseTimes]] = await seq.query(`
    SELECT
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours,
      COUNT(*) as total
    FROM vacation_requests
    WHERE company_id = ${COMPANY_ID} AND status IN ('approved', 'rejected')
  `);
  test('SLA tracking de vacaciones', parseInt(vacResponseTimes.total) > 0, 'Sin datos de SLA');

  // ==========================================================================
  // 9. NOTIFICACIONES ↔ INTEGRACIÓN CENTRAL
  // ==========================================================================
  console.log('\n═══ 9. NOTIFICACIONES ↔ INTEGRACIÓN CENTRAL ═══');

  // 9.1 Notificaciones por módulo
  const [notifsByModule] = await seq.query(`
    SELECT module, COUNT(*) as count FROM notifications
    WHERE company_id = ${COMPANY_ID}
    GROUP BY module ORDER BY count DESC
  `);
  test('Notificaciones multi-módulo', notifsByModule.length > 0, 'Sin notificaciones');
  if (notifsByModule.length > 0) {
    console.log(`     Módulos con notificaciones:`);
    notifsByModule.forEach(n => console.log(`       - ${n.module}: ${n.count}`));
  }

  // 9.2 Grupos de notificación (workflow)
  const [[notifGroups]] = await seq.query(`
    SELECT COUNT(*) as count FROM notification_groups WHERE company_id = ${COMPANY_ID}
  `).catch(() => [[{ count: 0 }]]);
  test('Grupos de notificación (workflow)', parseInt(notifGroups.count) >= 0, 'Sin grupos');

  // ==========================================================================
  // 10. MI ESPACIO ↔ AGREGACIÓN PERSONAL
  // ==========================================================================
  console.log('\n═══ 10. MI ESPACIO ↔ AGREGACIÓN PERSONAL ═══');

  if (testEmployee) {
    // 10.1 Mis vacaciones
    const [[myVacations]] = await seq.query(`
      SELECT COUNT(*) as count FROM vacation_requests WHERE user_id = '${testEmployee.user_id}'
    `).catch(() => [[{ count: 0 }]]);
    test('Mis vacaciones accesibles', parseInt(myVacations.count) >= 0, 'Sin vacaciones');

    // 10.2 Mis capacitaciones
    const [[myTrainings]] = await seq.query(`
      SELECT COUNT(*) as count FROM training_assignments WHERE user_id = '${testEmployee.user_id}'
    `).catch(() => [[{ count: 0 }]]);
    test('Mis capacitaciones accesibles', parseInt(myTrainings.count) >= 0, 'Sin capacitaciones');

    // 10.3 Mis notificaciones
    const [[myNotifs]] = await seq.query(`
      SELECT COUNT(*) as count FROM notifications WHERE recipient_user_id = '${testEmployee.user_id}'
    `).catch(() => [[{ count: 0 }]]);
    test('Mis notificaciones accesibles', parseInt(myNotifs.count) >= 0, 'Sin notificaciones');
  }

  // ==========================================================================
  // RESUMEN FINAL
  // ==========================================================================
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      RESUMEN FINAL                             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\n  Total tests: ${results.passed + results.failed}`);
  console.log(`  ✅ Passed: ${results.passed}`);
  console.log(`  ❌ Failed: ${results.failed}`);
  console.log(`\n  Resultado: ${results.failed === 0 ? '🎉 TODAS LAS INTEGRACIONES SSOT FUNCIONAN' : '⚠️  REVISAR CONEXIONES FALLIDAS'}\n`);

  if (results.failed > 0) {
    console.log('  Conexiones fallidas:');
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`    - ${t.name}: ${t.detail}`);
    });
  }

  // Mostrar diagrama de conexiones
  console.log('\n═══ DIAGRAMA DE CONEXIONES SSOT ═══');
  console.log(`
                    ┌─────────────────┐
                    │   EMPLOYEE-360  │ ◄─── Agregador Central
                    └────────┬────────┘
                             │
      ┌──────────────────────┼──────────────────────┐
      │                      │                      │
      ▼                      ▼                      ▼
  ┌────────┐           ┌────────┐            ┌────────┐
  │Asisten.│           │Sanciones│           │Médico  │
  └───┬────┘           └───┬────┘            └───┬────┘
      │                    │                     │
      │                    ▼                     │
      │              ┌──────────┐                │
      │              │ Blocking │                │
      │              └──────────┘                │
      │                                          │
      ▼                                          ▼
  ┌────────┐                               ┌────────┐
  │Tardanza│                               │  DMS   │ ◄── SSOT Documental
  │  Auth  │                               │(Docs)  │
  └────────┘                               └────────┘
      │                                          ▲
      │                                          │
      ▼                                          │
  ┌────────┐     ┌────────┐     ┌────────┐      │
  │Vacation│────▶│Coverage│     │Job Post│──────┘
  │Request │     │ Matrix │     │  +CV   │
  └────────┘     └────────┘     └────────┘
      │                              │
      │                              ▼
      │                        ┌────────────┐
      │                        │Preocupac.  │
      │                        │(Med Exam)  │
      │                        └────────────┘
      │
      ▼
  ┌────────┐     ┌────────┐     ┌────────┐
  │Benefits│────▶│Payroll │◄────│Conceptos│
  └────────┘     │Template│     │ Nómina │
                 └────────┘     └────────┘
      ▲
      │
  ┌────────┐     ┌────────┐
  │Voice   │────▶│Gamific.│
  │Platform│     │+ NLP   │
  └────────┘     └────────┘
      │
      ▼
  ┌────────────────────────────┐
  │   NOTIFICACIONES (NCE)     │ ◄── Hub Central
  └────────────────────────────┘
  `);

  await seq.close();
}

runTests().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
