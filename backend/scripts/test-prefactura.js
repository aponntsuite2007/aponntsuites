/**
 * Test Puppeteer: Probar botón Prefactura
 */
const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:9998';

async function test() {
    console.log('🚀 Iniciando test de prefactura...\n');

    const browser = await puppeteer.launch({
        headless: false,  // Ver el navegador
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Capturar errores de consola
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('❌ Console Error:', msg.text());
        }
    });

    // Capturar errores de red
    page.on('response', response => {
        if (response.status() >= 400) {
            console.log(`❌ HTTP ${response.status()}: ${response.url()}`);
        }
    });

    // Capturar requests fallidas
    page.on('requestfailed', request => {
        console.log(`❌ Request failed: ${request.url()} - ${request.failure().errorText}`);
    });

    try {
        // 1. Ir al panel administrativo
        console.log('1️⃣ Navegando al panel administrativo...');
        await page.goto(`${BASE_URL}/panel-administrativo.html`, { waitUntil: 'networkidle2' });
        await page.waitForTimeout(1000);

        // 2. Login
        console.log('2️⃣ Haciendo login con admin/admin123...');

        // Buscar campo de usuario
        const userInput = await page.$('input[name="username"], input[name="user"], input[type="text"]');
        if (userInput) {
            await userInput.type('admin');
        }

        const passInput = await page.$('input[name="password"], input[type="password"]');
        if (passInput) {
            await passInput.type('admin123');
        }

        // Click en botón de login
        const loginBtn = await page.$('button[type="submit"], button.login-btn, .btn-login');
        if (loginBtn) {
            await loginBtn.click();
            await page.waitForTimeout(3000);
        }

        console.log('   URL actual:', page.url());

        // 3. Navegar a Presupuestos (CRM)
        console.log('3️⃣ Buscando menú de Presupuestos/CRM...');

        // Buscar en el menú
        const menuItems = await page.$$('a, button, .menu-item, .nav-item, [onclick]');
        console.log(`   Encontrados ${menuItems.length} elementos de menú`);

        // Buscar "Presupuestos" o "CRM" o "Quotes"
        for (const item of menuItems) {
            const text = await page.evaluate(el => el.textContent, item);
            if (text && (text.includes('Presupuesto') || text.includes('CRM') || text.includes('Quote'))) {
                console.log(`   Encontrado: "${text.trim().substring(0, 50)}"`);
                await item.click();
                await page.waitForTimeout(2000);
                break;
            }
        }

        // 4. Buscar tarjetas de presupuesto con circuito de facturación
        console.log('4️⃣ Buscando circuito de facturación...');
        await page.waitForTimeout(1000);

        const invoiceCircuit = await page.$('.invoice-circuit');
        if (invoiceCircuit) {
            console.log('   ✅ Encontrado circuito de facturación');

            // Buscar botón de prefactura
            const prefacturaBtn = await page.$('button[onclick*="generatePreInvoice"], button:has-text("Prefactura")');
            if (prefacturaBtn) {
                console.log('   Haciendo clic en botón Prefactura...');
                await prefacturaBtn.click();
                await page.waitForTimeout(3000);
            } else {
                // Buscar por texto
                const buttons = await page.$$('.invoice-circuit button');
                for (const btn of buttons) {
                    const text = await page.evaluate(el => el.textContent, btn);
                    if (text && text.includes('Prefactura')) {
                        console.log(`   Encontrado botón: "${text}"`);
                        await btn.click();
                        await page.waitForTimeout(3000);
                        break;
                    }
                }
            }
        } else {
            console.log('   ⚠️ No se encontró circuito de facturación visible');
            console.log('   Buscando presupuestos activos o aceptados...');

            // Tomar screenshot
            await page.screenshot({ path: 'test-prefactura-screenshot.png', fullPage: true });
            console.log('   📸 Screenshot guardado: test-prefactura-screenshot.png');
        }

        // 5. Esperar y capturar errores
        console.log('5️⃣ Esperando respuesta...');
        await page.waitForTimeout(3000);

        // Verificar si hay alert o toast de error
        const toasts = await page.$$('.toast, .alert, .notification, [class*="toast"], [class*="error"]');
        for (const toast of toasts) {
            const text = await page.evaluate(el => el.textContent, toast);
            if (text) {
                console.log(`   Toast/Alert: "${text.trim().substring(0, 100)}"`);
            }
        }

        console.log('\n✅ Test completado. Revisa los errores arriba.');

        // Mantener navegador abierto para debug
        console.log('\n⏳ Navegador abierto por 30 segundos para inspección...');
        await page.waitForTimeout(30000);

    } catch (error) {
        console.error('❌ Error durante test:', error.message);
        await page.screenshot({ path: 'test-prefactura-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

test();
