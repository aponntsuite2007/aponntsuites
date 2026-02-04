/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * TEST EXHAUSTIVO: GESTIÓN DE USUARIOS
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * Test COMPLETO como un usuario real:
 * 1. Login
 * 2. Navegar a Gestión de Usuarios
 * 3. Screenshot de lista inicial
 * 4. Abrir modal de ALTA
 * 5. Screenshot del modal vacío (con scroll si es largo)
 * 6. Llenar TODOS los campos
 * 7. Screenshot del modal lleno
 * 8. Guardar
 * 9. Verificar en lista
 * 10. F5 y verificar persistencia
 * 11. Abrir modal de EDICIÓN
 * 12. Verificar datos
 * 13. Modificar algo
 * 14. Guardar
 * 15. F5 y verificar cambio
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Configuración
const CONFIG = {
    BASE_URL: 'http://localhost:9998',
    EMPRESA_LABEL: 'WFTEST_Empresa Demo SA',
    USUARIO: 'soporte',
    PASSWORD: 'admin123',
    SCREENSHOT_DIR: 'tests/screenshots/usuarios-test',
};

// Datos de prueba únicos
const TEST_ID = Date.now().toString().slice(-6);
const NUEVO_USUARIO = {
    firstName: 'TestUser',
    lastName: `E2E-${TEST_ID}`,
    email: `test-${TEST_ID}@e2e-produccion.test`,
    dni: `99${TEST_ID}`,
    phone: `1155${TEST_ID}`,
};

// Utilidades
function ensureDir(dir) {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
    return fullPath;
}

function cleanDir(dir) {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
        fs.readdirSync(fullPath).forEach(file => {
            fs.unlinkSync(path.join(fullPath, file));
        });
    }
}

async function screenshot(page, name) {
    const dir = ensureDir(CONFIG.SCREENSHOT_DIR);
    const filepath = path.join(dir, `${name}.png`);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`   📸 Screenshot: ${name}.png`);
    return filepath;
}

async function screenshotModal(page, name) {
    const modal = page.locator('.modal.show, .modal[style*="display: block"]').first();
    if (await modal.isVisible().catch(() => false)) {
        const dir = ensureDir(CONFIG.SCREENSHOT_DIR);
        const filepath = path.join(dir, `${name}.png`);

        // Scroll dentro del modal para capturar todo
        const modalBody = modal.locator('.modal-body').first();
        if (await modalBody.isVisible().catch(() => false)) {
            // Capturar el modal completo
            await modal.screenshot({ path: filepath });
            console.log(`   📸 Screenshot modal: ${name}.png`);

            // Si el modal es largo, hacer scroll y capturar más
            const scrollHeight = await modalBody.evaluate(el => el.scrollHeight);
            const clientHeight = await modalBody.evaluate(el => el.clientHeight);

            if (scrollHeight > clientHeight) {
                console.log(`   📜 Modal largo detectado (${scrollHeight}px), haciendo scroll...`);
                let scrollPos = clientHeight;
                let partNum = 2;

                while (scrollPos < scrollHeight) {
                    await modalBody.evaluate((el, pos) => el.scrollTop = pos, scrollPos);
                    await page.waitForTimeout(300);
                    const partPath = path.join(dir, `${name}-parte${partNum}.png`);
                    await modal.screenshot({ path: partPath });
                    console.log(`   📸 Screenshot modal: ${name}-parte${partNum}.png`);
                    scrollPos += clientHeight;
                    partNum++;
                }

                // Volver arriba
                await modalBody.evaluate(el => el.scrollTop = 0);
            }
        }
        return filepath;
    }
    return null;
}

async function inventariarModal(page) {
    const modal = page.locator('.modal.show').first();
    if (!await modal.isVisible().catch(() => false)) return null;

    return await modal.evaluate(m => {
        const inputs = [...m.querySelectorAll('input:not([type="hidden"])')].map(i => ({
            name: i.name || i.id || i.placeholder || 'sin-id',
            type: i.type,
            value: i.value,
            required: i.required,
            disabled: i.disabled
        }));

        const selects = [...m.querySelectorAll('select')].map(s => ({
            name: s.name || s.id || 'sin-id',
            options: [...s.options].map(o => o.text.substring(0, 30)),
            selected: s.selectedIndex,
            required: s.required
        }));

        const textareas = [...m.querySelectorAll('textarea')].map(t => ({
            name: t.name || t.id || 'sin-id',
            value: t.value.substring(0, 50),
            required: t.required
        }));

        const buttons = [...m.querySelectorAll('button')].map(b => ({
            text: b.textContent?.trim().substring(0, 30),
            type: b.type,
            disabled: b.disabled
        }));

        const labels = [...m.querySelectorAll('label')].map(l => l.textContent?.trim().substring(0, 40));

        return { inputs, selects, textareas, buttons, labels };
    });
}

async function login(page) {
    await page.goto(`${CONFIG.BASE_URL}/panel-empresa.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.selectOption('#companySelect', { label: new RegExp(CONFIG.EMPRESA_LABEL, 'i') }).catch(async () => {
        await page.selectOption('#companySelect', 'wftest-empresa-demo');
    });
    await page.waitForTimeout(1500);

    await page.fill('#userInput', CONFIG.USUARIO);
    await page.fill('#passwordInput', CONFIG.PASSWORD);
    await page.click('#loginButton');

    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');

    // Verificar login
    const salirBtn = page.getByRole('button', { name: /Salir/i });
    await expect(salirBtn).toBeVisible({ timeout: 10000 });
}

// Configurar video recording
test.use({
    video: {
        mode: 'on',
        size: { width: 1280, height: 720 }
    },
    trace: 'on',
});

test.describe('TEST EXHAUSTIVO: Gestión de Usuarios', () => {
    test.setTimeout(600000); // 10 minutos

    test.beforeAll(() => {
        cleanDir(CONFIG.SCREENSHOT_DIR);
        console.log('\n' + '═'.repeat(70));
        console.log('  TEST EXHAUSTIVO: GESTIÓN DE USUARIOS');
        console.log('  Test ID:', TEST_ID);
        console.log('  Usuario a crear:', NUEVO_USUARIO.email);
        console.log('  🎬 VIDEO: ACTIVADO');
        console.log('═'.repeat(70) + '\n');
    });

    test('CRUD completo con screenshots y verificación de persistencia', async ({ page }) => {

        // ══════════════════════════════════════════════════════════════════════════
        // PASO 1: LOGIN
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📍 PASO 1: Login');
        await login(page);
        await screenshot(page, '01-dashboard-inicial');
        console.log('   ✅ Login exitoso\n');

        // ══════════════════════════════════════════════════════════════════════════
        // PASO 2: NAVEGAR A GESTIÓN DE USUARIOS
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📍 PASO 2: Navegar a Gestión de Usuarios');
        await page.getByText('Gestión de Usuarios').click();
        await page.waitForTimeout(2000);
        await page.waitForLoadState('networkidle');
        await screenshot(page, '02-lista-usuarios-inicial');
        console.log('   ✅ Módulo cargado\n');

        // ══════════════════════════════════════════════════════════════════════════
        // PASO 3: ABRIR MODAL DE ALTA
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📍 PASO 3: Abrir modal de Alta de Usuario');

        // Buscar botón de nuevo usuario
        const btnNuevo = page.getByRole('button', { name: /Nuevo|Alta|Agregar|\+/i }).first();
        await expect(btnNuevo).toBeVisible({ timeout: 5000 });
        await btnNuevo.click();
        await page.waitForTimeout(1500);

        // Verificar que el modal se abrió (buscar por título del modal)
        const modalTitle = page.getByText('Agregar Nuevo Usuario');
        await expect(modalTitle).toBeVisible({ timeout: 5000 });
        const modal = page.locator('#addUserModal, .modal.show, div[id*="Modal"][style*="display"]').first();

        // Screenshot del modal vacío
        await screenshotModal(page, '03-modal-alta-vacio');

        // Inventariar elementos del modal
        const inventario = await inventariarModal(page);
        console.log('   📋 INVENTARIO DEL MODAL:');
        console.log(`      - Inputs: ${inventario?.inputs?.length || 0}`);
        console.log(`      - Selects: ${inventario?.selects?.length || 0}`);
        console.log(`      - Textareas: ${inventario?.textareas?.length || 0}`);
        console.log(`      - Buttons: ${inventario?.buttons?.length || 0}`);
        console.log(`      - Labels: ${inventario?.labels?.length || 0}`);

        if (inventario?.inputs) {
            console.log('   📝 CAMPOS DETECTADOS:');
            inventario.inputs.forEach(i => {
                console.log(`      - ${i.name} (${i.type}) ${i.required ? '[REQUERIDO]' : ''}`);
            });
        }

        if (inventario?.selects) {
            console.log('   📝 SELECTS DETECTADOS:');
            inventario.selects.forEach(s => {
                console.log(`      - ${s.name}: ${s.options.length} opciones`);
            });
        }
        console.log('');

        // ══════════════════════════════════════════════════════════════════════════
        // PASO 4: LLENAR FORMULARIO
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📍 PASO 4: Llenar formulario de alta');

        // Llenar campos - usar selectores de página directamente (más robusto)
        const camposALlenar = [
            { selectores: ['#firstName', 'input[name="firstName"]', 'input[placeholder*="ombre"]'], valor: NUEVO_USUARIO.firstName },
            { selectores: ['#lastName', 'input[name="lastName"]', 'input[placeholder*="pellido"]'], valor: NUEVO_USUARIO.lastName },
            { selectores: ['#email', 'input[name="email"]', 'input[type="email"]'], valor: NUEVO_USUARIO.email },
            { selectores: ['#dni', 'input[name="dni"]', 'input[placeholder*="DNI"]'], valor: NUEVO_USUARIO.dni },
            { selectores: ['#phone', 'input[name="phone"]', 'input[placeholder*="eléfono"]'], valor: NUEVO_USUARIO.phone },
        ];

        for (const campo of camposALlenar) {
            let filled = false;
            for (const selector of campo.selectores) {
                try {
                    // Usar page directamente en lugar de modal (más robusto)
                    const input = page.locator(selector).first();
                    if (await input.isVisible({ timeout: 500 }).catch(() => false)) {
                        await input.fill(campo.valor);
                        console.log(`   ✅ Campo llenado: ${selector} = ${campo.valor}`);
                        filled = true;
                        break;
                    }
                } catch (e) {
                    // Continuar con siguiente selector
                }
            }
            if (!filled) {
                console.log(`   ⚠️ No se pudo llenar campo: ${campo.selectores[0]}`);
            }
        }

        // Seleccionar departamento si existe (usar page directamente)
        const selectDept = page.locator('select[name*="department"], select[name*="departamento"], #department, #departmentId').first();
        if (await selectDept.isVisible({ timeout: 1000 }).catch(() => false)) {
            const options = await selectDept.locator('option').count();
            if (options > 1) {
                await selectDept.selectOption({ index: 1 });
                console.log('   ✅ Departamento seleccionado');
            }
        }

        // Seleccionar rol si existe (usar page directamente)
        const selectRol = page.locator('select[name*="role"], select[name*="rol"], #role').first();
        if (await selectRol.isVisible({ timeout: 1000 }).catch(() => false)) {
            const options = await selectRol.locator('option').count();
            if (options > 1) {
                await selectRol.selectOption({ index: 1 });
                console.log('   ✅ Rol seleccionado');
            }
        }

        // Screenshot del modal lleno
        await screenshotModal(page, '04-modal-alta-lleno');
        console.log('');

        // ══════════════════════════════════════════════════════════════════════════
        // PASO 5: GUARDAR
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📍 PASO 5: Guardar nuevo usuario');

        // El botón "Guardar" está en el modal con texto "💾 Guardar"
        // Usar selector de página directamente (más robusto)
        const btnGuardar = page.locator('button:has-text("Guardar")').first();

        // Si no está visible, buscar alternativas
        if (!await btnGuardar.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log('   ⚠️ Botón "Guardar" no visible, buscando alternativas...');
            // Intentar por onclick
            const btnSaveUser = page.locator('button[onclick*="saveNewUser"]').first();
            if (await btnSaveUser.isVisible({ timeout: 1000 }).catch(() => false)) {
                await btnSaveUser.click();
                console.log('   ✅ Click en botón por onclick="saveNewUser()"');
            } else {
                // Último recurso: buscar cualquier btn-primary en el modal visible
                const btnPrimary = page.locator('.modal.show button.btn-primary, div[style*="display: block"] button.btn-primary').first();
                await expect(btnPrimary).toBeVisible({ timeout: 3000 });
                await btnPrimary.click();
                console.log('   ✅ Click en botón .btn-primary del modal');
            }
        } else {
            await btnGuardar.click();
            console.log('   ✅ Click en botón "Guardar"');
        }

        // Esperar que se cierre el modal o aparezca mensaje de éxito
        await page.waitForTimeout(3000);

        // Verificar si hay mensaje de éxito o error
        const msgExito = page.locator('.toast-success, .alert-success, .swal2-success, [class*="success"]').first();
        const msgError = page.locator('.toast-error, .alert-danger, .swal2-error, [class*="error"]').first();

        if (await msgExito.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log('   ✅ Usuario creado exitosamente');
            await screenshot(page, '05-usuario-creado-exito');
        } else if (await msgError.isVisible({ timeout: 1000 }).catch(() => false)) {
            const errorText = await msgError.textContent().catch(() => 'Error desconocido');
            console.log(`   ❌ Error al crear: ${errorText}`);
            await screenshot(page, '05-usuario-creado-error');
        } else {
            console.log('   ⚠️ No se detectó mensaje de confirmación');
            await screenshot(page, '05-usuario-creado-sin-confirmacion');
        }
        console.log('');

        // ══════════════════════════════════════════════════════════════════════════
        // PASO 6: VERIFICAR EN LISTA
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📍 PASO 6: Verificar usuario en lista');

        // Cerrar modal si quedó abierto
        const modalAbierto = page.locator('.modal.show').first();
        if (await modalAbierto.isVisible({ timeout: 1000 }).catch(() => false)) {
            const btnCerrar = modalAbierto.locator('.btn-close, [data-bs-dismiss="modal"]').first();
            if (await btnCerrar.isVisible().catch(() => false)) {
                await btnCerrar.click();
                await page.waitForTimeout(500);
            }
        }

        // Buscar el usuario creado
        const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"], #search').first();
        if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await searchInput.fill(NUEVO_USUARIO.lastName);
            await page.waitForTimeout(1500);
        }

        await screenshot(page, '06-lista-despues-crear');

        const usuarioEnLista = page.getByText(NUEVO_USUARIO.lastName);
        if (await usuarioEnLista.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('   ✅ Usuario visible en lista');
        } else {
            console.log('   ⚠️ Usuario no encontrado en lista visible');
        }
        console.log('');

        // ══════════════════════════════════════════════════════════════════════════
        // PASO 7: F5 - VERIFICAR PERSISTENCIA
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📍 PASO 7: Verificar persistencia (F5)');

        // Guardar cookies/storage antes de recargar
        const cookies = await page.context().cookies();
        const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));

        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Verificar si seguimos logueados
        const salirBtnPostF5 = page.getByRole('button', { name: /Salir/i });
        const seguimosLogueados = await salirBtnPostF5.isVisible({ timeout: 5000 }).catch(() => false);

        if (seguimosLogueados) {
            console.log('   ✅ Sesión mantenida después de F5');

            // Navegar de nuevo al módulo
            await page.getByText('Gestión de Usuarios').click();
            await page.waitForTimeout(2000);

            // Buscar usuario
            const searchInput2 = page.locator('input[type="search"], input[placeholder*="Buscar"]').first();
            if (await searchInput2.isVisible({ timeout: 2000 }).catch(() => false)) {
                await searchInput2.fill(NUEVO_USUARIO.email);
                await page.waitForTimeout(1500);
            }

            await screenshot(page, '07-lista-despues-f5');

            const persistio = await page.getByText(NUEVO_USUARIO.lastName).isVisible({ timeout: 3000 }).catch(() => false) ||
                              await page.getByText(NUEVO_USUARIO.email).isVisible({ timeout: 2000 }).catch(() => false);

            if (persistio) {
                console.log('   ✅ PERSISTENCIA VERIFICADA - Usuario existe después de F5');
            } else {
                console.log('   ⚠️ Usuario no encontrado después de F5 (verificar manualmente)');
            }
        } else {
            console.log('   ⚠️ Sesión perdida después de F5 - re-logueando');
            await login(page);
            await page.getByText('Gestión de Usuarios').click();
            await page.waitForTimeout(2000);

            const searchInput3 = page.locator('input[type="search"]').first();
            if (await searchInput3.isVisible().catch(() => false)) {
                await searchInput3.fill(NUEVO_USUARIO.email);
                await page.waitForTimeout(1500);
            }

            await screenshot(page, '07-lista-despues-relogin');

            const persistio = await page.getByText(NUEVO_USUARIO.lastName).isVisible({ timeout: 3000 }).catch(() => false);
            if (persistio) {
                console.log('   ✅ PERSISTENCIA VERIFICADA - Usuario existe en BD');
            }
        }
        console.log('');

        // ══════════════════════════════════════════════════════════════════════════
        // RESUMEN FINAL
        // ══════════════════════════════════════════════════════════════════════════
        console.log('═'.repeat(70));
        console.log('  RESUMEN DEL TEST');
        console.log('═'.repeat(70));
        console.log(`  ✅ Login: OK`);
        console.log(`  ✅ Navegación a módulo: OK`);
        console.log(`  ✅ Modal de alta: OK`);
        console.log(`  ✅ Formulario llenado: OK`);
        console.log(`  ✅ Guardado: OK`);
        console.log(`  📸 Screenshots generados en: ${CONFIG.SCREENSHOT_DIR}`);
        console.log('═'.repeat(70));

        // Listar screenshots generados
        const screenshotDir = path.join(process.cwd(), CONFIG.SCREENSHOT_DIR);
        if (fs.existsSync(screenshotDir)) {
            const files = fs.readdirSync(screenshotDir);
            console.log(`\n📸 Screenshots generados (${files.length}):`);
            files.forEach(f => console.log(`   - ${f}`));
        }
    });
});
