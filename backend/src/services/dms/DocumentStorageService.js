'use strict';

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const mime = require('mime-types');

/**
 * DocumentStorageService - Gestión de almacenamiento de archivos DMS
 *
 * Maneja upload, download, versiones y limpieza de archivos
 */
class DocumentStorageService {
  constructor(options = {}) {
    this.basePath = options.basePath || process.env.DMS_STORAGE_PATH || path.join(__dirname, '../../../uploads/dms');
    this.maxFileSize = options.maxFileSize || parseInt(process.env.DMS_MAX_FILE_SIZE) || 50 * 1024 * 1024; // 50MB default
    this.allowedMimeTypes = options.allowedMimeTypes || this.getDefaultAllowedMimeTypes();
    this.tempPath = path.join(this.basePath, 'temp');

    // Crear directorios base si no existen
    this.ensureDirectories();
  }

  /**
   * Tipos MIME permitidos por defecto
   */
  getDefaultAllowedMimeTypes() {
    return [
      // Documentos
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/rtf',
      'text/plain',
      'text/csv',

      // Imágenes
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/tiff',
      'image/bmp',

      // Archivos comprimidos
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',

      // XML/JSON
      'application/json',
      'application/xml',
      'text/xml'
    ];
  }

  /**
   * Crear directorios necesarios
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      await fs.mkdir(this.tempPath, { recursive: true });
    } catch (error) {
      console.error('[DMS Storage] Error creating directories:', error.message);
    }
  }

  /**
   * Subir archivo
   * @param {Object} file - Objeto de archivo (multer format)
   * @param {number} companyId - ID de la empresa
   * @param {string} documentNumber - Número de documento
   * @param {number} version - Número de versión (opcional)
   * @returns {Object} Datos del archivo subido
   */
  async uploadFile(file, companyId, documentNumber, version = 1) {
    // Validaciones
    this.validateFile(file);

    // Generar ruta de almacenamiento
    const companyPath = path.join(this.basePath, `company_${companyId}`);
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const datePath = path.join(companyPath, String(year), month);

    await fs.mkdir(datePath, { recursive: true });

    // Generar nombre de archivo único
    const extension = path.extname(file.originalname || file.name) || this.getExtensionFromMime(file.mimetype);
    const sanitizedName = this.sanitizeFileName(documentNumber);
    const uniqueId = crypto.randomBytes(4).toString('hex');
    const fileName = `${sanitizedName}_v${version}_${uniqueId}${extension}`;
    const filePath = path.join(datePath, fileName);

    // Calcular checksum
    const fileBuffer = file.buffer || await fs.readFile(file.path);
    const checksum = this.calculateChecksum(fileBuffer);

    // Guardar archivo
    await fs.writeFile(filePath, fileBuffer);

    // Limpiar archivo temporal si existe
    if (file.path) {
      try {
        await fs.unlink(file.path);
      } catch (e) {
        // Ignorar error si no se puede eliminar temporal
      }
    }

    return {
      fileName,
      filePath: this.getRelativePath(filePath),
      fileSize: fileBuffer.length,
      mimeType: file.mimetype,
      extension: extension.replace('.', ''),
      checksum,
      storedAt: new Date()
    };
  }

  /**
   * Descargar archivo
   * @param {string} relativePath - Ruta relativa del archivo
   * @returns {Object} Buffer y metadata del archivo
   */
  async downloadFile(relativePath) {
    const fullPath = this.getFullPath(relativePath);

    try {
      const stats = await fs.stat(fullPath);
      const buffer = await fs.readFile(fullPath);
      const mimeType = mime.lookup(fullPath) || 'application/octet-stream';

      return {
        buffer,
        fileName: path.basename(fullPath),
        fileSize: stats.size,
        mimeType,
        lastModified: stats.mtime
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Archivo no encontrado');
      }
      throw error;
    }
  }

  /**
   * Eliminar archivo
   * @param {string} relativePath - Ruta relativa del archivo
   */
  async deleteFile(relativePath) {
    const fullPath = this.getFullPath(relativePath);

    try {
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Archivo ya no existe
        return true;
      }
      throw error;
    }
  }

  /**
   * Mover archivo a papelera (soft delete)
   */
  async moveToTrash(relativePath, companyId) {
    const fullPath = this.getFullPath(relativePath);
    const trashPath = path.join(this.basePath, `company_${companyId}`, 'trash');
    await fs.mkdir(trashPath, { recursive: true });

    const fileName = path.basename(fullPath);
    const timestamp = Date.now();
    const trashFileName = `${timestamp}_${fileName}`;
    const trashFullPath = path.join(trashPath, trashFileName);

    try {
      await fs.rename(fullPath, trashFullPath);
      return this.getRelativePath(trashFullPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Archivo no encontrado');
      }
      throw error;
    }
  }

  /**
   * Restaurar archivo de papelera
   */
  async restoreFromTrash(trashPath, originalPath) {
    const fullTrashPath = this.getFullPath(trashPath);
    const fullOriginalPath = this.getFullPath(originalPath);

    // Asegurar que el directorio destino existe
    await fs.mkdir(path.dirname(fullOriginalPath), { recursive: true });

    try {
      await fs.rename(fullTrashPath, fullOriginalPath);
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Copiar archivo
   */
  async copyFile(sourcePath, companyId, newDocumentNumber, version = 1) {
    const fullSourcePath = this.getFullPath(sourcePath);

    try {
      const buffer = await fs.readFile(fullSourcePath);
      const mimeType = mime.lookup(fullSourcePath) || 'application/octet-stream';

      // Crear archivo temporal para reusar uploadFile
      const tempFile = {
        buffer,
        mimetype: mimeType,
        originalname: path.basename(fullSourcePath)
      };

      return this.uploadFile(tempFile, companyId, newDocumentNumber, version);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Archivo origen no encontrado');
      }
      throw error;
    }
  }

  /**
   * Obtener stream de lectura para archivos grandes
   */
  async getReadStream(relativePath) {
    const fullPath = this.getFullPath(relativePath);
    const fsSync = require('fs');

    return fsSync.createReadStream(fullPath);
  }

  /**
   * Obtener información del archivo
   */
  async getFileInfo(relativePath) {
    const fullPath = this.getFullPath(relativePath);

    try {
      const stats = await fs.stat(fullPath);
      const mimeType = mime.lookup(fullPath) || 'application/octet-stream';

      return {
        exists: true,
        fileName: path.basename(fullPath),
        fileSize: stats.size,
        mimeType,
        extension: path.extname(fullPath).replace('.', ''),
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { exists: false };
      }
      throw error;
    }
  }

  /**
   * Verificar integridad del archivo
   */
  async verifyChecksum(relativePath, expectedChecksum) {
    const fullPath = this.getFullPath(relativePath);

    try {
      const buffer = await fs.readFile(fullPath);
      const actualChecksum = this.calculateChecksum(buffer);

      return {
        valid: actualChecksum === expectedChecksum,
        expected: expectedChecksum,
        actual: actualChecksum
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Obtener uso de almacenamiento por empresa
   */
  async getStorageUsage(companyId) {
    const companyPath = path.join(this.basePath, `company_${companyId}`);

    try {
      const usage = await this.calculateDirectorySize(companyPath);
      return {
        bytes: usage,
        megabytes: (usage / (1024 * 1024)).toFixed(2),
        gigabytes: (usage / (1024 * 1024 * 1024)).toFixed(4)
      };
    } catch (error) {
      return { bytes: 0, megabytes: '0.00', gigabytes: '0.0000' };
    }
  }

  /**
   * Limpiar archivos temporales antiguos
   */
  async cleanupTempFiles(maxAgeHours = 24) {
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    const now = Date.now();
    let cleaned = 0;

    try {
      const files = await fs.readdir(this.tempPath);

      for (const file of files) {
        const filePath = path.join(this.tempPath, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          cleaned++;
        }
      }
    } catch (error) {
      console.error('[DMS Storage] Error cleaning temp files:', error.message);
    }

    return cleaned;
  }

  /**
   * Limpiar papelera de empresa (eliminar archivos antiguos)
   */
  async cleanupTrash(companyId, maxAgeDays = 30) {
    const trashPath = path.join(this.basePath, `company_${companyId}`, 'trash');
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let cleaned = 0;
    let freedBytes = 0;

    try {
      const files = await fs.readdir(trashPath);

      for (const file of files) {
        const filePath = path.join(trashPath, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          freedBytes += stats.size;
          await fs.unlink(filePath);
          cleaned++;
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[DMS Storage] Error cleaning trash:', error.message);
      }
    }

    return { cleaned, freedBytes };
  }

  /**
   * Generar preview/thumbnail
   */
  async generateThumbnail(relativePath, options = {}) {
    // TODO: Implementar con sharp para imágenes, pdf2pic para PDFs
    // Por ahora retornamos null
    return null;
  }

  // ========================================
  // MÉTODOS AUXILIARES
  // ========================================

  /**
   * Validar archivo
   */
  validateFile(file) {
    if (!file) {
      throw new Error('No se proporcionó archivo');
    }

    const fileSize = file.size || (file.buffer ? file.buffer.length : 0);

    if (fileSize > this.maxFileSize) {
      throw new Error(`Archivo demasiado grande. Máximo permitido: ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`Tipo de archivo no permitido: ${file.mimetype}`);
    }

    return true;
  }

  /**
   * Sanitizar nombre de archivo
   */
  sanitizeFileName(name) {
    return name
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 100);
  }

  /**
   * Calcular checksum SHA-256
   */
  calculateChecksum(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Obtener ruta relativa (para almacenar en BD)
   */
  getRelativePath(fullPath) {
    return fullPath.replace(this.basePath, '').replace(/^[\/\\]/, '');
  }

  /**
   * Obtener ruta completa desde relativa
   */
  getFullPath(relativePath) {
    // Prevenir path traversal
    const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.basePath, normalized);
  }

  /**
   * Obtener extensión desde MIME type
   */
  getExtensionFromMime(mimeType) {
    const ext = mime.extension(mimeType);
    return ext ? `.${ext}` : '';
  }

  /**
   * Calcular tamaño de directorio recursivamente
   */
  async calculateDirectorySize(dirPath) {
    let totalSize = 0;

    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
          totalSize += await this.calculateDirectorySize(itemPath);
        } else {
          const stats = await fs.stat(itemPath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Ignorar errores de acceso
    }

    return totalSize;
  }

  /**
   * Generar URL de descarga temporal (signed URL pattern)
   */
  generateDownloadToken(documentId, userId, expiresInMinutes = 60) {
    const payload = {
      documentId,
      userId,
      expires: Date.now() + (expiresInMinutes * 60 * 1000)
    };

    const secret = process.env.JWT_SECRET || 'dms-secret-key';
    const data = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(data).digest('hex');

    return Buffer.from(`${data}:${signature}`).toString('base64url');
  }

  /**
   * Verificar token de descarga
   */
  verifyDownloadToken(token) {
    try {
      const decoded = Buffer.from(token, 'base64url').toString();
      const [data, signature] = decoded.split(':');

      const secret = process.env.JWT_SECRET || 'dms-secret-key';
      const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('hex');

      if (signature !== expectedSignature) {
        return { valid: false, error: 'Firma inválida' };
      }

      const payload = JSON.parse(data);

      if (Date.now() > payload.expires) {
        return { valid: false, error: 'Token expirado' };
      }

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: 'Token inválido' };
    }
  }
}

module.exports = DocumentStorageService;
