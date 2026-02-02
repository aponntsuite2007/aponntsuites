/**
 * COMPREHENSIVE MODULE TEST - All 46 modules
 * Visual testing with screenshots + element detection
 * Company: ISI, User: admin, Password: admin123
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ALL 46 modules from the system
const ALL_MODULES = [
    // Batch 1 - RRHH Core
    { id: 'sanctions-management', name: 'Sanctions Management', category: 'RRHH' },
    { id: 'vacation-management', name: 'Vacation Management', category: 'RRHH' },
    { id: 'training-management', name: 'Training Management', category: 'RRHH' },
    { id: 'medical-dashboard', name: 'Medical Dashboard', category: 'RRHH' },
    { id: 'art-management', name: 'ART Management', category: 'RRHH' },
    { id: 'hse-management', name: 'HSE Management', category: 'RRHH' },

    // Batch 2 - Access & Visitors
    { id: 'kiosks', name: 'Kiosks', category: 'Access' },
    { id: 'visitors', name: 'Visitors', category: 'Access' },
    { id: 'job-postings', name: 'Job Postings', category: 'Recruitment' },
    { id: 'payroll-liquidation', name: 'Payroll Liquidation', category: 'Finance' },
    { id: 'organizational-structure', name: 'Org Structure', category: 'Admin' },
    { id: 'benefits-management', name: 'Benefits', category: 'RRHH' },

    // Batch 3 - Core + Legal
    { id: 'attendance', name: 'Attendance', category: 'Core' },
    { id: 'quotes-management', name: 'Quotes', category: 'Sales' },
    { id: 'legal-dashboard', name: 'Legal Dashboard', category: 'Legal' },
    { id: 'notifications-enterprise', name: 'Notifications', category: 'System' },
    { id: 'biometric-dashboard', name: 'Biometric Dashboard', category: 'Biometric' },
    { id: 'procedures-manual', name: 'Procedures Manual', category: 'Admin' },

    // Batch 4
    { id: 'users', name: 'Users', category: 'Core' },
    { id: 'hour-bank', name: 'Hour Bank', category: 'RRHH' },
    { id: 'facturacion', name: 'Facturacion', category: 'Finance' },
    { id: 'plantillas-fiscales', name: 'Plantillas Fiscales', category: 'Finance' },
    { id: 'company-email-smtp-config', name: 'Email SMTP Config', category: 'System' },
    { id: 'company-email-process', name: 'Email Process', category: 'System' },

    // Batch 5
    { id: 'inbox', name: 'Inbox', category: 'Communication' },
    { id: 'logistics-dashboard', name: 'Logistics', category: 'Operations' },
    { id: 'employee-map', name: 'Employee Map', category: 'Visualization' },
    { id: 'associate-marketplace', name: 'Marketplace', category: 'HR' },
    { id: 'audit-reports', name: 'Audit Reports', category: 'Compliance' },
    { id: 'compliance-dashboard', name: 'Compliance', category: 'Compliance' },

    // Batch 6
    { id: 'sla-tracking', name: 'SLA Tracking', category: 'Operations' },
    { id: 'auditor-dashboard', name: 'Auditor Dashboard', category: 'System' },
    { id: 'settings', name: 'Settings', category: 'System' },
    { id: 'roles-permissions', name: 'Roles & Permissions', category: 'Admin' },
    { id: 'clientes', name: 'Clientes', category: 'Sales' },
    { id: 'my-procedures', name: 'My Procedures', category: 'User' },

    // Batch 7
    { id: 'payslip-template-editor', name: 'Payslip Template Editor', category: 'Finance' },
    { id: 'contextual-help', name: 'Contextual Help', category: 'System' },
    { id: 'terms-conditions', name: 'Terms & Conditions', category: 'Legal' },
    { id: 'dashboard', name: 'Dashboard', category: 'Core' },
    { id: 'predictive-workforce', name: 'Predictive Workforce', category: 'Analytics' },
    { id: 'emotional-analysis', name: 'Emotional Analysis', category: 'Analytics' },

    // Batch 8
    { id: 'psychological-assessment', name: 'Psychological Assessment', category: 'RRHH' },
    { id: 'training', name: 'Training Module', category: 'RRHH' },
    { id: 'biometric-simple', name: 'Biometric Simple', category: 'Biometric' },
    { id: 'biometric-consent', name: 'Biometric Consent', category: 'Biometric' }
];

async function main() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     COMPREHENSIVE MODULE TEST - 46 Modules                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Ensure screenshot directory exists
    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: { width: 1400, height: 1000 },
        args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    page.on('dialog', async d => await d.accept());

    const results = {
        timestamp: new Date().toISOString(),
        company: 'isi',
        totalModules: ALL_MODULES.length,
        loaded: 0,
        failed: 0,
        withCreateBtn: 0,
        modules: {},
        byCategory: {}
    };

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
        console.log('   ✅ Login OK\n');

        // === TEST EACH MODULE ===
        for (let i = 0; i < ALL_MODULES.length; i++) {
            const mod = ALL_MODULES[i];
            const num = String(i + 1).padStart(2, '0');
            console.log(`\n[${num}/${ALL_MODULES.length}] 📦 ${mod.name} (${mod.id})`);

            const modResult = {
                id: mod.id,
                name: mod.name,
                category: mod.category,
                loaded: false,
                hasCreateBtn: false,
                createBtnText: null,
                tables: 0,
                cards: 0,
                buttons: 0,
                inputs: 0,
                error: null
            };

            try {
                // Navigate to module
                await page.evaluate((modId) => {
                    if (window.showTab) window.showTab(modId);
                    else if (window.showModuleContent) window.showModuleContent(modId);
                }, mod.id);
                await sleep(2500);

                // Check if content loaded
                const hasContent = await page.evaluate(() => {
                    const content = document.querySelector('#mainContent');
                    if (!content) return false;
                    // Check if there's meaningful content (not just loading)
                    const text = content.innerText || '';
                    return text.length > 50 && !text.includes('Cargando');
                });

                if (hasContent) {
                    modResult.loaded = true;
                    results.loaded++;

                    // Screenshot
                    const screenshotPath = path.join(SCREENSHOT_DIR, `module-${num}-${mod.id}.png`);
                    await page.screenshot({ path: screenshotPath, fullPage: true });
                    console.log(`   📸 Screenshot guardado`);

                    // Detect elements
                    const elements = await page.evaluate(() => {
                        const content = document.querySelector('#mainContent');
                        if (!content) return {};

                        // Find create button
                        const createTexts = ['agregar', 'nuevo', 'crear', '+', 'nueva', 'registrar', 'añadir'];
                        let createBtn = null;
                        const buttons = content.querySelectorAll('button, .btn, a.btn');
                        for (const btn of buttons) {
                            const text = (btn.textContent || '').toLowerCase().trim();
                            if (createTexts.some(t => text.includes(t)) && text.length < 40) {
                                createBtn = btn.textContent.trim().substring(0, 30);
                                break;
                            }
                        }

                        return {
                            hasCreateBtn: !!createBtn,
                            createBtnText: createBtn,
                            tables: content.querySelectorAll('table').length,
                            cards: content.querySelectorAll('.card').length,
                            buttons: buttons.length,
                            inputs: content.querySelectorAll('input, select, textarea').length
                        };
                    });

                    Object.assign(modResult, elements);

                    if (elements.hasCreateBtn) {
                        results.withCreateBtn++;
                        console.log(`   ✅ Botón crear: "${elements.createBtnText}"`);
                    } else {
                        console.log(`   ⚠️ Sin botón crear (dashboard o read-only)`);
                    }

                    console.log(`   📊 Tables: ${elements.tables}, Cards: ${elements.cards}, Buttons: ${elements.buttons}`);
                } else {
                    console.log(`   ⚠️ Contenido no cargó o está vacío`);
                    modResult.error = 'Content not loaded';
                    results.failed++;

                    await page.screenshot({
                        path: path.join(SCREENSHOT_DIR, `module-${num}-${mod.id}-error.png`),
                        fullPage: true
                    });
                }

            } catch (err) {
                console.log(`   ❌ Error: ${err.message}`);
                modResult.error = err.message;
                results.failed++;
            }

            results.modules[mod.id] = modResult;

            // Update category stats
            if (!results.byCategory[mod.category]) {
                results.byCategory[mod.category] = { total: 0, loaded: 0, withCreateBtn: 0 };
            }
            results.byCategory[mod.category].total++;
            if (modResult.loaded) results.byCategory[mod.category].loaded++;
            if (modResult.hasCreateBtn) results.byCategory[mod.category].withCreateBtn++;
        }

        // === SUMMARY ===
        console.log('\n\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                    RESUMEN FINAL                             ║');
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log(`║   📦 Total módulos:     ${results.totalModules}                                     ║`);
        console.log(`║   ✅ Cargados OK:       ${results.loaded}                                     ║`);
        console.log(`║   ❌ Errores:           ${results.failed}                                      ║`);
        console.log(`║   🔘 Con botón crear:   ${results.withCreateBtn}                                     ║`);
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log('║   📊 POR CATEGORÍA:                                          ║');

        Object.entries(results.byCategory).forEach(([cat, stats]) => {
            console.log(`║   ${cat.padEnd(20)}: ${stats.loaded}/${stats.total} loaded, ${stats.withCreateBtn} CRUD ║`);
        });

        console.log('╚════════════════════════════════════════════════════════════╝');

        // Save results
        const resultsPath = path.join(SCREENSHOT_DIR, 'all-modules-results.json');
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        console.log(`\n📁 Resultados guardados en: ${resultsPath}`);

    } catch (err) {
        console.error('❌ Error fatal:', err.message);
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'all-modules-fatal-error.png'),
            fullPage: true
        });
    } finally {
        await browser.close();
    }
}

main();
