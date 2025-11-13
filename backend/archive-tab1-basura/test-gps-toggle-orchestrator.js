/**
 * TEST GPS TOGGLE - Usando sistema Phase4 Orchestrator
 *
 * Ejecuta el test del toggle GPS integrado en UsersModuleCollector
 * a través del sistema de testing Phase4.
 */

require('dotenv').config();
const database = require('./src/config/database');
const SystemRegistry = require('./src/auditor/registry/SystemRegistry');
const IntelligentTestingOrchestrator = require('./src/auditor/core/IntelligentTestingOrchestrator');
const { v4: uuidv4 } = require('uuid');

async function runGPSToggleTest() {
    console.log('\n🧪 ===== TEST GPS TOGGLE - Sistema Phase4 Orchestrator =====\n');

    try {
        // 1. Conectar a BD
        await database.sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL\n');

        // 2. Obtener company_id de ISI
        const [companies] = await database.sequelize.query(`
            SELECT company_id, name
            FROM companies
            WHERE name = 'ISI' OR slug = 'isi'
            LIMIT 1
        `);

        if (companies.length === 0) {
            throw new Error('Empresa ISI no encontrada en la base de datos');
        }

        const companyId = companies[0].company_id;
        const companyName = companies[0].name;

        console.log(`📊 Empresa seleccionada: ${companyName} (ID: ${companyId})\n`);

        // 3. Inicializar SystemRegistry y Orchestrator
        const systemRegistry = new SystemRegistry(database);
        await systemRegistry.initialize();

        const orchestrator = new IntelligentTestingOrchestrator(database, systemRegistry);
        orchestrator.autoRegisterCollectors();

        console.log('✅ Orchestrator inicializado\n');

        // 4. Crear execution_id para agrupar logs
        const execution_id = uuidv4();
        console.log(`🔑 Execution ID: ${execution_id}\n`);

        // 5. Ejecutar SOLO el test de GPS toggle del módulo users
        console.log('▶️  Ejecutando test de GPS Toggle...\n');
        console.log('─'.repeat(60));

        const result = await orchestrator.runModules(
            execution_id,
            companyId,
            ['users'], // Solo módulo users
            {
                mode: 'selective',
                categories: ['user_gps_toggle_persistence'], // Solo este test
                headless: false, // Navegador visible
                slowMo: 100
            }
        );

        console.log('\n' + '─'.repeat(60));

        // 6. Mostrar resultados
        console.log('\n📊 ===== RESULTADO DEL TEST =====\n');

        const testLog = result.results.find(r => r.test_name === 'frontend_user_gps_toggle_persistence');

        if (testLog) {
            if (testLog.status === 'passed') {
                console.log('✅ TEST PASSED - GPS Toggle funciona correctamente\n');
                console.log('   Verificaciones exitosas:');
                console.log('   ✓ Campos gpsEnabled y allowOutsideRadius presentes en API');
                console.log('   ✓ Relación inversa correcta (allowOutsideRadius = !gpsEnabled)');
                console.log('   ✓ Toggle refleja correctamente el estado de BD');
                console.log('   ✓ Toggle cambia visualmente al hacer click');
                console.log('   ✓ Cambios persisten al cerrar/reabrir modal');
                console.log('   ✓ Cambios se guardan correctamente en BD\n');

                if (testLog.metadata) {
                    console.log('   Metadata del test:');
                    console.log(`      - Usuario testeado: ${testLog.metadata.userId}`);
                    console.log(`      - GPS inicial: ${testLog.metadata.initialGpsEnabled}`);
                    console.log(`      - GPS final: ${testLog.metadata.finalGpsEnabled}`);
                }
            } else {
                console.log('❌ TEST FAILED\n');
                console.log(`   Error: ${testLog.error_message}\n`);
                if (testLog.error_stack) {
                    console.log('   Stack trace:');
                    console.log(testLog.error_stack);
                }
            }
        } else {
            console.log('⚠️  No se encontró el log del test');
        }

        // 7. Resumen general
        console.log('\n📈 Resumen:');
        console.log(`   - Execution ID: ${execution_id}`);
        console.log(`   - Tests ejecutados: ${result.results.length}`);
        console.log(`   - Passed: ${result.summary.passed}`);
        console.log(`   - Failed: ${result.summary.failed}`);
        console.log(`   - Warnings: ${result.summary.warnings}\n`);

        // 8. Consultar logs en BD
        console.log('📝 Logs en base de datos:\n');

        const [logs] = await database.sequelize.query(`
            SELECT test_type, test_name, status, error_message, created_at
            FROM audit_logs
            WHERE execution_id = '${execution_id}'
            ORDER BY created_at DESC
        `);

        logs.forEach(log => {
            const icon = log.status === 'passed' ? '✅' : log.status === 'failed' ? '❌' : '⚠️';
            console.log(`   ${icon} [${log.test_type}] ${log.test_name}`);
            if (log.error_message) {
                console.log(`      Error: ${log.error_message}`);
            }
        });

        console.log('\n✅ Test completado\n');

        process.exit(testLog && testLog.status === 'passed' ? 0 : 1);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Ejecutar test
runGPSToggleTest();
