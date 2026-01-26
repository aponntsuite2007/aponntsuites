/**
 * Seed ISI RRHH - FIXED VERSION
 * Usa las columnas correctas según la estructura real de las tablas
 */
const { Sequelize } = require('sequelize');
const { faker } = require('@faker-js/faker');
faker.locale = 'es';

const seq = new Sequelize('postgresql://postgres:Aedr15150302@localhost:5432/attendance_system', { logging: false });

const COMPANY_ID = 11;

async function seed() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     SEED ISI RRHH - FIXED VERSION (Columnas Correctas)       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Obtener empleados
  const [employees] = await seq.query(`
    SELECT user_id, "firstName", "lastName"
    FROM users WHERE company_id = ${COMPANY_ID} AND role = 'employee'
  `);
  console.log(`📋 Empleados disponibles: ${employees.length}`);

  // Obtener admin para created_by
  const [admins] = await seq.query(`
    SELECT user_id FROM users WHERE company_id = ${COMPANY_ID} AND role = 'admin' LIMIT 1
  `);
  const ADMIN_ID = admins[0]?.user_id;
  console.log(`👤 Admin ID: ${ADMIN_ID}\n`);

  if (employees.length === 0) {
    console.log('❌ No hay empleados. Ejecutar seed-isi-full-test.js primero');
    return;
  }

  // =========================================================================
  // FASE 1: HIJOS CON ESCOLARIDAD
  // =========================================================================
  console.log('\n═══ FASE 1: Hijos con Escolaridad ═══');

  let childrenCreated = 0;
  for (let i = 0; i < Math.min(20, employees.length); i++) {
    const emp = employees[i];
    const numChildren = faker.number.int({ min: 1, max: 3 });

    for (let j = 0; j < numChildren; j++) {
      const birthYear = faker.number.int({ min: 2010, max: 2020 });
      const birthDate = `${birthYear}-${String(faker.number.int({min:1,max:12})).padStart(2,'0')}-${String(faker.number.int({min:1,max:28})).padStart(2,'0')}`;
      const gradeLevel = birthYear <= 2012 ? 'Secundaria' : (birthYear <= 2016 ? 'Primaria' : 'Inicial');

      await seq.query(`
        INSERT INTO user_children (user_id, company_id, full_name, dni, birth_date, gender,
                                   lives_with_employee, is_dependent, health_insurance_coverage,
                                   school_name, grade_level, created_at, updated_at)
        VALUES (:userId, ${COMPANY_ID}, :fullName, :dni, :birthDate, :gender,
                true, true, true, :schoolName, :gradeLevel, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, {
        replacements: {
          userId: emp.user_id,
          fullName: faker.person.firstName() + ' ' + emp.lastName,
          dni: String(faker.number.int({ min: 40000000, max: 55000000 })),
          birthDate,
          gender: faker.helpers.arrayElement(['masculino', 'femenino']),
          schoolName: faker.helpers.arrayElement(['Escuela Nº 5', 'Colegio San Martín', 'Instituto Don Bosco', 'Escuela Técnica Nº 1']),
          gradeLevel
        }
      });
      childrenCreated++;
    }
  }
  console.log(`   ✅ Hijos creados: ${childrenCreated}`);

  // =========================================================================
  // FASE 2: TRAININGS (Capacitaciones)
  // =========================================================================
  console.log('\n═══ FASE 2: Capacitaciones ═══');

  const trainings = [
    { title: 'Seguridad e Higiene Laboral', category: 'seguridad', duration: 8, is_mandatory: true },
    { title: 'Prevención de Incendios', category: 'seguridad', duration: 4, is_mandatory: true },
    { title: 'Uso de EPP', category: 'seguridad', duration: 2, is_mandatory: true },
    { title: 'Atención al Cliente', category: 'comercial', duration: 6, is_mandatory: false },
    { title: 'Excel Avanzado', category: 'informatica', duration: 12, is_mandatory: false },
    { title: 'Liderazgo y Gestión de Equipos', category: 'desarrollo', duration: 16, is_mandatory: false },
    { title: 'Primeros Auxilios', category: 'salud', duration: 4, is_mandatory: true },
    { title: 'Protocolo COVID-19', category: 'salud', duration: 1, is_mandatory: true }
  ];

  const trainingIds = [];
  for (const t of trainings) {
    const [result] = await seq.query(`
      INSERT INTO trainings (company_id, title, description, category, duration,
                             is_mandatory, is_active, created_at, updated_at,
                             start_date, deadline, status)
      VALUES (${COMPANY_ID}, :title, :description, :category, :duration,
              :isMandatory, true, NOW(), NOW(),
              CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '60 days', 'active')
      ON CONFLICT DO NOTHING
      RETURNING id
    `, {
      replacements: {
        title: t.title,
        description: `Capacitación sobre ${t.title}`,
        category: t.category,
        duration: t.duration,
        isMandatory: t.is_mandatory
      }
    });
    if (result.length > 0) {
      trainingIds.push(result[0].id);
    }
  }
  console.log(`   ✅ Capacitaciones creadas: ${trainingIds.length}`);

  // =========================================================================
  // FASE 3: TRAINING ASSIGNMENTS
  // =========================================================================
  console.log('\n═══ FASE 3: Asignación de Capacitaciones ═══');

  let assignmentsCreated = 0;
  for (const trainingId of trainingIds) {
    // Asignar a 5-15 empleados por training
    const numAssign = faker.number.int({ min: 5, max: Math.min(15, employees.length) });
    const shuffled = faker.helpers.shuffle([...employees]).slice(0, numAssign);

    for (const emp of shuffled) {
      const status = faker.helpers.arrayElement(['pending', 'in_progress', 'completed', 'completed', 'completed']);
      const progress = status === 'completed' ? 100 : (status === 'in_progress' ? faker.number.int({min:10,max:80}) : 0);

      await seq.query(`
        INSERT INTO training_assignments (company_id, training_id, user_id, status,
                                          progress_percentage, time_spent_minutes,
                                          assigned_at, due_date, created_at, updated_at,
                                          score, completed_at)
        VALUES (${COMPANY_ID}, :trainingId, :userId, :status,
                :progress, :timeSpent,
                NOW() - INTERVAL '20 days', CURRENT_DATE + INTERVAL '40 days', NOW(), NOW(),
                :score, :completedAt)
        ON CONFLICT DO NOTHING
      `, {
        replacements: {
          trainingId,
          userId: emp.user_id,
          status,
          progress,
          timeSpent: progress > 0 ? faker.number.int({min:30, max:240}) : 0,
          score: status === 'completed' ? faker.number.int({min:60, max:100}) : null,
          completedAt: status === 'completed' ? 'NOW()' : null
        }
      });
      assignmentsCreated++;
    }
  }
  console.log(`   ✅ Asignaciones creadas: ${assignmentsCreated}`);

  // =========================================================================
  // FASE 4: ABSENCE CASES (para medical_communications)
  // =========================================================================
  console.log('\n═══ FASE 4: Casos de Ausencia Médica ═══');

  const absenceCaseIds = [];
  for (let i = 0; i < 10; i++) {
    const emp = faker.helpers.arrayElement(employees);
    const startDate = faker.date.recent({ days: 30 });
    const days = faker.number.int({ min: 1, max: 10 });
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);

    const [result] = await seq.query(`
      INSERT INTO absence_cases (id, company_id, employee_id, absence_type,
                                 start_date, end_date, requested_days, approved_days,
                                 case_status, employee_description, is_justified,
                                 created_at, updated_at, created_by)
      VALUES (gen_random_uuid(), ${COMPANY_ID}, :employeeId, :absenceType,
              :startDate, :endDate, :days, :days,
              :status, :description, :justified,
              NOW(), NOW(), '${ADMIN_ID}')
      RETURNING id
    `, {
      replacements: {
        employeeId: emp.user_id,
        absenceType: faker.helpers.arrayElement(['medical_illness', 'work_accident', 'non_work_accident', 'occupational_disease', 'maternity', 'family_care', 'authorized_leave']),
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        days,
        status: faker.helpers.arrayElement(['pending', 'under_review', 'awaiting_docs', 'justified', 'closed']),
        description: faker.helpers.arrayElement([
          'Dolor lumbar intenso', 'Gripe con fiebre alta', 'Accidente menor en planta',
          'Consulta médica programada', 'Estudios médicos'
        ]),
        justified: faker.datatype.boolean()
      }
    });
    if (result.length > 0) {
      absenceCaseIds.push(result[0].id);
    }
  }
  console.log(`   ✅ Casos de ausencia: ${absenceCaseIds.length}`);

  // =========================================================================
  // FASE 5: MEDICAL COMMUNICATIONS
  // =========================================================================
  console.log('\n═══ FASE 5: Comunicaciones Médicas ═══');

  let commsCreated = 0;
  for (const caseId of absenceCaseIds) {
    const numComms = faker.number.int({ min: 1, max: 4 });
    for (let i = 0; i < numComms; i++) {
      const isFromEmployee = faker.datatype.boolean();
      const emp = faker.helpers.arrayElement(employees);
      await seq.query(`
        INSERT INTO medical_communications (id, company_id, absence_case_id,
                                            sender_type, sender_id, receiver_type, receiver_id,
                                            message_type, subject, message, is_read, requires_response,
                                            created_at)
        VALUES (gen_random_uuid(), ${COMPANY_ID}, :caseId,
                :senderType, :senderId, :receiverType, :receiverId,
                :msgType, :subject, :message, :isRead, :requiresResponse,
                NOW() - INTERVAL '${i} days')
      `, {
        replacements: {
          caseId,
          senderType: isFromEmployee ? 'employee' : 'hr',
          senderId: isFromEmployee ? emp.user_id : ADMIN_ID,
          receiverType: isFromEmployee ? 'hr' : 'employee',
          receiverId: isFromEmployee ? ADMIN_ID : emp.user_id,
          msgType: faker.helpers.arrayElement(['initial_notification', 'request_info', 'employee_response', 'request_document', 'document_upload', 'diagnosis', 'justification', 'follow_up']),
          subject: faker.helpers.arrayElement([
            'Consulta sobre certificado', 'Solicitud de documentación',
            'Actualización de estado', 'Confirmación de diagnóstico'
          ]),
          message: faker.lorem.paragraph(),
          isRead: faker.datatype.boolean(),
          requiresResponse: faker.datatype.boolean()
        }
      });
      commsCreated++;
    }
  }
  console.log(`   ✅ Comunicaciones médicas: ${commsCreated}`);

  // =========================================================================
  // FASE 6: COMPANY BENEFIT POLICIES
  // =========================================================================
  console.log('\n═══ FASE 6: Políticas de Beneficios ═══');

  // Primero obtener benefit_types (es tabla global sin company_id)
  const [benefitTypes] = await seq.query(`
    SELECT id, code, name FROM benefit_types WHERE is_active = true LIMIT 10
  `);

  const policyIds = [];
  for (const bt of benefitTypes) {
    const [result] = await seq.query(`
      INSERT INTO company_benefit_policies (company_id, benefit_type_id, is_enabled,
                                            max_amount, max_quantity, max_beneficiaries_per_employee,
                                            duration_months, renewal_required, renewal_advance_days,
                                            requires_approval, approval_levels, min_seniority_months,
                                            payment_frequency, is_active, created_at, updated_at)
      VALUES (${COMPANY_ID}, :benefitTypeId, true,
              :maxAmount, 12, 5, 12, true, 30,
              :requiresApproval, 1, :minSeniority,
              :paymentFreq, true, NOW(), NOW())
      ON CONFLICT DO NOTHING
      RETURNING id
    `, {
      replacements: {
        benefitTypeId: bt.id,
        maxAmount: faker.number.int({ min: 10000, max: 100000 }),
        requiresApproval: bt.code === 'SCHOOL_AID' || bt.code === 'BONUS',
        minSeniority: bt.code === 'SENIORITY_BONUS' ? 12 : 3,
        paymentFreq: faker.helpers.arrayElement(['monthly', 'quarterly', 'annual'])
      }
    });
    if (result.length > 0) {
      policyIds.push({ policyId: result[0].id, benefitTypeId: bt.id, code: bt.code });
    }
  }
  console.log(`   ✅ Políticas de beneficios: ${policyIds.length}`);

  // =========================================================================
  // FASE 7: EMPLOYEE BENEFITS
  // =========================================================================
  console.log('\n═══ FASE 7: Beneficios de Empleados ═══');

  let benefitsCreated = 0;
  for (const policy of policyIds) {
    // Asignar a 5-10 empleados por política
    const numAssign = faker.number.int({ min: 5, max: Math.min(10, employees.length) });
    const shuffled = faker.helpers.shuffle([...employees]).slice(0, numAssign);

    for (const emp of shuffled) {
      const status = faker.helpers.weightedArrayElement([
        { value: 'active', weight: 7 },
        { value: 'pending_approval', weight: 2 },
        { value: 'expired', weight: 1 }
      ]);

      await seq.query(`
        INSERT INTO employee_benefits (user_id, company_id, company_benefit_policy_id,
                                       assigned_amount, effective_from, effective_until,
                                       status, has_required_documents, renewal_status,
                                       created_at, updated_at)
        VALUES (:userId, ${COMPANY_ID}, :policyId,
                :amount, :effectiveFrom, :effectiveUntil,
                :status, :hasDocs, :renewalStatus,
                NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, {
        replacements: {
          userId: emp.user_id,
          policyId: policy.policyId,
          amount: faker.number.int({ min: 5000, max: 50000 }),
          effectiveFrom: faker.date.past({ years: 1 }).toISOString().split('T')[0],
          effectiveUntil: status === 'expired'
            ? faker.date.past({ months: 1 }).toISOString().split('T')[0]
            : faker.date.future({ years: 1 }).toISOString().split('T')[0],
          status,
          hasDocs: status !== 'pending_approval',
          renewalStatus: status === 'active' ? null : 'required'
        }
      });
      benefitsCreated++;
    }
  }
  console.log(`   ✅ Beneficios asignados: ${benefitsCreated}`);

  // =========================================================================
  // FASE 8: LATE ARRIVAL AUTHORIZATIONS
  // =========================================================================
  console.log('\n═══ FASE 8: Autorizaciones de Llegada Tardía ═══');

  let lateAuthsCreated = 0;
  for (let i = 0; i < 30; i++) {
    const emp = faker.helpers.arrayElement(employees);
    const scheduledTime = faker.helpers.arrayElement(['08:00:00', '09:00:00', '14:00:00']);
    const minutesLate = faker.number.int({ min: 5, max: 55 });
    const scheduledHour = parseInt(scheduledTime.split(':')[0]);
    const actualHour = scheduledHour + Math.floor(minutesLate / 60);
    const actualMinute = minutesLate % 60;
    const actualTime = `${String(actualHour).padStart(2,'0')}:${String(actualMinute).padStart(2,'0')}:00`;

    const status = faker.helpers.weightedArrayElement([
      { value: 'approved', weight: 6 },
      { value: 'pending', weight: 2 },
      { value: 'rejected', weight: 1 },
      { value: 'escalated', weight: 1 }
    ]);

    await seq.query(`
      INSERT INTO late_arrival_authorizations (id, employee_id, company_id,
                                               request_date, scheduled_time, actual_arrival_time,
                                               minutes_late, reason, status,
                                               escalation_level, created_at, updated_at)
      VALUES (gen_random_uuid(), :employeeId, ${COMPANY_ID},
              CURRENT_DATE - INTERVAL '${faker.number.int({min:1,max:30})} days',
              :scheduledTime, :actualTime,
              :minutesLate, :reason, :status,
              :escalation, NOW(), NOW())
    `, {
      replacements: {
        employeeId: emp.user_id,
        scheduledTime,
        actualTime,
        minutesLate,
        reason: faker.helpers.arrayElement([
          'Tráfico intenso', 'Problema con transporte público',
          'Emergencia familiar', 'Turno médico', 'Problema con vehículo'
        ]),
        status,
        escalation: status === 'escalated' ? 1 : 0
      }
    });
    lateAuthsCreated++;
  }
  console.log(`   ✅ Autorizaciones llegada tardía: ${lateAuthsCreated}`);

  // =========================================================================
  // FASE 9: MEDICAL EXAMS
  // =========================================================================
  console.log('\n═══ FASE 9: Exámenes Médicos ═══');

  let examsCreated = 0;
  for (const emp of employees.slice(0, 40)) {
    const examTypes = ['preocupacional', 'periodico', 'reingreso', 'retiro', 'especial'];
    const numExams = faker.number.int({ min: 1, max: 3 });

    for (let i = 0; i < numExams; i++) {
      const examDate = faker.date.past({ years: 2 });
      const nextExamDate = new Date(examDate);
      nextExamDate.setFullYear(nextExamDate.getFullYear() + 1);

      await seq.query(`
        INSERT INTO user_medical_exams (user_id, company_id, exam_type, exam_date,
                                        result, observations, next_exam_date,
                                        medical_center, examining_doctor,
                                        created_at, updated_at)
        VALUES (:userId, ${COMPANY_ID}, :examType, :examDate,
                :result, :observations, :nextExamDate,
                :medicalCenter, :doctor,
                NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, {
        replacements: {
          userId: emp.user_id,
          examType: faker.helpers.arrayElement(examTypes),
          examDate: examDate.toISOString().split('T')[0],
          result: faker.helpers.weightedArrayElement([
            { value: 'apto', weight: 8 },
            { value: 'apto_con_observaciones', weight: 2 },
            { value: 'no_apto', weight: 0.5 }
          ]),
          observations: faker.datatype.boolean() ? faker.lorem.sentence() : null,
          nextExamDate: nextExamDate.toISOString().split('T')[0],
          medicalCenter: faker.helpers.arrayElement(['Centro Médico Norte', 'Clínica San José', 'Hospital Alemán']),
          doctor: faker.person.fullName()
        }
      });
      examsCreated++;
    }
  }
  console.log(`   ✅ Exámenes médicos: ${examsCreated}`);

  // =========================================================================
  // RESUMEN FINAL
  // =========================================================================
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    RESUMEN FINAL                             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const [summary] = await seq.query(`
    SELECT 'user_children' as tabla, COUNT(*) as total FROM user_children WHERE company_id = ${COMPANY_ID}
    UNION ALL SELECT 'trainings', COUNT(*) FROM trainings WHERE company_id = ${COMPANY_ID}
    UNION ALL SELECT 'training_assignments', COUNT(*) FROM training_assignments WHERE company_id = ${COMPANY_ID}
    UNION ALL SELECT 'absence_cases', COUNT(*) FROM absence_cases WHERE company_id = ${COMPANY_ID}
    UNION ALL SELECT 'medical_communications', COUNT(*) FROM medical_communications WHERE company_id = ${COMPANY_ID}
    UNION ALL SELECT 'company_benefit_policies', COUNT(*) FROM company_benefit_policies WHERE company_id = ${COMPANY_ID}
    UNION ALL SELECT 'employee_benefits', COUNT(*) FROM employee_benefits WHERE company_id = ${COMPANY_ID}
    UNION ALL SELECT 'late_arrival_authorizations', COUNT(*) FROM late_arrival_authorizations WHERE company_id = ${COMPANY_ID}
    UNION ALL SELECT 'user_medical_exams', COUNT(*) FROM user_medical_exams WHERE company_id = ${COMPANY_ID}
    ORDER BY tabla
  `);

  summary.forEach(r => console.log(`   ${r.tabla}: ${r.total}`));

  console.log('\n✅ Seed completado exitosamente');
  await seq.close();
}

seed().catch(e => {
  console.error('❌ ERROR:', e.message);
  console.error(e.stack);
  process.exit(1);
});
