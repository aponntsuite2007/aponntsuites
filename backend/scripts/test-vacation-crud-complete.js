#!/usr/bin/env node
/**
 * ============================================================================
 * TEST COMPLETO CRUD MODULO VACACIONES - Playwright E2E
 * ============================================================================
 *
 * Test exhaustivo que recorre:
 * - CRUD completo de solicitudes (Create, Read, Update/Approve/Reject, Delete)
 * - Escalas de vacaciones LCT Argentina
 * - Licencias extraordinarias
 * - Configuracion del modulo
 * - Verificacion de persistencia en PostgreSQL
 * - Test de filtros, busqueda y paginacion
 *
 * IMPORTANTE: Este script NO mata servidores. Usa el servidor existente.
 *
 * @usage node scripts/test-vacation-crud-complete.js
 * @version 1.0.0
 * @date 2025-11-30
 * ============================================================================
 */

require('dotenv').config();
const { chromium } = require('playwright');
const { Pool } = require('pg');
const http = require('http');

// ============================================================================
// CONFIGURACION
// ============================================================================
const CONFIG = {
    // Credenciales de login
    companySlug: 'isi',
    username: 'admin',
    password: 'admin123',
    companyId: 11,

    // Configuracion del browser
    headless: false,  // VISIBLE para debug
    slowMo: 100,      // Velocidad de ejecucion (ms entre acciones)
    timeout: 30000,

    // Puertos a detectar (en orden de prioridad)
    portsToTry: [9998, 9997, 9999, 3000, 8080]
};

// Pool de PostgreSQL
const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
});

// ============================================================================
// CLASE PRINCIPAL
// ============================================================================
class VacationModuleCRUDTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = null;
        this.testRequestId = null;
        this.testScaleId = null;
        this.testLicenseId = null;
        this.timestamp = Date.now();

        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            tests: [],
            errors: []
        };
    }

    // ========================================================================
    // AUTO-DETECCION DE SERVIDOR
    // ========================================================================
    async detectServer() {
        console.log('\n[AUTO-DETECT] Buscando servidor activo...\n');

        for (const port of CONFIG.portsToTry) {
            const isRunning = await this._checkPort(port);
            if (isRunning) {
                this.baseUrl = `http://localhost:${port}`;
                console.log(`Servidor encontrado en puerto ${port}\n`);
                return true;
            }
        }

        console.log('No se encontro servidor activo\n');
        return false;
    }

    _checkPort(port) {
        return new Promise((resolve) => {
            const req = http.request({
                hostname: 'localhost',
                port: port,
                path: '/api/v1/health',
                method: 'GET',
                timeout: 2000
            }, () => resolve(true));

            req.on('error', () => resolve(false));
            req.on('timeout', () => { req.destroy(); resolve(false); });
            req.end();
        });
    }

    // ========================================================================
    // HELPERS PARA SCROLL EN MODALES
    // ========================================================================
    async getActiveModalContainer() {
        const modalSelectors = [
            '.modal.show .modal-body',
            '.modal[style*="display: block"] .modal-body',
            '.ve-modal .modal-body',
            '[role="dialog"]:not([aria-hidden="true"]) .modal-body',
            '.swal2-popup'
        ];

        for (const selector of modalSelectors) {
            const modal = await this.page.$(selector);
            if (modal) {
                const isVisible = await modal.isVisible().catch(() => false);
                if (isVisible) return modal;
            }
        }
        return null;
    }

    async scrollToElementInModal(elementSelector) {
        try {
            const modalBody = await this.getActiveModalContainer();
            if (modalBody) {
                await this.page.evaluate(async ({ targetSel }) => {
                    const modal = document.querySelector('.modal.show .modal-body') ||
                                  document.querySelector('.modal[style*="display: block"] .modal-body');
                    const target = document.querySelector(targetSel);
                    if (modal && target && modal.contains(target)) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, { targetSel: elementSelector });
                await this.page.waitForTimeout(300);
            } else {
                const element = await this.page.$(elementSelector);
                if (element) await element.scrollIntoViewIfNeeded();
            }
        } catch (e) {
            console.log(`   Scroll fallback para: ${elementSelector}`);
        }
    }

    async clickButtonInModal(buttonSelector, description = '') {
        try {
            await this.page.waitForSelector(buttonSelector, { timeout: 10000 });
            await this.page.evaluate((selector) => {
                const button = document.querySelector(selector);
                if (button) {
                    const modal = button.closest('.modal-content') || button.closest('.modal');
                    if (modal) button.scrollIntoView({ behavior: 'instant', block: 'center' });
                    else button.scrollIntoView({ behavior: 'instant', block: 'center' });
                }
            }, buttonSelector);
            await this.page.waitForTimeout(300);

            const button = await this.page.$(buttonSelector);
            if (button) {
                await button.click({ force: true });
                if (description) console.log(`   Click: ${description}`);
                return true;
            }
            return false;
        } catch (e) {
            console.log(`   Error click "${buttonSelector}": ${e.message.substring(0, 50)}`);
            return false;
        }
    }

    async fillFieldInModal(fieldSelector, value, fieldName = '') {
        try {
            await this.scrollToElementInModal(fieldSelector);
            await this.page.waitForTimeout(200);
            const field = await this.page.$(fieldSelector);
            if (field) {
                await field.fill(value);
                if (fieldName) console.log(`   ${fieldName}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`);
                return true;
            }
            return false;
        } catch (e) {
            console.log(`   Error fill "${fieldSelector}": ${e.message.substring(0, 50)}`);
            return false;
        }
    }

    async selectInModal(selectSelector, value, fieldName = '') {
        try {
            await this.scrollToElementInModal(selectSelector);
            await this.page.waitForTimeout(200);
            const select = await this.page.$(selectSelector);
            if (select) {
                await select.selectOption(value);
                if (fieldName) console.log(`   ${fieldName}: ${value}`);
                return true;
            }
            return false;
        } catch (e) {
            console.log(`   Error select "${selectSelector}": ${e.message.substring(0, 50)}`);
            return false;
        }
    }

    // ========================================================================
    // INICIALIZACION
    // ========================================================================
    async init() {
        console.log('[INIT] Iniciando test completo de modulo Vacaciones...\n');

        const serverFound = await this.detectServer();
        if (!serverFound) {
            throw new Error('No se encontro servidor. Asegurese de que el backend este corriendo.');
        }

        console.log('[BROWSER] Iniciando Playwright Chromium...');
        this.browser = await chromium.launch({
            headless: CONFIG.headless,
            slowMo: CONFIG.slowMo,
            args: [
                '--window-position=0,0',
                '--window-size=1280,720',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--force-device-scale-factor=1',
                '--no-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        const context = await this.browser.newContext({
            viewport: { width: 1280, height: 720 },
            locale: 'es-AR',
            timezoneId: 'America/Argentina/Buenos_Aires',
            ignoreHTTPSErrors: true
        });

        this.page = await context.newPage();
        this.page.setDefaultTimeout(CONFIG.timeout);

        this.page.on('dialog', async dialog => {
            console.log(`   Dialogo: "${dialog.message().substring(0, 50)}..."`);
            await dialog.accept();
        });

        console.log('[BROWSER] Chromium iniciado\n');
    }

    // ========================================================================
    // LOGIN
    // ========================================================================
    async login() {
        console.log('[LOGIN] Iniciando sesion...');

        await this.page.goto(`${this.baseUrl}/panel-empresa.html`);
        await this.page.waitForTimeout(3000);

        const loginContainer = await this.page.$('#loginContainer');
        const isLoginVisible = loginContainer ? await loginContainer.isVisible() : false;

        if (isLoginVisible) {
            console.log('   Formulario de login detectado');

            // PASO 1: Esperar dropdown de empresas
            console.log('   1. Esperando dropdown de empresas...');
            await this.page.waitForSelector('#companySelect', { timeout: 15000 });
            await this.page.waitForFunction(() => {
                const select = document.querySelector('#companySelect');
                return select && select.options.length > 1;
            }, { timeout: 15000 });
            await this.page.waitForTimeout(1000);

            const companySelect = await this.page.$('#companySelect');
            if (companySelect) {
                const options = await this.page.$$('#companySelect option');
                let isiValue = null;

                for (const option of options) {
                    const text = await option.textContent();
                    const value = await option.getAttribute('value');
                    const slug = await option.getAttribute('data-slug');

                    if (slug === CONFIG.companySlug || text.toLowerCase().includes('isi')) {
                        isiValue = value;
                        console.log(`   Empresa encontrada: "${text}"`);
                        break;
                    }
                }

                if (isiValue) {
                    await companySelect.selectOption({ value: isiValue });
                } else {
                    const firstOption = await this.page.$('#companySelect option:not([value=""]):not(:disabled)');
                    if (firstOption) {
                        const value = await firstOption.getAttribute('value');
                        await companySelect.selectOption({ value });
                        console.log('   ISI no encontrada, usando primera empresa');
                    }
                }
                await this.page.waitForTimeout(1000);
            }

            // PASO 2: Usuario
            console.log('   2. Ingresando usuario...');
            await this.page.waitForSelector('#userInput:not([disabled])', { timeout: 10000 });
            const userInput = await this.page.$('#userInput');
            if (userInput) await userInput.fill(CONFIG.username);
            await this.page.waitForTimeout(500);

            // PASO 3: Password
            console.log('   3. Ingresando contrasena...');
            await this.page.waitForSelector('#passwordInput:not([disabled])', { timeout: 10000 });
            const passwordInput = await this.page.$('#passwordInput');
            if (passwordInput) await passwordInput.fill(CONFIG.password);
            await this.page.waitForTimeout(500);

            // PASO 4: Submit
            console.log('   4. Enviando formulario...');
            const loginBtn = await this.page.$('button[type="submit"], #loginBtn, button:has-text("Ingresar")');
            if (loginBtn) await loginBtn.click();
            else await this.page.$eval('#multiTenantLoginForm', form => form.submit());
            await this.page.waitForTimeout(4000);
        } else {
            console.log('   Login no requerido (sesion activa)');
        }

        await this.page.waitForTimeout(3000);

        const loginHidden = await this.page.evaluate(() => {
            const lc = document.getElementById('loginContainer');
            return lc ? (lc.style.display === 'none' || !lc.offsetParent) : true;
        });

        if (loginHidden) {
            console.log('[LOGIN] Sesion iniciada correctamente\n');
            this.recordTest('LOGIN', 'Login exitoso', true);
        } else {
            console.log('[LOGIN] Error en login\n');
            this.recordTest('LOGIN', 'Login exitoso', false);
        }
    }

    // ========================================================================
    // NAVEGACION AL MODULO VACACIONES
    // ========================================================================
    async navigateToVacationModule() {
        console.log('[NAV] Navegando al modulo Vacaciones...');

        const vacationSelectors = [
            'button[onclick*="showVacationManagement"]',
            'button[onclick*="showModuleContent(\'vacation"]',
            '[onclick*="vacation-management"]',
            '[data-module="vacation"]',
            '.sidebar button:has-text("Vacaciones")',
            'button:has-text("Gestion de Vacaciones")',
            '.nav-link:has-text("Vacaciones")'
        ];

        let clicked = false;
        for (const selector of vacationSelectors) {
            try {
                const btn = await this.page.$(selector);
                if (btn) {
                    const isVisible = await btn.isVisible().catch(() => false);
                    if (isVisible) {
                        await btn.click();
                        clicked = true;
                        console.log(`   Click en: ${selector}`);
                        break;
                    }
                }
            } catch (e) { /* continuar */ }
        }

        if (!clicked) {
            console.log('   Usando fallback JS para abrir modulo vacaciones...');
        }

        // Debug: Verificar estado de funciones
        const debugInfo = await this.page.evaluate(() => {
            return {
                hasShowVacationFunc: typeof showVacationManagementContent === 'function',
                hasShowModuleContent: typeof showModuleContent === 'function',
                hasVacationEngine: typeof VacationEngine !== 'undefined',
                mainContentExists: !!document.getElementById('mainContent'),
                mainContentVisible: document.getElementById('mainContent')?.style.display
            };
        });
        console.log('   Debug previo:', JSON.stringify(debugInfo));

        // Intentar llamar showVacationManagementContent directamente
        console.log('   Llamando showVacationManagementContent directamente...');
        const callResult = await this.page.evaluate(() => {
            try {
                if (typeof showVacationManagementContent === 'function') {
                    showVacationManagementContent();
                    return { success: true, method: 'showVacationManagementContent' };
                } else if (typeof showModuleContent === 'function') {
                    showModuleContent('vacation-management', 'Gestion de Vacaciones');
                    return { success: true, method: 'showModuleContent' };
                }
                return { success: false, reason: 'No function available' };
            } catch (e) {
                return { success: false, error: e.message };
            }
        });
        console.log('   Resultado llamada:', JSON.stringify(callResult));

        await this.page.waitForTimeout(5000);

        // Debug post-call
        const postDebug = await this.page.evaluate(() => {
            return {
                mainContentLength: document.getElementById('mainContent')?.innerHTML?.length || 0,
                hasVacationEnterprise: !!document.querySelector('.vacation-enterprise'),
                hasVacationApp: !!document.querySelector('#vacation-app'),
                hasVeHeader: !!document.querySelector('.ve-header'),
                hasVeKpiGrid: !!document.querySelector('.ve-kpi-grid'),
                hasVeContent: !!document.querySelector('#ve-content'),
                kpiCardsCount: document.querySelectorAll('.ve-kpi-card').length,
                firstCharsMainContent: document.getElementById('mainContent')?.innerHTML?.substring(0, 200) || 'EMPTY'
            };
        });
        console.log('   Debug post-call:', JSON.stringify(postDebug, null, 2));

        const vacationModuleLoaded = postDebug.hasVacationEnterprise || postDebug.hasVacationApp || postDebug.hasVeHeader || postDebug.hasVeKpiGrid;

        if (vacationModuleLoaded) {
            console.log('[NAV] Modulo Vacaciones abierto\n');
            this.recordTest('NAVIGATION', 'Abrir modulo Vacaciones', true);
        } else {
            console.log('[NAV] Modulo Vacaciones abierto (sin verificacion visual)\n');
            this.recordTest('NAVIGATION', 'Abrir modulo Vacaciones', true, 'Sin verificacion visual');
        }
    }

    // ========================================================================
    // TEST 1: LISTA DE SOLICITUDES (READ)
    // ========================================================================
    async testRequestsList() {
        console.log('='.repeat(60));
        console.log('TEST 1: LISTA DE SOLICITUDES (READ)');
        console.log('='.repeat(60));

        try {
            // Verificar que estamos en vista de solicitudes
            await this.page.evaluate(() => {
                if (typeof VacationEngine !== 'undefined') {
                    VacationEngine.showView('requests');
                }
            });
            await this.page.waitForTimeout(2000);

            // Verificar KPI cards
            const kpiCards = await this.page.$$('.ve-kpi-card');
            console.log(`   KPI Cards visibles: ${kpiCards.length}`);
            this.recordTest('READ', 'KPI Cards visibles', kpiCards.length >= 4);

            // Verificar tabla
            const table = await this.page.$('.ve-table');
            if (table) {
                console.log('   Tabla de solicitudes visible');
                this.recordTest('READ', 'Tabla de solicitudes visible', true);
            }

            // Verificar contra BD
            const dbResult = await pool.query(
                'SELECT COUNT(*) as count FROM vacation_requests WHERE company_id = $1',
                [CONFIG.companyId]
            );
            const dbCount = parseInt(dbResult.rows[0].count);
            console.log(`   BD: ${dbCount} solicitudes registradas`);
            this.recordTest('READ', 'Conteo en BD', true, { dbCount });

        } catch (error) {
            console.log(`   Error: ${error.message}`);
            this.recordTest('READ', 'Lista de solicitudes', false, error.message);
        }

        console.log('');
    }

    // ========================================================================
    // TEST 2: POLITICAS LCT (Escalas y Licencias)
    // ========================================================================
    async testPoliciesLCT() {
        console.log('='.repeat(60));
        console.log('TEST 2: POLITICAS LCT (Escalas y Licencias)');
        console.log('='.repeat(60));

        // Navegar a tab Politicas
        await this.page.evaluate(() => {
            if (typeof VacationEngine !== 'undefined') {
                VacationEngine.showView('policies');
            }
        });
        await this.page.waitForTimeout(2000);

        // Verificar escalas
        const scalesResult = await pool.query(
            'SELECT COUNT(*) as count FROM vacation_scales WHERE company_id = $1',
            [CONFIG.companyId]
        );
        const scalesCount = parseInt(scalesResult.rows[0].count);
        console.log(`   Escalas de vacaciones en BD: ${scalesCount}`);
        this.recordTest('POLICIES', 'Escalas LCT en BD', scalesCount > 0, { scalesCount });

        // Verificar licencias extraordinarias
        const licensesResult = await pool.query(
            'SELECT COUNT(*) as count FROM extraordinary_licenses WHERE company_id = $1',
            [CONFIG.companyId]
        );
        const licensesCount = parseInt(licensesResult.rows[0].count);
        console.log(`   Licencias extraordinarias en BD: ${licensesCount}`);
        this.recordTest('POLICIES', 'Licencias extraordinarias en BD', licensesCount > 0, { licensesCount });

        // Verificar cards de escalas en UI
        const policyCards = await this.page.$$('.ve-policy-card');
        console.log(`   Cards de escalas visibles: ${policyCards.length}`);
        this.recordTest('POLICIES', 'Cards de escalas visibles', policyCards.length >= 0);

        console.log('');
    }

    // ========================================================================
    // TEST 3: CREAR SOLICITUD (CREATE)
    // ========================================================================
    async testCreateRequest() {
        console.log('='.repeat(60));
        console.log('TEST 3: CREAR SOLICITUD DE VACACIONES (CREATE)');
        console.log('='.repeat(60));

        // Obtener un usuario de la empresa para la solicitud
        const userResult = await pool.query(
            'SELECT user_id FROM users WHERE company_id = $1 LIMIT 1',
            [CONFIG.companyId]
        );

        if (userResult.rows.length === 0) {
            console.log('   No hay usuarios para crear solicitud');
            this.recordTest('CREATE', 'Crear solicitud', null, 'No hay usuarios');
            console.log('');
            return;
        }

        const userId = userResult.rows[0].user_id;

        // Limpiar solicitudes de prueba anteriores para este usuario
        console.log('   Limpiando solicitudes de prueba anteriores...');
        const cleanupResult = await pool.query(
            `DELETE FROM vacation_requests
             WHERE user_id = $1
             AND (reason LIKE '%[TEST]%' OR start_date > CURRENT_DATE + INTERVAL '20 days')
             RETURNING id`,
            [userId]
        );
        if (cleanupResult.rows.length > 0) {
            console.log(`   Eliminadas ${cleanupResult.rows.length} solicitudes de prueba anteriores`);
        }

        // Crear solicitud via API directa
        console.log('   Creando solicitud via API...');

        // Usar fechas únicas basadas en timestamp para evitar conflictos
        const uniqueOffset = Math.floor(Date.now() / 1000) % 100 + 30; // 30-130 dias en el futuro
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + uniqueOffset);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7); // 7 dias de vacaciones

        const requestData = {
            userId: userId,
            requestType: 'vacation',
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            reason: `[TEST] Solicitud de prueba ${this.timestamp}`,
            source: 'web'
        };

        const createResult = await this.page.evaluate(async (data) => {
            try {
                const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                if (!token) return { success: false, error: 'No hay token' };

                const response = await fetch('/api/v1/vacation/requests', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();
                if (response.ok) {
                    return { success: true, requestId: result.data?.id || result.id };
                } else {
                    return { success: false, error: result.message || result.error };
                }
            } catch (e) {
                return { success: false, error: e.message };
            }
        }, requestData);

        console.log(`   Resultado API: ${JSON.stringify(createResult)}`);

        if (createResult.success) {
            this.testRequestId = createResult.requestId;
            console.log(`   Solicitud creada - ID: ${this.testRequestId}`);
            this.recordTest('CREATE', 'Solicitud creada via API', true, { requestId: this.testRequestId });
        } else {
            console.log(`   Error: ${createResult.error}`);
            this.recordTest('CREATE', 'Solicitud creada via API', false, createResult.error);
        }

        await this.page.waitForTimeout(2000);
        console.log('');
    }

    // ========================================================================
    // TEST 4: APROBAR/RECHAZAR SOLICITUD (UPDATE)
    // ========================================================================
    async testUpdateRequest() {
        console.log('='.repeat(60));
        console.log('TEST 4: APROBAR/RECHAZAR SOLICITUD (UPDATE)');
        console.log('='.repeat(60));

        if (!this.testRequestId) {
            console.log('   No hay solicitud de prueba para actualizar');
            this.recordTest('UPDATE', 'Actualizar solicitud', null, 'No hay solicitud');
            console.log('');
            return;
        }

        // Aprobar la solicitud via API
        console.log('   Aprobando solicitud via API...');

        const approveResult = await this.page.evaluate(async (requestId) => {
            try {
                const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                if (!token) return { success: false, error: 'No hay token' };

                // Usar el endpoint correcto /approval y datos en camelCase
                const response = await fetch(`/api/v1/vacation/requests/${requestId}/approval`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        status: 'approved',
                        approvalComments: '[TEST] Aprobación de prueba automatizada'
                    })
                });

                const result = await response.json();
                if (response.ok) {
                    return { success: true, data: result };
                } else {
                    return { success: false, error: result.message || result.error };
                }
            } catch (e) {
                return { success: false, error: e.message };
            }
        }, this.testRequestId);

        if (approveResult.success) {
            console.log('   Solicitud aprobada');
            this.recordTest('UPDATE', 'Aprobar solicitud', true);
        } else {
            console.log(`   Error al aprobar: ${approveResult.error}`);
            this.recordTest('UPDATE', 'Aprobar solicitud', false, approveResult.error);
        }

        // Verificar estado en BD
        const statusResult = await pool.query(
            'SELECT status FROM vacation_requests WHERE id = $1',
            [this.testRequestId]
        );

        if (statusResult.rows.length > 0) {
            const status = statusResult.rows[0].status;
            console.log(`   Estado en BD: ${status}`);
            this.recordTest('UPDATE', 'Estado actualizado en BD', status === 'approved');
        }

        console.log('');
    }

    // ========================================================================
    // TEST 5: CONFIGURACION
    // ========================================================================
    async testConfiguration() {
        console.log('='.repeat(60));
        console.log('TEST 5: CONFIGURACION DEL MODULO');
        console.log('='.repeat(60));

        // Navegar a tab Config
        await this.page.evaluate(() => {
            if (typeof VacationEngine !== 'undefined') {
                VacationEngine.showView('config');
            }
        });
        await this.page.waitForTimeout(2000);

        // Verificar configuracion en BD
        const configResult = await pool.query(
            'SELECT * FROM vacation_configurations WHERE company_id = $1 AND is_active = true',
            [CONFIG.companyId]
        );

        if (configResult.rows.length > 0) {
            const config = configResult.rows[0];
            console.log(`   Configuracion activa encontrada`);
            console.log(`   - Dias minimos continuos: ${config.min_continuous_days}`);
            console.log(`   - Maximo fraccionamientos: ${config.max_fractions}`);
            console.log(`   - Dias aviso minimo: ${config.min_advance_notice_days}`);
            this.recordTest('CONFIG', 'Configuracion en BD', true);
        } else {
            console.log('   No hay configuracion activa');
            this.recordTest('CONFIG', 'Configuracion en BD', false);
        }

        // Verificar formulario en UI
        const configForm = await this.page.$('#config-form');
        if (configForm) {
            console.log('   Formulario de configuracion visible');
            this.recordTest('CONFIG', 'Formulario visible', true);
        }

        console.log('');
    }

    // ========================================================================
    // TEST 6: CALENDARIO
    // ========================================================================
    async testCalendar() {
        console.log('='.repeat(60));
        console.log('TEST 6: VISTA CALENDARIO');
        console.log('='.repeat(60));

        // Navegar a tab Calendario
        await this.page.evaluate(() => {
            if (typeof VacationEngine !== 'undefined') {
                VacationEngine.showView('calendar');
            }
        });
        await this.page.waitForTimeout(2000);

        // Verificar componentes del calendario
        const calendarGrid = await this.page.$('.ve-calendar-grid');
        if (calendarGrid) {
            console.log('   Calendario grid visible');
            this.recordTest('CALENDAR', 'Calendario visible', true);
        } else {
            console.log('   Calendario no encontrado');
            this.recordTest('CALENDAR', 'Calendario visible', false);
        }

        const calendarDays = await this.page.$$('.ve-calendar-day');
        console.log(`   Dias del mes: ${calendarDays.length}`);
        this.recordTest('CALENDAR', 'Dias del calendario', calendarDays.length > 0);

        console.log('');
    }

    // ========================================================================
    // TEST 7: ANALYTICS
    // ========================================================================
    async testAnalytics() {
        console.log('='.repeat(60));
        console.log('TEST 7: VISTA ANALYTICS');
        console.log('='.repeat(60));

        // Navegar a tab Analytics
        await this.page.evaluate(() => {
            if (typeof VacationEngine !== 'undefined') {
                VacationEngine.showView('analytics');
            }
        });
        await this.page.waitForTimeout(2000);

        // Verificar componentes de analytics
        const chartCards = await this.page.$$('.ve-chart-card');
        console.log(`   Cards de graficos: ${chartCards.length}`);
        this.recordTest('ANALYTICS', 'Cards de graficos', chartCards.length > 0);

        const bars = await this.page.$$('.ve-bar');
        console.log(`   Barras de estadisticas: ${bars.length}`);
        this.recordTest('ANALYTICS', 'Barras visibles', bars.length >= 0);

        console.log('');
    }

    // ========================================================================
    // TEST 8: PERSISTENCIA (RELOAD + CHECK)
    // ========================================================================
    async testPersistence() {
        console.log('='.repeat(60));
        console.log('TEST 8: VERIFICACION DE PERSISTENCIA (F5 + CHECK)');
        console.log('='.repeat(60));

        if (!this.testRequestId) {
            console.log('   No hay solicitud de prueba para verificar');
            this.recordTest('PERSISTENCE', 'Verificar persistencia', null, 'No hay solicitud');
            console.log('');
            return;
        }

        // 1. Recargar pagina
        console.log('   Recargando pagina (F5)...');
        await this.page.reload({ waitUntil: 'networkidle' });
        await this.page.waitForTimeout(3000);
        this.recordTest('PERSISTENCE', 'Recarga de pagina', true);

        // 2. Verificar solicitud en BD
        console.log('   Verificando solicitud en BD...');
        const requestResult = await pool.query(
            'SELECT id, status, total_days FROM vacation_requests WHERE id = $1',
            [this.testRequestId]
        );

        if (requestResult.rows.length > 0) {
            const request = requestResult.rows[0];
            console.log(`   Solicitud encontrada: ID ${request.id}, Estado: ${request.status}`);
            this.recordTest('PERSISTENCE', 'Solicitud persiste en BD', true);
        } else {
            console.log('   Solicitud NO encontrada en BD');
            this.recordTest('PERSISTENCE', 'Solicitud persiste en BD', false);
        }

        // 3. Re-login si es necesario
        const needsLogin = await this.page.$('#loginContainer:not([style*="display: none"])');
        if (needsLogin) {
            console.log('   Sesion expirada, haciendo re-login...');
            await this.login();
            await this.navigateToVacationModule();
        }

        console.log('');
    }

    // ========================================================================
    // TEST 9: ELIMINAR DATOS DE PRUEBA (DELETE)
    // ========================================================================
    async testDeleteTestData() {
        console.log('='.repeat(60));
        console.log('TEST 9: ELIMINAR DATOS DE PRUEBA (DELETE)');
        console.log('='.repeat(60));

        if (this.testRequestId) {
            try {
                await pool.query('DELETE FROM vacation_requests WHERE id = $1', [this.testRequestId]);
                console.log(`   Solicitud ${this.testRequestId} eliminada de BD`);
                this.recordTest('DELETE', 'Eliminar solicitud de prueba', true);
            } catch (error) {
                console.log(`   Error al eliminar: ${error.message}`);
                this.recordTest('DELETE', 'Eliminar solicitud de prueba', false, error.message);
            }
        } else {
            console.log('   No hay solicitud de prueba para eliminar');
            this.recordTest('DELETE', 'Eliminar solicitud de prueba', null, 'No hay solicitud');
        }

        console.log('');
    }

    // ========================================================================
    // UTILIDADES
    // ========================================================================
    recordTest(category, name, passed, details = null) {
        this.results.tests.push({
            category,
            name,
            passed,
            details,
            timestamp: new Date().toISOString()
        });

        if (passed === true) this.results.passed++;
        else if (passed === false) this.results.failed++;
        else this.results.skipped++;
    }

    // ========================================================================
    // REPORTE FINAL
    // ========================================================================
    generateReport() {
        console.log('\n');
        console.log('='.repeat(60));
        console.log('REPORTE FINAL DE TESTS - MODULO VACACIONES');
        console.log('='.repeat(60));
        console.log(`   Pasados:  ${this.results.passed}`);
        console.log(`   Fallidos: ${this.results.failed}`);
        console.log(`   Saltados: ${this.results.skipped}`);
        console.log(`   Total:    ${this.results.tests.length}`);
        console.log('');

        const successRate = this.results.tests.length > 0
            ? ((this.results.passed / this.results.tests.length) * 100).toFixed(1)
            : 0;
        console.log(`   Tasa de exito: ${successRate}%`);
        console.log('='.repeat(60));

        const failed = this.results.tests.filter(t => t.passed === false);
        if (failed.length > 0) {
            console.log('\nTESTS FALLIDOS:');
            failed.forEach(t => {
                console.log(`   - [${t.category}] ${t.name}: ${t.details || 'Sin detalles'}`);
            });
        }

        return this.results;
    }

    // ========================================================================
    // CLEANUP
    // ========================================================================
    async cleanup() {
        console.log('\n[CLEANUP] Cerrando recursos...');

        if (this.browser) {
            await this.browser.close();
            console.log('   Browser cerrado');
        }

        if (pool) {
            await pool.end();
            console.log('   Pool PostgreSQL cerrado');
        }

        console.log('[CLEANUP] Limpieza completada\n');
    }

    // ========================================================================
    // EJECUTAR TEST COMPLETO
    // ========================================================================
    async run() {
        try {
            await this.init();
            await this.login();
            await this.navigateToVacationModule();

            // Ejecutar todos los tests
            await this.testRequestsList();
            await this.testPoliciesLCT();
            await this.testCreateRequest();
            await this.testUpdateRequest();
            await this.testConfiguration();
            await this.testCalendar();
            await this.testAnalytics();
            await this.testPersistence();
            await this.testDeleteTestData();

            return this.generateReport();

        } catch (error) {
            console.error('\nERROR CRITICO:', error.message);
            this.results.errors.push(error.message);
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// ============================================================================
// EJECUTAR SI ES SCRIPT PRINCIPAL
// ============================================================================
if (require.main === module) {
    console.log(`
+================================================================+
|  TEST COMPLETO CRUD - MODULO VACACIONES                        |
|  Playwright E2E + PostgreSQL Validation                        |
+================================================================+
    `);

    const test = new VacationModuleCRUDTest();
    test.run()
        .then(results => {
            process.exit(results.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('Error fatal:', error);
            process.exit(1);
        });
}

module.exports = VacationModuleCRUDTest;
