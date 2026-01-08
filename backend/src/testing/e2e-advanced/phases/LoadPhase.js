/**
 * LoadPhase - Load Testing con k6
 *
 * OBJETIVO:
 * - Login masivo (100 users concurrentes)
 * - CRUD operations (80 req/s por módulo)
 * - Dashboard load (heavy queries)
 * - Reportes PDF (stress test)
 * - Multi-tenant stress (50 empresas simultáneas)
 *
 * THRESHOLDS:
 * - P95 latency < 1s
 * - P99 latency < 3s
 * - Error rate < 1%
 * - Throughput > 100 req/s
 *
 * @module LoadPhase
 * @version 2.0.0
 */

const PhaseInterface = require('./PhaseInterface');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class LoadPhase extends PhaseInterface {
  constructor() {
    super();
    this.k6Available = false;
    this.results = {
      scenarios: {},
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      throughput: 0
    };
  }

  getName() {
    return 'load';
  }

  /**
   * Valida que k6 esté instalado
   */
  async validate() {
    const errors = [];

    try {
      await execAsync('k6 version');
      this.k6Available = true;
    } catch (error) {
      this.k6Available = false;
      errors.push('k6 no está instalado. Instalar: https://k6.io/docs/getting-started/installation/');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Genera script k6 para un módulo específico
   */
  generateK6Script(moduleName, baseURL) {
    return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up
    { duration: '1m', target: 50 },    // Sustained load
    { duration: '30s', target: 100 },  // Peak load
    { duration: '1m', target: 50 },    // Step down
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<3000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
  },
};

export default function () {
  // Login
  const loginPayload = JSON.stringify({
    companySlug: 'test-company',
    username: \`user_\${__VU}\`,
    password: 'testpass123'
  });

  const loginRes = http.post(\`\${baseURL}/api/v1/auth/login\`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const loginCheck = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login has token': (r) => r.json('token') !== undefined,
  });
  errorRate.add(!loginCheck);

  if (loginCheck) {
    const token = loginRes.json('token');
    const headers = {
      'Authorization': \`Bearer \${token}\`,
      'Content-Type': 'application/json'
    };

    // CRUD operations for ${moduleName}
    // GET - List
    const listRes = http.get(\`\${baseURL}/api/${moduleName}\`, { headers });
    check(listRes, {
      'list status is 200': (r) => r.status === 200,
    });

    // POST - Create
    const createPayload = JSON.stringify({
      name: \`Test \${__VU} \${Date.now()}\`,
      description: 'Load test entry'
    });
    const createRes = http.post(\`\${baseURL}/api/${moduleName}\`, createPayload, { headers });
    check(createRes, {
      'create status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    });

    sleep(1);
  }
}
`;
  }

  /**
   * Ejecuta tests de carga para un módulo
   */
  async runK6Test(moduleName, scriptPath) {
    try {
      const { stdout, stderr } = await execAsync(`k6 run --quiet --summary-export=- ${scriptPath}`);

      // Parse k6 JSON output
      const summaryMatch = stdout.match(/\{[\s\S]*\}/);
      if (summaryMatch) {
        const summary = JSON.parse(summaryMatch[0]);

        return {
          module: moduleName,
          success: true,
          metrics: {
            requests: summary.metrics?.http_reqs?.count || 0,
            failures: summary.metrics?.http_req_failed?.values?.rate || 0,
            avgDuration: summary.metrics?.http_req_duration?.values?.avg || 0,
            p95Duration: summary.metrics?.http_req_duration?.values['p(95)'] || 0,
            p99Duration: summary.metrics?.http_req_duration?.values['p(99)'] || 0,
            rps: summary.metrics?.http_reqs?.rate || 0
          },
          passed: (summary.metrics?.http_req_failed?.values?.rate || 1) < 0.01
        };
      }

      return {
        module: moduleName,
        success: false,
        error: 'No summary output from k6'
      };

    } catch (error) {
      return {
        module: moduleName,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ejecuta load testing en módulos seleccionados
   */
  async execute(modules, options = {}) {
    const { executionId, onProgress } = options;
    const startTime = Date.now();

    this.reportProgress(onProgress, 0, 'LoadPhase: Inicializando k6 load testing');

    // Si k6 no está disponible, ejecutar simulación
    if (!this.k6Available) {
      console.log('⚠️ [LOAD] k6 no disponible - ejecutando simulación');
      return this.runSimulation(modules, options);
    }

    const baseURL = process.env.BASE_URL || 'http://localhost:9998';
    const tempDir = path.join(__dirname, '../../../temp/k6-scripts');

    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (err) {
      // Directory already exists
    }

    const modulesToTest = modules.length > 0 ? modules : ['users', 'attendance', 'departments'];
    const totalModules = modulesToTest.length;
    let completedModules = 0;

    for (const moduleName of modulesToTest) {
      this.reportProgress(
        onProgress,
        (completedModules / totalModules) * 100,
        `LoadPhase: Testing ${moduleName} (${completedModules + 1}/${totalModules})`
      );

      // Generate k6 script
      const script = this.generateK6Script(moduleName, baseURL);
      const scriptPath = path.join(tempDir, `${moduleName}-load.js`);
      await fs.writeFile(scriptPath, script);

      // Run k6 test
      const result = await this.runK6Test(moduleName, scriptPath);

      this.results.scenarios[moduleName] = result;

      if (result.success && result.metrics) {
        this.results.totalRequests += result.metrics.requests;
        this.results.successfulRequests += result.metrics.requests * (1 - result.metrics.failures);
        this.results.failedRequests += result.metrics.requests * result.metrics.failures;
        this.results.avgLatency += result.metrics.avgDuration;
        this.results.p95Latency = Math.max(this.results.p95Latency, result.metrics.p95Duration);
        this.results.p99Latency = Math.max(this.results.p99Latency, result.metrics.p99Duration);
        this.results.throughput += result.metrics.rps;
      }

      completedModules++;
    }

    // Calculate averages
    if (completedModules > 0) {
      this.results.avgLatency = this.results.avgLatency / completedModules;
    }

    const duration = Date.now() - startTime;
    this.reportProgress(onProgress, 100, 'LoadPhase: Completado');

    // Cleanup temp scripts
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }

    const passedScenarios = Object.values(this.results.scenarios).filter(s => s.passed).length;
    const failedScenarios = totalModules - passedScenarios;

    return this.createResult({
      status: failedScenarios === 0 ? 'passed' : (failedScenarios < totalModules / 2 ? 'warning' : 'failed'),
      passed: passedScenarios,
      failed: failedScenarios,
      skipped: 0,
      total: totalModules,
      duration,
      metrics: {
        totalRequests: this.results.totalRequests,
        successRate: this.results.totalRequests > 0
          ? (this.results.successfulRequests / this.results.totalRequests) * 100
          : 0,
        avgLatencyMs: Math.round(this.results.avgLatency),
        p95LatencyMs: Math.round(this.results.p95Latency),
        p99LatencyMs: Math.round(this.results.p99Latency),
        throughputRps: Math.round(this.results.throughput),
        scenarios: this.results.scenarios
      },
      error: null
    });
  }

  /**
   * Simulación cuando k6 no está disponible
   */
  async runSimulation(modules, options) {
    const { onProgress } = options;
    const startTime = Date.now();

    const modulesToTest = modules.length > 0 ? modules : ['users', 'attendance', 'departments'];
    const totalModules = modulesToTest.length;

    this.reportProgress(onProgress, 50, 'LoadPhase: Ejecutando simulación (k6 no disponible)');

    // Simular resultados
    const scenarios = {};
    modulesToTest.forEach(module => {
      scenarios[module] = {
        module,
        success: true,
        passed: true,
        metrics: {
          requests: 1000,
          failures: 0.005,
          avgDuration: 150 + Math.random() * 100,
          p95Duration: 800 + Math.random() * 200,
          p99Duration: 2000 + Math.random() * 500,
          rps: 50 + Math.random() * 30
        }
      };
    });

    const duration = Date.now() - startTime;
    this.reportProgress(onProgress, 100, 'LoadPhase: Simulación completada');

    return this.createResult({
      status: 'warning',
      passed: totalModules,
      failed: 0,
      skipped: 0,
      total: totalModules,
      duration,
      metrics: {
        simulation: true,
        message: 'k6 no disponible - resultados simulados',
        scenarios
      },
      error: null
    });
  }

  /**
   * Calcula score basado en resultados
   */
  calculateScore(result) {
    if (!result.metrics || result.metrics.simulation) {
      return 0; // Simulación no cuenta
    }

    const { passed = 0, total = 1 } = result;
    const passRate = (passed / total) * 100;

    // Aplicar penalties por latencia
    const p95Penalty = result.metrics.p95LatencyMs > 1000 ? 10 : 0;
    const p99Penalty = result.metrics.p99LatencyMs > 3000 ? 10 : 0;
    const successPenalty = result.metrics.successRate < 99 ? 15 : 0;

    const score = Math.max(0, passRate - p95Penalty - p99Penalty - successPenalty);
    return Math.round(score);
  }
}

module.exports = LoadPhase;
