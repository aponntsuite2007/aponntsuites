/**
 * Test visual de los 10 tabs del expediente de usuario
 */

const puppeteer = require('puppeteer');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TABS = [
    'Administración',
    'Datos Personales',
    'Antecedentes Laborales',
    'Grupo Familiar',
    'Antecedentes Médicos',
    'Asistencias/Permisos',
    'Calendario',
    'Disciplinarios',
    'Registro Biométrico',
    'Notificaciones'
];

async function main() {
    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: { width: 1400, height: 1200 },
        args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    page.on('dialog', async d => await d.accept());

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

        // Navegar a Users
        console.log('📦 Navegando a Users...');
        await page.evaluate(() => window.showTab && window.showTab('users'));
        await sleep(3000);

        // Abrir expediente del primer usuario con nombre real
        console.log('🔍 Abriendo expediente...');
        await page.evaluate(() => {
            const rows = document.querySelectorAll('#mainContent table tbody tr');
            for (const row of rows) {
                const name = row.querySelector('td:first-child')?.textContent || '';
                if (!name.includes('Test E2E') && name.length > 3) {
                    // Buscar el botón de ver (ojo)
                    const btns = row.querySelectorAll('td:last-child button');
                    for (const btn of btns) {
                        const icon = btn.querySelector('i');
                        if (icon && (icon.className.includes('eye') || icon.className.includes('user'))) {
                            btn.click();
                            return true;
                        }
                    }
                    // Click en primer botón si no encuentra ojo
                    if (btns[0]) {
                        btns[0].click();
                        return true;
                    }
                }
            }
            // Fallback: primer usuario
            const firstBtn = document.querySelector('#mainContent table tbody tr td:last-child button');
            if (firstBtn) firstBtn.click();
            return true;
        });
        await sleep(3000);

        // Screenshot inicial
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'quick-10tabs-inicial.png'),
            fullPage: true
        });
        console.log('📸 quick-10tabs-inicial.png');

        // Navegar por cada tab
        for (let i = 0; i < TABS.length; i++) {
            const tabName = TABS[i];
            console.log(`\n📑 Tab ${i+1}/10: ${tabName}`);

            // Click en el tab por texto
            const clicked = await page.evaluate((name) => {
                // Buscar todos los elementos que puedan ser tabs
                const allTabs = document.querySelectorAll('.nav-link, [role="tab"], .tab-link, button');
                for (const tab of allTabs) {
                    const text = tab.textContent.trim();
                    if (text.includes(name) || text === name) {
                        tab.click();
                        return { clicked: true, text };
                    }
                }
                // Buscar por texto parcial
                for (const tab of allTabs) {
                    const text = tab.textContent.trim().toLowerCase();
                    if (text.includes(name.toLowerCase().split('/')[0])) {
                        tab.click();
                        return { clicked: true, text: tab.textContent.trim() };
                    }
                }
                return { clicked: false };
            }, tabName);

            if (clicked.clicked) {
                console.log(`   ✅ Click en: "${clicked.text}"`);
            } else {
                console.log(`   ⚠️ Tab no encontrado`);
            }

            await sleep(2000);

            // Screenshot del tab
            const screenshotName = `quick-10tabs-${String(i+1).padStart(2, '0')}-${tabName.split('/')[0].toLowerCase().replace(/\s+/g, '-')}.png`;
            await page.screenshot({
                path: path.join(SCREENSHOT_DIR, screenshotName),
                fullPage: true
            });
            console.log(`   📸 ${screenshotName}`);

            // Extraer información del tab actual
            const tabInfo = await page.evaluate(() => {
                const content = document.querySelector('.tab-pane.active, .tab-content > .active, #mainContent');
                if (!content) return { error: 'No content' };

                const inputs = content.querySelectorAll('input, select, textarea');
                const buttons = content.querySelectorAll('button');
                const tables = content.querySelectorAll('table');
                const cards = content.querySelectorAll('.card');

                return {
                    inputCount: inputs.length,
                    buttonCount: buttons.length,
                    tableCount: tables.length,
                    cardCount: cards.length,
                    inputNames: Array.from(inputs).slice(0, 10).map(i => i.name || i.id || i.placeholder || 'unnamed')
                };
            });

            console.log(`   📊 Inputs: ${tabInfo.inputCount}, Buttons: ${tabInfo.buttonCount}, Tables: ${tabInfo.tableCount}`);
            if (tabInfo.inputNames && tabInfo.inputNames.length > 0) {
                console.log(`   📝 Campos: ${tabInfo.inputNames.slice(0, 5).join(', ')}`);
            }
        }

        console.log('\n\n✅ Testing de 10 tabs completado');
        console.log('📁 Screenshots en: ' + SCREENSHOT_DIR);

    } catch (err) {
        console.error('❌ Error:', err.message);
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'quick-10tabs-error.png'),
            fullPage: true
        });
    } finally {
        await browser.close();
    }
}

main();
