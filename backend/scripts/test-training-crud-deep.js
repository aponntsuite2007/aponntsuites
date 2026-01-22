/**
 * ============================================================================
 * TRAINING/CAPACITACIÓN - CRUD PROFUNDO + PERSISTENCIA
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
    console.log(`${colors.bold}TRAINING/CAPACITACIÓN - CRUD PROFUNDO + PERSISTENCIA${colors.reset}`);
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
        // 1. TRAININGS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '1. TRAININGS - CRUD');
        console.log('-'.repeat(50));

        // CREATE Training
        log('crud', 'CREATE trainings');
        const trainingTitle = `TEST_TRAINING_${Date.now()}`;
        await sequelize.query(`
            INSERT INTO trainings (
                company_id, title, description, category, duration,
                is_mandatory, is_active, type, instructor, status,
                created_by, created_at, updated_at
            ) VALUES (
                :companyId, :title, 'Test CRUD Training Description', 'safety', 60,
                true, true, 'online', 'Dr. Test Instructor', 'active',
                :userId, NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, title: trainingTitle, userId: testData.userId },
            type: QueryTypes.INSERT
        });

        // READ Training
        log('crud', 'READ trainings');
        const [createdTraining] = await sequelize.query(`
            SELECT * FROM trainings WHERE title = :title AND company_id = :companyId
        `, { replacements: { title: trainingTitle, companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Training CREATE + READ',
            createdTraining && createdTraining.category === 'safety',
            `ID: ${createdTraining?.id}, category=${createdTraining?.category}`);
        testData.trainingId = createdTraining?.id;

        // UPDATE Training
        log('crud', 'UPDATE trainings');
        await sequelize.query(`
            UPDATE trainings
            SET description = 'Test UPDATED Description', duration = 90, status = 'draft', updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.trainingId }, type: QueryTypes.UPDATE });

        const [updatedTraining] = await sequelize.query(`
            SELECT * FROM trainings WHERE id = :id
        `, { replacements: { id: testData.trainingId }, type: QueryTypes.SELECT });

        recordTest('Training UPDATE',
            updatedTraining.description === 'Test UPDATED Description' && parseInt(updatedTraining.duration) === 90,
            `duration=${updatedTraining.duration}, status=${updatedTraining.status}`);

        // ================================================================
        // 2. TRAINING ASSIGNMENTS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '2. TRAINING ASSIGNMENTS - CRUD');
        console.log('-'.repeat(50));

        // CREATE Assignment - Valid status: pending, in_progress, completed, expired, cancelled
        log('crud', 'CREATE training_assignments');
        await sequelize.query(`
            INSERT INTO training_assignments (
                company_id, training_id, user_id, status,
                progress_percentage, due_date,
                assigned_at, created_at, updated_at
            ) VALUES (
                :companyId, :trainingId, :userId, 'pending',
                0, CURRENT_DATE + INTERVAL '30 days',
                NOW(), NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, trainingId: testData.trainingId, userId: testData.userId },
            type: QueryTypes.INSERT
        });

        // READ Assignment
        log('crud', 'READ training_assignments');
        const [createdAssignment] = await sequelize.query(`
            SELECT * FROM training_assignments
            WHERE training_id = :trainingId AND user_id = :userId
        `, { replacements: { trainingId: testData.trainingId, userId: testData.userId }, type: QueryTypes.SELECT });

        recordTest('Training Assignment CREATE + READ',
            createdAssignment && createdAssignment.status === 'pending',
            `ID: ${createdAssignment?.id}, progress=${createdAssignment?.progress_percentage}%`);
        testData.assignmentId = createdAssignment?.id;

        // UPDATE Assignment
        log('crud', 'UPDATE training_assignments');
        await sequelize.query(`
            UPDATE training_assignments
            SET status = 'in_progress', progress_percentage = 50, notes = 'Test UPDATED', updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.assignmentId }, type: QueryTypes.UPDATE });

        const [updatedAssignment] = await sequelize.query(`
            SELECT * FROM training_assignments WHERE id = :id
        `, { replacements: { id: testData.assignmentId }, type: QueryTypes.SELECT });

        recordTest('Training Assignment UPDATE',
            updatedAssignment.status === 'in_progress' && parseInt(updatedAssignment.progress_percentage) === 50,
            `status=${updatedAssignment.status}, progress=${updatedAssignment.progress_percentage}%`);

        // ================================================================
        // 3. TRAINING PROGRESS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '3. TRAINING PROGRESS - CRUD');
        console.log('-'.repeat(50));

        // CREATE Progress
        log('crud', 'CREATE training_progress');
        await sequelize.query(`
            INSERT INTO training_progress (
                company_id, assignment_id, attempt_number, score, passed,
                student_feedback, started_at, created_at, updated_at
            ) VALUES (
                :companyId, :assignmentId, 1, 75, false,
                'Test CRUD Progress', NOW(), NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, assignmentId: testData.assignmentId },
            type: QueryTypes.INSERT
        });

        // READ Progress
        log('crud', 'READ training_progress');
        const [createdProgress] = await sequelize.query(`
            SELECT * FROM training_progress
            WHERE assignment_id = :assignmentId AND attempt_number = 1
        `, { replacements: { assignmentId: testData.assignmentId }, type: QueryTypes.SELECT });

        recordTest('Training Progress CREATE + READ',
            createdProgress && parseInt(createdProgress.score) === 75,
            `ID: ${createdProgress?.id}, score=${createdProgress?.score}`);
        testData.progressId = createdProgress?.id;

        // UPDATE Progress
        log('crud', 'UPDATE training_progress');
        await sequelize.query(`
            UPDATE training_progress
            SET score = 95, passed = true, instructor_feedback = 'Test UPDATED feedback', completed_at = NOW(), updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.progressId }, type: QueryTypes.UPDATE });

        const [updatedProgress] = await sequelize.query(`
            SELECT * FROM training_progress WHERE id = :id
        `, { replacements: { id: testData.progressId }, type: QueryTypes.SELECT });

        recordTest('Training Progress UPDATE',
            parseInt(updatedProgress.score) === 95 && updatedProgress.passed === true,
            `score=${updatedProgress.score}, passed=${updatedProgress.passed}`);

        // ================================================================
        // 4. PERSISTENCIA - Verificar datos persisten
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '4. PERSISTENCIA - Verificar datos persisten');
        console.log('-'.repeat(50));

        const savedIds = {
            trainingId: testData.trainingId,
            assignmentId: testData.assignmentId,
            progressId: testData.progressId
        };

        log('info', 'Esperando commit de transacciones...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        log('crud', 'Verificando persistencia de datos...');

        const [persistedTraining] = await sequelize.query(`
            SELECT * FROM trainings WHERE id = :id
        `, { replacements: { id: savedIds.trainingId }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: Training existe',
            persistedTraining && persistedTraining.description === 'Test UPDATED Description',
            `description=${persistedTraining?.description?.slice(0, 30)}...`);

        const [persistedAssignment] = await sequelize.query(`
            SELECT * FROM training_assignments WHERE id = :id
        `, { replacements: { id: savedIds.assignmentId }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: Assignment existe',
            persistedAssignment && persistedAssignment.notes === 'Test UPDATED',
            `notes=${persistedAssignment?.notes}`);

        const [persistedProgress] = await sequelize.query(`
            SELECT * FROM training_progress WHERE id = :id
        `, { replacements: { id: savedIds.progressId }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: Progress existe',
            persistedProgress && persistedProgress.instructor_feedback === 'Test UPDATED feedback',
            `feedback=${persistedProgress?.instructor_feedback}`);

        // ================================================================
        // 5. DELETE - Limpieza (order matters due to FK constraints)
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '5. DELETE - Limpieza');
        console.log('-'.repeat(50));

        // DELETE Progress first (FK to assignment)
        log('crud', 'DELETE training_progress');
        await sequelize.query(`
            DELETE FROM training_progress WHERE id = :id
        `, { replacements: { id: savedIds.progressId }, type: QueryTypes.DELETE });

        const [deletedProgress] = await sequelize.query(`
            SELECT * FROM training_progress WHERE id = :id
        `, { replacements: { id: savedIds.progressId }, type: QueryTypes.SELECT });

        recordTest('Progress DELETE', !deletedProgress, 'Registro eliminado');

        // DELETE Assignment (FK to training)
        log('crud', 'DELETE training_assignments');
        await sequelize.query(`
            DELETE FROM training_assignments WHERE id = :id
        `, { replacements: { id: savedIds.assignmentId }, type: QueryTypes.DELETE });

        const [deletedAssignment] = await sequelize.query(`
            SELECT * FROM training_assignments WHERE id = :id
        `, { replacements: { id: savedIds.assignmentId }, type: QueryTypes.SELECT });

        recordTest('Assignment DELETE', !deletedAssignment, 'Registro eliminado');

        // DELETE Training
        log('crud', 'DELETE trainings');
        await sequelize.query(`
            DELETE FROM trainings WHERE id = :id
        `, { replacements: { id: savedIds.trainingId }, type: QueryTypes.DELETE });

        const [deletedTraining] = await sequelize.query(`
            SELECT * FROM trainings WHERE id = :id
        `, { replacements: { id: savedIds.trainingId }, type: QueryTypes.SELECT });

        recordTest('Training DELETE', !deletedTraining, 'Registro eliminado');

        // Verificar persistencia de DELETE
        log('info', 'Verificando persistencia de DELETE...');
        await new Promise(resolve => setTimeout(resolve, 500));

        const [checkTraining] = await sequelize.query(`
            SELECT * FROM trainings WHERE title = :title
        `, { replacements: { title: trainingTitle }, type: QueryTypes.SELECT });

        recordTest('PERSISTENCIA: DELETE persiste',
            !checkTraining, 'Datos eliminados permanentemente');

    } catch (error) {
        console.error(`${colors.red}ERROR:${colors.reset}`, error.message);
        stats.failed++;
    } finally {
        await sequelize.close();
    }

    // RESUMEN
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}RESUMEN CRUD TRAINING${colors.reset}`);
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
