/**
 * TEST ESPECÍFICO: Modal de Usuario
 * Verifica que el modal de usuario abra correctamente y muestre los 10 tabs
 */

const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    console.log('\n🔍 TEST: Modal de Usuario\n');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 900 },
        slowMo: 50
    });

    const page = await browser.newPage();

    // Capturar logs de consola
    page.on('console', msg => {
        if (msg.text().includes('viewUser') || msg.text().includes('modal') || msg.text().includes('USERS')) {
            console.log(`[CONSOLE] ${msg.text()}`);
        }
    });

    try {
        // Login
        console.log('1️⃣ Login...');
        await page.goto('http://localhost:9998/panel-empresa.html', { waitUntil: 'networkidle2' });
        await page.select('#companySelect', 'isi');
        await sleep(1500);
        await page.evaluate(() => {
            document.getElementById('userInput').disabled = false;
            document.getElementById('userInput').value = 'admin';
            document.getElementById('passwordInput').disabled = false;
            document.getElementById('passwordInput').value = 'admin123';
            document.getElementById('multiTenantLoginForm').dispatchEvent(new Event('submit', { bubbles: true }));
        });
        await sleep(3000);
        console.log('✅ Login OK');

        // Navegar a usuarios
        console.log('\n2️⃣ Navegando a Usuarios...');
        await page.evaluate(() => showTab('users'));
        await sleep(3000);

        // Verificar tabla cargada
        const usersCount = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
        console.log(`✅ Tabla cargada: ${usersCount} usuarios`);

        // Obtener el ID del primer usuario
        console.log('\n3️⃣ Buscando primer usuario...');
        const firstUserId = await page.evaluate(() => {
            const btn = document.querySelector('.users-action-btn.view');
            if (!btn) return null;
            const onclick = btn.getAttribute('onclick');
            const match = onclick.match(/viewUser\('([^']+)'\)/);
            return match ? match[1] : null;
        });

        if (!firstUserId) {
            console.log('❌ No se encontró ID de usuario');
            await browser.close();
            return;
        }
        console.log(`✅ ID del primer usuario: ${firstUserId}`);

        // Llamar viewUser directamente
        console.log('\n4️⃣ Ejecutando viewUser()...');
        await page.evaluate((userId) => {
            console.log('[TEST] Llamando viewUser con ID:', userId);
            if (typeof viewUser === 'function') {
                viewUser(userId);
            } else {
                console.error('[TEST] viewUser no está definida');
            }
        }, firstUserId);

        // Esperar a que cargue
        console.log('   Esperando respuesta del servidor...');
        await sleep(5000);

        // Verificar modal
        console.log('\n5️⃣ Verificando modal...');
        const modalStatus = await page.evaluate(() => {
            const modal = document.getElementById('editUserModal');
            if (!modal) return { exists: false };

            return {
                exists: true,
                display: modal.style.display,
                visibility: modal.style.visibility,
                hasClass: modal.classList.contains('show'),
                childCount: modal.children.length,
                innerHTML: modal.innerHTML.substring(0, 200)
            };
        });

        console.log('Modal status:', modalStatus);

        if (modalStatus.exists && modalStatus.display !== 'none') {
            console.log('\n✅ MODAL ABIERTO CORRECTAMENTE');

            // Verificar tabs
            const tabs = await page.evaluate(() => {
                const tabContents = document.querySelectorAll('.file-tab-content');
                return Array.from(tabContents).map(t => ({
                    id: t.id,
                    visible: t.style.display !== 'none'
                }));
            });

            console.log(`\n📋 TABS encontrados: ${tabs.length}`);
            tabs.forEach(t => console.log(`   ${t.visible ? '✅' : '⬜'} ${t.id}`));
        } else {
            console.log('\n❌ Modal NO visible');
            console.log('   Posibles causas:');
            console.log('   - Error en fetch del usuario');
            console.log('   - Token de auth no válido');
            console.log('   - Error en la función viewUser');

            // Capturar screenshot
            await page.screenshot({ path: 'test-screenshots/modal-debug.png' });
            console.log('   📸 Screenshot guardado: modal-debug.png');
        }

        console.log('\n🖥️ Navegador abierto para inspección manual. Ctrl+C para cerrar.\n');
        await new Promise(() => {});

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
    }
}

main();
