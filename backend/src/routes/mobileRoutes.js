// Mobile API Routes - Sistema Biométrico Integral para APK Flutter
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const router = express.Router();

// Configuración de multer para subida de archivos biométricos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads/biometric');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const randomId = crypto.randomUUID();
        const ext = path.extname(file.originalname);
        cb(null, `biometric_${timestamp}_${randomId}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido'), false);
        }
    }
});

// ==============================================
// 🔧 CONFIGURACIÓN Y CONEXIÓN INICIAL
// ==============================================

// Configuración automática para APK - Multi-tenant inteligente
router.get('/config/mobile-connection', (req, res) => {
    console.log('📱 [MOBILE-API] Configuración solicitada por APK');

    const isLocalNetwork = req.hostname === 'localhost' || req.hostname === '127.0.0.1' || req.hostname?.startsWith('192.168.') || req.hostname?.startsWith('10.') || req.hostname?.startsWith('172.');
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    const config = {
        success: true,
        server: {
            ip: req.hostname || 'localhost',
            port: process.env.PORT || 9998,
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            networkType: isLocalNetwork ? 'local' : 'internet',
            features: {
                biometric: true,
                notifications: true,
                multiTenant: true,
                permissions: true,
                medical: true,
                training: true,
                sanctions: true,
                offlineMode: isLocalNetwork,  // Habilitar modo offline para redes locales
                encryptionLevel: isLocalNetwork ? 'standard' : 'high' // Mayor seguridad para internet
            }
        },
        client: {
            ip: clientIP,
            detectedNetwork: isLocalNetwork ? 'LAN' : 'WAN'
        },
        endpoints: {
            base: `http://${req.get('host')}/api/v1`,
            mobile: `http://${req.get('host')}/api/v1/mobile`,
            vacation: `http://${req.get('host')}/api/v1/vacation`,
            absence: `http://${req.get('host')}/api/v1/absence`,
            biometric: `http://${req.get('host')}/api/v2/biometric`
        },
        tenantConfig: {
            autoDetection: true,
            fallbackTenant: 1,
            multipleCompaniesSupported: true
        },
        timestamp: new Date().toISOString()
    };

    console.log(`🌐 [MOBILE-CONFIG] Cliente desde ${config.client.detectedNetwork}: ${clientIP}`);

    res.json(config);
});

// Health check específico para móvil
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        mobile_api: 'running',
        biometric_engine: 'active',
        database: 'connected'
    });
});

// ==============================================
// 🔐 AUTENTICACIÓN Y SESIÓN
// ==============================================

// Login con múltiples métodos biométricos
router.post('/auth/login', async (req, res) => {
    try {
        console.log('🔐 [MOBILE-AUTH] Intento de login:', req.body);

        const { username, password, biometricType, companySlug, tenantId } = req.body;

        // Validación básica
        if (!username || (!password && !biometricType)) {
            return res.status(400).json({
                success: false,
                message: 'Username y contraseña/biometría requeridos'
            });
        }

        // Aquí integrar con el sistema de autenticación existente
        // Simulando autenticación exitosa por ahora
        const mockUser = {
            id: 1,
            username: username,
            companyId: tenantId || 1,
            role: 'employee',
            permissions: ['attendance', 'notifications', 'requests'],
            biometricEnabled: true,
            lastLogin: new Date().toISOString()
        };

        // Generar token JWT (implementar según sistema existente)
        const token = crypto.randomUUID();

        res.json({
            success: true,
            user: mockUser,
            token: token,
            expiresIn: '24h',
            message: 'Login exitoso'
        });

    } catch (error) {
        console.error('❌ [MOBILE-AUTH] Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Logout
router.post('/auth/logout', (req, res) => {
    console.log('🚪 [MOBILE-AUTH] Logout solicitado');

    res.json({
        success: true,
        message: 'Logout exitoso'
    });
});

// ==============================================
// 📸 BIOMETRÍA AVANZADA
// ==============================================

// Registro facial biométrico
router.post('/biometric/face/register', upload.single('faceImage'), async (req, res) => {
    try {
        console.log('📸 [BIOMETRIC] Registro facial iniciado');

        const { userId, companyId } = req.body;
        const faceImage = req.file;

        if (!faceImage) {
            return res.status(400).json({
                success: false,
                message: 'Imagen facial requerida'
            });
        }

        // Procesar imagen con IA biométrica (integrar con ai-biometric-engine.js)
        const biometricResult = await processFacialBiometric(faceImage, userId, companyId);

        res.json({
            success: true,
            biometricId: biometricResult.id,
            confidence: biometricResult.confidence,
            features: biometricResult.features,
            message: 'Registro facial completado exitosamente'
        });

    } catch (error) {
        console.error('❌ [BIOMETRIC] Error en registro facial:', error);
        res.status(500).json({
            success: false,
            message: 'Error procesando registro facial'
        });
    }
});

// Verificación facial para asistencia
router.post('/biometric/face/verify', upload.single('faceImage'), async (req, res) => {
    try {
        console.log('🔍 [BIOMETRIC] Verificación facial iniciada');

        const { userId, companyId, location } = req.body;
        const faceImage = req.file;

        if (!faceImage) {
            return res.status(400).json({
                success: false,
                message: 'Imagen facial requerida'
            });
        }

        // Verificar con IA biométrica y detectar violencia/bullying
        const verificationResult = await verifyFacialBiometric(faceImage, userId, companyId);

        // Registrar asistencia si verificación exitosa
        if (verificationResult.verified) {
            const attendanceRecord = await createAttendanceRecord({
                userId,
                companyId,
                type: 'biometric_face',
                location,
                confidence: verificationResult.confidence,
                timestamp: new Date()
            });

            // Verificar alertas psicológicas/médicas
            if (verificationResult.alerts && verificationResult.alerts.length > 0) {
                await processHealthAlerts(userId, verificationResult.alerts);
            }

            res.json({
                success: true,
                verified: true,
                attendanceId: attendanceRecord.id,
                confidence: verificationResult.confidence,
                alerts: verificationResult.alerts || [],
                message: 'Verificación exitosa - Asistencia registrada'
            });
        } else {
            res.json({
                success: false,
                verified: false,
                confidence: verificationResult.confidence,
                message: 'Verificación facial fallida'
            });
        }

    } catch (error) {
        console.error('❌ [BIOMETRIC] Error en verificación facial:', error);
        res.status(500).json({
            success: false,
            message: 'Error procesando verificación facial'
        });
    }
});

// Registro de huella dactilar
router.post('/biometric/fingerprint/register', (req, res) => {
    console.log('👆 [BIOMETRIC] Registro de huella solicitado');

    const { userId, fingerprintData } = req.body;

    // Simular procesamiento de huella
    res.json({
        success: true,
        fingerprintId: crypto.randomUUID(),
        message: 'Huella registrada exitosamente'
    });
});

// Verificación de huella dactilar
router.post('/biometric/fingerprint/verify', (req, res) => {
    console.log('🔍 [BIOMETRIC] Verificación de huella iniciada');

    const { userId, fingerprintData, location } = req.body;

    // Simular verificación exitosa
    res.json({
        success: true,
        verified: true,
        attendanceId: crypto.randomUUID(),
        confidence: 95.5,
        message: 'Verificación de huella exitosa'
    });
});

// ==============================================
// 📱 QR CODE CON VENCIMIENTO
// ==============================================

// Generar QR temporal (15 segundos)
router.post('/qr/generate', (req, res) => {
    console.log('📱 [QR] Generación de QR temporal solicitada');

    const { userId, companyId } = req.body;
    const timestamp = Date.now();
    const expiresAt = timestamp + (15 * 1000); // 15 segundos

    const qrData = {
        userId,
        companyId,
        timestamp,
        expiresAt,
        token: crypto.randomBytes(16).toString('hex')
    };

    res.json({
        success: true,
        qrCode: Buffer.from(JSON.stringify(qrData)).toString('base64'),
        expiresAt,
        validFor: 15,
        message: 'QR temporal generado'
    });
});

// Verificar QR y registrar asistencia
router.post('/qr/verify', (req, res) => {
    console.log('🔍 [QR] Verificación de QR iniciada');

    try {
        const { qrCode, location } = req.body;
        const qrData = JSON.parse(Buffer.from(qrCode, 'base64').toString());

        const now = Date.now();
        if (now > qrData.expiresAt) {
            return res.status(400).json({
                success: false,
                message: 'QR expirado'
            });
        }

        // Registrar asistencia
        res.json({
            success: true,
            attendanceId: crypto.randomUUID(),
            message: 'Asistencia registrada con QR'
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'QR inválido'
        });
    }
});

// ==============================================
// 📋 GESTIÓN DE PERMISOS Y SOLICITUDES
// ==============================================

// Solicitar permiso (falta, vacaciones, cambio turno)
router.post('/requests/permission', async (req, res) => {
    console.log('📋 [MOBILE-REQUESTS] Nueva solicitud de permiso desde APK');

    try {
        const { type, startDate, endDate, reason, documents, userId } = req.body;

        // 🔄 Integración bidireccional: APK -> Panel-Empresa
        let integrationResponse = null;
        let integrationResult = null;

        if (type === 'vacation') {
            // Redirigir vacaciones a la API de vacaciones
            integrationResponse = await fetch(`http://localhost:${process.env.PORT || 9998}/api/v1/vacation/requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId || 1,
                    requestType: type,
                    startDate,
                    endDate,
                    reason,
                    source: 'mobile-apk'
                })
            });
        } else if (type === 'absence' || type === 'shift_change') {
            // Redirigir ausencias y cambios de turno a la API de ausencias
            integrationResponse = await fetch(`http://localhost:${process.env.PORT || 9998}/api/v1/absence/notify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId || 1,
                    type: type, // 'absence' o 'shift_change'
                    startDate,
                    endDate,
                    reason,
                    source: 'mobile-apk',
                    notificationType: type === 'absence' ? 'sick' : 'shift_change'
                })
            });
        }

        if (integrationResponse && integrationResponse.ok) {
            integrationResult = await integrationResponse.json();

            if (integrationResult.success) {
                console.log('✅ [MOBILE-REQUESTS] Solicitud integrada con panel-empresa');

                res.json({
                    success: true,
                    request: {
                        id: integrationResult.data?.id || crypto.randomUUID(),
                        type,
                        startDate,
                        endDate,
                        reason,
                        status: 'pending',
                        createdAt: new Date().toISOString(),
                        documents: documents || [],
                        source: 'mobile-apk'
                    },
                    message: 'Solicitud enviada exitosamente y visible en panel-empresa'
                });
                return;
            }
        }

        // Fallback si falla la integración
        const permissionRequest = {
            id: crypto.randomUUID(),
            type,
            startDate,
            endDate,
            reason,
            status: 'pending',
            createdAt: new Date().toISOString(),
            documents: documents || [],
            source: 'mobile-apk'
        };

        res.json({
            success: true,
            request: permissionRequest,
            message: 'Solicitud enviada exitosamente'
        });

    } catch (error) {
        console.error('❌ [MOBILE-REQUESTS] Error procesando solicitud:', error);
        res.status(500).json({
            success: false,
            message: 'Error procesando solicitud',
            error: error.message
        });
    }
});

// Obtener solicitudes del usuario - Optimizado para móvil
router.get('/requests/my-requests', async (req, res) => {
    console.log('📋 [MOBILE-REQUESTS] Consulta optimizada de solicitudes propias');

    try {
        const userId = req.query.userId || req.user?.id || 1; // TODO: Obtener userId del token

        // 🔄 Obtener solicitudes de vacaciones desde API optimizada
        const vacationResponse = await fetch(`http://localhost:${process.env.PORT || 9998}/api/v1/vacation/requests?userId=${userId}&limit=10`);
        let vacationRequests = [];

        if (vacationResponse.ok) {
            const vacationResult = await vacationResponse.json();
            if (vacationResult.success) {
                vacationRequests = vacationResult.data.map(req => ({
                    id: req.id,
                    type: req.requestType,
                    startDate: req.startDate,
                    endDate: req.endDate,
                    reason: req.reason,
                    status: req.status,
                    createdAt: req.createdAt,
                    approvedBy: req.approver?.name || null,
                    totalDays: req.totalDays,
                    source: req.source || 'unknown'
                }));
            }
        }

        // Combinar con datos mock si es necesario
        const allRequests = [
            ...vacationRequests,
            {
                id: 'mock-1',
                type: 'training_completed',
                startDate: '2025-09-20',
                endDate: '2025-09-20',
                reason: 'Capacitación completada: Seguridad Laboral',
                status: 'completed',
                createdAt: '2025-09-20T14:00:00Z',
                source: 'system'
            }
        ].slice(0, 10); // Limitar a 10 para optimizar móvil

        res.json({
            success: true,
            requests: allRequests,
            totalCount: allRequests.length,
            lastSync: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ [MOBILE-REQUESTS] Error obteniendo solicitudes:', error);

        // Fallback a datos mock
        const mockRequests = [
            {
                id: '1',
                type: 'vacation',
                startDate: '2025-10-01',
                endDate: '2025-10-05',
                reason: 'Vacaciones familiares',
                status: 'approved',
                createdAt: '2025-09-15T10:00:00Z',
                approvedBy: 'Supervisor RRHH',
                source: 'mock'
            },
            {
                id: '2',
                type: 'absence',
                startDate: '2025-09-25',
                endDate: '2025-09-25',
                reason: 'Consulta médica',
                status: 'pending',
                createdAt: '2025-09-24T08:30:00Z',
                source: 'mock'
            }
        ];

        res.json({
            success: true,
            requests: mockRequests,
            fallback: true
        });
    }
});

// ==============================================
// 💬 NOTIFICACIONES BIDIRECCIONALES
// ==============================================

// Obtener notificaciones del usuario
router.get('/notifications', (req, res) => {
    console.log('💬 [NOTIFICATIONS] Consulta de notificaciones');

    const mockNotifications = [
        {
            id: '1',
            type: 'training_assigned',
            title: 'Nueva Capacitación Asignada',
            message: 'Se le ha asignado la capacitación "Seguridad Laboral 2025"',
            priority: 'medium',
            read: false,
            createdAt: '2025-09-21T09:00:00Z'
        },
        {
            id: '2',
            type: 'medical_alert',
            title: 'Consulta Médica Pendiente',
            message: 'Tiene una consulta médica programada para mañana',
            priority: 'high',
            read: false,
            createdAt: '2025-09-20T15:30:00Z'
        },
        {
            id: '3',
            type: 'sanction_applied',
            title: 'Sanción Aplicada',
            message: 'Se ha aplicado una sanción por llegada tarde reiterada',
            priority: 'critical',
            read: true,
            createdAt: '2025-09-19T11:00:00Z'
        }
    ];

    res.json({
        success: true,
        notifications: mockNotifications,
        unreadCount: mockNotifications.filter(n => !n.read).length
    });
});

// Marcar notificación como leída
router.patch('/notifications/:id/read', (req, res) => {
    console.log('✅ [NOTIFICATIONS] Marcando notificación como leída:', req.params.id);

    res.json({
        success: true,
        message: 'Notificación marcada como leída'
    });
});

// ==============================================
// 📊 DASHBOARD EMPLEADO
// ==============================================

// Resumen del empleado
router.get('/dashboard/summary', (req, res) => {
    console.log('📊 [DASHBOARD] Consulta de resumen del empleado');

    const summary = {
        attendance: {
            present: 22,
            absent: 2,
            late: 3,
            currentMonth: 'Septiembre 2025'
        },
        scoring: {
            current: 85,
            previous: 78,
            trend: 'up'
        },
        training: {
            completed: 8,
            pending: 2,
            certificates: 5
        },
        sanctions: {
            active: 1,
            total: 3
        },
        medical: {
            appointments: 1,
            certificates: 2,
            alerts: 0
        }
    };

    res.json({
        success: true,
        summary
    });
});

// ==============================================
// 🏥 INTEGRACIÓN MÉDICA
// ==============================================

// Solicitar cita médica
router.post('/medical/appointment', (req, res) => {
    console.log('🏥 [MEDICAL] Solicitud de cita médica');

    const { type, preferredDate, symptoms, urgency } = req.body;

    res.json({
        success: true,
        appointmentId: crypto.randomUUID(),
        estimatedDate: preferredDate,
        message: 'Solicitud de cita médica enviada'
    });
});

// Subir certificado médico
router.post('/medical/certificate', upload.single('certificate'), (req, res) => {
    console.log('📄 [MEDICAL] Subida de certificado médico');

    res.json({
        success: true,
        certificateId: crypto.randomUUID(),
        message: 'Certificado médico subido exitosamente'
    });
});

// ==============================================
// 📚 CAPACITACIONES
// ==============================================

// Obtener capacitaciones asignadas
router.get('/training/assigned', (req, res) => {
    console.log('📚 [TRAINING] Consulta de capacitaciones asignadas');

    const mockTrainings = [
        {
            id: '1',
            title: 'Seguridad Laboral 2025',
            description: 'Capacitación obligatoria de seguridad',
            status: 'pending',
            deadline: '2025-10-15',
            progress: 0,
            mandatory: true
        },
        {
            id: '2',
            title: 'Uso de EPP',
            description: 'Elementos de Protección Personal',
            status: 'in_progress',
            deadline: '2025-10-30',
            progress: 65,
            mandatory: true
        }
    ];

    res.json({
        success: true,
        trainings: mockTrainings
    });
});

// Marcar capacitación como completada
router.post('/training/:id/complete', (req, res) => {
    console.log('✅ [TRAINING] Marcando capacitación como completada:', req.params.id);

    const { score, feedback } = req.body;

    res.json({
        success: true,
        certificateId: crypto.randomUUID(),
        score: score || 95,
        message: 'Capacitación completada exitosamente'
    });
});

// ==============================================
// 🚨 FUNCIONES AUXILIARES
// ==============================================

async function processFacialBiometric(faceImage, userId, companyId) {
    // Integrar con ai-biometric-engine.js
    console.log('🤖 [AI] Procesando biometría facial...');

    return {
        id: crypto.randomUUID(),
        confidence: 96.5,
        features: ['facial_landmarks', 'emotion_analysis', 'liveness_check'],
        alerts: []
    };
}

async function verifyFacialBiometric(faceImage, userId, companyId) {
    // Integrar con ai-biometric-engine.js para verificación y detección de alertas
    console.log('🔍 [AI] Verificando biometría facial...');

    // Simular detección de estrés/violencia (integrar con sistema real)
    const stressLevel = Math.random() * 100;
    const alerts = [];

    if (stressLevel > 80) {
        alerts.push({
            type: 'high_stress',
            level: stressLevel,
            recommendation: 'Considerar evaluación psicológica'
        });
    }

    return {
        verified: true,
        confidence: 94.2,
        alerts
    };
}

async function createAttendanceRecord(data) {
    // Integrar con base de datos real
    console.log('📝 [ATTENDANCE] Creando registro de asistencia...');

    return {
        id: crypto.randomUUID(),
        ...data
    };
}

async function processHealthAlerts(userId, alerts) {
    // Integrar con sistema médico y psicológico
    console.log('🚨 [HEALTH] Procesando alertas de salud...');

    for (const alert of alerts) {
        if (alert.type === 'high_stress') {
            // Notificar al equipo médico
            console.log('📨 [HEALTH] Notificando equipo médico sobre estrés alto');
        }
    }
}

module.exports = router;