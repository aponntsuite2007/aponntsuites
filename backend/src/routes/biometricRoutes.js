const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { User, BiometricData } = require('../config/database');
const FacialBiometricData = require('../models/FacialBiometricData');
const multer = require('multer');

// Configurar multer para archivos biométricos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * @route POST /api/v1/biometric/face/register
 * @desc Registrar datos biométricos faciales
 */
router.post('/face/register', auth, async (req, res) => {
  try {
    const {
      faceEmbedding,
      faceEmbedding2,
      faceEmbedding3,
      qualityScore,
      confidenceThreshold,
      algorithm,
      algorithmVersion,
      imageWidth,
      imageHeight,
      faceBoxX,
      faceBoxY,
      faceBoxWidth,
      faceBoxHeight,
      landmarks,
      faceAngle,
      deviceId,
      deviceModel,
      appVersion
    } = req.body;

    // Validaciones básicas
    if (!faceEmbedding) {
      return res.status(400).json({
        error: 'faceEmbedding es requerido'
      });
    }

    if (!qualityScore || qualityScore < 50) {
      return res.status(400).json({
        error: 'Calidad de imagen insuficiente. Mínimo 50%'
      });
    }

    // Obtener el usuario (puede ser diferente al autenticado si es un admin registrando)
    const targetUserId = req.body.userId || req.user.user_id;

    const user = await User.findByPk(targetUserId);
    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Verificar si ya existe un template facial primary para este usuario
    const existingPrimary = await FacialBiometricData.findOne({
      where: {
        userId: targetUserId,
        isPrimary: true,
        isActive: true
      }
    });

    // Si existe primary, este será secondary
    const isPrimary = !existingPrimary;

    // Crear registro biométrico facial
    const facialData = await BiometricData.create({
      userId: targetUserId,
      faceEmbedding,
      faceEmbedding2,
      faceEmbedding3,
      qualityScore,
      confidenceThreshold: confidenceThreshold || 0.85,
      algorithm: algorithm || 'mlkit',
      algorithmVersion: algorithmVersion || '1.0',
      imageWidth,
      imageHeight,
      faceBoxX,
      faceBoxY,
      faceBoxWidth,
      faceBoxHeight,
      landmarks,
      faceAngle,
      isPrimary,
      isActive: true,
      isValidated: false,
      deviceId,
      deviceModel,
      appVersion,
      successfulMatches: 0,
      failedAttempts: 0
    });

    console.log(`✅ [BIOMETRIC] Template facial registrado para usuario ${user.employeeId}`);

    res.status(201).json({
      success: true,
      message: 'Template facial registrado exitosamente',
      data: {
        id: facialData.id,
        isPrimary: facialData.isPrimary,
        qualityScore: facialData.qualityScore,
        algorithm: facialData.algorithm,
        requiresValidation: !facialData.isValidated
      }
    });

  } catch (error) {
    console.error('❌ [BIOMETRIC] Error registrando template facial:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route POST /api/v1/biometric/face/authenticate
 * @desc Autenticación por reconocimiento facial
 */
router.post('/face/authenticate', async (req, res) => {
  try {
    const {
      faceEmbedding,
      qualityScore,
      algorithm,
      deviceId,
      dni,
      employeeId,
      minConfidence
    } = req.body;

    // Validaciones básicas
    if (!faceEmbedding) {
      return res.status(400).json({
        error: 'faceEmbedding es requerido'
      });
    }

    if (!qualityScore || qualityScore < 40) {
      return res.status(400).json({
        error: 'Calidad de imagen insuficiente para autenticación'
      });
    }

    // Buscar usuario si se proporciona DNI o employeeId
    let targetUserId = null;
    if (dni || employeeId) {
      const user = await User.findOne({
        where: {
          ...(dni && { dni: dni }),
          ...(employeeId && { employeeId: employeeId }),
          isActive: true
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'Usuario no encontrado'
        });
      }
      targetUserId = user.user_id;
    }

    // Buscar templates faciales candidatos
    const whereClause = {
      isActive: true,
      isValidated: true, // Solo templates validados
      ...(targetUserId && { userId: targetUserId })
    };

    const facialTemplates = await FacialBiometricData.findAll({
      where: whereClause,
      include: [{
        model: User,
        attributes: ['id', 'employeeId', 'dni', 'firstName', 'lastName', 'email', 'role']
      }],
      order: [['is_primary', 'DESC'], ['quality_score', 'DESC']] // ✅ Fixed snake_case
    });

    if (facialTemplates.length === 0) {
      return res.status(404).json({
        error: 'No hay templates faciales registrados'
      });
    }

    // Simular comparación de embeddings (aquí iría la lógica real)
    let bestMatch = null;
    let bestScore = 0;
    const threshold = minConfidence || 0.85;

    for (const template of facialTemplates) {
      // NOTA: Aquí iría la comparación real de embeddings
      // Por ahora simulo un score basado en calidad
      const simulatedScore = Math.random() * (0.95 - 0.70) + 0.70;
      
      if (simulatedScore > bestScore && simulatedScore >= threshold) {
        bestScore = simulatedScore;
        bestMatch = template;
      }
    }

    if (!bestMatch || bestScore < threshold) {
      // Incrementar failed attempts para todos los templates del usuario
      if (targetUserId) {
        await FacialBiometricData.increment(
          'failedAttempts',
          { 
            where: { 
              userId: targetUserId,
              isActive: true 
            }
          }
        );
      }

      return res.status(401).json({
        error: 'Reconocimiento facial fallido',
        confidence: bestScore,
        threshold: threshold
      });
    }

    // Actualizar estadísticas del template exitoso
    await bestMatch.update({
      successfulMatches: bestMatch.successfulMatches + 1,
      lastUsed: new Date(),
      lastMatchScore: bestScore
    });

    // Actualizar último login del usuario
    await bestMatch.User.update({
      lastLogin: new Date()
    });

    // Generar token JWT
    const jwt = require('jsonwebtoken');
    const tokenPayload = {
      id: bestMatch.User.id,
      employeeId: bestMatch.User.employeeId,
      role: bestMatch.User.role,
      authMethod: 'facial_recognition'
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    console.log(`✅ [BIOMETRIC] Login facial exitoso para ${bestMatch.User.employeeId} (score: ${bestScore.toFixed(3)})`);

    res.json({
      success: true,
      message: 'Autenticación facial exitosa',
      token,
      user: {
        id: bestMatch.User.id,
        employeeId: bestMatch.User.employeeId,
        dni: bestMatch.User.dni,
        firstName: bestMatch.User.firstName,
        lastName: bestMatch.User.lastName,
        email: bestMatch.User.email,
        role: bestMatch.User.role
      },
      biometric: {
        matchScore: bestScore,
        algorithm: bestMatch.algorithm,
        templateId: bestMatch.id
      }
    });

  } catch (error) {
    console.error('❌ [BIOMETRIC] Error en autenticación facial:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route GET /api/v1/biometric/face/status/:userId
 * @desc Obtener estado de registro biométrico facial de un usuario
 */
router.get('/face/status/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verificar permisos (solo admins o el propio usuario)
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor' && req.user.user_id !== userId) {
      return res.status(403).json({
        error: 'Acceso denegado'
      });
    }

    const facialTemplates = await FacialBiometricData.findAll({
      where: {
        userId: userId
      },
      attributes: [
        'id', 'qualityScore', 'algorithm', 'isPrimary', 'isActive', 
        'isValidated', 'successfulMatches', 'failedAttempts', 
        'lastUsed', 'createdAt'
      ],
      order: [['is_primary', 'DESC'], ['created_at', 'DESC']] // ✅ Fixed snake_case
    });

    const primaryTemplate = facialTemplates.find(t => t.isPrimary && t.isActive);
    const backupTemplates = facialTemplates.filter(t => !t.isPrimary && t.isActive);

    res.json({
      hasRegistration: facialTemplates.length > 0,
      hasPrimary: !!primaryTemplate,
      totalTemplates: facialTemplates.length,
      activeTemplates: facialTemplates.filter(t => t.isActive).length,
      validatedTemplates: facialTemplates.filter(t => t.isValidated).length,
      primary: primaryTemplate ? {
        id: primaryTemplate.id,
        qualityScore: primaryTemplate.qualityScore,
        algorithm: primaryTemplate.algorithm,
        isValidated: primaryTemplate.isValidated,
        successfulMatches: primaryTemplate.successfulMatches,
        failedAttempts: primaryTemplate.failedAttempts,
        lastUsed: primaryTemplate.lastUsed,
        registeredAt: primaryTemplate.createdAt
      } : null,
      backupTemplates: backupTemplates.length,
      needsValidation: facialTemplates.some(t => t.isActive && !t.isValidated)
    });

  } catch (error) {
    console.error('❌ [BIOMETRIC] Error obteniendo estado facial:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route POST /api/v1/biometric/face/validate/:templateId
 * @desc Validar un template facial (solo supervisores/admins)
 */
router.post('/face/validate/:templateId', auth, async (req, res) => {
  try {
    // Solo supervisores y admins pueden validar
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
      return res.status(403).json({
        error: 'Solo supervisores y administradores pueden validar templates biométricos'
      });
    }

    const { templateId } = req.params;
    const { approved, notes } = req.body;

    const template = await FacialBiometricData.findByPk(templateId);
    if (!template) {
      return res.status(404).json({
        error: 'Template no encontrado'
      });
    }

    await template.update({
      isValidated: approved,
      validatedBy: req.user.user_id,
      validatedAt: new Date(),
      notes: notes || template.notes,
      isActive: approved // Si no se aprueba, se desactiva
    });

    const user = await User.findByPk(template.userId);
    console.log(`✅ [BIOMETRIC] Template facial ${approved ? 'aprobado' : 'rechazado'} para ${user.employeeId} por ${req.user.employeeId}`);

    res.json({
      success: true,
      message: `Template ${approved ? 'aprobado' : 'rechazado'} exitosamente`,
      template: {
        id: template.id,
        isValidated: template.isValidated,
        isActive: template.isActive,
        validatedBy: req.user.employeeId,
        validatedAt: template.validatedAt
      }
    });

  } catch (error) {
    console.error('❌ [BIOMETRIC] Error validando template:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route DELETE /api/v1/biometric/face/:templateId
 * @desc Eliminar un template facial
 */
router.delete('/face/:templateId', auth, async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await FacialBiometricData.findByPk(templateId);
    if (!template) {
      return res.status(404).json({
        error: 'Template no encontrado'
      });
    }

    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor' && req.user.user_id !== template.userId) {
      return res.status(403).json({
        error: 'Acceso denegado'
      });
    }

    await template.destroy();

    console.log(`✅ [BIOMETRIC] Template facial eliminado: ${templateId}`);

    res.json({
      success: true,
      message: 'Template eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ [BIOMETRIC] Error eliminando template:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route POST /api/v1/biometric/save
 * @desc Guardar datos biométricos de múltiples tipos (facial, huella)
 */
router.post('/save', upload.single('biometricData'), async (req, res) => {
  try {
    const { type, quality, employeeId, companyId } = req.body;
    const biometricFile = req.file;

    console.log(`🔍 [BIOMETRIC-SAVE] Guardando ${type} para empleado ${employeeId}`);
    console.log(`🔧 [DEBUG] req.body:`, { type, quality, employeeId, companyId });
    console.log(`🔧 [DEBUG] req.files:`, req.files);
    console.log(`🔧 [DEBUG] type value:`, type, typeof type);

    // Validaciones básicas
    if (!type || !['facial', 'fingerprint'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo biométrico inválido. Debe ser: facial, fingerprint'
      });
    }

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'ID de empleado es requerido'
      });
    }

    if (!quality || quality < 0.5) {
      return res.status(400).json({
        success: false,
        message: 'Calidad insuficiente. Mínimo requerido: 50%'
      });
    }

    // Buscar empleado
    const employee = await User.findOne({
      where: {
        employeeId: employeeId,
        company_id: companyId || 11, // Usar companyId del request o default ISI
        isActive: true
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado'
      });
    }

    // Determinar el modelo de datos según el tipo
    let biometricModel;
    let dataToSave = {
      userId: employee.user_id,
      qualityScore: Math.round(quality * 100),
      algorithm: 'dynamic_capture_v1',
      algorithmVersion: '1.0',
      deviceId: 'web_capture',
      deviceModel: 'browser',
      appVersion: '1.0',
      isActive: true,
      isValidated: false,
      successfulMatches: 0,
      failedAttempts: 0
    };

    // Procesar según tipo biométrico
    switch (type) {
      case 'facial':
        // Verificar si ya existe template facial primario
        const existingFacial = await BiometricData.findOne({
          where: {
            userId: employee.id, // Usar employee.id en lugar de employee.user_id
            type: 'facial',
            isPrimary: true,
            isActive: true
          }
        });

        dataToSave.isPrimary = !existingFacial;
        dataToSave.faceEmbedding = biometricFile ? 'image_data_processed' : 'simulated_embedding';
        dataToSave.confidenceThreshold = 0.85;

        if (biometricFile) {
          // Aquí se procesaría la imagen real
          dataToSave.imageWidth = 640;
          dataToSave.imageHeight = 480;
          dataToSave.faceBoxX = 160;
          dataToSave.faceBoxY = 120;
          dataToSave.faceBoxWidth = 320;
          dataToSave.faceBoxHeight = 240;
        }

        const facialData = await BiometricData.create(dataToSave);

        console.log(`✅ [BIOMETRIC-SAVE] Template facial guardado ID: ${facialData.id}`);

        return res.json({
          success: true,
          message: 'Template facial guardado exitosamente',
          data: {
            id: facialData.id,
            type: 'facial',
            quality: facialData.qualityScore,
            isPrimary: facialData.isPrimary
          }
        });

      case 'fingerprint':
        // Para huella dactilar
        const fingerprintData = await BiometricData.create({
          userId: employee.user_id,
          biometricType: 'fingerprint',
          templateData: 'fingerprint_minutiae_processed',
          qualityScore: Math.round(quality * 100),
          algorithm: 'fingerprint_minutiae_v1',
          isActive: true,
          metadata: JSON.stringify({
            minutiaePoints: Math.floor(quality * 30 + 10),
            ridgeClarity: quality * 0.9,
            pressure: quality * 0.8 + 0.2
          })
        });

        console.log(`✅ [BIOMETRIC-SAVE] Template huella guardado ID: ${fingerprintData.id}`);

        return res.json({
          success: true,
          message: 'Template de huella dactilar guardado exitosamente',
          data: {
            id: fingerprintData.id,
            type: 'fingerprint',
            quality: fingerprintData.qualityScore
          }
        });

      default:
        return res.status(400).json({
          success: false,
          message: 'Tipo biométrico no soportado'
        });
    }

  } catch (error) {
    console.error('❌ [BIOMETRIC-SAVE] Error guardando datos biométricos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/biometric/status/:employeeId
 * @desc Obtener estado de todos los registros biométricos de un empleado
 */
router.get('/status/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Buscar empleado
    const employee = await User.findOne({
      where: {
        employeeId: employeeId,
        company_id: companyId || 11, // Usar companyId del request o default ISI
        isActive: true
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado'
      });
    }

    // Obtener datos faciales
    const facialTemplates = await FacialBiometricData.findAll({
      where: {
        userId: employee.user_id,
        isActive: true
      },
      order: [['is_primary', 'DESC'], ['created_at', 'DESC']] // ✅ Fixed snake_case
    });

    // Obtener otros tipos biométricos
    const otherBiometrics = await BiometricData.findAll({
      where: {
        userId: employee.user_id,
        isActive: true
      },
      order: [['created_at', 'DESC']] // ✅ Fixed snake_case
    });

    const fingerprintTemplates = otherBiometrics.filter(b => b.biometricType === 'fingerprint');

    res.json({
      success: true,
      employeeId: employeeId,
      biometricStatus: {
        facial: {
          registered: facialTemplates.length > 0,
          count: facialTemplates.length,
          primary: facialTemplates.find(f => f.isPrimary) || null,
          validated: facialTemplates.filter(f => f.isValidated).length
        },
        fingerprint: {
          registered: fingerprintTemplates.length > 0,
          count: fingerprintTemplates.length,
          latest: fingerprintTemplates[0] || null
        }
      },
      summary: {
        totalTemplates: facialTemplates.length + otherBiometrics.length,
        validatedTemplates: facialTemplates.filter(f => f.isValidated).length,
        activeTemplates: facialTemplates.length + otherBiometrics.length,
        completionPercentage: Math.round(
          ((facialTemplates.length > 0 ? 50 : 0) +
           (fingerprintTemplates.length > 0 ? 50 : 0))
        )
      }
    });

  } catch (error) {
    console.error('❌ [BIOMETRIC-STATUS] Error obteniendo estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/biometric/fingerprint/enroll
 * @desc Enrollar huellas dactilares de un empleado
 */
router.post('/fingerprint/enroll', auth, async (req, res) => {
  try {
    const {
      user_id,
      company_id,
      employee_id,
      fingerprints,
      device_id,
      enrollment_timestamp
    } = req.body;

    console.log(`🔐 [FINGERPRINT-ENROLL] Iniciando registro para user: ${user_id}, company: ${company_id}`);

    // Validaciones
    if (!user_id || !company_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id y company_id son requeridos'
      });
    }

    if (!fingerprints || !Array.isArray(fingerprints) || fingerprints.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos una huella dactilar'
      });
    }

    // Verificar que el usuario existe y pertenece a la empresa
    const user = await User.findOne({
      where: {
        user_id: user_id,
        company_id: company_id,
        is_active: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o inactivo'
      });
    }

    // Usar sequelize directamente para insertar en fingerprint_biometric_data
    const { sequelize } = require('../config/database-postgresql');

    // Eliminar huellas antiguas del mismo dispositivo (re-enrollment)
    await sequelize.query(`
      DELETE FROM fingerprint_biometric_data
      WHERE user_id = :userId
        AND company_id = :companyId
        AND device_info->>'device_id' = :deviceId
    `, {
      replacements: {
        userId: user_id,
        companyId: company_id,
        deviceId: device_id
      },
      type: sequelize.QueryTypes.DELETE
    });

    // Insertar nuevas huellas
    const insertedFingerprints = [];

    for (const fp of fingerprints) {
      const result = await sequelize.query(`
        INSERT INTO fingerprint_biometric_data (
          id,
          user_id,
          company_id,
          finger_position,
          template_data,
          minutiae_data,
          quality_score,
          capture_timestamp,
          is_active,
          device_info,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          :userId,
          :companyId,
          :fingerPosition,
          decode(:templateData, 'hex'),
          :minutiaeData::jsonb,
          :qualityScore,
          :captureTimestamp,
          true,
          :deviceInfo::jsonb,
          NOW(),
          NOW()
        ) RETURNING id
      `, {
        replacements: {
          userId: user_id,
          companyId: company_id,
          fingerPosition: fp.finger_position,
          templateData: Buffer.from(fp.template_data, 'utf8').toString('hex'),
          minutiaeData: JSON.stringify(fp.minutiae_data),
          qualityScore: fp.quality_score,
          captureTimestamp: fp.capture_timestamp,
          deviceInfo: JSON.stringify({
            device_id: device_id,
            ...fp.device_info
          })
        },
        type: sequelize.QueryTypes.INSERT
      });

      insertedFingerprints.push({
        id: result[0][0].id,
        finger_position: fp.finger_position,
        quality_score: fp.quality_score
      });
    }

    // Actualizar flags en la tabla users
    await sequelize.query(`
      UPDATE users
      SET
        has_fingerprint = true,
        biometric_enrolled = true,
        biometric_templates_count = COALESCE(biometric_templates_count, 0) + :count,
        last_biometric_scan = NOW(),
        biometric_last_updated = NOW()
      WHERE user_id = :userId
    `, {
      replacements: {
        userId: user_id,
        count: fingerprints.length
      },
      type: sequelize.QueryTypes.UPDATE
    });

    console.log(`✅ [FINGERPRINT-ENROLL] Registradas ${fingerprints.length} huellas para user ${user_id}`);

    res.status(201).json({
      success: true,
      message: `${fingerprints.length} huellas registradas exitosamente`,
      data: {
        user_id: user_id,
        fingerprints_enrolled: insertedFingerprints.length,
        fingerprints: insertedFingerprints,
        enrollment_timestamp: enrollment_timestamp,
        device_id: device_id
      }
    });

  } catch (error) {
    console.error('❌ [FINGERPRINT-ENROLL] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar huellas dactilares',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/biometric/fingerprint/verify
 * @desc Verificar huella dactilar de un empleado
 */
router.post('/fingerprint/verify', auth, async (req, res) => {
  try {
    const {
      user_id,
      company_id,
      device_id,
      authenticated
    } = req.body;

    console.log(`🔐 [FINGERPRINT-VERIFY] Verificando user: ${user_id}, company: ${company_id}`);

    // Validaciones
    if (!user_id || !company_id || !device_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id, company_id y device_id son requeridos'
      });
    }

    const { sequelize } = require('../config/database-postgresql');

    // Verificar que el usuario tiene huellas registradas en este dispositivo
    const [fingerprints] = await sequelize.query(`
      SELECT
        id,
        finger_position,
        quality_score,
        capture_timestamp
      FROM fingerprint_biometric_data
      WHERE user_id = :userId
        AND company_id = :companyId
        AND device_info->>'device_id' = :deviceId
        AND is_active = true
      ORDER BY capture_timestamp DESC
    `, {
      replacements: {
        userId: user_id,
        companyId: company_id,
        deviceId: device_id
      },
      type: sequelize.QueryTypes.SELECT
    });

    if (!fingerprints || fingerprints.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay huellas registradas para este dispositivo',
        action: 'enroll_required'
      });
    }

    // Si la autenticación fue exitosa (verificado por local_auth)
    if (authenticated === true) {
      // Actualizar último escaneo
      await sequelize.query(`
        UPDATE users
        SET last_biometric_scan = NOW()
        WHERE user_id = :userId
      `, {
        replacements: { userId: user_id },
        type: sequelize.QueryTypes.UPDATE
      });

      // Obtener datos del usuario
      const user = await User.findOne({
        where: { user_id: user_id, company_id: company_id },
        attributes: ['user_id', 'employeeId', 'firstName', 'lastName', 'email', 'role']
      });

      console.log(`✅ [FINGERPRINT-VERIFY] Verificación exitosa para user ${user_id}`);

      return res.json({
        success: true,
        message: 'Huella verificada correctamente',
        data: {
          user_id: user_id,
          employee_id: user.employeeId,
          full_name: `${user.firstName} ${user.lastName}`,
          fingerprints_count: fingerprints.length,
          verified_at: new Date().toISOString()
        }
      });
    } else {
      console.log(`❌ [FINGERPRINT-VERIFY] Verificación fallida para user ${user_id}`);

      return res.status(401).json({
        success: false,
        message: 'Huella no reconocida'
      });
    }

  } catch (error) {
    console.error('❌ [FINGERPRINT-VERIFY] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar huella dactilar',
      error: error.message
    });
  }
});

module.exports = router;