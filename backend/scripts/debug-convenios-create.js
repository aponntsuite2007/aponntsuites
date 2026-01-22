/**
 * DEBUG - CREAR CONVENIO
 * Diagnóstico específico para entender por qué falla CREATE
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

(async () => {
    console.log('='.repeat(80));
    console.log('DEBUG - CREAR CONVENIO');
    console.log('='.repeat(80));

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    // Capturar TODAS las respuestas de red
    page.on('response', async r => {
        if (r.url().includes('/api/')) {
            const method = r.request().method();
            const status = r.status();
            const url = r.url();
            console.log(`  📡 ${method} ${status}: ${url.split('/api/')[1]}`);
            if (status >= 400) {
                try {
                    const body = await r.text();
                    console.log(`     ERROR BODY: ${body.substring(0, 200)}`);
                } catch {}
            }
        }
    });

    // Capturar errores de consola
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`  🔴 CONSOLE ERROR: ${msg.text()}`);
        }
    });

    try {
        // LOGIN
        console.log('\n▶ LOGIN');
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
        console.log('  ✓ OK');

        // NAVEGAR
        console.log('\n▶ NAVEGAR A ESTRUCTURA ORGANIZACIONAL');
        await page.click('text=Estructura Organizacional');
        await page.waitForTimeout(4000);

        // IR A TAB CONVENIOS
        console.log('\n▶ IR A TAB CONVENIOS');
        await page.evaluate(() => OrgEngine.showTab('agreements'));
        await page.waitForTimeout(2000);

        // Contar antes
        const [countBefore] = await sequelize.query(`SELECT COUNT(*) as c FROM labor_agreements_v2`);
        console.log(`  BD antes: ${countBefore[0].c} convenios`);

        // ABRIR MODAL
        console.log('\n▶ ABRIR MODAL NUEVO CONVENIO');
        const clicked = await page.evaluate(() => {
            const btn = document.querySelector('button.org-btn-primary');
            if (btn && btn.textContent.includes('Nuevo Convenio')) {
                btn.click();
                return true;
            }
            return false;
        });
        console.log(`  Click en botón: ${clicked}`);
        await page.waitForTimeout(2000);

        // Verificar que el modal está abierto
        const modalVisible = await page.evaluate(() => {
            const form = document.getElementById('org-agreement-form');
            return !!form;
        });
        console.log(`  Modal visible: ${modalVisible}`);

        if (!modalVisible) {
            console.log('  ❌ MODAL NO SE ABRIÓ');
            await page.screenshot({ path: 'debug-conv-no-modal.png' });
            return;
        }

        // LLENAR FORMULARIO
        console.log('\n▶ LLENAR FORMULARIO');
        const ts = Date.now().toString().slice(-6);
        const TEST_NAME = `TEST_CONV_${ts}`;

        await page.evaluate((testName) => {
            const form = document.getElementById('org-agreement-form');
            if (!form) return;

            // Llenar campos
            const code = form.querySelector('input[name="code"]');
            const name = form.querySelector('input[name="name"]');
            const shortName = form.querySelector('input[name="short_name"]');
            const industry = form.querySelector('input[name="industry"]');

            if (code) { code.value = 'CODE_' + testName; code.dispatchEvent(new Event('input', {bubbles: true})); }
            if (name) { name.value = testName; name.dispatchEvent(new Event('input', {bubbles: true})); }
            if (shortName) { shortName.value = 'SHORT_' + testName; shortName.dispatchEvent(new Event('input', {bubbles: true})); }
            if (industry) { industry.value = 'Tecnología'; industry.dispatchEvent(new Event('input', {bubbles: true})); }
        }, TEST_NAME);

        // Verificar valores
        const formValues = await page.evaluate(() => {
            const form = document.getElementById('org-agreement-form');
            if (!form) return null;
            const fd = new FormData(form);
            return Object.fromEntries(fd.entries());
        });
        console.log('  Valores del form:', JSON.stringify(formValues, null, 2));

        await page.screenshot({ path: 'debug-conv-filled.png' });

        // BUSCAR BOTÓN GUARDAR
        console.log('\n▶ BUSCAR BOTÓN GUARDAR');
        const buttons = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            const visible = [];
            btns.forEach(btn => {
                if (btn.offsetParent) {
                    visible.push({
                        text: btn.textContent.trim(),
                        class: btn.className,
                        onclick: btn.getAttribute('onclick')
                    });
                }
            });
            return visible;
        });
        console.log('  Botones visibles:');
        buttons.forEach(b => console.log(`    - "${b.text}" (${b.class}) → ${b.onclick || 'no onclick'}`));

        // CLICK EN CREAR CONVENIO
        console.log('\n▶ CLICK EN CREAR CONVENIO');
        const saveClicked = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                if (btn.textContent.includes('Crear Convenio')) {
                    console.log('Clicking button:', btn.textContent);
                    btn.click();
                    return { clicked: true, text: btn.textContent };
                }
            }
            return { clicked: false };
        });
        console.log(`  Resultado click: ${JSON.stringify(saveClicked)}`);

        // Esperar respuesta
        console.log('\n▶ ESPERANDO RESPUESTA API...');
        await page.waitForTimeout(5000);

        // Contar después
        const [countAfter] = await sequelize.query(`SELECT COUNT(*) as c FROM labor_agreements_v2`);
        console.log(`  BD después: ${countAfter[0].c} convenios`);

        const created = countAfter[0].c > countBefore[0].c;
        console.log(created ? '\n✅ CONVENIO CREADO!' : '\n❌ CONVENIO NO SE CREÓ');

        // Buscar el convenio creado
        if (created) {
            const [newConv] = await sequelize.query(`SELECT id, name, code FROM labor_agreements_v2 ORDER BY id DESC LIMIT 1`);
            console.log('  Nuevo convenio:', newConv[0]);
        }

        await page.screenshot({ path: 'debug-conv-after-save.png' });

    } catch (error) {
        console.log('\n❌ ERROR:', error.message);
        console.log(error.stack);
        await page.screenshot({ path: 'debug-conv-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();
    console.log('\n' + '='.repeat(80));
})();
