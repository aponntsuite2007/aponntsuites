/**
 * ═══════════════════════════════════════════════════════════
 * PHASE 4: AUTONOMOUS REPAIR + TECHNICAL REPORTS
 * ═══════════════════════════════════════════════════════════
 *
 * Endpoints que integran:
 * - AutonomousRepairAgent: Ciclo completo de auto-reparación
 * - TechnicalReportGenerator: Reportes detallados con 7 secciones
 * - OllamaAnalyzer: Análisis inteligente con fallback pattern-based
 * - TicketGenerator: Generación de tickets para Claude Code
 *
 * @version 1.0.0
 * @date 2025-10-29
 * ═══════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Middleware de autenticación (solo admins)
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Solo administradores pueden acceder al auditor'
    });
  }
  next();
};

module.exports = (database) => {
  // Lazy-load de componentes Phase 4
  let autonomousRepairAgent = null;
  let technicalReportGenerator = null;

  async function getPhase4Components() {
    if (!autonomousRepairAgent) {
      console.log('🔧 [PHASE4] Inicializando componentes...');

      const SystemRegistry = require('../auditor/registry/SystemRegistry');
      const IntelligentTestingOrchestrator = require('../auditor/core/IntelligentTestingOrchestrator');
      const AutonomousRepairAgent = require('../auditor/core/AutonomousRepairAgent');
      const TechnicalReportGenerator = require('../auditor/reporters/TechnicalReportGenerator');

      const systemRegistry = new SystemRegistry(database);
      await systemRegistry.initialize();

      const orchestrator = new IntelligentTestingOrchestrator(database, systemRegistry);
      autonomousRepairAgent = new AutonomousRepairAgent(database, systemRegistry, orchestrator);
      technicalReportGenerator = new TechnicalReportGenerator(database, systemRegistry);

      console.log('✅ [PHASE4] Componentes inicializados');
      console.log('   🤖 AutonomousRepairAgent: OK');
      console.log('   📊 TechnicalReportGenerator: OK');
    }

    return { autonomousRepairAgent, technicalReportGenerator };
  }

  // ═══════════════════════════════════════════════════════════
  // POST /api/audit/test/deep-with-report
  // ═══════════════════════════════════════════════════════════

  /**
   * Test profundo con auto-reparación y reporte técnico detallado
   *
   * Body:
   * {
   *   "moduleKey": "users" (opcional - si no se pasa, testea todos los módulos),
   *   "maxRetries": 2,
   *   "autoApprove": true,
   *   "includeComparison": true
   * }
   *
   * Features:
   * - Test profundo con IntelligentTestingOrchestrator
   * - Auto-reparación con AutonomousRepairAgent
   * - Análisis con OllamaAnalyzer + Pattern-based fallback
   * - Generación de tickets para Claude Code
   * - Reporte técnico con 7 secciones + numeración + timestamps
   * - Comparación con ejecuciones anteriores
   * - Aprendizaje en Knowledge Base
   */
  router.post('/test/deep-with-report', auth, requireAdmin, async (req, res) => {
    try {
      const { autonomousRepairAgent, technicalReportGenerator } = await getPhase4Components();

      const {
        moduleKey = null,
        maxRetries = 2,
        autoApprove = true,
        includeComparison = true
      } = req.body;

      const companyId = req.user?.company_id || 11;
      const execution_id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log('🔬 [DEEP-TEST] Iniciando test profundo con auto-repair y reporte técnico...');
      console.log(`   📊 Execution ID: ${execution_id}`);
      console.log(`   📊 Módulo: ${moduleKey || 'TODOS'}`);
      console.log(`   🔄 Max retries: ${maxRetries}`);
      console.log(`   🤖 Auto-approve: ${autoApprove}`);
      console.log(`   🏢 Company ID: ${companyId}`);

      // Ejecutar en background
      (async () => {
        try {
          // PASO 1: Ejecutar test profundo usando orchestrator directamente
          console.log('📋 [DEEP-TEST] Paso 1/3: Ejecutando tests...');

          const orchestrator = autonomousRepairAgent.orchestrator;
          await orchestrator.autoRegisterCollectors();

          const modulesToTest = moduleKey ? [moduleKey] : ['users', 'reports', 'departments', 'shifts', 'biometric-devices', 'medical-dashboard', 'kiosks'];

          const testResult = await orchestrator.runSelectiveTest(companyId, modulesToTest, {
            parallel: false,
            maxRetries: 1,
            continueOnError: true
          });

          console.log(`✅ [DEEP-TEST] Tests completados: ${testResult.passed} passed, ${testResult.failed} failed`);

          // PASO 2: Auto-reparación si hay fallos
          let repairResult = null;
          const failedTests = testResult.failed || 0;

          if (failedTests > 0) {
            console.log(`🔧 [DEEP-TEST] Paso 2/3: Reparando ${failedTests} tests fallidos...`);

            repairResult = await autonomousRepairAgent.runAutoRepairCycle(execution_id, {
              maxRetries,
              autoApprove,
              notifyOnComplete: true
            });

            console.log(`✅ [DEEP-TEST] Auto-reparación completada: ${repairResult.repairs_successful}/${repairResult.repairs_attempted}`);
          } else {
            console.log('✅ [DEEP-TEST] No hay tests fallidos, saltando auto-reparación');
          }

          // PASO 3: Generar reporte técnico
          console.log('📊 [DEEP-TEST] Paso 3/3: Generando reporte técnico detallado...');

          const report = await technicalReportGenerator.generateTechnicalReport(execution_id, {
            includeComparison,
            includeKnowledge: true,
            includeMetrics: true,
            format: 'markdown'
          });

          console.log(`✅ [DEEP-TEST] Reporte generado: ${report.filename}`);
          console.log(`   📄 Path: ${report.path}`);

          // Emitir evento final vía WebSocket
          const io = req.app.get('io');
          if (io) {
            io.emit('deep-test-complete', {
              execution_id,
              report_file: report.filename,
              report_path: report.path,
              test_summary: testResult,
              repair_summary: repairResult
            });
          }

        } catch (error) {
          console.error('❌ [DEEP-TEST] Error en ejecución:', error);
          const io = req.app.get('io');
          if (io) {
            io.emit('deep-test-error', {
              execution_id,
              error: error.message,
              stack: error.stack
            });
          }
        }
      })();

      // Respuesta inmediata al cliente
      res.json({
        success: true,
        test_type: 'deep-with-report',
        message: 'Test profundo iniciado - Incluye auto-reparación y reporte técnico detallado',
        execution_id,
        status: 'running',
        features: [
          'Test profundo con IntelligentTestingOrchestrator',
          'Auto-reparación con AutonomousRepairAgent',
          'Análisis con OllamaAnalyzer + Pattern-based fallback',
          'Generación de tickets para Claude Code',
          'Reporte técnico con 7 secciones + numeración + timestamps',
          'Comparación con ejecuciones anteriores',
          'Aprendizaje en Knowledge Base'
        ],
        endpoints: {
          check_status: `/api/audit/executions/${execution_id}`,
          download_report: `/api/audit/phase4/reports/${execution_id}`
        }
      });

    } catch (error) {
      console.error('❌ [DEEP-TEST] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/audit/phase4/auto-repair/:execution_id
  // ═══════════════════════════════════════════════════════════

  /**
   * Trigger manual de auto-reparación para una ejecución existente
   */
  router.post('/auto-repair/:execution_id', auth, requireAdmin, async (req, res) => {
    try {
      const { autonomousRepairAgent } = await getPhase4Components();
      const { execution_id } = req.params;
      const { maxRetries = 2, autoApprove = true } = req.body;

      console.log(`🔧 [AUTO-REPAIR] Iniciando reparación manual para execution_id: ${execution_id}`);

      // Ejecutar en background
      autonomousRepairAgent.runAutoRepairCycle(execution_id, {
        maxRetries,
        autoApprove,
        notifyOnComplete: true
      })
        .then(result => {
          console.log(`✅ [AUTO-REPAIR] Reparación completada: ${result.repairs_successful}/${result.repairs_attempted}`);

          const io = req.app.get('io');
          if (io) {
            io.emit('auto-repair-complete', { execution_id, result });
          }
        })
        .catch(error => {
          console.error('❌ [AUTO-REPAIR] Error:', error);
        });

      res.json({
        success: true,
        message: 'Auto-reparación iniciada',
        execution_id,
        config: {
          max_retries: maxRetries,
          auto_approve: autoApprove
        }
      });

    } catch (error) {
      console.error('❌ [AUTO-REPAIR] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/audit/phase4/reports/:execution_id
  // ═══════════════════════════════════════════════════════════

  /**
   * Descargar reporte técnico de una ejecución
   *
   * Query params:
   * - format: markdown | json | html (default: markdown)
   */
  router.get('/reports/:execution_id', auth, requireAdmin, async (req, res) => {
    try {
      const { execution_id } = req.params;
      const format = req.query.format || 'markdown'; // markdown, json, html

      const fs = require('fs').promises;
      const path = require('path');

      const reportsDir = path.join(__dirname, '../auditor/reports');
      const filename = `technical-report-${execution_id}.${format === 'markdown' ? 'md' : format}`;
      const filePath = path.join(reportsDir, filename);

      // Verificar si existe el reporte
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({
          success: false,
          error: `Reporte no encontrado para execution_id: ${execution_id}`,
          suggestion: 'Ejecute un test con /api/audit/phase4/test/deep-with-report primero',
          available_reports_endpoint: '/api/audit/phase4/reports'
        });
      }

      // Leer reporte
      const reportContent = await fs.readFile(filePath, 'utf-8');

      // Si el cliente quiere JSON, parsear
      if (format === 'json') {
        return res.json({
          success: true,
          execution_id,
          report: JSON.parse(reportContent)
        });
      }

      // Si es markdown o HTML, retornar como texto
      res.setHeader('Content-Type', format === 'html' ? 'text/html' : 'text/markdown');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.send(reportContent);

    } catch (error) {
      console.error('❌ [REPORTS] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/audit/phase4/reports
  // ═══════════════════════════════════════════════════════════

  /**
   * Listar todos los reportes técnicos disponibles
   */
  router.get('/reports', auth, requireAdmin, async (req, res) => {
    try {
      const fs = require('fs').promises;
      const path = require('path');

      const reportsDir = path.join(__dirname, '../auditor/reports');

      // Crear directorio si no existe
      try {
        await fs.access(reportsDir);
      } catch {
        await fs.mkdir(reportsDir, { recursive: true });
      }

      // Leer directorio
      const files = await fs.readdir(reportsDir);

      // Filtrar solo reportes técnicos
      const reports = files
        .filter(f => f.startsWith('technical-report-'))
        .map(f => {
          const match = f.match(/technical-report-([a-f0-9-]+)\.(md|json|html)/);
          return match ? {
            filename: f,
            execution_id: match[1],
            format: match[2],
            path: path.join(reportsDir, f)
          } : null;
        })
        .filter(Boolean);

      // Obtener stats de cada archivo
      const reportsWithStats = await Promise.all(
        reports.map(async (report) => {
          try {
            const stats = await fs.stat(report.path);
            return {
              ...report,
              size: stats.size,
              size_human: `${(stats.size / 1024).toFixed(2)} KB`,
              created_at: stats.birthtime,
              modified_at: stats.mtime,
              download_url: `/api/audit/phase4/reports/${report.execution_id}?format=${report.format}`
            };
          } catch {
            return null;
          }
        })
      );

      // Filtrar nulls y ordenar por fecha de modificación
      const validReports = reportsWithStats.filter(Boolean);
      validReports.sort((a, b) => b.modified_at - a.modified_at);

      res.json({
        success: true,
        total: validReports.length,
        reports: validReports,
        usage: {
          download_report: 'GET /api/audit/phase4/reports/:execution_id?format=markdown|json|html',
          generate_new_report: 'POST /api/audit/phase4/test/deep-with-report'
        }
      });

    } catch (error) {
      console.error('❌ [REPORTS] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // 🤖 AI TESTING ENGINE - TERCERA OLA (2025-12-20)
  // ═══════════════════════════════════════════════════════════

  let aiTestingEngine = null;

  async function getAITestingEngine() {
    if (!aiTestingEngine) {
      console.log('🤖 [AI-TEST] Inicializando AI Testing Engine...');
      const AITestingEngine = require('../auditor/ai/AITestingEngine');
      aiTestingEngine = new AITestingEngine({
        database,
        baseUrl: process.env.BASE_URL || 'http://localhost:9998',
        ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        ollamaModel: process.env.OLLAMA_MODEL || 'llama3.1:8b',
        headless: true
      });
      console.log('✅ [AI-TEST] AI Testing Engine listo');
    }
    return aiTestingEngine;
  }

  // ═══════════════════════════════════════════════════════════
  // POST /api/audit/phase4/ai-test
  // ═══════════════════════════════════════════════════════════

  /**
   * Ejecutar test en LENGUAJE NATURAL con auto-reparación
   *
   * Body:
   * {
   *   "test": "Quiero verificar que puedo crear un usuario nuevo con email y password",
   *   "module": "users" (opcional - para contexto),
   *   "maxRetries": 3 (opcional, default 3)
   * }
   *
   * Features:
   * - Interpreta descripción en español/inglés con Ollama
   * - Auto-genera pasos de test
   * - Self-healing: si falla, intenta reparar hasta 3 veces
   * - Aprende patrones exitosos para futuros tests
   * - Alimenta Knowledge Base del Asistente IA
   */
  router.post('/ai-test', auth, requireAdmin, async (req, res) => {
    try {
      const engine = await getAITestingEngine();
      const { test, module, maxRetries = 3 } = req.body;

      if (!test || test.trim().length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Debe proporcionar una descripción del test (mínimo 10 caracteres)',
          example: 'Quiero verificar que puedo crear un usuario con nombre, email y contraseña'
        });
      }

      const companyId = req.user?.company_id || 11;
      const testId = `ai-test-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      console.log('🤖 [AI-TEST] Iniciando test en lenguaje natural...');
      console.log(`   📝 Test: "${test.substring(0, 80)}..."`);
      console.log(`   🎯 Módulo: ${module || 'auto-detect'}`);
      console.log(`   🔄 Max retries: ${maxRetries}`);

      // Ejecutar en background para respuesta rápida
      (async () => {
        try {
          const result = await engine.runNaturalLanguageTest(test, {
            module,
            companyId,
            testId,
            maxRetries
          });

          console.log(`✅ [AI-TEST] Test completado: ${result.status}`);

          // Emitir resultado via WebSocket
          const io = req.app.get('io');
          if (io) {
            io.emit('ai-test-complete', {
              testId,
              result,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('❌ [AI-TEST] Error:', error);
          const io = req.app.get('io');
          if (io) {
            io.emit('ai-test-error', {
              testId,
              error: error.message,
              stack: error.stack
            });
          }
        }
      })();

      res.json({
        success: true,
        message: 'Test en lenguaje natural iniciado',
        testId,
        description: test,
        module: module || 'auto-detect',
        status: 'running',
        features: [
          '🧠 Interpretación con Ollama/Llama 3.1',
          '🔧 Self-healing (auto-reparación hasta 3 intentos)',
          '📚 Enriquecido con Brain del ecosistema',
          '💡 Aprendizaje de patrones exitosos',
          '🤖 Alimenta Knowledge Base del Asistente'
        ],
        checkStatus: `/api/audit/phase4/ai-test/${testId}`
      });

    } catch (error) {
      console.error('❌ [AI-TEST] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/audit/phase4/ai-test/patterns
  // ═══════════════════════════════════════════════════════════

  /**
   * Obtener patrones aprendidos por el AI Testing Engine
   * Muestra qué ha aprendido de tests anteriores
   */
  router.get('/ai-test/patterns', auth, requireAdmin, async (req, res) => {
    try {
      const engine = await getAITestingEngine();
      const patterns = engine.getLearnedPatterns();

      res.json({
        success: true,
        totalPatterns: patterns.length,
        patterns: patterns.slice(0, 50), // Limitar respuesta
        usage: {
          description: 'Patrones aprendidos de tests exitosos',
          benefit: 'El engine usa estos patrones para mejorar tests futuros'
        }
      });

    } catch (error) {
      console.error('❌ [AI-TEST] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/audit/phase4/ai-test/history
  // ═══════════════════════════════════════════════════════════

  /**
   * Historial de tests ejecutados con AI Testing Engine
   */
  router.get('/ai-test/history', auth, requireAdmin, async (req, res) => {
    try {
      const engine = await getAITestingEngine();
      const history = engine.getTestHistory();
      const limit = parseInt(req.query.limit) || 20;

      res.json({
        success: true,
        total: history.length,
        tests: history.slice(0, limit).map(t => ({
          testId: t.testId,
          description: t.description,
          status: t.status,
          attempts: t.attempts,
          healingApplied: t.healingApplied,
          duration: t.duration,
          timestamp: t.timestamp
        }))
      });

    } catch (error) {
      console.error('❌ [AI-TEST] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/audit/phase4/ai-test/batch
  // ═══════════════════════════════════════════════════════════

  /**
   * Ejecutar múltiples tests en lenguaje natural (batch)
   *
   * Body:
   * {
   *   "tests": [
   *     "Verificar que puedo crear un departamento",
   *     "Verificar que puedo asignar un empleado a un departamento",
   *     "Verificar que el dashboard muestra el contador de empleados correcto"
   *   ],
   *   "module": "departments"
   * }
   */
  router.post('/ai-test/batch', auth, requireAdmin, async (req, res) => {
    try {
      const engine = await getAITestingEngine();
      const { tests, module } = req.body;

      if (!tests || !Array.isArray(tests) || tests.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Debe proporcionar un array de tests',
          example: {
            tests: [
              'Verificar login con credenciales correctas',
              'Verificar que el dashboard carga correctamente'
            ]
          }
        });
      }

      const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const companyId = req.user?.company_id || 11;

      console.log(`🤖 [AI-TEST-BATCH] Iniciando batch de ${tests.length} tests...`);

      // Ejecutar batch en background
      (async () => {
        const results = [];
        for (let i = 0; i < tests.length; i++) {
          console.log(`   [${i + 1}/${tests.length}] ${tests[i].substring(0, 50)}...`);
          try {
            const result = await engine.runNaturalLanguageTest(tests[i], {
              module,
              companyId,
              testId: `${batchId}-${i}`
            });
            results.push({ test: tests[i], ...result });
          } catch (error) {
            results.push({ test: tests[i], status: 'error', error: error.message });
          }
        }

        const io = req.app.get('io');
        if (io) {
          io.emit('ai-test-batch-complete', {
            batchId,
            total: tests.length,
            passed: results.filter(r => r.status === 'passed').length,
            failed: results.filter(r => r.status === 'failed').length,
            results
          });
        }
      })();

      res.json({
        success: true,
        message: `Batch de ${tests.length} tests iniciado`,
        batchId,
        testsCount: tests.length,
        status: 'running'
      });

    } catch (error) {
      console.error('❌ [AI-TEST-BATCH] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/audit/phase4/ui-discovery
  // ═══════════════════════════════════════════════════════════

  /**
   * Descubrir elementos UI de una URL (2025-12-20)
   * Usa UIElementDiscoveryEngine para escaneo REAL
   *
   * Body:
   * {
   *   "url": "/panel-empresa.html" (opcional, default: página actual)
   * }
   */
  router.post('/ui-discovery', auth, requireAdmin, async (req, res) => {
    try {
      const { url } = req.body;

      const UIElementDiscoveryEngine = require('../auditor/collectors/UIElementDiscoveryEngine');

      const engine = new UIElementDiscoveryEngine({
        baseUrl: process.env.BASE_URL || 'http://localhost:9998',
        database: database,
        headless: true
      });

      console.log('🔍 [UI-DISCOVERY] Iniciando descubrimiento...');

      await engine.start();

      if (url) {
        await engine.navigateTo(url);
      }

      const discovery = await engine.discoverAllElements();

      await engine.stop();

      res.json({
        success: true,
        discovery: discovery.summary,
        elements: {
          buttons: discovery.elements.buttons.slice(0, 20), // Limitar para respuesta
          inputs: discovery.elements.inputs.slice(0, 20),
          dynamicData: discovery.elements.dynamicData.slice(0, 20)
        },
        fullUrl: discovery.url,
        timestamp: discovery.timestamp
      });

    } catch (error) {
      console.error('❌ [UI-DISCOVERY] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};
