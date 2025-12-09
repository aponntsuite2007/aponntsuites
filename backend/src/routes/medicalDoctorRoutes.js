/**
 * ============================================================================
 * MEDICAL DOCTOR ROUTES - Sistema de Autenticación y Gestión para Médicos APK
 * ============================================================================
 *
 * Rutas específicas para la APK del médico:
 * - Login de médicos (separado del sistema de partners)
 * - Selección de empresa (un médico puede atender múltiples empresas)
 * - Dashboard del médico
 * - Gestión de casos asignados
 *
 * ARQUITECTURA:
 * - Los médicos son Partners con is_medical_staff = true
 * - La relación médico-empresa se maneja en company_medical_staff
 * - Un médico puede estar asignado a N empresas
 * - El token JWT del médico incluye partner_id pero NO company_id
 * - El médico debe seleccionar empresa después de login
 *
 * @version 1.0.0
 * @date 2025-12-08
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ============================================================================
// MIDDLEWARE: Autenticación de Médico
// ============================================================================

/**
 * Middleware para autenticación de médicos
 * Verifica token JWT y que sea un médico válido
 */
const doctorAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Token no proporcionado',
                code: 'NO_TOKEN'
            });
        }

        const token = authHeader.split(' ')[1];
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

        try {
            const decoded = jwt.verify(token, JWT_SECRET);

            // Verificar que sea un token de médico
            if (!decoded.partner_id || decoded.user_type !== 'doctor') {
                return res.status(403).json({
                    success: false,
                    error: 'Token no válido para médico',
                    code: 'INVALID_DOCTOR_TOKEN'
                });
            }

            req.doctor = {
                partner_id: decoded.partner_id,
                email: decoded.email,
                name: decoded.name,
                specialty: decoded.specialty,
                license_number: decoded.license_number,
                selected_company_id: decoded.selected_company_id || null,
                companies: decoded.companies || []
            };

            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token expirado',
                    code: 'TOKEN_EXPIRED'
                });
            }
            return res.status(401).json({
                success: false,
                error: 'Token inválido',
                code: 'INVALID_TOKEN'
            });
        }
    } catch (error) {
        console.error('❌ [DOCTOR-AUTH] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error de autenticación'
        });
    }
};

/**
 * Middleware para verificar que el médico tiene empresa seleccionada
 */
const requireCompanySelected = (req, res, next) => {
    if (!req.doctor.selected_company_id) {
        return res.status(400).json({
            success: false,
            error: 'Debe seleccionar una empresa primero',
            code: 'NO_COMPANY_SELECTED',
            action: 'SELECT_COMPANY',
            endpoint: '/api/medical/doctor/select-company'
        });
    }
    next();
};

// ============================================================================
// ENDPOINT: Login de Médico
// ============================================================================

/**
 * POST /api/medical/doctor/login
 *
 * Login específico para médicos
 * Retorna token JWT + lista de empresas asignadas
 *
 * Body:
 * {
 *   "email": "doctor@example.com",
 *   "password": "password123"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "token": "jwt_token",
 *   "doctor": { id, name, email, specialty, license_number },
 *   "companies": [{ id, name, is_primary, active_cases }],
 *   "requires_company_selection": true
 * }
 */
router.post('/login', async (req, res) => {
    const db = require('../config/database');

    try {
        const { email, password } = req.body;

        // Validaciones
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email y contraseña requeridos'
            });
        }

        // Buscar médico en partners
        const doctors = await db.sequelize.query(`
            SELECT
                id,
                email,
                password_hash,
                first_name,
                last_name,
                specialty,
                license_number,
                is_medical_staff,
                approval_status,
                is_active,
                email_verified,
                account_status
            FROM partners
            WHERE email = :email
              AND is_medical_staff = true
        `, {
            replacements: { email },
            type: db.sequelize.QueryTypes.SELECT
        });

        if (!doctors || doctors.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }

        const doctor = doctors[0];

        // Verificar estado de cuenta
        if (doctor.approval_status !== 'approved') {
            return res.status(403).json({
                success: false,
                error: 'Cuenta pendiente de aprobación',
                code: 'ACCOUNT_NOT_APPROVED',
                status: doctor.approval_status
            });
        }

        if (!doctor.is_active) {
            return res.status(403).json({
                success: false,
                error: 'Cuenta desactivada',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        // Verificar contraseña
        const isValid = await bcrypt.compare(password, doctor.password_hash);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Obtener empresas asignadas al médico
        const companies = await db.sequelize.query(`
            SELECT
                c.company_id as id,
                c.name,
                c.slug,
                cms.is_primary,
                cms.is_active,
                cms.assigned_at,
                (SELECT COUNT(*) FROM absence_cases ac
                 WHERE ac.company_id = c.company_id
                   AND ac.assigned_doctor_id = :doctorId
                   AND ac.case_status NOT IN ('closed', 'justified', 'not_justified')) as active_cases,
                (SELECT COUNT(*) FROM absence_cases ac
                 WHERE ac.company_id = c.company_id
                   AND ac.assigned_doctor_id = :doctorId
                   AND ac.case_status = 'pending') as pending_cases
            FROM company_medical_staff cms
            JOIN companies c ON cms.company_id = c.company_id
            WHERE cms.partner_id = :doctorId
              AND cms.is_active = true
              AND c.is_active = true
            ORDER BY cms.is_primary DESC, c.name ASC
        `, {
            replacements: { doctorId: doctor.id },
            type: db.sequelize.QueryTypes.SELECT
        });

        if (!companies || companies.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'No tiene empresas asignadas',
                code: 'NO_COMPANIES_ASSIGNED',
                message: 'Contacte al administrador para ser asignado a una empresa'
            });
        }

        // Generar token JWT
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        const tokenPayload = {
            partner_id: doctor.id,
            email: doctor.email,
            name: `${doctor.first_name} ${doctor.last_name}`,
            specialty: doctor.specialty,
            license_number: doctor.license_number,
            user_type: 'doctor',
            companies: companies.map(c => c.id),
            // Si solo tiene una empresa, auto-seleccionarla
            selected_company_id: companies.length === 1 ? companies[0].id : null
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

        // Actualizar último login
        await db.sequelize.query(`
            UPDATE partners
            SET last_login_at = CURRENT_TIMESTAMP
            WHERE id = :doctorId
        `, { replacements: { doctorId: doctor.id } });

        console.log(`✅ [DOCTOR-LOGIN] Login exitoso: ${email} (${companies.length} empresa(s))`);

        res.json({
            success: true,
            token,
            token_type: 'Bearer',
            expires_in: 86400, // 24 horas en segundos
            doctor: {
                id: doctor.id,
                email: doctor.email,
                firstName: doctor.first_name,
                lastName: doctor.last_name,
                fullName: `${doctor.first_name} ${doctor.last_name}`,
                specialty: doctor.specialty,
                licenseNumber: doctor.license_number
            },
            companies: companies.map(c => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                isPrimary: c.is_primary,
                activeCases: parseInt(c.active_cases) || 0,
                pendingCases: parseInt(c.pending_cases) || 0
            })),
            // Si solo hay una empresa, no requiere selección
            requires_company_selection: companies.length > 1,
            selected_company: companies.length === 1 ? {
                id: companies[0].id,
                name: companies[0].name
            } : null
        });

    } catch (error) {
        console.error('❌ [DOCTOR-LOGIN] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error al iniciar sesión',
            details: error.message
        });
    }
});

// ============================================================================
// ENDPOINT: Seleccionar Empresa
// ============================================================================

/**
 * POST /api/medical/doctor/select-company
 *
 * Selecciona la empresa con la que el médico va a trabajar
 * Genera un nuevo token con la empresa seleccionada
 *
 * Body:
 * {
 *   "company_id": 1
 * }
 */
router.post('/select-company', doctorAuth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { company_id } = req.body;

        if (!company_id) {
            return res.status(400).json({
                success: false,
                error: 'company_id requerido'
            });
        }

        // Verificar que el médico tiene acceso a esta empresa
        const access = await db.sequelize.query(`
            SELECT
                cms.*,
                c.name as company_name,
                c.slug as company_slug
            FROM company_medical_staff cms
            JOIN companies c ON cms.company_id = c.company_id
            WHERE cms.partner_id = :doctorId
              AND cms.company_id = :companyId
              AND cms.is_active = true
              AND c.is_active = true
        `, {
            replacements: {
                doctorId: req.doctor.partner_id,
                companyId: company_id
            },
            type: db.sequelize.QueryTypes.SELECT
        });

        if (!access || access.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'No tiene acceso a esta empresa',
                code: 'NO_COMPANY_ACCESS'
            });
        }

        const companyData = access[0];

        // Generar nuevo token con empresa seleccionada
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        const newTokenPayload = {
            partner_id: req.doctor.partner_id,
            email: req.doctor.email,
            name: req.doctor.name,
            specialty: req.doctor.specialty,
            license_number: req.doctor.license_number,
            user_type: 'doctor',
            companies: req.doctor.companies,
            selected_company_id: company_id
        };

        const newToken = jwt.sign(newTokenPayload, JWT_SECRET, { expiresIn: '24h' });

        // Obtener estadísticas de casos para esta empresa
        const stats = await db.sequelize.query(`
            SELECT
                COUNT(*) FILTER (WHERE case_status = 'pending') as pending,
                COUNT(*) FILTER (WHERE case_status = 'under_review') as under_review,
                COUNT(*) FILTER (WHERE case_status IN ('awaiting_docs', 'needs_follow_up')) as awaiting_action,
                COUNT(*) FILTER (WHERE case_status NOT IN ('closed', 'justified', 'not_justified')) as total_active
            FROM absence_cases
            WHERE company_id = :companyId
              AND assigned_doctor_id = :doctorId
        `, {
            replacements: { companyId: company_id, doctorId: req.doctor.partner_id },
            type: db.sequelize.QueryTypes.SELECT
        });

        console.log(`✅ [DOCTOR-SELECT-COMPANY] Médico ${req.doctor.partner_id} seleccionó empresa ${company_id}`);

        res.json({
            success: true,
            message: 'Empresa seleccionada exitosamente',
            token: newToken,
            selected_company: {
                id: company_id,
                name: companyData.company_name,
                slug: companyData.company_slug,
                isPrimary: companyData.is_primary
            },
            case_stats: {
                pending: parseInt(stats[0]?.pending) || 0,
                underReview: parseInt(stats[0]?.under_review) || 0,
                awaitingAction: parseInt(stats[0]?.awaiting_action) || 0,
                totalActive: parseInt(stats[0]?.total_active) || 0
            }
        });

    } catch (error) {
        console.error('❌ [DOCTOR-SELECT-COMPANY] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error al seleccionar empresa',
            details: error.message
        });
    }
});

// ============================================================================
// ENDPOINT: Obtener Empresas Asignadas
// ============================================================================

/**
 * GET /api/medical/doctor/companies
 *
 * Obtiene la lista de empresas asignadas al médico con estadísticas
 */
router.get('/companies', doctorAuth, async (req, res) => {
    const db = require('../config/database');

    try {
        const companies = await db.sequelize.query(`
            SELECT
                c.company_id as id,
                c.name,
                c.slug,
                c.contact_email,
                c.phone,
                cms.is_primary,
                cms.is_active,
                cms.assigned_at,
                (SELECT COUNT(*) FROM absence_cases ac
                 WHERE ac.company_id = c.company_id
                   AND ac.assigned_doctor_id = :doctorId
                   AND ac.case_status NOT IN ('closed', 'justified', 'not_justified')) as active_cases,
                (SELECT COUNT(*) FROM absence_cases ac
                 WHERE ac.company_id = c.company_id
                   AND ac.assigned_doctor_id = :doctorId
                   AND ac.case_status = 'pending') as pending_cases,
                (SELECT COUNT(DISTINCT employee_id) FROM absence_cases ac
                 WHERE ac.company_id = c.company_id
                   AND ac.assigned_doctor_id = :doctorId) as total_patients
            FROM company_medical_staff cms
            JOIN companies c ON cms.company_id = c.company_id
            WHERE cms.partner_id = :doctorId
              AND cms.is_active = true
              AND c.is_active = true
            ORDER BY cms.is_primary DESC, c.name ASC
        `, {
            replacements: { doctorId: req.doctor.partner_id },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            doctor: {
                id: req.doctor.partner_id,
                name: req.doctor.name,
                email: req.doctor.email,
                specialty: req.doctor.specialty
            },
            selected_company_id: req.doctor.selected_company_id,
            companies: companies.map(c => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                contactEmail: c.contact_email,
                phone: c.phone,
                isPrimary: c.is_primary,
                assignedAt: c.assigned_at,
                activeCases: parseInt(c.active_cases) || 0,
                pendingCases: parseInt(c.pending_cases) || 0,
                totalPatients: parseInt(c.total_patients) || 0,
                isSelected: c.id === req.doctor.selected_company_id
            })),
            total: companies.length
        });

    } catch (error) {
        console.error('❌ [DOCTOR-COMPANIES] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener empresas',
            details: error.message
        });
    }
});

// ============================================================================
// ENDPOINT: Dashboard del Médico
// ============================================================================

/**
 * GET /api/medical/doctor/dashboard
 *
 * Dashboard con resumen de casos y estadísticas para la empresa seleccionada
 */
router.get('/dashboard', doctorAuth, requireCompanySelected, async (req, res) => {
    const db = require('../config/database');

    try {
        const companyId = req.doctor.selected_company_id;
        const doctorId = req.doctor.partner_id;

        // Obtener estadísticas de casos
        const caseStats = await db.sequelize.query(`
            SELECT
                COUNT(*) FILTER (WHERE case_status = 'pending') as pending,
                COUNT(*) FILTER (WHERE case_status = 'under_review') as under_review,
                COUNT(*) FILTER (WHERE case_status = 'awaiting_docs') as awaiting_docs,
                COUNT(*) FILTER (WHERE case_status = 'needs_follow_up') as needs_follow_up,
                COUNT(*) FILTER (WHERE case_status IN ('justified', 'not_justified', 'closed')) as resolved,
                COUNT(*) FILTER (WHERE is_justified = true) as justified,
                COUNT(*) FILTER (WHERE is_justified = false AND case_status IN ('justified', 'not_justified', 'closed')) as not_justified,
                COUNT(*) as total,
                COUNT(DISTINCT employee_id) as unique_patients
            FROM absence_cases
            WHERE company_id = :companyId
              AND assigned_doctor_id = :doctorId
        `, {
            replacements: { companyId, doctorId },
            type: db.sequelize.QueryTypes.SELECT
        });

        // Casos pendientes con más de 3 días (urgentes)
        const urgentCases = await db.sequelize.query(`
            SELECT
                ac.id,
                ac.absence_type,
                ac.start_date,
                ac.requested_days,
                ac.case_status,
                ac.created_at,
                EXTRACT(DAY FROM (CURRENT_TIMESTAMP - ac.created_at)) as days_pending,
                u."firstName" || ' ' || u."lastName" as employee_name,
                u.dni
            FROM absence_cases ac
            JOIN users u ON ac.employee_id = u.user_id
            WHERE ac.company_id = :companyId
              AND ac.assigned_doctor_id = :doctorId
              AND ac.case_status = 'pending'
              AND ac.created_at < CURRENT_TIMESTAMP - INTERVAL '3 days'
            ORDER BY ac.created_at ASC
            LIMIT 5
        `, {
            replacements: { companyId, doctorId },
            type: db.sequelize.QueryTypes.SELECT
        });

        // Últimos casos asignados (recientes)
        const recentCases = await db.sequelize.query(`
            SELECT
                ac.id,
                ac.absence_type,
                ac.start_date,
                ac.requested_days,
                ac.case_status,
                ac.created_at,
                u."firstName" || ' ' || u."lastName" as employee_name,
                u.dni,
                d.name as department
            FROM absence_cases ac
            JOIN users u ON ac.employee_id = u.user_id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE ac.company_id = :companyId
              AND ac.assigned_doctor_id = :doctorId
              AND ac.case_status NOT IN ('closed', 'justified', 'not_justified')
            ORDER BY ac.created_at DESC
            LIMIT 10
        `, {
            replacements: { companyId, doctorId },
            type: db.sequelize.QueryTypes.SELECT
        });

        // Mensajes sin leer
        const unreadMessages = await db.sequelize.query(`
            SELECT COUNT(*) as count
            FROM medical_communications mc
            JOIN absence_cases ac ON mc.absence_case_id = ac.id
            WHERE ac.company_id = :companyId
              AND ac.assigned_doctor_id = :doctorId
              AND mc.receiver_type = 'doctor'
              AND mc.is_read = false
        `, {
            replacements: { companyId, doctorId },
            type: db.sequelize.QueryTypes.SELECT
        });

        // Datos de la empresa
        const companyInfo = await db.sequelize.query(`
            SELECT name, slug, contact_email, phone
            FROM companies
            WHERE company_id = :companyId
        `, {
            replacements: { companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        const stats = caseStats[0] || {};

        res.json({
            success: true,
            doctor: {
                id: req.doctor.partner_id,
                name: req.doctor.name,
                specialty: req.doctor.specialty,
                licenseNumber: req.doctor.license_number
            },
            company: companyInfo[0] || null,
            statistics: {
                pending: parseInt(stats.pending) || 0,
                underReview: parseInt(stats.under_review) || 0,
                awaitingDocs: parseInt(stats.awaiting_docs) || 0,
                needsFollowUp: parseInt(stats.needs_follow_up) || 0,
                resolved: parseInt(stats.resolved) || 0,
                justified: parseInt(stats.justified) || 0,
                notJustified: parseInt(stats.not_justified) || 0,
                total: parseInt(stats.total) || 0,
                uniquePatients: parseInt(stats.unique_patients) || 0,
                unreadMessages: parseInt(unreadMessages[0]?.count) || 0
            },
            urgentCases: urgentCases.map(c => ({
                id: c.id,
                absenceType: c.absence_type,
                startDate: c.start_date,
                requestedDays: c.requested_days,
                status: c.case_status,
                createdAt: c.created_at,
                daysPending: Math.floor(c.days_pending),
                employeeName: c.employee_name,
                dni: c.dni
            })),
            recentCases: recentCases.map(c => ({
                id: c.id,
                absenceType: c.absence_type,
                startDate: c.start_date,
                requestedDays: c.requested_days,
                status: c.case_status,
                createdAt: c.created_at,
                employeeName: c.employee_name,
                dni: c.dni,
                department: c.department
            }))
        });

    } catch (error) {
        console.error('❌ [DOCTOR-DASHBOARD] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener dashboard',
            details: error.message
        });
    }
});

// ============================================================================
// ENDPOINT: Casos Pendientes del Médico
// ============================================================================

/**
 * GET /api/medical/doctor/cases/pending
 *
 * Lista de casos pendientes de la empresa seleccionada
 */
router.get('/cases/pending', doctorAuth, requireCompanySelected, async (req, res) => {
    const db = require('../config/database');

    try {
        const companyId = req.doctor.selected_company_id;
        const doctorId = req.doctor.partner_id;
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const cases = await db.sequelize.query(`
            SELECT
                ac.id,
                ac.absence_type,
                ac.start_date,
                ac.end_date,
                ac.requested_days,
                ac.case_status,
                ac.employee_description,
                ac.employee_attachments,
                ac.created_at,
                ac.assignment_date,
                u.user_id as employee_id,
                u."firstName" || ' ' || u."lastName" as employee_name,
                u."employeeId" as legajo,
                u.dni,
                u.email as employee_email,
                u.phone as employee_phone,
                d.name as department,
                (SELECT COUNT(*) FROM medical_communications mc
                 WHERE mc.absence_case_id = ac.id
                   AND mc.is_read = false
                   AND mc.receiver_type = 'doctor') as unread_messages
            FROM absence_cases ac
            JOIN users u ON ac.employee_id = u.user_id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE ac.company_id = :companyId
              AND ac.assigned_doctor_id = :doctorId
              AND ac.case_status NOT IN ('closed', 'justified', 'not_justified')
            ORDER BY
                CASE WHEN ac.case_status = 'pending' THEN 0 ELSE 1 END,
                ac.created_at ASC
            LIMIT :limit OFFSET :offset
        `, {
            replacements: { companyId, doctorId, limit: parseInt(limit), offset },
            type: db.sequelize.QueryTypes.SELECT
        });

        // Contar total
        const countResult = await db.sequelize.query(`
            SELECT COUNT(*) as total
            FROM absence_cases
            WHERE company_id = :companyId
              AND assigned_doctor_id = :doctorId
              AND case_status NOT IN ('closed', 'justified', 'not_justified')
        `, {
            replacements: { companyId, doctorId },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            cases: cases.map(c => ({
                id: c.id,
                absenceType: c.absence_type,
                startDate: c.start_date,
                endDate: c.end_date,
                requestedDays: c.requested_days,
                status: c.case_status,
                description: c.employee_description,
                attachments: c.employee_attachments,
                createdAt: c.created_at,
                assignmentDate: c.assignment_date,
                employee: {
                    id: c.employee_id,
                    name: c.employee_name,
                    legajo: c.legajo,
                    dni: c.dni,
                    email: c.employee_email,
                    phone: c.employee_phone,
                    department: c.department
                },
                unreadMessages: parseInt(c.unread_messages) || 0
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult[0]?.total) || 0,
                totalPages: Math.ceil((countResult[0]?.total || 0) / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('❌ [DOCTOR-CASES-PENDING] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener casos pendientes',
            details: error.message
        });
    }
});

// ============================================================================
// ENDPOINT: Perfil del Médico
// ============================================================================

/**
 * GET /api/medical/doctor/profile
 *
 * Obtiene el perfil completo del médico autenticado
 */
router.get('/profile', doctorAuth, async (req, res) => {
    const db = require('../config/database');

    try {
        const doctors = await db.sequelize.query(`
            SELECT
                id,
                email,
                first_name,
                last_name,
                phone,
                mobile,
                specialty,
                license_number,
                bio,
                profile_photo_url,
                city,
                province,
                country,
                experience_years,
                certifications,
                education,
                languages,
                rating,
                total_reviews,
                total_services,
                created_at
            FROM partners
            WHERE id = :doctorId
              AND is_medical_staff = true
        `, {
            replacements: { doctorId: req.doctor.partner_id },
            type: db.sequelize.QueryTypes.SELECT
        });

        if (!doctors || doctors.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Médico no encontrado'
            });
        }

        const doctor = doctors[0];

        res.json({
            success: true,
            profile: {
                id: doctor.id,
                email: doctor.email,
                firstName: doctor.first_name,
                lastName: doctor.last_name,
                fullName: `${doctor.first_name} ${doctor.last_name}`,
                phone: doctor.phone,
                mobile: doctor.mobile,
                specialty: doctor.specialty,
                licenseNumber: doctor.license_number,
                bio: doctor.bio,
                profilePhotoUrl: doctor.profile_photo_url,
                location: {
                    city: doctor.city,
                    province: doctor.province,
                    country: doctor.country
                },
                experienceYears: doctor.experience_years,
                certifications: doctor.certifications,
                education: doctor.education,
                languages: doctor.languages,
                stats: {
                    rating: parseFloat(doctor.rating) || 0,
                    totalReviews: doctor.total_reviews || 0,
                    totalServices: doctor.total_services || 0
                },
                memberSince: doctor.created_at
            }
        });

    } catch (error) {
        console.error('❌ [DOCTOR-PROFILE] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener perfil',
            details: error.message
        });
    }
});

// ============================================================================
// ENDPOINT: Verificar Token
// ============================================================================

/**
 * GET /api/medical/doctor/verify-token
 *
 * Verifica si el token actual es válido
 */
router.get('/verify-token', doctorAuth, (req, res) => {
    res.json({
        success: true,
        valid: true,
        doctor: {
            id: req.doctor.partner_id,
            email: req.doctor.email,
            name: req.doctor.name,
            specialty: req.doctor.specialty
        },
        selected_company_id: req.doctor.selected_company_id,
        companies: req.doctor.companies
    });
});

// ============================================================================
// EXPORT
// ============================================================================

// Exportar también los middlewares para uso en otras rutas
router.doctorAuth = doctorAuth;
router.requireCompanySelected = requireCompanySelected;

module.exports = router;
