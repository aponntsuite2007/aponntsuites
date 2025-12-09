'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Configurar multer para uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.DMS_MAX_FILE_SIZE) || 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    // Lista de tipos permitidos
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'text/csv',
      'application/json',
      'application/xml'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
    }
  }
});

/**
 * Inicializar rutas de documentos DMS
 * @param {Object} services - Servicios DMS
 * @param {Function} authMiddleware - Middleware de autenticación
 */
module.exports = (services, authMiddleware) => {
  const { documentService, storageService, auditService } = services;

  // ========================================
  // DOCUMENTOS - CRUD
  // ========================================

  /**
   * @route GET /api/dms/documents
   * @desc Listar documentos con filtros
   */
  router.get('/documents', authMiddleware, async (req, res) => {
    try {
      const filters = {
        folder_id: req.query.folder_id,
        document_type_id: req.query.type_id,
        category_id: req.query.category_id,
        status: req.query.status,
        owner_type: req.query.owner_type,
        owner_id: req.query.owner_id,
        tags: req.query.tags ? req.query.tags.split(',') : null,
        search: req.query.search,
        date_from: req.query.date_from,
        date_to: req.query.date_to,
        expiring_in_days: req.query.expiring_days,
        created_by: req.query.created_by
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: Math.min(parseInt(req.query.limit) || 20, 100),
        sort_by: req.query.sort_by || 'created_at',
        sort_order: req.query.sort_order || 'DESC'
      };

      const result = await documentService.listDocuments(
        filters,
        req.user.id,
        req.user.company_id,
        pagination
      );

      res.json({
        success: true,
        data: result.documents,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('[DMS] Error listing documents:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/documents/search
   * @desc Búsqueda full-text de documentos
   */
  router.get('/documents/search', authMiddleware, async (req, res) => {
    try {
      const { q, limit = 50, offset = 0 } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Query de búsqueda debe tener al menos 2 caracteres'
        });
      }

      const results = await documentService.searchDocuments(
        q,
        req.user.id,
        req.user.company_id,
        { limit: parseInt(limit), offset: parseInt(offset) }
      );

      res.json({
        success: true,
        data: results,
        query: q
      });
    } catch (error) {
      console.error('[DMS] Error searching documents:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/documents/:id
   * @desc Obtener documento por ID
   */
  router.get('/documents/:id', authMiddleware, async (req, res) => {
    try {
      const options = {
        includeVersions: req.query.versions === 'true',
        includeMetadata: req.query.metadata !== 'false',
        includePermissions: req.query.permissions === 'true'
      };

      const document = await documentService.getDocument(
        req.params.id,
        req.user.id,
        req.user.company_id,
        options
      );

      res.json({ success: true, data: document });
    } catch (error) {
      console.error('[DMS] Error getting document:', error);
      const status = error.message.includes('no encontrado') ? 404 :
                     error.message.includes('permiso') ? 403 : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  });

  /**
   * @route POST /api/dms/documents
   * @desc Crear nuevo documento
   */
  router.post('/documents', authMiddleware, upload.single('file'), async (req, res) => {
    try {
      const data = {
        folder_id: req.body.folder_id || null,
        document_type_id: req.body.document_type_id,
        category_code: req.body.category_code,
        type_code: req.body.type_code,
        title: req.body.title,
        description: req.body.description,
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {},
        owner_type: req.body.owner_type || 'system',
        owner_id: req.body.owner_id || null,
        access_level: req.body.access_level || 'private',
        requires_signature: req.body.requires_signature === 'true',
        signature_required_from: req.body.signature_required_from,
        due_date: req.body.due_date || null,
        expiration_date: req.body.expiration_date || null
      };

      const document = await documentService.createDocument(
        data,
        req.file,
        req.user.id,
        req.user.company_id
      );

      res.status(201).json({
        success: true,
        data: document,
        message: 'Documento creado exitosamente'
      });
    } catch (error) {
      console.error('[DMS] Error creating document:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  });

  /**
   * @route PUT /api/dms/documents/:id
   * @desc Actualizar documento (metadata, no archivo)
   */
  router.put('/documents/:id', authMiddleware, async (req, res) => {
    try {
      const updates = {
        title: req.body.title,
        description: req.body.description,
        tags: req.body.tags,
        folder_id: req.body.folder_id,
        access_level: req.body.access_level,
        expiration_date: req.body.expiration_date,
        due_date: req.body.due_date,
        requires_signature: req.body.requires_signature,
        signature_required_from: req.body.signature_required_from,
        metadata: req.body.metadata
      };

      // Eliminar campos undefined
      Object.keys(updates).forEach(key => {
        if (updates[key] === undefined) delete updates[key];
      });

      const document = await documentService.updateDocument(
        req.params.id,
        updates,
        req.user.id,
        req.user.company_id
      );

      res.json({
        success: true,
        data: document,
        message: 'Documento actualizado'
      });
    } catch (error) {
      console.error('[DMS] Error updating document:', error);
      const status = error.message.includes('no encontrado') ? 404 :
                     error.message.includes('permiso') ? 403 : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  });

  /**
   * @route DELETE /api/dms/documents/:id
   * @desc Eliminar documento (soft delete)
   */
  router.delete('/documents/:id', authMiddleware, async (req, res) => {
    try {
      const { reason } = req.body;

      await documentService.deleteDocument(
        req.params.id,
        reason || 'Eliminado por usuario',
        req.user.id,
        req.user.company_id
      );

      res.json({
        success: true,
        message: 'Documento eliminado'
      });
    } catch (error) {
      console.error('[DMS] Error deleting document:', error);
      const status = error.message.includes('no encontrado') ? 404 :
                     error.message.includes('permiso') ? 403 : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  });

  /**
   * @route DELETE /api/dms/documents/:id/permanent
   * @desc Eliminar documento permanentemente (solo admin)
   */
  router.delete('/documents/:id/permanent', authMiddleware, async (req, res) => {
    try {
      const result = await documentService.permanentlyDeleteDocument(
        req.params.id,
        req.user.id,
        req.user.company_id
      );

      res.json(result);
    } catch (error) {
      console.error('[DMS] Error permanently deleting document:', error);
      const status = error.message.includes('administrador') ? 403 : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  });

  // ========================================
  // VERSIONES
  // ========================================

  /**
   * @route POST /api/dms/documents/:id/versions
   * @desc Crear nueva versión de documento
   */
  router.post('/documents/:id/versions', authMiddleware, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un archivo para crear nueva versión'
        });
      }

      const version = await documentService.createVersion(
        req.params.id,
        req.file,
        req.body.notes || '',
        req.user.id,
        req.user.company_id
      );

      res.status(201).json({
        success: true,
        data: version,
        message: 'Nueva versión creada'
      });
    } catch (error) {
      console.error('[DMS] Error creating version:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  });

  // ========================================
  // ESTADOS
  // ========================================

  /**
   * @route PATCH /api/dms/documents/:id/status
   * @desc Cambiar estado del documento
   */
  router.patch('/documents/:id/status', authMiddleware, async (req, res) => {
    try {
      const { status, reason } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere el nuevo estado'
        });
      }

      const document = await documentService.changeStatus(
        req.params.id,
        status,
        reason || '',
        req.user.id,
        req.user.company_id
      );

      res.json({
        success: true,
        data: document,
        message: `Estado cambiado a ${status}`
      });
    } catch (error) {
      console.error('[DMS] Error changing status:', error);
      const status = error.message.includes('inválida') ? 400 :
                     error.message.includes('permiso') ? 403 : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  });

  // ========================================
  // BLOQUEO (CHECK-IN/CHECK-OUT)
  // ========================================

  /**
   * @route POST /api/dms/documents/:id/lock
   * @desc Bloquear documento para edición
   */
  router.post('/documents/:id/lock', authMiddleware, async (req, res) => {
    try {
      const document = await documentService.lockDocument(
        req.params.id,
        req.user.id,
        req.user.company_id
      );

      res.json({
        success: true,
        data: document,
        message: 'Documento bloqueado para edición'
      });
    } catch (error) {
      console.error('[DMS] Error locking document:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  });

  /**
   * @route POST /api/dms/documents/:id/unlock
   * @desc Desbloquear documento
   */
  router.post('/documents/:id/unlock', authMiddleware, async (req, res) => {
    try {
      const force = req.body.force === true;

      const document = await documentService.unlockDocument(
        req.params.id,
        req.user.id,
        req.user.company_id,
        force
      );

      res.json({
        success: true,
        data: document,
        message: 'Documento desbloqueado'
      });
    } catch (error) {
      console.error('[DMS] Error unlocking document:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  });

  // ========================================
  // DESCARGAS
  // ========================================

  /**
   * @route GET /api/dms/documents/:id/download
   * @desc Descargar archivo del documento
   */
  router.get('/documents/:id/download', authMiddleware, async (req, res) => {
    try {
      const document = await documentService.getDocument(
        req.params.id,
        req.user.id,
        req.user.company_id,
        { checkPermission: true }
      );

      if (!document.file_path) {
        return res.status(404).json({
          success: false,
          message: 'Documento no tiene archivo asociado'
        });
      }

      // Verificar permiso de descarga
      const canDownload = await documentService.checkDocumentAccess(
        document,
        req.user.id,
        'download'
      );

      if (!canDownload) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para descargar este documento'
        });
      }

      const file = await storageService.downloadFile(document.file_path);

      // Registrar descarga
      await auditService.logAction({
        document_id: document.id,
        company_id: req.user.company_id,
        user_id: req.user.id,
        action: 'download',
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      // Incrementar contador
      await document.incrementDownloadCount();

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.file_name}"`);
      res.setHeader('Content-Length', file.fileSize);

      res.send(file.buffer);
    } catch (error) {
      console.error('[DMS] Error downloading document:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/documents/:id/versions/:version/download
   * @desc Descargar versión específica
   */
  router.get('/documents/:id/versions/:version/download', authMiddleware, async (req, res) => {
    try {
      const document = await documentService.getDocument(
        req.params.id,
        req.user.id,
        req.user.company_id,
        { includeVersions: true }
      );

      const version = document.versions?.find(
        v => v.version_number === parseInt(req.params.version)
      );

      if (!version) {
        return res.status(404).json({
          success: false,
          message: 'Versión no encontrada'
        });
      }

      const file = await storageService.downloadFile(version.file_path);

      await auditService.logAction({
        document_id: document.id,
        company_id: req.user.company_id,
        user_id: req.user.id,
        action: 'download',
        version_number: version.version_number,
        ip_address: req.ip
      });

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${version.file_name}"`);
      res.send(file.buffer);
    } catch (error) {
      console.error('[DMS] Error downloading version:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ========================================
  // ESTADÍSTICAS
  // ========================================

  /**
   * @route GET /api/dms/statistics
   * @desc Obtener estadísticas de documentos
   */
  router.get('/statistics', authMiddleware, async (req, res) => {
    try {
      const filters = {
        date_from: req.query.date_from,
        date_to: req.query.date_to,
        owner_type: req.query.owner_type
      };

      const stats = await documentService.getStatistics(
        req.user.company_id,
        filters
      );

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('[DMS] Error getting statistics:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ========================================
  // AUDITORÍA
  // ========================================

  /**
   * @route GET /api/dms/documents/:id/audit
   * @desc Obtener historial de auditoría de documento
   */
  router.get('/documents/:id/audit', authMiddleware, async (req, res) => {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        action_filter: req.query.action,
        date_from: req.query.date_from,
        date_to: req.query.date_to
      };

      const result = await auditService.getDocumentAuditLog(
        req.params.id,
        req.user.company_id,
        options
      );

      res.json({ success: true, data: result.logs, pagination: result.pagination });
    } catch (error) {
      console.error('[DMS] Error getting audit log:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/audit/activity
   * @desc Obtener reporte de actividad de empresa
   */
  router.get('/audit/activity', authMiddleware, async (req, res) => {
    try {
      const options = {
        date_from: req.query.date_from ? new Date(req.query.date_from) : undefined,
        date_to: req.query.date_to ? new Date(req.query.date_to) : undefined,
        group_by: req.query.group_by || 'day'
      };

      const report = await auditService.getCompanyActivityReport(
        req.user.company_id,
        options
      );

      res.json({ success: true, data: report });
    } catch (error) {
      console.error('[DMS] Error getting activity report:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ========================================
  // GDPR
  // ========================================

  /**
   * @route GET /api/dms/gdpr/my-data
   * @desc Obtener mis datos (GDPR - Derecho de acceso)
   */
  router.get('/gdpr/my-data', authMiddleware, async (req, res) => {
    try {
      const report = await auditService.generateGDPRComplianceReport(
        req.user.company_id,
        req.user.id
      );

      res.json({ success: true, data: report });
    } catch (error) {
      console.error('[DMS] Error getting GDPR data:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/gdpr/export
   * @desc Exportar mis datos (GDPR - Portabilidad)
   */
  router.get('/gdpr/export', authMiddleware, async (req, res) => {
    try {
      const format = req.query.format || 'json';
      const data = await auditService.exportUserData(
        req.user.id,
        req.user.company_id,
        format
      );

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="my_dms_data_${Date.now()}.json"`);
        res.json(data);
      } else {
        res.json({ success: true, data });
      }
    } catch (error) {
      console.error('[DMS] Error exporting GDPR data:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route POST /api/dms/gdpr/delete-request
   * @desc Solicitar eliminación de datos (GDPR - Derecho al olvido)
   */
  router.post('/gdpr/delete-request', authMiddleware, async (req, res) => {
    try {
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Debe proporcionar una razón para la solicitud'
        });
      }

      const result = await auditService.requestDataDeletion(
        req.user.id,
        req.user.company_id,
        reason
      );

      res.json(result);
    } catch (error) {
      console.error('[DMS] Error requesting deletion:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ========================================
  // ALERTAS
  // ========================================

  /**
   * @route GET /api/dms/alerts
   * @desc Obtener alertas del usuario
   */
  router.get('/alerts', authMiddleware, async (req, res) => {
    try {
      const { DocumentAlert } = documentService.models;

      const where = {
        user_id: req.user.id,
        company_id: req.user.company_id
      };

      if (req.query.unread === 'true') {
        where.is_read = false;
      }

      if (req.query.undismissed === 'true') {
        where.is_dismissed = false;
      }

      const alerts = await DocumentAlert.findAll({
        where,
        include: [{
          model: documentService.models.Document,
          as: 'document',
          attributes: ['id', 'title', 'document_number']
        }],
        order: [['created_at', 'DESC']],
        limit: parseInt(req.query.limit) || 50
      });

      res.json({ success: true, data: alerts });
    } catch (error) {
      console.error('[DMS] Error getting alerts:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route PATCH /api/dms/alerts/:id/read
   * @desc Marcar alerta como leída
   */
  router.patch('/alerts/:id/read', authMiddleware, async (req, res) => {
    try {
      const { DocumentAlert } = documentService.models;

      const alert = await DocumentAlert.findOne({
        where: {
          id: req.params.id,
          user_id: req.user.id
        }
      });

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Alerta no encontrada'
        });
      }

      await alert.markAsRead();

      res.json({ success: true, message: 'Alerta marcada como leída' });
    } catch (error) {
      console.error('[DMS] Error marking alert as read:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route PATCH /api/dms/alerts/:id/dismiss
   * @desc Descartar alerta
   */
  router.patch('/alerts/:id/dismiss', authMiddleware, async (req, res) => {
    try {
      const { DocumentAlert } = documentService.models;

      const alert = await DocumentAlert.findOne({
        where: {
          id: req.params.id,
          user_id: req.user.id
        }
      });

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Alerta no encontrada'
        });
      }

      await alert.dismiss();

      res.json({ success: true, message: 'Alerta descartada' });
    } catch (error) {
      console.error('[DMS] Error dismissing alert:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ========================================
  // EXPIRACIÓN
  // ========================================

  /**
   * @route GET /api/dms/expiring
   * @desc Obtener documentos por expirar
   */
  router.get('/expiring', authMiddleware, async (req, res) => {
    try {
      const daysAhead = parseInt(req.query.days) || 30;

      const documents = await auditService.getExpiringDocuments(
        req.user.company_id,
        daysAhead
      );

      res.json({ success: true, data: documents });
    } catch (error) {
      console.error('[DMS] Error getting expiring documents:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route POST /api/dms/expiring/generate-alerts
   * @desc Generar alertas de vencimiento (admin only)
   */
  router.post('/expiring/generate-alerts', authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo administradores pueden ejecutar esta acción'
        });
      }

      const result = await auditService.generateExpirationAlerts(req.user.company_id);

      res.json({
        success: true,
        data: result,
        message: `${result.alerts_created} alertas creadas`
      });
    } catch (error) {
      console.error('[DMS] Error generating alerts:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
};
