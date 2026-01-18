/**
 * ═══════════════════════════════════════════════════════════
 * TESTING ROUTES - API para Ejecutar Tests E2E desde UI
 * ═══════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { Pool } = require('pg');

// PostgreSQL pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'attendance_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Aedr15150302'
});

/**
 * POST /api/testing/run-e2e-advanced
 * Ejecutar tests E2E seleccionados desde UI (V2 con múltiples módulos)
 */
router.post('/run-e2e-advanced', async (req, res) => {
  console.log('\n🧪 [TESTING-API] Recibida solicitud de ejecución de tests E2E avanzados...');

  const { selectedTests, selectedModules, brainIntegration, continuousCycle } = req.body;

  if (!selectedTests || selectedTests.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No se seleccionaron tests para ejecutar'
    });
  }

  if (!selectedModules || selectedModules.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No se seleccionaron módulos para testear'
    });
  }

  console.log(`   ✅ Tests seleccionados: ${selectedTests.length}`);
  console.log(`   ✅ Módulos seleccionados: ${selectedModules.length} (${selectedModules.join(', ')})`);

  try {
    // 1. Generar configuración de tests basada en selección
    const testConfig = generateTestConfig(selectedTests);
    console.log('   ✅ Configuración de tests generada');

    // 2. Ejecutar tests para CADA módulo seleccionado
    const executionId = `exec_${Date.now()}`;
    const startTime = Date.now();

    console.log(`   🚀 Ejecutando tests para ${selectedModules.length} módulos...`);

    const allResults = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      details: [],
      byModule: {}
    };

    // Loop sobre módulos seleccionados
    for (const moduleKey of selectedModules) {
      console.log(`      📦 Módulo: ${moduleKey}`);

      try {
        const moduleResults = await executePlaywrightTestsForModule(testConfig, executionId, moduleKey);

        // Consolidar resultados
        allResults.total += moduleResults.total;
        allResults.passed += moduleResults.passed;
        allResults.failed += moduleResults.failed;
        allResults.warnings += moduleResults.warnings;
        allResults.details.push(...moduleResults.details.map(d => ({ ...d, module: moduleKey })));
        allResults.byModule[moduleKey] = moduleResults;

        console.log(`         ✅ ${moduleResults.passed}/${moduleResults.total} tests pasados`);
      } catch (err) {
        console.log(`         ❌ Error en módulo ${moduleKey}: ${err.message}`);
        allResults.byModule[moduleKey] = {
          total: 0,
          passed: 0,
          failed: 1,
          warnings: 0,
          details: [{
            name: `Error ejecutando tests para ${moduleKey}`,
            status: 'failed',
            duration: 0,
            error: err.message
          }]
        };
        allResults.failed++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`   ✅ Tests completados en ${duration}ms`);

    // 3. Obtener resultados de audit_logs (Brain Nervous System)
    const auditResults = await getAuditResults(executionId);
    console.log(`   ✅ ${auditResults.length} logs de auditoría encontrados`);

    // 4. Obtener sugerencias del Brain (si hay failures)
    const brainSuggestions = await getBrainSuggestions(auditResults);
    console.log(`   ✅ ${brainSuggestions.length} sugerencias del Brain generadas`);

    // 5. VERIFICACIÓN BRAIN: ¿Se arreglaron los problemas detectados?
    let brainVerification = null;
    if (brainIntegration) {
      brainVerification = await verifyFixesAgainstBrainIssues(selectedModules, auditResults);
      console.log(`   🧠 Verificación Brain: ${brainVerification.fixed}/${brainVerification.total} problemas arreglados`);
    }

    // 6. Preparar respuesta consolidada
    const response = {
      success: true,
      execution_id: executionId,
      duration_ms: duration,
      modules_tested: selectedModules.length,
      summary: {
        total: allResults.total,
        passed: allResults.passed,
        failed: allResults.failed,
        warnings: allResults.warnings
      },
      results: allResults.details,
      resultsByModule: allResults.byModule,
      brainSuggestions: brainSuggestions,
      brainVerification: brainVerification,
      auditLogs: auditResults
    };

    console.log('   ✅ Respuesta preparada - Enviando al frontend\n');
    res.json(response);

  } catch (err) {
    console.error('   ❌ Error ejecutando tests:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack
    });
  }
});

/**
 * Generar configuración de tests basada en selección del usuario
 */
function generateTestConfig(selectedTests) {
  const config = {
    enableChaos: false,
    enableBrainFeedback: false,
    enableDependencyMap: false,
    enableSSOTAnalysis: false,
    chaos: {
      monkey: false,
      fuzzing: false,
      raceConditions: false,
      stress: false
    },
    dependencies: {
      analyzeAllTabs: false,
      detectDynamic: false,
      generateGraph: false
    },
    ssot: {
      verifyWithDB: false,
      detectConflicts: false,
      registerInKB: false
    }
  };

  // Analizar qué grupos están seleccionados
  const groups = new Set(selectedTests.map(t => t.groupId));

  // Mapear selección a configuración
  if (groups.has('chaos-testing')) {
    config.enableChaos = true;

    selectedTests.forEach(t => {
      if (t.groupId === 'chaos-testing') {
        if (t.testId === 'chaos-monkey') config.chaos.monkey = true;
        if (t.testId === 'chaos-fuzzing') config.chaos.fuzzing = true;
        if (t.testId === 'chaos-xss') config.chaos.fuzzing = true;
        if (t.testId === 'chaos-sql') config.chaos.fuzzing = true;
        if (t.testId === 'chaos-race') config.chaos.raceConditions = true;
        if (t.testId === 'chaos-stress') config.chaos.stress = true;
      }
    });
  }

  if (groups.has('brain-feedback')) {
    config.enableBrainFeedback = true;
  }

  if (groups.has('dependency-mapping')) {
    config.enableDependencyMap = true;

    selectedTests.forEach(t => {
      if (t.groupId === 'dependency-mapping') {
        if (t.testId === 'dep-static-analysis') config.dependencies.analyzeAllTabs = true;
        if (t.testId === 'dep-dynamic-detection') config.dependencies.detectDynamic = true;
        if (t.testId === 'dep-generate-graph') config.dependencies.generateGraph = true;
      }
    });
  }

  if (groups.has('ssot-analysis')) {
    config.enableSSOTAnalysis = true;

    selectedTests.forEach(t => {
      if (t.groupId === 'ssot-analysis') {
        if (t.testId === 'ssot-verify-db') config.ssot.verifyWithDB = true;
        if (t.testId === 'ssot-detect-conflicts') config.ssot.detectConflicts = true;
        if (t.testId === 'ssot-register-kb') config.ssot.registerInKB = true;
      }
    });
  }

  return config;
}

/**
 * Ejecutar tests de Playwright con configuración dinámica
 */
async function executePlaywrightTests(config, executionId) {
  return new Promise((resolve, reject) => {
    // Crear archivo temporal con configuración
    const configEnv = `
TEST_CHAOS=${config.enableChaos}
TEST_BRAIN=${config.enableBrainFeedback}
TEST_DEPENDENCIES=${config.enableDependencyMap}
TEST_SSOT=${config.enableSSOTAnalysis}
EXECUTION_ID=${executionId}
    `.trim();

    const envFilePath = path.join(__dirname, '../../tests/e2e/.env.test');

    // Escribir .env temporal
    fs.writeFile(envFilePath, configEnv)
      .then(() => {
        console.log('      📝 Configuración .env.test creada');

        // Ejecutar Playwright
        const testPath = path.join(__dirname, '../../tests/e2e/modules/users-modal-advanced.e2e.spec.js');
        const cmd = `npx playwright test "${testPath}" --reporter=json`;

        console.log(`      🎭 Ejecutando: ${cmd}`);

        exec(cmd, {
          cwd: path.join(__dirname, '../../'),
          maxBuffer: 10 * 1024 * 1024, // 10 MB buffer
          env: { ...process.env, ...config }
        }, (error, stdout, stderr) => {
          // Limpiar .env temporal
          fs.unlink(envFilePath).catch(() => {});

          if (error && error.code !== 1) { // code 1 = tests failed (esperado)
            console.error('      ❌ Error ejecutando Playwright:', error);
            return reject(error);
          }

          // Parsear resultados JSON
          try {
            const jsonMatch = stdout.match(/\{[\s\S]*\}/);
            const results = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

            if (results && results.suites) {
              const summary = {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0,
                details: []
              };

              results.suites.forEach(suite => {
                suite.specs.forEach(spec => {
                  summary.total++;
                  const testResult = {
                    name: spec.title,
                    status: spec.ok ? 'passed' : 'failed',
                    duration: spec.tests[0]?.results[0]?.duration || 0,
                    error: spec.tests[0]?.results[0]?.error?.message || null
                  };

                  if (spec.ok) summary.passed++;
                  else summary.failed++;

                  summary.details.push(testResult);
                });
              });

              console.log(`      ✅ Tests: ${summary.passed}/${summary.total} pasados`);
              resolve(summary);
            } else {
              // Fallback si no hay JSON
              resolve({
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0,
                details: []
              });
            }
          } catch (err) {
            console.error('      ⚠️ Error parseando resultados:', err);
            resolve({
              total: 0,
              passed: 0,
              failed: 0,
              warnings: 0,
              details: []
            });
          }
        });
      })
      .catch(reject);
  });
}

/**
 * Obtener resultados de audit_logs (escritos por Brain Integration Helper)
 */
async function getAuditResults(executionId) {
  try {
    const query = `
      SELECT
        log_id,
        test_type,
        module_name,
        test_name,
        status,
        duration_ms,
        error_type,
        error_message,
        fix_strategy,
        fix_code_suggestion,
        confidence_score,
        created_at
      FROM audit_logs
      WHERE metadata->>'execution_id' = $1
         OR test_name LIKE '%Advanced%'
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query, [executionId]);
    return result.rows;
  } catch (err) {
    console.error('   ⚠️ Error obteniendo audit logs:', err);
    return [];
  }
}

/**
 * Obtener sugerencias del Brain basadas en failures
 */
async function getBrainSuggestions(auditResults) {
  const suggestions = [];

  // Agrupar por tipo de error
  const errorGroups = {};

  auditResults.forEach(log => {
    if (log.status === 'failed' || log.status === 'warning') {
      const errorType = log.error_type || 'UNKNOWN';

      if (!errorGroups[errorType]) {
        errorGroups[errorType] = {
          type: errorType,
          count: 0,
          examples: [],
          suggestedFixes: []
        };
      }

      errorGroups[errorType].count++;
      errorGroups[errorType].examples.push({
        test: log.test_name,
        message: log.error_message
      });

      if (log.fix_strategy) {
        errorGroups[errorType].suggestedFixes.push({
          strategy: log.fix_strategy,
          code: log.fix_code_suggestion,
          confidence: log.confidence_score
        });
      }
    }
  });

  // Generar sugerencias consolidadas
  Object.values(errorGroups).forEach(group => {
    suggestions.push({
      severity: group.count > 5 ? 'CRITICAL' : group.count > 2 ? 'HIGH' : 'MEDIUM',
      type: group.type,
      occurrences: group.count,
      pattern: `${group.type} detectado en ${group.count} tests`,
      recommendation: generateRecommendation(group),
      fixes: group.suggestedFixes.slice(0, 3), // Top 3 fixes
      examples: group.examples.slice(0, 3) // Top 3 ejemplos
    });
  });

  // Ordenar por severity
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  suggestions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return suggestions;
}

/**
 * Generar recomendación basada en pattern de error
 */
function generateRecommendation(errorGroup) {
  const type = errorGroup.type;

  const recommendations = {
    'E2E_TEST_FAILURE': 'Revisar la implementación del módulo users. Posibles problemas de timing o selectores incorrectos.',
    'XSS_VULNERABILITY': '⚠️ CRÍTICO: Se detectó que el sistema acepta código JavaScript malicioso. Implementar sanitización de inputs.',
    'SQL_INJECTION': '⚠️ CRÍTICO: Vulnerabilidad de SQL Injection detectada. Usar prepared statements en todas las queries.',
    'BUFFER_OVERFLOW': 'El sistema acepta strings muy largos que pueden causar overflow. Implementar validación de longitud máxima.',
    'RACE_CONDITION': 'Se detectaron condiciones de carrera. Implementar locks o transacciones en operaciones concurrentes.',
    'MEMORY_LEAK': 'Posible memory leak detectado en iteraciones múltiples. Revisar event listeners y closures.',
    'SSOT_CONFLICT': 'Conflicto en Single Source of Truth: el dato en UI no coincide con BD. Verificar flujo de sincronización.',
    'CIRCULAR_DEPENDENCY': 'Dependencia circular entre campos detectada. Esto puede causar loops infinitos. Rediseñar lógica de dependencias.',
    'UNKNOWN': 'Error no catalogado. Revisar logs completos para diagnóstico.'
  };

  return recommendations[type] || recommendations['UNKNOWN'];
}

/**
 * GET /api/testing/test-status/:executionId
 * Obtener estado de ejecución de tests
 */
router.get('/test-status/:executionId', async (req, res) => {
  const { executionId } = req.params;

  try {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'passed' THEN 1 END) as passed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'warning' THEN 1 END) as warnings
      FROM audit_logs
      WHERE metadata->>'execution_id' = $1
    `;

    const result = await pool.query(query, [executionId]);

    res.json({
      success: true,
      status: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * Ejecutar tests de Playwright para un módulo específico
 */
async function executePlaywrightTestsForModule(config, executionId, moduleKey) {
  return new Promise((resolve, reject) => {
    // Crear archivo temporal con configuración
    const configEnv = `
TEST_CHAOS=${config.enableChaos}
TEST_BRAIN=${config.enableBrainFeedback}
TEST_DEPENDENCIES=${config.enableDependencyMap}
TEST_SSOT=${config.enableSSOTAnalysis}
EXECUTION_ID=${executionId}
MODULE_TO_TEST=${moduleKey}
    `.trim();

    const envFilePath = path.join(__dirname, '../../tests/e2e/.env.test');

    // Escribir .env temporal
    fs.writeFile(envFilePath, configEnv)
      .then(() => {
        // Ejecutar test UNIVERSAL (se adapta al módulo)
        const testPath = path.join(__dirname, '../../tests/e2e/modules/universal-modal-advanced.e2e.spec.js');
        const cmd = `npx playwright test "${testPath}" --reporter=json`;

        exec(cmd, {
          cwd: path.join(__dirname, '../../'),
          maxBuffer: 10 * 1024 * 1024,
          env: { ...process.env, MODULE_TO_TEST: moduleKey }
        }, (error, stdout, stderr) => {
          // Limpiar .env temporal
          fs.unlink(envFilePath).catch(() => {});

          if (error && error.code !== 1) {
            return reject(error);
          }

          // Parsear resultados JSON
          try {
            const jsonMatch = stdout.match(/\{[\s\S]*\}/);
            const results = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

            if (results && results.suites) {
              const summary = {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0,
                details: []
              };

              results.suites.forEach(suite => {
                suite.specs.forEach(spec => {
                  summary.total++;
                  const testResult = {
                    name: spec.title,
                    status: spec.ok ? 'passed' : 'failed',
                    duration: spec.tests[0]?.results[0]?.duration || 0,
                    error: spec.tests[0]?.results[0]?.error?.message || null
                  };

                  if (spec.ok) summary.passed++;
                  else summary.failed++;

                  summary.details.push(testResult);
                });
              });

              resolve(summary);
            } else {
              resolve({ total: 0, passed: 0, failed: 0, warnings: 0, details: [] });
            }
          } catch (err) {
            resolve({ total: 0, passed: 0, failed: 0, warnings: 0, details: [] });
          }
        });
      })
      .catch(reject);
  });
}

/**
 * Verificar si los fixes coinciden con problemas detectados por Brain
 */
async function verifyFixesAgainstBrainIssues(selectedModules, auditResults) {
  console.log(`\n🧠 [BRAIN-VERIFY] Verificando fixes vs problemas detectados...`);

  try {
    // Obtener problemas que Brain detectó ANTES de los tests
    const query = `
      SELECT module_name, test_name, error_type, COUNT(*) as occurrences
      FROM audit_logs
      WHERE status = 'failed'
        AND module_name = ANY($1)
        AND created_at < NOW() - INTERVAL '1 hour'
      GROUP BY module_name, test_name, error_type
      ORDER BY occurrences DESC
    `;

    const result = await pool.query(query, [selectedModules]);
    const brainIssues = result.rows;

    // Comparar con resultados actuales
    const fixed = [];
    const notFixed = [];

    brainIssues.forEach(issue => {
      // Buscar si hay audit log reciente que indica que el problema se arregló
      const matchingLog = auditResults.find(log =>
        log.module_name === issue.module_name &&
        log.test_name === issue.test_name &&
        log.status === 'passed'
      );

      if (matchingLog) {
        fixed.push({
          module: issue.module_name,
          test: issue.test_name,
          errorType: issue.error_type,
          previousOccurrences: issue.occurrences
        });
      } else {
        notFixed.push({
          module: issue.module_name,
          test: issue.test_name,
          errorType: issue.error_type,
          occurrences: issue.occurrences
        });
      }
    });

    console.log(`   ✅ Arreglados: ${fixed.length}/${brainIssues.length}`);
    console.log(`   ❌ Pendientes: ${notFixed.length}/${brainIssues.length}`);

    return {
      total: brainIssues.length,
      fixed: fixed.length,
      notFixed: notFixed.length,
      fixedDetails: fixed,
      notFixedDetails: notFixed
    };
  } catch (err) {
    console.error(`   ⚠️  Error en verificación Brain: ${err.message}`);
    return { total: 0, fixed: 0, notFixed: 0, fixedDetails: [], notFixedDetails: [] };
  }
}

// ==================== NEW AI TESTING DASHBOARD ENDPOINTS ====================

/**
 * POST /api/testing/execute
 * Ejecutar test simple (basic, performance, security, database, crud, complete)
 */
router.post('/execute', async (req, res) => {
  try {
    const { testType, config } = req.body;

    console.log(`🤖 [AI-TESTING] Solicitud de ejecución: ${testType}`);

    // Validar tipo de test
    const validTypes = ['basic', 'performance', 'security', 'database', 'crud', 'complete'];
    if (!validTypes.includes(testType)) {
      return res.json({
        success: false,
        error: `Tipo de test inválido: ${testType}`
      });
    }

    // Para test básico, ejecutar el script de ISI modules
    if (testType === 'basic') {
      const { spawn } = require('child_process');
      const scriptPath = path.join(__dirname, '../../scripts/run-isi-modules-test.js');

      // Verificar que el script existe
      try {
        await fs.access(scriptPath);
      } catch (error) {
        return res.json({
          success: false,
          error: 'Script de test básico no encontrado'
        });
      }

      // Ejecutar script en background
      const child = spawn('node', [scriptPath], {
        detached: true,
        stdio: 'ignore',
        cwd: path.join(__dirname, '../..')
      });

      child.unref();

      console.log(`✅ [AI-TESTING] Test ${testType} iniciado con PID: ${child.pid}`);

      return res.json({
        success: true,
        message: `Test ${testType} iniciado correctamente`,
        testId: Date.now().toString(),
        pid: child.pid
      });
    }

    // Para otros tipos, retornar not implemented por ahora
    res.json({
      success: false,
      error: `Test tipo "${testType}" aún no implementado. Solo "basic" está disponible.`
    });

  } catch (error) {
    console.error('❌ [AI-TESTING] Error ejecutando test:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/testing/overview
 * Datos para el overview dashboard
 */
router.get('/overview', async (req, res) => {
  try {
    // Leer datos del último test ISI
    const isiResultsPath = path.join(__dirname, '../../isi-test-results.json');

    let testsToday = 1;
    let avgPassRate = 0;
    let modulesTested = 0;
    let currentTest = 'Ninguno';

    try {
      const data = await fs.readFile(isiResultsPath, 'utf-8');
      const results = JSON.parse(data);

      // Calcular métricas del último test
      const totalModules = results.results.length;
      const passedModules = results.results.filter(r => r.status === 'PASSED').length;
      avgPassRate = Math.round((passedModules / totalModules) * 100);
      modulesTested = passedModules;

    } catch (error) {
      console.log('ℹ️ [AI-TESTING] No hay resultados previos disponibles');
    }

    res.json({
      success: true,
      testsToday,
      avgPassRate,
      modulesTested,
      currentTest
    });

  } catch (error) {
    console.error('❌ [AI-TESTING] Error obteniendo overview:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/testing/history
 * Historial de tests ejecutados
 */
router.get('/history', async (req, res) => {
  try {
    // Leer resultados del último test ISI
    const isiResultsPath = path.join(__dirname, '../../isi-test-results.json');
    const history = [];

    try {
      const data = await fs.readFile(isiResultsPath, 'utf-8');
      const results = JSON.parse(data);

      // Crear entrada de historial del último test
      const totalModules = results.results.length;
      const passedModules = results.results.filter(r => r.status === 'PASSED').length;
      const passRate = Math.round((passedModules / totalModules) * 100);

      // Calcular duración en minutos
      const durationMin = Math.round((results.duration_seconds || 0) / 60);

      history.push({
        id: results.timestamp || Date.now().toString(),
        test_type: 'basic',
        status: passRate >= 95 ? 'passed' : (passRate >= 70 ? 'warning' : 'failed'),
        pass_rate: passRate,
        duration: `${durationMin} min`,
        created_at: new Date().toISOString(),
        modules_tested: totalModules,
        modules_passed: passedModules
      });

    } catch (error) {
      console.log('ℹ️ [AI-TESTING] No hay historial disponible');
    }

    res.json({
      success: true,
      history
    });

  } catch (error) {
    console.error('❌ [AI-TESTING] Error obteniendo historial:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/testing/tools-status
 * Estado de las herramientas de testing (Playwright, k6, OWASP ZAP, PostgreSQL)
 */
router.get('/tools-status', async (req, res) => {
  try {
    const { spawn } = require('child_process');

    // Check Playwright (siempre instalado en el proyecto)
    const playwrightInstalled = true;

    // Check k6
    let k6Installed = false;
    try {
      await new Promise((resolve, reject) => {
        const child = spawn('k6', ['version'], { shell: true });
        child.on('error', reject);
        child.on('exit', (code) => code === 0 ? resolve() : reject());
        setTimeout(reject, 2000); // Timeout 2s
      });
      k6Installed = true;
    } catch (error) {
      k6Installed = false;
    }

    // Check OWASP ZAP (via Docker)
    let owaspZapInstalled = false;
    try {
      await new Promise((resolve, reject) => {
        const child = spawn('docker', ['images', 'zaproxy/zap-stable', '-q'], { shell: true });
        let hasOutput = false;
        child.stdout.on('data', (data) => {
          if (data.toString().trim()) {
            hasOutput = true;
          }
        });
        child.on('exit', () => {
          hasOutput ? resolve() : reject();
        });
        setTimeout(reject, 2000); // Timeout 2s
      });
      owaspZapInstalled = true;
    } catch (error) {
      owaspZapInstalled = false;
    }

    // Check PostgreSQL (asumimos que está si el servidor está corriendo)
    const postgresqlInstalled = true;

    res.json({
      success: true,
      playwright: playwrightInstalled,
      k6: k6Installed,
      owasp_zap: owaspZapInstalled,
      postgresql: postgresqlInstalled
    });

  } catch (error) {
    console.error('❌ [AI-TESTING] Error verificando herramientas:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
