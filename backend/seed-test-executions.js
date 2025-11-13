const { sequelize } = require('./src/config/database');
const { v4: uuidv4 } = require('uuid');

async function seedTestExecutions() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a BD');

        const TestExecution = sequelize.models.TestExecution || require('./src/models/TestExecution')(sequelize);

        // Generar 20 ejecuciones de prueba
        const modules = ['users', 'attendance', 'departments', 'shifts'];
        const environments = ['local', 'staging', 'production'];
        const statuses = ['completed', 'completed', 'completed', 'failed'];

        const executions = [];

        for (let i = 0; i < 20; i++) {
            const module = modules[Math.floor(Math.random() * modules.length)];
            const environment = environments[Math.floor(Math.random() * environments.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];

            const totalTests = 10 + Math.floor(Math.random() * 20);
            const passedTests = status === 'completed'
                ? totalTests - Math.floor(Math.random() * 3)
                : Math.floor(totalTests * 0.5);

            const duration = 30 + Math.random() * 120;
            const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

            executions.push({
                execution_id: uuidv4(),
                environment,
                module,
                company_id: 11,
                company_name: 'ISI',
                cycles: 5,
                slow_mo: 50,
                base_url: 'http://localhost:9999',
                status,
                total_tests: totalTests,
                ui_tests_passed: Math.floor(passedTests * 0.7),
                ui_tests_failed: Math.floor((totalTests - passedTests) * 0.7),
                db_tests_passed: Math.floor(passedTests * 0.3),
                db_tests_failed: Math.floor((totalTests - passedTests) * 0.3),
                start_time: createdAt,
                end_time: new Date(createdAt.getTime() + duration * 1000),
                duration_seconds: duration,
                errors: status === 'failed' ? [{ message: 'Error de prueba' }] : [],
                tickets: [],
                logs: [],
                created_at: createdAt,
                updated_at: createdAt
            });
        }

        await TestExecution.bulkCreate(executions);

        console.log(`✅ ${executions.length} ejecuciones de prueba creadas`);

        const metrics = await TestExecution.getMetrics({});
        console.log('\n📊 Métricas generadas:');
        console.log(`   Total: ${metrics.total_executions}`);
        console.log(`   Exitosos: ${metrics.successful_executions}`);
        console.log(`   Success Rate: ${metrics.avg_success_rate.toFixed(1)}%`);
        console.log(`   Duración Prom: ${metrics.avg_duration.toFixed(1)}s`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

seedTestExecutions();
