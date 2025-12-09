/**
 * ============================================================================
 * MEDICAL CASE ROUTES - Sistema Completo de Gestión Médica
 * ============================================================================
 * Rutas para manejo de inasistencias médicas, comunicación médico-empleado
 * y expedientes médicos completos
 *
 * @version 2.0
 * @date 2025-01-29
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para adjuntos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/medical-documents');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `medical-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes, PDFs y documentos Word'));
        }
    }
});

// ============================================================================
// ENDPOINTS PARA RRHH/EMPLEADOS
// ============================================================================

/**
 * POST /api/medical-cases
 * Crear nueva inasistencia/caso médico
 */
router.post('/', auth, upload.array('attachments', 5), async (req, res) => {
    const db = require('../config/database');

    try {
        const {
            employee_id,
            absence_type,
            start_date,
            end_date,
            requested_days,
            employee_description
        } = req.body;

        const { companyId, user_id } = req.user;

        // Validaciones
        if (!employee_id || !absence_type || !start_date || !requested_days) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos requeridos: employee_id, absence_type, start_date, requested_days'
            });
        }

        // Procesar adjuntos
        const attachments = req.files ? req.files.map(file => ({
            filename: file.originalname,
            url: `/uploads/medical-documents/${file.filename}`,
            type: file.mimetype,
            size: file.size
        })) : [];

        // Crear caso
        const [result] = await db.sequelize.query(`
            INSERT INTO absence_cases (
                company_id,
                employee_id,
                absence_type,
                start_date,
                end_date,
                requested_days,
                employee_description,
                employee_attachments,
                case_status,
                created_by
            ) VALUES (
                :companyId,
                :employee_id,
                :absence_type,
                :start_date,
                :end_date,
                :requested_days,
                :employee_description,
                :employee_attachments::jsonb,
                'pending',
                :created_by
            )
            RETURNING id, case_status, assigned_doctor_id
        `, {
            replacements: {
                companyId,
                employee_id,
                absence_type,
                start_date,
                end_date: end_date || null,
                requested_days: parseInt(requested_days),
                employee_description: employee_description || null,
                employee_attachments: JSON.stringify(attachments),
                created_by: user_id
            },
            type: db.sequelize.QueryTypes.INSERT
        });

        const newCase = result[0];

        // Obtener datos del empleado y médico asignado para respuesta
        const [caseDetails] = await db.sequelize.query(`
            SELECT
                ac.id,
                ac.absence_type,
                ac.start_date,
                ac.case_status,
                ac.assigned_doctor_id,
                u."firstName" || ' ' || u."lastName" as employee_name,
                p.first_name || ' ' || p.last_name as doctor_name
            FROM absence_cases ac
            JOIN users u ON ac.employee_id = u.user_id
            LEFT JOIN partners p ON ac.assigned_doctor_id = p.id
            WHERE ac.id = :caseId
        `, {
            replacements: { caseId: newCase.id },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.status(201).json({
            success: true,
            message: 'Inasistencia registrada exitosamente',
            data: caseDetails[0],
            notification: newCase.assigned_doctor_id ?
                'Se notificó al médico asignado' :
                'En espera de asignación de médico'
        });

    } catch (error) {
        console.error('❌ Error creando caso médico:', error);
        res.status(500).json({
            success: false,
            error: 'Error al registrar inasistencia',
            details: error.message
        });
    }
});

/**
 * GET /api/medical-cases/employee/:employeeId
 * Obtener historial de inasistencias de un empleado
 */
router.get('/employee/:employeeId', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { employeeId } = req.params;
        const { companyId } = req.user;

        const cases = await db.sequelize.query(`
            SELECT
                ac.id,
                ac.absence_type,
                ac.start_date,
                ac.end_date,
                ac.requested_days,
                ac.approved_days,
                ac.case_status,
                ac.is_justified,
                ac.employee_description,
                ac.medical_conclusion,
                ac.created_at,
                ac.case_closed_date,
                p.first_name || ' ' || p.last_name as doctor_name,
                p.specialty,
                (SELECT COUNT(*) FROM medical_communications mc
                 WHERE mc.absence_case_id = ac.id) as messages_count
            FROM absence_cases ac
            LEFT JOIN partners p ON ac.assigned_doctor_id = p.id
            WHERE ac.employee_id = :employeeId
              AND ac.company_id = :companyId
            ORDER BY ac.created_at DESC
        `, {
            replacements: { employeeId, companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: cases,
            total: cases.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo historial:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener historial de inasistencias'
        });
    }
});

/**
 * GET /api/medical-cases/:caseId
 * Obtener detalles completos de un caso específico
 */
router.get('/:caseId', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { caseId } = req.params;
        const { companyId } = req.user;

        const [caseData] = await db.sequelize.query(`
            SELECT
                ac.*,
                u."firstName" || ' ' || u."lastName" as employee_name,
                u."employeeId" as legajo,
                u.dni,
                u.email as employee_email,
                u.phone as employee_phone,
                d.name as department,
                
                p.first_name || ' ' || p.last_name as doctor_name,
                p.email as doctor_email,
                p.specialty,
                p.license_number
            FROM absence_cases ac
            JOIN users u ON ac.employee_id = u.user_id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN partners p ON ac.assigned_doctor_id = p.id
            WHERE ac.id = :caseId
              AND ac.company_id = :companyId
        `, {
            replacements: { caseId, companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        if (!caseData || caseData.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Caso no encontrado'
            });
        }

        // Obtener mensajes del caso
        const [messages] = await db.sequelize.query(`
            SELECT
                mc.*,
                CASE
                    WHEN mc.sender_type = 'employee' THEN u."firstName" || ' ' || u."lastName"
                    WHEN mc.sender_type = 'doctor' THEN p.first_name || ' ' || p.last_name
                    WHEN mc.sender_type = 'hr' THEN u2."firstName" || ' ' || u2."lastName"
                    ELSE 'Sistema'
                END as sender_name
            FROM medical_communications mc
            LEFT JOIN users u ON mc.sender_id = u.user_id AND mc.sender_type = 'employee'
            LEFT JOIN partners p ON mc.sender_id::text = p.id::text AND mc.sender_type = 'doctor'
            LEFT JOIN users u2 ON mc.sender_id = u2.user_id AND mc.sender_type = 'hr'
            WHERE mc.absence_case_id = :caseId
            ORDER BY mc.created_at ASC
        `, {
            replacements: { caseId },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: {
                case: caseData[0],
                messages: messages
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo detalles del caso:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener detalles del caso'
        });
    }
});

// ============================================================================
// ENDPOINTS PARA MÉDICOS
// ============================================================================

/**
 * GET /api/medical-cases/doctor/pending
 * Obtener casos pendientes asignados al médico autenticado
 * Admins pueden ver TODOS los casos de la empresa
 */
router.get('/doctor/pending', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { partner_id, role, company_id } = req.user;
        const isAdmin = role === 'admin';

        // Si no es médico NI admin, rechazar
        if (!partner_id && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Usuario no es un médico válido ni admin'
            });
        }

        // Query base - admins ven todos, médicos solo los suyos
        let whereClause = isAdmin
            ? 'ac.company_id = :company_id'
            : 'ac.assigned_doctor_id = :partner_id';

        const cases = await db.sequelize.query(`
            SELECT
                ac.id,
                ac.absence_type,
                ac.start_date,
                ac.requested_days,
                ac.case_status,
                ac.created_at,
                ac.assignment_date,
                u."firstName" || ' ' || u."lastName" as employee_name,
                u."employeeId" as legajo,
                u.dni,
                d.name as department,
                (SELECT COUNT(*) FROM medical_communications mc
                 WHERE mc.absence_case_id = ac.id
                   AND mc.is_read = false
                   AND mc.receiver_type = 'doctor') as unread_messages
            FROM absence_cases ac
            JOIN users u ON ac.employee_id = u.user_id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE ${whereClause}
              AND ac.case_status NOT IN ('closed', 'justified', 'not_justified')
            ORDER BY ac.created_at DESC
        `, {
            replacements: { partner_id, company_id },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: cases,
            total: cases.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo casos pendientes:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener casos pendientes'
        });
    }
});

/**
 * GET /api/medical-cases/employee/:employeeId/medical-history
 * Obtener historial médico COMPLETO y cronológico del empleado
 * (Como lo pidió el usuario: cronológico, inteligente, amigable, desplegable)
 */
router.get('/employee/:employeeId/medical-history', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { employeeId } = req.params;

        // 1. Datos personales médicos del empleado
        const [employeeData] = await db.sequelize.query(`
            SELECT
                u.user_id,
                u."firstName" || ' ' || u."lastName" as full_name,
                u."employeeId" as legajo,
                u.dni,
                u.email,
                u.phone,
                u.birth_date,
                EXTRACT(YEAR FROM AGE(u.birth_date)) as age,
                d.name as department
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.user_id = :employeeId
        `, {
            replacements: { employeeId },
            type: db.sequelize.QueryTypes.SELECT
        });

        if (!employeeData || employeeData.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Empleado no encontrado'
            });
        }

        // 2. Historial de casos médicos (inasistencias)
        const [absenceCases] = await db.sequelize.query(`
            SELECT
                ac.id,
                ac.absence_type,
                ac.start_date,
                ac.end_date,
                ac.requested_days,
                ac.approved_days,
                ac.case_status,
                ac.is_justified,
                ac.employee_description,
                ac.medical_conclusion,
                ac.final_diagnosis,
                ac.created_at,
                ac.case_closed_date,
                p.first_name || ' ' || p.last_name as doctor_name,
                p.specialty
            FROM absence_cases ac
            LEFT JOIN partners p ON ac.assigned_doctor_id = p.id
            WHERE ac.employee_id = :employeeId
            ORDER BY ac.created_at DESC
        `, {
            replacements: { employeeId },
            type: db.sequelize.QueryTypes.SELECT
        });

        // 3. Exámenes médicos ocupacionales
        const [medicalExams] = await db.sequelize.query(`
            SELECT
                id,
                exam_type,
                exam_date,
                next_exam_date,
                result,
                observations,
                doctor_name,
                created_at
            FROM user_medical_exams
            WHERE user_id = :employeeId
            ORDER BY exam_date DESC
        `, {
            replacements: { employeeId },
            type: db.sequelize.QueryTypes.SELECT
        }).catch(() => [[]]);

        // 4. Antecedentes médicos (si existen)
        const [medicalHistory] = await db.sequelize.query(`
            SELECT * FROM user_medical_advanced
            WHERE user_id = :employeeId
            ORDER BY created_at DESC
            LIMIT 1
        `, {
            replacements: { employeeId },
            type: db.sequelize.QueryTypes.SELECT
        }).catch(() => [[]]);

        // 5. Restricciones laborales activas
        const [workRestrictions] = await db.sequelize.query(`
            SELECT * FROM user_work_restrictions
            WHERE user_id = :employeeId
              AND is_active = true
            ORDER BY created_at DESC
        `, {
            replacements: { employeeId },
            type: db.sequelize.QueryTypes.SELECT
        }).catch(() => [[]]);

        // 6. Estadísticas resumidas
        const stats = {
            total_absences: absenceCases.length,
            justified: absenceCases.filter(c => c.is_justified === true).length,
            not_justified: absenceCases.filter(c => c.is_justified === false).length,
            pending: absenceCases.filter(c => c.case_status === 'pending' || c.case_status === 'under_review').length,
            total_days_absent: absenceCases.reduce((sum, c) => sum + (c.approved_days || c.requested_days || 0), 0),
            last_absence: absenceCases[0] || null
        };

        // Construir timeline cronológico unificado
        const timeline = [
            ...absenceCases.map(c => ({
                type: 'absence',
                date: c.created_at,
                data: c
            })),
            ...medicalExams.map(e => ({
                type: 'exam',
                date: e.exam_date,
                data: e
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            success: true,
            data: {
                employee: employeeData[0],
                stats,
                timeline,
                absence_cases: absenceCases,
                medical_exams: medicalExams,
                medical_history: medicalHistory[0] || null,
                work_restrictions: workRestrictions
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo historial médico:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener historial médico completo'
        });
    }
});

/**
 * POST /api/medical-cases/:caseId/messages
 * Enviar mensaje en un caso médico
 */
router.post('/:caseId/messages', auth, upload.array('attachments', 3), async (req, res) => {
    const db = require('../config/database');

    try {
        const { caseId } = req.params;
        const {
            message,
            message_type,
            receiver_type,
            receiver_id,
            requires_response
        } = req.body;

        const { user_id, companyId, role, partner_id } = req.user;

        // Determinar sender_type
        let sender_type = 'hr';
        let sender_id = user_id;

        if (partner_id) {
            sender_type = 'doctor';
            sender_id = partner_id;
        } else if (role === 'employee') {
            sender_type = 'employee';
        }

        // Procesar adjuntos
        const attachments = req.files ? req.files.map(file => ({
            filename: file.originalname,
            url: `/uploads/medical-documents/${file.filename}`,
            type: file.mimetype,
            size: file.size
        })) : [];

        // Insertar mensaje
        await db.sequelize.query(`
            INSERT INTO medical_communications (
                company_id,
                absence_case_id,
                sender_type,
                sender_id,
                receiver_type,
                receiver_id,
                message_type,
                message,
                attachments,
                requires_response
            ) VALUES (
                :companyId,
                :caseId,
                :sender_type,
                :sender_id,
                :receiver_type,
                :receiver_id,
                :message_type,
                :message,
                :attachments::jsonb,
                :requires_response
            )
        `, {
            replacements: {
                companyId,
                caseId,
                sender_type,
                sender_id,
                receiver_type: receiver_type || 'employee',
                receiver_id: receiver_id || null,
                message_type: message_type || 'follow_up',
                message,
                attachments: JSON.stringify(attachments),
                requires_response: requires_response || false
            }
        });

        res.json({
            success: true,
            message: 'Mensaje enviado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error enviando mensaje:', error);
        res.status(500).json({
            success: false,
            error: 'Error al enviar mensaje'
        });
    }
});

/**
 * GET /api/medical-cases/:caseId/messages
 * Obtener mensajes de un caso
 */
router.get('/:caseId/messages', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { caseId } = req.params;

        const [messages] = await db.sequelize.query(`
            SELECT
                mc.*,
                CASE
                    WHEN mc.sender_type = 'employee' THEN u."firstName" || ' ' || u."lastName"
                    WHEN mc.sender_type = 'doctor' THEN p.first_name || ' ' || p.last_name
                    WHEN mc.sender_type = 'hr' THEN u2."firstName" || ' ' || u2."lastName"
                    ELSE 'Sistema'
                END as sender_name
            FROM medical_communications mc
            LEFT JOIN users u ON mc.sender_id = u.user_id AND mc.sender_type = 'employee'
            LEFT JOIN partners p ON mc.sender_id::text = p.id::text AND mc.sender_type = 'doctor'
            LEFT JOIN users u2 ON mc.sender_id = u2.user_id AND mc.sender_type = 'hr'
            WHERE mc.absence_case_id = :caseId
            ORDER BY mc.created_at ASC
        `, {
            replacements: { caseId },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: messages
        });

    } catch (error) {
        console.error('❌ Error obteniendo mensajes:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener mensajes'
        });
    }
});

/**
 * POST /api/medical-cases/:caseId/diagnosis
 * Médico da diagnóstico y justificación
 */
router.post('/:caseId/diagnosis', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { caseId } = req.params;
        const {
            final_diagnosis,
            medical_conclusion,
            is_justified,
            approved_days,
            justification_reason
        } = req.body;

        const { partner_id } = req.user;

        if (!partner_id) {
            return res.status(403).json({
                success: false,
                error: 'Solo médicos pueden dar diagnósticos'
            });
        }

        await db.sequelize.query(`
            UPDATE absence_cases
            SET
                final_diagnosis = :final_diagnosis,
                medical_conclusion = :medical_conclusion,
                is_justified = :is_justified,
                approved_days = :approved_days,
                justification_reason = :justification_reason,
                doctor_response_date = CURRENT_TIMESTAMP,
                case_status = 'under_review',
                last_modified_by = :partner_id
            WHERE id = :caseId
              AND assigned_doctor_id = :partner_id
        `, {
            replacements: {
                caseId,
                final_diagnosis,
                medical_conclusion,
                is_justified,
                approved_days: approved_days || null,
                justification_reason: justification_reason || null,
                partner_id
            }
        });

        res.json({
            success: true,
            message: 'Diagnóstico registrado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error registrando diagnóstico:', error);
        res.status(500).json({
            success: false,
            error: 'Error al registrar diagnóstico'
        });
    }
});

/**
 * POST /api/medical-cases/:caseId/close
 * Cerrar expediente médico
 */
router.post('/:caseId/close', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { caseId } = req.params;
        const { partner_id, user_id } = req.user;

        const closer_id = partner_id || user_id;

        await db.sequelize.query(`
            UPDATE absence_cases
            SET
                case_status = :new_status,
                case_closed_date = CURRENT_TIMESTAMP,
                closed_by = :closer_id
            WHERE id = :caseId
        `, {
            replacements: {
                caseId,
                new_status: 'closed',
                closer_id
            }
        });

        // Crear notificación de cierre
        await db.sequelize.query(`
            INSERT INTO medical_communications (
                company_id,
                absence_case_id,
                sender_type,
                message_type,
                message
            )
            SELECT
                company_id,
                :caseId,
                'system',
                'case_closed',
                'Expediente médico cerrado'
            FROM absence_cases
            WHERE id = :caseId
        `, {
            replacements: { caseId }
        });

        res.json({
            success: true,
            message: 'Expediente cerrado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error cerrando expediente:', error);
        res.status(500).json({
            success: false,
            error: 'Error al cerrar expediente'
        });
    }
});

// ============================================================================
// ENDPOINTS DE CONFIGURACIÓN
// ============================================================================

/**
 * GET /api/medical-cases/company/doctors
 * Obtener médicos asignados a la empresa
 */
router.get('/company/doctors', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;

        const [doctors] = await db.sequelize.query(`
            SELECT
                p.id,
                p.first_name,
                p.last_name,
                p.email,
                p.phone,
                p.specialty,
                p.license_number,
                cms.is_primary,
                cms.is_active,
                cms.assigned_at,
                (SELECT COUNT(*) FROM absence_cases ac
                 WHERE ac.assigned_doctor_id = p.id
                   AND ac.case_status NOT IN ('closed', 'justified', 'not_justified')) as active_cases
            FROM partners p
            JOIN company_medical_staff cms ON p.id = cms.partner_id
            WHERE cms.company_id = :companyId
              AND cms.is_active = true
              AND p.is_medical_staff = true
            ORDER BY cms.is_primary DESC, p.last_name ASC
        `, {
            replacements: { companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: doctors
        });

    } catch (error) {
        console.error('❌ Error obteniendo médicos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener médicos de la empresa'
        });
    }
});

/**
 * POST /api/medical-cases/company/assign-doctor
 * Asignar médico a la empresa
 */
router.post('/company/assign-doctor', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { partner_id, is_primary } = req.body;
        const { companyId, user_id } = req.user;

        // Verificar que el partner existe y es médico
        const [partner] = await db.sequelize.query(`
            SELECT id FROM partners
            WHERE id = :partner_id
              AND is_medical_staff = true
        `, {
            replacements: { partner_id },
            type: db.sequelize.QueryTypes.SELECT
        });

        if (partner.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Médico no encontrado'
            });
        }

        // Si es médico principal, desactivar otros principales
        if (is_primary) {
            await db.sequelize.query(`
                UPDATE company_medical_staff
                SET is_primary = false
                WHERE company_id = :companyId
            `, {
                replacements: { companyId }
            });
        }

        // Asignar médico
        await db.sequelize.query(`
            INSERT INTO company_medical_staff (
                company_id,
                partner_id,
                is_primary,
                assigned_by
            ) VALUES (
                :companyId,
                :partner_id,
                :is_primary,
                :user_id
            )
            ON CONFLICT (company_id, partner_id)
            DO UPDATE SET
                is_primary = EXCLUDED.is_primary,
                is_active = true
        `, {
            replacements: {
                companyId,
                partner_id,
                is_primary: is_primary || false,
                user_id
            }
        });

        res.json({
            success: true,
            message: 'Médico asignado exitosamente a la empresa'
        });

    } catch (error) {
        console.error('❌ Error asignando médico:', error);
        res.status(500).json({
            success: false,
            error: 'Error al asignar médico'
        });
    }
});

// ============================================================================
// MEDICAL EMPLOYEE 360 - VISTA CONSOLIDADA COMPLETA PARA MÉDICOS
// ============================================================================

/**
 * GET /api/medical-cases/employee/:employeeId/360
 * Vista 360° médica del empleado - TODO el historial médico en una sola consulta
 * Incluye: datos personales, antecedentes, alergias, condiciones crónicas,
 * exámenes ocupacionales, certificados, ausencias, accidentes, documentos
 */
router.get('/employee/:employeeId/360', auth, async (req, res) => {
    const db = require('../config/database');
    const { employeeId } = req.params;
    const { companyId } = req.user;

    console.log(`🏥 [MEDICAL-360] Cargando vista completa para empleado ${employeeId}`);

    try {
        // 1. DATOS PERSONALES DEL EMPLEADO
        // Usando solo columnas que EXISTEN en la tabla users
        const [employeeData] = await db.sequelize.query(`
            SELECT
                u.user_id,
                u."employeeId" as employee_id,
                u."firstName",
                u."lastName",
                u.email,
                u.phone,
                u.dni,
                u.cuil,
                u.birth_date,
                u.address,
                u."emergencyContact" as emergency_contact_name,
                u."emergencyPhone" as emergency_contact_phone,
                u."hireDate" as hire_date,
                u.position,
                u.department_id,
                d.name as department_name,
                u.display_name as photo_url,
                u."createdAt" as fecha_alta
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.user_id = :employeeId
              AND u.company_id = :companyId
        `, {
            replacements: { employeeId, companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        if (!employeeData || employeeData.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Empleado no encontrado'
            });
        }

        const employee = employeeData[0];

        // 2. ALERGIAS
        const [allergies] = await db.sequelize.query(`
            SELECT
                id,
                allergen,
                severity,
                reaction,
                notes,
                diagnosed_date,
                created_at
            FROM user_allergies
            WHERE user_id = :employeeId
            ORDER BY severity DESC, created_at DESC
        `, {
            replacements: { employeeId },
            type: db.sequelize.QueryTypes.SELECT
        });

        // 3. CONDICIONES CRÓNICAS
        const [chronicConditions] = await db.sequelize.query(`
            SELECT
                id,
                condition_name,
                condition_code,
                diagnosis_date,
                severity,
                status,
                treatment,
                notes,
                created_at
            FROM user_chronic_conditions
            WHERE user_id = :employeeId
            ORDER BY diagnosis_date DESC
        `, {
            replacements: { employeeId },
            type: db.sequelize.QueryTypes.SELECT
        });

        // 4. CONDICIONES CRÓNICAS V2 (extendidas)
        const [chronicConditionsV2] = await db.sequelize.query(`
            SELECT
                uc.*,
                cc.name as condition_name,
                cc.category,
                cc.icd10_code
            FROM user_chronic_conditions_v2 uc
            LEFT JOIN chronic_conditions_catalog cc ON uc.condition_id = cc.id
            WHERE uc.user_id = :employeeId
            ORDER BY uc.diagnosis_date DESC
        `, {
            replacements: { employeeId },
            type: db.sequelize.QueryTypes.SELECT
        });

        // 5. EXÁMENES MÉDICOS OCUPACIONALES (preocupacional, periódico, etc.)
        const [medicalExams] = await db.sequelize.query(`
            SELECT
                id,
                exam_type,
                exam_date,
                result,
                observations,
                next_exam_date,
                medical_center,
                examining_doctor,
                certificate_url,
                created_at
            FROM user_medical_exams
            WHERE user_id = :employeeId
              AND company_id = :companyId
            ORDER BY exam_date DESC
        `, {
            replacements: { employeeId, companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        // 6. DOCUMENTOS MÉDICOS
        const [medicalDocuments] = await db.sequelize.query(`
            SELECT
                id,
                document_type,
                document_name,
                document_url,
                upload_date,
                expiration_date,
                notes,
                created_at
            FROM user_medical_documents
            WHERE user_id = :employeeId
            ORDER BY upload_date DESC
        `, {
            replacements: { employeeId },
            type: db.sequelize.QueryTypes.SELECT
        });

        // 7. CASOS DE AUSENCIA (inasistencias médicas)
        const [absenceCases] = await db.sequelize.query(`
            SELECT
                ac.id,
                ac.absence_type,
                ac.start_date,
                ac.end_date,
                ac.requested_days,
                ac.approved_days,
                ac.case_status,
                ac.employee_description,
                ac.medical_conclusion,
                ac.final_diagnosis,
                ac.is_justified,
                ac.justification_reason,
                ac.notify_art,
                ac.art_notified,
                ac.art_case_number,
                ac.created_at,
                ac.case_closed_date,
                p.first_name as doctor_first_name,
                p.last_name as doctor_last_name
            FROM absence_cases ac
            LEFT JOIN partners p ON ac.assigned_doctor_id = p.id
            WHERE ac.employee_id = :employeeId
              AND ac.company_id = :companyId
            ORDER BY ac.start_date DESC
        `, {
            replacements: { employeeId, companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        // 8. CERTIFICADOS MÉDICOS
        const [certificates] = await db.sequelize.query(`
            SELECT
                id,
                certificate_number,
                issue_date,
                start_date,
                end_date,
                requested_days,
                approved_days,
                diagnosis_code,
                diagnosis,
                symptoms,
                medical_center,
                attending_physician,
                status,
                is_justified,
                notify_art,
                art_notified,
                attachments,
                created_at
            FROM medical_certificates
            WHERE user_id = :employeeId
              AND company_id = :companyId
            ORDER BY issue_date DESC
        `, {
            replacements: { employeeId, companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        // 9. COMUNICACIONES MÉDICAS (mensajes del historial)
        const [communications] = await db.sequelize.query(`
            SELECT
                mc.id,
                mc.absence_case_id,
                mc.sender_type,
                mc.receiver_type,
                mc.message_type,
                mc.message,
                mc.attachments,
                mc.is_read,
                mc.read_at,
                mc.requires_response,
                mc.response_deadline,
                mc.created_at
            FROM medical_communications mc
            JOIN absence_cases ac ON mc.absence_case_id = ac.id
            WHERE ac.employee_id = :employeeId
              AND ac.company_id = :companyId
            ORDER BY mc.created_at DESC
            LIMIT 100
        `, {
            replacements: { employeeId, companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        // 10. CERTIFICACIONES OH (si existen)
        let ohCertifications = [];
        try {
            const [ohCerts] = await db.sequelize.query(`
                SELECT
                    ec.id,
                    ec.employee_name,
                    ec.certification_type_id,
                    ct.name_i18n->>'es' as certification_name,
                    ec.issue_date,
                    ec.expiration_date,
                    ec.status,
                    ec.issuing_authority,
                    ec.certificate_number,
                    ec.notes
                FROM oh_employee_certifications ec
                LEFT JOIN oh_certification_types ct ON ec.certification_type_id = ct.id
                WHERE ec.company_id = :companyId
                  AND ec.employee_id = :employeeId
                ORDER BY ec.expiration_date DESC
            `, {
                replacements: { employeeId, companyId },
                type: db.sequelize.QueryTypes.SELECT
            });
            ohCertifications = ohCerts || [];
        } catch (e) {
            // Tabla puede no existir
            console.log('⚠️ [MEDICAL-360] Tabla oh_employee_certifications no disponible');
        }

        // 11. CIRUGÍAS
        let surgeries = [];
        try {
            const [surgeriesData] = await db.sequelize.query(`
                SELECT id, surgery_type, surgery_date, hospital_clinic, surgeon_name,
                       reason, complications, complications_details, recovery_days,
                       return_to_work_date, has_permanent_effects, permanent_effects_details,
                       follow_up_required, notes, created_at
                FROM user_surgeries
                WHERE user_id = :employeeId
                ORDER BY surgery_date DESC
            `, { replacements: { employeeId }, type: db.sequelize.QueryTypes.SELECT });
            surgeries = surgeriesData || [];
        } catch (e) { console.log('⚠️ [MEDICAL-360] user_surgeries no disponible'); }

        // 12. VACUNACIONES
        let vaccinations = [];
        try {
            const [vaccinationsData] = await db.sequelize.query(`
                SELECT id, vaccine_name, vaccine_type, dose_number, total_doses,
                       date_administered, next_dose_date, administering_institution,
                       lot_number, certificate_url, created_at
                FROM user_vaccinations
                WHERE user_id = :employeeId
                ORDER BY date_administered DESC
            `, { replacements: { employeeId }, type: db.sequelize.QueryTypes.SELECT });
            vaccinations = vaccinationsData || [];
        } catch (e) { console.log('⚠️ [MEDICAL-360] user_vaccinations no disponible'); }

        // 13. RESTRICCIONES LABORALES
        let workRestrictions = [];
        try {
            const [restrictionsData] = await db.sequelize.query(`
                SELECT id, restriction_type, description, start_date, end_date,
                       is_permanent, issuing_doctor, affects_current_role,
                       accommodation_needed, created_at
                FROM user_work_restrictions
                WHERE user_id = :employeeId
                ORDER BY start_date DESC
            `, { replacements: { employeeId }, type: db.sequelize.QueryTypes.SELECT });
            workRestrictions = restrictionsData || [];
        } catch (e) { console.log('⚠️ [MEDICAL-360] user_work_restrictions no disponible'); }

        // 14. MEDICAMENTOS ACTUALES
        let medications = [];
        try {
            const [medicationsData] = await db.sequelize.query(`
                SELECT id, medication_name, dosage, frequency, start_date, end_date,
                       prescribing_doctor, reason, is_chronic, notes, created_at
                FROM user_medications
                WHERE user_id = :employeeId
                ORDER BY start_date DESC
            `, { replacements: { employeeId }, type: db.sequelize.QueryTypes.SELECT });
            medications = medicationsData || [];
        } catch (e) { console.log('⚠️ [MEDICAL-360] user_medications no disponible'); }

        // 15. MÉDICO DE CABECERA
        let primaryPhysician = null;
        try {
            const [physicianData] = await db.sequelize.query(`
                SELECT id, doctor_name, specialty, medical_center, phone, email, notes
                FROM user_primary_physician
                WHERE user_id = :employeeId
                LIMIT 1
            `, { replacements: { employeeId }, type: db.sequelize.QueryTypes.SELECT });
            primaryPhysician = physicianData?.[0] || null;
        } catch (e) { console.log('⚠️ [MEDICAL-360] user_primary_physician no disponible'); }

        // 16. DATOS ANTROPOMÉTRICOS (últimos)
        let anthropometricData = null;
        try {
            const [anthropometricResult] = await db.sequelize.query(`
                SELECT id, height_cm, weight_kg, bmi, waist_cm, blood_pressure_systolic,
                       blood_pressure_diastolic, heart_rate, measurement_date, measured_by
                FROM user_anthropometric_data
                WHERE user_id = :employeeId
                ORDER BY measurement_date DESC
                LIMIT 1
            `, { replacements: { employeeId }, type: db.sequelize.QueryTypes.SELECT });
            anthropometricData = anthropometricResult?.[0] || null;
        } catch (e) { console.log('⚠️ [MEDICAL-360] user_anthropometric_data no disponible'); }

        // 17. CLASIFICAR EXÁMENES POR TIPO OCUPACIONAL
        const preOccupationalExams = medicalExams.filter(e => e.exam_type === 'preocupacional');
        const periodicExams = medicalExams.filter(e => ['periodico', 'reingreso', 'especial'].includes(e.exam_type));
        const postOccupationalExams = medicalExams.filter(e => e.exam_type === 'retiro');

        // 18. ESTADÍSTICAS RESUMEN
        const totalAbsences = absenceCases.length;
        const totalDaysAbsent = absenceCases.reduce((sum, c) => sum + (c.approved_days || c.requested_days || 0), 0);
        const justifiedAbsences = absenceCases.filter(c => c.is_justified === true).length;
        const workAccidents = absenceCases.filter(c => c.absence_type === 'work_accident').length;
        const pendingCases = absenceCases.filter(c => !['closed', 'justified', 'not_justified'].includes(c.case_status)).length;

        // Próximo examen programado
        const upcomingExam = medicalExams.find(e => e.next_exam_date && new Date(e.next_exam_date) > new Date());

        // Alertas médicas
        const alerts = [];

        // Alerta: examen vencido
        const lastExam = medicalExams[0];
        if (lastExam && lastExam.next_exam_date && new Date(lastExam.next_exam_date) < new Date()) {
            alerts.push({
                type: 'danger',
                icon: 'exclamation-triangle',
                message: `Examen ${lastExam.exam_type} vencido desde ${new Date(lastExam.next_exam_date).toLocaleDateString('es-AR')}`
            });
        }

        // Alerta: muchas ausencias
        if (totalAbsences > 5) {
            alerts.push({
                type: 'warning',
                icon: 'calendar-times',
                message: `${totalAbsences} ausencias médicas registradas (${totalDaysAbsent} días totales)`
            });
        }

        // Alerta: condiciones crónicas
        if (chronicConditions.length > 0 || chronicConditionsV2.length > 0) {
            const severeConditions = [...chronicConditions, ...chronicConditionsV2]
                .filter(c => c.severity === 'severe' || c.severity === 'alta');
            if (severeConditions.length > 0) {
                alerts.push({
                    type: 'danger',
                    icon: 'heartbeat',
                    message: `${severeConditions.length} condición(es) crónica(s) de severidad alta`
                });
            }
        }

        // Alerta: alergias severas
        const severeAllergies = allergies.filter(a => a.severity === 'severe' || a.severity === 'alta');
        if (severeAllergies.length > 0) {
            alerts.push({
                type: 'danger',
                icon: 'allergies',
                message: `${severeAllergies.length} alergia(s) severa(s): ${severeAllergies.map(a => a.allergen).join(', ')}`
            });
        }

        // Alerta: casos pendientes
        if (pendingCases > 0) {
            alerts.push({
                type: 'info',
                icon: 'folder-open',
                message: `${pendingCases} caso(s) médico(s) pendiente(s) de resolución`
            });
        }

        // Respuesta consolidada estructurada en 3 CAPÍTULOS OCUPACIONALES
        const response = {
            success: true,
            generatedAt: new Date().toISOString(),

            // ═══════════════════════════════════════════════════════════════════
            // DATOS DEL EMPLEADO
            // ═══════════════════════════════════════════════════════════════════
            employee: {
                ...employee,
                age: employee.birth_date ?
                    Math.floor((new Date() - new Date(employee.birth_date)) / (365.25 * 24 * 60 * 60 * 1000)) : null,
                seniority_years: employee.hire_date ?
                    Math.floor((new Date() - new Date(employee.hire_date)) / (365.25 * 24 * 60 * 60 * 1000)) : null,
                primary_physician: primaryPhysician,
                anthropometric: anthropometricData
            },

            // ALERTAS ACTIVAS
            alerts,

            // ESTADÍSTICAS RESUMEN
            statistics: {
                total_absences: totalAbsences,
                total_days_absent: totalDaysAbsent,
                justified_absences: justifiedAbsences,
                unjustified_absences: totalAbsences - justifiedAbsences,
                work_accidents: workAccidents,
                pending_cases: pendingCases,
                total_certificates: certificates.length,
                total_exams: medicalExams.length,
                total_allergies: allergies.length,
                total_chronic_conditions: chronicConditions.length + chronicConditionsV2.length,
                total_surgeries: surgeries.length,
                total_vaccinations: vaccinations.length,
                active_restrictions: workRestrictions.filter(r => !r.end_date || new Date(r.end_date) > new Date()).length,
                active_medications: medications.filter(m => !m.end_date || new Date(m.end_date) > new Date()).length
            },

            // ═══════════════════════════════════════════════════════════════════
            // CAPÍTULO 1: PRE-OCUPACIONAL (Antes de ingresar / Al ingresar)
            // ═══════════════════════════════════════════════════════════════════
            pre_occupational: {
                title: "Antecedentes PRE-Ocupacionales",
                description: "Información médica previa al ingreso y exámenes de ingreso",
                exams: preOccupationalExams, // Exámenes preocupacionales
                // Antecedentes que el empleado traía antes de ingresar:
                prior_conditions: {
                    chronic_conditions: [...chronicConditions, ...chronicConditionsV2],
                    allergies,
                    surgeries: surgeries.filter(s => s.surgery_date && employee.hire_date &&
                        new Date(s.surgery_date) < new Date(employee.hire_date)),
                    vaccinations: vaccinations.filter(v => v.date_administered && employee.hire_date &&
                        new Date(v.date_administered) < new Date(employee.hire_date))
                },
                fitness_at_entry: preOccupationalExams[0] || null // Último examen preocupacional
            },

            // ═══════════════════════════════════════════════════════════════════
            // CAPÍTULO 2: OCUPACIONAL (Durante el empleo)
            // ═══════════════════════════════════════════════════════════════════
            occupational: {
                title: "Historial OCUPACIONAL",
                description: "Todo lo ocurrido durante la relación laboral",
                // Exámenes periódicos, de reingreso, especiales
                periodic_exams: periodicExams,
                next_exam_due: upcomingExam || null,
                // Ausencias por tipo
                absences: {
                    all: absenceCases,
                    by_type: {
                        medical_illness: absenceCases.filter(c => c.absence_type === 'medical_illness'),
                        work_accident: absenceCases.filter(c => c.absence_type === 'work_accident'),
                        non_work_accident: absenceCases.filter(c => c.absence_type === 'non_work_accident'),
                        occupational_disease: absenceCases.filter(c => c.absence_type === 'occupational_disease'),
                        maternity: absenceCases.filter(c => c.absence_type === 'maternity'),
                        family_care: absenceCases.filter(c => c.absence_type === 'family_care')
                    },
                    summary: {
                        total_cases: totalAbsences,
                        total_days: totalDaysAbsent,
                        work_accidents_count: workAccidents,
                        pending: pendingCases
                    }
                },
                // Certificados médicos durante empleo
                certificates,
                // Cirugías durante empleo
                surgeries_during_employment: surgeries.filter(s => !s.surgery_date || !employee.hire_date ||
                    new Date(s.surgery_date) >= new Date(employee.hire_date)),
                // Vacunas aplicadas durante empleo
                vaccinations_during_employment: vaccinations.filter(v => !v.date_administered || !employee.hire_date ||
                    new Date(v.date_administered) >= new Date(employee.hire_date)),
                // Restricciones laborales
                work_restrictions: {
                    all: workRestrictions,
                    active: workRestrictions.filter(r => !r.end_date || new Date(r.end_date) > new Date()),
                    permanent: workRestrictions.filter(r => r.is_permanent)
                },
                // Medicamentos
                medications: {
                    all: medications,
                    current: medications.filter(m => !m.end_date || new Date(m.end_date) > new Date()),
                    chronic: medications.filter(m => m.is_chronic)
                },
                // Documentos médicos
                documents: medicalDocuments,
                // Certificaciones OH
                oh_certifications: ohCertifications
            },

            // ═══════════════════════════════════════════════════════════════════
            // CAPÍTULO 3: POST-OCUPACIONAL (Al egreso)
            // ═══════════════════════════════════════════════════════════════════
            post_occupational: {
                title: "Exámenes POST-Ocupacionales",
                description: "Exámenes de egreso y estado final",
                exit_exams: postOccupationalExams, // Exámenes de retiro
                has_exit_exam: postOccupationalExams.length > 0,
                last_exit_exam: postOccupationalExams[0] || null,
                // Condiciones permanentes que quedan
                permanent_conditions: {
                    chronic: [...chronicConditions, ...chronicConditionsV2].filter(c => c.status !== 'resolved'),
                    permanent_restrictions: workRestrictions.filter(r => r.is_permanent),
                    permanent_effects_from_surgeries: surgeries.filter(s => s.has_permanent_effects)
                }
            },

            // ═══════════════════════════════════════════════════════════════════
            // TIMELINE DE COMUNICACIONES
            // ═══════════════════════════════════════════════════════════════════
            communications_timeline: communications.slice(0, 50)
        };

        console.log(`✅ [MEDICAL-360] Vista completa generada para ${employee.firstName} ${employee.lastName}`);

        res.json(response);

    } catch (error) {
        console.error('❌ [MEDICAL-360] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar vista médica 360',
            details: error.message
        });
    }
});

/**
 * GET /api/medical-cases/employee/:employeeId/fitness-status
 * Estado de aptitud laboral del empleado
 */
router.get('/employee/:employeeId/fitness-status', auth, async (req, res) => {
    const db = require('../config/database');
    const { employeeId } = req.params;
    const { companyId } = req.user;

    try {
        // Obtener último examen ocupacional
        const [lastExam] = await db.sequelize.query(`
            SELECT
                id,
                exam_type,
                exam_date,
                result,
                observations,
                next_exam_date,
                examining_doctor
            FROM user_medical_exams
            WHERE user_id = :employeeId
              AND company_id = :companyId
              AND exam_type IN ('preocupacional', 'periodico', 'reingreso')
            ORDER BY exam_date DESC
            LIMIT 1
        `, {
            replacements: { employeeId, companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        // Verificar restricciones laborales activas
        const [restrictions] = await db.sequelize.query(`
            SELECT
                id,
                restriction_type,
                description,
                start_date,
                end_date,
                is_permanent,
                accommodation_needed as notes
            FROM user_work_restrictions
            WHERE user_id = :employeeId
              AND (end_date IS NULL OR end_date >= CURRENT_DATE)
            ORDER BY start_date DESC
        `, {
            replacements: { employeeId },
            type: db.sequelize.QueryTypes.SELECT
        });

        // Calcular estado de aptitud
        let fitnessStatus = 'unknown';
        let fitnessMessage = 'Sin examen ocupacional registrado';
        let expiresAt = null;
        let canWork = true;

        if (lastExam && lastExam.length > 0) {
            const exam = lastExam[0];
            const nextExamDate = exam.next_exam_date ? new Date(exam.next_exam_date) : null;

            if (exam.result === 'apto' || exam.result === 'fit') {
                if (nextExamDate && nextExamDate < new Date()) {
                    fitnessStatus = 'expired';
                    fitnessMessage = 'Aptitud vencida - Requiere nuevo examen';
                    canWork = false; // Política de la empresa
                } else {
                    fitnessStatus = 'fit';
                    fitnessMessage = 'Apto para trabajar';
                    expiresAt = nextExamDate;
                }
            } else if (exam.result === 'apto_con_restricciones' || exam.result === 'fit_with_restrictions') {
                fitnessStatus = 'fit_restricted';
                fitnessMessage = 'Apto con restricciones';
                expiresAt = nextExamDate;
            } else if (exam.result === 'no_apto' || exam.result === 'unfit') {
                fitnessStatus = 'unfit';
                fitnessMessage = 'No apto para trabajar';
                canWork = false;
            } else if (exam.result === 'pendiente' || exam.result === 'pending') {
                fitnessStatus = 'pending';
                fitnessMessage = 'Evaluación pendiente';
            }
        }

        // Verificar si hay restricciones activas
        const restrictionsList = restrictions || [];
        const activeRestrictions = restrictionsList.filter(r => {
            if (r.is_permanent) return true;
            if (!r.end_date) return true;
            return new Date(r.end_date) >= new Date();
        });

        res.json({
            success: true,
            fitness: {
                status: fitnessStatus,
                message: fitnessMessage,
                can_work: canWork,
                expires_at: expiresAt,
                last_exam: lastExam && lastExam[0] ? {
                    type: lastExam[0].exam_type,
                    date: lastExam[0].exam_date,
                    result: lastExam[0].result,
                    doctor: lastExam[0].examining_doctor
                } : null
            },
            restrictions: {
                has_restrictions: activeRestrictions.length > 0,
                count: activeRestrictions.length,
                items: activeRestrictions
            }
        });

    } catch (error) {
        console.error('❌ [FITNESS-STATUS] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estado de aptitud'
        });
    }
});

// ============================================================================
// GET /api/medical-cases/employees/with-medical-records
// Obtener todos los empleados de la empresa con resumen médico
// ============================================================================
router.get('/employees/with-medical-records', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const { dateStart, dateEnd, search } = req.query;

        console.log(`📋 [EMPLOYEES-MEDICAL] Obteniendo empleados con registros médicos para company ${companyId}`);

        // Obtener todos los usuarios activos de la empresa con datos médicos básicos
        // NOTA: users usa user_id (UUID), firstName, lastName, legajo
        let query = `
            SELECT
                u.user_id as id,
                CONCAT(u."firstName", ' ', u."lastName") as name,
                COALESCE(u.legajo, u."employeeId", 'N/A') as legajo,
                COALESCE(d.name, 'Sin Departamento') as department,
                u."createdAt" as created_at,
                u.is_active,
                -- Último examen médico
                (SELECT exam_date FROM user_medical_exams
                 WHERE user_id = u.user_id ORDER BY exam_date DESC LIMIT 1) as last_medical_check,
                -- Conteo de certificados médicos (activos, vencidos, por vencer) - Tabla: medical_certificates
                (SELECT COUNT(*) FROM medical_certificates
                 WHERE user_id = u.user_id AND status IN ('approved', 'pending', 'under_review')
                 AND (end_date IS NULL OR end_date >= CURRENT_DATE)) as active_certificates,
                (SELECT COUNT(*) FROM medical_certificates
                 WHERE user_id = u.user_id
                 AND (status = 'expired' OR (end_date IS NOT NULL AND end_date < CURRENT_DATE))) as expired_certificates,
                (SELECT COUNT(*) FROM medical_certificates
                 WHERE user_id = u.user_id AND status IN ('approved', 'pending')
                 AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as expiring_soon,
                -- Casos médicos (pendientes y completados) - Tabla: absence_cases
                -- Valores correctos: pending, under_review, awaiting_docs, needs_follow_up, justified, not_justified, closed
                (SELECT COUNT(*) FROM absence_cases
                 WHERE employee_id = u.user_id AND case_status IN ('pending', 'under_review', 'awaiting_docs', 'needs_follow_up')) as pending_cases,
                (SELECT COUNT(*) FROM absence_cases
                 WHERE employee_id = u.user_id AND case_status IN ('justified', 'not_justified', 'closed')) as completed_cases,
                -- Estado de aptitud del último examen
                (SELECT result FROM user_medical_exams
                 WHERE user_id = u.user_id ORDER BY exam_date DESC LIMIT 1) as fitness_status,
                -- Tiene restricciones activas
                COALESCE((SELECT COUNT(*) > 0 FROM user_work_restrictions
                 WHERE user_id = u.user_id AND (is_permanent = true OR end_date IS NULL OR end_date >= CURRENT_DATE)), false) as has_restrictions,
                -- Requiere auditoría (tiene caso pendiente > 7 días)
                (SELECT COUNT(*) > 0 FROM absence_cases
                 WHERE employee_id = u.user_id
                 AND case_status IN ('pending', 'under_review', 'awaiting_docs', 'needs_follow_up')
                 AND created_at < CURRENT_DATE - INTERVAL '7 days') as requires_audit
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.company_id = :companyId
            AND u.is_active = true
            AND u.role != 'admin'
        `;

        const replacements = { companyId };

        // Filtro por búsqueda
        if (search) {
            query += ` AND (CONCAT(u."firstName", ' ', u."lastName") ILIKE :search OR u.legajo ILIKE :search OR u."employeeId" ILIKE :search)`;
            replacements.search = `%${search}%`;
        }

        // Filtro por fecha de último chequeo
        if (dateStart) {
            query += ` AND (SELECT exam_date FROM user_medical_exams WHERE user_id = u.user_id ORDER BY exam_date DESC LIMIT 1) >= :dateStart`;
            replacements.dateStart = dateStart;
        }
        if (dateEnd) {
            query += ` AND (SELECT exam_date FROM user_medical_exams WHERE user_id = u.user_id ORDER BY exam_date DESC LIMIT 1) <= :dateEnd`;
            replacements.dateEnd = dateEnd;
        }

        query += ` ORDER BY u."firstName" ASC, u."lastName" ASC LIMIT 100`;

        // Fix: QueryTypes.SELECT retorna array directamente, no [results, metadata]
        const employees = await db.sequelize.query(query, {
            replacements,
            type: db.Sequelize.QueryTypes.SELECT
        });

        console.log(`🔍 [DEBUG] Type of employees:`, typeof employees, `Is Array:`, Array.isArray(employees), `Length:`, employees?.length);

        // Formatear respuesta
        const formattedEmployees = (Array.isArray(employees) ? employees : []).map(emp => ({
            id: emp.id,
            name: emp.name,
            legajo: emp.legajo || 'N/A',
            department: emp.department,
            lastMedicalCheck: emp.last_medical_check ? new Date(emp.last_medical_check).toISOString().split('T')[0] : null,
            certificates: {
                active: parseInt(emp.active_certificates) || 0,
                expired: parseInt(emp.expired_certificates) || 0,
                expiringSoon: parseInt(emp.expiring_soon) || 0
            },
            cases: {
                pending: parseInt(emp.pending_cases) || 0,
                completed: parseInt(emp.completed_cases) || 0
            },
            medicalStatus: emp.fitness_status || 'Sin Evaluar',
            hasRestrictions: emp.has_restrictions || false,
            requiresAudit: emp.requires_audit || false
        }));

        res.json({
            success: true,
            employees: formattedEmployees,
            total: formattedEmployees.length
        });

    } catch (error) {
        console.error('❌ [EMPLOYEES-MEDICAL] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener empleados con registros médicos',
            details: error.message
        });
    }
});

module.exports = router;
