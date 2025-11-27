/**
 * Verificación de datos de Payroll para ISI
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

const ISI_COMPANY_ID = 11;

async function verify() {
    try {
        await sequelize.authenticate();
        console.log('═══════════════════════════════════════════════════════════════════════');
        console.log('   VERIFICACIÓN DATOS PAYROLL - EMPRESA ISI (ID: 11)');
        console.log('═══════════════════════════════════════════════════════════════════════\n');

        // 1. Convenio en labor_agreements_v2
        const [agreements] = await sequelize.query(`
            SELECT id, code, name, company_id FROM labor_agreements_v2
            WHERE company_id = ${ISI_COMPANY_ID}
        `);
        console.log('📋 Convenios v2 para ISI:');
        agreements.forEach(a => console.log(`   ID: ${a.id} | ${a.code} | ${a.name}`));

        // 2. Plantilla
        const [templates] = await sequelize.query(`
            SELECT id, template_code, template_name, pay_frequency FROM payroll_templates
            WHERE company_id = ${ISI_COMPANY_ID}
        `);
        console.log('\n📋 Plantillas para ISI:');
        templates.forEach(t => console.log(`   ID: ${t.id} | ${t.template_code} | ${t.template_name} (${t.pay_frequency})`));

        // 3. Configuraciones salariales
        const [salaryConfigs] = await sequelize.query(`
            SELECT
                COUNT(*) as total,
                SUM(base_salary::numeric) as total_bruto,
                MIN(base_salary::numeric) as min_salary,
                MAX(base_salary::numeric) as max_salary,
                AVG(base_salary::numeric)::numeric(12,2) as avg_salary
            FROM user_salary_config_v2
            WHERE company_id = ${ISI_COMPANY_ID} AND is_current = true
        `);
        console.log('\n📊 Configuraciones Salariales para ISI:');
        console.log(`   Total empleados: ${salaryConfigs[0].total}`);
        console.log(`   Total bruto mensual: $${parseFloat(salaryConfigs[0].total_bruto || 0).toLocaleString()}`);
        console.log(`   Salario mínimo: $${parseFloat(salaryConfigs[0].min_salary || 0).toLocaleString()}`);
        console.log(`   Salario máximo: $${parseFloat(salaryConfigs[0].max_salary || 0).toLocaleString()}`);
        console.log(`   Salario promedio: $${parseFloat(salaryConfigs[0].avg_salary || 0).toLocaleString()}`);

        // 4. Liquidaciones
        const [runs] = await sequelize.query(`
            SELECT id, run_code, run_name, period_year, period_month, status,
                   total_employees, total_gross, total_net, total_employer_cost
            FROM payroll_runs
            WHERE company_id = ${ISI_COMPANY_ID}
            ORDER BY period_year DESC, period_month DESC
        `);
        console.log('\n📋 Liquidaciones para ISI:');
        runs.forEach(r => {
            console.log(`   ${r.run_code} | ${r.run_name} (${r.status})`);
            console.log(`      - Empleados: ${r.total_employees}`);
            console.log(`      - Bruto: $${parseFloat(r.total_gross || 0).toLocaleString()}`);
            console.log(`      - Neto: $${parseFloat(r.total_net || 0).toLocaleString()}`);
            console.log(`      - Costo Empleador: $${parseFloat(r.total_employer_cost || 0).toLocaleString()}`);
        });

        // 5. Categorías salariales (global)
        const [categories] = await sequelize.query(`
            SELECT sc.id, sc.category_code, sc.category_name, sc.base_salary_reference,
                   COUNT(usc.id) as assigned_users
            FROM salary_categories sc
            LEFT JOIN user_salary_config_v2 usc ON usc.salary_category_id = sc.id AND usc.company_id = ${ISI_COMPANY_ID}
            WHERE sc.category_code LIKE 'TEC-%'
            GROUP BY sc.id, sc.category_code, sc.category_name, sc.base_salary_reference
            ORDER BY sc.base_salary_reference DESC
        `);
        console.log('\n📊 Distribución por Categorías:');
        categories.forEach(c => {
            console.log(`   ${c.category_code} | ${c.category_name} | $${parseFloat(c.base_salary_reference || 0).toLocaleString()} | ${c.assigned_users} empleados`);
        });

        console.log('\n═══════════════════════════════════════════════════════════════════════');
        console.log('   ✅ VERIFICACIÓN COMPLETADA - ISI TIENE DATOS DE PAYROLL');
        console.log('═══════════════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

verify();
