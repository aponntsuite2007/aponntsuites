/**
 * ============================================================================
 * LOTE 3: LEGAL, SANCTIONS, RECRUITMENT, BENEFITS, CONTRACTS
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
    console.log(`${colors.bold}LOTE 3: LEGAL, SANCTIONS, RECRUITMENT, BENEFITS, CONTRACTS${colors.reset}`);
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
        // 1. LEGAL_CASES - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '1. LEGAL_CASES - CRUD');
        console.log('-'.repeat(50));

        // CREATE - Valid case_type: lawsuit_employee, labor_claim, mediation_request, etc.
        // Valid current_stage: prejudicial, mediation, judicial, appeal, execution, closed
        log('crud', 'CREATE legal_cases');
        const caseNumber = `CASE_TEST_${Date.now()}`;
        await sequelize.query(`
            INSERT INTO legal_cases (
                company_id, case_number, case_type, employee_id,
                employee_name, title, description, current_stage,
                is_active, priority, risk_assessment,
                claimed_amount, currency,
                created_at, updated_at
            ) VALUES (
                :companyId, :caseNumber, 'labor_claim', :userId,
                'Test Employee', 'Test Legal Case CRUD', 'Test case description', 'prejudicial',
                true, 'normal', 'medium',
                50000.00, 'ARS',
                NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, caseNumber, userId: testData.userId },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ legal_cases');
        const [legalCase] = await sequelize.query(`
            SELECT * FROM legal_cases WHERE case_number = :caseNumber AND company_id = :companyId
        `, { replacements: { caseNumber, companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Legal Case CREATE + READ', legalCase && legalCase.case_type === 'labor_claim',
            `ID: ${legalCase?.id}`);
        testData.legalCaseId = legalCase?.id;

        // UPDATE
        log('crud', 'UPDATE legal_cases');
        await sequelize.query(`
            UPDATE legal_cases SET current_stage = 'mediation', description = 'Test UPDATED Description', updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.legalCaseId }, type: QueryTypes.UPDATE });

        const [updatedCase] = await sequelize.query(`SELECT * FROM legal_cases WHERE id = :id`,
            { replacements: { id: testData.legalCaseId }, type: QueryTypes.SELECT });

        recordTest('Legal Case UPDATE',
            updatedCase.current_stage === 'mediation' && updatedCase.description === 'Test UPDATED Description',
            `stage=${updatedCase.current_stage}`);

        // ================================================================
        // 2. SANCTIONS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '2. SANCTIONS - CRUD');
        console.log('-'.repeat(50));

        // CREATE - Valid sanction_type: warning, written_warning, suspension, dismissal, other
        // Valid severity: low, medium, high, critical
        // Valid status: active, expired, revoked, appealed
        log('crud', 'CREATE sanctions');
        await sequelize.query(`
            INSERT INTO sanctions (
                company_id, user_id, sanction_type, severity,
                title, description, sanction_date, status,
                created_by, created_at, updated_at
            ) VALUES (
                :companyId, :userId, 'warning', 'low',
                'Test Sanction CRUD', 'Test sanction description', CURRENT_DATE, 'active',
                :userId, NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, userId: testData.userId },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ sanctions');
        const [sanction] = await sequelize.query(`
            SELECT * FROM sanctions
            WHERE company_id = :companyId AND user_id = :userId AND title = 'Test Sanction CRUD'
            ORDER BY created_at DESC LIMIT 1
        `, { replacements: { companyId: testData.companyId, userId: testData.userId }, type: QueryTypes.SELECT });

        recordTest('Sanction CREATE + READ', sanction && sanction.sanction_type === 'warning',
            `ID: ${sanction?.id}`);
        testData.sanctionId = sanction?.id;

        // UPDATE
        log('crud', 'UPDATE sanctions');
        await sequelize.query(`
            UPDATE sanctions SET severity = 'medium', description = 'Test UPDATED Sanction', updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.sanctionId }, type: QueryTypes.UPDATE });

        const [updatedSanction] = await sequelize.query(`SELECT * FROM sanctions WHERE id = :id`,
            { replacements: { id: testData.sanctionId }, type: QueryTypes.SELECT });

        recordTest('Sanction UPDATE',
            updatedSanction.severity === 'medium' && updatedSanction.description === 'Test UPDATED Sanction',
            `severity=${updatedSanction.severity}`);

        // ================================================================
        // 3. JOB_POSTINGS (Recruitment) - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '3. JOB_POSTINGS (Recruitment) - CRUD');
        console.log('-'.repeat(50));

        // CREATE - Valid job_type: full-time, part-time, contract, temporary, internship
        // Valid status: draft, active, paused, closed, filled
        log('crud', 'CREATE job_postings');
        await sequelize.query(`
            INSERT INTO job_postings (
                company_id, title, description, requirements, responsibilities,
                location, job_type, salary_min, salary_max, salary_currency, salary_period,
                status, is_public, is_internal,
                created_at, updated_at
            ) VALUES (
                :companyId, 'Test Job Posting CRUD', 'Test job description', 'Test requirements', 'Test responsibilities',
                'Buenos Aires', 'full-time', 50000, 80000, 'ARS', 'monthly',
                'draft', false, true,
                NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ job_postings');
        const [jobPosting] = await sequelize.query(`
            SELECT * FROM job_postings
            WHERE company_id = :companyId AND title = 'Test Job Posting CRUD'
            ORDER BY created_at DESC LIMIT 1
        `, { replacements: { companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Job Posting CREATE + READ', jobPosting && jobPosting.job_type === 'full-time',
            `ID: ${jobPosting?.id}`);
        testData.jobPostingId = jobPosting?.id;

        // UPDATE
        log('crud', 'UPDATE job_postings');
        await sequelize.query(`
            UPDATE job_postings SET status = 'active', description = 'Test UPDATED Description', updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.jobPostingId }, type: QueryTypes.UPDATE });

        const [updatedJobPosting] = await sequelize.query(`SELECT * FROM job_postings WHERE id = :id`,
            { replacements: { id: testData.jobPostingId }, type: QueryTypes.SELECT });

        recordTest('Job Posting UPDATE',
            updatedJobPosting.status === 'active' && updatedJobPosting.description === 'Test UPDATED Description',
            `status=${updatedJobPosting.status}`);

        // ================================================================
        // 4. EMPLOYEE_BENEFITS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '4. EMPLOYEE_BENEFITS - CRUD');
        console.log('-'.repeat(50));

        // First, get or create a company_benefit_policy
        const [existingPolicy] = await sequelize.query(`
            SELECT id FROM company_benefit_policies WHERE company_id = :companyId LIMIT 1
        `, { replacements: { companyId: testData.companyId }, type: QueryTypes.SELECT });

        let policyId = existingPolicy?.id;
        if (!policyId) {
            // Use existing benefit type (ID: 1)
            const [benefitType] = await sequelize.query(`
                SELECT id FROM benefit_types LIMIT 1
            `, { type: QueryTypes.SELECT });

            if (!benefitType) {
                log('fail', 'No hay benefit_type disponible');
                throw new Error('No benefit_type');
            }

            // Create a policy
            await sequelize.query(`
                INSERT INTO company_benefit_policies (
                    company_id, benefit_type_id, is_enabled, is_active,
                    created_at, updated_at
                ) VALUES (
                    :companyId, :benefitTypeId, true, true,
                    NOW(), NOW()
                )
            `, { replacements: { companyId: testData.companyId, benefitTypeId: benefitType.id }, type: QueryTypes.INSERT });

            const [newPolicy] = await sequelize.query(`
                SELECT id FROM company_benefit_policies WHERE company_id = :companyId AND benefit_type_id = :benefitTypeId
                ORDER BY created_at DESC LIMIT 1
            `, { replacements: { companyId: testData.companyId, benefitTypeId: benefitType.id }, type: QueryTypes.SELECT });
            policyId = newPolicy.id;
        }

        // CREATE
        log('crud', 'CREATE employee_benefits');
        await sequelize.query(`
            INSERT INTO employee_benefits (
                user_id, company_id, company_benefit_policy_id,
                assigned_amount, effective_from, status,
                created_at, updated_at
            ) VALUES (
                :userId, :companyId, :policyId,
                1000.00, CURRENT_DATE, 'active',
                NOW(), NOW()
            )
        `, {
            replacements: { userId: testData.userId, companyId: testData.companyId, policyId },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ employee_benefits');
        const [benefit] = await sequelize.query(`
            SELECT * FROM employee_benefits
            WHERE user_id = :userId AND company_id = :companyId
            ORDER BY created_at DESC LIMIT 1
        `, { replacements: { userId: testData.userId, companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Employee Benefit CREATE + READ', benefit && benefit.status === 'active',
            `ID: ${benefit?.id}`);
        testData.benefitId = benefit?.id;

        // UPDATE
        log('crud', 'UPDATE employee_benefits');
        await sequelize.query(`
            UPDATE employee_benefits SET assigned_amount = 1500.00, status_reason = 'Test UPDATED', updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.benefitId }, type: QueryTypes.UPDATE });

        const [updatedBenefit] = await sequelize.query(`SELECT * FROM employee_benefits WHERE id = :id`,
            { replacements: { id: testData.benefitId }, type: QueryTypes.SELECT });

        recordTest('Employee Benefit UPDATE',
            parseFloat(updatedBenefit.assigned_amount) === 1500.00 && updatedBenefit.status_reason === 'Test UPDATED',
            `amount=${updatedBenefit.assigned_amount}`);

        // ================================================================
        // 5. CONTRACTS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '5. CONTRACTS - CRUD');
        console.log('-'.repeat(50));

        // CREATE - Valid status: DRAFT, SENT, VIEWED, PENDING_SIGNATURE, SIGNED, etc.
        log('crud', 'CREATE contracts');
        const contractId = crypto.randomUUID();
        const contractCode = `CONTRACT_TEST_${Date.now()}`;
        const traceId = `TRACE_${Date.now()}`;

        // Get existing budget_id
        const [existingBudget] = await sequelize.query(`SELECT id FROM budgets LIMIT 1`, { type: QueryTypes.SELECT });
        if (!existingBudget) {
            log('fail', 'No hay budget disponible');
            throw new Error('No budget available');
        }

        await sequelize.query(`
            INSERT INTO contracts (
                id, trace_id, budget_id, company_id, contract_code, contract_type, contract_date,
                template_version, template_content, selected_modules,
                contracted_employees, total_monthly, status,
                created_at, updated_at
            ) VALUES (
                :id, :traceId, :budgetId, :companyId, :code, 'service', CURRENT_DATE,
                '1.0', 'Test contract template content', '{}',
                10, 5000.00, 'DRAFT',
                NOW(), NOW()
            )
        `, {
            replacements: { id: contractId, traceId, budgetId: existingBudget.id, companyId: testData.companyId, code: contractCode },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ contracts');
        const [contract] = await sequelize.query(`
            SELECT * FROM contracts WHERE id = :id::uuid
        `, { replacements: { id: contractId }, type: QueryTypes.SELECT });

        recordTest('Contract CREATE + READ', contract && contract.status === 'DRAFT',
            `ID: ${contract?.id?.slice(0, 8)}`);
        testData.contractId = contractId;

        // UPDATE
        log('crud', 'UPDATE contracts');
        await sequelize.query(`
            UPDATE contracts SET status = 'SENT', contracted_employees = 15, updated_at = NOW()
            WHERE id = :id::uuid
        `, { replacements: { id: testData.contractId }, type: QueryTypes.UPDATE });

        const [updatedContract] = await sequelize.query(`SELECT * FROM contracts WHERE id = :id::uuid`,
            { replacements: { id: testData.contractId }, type: QueryTypes.SELECT });

        recordTest('Contract UPDATE',
            updatedContract.status === 'SENT' && parseInt(updatedContract.contracted_employees) === 15,
            `status=${updatedContract.status}`);

        // ================================================================
        // 6. PERSISTENCIA - Verificación
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '6. PERSISTENCIA - Verificación');
        console.log('-'.repeat(50));

        const savedIds = {
            legalCaseId: testData.legalCaseId,
            sanctionId: testData.sanctionId,
            jobPostingId: testData.jobPostingId,
            benefitId: testData.benefitId,
            contractId: testData.contractId
        };

        log('info', 'Esperando commit...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        log('crud', 'Verificando persistencia...');

        const [pLegal] = await sequelize.query(`SELECT * FROM legal_cases WHERE id = :id`,
            { replacements: { id: savedIds.legalCaseId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Legal Case', pLegal && pLegal.current_stage === 'mediation');

        const [pSanction] = await sequelize.query(`SELECT * FROM sanctions WHERE id = :id`,
            { replacements: { id: savedIds.sanctionId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Sanction', pSanction && pSanction.severity === 'medium');

        const [pJob] = await sequelize.query(`SELECT * FROM job_postings WHERE id = :id`,
            { replacements: { id: savedIds.jobPostingId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Job Posting', pJob && pJob.status === 'active');

        const [pBenefit] = await sequelize.query(`SELECT * FROM employee_benefits WHERE id = :id`,
            { replacements: { id: savedIds.benefitId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Employee Benefit', pBenefit && parseFloat(pBenefit.assigned_amount) === 1500.00);

        const [pContract] = await sequelize.query(`SELECT * FROM contracts WHERE id = :id::uuid`,
            { replacements: { id: savedIds.contractId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Contract', pContract && pContract.status === 'SENT');

        // ================================================================
        // 7. DELETE - Limpieza
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '7. DELETE - Limpieza');
        console.log('-'.repeat(50));

        // DELETE Contract
        log('crud', 'DELETE contracts');
        await sequelize.query(`DELETE FROM contracts WHERE id = :id::uuid`,
            { replacements: { id: savedIds.contractId }, type: QueryTypes.DELETE });
        const [delContract] = await sequelize.query(`SELECT * FROM contracts WHERE id = :id::uuid`,
            { replacements: { id: savedIds.contractId }, type: QueryTypes.SELECT });
        recordTest('Contract DELETE', !delContract, 'Eliminado');

        // DELETE Employee Benefit
        log('crud', 'DELETE employee_benefits');
        await sequelize.query(`DELETE FROM employee_benefits WHERE id = :id`,
            { replacements: { id: savedIds.benefitId }, type: QueryTypes.DELETE });
        const [delBenefit] = await sequelize.query(`SELECT * FROM employee_benefits WHERE id = :id`,
            { replacements: { id: savedIds.benefitId }, type: QueryTypes.SELECT });
        recordTest('Employee Benefit DELETE', !delBenefit, 'Eliminado');

        // DELETE Job Posting
        log('crud', 'DELETE job_postings');
        await sequelize.query(`DELETE FROM job_postings WHERE id = :id`,
            { replacements: { id: savedIds.jobPostingId }, type: QueryTypes.DELETE });
        const [delJob] = await sequelize.query(`SELECT * FROM job_postings WHERE id = :id`,
            { replacements: { id: savedIds.jobPostingId }, type: QueryTypes.SELECT });
        recordTest('Job Posting DELETE', !delJob, 'Eliminado');

        // DELETE Sanction
        log('crud', 'DELETE sanctions');
        await sequelize.query(`DELETE FROM sanctions WHERE id = :id`,
            { replacements: { id: savedIds.sanctionId }, type: QueryTypes.DELETE });
        const [delSanction] = await sequelize.query(`SELECT * FROM sanctions WHERE id = :id`,
            { replacements: { id: savedIds.sanctionId }, type: QueryTypes.SELECT });
        recordTest('Sanction DELETE', !delSanction, 'Eliminado');

        // DELETE Legal Case
        log('crud', 'DELETE legal_cases');
        await sequelize.query(`DELETE FROM legal_cases WHERE id = :id`,
            { replacements: { id: savedIds.legalCaseId }, type: QueryTypes.DELETE });
        const [delLegal] = await sequelize.query(`SELECT * FROM legal_cases WHERE id = :id`,
            { replacements: { id: savedIds.legalCaseId }, type: QueryTypes.SELECT });
        recordTest('Legal Case DELETE', !delLegal, 'Eliminado');

        // Verificar persistencia DELETE
        log('info', 'Verificando persistencia DELETE...');
        await new Promise(resolve => setTimeout(resolve, 500));

        const [checkCase] = await sequelize.query(`SELECT * FROM legal_cases WHERE id = :id`,
            { replacements: { id: savedIds.legalCaseId }, type: QueryTypes.SELECT });
        recordTest('PERSIST DELETE: All cleared', !checkCase, 'Datos eliminados permanentemente');

    } catch (error) {
        console.error(`${colors.red}ERROR:${colors.reset}`, error.message);
        console.error(error.stack);
        stats.failed++;
    } finally {
        await sequelize.close();
    }

    // RESUMEN
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}RESUMEN LOTE 3${colors.reset}`);
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
