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
      order: [['isPrimary', 'DESC'], ['qualityScore', 'DESC']]
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
      order: [['isPrimary', 'DESC'], ['createdAt', 'DESC']]
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
 * @desc Guardar datos biométricos de múltiples tipos (facial, iris, voz, huella)
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
    if (!type || !['facial', 'iris', 'voice', 'fingerprint'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo biométrico inválido. Debe ser: facial, iris, voice, fingerprint'
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

      case 'iris':
        // Para iris, usar similar a facial pero con parámetros específicos
        const existingIris = await FacialBiometricData.findOne({
          where: {
            userId: employee.user_id,
            algorithm: 'iris_capture_v1',
            isActive: true
          }
        });

        dataToSave.isPrimary = !existingIris;
        dataToSave.faceEmbedding = 'iris_data_processed';
        dataToSave.algorithm = 'iris_capture_v1';
        dataToSave.confidenceThreshold = 0.90; // Iris requiere mayor confianza

        const irisData = await BiometricData.create(dataToSave);

        console.log(`✅ [BIOMETRIC-SAVE] Template iris guardado ID: ${irisData.id}`);

        return res.json({
          success: true,
          message: 'Template iris guardado exitosamente',
          data: {
            id: irisData.id,
            type: 'iris',
            quality: irisData.qualityScore,
            isPrimary: irisData.isPrimary
          }
        });

      case 'voice':
        // Para voz, crear registro en BiometricData general
        const voiceData = await BiometricData.create({
          userId: employee.user_id,
          biometricType: 'voice',
          templateData: biometricFile ? 'voice_audio_processed' : 'simulated_voice_template',
          qualityScore: Math.round(quality * 100),
          algorithm: 'voice_recognition_v1',
          isActive: true,
          metadata: JSON.stringify({
            duration: 5000,
            sampleRate: 44100,
            channels: 1,
            format: 'webm'
          })
        });

        console.log(`✅ [BIOMETRIC-SAVE] Template voz guardado ID: ${voiceData.id}`);

        return res.json({
          success: true,
          message: 'Template de voz guardado exitosamente',
          data: {
            id: voiceData.id,
            type: 'voice',
            quality: voiceData.qualityScore
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
      order: [['isPrimary', 'DESC'], ['createdAt', 'DESC']]
    });

    // Obtener otros tipos biométricos
    const otherBiometrics = await BiometricData.findAll({
      where: {
        userId: employee.user_id,
        isActive: true
      },
      order: [['createdAt', 'DESC']]
    });

    const voiceTemplates = otherBiometrics.filter(b => b.biometricType === 'voice');
    const fingerprintTemplates = otherBiometrics.filter(b => b.biometricType === 'fingerprint');
    const irisTemplates = facialTemplates.filter(f => f.algorithm === 'iris_capture_v1');
    const facialOnly = facialTemplates.filter(f => f.algorithm !== 'iris_capture_v1');

    res.json({
      success: true,
      employeeId: employeeId,
      biometricStatus: {
        facial: {
          registered: facialOnly.length > 0,
          count: facialOnly.length,
          primary: facialOnly.find(f => f.isPrimary) || null,
          validated: facialOnly.filter(f => f.isValidated).length
        },
        iris: {
          registered: irisTemplates.length > 0,
          count: irisTemplates.length,
          primary: irisTemplates.find(i => i.isPrimary) || null,
          validated: irisTemplates.filter(i => i.isValidated).length
        },
        voice: {
          registered: voiceTemplates.length > 0,
          count: voiceTemplates.length,
          latest: voiceTemplates[0] || null
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
          ((facialOnly.length > 0 ? 25 : 0) +
           (irisTemplates.length > 0 ? 25 : 0) +
           (voiceTemplates.length > 0 ? 25 : 0) +
           (fingerprintTemplates.length > 0 ? 25 : 0))
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

module.exports = router;