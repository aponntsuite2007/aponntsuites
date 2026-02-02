/**
 * Análisis detallado del módulo Payroll
 */
const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

async function analyze() {
    console.log('='.repeat(70));
    console.log('📊 DETALLE DE CONCEPTOS Y CLASIFICACIONES PAYROLL');
    console.log('='.repeat(70));

    // 1. Clasificaciones
    const classifications = await pool.query(`
        SELECT id, classification_code, classification_name, sign, affects_employee_net, affects_employer_cost
        FROM payroll_concept_classifications ORDER BY id
    `);
    console.log('\n🏷️ CLASIFICACIONES (4 base universales):');
    classifications.rows.forEach(c => {
        console.log('   ' + c.id + '. ' + c.classification_code + ' (sign:' + c.sign + ', emp_net:' + c.affects_employee_net + ', emp_cost:' + c.affects_employer_cost + ')');
        console.log('      ' + c.classification_name);
    });

    // 2. Tipos de conceptos por clasificación
    const typesByClass = await pool.query(`
        SELECT c.classification_name, COUNT(t.id) as count
        FROM payroll_concept_classifications c
        LEFT JOIN payroll_concept_types t ON t.classification_id = c.id
        GROUP BY c.id, c.classification_name
        ORDER BY c.id
    `);
    console.log('\n📊 TIPOS DE CONCEPTOS POR CLASIFICACIÓN:');
    typesByClass.rows.forEach(t => console.log('   ' + t.classification_name + ': ' + t.count));

    // 3. Muestra de tipos de conceptos
    const conceptTypes = await pool.query(`
        SELECT t.type_code, t.type_name, c.classification_code,
               t.is_remunerative, t.is_taxable, t.is_mandatory
        FROM payroll_concept_types t
        JOIN payroll_concept_classifications c ON t.classification_id = c.id
        ORDER BY c.id, t.type_code
        LIMIT 20
    `);
    console.log('\n📋 MUESTRA DE TIPOS DE CONCEPTOS (20 primeros):');
    conceptTypes.rows.forEach(t => {
        const flags = [];
        if (t.is_remunerative) flags.push('REM');
        if (t.is_taxable) flags.push('TAX');
        if (t.is_mandatory) flags.push('OBL');
        console.log('   [' + t.classification_code + '] ' + t.type_code + ': ' + (t.type_name || '').slice(0, 30) + ' [' + flags.join(',') + ']');
    });

    // 4. Detalle de una plantilla con sus conceptos
    const template = await pool.query(`
        SELECT id, template_code, template_name, pay_frequency,
               calculation_basis, work_hours_per_day, work_days_per_week
        FROM payroll_templates
        WHERE is_current_version = true
        LIMIT 1
    `);

    if (template.rows.length > 0) {
        const t = template.rows[0];
        console.log('\n📋 PLANTILLA DE EJEMPLO:');
        console.log('   Código:', t.template_code);
        console.log('   Nombre:', t.template_name);
        console.log('   Frecuencia:', t.pay_frequency);
        console.log('   Base cálculo:', t.calculation_basis);
        console.log('   Horas/día:', t.work_hours_per_day);
        console.log('   Días/semana:', t.work_days_per_week);

        const concepts = await pool.query(`
            SELECT tc.display_order, tc.concept_code, tc.concept_name,
                   cc.classification_code, tc.default_value, tc.formula
            FROM payroll_template_concepts tc
            JOIN payroll_concept_types ct ON tc.concept_type_id = ct.id
            JOIN payroll_concept_classifications cc ON ct.classification_id = cc.id
            WHERE tc.template_id = $1
            ORDER BY tc.display_order
            LIMIT 10
        `, [t.id]);

        console.log('\n   CONCEPTOS DE LA PLANTILLA (primeros 10):');
        concepts.rows.forEach(c => {
            console.log('     ' + (c.display_order || '-') + '. [' + c.classification_code + '] ' + c.concept_code);
            if (c.formula) console.log('        Fórmula: ' + c.formula.slice(0, 50) + (c.formula.length > 50 ? '...' : ''));
            else if (c.default_value) console.log('        Valor: ' + c.default_value);
        });
    }

    // 5. Asignación de empleados
    const assignments = await pool.query(`
        SELECT upa.id, u."firstName", u."lastName", pt.template_name,
               upa.base_salary, sc.category_name
        FROM user_payroll_assignment upa
        JOIN users u ON upa.user_id = u.user_id
        JOIN payroll_templates pt ON upa.template_id = pt.id
        LEFT JOIN salary_categories_v2 sc ON upa.category_id = sc.id
        LIMIT 5
    `);
    console.log('\n👥 ASIGNACIONES EMPLEADO-PLANTILLA:');
    if (assignments.rows.length === 0) {
        console.log('   (ninguna asignación)');
    } else {
        assignments.rows.forEach(a => {
            console.log('   ' + a.firstName + ' ' + a.lastName + ' → ' + a.template_name);
            console.log('     Salario base: $' + a.base_salary + ' | Categoría: ' + (a.category_name || 'N/A'));
        });
    }

    // 6. Liquidaciones
    const runs = await pool.query(`
        SELECT id, period_year, period_month, status, total_employees,
               total_gross, total_deductions, total_net
        FROM payroll_runs
        ORDER BY created_at DESC
        LIMIT 3
    `);
    console.log('\n💰 ÚLTIMAS LIQUIDACIONES:');
    if (runs.rows.length === 0) {
        console.log('   (ninguna liquidación)');
    } else {
        runs.rows.forEach(r => {
            console.log('   ' + r.period_year + '/' + r.period_month + ' - ' + r.status);
            console.log('     Empleados: ' + r.total_employees + ' | Bruto: $' + r.total_gross + ' | Neto: $' + r.total_net);
        });
    }

    // 7. Verificar relaciones con otros módulos
    console.log('\n🔗 VERIFICACIÓN DE RELACIONES CON OTROS MÓDULOS:');

    // Usuarios con turno asignado
    const usersWithShift = await pool.query(`
        SELECT COUNT(*) as c FROM users WHERE shift_id IS NOT NULL AND company_id = 11
    `);
    console.log('   Usuarios con turno asignado: ' + usersWithShift.rows[0].c);

    // Usuarios con sucursal (para país)
    const usersWithBranch = await pool.query(`
        SELECT COUNT(*) as c FROM users WHERE branch_id IS NOT NULL AND company_id = 11
    `);
    console.log('   Usuarios con sucursal: ' + usersWithBranch.rows[0].c);

    // Datos de asistencia del mes actual
    const attendance = await pool.query(`
        SELECT COUNT(*) as c FROM attendance
        WHERE company_id = 11
        AND check_in >= DATE_TRUNC('month', CURRENT_DATE)
    `);
    console.log('   Registros asistencia mes actual: ' + attendance.rows[0].c);

    // Banco de horas
    const hourBank = await pool.query(`
        SELECT COUNT(*) as balances, SUM(current_balance)::numeric(10,2) as total
        FROM hour_bank_balances WHERE company_id = 11
    `);
    console.log('   Saldos banco de horas: ' + hourBank.rows[0].balances + ' (' + hourBank.rows[0].total + 'h)');

    // Convenios laborales
    const agreements = await pool.query(`
        SELECT COUNT(*) as c FROM labor_agreements_v2
    `);
    console.log('   Convenios laborales: ' + agreements.rows[0].c);

    // Categorías salariales
    const categories = await pool.query(`
        SELECT COUNT(*) as c FROM salary_categories_v2
    `);
    console.log('   Categorías salariales: ' + categories.rows[0].c);

    pool.end();
}

analyze().catch(e => {
    console.error('Error:', e.message);
    pool.end();
});
