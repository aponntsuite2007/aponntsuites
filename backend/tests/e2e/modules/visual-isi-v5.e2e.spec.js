/**
 * Visual Testing V5 - ISI - IDs exactos del formulario
 * #companySelect, #userInput, #passwordInput
 */
const { test, expect } = require('@playwright/test');

test.describe('Visual Testing ISI V5', () => {

    test('10 tabs completos', async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 768 });

        // 1. Login
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForTimeout(3000); // Esperar carga de empresas

        console.log('🔐 Login ISI...');

        // Esperar a que el select tenga opciones
        await page.waitForFunction(() => {
            const select = document.getElementById('companySelect');
            return select && select.options.length > 1;
        }, { timeout: 10000 });

        // Seleccionar ISI
        await page.selectOption('#companySelect', 'isi');
        await page.waitForTimeout(1000);

        // Ahora los campos deben habilitarse
        await page.fill('#userInput', 'admin');
        await page.fill('#passwordInput', 'admin123');
        await page.screenshot({ path: 'test-results/isi-v5-01-login.png' });

        // Click login
        await page.click('#loginButton');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'test-results/isi-v5-02-post-login.png', fullPage: true });

        // 2. Verificar si entramos al dashboard
        const isLoggedIn = await page.locator('text=Usuarios, .sidebar, .dashboard-container').first().isVisible({ timeout: 3000 }).catch(() => false);

        if (!isLoggedIn) {
            console.log('⚠️ Login puede haber fallado. Intentando navegar directamente...');
            await page.screenshot({ path: 'test-results/isi-v5-02b-login-status.png', fullPage: true });
        }

        // 3. Navegar a Users
        console.log('📂 Navegando a Users...');
        await page.click('text=Usuarios').catch(() => {});
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/isi-v5-03-users.png', fullPage: true });

        // 4. Click en primer usuario
        console.log('👤 Abriendo expediente...');
        await page.click('table tbody tr').catch(() => {});
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/isi-v5-04-expediente.png', fullPage: true });

        // 5. Capturar 10 tabs
        const tabs = ['admin', 'personal', 'work', 'family', 'medical', 'attendance', 'calendar', 'disciplinary', 'biometric', 'notifications'];

        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            const num = String(i + 1).padStart(2, '0');
            console.log(`📸 Tab ${num}: ${tab}`);

            await page.evaluate((t) => {
                if (typeof showFileTab === 'function') showFileTab(t, null);
            }, tab);
            await page.waitForTimeout(2000);
            await page.screenshot({ path: `test-results/isi-v5-tab${num}-${tab}.png`, fullPage: true });
        }

        console.log('✅ Completado');
    });
});
