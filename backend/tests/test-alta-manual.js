/**
 * Test: Verificar botón Alta Manual en presupuestos
 * Ejecutar: npx playwright test tests/test-alta-manual.js --headed
 */

const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAltaManual() {
    console.log('🚀 Iniciando test de Alta Manual...\n');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });
    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });
    const page = await context.newPage();

    // Escuchar logs de consola
    page.on('console', msg => {
        if (msg.text().includes('[QUOTES]') || msg.text().includes('Alta Manual')) {
            console.log('📋 CONSOLE:', msg.text());
        }
    });

    try {
        // 1. Ir al panel administrativo
        console.log('1️⃣ Navegando al panel administrativo...');
        await page.goto(`${BASE_URL}/panel-administrativo.html`);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login-page.png') });
        await sleep(1000);

        // 2. Hacer login
        console.log('2️⃣ Haciendo login...');

        // Esperar que aparezca el formulario de login
        await page.waitForSelector('input[type="email"], input[name="email"], #email', { timeout: 10000 });

        // Buscar los campos de login
        const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]') || await page.$('#email');
        const passwordInput = await page.$('input[type="password"]') || await page.$('input[name="password"]') || await page.$('#password');

        if (emailInput && passwordInput) {
            await emailInput.fill('director@aponnt.com');
            await passwordInput.fill('director123');
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-login-filled.png') });

            // Click en botón de login
            const loginBtn = await page.$('button[type="submit"]') || await page.$('.login-btn') || await page.$('button:has-text("Ingresar")');
            if (loginBtn) {
                await loginBtn.click();
            }
        } else {
            console.log('⚠️ No encontré campos de login, puede que ya esté logueado');
        }

        await sleep(3000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-after-login.png') });

        // 3. Verificar token y rol
        console.log('3️⃣ Verificando token y rol...');
        const tokenInfo = await page.evaluate(() => {
            const token = sessionStorage.getItem('aponnt_token_staff') || localStorage.getItem('aponnt_token_staff');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    return { role: payload.role, email: payload.email, level: payload.level };
                } catch (e) {
                    return { error: e.message };
                }
            }
            return { error: 'No hay token' };
        });
        console.log('   Token info:', tokenInfo);

        // 4. Navegar a Presupuestos
        console.log('4️⃣ Navegando a sección de Presupuestos...');

        // Buscar el link de presupuestos en el sidebar
        const quotesLink = await page.$('a[data-section="quotes"]') ||
                          await page.$('[onclick*="quotes"]') ||
                          await page.$('text=Presupuestos') ||
                          await page.$('text=Pipeline');

        if (quotesLink) {
            await quotesLink.click();
            await sleep(2000);
        } else {
            // Intentar navegar directamente
            await page.evaluate(() => {
                if (window.AdminPanelController) {
                    AdminPanelController.loadSection('quotes');
                } else if (window.AdminSidebar) {
                    AdminSidebar.navigateTo('quotes');
                }
            });
            await sleep(2000);
        }

        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-quotes-section.png') });

        // 5. Esperar que carguen los presupuestos
        console.log('5️⃣ Esperando que carguen los presupuestos...');
        await sleep(3000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-quotes-loaded.png') });

        // 6. Buscar y hacer click en un presupuesto
        console.log('6️⃣ Buscando presupuestos...');

        // Buscar cards de presupuestos
        const quoteCards = await page.$$('.quote-card, .pipeline-card, [onclick*="viewQuote"]');
        console.log(`   Encontrados ${quoteCards.length} presupuestos`);

        if (quoteCards.length > 0) {
            console.log('   Haciendo click en el primer presupuesto...');
            await quoteCards[0].click();
            await sleep(2000);
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-quote-modal.png') });

            // 7. Verificar si aparece el botón Alta Manual
            console.log('7️⃣ Buscando botón "Alta Manual"...');

            const altaManualBtn = await page.$('button:has-text("Alta Manual")') ||
                                  await page.$('[onclick*="showManualOnboardingModal"]') ||
                                  await page.$('.btn-success:has-text("Alta")');

            if (altaManualBtn) {
                console.log('   ✅ ¡BOTÓN "Alta Manual" ENCONTRADO!');
                await altaManualBtn.evaluate(el => el.style.border = '3px solid red');
                await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-alta-manual-found.png') });
            } else {
                console.log('   ❌ Botón "Alta Manual" NO encontrado');

                // Capturar el contenido del modal footer
                const modalFooter = await page.$('.quote-modal-footer');
                if (modalFooter) {
                    const footerHTML = await modalFooter.innerHTML();
                    console.log('   Footer del modal:', footerHTML.substring(0, 500));
                }
            }

            // 8. Verificar logs de consola del módulo
            console.log('\n8️⃣ Ejecutando verificación manual del rol...');
            const checkResult = await page.evaluate(() => {
                // Simular lo que hace getStaffRole
                let staffRole = '';
                const token = sessionStorage.getItem('aponnt_token_staff') || localStorage.getItem('aponnt_token_staff');
                if (token) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        staffRole = payload.role || '';
                    } catch (e) {}
                }

                const allowedRoles = ['GG', 'GERENTE_GENERAL', 'SUPERADMIN', 'superadmin', 'gerente_general', 'DIR', 'DIRECTOR'];
                return {
                    staffRole,
                    isAllowed: allowedRoles.includes(staffRole),
                    allowedRoles
                };
            });
            console.log('   Resultado:', checkResult);

        } else {
            console.log('   ⚠️ No se encontraron presupuestos');
        }

        // Screenshot final
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-final.png') });

        console.log('\n📸 Screenshots guardados en:', SCREENSHOTS_DIR);
        console.log('\n✅ Test completado');

    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error.png') });
    } finally {
        await sleep(5000); // Mantener abierto para ver
        await browser.close();
    }
}

// Crear directorio de screenshots
const fs = require('fs');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

testAltaManual().catch(console.error);
