/**
 * Script para ejecutar ULTIMATE TEST localmente
 * Enfocado en panel-empresa.html
 */

const fetch = require('node-fetch');

async function runUltimateTest() {
    try {
        console.log('🚀 Iniciando ULTIMATE TEST para panel-empresa...\n');

        // 1. Login para obtener token
        console.log('🔐 Obteniendo token de autenticación...');

        const loginResponse = await fetch('http://localhost:9998/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identifier: 'administrador',
                password: 'admin123',
                companySlug: 'isi'
            })
        });

        const loginData = await loginResponse.json();

        if (!loginData.success) {
            throw new Error('Login falló: ' + (loginData.message || 'Error desconocido'));
        }

        const token = loginData.token;
        console.log('✅ Token obtenido\n');

        // 2. Ejecutar ULTIMATE TEST
        console.log('🎯 Ejecutando ULTIMATE TEST...');
        console.log('   Target: panel-empresa.html');
        console.log('   Módulos: ~28 módulos + submódulos');
        console.log('   Headless: false (verás el navegador)\n');

        const testResponse = await fetch('http://localhost:9998/api/ultimate-test/run', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                modules: 'all',              // Todos los módulos disponibles
                companySlug: 'isi',
                username: 'administrador',
                password: 'admin123',
                headless: false,             // Ver navegador en acción
                includePerformance: true,    // Tests de performance
                includeSimulation: true,     // Monkey testing
                includeSecurity: false       // Skip security por ahora
            })
        });

        const testData = await testResponse.json();

        if (testData.success) {
            console.log('✅ ULTIMATE TEST INICIADO\n');
            console.log('📊 Iniciado en:', testData.execution.startedAt);
            console.log('\n🔄 Monitoreando progreso cada 5 segundos...\n');

            // 3. Polling de estado
            let isRunning = true;
            let checkCount = 0;

            while (isRunning) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                checkCount++;

                const statusResponse = await fetch('http://localhost:9998/api/ultimate-test/status', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const statusData = await statusResponse.json();

                const exec = statusData.execution;

                console.log(`[Check ${checkCount}] Fase: ${exec.progress?.currentPhase || 'N/A'} | Módulo: ${exec.progress?.currentModule || 'N/A'} | Completados: ${exec.progress?.completed || 0}/${exec.progress?.total || 0}`);

                if (!exec.isRunning) {
                    isRunning = false;

                    console.log('\n✅ EJECUCIÓN COMPLETADA\n');

                    if (exec.executionId) {
                        // Obtener resultados
                        const resultsResponse = await fetch(`http://localhost:9998/api/ultimate-test/results/${exec.executionId}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const resultsData = await resultsResponse.json();

                        if (resultsData.success) {
                            console.log('📊 RESULTADOS FINALES:');
                            console.log(`   Total tests: ${resultsData.execution.totalTests}`);
                            console.log(`   ✅ Passed: ${resultsData.execution.passed}`);
                            console.log(`   ❌ Failed: ${resultsData.execution.failed}`);
                            console.log(`   ⚠️  Warnings: ${resultsData.execution.warnings}`);
                            console.log(`   📈 Success rate: ${resultsData.execution.successRate}\n`);

                            // Mostrar failures si hay
                            if (resultsData.execution.failed > 0) {
                                console.log('❌ TESTS FALLIDOS:');
                                resultsData.execution.logs
                                    .filter(log => log.status === 'failed')
                                    .slice(0, 10) // Primeros 10
                                    .forEach(log => {
                                        console.log(`   - ${log.module_name}: ${log.test_name}`);
                                        console.log(`     Error: ${log.error_message || 'N/A'}`);
                                    });
                            }
                        }
                    }

                    if (exec.error) {
                        console.error('\n❌ ERROR:', exec.error);
                    }
                }
            }

        } else {
            console.error('❌ Error iniciando test:', testData.message);
        }

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.error(error.stack);
    }
}

// Ejecutar
runUltimateTest();
