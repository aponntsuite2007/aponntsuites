/**
 * ============================================================================
 * SEED ISI - TEST COMPLETO TODOS LOS MÓDULOS RRHH
 * ============================================================================
 *
 * Genera datos para probar TODAS las reglas de negocio:
 * - Convenios quincenales y mensuales
 * - Comisiones y premios
 * - Hijos con escolaridad (certificados válidos y vencidos)
 * - Vacaciones
 * - Licencias médicas con certificados
 * - Licencias de conducir (vencidas y vigentes)
 * - Sanciones
 * - Capacitaciones
 * - Beneficios
 * - Autorizaciones de tardanzas
 * - Comunicación médico-empleado
 */

const { Sequelize, QueryTypes } = require('sequelize');
const { faker } = require('@faker-js/faker');
faker.locale = 'es';

const COMPANY_ID = 11;
const sequelize = new Sequelize('postgresql://postgres:Aedr15150302@localhost:5432/attendance_system', { logging: false });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// ============================================================================
// FASE 1: PAYROLL TEMPLATES (Convenios quincenales/mensuales)
// ============================================================================

async function createPayrollTemplates() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  PAYROLL TEMPLATES - Convenios         ║');
  console.log('╚════════════════════════════════════════╝\n');

  const templates = [
    {
      code: 'MENSUAL-COMERCIO',
      name: 'Mensual - Empleados de Comercio',
      frequency: 'monthly',
      work_hours: 8,
      overtime_50_after: 48,
      night_shift_premium: 0.20,
      weekend_premium: 1.0
    },
    {
      code: 'QUINCENAL-INDUSTRIA',
      name: 'Quincenal - Metalúrgicos',
      frequency: 'biweekly',
      work_hours: 8,
      overtime_50_after: 44,
      night_shift_premium: 0.30,
      weekend_premium: 1.0
    },
    {
      code: 'MENSUAL-BANCARIOS',
      name: 'Mensual - Bancarios',
      frequency: 'monthly',
      work_hours: 7,
      overtime_50_after: 35,
      night_shift_premium: 0.25,
      weekend_premium: 1.5
    },
    {
      code: 'QUINCENAL-COMERCIO',
      name: 'Quincenal - Comercio con Comisiones',
      frequency: 'biweekly',
      work_hours: 8,
      overtime_50_after: 48,
      night_shift_premium: 0.15,
      weekend_premium: 1.0
    }
  ];

  for (const t of templates) {
    try {
      await sequelize.query(`
        INSERT INTO payroll_templates (
          company_id, template_code, template_name,
          pay_frequency, work_hours_per_day, overtime_50_after_hours,
          night_shift_premium_rate, weekend_premium_rate,
          is_active, created_at, updated_at
        ) VALUES (
          :companyId, :code, :name,
          :frequency, :workHours, :overtime50,
          :nightPremium, :weekendPremium,
          true, NOW(), NOW()
        )
        ON CONFLICT (company_id, template_code) DO UPDATE SET
          template_name = :name,
          updated_at = NOW()
      `, {
        replacements: {
          companyId: COMPANY_ID,
          code: t.code,
          name: t.name,
          frequency: t.frequency,
          workHours: t.work_hours,
          overtime50: t.overtime_50_after,
          nightPremium: t.night_shift_premium,
          weekendPremium: t.weekend_premium
        }
      });
      console.log(`  ✓ ${t.code}: ${t.name} (${t.frequency})`);
    } catch (e) {
      console.log(`  - ${t.code}: ${e.message.substring(0, 50)}`);
    }
  }

  console.log('\n✅ Payroll templates creados');
}

// ============================================================================
// FASE 2: BENEFIT TYPES (Comisiones, Premios, Escolaridad)
// ============================================================================

async function createBenefitTypes() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  BENEFIT TYPES - Comisiones/Premios    ║');
  console.log('╚════════════════════════════════════════╝\n');

  const benefits = [
    { code: 'COMISION_VENTAS', name: 'Comisión por Ventas', category: 'commission', nature: 'variable', taxable: true },
    { code: 'PREMIO_PRODUCTIVIDAD', name: 'Premio Productividad', category: 'bonus', nature: 'variable', taxable: true },
    { code: 'PREMIO_PRESENTISMO', name: 'Premio Presentismo', category: 'bonus', nature: 'fixed', taxable: true },
    { code: 'PREMIO_ANTIGUEDAD', name: 'Premio Antigüedad', category: 'bonus', nature: 'fixed', taxable: true },
    { code: 'ESCOLARIDAD_PRIMARIA', name: 'Ayuda Escolar Primaria', category: 'education', nature: 'fixed', taxable: false },
    { code: 'ESCOLARIDAD_SECUNDARIA', name: 'Ayuda Escolar Secundaria', category: 'education', nature: 'fixed', taxable: false },
    { code: 'ESCOLARIDAD_UNIVERSITARIA', name: 'Ayuda Escolar Universitaria', category: 'education', nature: 'fixed', taxable: false },
    { code: 'VIATICOS', name: 'Viáticos', category: 'expense', nature: 'variable', taxable: false },
    { code: 'GUARDERIA', name: 'Reintegro Guardería', category: 'childcare', nature: 'fixed', taxable: false },
    { code: 'BONO_FIN_ANO', name: 'Bono Fin de Año', category: 'bonus', nature: 'fixed', taxable: true }
  ];

  for (const b of benefits) {
    try {
      await sequelize.query(`
        INSERT INTO benefit_types (
          code, name, category, benefit_nature,
          recurrence_period, requires_approval, is_taxable,
          is_active, created_at, updated_at
        ) VALUES (
          :code, :name, :category, :nature,
          'monthly', true, :taxable,
          true, NOW(), NOW()
        )
        ON CONFLICT (code) DO UPDATE SET
          name = :name,
          updated_at = NOW()
      `, {
        replacements: {
          code: b.code,
          name: b.name,
          category: b.category,
          nature: b.nature,
          taxable: b.taxable
        }
      });
      console.log(`  ✓ ${b.code}: ${b.name}`);
    } catch (e) {
      console.log(`  - ${b.code}: ${e.message.substring(0, 50)}`);
    }
  }

  console.log('\n✅ Benefit types creados');
}

// ============================================================================
// FASE 3: HIJOS CON ESCOLARIDAD
// ============================================================================

async function createChildrenWithSchool() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  HIJOS CON ESCOLARIDAD                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Obtener empleados
  const [employees] = await sequelize.query(`
    SELECT user_id, "firstName", "lastName"
    FROM users WHERE company_id = :companyId AND role = 'employee'
    LIMIT 30
  `, { replacements: { companyId: COMPANY_ID } });

  let totalChildren = 0;
  let withValidCert = 0;
  let withExpiredCert = 0;

  for (const emp of employees) {
    // 60% de empleados tienen hijos
    if (Math.random() > 0.6) continue;

    const numChildren = randomBetween(1, 3);

    for (let i = 0; i < numChildren; i++) {
      const age = randomBetween(4, 22);
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - age);

      let schoolLevel, grade;
      if (age < 6) {
        schoolLevel = 'Jardín';
        grade = 'Sala de ' + age;
      } else if (age < 12) {
        schoolLevel = 'Primaria';
        grade = (age - 5) + '° grado';
      } else if (age < 18) {
        schoolLevel = 'Secundaria';
        grade = (age - 11) + '° año';
      } else {
        schoolLevel = 'Universidad';
        grade = (age - 17) + '° año';
      }

      // Certificado: 70% válido, 30% vencido
      const certValid = Math.random() > 0.3;
      const certDate = certValid
        ? formatDate(addDays(new Date(), -randomBetween(30, 180)))
        : formatDate(addDays(new Date(), -randomBetween(400, 700)));

      try {
        await sequelize.query(`
          INSERT INTO user_children (
            user_id, company_id, full_name, dni, birth_date, gender,
            school_name, school_level, grade_level,
            school_certificate_date, school_certificate_valid,
            special_needs, is_dependent,
            created_at, updated_at
          ) VALUES (
            :userId, :companyId, :name, :dni, :birthDate, :gender,
            :schoolName, :schoolLevel, :grade,
            :certDate, :certValid,
            :specialNeeds, true,
            NOW(), NOW()
          )
        `, {
          replacements: {
            userId: emp.user_id,
            companyId: COMPANY_ID,
            name: faker.person.fullName(),
            dni: faker.number.int({ min: 40000000, max: 55000000 }).toString(),
            birthDate: formatDate(birthDate),
            gender: Math.random() > 0.5 ? 'M' : 'F',
            schoolName: `Colegio ${faker.company.name().split(' ')[0]}`,
            schoolLevel,
            grade,
            certDate,
            certValid,
            specialNeeds: Math.random() > 0.95
          }
        });

        totalChildren++;
        if (certValid) withValidCert++;
        else withExpiredCert++;
      } catch (e) {
        // Ignorar errores de columnas faltantes
      }
    }
  }

  console.log(`  👶 Total hijos: ${totalChildren}`);
  console.log(`  ✅ Con certificado válido: ${withValidCert}`);
  console.log(`  ❌ Con certificado vencido: ${withExpiredCert}`);

  console.log('\n✅ Hijos con escolaridad creados');
}

// ============================================================================
// FASE 4: FAMILY MEMBERS (Cónyuges, Padres)
// ============================================================================

async function createFamilyMembers() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  FAMILIARES (Cónyuges, Padres)         ║');
  console.log('╚════════════════════════════════════════╝\n');

  const [employees] = await sequelize.query(`
    SELECT user_id FROM users WHERE company_id = :companyId AND role = 'employee'
    LIMIT 40
  `, { replacements: { companyId: COMPANY_ID } });

  let created = 0;

  for (const emp of employees) {
    // 70% tienen cónyuge
    if (Math.random() < 0.7) {
      try {
        await sequelize.query(`
          INSERT INTO user_family_members (
            user_id, company_id, full_name, relationship, dni,
            birth_date, is_dependent, is_emergency_contact,
            phone, created_at, updated_at
          ) VALUES (
            :userId, :companyId, :name, 'spouse', :dni,
            :birthDate, :isDependent, true,
            :phone, NOW(), NOW()
          )
        `, {
          replacements: {
            userId: emp.user_id,
            companyId: COMPANY_ID,
            name: faker.person.fullName(),
            dni: faker.number.int({ min: 20000000, max: 40000000 }).toString(),
            birthDate: formatDate(faker.date.birthdate({ min: 25, max: 55, mode: 'age' })),
            isDependent: Math.random() > 0.7,
            phone: faker.phone.number()
          }
        });
        created++;
      } catch (e) { }
    }

    // 30% tienen padre/madre como contacto emergencia
    if (Math.random() < 0.3) {
      try {
        await sequelize.query(`
          INSERT INTO user_family_members (
            user_id, company_id, full_name, relationship, dni,
            birth_date, is_dependent, is_emergency_contact,
            phone, created_at, updated_at
          ) VALUES (
            :userId, :companyId, :name, :rel, :dni,
            :birthDate, false, true,
            :phone, NOW(), NOW()
          )
        `, {
          replacements: {
            userId: emp.user_id,
            companyId: COMPANY_ID,
            name: faker.person.fullName(),
            rel: Math.random() > 0.5 ? 'father' : 'mother',
            dni: faker.number.int({ min: 10000000, max: 25000000 }).toString(),
            birthDate: formatDate(faker.date.birthdate({ min: 50, max: 75, mode: 'age' })),
            phone: faker.phone.number()
          }
        });
        created++;
      } catch (e) { }
    }
  }

  console.log(`  👨‍👩‍👧 Familiares creados: ${created}`);
  console.log('\n✅ Familiares creados');
}

// ============================================================================
// FASE 5: LICENCIAS DE CONDUCIR (válidas y vencidas)
// ============================================================================

async function createDriverLicenses() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  LICENCIAS DE CONDUCIR                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  const [employees] = await sequelize.query(`
    SELECT user_id, "firstName", "lastName"
    FROM users WHERE company_id = :companyId AND role = 'employee'
    LIMIT 35
  `, { replacements: { companyId: COMPANY_ID } });

  const licenseClasses = ['A1', 'A2', 'A3', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1'];
  let valid = 0, expired = 0, expiringSoon = 0;

  for (const emp of employees) {
    // 70% tienen licencia
    if (Math.random() > 0.7) continue;

    const isExpired = Math.random() < 0.15; // 15% vencidas
    const expiringSoonFlag = !isExpired && Math.random() < 0.2; // 20% por vencer

    let expiryDate;
    if (isExpired) {
      expiryDate = addDays(new Date(), -randomBetween(30, 365));
      expired++;
    } else if (expiringSoonFlag) {
      expiryDate = addDays(new Date(), randomBetween(7, 30));
      expiringSoon++;
    } else {
      expiryDate = addDays(new Date(), randomBetween(180, 1095));
      valid++;
    }

    try {
      await sequelize.query(`
        INSERT INTO user_driver_licenses (
          user_id, license_type, license_number, license_class,
          issue_date, expiry_date, restrictions,
          is_verified, verification_date,
          created_at, updated_at
        ) VALUES (
          :userId, 'driver', :licenseNum, :licenseClass,
          :issueDate, :expiryDate, :restrictions,
          :verified, :verificationDate,
          NOW(), NOW()
        )
      `, {
        replacements: {
          userId: emp.user_id,
          licenseNum: `${randomBetween(10000000, 99999999)}`,
          licenseClass: randomFromArray(licenseClasses),
          issueDate: formatDate(addDays(expiryDate, -1825)), // 5 años antes
          expiryDate: formatDate(expiryDate),
          restrictions: Math.random() > 0.9 ? 'Uso de lentes' : null,
          verified: !isExpired,
          verificationDate: !isExpired ? formatDate(addDays(new Date(), -randomBetween(30, 180))) : null
        }
      });
    } catch (e) { }
  }

  console.log(`  🚗 Licencias válidas: ${valid}`);
  console.log(`  ⚠️  Por vencer (30 días): ${expiringSoon}`);
  console.log(`  ❌ Vencidas: ${expired}`);

  console.log('\n✅ Licencias de conducir creadas');
}

// ============================================================================
// FASE 6: LICENCIAS PROFESIONALES
// ============================================================================

async function createProfessionalLicenses() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  LICENCIAS PROFESIONALES               ║');
  console.log('╚════════════════════════════════════════╝\n');

  const [employees] = await sequelize.query(`
    SELECT user_id, position FROM users
    WHERE company_id = :companyId AND role = 'employee'
    AND position IN ('Supervisor', 'Jefe', 'Operario Especializado', 'Oficial')
    LIMIT 20
  `, { replacements: { companyId: COMPANY_ID } });

  const professions = [
    { name: 'Matriculación Autoelevadores', body: 'Ministerio de Trabajo' },
    { name: 'Habilitación Trabajo en Altura', body: 'SRT' },
    { name: 'Certificación Soldadura', body: 'IRAM' },
    { name: 'Habilitación Espacios Confinados', body: 'SRT' },
    { name: 'Matriculación Electricista', body: 'ENRE' }
  ];

  let created = 0;

  for (const emp of employees) {
    const prof = randomFromArray(professions);
    const isExpired = Math.random() < 0.1;
    const expiryDate = isExpired
      ? addDays(new Date(), -randomBetween(30, 180))
      : addDays(new Date(), randomBetween(90, 730));

    try {
      await sequelize.query(`
        INSERT INTO user_professional_licenses (
          user_id, license_name, profession, license_number,
          issuing_body, issue_date, expiry_date,
          is_verified, created_at, updated_at
        ) VALUES (
          :userId, :name, :profession, :licenseNum,
          :issuingBody, :issueDate, :expiryDate,
          :verified, NOW(), NOW()
        )
      `, {
        replacements: {
          userId: emp.user_id,
          name: prof.name,
          profession: prof.name,
          licenseNum: `PROF-${randomBetween(100000, 999999)}`,
          issuingBody: prof.body,
          issueDate: formatDate(addDays(expiryDate, -365)),
          expiryDate: formatDate(expiryDate),
          verified: !isExpired
        }
      });
      created++;
    } catch (e) { }
  }

  console.log(`  📜 Licencias profesionales: ${created}`);
  console.log('\n✅ Licencias profesionales creadas');
}

// ============================================================================
// FASE 7: VACACIONES (Solicitudes con diferentes estados)
// ============================================================================

async function createVacationRequests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  SOLICITUDES DE VACACIONES             ║');
  console.log('╚════════════════════════════════════════╝\n');

  const [employees] = await sequelize.query(`
    SELECT user_id, "firstName", "lastName", "hireDate"
    FROM users WHERE company_id = :companyId AND role = 'employee'
    LIMIT 25
  `, { replacements: { companyId: COMPANY_ID } });

  const statuses = ['pending', 'approved', 'rejected', 'cancelled', 'taken'];
  let byStatus = { pending: 0, approved: 0, rejected: 0, cancelled: 0, taken: 0 };

  for (const emp of employees) {
    // Calcular días de vacaciones según antigüedad
    const hireDate = new Date(emp.hireDate || '2020-01-01');
    const yearsWorked = Math.floor((new Date() - hireDate) / (365.25 * 24 * 60 * 60 * 1000));
    let vacationDays = 14;
    if (yearsWorked >= 5) vacationDays = 21;
    if (yearsWorked >= 10) vacationDays = 28;
    if (yearsWorked >= 20) vacationDays = 35;

    const status = randomFromArray(statuses);
    const startDate = addDays(new Date(), randomBetween(-60, 90));
    const requestedDays = randomBetween(5, Math.min(14, vacationDays));
    const endDate = addDays(startDate, requestedDays);

    try {
      await sequelize.query(`
        INSERT INTO vacation_requests (
          company_id, user_id, request_type,
          start_date, end_date, total_days,
          reason, status, approved_by,
          created_at, updated_at
        ) VALUES (
          :companyId, :userId, 'vacation',
          :startDate, :endDate, :totalDays,
          :reason, :status, :approvedBy,
          NOW(), NOW()
        )
      `, {
        replacements: {
          companyId: COMPANY_ID,
          userId: emp.user_id,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          totalDays: requestedDays,
          reason: randomFromArray(['Descanso familiar', 'Viaje', 'Trámites personales', 'Vacaciones de verano']),
          status,
          approvedBy: status === 'approved' || status === 'taken' ? emp.user_id : null
        }
      });
      byStatus[status]++;
    } catch (e) { }
  }

  console.log('  🏖️  Solicitudes de vacaciones:');
  Object.entries(byStatus).forEach(([k, v]) => console.log(`      ${k}: ${v}`));

  console.log('\n✅ Solicitudes de vacaciones creadas');
}

// ============================================================================
// FASE 8: LICENCIAS MÉDICAS CON CERTIFICADOS
// ============================================================================

async function createMedicalLeaves() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  LICENCIAS MÉDICAS CON CERTIFICADOS    ║');
  console.log('╚════════════════════════════════════════╝\n');

  const [employees] = await sequelize.query(`
    SELECT user_id FROM users WHERE company_id = :companyId AND role = 'employee'
    LIMIT 30
  `, { replacements: { companyId: COMPANY_ID } });

  const diagnoses = [
    { code: 'J06.9', name: 'Infección respiratoria aguda', days: [2, 5] },
    { code: 'M54.5', name: 'Lumbalgia', days: [3, 7] },
    { code: 'K29.7', name: 'Gastritis', days: [2, 4] },
    { code: 'J03.9', name: 'Amigdalitis aguda', days: [3, 5] },
    { code: 'S93.4', name: 'Esguince de tobillo', days: [7, 14] },
    { code: 'F32.0', name: 'Episodio depresivo leve', days: [15, 30] },
    { code: 'Z34.9', name: 'Embarazo (control)', days: [1, 1] }
  ];

  const doctors = ['Dr. Juan Pérez', 'Dra. María González', 'Dr. Carlos López', 'Dra. Ana Martínez'];
  let total = 0, withCert = 0, withoutCert = 0;

  for (const emp of employees) {
    // 40% tienen licencia médica reciente
    if (Math.random() > 0.4) continue;

    const diag = randomFromArray(diagnoses);
    const days = randomBetween(diag.days[0], diag.days[1]);
    const startDate = addDays(new Date(), -randomBetween(5, 60));
    const hasCertificate = Math.random() > 0.15; // 85% con certificado

    try {
      // Crear licencia
      const [leave] = await sequelize.query(`
        INSERT INTO medical_leaves (
          user_id, company_id, start_date, end_date,
          leave_type, diagnosis, diagnosis_code, doctor_name,
          certificate_number, status, approved_days,
          created_at, updated_at
        ) VALUES (
          :userId, :companyId, :startDate, :endDate,
          'sick', :diagnosis, :diagCode, :doctor,
          :certNum, :status, :days,
          NOW(), NOW()
        )
        RETURNING id
      `, {
        replacements: {
          userId: emp.user_id,
          companyId: COMPANY_ID,
          startDate: formatDate(startDate),
          endDate: formatDate(addDays(startDate, days)),
          diagnosis: diag.name,
          diagCode: diag.code,
          doctor: randomFromArray(doctors),
          certNum: hasCertificate ? `CERT-${randomBetween(100000, 999999)}` : null,
          status: hasCertificate ? 'approved' : 'pending_documentation',
          days
        }
      });

      total++;
      if (hasCertificate) {
        withCert++;

        // Crear certificado médico
        try {
          await sequelize.query(`
            INSERT INTO medical_certificates (
              company_id, user_id, certificate_number,
              issue_date, diagnosis, symptoms, attending_physician,
              rest_days, status, approved_days,
              created_at, updated_at
            ) VALUES (
              :companyId, :userId, :certNum,
              :issueDate, :diagnosis, :symptoms, :doctor,
              :days, 'verified', :days,
              NOW(), NOW()
            )
          `, {
            replacements: {
              companyId: COMPANY_ID,
              userId: emp.user_id,
              certNum: `CERT-${randomBetween(100000, 999999)}`,
              issueDate: formatDate(startDate),
              diagnosis: diag.name,
              symptoms: `Síntomas de ${diag.name.toLowerCase()}`,
              doctor: randomFromArray(doctors),
              days
            }
          });
        } catch (e) { }
      } else {
        withoutCert++;
      }
    } catch (e) { }
  }

  console.log(`  🏥 Total licencias: ${total}`);
  console.log(`  ✅ Con certificado: ${withCert}`);
  console.log(`  ❌ Sin certificado: ${withoutCert}`);

  console.log('\n✅ Licencias médicas creadas');
}

// ============================================================================
// FASE 9: SANCIONES
// ============================================================================

async function createSanctions() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  SANCIONES DISCIPLINARIAS              ║');
  console.log('╚════════════════════════════════════════╝\n');

  const [employees] = await sequelize.query(`
    SELECT user_id FROM users WHERE company_id = :companyId AND role = 'employee'
    LIMIT 15
  `, { replacements: { companyId: COMPANY_ID } });

  const sanctionTypes = [
    { type: 'warning', severity: 'low', title: 'Apercibimiento verbal', points: 1 },
    { type: 'written_warning', severity: 'medium', title: 'Apercibimiento escrito', points: 3 },
    { type: 'suspension', severity: 'high', title: 'Suspensión', points: 5 },
    { type: 'tardiness', severity: 'low', title: 'Llegadas tarde reiteradas', points: 2 },
    { type: 'absence', severity: 'medium', title: 'Ausencia injustificada', points: 4 }
  ];

  let created = 0;

  for (const emp of employees) {
    // 20% tienen sanción
    if (Math.random() > 0.2) continue;

    const sanction = randomFromArray(sanctionTypes);

    try {
      await sequelize.query(`
        INSERT INTO sanctions (
          company_id, user_id, sanction_type, severity,
          title, description, sanction_date, status,
          points_deducted, workflow_status,
          created_at, updated_at
        ) VALUES (
          :companyId, :userId, :type, :severity,
          :title, :description, :date, :status,
          :points, 'completed',
          NOW(), NOW()
        )
      `, {
        replacements: {
          companyId: COMPANY_ID,
          userId: emp.user_id,
          type: sanction.type,
          severity: sanction.severity,
          title: sanction.title,
          description: `${sanction.title} - Motivo: ${randomFromArray(['Incumplimiento de horario', 'Falta de respeto', 'Negligencia', 'Incumplimiento de normas'])}`,
          date: formatDate(addDays(new Date(), -randomBetween(10, 180))),
          status: randomFromArray(['active', 'acknowledged', 'appealed']),
          points: sanction.points
        }
      });
      created++;
    } catch (e) { }
  }

  console.log(`  ⚠️  Sanciones creadas: ${created}`);
  console.log('\n✅ Sanciones creadas');
}

// ============================================================================
// FASE 10: CAPACITACIONES
// ============================================================================

async function createTrainings() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  CAPACITACIONES                        ║');
  console.log('╚════════════════════════════════════════╝\n');

  const trainings = [
    { title: 'Inducción Seguridad e Higiene', category: 'safety', mandatory: true, hours: 4 },
    { title: 'Trabajo en Altura', category: 'safety', mandatory: true, hours: 8 },
    { title: 'Primeros Auxilios', category: 'safety', mandatory: false, hours: 6 },
    { title: 'Uso de Extintores', category: 'safety', mandatory: true, hours: 2 },
    { title: 'Liderazgo Efectivo', category: 'soft_skills', mandatory: false, hours: 16 },
    { title: 'Excel Avanzado', category: 'technical', mandatory: false, hours: 12 },
    { title: 'Protocolo COVID-19', category: 'health', mandatory: true, hours: 2 }
  ];

  let createdTrainings = 0, assignments = 0;

  for (const t of trainings) {
    try {
      const [training] = await sequelize.query(`
        INSERT INTO trainings (
          company_id, title, description, category,
          duration_hours, is_mandatory,
          start_date, deadline, max_participants,
          created_at, updated_at
        ) VALUES (
          :companyId, :title, :description, :category,
          :hours, :mandatory,
          :startDate, :deadline, 50,
          NOW(), NOW()
        )
        RETURNING id
      `, {
        replacements: {
          companyId: COMPANY_ID,
          title: t.title,
          description: `Capacitación: ${t.title}`,
          category: t.category,
          hours: t.hours,
          mandatory: t.mandatory,
          startDate: formatDate(addDays(new Date(), -30)),
          deadline: formatDate(addDays(new Date(), 60))
        }
      });
      createdTrainings++;

      // Asignar a empleados
      const [employees] = await sequelize.query(`
        SELECT user_id FROM users WHERE company_id = :companyId AND role = 'employee'
        ORDER BY RANDOM() LIMIT :limit
      `, { replacements: { companyId: COMPANY_ID, limit: t.mandatory ? 30 : 15 } });

      for (const emp of employees) {
        const completed = Math.random() > 0.3;
        try {
          await sequelize.query(`
            INSERT INTO training_assignments (
              training_id, user_id, status,
              progress_percentage, completed_at, score,
              created_at, updated_at
            ) VALUES (
              :trainingId, :userId, :status,
              :progress, :completedAt, :score,
              NOW(), NOW()
            )
          `, {
            replacements: {
              trainingId: training[0].id,
              userId: emp.user_id,
              status: completed ? 'completed' : randomFromArray(['pending', 'in_progress']),
              progress: completed ? 100 : randomBetween(0, 80),
              completedAt: completed ? formatDate(addDays(new Date(), -randomBetween(5, 60))) : null,
              score: completed ? randomBetween(70, 100) : null
            }
          });
          assignments++;
        } catch (e) { }
      }
    } catch (e) { }
  }

  console.log(`  📚 Capacitaciones: ${createdTrainings}`);
  console.log(`  👥 Asignaciones: ${assignments}`);
  console.log('\n✅ Capacitaciones creadas');
}

// ============================================================================
// FASE 11: AUTORIZACIONES DE TARDANZAS
// ============================================================================

async function createLateArrivalAuthorizations() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  AUTORIZACIONES DE TARDANZAS           ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Obtener tardanzas sin autorizar
  const [lateArrivals] = await sequelize.query(`
    SELECT a.id, a."UserId", a.date, a.minutes_late, a.shift_id
    FROM attendances a
    WHERE a.company_id = :companyId
      AND a.is_late = true
      AND a.minutes_late > 10
    ORDER BY a.date DESC
    LIMIT 40
  `, { replacements: { companyId: COMPANY_ID } });

  let created = 0;
  const statuses = { pending: 0, approved: 0, rejected: 0 };

  for (const late of lateArrivals) {
    const status = randomFromArray(['pending', 'approved', 'approved', 'rejected']); // 50% approved

    try {
      await sequelize.query(`
        INSERT INTO late_arrival_authorizations (
          employee_id, shift_id, company_id,
          request_date, minutes_late, reason,
          status, decision_date, decided_by,
          created_at, updated_at
        ) VALUES (
          :employeeId, :shiftId, :companyId,
          :requestDate, :minutesLate, :reason,
          :status, :decisionDate, :decidedBy,
          NOW(), NOW()
        )
      `, {
        replacements: {
          employeeId: late.UserId,
          shiftId: late.shift_id,
          companyId: COMPANY_ID,
          requestDate: late.date,
          minutesLate: late.minutes_late,
          reason: randomFromArray([
            'Problema de transporte público',
            'Trámite personal urgente',
            'Problema de salud menor',
            'Accidente de tránsito en el camino',
            'Emergencia familiar'
          ]),
          status,
          decisionDate: status !== 'pending' ? formatDate(addDays(new Date(late.date), 1)) : null,
          decidedBy: status !== 'pending' ? late.UserId : null
        }
      });
      statuses[status]++;
      created++;
    } catch (e) { }
  }

  console.log(`  ⏰ Autorizaciones creadas: ${created}`);
  console.log(`     Pendientes: ${statuses.pending}`);
  console.log(`     Aprobadas: ${statuses.approved}`);
  console.log(`     Rechazadas: ${statuses.rejected}`);

  console.log('\n✅ Autorizaciones de tardanzas creadas');
}

// ============================================================================
// FASE 12: EMPLOYEE BENEFITS (Asignaciones)
// ============================================================================

async function assignEmployeeBenefits() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  ASIGNACIÓN DE BENEFICIOS              ║');
  console.log('╚════════════════════════════════════════╝\n');

  const [employees] = await sequelize.query(`
    SELECT u.user_id, u."firstName", u."lastName", u.salary, u.department_id
    FROM users u WHERE u.company_id = :companyId AND u.role = 'employee'
  `, { replacements: { companyId: COMPANY_ID } });

  const [benefitTypes] = await sequelize.query(`
    SELECT id, code, name FROM benefit_types WHERE code IN (
      'COMISION_VENTAS', 'PREMIO_PRODUCTIVIDAD', 'PREMIO_PRESENTISMO',
      'ESCOLARIDAD_PRIMARIA', 'ESCOLARIDAD_SECUNDARIA', 'VIATICOS'
    )
  `);

  let created = 0;

  for (const emp of employees) {
    // Comisiones para comercial (30% del salario base máximo)
    if (Math.random() < 0.3) {
      const commissionType = benefitTypes.find(b => b.code === 'COMISION_VENTAS');
      if (commissionType) {
        const commissionAmount = (parseFloat(emp.salary) || 500000) * (Math.random() * 0.15 + 0.05);
        try {
          await sequelize.query(`
            INSERT INTO employee_benefits (
              user_id, company_id, benefit_type_id,
              assigned_amount, effective_from, status,
              created_at, updated_at
            ) VALUES (
              :userId, :companyId, :benefitTypeId,
              :amount, CURRENT_DATE, 'active',
              NOW(), NOW()
            )
          `, {
            replacements: {
              userId: emp.user_id,
              companyId: COMPANY_ID,
              benefitTypeId: commissionType.id,
              amount: Math.round(commissionAmount)
            }
          });
          created++;
        } catch (e) { }
      }
    }

    // Premio presentismo (10% del básico)
    if (Math.random() < 0.7) {
      const presentismoType = benefitTypes.find(b => b.code === 'PREMIO_PRESENTISMO');
      if (presentismoType) {
        try {
          await sequelize.query(`
            INSERT INTO employee_benefits (
              user_id, company_id, benefit_type_id,
              assigned_amount, effective_from, status,
              created_at, updated_at
            ) VALUES (
              :userId, :companyId, :benefitTypeId,
              :amount, CURRENT_DATE, 'active',
              NOW(), NOW()
            )
          `, {
            replacements: {
              userId: emp.user_id,
              companyId: COMPANY_ID,
              benefitTypeId: presentismoType.id,
              amount: Math.round((parseFloat(emp.salary) || 500000) * 0.10)
            }
          });
          created++;
        } catch (e) { }
      }
    }
  }

  console.log(`  💰 Beneficios asignados: ${created}`);
  console.log('\n✅ Beneficios asignados');
}

// ============================================================================
// FASE 13: EXÁMENES MÉDICOS OCUPACIONALES
// ============================================================================

async function createMedicalExams() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  EXÁMENES MÉDICOS OCUPACIONALES        ║');
  console.log('╚════════════════════════════════════════╝\n');

  const [employees] = await sequelize.query(`
    SELECT user_id, "hireDate" FROM users
    WHERE company_id = :companyId AND role = 'employee'
    LIMIT 40
  `, { replacements: { companyId: COMPANY_ID } });

  const examTypes = ['preocupacional', 'periodico', 'egreso'];
  let created = 0;

  for (const emp of employees) {
    const examType = randomFromArray(examTypes);
    const examDate = addDays(new Date(), -randomBetween(30, 365));
    const nextExamDate = addDays(examDate, 365);
    const isExpired = nextExamDate < new Date();

    try {
      await sequelize.query(`
        INSERT INTO user_medical_exams (
          user_id, exam_type, exam_date,
          result, observations, next_exam_date,
          examining_doctor, is_fit_for_work,
          created_at, updated_at
        ) VALUES (
          :userId, :examType, :examDate,
          :result, :observations, :nextExamDate,
          :doctor, :fitForWork,
          NOW(), NOW()
        )
      `, {
        replacements: {
          userId: emp.user_id,
          examType,
          examDate: formatDate(examDate),
          result: randomFromArray(['apto', 'apto_con_restricciones', 'no_apto']),
          observations: Math.random() > 0.7 ? 'Sin observaciones' : randomFromArray([
            'Control de presión arterial recomendado',
            'Uso de protección auditiva obligatorio',
            'Derivación a oftalmología'
          ]),
          nextExamDate: formatDate(nextExamDate),
          doctor: `Dr. ${faker.person.lastName()}`,
          fitForWork: Math.random() > 0.1
        }
      });
      created++;
    } catch (e) { }
  }

  console.log(`  🩺 Exámenes médicos: ${created}`);
  console.log('\n✅ Exámenes médicos creados');
}

// ============================================================================
// FASE 14: COMUNICACIONES MÉDICO-EMPLEADO
// ============================================================================

async function createMedicalCommunications() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  COMUNICACIONES MÉDICO-EMPLEADO        ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Obtener casos de ausencia
  const [absenceCases] = await sequelize.query(`
    SELECT id, employee_id FROM absence_cases
    WHERE company_id = :companyId
    LIMIT 20
  `, { replacements: { companyId: COMPANY_ID } });

  let created = 0;

  for (const ac of absenceCases) {
    // Crear hilo de comunicación
    const messages = randomBetween(1, 4);

    for (let i = 0; i < messages; i++) {
      const isFromEmployee = i % 2 === 0;

      try {
        await sequelize.query(`
          INSERT INTO medical_communications (
            company_id, absence_case_id,
            sender_type, receiver_type,
            message, attachments,
            created_at, updated_at
          ) VALUES (
            :companyId, :caseId,
            :senderType, :receiverType,
            :message, :attachments,
            NOW(), NOW()
          )
        `, {
          replacements: {
            companyId: COMPANY_ID,
            caseId: ac.id,
            senderType: isFromEmployee ? 'employee' : 'medical_staff',
            receiverType: isFromEmployee ? 'medical_staff' : 'employee',
            message: isFromEmployee
              ? randomFromArray([
                'Adjunto certificado médico',
                'Solicito extensión de licencia',
                'Informo que me reintegro mañana',
                'Consulta sobre fecha de reintegro'
              ])
              : randomFromArray([
                'Certificado recibido y aprobado',
                'Se requiere examen de reintegro',
                'Licencia extendida según solicitud',
                'Por favor adjuntar estudios complementarios'
              ]),
            attachments: Math.random() > 0.6 ? '["certificado.pdf"]' : null
          }
        });
        created++;
      } catch (e) { }
    }
  }

  console.log(`  💬 Comunicaciones: ${created}`);
  console.log('\n✅ Comunicaciones médico-empleado creadas');
}

// ============================================================================
// FASE 15: DOCUMENTOS DMS
// ============================================================================

async function createDocuments() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  DOCUMENTOS (DMS)                      ║');
  console.log('╚════════════════════════════════════════╝\n');

  const [employees] = await sequelize.query(`
    SELECT user_id FROM users WHERE company_id = :companyId AND role = 'employee'
    LIMIT 25
  `, { replacements: { companyId: COMPANY_ID } });

  const docTypes = [
    { type: 'DNI', expirable: true },
    { type: 'CURRICULUM', expirable: false },
    { type: 'TITULO_UNIVERSITARIO', expirable: false },
    { type: 'CERTIFICADO_ANTECEDENTES', expirable: true },
    { type: 'LICENCIA_CONDUCIR', expirable: true },
    { type: 'CERTIFICADO_ESCOLARIDAD', expirable: true }
  ];

  let created = 0;

  for (const emp of employees) {
    const numDocs = randomBetween(2, 5);

    for (let i = 0; i < numDocs; i++) {
      const docType = randomFromArray(docTypes);
      const isExpired = docType.expirable && Math.random() < 0.2;

      try {
        await sequelize.query(`
          INSERT INTO dms_documents (
            company_id, uploaded_by, document_number,
            title, document_type, original_filename,
            storage_path, file_size, mime_type,
            expiration_date, status, is_verified,
            created_at, updated_at
          ) VALUES (
            :companyId, :uploadedBy, :docNumber,
            :title, :docType, :filename,
            :storagePath, :fileSize, 'application/pdf',
            :expirationDate, :status, :verified,
            NOW(), NOW()
          )
        `, {
          replacements: {
            companyId: COMPANY_ID,
            uploadedBy: emp.user_id,
            docNumber: `DOC-${randomBetween(100000, 999999)}`,
            title: docType.type.replace(/_/g, ' '),
            docType: docType.type,
            filename: `${docType.type.toLowerCase()}_${Date.now()}.pdf`,
            storagePath: `/documents/${COMPANY_ID}/${emp.user_id}/${docType.type.toLowerCase()}.pdf`,
            fileSize: randomBetween(50000, 2000000),
            expirationDate: docType.expirable
              ? formatDate(addDays(new Date(), isExpired ? -randomBetween(30, 365) : randomBetween(30, 730)))
              : null,
            status: isExpired ? 'expired' : 'active',
            verified: !isExpired && Math.random() > 0.3
          }
        });
        created++;
      } catch (e) { }
    }
  }

  console.log(`  📄 Documentos: ${created}`);
  console.log('\n✅ Documentos DMS creados');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       SEED COMPLETO - TODOS LOS MÓDULOS RRHH                 ║');
  console.log('║                                                              ║');
  console.log('║  Convenios, Comisiones, Premios, Escolaridad, Vacaciones,    ║');
  console.log('║  Licencias, Sanciones, Capacitaciones, Beneficios, etc.      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  try {
    await sequelize.authenticate();
    console.log('\n✅ Conexión establecida\n');

    // Ejecutar todas las fases
    await createPayrollTemplates();
    await createBenefitTypes();
    await createChildrenWithSchool();
    await createFamilyMembers();
    await createDriverLicenses();
    await createProfessionalLicenses();
    await createVacationRequests();
    await createMedicalLeaves();
    await createSanctions();
    await createTrainings();
    await createLateArrivalAuthorizations();
    await assignEmployeeBenefits();
    await createMedicalExams();
    await createMedicalCommunications();
    await createDocuments();

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ SEED COMPLETADO                        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await sequelize.close();
  }
}

main();
