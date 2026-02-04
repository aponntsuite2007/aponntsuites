/**
 * Test rápido para verificar si los módulos se muestran en el dashboard
 */
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('  TEST RÁPIDO - VERIFICAR MÓDULOS EN DASHBOARD');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        // Login
        console.log('1. Navegando al panel...');
        await page.goto('https://www.aponnt.com/panel-empresa.html', { waitUntil: 'networkidle' });

        // Seleccionar empresa
        console.log('2. Seleccionando empresa APONNT Demo...');
        await page.fill('#companySlug', 'aponnt-demo');
        await page.click('button:has-text("Continuar")');
        await page.waitForTimeout(2000);

        // Login
        console.log('3. Haciendo login...');
        await page.fill('#username', 'administrador');
        await page.fill('#password', 'admin123');
        await page.click('button:has-text("Iniciar Sesión")');
        await page.waitForTimeout(5000); // Esperar carga del dashboard

        console.log('4. Esperando carga completa...');
        await page.waitForTimeout(5000);

        // Contar módulos visibles
        const moduleCards = await page.$$('.module-card');
        console.log(`\n📊 Total de cards de módulos encontradas: ${moduleCards.length}`);

        // Buscar los 13 módulos específicos
        const target = [
            'ART', 'Gestión Capacitaciones', 'Gestión de Sanciones',
            'Gestión de Vacaciones', 'Legal', 'Gestión Médica',
            'Liquidación Sueldos', 'Logistica Avanzada', 'Manual de Procedimientos',
            'Mapa Empleados', 'Marketplace', 'Mis Procedimientos', 'Reportes Auditoría'
        ];

        console.log('\n🎯 Buscando los 13 módulos:');
        let foundCount = 0;
        for (const name of target) {
            // Buscar por texto visible o data-module-name
            const card = await page.$(`[data-module-name="${name}"], :text("${name}")`);
            if (card) {
                const isClickable = await card.getAttribute('data-clickable');
                const status = await card.getAttribute('data-status');
                console.log(`✅ ${name}: encontrado (clickable=${isClickable}, status=${status || 'N/A'})`);
                foundCount++;
            } else {
                console.log(`❌ ${name}: NO encontrado en el DOM`);
            }
        }

        console.log(`\n📈 Resultado: ${foundCount}/13 módulos encontrados en el dashboard`);

        // Capturar screenshot
        await page.screenshot({ path: 'dashboard-test.png', fullPage: true });
        console.log('\n📸 Screenshot guardado: dashboard-test.png');

    } catch (error) {
        console.error('Error:', error.message);
        await page.screenshot({ path: 'dashboard-error.png' });
    } finally {
        await browser.close();
    }
})();
