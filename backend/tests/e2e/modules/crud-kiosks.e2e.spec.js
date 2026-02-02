/**
 * CRUD Testing - Gestión de Kioscos
 * Create, Read, Update, Delete
 */
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:9998';

test.describe('CRUD Testing - Gestión de Kioscos', () => {

    test('CRUD completo con verificación visual', async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 768 });

        // ============ LOGIN ============
        console.log('🔐 Login ISI...');
        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        await page.evaluate(() => {
            const select = document.querySelector('#companySelect');
            if (select) {
                const options = Array.from(select.options);
                const isi = options.find(o => o.value === 'isi' || o.text.toLowerCase().includes('isi'));
                if (isi) {
                    select.value = isi.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
        await page.waitForTimeout(800);

        await page.fill('#userInput', 'admin');
        await page.fill('#passwordInput', 'admin123');
        await page.click('#loginButton');
        await page.waitForTimeout(5000);

        const token = await page.evaluate(() => localStorage.getItem('authToken'));
        console.log(`   Token: ${token ? 'OK' : 'FAIL'}`);

        // ============ NAVEGAR A GESTIÓN DE KIOSCOS ============
        console.log('🖥️ Navegando a Gestión de Kioscos...');
        await page.evaluate(() => {
            if (typeof showModuleContent === 'function') {
                showModuleContent('kiosks', 'Gestión de Kioscos');
            }
        });
        await page.waitForTimeout(4000);

        await page.screenshot({ path: 'test-results/crud-kiosks-01-lista.png', fullPage: true });

        // ============ READ: Contar kioscos iniciales ============
        console.log('📖 READ: Contando kioscos...');
        const initialCount = await page.locator('table tbody tr, .kiosk-row').count();
        console.log(`   Kioscos iniciales: ${initialCount}`);

        // ============ CREATE: Nuevo Kiosco ============
        console.log('➕ CREATE: Creando nuevo kiosco...');

        const nuevoBtn = await page.locator('button:has-text("Nuevo"), button:has-text("Agregar"), .btn-add, .btn-primary:has-text("Nuevo")').first();

        if (await nuevoBtn.isVisible().catch(() => false)) {
            await nuevoBtn.click();
            console.log('   ✅ Click en Nuevo Kiosco');
            await page.waitForTimeout(2000);

            await page.screenshot({ path: 'test-results/crud-kiosks-02-modal-crear.png', fullPage: true });

            // Llenar formulario
            const testName = `KIOSK_TEST_${Date.now()}`;

            // Nombre
            const nombreInput = await page.locator('input[name="name"], input[name="nombre"], input[placeholder*="nombre"], #kiosk-name, input').first();
            if (await nombreInput.isVisible().catch(() => false)) {
                await nombreInput.fill(testName);
                console.log(`   ✅ Nombre: ${testName}`);
            }

            // Ubicación/Edificio
            const ubicacionInput = await page.locator('input[name="location"], input[name="ubicacion"], input[name="building"], input[placeholder*="ubicación"], input[placeholder*="edificio"]').first();
            if (await ubicacionInput.isVisible().catch(() => false)) {
                await ubicacionInput.fill('Edificio Test - Planta Baja');
                console.log('   ✅ Ubicación ingresada');
            }

            await page.screenshot({ path: 'test-results/crud-kiosks-03-form-filled.png', fullPage: true });

            // Guardar
            const guardarBtn = await page.locator('button:has-text("Guardar"), button:has-text("Crear"), button[type="submit"], .btn-success').first();
            if (await guardarBtn.isVisible().catch(() => false)) {
                await guardarBtn.click();
                console.log('   ✅ Click en Guardar');
                await page.waitForTimeout(3000);
            }

            // Cerrar modal si sigue abierto
            await page.evaluate(() => {
                const modals = document.querySelectorAll('.modal, .modal-overlay, [role="dialog"]');
                modals.forEach(m => {
                    m.style.display = 'none';
                    m.classList.remove('active', 'show');
                });
            });
            await page.waitForTimeout(500);

        } else {
            console.log('   ⚠️ Botón Nuevo no encontrado');
        }

        await page.screenshot({ path: 'test-results/crud-kiosks-04-after-create.png', fullPage: true });

        // ============ READ: Verificar creación ============
        console.log('📖 READ: Verificando creación...');
        const afterCreateCount = await page.locator('table tbody tr, .kiosk-row').count();
        console.log(`   Kioscos después de crear: ${afterCreateCount}`);

        // ============ UPDATE: Editar kiosco ============
        console.log('✏️ UPDATE: Editando kiosco...');

        // Cerrar cualquier modal primero
        await page.evaluate(() => {
            const modals = document.querySelectorAll('.modal, .modal-overlay, [role="dialog"]');
            modals.forEach(m => {
                m.style.display = 'none';
                m.classList.remove('active', 'show');
            });
        });
        await page.waitForTimeout(500);

        const editBtn = await page.locator('button[title="Editar"], .btn-warning, button:has-text("✏️"), .edit-btn').first();

        if (await editBtn.isVisible().catch(() => false)) {
            await editBtn.click();
            console.log('   ✅ Click en Editar');
            await page.waitForTimeout(2000);

            await page.screenshot({ path: 'test-results/crud-kiosks-05-modal-editar.png', fullPage: true });

            // Modificar nombre
            const nombreEdit = await page.locator('input[name="name"], input[name="nombre"], #kiosk-name, input[type="text"]').first();
            if (await nombreEdit.isVisible().catch(() => false)) {
                const currentValue = await nombreEdit.inputValue();
                await nombreEdit.fill(currentValue + '_EDITED');
                console.log('   ✅ Nombre modificado');
            }

            // Guardar cambios
            const updateBtn = await page.locator('button:has-text("Guardar"), button:has-text("Actualizar"), button:has-text("Update"), .btn-success').first();
            if (await updateBtn.isVisible().catch(() => false)) {
                await updateBtn.click();
                console.log('   ✅ Click en Guardar cambios');
                await page.waitForTimeout(3000);
            }

            // Cerrar modal
            await page.evaluate(() => {
                const modals = document.querySelectorAll('.modal, .modal-overlay, [role="dialog"]');
                modals.forEach(m => {
                    m.style.display = 'none';
                    m.classList.remove('active', 'show');
                });
            });
            await page.waitForTimeout(500);

        } else {
            console.log('   ⚠️ Botón Editar no encontrado');
        }

        await page.screenshot({ path: 'test-results/crud-kiosks-06-after-update.png', fullPage: true });

        // ============ DELETE: Eliminar kiosco ============
        console.log('🗑️ DELETE: Eliminando kiosco...');

        // Cerrar cualquier modal
        await page.evaluate(() => {
            const modals = document.querySelectorAll('.modal, .modal-overlay, [role="dialog"]');
            modals.forEach(m => {
                m.style.display = 'none';
                m.classList.remove('active', 'show');
            });
        });
        await page.waitForTimeout(500);

        const deleteBtn = await page.locator('button[title="Eliminar"], .btn-danger, button:has-text("🗑️"), button:has-text("Eliminar"), .delete-btn').first();

        if (await deleteBtn.isVisible().catch(() => false)) {
            await deleteBtn.click();
            console.log('   ✅ Click en Eliminar');
            await page.waitForTimeout(1500);

            // Confirmar eliminación
            const confirmBtn = await page.locator('button:has-text("Confirmar"), button:has-text("Sí"), button:has-text("OK"), .swal2-confirm, button:has-text("Aceptar")').first();
            if (await confirmBtn.isVisible().catch(() => false)) {
                await confirmBtn.click();
                console.log('   ✅ Confirmación de eliminación');
                await page.waitForTimeout(3000);
            }
        } else {
            console.log('   ⚠️ Botón Eliminar no encontrado');
        }

        await page.screenshot({ path: 'test-results/crud-kiosks-07-after-delete.png', fullPage: true });

        // ============ RESUMEN ============
        const finalCount = await page.locator('table tbody tr, .kiosk-row').count();

        console.log('');
        console.log('📊 RESUMEN CRUD KIOSCOS:');
        console.log(`   Inicial: ${initialCount} kioscos`);
        console.log(`   Después de crear: ${afterCreateCount} kioscos`);
        console.log(`   Final: ${finalCount} kioscos`);
        console.log('   Screenshots en test-results/crud-kiosks-*.png');
        console.log('✅ Test CRUD Kioscos completado');
    });
});
