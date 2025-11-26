require('dotenv').config();
const Phase4TestOrchestrator = require('./src/auditor/core/Phase4TestOrchestrator');
const database = require('./src/config/database');

async function testEditUserFormReal() {
    console.log('\n================================================================================');
    console.log('🎯 TEST REAL - fillEditUserForm() - FORMULARIO EDITABLE');
    console.log('================================================================================\n');

    const orchestrator = new Phase4TestOrchestrator(
        {
            baseUrl: 'http://localhost:9998',
            headless: false,
            slowMo: 800,  // MUY LENTO para que veas todo
            timeout: 60000
        },
        database
    );

    try {
        // PASO 1: Iniciar
        console.log('📋 PASO 1/6: Iniciando navegador...');
        await orchestrator.start();
        console.log('   ✅ Navegador iniciado\n');

        // PASO 2: Login
        console.log('📋 PASO 2/6: Login...');
        await orchestrator.login('isi', 'soporte', 'admin123');
        console.log('   ✅ Login completado\n');

        // PASO 3: Obtener usuario
        console.log('📋 PASO 3/6: Obteniendo usuario...');
        const [users] = await database.sequelize.query(`
            SELECT user_id, "firstName", "lastName", email
            FROM users
            WHERE company_id = 11
            ORDER BY user_id DESC
            LIMIT 1
        `);
        const user = users[0];
        console.log(`   ✅ Usuario: ${user.firstName} ${user.lastName} (ID: ${user.user_id})\n`);

        // PASO 4: Navegar a users
        console.log('📋 PASO 4/6: Navegando a módulo Users...');
        await orchestrator.page.evaluate(() => {
            if (typeof showUsersContent === 'function') showUsersContent();
        });
        await orchestrator.wait(3000);
        console.log('   ✅ Módulo Users cargado\n');

        // PASO 5: Abrir modal editUser()
        console.log('📋 PASO 5/6: Abriendo modal editUser()...');
        await orchestrator.page.evaluate((uid) => {
            if (typeof editUser === 'function') editUser(uid);
        }, user.user_id);
        await orchestrator.wait(3000);
        console.log('   ✅ Modal editUser abierto\n');

        // PASO 6: Llenar formulario
        console.log('📋 PASO 6/6: Llenando formulario REAL...');
        console.log('   👀 OBSERVA EL NAVEGADOR - Verás los campos llenándose\n');

        const results = await orchestrator.fillEditUserForm(user.user_id);

        // RESULTADOS
        console.log('\n================================================================================');
        console.log('✅✅✅ RESULTADOS fillEditUserForm() ✅✅✅');
        console.log('================================================================================');
        console.log(`   • Success: ${results.success ? '✅ SÍ' : '❌ NO'}`);
        console.log(`   • Campos llenados: ${results.filledCount}/${results.totalFields}`);
        console.log(`   • Porcentaje: ${((results.filledCount / results.totalFields) * 100).toFixed(1)}%`);
        if (results.errors.length > 0) {
            console.log(`\n   ⚠️ ERRORES (${results.errors.length}):`);
            results.errors.forEach((err, i) => {
                console.log(`      ${i + 1}. ${err}`);
            });
        }
        console.log('================================================================================\n');

        // VERIFICAR EN BD
        console.log('🔍 Verificando datos en BD...');
        const [updated] = await database.sequelize.query(`
            SELECT "firstName", "lastName", email, dni, phone, position, salary
            FROM users WHERE user_id = '${user.user_id}'
        `);
        console.log('   📊 Datos actuales en BD:');
        console.log(`      Nombre: ${updated[0].firstName}`);
        console.log(`      Apellido: ${updated[0].lastName}`);
        console.log(`      Email: ${updated[0].email}`);
        console.log(`      DNI: ${updated[0].dni || 'N/A'}`);
        console.log(`      Teléfono: ${updated[0].phone || 'N/A'}`);
        console.log(`      Posición: ${updated[0].position || 'N/A'}`);
        console.log(`      Salario: ${updated[0].salary || 'N/A'}`);

        console.log('\n🎉 TEST COMPLETADO - El navegador permanecerá abierto');
        console.log('   Presiona Ctrl+C para cerrar\n');

        // Mantener abierto
        await new Promise(() => {});

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
    }
}

testEditUserFormReal();
