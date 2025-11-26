/**
 * ============================================================================
 * API: DATABASE SCHEMA - Para coordinar múltiples sesiones de Claude Code
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const DatabaseAnalyzer = require('../services/DatabaseAnalyzer');

const metadataPath = path.join(__dirname, '../../engineering-metadata.js');

/**
 * GET /api/database-schema/all
 * Retorna schema completo con análisis de dependencias
 */
router.get('/all', async (req, res) => {
  try {
    delete require.cache[require.resolve(metadataPath)];
    const metadata = require(metadataPath);

    if (!metadata.database) {
      return res.json({
        success: false,
        error: 'No hay análisis disponible. Ejecutar: node scripts/run-database-analysis.js'
      });
    }

    res.json({
      success: true,
      database: metadata.database
    });

  } catch (error) {
    console.error('❌ Error al obtener schema:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/database-schema/table/:tableName
 * Retorna análisis de una tabla específica
 */
router.get('/table/:tableName', async (req, res) => {
  try {
    delete require.cache[require.resolve(metadataPath)];
    const metadata = require(metadataPath);

    if (!metadata.database) {
      return res.json({
        success: false,
        error: 'No hay análisis disponible.'
      });
    }

    const { tableName } = req.params;
    const table = metadata.database.schema[tableName];

    if (!table) {
      return res.status(404).json({
        success: false,
        error: `Tabla ${tableName} no encontrada`
      });
    }

    res.json({
      success: true,
      table
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/database-schema/field-usage/:tableName/:fieldName
 * Verifica si es seguro modificar un campo
 */
router.get('/field-usage/:tableName/:fieldName', async (req, res) => {
  try {
    const { tableName, fieldName } = req.params;

    const safety = await DatabaseAnalyzer.isSafeToModify(tableName, fieldName);

    res.json({
      success: true,
      safety
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/database-schema/dependencies
 * Retorna todas las dependencias cruzadas
 */
router.get('/dependencies', async (req, res) => {
  try {
    delete require.cache[require.resolve(metadataPath)];
    const metadata = require(metadataPath);

    if (!metadata.database) {
      return res.json({
        success: false,
        error: 'No hay análisis disponible.'
      });
    }

    res.json({
      success: true,
      dependencies: metadata.database.dependencies
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/database-schema/rules
 * Retorna reglas de modificación segura
 */
router.get('/rules', async (req, res) => {
  try {
    delete require.cache[require.resolve(metadataPath)];
    const metadata = require(metadataPath);

    if (!metadata.database) {
      return res.json({
        success: false,
        error: 'No hay análisis disponible.'
      });
    }

    res.json({
      success: true,
      rules: metadata.database.modificationRules,
      statistics: metadata.database.statistics
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/database-schema/run-analysis
 * Ejecuta análisis completo del schema
 */
router.post('/run-analysis', async (req, res) => {
  try {
    console.log('🔍 Ejecutando análisis de base de datos...');

    const result = await DatabaseAnalyzer.analyzeCompleteSchema();

    res.json({
      success: true,
      message: 'Análisis completado',
      statistics: {
        totalTables: result.totalTables,
        totalFields: result.totalFields,
        crossDependencies: Object.keys(result.dependencies).length,
        safetyRules: result.modificationRules.length
      }
    });

  } catch (error) {
    console.error('❌ Error en análisis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
