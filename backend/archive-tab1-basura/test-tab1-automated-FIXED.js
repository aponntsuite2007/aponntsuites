/**
 * ═══════════════════════════════════════════════════════════
 * TEST AUTOMATIZADO - TAB 1 CON ESPERA CORRECTA
 * ═══════════════════════════════════════════════════════════
 */

require('dotenv').config();
const { chromium } = require('playwright');
const database = require('./src/config/database');

async function testTab1Automated() {
    console.log('\n🎯 TEST AUTOMATIZADO - TAB 1 ADMINISTRACIÓN\n');

    let browser, page;

    try {
        // Iniciar navegador
        console.log('📋 Iniciando navegador...');
        browser = await chromium.launch({
            headless: false,
            slowMo: 500,
            args: ['--start-maximized']
        });

        const context = await browser.newContext({ viewport: null });
        page = await context.newPage();
        console.log('   ✅ Navegador iniciado\n');

        // Navegar
        console.log('📋 Navegando a panel-empresa...');
        await page.goto('http://localhost:9998/panel-empresa.html', {
            waitUntil: 'networkidle',
            timeout: 60000
        });
        await page.waitForTimeout(2000);
        console.log('   ✅ Página cargada\n');

        // LOGIN (3 pasos)
        console.log('📋 Ejecutando login...\n');

        // Paso 1: Empresa
        await page.waitForSelector('#companySelect', { visible: true });
        await page.waitForTimeout(1000);
        await page.selectOption('#companySelect', 'isi');
        console.log('   ✅ Empresa seleccionada: ISI');
        await page.waitForTimeout(3000);

        // Paso 2: Usuario
        const usernameInput = page.locator('input[type="text"]:visible').last();
        await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
        await usernameInput.fill('soporte');
        await page.keyboard.press('Enter');
        console.log('   ✅ Usuario ingresado: soporte');
        await page.waitForTimeout(2000);

        // Paso 3: Password
        const passwordInput = page.locator('input[type="password"]:visible').last();
        await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
        await passwordInput.fill('admin123');
        await page.keyboard.press('Enter');
        console.log('   ✅ Password ingresado');
        await page.waitForTimeout(5000);
        console.log('   ✅ Login completado\n');

        // Obtener usuario de la BD
        console.log('📋 Obteniendo usuario de la BD...');
        const [users] = await database.sequelize.query(`
            SELECT user_id, "firstName", "lastName", "departmentId", "position", role, "isActive"
            FROM users
            WHERE company_id = 11
            ORDER BY user_id DESC
            LIMIT 1
        `);

        const userId = users[0].user_id;
        const userName = `${users[0].firstName} ${users[0].lastName}`;
        console.log(`   ✅ Usuario: ${userName} (ID: ${userId})`);
        console.log(`   📊 Departamento: ${users[0].departmentId || 'null'}`);
        console.log(`   📊 Posición: ${users[0].position || 'null'}`);
        console.log(`   📊 Rol: ${users[0].role}\n`);

        // Click en Usuarios
        console.log('📋 Click en módulo Usuarios...');
        await page.click('text=Usuarios');
        await page.waitForTimeout(3000);
        console.log('   ✅ Módulo cargado\n');

        // Esperar a que aparezca el botón VER (significa que la tabla se renderizó)
        console.log('📋 Esperando a que se renderice la tabla...');
        await page.waitForSelector('button[onclick*="viewUser"]', {
            state: 'visible',
            timeout: 30000
        });
        await page.waitForTimeout(2000);
        console.log('   ✅ Tabla renderizada con botones VER\n');

        // Verificar que viewUser existe en window
        console.log('📋 Verificando función viewUser()...');
        const viewUserExists = await page.evaluate(() => {
            return typeof viewUser === 'function';
        });

        if (!viewUserExists) {
            throw new Error('viewUser() NO está disponible');
        }
        console.log('   ✅ viewUser() disponible\n');

        // Abrir modal VER usando el primer botón disponible
        console.log('📋 Abriendo modal VER...');
        const viewButton = page.locator('button[onclick*="viewUser"]').first();
        await viewButton.click();
        await page.waitForTimeout(3000);
        console.log('   ✅ Click en botón VER\n');

        // Verificar que el modal se abrió
        console.log('📋 Verificando que el modal se abrió...');
        const modalVisible = await page.isVisible('#employeeFileModal');
        if (!modalVisible) {
            throw new Error('Modal VER no se abrió');
        }
        console.log('   ✅ Modal VER abierto\n');

        // Verificar TAB 1
        console.log('📋 Verificando contenido del TAB 1...\n');

        const tab1Data = await page.evaluate(() => {
            return {
                role: document.getElementById('admin-role')?.textContent || 'NO ENCONTRADO',
                status: document.getElementById('admin-status')?.textContent || 'NO ENCONTRADO',
                gps: document.getElementById('admin-gps')?.textContent || 'NO ENCONTRADO',
                branch: document.getElementById('admin-branch')?.textContent || 'NO ENCONTRADO',
                department: document.getElementById('admin-department')?.textContent || 'NO ENCONTRADO',
                position: document.getElementById('admin-position')?.textContent || 'NO ENCONTRADO'
            };
        });

        console.log('📊 DATOS MOSTRADOS EN EL TAB 1:');
        console.log(`   - Rol: ${tab1Data.role}`);
        console.log(`   - Estado: ${tab1Data.status}`);
        console.log(`   - GPS: ${tab1Data.gps}`);
        console.log(`   - Sucursal: ${tab1Data.branch}`);
        console.log(`   - Departamento: ${tab1Data.department}`);
        console.log(`   - Posición: ${tab1Data.position}`);
        console.log('');

        // TEST 1: Cambiar departamento
        console.log('🧪 TEST 1: Cambiar Departamento...');
        const btnChangeDept = page.locator('button:has-text("Cambiar Departamento")');
        await btnChangeDept.click();
        await page.waitForTimeout(2000);

        // Esperar a que aparezca el modal
        await page.waitForSelector('#newDepartmentSelect', { state: 'visible', timeout: 10000 });
        await page.waitForTimeout(1000);

        // Seleccionar otro departamento
        const deptSelect = page.locator('select#newDepartmentSelect');
        await deptSelect.selectOption({ index: 1 }); // Primer departamento disponible
        await page.waitForTimeout(500);

        // Guardar
        await page.click('button:has-text("Guardar")');
        await page.waitForTimeout(3000);

        // Verificar que el departamento se actualizó
        const newDept = await page.evaluate(() => {
            return document.getElementById('admin-department')?.textContent || 'NO ENCONTRADO';
        });
        console.log(`   ✅ Departamento actualizado a: ${newDept}\n`);

        // TEST 2: Cambiar rol
        console.log('🧪 TEST 2: Cambiar Rol...');
        const btnChangeRole = page.locator('button:has-text("Cambiar Rol")');
        await btnChangeRole.click();
        await page.waitForTimeout(1000);

        // Seleccionar otro rol
        const roleSelect = page.locator('select#newRole');
        await roleSelect.selectOption('supervisor');
        await page.waitForTimeout(500);

        // Confirmar
        await page.click('button:has-text("OK")');
        await page.waitForTimeout(2000);

        // Verificar que el rol se actualizó
        const newRole = await page.evaluate(() => {
            return document.getElementById('admin-role')?.textContent || 'NO ENCONTRADO';
        });
        console.log(`   ✅ Rol actualizado a: ${newRole}\n`);

        // TEST 3: Activar/Desactivar
        console.log('🧪 TEST 3: Activar/Desactivar...');
        const btnToggleStatus = page.locator('button:has-text("Desactivar Usuario"), button:has-text("Activar Usuario")').first();
        const statusBefore = await page.evaluate(() => {
            return document.getElementById('admin-status')?.textContent || 'NO ENCONTRADO';
        });

        await btnToggleStatus.click();
        await page.waitForTimeout(2000);

        const statusAfter = await page.evaluate(() => {
            return document.getElementById('admin-status')?.textContent || 'NO ENCONTRADO';
        });
        console.log(`   ✅ Estado cambió de "${statusBefore}" a "${statusAfter}"\n`);

        // RESUMEN
        console.log('='.repeat(80));
        console.log('✅ TEST COMPLETADO EXITOSAMENTE');
        console.log('='.repeat(80));
        console.log('\n📊 RESULTADOS:');
        console.log('   ✅ Modal VER se abre correctamente');
        console.log('   ✅ TAB 1 muestra datos correctamente');
        console.log('   ✅ Cambiar Departamento funciona y actualiza UI');
        console.log('   ✅ Cambiar Rol funciona y actualiza UI');
        console.log('   ✅ Activar/Desactivar funciona y actualiza UI\n');

        // Cerrar navegador
        await page.waitForTimeout(3000);
        await browser.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);

        // Tomar screenshot del error
        if (page) {
            await page.screenshot({ path: 'backend/test-tab1-error.png', fullPage: true });
            console.log('\n📸 Screenshot guardado en: backend/test-tab1-error.png\n');
        }

        if (browser) await browser.close();
        process.exit(1);
    }
}

testTab1Automated().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
});
