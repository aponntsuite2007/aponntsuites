const express = require('express');
const router = express.Router();
const { Kiosk } = require('../config/database');
const { auth } = require('../middleware/auth');
const { checkConsentStatus, CONSENT_ERROR_CODES } = require('../middleware/biometricConsentCheck');
const rateLimit = require('express-rate-limit');
const { body, query, param, validationResult } = require('express-validator');

// ═══════════════════════════════════════════════════════════════
// 🛡️ RATE LIMITERS - Protección contra brute force
// ═══════════════════════════════════════════════════════════════
const kioskAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos
  message: { success: false, error: 'Demasiados intentos de autenticación. Intente en 15 minutos.', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.deviceId || req.ip
});

const kioskActivateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // 5 intentos
  message: { success: false, error: 'Demasiados intentos de activación. Intente en 1 hora.', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

const kioskGPSLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // 20 updates
  message: { success: false, error: 'Demasiadas actualizaciones de GPS. Intente en 5 minutos.', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.device_id || req.ip
});

const kioskConfigLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos
  message: { success: false, error: 'Demasiadas solicitudes de configuración. Intente en 15 minutos.', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.deviceId || req.query?.deviceId || req.ip
});

// ═══════════════════════════════════════════════════════════════
// 🛡️ INPUT VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Datos de entrada inválidos',
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

// ═══════════════════════════════════════════════════════════════
// 🛡️ DEVICE TOKEN VALIDATION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
const validateDeviceToken = async (req, res, next) => {
  try {
    const deviceId = req.body?.deviceId || req.query?.deviceId;
    const companyId = req.body?.companyId || req.query?.companyId;

    if (!deviceId || !companyId) {
      return res.status(400).json({
        success: false,
        error: 'deviceId y companyId son requeridos para autenticación de dispositivo'
      });
    }

    const { sequelize } = require('../config/database-postgresql');
    const [kiosks] = await sequelize.query(`
      SELECT id, name FROM kiosks
      WHERE device_id = :deviceId AND company_id = :companyId AND is_active = true
      LIMIT 1
    `, { replacements: { deviceId, companyId: parseInt(companyId) } });

    if (kiosks.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Dispositivo no registrado o kiosko inactivo',
        code: 'DEVICE_NOT_REGISTERED'
      });
    }

    req.kiosk = kiosks[0];
    next();
  } catch (error) {
    console.error('❌ [KIOSK-AUTH] Error validando dispositivo:', error.message);
    return res.status(500).json({ success: false, error: 'Error validando dispositivo' });
  }
};

// Helper: Transformar kiosko al formato del frontend
function formatKiosk(kiosk) {
  const kioskData = kiosk.toJSON ? kiosk.toJSON() : kiosk;
  return {
    id: kioskData.id,
    name: kioskData.name,
    description: kioskData.description,
    location: kioskData.location,
    deviceId: kioskData.device_id,
    gpsLocation: {
      lat: kioskData.gps_lat,
      lng: kioskData.gps_lng
    },
    isConfigured: kioskData.is_configured,
    isActive: kioskData.is_active,
    createdAt: kioskData.created_at,
    updatedAt: kioskData.updated_at,
    companyId: kioskData.company_id
  };
}

// ==============================================
// 📄 INTEGRACIÓN DMS - SSOT DOCUMENTAL
// ==============================================
const registerKioskDocInDMS = async (req, file, documentType, metadata = {}) => {
    try {
        const dmsService = req.app.get('dmsIntegrationService');
        if (!dmsService) {
            console.warn('⚠️ [KIOSK-DMS] DMSIntegrationService no disponible');
            return null;
        }

        const companyId = metadata.companyId || req.body?.companyId;
        const userId = metadata.userId;

        const result = await dmsService.registerDocument({
            module: 'biometric',
            documentType: documentType === 'security_photo' ? 'BIOMETRIC_SECURITY' : 'BIOMETRIC_GENERAL',
            companyId,
            employeeId: userId,
            createdById: userId,
            sourceEntityType: 'kiosk-auth',
            sourceEntityId: metadata.kioskId || null,
            file: {
                buffer: file.buffer, // memoryStorage = buffer directo
                originalname: file.originalname || 'security_photo.jpg',
                mimetype: file.mimetype,
                size: file.size
            },
            title: `Kiosk Security Photo - User ${userId}`,
            description: `Foto de seguridad capturada en autenticación por password`,
            metadata: { uploadRoute: req.originalUrl, deviceId: metadata.deviceId, ...metadata }
        });

        console.log(`📄 [DMS-KIOSK] Registrado: ${documentType} - ${result.document?.id}`);
        return result;
    } catch (error) {
        console.error('❌ [DMS-KIOSK] Error registrando:', error.message);
        return null;
    }
};

/**
 * @route GET /api/v1/kiosks/available
 * @desc Obtener kioscos disponibles (no activos) para configurar - SIN AUTH
 */
router.get('/available', async (req, res) => {
  try {
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: 'company_id es requerido'
      });
    }

    console.log(`📟 [KIOSKS-AVAILABLE] Consultando kioscos disponibles para empresa ${company_id}`);

    // Obtener kioscos que NO están habilitados en otro dispositivo
    // Condiciones: misma empresa, no activos, y sin device_id asignado
    const { sequelize } = require('../config/database');
    const [kiosks] = await sequelize.query(`
      SELECT id, name, description, location, device_id,
             gps_lat, gps_lng, is_configured, is_active,
             created_at, updated_at, company_id
      FROM kiosks
      WHERE company_id = :companyId
        AND (is_active = false OR is_active IS NULL)
        AND (device_id IS NULL OR device_id = '')
      ORDER BY name ASC
    `, {
      replacements: { companyId: parseInt(company_id) }
    });

    console.log(`✅ [KIOSKS-AVAILABLE] Encontrados ${kiosks.length} kioscos disponibles`);

    const formattedKiosks = kiosks.map(kiosk => ({
      id: kiosk.id,
      name: kiosk.name,
      description: kiosk.description,
      location: kiosk.location,
      deviceId: kiosk.device_id,
      gpsLocation: {
        lat: kiosk.gps_lat,
        lng: kiosk.gps_lng
      },
      isConfigured: kiosk.is_configured,
      isActive: kiosk.is_active,
      createdAt: kiosk.created_at,
      updatedAt: kiosk.updated_at,
      companyId: kiosk.company_id
    }));

    res.json({
      success: true,
      kiosks: formattedKiosks,
      count: formattedKiosks.length
    });

  } catch (error) {
    console.error('❌ [KIOSKS-AVAILABLE] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/kiosks
 * @desc Obtener todos los kioscos de la empresa del usuario
 */
router.get('/', auth, async (req, res) => {
  try {
    // Obtener company_id del usuario autenticado
    const companyId = req.user?.company_id || req.user?.companyId || 1;

    console.log(`📟 [KIOSKS] Obteniendo kioscos para empresa ${companyId}`);
    console.log(`📟 [KIOSKS] Usuario:`, req.user?.user_id, 'Company:', companyId);

    const kiosks = await Kiosk.findAll({
      where: {
        company_id: companyId
      },
      order: [['name', 'ASC']]
    });

    console.log(`✅ [KIOSKS] Encontrados ${kiosks.length} kioscos activos/inactivos`);

    // Transformar datos al formato que espera el frontend
    const formattedKiosks = kiosks.map(formatKiosk);

    res.json({
      success: true,
      kiosks: formattedKiosks,
      count: formattedKiosks.length
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error obteniendo kioscos:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/kiosks/:id
 * @desc Obtener kiosko específico
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;

    const kiosk = await Kiosk.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!kiosk) {
      return res.status(404).json({
        error: 'Kiosko no encontrado',
        success: false
      });
    }

    res.json({
      success: true,
      data: formatKiosk(kiosk)
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error obteniendo kiosko:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false
    });
  }
});

/**
 * @route POST /api/v1/kiosks
 * @desc Crear nuevo kiosko
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      description,
      location,
      deviceId,
      device_id,
      gps_lat,
      gps_lng,
      gpsLocation
    } = req.body;

    const companyId = req.user?.company_id || 1;

    console.log('📝 [KIOSKS] Creando kiosko:', {
      name,
      location,
      companyId,
      bodyData: req.body,
      userFromAuth: req.user ? {
        id: req.user.user_id,
        email: req.user.email,
        company_id: req.user.companyId
      } : 'NO USER'
    });

    if (!name) {
      return res.status(400).json({
        error: 'El nombre del kiosko es requerido',
        success: false
      });
    }

    // GPS es opcional - se autocompleta cuando el kiosko físico se conecta
    const lat = gpsLocation?.lat || gps_lat || null;
    const lng = gpsLocation?.lng || gps_lng || null;

    // Mapear datos del frontend al formato de la base de datos
    const kioskData = {
      name: name.trim(),
      description: description || '',
      location: location || null,
      device_id: deviceId || device_id || null,
      gps_lat: lat,
      gps_lng: lng,
      is_configured: !!(name && location), // Configurado si tiene nombre y ubicación descriptiva
      is_active: true,
      company_id: companyId
    };

    console.log('📝 [KIOSKS] Datos procesados:', kioskData);

    const kiosk = await Kiosk.create(kioskData);

    console.log('✅ [KIOSKS] Kiosko creado exitosamente:', kiosk.id);

    res.status(201).json({
      success: true,
      data: formatKiosk(kiosk),
      message: 'Kiosko creado exitosamente'
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error creando kiosko:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Ya existe un kiosko con ese nombre o coordenadas GPS en esta empresa',
        success: false
      });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Datos de kiosko inválidos: ' + error.message,
        success: false
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route PUT /api/v1/kiosks/:id
 * @desc Actualizar kiosko
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      name,
      description,
      location,
      deviceId,
      device_id,
      gps_lat,
      gps_lng,
      gpsLocation,
      isActive
    } = req.body;

    const companyId = req.user?.company_id || 1;

    console.log('✏️ [KIOSKS] Actualizando kiosko:', req.params.id, {
      bodyData: req.body,
      companyId
    });

    const kiosk = await Kiosk.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!kiosk) {
      return res.status(404).json({
        error: 'Kiosko no encontrado',
        success: false
      });
    }

    // Preparar datos de actualización (solo actualizar campos enviados)
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (deviceId !== undefined || device_id !== undefined) {
      updateData.device_id = deviceId || device_id || null;
    }

    // Actualizar GPS si viene en cualquier formato
    if (gpsLocation?.lat !== undefined || gps_lat !== undefined) {
      updateData.gps_lat = gpsLocation?.lat || gps_lat || null;
    }
    if (gpsLocation?.lng !== undefined || gps_lng !== undefined) {
      updateData.gps_lng = gpsLocation?.lng || gps_lng || null;
    }

    // Actualizar estado activo
    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    console.log('✏️ [KIOSKS] Datos a actualizar:', updateData);

    await kiosk.update(updateData);

    console.log('✅ [KIOSKS] Kiosko actualizado exitosamente');

    res.json({
      success: true,
      data: formatKiosk(kiosk),
      message: 'Kiosko actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error actualizando kiosko:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Ya existe un kiosko con ese nombre o coordenadas GPS en esta empresa',
        success: false
      });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Datos de kiosko inválidos: ' + error.message,
        success: false
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route DELETE /api/v1/kiosks/:id
 * @desc Eliminar kiosko (soft delete)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;

    const kiosk = await Kiosk.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!kiosk) {
      return res.status(404).json({
        error: 'Kiosko no encontrado',
        success: false
      });
    }

    await kiosk.update({ is_active: false });

    console.log(`✅ [KIOSKS] Kiosko ${kiosk.id} marcado como inactivo`);

    res.json({
      success: true,
      message: 'Kiosko eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error eliminando kiosko:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/kiosks/:id/validate-gps
 * @desc Validar GPS de un empleado contra ubicación del kiosko
 */
router.post('/:id/validate-gps', auth, async (req, res) => {
  try {
    const { userLat, userLng, maxDistance = 100 } = req.body;
    const companyId = req.user?.company_id || 1;

    const kiosk = await Kiosk.findOne({
      where: {
        id: req.params.id,
        company_id: companyId,
        is_active: true
      }
    });

    if (!kiosk) {
      return res.status(404).json({
        error: 'Kiosko no encontrado',
        success: false
      });
    }

    if (!kiosk.gps_lat || !kiosk.gps_lng) {
      return res.status(400).json({
        error: 'Kiosko no tiene coordenadas GPS configuradas',
        success: false
      });
    }

    if (!userLat || !userLng) {
      return res.status(400).json({
        error: 'Se requieren coordenadas GPS del usuario',
        success: false
      });
    }

    // Calcular distancia usando el método del modelo
    const distance = kiosk.getDistanceToLocation(userLat, userLng);

    const isValid = distance !== null && distance <= maxDistance;

    console.log(`📍 [KIOSKS] Validación GPS - Kiosko: ${kiosk.name}, Distancia: ${distance}m, Válido: ${isValid}`);

    res.json({
      success: true,
      valid: isValid,
      distance: distance,
      maxDistance: maxDistance,
      kioskName: kiosk.name,
      kioskLocation: {
        lat: parseFloat(kiosk.gps_lat),
        lng: parseFloat(kiosk.gps_lng)
      }
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error validando GPS:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

// ====================================================================================
// NUEVOS ENDPOINTS PARA SEGURIDAD Y CONFIGURACIÓN AVANZADA
// ====================================================================================

const { sequelize } = require('../config/database-postgresql');
const multer = require('multer');
const path = require('path');

// Configurar multer para recibir fotos de seguridad
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten archivos de imagen (jpeg, jpg, png)'));
  }
});

/**
 * @route POST /api/v1/kiosks/configure-security
 * @desc Configurar opciones de seguridad del kiosko (lector externo, departamentos autorizados)
 */
router.post('/configure-security', kioskConfigLimiter, validateDeviceToken, async (req, res) => {
  try {
    const {
      deviceId,
      companyId,
      hasExternalReader,
      readerModel,
      readerConfig,
      authorizedDepartments
    } = req.body;

    if (!deviceId || !companyId) {
      return res.status(400).json({
        success: false,
        error: 'deviceId y companyId son requeridos'
      });
    }

    // Actualizar configuración de seguridad en la tabla kiosks
    const [result] = await sequelize.query(`
      UPDATE kiosks
      SET
        has_external_reader = COALESCE(:hasExternalReader, has_external_reader),
        reader_model = COALESCE(:readerModel, reader_model),
        reader_config = COALESCE(:readerConfig::jsonb, reader_config),
        authorized_departments = COALESCE(:authorizedDepartments::jsonb, authorized_departments),
        last_seen = NOW(),
        updated_at = NOW()
      WHERE device_id = :deviceId
        AND company_id = :companyId
        AND is_active = true
      RETURNING id, name, has_external_reader, reader_model, authorized_departments
    `, {
      replacements: {
        deviceId,
        companyId,
        hasExternalReader: hasExternalReader !== undefined ? hasExternalReader : null,
        readerModel: readerModel || null,
        readerConfig: readerConfig ? JSON.stringify(readerConfig) : null,
        authorizedDepartments: authorizedDepartments ? JSON.stringify(authorizedDepartments) : null
      }
    });

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kiosko no encontrado. Registre primero el kiosko antes de configurar seguridad.'
      });
    }

    console.log(`✅ [KIOSKS] Configuración de seguridad actualizada para kiosko ${result[0].id}`);

    res.json({
      success: true,
      message: 'Configuración de seguridad actualizada exitosamente',
      kiosk: result[0]
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error configurando seguridad:', error);
    res.status(500).json({
      success: false,
      error: 'Error configurando seguridad del kiosko',
      details: error.message
    });
  }
});

/**
 * @route GET /api/v1/kiosks/security-info
 * @desc Obtener configuración de seguridad del kiosko (sin auth para APK)
 */
router.get('/security-info', kioskConfigLimiter, validateDeviceToken, async (req, res) => {
  try {
    const { deviceId, companyId } = req.query;

    if (!deviceId || !companyId) {
      return res.status(400).json({
        success: false,
        error: 'deviceId y companyId son requeridos'
      });
    }

    const [kiosks] = await sequelize.query(`
      SELECT
        k.id,
        k.name,
        k.device_id,
        k.has_external_reader,
        k.reader_model,
        k.reader_config,
        k.authorized_departments,
        jsonb_array_length(COALESCE(k.authorized_departments, '[]'::jsonb)) as authorized_dept_count
      FROM kiosks k
      WHERE k.device_id = :deviceId
        AND k.company_id = :companyId
        AND k.is_active = true
      LIMIT 1
    `, {
      replacements: { deviceId, companyId }
    });

    if (kiosks.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kiosko no encontrado'
      });
    }

    // Actualizar last_seen
    await sequelize.query(`
      UPDATE kiosks
      SET last_seen = NOW()
      WHERE device_id = :deviceId AND company_id = :companyId
    `, {
      replacements: { deviceId, companyId }
    });

    res.json({
      success: true,
      kiosk: kiosks[0]
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error obteniendo info de seguridad:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo información de seguridad',
      details: error.message
    });
  }
});

/**
 * @route GET /api/v1/kiosks/security-alerts
 * @desc Obtener alertas de seguridad para revisión de RRHH
 */
router.get('/security-alerts', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || req.query.companyId;
    const requiresReview = req.query.requiresReview;
    const limit = parseInt(req.query.limit) || 50;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'companyId es requerido'
      });
    }

    const requiresReviewFilter = requiresReview === 'true' ? 'AND requires_hr_review = true' : '';

    const [alerts] = await sequelize.query(`
      SELECT
        alert_type,
        id,
        employee_id,
        employee_name,
        employee_department,
        kiosk_name,
        attempt_type,
        reason,
        timestamp,
        requires_hr_review,
        reviewed_by,
        reviewed_at
      FROM v_hr_security_alerts
      WHERE company_id = :companyId
        ${requiresReviewFilter}
      ORDER BY timestamp DESC
      LIMIT :limit
    `, {
      replacements: { companyId, limit }
    });

    // Contar alertas pendientes
    const [counts] = await sequelize.query(`
      SELECT COUNT(*) as total_pending
      FROM v_hr_security_alerts
      WHERE company_id = :companyId
        AND requires_hr_review = true
    `, {
      replacements: { companyId }
    });

    res.json({
      success: true,
      alerts,
      pending_count: parseInt(counts[0].total_pending),
      total_returned: alerts.length
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error obteniendo alertas de seguridad:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo alertas de seguridad',
      details: error.message
    });
  }
});

/**
 * @route POST /api/v1/kiosks/security-alerts/:id/review
 * @desc Marcar una alerta de seguridad como revisada por RRHH
 */
router.post('/security-alerts/:id/review', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { alertType, reviewNotes } = req.body;
    const reviewerId = req.user?.user_id || req.user?.id;

    if (!id || !alertType) {
      return res.status(400).json({
        success: false,
        error: 'id y alertType son requeridos'
      });
    }

    let table;
    if (alertType === 'unauthorized_access') {
      table = 'unauthorized_access_attempts';
    } else if (alertType === 'password_suspicious') {
      table = 'password_auth_attempts';
    } else {
      return res.status(400).json({
        success: false,
        error: 'alertType inválido. Debe ser "unauthorized_access" o "password_suspicious"'
      });
    }

    await sequelize.query(`
      UPDATE ${table}
      SET
        requires_hr_review = false,
        reviewed_by = :reviewerId,
        reviewed_at = NOW(),
        review_notes = :reviewNotes
      WHERE id = :id
    `, {
      replacements: {
        id,
        reviewerId: reviewerId || null,
        reviewNotes: reviewNotes || null
      }
    });

    console.log(`✅ [KIOSKS] Alerta ${id} marcada como revisada`);

    res.json({
      success: true,
      message: 'Alerta marcada como revisada'
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error revisando alerta:', error);
    res.status(500).json({
      success: false,
      error: 'Error revisando alerta',
      details: error.message
    });
  }
});

/**
 * @route POST /api/v1/kiosks/password-auth
 * @desc Autenticación por contraseña con foto de seguridad
 * Multipart form-data: legajo, password, companyId, deviceId, securityPhoto (file)
 */
router.post('/password-auth',
  kioskAuthLimiter,
  upload.single('securityPhoto'),
  [
    body('legajo').trim().isAlphanumeric().withMessage('Legajo debe ser alfanumérico').isLength({ min: 1, max: 50 }),
    body('password').isLength({ min: 1, max: 128 }).withMessage('Password requerido'),
    body('companyId').isInt({ min: 1 }).withMessage('companyId debe ser entero positivo'),
    body('deviceId').trim().isLength({ min: 1, max: 255 }).withMessage('deviceId requerido')
  ],
  handleValidationErrors,
  validateDeviceToken,
  async (req, res) => {
  try {
    const { legajo, password, companyId, deviceId } = req.body;
    const securityPhotoBuffer = req.file ? req.file.buffer : null;

    if (!legajo || !password || !companyId || !deviceId) {
      return res.status(400).json({
        success: false,
        error: 'legajo, password, companyId y deviceId son requeridos'
      });
    }

    if (!securityPhotoBuffer) {
      return res.status(400).json({
        success: false,
        error: 'Foto de seguridad es requerida'
      });
    }

    // Buscar usuario por legajo
    const [users] = await sequelize.query(`
      SELECT
        u.user_id,
        u."firstName",
        u."lastName",
        u.email,
        u.password,
        u.legajo,
        u.company_id,
        u.department_id,
        u.has_facial_biometric,
        d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.legajo = :legajo
        AND u.company_id = :companyId
        AND u."isActive" = true
      LIMIT 1
    `, {
      replacements: { legajo, companyId }
    });

    // Buscar kiosk ID + departamentos autorizados
    const [kiosks] = await sequelize.query(`
      SELECT id, authorized_departments FROM kiosks
      WHERE device_id = :deviceId AND company_id = :companyId AND is_active = true
      LIMIT 1
    `, {
      replacements: { deviceId, companyId }
    });

    const kioskId = kiosks.length > 0 ? kiosks[0].id : null;
    const authorizedDepartments = kiosks.length > 0 ? (kiosks[0].authorized_departments || []) : [];

    if (users.length === 0) {
      // Registrar intento fallido
      await sequelize.query(`
        INSERT INTO password_auth_attempts (
          employee_id, company_id, kiosk_id, password_valid, security_photo,
          success, requires_hr_review, notes, device_id, timestamp
        ) VALUES (
          NULL, :companyId, :kioskId, false, :securityPhoto,
          false, true, 'Usuario no encontrado con legajo: ' || :legajo, :deviceId, NOW()
        )
      `, {
        replacements: {
          companyId,
          kioskId,
          securityPhoto: securityPhotoBuffer,
          legajo,
          deviceId
        }
      });

      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        error: 'Credenciales inválidas'
      });
    }

    const user = users[0];

    // ═══════════════════════════════════════════════════════════════
    // VALIDAR DEPARTAMENTO AUTORIZADO EN KIOSK (Multi-tenant)
    // Si el kiosk tiene departamentos configurados, solo permite
    // fichar a empleados de esos departamentos específicos.
    // Array vacío = todos los departamentos permitidos.
    // ═══════════════════════════════════════════════════════════════
    if (authorizedDepartments.length > 0 && user.department_id) {
      const deptIdStr = String(user.department_id);
      const isAuthorized = authorizedDepartments.some(d => String(d) === deptIdStr);

      if (!isAuthorized) {
        console.log(`🚫 [KIOSK] Departamento ${user.department_id} (${user.department_name}) NO autorizado en kiosk ${kioskId}`);

        // Descartar foto
        if (req.file) {
          req.file.buffer = null;
        }

        return res.status(403).json({
          success: false,
          code: 'DEPARTMENT_NOT_AUTHORIZED',
          error: 'Su departamento no está autorizado para fichar en este kiosco.',
          department: user.department_name || 'Sin departamento'
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // VERIFICAR CONSENTIMIENTO BIOMÉTRICO (Ley 25.326 / GDPR / BIPA)
    // Se requiere para captura de foto de seguridad
    // ═══════════════════════════════════════════════════════════════
    const consentResult = await checkConsentStatus(user.user_id, companyId);

    if (!consentResult.hasConsent) {
      console.log(`🔒 [KIOSK] Usuario ${user.user_id} sin consentimiento biométrico: ${consentResult.errorCode}`);

      // 🛡️ Descartar buffer de foto inmediatamente si no hay consent
      if (req.file) {
        req.file.buffer = null;
      }

      return res.status(403).json({
        success: false,
        code: 'CONSENT_REQUIRED',
        error: consentResult.message || 'Se requiere consentimiento biométrico para autenticación con foto.',
        consentInfo: {
          errorCode: consentResult.errorCode,
          requestUrl: `/api/v1/biometric/consents/request?userId=${user.user_id}`
        },
        legal: {
          regulation: 'Ley 25.326 (Argentina) / GDPR (EU) / BIPA (USA)',
          requirement: 'Consentimiento explícito requerido para captura de datos biométricos'
        }
      });
    }

    const bcrypt = require('bcryptjs');
    const passwordValid = await bcrypt.compare(password, user.password);

    // 🧠 FACE MATCHING REAL contra biometric_templates (non-blocking)
    let facialSimilarity = null;
    let requiresHRReview = false;

    if (user.has_facial_biometric && securityPhotoBuffer) {
      try {
        const { faceAPIEngine } = require('../services/face-api-backend-engine');
        const matchResult = await faceAPIEngine.matchFaceAgainstTemplate(
          securityPhotoBuffer,
          user.user_id,
          parseInt(companyId)
        );

        if (matchResult.success) {
          facialSimilarity = matchResult.similarity;
          console.log(`🧠 [KIOSK] Face match para ${user.legajo}: similarity=${facialSimilarity.toFixed(3)}`);
        } else {
          console.log(`⚠️ [KIOSK] Face match falló para ${user.legajo}: ${matchResult.error}`);
          facialSimilarity = null; // No penalizar si face matching falla
        }
      } catch (faceError) {
        console.error(`⚠️ [KIOSK] Error en face matching (non-blocking): ${faceError.message}`);
        facialSimilarity = null;
      }

      // Solo requerir revisión si face matching funcionó pero dio baja similaridad
      if (facialSimilarity !== null && passwordValid && facialSimilarity < 0.65) {
        requiresHRReview = true;
      }
    }

    if (!passwordValid) {
      requiresHRReview = true;
    }

    // Registrar intento
    await sequelize.query(`
      INSERT INTO password_auth_attempts (
        employee_id, company_id, kiosk_id, password_valid, facial_similarity,
        security_photo, success, requires_hr_review, notes, device_id, timestamp
      ) VALUES (
        :employeeId, :companyId, :kioskId, :passwordValid, :facialSimilarity,
        :securityPhoto, :success, :requiresHRReview, :notes, :deviceId, NOW()
      )
    `, {
      replacements: {
        employeeId: user.user_id,
        companyId,
        kioskId,
        passwordValid,
        facialSimilarity,
        securityPhoto: securityPhotoBuffer,
        success: passwordValid,
        requiresHRReview,
        notes: requiresHRReview ? 'Requiere revisión: similaridad facial baja o contraseña inválida' : null,
        deviceId
      }
    });

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_PASSWORD',
        error: 'Credenciales inválidas',
        requires_hr_review: true
      });
    }

    // ✅ Registrar foto de seguridad en DMS (SSOT)
    let dmsResult = null;
    if (req.file) {
      dmsResult = await registerKioskDocInDMS(req, req.file, 'security_photo', {
        companyId,
        userId: user.user_id,
        kioskId,
        deviceId,
        legajo
      });
    }

    console.log(`✅ [KIOSKS] Password auth exitoso para legajo ${legajo}`);

    // 📋 REGISTRO AUTOMÁTICO DE ASISTENCIA (ENTRADA/SALIDA)
    let operationType = 'clock_in';
    let wasRegistered = false;
    let attendanceId = null;
    let registrationMessage = '';

    try {
      // 1. Buscar última asistencia del empleado HOY
      const today = new Date().toISOString().split('T')[0];
      const [todayRows] = await sequelize.query(`
        SELECT id, "checkInTime", "checkOutTime", status
        FROM attendances
        WHERE "UserId" = :employeeId
          AND DATE("checkInTime") = :today
        ORDER BY "checkInTime" DESC
        LIMIT 1
      `, { replacements: { employeeId: user.user_id, today } });

      const todayAttendance = todayRows.length > 0 ? todayRows[0] : null;

      // 2. Determinar operación
      if (!todayAttendance) {
        operationType = 'clock_in';
      } else if (!todayAttendance.checkOutTime) {
        // Verificar mínimo entre entrada y salida (configurable, default 15 min)
        const MIN_SECONDS = parseInt(process.env.MIN_SECONDS_ENTRY_EXIT || '900'); // 15 min
        const checkInTime = new Date(todayAttendance.checkInTime);
        const secondsSince = (Date.now() - checkInTime.getTime()) / 1000;

        if (secondsSince < MIN_SECONDS) {
          const minutesRemaining = Math.ceil((MIN_SECONDS - secondsSince) / 60);
          return res.json({
            success: true,
            registered: false,
            message: `Debe esperar ${minutesRemaining} minutos más para registrar la salida.`,
            employee: { name: `${user.firstName} ${user.lastName}` },
            operationType: 'cooldown',
            minutesRemaining
          });
        }
        operationType = 'clock_out';
        attendanceId = todayAttendance.id;
      } else {
        operationType = 'clock_in'; // Re-ingreso
      }

      // 3. Registrar asistencia
      const now = new Date();
      if (operationType === 'clock_in') {
        const [insertResult] = await sequelize.query(`
          INSERT INTO attendances ("UserId", "checkInTime", status, origin_type, "checkInMethod", company_id, work_date, created_at, updated_at)
          VALUES (:userId, :now, 'present', 'kiosk', 'password', :companyId, :today, :now, :now)
          RETURNING id
        `, { replacements: { userId: user.user_id, now, companyId, today } });
        attendanceId = insertResult[0]?.id;
        registrationMessage = 'Entrada registrada';
      } else {
        // clock_out: calcular horas trabajadas
        const checkInTime = new Date(todayAttendance.checkInTime);
        const workedHours = ((now - checkInTime) / 3600000).toFixed(2);

        await sequelize.query(`
          UPDATE attendances
          SET "checkOutTime" = :now, "checkOutMethod" = 'password',
              "workingHours" = :workedHours, updated_at = :now
          WHERE id = :attendanceId
        `, { replacements: { now, workedHours: parseFloat(workedHours), attendanceId } });
        registrationMessage = `Salida registrada (${workedHours}h trabajadas)`;
      }

      wasRegistered = true;
      console.log(`📋 [KIOSKS] Asistencia registrada: ${operationType} para ${legajo} (ID: ${attendanceId})`);
    } catch (attError) {
      console.error(`⚠️ [KIOSKS] Error registrando asistencia (auth OK):`, attError.message);
      registrationMessage = 'Autenticación OK, error al registrar asistencia';
    }

    res.json({
      success: true,
      message: registrationMessage || 'Autenticación exitosa',
      registered: wasRegistered,
      operationType,
      employee: {
        name: `${user.firstName} ${user.lastName}`,
        user_id: user.user_id,
        legajo: user.legajo,
        department_name: user.department_name
      },
      attendanceId,
      password_valid: true,
      facial_similarity: facialSimilarity,
      requiresHrReview: requiresHRReview,
      warning: requiresHRReview ? 'Baja similaridad facial. Enviado a revisión de RRHH.' : null,
      dms: dmsResult ? { documentId: dmsResult.document?.id } : null
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error en password auth:', error);
    res.status(500).json({
      success: false,
      error: 'Error en autenticación',
      details: error.message
    });
  }
});

/**
 * @route POST /api/v1/kiosks/:id/activate
 * @desc Activar un kiosko desde la APK (registrar device_id, GPS, etc.) - SIN AUTH
 */
router.post('/:id/activate', kioskActivateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { device_id, company_id, gps_lat, gps_lng, activated_at } = req.body;

    if (!device_id || !company_id) {
      return res.status(400).json({
        success: false,
        error: 'device_id y company_id son requeridos'
      });
    }

    console.log(`📱 [KIOSKS] Activando kiosko ${id} con device: ${device_id}`);

    // Use raw SQL to avoid Sequelize trying to access columns that may not exist in Render DB
    const { sequelize } = require('../config/database');

    // First check if kiosk exists
    const [existingKiosks] = await sequelize.query(`
      SELECT id, name, location, gps_lat, gps_lng
      FROM kiosks
      WHERE id = :id AND company_id = :companyId
      LIMIT 1
    `, {
      replacements: { id: parseInt(id), companyId: parseInt(company_id) }
    });

    if (existingKiosks.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kiosko no encontrado'
      });
    }

    const existingKiosk = existingKiosks[0];

    // Update kiosk using raw SQL (only columns that definitely exist)
    await sequelize.query(`
      UPDATE kiosks
      SET device_id = :deviceId,
          is_active = true,
          is_configured = true,
          gps_lat = COALESCE(:gpsLat, gps_lat),
          gps_lng = COALESCE(:gpsLng, gps_lng),
          updated_at = NOW()
      WHERE id = :id AND company_id = :companyId
    `, {
      replacements: {
        deviceId: device_id,
        gpsLat: gps_lat || null,
        gpsLng: gps_lng || null,
        id: parseInt(id),
        companyId: parseInt(company_id)
      }
    });

    // Fetch updated kiosk
    const [updatedKiosks] = await sequelize.query(`
      SELECT id, name, description, location, device_id,
             gps_lat, gps_lng, is_configured, is_active,
             created_at, updated_at, company_id
      FROM kiosks
      WHERE id = :id
    `, {
      replacements: { id: parseInt(id) }
    });

    const kiosk = updatedKiosks[0];

    console.log(`✅ [KIOSKS] Kiosko ${kiosk.name} activado exitosamente`);

    res.json({
      success: true,
      message: 'Kiosko activado exitosamente',
      kiosk: {
        id: kiosk.id,
        name: kiosk.name,
        description: kiosk.description,
        location: kiosk.location,
        deviceId: kiosk.device_id,
        gpsLocation: {
          lat: kiosk.gps_lat,
          lng: kiosk.gps_lng
        },
        isConfigured: kiosk.is_configured,
        isActive: kiosk.is_active,
        createdAt: kiosk.created_at,
        updatedAt: kiosk.updated_at,
        companyId: kiosk.company_id
      }
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error activando kiosko:', error);
    res.status(500).json({
      success: false,
      error: 'Error activando kiosko',
      details: error.message
    });
  }
});

/**
 * @route POST /api/v1/kiosks/:id/deactivate
 * @desc Desactivar un kiosko desde la APK (liberar device_id, GPS) - SIN AUTH
 */
router.post('/:id/deactivate', kioskActivateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { device_id, company_id } = req.body;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: 'company_id es requerido'
      });
    }

    console.log(`📱 [KIOSKS] Desactivando kiosko ${id}`);

    const { sequelize } = require('../config/database');

    // Verificar que el kiosko existe y pertenece a la empresa
    const [existingKiosks] = await sequelize.query(`
      SELECT id, name, device_id
      FROM kiosks
      WHERE id = :id AND company_id = :companyId
      LIMIT 1
    `, {
      replacements: { id: parseInt(id), companyId: parseInt(company_id) }
    });

    if (existingKiosks.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kiosko no encontrado'
      });
    }

    // Si se proporciona device_id, verificar que coincide con el registrado
    const existingKiosk = existingKiosks[0];
    if (device_id && existingKiosk.device_id && existingKiosk.device_id !== device_id) {
      return res.status(403).json({
        success: false,
        error: 'Este kiosko está asignado a otro dispositivo'
      });
    }

    // Desactivar: limpiar device_id, is_active=false, is_configured=false
    await sequelize.query(`
      UPDATE kiosks
      SET device_id = NULL,
          is_active = false,
          is_configured = false,
          updated_at = NOW()
      WHERE id = :id AND company_id = :companyId
    `, {
      replacements: {
        id: parseInt(id),
        companyId: parseInt(company_id)
      }
    });

    console.log(`✅ [KIOSKS] Kiosko ${existingKiosk.name} desactivado exitosamente`);

    res.json({
      success: true,
      message: 'Kiosko desactivado exitosamente',
      kiosk: {
        id: parseInt(id),
        name: existingKiosk.name,
        isActive: false,
        isConfigured: false,
        deviceId: null
      }
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error desactivando kiosko:', error);
    res.status(500).json({
      success: false,
      error: 'Error desactivando kiosko',
      details: error.message
    });
  }
});

/**
 * @route POST /api/v1/kiosks/:id/update-gps
 * @desc Actualizar GPS de un kiosko desde la APK - SIN AUTH
 */
router.post('/:id/update-gps',
  kioskGPSLimiter,
  [
    param('id').isInt({ min: 1 }).withMessage('ID de kiosko inválido'),
    body('company_id').isInt({ min: 1 }).withMessage('company_id debe ser entero positivo'),
    body('gps_lat').isFloat({ min: -90, max: 90 }).withMessage('gps_lat debe estar entre -90 y 90'),
    body('gps_lng').isFloat({ min: -180, max: 180 }).withMessage('gps_lng debe estar entre -180 y 180')
  ],
  handleValidationErrors,
  async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id, gps_lat, gps_lng, device_id } = req.body;

    console.log(`📍 [KIOSKS] Actualizando GPS del kiosko ${id}: ${gps_lat}, ${gps_lng}`);

    const { sequelize } = require('../config/database');

    // Verificar que el kiosko existe
    const [existingKiosks] = await sequelize.query(`
      SELECT id, name, device_id
      FROM kiosks
      WHERE id = :id AND company_id = :companyId
      LIMIT 1
    `, {
      replacements: { id: parseInt(id), companyId: parseInt(company_id) }
    });

    if (existingKiosks.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kiosko no encontrado'
      });
    }

    // Actualizar GPS
    await sequelize.query(`
      UPDATE kiosks
      SET gps_lat = :gpsLat,
          gps_lng = :gpsLng,
          updated_at = NOW()
      WHERE id = :id AND company_id = :companyId
    `, {
      replacements: {
        gpsLat: parseFloat(gps_lat),
        gpsLng: parseFloat(gps_lng),
        id: parseInt(id),
        companyId: parseInt(company_id)
      }
    });

    console.log(`✅ [KIOSKS] GPS actualizado para kiosko ${existingKiosks[0].name}`);

    res.json({
      success: true,
      message: 'GPS actualizado exitosamente',
      gps: { lat: parseFloat(gps_lat), lng: parseFloat(gps_lng) }
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error actualizando GPS:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando GPS',
      details: error.message
    });
  }
});

/**
 * @route POST /api/v1/kiosks/seed-demo
 * @desc Crear kioscos de prueba para DEMO company (SIN AUTH - Solo para testing)
 */
router.post('/seed-demo', kioskActivateLimiter, async (req, res) => {
  try {
    const { sequelize } = require('../config/database');

    console.log('🌱 [KIOSKS] Creando kioscos de demo...');

    // Verificar si ya existen
    const [existing] = await sequelize.query(`
      SELECT COUNT(*) as count FROM kiosks WHERE company_id = 1
    `);

    if (parseInt(existing[0].count) > 0) {
      const [kiosks] = await sequelize.query(`
        SELECT id, name, location, is_active FROM kiosks WHERE company_id = 1
      `);
      return res.json({
        success: true,
        message: 'Ya existen kioscos de demo',
        kiosks: kiosks
      });
    }

    // Crear 2 kioscos de demo para company_id = 1 (DEMO)
    await sequelize.query(`
      INSERT INTO kiosks (name, description, location, company_id, is_active, is_configured, created_at, updated_at)
      VALUES
        ('Kiosko Entrada Principal', 'Kiosko de entrada principal para registro de asistencia', 'Recepción - Planta Baja', 1, false, false, NOW(), NOW()),
        ('Kiosko Administración', 'Kiosko del área administrativa', 'Oficinas Administrativas - Piso 2', 1, false, false, NOW(), NOW())
    `);

    // Obtener los kioscos creados
    const [kiosks] = await sequelize.query(`
      SELECT id, name, description, location, is_active, is_configured
      FROM kiosks WHERE company_id = 1
    `);

    console.log(`✅ [KIOSKS] ${kiosks.length} kioscos de demo creados`);

    res.json({
      success: true,
      message: `${kiosks.length} kioscos de demo creados`,
      kiosks: kiosks
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error creando kioscos de demo:', error);
    res.status(500).json({
      success: false,
      error: 'Error creando kioscos de demo',
      details: error.message
    });
  }
});

module.exports = router;
