/**
 * ============================================================================
 * OCCUPATIONAL HEALTH ENTERPRISE ROUTES - Sistema Internacional
 * ============================================================================
 * Rutas para módulo Occupational Health & Absence Management Enterprise v5.0
 * Sistema profesional multi-país para gestión de ausencias y salud ocupacional
 *
 * @version 5.0.0
 * @date 2025-01-30
 * @standards ISO 45001, ILO C155, GDPR, WHO Guidelines
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================================================
// MULTER CONFIGURATION - File uploads
// ============================================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/occupational-health');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `oh-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images, PDFs, and Office documents are allowed'));
        }
    }
});

// ============================================================================
// SECTION 1: ABSENCE CASES - CRUD Operations
// ============================================================================

/**
 * GET /api/occupational-health/cases
 * Get all absence cases with advanced filtering, pagination, sorting
 */
router.get('/cases', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const {
            page = 1,
            limit = 20,
            status,
            type,
            dateFrom,
            dateTo,
            department,
            search,
            sortField = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;

        // Build WHERE conditions
        let conditions = ['ac.company_id = :companyId'];
        const replacements = { companyId, limit: parseInt(limit), offset: parseInt(offset) };

        if (status && status !== 'all') {
            conditions.push('ac.case_status = :status');
            replacements.status = status;
        }

        if (type && type !== 'all') {
            conditions.push('ac.absence_type = :type');
            replacements.type = type;
        }

        if (dateFrom) {
            conditions.push('ac.start_date >= :dateFrom');
            replacements.dateFrom = dateFrom;
        }

        if (dateTo) {
            conditions.push('ac.start_date <= :dateTo');
            replacements.dateTo = dateTo;
        }

        if (department && department !== 'all') {
            conditions.push('d.id = :department');
            replacements.department = parseInt(department);
        }

        if (search) {
            conditions.push(`(
                u."firstName" ILIKE :search OR
                u."lastName" ILIKE :search OR
                u."employeeId" ILIKE :search OR
                u.dni ILIKE :search
            )`);
            replacements.search = `%${search}%`;
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        // Validate sort field
        const allowedSortFields = ['created_at', 'start_date', 'case_status', 'absence_type', 'requested_days'];
        const validSortField = allowedSortFields.includes(sortField) ? sortField : 'created_at';
        const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const [countResult] = await db.sequelize.query(`
            SELECT COUNT(*) as total
            FROM absence_cases ac
            JOIN users u ON ac.employee_id = u.user_id
            LEFT JOIN departments d ON u.department_id = d.id
            ${whereClause}
        `, {
            replacements,
            type: db.sequelize.QueryTypes.SELECT
        });

        // Get paginated data
        const [cases] = await db.sequelize.query(`
            SELECT
                ac.id,
                ac.absence_type,
                ac.start_date,
                ac.end_date,
                ac.requested_days,
                ac.approved_days,
                ac.case_status,
                ac.is_justified,
                ac.created_at,
                ac.updated_at,
                u."firstName" || ' ' || u."lastName" as employee_name,
                u."employeeId" as employee_number,
                u.dni as employee_dni,
                d.name as department,
                ms.first_name || ' ' || ms.last_name as assigned_doctor,
                ms.specialty as doctor_specialty,
                (SELECT COUNT(*) FROM medical_communications mc
                 WHERE mc.absence_case_id = ac.id) as messages_count,
                (SELECT COUNT(*) FROM medical_communications mc
                 WHERE mc.absence_case_id = ac.id
                   AND mc.is_read = false
                   AND mc.receiver_type = 'hr') as unread_messages
            FROM absence_cases ac
            JOIN users u ON ac.employee_id = u.user_id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN medical_staff ms ON ac.assigned_doctor_id = ms.id
            ${whereClause}
            ORDER BY ac.${validSortField} ${validSortOrder}
            LIMIT :limit OFFSET :offset
        `, {
            replacements,
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: cases,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.total),
                totalPages: Math.ceil(countResult.total / limit)
            }
        });

    } catch (error) {
        console.error('❌ Error fetching absence cases:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching absence cases',
            details: error.message
        });
    }
});

/**
 * GET /api/occupational-health/cases/:id
 * Get single absence case with full details
 */
router.get('/cases/:id', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { id } = req.params;
        const { companyId } = req.user;

        const [caseData] = await db.sequelize.query(`
            SELECT
                ac.*,
                u."firstName" || ' ' || u."lastName" as employee_name,
                u."employeeId" as employee_number,
                u.dni as employee_dni,
                u.email as employee_email,
                u.phone as employee_phone,
                u.birth_date as employee_birth_date,
                d.name as department,
                s.name as shift,
                ms.first_name || ' ' || ms.last_name as assigned_doctor_name,
                ms.email as doctor_email,
                ms.phone as doctor_phone,
                ms.specialty as doctor_specialty,
                ms.license_number as doctor_license,
                creator."firstName" || ' ' || creator."lastName" as created_by_name,
                closer."firstName" || ' ' || closer."lastName" as closed_by_name
            FROM absence_cases ac
            JOIN users u ON ac.employee_id = u.user_id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN shifts s ON u.shift_id = s.id
            LEFT JOIN medical_staff ms ON ac.assigned_doctor_id = ms.id
            LEFT JOIN users creator ON ac.created_by = creator.user_id
            LEFT JOIN users closer ON ac.closed_by = closer.user_id
            WHERE ac.id = :id
              AND ac.company_id = :companyId
        `, {
            replacements: { id, companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        if (caseData.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Case not found'
            });
        }

        res.json({
            success: true,
            data: caseData[0]
        });

    } catch (error) {
        console.error('❌ Error fetching case details:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching case details',
            details: error.message
        });
    }
});

/**
 * POST /api/occupational-health/cases
 * Create new absence case
 */
router.post('/cases', auth, upload.array('attachments', 5), async (req, res) => {
    const db = require('../config/database');

    try {
        const {
            employee_id,
            absence_type,
            start_date,
            end_date,
            requested_days,
            employee_description,
            notify_art
        } = req.body;

        const { companyId, user_id } = req.user;

        // Validations
        if (!employee_id || !absence_type || !start_date || !requested_days) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: employee_id, absence_type, start_date, requested_days'
            });
        }

        // Process attachments
        const attachments = req.files ? req.files.map(file => ({
            filename: file.originalname,
            url: `/uploads/occupational-health/${file.filename}`,
            type: file.mimetype,
            size: file.size,
            uploaded_at: new Date().toISOString()
        })) : [];

        // Create case
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
                notify_art,
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
                :notify_art,
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
                notify_art: notify_art === 'true' || notify_art === true,
                created_by: user_id
            },
            type: db.sequelize.QueryTypes.INSERT
        });

        const newCase = result[0];

        res.status(201).json({
            success: true,
            message: 'Absence case created successfully',
            data: {
                id: newCase.id,
                status: newCase.case_status,
                assigned_doctor_id: newCase.assigned_doctor_id
            }
        });

    } catch (error) {
        console.error('❌ Error creating absence case:', error);
        res.status(500).json({
            success: false,
            error: 'Error creating absence case',
            details: error.message
        });
    }
});

/**
 * PUT /api/occupational-health/cases/:id
 * Update absence case
 */
router.put('/cases/:id', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { id } = req.params;
        const { companyId, user_id } = req.user;
        const updates = req.body;

        // Build SET clause dynamically
        const allowedFields = [
            'absence_type', 'start_date', 'end_date', 'requested_days', 'approved_days',
            'employee_description', 'medical_conclusion', 'final_diagnosis',
            'is_justified', 'justification_reason', 'case_status'
        ];

        const setFields = [];
        const replacements = { id, companyId, user_id };

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                setFields.push(`${key} = :${key}`);
                replacements[key] = updates[key];
            }
        });

        if (setFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update'
            });
        }

        setFields.push('updated_at = CURRENT_TIMESTAMP');
        setFields.push('last_modified_by = :user_id');

        await db.sequelize.query(`
            UPDATE absence_cases
            SET ${setFields.join(', ')}
            WHERE id = :id
              AND company_id = :companyId
        `, { replacements });

        res.json({
            success: true,
            message: 'Case updated successfully'
        });

    } catch (error) {
        console.error('❌ Error updating case:', error);
        res.status(500).json({
            success: false,
            error: 'Error updating case',
            details: error.message
        });
    }
});

/**
 * POST /api/occupational-health/cases/:id/close
 * Close absence case
 */
router.post('/cases/:id/close', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { id } = req.params;
        const { companyId, user_id } = req.user;
        const { final_status, closure_notes } = req.body;

        await db.sequelize.query(`
            UPDATE absence_cases
            SET
                case_status = :final_status,
                case_closed_date = CURRENT_TIMESTAMP,
                closed_by = :user_id,
                medical_conclusion = COALESCE(medical_conclusion, :closure_notes)
            WHERE id = :id
              AND company_id = :companyId
        `, {
            replacements: {
                id,
                companyId,
                user_id,
                final_status: final_status || 'closed',
                closure_notes: closure_notes || 'Case closed'
            }
        });

        res.json({
            success: true,
            message: 'Case closed successfully'
        });

    } catch (error) {
        console.error('❌ Error closing case:', error);
        res.status(500).json({
            success: false,
            error: 'Error closing case',
            details: error.message
        });
    }
});

/**
 * POST /api/occupational-health/cases/:id/reopen
 * Reopen closed case
 */
router.post('/cases/:id/reopen', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { id } = req.params;
        const { companyId, user_id } = req.user;
        const { reason } = req.body;

        await db.sequelize.query(`
            UPDATE absence_cases
            SET
                case_status = 'under_review',
                case_closed_date = NULL,
                closed_by = NULL,
                last_modified_by = :user_id
            WHERE id = :id
              AND company_id = :companyId
              AND case_status = 'closed'
        `, {
            replacements: { id, companyId, user_id }
        });

        // Log reopen action
        await db.sequelize.query(`
            INSERT INTO medical_communications (
                company_id,
                absence_case_id,
                sender_type,
                sender_id,
                message_type,
                message
            ) VALUES (
                :companyId,
                :id,
                'hr',
                :user_id,
                'follow_up',
                :message
            )
        `, {
            replacements: {
                companyId,
                id,
                user_id,
                message: `Case reopened. Reason: ${reason || 'Not specified'}`
            }
        });

        res.json({
            success: true,
            message: 'Case reopened successfully'
        });

    } catch (error) {
        console.error('❌ Error reopening case:', error);
        res.status(500).json({
            success: false,
            error: 'Error reopening case',
            details: error.message
        });
    }
});

/**
 * POST /api/occupational-health/cases/:id/assign-doctor
 * Assign or reassign doctor to case
 */
router.post('/cases/:id/assign-doctor', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { id } = req.params;
        const { companyId } = req.user;
        const { doctor_id } = req.body;

        if (!doctor_id) {
            return res.status(400).json({
                success: false,
                error: 'doctor_id is required'
            });
        }

        // Verify doctor belongs to company
        const [doctor] = await db.sequelize.query(`
            SELECT id FROM medical_staff
            WHERE id = :doctor_id
              AND company_id = :companyId
              AND is_active = true
        `, {
            replacements: { doctor_id, companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        if (doctor.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found or not active'
            });
        }

        await db.sequelize.query(`
            UPDATE absence_cases
            SET
                assigned_doctor_id = :doctor_id,
                assignment_date = CURRENT_TIMESTAMP,
                case_status = 'under_review'
            WHERE id = :id
              AND company_id = :companyId
        `, {
            replacements: { id, companyId, doctor_id }
        });

        res.json({
            success: true,
            message: 'Doctor assigned successfully'
        });

    } catch (error) {
        console.error('❌ Error assigning doctor:', error);
        res.status(500).json({
            success: false,
            error: 'Error assigning doctor',
            details: error.message
        });
    }
});

// ============================================================================
// SECTION 2: MEDICAL COMMUNICATIONS
// ============================================================================

/**
 * GET /api/occupational-health/cases/:id/communications
 * Get all communications for a case
 */
router.get('/cases/:id/communications', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { id } = req.params;
        const { companyId } = req.user;

        const [messages] = await db.sequelize.query(`
            SELECT
                mc.*,
                CASE
                    WHEN mc.sender_type = 'employee' THEN u."firstName" || ' ' || u."lastName"
                    WHEN mc.sender_type = 'doctor' THEN ms.first_name || ' ' || ms.last_name
                    WHEN mc.sender_type = 'hr' THEN u2."firstName" || ' ' || u2."lastName"
                    ELSE 'System'
                END as sender_name,
                CASE
                    WHEN mc.sender_type = 'employee' THEN u.email
                    WHEN mc.sender_type = 'doctor' THEN ms.email
                    WHEN mc.sender_type = 'hr' THEN u2.email
                    ELSE NULL
                END as sender_email
            FROM medical_communications mc
            LEFT JOIN users u ON mc.sender_id = u.user_id AND mc.sender_type = 'employee'
            LEFT JOIN medical_staff ms ON mc.sender_id = ms.id AND mc.sender_type = 'doctor'
            LEFT JOIN users u2 ON mc.sender_id = u2.user_id AND mc.sender_type = 'hr'
            WHERE mc.absence_case_id = :id
              AND mc.company_id = :companyId
            ORDER BY mc.created_at ASC
        `, {
            replacements: { id, companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: messages
        });

    } catch (error) {
        console.error('❌ Error fetching communications:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching communications',
            details: error.message
        });
    }
});

/**
 * POST /api/occupational-health/cases/:id/communications
 * Send new communication message
 */
router.post('/cases/:id/communications', auth, upload.array('attachments', 3), async (req, res) => {
    const db = require('../config/database');

    try {
        const { id } = req.params;
        const { companyId, user_id, role } = req.user;
        const {
            message,
            message_type = 'follow_up',
            receiver_type = 'employee',
            receiver_id,
            requires_response = false
        } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'message is required'
            });
        }

        // Process attachments
        const attachments = req.files ? req.files.map(file => ({
            filename: file.originalname,
            url: `/uploads/occupational-health/${file.filename}`,
            type: file.mimetype,
            size: file.size
        })) : [];

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
                :absence_case_id,
                'hr',
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
                absence_case_id: id,
                sender_id: user_id,
                receiver_type,
                receiver_id: receiver_id || null,
                message_type,
                message,
                attachments: JSON.stringify(attachments),
                requires_response: requires_response === 'true' || requires_response === true
            }
        });

        res.status(201).json({
            success: true,
            message: 'Communication sent successfully'
        });

    } catch (error) {
        console.error('❌ Error sending communication:', error);
        res.status(500).json({
            success: false,
            error: 'Error sending communication',
            details: error.message
        });
    }
});

/**
 * PUT /api/occupational-health/communications/:msgId/read
 * Mark communication as read
 */
router.put('/communications/:msgId/read', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { msgId } = req.params;
        const { companyId } = req.user;

        await db.sequelize.query(`
            UPDATE medical_communications
            SET is_read = true, read_at = CURRENT_TIMESTAMP
            WHERE id = :msgId
              AND company_id = :companyId
        `, {
            replacements: { msgId, companyId }
        });

        res.json({
            success: true,
            message: 'Message marked as read'
        });

    } catch (error) {
        console.error('❌ Error marking message as read:', error);
        res.status(500).json({
            success: false,
            error: 'Error marking message as read',
            details: error.message
        });
    }
});

// ============================================================================
// SECTION 3: ANALYTICS & DASHBOARDS
// ============================================================================

/**
 * GET /api/occupational-health/analytics/dashboard
 * Get dashboard KPIs and summary stats
 */
router.get('/analytics/dashboard', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const { period = '30' } = req.query; // days

        const [stats] = await db.sequelize.query(`
            SELECT
                COUNT(*) FILTER (WHERE case_status NOT IN ('closed', 'justified', 'not_justified')) as active_cases,
                COUNT(*) FILTER (WHERE case_status = 'pending') as pending_review,
                COUNT(*) FILTER (WHERE case_status = 'awaiting_docs') as awaiting_docs,
                COUNT(*) FILTER (WHERE is_justified = true) as justified_cases,
                COUNT(*) FILTER (WHERE is_justified = false) as not_justified_cases,
                SUM(requested_days) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL ':period days') as total_days_requested,
                SUM(approved_days) FILTER (WHERE approved_days IS NOT NULL) as total_days_approved,
                AVG(EXTRACT(EPOCH FROM (doctor_response_date - created_at))/3600) FILTER (WHERE doctor_response_date IS NOT NULL) as avg_response_time_hours,
                AVG(EXTRACT(EPOCH FROM (case_closed_date - created_at))/86400) FILTER (WHERE case_closed_date IS NOT NULL) as avg_case_duration_days
            FROM absence_cases
            WHERE company_id = :companyId
              AND created_at >= CURRENT_DATE - INTERVAL ':period days'
        `, {
            replacements: { companyId, period },
            type: db.sequelize.QueryTypes.SELECT
        });

        // Absence by type breakdown
        const [typeBreakdown] = await db.sequelize.query(`
            SELECT
                absence_type,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 2) as percentage
            FROM absence_cases
            WHERE company_id = :companyId
              AND created_at >= CURRENT_DATE - INTERVAL ':period days'
            GROUP BY absence_type
            ORDER BY count DESC
        `, {
            replacements: { companyId, period },
            type: db.sequelize.QueryTypes.SELECT
        });

        // Recent cases
        const [recentCases] = await db.sequelize.query(`
            SELECT
                ac.id,
                ac.absence_type,
                ac.start_date,
                ac.case_status,
                u."firstName" || ' ' || u."lastName" as employee_name,
                ms.first_name || ' ' || ms.last_name as doctor_name
            FROM absence_cases ac
            JOIN users u ON ac.employee_id = u.user_id
            LEFT JOIN medical_staff ms ON ac.assigned_doctor_id = ms.id
            WHERE ac.company_id = :companyId
            ORDER BY ac.created_at DESC
            LIMIT 10
        `, {
            replacements: { companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: {
                kpis: stats[0],
                type_breakdown: typeBreakdown,
                recent_cases: recentCases
            }
        });

    } catch (error) {
        console.error('❌ Error fetching dashboard analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching dashboard analytics',
            details: error.message
        });
    }
});

/**
 * GET /api/occupational-health/analytics/absence-trends
 * Get absence trends over time (for charts)
 */
router.get('/analytics/absence-trends', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const { period = '12months', groupBy = 'month' } = req.query;

        let dateFormat, intervalValue;
        if (period === '30days' || groupBy === 'day') {
            dateFormat = 'YYYY-MM-DD';
            intervalValue = '30 days';
        } else if (period === '12months' || groupBy === 'month') {
            dateFormat = 'YYYY-MM';
            intervalValue = '12 months';
        } else {
            dateFormat = 'YYYY-MM';
            intervalValue = '12 months';
        }

        const [trends] = await db.sequelize.query(`
            SELECT
                TO_CHAR(start_date, :dateFormat) as period,
                COUNT(*) as total_cases,
                COUNT(*) FILTER (WHERE absence_type = 'medical_illness') as medical_illness,
                COUNT(*) FILTER (WHERE absence_type = 'work_accident') as work_accident,
                COUNT(*) FILTER (WHERE absence_type = 'non_work_accident') as non_work_accident,
                COUNT(*) FILTER (WHERE absence_type = 'occupational_disease') as occupational_disease,
                COUNT(*) FILTER (WHERE absence_type = 'maternity') as maternity,
                COUNT(*) FILTER (WHERE absence_type = 'family_care') as family_care,
                SUM(requested_days) as total_days
            FROM absence_cases
            WHERE company_id = :companyId
              AND start_date >= CURRENT_DATE - INTERVAL :intervalValue
            GROUP BY TO_CHAR(start_date, :dateFormat)
            ORDER BY period ASC
        `, {
            replacements: { companyId, dateFormat, intervalValue },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: trends
        });

    } catch (error) {
        console.error('❌ Error fetching absence trends:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching absence trends',
            details: error.message
        });
    }
});

/**
 * GET /api/occupational-health/analytics/absence-cost
 * Get absence cost analysis (direct + indirect costs)
 */
router.get('/analytics/absence-cost', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const { period = '12months' } = req.query;

        let intervalValue = period === '30days' ? '30 days' : '12 months';

        // Note: This is a simplified cost calculation
        // In production, you'd need salary data, replacement costs, etc.
        const [costData] = await db.sequelize.query(`
            SELECT
                absence_type,
                COUNT(*) as case_count,
                SUM(requested_days) as total_days_lost,
                SUM(approved_days) FILTER (WHERE approved_days IS NOT NULL) as total_days_approved,
                -- Placeholder cost calculation (needs salary integration)
                SUM(requested_days) * 100 as estimated_direct_cost,
                SUM(requested_days) * 50 as estimated_indirect_cost
            FROM absence_cases
            WHERE company_id = :companyId
              AND created_at >= CURRENT_DATE - INTERVAL :intervalValue
            GROUP BY absence_type
            ORDER BY total_days_lost DESC
        `, {
            replacements: { companyId, intervalValue },
            type: db.sequelize.QueryTypes.SELECT
        });

        // Top departments by absence cost
        const [deptCosts] = await db.sequelize.query(`
            SELECT
                d.name as department,
                COUNT(*) as case_count,
                SUM(ac.requested_days) as total_days_lost,
                SUM(ac.requested_days) * 100 as estimated_cost
            FROM absence_cases ac
            JOIN users u ON ac.employee_id = u.user_id
            JOIN departments d ON u.department_id = d.id
            WHERE ac.company_id = :companyId
              AND ac.created_at >= CURRENT_DATE - INTERVAL :intervalValue
            GROUP BY d.name
            ORDER BY total_days_lost DESC
            LIMIT 10
        `, {
            replacements: { companyId, intervalValue },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: {
                by_type: costData,
                by_department: deptCosts
            }
        });

    } catch (error) {
        console.error('❌ Error fetching cost analysis:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching cost analysis',
            details: error.message
        });
    }
});

/**
 * GET /api/occupational-health/analytics/rtw-metrics
 * Get Return-to-Work (RTW) metrics
 */
router.get('/analytics/rtw-metrics', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const { period = '12months' } = req.query;

        let intervalValue = period === '30days' ? '30 days' : '12 months';

        const [rtwMetrics] = await db.sequelize.query(`
            SELECT
                COUNT(*) as total_closed_cases,
                AVG(EXTRACT(EPOCH FROM (case_closed_date - start_date))/86400) as avg_days_to_rtw,
                COUNT(*) FILTER (WHERE is_justified = true) as successful_rtw,
                COUNT(*) FILTER (WHERE is_justified = false) as unsuccessful_rtw,
                ROUND(COUNT(*) FILTER (WHERE is_justified = true) * 100.0 / NULLIF(COUNT(*), 0), 2) as rtw_success_rate
            FROM absence_cases
            WHERE company_id = :companyId
              AND case_status = 'closed'
              AND case_closed_date IS NOT NULL
              AND case_closed_date >= CURRENT_DATE - INTERVAL :intervalValue
        `, {
            replacements: { companyId, intervalValue },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: rtwMetrics[0] || {}
        });

    } catch (error) {
        console.error('❌ Error fetching RTW metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching RTW metrics',
            details: error.message
        });
    }
});

/**
 * GET /api/occupational-health/analytics/department-comparison
 * Compare absence metrics across departments
 */
router.get('/analytics/department-comparison', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const { period = '12months' } = req.query;

        let intervalValue = period === '30days' ? '30 days' : '12 months';

        const [deptComparison] = await db.sequelize.query(`
            SELECT
                d.name as department,
                COUNT(DISTINCT u.user_id) as total_employees,
                COUNT(*) as total_cases,
                SUM(ac.requested_days) as total_days_lost,
                ROUND(SUM(ac.requested_days) * 1.0 / NULLIF(COUNT(DISTINCT u.user_id), 0), 2) as avg_days_per_employee,
                COUNT(*) FILTER (WHERE ac.is_justified = true) as justified,
                COUNT(*) FILTER (WHERE ac.is_justified = false) as not_justified
            FROM departments d
            LEFT JOIN users u ON d.id = u.department_id AND u.company_id = :companyId
            LEFT JOIN absence_cases ac ON u.user_id = ac.employee_id
                AND ac.created_at >= CURRENT_DATE - INTERVAL :intervalValue
            WHERE d.company_id = :companyId
            GROUP BY d.id, d.name
            ORDER BY total_cases DESC
        `, {
            replacements: { companyId, intervalValue },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: deptComparison
        });

    } catch (error) {
        console.error('❌ Error fetching department comparison:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching department comparison',
            details: error.message
        });
    }
});

// ============================================================================
// SECTION 4: MEDICAL STAFF MANAGEMENT
// ============================================================================

/**
 * GET /api/occupational-health/medical-staff
 * Get all medical staff for the company
 */
router.get('/medical-staff', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;

        const [staff] = await db.sequelize.query(`
            SELECT
                ms.*,
                (SELECT COUNT(*) FROM absence_cases ac
                 WHERE ac.assigned_doctor_id = ms.id
                   AND ac.case_status NOT IN ('closed', 'justified', 'not_justified')) as active_cases,
                (SELECT COUNT(*) FROM absence_cases ac
                 WHERE ac.assigned_doctor_id = ms.id) as total_cases_handled
            FROM medical_staff ms
            WHERE ms.company_id = :companyId
            ORDER BY ms.is_active DESC, ms.last_name ASC
        `, {
            replacements: { companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: staff
        });

    } catch (error) {
        console.error('❌ Error fetching medical staff:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching medical staff',
            details: error.message
        });
    }
});

/**
 * POST /api/occupational-health/medical-staff
 * Add new medical staff member
 */
router.post('/medical-staff', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId, user_id } = req.user;
        const {
            first_name,
            last_name,
            email,
            phone,
            license_number,
            specialty,
            sub_specialty
        } = req.body;

        if (!first_name || !last_name || !email || !license_number) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: first_name, last_name, email, license_number'
            });
        }

        const [result] = await db.sequelize.query(`
            INSERT INTO medical_staff (
                company_id,
                first_name,
                last_name,
                email,
                phone,
                license_number,
                specialty,
                sub_specialty,
                created_by
            ) VALUES (
                :companyId,
                :first_name,
                :last_name,
                :email,
                :phone,
                :license_number,
                :specialty,
                :sub_specialty,
                :created_by
            )
            RETURNING id
        `, {
            replacements: {
                companyId,
                first_name,
                last_name,
                email,
                phone: phone || null,
                license_number,
                specialty: specialty || null,
                sub_specialty: sub_specialty || null,
                created_by: user_id
            },
            type: db.sequelize.QueryTypes.INSERT
        });

        res.status(201).json({
            success: true,
            message: 'Medical staff member added successfully',
            data: { id: result[0].id }
        });

    } catch (error) {
        console.error('❌ Error adding medical staff:', error);
        res.status(500).json({
            success: false,
            error: 'Error adding medical staff',
            details: error.message
        });
    }
});

/**
 * PUT /api/occupational-health/medical-staff/:id
 * Update medical staff member
 */
router.put('/medical-staff/:id', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { id } = req.params;
        const { companyId } = req.user;
        const updates = req.body;

        const allowedFields = [
            'first_name', 'last_name', 'email', 'phone',
            'license_number', 'specialty', 'sub_specialty', 'is_active'
        ];

        const setFields = [];
        const replacements = { id, companyId };

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                setFields.push(`${key} = :${key}`);
                replacements[key] = updates[key];
            }
        });

        if (setFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update'
            });
        }

        setFields.push('updated_at = CURRENT_TIMESTAMP');

        await db.sequelize.query(`
            UPDATE medical_staff
            SET ${setFields.join(', ')}
            WHERE id = :id
              AND company_id = :companyId
        `, { replacements });

        res.json({
            success: true,
            message: 'Medical staff member updated successfully'
        });

    } catch (error) {
        console.error('❌ Error updating medical staff:', error);
        res.status(500).json({
            success: false,
            error: 'Error updating medical staff',
            details: error.message
        });
    }
});

/**
 * DELETE /api/occupational-health/medical-staff/:id
 * Deactivate medical staff member
 */
router.delete('/medical-staff/:id', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { id } = req.params;
        const { companyId } = req.user;

        await db.sequelize.query(`
            UPDATE medical_staff
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
              AND company_id = :companyId
        `, {
            replacements: { id, companyId }
        });

        res.json({
            success: true,
            message: 'Medical staff member deactivated successfully'
        });

    } catch (error) {
        console.error('❌ Error deactivating medical staff:', error);
        res.status(500).json({
            success: false,
            error: 'Error deactivating medical staff',
            details: error.message
        });
    }
});

// ============================================================================
// SECTION 5: BULK OPERATIONS
// ============================================================================

/**
 * POST /api/occupational-health/cases/bulk/assign-doctor
 * Bulk assign doctor to multiple cases
 */
router.post('/cases/bulk/assign-doctor', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const { case_ids, doctor_id } = req.body;

        if (!case_ids || !Array.isArray(case_ids) || case_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'case_ids array is required'
            });
        }

        if (!doctor_id) {
            return res.status(400).json({
                success: false,
                error: 'doctor_id is required'
            });
        }

        const [result] = await db.sequelize.query(`
            UPDATE absence_cases
            SET assigned_doctor_id = :doctor_id,
                assignment_date = CURRENT_TIMESTAMP,
                case_status = 'under_review'
            WHERE id = ANY(:case_ids::uuid[])
              AND company_id = :companyId
        `, {
            replacements: {
                case_ids,
                doctor_id,
                companyId
            }
        });

        res.json({
            success: true,
            message: `${case_ids.length} cases assigned successfully`
        });

    } catch (error) {
        console.error('❌ Error bulk assigning doctor:', error);
        res.status(500).json({
            success: false,
            error: 'Error bulk assigning doctor',
            details: error.message
        });
    }
});

/**
 * POST /api/occupational-health/cases/bulk/update-status
 * Bulk update status of multiple cases
 */
router.post('/cases/bulk/update-status', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId, user_id } = req.user;
        const { case_ids, status } = req.body;

        if (!case_ids || !Array.isArray(case_ids) || case_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'case_ids array is required'
            });
        }

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'status is required'
            });
        }

        await db.sequelize.query(`
            UPDATE absence_cases
            SET case_status = :status,
                last_modified_by = :user_id,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ANY(:case_ids::uuid[])
              AND company_id = :companyId
        `, {
            replacements: {
                case_ids,
                status,
                user_id,
                companyId
            }
        });

        res.json({
            success: true,
            message: `${case_ids.length} cases updated successfully`
        });

    } catch (error) {
        console.error('❌ Error bulk updating status:', error);
        res.status(500).json({
            success: false,
            error: 'Error bulk updating status',
            details: error.message
        });
    }
});

/**
 * POST /api/occupational-health/cases/bulk/export
 * Bulk export cases to CSV/Excel
 */
router.post('/cases/bulk/export', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const { case_ids, format = 'csv' } = req.body;

        if (!case_ids || !Array.isArray(case_ids) || case_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'case_ids array is required'
            });
        }

        const [cases] = await db.sequelize.query(`
            SELECT
                ac.id,
                ac.absence_type,
                ac.start_date,
                ac.end_date,
                ac.requested_days,
                ac.approved_days,
                ac.case_status,
                ac.is_justified,
                u."firstName" || ' ' || u."lastName" as employee_name,
                u."employeeId" as employee_number,
                d.name as department,
                ms.first_name || ' ' || ms.last_name as doctor_name,
                ac.medical_conclusion,
                ac.final_diagnosis,
                ac.created_at,
                ac.case_closed_date
            FROM absence_cases ac
            JOIN users u ON ac.employee_id = u.user_id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN medical_staff ms ON ac.assigned_doctor_id = ms.id
            WHERE ac.id = ANY(:case_ids::uuid[])
              AND ac.company_id = :companyId
            ORDER BY ac.created_at DESC
        `, {
            replacements: { case_ids, companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        // For now, return JSON (in production, generate actual CSV/Excel file)
        res.json({
            success: true,
            data: cases,
            format: format,
            total: cases.length
        });

    } catch (error) {
        console.error('❌ Error bulk exporting cases:', error);
        res.status(500).json({
            success: false,
            error: 'Error bulk exporting cases',
            details: error.message
        });
    }
});

// ============================================================================
// SECTION 6: COMPLIANCE & AUDIT
// ============================================================================

/**
 * GET /api/occupational-health/compliance/report
 * Get compliance report (ISO 45001, audit log)
 */
router.get('/compliance/report', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const { period = '12months' } = req.query;

        let intervalValue = period === '30days' ? '30 days' : '12 months';

        // Compliance metrics
        const [complianceMetrics] = await db.sequelize.query(`
            SELECT
                COUNT(*) as total_cases,
                COUNT(*) FILTER (WHERE doctor_response_date IS NOT NULL) as reviewed_by_doctor,
                COUNT(*) FILTER (WHERE case_closed_date IS NOT NULL) as closed_cases,
                COUNT(*) FILTER (WHERE assigned_doctor_id IS NOT NULL) as assigned_doctor,
                ROUND(COUNT(*) FILTER (WHERE doctor_response_date IS NOT NULL) * 100.0 / NULLIF(COUNT(*), 0), 2) as doctor_review_rate,
                AVG(EXTRACT(EPOCH FROM (doctor_response_date - created_at))/3600) FILTER (WHERE doctor_response_date IS NOT NULL) as avg_response_hours
            FROM absence_cases
            WHERE company_id = :companyId
              AND created_at >= CURRENT_DATE - INTERVAL :intervalValue
        `, {
            replacements: { companyId, intervalValue },
            type: db.sequelize.QueryTypes.SELECT
        });

        // Cases missing documentation
        const [missingDocs] = await db.sequelize.query(`
            SELECT
                COUNT(*) as total_missing,
                COUNT(*) FILTER (WHERE case_status = 'awaiting_docs') as awaiting_docs,
                COUNT(*) FILTER (WHERE case_status = 'under_review' AND employee_attachments::text = '[]') as no_attachments
            FROM absence_cases
            WHERE company_id = :companyId
              AND case_status NOT IN ('closed', 'justified', 'not_justified')
        `, {
            replacements: { companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: {
                compliance_metrics: complianceMetrics[0],
                missing_documentation: missingDocs[0],
                period: period
            }
        });

    } catch (error) {
        console.error('❌ Error fetching compliance report:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching compliance report',
            details: error.message
        });
    }
});

/**
 * GET /api/occupational-health/compliance/audit-log
 * Get audit log of all case modifications
 */
router.get('/compliance/audit-log', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const { case_id, limit = 100 } = req.query;

        let whereClause = 'WHERE mc.company_id = :companyId';
        const replacements = { companyId, limit: parseInt(limit) };

        if (case_id) {
            whereClause += ' AND mc.absence_case_id = :case_id';
            replacements.case_id = case_id;
        }

        const [auditLog] = await db.sequelize.query(`
            SELECT
                mc.id,
                mc.absence_case_id,
                mc.sender_type,
                mc.message_type,
                mc.message,
                mc.created_at,
                CASE
                    WHEN mc.sender_type = 'employee' THEN u."firstName" || ' ' || u."lastName"
                    WHEN mc.sender_type = 'doctor' THEN ms.first_name || ' ' || ms.last_name
                    WHEN mc.sender_type = 'hr' THEN u2."firstName" || ' ' || u2."lastName"
                    ELSE 'System'
                END as action_by
            FROM medical_communications mc
            LEFT JOIN users u ON mc.sender_id = u.user_id AND mc.sender_type = 'employee'
            LEFT JOIN medical_staff ms ON mc.sender_id = ms.id AND mc.sender_type = 'doctor'
            LEFT JOIN users u2 ON mc.sender_id = u2.user_id AND mc.sender_type = 'hr'
            ${whereClause}
            ORDER BY mc.created_at DESC
            LIMIT :limit
        `, {
            replacements,
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: auditLog
        });

    } catch (error) {
        console.error('❌ Error fetching audit log:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching audit log',
            details: error.message
        });
    }
});

// ============================================================================
// SECTION 7: EMPLOYEE-SPECIFIC ENDPOINTS
// ============================================================================

/**
 * GET /api/occupational-health/employee/:employeeId/history
 * Get complete absence history for a specific employee
 */
router.get('/employee/:employeeId/history', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { employeeId } = req.params;
        const { companyId } = req.user;

        const [history] = await db.sequelize.query(`
            SELECT
                ac.*,
                ms.first_name || ' ' || ms.last_name as doctor_name,
                ms.specialty as doctor_specialty,
                (SELECT COUNT(*) FROM medical_communications mc
                 WHERE mc.absence_case_id = ac.id) as messages_count
            FROM absence_cases ac
            LEFT JOIN medical_staff ms ON ac.assigned_doctor_id = ms.id
            WHERE ac.employee_id = :employeeId
              AND ac.company_id = :companyId
            ORDER BY ac.created_at DESC
        `, {
            replacements: { employeeId, companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        // Summary stats
        const stats = {
            total_cases: history.length,
            total_days_absent: history.reduce((sum, c) => sum + (c.approved_days || c.requested_days || 0), 0),
            justified: history.filter(c => c.is_justified === true).length,
            not_justified: history.filter(c => c.is_justified === false).length,
            pending: history.filter(c => c.case_status === 'pending' || c.case_status === 'under_review').length
        };

        res.json({
            success: true,
            data: {
                cases: history,
                stats: stats
            }
        });

    } catch (error) {
        console.error('❌ Error fetching employee history:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching employee history',
            details: error.message
        });
    }
});

/**
 * GET /api/occupational-health/employee/:employeeId/risk-score
 * Calculate employee risk score based on absence patterns
 */
router.get('/employee/:employeeId/risk-score', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { employeeId } = req.params;
        const { companyId } = req.user;

        const [riskData] = await db.sequelize.query(`
            SELECT
                COUNT(*) as total_absences_12months,
                SUM(requested_days) as total_days_lost,
                COUNT(*) FILTER (WHERE absence_type = 'work_accident') as work_accidents,
                COUNT(*) FILTER (WHERE is_justified = false) as unjustified_absences,
                COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as recent_absences_30days
            FROM absence_cases
            WHERE employee_id = :employeeId
              AND company_id = :companyId
              AND created_at >= CURRENT_DATE - INTERVAL '12 months'
        `, {
            replacements: { employeeId, companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        const data = riskData[0];

        // Simple risk scoring algorithm
        let risk_score = 0;
        if (data.total_absences_12months > 10) risk_score += 30;
        if (data.total_days_lost > 30) risk_score += 25;
        if (data.work_accidents > 2) risk_score += 20;
        if (data.unjustified_absences > 3) risk_score += 15;
        if (data.recent_absences_30days > 2) risk_score += 10;

        let risk_level = 'low';
        if (risk_score > 60) risk_level = 'high';
        else if (risk_score > 30) risk_level = 'medium';

        res.json({
            success: true,
            data: {
                risk_score: Math.min(risk_score, 100),
                risk_level: risk_level,
                factors: data,
                recommendations: risk_level === 'high' ?
                    ['Intervention recommended', 'Review work conditions', 'Schedule health check'] :
                    risk_level === 'medium' ?
                    ['Monitor closely', 'Review absence patterns'] :
                    ['No immediate action required']
            }
        });

    } catch (error) {
        console.error('❌ Error calculating risk score:', error);
        res.status(500).json({
            success: false,
            error: 'Error calculating risk score',
            details: error.message
        });
    }
});

// ============================================================================
// SECTION 8: EXPORTS & REPORTS
// ============================================================================

/**
 * GET /api/occupational-health/reports/monthly-summary
 * Generate monthly summary report
 */
router.get('/reports/monthly-summary', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const { year, month } = req.query;

        if (!year || !month) {
            return res.status(400).json({
                success: false,
                error: 'year and month parameters are required (YYYY, MM)'
            });
        }

        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-31`;

        const [summary] = await db.sequelize.query(`
            SELECT
                TO_CHAR(DATE_TRUNC('day', start_date), 'YYYY-MM-DD') as date,
                COUNT(*) as new_cases,
                SUM(requested_days) as days_requested,
                COUNT(*) FILTER (WHERE absence_type = 'medical_illness') as medical_illness,
                COUNT(*) FILTER (WHERE absence_type = 'work_accident') as work_accidents
            FROM absence_cases
            WHERE company_id = :companyId
              AND start_date >= :startDate
              AND start_date <= :endDate
            GROUP BY DATE_TRUNC('day', start_date)
            ORDER BY date ASC
        `, {
            replacements: { companyId, startDate, endDate },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: {
                year: year,
                month: month,
                daily_summary: summary
            }
        });

    } catch (error) {
        console.error('❌ Error generating monthly summary:', error);
        res.status(500).json({
            success: false,
            error: 'Error generating monthly summary',
            details: error.message
        });
    }
});

/**
 * GET /api/occupational-health/reports/export-excel
 * Export comprehensive report to Excel format (placeholder)
 */
router.get('/reports/export-excel', auth, async (req, res) => {
    // This is a placeholder - in production, use a library like ExcelJS
    res.json({
        success: true,
        message: 'Excel export feature - to be implemented with ExcelJS library',
        note: 'This endpoint will generate an Excel file with all data'
    });
});

// ============================================================================
// SECTION 8: PRE-EMPLOYMENT MEDICAL SCREENING (v6.0) - Multi-Country
// ============================================================================

/**
 * GET /api/occupational-health/screening-types
 * Get screening types filtered by country (parametrizable)
 */
router.get('/screening-types', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { country_code = 'US' } = req.query;

        // Get screening types for specific country
        const [types] = await db.sequelize.query(
            `SELECT * FROM get_screening_types_for_country(:countryCode) ORDER BY id`,
            {
                replacements: { countryCode: country_code },
                type: db.Sequelize.QueryTypes.SELECT
            }
        );

        res.json({
            success: true,
            country: country_code,
            count: types ? types.length : 0,
            data: types || []
        });

    } catch (error) {
        console.error('Error fetching screening types:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching screening types',
            error: error.message
        });
    }
});

/**
 * GET /api/occupational-health/pre-employment-screenings
 * Get all pre-employment screenings with advanced filtering
 */
router.get('/pre-employment-screenings', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const {
            page = 1,
            limit = 20,
            status,
            overall_result,
            country_code,
            screening_type_id,
            dateFrom,
            dateTo,
            search,
            sortField = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;

        // Build WHERE conditions
        let conditions = ['company_id = :companyId', 'deleted_at IS NULL'];
        const replacements = { companyId, limit: parseInt(limit), offset: parseInt(offset) };

        if (status && status !== 'all') {
            conditions.push('status = :status');
            replacements.status = status;
        }

        if (overall_result && overall_result !== 'all') {
            conditions.push('overall_result = :overallResult');
            replacements.overallResult = overall_result;
        }

        if (country_code && country_code !== 'all') {
            conditions.push('country_code = :countryCode');
            replacements.countryCode = country_code;
        }

        if (screening_type_id) {
            conditions.push('screening_type_id = :screeningTypeId');
            replacements.screeningTypeId = screening_type_id;
        }

        if (dateFrom) {
            conditions.push('scheduled_date >= :dateFrom');
            replacements.dateFrom = dateFrom;
        }

        if (dateTo) {
            conditions.push('scheduled_date <= :dateTo');
            replacements.dateTo = dateTo;
        }

        if (search) {
            conditions.push(`(
                candidate_first_name ILIKE :search OR
                candidate_last_name ILIKE :search OR
                candidate_email ILIKE :search OR
                position_title ILIKE :search
            )`);
            replacements.search = `%${search}%`;
        }

        const whereClause = conditions.join(' AND ');

        // Valid sort fields
        const validSortFields = ['created_at', 'scheduled_date', 'completed_date', 'candidate_last_name', 'position_title', 'country_code'];
        const safeSort = validSortFields.includes(sortField) ? sortField : 'created_at';
        const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const [countResult] = await db.sequelize.query(
            `SELECT COUNT(*) as total FROM oh_pre_employment_screenings WHERE ${whereClause}`,
            {
                replacements,
                type: db.Sequelize.QueryTypes.SELECT
            }
        );

        // Get screenings with screening type name
        const screenings = await db.sequelize.query(
            `SELECT
                s.id,
                s.candidate_first_name,
                s.candidate_last_name,
                s.candidate_email,
                s.position_title,
                s.screening_type_id,
                st.name_i18n as screening_type_name,
                s.scheduled_date,
                s.completed_date,
                s.country_code,
                s.status,
                s.overall_result,
                s.has_restrictions,
                s.approved_for_hiring,
                s.documents_count,
                s.created_at,
                s.updated_at,
                (s.valid_until < CURRENT_DATE) as is_expired
            FROM oh_pre_employment_screenings s
            LEFT JOIN oh_screening_types st ON s.screening_type_id = st.id
            WHERE ${whereClause}
            ORDER BY s.${safeSort} ${safeOrder}
            LIMIT :limit OFFSET :offset`,
            {
                replacements,
                type: db.Sequelize.QueryTypes.SELECT
            }
        );

        res.json({
            success: true,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.total),
                totalPages: Math.ceil(countResult.total / limit)
            },
            data: screenings
        });

    } catch (error) {
        console.error('Error fetching pre-employment screenings:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pre-employment screenings',
            error: error.message
        });
    }
});

/**
 * POST /api/occupational-health/pre-employment-screenings
 * Create new pre-employment screening
 */
router.post('/pre-employment-screenings', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId, userId } = req.user;
        const {
            candidate_first_name,
            candidate_last_name,
            candidate_email,
            candidate_phone,
            position_title,
            department,
            screening_type_id,
            scheduled_date,
            country_code,
            metadata
        } = req.body;

        // Validation
        if (!candidate_first_name || !candidate_last_name || !position_title || !country_code) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: candidate_first_name, candidate_last_name, position_title, country_code'
            });
        }

        // Insert screening
        const [result] = await db.sequelize.query(
            `INSERT INTO oh_pre_employment_screenings (
                company_id, candidate_first_name, candidate_last_name,
                candidate_email, candidate_phone, position_title, department,
                screening_type_id, scheduled_date, country_code, status,
                metadata, created_by, created_at, updated_at
            ) VALUES (
                :companyId, :firstName, :lastName, :email, :phone,
                :position, :department, :screeningTypeId, :scheduledDate,
                :countryCode, 'scheduled', :metadata, :createdBy,
                NOW(), NOW()
            ) RETURNING *`,
            {
                replacements: {
                    companyId,
                    firstName: candidate_first_name,
                    lastName: candidate_last_name,
                    email: candidate_email,
                    phone: candidate_phone,
                    position: position_title,
                    department,
                    screeningTypeId: screening_type_id || null,
                    scheduledDate: scheduled_date || null,
                    countryCode: country_code,
                    metadata: metadata ? JSON.stringify(metadata) : null,
                    createdBy: userId
                },
                type: db.Sequelize.QueryTypes.INSERT
            }
        );

        res.status(201).json({
            success: true,
            message: 'Pre-employment screening created successfully',
            data: result[0]
        });

    } catch (error) {
        console.error('Error creating pre-employment screening:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating pre-employment screening',
            error: error.message
        });
    }
});

/**
 * GET /api/occupational-health/pre-employment-screenings/:id
 * Get specific pre-employment screening with full details
 */
router.get('/pre-employment-screenings/:id', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const { id } = req.params;

        // Get screening with type info
        const [screening] = await db.sequelize.query(
            `SELECT
                s.*,
                st.name_i18n as screening_type_name,
                st.description_i18n as screening_type_description,
                st.category as screening_category,
                (s.valid_until < CURRENT_DATE) as is_expired,
                COALESCE((
                    SELECT json_agg(json_build_object(
                        'id', id,
                        'file_name', file_name,
                        'file_type', file_type,
                        'file_size', file_size,
                        'uploaded_at', uploaded_at
                    ))
                    FROM oh_screening_documents
                    WHERE screening_id = s.id AND deleted_at IS NULL
                ), '[]'::json) as documents
            FROM oh_pre_employment_screenings s
            LEFT JOIN oh_screening_types st ON s.screening_type_id = st.id
            WHERE s.id = :id AND s.company_id = :companyId AND s.deleted_at IS NULL`,
            {
                replacements: { id, companyId },
                type: db.Sequelize.QueryTypes.SELECT
            }
        );

        if (!screening) {
            return res.status(404).json({
                success: false,
                message: 'Pre-employment screening not found'
            });
        }

        res.json({
            success: true,
            data: screening
        });

    } catch (error) {
        console.error('Error fetching pre-employment screening:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pre-employment screening',
            error: error.message
        });
    }
});

/**
 * PUT /api/occupational-health/pre-employment-screenings/:id
 * Update pre-employment screening
 */
router.put('/pre-employment-screenings/:id', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId, userId } = req.user;
        const { id } = req.params;
        const {
            candidate_first_name,
            candidate_last_name,
            candidate_email,
            candidate_phone,
            position_title,
            department,
            screening_type_id,
            scheduled_date,
            completed_date,
            status,
            overall_result,
            result_details,
            has_restrictions,
            restrictions_description,
            approved_for_hiring,
            metadata
        } = req.body;

        // Build UPDATE SET clause dynamically
        const updates = [];
        const replacements = { id, companyId, updatedBy: userId };

        if (candidate_first_name !== undefined) {
            updates.push('candidate_first_name = :firstName');
            replacements.firstName = candidate_first_name;
        }
        if (candidate_last_name !== undefined) {
            updates.push('candidate_last_name = :lastName');
            replacements.lastName = candidate_last_name;
        }
        if (candidate_email !== undefined) {
            updates.push('candidate_email = :email');
            replacements.email = candidate_email;
        }
        if (candidate_phone !== undefined) {
            updates.push('candidate_phone = :phone');
            replacements.phone = candidate_phone;
        }
        if (position_title !== undefined) {
            updates.push('position_title = :position');
            replacements.position = position_title;
        }
        if (department !== undefined) {
            updates.push('department = :department');
            replacements.department = department;
        }
        if (screening_type_id !== undefined) {
            updates.push('screening_type_id = :screeningTypeId');
            replacements.screeningTypeId = screening_type_id;
        }
        if (scheduled_date !== undefined) {
            updates.push('scheduled_date = :scheduledDate');
            replacements.scheduledDate = scheduled_date;
        }
        if (completed_date !== undefined) {
            updates.push('completed_date = :completedDate');
            replacements.completedDate = completed_date;
        }
        if (status !== undefined) {
            updates.push('status = :status');
            replacements.status = status;
        }
        if (overall_result !== undefined) {
            updates.push('overall_result = :overallResult');
            replacements.overallResult = overall_result;
        }
        if (result_details !== undefined) {
            updates.push('result_details = :resultDetails');
            replacements.resultDetails = JSON.stringify(result_details);
        }
        if (has_restrictions !== undefined) {
            updates.push('has_restrictions = :hasRestrictions');
            replacements.hasRestrictions = has_restrictions;
        }
        if (restrictions_description !== undefined) {
            updates.push('restrictions_description = :restrictionsDesc');
            replacements.restrictionsDesc = restrictions_description;
        }
        if (approved_for_hiring !== undefined) {
            updates.push('approved_for_hiring = :approvedForHiring');
            replacements.approvedForHiring = approved_for_hiring;
        }
        if (metadata !== undefined) {
            updates.push('metadata = :metadata');
            replacements.metadata = JSON.stringify(metadata);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updates.push('updated_at = NOW()');
        updates.push('updated_by = :updatedBy');

        const setClause = updates.join(', ');

        const [result] = await db.sequelize.query(
            `UPDATE oh_pre_employment_screenings
            SET ${setClause}
            WHERE id = :id AND company_id = :companyId AND deleted_at IS NULL
            RETURNING *`,
            {
                replacements,
                type: db.Sequelize.QueryTypes.UPDATE
            }
        );

        if (!result || result.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pre-employment screening not found'
            });
        }

        res.json({
            success: true,
            message: 'Pre-employment screening updated successfully',
            data: result[0]
        });

    } catch (error) {
        console.error('Error updating pre-employment screening:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating pre-employment screening',
            error: error.message
        });
    }
});

/**
 * DELETE /api/occupational-health/pre-employment-screenings/:id
 * Soft delete pre-employment screening
 */
router.delete('/pre-employment-screenings/:id', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId, userId } = req.user;
        const { id } = req.params;

        const [result] = await db.sequelize.query(
            `UPDATE oh_pre_employment_screenings
            SET deleted_at = NOW(), deleted_by = :deletedBy
            WHERE id = :id AND company_id = :companyId AND deleted_at IS NULL
            RETURNING id`,
            {
                replacements: { id, companyId, deletedBy: userId },
                type: db.Sequelize.QueryTypes.UPDATE
            }
        );

        if (!result || result.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pre-employment screening not found'
            });
        }

        res.json({
            success: true,
            message: 'Pre-employment screening deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting pre-employment screening:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting pre-employment screening',
            error: error.message
        });
    }
});

/**
 * POST /api/occupational-health/pre-employment-screenings/:id/documents
 * Upload document for pre-employment screening
 */
router.post('/pre-employment-screenings/:id/documents', auth, upload.single('document'), async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId, userId } = req.user;
        const { id: screening_id } = req.params;
        const { document_type, description } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Verify screening exists
        const [screening] = await db.sequelize.query(
            `SELECT id FROM oh_pre_employment_screenings
            WHERE id = :screeningId AND company_id = :companyId AND deleted_at IS NULL`,
            {
                replacements: { screeningId: screening_id, companyId },
                type: db.Sequelize.QueryTypes.SELECT
            }
        );

        if (!screening) {
            return res.status(404).json({
                success: false,
                message: 'Pre-employment screening not found'
            });
        }

        // Insert document record
        const [result] = await db.sequelize.query(
            `INSERT INTO oh_screening_documents (
                screening_id, company_id, document_type, file_name,
                file_path, file_type, file_size, description,
                uploaded_by, uploaded_at
            ) VALUES (
                :screeningId, :companyId, :documentType, :fileName,
                :filePath, :fileType, :fileSize, :description,
                :uploadedBy, NOW()
            ) RETURNING *`,
            {
                replacements: {
                    screeningId: screening_id,
                    companyId,
                    documentType: document_type || 'other',
                    fileName: req.file.originalname,
                    filePath: req.file.path,
                    fileType: req.file.mimetype,
                    fileSize: req.file.size,
                    description: description || null,
                    uploadedBy: userId
                },
                type: db.Sequelize.QueryTypes.INSERT
            }
        );

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            data: result[0]
        });

    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading document',
            error: error.message
        });
    }
});

/**
 * DELETE /api/occupational-health/pre-employment-screenings/:screeningId/documents/:docId
 * Soft delete document
 */
router.delete('/pre-employment-screenings/:screeningId/documents/:docId', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId, userId } = req.user;
        const { screeningId, docId } = req.params;

        const [result] = await db.sequelize.query(
            `UPDATE oh_screening_documents
            SET deleted_at = NOW(), deleted_by = :deletedBy
            WHERE id = :docId AND screening_id = :screeningId
            AND company_id = :companyId AND deleted_at IS NULL
            RETURNING id`,
            {
                replacements: { docId, screeningId, companyId, deletedBy: userId },
                type: db.Sequelize.QueryTypes.UPDATE
            }
        );

        if (!result || result.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        res.json({
            success: true,
            message: 'Document deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting document',
            error: error.message
        });
    }
});

// ============================================================================
// SECTION: WORKERS' COMPENSATION CLAIMS (OH-V6-5)
// ============================================================================

/**
 * GET /api/occupational-health/claim-types
 * Get claim types by country/region
 */
router.get('/claim-types', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { country_code = '*' } = req.query;

        let query = `
            SELECT id, region, type_code, name_i18n, description_i18n,
                   severity_level, requires_medical_report, requires_witness_statement,
                   requires_employer_report, typical_recovery_days, legal_deadline_days,
                   display_order
            FROM oh_claim_types
            WHERE is_active = true
        `;

        const replacements = {};

        if (country_code && country_code !== '*') {
            query += ' AND region = :country_code';
            replacements.country_code = country_code;
        }

        query += ' ORDER BY region, display_order';

        const [claimTypes] = await db.sequelize.query(query, {
            replacements,
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: claimTypes,
            count: claimTypes.length
        });

    } catch (error) {
        console.error('Error getting claim types:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading claim types',
            error: error.message
        });
    }
});

/**
 * GET /api/occupational-health/workers-compensation-claims
 * Get all claims with filtering, pagination, sorting
 */
router.get('/workers-compensation-claims', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const {
            page = 1,
            limit = 20,
            status,
            country_code,
            dateFrom,
            dateTo,
            search,
            sortField = 'incident_date',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;

        // Build WHERE conditions
        let conditions = ['wc.company_id = :companyId', 'wc.deleted_at IS NULL'];
        const replacements = { companyId, limit: parseInt(limit), offset: parseInt(offset) };

        if (status && status !== 'all') {
            conditions.push('wc.status = :status');
            replacements.status = status;
        }

        if (country_code && country_code !== 'all') {
            conditions.push('wc.country_code = :country_code');
            replacements.country_code = country_code;
        }

        if (dateFrom) {
            conditions.push('wc.incident_date >= :dateFrom');
            replacements.dateFrom = dateFrom;
        }

        if (dateTo) {
            conditions.push('wc.incident_date <= :dateTo');
            replacements.dateTo = dateTo;
        }

        if (search) {
            conditions.push(`(
                wc.claim_number ILIKE :search OR
                wc.employee_id ILIKE :search OR
                wc.injury_description ILIKE :search
            )`);
            replacements.search = `%${search}%`;
        }

        const whereClause = 'WHERE ' + conditions.join(' AND ');

        // Validate sort field
        const allowedSortFields = ['incident_date', 'status', 'claim_number', 'work_days_lost'];
        const validSortField = allowedSortFields.includes(sortField) ? sortField : 'incident_date';
        const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const [countResult] = await db.sequelize.query(`
            SELECT COUNT(*) as total
            FROM oh_workers_compensation_claims wc
            ${whereClause}
        `, {
            replacements,
            type: db.sequelize.QueryTypes.SELECT
        });

        // Get paginated data
        const claims = await db.sequelize.query(`
            SELECT
                wc.id,
                wc.claim_number,
                wc.employee_id,
                wc.incident_date,
                wc.incident_time,
                wc.incident_location,
                wc.department,
                wc.supervisor_name,
                wc.claim_type_id,
                wc.country_code,
                wc.injury_description,
                wc.body_part_affected,
                wc.status,
                wc.medical_treatment_required,
                wc.work_days_lost,
                wc.documents_count,
                wc.reported_date,
                ct.name_i18n as claim_type_name,
                ct.severity_level
            FROM oh_workers_compensation_claims wc
            LEFT JOIN oh_claim_types ct ON wc.claim_type_id = ct.id
            ${whereClause}
            ORDER BY wc.${validSortField} ${validSortOrder}
            LIMIT :limit OFFSET :offset
        `, {
            replacements,
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: claims,
            pagination: {
                total: parseInt(countResult.total),
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(countResult.total / limit)
            }
        });

    } catch (error) {
        console.error('Error getting claims:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading claims',
            error: error.message
        });
    }
});

/**
 * GET /api/occupational-health/workers-compensation-claims/:id
 * Get single claim by ID
 */
router.get('/workers-compensation-claims/:id', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const [claim] = await db.sequelize.query(`
            SELECT
                wc.*,
                ct.name_i18n as claim_type_name,
                ct.severity_level,
                ct.typical_recovery_days
            FROM oh_workers_compensation_claims wc
            LEFT JOIN oh_claim_types ct ON wc.claim_type_id = ct.id
            WHERE wc.id = :id
              AND wc.company_id = :companyId
              AND wc.deleted_at IS NULL
        `, {
            replacements: { id, companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        if (!claim) {
            return res.status(404).json({
                success: false,
                message: 'Claim not found'
            });
        }

        // Get documents
        const documents = await db.sequelize.query(`
            SELECT id, document_type, file_name, file_size, file_type,
                   uploaded_by, upload_date, description, is_verified
            FROM oh_claim_documents
            WHERE claim_id = :id
            ORDER BY upload_date DESC
        `, {
            replacements: { id },
            type: db.sequelize.QueryTypes.SELECT
        });

        claim.documents = documents;

        res.json({
            success: true,
            data: claim
        });

    } catch (error) {
        console.error('Error getting claim:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading claim',
            error: error.message
        });
    }
});

/**
 * POST /api/occupational-health/workers-compensation-claims
 * Create new claim
 */
router.post('/workers-compensation-claims', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const claimData = req.body;

        // Generate claim number
        const [nextClaimNumber] = await db.sequelize.query(
            'SELECT generate_claim_number() as claim_number',
            { type: db.sequelize.QueryTypes.SELECT }
        );

        const insertQuery = `
            INSERT INTO oh_workers_compensation_claims (
                company_id, employee_id, claim_number, incident_date, incident_time,
                incident_location, department, supervisor_name, claim_type_id,
                country_code, injury_description, body_part_affected, injury_cause,
                witnesses, status, medical_treatment_required, medical_facility_name,
                treating_physician, first_aid_provided, first_aid_description,
                hospitalization_required, work_days_lost, estimated_return_date,
                art_company_name, art_policy_number, reported_by, reported_date
            ) VALUES (
                :companyId, :employee_id, :claim_number, :incident_date, :incident_time,
                :incident_location, :department, :supervisor_name, :claim_type_id,
                :country_code, :injury_description, :body_part_affected, :injury_cause,
                :witnesses, :status, :medical_treatment_required, :medical_facility_name,
                :treating_physician, :first_aid_provided, :first_aid_description,
                :hospitalization_required, :work_days_lost, :estimated_return_date,
                :art_company_name, :art_policy_number, :reported_by, NOW()
            )
            RETURNING *
        `;

        const [newClaim] = await db.sequelize.query(insertQuery, {
            replacements: {
                companyId,
                claim_number: nextClaimNumber.claim_number,
                status: 'reported',
                ...claimData
            },
            type: db.sequelize.QueryTypes.INSERT
        });

        res.status(201).json({
            success: true,
            message: 'Claim created successfully',
            data: newClaim
        });

    } catch (error) {
        console.error('Error creating claim:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating claim',
            error: error.message
        });
    }
});

/**
 * PUT /api/occupational-health/workers-compensation-claims/:id
 * Update claim
 */
router.put('/workers-compensation-claims/:id', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const updateData = req.body;

        // Build dynamic UPDATE query
        const fields = Object.keys(updateData).filter(key => key !== 'id' && key !== 'company_id');
        const setClause = fields.map(field => `${field} = :${field}`).join(', ');

        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        const updateQuery = `
            UPDATE oh_workers_compensation_claims
            SET ${setClause},
                updated_at = NOW(),
                last_updated_by = :updated_by
            WHERE id = :id
              AND company_id = :companyId
              AND deleted_at IS NULL
            RETURNING *
        `;

        const [updatedClaim] = await db.sequelize.query(updateQuery, {
            replacements: {
                ...updateData,
                id,
                companyId,
                updated_by: req.user.userId || req.user.email
            },
            type: db.sequelize.QueryTypes.UPDATE
        });

        if (!updatedClaim) {
            return res.status(404).json({
                success: false,
                message: 'Claim not found'
            });
        }

        res.json({
            success: true,
            message: 'Claim updated successfully',
            data: updatedClaim
        });

    } catch (error) {
        console.error('Error updating claim:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating claim',
            error: error.message
        });
    }
});

/**
 * DELETE /api/occupational-health/workers-compensation-claims/:id
 * Soft delete claim
 */
router.delete('/workers-compensation-claims/:id', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const [result] = await db.sequelize.query(`
            UPDATE oh_workers_compensation_claims
            SET deleted_at = NOW()
            WHERE id = :id
              AND company_id = :companyId
              AND deleted_at IS NULL
            RETURNING id
        `, {
            replacements: { id, companyId },
            type: db.sequelize.QueryTypes.UPDATE
        });

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Claim not found'
            });
        }

        res.json({
            success: true,
            message: 'Claim deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting claim:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting claim',
            error: error.message
        });
    }
});

/**
 * POST /api/occupational-health/workers-compensation-claims/:id/documents
 * Upload document for claim
 */
router.post('/workers-compensation-claims/:id/documents', auth, upload.single('document'), async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { document_type, description } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Verify claim exists and belongs to company
        const [claim] = await db.sequelize.query(`
            SELECT id FROM oh_workers_compensation_claims
            WHERE id = :id AND company_id = :companyId AND deleted_at IS NULL
        `, {
            replacements: { id, companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        if (!claim) {
            return res.status(404).json({
                success: false,
                message: 'Claim not found'
            });
        }

        const [document] = await db.sequelize.query(`
            INSERT INTO oh_claim_documents (
                claim_id, document_type, file_name, file_path,
                file_size, file_type, uploaded_by, description
            ) VALUES (
                :claim_id, :document_type, :file_name, :file_path,
                :file_size, :file_type, :uploaded_by, :description
            )
            RETURNING *
        `, {
            replacements: {
                claim_id: id,
                document_type,
                file_name: req.file.originalname,
                file_path: req.file.path,
                file_size: req.file.size,
                file_type: req.file.mimetype,
                uploaded_by: req.user.userId || req.user.email,
                description: description || null
            },
            type: db.sequelize.QueryTypes.INSERT
        });

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            data: document
        });

    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading document',
            error: error.message
        });
    }
});

/**
 * DELETE /api/occupational-health/claim-documents/:id
 * Delete claim document
 */
router.delete('/claim-documents/:id', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const { id } = req.params;

        // Verify document belongs to company's claim
        const [document] = await db.sequelize.query(`
            SELECT cd.id, cd.file_path, wc.company_id
            FROM oh_claim_documents cd
            JOIN oh_workers_compensation_claims wc ON cd.claim_id = wc.id
            WHERE cd.id = :id
        `, {
            replacements: { id },
            type: db.sequelize.QueryTypes.SELECT
        });

        if (!document || document.company_id !== companyId) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        // Delete file from filesystem
        if (fs.existsSync(document.file_path)) {
            fs.unlinkSync(document.file_path);
        }

        // Delete from database
        await db.sequelize.query(`
            DELETE FROM oh_claim_documents WHERE id = :id
        `, {
            replacements: { id },
            type: db.sequelize.QueryTypes.DELETE
        });

        res.json({
            success: true,
            message: 'Document deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting document',
            error: error.message
        });
    }
});

/**
 * GET /api/occupational-health/workers-compensation-claims/:id/status-history
 * Get status change history for claim
 */
router.get('/workers-compensation-claims/:id/status-history', auth, async (req, res) => {
    const db = require('../config/database');

    try {
        const { companyId } = req.user;
        const { id } = req.params;

        // Verify claim belongs to company
        const [claim] = await db.sequelize.query(`
            SELECT id FROM oh_workers_compensation_claims
            WHERE id = :id AND company_id = :companyId
        `, {
            replacements: { id, companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        if (!claim) {
            return res.status(404).json({
                success: false,
                message: 'Claim not found'
            });
        }

        const history = await db.sequelize.query(`
            SELECT id, previous_status, new_status, changed_by,
                   change_reason, notes, changed_at
            FROM oh_claim_status_history
            WHERE claim_id = :id
            ORDER BY changed_at DESC
        `, {
            replacements: { id },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: history,
            count: history.length
        });

    } catch (error) {
        console.error('Error getting status history:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading status history',
            error: error.message
        });
    }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/occupational-health/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'Occupational Health Enterprise API',
        version: '6.0.0',
        status: 'operational',
        standards: ['ISO 45001', 'ILO C155', 'GDPR', 'WHO Guidelines'],
        features: [
            'Pre-Employment Screening (Multi-Country)',
            'Workers\' Compensation Claims Management (Multi-Country)'
        ]
    });
});

module.exports = router;
