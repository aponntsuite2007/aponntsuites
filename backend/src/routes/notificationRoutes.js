const express = require('express');
const router = express.Router();
const { AccessNotification, Visitor, User, Kiosk } = require('../config/database');
const { auth } = require('../middleware/auth');

// Helper: Transformar notificación al formato del frontend
function formatNotification(notification) {
  const notifData = notification.toJSON ? notification.toJSON() : notification;
  return {
    id: notifData.id,
    notificationType: notifData.notification_type,
    priority: notifData.priority,
    recipientUserId: notifData.recipient_user_id,
    title: notifData.title,
    message: notifData.message,
    relatedVisitorId: notifData.related_visitor_id,
    relatedUserId: notifData.related_user_id,
    relatedKioskId: notifData.related_kiosk_id,
    relatedAttendanceId: notifData.related_attendance_id,
    isRead: notifData.is_read,
    readAt: notifData.read_at,
    actionTaken: notifData.action_taken,
    actionType: notifData.action_type,
    actionNotes: notifData.action_notes,
    actionTakenBy: notifData.action_taken_by,
    actionTakenAt: notifData.action_taken_at,
    metadata: notifData.metadata,
    expiresAt: notifData.expires_at,
    createdAt: notifData.created_at,
    updatedAt: notifData.updated_at,
    companyId: notifData.company_id,
    // Datos incluidos
    relatedVisitor: notifData.relatedVisitor,
    relatedUser: notifData.relatedUser,
    relatedKiosk: notifData.relatedKiosk
  };
}

/**
 * @route GET /api/v1/notifications
 * @desc Listar notificaciones del usuario
 */
router.get('/', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;
    const userId = req.user?.user_id || req.user?.id;
    const { unreadOnly, type, priority } = req.query;

    console.log(`🔔 [NOTIFICATIONS] Obteniendo notificaciones para usuario ${userId}`);

    const where = {
      company_id: companyId,
      [require('sequelize').Op.or]: [
        { recipient_user_id: userId },
        { recipient_user_id: null } // Broadcast
      ]
    };

    if (unreadOnly === 'true') {
      where.is_read = false;
    }

    if (type) {
      where.notification_type = type;
    }

    if (priority) {
      where.priority = priority;
    }

    const notifications = await AccessNotification.findAll({
      where: where,
      include: [
        {
          model: Visitor,
          as: 'relatedVisitor',
          attributes: ['id', 'first_name', 'last_name', 'dni'],
          required: false
        },
        {
          model: User,
          as: 'relatedUser',
          attributes: ['user_id', 'firstName', 'lastName'],
          required: false
        },
        {
          model: Kiosk,
          as: 'relatedKiosk',
          attributes: ['id', 'name', 'location'],
          required: false
        }
      ],
      order: [
        ['priority', 'DESC'],
        ['created_at', 'DESC']
      ],
      limit: 100
    });

    console.log(`✅ [NOTIFICATIONS] Encontradas ${notifications.length} notificaciones`);

    const formattedNotifications = notifications.map(formatNotification);

    // Contar no leídas
    const unreadCount = await AccessNotification.count({
      where: {
        company_id: companyId,
        [require('sequelize').Op.or]: [
          { recipient_user_id: userId },
          { recipient_user_id: null }
        ],
        is_read: false
      }
    });

    res.json({
      success: true,
      notifications: formattedNotifications,
      count: formattedNotifications.length,
      unreadCount: unreadCount
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Error obteniendo notificaciones:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/notifications/unread-count
 * @desc Obtener cantidad de notificaciones no leídas
 */
router.get('/unread-count', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;
    const userId = req.user?.user_id || req.user?.id;

    const count = await AccessNotification.count({
      where: {
        company_id: companyId,
        [require('sequelize').Op.or]: [
          { recipient_user_id: userId },
          { recipient_user_id: null }
        ],
        is_read: false
      }
    });

    res.json({
      success: true,
      unreadCount: count
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Error contando notificaciones:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false
    });
  }
});

/**
 * @route GET /api/v1/notifications/groups
 * @desc Obtener notificaciones agrupadas por tipo
 */
router.get('/groups', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;
    const userId = req.user?.user_id || req.user?.id;

    console.log(`📊 [NOTIFICATIONS] Obteniendo grupos de notificaciones para empresa ${companyId}`);

    const notifications = await AccessNotification.findAll({
      where: {
        company_id: companyId,
        [require('sequelize').Op.or]: [
          { recipient_user_id: userId },
          { recipient_user_id: null }
        ]
      },
      attributes: ['id', 'notification_type', 'priority', 'is_read', 'title', 'message', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    // Agrupar por tipo
    const grouped = {};
    notifications.forEach(notif => {
      const type = notif.notification_type || 'general';
      if (!grouped[type]) {
        grouped[type] = {
          type: type,
          count: 0,
          unread: 0,
          notifications: []
        };
      }
      grouped[type].count++;
      if (!notif.is_read) grouped[type].unread++;
      grouped[type].notifications.push(formatNotification(notif));
    });

    const groups = Object.values(grouped);

    res.json({
      success: true,
      groups: groups,
      totalCount: notifications.length
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Error obteniendo grupos:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/notifications/critical
 * @desc Obtener notificaciones críticas sin atender
 */
router.get('/critical', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;

    const notifications = await AccessNotification.findAll({
      where: {
        company_id: companyId,
        priority: 'critical',
        action_taken: false
      },
      include: [
        {
          model: Visitor,
          as: 'relatedVisitor',
          attributes: ['id', 'first_name', 'last_name'],
          required: false
        },
        {
          model: User,
          as: 'relatedUser',
          attributes: ['user_id', 'firstName', 'lastName'],
          required: false
        },
        {
          model: Kiosk,
          as: 'relatedKiosk',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      notifications: notifications.map(formatNotification),
      count: notifications.length
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Error obteniendo notificaciones críticas:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false
    });
  }
});

/**
 * @route GET /api/v1/notifications/:id
 * @desc Obtener notificación específica
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;
    const userId = req.user?.user_id || req.user?.id;

    const notification = await AccessNotification.findOne({
      where: {
        id: req.params.id,
        company_id: companyId,
        [require('sequelize').Op.or]: [
          { recipient_user_id: userId },
          { recipient_user_id: null }
        ]
      },
      include: [
        {
          model: Visitor,
          as: 'relatedVisitor',
          attributes: ['id', 'first_name', 'last_name', 'dni', 'visit_reason'],
          required: false
        },
        {
          model: User,
          as: 'relatedUser',
          attributes: ['user_id', 'first_name', 'last_name', 'email'],
          required: false
        },
        {
          model: Kiosk,
          as: 'relatedKiosk',
          attributes: ['id', 'name', 'location'],
          required: false
        }
      ]
    });

    if (!notification) {
      return res.status(404).json({
        error: 'Notificación no encontrada',
        success: false
      });
    }

    res.json({
      success: true,
      data: formatNotification(notification)
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Error obteniendo notificación:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false
    });
  }
});

/**
 * @route PUT /api/v1/notifications/:id/mark-read
 * @desc Marcar notificación como leída
 */
router.put('/:id/mark-read', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;
    const userId = req.user?.user_id || req.user?.id;

    const notification = await AccessNotification.findOne({
      where: {
        id: req.params.id,
        company_id: companyId,
        [require('sequelize').Op.or]: [
          { recipient_user_id: userId },
          { recipient_user_id: null }
        ]
      }
    });

    if (!notification) {
      return res.status(404).json({
        error: 'Notificación no encontrada',
        success: false
      });
    }

    await notification.markAsRead(userId);

    console.log(`✅ [NOTIFICATIONS] Notificación ${notification.id} marcada como leída`);

    res.json({
      success: true,
      data: formatNotification(notification),
      message: 'Notificación marcada como leída'
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Error marcando notificación:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route PUT /api/v1/notifications/mark-all-read
 * @desc Marcar todas las notificaciones como leídas
 */
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;
    const userId = req.user?.user_id || req.user?.id;

    const result = await AccessNotification.markAllAsReadForUser(userId, companyId);

    console.log(`✅ [NOTIFICATIONS] ${result[0]} notificaciones marcadas como leídas`);

    res.json({
      success: true,
      message: `${result[0]} notificaciones marcadas como leídas`,
      count: result[0]
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Error marcando todas las notificaciones:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route POST /api/v1/notifications/:id/respond
 * @desc Responder a notificación (aprobar/rechazar)
 */
router.post('/:id/respond', auth, async (req, res) => {
  try {
    const { action, notes } = req.body; // action: 'approve' | 'reject'
    const companyId = req.user?.company_id || 1;
    const userId = req.user?.user_id || req.user?.id;

    console.log('💬 [NOTIFICATIONS] Respondiendo notificación:', req.params.id, { action });

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        error: 'Acción inválida. Debe ser "approve" o "reject"',
        success: false
      });
    }

    const notification = await AccessNotification.findOne({
      where: {
        id: req.params.id,
        company_id: companyId,
        [require('sequelize').Op.or]: [
          { recipient_user_id: userId },
          { recipient_user_id: null }
        ]
      }
    });

    if (!notification) {
      return res.status(404).json({
        error: 'Notificación no encontrada',
        success: false
      });
    }

    if (notification.action_taken) {
      return res.status(400).json({
        error: 'Esta notificación ya fue procesada',
        success: false
      });
    }

    // Registrar acción
    await notification.recordAction(action, notes || '', userId);

    // Marcar como leída también
    if (!notification.is_read) {
      await notification.markAsRead(userId);
    }

    console.log(`✅ [NOTIFICATIONS] Notificación respondida: ${action}`);

    // Si es notificación de visitante, actualizar estado del visitante
    if (notification.related_visitor_id && notification.notification_type === 'visitor_authorization') {
      const visitor = await Visitor.findByPk(notification.related_visitor_id);
      if (visitor && visitor.authorization_status === 'pending') {
        await visitor.update({
          authorization_status: action === 'approve' ? 'authorized' : 'rejected',
          authorized_by: userId,
          authorized_at: new Date(),
          rejection_reason: action === 'reject' ? notes : null
        });
      }
    }

    res.json({
      success: true,
      data: formatNotification(notification),
      message: `Notificación ${action === 'approve' ? 'aprobada' : 'rechazada'} exitosamente`
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Error respondiendo notificación:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route DELETE /api/v1/notifications/cleanup
 * @desc Limpiar notificaciones expiradas
 */
router.delete('/cleanup', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;

    const deletedCount = await AccessNotification.cleanupExpired(companyId);

    console.log(`✅ [NOTIFICATIONS] ${deletedCount} notificaciones expiradas eliminadas`);

    res.json({
      success: true,
      message: `${deletedCount} notificaciones expiradas eliminadas`,
      count: deletedCount
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Error limpiando notificaciones:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
