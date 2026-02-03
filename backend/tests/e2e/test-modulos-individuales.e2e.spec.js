/**
 * TEST: Verificar módulos individuales
 * Clickea directamente en módulos específicos para ver si funcionan
 */
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:9998';
const CREDENTIALS = { email: 'admin', password: 'admin123', companySlug: 'isi' };

async function login(page) {
    await page.goto(`${BASE_URL}/panel-empresa.html`);
    await page.waitForTimeout(3000);
    await page.evaluate((slug) => {
        const select = document.getElementById('companySelect');
        if (!select) return;
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === slug) {
                select.selectedIndex = i;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                break;
            }
        }
    }, CREDENTIALS.companySlug);
    await page.waitForTimeout(4000);
    await page.fill('#userInput', CREDENTIALS.email);
    await page.fill('#passwordInput', CREDENTIALS.password);
    await page.click('button:has-text("Iniciar Sesión")');
    await page.waitForTimeout(5000);
}

test.describe('TEST MÓDULOS INDIVIDUALES', () => {
    test.setTimeout(120000);

    test('Verificar Gestión de Usuarios (users.js)', async ({ page }) => {
        await login(page);
        
        // Click directo en Gestión de Usuarios
        const clicked = await page.evaluate(() => {
            const cards = document.querySelectorAll('.module-card');
            for (const card of cards) {
                if (card.innerText.includes('Gestión de Usuarios')) {
                    card.click();
                    return true;
                }
            }
            return false;
        });
        expect(clicked).toBe(true);
        await page.waitForTimeout(3000);
        
        // Verificar si hay login modal
        const loginVisible = await page.evaluate(() => {
            const loginContainer = document.getElementById('loginContainer');
            return loginContainer && getComputedStyle(loginContainer).display !== 'none';
        });
        
        console.log('Login modal visible:', loginVisible);
        
        // Contar elementos del módulo
        const info = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button').length;
            const inputs = document.querySelectorAll('input').length;
            return { buttons, inputs };
        });
        
        console.log('Módulo info:', info);
        
        await page.screenshot({ path: 'test-results/modulo-usuarios-directo.png', fullPage: true });
    });
});
