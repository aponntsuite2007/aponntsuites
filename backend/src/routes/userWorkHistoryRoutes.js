/**
 * ========================================================================
 * RUTAS: Historial Laboral con Desvinculación y Litigios
 * ========================================================================
 * API REST completa para gestión de antecedentes laborales
 * Incluye tracking completo de desvinculaciones, indemnizaciones y litigios
 * ========================================================================
 */

const express = require('express');
const router = express.Router();
const { auth: auth } = require('../middleware/auth');
const UserWorkHistory = require('../models/UserWorkHistory');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('../models/User-postgresql')(sequelize);

/**
 * GET /api/v1/users/:userId/work-history
 * Obtener todo el historial laboral de un usuario
 */
router.get('/users/:userId/work-history', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { companyId } = req.user;

        // Verificar que el usuario pertenece a la empresa
        const user = await User.findOne({
            where: {
                user_id: userId,
                company_id: companyId
            }
        });

        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        const workHistory = await UserWorkHistory.findAll({
            where: {
                user_id: userId,
                company_id: companyId
            },
            order: [
                ['currently_working', 'DESC'], // Trabajo actual primero
                ['start_date', 'DESC'] // Más reciente primero
            ]
        });

        res.json(workHistory);

    } catch (error) {
        console.error('❌ Error obteniendo historial laboral:', error);
        res.status(500).json({
            error: 'Error al obtener historial laboral',
            details: error.message
        });
    }
});

/**
 * GET /api/v1/users/:userId/work-history/:jobId
 * Obtener un trabajo específico con todos sus detalles
 */
router.get('/users/:userId/work-history/:jobId', auth, async (req, res) => {
    try {
        const { userId, jobId } = req.params;
        const { companyId } = req.user;

        const job = await UserWorkHistory.findOne({
            where: {
                id: jobId,
                user_id: userId,
                company_id: companyId
            }
        });

        if (!job) {
            return res.status(404).json({
                error: 'Registro laboral no encontrado'
            });
        }

        res.json(job);

    } catch (error) {
        console.error('❌ Error obteniendo registro laboral:', error);
        res.status(500).json({
            error: 'Error al obtener registro laboral',
            details: error.message
        });
    }
});

/**
 * POST /api/v1/users/:userId/work-history
 * Crear nuevo registro de historial laboral
 */
router.post('/users/:userId/work-history', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { companyId } = req.user;

        // Verificar que el usuario existe y pertenece a la empresa
        const user = await User.findOne({
            where: {
                user_id: userId,
                company_id: companyId
            }
        });

        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        // Validación básica
        const { company_name, position, start_date } = req.body;
        if (!company_name || !position || !start_date) {
            return res.status(400).json({
                error: 'Empresa, puesto y fecha de inicio son obligatorios'
            });
        }

        // Crear registro (solo columnas que existen en la tabla)
        const job = await UserWorkHistory.create({
            user_id: userId,
            company_id: companyId,
            company_name: req.body.company_name,
            position: req.body.position,
            start_date: req.body.start_date,
            end_date: req.body.end_date || null,
            currently_working: req.body.currently_working || false,
            reason_for_leaving: req.body.reason_for_leaving || null,
            responsibilities: req.body.responsibilities || null,
            supervisor_name: req.body.supervisor_name || null,
            supervisor_contact: req.body.supervisor_contact || null
        });

        console.log(`💼 [WORK-HISTORY] Nuevo registro creado: ${job.company_name} - ${job.position} para user ${userId}`);

        res.status(201).json(job);

    } catch (error) {
        console.error('❌ Error creando registro laboral:', error);
        res.status(500).json({
            error: 'Error al crear registro laboral',
            details: error.message
        });
    }
});

/**
 * PUT /api/v1/users/:userId/work-history/:jobId
 * Actualizar registro de historial laboral
 */
router.put('/users/:userId/work-history/:jobId', auth, async (req, res) => {
    try {
        const { userId, jobId } = req.params;
        const { companyId } = req.user;

        const job = await UserWorkHistory.findOne({
            where: {
                id: jobId,
                user_id: userId,
                company_id: companyId
            }
        });

        if (!job) {
            return res.status(404).json({
                error: 'Registro laboral no encontrado'
            });
        }

        // Lista completa de campos actualizables
        const updateFields = [
            'company_name', 'position', 'start_date', 'end_date', 'currently_working',
            'reason_for_leaving', 'responsibilities', 'supervisor_name', 'supervisor_contact',

            // Termination
            'termination_type', 'termination_subcategory', 'termination_date',
            'notice_period_days', 'notice_period_completed', 'notice_period_notes',

            // Severance
            'received_severance', 'severance_amount', 'severance_currency',
            'severance_payment_date', 'severance_payment_method', 'severance_breakdown',
            'severance_receipt_url',

            // Settlement
            'has_settlement_agreement', 'settlement_date', 'settlement_type',
            'settlement_amount', 'settlement_terms', 'settlement_document_url',
            'settlement_authority', 'settlement_file_number',

            // Litigation
            'has_litigation', 'litigation_status', 'litigation_start_date',
            'litigation_end_date', 'litigation_court', 'litigation_case_number',
            'litigation_subject', 'litigation_claimed_amount', 'litigation_awarded_amount',
            'litigation_outcome_summary', 'company_legal_representative',
            'employee_legal_representative',

            // Documentation
            'termination_letter_url', 'work_certificate_url', 'salary_certification_url',
            'additional_documents',

            // Internal
            'internal_notes', 'eligible_for_rehire', 'rehire_ineligibility_reason',
            'recommendation_letter_sent', 'recommendation_letter_url'
        ];

        updateFields.forEach(field => {
            if (req.body[field] !== undefined) {
                job[field] = req.body[field];
            }
        });

        job.last_updated_by = req.user.userId || null;
        await job.save();

        console.log(`💼 [WORK-HISTORY] Registro actualizado: ${jobId}`);

        res.json(job);

    } catch (error) {
        console.error('❌ Error actualizando registro laboral:', error);
        res.status(500).json({
            error: 'Error al actualizar registro laboral',
            details: error.message
        });
    }
});

/**
 * DELETE /api/v1/users/:userId/work-history/:jobId
 * Eliminar registro de historial laboral
 */
router.delete('/users/:userId/work-history/:jobId', auth, async (req, res) => {
    try {
        const { userId, jobId } = req.params;
        const { companyId } = req.user;

        const job = await UserWorkHistory.findOne({
            where: {
                id: jobId,
                user_id: userId,
                company_id: companyId
            }
        });

        if (!job) {
            return res.status(404).json({
                error: 'Registro laboral no encontrado'
            });
        }

        await job.destroy();

        console.log(`💼 [WORK-HISTORY] Registro eliminado: ${jobId}`);

        res.json({
            success: true,
            message: 'Registro laboral eliminado correctamente'
        });

    } catch (error) {
        console.error('❌ Error eliminando registro laboral:', error);
        res.status(500).json({
            error: 'Error al eliminar registro laboral',
            details: error.message
        });
    }
});

/**
 * GET /api/v1/work-history/active-litigations
 * Obtener litigios activos de la empresa
 */
router.get('/work-history/active-litigations', auth, async (req, res) => {
    try {
        const { companyId } = req.user;

        const [activeLitigations] = await sequelize.query(
            `SELECT * FROM get_active_litigations($1)`,
            {
                bind: [companyId]
            }
        );

        res.json(activeLitigations);

    } catch (error) {
        console.error('❌ Error obteniendo litigios activos:', error);
        res.status(500).json({
            error: 'Error al obtener litigios activos',
            details: error.message
        });
    }
});

/**
 * GET /api/v1/work-history/termination-stats
 * Obtener estadísticas de desvinculación de la empresa
 */
router.get('/work-history/termination-stats', auth, async (req, res) => {
    try {
        const { companyId } = req.user;

        const [stats] = await sequelize.query(
            `SELECT * FROM get_termination_stats_by_company($1)`,
            {
                bind: [companyId]
            }
        );

        res.json(stats[0] || {});

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
            error: 'Error al obtener estadísticas de desvinculación',
            details: error.message
        });
    }
});

/**
 * GET /api/v1/work-history/with-severance
 * Obtener empleados que recibieron indemnización
 */
router.get('/work-history/with-severance', auth, async (req, res) => {
    try {
        const { companyId } = req.user;

        const withSeverance = await UserWorkHistory.findAll({
            where: {
                company_id: companyId,
                received_severance: true
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['user_id', 'usuario', 'firstName', 'lastName']
            }],
            order: [['severance_payment_date', 'DESC']]
        });

        res.json(withSeverance);

    } catch (error) {
        console.error('❌ Error obteniendo indemnizaciones:', error);
        res.status(500).json({
            error: 'Error al obtener registros de indemnización',
            details: error.message
        });
    }
});

/**
 * GET /api/v1/work-history/not-eligible-for-rehire
 * Obtener ex-empleados no elegibles para recontratación
 */
router.get('/work-history/not-eligible-for-rehire', auth, async (req, res) => {
    try {
        const { companyId } = req.user;

        const notEligible = await UserWorkHistory.findAll({
            where: {
                company_id: companyId,
                eligible_for_rehire: false
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['user_id', 'usuario', 'firstName', 'lastName']
            }],
            order: [['end_date', 'DESC']]
        });

        res.json(notEligible);

    } catch (error) {
        console.error('❌ Error obteniendo no elegibles:', error);
        res.status(500).json({
            error: 'Error al obtener registros de no elegibles',
            details: error.message
        });
    }
});

module.exports = router;
