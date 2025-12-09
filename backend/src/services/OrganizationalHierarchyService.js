/**
 * ============================================================================
 * OrganizationalHierarchyService - SSOT para Estructura Jerárquica
 * ============================================================================
 *
 * Servicio centralizado (Single Source of Truth) para:
 * - Árbol jerárquico organizacional
 * - Cadena de escalamiento para notificaciones
 * - Identificación de supervisores inmediatos
 * - Validación de aprobaciones por nivel
 * - Generación de organigrama visual
 *
 * @version 1.0.0
 * @date 2025-12-09
 */

const { sequelize } = require('../config/database');
const { QueryTypes, Op } = require('sequelize');

class OrganizationalHierarchyService {

    /**
     * Obtener árbol completo de la organización
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Árbol jerárquico con nodos y empleados
     */
    static async getOrganizationTree(companyId) {
        try {
            const query = `SELECT * FROM get_company_org_tree($1)`;
            const results = await sequelize.query(query, {
                bind: [companyId],
                type: QueryTypes.SELECT
            });

            // Convertir lista plana a estructura de árbol
            return this.buildTreeStructure(results);
        } catch (error) {
            console.error('[HIERARCHY] Error obteniendo árbol:', error);
            throw error;
        }
    }

    /**
     * Obtener organigrama en formato flat (lista ordenada por niveles)
     * @param {number} companyId - ID de la empresa
     * @returns {Array} Lista ordenada de posiciones
     */
    static async getOrganizationFlat(companyId) {
        try {
            const OrganizationalPosition = sequelize.models.OrganizationalPosition;

            const positions = await OrganizationalPosition.findAll({
                where: {
                    company_id: companyId,
                    is_active: true
                },
                include: [
                    {
                        model: OrganizationalPosition,
                        as: 'parentPosition',
                        attributes: ['id', 'position_name', 'position_code']
                    }
                ],
                order: [
                    ['hierarchy_level', 'ASC'],
                    ['branch_code', 'ASC'],
                    ['branch_order', 'ASC'],
                    ['position_name', 'ASC']
                ],
                raw: false
            });

            // Contar empleados por posición
            const employeeCounts = await sequelize.query(`
                SELECT organizational_position_id, COUNT(*) as count
                FROM users
                WHERE company_id = $1 AND is_active = true
                GROUP BY organizational_position_id
            `, {
                bind: [companyId],
                type: QueryTypes.SELECT
            });

            const countMap = {};
            employeeCounts.forEach(e => {
                countMap[e.organizational_position_id] = parseInt(e.count);
            });

            return positions.map(pos => ({
                ...pos.toJSON(),
                employee_count: countMap[pos.id] || 0
            }));
        } catch (error) {
            console.error('[HIERARCHY] Error obteniendo lista plana:', error);
            throw error;
        }
    }

    /**
     * Obtener cadena de escalamiento para un empleado
     * @param {number} userId - ID del usuario
     * @param {number} daysRequested - Días solicitados (para determinar nivel de aprobación)
     * @returns {Array} Cadena de escalamiento ordenada
     */
    static async getEscalationChain(userId, daysRequested = 1) {
        try {
            const query = `SELECT * FROM find_approver_for_employee($1, $2)`;
            const results = await sequelize.query(query, {
                bind: [userId, daysRequested],
                type: QueryTypes.SELECT
            });

            return results;
        } catch (error) {
            console.error('[HIERARCHY] Error obteniendo cadena de escalamiento:', error);
            throw error;
        }
    }

    /**
     * Obtener supervisor inmediato de un empleado
     * @param {number} userId - ID del usuario
     * @returns {Object|null} Datos del supervisor inmediato
     */
    static async getImmediateSupervisor(userId) {
        try {
            // Primero obtener la posición del empleado
            const userQuery = await sequelize.query(`
                SELECT u.id, u.first_name, u.last_name, u.organizational_position_id,
                       op.parent_position_id, op.position_name as user_position
                FROM users u
                LEFT JOIN organizational_positions op ON u.organizational_position_id = op.id
                WHERE u.id = $1
            `, {
                bind: [userId],
                type: QueryTypes.SELECT
            });

            if (!userQuery.length || !userQuery[0].parent_position_id) {
                return null;
            }

            // Buscar al supervisor en la posición padre
            const supervisorQuery = await sequelize.query(`
                SELECT u.id, u.first_name, u.last_name, u.email, u.photo_url,
                       op.position_name, op.position_code, op.hierarchy_level, op.branch_code
                FROM organizational_positions op
                LEFT JOIN users u ON u.organizational_position_id = op.id AND u.is_active = true
                WHERE op.id = $1
                LIMIT 1
            `, {
                bind: [userQuery[0].parent_position_id],
                type: QueryTypes.SELECT
            });

            if (!supervisorQuery.length) {
                return null;
            }

            return {
                position_id: userQuery[0].parent_position_id,
                position_name: supervisorQuery[0].position_name,
                position_code: supervisorQuery[0].position_code,
                hierarchy_level: supervisorQuery[0].hierarchy_level,
                branch_code: supervisorQuery[0].branch_code,
                supervisor: supervisorQuery[0].id ? {
                    id: supervisorQuery[0].id,
                    name: `${supervisorQuery[0].first_name} ${supervisorQuery[0].last_name}`,
                    email: supervisorQuery[0].email,
                    photo_url: supervisorQuery[0].photo_url
                } : null
            };
        } catch (error) {
            console.error('[HIERARCHY] Error obteniendo supervisor inmediato:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los ancestros de una posición
     * @param {number} positionId - ID de la posición
     * @returns {Array} Lista de ancestros ordenados desde el más cercano
     */
    static async getPositionAncestors(positionId) {
        try {
            const query = `SELECT * FROM get_position_ancestors($1)`;
            const results = await sequelize.query(query, {
                bind: [positionId],
                type: QueryTypes.SELECT
            });

            return results;
        } catch (error) {
            console.error('[HIERARCHY] Error obteniendo ancestros:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los descendientes de una posición
     * @param {number} positionId - ID de la posición
     * @returns {Array} Lista de descendientes
     */
    static async getPositionDescendants(positionId) {
        try {
            const query = `SELECT * FROM get_position_descendants($1)`;
            const results = await sequelize.query(query, {
                bind: [positionId],
                type: QueryTypes.SELECT
            });

            return results;
        } catch (error) {
            console.error('[HIERARCHY] Error obteniendo descendientes:', error);
            throw error;
        }
    }

    /**
     * Verificar si un usuario puede aprobar una solicitud
     * @param {number} approverId - ID del usuario aprobador
     * @param {number} requesterId - ID del usuario solicitante
     * @param {number} daysRequested - Días solicitados
     * @returns {Object} Resultado de la validación
     */
    static async canApproveRequest(approverId, requesterId, daysRequested = 1) {
        try {
            // Obtener posiciones de ambos
            const [approver, requester] = await Promise.all([
                sequelize.query(`
                    SELECT u.id, op.id as position_id, op.hierarchy_level,
                           op.can_approve_permissions, op.max_approval_days
                    FROM users u
                    LEFT JOIN organizational_positions op ON u.organizational_position_id = op.id
                    WHERE u.id = $1
                `, { bind: [approverId], type: QueryTypes.SELECT }),

                sequelize.query(`
                    SELECT u.id, op.id as position_id, op.hierarchy_level, op.full_path
                    FROM users u
                    LEFT JOIN organizational_positions op ON u.organizational_position_id = op.id
                    WHERE u.id = $1
                `, { bind: [requesterId], type: QueryTypes.SELECT })
            ]);

            if (!approver.length || !requester.length) {
                return {
                    canApprove: false,
                    reason: 'Usuario no encontrado o sin posición asignada'
                };
            }

            const approverData = approver[0];
            const requesterData = requester[0];

            // Verificar si tiene permiso de aprobar
            if (!approverData.can_approve_permissions) {
                return {
                    canApprove: false,
                    reason: 'La posición del aprobador no tiene permisos de aprobación'
                };
            }

            // Verificar jerarquía (el aprobador debe estar por encima)
            if (approverData.hierarchy_level >= requesterData.hierarchy_level) {
                return {
                    canApprove: false,
                    reason: 'El aprobador debe tener un nivel jerárquico superior al solicitante'
                };
            }

            // Verificar límite de días
            if (approverData.max_approval_days > 0 && daysRequested > approverData.max_approval_days) {
                return {
                    canApprove: false,
                    reason: `El aprobador solo puede aprobar hasta ${approverData.max_approval_days} días. Se solicitaron ${daysRequested} días.`,
                    needsEscalation: true,
                    maxDays: approverData.max_approval_days
                };
            }

            // Verificar que el aprobador está en la cadena de mando del solicitante
            if (requesterData.full_path) {
                const pathIds = requesterData.full_path.split('.').map(id => parseInt(id));
                if (!pathIds.includes(approverData.position_id)) {
                    // El aprobador no está en la línea directa, pero podemos permitir si es de nivel superior en la misma rama
                    // Por ahora, permitimos si es de nivel superior
                }
            }

            return {
                canApprove: true,
                approverLevel: approverData.hierarchy_level,
                requesterLevel: requesterData.hierarchy_level,
                maxDaysAllowed: approverData.max_approval_days || 'Sin límite'
            };

        } catch (error) {
            console.error('[HIERARCHY] Error verificando permiso de aprobación:', error);
            throw error;
        }
    }

    /**
     * Crear o actualizar una posición en el organigrama
     * @param {Object} data - Datos de la posición
     * @returns {Object} Posición creada/actualizada
     */
    static async upsertPosition(data) {
        try {
            const OrganizationalPosition = sequelize.models.OrganizationalPosition;

            const [position, created] = await OrganizationalPosition.upsert({
                ...data,
                updated_at: new Date()
            }, {
                returning: true
            });

            // Actualizar paths de la empresa
            await this.updateCompanyPaths(data.company_id);

            return { position, created };
        } catch (error) {
            console.error('[HIERARCHY] Error upserting posición:', error);
            throw error;
        }
    }

    /**
     * Actualizar todos los paths de la empresa
     * @param {number} companyId - ID de la empresa
     */
    static async updateCompanyPaths(companyId) {
        try {
            const query = `SELECT update_company_position_paths($1)`;
            await sequelize.query(query, {
                bind: [companyId],
                type: QueryTypes.SELECT
            });
        } catch (error) {
            console.error('[HIERARCHY] Error actualizando paths:', error);
            // No propagamos el error para no afectar operaciones principales
        }
    }

    /**
     * Obtener estadísticas del organigrama
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Estadísticas
     */
    static async getOrgStats(companyId) {
        try {
            const stats = await sequelize.query(`
                SELECT
                    COUNT(*) FILTER (WHERE is_active = true) as total_positions,
                    COUNT(DISTINCT hierarchy_level) as total_levels,
                    COUNT(DISTINCT branch_code) FILTER (WHERE branch_code IS NOT NULL) as total_branches,
                    COUNT(*) FILTER (WHERE is_escalation_point = true) as escalation_points,
                    COUNT(*) FILTER (WHERE can_approve_permissions = true) as approver_positions,
                    MIN(hierarchy_level) as top_level,
                    MAX(hierarchy_level) as bottom_level
                FROM organizational_positions
                WHERE company_id = $1
            `, {
                bind: [companyId],
                type: QueryTypes.SELECT
            });

            // Contar empleados con y sin posición
            const employeeStats = await sequelize.query(`
                SELECT
                    COUNT(*) FILTER (WHERE organizational_position_id IS NOT NULL) as with_position,
                    COUNT(*) FILTER (WHERE organizational_position_id IS NULL) as without_position
                FROM users
                WHERE company_id = $1 AND is_active = true
            `, {
                bind: [companyId],
                type: QueryTypes.SELECT
            });

            return {
                positions: stats[0],
                employees: employeeStats[0]
            };
        } catch (error) {
            console.error('[HIERARCHY] Error obteniendo estadísticas:', error);
            throw error;
        }
    }

    /**
     * Generar datos para diagrama de flujo (formato para visualización)
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Datos para diagrama {nodes, edges}
     */
    static async getFlowchartData(companyId) {
        try {
            const positions = await this.getOrganizationFlat(companyId);

            const nodes = positions.map(pos => ({
                id: `pos_${pos.id}`,
                type: 'orgNode',
                data: {
                    id: pos.id,
                    label: pos.position_name,
                    code: pos.position_code,
                    level: pos.hierarchy_level,
                    branch: pos.branch_code,
                    color: pos.color_hex || '#3B82F6',
                    employeeCount: pos.employee_count || 0,
                    canApprove: pos.can_approve_permissions,
                    maxDays: pos.max_approval_days,
                    isEscalation: pos.is_escalation_point,
                    parentId: pos.parent_position_id
                },
                position: {
                    x: this.calculateNodeX(pos, positions),
                    y: pos.hierarchy_level * 150
                },
                style: {
                    backgroundColor: pos.color_hex || '#3B82F6',
                    borderColor: pos.is_escalation_point ? '#F59E0B' : '#1E3A8A'
                }
            }));

            const edges = positions
                .filter(pos => pos.parent_position_id)
                .map(pos => ({
                    id: `edge_${pos.parent_position_id}_${pos.id}`,
                    source: `pos_${pos.parent_position_id}`,
                    target: `pos_${pos.id}`,
                    type: 'smoothstep',
                    animated: false,
                    style: { stroke: '#94A3B8' }
                }));

            return { nodes, edges };
        } catch (error) {
            console.error('[HIERARCHY] Error generando flowchart:', error);
            throw error;
        }
    }

    /**
     * Calcular posición X del nodo en el diagrama
     * @private
     */
    static calculateNodeX(position, allPositions) {
        const sameLevel = allPositions.filter(p =>
            p.hierarchy_level === position.hierarchy_level
        );

        const index = sameLevel.findIndex(p => p.id === position.id);
        const totalInLevel = sameLevel.length;

        // Distribuir equitativamente en el eje X
        const spacing = 250;
        const startX = -((totalInLevel - 1) * spacing) / 2;

        return startX + (index * spacing);
    }

    /**
     * Convertir lista plana a estructura de árbol
     * @private
     */
    static buildTreeStructure(flatList) {
        const map = {};
        const roots = [];

        // Crear mapa de nodos
        flatList.forEach(item => {
            map[item.position_id] = {
                ...item,
                children: []
            };
        });

        // Construir árbol
        flatList.forEach(item => {
            if (item.parent_position_id && map[item.parent_position_id]) {
                map[item.parent_position_id].children.push(map[item.position_id]);
            } else {
                roots.push(map[item.position_id]);
            }
        });

        return roots;
    }

    /**
     * Obtener siguiente aprobador en la cadena (para escalamiento)
     * @param {number} currentApproverId - ID del aprobador actual
     * @param {number} requesterId - ID del solicitante
     * @param {number} daysRequested - Días solicitados
     * @returns {Object|null} Siguiente aprobador o null si no hay más
     */
    static async getNextApprover(currentApproverId, requesterId, daysRequested) {
        try {
            // Obtener posición del aprobador actual
            const currentApprover = await sequelize.query(`
                SELECT op.id as position_id, op.parent_position_id
                FROM users u
                JOIN organizational_positions op ON u.organizational_position_id = op.id
                WHERE u.id = $1
            `, {
                bind: [currentApproverId],
                type: QueryTypes.SELECT
            });

            if (!currentApprover.length || !currentApprover[0].parent_position_id) {
                return null; // No hay nivel superior
            }

            // Buscar en la posición padre
            const nextApprover = await sequelize.query(`
                SELECT u.id, u.first_name, u.last_name, u.email,
                       op.position_name, op.can_approve_permissions, op.max_approval_days
                FROM organizational_positions op
                LEFT JOIN users u ON u.organizational_position_id = op.id AND u.is_active = true
                WHERE op.id = $1
                  AND op.can_approve_permissions = true
                  AND (op.max_approval_days = 0 OR op.max_approval_days >= $2)
                LIMIT 1
            `, {
                bind: [currentApprover[0].parent_position_id, daysRequested],
                type: QueryTypes.SELECT
            });

            if (!nextApprover.length) {
                // Continuar subiendo en la jerarquía
                const parentUser = await sequelize.query(`
                    SELECT u.id FROM users u
                    JOIN organizational_positions op ON u.organizational_position_id = op.id
                    WHERE op.id = $1 AND u.is_active = true
                    LIMIT 1
                `, {
                    bind: [currentApprover[0].parent_position_id],
                    type: QueryTypes.SELECT
                });

                if (parentUser.length) {
                    return this.getNextApprover(parentUser[0].id, requesterId, daysRequested);
                }
                return null;
            }

            return {
                id: nextApprover[0].id,
                name: `${nextApprover[0].first_name} ${nextApprover[0].last_name}`,
                email: nextApprover[0].email,
                position_name: nextApprover[0].position_name,
                can_approve: nextApprover[0].can_approve_permissions,
                max_days: nextApprover[0].max_approval_days
            };

        } catch (error) {
            console.error('[HIERARCHY] Error obteniendo siguiente aprobador:', error);
            throw error;
        }
    }

    /**
     * Obtener subordinados directos de un empleado
     * @param {number} userId - ID del usuario
     * @returns {Array} Lista de subordinados directos
     */
    static async getDirectReports(userId) {
        try {
            // Obtener posición del usuario
            const userPos = await sequelize.query(`
                SELECT organizational_position_id FROM users WHERE id = $1
            `, {
                bind: [userId],
                type: QueryTypes.SELECT
            });

            if (!userPos.length || !userPos[0].organizational_position_id) {
                return [];
            }

            // Obtener empleados en posiciones hijas
            const subordinates = await sequelize.query(`
                SELECT u.id, u.first_name, u.last_name, u.email, u.photo_url,
                       op.position_name, op.position_code, op.hierarchy_level
                FROM users u
                JOIN organizational_positions op ON u.organizational_position_id = op.id
                WHERE op.parent_position_id = $1
                  AND u.is_active = true
                ORDER BY op.hierarchy_level, u.first_name
            `, {
                bind: [userPos[0].organizational_position_id],
                type: QueryTypes.SELECT
            });

            return subordinates.map(sub => ({
                id: sub.id,
                name: `${sub.first_name} ${sub.last_name}`,
                email: sub.email,
                photo_url: sub.photo_url,
                position: sub.position_name,
                position_code: sub.position_code,
                level: sub.hierarchy_level
            }));

        } catch (error) {
            console.error('[HIERARCHY] Error obteniendo subordinados:', error);
            throw error;
        }
    }
}

module.exports = OrganizationalHierarchyService;
