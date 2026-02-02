/**
 * Visual Testing - Control de Asistencia (6 Views)
 * Dashboard, Records, Analytics, Patterns, Insights, Cubo de Horas
 */
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:9998';

test.describe('Visual Testing - Control de Asistencia', () => {

    test('Capturar 6 vistas con login ISI', async ({ page }) => {
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

        // Navegar a Control de Asistencia
        console.log('📊 Navegando a Control de Asistencia...');
        await page.evaluate(() => {
            if (typeof showModuleContent === 'function') {
                showModuleContent('attendance', 'Control de Asistencia');
            }
        });
        await page.waitForTimeout(4000);

        await page.screenshot({ path: 'test-results/attendance-inicial.png', fullPage: true });

        // Capturar cada vista
        const views = [
            { id: 'dashboard', name: '📊 Dashboard' },
            { id: 'records', name: '📋 Registros' },
            { id: 'analytics', name: '📈 Analytics' },
            { id: 'patterns', name: '🎯 Patterns' },
            { id: 'insights', name: '💡 Insights' },
            { id: 'cubo', name: '🧊 Cubo de Horas' }
        ];

        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            const num = String(i + 1).padStart(2, '0');
            console.log(`📸 View ${num}: ${view.name}`);

            // Click en la vista usando AttendanceEngine.showView()
            const clicked = await page.evaluate((viewId) => {
                if (typeof AttendanceEngine !== 'undefined' && typeof AttendanceEngine.showView === 'function') {
                    AttendanceEngine.showView(viewId);
                    return true;
                }
                if (typeof window.AttendanceEngine !== 'undefined') {
                    window.AttendanceEngine.showView(viewId);
                    return true;
                }
                // Fallback: buscar botón de navegación manualmente
                const btn = document.querySelector(`.att-nav-item[data-view="${viewId}"]`);
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            }, view.id);

            await page.waitForTimeout(3000);

            await page.screenshot({
                path: `test-results/attendance-${num}-${view.id}.png`,
                fullPage: true
            });

            if (clicked) {
                console.log(`   ✅ attendance-${num}-${view.id}.png`);
            } else {
                console.log(`   ⚠️ View ${view.id} no encontrado`);
            }
        }

        console.log('✅ Visual Testing Control de Asistencia completado');
    });
});
