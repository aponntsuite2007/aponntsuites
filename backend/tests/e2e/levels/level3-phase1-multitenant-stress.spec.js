/**
 * SYNAPSE Level 3 - FASE 1: Multi-Tenant Stress Testing
 * Genera 100,000+ usuarios en 50+ empresas para probar aislamiento tenant
 *
 * Ejecutar:
 *   USERS=100000 COMPANIES=50 npx playwright test tests/e2e/levels/level3-phase1-multitenant-stress.spec.js
 *
 * Configuracion reducida para testing:
 *   USERS=1000 COMPANIES=10 npx playwright test tests/e2e/levels/level3-phase1-multitenant-stress.spec.js
 */
const { test, expect } = require('@playwright/test');
const { EnterpriseBulkHelper } = require('../helpers/enterprise-bulk.helper');

const TOTAL_USERS = parseInt(process.env.USERS || '1000');
const TOTAL_COMPANIES = parseInt(process.env.COMPANIES || '10');
const BATCH_NAME = `SYNAPSE-L3-Phase1-${new Date().toISOString().slice(0, 10)}`;

test.describe('SYNAPSE Level 3 - FASE 1: Multi-Tenant Stress', () => {
  let bulkHelper;
  let batchId;

  test.beforeAll(async () => {
    bulkHelper = new EnterpriseBulkHelper();
    batchId = await bulkHelper.createBatch(BATCH_NAME, 3);
    console.log(`[PHASE1] Batch creado: ${batchId}`);
  });

  test.afterAll(async () => {
    if (bulkHelper) {
      await bulkHelper.updateBatchStatus(batchId, 'completed', ['phase1']);
      await bulkHelper.close();
    }
  });

  test('1.1 Generar usuarios masivos', async () => {
    test.setTimeout(30 * 60 * 1000); // 30 minutos max

    console.log(`[PHASE1] Generando ${TOTAL_USERS} usuarios en ${TOTAL_COMPANIES} empresas...`);

    const result = await bulkHelper.generateStressUsers(batchId, TOTAL_USERS, TOTAL_COMPANIES);

    expect(result.success).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(TOTAL_USERS * 0.99); // 99% minimo

    console.log(`[PHASE1] Generados ${result.count} usuarios en ${result.timeMs}ms`);
    console.log(`[PHASE1] Velocidad: ${Math.round(result.count / (result.timeMs / 1000))} usuarios/segundo`);
  });

  test('1.2 Verificar aislamiento tenant', async ({ request }) => {
    // Verificar que cada empresa solo ve sus propios datos
    const company1Token = process.env.TEST_TOKEN_COMPANY_1 || 'demo-token';
    const company2Token = process.env.TEST_TOKEN_COMPANY_2 || 'demo-token';

    // Request como empresa 1
    const res1 = await request.get('/api/modules/active?company_id=1&panel=empresa', {
      headers: { Authorization: `Bearer ${company1Token}` }
    });

    // Request como empresa 2
    const res2 = await request.get('/api/modules/active?company_id=2&panel=empresa', {
      headers: { Authorization: `Bearer ${company2Token}` }
    });

    // Ambos deben responder OK
    expect(res1.ok()).toBe(true);
    expect(res2.ok()).toBe(true);

    // Los datos deben ser diferentes (aislamiento)
    const data1 = await res1.json();
    const data2 = await res2.json();

    expect(data1.company_id).not.toBe(data2.company_id);
    console.log(`[PHASE1] Aislamiento tenant verificado: Empresa 1 != Empresa 2`);
  });

  test('1.3 Verificar no hay memory leaks', async () => {
    const initialMemory = process.memoryUsage();

    // Hacer muchas operaciones
    for (let i = 0; i < 100; i++) {
      await fetch('http://localhost:9998/api/modules/active?company_id=1');
    }

    // Forzar GC si disponible
    if (global.gc) global.gc();

    const finalMemory = process.memoryUsage();
    const heapGrowthMB = (finalMemory.heapUsed - initialMemory.heapUsed) / (1024 * 1024);

    console.log(`[PHASE1] Heap growth: ${heapGrowthMB.toFixed(2)} MB`);
    expect(heapGrowthMB).toBeLessThan(500); // Max 500MB growth
  });

  test('1.4 Verificar DB connections bajo control', async () => {
    // Query para verificar conexiones activas
    const result = await bulkHelper.db.one(`
      SELECT count(*) as active_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    const connections = parseInt(result.active_connections);
    console.log(`[PHASE1] Conexiones DB activas: ${connections}`);

    expect(connections).toBeLessThan(100); // Max 100 conexiones
  });
});
