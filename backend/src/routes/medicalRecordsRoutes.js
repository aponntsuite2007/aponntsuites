/**
 * Medical Records Routes
 * API para gestión de registros médicos con inmutabilidad
 *
 * Endpoints:
 * - POST /api/medical-records - Crear registro
 * - GET /api/medical-records/:id - Obtener registro
 * - PUT /api/medical-records/:id - Actualizar registro
 * - DELETE /api/medical-records/:id - Soft delete
 * - GET /api/medical-records/:id/editability - Estado de editabilidad
 * - POST /api/medical-records/:id/request-authorization - Solicitar autorización
 * - GET /api/medical-records/:id/audit-trail - Timeline de auditoría
 * - POST /api/medical-records/:id/lock - Bloquear manualmente
 * - GET /api/medical-records/employee/:employeeId - Registros de empleado
 * - GET /api/medical-records/expiring - Registros por vencer
 * - GET /api/medical-records/stats - Estadísticas
 */

const express = require('express');
const router = express.Router();
const { auth: authMiddleware } = require('../middleware/auth');
const MedicalImmutabilityService = require('../services/MedicalImmutabilityService');
const {
    MedicalRecord,
    MedicalExamTemplate,
    MedicalEditAuthorization,
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
    userAgent: req.headers['user-agent'],
    sessionId: req.sessionID
});

/**
 * POST /api/medical-records
 * Crear nuevo registro médico
 */
router.post('/', async (req, res) => {
    try {
        const context = buildContext(req);
        const data = req.body;

        // Validaciones básicas
        if (!data.employee_id) {
            return res.status(400).json({ success: false, error: 'employee_id es requerido' });
        }
        if (!data.record_type) {
            return res.status(400).json({ success: false, error: 'record_type es requerido' });
        }
        if (!data.title) {
            return res.status(400).json({ success: false, error: 'title es requerido' });
        }
        if (!data.exam_date) {
            return res.status(400).json({ success: false, error: 'exam_date es requerido' });
        }

        const result = await MedicalImmutabilityService.createRecord(data, context);

        res.status(201).json(result);

    } catch (error) {
        console.error('❌ [MEDICAL-API] Error en POST /:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al crear registro médico'
        });
    }
});

/**
 * GET /api/medical-records/:id
 * Obtener registro por ID con estado de editabilidad
 */
router.get('/:id', async (req, res) => {
    try {
        const context = buildContext(req);
        const { id } = req.params;

        const record = await MedicalRecord.findOne({
            where: {
                id,
                company_id: context.companyId,
                is_deleted: false
            },
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
                },
                {
                    model: User,
                    as: 'signer',
                    attributes: ['user_id', 'firstName', 'lastName']
                },
                {
                    model: MedicalExamTemplate,
                    as: 'template',
                    attributes: ['id', 'template_name', 'exam_type', 'validity_days']
                }
            ]
        });

        if (!record) {
            return res.status(404).json({
                success: false,
                error: 'Registro no encontrado'
            });
        }

        // Obtener estado de editabilidad
        const editability = await MedicalImmutabilityService.checkEditability(id, context.userId);

        // Verificar firma digital
        const signatureValid = MedicalImmutabilityService.verifySignature(record);

        res.json({
            success: true,
            record: record,
            editability: editability,
            signatureValid: signatureValid.valid,
            signatureInfo: signatureValid
        });

    } catch (error) {
        console.error('❌ [MEDICAL-API] Error en GET /:id:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener registro'
        });
    }
});

/**
 * PUT /api/medical-records/:id
 * Actualizar registro médico
 */
router.put('/:id', async (req, res) => {
    try {
        const context = buildContext(req);
        const { id } = req.params;
        const updates = req.body;

        const result = await MedicalImmutabilityService.updateRecord(
            parseInt(id),
            updates,
            context
        );

        if (!result.success) {
            return res.status(result.code === 'LOCKED' ? 403 : 400).json(result);
        }

        res.json(result);

    } catch (error) {
        console.error('❌ [MEDICAL-API] Error en PUT /:id:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al actualizar registro'
        });
    }
});

/**
 * DELETE /api/medical-records/:id
 * Soft delete de registro médico
 */
router.delete('/:id', async (req, res) => {
    try {
        const context = buildContext(req);
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason || reason.length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere una razón de al menos 10 caracteres para eliminar'
            });
        }

        const result = await MedicalImmutabilityService.softDeleteRecord(
            parseInt(id),
            { reason },
            context
        );

        if (!result.success) {
            return res.status(result.code === 'LOCKED' ? 403 : 400).json(result);
        }

        res.json(result);

    } catch (error) {
        console.error('❌ [MEDICAL-API] Error en DELETE /:id:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al eliminar registro'
        });
    }
});

/**
 * GET /api/medical-records/:id/editability
 * Verificar estado de editabilidad
 */
router.get('/:id/editability', async (req, res) => {
    try {
        const context = buildContext(req);
        const { id } = req.params;

        const editability = await MedicalImmutabilityService.checkEditability(
            parseInt(id),
            context.userId
        );

        res.json({
            success: true,
            ...editability
        });

    } catch (error) {
        console.error('❌ [MEDICAL-API] Error en GET /:id/editability:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al verificar editabilidad'
        });
    }
});

/**
 * POST /api/medical-records/:id/request-authorization
 * Solicitar autorización para editar/eliminar
 */
router.post('/:id/request-authorization', async (req, res) => {
    try {
        const context = buildContext(req);
        const { id } = req.params;
        const { reason, action_type, proposed_changes, priority } = req.body;

        if (!reason || reason.length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere una razón de al menos 10 caracteres'
            });
        }

        if (!action_type || !['edit', 'delete'].includes(action_type)) {
            return res.status(400).json({
                success: false,
                error: 'action_type debe ser "edit" o "delete"'
            });
        }

        const result = await MedicalImmutabilityService.requestAuthorization(
            parseInt(id),
            { reason, action_type, proposed_changes, priority },
            context
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.status(201).json(result);

    } catch (error) {
        console.error('❌ [MEDICAL-API] Error en POST /:id/request-authorization:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al solicitar autorización'
        });
    }
});

/**
 * GET /api/medical-records/:id/audit-trail
 * Obtener timeline de auditoría
 */
router.get('/:id/audit-trail', async (req, res) => {
    try {
        const context = buildContext(req);
        const { id } = req.params;
        const { actions, from_date, to_date, limit } = req.query;

        // Verificar que el registro pertenece a la empresa
        const record = await MedicalRecord.findOne({
            where: { id, company_id: context.companyId }
        });

        if (!record) {
            return res.status(404).json({
                success: false,
                error: 'Registro no encontrado'
            });
        }

        const options = {};
        if (actions) options.actions = actions.split(',');
        if (from_date) options.fromDate = new Date(from_date);
        if (to_date) options.toDate = new Date(to_date);
        if (limit) options.limit = parseInt(limit);

        const timeline = await MedicalImmutabilityService.getAuditTimeline(
            parseInt(id),
            options
        );

        res.json({
            success: true,
            recordId: parseInt(id),
            timeline: timeline,
            count: timeline.length
        });

    } catch (error) {
        console.error('❌ [MEDICAL-API] Error en GET /:id/audit-trail:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener timeline'
        });
    }
});

/**
 * GET /api/medical-records/:id/custody-chain
 * Generar reporte de cadena de custodia
 */
router.get('/:id/custody-chain', async (req, res) => {
    try {
        const context = buildContext(req);
        const { id } = req.params;

        // Verificar permisos
        const record = await MedicalRecord.findOne({
            where: { id, company_id: context.companyId }
        });

        if (!record) {
            return res.status(404).json({
                success: false,
                error: 'Registro no encontrado'
            });
        }

        const report = await MedicalImmutabilityService.getCustodyChainReport(parseInt(id));

        res.json({
            success: true,
            report: report
        });

    } catch (error) {
        console.error('❌ [MEDICAL-API] Error en GET /:id/custody-chain:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al generar reporte'
        });
    }
});

/**
 * POST /api/medical-records/:id/lock
 * Bloquear registro manualmente (antes de que expire ventana)
 */
router.post('/:id/lock', async (req, res) => {
    try {
        const context = buildContext(req);
        const { id } = req.params;
        const { reason } = req.body;

        const record = await MedicalRecord.findOne({
            where: {
                id,
                company_id: context.companyId,
                is_deleted: false
            }
        });

        if (!record) {
            return res.status(404).json({
                success: false,
                error: 'Registro no encontrado'
            });
        }

        if (record.is_locked) {
            return res.status(400).json({
                success: false,
                error: 'El registro ya está bloqueado'
            });
        }

        await record.lock(context.userId, reason || 'Bloqueo manual por usuario');

        res.json({
            success: true,
            message: 'Registro bloqueado exitosamente',
            lockedAt: record.locked_at
        });

    } catch (error) {
        console.error('❌ [MEDICAL-API] Error en POST /:id/lock:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al bloquear registro'
        });
    }
});

/**
 * GET /api/medical-records/employee/:employeeId
 * Obtener registros de un empleado específico
 */
router.get('/employee/:employeeId', async (req, res) => {
    try {
        const context = buildContext(req);
        const { employeeId } = req.params;
        const { record_type, result, include_deleted } = req.query;

        const where = {
            company_id: context.companyId,
            employee_id: employeeId
        };

        if (!include_deleted || include_deleted !== 'true') {
            where.is_deleted = false;
        }

        if (record_type) {
            where.record_type = record_type;
        }

        if (result) {
            where.result = result;
        }

        const records = await MedicalRecord.findAll({
            where,
            include: [
                {
                    model: MedicalExamTemplate,
                    as: 'template',
                    attributes: ['id', 'template_name', 'exam_type']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['user_id', 'firstName', 'lastName']
                }
            ],
            order: [['exam_date', 'DESC']]
        });

        // Agregar estado de editabilidad a cada registro
        const recordsWithEditability = await Promise.all(
            records.map(async (record) => {
                const editability = await MedicalImmutabilityService.checkEditability(
                    record.id,
                    context.userId
                );
                return {
                    ...record.toJSON(),
                    editability
                };
            })
        );

        res.json({
            success: true,
            employeeId: parseInt(employeeId),
            records: recordsWithEditability,
            count: records.length
        });

    } catch (error) {
        console.error('❌ [MEDICAL-API] Error en GET /employee/:employeeId:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener registros'
        });
    }
});

/**
 * GET /api/medical-records/expiring
 * Obtener registros próximos a vencer
 */
router.get('/expiring/list', async (req, res) => {
    try {
        const context = buildContext(req);
        const { days } = req.query;

        const records = await MedicalRecord.getExpiringSoon(
            context.companyId,
            parseInt(days) || 30
        );

        res.json({
            success: true,
            records: records,
            count: records.length,
            daysAhead: parseInt(days) || 30
        });

    } catch (error) {
        console.error('❌ [MEDICAL-API] Error en GET /expiring/list:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener registros por vencer'
        });
    }
});

/**
 * GET /api/medical-records/stats
 * Obtener estadísticas de registros médicos
 */
router.get('/stats/summary', async (req, res) => {
    try {
        const context = buildContext(req);

        const stats = await MedicalImmutabilityService.getStats(context.companyId);

        res.json({
            success: true,
            stats: stats
        });

    } catch (error) {
        console.error('❌ [MEDICAL-API] Error en GET /stats/summary:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener estadísticas'
        });
    }
});

/**
 * POST /api/medical-records/verify-signature
 * Verificar firma digital de un registro
 */
router.post('/verify-signature', async (req, res) => {
    try {
        const context = buildContext(req);
        const { record_id } = req.body;

        const record = await MedicalRecord.findOne({
            where: {
                id: record_id,
                company_id: context.companyId
            }
        });

        if (!record) {
            return res.status(404).json({
                success: false,
                error: 'Registro no encontrado'
            });
        }

        const verification = MedicalImmutabilityService.verifySignature(record);

        res.json({
            success: true,
            recordId: record_id,
            verification: verification,
            signatureTimestamp: record.signature_timestamp,
            signedBy: record.signed_by
        });

    } catch (error) {
        console.error('❌ [MEDICAL-API] Error en POST /verify-signature:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al verificar firma'
        });
    }
});

module.exports = router;
