/**
 * ============================================================================
 * TEST DE PRUEBA - IntelligentUXTester MEJORADO
 * ============================================================================
 *
 * Prueba las mejoras recién implementadas en un solo módulo (departments)
 */

const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');
const SystemRegistry = require('../src/auditor/registry/SystemRegistry');
const IntelligentUXTester = require('../src/auditor/core/IntelligentUXTester');
const database = require('../src/config/database');

async function main() {
    console.log('\n🧪 TEST DE PRUEBA - IntelligentUXTester MEJORADO');
    console.log('═'.repeat(60));
    console.log('Módulo: departments');
    console.log('Empresa: ISI (ID: 11)');
    console.log('═'.repeat(60) + '\n');

    let browser, page, sequelize, systemRegistry, tester;

    try {
        // PostgreSQL
        const dbUser = process.env.POSTGRES_USER || 'postgres';
        const dbPassword = process.env.POSTGRES_PASSWORD || 'Aedr15150302';
        const dbHost = process.env.POSTGRES_HOST || 'localhost';
        const dbPort = process.env.POSTGRES_PORT || '5432';
        const dbName = process.env.POSTGRES_DB || 'attendance_system';
        const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

        sequelize = new Sequelize(process.env.DATABASE_URL || connectionString, {
            dialect: 'postgres',
            logging: false
        });
        await sequelize.authenticate();
        console.log('✅ PostgreSQL conectado\n');

        // SystemRegistry
        systemRegistry = new SystemRegistry(database, null);
        await systemRegistry.initialize();
        console.log('✅ SystemRegistry inicializado\n');

        // Playwright
        browser = await chromium.launch({
            headless: false,
            slowMo: 50,
            args: ['--disable-blink-features=AutomationControlled', '--start-maximized']
        });

        const context = await browser.newContext({
            viewport: null,
            locale: 'es-AR',
            timezoneId: 'America/Argentina/Buenos_Aires',
            ignoreHTTPSErrors: true
        });

        page = await context.newPage();
        page.setDefaultTimeout(15000);
        console.log('✅ Navegador iniciado\n');

        // Login
        console.log('🔐 Login...');
        const baseUrl = process.env.BASE_URL || 'http://localhost:9998';
        await page.goto(`${baseUrl}/panel-empresa.html`, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(1000);

        await page.waitForSelector('#companySelect', { visible: true, timeout: 10000 });
        await page.selectOption('#companySelect', 'isi');
        await page.waitForTimeout(3000);

        const usernameInput = page.locator('input[type="text"]:visible').last();
        await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
        await usernameInput.fill('admin');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        const passwordInput = page.locator('input[type="password"]:visible').last();
        await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
        await passwordInput.fill('admin123');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        console.log('✅ Login exitoso\n');

        // Crear tester
        const logger = { info: console.log, warn: console.warn, error: console.error };
        tester = new IntelligentUXTester(page, systemRegistry, sequelize, logger);

        // Testear módulo departments
        console.log('\n🧪 EJECUTANDO TEST MEJORADO...');
        console.log('═'.repeat(60) + '\n');
        const results = await tester.testModule('departments', 11);

        console.log('\n═'.repeat(60));
        console.log('📊 RESULTADOS');
        console.log('═'.repeat(60));
        console.log(`Tests ejecutados: ${results.tests.length}`);
        console.log(`PASSED: ${results.passed} ✅`);
        console.log(`FAILED: ${results.failed} ❌`);
        console.log(`WARNINGS: ${results.warnings.length} ⚠️`);
        console.log('═'.repeat(60) + '\n');

        results.tests.forEach((test, i) => {
            const icon = test.status === 'passed' ? '✅' : '❌';
            console.log(`  ${icon} [${i+1}] ${test.name}: ${test.status}`);
            if (test.error) console.log(`      Error: ${test.error}`);
        });

        await browser.close();
        await sequelize.close();

        console.log('\n✅ Test de prueba completado\n');
        process.exit(results.failed === 0 ? 0 : 1);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);

        if (browser) await browser.close();
        if (sequelize) await sequelize.close();

        process.exit(1);
    }
}

main();
