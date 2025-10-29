/**
 * TEST RÁPIDO DEL LEARNING ENGINE
 *
 * Simula datos reales de FrontendCollector para verificar que:
 * 1. LearningEngine procesa correctamente todos los errores
 * 2. Detecta patrones
 * 3. Identifica edge cases
 * 4. Mide performance
 * 5. Registra conocimiento en PostgreSQL
 */

const LearningEngine = require('./src/auditor/learning/LearningEngine');
const { v4: uuidv4 } = require('uuid');

async function testLearningEngine() {
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`🧪 TEST LEARNING ENGINE - Simulación de datos reales`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  const learningEngine = new LearningEngine();
  const execution_id = uuidv4();

  // ⭐ SIMULAR DATOS REALES de FrontendCollector
  const simulatedTestResults = {
    // Console errors (errores de JavaScript)
    errors: [
      {
        type: 'console',
        category: 'reference-error',
        message: 'Uncaught ReferenceError: loadUsers is not defined',
        file: 'users.js',
        line: 123,
        severity: 'critical',
        canAutoFix: false
      },
      {
        type: 'console',
        category: 'reference-error',
        message: 'Uncaught ReferenceError: loadUsers is not defined',
        file: 'users.js',
        line: 456,
        severity: 'critical',
        canAutoFix: false
      },
      {
        type: 'console',
        category: 'type-error',
        message: 'Cannot read property "forEach" of undefined',
        file: 'departments.js',
        line: 78,
        severity: 'high',
        canAutoFix: false
      }
    ],

    // Page errors (errores de página)
    pageErrors: [
      {
        type: 'page',
        category: 'uncaught-exception',
        message: 'Unhandled Promise Rejection: Network request failed',
        severity: 'high',
        canAutoFix: false
      }
    ],

    // Network errors (404s, network failures)
    networkErrors: [
      {
        type: 'network',
        category: 'http-404',
        message: 'GET /css/users.css 404 (Not Found)',
        severity: 'medium',
        canAutoFix: true,
        suggestedFix: 'Verify CSS file path'
      },
      {
        type: 'network',
        category: 'http-404',
        message: 'GET /js/modules/reports.js 404 (Not Found)',
        severity: 'medium',
        canAutoFix: true,
        suggestedFix: 'Verify JS file path'
      },
      {
        type: 'network',
        category: 'http-500',
        message: 'POST /api/users 500 (Internal Server Error)',
        severity: 'critical',
        canAutoFix: false
      }
    ],

    // Módulos que fallaron
    failures: [
      {
        module: 'users',
        status: 'failed',
        reason: 'Module not loaded before test execution - dynamic loading issue',
        duration_ms: 3500
      },
      {
        module: 'departments',
        status: 'failed',
        reason: 'Timeout: Module took too long to respond',
        duration_ms: 8200,
        timeout: true
      }
    ],

    // Módulos que pasaron
    passes: [
      {
        module: 'dashboard',
        status: 'passed',
        duration_ms: 1200
      },
      {
        module: 'settings',
        status: 'passed',
        duration_ms: 800
      }
    ],

    // Warnings
    warnings: [
      {
        module: 'reports',
        status: 'warning',
        message: 'Module loaded but with deprecation warnings'
      }
    ],

    // Todos los resultados (para performance analysis)
    results: [
      { module: 'users', status: 'failed', duration_ms: 3500, errors: [] },
      { module: 'departments', status: 'failed', duration_ms: 8200, errors: [] },
      { module: 'dashboard', status: 'passed', duration_ms: 1200, errors: [] },
      { module: 'settings', status: 'passed', duration_ms: 800, errors: [] },
      { module: 'reports', status: 'warning', duration_ms: 2100, errors: [] }
    ]
  };

  console.log(`📊 Datos de entrada simulados:`);
  console.log(`   - Console errors: ${simulatedTestResults.errors.length}`);
  console.log(`   - Page errors: ${simulatedTestResults.pageErrors.length}`);
  console.log(`   - Network errors: ${simulatedTestResults.networkErrors.length}`);
  console.log(`   - Failures: ${simulatedTestResults.failures.length}`);
  console.log(`   - Passes: ${simulatedTestResults.passes.length}`);
  console.log(`   - Results: ${simulatedTestResults.results.length}`);
  console.log(``);

  try {
    // ⭐ EJECUTAR ANÁLISIS
    console.log(`🧠 Ejecutando LearningEngine.analyzeTestResults()...`);
    console.log(``);

    const insights = await learningEngine.analyzeTestResults(execution_id, simulatedTestResults);

    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`✅ RESULTADO DEL ANÁLISIS`);
    console.log(`═══════════════════════════════════════════════════════════\n`);

    if (insights) {
      console.log(`📊 Insights capturados:`);
      console.log(`   - Errores analizados: ${insights.errors_analyzed}`);
      console.log(`   - Patrones descubiertos: ${insights.patterns_discovered}`);
      console.log(`   - Edge cases encontrados: ${insights.edge_cases_found}`);
      console.log(`   - Performance insights: ${insights.performance_insights}`);
      console.log(`   - Estrategias evaluadas: ${insights.repair_strategies_evaluated}`);
      console.log(``);

      // ⭐ VERIFICAR KNOWLEDGE BASE
      console.log(`\n═══════════════════════════════════════════════════════════`);
      console.log(`🔍 VERIFICANDO KNOWLEDGE BASE EN POSTGRESQL`);
      console.log(`═══════════════════════════════════════════════════════════\n`);

      const KnowledgeBase = require('./src/auditor/knowledge/KnowledgeBase');
      const kb = new KnowledgeBase();

      const errorPatterns = await kb.getErrorPatterns({ minConfidence: 0.0, limit: 10 });
      console.log(`📚 Patrones de error almacenados: ${errorPatterns.length}`);

      if (errorPatterns.length > 0) {
        console.log(``);
        errorPatterns.slice(0, 5).forEach((pattern, i) => {
          console.log(`   ${i+1}. ${pattern.key}`);
          console.log(`      - Confidence: ${pattern.confidence_score}`);
          console.log(`      - Occurrences: ${pattern.occurrences}`);
          console.log(`      - Priority: ${pattern.data.priority || 'N/A'}`);
        });
      }

      console.log(`\n═══════════════════════════════════════════════════════════`);
      console.log(`✅ TEST COMPLETADO EXITOSAMENTE`);
      console.log(`═══════════════════════════════════════════════════════════\n`);

      process.exit(0);
    } else {
      console.error(`\n❌ ERROR: analyzeTestResults() retornó null`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n❌ ERROR EJECUTANDO TEST:`, error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar test
testLearningEngine();
