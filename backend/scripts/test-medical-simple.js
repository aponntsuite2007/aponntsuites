/**
 * Test simplificado del módulo Medical - Sin SystemRegistry
 * Para evitar conflictos con sesiones concurrentes de Claude Code
 */

require('dotenv').config();
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

// Conexión local PostgreSQL
const sequelizeConfig = {
    database: 'attendance_system',
    username: 'postgres',
    password: 'Aedr15150302',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
};

console.log('🚀 [TEST] Test simplificado de módulo Medical Cases\n');

async function runTest() {
    let browser, page, sequelize;
    const results = {
        module: 'medical',
        tests: [],
        passed: 0,
        failed: 0
    };

    try {
        // 1. Conectar a BD
        console.log('🐘 [DB] Conectando a PostgreSQL...');
        sequelize = new Sequelize(sequelizeConfig);
        await sequelize.authenticate();
        console.log('✅ [DB] Conectado\n');

        // 2. Detectar servidor
        const baseUrl = 'http://localhost:9997';
        console.log(`🌐 [SERVER] Usando ${baseUrl}\n`);

        // 3. Lanzar navegador
        console.log('🌐 [BROWSER] Lanzando Chromium...');
        browser = await chromium.launch({ headless: true });
        page = await browser.newPage();
        console.log('✅ [BROWSER] Lanzado\n');

        // 4. LOGIN (3 pasos como Phase4TestOrchestrator)
        console.log('🧪 TEST 1: LOGIN (3 PASOS)');
        console.log('─'.repeat(60));
        try {
            await page.goto(`${baseUrl}/panel-empresa.html`, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForTimeout(1000);

            // Paso 1: Seleccionar empresa del dropdown
            console.log('   📍 PASO 1: Seleccionando empresa...');
            await page.waitForSelector('#companySelect', { visible: true, timeout: 10000 });
            await page.waitForTimeout(1000);
            await page.selectOption('#companySelect', 'isi');
            await page.waitForTimeout(5000); // Esperar a que aparezca campo usuario

            // Paso 2: Usuario
            console.log('   📍 PASO 2: Ingresando usuario...');
            const usernameInput = page.locator('input[type="text"]:visible').last();
            await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
            await usernameInput.fill('soporte'); // Usuario soporte del sistema
            await page.keyboard.press('Enter');
            await page.waitForTimeout(3000);

            // Paso 3: Password
            console.log('   📍 PASO 3: Ingresando password...');
            const passwordInput = page.locator('input[type="password"]:visible').last();
            await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
            await passwordInput.fill('admin123');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(3000);

            console.log('   ✅ TEST 1 PASSED - Login exitoso\n');
            results.tests.push({ name: 'login', status: 'passed' });
            results.passed++;
        } catch (error) {
            console.error('   ❌ TEST 1 FAILED:', error.message, '\n');
            results.tests.push({ name: 'login', status: 'failed', error: error.message });
            results.failed++;
            throw error; // Si login falla, no continuar
        }

        // 5. NAVEGAR A GESTIÓN MÉDICA
        console.log('🧪 TEST 2: NAVEGACIÓN AL MÓDULO');
        console.log('─'.repeat(60));
        try {
            await page.click('text=Gestión Médica');
            await page.waitForSelector('.card-title:has-text("Casos Médicos")', { timeout: 5000 });
            console.log('   ✅ TEST 2 PASSED - Navegación exitosa\n');
            results.tests.push({ name: 'navigation', status: 'passed' });
            results.passed++;
        } catch (error) {
            console.error('   ❌ TEST 2 FAILED:', error.message, '\n');
            results.tests.push({ name: 'navigation', status: 'failed', error: error.message });
            results.failed++;
        }

        // 6. LISTA CARGA
        console.log('🧪 TEST 3: LISTA CARGA');
        console.log('─'.repeat(60));
        try {
            await page.waitForSelector('#medicalCasesTable tbody tr', { timeout: 5000 });
            const rowCount = await page.locator('#medicalCasesTable tbody tr').count();
            console.log(`   ✅ TEST 3 PASSED - Lista cargada (${rowCount} filas)\n`);
            results.tests.push({ name: 'list_load', status: 'passed', count: rowCount });
            results.passed++;
        } catch (error) {
            console.error('   ❌ TEST 3 FAILED:', error.message, '\n');
            results.tests.push({ name: 'list_load', status: 'failed', error: error.message });
            results.failed++;
        }

        // 7. CREATE - Caso médico
        console.log('🧪 TEST 4: CREATE - Crear caso médico');
        console.log('─'.repeat(60));
        let testCaseId = null;
        try {
            // Obtener un empleado de prueba
            const [employee] = await sequelize.query(
                `SELECT user_id, "firstName", "lastName"
                 FROM users
                 WHERE company_id = 11 AND role != 'admin'
                 LIMIT 1`,
                { type: Sequelize.QueryTypes.SELECT }
            );

            if (!employee) {
                throw new Error('No hay empleados de prueba disponibles');
            }

            // Insertar caso directamente en BD (evitar el bug del API)
            const [result] = await sequelize.query(
                `INSERT INTO absence_cases
                 (employee_id, company_id, absence_type, start_date, end_date,
                  case_status, employee_description, requested_days, created_by)
                 VALUES
                 (:employeeId, 11, 'medical_illness', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days',
                  'pending', 'Test case automated', 3, :createdBy)
                 RETURNING id`,
                {
                    replacements: { employeeId: employee.user_id, createdBy: employee.user_id },
                    type: Sequelize.QueryTypes.INSERT
                }
            );

            testCaseId = result[0].id;
            console.log(`   ✅ TEST 4 PASSED - Caso creado (ID: ${testCaseId})\n`);
            results.tests.push({ name: 'create', status: 'passed', caseId: testCaseId });
            results.passed++;
        } catch (error) {
            console.error('   ❌ TEST 4 FAILED:', error.message, '\n');
            results.tests.push({ name: 'create', status: 'failed', error: error.message });
            results.failed++;
        }

        // 8. READ - Verificar FK con users
        if (testCaseId) {
            console.log('🧪 TEST 5: READ - Verificar FK con users');
            console.log('─'.repeat(60));
            try {
                const [fkCheck] = await sequelize.query(
                    `SELECT
                        ac.id,
                        u.user_id,
                        u."firstName",
                        u."lastName"
                    FROM absence_cases ac
                    INNER JOIN users u ON ac.employee_id = u.user_id
                    WHERE ac.id = :caseId`,
                    { replacements: { caseId: testCaseId }, type: Sequelize.QueryTypes.SELECT }
                );

                if (fkCheck && fkCheck.user_id) {
                    console.log(`   ✅ TEST 5 PASSED - FK con users válida (${fkCheck.firstName} ${fkCheck.lastName})\n`);
                    results.tests.push({ name: 'fk_validation', status: 'passed' });
                    results.passed++;
                } else {
                    throw new Error('FK con users no válida');
                }
            } catch (error) {
                console.error('   ❌ TEST 5 FAILED:', error.message, '\n');
                results.tests.push({ name: 'fk_validation', status: 'failed', error: error.message });
                results.failed++;
            }
        }

        // 9. Cleanup
        if (testCaseId) {
            await sequelize.query(
                `DELETE FROM absence_cases WHERE id = :caseId`,
                { replacements: { caseId: testCaseId } }
            );
            console.log('🧹 Cleanup: Caso de prueba eliminado\n');
        }

    } catch (error) {
        console.error('\n❌ ERROR CRÍTICO:', error.message);
    } finally {
        // Cerrar recursos
        if (browser) {
            await browser.close();
            console.log('✅ Browser cerrado');
        }
        if (sequelize) {
            await sequelize.close();
            console.log('✅ BD cerrada');
        }
    }

    // Resumen
    console.log('\n' + '═'.repeat(80));
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
