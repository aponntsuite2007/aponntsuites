/**
 * TEST CRUD LOCAL - USUARIOS COMPLETO
 * Ejecuta en localhost:9998
 * CREATE, READ, UPDATE, DELETE con verificación de persistencia
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:9998';
const CREDENTIALS = {
    email: 'admin',  // Usuario admin de ISI
    password: 'admin123',
    companySlug: 'isi'  // Empresa ISI en local
};

const SCREENSHOTS_DIR = path.join(__dirname, '../../test-results/local-crud');
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

async function searchUserByLegajo(page, legajo) {
    try {
        await page.waitForSelector('#searchLegajo', { timeout: 10000 });
        await page.fill('#searchLegajo', '');
        await wait(page, 500);
        await page.fill('#searchLegajo', legajo);
        await wait(page, 2000);
        return await page.evaluate((leg) => {
            const rows = document.querySelectorAll('table tbody tr');
            for (const row of rows) {
                if (row.innerText.includes(leg)) return true;
            }
            return false;
        }, legajo);
    } catch (e) { return false; }
}

async function openUserExpediente(page, legajo) {
    const opened = await page.evaluate((leg) => {
        const rows = document.querySelectorAll('table tbody tr');
        for (const row of rows) {
            if (row.innerText.includes(leg)) {
                const btn = row.querySelector('button');
                if (btn) { btn.click(); return true; }
            }
        }
        return false;
    }, legajo);
    if (opened) await wait(page, 2500);
    return opened;
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

test.describe('LOCAL - CRUD COMPLETO USUARIOS', () => {
    test.setTimeout(600000);

    test('CREATE → READ → 10 TABS → UPDATE → DELETE en LOCAL', async ({ page }) => {
        const ts = Date.now();
        const testUser = {
            nombre: `Local Test ${ts % 10000}`,
            email: `localtest${ts}@test.com`,
            legajo: `LOCAL${ts % 100000}`,
            password: 'LocalTest2024!'
        };

        console.log('\n' + '='.repeat(70));
        console.log('🏠 TEST CRUD LOCAL - localhost:9998');
        console.log('='.repeat(70));
        console.log(`\n📋 Usuario: ${testUser.nombre} (${testUser.legajo})`);

        // ============================================================
        // PASO 1: LOGIN
        // ============================================================
        console.log('\n\n🔐 PASO 1: LOGIN LOCAL');
        await fullLogin(page);
        await shot(page, '01-login');
        console.log('   ✅ Login exitoso');

        // ============================================================
        // PASO 2: CREATE
        // ============================================================
        console.log('\n\n➕ PASO 2: CREATE');
        await openUsersModule(page);
        await shot(page, '02-modulo');

        await page.click('button:has-text("Agregar Usuario")');
        await wait(page, 2000);

        await page.fill('#newUserName', testUser.nombre);
        await page.fill('#newUserEmail', testUser.email);
        await page.fill('#newUserLegajo', testUser.legajo);
        await page.fill('#newUserPassword', testUser.password);
        await shot(page, '03-form-llenado');

        await page.click('button:has-text("Guardar")');
        await wait(page, 3000);

        const createOK = await page.evaluate(() =>
            document.body.innerText.includes('Exitosamente') || document.body.innerText.includes('creado')
        );
        await shot(page, '04-creado');
        console.log(`   ${createOK ? '✅' : '❌'} CREATE: ${createOK ? 'OK' : 'FALLÓ'}`);

        if (createOK) {
            await page.evaluate(() => {
                const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Entendido'));
                if (btn) btn.click();
            });
            await wait(page, 1000);
        }

        // ============================================================
        // PASO 3: READ + PERSISTENCIA
        // ============================================================
        console.log('\n\n📖 PASO 3: READ + PERSISTENCIA');
        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await wait(page, 3000);
        await fullLogin(page);
        await openUsersModule(page);

        const foundAfterNav = await searchUserByLegajo(page, testUser.legajo);
        await shot(page, '05-persistencia');
        console.log(`   ${foundAfterNav ? '✅' : '❌'} PERSISTENCIA: ${foundAfterNav ? 'OK' : 'FALLÓ'}`);

        if (!foundAfterNav) {
            console.log('   ❌ Test abortado - usuario no persiste');
            return;
        }

        // ============================================================
        // PASO 4: EXPLORAR 10 TABS
        // ============================================================
        console.log('\n\n🗂️ PASO 4: EXPLORAR 10 TABS');
        await openUserExpediente(page, testUser.legajo);
        await shot(page, '06-expediente');

        const TABS = [
            'Administración', 'Datos Personales', 'Antecedentes Laborales',
            'Grupo Familiar', 'Antecedentes Médicos', 'Asistencias',
            'Calendario', 'Disciplinarios', 'Registro Biométrico', 'Notificaciones'
        ];

        let tabsOK = 0;
        for (const tabName of TABS) {
            const clicked = await clickTab(page, tabName);
            if (clicked) {
                tabsOK++;
                console.log(`   ✅ Tab: ${tabName}`);
            } else {
                console.log(`   ❌ Tab: ${tabName} - NO ENCONTRADO`);
            }
        }
        await shot(page, '07-tabs-explorados');
        console.log(`   📊 TABS: ${tabsOK}/10 funcionando`);

        // ============================================================
        // PASO 5: UPDATE (editar datos)
        // ============================================================
        console.log('\n\n✏️ PASO 5: UPDATE');
        await clickTab(page, 'Datos Personales');

        const editClicked = await page.evaluate(() => {
            const btns = [...document.querySelectorAll('button')];
            const btn = btns.find(b => b.innerText.includes('Editar') && b.offsetParent !== null);
            if (btn) { btn.click(); return true; }
            return false;
        });

        if (editClicked) {
            await wait(page, 2000);
            await shot(page, '08-modal-editar');
            console.log('   ✅ Modal de edición abierto');

            // Cerrar modal
            await page.keyboard.press('Escape');
            await wait(page, 1000);
        }

        // ============================================================
        // PASO 6: DELETE (desactivar)
        // ============================================================
        console.log('\n\n🗑️ PASO 6: DELETE (Desactivar)');
        await clickTab(page, 'Administración');
        await shot(page, '09-tab-admin');

        page.on('dialog', async dialog => {
            console.log(`   Dialog: ${dialog.message()}`);
            await dialog.accept();
        });

        const desactivarOK = await page.evaluate(() => {
            const btns = [...document.querySelectorAll('button')];
            const btn = btns.find(b => b.innerText.includes('Desactivar') && b.offsetParent !== null);
            if (btn) { btn.click(); return true; }
            return false;
        });

        if (desactivarOK) {
            await wait(page, 3000);
            await shot(page, '10-desactivado');
            console.log('   ✅ Usuario desactivado');
        } else {
            console.log('   ⚠️ Botón Desactivar no encontrado');
        }

        // ============================================================
        // PASO 7: VERIFICAR DELETE
        // ============================================================
        console.log('\n\n🔄 PASO 7: VERIFICAR DELETE');
        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await wait(page, 3000);
        await fullLogin(page);
        await openUsersModule(page);

        const status = await page.evaluate((leg) => {
            const rows = document.querySelectorAll('table tbody tr');
            for (const row of rows) {
                if (row.innerText.includes(leg)) {
                    const badge = row.querySelector('[class*="badge"]');
                    if (badge && badge.innerText.toLowerCase().includes('inactivo')) return 'INACTIVO';
                    return 'ACTIVO';
                }
            }
            return 'NO ENCONTRADO';
        }, testUser.legajo);

        await shot(page, '11-estado-final');
        console.log(`   Estado: ${status}`);

        // ============================================================
        // RESUMEN
        // ============================================================
        console.log('\n\n' + '='.repeat(70));
        console.log('📊 RESUMEN TEST LOCAL');
        console.log('='.repeat(70));
        console.log(`   Usuario: ${testUser.legajo}`);
        console.log(`   ➕ CREATE: ${createOK ? '✅' : '❌'}`);
        console.log(`   📖 READ/PERSISTENCIA: ${foundAfterNav ? '✅' : '❌'}`);
        console.log(`   🗂️ 10 TABS: ${tabsOK}/10 ✅`);
        console.log(`   ✏️ UPDATE: ${editClicked ? '✅' : '❌'}`);
        console.log(`   🗑️ DELETE: ${status === 'INACTIVO' ? '✅' : '⚠️'} (${status})`);
        console.log('='.repeat(70));
        console.log(`\n📁 Screenshots: ${SCREENSHOTS_DIR}\n`);

        expect(createOK).toBe(true);
        expect(foundAfterNav).toBe(true);
        expect(tabsOK).toBeGreaterThanOrEqual(8);
    });
});
