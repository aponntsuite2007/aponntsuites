const { chromium } = require('playwright');

async function testManual() {
    console.log('🔍 ABRIENDO NAVEGADOR PARA PRUEBA MANUAL\n');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });
    const page = await browser.newPage();

    try {
        // LOGIN
        console.log('🔐 Iniciando sesión...');
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForTimeout(2000);

        await page.waitForFunction(() => {
            const select = document.getElementById('companySelect');
            return select && select.options.length > 1;
        }, { timeout: 10000 });

        const companies = await page.locator('#companySelect option').allTextContents();
        const isiIndex = companies.findIndex(c => c.includes('ISI'));
        await page.selectOption('#companySelect', { index: isiIndex });
        await page.waitForTimeout(500);

        await page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
        await page.fill('#userInput', 'soporte');
        await page.waitForTimeout(300);

        await page.waitForSelector('#passwordInput:not([disabled])', { timeout: 5000 });
        await page.fill('#passwordInput', 'admin123');
        await page.waitForTimeout(300);

        await page.click('#loginButton');
        await page.waitForTimeout(3000);
        console.log('✅ Login exitoso\n');

        // Navegar a usuarios
        console.log('📍 Navegando a módulo de Usuarios...');
        await page.click('text=Usuarios');
        await page.waitForTimeout(2000);
        console.log('✅ Módulo cargado\n');

        // Abrir primer usuario
        console.log('👁️  Abriendo primer usuario...');
        const verButton = await page.locator('button.btn-mini.btn-info[title="Ver"]').first();
        await verButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ Modal abierto\n');

        console.log('═'.repeat(80));
        console.log('🧪 NAVEGADOR LISTO PARA PRUEBA MANUAL');
        console.log('═'.repeat(80));
        console.log('\nINSTRUCCIONES:');
        console.log('1. Busca la sección "Acceso y Seguridad"');
        console.log('2. Anota el valor actual de GPS (ej: "Sin restricción")');
        console.log('3. Click en el botón para cambiar GPS');
        console.log('4. Espera el alert y ciérralo');
        console.log('5. Cierra el modal (botón Cerrar Expediente o ESC)');
        console.log('6. Vuelve a abrir el mismo usuario (primer botón Ver)');
        console.log('7. Verifica si el GPS cambió\n');
        console.log('8. Haz lo mismo con Estado (Activo/Bloqueado)\n');
        console.log('⏰ Navegador permanecerá abierto 5 MINUTOS para prueba manual...\n');
        console.log('Presiona Ctrl+C cuando termines la prueba.');

        await page.waitForTimeout(300000); // 5 minutos

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    } finally {
        console.log('\n✅ Cerrando navegador...');
        await browser.close();
    }
}

testManual();
