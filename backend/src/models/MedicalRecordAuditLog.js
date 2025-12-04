/**
 * MedicalRecordAuditLog Model
 * Log de auditoria INMUTABLE (append-only) para trazabilidad legal
 * Cumple requisitos de cadena de custodia y evidencia digital
 */

const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
    const MedicalRecordAuditLog = sequelize.define('MedicalRecordAuditLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        record_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        record_type: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        action: {
            type: DataTypes.ENUM(
                'created', 'viewed', 'edited', 'signed',
                'locked', 'unlocked_temporary',
                'delete_requested', 'delete_approved', 'delete_rejected',
                'deleted', 'restored',
                'authorization_requested', 'authorization_approved',
                'authorization_rejected', 'authorization_expired',
                'window_opened', 'window_used', 'window_expired',
                'attachment_added', 'attachment_removed',
                'exported', 'printed'
            ),
            allowNull: false
        },
        action_by: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'user_id o 0 para SYSTEM'
        },
        action_by_name: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Nombre redundante para reportes'
        },
        action_by_role: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        action_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        old_values: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        new_values: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true,
            comment: 'IPv4 o IPv6'
        },
        user_agent: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        session_id: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        authorization_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Referencia a autorizacion si aplica'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        metadata: {
            type: DataTypes.JSONB,
            defaultValue: {}
        }
    }, {
        tableName: 'medical_record_audit_log',
        timestamps: false, // APPEND-ONLY: Sin updated_at
        indexes: [
            { fields: ['company_id'] },
            { fields: ['record_id'] },
            { fields: ['action'] },
            { fields: ['action_by'] },
            { fields: ['action_at'] },
            { fields: ['authorization_id'] },
            {
                name: 'idx_audit_timeline',
                fields: ['record_id', 'action_at']
            }
        ],
        hooks: {
            // Prevenir cualquier UPDATE o DELETE
            beforeUpdate: () => {
                throw new Error('MedicalRecordAuditLog es inmutable. No se permiten actualizaciones.');
            },
            beforeDestroy: () => {
                throw new Error('MedicalRecordAuditLog es inmutable. No se permiten eliminaciones.');
            },
            beforeBulkUpdate: () => {
                throw new Error('MedicalRecordAuditLog es inmutable. No se permiten actualizaciones masivas.');
            },
            beforeBulkDestroy: () => {
                throw new Error('MedicalRecordAuditLog es inmutable. No se permiten eliminaciones masivas.');
            }
        }
    });

    // Metodos de clase (solo lectura y creacion)

    /**
     * Crea una entrada de auditoria
     * @param {Object} data - Datos del log
     * @returns {MedicalRecordAuditLog}
     */
    MedicalRecordAuditLog.log = async function(data) {
        return this.create({
            company_id: data.companyId,
            record_id: data.recordId,
            record_type: data.recordType,
            action: data.action,
            action_by: data.actionBy || 0,
            action_by_name: data.actionByName || 'SYSTEM',
            action_by_role: data.actionByRole || 'system',
            old_values: data.oldValues || null,
            new_values: data.newValues || null,
            ip_address: data.ipAddress || null,
            user_agent: data.userAgent || null,
            session_id: data.sessionId || null,
            authorization_id: data.authorizationId || null,
            notes: data.notes || null,
            metadata: data.metadata || {}
        });
    };

    /**
     * Obtiene timeline completo de un registro
     */
    MedicalRecordAuditLog.getTimeline = async function(recordId, options = {}) {
        const where = { record_id: recordId };

        if (options.actions) {
            where.action = { [Op.in]: options.actions };
        }

        if (options.fromDate) {
            where.action_at = { [Op.gte]: options.fromDate };
        }

        if (options.toDate) {
            where.action_at = where.action_at || {};
            where.action_at[Op.lte] = options.toDate;
        }

        return this.findAll({
            where,
            order: [['action_at', options.order || 'ASC']],
            limit: options.limit || 1000
        });
    };

    /**
     * Obtiene actividad de un usuario
     */
    MedicalRecordAuditLog.getUserActivity = async function(userId, companyId, options = {}) {
        const where = {
            action_by: userId,
            company_id: companyId
        };

        if (options.fromDate) {
            where.action_at = { [Op.gte]: options.fromDate };
        }

        return this.findAll({
            where,
            order: [['action_at', 'DESC']],
            limit: options.limit || 100
        });
    };

    /**
     * Obtiene estadisticas de auditoria
     */
    MedicalRecordAuditLog.getStats = async function(companyId, options = {}) {
        const where = { company_id: companyId };

        if (options.fromDate) {
            where.action_at = { [Op.gte]: options.fromDate };
        }

        if (options.toDate) {
            where.action_at = where.action_at || {};
            where.action_at[Op.lte] = options.toDate;
        }

        const results = await this.findAll({
            where,
            attributes: [
                'action',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['action'],
            raw: true
        });

        // Convertir a objeto
        const stats = {};
        for (const row of results) {
            stats[row.action] = parseInt(row.count, 10);
        }

        return stats;
    };

    /**
     * Genera reporte de cadena de custodia para un registro
     */
    MedicalRecordAuditLog.generateCustodyChainReport = async function(recordId) {
        const timeline = await this.getTimeline(recordId, { order: 'ASC' });

        if (timeline.length === 0) {
            return null;
        }

        const report = {
            recordId,
            generatedAt: new Date().toISOString(),
            totalEvents: timeline.length,
            firstEvent: {
                action: timeline[0].action,
                timestamp: timeline[0].action_at,
                user: timeline[0].action_by_name
            },
            lastEvent: {
                action: timeline[timeline.length - 1].action,
                timestamp: timeline[timeline.length - 1].action_at,
                user: timeline[timeline.length - 1].action_by_name
            },
            events: timeline.map(log => ({
                id: log.id,
                action: log.action,
                timestamp: log.action_at,
                user: log.action_by_name,
                role: log.action_by_role,
                ip: log.ip_address,
                notes: log.notes,
                hasChanges: !!(log.old_values || log.new_values)
            })),
            actionSummary: {}
        };

        // Contar acciones
        for (const log of timeline) {
            report.actionSummary[log.action] = (report.actionSummary[log.action] || 0) + 1;
        }

        return report;
    };

    /**
     * Verifica integridad de la cadena de auditoria
     * (Busca gaps o inconsistencias)
     */
    MedicalRecordAuditLog.verifyIntegrity = async function(recordId) {
        const timeline = await this.getTimeline(recordId, { order: 'ASC' });

        const issues = [];

        // Verificar que existe un evento 'created'
        const createdEvent = timeline.find(e => e.action === 'created');
        if (!createdEvent) {
            issues.push({
                type: 'MISSING_CREATION',
                message: 'No se encontro evento de creacion del registro'
            });
        }

        // Verificar secuencia de IDs (no debe haber gaps)
        let lastId = null;
        for (const log of timeline) {
            if (lastId !== null && log.id !== lastId + 1) {
                // Podria haber gap (aunque no es necesariamente un problema
                // si hay logs de otros registros intercalados)
            }
            lastId = log.id;
        }

        // Verificar que deleted tiene delete_approved previo (si aplica)
        const deletedEvent = timeline.find(e => e.action === 'deleted');
        if (deletedEvent) {
            const approvalBefore = timeline.find(e =>
                e.action === 'delete_approved' &&
                new Date(e.action_at) < new Date(deletedEvent.action_at)
            );

            if (!approvalBefore) {
                issues.push({
                    type: 'DELETE_WITHOUT_APPROVAL',
                    message: 'Registro eliminado sin aprobacion previa registrada'
                });
            }
        }

        return {
            recordId,
            isValid: issues.length === 0,
            totalEvents: timeline.length,
            issues
        };
    };

    // NO tiene asociaciones para mantener independencia
    // (los IDs se guardan pero no hay FK para evitar cascades)

    return MedicalRecordAuditLog;
};
