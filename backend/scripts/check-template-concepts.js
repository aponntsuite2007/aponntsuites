const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: 'Aedr15150302', database: 'attendance_system' });

async function check() {
    console.log('=== PLANTILLA ARG-2025 ===\n');

    const template = await pool.query(`
        SELECT * FROM payroll_templates WHERE template_code = 'ARG-2025'
    `);

    if (template.rows.length === 0) {
        console.log('*** PLANTILLA ARG-2025 NO EXISTE ***');
        await pool.end();
        return;
    }

    const t = template.rows[0];
    console.log('ID:', t.id);
    console.log('Nombre:', t.template_name);
    console.log('Company ID:', t.company_id);
    console.log('Frecuencia:', t.pay_frequency);
    console.log('Horas/mes:', t.work_hours_per_month);

    console.log('\n=== CONCEPTOS DE LA PLANTILLA ===\n');

    const concepts = await pool.query(`
        SELECT
            id, concept_code, concept_name, calculation_type,
            default_value, percentage_base, formula,
            employee_contribution_rate, employer_contribution_rate,
            is_mandatory, display_order, entity_id
        FROM payroll_template_concepts
        WHERE template_id = 5
        ORDER BY display_order
    `);

    if (concepts.rows.length === 0) {
        console.log('*** NO HAY CONCEPTOS CONFIGURADOS EN LA PLANTILLA ***');
        console.log('*** ESTO ES EL PROBLEMA - LA PLANTILLA ESTÁ VACÍA ***');
    } else {
        console.log('Total conceptos:', concepts.rows.length);
        console.log('\n--- DETALLE ---\n');

        concepts.rows.forEach(c => {
            const tipo = c.display_order < 10 ? 'HABER' : (c.display_order < 20 ? 'DEDUCCION' : 'CARGA_PATRONAL');
            console.log(`[${c.display_order}] ${c.concept_name} (${tipo})`);
            console.log(`    Calc: ${c.calculation_type} | Valor: ${c.default_value} | %Emp: ${c.employee_contribution_rate} | %Patron: ${c.employer_contribution_rate}`);
            if (c.formula) console.log(`    Formula: ${c.formula}`);
            if (c.entity_id) console.log(`    Entidad ID: ${c.entity_id}`);
            console.log('');
        });
    }

    await pool.end();
}
check();
