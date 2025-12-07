'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');

// Configurar multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB máximo
});

/**
 * RUTAS DE INTEGRACIÓN DMS
 *
 * Estas rutas permiten que CUALQUIER módulo del sistema
 * registre documentos en el DMS como fuente única de verdad.
 *
 * Uso interno por otros módulos del sistema.
 */
module.exports = (integrationService, authMiddleware) => {

  /**
   * @route POST /api/dms/integration/register
   * @desc Registrar documento desde cualquier módulo
   * @access Sistema autenticado
   *
   * Body (multipart/form-data):
   * - file: Archivo
   * - module: Nombre del módulo (vacations, sanctions, etc.)
   * - documentType: Tipo de documento (request, approval, etc.)
   * - employeeId: ID del empleado relacionado (opcional)
   * - sourceEntityType: Tipo de entidad origen
   * - sourceEntityId: ID de entidad origen
   * - title: Título del documento (opcional)
   * - description: Descripción (opcional)
   * - metadata: JSON con metadata adicional (opcional)
   */
  router.post('/register', authMiddleware, upload.single('file'), async (req, res) => {
    try {
      const {
        module,
        documentType,
        employeeId,
        sourceEntityType,
        sourceEntityId,
        title,
        description,
        expirationDate,
        tags
      } = req.body;

      // Parsear metadata si viene como string
      let metadata = {};
      if (req.body.metadata) {
        try {
          metadata = typeof req.body.metadata === 'string'
            ? JSON.parse(req.body.metadata)
            : req.body.metadata;
        } catch (e) {
          // Ignorar error de parseo
        }
      }

      // Parsear tags si viene como string
      let parsedTags = [];
      if (tags) {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un archivo'
        });
      }

      if (!module || !documentType) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere module y documentType'
        });
      }

      const result = await integrationService.registerDocument({
        module,
        documentType,
        companyId: req.user.company_id,
        employeeId: employeeId ? parseInt(employeeId) : null,
        createdById: req.user.id,
        sourceEntityType,
        sourceEntityId,
        file: req.file,
        title,
        description,
        expirationDate,
        tags: parsedTags,
        metadata
      });

      res.status(201).json(result);
    } catch (error) {
      console.error('[DMS-INTEGRATION] Error registering document:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  });

  /**
   * @route POST /api/dms/integration/request
   * @desc Solicitar documento a un empleado
   * @access Sistema autenticado
   */
  router.post('/request', authMiddleware, async (req, res) => {
    try {
      const {
        module,
        documentType,
        employeeId,
        employeeName,
        sourceEntityType,
        sourceEntityId,
        dueDate,
        priority,
        description
      } = req.body;

      if (!module || !documentType || !employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere module, documentType y employeeId'
        });
      }

      const result = await integrationService.requestDocumentFromEmployee({
        module,
        documentType,
        companyId: req.user.company_id,
        employeeId,
        employeeName: employeeName || 'Empleado',
        requestedById: req.user.id,
        requestedByName: `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Sistema',
        sourceEntityType,
        sourceEntityId,
        dueDate,
        priority: priority || 'medium',
        description
      });

      res.status(201).json(result);
    } catch (error) {
      console.error('[DMS-INTEGRATION] Error requesting document:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/integration/entity/:entityType/:entityId
   * @desc Obtener documentos de una entidad específica
   * @access Sistema autenticado
   */
  router.get('/entity/:entityType/:entityId', authMiddleware, async (req, res) => {
    try {
      const documents = await integrationService.getEntityDocuments({
        companyId: req.user.company_id,
        sourceEntityType: req.params.entityType,
        sourceEntityId: req.params.entityId,
        includeDeleted: req.query.includeDeleted === 'true'
      });

      res.json({
        success: true,
        data: documents,
        count: documents.length
      });
    } catch (error) {
      console.error('[DMS-INTEGRATION] Error getting entity documents:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/integration/employee/:employeeId
   * @desc Obtener documentos de un empleado por módulo
   * @access Sistema autenticado
   */
  router.get('/employee/:employeeId', authMiddleware, async (req, res) => {
    try {
      const { module, documentType, status, limit } = req.query;

      const documents = await integrationService.getEmployeeModuleDocuments({
        companyId: req.user.company_id,
        employeeId: parseInt(req.params.employeeId),
        module,
        documentType,
        status,
        limit: limit ? parseInt(limit) : 50
      });

      res.json({
        success: true,
        data: documents,
        count: documents.length
      });
    } catch (error) {
      console.error('[DMS-INTEGRATION] Error getting employee documents:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/integration/employee/:employeeId/dashboard
   * @desc Dashboard de documentos para expediente 360
   * @access Sistema autenticado
   */
  router.get('/employee/:employeeId/dashboard', authMiddleware, async (req, res) => {
    try {
      const dashboard = await integrationService.getEmployeeDocumentsDashboard(
        req.user.company_id,
        parseInt(req.params.employeeId)
      );

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      console.error('[DMS-INTEGRATION] Error getting employee dashboard:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/integration/validate/:documentId
   * @desc Verificar si documento está validado
   * @access Sistema autenticado
   */
  router.get('/validate/:documentId', authMiddleware, async (req, res) => {
    try {
      const result = await integrationService.isDocumentValidated(
        req.params.documentId,
        req.user.company_id
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[DMS-INTEGRATION] Error validating document:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route POST /api/dms/integration/link
   * @desc Vincular documento existente a una entidad
   * @access Sistema autenticado
   */
  router.post('/link', authMiddleware, async (req, res) => {
    try {
      const { documentId, sourceEntityType, sourceEntityId } = req.body;

      if (!documentId || !sourceEntityType || !sourceEntityId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere documentId, sourceEntityType y sourceEntityId'
        });
      }

      const result = await integrationService.linkDocumentToEntity({
        documentId,
        companyId: req.user.company_id,
        sourceEntityType,
        sourceEntityId,
        linkedById: req.user.id
      });

      res.json(result);
    } catch (error) {
      console.error('[DMS-INTEGRATION] Error linking document:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/integration/stats
   * @desc Estadísticas de documentos por módulo
   * @access Sistema autenticado (admin/hr)
   */
  router.get('/stats', authMiddleware, async (req, res) => {
    try {
      const stats = await integrationService.getCompanyModuleDocumentStats(
        req.user.company_id
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('[DMS-INTEGRATION] Error getting stats:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/integration/modules
   * @desc Obtener módulos soportados
   * @access Público
   */
  router.get('/modules', (req, res) => {
    res.json({
      success: true,
      data: {
        modules: integrationService.getSupportedModules(),
        documentTypes: Object.keys(integrationService.MODULE_DOCUMENT_TYPES).reduce((acc, mod) => {
          acc[mod] = Object.keys(integrationService.MODULE_DOCUMENT_TYPES[mod]);
          return acc;
        }, {})
      }
    });
  });

  return router;
};
