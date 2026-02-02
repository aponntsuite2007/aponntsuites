/**
 * Test visual detallado del módulo Users - Ver los 10 tabs
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: { width: 1400, height: 900 },
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
        console.log('✅ Login OK');

        // Navegar a Users
        console.log('📦 Navegando a Users...');
        await page.evaluate(() => window.showTab && window.showTab('users'));
        await sleep(3000);

        // Buscar un usuario real (no Test E2E) para ver su expediente
        console.log('🔍 Buscando usuario para abrir expediente...');

        // Click en el botón "Ver" del primer usuario que tenga un nombre real
        const viewBtnClicked = await page.evaluate(() => {
            const rows = document.querySelectorAll('#mainContent table tbody tr');
            for (const row of rows) {
                const nameCell = row.querySelector('td:first-child');
                const name = nameCell?.textContent || '';
                // Buscar usuario que no sea Test E2E
                if (!name.includes('Test E2E') && name.length > 3) {
                    const viewBtn = row.querySelector('button[onclick*="ver"], button[onclick*="Ver"], .btn-info, button[title*="Ver"]');
                    if (viewBtn) {
                        viewBtn.click();
                        return { clicked: true, name };
                    }
                    // Buscar cualquier botón de acción
                    const anyBtn = row.querySelector('td:last-child button');
                    if (anyBtn) {
                        anyBtn.click();
                        return { clicked: true, name };
                    }
                }
            }
            // Si no encuentra, click en el primer botón de ver disponible
            const firstViewBtn = document.querySelector('#mainContent table tbody tr button');
            if (firstViewBtn) {
                firstViewBtn.click();
                return { clicked: true, name: 'first available' };
            }
            return { clicked: false };
        });

        console.log(`   Resultado: ${JSON.stringify(viewBtnClicked)}`);
        await sleep(3000);

        // Screenshot del modal abierto
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'tabs-01-users-module.png'),
            fullPage: true
        });
        console.log('📸 tabs-01-users-module.png');

        // Buscar tabs en el modal
        const tabsInfo = await page.evaluate(() => {
            // Buscar dentro de modales o el contenido principal
            const modal = document.querySelector('.modal.show, .modal[style*="display: block"]');
            const container = modal || document.querySelector('#mainContent');

            if (!container) return { error: 'No container found' };

            // Buscar tabs de diferentes formas
            const navTabs = container.querySelectorAll('.nav-tabs .nav-link, .nav-pills .nav-link, [role="tab"], .tab-link');
            const tabs = Array.from(navTabs).map((t, i) => ({
                index: i,
                text: t.textContent.trim(),
                id: t.id || t.getAttribute('data-bs-target') || t.getAttribute('href') || '',
                active: t.classList.contains('active')
            }));

            return {
                modalFound: !!modal,
                tabCount: tabs.length,
                tabs
            };
        });

        console.log(`📑 Tabs encontrados: ${JSON.stringify(tabsInfo, null, 2)}`);

        // Si hay tabs, navegar por cada uno
        if (tabsInfo.tabs && tabsInfo.tabs.length > 0) {
            for (let i = 0; i < tabsInfo.tabs.length; i++) {
                const tab = tabsInfo.tabs[i];
                console.log(`\n   Tab ${i+1}: ${tab.text}`);

                await page.evaluate((idx) => {
                    const modal = document.querySelector('.modal.show, .modal[style*="display: block"]');
                    const container = modal || document.querySelector('#mainContent');
                    const tabs = container.querySelectorAll('.nav-tabs .nav-link, .nav-pills .nav-link, [role="tab"], .tab-link');
                    if (tabs[idx]) tabs[idx].click();
                }, i);

                await sleep(1500);

                const screenshotName = `tabs-${String(i+2).padStart(2, '0')}-${tab.text.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '-')}.png`;
                await page.screenshot({
                    path: path.join(SCREENSHOT_DIR, screenshotName),
                    fullPage: true
                });
                console.log(`   📸 ${screenshotName}`);
            }
        } else {
            console.log('⚠️ No se encontraron tabs. Verificando si el expediente se abrió...');

            // Tal vez necesitemos hacer click en el ícono de ojo (ver expediente)
            const expedienteOpened = await page.evaluate(() => {
                // Buscar botones con ícono de ojo
                const eyeButtons = document.querySelectorAll('button i.fa-eye, button .bi-eye, button[title*="expediente"], button[onclick*="expediente"]');
                if (eyeButtons.length > 0) {
                    eyeButtons[0].closest('button')?.click();
                    return true;
                }
                return false;
            });

            if (expedienteOpened) {
                console.log('   Abriendo expediente...');
                await sleep(3000);
                await page.screenshot({
                    path: path.join(SCREENSHOT_DIR, 'tabs-02-expediente-opened.png'),
                    fullPage: true
                });
            }
        }

        console.log('\n✅ Test completado');

    } catch (err) {
        console.error('❌ Error:', err);
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'tabs-error.png'),
            fullPage: true
        });
    } finally {
        await browser.close();
    }
}

main();
