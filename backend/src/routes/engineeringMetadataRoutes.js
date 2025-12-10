/**
 * ============================================================================
 * ENGINEERING METADATA ROUTES - 100% VIVO, 0% HARDCODED
 * ============================================================================
 *
 * Endpoints para obtener metadata de ingeniería generada en tiempo real
 * desde el código introspectivo (EcosystemBrainService).
 *
 * PRINCIPIO: Toda la información se escanea en vivo del código real.
 * NO hay datos hardcodeados ni estáticos.
 *
 * @version 2.0.0-live
 * @date 2025-12-10
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const EcosystemBrainService = require('../services/EcosystemBrainService');
const database = require('../config/database');

// Inicializar Brain Service
const brainService = new EcosystemBrainService(database.sequelize);

/**
 * GET /api/engineering/live-metadata
 * Obtener metadata completa de ingeniería 100% viva
 * Escanea TODOS los módulos del código en tiempo real
 */
router.get('/live-metadata', async (req, res) => {
    console.log('\n🚀 [API] Solicitando engineering metadata viva...');

    try {
        const metadata = await brainService.generateFullEngineeringMetadata();

        res.json({
            success: true,
            data: metadata,
            message: `Metadata generada exitosamente para ${Object.keys(metadata.modules).length} módulos`
        });

    } catch (error) {
        console.error('❌ [API] Error generando live metadata:', error);

        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error generando engineering metadata en vivo'
        });
    }
});

/**
 * GET /api/engineering/live-metadata/:moduleName
 * Obtener metadata viva de un módulo específico
 */
router.get('/live-metadata/:moduleName', async (req, res) => {
    const { moduleName } = req.params;

    console.log(`\n🔍 [API] Solicitando metadata viva de "${moduleName}"...`);

    try {
        const metadata = await brainService.generateLiveModuleMetadata(moduleName);

        if (!metadata) {
            return res.status(404).json({
                success: false,
                message: `Módulo "${moduleName}" no encontrado o sin código detectable`
            });
        }

        res.json({
            success: true,
            data: metadata,
            message: `Metadata generada para ${moduleName}`
        });

    } catch (error) {
        console.error(`❌ [API] Error generando metadata para ${moduleName}:`, error);

        res.status(500).json({
            success: false,
            error: error.message,
            message: `Error generando metadata para ${moduleName}`
        });
    }
});

/**
 * GET /api/engineering/dependencies/:moduleName
 * Detectar dependencies desde código de un módulo
 */
router.get('/dependencies/:moduleName', async (req, res) => {
    const { moduleName } = req.params;

    try {
        // Buscar archivo principal del módulo
        const routesDir = require('path').join(__dirname, '../routes');
        const possibleFiles = [
            `${moduleName}Routes.js`,
            `${moduleName}-routes.js`,
            `${moduleName}.js`
        ];

        let filePath = null;
        for (const file of possibleFiles) {
            const testPath = require('path').join(routesDir, file);
            if (require('fs').existsSync(testPath)) {
                filePath = testPath;
                break;
            }
        }

        if (!filePath) {
            return res.status(404).json({
                success: false,
                message: `Archivo de módulo ${moduleName} no encontrado`
            });
        }

        const dependencies = await brainService.detectDependenciesFromCode(filePath);

        res.json({
            success: true,
            data: {
                module: moduleName,
                file: require('path').basename(filePath),
                dependencies
            }
        });

    } catch (error) {
        console.error(`Error detectando dependencies:`, error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/engineering/endpoints/:moduleName
 * Auto-detectar API endpoints desde código de routes
 */
router.get('/endpoints/:moduleName', async (req, res) => {
    const { moduleName } = req.params;

    try {
        const endpoints = await brainService.detectAPIEndpoints(moduleName);

        res.json({
            success: true,
            data: {
                module: moduleName,
                endpoints,
                count: endpoints.length
            }
        });

    } catch (error) {
        console.error(`Error detectando endpoints:`, error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/engineering/database-tables/:moduleName
 * Auto-detectar tablas de BD desde modelos Sequelize
 */
router.get('/database-tables/:moduleName', async (req, res) => {
    const { moduleName } = req.params;

    try {
        const tables = await brainService.detectDatabaseTables(moduleName);

        res.json({
            success: true,
            data: {
                module: moduleName,
                tables,
                count: tables.length
            }
        });

    } catch (error) {
        console.error(`Error detectando tablas:`, error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/engineering/stats
 * Estadísticas globales del proyecto (calculadas en vivo)
 */
router.get('/stats', async (req, res) => {
    try {
        const fullMetadata = await brainService.generateFullEngineeringMetadata();

        res.json({
            success: true,
            data: fullMetadata.stats,
            generatedAt: fullMetadata.generatedAt
        });

    } catch (error) {
        console.error('Error obteniendo stats:', error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/engineering/health
 * Health check del sistema de metadata viva
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'Engineering Metadata API',
        version: '2.0.0-live',
        mode: 'live-introspection',
        brainService: 'active',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
