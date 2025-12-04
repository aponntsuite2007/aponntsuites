/**
 * Script para mostrar el flujo de datos de deteccion de regulacion
 */
const { sequelize } = require('../src/config/database');

async function showFlow() {
    try {
        console.log('=== FLUJO DE DETECCION DE REGULACION POR SUCURSAL ===\n');

        // 1. Users
        console.log('1. TABLA: users');
        console.log('   - id (UUID del usuario)');
        console.log('   - company_id (FK a companies)');
        console.log('   - default_branch_id (FK a branches - NO SE USA AQUI)');
        console.log('   - first_name, last_name');

        // 2. company_branches
        console.log('\n2. TABLA: company_branches');
        console.log('   - id');
        console.log('   - company_id (FK a companies)');
        console.log('   - country_id (FK a payroll_countries) <-- CLAVE!');
        console.log('   - branch_name');
        console.log('   - is_active');

        // 3. payroll_countries
        console.log('\n3. TABLA: payroll_countries');
        console.log('   - id');
        console.log('   - country_code (ARG, MEX, COL, etc.)');
        console.log('   - country_name');
        console.log('   - privacy_law_name');
        console.log('   - data_protection_authority');

        console.log('\n=== QUERY SQL DE DETECCION ===');
        console.log(`
SELECT
    u.id as user_id,
    u.first_name,
    u.last_name,
    cb.id as branch_id,
    cb.branch_name,
    cb.country_id,
    pc.country_code,
    pc.country_name,
    pc.privacy_law_name
FROM users u
LEFT JOIN company_branches cb ON cb.company_id = u.company_id AND cb.is_active = true
LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
WHERE u.id = :employeeId AND u.company_id = :companyId
        `);

        // Ejemplo real
        console.log('\n=== EJEMPLO REAL (ISI company_id=11) ===');

        const [example] = await sequelize.query(`
            SELECT
                u.id as user_id,
                u.first_name || ' ' || u.last_name as employee_name,
                u.company_id,
                cb.id as branch_id,
                cb.branch_name,
                cb.country_id,
                pc.country_code,
                pc.country_name,
                pc.privacy_law_name
            FROM users u
            LEFT JOIN company_branches cb ON cb.company_id = u.company_id AND cb.is_active = true
            LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
            WHERE u.company_id = 11
            LIMIT 3
        `);

        if (example.length > 0) {
            example.forEach((row, i) => {
                console.log(`\nEmpleado ${i+1}:`);
                console.log('  user_id:', row.user_id);
                console.log('  employee_name:', row.employee_name);
                console.log('  company_id:', row.company_id);
                console.log('  branch_id:', row.branch_id || 'NULL');
                console.log('  branch_name:', row.branch_name || 'NULL');
                console.log('  country_id:', row.country_id || 'NULL');
                console.log('  country_code:', row.country_code || 'NULL (fallback a ARG)');
                console.log('  country_name:', row.country_name || 'NULL');
                console.log('  privacy_law_name:', row.privacy_law_name || 'NULL');
            });
        } else {
            console.log('No hay empleados en company_id=11');
        }

        // Mostrar sucursales con pais
        console.log('\n=== SUCURSALES DE ISI CON PAIS ===');
        const [branches] = await sequelize.query(`
            SELECT
                cb.id,
                cb.branch_name,
                cb.country_id,
                pc.country_code,
                pc.country_name
            FROM company_branches cb
            LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
            WHERE cb.company_id = 11 AND cb.is_active = true
        `);

        if (branches.length > 0) {
            branches.forEach(b => {
                console.log(`  - ${b.branch_name}: ${b.country_name || 'SIN PAIS'} (${b.country_code || 'N/A'})`);
            });
        } else {
            console.log('  No hay sucursales en company_branches para ISI');
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
    process.exit(0);
}

showFlow();
