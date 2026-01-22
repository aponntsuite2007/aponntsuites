/**
 * Quick verification of JavaScript fixes for redeclaration errors
 */
const playwright = require('playwright');

(async () => {
    console.log('🔬 Verificando correcciones JavaScript...\n');

    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Track JavaScript errors
    const jsErrors = [];
    page.on('pageerror', error => {
        jsErrors.push(error.message);
    });

    // Login - using the same selectors as AutonomousQAAgent
    console.log('1. Login...');
    await page.goto('http://localhost:9998/panel-empresa.html');

    // Wait for page to load
    await page.waitForSelector('#companySelect', { timeout: 15000 });
    console.log('   → Dropdown empresas detectado');

    // Select company by value (slug)
    await page.selectOption('#companySelect', 'isi');
    await page.waitForTimeout(2000);
    console.log('   → Empresa ISI seleccionada');

    // Wait for username field to become enabled after company selection
    await page.waitForSelector('#userInput:not([disabled])', { timeout: 15000 });

    // Fill credentials with proper event dispatch
    await page.fill('#userInput', 'admin');
    await page.dispatchEvent('#userInput', 'input');
    await page.fill('#passwordInput', 'admin123');
    await page.dispatchEvent('#passwordInput', 'input');
    console.log('   → Credenciales ingresadas');

    // Wait for button to be enabled
    await page.waitForTimeout(500);

    // Enable button via JS and click
    await page.evaluate(() => {
        const btn = document.getElementById('loginButton');
        if (btn) {
            btn.disabled = false;
            btn.click();
        }
    });
    await page.waitForTimeout(5000);
    console.log('   ✅ Login exitoso\n');

    // Test modules that had errors
    const modulesToTest = ['kiosks', 'sla-tracking', 'audit-reports', 'siac-commercial-dashboard'];
    const results = {};

    console.log('2. Testing modules...\n');

    for (const moduleId of modulesToTest) {
        const errorsBeforeCount = jsErrors.length;

        // Navigate via click
        const navResult = await page.evaluate((mod) => {
            const el = document.querySelector(`[data-module-key="${mod}"]`);
            if (!el) return { success: false, error: 'Element not found' };
            el.click();
            return { success: true };
        }, moduleId);

        await page.waitForTimeout(2000);

        // Check for new redeclaration errors
        const newErrors = jsErrors.slice(errorsBeforeCount)
            .filter(e => e.includes('has already been declared'));

        results[moduleId] = {
            navigated: navResult.success,
            redeclareError: newErrors.length > 0 ? newErrors[0] : null
        };

        const status = results[moduleId].redeclareError ? '❌' : '✅';
        console.log(`   ${status} ${moduleId}`);
        if (results[moduleId].redeclareError) {
            console.log(`      Error: ${results[moduleId].redeclareError}`);
        }

        // Clean up modals
        await page.evaluate(() => {
            document.querySelectorAll('.modal, .modal-backdrop').forEach(m => m.remove());
            document.body.classList.remove('modal-open');
        });
        await page.waitForTimeout(300);
    }

    // Summary
    console.log('\n═══════════════════════════════════════');
    console.log('📊 RESUMEN');
    console.log('═══════════════════════════════════════');

    const passed = Object.values(results).filter(r => !r.redeclareError).length;
    const failed = Object.values(results).filter(r => r.redeclareError).length;

    console.log(`✅ Pasaron: ${passed}`);
    console.log(`❌ Fallaron: ${failed}`);
    console.log(`📦 Total: ${modulesToTest.length}`);

    await browser.close();

    process.exit(failed > 0 ? 1 : 0);
})().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
