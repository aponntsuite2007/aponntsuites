/**
 * Debug específico para Tab 5 (Medical) - Entender por qué falla
 */

const { chromium } = require('playwright');
const database = require('./src/config/database');

async function debugTab5Medical() {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });
    const page = await browser.newPage();

    try {
        console.log('\n🔐 === PASO 1: LOGIN ===\n');
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
        console.log('✅ Login OK\n');

        console.log('📂 === PASO 2: NAVEGAR A USUARIOS ===\n');
        await page.click('button[onclick*="showSubmodule(\'users\')"]');
        await page.waitForTimeout(2000);
        console.log('✅ Módulo Usuarios cargado\n');

        console.log('📋 === PASO 3: ABRIR MODAL VER ===\n');
        // Esperar botones explícitamente
        await page.waitForSelector('button[onclick^="viewUser("]', { timeout: 10000, state: 'visible' });
        await page.waitForTimeout(1000);

        await page.click('button[onclick^="viewUser("]:first-of-type');
        await page.waitForSelector('#employeeFileModal', { state: 'visible', timeout: 10000 });
        await page.waitForTimeout(2000);
        console.log('✅ Modal VER abierto\n');

        console.log('🔍 === PASO 4: CLICK EN TAB 5 (MEDICAL) ===\n');

        // Probar con el selector correcto
        const medicalTabSelector = '.file-tab[onclick*="showFileTab(\'medical\'"]';
        console.log(`   Selector usado: ${medicalTabSelector}`);

        try {
            // Verificar si el tab existe
            const tabExists = await page.$(medicalTabSelector);
            if (!tabExists) {
                console.log('   ❌ TAB NO ENCONTRADO con ese selector');

                // Listar todos los tabs disponibles
                const allTabs = await page.$$eval('.file-tab', tabs =>
                    tabs.map(t => ({
                        text: t.textContent.trim(),
                        onclick: t.getAttribute('onclick')
                    }))
                );
                console.log('\n   📋 Tabs disponibles:');
                allTabs.forEach((tab, i) => {
                    console.log(`      ${i+1}. "${tab.text}" → onclick="${tab.onclick}"`);
                });

                throw new Error('Tab Medical no encontrado');
            }

            console.log('   ✅ Tab Medical encontrado');

            // Click en el tab
            await page.click(medicalTabSelector);
            await page.waitForTimeout(1000);
            console.log('   ✅ Click en Tab Medical exitoso\n');

            // Verificar si el contenedor del tab está visible
            const medicalContentVisible = await page.isVisible('#medical-content');
            console.log(`   Contenido medical visible: ${medicalContentVisible}`);

            // Buscar el botón de agregar examen médico
            console.log('\n🔍 === PASO 5: BUSCAR BOTÓN AGREGAR EXAMEN ===\n');

            const addBtnSelectors = [
                'button[onclick*="addMedicalExam"]',
                'button[onclick*="openMedicalExamModal"]',
                '#medical-content button:has-text("Agregar")',
                '#medical-content button:has-text("Nuevo")',
                '#medical-content button.btn-primary'
            ];

            for (const selector of addBtnSelectors) {
                const exists = await page.$(selector);
                console.log(`   ${selector}: ${exists ? '✅ EXISTE' : '❌ No existe'}`);
            }

            // Intentar encontrar CUALQUIER botón en el contenedor medical
            const anyButtons = await page.$$eval('#medical-content button', buttons =>
                buttons.map(b => ({
                    text: b.textContent.trim(),
                    onclick: b.getAttribute('onclick'),
                    class: b.className
                }))
            );

            console.log(`\n   📋 Botones encontrados en #medical-content (${anyButtons.length}):`);
            anyButtons.forEach((btn, i) => {
                console.log(`      ${i+1}. "${btn.text}" → onclick="${btn.onclick}" class="${btn.class}"`);
            });

            // Tomar screenshot
            await page.screenshot({
                path: 'debug-tab5-medical-content.png',
                fullPage: true
            });
            console.log('\n   📸 Screenshot guardado: debug-tab5-medical-content.png');

        } catch (error) {
            console.error(`   ❌ ERROR: ${error.message}`);
            await page.screenshot({
                path: 'debug-tab5-medical-ERROR.png',
                fullPage: true
            });
            console.log('\n   📸 Screenshot de error guardado: debug-tab5-medical-ERROR.png');
        }

        console.log('\n\n⏸️  Esperando 60 segundos para inspección manual...\n');
        await page.waitForTimeout(60000);

    } catch (error) {
        console.error('❌ ERROR FATAL:', error.message);
        console.error(error.stack);
    } finally {
        await browser.close();
        await database.sequelize.close();
        process.exit(0);
    }
}

debugTab5Medical();
