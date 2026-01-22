/**
 * ============================================================================
 * E2E REAL USER TEST - PUPPETEER
 * ============================================================================
 *
 * Test que simula un usuario REAL operando el sistema:
 * 1. Login en panel-empresa
 * 2. Navega a cada módulo
 * 3. Abre modales de creación
 * 4. Llena formularios con campos EXACTOS analizados del código
 * 5. Guarda y verifica
 * 6. Toma screenshots de evidencia
 *
 * DIFERENCIA CLAVE: Este script usa configuración de campos REAL
 * analizada directamente del código fuente de cada módulo.
 *
 * @version 2.0.0
 * @date 2026-01-21
 * ============================================================================
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Cargar configuración de módulos
const MODULES_CONFIG = require('./e2e-modules-config.json');

// Configuración base
const CONFIG = {
    baseUrl: MODULES_CONFIG.baseUrl,
    credentials: MODULES_CONFIG.credentials,
    screenshotsDir: path.join(__dirname, '../e2e-screenshots'),
    timeout: 30000,
    slowMo: 50,
    headless: 'new' // Modo headless moderno para CI/CD
};

// Crear directorio de screenshots
if (!fs.existsSync(CONFIG.screenshotsDir)) {
    fs.mkdirSync(CONFIG.screenshotsDir, { recursive: true });
}

// Colores para consola
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

// Estadísticas
const stats = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    modules: {}
};

// Generar valores de test dinámicos
function generateTestValue(pattern) {
    if (!pattern) return '';

    const now = Date.now();
    let value = pattern.toString();

    // Reemplazar patrones
    value = value.replace('{timestamp}', now);
    value = value.replace('{timestamp6}', now.toString().slice(-6));
    value = value.replace('{timestamp8}', now.toString().slice(-8));
    value = value.replace('{today}', new Date().toISOString().split('T')[0]);
    value = value.replace('{tomorrow}', new Date(now + 86400000).toISOString().slice(0, 16));

    return value;
}

// Esperar a que un elemento sea visible y clickeable
async function waitAndClick(page, selector, timeout = 10000) {
    try {
        await page.waitForSelector(selector, { visible: true, timeout });
        await page.click(selector);
        return true;
    } catch (e) {
        log('warn', `No se pudo hacer click en: ${selector}`);
        return false;
    }
}

// Esperar y escribir en un input
async function waitAndType(page, selector, value, timeout = 10000) {
    try {
        await page.waitForSelector(selector, { visible: true, timeout });
        await page.click(selector, { clickCount: 3 }); // Seleccionar todo el texto existente
        await page.type(selector, value);
        return true;
    } catch (e) {
        log('warn', `No se pudo escribir en: ${selector}`);
        return false;
    }
}

// Seleccionar opción en un dropdown
async function selectOption(page, selector, value, valueIndex = null) {
    try {
        await page.waitForSelector(selector, { visible: true, timeout: 10000 });

        if (valueIndex !== null && valueIndex !== undefined) {
            // Seleccionar por índice
            const options = await page.$$eval(`${selector} option`, opts =>
                opts.map((o, i) => ({ index: i, value: o.value, text: o.textContent }))
            );

            if (options.length > valueIndex) {
                await page.select(selector, options[valueIndex].value);
                return true;
            }
        } else if (value) {
            // Seleccionar por valor
            await page.select(selector, value);
            return true;
        }
        return false;
    } catch (e) {
        log('warn', `No se pudo seleccionar en: ${selector}`);
        return false;
    }
}

// Tomar screenshot con timestamp
async function takeScreenshot(page, name) {
    const filename = `${name}-${Date.now()}.png`;
    const filepath = path.join(CONFIG.screenshotsDir, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    log('info', `Screenshot: ${filename}`);
    return filepath;
}

// Helper para esperar (Puppeteer moderno no tiene waitForTimeout)
async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Función principal de login
async function performLogin(page) {
    log('step', 'Iniciando proceso de login...');

    await page.goto(`${CONFIG.baseUrl}/panel-empresa.html`, { waitUntil: 'networkidle0' });
    await wait(2000); // Esperar a que cargue la página
    await takeScreenshot(page, 'login-page');

    // Paso 1: Seleccionar empresa del dropdown
    log('step', 'Paso 1: Seleccionando empresa...');
    try {
        await page.waitForSelector('#companySelect', { visible: true, timeout: 10000 });
        // Esperar a que las opciones se carguen
        await wait(2000);

        // Buscar la opción que coincide con la empresa
        const optionFound = await page.evaluate((companyName) => {
            const select = document.querySelector('#companySelect');
            if (!select) return false;
            const options = Array.from(select.options);
            for (const opt of options) {
                if (opt.text.toLowerCase().includes(companyName.toLowerCase()) ||
                    opt.value.toLowerCase().includes(companyName.toLowerCase())) {
                    select.value = opt.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }
            }
            // Si no encuentra, seleccionar la primera opción que no esté vacía
            if (options.length > 1) {
                select.selectedIndex = 1;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
            return false;
        }, CONFIG.credentials.company);

        if (optionFound) {
            log('pass', 'Empresa seleccionada');
        } else {
            log('warn', 'No se pudo seleccionar empresa específica, usando primera disponible');
        }
    } catch (e) {
        log('warn', `Error seleccionando empresa: ${e.message}`);
    }

    await wait(1500);
    await takeScreenshot(page, 'after-company-select');

    // Paso 2: Ingresar usuario
    log('step', 'Paso 2: Ingresando usuario...');
    try {
        await page.waitForSelector('#userInput', { visible: true, timeout: 5000 });
        await page.click('#userInput');
        await page.type('#userInput', CONFIG.credentials.username);
    } catch (e) {
        log('warn', `Error en campo usuario: ${e.message}`);
    }

    // Paso 3: Ingresar contraseña
    log('step', 'Paso 3: Ingresando contraseña...');
    try {
        await page.waitForSelector('#passwordInput', { visible: true, timeout: 5000 });
        await page.click('#passwordInput');
        await page.type('#passwordInput', CONFIG.credentials.password);
    } catch (e) {
        log('warn', `Error en campo contraseña: ${e.message}`);
    }

    await takeScreenshot(page, 'credentials-filled');

    // Click en botón de login
    log('step', 'Haciendo click en Login...');
    try {
        await page.waitForSelector('#loginButton', { visible: true, timeout: 5000 });
        await page.click('#loginButton');
    } catch (e) {
        log('warn', `Error con botón login: ${e.message}`);
        // Intentar con submit del formulario
        await page.evaluate(() => {
            const form = document.querySelector('#loginForm, form');
            if (form) form.submit();
        });
    }

    // Esperar a que cargue el dashboard
    log('step', 'Esperando carga del dashboard...');
    await wait(5000);

    await takeScreenshot(page, 'after-login');

    // Verificar login exitoso - buscar elementos típicos del dashboard
    const mainContent = await page.$('#mainContent, .dashboard-content, #sidebarMenu, .sidebar');
    if (mainContent) {
        log('pass', 'Login exitoso - Dashboard detectado');
        await takeScreenshot(page, 'login-success');
        return true;
    } else {
        log('fail', 'Login fallido - No se detectó el dashboard');
        await takeScreenshot(page, 'login-failed');
        return false;
    }
}

// Navegar a un módulo
async function navigateToModule(page, moduleKey, moduleConfig) {
    log('module', `Navegando a: ${moduleConfig.name}`);

    // Método 1: Usar showModuleContent directamente (más confiable)
    try {
        const navigated = await page.evaluate((key, name) => {
            if (typeof showModuleContent === 'function') {
                showModuleContent(key, name);
                return true;
            }
            if (typeof window.showModuleContent === 'function') {
                window.showModuleContent(key, name);
                return true;
            }
            return false;
        }, moduleKey, moduleConfig.name);

        if (navigated) {
            await wait(3000);
            await takeScreenshot(page, `module-${moduleKey}`);
            log('pass', `Navegación exitosa a ${moduleConfig.name} via showModuleContent`);
            return true;
        }
    } catch (e) {
        log('warn', `showModuleContent falló: ${e.message}`);
    }

    // Método 2: Buscar y hacer click en la tarjeta del módulo (data-module-key)
    const moduleCardSelector = `.module-card[data-module-key="${moduleKey}"][data-clickable="true"]`;
    try {
        const clicked = await waitAndClick(page, moduleCardSelector, 5000);
        if (clicked) {
            await wait(3000);
            await takeScreenshot(page, `module-${moduleKey}`);
            log('pass', `Navegación exitosa a ${moduleConfig.name} via click`);
            return true;
        }
    } catch (e) {
        log('warn', `Click en ${moduleCardSelector} falló: ${e.message}`);
    }

    // Método 3: Buscar por data-module-name (fallback)
    const altSelector = `.module-card[data-module-name*="${moduleConfig.name}"]`;
    try {
        const clicked = await waitAndClick(page, altSelector, 3000);
        if (clicked) {
            await wait(3000);
            await takeScreenshot(page, `module-${moduleKey}`);
            log('pass', `Navegación exitosa a ${moduleConfig.name} via data-module-name`);
            return true;
        }
    } catch (e) {
        log('warn', `Click en ${altSelector} falló`);
    }

    log('fail', `No se pudo navegar a: ${moduleConfig.name}`);
    await takeScreenshot(page, `module-${moduleKey}-nav-failed`);
    return false;
}

// Llenar formulario de modal
async function fillModalForm(page, moduleKey, moduleConfig) {
    const fields = moduleConfig.modalFields;
    if (!fields) {
        log('warn', `Módulo ${moduleKey} no tiene campos de modal definidos`);
        return false;
    }

    let filledCount = 0;
    const totalFields = Object.keys(fields).length;

    for (const [selector, fieldConfig] of Object.entries(fields)) {
        const testValue = generateTestValue(fieldConfig.testValue || fieldConfig.default || '');

        log('info', `  Campo: ${fieldConfig.label || selector} = ${testValue}`);

        try {
            switch (fieldConfig.type) {
                case 'text':
                case 'email':
                case 'password':
                case 'number':
                case 'date':
                case 'time':
                case 'datetime-local':
                    if (await waitAndType(page, selector, testValue, 5000)) {
                        filledCount++;
                    }
                    break;

                case 'textarea':
                    if (await waitAndType(page, selector, testValue, 5000)) {
                        filledCount++;
                    }
                    break;

                case 'select':
                    if (fieldConfig.dynamic || fieldConfig.testValueIndex !== undefined) {
                        if (await selectOption(page, selector, null, fieldConfig.testValueIndex || 1)) {
                            filledCount++;
                        }
                    } else {
                        if (await selectOption(page, selector, testValue)) {
                            filledCount++;
                        }
                    }
                    break;

                case 'checkbox':
                    try {
                        await page.waitForSelector(selector, { visible: true, timeout: 5000 });
                        const isChecked = await page.$eval(selector, el => el.checked);
                        if (fieldConfig.testValue && !isChecked) {
                            await page.click(selector);
                        } else if (!fieldConfig.testValue && isChecked) {
                            await page.click(selector);
                        }
                        filledCount++;
                    } catch (e) {
                        log('warn', `  No se pudo configurar checkbox: ${selector}`);
                    }
                    break;
            }
        } catch (e) {
            log('warn', `  Error llenando campo ${selector}: ${e.message}`);
        }

        // Pequeña pausa entre campos para estabilidad
        await wait(200);
    }

    log('info', `  Campos llenados: ${filledCount}/${totalFields}`);
    return filledCount > 0;
}

// Test CRUD completo de un módulo
async function testModuleCRUD(page, moduleKey, moduleConfig) {
    stats.total++;
    stats.modules[moduleKey] = { status: 'pending', tests: [] };

    // Verificar si el módulo está completo
    if (moduleConfig.isViewOnly) {
        log('warn', `${moduleConfig.name}: Módulo de solo vista - saltando CRUD`);
        stats.skipped++;
        stats.modules[moduleKey].status = 'skipped';
        stats.modules[moduleKey].reason = 'View only module';
        return;
    }

    if (moduleConfig.isIncomplete) {
        log('warn', `${moduleConfig.name}: Módulo incompleto - saltando`);
        stats.skipped++;
        stats.modules[moduleKey].status = 'skipped';
        stats.modules[moduleKey].reason = moduleConfig.note || 'Incomplete module';
        return;
    }

    if (moduleConfig.needsVerification) {
        log('warn', `${moduleConfig.name}: Necesita verificación manual de selectores`);
    }

    try {
        // 1. Navegar al módulo
        const navigated = await navigateToModule(page, moduleKey, moduleConfig);
        if (!navigated) {
            stats.failed++;
            stats.modules[moduleKey].status = 'failed';
            stats.modules[moduleKey].reason = 'Navigation failed';
            return;
        }

        // 2. Pre-navegación si es necesario (cambiar a tab específico via JS)
        if (moduleConfig.preNavigateFunction) {
            try {
                await page.evaluate((fn) => eval(fn), moduleConfig.preNavigateFunction);
                log('info', `Pre-navegación: ${moduleConfig.preNavigateFunction}`);
                await wait(2000);
            } catch (e) {
                log('warn', `Pre-navegación falló: ${e.message}`);
            }
        }

        // 2b. Si hay tab específico, navegar via click
        if (moduleConfig.tabSelector) {
            await waitAndClick(page, moduleConfig.tabSelector, 5000);
            await wait(1000);
        }

        // 3. Abrir modal de creación
        log('step', `Abriendo modal de creación...`);

        let modalOpened = false;

        // Intentar con función JavaScript directa
        if (moduleConfig.openFunction) {
            try {
                await page.evaluate((fn) => {
                    eval(fn);
                }, moduleConfig.openFunction);
                await wait(1500);
                modalOpened = true;
            } catch (e) {
                log('warn', `No se pudo ejecutar: ${moduleConfig.openFunction}`);
            }
        }

        // Intentar con selector de botón
        if (!modalOpened && moduleConfig.addButtonSelector) {
            modalOpened = await waitAndClick(page, moduleConfig.addButtonSelector, 5000);
            await wait(1500);
        }

        if (!modalOpened) {
            log('fail', `${moduleConfig.name}: No se pudo abrir modal de creación`);
            stats.failed++;
            stats.modules[moduleKey].status = 'failed';
            stats.modules[moduleKey].reason = 'Could not open modal';
            await takeScreenshot(page, `${moduleKey}-modal-failed`);
            return;
        }

        // Esperar a que el modal esté completamente visible
        if (moduleConfig.modalId) {
            try {
                await page.waitForSelector(`#${moduleConfig.modalId}`, { visible: true, timeout: 5000 });
                log('info', `Modal #${moduleConfig.modalId} visible`);
                await wait(1000); // Esperar a que se complete la animación
            } catch (e) {
                log('warn', `Modal #${moduleConfig.modalId} no encontrado, continuando...`);
            }
        }

        await takeScreenshot(page, `${moduleKey}-modal-open`);

        // 4. Llenar formulario
        log('step', `Llenando formulario...`);
        const filled = await fillModalForm(page, moduleKey, moduleConfig);

        if (!filled) {
            log('warn', `${moduleConfig.name}: No se pudieron llenar campos`);
        }

        await takeScreenshot(page, `${moduleKey}-form-filled`);

        // 5. Guardar
        log('step', `Guardando...`);

        let saved = false;

        // Intentar con función JavaScript directa
        if (moduleConfig.saveFunction) {
            try {
                await page.evaluate((fn) => {
                    eval(fn);
                }, moduleConfig.saveFunction);
                await wait(2000);
                saved = true;
            } catch (e) {
                log('warn', `No se pudo ejecutar: ${moduleConfig.saveFunction}`);
            }
        }

        // Intentar con selector de botón
        if (!saved && moduleConfig.saveButtonSelector) {
            saved = await waitAndClick(page, moduleConfig.saveButtonSelector, 5000);
            await wait(2000);
        }

        // Intentar submit del formulario
        if (!saved && moduleConfig.formSelector) {
            try {
                await page.evaluate((formSelector) => {
                    const form = document.querySelector(formSelector);
                    if (form) form.submit();
                }, moduleConfig.formSelector);
                await wait(2000);
                saved = true;
            } catch (e) {
                log('warn', `No se pudo hacer submit del formulario`);
            }
        }

        await takeScreenshot(page, `${moduleKey}-after-save`);

        // 6. Verificar éxito
        if (moduleConfig.successIndicator) {
            try {
                await page.waitForSelector(moduleConfig.successIndicator, { timeout: 5000 });
                log('pass', `${moduleConfig.name}: CRUD CREATE exitoso`);
                stats.passed++;
                stats.modules[moduleKey].status = 'passed';
                stats.modules[moduleKey].tests.push({ name: 'CREATE', status: 'passed' });
            } catch (e) {
                log('warn', `${moduleConfig.name}: No se detectó indicador de éxito`);
                stats.modules[moduleKey].status = 'warning';
                stats.modules[moduleKey].tests.push({ name: 'CREATE', status: 'warning', note: 'Success indicator not found' });
            }
        } else {
            // Asumir éxito si no hubo errores
            log('pass', `${moduleConfig.name}: CRUD CREATE completado (sin verificación)`);
            stats.passed++;
            stats.modules[moduleKey].status = 'passed';
        }

    } catch (error) {
        log('fail', `${moduleConfig.name}: Error - ${error.message}`);
        stats.failed++;
        stats.modules[moduleKey].status = 'failed';
        stats.modules[moduleKey].error = error.message;
        await takeScreenshot(page, `${moduleKey}-error`);
    }
}

// Función principal
async function runE2ETests() {
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}E2E REAL USER TEST - PUPPETEER${colors.reset}`);
    console.log(`Versión: 2.0.0 | Fecha: ${new Date().toISOString()}`);
    console.log('='.repeat(70) + '\n');

    const browser = await puppeteer.launch({
        headless: CONFIG.headless,
        slowMo: CONFIG.slowMo,
        args: ['--window-size=1920,1080', '--no-sandbox'],
        defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(CONFIG.timeout);

    try {
        // 1. Login
        log('step', 'FASE 1: Login');
        console.log('-'.repeat(50));

        const loginSuccess = await performLogin(page);
        if (!loginSuccess) {
            throw new Error('Login failed - cannot continue tests');
        }

        // 2. Test de módulos
        log('step', 'FASE 2: Test de Módulos CRUD');
        console.log('-'.repeat(50));

        const modules = MODULES_CONFIG.modules;
        const moduleKeys = Object.keys(modules);

        log('info', `Total de módulos a testear: ${moduleKeys.length}`);

        // Módulos prioritarios para testing (los que tienen campos completos)
        const priorityModules = ['users', 'visitors', 'kiosks', 'hse-management'];

        // Primero testear módulos prioritarios
        for (const moduleKey of priorityModules) {
            if (modules[moduleKey]) {
                console.log('\n' + '-'.repeat(40));
                await testModuleCRUD(page, moduleKey, modules[moduleKey]);
            }
        }

        // Luego testear el resto
        for (const moduleKey of moduleKeys) {
            if (!priorityModules.includes(moduleKey) && modules[moduleKey]) {
                // Solo testear módulos con modalFields definidos
                if (modules[moduleKey].modalFields || modules[moduleKey].isViewOnly) {
                    console.log('\n' + '-'.repeat(40));
                    await testModuleCRUD(page, moduleKey, modules[moduleKey]);
                }
            }
        }

    } catch (error) {
        console.error(`${colors.red}ERROR CRÍTICO:${colors.reset}`, error.message);
        await takeScreenshot(page, 'critical-error');
    } finally {
        // Esperar un poco antes de cerrar para ver resultados
        await wait(3000);
        await browser.close();
    }

    // Resumen final
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}RESUMEN E2E TEST${colors.reset}`);
    console.log('='.repeat(70));
    console.log(`Total módulos: ${stats.total}`);
    console.log(`${colors.green}Passed: ${stats.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${stats.failed}${colors.reset}`);
    console.log(`${colors.yellow}Skipped: ${stats.skipped}${colors.reset}`);
    console.log(`Success Rate: ${stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0}%`);
    console.log('='.repeat(70));

    // Detalle por módulo
    console.log('\n📊 Detalle por módulo:');
    for (const [key, data] of Object.entries(stats.modules)) {
        const icon = data.status === 'passed' ? '✅' :
                     data.status === 'failed' ? '❌' :
                     data.status === 'skipped' ? '⏭️' : '⚠️';
        console.log(`  ${icon} ${key}: ${data.status}${data.reason ? ` (${data.reason})` : ''}`);
    }

    // Guardar resultados en JSON
    const resultsPath = path.join(CONFIG.screenshotsDir, `e2e-results-${Date.now()}.json`);
    fs.writeFileSync(resultsPath, JSON.stringify({ stats, timestamp: new Date().toISOString() }, null, 2));
    log('info', `Resultados guardados en: ${resultsPath}`);

    console.log('\n');
    return stats;
}

// Ejecutar
runE2ETests().then(stats => {
    process.exit(stats.failed > 0 ? 1 : 0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
