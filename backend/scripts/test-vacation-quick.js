/**
 * TEST RÁPIDO - MÓDULO VACACIONES
 * Verifica que el modal de nueva solicitud funciona después del fix
 */

const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    console.log('\n🧪 TEST RÁPIDO: Módulo Vacaciones\n');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 900 },
        args: ['--window-size=1450,950']
    });

    const page = await browser.newPage();
    page.on('dialog', async d => {
        console.log(`📢 ALERT: "${d.message()}"`);
        await d.accept();
    });

    try {
        // 1. LOGIN
        console.log('🔐 Login...');
        await page.goto('http://localhost:9998/panel-empresa.html', { waitUntil: 'networkidle2' });
        await sleep(2000);
        await page.select('#companySelect', 'isi');
        await sleep(2000);
        await page.evaluate(() => {
            document.getElementById('userInput').disabled = false;
            document.getElementById('userInput').value = 'admin';
            document.getElementById('passwordInput').disabled = false;
            document.getElementById('passwordInput').value = 'admin123';
            document.getElementById('multiTenantLoginForm').dispatchEvent(new Event('submit', { bubbles: true }));
        });
        await sleep(5000);
        console.log('✅ Login OK\n');

        // 2. CARGAR MÓDULO VACACIONES
        console.log('📂 Cargando módulo vacation-management...');
        await page.evaluate(() => {
            if (window.showTab) window.showTab('vacation-management');
            else if (window.showModuleContent) window.showModuleContent('vacation-management');
        });
        await sleep(3000);

        // Verificar que cargó
        const moduleLoaded = await page.evaluate(() => {
            return !!document.querySelector('.vacation-enterprise');
        });
        console.log(`   Módulo cargado: ${moduleLoaded ? '✅' : '❌'}`);

        // 3. BUSCAR BOTÓN "NUEVA SOLICITUD"
        console.log('\n🔍 Buscando botón "Nueva Solicitud"...');
        const buttonInfo = await page.evaluate(() => {
            const buttons = document.querySelectorAll('.vacation-enterprise button, .ve-btn');
            const found = [];
            for (const btn of buttons) {
                const text = btn.textContent.trim();
                if (text.length > 0 && text.length < 50) {
                    found.push(text);
                }
            }
            return found;
        });
        console.log(`   Botones encontrados: ${buttonInfo.join(' | ')}`);

        // 4. CLICK EN BOTÓN NUEVA SOLICITUD
        console.log('\n🖱️ Clickeando "Nueva Solicitud"...');
        const clicked = await page.evaluate(() => {
            const buttons = document.querySelectorAll('.vacation-enterprise button, .ve-btn');
            for (const btn of buttons) {
                if (btn.textContent.toLowerCase().includes('nueva solicitud')) {
                    btn.click();
                    return true;
                }
            }
            return false;
        });
        console.log(`   Click realizado: ${clicked ? '✅' : '❌'}`);
        await sleep(2000);

        // 5. VERIFICAR SI MODAL ABRIÓ
        console.log('\n🔎 Verificando modal...');
        const modalInfo = await page.evaluate(() => {
            // Buscar el modal específico de vacaciones
            const overlay = document.querySelector('.ve-modal-overlay');
            const modal = document.querySelector('.ve-modal');

            if (overlay && modal) {
                const title = modal.querySelector('h3')?.textContent || 'Sin título';
                const fields = modal.querySelectorAll('input, select, textarea').length;
                return { found: true, title, fields };
            }
            return { found: false };
        });

        if (modalInfo.found) {
            console.log(`   ✅ MODAL ABIERTO`);
            console.log(`   📝 Título: ${modalInfo.title}`);
            console.log(`   📋 Campos: ${modalInfo.fields}`);
        } else {
            console.log(`   ❌ MODAL NO SE ABRIÓ`);

            // Debug: buscar cualquier modal o alert
            const anyModal = await page.evaluate(() => {
                const all = document.querySelectorAll('[class*="modal"]');
                return Array.from(all).map(m => `${m.className} - visible: ${m.offsetHeight > 0}`);
            });
            console.log(`   Debug modals: ${JSON.stringify(anyModal)}`);
        }

        // 6. SI MODAL ABRIÓ, PROBAMOS LLENAR Y GUARDAR
        if (modalInfo.found) {
            console.log('\n📝 Llenando formulario...');

            // Llenar campos
            await page.evaluate(() => {
                const form = document.querySelector('#vacation-request-form');
                if (form) {
                    const type = form.querySelector('[name="requestType"]');
                    const start = form.querySelector('[name="startDate"]');
                    const end = form.querySelector('[name="endDate"]');
                    const reason = form.querySelector('[name="reason"]');

                    if (type) type.value = 'vacation';
                    if (start) start.value = '2025-02-01';
                    if (end) end.value = '2025-02-15';
                    if (reason) reason.value = 'Test automatizado';
                }
            });
            console.log('   ✅ Campos llenados');

            // Click en enviar
            console.log('\n💾 Enviando solicitud...');
            await page.evaluate(() => {
                const submitBtn = document.querySelector('#vacation-request-form button[type="submit"]');
                if (submitBtn) submitBtn.click();
            });
            await sleep(3000);

            // Verificar resultado
            const afterSubmit = await page.evaluate(() => {
                const modal = document.querySelector('.ve-modal-overlay');
                const toast = document.querySelector('.ve-toast');
                return {
                    modalClosed: !modal,
                    hasToast: !!toast,
                    toastText: toast?.textContent || ''
                };
            });

            console.log(`   Modal cerrado: ${afterSubmit.modalClosed ? '✅' : '❌'}`);
            console.log(`   Toast: ${afterSubmit.toastText || 'ninguno'}`);
        }

        // RESUMEN
        console.log('\n' + '═'.repeat(50));
        if (modalInfo.found) {
            console.log('✅ TEST PASÓ - Modal de vacaciones funciona correctamente');
        } else {
            console.log('❌ TEST FALLÓ - Modal no se abrió');
        }
        console.log('═'.repeat(50));

        console.log('\n🖥️  Navegador abierto para inspección manual...');
        console.log('    Presiona Ctrl+C para cerrar\n');

        // Mantener abierto
        await new Promise(() => {});

    } catch (err) {
        console.error('❌ ERROR:', err);
    }
}

main();
