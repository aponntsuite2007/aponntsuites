'use strict';

const express = require('express');
const router = express.Router();

/**
 * RUTAS DE DOCUMENTOS PARA RRHH
 *
 * Gestión de solicitudes, validación de documentos subidos,
 * envío de recordatorios, etc.
 */
module.exports = (workflowService, authMiddleware) => {

  // Middleware para verificar rol RRHH/Admin
  const requireHRRole = (req, res, next) => {
    if (!['admin', 'hr', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso restringido a personal de RRHH'
      });
    }
    next();
  };

  /**
   * @route POST /api/hr/documents/request
   * @desc Crear solicitud de documento a un empleado
   * @access RRHH/Admin
   */
  router.post('/request', authMiddleware, requireHRRole, async (req, res) => {
    try {
      const {
        employee_id,
        employee_name,
        document_type,
        custom_title,
        description,
        due_date,
        priority,
        notify_channels,
        related_document_id
      } = req.body;

      if (!employee_id || !document_type) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere employee_id y document_type'
        });
      }

      const result = await workflowService.createDocumentRequest({
        company_id: req.user.company_id,
        employee_id,
        employee_name: employee_name || 'Empleado',
        requested_by: req.user.id,
        requested_by_name: `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'RRHH',
        document_type,
        custom_title,
        description,
        due_date,
        priority,
        notify_channels,
        related_document_id
      });

      res.status(201).json(result);
    } catch (error) {
      console.error('[HR-DOCS] Error creating request:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/hr/documents/pending-validation
   * @desc Obtener documentos pendientes de validación
   * @access RRHH/Admin
   */
  router.get('/pending-validation', authMiddleware, requireHRRole, async (req, res) => {
    try {
      const requests = await workflowService.getPendingValidationRequests(
        req.user.company_id
      );

      res.json({
        success: true,
        data: requests,
        count: requests.length
      });
    } catch (error) {
      console.error('[HR-DOCS] Error getting pending validation:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route POST /api/hr/documents/validate/:requestId
   * @desc Validar (aprobar/rechazar) documento subido
   * @access RRHH/Admin
   */
  router.post('/validate/:requestId', authMiddleware, requireHRRole, async (req, res) => {
    try {
      const { action, rejection_reason, validation_notes } = req.body;

      if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere action: approve | reject'
        });
      }

      if (action === 'reject' && !rejection_reason) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere rejection_reason al rechazar'
        });
      }

      const result = await workflowService.validateDocument({
        request_id: req.params.requestId,
        hr_user_id: req.user.id,
        hr_user_name: `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'RRHH',
        action,
        rejection_reason,
        validation_notes
      });

      res.json(result);
    } catch (error) {
      console.error('[HR-DOCS] Error validating:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  });

  /**
   * @route POST /api/hr/documents/reminder/:requestId
   * @desc Enviar recordatorio a empleado
   * @access RRHH/Admin
   */
  router.post('/reminder/:requestId', authMiddleware, requireHRRole, async (req, res) => {
    try {
      const result = await workflowService.sendReminder(
        req.params.requestId,
        req.user.id
      );

      res.json(result);
    } catch (error) {
      console.error('[HR-DOCS] Error sending reminder:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/hr/documents/requests
   * @desc Listar todas las solicitudes con filtros
   * @access RRHH/Admin
   */
  router.get('/requests', authMiddleware, requireHRRole, async (req, res) => {
    try {
      const { DocumentRequest, Document } = workflowService.models;
      const { Op } = require('sequelize');

      const where = { company_id: req.user.company_id };

      // Filtros
      if (req.query.status) {
        where.status = req.query.status;
      }
      if (req.query.employee_id) {
        where.requested_from_id = req.query.employee_id;
      }
      if (req.query.type_code) {
        where.type_code = req.query.type_code;
      }

      const requests = await DocumentRequest.findAll({
        where,
        include: [{
          model: Document,
          as: 'document',
          required: false
        }],
        order: [
          ['status', 'ASC'],
          ['due_date', 'ASC'],
          ['created_at', 'DESC']
        ]
      });

      res.json({
        success: true,
        data: requests,
        count: requests.length
      });
    } catch (error) {
      console.error('[HR-DOCS] Error listing requests:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/hr/documents/thread/:threadId
   * @desc Obtener historial completo de un thread
   * @access RRHH/Admin
   */
  router.get('/thread/:threadId', authMiddleware, requireHRRole, async (req, res) => {
    try {
      const history = await workflowService.getThreadHistory(
        req.params.threadId,
        req.user.company_id
      );

      res.json({ success: true, data: history });
    } catch (error) {
      console.error('[HR-DOCS] Error getting thread:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/hr/documents/document-types
   * @desc Obtener tipos de documento disponibles para solicitar
   * @access RRHH/Admin
   */
  router.get('/document-types', authMiddleware, requireHRRole, (req, res) => {
    try {
      const types = Object.entries(workflowService.REQUEST_TYPES).map(([code, info]) => ({
        code,
        ...info
      }));

      res.json({
        success: true,
        data: types,
        count: types.length
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route POST /api/hr/documents/bulk-request
   * @desc Solicitar documento a múltiples empleados
   * @access RRHH/Admin
   */
  router.post('/bulk-request', authMiddleware, requireHRRole, async (req, res) => {
    try {
      const {
        employee_ids,
        document_type,
        custom_title,
        description,
        due_date,
        priority
      } = req.body;

      if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere array de employee_ids'
        });
      }

      const results = {
        success: [],
        failed: []
      };

      for (const emp of employee_ids) {
        try {
          const result = await workflowService.createDocumentRequest({
            company_id: req.user.company_id,
            employee_id: emp.id,
            employee_name: emp.name || 'Empleado',
            requested_by: req.user.id,
            requested_by_name: `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim(),
            document_type,
            custom_title,
            description,
            due_date,
            priority
          });
          results.success.push({ employee_id: emp.id, ...result });
        } catch (err) {
          results.failed.push({ employee_id: emp.id, error: err.message });
        }
      }

      res.json({
        success: true,
        data: results,
        message: `${results.success.length} solicitudes creadas, ${results.failed.length} fallidas`
      });
    } catch (error) {
      console.error('[HR-DOCS] Error bulk request:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/hr/documents/stats
   * @desc Estadísticas de solicitudes de documentos
   * @access RRHH/Admin
   */
  router.get('/stats', authMiddleware, requireHRRole, async (req, res) => {
    try {
      const { sequelize } = workflowService;

      const [stats] = await sequelize.query(`
        SELECT
          status,
          COUNT(*) as count
        FROM dms_document_requests
        WHERE company_id = :companyId
        GROUP BY status
      `, {
        replacements: { companyId: req.user.company_id },
        type: sequelize.QueryTypes.SELECT
      });

      const [overdue] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM dms_document_requests
        WHERE company_id = :companyId
          AND status = 'pending'
          AND due_date < NOW()
      `, {
        replacements: { companyId: req.user.company_id },
        type: sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: {
          by_status: stats,
          overdue_count: parseInt(overdue?.count || 0)
        }
      });
    } catch (error) {
      console.error('[HR-DOCS] Error getting stats:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
};
