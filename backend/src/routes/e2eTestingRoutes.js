/**
 * ═══════════════════════════════════════════════════════════
 * E2E TESTING API - Endpoints para panel de control E2E
 * ═══════════════════════════════════════════════════════════
 *
 * Sirve datos de audit_test_logs en tiempo real para el dashboard
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');

/**
 * GET /api/e2e-testing/live-stats
 * Estadísticas en tiempo real de tests E2E
 */
router.get('/live-stats', async (req, res) => {
  try {
    const { limit = 100, minutes = 60 } = req.query;

    // Query: Últimos tests ejecutados
    const query = `
      SELECT
        module_name,
        test_name,
        status,
        duration_ms,
        error_type,
        error_message,
        created_at,
        execution_id
      FROM audit_test_logs
      WHERE test_type = 'e2e'
        AND created_at > NOW() - INTERVAL '${parseInt(minutes)} minutes'
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit)}
    `;

    const [results] = await sequelize.query(query);

    // Calcular métricas
    const stats = {
      totalTests: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      warnings: results.filter(r => r.status === 'warning').length,
      avgDuration: results.length > 0
        ? Math.round(results.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / results.length)
        : 0,
      successRate: results.length > 0
        ? Math.round((results.filter(r => r.status === 'passed').length / results.length) * 100)
        : 0,
      byModule: {}
    };

    // Agrupar por módulo
    results.forEach(result => {
      if (!stats.byModule[result.module_name]) {
        stats.byModule[result.module_name] = {
          total: 0,
          passed: 0,
          failed: 0,
          avgDuration: 0
        };
      }

      stats.byModule[result.module_name].total++;
      if (result.status === 'passed') stats.byModule[result.module_name].passed++;
      if (result.status === 'failed') stats.byModule[result.module_name].failed++;
    });

    res.json({
      success: true,
      data: {
        stats,
        recentTests: results.slice(0, 20), // Top 20 más recientes
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [E2E-API] Error obteniendo live stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/e2e-testing/modules-status
 * Estado de todos los módulos testeados
 */
router.get('/modules-status', async (req, res) => {
  try {
    const query = `
      SELECT
        module_name,
        COUNT(*) as total_tests,
        COUNT(*) FILTER (WHERE status = 'passed') as passed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'warning') as warnings,
        ROUND(AVG(duration_ms)) as avg_duration_ms,
        MAX(created_at) as last_test_at
      FROM audit_test_logs
      WHERE test_type = 'e2e'
        AND created_at > NOW() - INTERVAL '24 hours'
      GROUP BY module_name
      ORDER BY last_test_at DESC
    `;

    const [results] = await sequelize.query(query);

    const modules = results.map(row => ({
      moduleName: row.module_name,
      totalTests: parseInt(row.total_tests),
      passed: parseInt(row.passed),
      failed: parseInt(row.failed),
      warnings: parseInt(row.warnings),
      successRate: row.total_tests > 0
        ? Math.round((row.passed / row.total_tests) * 100)
        : 0,
      avgDuration: Math.round(row.avg_duration_ms),
      lastTestAt: row.last_test_at,
      status: row.failed > 0 ? 'failed' : row.warnings > 0 ? 'warning' : 'passed'
    }));

    res.json({
      success: true,
      data: {
        totalModules: modules.length,
        modules,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [E2E-API] Error obteniendo modules status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/e2e-testing/execution/:executionId
 * Detalles de una ejecución específica
 */
router.get('/execution/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;

    const query = `
      SELECT *
      FROM audit_test_logs
      WHERE execution_id = $1
      ORDER BY created_at ASC
    `;

    const [results] = await sequelize.query(query, {
      bind: [executionId]
    });

    res.json({
      success: true,
      data: {
        executionId,
        totalTests: results.length,
        tests: results,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [E2E-API] Error obteniendo execution:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
