/**
 * Visual Testing - ISI Company - 10 Tabs del Expediente Usuario
 * Empresa: ISI, Usuario: admin, Password: admin123
 */
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:9998';

test.describe('Visual Testing ISI - 10 Tabs', () => {

    test('Capturar 10 tabs del expediente de usuario en ISI', async ({ page }) => {
        // 1. Ir al panel empresa
        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'test-results/isi-00-login-page.png', fullPage: true });

        // 2. Login con ISI
        console.log('🔐 Haciendo login en ISI...');
        await page.fill('#companySlug, input[name="companySlug"], #empresa', 'isi');
        await page.fill('#username, input[name="username"], #usuario', 'admin');
        await page.fill('#password, input[name="password"], #clave', 'admin123');

        // Click en botón login
        await page.click('button[type="submit"], #loginBtn, .btn-login, button:has-text("Iniciar"), button:has-text("Login"), button:has-text("Entrar")');
        await page.waitForTimeout(4000);
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'test-results/isi-01-dashboard.png', fullPage: true });

        // 3. Navegar a módulo Users
        console.log('📂 Navegando a módulo Users...');

        // Intentar múltiples selectores para el módulo Users
        const usersSelectors = [
            'text=Usuarios',
            'text=Users',
            '[data-module="users"]',
            'a:has-text("Usuarios")',
            '.sidebar-item:has-text("Usuarios")',
            '[onclick*="users"]'
        ];

        for (const selector of usersSelectors) {
            try {
                const element = page.locator(selector).first();
                if (await element.isVisible({ timeout: 1000 })) {
                    await element.click();
                    console.log(`   ✅ Clicked: ${selector}`);
                    break;
                }
            } catch (e) { }
        }

        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/isi-02-users-module.png', fullPage: true });

        // 4. Abrir expediente del primer usuario
        console.log('👤 Abriendo expediente de usuario...');

        // Buscar una fila de usuario clickeable
        const userRowSelectors = [
            'tr[onclick*="openUser"]',
            'tr[onclick*="viewUser"]',
            '.user-row',
            '.users-table-row',
            'table tbody tr:first-child',
            '.btn-view',
            'button:has-text("Ver")',
            '[onclick*="openUserFile"]'
        ];

        for (const selector of userRowSelectors) {
            try {
                const element = page.locator(selector).first();
                if (await element.isVisible({ timeout: 1000 })) {
                    await element.click();
                    console.log(`   ✅ Clicked user: ${selector}`);
                    break;
                }
            } catch (e) { }
        }

        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/isi-03-expediente-opened.png', fullPage: true });

        // 5. Capturar los 10 tabs
        const tabs = [
            { name: 'admin', label: 'Administración', file: 'isi-tab-01-admin.png' },
            { name: 'personal', label: 'Datos Personales', file: 'isi-tab-02-personal.png' },
            { name: 'work', label: 'Antecedentes Laborales', file: 'isi-tab-03-work.png' },
            { name: 'family', label: 'Grupo Familiar', file: 'isi-tab-04-family.png' },
            { name: 'medical', label: 'Antecedentes Médicos', file: 'isi-tab-05-medical.png' },
            { name: 'attendance', label: 'Asistencias', file: 'isi-tab-06-attendance.png' },
            { name: 'calendar', label: 'Calendario', file: 'isi-tab-07-calendar.png' },
            { name: 'disciplinary', label: 'Disciplinarios', file: 'isi-tab-08-disciplinary.png' },
            { name: 'biometric', label: 'Biométrico', file: 'isi-tab-09-biometric.png' },
            { name: 'notifications', label: 'Notificaciones', file: 'isi-tab-10-notifications.png' }
        ];

        for (const tab of tabs) {
            console.log(`📸 Tab ${tab.label}...`);

            // Intentar click en el tab
            try {
                // Método 1: Por texto parcial
                const tabBtn = page.locator(`button:has-text("${tab.label}")`).first();
                if (await tabBtn.isVisible({ timeout: 500 })) {
                    await tabBtn.click();
                    await page.waitForTimeout(1500);
                } else {
                    // Método 2: Por onclick
                    await page.evaluate((tabName) => {
                        const btn = document.querySelector(`[onclick*="showFileTab('${tabName}"]`);
                        if (btn) btn.click();
                        else if (typeof showFileTab === 'function') {
                            showFileTab(tabName, null);
                        }
                    }, tab.name);
                    await page.waitForTimeout(1500);
                }
            } catch (e) {
                console.log(`   ⚠️ No se pudo clickear tab ${tab.name}: ${e.message}`);
            }

            await page.screenshot({ path: `test-results/${tab.file}`, fullPage: true });
            console.log(`   ✅ Screenshot: ${tab.file}`);
        }

        console.log('✅ Visual Testing completado - 10 tabs capturados');
    });
});
