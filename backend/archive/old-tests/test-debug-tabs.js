/**
 * Test de depuración para entender por qué fillAllTabsData() falla
 */

const { chromium } = require('playwright');
const database = require('./src/config/database');

async function debugTabs() {
    const browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const page = await browser.newPage();

    try {
        // 1. Login
        console.log('🔐 Haciendo login...');
        await page.goto('http://localhost:9998');
        await page.waitForSelector('#companySelect');
        await page.selectOption('#companySelect', 'isi');
        await page.waitForTimeout(2000);
        await page.fill('input[name="username"]:visible', 'soporte');
        await page.press('input[name="username"]:visible', 'Enter');
        await page.waitForTimeout(2000);
        await page.fill('input[type="password"]:visible', 'admin123');
        await page.press('input[type="password"]:visible', 'Enter');
        await page.waitForTimeout(3000);
        console.log('✅ Login completado\n');

        // 2. Navegar a Usuarios
        console.log('📂 Navegando a módulo Usuarios...');
        await page.click('button[onclick*="showSubmodule(\'users\')"]');
        await page.waitForTimeout(2000);
        console.log('✅ Módulo Usuarios cargado\n');

        // 3. Abrir modal VER primer usuario
        console.log('📋 Abriendo modal VER...');
        await page.click('button[onclick*="viewUser"]:first-of-type');
        await page.waitForSelector('#employeeFileModal', { state: 'visible', timeout: 10000 });
        console.log('✅ Modal VER abierto\n');

        // 4. Inspeccionar tabs
        console.log('🔍 INSPECCIONANDO TABS:\n');

        // Contar tabs
        const tabsCount = await page.$$eval('.file-tab', tabs => tabs.length);
        console.log(`   📑 Total tabs encontrados: ${tabsCount}`);

        // Obtener texto de cada tab
        const tabsText = await page.$$eval('.file-tab', tabs =>
            tabs.map((tab, i) => ({ index: i, text: tab.textContent.trim() }))
        );
        console.log('\n   📋 Textos de tabs:');
        tabsText.forEach(tab => {
            console.log(`      ${tab.index + 1}. "${tab.text}"`);
        });

        // Probar clickByText simulado
        console.log('\n\n🧪 PROBANDO CLICK EN TAB "Administración"...\n');

        try {
            const clicked = await page.evaluate(() => {
                const elements = document.querySelectorAll('.file-tab');
                for (const el of elements) {
                    if (el.textContent.includes('Administración')) {
                        el.click();
                        return { success: true, text: el.textContent.trim() };
                    }
                }
                return { success: false, error: 'No encontrado' };
            });

            if (clicked.success) {
                console.log(`   ✅ Click exitoso en tab: "${clicked.text}"`);
            } else {
                console.log(`   ❌ Error: ${clicked.error}`);
            }
        } catch (error) {
            console.log(`   ❌ Error al hacer click: ${error.message}`);
        }

        await page.waitForTimeout(2000);

        // Probar click en otros tabs
        console.log('\n🧪 PROBANDO OTROS TABS:\n');
        const tabsToTest = ['Datos Personales', 'Antecedentes Laborales'];

        for (const tabName of tabsToTest) {
            try {
                const clicked = await page.evaluate((name) => {
                    const elements = document.querySelectorAll('.file-tab');
                    for (const el of elements) {
                        if (el.textContent.includes(name)) {
                            el.click();
                            return { success: true, text: el.textContent.trim() };
                        }
                    }
                    return { success: false, error: 'No encontrado' };
                }, tabName);

                if (clicked.success) {
                    console.log(`   ✅ "${tabName}": Click exitoso`);
                } else {
                    console.log(`   ❌ "${tabName}": ${clicked.error}`);
                }

                await page.waitForTimeout(1000);
            } catch (error) {
                console.log(`   ❌ "${tabName}": Error - ${error.message}`);
            }
        }

        console.log('\n\n⏸️  Presiona Ctrl+C para cerrar el browser...');
        await page.waitForTimeout(60000); // Esperar 1 minuto para inspeccionar

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.error(error.stack);
    } finally {
        await browser.close();
        await database.sequelize.close();
        process.exit(0);
    }
}

debugTabs();
