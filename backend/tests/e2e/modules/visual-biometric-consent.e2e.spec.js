/**
 * Visual Testing - Consentimientos y Privacidad
 * Captura todas las vistas del módulo de consentimientos biométricos
 */
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:9998';

test.describe('Visual Testing - Consentimientos y Privacidad', () => {

    test('Capturar todas las vistas del módulo', async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 768 });

        // ============ LOGIN ============
        console.log('🔐 Login ISI...');
        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

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

        // ============ NAVEGAR A CONSENTIMIENTOS Y PRIVACIDAD ============
        console.log('🔐 Navegando a Consentimientos y Privacidad...');
        await page.evaluate(() => {
            if (typeof showModuleContent === 'function') {
                showModuleContent('biometric-consent', 'Consentimientos y Privacidad');
            }
        });
        await page.waitForTimeout(4000);

        await page.screenshot({ path: 'test-results/consent-01-inicial.png', fullPage: true });

        // ============ EXPLORAR TABS ============
        console.log('📋 Explorando tabs del módulo...');

        // Tab: Empleados y Consentimientos
        const employeesTab = await page.locator('button:has-text("Empleados"), .bc-tab:has-text("Empleados")').first();
        if (await employeesTab.isVisible().catch(() => false)) {
            await employeesTab.click();
            console.log('   ✅ Tab Empleados');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-results/consent-02-empleados.png', fullPage: true });
        }

        // Tab: Documento Legal
        const documentTab = await page.locator('button:has-text("Documento"), .bc-tab:has-text("Documento")').first();
        if (await documentTab.isVisible().catch(() => false)) {
            await documentTab.click();
            console.log('   ✅ Tab Documento Legal');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-results/consent-03-documento.png', fullPage: true });
        }

        // Tab: Regulaciones Multi-País
        const regulationsTab = await page.locator('button:has-text("Regulaciones"), .bc-tab:has-text("Regulaciones")').first();
        if (await regulationsTab.isVisible().catch(() => false)) {
            await regulationsTab.click();
            console.log('   ✅ Tab Regulaciones');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-results/consent-04-regulaciones.png', fullPage: true });
        }

        // Tab: Reportes PDF
        const reportsTab = await page.locator('button:has-text("Reportes"), .bc-tab:has-text("Reportes")').first();
        if (await reportsTab.isVisible().catch(() => false)) {
            await reportsTab.click();
            console.log('   ✅ Tab Reportes');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-results/consent-05-reportes.png', fullPage: true });
        }

        // ============ PROBAR FILTROS ============
        console.log('🔍 Probando filtros...');

        // Volver a tab Empleados
        if (await employeesTab.isVisible().catch(() => false)) {
            await employeesTab.click();
            await page.waitForTimeout(1500);
        }

        // Filtro: Activos
        const activeFilter = await page.locator('button:has-text("Activos"), .bc-filter-btn:has-text("Activos")').first();
        if (await activeFilter.isVisible().catch(() => false)) {
            await activeFilter.click();
            console.log('   ✅ Filtro Activos');
            await page.waitForTimeout(1500);
            await page.screenshot({ path: 'test-results/consent-06-filtro-activos.png', fullPage: true });
        }

        // Filtro: Pendientes
        const pendingFilter = await page.locator('button:has-text("Pendientes"), .bc-filter-btn:has-text("Pendientes")').first();
        if (await pendingFilter.isVisible().catch(() => false)) {
            await pendingFilter.click();
            console.log('   ✅ Filtro Pendientes');
            await page.waitForTimeout(1500);
            await page.screenshot({ path: 'test-results/consent-07-filtro-pendientes.png', fullPage: true });
        }

        // Filtro: Revocados
        const revokedFilter = await page.locator('button:has-text("Revocados"), .bc-filter-btn:has-text("Revocados")').first();
        if (await revokedFilter.isVisible().catch(() => false)) {
            await revokedFilter.click();
            console.log('   ✅ Filtro Revocados');
            await page.waitForTimeout(1500);
            await page.screenshot({ path: 'test-results/consent-08-filtro-revocados.png', fullPage: true });
        }

        // Filtro: Todos
        const allFilter = await page.locator('button:has-text("Todos"), .bc-filter-btn:has-text("Todos")').first();
        if (await allFilter.isVisible().catch(() => false)) {
            await allFilter.click();
            console.log('   ✅ Filtro Todos');
            await page.waitForTimeout(1500);
        }

        // ============ VERIFICAR ESTADÍSTICAS ============
        console.log('📊 Verificando estadísticas...');
        const stats = await page.locator('.bc-stat-card, .stat-card, [class*="stat"]').count();
        console.log(`   Stats cards encontradas: ${stats}`);

        // ============ SCREENSHOT FINAL ============
        await page.screenshot({ path: 'test-results/consent-09-final.png', fullPage: true });

        console.log('');
        console.log('✅ Visual Testing Consentimientos y Privacidad completado');
        console.log('   Screenshots en test-results/consent-*.png');
    });
});
