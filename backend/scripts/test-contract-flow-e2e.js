/**
 * TEST E2E: Flujo completo de Contrato EULA
 * Genera → Envia → Firma
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:9998';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function clickButtonByText(page, text) {
    return await page.evaluate((searchText) => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
            if (btn.textContent && btn.textContent.includes(searchText)) {
                btn.click();
                return true;
            }
        }
        return false;
    }, text);
}

async function listAllButtons(page) {
    return await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        return Array.from(buttons)
            .map(b => b.textContent?.trim().substring(0, 50))
            .filter(t => t);
    });
}

async function runTest() {
    console.log('🚀 Iniciando test E2E de Contrato EULA...\n');

    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 50,
        args: ['--window-size=1400,900']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    // Manejar dialogs (confirm/alert)
    page.on('dialog', async dialog => {
        console.log('   📢 Dialog:', dialog.message());
        await dialog.accept();
    });

    try {
        // ═══════════════════════════════════════════════════════════
        // PASO 1: Login como staff via API
        // ═══════════════════════════════════════════════════════════
        console.log('📝 PASO 1: Login como staff...');

        // Primero navegar al sitio
        await page.goto(`${BASE_URL}/panel-administrativo.html`, { waitUntil: 'networkidle2' });
        await sleep(1000);

        // Hacer login via API para obtener token
        const loginResp = await page.evaluate(async (baseUrl) => {
            try {
                const resp = await fetch(baseUrl + '/api/aponnt/staff/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: 'admin@aponnt.com', password: 'admin123' })
                });
                return resp.json();
            } catch (e) {
                return { error: e.message };
            }
        }, BASE_URL);

        if (loginResp.token) {
            await page.evaluate((token) => {
                localStorage.setItem('aponnt_token_staff', token);
            }, loginResp.token);
            console.log('   ✅ Token obtenido y guardado');
        } else {
            console.log('   ⚠️ Login fallido:', JSON.stringify(loginResp));
        }

        // ═══════════════════════════════════════════════════════════
        // PASO 2: Ir a panel-administrativo
        // ═══════════════════════════════════════════════════════════
        console.log('\n📋 PASO 2: Navegando a Panel Administrativo...');
        await page.goto(`${BASE_URL}/panel-administrativo.html`, { waitUntil: 'networkidle2' });
        await sleep(3000);

        await page.screenshot({ path: 'test-contract-1-panel.png', fullPage: true });
        console.log('   📸 Screenshot: test-contract-1-panel.png');

        // ═══════════════════════════════════════════════════════════
        // PASO 3: Navegar a tab CRM o Presupuestos
        // ═══════════════════════════════════════════════════════════
        console.log('\n📋 PASO 3: Buscando tab de Presupuestos/CRM...');

        // Buscar y hacer click en tab de Presupuestos
        const foundQuotes = await page.evaluate(() => {
            // Buscar en sidebar o navigation
            const selectors = '.nav-link, .menu-item, a, .tab-btn, [data-tab], .sidebar-link, li a';
            const items = document.querySelectorAll(selectors);

            for (const item of items) {
                const text = item.textContent || '';
                const style = window.getComputedStyle(item);
                const isVisible = style.display !== 'none' && style.visibility !== 'hidden';

                if (isVisible && (text.includes('Presupuesto') || text.includes('CRM') || text.includes('Quotes'))) {
                    console.log('Click en:', text.trim().substring(0, 30));
                    item.click();
                    return true;
                }
            }
            return false;
        });

        if (foundQuotes) {
            console.log('   ✅ Tab de Presupuestos encontrado y clickeado');
            await sleep(3000);
        } else {
            console.log('   ⚠️ Tab de Presupuestos NO encontrado');
            // Intentar navegar directamente usando la URL o función del panel
            await page.evaluate(() => {
                // Buscar en el sidebar la sección CRM
                if (typeof loadTab === 'function') {
                    loadTab('quotes');
                } else if (typeof QuotesManagement !== 'undefined') {
                    QuotesManagement.init();
                }
            });
            await sleep(2000);
        }

        await sleep(2000);
        await page.screenshot({ path: 'test-contract-2-quotes.png', fullPage: true });
        console.log('   📸 Screenshot: test-contract-2-quotes.png');

        // ═══════════════════════════════════════════════════════════
        // PASO 4: Buscar y hacer click en "Generar Contrato"
        // ═══════════════════════════════════════════════════════════
        console.log('\n📝 PASO 4: Buscando botón "Generar Contrato"...');
        await sleep(1000);

        const generateClicked = await clickButtonByText(page, 'Generar Contrato');

        if (generateClicked) {
            console.log('   ✅ Botón "Generar Contrato" clickeado');
            await sleep(2500);
        } else {
            console.log('   ⚠️ Botón "Generar Contrato" NO encontrado');

            // Debug: listar todos los botones
            const allBtns = await listAllButtons(page);
            console.log('   Botones visibles:', allBtns.slice(0, 10));
        }

        await page.screenshot({ path: 'test-contract-3-after-generate.png', fullPage: true });

        // ═══════════════════════════════════════════════════════════
        // PASO 5: Buscar y hacer click en "Enviar Contrato"
        // ═══════════════════════════════════════════════════════════
        console.log('\n📨 PASO 5: Buscando botón "Enviar Contrato"...');
        await sleep(1000);

        const sendClicked = await clickButtonByText(page, 'Enviar Contrato');

        if (sendClicked) {
            console.log('   ✅ Botón "Enviar Contrato" clickeado');
            await sleep(2500);
        } else {
            console.log('   ⚠️ Botón "Enviar Contrato" NO encontrado');
        }

        await page.screenshot({ path: 'test-contract-4-after-send.png', fullPage: true });

        // ═══════════════════════════════════════════════════════════
        // PASO 6: Buscar y hacer click en "Registrar Firma"
        // ═══════════════════════════════════════════════════════════
        console.log('\n✍️ PASO 6: Buscando botón "Registrar Firma"...');
        await sleep(1000);

        const signClicked = await clickButtonByText(page, 'Registrar Firma');

        if (signClicked) {
            console.log('   ✅ Botón "Registrar Firma" clickeado');
            await sleep(1500);

            // Llenar modal
            await page.waitForSelector('#contract-signer-name', { timeout: 3000 }).catch(() => null);

            // Llenar campos usando evaluate
            await page.evaluate(() => {
                const nameInput = document.getElementById('contract-signer-name');
                const dniInput = document.getElementById('contract-signer-dni');
                if (nameInput) nameInput.value = 'Juan Perez (Test E2E)';
                if (dniInput) dniInput.value = '12345678';
            });
            console.log('   ✅ Datos de firmante ingresados');

            await page.screenshot({ path: 'test-contract-5-sign-modal.png', fullPage: true });

            // Confirmar
            await sleep(500);
            const confirmClicked = await clickButtonByText(page, 'Confirmar Firma');
            if (confirmClicked) {
                await sleep(2500);
                console.log('   ✅ Firma confirmada');
            }
        } else {
            console.log('   ⚠️ Botón "Registrar Firma" NO encontrado');
        }

        // ═══════════════════════════════════════════════════════════
        // PASO 7: Resultado final
        // ═══════════════════════════════════════════════════════════
        console.log('\n🔍 PASO 7: Verificando resultado...');
        await sleep(1500);
        await page.screenshot({ path: 'test-contract-6-final.png', fullPage: true });
        console.log('   📸 Screenshot final: test-contract-6-final.png');

        const pageContent = await page.content();

        if (pageContent.includes('Contrato Firmado')) {
            console.log('\n✅✅✅ TEST EXITOSO: Flujo de contrato completado');
        } else if (pageContent.includes('Registrar Firma')) {
            console.log('\n⚠️ PARCIAL: Contrato enviado, pendiente firma');
        } else if (pageContent.includes('Enviar Contrato')) {
            console.log('\n⚠️ PARCIAL: Contrato generado, pendiente envío');
        } else if (pageContent.includes('Generar Contrato')) {
            console.log('\n❌ FALLIDO: No se pudo generar el contrato');
        } else {
            console.log('\n❓ Estado desconocido - revisar screenshots');
        }

        // Verificar DB
        console.log('\n📊 Verificando en base de datos...');
        const dbCheck = await page.evaluate(async () => {
            try {
                const token = localStorage.getItem('aponnt_token_staff');
                const resp = await fetch('/api/quotes?limit=5', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                const data = await resp.json();
                if (data.quotes) {
                    return data.quotes.map(q => ({
                        id: q.id,
                        number: q.quote_number,
                        status: q.status,
                        contract: q.contract_status
                    }));
                }
                return null;
            } catch (e) {
                return { error: e.message };
            }
        });

        console.log('   Quotes recientes:', JSON.stringify(dbCheck, null, 2));

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        await page.screenshot({ path: 'test-contract-error.png', fullPage: true });
    } finally {
        console.log('\n🏁 Cerrando navegador en 3 segundos...');
        await sleep(3000);
        await browser.close();
    }
}

runTest().catch(console.error);
