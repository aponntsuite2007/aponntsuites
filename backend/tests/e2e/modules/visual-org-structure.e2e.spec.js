/**
 * Visual Testing - Estructura Organizacional (6 Tabs)
 */
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:9998';

test.describe('Visual Testing - Estructura Organizacional', () => {

    test('Capturar 6 tabs con login ISI', async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 768 });

        console.log('🔐 Login ISI...');
        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForSelector('#companySelect option:not([value=""])', { state: 'attached', timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1500);

        // Seleccionar ISI
        await page.evaluate(() => {
            const select = document.querySelector('#companySelect');
            if (select) {
                const options = Array.from(select.options);
                const isi = options.find(o => o.value === 'isi' || o.text.toLowerCase().includes('isi'));
                if (isi) {
                    select.value = isi.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
        await page.waitForTimeout(800);

        await page.fill('#userInput', 'admin');
        await page.fill('#passwordInput', 'admin123');
        await page.click('#loginButton');
        await page.waitForTimeout(5000);

        const token = await page.evaluate(() => localStorage.getItem('authToken'));
        console.log(`   Token: ${token ? 'OK' : 'FAIL'}`);

        // Navegar a Estructura Organizacional
        console.log('🏢 Navegando a Estructura Organizacional...');
        await page.evaluate(() => {
            if (typeof showModuleContent === 'function') {
                showModuleContent('organizational-structure', 'Estructura Organizacional');
            }
        });
        await page.waitForTimeout(4000);

        await page.screenshot({ path: 'test-results/org-structure-inicial.png', fullPage: true });

        // Capturar cada tab
        const tabs = [
            { id: 'departments', name: '🏢 Departamentos' },
            { id: 'sectors', name: '📁 Sectores' },
            { id: 'agreements', name: '📋 Convenios' },
            { id: 'categories', name: '💰 Categorías' },
            { id: 'shifts', name: '⏰ Turnos' },
            { id: 'roles', name: '👔 Roles' },
            { id: 'orgchart', name: '🌳 Organigrama' },
            { id: 'positions', name: '💼 Puestos' }
        ];

        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            const num = String(i + 1).padStart(2, '0');
            console.log(`📸 Tab ${num}: ${tab.name}`);

            // Click en el tab usando OrgEngine.showTab()
            const clicked = await page.evaluate((tabId) => {
                // Usar OrgEngine.showTab (la función correcta del módulo)
                if (typeof OrgEngine !== 'undefined' && typeof OrgEngine.showTab === 'function') {
                    OrgEngine.showTab(tabId);
                    return true;
                }
                if (typeof window.OrgEngine !== 'undefined') {
                    window.OrgEngine.showTab(tabId);
                    return true;
                }
                // Fallback: buscar botón de tab manualmente y hacer click
                const btn = document.querySelector(`.org-tab[data-tab="${tabId}"]`);
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            }, tab.id);

            await page.waitForTimeout(2000);

            await page.screenshot({
                path: `test-results/org-structure-${num}-${tab.id}.png`,
                fullPage: true
            });

            if (clicked) {
                console.log(`   ✅ org-structure-${num}-${tab.id}.png`);
            } else {
                console.log(`   ⚠️ Tab ${tab.id} no encontrado`);
            }
        }

        console.log('✅ Visual Testing Estructura Organizacional completado');
    });
});
