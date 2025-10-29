/**
 * TEST EMPLOYEE PROFILE COLLECTOR
 *
 * Script para probar el EmployeeProfileCollector integrado con el sistema híbrido
 *
 * USO:
 *   node test-employee-profile-collector.js
 *
 * Este script:
 * 1. Conecta a la base de datos
 * 2. Carga el SystemRegistry con los 45 módulos
 * 3. Ejecuta el EmployeeProfileCollector en company_id=11 (ISI)
 * 4. Muestra resultados detallados de los 10 tests
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const EmployeeProfileCollector = require('./src/auditor/collectors/EmployeeProfileCollector');
const SystemRegistry = require('./src/auditor/registry/SystemRegistry');

// Configurar Sequelize
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});

// Importar modelos
const AuditLog = require('./src/models/AuditLog')(sequelize, Sequelize.DataTypes);

const database = {
    sequelize,
    AuditLog
};

async function runTest() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TEST: EMPLOYEE PROFILE COLLECTOR');
    console.log('='.repeat(80) + '\n');

    try {
        // 1. Conectar a base de datos
        console.log('🔌 Conectando a base de datos...');
        await sequelize.authenticate();
        console.log('✅ Conexión exitosa\n');

        // 2. Cargar SystemRegistry
        console.log('📚 Cargando SystemRegistry...');
        const systemRegistry = new SystemRegistry();
        await systemRegistry.loadFromFile();
        console.log(`✅ Registry cargado con ${systemRegistry.getAllModules().length} módulos\n`);

        // 3. Crear execution_id (UUID válido)
        const execution_id = uuidv4();
        console.log(`📝 Execution ID: ${execution_id}\n`);

        // 4. Configuración del collector
        const config = {
            company_id: 11, // ISI company
            authToken: null, // No necesario para panel-administrativo.html
            moduleFilter: null // Testear todas las categorías
        };

        // 5. Crear y ejecutar collector
        console.log('👤 Iniciando EmployeeProfileCollector...\n');
        const collector = new EmployeeProfileCollector(database, systemRegistry);

        const results = await collector.collect(execution_id, config);

        // 6. Mostrar resultados
        console.log('\n' + '='.repeat(80));
        console.log('📊 RESULTADOS');
        console.log('='.repeat(80) + '\n');

        const passed = results.filter(r => r.status === 'pass' || r.status === 'passed').length;
        const failed = results.filter(r => r.status === 'fail' || r.status === 'failed').length;
        const total = results.length;

        console.log(`✅ PASSED: ${passed}/${total}`);
        console.log(`❌ FAILED: ${failed}/${total}`);
        console.log(`📈 SUCCESS RATE: ${((passed / total) * 100).toFixed(1)}%\n`);

        // Detalle por categoría
        console.log('📋 Detalle por categoría:\n');
        results.forEach((result, index) => {
            const statusIcon = result.status === 'pass' || result.status === 'passed' ? '✅' : '❌';
            const duration = result.duration_ms ? `(${result.duration_ms}ms)` : '';
            console.log(`${index + 1}. ${statusIcon} ${result.test_name} ${duration}`);

            if (result.error_message) {
                console.log(`   ⚠️  Error: ${result.error_message}`);
            }
        });

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('\n❌ ERROR EN TEST:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await sequelize.close();
        console.log('\n🔒 Conexión cerrada\n');
    }
}

// Ejecutar test
runTest().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
