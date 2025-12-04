/**
 * Test ULTRA-SIMPLIFICADO - Solo BD (sin Playwright, sin Sequelize includes)
 * Valida que el módulo médico funciona a nivel de base de datos
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
    database: 'attendance_system',
    username: 'postgres',
    password: 'Aedr15150302',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
});

console.log('🧪 TEST MÉDICO - Solo validación de BD\n');

async function runTest() {
    const results = { tests: [], passed: 0, failed: 0 };

    try {
        // 1. Conectar
        console.log('🐘 [DB] Conectando...');
        await sequelize.authenticate();
        console.log('✅ [DB] Conectado\n');

        // 2. Obtener empleado de prueba
        console.log('🧪 TEST 1: OBTENER EMPLEADO DE PRUEBA');
        console.log('─'.repeat(60));
        let testEmployeeId;
        try {
            const [employees] = await sequelize.query(
                `SELECT user_id FROM users WHERE company_id = 11 AND role != 'admin' LIMIT 1`,
                { type: Sequelize.QueryTypes.SELECT }
            );

            if (!employees || !employees.user_id) {
                throw new Error('No hay empleados de prueba en company_id=11');
            }

            testEmployeeId = employees.user_id;
            console.log(`   ✅ TEST 1 PASSED - Empleado encontrado: ${testEmployeeId}\n`);
            results.tests.push({ name: 'get_employee', status: 'passed' });
            results.passed++;
        } catch (error) {
            console.error(`   ❌ TEST 1 FAILED: ${error.message}\n`);
            results.tests.push({ name: 'get_employee', status: 'failed', error: error.message });
            results.failed++;
            throw error;
        }

        // 3. CREATE - Insertar caso médico
        console.log('🧪 TEST 2: CREATE - Insertar caso médico');
        console.log('─'.repeat(60));
        let testCaseId;
        try {
            const [result] = await sequelize.query(
                `INSERT INTO absence_cases
                 (company_id, employee_id, absence_type, start_date, end_date,
                  requested_days, case_status, employee_description, created_by)
                 VALUES
                 (11, :employeeId, 'medical_illness', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days',
                  3, 'pending', 'Test automatizado - módulo médico', :employeeId)
                 RETURNING id`,
                {
                    replacements: { employeeId: testEmployeeId },
                    type: Sequelize.QueryTypes.INSERT
                }
            );

            testCaseId = result[0].id;
            console.log(`   ✅ TEST 2 PASSED - Caso creado: ${testCaseId}\n`);
            results.tests.push({ name: 'create_case', status: 'passed', caseId: testCaseId });
            results.passed++;
        } catch (error) {
            console.error(`   ❌ TEST 2 FAILED: ${error.message}\n`);
            results.tests.push({ name: 'create_case', status: 'failed', error: error.message });
            results.failed++;
        }

        // 4. READ - Verificar caso existe
        if (testCaseId) {
            console.log('🧪 TEST 3: READ - Verificar caso existe');
            console.log('─'.repeat(60));
            try {
                const [caseData] = await sequelize.query(
                    `SELECT id, employee_id, case_status, absence_type
                     FROM absence_cases
                     WHERE id = :caseId`,
                    { replacements: { caseId: testCaseId }, type: Sequelize.QueryTypes.SELECT }
                );

                if (caseData && caseData.id === testCaseId) {
                    console.log(`   ✅ TEST 3 PASSED - Caso verificado (status: ${caseData.case_status})\n`);
                    results.tests.push({ name: 'read_case', status: 'passed' });
                    results.passed++;
                } else {
                    throw new Error('Caso no encontrado después de crear');
                }
            } catch (error) {
                console.error(`   ❌ TEST 3 FAILED: ${error.message}\n`);
                results.tests.push({ name: 'read_case', status: 'failed', error: error.message });
                results.failed++;
            }
        }

        // 5. UPDATE - Cambiar estado
        if (testCaseId) {
            console.log('🧪 TEST 4: UPDATE - Cambiar estado a under_review');
            console.log('─'.repeat(60));
            try {
                await sequelize.query(
                    `UPDATE absence_cases
                     SET case_status = 'under_review'
                     WHERE id = :caseId`,
                    { replacements: { caseId: testCaseId } }
                );

                // Verificar cambio
                const [updated] = await sequelize.query(
                    `SELECT case_status FROM absence_cases WHERE id = :caseId`,
                    { replacements: { caseId: testCaseId }, type: Sequelize.QueryTypes.SELECT }
                );

                if (updated && updated.case_status === 'under_review') {
                    console.log(`   ✅ TEST 4 PASSED - Estado actualizado correctamente\n`);
                    results.tests.push({ name: 'update_case', status: 'passed' });
                    results.passed++;
                } else {
                    throw new Error('Estado no se actualizó');
                }
            } catch (error) {
                console.error(`   ❌ TEST 4 FAILED: ${error.message}\n`);
                results.tests.push({ name: 'update_case', status: 'failed', error: error.message });
                results.failed++;
            }
        }

        // 6. FK VALIDATION - Verificar relación con users
        if (testCaseId) {
            console.log('🧪 TEST 5: FK VALIDATION - Verificar relación con users');
            console.log('─'.repeat(60));
            try {
                const [fkCheck] = await sequelize.query(
                    `SELECT ac.id, ac.employee_id, u.user_id
                     FROM absence_cases ac
                     INNER JOIN users u ON ac.employee_id = u.user_id
                     WHERE ac.id = :caseId`,
                    { replacements: { caseId: testCaseId }, type: Sequelize.QueryTypes.SELECT }
                );

                if (fkCheck && fkCheck.employee_id === fkCheck.user_id) {
                    console.log(`   ✅ TEST 5 PASSED - FK con users válida\n`);
                    results.tests.push({ name: 'fk_validation', status: 'passed' });
                    results.passed++;
                } else {
                    throw new Error('FK con users no válida');
                }
            } catch (error) {
                console.error(`   ❌ TEST 5 FAILED: ${error.message}\n`);
                results.tests.push({ name: 'fk_validation', status: 'failed', error: error.message });
                results.failed++;
            }
        }

        // 7. DELETE - Limpiar
        if (testCaseId) {
            console.log('🧪 TEST 6: DELETE - Eliminar caso de prueba');
            console.log('─'.repeat(60));
            try {
                await sequelize.query(
                    `DELETE FROM absence_cases WHERE id = :caseId`,
                    { replacements: { caseId: testCaseId } }
                );

                // Verificar eliminación
                const [deleted] = await sequelize.query(
                    `SELECT id FROM absence_cases WHERE id = :caseId`,
                    { replacements: { caseId: testCaseId }, type: Sequelize.QueryTypes.SELECT }
                );

                if (!deleted) {
                    console.log(`   ✅ TEST 6 PASSED - Caso eliminado correctamente\n`);
                    results.tests.push({ name: 'delete_case', status: 'passed' });
                    results.passed++;
                } else {
                    throw new Error('Caso no se eliminó');
                }
            } catch (error) {
                console.error(`   ❌ TEST 6 FAILED: ${error.message}\n`);
                results.tests.push({ name: 'delete_case', status: 'failed', error: error.message });
                results.failed++;
            }
        }

    } catch (error) {
        console.error('\n❌ ERROR CRÍTICO:', error.message);
    } finally {
        await sequelize.close();
        console.log('✅ BD cerrada\n');
    }

    // Resumen
    console.log('═'.repeat(80));
    console.log('📊 RESUMEN FINAL');
    console.log('═'.repeat(80));
    console.log(`Total tests: ${results.tests.length}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);
    console.log('═'.repeat(80));

    process.exit(results.failed > 0 ? 1 : 0);
}

runTest().catch(error => {
    console.error('Error no manejado:', error);
    process.exit(1);
});
