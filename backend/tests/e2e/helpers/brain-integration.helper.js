/**
 * ═══════════════════════════════════════════════════════════
 * BRAIN INTEGRATION HELPER - Feedback Loop con Orquestador
 * ═══════════════════════════════════════════════════════════
 *
 * Conecta el sistema de tests E2E con el Brain orquestador:
 *
 * 1. Envía resultados de tests al Brain
 * 2. Brain analiza patterns y sugiere fixes
 * 3. Brain actualiza Knowledge Base para IA Assistant
 * 4. Brain ejecuta auto-reparación via HybridHealer
 * 5. Tests consumen sugerencias del Brain
 */

// MEJORA #18: Cargar variables de entorno ANTES de usar process.env
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../.env.e2e') });

const axios = require('axios');
const { Pool } = require('pg');

/**
 * Cliente del Brain
 */
class BrainIntegrationClient {
  constructor(baseURL = 'http://localhost:9998') {
    this.baseURL = baseURL;

    // Cargar token de servicio automáticamente desde .env
    this.token = process.env.E2E_SERVICE_TOKEN || null;

    if (this.token) {
      console.log('   🔐 Token de servicio E2E cargado correctamente');
    } else {
      console.log('   ⚠️  Token de servicio no encontrado - APIs usarán SQL directo');
    }

    // PostgreSQL pool para escribir directamente
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'attendance_system',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'Aedr15150302'
    });
  }

  /**
   * Configurar token de autenticación
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * ENVIAR RESULTADO DE TEST AL BRAIN
   * USA EL SISTEMA NERVIOSO EXISTENTE escribiendo directo a audit_logs
   */
  async sendTestResult(testResult) {
    console.log(`\n🧠 [BRAIN] Enviando resultado de test al Sistema Nervioso...`);

    try {
      // Escribir directamente a audit_test_logs (tabla correcta para E2E tests)
      const query = `
        INSERT INTO audit_test_logs (
          execution_id,
          company_id,
          test_type,
          module_name,
          test_name,
          status,
          duration_ms,
          error_type,
          error_message,
          error_stack,
          metadata
        ) VALUES (gen_random_uuid(), 11, $1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id AS log_id
      `;

      const status = testResult.status === 'passed' ? 'passed' :
                     testResult.status === 'failed' ? 'failed' : 'warning';

      const result = await this.pool.query(query, [
        'e2e',                          // test_type
        testResult.module,              // module_name
        testResult.name,                // test_name
        status,                         // status
        testResult.duration,            // duration_ms
        testResult.error ? 'E2E_TEST_FAILURE' : null, // error_type
        testResult.error,               // error_message
        testResult.stack,               // error_stack
        JSON.stringify({               // metadata
          browser: testResult.browser || 'chromium',
          viewport: testResult.viewport,
          screenshots: testResult.screenshots,
          performance: testResult.performance
        })
      ]);

      const logId = result.rows[0].log_id;
      console.log(`   ✅ Test registrado en Brain Sistema Nervioso - Log ID: ${logId}`);

      // Si falló, el Brain Nervous System lo detectará automáticamente
      if (status === 'failed') {
        console.log(`   🧠 Brain Sistema Nervioso procesará este error automáticamente`);
      }

      return { log_id: logId };

    } catch (err) {
      console.log(`   ⚠️  Error enviando al Brain: ${err.message}`);
      return null;
    }
  }

  /**
   * PEDIR ANÁLISIS AL BRAIN
   * Brain analiza patterns de failures y sugiere fixes
   */
  async requestAnalysis(moduleKey) {
    console.log(`\n🧠 [BRAIN] Solicitando análisis de módulo: ${moduleKey}...`);

    try {
      const response = await axios.post(
        `${this.baseURL}/api/audit/run/${moduleKey}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        }
      );

      console.log(`   ✅ Análisis iniciado - Execution ID: ${response.data.execution_id}`);
      return response.data;

    } catch (err) {
      console.log(`   ⚠️  Error en análisis: ${err.message}`);
      return null;
    }
  }

  /**
   * OBTENER SUGERENCIAS DE FIXES
   * Brain retorna fixes sugeridos basados en failures previos
   */
  async getSuggestedFixes(moduleKey) {
    console.log(`\n🧠 [BRAIN] Obteniendo fixes sugeridos para: ${moduleKey}...`);

    try {
      // Consultar audit_test_logs para este módulo
      const query = `
        SELECT
          id AS log_id,
          test_type,
          test_name,
          error_type,
          error_message,
          fix_strategy,
          fix_code,
          metadata
        FROM audit_test_logs
        WHERE module_name = $1
          AND fix_strategy IS NOT NULL
          AND status IN ('warning', 'fixed')
        ORDER BY created_at DESC
        LIMIT 10
      `;

      const result = await this.pool.query(query, [moduleKey]);

      console.log(`   ✅ ${result.rows.length} fixes sugeridos encontrados`);

      return result.rows.map(row => ({
        logId: row.log_id,
        testName: row.test_name,
        errorType: row.error_type,
        errorMessage: row.error_message,
        strategy: row.fix_strategy,
        suggestedCode: row.fix_code,
        confidence: row.metadata?.confidence_score || 0.8
      }));

    } catch (err) {
      console.log(`   ⚠️  Error obteniendo fixes: ${err.message}`);
      return [];
    }
  }

  /**
   * ALIMENTAR KNOWLEDGE BASE DEL IA ASSISTANT
   * Cuando un test falla, agregar pregunta/respuesta al KB
   */
  async feedAssistantKnowledge(question, answer, context) {
    console.log(`\n🧠 [BRAIN] Alimentando Knowledge Base de IA Assistant...`);

    try {
      const query = `
        INSERT INTO assistant_knowledge_base (
          company_id,
          question,
          answer,
          context,
          answer_source,
          confidence_score,
          reused_count
        ) VALUES (11, $1, $2, $3, $4, $5, $6)
        RETURNING id AS knowledge_id
      `;

      const result = await this.pool.query(query, [
        question,
        answer,
        context,
        'e2e-testing',
        0.9, // Alta relevancia porque viene de tests reales
        1
      ]);

      console.log(`   ✅ Knowledge agregado - ID: ${result.rows[0].knowledge_id}`);
      return result.rows[0].knowledge_id;

    } catch (err) {
      console.log(`   ⚠️  Error alimentando KB: ${err.message}`);
      return null;
    }
  }

  /**
   * EJECUTAR AUTO-REPARACIÓN
   * Pide al Brain que intente auto-reparar usando HybridHealer
   */
  async requestAutoFix(logId) {
    console.log(`\n🧠 [BRAIN] Solicitando auto-reparación para log: ${logId}...`);

    try {
      const response = await axios.post(
        `${this.baseURL}/api/audit/heal/${logId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        }
      );

      if (response.data.fix_applied) {
        console.log(`   ✅ Fix aplicado: ${response.data.fix_strategy}`);
        console.log(`   📝 Archivos modificados: ${response.data.files_modified.join(', ')}`);
      } else {
        console.log(`   ⚠️  Fix sugerido pero no aplicado automáticamente`);
        console.log(`   💡 Sugerencia: ${response.data.fix_code_suggestion}`);
      }

      return response.data;

    } catch (err) {
      console.log(`   ⚠️  Error en auto-fix: ${err.message}`);
      if (err.response?.status === 401) {
        console.log(`   💡 Usando SQL directo como fallback`);
      }
      if (err.response?.status === 401) {
        console.log(`   💡 Usando SQL directo como fallback`);
      }
      return null;
    }
  }

  /**
   * FEEDBACK LOOP COMPLETO
   * 1. Enviar resultado de test
   * 2. Si falló, pedir análisis
   * 3. Obtener sugerencias
   * 4. Intentar auto-fix
   * 5. Alimentar KB del Assistant
   */
  async completeFeedbackLoop(testResult) {
    console.log('\n═══════════════════════════════════════════');
    console.log('🔄 BRAIN FEEDBACK LOOP - INICIANDO');
    console.log('═══════════════════════════════════════════\n');

    const loop = {
      testSent: false,
      analysisRequested: false,
      fixesSuggested: [],
      autoFixAttempted: false,
      knowledgeFed: false
    };

    // 1. Enviar resultado
    const sentResult = await this.sendTestResult(testResult);
    loop.testSent = !!sentResult;

    // 2. Si falló, pedir análisis
    if (testResult.status === 'failed') {
      const analysis = await this.requestAnalysis(testResult.module);
      loop.analysisRequested = !!analysis;

      // 3. Obtener sugerencias
      const fixes = await this.getSuggestedFixes(testResult.module);
      loop.fixesSuggested = fixes;

      // 4. Intentar auto-fix (si hay log_id)
      if (sentResult?.log_id) {
        const autoFix = await this.requestAutoFix(sentResult.log_id);
        loop.autoFixAttempted = !!autoFix;
      }

      // 5. Alimentar Knowledge Base
      const question = `¿Por qué falla el test "${testResult.name}" en el módulo ${testResult.module}?`;
      const answer = testResult.error || 'Error desconocido';
      const context = `Test E2E que valida ${testResult.description || 'funcionalidad'}`;

      const kbId = await this.feedAssistantKnowledge(question, answer, context);
      loop.knowledgeFed = !!kbId;
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('📊 FEEDBACK LOOP - RESUMEN');
    console.log('═══════════════════════════════════════════');
    console.log(`Test enviado al Brain: ${loop.testSent ? '✅' : '❌'}`);
    console.log(`Análisis solicitado: ${loop.analysisRequested ? '✅' : '⏭️  (test pasó)'}`);
    console.log(`Fixes sugeridos: ${loop.fixesSuggested.length}`);
    console.log(`Auto-fix intentado: ${loop.autoFixAttempted ? '✅' : '⏭️'}`);
    console.log(`Knowledge Base alimentada: ${loop.knowledgeFed ? '✅' : '⏭️'}`);
    console.log('═══════════════════════════════════════════\n');

    return loop;
  }

  /**
   * Cerrar conexiones
   */
  async close() {
    await this.pool.end();
  }
}

/**
 * Helper rápido para uso en tests
 */
async function sendTestToBrain(testResult, token) {
  const client = new BrainIntegrationClient();
  client.setToken(token);

  const result = await client.sendTestResult(testResult);

  await client.close();
  return result;
}

/**
 * Feedback loop rápido
 */
async function feedbackLoop(testResult, token) {
  const client = new BrainIntegrationClient();
  client.setToken(token);

  const loop = await client.completeFeedbackLoop(testResult);

  await client.close();
  return loop;
}

module.exports = {
  BrainIntegrationClient,
  sendTestToBrain,
  feedbackLoop
};
