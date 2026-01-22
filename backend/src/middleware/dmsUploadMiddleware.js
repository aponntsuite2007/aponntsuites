'use strict';

/**
 * DMS UPLOAD MIDDLEWARE
 *
 * Middleware centralizado para que TODOS los uploads pasen por DMS.
 * Esto garantiza que DMS sea la FUENTE ÚNICA DE VERDAD para documentos.
 *
 * Uso:
 *   const { dmsUpload, registerWithDMS } = require('../middleware/dmsUploadMiddleware');
 *
 *   router.post('/upload', dmsUpload.single('file'), registerWithDMS('employee-documents', 'general'), handler);
 *
 * @version 1.0.0
 * @date 2026-01-20
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuración de multer con memoria para que DMS maneje el storage
const storage = multer.memoryStorage();

// Filtro de archivos permitidos
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    // Imágenes
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    // CAD/Técnico
    'application/acad',
    'application/x-acad',
    'application/autocad_dwg',
    'image/vnd.dwg',
    'image/x-dwg',
    'application/dxf',
    'application/stp',
    'application/step',
    // Otros
    'application/json',
    'application/xml',
    'text/xml'
  ];

  // Extensiones permitidas (para archivos que vienen sin mime type correcto)
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.txt', '.csv', '.json', '.xml',
    '.dwg', '.dxf', '.step', '.stp'
  ];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype} (${ext})`), false);
  }
};

// Límites de archivo
const limits = {
  fileSize: 50 * 1024 * 1024, // 50MB máximo
  files: 10 // Máximo 10 archivos por request
};

// Instancia de multer para DMS
const dmsUpload = multer({
  storage,
  fileFilter,
  limits
});

/**
 * Middleware que registra el archivo subido en DMS
 * @param {string} module - Módulo del sistema (employee-documents, job-postings, etc.)
 * @param {string} documentType - Tipo de documento dentro del módulo
 * @param {Object} options - Opciones adicionales
 */
function registerWithDMS(module, documentType, options = {}) {
  return async (req, res, next) => {
    // Si no hay archivo, continuar normalmente
    if (!req.file && !req.files) {
      return next();
    }

    try {
      // Obtener instancia de DMSIntegrationService
      const dmsService = req.app.get('dmsIntegrationService');

      if (!dmsService) {
        console.warn('⚠️ [DMS-MIDDLEWARE] DMSIntegrationService no disponible, continuando sin registro DMS');
        return next();
      }

      // Obtener datos del contexto
      const companyId = req.user?.company_id || req.body?.company_id || req.params?.companyId;
      const userId = req.user?.user_id || req.user?.id || req.body?.user_id;
      const employeeId = req.body?.employee_id || req.params?.employeeId || req.params?.userId || userId;

      // Procesar archivo único
      if (req.file) {
        const dmsResult = await dmsService.registerDocument({
          module,
          documentType,
          companyId,
          employeeId,
          createdById: userId,
          sourceEntityType: options.sourceEntityType || module,
          sourceEntityId: req.body?.source_id || req.params?.id || null,
          file: req.file,
          title: req.body?.title || req.file.originalname,
          description: req.body?.description || '',
          metadata: {
            originalRoute: req.originalUrl,
            uploadedBy: userId,
            uploadedAt: new Date().toISOString(),
            ...req.body?.metadata
          },
          expirationDate: req.body?.expiration_date,
          tags: req.body?.tags ? JSON.parse(req.body.tags) : []
        });

        // Adjuntar resultado al request para uso en el handler
        req.dmsDocument = dmsResult.document;
        req.dmsResult = dmsResult;
      }

      // Procesar múltiples archivos
      if (req.files) {
        const filesArray = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        req.dmsDocuments = [];

        for (const file of filesArray) {
          const dmsResult = await dmsService.registerDocument({
            module,
            documentType: options.documentTypeForFile?.(file) || documentType,
            companyId,
            employeeId,
            createdById: userId,
            sourceEntityType: options.sourceEntityType || module,
            sourceEntityId: req.body?.source_id || req.params?.id || null,
            file,
            title: file.originalname,
            description: req.body?.description || '',
            metadata: {
              originalRoute: req.originalUrl,
              uploadedBy: userId,
              uploadedAt: new Date().toISOString(),
              fieldName: file.fieldname
            },
            expirationDate: req.body?.expiration_date,
            tags: []
          });

          req.dmsDocuments.push(dmsResult.document);
        }
      }

      console.log(`📄 [DMS-MIDDLEWARE] Registrado: ${module}/${documentType} por usuario ${userId}`);
      next();

    } catch (error) {
      console.error('❌ [DMS-MIDDLEWARE] Error registrando en DMS:', error.message);

      // Opción: fallar silenciosamente y continuar, o devolver error
      if (options.failOnError) {
        return res.status(500).json({
          success: false,
          error: 'Error registrando documento en DMS',
          details: error.message
        });
      }

      // Por defecto, continuar sin DMS y registrar warning
      req.dmsError = error;
      next();
    }
  };
}

/**
 * Helper para crear respuesta con info de DMS
 */
function createDMSResponse(req, additionalData = {}) {
  const response = {
    success: true,
    ...additionalData
  };

  if (req.dmsDocument) {
    response.dms = {
      documentId: req.dmsDocument.id,
      title: req.dmsDocument.title,
      status: req.dmsDocument.status,
      typeCode: req.dmsDocument.typeCode
    };
  }

  if (req.dmsDocuments) {
    response.dmsDocuments = req.dmsDocuments.map(doc => ({
      documentId: doc.id,
      title: doc.title,
      status: doc.status,
      typeCode: doc.typeCode
    }));
  }

  if (req.dmsError) {
    response.dmsWarning = 'Documento guardado localmente, pendiente sincronización con DMS';
  }

  return response;
}

/**
 * Inicializar DMSIntegrationService en la aplicación
 * Llamar desde server.js después de configurar modelos
 */
async function initializeDMSMiddleware(app, models, sequelize) {
  try {
    // Importar servicios DMS
    const DMSIntegrationService = require('../services/dms/DMSIntegrationService');
    const DocumentStorageService = require('../services/dms/DocumentStorageService');

    // Crear instancias
    const storageService = new DocumentStorageService({
      basePath: path.join(__dirname, '../../uploads/dms'),
      maxFileSize: 50 * 1024 * 1024 // 50MB
    });

    const dmsIntegrationService = new DMSIntegrationService({
      models,
      sequelize,
      storageService,
      // auditService, workflowService, notificationService se pueden agregar después
    });

    // Registrar en la app para acceso global
    app.set('dmsIntegrationService', dmsIntegrationService);
    app.set('dmsStorageService', storageService);

    console.log('✅ [DMS-MIDDLEWARE] DMSIntegrationService inicializado y disponible globalmente');

    return dmsIntegrationService;

  } catch (error) {
    console.error('❌ [DMS-MIDDLEWARE] Error inicializando DMS:', error.message);
    // No lanzar error para no bloquear el servidor
    return null;
  }
}

module.exports = {
  dmsUpload,
  registerWithDMS,
  createDMSResponse,
  initializeDMSMiddleware
};
