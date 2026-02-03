const { test, expect } = require('@playwright/test');
const BASE_URL = 'http://localhost:9998';

test('Debug Finanzas', async ({ page }) => {
    test.setTimeout(60000);
    
    await page.goto(`${BASE_URL}/panel-empresa.html`);
    await page.waitForTimeout(3000);
    
    // Select company
    await page.evaluate(() => {
        const select = document.getElementById('companySelect');
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === 'isi') {
                select.selectedIndex = i;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                break;
            }
        }
    });
    await page.waitForTimeout(4000);
    
    // Login
    await page.fill('#userInput', 'admin');
    await page.fill('#passwordInput', 'admin123');
    await page.click('button:has-text("Iniciar Sesión")');
    await page.waitForTimeout(5000);
    
    // Find Finanzas card and get its info
    const cardInfo = await page.evaluate(() => {
        const cards = document.querySelectorAll('.module-card');
        for (const card of cards) {
            if (card.innerText.includes('Finanzas')) {
                return {
                    found: true,
                    text: card.innerText.substring(0, 100),
                    moduleKey: card.getAttribute('data-module-key'),
                    moduleId: card.getAttribute('data-module-id'),
                    moduleName: card.getAttribute('data-module-name'),
                    dataAction: card.getAttribute('data-action'),
                    onclick: card.getAttribute('onclick')
                };
            }
        }
        return { found: false };
    });
    
    console.log('Card Info:', JSON.stringify(cardInfo, null, 2));
    
    // Take screenshot before clicking
    await page.screenshot({ path: 'test-results/debug-finanzas-before.png', fullPage: true });
    
    // Click the card
    if (cardInfo.found) {
        await page.evaluate(() => {
            const cards = document.querySelectorAll('.module-card');
            for (const card of cards) {
                if (card.innerText.includes('Finanzas')) {
                    console.log('Clicking Finanzas card...');
                    card.click();
                    break;
                }
            }
        });
        
        await page.waitForTimeout(3000);
        
        // Check page state
        const pageState = await page.evaluate(() => {
            return {
                loginVisible: document.getElementById('loginContainer')?.style?.display !== 'none',
                mainContentVisible: document.getElementById('mainContent')?.style?.display !== 'none',
                moduleGridVisible: document.querySelector('.module-grid')?.style?.display !== 'none',
                bodyText: document.body.innerText.substring(0, 300)
            };
        });
        
        console.log('Page State:', JSON.stringify(pageState, null, 2));
    }
    
    // Take screenshot after clicking
    await page.screenshot({ path: 'test-results/debug-finanzas-after.png', fullPage: true });
});
