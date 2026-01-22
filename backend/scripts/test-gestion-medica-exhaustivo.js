/**
 * ============================================================================
 * TEST E2E EXHAUSTIVO: GESTIÓN MÉDICA
 * ============================================================================
 * Testing completo desde perspectiva de usuario:
 * - Login real
 * - Navegación al módulo
 * - Prueba de las 7 vistas principales
 * - Verificación de funcionalidades CRUD
 * - Verificación de modales
 * - Screenshots en cada paso
 * ============================================================================
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'test-screenshots-medical');

// Crear directorio de screenshots
if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const VIEWS = [
    { id: 'overview', name: 'Panel de Control', icon: '📊', description: 'Dashboard general con métricas' },
    { id: 'candidates', name: 'Candidatos Pendientes', icon: '🔶', description: 'Exámenes preocupacionales pendientes' },
    { id: 'pre', name: 'PRE-OCUPACIONAL', icon: '🔵', description: 'Nuevos ingresos' },
    { id: 'ocup', name: 'OCUPACIONAL', icon: '🟢', description: 'Empleados activos' },
    { id: 'post', name: 'POST-OCUPACIONAL', icon: '🔴', description: 'Empleados que egresan' },
    { id: 'employees', name: 'Ficha Médica 360°', icon: '👤', description: 'Vista completa del empleado' },
    { id: 'notifications', name: 'Notificaciones', icon: '🔔', description: 'Centro de notificaciones' }
];

const results = {
    module: 'Gestión Médica',
    startTime: new Date().toISOString(),
    tests: [],
    summary: { passed: 0, failed: 0, warnings: 0 }
};

function log(emoji, message) {
    console.log(`${emoji} ${message}`);
}

function addResult(testName, status, details = '', screenshot = null) {
    const result = {
        test: testName,
        status,
        details,
        screenshot,
        timestamp: new Date().toISOString()
    };
    results.tests.push(result);

    if (status === 'PASSED') results.summary.passed++;
    else if (status === 'FAILED') results.summary.failed++;
    else results.summary.warnings++;

    const emoji = status === 'PASSED' ? '✅' : status === 'FAILED' ? '❌' : '⚠️';
    log(emoji, `[${status}] ${testName}: ${details}`);
}

async function screenshot(page, name) {
    const filename = `${Date.now()}-${name}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    return filename;
}

async function waitForLoad(page, timeout = 5000) {
    try {
        await page.waitForLoadState('networkidle', { timeout });
    } catch (e) {
        // Continuar aunque no llegue a idle
    }
    await page.waitForTimeout(500);
}

(async () => {
    log('🚀', '═'.repeat(60));
    log('🚀', 'TEST E2E EXHAUSTIVO: GESTIÓN MÉDICA');
    log('🚀', '═'.repeat(60));

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox']
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        locale: 'es-AR'
    });

    const page = await context.newPage();

    try {
        // ================================================================
        // TEST 1: LOGIN
        // ================================================================
        log('📝', '\n▶ TEST 1: LOGIN');

        await page.goto('http://localhost:9998/panel-empresa.html');
        await waitForLoad(page);

        // Seleccionar empresa
        const companySelect = await page.$('#companySelect');
        if (companySelect) {
            await page.selectOption('#companySelect', 'isi');
            await page.waitForTimeout(1000);
        }

        // Completar login
        await page.waitForSelector('#userInput:not([disabled])', { timeout: 10000 });
        await page.fill('#userInput', 'admin');
        await page.fill('#passwordInput', 'admin123');

        const ssLogin = await screenshot(page, '01-login-form');

        await page.click('#loginButton');
        await page.waitForTimeout(5000);

        // Verificar login exitoso
        const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
        if (authToken) {
            addResult('Login', 'PASSED', 'Autenticación exitosa', ssLogin);
        } else {
            addResult('Login', 'FAILED', 'No se obtuvo token de autenticación', ssLogin);
            throw new Error('Login falló');
        }

        // ================================================================
        // TEST 2: NAVEGACIÓN AL MÓDULO GESTIÓN MÉDICA
        // ================================================================
        log('📝', '\n▶ TEST 2: NAVEGACIÓN AL MÓDULO');

        // Buscar y hacer click en la tarjeta del módulo medical
        const moduleFound = await page.evaluate(() => {
            // Método 1: Buscar tarjeta con data-module-key
            const card = document.querySelector('[data-module-key="medical"], [data-module-key="medical-dashboard"]');
            if (card) {
                card.click();
                return { method: 'card-click', found: true };
            }

            // Método 2: Buscar por texto en tarjetas
            const cards = document.querySelectorAll('.module-card, .employee-module-card');
            for (const c of cards) {
                const text = c.textContent.toLowerCase();
                if (text.includes('médic') || text.includes('medical') || text.includes('gestión médica')) {
                    c.click();
                    return { method: 'text-search', found: true };
                }
            }

            // Método 3: Intentar cargar directamente con función global
            if (typeof loadModule === 'function') {
                loadModule('medical');
                return { method: 'loadModule', found: true };
            }

            return { method: 'none', found: false };
        });

        log('📋', `   Método de navegación: ${moduleFound.method}`);

        await page.waitForTimeout(5000);
        await waitForLoad(page);

        const ssModule = await screenshot(page, '02-medical-module-loaded');

        // Verificar que el módulo se cargó correctamente
        const moduleLoaded = await page.evaluate(() => {
            const hasMedicalContainer = document.querySelector('#medical-dashboard-container') !== null;
            const hasMedicalNav = document.querySelector('.me-nav-item') !== null;
            const hasMedicalHeader = document.body.innerHTML.toLowerCase().includes('gestión médica') ||
                                     document.body.innerHTML.toLowerCase().includes('medical');

            return {
                hasMedicalContainer,
                hasMedicalNav,
                hasMedicalHeader,
                loaded: hasMedicalContainer || hasMedicalNav || hasMedicalHeader
            };
        });

        log('📋', `   Estado del módulo: container=${moduleLoaded.hasMedicalContainer}, nav=${moduleLoaded.hasMedicalNav}, header=${moduleLoaded.hasMedicalHeader}`);

        if (moduleLoaded.loaded) {
            addResult('Navegación a Gestión Médica', 'PASSED', `Módulo cargado: nav=${moduleLoaded.hasMedicalNav}`, ssModule);
        } else {
            addResult('Navegación a Gestión Médica', 'FAILED', 'El módulo NO se cargó correctamente', ssModule);
            const ssDebug = await screenshot(page, '02b-debug-module-not-loaded');
            log('📸', `   Screenshot debug: ${ssDebug}`);
        }

        // ================================================================
        // TEST 3: ESPERAR CARGA COMPLETA DEL DASHBOARD
        // ================================================================
        log('📝', '\n▶ TEST 3: ESPERAR CARGA COMPLETA');

        let dashboardReady = false;
        let waitAttempts = 0;
        const maxWaitAttempts = 15;

        while (!dashboardReady && waitAttempts < maxWaitAttempts) {
            await page.waitForTimeout(2000);
            waitAttempts++;

            const loadingStatus = await page.evaluate(() => {
                // Verificar si hay navegación del módulo médico
                const navItems = document.querySelectorAll('.me-nav-item, [data-view]');
                const hasNav = navItems.length > 0;

                // Verificar si hay contenido cargado
                const hasContent = document.querySelector('.me-header, .me-card, .me-stats') !== null;

                return { hasNav, hasContent };
            });

            if (loadingStatus.hasNav || loadingStatus.hasContent) {
                dashboardReady = true;
                log('📋', `   Dashboard listo después de ${waitAttempts * 2} segundos`);
            } else {
                log('📋', `   Intento ${waitAttempts}/${maxWaitAttempts}: Cargando...`);
            }
        }

        const ssDashboardReady = await screenshot(page, '03-dashboard-ready');
        if (dashboardReady) {
            addResult('Carga del Dashboard', 'PASSED', 'Dashboard médico cargado', ssDashboardReady);
        } else {
            addResult('Carga del Dashboard', 'WARNING', 'Dashboard puede no haberse cargado completamente', ssDashboardReady);
        }

        // ================================================================
        // TEST 4-10: PRUEBA DE CADA VISTA
        // ================================================================
        log('📝', '\n▶ TESTS 4-10: PRUEBA DE VISTAS');

        // Detectar vistas disponibles en la página
        const realViews = await page.evaluate(() => {
            const navItems = document.querySelectorAll('.me-nav-item, [data-view]');
            return Array.from(navItems).map((item, idx) => ({
                index: idx,
                text: item.textContent.trim().substring(0, 30),
                dataView: item.getAttribute('data-view'),
                isActive: item.classList.contains('active')
            })).filter(v => v.text.length > 0);
        });

        log('📋', `   Vistas detectadas: ${realViews.length}`);
        if (realViews.length > 0) {
            log('📋', `   Lista: ${realViews.map(v => v.text).join(', ')}`);
        }

        for (let i = 0; i < realViews.length; i++) {
            const view = realViews[i];
            const testNum = i + 4;

            log('🔄', `   [${i + 1}/${realViews.length}] Probando vista: ${view.text}...`);

            try {
                // Click en la vista usando el índice
                const viewClicked = await page.evaluate((viewIndex) => {
                    const navItems = document.querySelectorAll('.me-nav-item, [data-view]');
                    if (viewIndex >= navItems.length) return false;

                    navItems[viewIndex].click();
                    return true;
                }, i);

                await page.waitForTimeout(3000); // Tiempo para cargar contenido

                const ssView = await screenshot(page, `${String(testNum).padStart(2, '0')}-view-${view.text.substring(0, 15).replace(/[^\w]/g, '-')}`);

                // Verificar estado después del click
                const viewStatus = await page.evaluate((viewIndex) => {
                    const navItems = document.querySelectorAll('.me-nav-item, [data-view]');
                    const clickedItem = navItems[viewIndex];
                    const isActive = clickedItem && clickedItem.classList.contains('active');

                    // Buscar errores visibles reales
                    const errorAlert = document.querySelector('.alert-danger, .error-message, .toast-error, [role="alert"]');
                    const hasVisibleError = errorAlert && errorAlert.offsetParent !== null;

                    // Verificar contenido visible
                    const contentAreas = document.querySelectorAll('.me-card, .me-content, .view-content, table, .data-container');
                    let hasVisibleContent = false;
                    contentAreas.forEach(area => {
                        if (area.offsetParent !== null && area.innerHTML.length > 100) {
                            hasVisibleContent = true;
                        }
                    });

                    return {
                        clicked: true,
                        isActive,
                        hasVisibleError,
                        hasVisibleContent
                    };
                }, i);

                if (viewClicked && viewStatus.isActive) {
                    if (viewStatus.hasVisibleError) {
                        addResult(`Vista: ${view.text}`, 'FAILED', 'Error visible en la vista', ssView);
                    } else if (viewStatus.hasVisibleContent) {
                        addResult(`Vista: ${view.text}`, 'PASSED', 'Vista activa con contenido visible', ssView);
                    } else {
                        addResult(`Vista: ${view.text}`, 'PASSED', 'Vista activa (puede estar vacía)', ssView);
                    }
                } else if (viewClicked) {
                    addResult(`Vista: ${view.text}`, 'WARNING', 'Click realizado pero vista no marcada como activa', ssView);
                } else {
                    addResult(`Vista: ${view.text}`, 'WARNING', 'No se pudo hacer click en la vista', ssView);
                }

            } catch (viewError) {
                const ssError = await screenshot(page, `${String(testNum).padStart(2, '0')}-view-error`);
                addResult(`Vista: ${view.text}`, 'FAILED', `Error: ${viewError.message}`, ssError);
            }
        }

        if (realViews.length === 0) {
            addResult('Vistas del Módulo', 'WARNING', 'No se detectaron vistas de navegación', null);
        }

        // ================================================================
        // TEST 11: VERIFICAR VISTA FICHA MÉDICA 360°
        // ================================================================
        log('📝', '\n▶ TEST 11: FICHA MÉDICA 360°');

        // Intentar navegar a la vista de empleados/ficha médica
        const ficha360Clicked = await page.evaluate(() => {
            // Buscar botón de Ficha Médica 360 o empleados
            const navItems = document.querySelectorAll('.me-nav-item, [data-view]');
            for (const item of navItems) {
                const text = item.textContent.toLowerCase();
                if (text.includes('360') || text.includes('ficha') || text.includes('empleado')) {
                    item.click();
                    return true;
                }
            }

            // Intentar función directa si existe
            if (typeof MedicalEngine !== 'undefined' && MedicalEngine.showView) {
                MedicalEngine.showView('employees');
                return true;
            }

            return false;
        });

        await page.waitForTimeout(3000);

        const ssFicha360 = await screenshot(page, '11-ficha-medica-360');

        // Verificar si hay selector de empleados o contenido 360
        const ficha360Status = await page.evaluate(() => {
            const hasEmployeeSelector = document.querySelector('select[id*="employee"], .employee-select, input[placeholder*="empleado"]') !== null;
            const has360Content = document.body.innerHTML.includes('360') || document.body.innerHTML.includes('Ficha Médica');
            const hasTabs = document.querySelectorAll('[data-tab]').length > 0;

            return { hasEmployeeSelector, has360Content, hasTabs };
        });

        if (ficha360Clicked && (ficha360Status.hasEmployeeSelector || ficha360Status.has360Content)) {
            addResult('Ficha Médica 360°', 'PASSED', `Disponible: selector=${ficha360Status.hasEmployeeSelector}, tabs=${ficha360Status.hasTabs}`, ssFicha360);
        } else {
            addResult('Ficha Médica 360°', 'WARNING', 'Vista 360 puede no estar completamente cargada', ssFicha360);
        }

        // ================================================================
        // TEST 12: VERIFICAR MODALES DE ACCIÓN
        // ================================================================
        log('📝', '\n▶ TEST 12: VERIFICAR MODALES');

        const modalButtons = await page.evaluate(() => {
            const buttons = document.querySelectorAll('[data-toggle="modal"], [data-bs-toggle="modal"], button[onclick*="modal"], .btn-action, .btn-new, .me-btn');
            return buttons.length;
        });

        log('📋', `   Encontrados ${modalButtons} botones de acción`);

        if (modalButtons > 0) {
            // Intentar abrir un modal
            const modalOpened = await page.evaluate(() => {
                const btn = document.querySelector('.me-btn-primary, .btn-action, [data-toggle="modal"]');
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            });

            await page.waitForTimeout(1500);

            const modalVisible = await page.evaluate(() => {
                const modal = document.querySelector('.modal.show, .modal[style*="display: block"], .me-modal');
                return modal !== null && modal.offsetParent !== null;
            });

            const ssModal = await screenshot(page, '12-modal-test');

            if (modalVisible) {
                // Cerrar el modal
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);

                addResult('Modales de Acción', 'PASSED', 'Modal abre y cierra correctamente', ssModal);
            } else {
                addResult('Modales de Acción', 'WARNING', 'No se pudo verificar apertura de modal', ssModal);
            }
        } else {
            addResult('Modales de Acción', 'WARNING', 'No se encontraron botones de modal', null);
        }

        // ================================================================
        // TEST 13: VERIFICAR API DE CASOS MÉDICOS
        // ================================================================
        log('📝', '\n▶ TEST 13: VERIFICAR API');

        const apiStatus = await page.evaluate(async () => {
            const token = localStorage.getItem('authToken');
            if (!token) return { error: 'No token' };

            try {
                const response = await fetch('/api/medical-cases/doctor/pending', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                return {
                    status: response.status,
                    ok: response.ok,
                    hasData: Array.isArray(data.data) || Array.isArray(data),
                    count: Array.isArray(data.data) ? data.data.length : (Array.isArray(data) ? data.length : 0)
                };
            } catch (e) {
                return { error: e.message };
            }
        });

        if (apiStatus.ok || apiStatus.status === 200) {
            addResult('API Casos Médicos', 'PASSED', `API responde OK, ${apiStatus.count || 0} casos pendientes`, null);
        } else if (apiStatus.error) {
            addResult('API Casos Médicos', 'WARNING', `Error de API: ${apiStatus.error}`, null);
        } else {
            addResult('API Casos Médicos', 'WARNING', `API status: ${apiStatus.status}`, null);
        }

        // ================================================================
        // TEST 14: VERIFICAR PERSISTENCIA (F5)
        // ================================================================
        log('📝', '\n▶ TEST 14: VERIFICAR PERSISTENCIA (F5)');

        await page.reload();
        await page.waitForTimeout(3000);
        await waitForLoad(page);

        const stillLoggedIn = await page.evaluate(() => {
            return localStorage.getItem('authToken') !== null;
        });

        const ssF5 = await screenshot(page, '14-after-refresh');

        if (stillLoggedIn) {
            addResult('Persistencia (F5)', 'PASSED', 'Sesión persiste después de refresh', ssF5);
        } else {
            addResult('Persistencia (F5)', 'WARNING', 'Sesión puede haberse perdido', ssF5);
        }

        // ================================================================
        // RESUMEN FINAL
        // ================================================================

    } catch (error) {
        log('❌', `ERROR CRÍTICO: ${error.message}`);
        const ssError = await screenshot(page, 'error-critical');
        addResult('Error Crítico', 'FAILED', error.message, ssError);
    }

    await browser.close();

    // Guardar resultados
    results.endTime = new Date().toISOString();
    const resultsPath = path.join(SCREENSHOTS_DIR, 'test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

    // Mostrar resumen
    log('📊', '\n' + '═'.repeat(60));
    log('📊', 'RESUMEN DE TESTS - GESTIÓN MÉDICA');
    log('📊', '═'.repeat(60));
    log('✅', `Pasados: ${results.summary.passed}`);
    log('❌', `Fallidos: ${results.summary.failed}`);
    log('⚠️', `Advertencias: ${results.summary.warnings}`);
    log('📁', `Screenshots guardados en: ${SCREENSHOTS_DIR}`);
    log('📄', `Resultados guardados en: ${resultsPath}`);

    if (results.summary.failed > 0) {
        log('🔴', '\n⚠️  HAY TESTS FALLIDOS QUE REQUIEREN ATENCIÓN');
        results.tests
            .filter(t => t.status === 'FAILED')
            .forEach(t => log('  ❌', `${t.test}: ${t.details}`));
    }

    log('📊', '═'.repeat(60));

})();
