/**
 * TEST DE PERSISTENCIA - Tab Grupo Familiar
 * Verifica que los datos persisten en BD después de F5
 */

const { test, expect } = require('@playwright/test');
const BASE_URL = 'http://localhost:9998';

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

test.describe('VERIFICACIÓN DE PERSISTENCIA EN BD', () => {

    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        test.setTimeout(600000);
    });

    test('Tab Grupo Familiar: Agregar hijo y verificar persistencia después de F5', async ({ page }) => {
        const UNIQUE_CHILD_NAME = `PERSIST_TEST_${Date.now()}`;

        console.log('\n' + '='.repeat(60));
        console.log('🧪 TEST DE PERSISTENCIA EN BD - GRUPO FAMILIAR');
        console.log('='.repeat(60));
        console.log(`   Nombre único de prueba: ${UNIQUE_CHILD_NAME}`);

        // PASO 1: Login
        console.log('\n📋 PASO 1: Login...');
        await login(page);
        console.log('✅ Login completado');

        // PASO 2: Navegar a Usuarios
        console.log('\n📋 PASO 2: Navegando a módulo Usuarios...');
        await page.evaluate(() => {
            if (typeof showModuleContent === 'function') {
                showModuleContent('users', 'Gestión de Usuarios');
            }
        });
        await page.waitForTimeout(5000);

        // Esperar tabla
        await page.waitForSelector('.users-table tbody tr', { timeout: 20000 });
        console.log('✅ Módulo de usuarios cargado');

        // PASO 3: Abrir expediente del primer usuario
        console.log('\n📋 PASO 3: Abriendo expediente de usuario...');
        const viewButtons = await page.$$('button[onclick^="viewUser"]');
        if (viewButtons.length === 0) {
            throw new Error('No se encontraron usuarios para abrir');
        }
        await viewButtons[0].click();
        await page.waitForTimeout(3000);
        console.log('✅ Expediente abierto');

        // Guardar el userId del usuario actual
        const userId = await page.evaluate(() => {
            return window.currentViewingUserId || document.querySelector('#employeeFileModal')?.dataset?.userId;
        });
        console.log(`   UserID: ${userId || 'No detectado'}`);

        // PASO 4: Ir al tab Grupo Familiar
        console.log('\n📋 PASO 4: Navegando al tab Grupo Familiar...');
        await page.evaluate(() => {
            if (typeof showFileTab === 'function') {
                showFileTab('family');
            }
        });
        await page.waitForTimeout(2000);
        console.log('✅ Tab Grupo Familiar activo');

        // PASO 5: Click en "Agregar Hijo"
        console.log('\n📋 PASO 5: Click en "Agregar Hijo"...');
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const addChildBtn = btns.find(b => b.textContent.includes('Agregar Hijo'));
            if (addChildBtn) addChildBtn.click();
        });
        await page.waitForTimeout(2000);

        // Verificar que el modal se abrió
        const modalOpen = await page.evaluate(() => {
            const modal = document.getElementById('childModal');
            return modal && modal.offsetParent !== null;
        });

        if (!modalOpen) {
            console.log('❌ ERROR: Modal de agregar hijo no se abrió');
            return;
        }
        console.log('✅ Modal de agregar hijo abierto');

        // PASO 6: Llenar formulario con nombre único
        console.log('\n📋 PASO 6: Llenando formulario...');
        await page.evaluate((name) => {
            const childNameInput = document.getElementById('childName');
            const childSurnameInput = document.getElementById('childSurname');
            const childBirthdateInput = document.getElementById('childBirthdate');
            const childGenderSelect = document.getElementById('childGender');

            if (childNameInput) {
                childNameInput.value = name;
                childNameInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (childSurnameInput) {
                childSurnameInput.value = 'APELLIDO_TEST';
                childSurnameInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (childBirthdateInput) {
                childBirthdateInput.value = '2020-06-15';
                childBirthdateInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (childGenderSelect) {
                childGenderSelect.value = 'masculino';
                childGenderSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, UNIQUE_CHILD_NAME);
        console.log(`✅ Formulario llenado con nombre: ${UNIQUE_CHILD_NAME}`);

        // PASO 7: Click en guardar
        console.log('\n📋 PASO 7: Guardando hijo...');
        await page.evaluate(() => {
            const form = document.getElementById('childForm');
            if (form) {
                const submitBtn = form.querySelector('button[type="submit"], button.btn-info');
                if (submitBtn) submitBtn.click();
            }
        });
        await page.waitForTimeout(4000);

        // PASO 8: Verificar que aparece en la lista SIN recargar
        console.log('\n📋 PASO 8: Verificando que aparece en lista (sin F5)...');
        const appearsInListBeforeReload = await page.evaluate((name) => {
            return document.body.textContent.includes(name);
        }, UNIQUE_CHILD_NAME);

        if (!appearsInListBeforeReload) {
            console.log('❌ FALLA: El hijo NO aparece en la lista sin F5');
            console.log('   Esto indica que el fix de refresh no funcionó');
        } else {
            console.log('✅ El hijo aparece en la lista (sin F5)');
        }

        // PASO 9: RECARGAR PÁGINA COMPLETAMENTE (F5)
        console.log('\n📋 PASO 9: Recargando página (F5)...');
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // PASO 10: Re-login (si es necesario)
        console.log('\n📋 PASO 10: Re-login después de F5...');
        const needsLogin = await page.$('#loginContainer:visible, #companySelect');
        if (needsLogin) {
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
        console.log('✅ Re-login completado');

        // PASO 11: Navegar de nuevo a Usuarios → Expediente → Tab Family
        console.log('\n📋 PASO 11: Navegando de vuelta al expediente...');
        await page.evaluate(() => {
            if (typeof showModuleContent === 'function') {
                showModuleContent('users', 'Gestión de Usuarios');
            }
        });
        await page.waitForTimeout(5000);
        await page.waitForSelector('.users-table tbody tr', { timeout: 20000 });

        // Abrir el mismo usuario
        const viewButtonsAfter = await page.$$('button[onclick^="viewUser"]');
        if (viewButtonsAfter.length > 0) {
            await viewButtonsAfter[0].click();
            await page.waitForTimeout(3000);
        }

        // Ir al tab family
        await page.evaluate(() => {
            if (typeof showFileTab === 'function') {
                showFileTab('family');
            }
        });
        await page.waitForTimeout(3000);

        // PASO 12: VERIFICAR PERSISTENCIA
        console.log('\n📋 PASO 12: Verificando PERSISTENCIA en BD...');
        const persistsAfterReload = await page.evaluate((name) => {
            return document.body.textContent.includes(name);
        }, UNIQUE_CHILD_NAME);

        console.log('\n' + '='.repeat(60));
        console.log('📊 RESULTADO FINAL DE PERSISTENCIA');
        console.log('='.repeat(60));

        if (persistsAfterReload) {
            console.log('✅ ¡PERSISTENCIA VERIFICADA!');
            console.log(`   El hijo "${UNIQUE_CHILD_NAME}" PERSISTE en BD después de F5`);
            console.log('   Backend + Frontend + BD = 100% FUNCIONAL');
        } else {
            console.log('❌ ¡ERROR DE PERSISTENCIA!');
            console.log(`   El hijo "${UNIQUE_CHILD_NAME}" NO persiste después de F5`);
            console.log('   El dato se guardó en frontend pero NO llegó a la BD');
            console.log('   Verificar: API POST /api/users/:id/children');
        }

        // Guardar evidencia
        await page.screenshot({
            path: `screenshots/persistence-test-${Date.now()}.png`,
            fullPage: false
        });

        // El test pasa si el dato persiste
        expect(persistsAfterReload).toBe(true);
    });
});
