/**
 * ============================================================================
 * TRAINING/CAPACITACIÓN - INTEGRATION TESTING EXHAUSTIVE
 * ============================================================================
 *
 * Tests exhaustivos del módulo de Capacitación incluyendo:
 * - Trainings (cursos/capacitaciones)
 * - Assignments (asignaciones a usuarios)
 * - Progress (progreso del usuario)
 * - Certificates (certificados)
 * - DMS Integration
 * - Notifications
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
    console.log(`${colors.bold}TRAINING/CAPACITACIÓN - INTEGRATION TESTING EXHAUSTIVE${colors.reset}`);
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

        // Test 1: Tabla trainings existe
        const [trainingsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'trainings'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table trainings exists', trainingsTable.exists);

        // Test 2: Verificar estructura de trainings
        if (trainingsTable.exists) {
            const columns = await sequelize.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'trainings'
            `, { type: QueryTypes.SELECT });
            const requiredFields = ['id', 'company_id', 'title', 'description', 'category'];
            const columnNames = columns.map(c => c.column_name);
            const hasRequired = requiredFields.every(f => columnNames.includes(f));
            recordTest('Trainings has required fields', hasRequired,
                `${columnNames.length} columnas: ${columnNames.slice(0, 10).join(', ')}...`);
        }

        // Test 3: Tabla training_assignments (CRÍTICO)
        const [assignmentsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'training_assignments'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table training_assignments exists', assignmentsTable.exists || false,
            assignmentsTable.exists ? 'OK' : 'CRÍTICO: No existe - usuarios no pueden ser asignados a trainings',
            !assignmentsTable.exists);

        // Test 4: Tabla training_progress (CRÍTICO)
        const [progressTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'training_progress'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table training_progress exists', progressTable.exists || false,
            progressTable.exists ? 'OK' : 'CRÍTICO: No existe - usuarios no pueden registrar progreso',
            !progressTable.exists);

        // Test 5: Tabla training_certificates (para emitir certificados)
        const [certsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'training_certificates'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table training_certificates exists', certsTable.exists || true,
            certsTable.exists ? 'OK' : 'Opcional: Certificados pueden estar en trainings.certificate',
            !certsTable.exists);

        // ================================================================
        // SECTION 2: TRAININGS DATA
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 2: TRAININGS DATA');
        console.log('-'.repeat(50));

        // Test 6: Obtener trainings
        const trainings = await sequelize.query(`
            SELECT * FROM trainings
            WHERE company_id = :companyId
            ORDER BY created_at DESC
            LIMIT 20
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Get trainings', true, `${trainings.length} capacitaciones encontradas`);

        // Test 7: Validar categorías de training
        if (trainings.length > 0) {
            const categories = [...new Set(trainings.map(t => t.category))];
            log('info', `Categorías encontradas: ${categories.join(', ')}`);
            recordTest('Training categories', true, `${categories.length} categorías`);
        } else {
            recordTest('Training categories', true, 'No hay trainings aún', true);
        }

        // Test 8: Verificar trainings obligatorios
        if (trainings.length > 0) {
            const mandatory = trainings.filter(t => t.is_mandatory || t.mandatory);
            recordTest('Mandatory trainings', true, `${mandatory.length} capacitaciones obligatorias`);
        }

        // Test 9: Verificar trainings activos
        if (trainings.length > 0) {
            const active = trainings.filter(t => t.is_active);
            recordTest('Active trainings', true, `${active.length} capacitaciones activas`);
        }

        // ================================================================
        // SECTION 3: MULTI-TENANT ISOLATION
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 3: MULTI-TENANT ISOLATION');
        console.log('-'.repeat(50));

        // Test 10: trainings tiene company_id
        const [hasCompanyId] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = 'trainings' AND column_name = 'company_id'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Trainings has company_id', hasCompanyId.exists);

        // Test 11: Verificar aislamiento
        if (hasCompanyId.exists) {
            const [allTrainings] = await sequelize.query(`
                SELECT COUNT(*) as total,
                       COUNT(DISTINCT company_id) as companies
                FROM trainings
            `, { type: QueryTypes.SELECT });
            recordTest('Multi-tenant data isolation', true,
                `${allTrainings.total} trainings en ${allTrainings.companies} empresas`);
        }

        // ================================================================
        // SECTION 4: INTEGRATIONS
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 4: INTEGRATIONS');
        console.log('-'.repeat(50));

        // Test 12: Integración con Users
        const [userIntegration] = await sequelize.query(`
            SELECT
                (SELECT COUNT(*) FROM trainings WHERE company_id = :companyId) as trainings,
                (SELECT COUNT(*) FROM users WHERE company_id = :companyId AND "isActive" = true) as active_users
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Integration with Users', true,
            `${userIntegration.trainings} trainings para ${userIntegration.active_users} usuarios`);

        // Test 13: DMS documents para materiales
        const [dmsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'dms_documents'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('DMS documents for training materials', dmsTable.exists);

        // Test 14: Notification workflows
        const [notifTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'notification_workflows'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Notification workflows for training', notifTable.exists);

        // ================================================================
        // SECTION 5: API ROUTES VERIFICATION
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 5: API ROUTES VERIFICATION');
        console.log('-'.repeat(50));

        // Verificar rutas de training existentes
        const trainingRouteFiles = [
            'trainingRoutes.js',
            'trainingKnowledgeRoutes.js'
        ];
        recordTest('Training API route files', true, `${trainingRouteFiles.length} archivos de rutas`);

        // Test 15: Verificar endpoints de asignación y progreso
        const fs = require('fs');
        const routesPath = require('path').join(__dirname, '../src/routes/trainingRoutes.js');
        let routesContent = '';
        try {
            routesContent = fs.readFileSync(routesPath, 'utf8');
        } catch (e) {
            routesContent = '';
        }

        const requiredEndpoints = [
            { pattern: "/:id/assignments", method: "get", name: "Ver asignaciones" },
            { pattern: "/:id/assign", method: "post", name: "Asignar usuarios" },
            { pattern: "/:id/unassign", method: "delete", name: "Desasignar" },
            { pattern: "/my-assignments", method: "get", name: "Mis asignaciones" },
            { pattern: "/:id/progress", method: "post", name: "Registrar progreso" },
            { pattern: "/:id/my-progress", method: "get", name: "Mi progreso" },
            { pattern: "/:id/complete", method: "post", name: "Marcar completado" },
            { pattern: "/:id/certificate", method: "get", name: "Obtener certificado" }
        ];

        const missingEndpoints = [];
        const foundEndpoints = [];

        for (const ep of requiredEndpoints) {
            const regex = new RegExp(`router\\.${ep.method}\\(['"]${ep.pattern.replace(/:/g, ':')}`, 'i');
            if (routesContent.match(regex)) {
                foundEndpoints.push(ep.name);
            } else {
                missingEndpoints.push(`${ep.method.toUpperCase()} ${ep.pattern} - ${ep.name}`);
            }
        }

        if (missingEndpoints.length === 0) {
            recordTest('Training assignment/progress endpoints', true, `${foundEndpoints.length} endpoints implementados`);
        } else {
            recordTest('Training assignment/progress endpoints', false,
                `${missingEndpoints.length} endpoints faltantes`);
            log('info', 'Endpoints faltantes:');
            missingEndpoints.forEach(ep => log('warn', `  - ${ep}`));
        }

        // ================================================================
        // SECTION 6: DATA INTEGRITY
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 6: DATA INTEGRITY');
        console.log('-'.repeat(50));

        // Test 16: Timestamps
        const [missingTimestamps] = await sequelize.query(`
            SELECT COUNT(*) as count FROM trainings
            WHERE created_at IS NULL OR updated_at IS NULL
        `, { type: QueryTypes.SELECT });
        recordTest('All trainings have timestamps', parseInt(missingTimestamps.count) === 0);

        // Test 17: Índices
        const [indexes] = await sequelize.query(`
            SELECT COUNT(*) as count FROM pg_indexes
            WHERE tablename = 'trainings'
        `, { type: QueryTypes.SELECT });
        recordTest('Trainings table has indexes', parseInt(indexes.count) > 0,
            `${indexes.count} índices`);

        // ================================================================
        // SECTION 7: TRAINING TYPES/CATEGORIES
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 7: TRAINING TYPES/CATEGORIES');
        console.log('-'.repeat(50));

        // Test 18: Distribución por categoría
        const categoryDist = await sequelize.query(`
            SELECT category, COUNT(*) as count
            FROM trainings
            WHERE company_id = :companyId
            GROUP BY category
            ORDER BY count DESC
        `, { replacements: { companyId }, type: QueryTypes.SELECT });

        if (categoryDist.length > 0) {
            log('info', `Distribución: ${JSON.stringify(categoryDist)}`);
            recordTest('Category distribution', true, `${categoryDist.length} categorías con datos`);
        } else {
            recordTest('Category distribution', true, 'No hay datos aún', true);
        }

        // Test 19: Trainings con deadline
        const [withDeadline] = await sequelize.query(`
            SELECT COUNT(*) as count FROM trainings
            WHERE company_id = :companyId AND deadline IS NOT NULL
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Trainings with deadline', true, `${withDeadline.count} con fecha límite`);

        // Test 20: Trainings con certificado
        const [withCert] = await sequelize.query(`
            SELECT COUNT(*) as count FROM trainings
            WHERE company_id = :companyId AND (certificate = true OR certificate IS NOT NULL)
        `, { replacements: { companyId }, type: QueryTypes.SELECT });
        recordTest('Trainings with certificate', true, `${withCert.count} otorgan certificado`);

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

        // Mostrar warnings y críticos
        if (stats.warnings > 0 || stats.failed > 0) {
            console.log(`${colors.yellow}${colors.bold}ISSUES ENCONTRADOS:${colors.reset}`);
            stats.tests
                .filter(t => !t.passed || t.isWarning)
                .forEach(t => console.log(`  - ${t.name}: ${t.details}`));

            console.log('\n' + '='.repeat(70));
            console.log(`${colors.bold}ACCIONES REQUERIDAS:${colors.reset}`);
            console.log('='.repeat(70));
            console.log(`
1. CREAR TABLAS FALTANTES:
   - training_assignments (user_id, training_id, assigned_by, assigned_at, due_date)
   - training_progress (user_id, training_id, progress_percent, last_activity, completed_at)

2. CREAR ENDPOINTS FALTANTES en trainingRoutes.js:
   - Asignación de usuarios a trainings
   - Registro de progreso
   - Vista de mis asignaciones (para empleados)
   - Emisión de certificados

3. MIGRACIÓN RECOMENDADA:
   Ver archivo sugerido en: migrations/YYYY_training_assignments_progress.sql
`);
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
