/**
 * ========================================================================
 * CIRCUITO COMPLETO DE LIQUIDACIÓN DE SUELDOS - DATOS REALES
 * ========================================================================
 *
 * Este script crea un ciclo completo de liquidación con:
 * 1. Turnos (quincenal y mensual)
 * 2. Calendario de turnos con feriados
 * 3. Departamentos
 * 4. Kioscos de marcado
 * 5. Empleados con roles y categorías
 * 6. Fichajes simulados (llegadas tarde, ausencias, horas extras)
 * 7. Plantillas de liquidación para Argentina
 * 8. Liquidaciones quincenales y mensuales
 *
 * USO: node scripts/create-complete-payroll-cycle.js
 * ========================================================================
 */

const { Sequelize } = require('sequelize');
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

// Configuración
const COMPANY_ID = 11; // ISI
const COUNTRY_CODE = 'ARG';

// Helpers
function log(msg, type = 'info') {
    const icons = { info: '📋', success: '✅', error: '❌', warning: '⚠️', step: '▶️', money: '💰' };
    console.log(`${icons[type] || '•'} ${msg}`);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Fechas del período (Noviembre 2025)
const PERIOD_YEAR = 2025;
const PERIOD_MONTH = 11;
const PERIOD_START = new Date(2025, 10, 1); // 1 Nov
const PERIOD_END = new Date(2025, 10, 30); // 30 Nov
const QUINCENA_1_END = new Date(2025, 10, 15); // 15 Nov

async function run() {
    console.log('\n' + '═'.repeat(75));
    console.log('   CREANDO CIRCUITO COMPLETO DE LIQUIDACIÓN - DATOS REALES');
    console.log('   Empresa: ISI (ID: 11) | País: Argentina');
    console.log('═'.repeat(75) + '\n');

    try {
        await sequelize.authenticate();
        log('Conectado a PostgreSQL', 'success');

        // ================================================================
        // PASO 1: CREAR TURNOS
        // ================================================================
        log('\n=== PASO 1: CREANDO TURNOS ===', 'step');

        // Turno Administrativo (8:00 - 17:00, Lunes a Viernes)
        const [turnoAdmin] = await sequelize.query(`
            INSERT INTO shifts (company_id, name, description, start_time, end_time,
                               work_days, is_active, created_at)
            VALUES (${COMPANY_ID}, 'Turno Administrativo', 'Lunes a Viernes 8:00-17:00',
                   '08:00:00', '17:00:00', '{1,2,3,4,5}', true, NOW())
            ON CONFLICT (company_id, name) DO UPDATE SET
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time
            RETURNING id
        `);
        const turnoAdminId = turnoAdmin[0]?.id;
        log(`Turno Administrativo creado (ID: ${turnoAdminId})`, 'success');

        // Turno Rotativo (6:00 - 14:00, todos los días)
        const [turnoRotativo] = await sequelize.query(`
            INSERT INTO shifts (company_id, name, description, start_time, end_time,
                               work_days, is_active, created_at)
            VALUES (${COMPANY_ID}, 'Turno Rotativo Mañana', '6:00-14:00 todos los días',
                   '06:00:00', '14:00:00', '{0,1,2,3,4,5,6}', true, NOW())
            ON CONFLICT (company_id, name) DO UPDATE SET
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time
            RETURNING id
        `);
        const turnoRotativoId = turnoRotativo[0]?.id;
        log(`Turno Rotativo creado (ID: ${turnoRotativoId})`, 'success');

        // ================================================================
        // PASO 2: CREAR FERIADOS ARGENTINA NOVIEMBRE 2025
        // ================================================================
        log('\n=== PASO 2: CREANDO FERIADOS ARGENTINA ===', 'step');

        const feriados = [
            { fecha: '2025-11-20', nombre: 'Día de la Soberanía Nacional', tipo: 'nacional' },
            { fecha: '2025-11-21', nombre: 'Feriado Puente Turístico', tipo: 'puente' }
        ];

        for (const feriado of feriados) {
            await sequelize.query(`
                INSERT INTO holidays (company_id, country_code, holiday_date, name, type, is_paid, created_at)
                VALUES (${COMPANY_ID}, '${COUNTRY_CODE}', '${feriado.fecha}', '${feriado.nombre}',
                       '${feriado.tipo}', true, NOW())
                ON CONFLICT DO NOTHING
            `);
            log(`Feriado: ${feriado.nombre} (${feriado.fecha})`, 'success');
        }

        // ================================================================
        // PASO 3: CREAR DEPARTAMENTO
        // ================================================================
        log('\n=== PASO 3: CREANDO DEPARTAMENTO ===', 'step');

        const [deptResult] = await sequelize.query(`
            INSERT INTO departments (company_id, name, description, location, is_active, created_at)
            VALUES (${COMPANY_ID}, 'Desarrollo de Software', 'Departamento de desarrollo y tecnología',
                   'Piso 3 - Edificio Central', true, NOW())
            ON CONFLICT (company_id, name) DO UPDATE SET description = EXCLUDED.description
            RETURNING department_id
        `);
        const departmentId = deptResult[0]?.department_id;
        log(`Departamento creado (ID: ${departmentId})`, 'success');

        // ================================================================
        // PASO 4: CREAR KIOSCO DE MARCADO
        // ================================================================
        log('\n=== PASO 4: CREANDO KIOSCO DE MARCADO ===', 'step');

        const [kioskResult] = await sequelize.query(`
            INSERT INTO kiosks (company_id, name, location, department_id, is_active,
                               ip_address, mac_address, created_at)
            VALUES (${COMPANY_ID}, 'Kiosco Desarrollo', 'Entrada Piso 3', ${departmentId || 'NULL'},
                   true, '192.168.1.100', 'AA:BB:CC:DD:EE:FF', NOW())
            ON CONFLICT DO NOTHING
            RETURNING kiosk_id
        `);
        const kioskId = kioskResult[0]?.kiosk_id || 1;
        log(`Kiosco creado (ID: ${kioskId})`, 'success');

        // ================================================================
        // PASO 5: CREAR EMPLEADOS DE PRUEBA
        // ================================================================
        log('\n=== PASO 5: CREANDO EMPLEADOS DE PRUEBA ===', 'step');

        // Empleado 1: Juan Pérez - Quincenal (por hora)
        const empleado1Id = generateUUID();
        await sequelize.query(`
            INSERT INTO users (user_id, company_id, email, dni, "firstName", "lastName",
                              role, department_id, hire_date, is_active, created_at)
            VALUES ('${empleado1Id}', ${COMPANY_ID}, 'juan.perez@isi.com', '30123456',
                   'Juan', 'Pérez', 'employee', ${departmentId || 'NULL'}, '2024-01-15', true, NOW())
            ON CONFLICT (email) DO UPDATE SET "firstName" = EXCLUDED."firstName"
            RETURNING user_id
        `);
        log(`Empleado 1: Juan Pérez (Quincenal por hora) - ID: ${empleado1Id}`, 'success');

        // Empleado 2: María García - Mensual (sueldo fijo)
        const empleado2Id = generateUUID();
        await sequelize.query(`
            INSERT INTO users (user_id, company_id, email, dni, "firstName", "lastName",
                              role, department_id, hire_date, is_active, created_at)
            VALUES ('${empleado2Id}', ${COMPANY_ID}, 'maria.garcia@isi.com', '30789012',
                   'María', 'García', 'employee', ${departmentId || 'NULL'}, '2023-06-01', true, NOW())
            ON CONFLICT (email) DO UPDATE SET "firstName" = EXCLUDED."firstName"
            RETURNING user_id
        `);
        log(`Empleado 2: María García (Mensual sueldo fijo) - ID: ${empleado2Id}`, 'success');

        // ================================================================
        // PASO 6: ASIGNAR TURNOS A EMPLEADOS
        // ================================================================
        log('\n=== PASO 6: ASIGNANDO TURNOS ===', 'step');

        if (turnoAdminId) {
            await sequelize.query(`
                INSERT INTO user_shift_assignments (user_id, shift_id, company_id,
                    effective_from, is_active, created_at)
                VALUES ('${empleado1Id}', ${turnoAdminId}, ${COMPANY_ID}, '2025-11-01', true, NOW())
                ON CONFLICT DO NOTHING
            `);
            await sequelize.query(`
                INSERT INTO user_shift_assignments (user_id, shift_id, company_id,
                    effective_from, is_active, created_at)
                VALUES ('${empleado2Id}', ${turnoAdminId}, ${COMPANY_ID}, '2025-11-01', true, NOW())
                ON CONFLICT DO NOTHING
            `);
            log('Turnos asignados a ambos empleados', 'success');
        }

        // ================================================================
        // PASO 7: CREAR CATEGORÍAS SALARIALES
        // ================================================================
        log('\n=== PASO 7: CREANDO CATEGORÍAS SALARIALES ===', 'step');

        // Obtener labor_agreement_catalog_id
        const [agreementCatalog] = await sequelize.query(`
            SELECT id FROM labor_agreements_catalog WHERE code = 'CCT-ISI-2025' LIMIT 1
        `);
        const catalogAgreementId = agreementCatalog[0]?.id || 1;

        // Categoría por hora (para quincenal)
        await sequelize.query(`
            INSERT INTO salary_categories (category_code, category_name, base_salary_reference,
                hourly_rate, description, labor_agreement_id, is_active, created_at)
            VALUES ('DEV-JR-HORA', 'Desarrollador Jr por Hora', 250000, 1562.50,
                   'Desarrollador Junior - Pago por hora trabajada', ${catalogAgreementId}, true, NOW())
            ON CONFLICT (category_code) DO UPDATE SET hourly_rate = EXCLUDED.hourly_rate
        `);
        log('Categoría DEV-JR-HORA creada ($1,562.50/hora)', 'success');

        // Categoría mensual
        await sequelize.query(`
            INSERT INTO salary_categories (category_code, category_name, base_salary_reference,
                hourly_rate, description, labor_agreement_id, is_active, created_at)
            VALUES ('DEV-SSR-MES', 'Desarrollador SSR Mensual', 1200000, 7500,
                   'Desarrollador Semi-Senior - Sueldo mensual fijo', ${catalogAgreementId}, true, NOW())
            ON CONFLICT (category_code) DO UPDATE SET base_salary_reference = EXCLUDED.base_salary_reference
        `);
        log('Categoría DEV-SSR-MES creada ($1,200,000/mes)', 'success');

        // Obtener IDs de categorías
        const [catHora] = await sequelize.query(`SELECT id FROM salary_categories WHERE category_code = 'DEV-JR-HORA' LIMIT 1`);
        const [catMes] = await sequelize.query(`SELECT id FROM salary_categories WHERE category_code = 'DEV-SSR-MES' LIMIT 1`);
        const catHoraId = catHora[0]?.id;
        const catMesId = catMes[0]?.id;

        // ================================================================
        // PASO 8: ASIGNAR CONFIGURACIÓN SALARIAL A EMPLEADOS
        // ================================================================
        log('\n=== PASO 8: CONFIGURANDO SALARIOS ===', 'step');

        // Juan Pérez - Quincenal por hora
        await sequelize.query(`
            INSERT INTO user_salary_config_v2 (user_id, company_id, salary_category_id,
                labor_agreement_id, payment_type, base_salary, hourly_rate,
                overtime_rate_50, overtime_rate_100, is_current, effective_from, created_at)
            VALUES ('${empleado1Id}', ${COMPANY_ID}, ${catHoraId}, ${catalogAgreementId},
                   'biweekly', 0, 1562.50, 2343.75, 3125, true, '2025-11-01', NOW())
            ON CONFLICT DO NOTHING
        `);
        log('Juan Pérez: Quincenal por hora ($1,562.50/hr, HE50%: $2,343.75, HE100%: $3,125)', 'success');

        // María García - Mensual
        await sequelize.query(`
            INSERT INTO user_salary_config_v2 (user_id, company_id, salary_category_id,
                labor_agreement_id, payment_type, base_salary, gross_salary, hourly_rate,
                overtime_rate_50, overtime_rate_100, is_current, effective_from, created_at)
            VALUES ('${empleado2Id}', ${COMPANY_ID}, ${catMesId}, ${catalogAgreementId},
                   'monthly', 1200000, 1200000, 7500, 11250, 15000, true, '2025-11-01', NOW())
            ON CONFLICT DO NOTHING
        `);
        log('María García: Mensual ($1,200,000/mes, HE50%: $11,250/hr, HE100%: $15,000/hr)', 'success');

        // ================================================================
        // PASO 9: SIMULAR FICHAJES (NOVIEMBRE 2025)
        // ================================================================
        log('\n=== PASO 9: SIMULANDO FICHAJES NOVIEMBRE 2025 ===', 'step');

        // Días laborables de noviembre 2025 (excluyendo fines de semana y feriados)
        const diasLaborables = [];
        for (let d = 1; d <= 30; d++) {
            const fecha = new Date(2025, 10, d);
            const diaSemana = fecha.getDay();
            // Lunes a Viernes (1-5), excluyendo feriados 20 y 21
            if (diaSemana >= 1 && diaSemana <= 5 && d !== 20 && d !== 21) {
                diasLaborables.push(d);
            }
        }
        log(`Días laborables en noviembre: ${diasLaborables.length}`, 'info');

        // --- FICHAJES JUAN PÉREZ (Quincenal) ---
        log('\n--- Fichajes Juan Pérez ---', 'info');

        let juanHorasTrabajadas = 0;
        let juanHorasExtras50 = 0;
        let juanLlegadasTarde = 0;
        let juanAusencias = { justificadas: 0, injustificadas: 0 };

        for (const dia of diasLaborables) {
            const fecha = `2025-11-${dia.toString().padStart(2, '0')}`;

            // Simular diferentes escenarios
            if (dia === 3) {
                // Ausencia injustificada (no hay fichaje)
                juanAusencias.injustificadas++;
                log(`  ${fecha}: AUSENCIA INJUSTIFICADA`, 'warning');
                continue;
            }

            if (dia === 10) {
                // Ausencia justificada (enfermedad)
                juanAusencias.justificadas++;
                await sequelize.query(`
                    INSERT INTO attendance (user_id, company_id, date, status,
                        absence_type, absence_reason, is_justified, created_at)
                    VALUES ('${empleado1Id}', ${COMPANY_ID}, '${fecha}', 'absent',
                           'sick_leave', 'Certificado médico presentado', true, NOW())
                    ON CONFLICT DO NOTHING
                `);
                log(`  ${fecha}: AUSENCIA JUSTIFICADA (Enfermedad)`, 'warning');
                continue;
            }

            let checkIn, checkOut;
            let tardanza = 0;
            let horasExtra = 0;

            if (dia === 5) {
                // Llegada tarde (8:45 en vez de 8:00)
                checkIn = '08:45:00';
                checkOut = '17:00:00';
                tardanza = 45;
                juanLlegadasTarde++;
                juanHorasTrabajadas += 8.25; // 8:45 a 17:00
            } else if (dia === 12) {
                // Llegada tarde (8:30)
                checkIn = '08:30:00';
                checkOut = '17:00:00';
                tardanza = 30;
                juanLlegadasTarde++;
                juanHorasTrabajadas += 8.5;
            } else if (dia === 14) {
                // Horas extras (se quedó hasta las 21:00 = 4 horas extra)
                checkIn = '08:00:00';
                checkOut = '21:00:00';
                horasExtra = 4;
                juanHorasExtras50 += 4;
                juanHorasTrabajadas += 9; // 8 normales + se cuenta aparte las extras
            } else if (dia === 25) {
                // Más horas extras (hasta las 20:00 = 3 horas extra)
                checkIn = '08:00:00';
                checkOut = '20:00:00';
                horasExtra = 3;
                juanHorasExtras50 += 3;
                juanHorasTrabajadas += 9;
            } else {
                // Día normal
                checkIn = '08:00:00';
                checkOut = '17:00:00';
                juanHorasTrabajadas += 9; // 8 horas + 1 hora almuerzo
            }

            await sequelize.query(`
                INSERT INTO attendance (user_id, company_id, date, check_in, check_out,
                    status, worked_hours, overtime_hours, late_minutes, kiosk_id, created_at)
                VALUES ('${empleado1Id}', ${COMPANY_ID}, '${fecha}',
                       '${fecha} ${checkIn}', '${fecha} ${checkOut}',
                       'present', ${juanHorasTrabajadas > 0 ? 8 : 0}, ${horasExtra}, ${tardanza},
                       ${kioskId}, NOW())
                ON CONFLICT DO NOTHING
            `);
        }

        log(`  Total días trabajados: ${diasLaborables.length - juanAusencias.justificadas - juanAusencias.injustificadas}`, 'info');
        log(`  Llegadas tarde: ${juanLlegadasTarde}`, 'info');
        log(`  Horas extras 50%: ${juanHorasExtras50}`, 'info');
        log(`  Ausencias justificadas: ${juanAusencias.justificadas}`, 'info');
        log(`  Ausencias injustificadas: ${juanAusencias.injustificadas}`, 'info');

        // --- FICHAJES MARÍA GARCÍA (Mensual) ---
        log('\n--- Fichajes María García ---', 'info');

        let mariaHorasExtras50 = 0;
        let mariaLlegadasTarde = 0;

        for (const dia of diasLaborables) {
            const fecha = `2025-11-${dia.toString().padStart(2, '0')}`;

            let checkIn, checkOut;
            let tardanza = 0;
            let horasExtra = 0;

            if (dia === 7) {
                // Llegada tarde
                checkIn = '08:20:00';
                checkOut = '17:00:00';
                tardanza = 20;
                mariaLlegadasTarde++;
            } else if (dia === 18) {
                // Horas extras
                checkIn = '08:00:00';
                checkOut = '19:30:00';
                horasExtra = 2.5;
                mariaHorasExtras50 += 2.5;
            } else {
                checkIn = '08:00:00';
                checkOut = '17:00:00';
            }

            await sequelize.query(`
                INSERT INTO attendance (user_id, company_id, date, check_in, check_out,
                    status, worked_hours, overtime_hours, late_minutes, kiosk_id, created_at)
                VALUES ('${empleado2Id}', ${COMPANY_ID}, '${fecha}',
                       '${fecha} ${checkIn}', '${fecha} ${checkOut}',
                       'present', 8, ${horasExtra}, ${tardanza}, ${kioskId}, NOW())
                ON CONFLICT DO NOTHING
            `);
        }

        log(`  Total días trabajados: ${diasLaborables.length}`, 'info');
        log(`  Llegadas tarde: ${mariaLlegadasTarde}`, 'info');
        log(`  Horas extras 50%: ${mariaHorasExtras50}`, 'info');

        // Agregar fichajes de feriados (pagados pero no trabajados)
        log('\n--- Feriados pagados ---', 'info');
        for (const feriado of feriados) {
            // Juan
            await sequelize.query(`
                INSERT INTO attendance (user_id, company_id, date, status,
                    is_holiday, holiday_name, created_at)
                VALUES ('${empleado1Id}', ${COMPANY_ID}, '${feriado.fecha}', 'holiday',
                       true, '${feriado.nombre}', NOW())
                ON CONFLICT DO NOTHING
            `);
            // María
            await sequelize.query(`
                INSERT INTO attendance (user_id, company_id, date, status,
                    is_holiday, holiday_name, created_at)
                VALUES ('${empleado2Id}', ${COMPANY_ID}, '${feriado.fecha}', 'holiday',
                       true, '${feriado.nombre}', NOW())
                ON CONFLICT DO NOTHING
            `);
        }
        log(`  2 feriados registrados como pagados para ambos empleados`, 'success');

        // ================================================================
        // PASO 10: CREAR PLANTILLA DE LIQUIDACIÓN ARGENTINA
        // ================================================================
        log('\n=== PASO 10: CREANDO PLANTILLA DE LIQUIDACIÓN ARGENTINA ===', 'step');

        // Obtener labor_agreement_v2 id
        const [agreementV2] = await sequelize.query(`
            SELECT id FROM labor_agreements_v2 WHERE company_id = ${COMPANY_ID} LIMIT 1
        `);
        const v2AgreementId = agreementV2[0]?.id || 1;

        // Obtener country_id
        const [countryResult] = await sequelize.query(`
            SELECT id FROM payroll_countries WHERE country_code = 'ARG' LIMIT 1
        `);
        const countryId = countryResult[0]?.id || 1;

        // Plantilla Quincenal
        await sequelize.query(`
            INSERT INTO payroll_templates (template_code, template_name, company_id, country_id,
                labor_agreement_id, pay_frequency, description, work_hours_per_day,
                work_days_per_week, is_active, created_at)
            VALUES ('LIQ-ARG-QUINC', 'Liquidación Quincenal Argentina', ${COMPANY_ID}, ${countryId},
                   ${v2AgreementId}, 'biweekly', 'Plantilla para liquidación quincenal', 8, 5, true, NOW())
            ON CONFLICT (template_code) DO UPDATE SET template_name = EXCLUDED.template_name
            RETURNING id
        `);
        log('Plantilla Quincenal creada', 'success');

        // Plantilla Mensual
        await sequelize.query(`
            INSERT INTO payroll_templates (template_code, template_name, company_id, country_id,
                labor_agreement_id, pay_frequency, description, work_hours_per_day,
                work_days_per_week, is_active, created_at)
            VALUES ('LIQ-ARG-MENS', 'Liquidación Mensual Argentina', ${COMPANY_ID}, ${countryId},
                   ${v2AgreementId}, 'monthly', 'Plantilla para liquidación mensual', 8, 5, true, NOW())
            ON CONFLICT (template_code) DO UPDATE SET template_name = EXCLUDED.template_name
            RETURNING id
        `);
        log('Plantilla Mensual creada', 'success');

        // ================================================================
        // PASO 11: CREAR LIQUIDACIÓN QUINCENAL - JUAN PÉREZ
        // ================================================================
        log('\n=== PASO 11: LIQUIDACIÓN QUINCENAL JUAN PÉREZ ===', 'money');

        // Calcular valores Juan (primera quincena: días 1-15, excluyendo fines de semana)
        const diasQuincena1 = diasLaborables.filter(d => d <= 15);
        const diasTrabajadosJuan = diasQuincena1.length - 1; // -1 por ausencia injustificada día 3
        const horasNormalesJuan = diasTrabajadosJuan * 8;
        const valorHoraJuan = 1562.50;

        // Cálculos
        const sueldoBasicoJuan = horasNormalesJuan * valorHoraJuan;
        const horasExtrasJuan50 = 4; // Solo las del día 14 en quincena 1
        const montoHorasExtras = horasExtrasJuan50 * (valorHoraJuan * 1.5);
        const feriadosJuan = 0; // Los feriados son en la 2da quincena
        const descuentoAusencia = 8 * valorHoraJuan; // 1 día ausencia injustificada

        const brutoquincenal = sueldoBasicoJuan + montoHorasExtras - descuentoAusencia;

        // Deducciones Argentina
        const jubilacion = brutoquincenal * 0.11; // 11%
        const obraSocial = brutoquincenal * 0.03; // 3%
        const ley19032 = brutoquincenal * 0.03; // 3% PAMI
        const totalDeducciones = jubilacion + obraSocial + ley19032;
        const netoQuincenal = brutoquincenal - totalDeducciones;

        // Costo empleador
        const apContribPatronal = brutoquincenal * 0.1067; // 10.67% jubilación
        const apObraSocialPatronal = brutoquincenal * 0.06; // 6% obra social
        const art = brutoquincenal * 0.025; // 2.5% ART
        const costoEmpleador = brutoquincenal + apContribPatronal + apObraSocialPatronal + art;

        log(`\n  RECIBO DE SUELDO - JUAN PÉREZ`, 'info');
        log(`  Período: 1ra Quincena Noviembre 2025`, 'info');
        log(`  ─────────────────────────────────────`, 'info');
        log(`  Días trabajados: ${diasTrabajadosJuan}`, 'info');
        log(`  Horas normales: ${horasNormalesJuan} x $${valorHoraJuan.toLocaleString()} = $${sueldoBasicoJuan.toLocaleString()}`, 'info');
        log(`  Horas extras 50%: ${horasExtrasJuan50} x $${(valorHoraJuan * 1.5).toLocaleString()} = $${montoHorasExtras.toLocaleString()}`, 'info');
        log(`  Descuento ausencia: -$${descuentoAusencia.toLocaleString()}`, 'warning');
        log(`  ─────────────────────────────────────`, 'info');
        log(`  BRUTO: $${brutoquincenal.toLocaleString()}`, 'info');
        log(`  ─────────────────────────────────────`, 'info');
        log(`  Jubilación (11%): -$${jubilacion.toLocaleString()}`, 'info');
        log(`  Obra Social (3%): -$${obraSocial.toLocaleString()}`, 'info');
        log(`  Ley 19032 (3%): -$${ley19032.toLocaleString()}`, 'info');
        log(`  ─────────────────────────────────────`, 'info');
        log(`  NETO A COBRAR: $${netoQuincenal.toLocaleString()}`, 'success');
        log(`  Costo Empleador: $${costoEmpleador.toLocaleString()}`, 'money');

        // Guardar en BD
        const runCodeJuan = `LIQ-JUAN-Q1-202511`;
        await sequelize.query(`
            INSERT INTO payroll_runs (company_id, run_code, run_name, period_year, period_month,
                period_start, period_end, payment_date, total_employees, total_gross,
                total_deductions, total_net, total_employer_cost, status, created_at)
            VALUES (${COMPANY_ID}, '${runCodeJuan}', 'Liquidación Juan Pérez Q1 Nov 2025',
                   2025, 11, '2025-11-01', '2025-11-15', '2025-11-20',
                   1, ${brutoquincenal}, ${totalDeducciones}, ${netoQuincenal}, ${costoEmpleador},
                   'calculated', NOW())
            ON CONFLICT (run_code) DO UPDATE SET
                total_gross = EXCLUDED.total_gross,
                total_net = EXCLUDED.total_net,
                status = 'calculated'
            RETURNING id
        `);

        // ================================================================
        // PASO 12: CREAR LIQUIDACIÓN MENSUAL - MARÍA GARCÍA
        // ================================================================
        log('\n=== PASO 12: LIQUIDACIÓN MENSUAL MARÍA GARCÍA ===', 'money');

        const sueldoBasicoMaria = 1200000; // Sueldo fijo mensual
        const horasExtrasMaria = 2.5;
        const valorHoraMaria = 7500;
        const montoHorasExtrasMaria = horasExtrasMaria * (valorHoraMaria * 1.5);
        const feriadosMaria = 2 * (sueldoBasicoMaria / 22); // 2 feriados pagados

        const brutoMensual = sueldoBasicoMaria + montoHorasExtrasMaria + feriadosMaria;

        // Deducciones
        const jubilacionMaria = brutoMensual * 0.11;
        const obraSocialMaria = brutoMensual * 0.03;
        const ley19032Maria = brutoMensual * 0.03;
        const totalDeduccionesMaria = jubilacionMaria + obraSocialMaria + ley19032Maria;
        const netoMensual = brutoMensual - totalDeduccionesMaria;

        // Costo empleador
        const apContribPatronalMaria = brutoMensual * 0.1067;
        const apObraSocialPatronalMaria = brutoMensual * 0.06;
        const artMaria = brutoMensual * 0.025;
        const costoEmpleadorMaria = brutoMensual + apContribPatronalMaria + apObraSocialPatronalMaria + artMaria;

        log(`\n  RECIBO DE SUELDO - MARÍA GARCÍA`, 'info');
        log(`  Período: Noviembre 2025 (Mensual)`, 'info');
        log(`  ─────────────────────────────────────`, 'info');
        log(`  Sueldo básico: $${sueldoBasicoMaria.toLocaleString()}`, 'info');
        log(`  Horas extras 50%: ${horasExtrasMaria} x $${(valorHoraMaria * 1.5).toLocaleString()} = $${montoHorasExtrasMaria.toLocaleString()}`, 'info');
        log(`  Feriados (2): $${feriadosMaria.toLocaleString()}`, 'info');
        log(`  ─────────────────────────────────────`, 'info');
        log(`  BRUTO: $${brutoMensual.toLocaleString()}`, 'info');
        log(`  ─────────────────────────────────────`, 'info');
        log(`  Jubilación (11%): -$${jubilacionMaria.toLocaleString()}`, 'info');
        log(`  Obra Social (3%): -$${obraSocialMaria.toLocaleString()}`, 'info');
        log(`  Ley 19032 (3%): -$${ley19032Maria.toLocaleString()}`, 'info');
        log(`  ─────────────────────────────────────`, 'info');
        log(`  NETO A COBRAR: $${netoMensual.toLocaleString()}`, 'success');
        log(`  Costo Empleador: $${costoEmpleadorMaria.toLocaleString()}`, 'money');

        // Guardar en BD
        const runCodeMaria = `LIQ-MARIA-M-202511`;
        await sequelize.query(`
            INSERT INTO payroll_runs (company_id, run_code, run_name, period_year, period_month,
                period_start, period_end, payment_date, total_employees, total_gross,
                total_deductions, total_net, total_employer_cost, status, created_at)
            VALUES (${COMPANY_ID}, '${runCodeMaria}', 'Liquidación María García Nov 2025',
                   2025, 11, '2025-11-01', '2025-11-30', '2025-12-05',
                   1, ${brutoMensual}, ${totalDeduccionesMaria}, ${netoMensual}, ${costoEmpleadorMaria},
                   'calculated', NOW())
            ON CONFLICT (run_code) DO UPDATE SET
                total_gross = EXCLUDED.total_gross,
                total_net = EXCLUDED.total_net,
                status = 'calculated'
            RETURNING id
        `);

        // ================================================================
        // RESUMEN FINAL
        // ================================================================
        console.log('\n' + '═'.repeat(75));
        console.log('   RESUMEN FINAL - LIQUIDACIONES CREADAS');
        console.log('═'.repeat(75));

        console.log(`
   ┌─────────────────────────────────────────────────────────────────────┐
   │  EMPLEADO          │ TIPO       │ BRUTO       │ NETO        │ COSTO │
   ├─────────────────────────────────────────────────────────────────────┤
   │  Juan Pérez        │ Quincenal  │ $${brutoquincenal.toLocaleString().padEnd(10)} │ $${netoQuincenal.toLocaleString().padEnd(10)} │ $${Math.round(costoEmpleador).toLocaleString().padEnd(6)} │
   │  María García      │ Mensual    │ $${Math.round(brutoMensual).toLocaleString().padEnd(10)} │ $${Math.round(netoMensual).toLocaleString().padEnd(10)} │ $${Math.round(costoEmpleadorMaria).toLocaleString().padEnd(6)} │
   └─────────────────────────────────────────────────────────────────────┘
        `);

        console.log('\n   DATOS CREADOS:');
        console.log('   • 2 Turnos (Administrativo y Rotativo)');
        console.log('   • 2 Feriados Argentina (20 y 21 Nov)');
        console.log('   • 1 Departamento (Desarrollo de Software)');
        console.log('   • 1 Kiosco de marcado');
        console.log('   • 2 Empleados con fichajes simulados');
        console.log('   • 2 Categorías salariales (por hora y mensual)');
        console.log('   • 2 Plantillas de liquidación (quincenal y mensual)');
        console.log('   • 2 Liquidaciones calculadas');
        console.log('\n' + '═'.repeat(75) + '\n');

    } catch (error) {
        log(`Error: ${error.message}`, 'error');
        console.error(error.stack);
    } finally {
        await sequelize.close();
    }
}

run();
