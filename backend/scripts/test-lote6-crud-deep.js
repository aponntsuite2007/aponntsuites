/**
 * ============================================================================
 * LOTE 6: FINANCE (5 SUB-MÓDULOS CONTABLES)
 * CRUD PROFUNDO + PERSISTENCIA - NIVEL PRODUCCION
 * ============================================================================
 *
 * Sub-módulos:
 * 1. Chart of Accounts (Plan de Cuentas)
 * 2. Cost Centers (Centros de Costo)
 * 3. Budgets (Presupuestos)
 * 4. Bank Accounts (Cuentas Bancarias)
 * 5. Journal Entries (Asientos Contables)
 *
 * @version 1.0.0
 * @date 2026-01-21
 * ============================================================================
 */

const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');

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
    console.log(`${colors.bold}LOTE 6: FINANCE (5 SUB-MÓDULOS CONTABLES)${colors.reset}`);
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
        // 1. FINANCE_CHART_OF_ACCOUNTS - Plan de Cuentas
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '1. FINANCE_CHART_OF_ACCOUNTS - Plan de Cuentas');
        console.log('-'.repeat(50));

        // CREATE - account_type: asset, liability, equity, revenue, expense
        // account_nature: debit, credit
        log('crud', 'CREATE finance_chart_of_accounts');
        const accountCode = `TEST.${Date.now().toString().slice(-6)}`;
        const accountNumber = parseInt(Date.now().toString().slice(-7));
        await sequelize.query(`
            INSERT INTO finance_chart_of_accounts (
                company_id, account_code, account_number, level, is_header,
                name, description, account_type, account_nature,
                is_active, created_at, updated_at
            ) VALUES (
                :companyId, :accountCode, :accountNumber, 3, false,
                'Test Account CRUD', 'Test account for CRUD testing', 'expense', 'debit',
                true, NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, accountCode, accountNumber },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ finance_chart_of_accounts');
        const [account] = await sequelize.query(`
            SELECT * FROM finance_chart_of_accounts WHERE account_code = :accountCode AND company_id = :companyId
        `, { replacements: { accountCode, companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Chart of Accounts CREATE + READ', account && account.account_type === 'expense',
            `ID: ${account?.id}`);
        testData.accountId = account?.id;

        // UPDATE
        log('crud', 'UPDATE finance_chart_of_accounts');
        await sequelize.query(`
            UPDATE finance_chart_of_accounts SET name = 'Test Account UPDATED', description = 'Updated description', updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.accountId }, type: QueryTypes.UPDATE });

        const [updatedAccount] = await sequelize.query(`SELECT * FROM finance_chart_of_accounts WHERE id = :id`,
            { replacements: { id: testData.accountId }, type: QueryTypes.SELECT });

        recordTest('Chart of Accounts UPDATE',
            updatedAccount.name === 'Test Account UPDATED',
            `name=${updatedAccount.name}`);

        // ================================================================
        // 2. FINANCE_COST_CENTERS - Centros de Costo
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '2. FINANCE_COST_CENTERS - Centros de Costo');
        console.log('-'.repeat(50));

        // CREATE
        log('crud', 'CREATE finance_cost_centers');
        const ccCode = `CC_TEST_${Date.now().toString().slice(-6)}`;
        await sequelize.query(`
            INSERT INTO finance_cost_centers (
                company_id, code, level, path, name, description,
                center_type, has_budget, budget_control_type,
                is_active, created_at, updated_at
            ) VALUES (
                :companyId, :code, 1, :code, 'Test Cost Center CRUD', 'Test cost center description',
                'operational', true, 'warning',
                true, NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, code: ccCode },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ finance_cost_centers');
        const [costCenter] = await sequelize.query(`
            SELECT * FROM finance_cost_centers WHERE code = :code AND company_id = :companyId
        `, { replacements: { code: ccCode, companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Cost Center CREATE + READ', costCenter && costCenter.center_type === 'operational',
            `ID: ${costCenter?.id}`);
        testData.costCenterId = costCenter?.id;

        // UPDATE
        log('crud', 'UPDATE finance_cost_centers');
        await sequelize.query(`
            UPDATE finance_cost_centers SET name = 'Test Cost Center UPDATED', has_budget = false, updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.costCenterId }, type: QueryTypes.UPDATE });

        const [updatedCC] = await sequelize.query(`SELECT * FROM finance_cost_centers WHERE id = :id`,
            { replacements: { id: testData.costCenterId }, type: QueryTypes.SELECT });

        recordTest('Cost Center UPDATE',
            updatedCC.name === 'Test Cost Center UPDATED' && updatedCC.has_budget === false,
            `name=${updatedCC.name}`);

        // ================================================================
        // 3. FINANCE_BUDGETS - Presupuestos
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '3. FINANCE_BUDGETS - Presupuestos');
        console.log('-'.repeat(50));

        // CREATE
        log('crud', 'CREATE finance_budgets');
        const budgetCode = `BUD_TEST_${Date.now().toString().slice(-6)}`;
        await sequelize.query(`
            INSERT INTO finance_budgets (
                company_id, budget_code, name, description,
                fiscal_year, budget_type, version, category,
                currency, status,
                created_at, updated_at
            ) VALUES (
                :companyId, :budgetCode, 'Test Budget CRUD', 'Test budget description',
                2026, 'operating', 1, 'departmental',
                'ARS', 'draft',
                NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, budgetCode },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ finance_budgets');
        const [budget] = await sequelize.query(`
            SELECT * FROM finance_budgets WHERE budget_code = :budgetCode AND company_id = :companyId
        `, { replacements: { budgetCode, companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Budget CREATE + READ', budget && budget.status === 'draft',
            `ID: ${budget?.id}`);
        testData.budgetId = budget?.id;

        // UPDATE
        log('crud', 'UPDATE finance_budgets');
        await sequelize.query(`
            UPDATE finance_budgets SET name = 'Test Budget UPDATED', status = 'approved', updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.budgetId }, type: QueryTypes.UPDATE });

        const [updatedBudget] = await sequelize.query(`SELECT * FROM finance_budgets WHERE id = :id`,
            { replacements: { id: testData.budgetId }, type: QueryTypes.SELECT });

        recordTest('Budget UPDATE',
            updatedBudget.name === 'Test Budget UPDATED' && updatedBudget.status === 'approved',
            `status=${updatedBudget.status}`);

        // ================================================================
        // 4. FINANCE_BANK_ACCOUNTS - Cuentas Bancarias
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '4. FINANCE_BANK_ACCOUNTS - Cuentas Bancarias');
        console.log('-'.repeat(50));

        // CREATE
        log('crud', 'CREATE finance_bank_accounts');
        const bankAccountCode = `BA_TEST_${Date.now().toString().slice(-6)}`;
        const bankAccountNumber = `${Date.now()}`.slice(-10);
        await sequelize.query(`
            INSERT INTO finance_bank_accounts (
                company_id, account_code, account_name, bank_name, bank_branch,
                account_number, account_type, cbu, currency,
                current_balance, available_balance, is_active,
                created_at, updated_at
            ) VALUES (
                :companyId, :accountCode, 'Test Bank Account CRUD', 'Test Bank', 'Test Branch',
                :accountNumber, 'checking', '0000000000000000000001', 'ARS',
                10000.00, 10000.00, true,
                NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, accountCode: bankAccountCode, accountNumber: bankAccountNumber },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ finance_bank_accounts');
        const [bankAccount] = await sequelize.query(`
            SELECT * FROM finance_bank_accounts WHERE account_code = :accountCode AND company_id = :companyId
        `, { replacements: { accountCode: bankAccountCode, companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Bank Account CREATE + READ', bankAccount && bankAccount.bank_name === 'Test Bank',
            `ID: ${bankAccount?.id}`);
        testData.bankAccountId = bankAccount?.id;

        // UPDATE
        log('crud', 'UPDATE finance_bank_accounts');
        await sequelize.query(`
            UPDATE finance_bank_accounts SET account_name = 'Test Bank Account UPDATED', current_balance = 15000.00, updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.bankAccountId }, type: QueryTypes.UPDATE });

        const [updatedBank] = await sequelize.query(`SELECT * FROM finance_bank_accounts WHERE id = :id`,
            { replacements: { id: testData.bankAccountId }, type: QueryTypes.SELECT });

        recordTest('Bank Account UPDATE',
            updatedBank.account_name === 'Test Bank Account UPDATED' && parseFloat(updatedBank.current_balance) === 15000.00,
            `balance=${updatedBank.current_balance}`);

        // ================================================================
        // 5. FINANCE_JOURNAL_ENTRIES - Asientos Contables
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '5. FINANCE_JOURNAL_ENTRIES - Asientos Contables');
        console.log('-'.repeat(50));

        // CREATE Journal Entry
        log('crud', 'CREATE finance_journal_entries');
        const entryNumber = `JE_TEST_${Date.now().toString().slice(-6)}`;

        // Get an existing account for the journal entry lines
        const [existingAccount] = await sequelize.query(`
            SELECT id FROM finance_chart_of_accounts WHERE company_id = :companyId AND is_header = false LIMIT 1
        `, { replacements: { companyId: testData.companyId }, type: QueryTypes.SELECT });

        if (!existingAccount) {
            log('fail', 'No hay cuenta contable para crear asiento');
            return stats;
        }

        await sequelize.query(`
            INSERT INTO finance_journal_entries (
                company_id, entry_number, fiscal_year, fiscal_period,
                entry_date, posting_date, entry_type, source_type,
                description, reference, status,
                total_debit, total_credit,
                created_by, created_at, updated_at
            ) VALUES (
                :companyId, :entryNumber, 2026, 1,
                CURRENT_DATE, CURRENT_DATE, 'manual', 'MANUAL',
                'Test Journal Entry CRUD', 'REF-TEST-001', 'draft',
                1000.00, 1000.00,
                :userId, NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, entryNumber, userId: testData.userId },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ finance_journal_entries');
        const [journalEntry] = await sequelize.query(`
            SELECT * FROM finance_journal_entries WHERE entry_number = :entryNumber AND company_id = :companyId
        `, { replacements: { entryNumber, companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Journal Entry CREATE + READ', journalEntry && journalEntry.entry_type === 'manual',
            `ID: ${journalEntry?.id}`);
        testData.journalEntryId = journalEntry?.id;

        // CREATE Journal Entry Lines
        log('crud', 'CREATE finance_journal_entry_lines (DEBIT)');
        await sequelize.query(`
            INSERT INTO finance_journal_entry_lines (
                journal_entry_id, line_number, account_id,
                debit_amount, credit_amount, description,
                created_at, updated_at
            ) VALUES (
                :journalEntryId, 1, :accountId,
                1000.00, 0.00, 'Debit line - Test CRUD',
                NOW(), NOW()
            )
        `, {
            replacements: { journalEntryId: testData.journalEntryId, accountId: existingAccount.id },
            type: QueryTypes.INSERT
        });

        log('crud', 'CREATE finance_journal_entry_lines (CREDIT)');
        await sequelize.query(`
            INSERT INTO finance_journal_entry_lines (
                journal_entry_id, line_number, account_id,
                debit_amount, credit_amount, description,
                created_at, updated_at
            ) VALUES (
                :journalEntryId, 2, :accountId,
                0.00, 1000.00, 'Credit line - Test CRUD',
                NOW(), NOW()
            )
        `, {
            replacements: { journalEntryId: testData.journalEntryId, accountId: testData.accountId },
            type: QueryTypes.INSERT
        });

        // READ Lines
        log('crud', 'READ finance_journal_entry_lines');
        const lines = await sequelize.query(`
            SELECT * FROM finance_journal_entry_lines WHERE journal_entry_id = :journalEntryId ORDER BY line_number
        `, { replacements: { journalEntryId: testData.journalEntryId }, type: QueryTypes.SELECT });

        recordTest('Journal Entry Lines CREATE + READ', lines && lines.length === 2,
            `Lines: ${lines.length}`);

        // UPDATE Journal Entry
        log('crud', 'UPDATE finance_journal_entries');
        await sequelize.query(`
            UPDATE finance_journal_entries SET description = 'Test Journal Entry UPDATED', status = 'posted', updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.journalEntryId }, type: QueryTypes.UPDATE });

        const [updatedJE] = await sequelize.query(`SELECT * FROM finance_journal_entries WHERE id = :id`,
            { replacements: { id: testData.journalEntryId }, type: QueryTypes.SELECT });

        recordTest('Journal Entry UPDATE',
            updatedJE.description === 'Test Journal Entry UPDATED' && updatedJE.status === 'posted',
            `status=${updatedJE.status}`);

        // ================================================================
        // 6. PERSISTENCIA - Verificación
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '6. PERSISTENCIA - Verificación');
        console.log('-'.repeat(50));

        const savedIds = {
            accountId: testData.accountId,
            costCenterId: testData.costCenterId,
            budgetId: testData.budgetId,
            bankAccountId: testData.bankAccountId,
            journalEntryId: testData.journalEntryId
        };

        log('info', 'Esperando commit...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        log('crud', 'Verificando persistencia...');

        const [pAccount] = await sequelize.query(`SELECT * FROM finance_chart_of_accounts WHERE id = :id`,
            { replacements: { id: savedIds.accountId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Chart of Accounts', pAccount && pAccount.name === 'Test Account UPDATED');

        const [pCC] = await sequelize.query(`SELECT * FROM finance_cost_centers WHERE id = :id`,
            { replacements: { id: savedIds.costCenterId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Cost Center', pCC && pCC.name === 'Test Cost Center UPDATED');

        const [pBudget] = await sequelize.query(`SELECT * FROM finance_budgets WHERE id = :id`,
            { replacements: { id: savedIds.budgetId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Budget', pBudget && pBudget.status === 'approved');

        const [pBank] = await sequelize.query(`SELECT * FROM finance_bank_accounts WHERE id = :id`,
            { replacements: { id: savedIds.bankAccountId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Bank Account', pBank && pBank.account_name === 'Test Bank Account UPDATED');

        const [pJE] = await sequelize.query(`SELECT * FROM finance_journal_entries WHERE id = :id`,
            { replacements: { id: savedIds.journalEntryId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Journal Entry', pJE && pJE.status === 'posted');

        // ================================================================
        // 7. DELETE - Limpieza (orden correcto por FK)
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '7. DELETE - Limpieza');
        console.log('-'.repeat(50));

        // DELETE Journal Entry Lines first (FK to journal_entry)
        log('crud', 'DELETE finance_journal_entry_lines');
        await sequelize.query(`DELETE FROM finance_journal_entry_lines WHERE journal_entry_id = :id`,
            { replacements: { id: savedIds.journalEntryId }, type: QueryTypes.DELETE });
        const delLines = await sequelize.query(`SELECT * FROM finance_journal_entry_lines WHERE journal_entry_id = :id`,
            { replacements: { id: savedIds.journalEntryId }, type: QueryTypes.SELECT });
        recordTest('Journal Entry Lines DELETE', delLines.length === 0, 'Eliminados');

        // DELETE Journal Entry
        log('crud', 'DELETE finance_journal_entries');
        await sequelize.query(`DELETE FROM finance_journal_entries WHERE id = :id`,
            { replacements: { id: savedIds.journalEntryId }, type: QueryTypes.DELETE });
        const [delJE] = await sequelize.query(`SELECT * FROM finance_journal_entries WHERE id = :id`,
            { replacements: { id: savedIds.journalEntryId }, type: QueryTypes.SELECT });
        recordTest('Journal Entry DELETE', !delJE, 'Eliminado');

        // DELETE Bank Account
        log('crud', 'DELETE finance_bank_accounts');
        await sequelize.query(`DELETE FROM finance_bank_accounts WHERE id = :id`,
            { replacements: { id: savedIds.bankAccountId }, type: QueryTypes.DELETE });
        const [delBank] = await sequelize.query(`SELECT * FROM finance_bank_accounts WHERE id = :id`,
            { replacements: { id: savedIds.bankAccountId }, type: QueryTypes.SELECT });
        recordTest('Bank Account DELETE', !delBank, 'Eliminado');

        // DELETE Budget
        log('crud', 'DELETE finance_budgets');
        await sequelize.query(`DELETE FROM finance_budgets WHERE id = :id`,
            { replacements: { id: savedIds.budgetId }, type: QueryTypes.DELETE });
        const [delBudget] = await sequelize.query(`SELECT * FROM finance_budgets WHERE id = :id`,
            { replacements: { id: savedIds.budgetId }, type: QueryTypes.SELECT });
        recordTest('Budget DELETE', !delBudget, 'Eliminado');

        // DELETE Cost Center
        log('crud', 'DELETE finance_cost_centers');
        await sequelize.query(`DELETE FROM finance_cost_centers WHERE id = :id`,
            { replacements: { id: savedIds.costCenterId }, type: QueryTypes.DELETE });
        const [delCC] = await sequelize.query(`SELECT * FROM finance_cost_centers WHERE id = :id`,
            { replacements: { id: savedIds.costCenterId }, type: QueryTypes.SELECT });
        recordTest('Cost Center DELETE', !delCC, 'Eliminado');

        // DELETE Chart of Accounts (last, may be referenced by journal lines)
        log('crud', 'DELETE finance_chart_of_accounts');
        await sequelize.query(`DELETE FROM finance_chart_of_accounts WHERE id = :id`,
            { replacements: { id: savedIds.accountId }, type: QueryTypes.DELETE });
        const [delAccount] = await sequelize.query(`SELECT * FROM finance_chart_of_accounts WHERE id = :id`,
            { replacements: { id: savedIds.accountId }, type: QueryTypes.SELECT });
        recordTest('Chart of Accounts DELETE', !delAccount, 'Eliminado');

        // Verificar persistencia DELETE
        log('info', 'Verificando persistencia DELETE...');
        await new Promise(resolve => setTimeout(resolve, 500));

        const [checkAccount] = await sequelize.query(`SELECT * FROM finance_chart_of_accounts WHERE id = :id`,
            { replacements: { id: savedIds.accountId }, type: QueryTypes.SELECT });
        recordTest('PERSIST DELETE: All cleared', !checkAccount, 'Datos eliminados permanentemente');

    } catch (error) {
        console.error(`${colors.red}ERROR:${colors.reset}`, error.message);
        console.error(error.stack);
        stats.failed++;
    } finally {
        await sequelize.close();
    }

    // RESUMEN
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}RESUMEN LOTE 6 - FINANCE${colors.reset}`);
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
