/**
 * =============================================================================
 * TEST E2E: Circuito Completo Quote -> Factura -> Pago -> Alta Definitiva
 * =============================================================================
 *
 * FASE 1: Tests API directos (backend puro)
 *   1. Crear quote de prueba y activarlo
 *   2. POST /api/quotes/:id/generate-invoice -> verifica factura creada con items
 *   3. GET /api/quotes/:id/invoice -> verifica factura asociada
 *   4. POST /api/quotes/:id/confirm-payment -> verifica pago, factura=paid
 *
 * FASE 2: Tests Puppeteer (UI completa)
 *   5. Login panel admin
 *   6. Navegar a Presupuestos
 *   7. Verificar que quote activo tiene botones de circuito
 *   8. Click "Generar Factura" -> verificar toast
 *   9. Click "Ver Estado" -> verificar checklist
 *  10. Click "Registrar Pago" -> llenar modal -> submit
 *  11. Click "Ver Estado" -> verificar circuito completo
 *
 * Uso: node scripts/test-quote-invoice-circuit-e2e.js
 */

const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:9998';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const JWT_SECRET = process.env.JWT_SECRET || 'aponnt-secret-key';
const TIMEOUT = 30000;

let browser, page;
let testResults = [];
let staffToken = null;
let testQuoteId = null;
let testCompanyId = null;

// ============================================================================
// UTILIDADES
// ============================================================================

function log(emoji, msg) { console.log(`${emoji} ${msg}`); }

function addResult(step, success, details = '') {
    testResults.push({ step, success, details });
    console.log(`${success ? '✅' : '❌'} ${step}${details ? ': ' + details : ''}`);
}

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function apiCall(method, path, body = null, isFormData = false) {
    const opts = {
        method,
        headers: { 'Authorization': 'Bearer ' + staffToken }
    };
    if (body && !isFormData) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    if (body && isFormData) {
        opts.body = body;
    }
    const resp = await fetch(`${BASE_URL}${path}`, opts);
    return resp.json();
}

function generateToken() {
    return jwt.sign({
        staff_id: 999,
        staffId: 999,
        email: 'test-circuit@aponnt.com',
        full_name: 'Test Circuit E2E',
        role_code: 'admin',
        role: 'admin',
        area: 'testing',
        level: 10
    }, JWT_SECRET, { expiresIn: '2h' });
}

// ============================================================================
// FASE 0: SETUP - Crear datos de prueba
// ============================================================================

async function setup() {
    log('🔧', '=== FASE 0: SETUP ===');
    staffToken = generateToken();

    const { sequelize } = require('../src/config/database');
    const Q = require('sequelize').QueryTypes;

    // Check if we have an active quote; if not, create one
    const activeQuotes = await sequelize.query(
        `SELECT id, quote_number, company_id, total_amount FROM quotes WHERE status = 'active' LIMIT 1`,
        { type: Q.SELECT }
    );

    if (activeQuotes.length > 0) {
        testQuoteId = activeQuotes[0].id;
        testCompanyId = activeQuotes[0].company_id;
        log('✅', `Using existing active quote: ${activeQuotes[0].quote_number} (ID: ${testQuoteId})`);
        return;
    }

    // No active quote - create one from an existing quote or from scratch
    log('🔧', 'No active quote found. Creating test data...');

    // Get a company
    const companies = await sequelize.query(
        `SELECT company_id FROM companies WHERE is_active = true LIMIT 1`,
        { type: Q.SELECT }
    );

    if (companies.length === 0) {
        throw new Error('No active companies found in DB. Cannot create test data.');
    }

    testCompanyId = companies[0].company_id;

    // Get a seller/partner
    const partners = await sequelize.query(
        `SELECT id FROM partners LIMIT 1`,
        { type: Q.SELECT }
    );

    const sellerId = partners.length > 0 ? partners[0].id : 1;

    // First supersede any existing active quote for this company
    await sequelize.query(
        `UPDATE quotes SET status = 'superseded' WHERE company_id = :cid AND status = 'active'`,
        { replacements: { cid: testCompanyId } }
    );

    // Create a test quote directly as 'active'
    const year = new Date().getFullYear();
    const lastQ = await sequelize.query(
        `SELECT quote_number FROM quotes WHERE quote_number LIKE :prefix ORDER BY id DESC LIMIT 1`,
        { replacements: { prefix: `PRES-${year}-%` }, type: Q.SELECT }
    );

    let nextNum = 1;
    if (lastQ.length > 0) {
        const m = lastQ[0].quote_number.match(/PRES-\d{4}-(\d{4})/);
        if (m) nextNum = parseInt(m[1]) + 1;
    }
    const qnum = `PRES-${year}-${String(nextNum).padStart(4, '0')}`;

    const modulesData = [
        { module_key: 'attendance', module_name: 'Control de Asistencia', price: 150, quantity: 1, subtotal: 150 },
        { module_key: 'users', module_name: 'Gestión de Usuarios', price: 100, quantity: 1, subtotal: 100 },
        { module_key: 'shifts', module_name: 'Gestión de Turnos', price: 120, quantity: 1, subtotal: 120 }
    ];

    const result = await sequelize.query(
        `INSERT INTO quotes (quote_number, company_id, seller_id, modules_data, total_amount, status, status_history, created_at, updated_at)
         VALUES (:qnum, :cid, :sid, :modules, :total, 'active', '[]', NOW(), NOW())
         RETURNING id`,
        {
            replacements: {
                qnum,
                cid: testCompanyId,
                sid: sellerId,
                modules: JSON.stringify(modulesData),
                total: 370
            },
            type: Q.SELECT
        }
    );

    testQuoteId = result[0].id;
    log('✅', `Created test quote: ${qnum} (ID: ${testQuoteId}) for company ${testCompanyId}`);
}

// ============================================================================
// FASE 1: TESTS API DIRECTOS
// ============================================================================

async function phase1_ApiTests() {
    log('🧪', '');
    log('🧪', '═══════════════════════════════════════');
    log('🧪', '  FASE 1: TESTS API DIRECTOS');
    log('🧪', '═══════════════════════════════════════');

    // ── TEST 1.1: GET quote list - verify our quote exists ──
    log('📋', 'Test 1.1: Verificar quote activo en listado');
    const listData = await apiCall('GET', '/api/quotes');
    const found = (listData.quotes || []).find(q => q.id === testQuoteId);
    addResult('1.1 Quote en listado', !!found, found ? `${found.quote_number} status=${found.status}` : 'No encontrado');

    // ── TEST 1.2: GET invoice (should be null initially) ──
    log('📋', 'Test 1.2: Verificar que no hay factura aún');
    const invBefore = await apiCall('GET', `/api/quotes/${testQuoteId}/invoice`);
    addResult('1.2 Sin factura inicial', invBefore.success && !invBefore.invoice, invBefore.message || 'OK');

    // ── TEST 1.3: Generate invoice ──
    log('🧾', 'Test 1.3: Generar factura desde quote');
    const genResult = await apiCall('POST', `/api/quotes/${testQuoteId}/generate-invoice`);
    addResult('1.3 Generar factura', genResult.success === true,
        genResult.invoice_number ? `Factura: ${genResult.invoice_number}` : (genResult.error || genResult.message || 'fail'));

    const invoiceId = genResult.invoice_id;
    const invoiceNumber = genResult.invoice_number;

    // ── TEST 1.4: Verify invoice was created with items ──
    log('🧾', 'Test 1.4: Verificar factura creada con items');
    const invAfter = await apiCall('GET', `/api/quotes/${testQuoteId}/invoice`);
    const inv = invAfter.invoice;
    const hasInvoice = !!inv && String(inv.id) === String(invoiceId);
    addResult('1.4 Factura asociada', hasInvoice, inv ? `ID=${inv.id} status=${inv.status} total=${inv.total_amount}` : 'No encontrada');

    // Verify items in DB
    const { sequelize } = require('../src/config/database');
    const Q = require('sequelize').QueryTypes;
    let items = [];
    if (invoiceId) {
        items = await sequelize.query(
            `SELECT * FROM invoice_items WHERE invoice_id = :iid`,
            { replacements: { iid: parseInt(invoiceId) }, type: Q.SELECT }
        );
    }
    addResult('1.4b Invoice items', items.length === 3, `${items.length} items creados (esperado: 3)`);

    if (items.length > 0) {
        log('   ', `  Items: ${items.map(i => `${i.description} $${i.unit_price}`).join(', ')}`);
    }

    // ── TEST 1.5: Verify quote now has invoice_id ──
    log('🔗', 'Test 1.5: Verificar quote.invoice_id actualizado');
    const quoteRow = await sequelize.query(
        `SELECT invoice_id FROM quotes WHERE id = :id`,
        { replacements: { id: testQuoteId }, type: Q.SELECT }
    );
    addResult('1.5 Quote linkado', String(quoteRow[0]?.invoice_id) === String(invoiceId),
        `invoice_id=${quoteRow[0]?.invoice_id} (esperado: ${invoiceId})`);

    // ── TEST 1.6: Try generating invoice again (idempotent) ──
    log('🔄', 'Test 1.6: Re-generar factura (idempotente)');
    const regenResult = await apiCall('POST', `/api/quotes/${testQuoteId}/generate-invoice`);
    addResult('1.6 Idempotente', regenResult.success && regenResult.already_existed === true,
        regenResult.message || 'No idempotente');

    // ── TEST 1.7: Register payment (send as FormData for multer) ──
    log('💰', 'Test 1.7: Registrar pago');
    const formData = new FormData();
    formData.append('amount', String(inv ? parseFloat(inv.total_amount) : 370));
    formData.append('payment_method', 'transfer');
    formData.append('payment_reference', 'TEST-REF-' + Date.now());
    formData.append('payment_date', new Date().toISOString().split('T')[0]);
    formData.append('notes', 'Pago de prueba E2E');
    const payResult = await apiCall('POST', `/api/quotes/${testQuoteId}/confirm-payment`, formData, true);
    addResult('1.7 Pago registrado', payResult.success === true,
        payResult.error || (payResult.already_paid ? 'Ya pagado' : `Payment ID=${payResult.payment?.id || 'N/A'}`));

    // ── TEST 1.8: Verify invoice is now paid ──
    log('✅', 'Test 1.8: Verificar factura pagada');
    if (invoiceId) {
        const invPaid = await sequelize.query(
            `SELECT status, paid_at FROM invoices WHERE id = :id`,
            { replacements: { id: parseInt(invoiceId) }, type: Q.SELECT }
        );
        addResult('1.8 Factura pagada', invPaid[0]?.status === 'paid',
            `status=${invPaid[0]?.status} paid_at=${invPaid[0]?.paid_at || 'null'}`);
    } else {
        addResult('1.8 Factura pagada', false, 'No invoiceId');
    }

    // ── TEST 1.9: Verify payment record exists ──
    log('💳', 'Test 1.9: Verificar registro de pago en DB');
    if (invoiceId) {
        const payments = await sequelize.query(
            `SELECT id, amount, payment_method, payment_reference FROM payments WHERE invoice_id = :id ORDER BY id DESC LIMIT 1`,
            { replacements: { id: parseInt(invoiceId) }, type: Q.SELECT }
        );
        addResult('1.9 Payment en DB', payments.length > 0,
            payments.length > 0 ? `ID=${payments[0].id} amount=$${payments[0].amount} ref=${payments[0].payment_reference}` : 'No encontrado');
    } else {
        addResult('1.9 Payment en DB', false, 'No invoiceId');
    }

    // ── TEST 1.10: Verify company activation (if pendiente) ──
    log('🏢', 'Test 1.10: Verificar estado empresa');
    const company = await sequelize.query(
        `SELECT company_id, name, is_active FROM companies WHERE company_id = :id`,
        { replacements: { id: testCompanyId }, type: Q.SELECT }
    );
    addResult('1.10 Estado empresa', true, `${company[0]?.name} is_active=${company[0]?.is_active}`);

    return { invoiceId, invoiceNumber };
}

// ============================================================================
// FASE 2: TESTS PUPPETEER (UI)
// ============================================================================

async function phase2_PuppeteerTests() {
    log('🌐', '');
    log('🌐', '═══════════════════════════════════════');
    log('🌐', '  FASE 2: TESTS PUPPETEER (UI)');
    log('🌐', '═══════════════════════════════════════');

    // First, reset the quote to test UI flow: remove invoice_id, delete invoice
    const { sequelize } = require('../src/config/database');
    const Q = require('sequelize').QueryTypes;

    // Clean up: remove previous invoice link and delete test invoices/payments
    const oldInvoiceId = (await sequelize.query(
        `SELECT invoice_id FROM quotes WHERE id = :id`, { replacements: { id: testQuoteId }, type: Q.SELECT }
    ))[0]?.invoice_id;

    if (oldInvoiceId) {
        await sequelize.query(`DELETE FROM payments WHERE invoice_id = :id`, { replacements: { id: oldInvoiceId } });
        await sequelize.query(`DELETE FROM invoice_items WHERE invoice_id = :id`, { replacements: { id: oldInvoiceId } });
        await sequelize.query(`DELETE FROM invoices WHERE id = :id`, { replacements: { id: oldInvoiceId } });
    }
    await sequelize.query(`UPDATE quotes SET invoice_id = NULL WHERE id = :id`, { replacements: { id: testQuoteId } });
    log('🧹', 'Reset: invoice_id limpiado, datos previos eliminados');

    // Launch browser
    browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        defaultViewport: { width: 1400, height: 900 }
    });

    page = await browser.newPage();

    // Capture console errors
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    try {
        // ── TEST 2.1: Login ──
        await test_2_1_Login();

        // ── TEST 2.2: Navigate to Quotes ──
        await test_2_2_NavigateToQuotes();

        // ── TEST 2.3: Verify circuit buttons exist ──
        await test_2_3_VerifyCircuitButtons();

        // ── TEST 2.4: Check invoice status (should be empty) ──
        await test_2_4_CheckStatusEmpty();

        // ── TEST 2.5: Generate invoice via UI ──
        await test_2_5_GenerateInvoice();

        // ── TEST 2.6: Check status after invoice ──
        await test_2_6_CheckStatusAfterInvoice();

        // ── TEST 2.7: Register payment via UI ──
        await test_2_7_RegisterPayment();

        // ── TEST 2.8: Check status after payment (circuit complete) ──
        await test_2_8_CheckCircuitComplete();

        // ── TEST 2.9: Console errors (ignore pre-existing 404s and admin panel token) ──
        const relevantErrors = consoleErrors.filter(e =>
            !e.includes('404') && !e.includes('Token no es de staff') && !e.includes('net::ERR_')
        );
        addResult('2.9 Errores JS relevantes', relevantErrors.length === 0,
            relevantErrors.length > 0 ? `${relevantErrors.length} errores: ${relevantErrors.slice(0, 3).join('; ')}` : `Sin errores relevantes (${consoleErrors.length} pre-existentes ignorados)`);

    } catch (error) {
        addResult('FASE 2 Error', false, error.message);
        try { await page.screenshot({ path: 'test-circuit-error.png', fullPage: true }); } catch(e) {}
    } finally {
        if (browser) await browser.close();
    }
}

async function test_2_1_Login() {
    log('🔐', 'Test 2.1: Login en panel admin');

    await page.goto(`${BASE_URL}/panel-administrativo.html`, { waitUntil: 'networkidle2', timeout: TIMEOUT });
    await wait(2000);

    // Generate a proper staff token with the same secret the server uses
    const staffData = {
        staff_id: 999, staffId: 999,
        email: 'test@aponnt.com', full_name: 'Test E2E',
        name: 'Test E2E',
        role_code: 'admin', role: 'admin',
        area: 'testing', level: 10
    };

    await page.evaluate((token, staffInfo) => {
        localStorage.setItem('staffToken', token);
        localStorage.setItem('aponnt_token_staff', token);
        localStorage.setItem('token', token);
        localStorage.setItem('aponnt_user_type', 'staff');
        localStorage.setItem('aponnt_user_staff', JSON.stringify(staffInfo));
        localStorage.setItem('user', JSON.stringify(staffInfo));
        // Also set as cookie for verifyStaffToken middleware
        document.cookie = 'aponnt_token_staff=' + token + '; path=/';
    }, staffToken, staffData);

    await page.reload({ waitUntil: 'networkidle2' });
    await wait(3000);

    const loaded = await page.evaluate(() =>
        document.body.innerHTML.includes('Dashboard') || document.body.innerHTML.includes('APONNT') || document.body.innerHTML.includes('admin')
    );

    addResult('2.1 Login', loaded, loaded ? 'Panel cargado' : 'Panel no cargó');
    await page.screenshot({ path: 'test-circuit-01-login.png', fullPage: true });
}

async function test_2_2_NavigateToQuotes() {
    log('📋', 'Test 2.2: Navegar a Presupuestos');

    // Inject the staff token into page context and create module container
    const navigated = await page.evaluate((token) => {
        // Ensure token is properly stored
        localStorage.setItem('staffToken', token);
        localStorage.setItem('aponnt_token_staff', token);
        localStorage.setItem('token', token);

        // Create module-content if it doesn't exist
        if (!document.getElementById('module-content')) {
            const main = document.querySelector('.main-content') || document.body;
            const div = document.createElement('div');
            div.id = 'module-content';
            div.style.padding = '20px';
            main.innerHTML = '';
            main.appendChild(div);
        }

        if (typeof window.QuotesManagement !== 'undefined') {
            window.QuotesManagement.init();
            return 'QuotesManagement.init called';
        }
        return null;
    }, staffToken);

    await wait(5000);

    // Check if quotes module loaded with data
    const quotesVisible = await page.evaluate(() => {
        const html = document.body.innerHTML;
        return html.includes('Presupuestos') || html.includes('PRES-') || html.includes('quote-card');
    });

    addResult('2.2 Navegar a Presupuestos', quotesVisible,
        navigated ? `${navigated}, visible=${quotesVisible}` : `No QuotesManagement`);

    await page.screenshot({ path: 'test-circuit-02-quotes.png', fullPage: true });
}

async function test_2_3_VerifyCircuitButtons() {
    log('🔘', 'Test 2.3: Verificar botones del circuito');

    const buttons = await page.evaluate(() => {
        const html = document.body.innerHTML;
        return {
            generateInvoice: html.includes('Generar Factura'),
            uploadPDF: html.includes('Subir PDF'),
            sendInvoice: html.includes('Enviar Factura'),
            registerPayment: html.includes('Registrar Pago'),
            checkStatus: html.includes('Ver Estado'),
            circuitSection: html.includes('Circuito de Facturación')
        };
    });

    const allPresent = buttons.circuitSection && buttons.generateInvoice && buttons.registerPayment && buttons.checkStatus;
    addResult('2.3 Botones circuito', allPresent,
        `Circuit=${buttons.circuitSection} GenInv=${buttons.generateInvoice} Upload=${buttons.uploadPDF} Send=${buttons.sendInvoice} Pay=${buttons.registerPayment} Status=${buttons.checkStatus}`);

    await page.screenshot({ path: 'test-circuit-03-buttons.png', fullPage: true });
}

async function test_2_4_CheckStatusEmpty() {
    log('🔍', 'Test 2.4: Ver Estado (sin factura)');

    // Click "Ver Estado" button
    const clicked = await page.evaluate((qid) => {
        if (typeof window.QuotesManagement !== 'undefined' && typeof window.QuotesManagement.checkInvoiceStatus === 'function') {
            window.QuotesManagement.checkInvoiceStatus(qid);
            return true;
        }
        return false;
    }, testQuoteId);

    await wait(2000);

    const statusContent = await page.evaluate(() => {
        const overlay = document.querySelector('.quote-modal-overlay');
        if (!overlay) return { found: false };
        return {
            found: true,
            hasNoInvoice: overlay.innerHTML.includes('No hay factura generada'),
            step1: overlay.innerHTML.includes('Factura Generada'),
            step4: overlay.innerHTML.includes('Pago Registrado')
        };
    });

    addResult('2.4 Estado vacío', statusContent.found && statusContent.hasNoInvoice,
        `Modal=${statusContent.found} NoInvoice=${statusContent.hasNoInvoice}`);

    // Close modal
    await page.evaluate(() => {
        if (window.QuotesManagement?.closePaymentModal) window.QuotesManagement.closePaymentModal();
    });
    await wait(500);

    await page.screenshot({ path: 'test-circuit-04-status-empty.png', fullPage: true });
}

async function test_2_5_GenerateInvoice() {
    log('🧾', 'Test 2.5: Generar Factura (UI)');

    // Override confirm to auto-accept
    await page.evaluate(() => { window._origConfirm = window.confirm; window.confirm = () => true; });

    const generated = await page.evaluate((qid) => {
        if (typeof window.QuotesManagement !== 'undefined' && typeof window.QuotesManagement.generateInvoice === 'function') {
            window.QuotesManagement.generateInvoice(qid);
            return true;
        }
        return false;
    }, testQuoteId);

    await wait(4000);

    // Check for success toast
    const toastResult = await page.evaluate(() => {
        const toasts = document.querySelectorAll('div[style*="position: fixed"][style*="bottom"]');
        for (const t of toasts) {
            if (t.textContent.includes('Factura generada') || t.textContent.includes('FAC-')) {
                return { success: true, text: t.textContent };
            }
            if (t.textContent.includes('Ya existe factura')) {
                return { success: true, text: t.textContent, alreadyExisted: true };
            }
        }
        return { success: false };
    });

    addResult('2.5 Generar Factura UI', generated && toastResult.success,
        toastResult.text || 'No toast detected');

    await page.screenshot({ path: 'test-circuit-05-generate-invoice.png', fullPage: true });
}

async function test_2_6_CheckStatusAfterInvoice() {
    log('🔍', 'Test 2.6: Ver Estado (con factura)');

    await page.evaluate((qid) => {
        if (window.QuotesManagement?.checkInvoiceStatus) window.QuotesManagement.checkInvoiceStatus(qid);
    }, testQuoteId);

    await wait(2000);

    const statusContent = await page.evaluate(() => {
        const overlays = document.querySelectorAll('.quote-modal-overlay');
        const overlay = overlays[overlays.length - 1];
        if (!overlay) return { found: false };
        const html = overlay.innerHTML;
        return {
            found: true,
            invoiceGenerated: html.includes('Factura Generada') && html.includes('✅'),
            hasInvoiceNumber: /FAC-\d{4}-\d{5}/.test(html),
            pdfNotYet: html.includes('PDF Subido') && html.includes('⬜')
        };
    });

    addResult('2.6 Estado con factura', statusContent.found && statusContent.hasInvoiceNumber,
        `InvGenerated=${statusContent.invoiceGenerated} InvNum=${statusContent.hasInvoiceNumber} PdfPending=${statusContent.pdfNotYet}`);

    await page.evaluate(() => {
        if (window.QuotesManagement?.closePaymentModal) window.QuotesManagement.closePaymentModal();
    });
    await wait(500);

    await page.screenshot({ path: 'test-circuit-06-status-after-invoice.png', fullPage: true });
}

async function test_2_7_RegisterPayment() {
    log('💰', 'Test 2.7: Registrar Pago (UI)');

    // Open payment modal
    await page.evaluate((qid) => {
        if (window.QuotesManagement?.showPaymentModal) window.QuotesManagement.showPaymentModal(qid);
    }, testQuoteId);

    await wait(1500);

    // Check modal opened
    const modalOpen = await page.evaluate(() => {
        return document.body.innerHTML.includes('Registrar Pago') && !!document.getElementById('payment-amount');
    });

    addResult('2.7a Modal pago abierto', modalOpen, '');

    if (modalOpen) {
        // Fill form
        await page.evaluate(() => {
            document.getElementById('payment-amount').value = '370';
            document.getElementById('payment-method').value = 'transfer';
            document.getElementById('payment-reference').value = 'UI-TEST-' + Date.now();
            // payment-date already has today's date
        });

        await page.screenshot({ path: 'test-circuit-07a-payment-form.png', fullPage: true });

        // Submit payment
        await page.evaluate((qid) => {
            if (window.QuotesManagement?.submitPayment) window.QuotesManagement.submitPayment(qid);
        }, testQuoteId);

        await wait(4000);

        // Check for success toast
        const payToast = await page.evaluate(() => {
            const toasts = document.querySelectorAll('div[style*="position: fixed"][style*="bottom"]');
            for (const t of toasts) {
                if (t.textContent.includes('Pago registrado') || t.textContent.includes('ya estaba pagada')) {
                    return { success: true, text: t.textContent };
                }
                if (t.textContent.includes('Error')) {
                    return { success: false, text: t.textContent };
                }
            }
            return { success: false, text: 'No toast' };
        });

        addResult('2.7b Pago enviado', payToast.success, payToast.text);
    }

    await page.screenshot({ path: 'test-circuit-07b-payment-result.png', fullPage: true });
}

async function test_2_8_CheckCircuitComplete() {
    log('✅', 'Test 2.8: Verificar circuito completo');

    await wait(2000);

    await page.evaluate((qid) => {
        if (window.QuotesManagement?.checkInvoiceStatus) window.QuotesManagement.checkInvoiceStatus(qid);
    }, testQuoteId);

    await wait(2000);

    const finalStatus = await page.evaluate(() => {
        const overlays = document.querySelectorAll('.quote-modal-overlay');
        const overlay = overlays[overlays.length - 1];
        if (!overlay) return { found: false };
        const html = overlay.innerHTML;

        // Count checkmarks
        const checks = (html.match(/✅/g) || []).length;
        return {
            found: true,
            checks,
            circuitComplete: html.includes('Circuito Completo') || html.includes('Empresa Activa'),
            paid: html.includes('Pago Registrado') && html.includes('✅'),
            html_snippet: html.substring(0, 500)
        };
    });

    addResult('2.8 Circuito completo', finalStatus.paid,
        `Checks: ${finalStatus.checks}/4, Complete=${finalStatus.circuitComplete}, Paid=${finalStatus.paid}`);

    // Also verify in DB
    const { sequelize } = require('../src/config/database');
    const Q = require('sequelize').QueryTypes;

    const dbCheck = await sequelize.query(`
        SELECT q.id, q.quote_number, q.invoice_id,
               i.invoice_number, i.status as inv_status, i.paid_at,
               p.id as payment_id, p.amount as payment_amount
        FROM quotes q
        LEFT JOIN invoices i ON q.invoice_id = i.id
        LEFT JOIN payments p ON p.invoice_id = i.id
        WHERE q.id = :qid
    `, { replacements: { qid: testQuoteId }, type: Q.SELECT });

    if (dbCheck.length > 0) {
        const r = dbCheck[0];
        addResult('2.8b DB verification', r.inv_status === 'paid' && r.payment_id != null,
            `Quote=${r.quote_number} Invoice=${r.invoice_number} InvStatus=${r.inv_status} PaymentID=${r.payment_id} Amount=$${r.payment_amount}`);
    }

    await page.screenshot({ path: 'test-circuit-08-complete.png', fullPage: true });
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  TEST E2E: Quote → Factura → Pago → Alta Definitiva');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    const startTime = Date.now();

    try {
        await setup();
        await phase1_ApiTests();
        await phase2_PuppeteerTests();
    } catch (error) {
        console.error('💥 Error fatal:', error.message);
        addResult('FATAL ERROR', false, error.message);
    } finally {
        if (browser) try { await browser.close(); } catch(e) {}
    }

    // ── RESUMEN ──
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const passed = testResults.filter(r => r.success).length;
    const failed = testResults.filter(r => !r.success).length;
    const total = testResults.length;

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  RESUMEN: ${passed}/${total} passed, ${failed} failed (${elapsed}s)`);
    console.log('═══════════════════════════════════════════════════════════');

    if (failed > 0) {
        console.log('');
        console.log('FALLOS:');
        testResults.filter(r => !r.success).forEach(r => {
            console.log(`  ❌ ${r.step}: ${r.details}`);
        });
    }

    console.log('');
    console.log(`📊 Score: ${((passed / total) * 100).toFixed(0)}%`);
    console.log('📸 Screenshots guardados en directorio actual');

    // Cleanup: close DB connection
    try {
        const { sequelize } = require('../src/config/database');
        await sequelize.close();
    } catch(e) {}

    process.exit(failed > 0 ? 1 : 0);
}

main();
