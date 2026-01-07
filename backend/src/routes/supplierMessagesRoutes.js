const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { Op } = require('sequelize');
const {
  SupplierCommunication,
  SupplierCommunicationAttachment,
  WmsSupplier,
  Company,
  User,
  sequelize
} = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { authenticateSupplier } = require('../middleware/supplierAuth');

// ============================================================================
// MULTER CONFIGURATION - Message attachments
// ============================================================================

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/message_attachments');

    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `msg_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
    }
  }
});

// ============================================================================
// ENDPOINT: GET /api/supplier-messages/unread-count
// Obtener cantidad de mensajes no leídos (PROVEEDOR)
// ============================================================================

router.get('/unread-count', authenticateSupplier, async (req, res) => {
  try {
    const { supplierId } = req.supplier;

    const count = await SupplierCommunication.count({
      where: {
        supplier_id: supplierId,
        recipient_type: 'supplier',
        is_read: false
      }
    });

    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Error al obtener contador de mensajes' });
  }
});

// ============================================================================
// ENDPOINT: GET /api/supplier-messages/inbox
// Obtener bandeja de entrada (PROVEEDOR)
// ============================================================================

router.get('/inbox', authenticateSupplier, async (req, res) => {
  try {
    const { supplierId } = req.supplier;
    const { limit = 50, offset = 0, unreadOnly = false } = req.query;

    const where = {
      supplier_id: supplierId,
      recipient_type: 'supplier'
    };

    if (unreadOnly === 'true') {
      where.is_read = false;
    }

    const messages = await SupplierCommunication.findAndCountAll({
      where,
      include: [
        {
          model: Company,
          attributes: ['company_id', 'name', 'contact_email']
        }
      ],
      order: [
        [sequelize.literal(`CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END`)],
        ['created_at', 'DESC']
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      messages: messages.rows,
      total: messages.count,
      unreadCount: await SupplierCommunication.count({
        where: {
          supplier_id: supplierId,
          recipient_type: 'supplier',
          is_read: false
        }
      })
    });
  } catch (error) {
    console.error('Error fetching inbox:', error);
    res.status(500).json({ error: 'Error al cargar bandeja de entrada' });
  }
});

// ============================================================================
// ENDPOINT: GET /api/supplier-messages/sent
// Obtener mensajes enviados (PROVEEDOR)
// ============================================================================

router.get('/sent', authenticateSupplier, async (req, res) => {
  try {
    const { supplierId } = req.supplier;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await SupplierCommunication.findAndCountAll({
      where: {
        supplier_id: supplierId,
        sender_type: 'supplier'
      },
      include: [
        {
          model: Company,
          attributes: ['company_id', 'name', 'contact_email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      messages: messages.rows,
      total: messages.count
    });
  } catch (error) {
    console.error('Error fetching sent messages:', error);
    res.status(500).json({ error: 'Error al cargar mensajes enviados' });
  }
});

// ============================================================================
// ENDPOINT: GET /api/supplier-messages/conversation/:companyId
// Obtener conversación completa con una empresa (PROVEEDOR)
// ============================================================================

router.get('/conversation/:companyId', authenticateSupplier, async (req, res) => {
  try {
    const { supplierId } = req.supplier;
    const { companyId } = req.params;
    const { contextType, contextId } = req.query;

    const where = {
      company_id: companyId,
      supplier_id: supplierId
    };

    if (contextType && contextId) {
      where.context_type = contextType;
      where.context_id = contextId;
    }

    const messages = await SupplierCommunication.findAll({
      where,
      include: [
        {
          model: SupplierCommunicationAttachment,
          as: 'attachments'
        }
      ],
      order: [['created_at', 'ASC']]
    });

    res.json({ messages });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Error al cargar conversación' });
  }
});

// ============================================================================
// ENDPOINT: GET /api/supplier-messages/:id
// Obtener detalle de un mensaje (PROVEEDOR)
// ============================================================================

router.get('/:id', authenticateSupplier, async (req, res) => {
  try {
    const { supplierId } = req.supplier;
    const { id } = req.params;

    const message = await SupplierCommunication.findOne({
      where: {
        id,
        supplier_id: supplierId
      },
      include: [
        {
          model: Company,
          attributes: ['company_id', 'name', 'contact_email']
        },
        {
          model: SupplierCommunicationAttachment,
          as: 'attachments'
        }
      ]
    });

    if (!message) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    res.json({ message });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ error: 'Error al cargar mensaje' });
  }
});

// ============================================================================
// ENDPOINT: POST /api/supplier-messages/send
// Enviar mensaje a empresa (PROVEEDOR)
// ============================================================================

router.post('/send', authenticateSupplier, upload.array('attachments', 5), async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { supplierId, supplierEmail } = req.supplier;
    const { companyId, subject, message, contextType, contextId, priority } = req.body;

    // Validar campos requeridos
    if (!companyId || !subject || !message) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Campos requeridos: companyId, subject, message' });
    }

    // Verificar que el proveedor tenga acceso a esta empresa
    const supplier = await WmsSupplier.findOne({
      where: { supplier_id: supplierId, company_id: companyId }
    });

    if (!supplier) {
      await transaction.rollback();
      return res.status(403).json({ error: 'No tienes acceso a esta empresa' });
    }

    // Crear mensaje
    const newMessage = await SupplierCommunication.create({
      company_id: companyId,
      supplier_id: supplierId,
      context_type: contextType || 'general',
      context_id: contextId || null,
      message_type: 'message',
      subject,
      message,
      sender_type: 'supplier',
      sender_name: supplier.name,
      recipient_type: 'company',
      priority: priority || 'normal',
      has_attachments: req.files && req.files.length > 0,
      attachments_count: req.files ? req.files.length : 0
    }, { transaction });

    // Procesar adjuntos si existen
    if (req.files && req.files.length > 0) {
      const attachments = req.files.map(file => ({
        communication_id: newMessage.id,
        file_name: file.filename,
        original_name: file.originalname,
        file_path: file.path,
        file_size: file.size,
        mime_type: file.mimetype,
        uploaded_by_type: 'supplier',
        uploaded_by_user_id: null
      }));

      await SupplierCommunicationAttachment.bulkCreate(attachments, { transaction });
    }

    await transaction.commit();

    // Cargar mensaje completo con relaciones
    const messageWithRelations = await SupplierCommunication.findByPk(newMessage.id, {
      include: [
        { model: SupplierCommunicationAttachment, as: 'attachments' }
      ]
    });

    res.status(201).json({
      message: 'Mensaje enviado correctamente',
      data: messageWithRelations
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

// ============================================================================
// ENDPOINT: POST /api/supplier-messages/:id/mark-read
// Marcar mensaje como leído (PROVEEDOR)
// ============================================================================

router.post('/:id/mark-read', authenticateSupplier, async (req, res) => {
  try {
    const { supplierId } = req.supplier;
    const { id } = req.params;

    const message = await SupplierCommunication.findOne({
      where: {
        id,
        supplier_id: supplierId,
        recipient_type: 'supplier'
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    if (!message.is_read) {
      message.is_read = true;
      message.read_at = new Date();
      await message.save();
    }

    res.json({ message: 'Mensaje marcado como leído', data: message });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Error al marcar mensaje como leído' });
  }
});

// ============================================================================
// ENDPOINT: GET /api/supplier-messages/statistics
// Obtener estadísticas de mensajería (PROVEEDOR)
// ============================================================================

router.get('/statistics', authenticateSupplier, async (req, res) => {
  try {
    const { supplierId } = req.supplier;

    const [stats] = await sequelize.query(`
      SELECT get_supplier_communication_stats(:supplierId) as stats
    `, {
      replacements: { supplierId }
    });

    res.json({ statistics: stats[0].stats });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Error al cargar estadísticas' });
  }
});

// ============================================================================
// ENDPOINT: POST /api/supplier-messages/bulk-mark-read
// Marcar múltiples mensajes como leídos (PROVEEDOR)
// ============================================================================

router.post('/bulk-mark-read', authenticateSupplier, async (req, res) => {
  try {
    const { supplierId } = req.supplier;
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs' });
    }

    const [affectedCount] = await SupplierCommunication.update(
      {
        is_read: true,
        read_at: new Date()
      },
      {
        where: {
          id: { [Op.in]: messageIds },
          supplier_id: supplierId,
          recipient_type: 'supplier',
          is_read: false
        }
      }
    );

    res.json({
      message: `${affectedCount} mensajes marcados como leídos`,
      count: affectedCount
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Error al marcar mensajes como leídos' });
  }
});

module.exports = router;
