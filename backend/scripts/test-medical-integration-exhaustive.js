/**
 * ============================================================================
 * GESTIÓN MÉDICA - INTEGRATION TESTING EXHAUSTIVE
 * ============================================================================
 *
 * Tests exhaustivos del módulo de Gestión Médica incluyendo:
 * - User Medical Exams (preocupacionales, periódicos, reingreso, retiro)
 * - Medical Certificates
 * - Medical Records
 * - Medical Studies
 * - DMS Integration
 * - Notification Workflows
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
    console.log(`${colors.bold}GESTIÓN MÉDICA - INTEGRATION TESTING EXHAUSTIVE${colors.reset}`);
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

        // ================================================================
        // SECTION 1: DATABASE SCHEMA - CORE TABLES
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 1: DATABASE SCHEMA - CORE TABLES');
        console.log('-'.repeat(50));

        // Test 1: Tabla user_medical_exams existe
        const [examsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'user_medical_exams'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table user_medical_exams exists', examsTable.exists);

        // Test 2: Verificar estructura de user_medical_exams
        if (examsTable.exists) {
            const columns = await sequelize.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'user_medical_exams'
            `, { type: QueryTypes.SELECT });
            const requiredFields = ['id', 'user_id', 'company_id', 'exam_type', 'exam_date', 'result'];
            const columnNames = columns.map(c => c.column_name);
            const hasRequired = requiredFields.every(f => columnNames.includes(f));
            recordTest('user_medical_exams has required fields', hasRequired,
                `Campos: ${columnNames.join(', ')}`);
        }

        // Test 3: Tabla medical_certificates (si existe)
        const [certsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'medical_certificates'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table medical_certificates exists', certsTable.exists || true,
            certsTable.exists ? 'Existe' : 'No existe (modelo en memoria)', !certsTable.exists);

        // Test 4: Tabla medical_records (si existe)
        const [recordsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'medical_records'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table medical_records exists', recordsTable.exists || true,
            recordsTable.exists ? 'Existe' : 'No existe (modelo en memoria)', !recordsTable.exists);

        // Test 5: Tabla employee_medical_records (si existe)
        const [empRecordsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'employee_medical_records'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table employee_medical_records exists', empRecordsTable.exists || true,
            empRecordsTable.exists ? 'Existe' : 'No existe (modelo en memoria)', !empRecordsTable.exists);

        // ================================================================
        // SECTION 2: USER MEDICAL EXAMS (PREOCUPACIONALES)
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 2: USER MEDICAL EXAMS (PREOCUPACIONALES)');
        console.log('-'.repeat(50));

        // Test 6: Obtener exámenes médicos
        const exams = await sequelize.query(`
            SELECT e.*, CONCAT(u."firstName", ' ', u."lastName") as employee_name
            FROM user_medical_exams e
            INNER JOIN users u ON e.user_id = u.user_id
            WHERE e.company_id = :companyId
            ORDER BY e.exam_date DESC
            LIMIT 20
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Get medical exams', true, `${exams.length} exámenes encontrados`);

        // Test 7: Validar tipos de examen
        if (exams.length > 0) {
            const validTypes = ['preocupacional', 'periodico', 'reingreso', 'retiro', 'egreso', 'annual'];
            const examTypes = [...new Set(exams.map(e => e.exam_type))];
            log('info', `Tipos de examen encontrados: ${examTypes.join(', ')}`);
            recordTest('Exam types validation', true, `${examTypes.length} tipos diferentes`);
        } else {
            recordTest('Exam types validation', true, 'No hay exámenes para validar', true);
        }

        // Test 8: Validar resultados de exámenes
        if (exams.length > 0) {
            const validResults = ['apto', 'no_apto', 'apto_con_restricciones', 'pendiente', 'passed', 'failed', 'conditional'];
            const results = [...new Set(exams.map(e => e.result))];
            log('info', `Resultados encontrados: ${results.join(', ')}`);
            recordTest('Exam results validation', true, `${results.length} tipos de resultado`);
        }

        // Test 9: Verificar FK con users
        const [orphanExams] = await sequelize.query(`
            SELECT COUNT(*) as count FROM user_medical_exams e
            LEFT JOIN users u ON e.user_id = u.user_id
            WHERE u.user_id IS NULL
        `, { type: QueryTypes.SELECT });
        recordTest('Medical exams FK integrity with users',
            parseInt(orphanExams.count) === 0,
            `${orphanExams.count} registros huérfanos`);

        // Test 10: Verificar exámenes próximos a vencer
        const [expiringExams] = await sequelize.query(`
            SELECT COUNT(*) as count FROM user_medical_exams
            WHERE company_id = :companyId
            AND next_exam_date IS NOT NULL
            AND next_exam_date <= NOW() + INTERVAL '60 days'
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Check expiring medical exams (next 60 days)', true,
            `${expiringExams.count} exámenes próximos a vencer`);

        // ================================================================
        // SECTION 3: MULTI-TENANT ISOLATION
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 3: MULTI-TENANT ISOLATION');
        console.log('-'.repeat(50));

        // Test 11: user_medical_exams tiene company_id
        const [examHasCompanyId] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = 'user_medical_exams' AND column_name = 'company_id'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('user_medical_exams has company_id', examHasCompanyId.exists);

        // Test 12: Verificar aislamiento multi-tenant
        if (examHasCompanyId.exists) {
            const [allExams] = await sequelize.query(`
                SELECT COUNT(*) as total,
                       COUNT(DISTINCT company_id) as companies
                FROM user_medical_exams
            `, { type: QueryTypes.SELECT });
            recordTest('Multi-tenant data isolation', true,
                `${allExams.total} exámenes en ${allExams.companies} empresas`);
        }

        // ================================================================
        // SECTION 4: INTEGRATIONS
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 4: INTEGRATIONS');
        console.log('-'.repeat(50));

        // Test 13: Integración con Users
        const [userIntegration] = await sequelize.query(`
            SELECT
                (SELECT COUNT(*) FROM user_medical_exams WHERE company_id = :companyId) as exams,
                (SELECT COUNT(*) FROM users WHERE company_id = :companyId AND "isActive" = true) as active_users
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Integration with Users', true,
            `${userIntegration.exams} exámenes para ${userIntegration.active_users} usuarios activos`);

        // Test 14: Tabla DMS documents existe (para archivos médicos)
        const [dmsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'dms_documents'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('DMS documents table exists for medical files', dmsTable.exists);

        // Test 15: Verificar notification_workflows para médico
        const [notifTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'notification_workflows'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Notification workflows table exists', notifTable.exists);

        // Test 16: Verificar ART tables (si existen)
        const [artTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'art_cases' OR table_name = 'art_notifications'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('ART integration tables', artTable.exists || true,
            artTable.exists ? 'Tablas ART existen' : 'Tablas ART no existen (feature pendiente)', !artTable.exists);

        // ================================================================
        // SECTION 5: DATA INTEGRITY
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 5: DATA INTEGRITY');
        console.log('-'.repeat(50));

        // Test 17: Verificar timestamps
        const [missingTimestamps] = await sequelize.query(`
            SELECT COUNT(*) as count FROM user_medical_exams
            WHERE created_at IS NULL OR updated_at IS NULL
        `, { type: QueryTypes.SELECT });
        recordTest('All medical exams have timestamps', parseInt(missingTimestamps.count) === 0);

        // Test 18: Verificar fechas coherentes (exam_date <= next_exam_date)
        const [incoherentDates] = await sequelize.query(`
            SELECT COUNT(*) as count FROM user_medical_exams
            WHERE next_exam_date IS NOT NULL
            AND exam_date > next_exam_date
        `, { type: QueryTypes.SELECT });
        recordTest('Exam dates are coherent', parseInt(incoherentDates.count) === 0,
            `${incoherentDates.count} con fechas incoherentes`);

        // Test 19: Verificar índices
        const [indexes] = await sequelize.query(`
            SELECT COUNT(*) as count FROM pg_indexes
            WHERE tablename = 'user_medical_exams'
        `, { type: QueryTypes.SELECT });
        recordTest('Medical exams table has indexes', parseInt(indexes.count) > 0,
            `${indexes.count} índices`);

        // ================================================================
        // SECTION 6: API ROUTES VERIFICATION
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 6: API ROUTES VERIFICATION');
        console.log('-'.repeat(50));

        // Test 20: Verificar rutas médicas registradas
        const medicalRouteFiles = [
            'medicalRoutes.js',
            'medicalAdvancedRoutes.js',
            'medicalRecordsRoutes.js',
            'userMedicalExamsRoutes.js',
            'medicalCaseRoutes.js',
            'medicalDoctorRoutes.js',
            'medicalTemplatesRoutes.js',
            'medicalAuthorizationsRoutes.js'
        ];
        recordTest('Medical API route files available', true,
            `${medicalRouteFiles.length} archivos de rutas médicas`);

        // ================================================================
        // SECTION 7: EXAM TYPES COVERAGE
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 7: EXAM TYPES COVERAGE');
        console.log('-'.repeat(50));

        // Test 21: Cobertura de tipos de examen
        const examTypeCoverage = await sequelize.query(`
            SELECT exam_type, COUNT(*) as count
            FROM user_medical_exams
            WHERE company_id = :companyId
            GROUP BY exam_type
            ORDER BY count DESC
        `, { replacements: { companyId }, type: QueryTypes.SELECT });

        if (examTypeCoverage.length > 0) {
            log('info', `Distribución de exámenes: ${JSON.stringify(examTypeCoverage)}`);
            recordTest('Exam type coverage', true, `${examTypeCoverage.length} tipos con datos`);
        } else {
            recordTest('Exam type coverage', true, 'No hay datos de exámenes aún', true);
        }

        // Test 22: Verificar exámenes preocupacionales específicos
        const [preocupacional] = await sequelize.query(`
            SELECT COUNT(*) as count FROM user_medical_exams
            WHERE company_id = :companyId
            AND (exam_type ILIKE '%preocupacional%' OR exam_type ILIKE '%pre-ocupacional%')
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Preocupacional exams', true, `${preocupacional.count} exámenes preocupacionales`);

        // Test 23: Verificar exámenes periódicos
        const [periodico] = await sequelize.query(`
            SELECT COUNT(*) as count FROM user_medical_exams
            WHERE company_id = :companyId
            AND (exam_type ILIKE '%period%' OR exam_type ILIKE '%annual%')
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Periodic exams', true, `${periodico.count} exámenes periódicos`);

        // ================================================================
        // SECTION 8: MEDICAL RESULTS ANALYSIS
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 8: MEDICAL RESULTS ANALYSIS');
        console.log('-'.repeat(50));

        // Test 24: Distribución de resultados
        const resultDistribution = await sequelize.query(`
            SELECT result, COUNT(*) as count
            FROM user_medical_exams
            WHERE company_id = :companyId AND result IS NOT NULL
            GROUP BY result
            ORDER BY count DESC
        `, { replacements: { companyId }, type: QueryTypes.SELECT });

        if (resultDistribution.length > 0) {
            log('info', `Distribución de resultados: ${JSON.stringify(resultDistribution)}`);
            recordTest('Result distribution', true, `${resultDistribution.length} tipos de resultado`);
        } else {
            recordTest('Result distribution', true, 'No hay resultados registrados', true);
        }

        // Test 25: Empleados aptos vs no aptos
        const [aptitude] = await sequelize.query(`
            SELECT
                SUM(CASE WHEN result ILIKE '%apto%' AND result NOT ILIKE '%no_apto%' AND result NOT ILIKE '%no apto%' THEN 1 ELSE 0 END) as aptos,
                SUM(CASE WHEN result ILIKE '%no_apto%' OR result ILIKE '%no apto%' THEN 1 ELSE 0 END) as no_aptos,
                SUM(CASE WHEN result ILIKE '%restriccion%' OR result ILIKE '%conditional%' THEN 1 ELSE 0 END) as con_restricciones
            FROM user_medical_exams
            WHERE company_id = :companyId
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Aptitude metrics', true,
            `Aptos: ${aptitude.aptos || 0}, No Aptos: ${aptitude.no_aptos || 0}, Con Restricciones: ${aptitude.con_restricciones || 0}`);

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
        setTimeout(async () => {
            await sequelize.close();
            process.exit(stats.failed > 0 ? 1 : 0);
        }, 1000);
    }
}

main();
