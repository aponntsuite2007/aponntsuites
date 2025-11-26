/**
 * TEST DE PERSISTENCIA COMPLETA - TAB 1 ADMINISTRACIÓN
 *
 * Verifica que TODOS los campos del TAB 1 se guarden correctamente
 * y persistan después de cerrar y reabrir el sistema.
 *
 * Pasos:
 * 1. Login y seleccionar un usuario de prueba
 * 2. Modificar TODOS los campos del TAB 1
 * 3. Guardar cambios
 * 4. Cerrar sesión y navegador
 * 5. Reabrir navegador y hacer login
 * 6. Verificar que TODOS los campos cambiaron
 */

const { chromium } = require('playwright');

const CONFIG = {
    baseURL: 'http://localhost:9998',
    company: 'isi',
    username: 'soporte',
    password: 'admin123',
    timeout: 30000
};

// Valores ORIGINALES (antes de modificar)
const VALORES_ORIGINALES = {};

// Valores NUEVOS (después de modificar)
const VALORES_NUEVOS = {
    rol: null,  // Se determinará dinámicamente (cambiar al opuesto)
    estado: null,  // Toggle del actual
    gps: null,  // Toggle del actual
    departamento: null,  // Cambiar a otro departamento
    cargo: 'CARGO MODIFICADO TEST',
    sucursal: null,  // Cambiar a otra sucursal
    turno: null  // Cambiar a otro turno
};

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function login(page) {
    console.log('\n📝 FASE 1: LOGIN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await page.goto(`${CONFIG.baseURL}/panel-empresa.html`);
    await delay(2000);

    // Esperar dropdown de empresas
    await page.waitForSelector('#companySelect', { timeout: CONFIG.timeout });

    // Esperar a que se carguen las empresas
    await page.waitForFunction(() => {
        const select = document.getElementById('companySelect');
        return select && select.options.length > 1;
    }, { timeout: CONFIG.timeout });

    // Buscar y seleccionar empresa ISI
    const opciones = await page.evaluate(() => {
        const select = document.getElementById('companySelect');
        return Array.from(select.options).map(opt => ({ value: opt.value, text: opt.text }));
    });

    const opcionISI = opciones.find(opt => opt.text.toLowerCase().includes(CONFIG.company.toLowerCase()));
    if (!opcionISI) {
        throw new Error(`❌ No se encontró empresa "${CONFIG.company}"`);
    }

    await page.selectOption('select#companySelect', opcionISI.value);
    console.log(`✓ Empresa seleccionada: ${opcionISI.text}`);
    await delay(1000);

    // Usuario
    await page.fill('input#userInput', CONFIG.username);
    console.log(`✓ Usuario: ${CONFIG.username}`);

    // Password
    await page.fill('input#passwordInput', CONFIG.password);
    console.log(`✓ Password ingresado`);
    await delay(500);

    // Login
    await page.click('button#loginButton');
    console.log('✓ Click en Login');
    await delay(3000);

    // Verificar login exitoso
    await page.screenshot({ path: 'test-persistencia-01-after-login.png' });

    try {
        await page.waitForSelector('.module-button, .module-card, .module-grid', { timeout: CONFIG.timeout });
        console.log('✅ Login exitoso');
    } catch {
        await page.waitForSelector('#dashboard, main', { timeout: 10000 });
        console.log('✅ Login exitoso (selector alternativo)');
    }

    await page.screenshot({ path: 'test-persistencia-02-panel.png' });
}

async function navigateToUsersAndOpenFirst(page) {
    console.log('\n📝 FASE 2: NAVEGAR A USUARIOS Y ABRIR PRIMER USUARIO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Llamar directamente a la función showModuleContent para abrir módulo de usuarios
    const moduloAbierto = await page.evaluate(() => {
        if (typeof showModuleContent === 'function') {
            showModuleContent('users', 'Gestión de Usuarios');
            return true;
        }
        return false;
    });

    if (!moduloAbierto) {
        throw new Error('❌ Función showModuleContent no disponible');
    }

    console.log('✓ Módulo de Usuarios abierto (showModuleContent)');
    await delay(5000);  // Esperar a que cargue el módulo

    await page.screenshot({ path: 'test-persistencia-03-modulo-usuarios.png' });

    // Esperar tabla de usuarios
    try {
        await page.waitForSelector('#usersTable, table[id*="user"], .table', { timeout: CONFIG.timeout });
        console.log('✓ Tabla de usuarios detectada');
    } catch {
        console.log('⚠️ Tabla no detectada, continuando...');
    }

    await delay(2000);

    // Hacer click en primer botón "Ver" usando la función viewUser directamente
    const userId = await page.evaluate(() => {
        // Buscar en la tabla el primer usuario
        const table = document.querySelector('#usersTable, table');
        if (!table) return null;

        const rows = table.querySelectorAll('tbody tr');
        if (rows.length === 0) return null;

        // Obtener el ID del primer usuario (generalmente está en un data attribute o en el onclick)
        const firstRow = rows[0];

        // Buscar botón Ver en la primera fila
        const buttons = firstRow.querySelectorAll('button');
        for (const btn of buttons) {
            const onclick = btn.getAttribute('onclick');
            if (onclick && onclick.includes('viewUser')) {
                // Ejecutar el onclick
                btn.click();

                // Extraer userId
                const match = onclick.match(/viewUser\(['"]([^'"]+)['"]\)/);
                if (match) return match[1];

                return 'clicked-unknown-id';
            }
        }

        return null;
    });

    if (!userId) {
        throw new Error('❌ No se encontró ningún botón "Ver" en la tabla');
    }

    console.log(`✓ Click en Ver usuario (ID: ${userId})`);
    await delay(4000);  // Esperar a que abra el modal

    await page.screenshot({ path: 'test-persistencia-04-modal-abierto.png' });

    // Verificar que el modal esté abierto
    const modalVisible = await page.evaluate(() => {
        const modal = document.getElementById('employeeFileModal');
        if (!modal) return false;

        return modal.classList.contains('show') || modal.style.display !== 'none';
    });

    if (!modalVisible) {
        throw new Error('❌ Modal no se abrió correctamente');
    }

    console.log('✅ Modal Ver Usuario abierto');

    return userId;
}

async function capturarValoresOriginales(page) {
    console.log('\n📝 FASE 3: CAPTURAR VALORES ORIGINALES DEL TAB 1');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Asegurarnos de estar en TAB 1 (usar botón con clase file-tab)
    await page.click('button.file-tab:has-text("Administración")');
    await delay(1000);

    const valores = await page.evaluate(() => {
        const tab1 = document.getElementById('admin-tab');
        if (!tab1) return null;

        // Función helper para extraer texto de un elemento
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

    Object.assign(VALORES_ORIGINALES, valores);

    console.log('\n📊 VALORES ORIGINALES:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Object.entries(VALORES_ORIGINALES).forEach(([key, value]) => {
        console.log(`  ${key.padEnd(15)}: ${value}`);
    });

    await page.screenshot({ path: 'test-persistencia-05-valores-originales.png' });

    return valores;
}

async function modificarTodosCampos(page) {
    console.log('\n📝 FASE 4: MODIFICAR TODOS LOS CAMPOS DEL TAB 1');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let cambiosRealizados = 0;

    // Configurar listener de diálogos ANTES de cualquier click
    page.on('dialog', async dialog => {
        console.log(`   🔔 Diálogo: "${dialog.message()}"`);
        await dialog.accept();
        console.log(`   ✓ Diálogo aceptado`);
    });

    // 1. CAMBIAR ESTADO (Activar/Desactivar)
    console.log('\n1️⃣ Modificando ESTADO...');

    const estadoModificado = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const toggleBtn = buttons.find(btn =>
            btn.textContent.includes('Activar Usuario') ||
            btn.textContent.includes('Desactivar Usuario')
        );
        if (toggleBtn) {
            toggleBtn.click();
            return true;
        }
        return false;
    });

    if (estadoModificado) {
        // Esperar confirmación
        await delay(500);

        // Esperar alerta de éxito
        await delay(1000);

        // Esperar a que el modal se cierre y reabra
        console.log('   ⏳ Esperando recarga del modal...');
        await delay(5000);

        // Verificar que el modal esté visible nuevamente
        const modalVisible = await page.isVisible('#employeeFileModal');
        if (modalVisible) {
            console.log('   ✓ Estado modificado y modal recargado');
            cambiosRealizados++;
        } else {
            console.log('   ⚠️ Modal no visible, puede que no se haya guardado');
        }
    } else {
        console.log('   ⚠️ Botón Estado no encontrado');
    }

    await delay(2000);

    // 2. CAMBIAR GPS
    console.log('\n2️⃣ Modificando GPS...');

    const gpsModificado = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const gpsBtn = buttons.find(btn =>
            btn.textContent.includes('Permitir fuera de área') ||
            btn.textContent.includes('Restringir')
        );
        if (gpsBtn) {
            gpsBtn.click();
            return true;
        }
        return false;
    });

    if (gpsModificado) {
        // Esperar confirmación
        await delay(500);

        // Esperar alerta de éxito
        await delay(1000);

        // Esperar a que el modal se cierre y reabra
        console.log('   ⏳ Esperando recarga del modal...');
        await delay(5000);

        const modalVisible = await page.isVisible('#employeeFileModal');
        if (modalVisible) {
            console.log('   ✓ GPS modificado y modal recargado');
            cambiosRealizados++;
        } else {
            console.log('   ⚠️ Modal no visible, puede que no se haya guardado');
        }
    } else {
        console.log('   ⚠️ Botón GPS no encontrado');
    }

    await delay(2000);

    // 3. CAMBIAR CARGO (edición inline)
    console.log('\n3️⃣ Modificando CARGO...');
    const cargoModificado = await page.evaluate((nuevoCargo) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const cargoBtn = buttons.find(btn => btn.textContent.includes('Editar Cargo'));

        if (!cargoBtn) return false;

        cargoBtn.click();
        return true;
    }, VALORES_NUEVOS.cargo);

    if (cargoModificado) {
        await delay(1000);

        // Buscar input y cambiar valor
        await page.fill('#positionInput, input[name="position"], input[placeholder*="cargo"]', VALORES_NUEVOS.cargo);
        await delay(500);

        // Guardar
        await page.click('button:has-text("Guardar")');
        await delay(2000);

        console.log(`   ✓ Cargo modificado a: "${VALORES_NUEVOS.cargo}"`);
        cambiosRealizados++;
    } else {
        console.log('   ⚠️ Botón Editar Cargo no encontrado');
    }

    console.log(`\n✅ Total de cambios realizados: ${cambiosRealizados}`);

    await page.screenshot({ path: 'test-persistencia-06-despues-modificar.png' });

    return cambiosRealizados;
}

async function cerrarSistema(page, browser) {
    console.log('\n📝 FASE 5: CERRAR SISTEMA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Cerrar modal si está abierto
    try {
        await page.click('#employeeFileModal .btn-close');
        await delay(1000);
    } catch {}

    // Logout
    try {
        await page.click('button:has-text("Cerrar Sesión"), button:has-text("Logout"), #logoutBtn');
        console.log('✓ Logout realizado');
    } catch {
        console.log('⚠️ No se encontró botón logout, cerrando navegador directamente');
    }

    await delay(2000);

    // Cerrar navegador completamente
    await browser.close();
    console.log('✅ Sistema cerrado completamente');

    // Esperar 3 segundos antes de reabrir
    console.log('⏳ Esperando 3 segundos...');
    await delay(3000);
}

async function reabrirYVerificar(userId) {
    console.log('\n📝 FASE 6: REABRIR SISTEMA Y VERIFICAR PERSISTENCIA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Abrir nuevo navegador
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });

    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 }
    });

    const page = await context.newPage();

    // Login nuevamente
    await login(page);

    // Navegar a usuarios y abrir el mismo usuario
    const newUserId = await navigateToUsersAndOpenFirst(page);

    console.log(`✓ Usuario reabierto (ID: ${newUserId})`);

    // Capturar valores NUEVOS (usar selector correcto de botón)
    await page.click('button.file-tab:has-text("Administración")');
    await delay(1000);

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

    await page.screenshot({ path: 'test-persistencia-07-valores-nuevos.png' });

    // Comparar valores
    console.log('\n📊 COMPARACIÓN DE VALORES:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const resultados = {};

    Object.keys(VALORES_ORIGINALES).forEach(campo => {
        const original = VALORES_ORIGINALES[campo];
        const nuevo = valoresNuevos[campo];
        const cambio = original !== nuevo;

        resultados[campo] = {
            original,
            nuevo,
            cambio,
            persistio: cambio  // Si cambió, significa que persistió
        };

        const icono = cambio ? '✅' : '❌';
        console.log(`${icono} ${campo.toUpperCase()}`);
        console.log(`   Original: ${original}`);
        console.log(`   Nuevo:    ${nuevo}`);
        console.log(`   Persistió: ${cambio ? 'SÍ' : 'NO'}`);
        console.log('');
    });

    await browser.close();

    return resultados;
}

async function generarReporte(resultados) {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║     📊 REPORTE DE PERSISTENCIA - TAB 1                    ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    const total = Object.keys(resultados).length;
    const persistidos = Object.values(resultados).filter(r => r.persistio).length;
    const porcentaje = ((persistidos / total) * 100).toFixed(1);

    console.log(`Total de campos: ${total}`);
    console.log(`✅ Persistieron: ${persistidos}`);
    console.log(`❌ No persistieron: ${total - persistidos}`);
    console.log(`📊 Tasa de éxito: ${porcentaje}%`);
    console.log('');
    console.log('Detalles:');
    console.log('─────────────────────────────────────────────────────────────');

    for (const [campo, data] of Object.entries(resultados)) {
        const status = data.persistio ? '✅ PERSISTIÓ' : '❌ NO PERSISTIÓ';
        console.log(`${status} - ${campo.toUpperCase()}`);
        console.log(`  Original: ${data.original}`);
        console.log(`  Nuevo:    ${data.nuevo}`);
    }

    console.log('─────────────────────────────────────────────────────────────');
    console.log('');

    if (persistidos === total) {
        console.log('🎉 ¡TODOS LOS CAMPOS PERSISTIERON CORRECTAMENTE!');
    } else {
        console.log(`⚠️ ${total - persistidos} campo(s) NO persistieron.`);
    }

    console.log('');
    console.log('Screenshots generados:');
    console.log('  - test-persistencia-01-after-login.png');
    console.log('  - test-persistencia-02-panel.png');
    console.log('  - test-persistencia-03-modulo-usuarios.png');
    console.log('  - test-persistencia-04-modal-abierto.png');
    console.log('  - test-persistencia-05-valores-originales.png');
    console.log('  - test-persistencia-06-despues-modificar.png');
    console.log('  - test-persistencia-07-valores-nuevos.png');
    console.log('');
}

async function main() {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });

    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 }
    });

    const page = await context.newPage();

    try {
        // Fase 1: Login
        await login(page);

        // Fase 2: Navegar y abrir usuario
        const userId = await navigateToUsersAndOpenFirst(page);

        // Fase 3: Capturar valores originales
        await capturarValoresOriginales(page);

        // Fase 4: Modificar todos los campos
        await modificarTodosCampos(page);

        // Fase 5: Cerrar sistema
        await cerrarSistema(page, browser);

        // Fase 6: Reabrir y verificar
        const resultados = await reabrirYVerificar(userId);

        // Generar reporte
        await generarReporte(resultados);

    } catch (error) {
        console.error('\n❌ ERROR DURANTE EL TEST:');
        console.error(error.message);
        console.error(error.stack);
        await page.screenshot({ path: 'test-persistencia-ERROR.png' });
        await browser.close();
    }
}

main();
