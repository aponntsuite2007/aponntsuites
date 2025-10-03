/**
 * 🏢 KIOSKO ENTERPRISE ROUTES
 * ============================
 * API endpoints optimizados para alto flujo empresarial
 * - Detección facial continua con Face-API.js real
 * - WebSocket para comunicación en tiempo real
 * - Multi-tenant con aislamiento por empresa
 * - Optimizado para 500+ empleados simultáneos
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { faceAPIEngine } = require('../services/face-api-backend-engine');
const { sequelize, User, Attendance, BiometricTemplate } = require('../config/database');
const companyIsolationMiddleware = require('../middleware/company-isolation');

// Configurar multer para imágenes en memoria
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB máximo
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido. Solo JPEG/PNG.'), false);
        }
    }
});

/**
 * 🎯 DETECTAR EMPLEADO POR ROSTRO - ENTERPRISE
 * Endpoint optimizado para detección continua
 */
router.post('/detect-employee', companyIsolationMiddleware, async (req, res) => {
    const startTime = Date.now();

    try {
        console.log('🎯 [KIOSK-ENTERPRISE] Iniciando detección de empleado...');

        const { company_id, image, threshold = 0.7, kiosk_id } = req.body;

        // Validar datos requeridos
        if (!company_id || !image) {
            return res.status(400).json({
                success: false,
                error: 'company_id e image son requeridos'
            });
        }

        // Convertir imagen base64 a buffer
        const imageBuffer = Buffer.from(image, 'base64');

        // Procesar imagen con Face-API.js real
        const faceProcessingResult = await faceAPIEngine.processFaceImage(imageBuffer, {
            company_id: company_id,
            threshold: threshold
        });

        if (!faceProcessingResult.success) {
            return res.json({
                success: false,
                detected: false,
                error: 'No se detectó rostro válido',
                processing_time: Date.now() - startTime
            });
        }

        // Buscar empleado en la base de datos (multi-tenant)
        const matchResult = await findEmployeeByFaceEmbedding(
            faceProcessingResult.embedding,
            company_id,
            threshold
        );

        const processingTime = Date.now() - startTime;

        if (matchResult.found) {
            // Empleado encontrado
            console.log(`✅ [KIOSK-ENTERPRISE] Empleado reconocido: ${matchResult.employee.firstName} ${matchResult.employee.lastName} (${(matchResult.confidence * 100).toFixed(1)}%)`);

            return res.json({
                success: true,
                detected: true,
                employee_id: matchResult.employee.id,
                employee_name: `${matchResult.employee.firstName} ${matchResult.employee.lastName}`,
                employee_legajo: matchResult.employee.legajo,
                confidence: matchResult.confidence,
                processing_time: processingTime,
                algorithm: faceProcessingResult.algorithm,
                quality_score: faceProcessingResult.qualityScore,
                kiosk_id: kiosk_id
            });

        } else {
            // Empleado no reconocido
            console.log(`❌ [KIOSK-ENTERPRISE] Empleado no reconocido en empresa ${company_id}`);

            return res.json({
                success: true,
                detected: false,
                message: 'Empleado no registrado en el sistema',
                processing_time: processingTime,
                quality_score: faceProcessingResult.qualityScore
            });
        }

    } catch (error) {
        console.error('❌ [KIOSK-ENTERPRISE] Error en detección:', error);

        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message,
            processing_time: Date.now() - startTime
        });
    }
});

/**
 * 📝 REGISTRAR ASISTENCIA DESDE KIOSKO
 * Endpoint optimizado para registro rápido
 */
router.post('/register-attendance', companyIsolationMiddleware, async (req, res) => {
    try {
        console.log('📝 [KIOSK-ENTERPRISE] Registrando asistencia desde kiosko...');

        const {
            employee_id,
            company_id,
            detection_method = 'facial_recognition',
            confidence_score,
            kiosk_id,
            location_data
        } = req.body;

        // Validar datos requeridos
        if (!employee_id || !company_id) {
            return res.status(400).json({
                success: false,
                error: 'employee_id y company_id son requeridos'
            });
        }

        // Verificar que el empleado pertenece a la empresa (multi-tenant)
        const employee = await User.findOne({
            where: {
                id: employee_id,
                companyId: company_id,
                isActive: true
            }
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: 'Empleado no encontrado en la empresa'
            });
        }

        // Verificar si ya marcó hoy (evitar duplicados)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingAttendance = await Attendance.findOne({
            where: {
                employeeId: employee_id,
                date: today
            }
        });

        let attendanceAction = 'entrada';
        if (existingAttendance && !existingAttendance.exitTime) {
            attendanceAction = 'salida';
        }

        // Registrar asistencia
        let attendance;
        if (existingAttendance && attendanceAction === 'salida') {
            // Actualizar con hora de salida
            attendance = await existingAttendance.update({
                exitTime: new Date(),
                exitMethod: detection_method,
                exitConfidence: confidence_score,
                exitKioskId: kiosk_id,
                exitLocationData: location_data
            });
        } else if (!existingAttendance) {
            // Crear nuevo registro de entrada
            attendance = await Attendance.create({
                employeeId: employee_id,
                companyId: company_id,
                date: today,
                entryTime: new Date(),
                entryMethod: detection_method,
                entryConfidence: confidence_score,
                entryKioskId: kiosk_id,
                entryLocationData: location_data,
                status: 'present'
            });
        } else {
            return res.json({
                success: false,
                error: 'Ya existe un registro completo para hoy'
            });
        }

        console.log(`✅ [KIOSK-ENTERPRISE] Asistencia registrada: ${employee.firstName} ${employee.lastName} - ${attendanceAction}`);

        return res.json({
            success: true,
            attendance_id: attendance.id,
            action: attendanceAction,
            employee: {
                id: employee.id,
                name: `${employee.firstName} ${employee.lastName}`,
                legajo: employee.legajo
            },
            timestamp: new Date().toIso8601String()
        });

    } catch (error) {
        console.error('❌ [KIOSK-ENTERPRISE] Error registrando asistencia:', error);

        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

/**
 * 📊 OBTENER ESTADÍSTICAS DEL KIOSKO
 * Para monitoreo de performance
 */
router.get('/stats/:company_id', companyIsolationMiddleware, async (req, res) => {
    try {
        const { company_id } = req.params;
        const { date = new Date().toISOString().split('T')[0] } = req.query;

        // Estadísticas del día
        const today = new Date(date);
        today.setHours(0, 0, 0, 0);

        const stats = await Attendance.findAll({
            where: {
                companyId: company_id,
                date: today
            },
            include: [{
                model: User,
                attributes: ['firstName', 'lastName', 'legajo']
            }]
        });

        const totalEmployees = await User.count({
            where: {
                companyId: company_id,
                isActive: true
            }
        });

        const presentToday = stats.filter(att => att.entryTime).length;
        const exitedToday = stats.filter(att => att.exitTime).length;
        const stillPresent = presentToday - exitedToday;

        return res.json({
            success: true,
            date: date,
            company_id: company_id,
            statistics: {
                total_employees: totalEmployees,
                present_today: presentToday,
                exited_today: exitedToday,
                still_present: stillPresent,
                attendance_rate: totalEmployees > 0 ? (presentToday / totalEmployees * 100).toFixed(1) : 0
            },
            recent_entries: stats.slice(-10).map(att => ({
                employee: `${att.User.firstName} ${att.User.lastName}`,
                legajo: att.User.legajo,
                entry_time: att.entryTime,
                exit_time: att.exitTime,
                method: att.entryMethod
            }))
        });

    } catch (error) {
        console.error('❌ [KIOSK-ENTERPRISE] Error obteniendo estadísticas:', error);
        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

/**
 * ⚙️ CONFIGURAR KIOSKO
 * Configuración inicial del kiosko por empresa
 */
router.post('/configure', companyIsolationMiddleware, async (req, res) => {
    try {
        const {
            company_id,
            kiosk_id,
            kiosk_name,
            location,
            settings = {}
        } = req.body;

        // Configuración por defecto optimizada para enterprise
        const defaultSettings = {
            detection_interval: 500, // 2 FPS
            confidence_threshold: 0.7,
            continuous_mode: true,
            max_daily_attempts: 50,
            timeout_between_detections: 2000, // 2 segundos
            enable_sound: true,
            enable_notifications: true
        };

        const kioskConfig = {
            ...defaultSettings,
            ...settings,
            company_id,
            kiosk_id,
            kiosk_name,
            location,
            configured_at: new Date(),
            status: 'active'
        };

        // Guardar configuración en cache o base de datos
        // Por ahora lo guardamos en memoria (en producción usar Redis)
        global.kioskConfigurations = global.kioskConfigurations || {};
        global.kioskConfigurations[kiosk_id] = kioskConfig;

        console.log(`⚙️ [KIOSK-ENTERPRISE] Kiosko configurado: ${kiosk_id} para empresa ${company_id}`);

        return res.json({
            success: true,
            message: 'Kiosko configurado exitosamente',
            configuration: kioskConfig
        });

    } catch (error) {
        console.error('❌ [KIOSK-ENTERPRISE] Error configurando kiosko:', error);
        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

/**
 * 🔍 BUSCAR EMPLEADO POR EMBEDDING FACIAL
 * Función optimizada para búsqueda rápida multi-tenant
 */
async function findEmployeeByFaceEmbedding(embedding, companyId, threshold = 0.7) {
    try {
        // Obtener todos los empleados de la empresa con templates biométricos
        const employees = await User.findAll({
            where: {
                companyId: companyId,
                isActive: true
            },
            include: [{
                model: BiometricTemplate,
                where: {
                    type: 'facial',
                    isActive: true
                },
                required: true
            }]
        });

        if (employees.length === 0) {
            return { found: false, reason: 'No hay empleados con templates en esta empresa' };
        }

        let bestMatch = null;
        let bestDistance = Infinity;

        // Comparar con cada template usando distancia euclidiana
        for (const employee of employees) {
            for (const template of employee.BiometricTemplates) {
                try {
                    const templateData = JSON.parse(template.templateData);
                    const storedEmbedding = templateData.embedding || templateData.template;

                    if (!storedEmbedding || !Array.isArray(storedEmbedding)) {
                        continue;
                    }

                    // Calcular distancia euclidiana
                    const distance = calculateEuclideanDistance(embedding, storedEmbedding);
                    const confidence = Math.max(0, 1 - distance);

                    if (confidence >= threshold && distance < bestDistance) {
                        bestDistance = distance;
                        bestMatch = {
                            employee,
                            confidence,
                            distance,
                            template_id: template.id
                        };
                    }

                } catch (parseError) {
                    console.warn(`⚠️ [KIOSK-ENTERPRISE] Error parseando template ${template.id}: ${parseError.message}`);
                }
            }
        }

        if (bestMatch) {
            return {
                found: true,
                employee: bestMatch.employee,
                confidence: bestMatch.confidence,
                distance: bestMatch.distance,
                template_id: bestMatch.template_id
            };
        } else {
            return {
                found: false,
                reason: `No se encontró coincidencia con threshold ${threshold}`,
                best_confidence: bestDistance < Infinity ? Math.max(0, 1 - bestDistance) : 0
            };
        }

    } catch (error) {
        console.error('❌ [KIOSK-ENTERPRISE] Error buscando empleado:', error);
        return {
            found: false,
            error: error.message
        };
    }
}

/**
 * 📐 CALCULAR DISTANCIA EUCLIDIANA
 * Función optimizada para comparación de embeddings
 */
function calculateEuclideanDistance(embedding1, embedding2) {
    if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
        return Infinity;
    }

    let sum = 0;
    for (let i = 0; i < embedding1.length; i++) {
        const diff = embedding1[i] - embedding2[i];
        sum += diff * diff;
    }

    return Math.sqrt(sum);
}

/**
 * 🏥 HEALTH CHECK DEL KIOSKO
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'kiosk-enterprise',
        status: 'active',
        timestamp: new Date().toISOString(),
        face_api_initialized: faceAPIEngine.isInitialized,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime()
    });
});

module.exports = router;