/**
 * ═══════════════════════════════════════════════════════════
 * TEST MANUAL - TAB 1 CON NAVEGADOR ABIERTO PARA INSPECCIÓN
 * ═══════════════════════════════════════════════════════════
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function testTab1Manual() {
    console.log('\n🎯 TEST MANUAL - TAB 1 ADMINISTRACIÓN\n');
    console.log('═'.repeat(80));
    console.log('ESTE TEST ABRE EL NAVEGADOR Y SE QUEDA ESPERANDO');
    console.log('PARA QUE PUEDAS PROBAR MANUALMENTE');
    console.log('═'.repeat(80));
    console.log('\n');

    let browser;

    try {
        // Iniciar navegador
        console.log('📋 Iniciando navegador...');
        browser = await chromium.launch({
            headless: false,
            slowMo: 500,
            args: ['--start-maximized']
        });

        const context = await browser.newContext({ viewport: null });
        const page = await context.newPage();
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

        // INSTRUCCIONES
        console.log('='.repeat(80));
        console.log('✅ NAVEGADOR LISTO PARA PRUEBAS MANUALES');
        console.log('='.repeat(80));
        console.log('\n📝 INSTRUCCIONES:\n');
        console.log('1. Click en "Usuarios" en el menú lateral');
        console.log('2. Espera a que cargue la tabla');
        console.log('3. Click en el botón "VER" (👁️) de cualquier usuario');
        console.log('4. Se abrirá el modal con 9 TABs');
        console.log('5. Verifica que TAB 1 muestra los datos correctamente\n');
        console.log('6. PRUEBA LOS 6 BOTONES DE TAB 1:\n');
        console.log('   ✅ Cambiar Departamento → Selecciona otro → Guardar');
        console.log('      → Verifica que el campo "Departamento" se actualiza INMEDIATAMENTE');
        console.log('   ✅ Cambiar Rol → Cambia el rol → OK');
        console.log('      → Verifica que el campo "Rol" se actualiza INMEDIATAMENTE');
        console.log('   ✅ Cambiar Posición → Escribe nueva posición → OK');
        console.log('      → Verifica que el campo "Posición" se actualiza INMEDIATAMENTE');
        console.log('   ✅ Activar/Desactivar usuario');
        console.log('      → Verifica que el "Estado" cambia INMEDIATAMENTE');
        console.log('   ✅ Configurar Sucursales → Asigna sucursales → Guardar');
        console.log('      → Verifica que el campo "Sucursal" se actualiza INMEDIATAMENTE');
        console.log('   ✅ GPS Restringido/Sin restricción');
        console.log('      → Verifica que el campo "GPS" cambia INMEDIATAMENTE\n');
        console.log('═'.repeat(80));
        console.log('⏸️  Presiona Ctrl+C cuando termines de probar');
        console.log('═'.repeat(80));
        console.log('\n');

        // Mantener abierto
        await new Promise(() => {});

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        if (browser) await browser.close();
        process.exit(1);
    }
}

testTab1Manual().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
});
