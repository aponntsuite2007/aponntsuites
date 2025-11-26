/**
 * ═══════════════════════════════════════════════════════════
 * SCRIPT DEFINITIVO PARA EJECUTAR PHASE4 ORCHESTRATOR
 * ═══════════════════════════════════════════════════════════
 *
 * Este es el ÚNICO script que funciona correctamente.
 * Usa el endpoint correcto: POST /api/testing/run-visible
 *
 * ENDPOINT: POST /api/testing/run-visible
 * Sistema: Phase4TestOrchestrator (completo con WebSocket + fases)
 *
 * USO:
 * node run-phase4-working.js [módulo]
 *
 * Ejemplos:
 * node run-phase4-working.js              # Testea módulo users
 * node run-phase4-working.js attendance   # Solo módulo attendance
 *
 * ═══════════════════════════════════════════════════════════
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:9998';

async function runPhase4Working(module = 'users') {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 4 - ORCHESTRATOR DEFINITIVO (WORKING)             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    try {
        console.log('🚀 Iniciando Phase4TestOrchestrator...\n');
        console.log(`   📦 Módulo: ${module}`);
        console.log('   🌐 Environment: local');
        console.log('   🔄 Cycles: 1');
        console.log('   🏢 Company ID: 11\n');

        const response = await axios.post(
            `${BASE_URL}/api/testing/run-visible`,
            {
                environment: 'local',
                module: module,
                cycles: 1,
                slowMo: 100,
                companyId: 11
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        const { executionId, message, status, baseUrl } = response.data;

        console.log('════════════════════════════════════════════════════════════');
        console.log('✅ PHASE4 ORCHESTRATOR INICIADO EXITOSAMENTE');
        console.log('════════════════════════════════════════════════════════════');
        console.log(`📊 Execution ID: ${executionId}`);
        console.log(`📈 Status: ${status}`);
        console.log(`🌐 Base URL: ${baseUrl}`);
        console.log(`💬 Message: ${message}`);
        console.log('');
        console.log('📡 Endpoints para monitoreo:');
        console.log(`   Check status: ${BASE_URL}/api/testing/execution-status/${executionId}`);
        console.log('   Active executions: ' + BASE_URL + '/api/testing/active-executions');
        console.log('');
        console.log('════════════════════════════════════════════════════════════');
        console.log('');
        console.log('⏳ El test está ejecutándose...');
        console.log('');
        console.log('💡 SISTEMA COMPLETO Phase4TestOrchestrator:');
        console.log('   🚀 Fase INIT: Inicialización (WebSocket + PostgreSQL + Playwright)');
        console.log('   🧪 Fase TEST: Ejecución de tests con collectors');
        console.log('   🎉 Fase COMPLETE: Finalización y reporte');
        console.log('');
        console.log('📝 Logs JSON en: backend/logs/phase4-' + executionId + '.json');
        console.log('');
        console.log('════════════════════════════════════════════════════════════');

        // Monitorear status cada 5 segundos
        console.log('\n📊 Monitoreando progreso...\n');

        let attempts = 0;
        const maxAttempts = 120; // 10 minutos máximo

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5s
            attempts++;

            try {
                const statusResponse = await axios.get(
                    `${BASE_URL}/api/testing/execution-status/${executionId}`
                );

                const { status, logs } = statusResponse.data;
                const lastLogs = logs.slice(-3); // Últimos 3 logs

                console.log(`[${new Date().toLocaleTimeString()}] Status: ${status}`);
                lastLogs.forEach(log => {
                    console.log(`   ${log.type.toUpperCase()}: ${log.message}`);
                });

                if (status === 'completed' || status === 'failed') {
                    console.log('\n✅ TEST COMPLETADO\n');
                    break;
                }

            } catch (error) {
                // Error al consultar status, continuar intentando
            }
        }

        if (attempts >= maxAttempts) {
            console.log('\n⏱️  Timeout alcanzado - Revisa los logs manualmente.');
        }

    } catch (error) {
        console.error('\n❌ ERROR FATAL:\n');

        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Message: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            console.error(`   ${error.message}`);
        }

        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 El servidor no está corriendo. Inicia el servidor con:');
            console.error('   cd backend && PORT=9998 npm start\n');
        }

    } finally {
        process.exit(0);
    }
}

// Ejecutar
const module = process.argv[2] || 'users';
runPhase4Working(module);
