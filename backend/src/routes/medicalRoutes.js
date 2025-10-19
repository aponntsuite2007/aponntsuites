const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult, param, query } = require('express-validator');
const { Op } = require('sequelize');

// Middleware de autenticación
const auth = require('../middleware/auth');

// Importar modelos desde database.js
const {
  MedicalCertificate,
  MedicalPrescription,
  MedicalQuestionnaire,
  MedicalDiagnosis,
  MedicalPhoto,
  MedicalStudy,
  EmployeeMedicalRecord,
  MedicalHistory,
  User,
  Message,
  Department
} = require('../config/database');

// Importar servicio de notificaciones enterprise
const NotificationWorkflowService = require('../services/NotificationWorkflowService');

// Importar sistema modular Plug & Play
const { useModuleIfAvailable } = require('../utils/moduleHelper');

// Importar servicio de notificaciones (temporal mock para WhatsApp/SMS)
// const notificationService = require('../services/notificationService');
const notificationService = {
  sendNotification: async () => ({ success: true, message: 'Notification sent' })
};

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/medical-certificates');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `medical-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes JPEG, PNG y archivos PDF.'));
    }
  }
});

// ==== RUTAS DE CERTIFICADOS MÉDICOS ====

// Crear nuevo certificado médico
router.post('/certificates',
  auth,
  [
    body('startDate').isISO8601().withMessage('Fecha de inicio inválida'),
    body('requestedDays').isInt({ min: 1 }).withMessage('Los días solicitados deben ser mayor a 0'),
    body('symptoms').notEmpty().withMessage('Los síntomas son obligatorios'),
    body('hasVisitedDoctor').isBoolean().withMessage('Debe indicar si visitó un médico'),
    body('medicalCenter').if(body('hasVisitedDoctor').equals('true')).notEmpty().withMessage('Centro médico obligatorio si visitó médico'),
    body('attendingPhysician').if(body('hasVisitedDoctor').equals('true')).notEmpty().withMessage('Médico tratante obligatorio si visitó médico')
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

      const {
        startDate,
        requestedDays,
        symptoms,
        hasVisitedDoctor,
        medicalCenter,
        attendingPhysician,
        medicalPrescription,
        diagnosisCode,
        diagnosis,
        questionnaire,
        attachments
      } = req.body;

      // Calcular fecha de fin
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + requestedDays - 1);

      // Crear certificado
      const certificate = await MedicalCertificate.create({
        userId: req.user.user_id,
        issueDate: new Date(),
        startDate: new Date(startDate),
        endDate: endDate,
        requestedDays,
        symptoms,
        hasVisitedDoctor,
        medicalCenter,
        attendingPhysician,
        medicalPrescription,
        diagnosisCode,
        diagnosis,
        questionnaire,
        attachments,
        status: 'pending',
        needsAudit: true,
        createdBy: req.user.user_id
      });

      // Cargar datos del usuario para notificaciones
      const user = await User.findByPk(req.user.user_id);

      // Enviar notificaciones a médicos y RRHH
      await sendMedicalCertificateNotifications(certificate, user);

      res.status(201).json({
        success: true,
        data: certificate
      });
    } catch (error) {
      console.error('Error creating medical certificate:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

// Obtener certificados del usuario actual
router.get('/certificates/my', auth, async (req, res) => {
  try {
    const certificates = await MedicalCertificate.findAll({
      where: { userId: req.user.user_id },
      include: [
        {
          model: User,
          as: 'auditor',
          attributes: ['firstName', 'lastName', 'role']
        },
        {
          model: MedicalPrescription,
          as: 'prescriptions'
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: certificates
    });
  } catch (error) {
    console.error('Error fetching user certificates:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener todos los certificados (solo médicos y administradores)
router.get('/certificates', 
  auth,
  requireRole(['admin', 'medical', 'supervisor']),
  async (req, res) => {
    try {
      const { status, userId, startDate, endDate, page = 1, limit = 10 } = req.query;
      
      const whereClause = {};
      if (status) whereClause.status = status;
      if (userId) whereClause.userId = userId;
      if (startDate && endDate) {
        whereClause.startDate = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const offset = (page - 1) * limit;

      const { count, rows: certificates } = await MedicalCertificate.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'employee',
            attributes: ['firstName', 'lastName', 'legajo', 'dni']
          },
          {
            model: User,
            as: 'auditor',
            attributes: ['firstName', 'lastName', 'role']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: certificates,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching certificates:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

// Responder a certificado médico (solo médicos autorizados)
router.post('/certificates/:id/respond',
  auth,
  requireRole(['medical', 'admin']),
  [
    param('id').isUUID().withMessage('ID de certificado inválido'),
    body('isJustified').isBoolean().withMessage('Debe indicar si está justificado'),
    body('approvedDays').isInt({ min: 0 }).withMessage('Días aprobados debe ser un número positivo'),
    body('needsAudit').isBoolean().withMessage('Debe indicar si necesita auditoría'),
    body('auditorResponse').notEmpty().withMessage('La respuesta del auditor es obligatoria')
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

      const certificateId = req.params.id;
      const { isJustified, approvedDays, needsAudit, auditorResponse } = req.body;

      const certificate = await MedicalCertificate.findByPk(certificateId, {
        include: [
          {
            model: User,
            as: 'employee',
            attributes: ['firstName', 'lastName', 'email', 'phone']
          }
        ]
      });

      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: 'Certificado no encontrado'
        });
      }

      // Actualizar certificado
      await certificate.update({
        auditorId: req.user.user_id,
        auditorResponse,
        approvedDays,
        needsAudit,
        isJustified,
        auditDate: new Date(),
        status: isJustified ? 'approved' : 'rejected',
        lastModifiedBy: req.user.user_id
      });

      // Enviar notificación al empleado y RRHH
      await sendMedicalResponseNotifications(certificate, req.user);

      res.json({
        success: true,
        data: certificate
      });
    } catch (error) {
      console.error('Error responding to certificate:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

// ==== RUTAS DE PRESCRIPCIONES ====

// Crear nueva prescripción
router.post('/prescriptions',
  auth,
  [
    body('certificateId').isUUID().withMessage('ID de certificado inválido'),
    body('physicianName').notEmpty().withMessage('Nombre del médico obligatorio'),
    body('medications').isArray({ min: 1 }).withMessage('Debe incluir al menos un medicamento')
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

      const prescription = await MedicalPrescription.create({
        ...req.body,
        userId: req.user.user_id,
        createdBy: req.user.user_id,
        issueDate: new Date()
      });

      res.status(201).json({
        success: true,
        data: prescription
      });
    } catch (error) {
      console.error('Error creating prescription:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

// Obtener prescripciones del usuario
router.get('/prescriptions/my', auth, async (req, res) => {
  try {
    const prescriptions = await MedicalPrescription.findAll({
      where: { userId: req.user.user_id },
      include: [
        {
          model: MedicalCertificate,
          as: 'certificate',
          attributes: ['id', 'startDate', 'endDate', 'status']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: prescriptions
    });
  } catch (error) {
    console.error('Error fetching user prescriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ==== RUTAS DE CUESTIONARIOS ====

// Obtener cuestionarios disponibles
router.get('/questionnaires', auth, async (req, res) => {
  try {
    const { branchId } = req.query;
    
    const whereClause = { isActive: true };
    if (branchId) {
      whereClause[Op.or] = [
        { branchId: branchId },
        { branchId: null } // Cuestionarios globales
      ];
    }

    const questionnaires = await MedicalQuestionnaire.findAll({
      where: whereClause,
      order: [
        ['isDefault', 'DESC'],
        ['name', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: questionnaires
    });
  } catch (error) {
    console.error('Error fetching questionnaires:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Crear cuestionario (solo administradores y médicos)
router.post('/questionnaires',
  auth,
  requireRole(['admin', 'medical']),
  [
    body('name').notEmpty().withMessage('Nombre del cuestionario obligatorio'),
    body('questions').isArray({ min: 1 }).withMessage('Debe incluir al menos una pregunta')
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

      const questionnaire = await MedicalQuestionnaire.create({
        ...req.body,
        createdBy: req.user.user_id
      });

      res.status(201).json({
        success: true,
        data: questionnaire
      });
    } catch (error) {
      console.error('Error creating questionnaire:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

// ==== RUTAS DE DIAGNÓSTICOS ====

// Obtener diagnósticos disponibles
router.get('/diagnoses', auth, async (req, res) => {
  try {
    const { search, category } = req.query;
    
    const whereClause = { isActive: true };
    if (search) {
      whereClause[Op.or] = [
        { code: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (category) {
      whereClause.category = category;
    }

    const diagnoses = await MedicalDiagnosis.findAll({
      where: whereClause,
      order: [['code', 'ASC']]
    });

    res.json({
      success: true,
      data: diagnoses
    });
  } catch (error) {
    console.error('Error fetching diagnoses:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ==== SUBIDA DE ARCHIVOS ====

// Subir archivo médico
router.post('/upload',
  auth,
  upload.single('file'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No se proporcionó ningún archivo'
        });
      }

      const fileUrl = `/uploads/medical-certificates/${req.file.filename}`;
      
      res.json({
        success: true,
        data: {
          url: fileUrl,
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: req.file.size
        }
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({
        success: false,
        error: 'Error subiendo archivo'
      });
    }
  }
);

// ==== FUNCIONES AUXILIARES ====

// Middleware para verificar roles
function requireRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permisos para realizar esta acción'
      });
    }
    next();
  };
}

// Enviar notificaciones de nuevo certificado
async function sendMedicalCertificateNotifications(certificate, employee) {
  try {
    // Obtener departamento del empleado
    const userWithDept = await User.findByPk(employee.user_id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ]
    });

    // Determinar prioridad según días solicitados
    const priority = certificate.requestedDays > 7 ? 'high' :
                     certificate.requestedDays > 3 ? 'medium' : 'normal';

    console.log(`🔔 [MEDICAL] Generando notificación de certificado médico: ${employee.firstName} ${employee.lastName} - ${certificate.requestedDays} días`);

    // 🔔 GENERAR NOTIFICACIÓN CON WORKFLOW AUTOMÁTICO
    // 🔌 PLUG & PLAY: Solo se envía si el módulo 'notifications-enterprise' está activo
    await useModuleIfAvailable(employee.company_id, 'notifications-enterprise', async () => {
      return await NotificationWorkflowService.createNotification({
        module: 'medical',
        notificationType: 'certificate_submitted',
        companyId: employee.company_id,
        category: 'approval_request',
        priority: priority,
        templateKey: 'medical_certificate_review',
        variables: {
          employee_name: `${employee.firstName} ${employee.lastName}`,
          employee_id: employee.employeeId || employee.user_id.substring(0, 8),
          department: userWithDept?.department?.name || 'Sin departamento',
          requested_days: certificate.requestedDays,
          start_date: certificate.startDate.toLocaleDateString('es-AR'),
          end_date: certificate.endDate.toLocaleDateString('es-AR'),
          symptoms: certificate.symptoms,
          has_visited_doctor: certificate.hasVisitedDoctor ? 'Sí' : 'No',
          medical_center: certificate.medicalCenter || 'No especificado',
          attending_physician: certificate.attendingPhysician || 'No especificado',
          diagnosis: certificate.diagnosis || 'Sin diagnóstico',
          issue_date: certificate.issueDate.toLocaleDateString('es-AR')
        },
        relatedEntityType: 'medical_certificate',
        relatedEntityId: certificate.id,
        relatedUserId: employee.user_id,
        relatedDepartmentId: userWithDept?.department?.id,
        relatedMedicalCertificateId: certificate.id,
        entity: {
          requested_days: certificate.requestedDays,
          has_visited_doctor: certificate.hasVisitedDoctor,
          needs_audit: certificate.needsAudit
        },
        sendEmail: certificate.requestedDays > 7, // Enviar email si son más de 7 días
        metadata: {
          certificate_id: certificate.id,
          symptoms: certificate.symptoms,
          diagnosis_code: certificate.diagnosisCode,
          medical_center: certificate.medicalCenter,
          auto_generated: true
        }
      });
    }, () => {
      // Fallback: Módulo no activo, certificado guardado sin notificar
      console.log('⏭️  [MEDICAL] Módulo notificaciones no activo - Certificado guardado sin notificar');
      return null;
    });

    console.log(`✅ [MEDICAL] Notificación generada para certificado ${certificate.id}`);

  } catch (error) {
    console.error('[sendMedicalCertificateNotifications] Error:', error);
  }
}

// Enviar notificaciones de respuesta médica
async function sendMedicalResponseNotifications(certificate, auditor) {
  try {
    const employee = await User.findByPk(certificate.userId, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!employee) {
      console.error('[sendMedicalResponseNotifications] Empleado no encontrado');
      return;
    }

    const status = certificate.isJustified ? 'approved' : 'rejected';
    const statusText = certificate.isJustified ? 'APROBADO' : 'RECHAZADO';

    console.log(`🔔 [MEDICAL] Generando notificación de respuesta: ${employee.firstName} ${employee.lastName} - ${statusText}`);

    // 🔔 GENERAR NOTIFICACIÓN INFORMATIVA (NO REQUIERE ACCIÓN)
    // 🔌 PLUG & PLAY: Solo se envía si el módulo 'notifications-enterprise' está activo
    await useModuleIfAvailable(employee.company_id, 'notifications-enterprise', async () => {
      return await NotificationWorkflowService.createNotification({
        module: 'medical',
        notificationType: 'certificate_response',
        companyId: employee.company_id,
        category: 'informational',
        priority: 'high',
        templateKey: 'medical_certificate_response',
        variables: {
          employee_name: `${employee.firstName} ${employee.lastName}`,
          employee_id: employee.employeeId || employee.user_id.substring(0, 8),
          status: statusText,
          status_color: certificate.isJustified ? 'success' : 'danger',
          requested_days: certificate.requestedDays,
          approved_days: certificate.approvedDays || 0,
          auditor_name: `${auditor.firstName} ${auditor.lastName}`,
          auditor_response: certificate.auditorResponse,
          audit_date: new Date().toLocaleDateString('es-AR'),
          start_date: certificate.startDate.toLocaleDateString('es-AR'),
          end_date: certificate.endDate.toLocaleDateString('es-AR')
        },
        relatedEntityType: 'medical_certificate',
        relatedEntityId: certificate.id,
        relatedUserId: employee.user_id,
        relatedDepartmentId: employee.department?.id,
        relatedMedicalCertificateId: certificate.id,
        recipientRole: 'employee', // Esta notificación va al empleado directamente
        recipientUserId: employee.user_id,
        entity: {
          status: status,
          approved_days: certificate.approvedDays,
          is_justified: certificate.isJustified
        },
        sendEmail: true, // Siempre enviar email en respuestas
        metadata: {
          certificate_id: certificate.id,
          auditor_id: auditor.user_id,
          audit_date: new Date(),
          final_decision: status,
          auto_generated: true
        }
      });
    }, () => {
      // Fallback: Módulo no activo, respuesta registrada sin notificar
      console.log('⏭️  [MEDICAL] Módulo notificaciones no activo - Respuesta registrada sin notificar');
      return null;
    });

    console.log(`✅ [MEDICAL] Notificación de respuesta generada para certificado ${certificate.id}`);

  } catch (error) {
    console.error('[sendMedicalResponseNotifications] Error:', error);
  }
}

// ==== RUTAS DE FOTOS MÉDICAS ====

// Solicitar foto médica (solo médicos)
router.post('/photos/request',
  auth,
  requireRole(['medical', 'admin']),
  [
    body('certificateId').isUUID().withMessage('ID de certificado inválido'),
    body('bodyPart').notEmpty().withMessage('Parte del cuerpo es obligatoria'),
    body('photoType').isIn(['injury', 'lesion', 'swelling', 'rash', 'wound', 'other']).withMessage('Tipo de foto inválido'),
    body('requestReason').notEmpty().withMessage('Motivo de la solicitud obligatorio')
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

      const { certificateId, bodyPart, bodyPartDetail, photoType, requestReason, requestInstructions, isRequired } = req.body;

      // Verificar que el certificado existe
      const certificate = await MedicalCertificate.findByPk(certificateId);
      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: 'Certificado no encontrado'
        });
      }

      const photoRequest = await MedicalPhoto.create({
        certificateId,
        userId: certificate.userId,
        requestedById: req.user.user_id,
        bodyPart,
        bodyPartDetail,
        photoType,
        requestReason,
        requestInstructions,
        isRequired: isRequired ?? true,
        status: 'requested'
      });

      // Notificar al empleado
      await Message.create({
        senderId: req.user.user_id,
        receiverId: certificate.userId,
        title: 'Solicitud de Foto Médica',
        content: `Se ha solicitado una foto de: ${bodyPart}. Motivo: ${requestReason}`,
        type: 'photo_request',
        priority: 'high'
      });

      // Enviar notificación WhatsApp/SMS al empleado
      const employee = await User.findByPk(certificate.userId);
      const requestingDoctor = await User.findByPk(req.user.user_id);
      
      if (employee && requestingDoctor) {
        const employeeData = {
          firstName: employee.firstName,
          lastName: employee.lastName,
          phone: employee.phone,
          personalPhone: employee.personalPhone
        };

        const photoRequestData = {
          bodyPart,
          bodyPartDetail,
          photoType,
          photoTypeText: getPhotoTypeText(photoType),
          requestReason,
          requestInstructions,
          isRequired,
          doctorName: `${requestingDoctor.firstName} ${requestingDoctor.lastName}`
        };

        await notificationService.notifyPhotoRequested(employeeData, photoRequestData);
      }

      res.status(201).json({
        success: true,
        data: photoRequest
      });
    } catch (error) {
      console.error('Error requesting photo:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

// Subir foto médica solicitada
router.post('/photos/:id/upload',
  auth,
  upload.single('photo'),
  [
    param('id').isUUID().withMessage('ID de solicitud inválido')
  ],
  async (req, res) => {
    try {
      const photoRequest = await MedicalPhoto.findByPk(req.params.id);
      
      if (!photoRequest) {
        return res.status(404).json({
          success: false,
          error: 'Solicitud de foto no encontrada'
        });
      }

      if (photoRequest.userId !== req.user.user_id) {
        return res.status(403).json({
          success: false,
          error: 'No autorizado'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No se proporcionó archivo'
        });
      }

      const photoUrl = `/uploads/medical-certificates/${req.file.filename}`;

      await photoRequest.update({
        photoUrl,
        originalFileName: req.file.originalname,
        fileSize: req.file.size,
        photoDate: new Date(),
        status: 'uploaded',
        employeeNotes: req.body.notes
      });

      // Notificar al médico
      await Message.create({
        senderId: req.user.user_id,
        receiverId: photoRequest.requestedById,
        title: 'Foto Médica Subida',
        content: `El empleado ha subido la foto solicitada de ${photoRequest.bodyPart}`,
        type: 'photo_uploaded',
        priority: 'normal'
      });

      // Enviar notificación WhatsApp/SMS al médico
      const medicalStaff = await User.findByPk(photoRequest.requestedById);
      
      if (medicalStaff) {
        const medicalStaffData = {
          phone: medicalStaff.phone
        };

        const photoData = {
          bodyPart: photoRequest.bodyPart,
          photoType: photoRequest.photoType,
          photoTypeText: getPhotoTypeText(photoRequest.photoType),
          photoDate: photoRequest.photoDate
        };

        await notificationService.notifyPhotoUploaded(medicalStaffData, photoData);
      }

      res.json({
        success: true,
        data: photoRequest
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

// Obtener fotos solicitadas al usuario
router.get('/photos/my-requests', auth, async (req, res) => {
  try {
    const photoRequests = await MedicalPhoto.findAll({
      where: { userId: req.user.user_id },
      include: [
        {
          model: User,
          as: 'requestedBy',
          attributes: ['firstName', 'lastName']
        },
        {
          model: MedicalCertificate,
          as: 'certificate',
          attributes: ['id', 'startDate', 'status']
        }
      ],
      order: [['requestDate', 'DESC']]
    });

    res.json({
      success: true,
      data: photoRequests
    });
  } catch (error) {
    console.error('Error fetching photo requests:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Revisar foto médica (solo médicos)
router.post('/photos/:id/review',
  auth,
  requireRole(['medical', 'admin']),
  [
    param('id').isUUID().withMessage('ID de foto inválido'),
    body('medicalReview').notEmpty().withMessage('Comentario médico obligatorio')
  ],
  async (req, res) => {
    try {
      const photoRequest = await MedicalPhoto.findByPk(req.params.id);
      
      if (!photoRequest) {
        return res.status(404).json({
          success: false,
          error: 'Foto no encontrada'
        });
      }

      await photoRequest.update({
        medicalReview: req.body.medicalReview,
        reviewedAt: new Date(),
        reviewedById: req.user.user_id,
        status: 'reviewed'
      });

      res.json({
        success: true,
        data: photoRequest
      });
    } catch (error) {
      console.error('Error reviewing photo:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

// ==== RUTAS DE ESTUDIOS MÉDICOS ====

// Subir estudio médico
router.post('/studies',
  auth,
  upload.single('studyFile'),
  [
    body('certificateId').isUUID().withMessage('ID de certificado inválido'),
    body('studyType').notEmpty().withMessage('Tipo de estudio obligatorio'),
    body('studyName').notEmpty().withMessage('Nombre del estudio obligatorio'),
    body('studyDate').isISO8601().withMessage('Fecha del estudio inválida')
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

      let fileUrl = null;
      if (req.file) {
        fileUrl = `/uploads/medical-certificates/${req.file.filename}`;
      }

      const study = await MedicalStudy.create({
        ...req.body,
        userId: req.user.user_id,
        mainFileUrl: fileUrl,
        studyDate: new Date(req.body.studyDate)
      });

      res.status(201).json({
        success: true,
        data: study
      });
    } catch (error) {
      console.error('Error creating study:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

// Obtener estudios del usuario
router.get('/studies/my', auth, async (req, res) => {
  try {
    const studies = await MedicalStudy.findAll({
      where: { userId: req.user.user_id },
      include: [
        {
          model: MedicalCertificate,
          as: 'certificate',
          attributes: ['id', 'startDate', 'status']
        }
      ],
      order: [['studyDate', 'DESC']]
    });

    res.json({
      success: true,
      data: studies
    });
  } catch (error) {
    console.error('Error fetching studies:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ==== RUTAS DE FICHA MÉDICA ====

// Obtener ficha médica del empleado
router.get('/medical-record/:userId?', 
  auth,
  async (req, res) => {
    try {
      const targetUserId = req.params.userId || req.user.user_id;
      
      // Solo médicos/admins pueden ver fichas de otros empleados
      if (targetUserId !== req.user.user_id && !['medical', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'No autorizado'
        });
      }

      const medicalRecord = await EmployeeMedicalRecord.findOne({
        where: { userId: targetUserId },
        include: [
          {
            model: User,
            as: 'employee',
            attributes: ['firstName', 'lastName', 'dni', 'email']
          },
          {
            model: User,
            as: 'medicalOfficer',
            attributes: ['firstName', 'lastName']
          }
        ]
      });

      if (!medicalRecord) {
        // Crear ficha médica vacía si no existe
        const newRecord = await EmployeeMedicalRecord.create({
          userId: targetUserId,
          createdBy: req.user.user_id
        });
        
        return res.json({
          success: true,
          data: newRecord
        });
      }

      res.json({
        success: true,
        data: medicalRecord
      });
    } catch (error) {
      console.error('Error fetching medical record:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

// ==== RUTAS DE HISTORIAL MÉDICO ====

// Obtener historial médico por diagnóstico
router.get('/history/:userId/diagnosis/:diagnosisCode',
  auth,
  requireRole(['medical', 'admin']),
  async (req, res) => {
    try {
      const { userId, diagnosisCode } = req.params;
      
      const history = await MedicalHistory.findAll({
        where: {
          userId: userId,
          primaryDiagnosisCode: diagnosisCode
        },
        include: [
          {
            model: MedicalCertificate,
            as: 'certificate',
            attributes: ['id', 'status']
          }
        ],
        order: [['episodeDate', 'DESC']]
      });

      // Calcular estadísticas
      const totalEpisodes = history.length;
      const totalWorkDaysLost = history.reduce((sum, episode) => sum + (episode.workDaysLost || 0), 0);
      const lastEpisode = history[0];
      
      res.json({
        success: true,
        data: {
          episodes: history,
          statistics: {
            totalEpisodes,
            totalWorkDaysLost,
            lastEpisodeDate: lastEpisode?.episodeDate,
            averageDuration: totalEpisodes > 0 ? totalWorkDaysLost / totalEpisodes : 0
          }
        }
      });
    } catch (error) {
      console.error('Error fetching diagnosis history:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

// Obtener historial médico completo del empleado
router.get('/history/:userId',
  auth,
  requireRole(['medical', 'admin']),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10, diagnosisCode, startDate, endDate } = req.query;
      
      const whereClause = { userId: userId };
      if (diagnosisCode) whereClause.primaryDiagnosisCode = diagnosisCode;
      if (startDate && endDate) {
        whereClause.episodeDate = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const offset = (page - 1) * limit;

      const { count, rows: history } = await MedicalHistory.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: MedicalCertificate,
            as: 'certificate',
            attributes: ['id', 'status']
          }
        ],
        order: [['episodeDate', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: history,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching medical history:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

// Función auxiliar para obtener texto del tipo de foto
function getPhotoTypeText(photoType) {
  const types = {
    'injury': 'Lesión',
    'lesion': 'Lesión cutánea',
    'swelling': 'Inflamación',
    'rash': 'Erupción/Sarpullido',
    'wound': 'Herida',
    'other': 'Otro'
  };
  return types[photoType] || 'Tipo desconocido';
}

// ==== ENDPOINT PARA GENERAR SOLICITUDES AUTOMÁTICAS ====

// Generar solicitud de documento automática desde el dashboard médico
router.post('/request-document-auto',
  auth,
  requireRole(['medical', 'admin']),
  [
    body('employeeId').notEmpty().withMessage('ID del empleado obligatorio'),
    body('documentType').isIn(['certificates', 'recipes', 'studies', 'photos']).withMessage('Tipo de documento inválido'),
    body('employeeData').isObject().withMessage('Datos del empleado obligatorios')
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

      const { employeeId, documentType, urgency = 'normal', employeeData } = req.body;

      // Verificar que el empleado existe
      const employee = await User.findByPk(employeeId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Empleado no encontrado'
        });
      }

      let documentRequest;
      let messageTitle;
      let messageContent;
      let documentTypeText;

      // Crear solicitud según el tipo de documento
      switch (documentType) {
        case 'certificates':
          // Crear solicitud de certificado médico
          documentRequest = await MedicalCertificate.create({
            userId: employeeId,
            issueDate: new Date(),
            status: 'requested_by_medical',
            requestedById: req.user.user_id,
            urgency: urgency,
            isAutoGenerated: true,
            needsAudit: true,
            createdBy: req.user.user_id,
            // Valores temporales que el empleado completará
            startDate: new Date(),
            requestedDays: 1,
            symptoms: 'Pendiente de completar por el empleado'
          });
          
          documentTypeText = 'certificado médico';
          messageTitle = '📋 Solicitud de Certificado Médico';
          messageContent = `El personal médico le ha solicitado que complete y envíe un certificado médico. Por favor, ingrese al sistema y complete la información requerida.`;
          break;

        case 'recipes':
          // Crear solicitud de receta médica
          documentRequest = await MedicalPrescription.create({
            userId: employeeId,
            issueDate: new Date(),
            status: 'requested_by_medical',
            requestedById: req.user.user_id,
            urgency: urgency,
            isAutoGenerated: true,
            createdBy: req.user.user_id,
            // Valores temporales
            physicianName: 'Pendiente de completar',
            medications: []
          });

          documentTypeText = 'receta médica';
          messageTitle = '💊 Solicitud de Receta Médica';
          messageContent = `El personal médico le ha solicitado que envíe una receta médica. Por favor, ingrese al sistema y suba la imagen o archivo de su receta.`;
          break;

        case 'studies':
          // Crear solicitud de estudio médico
          documentRequest = await MedicalStudy.create({
            userId: employeeId,
            studyDate: new Date(),
            status: 'requested_by_medical',
            requestedById: req.user.user_id,
            urgency: urgency,
            isAutoGenerated: true,
            createdBy: req.user.user_id,
            // Valores temporales
            studyType: 'Pendiente de especificar',
            studyName: 'Estudio solicitado por personal médico'
          });

          documentTypeText = 'estudio médico';
          messageTitle = '🔬 Solicitud de Estudio Médico';
          messageContent = `El personal médico le ha solicitado que envíe un estudio médico. Por favor, ingrese al sistema y suba los resultados de sus estudios.`;
          break;

        case 'photos':
          // Crear solicitud de foto médica
          documentRequest = await MedicalPhoto.create({
            userId: employeeId,
            requestedById: req.user.user_id,
            requestDate: new Date(),
            status: 'requested',
            urgency: urgency,
            isAutoGenerated: true,
            // Valores por defecto
            bodyPart: 'A especificar por el médico',
            photoType: 'other',
            requestReason: 'Solicitud generada desde el dashboard médico',
            isRequired: true
          });

          documentTypeText = 'foto médica';
          messageTitle = '📷 Solicitud de Foto Médica';
          messageContent = `El personal médico le ha solicitado que envíe una foto médica. Por favor, ingrese al sistema para conocer los detalles específicos.`;
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Tipo de documento no soportado'
          });
      }

      // Crear mensaje interno para el empleado
      await Message.create({
        senderId: req.user.user_id,
        receiverId: employeeId,
        title: messageTitle,
        content: messageContent,
        type: 'document_request',
        priority: urgency === 'high' ? 'high' : 'normal'
      });

      // Enviar notificación WhatsApp/SMS al empleado
      const requestingUser = await User.findByPk(req.user.user_id);
      
      if (employee && requestingUser) {
        const notificationData = {
          firstName: employee.firstName,
          lastName: employee.lastName,
          phone: employee.phone || employee.personalPhone,
          personalPhone: employee.personalPhone,
          email: employee.email
        };

        const requestData = {
          documentType: documentTypeText,
          urgency: urgency,
          requestedBy: `${requestingUser.firstName} ${requestingUser.lastName}`,
          requestDate: new Date(),
          instructions: messageContent
        };

        // Enviar notificación utilizando el servicio existente
        try {
          await notificationService.notifyDocumentRequested(notificationData, requestData);
        } catch (notifError) {
          console.error('Error enviando notificación:', notifError);
          // No fallar la request por error de notificación
        }
      }

      res.status(201).json({
        success: true,
        message: `Solicitud de ${documentTypeText} creada correctamente`,
        employee: `${employee.firstName} ${employee.lastName}`,
        data: {
          id: documentRequest.id,
          type: documentType,
          employeeId: employeeId,
          requestedAt: new Date(),
          urgency: urgency
        }
      });

    } catch (error) {
      console.error('Error creating document request:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }
);

// ==== ENDPOINT PARA MARCAR SOLICITUDES COMO CUMPLIDAS ====

// Marcar solicitud como cumplida y notificar al empleado
router.post('/mark-request-completed',
  auth,
  requireRole(['medical', 'admin']),
  [
    body('requestId').notEmpty().withMessage('ID de la solicitud obligatorio'),
    body('requestType').isIn(['certificates', 'recipes', 'studies', 'photos']).withMessage('Tipo de solicitud inválido'),
    body('employeeId').notEmpty().withMessage('ID del empleado obligatorio'),
    body('completionNotes').optional().isString().withMessage('Las notas deben ser texto')
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

      const { requestId, requestType, employeeId, completionNotes } = req.body;

      // Verificar que el empleado existe
      const employee = await User.findByPk(employeeId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Empleado no encontrado'
        });
      }

      // Marcar como completado en la base de datos según el tipo
      let updatedRequest;
      let requestTypeText;

      switch (requestType) {
        case 'certificates':
          updatedRequest = await MedicalCertificate.findByPk(requestId);
          if (updatedRequest) {
            await updatedRequest.update({
              status: 'completed',
              completionNotes: completionNotes,
              completedById: req.user.user_id,
              completedAt: new Date()
            });
          }
          requestTypeText = 'certificado médico';
          break;

        case 'recipes':
          updatedRequest = await MedicalPrescription.findByPk(requestId);
          if (updatedRequest) {
            await updatedRequest.update({
              status: 'completed',
              completionNotes: completionNotes,
              completedById: req.user.user_id,
              completedAt: new Date()
            });
          }
          requestTypeText = 'receta médica';
          break;

        case 'studies':
          updatedRequest = await MedicalStudy.findByPk(requestId);
          if (updatedRequest) {
            await updatedRequest.update({
              status: 'completed',
              completionNotes: completionNotes,
              completedById: req.user.user_id,
              completedAt: new Date()
            });
          }
          requestTypeText = 'estudio médico';
          break;

        case 'photos':
          updatedRequest = await MedicalPhoto.findByPk(requestId);
          if (updatedRequest) {
            await updatedRequest.update({
              status: 'completed',
              completionNotes: completionNotes,
              completedById: req.user.user_id,
              completedAt: new Date()
            });
          }
          requestTypeText = 'foto médica';
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Tipo de solicitud no soportado'
          });
      }

      if (!updatedRequest) {
        return res.status(404).json({
          success: false,
          error: 'Solicitud no encontrada'
        });
      }

      // Enviar notificación fehaciente al empleado
      try {
        await notificationService.notifyRequestCompleted({
          employeeId: employeeId,
          senderId: req.user.user_id,
          requestType: requestTypeText,
          completionNotes: completionNotes,
          originalRequestId: requestId
        });
      } catch (notifError) {
        console.error('Error enviando notificación de cumplimiento:', notifError);
        // No fallar la request por error de notificación
      }

      res.json({
        success: true,
        message: `Solicitud de ${requestTypeText} marcada como completada`,
        employee: `${employee.firstName} ${employee.lastName}`,
        data: {
          id: updatedRequest.id,
          type: requestType,
          employeeId: employeeId,
          completedAt: new Date(),
          completionNotes: completionNotes
        }
      });

    } catch (error) {
      console.error('Error marking request as completed:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }
);

// ==== ENDPOINT DE PRUEBA PARA COMUNICACIONES FEHACIENTES ====

// Enviar solicitud fehaciente de prueba (para testing)
router.post('/test-fehaciente-request',
  auth,
  requireRole(['medical', 'admin']),
  [
    body('employeeId').isUUID().withMessage('ID de empleado inválido'),
    body('documentType').isIn(['certificates', 'recipes', 'studies', 'photos']).withMessage('Tipo de documento inválido'),
    body('urgency').optional().isIn(['low', 'normal', 'high', 'critical']).withMessage('Nivel de urgencia inválido')
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

      const { employeeId, documentType, urgency = 'normal', customMessage } = req.body;

      // Validar que el empleado existe
      const employee = await User.findByPk(employeeId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Empleado no encontrado'
        });
      }

      // Mapear tipos de documento a texto legible
      const documentTypeNames = {
        'certificates': 'certificado médico',
        'recipes': 'receta médica', 
        'studies': 'estudio médico',
        'photos': 'foto médica'
      };

      const documentTypeName = documentTypeNames[documentType];
      const doctorName = `${req.user.firstName} ${req.user.lastName}`;

      // Crear mensaje personalizado o usar el predeterminado
      const defaultMessage = `Se requiere que subas tu ${documentTypeName} a través de la aplicación móvil.`;
      const finalMessage = customMessage || defaultMessage;

      // Enviar notificación fehaciente
      const result = await notificationService.sendFehacienteNotification({
        employeeId: employeeId,
        senderId: req.user.user_id,
        subject: `Solicitud Médica: ${documentTypeName}`,
        content: `${finalMessage} Solicitado por: Dr. ${doctorName}. Fecha límite: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
        priority: urgency === 'critical' ? 'alta' : urgency === 'high' ? 'media' : 'normal',
        documentType: documentType,
        metadata: {
          requestType: 'fehaciente_document_request',
          documentType: documentType,
          urgencyLevel: urgency,
          requestedBy: doctorName,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      });

      res.status(200).json({
        success: true,
        message: `Solicitud fehaciente de ${documentTypeName} enviada correctamente`,
        employee: `${employee.firstName} ${employee.lastName}`,
        data: {
          employeeId: employeeId,
          documentType: documentType,
          urgency: urgency,
          requestedBy: doctorName,
          sentAt: new Date(),
          communicationChannels: result.channels || ['sms', 'whatsapp', 'email'],
          communicationId: result.communicationId
        }
      });

    } catch (error) {
      console.error('Error sending test fehaciente request:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }
);

// Obtener solicitudes fehacientes pendientes de un empleado
router.get('/pending-requests', auth, async (req, res) => {
  try {
    // Simular solicitudes fehacientes pendientes
    // En una implementación real, estas vendrían de la tabla CommunicationLog
    const mockPendingRequests = [
      {
        id: `req-${Date.now()}-1`,
        documentType: 'certificates',
        requestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 días atrás
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 días desde ahora
        description: 'Certificado médico solicitado por el área médica',
        requestReason: 'Requerido para justificar ausencia del 01/09/2025',
        status: 'requested',
        requestedBy: 'Dr. María González',
        urgency: 'normal',
        type: 'certificates'
      },
      {
        id: `req-${Date.now()}-2`,
        documentType: 'studies',
        requestDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 día atrás
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 días desde ahora
        description: 'Estudios de laboratorio solicitados',
        requestReason: 'Análisis de sangre completo realizado el 28/08/2025',
        status: 'requested',
        requestedBy: 'Dr. Carlos Ruiz',
        urgency: 'high',
        type: 'studies'
      }
    ];

    res.json({
      success: true,
      data: mockPendingRequests
    });

  } catch (error) {
    console.error('Error getting pending requests:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;