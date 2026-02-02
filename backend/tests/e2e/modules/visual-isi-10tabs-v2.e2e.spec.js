/**
 * Visual Testing V2 - ISI Company - 10 Tabs con Scroll
 * Empresa: ISI, Usuario: admin, Password: admin123
 * Incluye scroll para capturar contenido completo de modales largos
 */
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:9998';

test.describe('Visual Testing ISI V2 - 10 Tabs con Scroll', () => {

    test('Capturar 10 tabs con scroll completo', async ({ page }) => {
        // Configurar viewport grande para capturar más contenido
        await page.setViewportSize({ width: 1920, height: 1080 });

        // 1. Ir al panel empresa
        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/isi-v2-00-login.png', fullPage: true });

        // 2. Login - Click en dropdown de empresa primero
        console.log('🔐 Haciendo login en ISI...');

        // Click en el dropdown de empresa
        const empresaDropdown = page.locator('text=Seleccionar Empresa').first();
        await empresaDropdown.click();
        await page.waitForTimeout(500);

        // Escribir ISI para filtrar
        await page.keyboard.type('isi');
        await page.waitForTimeout(500);

        // Click en la opción ISI o presionar Enter
        const isiOption = page.locator('text=ISI, [data-value="isi"], .option:has-text("ISI")').first();
        if (await isiOption.isVisible({ timeout: 1000 }).catch(() => false)) {
            await isiOption.click();
        } else {
            await page.keyboard.press('Enter');
        }
        await page.waitForTimeout(500);

        // Llenar usuario y password
        await page.fill('input[placeholder*="usuario"], input[placeholder*="Usuario"]', 'admin');
        await page.fill('input[type="password"]', 'admin123');

        await page.screenshot({ path: 'test-results/isi-v2-01-login-filled.png', fullPage: true });

        // Click en Iniciar Sesión
        await page.click('button:has-text("Iniciar")');
        await page.waitForTimeout(5000);
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'test-results/isi-v2-02-dashboard.png', fullPage: true });

        // 3. Navegar a módulo Users
        console.log('📂 Navegando a módulo Users...');
        await page.click('text=Usuarios').catch(() => {});
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/isi-v2-03-users-list.png', fullPage: true });

        // 4. Abrir expediente del primer usuario
        console.log('👤 Abriendo expediente de usuario...');

        // Buscar cualquier fila clickeable en la tabla de usuarios
        const firstUserRow = page.locator('table tbody tr').first();
        if (await firstUserRow.isVisible({ timeout: 2000 }).catch(() => false)) {
            await firstUserRow.click();
        }
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/isi-v2-04-expediente.png', fullPage: true });

        // 5. Función auxiliar para capturar tab con scroll
        async function captureTabWithScroll(tabName, tabLabel, filePrefix) {
            console.log(`📸 Capturando Tab: ${tabLabel}`);

            // Intentar click en el tab
            try {
                const tabButton = page.locator(`button:has-text("${tabLabel}")`).first();
                if (await tabButton.isVisible({ timeout: 1000 }).catch(() => false)) {
                    await tabButton.click();
                } else {
                    // Método alternativo via JS
                    await page.evaluate((name) => {
                        if (typeof showFileTab === 'function') {
                            showFileTab(name, null);
                        }
                    }, tabName);
                }
                await page.waitForTimeout(2000);
            } catch (e) {
                console.log(`   ⚠️ Error clickeando tab: ${e.message}`);
            }

            // Captura principal (fullPage captura todo el contenido con scroll)
            await page.screenshot({ path: `test-results/${filePrefix}-full.png`, fullPage: true });

            // Intentar hacer scroll dentro del modal/tab content y capturar secciones
            const tabContent = page.locator(`#${tabName}-tab, [id$="${tabName}-tab"]`).first();
            if (await tabContent.isVisible({ timeout: 500 }).catch(() => false)) {
                // Scroll al inicio
                await tabContent.evaluate(el => el.scrollTop = 0);
                await page.waitForTimeout(300);
                await page.screenshot({ path: `test-results/${filePrefix}-top.png` });

                // Scroll al medio
                await tabContent.evaluate(el => el.scrollTop = el.scrollHeight / 2);
                await page.waitForTimeout(300);
                await page.screenshot({ path: `test-results/${filePrefix}-mid.png` });

                // Scroll al final
                await tabContent.evaluate(el => el.scrollTop = el.scrollHeight);
                await page.waitForTimeout(300);
                await page.screenshot({ path: `test-results/${filePrefix}-bottom.png` });
            }

            console.log(`   ✅ ${tabLabel} capturado`);
        }

        // 6. Capturar los 10 tabs
        const tabs = [
            { name: 'admin', label: 'Administración', prefix: 'isi-v2-tab01-admin' },
            { name: 'personal', label: 'Datos Personales', prefix: 'isi-v2-tab02-personal' },
            { name: 'work', label: 'Antecedentes Laborales', prefix: 'isi-v2-tab03-work' },
            { name: 'family', label: 'Grupo Familiar', prefix: 'isi-v2-tab04-family' },
            { name: 'medical', label: 'Antecedentes Médicos', prefix: 'isi-v2-tab05-medical' },
            { name: 'attendance', label: 'Asistencias', prefix: 'isi-v2-tab06-attendance' },
            { name: 'calendar', label: 'Calendario', prefix: 'isi-v2-tab07-calendar' },
            { name: 'disciplinary', label: 'Disciplinarios', prefix: 'isi-v2-tab08-disciplinary' },
            { name: 'biometric', label: 'Biométrico', prefix: 'isi-v2-tab09-biometric' },
            { name: 'notifications', label: 'Notificaciones', prefix: 'isi-v2-tab10-notifications' }
        ];

        for (const tab of tabs) {
            await captureTabWithScroll(tab.name, tab.label, tab.prefix);
        }

        console.log('✅ Visual Testing V2 completado - 10 tabs con scroll');
    });
});
