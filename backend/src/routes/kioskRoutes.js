const express = require('express');
const router = express.Router();
const { Kiosk } = require('../config/database');
const { auth } = require('../middleware/auth');

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

/**
 * @route GET /api/v1/kiosks
 * @desc Obtener todos los kioscos de la empresa del usuario
 */
router.get('/', auth, async (req, res) => {
  try {
    // Obtener company_id del usuario autenticado
    const companyId = req.user?.company_id || 1;

    console.log(`📟 [KIOSKS] Obteniendo kioscos para empresa ${companyId}`);

    const kiosks = await Kiosk.findAll({
      where: {
        is_active: true,
        company_id: companyId
      },
      order: [['name', 'ASC']]
    });

    console.log(`✅ [KIOSKS] Encontrados ${kiosks.length} kioscos`);

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
        id: req.user.user_id || req.user.id,
        email: req.user.email,
        company_id: req.user.company_id
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
router.post('/configure-security', async (req, res) => {
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
router.get('/security-info', async (req, res) => {
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
router.post('/password-auth', upload.single('securityPhoto'), async (req, res) => {
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

    // Buscar kiosk ID
    const [kiosks] = await sequelize.query(`
      SELECT id FROM kiosks
      WHERE device_id = :deviceId AND company_id = :companyId AND is_active = true
      LIMIT 1
    `, {
      replacements: { deviceId, companyId }
    });

    const kioskId = kiosks.length > 0 ? kiosks[0].id : null;

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
    const bcrypt = require('bcryptjs');
    const passwordValid = await bcrypt.compare(password, user.password);

    // TODO: Integrar face-api.js para matching facial con securityPhoto
    let facialSimilarity = null;
    let requiresHRReview = false;

    if (user.has_facial_biometric) {
      // Simulamos similaridad por ahora
      facialSimilarity = passwordValid ? 0.85 : 0.45;

      if (passwordValid && facialSimilarity < 0.7) {
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

    console.log(`✅ [KIOSKS] Password auth exitoso para legajo ${legajo}`);

    res.json({
      success: true,
      message: 'Autenticación exitosa',
      user: {
        user_id: user.user_id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        legajo: user.legajo,
        department_name: user.department_name
      },
      password_valid: true,
      facial_similarity: facialSimilarity,
      requires_hr_review: requiresHRReview,
      warning: requiresHRReview ? 'Autenticación exitosa pero con baja similaridad facial. Enviado a revisión de RRHH.' : null
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

module.exports = router;
