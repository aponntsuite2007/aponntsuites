const express = require('express');
const router = express.Router();
const { Message, User } = require('../config/database');
const { auth, supervisorOrAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

/**
 * @route GET /api/v1/messages
 * @desc Obtener mensajes del usuario
 */
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      isRead,
      priority
    } = req.query;

    const where = { recipientId: req.user.user_id };
    
    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead === 'true';
    if (priority) where.priority = priority;

    // Filtrar mensajes no expirados
    where[Op.or] = [
      { expiresAt: null },
      { expiresAt: { [Op.gt]: new Date() } }
    ];

    const offset = (page - 1) * limit;

    const { count, rows: messages } = await Message.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'sender',
        attributes: ['legajo', 'firstName', 'lastName']
      }],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      messages,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalMessages: count,
      unreadCount: await Message.count({
        where: {
          recipientId: req.user.user_id,
          isRead: false,
          [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gt]: new Date() } }
          ]
        }
      })
    });

  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/messages/:id
 * @desc Obtener mensaje específico
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'sender',
        attributes: ['legajo', 'firstName', 'lastName']
      }]
    });

    if (!message) {
      return res.status(404).json({
        error: 'Mensaje no encontrado'
      });
    }

    // Verificar que el usuario pueda ver este mensaje
    if (message.recipientId !== req.user.user_id && !['admin', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acceso denegado'
      });
    }

    // Marcar como leído si es el destinatario
    if (message.recipientId === req.user.user_id && !message.isRead) {
      await message.update({
        isRead: true,
        readAt: new Date()
      });
    }

    res.json(message);

  } catch (error) {
    console.error('Error obteniendo mensaje:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/messages
 * @desc Crear nuevo mensaje
 */
router.post('/', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const {
      title,
      content,
      type = 'notification',
      priority = 'normal',
      recipientId,
      recipientIds,
      requiresBiometricConfirmation = false,
      expiresAt,
      attachments = [],
      metadata = {},
      relatedEntity,
      relatedEntityId
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        error: 'Título y contenido son requeridos'
      });
    }

    // Determinar destinatarios
    let recipients = [];
    if (recipientId) {
      recipients.push(recipientId);
    } else if (recipientIds && Array.isArray(recipientIds)) {
      recipients = recipientIds;
    } else {
      return res.status(400).json({
        error: 'Debe especificar al menos un destinatario'
      });
    }

    // Verificar que todos los destinatarios existen
    const users = await User.findAll({
      where: { id: recipients }
    });

    if (users.length !== recipients.length) {
      return res.status(400).json({
        error: 'Algunos destinatarios no fueron encontrados'
      });
    }

    // Crear mensajes para cada destinatario
    const messages = await Promise.all(recipients.map(async (recipientId) => {
      return await Message.create({
        title,
        content,
        type,
        priority,
        recipientId,
        senderId: req.user.user_id,
        requiresBiometricConfirmation,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        attachments,
        metadata,
        relatedEntity,
        relatedEntityId
      });
    }));

    res.status(201).json({
      message: `${messages.length} mensaje(s) enviado(s) exitosamente`,
      messageIds: messages.map(m => m.id)
    });

  } catch (error) {
    console.error('Error creando mensaje:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/messages/:id/confirm-biometric
 * @desc Confirmar mensaje con biometría
 */
router.post('/:id/confirm-biometric', auth, async (req, res) => {
  try {
    const { biometricData } = req.body;

    const message = await Message.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({
        error: 'Mensaje no encontrado'
      });
    }

    if (message.recipientId !== req.user.user_id) {
      return res.status(403).json({
        error: 'Acceso denegado'
      });
    }

    if (!message.requiresBiometricConfirmation) {
      return res.status(400).json({
        error: 'Este mensaje no requiere confirmación biométrica'
      });
    }

    if (message.biometricConfirmedAt) {
      return res.status(409).json({
        error: 'Mensaje ya confirmado biométricamente'
      });
    }

    // TODO: Verificar datos biométricos
    // Por ahora solo simulamos la verificación

    await message.update({
      biometricConfirmedAt: new Date(),
      isRead: true,
      readAt: message.readAt || new Date()
    });

    res.json({
      message: 'Mensaje confirmado biométricamente exitosamente'
    });

  } catch (error) {
    console.error('Error confirmando mensaje:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/v1/messages/:id/read
 * @desc Marcar mensaje como leído
 */
router.put('/:id/read', auth, async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({
        error: 'Mensaje no encontrado'
      });
    }

    if (message.recipientId !== req.user.user_id) {
      return res.status(403).json({
        error: 'Acceso denegado'
      });
    }

    if (!message.isRead) {
      await message.update({
        isRead: true,
        readAt: new Date()
      });
    }

    res.json({
      message: 'Mensaje marcado como leído'
    });

  } catch (error) {
    console.error('Error marcando mensaje como leído:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/v1/messages/read-all
 * @desc Marcar todos los mensajes como leídos
 */
router.put('/read-all', auth, async (req, res) => {
  try {
    await Message.update(
      {
        isRead: true,
        readAt: new Date()
      },
      {
        where: {
          recipientId: req.user.user_id,
          isRead: false
        }
      }
    );

    res.json({
      message: 'Todos los mensajes marcados como leídos'
    });

  } catch (error) {
    console.error('Error marcando mensajes como leídos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/messages/stats/unread-count
 * @desc Obtener cantidad de mensajes no leídos
 */
router.get('/stats/unread-count', auth, async (req, res) => {
  try {
    const unreadCount = await Message.count({
      where: {
        recipientId: req.user.user_id,
        isRead: false,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      }
    });

    res.json({ unreadCount });

  } catch (error) {
    console.error('Error obteniendo mensajes no leídos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route DELETE /api/v1/messages/:id
 * @desc Eliminar mensaje (solo admin/supervisor)
 */
router.delete('/:id', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({
        error: 'Mensaje no encontrado'
      });
    }

    await message.destroy();

    res.json({
      message: 'Mensaje eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando mensaje:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;