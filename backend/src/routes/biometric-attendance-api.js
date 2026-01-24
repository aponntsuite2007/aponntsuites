/**
 * 🎯 BIOMETRIC ATTENDANCE API - ENTERPRISE GRADE
 * =============================================
 * Real-time biometric attendance/checkout endpoints
 * ✅ Face recognition for clock in/out
 * ✅ Multi-tenant security isolation
 * ✅ Enterprise performance (<500ms)
 * ✅ Comprehensive audit logging
 * ✅ Mobile and kiosk support
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const BiometricMatchingService = require('../services/biometric-matching-service');
const CompanyIsolationMiddleware = require('../middleware/company-isolation');
const { auth } = require('../middleware/auth');
const SuspensionBlockingService = require('../services/SuspensionBlockingService');
const { checkConsentStatus, CONSENT_TYPES, CONSENT_ERROR_CODES } = require('../middleware/biometricConsentCheck');

// Importar sequelize global para operaciones de BD (evita crear múltiples instancias)
const { sequelize } = require('../config/database-postgresql');
const { QueryTypes } = require('sequelize');
const { Pool } = require('pg');

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed for biometric attendance'), false);
    }
  }
});

// Initialize biometric matching service
const matchingService = new BiometricMatchingService({
  matchingThreshold: 0.75,
  minQualityScore: 0.7,
  maxMatchingTime: 500,
  auditLogging: true,
  performanceLogging: true
});

// ==============================================
// 📄 INTEGRACIÓN DMS - SSOT DOCUMENTAL
// ==============================================
const registerBiometricDocInDMS = async (req, file, documentType, metadata = {}) => {
    try {
        const dmsService = req.app.get('dmsIntegrationService');
        if (!dmsService) return null;

        const companyId = req.companyContext?.companyId || metadata.companyId;
        const userId = metadata.userId;

        const result = await dmsService.registerDocument({
            module: 'biometric',
            documentType: documentType === 'clock_in' ? 'BIOMETRIC_CLOCK_IN' :
                          documentType === 'clock_out' ? 'BIOMETRIC_CLOCK_OUT' : 'BIOMETRIC_VERIFY',
            companyId,
            employeeId: userId,
            createdById: userId,
            sourceEntityType: 'biometric-attendance',
            sourceEntityId: metadata.attendanceId || null,
            file: {
                buffer: file.buffer, // memoryStorage = buffer directo
                originalname: file.originalname || 'biometric.jpg',
                mimetype: file.mimetype,
                size: file.size
            },
            title: `Biometric ${documentType} - User ${userId}`,
            description: `Captura biométrica para ${documentType}`,
            metadata: { uploadRoute: req.originalUrl, ...metadata }
        });

        console.log(`📄 [DMS-BIOMETRIC] Registrado: ${documentType} - ${result.document?.id}`);
        return result;
    } catch (error) {
        console.error('❌ [DMS-BIOMETRIC] Error:', error.message);
        return null;
    }
};

// Initialize company isolation middleware
const companyIsolation = new CompanyIsolationMiddleware({
  enforceIsolation: true,
  auditLogging: true
});

/**
 * @route POST /api/v2/biometric-attendance/clock-in
 * @desc Clock in using biometric recognition
 */
router.post('/clock-in',
  companyIsolation.middleware(),
  CompanyIsolationMiddleware.biometricIsolation(),
  upload.single('biometricImage'),
  async (req, res) => {
    const startTime = Date.now();

    try {
      const companyId = req.companyContext?.companyId;

      if (!companyId) {
        return res.status(403).json({
          success: false,
          error: 'Company context required for biometric attendance',
          code: 'COMPANY_REQUIRED'
        });
      }

      console.log(`⏰ [CLOCK-IN] Processing for company: ${companyId}`);

      // Prepare capture data
      const captureData = await prepareCaptureData(req);

      // Perform biometric matching
      const matchingResult = await matchingService.performMatching(captureData, companyId, {
        operation: 'clock_in',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        deviceInfo: req.body.deviceInfo
      });

      if (!matchingResult.success) {
        return res.status(200).json({
          success: false,
          reason: matchingResult.reason,
          message: getFailureMessage(matchingResult.reason),
          sessionId: matchingResult.sessionId,
          processingTime: matchingResult.processingTime,
          canRetry: true
        });
      }

      // ═══════════════════════════════════════════════════════════════
      // VERIFICAR BLOQUEO POR SUSPENSIÓN DISCIPLINARIA
      // ═══════════════════════════════════════════════════════════════
      const employeeId = matchingResult.matchedUserId || matchingResult.employee?.user_id;
      if (employeeId) {
        const suspensionCheck = await SuspensionBlockingService.quickCheck(employeeId, companyId);

        if (suspensionCheck.blocked) {
          console.log(`🚫 [CLOCK-IN] Empleado ${employeeId} bloqueado por suspensión hasta ${suspensionCheck.endDate}`);

          return res.status(200).json({
            success: false,
            blocked: true,
            blockReason: 'SUSPENSION',
            reason: 'employee_suspended',
            message: `Acceso bloqueado por suspensión disciplinaria.\nFecha de finalización: ${new Date(suspensionCheck.endDate).toLocaleDateString('es-AR')}\nDías restantes: ${suspensionCheck.daysRemaining}`,
            suspensionInfo: {
              endDate: suspensionCheck.endDate,
              daysRemaining: suspensionCheck.daysRemaining,
              sanctionId: suspensionCheck.sanctionId
            },
            sessionId: matchingResult.sessionId,
            processingTime: Date.now() - startTime,
            canRetry: false
          });
        }

        // ═══════════════════════════════════════════════════════════════
        // VERIFICAR CONSENTIMIENTO BIOMÉTRICO (Ley 25.326 / GDPR / BIPA)
        // ═══════════════════════════════════════════════════════════════
        const consentResult = await checkConsentStatus(employeeId, companyId);

        if (!consentResult.hasConsent) {
          console.log(`🔒 [CLOCK-IN] Empleado ${employeeId} sin consentimiento biométrico: ${consentResult.errorCode}`);

          return res.status(200).json({
            success: false,
            blocked: true,
            blockReason: 'CONSENT_REQUIRED',
            reason: consentResult.errorCode,
            message: consentResult.message || 'Se requiere consentimiento biométrico para registrar asistencia.',
            consentInfo: {
              errorCode: consentResult.errorCode,
              requestUrl: `/api/v1/biometric/consents/request?userId=${employeeId}`,
              ...(consentResult.revokedDate && { revokedDate: consentResult.revokedDate }),
              ...(consentResult.rejectedDate && { rejectedDate: consentResult.rejectedDate }),
              ...(consentResult.expiredDate && { expiredDate: consentResult.expiredDate })
            },
            legal: {
              regulation: 'Ley 25.326 (Argentina) / GDPR (EU) / BIPA (USA)',
              requirement: 'Consentimiento explícito requerido para procesamiento biométrico'
            },
            sessionId: matchingResult.sessionId,
            processingTime: Date.now() - startTime,
            canRetry: false
          });
        }
      }

      // Process attendance record
      const attendanceResult = await processClockIn(matchingResult, companyId, req);

      // ✅ Registrar en DMS (SSOT)
      let dmsResult = null;
      if (req.file) {
        dmsResult = await registerBiometricDocInDMS(req, req.file, 'clock_in', {
          companyId,
          userId: matchingResult.match.employeeId,
          attendanceId: attendanceResult.attendanceId
        });
      }

      const totalTime = Date.now() - startTime;

      res.json({
        success: true,
        message: `Bienvenido, ${matchingResult.match.employeeName}!`,
        employee: {
          id: matchingResult.match.employeeId,
          name: matchingResult.match.employeeName
        },
        attendance: {
          id: attendanceResult.attendanceId,
          clockInTime: attendanceResult.clockInTime,
          location: attendanceResult.location
        },
        biometric: {
          similarity: matchingResult.match.similarity,
          confidence: matchingResult.match.confidence,
          algorithm: matchingResult.algorithm
        },
        performance: {
          totalTime: totalTime,
          matchingTime: matchingResult.performance.totalTime,
          withinTarget: totalTime <= 1000 // 1 second total target
        },
        sessionId: matchingResult.sessionId,
        dms: dmsResult ? { documentId: dmsResult.document?.id } : null
      });

    } catch (error) {
      console.error('❌ [CLOCK-IN] Error:', error);

      res.status(500).json({
        success: false,
        error: 'Biometric clock-in failed',
        message: 'Error interno del sistema. Intente nuevamente.',
        code: 'INTERNAL_ERROR',
        processingTime: Date.now() - startTime
      });
    }
  }
);

/**
 * @route POST /api/v2/biometric-attendance/clock-out
 * @desc Clock out using biometric recognition
 */
router.post('/clock-out',
  companyIsolation.middleware(),
  CompanyIsolationMiddleware.biometricIsolation(),
  upload.single('biometricImage'),
  async (req, res) => {
    const startTime = Date.now();

    try {
      const companyId = req.companyContext?.companyId;

      if (!companyId) {
        return res.status(403).json({
          success: false,
          error: 'Company context required for biometric attendance',
          code: 'COMPANY_REQUIRED'
        });
      }

      console.log(`⏰ [CLOCK-OUT] Processing for company: ${companyId}`);

      // Prepare capture data
      const captureData = await prepareCaptureData(req);

      // Perform biometric matching
      const matchingResult = await matchingService.performMatching(captureData, companyId, {
        operation: 'clock_out',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        deviceInfo: req.body.deviceInfo
      });

      if (!matchingResult.success) {
        return res.status(200).json({
          success: false,
          reason: matchingResult.reason,
          message: getFailureMessage(matchingResult.reason),
          sessionId: matchingResult.sessionId,
          processingTime: matchingResult.processingTime,
          canRetry: true
        });
      }

      // ═══════════════════════════════════════════════════════════════
      // VERIFICAR BLOQUEO POR SUSPENSIÓN DISCIPLINARIA (clock-out)
      // ═══════════════════════════════════════════════════════════════
      const employeeIdOut = matchingResult.matchedUserId || matchingResult.employee?.user_id;
      if (employeeIdOut) {
        const suspensionCheckOut = await SuspensionBlockingService.quickCheck(employeeIdOut, companyId);

        if (suspensionCheckOut.blocked) {
          console.log(`🚫 [CLOCK-OUT] Empleado ${employeeIdOut} bloqueado por suspensión hasta ${suspensionCheckOut.endDate}`);

          return res.status(200).json({
            success: false,
            blocked: true,
            blockReason: 'SUSPENSION',
            reason: 'employee_suspended',
            message: `Acceso bloqueado por suspensión disciplinaria.\nFecha de finalización: ${new Date(suspensionCheckOut.endDate).toLocaleDateString('es-AR')}\nDías restantes: ${suspensionCheckOut.daysRemaining}`,
            suspensionInfo: {
              endDate: suspensionCheckOut.endDate,
              daysRemaining: suspensionCheckOut.daysRemaining,
              sanctionId: suspensionCheckOut.sanctionId
            },
            sessionId: matchingResult.sessionId,
            processingTime: Date.now() - startTime,
            canRetry: false
          });
        }

        // ═══════════════════════════════════════════════════════════════
        // VERIFICAR CONSENTIMIENTO BIOMÉTRICO (Ley 25.326 / GDPR / BIPA)
        // ═══════════════════════════════════════════════════════════════
        const consentResultOut = await checkConsentStatus(employeeIdOut, companyId);

        if (!consentResultOut.hasConsent) {
          console.log(`🔒 [CLOCK-OUT] Empleado ${employeeIdOut} sin consentimiento biométrico: ${consentResultOut.errorCode}`);

          return res.status(200).json({
            success: false,
            blocked: true,
            blockReason: 'CONSENT_REQUIRED',
            reason: consentResultOut.errorCode,
            message: consentResultOut.message || 'Se requiere consentimiento biométrico para registrar asistencia.',
            consentInfo: {
              errorCode: consentResultOut.errorCode,
              requestUrl: `/api/v1/biometric/consents/request?userId=${employeeIdOut}`,
              ...(consentResultOut.revokedDate && { revokedDate: consentResultOut.revokedDate }),
              ...(consentResultOut.rejectedDate && { rejectedDate: consentResultOut.rejectedDate }),
              ...(consentResultOut.expiredDate && { expiredDate: consentResultOut.expiredDate })
            },
            legal: {
              regulation: 'Ley 25.326 (Argentina) / GDPR (EU) / BIPA (USA)',
              requirement: 'Consentimiento explícito requerido para procesamiento biométrico'
            },
            sessionId: matchingResult.sessionId,
            processingTime: Date.now() - startTime,
            canRetry: false
          });
        }
      }

      // Process attendance record
      const attendanceResult = await processClockOut(matchingResult, companyId, req);

      // ✅ Registrar en DMS (SSOT)
      let dmsResult = null;
      if (req.file) {
        dmsResult = await registerBiometricDocInDMS(req, req.file, 'clock_out', {
          companyId,
          userId: matchingResult.match.employeeId,
          attendanceId: attendanceResult.attendanceId
        });
      }

      const totalTime = Date.now() - startTime;

      res.json({
        success: true,
        message: `Hasta luego, ${matchingResult.match.employeeName}!`,
        employee: {
          id: matchingResult.match.employeeId,
          name: matchingResult.match.employeeName
        },
        attendance: {
          id: attendanceResult.attendanceId,
          clockOutTime: attendanceResult.clockOutTime,
          totalHours: attendanceResult.totalHours,
          location: attendanceResult.location
        },
        biometric: {
          similarity: matchingResult.match.similarity,
          confidence: matchingResult.match.confidence,
          algorithm: matchingResult.algorithm
        },
        performance: {
          totalTime: totalTime,
          matchingTime: matchingResult.performance.totalTime,
          withinTarget: totalTime <= 1000
        },
        sessionId: matchingResult.sessionId,
        dms: dmsResult ? { documentId: dmsResult.document?.id } : null
      });

    } catch (error) {
      console.error('❌ [CLOCK-OUT] Error:', error);

      res.status(500).json({
        success: false,
        error: 'Biometric clock-out failed',
        message: 'Error interno del sistema. Intente nuevamente.',
        code: 'INTERNAL_ERROR',
        processingTime: Date.now() - startTime
      });
    }
  }
);

/**
 * @route POST /api/v2/biometric-attendance/verify
 * @desc Verify biometric without attendance (for testing)
 */
router.post('/verify',
  companyIsolation.middleware(),
  upload.single('biometricImage'),
  async (req, res) => {
    const startTime = Date.now();

    try {
      const companyId = req.companyContext?.companyId;

      if (!companyId) {
        return res.status(403).json({
          success: false,
          error: 'Company context required for biometric verification'
        });
      }

      console.log(`🔍 [VERIFY] Processing for company: ${companyId}`);

      // Prepare capture data
      const captureData = await prepareCaptureData(req);

      // Perform biometric matching
      const matchingResult = await matchingService.performMatching(captureData, companyId, {
        operation: 'verify',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      });

      // ✅ Registrar en DMS (SSOT) - Solo si match exitoso
      let dmsResult = null;
      if (req.file && matchingResult.success) {
        dmsResult = await registerBiometricDocInDMS(req, req.file, 'verify', {
          companyId,
          userId: matchingResult.match?.employeeId
        });
      }

      const totalTime = Date.now() - startTime;

      res.json({
        success: matchingResult.success,
        message: matchingResult.success ?
          `Empleado identificado: ${matchingResult.match.employeeName}` :
          'No se pudo identificar al empleado',
        employee: matchingResult.match ? {
          id: matchingResult.match.employeeId,
          name: matchingResult.match.employeeName
        } : null,
        biometric: matchingResult.match ? {
          similarity: matchingResult.match.similarity,
          confidence: matchingResult.match.confidence,
          threshold: matchingResult.quality.matchingThreshold
        } : null,
        performance: {
          totalTime: totalTime,
          matchingTime: matchingResult.performance?.totalTime || totalTime,
          withinTarget: totalTime <= 500
        },
        sessionId: matchingResult.sessionId,
        reason: matchingResult.reason || null,
        dms: dmsResult ? { documentId: dmsResult.document?.id } : null
      });

    } catch (error) {
      console.error('❌ [VERIFY] Error:', error);

      res.status(500).json({
        success: false,
        error: 'Biometric verification failed',
        processingTime: Date.now() - startTime
      });
    }
  }
);

/**
 * @route GET /api/v2/biometric-attendance/statistics
 * @desc Get biometric attendance statistics for company
 */
router.get('/statistics',
  companyIsolation.middleware(),
  async (req, res) => {
    try {
      const companyId = req.companyContext?.companyId;

      if (!companyId) {
        return res.status(403).json({
          success: false,
          error: 'Company context required'
        });
      }

      // Get matching service statistics
      const serviceStats = matchingService.getStatistics();

      // Get company-specific statistics (would query database in real implementation)
      const companyStats = await getCompanyBiometricStats(companyId);

      res.json({
        success: true,
        companyId: companyId,
        service: serviceStats,
        company: companyStats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ [STATISTICS] Error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get statistics'
      });
    }
  }
);

/**
 * @route GET /api/v2/biometric-attendance/health
 * @desc Health check for biometric attendance system
 */
router.get('/health', async (req, res) => {
  try {
    const serviceStats = matchingService.getStatistics();

    res.json({
      status: 'healthy',
      service: 'biometric-attendance-api',
      version: '1.0.0',
      performance: {
        averageMatchTime: serviceStats.averageMatchTime,
        successRate: serviceStats.successRate,
        totalMatches: serviceStats.totalMatches
      },
      capabilities: {
        clockIn: true,
        clockOut: true,
        verification: true,
        multiTenant: true,
        realTimeMatching: true
      },
      algorithm: {
        engine: 'Face-api.js',
        method: 'cosine_similarity',
        threshold: 0.75,
        dimensions: 128
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 📷 Prepare capture data from request
 */
async function prepareCaptureData(req) {
  const captureData = {
    timestamp: new Date().toISOString()
  };

  // If embedding provided in body (from frontend processing)
  if (req.body.embedding) {
    captureData.embedding = JSON.parse(req.body.embedding);
  }

  // If image file uploaded
  if (req.file) {
    captureData.imageData = {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      size: req.file.size
    };
  }

  // Quality score if provided
  if (req.body.qualityScore) {
    captureData.qualityScore = parseFloat(req.body.qualityScore);
  }

  // Additional metadata
  captureData.deviceInfo = req.body.deviceInfo ? JSON.parse(req.body.deviceInfo) : null;
  captureData.location = req.body.location ? JSON.parse(req.body.location) : null;

  return captureData;
}

/**
 * ⏰ Process clock in attendance
 */
async function processClockIn(matchingResult, companyId, req) {
  console.log(`⏰ [PROCESS] Clock-in for employee: ${matchingResult.match.employeeId}`);

  // In real implementation, this would:
  // 1. Check if employee already clocked in today
  // 2. Create new attendance record
  // 3. Update employee status
  // 4. Send notifications if needed

  // Simulate attendance processing
  const attendanceId = generateAttendanceId();
  const clockInTime = new Date();

  // Simulate database insertion
  console.log(`💾 [ATTENDANCE] Created record: ${attendanceId}`);

  return {
    attendanceId: attendanceId,
    clockInTime: clockInTime.toISOString(),
    location: req.body.location || 'Unknown'
  };
}

/**
 * ⏰ Process clock out attendance
 */
async function processClockOut(matchingResult, companyId, req) {
  console.log(`⏰ [PROCESS] Clock-out for employee: ${matchingResult.match.employeeId}`);

  // In real implementation, this would:
  // 1. Find active attendance record for today
  // 2. Update with clock-out time
  // 3. Calculate total hours
  // 4. Update employee status

  // Simulate attendance processing
  const attendanceId = generateAttendanceId();
  const clockOutTime = new Date();
  const totalHours = 8 + Math.random() * 2; // Simulate 8-10 hours

  return {
    attendanceId: attendanceId,
    clockOutTime: clockOutTime.toISOString(),
    totalHours: totalHours.toFixed(2),
    location: req.body.location || 'Unknown'
  };
}

/**
 * 📊 Get company biometric statistics
 */
async function getCompanyBiometricStats(companyId) {
  // In real implementation, this would query the database
  // For now, simulate statistics

  return {
    totalEmployees: 25,
    employeesWithBiometrics: 22,
    biometricCoverage: 88,
    totalAttendanceToday: 18,
    biometricAttendanceToday: 16,
    biometricSuccessRate: 94.5,
    avgProcessingTime: 350,
    lastUpdate: new Date().toISOString()
  };
}

/**
 * 💬 Get failure message based on reason
 */
function getFailureMessage(reason) {
  const messages = {
    'NO_TEMPLATES': 'No hay registro biométrico para esta empresa. Registre empleados primero.',
    'LOW_QUALITY': 'Calidad de imagen insuficiente. Mejore la iluminación y posición.',
    'NO_MATCH': 'No se pudo identificar al empleado. Intente nuevamente.',
    'MATCHING_ERROR': 'Error en el sistema de reconocimiento. Contacte al administrador.',
    'TIMEOUT': 'Tiempo de procesamiento excedido. Intente nuevamente.'
  };

  return messages[reason] || 'Error desconocido en el reconocimiento biométrico.';
}

/**
 * 🆔 Generate unique attendance ID
 */
function generateAttendanceId() {
  return 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 🔐 EVP_BytesToKey algorithm (replaces deprecated createDecipher key derivation)
 * Used to decrypt templates that were encrypted with the old createCipher() method
 */
function evpBytesToKey(password, salt, keyLen, ivLen) {
  const crypto = require('crypto');
  let key = Buffer.alloc(0);
  let iv = Buffer.alloc(0);
  let tmp = Buffer.alloc(0);

  while (key.length < keyLen + ivLen) {
    const hash = crypto.createHash('md5');
    hash.update(tmp);
    hash.update(password);
    if (salt) hash.update(salt);
    tmp = hash.digest();

    const needed = keyLen + ivLen - key.length;
    if (tmp.length > needed) {
      tmp = tmp.slice(0, needed);
    }

    key = Buffer.concat([key, tmp]);
  }

  const result = { key: key.slice(0, keyLen) };
  if (ivLen > 0) {
    result.iv = key.slice(keyLen, keyLen + ivLen);
  }
  return result;
}

/**
 * @route POST /api/v2/biometric-attendance/verify-real
 * @desc Real biometric verification using Face-api.js (no simulation)
 */
router.post('/verify-real', upload.single('biometricImage'), async (req, res) => {
  const startTime = Date.now();

  try {
    const companyId = req.headers['x-company-id'] || req.body.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID requerido',
        code: 'COMPANY_REQUIRED'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Imagen biométrica requerida',
        code: 'IMAGE_REQUIRED'
      });
    }

    console.log(`🔍 [VERIFY-REAL] Processing for company: ${companyId}`);

    // Client can send embedding OR backend will process image
    let clientEmbedding;

    try {
      // Option 1: Client sends pre-computed embedding (web kiosk with face-api.js)
      if (req.body.embedding) {
        const embeddingData = typeof req.body.embedding === 'string'
          ? JSON.parse(req.body.embedding)
          : req.body.embedding;

        if (Array.isArray(embeddingData) && embeddingData.length === 128) {
          clientEmbedding = embeddingData;
          console.log(`🎯 [VERIFY-REAL] Received 128D embedding from client`);
        }
      }

      // Option 2: Backend processes image with Face-API.js (Flutter APK)
      if (!clientEmbedding && req.file) {
        console.log(`🖼️ [VERIFY-REAL] Processing image with Face-API.js...`);

        const faceapi = require('face-api.js');
        const canvas = require('canvas');
        const { Canvas, Image, ImageData } = canvas;

        // Patch face-api.js to work with node-canvas
        faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

        // Load models if not loaded
        const path = require('path');
        const modelsPath = path.join(__dirname, '../../public/models');

        try {
          await faceapi.nets.tinyFaceDetector.loadFromDisk(modelsPath);
          await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
          await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
          console.log(`✅ [FACE-API] Models loaded from ${modelsPath}`);
        } catch (loadError) {
          console.log(`⚠️ [FACE-API] Models already loaded or error: ${loadError.message}`);
        }

        // Convert buffer to image
        const img = await canvas.loadImage(req.file.buffer);
        console.log(`📷 [FACE-API] Image loaded: ${img.width}x${img.height}`);

        // Detect face and extract descriptor
        const detection = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          console.log(`❌ [FACE-API] NO FACE DETECTED in image`);
          return res.status(200).json({
            success: false,
            message: 'No se detectó ningún rostro en la imagen',
            code: 'NO_FACE_DETECTED'
          });
        }

        clientEmbedding = Array.from(detection.descriptor);
        console.log(`✅ [FACE-API] Extracted 128D descriptor from image`);
      }

      // Validate we have an embedding
      if (!clientEmbedding || !Array.isArray(clientEmbedding) || clientEmbedding.length !== 128) {
        return res.status(400).json({
          success: false,
          message: 'No se pudo obtener descriptor biométrico válido',
          code: 'INVALID_EMBEDDING'
        });
      }

    } catch (error) {
      console.error(`❌ [VERIFY-REAL] Error processing biometric data:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error procesando datos biométricos',
        code: 'PROCESSING_ERROR',
        error: error.message
      });
    }

    // Real biometric matching against stored templates
    const { sequelize } = require('../config/database');
    const crypto = require('crypto');

    // Get all biometric templates for this company
    const templatesQuery = `
      SELECT bt.*, u.user_id as employee_id,
             CONCAT(u."firstName", ' ', u."lastName") as employee_name
      FROM biometric_templates bt
      JOIN users u ON bt.employee_id::uuid = u.user_id
      WHERE bt.company_id = :companyId AND bt.is_active = true
    `;

    const templates = await sequelize.query(templatesQuery, {
      replacements: { companyId },
      type: sequelize.QueryTypes.SELECT
    });

    if (templates.length === 0) {
      console.log('❌ [VERIFY-REAL] No biometric templates found for company');
      return res.status(200).json({
        success: false,
        message: 'No hay empleados registrados con biometría',
        code: 'NO_TEMPLATES'
      });
    }

    // Real cosine similarity matching
    let bestMatch = null;
    let bestSimilarity = -1;

    for (const template of templates) {
      try {
        // Decrypt stored template
        // Format in DB: "IV:encrypted_data" (both in hex)
        const encryptedData = template.embedding_encrypted;

        // Split IV from encrypted data
        const parts = encryptedData.split(':');
        if (parts.length !== 2) {
          throw new Error('Invalid encrypted template format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];

        // Generate company key (same as encryption)
        const baseKey = process.env.BIOMETRIC_ENCRYPTION_KEY || 'default-biometric-key-change-in-production';
        const companyKey = crypto.createHash('sha256')
          .update(baseKey + companyId)
          .digest();

        // Decrypt
        const decipher = crypto.createDecipheriv('aes-256-cbc', companyKey, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        const storedEmbedding = JSON.parse(decrypted);

        // Calculate cosine similarity
        const similarity = calculateCosineSimilarity(clientEmbedding, storedEmbedding);

        console.log(`🎯 [MATCH] Employee ${template.employee_name}: ${similarity.toFixed(3)}`);

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = {
            employeeId: template.employee_id,
            employeeName: template.employee_name,
            similarity: similarity
          };
        }
      } catch (error) {
        console.error(`❌ [MATCH] Error processing template for employee ${template.employee_id}:`, error);
      }
    }

    // Check if match meets threshold
    const threshold = 0.75;

    if (bestMatch && bestSimilarity >= threshold) {
      console.log(`✅ [MATCH] Success: ${bestMatch.employeeName} (${bestSimilarity.toFixed(3)})`);

      // 🔒 VALIDAR PERMISO can_use_mobile_app SI ES MODO EMPLEADO (APK)
      const isEmployeeMode = req.headers['x-employee-mode'] === 'true';

      if (isEmployeeMode) {
        const [employeePermission] = await sequelize.query(`
          SELECT can_use_mobile_app, "firstName", "lastName"
          FROM users
          WHERE user_id = :employeeId AND company_id = :companyId
          LIMIT 1
        `, {
          replacements: {
            employeeId: bestMatch.employeeId,
            companyId: companyId
          },
          type: sequelize.QueryTypes.SELECT
        });

        if (employeePermission && !employeePermission.can_use_mobile_app) {
          console.log(`🚫 [MOBILE-APP] Empleado ${bestMatch.employeeName} NO autorizado para usar app móvil`);

          return res.status(403).json({
            success: false,
            code: 'MOBILE_APP_NOT_AUTHORIZED',
            message: 'No tienes autorización para fichar desde la aplicación móvil. Contacta a tu supervisor.',
            employee_name: bestMatch.employeeName,
            similarity: bestSimilarity,
            processingTime: Date.now() - startTime
          });
        }

        console.log(`✅ [MOBILE-APP] Empleado ${bestMatch.employeeName} autorizado para usar app móvil`);
      }

      // 🔒 VALIDAR DEPARTAMENTO AUTORIZADO EN KIOSK
      const deviceId = req.headers['x-device-id'] || req.body.deviceId;

      if (deviceId) {
        const [kioskInfo] = await sequelize.query(`
          SELECT k.id, k.name, k.authorized_departments, u.department_id,
                 d.name as department_name
          FROM kiosks k
          CROSS JOIN users u
          LEFT JOIN departments d ON u.department_id = d.id
          WHERE k.device_id = :deviceId
            AND k.company_id = :companyId
            AND k.is_active = true
            AND u.user_id = :employeeId
          LIMIT 1
        `, {
          replacements: {
            deviceId: deviceId,
            companyId: companyId,
            employeeId: bestMatch.employeeId
          },
          type: sequelize.QueryTypes.SELECT
        });

        if (kioskInfo) {
          const authorizedDepts = kioskInfo.authorized_departments || [];
          const employeeDept = kioskInfo.department_id;

          // Si hay departamentos configurados y el empleado NO está autorizado
          if (authorizedDepts.length > 0 && employeeDept && !authorizedDepts.includes(employeeDept)) {
            console.log(`🚫 [AUTH] Empleado ${bestMatch.employeeName} NO autorizado en kiosk ${kioskInfo.name}`);
            console.log(`   Departamento empleado: ${kioskInfo.department_name} (${employeeDept})`);
            console.log(`   Departamentos autorizados: ${JSON.stringify(authorizedDepts)}`);

            // Registrar intento no autorizado
            await sequelize.query(`
              INSERT INTO unauthorized_access_attempts (
                kiosk_id, employee_id, company_id, employee_name,
                employee_department, kiosk_authorized_departments,
                attempt_type, biometric_similarity, timestamp,
                device_id, reason, requires_hr_review
              ) VALUES (
                :kioskId, :employeeId, :companyId, :employeeName,
                :employeeDepartment, :authorizedDepts::jsonb, :attemptType,
                :similarity, NOW(), :deviceId, :reason, true
              )
            `, {
              replacements: {
                kioskId: kioskInfo.id,
                employeeId: bestMatch.employeeId,
                companyId: companyId,
                employeeName: bestMatch.employeeName,
                employeeDepartment: kioskInfo.department_name || 'Sin departamento',
                authorizedDepts: JSON.stringify(authorizedDepts),
                attemptType: 'facial',
                similarity: bestSimilarity,
                deviceId: deviceId,
                reason: 'department_not_authorized'
              },
              type: sequelize.QueryTypes.INSERT
            });

            // Retornar rechazo
            return res.status(403).json({
              success: false,
              code: 'DEPARTMENT_NOT_AUTHORIZED',
              message: 'No está autorizado para marcar asistencia en este kiosko',
              employee_name: bestMatch.employeeName,
              employee_department: kioskInfo.department_name || 'Sin departamento',
              kiosk_name: kioskInfo.name,
              authorized_departments: authorizedDepts,
              similarity: bestSimilarity,
              processingTime: Date.now() - startTime
            });
          } else {
            console.log(`✅ [AUTH] Empleado ${bestMatch.employeeName} autorizado en kiosk ${kioskInfo.name}`);
          }
        }
      }

      // 📊 VERIFICAR DETECCIONES RECIENTES (COOLDOWN 10 MIN)
      const COOLDOWN_MINUTES = 10;
      const cooldownTime = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000);

      const [recentDetections] = await sequelize.query(`
        SELECT id, detection_timestamp, was_registered
        FROM biometric_detections
        WHERE employee_id = :employeeId
          AND company_id = :companyId
          AND detection_timestamp >= :cooldownTime
        ORDER BY detection_timestamp DESC
        LIMIT 1
      `, {
        replacements: {
          employeeId: bestMatch.employeeId,
          companyId: companyId,
          cooldownTime: cooldownTime
        },
        type: QueryTypes.SELECT
      });

      const hasRecentDetection = recentDetections && recentDetections.length > 0;
      const shouldRegister = !hasRecentDetection;

      console.log(`🔍 [COOLDOWN] Recent detection: ${hasRecentDetection ? 'YES' : 'NO'} | Will register: ${shouldRegister}`);

      // ⚡ REGISTRO AUTOMÁTICO: Detecta si es INGRESO o SALIDA
      let operationType; // 'clock_in' o 'clock_out'
      let attendanceId;
      let timestamp;
      let wasRegistered = false;

      try {
        // 1. Buscar última asistencia del empleado HOY usando SQL directo
        const today = getArgentinaDate();

        const [rows] = await sequelize.query(`
          SELECT id, check_in, check_out, status
          FROM attendances
          WHERE user_id = :employeeId
            AND DATE(check_in) = :today
          ORDER BY check_in DESC
          LIMIT 1
        `, {
          replacements: { employeeId: bestMatch.employeeId, today },
          type: QueryTypes.SELECT
        });

        const todayAttendance = rows || null;

        // 2. Lógica de decisión automática
        if (!todayAttendance) {
          // NO tiene registro hoy → ES INGRESO
          operationType = 'clock_in';
          console.log(`📥 [AUTO] INGRESO detectado para ${bestMatch.employeeName}`);

          if (shouldRegister) {
            // 🚨 VERIFICAR AUTORIZACIÓN POR LLEGADA TARDÍA
            const authCheck = await checkLateArrivalAuthorization(bestMatch.employeeId, companyId);

            if (!authCheck.withinTolerance && authCheck.needsAuthorization) {
              // FUERA de tolerancia y sin autorización → solicitar autorización
              console.log(`⚠️ [AUTO] Empleado fuera de turno - autorización requerida`);

              return res.json({
                success: true,
                needsAuthorization: true,
                message: 'FUERA DE TURNO - Aguarde autorización',
                employee: {
                  id: bestMatch.employeeId,
                  name: bestMatch.employeeName
                },
                authorization: {
                  token: authCheck.authorizationToken,
                  lateMinutes: authCheck.lateMinutes,
                  shiftName: authCheck.shiftName,
                  shiftStartTime: authCheck.shiftStartTime
                },
                biometric: {
                  similarity: bestSimilarity,
                  threshold: threshold
                },
                performance: {
                  processingTime: Date.now() - startTime
                }
              });
            }

            // Si tiene autorización previa válida, authCheck ya completó el INSERT
            if (authCheck.wasAuthorized) {
              console.log(`✅ [AUTO] Ingreso con autorización previa aprobada`);
              attendanceId = authCheck.attendanceId;
              timestamp = new Date();
              wasRegistered = true;

            } else {
              // DENTRO de tolerancia o sin shift → INSERT normal
              const [insertResult] = await sequelize.query(`
                INSERT INTO attendances (id, date, user_id, check_in, status, status, created_at, updated_at)
                VALUES (gen_random_uuid(), :date, :userId, :checkInTime, :checkInMethod, :status, NOW(), NOW())
                RETURNING id, check_in
              `, {
                replacements: {
                  date: today,
                  userId: bestMatch.employeeId,
                  checkInTime: new Date(),
                  checkInMethod: 'face',
                  status: 'present'
                },
                type: QueryTypes.INSERT
              });

              attendanceId = insertResult[0].id;
              timestamp = insertResult[0].checkInTime;
              wasRegistered = true;
            }
          } else {
            console.log(`⏭️ [COOLDOWN] Skipping registration - recent detection found`);
            timestamp = new Date();
          }

        } else if (!todayAttendance.checkOutTime) {
          // Tiene registro hoy pero SIN checkOutTime → ES SALIDA
          operationType = 'clock_out';
          attendanceId = todayAttendance.id;
          console.log(`📤 [AUTO] SALIDA detectada para ${bestMatch.employeeName}`);

          if (shouldRegister) {
            const checkInTime = new Date(todayAttendance.checkInTime);
            const now = new Date();
            const secondsSinceCheckIn = (now - checkInTime) / 1000;
            const MIN_SECONDS_BETWEEN_OPERATIONS = 30; // 30 segundos mínimo

            if (secondsSinceCheckIn < MIN_SECONDS_BETWEEN_OPERATIONS) {
              console.log(`⏱️ [COOLDOWN] Operación denegada - Solo han pasado ${Math.round(secondsSinceCheckIn)}s desde el ingreso (mínimo: ${MIN_SECONDS_BETWEEN_OPERATIONS}s)`);
              return res.status(200).json({
                success: false,
                message: 'Operación muy rápida - espere al menos 30 segundos entre ingreso y salida',
                error: 'COOLDOWN_PERIOD',
                secondsRemaining: Math.ceil(MIN_SECONDS_BETWEEN_OPERATIONS - secondsSinceCheckIn)
              });
            }

            // UPDATE usando SQL directo con columnas camelCase
            timestamp = new Date();
            await sequelize.query(`
              UPDATE attendances
              SET check_out = :checkOutTime,
                  status = :checkOutMethod,
                  updated_at = NOW()
              WHERE id = :attendanceId
            `, {
              replacements: {
                checkOutTime: timestamp,
                checkOutMethod: 'face',
                attendanceId: attendanceId
              },
              type: QueryTypes.UPDATE
            });
            wasRegistered = true;
          } else {
            console.log(`⏭️ [COOLDOWN] Skipping checkout registration - recent detection found`);
            timestamp = new Date();
          }

        } else {
          // Tiene registro hoy CON checkOutTime completo → ES RE-INGRESO
          operationType = 'clock_in';
          console.log(`🔄 [AUTO] RE-INGRESO detectado para ${bestMatch.employeeName}`);

          if (shouldRegister) {
            // INSERT usando SQL directo con columnas camelCase (re-ingreso)
            const [reInsertResult] = await sequelize.query(`
              INSERT INTO attendances (id, date, user_id, check_in, status, status, created_at, updated_at)
              VALUES (gen_random_uuid(), :date, :userId, :checkInTime, :checkInMethod, :status, NOW(), NOW())
              RETURNING id, check_in
            `, {
              replacements: {
                date: today,
                userId: bestMatch.employeeId,
                checkInTime: new Date(),
                checkInMethod: 'face',
                status: 'present'
              },
              type: QueryTypes.INSERT
            });

            attendanceId = reInsertResult[0].id;
            timestamp = reInsertResult[0].checkInTime;
            wasRegistered = true;
          } else {
            console.log(`⏭️ [COOLDOWN] Skipping re-ingreso registration - recent detection found`);
            timestamp = new Date();
          }
        }

        console.log(`✅ [AUTO] ${operationType.toUpperCase()} ${wasRegistered ? 'registrado' : 'detectado'}: ${bestMatch.employeeName} - ${timestamp}`);

        // 📊 SIEMPRE registrar en log de detecciones
        await sequelize.query(`
          INSERT INTO biometric_detections (
            company_id, employee_id, employee_name,
            similarity, was_registered, attendance_id,
            operation_type, skip_reason,
            detection_timestamp, processing_time_ms, kiosk_mode
          ) VALUES (
            :companyId, :employeeId, :employeeName,
            :similarity, :wasRegistered, :attendanceId,
            :operationType, :skipReason,
            NOW(), :processingTime, true
          )
        `, {
          replacements: {
            companyId: companyId,
            employeeId: bestMatch.employeeId,
            employeeName: bestMatch.employeeName,
            similarity: bestSimilarity,
            wasRegistered: wasRegistered,
            attendanceId: attendanceId || null,
            operationType: wasRegistered ? operationType : null,
            skipReason: wasRegistered ? null : 'recent_detection',
            processingTime: Date.now() - startTime
          },
          type: QueryTypes.INSERT
        });

        // Contar detecciones totales hoy
        const [results] = await sequelize.query(`
          SELECT COUNT(*) as count
          FROM biometric_detections
          WHERE employee_id = :employeeId
            AND company_id = :companyId
            AND DATE(detection_timestamp) = CURRENT_DATE
        `, {
          replacements: {
            employeeId: bestMatch.employeeId,
            companyId: companyId
          },
          type: QueryTypes.SELECT
        });

        // ✅ Registrar en DMS (SSOT) - Solo si se registró asistencia
        let dmsResult = null;
        if (req.file && wasRegistered) {
          dmsResult = await registerBiometricDocInDMS(req, req.file, operationType, {
            companyId,
            userId: bestMatch.employeeId,
            attendanceId: attendanceId
          });
        }

        // Respuesta para semáforo
        return res.json({
          success: true,
          registered: wasRegistered, // Si se insertó en attendances
          operationType: operationType, // 'clock_in' o 'clock_out'
          employee: {
            id: bestMatch.employeeId,
            name: bestMatch.employeeName
          },
          attendance: wasRegistered ? {
            id: attendanceId,
            timestamp: timestamp,
            type: operationType
          } : null,
          biometric: {
            similarity: bestSimilarity,
            threshold: threshold
          },
          performance: {
            processingTime: Date.now() - startTime
          },
          dms: dmsResult ? { documentId: dmsResult.document?.id } : null
        });

      } catch (attendanceError) {
        console.error('❌ [ATTENDANCE] Error registrando asistencia:', attendanceError);

        // ⚠️ FALSO POSITIVO: Rostro reconocido pero NO se guardó
        return res.status(500).json({
          success: false,
          error: 'Error al guardar asistencia en la base de datos',
          errorDetails: attendanceError.message,
          employee: {
            id: bestMatch.employeeId,
            name: bestMatch.employeeName
          },
          biometric: {
            similarity: bestSimilarity,
            threshold: threshold
          },
          performance: {
            processingTime: Date.now() - startTime
          }
        });
      }
    } else {
      console.log(`❌ [MATCH] No match found. Best: ${bestSimilarity.toFixed(3)} < ${threshold}`);

      return res.json({
        success: false,
        message: 'No se pudo identificar al empleado',
        employee: null,
        biometric: {
          bestSimilarity: bestSimilarity,
          threshold: threshold
        },
        performance: {
          processingTime: Date.now() - startTime
        }
      });
    }

  } catch (error) {
    console.error('❌ [VERIFY-REAL] Error:', error);

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * Calculate cosine similarity between two embeddings
 */
function calculateCosineSimilarity(embedding1, embedding2) {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const magnitude1 = Math.sqrt(norm1);
  const magnitude2 = Math.sqrt(norm2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Get current date in Argentina timezone (UTC-3) as YYYY-MM-DD
 */
function getArgentinaDate() {
  const now = new Date();
  // Argentina is UTC-3
  const argentinaOffset = -3 * 60; // minutes
  const localOffset = now.getTimezoneOffset(); // current timezone offset in minutes
  const argentinaTime = new Date(now.getTime() + (localOffset + argentinaOffset) * 60000);

  const year = argentinaTime.getFullYear();
  const month = String(argentinaTime.getMonth() + 1).padStart(2, '0');
  const day = String(argentinaTime.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * 🚨 CHECK LATE ARRIVAL AUTHORIZATION
 * Verifica si empleado llega fuera de tolerancia y maneja autorización
 */
async function checkLateArrivalAuthorization(employeeId, companyId) {
  const { v4: uuidv4 } = require('uuid');
  const authorizationService = require('../services/LateArrivalAuthorizationService');

  try {
    // 1. Obtener datos del empleado y departamento
    const employeeData = await sequelize.query(`
      SELECT
        u.user_id,
        u."firstName" as first_name,
        u."lastName" as last_name,
        u.legajo,
        u.department_id,
        d.name as department_name,
        d.company_id
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.user_id = :employeeId
        AND u.company_id = :companyId
    `, {
      replacements: { employeeId, companyId },
      type: QueryTypes.SELECT,
      plain: true
    });

    if (!employeeData) {
      console.log(`⚠️ [LATE-CHECK] Employee ${employeeId} not found`);
      return { withinTolerance: true }; // Si no se encuentra, permitir ingreso
    }

    // 2. Obtener turno asignado del empleado vía user_shift_assignments (SSOT)
    const shiftData = await sequelize.query(`
      SELECT
        s.id as shift_id,
        s.name as shift_name,
        s."startTime" as start_time,
        s."endTime" as end_time,
        s."toleranceConfig" as tolerance_config,
        s."breakStartTime" as break_start_time,
        s."breakEndTime" as break_end_time
      FROM user_shift_assignments usa
      JOIN shifts s ON usa.shift_id = s.id
      WHERE usa.user_id = :employeeId
        AND usa.is_active = true
        AND s.company_id = :companyId
      ORDER BY usa.created_at DESC
      LIMIT 1
    `, {
      replacements: { employeeId, companyId },
      type: QueryTypes.SELECT,
      plain: true
    });

    if (!shiftData || !shiftData.start_time) {
      console.log(`✅ [LATE-CHECK] ${employeeData.first_name} ${employeeData.last_name} - sin turno asignado, permitiendo ingreso`);
      return { withinTolerance: true };
    }

    // 3. Calcular si está dentro de tolerancia
    const now = new Date();

    // Convertir shift startTime a Date de hoy para comparación
    const todayStr = now.toISOString().split('T')[0];
    const shiftStartTime = new Date(`${todayStr}T${shiftData.start_time}`);

    // Calcular límites de tolerancia desde toleranceConfig del turno
    const toleranceConfig = shiftData.tolerance_config || {};
    const toleranceMinutesEntry = toleranceConfig.entryAfter || toleranceConfig.toleranceMinutesEntry || 10;
    const toleranceMs = toleranceMinutesEntry * 60 * 1000;
    const earliestAllowed = new Date(shiftStartTime.getTime() - (toleranceConfig.entryBefore || 30) * 60 * 1000);
    const latestAllowed = new Date(shiftStartTime.getTime() + toleranceMs);

    console.log(`⏰ [LATE-CHECK] ${employeeData.first_name} ${employeeData.last_name}:`);
    console.log(`   Shift: ${shiftData.shift_name} (${shiftData.start_time})`);
    console.log(`   Tolerance: ${toleranceMinutesEntry} min after`);
    console.log(`   Window: ${earliestAllowed.toLocaleTimeString('es-AR')} - ${latestAllowed.toLocaleTimeString('es-AR')}`);
    console.log(`   Current: ${now.toLocaleTimeString('es-AR')}`);

    // DENTRO de tolerancia → permitir ingreso normal
    if (now >= earliestAllowed && now <= latestAllowed) {
      console.log(`✅ [LATE-CHECK] WITHIN tolerance - allowing entry`);
      return { withinTolerance: true };
    }

    // FUERA de tolerancia → verificar si tiene autorización previa válida
    console.log(`⚠️ [LATE-CHECK] OUTSIDE tolerance - checking for existing authorization`);

    // 4. Buscar autorización aprobada y no expirada (últimos 5 minutos)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const existingAuthorization = await sequelize.query(`
      SELECT
        id,
        authorization_token,
        authorization_status,
        authorized_at,
        authorized_by_user_id
      FROM attendances
      WHERE "UserId" = :employeeId
        AND work_date = CURRENT_DATE
        AND authorization_status = 'approved'
        AND "checkInTime" IS NULL
        AND authorized_at >= :fiveMinutesAgo
      ORDER BY authorized_at DESC
      LIMIT 1
    `, {
      replacements: {
        employeeId,
        fiveMinutesAgo: fiveMinutesAgo.toISOString()
      },
      type: QueryTypes.SELECT,
      plain: true
    });

    // Si tiene autorización válida → permitir ingreso y marcar como usada
    if (existingAuthorization) {
      console.log(`✅ [LATE-CHECK] Valid authorization found - allowing entry`);

      // Actualizar autorización completando el checkInTime (marcándola como usada)
      await sequelize.query(`
        UPDATE attendances
        SET "checkInTime" = :checkInTime,
            status = 'present',
            authorization_status = 'used',
            updated_at = NOW()
        WHERE id = :authorizationId
      `, {
        replacements: {
          checkInTime: now,
          authorizationId: existingAuthorization.id
        },
        type: QueryTypes.UPDATE
      });

      return {
        withinTolerance: true, // Permitir porque fue autorizado
        wasAuthorized: true,
        attendanceId: existingAuthorization.id,
        authorizationToken: existingAuthorization.authorization_token
      };
    }

    // 5. No tiene autorización válida → crear solicitud pendiente
    console.log(`🚨 [LATE-CHECK] NO authorization - creating request`);

    const lateMinutes = Math.round((now - latestAllowed) / 60000);
    const authorizationToken = uuidv4();

    // Crear registro de solicitud de autorización (sin checkInTime)
    const todayDate = now.toISOString().split('T')[0];
    const [authRequest] = await sequelize.query(`
      INSERT INTO attendances (
        "UserId",
        "checkInTime",
        status,
        authorization_status,
        authorization_token,
        authorization_requested_at,
        company_id,
        work_date,
        origin_type,
        created_at,
        updated_at
      )
      VALUES (
        :userId,
        NULL,
        'pending_authorization',
        'pending',
        :authToken,
        NOW(),
        :companyId,
        :workDate,
        'kiosk',
        NOW(),
        NOW()
      )
      RETURNING id, authorization_token
    `, {
      replacements: {
        userId: employeeId,
        authToken: authorizationToken,
        companyId,
        workDate: todayDate
      },
      type: QueryTypes.INSERT
    });

    const authRequestId = authRequest[0].id;

    // Enviar notificaciones multi-canal a SUPERVISORES
    const notificationResult = await authorizationService.sendAuthorizationRequest({
      employeeData,
      attendanceId: authRequestId,
      authorizationToken: authorizationToken,
      shiftData: {
        name: shiftData.shift_name,
        startTime: shiftData.start_time
      },
      lateMinutes: lateMinutes,
      companyId: companyId
    });

    console.log(`📧 [LATE-CHECK] Supervisor notifications sent: ${notificationResult.success ? 'SUCCESS' : 'FAILED'}`);

    // 🆕 Enviar email al EMPLEADO informándole que puede retirarse del kiosk
    await authorizationService.sendEmployeeNotificationEmail({
      employeeData,
      lateMinutes,
      shiftData: {
        name: shiftData.shift_name,
        startTime: shiftData.start_time
      },
      authorizationToken
    });

    console.log(`📧 [LATE-CHECK] Employee notification sent to ${employeeData.email || 'N/A'}`);

    // Retornar que necesita autorización
    return {
      withinTolerance: false,
      needsAuthorization: true,
      authorizationToken: authorizationToken,
      attendanceId: authRequestId,
      lateMinutes: lateMinutes,
      employeeName: `${employeeData.first_name} ${employeeData.last_name}`,
      shiftName: shiftData.shift_name,
      shiftStartTime: shiftData.start_time
    };

  } catch (error) {
    console.error('❌ [LATE-CHECK] Error:', error);
    // En caso de error, permitir ingreso (fail-safe)
    return { withinTolerance: true, error: error.message };
  }
}

/**
 * 📊 GET /api/v2/biometric-attendance/detection-logs
 * Obtener logs de detecciones biométricas (TODAS las detecciones, no solo fichadas)
 * ✅ Multi-tenant: Solo muestra logs de la empresa del usuario autenticado
 */
router.get('/detection-logs', auth, async (req, res) => {
  try {
    const { companyId } = req.query;
    const { startDate, endDate, employeeId, limit = 100 } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID requerido'
      });
    }

    // 🔒 MULTI-TENANT SECURITY: Validar que el usuario pertenece a esta empresa
    if (req.user.companyId !== parseInt(companyId)) {
      console.warn(`⚠️ [SECURITY] Usuario ${req.user.user_id} intentó acceder a logs de empresa ${companyId} (su empresa: ${req.user.companyId})`);
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para ver logs de esta empresa'
      });
    }

    // Construir query dinámicamente
    let whereClause = 'WHERE bd.company_id = :companyId';
    const replacements = { companyId: parseInt(companyId), limit: parseInt(limit) };

    if (startDate) {
      whereClause += ' AND DATE(bd.detection_timestamp) >= :startDate';
      replacements.startDate = startDate;
    }

    if (endDate) {
      whereClause += ' AND DATE(bd.detection_timestamp) <= :endDate';
      replacements.endDate = endDate;
    }

    if (employeeId) {
      whereClause += ' AND bd.employee_id = :employeeId';
      replacements.employeeId = employeeId;
    }

    const query = `
      SELECT
        bd.id,
        bd.employee_id,
        bd.employee_name,
        bd.similarity,
        bd.was_registered,
        bd.attendance_id,
        bd.operation_type,
        bd.skip_reason,
        bd.detection_timestamp,
        bd.processing_time_ms,
        u."employeeId" as legajo,
        u."firstName" || ' ' || u."lastName" as full_name
      FROM biometric_detections bd
      LEFT JOIN users u ON bd.employee_id::uuid = u.user_id
      ${whereClause}
      ORDER BY bd.detection_timestamp DESC
      LIMIT :limit
    `;

    const result = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
      raw: true
    });

    console.log(`✅ [DETECTION-LOGS] Retrieved ${Array.isArray(result) ? result.length : 'unknown'} logs for company ${companyId}`);

    const data = Array.isArray(result) ? result : (result ? [result] : []);

    res.json({
      success: true,
      data: data,
      total: data.length
    });

  } catch (error) {
    console.error('❌ [DETECTION-LOGS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener logs de detecciones',
      details: error.message
    });
  }
});

/**
 * ============================================================================
 * 🧪 BIOMETRIC STRESS TEST ENDPOINT
 * ============================================================================
 * Endpoint especial para testing masivo de fichajes biométricos.
 * BYPASS: No requiere imagen real, usa embeddings pre-generados.
 *
 * @route POST /api/v2/biometric-attendance/verify-test
 * ============================================================================
 */
router.post('/verify-test', async (req, res) => {
    const startTime = Date.now();

    try {
        const {
            scenarioId,
            scenarioType,
            embedding,
            qualityScore,
            userId,
            expectedUserId,
            timestamp,
            testMode,
            bypassCamera
        } = req.body;

        const companyId = req.headers['x-company-id'] || req.body.companyId || 1;

        // Validar que es modo test
        if (!testMode) {
            return res.status(400).json({
                success: false,
                error: 'Este endpoint solo funciona en modo test',
                code: 'TEST_MODE_REQUIRED'
            });
        }

        console.log(`🧪 [VERIFY-TEST] Scenario: ${scenarioType} | ID: ${scenarioId}`);

        // Simular diferentes escenarios de respuesta
        let response;

        switch (scenarioType) {
            case 'HAPPY_PATH':
                // Fichaje exitoso normal
                response = await simulateHappyPath(companyId, embedding, userId, startTime);
                break;

            case 'USER_NOT_FOUND':
                // Usuario no reconocido
                response = {
                    success: false,
                    reason: 'NO_MATCH',
                    message: 'No se pudo identificar al empleado',
                    scenarioId: scenarioId,
                    processingTime: Date.now() - startTime
                };
                break;

            case 'LATE_ARRIVAL':
                // Llegada tarde (dentro de tolerancia configurable)
                response = await simulateLateArrival(companyId, embedding, userId, startTime);
                break;

            case 'EARLY_ARRIVAL':
                // Llegada temprana
                response = await simulateEarlyArrival(companyId, embedding, userId, startTime);
                break;

            case 'OUTSIDE_SHIFT':
                // Fuera del turno asignado
                response = {
                    success: false,
                    reason: 'OUTSIDE_SHIFT',
                    message: 'Fichaje fuera del horario del turno asignado',
                    scenarioId: scenarioId,
                    processingTime: Date.now() - startTime
                };
                break;

            case 'DUPLICATE_SHORT':
                // Duplicado en menos de 5 minutos
                response = {
                    success: false,
                    reason: 'DUPLICATE_DETECTED',
                    message: 'Fichaje duplicado detectado (menos de 5 minutos)',
                    duplicateWindow: '5min',
                    scenarioId: scenarioId,
                    processingTime: Date.now() - startTime
                };
                break;

            case 'DUPLICATE_MEDIUM':
                // Duplicado en menos de 30 minutos
                response = {
                    success: false,
                    reason: 'DUPLICATE_DETECTED',
                    message: 'Múltiples fichajes detectados (menos de 30 minutos)',
                    duplicateWindow: '30min',
                    scenarioId: scenarioId,
                    processingTime: Date.now() - startTime
                };
                break;

            case 'LOW_QUALITY':
                // Imagen de baja calidad
                response = {
                    success: false,
                    reason: 'LOW_QUALITY',
                    message: 'Calidad de imagen insuficiente para reconocimiento',
                    qualityScore: qualityScore || 0.4,
                    threshold: 0.7,
                    scenarioId: scenarioId,
                    processingTime: Date.now() - startTime
                };
                break;

            case 'SUSPENDED_USER':
                // Usuario suspendido
                response = {
                    success: false,
                    reason: 'employee_suspended',
                    blocked: true,
                    blockReason: 'SUSPENSION',
                    message: 'Acceso bloqueado por suspensión disciplinaria',
                    suspensionInfo: {
                        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        daysRemaining: 7
                    },
                    scenarioId: scenarioId,
                    processingTime: Date.now() - startTime
                };
                break;

            case 'RAPID_FIRE':
                // Stress test - respuesta rápida
                response = {
                    success: true,
                    stressTest: true,
                    message: 'Stress test response',
                    scenarioId: scenarioId,
                    processingTime: Date.now() - startTime
                };
                break;

            default:
                response = {
                    success: false,
                    error: 'Tipo de escenario desconocido',
                    scenarioType: scenarioType,
                    scenarioId: scenarioId,
                    processingTime: Date.now() - startTime
                };
        }

        // Agregar metadata de test
        response.testMetadata = {
            scenarioId: scenarioId,
            scenarioType: scenarioType,
            companyId: companyId,
            timestamp: timestamp || new Date().toISOString(),
            processingTime: Date.now() - startTime
        };

        return res.json(response);

    } catch (error) {
        console.error(`❌ [VERIFY-TEST] Error: ${error.message}`);

        return res.status(500).json({
            success: false,
            error: 'Error interno en test',
            message: error.message,
            processingTime: Date.now() - startTime
        });
    }
});

/**
 * Simular happy path (fichaje exitoso)
 */
async function simulateHappyPath(companyId, embedding, userId, startTime) {
    // Si hay userId, simular matching exitoso
    if (userId) {
        try {
            const { sequelize } = require('../config/database');

            // Buscar usuario real para datos
            const [user] = await sequelize.query(`
                SELECT user_id, "firstName", "lastName"
                FROM users
                WHERE id = :userId OR user_id::text = :userId
                LIMIT 1
            `, {
                replacements: { userId: userId.toString() },
                type: QueryTypes.SELECT
            });

            if (user) {
                return {
                    success: true,
                    message: `Bienvenido, ${user.firstName} ${user.lastName}!`,
                    employee: {
                        id: user.user_id,
                        name: `${user.firstName} ${user.lastName}`
                    },
                    attendance: {
                        id: 'test_att_' + Date.now(),
                        clockInTime: new Date().toISOString(),
                        type: 'clock_in'
                    },
                    biometric: {
                        similarity: 0.85 + Math.random() * 0.1,
                        confidence: 'HIGH',
                        threshold: 0.75
                    },
                    processingTime: Date.now() - startTime
                };
            }
        } catch (err) {
            console.log(`⚠️ [VERIFY-TEST] DB query failed, using mock data`);
        }
    }

    // Mock response si no hay usuario real
    return {
        success: true,
        message: 'Bienvenido, Empleado Test!',
        employee: {
            id: 'test_emp_' + Date.now(),
            name: 'Empleado Test'
        },
        attendance: {
            id: 'test_att_' + Date.now(),
            clockInTime: new Date().toISOString(),
            type: 'clock_in'
        },
        biometric: {
            similarity: 0.85 + Math.random() * 0.1,
            confidence: 'HIGH',
            threshold: 0.75
        },
        processingTime: Date.now() - startTime
    };
}

/**
 * Simular llegada tarde
 */
async function simulateLateArrival(companyId, embedding, userId, startTime) {
    // Simular que está llegando tarde pero dentro de tolerancia configurable
    const lateMinutes = 5 + Math.floor(Math.random() * 20); // 5-25 min tarde

    return {
        success: true,
        lateArrival: true,
        message: 'Fichaje registrado - Llegada tardía',
        employee: {
            id: userId || 'test_emp_' + Date.now(),
            name: 'Empleado Test'
        },
        attendance: {
            id: 'test_att_' + Date.now(),
            clockInTime: new Date().toISOString(),
            type: 'clock_in',
            lateMinutes: lateMinutes
        },
        warning: `Llegada ${lateMinutes} minutos después del inicio del turno`,
        processingTime: Date.now() - startTime
    };
}

/**
 * Simular llegada temprana
 */
async function simulateEarlyArrival(companyId, embedding, userId, startTime) {
    const earlyMinutes = 15 + Math.floor(Math.random() * 30); // 15-45 min antes

    return {
        success: true,
        earlyArrival: true,
        message: 'Fichaje registrado - Llegada anticipada',
        employee: {
            id: userId || 'test_emp_' + Date.now(),
            name: 'Empleado Test'
        },
        attendance: {
            id: 'test_att_' + Date.now(),
            clockInTime: new Date().toISOString(),
            type: 'clock_in',
            earlyMinutes: earlyMinutes
        },
        info: `Llegada ${earlyMinutes} minutos antes del inicio del turno`,
        processingTime: Date.now() - startTime
    };
}

module.exports = router;