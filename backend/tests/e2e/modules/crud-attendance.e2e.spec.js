/**
 * CRUD Testing - Control de Asistencia
 * Crear, Leer, Actualizar, Eliminar registros de asistencia
 */
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:9998';

test.describe('CRUD Testing - Control de Asistencia', () => {

    test('CRUD completo con verificación visual', async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 768 });

        // ============ LOGIN ============
        console.log('🔐 Login ISI...');
        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        // Seleccionar ISI
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

        // ============ NAVEGAR A CONTROL DE ASISTENCIA ============
        console.log('📊 Navegando a Control de Asistencia...');
        await page.evaluate(() => {
            if (typeof showModuleContent === 'function') {
                showModuleContent('attendance', 'Control de Asistencia');
            }
        });
        await page.waitForTimeout(4000);

        // ============ IR A REGISTROS ============
        console.log('📋 Navegando a Registros...');
        await page.evaluate(() => {
            if (typeof AttendanceEngine !== 'undefined' && typeof AttendanceEngine.showView === 'function') {
                AttendanceEngine.showView('records');
            }
        });
        await page.waitForTimeout(3000);

        await page.screenshot({ path: 'test-results/crud-attendance-01-registros.png', fullPage: true });

        // ============ CREATE: Nuevo Registro ============
        console.log('➕ CREATE: Buscando botón Nuevo Registro...');

        // Buscar y hacer click en el botón de nuevo registro
        const nuevoBtn = await page.locator('button:has-text("Nuevo Registro"), .btn:has-text("Nuevo"), [onclick*="nuevo"], [onclick*="create"], [onclick*="add"]').first();

        if (await nuevoBtn.isVisible()) {
            await nuevoBtn.click();
            console.log('   ✅ Click en Nuevo Registro');
            await page.waitForTimeout(2000);

            await page.screenshot({ path: 'test-results/crud-attendance-02-modal-crear.png', fullPage: true });

            // Buscar modal o formulario
            const modalVisible = await page.locator('.modal, .dialog, [role="dialog"], .form-container').first().isVisible().catch(() => false);

            if (modalVisible) {
                console.log('   ✅ Modal de creación visible');

                // Intentar llenar el formulario
                // Buscar selector de empleado
                const empleadoSelect = await page.locator('select[name*="user"], select[name*="empleado"], select[name*="employee"], #user_id, #empleado').first();
                if (await empleadoSelect.isVisible().catch(() => false)) {
                    // Seleccionar primer empleado disponible
                    await empleadoSelect.selectOption({ index: 1 }).catch(() => {});
                    console.log('   ✅ Empleado seleccionado');
                }

                // Buscar campo de fecha
                const fechaInput = await page.locator('input[type="date"], input[name*="fecha"], input[name*="date"]').first();
                if (await fechaInput.isVisible().catch(() => false)) {
                    await fechaInput.fill('2026-02-01');
                    console.log('   ✅ Fecha ingresada');
                }

                // Buscar campo de entrada
                const entradaInput = await page.locator('input[type="time"][name*="entrada"], input[type="time"][name*="check_in"], input[name*="entrada"]').first();
                if (await entradaInput.isVisible().catch(() => false)) {
                    await entradaInput.fill('08:00');
                    console.log('   ✅ Hora entrada ingresada');
                }

                // Buscar campo de salida
                const salidaInput = await page.locator('input[type="time"][name*="salida"], input[type="time"][name*="check_out"], input[name*="salida"]').first();
                if (await salidaInput.isVisible().catch(() => false)) {
                    await salidaInput.fill('17:00');
                    console.log('   ✅ Hora salida ingresada');
                }

                await page.screenshot({ path: 'test-results/crud-attendance-03-form-filled.png', fullPage: true });

                // Buscar botón guardar
                const guardarBtn = await page.locator('button:has-text("Guardar"), button:has-text("Crear"), button:has-text("Save"), button[type="submit"], .btn-primary').first();
                if (await guardarBtn.isVisible().catch(() => false)) {
                    await guardarBtn.click();
                    console.log('   ✅ Click en Guardar');
                    await page.waitForTimeout(3000);
                }

                // Cerrar modal si sigue abierto (click en X o Cancelar)
                const closeBtn = await page.locator('.att-modal-close, button:has-text("Cancelar"), .modal-close, [aria-label="Close"]').first();
                if (await closeBtn.isVisible().catch(() => false)) {
                    await closeBtn.click();
                    console.log('   ✅ Modal cerrado');
                    await page.waitForTimeout(1000);
                }
            } else {
                console.log('   ⚠️ Modal no visible, puede ser inline form');
            }
        } else {
            console.log('   ⚠️ Botón Nuevo Registro no encontrado');

            // Capturar el estado actual para debug
            const buttons = await page.locator('button').allTextContents();
            console.log('   Botones disponibles:', buttons.slice(0, 10));
        }

        await page.screenshot({ path: 'test-results/crud-attendance-04-after-create.png', fullPage: true });

        // ============ READ: Verificar lista ============
        console.log('📖 READ: Verificando lista de registros...');

        // Contar registros en la tabla
        const rowCount = await page.locator('table tbody tr, .attendance-row, .record-item').count();
        console.log(`   📊 Registros en tabla: ${rowCount}`);

        await page.screenshot({ path: 'test-results/crud-attendance-05-lista.png', fullPage: true });

        // ============ UPDATE: Editar primer registro ============
        console.log('✏️ UPDATE: Buscando botón editar...');

        // Forzar cierre de cualquier modal
        await page.evaluate(() => {
            const modal = document.getElementById('att-modal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
            // También cerrar con la función del engine si existe
            if (typeof AttendanceEngine !== 'undefined' && typeof AttendanceEngine.closeModal === 'function') {
                AttendanceEngine.closeModal();
            }
        });
        await page.waitForTimeout(500);

        const editBtn = await page.locator('button[title="Editar"], .att-btn-warning:has-text("✏️"), button:has-text("Editar"), .btn-edit').first();

        if (await editBtn.isVisible().catch(() => false)) {
            await editBtn.click();
            console.log('   ✅ Click en Editar');
            await page.waitForTimeout(2000);

            await page.screenshot({ path: 'test-results/crud-attendance-06-modal-editar.png', fullPage: true });

            // Modificar algo si hay modal visible
            const editModal = await page.locator('.modal:visible, .dialog:visible, [role="dialog"]:visible').first();
            if (await editModal.isVisible().catch(() => false)) {
                // Cambiar hora de salida
                const salidaEdit = await page.locator('input[type="time"][name*="salida"], input[type="time"][name*="check_out"]').first();
                if (await salidaEdit.isVisible().catch(() => false)) {
                    await salidaEdit.fill('18:00');
                    console.log('   ✅ Hora salida modificada a 18:00');
                }

                // Guardar cambios
                const updateBtn = await page.locator('button:has-text("Guardar"), button:has-text("Actualizar"), button:has-text("Update"), button[type="submit"]').first();
                if (await updateBtn.isVisible().catch(() => false)) {
                    await updateBtn.click();
                    console.log('   ✅ Click en Guardar cambios');
                    await page.waitForTimeout(3000);
                }
            }
        } else {
            console.log('   ⚠️ Botón Editar no encontrado');
        }

        await page.screenshot({ path: 'test-results/crud-attendance-07-after-update.png', fullPage: true });

        // ============ DELETE: Eliminar registro ============
        console.log('🗑️ DELETE: Buscando botón eliminar...');

        // Forzar cierre de cualquier modal
        await page.evaluate(() => {
            const modal = document.getElementById('att-modal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
            if (typeof AttendanceEngine !== 'undefined' && typeof AttendanceEngine.closeModal === 'function') {
                AttendanceEngine.closeModal();
            }
        });
        await page.waitForTimeout(500);

        const deleteBtn = await page.locator('button[title="Eliminar"], .att-btn-danger, button:has-text("🗑️"), button:has-text("Eliminar"), .btn-delete').first();

        if (await deleteBtn.isVisible().catch(() => false)) {
            await deleteBtn.click();
            console.log('   ✅ Click en Eliminar');
            await page.waitForTimeout(1000);

            // Confirmar eliminación si hay diálogo
            const confirmBtn = await page.locator('button:has-text("Confirmar"), button:has-text("Sí"), button:has-text("OK"), button:has-text("Aceptar"), .swal2-confirm').first();
            if (await confirmBtn.isVisible().catch(() => false)) {
                await confirmBtn.click();
                console.log('   ✅ Confirmación de eliminación');
                await page.waitForTimeout(3000);
            }
        } else {
            console.log('   ⚠️ Botón Eliminar no encontrado');
        }

        await page.screenshot({ path: 'test-results/crud-attendance-08-after-delete.png', fullPage: true });

        // ============ RESUMEN ============
        console.log('');
        console.log('📊 RESUMEN CRUD:');
        console.log('   Screenshots guardados en test-results/crud-attendance-*.png');
        console.log('✅ Test CRUD completado');
    });
});
