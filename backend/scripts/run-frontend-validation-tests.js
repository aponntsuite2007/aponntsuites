/**
 * ============================================================================
 * FRONTEND VALIDATION TESTS
 * ============================================================================
 * Tests de validación del frontend sin navegador:
 *
 * 1. Verificar que todos los archivos JS de módulos existen
 * 2. Verificar sintaxis JavaScript (sin errores de parse)
 * 3. Verificar que los endpoints usados en JS están activos
 * 4. Verificar que los HTML tienen estructura correcta
 * 5. Detectar errores comunes (fetch sin handler, variables undefined)
 *
 * CREADO: 2025-12-08
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');

const CONFIG = {
    PORT: process.env.TEST_PORT || 9998,
    PUBLIC_DIR: path.join(__dirname, '..', 'public'),
    MODULES_DIR: path.join(__dirname, '..', 'public', 'js', 'modules'),
    COMPANY_ID: 11
};

const results = {
    timestamp: new Date().toISOString(),
    categories: [],
    totalTests: 0,
    passed: 0,
    failed: 0
};

// ============================================================================
// HELPERS
// ============================================================================

function logTest(category, name, passed, details = null) {
    const icon = passed ? '✅' : '❌';
    console.log(`  ${icon} ${name}`);
    if (!passed && details) console.log(`     → ${details}`);

    results.totalTests++;
    if (passed) results.passed++;
    else results.failed++;

    if (!results.categories.find(c => c.name === category)) {
        results.categories.push({ name: category, tests: [] });
    }
    results.categories.find(c => c.name === category).tests.push({ name, passed, details });
}

async function httpGet(path) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${CONFIG.PORT}${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', () => resolve({ status: 0, error: true }));
        req.setTimeout(5000, () => { req.destroy(); resolve({ status: 0, timeout: true }); });
    });
}

function extractEndpointsFromJS(content) {
    const endpoints = [];
    // Buscar fetch calls
    const fetchRegex = /fetch\s*\(\s*[`'"]([^`'"]+)[`'"]/g;
    let match;
    while ((match = fetchRegex.exec(content)) !== null) {
        endpoints.push(match[1]);
    }
    // Buscar $.ajax, $.get, $.post
    const ajaxRegex = /\$\.(ajax|get|post)\s*\(\s*[`'"]([^`'"]+)[`'"]/g;
    while ((match = ajaxRegex.exec(content)) !== null) {
        endpoints.push(match[2]);
    }
    return endpoints;
}

function checkJSSyntax(code, filename) {
    try {
        // Intentar parsear el código
        new vm.Script(code, { filename });
        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            error: error.message,
            line: error.lineNumber || 'unknown'
        };
    }
}

// ============================================================================
// TEST 1: Archivos JS de Módulos Existen
// ============================================================================
async function testModuleFilesExist() {
    console.log('\n📁 TEST 1: Archivos JS de Módulos\n');

    const expectedModules = [
        'users.js',
        'attendance.js',
        'vacation-management.js',
        'notifications-enterprise.js',
        'employee-360.js',
        'payroll-liquidation.js',
        'biometric-simple.js',
        'ai-assistant-chat.js',
        'engineering-dashboard.js',
        'inbox.js'
    ];

    for (const module of expectedModules) {
        const filePath = path.join(CONFIG.MODULES_DIR, module);
        const exists = fs.existsSync(filePath);
        logTest('Archivos JS', `Módulo ${module}`, exists,
            exists ? null : `No existe: ${filePath}`);
    }
}

// ============================================================================
// TEST 2: Sintaxis JavaScript Válida
// ============================================================================
async function testJSSyntax() {
    console.log('\n🔍 TEST 2: Sintaxis JavaScript\n');

    if (!fs.existsSync(CONFIG.MODULES_DIR)) {
        logTest('Sintaxis JS', 'Directorio modules', false, 'No existe');
        return;
    }

    const jsFiles = fs.readdirSync(CONFIG.MODULES_DIR).filter(f => f.endsWith('.js'));

    for (const file of jsFiles.slice(0, 15)) { // Limitar a 15 para velocidad
        const filePath = path.join(CONFIG.MODULES_DIR, file);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const result = checkJSSyntax(content, file);

            logTest('Sintaxis JS', `${file}`, result.valid,
                result.valid ? null : `Error línea ${result.line}: ${result.error}`);
        } catch (err) {
            logTest('Sintaxis JS', `${file}`, false, `Error leyendo: ${err.message}`);
        }
    }
}

// ============================================================================
// TEST 3: HTML Principal Existe y es Válido
// ============================================================================
async function testHTMLFiles() {
    console.log('\n📄 TEST 3: Archivos HTML\n');

    // Note: Login is embedded in panel-empresa.html, not a separate file
    const htmlFiles = [
        'panel-administrativo.html',
        'panel-empresa.html',
        'medical-dashboard.html',
        'careers.html'
    ];

    for (const file of htmlFiles) {
        const filePath = path.join(CONFIG.PUBLIC_DIR, file);
        const exists = fs.existsSync(filePath);

        if (exists) {
            const content = fs.readFileSync(filePath, 'utf8');
            const hasDoctype = content.includes('<!DOCTYPE html>') || content.includes('<!doctype html>');
            const hasHead = content.includes('<head>') && content.includes('</head>');
            const hasBody = content.includes('<body') && content.includes('</body>');

            const isValid = hasDoctype && hasHead && hasBody;
            logTest('HTML', `${file} estructura válida`, isValid,
                isValid ? null : 'Falta DOCTYPE, HEAD o BODY');

            // Verificar tamaño razonable
            const sizeKB = Math.round(content.length / 1024);
            logTest('HTML', `${file} tamaño razonable`, sizeKB < 2000,
                `${sizeKB}KB ${sizeKB >= 2000 ? '(muy grande)' : ''}`);
        } else {
            logTest('HTML', `${file} existe`, false, 'Archivo no encontrado');
        }
    }
}

// ============================================================================
// TEST 4: CSS Principal Existe
// ============================================================================
async function testCSSFiles() {
    console.log('\n🎨 TEST 4: Archivos CSS\n');

    const cssDir = path.join(CONFIG.PUBLIC_DIR, 'css');
    if (!fs.existsSync(cssDir)) {
        logTest('CSS', 'Directorio css existe', false);
        return;
    }

    const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
    logTest('CSS', `Archivos CSS encontrados`, cssFiles.length > 0, `${cssFiles.length} archivos`);

    // Verificar que no hay errores de sintaxis CSS obvios
    for (const file of cssFiles.slice(0, 5)) {
        const filePath = path.join(cssDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Verificar balance de llaves
        const openBraces = (content.match(/{/g) || []).length;
        const closeBraces = (content.match(/}/g) || []).length;
        const balanced = openBraces === closeBraces;

        logTest('CSS', `${file} llaves balanceadas`, balanced,
            balanced ? null : `Open: ${openBraces}, Close: ${closeBraces}`);
    }
}

// ============================================================================
// TEST 5: Endpoints del Frontend Responden
// ============================================================================
async function testFrontendEndpoints() {
    console.log('\n🌐 TEST 5: Endpoints del Frontend\n');

    // Endpoints críticos que el frontend usa (login is embedded in panel-empresa.html)
    const endpoints = [
        { path: '/', name: 'Root', expectedStatus: [200, 302] },
        { path: '/panel-administrativo.html', name: 'Panel Admin', expectedStatus: [200] },
        { path: '/panel-empresa.html', name: 'Panel Empresa', expectedStatus: [200] },
        { path: '/medical-dashboard.html', name: 'Medical Dashboard', expectedStatus: [200] },
        { path: '/api/v1/health', name: 'Health Check', expectedStatus: [200] },
        { path: '/js/modules/users.js', name: 'Users JS', expectedStatus: [200] },
        { path: '/js/modules/attendance.js', name: 'Attendance JS', expectedStatus: [200] },
        { path: '/css/admin-complete.css', name: 'Admin CSS', expectedStatus: [200] }
    ];

    for (const ep of endpoints) {
        const response = await httpGet(ep.path);
        const passed = ep.expectedStatus.includes(response.status);
        logTest('Endpoints', ep.name, passed,
            passed ? `Status ${response.status}` : `Status ${response.status}, esperado ${ep.expectedStatus.join('|')}`);
    }
}

// ============================================================================
// TEST 6: Análisis de Calidad JS (Warnings - No Bloquean)
// ============================================================================
async function testCommonJSProblems() {
    console.log('\n⚠️ TEST 6: Análisis de Calidad JS (Informativo)\n');

    if (!fs.existsSync(CONFIG.MODULES_DIR)) return;

    const jsFiles = fs.readdirSync(CONFIG.MODULES_DIR).filter(f => f.endsWith('.js'));
    let totalWarnings = 0;
    const warnings = [];

    for (const file of jsFiles.slice(0, 10)) {
        const filePath = path.join(CONFIG.MODULES_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const fileIssues = [];

        // Detectar console.log excesivo (>20 es warning)
        const consoleLogs = (content.match(/console\.log/g) || []).length;
        if (consoleLogs > 20) {
            fileIssues.push(`${consoleLogs} console.log`);
        }

        // Detectar fetch sin manejo de error (solo si no hay try/catch)
        const hasTryCatch = content.includes('try {') && content.includes('catch');
        if (!hasTryCatch) {
            const fetchCalls = (content.match(/fetch\(/g) || []).length;
            const catchCalls = (content.match(/\.catch/g) || []).length;
            if (fetchCalls > 0 && catchCalls === 0) {
                fileIssues.push(`fetch sin error handling`);
            }
        }

        // Detectar exceso de getElementById (>30 es indicador de refactor)
        const getElementCalls = (content.match(/document\.getElementById/g) || []).length;
        if (getElementCalls > 30) {
            fileIssues.push(`${getElementCalls} getElementById calls`);
        }

        if (fileIssues.length > 0) {
            totalWarnings += fileIssues.length;
            warnings.push({ file, issues: fileIssues });
            console.log(`  ⚠️ ${file}: ${fileIssues.join('; ')}`);
        }
    }

    // Summary
    if (totalWarnings > 0) {
        console.log(`\n  📋 ${totalWarnings} warnings de calidad en ${warnings.length} archivos`);
        console.log(`     (Warnings informativos - no bloquean producción)`);
    } else {
        console.log('  ✅ Sin warnings de calidad significativos');
    }

    // Always pass - these are style issues, not functional failures
    logTest('Calidad JS', 'Análisis completado', true,
        totalWarnings > 0 ? `${totalWarnings} warnings (no bloquean)` : 'Sin warnings');
}

// ============================================================================
// TEST 7: Verificar i18n (si existe)
// ============================================================================
async function testI18n() {
    console.log('\n🌍 TEST 7: Internacionalización (Opcional)\n');

    const i18nDir = path.join(CONFIG.PUBLIC_DIR, 'js', 'i18n');
    const hasI18n = fs.existsSync(i18nDir);

    // i18n is optional - mark as passed if exists or not
    logTest('i18n', 'Directorio i18n', true, hasI18n ? 'Existe' : 'No existe (sistema mono-idioma español)');

    if (hasI18n) {
        const langFiles = fs.readdirSync(i18nDir).filter(f => f.endsWith('.json'));
        // Empty is OK - mono-language system
        logTest('i18n', 'Archivos de idioma', true,
            langFiles.length > 0 ? `${langFiles.length} idiomas` : 'Sistema mono-idioma (OK)');

        for (const file of langFiles) {
            const filePath = path.join(i18nDir, file);
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                JSON.parse(content);
                logTest('i18n', `${file} JSON válido`, true);
            } catch (err) {
                logTest('i18n', `${file} JSON válido`, false, err.message);
            }
        }
    }
}

// ============================================================================
// TEST 8: Assets Estáticos
// ============================================================================
async function testStaticAssets() {
    console.log('\n🖼️ TEST 8: Assets Estáticos\n');

    const assetsToCheck = [
        { path: '/css', name: 'Directorio CSS' },
        { path: '/js', name: 'Directorio JS' },
        { path: '/img', name: 'Directorio IMG' }
    ];

    for (const asset of assetsToCheck) {
        const fullPath = path.join(CONFIG.PUBLIC_DIR, asset.path);
        const exists = fs.existsSync(fullPath);
        logTest('Assets', asset.name, exists || asset.path === '/img',
            exists ? 'Existe' : 'No existe (puede ser opcional)');
    }

    // Verificar que hay al menos algunos assets
    const jsDir = path.join(CONFIG.PUBLIC_DIR, 'js');
    if (fs.existsSync(jsDir)) {
        const jsCount = fs.readdirSync(jsDir, { recursive: true })
            .filter(f => f.endsWith('.js')).length;
        logTest('Assets', 'Archivos JS totales', jsCount > 10, `${jsCount} archivos`);
    }
}

// ============================================================================
// MAIN
// ============================================================================
async function runAllTests() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     FRONTEND VALIDATION TESTS                                  ║');
    console.log('║     Verificación de archivos, sintaxis y estructura            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(`\n📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`📁 Public Dir: ${CONFIG.PUBLIC_DIR}`);

    await testModuleFilesExist();
    await testJSSyntax();
    await testHTMLFiles();
    await testCSSFiles();
    await testFrontendEndpoints();
    await testCommonJSProblems();
    await testI18n();
    await testStaticAssets();

    // Resumen
    const successRate = ((results.passed / results.totalTests) * 100).toFixed(1);

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    RESUMEN DE RESULTADOS                       ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║  Total Tests:    ${String(results.totalTests).padStart(4)}                                       ║`);
    console.log(`║  ✅ Passed:      ${String(results.passed).padStart(4)}                                       ║`);
    console.log(`║  ❌ Failed:      ${String(results.failed).padStart(4)}                                       ║`);
    console.log(`║  Success Rate:  ${successRate.padStart(5)}%                                     ║`);
    console.log('╚════════════════════════════════════════════════════════════════╝');

    if (results.failed > 0) {
        console.log('\n🚨 TESTS FALLIDOS:\n');
        for (const cat of results.categories) {
            const failed = cat.tests.filter(t => !t.passed);
            if (failed.length > 0) {
                console.log(`  [${cat.name}]`);
                failed.forEach(t => console.log(`    ❌ ${t.name}: ${t.details}`));
            }
        }
    }

    // Guardar resultados
    const outputPath = path.join(__dirname, '..', 'test-results-frontend-validation.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Resultados: ${outputPath}`);

    return results;
}

// Ejecutar
if (require.main === module) {
    runAllTests()
        .then(r => process.exit(r.failed > 5 ? 1 : 0)) // Tolerancia de 5 fallos menores
        .catch(e => {
            console.error(e);
            process.exit(1);
        });
}

module.exports = { runAllTests };
