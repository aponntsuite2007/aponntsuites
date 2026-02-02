/**
 * Visual Testing - Gestión de Kioscos
 * Captura todas las vistas del módulo de kioscos
 */
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:9998';

test.describe('Visual Testing - Gestión de Kioscos', () => {

    test('Capturar todas las vistas del módulo Kioscos', async ({ page }) => {
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

        // ============ NAVEGAR A GESTIÓN DE KIOSCOS ============
        console.log('🖥️ Navegando a Gestión de Kioscos...');
        await page.evaluate(() => {
            if (typeof showModuleContent === 'function') {
                showModuleContent('kiosks', 'Gestión de Kioscos');
            }
        });
        await page.waitForTimeout(4000);

        await page.screenshot({ path: 'test-results/kiosks-01-inicial.png', fullPage: true });

        // ============ EXPLORAR TABS/VISTAS ============
        // Buscar tabs o navegación dentro del módulo
        const tabs = await page.locator('.tab, .nav-tab, [role="tab"], .kiosk-tab, .module-tab').all();
        console.log(`   Tabs encontrados: ${tabs.length}`);

        // Si hay tabs, capturar cada uno
        if (tabs.length > 0) {
            for (let i = 0; i < tabs.length; i++) {
                const tab = tabs[i];
                const tabText = await tab.textContent().catch(() => `Tab ${i+1}`);
                console.log(`📸 Tab ${i+1}: ${tabText.trim()}`);

                await tab.click().catch(() => {});
                await page.waitForTimeout(2000);

                await page.screenshot({
                    path: `test-results/kiosks-0${i+2}-tab-${i+1}.png`,
                    fullPage: true
                });
            }
        }

        // ============ BUSCAR LISTA DE KIOSCOS ============
        console.log('📋 Buscando lista de kioscos...');
        const kioskList = await page.locator('table tbody tr, .kiosk-item, .kiosk-card, .device-item').count();
        console.log(`   Kioscos en lista: ${kioskList}`);

        await page.screenshot({ path: 'test-results/kiosks-02-lista.png', fullPage: true });

        // ============ ABRIR MODAL NUEVO KIOSKO ============
        console.log('➕ Buscando botón Nuevo Kiosko...');
        const nuevoBtn = await page.locator('button:has-text("Nuevo"), button:has-text("Agregar"), button:has-text("Add"), .btn-add, [onclick*="add"], [onclick*="new"], [onclick*="crear"]').first();

        if (await nuevoBtn.isVisible().catch(() => false)) {
            await nuevoBtn.click();
            console.log('   ✅ Click en Nuevo Kiosko');
            await page.waitForTimeout(2000);

            await page.screenshot({ path: 'test-results/kiosks-03-modal-nuevo.png', fullPage: true });

            // Cerrar modal
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
        } else {
            console.log('   ⚠️ Botón Nuevo no encontrado');
        }

        // ============ BUSCAR KIOSKO PARA EDITAR ============
        console.log('✏️ Buscando botón Editar...');
        const editBtn = await page.locator('button[title="Editar"], button:has-text("Editar"), .btn-edit, [onclick*="edit"]').first();

        if (await editBtn.isVisible().catch(() => false)) {
            await editBtn.click();
            console.log('   ✅ Click en Editar');
            await page.waitForTimeout(2000);

            await page.screenshot({ path: 'test-results/kiosks-04-modal-editar.png', fullPage: true });

            // Cerrar modal
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
        } else {
            console.log('   ⚠️ Botón Editar no encontrado');
        }

        // ============ BUSCAR DETALLES/CONFIG DE KIOSKO ============
        console.log('⚙️ Buscando configuración de kiosko...');
        const configBtn = await page.locator('button[title="Configurar"], button:has-text("Config"), .btn-config, [onclick*="config"], [onclick*="settings"]').first();

        if (await configBtn.isVisible().catch(() => false)) {
            await configBtn.click();
            console.log('   ✅ Click en Configurar');
            await page.waitForTimeout(2000);

            await page.screenshot({ path: 'test-results/kiosks-05-config.png', fullPage: true });

            // Cerrar
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
        }

        // ============ SCREENSHOT FINAL ============
        await page.screenshot({ path: 'test-results/kiosks-06-final.png', fullPage: true });

        console.log('');
        console.log('✅ Visual Testing Gestión de Kioscos completado');
        console.log('   Screenshots en test-results/kiosks-*.png');
    });
});
