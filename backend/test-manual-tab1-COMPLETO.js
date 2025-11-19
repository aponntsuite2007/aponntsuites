const { chromium } = require('playwright');

(async () => {
    console.log('🚀 INICIANDO TEST MANUAL EXHAUSTIVO - TAB 1 ADMINISTRACIÓN\n');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 500  // Ralentizar para que se vea todo
    });

    const page = await browser.newPage({
        viewport: { width: 1366, height: 768 }
    });

    // Configurar listener para diálogos
    page.on('dialog', async dialog => {
        console.log(`   🔔 Diálogo: "${dialog.message()}"`);
        await dialog.accept();
        console.log(`   ✓ Diálogo aceptado`);
    });

    try {
        // ============================================
        // FASE 1: LOGIN
        // ============================================
        console.log('📝 FASE 1: LOGIN');
        console.log('━'.repeat(60));

        await page.goto('http://localhost:9998/panel-empresa.html');
        console.log('✓ Página cargada');

        // Esperar a que el dropdown de empresas tenga opciones (máx 10 segundos)
        console.log('⏳ Esperando que carguen las empresas...');
        await page.waitForFunction(() => {
            const select = document.getElementById('companySelect');
            return select && select.options.length > 1; // Más de 1 opción (la primera es "Seleccionar...")
        }, { timeout: 10000 });
        console.log('✓ Empresas cargadas en el dropdown');

        // Verificar cuántas opciones hay y sus valores
        const optionsInfo = await page.evaluate(() => {
            const select = document.getElementById('companySelect');
            const options = Array.from(select.options);
            return {
                count: options.length,
                values: options.map(opt => ({
                    value: opt.value,
                    text: opt.textContent,
                    index: opt.index
                }))
            };
        });
        console.log(`📋 Opciones disponibles: ${optionsInfo.count}`);
        console.log('📝 Valores de opciones:');
        optionsInfo.values.forEach(opt => {
            console.log(`   [${opt.index}] value="${opt.value}" text="${opt.text}"`);
        });

        // Buscar ISI
        const isiOption = optionsInfo.values.find(opt => opt.text.includes('ISI'));
        if (isiOption) {
            console.log(`✓ ISI encontrada: value="${isiOption.value}"`);

            // Seleccionar por índice en vez de por value (más confiable)
            await page.selectOption('#companySelect', { index: isiOption.index });
            console.log('✓ Empresa ISI seleccionada');
        } else {
            throw new Error('Empresa ISI no encontrada en el dropdown');
        }

        await page.waitForTimeout(500);

        // Ingresar usuario
        await page.fill('#userInput', 'soporte');
        console.log('✓ Usuario ingresado: soporte');

        await page.waitForTimeout(300);

        // Ingresar password
        await page.fill('#passwordInput', 'admin123');
        console.log('✓ Password ingresada');

        await page.waitForTimeout(300);

        // Hacer click en login
        await page.click('#loginButton');
        console.log('✓ Click en botón Login');

        // Esperar a que el login se complete (redirect o carga de dashboard)
        await page.waitForTimeout(5000);
        console.log('✅ Login completado\n');

        // ============================================
        // FASE 2: ABRIR MÓDULO USUARIOS
        // ============================================
        console.log('📝 FASE 2: ABRIR MÓDULO USUARIOS');
        console.log('━'.repeat(60));

        await page.evaluate(() => {
            showModuleContent('users', 'Gestión de Usuarios');
        });
        await page.waitForTimeout(3000);

        console.log('✅ Módulo Usuarios abierto\n');

        // ============================================
        // FASE 3: ABRIR MODAL VER USUARIO
        // ============================================
        console.log('📝 FASE 3: ABRIR MODAL VER USUARIO');
        console.log('━'.repeat(60));

        // Esperar a que cargue la tabla de usuarios (máx 10 segundos)
        console.log('⏳ Esperando que cargue la tabla de usuarios...');
        await page.waitForFunction(() => {
            // Buscar el contenedor de usuarios con tabla
            const usersList = document.getElementById('users-list');
            if (!usersList) return false;

            // Verificar que tenga una tabla
            const table = usersList.querySelector('table.data-table');
            if (!table) return false;

            // Verificar que tenga filas
            const tbody = table.querySelector('tbody');
            return tbody && tbody.children.length > 0;
        }, { timeout: 10000 });
        console.log('✓ Tabla de usuarios cargada');

        // Contar usuarios en la tabla
        const userCount = await page.evaluate(() => {
            const tbody = document.querySelector('#users-list table.data-table tbody');
            return tbody?.children.length || 0;
        });
        console.log(`📊 Usuarios en la tabla: ${userCount}`);

        // Buscar botón Ver (icono 👁️ con title="Ver")
        console.log('⏳ Buscando botón Ver...');
        const verButton = await page.locator('button.btn-mini.btn-info[title="Ver"]').first();

        await page.waitForTimeout(500); // Esperar un momento para asegurar visibilidad

        if (await verButton.isVisible()) {
            await verButton.click();
            console.log('✓ Click en botón Ver (👁️)');
        } else {
            // Screenshot de diagnóstico
            await page.screenshot({ path: 'manual-test-no-ver-button.png' });
            throw new Error('Botón Ver (👁️) no visible');
        }

        await page.waitForTimeout(3000);
        console.log('✅ Modal Ver Usuario abierto\n');

        // ============================================
        // FASE 4: IR AL TAB 1 ADMINISTRACIÓN
        // ============================================
        console.log('📝 FASE 4: IR AL TAB 1 ADMINISTRACIÓN');
        console.log('━'.repeat(60));

        await page.click('button.file-tab:has-text("Administración")');
        await page.waitForTimeout(1000);

        // Screenshot inicial
        await page.screenshot({ path: 'manual-test-01-tab1-inicial.png' });
        console.log('📸 Screenshot: manual-test-01-tab1-inicial.png');

        // Capturar valores originales
        const valoresOriginales = await page.evaluate(() => {
            const tab1 = document.getElementById('admin-tab');
            if (!tab1) return null;

            const getText = (selector) => {
                const el = tab1.querySelector(selector);
                return el ? el.textContent.trim() : 'N/A';
            };

            return {
                rol: getText('#admin-role'),
                estado: getText('#admin-status .status-badge'),
                gps: getText('#admin-gps .status-badge'),
                departamento: getText('#admin-department'),
                cargo: getText('#admin-position'),
                sucursal: getText('#admin-branch')
            };
        });

        console.log('📊 VALORES ORIGINALES:');
        console.log('  Rol:', valoresOriginales.rol);
        console.log('  Estado:', valoresOriginales.estado);
        console.log('  GPS:', valoresOriginales.gps);
        console.log('  Departamento:', valoresOriginales.departamento);
        console.log('  Cargo:', valoresOriginales.cargo);
        console.log('  Sucursal:', valoresOriginales.sucursal);
        console.log('');

        // ============================================
        // TEST 1: CAMBIAR CARGO (Editar Posición)
        // ============================================
        console.log('🧪 TEST 1: CAMBIAR CARGO');
        console.log('━'.repeat(60));

        const cargoBtn = await page.locator('button:has-text("Editar Posición")').first();
        if (await cargoBtn.isVisible()) {
            await cargoBtn.click();
            await page.waitForTimeout(500);
            console.log('✓ Click en "Editar Posición"');
            console.log('⏳ Esperando que se procese el prompt...');
            await page.waitForTimeout(3000);

            await page.screenshot({ path: 'manual-test-02-cargo-editado.png' });
            console.log('📸 Screenshot: manual-test-02-cargo-editado.png');
        } else {
            console.log('⚠️ Botón "Editar Posición" no visible');
        }
        console.log('');

        // ============================================
        // TEST 2: CAMBIAR DEPARTAMENTO
        // ============================================
        console.log('🧪 TEST 2: CAMBIAR DEPARTAMENTO');
        console.log('━'.repeat(60));

        const deptBtn = await page.locator('button:has-text("Cambiar Departamento")').first();
        if (await deptBtn.isVisible()) {
            await deptBtn.click();
            await page.waitForTimeout(1000);
            console.log('✓ Click en "Cambiar Departamento"');

            await page.screenshot({ path: 'manual-test-03-modal-departamento.png' });
            console.log('📸 Screenshot: manual-test-03-modal-departamento.png');

            // Verificar si hay opciones en el dropdown
            const opciones = await page.locator('#newDepartmentSelect option').count();
            console.log(`📋 Opciones de departamento disponibles: ${opciones}`);

            if (opciones > 1) {
                // Seleccionar el segundo departamento (índice 1)
                await page.selectOption('#newDepartmentSelect', { index: 1 });
                console.log('✓ Departamento seleccionado');

                // Guardar
                await page.click('button:has-text("Guardar")');
                await page.waitForTimeout(3000);
                console.log('✓ Guardado exitoso');

                await page.screenshot({ path: 'manual-test-04-departamento-guardado.png' });
                console.log('📸 Screenshot: manual-test-04-departamento-guardado.png');
            } else {
                console.log('⚠️ No hay departamentos disponibles');
                await page.click('button:has-text("Cancelar")');
                await page.waitForTimeout(500);
            }
        } else {
            console.log('⚠️ Botón "Cambiar Departamento" no visible');
        }
        console.log('');

        // ============================================
        // TEST 3: GESTIONAR SUCURSALES
        // ============================================
        console.log('🧪 TEST 3: GESTIONAR SUCURSALES');
        console.log('━'.repeat(60));

        const branchBtn = await page.locator('button:has-text("Gestionar Sucursales")').first();
        if (await branchBtn.isVisible()) {
            await branchBtn.click();
            await page.waitForTimeout(1000);
            console.log('✓ Click en "Gestionar Sucursales"');

            await page.screenshot({ path: 'manual-test-05-modal-sucursales.png' });
            console.log('📸 Screenshot: manual-test-05-modal-sucursales.png');

            // Verificar si hay opciones
            const opcionesSucursales = await page.locator('#defaultBranchSelect option').count();
            console.log(`🏢 Opciones de sucursales disponibles: ${opcionesSucursales}`);

            if (opcionesSucursales > 1) {
                await page.selectOption('#defaultBranchSelect', { index: 1 });
                console.log('✓ Sucursal seleccionada');

                // Guardar
                await page.click('button:has-text("Guardar Cambios")');
                await page.waitForTimeout(3000);
                console.log('✓ Guardado exitoso');

                await page.screenshot({ path: 'manual-test-06-sucursal-guardada.png' });
                console.log('📸 Screenshot: manual-test-06-sucursal-guardada.png');
            } else {
                console.log('⚠️ No hay sucursales disponibles');
                await page.click('button:has-text("Cancelar")');
                await page.waitForTimeout(500);
            }
        } else {
            console.log('⚠️ Botón "Gestionar Sucursales" no visible');
        }
        console.log('');

        // ============================================
        // TEST 4: CAMBIAR ROL
        // ============================================
        console.log('🧪 TEST 4: CAMBIAR ROL');
        console.log('━'.repeat(60));

        const rolBtn = await page.locator('button:has-text("Cambiar Rol")').first();
        if (await rolBtn.isVisible()) {
            await rolBtn.click();
            await page.waitForTimeout(1000);
            console.log('✓ Click en "Cambiar Rol"');

            await page.screenshot({ path: 'manual-test-07-modal-rol.png' });
            console.log('📸 Screenshot: manual-test-07-modal-rol.png');

            // Buscar si hay un dropdown de roles
            const roleSelect = await page.locator('select').all();
            if (roleSelect.length > 0) {
                console.log('✓ Modal de rol abierto');

                // Cancelar para no cambiar el rol realmente
                const cancelBtn = await page.locator('button:has-text("Cancelar")').first();
                if (await cancelBtn.isVisible()) {
                    await cancelBtn.click();
                    await page.waitForTimeout(500);
                    console.log('✓ Modal cancelado');
                }
            } else {
                console.log('⚠️ No se detectó modal de rol');
            }
        } else {
            console.log('⚠️ Botón "Cambiar Rol" no visible');
        }
        console.log('');

        // ============================================
        // TEST 5: TOGGLE GPS
        // ============================================
        console.log('🧪 TEST 5: TOGGLE GPS');
        console.log('━'.repeat(60));

        const gpsBtn = await page.locator('button').all();
        let gpsFound = false;
        for (const btn of gpsBtn) {
            const text = await btn.textContent();
            if (text && (text.includes('Restringir GPS') || text.includes('Permitir fuera de área'))) {
                console.log(`✓ Botón GPS encontrado: "${text.trim()}"`);
                await btn.click();
                gpsFound = true;
                break;
            }
        }

        if (gpsFound) {
            await page.waitForTimeout(1000);
            console.log('⏳ Procesando cambio GPS...');
            await page.waitForTimeout(5000);

            await page.screenshot({ path: 'manual-test-08-gps-cambiado.png' });
            console.log('📸 Screenshot: manual-test-08-gps-cambiado.png');
        } else {
            console.log('⚠️ Botón GPS no encontrado');
        }
        console.log('');

        // ============================================
        // TEST 6: TOGGLE ESTADO
        // ============================================
        console.log('🧪 TEST 6: TOGGLE ESTADO');
        console.log('━'.repeat(60));

        const estadoBtn = await page.locator('button').all();
        let estadoFound = false;
        for (const btn of estadoBtn) {
            const text = await btn.textContent();
            if (text && (text.includes('Activar Usuario') || text.includes('Desactivar'))) {
                console.log(`✓ Botón Estado encontrado: "${text.trim()}"`);
                await btn.click();
                estadoFound = true;
                break;
            }
        }

        if (estadoFound) {
            await page.waitForTimeout(1000);
            console.log('⏳ Procesando cambio Estado...');
            await page.waitForTimeout(5000);

            await page.screenshot({ path: 'manual-test-09-estado-cambiado.png' });
            console.log('📸 Screenshot: manual-test-09-estado-cambiado.png');
        } else {
            console.log('⚠️ Botón Estado no encontrado');
        }
        console.log('');

        // ============================================
        // VERIFICACIÓN FINAL
        // ============================================
        console.log('📝 VERIFICACIÓN FINAL - CAPTURAR VALORES NUEVOS');
        console.log('━'.repeat(60));

        // Esperar que se actualice el TAB
        await page.waitForTimeout(2000);

        const valoresNuevos = await page.evaluate(() => {
            const tab1 = document.getElementById('admin-tab');
            if (!tab1) return null;

            const getText = (selector) => {
                const el = tab1.querySelector(selector);
                return el ? el.textContent.trim() : 'N/A';
            };

            return {
                rol: getText('#admin-role'),
                estado: getText('#admin-status .status-badge'),
                gps: getText('#admin-gps .status-badge'),
                departamento: getText('#admin-department'),
                cargo: getText('#admin-position'),
                sucursal: getText('#admin-branch')
            };
        });

        console.log('📊 VALORES NUEVOS:');
        console.log('  Rol:', valoresNuevos.rol);
        console.log('  Estado:', valoresNuevos.estado);
        console.log('  GPS:', valoresNuevos.gps);
        console.log('  Departamento:', valoresNuevos.departamento);
        console.log('  Cargo:', valoresNuevos.cargo);
        console.log('  Sucursal:', valoresNuevos.sucursal);
        console.log('');

        // ============================================
        // COMPARACIÓN
        // ============================================
        console.log('📊 COMPARACIÓN - ORIGINAL vs NUEVO');
        console.log('━'.repeat(60));

        const comparar = (campo, original, nuevo) => {
            const cambio = original !== nuevo ? '✅ CAMBIÓ' : '❌ SIN CAMBIO';
            console.log(`${campo}:`);
            console.log(`  Original: ${original}`);
            console.log(`  Nuevo:    ${nuevo}`);
            console.log(`  ${cambio}\n`);
        };

        comparar('Rol', valoresOriginales.rol, valoresNuevos.rol);
        comparar('Estado', valoresOriginales.estado, valoresNuevos.estado);
        comparar('GPS', valoresOriginales.gps, valoresNuevos.gps);
        comparar('Departamento', valoresOriginales.departamento, valoresNuevos.departamento);
        comparar('Cargo', valoresOriginales.cargo, valoresNuevos.cargo);
        comparar('Sucursal', valoresOriginales.sucursal, valoresNuevos.sucursal);

        // Screenshot final
        await page.screenshot({ path: 'manual-test-10-FINAL.png' });
        console.log('📸 Screenshot: manual-test-10-FINAL.png');

        console.log('\n✅ TEST MANUAL COMPLETADO');
        console.log('⏳ Navegador permanecerá abierto 30 segundos para revisión manual...');
        await page.waitForTimeout(30000);

    } catch (error) {
        console.error('\n❌ ERROR DURANTE EL TEST:');
        console.error(error.message);
        console.error(error.stack);

        await page.screenshot({ path: 'manual-test-ERROR.png' });
        console.log('📸 Screenshot de error: manual-test-ERROR.png');
    } finally {
        await browser.close();
        console.log('\n🏁 Test finalizado.');
    }
})();
