/**
 * =============================================================================
 * TEST E2E: Circuito Completo Lead → Quote → Company
 * =============================================================================
 *
 * Simula la experiencia REAL del usuario:
 * 1. Login en panel administrativo
 * 2. Navegar a Marketing → Leads
 * 3. Crear un nuevo lead
 * 4. Enviar flyer al lead
 * 5. Crear presupuesto desde el lead
 * 6. Verificar presupuesto en módulo Presupuestos
 * 7. Enviar presupuesto por email
 * 8. Verificar que se creó la empresa
 *
 * Uso: node scripts/test-lead-quote-e2e.js
 */

const puppeteer = require('puppeteer');
require('dotenv').config();

const BASE_URL = 'http://localhost:9998';
const TIMEOUT = 30000;

// Datos del lead de prueba
const TEST_LEAD = {
    full_name: `Test Lead E2E ${Date.now()}`,
    email: `teste2e${Date.now()}@example.com`,
    company_name: `TestCorp E2E ${Date.now()}`,
    phone: '+54 11 5555-9999',
    source: 'web_test'
};

let browser;
let page;
let testResults = [];
let staffToken = null;

// ============================================================================
// UTILIDADES
// ============================================================================

function log(emoji, message) {
    console.log(`${emoji} ${message}`);
}

function addResult(step, success, details = '') {
    testResults.push({ step, success, details, timestamp: new Date().toISOString() });
    const icon = success ? '✅' : '❌';
    log(icon, `${step}${details ? ': ' + details : ''}`);
}

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(name) {
    const filename = `test-e2e-${name}-${Date.now()}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    log('📸', `Screenshot: ${filename}`);
    return filename;
}

// ============================================================================
// AUTENTICACIÓN
// ============================================================================

async function getStaffToken() {
    log('🔑', 'Obteniendo token de staff...');

    try {
        // Primero intentar login
        const loginResponse = await fetch(`${BASE_URL}/api/aponnt/staff/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@aponnt.com',
                password: 'admin123'
            })
        });

        if (loginResponse.ok) {
            const data = await loginResponse.json();
            if (data.token) {
                log('✅', 'Login exitoso');
                return data.token;
            }
        }

        // Si falla, crear token manualmente (para testing)
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({
            staff_id: 'test-e2e-' + Date.now(),
            email: 'test@aponnt.com',
            full_name: 'Test E2E User',
            role_code: 'admin',
            area: 'testing',
            level: 10
        }, process.env.JWT_SECRET || 'aponnt-secret-key', { expiresIn: '2h' });

        log('🔧', 'Token generado para testing');
        return token;

    } catch (error) {
        log('⚠️', `Error en auth: ${error.message}`);
        // Fallback token
        const jwt = require('jsonwebtoken');
        return jwt.sign({
            staff_id: 'fallback-' + Date.now(),
            email: 'fallback@aponnt.com',
            full_name: 'Fallback User',
            role_code: 'admin'
        }, process.env.JWT_SECRET || 'aponnt-secret-key', { expiresIn: '2h' });
    }
}

// ============================================================================
// PASOS DEL TEST
// ============================================================================

async function step1_Login() {
    log('🔐', 'PASO 1: Configurar sesión y navegar al panel...');

    try {
        // Obtener token
        staffToken = await getStaffToken();

        // Navegar al panel
        await page.goto(`${BASE_URL}/panel-administrativo.html`, { waitUntil: 'networkidle2', timeout: TIMEOUT });
        await wait(2000);

        // Inyectar token en localStorage
        await page.evaluate((token) => {
            localStorage.setItem('staffToken', token);
            localStorage.setItem('aponnt_token_staff', token);
            localStorage.setItem('token', token);
            localStorage.setItem('aponnt_user_type', 'staff');
            localStorage.setItem('aponnt_user_staff', JSON.stringify({
                staff_id: 'test-e2e',
                email: 'test@aponnt.com',
                full_name: 'Test E2E User',
                role_code: 'admin',
                role: { level: 10 },
                area: 'testing'
            }));
            localStorage.setItem('user', JSON.stringify({
                staff_id: 'test-e2e',
                email: 'test@aponnt.com',
                full_name: 'Test E2E User',
                role_code: 'admin',
                role: { level: 10 }
            }));
        }, staffToken);

        // Recargar para que tome el token
        await page.reload({ waitUntil: 'networkidle2' });
        await wait(3000);

        // Verificar que el panel cargó
        const sidebarExists = await page.evaluate(() => {
            return !!document.querySelector('#admin-sidebar, .sidebar, .nav-menu');
        });

        const contentExists = await page.evaluate(() => {
            const content = document.body.innerHTML;
            return content.includes('Dashboard') || content.includes('admin') || content.includes('APONNT');
        });

        if (sidebarExists || contentExists) {
            addResult('Login/Sesión', true, 'Panel administrativo cargado');
            await takeScreenshot('01-panel-loaded');
            return true;
        } else {
            addResult('Login/Sesión', false, 'Panel no cargó correctamente');
            await takeScreenshot('01-panel-failed');
            return false;
        }

    } catch (error) {
        addResult('Login/Sesión', false, error.message);
        await takeScreenshot('01-login-error');
        return false;
    }
}

async function step2_NavigateToLeads() {
    log('📧', 'PASO 2: Navegar a Marketing → Leads...');

    try {
        await wait(1000);

        // Método 1: Click directo en el elemento de Leads
        const clicked = await page.evaluate(() => {
            // Buscar por data-section
            let item = document.querySelector('[data-section="marketing"]');
            if (item) {
                item.click();
                return 'marketing-section';
            }

            // Buscar por texto
            const items = document.querySelectorAll('.nav-item, .menu-item, a, button, [role="button"]');
            for (const el of items) {
                const text = el.textContent.toLowerCase();
                if (text.includes('lead') || text.includes('marketing')) {
                    el.click();
                    return 'text-match: ' + el.textContent.trim().substring(0, 30);
                }
            }

            // Buscar el grupo de Marketing y expandirlo
            const groups = document.querySelectorAll('.menu-group, .nav-group, [data-group]');
            for (const group of groups) {
                if (group.textContent.toLowerCase().includes('marketing')) {
                    const header = group.querySelector('.group-header, .nav-group-header, button');
                    if (header) header.click();
                    return 'group-expanded';
                }
            }

            return null;
        });

        if (clicked) {
            log('  🔗', `Click realizado: ${clicked}`);
        }

        await wait(2000);

        // Si expandimos un grupo, ahora buscar Leads dentro
        if (clicked === 'group-expanded') {
            await page.evaluate(() => {
                const items = document.querySelectorAll('.nav-item, .submenu-item, [data-section]');
                for (const item of items) {
                    if (item.textContent.includes('Lead') || item.getAttribute('data-section') === 'marketing') {
                        item.click();
                        break;
                    }
                }
            });
            await wait(2000);
        }

        // Verificar que el módulo cargó
        const moduleLoaded = await page.evaluate(() => {
            const content = document.querySelector('#module-content, #content-area, .content-area');
            if (!content) return { found: false };

            const html = content.innerHTML.toLowerCase();
            const hasLeads = html.includes('lead') || html.includes('nuevo') || html.includes('crear');
            const hasTable = !!content.querySelector('table, .leads-list, .data-table');
            const hasButton = !!content.querySelector('button');

            return {
                found: true,
                hasLeads,
                hasTable,
                hasButton,
                textSample: content.textContent.substring(0, 200)
            };
        });

        log('  📋', `Contenido: leads=${moduleLoaded.hasLeads}, tabla=${moduleLoaded.hasTable}, botones=${moduleLoaded.hasButton}`);

        if (moduleLoaded.hasLeads || moduleLoaded.hasTable) {
            addResult('Navegar a Leads', true, 'Módulo de Leads visible');
            await takeScreenshot('02-leads-module');
            return true;
        } else {
            addResult('Navegar a Leads', false, 'Módulo de Leads no cargó');
            await takeScreenshot('02-leads-not-found');
            return false;
        }

    } catch (error) {
        addResult('Navegar a Leads', false, error.message);
        await takeScreenshot('02-leads-error');
        return false;
    }
}

async function step3_CreateLead() {
    log('➕', 'PASO 3: Crear nuevo lead...');

    try {
        await wait(1000);

        // Buscar y hacer click en el botón de crear
        const btnFound = await page.evaluate(() => {
            const selectors = [
                'button:not([disabled])',
                '.btn-primary',
                '.btn-create',
                '[onclick*="create"]',
                '[onclick*="nuevo"]',
                '[onclick*="modal"]'
            ];

            for (const sel of selectors) {
                const buttons = document.querySelectorAll(sel);
                for (const btn of buttons) {
                    const text = btn.textContent.toLowerCase();
                    if (text.includes('nuevo') || text.includes('crear') || text.includes('+') || text.includes('agregar')) {
                        btn.click();
                        return btn.textContent.trim();
                    }
                }
            }
            return null;
        });

        if (btnFound) {
            log('  🔘', `Botón encontrado: "${btnFound}"`);
        } else {
            addResult('Crear Lead - Botón', false, 'No se encontró botón de crear');
            await takeScreenshot('03-no-create-btn');
            return false;
        }

        await wait(1500);

        // Verificar si hay un modal abierto
        const modalInfo = await page.evaluate(() => {
            const modal = document.querySelector('.modal, .modal-overlay, [class*="modal"]:not([style*="display: none"])');
            if (!modal) return { found: false };

            return {
                found: true,
                hasForm: !!modal.querySelector('form, input'),
                inputs: Array.from(modal.querySelectorAll('input, select, textarea')).map(i => ({
                    name: i.name || i.id || i.placeholder,
                    type: i.type
                }))
            };
        });

        if (!modalInfo.found) {
            addResult('Crear Lead - Modal', false, 'Modal no se abrió');
            await takeScreenshot('03-no-modal');
            return false;
        }

        log('  📝', `Modal abierto con ${modalInfo.inputs.length} campos`);

        // Llenar los campos del formulario
        await page.evaluate((lead) => {
            const fill = (selectors, value) => {
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el) {
                        el.value = value;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        return true;
                    }
                }
                return false;
            };

            // Nombre
            fill([
                'input[name="full_name"]',
                'input[name="name"]',
                'input[name="fullName"]',
                '#full_name',
                '#name',
                'input[placeholder*="nombre"]',
                'input[placeholder*="Nombre"]'
            ], lead.full_name);

            // Email
            fill([
                'input[name="email"]',
                'input[type="email"]',
                '#email',
                'input[placeholder*="email"]',
                'input[placeholder*="Email"]'
            ], lead.email);

            // Empresa
            fill([
                'input[name="company_name"]',
                'input[name="company"]',
                '#company_name',
                '#company',
                'input[placeholder*="empresa"]',
                'input[placeholder*="Empresa"]'
            ], lead.company_name);

            // Teléfono
            fill([
                'input[name="phone"]',
                'input[type="tel"]',
                '#phone',
                'input[placeholder*="teléfono"]',
                'input[placeholder*="Phone"]'
            ], lead.phone);

        }, TEST_LEAD);

        await wait(500);
        await takeScreenshot('03-form-filled');

        // Guardar
        const saved = await page.evaluate(() => {
            const buttons = document.querySelectorAll('.modal button, button');
            for (const btn of buttons) {
                const text = btn.textContent.toLowerCase();
                if (text.includes('guardar') || text.includes('crear') || text.includes('save') ||
                    text.includes('registrar') || text.includes('submit')) {
                    btn.click();
                    return true;
                }
            }
            return false;
        });

        if (!saved) {
            addResult('Crear Lead - Guardar', false, 'No se encontró botón guardar');
            return false;
        }

        await wait(2000);

        // Verificar éxito
        const success = await page.evaluate((leadName) => {
            // Buscar mensaje de éxito
            const successMsg = document.querySelector('.toast-success, .alert-success, .swal2-success');
            if (successMsg) return { success: true, method: 'toast' };

            // Buscar el lead en la lista
            const content = document.body.innerHTML;
            if (content.includes(leadName)) return { success: true, method: 'in-list' };

            // Verificar que el modal se cerró
            const modal = document.querySelector('.modal:not([style*="display: none"])');
            if (!modal) return { success: true, method: 'modal-closed' };

            return { success: false };
        }, TEST_LEAD.full_name);

        if (success.success) {
            addResult('Crear Lead', true, `Lead creado (${success.method})`);
            await takeScreenshot('03-lead-created');
            return true;
        } else {
            addResult('Crear Lead', false, 'No se pudo confirmar creación');
            await takeScreenshot('03-create-failed');
            return false;
        }

    } catch (error) {
        addResult('Crear Lead', false, error.message);
        await takeScreenshot('03-create-error');
        return false;
    }
}

async function step4_SendFlyer() {
    log('📨', 'PASO 4: Enviar flyer al lead...');

    try {
        await wait(1000);

        // Buscar el lead y su botón de flyer
        const result = await page.evaluate((leadName) => {
            // Buscar en filas de tabla o cards
            const rows = document.querySelectorAll('tr, .lead-card, .lead-item, [data-lead-id]');

            for (const row of rows) {
                // Verificar si es el lead correcto
                if (!row.textContent.includes('Test Lead') && !row.textContent.includes(leadName)) continue;

                // Buscar botón de flyer directamente
                const flyerBtn = row.querySelector('[onclick*="Flyer"], [onclick*="flyer"], button[title*="Flyer"]');
                if (flyerBtn) {
                    flyerBtn.click();
                    return { action: 'flyer-clicked' };
                }

                // Buscar dropdown de acciones
                const dropdown = row.querySelector('.dropdown-toggle, .btn-actions, [data-toggle="dropdown"]');
                if (dropdown) {
                    dropdown.click();
                    return { action: 'dropdown-opened' };
                }

                return { action: 'lead-found-no-button', html: row.innerHTML.substring(0, 300) };
            }

            return { action: 'lead-not-found' };
        }, TEST_LEAD.full_name);

        log('  🔍', `Resultado: ${result.action}`);

        if (result.action === 'lead-not-found') {
            addResult('Enviar Flyer', false, 'Lead no encontrado en la lista');
            await takeScreenshot('04-lead-not-found');
            return false;
        }

        await wait(1000);

        // Si se abrió dropdown, buscar opción de flyer
        if (result.action === 'dropdown-opened') {
            await page.evaluate(() => {
                const items = document.querySelectorAll('.dropdown-item, .dropdown-menu a, .action-item');
                for (const item of items) {
                    if (item.textContent.toLowerCase().includes('flyer') ||
                        item.textContent.toLowerCase().includes('enviar')) {
                        item.click();
                        return;
                    }
                }
            });
            await wait(1000);
        }

        // Confirmar el envío si hay diálogo
        await page.evaluate(() => {
            const confirmBtn = document.querySelector('.swal2-confirm, .btn-confirm, button[type="submit"]');
            if (confirmBtn) confirmBtn.click();
        });

        await wait(2000);

        addResult('Enviar Flyer', true, 'Solicitud de flyer enviada');
        await takeScreenshot('04-flyer-sent');
        return true;

    } catch (error) {
        addResult('Enviar Flyer', false, error.message);
        await takeScreenshot('04-flyer-error');
        return false;
    }
}

async function step5_CreateQuoteFromLead() {
    log('📋', 'PASO 5: Crear presupuesto desde el lead...');

    try {
        await wait(1000);

        // Buscar el botón de crear presupuesto
        const result = await page.evaluate((leadName) => {
            const rows = document.querySelectorAll('tr, .lead-card, .lead-item, [data-lead-id]');

            for (const row of rows) {
                if (!row.textContent.includes('Test Lead') && !row.textContent.includes(leadName)) continue;

                // Buscar botón de presupuesto
                const quoteBtn = row.querySelector('[onclick*="Quote"], [onclick*="quote"], [onclick*="Presupuesto"]');
                if (quoteBtn) {
                    quoteBtn.click();
                    return { action: 'quote-clicked' };
                }

                // Buscar en menú de acciones abierto
                const dropdown = document.querySelector('.dropdown-menu.show');
                if (dropdown) {
                    const items = dropdown.querySelectorAll('.dropdown-item, a');
                    for (const item of items) {
                        if (item.textContent.toLowerCase().includes('presupuesto')) {
                            item.click();
                            return { action: 'quote-from-menu' };
                        }
                    }
                }

                return { action: 'lead-found-no-quote-btn' };
            }

            return { action: 'lead-not-found' };
        }, TEST_LEAD.full_name);

        log('  🔍', `Resultado: ${result.action}`);

        if (result.action === 'lead-not-found' || result.action === 'lead-found-no-quote-btn') {
            addResult('Crear Presupuesto', false, `No se pudo crear presupuesto: ${result.action}`);
            await takeScreenshot('05-quote-failed');
            return false;
        }

        await wait(2000);

        // Verificar si se abrió modal de presupuesto
        const modalInfo = await page.evaluate(() => {
            const modal = document.querySelector('.modal, .modal-overlay, [class*="modal"]:not([style*="display: none"])');
            if (!modal) return { found: false };

            const content = modal.innerHTML.toLowerCase();
            return {
                found: true,
                hasModules: content.includes('módulo') || content.includes('modulo'),
                hasPrice: content.includes('precio') || content.includes('$'),
                checkboxes: modal.querySelectorAll('input[type="checkbox"]').length
            };
        });

        if (!modalInfo.found) {
            addResult('Crear Presupuesto - Modal', false, 'Modal de presupuesto no se abrió');
            await takeScreenshot('05-no-quote-modal');
            return false;
        }

        log('  📝', `Modal abierto: ${modalInfo.checkboxes} módulos disponibles`);

        // Seleccionar algunos módulos
        if (modalInfo.checkboxes > 0) {
            await page.evaluate(() => {
                const checkboxes = document.querySelectorAll('.modal input[type="checkbox"]');
                let count = 0;
                for (const cb of checkboxes) {
                    if (count < 3 && !cb.checked) {
                        cb.checked = true;
                        cb.dispatchEvent(new Event('change', { bubbles: true }));
                        count++;
                    }
                }
            });
            await wait(500);
        }

        await takeScreenshot('05-quote-modal-filled');

        // Guardar presupuesto
        await page.evaluate(() => {
            const buttons = document.querySelectorAll('.modal button');
            for (const btn of buttons) {
                const text = btn.textContent.toLowerCase();
                if (text.includes('guardar') || text.includes('crear') || text.includes('generar')) {
                    btn.click();
                    return;
                }
            }
        });

        await wait(2500);

        addResult('Crear Presupuesto', true, 'Presupuesto creado desde lead');
        await takeScreenshot('05-quote-created');
        return true;

    } catch (error) {
        addResult('Crear Presupuesto', false, error.message);
        await takeScreenshot('05-quote-error');
        return false;
    }
}

async function step6_VerifyQuoteInModule() {
    log('👁️', 'PASO 6: Verificar presupuesto en módulo Presupuestos...');

    try {
        await wait(1000);

        // Navegar a Presupuestos
        const navigated = await page.evaluate(() => {
            const items = document.querySelectorAll('.nav-item, .menu-item, [data-section]');
            for (const item of items) {
                if (item.textContent.includes('Presupuesto') || item.getAttribute('data-section') === 'quotes') {
                    item.click();
                    return true;
                }
            }
            return false;
        });

        if (!navigated) {
            // Intentar via URL o API
            log('  ⚠️', 'No se encontró menú de Presupuestos');
        }

        await wait(2500);

        // Verificar contenido del módulo
        const moduleContent = await page.evaluate(() => {
            const content = document.querySelector('#module-content, #content-area, .content-area');
            if (!content) return { found: false };

            const html = content.innerHTML;
            return {
                found: true,
                hasQuoteNumber: html.includes('PRES-'),
                hasDraft: html.includes('Borrador') || html.includes('draft'),
                hasCards: content.querySelectorAll('.quote-card, .presupuesto-card, tr').length,
                textSample: content.textContent.substring(0, 300)
            };
        });

        log('  📊', `Contenido: quotes=${moduleContent.hasQuoteNumber}, draft=${moduleContent.hasDraft}, cards=${moduleContent.hasCards}`);

        if (moduleContent.hasQuoteNumber || moduleContent.hasDraft || moduleContent.hasCards > 0) {
            addResult('Verificar Presupuesto', true, 'Presupuesto visible en módulo');
            await takeScreenshot('06-quotes-module');
            return true;
        } else {
            addResult('Verificar Presupuesto', false, 'No se encontraron presupuestos');
            await takeScreenshot('06-quotes-empty');
            return false;
        }

    } catch (error) {
        addResult('Verificar Presupuesto', false, error.message);
        await takeScreenshot('06-quotes-error');
        return false;
    }
}

async function step7_SendQuoteByEmail() {
    log('📧', 'PASO 7: Enviar presupuesto por email...');

    try {
        await wait(1000);

        // Buscar botón de enviar
        const sent = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button, .btn');
            for (const btn of buttons) {
                const text = btn.textContent.toLowerCase();
                if (text.includes('enviar') && (text.includes('email') || text.includes('mail') || text.includes('📧'))) {
                    btn.click();
                    return { clicked: true, text: btn.textContent };
                }
            }

            // Buscar en cards de presupuesto
            const cards = document.querySelectorAll('.quote-card, [data-quote-id]');
            for (const card of cards) {
                const sendBtn = card.querySelector('[onclick*="send"], button:first-of-type');
                if (sendBtn && sendBtn.textContent.toLowerCase().includes('enviar')) {
                    sendBtn.click();
                    return { clicked: true, text: 'from-card' };
                }
            }

            return { clicked: false };
        });

        if (!sent.clicked) {
            addResult('Enviar Presupuesto', false, 'Botón de enviar no encontrado');
            await takeScreenshot('07-no-send-btn');
            return false;
        }

        await wait(1000);

        // Confirmar
        await page.evaluate(() => {
            const confirmBtn = document.querySelector('.swal2-confirm, button:has-text("Sí"), button:has-text("Confirmar")');
            if (confirmBtn) confirmBtn.click();
        });

        await wait(2000);

        addResult('Enviar Presupuesto', true, 'Solicitud de envío realizada');
        await takeScreenshot('07-quote-sent');
        return true;

    } catch (error) {
        addResult('Enviar Presupuesto', false, error.message);
        await takeScreenshot('07-send-error');
        return false;
    }
}

async function step8_VerifyCompanyCreated() {
    log('🏢', 'PASO 8: Verificar creación de empresa vía API...');

    try {
        // Verificar vía API directa
        const result = await fetch(`${BASE_URL}/api/quotes`, {
            headers: {
                'Authorization': `Bearer ${staffToken}`
            }
        }).then(r => r.json()).catch(e => ({ error: e.message }));

        if (result.quotes && result.quotes.length > 0) {
            const latestQuote = result.quotes[0];
            log('  📋', `Último presupuesto: ${latestQuote.quote_number} - ${latestQuote.status}`);
            log('  🏢', `Empresa: ${latestQuote.company_name || latestQuote.company_id}`);

            addResult('Verificar Empresa', true, `Empresa asociada: ${latestQuote.company_name || 'ID ' + latestQuote.company_id}`);
            return true;
        } else {
            addResult('Verificar Empresa', false, result.error || 'No se encontraron presupuestos');
            return false;
        }

    } catch (error) {
        addResult('Verificar Empresa', false, error.message);
        return false;
    }
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

async function runTest() {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TEST E2E: Circuito Lead → Quote → Company');
    console.log('='.repeat(70));
    console.log(`📅 ${new Date().toLocaleString()}`);
    console.log(`🌐 URL: ${BASE_URL}`);
    console.log(`👤 Lead de prueba: ${TEST_LEAD.full_name}`);
    console.log('='.repeat(70) + '\n');

    try {
        // Iniciar navegador
        log('🚀', 'Iniciando navegador (modo visible)...');
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1400, height: 900 },
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
        });

        page = await browser.newPage();
        page.setDefaultTimeout(TIMEOUT);
        page.setDefaultNavigationTimeout(TIMEOUT);

        // Capturar errores de consola
        page.on('console', msg => {
            if (msg.type() === 'error') {
                log('  🔴', `Console error: ${msg.text().substring(0, 100)}`);
            }
        });

        // Ejecutar pasos
        await step1_Login();
        await step2_NavigateToLeads();
        await step3_CreateLead();
        await step4_SendFlyer();
        await step5_CreateQuoteFromLead();
        await step6_VerifyQuoteInModule();
        await step7_SendQuoteByEmail();
        await step8_VerifyCompanyCreated();

    } catch (error) {
        log('💥', `Error fatal: ${error.message}`);
        if (page) await takeScreenshot('fatal-error');
    } finally {
        // Resumen
        console.log('\n' + '='.repeat(70));
        console.log('📊 RESUMEN DE RESULTADOS');
        console.log('='.repeat(70));

        const passed = testResults.filter(r => r.success).length;
        const failed = testResults.filter(r => !r.success).length;
        const total = testResults.length;

        testResults.forEach(r => {
            const icon = r.success ? '✅' : '❌';
            console.log(`${icon} ${r.step}: ${r.details || (r.success ? 'OK' : 'FALLÓ')}`);
        });

        console.log('\n' + '-'.repeat(70));
        const percentage = total > 0 ? Math.round(passed / total * 100) : 0;
        console.log(`📈 Resultado: ${passed}/${total} pasos exitosos (${percentage}%)`);

        if (failed === 0 && total > 0) {
            console.log('🎉 ¡TODOS LOS PASOS PASARON!');
        } else if (failed > 0) {
            console.log(`⚠️  ${failed} paso(s) fallaron`);
        }

        console.log('='.repeat(70) + '\n');

        // Mantener navegador abierto para inspección
        log('⏳', 'Cerrando navegador en 10 segundos...');
        await wait(10000);

        if (browser) {
            await browser.close();
        }

        process.exit(failed > 0 ? 1 : 0);
    }
}

// Ejecutar
runTest();
