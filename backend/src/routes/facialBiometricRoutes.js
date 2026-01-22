const express = require('express');
const router = express.Router();
const { FacialBiometricData, User } = require('../config/database');
const { auth } = require('../middleware/auth');
const { requireBiometricConsent } = require('../middleware/biometricConsentCheck');

// ============================================================================
// HELPER: Validar formato UUID
// ============================================================================
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUUID(str) {
  return typeof str === 'string' && UUID_REGEX.test(str);
}

// 📷 Register facial biometric data
router.post('/register', auth, requireBiometricConsent, async (req, res) => {
  try {
    const {
      userId,
      faceEmbedding,
      faceEmbedding2,
      faceEmbedding3,
      capturedPhoto, // Add captured photo field
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
      appVersion,
      notes
    } = req.body;

    // Validate required fields
    if (!userId || !faceEmbedding) {
      return res.status(400).json({
        success: false,
        error: 'userId y faceEmbedding son requeridos'
      });
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Set other templates as non-primary if this is primary
    const isPrimary = req.body.isPrimary !== false; // Default true
    if (isPrimary) {
      await FacialBiometricData.update(
        { isPrimary: false },
        { where: { userId: userId } }
      );
    }

    // Create new facial biometric entry
    const facialData = await FacialBiometricData.create({
      userId,
      faceEmbedding,
      faceEmbedding2: faceEmbedding2 || null,
      faceEmbedding3: faceEmbedding3 || null,
      capturedPhoto: capturedPhoto || null, // Save the captured photo
      qualityScore: qualityScore || 0.0,
      confidenceThreshold: confidenceThreshold || 0.85,
      algorithm: algorithm || 'mlkit',
      algorithmVersion: algorithmVersion || '1.0',
      imageWidth: imageWidth || null,
      imageHeight: imageHeight || null,
      faceBoxX: faceBoxX || null,
      faceBoxY: faceBoxY || null,
      faceBoxWidth: faceBoxWidth || null,
      faceBoxHeight: faceBoxHeight || null,
      landmarks: landmarks || null,
      faceAngle: faceAngle || null,
      isPrimary,
      isActive: true,
      deviceId: deviceId || null,
      deviceModel: deviceModel || null,
      appVersion: appVersion || null,
      notes: notes || null
    });

    res.json({
      success: true,
      message: 'Datos biométricos faciales registrados exitosamente',
      data: {
        id: facialData.id,
        userId: facialData.userId,
        qualityScore: facialData.qualityScore,
        algorithm: facialData.algorithm,
        isPrimary: facialData.isPrimary,
        createdAt: facialData.createdAt
      }
    });

  } catch (error) {
    console.error('Error registrando biometría facial:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 🔍 Verify facial biometric (for authentication)
router.post('/verify', auth, async (req, res) => {
  try {
    const {
      userId,
      faceEmbedding,
      qualityScore,
      algorithm
    } = req.body;

    if (!userId || !faceEmbedding) {
      return res.status(400).json({
        success: false,
        error: 'userId y faceEmbedding son requeridos'
      });
    }

    // Get user's facial biometric templates
    const userTemplates = await FacialBiometricData.findAll({
      where: {
        userId: userId,
        isActive: true
      },
      order: [['quality_score', 'DESC'], ['created_at', 'DESC']] // ✅ Fixed - removed non-existent is_primary
    });

    if (userTemplates.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No hay datos biométricos faciales registrados para este usuario'
      });
    }

    // Here you would implement the actual facial comparison algorithm
    // For now, we'll simulate a match based on quality and confidence
    let bestMatch = null;
    let bestScore = 0;

    for (const template of userTemplates) {
      // Simulate facial comparison (replace with actual algorithm)
      const simulatedScore = Math.min(
        (qualityScore || 50) / 100 * 0.6 + 
        template.qualityScore / 100 * 0.4 + 
        Math.random() * 0.2, 
        1.0
      );

      if (simulatedScore > bestScore && simulatedScore >= template.confidenceThreshold) {
        bestScore = simulatedScore;
        bestMatch = template;
      }
    }

    if (bestMatch) {
      // Update usage statistics
      await FacialBiometricData.update(
        {
          successfulMatches: bestMatch.successfulMatches + 1,
          lastUsed: new Date(),
          lastMatchScore: bestScore
        },
        { where: { id: bestMatch.id } }
      );

      res.json({
        success: true,
        verified: true,
        message: 'Verificación biométrica facial exitosa',
        data: {
          matchScore: bestScore,
          algorithm: bestMatch.algorithm,
          templateId: bestMatch.id,
          confidenceThreshold: bestMatch.confidenceThreshold
        }
      });
    } else {
      // Update failed attempts for all templates
      await FacialBiometricData.increment('failedAttempts', {
        where: {
          userId: userId,
          isActive: true
        }
      });

      res.json({
        success: true,
        verified: false,
        message: 'Verificación biométrica facial fallida',
        data: {
          bestScore: bestScore,
          requiredThreshold: userTemplates[0].confidenceThreshold
        }
      });
    }

  } catch (error) {
    console.error('Error verificando biometría facial:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 📋 Get user's facial biometric data
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // ✅ FIX: Validar que userId sea UUID válido
    if (!isValidUUID(userId)) {
      console.warn(`⚠️ [FACIAL] userId inválido recibido: "${userId}" - Se esperaba UUID`);
      return res.json({
        success: true,
        data: [] // Retornar array vacío en vez de error 500
      });
    }

    const facialData = await FacialBiometricData.findAll({
      where: { userId },
      attributes: [
        'id', 'userId', 'qualityScore', 'captureTimestamp', 'isActive',
        'deviceInfo', 'createdAt', 'updatedAt'
      ],
      order: [['created_at', 'DESC']] // ✅ Fixed - removed non-existent is_primary
      // Note: User include removed - association not properly configured
    });

    res.json({
      success: true,
      data: facialData
    });

  } catch (error) {
    console.error('Error obteniendo datos biométricos faciales:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 📊 Get facial biometric statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await FacialBiometricData.findAll({
      attributes: [
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalTemplates'],
        [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN is_active = true THEN 1 END')), 'activeTemplates'],
        [require('sequelize').fn('AVG', require('sequelize').col('quality_score')), 'avgQuality']
      ],
      raw: true
    });

    // Note: algorithmStats removed as 'algorithm' column doesn't exist in actual schema
    const algorithmStats = [];

    res.json({
      success: true,
      data: {
        overview: stats[0],
        algorithmBreakdown: algorithmStats
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas biométricas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ✅ Validate facial biometric data (supervisor action)
router.put('/:id/validate', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    // Only admin/supervisor can validate
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores y supervisores pueden validar datos biométricos'
      });
    }

    const updated = await FacialBiometricData.update(
      {
        isValidated: true,
        validatedBy: userId,
        validatedAt: new Date()
      },
      { where: { id } }
    );

    if (updated[0] === 0) {
      return res.status(404).json({
        success: false,
        error: 'Datos biométricos no encontrados'
      });
    }

    res.json({
      success: true,
      message: 'Datos biométricos validados exitosamente'
    });

  } catch (error) {
    console.error('Error validando datos biométricos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ❌ Delete facial biometric template
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Only admin can delete biometric data
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores pueden eliminar datos biométricos'
      });
    }

    const deleted = await FacialBiometricData.destroy({
      where: { id }
    });

    if (deleted === 0) {
      return res.status(404).json({
        success: false,
        error: 'Datos biométricos no encontrados'
      });
    }

    res.json({
      success: true,
      message: 'Datos biométricos eliminados exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando datos biométricos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;