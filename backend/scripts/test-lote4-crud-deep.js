/**
 * ============================================================================
 * LOTE 4: HSE, BIOMETRIC, SUPPORT, CALENDAR, PROCEDURES
 * CRUD PROFUNDO + PERSISTENCIA - NIVEL PRODUCCION
 * ============================================================================
 *
 * @version 1.0.0
 * @date 2026-01-21
 * ============================================================================
 */

const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');
const crypto = require('crypto');

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
    console.log(`${colors.bold}LOTE 4: HSE, BIOMETRIC, SUPPORT, CALENDAR, PROCEDURES${colors.reset}`);
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
        // 1. HSE_CASES - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '1. HSE_CASES - CRUD');
        console.log('-'.repeat(50));

        // CREATE - Valid source_type: MEDICAL_CERTIFICATE, PPE_DETECTION, MANUAL, EXTERNAL_REPORT
        // Valid case_type: ACCIDENTE_TRABAJO, ENFERMEDAD_PROFESIONAL, ENFERMEDAD_RELACIONADA, INCIDENTE_SIN_LESION
        // Valid severity: LEVE, MODERADO, GRAVE, MUY_GRAVE, FATAL
        log('crud', 'CREATE hse_cases');
        const hseCaseId = crypto.randomUUID();
        const caseNumber = `HSE_TEST_${Date.now()}`;
        await sequelize.query(`
            INSERT INTO hse_cases (
                id, company_id, case_number, source_type, case_type,
                severity, days_off, employee_id,
                created_at, updated_at
            ) VALUES (
                :id, :companyId, :caseNumber, 'MANUAL', 'INCIDENTE_SIN_LESION',
                'LEVE', 0, :userId,
                NOW(), NOW()
            )
        `, {
            replacements: { id: hseCaseId, companyId: testData.companyId, caseNumber, userId: testData.userId },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ hse_cases');
        const [hseCase] = await sequelize.query(`
            SELECT * FROM hse_cases WHERE id = :id::uuid
        `, { replacements: { id: hseCaseId }, type: QueryTypes.SELECT });

        recordTest('HSE Case CREATE + READ', hseCase && hseCase.source_type === 'MANUAL',
            `ID: ${hseCase?.id?.slice(0, 8)}`);
        testData.hseCaseId = hseCaseId;

        // UPDATE
        log('crud', 'UPDATE hse_cases');
        await sequelize.query(`
            UPDATE hse_cases SET severity = 'MODERADO', days_off = 3, violation_notes = 'Test UPDATED', updated_at = NOW()
            WHERE id = :id::uuid
        `, { replacements: { id: testData.hseCaseId }, type: QueryTypes.UPDATE });

        const [updatedHseCase] = await sequelize.query(`SELECT * FROM hse_cases WHERE id = :id::uuid`,
            { replacements: { id: testData.hseCaseId }, type: QueryTypes.SELECT });

        recordTest('HSE Case UPDATE',
            updatedHseCase.severity === 'MODERADO' && parseInt(updatedHseCase.days_off) === 3,
            `severity=${updatedHseCase.severity}`);

        // ================================================================
        // 2. BIOMETRIC_DATA - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '2. BIOMETRIC_DATA - CRUD');
        console.log('-'.repeat(50));

        // CREATE - Valid type: fingerprint, face, iris
        log('crud', 'CREATE biometric_data');
        const biometricId = crypto.randomUUID();
        await sequelize.query(`
            INSERT INTO biometric_data (
                id, "UserId", user_id, type, template, quality,
                algorithm, "isActive", notes,
                "createdAt", "updatedAt"
            ) VALUES (
                :id, :userId, :userId, 'face', 'TEST_BIOMETRIC_TEMPLATE_DATA', 85,
                'test_algorithm', true, 'Test CRUD biometric data',
                NOW(), NOW()
            )
        `, {
            replacements: { id: biometricId, userId: testData.userId },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ biometric_data');
        const [biometricData] = await sequelize.query(`
            SELECT * FROM biometric_data WHERE id = :id::uuid
        `, { replacements: { id: biometricId }, type: QueryTypes.SELECT });

        recordTest('Biometric Data CREATE + READ', biometricData && biometricData.type === 'face',
            `ID: ${biometricData?.id?.slice(0, 8)}`);
        testData.biometricId = biometricId;

        // UPDATE
        log('crud', 'UPDATE biometric_data');
        await sequelize.query(`
            UPDATE biometric_data SET quality = 95, notes = 'Test UPDATED biometric', "updatedAt" = NOW()
            WHERE id = :id::uuid
        `, { replacements: { id: testData.biometricId }, type: QueryTypes.UPDATE });

        const [updatedBiometric] = await sequelize.query(`SELECT * FROM biometric_data WHERE id = :id::uuid`,
            { replacements: { id: testData.biometricId }, type: QueryTypes.SELECT });

        recordTest('Biometric Data UPDATE',
            parseInt(updatedBiometric.quality) === 95 && updatedBiometric.notes === 'Test UPDATED biometric',
            `quality=${updatedBiometric.quality}`);

        // ================================================================
        // 3. SUPPORT_TICKETS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '3. SUPPORT_TICKETS - CRUD');
        console.log('-'.repeat(50));

        // CREATE - Valid priority: low, medium, high, urgent
        // Valid status: open, in_progress, waiting_customer, resolved, closed
        log('crud', 'CREATE support_tickets');
        const ticketId = crypto.randomUUID();
        const ticketNumber = `TICKET_TEST_${Date.now()}`;
        await sequelize.query(`
            INSERT INTO support_tickets (
                ticket_id, ticket_number, company_id, created_by_user_id,
                module_name, subject, description, priority, status,
                allow_support_access, created_at, updated_at
            ) VALUES (
                :ticketId, :ticketNumber, :companyId, :userId,
                'users', 'Test Support Ticket CRUD', 'Test ticket description', 'medium', 'open',
                false, NOW(), NOW()
            )
        `, {
            replacements: { ticketId, ticketNumber, companyId: testData.companyId, userId: testData.userId },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ support_tickets');
        const [ticket] = await sequelize.query(`
            SELECT * FROM support_tickets WHERE ticket_id = :ticketId::uuid
        `, { replacements: { ticketId }, type: QueryTypes.SELECT });

        recordTest('Support Ticket CREATE + READ', ticket && ticket.priority === 'medium',
            `ID: ${ticket?.ticket_id?.slice(0, 8)}`);
        testData.ticketId = ticketId;

        // UPDATE
        log('crud', 'UPDATE support_tickets');
        await sequelize.query(`
            UPDATE support_tickets SET status = 'in_progress', priority = 'high', updated_at = NOW()
            WHERE ticket_id = :ticketId::uuid
        `, { replacements: { ticketId: testData.ticketId }, type: QueryTypes.UPDATE });

        const [updatedTicket] = await sequelize.query(`SELECT * FROM support_tickets WHERE ticket_id = :ticketId::uuid`,
            { replacements: { ticketId: testData.ticketId }, type: QueryTypes.SELECT });

        recordTest('Support Ticket UPDATE',
            updatedTicket.status === 'in_progress' && updatedTicket.priority === 'high',
            `status=${updatedTicket.status}`);

        // ================================================================
        // 4. CALENDAR_EVENTS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '4. CALENDAR_EVENTS - CRUD');
        console.log('-'.repeat(50));

        // CREATE
        log('crud', 'CREATE calendar_events');
        await sequelize.query(`
            INSERT INTO calendar_events (
                employee_id, event_type, event_title,
                event_start, event_end,
                synced_at, last_updated
            ) VALUES (
                :userId, 'meeting', 'Test Calendar Event CRUD',
                NOW(), NOW() + INTERVAL '1 hour',
                NOW(), NOW()
            )
        `, {
            replacements: { userId: testData.userId },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ calendar_events');
        const [calEvent] = await sequelize.query(`
            SELECT * FROM calendar_events
            WHERE employee_id = :userId AND event_title = 'Test Calendar Event CRUD'
            ORDER BY last_updated DESC LIMIT 1
        `, { replacements: { userId: testData.userId }, type: QueryTypes.SELECT });

        recordTest('Calendar Event CREATE + READ', calEvent && calEvent.event_type === 'meeting',
            `ID: ${calEvent?.id}`);
        testData.calEventId = calEvent?.id;

        // UPDATE
        log('crud', 'UPDATE calendar_events');
        await sequelize.query(`
            UPDATE calendar_events SET event_title = 'Test UPDATED Event', last_updated = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.calEventId }, type: QueryTypes.UPDATE });

        const [updatedCalEvent] = await sequelize.query(`SELECT * FROM calendar_events WHERE id = :id`,
            { replacements: { id: testData.calEventId }, type: QueryTypes.SELECT });

        recordTest('Calendar Event UPDATE',
            updatedCalEvent.event_title === 'Test UPDATED Event',
            `title=${updatedCalEvent.event_title}`);

        // ================================================================
        // 5. PROCEDURES - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '5. PROCEDURES - CRUD');
        console.log('-'.repeat(50));

        // CREATE - type='politica' es nivel raíz (no requiere padre)
        log('crud', 'CREATE procedures');
        const procedureId = crypto.randomUUID();
        const procedureCode = `PROC_TEST_${Date.now()}`;
        await sequelize.query(`
            INSERT INTO procedures (
                id, company_id, code, title, type,
                current_version, version_label, status,
                objective, scope, procedure_content,
                effective_date, created_at, updated_at
            ) VALUES (
                :id, :companyId, :code, 'Test Procedure CRUD', 'politica',
                1, '1.0', 'draft',
                'Test objective', 'Test scope', 'Test procedure content',
                CURRENT_DATE, NOW(), NOW()
            )
        `, {
            replacements: { id: procedureId, companyId: testData.companyId, code: procedureCode },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ procedures');
        const [procedure] = await sequelize.query(`
            SELECT * FROM procedures WHERE id = :id::uuid
        `, { replacements: { id: procedureId }, type: QueryTypes.SELECT });

        recordTest('Procedure CREATE + READ', procedure && procedure.status === 'draft',
            `ID: ${procedure?.id?.slice(0, 8)}`);
        testData.procedureId = procedureId;

        // UPDATE
        log('crud', 'UPDATE procedures');
        await sequelize.query(`
            UPDATE procedures SET status = 'active', objective = 'Test UPDATED objective', updated_at = NOW()
            WHERE id = :id::uuid
        `, { replacements: { id: testData.procedureId }, type: QueryTypes.UPDATE });

        const [updatedProcedure] = await sequelize.query(`SELECT * FROM procedures WHERE id = :id::uuid`,
            { replacements: { id: testData.procedureId }, type: QueryTypes.SELECT });

        recordTest('Procedure UPDATE',
            updatedProcedure.objective === 'Test UPDATED objective',
            `status=${updatedProcedure.status}`);

        // ================================================================
        // 6. PERSISTENCIA - Verificación
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '6. PERSISTENCIA - Verificación');
        console.log('-'.repeat(50));

        const savedIds = {
            hseCaseId: testData.hseCaseId,
            biometricId: testData.biometricId,
            ticketId: testData.ticketId,
            calEventId: testData.calEventId,
            procedureId: testData.procedureId
        };

        log('info', 'Esperando commit...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        log('crud', 'Verificando persistencia...');

        const [pHse] = await sequelize.query(`SELECT * FROM hse_cases WHERE id = :id::uuid`,
            { replacements: { id: savedIds.hseCaseId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: HSE Case', pHse && pHse.severity === 'MODERADO');

        const [pBio] = await sequelize.query(`SELECT * FROM biometric_data WHERE id = :id::uuid`,
            { replacements: { id: savedIds.biometricId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Biometric Data', pBio && parseInt(pBio.quality) === 95);

        const [pTicket] = await sequelize.query(`SELECT * FROM support_tickets WHERE ticket_id = :id::uuid`,
            { replacements: { id: savedIds.ticketId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Support Ticket', pTicket && pTicket.status === 'in_progress');

        const [pCal] = await sequelize.query(`SELECT * FROM calendar_events WHERE id = :id`,
            { replacements: { id: savedIds.calEventId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Calendar Event', pCal && pCal.event_title === 'Test UPDATED Event');

        const [pProc] = await sequelize.query(`SELECT * FROM procedures WHERE id = :id::uuid`,
            { replacements: { id: savedIds.procedureId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Procedure', pProc && pProc.objective === 'Test UPDATED objective');

        // ================================================================
        // 7. DELETE - Limpieza
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '7. DELETE - Limpieza');
        console.log('-'.repeat(50));

        // DELETE Procedure
        log('crud', 'DELETE procedures');
        await sequelize.query(`DELETE FROM procedures WHERE id = :id::uuid`,
            { replacements: { id: savedIds.procedureId }, type: QueryTypes.DELETE });
        const [delProc] = await sequelize.query(`SELECT * FROM procedures WHERE id = :id::uuid`,
            { replacements: { id: savedIds.procedureId }, type: QueryTypes.SELECT });
        recordTest('Procedure DELETE', !delProc, 'Eliminado');

        // DELETE Calendar Event
        log('crud', 'DELETE calendar_events');
        await sequelize.query(`DELETE FROM calendar_events WHERE id = :id`,
            { replacements: { id: savedIds.calEventId }, type: QueryTypes.DELETE });
        const [delCal] = await sequelize.query(`SELECT * FROM calendar_events WHERE id = :id`,
            { replacements: { id: savedIds.calEventId }, type: QueryTypes.SELECT });
        recordTest('Calendar Event DELETE', !delCal, 'Eliminado');

        // DELETE Support Ticket
        log('crud', 'DELETE support_tickets');
        await sequelize.query(`DELETE FROM support_tickets WHERE ticket_id = :id::uuid`,
            { replacements: { id: savedIds.ticketId }, type: QueryTypes.DELETE });
        const [delTicket] = await sequelize.query(`SELECT * FROM support_tickets WHERE ticket_id = :id::uuid`,
            { replacements: { id: savedIds.ticketId }, type: QueryTypes.SELECT });
        recordTest('Support Ticket DELETE', !delTicket, 'Eliminado');

        // DELETE Biometric Data
        log('crud', 'DELETE biometric_data');
        await sequelize.query(`DELETE FROM biometric_data WHERE id = :id::uuid`,
            { replacements: { id: savedIds.biometricId }, type: QueryTypes.DELETE });
        const [delBio] = await sequelize.query(`SELECT * FROM biometric_data WHERE id = :id::uuid`,
            { replacements: { id: savedIds.biometricId }, type: QueryTypes.SELECT });
        recordTest('Biometric Data DELETE', !delBio, 'Eliminado');

        // DELETE HSE Case
        log('crud', 'DELETE hse_cases');
        await sequelize.query(`DELETE FROM hse_cases WHERE id = :id::uuid`,
            { replacements: { id: savedIds.hseCaseId }, type: QueryTypes.DELETE });
        const [delHse] = await sequelize.query(`SELECT * FROM hse_cases WHERE id = :id::uuid`,
            { replacements: { id: savedIds.hseCaseId }, type: QueryTypes.SELECT });
        recordTest('HSE Case DELETE', !delHse, 'Eliminado');

        // Verificar persistencia DELETE
        log('info', 'Verificando persistencia DELETE...');
        await new Promise(resolve => setTimeout(resolve, 500));

        const [checkHse] = await sequelize.query(`SELECT * FROM hse_cases WHERE id = :id::uuid`,
            { replacements: { id: savedIds.hseCaseId }, type: QueryTypes.SELECT });
        recordTest('PERSIST DELETE: All cleared', !checkHse, 'Datos eliminados permanentemente');

    } catch (error) {
        console.error(`${colors.red}ERROR:${colors.reset}`, error.message);
        console.error(error.stack);
        stats.failed++;
    } finally {
        await sequelize.close();
    }

    // RESUMEN
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}RESUMEN LOTE 4${colors.reset}`);
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
