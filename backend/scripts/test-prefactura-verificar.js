/**
 * Test Puppeteer: Verificar prefacturas en Facturación y botones uniformes
 */
const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:9998';

async function test() {
    console.log('🚀 Iniciando test de verificación...\n');

    const browser = await puppeteer.launch({
        headless: 'new',
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

    try {
        // 1. Login al panel administrativo
        console.log('1️⃣ Navegando al panel administrativo...');
        await page.goto(`${BASE_URL}/panel-administrativo.html`, { waitUntil: 'networkidle2' });

        // Buscar el formulario de login
        const userInput = await page.$('input[name="username"], input[name="user"], input[type="text"]');
        if (userInput) {
            await userInput.type('admin');
        }

        const passInput = await page.$('input[name="password"], input[type="password"]');
        if (passInput) {
            await passInput.type('admin123');
        }

        const loginBtn = await page.$('button[type="submit"], .btn-login, button.login');
        if (loginBtn) {
            await loginBtn.click();
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
        }

        await new Promise(r => setTimeout(r, 2000));
        console.log('   URL actual:', page.url());

        // 2. Ir a Facturación > Prefacturas
        console.log('\n2️⃣ Buscando menú Facturación > Prefacturas...');

        // Buscar el menú de Facturación
        const menuItems = await page.$$('a, .menu-item, .nav-item, [data-module], li');
        for (const item of menuItems) {
            const text = await page.evaluate(el => el.textContent || '', item);
            if (text.includes('Facturaci') || text.includes('Billing')) {
                console.log(`   Encontrado menú: "${text.trim().substring(0, 30)}"`);
                await item.click().catch(() => {});
                await new Promise(r => setTimeout(r, 1000));
                break;
            }
        }

        // Buscar submenu Prefacturas
        const subMenuItems = await page.$$('a, .submenu-item, li, [data-submodule]');
        for (const item of subMenuItems) {
            const text = await page.evaluate(el => el.textContent || '', item);
            if (text.includes('Prefactura') || text.includes('Pre-factura')) {
                console.log(`   Encontrado submenu: "${text.trim().substring(0, 30)}"`);
                await item.click().catch(() => {});
                await new Promise(r => setTimeout(r, 2000));
                break;
            }
        }

        // 3. Verificar si hay prefacturas
        console.log('\n3️⃣ Verificando prefacturas...');
        const prefacturasContent = await page.evaluate(() => {
            const body = document.body.innerText;
            return body;
        });

        if (prefacturasContent.includes('Sin pre-facturas') || prefacturasContent.includes('No hay pre-facturas')) {
            console.log('   ⚠️ No hay prefacturas mostradas');
        } else if (prefacturasContent.includes('prefactura') || prefacturasContent.includes('PRE-')) {
            console.log('   ✅ Se encontraron prefacturas');
        }

        // 4. Ir a Presupuestos para verificar botones
        console.log('\n4️⃣ Navegando a CRM > Presupuestos...');

        // Buscar menú CRM
        const menuItems2 = await page.$$('a, .menu-item, .nav-item, [data-module], li');
        for (const item of menuItems2) {
            const text = await page.evaluate(el => el.textContent || '', item);
            if (text.includes('CRM') || text.includes('Presupuesto')) {
                console.log(`   Encontrado: "${text.trim().substring(0, 30)}"`);
                await item.click().catch(() => {});
                await new Promise(r => setTimeout(r, 1500));
                break;
            }
        }

        // Buscar submenu Presupuestos
        const subMenuItems2 = await page.$$('a, .submenu-item, li, [data-submodule]');
        for (const item of subMenuItems2) {
            const text = await page.evaluate(el => el.textContent || '', item);
            if (text.includes('Presupuesto') || text.includes('Quotes')) {
                console.log(`   Encontrado submenu: "${text.trim().substring(0, 30)}"`);
                await item.click().catch(() => {});
                await new Promise(r => setTimeout(r, 2000));
                break;
            }
        }

        // 5. Verificar tamaño de botones
        console.log('\n5️⃣ Verificando uniformidad de botones...');

        const buttonInfo = await page.evaluate(() => {
            const buttons = document.querySelectorAll('.quote-card button, .presupuesto-card button, [class*="quote"] button');
            const info = [];
            buttons.forEach(btn => {
                const style = window.getComputedStyle(btn);
                info.push({
                    text: btn.textContent.trim().substring(0, 20),
                    fontSize: style.fontSize,
                    padding: style.padding
                });
            });
            return info;
        });

        if (buttonInfo.length > 0) {
            console.log(`   Encontrados ${buttonInfo.length} botones en presupuestos:`);
            buttonInfo.slice(0, 10).forEach(btn => {
                console.log(`   - "${btn.text}": font=${btn.fontSize}, padding=${btn.padding}`);
            });

            // Verificar si son uniformes
            const fontSizes = [...new Set(buttonInfo.map(b => b.fontSize))];
            if (fontSizes.length === 1) {
                console.log('   ✅ Todos los botones tienen el mismo tamaño de fuente');
            } else {
                console.log('   ⚠️ Botones con diferentes tamaños:', fontSizes.join(', '));
            }
        } else {
            console.log('   ⚠️ No se encontraron botones en presupuestos');
        }

        // 6. Llamar directamente a la API de prefacturas
        console.log('\n6️⃣ Verificando API de prefacturas directamente...');

        const apiResult = await page.evaluate(async () => {
            try {
                const response = await fetch('/api/aponnt/billing/pre-invoices?status=pending');
                if (!response.ok) {
                    return { error: `HTTP ${response.status}`, text: await response.text() };
                }
                return await response.json();
            } catch (e) {
                return { error: e.message };
            }
        });

        console.log('   Respuesta API prefacturas:', JSON.stringify(apiResult, null, 2).substring(0, 500));

        console.log('\n✅ Test completado.');

    } catch (error) {
        console.error('❌ Error durante test:', error.message);
        await page.screenshot({ path: 'test-prefactura-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

test();
