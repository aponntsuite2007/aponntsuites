const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false, slowMo: 300 });
    const page = await browser.newPage();

    try {
        console.log('1. Abriendo página...');
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForTimeout(2000);

        console.log('2. Esperando carga de empresas...');
        await page.waitForTimeout(3000);

        // Listar opciones disponibles
        const options = await page.evaluate(() => {
            const sel = document.getElementById('companySelect');
            return Array.from(sel.options).map(o => ({ value: o.value, text: o.text }));
        });
        console.log('Empresas disponibles:', options);

        // Buscar ISI por texto o valor
        const isiOption = options.find(o => o.text.toLowerCase().includes('isi') || o.value === '11');
        if (isiOption) {
            await page.selectOption('#companySelect', isiOption.value);
            console.log('Seleccionada empresa:', isiOption.text);
        } else {
            // Seleccionar la primera empresa que no sea vacía
            const validOption = options.find(o => o.value && o.value !== '');
            if (validOption) {
                await page.selectOption('#companySelect', validOption.value);
                console.log('ISI no encontrada, seleccionada:', validOption.text);
            }
        }
        await page.waitForTimeout(1000);

        console.log('3. Ingresando usuario...');
        await page.fill('#userInput', 'admin');
        await page.waitForTimeout(500);

        console.log('4. Ingresando contraseña...');
        await page.fill('#passwordInput', 'admin123');
        await page.waitForTimeout(500);

        console.log('5. Haciendo click en login...');
        await page.click('#loginButton');
        await page.waitForTimeout(4000);

        console.log('6. Buscando módulo Manual de Procedimientos...');

        // Buscar el módulo - puede tener diferentes nombres
        const moduleSelectors = [
            'text=Manual de Procedimientos',
            'text=PROCEDURES MANUAL',
            'text=procedures-manual',
            '[data-module="procedures-manual"]',
            '.module-card:has-text("Procedimientos")'
        ];

        let found = false;
        for (const selector of moduleSelectors) {
            try {
                const element = page.locator(selector).first();
                if (await element.isVisible({ timeout: 2000 })) {
                    console.log(`7. Encontrado con selector: ${selector}`);
                    await element.click();
                    found = true;
                    break;
                }
            } catch (e) {
                // Continuar buscando
            }
        }

        if (!found) {
            console.log('Módulo no encontrado directamente, tomando screenshot del estado actual...');
            await page.screenshot({ path: 'test-before-module.png', fullPage: true });
        }

        await page.waitForTimeout(5000);

        // Tomar screenshot
        await page.screenshot({ path: 'test-procedures-result.png', fullPage: true });
        console.log('8. Screenshot guardado en test-procedures-result.png');

        // Verificar si hay algún modal visible
        const modalVisible = await page.locator('#procedureModal').isVisible();
        console.log('Modal procedureModal visible:', modalVisible);

        // Verificar elementos en pantalla
        const pageContent = await page.content();
        if (pageContent.includes('Nuevo Procedimiento')) {
            console.log('ENCONTRADO: Texto "Nuevo Procedimiento" en la página');
        }
        if (pageContent.includes('pm-modal-overlay')) {
            console.log('ENCONTRADO: Elemento pm-modal-overlay en la página');
        }

        // Verificar estilos del modal - DETALLADO
        const modalStyle = await page.evaluate(() => {
            const modal = document.getElementById('procedureModal');
            if (modal) {
                return {
                    inlineStyle: modal.getAttribute('style'),
                    computedDisplay: window.getComputedStyle(modal).display,
                    computedVisibility: window.getComputedStyle(modal).visibility,
                    classList: Array.from(modal.classList),
                    outerHTMLStart: modal.outerHTML.substring(0, 300)
                };
            }
            return null;
        });
        console.log('Estilos del modal DETALLADO:', JSON.stringify(modalStyle, null, 2));

        // TEST: Hacer click en "Nuevo" y verificar que el modal se abra
        console.log('9. Probando botón "Nuevo Procedimiento"...');
        const nuevoBtn = page.locator('button:has-text("Nuevo")').first();
        if (await nuevoBtn.isVisible({ timeout: 3000 })) {
            await nuevoBtn.click();
            await page.waitForTimeout(1000);

            const modalAfterClick = await page.evaluate(() => {
                const modal = document.getElementById('procedureModal');
                if (modal) {
                    return {
                        visible: modal.classList.contains('active'),
                        computedDisplay: window.getComputedStyle(modal).display,
                        classList: Array.from(modal.classList)
                    };
                }
                return null;
            });
            console.log('Modal después de click en Nuevo:', JSON.stringify(modalAfterClick, null, 2));

            if (modalAfterClick?.visible && modalAfterClick?.computedDisplay === 'flex') {
                console.log('✅ SUCCESS: Modal se abre correctamente al hacer click en Nuevo');
            } else {
                console.log('❌ FAIL: Modal NO se abre al hacer click en Nuevo');
            }
        } else {
            console.log('❌ Botón "Nuevo" no encontrado');
        }

        await page.screenshot({ path: 'test-procedures-after-nuevo.png', fullPage: true });
        console.log('10. Screenshot guardado en test-procedures-after-nuevo.png');

        console.log('Manteniendo navegador abierto 10 segundos...');
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('Error:', error.message);
        await page.screenshot({ path: 'test-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
})();
