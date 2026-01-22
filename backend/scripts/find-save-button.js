/**
 * Find the real save button in the Users form
 */
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Login
    console.log('Logging in...');
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
    console.log('Login OK');

    // Click en Gestión de Usuarios
    console.log('Navegando a Users...');
    await page.click('text=Gestión de Usuarios');
    await page.waitForTimeout(4000);

    // Click en Agregar
    console.log('Abriendo modal de crear...');
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const addBtn = btns.find(b => b.textContent.includes('Agregar'));
        if (addBtn) addBtn.click();
    });
    await page.waitForTimeout(2000);

    // Buscar TODOS los botones
    const allButtons = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn'));
        return btns.map(b => ({
            tag: b.tagName,
            text: b.textContent.trim().substring(0, 50),
            visible: b.offsetParent !== null,
            classes: b.className.substring(0, 50),
            id: b.id,
            type: b.type || ''
        }));
    });

    console.log('\n' + '='.repeat(70));
    console.log('TODOS LOS BOTONES EN LA PAGINA');
    console.log('='.repeat(70));

    const visibleBtns = allButtons.filter(b => b.visible);
    const hiddenBtns = allButtons.filter(b => !b.visible);

    console.log('\nBOTONES VISIBLES (' + visibleBtns.length + '):');
    visibleBtns.forEach((b, i) => {
        console.log(`  [${i}] ${b.tag} | "${b.text}" | class="${b.classes}" | id="${b.id}"`);
    });

    console.log('\nBOTONES OCULTOS (' + hiddenBtns.length + '):');
    hiddenBtns.forEach((b, i) => {
        console.log(`  [${i}] ${b.tag} | "${b.text}" | class="${b.classes}"`);
    });

    // Hacer scroll para ver si hay más contenido
    await page.evaluate(() => {
        // Buscar contenedores scrolleables
        const containers = document.querySelectorAll('div');
        containers.forEach(div => {
            if (div.scrollHeight > div.clientHeight) {
                div.scrollTop = div.scrollHeight;
            }
        });
    });
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'debug-all-buttons.png', fullPage: true });
    console.log('\nScreenshot: debug-all-buttons.png');

    // Buscar específicamente botones con "Guardar" o "Crear" o "Submit"
    const saveButtons = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        return btns.filter(b => {
            const text = b.textContent.toLowerCase();
            return text.includes('guardar') || text.includes('crear') || text.includes('save') || text.includes('submit');
        }).map(b => ({
            text: b.textContent.trim(),
            visible: b.offsetParent !== null,
            classes: b.className,
            bounds: b.getBoundingClientRect()
        }));
    });

    console.log('\nBOTONES DE GUARDAR/CREAR:');
    saveButtons.forEach((b, i) => {
        console.log(`  [${i}] "${b.text}" | visible=${b.visible} | pos=(${Math.round(b.bounds.x)}, ${Math.round(b.bounds.y)})`);
    });

    await browser.close();
})();
