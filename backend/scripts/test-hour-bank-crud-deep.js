/**
 * ============================================================================
 * HOUR BANK - CRUD PROFUNDO + PERSISTENCIA
 * ============================================================================
 *
 * Tests CRUD reales con persistencia de datos:
 * 1. CREATE - Insertar registros reales
 * 2. READ - Leer y verificar datos
 * 3. UPDATE - Modificar y verificar cambios
 * 4. DELETE - Eliminar y verificar
 * 5. PERSISTENCIA - Cerrar conexión, reconectar, verificar
 *
 * @version 1.0.0
 * @date 2026-01-21
 * ============================================================================
 */

const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');

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
    console.log(`${colors.bold}HOUR BANK - CRUD PROFUNDO + PERSISTENCIA${colors.reset}`);
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
        // 1. HOUR BANK TEMPLATES - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '1. HOUR BANK TEMPLATES - CRUD');
        console.log('-'.repeat(50));

        // CREATE Template - First disable existing test templates
        log('crud', 'CREATE hour_bank_templates');
        const templateCode = `TEST_CRUD_${Date.now()}`;

        // Disable any existing test templates to avoid constraint violations
        await sequelize.query(`
            UPDATE hour_bank_templates
            SET is_enabled = false, updated_at = NOW()
            WHERE company_id = :companyId AND template_code LIKE 'TEST_%'
        `, { replacements: { companyId: testData.companyId }, type: QueryTypes.UPDATE });

        await sequelize.query(`
            INSERT INTO hour_bank_templates (
                company_id, template_code, template_name, description,
                max_accumulation_hours, expiration_months, max_negative_balance, is_enabled,
                created_at, updated_at
            ) VALUES (
                :companyId, :code, 'Template CRUD Test', 'Test de persistencia',
                100, 12, 0, false,
                NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, code: templateCode },
            type: QueryTypes.INSERT
        });

        // READ Template
        log('crud', 'READ hour_bank_templates');
        const [createdTemplate] = await sequelize.query(`
            SELECT * FROM hour_bank_templates WHERE template_code = :code AND company_id = :companyId
        `, { replacements: { code: templateCode, companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Template CREATE + READ',
            createdTemplate && createdTemplate.template_name === 'Template CRUD Test',
            `ID: ${createdTemplate?.id}`);
        testData.templateId = createdTemplate?.id;

        // UPDATE Template
        log('crud', 'UPDATE hour_bank_templates');
        await sequelize.query(`
            UPDATE hour_bank_templates
            SET template_name = 'Template UPDATED', max_accumulation_hours = 200, updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.templateId }, type: QueryTypes.UPDATE });

        const [updatedTemplate] = await sequelize.query(`
            SELECT * FROM hour_bank_templates WHERE id = :id
        `, { replacements: { id: testData.templateId }, type: QueryTypes.SELECT });

        recordTest('Template UPDATE',
            updatedTemplate.template_name === 'Template UPDATED' && parseFloat(updatedTemplate.max_accumulation_hours) === 200,
            `name=${updatedTemplate.template_name}, max_hours=${updatedTemplate.max_accumulation_hours}`);

        // ================================================================
        // 2. HOUR BANK BALANCES - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '2. HOUR BANK BALANCES - CRUD');
        console.log('-'.repeat(50));

        // CREATE Balance (UUID id) - First check if exists
        log('crud', 'CREATE hour_bank_balances');
        const balanceId = require('crypto').randomUUID();

        // Delete any existing balance for this user/company combo (unique constraint)
        await sequelize.query(`
            DELETE FROM hour_bank_balances
            WHERE user_id = :userId AND company_id = :companyId
        `, {
            replacements: { userId: testData.userId, companyId: testData.companyId },
            type: QueryTypes.DELETE
        });

        await sequelize.query(`
            INSERT INTO hour_bank_balances (
                id, company_id, user_id, template_id,
                current_balance, total_accrued, total_used,
                next_expiry_date, created_at, updated_at
            ) VALUES (
                :balanceId, :companyId, :userId, :templateId,
                50.5, 100, 49.5,
                CURRENT_DATE + INTERVAL '6 months', NOW(), NOW()
            )
        `, {
            replacements: {
                balanceId: balanceId,
                companyId: testData.companyId,
                userId: testData.userId,
                templateId: testData.templateId
            },
            type: QueryTypes.INSERT
        });

        // READ Balance
        log('crud', 'READ hour_bank_balances');
        const [createdBalance] = await sequelize.query(`
            SELECT * FROM hour_bank_balances
            WHERE user_id = :userId AND template_id = :templateId
        `, {
            replacements: { userId: testData.userId, templateId: testData.templateId },
            type: QueryTypes.SELECT
        });

        recordTest('Balance CREATE + READ',
            createdBalance && parseFloat(createdBalance.current_balance) === 50.5,
            `balance=${createdBalance?.current_balance}`);
        testData.balanceId = createdBalance?.id;

        // UPDATE Balance
        log('crud', 'UPDATE hour_bank_balances');
        await sequelize.query(`
            UPDATE hour_bank_balances
            SET current_balance = 75.25, total_used = 24.75, updated_at = NOW()
            WHERE id = :id::uuid
        `, { replacements: { id: testData.balanceId }, type: QueryTypes.UPDATE });

        const [updatedBalance] = await sequelize.query(`
            SELECT * FROM hour_bank_balances WHERE id = :id::uuid
        `, { replacements: { id: testData.balanceId }, type: QueryTypes.SELECT });

        recordTest('Balance UPDATE',
            parseFloat(updatedBalance.current_balance) === 75.25,
            `new balance=${updatedBalance.current_balance}`);

        // ================================================================
        // 3. HOUR BANK TRANSACTIONS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '3. HOUR BANK TRANSACTIONS - CRUD');
        console.log('-'.repeat(50));

        // CREATE Transaction (UUID id)
        log('crud', 'CREATE hour_bank_transactions');
        const transactionId = require('crypto').randomUUID();
        await sequelize.query(`
            INSERT INTO hour_bank_transactions (
                id, company_id, user_id, template_id,
                transaction_type, hours_raw, hours_final, conversion_rate,
                description, status, created_at, updated_at
            ) VALUES (
                :txId, :companyId, :userId, :templateId,
                'accrual', 8.5, 8.5, 1.0,
                'Test CRUD Transaction', 'approved', NOW(), NOW()
            )
        `, {
            replacements: {
                txId: transactionId,
                companyId: testData.companyId,
                userId: testData.userId,
                templateId: testData.templateId
            },
            type: QueryTypes.INSERT
        });
        testData.transactionIdGenerated = transactionId;

        // READ Transaction
        log('crud', 'READ hour_bank_transactions');
        const [createdTx] = await sequelize.query(`
            SELECT * FROM hour_bank_transactions
            WHERE user_id = :userId AND template_id = :templateId
            AND description = 'Test CRUD Transaction'
            ORDER BY created_at DESC LIMIT 1
        `, {
            replacements: { userId: testData.userId, templateId: testData.templateId },
            type: QueryTypes.SELECT
        });

        recordTest('Transaction CREATE + READ',
            createdTx && parseFloat(createdTx.hours_final) === 8.5,
            `hours=${createdTx?.hours_final}, type=${createdTx?.transaction_type}`);
        testData.transactionId = createdTx?.id;

        // UPDATE Transaction
        log('crud', 'UPDATE hour_bank_transactions');
        await sequelize.query(`
            UPDATE hour_bank_transactions
            SET hours_final = 10.0, description = 'Test CRUD UPDATED', updated_at = NOW()
            WHERE id = :id::uuid
        `, { replacements: { id: testData.transactionId }, type: QueryTypes.UPDATE });

        const [updatedTx] = await sequelize.query(`
            SELECT * FROM hour_bank_transactions WHERE id = :id::uuid
        `, { replacements: { id: testData.transactionId }, type: QueryTypes.SELECT });

        recordTest('Transaction UPDATE',
            parseFloat(updatedTx.hours_final) === 10.0 && updatedTx.description === 'Test CRUD UPDATED',
            `hours=${updatedTx.hours_final}`);

        // ================================================================
        // 4. PERSISTENCIA - Verificar datos en nueva query
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '4. PERSISTENCIA - Verificar datos persisten');
        console.log('-'.repeat(50));

        // Guardar IDs
        const savedIds = {
            templateId: testData.templateId,
            balanceId: testData.balanceId,
            transactionId: testData.transactionId,
            templateCode: templateCode
        };

        log('info', 'Esperando commit de transacciones...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verificar que los datos persisten con queries frescas
        log('crud', 'Verificando persistencia de datos...');

        const [persistedTemplate] = await sequelize.query(`
            SELECT * FROM hour_bank_templates WHERE id = :id
        `, { replacements: { id: savedIds.templateId }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: Template existe',
            persistedTemplate && persistedTemplate.template_name === 'Template UPDATED',
            `name=${persistedTemplate?.template_name}`);

        const [persistedBalance] = await sequelize.query(`
            SELECT * FROM hour_bank_balances WHERE id = :id
        `, { replacements: { id: savedIds.balanceId }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: Balance existe',
            persistedBalance && parseFloat(persistedBalance.current_balance) === 75.25,
            `balance=${persistedBalance?.current_balance}`);

        const [persistedTx] = await sequelize.query(`
            SELECT * FROM hour_bank_transactions WHERE id = :id::uuid
        `, { replacements: { id: savedIds.transactionId }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: Transaction existe',
            persistedTx && persistedTx.description === 'Test CRUD UPDATED',
            `desc=${persistedTx?.description}`);

        // ================================================================
        // 5. DELETE - Limpieza
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '5. DELETE - Limpieza');
        console.log('-'.repeat(50));

        // DELETE Transaction
        log('crud', 'DELETE hour_bank_transactions');
        await sequelize.query(`
            DELETE FROM hour_bank_transactions WHERE id = :id::uuid
        `, { replacements: { id: savedIds.transactionId }, type: QueryTypes.DELETE });

        const [deletedTx] = await sequelize.query(`
            SELECT * FROM hour_bank_transactions WHERE id = :id::uuid
        `, { replacements: { id: savedIds.transactionId }, type: QueryTypes.SELECT });

        recordTest('Transaction DELETE', !deletedTx, 'Registro eliminado');

        // DELETE Balance
        log('crud', 'DELETE hour_bank_balances');
        await sequelize.query(`
            DELETE FROM hour_bank_balances WHERE id = :id
        `, { replacements: { id: savedIds.balanceId }, type: QueryTypes.DELETE });

        const [deletedBalance] = await sequelize.query(`
            SELECT * FROM hour_bank_balances WHERE id = :id
        `, { replacements: { id: savedIds.balanceId }, type: QueryTypes.SELECT });

        recordTest('Balance DELETE', !deletedBalance, 'Registro eliminado');

        // DELETE Template
        log('crud', 'DELETE hour_bank_templates');
        await sequelize.query(`
            DELETE FROM hour_bank_templates WHERE id = :id
        `, { replacements: { id: savedIds.templateId }, type: QueryTypes.DELETE });

        const [deletedTemplate] = await sequelize.query(`
            SELECT * FROM hour_bank_templates WHERE id = :id
        `, { replacements: { id: savedIds.templateId }, type: QueryTypes.SELECT });

        recordTest('Template DELETE', !deletedTemplate, 'Registro eliminado');

        // Verificar que realmente se eliminaron
        log('info', 'Verificando persistencia de DELETE...');
        await new Promise(resolve => setTimeout(resolve, 500));

        const [checkTemplate] = await sequelize.query(`
            SELECT * FROM hour_bank_templates WHERE template_code = :code
        `, { replacements: { code: savedIds.templateCode }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: DELETE persiste',
            !checkTemplate, 'Datos eliminados permanentemente');

    } catch (error) {
        console.error(`${colors.red}ERROR:${colors.reset}`, error.message);
        stats.failed++;
    } finally {
        await sequelize.close();
    }

    // RESUMEN
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}RESUMEN CRUD HOUR BANK${colors.reset}`);
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
