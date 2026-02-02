/**
 * Visual Testing V6 - ISI - Usando evaluate con dispatchEvent
 */
const { test, expect } = require('@playwright/test');

test.describe('Visual Testing ISI V6', () => {

    test('10 tabs completos con login correcto', async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 768 });

        // 1. Ir al login
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForLoadState('domcontentloaded');

        // Esperar a que las empresas carguen
        await page.waitForSelector('#companySelect option:not([value=""])', { state: 'attached', timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1000);

        console.log('🔐 Seleccionando ISI y haciendo login...');

        // Seleccionar ISI usando evaluate con dispatchEvent
        const isiSelected = await page.evaluate(() => {
            const select = document.querySelector('#companySelect');
            if (!select) return false;
            const options = Array.from(select.options);
            const isiOption = options.find(o => o.value === 'isi' || o.text.toLowerCase().includes('isi'));
            if (isiOption) {
                select.value = isiOption.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
            return false;
        });

        console.log(`   ISI seleccionado: ${isiSelected}`);
        await page.waitForTimeout(1000);

        // Llenar credenciales
        await page.fill('#userInput', 'admin');
        await page.waitForTimeout(300);
        await page.fill('#passwordInput', 'admin123');
        await page.waitForTimeout(300);

        await page.screenshot({ path: 'test-results/isi-v6-01-filled.png' });

        // Click login
        await page.click('#loginButton');
        await page.waitForTimeout(5000);

        // Verificar login exitoso
        const token = await page.evaluate(() => localStorage.getItem('authToken'));
        console.log(`   Token: ${token ? 'OBTENIDO' : 'NO ENCONTRADO'}`);

        await page.screenshot({ path: 'test-results/isi-v6-02-post-login.png', fullPage: true });

        // 2. Navegar a Users via JavaScript
        console.log('📂 Navegando a módulo Users...');
        await page.evaluate(() => {
            if (typeof showModuleContent === 'function') {
                showModuleContent('users', 'Usuarios');
            }
        });
        await page.waitForTimeout(4000);

        await page.screenshot({ path: 'test-results/isi-v6-03-users.png', fullPage: true });

        // 3. Abrir expediente del primer usuario
        console.log('👤 Abriendo expediente...');

        // Obtener primer usuario y abrirlo via JS
        const userOpened = await page.evaluate(() => {
            const rows = document.querySelectorAll('table tbody tr');
            if (rows.length > 0) {
                rows[0].click();
                return true;
            }
            // Alternativa: llamar directamente a la función
            if (typeof viewUser === 'function') {
                const firstBtn = document.querySelector('[onclick*="viewUser"], [onclick*="openUser"]');
                if (firstBtn) {
                    firstBtn.click();
                    return true;
                }
            }
            return false;
        });

        console.log(`   Expediente abierto: ${userOpened}`);
        await page.waitForTimeout(3000);

        await page.screenshot({ path: 'test-results/isi-v6-04-expediente.png', fullPage: true });

        // 4. Capturar los 10 tabs
        const tabs = [
            { name: 'admin', label: '⚙️ Administración' },
            { name: 'personal', label: '👤 Datos Personales' },
            { name: 'work', label: '💼 Antecedentes Laborales' },
            { name: 'family', label: '👨‍👩‍👧‍👦 Grupo Familiar' },
            { name: 'medical', label: '🏥 Antecedentes Médicos' },
            { name: 'attendance', label: '📅 Asistencias/Permisos' },
            { name: 'calendar', label: '📆 Calendario' },
            { name: 'disciplinary', label: '⚖️ Disciplinarios' },
            { name: 'biometric', label: '📸 Registro Biométrico' },
            { name: 'notifications', label: '🔔 Notificaciones' }
        ];

        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            const num = String(i + 1).padStart(2, '0');
            console.log(`📸 Tab ${num}: ${tab.label}`);

            await page.evaluate((tabName) => {
                if (typeof showFileTab === 'function') {
                    showFileTab(tabName, null);
                }
            }, tab.name);

            await page.waitForTimeout(2000);

            await page.screenshot({
                path: `test-results/isi-v6-tab${num}-${tab.name}.png`,
                fullPage: true
            });
        }

        console.log('✅ Visual Testing V6 completado');
    });
});
