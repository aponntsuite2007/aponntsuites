// 🐘 API POSTGRESQL PARTICIONADO PROFESIONAL
// ==========================================

const express = require('express');
const router = express.Router();
const partitioningService = require('../services/postgresql-partitioning-service');

// 🚀 ENDPOINT PARA IMPLEMENTAR PARTICIONADO DEFINITIVO
router.post('/implement', async (req, res) => {
  try {
    console.log('🔧 [PARTITIONING-API] Iniciando implementación definitiva...');

    const result = await partitioningService.implementPartitioning();

    res.json({
      success: true,
      message: 'PostgreSQL particionado profesional implementado exitosamente',
      data: {
        partitionsCreated: result.partitionsCreated,
        timestamp: new Date().toISOString(),
        details: {
          tablesPartitioned: ['biometric_scans', 'biometric_alerts', 'biometric_templates'],
          partitionsPerTable: 16,
          totalPartitions: result.partitionsCreated,
          indexesCreated: result.partitionsCreated * 3,
          viewsCreated: 2,
          functionsCreated: 2
        }
      }
    });

  } catch (error) {
    console.error('❌ [PARTITIONING-API] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error implementando particionado',
      details: error.message
    });
  }
});

// 📊 ENDPOINT PARA OBTENER ESTADÍSTICAS DEL SISTEMA
router.get('/stats', async (req, res) => {
  try {
    const stats = await partitioningService.getSystemStats();

    res.json({
      success: true,
      data: {
        totalPartitions: stats.totalPartitions,
        isPartitioned: stats.isPartitioned,
        partitions: stats.partitions,
        views: stats.views,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [PARTITIONING-STATS] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas',
      details: error.message
    });
  }
});

// 🎯 ENDPOINT PARA EJECUTAR TESTS DE RENDIMIENTO
router.post('/test-performance', async (req, res) => {
  try {
    console.log('🎯 [PARTITIONING-TEST] Ejecutando tests de rendimiento...');

    const tests = await partitioningService.runPerformanceTests();

    res.json({
      success: true,
      message: 'Tests de rendimiento ejecutados exitosamente',
      data: {
        tests: tests,
        timestamp: new Date().toISOString(),
        summary: {
          totalTests: tests.length,
          passed: tests.filter(t => t.status === 'PASS' || t.status === 'OPERATIONAL').length,
          averageExecutionTime: tests.reduce((sum, t) => sum + parseInt(t.execution_time_ms), 0) / tests.length
        }
      }
    });

  } catch (error) {
    console.error('❌ [PARTITIONING-TEST] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error ejecutando tests',
      details: error.message
    });
  }
});

// 🩺 ENDPOINT PARA HEALTH CHECK
router.get('/health', async (req, res) => {
  try {
    const health = await partitioningService.healthCheck();

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error en health check',
      details: error.message
    });
  }
});

// 📈 ENDPOINT PARA ANÁLISIS DE RENDIMIENTO POR EMPRESA
router.get('/performance/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    // 🔐 SEGURIDAD: Usar parámetros bind para prevenir SQL injection
    const numericCompanyId = parseInt(companyId);
    if (isNaN(numericCompanyId) || numericCompanyId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'companyId debe ser un número válido mayor a 0'
      });
    }

    const performanceQuery = `SELECT * FROM analyze_company_biometric_performance($1)`;
    const [results] = await require('../config/database').sequelize.query(performanceQuery, {
      bind: [numericCompanyId]
    });

    res.json({
      success: true,
      data: {
        companyId: numericCompanyId,
        performance: results[0] || null,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [PERFORMANCE-ANALYSIS] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error analizando rendimiento',
      details: error.message
    });
  }
});

// 🧹 ENDPOINT PARA LIMPIAR DATOS ANTIGUOS
router.post('/cleanup', async (req, res) => {
  try {
    console.log('🧹 [PARTITIONING-CLEANUP] Ejecutando limpieza de datos antiguos...');

    const cleanupQuery = 'SELECT cleanup_old_biometric_data()';
    const [results] = await require('../config/database').sequelize.query(cleanupQuery);

    const deletedCount = results[0].cleanup_old_biometric_data;

    res.json({
      success: true,
      message: 'Limpieza de datos ejecutada exitosamente',
      data: {
        deletedRecords: deletedCount,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [PARTITIONING-CLEANUP] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error ejecutando limpieza',
      details: error.message
    });
  }
});

// 📊 ENDPOINT PARA DASHBOARD DE BIOMÉTRICAS
router.get('/dashboard', async (req, res) => {
  try {
    const dashboardQuery = 'SELECT * FROM v_biometric_dashboard ORDER BY company_id';
    const [results] = await require('../config/database').sequelize.query(dashboardQuery);

    res.json({
      success: true,
      data: {
        companies: results,
        timestamp: new Date().toISOString(),
        summary: {
          totalCompanies: results.length,
          totalScansToday: results.reduce((sum, c) => sum + parseInt(c.total_scans_today || 0), 0),
          averageQuality: results.reduce((sum, c) => sum + parseFloat(c.avg_quality || 0), 0) / results.length
        }
      }
    });

  } catch (error) {
    console.error('❌ [DASHBOARD] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo dashboard',
      details: error.message
    });
  }
});

module.exports = router;