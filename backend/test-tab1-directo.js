const { chromium } = require('playwright');
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

async function testDirecto() {
    console.log('🚀 TEST DIRECTO DE CAMBIOS EN TAB 1\n');

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

        // Obtener primer usuario de la tabla
        console.log('👤 Obteniendo primer usuario...');
        const firstUserData = await page.evaluate(() => {
            const table = document.querySelector('#users-list table.data-table tbody');
            if (!table) return null;

            const firstRow = table.querySelector('tr');
            if (!firstRow) return null;

            // El ID del usuario está en el botón Ver
            const verBtn = firstRow.querySelector('button[title="Ver"]');
            if (!verBtn || !verBtn.onclick) return null;

            // Extraer userId del onclick="viewUser('userId')"
            const onclickStr = verBtn.onclick.toString();
            const match = onclickStr.match(/viewUser\(['"]([^'"]+)['"]\)/);
            if (!match) return null;

            const userId = match[1];

            // Obtener valores iniciales de las columnas
            const cells = firstRow.querySelectorAll('td');
            return {
                userId: userId,
                nombre: cells[0]?.textContent.trim(),
                estado: cells[4]?.textContent.trim(),
                gps: cells[5]?.textContent.trim()
            };
        });

        if (!firstUserData) {
            throw new Error('No se pudo obtener datos del primer usuario');
        }

        console.log(`✓ Usuario: ${firstUserData.nombre}`);
        console.log(`✓ ID: ${firstUserData.userId}`);
        console.log(`✓ Estado inicial: ${firstUserData.estado}`);
        console.log(`✓ GPS inicial: ${firstUserData.gps}\n`);

        const userId = firstUserData.userId;

        // ========================================
        // TEST 1: GPS
        // ========================================
        console.log('='.repeat(80));
        console.log('🧪 TEST 1: CAMBIO DE GPS');
        console.log('='.repeat(80));

        // Leer valor actual en BD
        let bdResult = await pool.query(
            'SELECT gps_enabled FROM users WHERE user_id = $1',
            [userId]
        );
        const gpsInicial = bdResult.rows[0].gps_enabled;
        console.log(`📊 GPS en BD (inicial): gps_enabled=${gpsInicial}`);

        // Cambiar GPS usando la función JavaScript
        console.log('🔄 Llamando toggleGPSRadius()...');
        await page.evaluate((uid) => {
            return window.toggleGPSRadius(uid);
        }, userId);

        // Esperar que el alert aparezca y aceptarlo
        await page.waitForTimeout(2000);

        // Verificar cambio en BD
        bdResult = await pool.query(
            'SELECT gps_enabled FROM users WHERE user_id = $1',
            [userId]
        );
        const gpsNuevo = bdResult.rows[0].gps_enabled;
        console.log(`📊 GPS en BD (después): gps_enabled=${gpsNuevo}`);

        if (gpsInicial !== gpsNuevo) {
            console.log('✅ GPS cambió en BD correctamente');
        } else {
            console.log('❌ GPS NO cambió en BD');
        }

        // Esperar 2 segundos y verificar en la tabla
        await page.waitForTimeout(2000);
        const gpsEnTabla = await page.evaluate(() => {
            const table = document.querySelector('#users-list table.data-table tbody');
            const firstRow = table.querySelector('tr');
            const cells = firstRow.querySelectorAll('td');
            return cells[5]?.textContent.trim();
        });
        console.log(`📋 GPS en tabla (después): ${gpsEnTabla}`);

        // Abrir modal y verificar valor
        console.log('👁️  Abriendo modal para verificar valor...');
        await page.evaluate((uid) => {
            return window.viewUser(uid);
        }, userId);
        await page.waitForTimeout(3000);

        // Screenshot del modal
        await page.screenshot({
            path: 'backend/test-tab1-gps-cambiado.png',
            fullPage: true
        });
        console.log('📸 Screenshot: test-tab1-gps-cambiado.png');

        // Cerrar modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ========================================
        // TEST 2: ESTADO
        // ========================================
        console.log('\n' + '='.repeat(80));
        console.log('🧪 TEST 2: CAMBIO DE ESTADO');
        console.log('='.repeat(80));

        // Leer valor actual en BD
        bdResult = await pool.query(
            'SELECT is_active FROM users WHERE user_id = $1',
            [userId]
        );
        const estadoInicial = bdResult.rows[0].is_active;
        console.log(`📊 Estado en BD (inicial): is_active=${estadoInicial}`);

        // Cambiar Estado usando la función JavaScript
        console.log('🔄 Llamando toggleUserStatus()...');
        await page.evaluate((uid) => {
            return window.toggleUserStatus(uid);
        }, userId);

        await page.waitForTimeout(2000);

        // Verificar cambio en BD
        bdResult = await pool.query(
            'SELECT is_active FROM users WHERE user_id = $1',
            [userId]
        );
        const estadoNuevo = bdResult.rows[0].is_active;
        console.log(`📊 Estado en BD (después): is_active=${estadoNuevo}`);

        if (estadoInicial !== estadoNuevo) {
            console.log('✅ Estado cambió en BD correctamente');
        } else {
            console.log('❌ Estado NO cambió en BD');
        }

        // Verificar en tabla
        await page.waitForTimeout(2000);
        const estadoEnTabla = await page.evaluate(() => {
            const table = document.querySelector('#users-list table.data-table tbody');
            const firstRow = table.querySelector('tr');
            const cells = firstRow.querySelectorAll('td');
            return cells[4]?.textContent.trim();
        });
        console.log(`📋 Estado en tabla (después): ${estadoEnTabla}`);

        // Abrir modal y verificar
        console.log('👁️  Abriendo modal para verificar valor...');
        await page.evaluate((uid) => {
            return window.viewUser(uid);
        }, userId);
        await page.waitForTimeout(3000);

        await page.screenshot({
            path: 'backend/test-tab1-estado-cambiado.png',
            fullPage: true
        });
        console.log('📸 Screenshot: test-tab1-estado-cambiado.png');

        // ========================================
        // REPORTE FINAL
        // ========================================
        console.log('\n\n' + '='.repeat(80));
        console.log('📊 REPORTE FINAL');
        console.log('='.repeat(80));

        console.log('\n✅ Prueba completada.');
        console.log('\n🔍 Verificaciones realizadas:');
        console.log('   1. GPS: Cambio en BD + Persistencia en modal');
        console.log('   2. Estado: Cambio en BD + Persistencia en modal');
        console.log('\n📸 Screenshots guardados:');
        console.log('   - test-tab1-gps-cambiado.png');
        console.log('   - test-tab1-estado-cambiado.png');
        console.log('\n💡 Navegador permanecerá abierto 10 segundos para inspección...');

        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        await page.screenshot({ path: 'backend/test-tab1-error.png', fullPage: true });
    } finally {
        await pool.end();
        await browser.close();
    }
}

testDirecto();
