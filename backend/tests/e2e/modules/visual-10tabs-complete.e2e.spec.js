/**
 * Visual Testing - Complete 10 Tabs for User Expediente
 * Uses UI login with proper company selection
 */
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:9998';

test.describe('Visual Testing - 10 Tabs Completo', () => {

    test('Capturar 10 tabs con login UI', async ({ page }) => {
        // Use real screen size
        await page.setViewportSize({ width: 1366, height: 768 });

        console.log('🔐 Iniciando login UI...');

        // 1. Go to login page
        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('domcontentloaded');

        // Wait for companies to load
        await page.waitForSelector('#companySelect option:not([value=""])', {
            state: 'attached',
            timeout: 15000
        }).catch(() => {});
        await page.waitForTimeout(1500);

        // 2. Select company using dispatchEvent (ISI or first available)
        const companySelected = await page.evaluate(() => {
            const select = document.querySelector('#companySelect');
            if (!select) return false;

            const options = Array.from(select.options);
            // Try ISI first
            let option = options.find(o => o.value === 'isi' || o.text.toLowerCase().includes('isi'));
            // Fallback to aponnt
            if (!option) {
                option = options.find(o => o.value.includes('aponnt') || o.text.toLowerCase().includes('aponnt'));
            }
            // Fallback to first non-empty
            if (!option && options.length > 1) {
                option = options[1];
            }

            if (option) {
                select.value = option.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                return { value: option.value, text: option.text };
            }
            return false;
        });

        console.log(`   Empresa seleccionada: ${companySelected ? companySelected.text : 'ninguna'}`);
        await page.waitForTimeout(800);

        // 3. Fill credentials
        const credentials = companySelected && companySelected.value === 'isi'
            ? { user: 'admin', pass: 'admin123' }
            : { user: 'administrador', pass: 'admin123' };

        await page.fill('#userInput', credentials.user);
        await page.waitForTimeout(200);
        await page.fill('#passwordInput', credentials.pass);
        await page.waitForTimeout(200);

        await page.screenshot({ path: 'test-results/visual-00-login.png' });

        // 4. Click login
        await page.click('#loginButton');

        // Wait for dashboard or error
        await page.waitForTimeout(5000);

        // Check if logged in
        const token = await page.evaluate(() => localStorage.getItem('authToken'));
        console.log(`   Token: ${token ? 'OBTENIDO ✅' : 'NO OBTENIDO ❌'}`);

        if (!token) {
            // Check for error message
            const errorMsg = await page.locator('.alert-danger, .error-message').textContent().catch(() => '');
            console.log(`   Error: ${errorMsg}`);
            await page.screenshot({ path: 'test-results/visual-00-login-error.png', fullPage: true });

            // If rate limited, skip test
            if (errorMsg.includes('Demasiados intentos')) {
                console.log('⏳ Rate limited - esperando...');
                test.skip();
                return;
            }
        }

        await page.screenshot({ path: 'test-results/visual-01-dashboard.png', fullPage: true });

        // 5. Navigate to Users module
        console.log('📂 Navegando a módulo Users...');
        await page.evaluate(() => {
            if (typeof showModuleContent === 'function') {
                showModuleContent('users', 'Usuarios');
            }
        });
        await page.waitForTimeout(4000);

        await page.screenshot({ path: 'test-results/visual-02-users-list.png', fullPage: true });

        // 6. Find and open first user
        console.log('👤 Abriendo expediente de usuario...');

        const userId = await page.evaluate(() => {
            const btn = document.querySelector('[onclick*="viewUser"], [onclick*="editUser"]');
            if (btn) {
                const onclick = btn.getAttribute('onclick');
                const match = onclick.match(/(?:viewUser|editUser)\(['"]([^'"]+)['"]\)/);
                return match ? match[1] : null;
            }
            return null;
        });

        if (userId) {
            console.log(`   User ID: ${userId.substring(0, 8)}...`);
            await page.evaluate((uid) => {
                if (typeof viewUser === 'function') viewUser(uid);
                else if (typeof editUser === 'function') editUser(uid);
            }, userId);
        } else {
            // Click first table row
            const firstRow = page.locator('table tbody tr').first();
            if (await firstRow.isVisible().catch(() => false)) {
                await firstRow.click();
            }
        }

        await page.waitForTimeout(3000);

        await page.screenshot({ path: 'test-results/visual-03-expediente.png', fullPage: true });

        // 7. Capture all 10 tabs
        const tabs = [
            { id: 'admin', name: '⚙️ Administración' },
            { id: 'personal', name: '👤 Datos Personales' },
            { id: 'work', name: '💼 Antecedentes Laborales' },
            { id: 'family', name: '👨‍👩‍👧‍👦 Grupo Familiar' },
            { id: 'medical', name: '🏥 Antecedentes Médicos' },
            { id: 'attendance', name: '📅 Asistencias/Permisos' },
            { id: 'calendar', name: '📆 Calendario' },
            { id: 'disciplinary', name: '⚖️ Disciplinarios' },
            { id: 'biometric', name: '📸 Registro Biométrico' },
            { id: 'notifications', name: '🔔 Notificaciones' }
        ];

        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            const num = String(i + 1).padStart(2, '0');

            console.log(`📸 Tab ${num}: ${tab.name}`);

            // Click tab via JavaScript
            await page.evaluate((tabId) => {
                if (typeof showFileTab === 'function') {
                    showFileTab(tabId);
                }
            }, tab.id);

            await page.waitForTimeout(2000);

            // Capture with fullPage for scrollable content
            await page.screenshot({
                path: `test-results/visual-tab${num}-${tab.id}.png`,
                fullPage: true
            });

            console.log(`   ✅ visual-tab${num}-${tab.id}.png`);
        }

        console.log('✅ COMPLETADO - 10 tabs capturados');
    });
});
