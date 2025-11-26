const { chromium } = require('playwright');

async function diagnostico() {
    console.log('🔍 DIAGNÓSTICO DE ESTRUCTURA TAB 1\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // LOGIN
        console.log('🔐 Iniciando sesión...');
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForTimeout(3000);

        await page.waitForFunction(() => {
            const select = document.getElementById('companySelect');
            return select && select.options.length > 1;
        }, { timeout: 10000 });

        const companies = await page.locator('#companySelect option').allTextContents();
        const isiIndex = companies.findIndex(c => c.includes('ISI'));
        await page.selectOption('#companySelect', { index: isiIndex });
        await page.waitForTimeout(1000);

        await page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
        await page.fill('#userInput', 'soporte');
        await page.waitForTimeout(500);

        await page.waitForSelector('#passwordInput:not([disabled])', { timeout: 5000 });
        await page.fill('#passwordInput', 'admin123');
        await page.waitForTimeout(500);

        await page.click('#loginButton');
        await page.waitForTimeout(5000);

        console.log('✅ Login exitoso\n');

        // Navegar a módulo de usuarios
        console.log('📍 Navegando a módulo de Usuarios...');
        await page.click('text=Usuarios');
        await page.waitForTimeout(3000);

        console.log('✅ Módulo de usuarios cargado\n');

        // Analizar estructura de la tabla
        console.log('📊 ANALIZANDO ESTRUCTURA DE LA TABLA:');
        const tableInfo = await page.evaluate(() => {
            const table = document.querySelector('#users-list table.data-table');
            if (!table) return { error: 'No se encontró la tabla' };

            const tbody = table.querySelector('tbody');
            if (!tbody) return { error: 'No se encontró tbody' };

            const rows = tbody.querySelectorAll('tr');
            if (rows.length === 0) return { error: 'No hay filas' };

            const firstRow = rows[0];
            const attributes = {};
            for (let attr of firstRow.attributes) {
                attributes[attr.name] = attr.value;
            }

            const cells = firstRow.querySelectorAll('td');
            const cellTexts = Array.from(cells).map((cell, idx) => ({
                index: idx,
                text: cell.textContent.trim().substring(0, 30),
                html: cell.innerHTML.substring(0, 100)
            }));

            return {
                totalRows: rows.length,
                firstRowAttributes: attributes,
                firstRowCells: cellTexts
            };
        });

        console.log(JSON.stringify(tableInfo, null, 2));

        // Hacer click en el botón Ver
        console.log('\n👁️  Haciendo click en botón Ver...');
        const verButton = await page.locator('button.btn-mini.btn-info[title="Ver"]').first();
        await verButton.click();
        await page.waitForTimeout(3000);

        // Screenshot del modal
        await page.screenshot({
            path: 'backend/diagnostico-modal-completo.png',
            fullPage: true
        });
        console.log('📸 Screenshot guardado: diagnostico-modal-completo.png\n');

        // Analizar estructura del modal TAB 1
        console.log('📋 ANALIZANDO ESTRUCTURA DEL TAB 1:');
        const tab1Info = await page.evaluate(() => {
            // Buscar sección de Acceso y Seguridad
            const accesoSection = Array.from(document.querySelectorAll('h3, h4, .section-title'))
                .find(el => el.textContent.includes('Acceso y Seguridad'));

            if (!accesoSection) return { error: 'No se encontró sección Acceso y Seguridad' };

            const parent = accesoSection.closest('.tab-pane, .modal-content, .section');
            if (!parent) return { error: 'No se encontró contenedor padre' };

            // Buscar todos los botones en esa sección
            const buttons = parent.querySelectorAll('button');
            const buttonInfo = Array.from(buttons).map(btn => ({
                text: btn.textContent.trim(),
                title: btn.getAttribute('title'),
                classes: btn.className,
                onclick: btn.getAttribute('onclick'),
                id: btn.id
            }));

            // Buscar texto de GPS
            const gpsTexts = [];
            const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
            let node;
            while (node = walker.nextNode()) {
                const text = node.textContent.trim();
                if (text.toLowerCase().includes('gps') || text.toLowerCase().includes('restricción')) {
                    gpsTexts.push(text);
                }
            }

            return {
                buttons: buttonInfo,
                gpsTexts: gpsTexts
            };
        });

        console.log(JSON.stringify(tab1Info, null, 2));

        console.log('\n✅ Diagnóstico completado. Navegador permanecerá abierto 30 segundos para inspección manual...');
        await page.waitForTimeout(30000);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        await page.screenshot({ path: 'backend/diagnostico-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

diagnostico();
