/**
 * Visual Testing - Módulo Gestión de Usuarios - 10 Tabs Completos
 * Captura screenshots de cada tab del expediente de usuario
 */
const { test, expect } = require('@playwright/test');

test.describe('Visual Testing - Users Module - 10 Tabs', () => {

    test.beforeEach(async ({ page }) => {
        // Login to ISI company
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForLoadState('networkidle');

        // Fill login form
        await page.fill('#companySlug', 'isi');
        await page.fill('#username', 'admin');
        await page.fill('#password', 'admin123');

        // Click login button
        await page.click('button[type="submit"], #loginBtn, .btn-login');

        // Wait for dashboard to load
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');
    });

    test('Capturar los 10 tabs del expediente de usuario', async ({ page }) => {
        // Screenshot inicial del dashboard
        await page.screenshot({ path: 'test-results/users-00-dashboard.png', fullPage: true });

        // Navigate to Users module
        const usersLink = page.locator('text=Usuarios, text=Users, [data-module="users"]').first();
        if (await usersLink.isVisible()) {
            await usersLink.click();
        } else {
            // Try sidebar navigation
            await page.click('text=Gestión de Personal >> visible=true').catch(() => {});
            await page.waitForTimeout(500);
            await page.click('text=Usuarios >> visible=true').catch(() => {});
        }

        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/users-01-list.png', fullPage: true });

        // Click on first user to open expediente
        const userRow = page.locator('tr[onclick*="openUser"], .user-row, .users-table-row').first();
        if (await userRow.isVisible()) {
            await userRow.click();
        } else {
            // Try clicking on user name or view button
            await page.click('.btn-view, [onclick*="openUserFile"], [onclick*="viewUser"]').catch(() => {});
        }

        await page.waitForTimeout(2000);

        // Define the 10 tabs to test
        const tabs = [
            { name: 'admin', label: 'Administración', file: 'users-02-tab1-admin.png' },
            { name: 'personal', label: 'Datos Personales', file: 'users-03-tab2-personal.png' },
            { name: 'work', label: 'Antecedentes Laborales', file: 'users-04-tab3-work.png' },
            { name: 'family', label: 'Grupo Familiar', file: 'users-05-tab4-family.png' },
            { name: 'medical', label: 'Antecedentes Médicos', file: 'users-06-tab5-medical.png' },
            { name: 'attendance', label: 'Asistencias/Permisos', file: 'users-07-tab6-attendance.png' },
            { name: 'calendar', label: 'Calendario', file: 'users-08-tab7-calendar.png' },
            { name: 'disciplinary', label: 'Disciplinarios', file: 'users-09-tab8-disciplinary.png' },
            { name: 'biometric', label: 'Registro Biométrico', file: 'users-10-tab9-biometric.png' },
            { name: 'notifications', label: 'Notificaciones', file: 'users-11-tab10-notifications.png' }
        ];

        // Capture each tab
        for (const tab of tabs) {
            console.log(`📸 Capturing tab: ${tab.label}`);

            // Click on tab button
            const tabButton = page.locator(`button:has-text("${tab.label}"), [onclick*="showFileTab('${tab.name}"]`).first();

            if (await tabButton.isVisible().catch(() => false)) {
                await tabButton.click();
                await page.waitForTimeout(1500);
            } else {
                // Alternative: try by tab name
                await page.evaluate((tabName) => {
                    if (typeof showFileTab === 'function') {
                        showFileTab(tabName, document.querySelector(`[onclick*="${tabName}"]`));
                    }
                }, tab.name).catch(() => {});
                await page.waitForTimeout(1500);
            }

            // Take screenshot
            await page.screenshot({ path: `test-results/${tab.file}`, fullPage: true });
        }

        console.log('✅ All 10 tabs captured successfully');
    });
});
