/**
 * ═══════════════════════════════════════════════════════════
 * DEMOSTRACIÓN EN VIVO - TAB 1 ADMINISTRACIÓN
 * ═══════════════════════════════════════════════════════════
 *
 * Este script abre el navegador y te guía paso a paso
 * para probar TODAS las funciones del TAB 1
 */

require('dotenv').config();
const { chromium } = require('playwright');
const database = require('./src/config/database');

async function demoTab1Live() {
    console.log('\n');
    console.log('='.repeat(80));
    console.log('🎬 DEMOSTRACIÓN EN VIVO - TAB 1 ADMINISTRACIÓN');
    console.log('='.repeat(80));
    console.log('\n');
    console.log('👀 El navegador se abrirá en modo VISIBLE');
    console.log('📝 Observa cada paso de la demostración');
    console.log('⏸️  Presiona Ctrl+C cuando quieras terminar\n');

    let browser, page;

    try {
        // PASO 1: Iniciar navegador VISIBLE
        console.log('📋 PASO 1: Iniciando navegador...');
        browser = await chromium.launch({
            headless: false,
            slowMo: 300,  // Más lento para que puedas ver
            args: ['--start-maximized']
        });

        const context = await browser.newContext({
            viewport: null  // Usar tamaño de ventana completo
        });

        page = await context.newPage();
        console.log('   ✅ Navegador iniciado\n');
        await page.waitForTimeout(1000);

        // PASO 2: Navegar a la página
        console.log('📋 PASO 2: Navegando a panel empresa...');
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForTimeout(2000);
        console.log('   ✅ Página cargada\n');

        // PASO 3: Login
        console.log('📋 PASO 3: Haciendo login...');
        console.log('   🔹 Seleccionando empresa: isi');

        await page.waitForSelector('#companySelect');
        await page.waitForTimeout(1000);

        // Seleccionar empresa
        const selectSuccess = await page.evaluate(() => {
            const select = document.getElementById('companySelect');
            const options = Array.from(select.options);
            const target = options.find(o => o.text && o.text.toLowerCase() === 'isi');
            if (target) {
                select.value = target.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
            return false;
        });

        if (!selectSuccess) {
            throw new Error('No se pudo seleccionar la empresa ISI');
        }

        await page.waitForTimeout(3000);
        console.log('   ✅ Empresa seleccionada\n');

        // Escribir usuario
        console.log('   🔹 Escribiendo usuario: soporte');
        await page.waitForSelector('input[type="text"]:not([disabled])');
        await page.fill('input[type="text"]:not([disabled])', 'soporte');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        console.log('   ✅ Usuario ingresado\n');

        // Escribir password
        console.log('   🔹 Escribiendo password');
        await page.waitForSelector('input[type="password"]:visible');
        await page.fill('input[type="password"]:visible', 'admin123');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        console.log('   ✅ Login completado\n');

        // PASO 4: Obtener un usuario de BD
        console.log('📋 PASO 4: Obteniendo usuario de la base de datos...');
        const [users] = await database.sequelize.query(`
            SELECT user_id, "firstName", "lastName", "email"
            FROM users
            WHERE company_id = 11
            ORDER BY user_id DESC
            LIMIT 1
        `);

        if (!users || users.length === 0) {
            throw new Error('No hay usuarios en la BD');
        }

        const userId = users[0].user_id;
        const userName = `${users[0].firstName} ${users[0].lastName}`;
        console.log(`   ✅ Usuario seleccionado: ${userName}`);
        console.log(`   📍 ID: ${userId}`);
        console.log(`   📧 Email: ${users[0].email}\n`);

        // PASO 5: Navegar a Usuarios
        console.log('📋 PASO 5: Navegando al módulo de Usuarios...');
        await page.click('text=Usuarios');
        await page.waitForTimeout(3000);
        console.log('   ✅ Módulo Usuarios abierto\n');

        // PASO 6: Abrir modal VER
        console.log('📋 PASO 6: Abriendo modal VER del usuario...');
        await page.evaluate((uid) => {
            viewUser(uid);
        }, userId);
        await page.waitForTimeout(2000);

        const modalVisible = await page.isVisible('#employeeFileModal');
        if (!modalVisible) {
            throw new Error('Modal no se abrió');
        }
        console.log('   ✅ Modal VER abierto\n');

        // PASO 7: Demostración de las 10 funciones
        console.log('='.repeat(80));
        console.log('🎯 DEMOSTRACIÓN DE LAS 10 FUNCIONES DEL TAB 1');
        console.log('='.repeat(80));
        console.log('\n⏸️  Presiona Ctrl+C cuando termines de ver la demostración\n');
        console.log('📝 Funciones a probar:\n');
        console.log('   1. 🏢 Gestionar Sucursales (NUEVO)');
        console.log('   2. 🔄 Cambiar Departamento (NUEVO)');
        console.log('   3. 🕐 Asignar Turnos');
        console.log('   4. 📊 Generar Reporte (NUEVO)');
        console.log('   5. 📋 Historial de Cambios (NUEVO)');
        console.log('   6. ✏️ Cambiar Rol');
        console.log('   7. 🔒 Activar/Desactivar');
        console.log('   8. 📍 Configurar GPS');
        console.log('   9. ✏️ Editar Posición');
        console.log('   10. 🔑 Resetear Contraseña\n');

        console.log('='.repeat(80));
        console.log('👉 AHORA PUEDES INTERACTUAR CON EL NAVEGADOR');
        console.log('='.repeat(80));
        console.log('\n💡 INSTRUCCIONES:\n');
        console.log('1. Observa el TAB 1 "⚙️ Administración" en el modal');
        console.log('2. Haz click en cada botón para probar las funciones');
        console.log('3. Los modales se abrirán para cada función');
        console.log('4. Puedes llenar campos y GUARDAR para ver persistencia');
        console.log('5. Presiona Ctrl+C cuando termines\n');

        // Resaltar el TAB 1
        await page.evaluate(() => {
            const adminTab = document.querySelector('button.file-tab.active');
            if (adminTab) {
                adminTab.style.animation = 'pulse 1s infinite';
            }
        });

        console.log('🎬 El navegador está listo para que lo uses\n');
        console.log('='.repeat(80));
        console.log('⏸️  MANTÉN ESTA VENTANA ABIERTA');
        console.log('⏸️  Presiona Ctrl+C cuando termines la demostración');
        console.log('='.repeat(80));

        // Verificar persistencia cada 5 segundos
        let checkCount = 0;
        const checkInterval = setInterval(async () => {
            checkCount++;
            try {
                const [currentData] = await database.sequelize.query(`
                    SELECT "firstName", "lastName", "departmentId", "defaultBranchId", "position"
                    FROM users
                    WHERE user_id = $1
                `, {
                    bind: [userId]
                });

                if (currentData && currentData.length > 0) {
                    const data = currentData[0];
                    console.log(`\n🔍 Verificación de persistencia #${checkCount}:`);
                    console.log(`   📝 Nombre: ${data.firstName} ${data.lastName}`);
                    console.log(`   🏢 Departamento ID: ${data.departmentId || 'Sin asignar'}`);
                    console.log(`   🏢 Sucursal por defecto: ${data.defaultBranchId || 'Sin asignar'}`);
                    console.log(`   💼 Posición: ${data.position || 'Sin especificar'}`);
                }
            } catch (error) {
                console.log(`   ⚠️ Error verificando persistencia: ${error.message}`);
            }
        }, 10000); // Cada 10 segundos

        // Mantener abierto
        await new Promise(() => {});

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        if (browser) {
            console.log('\n⏸️  Cerrando navegador en 5 segundos...');
            await page.waitForTimeout(5000);
            await browser.close();
        }
        process.exit(1);
    }
}

// Ejecutar demostración
demoTab1Live().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
});
