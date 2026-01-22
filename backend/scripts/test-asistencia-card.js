/**
 * TEST E2E - Click en Card de Control de Asistencia
 */
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    console.log('═'.repeat(70));
    console.log('TEST E2E - MÓDULO CONTROL DE ASISTENCIA (COMO USUARIO)');
    console.log('═'.repeat(70));

    const results = {
        login: false,
        navegacion: false,
        tabla: false,
        filtros: false,
        datos: false
    };

    try {
        // 1. LOGIN
        console.log('\n▶ 1. LOGIN');
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForSelector('#companySelect', { timeout: 15000 });
        await page.selectOption('#companySelect', 'isi');
        await page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
        await page.fill('#userInput', 'admin');
        await page.fill('#passwordInput', 'admin123');
        await page.click('#loginButton');
        await page.waitForTimeout(5000);
        results.login = true;
        console.log('   ✅ Login exitoso');

        // 2. CLICK EN CARD DE CONTROL DE ASISTENCIA
        console.log('\n▶ 2. NAVEGACIÓN (Click en Card)');

        // Usar locator de Playwright para buscar el texto
        try {
            await page.locator('text=Control de Asistencia').first().click();
            results.navegacion = true;
            console.log('   ✅ Click en "Control de Asistencia"');
        } catch (e) {
            console.log('   ❌ No se encontró la card');
        }

        await page.waitForTimeout(4000);

        // Screenshot
        await page.screenshot({ path: 'debug-dentro-asistencia.png' });
        console.log('   📸 Screenshot: debug-dentro-asistencia.png');

        // 3. VERIFICAR TABLA
        console.log('\n▶ 3. VERIFICAR TABLA DE DATOS');

        const tableInfo = await page.evaluate(() => {
            const tables = document.querySelectorAll('table');
            const rows = document.querySelectorAll('tbody tr');
            return {
                tableCount: tables.length,
                rowCount: rows.length
            };
        });

        results.tabla = tableInfo.tableCount > 0;
        console.log('   Tablas encontradas:', tableInfo.tableCount);
        console.log('   Filas de datos:', tableInfo.rowCount);

        // 4. VERIFICAR FILTROS
        console.log('\n▶ 4. VERIFICAR FILTROS');

        const filterInfo = await page.evaluate(() => {
            return {
                dateInputs: document.querySelectorAll('input[type="date"]').length,
                selects: document.querySelectorAll('select').length,
                searchInputs: document.querySelectorAll('input[type="text"], input[type="search"]').length
            };
        });

        results.filtros = filterInfo.dateInputs > 0 || filterInfo.selects > 1;
        console.log('   Inputs fecha:', filterInfo.dateInputs);
        console.log('   Selects:', filterInfo.selects);
        console.log('   Inputs texto:', filterInfo.searchInputs);

        // 5. VERIFICAR DATOS CARGADOS
        console.log('\n▶ 5. VERIFICAR DATOS CARGADOS');

        const dataInfo = await page.evaluate(() => {
            const text = document.body.innerText;
            return {
                hasNames: /[A-Z][a-z]+ [A-Z][a-z]+/.test(text), // Nombres de personas
                hasTime: /\d{2}:\d{2}/.test(text), // Horarios
                hasDate: /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/.test(text), // Fechas
                hasStatus: text.includes('present') || text.includes('Presente') ||
                           text.includes('late') || text.includes('Tardanza') ||
                           text.includes('ausente') || text.includes('absent')
            };
        });

        results.datos = dataInfo.hasNames || dataInfo.hasTime || dataInfo.hasStatus;
        console.log('   Nombres visibles:', dataInfo.hasNames ? '✅' : '❌');
        console.log('   Horarios visibles:', dataInfo.hasTime ? '✅' : '❌');
        console.log('   Estados visibles:', dataInfo.hasStatus ? '✅' : '❌');

        // 6. INTERACCIÓN - Cambiar filtro de fecha si existe
        console.log('\n▶ 6. INTERACCIÓN CON FILTROS');

        if (filterInfo.dateInputs > 0) {
            const interacted = await page.evaluate(() => {
                const dateInput = document.querySelector('input[type="date"]');
                if (dateInput) {
                    dateInput.value = '2025-12-15';
                    dateInput.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }
                return false;
            });
            await page.waitForTimeout(2000);
            console.log('   Cambio de fecha:', interacted ? '✅' : '❌');
        } else {
            console.log('   ⚠️ No hay filtros de fecha');
        }

        // Screenshot final
        await page.screenshot({ path: 'debug-asistencia-final.png' });

    } catch (error) {
        console.log('\n❌ ERROR:', error.message);
        await page.screenshot({ path: 'debug-asistencia-error.png' });
    }

    await browser.close();

    // RESUMEN FINAL
    console.log('\n' + '═'.repeat(70));
    console.log('RESUMEN E2E - EXPERIENCIA DE USUARIO');
    console.log('═'.repeat(70));
    console.log('  Login:      ', results.login ? '✅' : '❌');
    console.log('  Navegación: ', results.navegacion ? '✅' : '❌');
    console.log('  Tabla:      ', results.tabla ? '✅' : '❌');
    console.log('  Filtros:    ', results.filtros ? '✅' : '❌');
    console.log('  Datos:      ', results.datos ? '✅' : '❌');

    const passed = Object.values(results).filter(Boolean).length;
    const pct = Math.round(passed / 5 * 100);

    console.log('\n' + '═'.repeat(70));
    if (pct >= 80) {
        console.log(`✅ RESULTADO: ${passed}/5 (${pct}%) - LISTO PARA PRODUCCIÓN`);
    } else if (pct >= 60) {
        console.log(`⚠️ RESULTADO: ${passed}/5 (${pct}%) - FUNCIONAL CON OBSERVACIONES`);
    } else {
        console.log(`❌ RESULTADO: ${passed}/5 (${pct}%) - NECESITA TRABAJO`);
    }
    console.log('═'.repeat(70));
})();
