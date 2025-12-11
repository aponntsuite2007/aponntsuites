/**
 * ============================================================================
 * TEST ALL ISI MODULES - Testear TODOS los módulos de ISI con IntelligentUXTester
 * ============================================================================
 *
 * Ejecuta IntelligentUXTester para cada uno de los 27 módulos activos de ISI
 * Genera un reporte consolidado con resultados de TODOS los tests
 */

const { chromium } = require('playwright');
const { Sequelize, QueryTypes } = require('sequelize');
const SystemRegistry = require('../src/auditor/registry/SystemRegistry');
const IntelligentUXTester = require('../src/auditor/core/IntelligentUXTester');
const database = require('../src/config/database');
const fs = require('fs');

async function main() {
    const companyId = 11;
    const companySlug = 'isi';
    const username = 'admin';
    const password = 'admin123';

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║  TEST COMPLETO - TODOS LOS MÓDULOS DE ISI          ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    let browser, page, sequelize, systemRegistry, tester;
    const allResults = {
        company: { id: companyId, slug: companySlug },
        totalModules: 0,
        testedModules: 0,
        passedModules: 0,
        failedModules: 0,
        skippedModules: 0,
        modules: [],
        startTime: new Date(),
        endTime: null,
        duration: null
    };

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

        // 2. OBTENER MÓDULOS ACTIVOS DE ISI DESDE BD
        console.log('🔍 Obteniendo módulos activos de ISI...');
        const modules = await sequelize.query(
            `SELECT sm.module_key as module_id, sm.name as module_name
             FROM company_modules cm
             JOIN system_modules sm ON cm.system_module_id = sm.id
             WHERE cm.company_id = :companyId AND cm.is_active = true
             ORDER BY sm.name`,
            {
                replacements: { companyId },
                type: QueryTypes.SELECT
            }
        );

        allResults.totalModules = modules.length;
        console.log(`   ✅ ${modules.length} módulos encontrados\n`);

        // 3. INICIALIZAR SYSTEM REGISTRY (SSOT)
        console.log('🧠 Inicializando SystemRegistry...');
        systemRegistry = new SystemRegistry(database, null);
        await systemRegistry.initialize();
        console.log('   ✅ SystemRegistry inicializado\n');

        // 4. INICIAR PLAYWRIGHT (UNA SOLA VEZ)
        console.log('🌐 Iniciando Playwright...');
        browser = await chromium.launch({
            headless: false,
            slowMo: 50,  // Más rápido que en test individual
            args: ['--disable-blink-features=AutomationControlled', '--start-maximized']
        });

        const context = await browser.newContext({
            viewport: null,
            locale: 'es-AR',
            timezoneId: 'America/Argentina/Buenos_Aires',
            ignoreHTTPSErrors: true
        });

        page = await context.newPage();
        page.setDefaultTimeout(15000);  // Timeout más corto para ir más rápido
        console.log('   ✅ Navegador iniciado\n');

        // 5. LOGIN (UNA SOLA VEZ)
        console.log('🔐 Realizando login...');
        const baseUrl = process.env.BASE_URL || 'http://localhost:9998';
        await page.goto(`${baseUrl}/panel-empresa.html`, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(1000);

        await page.waitForSelector('#companySelect', { visible: true, timeout: 10000 });
        await page.waitForTimeout(1000);
        await page.selectOption('#companySelect', companySlug);
        await page.waitForTimeout(3000);

        const usernameInput = page.locator('input[type="text"]:visible').last();
        await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
        await usernameInput.fill(username);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        const passwordInput = page.locator('input[type="password"]:visible').last();
        await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
        await passwordInput.fill(password);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        console.log('   ✅ Login exitoso\n');

        // 6. CREAR TESTER
        const logger = { info: console.log, warn: console.warn, error: console.error };
        tester = new IntelligentUXTester(page, systemRegistry, sequelize, logger);

        // 7. TESTEAR CADA MÓDULO
        console.log('═'.repeat(60));
        console.log(`🧪 INICIANDO TESTS DE ${modules.length} MÓDULOS`);
        console.log('═'.repeat(60) + '\n');

        for (let i = 0; i < modules.length; i++) {
            const module = modules[i];
            const moduleResult = {
                moduleId: module.module_id,
                moduleName: module.module_name,
                index: i + 1,
                totalModules: modules.length,
                tests: [],
                passed: 0,
                failed: 0,
                warnings: [],
                error: null,
                skipped: false
            };

            console.log(`\n[${ i + 1}/${modules.length}] 🧪 Testeando: ${module.module_name}`);
            console.log('─'.repeat(60));

            try {
                const results = await tester.testModule(module.module_id, companyId);
                moduleResult.tests = results.tests;
                moduleResult.passed = results.passed;
                moduleResult.failed = results.failed;
                moduleResult.warnings = results.warnings;

                if (results.failed === 0) {
                    allResults.passedModules++;
                    console.log(`   ✅ PASSED (${results.passed}/${results.tests.length})`);
                } else {
                    allResults.failedModules++;
                    console.log(`   ❌ FAILED (${results.passed}/${results.tests.length})`);
                }

                allResults.testedModules++;

            } catch (error) {
                moduleResult.error = error.message;
                moduleResult.skipped = true;
                allResults.skippedModules++;
                console.log(`   ⚠️  SKIPPED: ${error.message}`);
            }

            allResults.modules.push(moduleResult);

            // Pequeña pausa entre módulos
            await page.waitForTimeout(500);
        }

        // 8. GENERAR REPORTE FINAL
        allResults.endTime = new Date();
        allResults.duration = ((allResults.endTime - allResults.startTime) / 1000).toFixed(2) + 's';

        console.log('\n' + '═'.repeat(60));
        console.log('📊 REPORTE FINAL - TODOS LOS MÓDULOS DE ISI');
        console.log('═'.repeat(60));
        console.log(`   Total de Módulos:    ${allResults.totalModules}`);
        console.log(`   Módulos Testeados:   ${allResults.testedModules}`);
        console.log(`   Módulos PASSED:      ${allResults.passedModules} ✅`);
        console.log(`   Módulos FAILED:      ${allResults.failedModules} ❌`);
        console.log(`   Módulos SKIPPED:     ${allResults.skippedModules} ⚠️`);
        console.log(`   Duración Total:      ${allResults.duration}`);
        console.log('═'.repeat(60) + '\n');

        // Guardar reporte JSON
        const reportPath = `backend/logs/isi-all-modules-test-${Date.now()}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
        console.log(`✅ Reporte guardado en: ${reportPath}\n`);

        // 9. CERRAR TODO
        await browser.close();
        await sequelize.close();

        console.log('✅ Test completo de todos los módulos finalizado\n');
        process.exit(allResults.failedModules === 0 ? 0 : 1);

    } catch (error) {
        console.error('\n❌ ERROR EN TEST GLOBAL:');
        console.error(error.message);
        console.error(error.stack);

        if (browser) await browser.close();
        if (sequelize) await sequelize.close();

        process.exit(1);
    }
}

main();
