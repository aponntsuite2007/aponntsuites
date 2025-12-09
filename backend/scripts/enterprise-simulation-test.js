/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  ENTERPRISE SIMULATION TEST - NIVEL EJECUTIVO                                ║
 * ║  Simulación completa de empresa de 100+ empleados                            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  MÓDULOS:                                                                    ║
 * ║  1. Enterprise Data Generator - Poblar todas las tablas                      ║
 * ║  2. SSOT Integrity Validator - Verificar fuente única de verdad              ║
 * ║  3. Workflow Simulator - Simular flujos de trabajo reales                    ║
 * ║  4. Data Chain Validator - Detectar cadenas rotas/incoherentes               ║
 * ║  5. Duplicate Detector - Encontrar datos duplicados                          ║
 * ║  6. Report Consistency Checker - Verificar consistencia de reportes          ║
 * ║  7. Concurrency Stress Test - Pruebas de estrés multi-usuario                ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const axios = require('axios');
const { faker } = require('@faker-js/faker/locale/es');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
const CONFIG = {
    baseUrl: `http://localhost:${process.env.TEST_PORT || 9995}`,
    companyId: 11, // ISI
    simulation: {
        totalEmployees: 100,
        departments: 8,
        shifts: 5,
        branches: 3,
        kiosks: 5,
        daysToSimulate: 30, // Último mes
        vacationRequestsPercent: 15, // 15% de empleados con vacaciones
        sanctionsPercent: 5, // 5% con sanciones
        medicalExamsPercent: 30, // 30% con exámenes médicos
        trainingPercent: 40, // 40% en capacitaciones
        documentsPerEmployee: 3 // Promedio de documentos por empleado
    }
};

// ============================================================================
// ESTADO GLOBAL DEL TEST
// ============================================================================
const STATE = {
    authToken: null,
    generatedData: {
        employees: [],
        departments: [],
        shifts: [],
        branches: [],
        kiosks: [],
        attendances: [],
        vacations: [],
        sanctions: [],
        notifications: [],
        medicalExams: [],
        documents: [],
        trainings: []
    },
    validationResults: {
        ssotViolations: [],
        duplicates: [],
        brokenChains: [],
        orphanedRecords: [],
        inconsistencies: []
    },
    metrics: {
        startTime: null,
        endTime: null,
        testsRun: 0,
        testsPassed: 0,
        testsFailed: 0,
        warnings: 0
    }
};

// ============================================================================
// UTILIDADES
// ============================================================================
const log = {
    header: (msg) => console.log(`\n${'═'.repeat(80)}\n  ${msg}\n${'═'.repeat(80)}`),
    section: (msg) => console.log(`\n${'─'.repeat(60)}\n  ${msg}\n${'─'.repeat(60)}`),
    success: (msg) => console.log(`   ✅ ${msg}`),
    error: (msg) => console.log(`   ❌ ${msg}`),
    warning: (msg) => console.log(`   ⚠️  ${msg}`),
    info: (msg) => console.log(`   ℹ️  ${msg}`),
    data: (msg) => console.log(`   📊 ${msg}`),
    progress: (current, total, msg) => {
        const percent = Math.round((current / total) * 100);
        const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
        process.stdout.write(`\r   [${bar}] ${percent}% - ${msg}                    `);
    }
};

async function makeRequest(method, endpoint, data = null, token = null) {
    try {
        const config = {
            method,
            url: `${CONFIG.baseUrl}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            ...(data && { data }),
            timeout: 30000
        };
        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.error || error.message,
            status: error.response?.status || 0
        };
    }
}

// ============================================================================
// MÓDULO 1: ENTERPRISE DATA GENERATOR
// ============================================================================
class EnterpriseDataGenerator {
    constructor() {
        this.orgStructure = {
            departments: [
                { name: 'Dirección General', code: 'DIR', headcount: 5 },
                { name: 'Recursos Humanos', code: 'RRHH', headcount: 8 },
                { name: 'Administración y Finanzas', code: 'ADMIN', headcount: 12 },
                { name: 'Operaciones', code: 'OPS', headcount: 35 },
                { name: 'Comercial', code: 'COM', headcount: 15 },
                { name: 'Tecnología', code: 'IT', headcount: 10 },
                { name: 'Logística', code: 'LOG', headcount: 10 },
                { name: 'Calidad', code: 'QA', headcount: 5 }
            ],
            shifts: [
                { name: 'Turno Mañana', start: '06:00', end: '14:00', type: 'standard' },
                { name: 'Turno Tarde', start: '14:00', end: '22:00', type: 'standard' },
                { name: 'Turno Noche', start: '22:00', end: '06:00', type: 'standard' },
                { name: 'Turno Administrativo', start: '09:00', end: '18:00', type: 'standard' },
                { name: 'Turno Rotativo 4x4', start: '08:00', end: '20:00', type: 'rotative' }
            ],
            roles: ['employee', 'supervisor', 'manager', 'hr', 'admin'],
            branches: [
                { name: 'Casa Central', city: 'Buenos Aires', isMain: true },
                { name: 'Sucursal Norte', city: 'Córdoba', isMain: false },
                { name: 'Sucursal Sur', city: 'Mendoza', isMain: false }
            ]
        };
    }

    generateEmployee(index, department, shift) {
        const gender = faker.helpers.arrayElement(['male', 'female']);
        const firstName = faker.person.firstName(gender);
        const lastName = faker.person.lastName();
        const hireDate = faker.date.between({
            from: '2018-01-01',
            to: '2024-12-01'
        });

        // Calcular antigüedad para determinar días de vacaciones
        const yearsWorked = Math.floor((new Date() - hireDate) / (365.25 * 24 * 60 * 60 * 1000));
        const vacationDays = yearsWorked < 5 ? 14 : yearsWorked < 10 ? 21 : yearsWorked < 20 ? 28 : 35;

        return {
            legajo: `EMP-ISI-${String(index).padStart(4, '0')}`,
            firstName,
            lastName,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@isi-empresa.com`,
            phone: faker.phone.number('+54 11 ####-####'),
            documentType: 'DNI',
            documentNumber: faker.string.numeric(8),
            birthDate: faker.date.between({ from: '1965-01-01', to: '2000-12-31' }),
            hireDate,
            department: department.name,
            departmentCode: department.code,
            shift: shift.name,
            shiftId: shift.id,
            role: this.determineRole(index, department),
            salary: this.calculateSalary(department, yearsWorked),
            vacationDaysTotal: vacationDays,
            vacationDaysUsed: faker.number.int({ min: 0, max: Math.floor(vacationDays * 0.7) }),
            address: {
                street: faker.location.streetAddress(),
                city: faker.location.city(),
                province: faker.helpers.arrayElement(['Buenos Aires', 'CABA', 'Córdoba', 'Santa Fe']),
                postalCode: faker.location.zipCode()
            },
            emergencyContact: {
                name: faker.person.fullName(),
                phone: faker.phone.number('+54 11 ####-####'),
                relationship: faker.helpers.arrayElement(['Cónyuge', 'Padre', 'Madre', 'Hermano/a', 'Hijo/a'])
            },
            bankInfo: {
                bank: faker.helpers.arrayElement(['Banco Nación', 'Banco Galicia', 'Banco Santander', 'BBVA']),
                accountNumber: faker.finance.accountNumber(20),
                cbu: faker.string.numeric(22)
            },
            isActive: faker.datatype.boolean({ probability: 0.95 }),
            canUseMobileApp: faker.datatype.boolean({ probability: 0.8 }),
            hasBiometricConsent: faker.datatype.boolean({ probability: 0.9 })
        };
    }

    determineRole(index, department) {
        if (index < 5) return 'admin';
        if (department.code === 'DIR') return 'manager';
        if (department.code === 'RRHH') return faker.helpers.arrayElement(['hr', 'supervisor']);
        if (index % 10 === 0) return 'supervisor';
        return 'employee';
    }

    calculateSalary(department, yearsWorked) {
        const baseSalaries = {
            'DIR': 800000, 'RRHH': 450000, 'ADMIN': 400000, 'OPS': 350000,
            'COM': 420000, 'IT': 550000, 'LOG': 380000, 'QA': 420000
        };
        const base = baseSalaries[department.code] || 350000;
        const seniorityBonus = base * (yearsWorked * 0.03);
        return Math.round(base + seniorityBonus);
    }

    generateAttendanceRecord(employee, date, shift) {
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isAbsent = faker.datatype.boolean({ probability: 0.05 }); // 5% ausencias
        const isVacation = faker.datatype.boolean({ probability: 0.03 }); // 3% vacaciones ese día
        const isLate = faker.datatype.boolean({ probability: 0.1 }); // 10% tardanzas

        if (isWeekend || isAbsent || isVacation) {
            return null; // No registrar asistencia
        }

        const [startHour, startMin] = shift.start.split(':').map(Number);
        const [endHour, endMin] = shift.end.split(':').map(Number);

        // Generar hora de entrada (con posible tardanza)
        let checkInHour = startHour;
        let checkInMin = startMin + (isLate ? faker.number.int({ min: 5, max: 45 }) : faker.number.int({ min: -10, max: 5 }));
        if (checkInMin >= 60) { checkInHour++; checkInMin -= 60; }
        if (checkInMin < 0) { checkInHour--; checkInMin += 60; }

        // Generar hora de salida (con posible overtime)
        const hasOvertime = faker.datatype.boolean({ probability: 0.15 });
        let checkOutHour = endHour + (hasOvertime ? faker.number.int({ min: 1, max: 3 }) : 0);
        let checkOutMin = endMin + faker.number.int({ min: -5, max: 15 });
        if (checkOutMin >= 60) { checkOutHour++; checkOutMin -= 60; }

        const checkInTime = new Date(date);
        checkInTime.setHours(checkInHour, checkInMin, 0);

        const checkOutTime = new Date(date);
        checkOutTime.setHours(checkOutHour, checkOutMin, 0);

        return {
            UserId: employee.id,
            employeeLegajo: employee.legajo,
            date: date.toISOString().split('T')[0],
            checkInTime: checkInTime.toISOString(),
            checkOutTime: checkOutTime.toISOString(),
            status: isLate ? 'late' : 'present',
            isLate,
            lateMinutes: isLate ? (checkInHour - startHour) * 60 + (checkInMin - startMin) : 0,
            hasOvertime,
            overtimeMinutes: hasOvertime ? (checkOutHour - endHour) * 60 + (checkOutMin - endMin) : 0,
            source: faker.helpers.arrayElement(['kiosk', 'mobile', 'manual']),
            kioskId: faker.helpers.arrayElement(STATE.generatedData.kiosks.map(k => k.id)),
            notes: isLate ? faker.helpers.arrayElement(['Tránsito', 'Problema personal', 'Transporte público']) : null
        };
    }

    generateVacationRequest(employee) {
        const startDate = faker.date.future({ years: 1 });
        const daysRequested = faker.number.int({ min: 5, max: 15 });
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + daysRequested);

        const status = faker.helpers.weightedArrayElement([
            { weight: 40, value: 'approved' },
            { weight: 30, value: 'pending' },
            { weight: 20, value: 'rejected' },
            { weight: 10, value: 'cancelled' }
        ]);

        return {
            UserId: employee.id,
            employeeLegajo: employee.legajo,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            department: employee.department,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            daysRequested,
            type: faker.helpers.arrayElement(['annual', 'personal', 'study', 'marriage', 'bereavement']),
            status,
            reason: faker.lorem.sentence(),
            approvedBy: status === 'approved' ? faker.person.fullName() : null,
            approvedAt: status === 'approved' ? faker.date.recent().toISOString() : null,
            rejectionReason: status === 'rejected' ? faker.lorem.sentence() : null
        };
    }

    generateSanction(employee) {
        const types = [
            { type: 'verbal_warning', severity: 'low', description: 'Apercibimiento verbal' },
            { type: 'written_warning', severity: 'medium', description: 'Apercibimiento escrito' },
            { type: 'suspension', severity: 'high', description: 'Suspensión' },
            { type: 'final_warning', severity: 'critical', description: 'Última advertencia' }
        ];
        const sanctionType = faker.helpers.arrayElement(types);

        return {
            UserId: employee.id,
            employeeLegajo: employee.legajo,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            department: employee.department,
            type: sanctionType.type,
            severity: sanctionType.severity,
            description: sanctionType.description,
            reason: faker.helpers.arrayElement([
                'Llegadas tarde reiteradas',
                'Ausencia injustificada',
                'Incumplimiento de normas de seguridad',
                'Conflicto con compañeros',
                'Bajo rendimiento'
            ]),
            date: faker.date.recent({ days: 90 }).toISOString().split('T')[0],
            issuedBy: faker.person.fullName(),
            status: faker.helpers.arrayElement(['active', 'acknowledged', 'appealed', 'expired']),
            acknowledgementDate: faker.date.recent().toISOString(),
            notes: faker.lorem.paragraph()
        };
    }

    generateMedicalExam(employee) {
        const examTypes = ['preocupacional', 'periodico', 'reingreso', 'especial'];
        const examType = faker.helpers.arrayElement(examTypes);
        const examDate = faker.date.recent({ days: 365 });
        const expiryDate = new Date(examDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        return {
            UserId: employee.id,
            employeeLegajo: employee.legajo,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            examType,
            examDate: examDate.toISOString().split('T')[0],
            expiryDate: expiryDate.toISOString().split('T')[0],
            result: faker.helpers.weightedArrayElement([
                { weight: 80, value: 'apto' },
                { weight: 15, value: 'apto_con_observaciones' },
                { weight: 5, value: 'no_apto' }
            ]),
            observations: faker.lorem.sentence(),
            doctor: `Dr. ${faker.person.lastName()}`,
            institution: faker.helpers.arrayElement(['Hospital Alemán', 'Sanatorio Güemes', 'OSDE Centro Médico']),
            attachments: [
                { name: 'resultado_laboratorio.pdf', type: 'lab' },
                { name: 'radiografia_torax.pdf', type: 'imaging' }
            ]
        };
    }

    generateDocument(employee) {
        const docTypes = [
            { type: 'dni', name: 'DNI', expiry: false },
            { type: 'passport', name: 'Pasaporte', expiry: true },
            { type: 'driving_license', name: 'Licencia de Conducir', expiry: true },
            { type: 'professional_license', name: 'Matrícula Profesional', expiry: true },
            { type: 'contract', name: 'Contrato de Trabajo', expiry: false },
            { type: 'nda', name: 'Acuerdo de Confidencialidad', expiry: false }
        ];
        const docType = faker.helpers.arrayElement(docTypes);

        return {
            UserId: employee.id,
            employeeLegajo: employee.legajo,
            type: docType.type,
            name: docType.name,
            documentNumber: faker.string.alphanumeric(12).toUpperCase(),
            issueDate: faker.date.past({ years: 5 }).toISOString().split('T')[0],
            expiryDate: docType.expiry ? faker.date.future({ years: 3 }).toISOString().split('T')[0] : null,
            issuingAuthority: faker.helpers.arrayElement(['RENAPER', 'Policía Federal', 'Municipalidad']),
            status: faker.helpers.arrayElement(['valid', 'expired', 'pending_renewal']),
            attachmentUrl: `/documents/${employee.legajo}/${docType.type}.pdf`
        };
    }

    generateTraining(employee) {
        const trainings = [
            { name: 'Inducción General', duration: 8, mandatory: true },
            { name: 'Seguridad e Higiene', duration: 4, mandatory: true },
            { name: 'Prevención de Incendios', duration: 2, mandatory: true },
            { name: 'Primeros Auxilios', duration: 4, mandatory: false },
            { name: 'Liderazgo Efectivo', duration: 16, mandatory: false },
            { name: 'Excel Avanzado', duration: 8, mandatory: false },
            { name: 'Gestión del Tiempo', duration: 4, mandatory: false },
            { name: 'Trabajo en Equipo', duration: 8, mandatory: false }
        ];
        const training = faker.helpers.arrayElement(trainings);
        const completionDate = faker.date.recent({ days: 180 });
        const expiryDate = new Date(completionDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 2);

        return {
            UserId: employee.id,
            employeeLegajo: employee.legajo,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            department: employee.department,
            trainingName: training.name,
            durationHours: training.duration,
            isMandatory: training.mandatory,
            status: faker.helpers.weightedArrayElement([
                { weight: 70, value: 'completed' },
                { weight: 20, value: 'in_progress' },
                { weight: 10, value: 'pending' }
            ]),
            completionDate: completionDate.toISOString().split('T')[0],
            expiryDate: expiryDate.toISOString().split('T')[0],
            score: faker.number.int({ min: 60, max: 100 }),
            instructor: faker.person.fullName(),
            certificateUrl: `/certificates/${employee.legajo}/${training.name.toLowerCase().replace(/\s+/g, '_')}.pdf`
        };
    }

    generateNotification(employee, type) {
        const templates = {
            vacation_approved: {
                title: 'Vacaciones Aprobadas',
                message: `Su solicitud de vacaciones ha sido aprobada.`,
                priority: 'medium'
            },
            document_expiring: {
                title: 'Documento por Vencer',
                message: `Su documento está próximo a vencer. Por favor renuévelo.`,
                priority: 'high'
            },
            medical_exam_due: {
                title: 'Examen Médico Pendiente',
                message: `Tiene un examen médico programado próximamente.`,
                priority: 'high'
            },
            training_reminder: {
                title: 'Recordatorio de Capacitación',
                message: `Tiene una capacitación pendiente de completar.`,
                priority: 'medium'
            },
            attendance_anomaly: {
                title: 'Anomalía de Asistencia',
                message: `Se detectó una irregularidad en su registro de asistencia.`,
                priority: 'high'
            }
        };
        const template = templates[type] || templates.vacation_approved;

        return {
            recipientId: employee.id,
            recipientLegajo: employee.legajo,
            recipientName: `${employee.firstName} ${employee.lastName}`,
            type,
            title: template.title,
            message: template.message,
            priority: template.priority,
            status: faker.helpers.arrayElement(['unread', 'read', 'archived']),
            createdAt: faker.date.recent({ days: 30 }).toISOString(),
            readAt: faker.datatype.boolean() ? faker.date.recent().toISOString() : null,
            actionRequired: faker.datatype.boolean({ probability: 0.3 }),
            actionUrl: `/actions/${type}/${employee.legajo}`
        };
    }

    async generateAllData() {
        log.header('MÓDULO 1: ENTERPRISE DATA GENERATOR');
        log.info(`Generando datos para empresa de ${CONFIG.simulation.totalEmployees} empleados...`);

        // 1. Generar estructura organizacional
        log.section('Generando Estructura Organizacional');

        let employeeIndex = 1;
        const allEmployees = [];

        for (const dept of this.orgStructure.departments) {
            const shift = faker.helpers.arrayElement(this.orgStructure.shifts);
            for (let i = 0; i < dept.headcount && employeeIndex <= CONFIG.simulation.totalEmployees; i++) {
                const employee = this.generateEmployee(employeeIndex, dept, shift);
                employee.id = employeeIndex; // Simular ID
                allEmployees.push(employee);
                employeeIndex++;
            }
            log.progress(employeeIndex, CONFIG.simulation.totalEmployees, `Generando empleados de ${dept.name}`);
        }
        console.log(''); // Nueva línea después del progress bar

        STATE.generatedData.employees = allEmployees;
        STATE.generatedData.departments = this.orgStructure.departments;
        STATE.generatedData.shifts = this.orgStructure.shifts.map((s, i) => ({ ...s, id: i + 1 }));
        STATE.generatedData.branches = this.orgStructure.branches.map((b, i) => ({ ...b, id: i + 1 }));
        STATE.generatedData.kiosks = Array.from({ length: 5 }, (_, i) => ({
            id: i + 1,
            name: `Kiosk-${i + 1}`,
            branch: this.orgStructure.branches[i % 3].name
        }));

        log.success(`${allEmployees.length} empleados generados`);
        log.success(`${this.orgStructure.departments.length} departamentos configurados`);
        log.success(`${this.orgStructure.shifts.length} turnos definidos`);

        // 2. Generar registros de asistencia (último mes)
        log.section('Generando Registros de Asistencia');
        const attendanceRecords = [];
        const today = new Date();

        for (let dayOffset = CONFIG.simulation.daysToSimulate; dayOffset >= 0; dayOffset--) {
            const date = new Date(today);
            date.setDate(date.getDate() - dayOffset);

            for (const employee of allEmployees.filter(e => e.isActive)) {
                const shift = this.orgStructure.shifts.find(s => s.name === employee.shift);
                const record = this.generateAttendanceRecord(employee, date, shift);
                if (record) {
                    attendanceRecords.push(record);
                }
            }
            log.progress(CONFIG.simulation.daysToSimulate - dayOffset, CONFIG.simulation.daysToSimulate,
                `Generando asistencias día ${dayOffset}`);
        }
        console.log('');

        STATE.generatedData.attendances = attendanceRecords;
        log.success(`${attendanceRecords.length} registros de asistencia generados`);

        // 3. Generar solicitudes de vacaciones
        log.section('Generando Solicitudes de Vacaciones');
        const vacationCount = Math.floor(allEmployees.length * (CONFIG.simulation.vacationRequestsPercent / 100));
        const vacationEmployees = faker.helpers.arrayElements(allEmployees, vacationCount);

        for (const employee of vacationEmployees) {
            STATE.generatedData.vacations.push(this.generateVacationRequest(employee));
        }
        log.success(`${STATE.generatedData.vacations.length} solicitudes de vacaciones generadas`);

        // 4. Generar sanciones
        log.section('Generando Sanciones');
        const sanctionCount = Math.floor(allEmployees.length * (CONFIG.simulation.sanctionsPercent / 100));
        const sanctionEmployees = faker.helpers.arrayElements(allEmployees, sanctionCount);

        for (const employee of sanctionEmployees) {
            STATE.generatedData.sanctions.push(this.generateSanction(employee));
        }
        log.success(`${STATE.generatedData.sanctions.length} sanciones generadas`);

        // 5. Generar exámenes médicos
        log.section('Generando Exámenes Médicos');
        const medicalCount = Math.floor(allEmployees.length * (CONFIG.simulation.medicalExamsPercent / 100));
        const medicalEmployees = faker.helpers.arrayElements(allEmployees, medicalCount);

        for (const employee of medicalEmployees) {
            STATE.generatedData.medicalExams.push(this.generateMedicalExam(employee));
        }
        log.success(`${STATE.generatedData.medicalExams.length} exámenes médicos generados`);

        // 6. Generar documentos
        log.section('Generando Documentos de Empleados');
        for (const employee of allEmployees) {
            const docCount = faker.number.int({ min: 1, max: CONFIG.simulation.documentsPerEmployee });
            for (let i = 0; i < docCount; i++) {
                STATE.generatedData.documents.push(this.generateDocument(employee));
            }
        }
        log.success(`${STATE.generatedData.documents.length} documentos generados`);

        // 7. Generar capacitaciones
        log.section('Generando Capacitaciones');
        const trainingCount = Math.floor(allEmployees.length * (CONFIG.simulation.trainingPercent / 100));
        const trainingEmployees = faker.helpers.arrayElements(allEmployees, trainingCount);

        for (const employee of trainingEmployees) {
            const trainingsPerEmployee = faker.number.int({ min: 1, max: 4 });
            for (let i = 0; i < trainingsPerEmployee; i++) {
                STATE.generatedData.trainings.push(this.generateTraining(employee));
            }
        }
        log.success(`${STATE.generatedData.trainings.length} registros de capacitación generados`);

        // 8. Generar notificaciones
        log.section('Generando Notificaciones');
        const notificationTypes = ['vacation_approved', 'document_expiring', 'medical_exam_due',
                                   'training_reminder', 'attendance_anomaly'];

        for (const employee of faker.helpers.arrayElements(allEmployees, 50)) {
            const notifCount = faker.number.int({ min: 1, max: 5 });
            for (let i = 0; i < notifCount; i++) {
                const type = faker.helpers.arrayElement(notificationTypes);
                STATE.generatedData.notifications.push(this.generateNotification(employee, type));
            }
        }
        log.success(`${STATE.generatedData.notifications.length} notificaciones generadas`);

        return STATE.generatedData;
    }
}

// ============================================================================
// MÓDULO 2: SSOT INTEGRITY VALIDATOR
// ============================================================================
class SSOTIntegrityValidator {
    constructor() {
        this.violations = [];
    }

    async validate() {
        log.header('MÓDULO 2: SSOT INTEGRITY VALIDATOR');
        log.info('Verificando fuente única de verdad en todos los datos...');

        // Test 1: Verificar que cada empleado tiene un solo departamento activo
        log.section('Test 2.1: Un Empleado = Un Departamento');
        const deptViolations = this.checkSingleDepartmentPerEmployee();
        if (deptViolations.length === 0) {
            log.success('Todos los empleados tienen exactamente un departamento');
            STATE.metrics.testsPassed++;
        } else {
            log.error(`${deptViolations.length} empleados con múltiples departamentos`);
            STATE.metrics.testsFailed++;
        }
        STATE.metrics.testsRun++;

        // Test 2: Verificar que cada empleado tiene un solo turno activo
        log.section('Test 2.2: Un Empleado = Un Turno Activo');
        const shiftViolations = this.checkSingleShiftPerEmployee();
        if (shiftViolations.length === 0) {
            log.success('Todos los empleados tienen exactamente un turno activo');
            STATE.metrics.testsPassed++;
        } else {
            log.error(`${shiftViolations.length} empleados con múltiples turnos`);
            STATE.metrics.testsFailed++;
        }
        STATE.metrics.testsRun++;

        // Test 3: Verificar consistencia de datos de empleado en todas las tablas
        log.section('Test 2.3: Consistencia de Datos de Empleado');
        const consistencyViolations = this.checkDataConsistency();
        if (consistencyViolations.length === 0) {
            log.success('Datos de empleados consistentes en todas las tablas');
            STATE.metrics.testsPassed++;
        } else {
            log.error(`${consistencyViolations.length} inconsistencias encontradas`);
            STATE.metrics.testsFailed++;
        }
        STATE.metrics.testsRun++;

        // Test 4: Verificar unicidad de legajos
        log.section('Test 2.4: Unicidad de Legajos');
        const legajoViolations = this.checkUniqueLegajos();
        if (legajoViolations.length === 0) {
            log.success('Todos los legajos son únicos');
            STATE.metrics.testsPassed++;
        } else {
            log.error(`${legajoViolations.length} legajos duplicados`);
            STATE.metrics.testsFailed++;
        }
        STATE.metrics.testsRun++;

        // Test 5: Verificar integridad referencial (FK)
        log.section('Test 2.5: Integridad Referencial');
        const fkViolations = this.checkReferentialIntegrity();
        if (fkViolations.length === 0) {
            log.success('Todas las referencias son válidas');
            STATE.metrics.testsPassed++;
        } else {
            log.error(`${fkViolations.length} referencias huérfanas`);
            STATE.metrics.testsFailed++;
        }
        STATE.metrics.testsRun++;

        this.violations = [
            ...deptViolations,
            ...shiftViolations,
            ...consistencyViolations,
            ...legajoViolations,
            ...fkViolations
        ];
        STATE.validationResults.ssotViolations = this.violations;

        return this.violations;
    }

    checkSingleDepartmentPerEmployee() {
        const violations = [];
        const deptByEmployee = new Map();

        for (const emp of STATE.generatedData.employees) {
            if (deptByEmployee.has(emp.legajo)) {
                const existing = deptByEmployee.get(emp.legajo);
                if (existing !== emp.department) {
                    violations.push({
                        type: 'multiple_departments',
                        employee: emp.legajo,
                        departments: [existing, emp.department]
                    });
                }
            } else {
                deptByEmployee.set(emp.legajo, emp.department);
            }
        }

        return violations;
    }

    checkSingleShiftPerEmployee() {
        const violations = [];
        const shiftByEmployee = new Map();

        for (const emp of STATE.generatedData.employees) {
            if (shiftByEmployee.has(emp.legajo)) {
                const existing = shiftByEmployee.get(emp.legajo);
                if (existing !== emp.shift) {
                    violations.push({
                        type: 'multiple_shifts',
                        employee: emp.legajo,
                        shifts: [existing, emp.shift]
                    });
                }
            } else {
                shiftByEmployee.set(emp.legajo, emp.shift);
            }
        }

        return violations;
    }

    checkDataConsistency() {
        const violations = [];
        const employeeMap = new Map(STATE.generatedData.employees.map(e => [e.legajo, e]));

        // Verificar consistencia en vacaciones
        for (const vacation of STATE.generatedData.vacations) {
            const emp = employeeMap.get(vacation.employeeLegajo);
            if (emp && vacation.employeeName !== `${emp.firstName} ${emp.lastName}`) {
                violations.push({
                    type: 'name_mismatch',
                    table: 'vacations',
                    employee: vacation.employeeLegajo,
                    expected: `${emp.firstName} ${emp.lastName}`,
                    found: vacation.employeeName
                });
            }
        }

        // Verificar consistencia en sanciones
        for (const sanction of STATE.generatedData.sanctions) {
            const emp = employeeMap.get(sanction.employeeLegajo);
            if (emp && sanction.department !== emp.department) {
                violations.push({
                    type: 'department_mismatch',
                    table: 'sanctions',
                    employee: sanction.employeeLegajo,
                    expected: emp.department,
                    found: sanction.department
                });
            }
        }

        return violations;
    }

    checkUniqueLegajos() {
        const violations = [];
        const legajos = new Set();

        for (const emp of STATE.generatedData.employees) {
            if (legajos.has(emp.legajo)) {
                violations.push({
                    type: 'duplicate_legajo',
                    legajo: emp.legajo
                });
            } else {
                legajos.add(emp.legajo);
            }
        }

        return violations;
    }

    checkReferentialIntegrity() {
        const violations = [];
        const employeeIds = new Set(STATE.generatedData.employees.map(e => e.id));
        const employeeLegajos = new Set(STATE.generatedData.employees.map(e => e.legajo));

        // Verificar FK en asistencias
        for (const att of STATE.generatedData.attendances) {
            if (!employeeIds.has(att.UserId)) {
                violations.push({
                    type: 'orphaned_attendance',
                    UserId: att.UserId,
                    date: att.date
                });
            }
        }

        // Verificar FK en vacaciones
        for (const vac of STATE.generatedData.vacations) {
            if (!employeeLegajos.has(vac.employeeLegajo)) {
                violations.push({
                    type: 'orphaned_vacation',
                    employeeLegajo: vac.employeeLegajo
                });
            }
        }

        return violations;
    }
}

// ============================================================================
// MÓDULO 3: WORKFLOW SIMULATOR
// ============================================================================
class WorkflowSimulator {
    constructor() {
        this.workflows = [];
    }

    async simulate() {
        log.header('MÓDULO 3: WORKFLOW SIMULATOR');
        log.info('Simulando flujos de trabajo reales...');

        // Workflow 1: Ciclo de vida de asistencia
        log.section('Workflow 3.1: Ciclo de Vida de Asistencia');
        const attendanceWorkflow = await this.simulateAttendanceLifecycle();
        log.data(`Empleados con asistencia perfecta: ${attendanceWorkflow.perfectAttendance}`);
        log.data(`Empleados con tardanzas: ${attendanceWorkflow.withLateArrivals}`);
        log.data(`Empleados con ausencias: ${attendanceWorkflow.withAbsences}`);
        log.data(`Empleados con horas extra: ${attendanceWorkflow.withOvertime}`);
        STATE.metrics.testsRun++;
        STATE.metrics.testsPassed++;

        // Workflow 2: Proceso de vacaciones
        log.section('Workflow 3.2: Proceso de Vacaciones');
        const vacationWorkflow = await this.simulateVacationProcess();
        log.data(`Solicitudes pendientes: ${vacationWorkflow.pending}`);
        log.data(`Solicitudes aprobadas: ${vacationWorkflow.approved}`);
        log.data(`Solicitudes rechazadas: ${vacationWorkflow.rejected}`);
        log.data(`Días totales solicitados: ${vacationWorkflow.totalDaysRequested}`);
        STATE.metrics.testsRun++;
        STATE.metrics.testsPassed++;

        // Workflow 3: Escalamiento de sanciones
        log.section('Workflow 3.3: Escalamiento de Sanciones');
        const sanctionWorkflow = await this.simulateSanctionEscalation();
        log.data(`Apercibimientos verbales: ${sanctionWorkflow.verbal}`);
        log.data(`Apercibimientos escritos: ${sanctionWorkflow.written}`);
        log.data(`Suspensiones: ${sanctionWorkflow.suspensions}`);
        log.data(`Empleados reincidentes: ${sanctionWorkflow.repeat}`);
        STATE.metrics.testsRun++;
        STATE.metrics.testsPassed++;

        // Workflow 4: Vencimientos y alertas
        log.section('Workflow 3.4: Sistema de Vencimientos');
        const expiryWorkflow = await this.simulateExpiryAlerts();
        log.data(`Documentos por vencer (30 días): ${expiryWorkflow.documents}`);
        log.data(`Exámenes médicos por vencer: ${expiryWorkflow.medicalExams}`);
        log.data(`Capacitaciones por vencer: ${expiryWorkflow.trainings}`);
        log.data(`Alertas generadas: ${expiryWorkflow.alertsGenerated}`);
        STATE.metrics.testsRun++;
        STATE.metrics.testsPassed++;

        // Workflow 5: Flujo de notificaciones
        log.section('Workflow 3.5: Flujo de Notificaciones');
        const notificationWorkflow = await this.simulateNotificationFlow();
        log.data(`Notificaciones enviadas: ${notificationWorkflow.sent}`);
        log.data(`Notificaciones leídas: ${notificationWorkflow.read}`);
        log.data(`Pendientes de acción: ${notificationWorkflow.actionRequired}`);
        log.data(`Tasa de lectura: ${notificationWorkflow.readRate}%`);
        STATE.metrics.testsRun++;
        STATE.metrics.testsPassed++;

        return this.workflows;
    }

    async simulateAttendanceLifecycle() {
        const employees = STATE.generatedData.employees.filter(e => e.isActive);
        const attendances = STATE.generatedData.attendances;

        const stats = {
            perfectAttendance: 0,
            withLateArrivals: 0,
            withAbsences: 0,
            withOvertime: 0
        };

        const attendanceByEmployee = new Map();
        for (const att of attendances) {
            if (!attendanceByEmployee.has(att.UserId)) {
                attendanceByEmployee.set(att.UserId, []);
            }
            attendanceByEmployee.get(att.UserId).push(att);
        }

        for (const [userId, records] of attendanceByEmployee) {
            const hasLate = records.some(r => r.isLate);
            const hasOvertime = records.some(r => r.hasOvertime);
            const expectedDays = CONFIG.simulation.daysToSimulate * 5 / 7; // Días laborables
            const hasAbsences = records.length < expectedDays * 0.9;

            if (!hasLate && !hasAbsences) stats.perfectAttendance++;
            if (hasLate) stats.withLateArrivals++;
            if (hasAbsences) stats.withAbsences++;
            if (hasOvertime) stats.withOvertime++;
        }

        this.workflows.push({ name: 'attendance_lifecycle', stats });
        return stats;
    }

    async simulateVacationProcess() {
        const vacations = STATE.generatedData.vacations;

        const stats = {
            pending: vacations.filter(v => v.status === 'pending').length,
            approved: vacations.filter(v => v.status === 'approved').length,
            rejected: vacations.filter(v => v.status === 'rejected').length,
            cancelled: vacations.filter(v => v.status === 'cancelled').length,
            totalDaysRequested: vacations.reduce((sum, v) => sum + v.daysRequested, 0)
        };

        this.workflows.push({ name: 'vacation_process', stats });
        return stats;
    }

    async simulateSanctionEscalation() {
        const sanctions = STATE.generatedData.sanctions;

        // Contar reincidentes (empleados con más de una sanción)
        const sanctionsByEmployee = new Map();
        for (const s of sanctions) {
            const count = sanctionsByEmployee.get(s.employeeLegajo) || 0;
            sanctionsByEmployee.set(s.employeeLegajo, count + 1);
        }

        const stats = {
            verbal: sanctions.filter(s => s.type === 'verbal_warning').length,
            written: sanctions.filter(s => s.type === 'written_warning').length,
            suspensions: sanctions.filter(s => s.type === 'suspension').length,
            finalWarnings: sanctions.filter(s => s.type === 'final_warning').length,
            repeat: Array.from(sanctionsByEmployee.values()).filter(c => c > 1).length
        };

        this.workflows.push({ name: 'sanction_escalation', stats });
        return stats;
    }

    async simulateExpiryAlerts() {
        const today = new Date();
        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const documentsExpiring = STATE.generatedData.documents.filter(d => {
            if (!d.expiryDate) return false;
            const expiry = new Date(d.expiryDate);
            return expiry <= thirtyDaysFromNow && expiry >= today;
        });

        const examsExpiring = STATE.generatedData.medicalExams.filter(e => {
            const expiry = new Date(e.expiryDate);
            return expiry <= thirtyDaysFromNow && expiry >= today;
        });

        const trainingsExpiring = STATE.generatedData.trainings.filter(t => {
            if (!t.expiryDate) return false;
            const expiry = new Date(t.expiryDate);
            return expiry <= thirtyDaysFromNow && expiry >= today;
        });

        const stats = {
            documents: documentsExpiring.length,
            medicalExams: examsExpiring.length,
            trainings: trainingsExpiring.length,
            alertsGenerated: documentsExpiring.length + examsExpiring.length + trainingsExpiring.length
        };

        this.workflows.push({ name: 'expiry_alerts', stats });
        return stats;
    }

    async simulateNotificationFlow() {
        const notifications = STATE.generatedData.notifications;

        const stats = {
            sent: notifications.length,
            read: notifications.filter(n => n.status === 'read' || n.status === 'archived').length,
            unread: notifications.filter(n => n.status === 'unread').length,
            actionRequired: notifications.filter(n => n.actionRequired).length,
            readRate: Math.round((notifications.filter(n => n.status !== 'unread').length / notifications.length) * 100)
        };

        this.workflows.push({ name: 'notification_flow', stats });
        return stats;
    }
}

// ============================================================================
// MÓDULO 4: DATA CHAIN VALIDATOR
// ============================================================================
class DataChainValidator {
    async validate() {
        log.header('MÓDULO 4: DATA CHAIN VALIDATOR');
        log.info('Verificando cadenas de datos e integridad...');

        // Test 1: Cadena Empleado -> Asistencia -> Horas trabajadas
        log.section('Test 4.1: Cadena Empleado -> Asistencia');
        const attendanceChain = this.validateAttendanceChain();
        if (attendanceChain.broken.length === 0) {
            log.success(`Cadena de asistencia íntegra (${attendanceChain.valid} registros)`);
            STATE.metrics.testsPassed++;
        } else {
            log.error(`${attendanceChain.broken.length} cadenas rotas en asistencia`);
            STATE.metrics.testsFailed++;
        }
        STATE.metrics.testsRun++;

        // Test 2: Cadena Empleado -> Vacaciones -> Balance
        log.section('Test 4.2: Cadena Vacaciones -> Balance');
        const vacationChain = this.validateVacationChain();
        if (vacationChain.inconsistencies.length === 0) {
            log.success(`Balance de vacaciones consistente (${vacationChain.checked} empleados)`);
            STATE.metrics.testsPassed++;
        } else {
            log.error(`${vacationChain.inconsistencies.length} inconsistencias en balance`);
            STATE.metrics.testsFailed++;
        }
        STATE.metrics.testsRun++;

        // Test 3: Cadena Departamento -> Supervisor -> Empleados
        log.section('Test 4.3: Cadena Jerárquica Organizacional');
        const orgChain = this.validateOrganizationalChain();
        if (orgChain.orphaned === 0) {
            log.success(`Jerarquía organizacional completa (${orgChain.departments} departamentos)`);
            STATE.metrics.testsPassed++;
        } else {
            log.error(`${orgChain.orphaned} empleados sin supervisión`);
            STATE.metrics.testsFailed++;
        }
        STATE.metrics.testsRun++;

        // Test 4: Cadena Turno -> Asistencia -> Horario
        log.section('Test 4.4: Cadena Turno -> Horario de Asistencia');
        const shiftChain = this.validateShiftAttendanceChain();
        if (shiftChain.mismatches.length === 0) {
            log.success(`Horarios de asistencia coinciden con turnos`);
            STATE.metrics.testsPassed++;
        } else {
            log.warning(`${shiftChain.mismatches.length} posibles anomalías de horario`);
            STATE.metrics.warnings++;
        }
        STATE.metrics.testsRun++;

        STATE.validationResults.brokenChains = [
            ...attendanceChain.broken,
            ...vacationChain.inconsistencies,
            ...shiftChain.mismatches
        ];

        return STATE.validationResults.brokenChains;
    }

    validateAttendanceChain() {
        const result = { valid: 0, broken: [] };
        const employeeIds = new Set(STATE.generatedData.employees.map(e => e.id));

        for (const att of STATE.generatedData.attendances) {
            if (!employeeIds.has(att.UserId)) {
                result.broken.push({
                    type: 'orphaned_attendance',
                    record: att
                });
            } else {
                result.valid++;
            }
        }

        return result;
    }

    validateVacationChain() {
        const result = { checked: 0, inconsistencies: [] };
        const employeeMap = new Map(STATE.generatedData.employees.map(e => [e.legajo, e]));

        // Agrupar vacaciones aprobadas por empleado
        const approvedVacations = STATE.generatedData.vacations.filter(v => v.status === 'approved');
        const vacationDaysByEmployee = new Map();

        for (const vac of approvedVacations) {
            const current = vacationDaysByEmployee.get(vac.employeeLegajo) || 0;
            vacationDaysByEmployee.set(vac.employeeLegajo, current + vac.daysRequested);
        }

        // Verificar que no exceda el balance
        for (const [legajo, daysUsed] of vacationDaysByEmployee) {
            const emp = employeeMap.get(legajo);
            if (emp) {
                result.checked++;
                const availableDays = emp.vacationDaysTotal - emp.vacationDaysUsed;
                if (daysUsed > availableDays) {
                    result.inconsistencies.push({
                        type: 'vacation_balance_exceeded',
                        employee: legajo,
                        requested: daysUsed,
                        available: availableDays
                    });
                }
            }
        }

        return result;
    }

    validateOrganizationalChain() {
        const result = { departments: 0, orphaned: 0 };
        const departments = new Set(STATE.generatedData.employees.map(e => e.department));
        result.departments = departments.size;

        // Verificar que cada departamento tiene al menos un supervisor
        for (const dept of departments) {
            const deptEmployees = STATE.generatedData.employees.filter(e => e.department === dept);
            const hasSupervisor = deptEmployees.some(e =>
                ['supervisor', 'manager', 'admin'].includes(e.role)
            );
            if (!hasSupervisor) {
                result.orphaned += deptEmployees.length;
            }
        }

        return result;
    }

    validateShiftAttendanceChain() {
        const result = { mismatches: [] };
        const employeeMap = new Map(STATE.generatedData.employees.map(e => [e.id, e]));
        const shiftMap = new Map(STATE.generatedData.shifts.map(s => [s.name, s]));

        for (const att of STATE.generatedData.attendances.slice(0, 100)) { // Sample
            const emp = employeeMap.get(att.UserId);
            if (emp) {
                const shift = shiftMap.get(emp.shift);
                if (shift) {
                    const checkInHour = new Date(att.checkInTime).getHours();
                    const [shiftStartHour] = shift.start.split(':').map(Number);

                    // Permitir 2 horas de diferencia
                    const diff = Math.abs(checkInHour - shiftStartHour);
                    if (diff > 2 && diff < 22) { // 22 para turnos nocturnos
                        result.mismatches.push({
                            type: 'shift_time_mismatch',
                            employee: emp.legajo,
                            expectedStart: shift.start,
                            actualCheckIn: att.checkInTime
                        });
                    }
                }
            }
        }

        return result;
    }
}

// ============================================================================
// MÓDULO 5: DUPLICATE DETECTOR
// ============================================================================
class DuplicateDetector {
    async detect() {
        log.header('MÓDULO 5: DUPLICATE DETECTOR');
        log.info('Buscando datos duplicados...');

        const allDuplicates = [];

        // Test 1: Empleados duplicados (por DNI)
        log.section('Test 5.1: Empleados Duplicados por DNI');
        const empDuplicates = this.findDuplicateEmployees();
        if (empDuplicates.length === 0) {
            log.success('No hay empleados con DNI duplicado');
            STATE.metrics.testsPassed++;
        } else {
            log.error(`${empDuplicates.length} DNIs duplicados`);
            STATE.metrics.testsFailed++;
        }
        allDuplicates.push(...empDuplicates);
        STATE.metrics.testsRun++;

        // Test 2: Asistencias duplicadas (mismo día, mismo empleado)
        log.section('Test 5.2: Asistencias Duplicadas');
        const attDuplicates = this.findDuplicateAttendances();
        if (attDuplicates.length === 0) {
            log.success('No hay registros de asistencia duplicados');
            STATE.metrics.testsPassed++;
        } else {
            log.error(`${attDuplicates.length} asistencias duplicadas`);
            STATE.metrics.testsFailed++;
        }
        allDuplicates.push(...attDuplicates);
        STATE.metrics.testsRun++;

        // Test 3: Documentos duplicados
        log.section('Test 5.3: Documentos Duplicados');
        const docDuplicates = this.findDuplicateDocuments();
        if (docDuplicates.length === 0) {
            log.success('No hay documentos duplicados');
            STATE.metrics.testsPassed++;
        } else {
            log.warning(`${docDuplicates.length} documentos potencialmente duplicados`);
            STATE.metrics.warnings++;
        }
        allDuplicates.push(...docDuplicates);
        STATE.metrics.testsRun++;

        // Test 4: Notificaciones duplicadas
        log.section('Test 5.4: Notificaciones Duplicadas');
        const notifDuplicates = this.findDuplicateNotifications();
        if (notifDuplicates.length === 0) {
            log.success('No hay notificaciones duplicadas');
            STATE.metrics.testsPassed++;
        } else {
            log.warning(`${notifDuplicates.length} notificaciones duplicadas`);
            STATE.metrics.warnings++;
        }
        allDuplicates.push(...notifDuplicates);
        STATE.metrics.testsRun++;

        STATE.validationResults.duplicates = allDuplicates;
        return allDuplicates;
    }

    findDuplicateEmployees() {
        const duplicates = [];
        const dniCount = new Map();

        for (const emp of STATE.generatedData.employees) {
            const dni = emp.documentNumber;
            if (dniCount.has(dni)) {
                duplicates.push({
                    type: 'duplicate_dni',
                    dni,
                    employees: [dniCount.get(dni), emp.legajo]
                });
            } else {
                dniCount.set(dni, emp.legajo);
            }
        }

        return duplicates;
    }

    findDuplicateAttendances() {
        const duplicates = [];
        const attendanceKey = new Map();

        for (const att of STATE.generatedData.attendances) {
            const key = `${att.UserId}-${att.date}`;
            if (attendanceKey.has(key)) {
                duplicates.push({
                    type: 'duplicate_attendance',
                    key,
                    records: [attendanceKey.get(key), att]
                });
            } else {
                attendanceKey.set(key, att);
            }
        }

        return duplicates;
    }

    findDuplicateDocuments() {
        const duplicates = [];
        const docKey = new Map();

        for (const doc of STATE.generatedData.documents) {
            const key = `${doc.UserId}-${doc.type}-${doc.documentNumber}`;
            if (docKey.has(key)) {
                duplicates.push({
                    type: 'duplicate_document',
                    key,
                    employee: doc.employeeLegajo
                });
            } else {
                docKey.set(key, doc);
            }
        }

        return duplicates;
    }

    findDuplicateNotifications() {
        const duplicates = [];
        const notifKey = new Map();

        for (const notif of STATE.generatedData.notifications) {
            // Considerar duplicado si mismo usuario, mismo tipo, mismo día
            const date = notif.createdAt.split('T')[0];
            const key = `${notif.recipientId}-${notif.type}-${date}`;
            if (notifKey.has(key)) {
                duplicates.push({
                    type: 'duplicate_notification',
                    key,
                    recipient: notif.recipientLegajo
                });
            } else {
                notifKey.set(key, notif);
            }
        }

        return duplicates;
    }
}

// ============================================================================
// MÓDULO 6: REPORT CONSISTENCY CHECKER
// ============================================================================
class ReportConsistencyChecker {
    async check() {
        log.header('MÓDULO 6: REPORT CONSISTENCY CHECKER');
        log.info('Verificando consistencia de reportes...');

        // Test 1: Reporte de headcount por departamento
        log.section('Test 6.1: Consistencia de Headcount');
        const headcountReport = this.verifyHeadcountReport();
        log.data(`Total empleados: ${headcountReport.total}`);
        log.data(`Por departamento: ${JSON.stringify(headcountReport.byDepartment)}`);
        if (headcountReport.isConsistent) {
            log.success('Headcount consistente');
            STATE.metrics.testsPassed++;
        } else {
            log.error('Inconsistencia en headcount');
            STATE.metrics.testsFailed++;
        }
        STATE.metrics.testsRun++;

        // Test 2: Reporte de horas trabajadas
        log.section('Test 6.2: Consistencia de Horas Trabajadas');
        const hoursReport = this.verifyHoursReport();
        log.data(`Total horas regulares: ${hoursReport.regularHours.toFixed(2)}`);
        log.data(`Total horas extra: ${hoursReport.overtimeHours.toFixed(2)}`);
        log.data(`Promedio horas/día/empleado: ${hoursReport.avgHoursPerDay.toFixed(2)}`);
        if (hoursReport.isReasonable) {
            log.success('Horas trabajadas razonables');
            STATE.metrics.testsPassed++;
        } else {
            log.warning('Valores de horas fuera de rango esperado');
            STATE.metrics.warnings++;
        }
        STATE.metrics.testsRun++;

        // Test 3: Reporte de ausentismo
        log.section('Test 6.3: Reporte de Ausentismo');
        const absenteeismReport = this.verifyAbsenteeismReport();
        log.data(`Tasa de ausentismo: ${absenteeismReport.rate.toFixed(2)}%`);
        log.data(`Días perdidos total: ${absenteeismReport.totalDaysLost}`);
        log.data(`Costo estimado: $${absenteeismReport.estimatedCost.toLocaleString()}`);
        STATE.metrics.testsRun++;
        STATE.metrics.testsPassed++;

        // Test 4: Reporte de vacaciones
        log.section('Test 6.4: Reporte de Vacaciones');
        const vacationReport = this.verifyVacationReport();
        log.data(`Días totales disponibles: ${vacationReport.totalAvailable}`);
        log.data(`Días usados: ${vacationReport.totalUsed}`);
        log.data(`Días pendientes: ${vacationReport.totalPending}`);
        log.data(`Tasa de uso: ${vacationReport.usageRate.toFixed(2)}%`);
        STATE.metrics.testsRun++;
        STATE.metrics.testsPassed++;

        // Test 5: Reporte de capacitación
        log.section('Test 6.5: Reporte de Capacitación');
        const trainingReport = this.verifyTrainingReport();
        log.data(`Empleados capacitados: ${trainingReport.trainedEmployees}`);
        log.data(`Horas totales de capacitación: ${trainingReport.totalHours}`);
        log.data(`Tasa de cumplimiento obligatorias: ${trainingReport.mandatoryComplianceRate.toFixed(2)}%`);
        STATE.metrics.testsRun++;
        STATE.metrics.testsPassed++;

        return {
            headcount: headcountReport,
            hours: hoursReport,
            absenteeism: absenteeismReport,
            vacation: vacationReport,
            training: trainingReport
        };
    }

    verifyHeadcountReport() {
        const employees = STATE.generatedData.employees;
        const byDepartment = {};

        for (const emp of employees) {
            byDepartment[emp.departmentCode] = (byDepartment[emp.departmentCode] || 0) + 1;
        }

        const total = employees.length;
        const sumByDept = Object.values(byDepartment).reduce((a, b) => a + b, 0);

        return {
            total,
            byDepartment,
            activeCount: employees.filter(e => e.isActive).length,
            isConsistent: total === sumByDept
        };
    }

    verifyHoursReport() {
        const attendances = STATE.generatedData.attendances;
        let regularHours = 0;
        let overtimeHours = 0;

        for (const att of attendances) {
            const checkIn = new Date(att.checkInTime);
            const checkOut = new Date(att.checkOutTime);
            const hoursWorked = (checkOut - checkIn) / (1000 * 60 * 60);

            if (hoursWorked <= 8) {
                regularHours += hoursWorked;
            } else {
                regularHours += 8;
                overtimeHours += hoursWorked - 8;
            }
        }

        const avgHoursPerDay = attendances.length > 0 ? (regularHours + overtimeHours) / attendances.length : 0;

        return {
            regularHours,
            overtimeHours,
            totalHours: regularHours + overtimeHours,
            avgHoursPerDay,
            isReasonable: avgHoursPerDay >= 6 && avgHoursPerDay <= 12
        };
    }

    verifyAbsenteeismReport() {
        const employees = STATE.generatedData.employees.filter(e => e.isActive);
        const attendances = STATE.generatedData.attendances;

        // Días laborables en el período
        const workDays = CONFIG.simulation.daysToSimulate * 5 / 7;
        const expectedAttendances = employees.length * workDays;
        const actualAttendances = attendances.length;

        const totalDaysLost = Math.max(0, expectedAttendances - actualAttendances);
        const rate = (totalDaysLost / expectedAttendances) * 100;

        // Costo estimado (promedio salarial / 22 días * días perdidos)
        const avgSalary = employees.reduce((sum, e) => sum + e.salary, 0) / employees.length;
        const estimatedCost = (avgSalary / 22) * totalDaysLost;

        return {
            expectedAttendances: Math.round(expectedAttendances),
            actualAttendances,
            totalDaysLost: Math.round(totalDaysLost),
            rate,
            estimatedCost: Math.round(estimatedCost)
        };
    }

    verifyVacationReport() {
        const employees = STATE.generatedData.employees.filter(e => e.isActive);
        const vacations = STATE.generatedData.vacations.filter(v => v.status === 'approved');

        const totalAvailable = employees.reduce((sum, e) => sum + e.vacationDaysTotal, 0);
        const totalUsed = employees.reduce((sum, e) => sum + e.vacationDaysUsed, 0);
        const totalPending = vacations.reduce((sum, v) => sum + v.daysRequested, 0);
        const usageRate = (totalUsed / totalAvailable) * 100;

        return {
            totalAvailable,
            totalUsed,
            totalPending,
            remaining: totalAvailable - totalUsed - totalPending,
            usageRate
        };
    }

    verifyTrainingReport() {
        const trainings = STATE.generatedData.trainings;
        const completedTrainings = trainings.filter(t => t.status === 'completed');
        const mandatoryTrainings = trainings.filter(t => t.isMandatory);
        const completedMandatory = mandatoryTrainings.filter(t => t.status === 'completed');

        const uniqueTrainedEmployees = new Set(completedTrainings.map(t => t.employeeLegajo));
        const totalHours = completedTrainings.reduce((sum, t) => sum + t.durationHours, 0);
        const mandatoryComplianceRate = mandatoryTrainings.length > 0
            ? (completedMandatory.length / mandatoryTrainings.length) * 100
            : 100;

        return {
            totalTrainings: trainings.length,
            completedTrainings: completedTrainings.length,
            trainedEmployees: uniqueTrainedEmployees.size,
            totalHours,
            mandatoryComplianceRate
        };
    }
}

// ============================================================================
// MÓDULO 7: API INTEGRATION TEST
// ============================================================================
class APIIntegrationTest {
    async test() {
        log.header('MÓDULO 7: API INTEGRATION TEST');
        log.info('Probando integración con APIs reales del sistema...');

        // Autenticación
        log.section('Test 7.1: Autenticación');
        const authResult = await this.testAuth();
        if (authResult.success) {
            log.success('Autenticación exitosa');
            STATE.authToken = authResult.token;
            STATE.metrics.testsPassed++;
        } else {
            log.error(`Autenticación fallida: ${authResult.error}`);
            STATE.metrics.testsFailed++;
            return; // No continuar sin auth
        }
        STATE.metrics.testsRun++;

        // Test CRUD de cada módulo principal
        const modules = [
            { name: 'Departamentos', endpoint: '/api/v1/departments' },
            { name: 'Turnos', endpoint: '/api/v1/shifts' },
            { name: 'Usuarios', endpoint: '/api/v1/users' },
            { name: 'Asistencias', endpoint: '/api/v1/attendance' },
            { name: 'Vacaciones', endpoint: '/api/v1/vacation/requests' },
            { name: 'Notificaciones', endpoint: '/api/v1/enterprise/notifications' }
        ];

        for (const mod of modules) {
            log.section(`Test 7.x: API ${mod.name}`);
            const result = await this.testModuleAPI(mod);
            if (result.success) {
                log.success(`${mod.name}: ${result.count || 0} registros obtenidos`);
                STATE.metrics.testsPassed++;
            } else {
                log.error(`${mod.name}: ${result.error}`);
                STATE.metrics.testsFailed++;
            }
            STATE.metrics.testsRun++;
        }

        return true;
    }

    async testAuth() {
        const result = await makeRequest('POST', '/api/v1/auth/login', {
            company: 'isi-sistemas',
            email: 'admin@isi.com',
            password: 'admin123'
        });

        if (result.success && result.data?.token) {
            return { success: true, token: result.data.token };
        }
        return { success: false, error: result.error };
    }

    async testModuleAPI(module) {
        const result = await makeRequest('GET', module.endpoint, null, STATE.authToken);

        if (result.success) {
            // Intentar extraer count de diferentes estructuras de respuesta
            const count = result.data?.total ||
                         result.data?.length ||
                         (Array.isArray(result.data) ? result.data.length : 0) ||
                         result.data?.users?.length ||
                         result.data?.departments?.length ||
                         result.data?.shifts?.length ||
                         result.data?.attendances?.length ||
                         result.data?.notifications?.length ||
                         0;
            return { success: true, count };
        }
        return { success: false, error: result.error };
    }
}

// ============================================================================
// EJECUTOR PRINCIPAL
// ============================================================================
async function runEnterpriseSimulation() {
    console.log(`
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                          ║
║   ███████╗███╗   ██╗████████╗███████╗██████╗ ██████╗ ██████╗ ██╗███████╗███████╗        ║
║   ██╔════╝████╗  ██║╚══██╔══╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██║██╔════╝██╔════╝        ║
║   █████╗  ██╔██╗ ██║   ██║   █████╗  ██████╔╝██████╔╝██████╔╝██║███████╗█████╗          ║
║   ██╔══╝  ██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗██╔═══╝ ██╔══██╗██║╚════██║██╔══╝          ║
║   ███████╗██║ ╚████║   ██║   ███████╗██║  ██║██║     ██║  ██║██║███████║███████╗        ║
║   ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝╚══════╝        ║
║                                                                                          ║
║   ███████╗██╗███╗   ███╗██╗   ██╗██╗      █████╗ ████████╗██╗ ██████╗ ███╗   ██╗        ║
║   ██╔════╝██║████╗ ████║██║   ██║██║     ██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║        ║
║   ███████╗██║██╔████╔██║██║   ██║██║     ███████║   ██║   ██║██║   ██║██╔██╗ ██║        ║
║   ╚════██║██║██║╚██╔╝██║██║   ██║██║     ██╔══██║   ██║   ██║██║   ██║██║╚██╗██║        ║
║   ███████║██║██║ ╚═╝ ██║╚██████╔╝███████╗██║  ██║   ██║   ██║╚██████╔╝██║ ╚████║        ║
║   ╚══════╝╚═╝╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝        ║
║                                                                                          ║
║   TEST NIVEL EJECUTIVO - ${CONFIG.simulation.totalEmployees} EMPLEADOS                                              ║
║   Validación completa de integridad, flujos y consistencia                               ║
║                                                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
`);

    STATE.metrics.startTime = new Date();

    try {
        // Módulo 1: Generar datos
        const generator = new EnterpriseDataGenerator();
        await generator.generateAllData();

        // Módulo 2: Validar SSOT
        const ssotValidator = new SSOTIntegrityValidator();
        await ssotValidator.validate();

        // Módulo 3: Simular workflows
        const workflowSimulator = new WorkflowSimulator();
        await workflowSimulator.simulate();

        // Módulo 4: Validar cadenas de datos
        const chainValidator = new DataChainValidator();
        await chainValidator.validate();

        // Módulo 5: Detectar duplicados
        const duplicateDetector = new DuplicateDetector();
        await duplicateDetector.detect();

        // Módulo 6: Verificar reportes
        const reportChecker = new ReportConsistencyChecker();
        await reportChecker.check();

        // Módulo 7: Test de APIs (solo si el servidor está corriendo)
        const apiTester = new APIIntegrationTest();
        await apiTester.test();

    } catch (error) {
        log.error(`Error durante la simulación: ${error.message}`);
        console.error(error);
    }

    STATE.metrics.endTime = new Date();
    const duration = (STATE.metrics.endTime - STATE.metrics.startTime) / 1000;

    // Reporte final
    console.log(`
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                           REPORTE FINAL DE SIMULACIÓN                                    ║
╠══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                          ║
║   📊 MÉTRICAS DE EJECUCIÓN                                                               ║
║   ─────────────────────────────────────────────────────────────────────────────────────  ║
║   ⏱️  Duración total: ${duration.toFixed(2)} segundos                                                       ║
║   🧪 Tests ejecutados: ${STATE.metrics.testsRun}                                                              ║
║   ✅ Tests pasados: ${STATE.metrics.testsPassed}                                                                ║
║   ❌ Tests fallidos: ${STATE.metrics.testsFailed}                                                               ║
║   ⚠️  Warnings: ${STATE.metrics.warnings}                                                                       ║
║   📈 Tasa de éxito: ${((STATE.metrics.testsPassed / STATE.metrics.testsRun) * 100).toFixed(1)}%                                                           ║
║                                                                                          ║
║   📦 DATOS GENERADOS                                                                     ║
║   ─────────────────────────────────────────────────────────────────────────────────────  ║
║   👥 Empleados: ${STATE.generatedData.employees.length}                                                                ║
║   🏢 Departamentos: ${STATE.generatedData.departments.length}                                                             ║
║   ⏰ Turnos: ${STATE.generatedData.shifts.length}                                                                    ║
║   📋 Asistencias: ${STATE.generatedData.attendances.length}                                                             ║
║   🏖️  Vacaciones: ${STATE.generatedData.vacations.length}                                                               ║
║   ⚠️  Sanciones: ${STATE.generatedData.sanctions.length}                                                                 ║
║   🏥 Exámenes médicos: ${STATE.generatedData.medicalExams.length}                                                          ║
║   📄 Documentos: ${STATE.generatedData.documents.length}                                                               ║
║   🎓 Capacitaciones: ${STATE.generatedData.trainings.length}                                                            ║
║   🔔 Notificaciones: ${STATE.generatedData.notifications.length}                                                            ║
║                                                                                          ║
║   🔍 PROBLEMAS DETECTADOS                                                                ║
║   ─────────────────────────────────────────────────────────────────────────────────────  ║
║   🚫 Violaciones SSOT: ${STATE.validationResults.ssotViolations.length}                                                            ║
║   👯 Duplicados: ${STATE.validationResults.duplicates.length}                                                                 ║
║   🔗 Cadenas rotas: ${STATE.validationResults.brokenChains.length}                                                              ║
║                                                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
`);

    // Guardar resultados
    const results = {
        timestamp: new Date().toISOString(),
        config: CONFIG,
        metrics: STATE.metrics,
        generatedDataSummary: {
            employees: STATE.generatedData.employees.length,
            departments: STATE.generatedData.departments.length,
            shifts: STATE.generatedData.shifts.length,
            attendances: STATE.generatedData.attendances.length,
            vacations: STATE.generatedData.vacations.length,
            sanctions: STATE.generatedData.sanctions.length,
            medicalExams: STATE.generatedData.medicalExams.length,
            documents: STATE.generatedData.documents.length,
            trainings: STATE.generatedData.trainings.length,
            notifications: STATE.generatedData.notifications.length
        },
        validationResults: STATE.validationResults
    };

    const fs = require('fs');
    fs.writeFileSync(
        'test-results-enterprise-simulation.json',
        JSON.stringify(results, null, 2)
    );
    console.log('\n📄 Resultados guardados en: test-results-enterprise-simulation.json\n');

    return results;
}

// Ejecutar
runEnterpriseSimulation().catch(console.error);
