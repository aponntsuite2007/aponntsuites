/**
 * Visual Testing V3 - ISI Company - 10 Tabs con Scroll
 * Login: Seleccionar ISI del dropdown -> admin -> admin123
 */
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:9998';

test.describe('Visual Testing ISI V3', () => {

    test('Capturar 10 tabs completos', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });

        // 1. Ir al panel empresa
        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // 2. Login - Click en dropdown y seleccionar ISI
        console.log('🔐 Login ISI...');

        // Click en "Seleccionar Empresa..."
        await page.click('text=Seleccionar Empresa');
        await page.waitForTimeout(1000);

        // Click directamente en ISI (está visible en el dropdown)
        await page.click('text=ISI >> nth=0');
        await page.waitForTimeout(1000);

        // Ahora los campos deben estar habilitados - llenar
        await page.fill('#userInput', 'admin');
        await page.fill('input[type="password"]', 'admin123');

        await page.screenshot({ path: 'test-results/isi-v3-01-login-filled.png' });

        // Click en Iniciar Sesión
        await page.click('button:has-text("Iniciar")');
        await page.waitForTimeout(5000);
        await page.waitForLoadState('networkidle');

        await page.screenshot({ path: 'test-results/isi-v3-02-dashboard.png', fullPage: true });

        // 3. Navegar a módulo Users
        console.log('📂 Navegando a Users...');
        await page.click('text=Usuarios').catch(async () => {
            // Si no encuentra "Usuarios", buscar en el menú
            await page.click('[data-module="users"]').catch(() => {});
        });
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/isi-v3-03-users-list.png', fullPage: true });

        // 4. Abrir expediente del primer usuario en la tabla
        console.log('👤 Abriendo expediente...');

        // Buscar primer usuario en la tabla
        const userRow = page.locator('table tbody tr').first();
        await userRow.click().catch(async () => {
            // Alternativa: buscar botón ver
            await page.click('.btn-view, [onclick*="openUser"]').catch(() => {});
        });
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/isi-v3-04-expediente.png', fullPage: true });

        // 5. Capturar los 10 tabs con scroll
        const tabs = [
            { name: 'admin', label: 'Administración' },
            { name: 'personal', label: 'Datos Personales' },
            { name: 'work', label: 'Antecedentes Laborales' },
            { name: 'family', label: 'Grupo Familiar' },
            { name: 'medical', label: 'Antecedentes Médicos' },
            { name: 'attendance', label: 'Asistencias' },
            { name: 'calendar', label: 'Calendario' },
            { name: 'disciplinary', label: 'Disciplinarios' },
            { name: 'biometric', label: 'Biométrico' },
            { name: 'notifications', label: 'Notificaciones' }
        ];

        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            const num = String(i + 1).padStart(2, '0');
            console.log(`📸 Tab ${num}: ${tab.label}`);

            try {
                // Click en el tab
                const tabBtn = page.locator(`button.file-tab:has-text("${tab.label}")`).first();
                if (await tabBtn.isVisible({ timeout: 500 }).catch(() => false)) {
                    await tabBtn.click();
                } else {
                    // Usar JavaScript directamente
                    await page.evaluate((tabName) => {
                        if (typeof showFileTab === 'function') {
                            showFileTab(tabName, null);
                        }
                    }, tab.name);
                }
                await page.waitForTimeout(2000);
            } catch (e) {
                console.log(`   ⚠️ Error: ${e.message}`);
            }

            // Captura fullPage (incluye todo el contenido scrolleable)
            await page.screenshot({
                path: `test-results/isi-v3-tab${num}-${tab.name}-full.png`,
                fullPage: true
            });

            // Captura adicional: scroll dentro del modal y capturar secciones
            const modalContent = page.locator('.file-tab-content:visible, #expediente-modal .modal-body').first();
            if (await modalContent.isVisible({ timeout: 500 }).catch(() => false)) {
                // Scroll top
                await modalContent.evaluate(el => el.scrollTop = 0);
                await page.waitForTimeout(200);
                await page.screenshot({ path: `test-results/isi-v3-tab${num}-${tab.name}-scroll-top.png` });

                // Scroll 33%
                await modalContent.evaluate(el => el.scrollTop = el.scrollHeight * 0.33);
                await page.waitForTimeout(200);
                await page.screenshot({ path: `test-results/isi-v3-tab${num}-${tab.name}-scroll-33.png` });

                // Scroll 66%
                await modalContent.evaluate(el => el.scrollTop = el.scrollHeight * 0.66);
                await page.waitForTimeout(200);
                await page.screenshot({ path: `test-results/isi-v3-tab${num}-${tab.name}-scroll-66.png` });

                // Scroll bottom
                await modalContent.evaluate(el => el.scrollTop = el.scrollHeight);
                await page.waitForTimeout(200);
                await page.screenshot({ path: `test-results/isi-v3-tab${num}-${tab.name}-scroll-bottom.png` });
            }

            console.log(`   ✅ Capturado`);
        }

        console.log('✅ COMPLETADO - 10 tabs capturados con scroll');
    });
});
