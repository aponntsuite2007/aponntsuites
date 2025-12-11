/**
 * ============================================================================
 * TEST INTELLIGENT UX - Prueba del IntelligentUXTester
 * ============================================================================
 *
 * Script para probar el IntelligentUXTester con un módulo específico
 * Usa SSOT (SystemRegistry) en lugar de selectores hardcodeados
 *
 * Uso:
 *   node scripts/test-intelligent-ux.js [moduleId] [companyId] [companySlug]
 *
 * Ejemplo:
 *   node scripts/test-intelligent-ux.js departments 11 isi
 */

const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');
const SystemRegistry = require('../src/auditor/registry/SystemRegistry');
const IntelligentUXTester = require('../src/auditor/core/IntelligentUXTester');
const database = require('../src/config/database');

async function main() {
    // Parsear argumentos
    const moduleId = process.argv[2] || 'departments';
    const companyId = parseInt(process.argv[3]) || 11;
    const companySlug = process.argv[4] || 'isi';
    const username = process.argv[5] || 'admin';
    const password = process.argv[6] || 'admin123';

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║  INTELLIGENT UX TESTER - Test con SSOT            ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    console.log(`   Módulo:    ${moduleId}`);
    console.log(`   Empresa:   ${companySlug} (ID: ${companyId})`);
    console.log(`   Usuario:   ${username}`);
    console.log(`   Password:  ${'*'.repeat(password.length)}\n`);

    let browser, page, sequelize, systemRegistry, tester;

    try {
        // 1. CONECTAR A POSTGRESQL
        console.log('📊 Conectando a PostgreSQL...');
        const dbUser = process.env.POSTGRES_USER || 'postgres';
        const dbPassword = process.env.POSTGRES_PASSWORD || 'Aedr15150302';
        const dbHost = process.env.POSTGRES_HOST || 'localhost';
        const dbPort = process.env.POSTGRES_PORT || '5432';
        const dbName = process.env.POSTGRES_DB || 'attendance_system';
        const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

        sequelize = new Sequelize(
            process.env.DATABASE_URL || connectionString,
            {
                dialect: 'postgres',
                logging: false
            }
        );
        await sequelize.authenticate();
        console.log('   ✅ PostgreSQL conectado\n');

        // 2. INICIALIZAR SYSTEM REGISTRY (SSOT)
        console.log('🧠 Inicializando SystemRegistry (SSOT)...');
        systemRegistry = new SystemRegistry(database, null);
        await systemRegistry.initialize();
        console.log('   ✅ SystemRegistry inicializado\n');

        // 3. INICIAR PLAYWRIGHT
        console.log('🌐 Iniciando Playwright (navegador visible)...');
        browser = await chromium.launch({
            headless: false,
            slowMo: 100,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--start-maximized'
            ]
        });

        const context = await browser.newContext({
            viewport: null,
            locale: 'es-AR',
            timezoneId: 'America/Argentina/Buenos_Aires',
            ignoreHTTPSErrors: true
        });

        page = await context.newPage();
        page.setDefaultTimeout(30000);
        console.log('   ✅ Navegador iniciado\n');

        // 4. LOGIN (3 PASOS - Mismo que Phase4TestOrchestrator)
        console.log('🔐 Realizando login...');
        const baseUrl = process.env.BASE_URL || 'http://localhost:9998';
        await page.goto(`${baseUrl}/panel-empresa.html`, {
            waitUntil: 'networkidle',
            timeout: 60000
        });
        await page.waitForTimeout(1000);

        // PASO 1: Seleccionar empresa del dropdown
        console.log(`   📍 PASO 1: Seleccionando empresa "${companySlug}"`);
        await page.waitForSelector('#companySelect', { visible: true, timeout: 10000 });
        await page.waitForTimeout(1000);
        await page.selectOption('#companySelect', companySlug);
        await page.waitForTimeout(5000); // Esperar a que aparezca campo usuario

        // PASO 2: Ingresar usuario
        console.log(`   📍 PASO 2: Ingresando usuario "${username}"`);
        const usernameInput = page.locator('input[type="text"]:visible').last();
        await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
        await usernameInput.fill(username);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);

        // PASO 3: Ingresar password
        console.log(`   📍 PASO 3: Ingresando password`);
        const passwordInput = page.locator('input[type="password"]:visible').last();
        await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
        await passwordInput.fill(password);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        console.log('   ✅ Login exitoso\n');

        // 5. CREAR INTELLIGENT UX TESTER
        console.log('🤖 Inicializando IntelligentUXTester...');
        const logger = { info: console.log, warn: console.warn, error: console.error };
        tester = new IntelligentUXTester(page, systemRegistry, sequelize, logger);
        console.log('   ✅ Tester inicializado\n');

        // 6. EJECUTAR TEST DEL MÓDULO
        console.log('═'.repeat(60));
        console.log(`🧪 INICIANDO TEST INTELIGENTE DEL MÓDULO: ${moduleId.toUpperCase()}`);
        console.log('═'.repeat(60) + '\n');

        const results = await tester.testModule(moduleId, companyId);

        // 7. MOSTRAR RESULTADOS
        console.log('\n' + '═'.repeat(60));
        console.log('📊 RESULTADOS DEL TEST');
        console.log('═'.repeat(60));
        console.log(`   Tests Ejecutados: ${results.tests.length}`);
        console.log(`   Tests PASSED:     ${results.passed} ✅`);
        console.log(`   Tests FAILED:     ${results.failed} ❌`);

        if (results.warnings.length > 0) {
            console.log(`\n⚠️  WARNINGS (${results.warnings.length}):`);
            results.warnings.forEach(w => console.log(`   - ${w}`));
        }

        console.log('\n📋 DETALLE DE TESTS:');
        results.tests.forEach((test, idx) => {
            const icon = test.status === 'passed' ? '✅' : '❌';
            console.log(`   ${icon} ${idx + 1}. ${test.name} - ${test.status.toUpperCase()}`);
            if (test.error) {
                console.log(`      Error: ${test.error}`);
            }
            if (test.count !== undefined) {
                console.log(`      Registros en BD: ${test.count}`);
            }
        });

        console.log('═'.repeat(60) + '\n');

        // Mantener navegador abierto 5 segundos para ver el resultado
        console.log('⏳ Manteniendo navegador abierto 5 segundos...');
        await page.waitForTimeout(5000);

        // 8. CERRAR TODO
        await browser.close();
        await sequelize.close();

        console.log('\n✅ Test completado exitosamente\n');

        // Exit code basado en resultados
        process.exit(results.failed === 0 ? 0 : 1);

    } catch (error) {
        console.error('\n❌ ERROR EN TEST:');
        console.error(error.message);
        console.error(error.stack);

        if (browser) await browser.close();
        if (sequelize) await sequelize.close();

        process.exit(1);
    }
}

main();
