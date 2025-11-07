/**
 * TEST MANUAL INTERACTIVO - MODAL USUARIOS
 *
 * Este script abre el navegador, hace login, abre el modal VER
 * y espera a que navegues manualmente por cada tab verificando
 * que TODO funcione correctamente.
 *
 * El navegador NO se cerrará automáticamente para que puedas
 * probar cada botón, campo, y funcionalidad CRUD.
 */

require('dotenv').config();
const { chromium } = require('playwright');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => {
        rl.question(question, answer => {
            resolve(answer);
        });
    });
}

async function testManualInteractive() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  TEST MANUAL INTERACTIVO - VERIFICACIÓN COMPLETA TABS   ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    let browser = null;
    let page = null;

    try {
        console.log('🚀 Iniciando navegador Chromium VISIBLE...\n');
        browser = await chromium.launch({
            headless: false,
            slowMo: 50,
            args: ['--start-maximized']
        });

        const context = await browser.newContext({
            viewport: null
        });
        page = await context.newPage();

        // LOGIN
        console.log('🌐 Navegando a panel-empresa.html...');
        await page.goto('http://localhost:9999/panel-empresa.html', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        await page.waitForTimeout(2000);

        console.log('🔐 Realizando login automático...');
        await page.selectOption('#companySelect', 'isi');
        await page.waitForTimeout(1500);

        const usernameInput = page.locator('input[type="text"]:visible').last();
        await usernameInput.fill('soporte');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);

        const passwordInput = page.locator('input[type="password"]:visible').last();
        await passwordInput.fill('admin123');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);
        console.log('   ✅ Login completado\n');

        // ABRIR MÓDULO USUARIOS
        console.log('📊 Abriendo módulo Usuarios...');
        await page.locator(`[onclick*="showTab('users'"]`).first().click();
        await page.waitForTimeout(3000);
        console.log('   ✅ Módulo usuarios abierto\n');

        // ABRIR MODAL VER
        console.log('🔍 Clickeando botón VER del primer usuario...');
        await page.waitForSelector('table tbody tr', { timeout: 15000 });
        const verButton = page.locator('table tbody tr:first-child button.btn-info').first();
        await verButton.click();
        await page.waitForTimeout(3000);
        console.log('   ✅ Modal VER abierto\n');

        await page.waitForSelector('#employeeFileModal', { state: 'visible', timeout: 10000 });

        // OBTENER NOMBRES DE TABS
        const tabs = await page.locator('#employeeFileModal .file-tab').all();
        const tabNames = [];
        for (const tab of tabs) {
            const name = (await tab.textContent()).trim();
            tabNames.push(name);
        }

        console.log('═'.repeat(80));
        console.log('  VERIFICACIÓN MANUAL - INSTRUCCIONES');
        console.log('═'.repeat(80));
        console.log('\n🎯 Ahora vas a verificar MANUALMENTE cada tab del modal.\n');
        console.log('   El navegador está ABIERTO y el modal VER está visible.');
        console.log('   Voy a pedirte que verifiques cada tab paso a paso.\n');
        console.log(`   📋 Total de tabs encontrados: ${tabNames.length}`);
        console.log('');
        tabNames.forEach((name, i) => {
            console.log(`      ${i + 1}. ${name}`);
        });
        console.log('');
        console.log('═'.repeat(80));
        console.log('');

        const results = [];

        // VERIFICAR CADA TAB
        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            const tabName = tabNames[i];

            console.log(`\n${'─'.repeat(80)}`);
            console.log(`  TAB ${i + 1}/${tabs.length}: ${tabName}`);
            console.log(`${'─'.repeat(80)}\n`);

            // Click en el tab
            console.log(`🖱️  Haciendo click en tab "${tabName}"...`);
            await tab.click();
            await page.waitForTimeout(1000);

            // Pedir al usuario que verifique
            console.log(`\n👁️  MIRA EL NAVEGADOR AHORA y verifica:\n`);

            if (i === 0) {
                console.log('   ✓ ¿Se ven los 10 botones de administración?');
                console.log('   ✓ ¿Está el botón "Cambiar Rol"?');
                console.log('   ✓ ¿Está el botón "Resetear Contraseña"?');
                console.log('   ✓ ¿Se muestra el estado activo/inactivo?');
                console.log('   ✓ ¿Se ve la configuración GPS?');
            } else if (i === 1) {
                console.log('   ✓ ¿Se ven los datos básicos (nombre, DNI, email, teléfono)?');
                console.log('   ✓ ¿Está la sección de Obra Social/Prepaga?');
                console.log('   ✓ ¿Está la sección de Formación Académica?');
                console.log('   ✓ ¿Está la sección de Documentación Personal (DNI, Pasaporte)?');
                console.log('   ✓ ¿Está la sección de Licencias de Conducción?');
                console.log('   ✓ ¿Está el scoring del empleado en la columna derecha?');
            } else if (i === 2) {
                console.log('   ✓ ¿Se ve Posición Actual (cargo, departamento, salario)?');
                console.log('   ✓ ¿Está la sección "Juicios y Mediaciones"?');
                console.log('   ✓ ¿Está la sección "Afiliación Gremial"?');
                console.log('   ✓ ¿Está la sección "Tareas y Categorías Asignadas"?');
                console.log('   ✓ ¿Está la sección "Historial de Posiciones"?');
            } else if (i === 3) {
                console.log('   ✓ ¿Se ve "Estado Civil y Cónyuge"?');
                console.log('   ✓ ¿Está la sección de Hijos con botón "+ Agregar Hijo"?');
                console.log('   ✓ ¿Está la sección "Otros Miembros del Grupo Familiar"?');
            } else if (i === 4) {
                console.log('   ✓ ¿Se ve "Médico de Cabecera"?');
                console.log('   ✓ ¿Está "Contacto de Emergencia Médica"?');
                console.log('   ✓ ¿Están las secciones de Enfermedades Crónicas y Medicación?');
                console.log('   ✓ ¿Está la sección de Alergias?');
                console.log('   ✓ ¿Está la sección de Restricciones Laborales?');
                console.log('   ✓ ¿Está la sección de Salud Mental?');
                console.log('   ✓ ¿Está el Calendario de Vacunación?');
                console.log('   ✓ ¿Está la Historia Clínica Digital?');
            } else if (i === 5) {
                console.log('   ✓ ¿Se ven las 3 cards de resumen (Días Trabajados, Ausencias, Permisos)?');
                console.log('   ✓ ¿Está la tabla de Registro de Asistencias?');
                console.log('   ✓ ¿Están los botones "Actualizar" y "+ Permiso"?');
            } else if (i === 6) {
                console.log('   ✓ ¿Se ve el Resumen Disciplinario (Amonestaciones, Apercibimientos, Suspensiones)?');
                console.log('   ✓ ¿Está el botón "+ Acción Disciplinaria"?');
                console.log('   ✓ ¿Se muestra el historial disciplinario?');
            } else if (i === 7) {
                console.log('   ✓ ¿Se ven las Tareas Disponibles en la Empresa?');
                console.log('   ✓ ¿Está la sección "Tareas Asignadas al Empleado"?');
                console.log('   ✓ ¿Está la "Información Salarial por Tarea"?');
                console.log('   ✓ ¿Está el "Historial de Asignaciones de Tareas"?');
            } else if (i === 8) {
                console.log('   ✓ ¿Se ve "Captura de Template Biométrico"?');
                console.log('   ✓ ¿Está el botón "Capturar Foto Biométrica"?');
                console.log('   ✓ ¿Se muestra la información del proceso?');
                console.log('   ✓ ¿Está la sección "Estado del Registro Biométrico"?');
            }

            const answer = await ask(`\n✅ ¿El tab "${tabName}" se muestra correctamente? (s/n): `);

            const result = {
                number: i + 1,
                name: tabName,
                visible: answer.toLowerCase() === 's',
                notes: ''
            };

            if (answer.toLowerCase() !== 's') {
                const notes = await ask('❌ ¿Qué está fallando?: ');
                result.notes = notes;
            } else {
                // Pedir que verifique botones si el tab se ve bien
                const buttonsAnswer = await ask(`🔘 ¿Todos los botones se ven y responden? (s/n): `);
                if (buttonsAnswer.toLowerCase() !== 's') {
                    const buttonNotes = await ask('¿Qué botones fallan?: ');
                    result.notes = `Botones: ${buttonNotes}`;
                }
            }

            results.push(result);

            // Screenshot
            const screenshotName = `manual-tab-${String(i + 1).padStart(2, '0')}-${tabName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
            await page.screenshot({ path: screenshotName, fullPage: true });
            console.log(`   📸 Screenshot guardado: ${screenshotName}`);
        }

        // RESUMEN FINAL
        console.log('\n\n');
        console.log('╔' + '═'.repeat(118) + '╗');
        console.log('║' + '  RESUMEN FINAL - VERIFICACIÓN MANUAL'.padEnd(118) + '║');
        console.log('╠' + '═'.repeat(118) + '╣');
        console.log('║  TAB  │ Nombre' + ' '.repeat(40) + '│ Estado │ Notas' + ' '.repeat(40) + '║');
        console.log('╠' + '─'.repeat(118) + '╣');

        results.forEach(result => {
            const num = String(result.number).padStart(2);
            const name = result.name.padEnd(45).substring(0, 45);
            const status = result.visible ? '✅ OK   ' : '❌ FALLA';
            const notes = result.notes.padEnd(45).substring(0, 45);

            console.log(`║  ${num}   │ ${name} │ ${status} │ ${notes} ║`);
        });

        console.log('╚' + '═'.repeat(118) + '╝');

        const totalOk = results.filter(r => r.visible).length;
        const totalFail = results.filter(r => !r.visible).length;

        console.log(`\n📊 RESULTADOS:`);
        console.log(`   ✅ Tabs OK: ${totalOk}/${results.length}`);
        console.log(`   ❌ Tabs con problemas: ${totalFail}/${results.length}`);
        console.log(`   📈 Success Rate: ${((totalOk / results.length) * 100).toFixed(1)}%\n`);

        if (totalFail === 0) {
            console.log('🎉 ¡PERFECTO! TODOS LOS TABS FUNCIONAN CORRECTAMENTE');
        } else {
            console.log('⚠️  Algunos tabs necesitan corrección. Revisa las notas arriba.');
        }

        console.log('\n🔧 AHORA puedes hacer pruebas adicionales:');
        console.log('   • Haz click en botones para ver si abren modals');
        console.log('   • Intenta agregar/editar/eliminar registros');
        console.log('   • Verifica que los datos se persistan');
        console.log('   • Prueba las validaciones de formularios\n');

        await ask('Presiona ENTER cuando termines de probar todo...');

    } catch (error) {
        console.error('\n❌ ERROR:');
        console.error(error.message);

        if (page) {
            await page.screenshot({ path: 'manual-test-error.png', fullPage: true });
            console.log('   💾 Screenshot guardado: manual-test-error.png');
        }
    } finally {
        rl.close();

        if (browser) {
            console.log('\n👋 Cerrando navegador...');
            await browser.close();
        }
    }
}

testManualInteractive();
