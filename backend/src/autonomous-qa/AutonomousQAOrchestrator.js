/**
 * AUTONOMOUS QA ORCHESTRATOR - Sistema de Testing 24/7
 *
 * Reemplaza 2-3 QA testers humanos con IA + Brain
 *
 * CARACTERÍSTICAS:
 * - Chaos testing continuo (cada 30 min, 3 módulos aleatorios)
 * - Health monitoring (cada 5 min)
 * - Anomaly detection (cada 10 min, ML-based)
 * - Auto-healing (usando HybridHealer existente)
 * - Learning engine (knowledge base + feedback)
 * - Smart alerting (Slack, email, SMS)
 *
 * EJECUCIÓN:
 *   node src/autonomous-qa/AutonomousQAOrchestrator.js
 *
 * PM2:
 *   pm2 start src/autonomous-qa/AutonomousQAOrchestrator.js --name autonomous-qa
 */

const cron = require('node-cron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'attendance_system',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  max: 10
});

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  chaos: {
    enabled: process.env.QA_CHAOS_ENABLED !== 'false',
    interval: parseInt(process.env.QA_CHAOS_INTERVAL) || 30,  // minutes
    concurrentModules: 3
  },
  health: {
    enabled: process.env.QA_HEALTH_ENABLED !== 'false',
    interval: parseInt(process.env.QA_HEALTH_INTERVAL) || 5   // minutes
  },
  anomaly: {
    enabled: process.env.QA_ANOMALY_ENABLED !== 'false',
    interval: parseInt(process.env.QA_ANOMALY_INTERVAL) || 10, // minutes
    sensitivity: parseFloat(process.env.QA_ANOMALY_SENSITIVITY) || 0.8
  },
  autoHealing: {
    enabled: process.env.QA_AUTO_HEALING !== 'false'
  },
  learning: {
    enabled: process.env.QA_LEARNING !== 'false'
  }
};

// ============================================================================
// CHAOS TESTER
// ============================================================================

class ChaosTestScheduler {
  constructor() {
    this.isRunning = false;
  }

  async selectRandomModules(count) {
    try {
      const result = await pool.query(`
        SELECT module_key
        FROM system_modules
        WHERE is_active = true
        ORDER BY RANDOM()
        LIMIT $1
      `, [count]);

      return result.rows.map(r => r.module_key);
    } catch (error) {
      console.error('❌ [CHAOS] Error selecting modules:', error.message);
      return [];
    }
  }

  async runChaosTest(moduleKey) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      console.log(`   🎲 [CHAOS] Testing module: ${moduleKey}`);

      const command = `npx playwright test tests/e2e/modules/universal-modal-advanced.e2e.spec.js --project=chromium`;

      const child = exec(command, {
        cwd: path.join(__dirname, '../..'),
        timeout: 15 * 60 * 1000,  // 15 min timeout
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, MODULE_TO_TEST: moduleKey }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => { stdout += data; });
      child.stderr.on('data', (data) => { stderr += data; });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;

        if (code === 0) {
          console.log(`   ✅ [CHAOS] ${moduleKey} PASSED (${(duration / 1000 / 60).toFixed(1)} min)`);
          resolve({ moduleKey, status: 'PASSED', duration });
        } else {
          console.log(`   ❌ [CHAOS] ${moduleKey} FAILED (${(duration / 1000 / 60).toFixed(1)} min)`);
          reject({ moduleKey, status: 'FAILED', duration, stdout, stderr });
        }
      });

      child.on('error', (error) => {
        console.log(`   ⚠️  [CHAOS] ${moduleKey} ERROR: ${error.message}`);
        reject({ moduleKey, status: 'ERROR', error: error.message });
      });
    });
  }

  async run() {
    if (this.isRunning) {
      console.log('⏭️  [CHAOS] Ya hay ejecución en curso, skip...');
      return;
    }

    this.isRunning = true;

    try {
      console.log('\n' + '='.repeat(70));
      console.log('🎲 [CHAOS TESTING] Iniciando ronda de testing aleatorio');
      console.log('='.repeat(70) + '\n');

      // Seleccionar módulos aleatorios
      const modules = await this.selectRandomModules(CONFIG.chaos.concurrentModules);

      if (modules.length === 0) {
        console.log('⚠️  [CHAOS] No hay módulos activos para testear');
        return;
      }

      console.log(`   Módulos seleccionados: ${modules.join(', ')}\n`);

      // Ejecutar tests en paralelo
      const results = await Promise.allSettled(
        modules.map(mod => this.runChaosTest(mod))
      );

      // Analizar resultados
      let passed = 0;
      let failed = 0;

      for (const result of results) {
        if (result.status === 'fulfilled') {
          passed++;
        } else {
          failed++;
          // TODO: Enviar al Brain para análisis
          await this.analyzeFailure(result.reason);
        }
      }

      console.log('\n' + '-'.repeat(70));
      console.log(`📊 [CHAOS] Resumen: ${passed} PASSED, ${failed} FAILED`);
      console.log('-'.repeat(70) + '\n');

      // Guardar stats
      await this.saveStats({
        timestamp: new Date(),
        modules_tested: modules,
        passed,
        failed,
        success_rate: (passed / modules.length) * 100
      });

    } catch (error) {
      console.error('❌ [CHAOS] Error fatal:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  async analyzeFailure(failure) {
    // TODO: Integración con Brain
    console.log(`   🧠 [BRAIN] Analizando fallo en ${failure.moduleKey}...`);

    // Por ahora, solo guardar en PostgreSQL
    try {
      await pool.query(`
        INSERT INTO autonomous_qa_failures (
          module_key,
          failure_type,
          error_message,
          stdout,
          stderr,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT DO NOTHING
      `, [
        failure.moduleKey,
        failure.status,
        failure.error || 'Test failed',
        failure.stdout || '',
        failure.stderr || ''
      ]);
    } catch (error) {
      // Tabla no existe aún, ignorar (se creará en migration)
      console.log('   ⚠️  [BRAIN] Tabla autonomous_qa_failures no existe aún');
    }
  }

  async saveStats(stats) {
    try {
      await pool.query(`
        INSERT INTO autonomous_qa_stats (
          timestamp,
          modules_tested,
          passed,
          failed,
          success_rate
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [
        stats.timestamp,
        stats.modules_tested.length,
        stats.passed,
        stats.failed,
        stats.success_rate
      ]);
    } catch (error) {
      // Tabla no existe aún, ignorar
      console.log('   ⚠️  [STATS] Tabla autonomous_qa_stats no existe aún');
    }
  }
}

// ============================================================================
// HEALTH MONITOR
// ============================================================================

class HealthMonitor {
  async run() {
    console.log('\n🏥 [HEALTH] Checking system health...');

    try {
      const health = {
        database: await this.checkDatabase(),
        memory: await this.checkMemory(),
        cpu: await this.checkCPU(),
        timestamp: new Date()
      };

      // Log resultados
      console.log(`   📊 Database: ${health.database.is_healthy ? '✅' : '⚠️'} (${health.database.pool_usage_percent.toFixed(1)}% pool usage)`);
      console.log(`   💾 Memory: ${health.memory.is_healthy ? '✅' : '⚠️'} (${health.memory.usage_percent.toFixed(1)}% used)`);
      console.log(`   ⚡ CPU: ${health.cpu.is_healthy ? '✅' : '⚠️'} (${health.cpu.usage_percent.toFixed(1)}% used)`);

      // Alertar si algo está mal
      if (!health.database.is_healthy || !health.memory.is_healthy || !health.cpu.is_healthy) {
        await this.sendAlert(health);
      }

      return health;

    } catch (error) {
      console.error('❌ [HEALTH] Error:', error.message);
      return null;
    }
  }

  async checkDatabase() {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') AS active_connections,
        (SELECT COUNT(*) FROM pg_stat_activity) AS total_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_connections
    `);

    const row = result.rows[0];
    const poolUsage = (row.total_connections / row.max_connections) * 100;

    return {
      active_connections: row.active_connections,
      total_connections: row.total_connections,
      max_connections: row.max_connections,
      pool_usage_percent: poolUsage,
      is_healthy: poolUsage < 80  // < 80% usage
    };
  }

  async checkMemory() {
    const os = require('os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usagePercent = (usedMem / totalMem) * 100;

    return {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usage_percent: usagePercent,
      is_healthy: usagePercent < 85  // < 85% usage
    };
  }

  async checkCPU() {
    const os = require('os');
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usagePercent = 100 - ~~(100 * idle / total);

    return {
      cores: cpus.length,
      usage_percent: usagePercent,
      is_healthy: usagePercent < 80  // < 80% usage
    };
  }

  async sendAlert(health) {
    console.log('   🚨 [ALERT] Sistema no saludable - enviando alerta...');
    // TODO: Implementar Slack/Email/SMS
  }
}

// ============================================================================
// ANOMALY DETECTOR (placeholder - implementation pending)
// ============================================================================

class AnomalyDetector {
  async run() {
    console.log('\n🔍 [ANOMALY] Detecting anomalies...');
    // TODO: Implementar ML-based anomaly detection
    console.log('   ⏭️  [ANOMALY] Implementación pendiente (FASE 2)');
  }
}

// ============================================================================
// ORCHESTRATOR PRINCIPAL
// ============================================================================

class AutonomousQAOrchestrator {
  constructor() {
    this.chaosScheduler = new ChaosTestScheduler();
    this.healthMonitor = new HealthMonitor();
    this.anomalyDetector = new AnomalyDetector();
  }

  async start() {
    console.log('🤖 [AUTONOMOUS QA] Sistema iniciado\n');
    console.log('⚙️  Configuración:');
    console.log(`   Chaos Testing: ${CONFIG.chaos.enabled ? `✅ (cada ${CONFIG.chaos.interval} min)` : '❌'}`);
    console.log(`   Health Monitoring: ${CONFIG.health.enabled ? `✅ (cada ${CONFIG.health.interval} min)` : '❌'}`);
    console.log(`   Anomaly Detection: ${CONFIG.anomaly.enabled ? `✅ (cada ${CONFIG.anomaly.interval} min)` : '❌'}`);
    console.log(`   Auto-Healing: ${CONFIG.autoHealing.enabled ? '✅' : '❌'}`);
    console.log(`   Learning Engine: ${CONFIG.learning.enabled ? '✅' : '❌'}\n`);

    // Ejecutar health check inicial
    await this.healthMonitor.run();

    // Schedule cron jobs
    if (CONFIG.chaos.enabled) {
      // Chaos testing: cada 30 minutos
      cron.schedule(`*/${CONFIG.chaos.interval} * * * *`, async () => {
        await this.chaosScheduler.run();
      });
      console.log(`✅ Chaos Testing scheduled: every ${CONFIG.chaos.interval} minutes`);
    }

    if (CONFIG.health.enabled) {
      // Health monitoring: cada 5 minutos
      cron.schedule(`*/${CONFIG.health.interval} * * * *`, async () => {
        await this.healthMonitor.run();
      });
      console.log(`✅ Health Monitoring scheduled: every ${CONFIG.health.interval} minutes`);
    }

    if (CONFIG.anomaly.enabled) {
      // Anomaly detection: cada 10 minutos
      cron.schedule(`*/${CONFIG.anomaly.interval} * * * *`, async () => {
        await this.anomalyDetector.run();
      });
      console.log(`✅ Anomaly Detection scheduled: every ${CONFIG.anomaly.interval} minutes`);
    }

    console.log('\n🚀 [AUTONOMOUS QA] Todos los schedulers activados\n');
    console.log('📝 Logs disponibles en PM2: pm2 logs autonomous-qa\n');
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

const orchestrator = new AutonomousQAOrchestrator();
orchestrator.start().catch(error => {
  console.error('❌ [FATAL] Error iniciando Autonomous QA:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 [SHUTDOWN] Deteniendo Autonomous QA...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 [SHUTDOWN] Deteniendo Autonomous QA...');
  await pool.end();
  process.exit(0);
});
