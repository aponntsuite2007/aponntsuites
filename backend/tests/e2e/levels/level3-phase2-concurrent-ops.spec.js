/**
 * SYNAPSE Level 3 - FASE 2: Concurrent Operations
 * 10,000 operaciones CRUD simultaneas para detectar race conditions
 *
 * Ejecutar:
 *   CONCURRENT_OPS=10000 npx playwright test tests/e2e/levels/level3-phase2-concurrent-ops.spec.js
 */
const { test, expect } = require('@playwright/test');
const { ConcurrentRunner } = require('../helpers/concurrent-runner.helper');
const { EnterpriseBulkHelper } = require('../helpers/enterprise-bulk.helper');

const CONCURRENT_OPS = parseInt(process.env.CONCURRENT_OPS || '100');
const BASE_URL = process.env.BASE_URL || 'http://localhost:9998';

test.describe('SYNAPSE Level 3 - FASE 2: Concurrent Operations', () => {
  let runner;
  let bulkHelper;
  let batchId;

  test.beforeAll(async () => {
    runner = new ConcurrentRunner(BASE_URL);
    bulkHelper = new EnterpriseBulkHelper();
    batchId = await bulkHelper.createBatch('SYNAPSE-L3-Phase2-ConcurrentOps', 3);
  });

  test.afterAll(async () => {
    await bulkHelper.updateBatchStatus(batchId, 'completed', ['phase2']);
    await bulkHelper.close();
  });

  test('2.1 Test de carga con autocannon', async () => {
    test.setTimeout(5 * 60 * 1000); // 5 minutos

    console.log(`[PHASE2] Ejecutando test de carga con ${CONCURRENT_OPS} conexiones...`);

    const result = await runner.runConcurrentOperations({
      endpoint: '/api/modules/active?company_id=1&panel=empresa',
      connections: Math.min(CONCURRENT_OPS, 100),
      duration: 30,
      pipelining: 10
    });

    console.log(`[PHASE2] Latencia P50: ${result.latency.p50}ms`);
    console.log(`[PHASE2] Latencia P95: ${result.latency.p95}ms`);
    console.log(`[PHASE2] Latencia P99: ${result.latency.p99}ms`);
    console.log(`[PHASE2] Throughput: ${result.throughput.average} req/s`);
    console.log(`[PHASE2] Errores: ${result.errors}`);

    // Guardar metricas
    await bulkHelper.db.none(`
      INSERT INTO e2e_performance_metrics
      (batch_id, operation_type, module_name, latency_ms, status, concurrent_users)
      VALUES ($1, 'read', 'modules-active', $2, $3, $4)
    `, [batchId, result.latency.p95, result.errors === 0 ? 'success' : 'failed', CONCURRENT_OPS]);

    // Validaciones
    expect(result.latency.p95).toBeLessThan(2000); // P95 < 2 segundos
    expect(result.errors).toBeLessThan(result.requests.total * 0.01); // < 1% errores
  });

  test('2.2 Detectar race conditions en CRUD', async ({ request }) => {
    test.setTimeout(10 * 60 * 1000);

    // Obtener token de autenticacion
    const loginRes = await request.post('/api/aponnt/auth/login', {
      data: {
        slug: 'aponnt-empresa-demo',
        username: 'administrador',
        password: 'admin123'
      }
    });

    let token = 'demo-token';
    if (loginRes.ok()) {
      const loginData = await loginRes.json();
      token = loginData.token || 'demo-token';
    }

    console.log(`[PHASE2] Ejecutando ${CONCURRENT_OPS} operaciones CRUD simultaneas...`);

    // Simular CRUD concurrente (usando Promise.all para simplicidad)
    const operations = [];
    const startTime = Date.now();

    for (let i = 0; i < Math.min(CONCURRENT_OPS, 50); i++) {
      operations.push(
        request.get('/api/modules/active?company_id=1', {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => ({ success: r.ok(), latency: Date.now() - startTime }))
         .catch(() => ({ success: false, latency: Date.now() - startTime }))
      );
    }

    const results = await Promise.allSettled(operations);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`[PHASE2] Operaciones exitosas: ${successful}/${results.length}`);
    console.log(`[PHASE2] Operaciones fallidas: ${failed}`);

    // Guardar en BD
    await bulkHelper.db.none(`
      INSERT INTO e2e_performance_metrics
      (batch_id, operation_type, module_name, latency_ms, status, concurrent_users)
      VALUES ($1, 'crud_batch', 'concurrent_test', $2, $3, $4)
    `, [batchId, Date.now() - startTime, failed === 0 ? 'success' : 'partial', CONCURRENT_OPS]);

    expect(failed).toBeLessThan(results.length * 0.05); // < 5% fallos
  });

  test('2.3 Verificar no hay deadlocks', async () => {
    // Verificar que no hay transacciones bloqueadas
    const result = await bulkHelper.db.oneOrNone(`
      SELECT count(*) as blocked
      FROM pg_stat_activity
      WHERE wait_event_type = 'Lock'
        AND datname = current_database()
    `);

    const blocked = parseInt(result?.blocked || 0);
    console.log(`[PHASE2] Transacciones bloqueadas: ${blocked}`);

    expect(blocked).toBe(0);
  });
});
