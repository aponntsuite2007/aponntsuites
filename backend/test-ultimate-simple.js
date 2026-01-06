/**
 * Script SIMPLE para ejecutar ULTIMATE TEST sin auth
 */

const fetch = require('node-fetch');

async function runTest() {
    try {
        console.log('🚀 Ejecutando ULTIMATE TEST (sin auth)...\n');

        // Ejecutar test
        const response = await fetch('http://localhost:9998/api/ultimate-test/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                modules: 'all',
                companySlug: 'isi',
                username: 'admin',
                password: 'admin123',
                headless: false,  // Ver navegador
                includePerformance: true,
                includeSimulation: true,
                includeSecurity: false
            })
        });

        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('\n✅ Test iniciado exitosamente');
            console.log('📊 Monitorea el estado en: http://localhost:9998/api/ultimate-test/status\n');

            // Polling
            let isRunning = true;
            let count = 0;

            while (isRunning && count < 360) { // Max 30 minutos (360 * 5s)
                await new Promise(r => setTimeout(r, 5000));
                count++;

                const statusResp = await fetch('http://localhost:9998/api/ultimate-test/status');
                const statusData = await statusResp.json();
                const exec = statusData.execution;

                console.log(`[${count}] Fase: ${exec.progress?.currentPhase || 'N/A'} | Módulo: ${exec.progress?.currentModule || 'N/A'} | ${exec.progress?.completed || 0}/${exec.progress?.total || 0}`);

                if (!exec.isRunning) {
                    isRunning = false;
                    console.log('\n✅ Ejecución completada');

                    if (exec.executionId) {
                        const resultsResp = await fetch(`http://localhost:9998/api/ultimate-test/results/${exec.executionId}`);
                        const results = await resultsResp.json();

                        if (results.success) {
                            console.log('\n📊 RESULTADOS:');
                            console.log(`   Total: ${results.execution.totalTests}`);
                            console.log(`   ✅ Passed: ${results.execution.passed}`);
                            console.log(`   ❌ Failed: ${results.execution.failed}`);
                            console.log(`   Success Rate: ${results.execution.successRate}\n`);
                        }
                    }
                }
            }
        } else {
            console.error('❌ Error:', data.message);
        }

    } catch (error) {
        console.error('❌ ERROR:', error.message);
    }
}

runTest();
