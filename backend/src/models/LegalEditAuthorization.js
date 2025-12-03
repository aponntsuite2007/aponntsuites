/**
 * LegalEditAuthorization Model
 * Autorizaciones de edicion/borrado de registros legales
 * Integrado con sistema de notificaciones proactivas
 *
 * Patron copiado de MedicalEditAuthorization.js
 * Aplica: Ventanas de tiempo + Autorización RRHH + Escalamiento
 */

const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
    const LegalEditAuthorization = sequelize.define('LegalEditAuthorization', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'companies',
                key: 'company_id'
            }
        },
        record_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'ID del registro legal (legal_communications o user_legal_issues)'
        },
        record_table: {
            type: DataTypes.ENUM('legal_communications', 'user_legal_issues'),
            allowNull: false,
            comment: 'Tabla origen del registro'
        },
        record_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Tipo de comunicación o issue (warning, lawsuit, etc)'
        },

        // Solicitud
        requested_by: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'user_id'
            },
            comment: 'Usuario solicitante (abogado, RRHH)'
        },
        requested_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        request_reason: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [10, 2000] // Minimo 10 caracteres de explicacion
            },
            comment: 'Explicacion obligatoria del motivo'
        },
        action_type: {
            type: DataTypes.ENUM('edit', 'delete'),
            allowNull: false
        },
        proposed_changes: {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: 'Para ediciones: {field: {old_value, new_value}}'
        },
        priority: {
            type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
            defaultValue: 'normal'
        },

        // Autorizacion
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected', 'expired', 'cancelled', 'escalated'),
            defaultValue: 'pending'
        },
        authorized_by: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'user_id'
            },
            comment: 'RRHH, Supervisor o Legal Manager'
        },
        authorized_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        authorization_response: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Respuesta/comentario del autorizador'
        },

        // Escalamiento (2 niveles: RRHH -> Gerencia Legal)
        current_step: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: '1=RRHH, 2=Gerencia Legal/Supervisor'
        },
        escalated_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        escalation_reason: {
            type: DataTypes.STRING(255),
            allowNull: true
        },

        // Ventana temporal (24 horas post-aprobacion)
        authorization_window_start: {
            type: DataTypes.DATE,
            allowNull: true
        },
        authorization_window_end: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'start + 24 horas'
        },
        window_used: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        window_used_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        window_action_performed: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'edited, deleted, expired_unused'
        },

        // Integracion con notificaciones
        notification_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'FK a notifications (fuente unica de verdad)'
        },
        notification_group_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Para agrupar notificaciones relacionadas'
        },

        // Contexto legal (jurisdicción)
        jurisdiction_code: {
            type: DataTypes.STRING(10),
            allowNull: true,
            comment: 'ARG, BRA, MEX, etc - para contexto de la autorización'
        },

        // Audit trail interno
        audit_trail: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: '[{timestamp, action, user_id, user_name, details, ip_address}]'
        },

        // Timestamps
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Cuando expira la solicitud si no se responde'
        }
    }, {
        tableName: 'legal_edit_authorizations',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['company_id'] },
            { fields: ['record_id', 'record_table'] },
            { fields: ['status'] },
            { fields: ['requested_by'] },
            { fields: ['authorized_by'] },
            { fields: ['notification_id'] }
        ]
    });

    // Constantes (mismas que médico para consistencia)
    LegalEditAuthorization.EDIT_WINDOW_HOURS = 48; // Ventana inicial de edición
    LegalEditAuthorization.AUTHORIZATION_WINDOW_HOURS = 24; // Ventana post-aprobación
    LegalEditAuthorization.STEP1_TIMEOUT_HOURS = 48; // RRHH tiene 48h para responder
    LegalEditAuthorization.STEP2_TIMEOUT_HOURS = 24; // Gerencia Legal tiene 24h adicionales

    // Metodos de instancia

    /**
     * Agrega entrada al audit trail
     */
    LegalEditAuthorization.prototype.addAuditEntry = function(action, userId, userName, details = {}, ipAddress = null) {
        const trail = this.audit_trail || [];
        trail.push({
            timestamp: new Date().toISOString(),
            action,
            user_id: userId,
            user_name: userName,
            details,
            ip_address: ipAddress
        });
        this.audit_trail = trail;
    };

    /**
     * Aprueba la solicitud y otorga ventana de 24h
     */
    LegalEditAuthorization.prototype.approve = async function(authorizedBy, response = '') {
        const now = new Date();

        this.status = 'approved';
        this.authorized_by = authorizedBy;
        this.authorized_at = now;
        this.authorization_response = response;
        this.authorization_window_start = now;
        this.authorization_window_end = new Date(now.getTime() + LegalEditAuthorization.AUTHORIZATION_WINDOW_HOURS * 60 * 60 * 1000);

        this.addAuditEntry('approved', authorizedBy, '', { response });

        await this.save();
        return this;
    };

    /**
     * Rechaza la solicitud
     */
    LegalEditAuthorization.prototype.reject = async function(authorizedBy, response = '') {
        this.status = 'rejected';
        this.authorized_by = authorizedBy;
        this.authorized_at = new Date();
        this.authorization_response = response;

        this.addAuditEntry('rejected', authorizedBy, '', { response });

        await this.save();
        return this;
    };

    /**
     * Escala al siguiente nivel
     */
    LegalEditAuthorization.prototype.escalate = async function(reason = 'Timeout en respuesta') {
        if (this.current_step >= 2) {
            // Ya esta en el ultimo nivel, marcar como expirada
            this.status = 'expired';
            this.addAuditEntry('expired', 0, 'SYSTEM', { reason: 'No hubo respuesta en ningún nivel' });
        } else {
            this.status = 'escalated';
            this.current_step = 2;
            this.escalated_at = new Date();
            this.escalation_reason = reason;
            this.addAuditEntry('escalated', 0, 'SYSTEM', { reason, new_step: 2 });
        }

        await this.save();
        return this;
    };

    /**
     * Verifica si la ventana de autorizacion esta activa
     */
    LegalEditAuthorization.prototype.isWindowActive = function() {
        if (this.status !== 'approved' || this.window_used) {
            return false;
        }

        const now = new Date();
        return this.authorization_window_start <= now && this.authorization_window_end > now;
    };

    /**
     * Obtiene tiempo restante de ventana
     */
    LegalEditAuthorization.prototype.getRemainingWindowTime = function() {
        if (!this.isWindowActive()) {
            return null;
        }

        const now = new Date();
        const remainingMs = new Date(this.authorization_window_end) - now;
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

        return { hours, minutes, totalMs: remainingMs };
    };

    /**
     * Marca la ventana como usada
     */
    LegalEditAuthorization.prototype.markWindowUsed = async function(actionPerformed) {
        this.window_used = true;
        this.window_used_at = new Date();
        this.window_action_performed = actionPerformed;

        this.addAuditEntry('window_used', this.requested_by, '', { action: actionPerformed });

        await this.save();
        return this;
    };

    // Metodos de clase

    /**
     * Obtiene solicitudes pendientes para un autorizador
     */
    LegalEditAuthorization.getPendingForAuthorizer = async function(companyId, authorizerRole, options = {}) {
        const where = {
            company_id: companyId,
            status: { [Op.in]: ['pending', 'escalated'] }
        };

        // Filtrar por step segun rol
        if (authorizerRole === 'rrhh' || authorizerRole === 'hr_manager') {
            where.current_step = 1;
        } else if (authorizerRole === 'legal_manager' || authorizerRole === 'supervisor') {
            where.current_step = 2;
        }

        return this.findAll({
            where,
            order: [
                ['priority', 'DESC'],
                ['requested_at', 'ASC']
            ],
            include: [{
                model: sequelize.models.User,
                as: 'requestor',
                attributes: ['user_id', 'name', 'email']
            }]
        });
    };

    /**
     * Obtiene solicitudes de un usuario
     */
    LegalEditAuthorization.getMyRequests = async function(companyId, userId, options = {}) {
        const where = {
            company_id: companyId,
            requested_by: userId
        };

        if (options.status) {
            where.status = options.status;
        }

        return this.findAll({
            where,
            order: [['requested_at', 'DESC']]
        });
    };

    /**
     * Verifica autorizaciones con ventana expirada
     */
    LegalEditAuthorization.expireUnusedWindows = async function() {
        const now = new Date();

        const [affectedCount] = await this.update({
            window_action_performed: 'expired_unused'
        }, {
            where: {
                status: 'approved',
                window_used: false,
                authorization_window_end: { [Op.lt]: now }
            }
        });

        return affectedCount;
    };

    /**
     * Escala solicitudes sin respuesta
     */
    LegalEditAuthorization.escalateTimedOut = async function() {
        const step1Timeout = new Date(Date.now() - LegalEditAuthorization.STEP1_TIMEOUT_HOURS * 60 * 60 * 1000);
        const step2Timeout = new Date(Date.now() - LegalEditAuthorization.STEP2_TIMEOUT_HOURS * 60 * 60 * 1000);

        // Escalar step 1 a step 2
        const step1ToEscalate = await this.findAll({
            where: {
                status: 'pending',
                current_step: 1,
                requested_at: { [Op.lt]: step1Timeout }
            }
        });

        for (const auth of step1ToEscalate) {
            await auth.escalate('Timeout: RRHH no respondió en 48 horas');
        }

        // Expirar step 2 sin respuesta
        const step2ToExpire = await this.findAll({
            where: {
                status: 'escalated',
                current_step: 2,
                escalated_at: { [Op.lt]: step2Timeout }
            }
        });

        for (const auth of step2ToExpire) {
            auth.status = 'expired';
            auth.addAuditEntry('expired', 0, 'SYSTEM', { reason: 'Timeout: Gerencia Legal no respondió en 24 horas' });
            await auth.save();
        }

        return {
            escalated: step1ToEscalate.length,
            expired: step2ToExpire.length
        };
    };

    // Asociaciones
    LegalEditAuthorization.associate = function(models) {
        LegalEditAuthorization.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        LegalEditAuthorization.belongsTo(models.User, {
            foreignKey: 'requested_by',
            as: 'requestor'
        });
        LegalEditAuthorization.belongsTo(models.User, {
            foreignKey: 'authorized_by',
            as: 'authorizer'
        });
    };

    return LegalEditAuthorization;
};
