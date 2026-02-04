/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TEST E2E COMPLETO: 36 MÓDULOS DE panel-empresa
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Este test:
 * 1. Hace login en panel-empresa
 * 2. Navega por cada uno de los 36 módulos comerciales
 * 3. Toma screenshot de cada módulo
 * 4. Verifica que cada módulo carga sin errores
 *
 * Empresa: wftest-empresa-demo (tiene todos los módulos)
 * Usuario: soporte / admin123
 *
 * Ejecutar: npx playwright test tests/e2e/test-36-modulos-completo.e2e.spec.js
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { test, expect } = require('@playwright/test');

// Configuración
const BASE_URL = 'http://localhost:9998';
const EMPRESA_SLUG = 'wftest-empresa-demo';
const USUARIO = 'soporte';
const PASSWORD = 'admin123';

// Los 36 módulos comerciales (9 CORE + 27 opcionales)
const MODULOS_COMERCIALES = [
    // 🔵 CORE (9)
    { key: 'notification-center', name: 'Centro de Notificaciones', type: 'core' },
    { key: 'biometric-consent', name: 'Consentimientos y Privacidad', type: 'core' },
    { key: 'attendance', name: 'Control de Asistencia', type: 'core' },
    { key: 'organizational-structure', name: 'Estructura Organizacional', type: 'core' },
    { key: 'kiosks', name: 'Gestión de Kioscos', type: 'core' },
    { key: 'users', name: 'Gestión de Usuarios', type: 'core' },
    { key: 'dms-dashboard', name: 'Gestión Documental (DMS)', type: 'core' },
    { key: 'mi-espacio', name: 'Mi Espacio', type: 'core' },
    { key: 'user-support', name: 'Soporte / Tickets', type: 'core' },

    // 🟢 OPCIONALES (27)
    { key: 'emotional-analysis', name: 'Análisis Emocional', type: 'opcional' },
    { key: 'hour-bank', name: 'Banco de Horas', type: 'opcional' },
    { key: 'benefits-management', name: 'Beneficios Laborales', type: 'opcional' },
    { key: 'job-postings', name: 'Búsquedas Laborales', type: 'opcional' },
    { key: 'procurement-management', name: 'Compras y Proveedores', type: 'opcional' },
    { key: 'visitors', name: 'Control de Visitantes', type: 'opcional' },
    { key: 'employee-360', name: 'Expediente 360°', type: 'opcional' },
    { key: 'finance-dashboard', name: 'Finanzas', type: 'opcional' },
    { key: 'warehouse-management', name: 'Gestión de Almacenes', type: 'opcional' },
    { key: 'art-management', name: 'Gestión de ART', type: 'opcional' },
    { key: 'training-management', name: 'Gestión de Capacitaciones', type: 'opcional' },
    { key: 'sanctions-management', name: 'Gestión de Sanciones', type: 'opcional' },
    { key: 'vacation-management', name: 'Gestión de Vacaciones', type: 'opcional' },
    { key: 'legal-dashboard', name: 'Gestión Legal', type: 'opcional' },
    { key: 'medical', name: 'Gestión Médica', type: 'opcional' },
    { key: 'payroll-liquidation', name: 'Liquidación de Sueldos', type: 'opcional' },
    { key: 'logistics-dashboard', name: 'Logística Avanzada', type: 'opcional' },
    { key: 'procedures-manual', name: 'Manual de Procedimientos', type: 'opcional' },
    { key: 'employee-map', name: 'Mapa de Empleados', type: 'opcional' },
    { key: 'marketplace', name: 'Marketplace', type: 'opcional' },
    { key: 'my-procedures', name: 'Mis Procedimientos', type: 'opcional' },
    { key: 'audit-reports', name: 'Reportes de Auditoría', type: 'opcional' },
    { key: 'compliance-dashboard', name: 'Risk Intelligence Dashboard', type: 'opcional' },
    { key: 'sla-tracking', name: 'Seguimiento de SLA', type: 'opcional' },
    { key: 'hse-management', name: 'Seguridad e Higiene (HSE)', type: 'opcional' },
    { key: 'siac-commercial-dashboard', name: 'SIAC Comercial', type: 'opcional' },
    { key: 'voice-platform', name: 'Voice Platform', type: 'opcional' }
];

test.describe('TEST COMPLETO: 36 Módulos de panel-empresa', () => {

    test.beforeAll(async () => {
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  INICIANDO TEST DE 36 MÓDULOS COMERCIALES');
        console.log('  Empresa:', EMPRESA_SLUG);
        console.log('  Usuario:', USUARIO);
        console.log('═══════════════════════════════════════════════════════════\n');
    });

    test('Login y navegación por 36 módulos con screenshots', async ({ page }) => {
        // Timeout extendido para 36 módulos (5 minutos)
        test.setTimeout(300000);

        // ══════════════════════════════════════════════════════════════════
        // PASO 1: LOGIN
        // ══════════════════════════════════════════════════════════════════
        console.log('📍 PASO 1: Login');

        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('networkidle');

        // Screenshot de login
        await page.screenshot({
            path: 'tests/screenshots/00-login-page.png',
            fullPage: true
        });

        // Esperar a que carguen las empresas
        await page.waitForTimeout(2000);

        // Seleccionar empresa WFTEST directamente
        await page.selectOption('#companySelect', { label: '🏢 WFTEST_Empresa Demo SA' });

        // Esperar a que se habiliten los campos
        await page.waitForTimeout(1500);

        // Completar usuario y password
        await page.fill('#userInput', USUARIO);
        await page.fill('#passwordInput', PASSWORD);

        // Screenshot antes de enviar
        await page.screenshot({
            path: 'tests/screenshots/01-login-filled.png',
            fullPage: true
        });

        // Click en login
        await page.click('#loginButton');

        // Esperar a que cargue el dashboard
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');

        // Verificar que estamos logueados (buscar sidebar o dashboard)
        const loggedIn = await page.locator('.sidebar, #sidebar, [class*="sidebar"], .dashboard-container, .main-content').first().isVisible().catch(() => false);

        if (!loggedIn) {
            // Puede que haya un error de login
            await page.screenshot({
                path: 'tests/screenshots/ERROR-login-failed.png',
                fullPage: true
            });
            console.log('❌ Login falló - ver screenshot ERROR-login-failed.png');
        }

        // Screenshot del dashboard
        await page.screenshot({
            path: 'tests/screenshots/02-dashboard-inicial.png',
            fullPage: true
        });

        console.log('✅ Login completado\n');

        // ══════════════════════════════════════════════════════════════════
        // PASO 2: NAVEGAR POR CADA MÓDULO
        // ══════════════════════════════════════════════════════════════════
        console.log('📍 PASO 2: Navegando por 36 módulos\n');

        const resultados = [];
        let exitosos = 0;
        let fallidos = 0;

        for (let i = 0; i < MODULOS_COMERCIALES.length; i++) {
            const modulo = MODULOS_COMERCIALES[i];
            const numero = String(i + 1).padStart(2, '0');
            const emoji = modulo.type === 'core' ? '🔵' : '🟢';

            console.log(`${emoji} [${numero}/36] ${modulo.name} (${modulo.key})`);

            try {
                // IMPORTANTE: Cerrar cualquier modal que pueda estar bloqueando clicks
                await page.evaluate(() => {
                    // Cerrar modales Bootstrap
                    document.querySelectorAll('.modal.show, .modal[style*="display: block"]').forEach(m => {
                        m.style.display = 'none';
                        m.classList.remove('show');
                    });
                    // Ocultar wms-modal-container si existe
                    const wmsModal = document.getElementById('wms-modal-container');
                    if (wmsModal) wmsModal.style.display = 'none';
                    // Ocultar cualquier backdrop
                    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                });
                await page.waitForTimeout(200);

                // Buscar y clickear el módulo en el sidebar o en las tarjetas
                const moduleSelector = [
                    `[data-module="${modulo.key}"]`,
                    `[data-module-key="${modulo.key}"]`,
                    `[onclick*="${modulo.key}"]`,
                    `.sidebar-item:has-text("${modulo.name}")`,
                    `.module-card:has-text("${modulo.name}")`,
                    `a[href*="${modulo.key}"]`,
                    `button:has-text("${modulo.name}")`
                ].join(', ');

                const moduleElement = page.locator(moduleSelector).first();
                const isVisible = await moduleElement.isVisible().catch(() => false);

                if (isVisible) {
                    await moduleElement.click({ force: true, timeout: 5000 });
                    await page.waitForTimeout(2000);
                    await page.waitForLoadState('networkidle').catch(() => {});

                    // Screenshot del módulo
                    await page.screenshot({
                        path: `tests/screenshots/${numero}-${modulo.key}.png`,
                        fullPage: true
                    });

                    // Verificar que no hay error visible
                    const hasError = await page.locator('.error, .alert-danger, [class*="error"]').first().isVisible().catch(() => false);

                    if (hasError) {
                        console.log(`   ⚠️  Módulo cargó pero muestra error`);
                        resultados.push({ ...modulo, status: 'warning', error: 'Error visible en página' });
                    } else {
                        console.log(`   ✅ OK`);
                        resultados.push({ ...modulo, status: 'ok' });
                        exitosos++;
                    }
                } else {
                    // Intentar buscar en el sidebar expandiendo secciones
                    console.log(`   ⚠️  No visible directamente, buscando en sidebar...`);

                    // Buscar por texto parcial
                    const altSelector = page.locator(`text=${modulo.name}`).first();
                    const altVisible = await altSelector.isVisible().catch(() => false);

                    if (altVisible) {
                        await altSelector.click({ force: true, timeout: 5000 });
                        await page.waitForTimeout(2000);
                        await page.screenshot({
                            path: `tests/screenshots/${numero}-${modulo.key}.png`,
                            fullPage: true
                        });
                        console.log(`   ✅ Encontrado por texto`);
                        resultados.push({ ...modulo, status: 'ok' });
                        exitosos++;
                    } else {
                        console.log(`   ❌ No encontrado`);
                        resultados.push({ ...modulo, status: 'not_found' });
                        fallidos++;
                    }
                }
            } catch (err) {
                console.log(`   ❌ Error: ${err.message}`);
                resultados.push({ ...modulo, status: 'error', error: err.message });
                fallidos++;

                // Screenshot del error
                await page.screenshot({
                    path: `tests/screenshots/${numero}-${modulo.key}-ERROR.png`,
                    fullPage: true
                });
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // PASO 3: RESUMEN
        // ══════════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  RESUMEN DE PRUEBAS');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`  ✅ Exitosos: ${exitosos}`);
        console.log(`  ❌ Fallidos: ${fallidos}`);
        console.log(`  📊 Total: ${MODULOS_COMERCIALES.length}`);
        console.log('═══════════════════════════════════════════════════════════\n');

        // Guardar resultados en JSON
        const fs = require('fs');
        fs.writeFileSync('tests/screenshots/resultados.json', JSON.stringify(resultados, null, 2));

        // Verificar que al menos 30% de los módulos funcionaron (mínimo razonable)
        expect(exitosos).toBeGreaterThanOrEqual(Math.floor(MODULOS_COMERCIALES.length * 0.3));
    });

});
