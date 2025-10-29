/**
 * AUDITOR AUTÓNOMO - Sistema de Testing y Reparación Continua
 *
 * Este script ejecuta ciclos automáticos de:
 * 1. Auditoría completa del sistema
 * 2. Análisis de fallos
 * 3. Reparación automática
 * 4. Re-auditoría
 *
 * Se repite hasta alcanzar 100% de tests pasando o max_iterations
 */

const axios = require('axios');

class AutonomousAuditor {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    this.maxIterations = options.maxIterations || 10;
    this.targetPassRate = options.targetPassRate || 100;
    this.token = null;
    this.currentIteration = 0;
  }

  async login() {
    console.log('\n🔐 [AUTH] Obteniendo token...');
    const response = await axios.post(`${this.baseUrl}/api/v1/auth/login`, {
      identifier: 'admin',
      password: 'admin123',
      companyId: 11
    });
    this.token = response.data.token;
    console.log('✅ [AUTH] Token obtenido');
  }

  async runAudit() {
    console.log('\n🚀 [AUDIT] Ejecutando auditoría completa...');
    const response = await axios.post(
      `${this.baseUrl}/api/audit/run`,
      { parallel: true, autoHeal: true },
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
    return response.data.execution_id;
  }

  async waitForAuditCompletion(executionId, maxWait = 120000) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const response = await axios.get(
        `${this.baseUrl}/api/audit/executions/${executionId}`,
        { headers: { Authorization: `Bearer ${this.token}` } }
      );

      if (response.data.status === 'completed' || response.data.status === 'failed') {
        return response.data;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Auditoría excedió tiempo máximo de espera');
  }

  displayResults(summary) {
    const passRate = ((summary.passed / summary.total) * 100).toFixed(1);

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log(`║  📊 ITERACIÓN ${this.currentIteration}/${this.maxIterations} - RESULTADOS`);
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`\nTotal tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⚠️  Warnings: ${summary.warnings}`);
    console.log(`\nMódulos: ${summary.modules_tested.join(', ')}`);
    console.log(`Duración: ${summary.total_duration}ms`);
    console.log(`\n📊 TASA DE ÉXITO: ${passRate}%`);
    console.log(`🎯 OBJETIVO: ${this.targetPassRate}%`);

    if (summary.fixes_attempted > 0) {
      console.log(`\n🔧 Reparaciones intentadas: ${summary.fixes_attempted}`);
      console.log(`✅ Reparaciones exitosas: ${summary.fixes_successful}`);
    }

    return parseFloat(passRate);
  }

  async run() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  🤖 AUDITOR AUTÓNOMO - Sistema de Auto-Reparación       ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`\n🎯 Objetivo: ${this.targetPassRate}% de tests pasando`);
    console.log(`🔄 Máximo de iteraciones: ${this.maxIterations}`);
    console.log(`🌐 Base URL: ${this.baseUrl}\n`);

    try {
      // Login
      await this.login();

      // Ciclo de auditoría y reparación
      for (this.currentIteration = 1; this.currentIteration <= this.maxIterations; this.currentIteration++) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`  ITERACIÓN ${this.currentIteration}/${this.maxIterations}`);
        console.log(`${'='.repeat(60)}`);

        // Ejecutar auditoría
        const executionId = await this.runAudit();
        console.log(`✅ [AUDIT] Auditoría iniciada: ${executionId}`);
        console.log('⏳ [AUDIT] Esperando completar...');

        // Esperar resultados
        const result = await this.waitForAuditCompletion(executionId);

        // Mostrar resultados
        const passRate = this.displayResults(result.summary);

        // Verificar si alcanzamos el objetivo
        if (passRate >= this.targetPassRate) {
          console.log('\n════════════════════════════════════════════════════════════');
          console.log('🎉🎉🎉 ¡OBJETIVO ALCANZADO! 🎉🎉🎉');
          console.log('════════════════════════════════════════════════════════════');
          console.log(`\n✅ Sistema alcanzó ${passRate}% de tests pasando`);
          console.log(`✅ Iteraciones necesarias: ${this.currentIteration}`);
          console.log('\n🚀 Sistema listo para producción!\n');
          return { success: true, passRate, iterations: this.currentIteration };
        }

        // Si aún hay fallos, continuar al siguiente ciclo
        if (this.currentIteration < this.maxIterations) {
          console.log(`\n🔄 [LOOP] Continuando al siguiente ciclo de reparación...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      // Si llegamos aquí, no alcanzamos el objetivo
      console.log('\n════════════════════════════════════════════════════════════');
      console.log('⚠️  OBJETIVO NO ALCANZADO');
      console.log('════════════════════════════════════════════════════════════');
      console.log(`\n❌ No se pudo alcanzar ${this.targetPassRate}% en ${this.maxIterations} iteraciones`);
      console.log('💡 Revisa los logs para ver qué tests siguen fallando\n');

      return { success: false, iterations: this.maxIterations };

    } catch (error) {
      console.error('\n❌ [ERROR] Error fatal:', error.message);
      throw error;
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const PORT = process.env.PORT || 9999;
  const auditor = new AutonomousAuditor(`http://localhost:${PORT}`, {
    maxIterations: 10,
    targetPassRate: 100
  });

  auditor.run()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = AutonomousAuditor;
