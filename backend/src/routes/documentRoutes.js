const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult } = require('express-validator');

// Middleware y servicios
const auth = require('../middleware/auth');
const notificationService = require('../services/notificationService');

// Base de datos simulada para documentos
let documentRequests = [];
let userDocuments = [];
let requestIdCounter = 1;
let documentIdCounter = 1;

// Configurar multer para subida de documentos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/documents');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `doc-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen, PDF y documentos'));
    }
  },
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB límite
});

// Obtener solicitudes de documentos del usuario
router.get('/requests', auth, async (req, res) => {
  try {
    const userRequests = documentRequests
      .filter(req => req.employeeId === req.user.user_id)
      .map(request => ({
        id: request.id,
        type: request.type,
        description: request.description,
        status: request.status,
        deadline: request.deadline,
        createdAt: request.createdAt,
        isUrgent: request.deadline && new Date(request.deadline).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: userRequests,
    });

  } catch (error) {
    console.error('Error obteniendo solicitudes de documentos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener documentos del usuario
router.get('/my-documents', auth, async (req, res) => {
  try {
    const myDocs = userDocuments
      .filter(doc => doc.employeeId === req.user.user_id)
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({
      success: true,
      data: myDocs,
    });

  } catch (error) {
    console.error('Error obteniendo mis documentos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Subir documento general
router.post('/upload',
  auth,
  upload.single('document'),
  [
    body('type').notEmpty().withMessage('Tipo de documento es obligatorio'),
    body('category').optional(),
    body('description').optional(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          details: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No se proporcionó archivo'
        });
      }

      const { type, category, description } = req.body;

      // Crear registro de documento
      const document = {
        id: `doc-${documentIdCounter++}`,
        employeeId: req.user.user_id,
        employeeName: `${req.user.firstName} ${req.user.lastName}`,
        type,
        category: category || 'general',
        description: description || '',
        filename: req.file.originalname,
        storedFilename: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimetype: req.file.mimetype,
        status: 'uploaded',
        uploadedAt: new Date(),
        metadata: {
          uploadIp: req.ip,
          userAgent: req.get('User-Agent')
        }
      };

      userDocuments.push(document);

      console.log(`📄 Documento subido: ${document.filename} por ${document.employeeName}`);

      // Enviar notificación al personal médico
      try {
        await notificationService.sendFehacienteNotification({
          employeeId: 'MEDICAL_DEPT',
          senderId: req.user.user_id,
          subject: `📄 NUEVO DOCUMENTO: ${document.employeeName}`,
          content: `Se ha subido un nuevo documento:
          
📄 Archivo: ${document.filename}
📂 Tipo: ${_getTypeLabel(type)}
👤 Empleado: ${document.employeeName}
📝 Descripción: ${description || 'Sin descripción'}
📅 Fecha: ${new Date().toLocaleString('es-ES')}

Revise el documento en el panel administrativo.`,
          priority: 'normal',
          documentType: 'document_upload',
          metadata: {
            documentId: document.id,
            documentType: type,
            employeeId: req.user.user_id
          }
        });
      } catch (notifError) {
        console.error('Error enviando notificación de documento:', notifError);
      }

      res.status(201).json({
        success: true,
        message: 'Documento subido correctamente',
        data: {
          documentId: document.id,
          filename: document.filename,
          type: document.type,
          uploadedAt: document.uploadedAt
        }
      });

    } catch (error) {
      console.error('Error subiendo documento:', error);
      res.status(500).json({
        success: false,
        error: 'Error subiendo documento',
        details: error.message
      });
    }
  }
);

// Subir documento para solicitud específica
router.post('/upload-for-request',
  auth,
  upload.single('document'),
  [
    body('requestId').notEmpty().withMessage('ID de solicitud es obligatorio'),
    body('type').notEmpty().withMessage('Tipo de documento es obligatorio'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          details: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No se proporcionó archivo'
        });
      }

      const { requestId, type } = req.body;

      // Buscar la solicitud
      const request = documentRequests.find(r => r.id === requestId && r.employeeId === req.user.user_id);
      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Solicitud no encontrada'
        });
      }

      // Crear registro de documento
      const document = {
        id: `doc-${documentIdCounter++}`,
        employeeId: req.user.user_id,
        employeeName: `${req.user.firstName} ${req.user.lastName}`,
        requestId: requestId,
        type,
        filename: req.file.originalname,
        storedFilename: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimetype: req.file.mimetype,
        status: 'uploaded',
        uploadedAt: new Date(),
        metadata: {
          requestId,
          uploadIp: req.ip,
          userAgent: req.get('User-Agent')
        }
      };

      userDocuments.push(document);

      // Actualizar estado de la solicitud
      request.status = 'completed';
      request.completedAt = new Date();
      request.documentId = document.id;

      console.log(`📄 Documento para solicitud ${requestId}: ${document.filename} por ${document.employeeName}`);

      // Enviar notificación fehaciente de cumplimiento
      try {
        await notificationService.sendFehacienteNotification({
          employeeId: 'MEDICAL_DEPT',
          senderId: req.user.user_id,
          subject: `✅ SOLICITUD CUMPLIDA: ${document.employeeName}`,
          content: `La solicitud de documento ha sido cumplida:

📄 Documento solicitado: ${_getTypeLabel(type)}
📎 Archivo entregado: ${document.filename}
👤 Empleado: ${document.employeeName}
📅 Fecha de entrega: ${new Date().toLocaleString('es-ES')}
🆔 ID Solicitud: ${requestId}

El documento está disponible para revisión en el panel administrativo.`,
          priority: 'alta',
          documentType: 'document_fulfillment',
          metadata: {
            documentId: document.id,
            requestId: requestId,
            employeeId: req.user.user_id
          }
        });

        // Notificar al empleado la confirmación
        await notificationService.sendFehacienteNotification({
          employeeId: req.user.user_id,
          senderId: 'SYSTEM',
          subject: '✅ Documento Entregado Correctamente',
          content: `Su documento ha sido entregado exitosamente:

📄 Documento: ${_getTypeLabel(type)}
📎 Archivo: ${document.filename}
📅 Fecha: ${new Date().toLocaleString('es-ES')}

Gracias por cumplir con la solicitud médica.`,
          priority: 'normal',
          documentType: 'delivery_confirmation',
          metadata: {
            documentId: document.id,
            requestId: requestId
          }
        });

      } catch (notifError) {
        console.error('Error enviando notificaciones:', notifError);
      }

      res.status(201).json({
        success: true,
        message: 'Documento enviado correctamente para la solicitud',
        data: {
          documentId: document.id,
          requestId: requestId,
          filename: document.filename,
          status: 'completed',
          uploadedAt: document.uploadedAt
        }
      });

    } catch (error) {
      console.error('Error subiendo documento para solicitud:', error);
      res.status(500).json({
        success: false,
        error: 'Error subiendo documento para solicitud',
        details: error.message
      });
    }
  }
);

// Eliminar documento
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const documentIndex = userDocuments.findIndex(d => d.id === id && d.employeeId === req.user.user_id);
    if (documentIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Documento no encontrado'
      });
    }

    const document = userDocuments[documentIndex];

    // Eliminar archivo físico
    try {
      await fs.unlink(document.filePath);
    } catch (fileError) {
      console.error('Error eliminando archivo:', fileError);
    }

    // Eliminar de la base de datos
    userDocuments.splice(documentIndex, 1);

    console.log(`🗑️ Documento eliminado: ${document.filename} por ${document.employeeName}`);

    res.json({
      success: true,
      message: 'Documento eliminado correctamente'
    });

  } catch (error) {
    console.error('Error eliminando documento:', error);
    res.status(500).json({
      success: false,
      error: 'Error eliminando documento'
    });
  }
});

// Descargar documento
router.get('/:id/download', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = userDocuments.find(d => d.id === id && d.employeeId === req.user.user_id);
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Documento no encontrado'
      });
    }

    // Verificar que el archivo existe
    try {
      await fs.access(document.filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Archivo no encontrado en el servidor'
      });
    }

    res.download(document.filePath, document.filename);

  } catch (error) {
    console.error('Error descargando documento:', error);
    res.status(500).json({
      success: false,
      error: 'Error descargando documento'
    });
  }
});

// Crear nueva solicitud de documento (para médicos)
router.post('/create-request',
  auth,
  [
    body('employeeId').notEmpty().withMessage('ID de empleado es obligatorio'),
    body('type').notEmpty().withMessage('Tipo de documento es obligatorio'),
    body('description').optional(),
    body('deadline').optional().isISO8601().withMessage('Fecha límite inválida'),
  ],
  async (req, res) => {
    try {
      // Verificar permisos médicos
      if (!req.user || (req.user.role !== 'medical' && req.user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          error: 'Permisos insuficientes'
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          details: errors.array()
        });
      }

      const { employeeId, type, description, deadline } = req.body;

      const request = {
        id: `req-${Date.now()}${requestIdCounter++}`,
        employeeId,
        requestedBy: req.user.user_id,
        requestedByName: `${req.user.firstName} ${req.user.lastName}`,
        type,
        description: description || `Se requiere ${_getTypeLabel(type)}`,
        deadline: deadline ? new Date(deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días por defecto
        status: 'pending',
        createdAt: new Date(),
        completedAt: null,
        documentId: null
      };

      documentRequests.push(request);

      // Obtener información del empleado (simulada)
      const employeeName = 'Juan Pérez'; // En producción, obtener de la base de datos
      const employeePhone = '+11-2657-673741';
      const employeeEmail = 'juan.perez@empresa.com';

      console.log(`📄 === NUEVA SOLICITUD DE DOCUMENTO ===`);
      console.log(`👤 Empleado: ${employeeName}`);
      console.log(`📄 Tipo: ${type}`);
      console.log(`📝 Descripción: ${description}`);
      console.log(`🆔 ID Solicitud: ${request.id}`);
      console.log(`📅 Vencimiento: ${request.deadline.toLocaleDateString('es-ES')}`);
      console.log(`⏰ Creado: ${request.createdAt.toLocaleString('es-ES')}`);
      console.log(`=======================================\n`);

      // Enviar notificaciones fehacientes al empleado
      try {
        const typeLabel = _getTypeLabel(type);
        const formattedDeadline = request.deadline.toLocaleDateString('es-ES');
        
        // WhatsApp
        const whatsappMessage = `🏥 DOCUMENTO REQUERIDO: Se solicita ${typeLabel}. ${description}. Suba el documento a la app antes del ${formattedDeadline}.`;
        console.log(`📱 WhatsApp enviado a ${employeePhone}: "${whatsappMessage}"`);

        // Email
        const emailSubject = `Documento médico requerido - ${typeLabel}`;
        console.log(`📧 Email enviado a ${employeeEmail}: "${emailSubject}"`);

        await notificationService.sendFehacienteNotification({
          employeeId: employeeId,
          senderId: req.user.user_id,
          subject: `🏥 DOCUMENTO REQUERIDO: ${typeLabel}`,
          content: `Se le solicita entregar el siguiente documento médico:

📄 Documento requerido: ${typeLabel}
📝 Descripción: ${description || 'Sin descripción adicional'}
📅 Fecha límite: ${formattedDeadline}
🏥 Solicitado por: ${request.requestedByName}

Por favor, suba el documento a través de la aplicación móvil antes de la fecha límite.

Esta es una comunicación fehaciente con validez legal.`,
          priority: 'media',
          documentType: 'document_request',
          metadata: {
            requestId: request.id,
            documentType: type,
            deadline: request.deadline.toISOString()
          }
        });

      } catch (notifError) {
        console.error('Error enviando notificaciones:', notifError);
      }

      res.status(201).json({
        success: true,
        message: 'Solicitud de documento creada y enviada',
        data: {
          requestId: request.id,
          employeeId: employeeId,
          type: request.type,
          deadline: request.deadline,
          status: request.status
        }
      });

    } catch (error) {
      console.error('Error creando solicitud de documento:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

// Marcar solicitud como completada
router.post('/requests/:id/complete', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const request = documentRequests.find(r => r.id === id && r.employeeId === req.user.user_id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada'
      });
    }

    request.status = 'completed';
    request.completedAt = new Date();

    res.json({
      success: true,
      message: 'Solicitud marcada como completada',
      data: {
        requestId: request.id,
        status: request.status,
        completedAt: request.completedAt
      }
    });

  } catch (error) {
    console.error('Error marcando solicitud como completada:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// === RUTAS ADMINISTRATIVAS ===

// Obtener todas las solicitudes (para médicos/admin)
router.get('/admin/requests', auth, async (req, res) => {
  try {
    // Verificar permisos
    if (!req.user || (req.user.role !== 'medical' && req.user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        error: 'Permisos insuficientes'
      });
    }

    const { status, type } = req.query;
    let filteredRequests = [...documentRequests];

    if (status) {
      filteredRequests = filteredRequests.filter(r => r.status === status);
    }
    if (type) {
      filteredRequests = filteredRequests.filter(r => r.type === type);
    }

    filteredRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: filteredRequests,
      total: filteredRequests.length
    });

  } catch (error) {
    console.error('Error obteniendo solicitudes administrativas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener todos los documentos (para médicos/admin)
router.get('/admin/documents', auth, async (req, res) => {
  try {
    // Verificar permisos
    if (!req.user || (req.user.role !== 'medical' && req.user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        error: 'Permisos insuficientes'
      });
    }

    const { type, employeeId } = req.query;
    let filteredDocs = [...userDocuments];

    if (type) {
      filteredDocs = filteredDocs.filter(d => d.type === type);
    }
    if (employeeId) {
      filteredDocs = filteredDocs.filter(d => d.employeeId === employeeId);
    }

    filteredDocs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({
      success: true,
      data: filteredDocs,
      total: filteredDocs.length
    });

  } catch (error) {
    console.error('Error obteniendo documentos administrativos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Función auxiliar para etiquetas de tipos
function _getTypeLabel(type) {
  const labels = {
    'certificates': 'Certificados Médicos',
    'medical_reports': 'Informes Médicos',
    'lab_results': 'Resultados de Laboratorio',
    'prescriptions': 'Recetas Médicas',
    'xrays': 'Radiografías',
    'studies': 'Estudios Médicos',
    'general': 'Documento General'
  };
  return labels[type] || type;
}

module.exports = router;