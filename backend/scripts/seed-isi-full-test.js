/**
 * ============================================================================
 * SEED ISI - TEST E2E COMPLETO RRHH
 * ============================================================================
 *
 * Genera datos realistas para probar TODO el circuito RRHH:
 * - Estructura organizacional (departamentos, organigrama)
 * - Turnos (fijo, rotativos, con almuerzo)
 * - 3 Convenios colectivos argentinos
 * - ~50 empleados
 * - ~1000 registros de asistencia (30 días)
 * - Tardanzas, horas extra, licencias médicas
 * - Banco de horas con decisiones
 * - Liquidación de sueldos
 * - Cargas sociales argentinas
 *
 * USO: node scripts/seed-isi-full-test.js
 */

const { Sequelize, QueryTypes } = require('sequelize');
const { faker } = require('@faker-js/faker');
faker.locale = 'es';

// Configuración
const COMPANY_ID = 11; // ISI
const COMPANY_NAME = 'ISI';

// Conexión
const sequelize = new Sequelize('postgresql://postgres:Aedr15150302@localhost:5432/attendance_system', {
  logging: false
});

// ============================================================================
// DATOS BASE - LEGISLACIÓN ARGENTINA
// ============================================================================

// Convenios Colectivos de Trabajo (CCT)
const CONVENIOS = [
  {
    code: 'CCT-130-75',
    name: 'Empleados de Comercio',
    category: 'comercio',
    base_salary: 450000, // Básico categoría A
    categories: [
      { code: 'A', name: 'Administrativo', multiplier: 1.0 },
      { code: 'B', name: 'Cajero/Vendedor', multiplier: 1.15 },
      { code: 'C', name: 'Encargado', multiplier: 1.35 },
      { code: 'D', name: 'Jefe de Sección', multiplier: 1.55 }
    ],
    overtime_weekday: 1.5,  // 50%
    overtime_weekend: 2.0,  // 100%
    lunch_minutes: 60,
    vacation_days: { 0: 14, 5: 21, 10: 28, 20: 35 } // años: días
  },
  {
    code: 'CCT-260-75',
    name: 'Metalúrgicos (UOM)',
    category: 'industria',
    base_salary: 520000,
    categories: [
      { code: 'OP1', name: 'Operario', multiplier: 1.0 },
      { code: 'OP2', name: 'Operario Calificado', multiplier: 1.20 },
      { code: 'OP3', name: 'Operario Especializado', multiplier: 1.40 },
      { code: 'SUP', name: 'Supervisor', multiplier: 1.70 }
    ],
    overtime_weekday: 1.5,
    overtime_weekend: 2.0,
    lunch_minutes: 30, // Más corto en industria
    vacation_days: { 0: 14, 5: 21, 10: 28, 20: 35 },
    insalubridad: 0.10 // 10% adicional
  },
  {
    code: 'CCT-18-75',
    name: 'Bancarios',
    category: 'servicios',
    base_salary: 850000,
    categories: [
      { code: 'INI', name: 'Inicial', multiplier: 1.0 },
      { code: 'CAJ', name: 'Cajero', multiplier: 1.25 },
      { code: 'OFC', name: 'Oficial', multiplier: 1.50 },
      { code: 'JEF', name: 'Jefe', multiplier: 2.0 }
    ],
    overtime_weekday: 1.5,
    overtime_weekend: 2.0,
    lunch_minutes: 60,
    vacation_days: { 0: 15, 5: 22, 10: 30, 20: 38 } // Bancarios tienen más
  }
];

// Cargas Sociales Argentina (%)
const CARGAS_SOCIALES = {
  empleado: {
    jubilacion: 11.0,
    obra_social: 3.0,
    pami: 3.0,
    total: 17.0
  },
  empleador: {
    jubilacion: 10.17,
    obra_social: 6.0,
    asignaciones_familiares: 4.44,
    fondo_empleo: 0.89,
    art: 2.5, // Variable según actividad
    total: 24.0
  }
};

// Departamentos a crear
const DEPARTAMENTOS = [
  { name: 'Dirección', code: 'DIR', convenio_idx: 2 }, // Bancarios
  { name: 'Administración', code: 'ADM', convenio_idx: 0 }, // Comercio
  { name: 'Recursos Humanos', code: 'RRHH', convenio_idx: 0 },
  { name: 'Producción', code: 'PROD', convenio_idx: 1 }, // Metalúrgicos
  { name: 'Logística', code: 'LOG', convenio_idx: 1 },
  { name: 'Comercial', code: 'COM', convenio_idx: 0 },
  { name: 'Sistemas', code: 'SIS', convenio_idx: 2 },
  { name: 'Calidad', code: 'CAL', convenio_idx: 1 }
];

// Turnos a crear
const TURNOS = [
  {
    name: 'Turno Central',
    type: 'standard',
    start: '08:00',
    end: '17:00',
    break_start: '12:00',
    break_end: '13:00',
    departments: ['DIR', 'ADM', 'RRHH', 'COM', 'SIS']
  },
  {
    name: 'Turno Mañana Producción',
    type: 'standard',
    start: '06:00',
    end: '14:00',
    break_start: '10:00',
    break_end: '10:30',
    departments: ['PROD', 'LOG', 'CAL']
  },
  {
    name: 'Turno Tarde Producción',
    type: 'standard',
    start: '14:00',
    end: '22:00',
    break_start: '18:00',
    break_end: '18:30',
    departments: ['PROD', 'LOG']
  },
  {
    name: 'Turno Noche Producción',
    type: 'standard',
    start: '22:00',
    end: '06:00',
    break_start: '02:00',
    break_end: '02:30',
    departments: ['PROD']
  },
  {
    name: 'Rotativo 5x2',
    type: 'rotative',
    start: '08:00',
    end: '16:00',
    break_start: '12:00',
    break_end: '12:30',
    work_days: 5,
    rest_days: 2,
    departments: ['LOG']
  }
];

// ============================================================================
// FUNCIONES HELPER
// ============================================================================

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatTime(hours, minutes) {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return formatTime(newH, newM);
}

function generateCBU() {
  // CBU argentino: 22 dígitos
  let cbu = '';
  for (let i = 0; i < 22; i++) {
    cbu += Math.floor(Math.random() * 10);
  }
  return cbu;
}

function generateCUIL(dni) {
  // CUIL: 20-DNI-X o 27-DNI-X (simplificado)
  const prefix = Math.random() > 0.5 ? '20' : '27';
  return `${prefix}-${dni}-${Math.floor(Math.random() * 10)}`;
}

// ============================================================================
// FASE 1: LIMPIEZA
// ============================================================================

async function cleanCompanyData() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  FASE 1: LIMPIEZA DE DATOS ISI         ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Deshabilitar temporalmente constraints
  await sequelize.query('SET session_replication_role = replica;');
  console.log('  ⚠️  Constraints deshabilitados temporalmente\n');

  const tables = [
    // Primero las que dependen de otras
    'hour_bank_pending_decisions',
    'hour_bank_redemption_requests',
    'hour_bank_loans',
    'hour_bank_balances',
    'hour_bank_transactions',
    'payroll_items',
    'payroll_runs',
    'user_shift_assignments',
    'medical_leaves',
    'vacation_requests',
    'notification_logs',
    'organizational_hierarchy',
    'attendances',
    // Tablas con FKs a users
    'biometric_detections',
    'trainings',
    'training_enrollments',
    'talent_applications',
    'biometric_templates',
    'device_tokens',
    'audit_logs',
    'inbox_messages',
    'inbox_message_groups',
    'employee_documents',
  ];

  for (const table of tables) {
    try {
      const result = await sequelize.query(
        `DELETE FROM ${table} WHERE company_id = :companyId`,
        { replacements: { companyId: COMPANY_ID }, type: QueryTypes.DELETE }
      );
      console.log(`  ✓ ${table} limpiada`);
    } catch (e) {
      // Tabla puede no existir o no tener company_id
      console.log(`  - ${table} (${e.message.substring(0, 50)}...)`);
    }
  }

  // Eliminar usuarios excepto admin
  const [deleted] = await sequelize.query(`
    DELETE FROM users
    WHERE company_id = :companyId
      AND role != 'admin'
      AND email NOT LIKE '%admin%'
    RETURNING user_id
  `, { replacements: { companyId: COMPANY_ID } });
  console.log(`  ✓ ${deleted.length} usuarios eliminados (admin preservado)`);

  // Eliminar shifts de la empresa (con constraints deshabilitados)
  await sequelize.query(`DELETE FROM late_arrival_authorizations WHERE company_id = :companyId`, {
    replacements: { companyId: COMPANY_ID }
  }).catch(() => {});

  await sequelize.query(`DELETE FROM shifts WHERE company_id = :companyId`, {
    replacements: { companyId: COMPANY_ID }
  });
  console.log('  ✓ Turnos eliminados');

  // Eliminar departamentos
  await sequelize.query(`DELETE FROM departments WHERE company_id = :companyId`, {
    replacements: { companyId: COMPANY_ID }
  });
  console.log('  ✓ Departamentos eliminados');

  // Re-habilitar constraints
  await sequelize.query('SET session_replication_role = DEFAULT;');
  console.log('  ✓ Constraints re-habilitados');

  console.log('\n✅ Limpieza completada');
}

// ============================================================================
// FASE 2: ESTRUCTURA ORGANIZACIONAL
// ============================================================================

async function createDepartments() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  FASE 2: DEPARTAMENTOS                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  const created = [];

  for (const dept of DEPARTAMENTOS) {
    // Nombre único por empresa
    const deptName = `${dept.name} - ISI`;
    try {
      const [result] = await sequelize.query(`
        INSERT INTO departments (name, description, company_id, is_active, created_at, updated_at)
        VALUES (:name, :description, :companyId, true, NOW(), NOW())
        RETURNING id, name
      `, {
        replacements: {
          name: deptName,
          description: `Departamento ${dept.name} - Código: ${dept.code}`,
          companyId: COMPANY_ID
        }
      });
      created.push({ ...result[0], code: dept.code, convenio_idx: dept.convenio_idx });
      console.log(`  ✓ ${dept.name} (${dept.code})`);
    } catch (e) {
      // Si ya existe, obtenerlo
      const [existing] = await sequelize.query(`
        SELECT id, name FROM departments WHERE name = :name AND company_id = :companyId
      `, { replacements: { name: deptName, companyId: COMPANY_ID } });
      if (existing.length > 0) {
        created.push({ ...existing[0], code: dept.code, convenio_idx: dept.convenio_idx });
        console.log(`  ○ ${dept.name} (ya existe)`);
      }
    }
  }

  console.log(`\n✅ ${created.length} departamentos creados`);
  return created;
}

async function createShifts() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  FASE 3: TURNOS                        ║');
  console.log('╚════════════════════════════════════════╝\n');

  const created = [];

  for (const turno of TURNOS) {
    const [result] = await sequelize.query(`
      INSERT INTO shifts (
        id, name, "startTime", "endTime",
        "breakStartTime", "breakEndTime",
        "shiftType", "workDays", "restDays",
        "toleranceMinutes", "toleranceMinutesEntry", "toleranceMinutesExit",
        "isActive", company_id, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        :name, :startTime, :endTime,
        :breakStart, :breakEnd,
        :shiftType, :workDays, :restDays,
        15, 10, 10,
        true, :companyId, NOW(), NOW()
      )
      RETURNING id, name, "shiftType"
    `, {
      replacements: {
        name: turno.name,
        startTime: turno.start,
        endTime: turno.end,
        breakStart: turno.break_start,
        breakEnd: turno.break_end,
        shiftType: turno.type,
        workDays: turno.work_days || 5,
        restDays: turno.rest_days || 2,
        companyId: COMPANY_ID
      }
    });
    created.push({ ...result[0], departments: turno.departments });
    console.log(`  ✓ ${turno.name} (${turno.start}-${turno.end})`);
  }

  console.log(`\n✅ ${created.length} turnos creados`);
  return created;
}

async function createConvenioTemplates() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  FASE 4: CONVENIOS COLECTIVOS          ║');
  console.log('╚════════════════════════════════════════╝\n');

  for (const convenio of CONVENIOS) {
    // Crear template de payroll para cada convenio
    try {
      await sequelize.query(`
        INSERT INTO payroll_templates (
          company_id, name, code, description,
          base_salary, overtime_weekday_rate, overtime_weekend_rate,
          deductions, contributions, is_active,
          created_at, updated_at
        ) VALUES (
          :companyId, :name, :code, :description,
          :baseSalary, :overtimeWeekday, :overtimeWeekend,
          :deductions::jsonb, :contributions::jsonb, true,
          NOW(), NOW()
        )
        ON CONFLICT DO NOTHING
      `, {
        replacements: {
          companyId: COMPANY_ID,
          name: convenio.name,
          code: convenio.code,
          description: `Convenio Colectivo ${convenio.name}`,
          baseSalary: convenio.base_salary,
          overtimeWeekday: convenio.overtime_weekday,
          overtimeWeekend: convenio.overtime_weekend,
          deductions: JSON.stringify(CARGAS_SOCIALES.empleado),
          contributions: JSON.stringify(CARGAS_SOCIALES.empleador)
        }
      });
      console.log(`  ✓ ${convenio.code}: ${convenio.name}`);
      console.log(`    Básico: $${convenio.base_salary.toLocaleString()}`);
      console.log(`    Categorías: ${convenio.categories.map(c => c.code).join(', ')}`);
    } catch (e) {
      console.log(`  - ${convenio.code}: tabla payroll_templates puede no existir`);
    }
  }

  console.log('\n✅ Convenios configurados');
}

// ============================================================================
// FASE 5: EMPLEADOS
// ============================================================================

async function createEmployees(departments, shifts) {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  FASE 5: EMPLEADOS (~50)               ║');
  console.log('╚════════════════════════════════════════╝\n');

  const employees = [];
  const TOTAL_EMPLOYEES = 50;

  // Distribución por departamento
  const distribution = {
    'DIR': 3,    // Dirección: 3
    'ADM': 6,    // Administración: 6
    'RRHH': 4,   // RRHH: 4
    'PROD': 15,  // Producción: 15 (más grande)
    'LOG': 8,    // Logística: 8
    'COM': 7,    // Comercial: 7
    'SIS': 4,    // Sistemas: 4
    'CAL': 3     // Calidad: 3
  };

  let employeeCount = 0;

  for (const dept of departments) {
    const count = distribution[dept.code] || 3;
    const convenio = CONVENIOS[dept.convenio_idx];
    const deptShifts = shifts.filter(s => s.departments?.includes(dept.code));

    console.log(`\n  📁 ${dept.name} (${count} empleados, ${convenio.code})`);

    for (let i = 0; i < count; i++) {
      employeeCount++;
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const dni = faker.number.int({ min: 20000000, max: 45000000 }).toString();
      const category = randomFromArray(convenio.categories);
      const shift = deptShifts.length > 0 ? randomFromArray(deptShifts) : shifts[0];
      const hireDate = faker.date.between({
        from: '2018-01-01',
        to: '2024-06-01'
      });

      // Calcular salario según categoría
      const baseSalary = Math.round(convenio.base_salary * category.multiplier);

      const legajo = `ISI-${String(employeeCount).padStart(4, '0')}`;
      const [user] = await sequelize.query(`
        INSERT INTO users (
          user_id, "employeeId", legajo, "firstName", "lastName", email, dni, cuil,
          password, role, position, salary,
          "hireDate", department_id, company_id,
          cbu, bank_name, account_status, is_active,
          "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          :legajo, :legajo, :firstName, :lastName, :email, :dni, :cuil,
          '$2b$10$xPPQXDLYvGHBl.ZR7CY.QOEGvGrC1UeQTQgqF8NVLBqkJCOBOxIaO',
          'employee', :position, :salary,
          :hireDate, :deptId, :companyId,
          :cbu, :bankName, 'active', true,
          NOW(), NOW()
        )
        RETURNING user_id, "firstName", "lastName", email
      `, {
        replacements: {
          legajo,
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@isi.com.ar`.replace(/\s/g, ''),
          dni,
          cuil: generateCUIL(dni),
          position: category.name,
          salary: baseSalary,
          hireDate: hireDate.toISOString().split('T')[0],
          deptId: dept.id,
          companyId: COMPANY_ID,
          cbu: generateCBU(),
          bankName: randomFromArray(['Banco Nación', 'Banco Galicia', 'Banco Santander', 'BBVA', 'Banco Macro'])
        }
      });

      const employee = user[0];

      // Asignar turno
      await sequelize.query(`
        INSERT INTO user_shift_assignments (
          user_id, shift_id, company_id, join_date, assigned_phase,
          is_active, created_at, updated_at
        ) VALUES (
          :userId, :shiftId, :companyId, :joinDate, 'principal',
          true, NOW(), NOW()
        )
      `, {
        replacements: {
          userId: employee.user_id,
          shiftId: shift.id,
          companyId: COMPANY_ID,
          joinDate: hireDate.toISOString().split('T')[0]
        }
      });

      employees.push({
        ...employee,
        department_id: dept.id,
        department_code: dept.code,
        shift_id: shift.id,
        shift_name: shift.name,
        convenio: convenio.code,
        category: category.code,
        salary: baseSalary,
        hire_date: hireDate
      });

      process.stdout.write(`    ✓ ${firstName} ${lastName} (${category.code})\n`);
    }
  }

  console.log(`\n✅ ${employees.length} empleados creados`);
  return employees;
}

// ============================================================================
// FASE 6: ORGANIGRAMA
// ============================================================================

async function createOrgChart(departments, employees) {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  FASE 6: ORGANIGRAMA                   ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Buscar admin existente para ser CEO
  const [admins] = await sequelize.query(`
    SELECT user_id, "firstName", "lastName" FROM users
    WHERE company_id = :companyId AND role = 'admin'
    LIMIT 1
  `, { replacements: { companyId: COMPANY_ID } });

  const ceo = admins[0];
  if (!ceo) {
    console.log('  ⚠️  No hay admin para ser CEO');
    return;
  }

  console.log(`  👔 CEO: ${ceo.firstName} ${ceo.lastName}`);

  // Agrupar empleados por departamento
  const byDept = {};
  for (const emp of employees) {
    if (!byDept[emp.department_code]) byDept[emp.department_code] = [];
    byDept[emp.department_code].push(emp);
  }

  // Crear jerarquía: CEO -> Gerentes (primer empleado de cada dept) -> Resto
  for (const deptCode in byDept) {
    const deptEmployees = byDept[deptCode];
    if (deptEmployees.length === 0) continue;

    // Primer empleado es gerente, reporta a CEO
    const gerente = deptEmployees[0];

    try {
      await sequelize.query(`
        INSERT INTO organizational_hierarchy (
          company_id, employee_id, supervisor_id, relationship_type,
          is_primary, effective_from, created_at, updated_at
        ) VALUES (
          :companyId, :employeeId, :supervisorId, 'direct',
          true, CURRENT_DATE, NOW(), NOW()
        )
        ON CONFLICT DO NOTHING
      `, {
        replacements: {
          companyId: COMPANY_ID,
          employeeId: gerente.user_id,
          supervisorId: ceo.user_id
        }
      });

      // Resto reporta al gerente
      for (let i = 1; i < deptEmployees.length; i++) {
        await sequelize.query(`
          INSERT INTO organizational_hierarchy (
            company_id, employee_id, supervisor_id, relationship_type,
            is_primary, effective_from, created_at, updated_at
          ) VALUES (
            :companyId, :employeeId, :supervisorId, 'direct',
            true, CURRENT_DATE, NOW(), NOW()
          )
          ON CONFLICT DO NOTHING
        `, {
          replacements: {
            companyId: COMPANY_ID,
            employeeId: deptEmployees[i].user_id,
            supervisorId: gerente.user_id
          }
        });
      }

      console.log(`  📊 ${deptCode}: ${gerente.firstName} (gerente) → ${deptEmployees.length - 1} reportes`);
    } catch (e) {
      console.log(`  - ${deptCode}: ${e.message.substring(0, 50)}`);
    }
  }

  console.log('\n✅ Organigrama creado');
}

// ============================================================================
// FASE 7: ASISTENCIAS (30 días, ~1000 registros)
// ============================================================================

async function createAttendanceRecords(employees, shifts) {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  FASE 7: ASISTENCIAS (~1000 registros) ║');
  console.log('╚════════════════════════════════════════╝\n');

  const DAYS = 30;
  const today = new Date();
  let totalRecords = 0;
  let lateArrivals = 0;
  let overtimeRecords = 0;
  let medicalLeaves = 0;

  // Feriados argentinos (ejemplo)
  const holidays = ['2026-01-01', '2026-01-06']; // Año nuevo, Reyes

  for (const emp of employees) {
    const shift = shifts.find(s => s.id === emp.shift_id) || shifts[0];
    const [startH, startM] = (shift.startTime || '08:00').split(':').map(Number);
    const [endH, endM] = (shift.endTime || '17:00').split(':').map(Number);

    // Probabilidades por empleado
    const lateProb = Math.random() * 0.15; // 0-15% de tardanzas
    const overtimeProb = Math.random() * 0.20; // 0-20% de horas extra
    const absenceProb = Math.random() * 0.05; // 0-5% de ausencias

    for (let d = DAYS; d >= 1; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();

      // Saltar fines de semana (excepto algunos turnos)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        if (shift.name !== 'Turno Noche Producción') continue;
      }

      // Saltar feriados
      if (holidays.includes(dateStr)) continue;

      // Probabilidad de ausencia
      if (Math.random() < absenceProb) {
        // Licencia médica
        if (Math.random() < 0.7) {
          try {
            await sequelize.query(`
              INSERT INTO medical_leaves (
                user_id, company_id, start_date, end_date,
                leave_type, status, created_at, updated_at
              ) VALUES (
                :userId, :companyId, :startDate, :endDate,
                'sick', 'approved', NOW(), NOW()
              )
              ON CONFLICT DO NOTHING
            `, {
              replacements: {
                userId: emp.user_id,
                companyId: COMPANY_ID,
                startDate: dateStr,
                endDate: dateStr
              }
            });
            medicalLeaves++;
          } catch (e) { /* tabla puede no existir */ }
        }
        continue;
      }

      // Calcular hora de entrada
      let checkInMinutes = startH * 60 + startM;
      let isLate = false;
      let minutesLate = 0;

      if (Math.random() < lateProb) {
        // Tardanza de 5-45 minutos
        minutesLate = randomBetween(5, 45);
        checkInMinutes += minutesLate;
        isLate = true;
        lateArrivals++;
      } else {
        // Llegada normal (-5 a +5 minutos)
        checkInMinutes += randomBetween(-5, 5);
      }

      const checkInH = Math.floor(checkInMinutes / 60);
      const checkInM = checkInMinutes % 60;
      const checkInTime = `${dateStr}T${String(checkInH).padStart(2, '0')}:${String(checkInM).padStart(2, '0')}:00.000Z`;

      // Calcular hora de salida
      let checkOutMinutes = endH * 60 + endM;
      let overtimeHours = 0;

      if (Math.random() < overtimeProb) {
        // Horas extra: 1-3 horas
        const extraMinutes = randomBetween(60, 180);
        checkOutMinutes += extraMinutes;
        overtimeHours = extraMinutes / 60;
        overtimeRecords++;
      } else {
        // Salida normal (-10 a +10 minutos)
        checkOutMinutes += randomBetween(-10, 10);
      }

      const checkOutH = Math.floor(checkOutMinutes / 60) % 24;
      const checkOutM = checkOutMinutes % 60;
      const checkOutTime = `${dateStr}T${String(checkOutH).padStart(2, '0')}:${String(checkOutM).padStart(2, '0')}:00.000Z`;

      // Calcular horas trabajadas
      const workedMinutes = checkOutMinutes - checkInMinutes - 60; // Menos 1h almuerzo
      const workingHours = Math.max(0, workedMinutes / 60);

      // Insertar attendance
      try {
        await sequelize.query(`
          INSERT INTO attendances (
            id, "UserId", company_id, date,
            "checkInTime", "checkOutTime",
            "checkInMethod", "checkOutMethod",
            origin_type, status,
            shift_id, is_late, minutes_late,
            "workingHours", overtime_hours,
            "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), :userId, :companyId, :date,
            :checkIn, :checkOut,
            'face', 'face',
            'kiosk', 'present',
            :shiftId, :isLate, :minutesLate,
            :workingHours, :overtimeHours,
            NOW(), NOW()
          )
        `, {
          replacements: {
            userId: emp.user_id,
            companyId: COMPANY_ID,
            date: dateStr,
            checkIn: checkInTime,
            checkOut: checkOutTime,
            shiftId: emp.shift_id,
            isLate,
            minutesLate,
            workingHours: workingHours.toFixed(2),
            overtimeHours: overtimeHours.toFixed(2)
          }
        });
        totalRecords++;
      } catch (e) {
        // Puede haber conflicto de fecha/usuario
      }
    }

    process.stdout.write(`  ✓ ${emp.firstName} ${emp.lastName}: procesado\r`);
  }

  console.log(`\n\n  📊 Estadísticas:`);
  console.log(`     Total registros: ${totalRecords}`);
  console.log(`     Tardanzas: ${lateArrivals}`);
  console.log(`     Con horas extra: ${overtimeRecords}`);
  console.log(`     Licencias médicas: ${medicalLeaves}`);

  console.log(`\n✅ ${totalRecords} registros de asistencia creados`);
  return { totalRecords, lateArrivals, overtimeRecords, medicalLeaves };
}

// ============================================================================
// FASE 8: BANCO DE HORAS
// ============================================================================

async function processHourBank(employees) {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  FASE 8: BANCO DE HORAS                ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Crear template de banco de horas si no existe
  try {
    await sequelize.query(`
      INSERT INTO hour_bank_templates (
        company_id, name, description,
        max_balance, max_monthly_accrual, min_redemption,
        conversion_rate_weekday, conversion_rate_weekend,
        expiry_months, allow_negative, allow_hour_loans,
        is_enabled, is_current_version, created_at, updated_at
      ) VALUES (
        :companyId, 'Template ISI', 'Banco de horas ISI',
        200, 40, 1,
        1.0, 1.5,
        12, false, true,
        true, true, NOW(), NOW()
      )
      ON CONFLICT DO NOTHING
    `, { replacements: { companyId: COMPANY_ID } });
    console.log('  ✓ Template de banco de horas creado');
  } catch (e) {
    console.log('  - Template ya existe o tabla no disponible');
  }

  // Obtener asistencias con horas extra
  const [overtimeAttendances] = await sequelize.query(`
    SELECT a.id, a."UserId", a.date, a.overtime_hours, a.shift_id
    FROM attendances a
    WHERE a.company_id = :companyId
      AND a.overtime_hours > 0
    ORDER BY a.date
    LIMIT 200
  `, { replacements: { companyId: COMPANY_ID } });

  console.log(`  📋 Procesando ${overtimeAttendances.length} registros con horas extra...\n`);

  let processed = 0;
  let banked = 0;
  let paid = 0;

  for (const att of overtimeAttendances) {
    const decision = Math.random() > 0.4 ? 'bank' : 'pay'; // 60% banco, 40% pago

    try {
      // Crear transacción en banco de horas
      await sequelize.query(`
        INSERT INTO hour_bank_transactions (
          user_id, company_id, attendance_id,
          transaction_type, hours_raw, conversion_rate, hours_final,
          balance_before, balance_after,
          source_type, overtime_destination,
          description, status, created_at, updated_at
        ) VALUES (
          :userId, :companyId, :attendanceId,
          'accrual', :hours, :rate, :hoursFinal,
          0, :hoursFinal,
          'overtime', :destination,
          :description, 'completed', NOW(), NOW()
        )
        ON CONFLICT DO NOTHING
      `, {
        replacements: {
          userId: att.UserId,
          companyId: COMPANY_ID,
          attendanceId: att.id,
          hours: att.overtime_hours,
          rate: decision === 'bank' ? 1.0 : 1.5,
          hoursFinal: decision === 'bank' ? att.overtime_hours : att.overtime_hours * 1.5,
          destination: decision,
          description: `Horas extra ${att.date} - ${decision === 'bank' ? 'Acumulado en banco' : 'Para pago'}`
        }
      });

      if (decision === 'bank') banked++;
      else paid++;
      processed++;
    } catch (e) {
      // Ignorar errores
    }
  }

  console.log(`  📊 Resultados:`);
  console.log(`     Procesados: ${processed}`);
  console.log(`     Acumulados en banco: ${banked}`);
  console.log(`     Para pago: ${paid}`);

  console.log(`\n✅ Banco de horas procesado`);
}

// ============================================================================
// FASE 9: LIQUIDACIÓN DE SUELDOS
// ============================================================================

async function createPayrollRun(employees) {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  FASE 9: LIQUIDACIÓN DE SUELDOS        ║');
  console.log('╚════════════════════════════════════════╝\n');

  const period = new Date();
  period.setDate(1);
  const periodStr = period.toISOString().split('T')[0].substring(0, 7); // YYYY-MM

  // Crear payroll run
  let payrollRunId;
  try {
    const [run] = await sequelize.query(`
      INSERT INTO payroll_runs (
        company_id, period, status, run_date,
        total_gross, total_deductions, total_net,
        total_employer_cost, employee_count,
        created_at, updated_at
      ) VALUES (
        :companyId, :period, 'draft', CURRENT_DATE,
        0, 0, 0, 0, :empCount,
        NOW(), NOW()
      )
      RETURNING id
    `, {
      replacements: {
        companyId: COMPANY_ID,
        period: periodStr,
        empCount: employees.length
      }
    });
    payrollRunId = run[0].id;
    console.log(`  ✓ Payroll run creado: ${payrollRunId} (${periodStr})`);
  } catch (e) {
    console.log(`  - Tabla payroll_runs no disponible: ${e.message.substring(0, 50)}`);
    return;
  }

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  let totalEmployerCost = 0;

  console.log('\n  Calculando liquidaciones...\n');

  for (const emp of employees) {
    // Obtener datos de asistencia del mes
    const [attData] = await sequelize.query(`
      SELECT
        COUNT(*) as days_worked,
        COALESCE(SUM("workingHours"::numeric), 0) as total_hours,
        COALESCE(SUM(overtime_hours::numeric), 0) as overtime_hours,
        COALESCE(SUM(minutes_late), 0) as total_late_minutes
      FROM attendances
      WHERE "UserId" = :userId
        AND company_id = :companyId
        AND date >= date_trunc('month', CURRENT_DATE)
    `, {
      replacements: { userId: emp.user_id, companyId: COMPANY_ID }
    });

    const att = attData[0];
    const baseSalary = emp.salary || 500000;

    // Calcular conceptos
    const daysWorked = parseInt(att.days_worked) || 20;
    const overtimeHours = parseFloat(att.overtime_hours) || 0;
    const hourlyRate = baseSalary / 200; // 200 horas mensuales promedio

    // Adicionales
    const overtimePay = overtimeHours * hourlyRate * 1.5;
    const presentismo = daysWorked >= 20 ? baseSalary * 0.10 : 0; // 10% presentismo
    const antiguedad = Math.min(25, Math.floor((new Date() - new Date(emp.hire_date)) / (365.25 * 24 * 60 * 60 * 1000))) * baseSalary * 0.01; // 1% por año

    const grossSalary = baseSalary + overtimePay + presentismo + antiguedad;

    // Deducciones empleado
    const jubilacion = grossSalary * 0.11;
    const obraSocial = grossSalary * 0.03;
    const pami = grossSalary * 0.03;
    const totalDeductionsEmp = jubilacion + obraSocial + pami;

    const netSalary = grossSalary - totalDeductionsEmp;

    // Contribuciones empleador
    const employerContributions = grossSalary * 0.24;

    // Insertar payroll item
    try {
      await sequelize.query(`
        INSERT INTO payroll_items (
          payroll_run_id, user_id, company_id,
          base_salary, overtime_pay, bonuses, deductions,
          gross_salary, net_salary, employer_contributions,
          days_worked, hours_worked, overtime_hours,
          status, created_at, updated_at
        ) VALUES (
          :runId, :userId, :companyId,
          :baseSalary, :overtimePay, :bonuses, :deductions,
          :grossSalary, :netSalary, :employerContribs,
          :daysWorked, :hoursWorked, :overtimeHours,
          'calculated', NOW(), NOW()
        )
      `, {
        replacements: {
          runId: payrollRunId,
          userId: emp.user_id,
          companyId: COMPANY_ID,
          baseSalary,
          overtimePay,
          bonuses: presentismo + antiguedad,
          deductions: totalDeductionsEmp,
          grossSalary,
          netSalary,
          employerContribs: employerContributions,
          daysWorked,
          hoursWorked: parseFloat(att.total_hours) || 160,
          overtimeHours
        }
      });

      totalGross += grossSalary;
      totalDeductions += totalDeductionsEmp;
      totalNet += netSalary;
      totalEmployerCost += grossSalary + employerContributions;
    } catch (e) {
      // Tabla puede no existir
    }
  }

  // Actualizar totales del run
  try {
    await sequelize.query(`
      UPDATE payroll_runs SET
        total_gross = :totalGross,
        total_deductions = :totalDeductions,
        total_net = :totalNet,
        total_employer_cost = :totalEmployerCost,
        status = 'calculated',
        updated_at = NOW()
      WHERE id = :runId
    `, {
      replacements: {
        runId: payrollRunId,
        totalGross,
        totalDeductions,
        totalNet,
        totalEmployerCost
      }
    });
  } catch (e) { /* ignore */ }

  console.log(`  📊 Resumen Liquidación:`);
  console.log(`     Empleados: ${employees.length}`);
  console.log(`     Total Bruto: $${totalGross.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`);
  console.log(`     Deducciones: $${totalDeductions.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`);
  console.log(`     Total Neto: $${totalNet.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`);
  console.log(`     Costo Empleador: $${totalEmployerCost.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`);

  console.log(`\n✅ Liquidación de sueldos completada`);

  return { payrollRunId, totalGross, totalDeductions, totalNet, totalEmployerCost };
}

// ============================================================================
// FASE 10: NOTIFICACIONES DE TARDANZAS
// ============================================================================

async function createLateArrivalNotifications() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  FASE 10: NOTIFICACIONES TARDANZAS     ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Verificar workflow de tardanzas existe
  const [workflow] = await sequelize.query(`
    SELECT id FROM notification_workflows
    WHERE process_key = 'attendance.late_arrival'
    LIMIT 1
  `);

  if (workflow.length === 0) {
    // Crear workflow
    await sequelize.query(`
      INSERT INTO notification_workflows (
        process_key, process_name, module, description, scope,
        workflow_steps, channels, primary_channel,
        requires_response, response_type, response_options, response_timeout_hours,
        priority, sla_delivery_minutes, sla_response_hours,
        recipient_type, is_active, created_at, updated_at
      ) VALUES (
        'attendance.late_arrival',
        'Notificación de Tardanza',
        'attendance',
        'Notifica al supervisor cuando un empleado llega tarde',
        'aponnt',
        '[{"step": 1, "action": "notify_supervisor", "description": "Notificar al supervisor directo"}]'::jsonb,
        '["inbox", "email"]'::jsonb,
        'inbox',
        true,
        'approval',
        '[{"key": "justify", "label": "Justificar"}, {"key": "sanction", "label": "Aplicar sanción"}]'::jsonb,
        24,
        'normal',
        5,
        24,
        'hierarchy',
        true,
        NOW(),
        NOW()
      )
    `);
    console.log('  ✓ Workflow attendance.late_arrival creado');
  }

  // Obtener tardanzas significativas (>15 min)
  const [lateArrivals] = await sequelize.query(`
    SELECT a.id, a."UserId", a.date, a.minutes_late,
           u."firstName", u."lastName"
    FROM attendances a
    JOIN users u ON u.user_id = a."UserId"
    WHERE a.company_id = :companyId
      AND a.is_late = true
      AND a.minutes_late > 15
    ORDER BY a.date DESC
    LIMIT 50
  `, { replacements: { companyId: COMPANY_ID } });

  console.log(`  📋 Generando notificaciones para ${lateArrivals.length} tardanzas...\n`);

  let created = 0;
  for (const late of lateArrivals) {
    try {
      await sequelize.query(`
        INSERT INTO notification_logs (
          id, company_id, workflow_key, module,
          origin_type, origin_id,
          recipient_type, recipient_id,
          title, message, priority,
          requires_action, action_type, action_status,
          channels, delivery_status,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), :companyId, 'attendance.late_arrival', 'attendance',
          'attendance', :attendanceId,
          'hierarchy', :userId,
          :title, :message, 'normal',
          true, 'approval', 'pending',
          '["inbox"]'::jsonb, 'pending'::jsonb,
          NOW(), NOW()
        )
      `, {
        replacements: {
          companyId: COMPANY_ID,
          attendanceId: late.id,
          userId: late.UserId,
          title: `Tardanza: ${late.firstName} ${late.lastName}`,
          message: `El empleado ${late.firstName} ${late.lastName} llegó ${late.minutes_late} minutos tarde el ${late.date}`
        }
      });
      created++;
    } catch (e) {
      // Ignorar errores
    }
  }

  console.log(`  ✓ ${created} notificaciones de tardanza creadas`);
  console.log('\n✅ Notificaciones procesadas');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           SEED ISI - TEST E2E COMPLETO RRHH                  ║');
  console.log('║                                                              ║');
  console.log('║  Empresa: ISI (ID: 11)                                       ║');
  console.log('║  ~50 empleados, ~1000 registros, 3 convenios                 ║');
  console.log('║  Legislación argentina completa                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  try {
    await sequelize.authenticate();
    console.log('\n✅ Conexión a BD establecida');

    // Ejecutar fases
    await cleanCompanyData();
    const departments = await createDepartments();
    const shifts = await createShifts();
    await createConvenioTemplates();
    const employees = await createEmployees(departments, shifts);
    await createOrgChart(departments, employees);
    const attendanceStats = await createAttendanceRecords(employees, shifts);
    await processHourBank(employees);
    const payrollResult = await createPayrollRun(employees);
    await createLateArrivalNotifications();

    // Resumen final
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    RESUMEN FINAL                             ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`
  📁 Departamentos:     ${departments.length}
  ⏰ Turnos:            ${shifts.length}
  📜 Convenios:         ${CONVENIOS.length} (${CONVENIOS.map(c => c.code).join(', ')})
  👥 Empleados:         ${employees.length}
  📊 Asistencias:       ${attendanceStats.totalRecords}
     - Tardanzas:       ${attendanceStats.lateArrivals}
     - Con horas extra: ${attendanceStats.overtimeRecords}
     - Licencias:       ${attendanceStats.medicalLeaves}
  💰 Liquidación:
     - Total Bruto:     $${payrollResult?.totalGross?.toLocaleString('es-AR') || 'N/A'}
     - Total Neto:      $${payrollResult?.totalNet?.toLocaleString('es-AR') || 'N/A'}
     - Costo Empresa:   $${payrollResult?.totalEmployerCost?.toLocaleString('es-AR') || 'N/A'}
`);
    console.log('✅ SEED COMPLETADO - Sistema listo para testing E2E');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar
main();
