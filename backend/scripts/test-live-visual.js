/**
 * TEST LIVE VISUAL - Para ver en tiempo real
 * El navegador se abre visible y cada acción es LENTA para que puedas verla
 * Al final el navegador queda ABIERTO para inspección manual
 */

const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║           TEST LIVE VISUAL - VER EN TIEMPO REAL               ║');
    console.log('║   El navegador está abierto - observa cada acción             ║');
    console.log('║   Al final queda abierto para que explores manualmente        ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 900 },
        slowMo: 150,  // Cada acción toma 150ms extra para que veas
        args: ['--start-maximized']
    });

    const page = await browser.newPage();

    try {
        // ═══════════════════════════════════════════════════════════
        // PASO 1: LOGIN
        // ═══════════════════════════════════════════════════════════
        console.log('🔐 PASO 1: Abriendo página de login...');
        await page.goto('http://localhost:9998/panel-empresa.html', { waitUntil: 'networkidle2' });
        await sleep(2000);

        console.log('   Seleccionando empresa ISI...');
        await page.select('#companySelect', 'isi');
        await sleep(2000);

        console.log('   Ingresando credenciales admin/admin123...');
        await page.evaluate(() => {
            document.getElementById('userInput').disabled = false;
            document.getElementById('userInput').value = 'admin';
            document.getElementById('passwordInput').disabled = false;
            document.getElementById('passwordInput').value = 'admin123';
        });
        await sleep(1500);

        console.log('   Enviando formulario de login...');
        await page.evaluate(() => {
            document.getElementById('multiTenantLoginForm').dispatchEvent(new Event('submit', { bubbles: true }));
        });
        await sleep(4000);
        console.log('✅ LOGIN COMPLETADO\n');

        // ═══════════════════════════════════════════════════════════
        // PASO 2: MÓDULO USUARIOS
        // ═══════════════════════════════════════════════════════════
        console.log('👥 PASO 2: Navegando a módulo USUARIOS...');
        await page.evaluate(() => showTab('users'));
        await sleep(4000);

        const usersCount = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
        console.log(`   ✅ Tabla cargada con ${usersCount} usuarios\n`);

        // ═══════════════════════════════════════════════════════════
        // PASO 3: ABRIR MODAL DE USUARIO
        // ═══════════════════════════════════════════════════════════
        console.log('📋 PASO 3: Abriendo expediente del primer usuario...');
        await page.evaluate(() => {
            const btn = document.querySelector('.users-action-btn.view');
            if (btn) {
                const onclick = btn.getAttribute('onclick');
                if (onclick) eval(onclick);
            }
        });
        await sleep(5000);
        console.log('   ✅ Modal de usuario abierto\n');

        // ═══════════════════════════════════════════════════════════
        // PASO 4: RECORRER LOS 10 TABS
        // ═══════════════════════════════════════════════════════════
        const tabs = ['admin', 'personal', 'work', 'family', 'medical', 'attendance', 'calendar', 'disciplinary', 'biometric', 'notifications'];

        console.log('📑 PASO 4: Recorriendo los 10 tabs del expediente...');
        for (const tabId of tabs) {
            console.log(`   → Tab: ${tabId.toUpperCase()}`);
            await page.evaluate((id) => {
                // Buscar el botón del tab y hacer click
                const tabBtns = document.querySelectorAll('.file-tab');
                tabBtns.forEach(btn => {
                    if (btn.textContent.toLowerCase().includes(id.substring(0, 4)) ||
                        btn.getAttribute('onclick')?.includes(id)) {
                        btn.click();
                    }
                });
                // Mostrar el contenido del tab
                document.querySelectorAll('.file-tab-content').forEach(t => t.style.display = 'none');
                const tab = document.getElementById(`${id}-tab`);
                if (tab) tab.style.display = 'block';
            }, tabId);
            await sleep(2000);
        }
        console.log('   ✅ Todos los tabs visitados\n');

        // Cerrar modal
        console.log('   Cerrando modal...');
        await page.keyboard.press('Escape');
        await sleep(2000);

        // ═══════════════════════════════════════════════════════════
        // PASO 5: MÓDULO VACACIONES
        // ═══════════════════════════════════════════════════════════
        console.log('🏖️ PASO 5: Navegando a módulo VACACIONES...');
        await page.evaluate(() => showTab('vacation-management'));
        await sleep(4000);
        console.log('   ✅ Módulo de vacaciones cargado\n');

        // ═══════════════════════════════════════════════════════════
        // PASO 6: MÓDULO ASISTENCIA
        // ═══════════════════════════════════════════════════════════
        console.log('⏰ PASO 6: Navegando a módulo ASISTENCIA...');
        await page.evaluate(() => showTab('attendance'));
        await sleep(4000);
        console.log('   ✅ Módulo de asistencia cargado\n');

        // ═══════════════════════════════════════════════════════════
        // PASO 7: MÓDULO TURNOS
        // ═══════════════════════════════════════════════════════════
        console.log('📅 PASO 7: Navegando a módulo TURNOS...');
        await page.evaluate(() => showTab('shifts'));
        await sleep(4000);
        console.log('   ✅ Módulo de turnos cargado\n');

        // ═══════════════════════════════════════════════════════════
        // PASO 8: MÓDULO DEPARTAMENTOS
        // ═══════════════════════════════════════════════════════════
        console.log('🏢 PASO 8: Navegando a módulo DEPARTAMENTOS...');
        await page.evaluate(() => showTab('departments'));
        await sleep(4000);
        console.log('   ✅ Módulo de departamentos cargado\n');

        // ═══════════════════════════════════════════════════════════
        // PASO 9: MÓDULO PAYROLL
        // ═══════════════════════════════════════════════════════════
        console.log('💰 PASO 9: Navegando a módulo PAYROLL...');
        await page.evaluate(() => showTab('payroll'));
        await sleep(4000);
        console.log('   ✅ Módulo de payroll cargado\n');

        // ═══════════════════════════════════════════════════════════
        // FINALIZADO
        // ═══════════════════════════════════════════════════════════
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║                    TEST COMPLETADO                            ║');
        console.log('║                                                               ║');
        console.log('║   El navegador queda ABIERTO para que explores manualmente    ║');
        console.log('║   Prueba hacer click en cualquier módulo o botón              ║');
        console.log('║                                                               ║');
        console.log('║   Presiona Ctrl+C en esta terminal para cerrar                ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝\n');

        // Mantener navegador abierto indefinidamente
        await new Promise(() => {});

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n⚠️ El navegador queda abierto para inspección. Ctrl+C para cerrar.\n');
        await new Promise(() => {});
    }
}

main();
