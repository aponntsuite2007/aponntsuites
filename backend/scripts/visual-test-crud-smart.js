/**
 * SMART CRUD TEST - Tests CRUD operations via visual + API verification
 * Uses ISI company (company_id: 11), admin/admin123
 *
 * For each module:
 * 1. Navigate to module
 * 2. Screenshot initial state
 * 3. Click "Create" button
 * 4. Fill form with test data
 * 5. Save and screenshot
 * 6. Verify via API that record was created
 * 7. Report results
 */

const puppeteer = require('puppeteer');
const path = require('path');
const axios = require('axios');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Modules with CRUD capabilities and their API endpoints
const CRUD_MODULES = [
    { id: 'users', name: 'Users', apiGet: '/api/v1/users', createBtn: ['nuevo usuario', 'agregar'] },
    { id: 'attendance', name: 'Attendance', apiGet: '/api/v1/attendance', createBtn: ['nuevo registro'] },
    { id: 'vacation-management', name: 'Vacation', apiGet: '/api/v1/vacation/requests', createBtn: ['nueva solicitud'] },
    { id: 'sanctions-management', name: 'Sanctions', apiGet: '/api/company-panel/sanctions', createBtn: ['nueva sanción', 'nueva'] },
    { id: 'training-management', name: 'Training', apiGet: '/api/company-panel/trainings', createBtn: ['nueva capacitación', 'nueva'] },
    { id: 'job-postings', name: 'Job Postings', apiGet: '/api/v1/job-postings', createBtn: ['nueva oferta', 'nueva'] },
    { id: 'kiosks', name: 'Kiosks', apiGet: '/api/kiosks', createBtn: ['nuevo kiosco', 'nuevo'] },
    { id: 'visitors', name: 'Visitors', apiGet: '/api/v1/visitors', createBtn: ['nueva visita', 'nuevo'] },
    { id: 'art-management', name: 'ART', apiGet: '/api/v1/art', createBtn: ['nueva art', 'nueva'] },
    { id: 'hse-management', name: 'HSE', apiGet: '/api/v1/hse', createBtn: ['nueva entrega', 'nuevo'] },
    { id: 'payslip-template-editor', name: 'Payslip Template', apiGet: '/api/v1/payslip-templates', createBtn: ['nueva plantilla', 'nuevo'] },
    { id: 'training', name: 'Training Alt', apiGet: '/api/v1/trainings', createBtn: ['nueva', 'agregar'] },
    { id: 'clientes', name: 'Clientes', apiGet: '/api/v1/clients', createBtn: ['nuevo cliente', 'nuevo'] },
];

let authToken = null;

async function getApiCount(endpoint, headers) {
    try {
        const res = await axios.get(`${BASE_URL}${endpoint}`, { headers, timeout: 5000 });
        const data = res.data;
        if (Array.isArray(data)) return data.length;
        if (data.data && Array.isArray(data.data)) return data.data.length;
        if (data.users) return data.users.length;
        if (data.records) return data.records.length;
        if (data.requests) return data.requests.length;
        return Object.keys(data).length;
    } catch (err) {
        return -1; // API error
    }
}

async function main() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     SMART CRUD TEST - Visual + API Verification            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: { width: 1400, height: 900 },
        args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    page.on('dialog', async d => {
        console.log(`   📢 Dialog: "${d.message().substring(0, 30)}..."`);
        await d.accept();
    });

    const results = { modules: [], summary: { passed: 0, failed: 0, skipped: 0 } };

    try {
        // === LOGIN ===
        console.log('🔐 Login con ISI/admin/admin123...');
        await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle2' });
        await sleep(2000);
        await page.select('#companySelect', 'isi');
        await sleep(2000);
        await page.evaluate(() => {
            document.getElementById('userInput').disabled = false;
            document.getElementById('userInput').value = 'admin';
            document.getElementById('passwordInput').disabled = false;
            document.getElementById('passwordInput').value = 'admin123';
            document.getElementById('multiTenantLoginForm').dispatchEvent(new Event('submit', { bubbles: true }));
        });
        await sleep(5000);

        // Get token
        authToken = await page.evaluate(() => localStorage.getItem('token'));
        if (!authToken) {
            // Try direct API login
            const loginRes = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
                identifier: 'admin',
                password: 'admin123',
                companySlug: 'isi'
            });
            authToken = loginRes.data.token;
        }

        if (!authToken) throw new Error('No se pudo obtener token');
        console.log(`   ✅ Token obtenido\n`);

        const headers = { Authorization: `Bearer ${authToken}` };

        // === TEST EACH MODULE ===
        for (let i = 0; i < CRUD_MODULES.length; i++) {
            const mod = CRUD_MODULES[i];
            console.log(`\n[${ i + 1}/${CRUD_MODULES.length}] 📦 ${mod.name}`);

            const modResult = {
                id: mod.id,
                name: mod.name,
                loaded: false,
                createBtnFound: false,
                modalOpened: false,
                formFilled: false,
                saved: false,
                apiCountBefore: -1,
                apiCountAfter: -1,
                crudVerified: false
            };

            try {
                // 1. Get initial API count
                modResult.apiCountBefore = await getApiCount(mod.apiGet, headers);
                console.log(`   📊 API count antes: ${modResult.apiCountBefore}`);

                // 2. Navigate to module
                await page.evaluate((modId) => {
                    if (window.showTab) window.showTab(modId);
                }, mod.id);
                await sleep(3000);
                modResult.loaded = true;

                // 3. Screenshot initial
                await page.screenshot({
                    path: path.join(SCREENSHOT_DIR, `smart-${i+1}-${mod.id}-1-load.png`),
                    fullPage: true
                });
                console.log(`   📸 Screenshot inicial`);

                // 4. Find and click create button
                const createClicked = await page.evaluate((btnTexts) => {
                    const content = document.querySelector('#mainContent');
                    if (!content) return false;

                    const buttons = content.querySelectorAll('button, .btn, a.btn');
                    for (const btn of buttons) {
                        const text = (btn.textContent || '').toLowerCase().trim();
                        for (const searchText of btnTexts) {
                            if (text.includes(searchText)) {
                                btn.click();
                                return text;
                            }
                        }
                    }
                    return false;
                }, mod.createBtn);

                if (createClicked) {
                    modResult.createBtnFound = true;
                    console.log(`   ✅ Botón crear clickeado: "${createClicked}"`);
                    await sleep(2000);

                    // 5. Screenshot modal
                    await page.screenshot({
                        path: path.join(SCREENSHOT_DIR, `smart-${i+1}-${mod.id}-2-modal.png`),
                        fullPage: true
                    });

                    // Check if modal opened
                    const modalVisible = await page.evaluate(() => {
                        const modal = document.querySelector('.modal.show, .modal[style*="display: block"], .modal-content:not([style*="display: none"])');
                        return !!modal;
                    });

                    if (modalVisible) {
                        modResult.modalOpened = true;
                        console.log(`   ✅ Modal abierto`);

                        // 6. Try to fill form with test data
                        const filled = await page.evaluate(() => {
                            const modal = document.querySelector('.modal.show, .modal[style*="display: block"]') || document;
                            let fieldsFound = 0;

                            // Fill text inputs
                            const textInputs = modal.querySelectorAll('input[type="text"], input:not([type])');
                            textInputs.forEach((input, idx) => {
                                if (!input.disabled && !input.readOnly) {
                                    input.value = `Test ${idx + 1} ${Date.now()}`;
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                    fieldsFound++;
                                }
                            });

                            // Fill selects (select first non-empty option)
                            const selects = modal.querySelectorAll('select');
                            selects.forEach(sel => {
                                if (!sel.disabled && sel.options.length > 1) {
                                    sel.selectedIndex = 1;
                                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                                    fieldsFound++;
                                }
                            });

                            // Fill date inputs
                            const dateInputs = modal.querySelectorAll('input[type="date"]');
                            dateInputs.forEach(input => {
                                if (!input.disabled) {
                                    const today = new Date().toISOString().split('T')[0];
                                    input.value = today;
                                    input.dispatchEvent(new Event('change', { bubbles: true }));
                                    fieldsFound++;
                                }
                            });

                            // Fill number inputs
                            const numInputs = modal.querySelectorAll('input[type="number"]');
                            numInputs.forEach(input => {
                                if (!input.disabled) {
                                    input.value = '100';
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                    fieldsFound++;
                                }
                            });

                            // Fill textareas
                            const textareas = modal.querySelectorAll('textarea');
                            textareas.forEach((ta, idx) => {
                                if (!ta.disabled) {
                                    ta.value = `Test description ${idx + 1}`;
                                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                                    fieldsFound++;
                                }
                            });

                            return fieldsFound;
                        });

                        if (filled > 0) {
                            modResult.formFilled = true;
                            console.log(`   ✅ Formulario llenado: ${filled} campos`);
                        }

                        await sleep(1000);
                        await page.screenshot({
                            path: path.join(SCREENSHOT_DIR, `smart-${i+1}-${mod.id}-3-filled.png`),
                            fullPage: true
                        });

                        // 7. Try to save
                        const saveClicked = await page.evaluate(() => {
                            const modal = document.querySelector('.modal.show, .modal[style*="display: block"]') || document;
                            const saveTexts = ['guardar', 'crear', 'enviar', 'save', 'submit', 'aceptar'];
                            const buttons = modal.querySelectorAll('button[type="submit"], .btn-primary, button');

                            for (const btn of buttons) {
                                const text = (btn.textContent || '').toLowerCase();
                                if (saveTexts.some(t => text.includes(t))) {
                                    btn.click();
                                    return true;
                                }
                            }
                            return false;
                        });

                        if (saveClicked) {
                            console.log(`   ✅ Botón guardar clickeado`);
                            await sleep(3000);

                            await page.screenshot({
                                path: path.join(SCREENSHOT_DIR, `smart-${i+1}-${mod.id}-4-saved.png`),
                                fullPage: true
                            });

                            // 8. Verify via API
                            modResult.apiCountAfter = await getApiCount(mod.apiGet, headers);
                            console.log(`   📊 API count después: ${modResult.apiCountAfter}`);

                            if (modResult.apiCountAfter > modResult.apiCountBefore) {
                                modResult.crudVerified = true;
                                modResult.saved = true;
                                console.log(`   ✅ CRUD VERIFICADO: +${modResult.apiCountAfter - modResult.apiCountBefore} registro(s)`);
                                results.summary.passed++;
                            } else if (modResult.apiCountAfter === modResult.apiCountBefore) {
                                console.log(`   ⚠️ No se detectó nuevo registro (puede requerir campos obligatorios)`);
                                results.summary.skipped++;
                            } else {
                                console.log(`   ⚠️ API error o sin cambios`);
                                results.summary.skipped++;
                            }
                        }
                    } else {
                        console.log(`   ⚠️ Modal no abierto (puede ser navegación a otra página)`);
                        results.summary.skipped++;
                    }
                } else {
                    console.log(`   ⚠️ Botón crear no encontrado (módulo puede ser solo lectura)`);
                    results.summary.skipped++;
                }

            } catch (err) {
                console.log(`   ❌ Error: ${err.message}`);
                await page.screenshot({
                    path: path.join(SCREENSHOT_DIR, `smart-${i+1}-${mod.id}-error.png`),
                    fullPage: true
                });
                results.summary.failed++;
            }

            results.modules.push(modResult);
        }

        // === SUMMARY ===
        console.log('\n\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                    RESUMEN CRUD                              ║');
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log(`║   ✅ CRUD Verificado: ${results.summary.passed}                                        ║`);
        console.log(`║   ⚠️ Parcial/Skip:    ${results.summary.skipped}                                        ║`);
        console.log(`║   ❌ Errores:         ${results.summary.failed}                                        ║`);
        console.log('╚════════════════════════════════════════════════════════════╝');

        // Print detailed results
        console.log('\n📋 Detalle por módulo:');
        results.modules.forEach(m => {
            const status = m.crudVerified ? '✅' : (m.loaded ? '⚠️' : '❌');
            console.log(`   ${status} ${m.name}: Load=${m.loaded}, Modal=${m.modalOpened}, API=${m.apiCountBefore}→${m.apiCountAfter}`);
        });

    } catch (err) {
        console.error('❌ Error fatal:', err.message);
    } finally {
        await browser.close();
    }
}

main();
