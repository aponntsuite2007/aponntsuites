/**
 * SYNAPSE Level 3 - FASE 6: Performance Degradation
 * Mide degradacion del sistema bajo carga incremental
 *
 * Ejecutar:
 *   npx playwright test tests/e2e/levels/level3-phase6-performance.spec.js
 */
const { test, expect } = require('@playwright/test');
const { ConcurrentRunner } = require('../helpers/concurrent-runner.helper');
const { EnterpriseBulkHelper } = require('../helpers/enterprise-bulk.helper');

const BASE_URL = process.env.BASE_URL || 'http://localhost:9998';
const RAMP_STEPS = [10, 50, 100, 200, 500]; // Usuarios concurrentes

test.describe('SYNAPSE Level 3 - FASE 6: Performance Degradation', () => {
  let runner;
  let bulkHelper;
  let batchId;

  test.beforeAll(async () => {
    runner = new ConcurrentRunner(BASE_URL);
    bulkHelper = new EnterpriseBulkHelper();
    batchId = await bulkHelper.createBatch('SYNAPSE-L3-Phase6-Performance', 3);
  });

  test.afterAll(async () => {
    await bulkHelper.updateBatchStatus(batchId, 'completed', ['phase6']);
    await bulkHelper.close();
  });

  test('6.1 Test de rampa de carga', async () => {
    test.setTimeout(10 * 60 * 1000); // 10 minutos

    console.log('[PHASE6] Iniciando test de rampa de carga...');
    console.log('[PHASE6] Steps:', RAMP_STEPS.join(' -> '));

    for (const connections of RAMP_STEPS) {
      console.log(`[PHASE6] Testing con ${connections} conexiones concurrentes...`);

      const startTime = Date.now();

      try {
        const result = await runner.runConcurrentOperations({
          endpoint: '/api/modules/active?company_id=1&panel=empresa',
          connections: connections,
          duration: 15, // 15 segundos por step
          pipelining: 5
        });

        // Obtener metricas del sistema
        const memUsage = process.memoryUsage();

        // Guardar resultados
        await bulkHelper.db.none(`
          INSERT INTO e2e_performance_degradation
          (batch_id, concurrent_users, latency_p50_ms, latency_p95_ms, latency_p99_ms,
           throughput_rps, error_rate_percent, memory_usage_mb)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          batchId,
          connections,
          result.latency.p50 || 0,
          result.latency.p95 || result.latency.average || 0,
          result.latency.p99 || result.latency.max || 0,
          result.throughput.average || 0,
          result.errors ? (result.errors / result.requests.total * 100) : 0,
          Math.round(memUsage.heapUsed / (1024 * 1024))
        ]);

        console.log(`[PHASE6]   Latencia P50: ${result.latency.p50}ms`);
        console.log(`[PHASE6]   Latencia P95: ${result.latency.p95 || result.latency.average}ms`);
        console.log(`[PHASE6]   Throughput: ${result.throughput.average} req/s`);
        console.log(`[PHASE6]   Errores: ${result.errors || 0}`);

        // Pausa entre steps
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        console.log(`[PHASE6]   Error en step ${connections}: ${error.message}`);

        // Guardar el fallo
        await bulkHelper.db.none(`
          INSERT INTO e2e_performance_degradation
          (batch_id, concurrent_users, latency_p50_ms, latency_p95_ms, latency_p99_ms,
           throughput_rps, error_rate_percent)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [batchId, connections, 0, 0, 0, 0, 100]);
      }
    }
  });

  test('6.2 Verificar latencia aceptable bajo carga', async () => {
    const results = await bulkHelper.db.any(`
      SELECT concurrent_users, latency_p95_ms, error_rate_percent
      FROM e2e_performance_degradation
      WHERE batch_id = $1
      ORDER BY concurrent_users
    `, [batchId]);

    console.log('[PHASE6] ═══════════════════════════════════════');
    console.log('[PHASE6] TABLA DE DEGRADACION');
    console.log('[PHASE6] Users | P95 Latency | Error Rate');
    console.log('[PHASE6] ------|-------------|------------');

    for (const r of results) {
      const status = r.latency_p95_ms < 2000 ? '✅' : '❌';
      console.log(`[PHASE6] ${r.concurrent_users.toString().padEnd(5)} | ${(r.latency_p95_ms + 'ms').padEnd(11)} | ${r.error_rate_percent}% ${status}`);
    }
    console.log('[PHASE6] ═══════════════════════════════════════');

    // Verificar que latencia no explote
    const worstCase = results[results.length - 1];
    if (worstCase) {
      expect(worstCase.latency_p95_ms).toBeLessThan(5000); // Max 5 segundos en peor caso
      expect(worstCase.error_rate_percent).toBeLessThan(10); // Max 10% errores
    }
  });

  test('6.3 Verificar conexiones DB bajo control', async () => {
    const result = await bulkHelper.db.one(`
      SELECT
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active,
        count(*) FILTER (WHERE state = 'idle') as idle
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    console.log(`[PHASE6] Conexiones DB: Total=${result.total_connections}, Active=${result.active}, Idle=${result.idle}`);

    expect(parseInt(result.total_connections)).toBeLessThan(200);
  });

  test('6.4 Verificar memoria bajo control', async () => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / (1024 * 1024));
    const heapTotalMB = Math.round(memUsage.heapTotal / (1024 * 1024));

    console.log(`[PHASE6] Memoria: Heap Used=${heapUsedMB}MB, Heap Total=${heapTotalMB}MB`);

    expect(heapUsedMB).toBeLessThan(4000); // Max 4GB
  });

  test('6.99 Generar resumen de performance', async () => {
    const summary = await bulkHelper.db.one(`
      SELECT
        MIN(latency_p95_ms) as min_latency,
        MAX(latency_p95_ms) as max_latency,
        AVG(latency_p95_ms)::INTEGER as avg_latency,
        AVG(throughput_rps)::DECIMAL(10,2) as avg_throughput,
        AVG(error_rate_percent)::DECIMAL(5,2) as avg_error_rate,
        MAX(memory_usage_mb) as max_memory
      FROM e2e_performance_degradation
      WHERE batch_id = $1
    `, [batchId]);

    console.log('[PHASE6] ═══════════════════════════════════════');
    console.log('[PHASE6] RESUMEN DE PERFORMANCE');
    console.log(`[PHASE6] Latencia Min: ${summary.min_latency}ms`);
    console.log(`[PHASE6] Latencia Max: ${summary.max_latency}ms`);
    console.log(`[PHASE6] Latencia Avg: ${summary.avg_latency}ms`);
    console.log(`[PHASE6] Throughput Avg: ${summary.avg_throughput} req/s`);
    console.log(`[PHASE6] Error Rate Avg: ${summary.avg_error_rate}%`);
    console.log(`[PHASE6] Max Memory: ${summary.max_memory}MB`);
    console.log('[PHASE6] ═══════════════════════════════════════');
  });
});
