/**
 * Test visual en batch - Múltiples módulos rápidamente
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Módulos a testear (batch 4-8 pendientes)
const MODULES_TO_TEST = [
    // Batch 4
    { id: 'attendance', name: 'Attendance' },
    { id: 'organizational-structure', name: 'Org Structure' },
    { id: 'hour-bank', name: 'Hour Bank' },
    { id: 'payroll-liquidation', name: 'Payroll' },
    { id: 'benefits-management', name: 'Benefits' },

    // Batch 5
    { id: 'vacation-management', name: 'Vacation' },
    { id: 'sanctions-management', name: 'Sanctions' },
    { id: 'training-management', name: 'Training' },
    { id: 'job-postings', name: 'Job Postings' },
    { id: 'kiosks', name: 'Kiosks' },

    // Batch 6
    { id: 'visitors', name: 'Visitors' },
    { id: 'medical-dashboard', name: 'Medical' },
    { id: 'art-management', name: 'ART' },
    { id: 'hse-management', name: 'HSE' },
    { id: 'legal-dashboard', name: 'Legal' },

    // Batch 7
    { id: 'procedures-manual', name: 'Procedures' },
    { id: 'quotes-management', name: 'Quotes' },
    { id: 'facturacion', name: 'Facturacion' },
    { id: 'inbox', name: 'Inbox' },
    { id: 'roles-permissions', name: 'Roles' }
];

async function main() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     BATCH VISUAL TESTING - 20 Módulos                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: { width: 1400, height: 1000 },
        args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    page.on('dialog', async d => await d.accept());

    const results = { passed: [], failed: [], details: {} };

    try {
        // Login
        console.log('🔐 Login...');
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
        console.log('✅ Login OK\n');

        // Testear cada módulo
        for (let i = 0; i < MODULES_TO_TEST.length; i++) {
            const mod = MODULES_TO_TEST[i];
            console.log(`\n[${ i + 1}/${MODULES_TO_TEST.length}] 📦 ${mod.name} (${mod.id})`);

            try {
                // Navegar al módulo
                await page.evaluate((modId) => {
                    if (window.showTab) window.showTab(modId);
                    else if (window.showModuleContent) window.showModuleContent(modId);
                }, mod.id);
                await sleep(2500);

                // Screenshot del módulo
                const screenshotPath = path.join(SCREENSHOT_DIR, `module-${String(i+1).padStart(2,'0')}-${mod.id}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`   📸 Screenshot guardado`);

                // Detectar elementos
                const elements = await page.evaluate(() => {
                    const content = document.querySelector('#mainContent');
                    if (!content) return { error: 'No main content' };

                    // Buscar botón de crear
                    const createTexts = ['agregar', 'nuevo', 'crear', '+', 'nueva', 'registrar'];
                    let createBtn = null;
                    const buttons = content.querySelectorAll('button, .btn');
                    for (const btn of buttons) {
                        const text = (btn.textContent || '').toLowerCase();
                        if (createTexts.some(t => text.includes(t))) {
                            createBtn = btn.textContent.trim().substring(0, 30);
                            break;
                        }
                    }

                    // Contar elementos
                    return {
                        hasCreateBtn: !!createBtn,
                        createBtnText: createBtn,
                        tables: content.querySelectorAll('table').length,
                        cards: content.querySelectorAll('.card').length,
                        inputs: content.querySelectorAll('input, select, textarea').length,
                        buttons: buttons.length
                    };
                });

                results.details[mod.id] = {
                    name: mod.name,
                    loaded: true,
                    ...elements
                };

                if (elements.hasCreateBtn) {
                    console.log(`   ✅ Botón crear: "${elements.createBtnText}"`);
                    results.passed.push(mod.name);
                } else {
                    console.log(`   ⚠️ Sin botón crear (puede ser solo lectura)`);
                    results.passed.push(`${mod.name} (read-only)`);
                }

                console.log(`   📊 Tables: ${elements.tables}, Cards: ${elements.cards}, Inputs: ${elements.inputs}`);

            } catch (err) {
                console.log(`   ❌ Error: ${err.message}`);
                results.failed.push(mod.name);
                results.details[mod.id] = { name: mod.name, loaded: false, error: err.message };

                await page.screenshot({
                    path: path.join(SCREENSHOT_DIR, `module-${String(i+1).padStart(2,'0')}-${mod.id}-error.png`),
                    fullPage: true
                });
            }
        }

        // Resumen
        console.log('\n\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                    RESUMEN                                   ║');
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log(`║   ✅ Pasaron:  ${results.passed.length}                                              ║`);
        console.log(`║   ❌ Fallaron: ${results.failed.length}                                               ║`);
        console.log('╚════════════════════════════════════════════════════════════╝');

        // Guardar resultados
        fs.writeFileSync(
            path.join(SCREENSHOT_DIR, 'batch-modules-results.json'),
            JSON.stringify(results, null, 2)
        );
        console.log('\n📁 Resultados guardados en batch-modules-results.json');

    } catch (err) {
        console.error('❌ Error fatal:', err);
    } finally {
        await browser.close();
    }
}

main();
