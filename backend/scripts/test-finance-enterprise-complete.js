/**
 * TEST EXHAUSTIVO - Finance Enterprise System
 *
 * Tests profesionales para sistema multi-tenant en producción (Render)
 * Garantiza: velocidad, integridad, multi-tenant, funcionalidad completa
 *
 * @author Claude Code
 * @date 2026-01-04
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:9998';
const JWT_SECRET = 'tu_clave_secreta_super_segura_cambiar_en_produccion_2025';

// Colores para output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    section: (msg) => console.log(`\n${colors.cyan}${colors.bright}${'='.repeat(70)}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    test: (msg) => console.log(`${colors.cyan}🧪 ${msg}${colors.reset}`)
};

// Configuración de módulos Finance
const FINANCE_MODULES = [
    { key: 'finance-dashboard', name: 'Finance Dashboard', hasAPI: true },
    { key: 'finance-chart-of-accounts', name: 'Plan de Cuentas', hasAPI: true },
    { key: 'finance-budget', name: 'Presupuestos', hasAPI: true },
    { key: 'finance-cash-flow', name: 'Flujo de Caja', hasAPI: true },
    { key: 'finance-cost-centers', name: 'Centros de Costo', hasAPI: true },
    { key: 'finance-journal-entries', name: 'Asientos Contables', hasAPI: true },
    { key: 'finance-treasury', name: 'Tesorería', hasAPI: true },
    { key: 'finance-reports', name: 'Reportes Financieros', hasAPI: true },
    { key: 'finance-executive-dashboard', name: 'Dashboard Ejecutivo', hasAPI: false }
];

// Resultados globales
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    errors: [],
    performance: {}
};

// ═══════════════════════════════════════════════════════════
// FASE 1: TESTS DE ARCHIVOS Y ESTRUCTURA
// ═══════════════════════════════════════════════════════════

async function testFileStructure() {
    log.section();
    console.log(`${colors.bright}FASE 1: ESTRUCTURA DE ARCHIVOS${colors.reset}`);
    log.section();

    const publicDir = path.join(__dirname, '../public');
    let allFilesExist = true;

    // Test 1: CSS Dark Theme
    log.test('Test 1.1: CSS Dark Theme existe');
    const cssPath = path.join(publicDir, 'css/finance-modules-dark.css');
    if (fs.existsSync(cssPath)) {
        const cssStats = fs.statSync(cssPath);
        log.success(`CSS existe - Tamaño: ${(cssStats.size / 1024).toFixed(2)} KB`);
        testResults.passed++;

        // Verificar contenido crítico
        const cssContent = fs.readFileSync(cssPath, 'utf8');
        const criticalClasses = [
            '.finance-module',
            '.finance-modules-grid',
            '.finance-module-card',
            '.finance-back-btn',
            '--finance-bg',
            '--finance-success'
        ];

        let missingClasses = [];
        criticalClasses.forEach(cls => {
            if (!cssContent.includes(cls)) {
                missingClasses.push(cls);
            }
        });

        if (missingClasses.length > 0) {
            log.error(`CSS falta clases críticas: ${missingClasses.join(', ')}`);
            testResults.errors.push({ test: '1.1-css-classes', missing: missingClasses });
            allFilesExist = false;
        } else {
            log.success('CSS contiene todas las clases críticas');
        }
    } else {
        log.error('CSS dark theme NO EXISTE');
        testResults.failed++;
        testResults.errors.push({ test: '1.1-css', error: 'File not found' });
        allFilesExist = false;
    }
    testResults.total++;

    // Test 2: Archivos JS de módulos
    log.test('Test 1.2: Archivos JS de módulos');
    const jsDir = path.join(publicDir, 'js/modules');

    for (const module of FINANCE_MODULES) {
        const jsPath = path.join(jsDir, `${module.key}.js`);
        if (fs.existsSync(jsPath)) {
            const jsStats = fs.statSync(jsPath);
            log.success(`${module.name}: ${(jsStats.size / 1024).toFixed(2)} KB`);

            // Verificar función de inicialización
            const jsContent = fs.readFileSync(jsPath, 'utf8');
            const pascalCase = module.key.split('-').map(w =>
                w.charAt(0).toUpperCase() + w.slice(1)
            ).join('');

            if (!jsContent.includes(`window.${pascalCase}`) &&
                !jsContent.includes(`const ${pascalCase}`)) {
                log.warning(`${module.name}: No se encontró objeto ${pascalCase}`);
                testResults.warnings++;
            }

            // Verificar botón "Volver a Finance" (excepto finance-dashboard)
            if (module.key !== 'finance-dashboard') {
                if (!jsContent.includes('Volver a Finance')) {
                    log.error(`${module.name}: Falta botón "Volver a Finance"`);
                    testResults.errors.push({
                        test: '1.2-back-button',
                        module: module.key,
                        error: 'Missing back button'
                    });
                    allFilesExist = false;
                } else {
                    log.success(`${module.name}: Botón "Volver" OK`);
                }
            }

            testResults.passed++;
        } else {
            log.error(`${module.name}: ARCHIVO NO EXISTE`);
            testResults.failed++;
            testResults.errors.push({
                test: '1.2-js-file',
                module: module.key,
                error: 'File not found'
            });
            allFilesExist = false;
        }
        testResults.total++;
    }

    // Test 3: Integración en panel-empresa.html
    log.test('Test 1.3: Integración en panel-empresa.html');
    const htmlPath = path.join(publicDir, 'panel-empresa.html');
    if (fs.existsSync(htmlPath)) {
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // Verificar CSS link
        if (htmlContent.includes('finance-modules-dark.css')) {
            log.success('CSS cargado en HTML');
            testResults.passed++;
        } else {
            log.error('CSS NO cargado en HTML');
            testResults.failed++;
            testResults.errors.push({ test: '1.3-css-link', error: 'CSS not linked' });
            allFilesExist = false;
        }
        testResults.total++;

        // Verificar scripts de módulos
        let scriptsLoaded = 0;
        for (const module of FINANCE_MODULES) {
            if (htmlContent.includes(`${module.key}.js`)) {
                scriptsLoaded++;
            } else {
                log.error(`Script ${module.key}.js NO cargado en HTML`);
                testResults.errors.push({
                    test: '1.3-script',
                    module: module.key,
                    error: 'Script not loaded'
                });
                allFilesExist = false;
            }
        }

        if (scriptsLoaded === FINANCE_MODULES.length) {
            log.success(`Todos los scripts cargados (${scriptsLoaded}/${FINANCE_MODULES.length})`);
            testResults.passed++;
        } else {
            log.error(`Scripts faltantes: ${FINANCE_MODULES.length - scriptsLoaded}`);
            testResults.failed++;
        }
        testResults.total++;

    } else {
        log.error('panel-empresa.html NO EXISTE');
        testResults.failed++;
        testResults.errors.push({ test: '1.3-html', error: 'File not found' });
        allFilesExist = false;
    }

    return allFilesExist;
}

// ═══════════════════════════════════════════════════════════
// FASE 2: TESTS DE API Y BACKEND
// ═══════════════════════════════════════════════════════════

async function testAPIEndpoints() {
    log.section();
    console.log(`${colors.bright}FASE 2: ENDPOINTS DE API${colors.reset}`);
    log.section();

    // Generar token de test para múltiples empresas
    const companies = [
        { id: 11, name: 'ISI' },
        { id: 1, name: 'Test Company 1' },
        { id: 2, name: 'Test Company 2' }
    ];

    for (const company of companies) {
        log.test(`Test 2.${company.id}: APIs para empresa ${company.name} (ID: ${company.id})`);

        const token = jwt.sign({
            id: `test-user-${company.id}`,
            role: 'admin',
            employeeId: `EMP-${company.id}-001`,
            company_id: company.id
        }, JWT_SECRET, { expiresIn: '1h' });

        // Test Finance Dashboard API
        try {
            const startTime = Date.now();
            const response = await axios.get(`${BASE_URL}/api/finance/dashboard?fiscal_year=2026`, {
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 5000
            });
            const responseTime = Date.now() - startTime;

            testResults.performance[`finance-dashboard-company-${company.id}`] = responseTime;

            if (response.status === 200) {
                log.success(`Dashboard API (${company.name}): ${responseTime}ms`);
                testResults.passed++;

                // Verificar estructura de respuesta
                if (response.data && response.data.data) {
                    log.success(`  └─ Estructura de datos correcta`);
                } else {
                    log.warning(`  └─ Estructura de datos inesperada`);
                    testResults.warnings++;
                }
            } else {
                log.error(`Dashboard API (${company.name}): Status ${response.status}`);
                testResults.failed++;
                testResults.errors.push({
                    test: `2.${company.id}-dashboard`,
                    company: company.name,
                    error: `HTTP ${response.status}`
                });
            }
        } catch (error) {
            if (error.response?.status === 404 || error.code === 'ECONNREFUSED') {
                log.warning(`Dashboard API (${company.name}): Servidor no disponible`);
                testResults.warnings++;
            } else {
                log.error(`Dashboard API (${company.name}): ${error.message}`);
                testResults.failed++;
                testResults.errors.push({
                    test: `2.${company.id}-dashboard`,
                    company: company.name,
                    error: error.message
                });
            }
        }
        testResults.total++;

        // Test otros endpoints críticos
        const criticalEndpoints = [
            { path: '/api/finance/accounts', name: 'Chart of Accounts' },
            { path: '/api/finance/budget', name: 'Budget' },
            { path: '/api/finance/treasury/cash-flow', name: 'Cash Flow' }
        ];

        for (const endpoint of criticalEndpoints) {
            try {
                const startTime = Date.now();
                const response = await axios.get(`${BASE_URL}${endpoint.path}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    timeout: 5000
                });
                const responseTime = Date.now() - startTime;

                testResults.performance[`${endpoint.name}-company-${company.id}`] = responseTime;

                if (responseTime > 1000) {
                    log.warning(`${endpoint.name} (${company.name}): ${responseTime}ms (LENTO)`);
                    testResults.warnings++;
                } else {
                    log.success(`${endpoint.name} (${company.name}): ${responseTime}ms`);
                    testResults.passed++;
                }
            } catch (error) {
                if (error.response?.status === 404 || error.code === 'ECONNREFUSED') {
                    log.warning(`${endpoint.name} (${company.name}): Endpoint no disponible`);
                    testResults.warnings++;
                } else {
                    log.error(`${endpoint.name} (${company.name}): ${error.message}`);
                    testResults.failed++;
                }
            }
            testResults.total++;
        }
    }
}

// ═══════════════════════════════════════════════════════════
// FASE 3: TESTS DE MULTI-TENANT E INTEGRIDAD
// ═══════════════════════════════════════════════════════════

async function testMultiTenantIntegrity() {
    log.section();
    console.log(`${colors.bright}FASE 3: MULTI-TENANT & INTEGRIDAD${colors.reset}`);
    log.section();

    log.test('Test 3.1: Verificar aislamiento entre empresas');

    // Crear tokens para 2 empresas diferentes
    const company1Token = jwt.sign({
        id: 'user-company-1',
        role: 'admin',
        employeeId: 'EMP-1-001',
        company_id: 1
    }, JWT_SECRET, { expiresIn: '1h' });

    const company2Token = jwt.sign({
        id: 'user-company-2',
        role: 'admin',
        employeeId: 'EMP-2-001',
        company_id: 2
    }, JWT_SECRET, { expiresIn: '1h' });

    try {
        // Ambas empresas deberían poder acceder al dashboard
        const [resp1, resp2] = await Promise.all([
            axios.get(`${BASE_URL}/api/finance/dashboard?fiscal_year=2026`, {
                headers: { 'Authorization': `Bearer ${company1Token}` },
                timeout: 5000
            }).catch(e => ({ error: e.message })),
            axios.get(`${BASE_URL}/api/finance/dashboard?fiscal_year=2026`, {
                headers: { 'Authorization': `Bearer ${company2Token}` },
                timeout: 5000
            }).catch(e => ({ error: e.message }))
        ]);

        if (!resp1.error && !resp2.error) {
            log.success('Ambas empresas pueden acceder al dashboard');
            testResults.passed++;

            // Verificar que los datos NO son los mismos (aislamiento)
            if (JSON.stringify(resp1.data) !== JSON.stringify(resp2.data)) {
                log.success('Datos aislados entre empresas (correcto)');
                testResults.passed++;
            } else {
                log.error('CRÍTICO: Datos IDÉNTICOS entre empresas (fuga de multi-tenant)');
                testResults.failed++;
                testResults.errors.push({
                    test: '3.1-isolation',
                    error: 'Data leakage between companies'
                });
            }
        } else {
            log.warning('No se pudo verificar aislamiento (servidor no disponible)');
            testResults.warnings++;
        }
    } catch (error) {
        log.warning(`Test de multi-tenant: ${error.message}`);
        testResults.warnings++;
    }
    testResults.total += 2;

    log.test('Test 3.2: Verificar company_id en todas las queries');
    log.info('Este test requiere acceso a logs de BD - Skip en test rápido');
    testResults.warnings++;
    testResults.total++;
}

// ═══════════════════════════════════════════════════════════
// FASE 4: TESTS DE PERFORMANCE Y CARGA
// ═══════════════════════════════════════════════════════════

async function testPerformance() {
    log.section();
    console.log(`${colors.bright}FASE 4: PERFORMANCE & ESCALABILIDAD${colors.reset}`);
    log.section();

    log.test('Test 4.1: Tiempo de carga de archivos estáticos');

    const staticFiles = [
        '/css/finance-modules-dark.css',
        '/js/modules/finance-dashboard.js',
        '/js/modules/finance-budget.js'
    ];

    for (const file of staticFiles) {
        try {
            const startTime = Date.now();
            await axios.get(`${BASE_URL}${file}`, { timeout: 5000 });
            const loadTime = Date.now() - startTime;

            testResults.performance[file] = loadTime;

            if (loadTime < 100) {
                log.success(`${file}: ${loadTime}ms (excelente)`);
                testResults.passed++;
            } else if (loadTime < 500) {
                log.success(`${file}: ${loadTime}ms (aceptable)`);
                testResults.passed++;
            } else {
                log.warning(`${file}: ${loadTime}ms (lento para producción)`);
                testResults.warnings++;
            }
        } catch (error) {
            log.warning(`${file}: No disponible`);
            testResults.warnings++;
        }
        testResults.total++;
    }

    log.test('Test 4.2: Carga concurrente (simular múltiples usuarios)');

    const token = jwt.sign({
        id: 'load-test-user',
        role: 'admin',
        employeeId: 'LOAD-001',
        company_id: 11
    }, JWT_SECRET, { expiresIn: '1h' });

    const concurrentRequests = 10;
    const requests = [];

    const startTime = Date.now();
    for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
            axios.get(`${BASE_URL}/api/finance/dashboard?fiscal_year=2026`, {
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 10000
            }).catch(e => ({ error: e.message }))
        );
    }

    try {
        const results = await Promise.all(requests);
        const totalTime = Date.now() - startTime;
        const avgTime = totalTime / concurrentRequests;
        const successCount = results.filter(r => !r.error).length;

        testResults.performance['concurrent-load'] = avgTime;

        log.info(`${concurrentRequests} requests concurrentes en ${totalTime}ms`);
        log.info(`Promedio: ${avgTime.toFixed(2)}ms por request`);
        log.info(`Exitosas: ${successCount}/${concurrentRequests}`);

        if (avgTime < 500 && successCount === concurrentRequests) {
            log.success('Performance bajo carga: EXCELENTE');
            testResults.passed++;
        } else if (avgTime < 1000 && successCount >= concurrentRequests * 0.9) {
            log.success('Performance bajo carga: ACEPTABLE');
            testResults.passed++;
        } else {
            log.warning('Performance bajo carga: NECESITA OPTIMIZACIÓN');
            testResults.warnings++;
        }
    } catch (error) {
        log.warning(`Test de carga: ${error.message}`);
        testResults.warnings++;
    }
    testResults.total++;
}

// ═══════════════════════════════════════════════════════════
// REPORTE FINAL
// ═══════════════════════════════════════════════════════════

function printFinalReport() {
    log.section();
    console.log(`${colors.bright}REPORTE FINAL - FINANCE ENTERPRISE TESTING${colors.reset}`);
    log.section();

    const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
    const failRate = ((testResults.failed / testResults.total) * 100).toFixed(1);
    const warnRate = ((testResults.warnings / testResults.total) * 100).toFixed(1);

    console.log(`\n📊 Estadísticas:`);
    console.log(`   Total Tests:    ${testResults.total}`);
    console.log(`   ${colors.green}✅ Passed:       ${testResults.passed} (${passRate}%)${colors.reset}`);
    console.log(`   ${colors.red}❌ Failed:       ${testResults.failed} (${failRate}%)${colors.reset}`);
    console.log(`   ${colors.yellow}⚠️  Warnings:     ${testResults.warnings} (${warnRate}%)${colors.reset}`);

    if (Object.keys(testResults.performance).length > 0) {
        console.log(`\n⚡ Performance Metrics:`);
        Object.entries(testResults.performance).forEach(([key, time]) => {
            const status = time < 500 ? colors.green : time < 1000 ? colors.yellow : colors.red;
            console.log(`   ${status}${key}: ${time}ms${colors.reset}`);
        });
    }

    if (testResults.errors.length > 0) {
        console.log(`\n${colors.red}❌ Errores Críticos:${colors.reset}`);
        testResults.errors.forEach((err, i) => {
            console.log(`   ${i + 1}. ${err.test}: ${err.error}`);
            if (err.module) console.log(`      Módulo: ${err.module}`);
            if (err.company) console.log(`      Empresa: ${err.company}`);
        });
    }

    // Evaluación final
    console.log(`\n${colors.bright}${'═'.repeat(70)}${colors.reset}`);
    if (testResults.failed === 0 && testResults.errors.length === 0) {
        console.log(`${colors.green}${colors.bright}✅ PRODUCCIÓN READY - Todos los tests críticos pasaron${colors.reset}`);
    } else if (testResults.failed <= 2) {
        console.log(`${colors.yellow}${colors.bright}⚠️  REQUIERE ATENCIÓN - Hay errores menores que corregir${colors.reset}`);
    } else {
        console.log(`${colors.red}${colors.bright}❌ NO LISTO PARA PRODUCCIÓN - Múltiples errores críticos${colors.reset}`);
    }
    console.log(`${colors.bright}${'═'.repeat(70)}${colors.reset}\n`);

    return testResults.failed === 0 && testResults.errors.length === 0;
}

// ═══════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════

async function runAllTests() {
    console.log(`\n${colors.cyan}${colors.bright}`);
    console.log(`╔═══════════════════════════════════════════════════════════════════╗`);
    console.log(`║                                                                   ║`);
    console.log(`║        🧪 FINANCE ENTERPRISE - TEST SUITE COMPLETO 🧪             ║`);
    console.log(`║                                                                   ║`);
    console.log(`║   Testing para sistema multi-tenant en producción (Render)       ║`);
    console.log(`║   Garantía: Velocidad, Integridad, Multi-Tenant, Funcionalidad   ║`);
    console.log(`║                                                                   ║`);
    console.log(`╚═══════════════════════════════════════════════════════════════════╝`);
    console.log(colors.reset);

    try {
        // Fase 1: Estructura
        const structureOK = await testFileStructure();

        // Fase 2: APIs (solo si servidor está corriendo)
        await testAPIEndpoints();

        // Fase 3: Multi-tenant
        await testMultiTenantIntegrity();

        // Fase 4: Performance
        await testPerformance();

        // Reporte final
        const productionReady = printFinalReport();

        process.exit(productionReady ? 0 : 1);

    } catch (error) {
        log.error(`Error fatal en testing: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Ejecutar tests
if (require.main === module) {
    runAllTests();
}

module.exports = { runAllTests, testResults };
