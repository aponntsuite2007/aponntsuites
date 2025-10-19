/**
 * RUTAS API: Sistema de Notificaciones Enterprise
 *
 * Endpoints:
 * - GET /api/v1/notifications - Listar notificaciones
 * - GET /api/v1/notifications/:id - Obtener notificación específica
 * - POST /api/v1/notifications - Crear notificación
 * - PUT /api/v1/notifications/:id/action - Procesar acción
 * - PUT /api/v1/notifications/:id/read - Marcar como leída
 * - DELETE /api/v1/notifications/:id - Eliminar notificación
 * - GET /api/v1/notifications/stats - Estadísticas
 * - GET /api/v1/notifications/:id/history - Historial de acciones
 *
 * Workflows:
 * - GET /api/v1/workflows - Listar workflows
 * - GET /api/v1/workflows/:id - Obtener workflow
 * - POST /api/v1/workflows - Crear workflow
 * - PUT /api/v1/workflows/:id - Actualizar workflow
 *
 * Templates:
 * - GET /api/v1/notification-templates - Listar templates
 * - GET /api/v1/notification-templates/:id - Obtener template
 * - POST /api/v1/notification-templates - Crear template
 * - PUT /api/v1/notification-templates/:id - Actualizar template
 *
 * Preferencias:
 * - GET /api/v1/notification-preferences - Obtener preferencias del usuario
 * - PUT /api/v1/notification-preferences/:module - Actualizar preferencias
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const NotificationWorkflowService = require('../services/NotificationWorkflowService');

const {
  Notification,
  NotificationWorkflow,
  NotificationActionsLog,
  NotificationTemplate,
  UserNotificationPreference,
  User,
  sequelize
} = require('../config/database');

// =========================================================================
// MIDDLEWARE: Autenticación y autorización
// =========================================================================

/**
 * Middleware de autenticación JWT
 */
const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token no proporcionado'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');

    req.user = {
      user_id: decoded.user_id,
      company_id: decoded.company_id,
      role: decoded.role,
      email: decoded.email
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido o expirado'
    });
  }
};

/**
 * Middleware para verificar permisos de RRHH
 */
const requireRRHH = (req, res, next) => {
  if (req.user.role !== 'rrhh' && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'Requiere permisos de RRHH o Administrador'
    });
  }
  next();
};

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// =========================================================================
// ENDPOINTS: NOTIFICACIONES
// =========================================================================

/**
 * GET /api/v1/notifications
 * Listar notificaciones del usuario actual
 *
 * Query params:
 * - module: Filtrar por módulo
 * - status: Filtrar por estado (pending, read, unread)
 * - priority: Filtrar por prioridad
 * - requires_action: true/false
 * - limit: Cantidad máxima de resultados
 * - offset: Offset para paginación
 */
router.get('/', async (req, res) => {
  try {
    const {
      module,
      status,
      priority,
      requires_action,
      limit = 50,
      offset = 0
    } = req.query;

    const where = {
      company_id: req.user.company_id,
      [sequelize.Sequelize.Op.or]: [
        { recipient_user_id: req.user.user_id },
        { recipient_role: req.user.role },
        { is_broadcast: true }
      ]
    };

    if (module) where.module = module;
    if (priority) where.priority = priority;
    if (requires_action !== undefined) where.requires_action = requires_action === 'true';
    if (status === 'read') where.is_read = true;
    if (status === 'unread') where.is_read = false;
    if (status === 'pending') where.action_status = 'pending';

    const notifications = await Notification.findAll({
      where,
      include: [
        {
          model: User,
          as: 'relatedUser',
          attributes: ['user_id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [
        ['priority', 'DESC'],
        ['created_at', 'DESC']
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const count = await Notification.count({ where });

    res.json({
      success: true,
      data: notifications.map(n => n.toAPI()),
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: count > (parseInt(offset) + parseInt(limit))
      }
    });

  } catch (error) {
    console.error('[notificationsEnterprise] Error listing notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener notificaciones',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/notifications/pending
 * Obtener notificaciones pendientes de acción
 */
router.get('/pending', async (req, res) => {
  try {
    const notifications = await Notification.getPendingForUser(
      req.user.user_id,
      req.user.company_id,
      { userRole: req.user.role, limit: 100 }
    );

    res.json({
      success: true,
      data: notifications.map(n => n.toAPI()),
      count: notifications.length
    });

  } catch (error) {
    console.error('[notificationsEnterprise] Error getting pending notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener notificaciones pendientes'
    });
  }
});

/**
 * GET /api/v1/notifications/unread
 * Obtener notificaciones no leídas
 */
router.get('/unread', async (req, res) => {
  try {
    const notifications = await Notification.getUnreadForUser(
      req.user.user_id,
      req.user.company_id,
      req.user.role
    );

    res.json({
      success: true,
      data: notifications.map(n => n.toAPI()),
      count: notifications.length
    });

  } catch (error) {
    console.error('[notificationsEnterprise] Error getting unread notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener notificaciones no leídas'
    });
  }
});

/**
 * GET /api/v1/notifications/stats
 * Obtener estadísticas de notificaciones
 */
router.get('/stats', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const stats = await Notification.getStatsByModule(
      req.user.company_id,
      dateFrom ? new Date(dateFrom) : null,
      dateTo ? new Date(dateTo) : null
    );

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('[notificationsEnterprise] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
});

/**
 * GET /api/v1/notifications/:id
 * Obtener notificación específica
 */
router.get('/:id', async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id, {
      include: [
        { model: User, as: 'relatedUser', attributes: ['user_id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'creator', attributes: ['user_id', 'firstName', 'lastName', 'email'] }
      ]
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notificación no encontrada'
      });
    }

    // Verificar permisos
    if (notification.company_id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para ver esta notificación'
      });
    }

    res.json({
      success: true,
      data: notification.toAPI()
    });

  } catch (error) {
    console.error('[notificationsEnterprise] Error getting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener notificación'
    });
  }
});

/**
 * POST /api/v1/notifications
 * Crear nueva notificación
 */
router.post('/', async (req, res) => {
  try {
    const notification = await NotificationWorkflowService.createNotification({
      ...req.body,
      companyId: req.user.company_id,
      createdBy: req.user.user_id
    });

    res.status(201).json({
      success: true,
      data: notification.toAPI()
    });

  } catch (error) {
    console.error('[notificationsEnterprise] Error creating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear notificación',
      details: error.message
    });
  }
});

/**
 * PUT /api/v1/notifications/:id/action
 * Procesar acción sobre notificación (aprobar/rechazar/etc)
 *
 * Body:
 * - action: approve|reject|escalate|request_more_info
 * - response: Texto de respuesta/notas
 * - metadata: Metadata adicional
 */
router.put('/:id/action', async (req, res) => {
  try {
    const { action, response, metadata } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Acción requerida'
      });
    }

    const notification = await NotificationWorkflowService.processAction(
      req.params.id,
      action,
      req.user.user_id,
      response,
      metadata
    );

    res.json({
      success: true,
      data: notification.toAPI()
    });

  } catch (error) {
    console.error('[notificationsEnterprise] Error processing action:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar acción',
      details: error.message
    });
  }
});

/**
 * PUT /api/v1/notifications/:id/read
 * Marcar notificación como leída
 */
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notificación no encontrada'
      });
    }

    if (notification.company_id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para modificar esta notificación'
      });
    }

    await notification.markAsRead(req.user.user_id);

    res.json({
      success: true,
      data: notification.toAPI()
    });

  } catch (error) {
    console.error('[notificationsEnterprise] Error marking as read:', error);
    res.status(500).json({
      success: false,
      error: 'Error al marcar como leída'
    });
  }
});

/**
 * PUT /api/v1/notifications/read-all
 * Marcar todas las notificaciones como leídas
 */
router.put('/read-all', async (req, res) => {
  try {
    const result = await Notification.markAllAsReadForUser(
      req.user.user_id,
      req.user.company_id
    );

    res.json({
      success: true,
      updated: result[0] // Cantidad de registros actualizados
    });

  } catch (error) {
    console.error('[notificationsEnterprise] Error marking all as read:', error);
    res.status(500).json({
      success: false,
      error: 'Error al marcar todas como leídas'
    });
  }
});

/**
 * GET /api/v1/notifications/:id/history
 * Obtener historial de acciones de una notificación
 */
router.get('/:id/history', async (req, res) => {
  try {
    const history = await NotificationActionsLog.getHistory(req.params.id, {
      includeUser: true
    });

    res.json({
      success: true,
      data: history.map(h => h.toAPI())
    });

  } catch (error) {
    console.error('[notificationsEnterprise] Error getting history:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historial'
    });
  }
});

/**
 * DELETE /api/v1/notifications/:id
 * Eliminar notificación (solo admins/RRHH)
 */
router.delete('/:id', requireRRHH, async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notificación no encontrada'
      });
    }

    if (notification.company_id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para eliminar esta notificación'
      });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Notificación eliminada exitosamente'
    });

  } catch (error) {
    console.error('[notificationsEnterprise] Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar notificación'
    });
  }
});

// =========================================================================
// ENDPOINTS: WORKFLOWS
// =========================================================================

/**
 * GET /api/v1/workflows
 * Listar workflows de la empresa
 */
router.get('/workflows', requireRRHH, async (req, res) => {
  try {
    const { module } = req.query;

    const workflows = await NotificationWorkflow.getActiveForCompany(
      req.user.company_id,
      module
    );

    res.json({
      success: true,
      data: workflows.map(w => w.toAPI())
    });

  } catch (error) {
    console.error('[notificationsEnterprise] Error listing workflows:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener workflows'
    });
  }
});

/**
 * GET /api/v1/workflows/:id
 * Obtener workflow específico
 */
router.get('/workflows/:id', requireRRHH, async (req, res) => {
  try {
    const workflow = await NotificationWorkflow.findByPk(req.params.id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow no encontrado'
      });
    }

    res.json({
      success: true,
      data: workflow.toAPI()
    });

  } catch (error) {
    console.error('[notificationsEnterprise] Error getting workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener workflow'
    });
  }
});

// =========================================================================
// ENDPOINTS: TEMPLATES
// =========================================================================

/**
 * GET /api/v1/notification-templates
 * Listar templates
 */
router.get('/templates', requireRRHH, async (req, res) => {
  try {
    const { module } = req.query;

    const templates = await NotificationTemplate.getActiveForCompany(
      req.user.company_id,
      module
    );

    res.json({
      success: true,
      data: templates.map(t => t.toAPI())
    });

  } catch (error) {
    console.error('[notificationsEnterprise] Error listing templates:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener templates'
    });
  }
});

// =========================================================================
// ENDPOINTS: PREFERENCIAS
// =========================================================================

/**
 * GET /api/v1/notification-preferences
 * Obtener preferencias del usuario
 */
router.get('/preferences', async (req, res) => {
  try {
    const preferences = await UserNotificationPreference.getAllForUser(
      req.user.user_id,
      req.user.company_id
    );

    res.json({
      success: true,
      data: preferences.map(p => p.toAPI())
    });

  } catch (error) {
    console.error('[notificationsEnterprise] Error getting preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener preferencias'
    });
  }
});

/**
 * PUT /api/v1/notification-preferences/:module
 * Actualizar preferencias para un módulo
 */
router.put('/preferences/:module', async (req, res) => {
  try {
    const preference = await UserNotificationPreference.updatePreferences(
      req.user.user_id,
      req.user.company_id,
      req.params.module,
      req.body
    );

    res.json({
      success: true,
      data: preference.toAPI()
    });

  } catch (error) {
    console.error('[notificationsEnterprise] Error updating preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar preferencias'
    });
  }
});

module.exports = router;
