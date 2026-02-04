/**
 * Script para inspeccionar el modal de usuarios y obtener IDs de campos
 */

const { chromium } = require('playwright');

async function inspectUsersModal() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('🌐 Navegando a panel-empresa...');
        await page.goto('http://localhost:9998/panel-empresa.html', {
            waitUntil: 'networkidle'
        });

        // Login
        await page.waitForSelector('#companySelect', { timeout: 10000 });
        const companies = await page.evaluate(() => {
            const select = document.getElementById('companySelect');
            return Array.from(select.options).map(opt => ({
                value: opt.value,
                text: opt.textContent.trim()
            }));
        });

        const targetCompany = companies.find(c => c.value && c.value !== '');
        await page.selectOption('#companySelect', targetCompany.value);
        await page.waitForTimeout(500);

        await page.waitForSelector('#userInput');
        await page.fill('#userInput', 'admin');
        await page.waitForTimeout(500);

        await page.fill('#passwordInput', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);

        console.log('✅ Login completado');

        // Click en módulo de Usuarios
        console.log('🎯 Navegando a módulo de Usuarios...');
        await page.click('[data-module-key="users"]');
        await page.waitForTimeout(2000);

        // Click en "Agregar Usuario"
        console.log('👤 Abriendo modal Agregar Usuario...');
        await page.click('button:has-text("Agregar Usuario")');
        await page.waitForTimeout(2000);

        // Inspeccionar el modal
        console.log('\n📋 INSPECCIONANDO MODAL #userModal:\n');

        const modalInfo = await page.evaluate(() => {
            const modal = document.getElementById('userModal');
            if (!modal) {
                return { error: 'Modal no encontrado' };
            }

            const result = {
                inputs: [],
                selects: [],
                textareas: [],
                buttons: []
            };

            // Buscar todos los inputs
            modal.querySelectorAll('input').forEach(input => {
                result.inputs.push({
                    type: input.type,
                    id: input.id,
                    name: input.name,
                    placeholder: input.placeholder,
                    required: input.required
                });
            });

            // Buscar todos los selects
            modal.querySelectorAll('select').forEach(select => {
                result.selects.push({
                    id: select.id,
                    name: select.name,
                    required: select.required
                });
            });

            // Buscar todos los textareas
            modal.querySelectorAll('textarea').forEach(textarea => {
                result.textareas.push({
                    id: textarea.id,
                    name: textarea.name,
                    placeholder: textarea.placeholder
                });
            });

            // Buscar todos los botones
            modal.querySelectorAll('button').forEach(button => {
                result.buttons.push({
                    type: button.type,
                    id: button.id,
                    className: button.className,
                    text: button.textContent.trim().substring(0, 50)
                });
            });

            return result;
        });

        console.log('═══════════════════════════════════════════════════════════');
        console.log('📝 INPUTS:');
        console.log('═══════════════════════════════════════════════════════════');
        modalInfo.inputs.forEach((input, i) => {
            console.log(`\n${i + 1}. Type: ${input.type}`);
            console.log(`   ID: "${input.id}"`);
            console.log(`   Name: "${input.name}"`);
            console.log(`   Placeholder: "${input.placeholder}"`);
            console.log(`   Required: ${input.required}`);
        });

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('📋 SELECTS:');
        console.log('═══════════════════════════════════════════════════════════');
        modalInfo.selects.forEach((select, i) => {
            console.log(`\n${i + 1}. ID: "${select.id}"`);
            console.log(`   Name: "${select.name}"`);
            console.log(`   Required: ${select.required}`);
        });

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('🔘 BUTTONS:');
        console.log('═══════════════════════════════════════════════════════════');
        modalInfo.buttons.forEach((button, i) => {
            console.log(`\n${i + 1}. Type: ${button.type}`);
            console.log(`   ID: "${button.id}"`);
            console.log(`   Class: "${button.className}"`);
            console.log(`   Text: "${button.text}"`);
        });

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('💡 SUGERENCIA PARA modules-config.js:');
        console.log('═══════════════════════════════════════════════════════════\n');

        // Generar sugerencia de configuración
        const suggestedFormFields = {};
        modalInfo.inputs.forEach(input => {
            if (input.id && input.type !== 'hidden' && input.type !== 'submit') {
                suggestedFormFields[input.id] = `"Valor para ${input.id}"`;
            }
        });

        modalInfo.selects.forEach(select => {
            if (select.id) {
                suggestedFormFields[select.id] = `"valor-opcion"`;
            }
        });

        console.log('formFields: {');
        Object.entries(suggestedFormFields).forEach(([key, value]) => {
            console.log(`  ${key}: ${value},`);
        });
        console.log('}\n');

        // Mantener navegador abierto
        console.log('🔍 Navegador abierto para inspección manual...');
        console.log('   Presiona Ctrl+C para cerrar.\n');

        await page.waitForTimeout(120000); // 2 minutos

    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({
            path: 'C:/Bio/sistema_asistencia_biometrico/backend/tests/screenshots/inspect-modal-error.png'
        });
    } finally {
        await browser.close();
    }
}

inspectUsersModal().catch(console.error);
