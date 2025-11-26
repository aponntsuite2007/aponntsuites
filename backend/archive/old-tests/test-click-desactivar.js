const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // Enable console logging
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'log') console.log('📄 [CONSOLE]', text);
        if (type === 'error') console.error('❌ [ERROR]', text);
        if (type === 'warn') console.warn('⚠️  [WARN]', text);
    });

    try {
        console.log('🌐 Navegando a panel empresa...');
        await page.goto('http://localhost:9998/panel-empresa.html', { waitUntil: 'networkidle' });

        console.log('🔐 Iniciando sesión...');
        // Esperar campos de login
        await page.waitForSelector('#company-select', { timeout: 10000 });
        await page.selectOption('#company-select', '11'); // ISI company_id
        await page.fill('#login-identifier', 'soporte');
        await page.fill('#login-password', 'soporte');
        await page.click('button[type="submit"]');

        // Esperar dashboard
        await page.waitForSelector('.modules-grid', { timeout: 15000 });
        console.log('✅ Login exitoso');

        // Click en módulo Usuarios
        console.log('📋 Abriendo módulo Usuarios...');
        await page.click('button[onclick*="loadUserModule"]');
        await page.waitForTimeout(2000);

        // Click en primer usuario con botón "Ver"
        console.log('👁️  Abriendo modal Ver Usuario...');
        const verButton = await page.locator('button:has-text("Ver")').first();
        await verButton.click();
        await page.waitForTimeout(2000);

        // Verificar que modal está visible
        const modal = await page.locator('#viewUserModal');
        const isVisible = await modal.isVisible();
        console.log('📊 Modal visible:', isVisible);

        if (!isVisible) {
            console.error('❌ Modal no está visible');
            await browser.close();
            return;
        }

        // Esperar a que TAB 1 esté activo
        await page.waitForSelector('#tab-administracion.active', { timeout: 5000 });
        console.log('✅ TAB 1 Administración activo');

        // Obtener estado ANTES de click
        const statusBeforeEl = await page.locator('#admin-status');
        const statusBeforeText = await statusBeforeEl.textContent();
        console.log('📊 Estado ANTES:', statusBeforeText.trim());

        // Obtener atributo onclick del botón ANTES
        const statusButton = await page.locator('button[onclick*="toggleUserStatus"]');
        const onclickBefore = await statusButton.getAttribute('onclick');
        console.log('🔘 onclick ANTES:', onclickBefore);

        // Parse onclick para ver currentStatus
        const match = onclickBefore.match(/toggleUserStatus\('([^']+)',\s*(true|false)\)/);
        if (match) {
            const userId = match[1];
            const currentStatus = match[2] === 'true';
            console.log('🆔 userId:', userId);
            console.log('📊 currentStatus:', currentStatus);
        }

        // Click en botón Activar/Desactivar
        console.log('🖱️  Haciendo click en botón Activar/Desactivar...');
        page.once('dialog', async dialog => {
            console.log('💬 Diálogo aparece:', dialog.message());
            await dialog.accept();
            console.log('✅ Diálogo aceptado');
        });

        await statusButton.click();
        await page.waitForTimeout(3000); // Esperar que se complete el request

        // Obtener estado DESPUÉS de click
        const statusAfterEl = await page.locator('#admin-status');
        const statusAfterText = await statusAfterEl.textContent();
        console.log('📊 Estado DESPUÉS:', statusAfterText.trim());

        // Obtener atributo onclick del botón DESPUÉS
        const onclickAfter = await statusButton.getAttribute('onclick');
        console.log('🔘 onclick DESPUÉS:', onclickAfter);

        // Comparar
        if (statusBeforeText.trim() === statusAfterText.trim()) {
            console.error('❌ BUG CONFIRMADO: Estado NO cambió');
        } else {
            console.log('✅ Estado cambió correctamente');
        }

        if (onclickBefore === onclickAfter) {
            console.error('❌ BUG CONFIRMADO: onclick NO se actualizó');
        } else {
            console.log('✅ onclick se actualizó correctamente');
        }

        console.log('\n⏳ Manteniendo navegador abierto 30 segundos...');
        await page.waitForTimeout(30000);

    } catch (error) {
        console.error('💥 Error:', error.message);
        await page.screenshot({ path: 'test-error-desactivar.png', fullPage: true });
    } finally {
        await browser.close();
        console.log('\n✅ Test completado');
    }
})();
