const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Aedr15150302',
    database: 'attendance_system'
});

async function checkConceptsAndAssignments() {
    try {
        // Ver conceptos por plantilla
        console.log('=== CONCEPTOS POR PLANTILLA ===');
        const concepts = await pool.query(`
            SELECT pt.template_code, tc.concept_name, tc.calculation_type,
                   tc.default_value, tc.employee_contribution_rate, tc.display_order
            FROM payroll_template_concepts tc
            JOIN payroll_templates pt ON tc.template_id = pt.id
            ORDER BY pt.template_code, tc.display_order
        `);
        let lastTemplate = '';
        concepts.rows.forEach(c => {
            if (c.template_code !== lastTemplate) {
                console.log('\n[' + c.template_code + ']');
                lastTemplate = c.template_code;
            }
            const value = c.calculation_type === 'percentage' ?
                (c.employee_contribution_rate || c.default_value) + '%' :
                c.default_value ? '$' + c.default_value : '';
            console.log('  ', c.display_order || '-', c.concept_name, value);
        });

        // Ver asignaciones
        console.log('\n\n=== ASIGNACIONES EMPLEADO-PLANTILLA ===');
        const assignments = await pool.query(`
            SELECT upa.*, u."firstName", u."lastName", pt.template_name
            FROM user_payroll_assignment upa
            JOIN users u ON upa.user_id = u.id
            JOIN payroll_templates pt ON upa.template_id = pt.id
            LIMIT 10
        `);
        if (assignments.rows.length === 0) {
            console.log('  (ninguna asignación)');
        } else {
            assignments.rows.forEach(a => console.log('  ', a.firstName, a.lastName, '->', a.template_name));
        }

        // Ver empleados de empresa 11 (ISI)
        console.log('\n=== EMPLEADOS EMPRESA 11 (ISI) ===');
        const users = await pool.query(`
            SELECT id, "firstName", "lastName", employee_code, department_id, base_salary
            FROM users
            WHERE company_id = 11 AND is_active = true
            LIMIT 10
        `);
        users.rows.forEach(u => console.log('  ', u.id, u.firstName, u.lastName, 'Legajo:', u.employee_code, 'Salario:', u.base_salary));

        // Ver si hay runs
        console.log('\n=== PAYROLL RUNS ===');
        const runs = await pool.query('SELECT * FROM payroll_runs ORDER BY created_at DESC LIMIT 5');
        if (runs.rows.length === 0) {
            console.log('  (ningún run de liquidación)');
        } else {
            runs.rows.forEach(r => console.log('  Run', r.run_id, '-', r.period_month + '/' + r.period_year, '[' + r.status + ']'));
        }

        // Ver entidades
        console.log('\n=== ENTIDADES RECEPTORAS ===');
        const entities = await pool.query('SELECT entity_id, entity_code, entity_name, entity_type, is_mandatory FROM payroll_entities');
        if (entities.rows.length === 0) {
            console.log('  (ninguna entidad)');
        } else {
            entities.rows.forEach(e => console.log('  ', e.entity_code, '-', e.entity_name, e.is_mandatory ? '[OBLIGATORIO]' : ''));
        }

        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkConceptsAndAssignments();
