/**
 * TEST DE EDICIÓN Y PERSISTENCIA EN TABS DEL EXPEDIENTE
 * Verifica que los cambios se guarden y persistan después de recargar
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOTS_DIR = path.join(__dirname, '../../../screenshots/users-edit-persist');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function saveScreenshot(page, name) {
    const filename = `${Date.now()}_${name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: false });
    console.log(`📸 ${filename}`);
    return filename;
}

async function login(page) {
    await page.goto(`${BASE_URL}/panel-empresa.html`);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.selectOption('#companySelect', 'isi');
    await page.waitForTimeout(1000);
    await page.fill('#userInput', 'admin');
    await page.fill('#passwordInput', 'admin123');
    await page.click('#loginButton');
    await page.waitForTimeout(6000);

    await page.evaluate(() => {
        const loginContainer = document.getElementById('loginContainer');
        if (loginContainer) loginContainer.style.cssText = 'display: none !important;';
        if (typeof showDashboard === 'function') showDashboard();
    });
    await page.waitForTimeout(2000);
}

async function navigateToUsers(page) {
    await page.evaluate(() => {
        if (typeof showModuleContent === 'function') {
            showModuleContent('users', 'Gestión de Usuarios');
        }
    });
    await page.waitForTimeout(5000);
}

async function openFirstUserExpediente(page) {
    await page.waitForSelector('.users-table tbody tr', { timeout: 10000 });
    const viewButtons = await page.$$('button[onclick^="viewUser"]');
    if (viewButtons.length > 0) {
        await viewButtons[0].click();
        await page.waitForTimeout(3000);
    }
}

async function switchToTab(page, tabName) {
    await page.evaluate((tab) => {
        if (typeof showFileTab === 'function') {
            showFileTab(tab);
        }
    }, tabName);
    await page.waitForTimeout(1500);
}

test.describe('Test de Edición y Persistencia en Tabs del Expediente', () => {

    test('TEST 1: Verificar que botón EDITAR funciona en Tab Datos Personales', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        test.setTimeout(300000);

        // Capturar errores de consola
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        await login(page);
        await navigateToUsers(page);
        await openFirstUserExpediente(page);

        // Ir al tab de Datos Personales
        await switchToTab(page, 'personal');
        await saveScreenshot(page, '01-personal-tab-inicial');

        // Buscar botón Editar de Datos Básicos
        const editButton = await page.$('button:has-text("Editar"), .btn:has-text("Editar")');

        if (editButton) {
            console.log('✅ Botón Editar encontrado, haciendo click...');
            await editButton.click();
            await page.waitForTimeout(2000);
            await saveScreenshot(page, '02-despues-click-editar');

            // Verificar si apareció un formulario o modal de edición
            const inputs = await page.$$('input[type="text"]:visible, input[name]:visible');
            console.log(`📝 Inputs visibles después de click en Editar: ${inputs.length}`);

            // Verificar si hay modal de edición
            const editModal = await page.$('.modal:visible, [class*="edit"]:visible, .form:visible');
            if (editModal) {
                console.log('✅ Modal/formulario de edición detectado');
                await saveScreenshot(page, '03-modal-edicion');
            } else {
                console.log('⚠️ No se detectó modal de edición visible');
            }

            // Verificar si la UI sigue funcional
            const uiFunctional = await page.evaluate(() => {
                const buttons = document.querySelectorAll('button:not([disabled])');
                return buttons.length > 0;
            });
            console.log(`UI funcional después de click: ${uiFunctional ? '✅' : '❌'}`);

        } else {
            console.log('⚠️ No se encontró botón Editar');
        }

        // Reportar errores de consola
        if (consoleErrors.length > 0) {
            console.log('\n❌ ERRORES DE CONSOLA:');
            consoleErrors.forEach(err => console.log(`   ${err}`));
        }
    });

    test('TEST 2: Verificar botones en Tab Grupo Familiar', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        test.setTimeout(300000);

        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        await login(page);
        await navigateToUsers(page);
        await openFirstUserExpediente(page);

        // Ir al tab Grupo Familiar
        await switchToTab(page, 'family');
        await saveScreenshot(page, '04-family-tab-inicial');

        // Buscar botón "Agregar Hijo"
        const addChildButton = await page.$('button:has-text("Agregar Hijo"), .btn:has-text("Agregar Hijo")');

        if (addChildButton) {
            console.log('✅ Botón "Agregar Hijo" encontrado');

            // Guardar estado antes del click
            const childrenBefore = await page.$$eval('.hijos-list div, [class*="hijo"]', els => els.length);
            console.log(`Hijos antes: ${childrenBefore}`);

            // Click en Agregar Hijo
            await addChildButton.click();
            await page.waitForTimeout(3000);
            await saveScreenshot(page, '05-despues-agregar-hijo');

            // Verificar si apareció formulario
            const addForm = await page.$('.modal:visible, form:visible, [class*="form"]:visible');
            if (addForm) {
                console.log('✅ Formulario de agregar hijo apareció');

                // Llenar datos de prueba
                const nameInput = await page.$('input[name*="nombre"], input[placeholder*="Nombre"], input[id*="name"]');
                if (nameInput) {
                    await nameInput.fill('HIJO TEST ' + Date.now());
                    console.log('✅ Campo nombre llenado');
                }

                // Buscar botón guardar
                const saveButton = await page.$('button[type="submit"], button:has-text("Guardar"), .btn-primary');
                if (saveButton) {
                    console.log('🔄 Haciendo click en Guardar...');
                    await saveButton.click();
                    await page.waitForTimeout(3000);
                    await saveScreenshot(page, '06-despues-guardar-hijo');

                    // Verificar si la UI se bloqueó
                    const isBlocked = await page.evaluate(() => {
                        const overlay = document.querySelector('.modal-backdrop, .loading-overlay, [class*="block"]');
                        if (overlay && overlay.offsetParent !== null) return true;

                        // Verificar si los botones responden
                        const btns = document.querySelectorAll('button');
                        return btns.length === 0;
                    });

                    if (isBlocked) {
                        console.log('❌ BUG DETECTADO: UI BLOQUEADA después de guardar');
                    } else {
                        console.log('✅ UI sigue funcional después de guardar');
                    }
                }
            } else {
                console.log('⚠️ No apareció formulario después de click en Agregar Hijo');
            }
        } else {
            console.log('⚠️ Botón "Agregar Hijo" no encontrado');
        }

        if (consoleErrors.length > 0) {
            console.log('\n❌ ERRORES DE CONSOLA:');
            consoleErrors.slice(0, 5).forEach(err => console.log(`   ${err}`));
        }
    });

    test('TEST 3: Verificar persistencia - Editar y recargar página', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        test.setTimeout(300000);

        await login(page);
        await navigateToUsers(page);
        await openFirstUserExpediente(page);

        // Obtener el nombre actual del usuario
        const originalName = await page.evaluate(() => {
            const nameEl = document.querySelector('#display-fullname, [id*="fullname"], h2, .name');
            return nameEl?.textContent?.trim() || '';
        });
        console.log(`📋 Nombre original: "${originalName}"`);

        // Ir al tab Datos Personales
        await switchToTab(page, 'personal');

        // Buscar y hacer click en Editar
        const editBtn = await page.$('.btn:has-text("Editar")');
        if (editBtn) {
            await editBtn.click();
            await page.waitForTimeout(2000);

            // Buscar campo de nombre en el formulario de edición
            const firstNameInput = await page.$('input[name*="firstName"], input[id*="firstName"], input[name*="nombre"]');

            if (firstNameInput) {
                const testValue = 'TESTMOD_' + Date.now();
                console.log(`🔄 Modificando nombre a: ${testValue}`);

                await firstNameInput.fill('');
                await firstNameInput.fill(testValue);
                await saveScreenshot(page, '07-campo-modificado');

                // Buscar botón guardar
                const saveBtn = await page.$('button[type="submit"], button:has-text("Guardar"), .btn-success');
                if (saveBtn) {
                    await saveBtn.click();
                    console.log('💾 Guardando cambios...');
                    await page.waitForTimeout(3000);
                    await saveScreenshot(page, '08-despues-guardar');

                    // PASO CRÍTICO: Recargar página completamente
                    console.log('🔄 Recargando página para verificar persistencia...');
                    await page.reload();
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(3000);

                    // Volver a hacer login si es necesario
                    const needsLogin = await page.$('#loginContainer:visible, #companySelect:visible');
                    if (needsLogin) {
                        console.log('🔐 Re-autenticando...');
                        await page.selectOption('#companySelect', 'isi');
                        await page.waitForTimeout(500);
                        await page.fill('#userInput', 'admin');
                        await page.fill('#passwordInput', 'admin123');
                        await page.click('#loginButton');
                        await page.waitForTimeout(6000);

                        await page.evaluate(() => {
                            const lc = document.getElementById('loginContainer');
                            if (lc) lc.style.cssText = 'display: none !important;';
                            if (typeof showDashboard === 'function') showDashboard();
                        });
                    }

                    // Volver al módulo de usuarios
                    await navigateToUsers(page);
                    await openFirstUserExpediente(page);
                    await switchToTab(page, 'personal');
                    await saveScreenshot(page, '09-despues-reload');

                    // Verificar si el cambio persistió
                    const newName = await page.evaluate(() => {
                        const nameEl = document.querySelector('[id*="fullname"], .name, span:has-text("TESTMOD")');
                        return nameEl?.textContent?.trim() || '';
                    });

                    console.log(`📋 Nombre después de reload: "${newName}"`);

                    if (newName.includes('TESTMOD')) {
                        console.log('✅ PERSISTENCIA VERIFICADA: El cambio se guardó en BD');
                    } else {
                        console.log('❌ BUG: El cambio NO persistió después de recargar');
                        console.log('   Esperado: contener "TESTMOD"');
                        console.log('   Actual: ' + newName);
                    }
                }
            } else {
                console.log('⚠️ No se encontró campo de nombre para editar');
            }
        }
    });

    test('TEST 4: Mapeo completo de botones de acción por tab', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        test.setTimeout(300000);

        await login(page);
        await navigateToUsers(page);
        await openFirstUserExpediente(page);

        const tabs = ['admin', 'personal', 'work', 'family', 'medical', 'disciplinary', 'biometric'];

        console.log('\n' + '='.repeat(70));
        console.log('📋 MAPEO DE BOTONES DE ACCIÓN POR TAB');
        console.log('='.repeat(70));

        for (const tabName of tabs) {
            await switchToTab(page, tabName);

            const buttons = await page.$$eval(`#${tabName}-tab button`, btns =>
                btns.map(b => ({
                    text: b.textContent?.trim().substring(0, 40),
                    onclick: b.getAttribute('onclick')?.substring(0, 50) || 'none',
                    hasHandler: !!(b.onclick || b.getAttribute('onclick')),
                    visible: b.offsetParent !== null,
                    disabled: b.disabled
                }))
            );

            console.log(`\n📑 Tab: ${tabName.toUpperCase()}`);
            console.log(`   Total botones: ${buttons.length}`);

            const actionButtons = buttons.filter(b => b.visible && !b.disabled);
            actionButtons.forEach((btn, i) => {
                const hasAction = btn.hasHandler ? '✅' : '⚠️';
                console.log(`   ${hasAction} [${i + 1}] "${btn.text}" → ${btn.onclick}`);
            });

            // Identificar botones sin handler
            const deadButtons = buttons.filter(b => b.visible && !b.hasHandler);
            if (deadButtons.length > 0) {
                console.log(`   ⚠️ Botones sin handler: ${deadButtons.length}`);
                deadButtons.forEach(b => console.log(`      - "${b.text}"`));
            }
        }

        console.log('\n' + '='.repeat(70));
    });
});
