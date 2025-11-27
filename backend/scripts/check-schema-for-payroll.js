/**
 * Check schema for payroll cycle script
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

async function checkSchema() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database\n');

        // Check attendance table columns
        const [attendanceCols] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'attendance'
            ORDER BY ordinal_position
        `);
        console.log('=== ATTENDANCE COLUMNS ===');
        attendanceCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

        // Check shifts table columns
        const [shiftsCols] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'shifts'
            ORDER BY ordinal_position
        `);
        console.log('\n=== SHIFTS COLUMNS ===');
        shiftsCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

        // Check users table relevant columns
        const [userCols] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `);
        console.log('\n=== USERS ALL COLUMNS ===');
        userCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

        // Check payroll_employee_details structure
        const [payrollCols] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'payroll_employee_details'
            ORDER BY ordinal_position
        `);
        console.log('\n=== PAYROLL_EMPLOYEE_DETAILS COLUMNS ===');
        payrollCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

        // Check payroll_runs structure
        const [runsCols] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'payroll_runs'
            ORDER BY ordinal_position
        `);
        console.log('\n=== PAYROLL_RUNS COLUMNS ===');
        runsCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

        // Check kiosks
        const [kiosksCols] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'kiosks'
            ORDER BY ordinal_position
        `);
        console.log('\n=== KIOSKS COLUMNS ===');
        kiosksCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

        // Check holidays
        const [holidaysCols] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'holidays'
            ORDER BY ordinal_position
        `);
        console.log('\n=== HOLIDAYS COLUMNS ===');
        holidaysCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

        // Check departments
        const [deptsCols] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'departments'
            ORDER BY ordinal_position
        `);
        console.log('\n=== DEPARTMENTS COLUMNS ===');
        deptsCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

        // Check existing ISI users count
        const [userCount] = await sequelize.query(`
            SELECT COUNT(*) as count FROM users WHERE company_id = 11
        `);
        console.log('\n=== ISI USERS COUNT ===');
        console.log(userCount[0].count);

        // Check existing ISI departments (without id)
        const [depts] = await sequelize.query(`
            SELECT name FROM departments WHERE company_id = 11 LIMIT 5
        `);
        console.log('\n=== ISI DEPARTMENTS (first 5) ===');
        depts.forEach(d => console.log(`  ${d.name}`));

        // Check existing ISI shifts
        const [shifts] = await sequelize.query(`
            SELECT name FROM shifts WHERE company_id = 11 LIMIT 5
        `);
        console.log('\n=== ISI SHIFTS (first 5) ===');
        shifts.forEach(s => console.log(`  ${s.name}`));

        // Check ALL payroll and attendance related tables
        const [allTables] = await sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND (table_name LIKE '%payroll%' OR table_name LIKE '%attendance%' OR table_name LIKE '%salary%' OR table_name LIKE '%labor%')
            ORDER BY table_name
        `);
        console.log('\n=== ALL PAYROLL/ATTENDANCE/SALARY/LABOR TABLES ===');
        allTables.forEach(t => console.log('  ' + t.table_name));

        // Check payroll_concepts if exists
        try {
            const [conceptsCols] = await sequelize.query(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'payroll_concepts'
                ORDER BY ordinal_position
            `);
            if (conceptsCols.length > 0) {
                console.log('\n=== PAYROLL_CONCEPTS COLUMNS ===');
                conceptsCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));
            }
        } catch(e) {}

        // Check salary_configs if exists
        try {
            const [salaryCols] = await sequelize.query(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'salary_configs'
                ORDER BY ordinal_position
            `);
            if (salaryCols.length > 0) {
                console.log('\n=== SALARY_CONFIGS COLUMNS ===');
                salaryCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));
            }
        } catch(e) {}

    } catch(e) {
        console.error('Error:', e.message);
        console.error(e.stack);
    } finally {
        await sequelize.close();
    }
}

checkSchema();
