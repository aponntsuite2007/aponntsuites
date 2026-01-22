/**
 * ============================================================================
 * LOTE 2: BRANCHES, KIOSKS, VACATIONS, DMS, NOTIFICATIONS
 * CRUD PROFUNDO + PERSISTENCIA - NIVEL PRODUCCION
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
    console.log(`${colors.bold}LOTE 2: BRANCHES, KIOSKS, VACATIONS, DMS, NOTIFICATIONS${colors.reset}`);
    console.log(`${colors.bold}CRUD PROFUNDO + PERSISTENCIA - NIVEL PRODUCCIÓN${colors.reset}`);
    console.log('='.repeat(70) + '\n');

    let testData = {};

    try {
        await sequelize.authenticate();
        log('info', 'Conexión establecida');

        // Obtener empresa con usuarios activos
        const [company] = await sequelize.query(`
            SELECT c.company_id, c.name
            FROM companies c
            INNER JOIN users u ON c.company_id = u.company_id AND u."isActive" = true
            WHERE c.is_active = true
            GROUP BY c.company_id, c.name
            ORDER BY COUNT(u.user_id) DESC
            LIMIT 1
        `, { type: QueryTypes.SELECT });

        if (!company) {
            log('fail', 'No hay empresa con usuarios para testing');
            return stats;
        }

        const [user] = await sequelize.query(`
            SELECT user_id, "firstName", "lastName" FROM users
            WHERE company_id = :companyId AND "isActive" = true LIMIT 1
        `, { replacements: { companyId: company.company_id }, type: QueryTypes.SELECT });

        if (!user) {
            log('fail', 'No hay usuario para testing');
            return stats;
        }

        log('info', `Testing con empresa: ${company.name} (ID: ${company.company_id})`);
        testData.companyId = company.company_id;
        testData.userId = user.user_id;

        // ================================================================
        // 1. BRANCHES - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '1. BRANCHES - CRUD');
        console.log('-'.repeat(50));

        // CREATE
        log('crud', 'CREATE branches');
        const branchId = crypto.randomUUID();
        const branchCode = `TEST_BR_${Date.now()}`;
        await sequelize.query(`
            INSERT INTO branches (
                id, company_id, name, code, address, phone, email,
                latitude, longitude, radius, "isActive",
                country, state_province, city, postal_code,
                "createdAt", "updatedAt"
            ) VALUES (
                :id, :companyId, 'Test Branch CRUD', :code, 'Av. Test 123', '+54111234567', 'branch@test.com',
                -34.6037, -58.3816, 100, true,
                'Argentina', 'Buenos Aires', 'CABA', '1000',
                NOW(), NOW()
            )
        `, {
            replacements: { id: branchId, companyId: testData.companyId, code: branchCode },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ branches');
        const [branch] = await sequelize.query(`
            SELECT * FROM branches WHERE id = :id::uuid
        `, { replacements: { id: branchId }, type: QueryTypes.SELECT });

        recordTest('Branch CREATE + READ', branch && branch.name === 'Test Branch CRUD',
            `ID: ${branch?.id?.slice(0, 8)}`);
        testData.branchId = branchId;

        // UPDATE
        log('crud', 'UPDATE branches');
        await sequelize.query(`
            UPDATE branches SET radius = 200, address = 'Test UPDATED Address', "updatedAt" = NOW()
            WHERE id = :id::uuid
        `, { replacements: { id: testData.branchId }, type: QueryTypes.UPDATE });

        const [updatedBranch] = await sequelize.query(`SELECT * FROM branches WHERE id = :id::uuid`,
            { replacements: { id: testData.branchId }, type: QueryTypes.SELECT });

        recordTest('Branch UPDATE',
            parseInt(updatedBranch.radius) === 200 && updatedBranch.address === 'Test UPDATED Address',
            `radius=${updatedBranch.radius}`);

        // ================================================================
        // 2. KIOSKS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '2. KIOSKS - CRUD');
        console.log('-'.repeat(50));

        // CREATE - Use unique GPS coordinates and name to avoid constraint violations
        log('crud', 'CREATE kiosks');
        const kioskDeviceId = `TEST_KIOSK_${Date.now()}`;
        const kioskName = `Test Kiosk ${Date.now()}`;
        const randomLat = -34.6 + (Math.random() * 0.1);
        const randomLng = -58.4 + (Math.random() * 0.1);
        await sequelize.query(`
            INSERT INTO kiosks (
                company_id, name, description, device_id, location,
                gps_lat, gps_lng, is_configured, is_active,
                ip_address, port, created_at, updated_at
            ) VALUES (
                :companyId, :name, 'Kiosk de prueba CRUD', :deviceId, 'Lobby Principal',
                :lat, :lng, true, true,
                '192.168.1.100', 8080, NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, name: kioskName, deviceId: kioskDeviceId, lat: randomLat, lng: randomLng },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ kiosks');
        const [kiosk] = await sequelize.query(`
            SELECT * FROM kiosks WHERE device_id = :deviceId AND company_id = :companyId
        `, { replacements: { deviceId: kioskDeviceId, companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Kiosk CREATE + READ', kiosk && kiosk.name === kioskName,
            `ID: ${kiosk?.id}`);
        testData.kioskId = kiosk?.id;

        // UPDATE
        log('crud', 'UPDATE kiosks');
        await sequelize.query(`
            UPDATE kiosks SET description = 'Test UPDATED Description', port = 9090, updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.kioskId }, type: QueryTypes.UPDATE });

        const [updatedKiosk] = await sequelize.query(`SELECT * FROM kiosks WHERE id = :id`,
            { replacements: { id: testData.kioskId }, type: QueryTypes.SELECT });

        recordTest('Kiosk UPDATE',
            updatedKiosk.description === 'Test UPDATED Description' && parseInt(updatedKiosk.port) === 9090,
            `port=${updatedKiosk.port}`);

        // ================================================================
        // 3. VACATION_REQUESTS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '3. VACATION_REQUESTS - CRUD');
        console.log('-'.repeat(50));

        // CREATE - Valid status: pending, approved, rejected, cancelled, active, completed
        // Valid request_type: vacation, extraordinary
        log('crud', 'CREATE vacation_requests');
        await sequelize.query(`
            INSERT INTO vacation_requests (
                company_id, user_id, request_type, start_date, end_date,
                total_days, reason, status, source, created_at, updated_at
            ) VALUES (
                :companyId, :userId, 'vacation', CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '37 days',
                7, 'Test CRUD Vacation Request', 'pending', 'web', NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, userId: testData.userId },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ vacation_requests');
        const [vacation] = await sequelize.query(`
            SELECT * FROM vacation_requests
            WHERE company_id = :companyId AND user_id = :userId AND reason = 'Test CRUD Vacation Request'
            ORDER BY created_at DESC LIMIT 1
        `, { replacements: { companyId: testData.companyId, userId: testData.userId }, type: QueryTypes.SELECT });

        recordTest('Vacation Request CREATE + READ', vacation && vacation.status === 'pending',
            `ID: ${vacation?.id}, days=${vacation?.total_days}`);
        testData.vacationId = vacation?.id;

        // UPDATE
        log('crud', 'UPDATE vacation_requests');
        await sequelize.query(`
            UPDATE vacation_requests SET status = 'approved', approval_comments = 'Test UPDATED - Approved',
            approved_by = :userId, approval_date = NOW(), updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.vacationId, userId: testData.userId }, type: QueryTypes.UPDATE });

        const [updatedVacation] = await sequelize.query(`SELECT * FROM vacation_requests WHERE id = :id`,
            { replacements: { id: testData.vacationId }, type: QueryTypes.SELECT });

        recordTest('Vacation Request UPDATE',
            updatedVacation.status === 'approved' && updatedVacation.approval_comments === 'Test UPDATED - Approved',
            `status=${updatedVacation.status}`);

        // ================================================================
        // 4. DMS_DOCUMENTS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '4. DMS_DOCUMENTS - CRUD');
        console.log('-'.repeat(50));

        // CREATE
        log('crud', 'CREATE dms_documents');
        const dmsDocId = crypto.randomUUID();
        const dmsDocNumber = `DOC_TEST_${Date.now()}`;
        await sequelize.query(`
            INSERT INTO dms_documents (
                id, company_id, document_number, category_code, type_code,
                title, description, original_filename, stored_filename,
                storage_path, file_size_bytes, mime_type, file_extension,
                checksum_sha256, owner_type, owner_id, owner_name,
                status, is_deleted, created_by, created_at, updated_at
            ) VALUES (
                :id, :companyId, :docNumber, 'GENERAL', 'CONTRACT',
                'Test DMS Document CRUD', 'Test document for CRUD testing', 'test_doc.pdf', 'stored_test.pdf',
                '/uploads/test/', 1024, 'application/pdf', 'pdf',
                'abc123checksum', 'employee', :userId, 'Test User',
                'active', false, :userId, NOW(), NOW()
            )
        `, {
            replacements: { id: dmsDocId, companyId: testData.companyId, docNumber: dmsDocNumber, userId: testData.userId },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ dms_documents');
        const [dmsDoc] = await sequelize.query(`
            SELECT * FROM dms_documents WHERE id = :id::uuid
        `, { replacements: { id: dmsDocId }, type: QueryTypes.SELECT });

        recordTest('DMS Document CREATE + READ', dmsDoc && dmsDoc.title === 'Test DMS Document CRUD',
            `ID: ${dmsDoc?.id?.slice(0, 8)}`);
        testData.dmsDocId = dmsDocId;

        // UPDATE
        log('crud', 'UPDATE dms_documents');
        await sequelize.query(`
            UPDATE dms_documents SET description = 'Test UPDATED Description', file_size_bytes = 2048, updated_at = NOW()
            WHERE id = :id::uuid
        `, { replacements: { id: testData.dmsDocId }, type: QueryTypes.UPDATE });

        const [updatedDmsDoc] = await sequelize.query(`SELECT * FROM dms_documents WHERE id = :id::uuid`,
            { replacements: { id: testData.dmsDocId }, type: QueryTypes.SELECT });

        recordTest('DMS Document UPDATE',
            updatedDmsDoc.description === 'Test UPDATED Description' && parseInt(updatedDmsDoc.file_size_bytes) === 2048,
            `size=${updatedDmsDoc.file_size_bytes}`);

        // ================================================================
        // 5. NOTIFICATIONS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '5. NOTIFICATIONS - CRUD');
        console.log('-'.repeat(50));

        // CREATE - Valid priority: low, medium, high, critical, urgent
        log('crud', 'CREATE notifications');
        const notifUuid = crypto.randomUUID();
        await sequelize.query(`
            INSERT INTO notifications (
                uuid, company_id, module, category, notification_type,
                priority, recipient_user_id, title, message,
                is_broadcast, is_read, created_at, updated_at
            ) VALUES (
                :uuid, :companyId, 'testing', 'system', 'test_notification',
                'medium', :userId, 'Test Notification CRUD', 'This is a test notification for CRUD testing',
                false, false, NOW(), NOW()
            )
        `, {
            replacements: { uuid: notifUuid, companyId: testData.companyId, userId: testData.userId },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ notifications');
        const [notif] = await sequelize.query(`
            SELECT * FROM notifications WHERE uuid = :uuid::uuid
        `, { replacements: { uuid: notifUuid }, type: QueryTypes.SELECT });

        recordTest('Notification CREATE + READ', notif && notif.title === 'Test Notification CRUD',
            `ID: ${notif?.id}`);
        testData.notifId = notif?.id;

        // UPDATE
        log('crud', 'UPDATE notifications');
        await sequelize.query(`
            UPDATE notifications SET is_read = true, priority = 'high', message = 'Test UPDATED Message', updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.notifId }, type: QueryTypes.UPDATE });

        const [updatedNotif] = await sequelize.query(`SELECT * FROM notifications WHERE id = :id`,
            { replacements: { id: testData.notifId }, type: QueryTypes.SELECT });

        recordTest('Notification UPDATE',
            updatedNotif.is_read === true && updatedNotif.priority === 'high',
            `priority=${updatedNotif.priority}, read=${updatedNotif.is_read}`);

        // ================================================================
        // 6. PERSISTENCIA - Verificación
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '6. PERSISTENCIA - Verificación');
        console.log('-'.repeat(50));

        const savedIds = {
            branchId: testData.branchId,
            kioskId: testData.kioskId,
            vacationId: testData.vacationId,
            dmsDocId: testData.dmsDocId,
            notifId: testData.notifId
        };

        log('info', 'Esperando commit...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        log('crud', 'Verificando persistencia...');

        const [pBranch] = await sequelize.query(`SELECT * FROM branches WHERE id = :id::uuid`,
            { replacements: { id: savedIds.branchId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Branch', pBranch && pBranch.address === 'Test UPDATED Address');

        const [pKiosk] = await sequelize.query(`SELECT * FROM kiosks WHERE id = :id`,
            { replacements: { id: savedIds.kioskId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Kiosk', pKiosk && pKiosk.description === 'Test UPDATED Description');

        const [pVacation] = await sequelize.query(`SELECT * FROM vacation_requests WHERE id = :id`,
            { replacements: { id: savedIds.vacationId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Vacation', pVacation && pVacation.status === 'approved');

        const [pDmsDoc] = await sequelize.query(`SELECT * FROM dms_documents WHERE id = :id::uuid`,
            { replacements: { id: savedIds.dmsDocId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: DMS Document', pDmsDoc && pDmsDoc.description === 'Test UPDATED Description');

        const [pNotif] = await sequelize.query(`SELECT * FROM notifications WHERE id = :id`,
            { replacements: { id: savedIds.notifId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Notification', pNotif && pNotif.is_read === true);

        // ================================================================
        // 7. DELETE - Limpieza
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '7. DELETE - Limpieza');
        console.log('-'.repeat(50));

        // DELETE Notification
        log('crud', 'DELETE notifications');
        await sequelize.query(`DELETE FROM notifications WHERE id = :id`,
            { replacements: { id: savedIds.notifId }, type: QueryTypes.DELETE });
        const [delNotif] = await sequelize.query(`SELECT * FROM notifications WHERE id = :id`,
            { replacements: { id: savedIds.notifId }, type: QueryTypes.SELECT });
        recordTest('Notification DELETE', !delNotif, 'Eliminado');

        // DELETE DMS Document
        log('crud', 'DELETE dms_documents');
        await sequelize.query(`DELETE FROM dms_documents WHERE id = :id::uuid`,
            { replacements: { id: savedIds.dmsDocId }, type: QueryTypes.DELETE });
        const [delDms] = await sequelize.query(`SELECT * FROM dms_documents WHERE id = :id::uuid`,
            { replacements: { id: savedIds.dmsDocId }, type: QueryTypes.SELECT });
        recordTest('DMS Document DELETE', !delDms, 'Eliminado');

        // DELETE Vacation Request
        log('crud', 'DELETE vacation_requests');
        await sequelize.query(`DELETE FROM vacation_requests WHERE id = :id`,
            { replacements: { id: savedIds.vacationId }, type: QueryTypes.DELETE });
        const [delVac] = await sequelize.query(`SELECT * FROM vacation_requests WHERE id = :id`,
            { replacements: { id: savedIds.vacationId }, type: QueryTypes.SELECT });
        recordTest('Vacation Request DELETE', !delVac, 'Eliminado');

        // DELETE Kiosk
        log('crud', 'DELETE kiosks');
        await sequelize.query(`DELETE FROM kiosks WHERE id = :id`,
            { replacements: { id: savedIds.kioskId }, type: QueryTypes.DELETE });
        const [delKiosk] = await sequelize.query(`SELECT * FROM kiosks WHERE id = :id`,
            { replacements: { id: savedIds.kioskId }, type: QueryTypes.SELECT });
        recordTest('Kiosk DELETE', !delKiosk, 'Eliminado');

        // DELETE Branch
        log('crud', 'DELETE branches');
        await sequelize.query(`DELETE FROM branches WHERE id = :id::uuid`,
            { replacements: { id: savedIds.branchId }, type: QueryTypes.DELETE });
        const [delBranch] = await sequelize.query(`SELECT * FROM branches WHERE id = :id::uuid`,
            { replacements: { id: savedIds.branchId }, type: QueryTypes.SELECT });
        recordTest('Branch DELETE', !delBranch, 'Eliminado');

        // Verificar persistencia DELETE
        log('info', 'Verificando persistencia DELETE...');
        await new Promise(resolve => setTimeout(resolve, 500));

        const [checkBranch] = await sequelize.query(`SELECT * FROM branches WHERE id = :id::uuid`,
            { replacements: { id: savedIds.branchId }, type: QueryTypes.SELECT });
        recordTest('PERSIST DELETE: All cleared', !checkBranch, 'Datos eliminados permanentemente');

    } catch (error) {
        console.error(`${colors.red}ERROR:${colors.reset}`, error.message);
        console.error(error.stack);
        stats.failed++;
    } finally {
        await sequelize.close();
    }

    // RESUMEN
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}RESUMEN LOTE 2${colors.reset}`);
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
