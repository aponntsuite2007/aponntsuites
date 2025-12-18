/**
 * ============================================================================
 * SALES ORCHESTRATION ROUTES - API REST
 * ============================================================================
 *
 * Endpoints para el sistema de orquestación de ventas:
 * - Gestión de reuniones
 * - Encuestas de prospectos
 * - Generación de pitches
 * - Feedback y satisfacción
 *
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const salesOrchestrationService = require('../services/SalesOrchestrationService');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// =========================================================================
// MIDDLEWARE DE AUTENTICACIÓN PARA STAFF
// =========================================================================

const authenticateStaff = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '') ||
                      req.cookies?.aponnt_token_staff;

        if (!token) {
            return res.status(401).json({ success: false, error: 'No autorizado' });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aponnt-secret-key');

        req.staffId = decoded.staff_id || decoded.staffId;
        req.staffRole = decoded.role_code || decoded.role;
        req.staffArea = decoded.area;
        req.staffLevel = decoded.level;

        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Token inválido' });
    }
};

// =========================================================================
// REUNIONES - CRUD
// =========================================================================

/**
 * GET /api/sales-orchestration/meetings
 * Obtener reuniones del vendedor actual
 */
router.get('/meetings', authenticateStaff, async (req, res) => {
    try {
        const { status, fromDate, toDate } = req.query;

        const meetings = await salesOrchestrationService.getVendorMeetings(req.staffId, {
            status,
            fromDate,
            toDate
        });

        res.json({
            success: true,
            data: meetings,
            count: meetings.length
        });
    } catch (error) {
        console.error('Error obteniendo reuniones:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/sales-orchestration/meetings/:id
 * Obtener detalle de una reunión
 */
router.get('/meetings/:id', authenticateStaff, async (req, res) => {
    try {
        const meeting = await salesOrchestrationService.getMeetingDetail(req.params.id);

        if (!meeting) {
            return res.status(404).json({ success: false, error: 'Reunión no encontrada' });
        }

        res.json({ success: true, data: meeting });
    } catch (error) {
        console.error('Error obteniendo reunión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sales-orchestration/meetings
 * Crear nueva reunión
 */
router.post('/meetings', authenticateStaff, async (req, res) => {
    try {
        const result = await salesOrchestrationService.createMeeting(req.body, req.staffId);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creando reunión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/sales-orchestration/meetings/:id
 * Actualizar reunión
 */
router.put('/meetings/:id', authenticateStaff, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Construir query de actualización
        const fields = [];
        const values = [];

        const allowedFields = [
            'prospect_company_name', 'prospect_company_type', 'prospect_country',
            'prospect_province', 'prospect_city', 'prospect_employee_count',
            'prospect_phone', 'prospect_email', 'prospect_website', 'prospect_notes',
            'meeting_date', 'meeting_time', 'meeting_duration_minutes',
            'meeting_location', 'meeting_platform', 'meeting_link',
            'send_reminder_24h'
        ];

        for (const [key, value] of Object.entries(updates)) {
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(snakeKey)) {
                fields.push(`${snakeKey} = ?`);
                values.push(value);
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
        }

        fields.push('updated_at = NOW()');
        values.push(id);

        await sequelize.query(
            `UPDATE sales_meetings SET ${fields.join(', ')} WHERE id = ?`,
            { replacements: values }
        );

        const updated = await salesOrchestrationService.getMeetingById(id);
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Error actualizando reunión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/sales-orchestration/meetings/:id
 * Cancelar reunión
 */
router.delete('/meetings/:id', authenticateStaff, async (req, res) => {
    try {
        await sequelize.query(
            `UPDATE sales_meetings SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
            { replacements: [req.params.id] }
        );
        res.json({ success: true, message: 'Reunión cancelada' });
    } catch (error) {
        console.error('Error cancelando reunión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// ACCIONES DE REUNIÓN
// =========================================================================

/**
 * POST /api/sales-orchestration/meetings/:id/confirm
 * Confirmar reunión y enviar encuesta a asistentes
 */
router.post('/meetings/:id/confirm', authenticateStaff, async (req, res) => {
    try {
        const result = await salesOrchestrationService.confirmAndSendSurvey(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Error confirmando reunión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sales-orchestration/meetings/:id/resend-survey
 * Reenviar encuestas a asistentes
 */
router.post('/meetings/:id/resend-survey', authenticateStaff, async (req, res) => {
    try {
        const { toAll } = req.body;
        const result = await salesOrchestrationService.resendSurveys(req.params.id, toAll);
        res.json(result);
    } catch (error) {
        console.error('Error reenviando encuestas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sales-orchestration/meetings/:id/send-demo-access
 * Enviar acceso a DEMO a los participantes
 */
router.post('/meetings/:id/send-demo-access', authenticateStaff, async (req, res) => {
    try {
        const result = await salesOrchestrationService.sendDemoAccess(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Error enviando acceso DEMO:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sales-orchestration/meetings/:id/start
 * Iniciar reunión
 */
router.post('/meetings/:id/start', authenticateStaff, async (req, res) => {
    try {
        const result = await salesOrchestrationService.startMeeting(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Error iniciando reunión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sales-orchestration/meetings/:id/end
 * Finalizar reunión
 */
router.post('/meetings/:id/end', authenticateStaff, async (req, res) => {
    try {
        const result = await salesOrchestrationService.endMeeting(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Error finalizando reunión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sales-orchestration/meetings/:id/feedback
 * Cargar feedback post-reunión
 */
router.post('/meetings/:id/feedback', authenticateStaff, async (req, res) => {
    try {
        const result = await salesOrchestrationService.submitFeedback(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        console.error('Error cargando feedback:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sales-orchestration/meetings/:id/reschedule
 * Reprogramar reunión y notificar a participantes
 */
router.post('/meetings/:id/reschedule', authenticateStaff, async (req, res) => {
    try {
        const result = await salesOrchestrationService.rescheduleMeeting(
            req.params.id,
            req.body,
            req.staffId
        );
        res.json(result);
    } catch (error) {
        console.error('Error reprogramando reunión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sales-orchestration/meetings/:id/generate-pitch
 * Regenerar pitch manualmente
 */
router.post('/meetings/:id/generate-pitch', authenticateStaff, async (req, res) => {
    try {
        const result = await salesOrchestrationService.generatePitch(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Error generando pitch:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sales-orchestration/meetings/:id/send-pitch
 * Enviar pitch a participantes (individual o masivo)
 */
router.post('/meetings/:id/send-pitch', authenticateStaff, async (req, res) => {
    try {
        const { attendeeId, toAll } = req.body;
        const result = await salesOrchestrationService.sendPitchEmail(req.params.id, attendeeId, toAll);
        res.json(result);
    } catch (error) {
        console.error('Error enviando pitch:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/sales-orchestration/meetings/:id/pitch
 * Obtener pitch del vendedor
 */
router.get('/meetings/:id/pitch', authenticateStaff, async (req, res) => {
    try {
        const meeting = await salesOrchestrationService.getMeetingById(req.params.id);
        if (!meeting) {
            return res.status(404).json({ success: false, error: 'Reunión no encontrada' });
        }

        if (!meeting.vendor_pitch_data) {
            return res.status(404).json({ success: false, error: 'Pitch aún no generado' });
        }

        // vendor_pitch_data puede venir como string o como objeto (JSONB)
        let pitchData = meeting.vendor_pitch_data;
        if (typeof pitchData === 'string') {
            try {
                pitchData = JSON.parse(pitchData);
            } catch (e) {
                // Ya es objeto o no es JSON válido
            }
        }

        res.json({
            success: true,
            data: pitchData,
            generatedAt: meeting.pitch_generated_at
        });
    } catch (error) {
        console.error('Error obteniendo pitch:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// ASISTENTES
// =========================================================================

/**
 * POST /api/sales-orchestration/meetings/:id/attendees
 * Agregar asistente a reunión
 */
router.post('/meetings/:id/attendees', authenticateStaff, async (req, res) => {
    try {
        const { id } = req.params;
        const attendee = req.body;

        const [result] = await sequelize.query(`
            INSERT INTO sales_meeting_attendees (
                meeting_id, full_name, email, phone, whatsapp,
                job_title, department, is_decision_maker
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `, {
            replacements: [
                id,
                attendee.fullName,
                attendee.email,
                attendee.phone,
                attendee.whatsapp,
                attendee.jobTitle,
                attendee.department,
                attendee.isDecisionMaker || false
            ]
        });

        res.status(201).json({ success: true, data: result[0] });
    } catch (error) {
        console.error('Error agregando asistente:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/sales-orchestration/attendees/:id
 * Actualizar asistente existente
 */
router.put('/attendees/:id', authenticateStaff, async (req, res) => {
    try {
        const result = await salesOrchestrationService.updateAttendee(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        console.error('Error actualizando asistente:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/sales-orchestration/attendees/:id
 * Eliminar asistente
 */
router.delete('/attendees/:id', authenticateStaff, async (req, res) => {
    try {
        const result = await salesOrchestrationService.removeAttendee(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Error eliminando asistente:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// ENCUESTAS PÚBLICAS (sin auth - usan token único)
// =========================================================================

/**
 * GET /api/sales-orchestration/survey/:token
 * Obtener datos para mostrar encuesta pública
 */
router.get('/survey/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // Buscar asistente por token
        const attendeeResult = await sequelize.query(`
            SELECT a.*, m.prospect_company_name, m.meeting_date, m.meeting_time
            FROM sales_meeting_attendees a
            JOIN sales_meetings m ON a.meeting_id = m.id
            WHERE a.survey_token = ?
        `, { replacements: [token], type: QueryTypes.SELECT });

        if (attendeeResult.length === 0) {
            return res.status(404).json({ success: false, error: 'Encuesta no encontrada' });
        }

        const attendee = attendeeResult[0];

        if (attendee.survey_completed_at) {
            return res.json({
                success: true,
                completed: true,
                message: 'Esta encuesta ya fue completada. ¡Gracias!'
            });
        }

        // Obtener módulos disponibles
        const modules = await salesOrchestrationService.getModulesForSurvey();

        res.json({
            success: true,
            completed: false,
            attendee: {
                name: attendee.full_name,
                company: attendee.prospect_company_name,
                meetingDate: attendee.meeting_date,
                meetingTime: attendee.meeting_time
            },
            modules: modules.map(m => ({
                key: m.module_key,
                name: m.short_description,
                description: m.sales_pitch,
                icon: m.icon,
                color: m.color,
                benefits: m.key_benefits
            }))
        });
    } catch (error) {
        console.error('Error obteniendo encuesta:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sales-orchestration/survey/:token
 * Enviar respuestas de encuesta
 */
router.post('/survey/:token', async (req, res) => {
    try {
        const result = await salesOrchestrationService.processSurveyResponse(
            req.params.token,
            req.body
        );
        res.json(result);
    } catch (error) {
        console.error('Error procesando encuesta:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// SATISFACCIÓN PÚBLICA (sin auth - usan token único)
// =========================================================================

/**
 * GET /api/sales-orchestration/satisfaction/:token
 * Obtener datos para mostrar encuesta de satisfacción
 */
router.get('/satisfaction/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const attendeeResult = await sequelize.query(`
            SELECT a.*, m.prospect_company_name,
                   CONCAT(v.first_name, ' ', v.last_name) as vendor_name
            FROM sales_meeting_attendees a
            JOIN sales_meetings m ON a.meeting_id = m.id
            LEFT JOIN aponnt_staff v ON m.assigned_vendor_id = v.staff_id
            WHERE a.survey_token = ?
        `, { replacements: [token], type: QueryTypes.SELECT });

        if (attendeeResult.length === 0) {
            return res.status(404).json({ success: false, error: 'Encuesta no encontrada' });
        }

        const attendee = attendeeResult[0];

        if (attendee.satisfaction_completed_at) {
            return res.json({
                success: true,
                completed: true,
                message: '¡Gracias por tu feedback!'
            });
        }

        res.json({
            success: true,
            completed: false,
            attendee: {
                name: attendee.full_name,
                company: attendee.prospect_company_name,
                vendorName: attendee.vendor_name
            }
        });
    } catch (error) {
        console.error('Error obteniendo satisfacción:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sales-orchestration/satisfaction/:token
 * Enviar respuestas de satisfacción
 */
router.post('/satisfaction/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { satisfactionRating, vendorRating, feedback, hasQuestions, needsFollowup, followupNotes } = req.body;

        const [result] = await sequelize.query(`
            UPDATE sales_meeting_attendees
            SET satisfaction_completed_at = NOW(),
                satisfaction_rating = ?,
                vendor_rating = ?,
                satisfaction_feedback = ?,
                has_questions = ?,
                needs_followup = ?,
                followup_notes = ?,
                updated_at = NOW()
            WHERE survey_token = ?
            RETURNING *
        `, { replacements: [satisfactionRating, vendorRating, feedback, hasQuestions, needsFollowup, followupNotes, token] });

        if (result.length === 0) {
            return res.status(404).json({ success: false, error: 'Encuesta no encontrada' });
        }

        res.json({
            success: true,
            message: '¡Gracias por tu feedback! Tu opinión es muy valiosa.'
        });
    } catch (error) {
        console.error('Error procesando satisfacción:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// MÓDULOS Y CATÁLOGO
// =========================================================================

/**
 * GET /api/sales-orchestration/modules
 * Obtener todos los módulos con descripciones comerciales
 */
router.get('/modules', authenticateStaff, async (req, res) => {
    try {
        const modules = await salesOrchestrationService.getModulesForSurvey();
        res.json({ success: true, data: modules });
    } catch (error) {
        console.error('Error obteniendo módulos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/sales-orchestration/vendors
 * Obtener lista de vendedores (para gerentes)
 */
router.get('/vendors', authenticateStaff, async (req, res) => {
    try {
        // Solo gerentes pueden ver todos los vendedores
        if (req.staffLevel > 3) { // Nivel > 3 = no gerente
            return res.json({
                success: true,
                data: [{ staff_id: req.staffId, full_name: 'Tú' }]
            });
        }

        const result = await sequelize.query(`
            SELECT staff_id, CONCAT(first_name, ' ', last_name) as full_name, email
            FROM aponnt_staff
            WHERE area = 'ventas' AND is_active = true
            ORDER BY first_name, last_name
        `, { type: QueryTypes.SELECT });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error obteniendo vendedores:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// ESTADÍSTICAS
// =========================================================================

/**
 * GET /api/sales-orchestration/stats
 * Estadísticas del vendedor
 */
router.get('/stats', authenticateStaff, async (req, res) => {
    try {
        // Si es SUPERADMIN o rol especial, mostrar stats de TODAS las reuniones
        const isAdmin = !req.staffId || req.staffId === 'SUPERADMIN' || req.staffId === 'admin';

        let query = `
            SELECT
                COUNT(*) FILTER (WHERE status = 'draft') as draft,
                COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
                COUNT(*) FILTER (WHERE status = 'survey_sent') as pending_surveys,
                COUNT(*) FILTER (WHERE status = 'pitch_ready') as ready,
                COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
                COUNT(*) FILTER (WHERE status = 'feedback_pending') as pending_feedback,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'quoted') as quoted,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
                COUNT(*) FILTER (WHERE status = 'closed') as closed,
                COUNT(*) as total
            FROM sales_meetings`;

        const params = [];
        if (!isAdmin) {
            query += ` WHERE assigned_vendor_id = ?`;
            params.push(req.staffId);
        }

        const result = await sequelize.query(query, { replacements: params, type: QueryTypes.SELECT });

        res.json({ success: true, data: result[0] });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


/**
 * POST /api/sales-orchestration/meetings/:id/cancel
 * Cancelar reunión (disponible para vendedores)
 */
router.post('/meetings/:id/cancel', authenticateStaff, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // Verificar que la reunión exista y no esté ya cancelada
        const [meeting] = await sequelize.query(
            'SELECT * FROM sales_meetings WHERE id = ? AND deleted_at IS NULL',
            { replacements: [id], type: QueryTypes.SELECT }
        );

        if (!meeting) {
            return res.status(404).json({ success: false, error: 'Reunión no encontrada' });
        }

        if (meeting.status === 'cancelled') {
            return res.status(400).json({ success: false, error: 'La reunión ya está cancelada' });
        }

        // Cancelar la reunión
        await sequelize.query(`
            UPDATE sales_meetings
            SET status = 'cancelled',
                cancellation_reason = ?,
                cancelled_by = ?,
                cancelled_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        `, { replacements: [reason || 'Sin motivo especificado', req.staffId, id] });

        res.json({
            success: true,
            message: 'Reunión cancelada exitosamente',
            data: { id, status: 'cancelled' }
        });
    } catch (error) {
        console.error('Error cancelando reunión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/sales-orchestration/meetings/:id
 * Borrar reunión definitivamente (SOLO gerentes nivel 4+)
 */
router.delete('/meetings/:id', authenticateStaff, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar permisos: solo gerentes (nivel 4+) pueden borrar
        // Niveles APONNT: 1=Vendedor, 2=Líder, 3=Supervisor, 4=Gerente, 5=Director
        const staffLevel = req.staffLevel || 1;
        const isGerente = staffLevel >= 4 || req.staffId === 'SUPERADMIN';

        if (!isGerente) {
            return res.status(403).json({
                success: false,
                error: 'Solo gerentes o superiores pueden eliminar reuniones. Los vendedores pueden cancelarlas.',
                canCancel: true
            });
        }

        // Verificar que la reunión exista
        const [meeting] = await sequelize.query(
            'SELECT * FROM sales_meetings WHERE id = ?',
            { replacements: [id], type: QueryTypes.SELECT }
        );

        if (!meeting) {
            return res.status(404).json({ success: false, error: 'Reunión no encontrada' });
        }

        // Soft delete primero
        await sequelize.query(`
            UPDATE sales_meetings
            SET deleted_at = NOW(),
                deleted_by = ?,
                updated_at = NOW()
            WHERE id = ?
        `, { replacements: [req.staffId, id] });

        // Si se especifica hard_delete=true, eliminar físicamente
        if (req.query.hard_delete === 'true') {
            await sequelize.query('DELETE FROM sales_meeting_attendees WHERE meeting_id = ?', { replacements: [id] });
            await sequelize.query('DELETE FROM sales_meetings WHERE id = ?', { replacements: [id] });
            return res.json({ success: true, message: 'Reunión eliminada permanentemente' });
        }

        res.json({
            success: true,
            message: 'Reunión marcada como eliminada',
            canRestore: true
        });
    } catch (error) {
        console.error('Error eliminando reunión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sales-orchestration/meetings/:id/mark-quoted
 * Marcar reunión como presupuestada (automático cuando se crea presupuesto)
 */
router.post('/meetings/:id/mark-quoted', authenticateStaff, async (req, res) => {
    try {
        const { id } = req.params;
        const { budgetId, companyId } = req.body;

        await sequelize.query(`
            UPDATE sales_meetings
            SET status = 'quoted',
                resulting_budget_id = ?,
                resulting_company_id = ?,
                updated_at = NOW()
            WHERE id = ?
        `, { replacements: [budgetId || null, companyId || null, id] });

        res.json({
            success: true,
            message: 'Reunión marcada como presupuestada',
            data: { id, status: 'quoted', budgetId, companyId }
        });
    } catch (error) {
        console.error('Error marcando reunión como presupuestada:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});



/**
 * POST /api/sales-orchestration/meetings/:id/approve-pitch
 * Vendedor aprueba el pitch generado y lo envía a los asistentes
 */
router.post('/meetings/:id/approve-pitch', authenticateStaff, async (req, res) => {
    try {
        const { id } = req.params;
        const { sendNow, scheduledTime } = req.body;

        // Obtener reunión
        const [meeting] = await sequelize.query(
            'SELECT * FROM sales_meetings WHERE id = ?',
            { replacements: [id], type: QueryTypes.SELECT }
        );

        if (!meeting) {
            return res.status(404).json({ success: false, error: 'Reunión no encontrada' });
        }

        if (meeting.status !== 'pitch_ready') {
            return res.status(400).json({
                success: false,
                error: 'El pitch debe estar en estado "pitch_ready" para ser aprobado',
                currentStatus: meeting.status
            });
        }

        // Marcar como aprobado
        await sequelize.query(`
            UPDATE sales_meetings
            SET pitch_approved_at = NOW(),
                pitch_approved_by = ?,
                status = 'pitch_approved',
                updated_at = NOW()
            WHERE id = ?
        `, { replacements: [req.staffId, id] });

        // Si sendNow es true, enviar emails inmediatamente
        if (sendNow) {
            await salesOrchestrationService.sendPitchesToAttendees(id);
            await sequelize.query(`
                UPDATE sales_meetings
                SET status = 'pitch_sent',
                    pitch_sent_at = NOW(),
                    updated_at = NOW()
                WHERE id = ?
            `, { replacements: [id] });

            return res.json({
                success: true,
                message: 'Pitch aprobado y enviado a los asistentes',
                status: 'pitch_sent'
            });
        }

        res.json({
            success: true,
            message: 'Pitch aprobado. Se enviará automáticamente 24h antes de la reunión.',
            status: 'pitch_approved'
        });
    } catch (error) {
        console.error('Error aprobando pitch:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sales-orchestration/meetings/:id/reject-pitch
 * Vendedor rechaza el pitch y solicita regeneración
 */
router.post('/meetings/:id/reject-pitch', authenticateStaff, async (req, res) => {
    try {
        const { id } = req.params;
        const { feedback } = req.body;

        // Marcar para regeneración
        await sequelize.query(`
            UPDATE sales_meetings
            SET pitch_rejected_at = NOW(),
                pitch_rejected_feedback = ?,
                status = 'pitch_rejected',
                updated_at = NOW()
            WHERE id = ?
        `, { replacements: [feedback || 'Requiere ajustes', id] });

        res.json({
            success: true,
            message: 'Pitch rechazado. Regenere con ajustes.',
            status: 'pitch_rejected'
        });
    } catch (error) {
        console.error('Error rechazando pitch:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/sales-orchestration/meetings/:id/attendee-pitches
 * Obtener pitches individuales de cada asistente (para revisión)
 */
router.get('/meetings/:id/attendee-pitches', authenticateStaff, async (req, res) => {
    try {
        const attendees = await sequelize.query(`
            SELECT id, full_name, email, job_title, department,
                   personal_pitch_data, survey_completed_at
            FROM sales_meeting_attendees
            WHERE meeting_id = ?
            ORDER BY is_decision_maker DESC, full_name ASC
        `, { replacements: [req.params.id], type: QueryTypes.SELECT });

        // Helper para parsear JSON de manera segura
        const safeParseJSON = (data) => {
            if (!data) return null;
            if (typeof data === 'object') return data;
            try { return JSON.parse(data); } catch (e) { return null; }
        };

        res.json({
            success: true,
            data: attendees.map(a => ({
                ...a,
                personal_pitch: safeParseJSON(a.personal_pitch_data)
            }))
        });
    } catch (error) {
        console.error('Error obteniendo pitches de asistentes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/sales-orchestration/meetings/:id/survey-responses
 * Obtener respuestas de encuestas para ver qué pidió cada participante
 */
router.get('/meetings/:id/survey-responses', authenticateStaff, async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener asistentes con sus respuestas de encuesta
        const attendees = await sequelize.query(`
            SELECT
                a.id,
                a.full_name,
                a.email,
                a.job_title,
                a.department,
                a.is_decision_maker,
                a.preferred_focus,
                a.survey_completed_at
            FROM sales_meeting_attendees a
            WHERE a.meeting_id = ?
            ORDER BY a.survey_completed_at DESC NULLS LAST
        `, { replacements: [id], type: QueryTypes.SELECT });

        // Obtener intereses por asistente
        const interests = await sequelize.query(`
            SELECT
                sai.attendee_id,
                sai.module_key,
                sai.interest_level,
                sai.priority_order,
                sai.notes,
                smd.short_description as module_name,
                smd.icon,
                smd.color
            FROM sales_attendee_interests sai
            LEFT JOIN sales_module_descriptions smd ON smd.module_key = sai.module_key
            WHERE sai.attendee_id IN (
                SELECT id FROM sales_meeting_attendees WHERE meeting_id = ?
            )
            ORDER BY sai.priority_order ASC
        `, { replacements: [id], type: QueryTypes.SELECT });

        // Agrupar intereses por asistente
        const attendeesWithInterests = attendees.map(attendee => ({
            ...attendee,
            interests: interests.filter(i => i.attendee_id === attendee.id),
            completedSurvey: !!attendee.survey_completed_at
        }));

        res.json({
            success: true,
            data: attendeesWithInterests,
            summary: {
                total: attendees.length,
                completed: attendees.filter(a => a.survey_completed_at).length,
                pending: attendees.filter(a => !a.survey_completed_at).length
            }
        });
    } catch (error) {
        console.error('Error obteniendo respuestas de encuestas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// FLYERS MARKETING INNOVADORES
// ============================================================================

/**
 * GET /flyers/ask-your-ai
 * Obtiene el flyer innovador "Preguntale a tu IA" en formato HTML y WhatsApp
 */
router.get('/flyers/ask-your-ai', async (req, res) => {
    try {
        const htmlFlyer = salesOrchestrationService.generateAskYourAIFlyer();
        const whatsappText = salesOrchestrationService.generateAskYourAIWhatsApp();

        res.json({
            success: true,
            flyers: {
                html: htmlFlyer,
                whatsapp: whatsappText,
                whatsappEncoded: encodeURIComponent(whatsappText)
            },
            usage: {
                email: 'Usar el campo "html" en el body del email',
                whatsapp: 'Usar el campo "whatsappEncoded" en: https://wa.me/?text=ENCODED_TEXT',
                whatsappLink: `https://wa.me/?text=${encodeURIComponent(whatsappText)}`
            }
        });
    } catch (error) {
        console.error('Error generando flyer Ask Your AI:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /flyers/promo
 * Obtiene el flyer promocional estándar de APONNT
 */
router.get('/flyers/promo', async (req, res) => {
    try {
        const htmlFlyer = salesOrchestrationService.generatePromoFlyer();

        res.json({
            success: true,
            flyer: {
                html: htmlFlyer
            },
            usage: {
                email: 'Insertar el HTML en el body del email'
            }
        });
    } catch (error) {
        console.error('Error generando flyer promo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /flyers/send-ask-your-ai
 * Envía el flyer "Preguntale a tu IA" a un email específico
 */
router.post('/flyers/send-ask-your-ai', async (req, res) => {
    try {
        const { email, recipientName } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email requerido' });
        }

        const htmlFlyer = salesOrchestrationService.generateAskYourAIFlyer();

        const emailHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto;">
                <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                    ${recipientName ? `Hola ${recipientName},` : 'Hola,'}
                </p>
                <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 20px 0;">
                    Te compartimos algo diferente: en lugar de enviarte un PDF con promesas de marketing,
                    te invitamos a que <strong>consultés a tu IA favorita</strong> sobre nosotros.
                </p>
                ${htmlFlyer}
                <p style="font-size: 14px; color: #666; margin: 25px 0 0 0;">
                    Saludos,<br>
                    <strong>Equipo APONNT</strong>
                </p>
            </div>
        `;

        await salesOrchestrationService.sendEmail({
            to: email,
            subject: '🤖 ¿Querés una opinión imparcial? Preguntale a tu IA favorita | APONNT',
            html: emailHtml
        });

        res.json({
            success: true,
            message: `Flyer enviado a ${email}`
        });
    } catch (error) {
        console.error('Error enviando flyer Ask Your AI:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
