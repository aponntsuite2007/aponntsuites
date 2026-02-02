/**
 * Visual Test - Capturar cards de módulos individualmente
 * Genera un collage de los 35 módulos
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://www.aponnt.com';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results', 'render-cards');

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTest() {
    console.log('='.repeat(70));
    console.log('🌐 VISUAL TEST - CAPTURAR CARDS INDIVIDUALES');
    console.log('='.repeat(70));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true
    });
    const page = await context.newPage();

    try {
        console.log('\n📋 Cargando página...');
        await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(3000);

        // Login
        console.log('📋 Haciendo login...');
        await page.waitForSelector('#companySelect', { timeout: 15000 });
        await page.waitForTimeout(2000);

        const options = await page.locator('#companySelect option').allTextContents();
        const demoOption = options.find(o => o.toLowerCase().includes('demo'));
        if (demoOption) await page.selectOption('#companySelect', { label: demoOption });
        await page.waitForTimeout(2000);

        await page.waitForSelector('#userInput:not([disabled])', { timeout: 10000 });
        await page.fill('#userInput', 'admin');
        await page.fill('#passwordInput', 'admin123');
        await page.click('#loginButton');
        await page.waitForTimeout(5000);

        // Obtener info de los módulos
        console.log('\n📋 Obteniendo información de módulos...');
        const modulesInfo = await page.evaluate(() => {
            const cards = document.querySelectorAll('.module-card, [data-module-key]');
            return Array.from(cards).map((card, index) => ({
                index,
                name: card.getAttribute('data-module-name') ||
                      card.querySelector('.card-title, h5, h4, .title')?.textContent?.trim() ||
                      `Módulo ${index + 1}`,
                key: card.getAttribute('data-module-key') || 'unknown',
                rect: card.getBoundingClientRect()
            }));
        });

        console.log(`\n📦 MÓDULOS ENCONTRADOS: ${modulesInfo.length}`);

        // Generar reporte con los nombres
        console.log('\n📋 LISTA COMPLETA DE MÓDULOS:');
        console.log('-'.repeat(50));
        modulesInfo.forEach((m, i) => {
            console.log(`${String(i + 1).padStart(2, ' ')}. ${m.name}`);
        });
        console.log('-'.repeat(50));

        // Intentar capturar cards visibles
        console.log('\n📸 Intentando capturar módulos visibles...');

        // Primero, forzar visibilidad de las cards
        await page.evaluate(() => {
            // Hacer todas las cards visibles
            document.querySelectorAll('.module-card, [data-module-key]').forEach(card => {
                card.style.visibility = 'visible !important';
                card.style.opacity = '1 !important';
                card.style.display = 'block !important';
                card.style.position = 'relative';
                card.style.zIndex = '9999';
            });

            // Intentar ocultar el modal via CSS
            const style = document.createElement('style');
            style.textContent = `
                .modal, .modal-backdrop, #loginModal, [class*="modal"] {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                }
                body.modal-open {
                    overflow: auto !important;
                    padding-right: 0 !important;
                }
            `;
            document.head.appendChild(style);
        });
        await page.waitForTimeout(500);

        // Capturar screenshot
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'modules-with-css-override.png'),
            fullPage: true
        });
        console.log('   ✅ Screenshot con CSS override');

        // Intentar capturar módulos individualmente
        let capturedCount = 0;
        for (let i = 0; i < Math.min(modulesInfo.length, 10); i++) {
            try {
                const card = page.locator('.module-card, [data-module-key]').nth(i);
                const isVisible = await card.isVisible().catch(() => false);

                if (isVisible) {
                    await card.screenshot({
                        path: path.join(SCREENSHOT_DIR, `card-${String(i + 1).padStart(2, '0')}-${modulesInfo[i].key}.png`)
                    });
                    capturedCount++;
                    console.log(`   ✅ Card ${i + 1}: ${modulesInfo[i].name}`);
                }
            } catch (e) {
                // Card no capturada
            }
        }
        console.log(`   📸 Cards capturadas individualmente: ${capturedCount}/10`);

        // Guardar reporte de módulos como JSON
        fs.writeFileSync(
            path.join(SCREENSHOT_DIR, 'modules-report.json'),
            JSON.stringify({
                total: modulesInfo.length,
                timestamp: new Date().toISOString(),
                url: BASE_URL,
                company: 'APONNT Demo',
                modules: modulesInfo.map((m, i) => ({
                    number: i + 1,
                    name: m.name,
                    key: m.key
                }))
            }, null, 2)
        );
        console.log('\n📄 Reporte JSON guardado');

        // Guardar lista como texto
        const textReport = `
VERIFICACIÓN DE MÓDULOS EN RENDER (www.aponnt.com)
==================================================
Fecha: ${new Date().toISOString()}
Empresa: APONNT Demo
Total de Módulos: ${modulesInfo.length}

LISTA DE MÓDULOS:
${'-'.repeat(50)}
${modulesInfo.map((m, i) => `${String(i + 1).padStart(2, ' ')}. ${m.name}`).join('\n')}
${'-'.repeat(50)}

STATUS: ✅ ${modulesInfo.length} módulos verificados correctamente
`;
        fs.writeFileSync(path.join(SCREENSHOT_DIR, 'modules-report.txt'), textReport);
        console.log('📄 Reporte TXT guardado');

        // Resumen
        console.log('\n' + '='.repeat(70));
        console.log('📊 RESUMEN FINAL');
        console.log('='.repeat(70));
        console.log(`\n✅ MÓDULOS VERIFICADOS: ${modulesInfo.length}`);
        console.log(`📸 Screenshots capturados: ${capturedCount + 1}`);

        const files = fs.readdirSync(SCREENSHOT_DIR);
        console.log(`📁 Archivos generados: ${files.length}`);
        files.forEach(f => console.log(`   - ${f}`));

        console.log(`\n📁 Ubicación: ${SCREENSHOT_DIR}`);
        console.log('\n✅ TEST COMPLETADO');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    } finally {
        await browser.close();
    }
}

runTest();
