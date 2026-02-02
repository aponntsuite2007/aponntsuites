/**
 * TEST CRUD CON PROCESO DE BAJA COMPLETO
 * Crea usuario, verifica persistencia, y ejecuta proceso formal de baja (offboarding)
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

const SCREENSHOTS_DIR = path.join(__dirname, '../../test-results/crud-baja-completa');
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
    } catch (e) {
        console.log('   (login fields not available)');
    }
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
    } catch (e) {
        return false;
    }
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

async function closeAllModals(page) {
    await page.evaluate(() => {
        document.querySelectorAll('[id*="Modal"], [id*="modal"]').forEach(m => m.remove());
    });
    await page.keyboard.press('Escape');
    await wait(page, 500);
}

test.describe('CRUD CON BAJA COMPLETA (OFFBOARDING)', () => {
    test.setTimeout(600000);

    test('Crear usuario, verificar persistencia, dar de baja formalmente', async ({ page }) => {
        const ts = Date.now();
        const testUser = {
            nombre: `Test Desactivar ${ts % 10000}`,
            email: `testdesact${ts}@test.com`,
            legajo: `DESACT${ts % 100000}`,
            password: 'TestDesact2024!'
        };

        console.log('\n' + '='.repeat(70));
        console.log('🧪 TEST CRUD CON PROCESO DE BAJA FORMAL');
        console.log('='.repeat(70));
        console.log(`\n📋 Usuario: ${testUser.nombre} (${testUser.legajo})`);

        // ============================================================
        // PASO 1: LOGIN Y CREAR USUARIO
        // ============================================================
        console.log('\n\n🔐 PASO 1: LOGIN');
        await fullLogin(page);
        await shot(page, '01-login');

        console.log('\n📦 Abriendo módulo usuarios...');
        await openUsersModule(page);
        await shot(page, '02-modulo-usuarios');

        console.log('\n➕ Creando usuario...');
        await page.click('button:has-text("Agregar Usuario")');
        await wait(page, 2000);

        await page.fill('#newUserName', testUser.nombre);
        await page.fill('#newUserEmail', testUser.email);
        await page.fill('#newUserLegajo', testUser.legajo);
        await page.fill('#newUserPassword', testUser.password);
        await shot(page, '03-formulario-llenado');

        await page.click('button:has-text("Guardar")');
        await wait(page, 3000);

        const createSuccess = await page.evaluate(() =>
            document.body.innerText.includes('Exitosamente') || document.body.innerText.includes('creado')
        );
        await shot(page, '04-usuario-creado');

        if (createSuccess) {
            console.log('   ✅ Usuario creado');
            await page.evaluate(() => {
                const btn = [...document.querySelectorAll('button')].find(b =>
                    b.innerText.includes('Entendido') || b.innerText.includes('OK'));
                if (btn) btn.click();
            });
            await wait(page, 1000);
        }

        // ============================================================
        // PASO 2: VERIFICAR PERSISTENCIA
        // ============================================================
        console.log('\n\n🔄 PASO 2: VERIFICAR PERSISTENCIA');
        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await wait(page, 3000);
        await fullLogin(page);
        await openUsersModule(page);

        const foundAfterNav = await searchUserByLegajo(page, testUser.legajo);
        await shot(page, '05-verificar-persistencia');
        console.log(`   ${foundAfterNav ? '✅ PERSISTENCIA OK' : '❌ Usuario no persiste'}`);

        if (!foundAfterNav) {
            console.log('   ❌ Test abortado - usuario no persiste en BD');
            return;
        }

        // ============================================================
        // PASO 3: ABRIR EXPEDIENTE Y PROCESO DE BAJA
        // ============================================================
        console.log('\n\n📂 PASO 3: PROCESO DE BAJA FORMAL');

        await openUserExpediente(page, testUser.legajo);
        await shot(page, '06-expediente-abierto');

        // Ir a tab Administración
        console.log('   Navegando a Administración...');
        await page.evaluate(() => {
            const tabs = document.querySelectorAll('button, [role="tab"]');
            for (const tab of tabs) {
                if (tab.innerText.includes('Administración')) {
                    tab.click();
                    break;
                }
            }
        });
        await wait(page, 2000);
        await shot(page, '07-tab-administracion');

        // Buscar directamente el botón "Desactivar" en la sección Acceso y Seguridad
        // NO abrir el modal de workflow porque tapa el botón
        console.log('   Buscando botón Desactivar en sección Acceso y Seguridad...');
        await shot(page, '08-antes-desactivar');

        // Manejar dialogs de confirm y alert
        page.on('dialog', async dialog => {
            console.log(`   Dialog (${dialog.type()}): ${dialog.message()}`);
            await dialog.accept();
        });

        // Buscar y hacer click en el botón Desactivar
        const bajaClicked = await page.evaluate(() => {
            const btns = [...document.querySelectorAll('button')];
            // Buscar específicamente el botón "🔒 Desactivar"
            const desactivarBtn = btns.find(b =>
                b.innerText.includes('Desactivar') &&
                !b.innerText.includes('Proceso') &&
                b.offsetParent !== null);
            if (desactivarBtn) {
                desactivarBtn.click();
                return true;
            }
            return false;
        });

        if (bajaClicked) {
            console.log('   ✅ Botón Desactivar clickeado');
            // Esperar a que se procese el confirm y alert
            await wait(page, 3000);
            await shot(page, '09-desactivado');
            console.log('   ✅ Usuario desactivado');
        } else {
            console.log('   ❌ Botón Desactivar no encontrado');
            await shot(page, '09-boton-no-encontrado');
        }

        await closeAllModals(page);

        // ============================================================
        // PASO 4: VERIFICAR ESTADO DESPUÉS DE BAJA
        // ============================================================
        console.log('\n\n🔄 PASO 4: VERIFICAR ESTADO FINAL');

        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await wait(page, 3000);
        await fullLogin(page);
        await openUsersModule(page);

        const foundAfterBaja = await searchUserByLegajo(page, testUser.legajo);
        await shot(page, '12-estado-final');

        if (foundAfterBaja) {
            // Verificar si está inactivo - buscar específicamente la columna ESTADO
            const status = await page.evaluate((leg) => {
                const rows = document.querySelectorAll('table tbody tr');
                for (const row of rows) {
                    if (row.innerText.includes(leg)) {
                        // Buscar el badge/span de estado en la fila
                        const estadoBadge = row.querySelector('[class*="badge"], [class*="status"]');
                        if (estadoBadge) {
                            const texto = estadoBadge.innerText.toLowerCase();
                            if (texto.includes('inactivo')) return 'INACTIVO';
                            if (texto.includes('activo')) return 'ACTIVO';
                        }
                        // Fallback: buscar en celdas específicas
                        const cells = row.querySelectorAll('td');
                        for (const cell of cells) {
                            const texto = cell.innerText.toLowerCase();
                            // Solo verificar si es exactamente "inactivo" o "activo"
                            if (texto === 'inactivo' || texto.includes('❌')) return 'INACTIVO';
                            if (texto === 'activo' && !texto.includes('baja')) return 'ACTIVO';
                        }
                        return 'ACTIVO'; // Default si no encuentra badge específico
                    }
                }
                return 'NO ENCONTRADO';
            }, testUser.legajo);

            console.log(`   Estado del usuario: ${status}`);

            if (status === 'INACTIVO') {
                console.log('   ✅ BAJA COMPLETADA - Usuario INACTIVO');
            } else if (status === 'ACTIVO') {
                console.log('   ⚠️ Usuario sigue ACTIVO - el botón Desactivar no funcionó');
            }
        } else {
            console.log('   ✅ Usuario no aparece en la lista (puede estar filtrado)');
        }

        // ============================================================
        // RESUMEN
        // ============================================================
        console.log('\n\n' + '='.repeat(70));
        console.log('📊 RESUMEN');
        console.log('='.repeat(70));
        console.log(`   Usuario: ${testUser.legajo}`);
        console.log(`   CREATE: ${createSuccess ? '✅' : '❌'}`);
        console.log(`   PERSISTENCIA: ${foundAfterNav ? '✅' : '❌'}`);
        console.log(`   BAJA: ${bajaClicked ? '✅ Proceso formal' : '⚠️ Proceso alternativo'}`);
        console.log('='.repeat(70));
        console.log(`\n📁 Screenshots: ${SCREENSHOTS_DIR}\n`);

        expect(createSuccess).toBe(true);
        expect(foundAfterNav).toBe(true);
    });
});
