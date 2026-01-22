/**
 * ============================================================================
 * LOTE 1: USERS, COMPANIES, ATTENDANCE, SHIFTS, DEPARTMENTS
 * CRUD PROFUNDO + PERSISTENCIA - PRODUCCIÓN
 * ============================================================================
 * @version 1.0.0
 * @date 2026-01-21
 * ============================================================================
 */

const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const colors = {
    green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
    blue: '\x1b[34m', cyan: '\x1b[36m', reset: '\x1b[0m', bold: '\x1b[1m'
};

function log(type, message) {
    const prefix = {
        pass: `${colors.green}✓ PASS${colors.reset}`,
        fail: `${colors.red}✗ FAIL${colors.reset}`,
        info: `${colors.blue}ℹ INFO${colors.reset}`,
        section: `${colors.cyan}${colors.bold}▶${colors.reset}`,
        crud: `${colors.bold}🔄 CRUD${colors.reset}`
    };
    console.log(`${prefix[type] || '•'} ${message}`);
}

const stats = { total: 0, passed: 0, failed: 0 };

function recordTest(name, passed, details = '') {
    stats.total++;
    if (passed) { stats.passed++; log('pass', `${name}${details ? ` - ${details}` : ''}`); }
    else { stats.failed++; log('fail', `${name}${details ? ` - ${details}` : ''}`); }
    return passed;
}

async function runTests() {
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}LOTE 1: USERS, COMPANIES, ATTENDANCE, SHIFTS, DEPARTMENTS${colors.reset}`);
    console.log(`${colors.bold}CRUD PROFUNDO + PERSISTENCIA - NIVEL PRODUCCIÓN${colors.reset}`);
    console.log('='.repeat(70) + '\n');

    const testData = {};
    const timestamp = Date.now();

    try {
        await sequelize.authenticate();
        log('info', 'Conexión establecida');

        // Get existing company for testing
        const [company] = await sequelize.query(`
            SELECT company_id, name, slug FROM companies WHERE is_active = true LIMIT 1
        `, { type: QueryTypes.SELECT });

        if (!company) {
            log('fail', 'No hay empresa activa para testing');
            return stats;
        }

        testData.companyId = company.company_id;
        log('info', `Testing con empresa: ${company.name} (ID: ${company.company_id})`);

        // ================================================================
        // 1. DEPARTMENTS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '1. DEPARTMENTS - CRUD');
        console.log('-'.repeat(50));

        // CREATE
        log('crud', 'CREATE departments');
        const deptName = `TEST_DEPT_${timestamp}`;
        await sequelize.query(`
            INSERT INTO departments (
                company_id, name, description, address, gps_lat, gps_lng,
                coverage_radius, is_active, allow_gps_attendance,
                created_at, updated_at
            ) VALUES (
                :companyId, :name, 'Test CRUD Department', 'Test Address 123',
                -34.6037, -58.3816, 500, true, true, NOW(), NOW()
            )
        `, { replacements: { companyId: testData.companyId, name: deptName }, type: QueryTypes.INSERT });

        // READ
        log('crud', 'READ departments');
        const [dept] = await sequelize.query(`
            SELECT * FROM departments WHERE name = :name AND company_id = :companyId
        `, { replacements: { name: deptName, companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Department CREATE + READ', dept && dept.is_active === true, `ID: ${dept?.id}`);
        testData.deptId = dept?.id;

        // UPDATE
        log('crud', 'UPDATE departments');
        await sequelize.query(`
            UPDATE departments SET description = 'Test UPDATED', coverage_radius = 750, updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.deptId }, type: QueryTypes.UPDATE });

        const [updatedDept] = await sequelize.query(`SELECT * FROM departments WHERE id = :id`,
            { replacements: { id: testData.deptId }, type: QueryTypes.SELECT });

        recordTest('Department UPDATE',
            updatedDept.description === 'Test UPDATED' && parseInt(updatedDept.coverage_radius) === 750,
            `radius=${updatedDept.coverage_radius}`);

        // ================================================================
        // 2. SHIFTS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '2. SHIFTS - CRUD');
        console.log('-'.repeat(50));

        // CREATE - Valid shiftType: standard, rotative, permanent, flash
        log('crud', 'CREATE shifts');
        const shiftId = crypto.randomUUID();
        const shiftName = `TEST_SHIFT_${timestamp}`;
        await sequelize.query(`
            INSERT INTO shifts (
                id, name, "startTime", "endTime", "toleranceMinutes",
                "isActive", description, "shiftType", company_id,
                "createdAt", "updatedAt"
            ) VALUES (
                :id, :name, '09:00:00', '18:00:00', 15,
                true, 'Test CRUD Shift', 'standard', :companyId,
                NOW(), NOW()
            )
        `, { replacements: { id: shiftId, name: shiftName, companyId: testData.companyId }, type: QueryTypes.INSERT });

        // READ
        log('crud', 'READ shifts');
        const [shift] = await sequelize.query(`
            SELECT * FROM shifts WHERE id = :id::uuid
        `, { replacements: { id: shiftId }, type: QueryTypes.SELECT });

        recordTest('Shift CREATE + READ', shift && shift.name === shiftName, `ID: ${shift?.id?.slice(0,8)}`);
        testData.shiftId = shiftId;

        // UPDATE
        log('crud', 'UPDATE shifts');
        await sequelize.query(`
            UPDATE shifts SET description = 'Test UPDATED Shift', "toleranceMinutes" = 20, "updatedAt" = NOW()
            WHERE id = :id::uuid
        `, { replacements: { id: testData.shiftId }, type: QueryTypes.UPDATE });

        const [updatedShift] = await sequelize.query(`SELECT * FROM shifts WHERE id = :id::uuid`,
            { replacements: { id: testData.shiftId }, type: QueryTypes.SELECT });

        recordTest('Shift UPDATE',
            updatedShift.description === 'Test UPDATED Shift' && parseInt(updatedShift.toleranceMinutes) === 20,
            `tolerance=${updatedShift.toleranceMinutes}`);

        // ================================================================
        // 3. USERS - CRUD (usando usuario de test)
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '3. USERS - CRUD');
        console.log('-'.repeat(50));

        // CREATE
        log('crud', 'CREATE users');
        const userId = crypto.randomUUID();
        const userEmail = `test_crud_${timestamp}@test.com`;
        const hashedPassword = await bcrypt.hash('TestPass123!', 10);

        await sequelize.query(`
            INSERT INTO users (
                user_id, "employeeId", "firstName", "lastName", email, dni,
                password, role, "isActive", company_id, "allowOutsideRadius",
                "createdAt", "updatedAt"
            ) VALUES (
                :userId, :empId, 'Test', 'CrudUser', :email, :dni,
                :password, 'employee', true, :companyId, false,
                NOW(), NOW()
            )
        `, {
            replacements: {
                userId, empId: `EMP${timestamp}`, email: userEmail,
                dni: `${timestamp}`.slice(-8), password: hashedPassword, companyId: testData.companyId
            },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ users');
        const [user] = await sequelize.query(`
            SELECT * FROM users WHERE user_id = :id::uuid
        `, { replacements: { id: userId }, type: QueryTypes.SELECT });

        recordTest('User CREATE + READ', user && user.firstName === 'Test', `ID: ${user?.user_id?.slice(0,8)}`);
        testData.userId = userId;

        // UPDATE
        log('crud', 'UPDATE users');
        await sequelize.query(`
            UPDATE users SET "firstName" = 'TestUpdated', position = 'Test Position', "updatedAt" = NOW()
            WHERE user_id = :id::uuid
        `, { replacements: { id: testData.userId }, type: QueryTypes.UPDATE });

        const [updatedUser] = await sequelize.query(`SELECT * FROM users WHERE user_id = :id::uuid`,
            { replacements: { id: testData.userId }, type: QueryTypes.SELECT });

        recordTest('User UPDATE',
            updatedUser.firstName === 'TestUpdated' && updatedUser.position === 'Test Position',
            `name=${updatedUser.firstName}`);

        // ================================================================
        // 4. ATTENDANCE - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '4. ATTENDANCE - CRUD');
        console.log('-'.repeat(50));

        // CREATE - Valid checkInMethod: fingerprint, face, pin, manual, mobile
        log('crud', 'CREATE attendances');
        const attendanceId = crypto.randomUUID();
        await sequelize.query(`
            INSERT INTO attendances (
                id, "UserId", date, "checkInTime", "checkInMethod",
                status, notes, company_id, "createdAt", "updatedAt"
            ) VALUES (
                :id, :userId, CURRENT_DATE, NOW(), 'face',
                'present', 'Test CRUD Attendance', :companyId, NOW(), NOW()
            )
        `, {
            replacements: { id: attendanceId, userId: testData.userId, companyId: testData.companyId },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ attendances');
        const [attendance] = await sequelize.query(`
            SELECT * FROM attendances WHERE id = :id::uuid
        `, { replacements: { id: attendanceId }, type: QueryTypes.SELECT });

        recordTest('Attendance CREATE + READ', attendance && attendance.status === 'present',
            `ID: ${attendance?.id?.slice(0,8)}`);
        testData.attendanceId = attendanceId;

        // UPDATE
        log('crud', 'UPDATE attendances');
        await sequelize.query(`
            UPDATE attendances SET "checkOutTime" = NOW(), "checkOutMethod" = 'face',
            notes = 'Test UPDATED', "updatedAt" = NOW()
            WHERE id = :id::uuid
        `, { replacements: { id: testData.attendanceId }, type: QueryTypes.UPDATE });

        const [updatedAtt] = await sequelize.query(`SELECT * FROM attendances WHERE id = :id::uuid`,
            { replacements: { id: testData.attendanceId }, type: QueryTypes.SELECT });

        recordTest('Attendance UPDATE',
            updatedAtt.notes === 'Test UPDATED' && updatedAtt.checkOutTime !== null,
            `checkout=${updatedAtt.checkOutTime ? 'SET' : 'NULL'}`);

        // ================================================================
        // 5. COMPANIES - CRUD (solo lectura y update de test data)
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '5. COMPANIES - CRUD');
        console.log('-'.repeat(50));

        // READ existing company
        log('crud', 'READ companies');
        const [existingCompany] = await sequelize.query(`
            SELECT * FROM companies WHERE company_id = :id
        `, { replacements: { id: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Company READ', existingCompany && existingCompany.is_active === true,
            `name=${existingCompany?.name}`);

        // CREATE test company
        log('crud', 'CREATE companies');
        const testSlug = `test-crud-${timestamp}`;
        await sequelize.query(`
            INSERT INTO companies (
                name, slug, contact_email, phone, address, tax_id,
                is_active, max_employees, license_type,
                created_at, updated_at
            ) VALUES (
                'Test CRUD Company', :slug, 'test@crud.com', '+5491234567890',
                'Test Address 123', '30-12345678-9',
                true, 10, 'demo',
                NOW(), NOW()
            )
        `, { replacements: { slug: testSlug }, type: QueryTypes.INSERT });

        const [testCompany] = await sequelize.query(`
            SELECT * FROM companies WHERE slug = :slug
        `, { replacements: { slug: testSlug }, type: QueryTypes.SELECT });

        recordTest('Company CREATE + READ', testCompany && testCompany.name === 'Test CRUD Company',
            `ID: ${testCompany?.company_id}`);
        testData.testCompanyId = testCompany?.company_id;

        // UPDATE
        log('crud', 'UPDATE companies');
        await sequelize.query(`
            UPDATE companies SET description = 'Test UPDATED Company', max_employees = 20, updated_at = NOW()
            WHERE company_id = :id
        `, { replacements: { id: testData.testCompanyId }, type: QueryTypes.UPDATE });

        const [updatedCompany] = await sequelize.query(`SELECT * FROM companies WHERE company_id = :id`,
            { replacements: { id: testData.testCompanyId }, type: QueryTypes.SELECT });

        recordTest('Company UPDATE',
            updatedCompany.description === 'Test UPDATED Company' && parseInt(updatedCompany.max_employees) === 20,
            `max_employees=${updatedCompany.max_employees}`);

        // ================================================================
        // 6. PERSISTENCIA - Verificar
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '6. PERSISTENCIA - Verificación');
        console.log('-'.repeat(50));

        log('info', 'Esperando commit...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const savedIds = {
            deptId: testData.deptId,
            shiftId: testData.shiftId,
            userId: testData.userId,
            attendanceId: testData.attendanceId,
            testCompanyId: testData.testCompanyId
        };

        log('crud', 'Verificando persistencia...');

        const [pDept] = await sequelize.query(`SELECT * FROM departments WHERE id = :id`,
            { replacements: { id: savedIds.deptId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Department', pDept && pDept.description === 'Test UPDATED');

        const [pShift] = await sequelize.query(`SELECT * FROM shifts WHERE id = :id::uuid`,
            { replacements: { id: savedIds.shiftId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Shift', pShift && pShift.description === 'Test UPDATED Shift');

        const [pUser] = await sequelize.query(`SELECT * FROM users WHERE user_id = :id::uuid`,
            { replacements: { id: savedIds.userId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: User', pUser && pUser.firstName === 'TestUpdated');

        const [pAtt] = await sequelize.query(`SELECT * FROM attendances WHERE id = :id::uuid`,
            { replacements: { id: savedIds.attendanceId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Attendance', pAtt && pAtt.notes === 'Test UPDATED');

        const [pCompany] = await sequelize.query(`SELECT * FROM companies WHERE company_id = :id`,
            { replacements: { id: savedIds.testCompanyId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Company', pCompany && pCompany.description === 'Test UPDATED Company');

        // ================================================================
        // 7. DELETE - Limpieza
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '7. DELETE - Limpieza');
        console.log('-'.repeat(50));

        // Delete in correct order (FK constraints)
        log('crud', 'DELETE attendances');
        await sequelize.query(`DELETE FROM attendances WHERE id = :id::uuid`,
            { replacements: { id: savedIds.attendanceId }, type: QueryTypes.DELETE });
        const [delAtt] = await sequelize.query(`SELECT * FROM attendances WHERE id = :id::uuid`,
            { replacements: { id: savedIds.attendanceId }, type: QueryTypes.SELECT });
        recordTest('Attendance DELETE', !delAtt, 'Eliminado');

        log('crud', 'DELETE users');
        await sequelize.query(`DELETE FROM users WHERE user_id = :id::uuid`,
            { replacements: { id: savedIds.userId }, type: QueryTypes.DELETE });
        const [delUser] = await sequelize.query(`SELECT * FROM users WHERE user_id = :id::uuid`,
            { replacements: { id: savedIds.userId }, type: QueryTypes.SELECT });
        recordTest('User DELETE', !delUser, 'Eliminado');

        log('crud', 'DELETE shifts');
        await sequelize.query(`DELETE FROM shifts WHERE id = :id::uuid`,
            { replacements: { id: savedIds.shiftId }, type: QueryTypes.DELETE });
        const [delShift] = await sequelize.query(`SELECT * FROM shifts WHERE id = :id::uuid`,
            { replacements: { id: savedIds.shiftId }, type: QueryTypes.SELECT });
        recordTest('Shift DELETE', !delShift, 'Eliminado');

        log('crud', 'DELETE departments');
        await sequelize.query(`DELETE FROM departments WHERE id = :id`,
            { replacements: { id: savedIds.deptId }, type: QueryTypes.DELETE });
        const [delDept] = await sequelize.query(`SELECT * FROM departments WHERE id = :id`,
            { replacements: { id: savedIds.deptId }, type: QueryTypes.SELECT });
        recordTest('Department DELETE', !delDept, 'Eliminado');

        log('crud', 'DELETE companies (test)');
        await sequelize.query(`DELETE FROM companies WHERE company_id = :id`,
            { replacements: { id: savedIds.testCompanyId }, type: QueryTypes.DELETE });
        const [delCompany] = await sequelize.query(`SELECT * FROM companies WHERE company_id = :id`,
            { replacements: { id: savedIds.testCompanyId }, type: QueryTypes.SELECT });
        recordTest('Company DELETE', !delCompany, 'Eliminado');

        // Verificar persistencia de DELETE
        log('info', 'Verificando persistencia DELETE...');
        await new Promise(resolve => setTimeout(resolve, 500));

        const [checkDept] = await sequelize.query(`SELECT * FROM departments WHERE id = :id`,
            { replacements: { id: savedIds.deptId }, type: QueryTypes.SELECT });
        recordTest('PERSIST DELETE: All cleared', !checkDept, 'Datos eliminados permanentemente');

    } catch (error) {
        console.error(`${colors.red}ERROR:${colors.reset}`, error.message);
        console.error(error.stack);
        stats.failed++;
    } finally {
        await sequelize.close();
    }

    // RESUMEN
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}RESUMEN LOTE 1${colors.reset}`);
    console.log('='.repeat(70));
    console.log(`Total: ${stats.total}`);
    console.log(`${colors.green}Passed: ${stats.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${stats.failed}${colors.reset}`);
    console.log(`Success Rate: ${((stats.passed / stats.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(70) + '\n');

    return stats;
}

runTests().then(stats => {
    process.exit(stats.failed > 0 ? 1 : 0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
