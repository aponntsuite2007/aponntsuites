/**
 * DEMOSTRACIÓN SIMPLE - TAB 1
 * Usa Phase4TestOrchestrator que ya tiene login funcionando
 */

require('dotenv').config();
const Phase4TestOrchestrator = require('./src/auditor/core/Phase4TestOrchestrator');
const database = require('./src/config/database');

async function demoTab1Simple() {
    console.log('\n');
    console.log('='.repeat(80));
    console.log('🎬 DEMOSTRACIÓN EN VIVO - TAB 1 ADMINISTRACIÓN');
    console.log('='.repeat(80));
    console.log('\n');

    const orchestrator = new Phase4TestOrchestrator(
        {
            baseUrl: 'http://localhost:9998',
            headless: false,  // VISIBLE
            slowMo: 500,      // LENTO para que veas
            timeout: 60000
        },
        database
    );

    try {
        // PASO 1: Iniciar
        console.log('📋 PASO 1: Iniciando sistema...');
        await orchestrator.start();
        console.log('   ✅ Sistema iniciado\n');

        // PASO 2: Login
        console.log('📋 PASO 2: Haciendo login...');
        console.log('   🔹 Empresa: isi');
        console.log('   🔹 Usuario: soporte');
        console.log('   🔹 Password: admin123\n');
        await orchestrator.login('isi', 'soporte', 'admin123');
        console.log('   ✅ Login completado\n');

        // PASO 3: Obtener usuario
        console.log('📋 PASO 3: Obteniendo usuario de BD...');
        const [users] = await database.sequelize.query(`
            SELECT user_id, "firstName", "lastName", "email", "departmentId", "position"
            FROM users
            WHERE company_id = 11
            ORDER BY user_id DESC
            LIMIT 1
        `);

        const userId = users[0].user_id;
        const userName = `${users[0].firstName} ${users[0].lastName}`;
        console.log(`   ✅ Usuario: ${userName}`);
        console.log(`   📍 ID: ${userId}\n`);

        // PASO 4: Navegar a Users
        console.log('📋 PASO 4: Navegando a Usuarios...');
        await orchestrator.page.click('text=Usuarios');
        await orchestrator.wait(3000);
        console.log('   ✅ Módulo Usuarios abierto\n');

        // PASO 5: Abrir modal VER
        console.log('📋 PASO 5: Abriendo modal VER...');
        await orchestrator.page.evaluate((uid) => {
            viewUser(uid);
        }, userId);
        await orchestrator.wait(2000);
        console.log('   ✅ Modal VER abierto\n');

        // Mostrar instrucciones
        console.log('='.repeat(80));
        console.log('👉 EL NAVEGADOR ESTÁ ABIERTO Y LISTO');
        console.log('='.repeat(80));
        console.log('\n📝 FUNCIONES IMPLEMENTADAS EN EL TAB 1:\n');
        console.log('   1. 🏢 Gestionar Sucursales (botón azul) - NUEVO ✨');
        console.log('   2. 🔄 Cambiar Departamento (botón verde) - NUEVO ✨');
        console.log('   3. 🕐 Asignar Turnos (botón verde)');
        console.log('   4. 📊 Generar Reporte (botón verde) - NUEVO ✨');
        console.log('   5. 📋 Historial de Cambios (botón gris) - NUEVO ✨');
        console.log('   6. ✏️ Cambiar Rol (botón azul)');
        console.log('   7. 🔒 Activar/Desactivar (botón gris)');
        console.log('   8. 📍 Configurar GPS (botón amarillo)');
        console.log('   9. ✏️ Editar Posición (botón azul)');
        console.log('   10. 🔑 Resetear Contraseña (botón amarillo)\n');

        console.log('💡 PRUEBA CADA FUNCIÓN:\n');
        console.log('   • Haz click en cada botón');
        console.log('   • Los modales se abrirán');
        console.log('   • Puedes llenar campos y GUARDAR');
        console.log('   • Verás la persistencia en tiempo real\n');

        console.log('='.repeat(80));
        console.log('⏸️  PRESIONA CTRL+C CUANDO TERMINES');
        console.log('='.repeat(80));

        // Monitorear cambios en BD cada 10 segundos
        console.log('\n🔍 MONITOREANDO CAMBIOS EN LA BASE DE DATOS...\n');

        let lastData = { ...users[0] };
        let checkCount = 0;

        setInterval(async () => {
            checkCount++;
            try {
                const [currentData] = await database.sequelize.query(`
                    SELECT "firstName", "lastName", "departmentId", "defaultBranchId",
                           "position", "role", "isActive", "allowOutsideRadius"
                    FROM users
                    WHERE user_id = $1
                `, {
                    bind: [userId]
                });

                if (currentData && currentData.length > 0) {
                    const data = currentData[0];

                    // Detectar cambios
                    let hasChanges = false;
                    const changes = [];

                    if (data.departmentId !== lastData.departmentId) {
                        changes.push(`📍 Departamento: ${lastData.departmentId || 'null'} → ${data.departmentId || 'null'}`);
                        hasChanges = true;
                    }
                    if (data.position !== lastData.position) {
                        changes.push(`💼 Posición: "${lastData.position || 'null'}" → "${data.position || 'null'}"`);
                        hasChanges = true;
                    }
                    if (data.role !== lastData.role) {
                        changes.push(`👑 Rol: ${lastData.role} → ${data.role}`);
                        hasChanges = true;
                    }
                    if (data.isActive !== lastData.isActive) {
                        changes.push(`🔒 Estado: ${lastData.isActive ? 'Activo' : 'Inactivo'} → ${data.isActive ? 'Activo' : 'Inactivo'}`);
                        hasChanges = true;
                    }
                    if (data.allowOutsideRadius !== lastData.allowOutsideRadius) {
                        changes.push(`📍 GPS: ${lastData.allowOutsideRadius ? 'Sin restricción' : 'Restringido'} → ${data.allowOutsideRadius ? 'Sin restricción' : 'Restringido'}`);
                        hasChanges = true;
                    }

                    if (hasChanges) {
                        console.log(`\n✨ CAMBIOS DETECTADOS EN BD (#${checkCount}):`);
                        changes.forEach(change => console.log(`   ${change}`));
                        console.log(`   ⏰ ${new Date().toLocaleTimeString()}\n`);
                        lastData = { ...data };
                    }
                }
            } catch (error) {
                console.log(`   ⚠️ Error verificando: ${error.message}`);
            }
        }, 5000); // Cada 5 segundos

        // Mantener abierto
        await new Promise(() => {});

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

demoTab1Simple().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
});
