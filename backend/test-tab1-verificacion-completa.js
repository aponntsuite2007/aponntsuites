const { chromium } = require('playwright');
const { Pool } = require('pg');

// Configuración de BD
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'sistema_asistencia',
    user: 'postgres',
    password: 'Lanus2025'
});

async function verificarCampoCompleto(page, userId, campo, valorInicial, valorNuevo, funcionCambio) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🧪 TESTEANDO CAMPO: ${campo}`);
    console.log(`${'='.repeat(80)}`);

    // PASO 1: Abrir usuario y leer valor inicial
    console.log('\n📂 PASO 1: Abriendo modal de usuario...');
    const verButton = await page.locator('button.btn-mini.btn-info[title="Ver"]').first();
    await verButton.click();
    await page.waitForTimeout(2000);

    const valorInicialPantalla = await funcionCambio.leerValor(page);
    console.log(`   Valor inicial en pantalla: ${valorInicialPantalla}`);

    // PASO 2: Cambiar el campo
    console.log(`\n✏️  PASO 2: Cambiando ${campo} de "${valorInicialPantalla}" a "${valorNuevo}"...`);
    await funcionCambio.cambiar(page, valorNuevo);
    await page.waitForTimeout(1000);

    // PASO 3: Verificar en BD que se guardó
    console.log('\n🗄️  PASO 3: Verificando en base de datos...');
    const resultBD = await pool.query(
        `SELECT ${funcionCambio.columnaBD} FROM users WHERE id = $1`,
        [userId]
    );
    const valorEnBD = resultBD.rows[0][funcionCambio.columnaBD];
    console.log(`   Valor en BD: ${valorEnBD}`);

    const bdMatch = funcionCambio.compararBD(valorEnBD, valorNuevo);
    if (bdMatch) {
        console.log('   ✅ BD ACTUALIZADA CORRECTAMENTE');
    } else {
        console.log(`   ❌ BD NO SE ACTUALIZÓ (esperado: ${valorNuevo}, actual: ${valorEnBD})`);
        return { campo, paso: 'BD', exito: false };
    }

    // PASO 4: Cerrar modal
    console.log('\n🚪 PASO 4: Cerrando modal...');
    const cerrarBtn = await page.locator('button:has-text("Cerrar Expediente")');
    await cerrarBtn.click();
    await page.waitForTimeout(1000);

    // PASO 5: Volver a abrir usuario
    console.log('\n🔄 PASO 5: Volviendo a abrir usuario para verificar persistencia...');
    const verButton2 = await page.locator('button.btn-mini.btn-info[title="Ver"]').first();
    await verButton2.click();
    await page.waitForTimeout(2000);

    // PASO 6: Leer valor en pantalla después de reabrir
    console.log('\n👀 PASO 6: Leyendo valor actualizado en pantalla...');
    const valorFinalPantalla = await funcionCambio.leerValor(page);
    console.log(`   Valor en pantalla: ${valorFinalPantalla}`);

    const pantallaMatch = funcionCambio.compararPantalla(valorFinalPantalla, valorNuevo);
    if (pantallaMatch) {
        console.log('   ✅ PANTALLA MUESTRA VALOR CORRECTO');
    } else {
        console.log(`   ❌ PANTALLA NO SE ACTUALIZÓ (esperado: ${valorNuevo}, actual: ${valorFinalPantalla})`);
        return { campo, paso: 'Pantalla', exito: false };
    }

    // PASO 7: Tomar screenshot
    await page.screenshot({
        path: `backend/verificacion-${campo.toLowerCase().replace(/\s/g, '-')}.png`,
        fullPage: true
    });

    console.log(`\n✅ ¡CAMPO ${campo.toUpperCase()} FUNCIONA CORRECTAMENTE!`);
    console.log('   • Cambio se guardó en BD ✅');
    console.log('   • Cambio persiste al reabrir ✅');
    console.log('   • Pantalla muestra valor correcto ✅');

    return { campo, paso: 'Completo', exito: true };
}

// Definición de funciones para cada campo
const campos = {
    GPS: {
        columnaBD: 'gps_enabled',
        leerValor: async (page) => {
            const gpsText = await page.locator('text=/GPS|restricción/i').first().textContent();
            return gpsText.includes('Sin restricción') ? 'Sin restricción' : 'Restringido';
        },
        cambiar: async (page, valor) => {
            // Buscar el botón de GPS en la sección "Configuración GPS y Ubicación"
            const gpsButton = await page.locator('button:has-text("Activar GPS"), button:has-text("Desactivar GPS")').first();
            await gpsButton.click();
            await page.waitForTimeout(2000);
        },
        compararBD: (valorBD, esperado) => {
            // gps_enabled: true = restringido, false = sin restricción
            if (esperado === 'Restringido') return valorBD === true;
            if (esperado === 'Sin restricción') return valorBD === false;
            return false;
        },
        compararPantalla: (valorPantalla, esperado) => {
            return valorPantalla === esperado;
        }
    },

    ESTADO: {
        columnaBD: 'is_active',
        leerValor: async (page) => {
            const estadoBadge = await page.locator('.badge:has-text("ACTIVO"), .badge:has-text("Bloqueado")').first().textContent();
            return estadoBadge.includes('ACTIVO') ? 'Activo' : 'Bloqueado';
        },
        cambiar: async (page, valor) => {
            const estadoButton = await page.locator('button:has-text("Activar"), button:has-text("Desactivar")').first();
            await estadoButton.click();
            await page.waitForTimeout(2000);
        },
        compararBD: (valorBD, esperado) => {
            if (esperado === 'Activo') return valorBD === true;
            if (esperado === 'Bloqueado') return valorBD === false;
            return false;
        },
        compararPantalla: (valorPantalla, esperado) => {
            return valorPantalla === esperado;
        }
    },

    DEPARTAMENTO: {
        columnaBD: 'department_id',
        leerValor: async (page) => {
            const deptText = await page.locator('text=/Departamento:/i').locator('..').textContent();
            return deptText.split(':')[1]?.trim() || 'Sin departamento';
        },
        cambiar: async (page, valor) => {
            // Click en botón "Cambiar Departamento"
            const cambiarBtn = await page.locator('button:has-text("Cambiar Departamento")');
            await cambiarBtn.click();
            await page.waitForTimeout(1000);

            // Seleccionar primer departamento del dropdown
            await page.selectOption('select[name="department"]', { index: 1 });
            await page.waitForTimeout(500);

            // Guardar
            const guardarBtn = await page.locator('button:has-text("Guardar")');
            await guardarBtn.click();
            await page.waitForTimeout(2000);
        },
        compararBD: (valorBD, esperado) => {
            // Verificar que department_id no sea null
            return valorBD !== null && valorBD !== undefined;
        },
        compararPantalla: (valorPantalla, esperado) => {
            return valorPantalla !== 'Sin departamento';
        }
    },

    SUCURSAL: {
        columnaBD: 'branch_id',
        leerValor: async (page) => {
            const sucText = await page.locator('text=/Sucursal:/i').locator('..').textContent();
            return sucText.split(':')[1]?.trim() || 'Sin sucursal';
        },
        cambiar: async (page, valor) => {
            // Click en botón "Asignar Sucursales"
            const asignarBtn = await page.locator('button:has-text("Asignar Sucursales")');
            await asignarBtn.click();
            await page.waitForTimeout(1000);

            // Marcar primer checkbox
            const checkbox = await page.locator('input[type="checkbox"]').first();
            await checkbox.check();
            await page.waitForTimeout(500);

            // Guardar
            const guardarBtn = await page.locator('button:has-text("Guardar")');
            await guardarBtn.click();
            await page.waitForTimeout(2000);
        },
        compararBD: (valorBD, esperado) => {
            return valorBD !== null && valorBD !== undefined;
        },
        compararPantalla: (valorPantalla, esperado) => {
            return valorPantalla !== 'Sin sucursal';
        }
    },

    CARGO: {
        columnaBD: 'position',
        leerValor: async (page) => {
            const cargoText = await page.locator('text=/Cargo:/i').locator('..').textContent();
            return cargoText.split(':')[1]?.trim() || '';
        },
        cambiar: async (page, valor) => {
            // Click en botón editar cargo
            const editarBtn = await page.locator('button[title="Editar Cargo"]');
            await editarBtn.click();
            await page.waitForTimeout(500);

            // Cambiar input
            const input = await page.locator('input[name="position"]');
            await input.fill(valor);
            await page.waitForTimeout(500);

            // Click en checkmark para guardar
            const guardarBtn = await page.locator('button[title="Guardar Cargo"]');
            await guardarBtn.click();
            await page.waitForTimeout(2000);
        },
        compararBD: (valorBD, esperado) => {
            return valorBD === esperado;
        },
        compararPantalla: (valorPantalla, esperado) => {
            return valorPantalla === esperado;
        }
    },

    ROL: {
        columnaBD: 'role',
        leerValor: async (page) => {
            const rolText = await page.locator('text=/Rol:/i').locator('..').textContent();
            return rolText.split(':')[1]?.trim() || '';
        },
        cambiar: async (page, valor) => {
            // Click en botón editar rol
            const editarBtn = await page.locator('button[title="Editar Rol"]');
            await editarBtn.click();
            await page.waitForTimeout(500);

            // Cambiar select
            await page.selectOption('select[name="role"]', valor);
            await page.waitForTimeout(500);

            // Click en checkmark para guardar
            const guardarBtn = await page.locator('button[title="Guardar Rol"]');
            await guardarBtn.click();
            await page.waitForTimeout(2000);
        },
        compararBD: (valorBD, esperado) => {
            return valorBD === esperado;
        },
        compararPantalla: (valorPantalla, esperado) => {
            return valorPantalla.toLowerCase() === esperado.toLowerCase();
        }
    }
};

async function runTests() {
    console.log('🚀 INICIANDO VERIFICACIÓN COMPLETA DE TAB 1\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // LOGIN
        console.log('🔐 Iniciando sesión...');
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForTimeout(3000);

        // Esperar que cargue el dropdown de empresas (más de 1 option = placeholder + empresas)
        await page.waitForFunction(() => {
            const select = document.getElementById('companySelect');
            return select && select.options.length > 1;
        }, { timeout: 10000 });

        // Seleccionar empresa ISI
        const companies = await page.locator('#companySelect option').allTextContents();
        const isiIndex = companies.findIndex(c => c.includes('ISI'));
        console.log(`   Empresas disponibles: ${companies.length}`);
        console.log(`   ISI encontrada en índice: ${isiIndex}`);
        await page.selectOption('#companySelect', { index: isiIndex });
        await page.waitForTimeout(1000);

        // Esperar que el campo usuario se habilite
        await page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
        await page.fill('#userInput', 'soporte');
        await page.waitForTimeout(500);

        // Esperar que el campo password se habilite
        await page.waitForSelector('#passwordInput:not([disabled])', { timeout: 5000 });
        await page.fill('#passwordInput', 'admin123');
        await page.waitForTimeout(500);

        // Click en botón Ingresar
        await page.click('#loginButton');
        await page.waitForTimeout(5000);

        // Navegar a módulo de usuarios
        console.log('📍 Navegando a módulo de Usuarios...');
        await page.click('text=Usuarios');
        await page.waitForTimeout(2000);

        // Obtener primer usuario
        const firstRow = await page.locator('#users-list table.data-table tbody tr').first();
        const userId = await firstRow.getAttribute('data-id');
        console.log(`✓ Usuario seleccionado: ${userId}\n`);

        // Resultados
        const resultados = [];

        // TESTEAR CADA CAMPO
        resultados.push(await verificarCampoCompleto(
            page, userId, 'GPS', null, 'Restringido', campos.GPS
        ));

        resultados.push(await verificarCampoCompleto(
            page, userId, 'ESTADO', null, 'Bloqueado', campos.ESTADO
        ));

        resultados.push(await verificarCampoCompleto(
            page, userId, 'CARGO', null, 'Gerente de Operaciones', campos.CARGO
        ));

        resultados.push(await verificarCampoCompleto(
            page, userId, 'ROL', null, 'operador', campos.ROL
        ));

        // REPORTE FINAL
        console.log('\n\n');
        console.log('═'.repeat(80));
        console.log('📊 REPORTE FINAL DE VERIFICACIÓN');
        console.log('═'.repeat(80));

        const exitosos = resultados.filter(r => r.exito).length;
        const fallidos = resultados.filter(r => !r.exito).length;

        resultados.forEach(r => {
            const icono = r.exito ? '✅' : '❌';
            console.log(`${icono} ${r.campo}: ${r.exito ? 'FUNCIONA' : `FALLA en ${r.paso}`}`);
        });

        console.log('\n' + '═'.repeat(80));
        console.log(`TOTAL: ${exitosos}/${resultados.length} campos funcionando correctamente`);
        console.log('═'.repeat(80));

        if (exitosos === resultados.length) {
            console.log('\n🎉 ¡TODOS LOS CAMPOS DEL TAB 1 FUNCIONAN PERFECTAMENTE!');
        } else {
            console.log(`\n⚠️  ${fallidos} campo(s) necesitan corrección`);
        }

    } catch (error) {
        console.error('\n❌ ERROR EN TEST:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
        await browser.close();
    }
}

runTests();
