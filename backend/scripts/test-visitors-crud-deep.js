/**
 * ============================================================================
 * CONTROL DE VISITANTES - CRUD PROFUNDO + PERSISTENCIA
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
    console.log(`${colors.bold}CONTROL DE VISITANTES - CRUD PROFUNDO + PERSISTENCIA${colors.reset}`);
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
        // 1. VISITORS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '1. VISITORS - CRUD');
        console.log('-'.repeat(50));

        // CREATE Visitor
        log('crud', 'CREATE visitors');
        const visitorDni = `TEST${Date.now()}`;
        await sequelize.query(`
            INSERT INTO visitors (
                company_id, dni, first_name, last_name, email, phone,
                visit_reason, authorization_status, gps_tracking_enabled,
                scheduled_visit_date, is_active,
                created_at, updated_at
            ) VALUES (
                :companyId, :dni, 'Test', 'Visitor', 'test@visitor.com', '+5491234567890',
                'Test CRUD Visit Reason', 'pending', false,
                NOW() + INTERVAL '1 day', true,
                NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, dni: visitorDni },
            type: QueryTypes.INSERT
        });

        // READ Visitor
        log('crud', 'READ visitors');
        const [createdVisitor] = await sequelize.query(`
            SELECT * FROM visitors WHERE dni = :dni AND company_id = :companyId
        `, { replacements: { dni: visitorDni, companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Visitor CREATE + READ',
            createdVisitor && createdVisitor.authorization_status === 'pending',
            `ID: ${createdVisitor?.id}, status=${createdVisitor?.authorization_status}`);
        testData.visitorId = createdVisitor?.id;

        // UPDATE Visitor - Valid status: pending, authorized, rejected, completed
        log('crud', 'UPDATE visitors');
        await sequelize.query(`
            UPDATE visitors
            SET authorization_status = 'authorized', notes = 'Test UPDATED', authorized_by = :userId, authorized_at = NOW(), updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.visitorId, userId: testData.userId }, type: QueryTypes.UPDATE });

        const [updatedVisitor] = await sequelize.query(`
            SELECT * FROM visitors WHERE id = :id
        `, { replacements: { id: testData.visitorId }, type: QueryTypes.SELECT });

        recordTest('Visitor UPDATE',
            updatedVisitor.authorization_status === 'authorized' && updatedVisitor.notes === 'Test UPDATED',
            `status=${updatedVisitor.authorization_status}, notes=${updatedVisitor.notes}`);

        // ================================================================
        // 2. VISITOR GPS TRACKING - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '2. VISITOR GPS TRACKING - CRUD');
        console.log('-'.repeat(50));

        // CREATE GPS Record
        log('crud', 'CREATE visitor_gps_tracking');
        await sequelize.query(`
            INSERT INTO visitor_gps_tracking (
                company_id, visitor_id, latitude, longitude, accuracy,
                recorded_at, is_inside_facility, distance_from_center_meters,
                created_at, updated_at
            ) VALUES (
                :companyId, :visitorId, -34.6037, -58.3816, 10.5,
                NOW(), true, 50.0,
                NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, visitorId: testData.visitorId },
            type: QueryTypes.INSERT
        });

        // READ GPS Record
        log('crud', 'READ visitor_gps_tracking');
        const [createdGps] = await sequelize.query(`
            SELECT * FROM visitor_gps_tracking
            WHERE visitor_id = :visitorId
            ORDER BY recorded_at DESC LIMIT 1
        `, { replacements: { visitorId: testData.visitorId }, type: QueryTypes.SELECT });

        recordTest('GPS Tracking CREATE + READ',
            createdGps && createdGps.is_inside_facility === true,
            `ID: ${createdGps?.id}, lat=${createdGps?.latitude}, inside=${createdGps?.is_inside_facility}`);
        testData.gpsId = createdGps?.id;

        // UPDATE GPS Record
        log('crud', 'UPDATE visitor_gps_tracking');
        await sequelize.query(`
            UPDATE visitor_gps_tracking
            SET is_inside_facility = false, distance_from_center_meters = 150.0, alert_generated = true, alert_message = 'Test UPDATED alert', updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.gpsId }, type: QueryTypes.UPDATE });

        const [updatedGps] = await sequelize.query(`
            SELECT * FROM visitor_gps_tracking WHERE id = :id
        `, { replacements: { id: testData.gpsId }, type: QueryTypes.SELECT });

        recordTest('GPS Tracking UPDATE',
            updatedGps.is_inside_facility === false && updatedGps.alert_message === 'Test UPDATED alert',
            `inside=${updatedGps.is_inside_facility}, alert=${updatedGps.alert_message}`);

        // ================================================================
        // 3. VISITOR CHECK-IN/CHECK-OUT - Simular flujo completo
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '3. VISITOR CHECK-IN/CHECK-OUT');
        console.log('-'.repeat(50));

        // Simulate Check-In
        log('crud', 'SIMULAR Check-In');
        await sequelize.query(`
            UPDATE visitors
            SET check_in = NOW(), badge_number = 'BADGE-TEST-001', updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.visitorId }, type: QueryTypes.UPDATE });

        const [checkedInVisitor] = await sequelize.query(`
            SELECT * FROM visitors WHERE id = :id
        `, { replacements: { id: testData.visitorId }, type: QueryTypes.SELECT });

        recordTest('Visitor Check-In',
            checkedInVisitor.check_in !== null && checkedInVisitor.badge_number === 'BADGE-TEST-001',
            `check_in=${checkedInVisitor.check_in ? 'SET' : 'NULL'}, badge=${checkedInVisitor.badge_number}`);

        // Simulate Check-Out
        log('crud', 'SIMULAR Check-Out');
        await sequelize.query(`
            UPDATE visitors
            SET check_out = NOW(), is_active = false, updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.visitorId }, type: QueryTypes.UPDATE });

        const [checkedOutVisitor] = await sequelize.query(`
            SELECT * FROM visitors WHERE id = :id
        `, { replacements: { id: testData.visitorId }, type: QueryTypes.SELECT });

        recordTest('Visitor Check-Out',
            checkedOutVisitor.check_out !== null && checkedOutVisitor.is_active === false,
            `check_out=${checkedOutVisitor.check_out ? 'SET' : 'NULL'}, active=${checkedOutVisitor.is_active}`);

        // ================================================================
        // 4. PERSISTENCIA - Verificar datos persisten
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '4. PERSISTENCIA - Verificar datos persisten');
        console.log('-'.repeat(50));

        const savedIds = {
            visitorId: testData.visitorId,
            gpsId: testData.gpsId,
            visitorDni: visitorDni
        };

        log('info', 'Esperando commit de transacciones...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        log('crud', 'Verificando persistencia de datos...');

        const [persistedVisitor] = await sequelize.query(`
            SELECT * FROM visitors WHERE id = :id
        `, { replacements: { id: savedIds.visitorId }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: Visitor existe',
            persistedVisitor && persistedVisitor.authorization_status === 'authorized',
            `status=${persistedVisitor?.authorization_status}`);

        const [persistedGps] = await sequelize.query(`
            SELECT * FROM visitor_gps_tracking WHERE id = :id
        `, { replacements: { id: savedIds.gpsId }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: GPS Tracking existe',
            persistedGps && persistedGps.alert_message === 'Test UPDATED alert',
            `alert=${persistedGps?.alert_message}`);

        // ================================================================
        // 5. DELETE - Limpieza (order matters due to FK constraints)
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '5. DELETE - Limpieza');
        console.log('-'.repeat(50));

        // DELETE GPS first (FK to visitor)
        log('crud', 'DELETE visitor_gps_tracking');
        await sequelize.query(`
            DELETE FROM visitor_gps_tracking WHERE id = :id
        `, { replacements: { id: savedIds.gpsId }, type: QueryTypes.DELETE });

        const [deletedGps] = await sequelize.query(`
            SELECT * FROM visitor_gps_tracking WHERE id = :id
        `, { replacements: { id: savedIds.gpsId }, type: QueryTypes.SELECT });

        recordTest('GPS Tracking DELETE', !deletedGps, 'Registro eliminado');

        // DELETE Visitor
        log('crud', 'DELETE visitors');
        await sequelize.query(`
            DELETE FROM visitors WHERE id = :id
        `, { replacements: { id: savedIds.visitorId }, type: QueryTypes.DELETE });

        const [deletedVisitor] = await sequelize.query(`
            SELECT * FROM visitors WHERE id = :id
        `, { replacements: { id: savedIds.visitorId }, type: QueryTypes.SELECT });

        recordTest('Visitor DELETE', !deletedVisitor, 'Registro eliminado');

        // Verificar persistencia de DELETE
        log('info', 'Verificando persistencia de DELETE...');
        await new Promise(resolve => setTimeout(resolve, 500));

        const [checkVisitor] = await sequelize.query(`
            SELECT * FROM visitors WHERE dni = :dni
        `, { replacements: { dni: savedIds.visitorDni }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: DELETE persiste',
            !checkVisitor, 'Datos eliminados permanentemente');

    } catch (error) {
        console.error(`${colors.red}ERROR:${colors.reset}`, error.message);
        stats.failed++;
    } finally {
        await sequelize.close();
    }

    // RESUMEN
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}RESUMEN CRUD CONTROL DE VISITANTES${colors.reset}`);
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
