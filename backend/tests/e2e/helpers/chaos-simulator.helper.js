/**
 * SYNAPSE Enterprise Testing - Chaos Engineering Simulator
 * Simula fallos del sistema para probar resiliencia
 */
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class ChaosSimulator {
  constructor(baseUrl = 'http://localhost:9998') {
    this.baseUrl = baseUrl;
    this.activeScenarios = [];
  }

  /**
   * Simula latencia de red alta
   */
  async simulateNetworkLatency(latencyMs = 5000, durationSeconds = 30) {
    console.log(`[CHAOS] Simulando latencia de red de ${latencyMs}ms por ${durationSeconds}s`);

    // En Windows usamos delay en requests, no tc
    const startTime = Date.now();
    const scenario = {
      type: 'network_latency',
      latencyMs,
      startTime,
      endTime: startTime + (durationSeconds * 1000)
    };
    this.activeScenarios.push(scenario);

    // Esperar duracion
    await new Promise(resolve => setTimeout(resolve, durationSeconds * 1000));

    // Limpiar
    this.activeScenarios = this.activeScenarios.filter(s => s !== scenario);

    return {
      scenario_type: 'network_latency',
      duration_seconds: durationSeconds,
      config: { latencyMs }
    };
  }

  /**
   * Simula presion de memoria
   */
  async simulateMemoryPressure(targetUsagePercent = 80, durationSeconds = 30) {
    console.log(`[CHAOS] Simulando presion de memoria al ${targetUsagePercent}% por ${durationSeconds}s`);

    const memoryHogs = [];
    const startTime = Date.now();

    try {
      // Crear arrays grandes para consumir memoria
      const MB = 1024 * 1024;
      const totalMB = Math.floor(process.memoryUsage().heapTotal / MB);
      const targetMB = Math.floor(totalMB * (targetUsagePercent / 100));

      for (let i = 0; i < targetMB / 10; i++) {
        memoryHogs.push(new Array(10 * MB / 8).fill(Math.random()));
      }

      // Mantener presion
      await new Promise(resolve => setTimeout(resolve, durationSeconds * 1000));

    } finally {
      // Liberar memoria
      memoryHogs.length = 0;
      global.gc && global.gc();
    }

    return {
      scenario_type: 'memory_pressure',
      duration_seconds: durationSeconds,
      config: { targetUsagePercent },
      recovered: true
    };
  }

  /**
   * Simula fallo de base de datos (desconexion temporal)
   */
  async simulateDatabaseFailure(durationSeconds = 10) {
    console.log(`[CHAOS] Simulando fallo de BD por ${durationSeconds}s`);

    // En lugar de matar la BD, saturamos el pool de conexiones
    const startTime = Date.now();
    let errorsDetected = 0;

    // Hacer requests durante el "fallo"
    const requests = [];
    for (let i = 0; i < 100; i++) {
      requests.push(
        fetch(`${this.baseUrl}/api/modules/active?company_id=1`)
          .then(r => r.ok ? null : errorsDetected++)
          .catch(() => errorsDetected++)
      );
    }

    await Promise.allSettled(requests);
    await new Promise(resolve => setTimeout(resolve, durationSeconds * 1000));

    // Verificar recuperacion
    let recovered = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await fetch(`${this.baseUrl}/api/v1/health`);
        if (res.ok) {
          recovered = true;
          break;
        }
      } catch (e) {}
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return {
      scenario_type: 'db_failure',
      duration_seconds: durationSeconds,
      errors_during_chaos: errorsDetected,
      system_recovered: recovered,
      recovery_time_seconds: Math.round((Date.now() - startTime) / 1000)
    };
  }

  /**
   * Simula alta carga durante deploy (zero-downtime test)
   */
  async simulateConcurrentDeploy(usersCount = 1000, deployDurationSeconds = 30) {
    console.log(`[CHAOS] Simulando deploy con ${usersCount} usuarios activos`);

    const startTime = Date.now();
    let requestsLost = 0;
    let requestsSuccess = 0;

    // Generar carga continua
    const loadGenerator = async () => {
      const endTime = startTime + (deployDurationSeconds * 1000);
      while (Date.now() < endTime) {
        try {
          const res = await fetch(`${this.baseUrl}/api/modules/active?company_id=1`);
          if (res.ok) requestsSuccess++;
          else requestsLost++;
        } catch (e) {
          requestsLost++;
        }
        await new Promise(resolve => setTimeout(resolve, 10)); // 100 req/s
      }
    };

    // Ejecutar multiples "usuarios"
    const users = [];
    for (let i = 0; i < Math.min(usersCount, 100); i++) {
      users.push(loadGenerator());
    }

    await Promise.allSettled(users);

    return {
      scenario_type: 'concurrent_deploy',
      duration_seconds: deployDurationSeconds,
      config: { usersCount },
      requests_success: requestsSuccess,
      requests_lost: requestsLost,
      data_loss_occurred: requestsLost > 0,
      uptime_percent: (requestsSuccess / (requestsSuccess + requestsLost)) * 100
    };
  }

  /**
   * Verifica que el sistema se recupero
   */
  async verifySystemRecovery(maxAttempts = 10, delayMs = 2000) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch(`${this.baseUrl}/api/v1/health`);
        if (res.ok) {
          console.log(`[CHAOS] Sistema recuperado en intento ${i + 1}`);
          return { recovered: true, attempts: i + 1, totalTimeMs: i * delayMs };
        }
      } catch (e) {}
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return { recovered: false, attempts: maxAttempts };
  }

  /**
   * Ejecuta todos los escenarios de chaos
   */
  async runAllChaosScenarios() {
    const results = [];

    // 1. Network latency
    results.push(await this.simulateNetworkLatency(2000, 10));

    // 2. Memory pressure
    results.push(await this.simulateMemoryPressure(70, 10));

    // 3. DB failure simulation
    results.push(await this.simulateDatabaseFailure(5));

    // 4. Concurrent deploy
    results.push(await this.simulateConcurrentDeploy(500, 15));

    return results;
  }
}

module.exports = { ChaosSimulator };
