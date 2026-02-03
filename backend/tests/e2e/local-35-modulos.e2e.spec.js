/**
 * TEST LOCAL - EXPLORAR 35 MÓDULOS
 * Descubre y documenta todos los módulos disponibles en ISI
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:9998';
const CREDENTIALS = {
    email: 'admin',
    password: 'admin123',
    companySlug: 'isi'
};

const SCREENSHOTS_DIR = path.join(__dirname, '../../test-results/local-35-modulos');
if (fs.existsSync(SCREENSHOTS_DIR)) fs.rmSync(SCREENSHOTS_DIR, { recursive: true });
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

let counter = 1;
async function shot(page, name) {
    const filename = `${String(counter++).padStart(3, '0')}-${name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: true });
    console.log(`📸 ${filename}`);
}

async function wait(page, ms = 1500) {
    await page.waitForTimeout(ms);
}

async function fullLogin(page) {
    await page.goto(`${BASE_URL}/panel-empresa.html`);
    await wait(page, 3000);
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
    await wait(page, 4000);
    try {
        await page.waitForFunction(() => !document.getElementById('userInput')?.disabled, { timeout: 15000 });
        await page.fill('#userInput', CREDENTIALS.email);
        await page.waitForFunction(() => !document.getElementById('passwordInput')?.disabled, { timeout: 10000 });
        await page.fill('#passwordInput', CREDENTIALS.password);
        await page.click('button:has-text("Iniciar Sesión")');
        await wait(page, 5000);
    } catch (e) { }
}

test.describe('LOCAL - EXPLORAR 35 MÓDULOS', () => {
    test.setTimeout(1200000); // 20 minutos

    test('Descubrir y documentar todos los módulos', async ({ page }) => {
        console.log('\n' + '='.repeat(70));
        console.log('🏠 TEST LOCAL - EXPLORAR 35 MÓDULOS');
        console.log('='.repeat(70));

        await fullLogin(page);
        await shot(page, '01-login-dashboard');

        // Capturar todos los módulos del dashboard
        console.log('\n📋 DESCUBRIENDO MÓDULOS...\n');

        // Esperar a que el grid de módulos esté visible
        await wait(page, 2000);

        const modulos = await page.evaluate(() => {
            const result = [];
            const moduleTitles = new Set();

            // Los módulos usan la clase "module-card"
            const moduleCards = document.querySelectorAll('.module-card, [class*="module-card"]');

            moduleCards.forEach((card) => {
                // El título está en un div hijo directo sin clase específica
                const divs = card.querySelectorAll('div');
                let title = '';
                let description = '';

                // Buscar el primer div con texto corto (título)
                for (const div of divs) {
                    const text = div.innerText?.trim();
                    if (text && text.length > 3 && text.length < 50 && !title) {
                        // Es probablemente el título si no contiene saltos de línea
                        if (!text.includes('\n')) {
                            title = text;
                        }
                    }
                }

                // Buscar descripción (texto más largo)
                for (const div of divs) {
                    const text = div.innerText?.trim();
                    if (text && text.length > 50 && text.includes('\n')) {
                        const lines = text.split('\n');
                        if (lines.length >= 2) {
                            title = lines[0].trim();
                            description = lines.slice(1).join(' ').substring(0, 100);
                        }
                    }
                }

                // Fallback: usar todo el innerText del card
                if (!title) {
                    const fullText = card.innerText?.trim();
                    if (fullText) {
                        const lines = fullText.split('\n').filter(l => l.trim());
                        if (lines.length > 0) {
                            title = lines[0].trim();
                            description = lines.slice(1).join(' ').substring(0, 100);
                        }
                    }
                }

                // Filtrar y agregar
                if (title && !moduleTitles.has(title) && title.length > 3 && title.length < 60) {
                    // Excluir elementos que no son módulos
                    if (!title.includes('Paso') &&
                        !title.includes('IA ') &&
                        !title.includes('Asistente') &&
                        !title.includes('pregunta')) {
                        moduleTitles.add(title);
                        result.push({
                            index: result.length + 1,
                            title,
                            description: description || '',
                            hasIcon: !!card.querySelector('svg, img')
                        });
                    }
                }
            });

            return result;
        });

        console.log(`   Módulos encontrados: ${modulos.length}\n`);

        // Listar módulos
        modulos.forEach((m, i) => {
            console.log(`   ${String(i + 1).padStart(2, '0')}. ${m.title}`);
        });

        // Hacer scroll y capturar más screenshots del dashboard
        console.log('\n📸 Capturando dashboard completo...');

        // Scroll y captura por secciones
        for (let scroll = 0; scroll <= 3000; scroll += 800) {
            await page.evaluate((s) => window.scrollTo(0, s), scroll);
            await wait(page, 500);
            await shot(page, `02-dashboard-scroll-${scroll}`);
        }

        // Volver al inicio
        await page.evaluate(() => window.scrollTo(0, 0));
        await wait(page, 1000);

        // Explorar algunos módulos específicos (los primeros 15)
        console.log('\n\n🔍 EXPLORANDO MÓDULOS PRINCIPALES...\n');

        const modulosAExplorar = modulos.slice(0, 15); // Primeros 15
        const resultados = [];

        for (let i = 0; i < modulosAExplorar.length; i++) {
            const modulo = modulosAExplorar[i];
            console.log(`\n${'='.repeat(50)}`);
            console.log(`📦 ${i + 1}/${modulosAExplorar.length}: ${modulo.title}`);
            console.log('='.repeat(50));

            try {
                // Volver al dashboard SIN recargar página (mantener sesión)
                const volverOK = await page.evaluate(() => {
                    // Mostrar grid y ocultar mainContent
                    const grid = document.querySelector('.module-grid');
                    const mainContent = document.getElementById('mainContent');
                    if (grid) {
                        grid.style.display = 'grid';
                        if (mainContent) {
                            mainContent.style.display = 'none';
                            mainContent.innerHTML = '';
                        }
                        window.scrollTo(0, 0);
                        return true;
                    }
                    return false;
                });

                if (!volverOK) {
                    console.log('   ⚠️ No se pudo volver al dashboard, recargando...');
                    await page.goto(`${BASE_URL}/panel-empresa.html`);
                    await wait(page, 2000);
                    await fullLogin(page);
                    await wait(page, 2000);
                } else {
                    await wait(page, 500);
                }

                // Hacer click en el módulo
                const clicked = await page.evaluate((titulo) => {
                    // Buscar en los module-card
                    const moduleCards = document.querySelectorAll('.module-card, [class*="module-card"]');
                    for (const card of moduleCards) {
                        const cardText = card.innerText;
                        if (cardText && cardText.includes(titulo)) {
                            card.click();
                            return true;
                        }
                    }
                    return false;
                }, modulo.title);

                if (!clicked) {
                    console.log(`   ⚠️ No se pudo abrir`);
                    resultados.push({ ...modulo, status: 'NO_CLICK', tabs: 0 });
                    continue;
                }

                await wait(page, 3000);
                const ssName = modulo.title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30);
                await shot(page, `mod-${String(i + 1).padStart(2, '0')}-${ssName}`);

                // Contar tabs/botones
                const info = await page.evaluate(() => {
                    const tabs = [...document.querySelectorAll('button, [role="tab"]')]
                        .filter(t => t.offsetParent !== null)
                        .map(t => t.innerText.trim())
                        .filter(t => t.length > 1 && t.length < 40);

                    const inputs = document.querySelectorAll('input, select, textarea');
                    const visibleInputs = [...inputs].filter(i => i.offsetParent !== null).length;

                    return {
                        tabs: [...new Set(tabs)].slice(0, 10),
                        inputCount: visibleInputs
                    };
                });

                console.log(`   ✅ Módulo abierto`);
                console.log(`   📑 Tabs/Botones: ${info.tabs.length}`);
                console.log(`   📝 Campos: ${info.inputCount}`);

                if (info.tabs.length > 0) {
                    console.log(`   Tabs: ${info.tabs.slice(0, 5).join(', ')}...`);
                }

                resultados.push({
                    ...modulo,
                    status: 'OK',
                    tabs: info.tabs.length,
                    inputs: info.inputCount,
                    tabNames: info.tabs
                });

            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
                resultados.push({ ...modulo, status: 'ERROR', error: error.message });
            }
        }

        // ============================================================
        // RESUMEN FINAL
        // ============================================================
        console.log('\n\n' + '='.repeat(70));
        console.log('📊 RESUMEN DE 35 MÓDULOS');
        console.log('='.repeat(70));

        console.log(`\n   📦 TOTAL MÓDULOS DETECTADOS: ${modulos.length}`);
        console.log(`   🔍 MÓDULOS EXPLORADOS: ${resultados.length}`);

        const okCount = resultados.filter(r => r.status === 'OK').length;
        console.log(`   ✅ FUNCIONANDO: ${okCount}/${resultados.length}`);

        console.log('\n   DETALLE POR MÓDULO:');
        resultados.forEach((r, i) => {
            const icon = r.status === 'OK' ? '✅' : '❌';
            console.log(`   ${icon} ${String(i + 1).padStart(2, '0')}. ${r.title} - ${r.tabs || 0} tabs, ${r.inputs || 0} campos`);
        });

        // Guardar reporte
        const reporte = {
            fecha: new Date().toISOString(),
            empresa: CREDENTIALS.companySlug,
            totalModulos: modulos.length,
            modulosExplorados: resultados.length,
            funcionando: okCount,
            modulos: modulos,
            resultados: resultados
        };

        fs.writeFileSync(
            path.join(SCREENSHOTS_DIR, 'reporte-35-modulos.json'),
            JSON.stringify(reporte, null, 2)
        );

        // Reporte TXT
        let txt = `REPORTE 35 MÓDULOS - ${reporte.fecha}\n${'='.repeat(60)}\n\n`;
        txt += `Empresa: ${CREDENTIALS.companySlug}\n`;
        txt += `Total módulos: ${modulos.length}\n`;
        txt += `Explorados: ${resultados.length}\n`;
        txt += `Funcionando: ${okCount}\n\n`;
        txt += `LISTA COMPLETA DE MÓDULOS:\n${'-'.repeat(40)}\n`;
        modulos.forEach((m, i) => {
            txt += `${String(i + 1).padStart(2, '0')}. ${m.title}\n`;
            if (m.description) txt += `    ${m.description.substring(0, 80)}\n`;
        });

        fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'reporte-35-modulos.txt'), txt);

        console.log('\n' + '='.repeat(70));
        console.log(`📁 Screenshots: ${SCREENSHOTS_DIR}`);
        console.log(`📄 Reporte: reporte-35-modulos.json`);
        console.log('='.repeat(70) + '\n');

        expect(modulos.length).toBeGreaterThanOrEqual(20);
        expect(okCount).toBeGreaterThanOrEqual(10);
    });
});
