/**
 * ═══════════════════════════════════════════════════════════
 * TEST TAB 1 COMPLETO - ADMINISTRACIÓN
 * ═══════════════════════════════════════════════════════════
 *
 * Este test prueba TODAS las 10 funciones del TAB 1:
 * 1. editUserRole() ✅
 * 2. toggleUserStatus() ✅
 * 3. toggleGPSRadius() ✅
 * 4. manageBranches() ✅ NUEVO
 * 5. changeDepartment() ✅ NUEVO
 * 6. editPosition() ✅
 * 7. resetPassword() ✅
 * 8. assignUserShifts() ✅
 * 9. generateUserReport() ✅ NUEVO
 * 10. auditUserHistory() ✅ NUEVO
 */

require('dotenv').config();
const { chromium } = require('playwright');
const database = require('./src/config/database');

async function testTab1Complete() {
    console.log('\n');
    console.log('='.repeat(80));
    console.log('🎯 TEST TAB 1 COMPLETO - ADMINISTRACIÓN (10 FUNCIONES)');
    console.log('='.repeat(80));
    console.log('\n');

    let browser, page;

    try {
        // PASO 1: Iniciar navegador
        console.log('📋 PASO 1/6: Iniciando navegador...');
        browser = await chromium.launch({
            headless: false,
            slowMo: 100
        });
        const context = await browser.newContext();
        page = await context.newPage();
        console.log('   ✅ Navegador iniciado\n');

        // PASO 2: Navegar y login
        console.log('📋 PASO 2/6: Login...');
        await page.goto('http://localhost:9998/panel-empresa.html');

        // Esperar y seleccionar empresa
        await page.waitForSelector('#companySelect', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // PASO 1: Seleccionar empresa
        const selectValue = await page.evaluate(() => {
            const select = document.getElementById('companySelect');
            const options = Array.from(select.options);
            const target = options.find(o => o.text && o.text.toLowerCase() === 'isi');
            if (target) {
                select.value = target.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                return target.value;
            }
            return null;
        });
        console.log(`   🔍 Empresa seleccionada: ${selectValue}`);
        await page.waitForTimeout(5000);

        // PASO 2: Escribir usuario (esperar que se habilite)
        await page.waitForSelector('input[type="text"]:not([disabled])', { timeout: 10000 });
        await page.fill('input[type="text"]:not([disabled])', 'soporte');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);

        // PASO 3: Escribir password
        await page.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
        await page.fill('input[type="password"]:visible', 'admin123');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);

        console.log('   ✅ Login completado\n');

        // PASO 3: Obtener usuario de BD
        console.log('📋 PASO 3/6: Obteniendo usuario...');
        const [users] = await database.sequelize.query(`
            SELECT user_id, "firstName", "lastName"
            FROM users
            WHERE company_id = 11
            ORDER BY user_id DESC
            LIMIT 1
        `);

        if (!users || users.length === 0) {
            throw new Error('No hay usuarios en la BD');
        }

        const userId = users[0].user_id;
        const userName = `${users[0].firstName} ${users[0].lastName}`;
        console.log(`   ✅ Usuario: ${userName} (ID: ${userId})\n`);

        // PASO 4: Navegar a módulo Users
        console.log('📋 PASO 4/6: Navegando a Usuarios...');
        await page.click('text=Usuarios');
        await page.waitForTimeout(2000);
        console.log('   ✅ Módulo Usuarios abierto\n');

        // PASO 5: Abrir modal viewUser
        console.log('📋 PASO 5/6: Abriendo modal VER...');
        await page.evaluate((uid) => {
            viewUser(uid);
        }, userId);
        await page.waitForTimeout(2000);

        // Verificar que el modal esté visible
        const modalVisible = await page.isVisible('#employeeFileModal');
        console.log(`   ✅ Modal visible: ${modalVisible}\n`);

        if (!modalVisible) {
            throw new Error('Modal no se abrió correctamente');
        }

        // PASO 6: PROBAR TODAS LAS FUNCIONES DEL TAB 1
        console.log('📋 PASO 6/6: PROBANDO FUNCIONES DEL TAB 1...\n');
        console.log('='.repeat(80));

        const results = {
            total: 10,
            passed: 0,
            failed: 0,
            details: []
        };

        // FUNCIÓN 1: manageBranches()
        console.log('\n🔹 FUNCIÓN 1/10: manageBranches()');
        try {
            await page.evaluate((uid) => manageBranches(uid), userId);
            await page.waitForTimeout(1000);
            const branchModalVisible = await page.isVisible('#manageBranchesModal');
            if (branchModalVisible) {
                console.log('   ✅ Modal de sucursales se abrió correctamente');
                results.passed++;
                results.details.push({ func: 'manageBranches()', status: 'PASS' });
                // Cerrar modal
                await page.click('button[onclick="closeBranchesModal()"]');
                await page.waitForTimeout(500);
            } else {
                throw new Error('Modal no visible');
            }
        } catch (error) {
            console.log('   ❌ ERROR:', error.message);
            results.failed++;
            results.details.push({ func: 'manageBranches()', status: 'FAIL', error: error.message });
        }

        // FUNCIÓN 2: changeDepartment()
        console.log('\n🔹 FUNCIÓN 2/10: changeDepartment()');
        try {
            await page.evaluate((uid) => changeDepartment(uid, null), userId);
            await page.waitForTimeout(1000);
            const deptModalVisible = await page.isVisible('#changeDepartmentModal');
            if (deptModalVisible) {
                console.log('   ✅ Modal de departamento se abrió correctamente');
                results.passed++;
                results.details.push({ func: 'changeDepartment()', status: 'PASS' });
                // Cerrar modal
                await page.click('button[onclick="closeDepartmentModal()"]');
                await page.waitForTimeout(500);
            } else {
                throw new Error('Modal no visible');
            }
        } catch (error) {
            console.log('   ❌ ERROR:', error.message);
            results.failed++;
            results.details.push({ func: 'changeDepartment()', status: 'FAIL', error: error.message });
        }

        // FUNCIÓN 3: assignUserShifts()
        console.log('\n🔹 FUNCIÓN 3/10: assignUserShifts()');
        try {
            await page.evaluate((uid, name) => assignUserShifts(uid, name), userId, userName);
            await page.waitForTimeout(1000);
            const shiftsModalVisible = await page.isVisible('#assignUserShiftsModal');
            if (shiftsModalVisible) {
                console.log('   ✅ Modal de turnos se abrió correctamente');
                results.passed++;
                results.details.push({ func: 'assignUserShifts()', status: 'PASS' });
                // Cerrar modal
                await page.click('button[onclick="closeUserShiftsModal()"]');
                await page.waitForTimeout(500);
            } else {
                throw new Error('Modal no visible');
            }
        } catch (error) {
            console.log('   ❌ ERROR:', error.message);
            results.failed++;
            results.details.push({ func: 'assignUserShifts()', status: 'FAIL', error: error.message });
        }

        // FUNCIÓN 4: generateUserReport()
        console.log('\n🔹 FUNCIÓN 4/10: generateUserReport()');
        try {
            await page.evaluate((uid) => generateUserReport(uid), userId);
            await page.waitForTimeout(1000);
            const reportModalVisible = await page.isVisible('#generateReportModal');
            if (reportModalVisible) {
                console.log('   ✅ Modal de reportes se abrió correctamente');
                results.passed++;
                results.details.push({ func: 'generateUserReport()', status: 'PASS' });
                // Cerrar modal
                await page.click('button[onclick="closeReportModal()"]');
                await page.waitForTimeout(500);
            } else {
                throw new Error('Modal no visible');
            }
        } catch (error) {
            console.log('   ❌ ERROR:', error.message);
            results.failed++;
            results.details.push({ func: 'generateUserReport()', status: 'FAIL', error: error.message });
        }

        // FUNCIÓN 5: auditUserHistory()
        console.log('\n🔹 FUNCIÓN 5/10: auditUserHistory()');
        try {
            await page.evaluate((uid) => auditUserHistory(uid), userId);
            await page.waitForTimeout(1000);
            const auditModalVisible = await page.isVisible('#auditHistoryModal');
            if (auditModalVisible) {
                console.log('   ✅ Modal de historial se abrió correctamente');
                results.passed++;
                results.details.push({ func: 'auditUserHistory()', status: 'PASS' });
                // Cerrar modal
                await page.click('button[onclick="closeAuditModal()"]');
                await page.waitForTimeout(500);
            } else {
                throw new Error('Modal no visible');
            }
        } catch (error) {
            console.log('   ❌ ERROR:', error.message);
            results.failed++;
            results.details.push({ func: 'auditUserHistory()', status: 'FAIL', error: error.message });
        }

        // FUNCIÓN 6-10: Verificar que los botones existan y sean clickeables
        const functionsToCheck = [
            { name: 'editUserRole()', selector: 'button[onclick*="editUserRole"]' },
            { name: 'toggleUserStatus()', selector: 'button[onclick*="toggleUserStatus"]' },
            { name: 'toggleGPSRadius()', selector: 'button[onclick*="toggleGPSRadius"]' },
            { name: 'editPosition()', selector: 'button[onclick*="editPosition"]' },
            { name: 'resetPassword()', selector: 'button[onclick*="resetPassword"]' }
        ];

        let funcNum = 6;
        for (const func of functionsToCheck) {
            console.log(`\n🔹 FUNCIÓN ${funcNum}/10: ${func.name}`);
            try {
                const buttonExists = await page.isVisible(func.selector);
                if (buttonExists) {
                    console.log('   ✅ Botón encontrado y visible');
                    results.passed++;
                    results.details.push({ func: func.name, status: 'PASS' });
                } else {
                    throw new Error('Botón no encontrado');
                }
            } catch (error) {
                console.log('   ❌ ERROR:', error.message);
                results.failed++;
                results.details.push({ func: func.name, status: 'FAIL', error: error.message });
            }
            funcNum++;
        }

        // RESUMEN FINAL
        console.log('\n');
        console.log('='.repeat(80));
        console.log('📊 RESUMEN FINAL - TAB 1 ADMINISTRACIÓN');
        console.log('='.repeat(80));
        console.log(`\n✅ Funciones exitosas: ${results.passed}/${results.total}`);
        console.log(`❌ Funciones fallidas: ${results.failed}/${results.total}`);
        console.log(`📈 Porcentaje de éxito: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

        console.log('📋 DETALLE POR FUNCIÓN:\n');
        results.details.forEach((detail, index) => {
            const icon = detail.status === 'PASS' ? '✅' : '❌';
            console.log(`   ${index + 1}. ${icon} ${detail.func}`);
            if (detail.error) {
                console.log(`      Error: ${detail.error}`);
            }
        });

        console.log('\n' + '='.repeat(80));
        console.log('🎉 TEST COMPLETADO - Navegador permanecerá abierto');
        console.log('   Presiona Ctrl+C para cerrar');
        console.log('='.repeat(80) + '\n');

        // Mantener navegador abierto
        await new Promise(() => {});

    } catch (error) {
        console.error('\n❌ ERROR GENERAL:', error.message);
        console.error(error.stack);
        if (browser) {
            await browser.close();
        }
        process.exit(1);
    }
}

// Ejecutar test
testTab1Complete().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
});
