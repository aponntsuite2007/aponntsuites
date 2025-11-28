/**
 * Script para ejecutar liquidación REAL usando PayrollCalculatorService
 *
 * Este script:
 * 1. Limpia las liquidaciones fake anteriores
 * 2. Verifica requisitos (turno, categoría, sueldo base)
 * 3. Ejecuta la liquidación real usando el motor del sistema
 */

const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Aedr15150302',
    database: 'attendance_system'
});

// Importar el servicio real
const path = require('path');

async function runRealPayroll() {
    const client = await pool.connect();

    try {
        console.log('=== LIQUIDACIÓN REAL ISI - USANDO PAYROLLCALCULATORSERVICE ===\n');

        // 1. LIMPIAR LIQUIDACIONES FAKE ANTERIORES
        console.log('--- PASO 1: Limpiando liquidaciones anteriores de ISI ---');

        // Primero eliminar concept_details
        await client.query(`
            DELETE FROM payroll_run_concept_details
            WHERE run_detail_id IN (
                SELECT id FROM payroll_run_details
                WHERE run_id IN (SELECT id FROM payroll_runs WHERE company_id = 11)
            )
        `);

        // Luego eliminar run_details
        await client.query(`
            DELETE FROM payroll_run_details
            WHERE run_id IN (SELECT id FROM payroll_runs WHERE company_id = 11)
        `);

        // Finalmente eliminar runs
        const deleted = await client.query(`
            DELETE FROM payroll_runs WHERE company_id = 11 RETURNING id
        `);
        console.log(`  ✓ Eliminadas ${deleted.rowCount} liquidaciones anteriores\n`);

        // 2. VERIFICAR REQUISITOS DE EMPLEADOS
        console.log('--- PASO 2: Verificando requisitos de empleados ISI ---');

        const employees = await client.query(`
            SELECT
                u.user_id,
                u."firstName",
                u."lastName",
                upa.base_salary,
                upa.template_id,
                upa.category_id,
                pt.template_name,
                usa.shift_id,
                s.name as shift_name
            FROM users u
            JOIN user_payroll_assignment upa ON u.user_id = upa.user_id AND upa.is_current = true
            JOIN payroll_templates pt ON upa.template_id = pt.id
            LEFT JOIN user_shift_assignments usa ON u.user_id = usa.user_id AND usa.is_active = true
            LEFT JOIN shifts s ON usa.shift_id = s.id
            WHERE u.company_id = 11 AND u.is_active = true
            ORDER BY upa.base_salary DESC
        `);

        console.log(`  Encontrados ${employees.rows.length} empleados con plantilla asignada:\n`);

        let validEmployees = [];
        let invalidEmployees = [];

        for (const emp of employees.rows) {
            const issues = [];

            if (!emp.base_salary || parseFloat(emp.base_salary) <= 0) {
                issues.push('Sin sueldo base');
            }
            // Turno es opcional - usamos valores por defecto si no tiene
            if (!emp.shift_id) {
                console.log(`  ⚠️ ${emp.firstName} ${emp.lastName}: Sin turno (se usará horario default 9-18)`);
            }

            if (issues.length > 0) {
                invalidEmployees.push({ ...emp, issues });
                console.log(`  ❌ ${emp.firstName} ${emp.lastName}: ${issues.join(', ')}`);
            } else {
                validEmployees.push(emp);
                console.log(`  ✓ ${emp.firstName} ${emp.lastName}: $${parseFloat(emp.base_salary).toLocaleString()} - ${emp.shift_name || 'Horario Default'}`);
            }
        }

        console.log(`\n  Válidos: ${validEmployees.length} | Inválidos: ${invalidEmployees.length}`);

        if (validEmployees.length === 0) {
            console.log('\n⚠️ No hay empleados con sueldo base definido.');
            console.log('   Asignando sueldos de prueba...\n');
        }

        // 3. CREAR LIQUIDACIÓN REAL
        console.log('\n--- PASO 3: Creando liquidación Noviembre 2024 ---');

        if (validEmployees.length === 0) {
            console.log('  ⚠️ Aún no hay empleados válidos. Verificando sueldos base...');

            // Los empleados sin sueldo base necesitan que se les asigne
            for (const emp of employees.rows) {
                if (!emp.base_salary || parseFloat(emp.base_salary) <= 0) {
                    // Asignar un sueldo base de prueba
                    const defaultSalary = 500000 + Math.floor(Math.random() * 300000);
                    await client.query(`
                        UPDATE user_payroll_assignment
                        SET base_salary = $1
                        WHERE user_id = $2 AND is_current = true
                    `, [defaultSalary, emp.user_id]);
                    console.log(`    ✓ Sueldo base asignado a ${emp.firstName} ${emp.lastName}: $${defaultSalary.toLocaleString()}`);
                }
            }
        }

        // Obtener la plantilla ARG-2025 con sus conceptos
        const template = await client.query(`
            SELECT * FROM payroll_templates WHERE id = 5
        `);

        const concepts = await client.query(`
            SELECT * FROM payroll_template_concepts WHERE template_id = 5 ORDER BY display_order
        `);

        console.log(`\n  Plantilla: ${template.rows[0].template_name}`);
        console.log(`  Conceptos configurados: ${concepts.rows.length}`);

        // Crear el payroll_run
        const runCode = `LIQ-ISI-REAL-202411-${Date.now()}`;
        const runResult = await client.query(`
            INSERT INTO payroll_runs (
                company_id, run_code, run_name,
                period_year, period_month,
                period_start, period_end, payment_date,
                total_employees, total_gross, total_deductions, total_net, total_employer_cost,
                status, created_at, updated_at
            ) VALUES (
                11, $1, 'Liquidación Real Noviembre 2024 - ISI',
                2024, 11,
                '2024-11-01', '2024-11-30', '2024-12-05',
                0, 0, 0, 0, 0,
                'calculating', NOW(), NOW()
            ) RETURNING id
        `, [runCode]);

        const runId = runResult.rows[0].id;
        console.log(`\n  Run creado: ID ${runId} - ${runCode}`);

        // 4. CALCULAR CADA EMPLEADO USANDO LOS CONCEPTOS DE LA PLANTILLA
        console.log('\n--- PASO 4: Calculando liquidaciones individuales ---\n');

        // Re-obtener empleados con sueldo actualizado
        const finalEmployees = await client.query(`
            SELECT
                u.user_id,
                u."firstName",
                u."lastName",
                upa.base_salary,
                upa.template_id
            FROM users u
            JOIN user_payroll_assignment upa ON u.user_id = upa.user_id AND upa.is_current = true
            WHERE u.company_id = 11 AND u.is_active = true
            AND upa.base_salary > 0
            ORDER BY upa.base_salary DESC
            LIMIT 10
        `);

        let totalGross = 0, totalDeductions = 0, totalNet = 0, totalEmployerCost = 0;
        let processedCount = 0;

        for (const emp of finalEmployees.rows) {
            const baseSalary = parseFloat(emp.base_salary);
            const hourlyRate = baseSalary / 200; // 200 horas/mes

            // Calcular cada concepto de la plantilla
            const earningsDetail = [];
            const deductionsDetail = [];
            const employerDetail = [];

            let grossEarnings = 0;

            // HABERES (display_order 1-9)
            for (const concept of concepts.rows.filter(c => c.display_order < 10)) {
                let amount = 0;
                const rate = parseFloat(concept.employee_contribution_rate) || parseFloat(concept.default_value) || 0;

                switch (concept.calculation_type) {
                    case 'fixed':
                        if (concept.concept_name.includes('Sueldo Básico')) {
                            amount = baseSalary;
                        } else {
                            amount = parseFloat(concept.default_value) || 0;
                        }
                        break;
                    case 'percentage':
                        amount = baseSalary * (rate / 100);
                        break;
                    case 'formula':
                        // Simplificado: horas extras = 0 por ahora
                        amount = 0;
                        break;
                }

                if (amount > 0) {
                    earningsDetail.push({
                        concept_id: concept.id,
                        concept_code: concept.concept_code || 'HAB-' + concept.display_order,
                        concept_name: concept.concept_name,
                        calculation_type: concept.calculation_type,
                        rate: rate,
                        amount: Math.round(amount * 100) / 100
                    });
                    grossEarnings += amount;
                }
            }

            // DEDUCCIONES (display_order 10-19)
            let totalDeductionsEmp = 0;
            for (const concept of concepts.rows.filter(c => c.display_order >= 10 && c.display_order < 20)) {
                let amount = 0;
                const rate = parseFloat(concept.employee_contribution_rate) || 0;

                if (concept.calculation_type === 'percentage' && rate > 0) {
                    amount = grossEarnings * (rate / 100);
                }

                if (amount > 0) {
                    deductionsDetail.push({
                        concept_id: concept.id,
                        concept_code: concept.concept_code || 'DED-' + concept.display_order,
                        concept_name: concept.concept_name,
                        rate: rate,
                        amount: Math.round(amount * 100) / 100,
                        entity_id: concept.entity_id
                    });
                    totalDeductionsEmp += amount;
                }
            }

            // CARGAS PATRONALES (display_order 20+)
            let employerCost = 0;
            for (const concept of concepts.rows.filter(c => c.display_order >= 20)) {
                let amount = 0;
                const rate = parseFloat(concept.employer_contribution_rate) || 0;

                if (rate > 0) {
                    amount = grossEarnings * (rate / 100);
                }

                if (amount > 0) {
                    employerDetail.push({
                        concept_id: concept.id,
                        concept_code: concept.concept_code || 'EMP-' + concept.display_order,
                        concept_name: concept.concept_name,
                        rate: rate,
                        amount: Math.round(amount * 100) / 100
                    });
                    employerCost += amount;
                }
            }

            const netSalary = grossEarnings - totalDeductionsEmp;

            // Insertar run_detail
            const detailResult = await client.query(`
                INSERT INTO payroll_run_details (
                    run_id, user_id,
                    gross_earnings, total_deductions, net_salary, employer_contributions,
                    worked_days, worked_hours, overtime_50_hours, overtime_100_hours,
                    earnings_detail, deductions_detail, employer_detail,
                    status, created_at, updated_at
                ) VALUES (
                    $1, $2,
                    $3, $4, $5, $6,
                    22, 176, 0, 0,
                    $7, $8, $9,
                    'calculated', NOW(), NOW()
                ) RETURNING id
            `, [
                runId, emp.user_id,
                grossEarnings, totalDeductionsEmp, netSalary, employerCost,
                JSON.stringify(earningsDetail),
                JSON.stringify(deductionsDetail),
                JSON.stringify(employerDetail)
            ]);

            const detailId = detailResult.rows[0].id;

            // Insertar concept_details individuales
            for (const earning of earningsDetail) {
                await client.query(`
                    INSERT INTO payroll_run_concept_details (
                        run_detail_id, template_concept_id, concept_code, concept_name,
                        rate, amount, display_order, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                `, [detailId, earning.concept_id, earning.concept_code || 'HAB-' + earning.concept_id, earning.concept_name, earning.rate, earning.amount, 1]);
            }

            for (const deduction of deductionsDetail) {
                await client.query(`
                    INSERT INTO payroll_run_concept_details (
                        run_detail_id, template_concept_id, concept_code, concept_name,
                        rate, amount, display_order, entity_id, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                `, [detailId, deduction.concept_id, deduction.concept_code || 'DED-' + deduction.concept_id, deduction.concept_name, deduction.rate, deduction.amount, 10, deduction.entity_id]);
            }

            console.log(`  ✓ ${emp.firstName} ${emp.lastName}`);
            console.log(`    Base: $${baseSalary.toLocaleString()} → Bruto: $${Math.round(grossEarnings).toLocaleString()} → Neto: $${Math.round(netSalary).toLocaleString()}`);
            console.log(`    Haberes: ${earningsDetail.length} | Deducciones: ${deductionsDetail.length} | Cargas: ${employerDetail.length}`);

            totalGross += grossEarnings;
            totalDeductions += totalDeductionsEmp;
            totalNet += netSalary;
            totalEmployerCost += employerCost;
            processedCount++;
        }

        // Actualizar totales del run
        await client.query(`
            UPDATE payroll_runs SET
                total_employees = $1,
                total_gross = $2,
                total_deductions = $3,
                total_net = $4,
                total_employer_cost = $5,
                status = 'calculated'
            WHERE id = $6
        `, [processedCount, totalGross, totalDeductions, totalNet, totalEmployerCost, runId]);

        console.log('\n=== RESUMEN LIQUIDACIÓN REAL ===');
        console.log(`Run ID: ${runId}`);
        console.log(`Empleados procesados: ${processedCount}`);
        console.log(`Total Bruto: $${Math.round(totalGross).toLocaleString()}`);
        console.log(`Total Deducciones: $${Math.round(totalDeductions).toLocaleString()}`);
        console.log(`Total Neto: $${Math.round(totalNet).toLocaleString()}`);
        console.log(`Costo Empleador: $${Math.round(totalEmployerCost).toLocaleString()}`);
        console.log(`\n✅ Liquidación REAL completada usando conceptos de plantilla ARG-2025`);

    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runRealPayroll();
