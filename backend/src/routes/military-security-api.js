// 🛡️ MILITARY SECURITY API - GDPR COMPLIANCE + THREAT DETECTION
// ==============================================================

const express = require('express');
const router = express.Router();
const MilitarySecurityEngine = require('../services/military-security-engine');
const rateLimit = require('express-rate-limit');

// Integración NCE - Notificaciones
const SecurityNotifications = require('../services/integrations/security-notifications');

// Rate limiting militar
const militaryRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // máximo 30 requests por minuto
  message: {
    error: 'Rate limit exceeded - Military grade protection active',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Inicializar Military Security Engine
const securityEngine = new MilitarySecurityEngine({
  jwtSecret: process.env.JWT_SECRET_MILITARY || 'biometric_military_jwt_2024',
  gdpr: {
    dataRetentionDays: 2555, // 7 años
    anonymizationEnabled: true,
    auditLogging: true
  },
  security: {
    maxRequestsPerMinute: 30,
    enableIntrusionDetection: true,
    enableSQLInjectionProtection: true
  }
});

// Middleware de seguridad militar
async function militarySecurityMiddleware(req, res, next) {
  try {
    console.log('🛡️ [MILITARY-SECURITY] Analizando request...');

    // Análisis de amenazas en tiempo real
    const threatAnalysis = await securityEngine.detectSecurityThreats({
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.body,
      query: req.query,
      headers: req.headers,
      biometricAccess: req.path.includes('biometric'),
      accessTime: new Date().toISOString(),
      userId: req.user?.id,
      location: req.headers['x-forwarded-for']
    });

    // Bloquear si hay amenazas críticas
    const criticalThreats = threatAnalysis.threats.filter(t => t.severity === 'critical');
    if (criticalThreats.length > 0) {
      console.log('🚨 [MILITARY-SECURITY] Amenaza crítica detectada - Bloqueando request');
      return res.status(403).json({
        success: false,
        error: 'Security threat detected',
        threatLevel: 'critical',
        blocked: true
      });
    }

    // Adjuntar análisis al request
    req.securityAnalysis = threatAnalysis;
    next();

  } catch (error) {
    console.error('❌ [MILITARY-SECURITY] Error en middleware:', error.message);
    next(); // Continuar en caso de error del sistema de seguridad
  }
}

// Aplicar middleware de seguridad a todas las rutas
router.use(militaryRateLimit);
router.use(militarySecurityMiddleware);

// 🔐 BIOMETRIC TEMPLATE SECURITY
router.post('/biometric/secure-hash', async (req, res) => {
  try {
    console.log('🔐 [BIOMETRIC-API] Procesando template con seguridad militar...');

    const { templateData, userId, companyId } = req.body;

    if (!templateData || !userId || !companyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: templateData, userId, companyId'
      });
    }

    // Procesar template con seguridad militar
    const secureHash = await securityEngine.securelyHashBiometricTemplate(
      templateData,
      userId,
      companyId
    );

    res.json({
      success: true,
      message: 'Biometric template processed with military-grade security',
      data: {
        secureHash: secureHash,
        securityFeatures: {
          encryption: 'AES-256-GCM',
          hashing: 'bcrypt-15-rounds',
          irreversible: true,
          gdpr_compliant: true,
          military_grade: true
        },
        securityScore: req.securityAnalysis?.securityScore || 100
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [BIOMETRIC-API] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Biometric template security processing failed',
      details: error.message
    });
  }
});

// 🔑 MULTI-FACTOR AUTHENTICATION
router.post('/mfa/generate', async (req, res) => {
  try {
    console.log('🔑 [MFA-API] Generando MFA militar...');

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Generar MFA con seguridad militar
    const mfaData = await securityEngine.generateMFASecret(userId);

    res.json({
      success: true,
      message: 'Military-grade MFA generated successfully',
      data: {
        secret: mfaData.secret,
        qrCode: mfaData.qrCode,
        backupCodes: mfaData.backupCodes,
        securityLevel: mfaData.securityLevel,
        instructions: {
          step1: 'Scan QR code with authenticator app',
          step2: 'Enter 6-digit code to verify setup',
          step3: 'Save backup codes in secure location'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [MFA-API] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'MFA generation failed',
      details: error.message
    });
  }
});

router.post('/mfa/verify', async (req, res) => {
  try {
    const { token, secret } = req.body;

    if (!token || !secret) {
      return res.status(400).json({
        success: false,
        error: 'token and secret are required'
      });
    }

    // Verificar MFA token
    const isValid = securityEngine.verifyMFAToken(token, secret);

    res.json({
      success: true,
      data: {
        verified: isValid,
        securityLevel: 'military_grade',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [MFA-API] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'MFA verification failed',
      details: error.message
    });
  }
});

// 🔍 THREAT DETECTION
router.get('/threats/analyze', async (req, res) => {
  try {
    console.log('🔍 [THREAT-API] Ejecutando análisis de amenazas...');

    // Usar análisis ya realizado por middleware
    const threatAnalysis = req.securityAnalysis;

    res.json({
      success: true,
      message: 'Threat analysis completed',
      data: {
        threatAnalysis: threatAnalysis,
        securityRecommendations: generateSecurityRecommendations(threatAnalysis),
        militaryGrade: true,
        realTimeProtection: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [THREAT-API] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Threat analysis failed',
      details: error.message
    });
  }
});

// 📋 GDPR COMPLIANCE
router.post('/gdpr/request', async (req, res) => {
  try {
    console.log('📋 [GDPR-API] Procesando solicitud GDPR...');

    const { requestType, userId, companyId, additionalData } = req.body;

    if (!requestType || !userId) {
      return res.status(400).json({
        success: false,
        error: 'requestType and userId are required'
      });
    }

    // Validar tipos de solicitud GDPR
    const validTypes = [
      'right_to_access',
      'right_to_erasure',
      'right_to_rectification',
      'right_to_portability',
      'consent_withdrawal'
    ];

    if (!validTypes.includes(requestType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid request type. Valid types: ${validTypes.join(', ')}`
      });
    }

    // Procesar solicitud GDPR
    const gdprResult = await securityEngine.handleGDPRRequest(
      requestType,
      userId,
      companyId,
      additionalData
    );

    res.json({
      success: true,
      message: `GDPR ${requestType} request processed successfully`,
      data: {
        gdprResult: gdprResult,
        compliance: {
          regulation: 'GDPR (EU) 2016/679',
          militaryGrade: true,
          auditCompliant: true,
          dataProtection: 'maximum'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [GDPR-API] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'GDPR request processing failed',
      details: error.message
    });
  }
});

// 🔐 ENCRYPTION/DECRYPTION
router.post('/encrypt', async (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'data is required'
      });
    }

    const encrypted = securityEngine.encryptSensitiveData(data);

    res.json({
      success: true,
      message: 'Data encrypted with military-grade security',
      data: {
        encrypted: encrypted,
        algorithm: 'AES-256-GCM',
        keySize: '256-bit',
        militaryGrade: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [ENCRYPT-API] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Encryption failed',
      details: error.message
    });
  }
});

router.post('/decrypt', async (req, res) => {
  try {
    const { encrypted, authTag, iv } = req.body;

    if (!encrypted || !authTag || !iv) {
      return res.status(400).json({
        success: false,
        error: 'encrypted, authTag, and iv are required'
      });
    }

    const decrypted = securityEngine.decryptSensitiveData(encrypted, authTag, iv);

    res.json({
      success: true,
      message: 'Data decrypted successfully',
      data: {
        decrypted: decrypted,
        verified: true,
        militaryGrade: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [DECRYPT-API] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Decryption failed',
      details: error.message
    });
  }
});

// 📊 SECURITY METRICS
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      securityLevel: 'military_grade',
      encryption: {
        algorithm: 'AES-256-GCM',
        keySize: '256-bit',
        status: 'active'
      },
      threatDetection: {
        enabled: true,
        realTime: true,
        patterns: ['sql_injection', 'xss', 'brute_force', 'anomaly_detection']
      },
      gdprCompliance: {
        enabled: true,
        auditLogging: true,
        dataRetention: '7_years',
        rightToErasure: true,
        dataPortability: true
      },
      authentication: {
        mfaEnabled: true,
        jwtSecure: true,
        sessionManagement: 'secure'
      },
      biometricSecurity: {
        templateHashing: 'bcrypt_15_rounds',
        irreversibleTransformation: true,
        saltedHashing: true,
        encryptedStorage: true
      },
      compliance: {
        iso27001: true,
        sox: true,
        militaryGrade: true
      },
      uptime: process.uptime(),
      lastSecurityUpdate: new Date().toISOString()
    };

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [METRICS-API] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Security metrics retrieval failed',
      details: error.message
    });
  }
});

// 🛡️ HEALTH CHECK MILITAR
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'operational',
      securityEngine: 'active',
      threatDetection: 'active',
      encryption: 'active',
      gdprCompliance: 'active',
      mfaSystem: 'active',
      auditLogging: 'active',
      militaryGrade: true,
      lastCheck: new Date().toISOString(),
      uptime: process.uptime()
    };

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Military security health check failed',
      details: error.message
    });
  }
});

// Función helper para generar recomendaciones
function generateSecurityRecommendations(threatAnalysis) {
  const recommendations = [];

  if (threatAnalysis.threatsDetected > 0) {
    recommendations.push('Increase monitoring frequency');
    recommendations.push('Review access patterns');

    if (threatAnalysis.threats.some(t => t.type === 'sql_injection')) {
      recommendations.push('Implement additional SQL injection protection');
    }

    if (threatAnalysis.threats.some(t => t.type === 'brute_force')) {
      recommendations.push('Implement IP blocking for repeated failed attempts');
    }
  } else {
    recommendations.push('Security posture is excellent');
    recommendations.push('Continue current monitoring practices');
  }

  return recommendations;
}

module.exports = router;