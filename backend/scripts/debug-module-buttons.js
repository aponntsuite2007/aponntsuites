/**
 * Debug: Ver qué botones tiene cada módulo
 */
const { chromium } = require('playwright');

const MODULES = [
    { name: 'users', displayName: 'Gestión de Usuarios' },
    { name: 'departments', displayName: 'Departamentos' },
    { name: 'kiosks', displayName: 'Gestión de Kioscos' },
    { name: 'shifts', displayName: 'Turnos' },
    { name: 'notifications', displayName: 'Centro de Notificaciones' }
];

(async () => {
    console.log('='.repeat(80));
    console.log('DEBUG: BOTONES EN CADA MÓDULO');
    console.log('='.repeat(80));

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    // LOGIN
    console.log('LOGIN...');
    await page.goto('http://localhost:9998/panel-empresa.html');
    await page.waitForSelector('#companySelect', { timeout: 15000 });
    await page.selectOption('#companySelect', 'isi');
    await page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
    await page.fill('#userInput', 'admin');
    await page.fill('#passwordInput', 'admin123');
    await page.evaluate(() => {
        document.getElementById('loginButton').disabled = false;
        document.getElementById('loginButton').click();
    });
    await page.waitForTimeout(5000);
    console.log('OK\n');

    for (const mod of MODULES) {
        console.log(`\n▶ ${mod.name.toUpperCase()} (${mod.displayName})`);
        console.log('-'.repeat(60));

        // Navegar al módulo
        await page.evaluate((displayName) => {
            const cards = document.querySelectorAll('.module-card, .card, [class*="module"]');
            for (const card of cards) {
                if (card.textContent.includes(displayName)) {
                    card.click();
                    return true;
                }
            }
            // Fallback: buscar texto en links
            const links = document.querySelectorAll('a');
            for (const link of links) {
                if (link.textContent.includes(displayName)) {
                    link.click();
                    return true;
                }
            }
            return false;
        }, mod.displayName);

        await page.waitForTimeout(3000);

        // Obtener todos los botones visibles
        const buttons = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.filter(b => b.offsetParent !== null).map(b => ({
                text: b.textContent.trim().replace(/\s+/g, ' ').substring(0, 50),
                classes: b.className.substring(0, 50),
                id: b.id || '-'
            }));
        });

        console.log(`Botones visibles (${buttons.length}):`);
        buttons.forEach((b, i) => {
            console.log(`  [${i}] "${b.text}" | class="${b.classes}" | id="${b.id}"`);
        });

        // Buscar específicamente botones de agregar
        const addButtons = buttons.filter(b =>
            b.text.toLowerCase().includes('agregar') ||
            b.text.toLowerCase().includes('add') ||
            b.text.toLowerCase().includes('nuevo') ||
            b.text.toLowerCase().includes('crear') ||
            b.text.includes('+')
        );

        if (addButtons.length > 0) {
            console.log('\n  🎯 Posibles botones de AGREGAR:');
            addButtons.forEach(b => console.log(`     "${b.text}"`));
        } else {
            console.log('\n  ⚠️ No se encontraron botones de agregar');
        }

        // Tomar screenshot
        await page.screenshot({ path: `debug-module-${mod.name}.png`, fullPage: true });
        console.log(`  📸 Screenshot: debug-module-${mod.name}.png`);

        // Volver al dashboard
        await page.evaluate(() => {
            if (typeof loadModule === 'function') loadModule('dashboard');
        });
        await page.waitForTimeout(2000);
    }

    await browser.close();
    console.log('\n' + '='.repeat(80));
})();
