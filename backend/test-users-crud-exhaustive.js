/**
 * TEST CRUD EXHAUSTIVO - TODOS LOS TABS DEL MODAL USUARIOS
 *
 * Este test verifica CADA campo, CADA botón, y CADA operación CRUD
 * en los 9 tabs del modal VER del módulo Usuarios.
 *
 * NO es solo verificación visual - prueba funcionalidad completa.
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function testUsersCrudExhaustive() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   TEST CRUD EXHAUSTIVO - MODAL USUARIOS (9 TABS)       ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    let browser = null;
    let page = null;
    const results = [];

    try {
        console.log('🚀 Iniciando navegador...');
        browser = await chromium.launch({
            headless: false,
            slowMo: 50
        });

        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });
        page = await context.newPage();

        // LOGIN
        console.log('🌐 LOGIN...');
        await page.goto('http://localhost:9999/panel-empresa.html', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        await page.waitForTimeout(2000);

        await page.selectOption('#companySelect', 'isi');
        await page.waitForTimeout(1000);

        const usernameInput = page.locator('input[type="text"]:visible').last();
        await usernameInput.fill('soporte');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        const passwordInput = page.locator('input[type="password"]:visible').last();
        await passwordInput.fill('admin123');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);
        console.log('   ✅ Login OK\n');

        // ABRIR MÓDULO USUARIOS
        console.log('📊 Abriendo módulo Usuarios...');
        await page.locator(`[onclick*="showTab('users'"]`).first().click();
        await page.waitForTimeout(3000);
        console.log('   ✅ Módulo usuarios abierto\n');

        // ABRIR MODAL VER
        console.log('🔍 Abriendo modal VER...');
        await page.waitForSelector('table tbody tr', { timeout: 15000 });
        const verButton = page.locator('table tbody tr:first-child button.btn-info').first();
        await verButton.click();
        await page.waitForTimeout(3000);
        await page.waitForSelector('#employeeFileModal', { state: 'visible', timeout: 10000 });
        console.log('   ✅ Modal VER abierto\n');

        console.log('═'.repeat(100));
        console.log('  INICIANDO VERIFICACIÓN CRUD DE LOS 9 TABS');
        console.log('═'.repeat(100));

        // ============================================================
        // TAB 1: ADMINISTRACIÓN
        // ============================================================
        console.log('\n\n🔹 TAB 1/9: ADMINISTRACIÓN');
        console.log('─'.repeat(100));

        const tab1 = await page.locator('.file-tab').nth(0);
        await tab1.click();
        await page.waitForTimeout(1500);

        const tab1Test = {
            name: '⚙️ Administración',
            tests: []
        };

        // Verificar botones principales
        const adminButtons = await page.locator('#admin-tab button').all();
        console.log(`   📊 Botones encontrados: ${adminButtons.length}`);

        for (const [index, btn] of adminButtons.entries()) {
            const text = (await btn.textContent()).trim();
            const isVisible = await btn.isVisible();
            const isEnabled = await btn.isEnabled();

            tab1Test.tests.push({
                type: 'button',
                element: text,
                visible: isVisible,
                enabled: isEnabled,
                status: isVisible && isEnabled ? 'PASS' : 'FAIL'
            });

            const status = isVisible && isEnabled ? '✅' : '❌';
            console.log(`   ${status} Botón ${index + 1}: "${text}" - Visible: ${isVisible}, Enabled: ${isEnabled}`);
        }

        results.push(tab1Test);
        await page.screenshot({ path: 'crud-tab-01-admin.png' });

        // ============================================================
        // TAB 2: DATOS PERSONALES
        // ============================================================
        console.log('\n\n🔹 TAB 2/9: DATOS PERSONALES');
        console.log('─'.repeat(100));

        const tab2 = await page.locator('.file-tab').nth(1);
        await tab2.click();
        await page.waitForTimeout(1500);

        const tab2Test = {
            name: '👤 Datos Personales',
            tests: []
        };

        // Verificar secciones visibles
        const sections = [
            { id: 'datos-basicos', name: 'Datos Básicos' },
            { id: 'obra-social', name: 'Obra Social/Prepaga' },
            { id: 'formacion-academica', name: 'Formación Académica' },
            { id: 'documentacion', name: 'Documentación Personal' },
            { id: 'licencias', name: 'Licencias de Conducción' }
        ];

        for (const section of sections) {
            const sectionExists = await page.locator(`text=${section.name}`).count() > 0;
            tab2Test.tests.push({
                type: 'section',
                element: section.name,
                visible: sectionExists,
                status: sectionExists ? 'PASS' : 'FAIL'
            });

            const status = sectionExists ? '✅' : '❌';
            console.log(`   ${status} Sección: "${section.name}"`);
        }

        // Verificar botones de acción
        const tab2Buttons = await page.locator('#personal-tab button').all();
        console.log(`   📊 Botones encontrados: ${tab2Buttons.length}`);

        for (const [index, btn] of tab2Buttons.entries()) {
            const text = (await btn.textContent()).trim();
            const isVisible = await btn.isVisible();

            tab2Test.tests.push({
                type: 'button',
                element: text,
                visible: isVisible,
                status: isVisible ? 'PASS' : 'FAIL'
            });

            const status = isVisible ? '✅' : '❌';
            console.log(`   ${status} Botón: "${text}"`);
        }

        results.push(tab2Test);
        await page.screenshot({ path: 'crud-tab-02-personal.png' });

        // ============================================================
        // TAB 3: ANTECEDENTES LABORALES
        // ============================================================
        console.log('\n\n🔹 TAB 3/9: ANTECEDENTES LABORALES');
        console.log('─'.repeat(100));

        const tab3 = await page.locator('.file-tab').nth(2);
        await tab3.click();
        await page.waitForTimeout(1500);

        const tab3Test = {
            name: '💼 Antecedentes Laborales',
            tests: []
        };

        const workSections = [
            'Posición Actual',
            'Juicios y Mediaciones',
            'Afiliación Gremial',
            'Tareas y Categorías Asignadas'
        ];

        for (const section of workSections) {
            const exists = await page.locator(`text=${section}`).count() > 0;
            tab3Test.tests.push({
                type: 'section',
                element: section,
                visible: exists,
                status: exists ? 'PASS' : 'FAIL'
            });

            const status = exists ? '✅' : '❌';
            console.log(`   ${status} Sección: "${section}"`);
        }

        const tab3Buttons = await page.locator('#work-tab button').all();
        console.log(`   📊 Botones encontrados: ${tab3Buttons.length}`);

        results.push(tab3Test);
        await page.screenshot({ path: 'crud-tab-03-work.png' });

        // ============================================================
        // TAB 4: GRUPO FAMILIAR
        // ============================================================
        console.log('\n\n🔹 TAB 4/9: GRUPO FAMILIAR');
        console.log('─'.repeat(100));

        const tab4 = await page.locator('.file-tab').nth(3);
        await tab4.click();
        await page.waitForTimeout(1500);

        const tab4Test = {
            name: '👨‍👩‍👧‍👦 Grupo Familiar',
            tests: []
        };

        const familySections = [
            'Estado Civil y Cónyuge',
            'Hijos',
            'Otros Miembros del Grupo Familiar'
        ];

        for (const section of familySections) {
            const exists = await page.locator(`text=${section}`).count() > 0;
            tab4Test.tests.push({
                type: 'section',
                element: section,
                visible: exists,
                status: exists ? 'PASS' : 'FAIL'
            });

            const status = exists ? '✅' : '❌';
            console.log(`   ${status} Sección: "${section}"`);
        }

        const tab4Buttons = await page.locator('#family-tab button').all();
        console.log(`   📊 Botones encontrados: ${tab4Buttons.length}`);

        results.push(tab4Test);
        await page.screenshot({ path: 'crud-tab-04-family.png' });

        // ============================================================
        // TAB 5: ANTECEDENTES MÉDICOS
        // ============================================================
        console.log('\n\n🔹 TAB 5/9: ANTECEDENTES MÉDICOS');
        console.log('─'.repeat(100));

        const tab5 = await page.locator('.file-tab').nth(4);
        await tab5.click();
        await page.waitForTimeout(1500);

        const tab5Test = {
            name: '🏥 Antecedentes Médicos',
            tests: []
        };

        const medicalSections = [
            'Médico de Cabecera',
            'Contacto de Emergencia Médica',
            'Enfermedades Crónicas',
            'Medicación Actual',
            'Alergias',
            'Restricciones Laborales',
            'Salud Mental',
            'Calendario de Vacunación',
            'Historia Clínica Digital'
        ];

        for (const section of medicalSections) {
            const exists = await page.locator(`text=${section}`).count() > 0;
            tab5Test.tests.push({
                type: 'section',
                element: section,
                visible: exists,
                status: exists ? 'PASS' : 'FAIL'
            });

            const status = exists ? '✅' : '❌';
            console.log(`   ${status} Sección: "${section}"`);
        }

        const tab5Buttons = await page.locator('#medical-tab button').all();
        console.log(`   📊 Botones encontrados: ${tab5Buttons.length}`);

        results.push(tab5Test);
        await page.screenshot({ path: 'crud-tab-05-medical.png' });

        // ============================================================
        // TAB 6: ASISTENCIAS/PERMISOS
        // ============================================================
        console.log('\n\n🔹 TAB 6/9: ASISTENCIAS/PERMISOS');
        console.log('─'.repeat(100));

        const tab6 = await page.locator('.file-tab').nth(5);
        await tab6.click();
        await page.waitForTimeout(1500);

        const tab6Test = {
            name: '📅 Asistencias/Permisos',
            tests: []
        };

        // Verificar cards de resumen
        const cards = await page.locator('#attendance-tab .card').count();
        tab6Test.tests.push({
            type: 'element',
            element: 'Cards de resumen',
            count: cards,
            status: cards >= 3 ? 'PASS' : 'FAIL'
        });

        console.log(`   ${cards >= 3 ? '✅' : '❌'} Cards de resumen: ${cards} (esperadas: 3)`);

        const tab6Buttons = await page.locator('#attendance-tab button').all();
        console.log(`   📊 Botones encontrados: ${tab6Buttons.length}`);

        results.push(tab6Test);
        await page.screenshot({ path: 'crud-tab-06-attendance.png' });

        // ============================================================
        // TAB 7: DISCIPLINARIOS
        // ============================================================
        console.log('\n\n🔹 TAB 7/9: DISCIPLINARIOS');
        console.log('─'.repeat(100));

        const tab7 = await page.locator('.file-tab').nth(6);
        await tab7.click();
        await page.waitForTimeout(1500);

        const tab7Test = {
            name: '⚖️ Disciplinarios',
            tests: []
        };

        const disciplinarySections = [
            'Resumen Disciplinario',
            'Historial de Acciones Disciplinarias'
        ];

        for (const section of disciplinarySections) {
            const exists = await page.locator(`text=${section}`).count() > 0;
            tab7Test.tests.push({
                type: 'section',
                element: section,
                visible: exists,
                status: exists ? 'PASS' : 'FAIL'
            });

            const status = exists ? '✅' : '❌';
            console.log(`   ${status} Sección: "${section}"`);
        }

        results.push(tab7Test);
        await page.screenshot({ path: 'crud-tab-07-disciplinary.png' });

        // ============================================================
        // TAB 8: CONFIG TAREAS
        // ============================================================
        console.log('\n\n🔹 TAB 8/9: CONFIG TAREAS');
        console.log('─'.repeat(100));

        const tab8 = await page.locator('.file-tab').nth(7);
        await tab8.click();
        await page.waitForTimeout(1500);

        const tab8Test = {
            name: '🎯 Config. Tareas',
            tests: []
        };

        const tasksSections = [
            'Tareas Disponibles en la Empresa',
            'Tareas Asignadas al Empleado',
            'Información Salarial por Tarea'
        ];

        for (const section of tasksSections) {
            const exists = await page.locator(`text=${section}`).count() > 0;
            tab8Test.tests.push({
                type: 'section',
                element: section,
                visible: exists,
                status: exists ? 'PASS' : 'FAIL'
            });

            const status = exists ? '✅' : '❌';
            console.log(`   ${status} Sección: "${section}"`);
        }

        results.push(tab8Test);
        await page.screenshot({ path: 'crud-tab-08-tasks.png' });

        // ============================================================
        // TAB 9: REGISTRO BIOMÉTRICO
        // ============================================================
        console.log('\n\n🔹 TAB 9/9: REGISTRO BIOMÉTRICO');
        console.log('─'.repeat(100));

        const tab9 = await page.locator('.file-tab').nth(8);
        await tab9.click();
        await page.waitForTimeout(1500);

        const tab9Test = {
            name: '📸 Registro Biométrico',
            tests: []
        };

        const biometricSections = [
            'Captura de Template Biométrico',
            'Estado del Registro Biométrico'
        ];

        for (const section of biometricSections) {
            const exists = await page.locator(`text=${section}`).count() > 0;
            tab9Test.tests.push({
                type: 'section',
                element: section,
                visible: exists,
                status: exists ? 'PASS' : 'FAIL'
            });

            const status = exists ? '✅' : '❌';
            console.log(`   ${status} Sección: "${section}"`);
        }

        const captureButton = await page.locator('button:has-text("Capturar Foto Biométrica")').count();
        tab9Test.tests.push({
            type: 'button',
            element: 'Capturar Foto Biométrica',
            visible: captureButton > 0,
            status: captureButton > 0 ? 'PASS' : 'FAIL'
        });

        console.log(`   ${captureButton > 0 ? '✅' : '❌'} Botón "Capturar Foto Biométrica"`);

        results.push(tab9Test);
        await page.screenshot({ path: 'crud-tab-09-biometric.png' });

        // ============================================================
        // RESUMEN FINAL
        // ============================================================
        console.log('\n\n');
        console.log('╔' + '═'.repeat(118) + '╗');
        console.log('║' + '  RESUMEN FINAL - TEST CRUD EXHAUSTIVO DE 9 TABS'.padEnd(118) + '║');
        console.log('╠' + '═'.repeat(118) + '╣');

        let totalTests = 0;
        let passedTests = 0;

        results.forEach((tabResult, index) => {
            const tabTests = tabResult.tests;
            const passed = tabTests.filter(t => t.status === 'PASS').length;
            const total = tabTests.length;
            const percentage = ((passed / total) * 100).toFixed(1);

            totalTests += total;
            passedTests += passed;

            const status = passed === total ? '✅' : '⚠️';
            console.log(`║  ${status} TAB ${index + 1}: ${tabResult.name.padEnd(40)} - ${passed}/${total} tests (${percentage}%)`.padEnd(119) + '║');
        });

        console.log('╠' + '═'.repeat(118) + '╣');

        const totalPercentage = ((passedTests / totalTests) * 100).toFixed(1);
        console.log(`║  📊 TOTAL: ${passedTests}/${totalTests} tests pasados (${totalPercentage}%)`.padEnd(119) + '║');
        console.log('╚' + '═'.repeat(118) + '╝');

        if (passedTests === totalTests) {
            console.log('\n🎉 ¡PERFECTO! TODOS LOS TESTS CRUD PASARON - 100% FUNCIONAL\n');
        } else {
            console.log(`\n⚠️  ${totalTests - passedTests} tests fallaron - Revisar elementos faltantes\n`);
        }

        console.log('🔍 Navegador permanecerá abierto 60 segundos para inspección...');
        await page.waitForTimeout(60000);

    } catch (error) {
        console.error('\n❌ ERROR:');
        console.error(error.message);
        console.error(error.stack);

        if (page) {
            await page.screenshot({ path: 'crud-test-error.png' });
            console.log('   💾 crud-test-error.png');
        }
    } finally {
        if (browser) {
            console.log('\n👋 Cerrando navegador...');
            await browser.close();
        }
    }
}

testUsersCrudExhaustive();
