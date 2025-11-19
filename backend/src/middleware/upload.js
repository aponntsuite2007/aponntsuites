const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determinar carpeta según el tipo de documento
    let uploadDir = 'public/uploads/';

    // Detectar tipo de documento por el fieldname o ruta
    if (file.fieldname.includes('license') || req.path.includes('license')) {
      uploadDir += 'licenses/';
    } else if (file.fieldname.includes('certificate') || req.path.includes('certificate')) {
      uploadDir += 'certificates/';
    } else if (file.fieldname.includes('photo') || req.path.includes('photo')) {
      uploadDir += 'photos/';
    } else if (file.fieldname.includes('document') || req.path.includes('document')) {
      uploadDir += 'documents/';
    } else if (file.fieldname.includes('biometric') || req.path.includes('biometric')) {
      uploadDir += 'biometric/';
    } else if (file.fieldname.includes('task') || req.path.includes('task')) {
      uploadDir += 'tasks/';
    } else {
      uploadDir += 'general/';
    }

    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`📁 Directorio creado: ${uploadDir}`);
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generar nombre único usando UUID + timestamp + extensión original
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uniqueId}-${timestamp}${ext}`;

    console.log(`📤 Guardando archivo: ${filename} (original: ${file.originalname})`);
    cb(null, filename);
  }
});

// Filtro de tipos de archivo permitidos
const fileFilter = (req, file, cb) => {
  // Extensiones permitidas
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'];

  // MIME types permitidos
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();

  console.log(`🔍 Validando archivo: ${file.originalname} (ext: ${ext}, mime: ${mimeType})`);

  // Validar extensión
  if (!allowedExtensions.includes(ext)) {
    console.log(`❌ Extensión no permitida: ${ext}`);
    return cb(new Error(`Extensión de archivo no permitida: ${ext}. Solo se permiten: ${allowedExtensions.join(', ')}`), false);
  }

  // Validar MIME type
  if (!allowedMimeTypes.includes(mimeType)) {
    console.log(`❌ Tipo MIME no permitido: ${mimeType}`);
    return cb(new Error(`Tipo de archivo no permitido: ${mimeType}. Solo se permiten imágenes (JPG, PNG) y documentos (PDF, DOC, DOCX)`), false);
  }

  console.log(`✅ Archivo válido: ${file.originalname}`);
  cb(null, true);
};

// Configuración de Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB máximo
    files: 10 // Máximo 10 archivos por request
  }
});

// Middleware para manejar errores de Multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Errores específicos de Multer
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'El archivo es demasiado grande. Tamaño máximo: 5 MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Demasiados archivos. Máximo 10 archivos por request'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Campo de archivo inesperado'
      });
    }

    return res.status(400).json({
      error: `Error de upload: ${err.message}`
    });
  }

  // Errores de validación personalizada (fileFilter)
  if (err) {
    console.error('❌ Error en upload:', err.message);
    return res.status(400).json({
      error: err.message
    });
  }

  next();
};

// Middleware para un solo archivo
const uploadSingle = (fieldName) => {
  return [
    upload.single(fieldName),
    handleMulterError
  ];
};

// Middleware para múltiples archivos (mismo campo)
const uploadMultiple = (fieldName, maxCount = 10) => {
  return [
    upload.array(fieldName, maxCount),
    handleMulterError
  ];
};

// Middleware para múltiples archivos (diferentes campos)
const uploadFields = (fields) => {
  return [
    upload.fields(fields),
    handleMulterError
  ];
};

// Función para eliminar archivo (útil para rollback en caso de error)
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Archivo eliminado: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error eliminando archivo:', error);
    return false;
  }
};

// Función para obtener URL pública del archivo
const getFileUrl = (req, filePath) => {
  // filePath viene como: "public/uploads/licenses/uuid-timestamp.jpg"
  // Lo convertimos a: "/uploads/licenses/uuid-timestamp.jpg"
  const publicPath = filePath.replace('public', '');
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}${publicPath}`;
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleMulterError,
  deleteFile,
  getFileUrl
};
