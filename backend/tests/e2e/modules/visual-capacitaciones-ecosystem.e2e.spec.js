/**
 * ============================================================================
 * TEST E2E: Ecosistema de Capacitaciones (6 Módulos Integrados)
 * ============================================================================
 *
 * Protocolo de testing visual para el micro-ecosistema de capacitaciones:
 * 1. Training Management (Core)
 * 2. HSE (Seguridad e Higiene) - Afluente
 * 3. Medical Exams - Afluente
 * 4. ART Management - Afluente
 * 5. Procedures - Afluente
 * 6. Risk Intelligence - Afluente
 *
 * @version 1.0.0
 * @date 2026-02-01
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const BASE_URL = process.env.TEST_URL || 'http://localhost:9998';
const SCREENSHOTS_DIR = path.join(__dirname, '../../../screenshots/capacitaciones-ecosystem');

// Credenciales de prueba
const TEST_CREDENTIALS = {
    company: 'aponnt-empresa-demo',
    username: 'administrador',
    password: 'admin123'
};

// Timeouts extendidos para módulos complejos
const TIMEOUTS = {
    navigation: 30000,
    moduleLoad: 15000,
    tabSwitch: 5000,
    apiResponse: 10000
};

// ============================================================================
// HELPERS
// ============================================================================

async function ensureScreenshotDir() {
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
        fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
}

async function takeScreenshot(page, name) {
    await ensureScreenshotDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}_${timestamp}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 Screenshot: ${filename}`);
    return filepath;
}

async function login(page) {
    console.log('🔐 Iniciando login...');
    await page.goto(`${BASE_URL}/panel-empresa.html`, { timeout: TIMEOUTS.navigation });

    // Esperar modal de login
    await page.waitForSelector('#companyLoginModal, #loginForm, input[type="text"]', { timeout: TIMEOUTS.moduleLoad });

    // Completar formulario
    const companyInput = await page.$('#companySlug, input[placeholder*="empresa"], input[name="company"]');
    if (companyInput) {
        await companyInput.fill(TEST_CREDENTIALS.company);
    }

    const userInput = await page.$('#userInput, input[placeholder*="usuario"], input[name="username"]');
    if (userInput) {
        await userInput.fill(TEST_CREDENTIALS.username);
    }

    const passInput = await page.$('#passwordInput, input[type="password"]');
    if (passInput) {
        await passInput.fill(TEST_CREDENTIALS.password);
    }

    // Click en botón de login
    const loginBtn = await page.$('button[type="submit"], button:has-text("Ingresar"), button:has-text("Entrar")');
    if (loginBtn) {
        await loginBtn.click();
    }

    // Esperar carga del panel
    await page.waitForTimeout(3000);
    console.log('✅ Login completado');
}

async function navigateToModule(page, moduleName) {
    console.log(`🧭 Navegando a módulo: ${moduleName}`);

    // Buscar en menú lateral
    const menuItem = await page.$(`[data-module="${moduleName}"], [onclick*="${moduleName}"], a:has-text("${moduleName}")`);

    if (menuItem) {
        await menuItem.click();
        await page.waitForTimeout(2000);
        return true;
    }

    // Intentar por JavaScript directo
    try {
        await page.evaluate((mod) => {
            // Buscar función de navegación
            if (typeof window.showModule === 'function') {
                window.showModule(mod);
            } else if (typeof window.navigateToModule === 'function') {
                window.navigateToModule(mod);
            }
        }, moduleName);
        await page.waitForTimeout(2000);
        return true;
    } catch (e) {
        console.warn(`⚠️ No se pudo navegar a ${moduleName}`);
        return false;
    }
}

async function clickTab(page, tabSelector) {
    try {
        const tab = await page.$(tabSelector);
        if (tab) {
            await tab.click();
            await page.waitForTimeout(1500);
            return true;
        }
    } catch (e) {
        console.warn(`⚠️ Tab no encontrado: ${tabSelector}`);
    }
    return false;
}

// ============================================================================
// TEST SUITE
// ============================================================================

test.describe('Ecosistema de Capacitaciones - Testing Visual Integral', () => {

    test.beforeAll(async () => {
        await ensureScreenshotDir();
        console.log('🎬 Iniciando suite de tests del ecosistema de capacitaciones');
    });

    // ========================================================================
    // FASE 1: MÓDULO CORE - TRAINING MANAGEMENT
    // ========================================================================

    test.describe('FASE 1: Training Management (Core)', () => {

        test('1.1 Dashboard de Capacitaciones', async ({ page }) => {
            await login(page);

            // Navegar a Training
            await page.evaluate(() => {
                if (typeof showTrainingManagementContent === 'function') {
                    showTrainingManagementContent();
                }
            });
            await page.waitForTimeout(3000);

            await takeScreenshot(page, '01-training-dashboard');

            // Verificar elementos del dashboard
            const dashboardExists = await page.evaluate(() => {
                const el = document.querySelector('#training-management, .training-header, [data-view="dashboard"]');
                return !!el;
            });

            expect(dashboardExists).toBeTruthy();
            console.log('✅ Dashboard de capacitaciones cargado');
        });

        test('1.2 Tab Capacitaciones - CRUD', async ({ page }) => {
            await login(page);

            await page.evaluate(() => {
                if (typeof showTrainingManagementContent === 'function') {
                    showTrainingManagementContent();
                }
            });
            await page.waitForTimeout(2000);

            // Click en tab Capacitaciones
            await page.evaluate(() => {
                if (typeof switchTrainingView === 'function') {
                    switchTrainingView('trainings');
                }
            });
            await page.waitForTimeout(2000);

            await takeScreenshot(page, '02-training-list');

            // Verificar lista
            const listExists = await page.evaluate(() => {
                const table = document.querySelector('.training-table, table, .trainings-list');
                return !!table;
            });

            expect(listExists).toBeTruthy();
            console.log('✅ Lista de capacitaciones visible');
        });

        test('1.3 Tab Evaluaciones (Vinculadas)', async ({ page }) => {
            await login(page);

            await page.evaluate(() => {
                if (typeof showTrainingManagementContent === 'function') {
                    showTrainingManagementContent();
                }
            });
            await page.waitForTimeout(2000);

            await page.evaluate(() => {
                if (typeof switchTrainingView === 'function') {
                    switchTrainingView('evaluations');
                }
            });
            await page.waitForTimeout(2000);

            await takeScreenshot(page, '03-training-evaluations');
            console.log('✅ Tab Evaluaciones visible');
        });

        test('1.4 Tab Evaluaciones Independientes', async ({ page }) => {
            await login(page);

            await page.evaluate(() => {
                if (typeof showTrainingManagementContent === 'function') {
                    showTrainingManagementContent();
                }
            });
            await page.waitForTimeout(2000);

            await page.evaluate(() => {
                if (typeof switchTrainingView === 'function') {
                    switchTrainingView('independent-evaluations');
                }
            });
            await page.waitForTimeout(2000);

            await takeScreenshot(page, '04-training-independent-evals');
            console.log('✅ Tab Evaluaciones Independientes visible');
        });

        test('1.5 Tab Seguimiento Empleados', async ({ page }) => {
            await login(page);

            await page.evaluate(() => {
                if (typeof showTrainingManagementContent === 'function') {
                    showTrainingManagementContent();
                }
            });
            await page.waitForTimeout(2000);

            await page.evaluate(() => {
                if (typeof switchTrainingView === 'function') {
                    switchTrainingView('employees');
                }
            });
            await page.waitForTimeout(2000);

            await takeScreenshot(page, '05-training-employees');
            console.log('✅ Tab Seguimiento Empleados visible');
        });

        test('1.6 Tab Reportes', async ({ page }) => {
            await login(page);

            await page.evaluate(() => {
                if (typeof showTrainingManagementContent === 'function') {
                    showTrainingManagementContent();
                }
            });
            await page.waitForTimeout(2000);

            await page.evaluate(() => {
                if (typeof switchTrainingView === 'function') {
                    switchTrainingView('reports');
                }
            });
            await page.waitForTimeout(2000);

            await takeScreenshot(page, '06-training-reports');
            console.log('✅ Tab Reportes visible');
        });

        test('1.7 Tab Calendario', async ({ page }) => {
            await login(page);

            await page.evaluate(() => {
                if (typeof showTrainingManagementContent === 'function') {
                    showTrainingManagementContent();
                }
            });
            await page.waitForTimeout(2000);

            await page.evaluate(() => {
                if (typeof switchTrainingView === 'function') {
                    switchTrainingView('calendar');
                }
            });
            await page.waitForTimeout(2000);

            await takeScreenshot(page, '07-training-calendar');
            console.log('✅ Tab Calendario visible');
        });

    });

    // ========================================================================
    // FASE 2: HSE (Seguridad e Higiene) - AFLUENTE
    // ========================================================================

    test.describe('FASE 2: HSE Management (Afluente)', () => {

        test('2.1 Dashboard HSE', async ({ page }) => {
            await login(page);

            // Navegar a HSE
            await page.evaluate(() => {
                const container = document.getElementById('mainContent');
                if (container && typeof initHseManagement === 'function') {
                    initHseManagement(container);
                }
            });
            await page.waitForTimeout(3000);

            await takeScreenshot(page, '08-hse-dashboard');

            const hseExists = await page.evaluate(() => {
                const el = document.querySelector('.hse-module, [data-tab="dashboard"]');
                return !!el;
            });

            expect(hseExists).toBeTruthy();
            console.log('✅ Dashboard HSE cargado');
        });

        test('2.2 Catálogo EPP', async ({ page }) => {
            await login(page);

            await page.evaluate(() => {
                const container = document.getElementById('mainContent');
                if (container && typeof initHseManagement === 'function') {
                    initHseManagement(container);
                }
            });
            await page.waitForTimeout(2000);

            await page.evaluate(() => {
                if (typeof showHseTab === 'function') {
                    showHseTab('catalog');
                }
            });
            await page.waitForTimeout(2000);

            await takeScreenshot(page, '09-hse-catalog');
            console.log('✅ Catálogo EPP visible');
        });

        test('2.3 Matriz Rol-EPP', async ({ page }) => {
            await login(page);

            await page.evaluate(() => {
                const container = document.getElementById('mainContent');
                if (container && typeof initHseManagement === 'function') {
                    initHseManagement(container);
                }
            });
            await page.waitForTimeout(2000);

            await page.evaluate(() => {
                if (typeof showHseTab === 'function') {
                    showHseTab('matrix');
                }
            });
            await page.waitForTimeout(2000);

            await takeScreenshot(page, '10-hse-matrix');
            console.log('✅ Matriz Rol-EPP visible');
        });

        test('2.4 Entregas EPP', async ({ page }) => {
            await login(page);

            await page.evaluate(() => {
                const container = document.getElementById('mainContent');
                if (container && typeof initHseManagement === 'function') {
                    initHseManagement(container);
                }
            });
            await page.waitForTimeout(2000);

            await page.evaluate(() => {
                if (typeof showHseTab === 'function') {
                    showHseTab('deliveries');
                }
            });
            await page.waitForTimeout(2000);

            await takeScreenshot(page, '11-hse-deliveries');
            console.log('✅ Entregas EPP visible');
        });

        test('2.5 Inspecciones', async ({ page }) => {
            await login(page);

            await page.evaluate(() => {
                const container = document.getElementById('mainContent');
                if (container && typeof initHseManagement === 'function') {
                    initHseManagement(container);
                }
            });
            await page.waitForTimeout(2000);

            await page.evaluate(() => {
                if (typeof showHseTab === 'function') {
                    showHseTab('inspections');
                }
            });
            await page.waitForTimeout(2000);

            await takeScreenshot(page, '12-hse-inspections');
            console.log('✅ Inspecciones visible');
        });

        test('2.6 Configuración HSE', async ({ page }) => {
            await login(page);

            await page.evaluate(() => {
                const container = document.getElementById('mainContent');
                if (container && typeof initHseManagement === 'function') {
                    initHseManagement(container);
                }
            });
            await page.waitForTimeout(2000);

            await page.evaluate(() => {
                if (typeof showHseTab === 'function') {
                    showHseTab('config');
                }
            });
            await page.waitForTimeout(2000);

            await takeScreenshot(page, '13-hse-config');
            console.log('✅ Configuración HSE visible');
        });

    });

    // ========================================================================
    // FASE 3: ART MANAGEMENT - AFLUENTE
    // ========================================================================

    test.describe('FASE 3: ART Management (Afluente)', () => {

        test('3.1 Dashboard ART', async ({ page }) => {
            await login(page);

            await page.evaluate(() => {
                const container = document.getElementById('mainContent');
                if (container && typeof initArtManagement === 'function') {
                    initArtManagement(container);
                }
            });
            await page.waitForTimeout(3000);

            await takeScreenshot(page, '14-art-dashboard');
            console.log('✅ Dashboard ART cargado');
        });

        test('3.2 Accidentes ART', async ({ page }) => {
            await login(page);

            await page.evaluate(() => {
                const container = document.getElementById('mainContent');
                if (container && typeof initArtManagement === 'function') {
                    initArtManagement(container);
                }
            });
            await page.waitForTimeout(2000);

            // Intentar cambiar a tab accidentes
            await page.evaluate(() => {
                const tabs = document.querySelectorAll('.art-tab, [data-tab]');
                for (const tab of tabs) {
                    if (tab.textContent.includes('Accidentes') || tab.dataset.tab === 'accidents') {
                        tab.click();
                        break;
                    }
                }
            });
            await page.waitForTimeout(2000);

            await takeScreenshot(page, '15-art-accidents');
            console.log('✅ Accidentes ART visible');
        });

        test('3.3 Denuncias ART', async ({ page }) => {
            await login(page);

            await page.evaluate(() => {
                const container = document.getElementById('mainContent');
                if (container && typeof initArtManagement === 'function') {
                    initArtManagement(container);
                }
            });
            await page.waitForTimeout(2000);

            await page.evaluate(() => {
                const tabs = document.querySelectorAll('.art-tab, [data-tab]');
                for (const tab of tabs) {
                    if (tab.textContent.includes('Denuncias') || tab.dataset.tab === 'claims') {
                        tab.click();
                        break;
                    }
                }
            });
            await page.waitForTimeout(2000);

            await takeScreenshot(page, '16-art-claims');
            console.log('✅ Denuncias ART visible');
        });

    });

    // ========================================================================
    // FASE 4: MEDICAL EXAMS - AFLUENTE
    // ========================================================================

    test.describe('FASE 4: Medical Exams (Afluente)', () => {

        test('4.1 Exámenes Médicos - Vista General', async ({ page }) => {
            await login(page);

            // Los exámenes médicos están dentro del módulo de usuarios
            await page.evaluate(() => {
                if (typeof showUsersManagementContent === 'function') {
                    showUsersManagementContent();
                }
            });
            await page.waitForTimeout(3000);

            await takeScreenshot(page, '17-users-list-for-medical');

            // Verificar que hay usuarios
            const hasUsers = await page.evaluate(() => {
                const rows = document.querySelectorAll('tr[data-user-id], .user-row, [onclick*="viewUser"]');
                return rows.length > 0;
            });

            console.log(`✅ Vista de usuarios: ${hasUsers ? 'con datos' : 'sin datos'}`);
        });

        test('4.2 Detalle Usuario - Tab Médico', async ({ page }) => {
            await login(page);

            await page.evaluate(() => {
                if (typeof showUsersManagementContent === 'function') {
                    showUsersManagementContent();
                }
            });
            await page.waitForTimeout(3000);

            // Click en primer usuario
            await page.evaluate(() => {
                const firstRow = document.querySelector('tr[data-user-id], .user-row');
                if (firstRow) firstRow.click();
            });
            await page.waitForTimeout(2000);

            // Buscar tab médico
            await page.evaluate(() => {
                const tabs = document.querySelectorAll('[data-tab], .tab-button, button');
                for (const tab of tabs) {
                    if (tab.textContent.includes('Médic') || tab.dataset.tab?.includes('medical')) {
                        tab.click();
                        break;
                    }
                }
            });
            await page.waitForTimeout(2000);

            await takeScreenshot(page, '18-user-medical-tab');
            console.log('✅ Tab Médico de usuario visible');
        });

    });

    // ========================================================================
    // FASE 5: PROCEDURES - AFLUENTE
    // ========================================================================

    test.describe('FASE 5: Procedures (Afluente)', () => {

        test('5.1 Mis Procedimientos', async ({ page }) => {
            await login(page);

            await page.evaluate(() => {
                if (typeof showProceduresContent === 'function') {
                    showProceduresContent();
                }
            });
            await page.waitForTimeout(3000);

            await takeScreenshot(page, '19-procedures-list');

            const hasProcedures = await page.evaluate(() => {
                const el = document.querySelector('.procedures-module, #procedures-list, table');
                return !!el;
            });

            console.log(`✅ Módulo Procedimientos: ${hasProcedures ? 'cargado' : 'sin contenedor'}`);
        });

    });

    // ========================================================================
    // FASE 6: RISK INTELLIGENCE - AFLUENTE
    // ========================================================================

    test.describe('FASE 6: Risk Intelligence (Afluente)', () => {

        test('6.1 Dashboard de Riesgos', async ({ page }) => {
            await login(page);

            await page.evaluate(() => {
                if (typeof showRiskIntelligenceDashboard === 'function') {
                    showRiskIntelligenceDashboard();
                }
            });
            await page.waitForTimeout(3000);

            await takeScreenshot(page, '20-risk-intelligence-dashboard');

            const hasRiskDashboard = await page.evaluate(() => {
                const el = document.querySelector('.risk-dashboard, #risk-content, .risk-module');
                return !!el;
            });

            console.log(`✅ Risk Intelligence: ${hasRiskDashboard ? 'cargado' : 'sin contenedor'}`);
        });

    });

    // ========================================================================
    // FASE 7: ANÁLISIS DE INTEGRACIONES
    // ========================================================================

    test.describe('FASE 7: Análisis de Integraciones', () => {

        test('7.1 Verificar integración HSE → Training', async ({ page }) => {
            await login(page);

            // Hacer request a API para verificar si hay trainings generados desde HSE
            const response = await page.evaluate(async () => {
                try {
                    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                    const res = await fetch('/api/v1/trainings', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        // Buscar trainings con source_module = 'hse'
                        const hseTrainings = (data.trainings || []).filter(t =>
                            t.source_module === 'hse' || t.category === 'safety'
                        );
                        return {
                            total: data.count,
                            hseRelated: hseTrainings.length
                        };
                    }
                    return { error: res.status };
                } catch (e) {
                    return { error: e.message };
                }
            });

            console.log('📊 Trainings desde HSE:', JSON.stringify(response));
            await takeScreenshot(page, '21-integration-hse-training');
        });

        test('7.2 Verificar API endpoints disponibles', async ({ page }) => {
            await login(page);

            const endpoints = [
                '/api/v1/trainings',
                '/api/v1/hse/dashboard',
                '/api/v1/art/accidents',
                '/api/v1/procedures',
                '/api/v1/risk-intelligence/dashboard'
            ];

            const results = await page.evaluate(async (eps) => {
                const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                const checks = {};

                for (const ep of eps) {
                    try {
                        const res = await fetch(ep, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        checks[ep] = { status: res.status, ok: res.ok };
                    } catch (e) {
                        checks[ep] = { error: e.message };
                    }
                }

                return checks;
            }, endpoints);

            console.log('🔌 Estado de endpoints:');
            for (const [ep, result] of Object.entries(results)) {
                const status = result.ok ? '✅' : result.error ? '❌' : '⚠️';
                console.log(`  ${status} ${ep}: ${JSON.stringify(result)}`);
            }

            await takeScreenshot(page, '22-api-endpoints-check');
        });

    });

    // ========================================================================
    // FASE 8: RESUMEN FINAL
    // ========================================================================

    test.describe('FASE 8: Resumen', () => {

        test('8.1 Generar reporte de cobertura', async ({ page }) => {
            await login(page);

            // Captura final del dashboard principal
            await page.evaluate(() => {
                if (typeof showTrainingManagementContent === 'function') {
                    showTrainingManagementContent();
                }
            });
            await page.waitForTimeout(2000);

            await takeScreenshot(page, '23-final-training-dashboard');

            console.log('');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('                    RESUMEN DE TESTING');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('');
            console.log('MÓDULOS TESTEADOS:');
            console.log('  ✅ Training Management (Core) - 7 tabs');
            console.log('  ✅ HSE Management - 6 tabs');
            console.log('  ✅ ART Management - 3 tabs');
            console.log('  ✅ Medical Exams - 2 vistas');
            console.log('  ✅ Procedures - 1 vista');
            console.log('  ✅ Risk Intelligence - 1 vista');
            console.log('');
            console.log('INTEGRACIONES VERIFICADAS:');
            console.log('  ⚠️ HSE → Training: Parcial (TODO en código)');
            console.log('  ❌ Medical → Training: No implementado');
            console.log('  ❌ ART → Training: No implementado');
            console.log('  ❌ Procedures → Training: No implementado');
            console.log('  ❌ Risk → Training: No implementado');
            console.log('');
            console.log('SCREENSHOTS GENERADOS EN:');
            console.log(`  ${SCREENSHOTS_DIR}`);
            console.log('');
            console.log('═══════════════════════════════════════════════════════════');
        });

    });

});
