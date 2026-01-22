/**
 * Rutas para documentación personal de empleados
 *
 * ✅ INTEGRADO CON DMS - Todos los documentos se registran en DMS (SSOT)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { EmployeeDocument, User } = require('../config/database');

// ========== INTEGRACIÓN DMS - SSOT DOCUMENTAL ==========
/**
 * Registra un documento de empleado en el DMS centralizado
 * @param {Object} req - Request de Express
 * @param {Object} file - Archivo subido (multer)
 * @param {string} documentType - Tipo de documento (dni, passport, license, etc.)
 * @param {string} userId - ID del empleado
 * @param {Object} additionalMetadata - Metadata adicional
 */
const registerEmployeeDocInDMS = async (req, file, documentType, userId, additionalMetadata = {}) => {
  try {
    const dmsService = req.app.get('dmsIntegrationService');
    if (!dmsService) {
      console.warn('⚠️ [EMPLOYEE-DOCS] DMSIntegrationService no disponible');
      return null;
    }

    const companyId = req.user?.company_id || req.body?.company_id;
    const createdById = req.user?.user_id || req.user?.id;

    // Mapear tipo de documento local a tipo DMS
    const typeMapping = {
      'dni': 'dni',
      'dni_front': 'dni-front',
      'dni_back': 'dni-back',
      'passport': 'passport',
      'visa': 'visa',
      'license': 'license',
      'driver_license': 'license',
      'certificate': 'certificate',
      'insurance': 'insurance',
      'general': 'general'
    };

    const dmsDocType = typeMapping[documentType?.toLowerCase()] || 'general';

    const result = await dmsService.registerDocument({
      module: 'employee-documents',
      documentType: dmsDocType,
      companyId,
      employeeId: userId,
      createdById,
      sourceEntityType: 'employee-document',
      sourceEntityId: null, // Se actualiza después de crear el registro local
      file: {
        buffer: fs.readFileSync(file.path),
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      },
      title: `${documentType?.toUpperCase() || 'Documento'} - ${file.originalname}`,
      description: additionalMetadata.description || `Documento de empleado: ${documentType}`,
      expirationDate: additionalMetadata.expirationDate,
      metadata: {
        originalPath: file.path,
        uploadRoute: req.originalUrl,
        documentType,
        userId,
        ...additionalMetadata
      }
    });

    console.log(`📄 [DMS] Registrado documento de empleado: ${result.document?.id} (${documentType})`);
    return result;

  } catch (error) {
    console.error('❌ [DMS] Error registrando documento de empleado:', error.message);
    return null;
  }
};

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/documents');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `document-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB límite
  },
  fileFilter: (req, file, cb) => {
    // Aceptar solo imágenes y PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes y archivos PDF'));
    }
  }
});

// ======== OBTENER DOCUMENTOS ========

// Obtener todos los documentos de un empleado
router.get('/user/:userId', async (req, res) => {
  try {
    const documents = await EmployeeDocument.findAll({
      where: { 
        userId: req.params.userId,
        isActive: true 
      },
      order: [['documentType', 'ASC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: documents,
      message: 'Documentos obtenidos exitosamente'
    });
  } catch (error) {
    console.error('❌ Error obteniendo documentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo documentos del empleado',
      error: error.message
    });
  }
});

// Obtener documento específico
router.get('/:id', async (req, res) => {
  try {
    const document = await EmployeeDocument.findOne({
      where: { id: req.params.id, isActive: true },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    res.json({
      success: true,
      data: document,
      message: 'Documento obtenido exitosamente'
    });
  } catch (error) {
    console.error('❌ Error obteniendo documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo documento',
      error: error.message
    });
  }
});

// ======== CREAR/ACTUALIZAR DOCUMENTOS ========

// Crear nuevo documento
router.post('/', upload.fields([
  { name: 'frontPhoto', maxCount: 1 },
  { name: 'backPhoto', maxCount: 1 },
  { name: 'additionalFiles', maxCount: 5 }
]), async (req, res) => {
  try {
    const {
      userId,
      documentType,
      documentNumber,
      issuingAuthority,
      issuingCountry,
      issueDate,
      expiryDate,
      documentData,
      notes,
      alertDays
    } = req.body;

    if (!userId || !documentType) {
      return res.status(400).json({
        success: false,
        message: 'userId y documentType son requeridos'
      });
    }

    // Procesar archivos subidos
    let frontPhotoPath = null;
    let backPhotoPath = null;
    let additionalFiles = [];

    if (req.files) {
      if (req.files.frontPhoto) {
        frontPhotoPath = '/uploads/documents/' + req.files.frontPhoto[0].filename;
      }
      if (req.files.backPhoto) {
        backPhotoPath = '/uploads/documents/' + req.files.backPhoto[0].filename;
      }
      if (req.files.additionalFiles) {
        additionalFiles = req.files.additionalFiles.map(file => 
          '/uploads/documents/' + file.filename
        );
      }
    }

    // Verificar si ya existe un documento del mismo tipo para este usuario
    const existingDoc = await EmployeeDocument.findOne({
      where: {
        userId,
        documentType,
        isActive: true
      }
    });

    if (existingDoc) {
      // Actualizar documento existente
      await existingDoc.update({
        documentNumber,
        issuingAuthority,
        issuingCountry,
        issueDate: issueDate ? new Date(issueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        documentData: documentData ? JSON.parse(documentData) : {},
        frontPhotoPath: frontPhotoPath || existingDoc.frontPhotoPath,
        backPhotoPath: backPhotoPath || existingDoc.backPhotoPath,
        additionalFiles: additionalFiles.length > 0 ? additionalFiles : existingDoc.additionalFiles,
        notes,
        alertDays: alertDays || 30,
        status: calculateDocumentStatus(expiryDate)
      });

      // ✅ Registrar nuevos archivos en DMS si se subieron
      const dmsResults = [];
      if (req.files) {
        const expirationDate = expiryDate ? new Date(expiryDate) : null;
        const metadata = { documentId: existingDoc.id, documentNumber, isUpdate: true };

        if (req.files.frontPhoto) {
          const result = await registerEmployeeDocInDMS(req, req.files.frontPhoto[0], `${documentType}_front`, userId, { expirationDate, ...metadata });
          if (result) dmsResults.push(result.document);
        }
        if (req.files.backPhoto) {
          const result = await registerEmployeeDocInDMS(req, req.files.backPhoto[0], `${documentType}_back`, userId, { expirationDate, ...metadata });
          if (result) dmsResults.push(result.document);
        }
        if (req.files.additionalFiles) {
          for (const file of req.files.additionalFiles) {
            const result = await registerEmployeeDocInDMS(req, file, documentType, userId, { expirationDate, ...metadata });
            if (result) dmsResults.push(result.document);
          }
        }
      }

      res.json({
        success: true,
        data: existingDoc,
        message: 'Documento actualizado exitosamente',
        dms: dmsResults.length > 0 ? {
          registeredCount: dmsResults.length,
          documentIds: dmsResults.map(d => d.id)
        } : null
      });
    } else {
      // Crear nuevo documento
      const newDocument = await EmployeeDocument.create({
        userId,
        documentType,
        documentNumber,
        issuingAuthority,
        issuingCountry,
        issueDate: issueDate ? new Date(issueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        documentData: documentData ? JSON.parse(documentData) : {},
        frontPhotoPath,
        backPhotoPath,
        additionalFiles,
        notes,
        alertDays: alertDays || 30,
        status: calculateDocumentStatus(expiryDate)
      });

      // ✅ Registrar archivos en DMS (SSOT Documental)
      const dmsResults = [];
      if (req.files) {
        const expirationDate = expiryDate ? new Date(expiryDate) : null;
        const metadata = { documentId: newDocument.id, documentNumber };

        if (req.files.frontPhoto) {
          const result = await registerEmployeeDocInDMS(req, req.files.frontPhoto[0], `${documentType}_front`, userId, { expirationDate, ...metadata });
          if (result) dmsResults.push(result.document);
        }
        if (req.files.backPhoto) {
          const result = await registerEmployeeDocInDMS(req, req.files.backPhoto[0], `${documentType}_back`, userId, { expirationDate, ...metadata });
          if (result) dmsResults.push(result.document);
        }
        if (req.files.additionalFiles) {
          for (const file of req.files.additionalFiles) {
            const result = await registerEmployeeDocInDMS(req, file, documentType, userId, { expirationDate, ...metadata });
            if (result) dmsResults.push(result.document);
          }
        }
      }

      res.status(201).json({
        success: true,
        data: newDocument,
        message: 'Documento creado exitosamente',
        dms: dmsResults.length > 0 ? {
          registeredCount: dmsResults.length,
          documentIds: dmsResults.map(d => d.id)
        } : null
      });
    }
  } catch (error) {
    console.error('❌ Error procesando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error procesando documento',
      error: error.message
    });
  }
});

// Actualizar documento existente
router.put('/:id', upload.fields([
  { name: 'frontPhoto', maxCount: 1 },
  { name: 'backPhoto', maxCount: 1 },
  { name: 'additionalFiles', maxCount: 5 }
]), async (req, res) => {
  try {
    const document = await EmployeeDocument.findOne({
      where: { id: req.params.id, isActive: true }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Procesar archivos subidos si los hay
    let updateData = { ...req.body };
    
    if (req.files) {
      if (req.files.frontPhoto) {
        updateData.frontPhotoPath = '/uploads/documents/' + req.files.frontPhoto[0].filename;
      }
      if (req.files.backPhoto) {
        updateData.backPhotoPath = '/uploads/documents/' + req.files.backPhoto[0].filename;
      }
      if (req.files.additionalFiles) {
        updateData.additionalFiles = req.files.additionalFiles.map(file => 
          '/uploads/documents/' + file.filename
        );
      }
    }

    // Parsear documentData si viene como string
    if (updateData.documentData && typeof updateData.documentData === 'string') {
      updateData.documentData = JSON.parse(updateData.documentData);
    }

    // Convertir fechas
    if (updateData.issueDate) {
      updateData.issueDate = new Date(updateData.issueDate);
    }
    if (updateData.expiryDate) {
      updateData.expiryDate = new Date(updateData.expiryDate);
      updateData.status = calculateDocumentStatus(updateData.expiryDate);
    }

    await document.update(updateData);

    // ✅ Registrar archivos actualizados en DMS (SSOT)
    const dmsResults = [];
    if (req.files) {
      if (req.files.frontPhoto) {
        const result = await registerEmployeeDocInDMS(req, req.files.frontPhoto[0], 'doc_front', document.userId, {
          documentId: document.id,
          documentType: document.documentType
        });
        if (result) dmsResults.push(result.document);
      }
      if (req.files.backPhoto) {
        const result = await registerEmployeeDocInDMS(req, req.files.backPhoto[0], 'doc_back', document.userId, {
          documentId: document.id,
          documentType: document.documentType
        });
        if (result) dmsResults.push(result.document);
      }
      if (req.files.additionalFiles) {
        for (const file of req.files.additionalFiles) {
          const result = await registerEmployeeDocInDMS(req, file, 'doc_additional', document.userId, {
            documentId: document.id,
            documentType: document.documentType
          });
          if (result) dmsResults.push(result.document);
        }
      }
    }

    res.json({
      success: true,
      data: document,
      message: 'Documento actualizado exitosamente',
      dms: dmsResults.length > 0 ? {
        registeredCount: dmsResults.length,
        documentIds: dmsResults.map(d => d.id)
      } : null
    });
  } catch (error) {
    console.error('❌ Error actualizando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando documento',
      error: error.message
    });
  }
});

// ======== FUNCIONES ESPECÍFICAS POR TIPO DE DOCUMENTO ========

// DNI - Subir fotos
router.post('/dni/:userId/photos', upload.fields([
  { name: 'frontPhoto', maxCount: 1 },
  { name: 'backPhoto', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files || (!req.files.frontPhoto && !req.files.backPhoto)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos una foto'
      });
    }

    const userId = req.params.userId;
    let document = await EmployeeDocument.findOne({
      where: {
        userId,
        documentType: 'dni',
        isActive: true
      }
    });

    const updateData = {};
    if (req.files.frontPhoto) {
      updateData.frontPhotoPath = '/uploads/documents/' + req.files.frontPhoto[0].filename;
    }
    if (req.files.backPhoto) {
      updateData.backPhotoPath = '/uploads/documents/' + req.files.backPhoto[0].filename;
    }

    if (document) {
      await document.update(updateData);
    } else {
      document = await EmployeeDocument.create({
        userId,
        documentType: 'dni',
        ...updateData
      });
    }

    // ✅ Registrar fotos de DNI en DMS (SSOT)
    const dmsResults = [];
    if (req.files.frontPhoto) {
      const result = await registerEmployeeDocInDMS(req, req.files.frontPhoto[0], 'dni_front', userId, { documentId: document.id });
      if (result) dmsResults.push(result.document);
    }
    if (req.files.backPhoto) {
      const result = await registerEmployeeDocInDMS(req, req.files.backPhoto[0], 'dni_back', userId, { documentId: document.id });
      if (result) dmsResults.push(result.document);
    }

    res.json({
      success: true,
      data: document,
      message: 'Fotos de DNI subidas exitosamente',
      dms: dmsResults.length > 0 ? {
        registeredCount: dmsResults.length,
        documentIds: dmsResults.map(d => d.id)
      } : null
    });
  } catch (error) {
    console.error('❌ Error subiendo fotos DNI:', error);
    res.status(500).json({
      success: false,
      message: 'Error subiendo fotos de DNI',
      error: error.message
    });
  }
});

// Pasaporte - Manejo completo
router.post('/passport/:userId', upload.fields([
  { name: 'page1Photo', maxCount: 1 },
  { name: 'page2Photo', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      hasPassport,
      passportNumber,
      issuingCountry,
      issueDate,
      expiryDate,
      observations
    } = req.body;

    let document = await EmployeeDocument.findOne({
      where: {
        userId: req.params.userId,
        documentType: 'passport',
        isActive: true
      }
    });

    const documentData = {
      hasPassport: hasPassport === 'true',
      observations
    };

    const updateData = {
      documentNumber: passportNumber,
      issuingCountry,
      issueDate: issueDate ? new Date(issueDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      documentData,
      status: calculateDocumentStatus(expiryDate)
    };

    if (req.files) {
      if (req.files.page1Photo) {
        updateData.frontPhotoPath = '/uploads/documents/' + req.files.page1Photo[0].filename;
      }
      if (req.files.page2Photo) {
        updateData.backPhotoPath = '/uploads/documents/' + req.files.page2Photo[0].filename;
      }
    }

    if (document) {
      await document.update(updateData);
    } else {
      document = await EmployeeDocument.create({
        userId: req.params.userId,
        documentType: 'passport',
        ...updateData
      });
    }

    // ✅ Registrar fotos de pasaporte en DMS (SSOT)
    const userId = req.params.userId;
    const dmsResults = [];
    if (req.files) {
      if (req.files.page1Photo) {
        const result = await registerEmployeeDocInDMS(req, req.files.page1Photo[0], 'passport_page1', userId, {
          documentId: document.id,
          passportNumber: passportNumber,
          issuingCountry: issuingCountry
        });
        if (result) dmsResults.push(result.document);
      }
      if (req.files.page2Photo) {
        const result = await registerEmployeeDocInDMS(req, req.files.page2Photo[0], 'passport_page2', userId, {
          documentId: document.id,
          passportNumber: passportNumber,
          issuingCountry: issuingCountry
        });
        if (result) dmsResults.push(result.document);
      }
    }

    res.json({
      success: true,
      data: document,
      message: 'Información de pasaporte actualizada exitosamente',
      dms: dmsResults.length > 0 ? {
        registeredCount: dmsResults.length,
        documentIds: dmsResults.map(d => d.id)
      } : null
    });
  } catch (error) {
    console.error('❌ Error actualizando pasaporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando información de pasaporte',
      error: error.message
    });
  }
});

// ======== ALERTAS Y VENCIMIENTOS ========

// Obtener documentos por vencer
router.get('/alerts/expiring', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const alertDate = new Date();
    alertDate.setDate(alertDate.getDate() + parseInt(days));

    const expiringDocuments = await EmployeeDocument.findAll({
      where: {
        isActive: true,
        expiryDate: {
          [Op.lte]: alertDate,
          [Op.gt]: new Date()
        }
      },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['expiryDate', 'ASC']]
    });

    res.json({
      success: true,
      data: expiringDocuments,
      message: `Documentos que vencen en los próximos ${days} días`
    });
  } catch (error) {
    console.error('❌ Error obteniendo documentos por vencer:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo documentos por vencer',
      error: error.message
    });
  }
});

// Obtener documentos vencidos
router.get('/alerts/expired', async (req, res) => {
  try {
    const expiredDocuments = await EmployeeDocument.findAll({
      where: {
        isActive: true,
        expiryDate: {
          [Op.lt]: new Date()
        }
      },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['expiryDate', 'DESC']]
    });

    res.json({
      success: true,
      data: expiredDocuments,
      message: 'Documentos vencidos obtenidos exitosamente'
    });
  } catch (error) {
    console.error('❌ Error obteniendo documentos vencidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo documentos vencidos',
      error: error.message
    });
  }
});

// Actualizar estado de documentos (ejecutar manualmente o por cron)
router.post('/update-statuses', async (req, res) => {
  try {
    const today = new Date();
    
    // Actualizar documentos vencidos
    await EmployeeDocument.update(
      { status: 'expired' },
      {
        where: {
          expiryDate: { [Op.lt]: today },
          status: { [Op.ne]: 'expired' },
          isActive: true
        }
      }
    );

    // Actualizar documentos por vencer
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    await EmployeeDocument.update(
      { status: 'about_to_expire' },
      {
        where: {
          expiryDate: { 
            [Op.between]: [today, thirtyDaysFromNow]
          },
          status: 'valid',
          isActive: true
        }
      }
    );

    // Contar documentos actualizados
    const expiredCount = await EmployeeDocument.count({
      where: { status: 'expired', isActive: true }
    });

    const aboutToExpireCount = await EmployeeDocument.count({
      where: { status: 'about_to_expire', isActive: true }
    });

    res.json({
      success: true,
      data: {
        expiredCount,
        aboutToExpireCount,
        lastUpdate: new Date()
      },
      message: 'Estados de documentos actualizados exitosamente'
    });
  } catch (error) {
    console.error('❌ Error actualizando estados:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando estados de documentos',
      error: error.message
    });
  }
});

// ======== ESTADÍSTICAS ========

// Obtener estadísticas de documentos
router.get('/stats/overview', async (req, res) => {
  try {
    const totalDocuments = await EmployeeDocument.count({
      where: { isActive: true }
    });

    const documentsByType = await EmployeeDocument.findAll({
      attributes: [
        'documentType',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: { isActive: true },
      group: ['documentType']
    });

    const documentsByStatus = await EmployeeDocument.findAll({
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: { isActive: true },
      group: ['status']
    });

    res.json({
      success: true,
      data: {
        totalDocuments,
        documentsByType,
        documentsByStatus
      },
      message: 'Estadísticas obtenidas exitosamente'
    });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas',
      error: error.message
    });
  }
});

// ======== FUNCIONES AUXILIARES ========

function calculateDocumentStatus(expiryDate) {
  if (!expiryDate) return 'valid';
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysDiff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  
  if (daysDiff < 0) return 'expired';
  if (daysDiff <= 30) return 'about_to_expire';
  return 'valid';
}

module.exports = router;