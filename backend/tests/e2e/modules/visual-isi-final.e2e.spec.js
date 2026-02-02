/**
 * Visual Testing FINAL - ISI Company - 10 Tabs
 * Viewport normal (1366x768), select nativo, scroll completo
 */
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:9998';

test.describe('Visual Testing ISI Final', () => {

    test('10 tabs con scroll', async ({ page }) => {
        // Viewport tamaño de pantalla real típico
        await page.setViewportSize({ width: 1366, height: 768 });

        // 1. Login
        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        console.log('🔐 Login ISI...');

        // Seleccionar ISI del dropdown nativo
        await page.selectOption('select', { value: 'isi' });
        await page.waitForTimeout(500);

        // Llenar credenciales
        await page.fill('#userInput', 'admin');
        await page.fill('input[type="password"]', 'admin123');

        // Click login
        await page.click('button:has-text("Iniciar")');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'test-results/isi-final-01-dashboard.png', fullPage: true });

        // 2. Navegar a Users
        console.log('📂 Users...');
        await page.click('text=Usuarios').catch(() => {});
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/isi-final-02-users.png', fullPage: true });

        // 3. Abrir expediente
        console.log('👤 Expediente...');
        const row = page.locator('table tbody tr').first();
        await row.click().catch(() => {});
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/isi-final-03-expediente.png', fullPage: true });

        // 4. Los 10 tabs
        const tabs = [
            'admin', 'personal', 'work', 'family', 'medical',
            'attendance', 'calendar', 'disciplinary', 'biometric', 'notifications'
        ];

        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            const num = String(i + 1).padStart(2, '0');
            console.log(`📸 Tab ${num}: ${tab}`);

            // Click tab via JS
            await page.evaluate((t) => {
                if (typeof showFileTab === 'function') showFileTab(t, null);
            }, tab);
            await page.waitForTimeout(2000);

            // Screenshot fullPage (captura todo el scroll)
            await page.screenshot({
                path: `test-results/isi-final-tab${num}-${tab}.png`,
                fullPage: true
            });
        }

        console.log('✅ 10 tabs capturados');
    });
});
