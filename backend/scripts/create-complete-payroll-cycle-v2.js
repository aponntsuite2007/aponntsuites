/**
 * Create Complete Payroll Cycle V2
 *
 * Este script crea un ciclo completo de liquidación con datos reales:
 * - 2 empleados: Juan Pérez (quincenal por hora) y María García (mensual fijo)
 * - Turnos y feriados de Argentina
 * - Fichajes con llegadas tarde, ausencias justificadas/injustificadas, horas extras
 * - Liquidaciones quincenales y mensuales con conceptos argentinos
 */
const { Sequelize, Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    logging: false
});

const COMPANY_ID = 11; // ISI

// Helper: format date for SQL
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Helper: format timestamp for SQL
function formatTimestamp(date) {
    return date.toISOString();
}

async function main() {
    const transaction = await sequelize.transaction();

    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a la base de datos\n');

        // ========================================
        // PASO 1: OBTENER O CREAR DEPARTAMENTO
        // ========================================
        console.log('📦 PASO 1: Departamento...');
        let [depts] = await sequelize.query(
            `SELECT id, name FROM departments WHERE company_id = $1 AND is_active = true LIMIT 1`,
            { bind: [COMPANY_ID], transaction }
        );
        let departmentId;
        if (depts.length > 0) {
            departmentId = depts[0].id;
            console.log(`   Usando departamento existente: ${depts[0].name} (ID: ${departmentId})`);
        } else {
            const [newDept] = await sequelize.query(`
                INSERT INTO departments (name, description, company_id, is_active, created_at, updated_at)
                VALUES ('Producción', 'Departamento de producción', $1, true, NOW(), NOW())
                RETURNING id, name
            `, { bind: [COMPANY_ID], transaction });
            departmentId = newDept[0].id;
            console.log(`   Creado departamento: ${newDept[0].name} (ID: ${departmentId})`);
        }

        // ========================================
        // PASO 2: OBTENER O CREAR KIOSCO
        // ========================================
        console.log('📦 PASO 2: Kiosco...');
        let [kiosks] = await sequelize.query(
            `SELECT id, name FROM kiosks WHERE company_id = $1 AND is_active = true LIMIT 1`,
            { bind: [COMPANY_ID], transaction }
        );
        let kioskId;
        if (kiosks.length > 0) {
            kioskId = kiosks[0].id;
            console.log(`   Usando kiosco existente: ${kiosks[0].name} (ID: ${kioskId})`);
        } else {
            const [newKiosk] = await sequelize.query(`
                INSERT INTO kiosks (name, description, device_id, company_id, is_configured, is_active, created_at, updated_at)
                VALUES ('Kiosco Principal', 'Entrada principal', 'KSK-001', $1, true, true, NOW(), NOW())
                RETURNING id, name
            `, { bind: [COMPANY_ID], transaction });
            kioskId = newKiosk[0].id;
            console.log(`   Creado kiosco: ${newKiosk[0].name} (ID: ${kioskId})`);
        }

        // ========================================
        // PASO 3: OBTENER O CREAR TURNO
        // ========================================
        console.log('📦 PASO 3: Turno...');
        let [shifts] = await sequelize.query(
            `SELECT id, name, "startTime", "endTime" FROM shifts WHERE company_id = $1 AND "isActive" = true LIMIT 1`,
            { bind: [COMPANY_ID], transaction }
        );
        let shiftId;
        let shiftStart = '09:00:00';
        let shiftEnd = '18:00:00';
        if (shifts.length > 0) {
            shiftId = shifts[0].id;
            shiftStart = shifts[0].startTime || '09:00:00';
            shiftEnd = shifts[0].endTime || '18:00:00';
            console.log(`   Usando turno existente: ${shifts[0].name} (${shiftStart}-${shiftEnd})`);
        } else {
            const newShiftId = uuidv4();
            await sequelize.query(`
                INSERT INTO shifts (id, name, "startTime", "endTime", "isActive", company_id, "createdAt", "updatedAt")
                VALUES ($1, 'Turno Standard', '09:00:00', '18:00:00', true, $2, NOW(), NOW())
            `, { bind: [newShiftId, COMPANY_ID], transaction });
            shiftId = newShiftId;
            console.log(`   Creado turno: Turno Standard (09:00-18:00)`);
        }

        // ========================================
        // PASO 4: CREAR FERIADOS ARGENTINA 2025
        // ========================================
        console.log('📦 PASO 4: Feriados Argentina 2025...');
        const feriadosArgentina2025 = [
            { date: '2025-01-01', name: 'Año Nuevo', is_national: true },
            { date: '2025-03-03', name: 'Carnaval', is_national: true },
            { date: '2025-03-04', name: 'Carnaval', is_national: true },
            { date: '2025-03-24', name: 'Día de la Memoria', is_national: true },
            { date: '2025-04-02', name: 'Día del Veterano', is_national: true },
            { date: '2025-04-18', name: 'Viernes Santo', is_national: true },
            { date: '2025-05-01', name: 'Día del Trabajador', is_national: true },
            { date: '2025-05-25', name: 'Revolución de Mayo', is_national: true },
            { date: '2025-06-16', name: 'Güemes', is_national: true },
            { date: '2025-06-20', name: 'Día de la Bandera', is_national: true },
            { date: '2025-07-09', name: 'Día de la Independencia', is_national: true },
            { date: '2025-08-18', name: 'San Martín', is_national: true },
            { date: '2025-10-13', name: 'Respeto Diversidad', is_national: true },
            { date: '2025-11-20', name: 'Soberanía Nacional', is_national: true },
            { date: '2025-12-08', name: 'Inmaculada Concepción', is_national: true },
            { date: '2025-12-25', name: 'Navidad', is_national: true },
        ];

        let feriadosCreados = 0;
        for (const feriado of feriadosArgentina2025) {
            const [existing] = await sequelize.query(
                `SELECT id FROM holidays WHERE country = 'AR' AND date = $1`,
                { bind: [feriado.date], transaction }
            );
            if (existing.length === 0) {
                await sequelize.query(`
                    INSERT INTO holidays (id, country, date, name, is_national, year, created_at, updated_at)
                    VALUES ($1, 'AR', $2, $3, $4, 2025, NOW(), NOW())
                `, { bind: [uuidv4(), feriado.date, feriado.name, feriado.is_national], transaction });
                feriadosCreados++;
            }
        }
        console.log(`   ${feriadosCreados} feriados creados, ${feriadosArgentina2025.length - feriadosCreados} ya existían`);

        // ========================================
        // PASO 5: OBTENER 2 EMPLEADOS EXISTENTES
        // ========================================
        console.log('📦 PASO 5: Empleados de prueba...');

        // Empleado 1: Juan Pérez (Quincenal por hora) - EMP001
        const juanId = 'cedc2f80-5968-423b-8cd6-cdf7cdd5921d';
        console.log('   Usando empleado: Juan Pérez (EMP001) - Quincenal por hora');
        console.log(`   ID: ${juanId}`);

        // Empleado 2: Admin ISI (Mensual fijo) - EMP-ISI-001
        const mariaId = '766de495-e4f3-4e91-a509-1a495c52e15c';
        console.log('   Usando empleado: Admin ISI (EMP-ISI-001) - Mensual fijo');
        console.log(`   ID: ${mariaId}`);

        // ========================================
        // PASO 6: CREAR FICHAJES NOVIEMBRE 2025
        // ========================================
        console.log('📦 PASO 6: Fichajes Noviembre 2025...');

        // Limpiar fichajes previos de estos empleados para Nov 2025
        await sequelize.query(`
            DELETE FROM attendances
            WHERE "UserId" IN ($1, $2)
            AND date >= '2025-11-01' AND date <= '2025-11-30'
        `, { bind: [juanId, mariaId], transaction });

        // Días de Noviembre 2025 (excluyendo fines de semana y feriado del 20)
        const diasLaborablesNov = [];
        for (let d = 1; d <= 30; d++) {
            const fecha = new Date(2025, 10, d); // Nov = 10
            const diaSemana = fecha.getDay();
            if (diaSemana !== 0 && diaSemana !== 6) { // No sábado ni domingo
                if (d !== 20) { // Excluir feriado Soberanía Nacional
                    diasLaborablesNov.push(d);
                }
            }
        }

        console.log(`   Días laborables Nov 2025 (excluyendo feriado 20): ${diasLaborablesNov.length}`);

        // Generar fichajes para Juan (quincenal por hora)
        let fichajesJuan = 0;
        let llegadasTardeJuan = 0;
        let horasExtrasJuan = 0;
        let ausenciasJustificadasJuan = 0;
        let ausenciasInjustificadasJuan = 0;

        for (const dia of diasLaborablesNov) {
            const fechaStr = `2025-11-${String(dia).padStart(2, '0')}`;
            let checkIn, checkOut, status, notes;

            // Simulación de escenarios
            if (dia === 5) {
                // Llegada tarde (30 min)
                checkIn = new Date(`${fechaStr}T09:30:00`);
                checkOut = new Date(`${fechaStr}T18:00:00`);
                status = 'late';
                notes = 'Llegada tarde - transporte público';
                llegadasTardeJuan++;
            } else if (dia === 12) {
                // Ausencia justificada
                checkIn = null;
                checkOut = null;
                status = 'absent';
                notes = 'JUSTIFICADA - Turno médico';
                ausenciasJustificadasJuan++;
            } else if (dia === 18) {
                // Ausencia injustificada
                checkIn = null;
                checkOut = null;
                status = 'absent';
                notes = 'INJUSTIFICADA - Sin aviso previo';
                ausenciasInjustificadasJuan++;
            } else if (dia === 7 || dia === 14 || dia === 21 || dia === 28) {
                // Horas extras (4 horas más)
                checkIn = new Date(`${fechaStr}T09:00:00`);
                checkOut = new Date(`${fechaStr}T22:00:00`); // 4 horas extra
                status = 'present';
                notes = 'Trabajo urgente - horas extras autorizadas';
                horasExtrasJuan += 4;
            } else {
                // Día normal
                checkIn = new Date(`${fechaStr}T09:00:00`);
                checkOut = new Date(`${fechaStr}T18:00:00`);
                status = 'present';
                notes = null;
            }

            const workingHours = checkIn && checkOut ?
                (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60) : 0;

            await sequelize.query(`
                INSERT INTO attendances (id, date, "checkInTime", "checkOutTime", status, notes, "workingHours", "UserId", company_id, kiosk_id, "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            `, {
                bind: [
                    uuidv4(),
                    fechaStr,
                    checkIn ? formatTimestamp(checkIn) : null,
                    checkOut ? formatTimestamp(checkOut) : null,
                    status,
                    notes,
                    workingHours,
                    juanId,
                    COMPANY_ID,
                    kioskId
                ],
                transaction
            });
            fichajesJuan++;
        }

        // Agregar fichaje del feriado trabajado (20 Nov)
        const feriadoTrabajado = new Date('2025-11-20T09:00:00');
        const feriadoSalida = new Date('2025-11-20T14:00:00'); // Medio día
        await sequelize.query(`
            INSERT INTO attendances (id, date, "checkInTime", "checkOutTime", status, notes, "workingHours", "UserId", company_id, kiosk_id, "createdAt", "updatedAt")
            VALUES ($1, '2025-11-20', $2, $3, 'present', 'Feriado trabajado - pago doble', 5, $4, $5, $6, NOW(), NOW())
        `, {
            bind: [uuidv4(), formatTimestamp(feriadoTrabajado), formatTimestamp(feriadoSalida), juanId, COMPANY_ID, kioskId],
            transaction
        });
        fichajesJuan++;

        console.log(`   Juan Pérez: ${fichajesJuan} fichajes, ${llegadasTardeJuan} tarde, ${ausenciasJustificadasJuan} just., ${ausenciasInjustificadasJuan} injust., ${horasExtrasJuan}hs extras`);

        // Generar fichajes para María (mensual fijo)
        let fichajesMaria = 0;
        let llegadasTardeMaria = 0;
        let horasExtrasMaria = 0;

        for (const dia of diasLaborablesNov) {
            const fechaStr = `2025-11-${String(dia).padStart(2, '0')}`;
            let checkIn, checkOut, status, notes;

            if (dia === 10) {
                // Llegada tarde (15 min)
                checkIn = new Date(`${fechaStr}T09:15:00`);
                checkOut = new Date(`${fechaStr}T18:00:00`);
                status = 'late';
                notes = 'Llegada tarde - tráfico';
                llegadasTardeMaria++;
            } else if (dia === 25) {
                // Horas extras (3 horas)
                checkIn = new Date(`${fechaStr}T09:00:00`);
                checkOut = new Date(`${fechaStr}T21:00:00`);
                status = 'present';
                notes = 'Cierre de mes - horas extras';
                horasExtrasMaria += 3;
            } else {
                // Día normal
                checkIn = new Date(`${fechaStr}T09:00:00`);
                checkOut = new Date(`${fechaStr}T18:00:00`);
                status = 'present';
                notes = null;
            }

            const workingHours = checkIn && checkOut ?
                (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60) : 0;

            await sequelize.query(`
                INSERT INTO attendances (id, date, "checkInTime", "checkOutTime", status, notes, "workingHours", "UserId", company_id, kiosk_id, "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            `, {
                bind: [
                    uuidv4(),
                    fechaStr,
                    checkIn ? formatTimestamp(checkIn) : null,
                    checkOut ? formatTimestamp(checkOut) : null,
                    status,
                    notes,
                    workingHours,
                    mariaId,
                    COMPANY_ID,
                    kioskId
                ],
                transaction
            });
            fichajesMaria++;
        }

        console.log(`   María García: ${fichajesMaria} fichajes, ${llegadasTardeMaria} tarde, ${horasExtrasMaria}hs extras`);

        // ========================================
        // PASO 7: CREAR PLANTILLA DE LIQUIDACIÓN ARGENTINA
        // ========================================
        console.log('📦 PASO 7: Plantilla de liquidación Argentina...');

        // Verificar si ya existe plantilla
        let [templates] = await sequelize.query(
            `SELECT id, template_code FROM payroll_templates WHERE company_id = $1 AND template_code = 'ARG-2025' LIMIT 1`,
            { bind: [COMPANY_ID], transaction }
        );
        let templateId;
        if (templates.length > 0) {
            templateId = templates[0].id;
            console.log(`   Usando plantilla existente: ARG-2025 (ID: ${templateId})`);
        } else {
            const [newTemplate] = await sequelize.query(`
                INSERT INTO payroll_templates (
                    company_id, template_code, template_name, description,
                    pay_frequency, calculation_basis,
                    work_hours_per_day, work_days_per_week, work_hours_per_month,
                    overtime_50_after_hours, overtime_100_after_hours,
                    is_active, created_at, updated_at
                ) VALUES (
                    $1, 'ARG-2025', 'Liquidación Argentina 2025', 'Plantilla completa con conceptos argentinos',
                    'monthly', 'monthly',
                    8, 5, 200,
                    8, 12,
                    true, NOW(), NOW()
                ) RETURNING id
            `, { bind: [COMPANY_ID], transaction });
            templateId = newTemplate[0].id;
            console.log(`   Creada plantilla: ARG-2025 (ID: ${templateId})`);

            // Crear tipos de conceptos si no existen
            const conceptTypes = [
                { code: 'EARNING', name: 'Haberes', affects_gross: true, affects_net: true, is_deduction: false, is_employer_cost: false },
                { code: 'DEDUCTION', name: 'Descuentos', affects_gross: false, affects_net: true, is_deduction: true, is_employer_cost: false },
                { code: 'EMPLOYER', name: 'Contrib. Patronales', affects_gross: false, affects_net: false, is_deduction: false, is_employer_cost: true },
            ];

            for (const ct of conceptTypes) {
                const [existing] = await sequelize.query(
                    `SELECT id FROM payroll_concept_types WHERE type_code = $1`,
                    { bind: [ct.code], transaction }
                );
                if (existing.length === 0) {
                    await sequelize.query(`
                        INSERT INTO payroll_concept_types (type_code, type_name, affects_gross, affects_net, is_deduction, is_employer_cost, created_at)
                        VALUES ($1, $2, $3, $4, $5, $6, NOW())
                    `, { bind: [ct.code, ct.name, ct.affects_gross, ct.affects_net, ct.is_deduction, ct.is_employer_cost || false], transaction });
                }
            }

            // Obtener IDs de tipos
            const [earningType] = await sequelize.query(`SELECT id FROM payroll_concept_types WHERE type_code = 'EARNING'`, { transaction });
            const [deductionType] = await sequelize.query(`SELECT id FROM payroll_concept_types WHERE type_code = 'DEDUCTION'`, { transaction });
            const [employerType] = await sequelize.query(`SELECT id FROM payroll_concept_types WHERE type_code = 'EMPLOYER'`, { transaction });

            const earningTypeId = earningType[0].id;
            const deductionTypeId = deductionType[0].id;
            const employerTypeId = employerType[0].id;

            // Crear conceptos de liquidación Argentina
            const conceptos = [
                // HABERES
                { type_id: earningTypeId, code: 'SUELDO_BASE', name: 'Sueldo Básico', calc_type: 'fixed', order: 1 },
                { type_id: earningTypeId, code: 'ANTIGUEDAD', name: 'Antigüedad', calc_type: 'percentage', pct_base: 'SUELDO_BASE', employee_rate: 1, order: 2 },
                { type_id: earningTypeId, code: 'PRESENTISMO', name: 'Presentismo', calc_type: 'percentage', pct_base: 'SUELDO_BASE', employee_rate: 8.33, order: 3 },
                { type_id: earningTypeId, code: 'HE_50', name: 'Horas Extras 50%', calc_type: 'formula', formula: 'hourly_rate * 1.5 * overtime_50_hours', order: 4 },
                { type_id: earningTypeId, code: 'HE_100', name: 'Horas Extras 100%', calc_type: 'formula', formula: 'hourly_rate * 2 * overtime_100_hours', order: 5 },
                { type_id: earningTypeId, code: 'FERIADO_TRAB', name: 'Feriado Trabajado', calc_type: 'formula', formula: 'daily_rate * 2', order: 6 },
                { type_id: earningTypeId, code: 'VIATICOS', name: 'Viáticos', calc_type: 'fixed', default_value: 0, order: 7 },

                // DESCUENTOS EMPLEADO
                { type_id: deductionTypeId, code: 'JUB', name: 'Jubilación (11%)', calc_type: 'percentage', pct_base: 'GROSS', employee_rate: 11, order: 10 },
                { type_id: deductionTypeId, code: 'OS', name: 'Obra Social (3%)', calc_type: 'percentage', pct_base: 'GROSS', employee_rate: 3, order: 11 },
                { type_id: deductionTypeId, code: 'PAMI', name: 'Ley 19032/PAMI (3%)', calc_type: 'percentage', pct_base: 'GROSS', employee_rate: 3, order: 12 },
                { type_id: deductionTypeId, code: 'SINDICATO', name: 'Cuota Sindical (2.5%)', calc_type: 'percentage', pct_base: 'GROSS', employee_rate: 2.5, order: 13 },
                { type_id: deductionTypeId, code: 'GANANCIAS', name: 'Impuesto Ganancias', calc_type: 'fixed', default_value: 0, order: 14 },

                // CONTRIBUCIONES PATRONALES
                { type_id: employerTypeId, code: 'CONT_JUB', name: 'Contrib. Jubilación (10.17%)', calc_type: 'percentage', pct_base: 'GROSS', employer_rate: 10.17, order: 20 },
                { type_id: employerTypeId, code: 'CONT_PAMI', name: 'Contrib. PAMI (1.50%)', calc_type: 'percentage', pct_base: 'GROSS', employer_rate: 1.50, order: 21 },
                { type_id: employerTypeId, code: 'CONT_ASIG', name: 'Asignaciones Familiares (4.44%)', calc_type: 'percentage', pct_base: 'GROSS', employer_rate: 4.44, order: 22 },
                { type_id: employerTypeId, code: 'CONT_FNE', name: 'Fondo Nacional Empleo (0.89%)', calc_type: 'percentage', pct_base: 'GROSS', employer_rate: 0.89, order: 23 },
                { type_id: employerTypeId, code: 'CONT_OS', name: 'Contrib. Obra Social (6%)', calc_type: 'percentage', pct_base: 'GROSS', employer_rate: 6, order: 24 },
                { type_id: employerTypeId, code: 'ART', name: 'ART (2.5%)', calc_type: 'percentage', pct_base: 'GROSS', employer_rate: 2.5, order: 25 },
            ];

            for (const c of conceptos) {
                await sequelize.query(`
                    INSERT INTO payroll_template_concepts (
                        template_id, concept_type_id, concept_code, concept_name,
                        calculation_type, default_value, percentage_base, formula,
                        employee_contribution_rate, employer_contribution_rate,
                        display_order, is_active, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW(), NOW())
                `, {
                    bind: [
                        templateId, c.type_id, c.code, c.name,
                        c.calc_type, c.default_value || 0, c.pct_base || null, c.formula || null,
                        c.employee_rate || null, c.employer_rate || null,
                        c.order
                    ],
                    transaction
                });
            }
            console.log(`   Creados ${conceptos.length} conceptos de liquidación`);
        }

        // ========================================
        // PASO 8: CREAR CATEGORÍAS SALARIALES
        // ========================================
        console.log('📦 PASO 8: Categorías salariales...');

        // Categoría para Juan (por hora)
        let [catHora] = await sequelize.query(
            `SELECT id FROM salary_categories WHERE category_code = 'OPERARIO_A' LIMIT 1`,
            { transaction }
        );
        let catHoraId;
        if (catHora.length > 0) {
            catHoraId = catHora[0].id;
        } else {
            const [newCat] = await sequelize.query(`
                INSERT INTO salary_categories (category_code, category_name, description, base_salary_reference, is_active, created_at)
                VALUES ('OPERARIO_A', 'Operario Categoría A', 'Operario calificado - pago por hora', 450, true, NOW())
                RETURNING id
            `, { transaction });
            catHoraId = newCat[0].id;
        }
        console.log(`   Categoría por hora: OPERARIO_A (ID: ${catHoraId})`);

        // Categoría para María (mensual)
        let [catMensual] = await sequelize.query(
            `SELECT id FROM salary_categories WHERE category_code = 'ADMIN_B' LIMIT 1`,
            { transaction }
        );
        let catMensualId;
        if (catMensual.length > 0) {
            catMensualId = catMensual[0].id;
        } else {
            const [newCat] = await sequelize.query(`
                INSERT INTO salary_categories (category_code, category_name, description, base_salary_reference, is_active, created_at)
                VALUES ('ADMIN_B', 'Administrativo Categoría B', 'Personal administrativo - sueldo mensual', 850000, true, NOW())
                RETURNING id
            `, { transaction });
            catMensualId = newCat[0].id;
        }
        console.log(`   Categoría mensual: ADMIN_B (ID: ${catMensualId})`);

        // ========================================
        // PASO 9: ASIGNAR EMPLEADOS A PLANTILLA
        // ========================================
        console.log('📦 PASO 9: Asignación de empleados a plantilla...');

        // Limpiar asignaciones previas para estos empleados
        await sequelize.query(`
            DELETE FROM user_payroll_assignment WHERE user_id IN ($1, $2)
        `, { bind: [juanId, mariaId], transaction });

        // Asignación Juan (quincenal por hora - $450/hora)
        const [juanAssignment] = await sequelize.query(`
            INSERT INTO user_payroll_assignment (
                user_id, company_id, template_id, category_id,
                base_salary, hourly_rate, calculation_basis,
                effective_from, is_current, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, 0, 450, 'hourly', '2025-01-01', true, NOW(), NOW())
            RETURNING id
        `, { bind: [juanId, COMPANY_ID, templateId, catHoraId], transaction });
        const juanAssignmentId = juanAssignment[0].id;
        console.log(`   Juan Pérez: Quincenal por hora $450/hr (assignment: ${juanAssignmentId})`);

        // Asignación María (mensual fijo - $850.000)
        const [mariaAssignment] = await sequelize.query(`
            INSERT INTO user_payroll_assignment (
                user_id, company_id, template_id, category_id,
                base_salary, hourly_rate, calculation_basis,
                effective_from, is_current, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, 850000, NULL, 'monthly', '2025-01-01', true, NOW(), NOW())
            RETURNING id
        `, { bind: [mariaId, COMPANY_ID, templateId, catMensualId], transaction });
        const mariaAssignmentId = mariaAssignment[0].id;
        console.log(`   María García: Mensual fijo $850.000 (assignment: ${mariaAssignmentId})`);

        // ========================================
        // PASO 10: CREAR RUN DE LIQUIDACIÓN NOV 2025
        // ========================================
        console.log('📦 PASO 10: Run de liquidación Noviembre 2025...');

        // Verificar si ya existe run
        let [existingRun] = await sequelize.query(
            `SELECT id FROM payroll_runs WHERE company_id = $1 AND run_code = 'LIQ-NOV-2025-DETAIL' LIMIT 1`,
            { bind: [COMPANY_ID], transaction }
        );

        let runId;
        if (existingRun.length > 0) {
            runId = existingRun[0].id;
            // Limpiar detalles previos
            await sequelize.query(`DELETE FROM payroll_run_details WHERE run_id = $1`, { bind: [runId], transaction });
            console.log(`   Usando run existente y limpiando detalles (ID: ${runId})`);
        } else {
            const [newRun] = await sequelize.query(`
                INSERT INTO payroll_runs (
                    company_id, run_code, run_name,
                    period_year, period_month, period_start, period_end, payment_date,
                    total_employees, total_gross, total_deductions, total_net, total_employer_cost,
                    status, created_at, updated_at
                ) VALUES (
                    $1, 'LIQ-NOV-2025-DETAIL', 'Liquidación Noviembre 2025 - Detalle',
                    2025, 11, '2025-11-01', '2025-11-30', '2025-12-05',
                    2, 0, 0, 0, 0,
                    'draft', NOW(), NOW()
                ) RETURNING id
            `, { bind: [COMPANY_ID], transaction });
            runId = newRun[0].id;
            console.log(`   Creado run: LIQ-NOV-2025-DETAIL (ID: ${runId})`);
        }

        // ========================================
        // PASO 11: CALCULAR Y CREAR DETALLES DE LIQUIDACIÓN
        // ========================================
        console.log('📦 PASO 11: Calculando liquidaciones...\n');

        // LIQUIDACIÓN JUAN PÉREZ (Por hora)
        console.log('   === JUAN PÉREZ (Quincenal por hora) ===');
        const diasTrabajadosJuan = fichajesJuan - ausenciasJustificadasJuan - ausenciasInjustificadasJuan;
        const horasNormalesJuan = diasTrabajadosJuan * 8; // 8 horas por día
        const sueldoBaseJuan = horasNormalesJuan * 450; // $450/hora
        const heJuan50 = horasExtrasJuan * 450 * 1.5; // Horas extras 50%
        const feriadoJuan = 5 * 450 * 2; // 5 horas feriado, pago doble
        const presentismoJuan = Math.round(sueldoBaseJuan * 0.0833); // 8.33%

        const brutoJuan = sueldoBaseJuan + heJuan50 + feriadoJuan + presentismoJuan;
        const jubJuan = Math.round(brutoJuan * 0.11);
        const osJuan = Math.round(brutoJuan * 0.03);
        const pamiJuan = Math.round(brutoJuan * 0.03);
        const sindicatoJuan = Math.round(brutoJuan * 0.025);
        const descuentosJuan = jubJuan + osJuan + pamiJuan + sindicatoJuan;
        const netoJuan = brutoJuan - descuentosJuan;

        const contJubJuan = Math.round(brutoJuan * 0.1017);
        const contPamiJuan = Math.round(brutoJuan * 0.015);
        const contAsigJuan = Math.round(brutoJuan * 0.0444);
        const contFneJuan = Math.round(brutoJuan * 0.0089);
        const contOsJuan = Math.round(brutoJuan * 0.06);
        const artJuan = Math.round(brutoJuan * 0.025);
        const employerJuan = contJubJuan + contPamiJuan + contAsigJuan + contFneJuan + contOsJuan + artJuan;

        console.log(`      Días trabajados: ${diasTrabajadosJuan}`);
        console.log(`      Horas normales: ${horasNormalesJuan}`);
        console.log(`      Horas extras: ${horasExtrasJuan}`);
        console.log(`      Sueldo base: $${sueldoBaseJuan.toLocaleString()}`);
        console.log(`      HE 50%: $${heJuan50.toLocaleString()}`);
        console.log(`      Feriado trab.: $${feriadoJuan.toLocaleString()}`);
        console.log(`      Presentismo: $${presentismoJuan.toLocaleString()}`);
        console.log(`      BRUTO: $${brutoJuan.toLocaleString()}`);
        console.log(`      Descuentos: $${descuentosJuan.toLocaleString()}`);
        console.log(`      NETO: $${netoJuan.toLocaleString()}`);
        console.log(`      Costo empleador: $${employerJuan.toLocaleString()}`);

        const earningsDetailJuan = [
            { code: 'SUELDO_BASE', name: 'Sueldo Básico', amount: sueldoBaseJuan },
            { code: 'HE_50', name: 'Horas Extras 50%', amount: heJuan50 },
            { code: 'FERIADO_TRAB', name: 'Feriado Trabajado', amount: feriadoJuan },
            { code: 'PRESENTISMO', name: 'Presentismo', amount: presentismoJuan },
        ];

        const deductionsDetailJuan = [
            { code: 'JUB', name: 'Jubilación (11%)', amount: jubJuan },
            { code: 'OS', name: 'Obra Social (3%)', amount: osJuan },
            { code: 'PAMI', name: 'Ley 19032/PAMI (3%)', amount: pamiJuan },
            { code: 'SINDICATO', name: 'Cuota Sindical (2.5%)', amount: sindicatoJuan },
        ];

        const employerDetailJuan = [
            { code: 'CONT_JUB', name: 'Contrib. Jubilación', amount: contJubJuan },
            { code: 'CONT_PAMI', name: 'Contrib. PAMI', amount: contPamiJuan },
            { code: 'CONT_ASIG', name: 'Asignaciones Familiares', amount: contAsigJuan },
            { code: 'CONT_FNE', name: 'Fondo Nac. Empleo', amount: contFneJuan },
            { code: 'CONT_OS', name: 'Contrib. Obra Social', amount: contOsJuan },
            { code: 'ART', name: 'ART', amount: artJuan },
        ];

        await sequelize.query(`
            INSERT INTO payroll_run_details (
                run_id, user_id, assignment_id,
                worked_days, worked_hours, overtime_50_hours, overtime_100_hours, absent_days,
                gross_earnings, total_deductions, net_salary, employer_contributions,
                earnings_detail, deductions_detail, employer_detail,
                status, receipt_number, created_at, updated_at
            ) VALUES (
                $1, $2, $3,
                $4, $5, $6, 0, $7,
                $8, $9, $10, $11,
                $12, $13, $14,
                'calculated', 'REC-2025-11-001', NOW(), NOW()
            )
        `, {
            bind: [
                runId, juanId, juanAssignmentId,
                diasTrabajadosJuan, horasNormalesJuan, horasExtrasJuan, ausenciasJustificadasJuan + ausenciasInjustificadasJuan,
                brutoJuan, descuentosJuan, netoJuan, employerJuan,
                JSON.stringify(earningsDetailJuan), JSON.stringify(deductionsDetailJuan), JSON.stringify(employerDetailJuan)
            ],
            transaction
        });

        // LIQUIDACIÓN MARÍA GARCÍA (Mensual fijo)
        console.log('\n   === MARÍA GARCÍA (Mensual fijo) ===');
        const sueldoBaseMaria = 850000;
        const heMaria50 = horasExtrasMaria * (850000/200) * 1.5; // Hora = sueldo/200
        const presentismoMaria = Math.round(sueldoBaseMaria * 0.0833);

        const brutoMaria = sueldoBaseMaria + heMaria50 + presentismoMaria;
        const jubMaria = Math.round(brutoMaria * 0.11);
        const osMaria = Math.round(brutoMaria * 0.03);
        const pamiMaria = Math.round(brutoMaria * 0.03);
        const sindicatoMaria = Math.round(brutoMaria * 0.025);
        const descuentosMaria = jubMaria + osMaria + pamiMaria + sindicatoMaria;
        const netoMaria = brutoMaria - descuentosMaria;

        const contJubMaria = Math.round(brutoMaria * 0.1017);
        const contPamiMaria = Math.round(brutoMaria * 0.015);
        const contAsigMaria = Math.round(brutoMaria * 0.0444);
        const contFneMaria = Math.round(brutoMaria * 0.0089);
        const contOsMaria = Math.round(brutoMaria * 0.06);
        const artMaria = Math.round(brutoMaria * 0.025);
        const employerMaria = contJubMaria + contPamiMaria + contAsigMaria + contFneMaria + contOsMaria + artMaria;

        console.log(`      Sueldo base: $${sueldoBaseMaria.toLocaleString()}`);
        console.log(`      Horas extras: ${horasExtrasMaria} ($${Math.round(heMaria50).toLocaleString()})`);
        console.log(`      Presentismo: $${presentismoMaria.toLocaleString()}`);
        console.log(`      BRUTO: $${brutoMaria.toLocaleString()}`);
        console.log(`      Descuentos: $${descuentosMaria.toLocaleString()}`);
        console.log(`      NETO: $${netoMaria.toLocaleString()}`);
        console.log(`      Costo empleador: $${employerMaria.toLocaleString()}`);

        const earningsDetailMaria = [
            { code: 'SUELDO_BASE', name: 'Sueldo Básico', amount: sueldoBaseMaria },
            { code: 'HE_50', name: 'Horas Extras 50%', amount: Math.round(heMaria50) },
            { code: 'PRESENTISMO', name: 'Presentismo', amount: presentismoMaria },
        ];

        const deductionsDetailMaria = [
            { code: 'JUB', name: 'Jubilación (11%)', amount: jubMaria },
            { code: 'OS', name: 'Obra Social (3%)', amount: osMaria },
            { code: 'PAMI', name: 'Ley 19032/PAMI (3%)', amount: pamiMaria },
            { code: 'SINDICATO', name: 'Cuota Sindical (2.5%)', amount: sindicatoMaria },
        ];

        const employerDetailMaria = [
            { code: 'CONT_JUB', name: 'Contrib. Jubilación', amount: contJubMaria },
            { code: 'CONT_PAMI', name: 'Contrib. PAMI', amount: contPamiMaria },
            { code: 'CONT_ASIG', name: 'Asignaciones Familiares', amount: contAsigMaria },
            { code: 'CONT_FNE', name: 'Fondo Nac. Empleo', amount: contFneMaria },
            { code: 'CONT_OS', name: 'Contrib. Obra Social', amount: contOsMaria },
            { code: 'ART', name: 'ART', amount: artMaria },
        ];

        await sequelize.query(`
            INSERT INTO payroll_run_details (
                run_id, user_id, assignment_id,
                worked_days, worked_hours, overtime_50_hours, overtime_100_hours, absent_days,
                gross_earnings, total_deductions, net_salary, employer_contributions,
                earnings_detail, deductions_detail, employer_detail,
                status, receipt_number, created_at, updated_at
            ) VALUES (
                $1, $2, $3,
                $4, $5, $6, 0, 0,
                $7, $8, $9, $10,
                $11, $12, $13,
                'calculated', 'REC-2025-11-002', NOW(), NOW()
            )
        `, {
            bind: [
                runId, mariaId, mariaAssignmentId,
                fichajesMaria, fichajesMaria * 8, horasExtrasMaria,
                brutoMaria, descuentosMaria, netoMaria, employerMaria,
                JSON.stringify(earningsDetailMaria), JSON.stringify(deductionsDetailMaria), JSON.stringify(employerDetailMaria)
            ],
            transaction
        });

        // ========================================
        // PASO 12: ACTUALIZAR TOTALES DEL RUN
        // ========================================
        console.log('\n📦 PASO 12: Actualizando totales del run...');

        const totalGross = brutoJuan + brutoMaria;
        const totalDeductions = descuentosJuan + descuentosMaria;
        const totalNet = netoJuan + netoMaria;
        const totalEmployer = employerJuan + employerMaria;

        await sequelize.query(`
            UPDATE payroll_runs SET
                total_employees = 2,
                total_gross = $1,
                total_deductions = $2,
                total_net = $3,
                total_employer_cost = $4,
                status = 'calculated',
                updated_at = NOW()
            WHERE id = $5
        `, { bind: [totalGross, totalDeductions, totalNet, totalEmployer, runId], transaction });

        console.log(`   TOTALES LIQUIDACIÓN:`);
        console.log(`   - Total Bruto: $${totalGross.toLocaleString()}`);
        console.log(`   - Total Descuentos: $${totalDeductions.toLocaleString()}`);
        console.log(`   - Total Neto: $${totalNet.toLocaleString()}`);
        console.log(`   - Costo Empleador: $${totalEmployer.toLocaleString()}`);

        // COMMIT
        await transaction.commit();
        console.log('\n✅ CICLO DE NÓMINA COMPLETO CREADO EXITOSAMENTE');
        console.log('\n📋 RESUMEN:');
        console.log('   - 2 empleados con liquidaciones detalladas');
        console.log('   - Juan Pérez: Quincenal por hora ($450/hr)');
        console.log('   - María García: Mensual fijo ($850.000)');
        console.log('   - 16 feriados Argentina 2025');
        console.log('   - Fichajes Nov 2025 con llegadas tarde, ausencias, horas extras');
        console.log('   - Plantilla argentina con 17 conceptos');
        console.log('   - Run de liquidación con detalles por empleado');
        console.log(`\n🔗 Ver en UI: http://localhost:9998/panel-administrativo.html → Liquidación de Sueldos`);

    } catch (error) {
        await transaction.rollback();
        console.error('❌ ERROR:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
    }
}

main();
