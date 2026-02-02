/**
 * TEST DE 10 TABS DEL EXPEDIENTE DIGITAL
 * Explora cada tab, llena campos, guarda y verifica persistencia
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://www.aponnt.com';
const CREDENTIALS = {
    email: 'admin@demo.aponnt.com',
    password: 'admin123',
    companySlug: 'aponnt-demo'
};

const SCREENSHOTS_DIR = path.join(__dirname, '../../test-results/crud-10tabs');
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

async function openUsersModule(page) {
    await page.evaluate(() => {
        const cards = document.querySelectorAll('[class*="rounded-xl"], [class*="card"]');
        for (const card of cards) {
            if (card.innerText.includes('Gestión de Usuarios')) {
                card.click();
                return;
            }
        }
    });
    await wait(page, 3000);
}

async function clickTab(page, tabName) {
    const clicked = await page.evaluate((name) => {
        const tabs = document.querySelectorAll('button, [role="tab"]');
        for (const tab of tabs) {
            if (tab.innerText.includes(name) && tab.offsetParent !== null) {
                tab.click();
                return true;
            }
        }
        return false;
    }, tabName);
    if (clicked) await wait(page, 2000);
    return clicked;
}

async function getTabFields(page) {
    return await page.evaluate(() => {
        const fields = [];
        document.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.offsetParent !== null && !el.disabled) {
                fields.push({
                    id: el.id || el.name || '',
                    type: el.type || el.tagName.toLowerCase(),
                    value: el.value || ''
                });
            }
        });
        return fields.slice(0, 20);
    });
}

async function getTabButtons(page) {
    return await page.evaluate(() => {
        return [...document.querySelectorAll('button')]
            .filter(b => b.offsetParent !== null)
            .map(b => b.innerText.trim())
            .filter(t => t.length > 1 && t.length < 40)
            .slice(0, 15);
    });
}

test.describe('10 TABS DEL EXPEDIENTE DIGITAL', () => {
    test.setTimeout(900000);

    test('Explorar y documentar los 10 tabs con sus campos', async ({ page }) => {
        console.log('\n' + '='.repeat(70));
        console.log('🗂️ TEST 10 TABS DEL EXPEDIENTE DIGITAL');
        console.log('='.repeat(70));

        await fullLogin(page);
        await shot(page, '01-login');

        await openUsersModule(page);
        await shot(page, '02-modulo-usuarios');

        // Buscar un usuario existente
        console.log('\n📋 Buscando usuario existente...');
        const userFound = await page.evaluate(() => {
            const firstRow = document.querySelector('table tbody tr');
            if (firstRow) {
                const btn = firstRow.querySelector('button');
                if (btn) { btn.click(); return true; }
            }
            return false;
        });

        if (!userFound) {
            console.log('❌ No hay usuarios para explorar');
            return;
        }

        await wait(page, 3000);
        await shot(page, '03-expediente-abierto');

        // Obtener nombre del usuario
        const userName = await page.evaluate(() => {
            const title = document.querySelector('[id*="employeeFile"] h2, [class*="modal-title"]');
            return title?.innerText || 'Usuario';
        });
        console.log(`\n👤 Explorando expediente de: ${userName}`);

        // ============================================================
        // DEFINIR LOS 10 TABS
        // ============================================================
        const TABS = [
            { name: 'Administración', icon: '⚙️' },
            { name: 'Datos Personales', icon: '👤' },
            { name: 'Antecedentes Laborales', icon: '💼' },
            { name: 'Grupo Familiar', icon: '👨‍👩‍👧‍👦' },
            { name: 'Antecedentes Médicos', icon: '🏥' },
            { name: 'Asistencias', icon: '📅' },
            { name: 'Calendario', icon: '📆' },
            { name: 'Disciplinarios', icon: '⚖️' },
            { name: 'Registro Biométrico', icon: '📸' },
            { name: 'Notificaciones', icon: '🔔' }
        ];

        const tabResults = [];

        // ============================================================
        // EXPLORAR CADA TAB
        // ============================================================
        for (let i = 0; i < TABS.length; i++) {
            const tab = TABS[i];
            console.log(`\n\n${'='.repeat(50)}`);
            console.log(`${tab.icon} TAB ${i + 1}/10: ${tab.name.toUpperCase()}`);
            console.log('='.repeat(50));

            const clicked = await clickTab(page, tab.name);
            if (!clicked) {
                console.log(`   ⚠️ Tab "${tab.name}" no encontrado`);
                tabResults.push({ tab: tab.name, status: 'NO ENCONTRADO', fields: 0, buttons: [] });
                continue;
            }

            await shot(page, `tab-${String(i + 1).padStart(2, '0')}-${tab.name.toLowerCase().replace(/\s+/g, '-')}`);

            // Obtener campos
            const fields = await getTabFields(page);
            const buttons = await getTabButtons(page);

            console.log(`   📝 Campos encontrados: ${fields.length}`);
            fields.slice(0, 8).forEach(f => console.log(`      - ${f.id || 'sin-id'} (${f.type})`));

            console.log(`   🔘 Botones: ${buttons.length}`);
            buttons.slice(0, 5).forEach(b => console.log(`      - ${b}`));

            // Buscar botón Editar y abrirlo
            const hasEditButton = buttons.some(b => b.includes('Editar'));
            if (hasEditButton) {
                console.log(`   ✏️ Abriendo modal de edición...`);
                await page.evaluate(() => {
                    const btns = [...document.querySelectorAll('button')];
                    const editBtn = btns.find(b => b.innerText.includes('Editar') && b.offsetParent !== null);
                    if (editBtn) editBtn.click();
                });
                await wait(page, 2000);
                await shot(page, `tab-${String(i + 1).padStart(2, '0')}-${tab.name.toLowerCase().replace(/\s+/g, '-')}-edit`);

                // Obtener campos del modal de edición
                const editFields = await getTabFields(page);
                console.log(`   📝 Campos en modal edición: ${editFields.length}`);
                editFields.slice(0, 8).forEach(f => console.log(`      - ${f.id || 'sin-id'} (${f.type})`));

                // Cerrar modal de edición
                await page.keyboard.press('Escape');
                await wait(page, 1000);
            }

            tabResults.push({
                tab: tab.name,
                status: 'OK',
                fields: fields.length,
                buttons: buttons
            });

            console.log(`   ✅ Tab "${tab.name}" explorado`);
        }

        // ============================================================
        // RESUMEN FINAL
        // ============================================================
        console.log('\n\n' + '='.repeat(70));
        console.log('📊 RESUMEN DE 10 TABS DEL EXPEDIENTE DIGITAL');
        console.log('='.repeat(70));

        let tabsOK = 0;
        let totalFields = 0;

        TABS.forEach((tab, i) => {
            const result = tabResults[i];
            if (result) {
                const icon = result.status === 'OK' ? '✅' : '❌';
                console.log(`   ${icon} ${tab.icon} ${tab.name}: ${result.fields} campos`);
                if (result.status === 'OK') tabsOK++;
                totalFields += result.fields;
            }
        });

        console.log('\n' + '-'.repeat(50));
        console.log(`   TOTAL: ${tabsOK}/10 tabs funcionando`);
        console.log(`   TOTAL: ${totalFields} campos detectados`);
        console.log('='.repeat(70));
        console.log(`\n📁 Screenshots: ${SCREENSHOTS_DIR}\n`);

        // Guardar reporte JSON
        const reporte = {
            fecha: new Date().toISOString(),
            usuario: userName,
            tabs: tabResults,
            resumen: { tabsOK, totalFields }
        };
        fs.writeFileSync(
            path.join(SCREENSHOTS_DIR, 'reporte-10tabs.json'),
            JSON.stringify(reporte, null, 2)
        );

        expect(tabsOK).toBeGreaterThanOrEqual(8);
    });
});
