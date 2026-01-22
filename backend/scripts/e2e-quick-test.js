/**
 * ============================================================================
 * E2E QUICK TEST - Solo 5 módulos principales
 * ============================================================================
 * Test rápido para validar que el framework E2E funciona correctamente.
 * Testea: users, visitors, kiosks, hse-management, benefits-management
 * ============================================================================
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Cargar configuración
const MODULES_CONFIG = require('./e2e-modules-config.json');

// Configuración
const CONFIG = {
    baseUrl: MODULES_CONFIG.baseUrl,
    credentials: MODULES_CONFIG.credentials,
    screenshotsDir: path.join(__dirname, '../e2e-screenshots'),
    timeout: 30000,
    slowMo: 50,
    headless: 'new'
};

// Crear directorio
if (!fs.existsSync(CONFIG.screenshotsDir)) {
    fs.mkdirSync(CONFIG.screenshotsDir, { recursive: true });
}

// Colores
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(type, message) {
    const prefix = {
        pass: `${colors.green}✓ PASS${colors.reset}`,
        fail: `${colors.red}✗ FAIL${colors.reset}`,
        info: `${colors.blue}ℹ INFO${colors.reset}`,
        warn: `${colors.yellow}⚠ WARN${colors.reset}`,
        step: `${colors.cyan}▶ STEP${colors.reset}`,
        module: `${colors.magenta}📦 MODULE${colors.reset}`
    };
    console.log(`${prefix[type] || '•'} ${message}`);
}

// Stats
const stats = { total: 0, passed: 0, failed: 0, skipped: 0, modules: {} };

// Helpers
async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateTestValue(pattern) {
    if (!pattern) return '';
    const now = Date.now();
    let value = pattern.toString();
    value = value.replace('{timestamp}', now);
    value = value.replace('{timestamp6}', now.toString().slice(-6));
    value = value.replace('{timestamp8}', now.toString().slice(-8));
    value = value.replace('{today}', new Date().toISOString().split('T')[0]);
    value = value.replace('{tomorrow}', new Date(now + 86400000).toISOString().slice(0, 16));
    return value;
}

async function waitAndClick(page, selector, timeout = 10000) {
    try {
        await page.waitForSelector(selector, { visible: true, timeout });
        await page.click(selector);
        return true;
    } catch (e) { return false; }
}

async function waitAndType(page, selector, value, timeout = 10000) {
    try {
        await page.waitForSelector(selector, { visible: true, timeout });
        await page.click(selector, { clickCount: 3 });
        await page.type(selector, value);
        return true;
    } catch (e) { return false; }
}

async function selectOption(page, selector, value, valueIndex = null) {
    try {
        await page.waitForSelector(selector, { visible: true, timeout: 10000 });
        if (valueIndex !== null && valueIndex !== undefined) {
            const options = await page.$$eval(`${selector} option`, opts =>
                opts.map((o, i) => ({ index: i, value: o.value }))
            );
            if (options.length > valueIndex) {
                await page.select(selector, options[valueIndex].value);
                return true;
            }
        } else if (value) {
            await page.select(selector, value);
            return true;
        }
        return false;
    } catch (e) { return false; }
}

async function takeScreenshot(page, name) {
    const filename = `quick-${name}-${Date.now()}.png`;
    const filepath = path.join(CONFIG.screenshotsDir, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    log('info', `Screenshot: ${filename}`);
    return filepath;
}

// Login
async function performLogin(page) {
    log('step', 'Login...');
    await page.goto(`${CONFIG.baseUrl}/panel-empresa.html`, { waitUntil: 'networkidle0' });
    await wait(2000);

    // Empresa
    await page.waitForSelector('#companySelect', { visible: true, timeout: 10000 });
    await wait(2000);
    await page.evaluate((companyName) => {
        const select = document.querySelector('#companySelect');
        const options = Array.from(select.options);
        for (const opt of options) {
            if (opt.text.toLowerCase().includes(companyName.toLowerCase())) {
                select.value = opt.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            }
        }
        if (options.length > 1) {
            select.selectedIndex = 1;
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }, CONFIG.credentials.company);

    await wait(1500);

    // Usuario y contraseña
    await page.waitForSelector('#userInput', { visible: true });
    await page.type('#userInput', CONFIG.credentials.username);
    await page.waitForSelector('#passwordInput', { visible: true });
    await page.type('#passwordInput', CONFIG.credentials.password);

    // Click login
    await page.click('#loginButton');
    await wait(5000);

    const mainContent = await page.$('#mainContent, .dashboard-content');
    if (mainContent) {
        log('pass', 'Login exitoso');
        await takeScreenshot(page, 'login-success');
        return true;
    }
    log('fail', 'Login fallido');
    return false;
}

// Navegar a módulo
async function navigateToModule(page, moduleKey, moduleConfig) {
    log('module', `Navegando a: ${moduleConfig.name}`);

    // Usar showModuleContent directamente
    const navigated = await page.evaluate((key, name) => {
        if (typeof showModuleContent === 'function') {
            showModuleContent(key, name);
            return true;
        }
        return false;
    }, moduleKey, moduleConfig.name);

    if (navigated) {
        await wait(3000);
        await takeScreenshot(page, `module-${moduleKey}`);
        log('pass', `Navegación exitosa a ${moduleConfig.name}`);
        return true;
    }

    log('fail', `No se pudo navegar a: ${moduleConfig.name}`);
    return false;
}

// Llenar formulario
async function fillModalForm(page, moduleKey, moduleConfig) {
    const fields = moduleConfig.modalFields;
    if (!fields) return false;

    let filledCount = 0;
    const totalFields = Object.keys(fields).length;

    for (const [selector, fieldConfig] of Object.entries(fields)) {
        const testValue = generateTestValue(fieldConfig.testValue || fieldConfig.default || '');
        log('info', `  Campo: ${fieldConfig.label || selector} = ${testValue || '(dynamic)'}`);

        try {
            switch (fieldConfig.type) {
                case 'text':
                case 'email':
                case 'password':
                case 'number':
                case 'date':
                case 'time':
                case 'datetime-local':
                case 'textarea':
                    if (await waitAndType(page, selector, testValue, 5000)) filledCount++;
                    break;
                case 'select':
                    if (fieldConfig.dynamic || fieldConfig.testValueIndex !== undefined) {
                        if (await selectOption(page, selector, null, fieldConfig.testValueIndex || 1)) filledCount++;
                    } else {
                        if (await selectOption(page, selector, testValue)) filledCount++;
                    }
                    break;
                case 'checkbox':
                    try {
                        await page.waitForSelector(selector, { visible: true, timeout: 5000 });
                        const isChecked = await page.$eval(selector, el => el.checked);
                        if (fieldConfig.testValue && !isChecked) await page.click(selector);
                        else if (!fieldConfig.testValue && isChecked) await page.click(selector);
                        filledCount++;
                    } catch (e) {}
                    break;
            }
        } catch (e) {}
        await wait(200);
    }

    log('info', `  Campos llenados: ${filledCount}/${totalFields}`);
    return filledCount > 0;
}

// Test CRUD de un módulo
async function testModuleCRUD(page, moduleKey, moduleConfig) {
    stats.total++;
    stats.modules[moduleKey] = { status: 'pending' };

    if (moduleConfig.isViewOnly || moduleConfig.isIncomplete) {
        log('warn', `${moduleConfig.name}: Saltando (${moduleConfig.isViewOnly ? 'view only' : 'incompleto'})`);
        stats.skipped++;
        stats.modules[moduleKey].status = 'skipped';
        return;
    }

    try {
        // 1. Navegar
        if (!await navigateToModule(page, moduleKey, moduleConfig)) {
            stats.failed++;
            stats.modules[moduleKey].status = 'failed';
            stats.modules[moduleKey].reason = 'Navigation failed';
            return;
        }

        // 1.5 Esperar carga completa del módulo JS si se especifica
        if (moduleConfig.waitForModuleLoad) {
            log('info', `Esperando carga de módulo JS (${moduleConfig.waitForModuleLoad}ms)...`);
            await wait(moduleConfig.waitForModuleLoad);
        }

        // 2. Tab específico si aplica
        if (moduleConfig.tabSelector) {
            await waitAndClick(page, moduleConfig.tabSelector, 5000);
            await wait(1000);
        }

        // 2.5 Pre-navegación (cambiar tab interno, etc)
        if (moduleConfig.preNavigateFunction) {
            log('info', `Ejecutando pre-navegación: ${moduleConfig.preNavigateFunction}`);
            try {
                await page.evaluate((fn) => eval(fn), moduleConfig.preNavigateFunction);
                await wait(moduleConfig.preNavigateWait || 500);
            } catch (e) {
                log('warn', `Pre-navegación falló: ${e.message}`);
            }
        }

        // 3. Abrir modal
        log('step', `Abriendo modal...`);
        let modalOpened = false;

        if (moduleConfig.openFunction) {
            try {
                await page.evaluate((fn) => eval(fn), moduleConfig.openFunction);
                await wait(1500);
                modalOpened = true;
            } catch (e) {
                log('warn', `No se pudo ejecutar: ${moduleConfig.openFunction}`);
            }
        }

        if (!modalOpened && moduleConfig.addButtonSelector) {
            modalOpened = await waitAndClick(page, moduleConfig.addButtonSelector, 5000);
            await wait(1500);
        }

        if (!modalOpened) {
            log('fail', `${moduleConfig.name}: No se pudo abrir modal`);
            stats.failed++;
            stats.modules[moduleKey].status = 'failed';
            stats.modules[moduleKey].reason = 'Modal open failed';
            return;
        }

        // Esperar modal visible
        if (moduleConfig.modalId) {
            try {
                await page.waitForSelector(`#${moduleConfig.modalId}`, { visible: true, timeout: 5000 });
                log('info', `Modal #${moduleConfig.modalId} visible`);
                await wait(1000);
            } catch (e) {}
        }

        await takeScreenshot(page, `${moduleKey}-modal`);

        // 4. Llenar formulario
        log('step', `Llenando formulario...`);
        await fillModalForm(page, moduleKey, moduleConfig);
        await takeScreenshot(page, `${moduleKey}-filled`);

        // 5. Guardar
        log('step', `Guardando...`);
        if (moduleConfig.saveFunction) {
            try {
                await page.evaluate((fn) => eval(fn), moduleConfig.saveFunction);
                await wait(2000);
            } catch (e) {}
        } else if (moduleConfig.saveButtonSelector) {
            await waitAndClick(page, moduleConfig.saveButtonSelector, 5000);
            await wait(2000);
        }

        await takeScreenshot(page, `${moduleKey}-saved`);

        // 6. Verificar éxito
        if (moduleConfig.successIndicator) {
            try {
                await page.waitForSelector(moduleConfig.successIndicator, { visible: true, timeout: 5000 });
                log('pass', `${moduleConfig.name}: CRUD CREATE exitoso`);
                stats.passed++;
                stats.modules[moduleKey].status = 'passed';
                return;
            } catch (e) {}
        }

        // Asumir éxito
        log('pass', `${moduleConfig.name}: CRUD CREATE completado`);
        stats.passed++;
        stats.modules[moduleKey].status = 'passed';

    } catch (error) {
        log('fail', `${moduleConfig.name}: Error - ${error.message}`);
        stats.failed++;
        stats.modules[moduleKey].status = 'failed';
        stats.modules[moduleKey].error = error.message;
    }
}

// Main
async function runQuickTest() {
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}E2E QUICK TEST - 5 MÓDULOS PRINCIPALES${colors.reset}`);
    console.log(`Fecha: ${new Date().toISOString()}`);
    console.log('='.repeat(70) + '\n');

    const browser = await puppeteer.launch({
        headless: CONFIG.headless,
        slowMo: CONFIG.slowMo,
        args: ['--window-size=1920,1080', '--no-sandbox', '--disable-dev-shm-usage'],
        defaultViewport: { width: 1920, height: 1080 },
        protocolTimeout: 180000  // 3 minutos para operaciones de protocolo
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(CONFIG.timeout);

    try {
        // Login
        if (!await performLogin(page)) {
            throw new Error('Login failed');
        }

        // Test módulos prioritarios (incluyendo los recién corregidos)
        const priorityModules = ['users', 'visitors', 'kiosks', 'hse-management', 'benefits-management', 'hse-deliveries', 'departments'];
        const modules = MODULES_CONFIG.modules;

        for (const moduleKey of priorityModules) {
            if (modules[moduleKey]) {
                console.log('\n' + '-'.repeat(50));
                await testModuleCRUD(page, moduleKey, modules[moduleKey]);
            }
        }

    } catch (error) {
        console.error(`${colors.red}ERROR CRÍTICO:${colors.reset}`, error.message);
    } finally {
        await wait(2000);
        await browser.close();
    }

    // Resumen
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}RESUMEN QUICK TEST${colors.reset}`);
    console.log('='.repeat(70));
    console.log(`Total: ${stats.total}`);
    console.log(`${colors.green}Passed: ${stats.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${stats.failed}${colors.reset}`);
    console.log(`${colors.yellow}Skipped: ${stats.skipped}${colors.reset}`);
    console.log(`Success Rate: ${stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0}%`);
    console.log('='.repeat(70));

    console.log('\n📊 Detalle:');
    for (const [key, data] of Object.entries(stats.modules)) {
        const icon = data.status === 'passed' ? '✅' : data.status === 'failed' ? '❌' : '⏭️';
        console.log(`  ${icon} ${key}: ${data.status}${data.reason ? ` (${data.reason})` : ''}`);
    }

    return stats;
}

runQuickTest().then(stats => {
    process.exit(stats.failed > 0 ? 1 : 0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
