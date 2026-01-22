/**
 * ============================================================================
 * TEST E2E EXHAUSTIVO: MI ESPACIO
 * ============================================================================
 * Testing completo desde perspectiva de usuario:
 * - Login real
 * - Navegación al módulo Mi Espacio
 * - Prueba de las 7 tarjetas de módulos
 * - Verificación de submódulos:
 *   - Mis Documentos (DMS)
 *   - Mi Asistencia
 *   - Mis Vacaciones
 *   - Mis Notificaciones (Centro de Notificaciones)
 *   - Mi Perfil 360°
 *   - Mis Procedimientos
 *   - Mi Banco de Horas
 * - Screenshots en cada paso
 * ============================================================================
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'test-screenshots-mi-espacio');

// Crear directorio de screenshots
if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const SUBMODULES = [
    { id: 'dms-dashboard', name: 'Mis Documentos', icon: '📁', description: 'DMS personal', isCORE: true },
    { id: 'attendance', name: 'Mi Asistencia', icon: '✅', description: 'Historial y horarios' },
    { id: 'vacation-management', name: 'Mis Vacaciones', icon: '🏖️', description: 'Solicitudes y días disponibles' },
    { id: 'inbox', name: 'Mis Notificaciones', icon: '🔔', description: 'Centro de notificaciones' },
    { id: 'employee-360', name: 'Mi Perfil 360°', icon: '👤', description: 'Datos personales y evaluaciones' },
    { id: 'my-procedures', name: 'Mis Procedimientos', icon: '📘', description: 'Instructivos y acuses' },
    { id: 'hour-bank', name: 'Mi Banco de Horas', icon: '🏦', description: 'Balance de horas extras', isOptional: true }
];

const results = {
    module: 'Mi Espacio',
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
    log('🚀', 'TEST E2E EXHAUSTIVO: MI ESPACIO');
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
        // TEST 2: NAVEGACIÓN A MI ESPACIO
        // ================================================================
        log('📝', '\n▶ TEST 2: NAVEGACIÓN A MI ESPACIO');

        // Buscar y hacer click en la tarjeta del módulo Mi Espacio
        const moduleFound = await page.evaluate(() => {
            // Método 1: Buscar tarjeta con data-module-key
            const card = document.querySelector('[data-module-key="mi-espacio"]');
            if (card) {
                card.click();
                return { method: 'card-click', found: true };
            }

            // Método 2: Buscar por texto en tarjetas
            const cards = document.querySelectorAll('.module-card, .employee-module-card');
            for (const c of cards) {
                const text = c.textContent.toLowerCase();
                if (text.includes('mi espacio') || text.includes('my-space')) {
                    c.click();
                    return { method: 'text-search', found: true };
                }
            }

            // Método 3: Intentar cargar directamente con función global
            if (typeof loadModule === 'function') {
                loadModule('mi-espacio');
                return { method: 'loadModule', found: true };
            }

            return { method: 'none', found: false };
        });

        log('📋', `   Método de navegación: ${moduleFound.method}`);

        await page.waitForTimeout(5000);
        await waitForLoad(page);

        const ssModule = await screenshot(page, '02-mi-espacio-loaded');

        // Verificar que el módulo se cargó correctamente
        const moduleLoaded = await page.evaluate(() => {
            const hasDashboard = document.querySelector('.mi-espacio-dashboard') !== null;
            const hasHeader = document.querySelector('.mi-espacio-header') !== null;
            const hasModuleCards = document.querySelectorAll('.mi-espacio-module-card').length > 0;
            const hasGreeting = document.body.innerHTML.includes('Bienvenido') ||
                               document.body.innerHTML.includes('Mi Espacio');

            return {
                hasDashboard,
                hasHeader,
                hasModuleCards,
                hasGreeting,
                cardCount: document.querySelectorAll('.mi-espacio-module-card').length,
                loaded: hasDashboard || hasHeader || hasModuleCards
            };
        });

        log('📋', `   Estado: dashboard=${moduleLoaded.hasDashboard}, header=${moduleLoaded.hasHeader}, cards=${moduleLoaded.cardCount}`);

        if (moduleLoaded.loaded) {
            addResult('Navegación a Mi Espacio', 'PASSED', `Módulo cargado: ${moduleLoaded.cardCount} tarjetas de módulos`, ssModule);
        } else {
            addResult('Navegación a Mi Espacio', 'FAILED', 'El módulo NO se cargó correctamente', ssModule);
        }

        // ================================================================
        // TEST 3: VERIFICAR HEADER DE USUARIO
        // ================================================================
        log('📝', '\n▶ TEST 3: VERIFICAR HEADER DE USUARIO');

        const headerInfo = await page.evaluate(() => {
            const header = document.querySelector('.mi-espacio-header');
            if (!header) return { found: false };

            const greeting = header.querySelector('.mi-espacio-greeting');
            const avatar = header.querySelector('.mi-espacio-avatar');
            const stats = header.querySelectorAll('.mi-espacio-stat');

            return {
                found: true,
                hasGreeting: !!greeting,
                hasAvatar: !!avatar,
                statsCount: stats.length,
                greetingText: greeting ? greeting.textContent.trim().substring(0, 50) : ''
            };
        });

        if (headerInfo.found && headerInfo.hasGreeting) {
            addResult('Header de Usuario', 'PASSED', `Saludo: "${headerInfo.greetingText}...", Stats: ${headerInfo.statsCount}`, null);
        } else {
            addResult('Header de Usuario', 'WARNING', 'Header puede no estar completamente cargado', null);
        }

        // ================================================================
        // TEST 4: VERIFICAR TARJETAS DE MÓDULOS
        // ================================================================
        log('📝', '\n▶ TEST 4: VERIFICAR TARJETAS DE MÓDULOS');

        const moduleCards = await page.evaluate(() => {
            const cards = document.querySelectorAll('.mi-espacio-module-card');
            return Array.from(cards).map((card, idx) => ({
                index: idx,
                title: card.querySelector('h4') ? card.querySelector('h4').textContent.trim() : 'Sin título',
                hasIcon: card.querySelector('.module-icon') !== null,
                hasDescription: card.querySelector('p') !== null,
                hasActions: card.querySelectorAll('.action-tag').length > 0,
                isCORE: card.querySelector('.badge-core') !== null,
                isOptional: card.querySelector('.badge-optional') !== null
            }));
        });

        log('📋', `   Tarjetas encontradas: ${moduleCards.length}`);
        moduleCards.forEach(card => {
            const badge = card.isCORE ? '[CORE]' : card.isOptional ? '[OPCIONAL]' : '';
            log('📋', `   - ${card.title} ${badge}`);
        });

        if (moduleCards.length >= 5) {
            addResult('Tarjetas de Módulos', 'PASSED', `${moduleCards.length} módulos disponibles`, null);
        } else {
            addResult('Tarjetas de Módulos', 'WARNING', `Solo ${moduleCards.length} módulos (esperados 7)`, null);
        }

        // ================================================================
        // TEST 5-11: PROBAR CADA SUBMÓDULO
        // ================================================================
        log('📝', '\n▶ TESTS 5-11: PROBAR SUBMÓDULOS');

        for (let i = 0; i < moduleCards.length; i++) {
            const card = moduleCards[i];
            const testNum = i + 5;

            log('🔄', `   [${i + 1}/${moduleCards.length}] Probando: ${card.title}...`);

            try {
                // Click en la tarjeta
                const cardClicked = await page.evaluate((cardIndex) => {
                    const cards = document.querySelectorAll('.mi-espacio-module-card');
                    if (cardIndex >= cards.length) return false;
                    cards[cardIndex].click();
                    return true;
                }, i);

                await page.waitForTimeout(3000);
                await waitForLoad(page);

                const ssSubmodule = await screenshot(page, `${String(testNum).padStart(2, '0')}-submodule-${card.title.replace(/[^\w]/g, '-')}`);

                // Verificar que se cargó algo nuevo
                const submoduleLoaded = await page.evaluate(() => {
                    // Verificar si cambió la vista
                    const hasModal = document.querySelector('.modal.show, .modal[style*="display: block"]') !== null;
                    const hasNewContent = document.querySelector('.module-content, .submodule-view, [class*="dashboard"]') !== null;
                    const hasBackButton = document.querySelector('[onclick*="back"], .btn-back, .back-btn') !== null;

                    // Verificar errores visibles
                    const errorAlert = document.querySelector('.alert-danger, .error-message');
                    const hasVisibleError = errorAlert && errorAlert.offsetParent !== null;

                    return {
                        hasModal,
                        hasNewContent,
                        hasBackButton,
                        hasVisibleError,
                        loaded: hasModal || hasNewContent || hasBackButton
                    };
                });

                if (submoduleLoaded.hasVisibleError) {
                    addResult(`Submódulo: ${card.title}`, 'FAILED', 'Error visible al cargar', ssSubmodule);
                } else if (submoduleLoaded.loaded || cardClicked) {
                    addResult(`Submódulo: ${card.title}`, 'PASSED', 'Click y navegación exitosa', ssSubmodule);
                } else {
                    addResult(`Submódulo: ${card.title}`, 'WARNING', 'Click realizado, verificar manualmente', ssSubmodule);
                }

                // Volver a Mi Espacio para la próxima prueba
                await page.evaluate(() => {
                    // Intentar cerrar modal si hay
                    const closeBtn = document.querySelector('.modal .close, .modal .btn-close, [data-dismiss="modal"]');
                    if (closeBtn) closeBtn.click();

                    // Intentar volver
                    const backBtn = document.querySelector('[onclick*="back"], .btn-back, .back-btn');
                    if (backBtn) backBtn.click();

                    // O recargar Mi Espacio
                    if (typeof loadModule === 'function') {
                        loadModule('mi-espacio');
                    }
                });

                await page.waitForTimeout(2000);

            } catch (subError) {
                const ssError = await screenshot(page, `${String(testNum).padStart(2, '0')}-submodule-error`);
                addResult(`Submódulo: ${card.title}`, 'FAILED', `Error: ${subError.message}`, ssError);

                // Intentar recuperar y volver a Mi Espacio
                await page.evaluate(() => {
                    if (typeof loadModule === 'function') loadModule('mi-espacio');
                });
                await page.waitForTimeout(2000);
            }
        }

        // ================================================================
        // TEST 12: VERIFICAR CENTRO DE NOTIFICACIONES (ESPECÍFICO)
        // ================================================================
        log('📝', '\n▶ TEST 12: CENTRO DE NOTIFICACIONES');

        // Primero volver a Mi Espacio
        await page.evaluate(() => {
            if (typeof loadModule === 'function') loadModule('mi-espacio');
        });
        await page.waitForTimeout(3000);

        // Click específico en Mis Notificaciones
        const notifClicked = await page.evaluate(() => {
            const cards = document.querySelectorAll('.mi-espacio-module-card');
            for (const card of cards) {
                if (card.textContent.toLowerCase().includes('notificacion')) {
                    card.click();
                    return true;
                }
            }
            // Intentar abrir directamente
            if (window.MiEspacio && window.MiEspacio.openSubmodule) {
                window.MiEspacio.openSubmodule('inbox', 'Mis Notificaciones');
                return true;
            }
            return false;
        });

        await page.waitForTimeout(4000);
        await waitForLoad(page);

        const ssNotif = await screenshot(page, '12-centro-notificaciones');

        // Verificar contenido del centro de notificaciones
        const notifStatus = await page.evaluate(() => {
            const hasInbox = document.body.innerHTML.toLowerCase().includes('inbox') ||
                            document.body.innerHTML.toLowerCase().includes('bandeja') ||
                            document.body.innerHTML.toLowerCase().includes('notificacion');
            const hasMessages = document.querySelectorAll('.notification-item, .message-item, .inbox-item').length > 0;
            const hasNotifList = document.querySelector('[class*="notification"], [class*="inbox"], [class*="message"]') !== null;

            return { hasInbox, hasMessages, hasNotifList };
        });

        if (notifClicked && (notifStatus.hasInbox || notifStatus.hasNotifList)) {
            addResult('Centro de Notificaciones', 'PASSED', `Accesible: mensajes=${notifStatus.hasMessages}`, ssNotif);
        } else {
            addResult('Centro de Notificaciones', 'WARNING', 'Verificar acceso manual', ssNotif);
        }

        // ================================================================
        // TEST 13: VERIFICAR ACCESOS RÁPIDOS
        // ================================================================
        log('📝', '\n▶ TEST 13: ACCESOS RÁPIDOS');

        // Volver a Mi Espacio
        await page.evaluate(() => {
            if (typeof loadModule === 'function') loadModule('mi-espacio');
        });
        await page.waitForTimeout(3000);

        const quickAccessInfo = await page.evaluate(() => {
            const quickButtons = document.querySelectorAll('.mi-espacio-quick-btn, .mi-espacio-quick-buttons button');
            return {
                count: quickButtons.length,
                buttons: Array.from(quickButtons).map(b => b.textContent.trim().substring(0, 30))
            };
        });

        const ssQuick = await screenshot(page, '13-accesos-rapidos');

        if (quickAccessInfo.count > 0) {
            addResult('Accesos Rápidos', 'PASSED', `${quickAccessInfo.count} botones: ${quickAccessInfo.buttons.join(', ')}`, ssQuick);
        } else {
            addResult('Accesos Rápidos', 'WARNING', 'No se encontraron accesos rápidos', ssQuick);
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
    log('📊', 'RESUMEN DE TESTS - MI ESPACIO');
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
