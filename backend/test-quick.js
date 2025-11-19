const { chromium } = require('playwright');
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

async function test() {
    console.log('🧪 PROBANDO GUARDADO EN BD\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // Login
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForTimeout(2000);

        await page.waitForFunction(() => {
            const select = document.getElementById('companySelect');
            return select && select.options.length > 1;
        });

        const companies = await page.locator('#companySelect option').allTextContents();
        const isiIndex = companies.findIndex(c => c.includes('ISI'));
        await page.selectOption('#companySelect', { index: isiIndex });
        await page.waitForTimeout(500);

        await page.waitForSelector('#userInput:not([disabled])');
        await page.fill('#userInput', 'soporte');
        await page.waitForTimeout(300);

        await page.waitForSelector('#passwordInput:not([disabled])');
        await page.fill('#passwordInput', 'admin123');
        await page.waitForTimeout(300);

        await page.click('#loginButton');
        await page.waitForTimeout(3000);
        console.log('✅ Login OK\n');

        // Ir a usuarios
        await page.click('text=Usuarios');
        await page.waitForTimeout(2000);

        // Obtener primer usuario
        const userId = await page.evaluate(() => {
            const table = document.querySelector('#users-list table.data-table tbody');
            const firstRow = table.querySelector('tr');
            const verBtn = firstRow.querySelector('button[title="Ver"]');
            const onclickStr = verBtn.onclick.toString();
            const match = onclickStr.match(/viewUser\(['"]([^'"]+)['"]\)/);
            return match[1];
        });

        console.log(`👤 User ID: ${userId}`);

        // Leer valor inicial en BD
        let result = await pool.query('SELECT gps_enabled, is_active FROM users WHERE user_id = $1', [userId]);
        const inicial = result.rows[0];
        console.log(`📊 BD INICIAL: gps_enabled=${inicial.gps_enabled}, is_active=${inicial.is_active}\n`);

        // Llamar toggleGPSRadius
        console.log('🔄 Llamando toggleGPSRadius()...');
        await page.evaluate((uid) => {
            return window.toggleGPSRadius(uid);
        }, userId);

        await page.waitForTimeout(3000);

        // Verificar en BD
        result = await pool.query('SELECT gps_enabled FROM users WHERE user_id = $1', [userId]);
        const nuevo = result.rows[0];
        console.log(`📊 BD DESPUÉS: gps_enabled=${nuevo.gps_enabled}`);

        if (inicial.gps_enabled !== nuevo.gps_enabled) {
            console.log('\n✅ ¡GPS CAMBIÓ EN BD!');
        } else {
            console.log('\n❌ GPS NO CAMBIÓ EN BD');
        }

        await page.waitForTimeout(5000);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    } finally {
        await pool.end();
        await browser.close();
    }
}

test();
