/**
 * ═══════════════════════════════════════════════════════════
 * MASTER TEST ORCHESTRATOR - E2E Testing Advanced
 * ═══════════════════════════════════════════════════════════
 *
 * Orquestador principal que ejecuta los 7 layers de testing:
 * 1. E2E Functional (✅ Implementado)
 * 2. Load Testing (⏳ Pendiente)
 * 3. Security Testing (⏳ Pendiente)
 * 4. Multi-Tenant Isolation (⏳ Pendiente)
 * 5. Database Integrity (⏳ Pendiente)
 * 6. Monitoring & Observability (⏳ Pendiente)
 * 7. Edge Cases & Boundaries (⏳ Pendiente)
 *
 * @version 1.0.0
 * @date 2025-12-25
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class MasterTestOrchestrator {
  constructor() {
    this.layers = [
      {
        id: 1,
        name: 'E2E Functional',
        description: '29 módulos con CHAOS, SSOT, Dependency Mapping',
        status: 'implemented',
        estimatedDuration: 7200000, // 2 hours
        criticalForProduction: true
      },
      {
        id: 2,
        name: 'Load Testing',
        description: 'Artillery.io - 100-5000 usuarios concurrentes',
        status: 'designed',
        estimatedDuration: 3600000, // 1 hour
        criticalForProduction: true
      },
      {
        id: 3,
        name: 'Security Testing',
        description: 'OWASP Top 10 completo - 200 tests',
        status: 'designed',
        estimatedDuration: 5400000, // 1.5 hours
        criticalForProduction: true
      },
      {
        id: 4,
        name: 'Multi-Tenant Isolation',
        description: '50 empresas paralelas - data leakage detection',
        status: 'designed',
        estimatedDuration: 2700000, // 45 min
        criticalForProduction: true
      },
      {
        id: 5,
        name: 'Database Integrity',
        description: 'ACID, orphans, deadlocks, referential integrity',
        status: 'designed',
        estimatedDuration: 1800000, // 30 min
        criticalForProduction: true
      },
      {
        id: 6,
        name: 'Monitoring & Observability',
        description: 'APM, logs, traces, alerting',
        status: 'designed',
        estimatedDuration: 1200000, // 20 min
        criticalForProduction: false
      },
      {
        id: 7,
        name: 'Edge Cases & Boundaries',
        description: 'Unicode, timezones, extremos, cross-browser',
        status: 'designed',
        estimatedDuration: 2400000, // 40 min
        criticalForProduction: false
      }
    ];

    this.metricsStreamServer = null;
  }

  /**
   * Ejecuta todos los layers
   * @param {Object} options - Opciones de ejecución
   * @param {string} options.mode - 'sequential' o 'parallel'
   * @param {boolean} options.stopOnFailure - Detener si falla un layer
   * @param {boolean} options.autoHeal - Aplicar auto-healing
   * @param {number[]} options.layersToRun - IDs de layers específicos (opcional)
   * @returns {Promise<Object>} Resultados de la ejecución
   */
  async runAll(options = {}) {
    const {
      mode = 'sequential',
      stopOnFailure = false,
      autoHeal = true,
      layersToRun = null
    } = options;

    const executionId = `exec-${Date.now()}`;
    const startTime = new Date();

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     E2E TESTING ADVANCED - MASTER ORCHESTRATOR          ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    console.log(`📋 Execution ID: ${executionId}`);
    console.log(`⏱️  Start Time: ${startTime.toISOString()}`);
    console.log(`🎯 Mode: ${mode.toUpperCase()}`);
    console.log(`🔧 Auto-Healing: ${autoHeal ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🛑 Stop on Failure: ${stopOnFailure ? 'YES' : 'NO'}\n`);

    // Filtrar layers a ejecutar
    const layersToExecute = layersToRun
      ? this.layers.filter(l => layersToRun.includes(l.id))
      : this.layers;

    console.log(`📊 Layers to execute: ${layersToExecute.length}`);
    layersToExecute.forEach(l => {
      console.log(`   ${l.id}. ${l.name} (${l.status})`);
    });
    console.log('');

    let results;

    if (mode === 'sequential') {
      results = await this.runSequential(layersToExecute, stopOnFailure, autoHeal, executionId);
    } else {
      results = await this.runParallel(layersToExecute, stopOnFailure, autoHeal, executionId);
    }

    const endTime = new Date();
    const totalDuration = endTime - startTime;

    const summary = {
      executionId,
      startTime,
      endTime,
      totalDuration,
      totalDurationMin: (totalDuration / 60000).toFixed(2),
      mode,
      totalLayers: layersToExecute.length,
      executed: results.length,
      passed: results.filter(r => r.status === 'passed' || r.status === 'healed_and_passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      autoHealApplied: results.filter(r => r.autoHealApplied).length,
      results
    };

    this.printSummary(summary);
    this.saveResults(summary);

    return summary;
  }

  /**
   * Ejecución secuencial de layers
   */
  async runSequential(layers, stopOnFailure, autoHeal, executionId) {
    const results = [];

    for (const layer of layers) {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`🔄 Executing Layer ${layer.id}: ${layer.name}`);
      console.log(`${'═'.repeat(60)}\n`);

      const startTime = Date.now();

      try {
        const result = await this.runLayer(layer.id);
        const duration = Date.now() - startTime;

        results.push({
          layer: layer.id,
          name: layer.name,
          status: 'passed',
          duration,
          durationMin: (duration / 60000).toFixed(2),
          autoHealApplied: false,
          ...result
        });

        console.log(`\n✅ Layer ${layer.id} completado en ${(duration / 60000).toFixed(2)} min\n`);

      } catch (error) {
        const duration = Date.now() - startTime;

        console.error(`\n❌ Layer ${layer.id} falló: ${error.message}\n`);

        let healResult = null;

        if (autoHeal) {
          console.log(`🔧 Intentando auto-healing...`);
          healResult = await this.healLayer(layer.id, error);

          if (healResult.healed) {
            console.log(`✅ Auto-healing exitoso: ${healResult.fix}`);
            console.log(`🔄 Re-ejecutando layer ${layer.id}...`);

            try {
              const retryResult = await this.runLayer(layer.id);
              const retryDuration = Date.now() - startTime;

              results.push({
                layer: layer.id,
                name: layer.name,
                status: 'healed_and_passed',
                duration: retryDuration,
                durationMin: (retryDuration / 60000).toFixed(2),
                autoHealApplied: true,
                healedWith: healResult.fix,
                originalError: error.message,
                ...retryResult
              });

              console.log(`\n✅ Layer ${layer.id} pasó después de auto-healing\n`);
              continue;

            } catch (retryError) {
              console.error(`❌ Re-ejecución falló: ${retryError.message}`);
            }
          } else {
            console.log(`⚠️  Auto-healing no aplicable: ${healResult.reason}`);
          }
        }

        results.push({
          layer: layer.id,
          name: layer.name,
          status: 'failed',
          duration,
          durationMin: (duration / 60000).toFixed(2),
          autoHealApplied: healResult?.healed || false,
          error: error.message,
          stack: error.stack
        });

        if (stopOnFailure && layer.criticalForProduction) {
          console.log(`\n🛑 Deteniendo ejecución (layer crítico falló)\n`);
          break;
        }
      }

      // Stream progress si hay WebSocket activo
      if (this.metricsStreamServer) {
        this.metricsStreamServer.streamExecutionProgress(executionId, {
          layersCompleted: results.length,
          layersTotal: layers.length,
          progress: (results.length / layers.length) * 100
        });
      }
    }

    return results;
  }

  /**
   * Ejecución paralela de layers (solo independientes)
   */
  async runParallel(layers, stopOnFailure, autoHeal, executionId) {
    console.log('\n⚠️  Modo paralelo: Solo layers independientes se ejecutarán en paralelo\n');

    // Grupo 1: Load, Security, Edge Cases (pueden correr en paralelo)
    const group1 = layers.filter(l => [2, 3, 7].includes(l.id));

    // Grupo 2: Multi-Tenant, Database (dependen de Load + Security)
    const group2 = layers.filter(l => [4, 5].includes(l.id));

    // Layer 6: Monitoring (debe ser último)
    const group3 = layers.filter(l => l.id === 6);

    // Layer 1: E2E Functional (ya implementado, puede correr al inicio)
    const group0 = layers.filter(l => l.id === 1);

    const results = [];

    // Ejecutar grupos en secuencia, pero layers dentro de cada grupo en paralelo
    for (const [index, group] of [group0, group1, group2, group3].entries()) {
      if (group.length === 0) continue;

      console.log(`\n🔄 Ejecutando Grupo ${index + 1} (${group.length} layers en paralelo)...`);

      const promises = group.map(layer => this.runLayer(layer.id));
      const groupResults = await Promise.allSettled(promises);

      group.forEach((layer, i) => {
        const result = groupResults[i];

        if (result.status === 'fulfilled') {
          results.push({
            layer: layer.id,
            name: layer.name,
            status: 'passed',
            ...result.value
          });
        } else {
          results.push({
            layer: layer.id,
            name: layer.name,
            status: 'failed',
            error: result.reason.message
          });
        }
      });
    }

    return results;
  }

  /**
   * Ejecuta un layer específico
   */
  async runLayer(layerId) {
    switch (layerId) {
      case 1:
        return await this.runE2EFunctional();
      case 2:
        return await this.runLoadTesting();
      case 3:
        return await this.runSecurityTesting();
      case 4:
        return await this.runMultiTenantIsolation();
      case 5:
        return await this.runDatabaseIntegrity();
      case 6:
        return await this.runMonitoring();
      case 7:
        return await this.runEdgeCases();
      default:
        throw new Error(`Unknown layer: ${layerId}`);
    }
  }

  /**
   * LAYER 1: E2E Functional Testing
   */
  async runE2EFunctional() {
    console.log('   🧪 Ejecutando E2E Functional Testing...');

    const output = execSync('node tests/e2e/scripts/run-all-modules-tests.js', {
      cwd: path.join(__dirname, '../..'),  // Backend root directory
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 600000  // 10 min timeout
    });

    const resultsPath = path.join(__dirname, '../../tests/e2e/results/batch-test-results.json');
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

    return {
      totalModules: results.summary.total,
      passed: results.summary.passed,
      failed: results.summary.failed,
      successRate: (results.summary.passed / results.summary.total) * 100,
      details: results.results
    };
  }

  /**
   * LAYER 2: Load Testing
   */
  async runLoadTesting() {
    console.log('   ⚡ Load Testing not implemented yet');
    throw new Error('Load Testing implementation pending (FASE 3)');
  }

  /**
   * LAYER 3: Security Testing
   */
  async runSecurityTesting() {
    console.log('   🔒 Security Testing not implemented yet');
    throw new Error('Security Testing implementation pending (FASE 4)');
  }

  /**
   * LAYER 4: Multi-Tenant Isolation
   */
  async runMultiTenantIsolation() {
    console.log('   🏢 Multi-Tenant Isolation not implemented yet');
    throw new Error('Multi-Tenant Isolation implementation pending (FASE 5)');
  }

  /**
   * LAYER 5: Database Integrity
   */
  async runDatabaseIntegrity() {
    console.log('   🗄️  Database Integrity not implemented yet');
    throw new Error('Database Integrity implementation pending (FASE 6)');
  }

  /**
   * LAYER 6: Monitoring & Observability
   */
  async runMonitoring() {
    console.log('   📊 Monitoring not implemented yet');
    throw new Error('Monitoring implementation pending (FASE 7)');
  }

  /**
   * LAYER 7: Edge Cases & Boundaries
   */
  async runEdgeCases() {
    console.log('   🌍 Edge Cases not implemented yet');
    throw new Error('Edge Cases implementation pending (FASE 8)');
  }

  /**
   * Auto-healing logic
   */
  async healLayer(layerId, error) {
    // TODO: Implementar auto-healing específico por layer
    return {
      healed: false,
      reason: 'Auto-healing not implemented for this layer yet'
    };
  }

  /**
   * Imprime resumen final
   */
  printSummary(summary) {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║             EXECUTION SUMMARY                            ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    console.log(`📋 Execution ID: ${summary.executionId}`);
    console.log(`⏱️  Duration: ${summary.totalDurationMin} min`);
    console.log(`📊 Layers Executed: ${summary.executed}/${summary.totalLayers}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`🔧 Auto-Heal Applied: ${summary.autoHealApplied}`);
    console.log(`📈 Success Rate: ${((summary.passed / summary.executed) * 100).toFixed(2)}%\n`);

    console.log('📋 Results by Layer:\n');
    summary.results.forEach(result => {
      const icon = result.status === 'passed' || result.status === 'healed_and_passed' ? '✅' : '❌';
      console.log(`   ${icon} Layer ${result.layer}: ${result.name}`);
      console.log(`      Status: ${result.status}`);
      console.log(`      Duration: ${result.durationMin} min`);
      if (result.autoHealApplied) {
        console.log(`      🔧 Auto-heal: ${result.healedWith}`);
      }
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
      console.log('');
    });

    console.log('═'.repeat(60) + '\n');
  }

  /**
   * Guarda resultados en archivo JSON
   */
  saveResults(summary) {
    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const resultsPath = path.join(resultsDir, `${summary.executionId}.json`);
    fs.writeFileSync(resultsPath, JSON.stringify(summary, null, 2));

    console.log(`💾 Resultados guardados en: ${resultsPath}\n`);
  }
}

module.exports = MasterTestOrchestrator;
