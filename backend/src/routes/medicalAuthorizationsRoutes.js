/**
 * Medical Authorizations Routes
 * API para gestión de autorizaciones de edición/eliminación
 *
 * Endpoints:
 * - GET /api/medical-authorizations/pending - Autorizaciones pendientes (RRHH)
 * - GET /api/medical-authorizations/my-requests - Mis solicitudes (médicos)
 * - GET /api/medical-authorizations/:id - Detalle de autorización
 * - PUT /api/medical-authorizations/:id/approve - Aprobar
 * - PUT /api/medical-authorizations/:id/reject - Rechazar
 * - GET /api/medical-authorizations/:id/window-status - Estado de ventana
 * - POST /api/medical-authorizations/:id/cancel - Cancelar solicitud
 * - GET /api/medical-authorizations/stats - Estadísticas
 */

const express = require('express');
const router = express.Router();
const { auth: authMiddleware } = require('../middleware/auth');
const MedicalImmutabilityService = require('../services/MedicalImmutabilityService');
const {
    MedicalEditAuthorization,
    MedicalRecord,
    MedicalRecordAuditLog,
    User,
    sequelize
} = require('../config/database');
const { Op } = require('sequelize');

// Middleware de autenticación
router.use(authMiddleware);

// Helper para construir contexto
const buildContext = (req) => ({
    userId: req.user?.user_id || req.user?.id,
    companyId: req.user?.company_id,
    userName: req.user?.name || req.user?.username,
    userRole: req.user?.role,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent']
});

/**
 * GET /api/medical-authorizations/pending
 * Obtener autorizaciones pendientes para aprobar (vista RRHH/Supervisor)
 */
router.get('/pending', async (req, res) => {
    try {
        const context = buildContext(req);
        const { priority, action_type } = req.query;

        // Verificar que el usuario tenga rol de RRHH o supervisor
        const authorizerRoles = ['admin', 'rrhh', 'hr_manager', 'supervisor'];
        if (!authorizerRoles.includes(context.userRole)) {
            return res.status(403).json({
                success: false,
                error: 'No tiene permisos para ver autorizaciones pendientes'
            });
        }

        const where = {
            company_id: context.companyId,
            status: { [Op.in]: ['pending', 'escalated'] }
        };

        // Filtrar por step según rol
        if (['rrhh', 'hr_manager'].includes(context.userRole)) {
            // RRHH ve step 1
            where.current_step = 1;
        } else if (context.userRole === 'supervisor') {
            // Supervisor ve step 2 (escaladas)
            where.current_step = 2;
        }
        // Admin ve todas

        if (priority) {
            where.priority = priority;
        }

        if (action_type) {
            where.action_type = action_type;
        }

        const authorizations = await MedicalEditAuthorization.findAll({
            where,
            include: [
                {
                    model: MedicalRecord,
                    as: 'record',
                    include: [{
                        model: User,
                        as: 'employee',
                        attributes: ['user_id', 'firstName', 'lastName', 'email', 'dni']
                    }]
                },
                {
                    model: User,
                    as: 'requestor',
                    attributes: ['user_id', 'firstName', 'lastName', 'email']
                }
            ],
            order: [
                ['priority', 'DESC'],
                ['requested_at', 'ASC']
            ]
        });

        // Calcular tiempo restante para cada una
        const now = new Date();
        const authorizationsWithTime = authorizations.map(auth => {
            const requestedAt = new Date(auth.requested_at);
            let timeoutHours = auth.current_step === 1
                ? MedicalImmutabilityService.STEP1_TIMEOUT_HOURS
                : MedicalImmutabilityService.STEP2_TIMEOUT_HOURS;

            const baseTime = auth.current_step === 2 && auth.escalated_at
                ? new Date(auth.escalated_at)
                : requestedAt;

            const expiresAt = new Date(baseTime.getTime() + timeoutHours * 60 * 60 * 1000);
            const remainingMs = expiresAt - now;
            const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
            const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

            return {
                ...auth.toJSON(),
                timeRemaining: remainingMs > 0
                    ? `${remainingHours}h ${remainingMinutes}m`
                    : 'Expirado',
                expiresAt,
                isExpired: remainingMs <= 0
            };
        });

        res.json({
            success: true,
            authorizations: authorizationsWithTime,
            count: authorizations.length,
            userRole: context.userRole
        });

    } catch (error) {
        console.error('❌ [MEDICAL-AUTH] Error en GET /pending:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener autorizaciones pendientes'
        });
    }
});

/**
 * GET /api/medical-authorizations/my-requests
 * Obtener mis solicitudes de autorización (vista médico)
 */
router.get('/my-requests', async (req, res) => {
    try {
        const context = buildContext(req);
        const { status } = req.query;

        const where = {
            company_id: context.companyId,
            requested_by: context.userId
        };

        if (status) {
            where.status = status;
        }

        const authorizations = await MedicalEditAuthorization.findAll({
            where,
            include: [
                {
                    model: MedicalRecord,
                    as: 'record',
                    attributes: ['id', 'title', 'record_type', 'exam_date', 'employee_id'],
                    include: [{
                        model: User,
                        as: 'employee',
                        attributes: ['user_id', 'firstName', 'lastName']
                    }]
                },
                {
                    model: User,
                    as: 'authorizer',
                    attributes: ['user_id', 'firstName', 'lastName']
                }
            ],
            order: [['requested_at', 'DESC']]
        });

        // Agregar info de ventana activa
        const now = new Date();
        const authorizationsWithWindow = authorizations.map(auth => {
            const hasActiveWindow = auth.status === 'approved' &&
                !auth.window_used &&
                auth.authorization_window_end &&
                new Date(auth.authorization_window_end) > now;

            let windowInfo = null;
            if (hasActiveWindow) {
                const remainingMs = new Date(auth.authorization_window_end) - now;
                const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                windowInfo = {
                    active: true,
                    endsAt: auth.authorization_window_end,
                    remainingTime: `${hours}h ${minutes}m`
                };
            }

            return {
                ...auth.toJSON(),
                windowInfo
            };
        });

        res.json({
            success: true,
            authorizations: authorizationsWithWindow,
            count: authorizations.length
        });

    } catch (error) {
        console.error('❌ [MEDICAL-AUTH] Error en GET /my-requests:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener mis solicitudes'
        });
    }
});

/**
 * GET /api/medical-authorizations/:id
 * Obtener detalle de una autorización
 */
router.get('/:id', async (req, res) => {
    try {
        const context = buildContext(req);
        const { id } = req.params;

        const authorization = await MedicalEditAuthorization.findOne({
            where: {
                id,
                company_id: context.companyId
            },
            include: [
                {
                    model: MedicalRecord,
                    as: 'record',
                    include: [
                        {
                            model: User,
                            as: 'employee',
                            attributes: ['user_id', 'firstName', 'lastName', 'email', 'dni']
                        },
                        {
                            model: User,
                            as: 'creator',
                            attributes: ['user_id', 'firstName', 'lastName']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'requestor',
                    attributes: ['user_id', 'firstName', 'lastName', 'email']
                },
                {
                    model: User,
                    as: 'authorizer',
                    attributes: ['user_id', 'firstName', 'lastName', 'email']
                }
            ]
        });

        if (!authorization) {
            return res.status(404).json({
                success: false,
                error: 'Autorización no encontrada'
            });
        }

        // Calcular estado de ventana
        const now = new Date();
        let windowStatus = null;

        if (authorization.status === 'approved') {
            if (authorization.window_used) {
                windowStatus = {
                    status: 'used',
                    usedAt: authorization.window_used_at,
                    action: authorization.window_action_performed
                };
            } else if (new Date(authorization.authorization_window_end) > now) {
                const remainingMs = new Date(authorization.authorization_window_end) - now;
                const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                windowStatus = {
                    status: 'active',
                    endsAt: authorization.authorization_window_end,
                    remainingTime: `${hours}h ${minutes}m`
                };
            } else {
                windowStatus = {
                    status: 'expired',
                    expiredAt: authorization.authorization_window_end
                };
            }
        }

        res.json({
            success: true,
            authorization: authorization,
            windowStatus
        });

    } catch (error) {
        console.error('❌ [MEDICAL-AUTH] Error en GET /:id:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener autorización'
        });
    }
});

/**
 * PUT /api/medical-authorizations/:id/approve
 * Aprobar solicitud de autorización
 */
router.put('/:id/approve', async (req, res) => {
    try {
        const context = buildContext(req);
        const { id } = req.params;
        const { response } = req.body;

        // Verificar rol
        const authorizerRoles = ['admin', 'rrhh', 'hr_manager', 'supervisor'];
        if (!authorizerRoles.includes(context.userRole)) {
            return res.status(403).json({
                success: false,
                error: 'No tiene permisos para aprobar autorizaciones'
            });
        }

        const result = await MedicalImmutabilityService.approveAuthorization(
            parseInt(id),
            { response: response || '' },
            context
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);

    } catch (error) {
        console.error('❌ [MEDICAL-AUTH] Error en PUT /:id/approve:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al aprobar autorización'
        });
    }
});

/**
 * PUT /api/medical-authorizations/:id/reject
 * Rechazar solicitud de autorización
 */
router.put('/:id/reject', async (req, res) => {
    try {
        const context = buildContext(req);
        const { id } = req.params;
        const { response } = req.body;

        if (!response || response.length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere un motivo de rechazo de al menos 10 caracteres'
            });
        }

        // Verificar rol
        const authorizerRoles = ['admin', 'rrhh', 'hr_manager', 'supervisor'];
        if (!authorizerRoles.includes(context.userRole)) {
            return res.status(403).json({
                success: false,
                error: 'No tiene permisos para rechazar autorizaciones'
            });
        }

        const result = await MedicalImmutabilityService.rejectAuthorization(
            parseInt(id),
            { response },
            context
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);

    } catch (error) {
        console.error('❌ [MEDICAL-AUTH] Error en PUT /:id/reject:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al rechazar autorización'
        });
    }
});

/**
 * GET /api/medical-authorizations/:id/window-status
 * Verificar estado de ventana de autorización
 */
router.get('/:id/window-status', async (req, res) => {
    try {
        const context = buildContext(req);
        const { id } = req.params;

        const authorization = await MedicalEditAuthorization.findOne({
            where: {
                id,
                company_id: context.companyId
            }
        });

        if (!authorization) {
            return res.status(404).json({
                success: false,
                error: 'Autorización no encontrada'
            });
        }

        if (authorization.status !== 'approved') {
            return res.json({
                success: true,
                status: 'not_approved',
                message: `La autorización tiene estado: ${authorization.status}`
            });
        }

        if (authorization.window_used) {
            return res.json({
                success: true,
                status: 'used',
                usedAt: authorization.window_used_at,
                action: authorization.window_action_performed
            });
        }

        const now = new Date();
        const windowEnd = new Date(authorization.authorization_window_end);

        if (windowEnd <= now) {
            return res.json({
                success: true,
                status: 'expired',
                expiredAt: authorization.authorization_window_end
            });
        }

        const remainingMs = windowEnd - now;
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

        res.json({
            success: true,
            status: 'active',
            windowStart: authorization.authorization_window_start,
            windowEnd: authorization.authorization_window_end,
            remainingTime: `${hours}h ${minutes}m`,
            remainingMs,
            canPerformAction: true
        });

    } catch (error) {
        console.error('❌ [MEDICAL-AUTH] Error en GET /:id/window-status:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al verificar ventana'
        });
    }
});

/**
 * POST /api/medical-authorizations/:id/cancel
 * Cancelar solicitud de autorización (solo el solicitante, si está pendiente)
 */
router.post('/:id/cancel', async (req, res) => {
    try {
        const context = buildContext(req);
        const { id } = req.params;
        const { reason } = req.body;

        const authorization = await MedicalEditAuthorization.findOne({
            where: {
                id,
                company_id: context.companyId,
                requested_by: context.userId // Solo el solicitante puede cancelar
            }
        });

        if (!authorization) {
            return res.status(404).json({
                success: false,
                error: 'Autorización no encontrada o no tiene permisos para cancelarla'
            });
        }

        if (!['pending', 'escalated'].includes(authorization.status)) {
            return res.status(400).json({
                success: false,
                error: `No se puede cancelar una autorización con estado: ${authorization.status}`
            });
        }

        authorization.status = 'cancelled';

        const trail = authorization.audit_trail || [];
        trail.push({
            timestamp: new Date().toISOString(),
            action: 'cancelled',
            user_id: context.userId,
            user_name: context.userName || 'Usuario',
            details: { reason: reason || 'Cancelada por el solicitante' }
        });
        authorization.audit_trail = trail;

        await authorization.save();

        // Registrar en audit log del registro
        await MedicalRecordAuditLog.create({
            company_id: context.companyId,
            record_id: authorization.record_id,
            record_type: authorization.record_type,
            action: 'authorization_cancelled',
            action_by: context.userId,
            action_by_name: context.userName || 'Usuario',
            action_by_role: context.userRole,
            authorization_id: authorization.id,
            ip_address: context.ipAddress,
            user_agent: context.userAgent,
            notes: reason || 'Solicitud cancelada por el solicitante'
        });

        console.log(`✅ [MEDICAL-AUTH] Autorización cancelada: ID=${id}`);

        res.json({
            success: true,
            message: 'Solicitud de autorización cancelada'
        });

    } catch (error) {
        console.error('❌ [MEDICAL-AUTH] Error en POST /:id/cancel:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al cancelar solicitud'
        });
    }
});

/**
 * GET /api/medical-authorizations/stats
 * Estadísticas de autorizaciones
 */
router.get('/stats/summary', async (req, res) => {
    try {
        const context = buildContext(req);

        // Total por estado
        const byStatus = await MedicalEditAuthorization.findAll({
            where: { company_id: context.companyId },
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['status'],
            raw: true
        });

        // Total por tipo de acción
        const byActionType = await MedicalEditAuthorization.findAll({
            where: { company_id: context.companyId },
            attributes: [
                'action_type',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['action_type'],
            raw: true
        });

        // Tiempo promedio de respuesta (solo aprobadas/rechazadas)
        const avgResponseTime = await MedicalEditAuthorization.findOne({
            where: {
                company_id: context.companyId,
                status: { [Op.in]: ['approved', 'rejected'] },
                authorized_at: { [Op.ne]: null }
            },
            attributes: [
                [sequelize.fn('AVG',
                    sequelize.literal('EXTRACT(EPOCH FROM (authorized_at - requested_at))')
                ), 'avg_seconds']
            ],
            raw: true
        });

        const avgResponseHours = avgResponseTime?.avg_seconds
            ? Math.round(parseFloat(avgResponseTime.avg_seconds) / 3600)
            : null;

        // Ventanas usadas vs expiradas
        const windowStats = await MedicalEditAuthorization.findAll({
            where: {
                company_id: context.companyId,
                status: 'approved'
            },
            attributes: [
                'window_used',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['window_used'],
            raw: true
        });

        res.json({
            success: true,
            stats: {
                byStatus: byStatus.reduce((acc, s) => {
                    acc[s.status] = parseInt(s.count);
                    return acc;
                }, {}),
                byActionType: byActionType.reduce((acc, a) => {
                    acc[a.action_type] = parseInt(a.count);
                    return acc;
                }, {}),
                avgResponseTimeHours: avgResponseHours,
                windowStats: {
                    used: parseInt(windowStats.find(w => w.window_used === true)?.count || 0),
                    unused: parseInt(windowStats.find(w => w.window_used === false)?.count || 0)
                }
            }
        });

    } catch (error) {
        console.error('❌ [MEDICAL-AUTH] Error en GET /stats/summary:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener estadísticas'
        });
    }
});

module.exports = router;
