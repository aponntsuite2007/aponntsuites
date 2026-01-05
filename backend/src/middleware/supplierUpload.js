/**
 * supplierUpload.js
 * Middleware multer para uploads del portal de proveedores
 *
 * Configuración:
 * - Storage: disk (temporal) para procesamiento
 * - Límites: 10MB por archivo
 * - Tipos permitidos: PDF, imágenes, Excel, Word, ZIP
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Directorio temporal para uploads
const UPLOAD_DIR = path.join(__dirname, '../../uploads/temp/suppliers');

// Crear directorio si no existe
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configuración de storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Generar nombre único: timestamp_random_originalname
        const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        const safeName = basename.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
        cb(null, `${uniqueSuffix}_${safeName}${ext}`);
    }
});

// Filtro de archivos permitidos
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        // Documentos
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

        // Hojas de cálculo
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

        // Imágenes
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',

        // Comprimidos
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Permitidos: PDF, Word, Excel, imágenes, ZIP`), false);
    }
};

// Configuración de multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 5 // Máximo 5 archivos por request
    }
});

// Middleware para single file upload
const uploadSingle = (fieldName) => {
    return (req, res, next) => {
        const uploadHandler = upload.single(fieldName);

        uploadHandler(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                // Error de multer
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        error: 'Archivo demasiado grande',
                        message: 'El tamaño máximo permitido es 10MB'
                    });
                }
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    return res.status(400).json({
                        error: 'Campo de archivo inesperado',
                        message: `Se esperaba el campo: ${fieldName}`
                    });
                }
                return res.status(400).json({
                    error: 'Error al subir archivo',
                    message: err.message
                });
            } else if (err) {
                // Error personalizado (fileFilter)
                return res.status(400).json({
                    error: 'Archivo rechazado',
                    message: err.message
                });
            }

            // Validar que se subió un archivo
            if (!req.file) {
                return res.status(400).json({
                    error: 'No se proporcionó ningún archivo',
                    message: `Debe incluir un archivo en el campo: ${fieldName}`
                });
            }

            next();
        });
    };
};

// Middleware para multiple files upload
const uploadMultiple = (fieldName, maxCount = 5) => {
    return (req, res, next) => {
        const uploadHandler = upload.array(fieldName, maxCount);

        uploadHandler(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        error: 'Uno o más archivos son demasiado grandes',
                        message: 'El tamaño máximo por archivo es 10MB'
                    });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        error: 'Demasiados archivos',
                        message: `Máximo ${maxCount} archivos por solicitud`
                    });
                }
                return res.status(400).json({
                    error: 'Error al subir archivos',
                    message: err.message
                });
            } else if (err) {
                return res.status(400).json({
                    error: 'Archivos rechazados',
                    message: err.message
                });
            }

            // Validar que se subieron archivos
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    error: 'No se proporcionaron archivos',
                    message: `Debe incluir al menos un archivo en el campo: ${fieldName}`
                });
            }

            next();
        });
    };
};

// Cleanup: eliminar archivo temporal después de procesarlo
const cleanupTempFile = async (filePath) => {
    try {
        if (filePath && fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            console.log(`🗑️ [CLEANUP] Archivo temporal eliminado: ${filePath}`);
        }
    } catch (error) {
        console.error(`⚠️ [CLEANUP] Error eliminando archivo temporal: ${error.message}`);
    }
};

module.exports = {
    uploadSingle,
    uploadMultiple,
    cleanupTempFile,
    UPLOAD_DIR
};
