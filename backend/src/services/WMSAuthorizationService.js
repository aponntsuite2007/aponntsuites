/**
 * WMS Authorization Service
 * Sistema de autorizaciones multi-nivel para operaciones de almacén
 * Cumplimiento: ISO 22005, SOX, eIDAS, FDA 21 CFR Part 11
 */

const { sequelize } = require('../config/database');
const crypto = require('crypto');

class WMSAuthorizationService {

    /**
     * Crear solicitud de autorización
     */
    async createAuthorizationRequest(data) {
        const {
            companyId,
            operationType,
            referenceType,
            referenceId,
            requestedBy,
            totalAmount,
            totalQuantity,
            justification,
            urgencyLevel = 'normal'
        } = data;

        const result = await sequelize.query(`
            INSERT INTO wms_authorization_requests (
                company_id, operation_type, reference_type, reference_id,
                requested_by, total_amount, total_quantity, justification,
                urgency_level, expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
                CURRENT_TIMESTAMP + INTERVAL '72 hours'
            )
            RETURNING *
        `, {
            bind: [companyId, operationType, referenceType, referenceId,
                   requestedBy, totalAmount, totalQuantity, justification, urgencyLevel],
            type: sequelize.QueryTypes.INSERT
        });

        return {
            success: true,
            request: result[0][0],
            message: 'Solicitud de autorización creada',
            info: {
                title: '📋 Solicitud Registrada',
                description: 'Su solicitud ha sido registrada en el sistema de autorizaciones multi-nivel',
                nextSteps: [
                    'La solicitud será revisada por el nivel de autorización correspondiente',
                    `Tiempo máximo de respuesta: ${urgencyLevel === 'critical' ? '4 horas' : '72 horas'}`,
                    'Recibirá una notificación cuando sea procesada'
                ],
                techInfo: {
                    workflow: 'Aprobación jerárquica según límites de monto/cantidad',
                    auditTrail: 'Cada acción queda registrada con firma digital',
                    compliance: 'ISO 22005 / SOX / FDA 21 CFR Part 11'
                }
            }
        };
    }

    /**
     * Verificar si usuario puede aprobar
     */
    async canUserApprove(userId, companyId, operationType, amount, quantity) {
        const result = await sequelize.query(`
            SELECT * FROM wms_can_user_approve($1, $2, $3, $4, $5)
        `, {
            bind: [userId, companyId, operationType, amount, quantity],
            type: sequelize.QueryTypes.SELECT
        });

        return result[0];
    }

    /**
     * Aprobar solicitud
     */
    async approveRequest(requestId, userId, comments, ipAddress, userAgent) {
        const request = await this.getRequest(requestId);
        if (!request) {
            return { success: false, error: 'Solicitud no encontrada' };
        }

        // Verificar si puede aprobar
        const canApprove = await this.canUserApprove(
            userId,
            request.company_id,
            request.operation_type,
            request.total_amount,
            request.total_quantity
        );

        if (!canApprove.can_approve) {
            return {
                success: false,
                error: canApprove.reason,
                requiresEscalation: canApprove.requires_escalation,
                escalationRole: canApprove.escalation_role,
                info: {
                    title: '⚠️ Sin Autorización',
                    description: 'No tiene permisos suficientes para aprobar esta operación',
                    reason: canApprove.reason,
                    action: canApprove.requires_escalation
                        ? `Será escalado al rol: ${canApprove.escalation_role}`
                        : 'Contacte a su supervisor'
                }
            };
        }

        // Verificar segregación de funciones
        if (request.requested_by === userId) {
            const level = await this.getAuthorizationLevel(
                request.company_id,
                await this.getUserRole(userId),
                request.operation_type
            );

            if (level && !level.can_self_approve) {
                return {
                    success: false,
                    error: 'Segregación de funciones: No puede aprobar sus propias solicitudes',
                    info: {
                        title: '🔒 Segregación de Funciones',
                        description: 'Por políticas de control interno, no puede aprobar operaciones que usted mismo solicitó',
                        compliance: 'SOX / ISO 27001',
                        action: 'La solicitud debe ser aprobada por otro usuario autorizado'
                    }
                };
            }
        }

        // TRANSACCIÓN: Todas las operaciones de aprobación deben ser atómicas
        const transaction = await sequelize.transaction();

        try {
            // Registrar aprobación en historial (inmutable)
            await this.recordAuthorizationAction(requestId, {
                approvalLevel: request.current_level,
                action: 'approved',
                actionBy: userId,
                comments,
                ipAddress,
                userAgent,
                snapshotData: request
            }, transaction);

            // Verificar si necesita más niveles
            if (request.current_level < request.required_levels) {
                await sequelize.query(`
                    UPDATE wms_authorization_requests
                    SET current_level = current_level + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, { bind: [requestId], transaction });

                await transaction.commit();

                return {
                    success: true,
                    status: 'partial',
                    message: `Aprobación nivel ${request.current_level} completada`,
                    info: {
                        title: '✅ Aprobación Parcial',
                        description: `Nivel ${request.current_level} de ${request.required_levels} aprobado`,
                        nextStep: `Pendiente aprobación nivel ${request.current_level + 1}`,
                        auditTrail: 'Su aprobación ha sido registrada con firma digital'
                    }
                };
            }

            // Aprobación final
            await sequelize.query(`
                UPDATE wms_authorization_requests
                SET status = 'approved',
                    final_decision_at = CURRENT_TIMESTAMP,
                    final_decision_by = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, { bind: [requestId, userId], transaction });

            // Crear firma digital para la operación
            await this.createDigitalSignature(
                request.company_id,
                request.reference_type,
                request.reference_id,
                'approved',
                userId,
                request,
                transaction
            );

            await transaction.commit();

            return {
                success: true,
                status: 'approved',
                message: 'Solicitud aprobada completamente',
                info: {
                    title: '✅ Solicitud Aprobada',
                    description: 'La operación ha sido autorizada y puede proceder',
                    signature: 'Firma digital registrada en blockchain interno',
                    compliance: ['ISO 22005', 'SOX', 'FDA 21 CFR Part 11'],
                    auditTrail: {
                        levels: request.required_levels,
                        finalApprover: userId,
                        timestamp: new Date().toISOString()
                    }
                }
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Rechazar solicitud
     */
    async rejectRequest(requestId, userId, reason, ipAddress, userAgent) {
        const request = await this.getRequest(requestId);
        if (!request) {
            return { success: false, error: 'Solicitud no encontrada' };
        }

        await this.recordAuthorizationAction(requestId, {
            approvalLevel: request.current_level,
            action: 'rejected',
            actionBy: userId,
            comments: reason,
            ipAddress,
            userAgent,
            snapshotData: request
        });

        await sequelize.query(`
            UPDATE wms_authorization_requests
            SET status = 'rejected',
                final_decision_at = CURRENT_TIMESTAMP,
                final_decision_by = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, { bind: [requestId, userId] });

        return {
            success: true,
            message: 'Solicitud rechazada',
            info: {
                title: '❌ Solicitud Rechazada',
                description: 'La operación no ha sido autorizada',
                reason: reason,
                action: 'El solicitante será notificado',
                auditTrail: 'El rechazo ha sido registrado en el historial inmutable'
            }
        };
    }

    /**
     * Escalar solicitud
     */
    async escalateRequest(requestId, reason) {
        const request = await this.getRequest(requestId);
        if (!request) {
            return { success: false, error: 'Solicitud no encontrada' };
        }

        await sequelize.query(`
            UPDATE wms_authorization_requests
            SET status = 'escalated',
                urgency_level = CASE
                    WHEN urgency_level = 'normal' THEN 'urgent'
                    WHEN urgency_level = 'urgent' THEN 'critical'
                    ELSE urgency_level
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, { bind: [requestId] });

        return {
            success: true,
            message: 'Solicitud escalada',
            info: {
                title: '⬆️ Solicitud Escalada',
                description: 'La solicitud ha sido elevada al siguiente nivel de autorización',
                reason: reason,
                newUrgency: 'La prioridad ha sido aumentada'
            }
        };
    }

    /**
     * Registrar acción en historial inmutable
     */
    async recordAuthorizationAction(requestId, data, transaction = null) {
        const {
            approvalLevel,
            action,
            actionBy,
            comments,
            ipAddress,
            userAgent,
            snapshotData
        } = data;

        // Obtener rol del usuario
        const userRole = await this.getUserRole(actionBy);

        // Crear hash de firma
        const signatureData = JSON.stringify({
            requestId,
            approvalLevel,
            action,
            actionBy,
            timestamp: new Date().toISOString(),
            snapshot: snapshotData
        });
        const digitalSignature = crypto.createHash('sha512').update(signatureData).digest('hex');

        const queryOptions = {
            bind: [requestId, approvalLevel, action, actionBy, userRole,
                   ipAddress, userAgent, comments, digitalSignature, JSON.stringify(snapshotData)]
        };
        if (transaction) queryOptions.transaction = transaction;

        await sequelize.query(`
            INSERT INTO wms_authorization_history (
                request_id, approval_level, action, action_by,
                role_at_action, ip_address, user_agent, comments,
                digital_signature, snapshot_data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, queryOptions);

        return digitalSignature;
    }

    /**
     * Crear firma digital
     */
    async createDigitalSignature(companyId, entityType, entityId, actionType, signerId, data, transaction = null) {
        const queryOptions = {
            bind: [companyId, entityType, entityId, actionType, signerId, JSON.stringify(data)],
            type: sequelize.QueryTypes.SELECT
        };
        if (transaction) queryOptions.transaction = transaction;

        const result = await sequelize.query(`
            SELECT wms_create_signature($1, $2, $3, $4, $5, $6) as hash
        `, queryOptions);

        return result[0].hash;
    }

    /**
     * Verificar integridad de cadena de firmas
     */
    async verifySignatureChain(entityType, entityId) {
        const result = await sequelize.query(`
            SELECT * FROM wms_verify_signature_chain($1, $2)
        `, {
            bind: [entityType, entityId],
            type: sequelize.QueryTypes.SELECT
        });

        const allValid = result.every(r => r.is_valid);

        return {
            valid: allValid,
            chain: result,
            info: {
                title: allValid ? '✅ Cadena de Firmas Válida' : '⚠️ Inconsistencia Detectada',
                description: allValid
                    ? 'Todas las firmas digitales son auténticas y la cadena no ha sido alterada'
                    : 'Se detectaron inconsistencias en la cadena de firmas',
                techInfo: {
                    algorithm: 'SHA-512',
                    chainType: 'Blockchain interno',
                    totalSignatures: result.length,
                    invalidSignatures: result.filter(r => !r.is_valid).length
                }
            }
        };
    }

    /**
     * Obtener solicitudes pendientes
     */
    async getPendingRequests(companyId, userId) {
        const userRole = await this.getUserRole(userId);

        const result = await sequelize.query(`
            SELECT ar.*,
                   c.name as company_name,
                   u."firstName" || ' ' || u."lastName" as requested_by_name,
                   EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ar.requested_at))/3600 as hours_pending
            FROM wms_authorization_requests ar
            JOIN companies c ON ar.company_id = c.company_id
            JOIN users u ON ar.requested_by = u.user_id
            WHERE ar.company_id = $1
            AND ar.status IN ('pending', 'escalated')
            ORDER BY
                CASE ar.urgency_level
                    WHEN 'critical' THEN 1
                    WHEN 'urgent' THEN 2
                    ELSE 3
                END,
                ar.requested_at ASC
        `, {
            bind: [companyId],
            type: sequelize.QueryTypes.SELECT
        });

        return {
            requests: result,
            summary: {
                total: result.length,
                critical: result.filter(r => r.urgency_level === 'critical').length,
                urgent: result.filter(r => r.urgency_level === 'urgent').length,
                overdue: result.filter(r => r.hours_pending > 24).length
            },
            info: {
                title: '📋 Solicitudes Pendientes',
                description: `Tiene ${result.length} solicitud(es) pendiente(s) de autorización`,
                legend: {
                    critical: '🔴 Crítico - Requiere atención inmediata',
                    urgent: '🟠 Urgente - Responder en menos de 24h',
                    normal: '🟢 Normal - Plazo estándar de 72h'
                },
                actions: {
                    approve: 'Autoriza la operación según sus límites',
                    reject: 'Rechaza con justificación obligatoria',
                    escalate: 'Eleva al siguiente nivel de autorización'
                }
            }
        };
    }

    /**
     * Crear delegación de autorización
     */
    async createDelegation(data) {
        const {
            companyId,
            delegatorId,
            delegateId,
            operationTypes,
            maxAmount,
            validFrom,
            validUntil,
            reason
        } = data;

        const result = await sequelize.query(`
            INSERT INTO wms_authorization_delegations (
                company_id, delegator_id, delegate_id, operation_types,
                max_amount, valid_from, valid_until, reason
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, {
            bind: [companyId, delegatorId, delegateId, operationTypes,
                   maxAmount, validFrom, validUntil, reason],
            type: sequelize.QueryTypes.INSERT
        });

        return {
            success: true,
            delegation: result[0][0],
            info: {
                title: '🔄 Delegación Creada',
                description: 'Se ha delegado autoridad de aprobación exitosamente',
                details: {
                    operaciones: operationTypes.join(', '),
                    montoMaximo: maxAmount ? `$${maxAmount.toLocaleString()}` : 'Sin límite',
                    vigencia: `${validFrom} a ${validUntil}`
                },
                warning: '⚠️ Usted sigue siendo responsable de las operaciones aprobadas por el delegado',
                compliance: 'Esta delegación queda registrada en el audit trail'
            }
        };
    }

    /**
     * Revocar delegación
     */
    async revokeDelegation(delegationId, revokedBy, reason) {
        await sequelize.query(`
            UPDATE wms_authorization_delegations
            SET is_active = FALSE,
                revoked_at = CURRENT_TIMESTAMP,
                revoked_by = $2
            WHERE id = $1
        `, { bind: [delegationId, revokedBy] });

        return {
            success: true,
            message: 'Delegación revocada',
            info: {
                title: '❌ Delegación Revocada',
                description: 'La delegación de autorización ha sido cancelada',
                effectiveFrom: 'Inmediato',
                auditTrail: 'La revocación queda registrada'
            }
        };
    }

    /**
     * Obtener historial de autorizaciones
     */
    async getAuthorizationHistory(requestId) {
        const result = await sequelize.query(`
            SELECT ah.*,
                   u."firstName" || ' ' || u."lastName" as action_by_name
            FROM wms_authorization_history ah
            JOIN users u ON ah.action_by = u.user_id
            WHERE ah.request_id = $1
            ORDER BY ah.action_at ASC
        `, {
            bind: [requestId],
            type: sequelize.QueryTypes.SELECT
        });

        return {
            history: result,
            info: {
                title: '📜 Historial de Autorizaciones',
                description: 'Registro inmutable de todas las acciones realizadas',
                features: {
                    immutable: '🔒 Los registros no pueden ser modificados ni eliminados',
                    signed: '✍️ Cada acción incluye firma digital SHA-512',
                    timestamped: '🕐 Marcas de tiempo precisas',
                    auditable: '📋 Cumple requisitos de auditoría SOX'
                }
            }
        };
    }

    // Helpers
    async getRequest(requestId) {
        const result = await sequelize.query(`
            SELECT * FROM wms_authorization_requests WHERE id = $1
        `, {
            bind: [requestId],
            type: sequelize.QueryTypes.SELECT
        });
        return result[0];
    }

    async getUserRole(userId) {
        const result = await sequelize.query(`
            SELECT role FROM users WHERE user_id = $1
        `, {
            bind: [userId],
            type: sequelize.QueryTypes.SELECT
        });
        return result[0]?.role || 'user';
    }

    async getAuthorizationLevel(companyId, roleName, operationType) {
        const result = await sequelize.query(`
            SELECT * FROM wms_authorization_levels
            WHERE company_id = $1 AND role_name = $2 AND operation_type = $3 AND is_active = TRUE
        `, {
            bind: [companyId, roleName, operationType],
            type: sequelize.QueryTypes.SELECT
        });
        return result[0];
    }
}

module.exports = new WMSAuthorizationService();
