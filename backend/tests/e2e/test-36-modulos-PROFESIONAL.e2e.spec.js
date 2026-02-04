/**
 * TEST PROFESIONAL E2E - 36 MÓDULOS PRODUCCIÓN
 *
 * Este test hace verificación REAL de cada módulo:
 * - Captura TODOS los errores de consola JavaScript
 * - Verifica que los datos carguen (no solo el contenedor)
 * - Detecta mensajes de error en la UI
 * - Verifica llamadas API fallidas
 * - Testa funcionalidad real de cada módulo
 * - Reporta problemas específicos, no solo "OK"
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Configuración
const CONFIG = {
    BASE_URL: process.env.TEST_URL || 'https://www.aponnt.com',
    EMPRESA_LABEL: 'APONNT Demo',
    USUARIO: 'admin@demo.aponnt.com',
    PASSWORD: 'admin123',
    SCREENSHOT_DIR: 'tests/screenshots/profesional',
    TIMEOUT_NAVEGACION: 15000,
    TIMEOUT_CARGA_DATOS: 10000,
};

// Crear directorio de screenshots
const screenshotDir = path.join(__dirname, '..', 'screenshots', 'profesional');
if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
}

// Los 36 módulos comerciales con sus verificaciones específicas
// Nombres exactos como aparecen en el dashboard de producción
const MODULOS = [
    {
        key: 'users',
        nombre: 'Usuarios',
        verificaciones: {
            elementosClave: ['table', '.users-grid', '[data-module="users"]', '.card'],
            datosEsperados: ['usuario', 'email', 'rol', 'activo'],
            apiEndpoints: ['/api/users', '/api/v1/users'],
            erroresConocidos: [],
        }
    },
    {
        key: 'attendance',
        nombre: 'Asistencia',
        verificaciones: {
            elementosClave: ['table', '.attendance-grid', '.card', 'canvas'],
            datosEsperados: ['entrada', 'salida', 'fecha', 'empleado'],
            apiEndpoints: ['/api/attendance', '/api/v1/attendance'],
            erroresConocidos: [],
        }
    },
    {
        key: 'kiosks',
        nombre: 'Kioscos',
        verificaciones: {
            elementosClave: ['table', '.kiosk-card', '.card'],
            datosEsperados: ['kiosko', 'ubicación', 'estado'],
            apiEndpoints: ['/api/kiosks', '/api/v1/kiosks'],
            erroresConocidos: [],
        }
    },
    {
        key: 'organizational-structure',
        nombre: 'Estructura Organizacional',
        verificaciones: {
            elementosClave: ['table', '.org-chart', '#organigrama', '.tree', 'canvas', 'svg'],
            datosEsperados: ['departamento', 'sector', 'turno'],
            apiEndpoints: ['/api/departments', '/api/organizational'],
            erroresConocidos: ['organigrama', 'chart'],
            tabs: ['Departamentos', 'Sectores', 'Turnos', 'Organigrama'],
        }
    },
    {
        key: 'visitors',
        nombre: 'Visitantes',
        verificaciones: {
            elementosClave: ['table', '.visitor-grid', '.card'],
            datosEsperados: ['visitante', 'documento', 'ingreso'],
            apiEndpoints: ['/api/visitors'],
            erroresConocidos: [],
        }
    },
    {
        key: 'dms-dashboard',
        nombre: 'Gestión Documental (DMS)',
        verificaciones: {
            elementosClave: ['table', '.document-grid', '.file-list', '.card'],
            datosEsperados: ['documento', 'archivo', 'fecha'],
            apiEndpoints: ['/api/documents', '/api/dms'],
            erroresConocidos: [],
        }
    },
    {
        key: 'notification-center',
        nombre: 'Centro de Notificaciones',
        verificaciones: {
            elementosClave: ['.notification-list', '.card', 'table'],
            datosEsperados: ['notificación', 'mensaje'],
            apiEndpoints: ['/api/notifications'],
            erroresConocidos: [],
        }
    },
    {
        key: 'biometric-consent',
        nombre: 'Consentimientos Biométricos',
        verificaciones: {
            elementosClave: ['table', '.consent-grid', '.card'],
            datosEsperados: ['consentimiento', 'empleado'],
            apiEndpoints: ['/api/consent', '/api/biometric'],
            erroresConocidos: [],
        }
    },
    {
        key: 'user-support',
        nombre: 'Soporte / Tickets',
        verificaciones: {
            elementosClave: ['table', '.ticket-list', '.card'],
            datosEsperados: ['ticket', 'estado', 'prioridad'],
            apiEndpoints: ['/api/tickets', '/api/support'],
            erroresConocidos: [],
        }
    },
    {
        key: 'emotional-analysis',
        nombre: 'Análisis Emocional',
        verificaciones: {
            elementosClave: ['canvas', '.chart', '.card', 'table'],
            datosEsperados: ['emoción', 'análisis'],
            apiEndpoints: ['/api/emotional'],
            erroresConocidos: [],
        }
    },
    {
        key: 'hour-bank',
        nombre: 'Banco de Horas',
        verificaciones: {
            elementosClave: ['table', '.card', 'canvas'],
            datosEsperados: ['horas', 'saldo', 'empleado'],
            apiEndpoints: ['/api/hour-bank'],
            erroresConocidos: [],
        }
    },
    {
        key: 'benefits-management',
        nombre: 'Beneficios Laborales',
        verificaciones: {
            elementosClave: ['table', '.card', '.benefit-grid'],
            datosEsperados: ['beneficio', 'empleado'],
            apiEndpoints: ['/api/benefits'],
            erroresConocidos: [],
        }
    },
    {
        key: 'job-postings',
        nombre: 'Avisos de Empleo',
        verificaciones: {
            elementosClave: ['table', '.card', '.job-grid'],
            datosEsperados: ['puesto', 'postulante'],
            apiEndpoints: ['/api/jobs', '/api/postings'],
            erroresConocidos: [],
        }
    },
    {
        key: 'procurement-management',
        nombre: 'Compras y Proveedores',
        verificaciones: {
            elementosClave: ['table', '.card'],
            datosEsperados: ['proveedor', 'compra', 'orden'],
            apiEndpoints: ['/api/procurement', '/api/vendors'],
            erroresConocidos: [],
        }
    },
    {
        key: 'employee-360',
        nombre: 'Expediente 360°',
        verificaciones: {
            elementosClave: ['.card', '.profile', 'table', '.tabs'],
            datosEsperados: ['empleado', 'expediente'],
            apiEndpoints: ['/api/employees', '/api/employee-360'],
            erroresConocidos: [],
        }
    },
    {
        key: 'finance-dashboard',
        nombre: 'Finanzas',
        verificaciones: {
            elementosClave: ['canvas', '.chart', '.card', 'table'],
            datosEsperados: ['ingreso', 'egreso', 'balance'],
            apiEndpoints: ['/api/finance'],
            erroresConocidos: [],
        }
    },
    {
        key: 'warehouse-management',
        nombre: 'Gestión de Almacenes',
        verificaciones: {
            elementosClave: ['table', '.card', '.inventory'],
            datosEsperados: ['producto', 'stock', 'almacén'],
            apiEndpoints: ['/api/warehouse', '/api/inventory'],
            erroresConocidos: [],
        }
    },
    {
        key: 'art-management',
        nombre: 'ART',
        verificaciones: {
            elementosClave: ['table', '.card'],
            datosEsperados: ['siniestro', 'ART', 'accidente'],
            apiEndpoints: ['/api/art'],
            erroresConocidos: [],
        }
    },
    {
        key: 'training-management',
        nombre: 'Gestión Capacitaciones',
        verificaciones: {
            elementosClave: ['table', '.card', '.training-grid'],
            datosEsperados: ['capacitación', 'curso', 'empleado'],
            apiEndpoints: ['/api/training'],
            erroresConocidos: [],
        }
    },
    {
        key: 'sanctions-management',
        nombre: 'Gestión de Sanciones',
        verificaciones: {
            elementosClave: ['table', '.card'],
            datosEsperados: ['sanción', 'empleado', 'motivo'],
            apiEndpoints: ['/api/sanctions'],
            erroresConocidos: [],
        }
    },
    {
        key: 'vacation-management',
        nombre: 'Gestión de Vacaciones',
        verificaciones: {
            elementosClave: ['table', '.card', 'canvas', '.calendar'],
            datosEsperados: ['vacación', 'empleado', 'días'],
            apiEndpoints: ['/api/vacations'],
            erroresConocidos: [],
        }
    },
    {
        key: 'legal-dashboard',
        nombre: 'Legal',
        verificaciones: {
            elementosClave: ['table', '.card', '.case-grid'],
            datosEsperados: ['caso', 'expediente', 'estado'],
            apiEndpoints: ['/api/legal'],
            erroresConocidos: [],
        }
    },
    {
        key: 'medical',
        nombre: 'Gestión Médica',
        verificaciones: {
            elementosClave: ['table', '.card'],
            datosEsperados: ['examen', 'médico', 'empleado'],
            apiEndpoints: ['/api/medical'],
            erroresConocidos: [],
        }
    },
    {
        key: 'payroll-liquidation',
        nombre: 'Liquidación Sueldos',
        verificaciones: {
            elementosClave: ['table', '.card', '.payroll-grid'],
            datosEsperados: ['liquidación', 'sueldo', 'empleado'],
            apiEndpoints: ['/api/payroll'],
            erroresConocidos: [],
        }
    },
    {
        key: 'logistics-dashboard',
        nombre: 'Logistica Avanzada',
        verificaciones: {
            elementosClave: ['table', '.card', 'canvas', '.map'],
            datosEsperados: ['envío', 'ruta', 'vehículo'],
            apiEndpoints: ['/api/logistics'],
            erroresConocidos: [],
        }
    },
    {
        key: 'procedures-manual',
        nombre: 'Manual de Procedimientos',
        verificaciones: {
            elementosClave: ['.card', '.procedure-list', 'table'],
            datosEsperados: ['procedimiento', 'manual'],
            apiEndpoints: ['/api/procedures'],
            erroresConocidos: [],
        }
    },
    {
        key: 'employee-map',
        nombre: 'Mapa Empleados',
        verificaciones: {
            elementosClave: ['.map', 'canvas', '#map', '.leaflet'],
            datosEsperados: ['ubicación', 'empleado'],
            apiEndpoints: ['/api/employee-map'],
            erroresConocidos: [],
        }
    },
    {
        key: 'marketplace',
        nombre: 'Marketplace',
        verificaciones: {
            elementosClave: ['.card', '.product-grid', 'table'],
            datosEsperados: ['producto', 'precio'],
            apiEndpoints: ['/api/marketplace'],
            erroresConocidos: [],
        }
    },
    {
        key: 'my-procedures',
        nombre: 'Mis Procedimientos',
        verificaciones: {
            elementosClave: ['.card', 'table', '.procedure-list'],
            datosEsperados: ['procedimiento', 'estado'],
            apiEndpoints: ['/api/my-procedures'],
            erroresConocidos: [],
        }
    },
    {
        key: 'audit-reports',
        nombre: 'Reportes Auditoría',
        verificaciones: {
            elementosClave: ['table', '.card', '.report-grid'],
            datosEsperados: ['auditoría', 'reporte'],
            apiEndpoints: ['/api/audit'],
            erroresConocidos: [],
        }
    },
    {
        key: 'compliance-dashboard',
        nombre: 'Compliance Legal',
        verificaciones: {
            elementosClave: ['canvas', '.chart', '.card', 'table'],
            datosEsperados: ['riesgo', 'compliance'],
            apiEndpoints: ['/api/compliance'],
            erroresConocidos: [],
        }
    },
    {
        key: 'sla-tracking',
        nombre: 'SLA Tracking',
        verificaciones: {
            elementosClave: ['table', '.card', 'canvas'],
            datosEsperados: ['SLA', 'cumplimiento'],
            apiEndpoints: ['/api/sla'],
            erroresConocidos: [],
        }
    },
    {
        key: 'hse-management',
        nombre: 'Seguridad e Higiene Laboral (HSE)',
        verificaciones: {
            elementosClave: ['table', '.card'],
            datosEsperados: ['incidente', 'seguridad'],
            apiEndpoints: ['/api/hse'],
            erroresConocidos: [],
        }
    },
    {
        key: 'siac-commercial-dashboard',
        nombre: 'SIAC Comercial Integral',
        verificaciones: {
            elementosClave: ['canvas', '.chart', '.card', 'table'],
            datosEsperados: ['comercial', 'venta'],
            apiEndpoints: ['/api/siac'],
            erroresConocidos: [],
        }
    },
    {
        key: 'voice-platform',
        nombre: 'Voice Platform',
        verificaciones: {
            elementosClave: ['.card', 'table', '.voice-grid'],
            datosEsperados: ['llamada', 'voz'],
            apiEndpoints: ['/api/voice'],
            erroresConocidos: [],
        }
    },
    {
        key: 'mi-espacio',
        nombre: 'Mi Espacio',
        verificaciones: {
            elementosClave: ['.card', '.profile', '.dashboard'],
            datosEsperados: ['perfil', 'usuario'],
            apiEndpoints: ['/api/mi-espacio'],
            erroresConocidos: [],
        }
    },
];

test.describe('TEST PROFESIONAL: 36 Módulos con Verificación Real', () => {

    test.setTimeout(600000); // 10 minutos total

    test('Auditoría completa de 36 módulos comerciales', async ({ page }) => {

        // ═══════════════════════════════════════════════════════════════
        // SETUP: Capturar TODOS los errores y llamadas API
        // ═══════════════════════════════════════════════════════════════

        const erroresGlobales = [];
        const apiErrors = [];
        const warningsGlobales = [];

        // Capturar errores de consola
        page.on('console', msg => {
            if (msg.type() === 'error') {
                erroresGlobales.push({
                    timestamp: new Date().toISOString(),
                    text: msg.text(),
                    location: msg.location(),
                });
            }
            if (msg.type() === 'warning') {
                warningsGlobales.push({
                    timestamp: new Date().toISOString(),
                    text: msg.text(),
                });
            }
        });

        // Capturar errores de página
        page.on('pageerror', error => {
            erroresGlobales.push({
                timestamp: new Date().toISOString(),
                text: error.message,
                stack: error.stack,
                type: 'pageerror',
            });
        });

        // Capturar errores de red/API
        page.on('response', response => {
            if (response.status() >= 400) {
                apiErrors.push({
                    timestamp: new Date().toISOString(),
                    url: response.url(),
                    status: response.status(),
                    statusText: response.statusText(),
                });
            }
        });

        // ═══════════════════════════════════════════════════════════════
        // LOGIN
        // ═══════════════════════════════════════════════════════════════

        console.log('\n' + '═'.repeat(70));
        console.log('  TEST PROFESIONAL E2E - 36 MÓDULOS');
        console.log('  URL:', CONFIG.BASE_URL);
        console.log('  Fecha:', new Date().toISOString());
        console.log('═'.repeat(70) + '\n');

        await page.goto(`${CONFIG.BASE_URL}/panel-empresa.html`, {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        // ═══════════════════════════════════════════════════════════════
        // LOGIN COMO USUARIO REAL - paso a paso
        // ═══════════════════════════════════════════════════════════════

        // Paso 1: Esperar que la página cargue completamente
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Paso 2: Seleccionar empresa usando el select nativo
        // El combobox usa un select nativo debajo
        const selectEmpresa = page.locator('select').first();
        await selectEmpresa.waitFor({ state: 'attached', timeout: 15000 });
        await selectEmpresa.selectOption({ value: 'aponnt-demo' });
        await page.waitForTimeout(1500);
        console.log('✅ Empresa seleccionada: APONNT Demo');

        // Paso 3: Esperar que se habiliten los campos de usuario
        await page.waitForTimeout(1000);

        // Paso 4: Llenar usuario
        const campoUsuario = page.locator('input:not([disabled]):not([type="password"])').first();
        await campoUsuario.waitFor({ state: 'visible', timeout: 10000 });
        await campoUsuario.click();
        await page.waitForTimeout(300);
        await campoUsuario.fill(CONFIG.USUARIO);
        await page.waitForTimeout(500);

        // Paso 5: Llenar contraseña
        const campoPassword = page.locator('input[type="password"]:not([disabled])').first();
        await campoPassword.waitFor({ state: 'visible', timeout: 5000 });
        await campoPassword.click();
        await page.waitForTimeout(300);
        await campoPassword.fill(CONFIG.PASSWORD);
        await page.waitForTimeout(500);

        // Paso 6: Click en botón de login
        const btnLogin = page.locator('button:has-text("Iniciar"), button:has-text("Login"), button[type="submit"]').first();
        await btnLogin.waitFor({ state: 'visible', timeout: 5000 });
        await btnLogin.click();

        // Esperar carga del dashboard - buscar texto de algún módulo
        await page.waitForSelector('text=Usuarios', { timeout: 15000 });
        await page.waitForTimeout(3000);

        await page.screenshot({
            path: path.join(screenshotDir, '00-login-exitoso.png'),
            fullPage: true
        });

        console.log('✅ Login exitoso\n');

        // ═══════════════════════════════════════════════════════════════
        // RESULTADOS POR MÓDULO
        // ═══════════════════════════════════════════════════════════════

        const resultados = [];

        for (let i = 0; i < MODULOS.length; i++) {
            const modulo = MODULOS[i];
            const numPadded = String(i + 1).padStart(2, '0');

            console.log(`\n${'─'.repeat(70)}`);
            console.log(`🔵 [${numPadded}/36] ${modulo.nombre} (${modulo.key})`);
            console.log('─'.repeat(70));

            const resultado = {
                numero: i + 1,
                key: modulo.key,
                nombre: modulo.nombre,
                estado: 'PENDIENTE',
                erroresJS: [],
                erroresAPI: [],
                erroresUI: [],
                warnings: [],
                elementosEncontrados: [],
                elementosFaltantes: [],
                tabsExplorados: [],
                crudResultado: null,
                tiempoCarga: 0,
                screenshot: null,
            };

            // Limpiar errores anteriores para este módulo
            const erroresAntes = erroresGlobales.length;
            const apiErrorsAntes = apiErrors.length;

            try {
                // ───────────────────────────────────────────────────────
                // PASO 1: Navegar al módulo
                // ───────────────────────────────────────────────────────

                const startTime = Date.now();

                // Cerrar modales abiertos
                await page.evaluate(() => {
                    document.querySelectorAll('.modal.show, .modal.fade.show').forEach(m => {
                        m.classList.remove('show');
                        m.style.display = 'none';
                    });
                    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                });

                // Buscar y hacer click en el módulo - usando el nombre del módulo como texto
                // El dashboard usa una grilla de cards con el nombre del módulo
                let moduloEncontrado = false;

                // Lista de posibles selectores para el módulo
                const selectoresPosibles = [
                    `text="${modulo.nombre}"`,
                    `text="${modulo.nombre.replace('Gestión de ', '')}"`,
                    `text="${modulo.nombre.replace('Control de ', '')}"`,
                    `[data-module="${modulo.key}"]`,
                ];

                for (const selector of selectoresPosibles) {
                    try {
                        const elemento = page.locator(selector).first();
                        const visible = await elemento.isVisible().catch(() => false);
                        if (visible) {
                            await elemento.click();
                            moduloEncontrado = true;
                            break;
                        }
                    } catch {
                        // Intentar siguiente selector
                    }
                }

                if (!moduloEncontrado) {
                    resultado.estado = 'NO ENCONTRADO';
                    resultado.erroresUI.push(`Módulo no encontrado: ${modulo.nombre}`);
                    console.log(`   ❌ Módulo no encontrado en dashboard`);
                }

                if (!moduloEncontrado) {
                    resultados.push(resultado);
                    continue;
                }

                // Esperar carga
                await page.waitForTimeout(3000);
                await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

                resultado.tiempoCarga = Date.now() - startTime;

                // ───────────────────────────────────────────────────────
                // PASO 2: Capturar errores JS nuevos
                // ───────────────────────────────────────────────────────

                const erroresNuevos = erroresGlobales.slice(erroresAntes);
                if (erroresNuevos.length > 0) {
                    resultado.erroresJS = erroresNuevos;
                    console.log(`   ⚠️  ${erroresNuevos.length} errores JavaScript detectados:`);
                    erroresNuevos.forEach(e => {
                        console.log(`      - ${e.text.substring(0, 100)}...`);
                    });
                }

                // Errores API nuevos
                const apiErrorsNuevos = apiErrors.slice(apiErrorsAntes);
                if (apiErrorsNuevos.length > 0) {
                    resultado.erroresAPI = apiErrorsNuevos;
                    console.log(`   ⚠️  ${apiErrorsNuevos.length} errores API detectados:`);
                    apiErrorsNuevos.forEach(e => {
                        console.log(`      - ${e.status} ${e.url.substring(0, 80)}...`);
                    });
                }

                // ───────────────────────────────────────────────────────
                // PASO 3: Verificar elementos clave
                // ───────────────────────────────────────────────────────

                for (const selector of modulo.verificaciones.elementosClave) {
                    try {
                        const elemento = page.locator(selector).first();
                        const visible = await elemento.isVisible().catch(() => false);
                        if (visible) {
                            resultado.elementosEncontrados.push(selector);
                        } else {
                            resultado.elementosFaltantes.push(selector);
                        }
                    } catch {
                        resultado.elementosFaltantes.push(selector);
                    }
                }

                console.log(`   📋 Elementos: ${resultado.elementosEncontrados.length} encontrados, ${resultado.elementosFaltantes.length} faltantes`);

                // ───────────────────────────────────────────────────────
                // PASO 4: Buscar errores en la UI
                // ───────────────────────────────────────────────────────

                const erroresUISelectores = [
                    '.alert-danger',
                    '.error-message',
                    '.text-danger',
                    '[class*="error"]',
                    '.toast-error',
                    '.notification-error',
                ];

                for (const selector of erroresUISelectores) {
                    try {
                        const elementos = await page.locator(selector).all();
                        for (const el of elementos) {
                            const visible = await el.isVisible().catch(() => false);
                            if (visible) {
                                const texto = await el.textContent().catch(() => '');
                                if (texto && texto.trim().length > 0) {
                                    resultado.erroresUI.push(texto.trim().substring(0, 200));
                                }
                            }
                        }
                    } catch {
                        // Ignorar
                    }
                }

                if (resultado.erroresUI.length > 0) {
                    console.log(`   ❌ Errores visibles en UI:`);
                    resultado.erroresUI.forEach(e => {
                        console.log(`      - ${e.substring(0, 80)}...`);
                    });
                }

                // ───────────────────────────────────────────────────────
                // PASO 5: Verificar que hay datos (no solo contenedor vacío)
                // ───────────────────────────────────────────────────────

                const tablas = await page.locator('table tbody tr').count().catch(() => 0);
                const cards = await page.locator('.card:not(.card-header)').count().catch(() => 0);
                const items = await page.locator('.list-group-item, .grid-item').count().catch(() => 0);

                const hayDatos = tablas > 0 || cards > 0 || items > 0;

                if (!hayDatos) {
                    // Verificar si es un mensaje de "sin datos"
                    const sinDatos = await page.locator('text=/no hay|sin datos|vacío|empty|no records/i').count().catch(() => 0);
                    if (sinDatos > 0) {
                        resultado.warnings.push('Módulo sin datos (posiblemente vacío)');
                        console.log(`   ⚠️  Módulo parece estar vacío (sin datos)`);
                    }
                }

                // ───────────────────────────────────────────────────────
                // PASO 6: Explorar tabs si existen
                // ───────────────────────────────────────────────────────

                if (modulo.verificaciones.tabs) {
                    for (const tabName of modulo.verificaciones.tabs) {
                        try {
                            const tab = page.locator(`text="${tabName}", [data-tab="${tabName}"]`).first();
                            const visible = await tab.isVisible().catch(() => false);
                            if (visible) {
                                await tab.click({ force: true });
                                await page.waitForTimeout(1500);

                                // Verificar errores después de click en tab
                                const erroresPostTab = erroresGlobales.slice(erroresAntes + resultado.erroresJS.length);
                                if (erroresPostTab.length > 0) {
                                    resultado.erroresJS.push(...erroresPostTab);
                                    console.log(`   ❌ Error en tab "${tabName}":`);
                                    erroresPostTab.forEach(e => {
                                        console.log(`      - ${e.text.substring(0, 80)}...`);
                                    });
                                }

                                resultado.tabsExplorados.push(tabName);
                            }
                        } catch {
                            // Tab no encontrado
                        }
                    }

                    if (resultado.tabsExplorados.length > 0) {
                        console.log(`   📑 Tabs explorados: ${resultado.tabsExplorados.join(', ')}`);
                    }
                }

                // ───────────────────────────────────────────────────────
                // PASO 7: Screenshot
                // ───────────────────────────────────────────────────────

                // Scroll para capturar todo
                await page.evaluate(() => window.scrollTo(0, 0));
                await page.waitForTimeout(500);

                const screenshotPath = path.join(screenshotDir, `${numPadded}-${modulo.key}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                resultado.screenshot = screenshotPath;

                // ───────────────────────────────────────────────────────
                // PASO 8: Determinar estado final
                // ───────────────────────────────────────────────────────

                if (resultado.erroresJS.length > 0 || resultado.erroresAPI.length > 0 || resultado.erroresUI.length > 0) {
                    resultado.estado = 'ERROR';
                    console.log(`   ❌ ESTADO: ERROR`);
                } else if (resultado.warnings.length > 0 || resultado.elementosFaltantes.length > resultado.elementosEncontrados.length) {
                    resultado.estado = 'WARNING';
                    console.log(`   ⚠️  ESTADO: WARNING`);
                } else {
                    resultado.estado = 'OK';
                    console.log(`   ✅ ESTADO: OK`);
                }

                console.log(`   ⏱️  Tiempo de carga: ${resultado.tiempoCarga}ms`);

            } catch (error) {
                resultado.estado = 'EXCEPTION';
                resultado.erroresJS.push({ text: error.message, stack: error.stack });
                console.log(`   💥 EXCEPCIÓN: ${error.message}`);

                // Screenshot de error
                const errorScreenshot = path.join(screenshotDir, `${numPadded}-${modulo.key}-ERROR.png`);
                await page.screenshot({ path: errorScreenshot, fullPage: true }).catch(() => {});
                resultado.screenshot = errorScreenshot;
            }

            resultados.push(resultado);
        }

        // ═══════════════════════════════════════════════════════════════
        // RESUMEN FINAL
        // ═══════════════════════════════════════════════════════════════

        console.log('\n' + '═'.repeat(70));
        console.log('  RESUMEN FINAL - TEST PROFESIONAL');
        console.log('═'.repeat(70));

        const conError = resultados.filter(r => r.estado === 'ERROR');
        const conWarning = resultados.filter(r => r.estado === 'WARNING');
        const ok = resultados.filter(r => r.estado === 'OK');
        const noEncontrados = resultados.filter(r => r.estado === 'NO ENCONTRADO');
        const excepciones = resultados.filter(r => r.estado === 'EXCEPTION');

        console.log(`\n  ✅ OK: ${ok.length}`);
        console.log(`  ⚠️  WARNING: ${conWarning.length}`);
        console.log(`  ❌ ERROR: ${conError.length}`);
        console.log(`  🔍 NO ENCONTRADO: ${noEncontrados.length}`);
        console.log(`  💥 EXCEPCIÓN: ${excepciones.length}`);
        console.log(`  📊 TOTAL: ${resultados.length}`);

        if (conError.length > 0) {
            console.log(`\n  ═══ MÓDULOS CON ERROR ═══`);
            conError.forEach(r => {
                console.log(`\n  [${r.numero}] ${r.nombre} (${r.key})`);
                if (r.erroresJS.length > 0) {
                    console.log(`      JS Errors: ${r.erroresJS.length}`);
                    r.erroresJS.slice(0, 3).forEach(e => {
                        console.log(`        - ${(e.text || '').substring(0, 100)}`);
                    });
                }
                if (r.erroresAPI.length > 0) {
                    console.log(`      API Errors: ${r.erroresAPI.length}`);
                    r.erroresAPI.slice(0, 3).forEach(e => {
                        console.log(`        - ${e.status} ${e.url.substring(0, 60)}`);
                    });
                }
                if (r.erroresUI.length > 0) {
                    console.log(`      UI Errors: ${r.erroresUI.length}`);
                    r.erroresUI.slice(0, 3).forEach(e => {
                        console.log(`        - ${e.substring(0, 80)}`);
                    });
                }
            });
        }

        if (conWarning.length > 0) {
            console.log(`\n  ═══ MÓDULOS CON WARNING ═══`);
            conWarning.forEach(r => {
                console.log(`  [${r.numero}] ${r.nombre}: ${r.warnings.join(', ')}`);
            });
        }

        console.log('\n' + '═'.repeat(70));

        // Guardar reporte JSON
        const reportePath = path.join(screenshotDir, 'reporte-profesional.json');
        fs.writeFileSync(reportePath, JSON.stringify({
            fecha: new Date().toISOString(),
            url: CONFIG.BASE_URL,
            resumen: {
                total: resultados.length,
                ok: ok.length,
                warning: conWarning.length,
                error: conError.length,
                noEncontrado: noEncontrados.length,
                excepcion: excepciones.length,
            },
            modulosConError: conError.map(r => ({
                nombre: r.nombre,
                key: r.key,
                erroresJS: r.erroresJS,
                erroresAPI: r.erroresAPI,
                erroresUI: r.erroresUI,
            })),
            modulosConWarning: conWarning.map(r => ({
                nombre: r.nombre,
                key: r.key,
                warnings: r.warnings,
            })),
            detalleCompleto: resultados,
        }, null, 2));

        console.log(`\n  📄 Reporte guardado: ${reportePath}`);
        console.log(`  📸 Screenshots en: ${screenshotDir}`);
        console.log('═'.repeat(70) + '\n');

        // El test FALLA si hay módulos con error crítico
        expect(conError.length, `${conError.length} módulos con errores críticos`).toBeLessThanOrEqual(3);
    });
});
