/**
 * PROCEDURES SERVICE - Manual de Procedimientos
 * Servicio para gestión de procedimientos e instructivos
 *
 * Funcionalidades:
 * - CRUD de procedimientos con JERARQUÍA ESTRICTA
 * - Versionado automático
 * - Publicación con notificaciones
 * - Acuses de recibo
 * - Integración con estructura organizacional
 * - Sistema de propietarios múltiples (owners)
 * - Alcance parametrizable (scope)
 * - Control de borradores concurrentes
 *
 * JERARQUÍA DOCUMENTAL (obligatoria):
 * 📜 POLÍTICA (nivel 1) - Raíz, sin padre
 * └── 📕 MANUAL (nivel 2) - DEBE pertenecer a una Política
 *     └── 📋 PROCEDIMIENTO (nivel 3) - DEBE pertenecer a un Manual
 *         └── 📝 INSTRUCTIVO (nivel 4) - DEBE pertenecer a un Procedimiento
 *
 * @version 1.2.0
 * @date 2025-12-07
 */

const { sequelize } = require('../config/database');
const { QueryTypes, Op } = require('sequelize');

class ProceduresService {

    // =========================================================================
    // CRUD DE PROCEDIMIENTOS
    // =========================================================================

    /**
     * Crear nuevo procedimiento (borrador)
     */
    static async create(companyId, data, userId) {
        try {
            // Generar código único si no se proporciona
            if (!data.code) {
                data.code = await this.generateCode(companyId, data.type || 'instructivo');
            }

            // Validar jerarquía: solo políticas pueden no tener padre
            const docType = data.type || 'instructivo';
            if (docType !== 'politica' && !data.parent_id) {
                return {
                    success: false,
                    error: `Los documentos de tipo "${docType}" DEBEN tener un documento padre. Solo las políticas pueden existir sin padre.`
                };
            }
            if (docType === 'politica' && data.parent_id) {
                return {
                    success: false,
                    error: 'Las políticas son el nivel raíz y NO pueden tener documento padre.'
                };
            }

            const [result] = await sequelize.query(`
                INSERT INTO procedures (
                    company_id, code, title, type, status,
                    parent_id,
                    objective, scope, definitions, responsibilities,
                    procedure_content, "references", annexes,
                    branch_id, department_id, sector_id,
                    effective_date, expiry_date, review_date,
                    is_critical, requires_training, tags,
                    created_by, owners,
                    scope_type, scope_entities, inherit_scope
                ) VALUES (
                    :companyId, :code, :title, :type, 'draft',
                    :parent_id,
                    :objective, :scope, :definitions, :responsibilities,
                    :procedure_content, :references, :annexes,
                    :branch_id, :department_id, :sector_id,
                    :effective_date, :expiry_date, :review_date,
                    :is_critical, :requires_training, :tags,
                    :userId, :owners,
                    :scope_type, :scope_entities, :inherit_scope
                )
                RETURNING *
            `, {
                replacements: {
                    companyId,
                    code: data.code,
                    title: data.title,
                    type: docType,
                    parent_id: data.parent_id || null,
                    objective: data.objective || null,
                    scope: data.scope || null,
                    definitions: data.definitions || null,
                    responsibilities: data.responsibilities || null,
                    procedure_content: data.procedure_content || null,
                    references: data.references || null,
                    annexes: data.annexes || null,
                    branch_id: data.branch_id || null,
                    department_id: data.department_id || null,
                    sector_id: data.sector_id || null,
                    effective_date: data.effective_date || null,
                    expiry_date: data.expiry_date || null,
                    review_date: data.review_date || null,
                    is_critical: data.is_critical || false,
                    requires_training: data.requires_training || false,
                    tags: data.tags ? `{${data.tags.join(',')}}` : '{}',
                    userId,
                    owners: data.owners ? JSON.stringify(data.owners) : '[]',
                    scope_type: data.scope_type || 'company',
                    scope_entities: JSON.stringify(data.scope_entities || []),
                    inherit_scope: data.inherit_scope !== false
                },
                type: QueryTypes.SELECT
            });

            console.log(`[PROCEDURES] Procedimiento creado: ${data.code}`);

            return result;

        } catch (error) {
            console.error('[PROCEDURES] Error creando procedimiento:', error);
            throw error;
        }
    }

    /**
     * Obtener procedimiento por ID
     */
    static async getById(procedureId, companyId) {
        try {
            const [procedures] = await sequelize.query(`
                SELECT
                    p.*,
                    u1."firstName" || ' ' || u1."lastName" as created_by_name,
                    u2."firstName" || ' ' || u2."lastName" as published_by_name,
                    b.name as branch_name,
                    d.name as department_name,
                    s.name as sector_name
                FROM procedures p
                LEFT JOIN users u1 ON p.created_by = u1.user_id
                LEFT JOIN users u2 ON p.published_by = u2.user_id
                LEFT JOIN branches b ON p.branch_id = b.id
                LEFT JOIN departments d ON p.department_id = d.id
                LEFT JOIN sectors s ON p.sector_id = s.id
                WHERE p.id = :procedureId AND p.company_id = :companyId
            `, {
                replacements: { procedureId, companyId },
                type: QueryTypes.SELECT
            });

            if (!procedures || procedures.length === 0) {
                return { success: false, error: 'Procedimiento no encontrado' };
            }

            const procedure = procedures[0];

            // Obtener roles asignados
            const [roles] = await sequelize.query(`
                SELECT pr.*, op.position_name, op.work_category
                FROM procedure_roles pr
                LEFT JOIN organizational_positions op ON pr.organizational_position_id = op.id
                WHERE pr.procedure_id = :procedureId
            `, {
                replacements: { procedureId },
                type: QueryTypes.SELECT
            });

            // Obtener estadísticas de acuses
            const [stats] = await sequelize.query(`
                SELECT * FROM get_procedure_ack_stats(:procedureId)
            `, {
                replacements: { procedureId },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                procedure: {
                    ...procedure,
                    roles: roles || [],
                    acknowledgement_stats: stats[0] || {}
                }
            };

        } catch (error) {
            console.error('[PROCEDURES] Error obteniendo procedimiento:', error);
            throw error;
        }
    }

    /**
     * Listar procedimientos de la empresa
     */
    static async list(companyId, filters = {}) {
        try {
            let whereClause = 'WHERE p.company_id = :companyId';
            const replacements = { companyId };

            if (filters.status) {
                whereClause += ' AND p.status = :status';
                replacements.status = filters.status;
            }

            if (filters.type) {
                whereClause += ' AND p.type = :type';
                replacements.type = filters.type;
            }

            if (filters.department_id) {
                whereClause += ' AND p.department_id = :department_id';
                replacements.department_id = filters.department_id;
            }

            if (filters.search) {
                whereClause += ` AND (
                    p.code ILIKE :search OR
                    p.title ILIKE :search OR
                    p.objective ILIKE :search
                )`;
                replacements.search = `%${filters.search}%`;
            }

            const [procedures] = await sequelize.query(`
                SELECT
                    p.id, p.code, p.title, p.type, p.version_label, p.status,
                    p.effective_date, p.is_critical, p.published_at,
                    p.created_at, p.updated_at,
                    d.name as department_name,
                    u."firstName" || ' ' || u."lastName" as created_by_name,
                    (SELECT COUNT(*) FROM procedure_roles WHERE procedure_id = p.id) as roles_count,
                    (SELECT COUNT(*) FROM procedure_acknowledgements WHERE procedure_id = p.id AND status = 'acknowledged') as ack_count,
                    (SELECT COUNT(*) FROM procedure_acknowledgements WHERE procedure_id = p.id) as total_acks
                FROM procedures p
                LEFT JOIN departments d ON p.department_id = d.id
                LEFT JOIN users u ON p.created_by = u.user_id
                ${whereClause}
                ORDER BY p.updated_at DESC
            `, {
                replacements,
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                procedures: procedures || [],
                count: procedures?.length || 0
            };

        } catch (error) {
            console.error('[PROCEDURES] Error listando procedimientos:', error);
            throw error;
        }
    }

    /**
     * Actualizar procedimiento (solo si está en borrador)
     */
    static async update(procedureId, companyId, data, userId) {
        try {
            // Verificar que está en borrador
            const current = await sequelize.query(`
                SELECT status FROM procedures
                WHERE id = :procedureId AND company_id = :companyId
            `, {
                replacements: { procedureId, companyId },
                type: QueryTypes.SELECT
            });

            if (!current || current.length === 0) {
                return { success: false, error: 'Procedimiento no encontrado' };
            }

            if (current[0].status !== 'draft') {
                return {
                    success: false,
                    error: 'Solo se pueden editar procedimientos en borrador. Para modificar uno publicado, cree una nueva versión.'
                };
            }

            await sequelize.query(`
                UPDATE procedures SET
                    title = COALESCE(:title, title),
                    objective = COALESCE(:objective, objective),
                    scope = COALESCE(:scope, scope),
                    definitions = COALESCE(:definitions, definitions),
                    responsibilities = COALESCE(:responsibilities, responsibilities),
                    procedure_content = COALESCE(:procedure_content, procedure_content),
                    "references" = COALESCE(:references, "references"),
                    annexes = COALESCE(:annexes, annexes),
                    branch_id = :branch_id,
                    department_id = :department_id,
                    sector_id = :sector_id,
                    effective_date = :effective_date,
                    expiry_date = :expiry_date,
                    review_date = :review_date,
                    is_critical = COALESCE(:is_critical, is_critical),
                    requires_training = COALESCE(:requires_training, requires_training),
                    updated_at = NOW()
                WHERE id = :procedureId AND company_id = :companyId
            `, {
                replacements: {
                    procedureId, companyId,
                    title: data.title || null,
                    objective: data.objective || null,
                    scope: data.scope || null,
                    definitions: data.definitions || null,
                    responsibilities: data.responsibilities || null,
                    procedure_content: data.procedure_content || null,
                    references: data.references || null,
                    annexes: data.annexes || null,
                    branch_id: data.branch_id || null,
                    department_id: data.department_id || null,
                    sector_id: data.sector_id || null,
                    effective_date: data.effective_date || null,
                    expiry_date: data.expiry_date || null,
                    review_date: data.review_date || null,
                    is_critical: data.is_critical != null ? data.is_critical : null,
                    requires_training: data.requires_training != null ? data.requires_training : null
                },
                type: QueryTypes.UPDATE
            });

            // Agregar usuario actual como propietario/modificador
            if (userId) {
                try {
                    await sequelize.query(`
                        SELECT add_procedure_owner(:procedureId, :userId, 'modified')
                    `, {
                        replacements: { procedureId, userId },
                        type: QueryTypes.SELECT
                    });
                } catch (ownerError) {
                    // No fallar si la función no existe aún (pre-migración)
                    console.warn('[PROCEDURES] add_procedure_owner no disponible:', ownerError.message);
                }
            }

            return { success: true, message: 'Procedimiento actualizado' };

        } catch (error) {
            console.error('[PROCEDURES] Error actualizando:', error);
            throw error;
        }
    }

    /**
     * Eliminar procedimiento
     */
    static async delete(procedureId, companyId) {
        try {
            const result = await sequelize.query(`
                DELETE FROM procedures
                WHERE id = :procedureId AND company_id = :companyId
                RETURNING *
            `, {
                replacements: { procedureId, companyId },
                type: QueryTypes.SELECT
            });

            if (!result || result.length === 0) {
                return { success: false, error: 'Procedimiento no encontrado' };
            }

            console.log(`[PROCEDURES] Procedimiento eliminado: ${result[0].code}`);

            return {
                success: true,
                message: 'Procedimiento eliminado correctamente',
                deleted: result[0]
            };

        } catch (error) {
            console.error('[PROCEDURES] Error eliminando procedimiento:', error);
            throw error;
        }
    }

    // =========================================================================
    // GESTIÓN DE ROLES
    // =========================================================================

    /**
     * Asignar roles al procedimiento
     */
    static async assignRoles(procedureId, companyId, roles) {
        try {
            // Eliminar roles anteriores
            await sequelize.query(`
                DELETE FROM procedure_roles WHERE procedure_id = :procedureId
            `, { replacements: { procedureId }, type: QueryTypes.DELETE });

            // Insertar nuevos roles
            for (const role of roles) {
                await sequelize.query(`
                    INSERT INTO procedure_roles (procedure_id, organizational_position_id, role_name, scope_type)
                    VALUES (:procedureId, :positionId, :roleName, :scopeType)
                `, {
                    replacements: {
                        procedureId,
                        positionId: role.organizational_position_id || null,
                        roleName: role.role_name || null,
                        scopeType: role.scope_type || 'must_read'
                    },
                    type: QueryTypes.INSERT
                });
            }

            return {
                success: true,
                message: `${roles.length} roles asignados al procedimiento`
            };

        } catch (error) {
            console.error('[PROCEDURES] Error asignando roles:', error);
            throw error;
        }
    }

    /**
     * Obtener usuarios alcanzados por un procedimiento
     */
    static async getTargetUsers(procedureId, companyId) {
        try {
            const [users] = await sequelize.query(`
                SELECT * FROM get_procedure_target_users(:procedureId)
            `, {
                replacements: { procedureId },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                users: users || [],
                count: users?.length || 0
            };

        } catch (error) {
            console.error('[PROCEDURES] Error obteniendo usuarios:', error);
            throw error;
        }
    }

    // =========================================================================
    // PUBLICACIÓN Y VERSIONADO
    // =========================================================================

    /**
     * Publicar procedimiento (genera versión y notifica)
     */
    static async publish(procedureId, companyId, userId, options = {}) {
        const transaction = await sequelize.transaction();

        try {
            // Obtener procedimiento
            const [procedures] = await sequelize.query(`
                SELECT * FROM procedures
                WHERE id = :procedureId AND company_id = :companyId
            `, {
                replacements: { procedureId, companyId },
                type: QueryTypes.SELECT,
                transaction
            });

            if (!procedures || procedures.length === 0) {
                await transaction.rollback();
                return { success: false, error: 'Procedimiento no encontrado' };
            }

            const procedure = procedures[0];

            // Verificar que tiene roles asignados
            const [roles] = await sequelize.query(`
                SELECT COUNT(*) as count FROM procedure_roles WHERE procedure_id = :procedureId
            `, { replacements: { procedureId }, type: QueryTypes.SELECT, transaction });

            if (!roles[0]?.count || roles[0].count === 0) {
                await transaction.rollback();
                return { success: false, error: 'Debe asignar al menos un rol antes de publicar' };
            }

            // Marcar versiones anteriores como superseded
            if (procedure.current_version > 1) {
                await sequelize.query(`
                    UPDATE procedure_versions
                    SET status = 'superseded'
                    WHERE procedure_id = :procedureId AND status = 'current'
                `, { replacements: { procedureId }, type: QueryTypes.UPDATE, transaction });
            }

            // Crear registro de versión
            const [versionResult] = await sequelize.query(`
                INSERT INTO procedure_versions (
                    procedure_id, version_number, version_label,
                    objective, scope, definitions, responsibilities,
                    procedure_content, "references", annexes,
                    changes_summary, change_reason,
                    created_by, published_by, published_at, status
                ) VALUES (
                    :procedureId, :versionNumber, :versionLabel,
                    :objective, :scope, :definitions, :responsibilities,
                    :procedure_content, :references, :annexes,
                    :changesSummary, :changeReason,
                    :userId, :userId, NOW(), 'current'
                )
                RETURNING *
            `, {
                replacements: {
                    procedureId,
                    versionNumber: procedure.current_version,
                    versionLabel: procedure.version_label,
                    objective: procedure.objective,
                    scope: procedure.scope,
                    definitions: procedure.definitions,
                    responsibilities: procedure.responsibilities,
                    procedure_content: procedure.procedure_content,
                    references: procedure.references,
                    annexes: procedure.annexes,
                    changesSummary: options.changes_summary || 'Publicación inicial',
                    changeReason: options.change_reason || null,
                    userId
                },
                type: QueryTypes.INSERT,
                transaction
            });

            const newVersion = versionResult[0];

            // Actualizar estado del procedimiento
            await sequelize.query(`
                UPDATE procedures SET
                    status = 'published',
                    published_by = :userId,
                    published_at = NOW(),
                    effective_date = COALESCE(effective_date, CURRENT_DATE)
                WHERE id = :procedureId
            `, {
                replacements: { procedureId, userId },
                type: QueryTypes.UPDATE,
                transaction
            });

            // Obtener usuarios objetivo
            const [targetUsers] = await sequelize.query(`
                SELECT * FROM get_procedure_target_users(:procedureId)
            `, { replacements: { procedureId }, type: QueryTypes.SELECT, transaction });

            // Crear registros de acuse y enviar notificaciones
            const notificationResults = [];
            for (const user of targetUsers) {
                // Crear registro de acuse pendiente
                await sequelize.query(`
                    INSERT INTO procedure_acknowledgements (
                        procedure_id, procedure_version_id, user_id,
                        employee_id, employee_name, status, notification_sent_at
                    ) VALUES (
                        :procedureId, :versionId, :userId,
                        :employeeId, :employeeName, 'pending', NOW()
                    )
                    ON CONFLICT (procedure_id, procedure_version_id, user_id) DO NOTHING
                `, {
                    replacements: {
                        procedureId,
                        versionId: newVersion.id,
                        userId: user.user_id,
                        employeeId: user.employee_id,
                        employeeName: user.full_name
                    },
                    type: QueryTypes.INSERT,
                    transaction
                });

                notificationResults.push(user);
            }

            // Enviar notificación central (usar sistema existente)
            await this.sendPublicationNotifications(
                companyId,
                procedure,
                newVersion,
                targetUsers,
                userId
            );

            await transaction.commit();

            console.log(`[PROCEDURES] Publicado ${procedure.code} v${procedure.version_label} a ${targetUsers.length} usuarios`);

            // ✅ INTEGRACIÓN: Si el procedimiento requiere capacitación, auto-asignar
            let trainingResult = null;
            try {
                if (procedure.requires_training) {
                    console.log(`🔗 [PROCEDURES→TRAINING] Procedimiento requiere capacitación, procesando...`);

                    const ProceduresTrainingIntegration = require('./integrations/procedures-training-integration');
                    trainingResult = await ProceduresTrainingIntegration.onProcedurePublished({
                        id: procedureId,
                        name: procedure.title,
                        code: procedure.code,
                        company_id: companyId,
                        version: procedure.version_label,
                        criticality: procedure.is_critical ? 'critical' : 'normal',
                        requires_training: true,
                        linked_training_id: procedure.linked_training_id || null,
                        applies_to_all: procedure.scope_type === 'company',
                        department_ids: procedure.scope_entities || [],
                        mandatory_completion_date: procedure.effective_date
                    }, userId);

                    console.log(`✅ [PROCEDURES→TRAINING] ${trainingResult.trainingsAssigned || 0} capacitaciones asignadas`);
                }
            } catch (integrationError) {
                console.warn(`⚠️ [PROCEDURES→TRAINING] Error en integración (no bloquea):`, integrationError.message);
            }

            return {
                success: true,
                message: `Procedimiento publicado a ${targetUsers.length} usuarios`,
                version: newVersion,
                notified_users: targetUsers.length,
                notificationsCreated: targetUsers.length,
                trainingAssignments: trainingResult ? trainingResult.trainingsAssigned : 0
            };

        } catch (error) {
            await transaction.rollback();
            console.error('[PROCEDURES] Error publicando:', error);
            throw error;
        }
    }

    /**
     * Crear nueva versión de procedimiento publicado
     */
    static async createNewVersion(procedureId, companyId, userId) {
        try {
            // Obtener procedimiento actual
            const [procedures] = await sequelize.query(`
                SELECT * FROM procedures
                WHERE id = :procedureId AND company_id = :companyId
            `, {
                replacements: { procedureId, companyId },
                type: QueryTypes.SELECT
            });

            if (!procedures || procedures.length === 0) {
                return { success: false, error: 'Procedimiento no encontrado' };
            }

            const procedure = procedures[0];

            if (procedure.status !== 'published') {
                return { success: false, error: 'Solo se pueden versionar procedimientos publicados' };
            }

            // Incrementar versión
            const newVersionNumber = procedure.current_version + 1;
            const versionParts = procedure.version_label.split('.');
            const newVersionLabel = `${parseInt(versionParts[0]) + 1}.0`;

            // Actualizar procedimiento a borrador con nueva versión
            await sequelize.query(`
                UPDATE procedures SET
                    current_version = :newVersion,
                    version_label = :newVersionLabel,
                    status = 'draft',
                    updated_at = NOW()
                WHERE id = :procedureId
            `, {
                replacements: {
                    procedureId,
                    newVersion: newVersionNumber,
                    newVersionLabel
                },
                type: QueryTypes.UPDATE
            });

            return {
                success: true,
                message: `Nueva versión ${newVersionLabel} creada en borrador`,
                new_version: newVersionLabel
            };

        } catch (error) {
            console.error('[PROCEDURES] Error creando versión:', error);
            throw error;
        }
    }

    // =========================================================================
    // ACUSES DE RECIBO
    // =========================================================================

    /**
     * Registrar acuse de recibo
     */
    static async acknowledge(procedureId, userId, ip, method = 'web') {
        try {
            // Verificar que existe acuse pendiente
            const [pending] = await sequelize.query(`
                SELECT pa.*, p.title, p.code
                FROM procedure_acknowledgements pa
                JOIN procedures p ON pa.procedure_id = p.id
                WHERE pa.procedure_id = :procedureId
                  AND pa.user_id = :userId
                  AND pa.status = 'pending'
                ORDER BY pa.created_at DESC
                LIMIT 1
            `, {
                replacements: { procedureId, userId },
                type: QueryTypes.SELECT
            });

            if (!pending || pending.length === 0) {
                return { success: false, error: 'No hay acuse pendiente para este procedimiento' };
            }

            const ack = pending[0];

            // Registrar acuse
            await sequelize.query(`
                UPDATE procedure_acknowledgements SET
                    status = 'acknowledged',
                    acknowledged_at = NOW(),
                    acknowledgement_ip = :ip,
                    acknowledgement_method = :method,
                    updated_at = NOW()
                WHERE id = :ackId
            `, {
                replacements: {
                    ackId: ack.id,
                    ip: ip || null,
                    method
                },
                type: QueryTypes.UPDATE
            });

            console.log(`[PROCEDURES] Acuse recibido: ${ack.code} por usuario ${userId}`);

            return {
                success: true,
                message: `Acuse de recibo registrado para "${ack.title}"`,
                procedure_code: ack.code,
                procedure_title: ack.title
            };

        } catch (error) {
            console.error('[PROCEDURES] Error registrando acuse:', error);
            throw error;
        }
    }

    /**
     * Obtener acuses pendientes de un usuario
     */
    static async getPendingAcknowledgements(userId, companyId) {
        try {
            const [pending] = await sequelize.query(`
                SELECT
                    pa.*,
                    p.code, p.title, p.type, p.is_critical,
                    p.version_label, p.effective_date,
                    pv.changes_summary
                FROM procedure_acknowledgements pa
                JOIN procedures p ON pa.procedure_id = p.id
                LEFT JOIN procedure_versions pv ON pa.procedure_version_id = pv.id
                WHERE pa.user_id = :userId
                  AND p.company_id = :companyId
                  AND pa.status = 'pending'
                ORDER BY p.is_critical DESC, pa.notification_sent_at ASC
            `, {
                replacements: { userId, companyId },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                pending: pending || [],
                count: pending?.length || 0
            };

        } catch (error) {
            console.error('[PROCEDURES] Error obteniendo pendientes:', error);
            throw error;
        }
    }

    // =========================================================================
    // MI ESPACIO - Instructivos del empleado
    // =========================================================================

    /**
     * Obtener instructivos del empleado actual
     */
    static async getEmployeeProcedures(userId, companyId) {
        try {
            const [procedures] = await sequelize.query(`
                SELECT
                    p.id, p.code, p.title, p.type, p.version_label,
                    p.effective_date, p.is_critical, p.requires_training,
                    p.objective, p.scope,
                    pr.scope_type,
                    pa.status as acknowledgement_status,
                    pa.acknowledged_at,
                    pa.notification_sent_at
                FROM users u
                INNER JOIN organizational_positions op ON u.organizational_position_id = op.id
                INNER JOIN procedure_roles pr ON pr.organizational_position_id = op.id
                INNER JOIN procedures p ON p.id = pr.procedure_id
                LEFT JOIN procedure_acknowledgements pa ON pa.procedure_id = p.id
                    AND pa.user_id = u.user_id
                    AND pa.procedure_version_id = (
                        SELECT id FROM procedure_versions
                        WHERE procedure_id = p.id AND status = 'current'
                        LIMIT 1
                    )
                WHERE u.user_id = :userId
                  AND p.company_id = :companyId
                  AND p.status = 'published'
                ORDER BY p.is_critical DESC, p.code ASC
            `, {
                replacements: { userId, companyId },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                procedures: procedures || [],
                count: procedures?.length || 0
            };

        } catch (error) {
            console.error('[PROCEDURES] Error obteniendo procedimientos empleado:', error);
            throw error;
        }
    }

    // =========================================================================
    // EXPEDIENTE 360 / FICHA PERSONAL
    // =========================================================================

    /**
     * Obtener resumen de instructivos para ficha de personal
     */
    static async getEmployeeProceduresSummary(employeeUserId, companyId) {
        try {
            const [summary] = await sequelize.query(`
                SELECT
                    p.id, p.code, p.title, p.type, p.version_label,
                    p.effective_date, p.is_critical,
                    pr.scope_type,
                    pa.status as acknowledgement_status,
                    pa.acknowledged_at,
                    CASE
                        WHEN pa.status = 'acknowledged' THEN 'Notificado'
                        WHEN pa.status = 'pending' THEN 'Pendiente de acuse'
                        ELSE 'Sin notificar'
                    END as notification_status
                FROM users u
                INNER JOIN organizational_positions op ON u.organizational_position_id = op.id
                INNER JOIN procedure_roles pr ON pr.organizational_position_id = op.id
                INNER JOIN procedures p ON p.id = pr.procedure_id
                LEFT JOIN procedure_acknowledgements pa ON pa.procedure_id = p.id
                    AND pa.user_id = u.user_id
                WHERE u.user_id = :employeeUserId
                  AND p.company_id = :companyId
                  AND p.status = 'published'
                ORDER BY p.type, p.code
            `, {
                replacements: { employeeUserId, companyId },
                type: QueryTypes.SELECT
            });

            // Agrupar por tipo
            const grouped = {
                procedimientos: [],
                instructivos: [],
                manuales: [],
                politicas: []
            };

            for (const proc of summary || []) {
                const key = proc.type === 'procedimiento' ? 'procedimientos' :
                           proc.type === 'instructivo' ? 'instructivos' :
                           proc.type === 'manual' ? 'manuales' : 'politicas';
                grouped[key].push(proc);
            }

            return {
                success: true,
                summary: grouped,
                total: summary?.length || 0,
                acknowledged: summary?.filter(p => p.acknowledgement_status === 'acknowledged').length || 0,
                pending: summary?.filter(p => p.acknowledgement_status === 'pending').length || 0
            };

        } catch (error) {
            console.error('[PROCEDURES] Error obteniendo resumen:', error);
            throw error;
        }
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Generar código único
     */
    static async generateCode(companyId, type) {
        const prefix = {
            'procedimiento': 'PRO',
            'instructivo': 'INS',
            'manual': 'MAN',
            'politica': 'POL'
        }[type] || 'DOC';

        const [result] = await sequelize.query(`
            SELECT COUNT(*) + 1 as next
            FROM procedures
            WHERE company_id = :companyId AND type = :type
        `, {
            replacements: { companyId, type },
            type: QueryTypes.SELECT
        });

        const next = String(result?.next || 1).padStart(3, '0');
        return `${prefix}-${next}`;
    }

    /**
     * Enviar notificaciones de publicación
     */
    static async sendPublicationNotifications(companyId, procedure, version, users, publisherId) {
        try {
            // Usar sistema de notificaciones unificado
            const NotificationService = require('./NotificationUnifiedService');

            for (const user of users) {
                await NotificationService.create({
                    company_id: companyId,
                    type: 'procedure_publication',
                    priority: procedure.is_critical ? 'high' : 'normal',
                    title: `Nuevo ${procedure.type}: ${procedure.code}`,
                    message: `Se ha publicado "${procedure.title}". Por favor, lea el documento y confirme su recepción.`,
                    target_user_id: user.user_id,
                    sender_user_id: publisherId,
                    requires_action: true,
                    action_type: 'acknowledge',
                    action_data: {
                        procedure_id: procedure.id,
                        procedure_code: procedure.code,
                        version_id: version.id,
                        version_label: procedure.version_label
                    },
                    category: 'procedures',
                    module: 'procedures-manual'
                });
            }

            console.log(`[PROCEDURES] ${users.length} notificaciones enviadas para ${procedure.code}`);

        } catch (error) {
            console.error('[PROCEDURES] Error enviando notificaciones:', error);
            // No lanzar error, la publicación ya se completó
        }
    }

    // =========================================================================
    // SISTEMA DE ALCANCE PARAMETRIZABLE (SCOPE)
    // =========================================================================

    /**
     * Obtener entidades disponibles para un tipo de scope
     * Para llenar los selects del frontend
     */
    static async getScopeEntities(companyId, scopeType) {
        try {
            let query = '';
            switch (scopeType) {
                case 'branch':
                    query = `
                        SELECT id, name, address, is_main
                        FROM branches
                        WHERE company_id = :companyId AND is_active = true
                        ORDER BY is_main DESC, name
                    `;
                    break;
                case 'department':
                    query = `
                        SELECT id, name, description
                        FROM departments
                        WHERE company_id = :companyId AND is_active = true
                        ORDER BY name
                    `;
                    break;
                case 'sector':
                    query = `
                        SELECT s.id, s.name, d.name as department_name
                        FROM sectors s
                        LEFT JOIN departments d ON s.department_id = d.id
                        WHERE s.company_id = :companyId AND s.is_active = true
                        ORDER BY d.name, s.name
                    `;
                    break;
                case 'role':
                    query = `
                        SELECT DISTINCT role as id,
                               CASE role
                                   WHEN 'admin' THEN 'Administrador'
                                   WHEN 'super_admin' THEN 'Super Administrador'
                                   WHEN 'rrhh' THEN 'Recursos Humanos'
                                   WHEN 'gerente' THEN 'Gerente'
                                   WHEN 'supervisor' THEN 'Supervisor'
                                   WHEN 'employee' THEN 'Empleado'
                                   ELSE role
                               END as name
                        FROM users
                        WHERE company_id = :companyId AND is_active = true
                        ORDER BY role
                    `;
                    break;
                case 'position':
                    query = `
                        SELECT op.id, op.position_name as name, op.work_category, d.name as department_name
                        FROM organizational_positions op
                        LEFT JOIN departments d ON op.department_id = d.id
                        WHERE op.company_id = :companyId AND op.is_active = true
                        ORDER BY d.name, op.position_name
                    `;
                    break;
                case 'users':
                    query = `
                        SELECT u.user_id as id,
                               u."firstName" || ' ' || u."lastName" as name,
                               u."employeeId" as employee_id,
                               d.name as department_name,
                               op.position_name
                        FROM users u
                        LEFT JOIN departments d ON u.department_id = d.id
                        LEFT JOIN organizational_positions op ON u.organizational_position_id = op.id
                        WHERE u.company_id = :companyId AND u.is_active = true
                        ORDER BY u."lastName", u."firstName"
                    `;
                    break;
                default:
                    return { success: true, entities: [], count: 0 };
            }

            const entities = await sequelize.query(query, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                scopeType,
                entities: entities || [],
                count: entities?.length || 0
            };

        } catch (error) {
            console.error('[PROCEDURES] Error obteniendo entidades de scope:', error);
            throw error;
        }
    }

    /**
     * Previsualizar cantidad de usuarios alcanzados por un scope
     */
    static async previewScopeUsers(companyId, scopeType, scopeEntities) {
        try {
            const [result] = await sequelize.query(`
                SELECT count_procedure_scope_users(:companyId, :scopeType::procedure_scope_type, :scopeEntities::jsonb) as count
            `, {
                replacements: {
                    companyId,
                    scopeType: scopeType || 'company',
                    scopeEntities: JSON.stringify(scopeEntities || [])
                },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                count: parseInt(result?.count || 0),
                scopeType,
                entities: scopeEntities
            };

        } catch (error) {
            console.error('[PROCEDURES] Error previsualizando scope:', error);
            throw error;
        }
    }

    /**
     * Obtener usuarios alcanzados por el scope de un procedimiento
     * Usa SSOT (estructura organizacional)
     */
    static async getScopeUsers(procedureId, companyId) {
        try {
            const users = await sequelize.query(`
                SELECT * FROM get_procedure_scope_users(:procedureId, :companyId)
            `, {
                replacements: { procedureId, companyId },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                users: users || [],
                count: users?.length || 0
            };

        } catch (error) {
            console.error('[PROCEDURES] Error obteniendo usuarios de scope:', error);
            throw error;
        }
    }

    // =========================================================================
    // CONTROL DE BORRADORES CONCURRENTES
    // =========================================================================

    /**
     * Intentar bloquear un borrador para edición
     * Solo un usuario puede tener el borrador activo a la vez
     */
    static async tryLockDraft(procedureId, userId, ttlDays = 7) {
        try {
            const result = await sequelize.query(`
                SELECT * FROM try_lock_procedure_draft(:procedureId, :userId, :ttlDays)
            `, {
                replacements: { procedureId, userId, ttlDays },
                type: QueryTypes.SELECT
            });

            const lockResult = result[0];

            if (lockResult?.success) {
                console.log(`[PROCEDURES] Borrador ${procedureId} bloqueado por usuario ${userId}`);
            } else {
                console.log(`[PROCEDURES] No se pudo bloquear borrador ${procedureId}: ${lockResult?.message}`);
            }

            return {
                success: lockResult?.success || false,
                message: lockResult?.message || 'Error desconocido',
                locked_by: lockResult?.locked_by,
                locked_by_name: lockResult?.locked_by_name,
                locked_at: lockResult?.locked_at,
                expires_at: lockResult?.expires_at
            };

        } catch (error) {
            console.error('[PROCEDURES] Error bloqueando borrador:', error);
            throw error;
        }
    }

    /**
     * Liberar bloqueo de un borrador
     */
    static async unlockDraft(procedureId, userId, reason = 'manual') {
        try {
            const [result] = await sequelize.query(`
                SELECT unlock_procedure_draft(:procedureId, :userId, :reason) as success
            `, {
                replacements: { procedureId, userId, reason },
                type: QueryTypes.SELECT
            });

            if (result?.success) {
                console.log(`[PROCEDURES] Borrador ${procedureId} desbloqueado (${reason})`);
            }

            return {
                success: result?.success || false,
                message: result?.success ? 'Bloqueo liberado' : 'No se pudo liberar el bloqueo'
            };

        } catch (error) {
            console.error('[PROCEDURES] Error liberando bloqueo:', error);
            throw error;
        }
    }

    /**
     * Verificar estado de bloqueo de un borrador
     */
    static async getDraftLockStatus(procedureId) {
        try {
            const [result] = await sequelize.query(`
                SELECT
                    p.draft_locked_by,
                    p.draft_locked_at,
                    p.draft_expires_at,
                    p.status,
                    u."firstName" || ' ' || u."lastName" as locked_by_name,
                    u."employeeId" as locked_by_employee_id,
                    CASE
                        WHEN p.draft_expires_at IS NOT NULL AND p.draft_expires_at < NOW() THEN true
                        ELSE false
                    END as is_expired,
                    EXTRACT(EPOCH FROM (p.draft_expires_at - NOW())) / 3600 as hours_remaining
                FROM procedures p
                LEFT JOIN users u ON p.draft_locked_by = u.user_id
                WHERE p.id = :procedureId
            `, {
                replacements: { procedureId },
                type: QueryTypes.SELECT
            });

            if (!result) {
                return { success: false, error: 'Procedimiento no encontrado' };
            }

            return {
                success: true,
                is_locked: !!result.draft_locked_by,
                is_expired: result.is_expired,
                status: result.status,
                locked_by: result.draft_locked_by,
                locked_by_name: result.locked_by_name,
                locked_by_employee_id: result.locked_by_employee_id,
                locked_at: result.draft_locked_at,
                expires_at: result.draft_expires_at,
                hours_remaining: result.hours_remaining ? Math.max(0, Math.round(result.hours_remaining)) : null
            };

        } catch (error) {
            console.error('[PROCEDURES] Error verificando estado de bloqueo:', error);
            throw error;
        }
    }

    /**
     * Limpiar borradores expirados (llamado desde scheduler)
     */
    static async cleanupExpiredDrafts() {
        try {
            const result = await sequelize.query(`
                SELECT * FROM cleanup_expired_drafts()
            `, {
                type: QueryTypes.SELECT
            });

            const cleanupResult = result[0];

            if (cleanupResult?.deleted_count > 0) {
                console.log(`[PROCEDURES] Limpieza automática: ${cleanupResult.deleted_count} borradores expirados eliminados`);
                // TODO: Notificar a los usuarios afectados
            }

            return {
                success: true,
                deleted_count: cleanupResult?.deleted_count || 0,
                deleted_procedures: cleanupResult?.deleted_procedures || []
            };

        } catch (error) {
            console.error('[PROCEDURES] Error limpiando borradores expirados:', error);
            throw error;
        }
    }

    /**
     * Obtener historial de bloqueos de un procedimiento
     */
    static async getDraftLockHistory(procedureId) {
        try {
            const history = await sequelize.query(`
                SELECT
                    pdl.*,
                    u."firstName" || ' ' || u."lastName" as locked_by_name,
                    u."employeeId" as locked_by_employee_id
                FROM procedure_draft_locks pdl
                LEFT JOIN users u ON pdl.locked_by = u.user_id
                WHERE pdl.procedure_id = :procedureId
                ORDER BY pdl.locked_at DESC
            `, {
                replacements: { procedureId },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                history: history || [],
                count: history?.length || 0
            };

        } catch (error) {
            console.error('[PROCEDURES] Error obteniendo historial de bloqueos:', error);
            throw error;
        }
    }

    // =========================================================================
    // JERARQUÍA DOCUMENTAL ESTRICTA
    // =========================================================================

    /**
     * Obtener árbol completo de documentos para una empresa
     * Estructura jerárquica: Política > Manual > Procedimiento > Instructivo
     */
    static async getDocumentTree(companyId, rootId = null) {
        try {
            const tree = await sequelize.query(`
                SELECT * FROM get_procedure_tree(:companyId, :rootId)
            `, {
                replacements: { companyId, rootId },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                tree: tree || [],
                count: tree?.length || 0
            };

        } catch (error) {
            console.error('[PROCEDURES] Error obteniendo árbol de documentos:', error);
            throw error;
        }
    }

    /**
     * Obtener documentos padre disponibles para un tipo de documento
     * Útil para llenar el selector de padre en el formulario
     */
    static async getAvailableParents(companyId, documentType, excludeId = null) {
        try {
            // Si es política, no hay padres disponibles
            if (documentType === 'politica') {
                return {
                    success: true,
                    parents: [],
                    count: 0,
                    message: 'Las políticas son documentos raíz y no tienen padre.'
                };
            }

            const parents = await sequelize.query(`
                SELECT * FROM get_available_parents(:companyId, :documentType, :excludeId)
            `, {
                replacements: { companyId, documentType, excludeId },
                type: QueryTypes.SELECT
            });

            // Determinar el tipo de padre esperado
            const parentTypeMap = {
                'manual': 'política',
                'procedimiento': 'manual',
                'instructivo': 'procedimiento'
            };

            return {
                success: true,
                parents: parents || [],
                count: parents?.length || 0,
                expected_parent_type: parentTypeMap[documentType] || null,
                message: parents?.length > 0
                    ? `Seleccione una ${parentTypeMap[documentType]} como padre`
                    : `No hay ${parentTypeMap[documentType]}s disponibles. Cree una primero.`
            };

        } catch (error) {
            console.error('[PROCEDURES] Error obteniendo padres disponibles:', error);
            throw error;
        }
    }

    /**
     * Obtener hijos de un documento
     * @param {boolean} recursive - Si true, obtiene todos los descendientes
     */
    static async getChildren(procedureId, recursive = false) {
        try {
            const children = await sequelize.query(`
                SELECT * FROM get_procedure_children(:procedureId, :recursive)
            `, {
                replacements: { procedureId, recursive },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                children: children || [],
                count: children?.length || 0,
                is_recursive: recursive
            };

        } catch (error) {
            console.error('[PROCEDURES] Error obteniendo hijos:', error);
            throw error;
        }
    }

    /**
     * Obtener ancestros de un documento (ruta hacia la raíz)
     */
    static async getAncestors(procedureId) {
        try {
            const ancestors = await sequelize.query(`
                SELECT * FROM get_procedure_ancestors(:procedureId)
            `, {
                replacements: { procedureId },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                ancestors: ancestors || [],
                count: ancestors?.length || 0,
                // Construir breadcrumb
                breadcrumb: (ancestors || []).map(a => ({
                    id: a.id,
                    code: a.code,
                    title: a.title,
                    type: a.type
                }))
            };

        } catch (error) {
            console.error('[PROCEDURES] Error obteniendo ancestros:', error);
            throw error;
        }
    }

    /**
     * Verificar si se puede eliminar un documento
     * (no se puede si tiene hijos)
     */
    static async canDelete(procedureId) {
        try {
            const [result] = await sequelize.query(`
                SELECT * FROM can_delete_procedure(:procedureId)
            `, {
                replacements: { procedureId },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                can_delete: result?.can_delete || false,
                reason: result?.reason || 'Estado desconocido',
                children_count: parseInt(result?.children_count || 0),
                children_preview: result?.children_preview || []
            };

        } catch (error) {
            console.error('[PROCEDURES] Error verificando eliminación:', error);
            throw error;
        }
    }

    /**
     * Mover documento a un nuevo padre
     * Valida que el nuevo padre sea del nivel correcto
     */
    static async moveToParent(procedureId, newParentId, userId) {
        try {
            const [result] = await sequelize.query(`
                SELECT * FROM move_procedure_to_parent(:procedureId, :newParentId, :userId)
            `, {
                replacements: { procedureId, newParentId, userId },
                type: QueryTypes.SELECT
            });

            if (result?.success) {
                console.log(`[PROCEDURES] Documento ${procedureId} movido a ${newParentId}`);
            }

            return {
                success: result?.success || false,
                message: result?.message || 'Error moviendo documento',
                old_path: result?.old_path,
                new_path: result?.new_path
            };

        } catch (error) {
            console.error('[PROCEDURES] Error moviendo documento:', error);
            throw error;
        }
    }

    /**
     * Obtener vista de jerarquía con estadísticas
     */
    static async getHierarchyView(companyId) {
        try {
            const hierarchy = await sequelize.query(`
                SELECT *
                FROM v_procedure_hierarchy
                WHERE company_id = :companyId
                ORDER BY hierarchy_level, code
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            // Contar por tipo
            const stats = {
                total: hierarchy?.length || 0,
                politicas: hierarchy?.filter(h => h.hierarchy_level === 1).length || 0,
                manuales: hierarchy?.filter(h => h.hierarchy_level === 2).length || 0,
                procedimientos: hierarchy?.filter(h => h.hierarchy_level === 3).length || 0,
                instructivos: hierarchy?.filter(h => h.hierarchy_level === 4).length || 0
            };

            return {
                success: true,
                hierarchy: hierarchy || [],
                stats
            };

        } catch (error) {
            console.error('[PROCEDURES] Error obteniendo vista de jerarquía:', error);
            throw error;
        }
    }

    /**
     * Validar jerarquía antes de crear/actualizar
     * Helper para validación en el frontend
     */
    static validateHierarchy(documentType, parentId) {
        const levelMap = {
            'politica': 1,
            'manual': 2,
            'procedimiento': 3,
            'instructivo': 4
        };

        const level = levelMap[documentType] || 4;
        const errors = [];

        // Regla 1: Solo políticas pueden no tener padre
        if (level > 1 && !parentId) {
            errors.push({
                field: 'parent_id',
                message: `Los documentos de tipo "${documentType}" DEBEN tener un documento padre.`,
                hint: `Seleccione un documento de nivel ${level - 1} como padre.`
            });
        }

        // Regla 2: Las políticas NO pueden tener padre
        if (level === 1 && parentId) {
            errors.push({
                field: 'parent_id',
                message: 'Las políticas son el nivel raíz y NO pueden tener documento padre.',
                hint: 'Elimine la selección de documento padre.'
            });
        }

        return {
            valid: errors.length === 0,
            errors,
            level,
            type: documentType,
            requires_parent: level > 1,
            expected_parent_level: level > 1 ? level - 1 : null,
            expected_parent_type: level > 1 ? Object.keys(levelMap).find(k => levelMap[k] === level - 1) : null
        };
    }

    /**
     * Obtener constantes de jerarquía para el frontend
     */
    static getHierarchyConstants() {
        return {
            levels: {
                politica: { level: 1, icon: '📜', name: 'Política', parent: null },
                manual: { level: 2, icon: '📕', name: 'Manual', parent: 'politica' },
                procedimiento: { level: 3, icon: '📋', name: 'Procedimiento', parent: 'manual' },
                instructivo: { level: 4, icon: '📝', name: 'Instructivo', parent: 'procedimiento' }
            },
            rules: [
                'Solo las POLÍTICAS pueden existir sin documento padre',
                'Los MANUALES deben pertenecer a una POLÍTICA',
                'Los PROCEDIMIENTOS deben pertenecer a un MANUAL',
                'Los INSTRUCTIVOS deben pertenecer a un PROCEDIMIENTO',
                'No se puede eliminar un documento que tenga hijos',
                'El scope puede heredarse del documento padre'
            ]
        };
    }
}

module.exports = ProceduresService;
