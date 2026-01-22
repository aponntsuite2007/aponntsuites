/**
 * ============================================================================
 * GESTIÓN MÉDICA - CRUD PROFUNDO + PERSISTENCIA
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
    console.log(`${colors.bold}GESTIÓN MÉDICA - CRUD PROFUNDO + PERSISTENCIA${colors.reset}`);
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
        // 1. MEDICAL RECORDS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '1. MEDICAL RECORDS - CRUD');
        console.log('-'.repeat(50));

        // CREATE Record - Valid record_types: exam, certificate, study, prescription, antecedent, aptitude, disability, accident
        // Valid results: apto, apto_con_observaciones, no_apto, pendiente, vencido, suspendido
        log('crud', 'CREATE medical_records');
        const recordTitle = `TEST_RECORD_${Date.now()}`;
        await sequelize.query(`
            INSERT INTO medical_records (
                company_id, employee_id, record_type, title, description,
                exam_date, result, result_details, observations,
                created_by, created_at, updated_at
            ) VALUES (
                :companyId, :userId, 'exam', :title, 'Test de persistencia CRUD',
                CURRENT_DATE, 'apto', 'Apto sin restricciones', 'Test observation',
                :userId, NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, userId: testData.userId, title: recordTitle },
            type: QueryTypes.INSERT
        });

        // READ Record
        log('crud', 'READ medical_records');
        const [createdRecord] = await sequelize.query(`
            SELECT * FROM medical_records WHERE title = :title AND company_id = :companyId
        `, { replacements: { title: recordTitle, companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Medical Record CREATE + READ',
            createdRecord && createdRecord.result === 'apto',
            `ID: ${createdRecord?.id}, result=${createdRecord?.result}`);
        testData.recordId = createdRecord?.id;

        // UPDATE Record - Use valid result value: apto_con_observaciones
        log('crud', 'UPDATE medical_records');
        await sequelize.query(`
            UPDATE medical_records
            SET result = 'apto_con_observaciones', observations = 'Test UPDATED', updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.recordId }, type: QueryTypes.UPDATE });

        const [updatedRecord] = await sequelize.query(`
            SELECT * FROM medical_records WHERE id = :id
        `, { replacements: { id: testData.recordId }, type: QueryTypes.SELECT });

        recordTest('Medical Record UPDATE',
            updatedRecord.result === 'apto_con_observaciones' && updatedRecord.observations === 'Test UPDATED',
            `result=${updatedRecord.result}`);

        // ================================================================
        // 2. MEDICAL LEAVES - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '2. MEDICAL LEAVES - CRUD');
        console.log('-'.repeat(50));

        // CREATE Leave
        log('crud', 'CREATE medical_leaves');
        const leaveId = crypto.randomUUID();
        await sequelize.query(`
            INSERT INTO medical_leaves (
                id, user_id, company_id, start_date, end_date,
                leave_type, diagnosis, doctor_name, status,
                created_at, updated_at
            ) VALUES (
                :leaveId, :userId, :companyId, CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days',
                'illness', 'Test CRUD Diagnosis', 'Dr. Test', 'pending',
                NOW(), NOW()
            )
        `, {
            replacements: { leaveId, userId: testData.userId, companyId: testData.companyId },
            type: QueryTypes.INSERT
        });

        // READ Leave
        log('crud', 'READ medical_leaves');
        const [createdLeave] = await sequelize.query(`
            SELECT * FROM medical_leaves WHERE id = :id::uuid
        `, { replacements: { id: leaveId }, type: QueryTypes.SELECT });

        recordTest('Medical Leave CREATE + READ',
            createdLeave && createdLeave.diagnosis === 'Test CRUD Diagnosis',
            `ID: ${createdLeave?.id?.slice(0,8)}, status=${createdLeave?.status}`);
        testData.leaveId = leaveId;

        // UPDATE Leave
        log('crud', 'UPDATE medical_leaves');
        await sequelize.query(`
            UPDATE medical_leaves
            SET status = 'approved', notes = 'Test UPDATED note', updated_at = NOW()
            WHERE id = :id::uuid
        `, { replacements: { id: testData.leaveId }, type: QueryTypes.UPDATE });

        const [updatedLeave] = await sequelize.query(`
            SELECT * FROM medical_leaves WHERE id = :id::uuid
        `, { replacements: { id: testData.leaveId }, type: QueryTypes.SELECT });

        recordTest('Medical Leave UPDATE',
            updatedLeave.status === 'approved' && updatedLeave.notes === 'Test UPDATED note',
            `status=${updatedLeave.status}`);

        // ================================================================
        // 3. MEDICAL CERTIFICATES - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '3. MEDICAL CERTIFICATES - CRUD');
        console.log('-'.repeat(50));

        // CREATE Certificate
        log('crud', 'CREATE medical_certificates');
        const certNumber = `TEST_CERT_${Date.now()}`;
        await sequelize.query(`
            INSERT INTO medical_certificates (
                company_id, user_id, certificate_number,
                issue_date, start_date, end_date, requested_days,
                diagnosis, symptoms, status,
                created_at, updated_at
            ) VALUES (
                :companyId, :userId, :certNumber,
                CURRENT_DATE, CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days', 2,
                'Test CRUD Diagnosis', 'Test symptoms', 'pending',
                NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, userId: testData.userId, certNumber },
            type: QueryTypes.INSERT
        });

        // READ Certificate
        log('crud', 'READ medical_certificates');
        const [createdCert] = await sequelize.query(`
            SELECT * FROM medical_certificates WHERE certificate_number = :certNumber AND company_id = :companyId
        `, { replacements: { certNumber, companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Medical Certificate CREATE + READ',
            createdCert && createdCert.diagnosis === 'Test CRUD Diagnosis',
            `ID: ${createdCert?.id}, days=${createdCert?.requested_days}`);
        testData.certId = createdCert?.id;

        // UPDATE Certificate
        log('crud', 'UPDATE medical_certificates');
        await sequelize.query(`
            UPDATE medical_certificates
            SET status = 'approved', approved_days = 2, doctor_observations = 'Test UPDATED observation', updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.certId }, type: QueryTypes.UPDATE });

        const [updatedCert] = await sequelize.query(`
            SELECT * FROM medical_certificates WHERE id = :id
        `, { replacements: { id: testData.certId }, type: QueryTypes.SELECT });

        recordTest('Medical Certificate UPDATE',
            updatedCert.status === 'approved' && updatedCert.doctor_observations === 'Test UPDATED observation',
            `status=${updatedCert.status}, approved_days=${updatedCert.approved_days}`);

        // ================================================================
        // 4. PERSISTENCIA - Verificar datos en nueva query
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '4. PERSISTENCIA - Verificar datos persisten');
        console.log('-'.repeat(50));

        const savedIds = {
            recordId: testData.recordId,
            leaveId: testData.leaveId,
            certId: testData.certId
        };

        log('info', 'Esperando commit de transacciones...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        log('crud', 'Verificando persistencia de datos...');

        const [persistedRecord] = await sequelize.query(`
            SELECT * FROM medical_records WHERE id = :id
        `, { replacements: { id: savedIds.recordId }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: Medical Record existe',
            persistedRecord && persistedRecord.observations === 'Test UPDATED',
            `observations=${persistedRecord?.observations}`);

        const [persistedLeave] = await sequelize.query(`
            SELECT * FROM medical_leaves WHERE id = :id::uuid
        `, { replacements: { id: savedIds.leaveId }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: Medical Leave existe',
            persistedLeave && persistedLeave.status === 'approved',
            `status=${persistedLeave?.status}`);

        const [persistedCert] = await sequelize.query(`
            SELECT * FROM medical_certificates WHERE id = :id
        `, { replacements: { id: savedIds.certId }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: Medical Certificate existe',
            persistedCert && persistedCert.status === 'approved',
            `status=${persistedCert?.status}`);

        // ================================================================
        // 5. DELETE - Limpieza
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '5. DELETE - Limpieza');
        console.log('-'.repeat(50));

        // DELETE Certificate
        log('crud', 'DELETE medical_certificates');
        await sequelize.query(`
            DELETE FROM medical_certificates WHERE id = :id
        `, { replacements: { id: savedIds.certId }, type: QueryTypes.DELETE });

        const [deletedCert] = await sequelize.query(`
            SELECT * FROM medical_certificates WHERE id = :id
        `, { replacements: { id: savedIds.certId }, type: QueryTypes.SELECT });

        recordTest('Certificate DELETE', !deletedCert, 'Registro eliminado');

        // DELETE Leave
        log('crud', 'DELETE medical_leaves');
        await sequelize.query(`
            DELETE FROM medical_leaves WHERE id = :id::uuid
        `, { replacements: { id: savedIds.leaveId }, type: QueryTypes.DELETE });

        const [deletedLeave] = await sequelize.query(`
            SELECT * FROM medical_leaves WHERE id = :id::uuid
        `, { replacements: { id: savedIds.leaveId }, type: QueryTypes.SELECT });

        recordTest('Leave DELETE', !deletedLeave, 'Registro eliminado');

        // DELETE Record
        log('crud', 'DELETE medical_records');
        await sequelize.query(`
            DELETE FROM medical_records WHERE id = :id
        `, { replacements: { id: savedIds.recordId }, type: QueryTypes.DELETE });

        const [deletedRecord] = await sequelize.query(`
            SELECT * FROM medical_records WHERE id = :id
        `, { replacements: { id: savedIds.recordId }, type: QueryTypes.SELECT });

        recordTest('Record DELETE', !deletedRecord, 'Registro eliminado');

        // Verificar persistencia de DELETE
        log('info', 'Verificando persistencia de DELETE...');
        await new Promise(resolve => setTimeout(resolve, 500));

        const [checkRecord] = await sequelize.query(`
            SELECT * FROM medical_records WHERE id = :id
        `, { replacements: { id: savedIds.recordId }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: DELETE persiste',
            !checkRecord, 'Datos eliminados permanentemente');

    } catch (error) {
        console.error(`${colors.red}ERROR:${colors.reset}`, error.message);
        stats.failed++;
    } finally {
        await sequelize.close();
    }

    // RESUMEN
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}RESUMEN CRUD GESTIÓN MÉDICA${colors.reset}`);
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
