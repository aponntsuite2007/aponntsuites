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
    });

    try {
        console.log('🌐 Navegando a panel empresa...');
        await page.goto('http://localhost:9998/panel-empresa.html', { waitUntil: 'networkidle' });

        console.log('🔐 Iniciando sesión...');
        await page.waitForSelector('#company-select', { timeout: 10000 });
        await page.selectOption('#company-select', '11'); // ISI
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

        // Obtener userId del modal
        const userId = await page.evaluate(() => {
            const modal = document.getElementById('viewUserModal');
            if (!modal) return null;
            // Buscar en el DOM el userId
            const statusBtn = modal.querySelector('button[onclick*="toggleUserStatus"]');
            if (!statusBtn) return null;
            const onclick = statusBtn.getAttribute('onclick');
            const match = onclick.match(/toggleUserStatus\('([^']+)'\)/);
            return match ? match[1] : null;
        });

        console.log('🆔 userId detectado:', userId);

        if (!userId) {
            console.error('❌ No se pudo detectar userId');
            await browser.close();
            return;
        }

        // GET usuario para ver valor ACTUAL en BD
        console.log('\n📊 PASO 1: Obtener valor ACTUAL desde backend...');
        const response1 = await page.evaluate(async (uid) => {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            const res = await fetch(`http://localhost:9998/api/v1/users/${uid}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return await res.json();
        }, userId);

        console.log('📊 RESPUESTA BACKEND (response1):');
        console.log('   response1.success:', response1.success);
        console.log('   response1.user existe?:', !!response1.user);

        if (response1.success && response1.user) {
            console.log('\n✅ BACKEND RETORNA {success: true, user: {...}}');
            console.log('   user.gpsEnabled:', response1.user.gpsEnabled);
            console.log('   user.allowOutsideRadius:', response1.user.allowOutsideRadius);
            console.log('   user.isActive:', response1.user.isActive);
            console.log('   Interpretación GPS:', response1.user.allowOutsideRadius ? '🌍 Puede salir del área' : '📍 Restringido al área');

            // Verificar que los valores mostrados en UI coinciden
            console.log('\n📊 PASO 2: Verificar valores mostrados en TAB 1...');
            const uiValues = await page.evaluate(() => {
                return {
                    role: document.getElementById('admin-role')?.textContent.trim(),
                    status: document.getElementById('admin-status')?.textContent.trim(),
                    gps: document.getElementById('admin-gps')?.textContent.trim(),
                    department: document.getElementById('admin-department')?.textContent.trim()
                };
            });

            console.log('📊 VALORES EN UI:');
            console.log('   Rol:', uiValues.role);
            console.log('   Estado:', uiValues.status);
            console.log('   GPS:', uiValues.gps);
            console.log('   Departamento:', uiValues.department);

            const expectedGPSText = response1.user.allowOutsideRadius ? 'Sin restricción GPS' : 'Solo área autorizada';
            const gpsMatch = uiValues.gps.includes(expectedGPSText.replace(/[🌍📍]/g, '').trim());

            if (gpsMatch) {
                console.log('✅ ÉXITO: Los valores en UI coinciden con BD');
            } else {
                console.error('❌ ERROR: Los valores en UI NO coinciden');
                console.error('   Esperado:', expectedGPSText);
                console.error('   Recibido:', uiValues.gps);
            }

        } else {
            console.error('❌ ERROR: Backend NO retorna formato {success: true, user: {...}}');
            console.error('   Respuesta completa:', response1);
        }

        console.log('\n⏳ Manteniendo navegador abierto 30 segundos para inspección manual...');
        await page.waitForTimeout(30000);

    } catch (error) {
        console.error('💥 Error:', error.message);
        await page.screenshot({ path: 'test-gps-flow-error.png', fullPage: true });
    } finally {
        await browser.close();
        console.log('\n✅ Test completado');
    }
})();
