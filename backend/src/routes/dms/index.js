'use strict';

const express = require('express');
const router = express.Router();

const documentRoutes = require('./documentRoutes');
const folderRoutes = require('./folderRoutes');
const catalogRoutes = require('./catalogRoutes');
const employeeDocumentRoutes = require('./employeeDocumentRoutes');
const hrDocumentRoutes = require('./hrDocumentRoutes');
const integrationRoutes = require('./integrationRoutes');

/**
 * Inicializar rutas DMS
 *
 * =====================================================
 * FUENTE ÚNICA DE VERDAD DOCUMENTAL
 * =====================================================
 *
 * Rutas disponibles:
 * - /api/dms/health - Estado del módulo
 * - /api/dms/* - CRUD de documentos
 * - /api/dms/folders/* - Gestión de carpetas
 * - /api/dms/catalogs/* - Catálogos y tipos
 * - /api/dms/employee/* - Rutas para empleados (dashboard/APK)
 * - /api/dms/hr/* - Rutas para RRHH (validación/solicitudes)
 * - /api/dms/integration/* - API para otros módulos
 *
 * @param {Object} options - Opciones de configuración
 * @param {Object} options.services - Servicios DMS
 * @param {Object} options.models - Modelos Sequelize
 * @param {Object} options.sequelize - Instancia Sequelize
 * @param {Function} options.authMiddleware - Middleware de autenticación
 */
module.exports = (options) => {
  const { services, models, sequelize, authMiddleware } = options;

  // Ruta de salud
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      module: 'DMS',
      status: 'operational',
      version: '2.0.0', // Versión actualizada con integración
      timestamp: new Date().toISOString(),
      features: {
        documentManagement: true,
        workflowValidation: !!services.workflowService,
        integrationAPI: !!services.integrationService,
        adapters: services.adapters ? Object.keys(services.adapters) : []
      }
    });
  });

  // Montar rutas de documentos
  router.use('/', documentRoutes(services, authMiddleware));

  // Montar rutas de carpetas
  router.use('/folders', folderRoutes(models, authMiddleware));

  // Montar rutas de catálogos
  router.use('/catalogs', catalogRoutes(sequelize, authMiddleware));

  // Montar rutas de workflow para empleados (dashboard/APK)
  if (services.workflowService) {
    router.use('/employee', employeeDocumentRoutes(services.workflowService, authMiddleware));
    router.use('/hr', hrDocumentRoutes(services.workflowService, authMiddleware));
    console.log('📁 [DMS] Rutas de workflow habilitadas (employee + hr)');
  }

  // Montar rutas de integración para otros módulos
  if (services.integrationService) {
    router.use('/integration', integrationRoutes(services.integrationService, authMiddleware));
    console.log('🔌 [DMS] API de integración habilitada para módulos externos');
  }

  // Ruta de inicialización de datos demo (solo desarrollo)
  if (process.env.NODE_ENV !== 'production') {
    router.post('/init-demo', authMiddleware, async (req, res) => {
      try {
        if (req.user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Solo administradores pueden inicializar datos demo'
          });
        }

        // Crear carpetas base
        const { Folder } = models;
        const companyId = req.user.company_id;
        const userId = req.user.id;

        const baseFolders = [
          { name: 'Recursos Humanos', slug: 'rrhh', color: '#3B82F6', icon: 'users' },
          { name: 'Legal', slug: 'legal', color: '#EF4444', icon: 'scale' },
          { name: 'Financiero', slug: 'financiero', color: '#10B981', icon: 'currency-dollar' },
          { name: 'Operaciones', slug: 'operaciones', color: '#F59E0B', icon: 'cog' },
          { name: 'Calidad', slug: 'calidad', color: '#8B5CF6', icon: 'badge-check' }
        ];

        const created = [];
        for (const folder of baseFolders) {
          const [f, wasCreated] = await Folder.findOrCreate({
            where: {
              company_id: companyId,
              slug: folder.slug,
              parent_id: null
            },
            defaults: {
              company_id: companyId,
              name: folder.name,
              slug: folder.slug,
              path: `/${folder.slug}`,
              depth: 0,
              color: folder.color,
              icon: folder.icon,
              created_by: userId
            }
          });

          if (wasCreated) {
            created.push(f);
          }
        }

        res.json({
          success: true,
          message: `${created.length} carpetas creadas`,
          data: created
        });
      } catch (error) {
        console.error('[DMS] Error initializing demo:', error);
        res.status(500).json({ success: false, message: error.message });
      }
    });
  }

  return router;
};
