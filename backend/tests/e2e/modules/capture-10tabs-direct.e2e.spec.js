/**
 * Direct capture of 10 tabs using E2E service token
 * Bypasses rate limiting for testing
 */
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:9998';
const SERVICE_TOKEN = process.env.E2E_SERVICE_TOKEN;

test.describe('Users 10 Tabs - Direct Capture', () => {

    test('Capture all 10 tabs with service token', async ({ page }) => {
        console.log('🔐 Using E2E Service Token...');
        console.log(`   Token: ${SERVICE_TOKEN ? 'Loaded' : 'NOT FOUND'}`);

        // 1. Go to panel-empresa and set token directly
        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('domcontentloaded');

        // Set token in localStorage to bypass login
        await page.evaluate((token) => {
            localStorage.setItem('authToken', token);
            localStorage.setItem('token', token);
            // Parse token to get company info
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                localStorage.setItem('userData', JSON.stringify({
                    id: payload.id,
                    role: payload.role,
                    companyId: payload.companyId,
                    companySlug: payload.companySlug
                }));
                localStorage.setItem('companyId', payload.companyId);
                localStorage.setItem('companySlug', payload.companySlug);
            } catch (e) {
                console.log('Error parsing token:', e);
            }
        }, SERVICE_TOKEN);

        // Reload to apply token
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // 2. Navigate to Users module
        console.log('📂 Navigating to Users module...');
        await page.evaluate(() => {
            if (typeof showModuleContent === 'function') {
                showModuleContent('users', 'Usuarios');
            }
        });
        await page.waitForTimeout(4000);

        // Check if we're in the right module
        const hasUsersTable = await page.locator('.users-table, table').first().isVisible().catch(() => false);
        console.log(`   Users table visible: ${hasUsersTable}`);

        await page.screenshot({ path: 'test-results/direct-01-users-module.png', fullPage: true });

        // 3. Find and open first user expediente
        console.log('👤 Opening user expediente...');

        const firstUserId = await page.evaluate(() => {
            const btn = document.querySelector('[onclick*="viewUser"], [onclick*="editUser"]');
            if (btn) {
                const onclick = btn.getAttribute('onclick');
                const match = onclick.match(/(?:viewUser|editUser)\(['"]([^'"]+)['"]\)/);
                return match ? match[1] : null;
            }
            return null;
        });

        console.log(`   First user ID: ${firstUserId ? firstUserId.substring(0, 8) + '...' : 'not found'}`);

        if (firstUserId) {
            await page.evaluate((uid) => {
                if (typeof viewUser === 'function') viewUser(uid);
                else if (typeof editUser === 'function') editUser(uid);
            }, firstUserId);
        } else {
            // Click first row in table
            await page.click('table tbody tr').catch(() => {});
        }

        await page.waitForTimeout(3000);

        // Check if modal is open
        const modalOpen = await page.evaluate(() => {
            const fileModal = document.querySelector('#employeeFileModal');
            if (fileModal && fileModal.style.display !== 'none') return true;
            const editModal = document.querySelector('#editUserModal');
            return editModal && editModal.classList.contains('show');
        });

        console.log(`   Modal open: ${modalOpen}`);

        await page.screenshot({ path: 'test-results/direct-02-expediente.png', fullPage: true });

        // 4. Capture all 10 tabs
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

            await page.waitForTimeout(1500);

            // Capture with fullPage to get scrollable content
            await page.screenshot({
                path: `test-results/direct-tab${num}-${tab.id}.png`,
                fullPage: true
            });

            console.log(`   ✅ Captured: direct-tab${num}-${tab.id}.png`);
        }

        console.log('✅ All 10 tabs captured!');
    });
});
