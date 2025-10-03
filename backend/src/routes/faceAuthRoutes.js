const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, FacialBiometricData, Attendance } = require('../config/database');
const { auth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { Op } = require('sequelize');

// Rate limiting más estricto para autenticación facial
const faceAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // máximo 3 intentos por IP cada 15 minutos
  message: 'Demasiados intentos de autenticación facial. Intente nuevamente en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting para registro facial
const faceRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // máximo 5 registros por IP por hora
  message: 'Demasiados intentos de registro facial.',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @route POST /api/v1/face-auth/register
 * @desc Registra datos biométricos faciales de un usuario (ultra-robusto)
 */
router.post('/register', faceRegisterLimiter, auth, async (req, res) => {
  try {
    const { 
      userId, 
      templates, 
      supervisorId, 
      deviceInfo,
      qualityMetrics 
    } = req.body;

    // Validar que solo admins/supervisores puedan registrar
    if (!['admin', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'No tiene permisos para registrar datos biométricos'
      });
    }

    // Validar datos requeridos
    if (!userId || !templates || !Array.isArray(templates) || templates.length < 3) {
      return res.status(400).json({
        error: 'Se requieren al menos 3 templates biométricos válidos'
      });
    }

    // Verificar que el usuario existe
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Verificar que no tenga registros biométricos activos previos
    const existingBiometric = await FacialBiometricData.findOne({
      where: {
        userId: userId,
        isActive: true
      }
    });

    if (existingBiometric) {
      return res.status(409).json({
        error: 'El usuario ya tiene datos biométricos registrados. Use la ruta de actualización.'
      });
    }

    // Crear múltiples registros biométricos para redundancia
    const biometricPromises = templates.map((template, index) => {
      return FacialBiometricData.create({
        userId: userId,
        faceEmbedding: template.mlkitEmbedding ? JSON.stringify(template.mlkitEmbedding) : null,
        faceEmbedding2: template.facenetEmbedding ? JSON.stringify(template.facenetEmbedding) : null,
        faceEmbedding3: template.arcfaceEmbedding ? JSON.stringify(template.arcfaceEmbedding) : null,
        qualityScore: template.qualityScore || 0,
        confidenceThreshold: 0.85,
        algorithm: 'multi-algorithm',
        algorithmVersion: '1.0',
        imageWidth: template.metadata?.imageWidth,
        imageHeight: template.metadata?.imageHeight,
        faceBoxX: template.metadata?.faceBox?.x,
        faceBoxY: template.metadata?.faceBox?.y,
        faceBoxWidth: template.metadata?.faceBox?.width,
        faceBoxHeight: template.metadata?.faceBox?.height,
        landmarks: template.landmarks ? JSON.stringify(template.landmarks) : null,
        faceAngle: template.metadata?.headEulerAngleY,
        isPrimary: index === 0,
        deviceId: deviceInfo?.deviceId,
        deviceModel: deviceInfo?.deviceModel,
        appVersion: deviceInfo?.appVersion,
        isValidated: true, // Auto-validado porque lo hace un supervisor
        validatedBy: req.user.user_id,
        validatedAt: new Date(),
        notes: `Registrado por supervisor ${supervisorId} - Ultra-robusto`
      });
    });

    const biometricRecords = await Promise.all(biometricPromises);

    // Log de auditoría
    console.log(`Registro biométrico ultra-robusto completado para usuario ${userId} por supervisor ${req.user.user_id}`);

    res.status(201).json({
      success: true,
      message: 'Registro biométrico ultra-robusto completado exitosamente',
      data: {
        userId: userId,
        templatesRegistered: biometricRecords.length,
        averageQuality: templates.reduce((sum, t) => sum + (t.qualityScore || 0), 0) / templates.length,
        registrationId: biometricRecords[0].id,
        securityLevel: 'ultra-robust',
        validatedBy: req.user.user_id,
        timestamp: new Date().toIso8601String()
      }
    });

  } catch (error) {
    console.error('Error en registro biométrico facial:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor durante registro biométrico',
      code: 'FACE_REGISTER_ERROR'
    });
  }
});

/**
 * @route POST /api/v1/face-auth/authenticate
 * @desc Autenticación facial ultra-robusta con múltiples validaciones
 */
router.post('/authenticate', faceAuthLimiter, async (req, res) => {
  try {
    const { 
      testTemplates,
      contextualData,
      livenessProof,
      deviceInfo,
      securityLevel = 'standard'
    } = req.body;

    // Validar datos requeridos
    if (!testTemplates || !Array.isArray(testTemplates) || testTemplates.length < 1) {
      return res.status(400).json({
        error: 'Se requieren templates de prueba válidos'
      });
    }

    if (!livenessProof || !livenessProof.verified) {
      return res.status(400).json({
        error: 'Se requiere verificación de vida válida',
        code: 'LIVENESS_REQUIRED'
      });
    }

    // Obtener todos los registros biométricos activos
    const allBiometricData = await FacialBiometricData.findAll({
      where: {
        isActive: true,
        isValidated: true
      },
      include: [{
        model: User,
        where: { isActive: true },
        attributes: ['id', 'employeeId', 'firstName', 'lastName', 'role', 'departmentId']
      }]
    });

    if (allBiometricData.length === 0) {
      return res.status(404).json({
        error: 'No hay usuarios registrados biométricamente',
        code: 'NO_BIOMETRIC_USERS'
      });
    }

    // Realizar matching con múltiples algoritmos
    const matchResults = [];
    
    for (const testTemplate of testTemplates) {
      for (const storedData of allBiometricData) {
        try {
          // Extraer embeddings almacenados
          const storedMLKit = storedData.faceEmbedding ? JSON.parse(storedData.faceEmbedding) : null;
          const storedFaceNet = storedData.faceEmbedding2 ? JSON.parse(storedData.faceEmbedding2) : null;
          const storedArcFace = storedData.faceEmbedding3 ? JSON.parse(storedData.faceEmbedding3) : null;

          // Calcular similitudes
          const mlkitScore = storedMLKit ? cosineSimilarity(testTemplate.mlkitEmbedding, storedMLKit) : 0;
          const facenetScore = storedFaceNet ? cosineSimilarity(testTemplate.facenetEmbedding, storedFaceNet) : 0;
          const arcfaceScore = storedArcFace ? cosineSimilarity(testTemplate.arcfaceEmbedding, storedArcFace) : 0;

          // Calcular confianza combinada (promedio ponderado)
          const combinedScore = (mlkitScore * 0.3) + (facenetScore * 0.4) + (arcfaceScore * 0.3);

          // Ajustar umbral según nivel de seguridad
          const thresholds = {
            'standard': 0.85,
            'elevated': 0.90,
            'maximum': 0.95,
            'emergency': 0.98
          };

          const threshold = thresholds[securityLevel] || 0.85;

          if (combinedScore >= threshold) {
            matchResults.push({
              userId: storedData.User.id,
              employeeId: storedData.User.employeeId,
              user: storedData.User,
              confidence: combinedScore,
              scores: {
                mlkit: mlkitScore,
                facenet: facenetScore,
                arcface: arcfaceScore
              },
              templateId: storedData.id,
              qualityScore: storedData.qualityScore
            });
          }

        } catch (parseError) {
          console.error('Error procesando template almacenado:', parseError);
          continue;
        }
      }
    }

    // Analizar resultados
    if (matchResults.length === 0) {
      // Incrementar contador de fallos (esto sería en una tabla de auditoría)
      return res.status(401).json({
        error: 'No se encontraron coincidencias biométricas',
        code: 'NO_BIOMETRIC_MATCH'
      });
    }

    // Agrupar por usuario y calcular mejor coincidencia
    const userMatches = {};
    matchResults.forEach(match => {
      if (!userMatches[match.userId] || userMatches[match.userId].confidence < match.confidence) {
        userMatches[match.userId] = match;
      }
    });

    // Verificar que no haya múltiples usuarios con alta confianza
    const highConfidenceMatches = Object.values(userMatches)
      .filter(match => match.confidence >= 0.90);

    if (highConfidenceMatches.length > 1) {
      const topScores = highConfidenceMatches.map(m => m.confidence).sort((a, b) => b - a);
      if (Math.abs(topScores[0] - topScores[1]) < 0.05) {
        return res.status(409).json({
          error: 'Múltiples coincidencias con alta confianza - requiere revisión manual',
          code: 'MULTIPLE_MATCHES',
          matches: highConfidenceMatches.map(m => ({
            userId: m.userId,
            confidence: m.confidence
          }))
        });
      }
    }

    // Obtener el mejor match
    const bestMatch = Object.values(userMatches)
      .reduce((best, current) => current.confidence > best.confidence ? current : best);

    // Validaciones contextuales adicionales
    const contextualWarnings = [];
    if (contextualData) {
      // Validar ubicación si está disponible
      if (contextualData.location && contextualData.riskScore > 0.7) {
        contextualWarnings.push('Alto riesgo contextual detectado');
      }
      
      // Validar horario
      const hour = new Date().getHours();
      if (hour < 6 || hour > 22) {
        contextualWarnings.push('Acceso en horario inusual');
      }
    }

    // Actualizar estadísticas del template usado
    await FacialBiometricData.update({
      successfulMatches: bestMatch.templateId.successfulMatches + 1,
      lastUsed: new Date(),
      lastMatchScore: bestMatch.confidence
    }, {
      where: { id: bestMatch.templateId }
    });

    // Actualizar último login del usuario
    await User.update({
      lastLogin: new Date()
    }, {
      where: { id: bestMatch.userId }
    });

    // Generar token JWT
    const tokenPayload = {
      id: bestMatch.userId,
      employeeId: bestMatch.employeeId,
      role: bestMatch.user.role,
      authMethod: 'facial_biometric_ultra_robust',
      securityLevel: securityLevel,
      confidence: bestMatch.confidence
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });

    const refreshToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
    });

    // Log de auditoría detallado
    console.log(`Autenticación facial ultra-robusta exitosa: Usuario ${bestMatch.employeeId}, Confianza: ${(bestMatch.confidence * 100).toFixed(2)}%, Nivel: ${securityLevel}`);

    res.json({
      success: true,
      message: 'Autenticación facial ultra-robusta exitosa',
      token,
      refreshToken,
      user: {
        id: bestMatch.user.user_id,
        employeeId: bestMatch.user.employeeId,
        firstName: bestMatch.user.firstName,
        lastName: bestMatch.user.lastName,
        role: bestMatch.user.role
      },
      authenticationDetails: {
        method: 'facial_biometric_ultra_robust',
        confidence: bestMatch.confidence,
        securityLevel: securityLevel,
        scores: bestMatch.scores,
        qualityScore: bestMatch.qualityScore,
        warnings: contextualWarnings,
        timestamp: new Date().toIso8601String(),
        isHighConfidence: bestMatch.confidence >= 0.95
      }
    });

  } catch (error) {
    console.error('Error en autenticación facial:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor durante autenticación facial',
      code: 'FACE_AUTH_ERROR' 
    });
  }
});

/**
 * @route POST /api/v1/face-auth/verify-liveness
 * @desc Endpoint para verificar detección de vida (puede ser llamado independientemente)
 */
router.post('/verify-liveness', async (req, res) => {
  try {
    const { 
      challengeResults,
      sensorData,
      deviceInfo 
    } = req.body;

    // Validar datos de entrada
    if (!challengeResults || !Array.isArray(challengeResults)) {
      return res.status(400).json({
        error: 'Se requieren resultados de desafíos de vida válidos'
      });
    }

    // Verificar que se completaron suficientes desafíos
    const completedChallenges = challengeResults.filter(result => result.passed);
    if (completedChallenges.length < 2) {
      return res.status(400).json({
        error: 'Se requieren al menos 2 desafíos de vida completados',
        code: 'INSUFFICIENT_LIVENESS_CHALLENGES'
      });
    }

    // Validar sensores adicionales si están disponibles
    let sensorScore = 1.0;
    if (sensorData) {
      // Verificar movimiento del dispositivo (anti-spoofing)
      if (sensorData.movementVariance < 0.01) {
        sensorScore -= 0.3; // Dispositivo demasiado estático = sospechoso
      }
      
      // Verificar patrones de luz
      if (sensorData.lightVariation < 0.1) {
        sensorScore -= 0.2; // Sin variación de luz = sospechoso
      }
    }

    const livenessScore = (completedChallenges.length / challengeResults.length) * sensorScore;
    const isValid = livenessScore >= 0.8;

    res.json({
      success: isValid,
      livenessScore: livenessScore,
      challengesPassed: completedChallenges.length,
      totalChallenges: challengeResults.length,
      sensorScore: sensorScore,
      verdict: isValid ? 'REAL_PERSON' : 'SPOOFING_DETECTED',
      timestamp: new Date().toIso8601String()
    });

  } catch (error) {
    console.error('Error verificando detección de vida:', error);
    res.status(500).json({ 
      error: 'Error interno verificando detección de vida' 
    });
  }
});

/**
 * @route GET /api/v1/face-auth/user/:userId/biometric-status
 * @desc Obtiene el estado biométrico de un usuario
 */
router.get('/user/:userId/biometric-status', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verificar permisos (solo el usuario mismo o admin/supervisor)
    if (req.user.user_id !== userId && !['admin', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'No tiene permisos para ver este estado biométrico'
      });
    }

    const biometricData = await FacialBiometricData.findAll({
      where: {
        userId: userId,
        isActive: true
      },
      attributes: [
        'id', 'qualityScore', 'isPrimary', 'isValidated', 
        'successfulMatches', 'failedAttempts', 'lastUsed',
        'createdAt', 'algorithm', 'deviceModel'
      ]
    });

    if (biometricData.length === 0) {
      return res.json({
        registered: false,
        message: 'Usuario no tiene datos biométricos registrados'
      });
    }

    const stats = {
      registered: true,
      templatesCount: biometricData.length,
      averageQuality: biometricData.reduce((sum, data) => sum + data.qualityScore, 0) / biometricData.length,
      totalSuccessfulMatches: biometricData.reduce((sum, data) => sum + data.successfulMatches, 0),
      totalFailedAttempts: biometricData.reduce((sum, data) => sum + data.failedAttempts, 0),
      lastUsed: Math.max(...biometricData.map(data => new Date(data.lastUsed || 0).getTime())),
      isFullyValidated: biometricData.every(data => data.isValidated),
      registrationDate: Math.min(...biometricData.map(data => new Date(data.createdAt).getTime())),
      securityLevel: biometricData.length >= 3 ? 'ultra-robust' : 'standard'
    };

    res.json(stats);

  } catch (error) {
    console.error('Error obteniendo estado biométrico:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Función auxiliar para calcular similitud coseno
 */
function cosineSimilarity(vectorA, vectorB) {
  if (!Array.isArray(vectorA) || !Array.isArray(vectorB) || vectorA.length !== vectorB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = router;