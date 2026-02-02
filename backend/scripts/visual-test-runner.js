/**
 * VISUAL TEST RUNNER - Para Claude Code Multimodal
 *
 * Este script navega, hace login, y toma screenshots que Claude Code
 * analizará visualmente para descubrir elementos y verificar SSOT.
 *
 * Uso:
 * node scripts/visual-test-runner.js [modulo] [accion]
 *
 * Acciones:
 * - login: Solo hace login y screenshot inicial
 * - module: Navega a un módulo y toma screenshot
 * - click: Hace click en selector y screenshot
 * - explore: Navega todo el módulo tomando screenshots
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results');

// Credenciales ISI
const COMPANY = 'isi';
const USERNAME = 'admin';
const PASSWORD = 'admin123';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Asegurar que existe el directorio de screenshots
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function takeScreenshot(page, name) {
    const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 Screenshot: ${filepath}`);
    return filepath;
}

async function login(page) {
    console.log('🔐 Iniciando login...');
    await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Seleccionar empresa
    await page.select('#companySelect', COMPANY);
    await sleep(2000);

    // Llenar credenciales
    await page.evaluate((user, pass) => {
        document.getElementById('userInput').disabled = false;
        document.getElementById('userInput').value = user;
        document.getElementById('passwordInput').disabled = false;
        document.getElementById('passwordInput').value = pass;
    }, USERNAME, PASSWORD);

    await sleep(500);

    // Submit
    await page.evaluate(() => {
        document.getElementById('multiTenantLoginForm').dispatchEvent(new Event('submit', { bubbles: true }));
    });

    await sleep(5000);
    console.log('✅ Login completado');

    return await takeScreenshot(page, 'admin-01-login');
}

async function navigateToModule(page, moduleId) {
    console.log(`📦 Navegando a módulo: ${moduleId}`);

    await page.evaluate((modId) => {
        if (window.showTab) window.showTab(modId);
        else if (window.showModuleContent) window.showModuleContent(modId);
    }, moduleId);

    await sleep(3000);
    return await takeScreenshot(page, `module-${moduleId}`);
}

async function exploreModule(page, moduleId) {
    console.log(`🔍 Explorando módulo: ${moduleId}`);
    const screenshots = [];

    // Screenshot inicial del módulo
    await navigateToModule(page, moduleId);
    screenshots.push(`module-${moduleId}`);

    // Buscar botones de crear
    const createBtnInfo = await page.evaluate(() => {
        const buttons = document.querySelectorAll('#mainContent button, #mainContent .btn');
        const createTexts = ['agregar', 'nuevo', 'crear', '+', 'nueva'];

        for (const btn of buttons) {
            const text = (btn.textContent || '').toLowerCase();
            if (createTexts.some(t => text.includes(t))) {
                return { found: true, text: btn.textContent.trim() };
            }
        }
        return { found: false };
    });

    if (createBtnInfo.found) {
        console.log(`   ✅ Botón crear encontrado: "${createBtnInfo.text}"`);

        // Click para abrir modal
        await page.evaluate(() => {
            const buttons = document.querySelectorAll('#mainContent button, #mainContent .btn');
            const createTexts = ['agregar', 'nuevo', 'crear', '+', 'nueva'];

            for (const btn of buttons) {
                const text = (btn.textContent || '').toLowerCase();
                if (createTexts.some(t => text.includes(t))) {
                    btn.click();
                    return;
                }
            }
        });

        await sleep(2000);
        screenshots.push(await takeScreenshot(page, `${moduleId}-modal-crear`));

        // Cerrar modal
        await page.evaluate(() => {
            const closeBtn = document.querySelector('.modal .btn-close, .modal .close, [aria-label="Close"]');
            if (closeBtn) closeBtn.click();
            document.querySelectorAll('.modal').forEach(m => {
                m.classList.remove('show');
                m.style.display = 'none';
            });
            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        });
        await sleep(500);
    }

    // Buscar tabs si existen
    const tabsInfo = await page.evaluate(() => {
        const tabs = document.querySelectorAll('#mainContent .nav-tabs .nav-link, #mainContent [role="tab"]');
        return Array.from(tabs).map(t => ({
            text: t.textContent.trim(),
            id: t.id || t.getAttribute('data-bs-target') || ''
        }));
    });

    if (tabsInfo.length > 1) {
        console.log(`   📑 Encontrados ${tabsInfo.length} tabs`);

        for (let i = 0; i < Math.min(tabsInfo.length, 8); i++) {
            const tab = tabsInfo[i];
            await page.evaluate((idx) => {
                const tabs = document.querySelectorAll('#mainContent .nav-tabs .nav-link, #mainContent [role="tab"]');
                if (tabs[idx]) tabs[idx].click();
            }, i);
            await sleep(1500);
            screenshots.push(await takeScreenshot(page, `${moduleId}-tab-${i+1}-${tab.text.substring(0,15).replace(/\s/g, '_')}`));
        }
    }

    return screenshots;
}

async function main() {
    const args = process.argv.slice(2);
    const action = args[0] || 'login';
    const moduleId = args[1] || 'users';

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     VISUAL TEST RUNNER - Claude Code Multimodal            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: { width: 1400, height: 900 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Manejar dialogos
    page.on('dialog', async d => {
        console.log(`   📢 Dialog: "${d.message().substring(0, 50)}..."`);
        await d.accept();
    });

    try {
        // Siempre hacer login primero
        await login(page);

        if (action === 'module') {
            await navigateToModule(page, moduleId);
        } else if (action === 'explore') {
            await exploreModule(page, moduleId);
        } else if (action === 'all') {
            // Explorar múltiples módulos
            const modules = [
                'users', 'attendance', 'vacation-management', 'sanctions-management',
                'training-management', 'job-postings', 'hour-bank', 'payroll-liquidation',
                'benefits-management', 'organizational-structure', 'biometric-dashboard',
                'biometric-simple', 'biometric-consent', 'kiosks', 'visitors',
                'medical-dashboard', 'art-management', 'hse-management', 'legal-dashboard',
                'procedures-manual', 'quotes-management', 'facturacion', 'plantillas-fiscales',
                'notifications-enterprise', 'company-email-smtp-config', 'company-email-process',
                'inbox', 'logistics-dashboard', 'employee-map', 'associate-marketplace',
                'audit-reports', 'compliance-dashboard', 'sla-tracking', 'auditor-dashboard',
                'settings', 'roles-permissions', 'clientes', 'my-procedures',
                'payslip-template-editor', 'contextual-help', 'terms-conditions', 'dashboard',
                'predictive-workforce', 'emotional-analysis', 'psychological-assessment', 'training'
            ];

            for (let i = 0; i < modules.length; i++) {
                console.log(`\n${'═'.repeat(50)}`);
                console.log(`📦 [${i+1}/${modules.length}] ${modules[i]}`);
                console.log(`${'═'.repeat(50)}`);

                try {
                    await navigateToModule(page, modules[i]);
                } catch (err) {
                    console.log(`   ❌ Error: ${err.message}`);
                }
                await sleep(1000);
            }
        }

        console.log('\n✅ Testing completado');
        console.log(`📁 Screenshots en: ${SCREENSHOT_DIR}`);

    } catch (err) {
        console.error('❌ Error:', err);
        await takeScreenshot(page, 'error');
    } finally {
        await browser.close();
    }
}

main();
