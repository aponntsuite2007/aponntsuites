/**
 * SEED STRESS TEST DATA
 *
 * Crea datos masivos para stress test:
 * - 10 turnos variados (con/sin feriados nacionales)
 * - Días no laborables adicionales
 * - 100 usuarios con datos completos
 * - 1000 fichajes de prueba
 */

const crypto = require('crypto');
const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');

class StressTestSeeder {
    constructor() {
        this.companyId = null;
        this.branchId = null;
        this.departments = [];
        this.positions = [];
        this.shifts = [];
        this.users = [];
        this.stats = {
            shifts: 0,
            nonWorkingDays: 0,
            users: 0,
            shiftAssignments: 0,
            templates: 0,
            attendances: 0
        };
    }

    log(msg, type = 'info') {
        const icons = { info: '📝', success: '✅', error: '❌', warn: '⚠️' };
        console.log(`${icons[type] || '📝'} ${msg}`);
    }

    // =========================================================================
    // 1. CREAR 10 TURNOS VARIADOS
    // =========================================================================
    async createShifts() {
        this.log('Creando 10 turnos variados...', 'info');

        const shiftsData = [
            // Turnos fijos CON feriados nacionales
            {
                name: 'Administrativo Mañana',
                code: 'ADM_AM',
                startTime: '08:00:00',
                endTime: '16:00:00',
                shiftType: 'standard',
                days: '1,2,3,4,5',
                toleranceEntry: 15,
                toleranceExit: 15,
                respectHolidays: true,
                color: '#2196F3'
            },
            {
                name: 'Administrativo Tarde',
                code: 'ADM_PM',
                startTime: '14:00:00',
                endTime: '22:00:00',
                shiftType: 'standard',
                days: '1,2,3,4,5',
                toleranceEntry: 10,
                toleranceExit: 10,
                respectHolidays: true,
                color: '#9C27B0'
            },
            {
                name: 'Comercial Flexible',
                code: 'COM_FLEX',
                startTime: '09:00:00',
                endTime: '18:00:00',
                shiftType: 'standard',
                days: '1,2,3,4,5,6',
                toleranceEntry: 30,
                toleranceExit: 30,
                respectHolidays: true,
                color: '#4CAF50'
            },
            // Turnos fijos SIN feriados nacionales (producción continua)
            {
                name: 'Producción Mañana',
                code: 'PROD_AM',
                startTime: '06:00:00',
                endTime: '14:00:00',
                shiftType: 'standard',
                days: '1,2,3,4,5,6',
                toleranceEntry: 5,
                toleranceExit: 5,
                respectHolidays: false,
                color: '#FF5722'
            },
            {
                name: 'Producción Tarde',
                code: 'PROD_PM',
                startTime: '14:00:00',
                endTime: '22:00:00',
                shiftType: 'standard',
                days: '1,2,3,4,5,6',
                toleranceEntry: 5,
                toleranceExit: 5,
                respectHolidays: false,
                color: '#E91E63'
            },
            {
                name: 'Producción Noche',
                code: 'PROD_NOCHE',
                startTime: '22:00:00',
                endTime: '06:00:00',
                shiftType: 'standard',
                days: '0,1,2,3,4,5',
                toleranceEntry: 5,
                toleranceExit: 5,
                respectHolidays: false,
                color: '#673AB7'
            },
            // Turnos rotativos
            {
                name: 'Rotativo 6x2 Diurno',
                code: 'ROT_6X2_D',
                startTime: '06:00:00',
                endTime: '18:00:00',
                shiftType: 'rotative',
                days: null,
                workDays: 6,
                restDays: 2,
                toleranceEntry: 10,
                toleranceExit: 10,
                respectHolidays: false,
                color: '#00BCD4'
            },
            {
                name: 'Rotativo 6x2 Nocturno',
                code: 'ROT_6X2_N',
                startTime: '18:00:00',
                endTime: '06:00:00',
                shiftType: 'rotative',
                days: null,
                workDays: 6,
                restDays: 2,
                toleranceEntry: 10,
                toleranceExit: 10,
                respectHolidays: false,
                color: '#3F51B5'
            },
            {
                name: 'Rotativo 5x2 Estándar',
                code: 'ROT_5X2',
                startTime: '08:00:00',
                endTime: '17:00:00',
                shiftType: 'rotative',
                days: null,
                workDays: 5,
                restDays: 2,
                toleranceEntry: 15,
                toleranceExit: 15,
                respectHolidays: true,
                color: '#009688'
            },
            // Turno especial fin de semana
            {
                name: 'Guardia Fin de Semana',
                code: 'GUARD_FDS',
                startTime: '08:00:00',
                endTime: '20:00:00',
                shiftType: 'standard',
                days: '0,6',
                toleranceEntry: 10,
                toleranceExit: 10,
                respectHolidays: false,
                color: '#795548'
            }
        ];

        for (const shift of shiftsData) {
            // Verificar si ya existe
            const [existing] = await sequelize.query(
                `SELECT id FROM shifts WHERE company_id = $1 AND name = $2`,
                { bind: [this.companyId, shift.name], type: QueryTypes.SELECT }
            );

            if (existing) {
                this.shifts.push(existing);
                continue;
            }

            const shiftId = crypto.randomUUID();
            // days es JSON, no string
            const daysJson = shift.days ? JSON.stringify(shift.days.split(',').map(Number)) : '[]';

            await sequelize.query(`
                INSERT INTO shifts (
                    id, company_id, branch_id, name, "startTime", "endTime",
                    "shiftType", days, "workDays", "restDays",
                    "toleranceMinutesEntry", "toleranceMinutesExit",
                    respect_national_holidays, color, "isActive",
                    "createdAt", "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5, $6,
                    $7, $8::json, $9, $10,
                    $11, $12,
                    $13, $14, true,
                    NOW(), NOW()
                )
            `, {
                bind: [
                    shiftId, this.companyId, this.branchId,
                    shift.name, shift.startTime, shift.endTime,
                    shift.shiftType, daysJson, shift.workDays || null, shift.restDays || null,
                    shift.toleranceEntry, shift.toleranceExit,
                    shift.respectHolidays, shift.color
                ],
                type: QueryTypes.INSERT
            });

            const [created] = await sequelize.query(
                `SELECT * FROM shifts WHERE id = $1`,
                { bind: [shiftId], type: QueryTypes.SELECT }
            );
            this.shifts.push(created);
            this.stats.shifts++;
        }

        this.log(`  ${this.stats.shifts} turnos nuevos creados (${this.shifts.length} total)`, 'success');
    }

    // =========================================================================
    // 2. CREAR DÍAS NO LABORABLES
    // =========================================================================
    async createNonWorkingDays() {
        this.log('Creando días no laborables adicionales...', 'info');

        const year = new Date().getFullYear();
        const nonWorkingDays = [
            { date: `${year}-12-24`, reason: 'Nochebuena - Cierre anticipado' },
            { date: `${year}-12-31`, reason: 'Fin de año - Cierre anticipado' },
            { date: `${year + 1}-01-02`, reason: 'Día puente Año Nuevo' },
            { date: `${year}-07-10`, reason: 'Día puente Independencia' },
            { date: `${year}-11-21`, reason: 'Día puente Soberanía' },
            { date: `${year}-03-25`, reason: 'Día puente Memoria' },
            { date: `${year}-08-19`, reason: 'Día puente San Martín' },
            { date: `${year}-06-17`, reason: 'Día puente Güemes' },
            { date: `${year}-10-14`, reason: 'Día puente Diversidad' },
            { date: `${year}-04-03`, reason: 'Día puente Veteranos' }
        ];

        for (const day of nonWorkingDays) {
            // Verificar si ya existe
            const [existing] = await sequelize.query(
                `SELECT id FROM company_non_working_days WHERE company_id = $1 AND date = $2`,
                { bind: [this.companyId, day.date], type: QueryTypes.SELECT }
            );

            if (existing) continue;

            await sequelize.query(`
                INSERT INTO company_non_working_days (company_id, date, reason, created_at)
                VALUES ($1, $2, $3, NOW())
            `, {
                bind: [this.companyId, day.date, day.reason],
                type: QueryTypes.INSERT
            });
            this.stats.nonWorkingDays++;
        }

        this.log(`  ${this.stats.nonWorkingDays} días no laborables creados`, 'success');
    }

    // =========================================================================
    // 3. CREAR 100 USUARIOS
    // =========================================================================
    async createUsers() {
        this.log('Creando 100 usuarios con datos completos...', 'info');

        const firstNames = [
            'Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Laura', 'Diego', 'Sofía',
            'Martín', 'Valentina', 'Lucas', 'Camila', 'Nicolás', 'Isabella', 'Mateo',
            'Lucía', 'Sebastián', 'Emma', 'Benjamín', 'Mía', 'Tomás', 'Victoria',
            'Gabriel', 'Catalina', 'Daniel', 'Antonella', 'Joaquín', 'Renata', 'Samuel',
            'Emilia', 'Franco', 'Martina', 'Agustín', 'Julieta', 'Felipe', 'Delfina',
            'Ignacio', 'Alma', 'Bautista', 'Olivia', 'Thiago', 'Bianca', 'Lautaro',
            'Morena', 'Santino', 'Abril', 'Valentín', 'Jazmín', 'Facundo', 'Milagros'
        ];

        const lastNames = [
            'García', 'Rodríguez', 'Martínez', 'López', 'González', 'Pérez', 'Sánchez',
            'Romero', 'Fernández', 'Torres', 'Díaz', 'Alvarez', 'Ruiz', 'Ramírez',
            'Flores', 'Acosta', 'Medina', 'Herrera', 'Aguirre', 'Pereyra', 'Giménez',
            'Molina', 'Silva', 'Castro', 'Rojas', 'Ortiz', 'Nuñez', 'Luna', 'Cabrera',
            'Ríos', 'Morales', 'Gutiérrez', 'Sosa', 'Vargas', 'Carrizo', 'Ojeda',
            'Suárez', 'Benítez', 'Méndez', 'Vega', 'Correa', 'Paz', 'Vera', 'Ledesma',
            'Ramos', 'Montenegro', 'Quiroga', 'Figueroa', 'Villalba', 'Godoy'
        ];

        const roles = ['employee', 'employee', 'employee', 'employee', 'employee',
                       'employee', 'employee', 'supervisor', 'supervisor', 'manager'];

        for (let i = 0; i < 100; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const legajo = `STRESS${String(i + 1).padStart(4, '0')}`;
            const email = `${legajo.toLowerCase()}@stresstest.local`;
            const dni = String(20000000 + Math.floor(Math.random() * 20000000));
            const role = roles[Math.floor(Math.random() * roles.length)];
            const department = this.departments[Math.floor(Math.random() * this.departments.length)];
            const position = this.positions[Math.floor(Math.random() * this.positions.length)];

            // Verificar si ya existe
            const [existing] = await sequelize.query(
                `SELECT user_id FROM users WHERE legajo = $1`,
                { bind: [legajo], type: QueryTypes.SELECT }
            );

            if (existing) {
                this.users.push(existing);
                continue;
            }

            const userId = crypto.randomUUID();
            const whatsapp = `+5411${String(Math.floor(Math.random() * 90000000) + 10000000)}`;

            await sequelize.query(`
                INSERT INTO users (
                    user_id, company_id, "employeeId", "firstName", "lastName",
                    email, dni, legajo, password, role,
                    department_id, organizational_position_id,
                    can_authorize_late_arrivals, authorized_departments,
                    notification_preference_late_arrivals, whatsapp_number,
                    is_active, "isActive", "createdAt", "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, 'STRESS_HASH', $9,
                    $10, $11,
                    $12, $13,
                    $14, $15,
                    true, true, NOW(), NOW()
                )
            `, {
                bind: [
                    userId, this.companyId, legajo, firstName, lastName,
                    email, dni, legajo, role,
                    department?.id || null, position?.id || null,
                    role === 'supervisor' || role === 'manager',
                    JSON.stringify([]),
                    Math.random() > 0.5 ? 'email' : 'whatsapp',
                    whatsapp
                ],
                type: QueryTypes.INSERT
            });

            this.users.push({
                user_id: userId,
                legajo,
                firstName,
                lastName,
                role
            });
            this.stats.users++;

            // Mostrar progreso cada 20 usuarios
            if ((i + 1) % 20 === 0) {
                process.stdout.write(`\r   Progreso: ${i + 1}/100 usuarios...`);
            }
        }
        console.log('');
        this.log(`  ${this.stats.users} usuarios nuevos creados (${this.users.length} total)`, 'success');
    }

    // =========================================================================
    // 4. ASIGNAR TURNOS A USUARIOS
    // =========================================================================
    async assignShiftsToUsers() {
        this.log('Asignando turnos a usuarios...', 'info');

        for (const user of this.users) {
            // Verificar si ya tiene turno
            const [existing] = await sequelize.query(
                `SELECT id FROM user_shift_assignments WHERE user_id = $1 AND is_active = true`,
                { bind: [user.user_id], type: QueryTypes.SELECT }
            );

            if (existing) continue;

            // Asignar turno aleatorio
            const shift = this.shifts[Math.floor(Math.random() * this.shifts.length)];
            const phase = shift.shiftType === 'rotative' ? ['A', 'B', 'C'][Math.floor(Math.random() * 3)] : 'FIJO';

            await sequelize.query(`
                INSERT INTO user_shift_assignments (
                    user_id, shift_id, company_id, is_active,
                    join_date, assigned_phase, group_name, created_at, updated_at
                ) VALUES ($1, $2, $3, true, CURRENT_DATE, $4, 'Stress Test', NOW(), NOW())
            `, {
                bind: [user.user_id, shift.id, this.companyId, phase],
                type: QueryTypes.INSERT
            });
            this.stats.shiftAssignments++;
        }

        this.log(`  ${this.stats.shiftAssignments} asignaciones de turno`, 'success');
    }

    // =========================================================================
    // 5. CREAR TEMPLATES BIOMÉTRICOS
    // =========================================================================
    async createBiometricTemplates() {
        this.log('Creando templates biométricos...', 'info');

        for (const user of this.users) {
            // Verificar si ya existe
            const [existing] = await sequelize.query(
                `SELECT id FROM biometric_templates WHERE employee_id = $1`,
                { bind: [user.user_id], type: QueryTypes.SELECT }
            );

            if (existing) continue;

            const mockEmbedding = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
            const embeddingHash = crypto.createHash('sha256').update(JSON.stringify(mockEmbedding)).digest('hex');

            await sequelize.query(`
                INSERT INTO biometric_templates (
                    company_id, employee_id, embedding_encrypted, embedding_hash,
                    algorithm, model_version, template_version,
                    quality_score, confidence_score,
                    capture_timestamp, encryption_algorithm, encryption_key_version,
                    gdpr_consent, is_active, is_primary, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4,
                    'FaceNet', 'v1.0.0', 'v1.0.0',
                    $5, $6,
                    NOW(), 'AES-256-GCM', 'v1',
                    true, true, true, NOW(), NOW()
                )
            `, {
                bind: [
                    this.companyId, user.user_id,
                    JSON.stringify(mockEmbedding), embeddingHash,
                    0.85 + Math.random() * 0.15,  // quality 0.85-1.0
                    0.80 + Math.random() * 0.20   // confidence 0.80-1.0
                ],
                type: QueryTypes.INSERT
            });
            this.stats.templates++;
        }

        this.log(`  ${this.stats.templates} templates biométricos creados`, 'success');
    }

    // =========================================================================
    // 6. GENERAR 1000 FICHAJES
    // =========================================================================
    async generateAttendances() {
        this.log('Generando 1000 fichajes de stress test...', 'info');

        // La tabla es 'attendances' con estructura específica
        // Columnas principales: id, date, "UserId", "checkInTime", "checkOutTime", status, company_id

        const statuses = ['present', 'present', 'present', 'late', 'late', 'absent'];
        const checkInMethods = ['fingerprint', 'face', 'pin', 'manual', 'mobile'];
        const today = new Date();

        // Generar fichajes de forma sistemática: cada usuario × cada día
        // 100 usuarios × 10 días = 1000 fichajes
        const numDays = Math.ceil(1000 / this.users.length);

        for (let dayOffset = 0; dayOffset < numDays; dayOffset++) {
            for (let userIdx = 0; userIdx < this.users.length && this.stats.attendances < 1000; userIdx++) {
                const user = this.users[userIdx];
                const date = new Date(today);
                date.setDate(date.getDate() - dayOffset);
                const dateStr = date.toISOString().split('T')[0];

                // Hora de entrada (6:00 - 10:00)
                const checkInHour = 6 + Math.floor(Math.random() * 4);
                const checkInMinute = Math.floor(Math.random() * 60);
                const checkInTime = new Date(date);
                checkInTime.setHours(checkInHour, checkInMinute, 0, 0);

                // Hora de salida (14:00 - 22:00)
                const checkOutHour = 14 + Math.floor(Math.random() * 8);
                const checkOutMinute = Math.floor(Math.random() * 60);
                const checkOutTime = new Date(date);
                checkOutTime.setHours(checkOutHour, checkOutMinute, 0, 0);

                // Horas trabajadas
                const workingHours = ((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2);

                const status = statuses[Math.floor(Math.random() * statuses.length)];
                const method = checkInMethods[Math.floor(Math.random() * checkInMethods.length)];
                const attendanceId = crypto.randomUUID();

                try {
                    await sequelize.query(`
                        INSERT INTO attendances (
                            id, date, "UserId", "checkInTime", "checkOutTime",
                            "checkInMethod", "checkOutMethod", "workingHours",
                            status, company_id, "createdAt", "updatedAt"
                        ) VALUES (
                            $1, $2, $3, $4, $5,
                            $6, $7, $8,
                            $9, $10, NOW(), NOW()
                        )
                        ON CONFLICT DO NOTHING
                    `, {
                        bind: [
                            attendanceId, dateStr, user.user_id,
                            checkInTime.toISOString(), checkOutTime.toISOString(),
                            method, method, workingHours,
                            status, this.companyId
                        ],
                        type: QueryTypes.INSERT
                    });
                    this.stats.attendances++;
                } catch (err) {
                    // Log error para debug
                    if (this.stats.attendances === 0) {
                        console.log('\n   Error en primer fichaje:', err.message);
                    }
                }

                // Mostrar progreso cada 100
                if (this.stats.attendances % 100 === 0 && this.stats.attendances > 0) {
                    process.stdout.write(`\r   Progreso: ${this.stats.attendances}/1000 fichajes...`);
                }
            }
        }

        console.log('');
        this.log(`  ${this.stats.attendances} fichajes generados`, 'success');
    }

    // =========================================================================
    // MAIN
    // =========================================================================
    async run() {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║         🚀 SEED STRESS TEST DATA                                           ║');
        console.log('║         100 usuarios + 10 turnos + 1000 fichajes                           ║');
        console.log('╚════════════════════════════════════════════════════════════════════════════╝');
        console.log('');

        try {
            // Obtener o crear empresa
            const [company] = await sequelize.query(
                `SELECT company_id FROM companies WHERE name LIKE 'WFTEST%' OR name LIKE 'STRESS%' LIMIT 1`,
                { type: QueryTypes.SELECT }
            );

            if (company) {
                this.companyId = company.company_id;
                this.log(`Usando empresa existente ID: ${this.companyId}`, 'info');
            } else {
                // Crear empresa nueva
                await sequelize.query(`
                    INSERT INTO companies (name, slug, is_active, created_at, updated_at)
                    VALUES ('STRESS_Test Company', 'stress-test-company', true, NOW(), NOW())
                `);
                const [newCompany] = await sequelize.query(
                    `SELECT company_id FROM companies WHERE slug = 'stress-test-company'`,
                    { type: QueryTypes.SELECT }
                );
                this.companyId = newCompany.company_id;
                this.log(`Empresa creada ID: ${this.companyId}`, 'success');
            }

            // Obtener branch
            const [branch] = await sequelize.query(
                `SELECT id FROM branches WHERE company_id = $1 LIMIT 1`,
                { bind: [this.companyId], type: QueryTypes.SELECT }
            );
            this.branchId = branch?.id || null;

            // Obtener departamentos
            const [depts] = await sequelize.query(
                `SELECT id, name FROM departments WHERE company_id = $1`,
                { bind: [this.companyId] }
            );
            this.departments = depts;

            // Obtener posiciones
            const [positions] = await sequelize.query(
                `SELECT id, position_name FROM organizational_positions WHERE company_id = $1`,
                { bind: [this.companyId] }
            );
            this.positions = positions;

            // Ejecutar seeds
            await this.createShifts();
            await this.createNonWorkingDays();
            await this.createUsers();
            await this.assignShiftsToUsers();
            await this.createBiometricTemplates();
            await this.generateAttendances();

            // Resumen final
            console.log('');
            console.log('╔════════════════════════════════════════════════════════════════════════════╗');
            console.log('║         ✅ SEED COMPLETADO                                                 ║');
            console.log('╠════════════════════════════════════════════════════════════════════════════╣');
            console.log(`║  Turnos creados:           ${String(this.stats.shifts).padStart(4)}                                      ║`);
            console.log(`║  Días no laborables:       ${String(this.stats.nonWorkingDays).padStart(4)}                                      ║`);
            console.log(`║  Usuarios creados:         ${String(this.stats.users).padStart(4)}                                      ║`);
            console.log(`║  Asignaciones turno:       ${String(this.stats.shiftAssignments).padStart(4)}                                      ║`);
            console.log(`║  Templates biométricos:    ${String(this.stats.templates).padStart(4)}                                      ║`);
            console.log(`║  Fichajes generados:       ${String(this.stats.attendances).padStart(4)}                                      ║`);
            console.log('╚════════════════════════════════════════════════════════════════════════════╝');

        } catch (error) {
            console.error('❌ ERROR:', error.message);
            console.error(error.stack);
        } finally {
            await sequelize.close();
        }
    }
}

// Ejecutar
const seeder = new StressTestSeeder();
seeder.run();
