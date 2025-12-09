'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');

// Configurar multer para uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB para documentos de empleados
});

/**
 * RUTAS DE DOCUMENTOS PARA EMPLEADOS
 *
 * Estas rutas son accesibles desde:
 * - Dashboard del empleado (panel-empresa.html)
 * - APK móvil
 *
 * Flujo integrado con notificaciones enterprise
 */
module.exports = (workflowService, authMiddleware) => {

  /**
   * @route GET /api/employee/documents/pending
   * @desc Obtener documentos pendientes de subir
   * @access Empleado autenticado
   */
  router.get('/pending', authMiddleware, async (req, res) => {
    try {
      // DEBUG - Ver qué contiene req.user
      console.log('[EMPLOYEE-DOCS DEBUG] req.user:', JSON.stringify(req.user, null, 2));
      console.log('[EMPLOYEE-DOCS DEBUG] req.user keys:', req.user ? Object.keys(req.user) : 'req.user is null/undefined');

      // Soportar ambos formatos: user_id (desde modelo) o id (desde JWT directo)
      const userId = req.user.user_id || req.user.id;
      const companyId = req.user.company_id || req.user.companyId;

      console.log('[EMPLOYEE-DOCS DEBUG] userId:', userId, 'companyId:', companyId);

      const requests = await workflowService.getEmployeePendingRequests(
        userId,
        companyId
      );

      res.json({
        success: true,
        data: requests,
        count: requests.length
      });
    } catch (error) {
      console.error('[EMPLOYEE-DOCS] Error getting pending:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/employee/documents/requests/:id
   * @desc Obtener detalle de una solicitud
   * @access Empleado autenticado (solo sus solicitudes)
   */
  router.get('/requests/:id', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.user_id || req.user.id;
      const { DocumentRequest, Document } = workflowService.models;

      const request = await DocumentRequest.findOne({
        where: {
          id: req.params.id,
          requested_from_id: userId
        },
        include: [{
          model: Document,
          as: 'document',
          required: false
        }]
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Solicitud no encontrada'
        });
      }

      res.json({ success: true, data: request });
    } catch (error) {
      console.error('[EMPLOYEE-DOCS] Error getting request:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route POST /api/employee/documents/upload/:requestId
   * @desc Subir documento solicitado
   * @access Empleado autenticado
   */
  router.post('/upload/:requestId', authMiddleware, upload.single('file'), async (req, res) => {
    try {
      const userId = req.user.user_id || req.user.id;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un archivo'
        });
      }

      const result = await workflowService.uploadRequestedDocument({
        request_id: req.params.requestId,
        employee_id: userId,
        file: req.file,
        notes: req.body.notes || ''
      });

      res.json(result);
    } catch (error) {
      console.error('[EMPLOYEE-DOCS] Error uploading:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/employee/documents/my-documents
   * @desc Obtener todos mis documentos en el DMS
   * @access Empleado autenticado
   */
  router.get('/my-documents', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.user_id || req.user.id;
      const companyId = req.user.company_id || req.user.companyId;
      const { Document } = workflowService.models;
      const { Op } = require('sequelize');

      const documents = await Document.findAll({
        where: {
          company_id: companyId,
          [Op.or]: [
            { owner_id: userId },
            { created_by: userId }
          ],
          is_deleted: false
        },
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: documents,
        count: documents.length
      });
    } catch (error) {
      console.error('[EMPLOYEE-DOCS] Error getting my documents:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/employee/documents/thread/:threadId
   * @desc Obtener historial de un thread de solicitud
   * @access Empleado autenticado (solo sus threads)
   */
  router.get('/thread/:threadId', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.user_id || req.user.id;
      const companyId = req.user.company_id || req.user.companyId;

      const history = await workflowService.getThreadHistory(
        req.params.threadId,
        companyId
      );

      // Verificar que el empleado es parte del thread
      if (history.request?.requested_from_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tiene acceso a este thread'
        });
      }

      res.json({ success: true, data: history });
    } catch (error) {
      console.error('[EMPLOYEE-DOCS] Error getting thread:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/employee/documents/expiring
   * @desc Obtener mis documentos próximos a vencer
   * @access Empleado autenticado
   */
  router.get('/expiring', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.user_id || req.user.id;
      const companyId = req.user.company_id || req.user.companyId;
      const { Document } = workflowService.models;
      const { Op } = require('sequelize');
      const daysAhead = parseInt(req.query.days) || 60;

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const documents = await Document.findAll({
        where: {
          company_id: companyId,
          owner_id: userId,
          is_deleted: false,
          expiration_date: {
            [Op.between]: [new Date(), futureDate]
          }
        },
        order: [['expiration_date', 'ASC']]
      });

      res.json({
        success: true,
        data: documents,
        count: documents.length
      });
    } catch (error) {
      console.error('[EMPLOYEE-DOCS] Error getting expiring docs:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
};
