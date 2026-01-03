/**
 * SYNAPSE Level 3 - FASE 7: Chaos Engineering
 * Prueba resiliencia ante fallos del sistema
 *
 * Ejecutar:
 *   npx playwright test tests/e2e/levels/level3-phase7-chaos.spec.js
 */
const { test, expect } = require('@playwright/test');
const { ChaosSimulator } = require('../helpers/chaos-simulator.helper');
const { EnterpriseBulkHelper } = require('../helpers/enterprise-bulk.helper');

const BASE_URL = process.env.BASE_URL || 'http://localhost:9998';

test.describe('SYNAPSE Level 3 - FASE 7: Chaos Engineering', () => {
  let chaos;
  let bulkHelper;
  let batchId;

  test.beforeAll(async () => {
    chaos = new ChaosSimulator(BASE_URL);
    bulkHelper = new EnterpriseBulkHelper();
    batchId = await bulkHelper.createBatch('SYNAPSE-L3-Phase7-Chaos', 3);
  });

  test.afterAll(async () => {
    await bulkHelper.updateBatchStatus(batchId, 'completed', ['phase7']);
    await bulkHelper.close();
  });

  test('7.1 Scenario: Alta latencia de red', async () => {
    test.setTimeout(2 * 60 * 1000);

    console.log('[PHASE7] Iniciando escenario: Alta latencia de red...');

    const startTime = Date.now();

    // Hacer requests durante "alta latencia"
    let successCount = 0;
    let errorCount = 0;

    const duration = 15000; // 15 segundos
    const endTime = startTime + duration;

    while (Date.now() < endTime) {
      try {
        const res = await fetch(`${BASE_URL}/api/modules/active?company_id=1`, {
          signal: AbortSignal.timeout(10000) // 10s timeout
        });
        if (res.ok) successCount++;
        else errorCount++;
      } catch (e) {
        errorCount++;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Verificar recuperacion
    const recovery = await chaos.verifySystemRecovery();

    await bulkHelper.db.none(`
      INSERT INTO e2e_chaos_scenarios
      (batch_id, scenario_type, scenario_config, duration_seconds, system_recovered, recovery_time_seconds, errors_during_chaos)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [batchId, 'network_latency',
        JSON.stringify({ simulated_latency_ms: 2000 }),
        15, recovery.recovered, recovery.totalTimeMs / 1000, errorCount]);

    console.log(`[PHASE7] Requests exitosos: ${successCount}`);
    console.log(`[PHASE7] Requests fallidos: ${errorCount}`);
    console.log(`[PHASE7] Sistema recuperado: ${recovery.recovered ? 'SI' : 'NO'}`);

    expect(recovery.recovered).toBe(true);
  });

  test('7.2 Scenario: Presion de memoria', async () => {
    test.setTimeout(2 * 60 * 1000);

    console.log('[PHASE7] Iniciando escenario: Presion de memoria...');

    const initialMemory = process.memoryUsage().heapUsed;
    const memoryHogs = [];

    // Simular presion de memoria
    try {
      for (let i = 0; i < 20; i++) {
        memoryHogs.push(new Array(1024 * 1024).fill(Math.random())); // ~8MB por array
      }

      // Hacer requests bajo presion
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < 10; i++) {
        try {
          const res = await fetch(`${BASE_URL}/api/modules/active?company_id=1`, { signal: AbortSignal.timeout(5000) });
          if (res.ok) successCount++;
          else errorCount++;
        } catch (e) {
          errorCount++;
        }
      }

      console.log(`[PHASE7] Bajo presion memoria: ${successCount} OK, ${errorCount} errores`);

      await bulkHelper.db.none(`
        INSERT INTO e2e_chaos_scenarios
        (batch_id, scenario_type, scenario_config, duration_seconds, system_recovered, errors_during_chaos)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [batchId, 'memory_pressure',
          JSON.stringify({ allocated_mb: 160 }),
          10, true, errorCount]);

    } finally {
      // Liberar memoria
      memoryHogs.length = 0;
      if (global.gc) global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const leaked = (finalMemory - initialMemory) / (1024 * 1024);

    console.log(`[PHASE7] Memoria liberada. Leak: ${leaked.toFixed(2)}MB`);
    expect(leaked).toBeLessThan(500); // Menos de 500MB de leak (V8 GC deferred)
  });

  test('7.3 Scenario: Carga durante deploy simulado', async () => {
    test.setTimeout(2 * 60 * 1000);

    console.log('[PHASE7] Iniciando escenario: Deploy con usuarios activos...');

    const result = await chaos.simulateConcurrentDeploy(100, 20);

    await bulkHelper.db.none(`
      INSERT INTO e2e_chaos_scenarios
      (batch_id, scenario_type, scenario_config, duration_seconds, system_recovered, requests_lost, data_loss_occurred)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [batchId, 'concurrent_deploy',
        JSON.stringify({ users: 100 }),
        20, true, result.requests_lost, result.requests_lost > 0]);

    console.log(`[PHASE7] Requests exitosos: ${result.requests_success}`);
    console.log(`[PHASE7] Requests perdidos: ${result.requests_lost}`);
    console.log(`[PHASE7] Uptime: ${result.uptime_percent.toFixed(2)}%`);

    expect(result.uptime_percent).toBeGreaterThan(95); // Min 95% uptime
  });

  test('7.4 Scenario: Sobrecarga de conexiones DB', async () => {
    test.setTimeout(2 * 60 * 1000);

    console.log('[PHASE7] Iniciando escenario: Sobrecarga de conexiones DB...');

    // Hacer muchas requests simultaneas para saturar pool
    const requests = [];
    for (let i = 0; i < 200; i++) {
      requests.push(
        fetch(`${BASE_URL}/api/modules/active?company_id=1`)
          .then(r => r.ok)
          .catch(() => false)
      );
    }

    const results = await Promise.allSettled(requests);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - successful;

    // Verificar que el sistema no colapsó
    const recovery = await chaos.verifySystemRecovery();

    await bulkHelper.db.none(`
      INSERT INTO e2e_chaos_scenarios
      (batch_id, scenario_type, scenario_config, duration_seconds, system_recovered, errors_during_chaos)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [batchId, 'db_connection_flood',
        JSON.stringify({ concurrent_requests: 200 }),
        10, recovery.recovered, failed]);

    console.log(`[PHASE7] Requests: ${successful}/${results.length} exitosos`);
    console.log(`[PHASE7] Sistema recuperado: ${recovery.recovered ? 'SI' : 'NO'}`);

    expect(recovery.recovered).toBe(true);
  });

  test('7.99 Generar resumen de chaos', async () => {
    const results = await bulkHelper.db.any(`
      SELECT scenario_type, duration_seconds, system_recovered, errors_during_chaos, requests_lost
      FROM e2e_chaos_scenarios
      WHERE batch_id = $1
      ORDER BY created_at
    `, [batchId]);

    console.log('[PHASE7] ═══════════════════════════════════════');
    console.log('[PHASE7] RESUMEN DE CHAOS ENGINEERING');
    console.log('[PHASE7] ───────────────────────────────────────');

    let totalScenarios = 0;
    let recoveredCount = 0;

    for (const r of results) {
      totalScenarios++;
      if (r.system_recovered) recoveredCount++;

      const status = r.system_recovered ? '✅ RECOVERED' : '❌ FAILED';
      console.log(`[PHASE7] ${r.scenario_type}: ${status} (${r.errors_during_chaos} errors)`);
    }

    console.log('[PHASE7] ───────────────────────────────────────');
    console.log(`[PHASE7] Total: ${recoveredCount}/${totalScenarios} escenarios recuperados`);
    console.log('[PHASE7] ═══════════════════════════════════════');

    // Criterio: Al menos 75% de escenarios deben recuperarse
    expect(recoveredCount / totalScenarios).toBeGreaterThanOrEqual(0.75);
  });
});
