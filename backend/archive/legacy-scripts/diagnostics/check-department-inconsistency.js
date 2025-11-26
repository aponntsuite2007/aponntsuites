/**
 * Verificar inconsistencia en departamentos de usuarios
 */

require('dotenv').config();
const database = require('./src/config/database');

async function checkDepartmentInconsistency() {
    try {
        console.log('\n🔍 Verificando inconsistencias en departamentos...\n');

        // 1. Listar todos los departamentos de ISI
        const [depts] = await database.sequelize.query(`
            SELECT id, name, company_id
            FROM departments
            WHERE company_id = 11
            ORDER BY name
        `);

        console.log(`📊 Departamentos de ISI (${depts.length}):`);
        depts.forEach(d => console.log(`   - ID: ${d.id}, Nombre: ${d.name}`));
        console.log('');

        // 2. Encontrar usuarios con departmentId que no existe
        const [orphanUsers] = await database.sequelize.query(`
            SELECT
                u.user_id,
                u."firstName",
                u."lastName",
                u."departmentId",
                d.name as department_name
            FROM users u
            LEFT JOIN departments d ON d.id::text = u."departmentId" AND d.company_id = 11
            WHERE u.company_id = 11
              AND u."departmentId" IS NOT NULL
              AND d.id IS NULL
            LIMIT 10
        `);

        if (orphanUsers.length > 0) {
            console.log(`⚠️  Usuarios con departamentos inexistentes (${orphanUsers.length}):`);
            orphanUsers.forEach(u => {
                console.log(`   - ${u.firstName} ${u.lastName}: departmentId="${u.departmentId}" (NO EXISTE)`);
            });
            console.log('');
        } else {
            console.log('✅ No se encontraron usuarios con departamentos inexistentes\n');
        }

        // 3. Contar usuarios por departamento
        const [userCounts] = await database.sequelize.query(`
            SELECT
                u."departmentId",
                d.name as department_name,
                COUNT(u.user_id) as user_count
            FROM users u
            LEFT JOIN departments d ON d.id::text = u."departmentId" AND d.company_id = 11
            WHERE u.company_id = 11
            GROUP BY u."departmentId", d.name
            ORDER BY user_count DESC
        `);

        console.log('📈 Usuarios por departamento:');
        userCounts.forEach(c => {
            const deptName = c.department_name || `⚠️ INEXISTENTE (ID: ${c.departmentId})`;
            console.log(`   - ${deptName}: ${c.user_count} usuarios`);
        });
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkDepartmentInconsistency();
