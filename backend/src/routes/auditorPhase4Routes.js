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

  return router;
};
