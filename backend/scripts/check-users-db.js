const {sequelize} = require('../src/config/database');

async function checkUsers() {
    try {
        const [users] = await sequelize.query(
            `SELECT user_id, email, first_name, last_name, employee_id, role, position, phone
             FROM users WHERE company_id = 11 LIMIT 5`
        );

        console.log('=== USUARIOS EN BD (company_id=11) ===\n');
        users.forEach((u, i) => {
            console.log(`${i+1}. Email: ${u.email}`);
            console.log(`   user_id: ${u.user_id}`);
            console.log(`   first_name: ${u.first_name || 'NULL'}`);
            console.log(`   last_name: ${u.last_name || 'NULL'}`);
            console.log(`   employee_id: ${u.employee_id || 'NULL'}`);
            console.log(`   role: ${u.role}`);
            console.log(`   position: ${u.position || 'NULL'}`);
            console.log(`   phone: ${u.phone || 'NULL'}`);
            console.log('');
        });

        // También verificar la estructura de columnas de la tabla users
        const [columns] = await sequelize.query(
            `SELECT column_name, data_type, is_nullable
             FROM information_schema.columns
             WHERE table_name = 'users'
             ORDER BY ordinal_position`
        );

        console.log('=== COLUMNAS TABLA USERS ===');
        console.log('Columnas relevantes:');
        const relevantCols = columns.filter(c =>
            ['first_name', 'last_name', 'employee_id', 'position', 'hire_date', 'department_id', 'phone'].includes(c.column_name)
        );
        relevantCols.forEach(c => {
            console.log(`   ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
        });

        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

checkUsers();
