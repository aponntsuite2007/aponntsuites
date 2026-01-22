/**
 * ============================================================================
 * PAYROLL - CRUD PROFUNDO + PERSISTENCIA
 * ============================================================================
 *
 * Tests CRUD reales con persistencia de datos:
 * 1. CREATE - Insertar registros reales
 * 2. READ - Leer y verificar datos
 * 3. UPDATE - Modificar y verificar cambios
 * 4. DELETE - Eliminar y verificar
 * 5. PERSISTENCIA - Verificar que los datos persisten
 *
 * @version 1.0.0
 * @date 2026-01-21
 * ============================================================================
 */

const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');
const crypto = require('crypto');

// Colores
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(type, message) {
    const prefix = {
        pass: `${colors.green}✓ PASS${colors.reset}`,
        fail: `${colors.red}✗ FAIL${colors.reset}`,
        info: `${colors.blue}ℹ INFO${colors.reset}`,
        warn: `${colors.yellow}⚠ WARN${colors.reset}`,
        section: `${colors.cyan}${colors.bold}▶${colors.reset}`,
        crud: `${colors.bold}🔄 CRUD${colors.reset}`
    };
    console.log(`${prefix[type] || '•'} ${message}`);
}

const stats = { total: 0, passed: 0, failed: 0 };

function recordTest(name, passed, details = '') {
    stats.total++;
    if (passed) {
        stats.passed++;
        log('pass', `${name}${details ? ` - ${details}` : ''}`);
    } else {
        stats.failed++;
        log('fail', `${name}${details ? ` - ${details}` : ''}`);
    }
    return passed;
}

async function runTests() {
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}PAYROLL - CRUD PROFUNDO + PERSISTENCIA${colors.reset}`);
    console.log('='.repeat(70) + '\n');

    let testData = {};

    try {
        await sequelize.authenticate();
        log('info', 'Conexión establecida');

        // Obtener empresa CON USUARIOS activos
        const [companyWithUsers] = await sequelize.query(`
            SELECT c.company_id, c.name
            FROM companies c
            INNER JOIN users u ON c.company_id = u.company_id AND u."isActive" = true
            WHERE c.is_active = true
            GROUP BY c.company_id, c.name
            ORDER BY COUNT(u.user_id) DESC
            LIMIT 1
        `, { type: QueryTypes.SELECT });

        if (!companyWithUsers) {
            log('fail', 'No hay empresa con usuarios para testing');
            return { total: 0, passed: 0, failed: 1 };
        }

        const company = companyWithUsers;

        const [user] = await sequelize.query(`
            SELECT user_id, "firstName", "lastName" FROM users
            WHERE company_id = :companyId AND "isActive" = true LIMIT 1
        `, { replacements: { companyId: company.company_id }, type: QueryTypes.SELECT });

        if (!user) {
            log('fail', 'No hay usuario para testing');
            return { total: 0, passed: 0, failed: 1 };
        }

        log('info', `Testing con empresa ${company.company_id}, usuario ${user.firstName} ${user.lastName}`);
        testData.companyId = company.company_id;
        testData.userId = user.user_id;

        // ================================================================
        // 1. PAYROLL RUNS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '1. PAYROLL RUNS - CRUD');
        console.log('-'.repeat(50));

        // CREATE Run
        log('crud', 'CREATE payroll_runs');
        const runCode = `TEST_RUN_${Date.now()}`;
        await sequelize.query(`
            INSERT INTO payroll_runs (
                company_id, run_code, run_name, period_year, period_month,
                period_start, period_end, total_employees, total_gross, total_net,
                status, created_at, updated_at
            ) VALUES (
                :companyId, :runCode, 'Test CRUD Payroll Run', 2026, 1,
                '2026-01-01', '2026-01-31', 10, 100000.00, 80000.00,
                'draft', NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, runCode },
            type: QueryTypes.INSERT
        });

        // READ Run
        log('crud', 'READ payroll_runs');
        const [createdRun] = await sequelize.query(`
            SELECT * FROM payroll_runs WHERE run_code = :runCode AND company_id = :companyId
        `, { replacements: { runCode, companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Payroll Run CREATE + READ',
            createdRun && createdRun.status === 'draft',
            `ID: ${createdRun?.id}, total_gross=${createdRun?.total_gross}`);
        testData.runId = createdRun?.id;

        // UPDATE Run
        log('crud', 'UPDATE payroll_runs');
        await sequelize.query(`
            UPDATE payroll_runs
            SET status = 'approved', total_employees = 15, notes = 'Test UPDATED', updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.runId }, type: QueryTypes.UPDATE });

        const [updatedRun] = await sequelize.query(`
            SELECT * FROM payroll_runs WHERE id = :id
        `, { replacements: { id: testData.runId }, type: QueryTypes.SELECT });

        recordTest('Payroll Run UPDATE',
            updatedRun.status === 'approved' && parseInt(updatedRun.total_employees) === 15,
            `status=${updatedRun.status}, employees=${updatedRun.total_employees}`);

        // ================================================================
        // 2. PAYROLL RUN DETAILS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '2. PAYROLL RUN DETAILS - CRUD');
        console.log('-'.repeat(50));

        // CREATE Detail
        log('crud', 'CREATE payroll_run_details');
        await sequelize.query(`
            INSERT INTO payroll_run_details (
                run_id, user_id, worked_days, worked_hours,
                gross_earnings, total_deductions, net_salary,
                status, created_at, updated_at
            ) VALUES (
                :runId, :userId, 22, 176,
                50000.00, 10000.00, 40000.00,
                'calculated', NOW(), NOW()
            )
        `, {
            replacements: { runId: testData.runId, userId: testData.userId },
            type: QueryTypes.INSERT
        });

        // READ Detail
        log('crud', 'READ payroll_run_details');
        const [createdDetail] = await sequelize.query(`
            SELECT * FROM payroll_run_details WHERE run_id = :runId AND user_id = :userId
        `, { replacements: { runId: testData.runId, userId: testData.userId }, type: QueryTypes.SELECT });

        recordTest('Payroll Detail CREATE + READ',
            createdDetail && parseFloat(createdDetail.net_salary) === 40000.00,
            `ID: ${createdDetail?.id}, net=${createdDetail?.net_salary}`);
        testData.detailId = createdDetail?.id;

        // UPDATE Detail
        log('crud', 'UPDATE payroll_run_details');
        await sequelize.query(`
            UPDATE payroll_run_details
            SET net_salary = 42000.00, status = 'approved', updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.detailId }, type: QueryTypes.UPDATE });

        const [updatedDetail] = await sequelize.query(`
            SELECT * FROM payroll_run_details WHERE id = :id
        `, { replacements: { id: testData.detailId }, type: QueryTypes.SELECT });

        recordTest('Payroll Detail UPDATE',
            parseFloat(updatedDetail.net_salary) === 42000.00 && updatedDetail.status === 'approved',
            `net=${updatedDetail.net_salary}`);

        // ================================================================
        // 3. USER PAYROLL RECORDS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '3. USER PAYROLL RECORDS - CRUD');
        console.log('-'.repeat(50));

        // CREATE Record - Use unique period (2099/12) to avoid conflicts
        log('crud', 'CREATE user_payroll_records');
        const testPeriodYear = 2099;
        const testPeriodMonth = 12;

        // Delete any existing test record first
        await sequelize.query(`
            DELETE FROM user_payroll_records
            WHERE user_id = :userId AND company_id = :companyId
            AND period_year = :year AND period_month = :month
        `, {
            replacements: { userId: testData.userId, companyId: testData.companyId, year: testPeriodYear, month: testPeriodMonth },
            type: QueryTypes.DELETE
        });

        await sequelize.query(`
            INSERT INTO user_payroll_records (
                user_id, company_id, period_year, period_month,
                base_salary, gross_total, deductions_total, net_salary,
                days_worked, status, created_at, updated_at
            ) VALUES (
                :userId, :companyId, :year, :month,
                45000.00, 50000.00, 10000.00, 40000.00,
                22, 'draft', NOW(), NOW()
            )
        `, {
            replacements: { userId: testData.userId, companyId: testData.companyId, year: testPeriodYear, month: testPeriodMonth },
            type: QueryTypes.INSERT
        });

        // READ Record
        log('crud', 'READ user_payroll_records');
        const [createdRecord] = await sequelize.query(`
            SELECT * FROM user_payroll_records
            WHERE user_id = :userId AND company_id = :companyId
            AND period_year = :year AND period_month = :month
            ORDER BY created_at DESC LIMIT 1
        `, { replacements: { userId: testData.userId, companyId: testData.companyId, year: testPeriodYear, month: testPeriodMonth }, type: QueryTypes.SELECT });

        // Note: trg_calculate_payroll trigger recalculates net_salary from base_salary
        recordTest('User Payroll Record CREATE + READ',
            createdRecord && createdRecord.status === 'draft' && parseFloat(createdRecord.base_salary) === 45000.00,
            `ID: ${createdRecord?.id}, base=${createdRecord?.base_salary}, net=${createdRecord?.net_salary}`);
        testData.recordId = createdRecord?.id;

        // UPDATE Record (note: trigger recalculates net_salary, so we only update status and notes)
        log('crud', 'UPDATE user_payroll_records');
        await sequelize.query(`
            UPDATE user_payroll_records
            SET status = 'approved', notes = 'Test UPDATED', updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.recordId }, type: QueryTypes.UPDATE });

        const [updatedRecord] = await sequelize.query(`
            SELECT * FROM user_payroll_records WHERE id = :id
        `, { replacements: { id: testData.recordId }, type: QueryTypes.SELECT });

        // Note: trg_calculate_payroll trigger recalculates net_salary, so we verify status and notes instead
        recordTest('User Payroll Record UPDATE',
            updatedRecord.status === 'approved' && updatedRecord.notes === 'Test UPDATED',
            `status=${updatedRecord.status}, notes=${updatedRecord.notes}`);

        // ================================================================
        // 4. PERSISTENCIA - Verificar datos persisten
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '4. PERSISTENCIA - Verificar datos persisten');
        console.log('-'.repeat(50));

        const savedIds = {
            runId: testData.runId,
            detailId: testData.detailId,
            recordId: testData.recordId
        };

        log('info', 'Esperando commit de transacciones...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        log('crud', 'Verificando persistencia de datos...');

        const [persistedRun] = await sequelize.query(`
            SELECT * FROM payroll_runs WHERE id = :id
        `, { replacements: { id: savedIds.runId }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: Payroll Run existe',
            persistedRun && persistedRun.notes === 'Test UPDATED',
            `notes=${persistedRun?.notes}`);

        const [persistedDetail] = await sequelize.query(`
            SELECT * FROM payroll_run_details WHERE id = :id
        `, { replacements: { id: savedIds.detailId }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: Payroll Detail existe',
            persistedDetail && persistedDetail.status === 'approved',
            `status=${persistedDetail?.status}`);

        const [persistedRecord] = await sequelize.query(`
            SELECT * FROM user_payroll_records WHERE id = :id
        `, { replacements: { id: savedIds.recordId }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: User Payroll Record existe',
            persistedRecord && persistedRecord.status === 'approved',
            `status=${persistedRecord?.status}`);

        // ================================================================
        // 5. DELETE - Limpieza
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '5. DELETE - Limpieza');
        console.log('-'.repeat(50));

        // DELETE User Record
        log('crud', 'DELETE user_payroll_records');
        await sequelize.query(`
            DELETE FROM user_payroll_records WHERE id = :id
        `, { replacements: { id: savedIds.recordId }, type: QueryTypes.DELETE });

        const [deletedRecord] = await sequelize.query(`
            SELECT * FROM user_payroll_records WHERE id = :id
        `, { replacements: { id: savedIds.recordId }, type: QueryTypes.SELECT });

        recordTest('User Payroll Record DELETE', !deletedRecord, 'Registro eliminado');

        // DELETE Detail (must delete before run due to FK)
        log('crud', 'DELETE payroll_run_details');
        await sequelize.query(`
            DELETE FROM payroll_run_details WHERE id = :id
        `, { replacements: { id: savedIds.detailId }, type: QueryTypes.DELETE });

        const [deletedDetail] = await sequelize.query(`
            SELECT * FROM payroll_run_details WHERE id = :id
        `, { replacements: { id: savedIds.detailId }, type: QueryTypes.SELECT });

        recordTest('Payroll Detail DELETE', !deletedDetail, 'Registro eliminado');

        // DELETE Run
        log('crud', 'DELETE payroll_runs');
        await sequelize.query(`
            DELETE FROM payroll_runs WHERE id = :id
        `, { replacements: { id: savedIds.runId }, type: QueryTypes.DELETE });

        const [deletedRun] = await sequelize.query(`
            SELECT * FROM payroll_runs WHERE id = :id
        `, { replacements: { id: savedIds.runId }, type: QueryTypes.SELECT });

        recordTest('Payroll Run DELETE', !deletedRun, 'Registro eliminado');

        // Verificar persistencia de DELETE
        log('info', 'Verificando persistencia de DELETE...');
        await new Promise(resolve => setTimeout(resolve, 500));

        const [checkRun] = await sequelize.query(`
            SELECT * FROM payroll_runs WHERE run_code = :runCode
        `, { replacements: { runCode }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: DELETE persiste',
            !checkRun, 'Datos eliminados permanentemente');

    } catch (error) {
        console.error(`${colors.red}ERROR:${colors.reset}`, error.message);
        stats.failed++;
    } finally {
        await sequelize.close();
    }

    // RESUMEN
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}RESUMEN CRUD PAYROLL${colors.reset}`);
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
