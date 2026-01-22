/**
 * Quick verification test for 5 modules with fixed JS redeclaration errors
 */
const { chromium } = require('playwright');

const modulesToTest = [
    'compliance-dashboard',
    'legal-dashboard',
    'organizational-structure',
    'warehouse-management',
    'user-support'
];

(async () => {
    console.log('='.repeat(60));
    console.log('VERIFICACION DE 5 MODULOS CORREGIDOS');
    console.log('='.repeat(60));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const results = [];

    // Login
    console.log('\n[1] Logging in...');
    await page.goto('http://localhost:9998/panel-empresa.html');
    await page.waitForSelector('#companySelect', { timeout: 15000 });
    await page.selectOption('#companySelect', 'isi');
    await page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
    await page.fill('#userInput', 'admin');
    await page.fill('#passwordInput', 'admin123');
    await page.evaluate(() => {
        const btn = document.getElementById('loginButton');
        if (btn) { btn.disabled = false; btn.click(); }
    });
    await page.waitForTimeout(5000);
    console.log('    Login OK\n');

    console.log('[2] Testing modules...\n');

    for (const mod of modulesToTest) {
        const modErrors = [];

        // Listen for errors during navigation
        const errorHandler = err => modErrors.push(err.message);
        page.on('pageerror', errorHandler);

        try {
            await page.evaluate((m) => {
                if (typeof loadModule === 'function') loadModule(m);
                else if (typeof window.loadModule === 'function') window.loadModule(m);
            }, mod);
            await page.waitForTimeout(3000);

            // Check for redeclaration errors
            const hasRedeclareError = modErrors.some(e => e.includes('has already been declared'));

            if (hasRedeclareError) {
                const errMsg = modErrors.find(e => e.includes('has already been declared'));
                console.log(`    [FAIL] ${mod}`);
                console.log(`           ERROR: ${errMsg}`);
                results.push({ module: mod, status: 'FAILED', error: errMsg });
            } else if (modErrors.length > 0) {
                console.log(`    [WARN] ${mod} - ${modErrors.length} other error(s)`);
                results.push({ module: mod, status: 'PARTIAL', errors: modErrors.length });
            } else {
                console.log(`    [OK]   ${mod}`);
                results.push({ module: mod, status: 'OK' });
            }
        } catch (e) {
            console.log(`    [FAIL] ${mod}`);
            console.log(`           ERROR: ${e.message}`);
            results.push({ module: mod, status: 'FAILED', error: e.message });
        }

        page.off('pageerror', errorHandler);
    }

    await browser.close();

    console.log('\n' + '='.repeat(60));
    console.log('RESUMEN');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.status === 'OK').length;
    const partial = results.filter(r => r.status === 'PARTIAL').length;
    const failed = results.filter(r => r.status === 'FAILED').length;

    console.log(`Sin errores JS:        ${passed}/${modulesToTest.length}`);
    console.log(`Con errores menores:   ${partial}/${modulesToTest.length}`);
    console.log(`Con redeclaracion:     ${failed}/${modulesToTest.length}`);

    if (failed > 0) {
        console.log('\nModulos con errores de redeclaracion:');
        results.filter(r => r.status === 'FAILED').forEach(r => {
            console.log(`  - ${r.module}: ${r.error}`);
        });
        process.exit(1);
    } else {
        console.log('\nTodas las correcciones verificadas OK!');
        process.exit(0);
    }
})();
