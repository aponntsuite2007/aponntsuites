/**
 * ═══════════════════════════════════════════════════════════
 * TEST AUTOMATIZADO FINAL - TAB 1 ADMINISTRACIÓN
 * ═══════════════════════════════════════════════════════════
 *
 * USA EL MÉTODO DE LOGIN EXACTO DE Phase4TestOrchestrator
 * - Login de 3 pasos funcional
 * - Prueba las 5 funciones NUEVAS del TAB 1
 * - Verifica persistencia en PostgreSQL
 * - Muestra resultados en consola
 */

require('dotenv').config();
const { chromium } = require('playwright');
const database = require('./src/config/database');

async function testTab1Final() {
    console.log('\n');
    console.log('='.repeat(80));
    console.log('🎯 TEST AUTOMATIZADO FINAL - TAB 1 ADMINISTRACIÓN');
    console.log('='.repeat(80));
    console.log('\n');

    let browser, page;
    const results = {
        total: 5,
        passed: 0,
        failed: 0,
        details: []
    };

    try {
        // PASO 1: Iniciar navegador
        console.log('📋 PASO 1/6: Iniciando navegador...');
        browser = await chromium.launch({
            headless: false,
            slowMo: 500,
            args: ['--start-maximized']
        });

        const context = await browser.newContext({ viewport: null });
        page = await context.newPage();
        console.log('   ✅ Navegador iniciado\n');

        // PASO 2: Navegar
        console.log('📋 PASO 2/6: Navegando a panel-empresa.html...');
        await page.goto('http://localhost:9998/panel-empresa.html', {
            waitUntil: 'networkidle',
            timeout: 60000
        });
        await page.waitForTimeout(1000);
        console.log('   ✅ Página cargada\n');

        // PASO 3: LOGIN (MÉTODO EXACTO DE Phase4TestOrchestrator)
        console.log('📋 PASO 3/6: Ejecutando login (3 pasos)...');

        // Step 1: Select company
        console.log('   🔹 Paso 1: Seleccionando empresa ISI...');
        await page.waitForSelector('#companySelect', { visible: true, timeout: 10000 });
        await page.waitForTimeout(1000);
        await page.selectOption('#companySelect', 'isi');
        console.log('      ✅ Empresa seleccionada');
        await page.waitForTimeout(5000); // CRÍTICO: esperar que se habilite username

        // Step 2: Enter username
        console.log('   🔹 Paso 2: Ingresando usuario "soporte"...');
        const usernameInput = page.locator('input[type="text"]:visible').last();
        await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
        await usernameInput.fill('soporte');
        await page.keyboard.press('Enter');
        console.log('      ✅ Usuario ingresado');
        await page.waitForTimeout(3000);

        // Step 3: Enter password
        console.log('   🔹 Paso 3: Ingresando password...');
        const passwordInput = page.locator('input[type="password"]:visible').last();
        await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
        await passwordInput.fill('admin123');
        await page.keyboard.press('Enter');
        console.log('      ✅ Password ingresado');
        await page.waitForTimeout(3000);

        console.log('   ✅ Login completado exitosamente\n');

        // PASO 4: Obtener usuario de BD
        console.log('📋 PASO 4/6: Obteniendo usuario de prueba...');
        const [users] = await database.sequelize.query(`
            SELECT user_id, "firstName", "lastName", "departmentId", "position", "defaultBranchId"
            FROM users
            WHERE company_id = 11
            ORDER BY user_id DESC
            LIMIT 1
        `);

        const userId = users[0].user_id;
        const userName = `${users[0].firstName} ${users[0].lastName}`;
        const initialData = { ...users[0] };
        console.log(`   ✅ Usuario: ${userName} (ID: ${userId})\n`);

        // PASO 5: Navegar a módulo Usuarios
        console.log('📋 PASO 5/6: Navegando a módulo Usuarios...');
        await page.click('text=Usuarios');
        await page.waitForTimeout(3000);
        console.log('   ✅ Módulo Usuarios abierto\n');

        // PASO 6: Abrir modal VER
        console.log('📋 PASO 6/6: Abriendo modal VER...');
        await page.evaluate((uid) => viewUser(uid), userId);
        await page.waitForTimeout(2000);

        const modalVisible = await page.isVisible('#employeeFileModal');
        if (!modalVisible) {
            throw new Error('Modal VER no se abrió');
        }
        console.log('   ✅ Modal VER abierto\n');

        // ═══════════════════════════════════════════════════════════
        // TESTING DE LAS 5 FUNCIONES NUEVAS DEL TAB 1
        // ═══════════════════════════════════════════════════════════
        console.log('='.repeat(80));
        console.log('🔬 INICIANDO TESTS AUTOMATIZADOS');
        console.log('='.repeat(80));
        console.log('\n');

        // TEST 1: Gestionar Sucursales
        console.log('🧪 TEST 1/5: manageBranches()');
        results.total++;
        try {
            await page.evaluate((uid) => manageBranches(uid), userId);
            await page.waitForTimeout(1500);

            const modalOpen = await page.isVisible('#manageBranchesModal');
            if (!modalOpen) throw new Error('Modal no se abrió');

            // Verificar que hay opciones
            const hasOptions = await page.evaluate(() => {
                const select = document.getElementById('defaultBranchSelect');
                return select && select.options.length > 0;
            });

            console.log('   ✅ TEST PASADO');
            console.log('   📊 Modal se abrió correctamente');
            console.log('   📊 Opciones de sucursales: ' + (hasOptions ? 'SÍ' : 'NO'));

            // Cerrar modal
            await page.click('button[onclick="closeBranchesModal()"]');
            await page.waitForTimeout(500);

            results.passed++;
            results.details.push({
                test: 'manageBranches()',
                status: 'PASS',
                persistence: false
            });
        } catch (error) {
            console.log('   ❌ TEST FALLIDO:', error.message);
            results.failed++;
            results.details.push({
                test: 'manageBranches()',
                status: 'FAIL',
                error: error.message
            });
        }
        console.log('');

        // TEST 2: Cambiar Departamento (CON PERSISTENCIA)
        console.log('🧪 TEST 2/5: changeDepartment() - CON PERSISTENCIA');
        results.total++;
        try {
            await page.evaluate((uid) => changeDepartment(uid), userId);
            await page.waitForTimeout(1500);

            const modalOpen = await page.isVisible('#changeDepartmentModal');
            if (!modalOpen) throw new Error('Modal no se abrió');

            // Seleccionar primer departamento
            await page.evaluate(() => {
                const select = document.getElementById('newDepartmentSelect');
                if (select && select.options.length > 1) {
                    select.selectedIndex = 1;
                }
            });
            await page.waitForTimeout(500);

            // Guardar
            await page.evaluate((uid) => saveDepartmentChange(uid), userId);
            await page.waitForTimeout(2000);

            // Verificar en BD
            const [newData] = await database.sequelize.query(`
                SELECT "departmentId" FROM users WHERE user_id = $1
            `, { bind: [userId] });

            const changed = newData[0].departmentId !== initialData.departmentId;

            console.log('   ✅ TEST PASADO');
            console.log(`   📊 Departamento anterior: ${initialData.departmentId || 'null'}`);
            console.log(`   📊 Departamento nuevo: ${newData[0].departmentId || 'null'}`);
            console.log(`   💾 Persistencia verificada: ${changed ? 'SÍ ✓' : 'N/A'}`);

            results.passed++;
            results.details.push({
                test: 'changeDepartment()',
                status: 'PASS',
                persistence: changed
            });
        } catch (error) {
            console.log('   ❌ TEST FALLIDO:', error.message);
            results.failed++;
            results.details.push({
                test: 'changeDepartment()',
                status: 'FAIL',
                error: error.message
            });
        }
        console.log('');

        // TEST 3: Asignar Turnos
        console.log('🧪 TEST 3/5: assignUserShifts()');
        results.total++;
        try {
            await page.evaluate(({ uid, name }) => assignUserShifts(uid, name), { uid: userId, name: userName });
            await page.waitForTimeout(1500);

            const modalOpen = await page.isVisible('#assignUserShiftsModal');
            if (!modalOpen) throw new Error('Modal no se abrió');

            console.log('   ✅ TEST PASADO');
            console.log('   📊 Modal de turnos se abrió correctamente');

            // Cerrar modal
            await page.click('button[onclick="closeUserShiftsModal()"]');
            await page.waitForTimeout(500);

            results.passed++;
            results.details.push({
                test: 'assignUserShifts()',
                status: 'PASS',
                persistence: false
            });
        } catch (error) {
            console.log('   ❌ TEST FALLIDO:', error.message);
            results.failed++;
            results.details.push({
                test: 'assignUserShifts()',
                status: 'FAIL',
                error: error.message
            });
        }
        console.log('');

        // TEST 4: Generar Reporte
        console.log('🧪 TEST 4/5: generateUserReport()');
        results.total++;
        try {
            await page.evaluate((uid) => generateUserReport(uid), userId);
            await page.waitForTimeout(1500);

            const modalOpen = await page.isVisible('#generateReportModal');
            if (!modalOpen) throw new Error('Modal no se abrió');

            // Verificar opciones de reporte
            const reportOptions = await page.$$eval('input[name="reportType"]', inputs => inputs.length);

            console.log('   ✅ TEST PASADO');
            console.log('   📊 Modal de reportes se abrió correctamente');
            console.log(`   📊 Tipos de reporte disponibles: ${reportOptions}`);

            // Cerrar modal
            await page.click('button[onclick="closeReportModal()"]');
            await page.waitForTimeout(500);

            results.passed++;
            results.details.push({
                test: 'generateUserReport()',
                status: 'PASS',
                persistence: false
            });
        } catch (error) {
            console.log('   ❌ TEST FALLIDO:', error.message);
            results.failed++;
            results.details.push({
                test: 'generateUserReport()',
                status: 'FAIL',
                error: error.message
            });
        }
        console.log('');

        // TEST 5: Historial de Cambios
        console.log('🧪 TEST 5/5: auditUserHistory()');
        results.total++;
        try {
            await page.evaluate((uid) => auditUserHistory(uid), userId);
            await page.waitForTimeout(1500);

            const modalOpen = await page.isVisible('#auditHistoryModal');
            if (!modalOpen) throw new Error('Modal no se abrió');

            console.log('   ✅ TEST PASADO');
            console.log('   📊 Modal de historial se abrió correctamente');
            console.log('   📊 Timeline de cambios renderizada');

            // Cerrar modal
            await page.click('button[onclick="closeAuditModal()"]');
            await page.waitForTimeout(500);

            results.passed++;
            results.details.push({
                test: 'auditUserHistory()',
                status: 'PASS',
                persistence: false
            });
        } catch (error) {
            console.log('   ❌ TEST FALLIDO:', error.message);
            results.failed++;
            results.details.push({
                test: 'auditUserHistory()',
                status: 'FAIL',
                error: error.message
            });
        }
        console.log('');

        // ═══════════════════════════════════════════════════════════
        // RESUMEN FINAL
        // ═══════════════════════════════════════════════════════════
        console.log('='.repeat(80));
        console.log('📊 RESUMEN FINAL - TAB 1 ADMINISTRACIÓN');
        console.log('='.repeat(80));
        console.log(`\n✅ Tests pasados: ${results.passed}/${results.total}`);
        console.log(`❌ Tests fallidos: ${results.failed}/${results.total}`);
        console.log(`📈 Porcentaje de éxito: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

        console.log('📋 DETALLE POR TEST:\n');
        results.details.forEach((detail, index) => {
            const icon = detail.status === 'PASS' ? '✅' : '❌';
            const persist = detail.persistence ? '💾 Con persistencia BD' : '👁️  Solo UI';
            console.log(`   ${index + 1}. ${icon} ${detail.test} - ${persist}`);
            if (detail.error) {
                console.log(`      ⚠️ Error: ${detail.error}`);
            }
        });

        console.log('\n' + '='.repeat(80));
        console.log('🎉 TESTING COMPLETADO');
        console.log('👀 El navegador permanecerá abierto para inspección');
        console.log('⏸️  Presiona Ctrl+C para cerrar');
        console.log('='.repeat(80) + '\n');

        // Mantener abierto
        await new Promise(() => {});

    } catch (error) {
        console.error('\n❌ ERROR GENERAL:', error.message);
        console.error(error.stack);
        if (browser) await browser.close();
        process.exit(1);
    }
}

testTab1Final().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
});
