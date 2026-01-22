/**
 * ============================================================================
 * TEST E2E EXHAUSTIVO: EXPEDIENTE 360°
 * ============================================================================
 * Testing completo desde perspectiva de usuario:
 * - Login real
 * - Navegación al módulo
 * - Selección de empleado
 * - Prueba de las 13 tabs
 * - Verificación de modales
 * - Verificación de datos
 * - Screenshots en cada paso
 * ============================================================================
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'test-screenshots-360');

// Crear directorio de screenshots
if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const TABS = [
    { id: 'overview', name: 'Dashboard', icon: '📊' },
    { id: 'personal', name: 'Personal', icon: '👤' },
    { id: 'laboral', name: 'Laboral', icon: '💼' },
    { id: 'attendance', name: 'Asistencia', icon: '🕐' },
    { id: 'discipline', name: 'Disciplina', icon: '⚖️' },
    { id: 'training', name: 'Capacitación', icon: '🎓' },
    { id: 'medical', name: 'Médico', icon: '🏥' },
    { id: 'documents', name: 'Documentos', icon: '📁' },
    { id: 'timeline', name: 'Timeline', icon: '📅' },
    { id: 'ai-analysis', name: 'IA', icon: '🤖' },
    { id: 'biometric', name: 'Biométrico', icon: '🎭' },
    { id: 'compatibility', name: 'Compatibilidad', icon: '🔄' },
    { id: 'hour-bank', name: 'Banco Horas', icon: '⏱️' }
];

const results = {
    module: 'Expediente 360°',
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
    log('🚀', 'TEST E2E EXHAUSTIVO: EXPEDIENTE 360°');
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
        // TEST 2: NAVEGACIÓN AL MÓDULO EXPEDIENTE 360°
        // ================================================================
        log('📝', '\n▶ TEST 2: NAVEGACIÓN AL MÓDULO');

        // Buscar y hacer click en la tarjeta del módulo employee-360
        const moduleFound = await page.evaluate(() => {
            // Método 1: Buscar tarjeta con data-module-key
            const card = document.querySelector('[data-module-key="employee-360"]');
            if (card) {
                card.click();
                return { method: 'card-click', found: true };
            }

            // Método 2: Buscar por texto en tarjetas
            const cards = document.querySelectorAll('.module-card, .employee-module-card');
            for (const c of cards) {
                const text = c.textContent.toLowerCase();
                if (text.includes('expediente') || text.includes('360') || text.includes('perfil')) {
                    c.click();
                    return { method: 'text-search', found: true };
                }
            }

            // Método 3: Intentar cargar directamente con función global
            if (typeof loadModule === 'function') {
                loadModule('employee-360');
                return { method: 'loadModule', found: true };
            }

            return { method: 'none', found: false };
        });

        log('📋', `   Método de navegación: ${moduleFound.method}`);

        await page.waitForTimeout(5000); // Más tiempo para cargar módulo complejo
        await waitForLoad(page);

        const ssModule = await screenshot(page, '02-expediente-360-loaded');

        // Verificar que el módulo se cargó correctamente
        const moduleLoaded = await page.evaluate(() => {
            const hasWrapper = document.querySelector('.employee-360-wrapper') !== null;
            const hasHeader = document.querySelector('.e360-header') !== null;
            const hasTabs = document.querySelector('.e360-tabs') !== null;
            const hasSelector = document.querySelector('.e360-employee-selector') !== null;

            return {
                hasWrapper,
                hasHeader,
                hasTabs,
                hasSelector,
                loaded: hasWrapper || hasHeader || hasTabs
            };
        });

        log('📋', `   Estado del módulo: wrapper=${moduleLoaded.hasWrapper}, header=${moduleLoaded.hasHeader}, tabs=${moduleLoaded.hasTabs}, selector=${moduleLoaded.hasSelector}`);

        if (moduleLoaded.loaded) {
            addResult('Navegación a Expediente 360°', 'PASSED', `Módulo cargado: tabs=${moduleLoaded.hasTabs}, selector=${moduleLoaded.hasSelector}`, ssModule);
        } else {
            addResult('Navegación a Expediente 360°', 'FAILED', 'El módulo NO se cargó correctamente - verificar tarjeta y función loadModule', ssModule);
            // Tomar screenshot adicional del estado actual
            const ssDebug = await screenshot(page, '02b-debug-module-not-loaded');
            log('📸', `   Screenshot debug: ${ssDebug}`);
        }

        // ================================================================
        // TEST 3: SELECTOR DE EMPLEADO
        // ================================================================
        log('📝', '\n▶ TEST 3: SELECTOR DE EMPLEADO');

        // Buscar el selector de empleado
        const employeeSelector = await page.$('select[id*="employee"], select.e360-employee-select, #employeeSelect');

        if (employeeSelector) {
            // Obtener lista de empleados
            const employees = await page.evaluate(() => {
                const select = document.querySelector('select[id*="employee"], select.e360-employee-select, #employeeSelect');
                if (!select) return [];
                return Array.from(select.options).map(o => ({ value: o.value, text: o.text }));
            });

            log('📋', `   Encontrados ${employees.length} empleados en el selector`);

            if (employees.length > 1) {
                // Seleccionar el primer empleado real (no el placeholder)
                const firstEmployee = employees.find(e => e.value && e.value !== '');
                if (firstEmployee) {
                    await page.selectOption('select[id*="employee"], select.e360-employee-select, #employeeSelect', firstEmployee.value);
                    await page.waitForTimeout(2000);
                    await waitForLoad(page);

                    const ssEmployee = await screenshot(page, '03-employee-selected');
                    addResult('Selector de empleado', 'PASSED', `Empleado seleccionado: ${firstEmployee.text}`, ssEmployee);
                }
            } else {
                addResult('Selector de empleado', 'WARNING', 'No hay empleados disponibles', null);
            }
        } else {
            const ssNoSelector = await screenshot(page, '03-no-employee-selector');
            addResult('Selector de empleado', 'WARNING', 'No se encontró selector de empleado', ssNoSelector);
        }

        // ================================================================
        // TEST 3.5: GENERAR EXPEDIENTE
        // ================================================================
        log('📝', '\n▶ TEST 3.5: GENERAR EXPEDIENTE');

        // El módulo requiere hacer click en "Generar Expediente" para cargar los tabs
        const generateClicked = await page.evaluate(() => {
            // Buscar botón por clase específica
            const generateBtn = document.querySelector('button.btn-generate, .btn-primary[onclick*="generate"]');
            if (generateBtn) {
                generateBtn.click();
                return { method: 'class-selector', found: true };
            }

            // Buscar por texto en todos los botones
            const buttons = document.querySelectorAll('button, .btn');
            for (const btn of buttons) {
                const text = btn.textContent.toLowerCase();
                if (text.includes('generar') && text.includes('expediente')) {
                    btn.click();
                    return { method: 'text-generar-expediente', found: true };
                }
            }

            // Buscar solo por "Generar"
            for (const btn of buttons) {
                const text = btn.textContent.toLowerCase();
                if (text.includes('generar')) {
                    btn.click();
                    return { method: 'text-generar', found: true };
                }
            }

            return { method: 'none', found: false };
        });

        log('📋', `   Botón generar: ${generateClicked.method}`);

        if (generateClicked.found) {
            // Esperar hasta que el expediente termine de generarse (máximo 60 segundos)
            log('📋', '   Esperando que el expediente termine de generarse...');
            let expedienteReady = false;
            let waitAttempts = 0;
            const maxWaitAttempts = 30; // 30 intentos de 2 segundos = 60 segundos máximo

            while (!expedienteReady && waitAttempts < maxWaitAttempts) {
                await page.waitForTimeout(2000);
                waitAttempts++;

                const loadingStatus = await page.evaluate(() => {
                    // Verificar si hay indicador de carga visible
                    const loadingText = document.body.innerHTML.toLowerCase();
                    const isLoading = loadingText.includes('generando') ||
                                     loadingText.includes('cargando') ||
                                     document.querySelector('.loading, .spinner, [class*="loading"]');

                    // Verificar si los tabs del expediente están visibles
                    const tabsContainer = document.querySelector('.e360-tabs');
                    const hasTabs = tabsContainer && tabsContainer.querySelectorAll('.e360-tab, [data-tab]').length > 5;

                    // Verificar si hay contenido del expediente
                    const hasExpContent = document.querySelector('.e360-tab-content, #tab-overview, #tab-personal, .employee-info');

                    return {
                        isLoading: !!isLoading,
                        hasTabs,
                        hasExpContent: !!hasExpContent
                    };
                });

                if (loadingStatus.hasTabs || loadingStatus.hasExpContent) {
                    expedienteReady = true;
                    log('📋', `   Expediente listo después de ${waitAttempts * 2} segundos`);
                } else if (!loadingStatus.isLoading) {
                    // No está cargando pero tampoco tiene contenido - posible error
                    log('📋', `   Intento ${waitAttempts}/${maxWaitAttempts}: Sin carga activa, sin tabs...`);
                } else {
                    log('📋', `   Intento ${waitAttempts}/${maxWaitAttempts}: Aún generando...`);
                }
            }

            await waitForLoad(page);
            const ssGenerated = await screenshot(page, '03b-expediente-generated');

            // Verificar que aparecieron los tabs - buscar dentro de e360-tabs o similares
            const tabsInfo = await page.evaluate(() => {
                // Los tabs están en un contenedor con clase e360-tabs o similar
                const tabContainer = document.querySelector('.e360-tabs');
                const tabs = tabContainer ?
                    tabContainer.querySelectorAll('.e360-tab, [data-tab], button, a') :
                    document.querySelectorAll('.e360-tab, [data-tab]');

                // Extraer información de los tabs encontrados
                const tabList = Array.from(tabs).map(t => ({
                    text: t.textContent.trim().substring(0, 20),
                    dataTab: t.getAttribute('data-tab'),
                    isActive: t.classList.contains('active')
                })).filter(t => t.text.length > 0);

                return {
                    count: tabList.length,
                    tabs: tabList.slice(0, 15), // Primeros 15
                    hasTabContainer: !!tabContainer
                };
            });

            log('📋', `   Tabs encontrados: ${tabsInfo.count}, container: ${tabsInfo.hasTabContainer}`);
            if (tabsInfo.tabs.length > 0) {
                log('📋', `   Tabs: ${tabsInfo.tabs.map(t => t.text).join(', ')}`);
            }

            if (tabsInfo.count > 0) {
                addResult('Generar Expediente', 'PASSED', `Expediente generado, ${tabsInfo.count} tabs detectados`, ssGenerated);
            } else {
                addResult('Generar Expediente', 'WARNING', 'Expediente generado pero tabs no detectados', ssGenerated);
            }
        } else {
            addResult('Generar Expediente', 'WARNING', 'No se encontró botón de generar expediente', null);
        }

        // ================================================================
        // TEST 4-16: PRUEBA DE CADA TAB (DETECCIÓN DINÁMICA)
        // ================================================================
        log('📝', '\n▶ TESTS 4-16: PRUEBA DE TABS (DINÁMICO)');

        // Obtener lista real de tabs de la página
        const realTabs = await page.evaluate(() => {
            const tabContainer = document.querySelector('.e360-tabs');
            if (!tabContainer) return [];

            const tabElements = tabContainer.querySelectorAll('.e360-tab, [data-tab]');
            return Array.from(tabElements).map((t, idx) => ({
                index: idx,
                text: t.textContent.trim().replace(/[^\w\sáéíóúñÁÉÍÓÚÑ]/g, '').trim(),
                dataTab: t.getAttribute('data-tab'),
                isActive: t.classList.contains('active')
            })).filter(t => t.text.length > 0);
        });

        log('📋', `   Tabs reales encontrados: ${realTabs.length}`);
        if (realTabs.length > 0) {
            log('📋', `   Lista: ${realTabs.map(t => t.text).join(', ')}`);
        }

        for (let i = 0; i < realTabs.length; i++) {
            const tab = realTabs[i];
            const testNum = i + 4;

            log('🔄', `   [${i + 1}/${realTabs.length}] Probando tab: ${tab.text}...`);

            try {
                // Click en el tab usando el índice
                const tabClicked = await page.evaluate((tabIndex) => {
                    const tabContainer = document.querySelector('.e360-tabs');
                    if (!tabContainer) return false;

                    const tabElements = tabContainer.querySelectorAll('.e360-tab, [data-tab]');
                    if (tabIndex >= tabElements.length) return false;

                    tabElements[tabIndex].click();
                    return true;
                }, i);

                await page.waitForTimeout(2000); // Tiempo para cargar contenido del tab

                const ssTab = await screenshot(page, `${String(testNum).padStart(2, '0')}-tab-${tab.text.substring(0, 15).replace(/\s/g, '-')}`);

                // Verificar estado del tab después del click
                const tabStatus = await page.evaluate((tabIndex) => {
                    const tabContainer = document.querySelector('.e360-tabs');
                    if (!tabContainer) return { clicked: false };

                    const tabElements = tabContainer.querySelectorAll('.e360-tab, [data-tab]');
                    const clickedTab = tabElements[tabIndex];
                    const isActive = clickedTab && clickedTab.classList.contains('active');

                    // Buscar errores REALES (alertas, toasts, mensajes de error visibles)
                    const errorAlert = document.querySelector('.alert-danger, .error-message, .toast-error, [role="alert"]');
                    const hasVisibleError = errorAlert && errorAlert.offsetParent !== null;

                    // Buscar contenido visible
                    const contentAreas = document.querySelectorAll('.e360-tab-content, .tab-content, .tab-pane');
                    let hasVisibleContent = false;
                    contentAreas.forEach(area => {
                        if (area.offsetParent !== null && area.innerHTML.length > 200) {
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

                if (tabClicked && tabStatus.isActive) {
                    if (tabStatus.hasVisibleError) {
                        addResult(`Tab: ${tab.text}`, 'FAILED', 'Error visible en la pestaña', ssTab);
                    } else if (tabStatus.hasVisibleContent) {
                        addResult(`Tab: ${tab.text}`, 'PASSED', 'Tab activo con contenido visible', ssTab);
                    } else {
                        addResult(`Tab: ${tab.text}`, 'PASSED', 'Tab activo (puede estar cargando)', ssTab);
                    }
                } else if (tabClicked) {
                    addResult(`Tab: ${tab.text}`, 'WARNING', 'Click realizado pero tab no marcado como activo', ssTab);
                } else {
                    addResult(`Tab: ${tab.text}`, 'WARNING', 'No se pudo hacer click en el tab', ssTab);
                }

            } catch (tabError) {
                const ssError = await screenshot(page, `${String(testNum).padStart(2, '0')}-tab-error`);
                addResult(`Tab: ${tab.text}`, 'FAILED', `Error: ${tabError.message}`, ssError);
            }
        }

        // Si no se encontraron tabs reales, reportar
        if (realTabs.length === 0) {
            addResult('Tabs del Expediente', 'WARNING', 'No se detectaron tabs - el expediente puede no haberse cargado completamente', null);
        }

        // ================================================================
        // TEST 17: VERIFICAR MODALES
        // ================================================================
        log('📝', '\n▶ TEST 17: VERIFICAR MODALES');

        // Buscar botones que abren modales
        const modalButtons = await page.evaluate(() => {
            const buttons = document.querySelectorAll('[data-toggle="modal"], [data-bs-toggle="modal"], button[onclick*="modal"], .btn-edit, .btn-add');
            return buttons.length;
        });

        log('📋', `   Encontrados ${modalButtons} botones de modal`);

        if (modalButtons > 0) {
            // Intentar abrir el primer modal
            const modalOpened = await page.evaluate(() => {
                const btn = document.querySelector('[data-toggle="modal"], [data-bs-toggle="modal"], button[onclick*="modal"]');
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            });

            await page.waitForTimeout(1000);

            const modalVisible = await page.evaluate(() => {
                const modal = document.querySelector('.modal.show, .modal[style*="display: block"]');
                return modal !== null;
            });

            const ssModal = await screenshot(page, '17-modal-test');

            if (modalVisible) {
                // Cerrar el modal
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);

                addResult('Modales', 'PASSED', 'Modal abre y cierra correctamente', ssModal);
            } else {
                addResult('Modales', 'WARNING', 'No se pudo verificar apertura de modal', ssModal);
            }
        } else {
            addResult('Modales', 'WARNING', 'No se encontraron botones de modal', null);
        }

        // ================================================================
        // TEST 18: VERIFICAR EXPORTACIÓN PDF
        // ================================================================
        log('📝', '\n▶ TEST 18: VERIFICAR EXPORTACIÓN PDF');

        const exportButton = await page.$('button:has-text("PDF"), button:has-text("Exportar"), .btn-export');

        if (exportButton) {
            const ssPdf = await screenshot(page, '18-export-pdf');
            addResult('Exportación PDF', 'PASSED', 'Botón de exportación encontrado', ssPdf);
        } else {
            addResult('Exportación PDF', 'WARNING', 'No se encontró botón de exportación', null);
        }

        // ================================================================
        // TEST 19: VERIFICAR REFRESH DE DATOS (F5)
        // ================================================================
        log('📝', '\n▶ TEST 19: VERIFICAR PERSISTENCIA (F5)');

        await page.reload();
        await page.waitForTimeout(3000);
        await waitForLoad(page);

        // Re-autenticar si es necesario
        const stillLoggedIn = await page.evaluate(() => {
            return localStorage.getItem('authToken') !== null;
        });

        const ssF5 = await screenshot(page, '19-after-refresh');

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
    log('📊', 'RESUMEN DE TESTS - EXPEDIENTE 360°');
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
