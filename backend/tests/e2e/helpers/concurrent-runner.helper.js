/**
 * SYNAPSE Enterprise Testing - Concurrent Operations Runner
 * Ejecuta miles de operaciones simultaneas para detectar race conditions
 */
const autocannon = require('autocannon');

class ConcurrentRunner {
  constructor(baseUrl = 'http://localhost:9998') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  /**
   * Ejecuta operaciones concurrentes usando autocannon
   * @param {Object} config - Configuracion
   * @returns {Promise<Object>} Resultados con latencias P50, P95, P99
   */
  async runConcurrentOperations(config = {}) {
    const {
      endpoint = '/api/modules/active',
      method = 'GET',
      connections = 100,
      duration = 30,
      pipelining = 10,
      headers = {},
      body = null
    } = config;

    return new Promise((resolve, reject) => {
      const instance = autocannon({
        url: `${this.baseUrl}${endpoint}`,
        connections,
        duration,
        pipelining,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined
      }, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            latency: {
              p50: result.latency.p50 || 0,
              p95: result.latency.p90 || result.latency.p99 || 0, // autocannon has p90, p99, p999
              p99: result.latency.p99 || 0,
              average: result.latency.average || 0,
              max: result.latency.max || 0
            },
            throughput: {
              average: result.throughput.average,
              total: result.throughput.total
            },
            requests: {
              total: result.requests.total,
              average: result.requests.average,
              sent: result.requests.sent
            },
            errors: result.errors,
            timeouts: result.timeouts,
            duration: result.duration,
            connections: result.connections
          });
        }
      });

      // Track progress
      autocannon.track(instance, { renderProgressBar: false });
    });
  }

  /**
   * Test de CRUD concurrente: CREATE -> UPDATE -> DELETE
   */
  async runCrudConcurrentTest(token, moduleEndpoint, testData, concurrentOps = 100) {
    const results = {
      create: { success: 0, failed: 0, latencies: [] },
      update: { success: 0, failed: 0, latencies: [] },
      delete: { success: 0, failed: 0, latencies: [] }
    };

    const operations = [];

    for (let i = 0; i < concurrentOps; i++) {
      operations.push(this._runSingleCrudCycle(token, moduleEndpoint, testData, i, results));
    }

    await Promise.allSettled(operations);

    // Calcular percentiles
    for (const op of ['create', 'update', 'delete']) {
      const sorted = results[op].latencies.sort((a, b) => a - b);
      results[op].p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
      results[op].p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
      results[op].p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
    }

    return results;
  }

  async _runSingleCrudCycle(token, endpoint, testData, index, results) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    try {
      // CREATE
      let start = Date.now();
      const createRes = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...testData, _test_index: index })
      });
      results.create.latencies.push(Date.now() - start);
      if (createRes.ok) {
        results.create.success++;
        const created = await createRes.json();

        // UPDATE
        start = Date.now();
        const updateRes = await fetch(`${this.baseUrl}${endpoint}/${created.id || created.data?.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ ...testData, updated: true })
        });
        results.update.latencies.push(Date.now() - start);
        if (updateRes.ok) results.update.success++;
        else results.update.failed++;

        // DELETE
        start = Date.now();
        const deleteRes = await fetch(`${this.baseUrl}${endpoint}/${created.id || created.data?.id}`, {
          method: 'DELETE',
          headers
        });
        results.delete.latencies.push(Date.now() - start);
        if (deleteRes.ok) results.delete.success++;
        else results.delete.failed++;
      } else {
        results.create.failed++;
      }
    } catch (error) {
      results.create.failed++;
    }
  }

  /**
   * Test de carga incremental para medir degradacion
   */
  async runRampTest(endpoint, token, steps = [10, 50, 100, 500, 1000]) {
    const rampResults = [];

    for (const connections of steps) {
      console.log(`[RAMP] Testing with ${connections} concurrent connections...`);

      const result = await this.runConcurrentOperations({
        endpoint,
        connections,
        duration: 10,
        headers: { 'Authorization': `Bearer ${token}` }
      });

      rampResults.push({
        connections,
        latency_p50: result.latency.p50,
        latency_p95: result.latency.p95,
        latency_p99: result.latency.p99,
        throughput: result.throughput.average,
        errors: result.errors
      });

      // Pausa entre steps para que el sistema se recupere
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return rampResults;
  }
}

module.exports = { ConcurrentRunner };
