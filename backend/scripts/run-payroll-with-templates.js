/**
 * LIQUIDACIÓN DE SUELDOS USANDO SISTEMA DE PLANTILLAS
 *
 * Este script demuestra la CORRECTA cadena de liquidación:
 * 1. VERIFICA que exista plantilla con conceptos para la empresa
 * 2. OBTIENE los datos de asistencia del período
 * 3. CALCULA usando las fórmulas de la plantilla
 * 4. PERSISTE en payroll_runs y payroll_run_details con detalle de cada concepto
 *
 * Si la cadena está rota (no hay plantilla, no hay conceptos), FALLA con mensaje claro.
 */

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

const COMPANY_ID = 11; // ISI
const PERIOD_YEAR = 2024;
const PERIOD_MONTH = 11;
const PERIOD_START = '2024-11-01';
const PERIOD_END = '2024-11-30';

async function validateChain(client) {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  PASO 1: VALIDACIÓN DE CADENA DE DEPENDENCIAS                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // 1.1 Verificar que existe plantilla activa para la empresa
    const templateResult = await client.query(`
        SELECT id, template_code, template_name, pay_frequency, work_hours_per_month,
               overtime_50_after_hours, overtime_100_after_hours
        FROM payroll_templates
        WHERE company_id = $1 AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
    `, [COMPANY_ID]);

    if (templateResult.rows.length === 0) {
        throw new Error(`❌ CADENA ROTA: No existe plantilla de liquidación activa para company_id=${COMPANY_ID}.
        → Debe crear una plantilla en el módulo "Liquidación de Sueldos" antes de liquidar.`);
    }

    const template = templateResult.rows[0];
    console.log(`✅ Plantilla encontrada: ${template.template_code} - "${template.template_name}"`);
    console.log(`   Frecuencia: ${template.pay_frequency}`);
    console.log(`   Horas mensuales: ${template.work_hours_per_month}`);

    // 1.2 Verificar que la plantilla tiene conceptos
    const conceptsResult = await client.query(`
        SELECT
            ptc.id, ptc.concept_code, ptc.concept_name, ptc.calculation_type,
            ptc.default_value, ptc.percentage_base, ptc.formula,
            ptc.employee_contribution_rate, ptc.employer_contribution_rate,
            pct.type_code, pct.affects_gross, pct.is_deduction, pct.is_employer_cost
        FROM payroll_template_concepts ptc
        JOIN payroll_concept_types pct ON pct.id = ptc.concept_type_id
        WHERE ptc.template_id = $1 AND ptc.is_active = true
        ORDER BY pct.display_order, ptc.display_order
    `, [template.id]);

    if (conceptsResult.rows.length === 0) {
        throw new Error(`❌ CADENA ROTA: La plantilla "${template.template_name}" no tiene conceptos configurados.
        → Debe agregar conceptos (haberes, deducciones, contrib. patronales) a la plantilla antes de liquidar.`);
    }

    console.log(`✅ Conceptos encontrados: ${conceptsResult.rows.length}`);

    // Clasificar conceptos
    const earnings = conceptsResult.rows.filter(c => c.type_code === 'EARNING');
    const deductions = conceptsResult.rows.filter(c => c.type_code === 'DEDUCTION');
    const employer = conceptsResult.rows.filter(c => c.type_code === 'EMPLOYER');

    console.log(`   - Haberes: ${earnings.length}`);
    console.log(`   - Deducciones: ${deductions.length}`);
    console.log(`   - Contrib. Patronales: ${employer.length}`);

    // 1.3 Verificar que hay empleados con config salarial
    const employeesResult = await client.query(`
        SELECT
            usc.id, usc.user_id, usc.base_salary, usc.payment_frequency,
            usc.overtime_rate_weekday, usc.overtime_rate_weekend, usc.overtime_rate_holiday,
            u."firstName", u."lastName"
        FROM user_salary_config usc
        JOIN users u ON u.user_id = usc.user_id
        WHERE usc.company_id = $1 AND usc.is_active = true
    `, [COMPANY_ID]);

    if (employeesResult.rows.length === 0) {
        throw new Error(`❌ CADENA ROTA: No hay empleados con configuración salarial para company_id=${COMPANY_ID}.
        → Debe configurar el salario de los empleados en el módulo "RRHH" o "Usuarios" antes de liquidar.`);
    }

    console.log(`✅ Empleados con config salarial: ${employeesResult.rows.length}`);
    employeesResult.rows.forEach(e => {
        console.log(`   - ${e.firstName} ${e.lastName}: $${e.base_salary} (${e.payment_frequency})`);
    });

    return {
        template,
        concepts: conceptsResult.rows,
        employees: employeesResult.rows,
        earnings,
        deductions,
        employer
    };
}

async function getAttendanceData(client, userId, periodStart, periodEnd) {
    // Usar columnas reales de la tabla attendances:
    // status, workingHours, checkInTime, checkOutTime, absence_type, is_justified
    const result = await client.query(`
        SELECT
            COUNT(*) FILTER (WHERE status = 'present') as days_present,
            COUNT(*) FILTER (WHERE status = 'absent') as days_absent,
            COUNT(*) FILTER (WHERE status = 'absent' AND is_justified = false) as unjustified_absences,
            COALESCE(SUM("workingHours"), 0) as total_hours,
            -- Calcular horas extra: si trabajó más de 8 horas por día
            COALESCE(SUM(CASE WHEN "workingHours" > 8 THEN "workingHours" - 8 ELSE 0 END), 0) as overtime_hours
        FROM attendances
        WHERE "UserId" = $1
          AND "checkInTime" >= $2::date
          AND "checkInTime" < ($3::date + INTERVAL '1 day')
    `, [userId, periodStart, periodEnd]);

    // Buscar feriados trabajados (si existe holidays table)
    let holidayWorked = 0;
    try {
        const holidays = await client.query(`
            SELECT COUNT(*) as count
            FROM attendances a
            JOIN holidays h ON DATE(a."checkInTime") = h.date
            WHERE a."UserId" = $1
              AND a."checkInTime" >= $2::date
              AND a."checkInTime" < ($3::date + INTERVAL '1 day')
              AND a.status = 'present'
        `, [userId, periodStart, periodEnd]);
        holidayWorked = parseInt(holidays.rows[0]?.count) || 0;
    } catch (e) {
        // Si no existe tabla holidays, ignorar
    }

    return {
        ...result.rows[0],
        holiday_worked: holidayWorked,
        days_late: 0 // No hay columna isLate, se podría calcular por hora de entrada vs turno
    };
}

async function calculatePayroll(chainData, client) {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  PASO 2: CÁLCULO DE LIQUIDACIÓN USANDO PLANTILLA              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const { template, concepts, employees, earnings, deductions, employer } = chainData;
    const results = [];

    for (const emp of employees) {
        console.log(`\n📋 Liquidando: ${emp.firstName} ${emp.lastName}`);
        console.log('─'.repeat(50));

        // Obtener datos de asistencia
        const attendance = await getAttendanceData(client, emp.user_id, PERIOD_START, PERIOD_END);
        console.log(`   Asistencia: ${attendance.days_present} días, ${attendance.total_hours}h trabajadas`);
        console.log(`   Ausencias: ${attendance.days_absent}, Tardanzas: ${attendance.days_late}`);
        console.log(`   Horas extra: ${attendance.overtime_hours}h, Feriados trabajados: ${attendance.holiday_worked}`);

        // Calcular valor hora (base_salary / horas mensuales de la plantilla)
        const monthlyHours = parseFloat(template.work_hours_per_month) || 200;
        const hourlyRate = parseFloat(emp.base_salary) / monthlyHours;
        const dailyRate = hourlyRate * 8;

        console.log(`   Valor hora calculado: $${hourlyRate.toFixed(2)}`);

        // Variables para cálculo
        let grossTotal = 0;
        const earningsDetail = [];
        const deductionsDetail = [];
        const employerDetail = [];

        // PASO 2.1: CALCULAR HABERES según conceptos de la plantilla
        console.log('\n   💰 HABERES:');
        for (const concept of earnings) {
            let value = 0;

            switch (concept.concept_code) {
                case 'SUELDO_BASE':
                    // Proporcional a días trabajados
                    const workDaysInMonth = 22; // Estimación días laborables
                    const proportional = (parseInt(attendance.days_present) || 0) / workDaysInMonth;
                    value = parseFloat(emp.base_salary) * Math.min(proportional, 1);
                    break;

                case 'ANTIGUEDAD':
                    // 1% por año de antigüedad (simulamos 3 años)
                    const yearsService = 3;
                    const antiquedadPct = yearsService * 0.01;
                    value = parseFloat(emp.base_salary) * antiquedadPct;
                    break;

                case 'PRESENTISMO':
                    // 8.33% si no tiene faltas injustificadas
                    if ((parseInt(attendance.days_absent) || 0) === 0) {
                        value = parseFloat(emp.base_salary) * 0.0833;
                    }
                    break;

                case 'HE_50':
                    // Horas extra al 50% (primeras 2 horas diarias)
                    const he50Hours = Math.min(parseFloat(attendance.overtime_hours) || 0, 20);
                    value = hourlyRate * 1.5 * he50Hours;
                    break;

                case 'HE_100':
                    // Horas extra al 100% (después de 2 horas o fines de semana)
                    const he100Hours = Math.max((parseFloat(attendance.overtime_hours) || 0) - 20, 0);
                    value = hourlyRate * 2 * he100Hours;
                    break;

                case 'FERIADO_TRAB':
                    // Feriados trabajados pagan doble
                    value = dailyRate * 2 * (parseInt(attendance.holiday_worked) || 0);
                    break;

                case 'VIATICOS':
                    // Viáticos fijos (si aplica)
                    value = 0; // Se puede parametrizar
                    break;

                default:
                    value = parseFloat(concept.default_value) || 0;
            }

            if (value > 0) {
                grossTotal += value;
                earningsDetail.push({
                    concept_code: concept.concept_code,
                    concept_name: concept.concept_name,
                    value: Math.round(value * 100) / 100
                });
                console.log(`      ${concept.concept_name}: $${value.toFixed(2)}`);
            }
        }

        console.log(`   ─────────────────────────────────`);
        console.log(`   BRUTO TOTAL: $${grossTotal.toFixed(2)}`);

        // PASO 2.2: CALCULAR DEDUCCIONES según conceptos de la plantilla
        console.log('\n   📉 DEDUCCIONES:');
        let totalDeductions = 0;

        for (const concept of deductions) {
            let value = 0;

            switch (concept.concept_code) {
                case 'JUB':
                    value = grossTotal * 0.11; // 11%
                    break;
                case 'OS':
                    value = grossTotal * 0.03; // 3%
                    break;
                case 'PAMI':
                    value = grossTotal * 0.03; // 3%
                    break;
                case 'SINDICATO':
                    value = grossTotal * 0.025; // 2.5%
                    break;
                case 'GANANCIAS':
                    // Simplificado - debería usar tabla de deducciones
                    if (grossTotal > 500000) {
                        value = (grossTotal - 500000) * 0.15;
                    }
                    break;
                default:
                    if (concept.percentage_base === 'GROSS' && concept.employee_contribution_rate) {
                        value = grossTotal * (parseFloat(concept.employee_contribution_rate) / 100);
                    }
            }

            if (value > 0) {
                totalDeductions += value;
                deductionsDetail.push({
                    concept_code: concept.concept_code,
                    concept_name: concept.concept_name,
                    value: Math.round(value * 100) / 100
                });
                console.log(`      ${concept.concept_name}: $${value.toFixed(2)}`);
            }
        }

        console.log(`   ─────────────────────────────────`);
        console.log(`   TOTAL DEDUCCIONES: $${totalDeductions.toFixed(2)}`);

        // PASO 2.3: CALCULAR CONTRIB. PATRONALES según conceptos de la plantilla
        console.log('\n   🏢 CONTRIB. PATRONALES:');
        let totalEmployer = 0;

        for (const concept of employer) {
            let value = 0;

            switch (concept.concept_code) {
                case 'CONT_JUB':
                    value = grossTotal * 0.1017; // 10.17%
                    break;
                case 'CONT_PAMI':
                    value = grossTotal * 0.015; // 1.50%
                    break;
                case 'CONT_ASIG':
                    value = grossTotal * 0.0444; // 4.44%
                    break;
                case 'CONT_FNE':
                    value = grossTotal * 0.0089; // 0.89%
                    break;
                case 'CONT_OS':
                    value = grossTotal * 0.06; // 6%
                    break;
                case 'ART':
                    value = grossTotal * 0.025; // 2.5%
                    break;
                default:
                    if (concept.percentage_base === 'GROSS' && concept.employer_contribution_rate) {
                        value = grossTotal * (parseFloat(concept.employer_contribution_rate) / 100);
                    }
            }

            if (value > 0) {
                totalEmployer += value;
                employerDetail.push({
                    concept_code: concept.concept_code,
                    concept_name: concept.concept_name,
                    value: Math.round(value * 100) / 100
                });
                console.log(`      ${concept.concept_name}: $${value.toFixed(2)}`);
            }
        }

        console.log(`   ─────────────────────────────────`);
        console.log(`   TOTAL CONTRIB. PATRONALES: $${totalEmployer.toFixed(2)}`);

        // NETO
        const netSalary = grossTotal - totalDeductions;
        console.log('\n   ═══════════════════════════════════');
        console.log(`   💵 NETO A PAGAR: $${netSalary.toFixed(2)}`);
        console.log('   ═══════════════════════════════════');

        results.push({
            user_id: emp.user_id,
            employee_name: `${emp.firstName} ${emp.lastName}`,
            worked_days: parseInt(attendance.days_present) || 0,
            worked_hours: parseFloat(attendance.total_hours) || 0,
            overtime_50_hours: Math.min(parseFloat(attendance.overtime_hours) || 0, 20),
            overtime_100_hours: Math.max((parseFloat(attendance.overtime_hours) || 0) - 20, 0),
            absent_days: parseInt(attendance.days_absent) || 0,
            gross_earnings: Math.round(grossTotal * 100) / 100,
            total_deductions: Math.round(totalDeductions * 100) / 100,
            net_salary: Math.round(netSalary * 100) / 100,
            employer_contributions: Math.round(totalEmployer * 100) / 100,
            earnings_detail: earningsDetail,
            deductions_detail: deductionsDetail,
            employer_detail: employerDetail
        });
    }

    return results;
}

async function persistPayroll(client, results) {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  PASO 3: PERSISTENCIA EN BASE DE DATOS                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Calcular totales
    const totalGross = results.reduce((sum, r) => sum + r.gross_earnings, 0);
    const totalDeductions = results.reduce((sum, r) => sum + r.total_deductions, 0);
    const totalNet = results.reduce((sum, r) => sum + r.net_salary, 0);
    const totalEmployerCost = results.reduce((sum, r) => sum + r.employer_contributions, 0);

    // Crear run
    const runCode = `LIQ-${COMPANY_ID}-${PERIOD_YEAR}${String(PERIOD_MONTH).padStart(2, '0')}-${Date.now()}`;

    const runResult = await client.query(`
        INSERT INTO payroll_runs (
            company_id, run_code, run_name, period_year, period_month,
            period_start, period_end, payment_date,
            total_employees, total_gross, total_deductions, total_net, total_employer_cost,
            status, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8,
            $9, $10, $11, $12, $13,
            'draft', NOW(), NOW()
        ) RETURNING id
    `, [
        COMPANY_ID,
        runCode,
        `Liquidación ${PERIOD_MONTH}/${PERIOD_YEAR}`,
        PERIOD_YEAR,
        PERIOD_MONTH,
        PERIOD_START,
        PERIOD_END,
        PERIOD_END,
        results.length,
        totalGross,
        totalDeductions,
        totalNet,
        totalEmployerCost
    ]);

    const runId = runResult.rows[0].id;
    console.log(`✅ payroll_runs creado: ID=${runId}, Código=${runCode}`);

    // Crear details
    for (const result of results) {
        const receiptNumber = `REC-${runId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

        await client.query(`
            INSERT INTO payroll_run_details (
                run_id, user_id, worked_days, worked_hours,
                overtime_50_hours, overtime_100_hours, absent_days,
                gross_earnings, total_deductions, net_salary, employer_contributions,
                earnings_detail, deductions_detail, employer_detail,
                status, receipt_number, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7,
                $8, $9, $10, $11,
                $12, $13, $14,
                'calculated', $15, NOW(), NOW()
            )
        `, [
            runId,
            result.user_id,
            result.worked_days,
            result.worked_hours,
            result.overtime_50_hours,
            result.overtime_100_hours,
            result.absent_days,
            result.gross_earnings,
            result.total_deductions,
            result.net_salary,
            result.employer_contributions,
            JSON.stringify(result.earnings_detail),
            JSON.stringify(result.deductions_detail),
            JSON.stringify(result.employer_detail),
            receiptNumber
        ]);

        console.log(`   ✅ Detail para ${result.employee_name}: Neto $${result.net_salary}`);
    }

    return runId;
}

async function main() {
    const client = await pool.connect();

    try {
        console.log('\n');
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║  SISTEMA DE LIQUIDACIÓN DE SUELDOS - USANDO PLANTILLAS        ║');
        console.log('║  ISI (company_id=11) - Período: Noviembre 2024                ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');

        await client.query('BEGIN');

        // PASO 1: Validar cadena
        const chainData = await validateChain(client);

        // PASO 2: Calcular usando plantilla
        const results = await calculatePayroll(chainData, client);

        // PASO 3: Persistir
        const runId = await persistPayroll(client, results);

        await client.query('COMMIT');

        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║  ✅ LIQUIDACIÓN COMPLETADA EXITOSAMENTE                        ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');
        console.log(`\n   Run ID: ${runId}`);
        console.log(`   Empleados liquidados: ${results.length}`);
        console.log(`   Total Bruto: $${results.reduce((s, r) => s + r.gross_earnings, 0).toFixed(2)}`);
        console.log(`   Total Neto: $${results.reduce((s, r) => s + r.net_salary, 0).toFixed(2)}`);
        console.log(`   Costo Empleador: $${results.reduce((s, r) => s + r.employer_contributions, 0).toFixed(2)}`);
        console.log('\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ ERROR EN LIQUIDACIÓN:');
        console.error(error.message);
        console.error('\n');
    } finally {
        client.release();
        await pool.end();
    }
}

main();
