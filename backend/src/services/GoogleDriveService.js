/**
 * GOOGLE DRIVE SERVICE
 * Servicio para subir archivos de exportación a Google Drive
 * Usa Service Account para autenticación sin intervención del usuario
 *
 * @version 1.0.0
 * @date 2026-01-24
 */

let google;
try {
  google = require('googleapis').google;
} catch (e) {
  console.warn('⚠️ [GOOGLE-DRIVE] googleapis not installed - Google Drive features disabled');
  google = null;
}
const fs = require('fs');
const path = require('path');

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.initialized = false;
    this.enabled = process.env.GOOGLE_DRIVE_ENABLED === 'true';
    this.rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '';
    this.keyFilePath = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_PATH || './config/google-service-account.json';
  }

  /**
   * Inicializa la conexión con Google Drive API
   */
  async init() {
    if (!this.enabled) {
      console.log('⚠️ [GoogleDrive] Servicio deshabilitado (GOOGLE_DRIVE_ENABLED != true)');
      return false;
    }

    try {
      const keyPath = path.resolve(__dirname, '../../', this.keyFilePath);

      if (!fs.existsSync(keyPath)) {
        console.error(`❌ [GoogleDrive] Archivo de credenciales no encontrado: ${keyPath}`);
        return false;
      }

      const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.initialized = true;
      console.log('✅ [GoogleDrive] Servicio inicializado correctamente');
      return true;
    } catch (error) {
      console.error('❌ [GoogleDrive] Error al inicializar:', error.message);
      return false;
    }
  }

  /**
   * Verifica que el servicio esté listo
   */
  ensureInitialized() {
    if (!this.enabled) {
      throw new Error('Google Drive está deshabilitado. Configure GOOGLE_DRIVE_ENABLED=true');
    }
    if (!this.initialized || !this.drive) {
      throw new Error('Google Drive no está inicializado. Ejecute init() primero.');
    }
  }

  /**
   * Crea una carpeta para la empresa dentro del folder raíz
   * @param {string} companyName - Nombre de la empresa
   * @returns {Object} { folderId, webViewLink }
   */
  async createCompanyFolder(companyName) {
    this.ensureInitialized();

    const folderName = `Baja_${companyName}_${new Date().toISOString().split('T')[0]}`;

    const response = await this.drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: this.rootFolderId ? [this.rootFolderId] : []
      },
      fields: 'id, webViewLink'
    });

    console.log(`📁 [GoogleDrive] Carpeta creada: ${folderName} (${response.data.id})`);

    return {
      folderId: response.data.id,
      webViewLink: response.data.webViewLink
    };
  }

  /**
   * Sube un archivo al Drive
   * @param {string} filePath - Ruta local del archivo
   * @param {string} fileName - Nombre para el archivo en Drive
   * @param {string} folderId - ID del folder destino (opcional, usa rootFolderId si no se especifica)
   * @returns {Object} { fileId, webViewLink, webContentLink, size }
   */
  async uploadFile(filePath, fileName, folderId = null) {
    this.ensureInitialized();

    if (!fs.existsSync(filePath)) {
      throw new Error(`Archivo no encontrado: ${filePath}`);
    }

    const fileStats = fs.statSync(filePath);
    const targetFolder = folderId || this.rootFolderId;

    const response = await this.drive.files.create({
      requestBody: {
        name: fileName,
        parents: targetFolder ? [targetFolder] : []
      },
      media: {
        mimeType: 'application/zip',
        body: fs.createReadStream(filePath)
      },
      fields: 'id, webViewLink, webContentLink, size'
    });

    console.log(`📤 [GoogleDrive] Archivo subido: ${fileName} (${(fileStats.size / 1024 / 1024).toFixed(2)} MB)`);

    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
      size: fileStats.size
    };
  }

  /**
   * Comparte un archivo con un email específico
   * @param {string} fileId - ID del archivo en Drive
   * @param {string} email - Email del destinatario
   * @param {string} role - Rol: 'reader', 'writer', 'commenter'
   */
  async shareWithEmail(fileId, email, role = 'reader') {
    this.ensureInitialized();

    await this.drive.permissions.create({
      fileId: fileId,
      requestBody: {
        type: 'user',
        role: role,
        emailAddress: email
      },
      sendNotificationEmail: true
    });

    console.log(`🔗 [GoogleDrive] Archivo ${fileId} compartido con ${email} (${role})`);
  }

  /**
   * Genera un link de descarga público temporal (anyone with link)
   * @param {string} fileId - ID del archivo
   * @returns {string} URL de descarga directa
   */
  async generatePublicLink(fileId) {
    this.ensureInitialized();

    await this.drive.permissions.create({
      fileId: fileId,
      requestBody: {
        type: 'anyone',
        role: 'reader'
      }
    });

    const file = await this.drive.files.get({
      fileId: fileId,
      fields: 'webViewLink, webContentLink'
    });

    return file.data.webViewLink;
  }

  /**
   * Elimina un archivo del Drive
   * @param {string} fileId - ID del archivo a eliminar
   */
  async deleteFile(fileId) {
    this.ensureInitialized();

    await this.drive.files.delete({ fileId });
    console.log(`🗑️ [GoogleDrive] Archivo eliminado: ${fileId}`);
  }

  /**
   * Obtiene información de un archivo
   * @param {string} fileId - ID del archivo
   * @returns {Object} Metadata del archivo
   */
  async getFileInfo(fileId) {
    this.ensureInitialized();

    const response = await this.drive.files.get({
      fileId: fileId,
      fields: 'id, name, size, createdTime, modifiedTime, webViewLink, webContentLink, mimeType'
    });

    return response.data;
  }

  /**
   * Verifica estado de salud del servicio
   * @returns {Object} { enabled, initialized, canConnect }
   */
  async healthCheck() {
    const status = {
      enabled: this.enabled,
      initialized: this.initialized,
      canConnect: false,
      rootFolderAccessible: false
    };

    if (!this.enabled || !this.initialized) return status;

    try {
      // Verificar que podemos listar archivos
      await this.drive.files.list({ pageSize: 1, fields: 'files(id)' });
      status.canConnect = true;

      // Verificar acceso al folder raíz
      if (this.rootFolderId) {
        await this.drive.files.get({ fileId: this.rootFolderId, fields: 'id, name' });
        status.rootFolderAccessible = true;
      }
    } catch (error) {
      status.error = error.message;
    }

    return status;
  }
}

module.exports = new GoogleDriveService();
