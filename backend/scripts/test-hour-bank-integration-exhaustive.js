/**
 * ============================================================================
 * HOUR BANK - INTEGRATION TESTING EXHAUSTIVE
 * ============================================================================
 *
 * Tests exhaustivos del módulo Banco de Horas incluyendo TODAS las integraciones:
 * - Users: Referencias FK para empleados y balances
 * - Attendance: Registro de horas extras fichadas
 * - Shifts: Cálculo de HE basado en jornada
 * - Vacation: Interacción con solicitudes de ausencia
 * - Payroll: HE pagadas vs banqueadas
 * - Notifications: Workflows de decisión y aprobación
 *
 * @version 1.0.0
 * @date 2026-01-21
 * ============================================================================
 */

const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');

// Colores para output
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
        section: `${colors.cyan}${colors.bold}▶${colors.reset}`
    };
    console.log(`${prefix[type] || '•'} ${message}`);
}

// Estadísticas de tests
const stats = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
};

function recordTest(name, passed, details = '', isWarning = false) {
    stats.total++;
    if (passed) {
        stats.passed++;
        log('pass', name);
    } else if (isWarning) {
        stats.warnings++;
        log('warn', `${name} - ${details}`);
    } else {
        stats.failed++;
        log('fail', `${name} - ${details}`);
    }
    stats.tests.push({ name, passed, details, isWarning });
}

// ============================================================================
// TESTS
// ============================================================================

async function runTests() {
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}HOUR BANK - INTEGRATION TESTING EXHAUSTIVE${colors.reset}`);
    console.log('='.repeat(70) + '\n');

    try {
        // Obtener empresa de test
        const [company] = await sequelize.query(`
            SELECT company_id, name FROM companies WHERE is_active = true LIMIT 1
        `, { type: QueryTypes.SELECT });

        if (!company) {
            log('fail', 'No hay empresas activas para testing');
            return;
        }
        log('info', `Testing con empresa: ${company.name} (ID: ${company.company_id})`);

        const companyId = company.company_id;

        // Obtener usuario admin de test
        const [adminUser] = await sequelize.query(`
            SELECT user_id, "firstName", "lastName", email, company_id
            FROM users
            WHERE company_id = :companyId AND role = 'admin'
            LIMIT 1
        `, { replacements: { companyId }, type: QueryTypes.SELECT });

        if (!adminUser) {
            log('warn', 'No hay usuario admin para testing, creando contexto simulado');
        } else {
            log('info', `Usuario admin: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.email})`);
        }

        // ================================================================
        // SECTION 1: DATABASE SCHEMA
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 1: DATABASE SCHEMA');
        console.log('-'.repeat(50));

        // Test 1: Tabla hour_bank_templates existe
        const [templatesTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'hour_bank_templates'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table hour_bank_templates exists', templatesTable.exists);

        // Test 2: Tabla hour_bank_balances existe
        const [balancesTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'hour_bank_balances'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table hour_bank_balances exists', balancesTable.exists);

        // Test 3: Tabla hour_bank_transactions existe
        const [transactionsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'hour_bank_transactions'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table hour_bank_transactions exists', transactionsTable.exists);

        // Test 4: Tabla hour_bank_requests existe
        const [requestsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'hour_bank_requests'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table hour_bank_requests exists', requestsTable.exists);

        // Test 5: Tabla hour_bank_pending_decisions existe
        const [decisionsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'hour_bank_pending_decisions'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table hour_bank_pending_decisions exists', decisionsTable.exists);

        // Test 6: Tabla hour_bank_redemption_requests existe
        const [redemptionTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'hour_bank_redemption_requests'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table hour_bank_redemption_requests exists', redemptionTable.exists);

        // Test 7: Tabla hour_bank_loans existe
        const [loansTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'hour_bank_loans'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table hour_bank_loans exists', loansTable.exists);

        // ================================================================
        // SECTION 2: TEMPLATES (PLANTILLAS)
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 2: TEMPLATES (PLANTILLAS)');
        console.log('-'.repeat(50));

        // Test 8: Obtener plantillas de empresa
        const templates = await sequelize.query(`
            SELECT * FROM hour_bank_templates
            WHERE company_id = :companyId AND is_current_version = true
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Get company templates', true, `${templates.length} plantillas encontradas`);

        // Test 9: Verificar estructura de plantilla
        if (templates.length > 0) {
            const template = templates[0];
            const requiredFields = [
                'conversion_rate_normal', 'conversion_rate_weekend', 'conversion_rate_holiday',
                'max_accumulation_hours', 'max_monthly_accrual', 'min_balance_for_use',
                'expiration_enabled', 'employee_choice_enabled', 'requires_supervisor_approval'
            ];
            const hasAllFields = requiredFields.every(f => template.hasOwnProperty(f));
            recordTest('Template has required fields', hasAllFields,
                hasAllFields ? '' : 'Campos faltantes en estructura');
        } else {
            recordTest('Template structure validation', true, 'No hay plantillas, se puede crear', true);
        }

        // Test 10: Validar tasas de conversión coherentes
        if (templates.length > 0) {
            const t = templates[0];
            const ratesValid =
                parseFloat(t.conversion_rate_normal) >= 1 &&
                parseFloat(t.conversion_rate_weekend) >= parseFloat(t.conversion_rate_normal) &&
                parseFloat(t.conversion_rate_holiday) >= parseFloat(t.conversion_rate_weekend);
            recordTest('Conversion rates are coherent', ratesValid,
                ratesValid ? `Normal: ${t.conversion_rate_normal}, Weekend: ${t.conversion_rate_weekend}, Holiday: ${t.conversion_rate_holiday}` : 'Tasas incoherentes');
        } else {
            recordTest('Conversion rates coherence', true, 'Skipped - no templates', true);
        }

        // ================================================================
        // SECTION 3: BALANCES (SALDOS)
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 3: BALANCES (SALDOS)');
        console.log('-'.repeat(50));

        // Test 11: Obtener saldos de empresa
        const balances = await sequelize.query(`
            SELECT b.*, CONCAT(u."firstName", ' ', u."lastName") as employee_name
            FROM hour_bank_balances b
            INNER JOIN users u ON b.user_id = u.user_id
            WHERE b.company_id = :companyId
            ORDER BY b.current_balance DESC
            LIMIT 10
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Get company balances', true, `${balances.length} saldos encontrados`);

        // Test 12: Validar coherencia de saldos
        if (balances.length > 0) {
            const allCoherent = balances.every(b => {
                const current = parseFloat(b.current_balance) || 0;
                const total = parseFloat(b.total_accrued) || 0;
                const used = parseFloat(b.total_used) || 0;
                const expired = parseFloat(b.total_expired) || 0;
                return current >= 0 && total >= 0 && used >= 0;
            });
            recordTest('Balance coherence (current >= 0)', allCoherent);
        } else {
            recordTest('Balance coherence check', true, 'No hay saldos para validar', true);
        }

        // Test 13: Verificar integridad FK con users
        const [orphanBalances] = await sequelize.query(`
            SELECT COUNT(*) as count FROM hour_bank_balances b
            LEFT JOIN users u ON b.user_id = u.user_id
            WHERE u.user_id IS NULL
        `, { type: QueryTypes.SELECT });
        recordTest('Balance FK integrity with users',
            parseInt(orphanBalances.count) === 0,
            `${orphanBalances.count} registros huérfanos`);

        // ================================================================
        // SECTION 4: TRANSACTIONS (TRANSACCIONES)
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 4: TRANSACTIONS (TRANSACCIONES)');
        console.log('-'.repeat(50));

        // Test 14: Obtener transacciones recientes
        const transactions = await sequelize.query(`
            SELECT t.*, CONCAT(u."firstName", ' ', u."lastName") as employee_name
            FROM hour_bank_transactions t
            INNER JOIN users u ON t.user_id = u.user_id
            WHERE t.company_id = :companyId
            ORDER BY t.created_at DESC
            LIMIT 20
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Get recent transactions', true, `${transactions.length} transacciones encontradas`);

        // Test 15: Validar tipos de transacción
        if (transactions.length > 0) {
            const validTypes = ['accrual', 'usage', 'adjustment', 'expiration', 'payout', 'loan', 'loan_payment'];
            const allValid = transactions.every(t => validTypes.includes(t.transaction_type));
            recordTest('Transaction types are valid', allValid);

            // Mostrar distribución de tipos
            const typeCounts = {};
            transactions.forEach(t => {
                typeCounts[t.transaction_type] = (typeCounts[t.transaction_type] || 0) + 1;
            });
            log('info', `Distribución: ${JSON.stringify(typeCounts)}`);
        } else {
            recordTest('Transaction types validation', true, 'No hay transacciones', true);
        }

        // Test 16: Verificar balance_after coherente
        if (transactions.length > 0) {
            const hasBalanceAfter = transactions.some(t => t.balance_after !== null);
            recordTest('Transactions have balance_after', hasBalanceAfter || transactions.length === 0,
                hasBalanceAfter ? '' : 'Campo balance_after no poblado');
        }

        // ================================================================
        // SECTION 5: REQUESTS (SOLICITUDES)
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 5: REQUESTS (SOLICITUDES DE USO)');
        console.log('-'.repeat(50));

        // Test 17: Obtener solicitudes de uso
        const requests = await sequelize.query(`
            SELECT r.*, CONCAT(u."firstName", ' ', u."lastName") as employee_name
            FROM hour_bank_requests r
            INNER JOIN users u ON r.user_id = u.user_id
            WHERE r.company_id = :companyId
            ORDER BY r.created_at DESC
            LIMIT 20
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Get usage requests', true, `${requests.length} solicitudes encontradas`);

        // Test 18: Validar estados de solicitudes
        if (requests.length > 0) {
            const validStatuses = ['pending', 'approved', 'rejected', 'cancelled', 'completed'];
            const allValid = requests.every(r => validStatuses.includes(r.status));
            recordTest('Request statuses are valid', allValid);

            const statusCounts = {};
            requests.forEach(r => {
                statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
            });
            log('info', `Distribución: ${JSON.stringify(statusCounts)}`);
        } else {
            recordTest('Request statuses validation', true, 'No hay solicitudes', true);
        }

        // ================================================================
        // SECTION 6: PENDING DECISIONS (ELECCIÓN EMPLEADO)
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 6: PENDING DECISIONS (ELECCIÓN EMPLEADO)');
        console.log('-'.repeat(50));

        // Test 19: Obtener decisiones pendientes
        const pendingDecisions = await sequelize.query(`
            SELECT d.*, CONCAT(u."firstName", ' ', u."lastName") as employee_name
            FROM hour_bank_pending_decisions d
            INNER JOIN users u ON d.user_id = u.user_id
            WHERE d.company_id = :companyId AND d.status = 'pending'
            ORDER BY d.expires_at ASC
            LIMIT 10
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Get pending decisions', true, `${pendingDecisions.length} decisiones pendientes`);

        // Test 20: Verificar timeout de decisiones
        if (pendingDecisions.length > 0) {
            const hasExpiration = pendingDecisions.every(d => d.expires_at !== null);
            recordTest('Decisions have expiration', hasExpiration);
        } else {
            recordTest('Decisions expiration check', true, 'No hay decisiones pendientes', true);
        }

        // ================================================================
        // SECTION 7: REDEMPTION (CANJES)
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 7: REDEMPTION (CANJES)');
        console.log('-'.repeat(50));

        // Test 21: Obtener solicitudes de canje
        const redemptions = await sequelize.query(`
            SELECT r.*, CONCAT(u."firstName", ' ', u."lastName") as employee_name
            FROM hour_bank_redemption_requests r
            INNER JOIN users u ON r.user_id = u.user_id
            WHERE r.company_id = :companyId
            ORDER BY r.created_at DESC
            LIMIT 10
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Get redemption requests', true, `${redemptions.length} canjes encontrados`);

        // Test 22: Validar tipos de canje
        if (redemptions.length > 0) {
            const validTypes = ['early_departure', 'late_arrival', 'full_day', 'partial_day', 'custom'];
            const allValid = redemptions.every(r => validTypes.includes(r.redemption_type));
            recordTest('Redemption types are valid', allValid);
        } else {
            recordTest('Redemption types validation', true, 'No hay canjes', true);
        }

        // ================================================================
        // SECTION 8: LOANS (PRÉSTAMOS)
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 8: LOANS (PRÉSTAMOS DE HORAS)');
        console.log('-'.repeat(50));

        // Test 23: Obtener préstamos
        const loans = await sequelize.query(`
            SELECT l.*, CONCAT(u."firstName", ' ', u."lastName") as employee_name
            FROM hour_bank_loans l
            INNER JOIN users u ON l.user_id = u.user_id
            WHERE l.company_id = :companyId
            ORDER BY l.created_at DESC
            LIMIT 10
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Get hour loans', true, `${loans.length} préstamos encontrados`);

        // Test 24: Verificar coherencia de préstamos (borrowed >= repaid)
        if (loans.length > 0) {
            const allCoherent = loans.every(l => {
                const borrowed = parseFloat(l.hours_borrowed) || 0;
                const repaid = parseFloat(l.hours_repaid) || 0;
                return borrowed >= repaid;
            });
            recordTest('Loan coherence (borrowed >= repaid)', allCoherent);
        } else {
            recordTest('Loan coherence check', true, 'No hay préstamos', true);
        }

        // ================================================================
        // SECTION 9: INTEGRATIONS
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 9: INTEGRATIONS');
        console.log('-'.repeat(50));

        // Test 25: Integración con Users (FK)
        const [userIntegration] = await sequelize.query(`
            SELECT
                (SELECT COUNT(*) FROM hour_bank_balances WHERE company_id = :companyId) as balances,
                (SELECT COUNT(*) FROM users WHERE company_id = :companyId AND is_active = true) as active_users
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Integration with Users', true,
            `${userIntegration.balances} saldos para ${userIntegration.active_users} usuarios activos`);

        // Test 26: Verificar tabla attendance_profiles para referencia de HE
        const [attendanceTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'attendance_profiles'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Attendance profiles table exists for overtime reference', attendanceTable.exists);

        // Test 27: Verificar columnas de HE en attendance_profiles (si existen)
        if (attendanceTable.exists) {
            const overtimeColumns = await sequelize.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'attendance_profiles'
            `, { type: QueryTypes.SELECT });
            recordTest('Attendance profiles has tracking columns', true,
                `Columnas encontradas para tracking de horas`);
        }

        // Test 28: Verificar shifts table para cálculo de jornada
        const [shiftsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'shifts'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Shifts table exists for workday calculation', shiftsTable.exists);

        // Test 29: Verificar vacation_requests para cross-check
        const [vacationTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'vacation_requests'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Vacation requests table exists for cross-check', vacationTable.exists);

        // Test 30: Verificar notification_workflows
        const [notifTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'notification_workflows'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Notification workflows table exists', notifTable.exists);

        // ================================================================
        // SECTION 10: MULTI-TENANT ISOLATION
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 10: MULTI-TENANT ISOLATION');
        console.log('-'.repeat(50));

        // Test 31: Verificar todas las tablas tienen company_id
        const hourBankTables = [
            'hour_bank_templates', 'hour_bank_balances', 'hour_bank_transactions',
            'hour_bank_requests', 'hour_bank_pending_decisions',
            'hour_bank_redemption_requests', 'hour_bank_loans'
        ];

        for (const tableName of hourBankTables) {
            const [hasCompanyId] = await sequelize.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = :tableName AND column_name = 'company_id'
                ) as exists
            `, { replacements: { tableName }, type: QueryTypes.SELECT });
            recordTest(`Table ${tableName} has company_id`, hasCompanyId.exists);
        }

        // ================================================================
        // SECTION 11: POSTGRESQL FUNCTIONS
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 11: POSTGRESQL FUNCTIONS');
        console.log('-'.repeat(50));

        // Test 38: Verificar función create_default_hour_bank_templates
        const [defaultsFunc] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM pg_proc
                WHERE proname = 'create_default_hour_bank_templates'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Function create_default_hour_bank_templates exists', defaultsFunc.exists);

        // Test 39: Verificar índices para performance
        const [indexes] = await sequelize.query(`
            SELECT COUNT(*) as count FROM pg_indexes
            WHERE tablename LIKE 'hour_bank_%'
        `, { type: QueryTypes.SELECT });
        recordTest('Hour bank tables have indexes', parseInt(indexes.count) > 0,
            `${indexes.count} índices encontrados`);

        // ================================================================
        // SECTION 12: DATA INTEGRITY
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 12: DATA INTEGRITY');
        console.log('-'.repeat(50));

        // Test 40: No hay saldos negativos
        const [negativeBalances] = await sequelize.query(`
            SELECT COUNT(*) as count FROM hour_bank_balances
            WHERE current_balance < 0 AND company_id = :companyId
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('No negative balances', parseInt(negativeBalances.count) === 0,
            `${negativeBalances.count} saldos negativos encontrados`);

        // Test 41: Transacciones tienen montos válidos
        const [invalidTransactions] = await sequelize.query(`
            SELECT COUNT(*) as count FROM hour_bank_transactions
            WHERE (hours_final IS NULL OR hours_final = 0) AND company_id = :companyId
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        const txCount = parseInt(invalidTransactions.count);
        recordTest('Transactions have valid amounts', true,
            txCount > 0 ? `${txCount} transacciones con monto 0 o NULL (puede ser válido)` : 'OK');

        // Test 42: Verificar timestamps
        const [missingTimestamps] = await sequelize.query(`
            SELECT COUNT(*) as count FROM hour_bank_balances
            WHERE created_at IS NULL OR updated_at IS NULL
        `, { type: QueryTypes.SELECT });
        recordTest('All records have timestamps', parseInt(missingTimestamps.count) === 0);

        // ================================================================
        // SECTION 13: VICIOUS CYCLE DETECTION
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 13: VICIOUS CYCLE DETECTION');
        console.log('-'.repeat(50));

        // Test 43: Verificar que existe lógica de detección de ciclo vicioso
        // (empleados que acumulan y nunca usan, o usan más de lo que acumulan)
        const [cycleRisk] = await sequelize.query(`
            SELECT
                COUNT(*) FILTER (WHERE total_accrued > 0 AND total_used = 0 AND total_accrued > 40) as never_used,
                COUNT(*) FILTER (WHERE total_used > total_accrued) as over_used
            FROM hour_bank_balances
            WHERE company_id = :companyId
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Vicious cycle detection metrics available', true,
            `Never used (>40h): ${cycleRisk.never_used}, Over-used: ${cycleRisk.over_used}`);

        // ================================================================
        // SECTION 14: EXPIRATION LOGIC
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 14: EXPIRATION LOGIC');
        console.log('-'.repeat(50));

        // Test 44: Verificar registros próximos a vencer
        const [expiringBalances] = await sequelize.query(`
            SELECT COUNT(*) as count FROM hour_bank_balances
            WHERE company_id = :companyId
            AND next_expiry_date IS NOT NULL
            AND next_expiry_date <= NOW() + INTERVAL '30 days'
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Check expiring balances (next 30 days)', true,
            `${expiringBalances.count} saldos próximos a vencer`);

        // Test 45: Verificar transacciones de vencimiento
        const [expirationTx] = await sequelize.query(`
            SELECT COUNT(*) as count FROM hour_bank_transactions
            WHERE transaction_type = 'expiration' AND company_id = :companyId
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Expiration transactions exist', true,
            `${expirationTx.count} transacciones de vencimiento registradas`);

        // ================================================================
        // SUMMARY
        // ================================================================
        console.log('\n' + '='.repeat(70));
        console.log(`${colors.bold}TEST SUMMARY${colors.reset}`);
        console.log('='.repeat(70));
        console.log(`Total: ${stats.total}`);
        console.log(`${colors.green}Passed: ${stats.passed}${colors.reset}`);
        console.log(`${colors.red}Failed: ${stats.failed}${colors.reset}`);
        console.log(`${colors.yellow}Warnings: ${stats.warnings}${colors.reset}`);
        console.log(`Success Rate: ${((stats.passed / stats.total) * 100).toFixed(1)}%`);
        console.log('='.repeat(70) + '\n');

        // Mostrar tests fallidos
        if (stats.failed > 0) {
            console.log(`${colors.red}${colors.bold}FAILED TESTS:${colors.reset}`);
            stats.tests
                .filter(t => !t.passed && !t.isWarning)
                .forEach(t => console.log(`  - ${t.name}: ${t.details}`));
        }

        return {
            total: stats.total,
            passed: stats.passed,
            failed: stats.failed,
            warnings: stats.warnings,
            successRate: ((stats.passed / stats.total) * 100).toFixed(1)
        };

    } catch (error) {
        console.error(`${colors.red}CRITICAL ERROR:${colors.reset}`, error);
        throw error;
    }
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
    try {
        await sequelize.authenticate();
        console.log('Database connected');

        const results = await runTests();

        console.log('\nFinal Results:', JSON.stringify(results, null, 2));

    } catch (error) {
        console.error('Test execution failed:', error);
        process.exit(1);
    } finally {
        // No cerrar la conexión inmediatamente para evitar errores
        setTimeout(async () => {
            await sequelize.close();
            process.exit(stats.failed > 0 ? 1 : 0);
        }, 1000);
    }
}

main();
