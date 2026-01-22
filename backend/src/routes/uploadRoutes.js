const express = require('express');
const router = express.Router();
const { uploadSingle, uploadMultiple, getFileUrl, deleteFile } = require('../middleware/upload');
const { auth } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// ========== INTEGRACIÓN DMS - SSOT DOCUMENTAL ==========
// Todos los uploads se registran en DMS para centralizar la gestión documental
const registerUploadInDMS = async (req, file, directory) => {
  try {
    const dmsService = req.app.get('dmsIntegrationService');
    if (!dmsService) {
      console.warn('⚠️ [UPLOAD] DMSIntegrationService no disponible');
      return null;
    }

    const companyId = req.user?.company_id || req.body?.company_id;
    const userId = req.user?.user_id || req.user?.id;

    // Mapear directory a módulo DMS
    const directoryToModule = {
      'licenses': 'uploads',
      'certificates': 'uploads',
      'photos': 'uploads',
      'documents': 'uploads',
      'biometric': 'biometric',
      'tasks': 'uploads',
      'general': 'uploads'
    };

    const module = directoryToModule[directory] || 'uploads';
    const documentType = directory || 'general';

    const result = await dmsService.registerDocument({
      module,
      documentType,
      companyId,
      employeeId: req.body?.employee_id || userId,
      createdById: userId,
      sourceEntityType: 'generic-upload',
      sourceEntityId: null,
      file: {
        buffer: fs.readFileSync(file.path),
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      },
      title: file.originalname,
      description: req.body?.description || `Upload genérico: ${directory}`,
      metadata: {
        originalPath: file.path,
        uploadRoute: '/api/v1/upload',
        directory
      }
    });

    console.log(`📄 [DMS] Registrado upload genérico: ${result.document?.id}`);
    return result;

  } catch (error) {
    console.error('❌ [DMS] Error registrando upload:', error.message);
    return null;
  }
};

/**
 * @route POST /api/v1/upload/single
 * @desc Subir un solo archivo
 * @access Private
 */
router.post('/single', auth, ...uploadSingle('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No se recibió ningún archivo'
      });
    }

    const fileUrl = getFileUrl(req, req.file.path);
    const directory = req.query.directory || 'general';

    // ✅ Registrar en DMS para centralización documental
    const dmsResult = await registerUploadInDMS(req, req.file, directory);

    console.log(`✅ [UPLOAD] Archivo subido: ${req.file.filename}${dmsResult ? ' (DMS: ' + dmsResult.document?.id + ')' : ''}`);

    res.status(200).json({
      success: true,
      message: 'Archivo subido exitosamente',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        path: req.file.path
      },
      // Info de DMS si está disponible
      dms: dmsResult ? {
        documentId: dmsResult.document?.id,
        status: dmsResult.document?.status,
        message: 'Documento registrado en DMS (fuente única de verdad)'
      } : null
    });

  } catch (error) {
    console.error('❌ Error en upload single:', error);

    // Si hay error, eliminar archivo si se subió
    if (req.file) {
      deleteFile(req.file.path);
    }

    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route POST /api/v1/upload/multiple
 * @desc Subir múltiples archivos
 * @access Private
 */
router.post('/multiple', auth, ...uploadMultiple('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No se recibieron archivos'
      });
    }

    const directory = req.query.directory || 'general';
    const dmsResults = [];

    const uploadedFiles = await Promise.all(req.files.map(async (file) => {
      // ✅ Registrar cada archivo en DMS
      const dmsResult = await registerUploadInDMS(req, file, directory);
      if (dmsResult) dmsResults.push(dmsResult);

      return {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: getFileUrl(req, file.path),
        path: file.path,
        dmsDocumentId: dmsResult?.document?.id || null
      };
    }));

    console.log(`✅ [UPLOAD] ${req.files.length} archivos subidos (${dmsResults.length} registrados en DMS)`);

    res.status(200).json({
      success: true,
      message: `${req.files.length} archivos subidos exitosamente`,
      files: uploadedFiles,
      count: req.files.length,
      dms: {
        registeredCount: dmsResults.length,
        message: `${dmsResults.length} documentos registrados en DMS (fuente única de verdad)`
      }
    });

  } catch (error) {
    console.error('❌ Error en upload multiple:', error);

    // Si hay error, eliminar archivos si se subieron
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        deleteFile(file.path);
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route DELETE /api/v1/upload/:filename
 * @desc Eliminar un archivo
 * @access Private
 */
router.delete('/:filename', auth, (req, res) => {
  try {
    const { filename } = req.params;
    const { directory } = req.query; // Ej: "licenses", "documents", etc.

    if (!filename) {
      return res.status(400).json({
        error: 'Nombre de archivo no proporcionado'
      });
    }

    // Validar que el filename no contenga path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        error: 'Nombre de archivo inválido'
      });
    }

    // Construir ruta del archivo
    let filePath = path.join('public', 'uploads');
    const allowedDirs = ['licenses', 'certificates', 'photos', 'documents', 'biometric', 'tasks', 'general'];

    if (directory) {
      // Validar directorio
      if (!allowedDirs.includes(directory)) {
        return res.status(400).json({
          error: 'Directorio no válido'
        });
      }
      filePath = path.join(filePath, directory, filename);
    } else {
      // Buscar en directorio base primero
      filePath = path.join(filePath, filename);

      // Si no existe, buscar en subdirectorios conocidos
      if (!fs.existsSync(filePath)) {
        let found = false;
        for (const dir of allowedDirs) {
          const testPath = path.join('public', 'uploads', dir, filename);
          if (fs.existsSync(testPath)) {
            filePath = testPath;
            found = true;
            break;
          }
        }
        if (!found) {
          return res.status(404).json({
            error: 'Archivo no encontrado'
          });
        }
      }
    }

    // Verificar que el archivo existe (solo si no se buscó automáticamente)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'Archivo no encontrado'
      });
    }

    // Eliminar archivo
    const deleted = deleteFile(filePath);

    if (deleted) {
      console.log(`✅ [DELETE] Archivo eliminado: ${filename}`);
      res.json({
        success: true,
        message: 'Archivo eliminado exitosamente',
        filename: filename
      });
    } else {
      res.status(500).json({
        error: 'No se pudo eliminar el archivo'
      });
    }

  } catch (error) {
    console.error('❌ Error eliminando archivo:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route GET /api/v1/upload/info/:filename
 * @desc Obtener información de un archivo
 * @access Private
 */
router.get('/info/:filename', auth, (req, res) => {
  try {
    const { filename } = req.params;
    const { directory } = req.query;

    if (!filename) {
      return res.status(400).json({
        error: 'Nombre de archivo no proporcionado'
      });
    }

    // Validar filename
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        error: 'Nombre de archivo inválido'
      });
    }

    // Construir ruta
    let filePath = path.join('public', 'uploads');
    const allowedDirs = ['licenses', 'certificates', 'photos', 'documents', 'biometric', 'tasks', 'general'];

    if (directory) {
      filePath = path.join(filePath, directory, filename);
    } else {
      // Buscar en directorio base primero
      filePath = path.join(filePath, filename);

      // Si no existe, buscar en subdirectorios conocidos
      if (!fs.existsSync(filePath)) {
        let found = false;
        for (const dir of allowedDirs) {
          const testPath = path.join('public', 'uploads', dir, filename);
          if (fs.existsSync(testPath)) {
            filePath = testPath;
            found = true;
            break;
          }
        }
        if (!found) {
          return res.status(404).json({
            error: 'Archivo no encontrado'
          });
        }
      }
    }

    // Verificar existencia (solo si no se buscó automáticamente)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'Archivo no encontrado'
      });
    }

    // Obtener stats del archivo
    const stats = fs.statSync(filePath);
    const fileUrl = getFileUrl(req, filePath);

    res.json({
      success: true,
      file: {
        filename: filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        url: fileUrl,
        path: filePath
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo info del archivo:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;
