/**
 * Script para inspeccionar la estructura DOM cuando se carga un módulo
 */

const { chromium } = require('playwright');

async function inspectModuleDOM() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('🌐 Navegando a panel-empresa...');
        await page.goto('http://localhost:9998/panel-empresa.html', {
            waitUntil: 'networkidle'
        });

        // PASO 1: Seleccionar empresa
        console.log('🏢 Paso 1: Seleccionar empresa...');
        await page.waitForSelector('#companySelect', { timeout: 10000 });

        // Ver qué empresas están disponibles
        const companies = await page.evaluate(() => {
            const select = document.getElementById('companySelect');
            return Array.from(select.options).map(opt => ({
                value: opt.value,
                text: opt.textContent.trim()
            }));
        });
        console.log('Empresas disponibles:', companies);

        // Seleccionar la primera empresa que no sea "Seleccionar..."
        const targetCompany = companies.find(c => c.value && c.value !== '');
        if (!targetCompany) {
            throw new Error('No hay empresas disponibles');
        }
        console.log(`Seleccionando empresa: ${targetCompany.text} (value: ${targetCompany.value})`);
        await page.selectOption('#companySelect', targetCompany.value);
        await page.waitForTimeout(500);

        // PASO 2: Ingresar usuario
        console.log('👤 Paso 2: Ingresar usuario...');
        await page.waitForSelector('#userInput');
        await page.fill('#userInput', 'administrador');
        await page.waitForTimeout(500);

        // PASO 3: Ingresar password y login
        console.log('🔐 Paso 3: Ingresar password...');
        await page.fill('#passwordInput', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);

        console.log('✅ Login completado, esperando módulos...');

        // Verificar que el grid de módulos esté visible
        const moduleCards = await page.locator('[data-module-key]').count();
        console.log(`📦 Módulos encontrados: ${moduleCards}`);

        if (moduleCards === 0) {
            console.error('❌ No se encontraron módulos');
            await page.screenshot({ path: 'C:/Bio/sistema_asistencia_biometrico/backend/tests/screenshots/no-modules.png' });
            return;
        }

        // Obtener la lista de módulos disponibles
        const modules = await page.evaluate(() => {
            const cards = document.querySelectorAll('[data-module-key]');
            return Array.from(cards).map(card => ({
                key: card.getAttribute('data-module-key'),
                name: card.getAttribute('data-module-name'),
                clickable: card.getAttribute('data-clickable')
            })).filter(m => m.clickable === 'true').slice(0, 5);
        });

        console.log('\n📋 Módulos disponibles para inspeccionar:');
        modules.forEach((m, i) => {
            console.log(`  ${i + 1}. ${m.name} (${m.key})`);
        });

        // Inspeccionar el primer módulo clickeable
        const testModule = modules[0];
        console.log(`\n🎯 Inspeccionando módulo: ${testModule.name} (${testModule.key})`);

        // Capturar screenshot ANTES de click
        await page.screenshot({
            path: `C:/Bio/sistema_asistencia_biometrico/backend/tests/screenshots/inspect-before-click.png`
        });

        // Click en el módulo
        await page.locator(`[data-module-key="${testModule.key}"]`).first().click();
        console.log('🖱️ Click realizado en módulo');

        // Esperar un momento para que cargue
        await page.waitForTimeout(2000);

        // Capturar screenshot DESPUÉS de click
        await page.screenshot({
            path: `C:/Bio/sistema_asistencia_biometrico/backend/tests/screenshots/inspect-after-click.png`
        });

        // INSPECCIONAR LA ESTRUCTURA DOM
        console.log('\n🔍 Inspeccionando estructura DOM después de cargar módulo...\n');

        const domStructure = await page.evaluate(() => {
            const results = {
                mainContent: null,
                moduleGrid: null,
                visibleElements: [],
                allPossibleContainers: []
            };

            // 1. Verificar mainContent
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                results.mainContent = {
                    display: window.getComputedStyle(mainContent).display,
                    visibility: window.getComputedStyle(mainContent).visibility,
                    opacity: window.getComputedStyle(mainContent).opacity,
                    innerHTML_length: mainContent.innerHTML.length,
                    children: mainContent.children.length,
                    classes: mainContent.className,
                    firstChild: mainContent.firstElementChild ? {
                        tagName: mainContent.firstElementChild.tagName,
                        id: mainContent.firstElementChild.id,
                        classes: mainContent.firstElementChild.className
                    } : null
                };
            }

            // 2. Verificar module-grid
            const moduleGrid = document.querySelector('.module-grid');
            if (moduleGrid) {
                results.moduleGrid = {
                    display: window.getComputedStyle(moduleGrid).display,
                    visibility: window.getComputedStyle(moduleGrid).visibility
                };
            }

            // 3. Buscar todos los elementos visibles en el viewport (no hidden)
            const allElements = document.querySelectorAll('*');
            allElements.forEach(el => {
                const style = window.getComputedStyle(el);
                if (
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    parseFloat(style.opacity) > 0 &&
                    el.offsetParent !== null
                ) {
                    if (
                        el.id &&
                        (el.id.includes('content') || el.id.includes('module') || el.id.includes('container'))
                    ) {
                        results.visibleElements.push({
                            tagName: el.tagName,
                            id: el.id,
                            classes: el.className,
                            innerText_length: el.innerText?.length || 0
                        });
                    }
                }
            });

            // 4. Buscar TODOS los posibles contenedores de módulos
            const selectors = [
                '#mainContent',
                '.module-content',
                '#moduleContent',
                '[data-module-active]',
                '[data-module-container]',
                '.content-area',
                '.module-container',
                '#content',
                '.main-content'
            ];

            selectors.forEach(sel => {
                const el = document.querySelector(sel);
                if (el) {
                    const style = window.getComputedStyle(el);
                    results.allPossibleContainers.push({
                        selector: sel,
                        exists: true,
                        display: style.display,
                        visibility: style.visibility,
                        opacity: style.opacity,
                        children: el.children.length,
                        hasContent: el.innerHTML.length > 100
                    });
                }
            });

            return results;
        });

        // Mostrar resultados
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 ESTRUCTURA DOM DESPUÉS DE CARGAR MÓDULO');
        console.log('═══════════════════════════════════════════════════════════\n');

        console.log('1️⃣ #mainContent:');
        console.log(JSON.stringify(domStructure.mainContent, null, 2));

        console.log('\n2️⃣ .module-grid:');
        console.log(JSON.stringify(domStructure.moduleGrid, null, 2));

        console.log('\n3️⃣ Elementos visibles con "content/module/container" en el ID:');
        domStructure.visibleElements.forEach(el => {
            console.log(`   - <${el.tagName}> id="${el.id}" class="${el.classes}" (${el.innerText_length} chars)`);
        });

        console.log('\n4️⃣ Todos los posibles contenedores de módulos:');
        domStructure.allPossibleContainers.forEach(c => {
            const status = c.display !== 'none' && c.visibility !== 'hidden' && c.opacity > 0 && c.hasContent ? '✅' : '❌';
            console.log(`   ${status} ${c.selector} - display:${c.display}, visibility:${c.visibility}, opacity:${c.opacity}, children:${c.children}, hasContent:${c.hasContent}`);
        });

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('💡 SELECTOR RECOMENDADO PARA PLAYWRIGHT:');
        console.log('═══════════════════════════════════════════════════════════');

        // Determinar el mejor selector
        const bestContainer = domStructure.allPossibleContainers.find(c =>
            c.display !== 'none' &&
            c.visibility !== 'hidden' &&
            parseFloat(c.opacity) > 0 &&
            c.hasContent
        );

        if (bestContainer) {
            console.log(`\n✅ USAR: await page.waitForSelector('${bestContainer.selector}', { timeout: 10000 });\n`);
        } else {
            console.log('\n⚠️ No se encontró un selector obvio, usar estrategia alternativa:\n');
            console.log('   await page.evaluate(() => {');
            console.log('       const mainContent = document.getElementById("mainContent");');
            console.log('       return mainContent && mainContent.children.length > 0;');
            console.log('   });\n');
        }

        console.log('📸 Screenshots guardados en backend/tests/screenshots/');
        console.log('   - inspect-before-click.png');
        console.log('   - inspect-after-click.png\n');

        // Mantener el navegador abierto para inspección manual
        console.log('🔍 Navegador abierto para inspección manual...');
        console.log('   Presiona Ctrl+C para cerrar.\n');

        await page.waitForTimeout(60000); // Esperar 60 segundos

    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({
            path: 'C:/Bio/sistema_asistencia_biometrico/backend/tests/screenshots/inspect-error.png'
        });
    } finally {
        await browser.close();
    }
}

inspectModuleDOM().catch(console.error);
