/**
 * ═══════════════════════════════════════════════════════════
 * TEST VISUAL REAL - TAB 1 CON ESPERA DE CARGA DEL MÓDULO
 * ═══════════════════════════════════════════════════════════
 */

require('dotenv').config();
const { chromium } = require('playwright');
const database = require('./src/config/database');

async function testTab1VisualReal() {
    console.log('\n🎯 TEST VISUAL REAL - TAB 1 ADMINISTRACIÓN\n');

    let browser, page;

    try {
        // Iniciar navegador
        console.log('📋 Iniciando navegador...');
        browser = await chromium.launch({
            headless: false,
            slowMo: 800, // MÁS LENTO para ver mejor
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
        console.log('📋 Ejecutando login...');

        // Paso 1: Empresa
        await page.waitForSelector('#companySelect', { visible: true });
        await page.waitForTimeout(1000);
        await page.selectOption('#companySelect', 'isi');
        console.log('   ✅ Empresa seleccionada');
        await page.waitForTimeout(5000);

        // Paso 2: Usuario
        const usernameInput = page.locator('input[type="text"]:visible').last();
        await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
        await usernameInput.fill('soporte');
        await page.keyboard.press('Enter');
        console.log('   ✅ Usuario ingresado');
        await page.waitForTimeout(3000);

        // Paso 3: Password
        const passwordInput = page.locator('input[type="password"]:visible').last();
        await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
        await passwordInput.fill('admin123');
        await page.keyboard.press('Enter');
        console.log('   ✅ Password ingresado');
        await page.waitForTimeout(5000); // Esperar más para carga completa
        console.log('   ✅ Login completado\n');

        // Obtener usuario
        console.log('📋 Obteniendo usuario...');
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
        console.log(`   📊 Departamento actual: ${users[0].departmentId || 'null'}`);
        console.log(`   📊 Posición actual: ${users[0].position || 'null'}`);
        console.log(`   📊 Rol actual: ${users[0].role}`);
        console.log(`   📊 Estado actual: ${users[0].isActive ? 'Activo' : 'Inactivo'}\n`);

        // Click en Usuarios
        console.log('📋 Navegando a módulo Usuarios...');
        await page.click('text=Usuarios');
        await page.waitForTimeout(3000);

        // ESPERAR A QUE LA TABLA SE CARGUE
        console.log('📋 Esperando a que se cargue la tabla de usuarios...');
        await page.waitForSelector('#usersTableBody', { state: 'visible', timeout: 15000 });
        await page.waitForTimeout(2000); // Esperar un poco más para scripts
        console.log('   ✅ Tabla de usuarios cargada\n');

        // Verificar que viewUser existe
        console.log('📋 Verificando que viewUser() está disponible...');
        const viewUserExists = await page.evaluate(() => {
            return typeof viewUser === 'function';
        });

        if (!viewUserExists) {
            console.log('   ❌ ERROR: viewUser() NO está definida');
            console.log('   🔍 Verificando qué funciones existen en window...\n');

            const windowFunctions = await page.evaluate(() => {
                const funcs = [];
                for (let key in window) {
                    if (typeof window[key] === 'function' && key.includes('user')) {
                        funcs.push(key);
                    }
                }
                return funcs;
            });

            console.log('   Funciones relacionadas con "user":', windowFunctions);

            throw new Error('viewUser() no está disponible - módulo no cargado correctamente');
        }

        console.log('   ✅ viewUser() está disponible\n');

        // Abrir modal VER usando click en botón
        console.log('📋 Abriendo modal VER usando botón de la tabla...');

        // Buscar el botón VER en la primera fila
        const viewButton = page.locator(`button[onclick*="viewUser('${userId}')"]`).first();
        const buttonExists = await viewButton.count() > 0;

        if (!buttonExists) {
            console.log('   ⚠️  Botón VER no encontrado, usando evaluate...');
            await page.evaluate((uid) => viewUser(uid), userId);
        } else {
            console.log('   ✅ Botón VER encontrado, haciendo click...');
            await viewButton.click();
        }

        await page.waitForTimeout(3000);

        // Verificar modal
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

        // RESUMEN
        console.log('='.repeat(80));
        console.log('✅ TEST COMPLETADO EXITOSAMENTE');
        console.log('='.repeat(80));
        console.log('\n👀 El navegador permanece abierto para inspección manual');
        console.log('⏸️  Presiona Ctrl+C para cerrar\n');
        console.log('💡 AHORA PUEDES PROBAR MANUALMENTE:');
        console.log('   1. Click en "Cambiar Departamento" → Selecciona otro → Guardar');
        console.log('   2. Verifica que el campo "Departamento" se actualiza INMEDIATAMENTE');
        console.log('   3. Click en "Cambiar Rol" → Cambia el rol → OK');
        console.log('   4. Verifica que el campo "Rol" se actualiza INMEDIATAMENTE');
        console.log('   5. Click en "Activar/Desactivar"');
        console.log('   6. Verifica que el "Estado" cambia INMEDIATAMENTE\n');

        // Mantener abierto
        await new Promise(() => {});

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        if (browser) await browser.close();
        process.exit(1);
    }
}

testTab1VisualReal().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
});
