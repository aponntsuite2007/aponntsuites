/**
 * PROCEDURES ROUTES - Manual de Procedimientos
 *
 * API endpoints para gestión de procedimientos e instructivos
 *
 * @version 1.1.0
 * @date 2025-12-07
 */

const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const ProceduresService = require('../services/ProceduresService');

// Middleware: Solo RRHH, gerentes, supervisores pueden escribir/modificar
const canWrite = authorize('admin', 'super_admin', 'rrhh', 'gerente', 'supervisor');

// ============================================
// RUTAS ESPECÍFICAS (deben ir ANTES de /:id)
// ============================================

/**
 * GET /api/procedures/stats/dashboard
 * Estadísticas generales para dashboard
 */
router.get('/stats/dashboard', auth, async (req, res) => {
    try {
        const { sequelize } = require('../config/database');
        const companyId = req.user.company_id;

        // Estadísticas generales
        const [stats] = await sequelize.query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'published') as published_count,
                COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
                COUNT(*) FILTER (WHERE status = 'pending_review') as pending_review_count,
                COUNT(*) FILTER (WHERE status = 'obsolete') as obsolete_count,
                COUNT(*) as total_count,
                COUNT(DISTINCT CASE WHEN status = 'published' THEN id END) as active_procedures
            FROM procedures
            WHERE company_id = :companyId
        `, {
            replacements: { companyId },
            type: sequelize.QueryTypes.SELECT
        });

        // Estadísticas de acuses
        const [ackStats] = await sequelize.query(`
            SELECT
                COUNT(*) FILTER (WHERE pa.status = 'pending') as pending_acks,
                COUNT(*) FILTER (WHERE pa.status = 'acknowledged') as completed_acks,
                COUNT(*) as total_acks
            FROM procedure_acknowledgements pa
            JOIN procedures p ON pa.procedure_id = p.id
            WHERE p.company_id = :companyId
        `, {
            replacements: { companyId },
            type: sequelize.QueryTypes.SELECT
        });

        // Por tipo
        const byType = await sequelize.query(`
            SELECT type, COUNT(*) as count
            FROM procedures
            WHERE company_id = :companyId AND status = 'published'
            GROUP BY type
        `, {
            replacements: { companyId },
            type: sequelize.QueryTypes.SELECT
        });

        // Tasa de cumplimiento
        const complianceRate = ackStats.total_acks > 0
            ? Math.round((parseInt(ackStats.completed_acks) / parseInt(ackStats.total_acks)) * 100)
            : 100;

        res.json({
            success: true,
            stats: {
                ...stats,
                ...ackStats,
                complianceRate,
                byType
            }
        });
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/procedures/stats/compliance-report
 * Reporte de cumplimiento detallado
 */
router.get('/stats/compliance-report', auth, canWrite, async (req, res) => {
    try {
        const { sequelize } = require('../config/database');
        const companyId = req.user.company_id;
        const { department_id, branch_id, from_date, to_date } = req.query;

        let whereClause = 'p.company_id = :companyId AND p.status = \'published\'';
        const replacements = { companyId };

        if (department_id) {
            whereClause += ' AND p.department_id = :department_id';
            replacements.department_id = department_id;
        }
        if (branch_id) {
            whereClause += ' AND p.branch_id = :branch_id';
            replacements.branch_id = branch_id;
        }

        const report = await sequelize.query(`
            SELECT
                p.id,
                p.code,
                p.title,
                p.type,
                p.published_at,
                COUNT(pa.id) as total_notified,
                COUNT(pa.id) FILTER (WHERE pa.status = 'acknowledged') as acknowledged,
                COUNT(pa.id) FILTER (WHERE pa.status = 'pending') as pending,
                CASE
                    WHEN COUNT(pa.id) > 0
                    THEN ROUND((COUNT(pa.id) FILTER (WHERE pa.status = 'acknowledged')::numeric / COUNT(pa.id)) * 100, 1)
                    ELSE 100
                END as compliance_rate
            FROM procedures p
            LEFT JOIN procedure_acknowledgements pa ON p.id = pa.procedure_id
            WHERE ${whereClause}
            GROUP BY p.id, p.code, p.title, p.type, p.published_at
            ORDER BY p.published_at DESC
        `, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            report
        });
    } catch (error) {
        console.error('❌ Error generando reporte:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/procedures/generate-code
 * Generar código único para nuevo procedimiento
 */
router.get('/generate-code', auth, canWrite, async (req, res) => {
    try {
        const { type = 'instructivo', department_id } = req.query;
        const { sequelize } = require('../config/database');
        const companyId = req.user.company_id;

        // Prefijo según tipo
        const prefixes = {
            procedimiento: 'PRO',
            instructivo: 'INS',
            manual: 'MAN',
            politica: 'POL'
        };
        const prefix = prefixes[type] || 'DOC';

        // Obtener código de departamento si existe
        let deptCode = 'GEN';
        if (department_id) {
            const [dept] = await sequelize.query(`
                SELECT name FROM departments WHERE id = :department_id
            `, {
                replacements: { department_id },
                type: sequelize.QueryTypes.SELECT
            });
            if (dept) {
                // Tomar primeras 3 letras del nombre del departamento
                deptCode = dept.name.substring(0, 3).toUpperCase();
            }
        }

        // Obtener siguiente número
        const [result] = await sequelize.query(`
            SELECT COUNT(*) + 1 as next_num
            FROM procedures
            WHERE company_id = :companyId
            AND code LIKE :pattern
        `, {
            replacements: {
                companyId,
                pattern: `${prefix}-${deptCode}-%`
            },
            type: sequelize.QueryTypes.SELECT
        });

        const nextNum = String(result.next_num).padStart(3, '0');
        const generatedCode = `${prefix}-${deptCode}-${nextNum}`;

        res.json({
            success: true,
            code: generatedCode
        });
    } catch (error) {
        console.error('❌ Error generando código:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/procedures/employee/my-procedures
 * Obtener procedimientos que aplican al usuario actual
 */
router.get('/employee/my-procedures', auth, async (req, res) => {
    try {
        const procedures = await ProceduresService.getEmployeeProcedures(
            req.user.user_id,
            req.user.company_id
        );
        res.json({
            success: true,
            count: procedures.length,
            procedures
        });
    } catch (error) {
        console.error('❌ Error obteniendo procedimientos del empleado:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/procedures/employee/my-pending
 * Obtener procedimientos pendientes de acuse
 */
router.get('/employee/my-pending', auth, async (req, res) => {
    try {
        const pending = await ProceduresService.getPendingAcknowledgements(
            req.user.user_id,
            req.user.company_id
        );
        res.json({
            success: true,
            count: pending.length,
            procedures: pending
        });
    } catch (error) {
        console.error('❌ Error obteniendo pendientes:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/procedures/employee/my-summary
 * Resumen para Mi Espacio y Expediente 360
 */
router.get('/employee/my-summary', auth, async (req, res) => {
    try {
        const summary = await ProceduresService.getEmployeeProceduresSummary(
            req.user.user_id,
            req.user.company_id
        );
        res.json({
            success: true,
            ...summary
        });
    } catch (error) {
        console.error('❌ Error obteniendo resumen:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/procedures/employee/:userId/summary
 * Obtener resumen de procedimientos de un empleado (para RRHH/supervisores)
 */
router.get('/employee/:userId/summary', auth, canWrite, async (req, res) => {
    try {
        const summary = await ProceduresService.getEmployeeProceduresSummary(
            req.params.userId,
            req.user.company_id
        );
        res.json({
            success: true,
            ...summary
        });
    } catch (error) {
        console.error('❌ Error obteniendo resumen del empleado:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// SCOPE PARAMETRIZABLE (SSOT) - ANTES DE /:id
// ============================================

/**
 * GET /api/procedures/scope/entities/:scopeType
 * Obtener entidades disponibles para un tipo de scope
 */
router.get('/scope/entities/:scopeType', auth, async (req, res) => {
    try {
        const result = await ProceduresService.getScopeEntities(
            req.user.company_id,
            req.params.scopeType
        );
        res.json(result);
    } catch (error) {
        console.error('❌ Error obteniendo entidades de scope:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/procedures/scope/preview
 * Previsualizar cantidad de usuarios alcanzados por un scope
 */
router.post('/scope/preview', auth, async (req, res) => {
    try {
        const result = await ProceduresService.previewScopeUsers(
            req.user.company_id,
            req.body.scope_type,
            req.body.scope_entities
        );
        res.json(result);
    } catch (error) {
        console.error('❌ Error previsualizando scope:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/procedures/cleanup-expired
 * Limpiar borradores expirados
 */
router.post('/cleanup-expired', auth, authorize('admin', 'super_admin'), async (req, res) => {
    try {
        const result = await ProceduresService.cleanupExpiredDrafts();
        res.json({
            success: true,
            message: `${result.deleted_count} borradores expirados eliminados`,
            ...result
        });
    } catch (error) {
        console.error('❌ Error limpiando borradores:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// JERARQUÍA DOCUMENTAL ESTRICTA
// ============================================

/**
 * GET /api/procedures/hierarchy/tree
 * Obtener árbol completo de documentos (Política > Manual > Procedimiento > Instructivo)
 */
router.get('/hierarchy/tree', auth, async (req, res) => {
    try {
        const result = await ProceduresService.getDocumentTree(
            req.user.company_id,
            req.query.root_id || null
        );
        res.json(result);
    } catch (error) {
        console.error('❌ Error obteniendo árbol de documentos:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/procedures/hierarchy/view
 * Obtener vista de jerarquía con estadísticas
 */
router.get('/hierarchy/view', auth, async (req, res) => {
    try {
        const result = await ProceduresService.getHierarchyView(req.user.company_id);
        res.json(result);
    } catch (error) {
        console.error('❌ Error obteniendo vista de jerarquía:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/procedures/hierarchy/constants
 * Obtener constantes de jerarquía para el frontend
 */
router.get('/hierarchy/constants', auth, async (req, res) => {
    try {
        const constants = ProceduresService.getHierarchyConstants();
        res.json({
            success: true,
            ...constants
        });
    } catch (error) {
        console.error('❌ Error obteniendo constantes:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/procedures/hierarchy/parents/:documentType
 * Obtener padres disponibles para un tipo de documento
 * Útil para llenar el selector de padre en el formulario
 */
router.get('/hierarchy/parents/:documentType', auth, async (req, res) => {
    try {
        const result = await ProceduresService.getAvailableParents(
            req.user.company_id,
            req.params.documentType,
            req.query.exclude_id || null
        );
        res.json(result);
    } catch (error) {
        console.error('❌ Error obteniendo padres disponibles:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/procedures/hierarchy/validate
 * Validar jerarquía antes de crear/actualizar
 */
router.post('/hierarchy/validate', auth, async (req, res) => {
    try {
        const { document_type, parent_id } = req.body;
        const validation = ProceduresService.validateHierarchy(document_type, parent_id);
        res.json({
            success: true,
            validation
        });
    } catch (error) {
        console.error('❌ Error validando jerarquía:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// CRUD DE PROCEDIMIENTOS
// ============================================

/**
 * GET /api/procedures
 * Listar procedimientos de la empresa
 *
 * Query params:
 * - status: draft|pending_review|approved|published|obsolete
 * - type: procedimiento|instructivo|manual|politica
 * - branch_id, department_id, sector_id: Filtros de segmentación
 * - search: Búsqueda en código y título
 * - page, limit: Paginación
 */
router.get('/', auth, async (req, res) => {
    try {
        const result = await ProceduresService.list(req.user.company_id, req.query);
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('❌ Error listando procedimientos:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/procedures/:id
 * Obtener procedimiento por ID (DEBE IR AL FINAL de los GET)
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const procedure = await ProceduresService.getById(req.params.id, req.user.company_id);
        res.json({
            success: true,
            procedure
        });
    } catch (error) {
        console.error('❌ Error obteniendo procedimiento:', error);
        res.status(error.message.includes('no encontrado') ? 404 : 500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/procedures
 * Crear nuevo procedimiento
 */
router.post('/', auth, canWrite, async (req, res) => {
    try {
        const procedure = await ProceduresService.create(
            req.user.company_id,
            req.body,
            req.user.user_id
        );
        res.status(201).json({
            success: true,
            message: 'Procedimiento creado exitosamente',
            procedure
        });
    } catch (error) {
        console.error('❌ Error creando procedimiento:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * PUT /api/procedures/:id
 * Actualizar procedimiento (solo borradores o crear nueva versión)
 */
router.put('/:id', auth, canWrite, async (req, res) => {
    try {
        const procedure = await ProceduresService.update(
            req.params.id,
            req.user.company_id,
            req.body,
            req.user.user_id
        );
        res.json({
            success: true,
            message: 'Procedimiento actualizado',
            procedure
        });
    } catch (error) {
        console.error('❌ Error actualizando procedimiento:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * DELETE /api/procedures/:id
 * Eliminar procedimiento (solo borradores)
 */
router.delete('/:id', auth, canWrite, async (req, res) => {
    try {
        await ProceduresService.delete(req.params.id, req.user.company_id);
        res.json({
            success: true,
            message: 'Procedimiento eliminado'
        });
    } catch (error) {
        console.error('❌ Error eliminando procedimiento:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// ROLES Y ALCANCE
// ============================================

/**
 * POST /api/procedures/:id/roles
 * Asignar roles al procedimiento
 *
 * Body: { roles: [{ organizational_position_id, scope_type }] }
 */
router.post('/:id/roles', auth, canWrite, async (req, res) => {
    try {
        const roles = await ProceduresService.assignRoles(
            req.params.id,
            req.body.roles,
            req.user.company_id
        );
        res.json({
            success: true,
            message: 'Roles asignados',
            roles
        });
    } catch (error) {
        console.error('❌ Error asignando roles:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/procedures/:id/target-users
 * Obtener usuarios alcanzados por el procedimiento
 */
router.get('/:id/target-users', auth, canWrite, async (req, res) => {
    try {
        const users = await ProceduresService.getTargetUsers(
            req.params.id,
            req.user.company_id
        );
        res.json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error('❌ Error obteniendo usuarios objetivo:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// WORKFLOW DE PUBLICACIÓN
// ============================================

/**
 * POST /api/procedures/:id/submit-review
 * Enviar a revisión
 */
router.post('/:id/submit-review', auth, canWrite, async (req, res) => {
    try {
        const procedure = await ProceduresService.submitForReview(
            req.params.id,
            req.user.company_id
        );
        res.json({
            success: true,
            message: 'Procedimiento enviado a revisión',
            procedure
        });
    } catch (error) {
        console.error('❌ Error enviando a revisión:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/procedures/:id/approve
 * Aprobar procedimiento
 */
router.post('/:id/approve', auth, authorize('admin', 'super_admin', 'gerente'), async (req, res) => {
    try {
        const procedure = await ProceduresService.approve(
            req.params.id,
            req.user.user_id,
            req.user.company_id
        );
        res.json({
            success: true,
            message: 'Procedimiento aprobado',
            procedure
        });
    } catch (error) {
        console.error('❌ Error aprobando:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/procedures/:id/publish
 * Publicar procedimiento y enviar notificaciones
 */
router.post('/:id/publish', auth, canWrite, async (req, res) => {
    try {
        const result = await ProceduresService.publish(
            req.params.id,
            req.user.user_id,
            req.user.company_id
        );
        res.json({
            success: true,
            message: `Procedimiento publicado. ${result.notificationsCreated} notificaciones enviadas`,
            ...result
        });
    } catch (error) {
        console.error('❌ Error publicando:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/procedures/:id/obsolete
 * Marcar como obsoleto
 */
router.post('/:id/obsolete', auth, canWrite, async (req, res) => {
    try {
        const procedure = await ProceduresService.markObsolete(
            req.params.id,
            req.user.company_id
        );
        res.json({
            success: true,
            message: 'Procedimiento marcado como obsoleto',
            procedure
        });
    } catch (error) {
        console.error('❌ Error marcando obsoleto:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// VERSIONADO
// ============================================

/**
 * POST /api/procedures/:id/new-version
 * Crear nueva versión de un procedimiento publicado
 */
router.post('/:id/new-version', auth, canWrite, async (req, res) => {
    try {
        const result = await ProceduresService.createNewVersion(
            req.params.id,
            req.body,
            req.user.user_id,
            req.user.company_id
        );
        res.json({
            success: true,
            message: `Nueva versión ${result.newVersionLabel} creada`,
            ...result
        });
    } catch (error) {
        console.error('❌ Error creando nueva versión:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/procedures/:id/versions
 * Obtener historial de versiones
 */
router.get('/:id/versions', auth, async (req, res) => {
    try {
        const versions = await ProceduresService.getVersionHistory(
            req.params.id,
            req.user.company_id
        );
        res.json({
            success: true,
            versions
        });
    } catch (error) {
        console.error('❌ Error obteniendo versiones:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// ACUSES DE RECIBO
// ============================================

/**
 * POST /api/procedures/:id/acknowledge
 * Registrar acuse de recibo
 */
router.post('/:id/acknowledge', auth, async (req, res) => {
    try {
        const ack = await ProceduresService.acknowledge(
            req.params.id,
            req.user.user_id,
            req.ip || req.connection?.remoteAddress,
            req.body.method || 'web'
        );
        res.json({
            success: true,
            message: 'Acuse de recibo registrado',
            acknowledgement: ack
        });
    } catch (error) {
        console.error('❌ Error registrando acuse:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/procedures/:id/acknowledgements
 * Obtener estado de acuses de un procedimiento
 */
router.get('/:id/acknowledgements', auth, canWrite, async (req, res) => {
    try {
        const stats = await ProceduresService.getAcknowledgementStats(
            req.params.id,
            req.user.company_id
        );
        res.json({
            success: true,
            ...stats
        });
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas de acuses:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/procedures/:id/send-reminders
 * Enviar recordatorios a quienes no dieron acuse
 */
router.post('/:id/send-reminders', auth, canWrite, async (req, res) => {
    try {
        const result = await ProceduresService.sendReminders(
            req.params.id,
            req.user.company_id
        );
        res.json({
            success: true,
            message: `${result.remindersSent} recordatorios enviados`,
            ...result
        });
    } catch (error) {
        console.error('❌ Error enviando recordatorios:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// JERARQUÍA - OPERACIONES SOBRE DOCUMENTO
// ============================================

/**
 * GET /api/procedures/:id/children
 * Obtener hijos de un documento
 */
router.get('/:id/children', auth, async (req, res) => {
    try {
        const result = await ProceduresService.getChildren(
            req.params.id,
            req.query.recursive === 'true'
        );
        res.json(result);
    } catch (error) {
        console.error('❌ Error obteniendo hijos:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/procedures/:id/ancestors
 * Obtener ancestros de un documento (ruta hacia la raíz)
 */
router.get('/:id/ancestors', auth, async (req, res) => {
    try {
        const result = await ProceduresService.getAncestors(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('❌ Error obteniendo ancestros:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/procedures/:id/can-delete
 * Verificar si se puede eliminar un documento (no se puede si tiene hijos)
 */
router.get('/:id/can-delete', auth, canWrite, async (req, res) => {
    try {
        const result = await ProceduresService.canDelete(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('❌ Error verificando eliminación:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/procedures/:id/move
 * Mover documento a un nuevo padre
 */
router.post('/:id/move', auth, canWrite, async (req, res) => {
    try {
        const result = await ProceduresService.moveToParent(
            req.params.id,
            req.body.new_parent_id,
            req.user.user_id
        );
        res.json(result);
    } catch (error) {
        console.error('❌ Error moviendo documento:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/procedures/:id/scope-users
 * Obtener usuarios alcanzados por el scope del procedimiento
 */
router.get('/:id/scope-users', auth, canWrite, async (req, res) => {
    try {
        const result = await ProceduresService.getScopeUsers(
            req.params.id,
            req.user.company_id
        );
        res.json(result);
    } catch (error) {
        console.error('❌ Error obteniendo usuarios de scope:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/procedures/:id/lock-status
 * Verificar estado de bloqueo de un borrador
 */
router.get('/:id/lock-status', auth, async (req, res) => {
    try {
        const result = await ProceduresService.getDraftLockStatus(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('❌ Error verificando bloqueo:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/procedures/:id/lock
 * Intentar bloquear un borrador para edición
 */
router.post('/:id/lock', auth, canWrite, async (req, res) => {
    try {
        const result = await ProceduresService.tryLockDraft(
            req.params.id,
            req.user.user_id,
            req.body.ttl_days || 7
        );
        res.json(result);
    } catch (error) {
        console.error('❌ Error bloqueando borrador:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/procedures/:id/unlock
 * Liberar bloqueo de un borrador
 */
router.post('/:id/unlock', auth, canWrite, async (req, res) => {
    try {
        const result = await ProceduresService.unlockDraft(
            req.params.id,
            req.user.user_id,
            req.body.reason || 'manual'
        );
        res.json(result);
    } catch (error) {
        console.error('❌ Error liberando bloqueo:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/procedures/:id/lock-history
 * Obtener historial de bloqueos de un procedimiento
 */
router.get('/:id/lock-history', auth, canWrite, async (req, res) => {
    try {
        const result = await ProceduresService.getDraftLockHistory(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('❌ Error obteniendo historial de bloqueos:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
