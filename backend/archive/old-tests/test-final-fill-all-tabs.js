/**
 * ═══════════════════════════════════════════════════════════
 * TEST FINAL - fillAllViewUserTabs() - LLENADO DE 9 TABS
 * ═══════════════════════════════════════════════════════════
 *
 * Este test llena TODOS los campos de los 9 TABS del modal viewUser().
 * Cada tab tiene botones que abren modales secundarios para edición.
 * Los datos se guardan en la BD y se verifican.
 *
 * NAVEGADOR: VISIBLE (headless: false)
 * MODAL: viewUser() - Modal con 9 tabs (#employeeFileModal)
 */

require('dotenv').config();
const Phase4TestOrchestrator = require('./src/auditor/core/Phase4TestOrchestrator');
const database = require('./src/config/database');

async function testFinalFillAllTabs() {
    console.log('\n');
    console.log('='.repeat(80));
    console.log('🎯 TEST FINAL - fillAllViewUserTabs() - LLENADO DE 9 TABS');
    console.log('='.repeat(80));
    console.log('\n');

    const orchestrator = new Phase4TestOrchestrator(
        { baseUrl: 'http://localhost:9998', headless: false, slowMo: 500, timeout: 30000 },
        database
    );

    try {
        // PASO 1: Iniciar sistema
        console.log('📋 PASO 1/5: Iniciando sistema...');
        await orchestrator.start();
        console.log('   ✅ Sistema iniciado\n');

        // PASO 2: Login
        console.log('📋 PASO 2/5: Login...');
        await orchestrator.login('isi', 'soporte', 'admin123');
        console.log('   ✅ Login completado\n');

        // PASO 3: Obtener user_id de BD
        console.log('📋 PASO 3/5: Obteniendo usuario existente...');
        const [users] = await database.sequelize.query(`
            SELECT user_id, "firstName", "lastName"
            FROM users
            WHERE company_id = 11
            ORDER BY user_id DESC
            LIMIT 1
        `);

        if (!users || users.length === 0) {
            throw new Error('No hay usuarios en la BD para company_id=11');
        }

        const userId = users[0].user_id;
        const userName = `${users[0].firstName} ${users[0].lastName}`;
        console.log(`   ✅ Usuario: ${userName} (ID: ${userId})\n`);

        // PASO 4: Navegar a módulo users
        console.log('📋 PASO 4/5: Navegando a módulo Users...');

        // Intentar múltiples métodos para click en users
        try {
            await orchestrator.page.click('text=Usuarios');
            console.log('   ✅ Click en "Usuarios" exitoso');
        } catch {
            try {
                await orchestrator.page.click('[onclick*="users"]');
                console.log('   ✅ Click en módulo users exitoso');
            } catch {
                // Forzar con JavaScript
                await orchestrator.page.evaluate(() => {
                    const usersTab = document.querySelector('[onclick*="users"]') ||
                                   document.querySelector('[data-module="users"]') ||
                                   document.querySelector('a[href*="users"]');
                    if (usersTab) usersTab.click();
                    else if (typeof showUsersContent === 'function') showUsersContent();
                });
                console.log('   ✅ Navegación forzada con JavaScript');
            }
        }

        await orchestrator.wait(4000);

        // Verificar que estamos en users
        const usersVisible = await orchestrator.page.isVisible('#users-content, [id*="users"]').catch(() => false);
        console.log(`   📍 Contenido de users visible: ${usersVisible}`);

        if (!usersVisible) {
            console.log('   ⚠️ No se ve el contenido de users, abriendo modal directo...');
        }

        console.log('\n');

        // PASO 5: Abrir modal viewUser con 9 TABS
        console.log('📋 PASO 5/5: Abriendo modal viewUser (9 tabs) con JavaScript...');

        // Abrir modal usando viewUser() - Modal con 9 tabs
        await orchestrator.page.evaluate((uid) => {
            if (typeof viewUser === 'function') {
                viewUser(uid);
            } else if (typeof window.viewUser === 'function') {
                window.viewUser(uid);
            } else {
                console.error('❌ Función viewUser() no encontrada');
            }
        }, userId);

        console.log('   ✅ viewUser() ejecutado, esperando modal...\n');

        // ESPERAR a que el modal aparezca (hasta 10 segundos)
        try {
            await orchestrator.page.waitForSelector('#employeeFileModal', {
                state: 'visible',
                timeout: 10000
            });
            console.log('   ✅ Modal #employeeFileModal visible\n');
        } catch (error) {
            console.error('   ❌ Modal NO apareció después de 10 segundos');
            throw new Error('Modal viewUser (#employeeFileModal) NO visible después de llamar viewUser()');
        }

        // INYECTAR CSS FULLSCREEN MEJORADO
        console.log('🎨 Inyectando CSS responsive mejorado...');
        await orchestrator.page.addStyleTag({
            path: 'public/css/modal-fullscreen-responsive.css'
        });
        console.log('   ✅ CSS fullscreen aplicado\n');
        await orchestrator.wait(1000);

        // ═══════════════════════════════════════════════════════════
        // EJECUTAR fillAllViewUserTabs() - LLENADO DE 9 TABS
        // ═══════════════════════════════════════════════════════════
        console.log('🎯 EJECUTANDO fillAllViewUserTabs() - LLENADO DE 9 TABS');
        console.log('⏱️ Tiempo estimado: Variable según tabs implementados');
        console.log('👀 Observa el navegador cambiando entre tabs y llenando campos\n');

        // Ejecutar método del orchestrator
        const results = await orchestrator.fillAllViewUserTabs(userId);

        // RESULTADOS FINALES
        console.log('\n\n');
        console.log('='.repeat(80));
        console.log('✅✅✅ RESULTADOS FINALES fillAllViewUserTabs() ✅✅✅');
        console.log('='.repeat(80));
        console.log(`\n📊 RESUMEN:`);
        console.log(`   • User ID: ${results.userId}`);
        console.log(`   • Usuario: ${userName}`);
        console.log(`   • Success: ${results.success ? '✅ SÍ' : '❌ NO'}`);
        console.log(`   • Total campos: ${results.totalFields}`);
        console.log(`   • Campos llenados: ${results.filledFields}`);

        const pct = results.totalFields > 0
            ? ((results.filledFields / results.totalFields) * 100).toFixed(1)
            : '0.0';
        console.log(`   • Porcentaje: ${pct}%`);
        console.log(`   • Tabs procesados: ${results.tabsProcessed.length}/9`);
        console.log(`   • Errores: ${results.errors.length}`);

        if (results.tabsProcessed.length > 0) {
            console.log(`\n📋 DETALLE POR TAB:\n`);
            results.tabsProcessed.forEach((tab, i) => {
                const tabPct = tab.totalFields > 0
                    ? ((tab.filledFields / tab.totalFields) * 100).toFixed(1)
                    : '0.0';
                console.log(`   ${i + 1}. ${tab.name}: ${tab.filledFields}/${tab.totalFields} campos (${tabPct}%)`);
            });
        }

        if (results.errors.length > 0) {
            console.log(`\n⚠️ ERRORES (${results.errors.length}):\n`);
            results.errors.forEach((err, i) => {
                const msg = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
                console.log(`   ${i + 1}. ${msg.substring(0, 150)}`);
            });
        }

        console.log('\n' + '='.repeat(80));
        console.log('🎉 Test fillAllViewUserTabs() FINALIZADO!');
        console.log('ℹ️ El navegador permanecerá abierto - Presiona Ctrl+C para cerrar');
        console.log('='.repeat(80) + '\n');

        // Mantener navegador abierto indefinidamente
        await new Promise(() => {});

    } catch (error) {
        console.error('\n❌❌❌ ERROR EN TEST ❌❌❌');
        console.error(`Tipo: ${error.name}`);
        console.error(`Mensaje: ${error.message}`);
        if (error.stack) {
            console.error(`\nStack trace:`);
            console.error(error.stack);
        }
    } finally {
        console.log('\n🧹 Presiona Ctrl+C para cerrar el navegador...');
    }
}

// Ejecutar test
testFinalFillAllTabs();
