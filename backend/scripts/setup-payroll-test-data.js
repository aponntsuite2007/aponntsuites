/**
 * Script para crear datos de prueba completos para el módulo de Payroll
 * Usa empleados existentes, los asigna a plantillas, y ejecuta una liquidación
 */

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Aedr15150302',
    database: 'attendance_system'
});

async function setupPayrollTestData() {
    const client = await pool.connect();

    try {
        console.log('=== CONFIGURANDO DATOS DE PRUEBA PAYROLL ===\n');

        await client.query('BEGIN');

        // 1. Obtener la plantilla ARG-2025 (id=5)
        const templateResult = await client.query(
            "SELECT id FROM payroll_templates WHERE template_code = 'ARG-2025'"
        );

        if (templateResult.rows.length === 0) {
            throw new Error('Plantilla ARG-2025 no encontrada');
        }
        const templateId = templateResult.rows[0].id;
        console.log('✓ Plantilla ARG-2025 encontrada (id:', templateId, ')');

        // 2. Obtener empleados existentes de empresa 11 (ISI)
        console.log('\n--- Obteniendo empleados de ISI ---');
        const usersResult = await client.query(`
            SELECT user_id, "firstName", "lastName", salary
            FROM users
            WHERE company_id = 11 AND is_active = true
            LIMIT 10
        `);

        if (usersResult.rows.length === 0) {
            throw new Error('No hay empleados en empresa 11');
        }

        // Salarios realistas para asignar
        const salarios = [650000, 520000, 480000, 750000, 420000, 580000, 450000, 380000, 550000, 620000];

        const empleados = usersResult.rows.map((u, i) => ({
            user_id: u.user_id,
            firstName: u.firstName,
            lastName: u.lastName,
            salary: salarios[i] || 500000
        }));

        console.log(`  Encontrados ${empleados.length} empleados`);

        // 3. Asignar empleados a la plantilla con salarios
        console.log('\n--- Asignando empleados a plantilla ARG-2025 ---');

        for (const user of empleados) {
            // Verificar si ya tiene asignación
            const existingAssign = await client.query(
                'SELECT id FROM user_payroll_assignment WHERE user_id = $1 AND is_current = true',
                [user.user_id]
            );

            if (existingAssign.rows.length > 0) {
                // Actualizar salario
                await client.query(
                    'UPDATE user_payroll_assignment SET base_salary = $1, template_id = $2 WHERE user_id = $3 AND is_current = true',
                    [user.salary, templateId, user.user_id]
                );
                console.log(`  → ${user.firstName} ${user.lastName}: actualizado salario $${user.salary.toLocaleString()}`);
            } else {
                // Crear asignación
                await client.query(`
                    INSERT INTO user_payroll_assignment (
                        user_id, company_id, template_id, base_salary,
                        calculation_basis, effective_from, is_current, created_at, updated_at
                    ) VALUES ($1, 11, $2, $3, 'monthly', '2024-01-01', true, NOW(), NOW())
                `, [user.user_id, templateId, user.salary]);
                console.log(`  ✓ ${user.firstName} ${user.lastName}: asignado con salario $${user.salary.toLocaleString()}`);
            }
        }

        // 4. Crear liquidación de Noviembre 2024
        console.log('\n--- Creando liquidación Noviembre 2024 ---');

        const runCode = `LIQ-ISI-202411-${Date.now()}`;
        const runResult = await client.query(`
            INSERT INTO payroll_runs (
                company_id, run_code, run_name,
                period_year, period_month,
                period_start, period_end, payment_date,
                total_employees, total_gross, total_deductions, total_net, total_employer_cost,
                status, created_at, updated_at
            ) VALUES (
                11, $1, 'Liquidación Noviembre 2024 - ISI Tecnología',
                2024, 11,
                '2024-11-01', '2024-11-30', '2024-12-05',
                $2, 0, 0, 0, 0,
                'draft', NOW(), NOW()
            ) RETURNING id
        `, [runCode, empleados.length]);

        const runId = runResult.rows[0].id;
        console.log(`  ✓ Run creado: ${runCode} (id: ${runId})`);

        // 5. Calcular y crear detalles para cada empleado
        console.log('\n--- Calculando liquidaciones individuales ---');

        let totalGross = 0, totalDeductions = 0, totalNet = 0, totalEmployerCost = 0;

        for (const user of empleados) {
            // Calcular conceptos
            const baseSalary = user.salary;
            const presentismo = baseSalary * 0.0833; // 8.33%
            const antiguedad = baseSalary * 0.02; // 2% (2 años)
            const grossEarnings = baseSalary + presentismo + antiguedad;

            // Deducciones empleado
            const jubilacion = grossEarnings * 0.11; // 11%
            const obraSocial = grossEarnings * 0.03; // 3%
            const pami = grossEarnings * 0.03; // 3%
            const sindicato = grossEarnings * 0.025; // 2.5%
            const totalDeduccionesEmp = jubilacion + obraSocial + pami + sindicato;

            // Cargas patronales
            const contribJubilacion = grossEarnings * 0.1017;
            const contribObraSocial = grossEarnings * 0.06;
            const contribPami = grossEarnings * 0.015;
            const asignFamiliares = grossEarnings * 0.0444;
            const fne = grossEarnings * 0.0089;
            const art = grossEarnings * 0.025;
            const employerCost = contribJubilacion + contribObraSocial + contribPami + asignFamiliares + fne + art;

            const netSalary = grossEarnings - totalDeduccionesEmp;

            // Insertar detalle del run
            const earningsDetail = JSON.stringify([
                { concept: 'Sueldo Básico', amount: baseSalary },
                { concept: 'Presentismo', amount: presentismo },
                { concept: 'Antigüedad', amount: antiguedad }
            ]);
            const deductionsDetail = JSON.stringify([
                { concept: 'Jubilación 11%', amount: jubilacion },
                { concept: 'Obra Social 3%', amount: obraSocial },
                { concept: 'PAMI 3%', amount: pami },
                { concept: 'Cuota Sindical 2.5%', amount: sindicato }
            ]);
            const employerDetail = JSON.stringify([
                { concept: 'Contrib. Jubilación', amount: contribJubilacion },
                { concept: 'Contrib. Obra Social', amount: contribObraSocial },
                { concept: 'Contrib. PAMI', amount: contribPami },
                { concept: 'Asig. Familiares', amount: asignFamiliares },
                { concept: 'FNE', amount: fne },
                { concept: 'ART', amount: art }
            ]);

            await client.query(`
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
            `, [runId, user.user_id, grossEarnings, totalDeduccionesEmp, netSalary, employerCost, earningsDetail, deductionsDetail, employerDetail]);

            console.log(`  ✓ ${user.firstName} ${user.lastName}: Bruto $${Math.round(grossEarnings).toLocaleString()} | Neto $${Math.round(netSalary).toLocaleString()}`);

            totalGross += grossEarnings;
            totalDeductions += totalDeduccionesEmp;
            totalNet += netSalary;
            totalEmployerCost += employerCost;
        }

        // 6. Actualizar totales del run
        await client.query(`
            UPDATE payroll_runs SET
                total_gross = $1,
                total_deductions = $2,
                total_net = $3,
                total_employer_cost = $4,
                status = 'calculated'
            WHERE id = $5
        `, [totalGross, totalDeductions, totalNet, totalEmployerCost, runId]);

        await client.query('COMMIT');

        console.log('\n=== RESUMEN ===');
        console.log(`Empleados procesados: ${empleados.length}`);
        console.log(`Total Bruto: $${Math.round(totalGross).toLocaleString()}`);
        console.log(`Total Deducciones: $${Math.round(totalDeductions).toLocaleString()}`);
        console.log(`Total Neto: $${Math.round(totalNet).toLocaleString()}`);
        console.log(`Costo Empleador: $${Math.round(totalEmployerCost).toLocaleString()}`);
        console.log(`\nRun ID: ${runId}`);
        console.log(`Period: 11/2024`);
        console.log(`Status: calculated`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

setupPayrollTestData();
