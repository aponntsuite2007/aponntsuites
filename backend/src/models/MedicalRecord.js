/**
 * MedicalRecord Model
 * Registros medicos con sistema de inmutabilidad controlada
 * Cumple Ley 19.587, Decreto 351/79, Resoluciones SRT
 */

const { DataTypes, Op } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize) => {
    const MedicalRecord = sequelize.define('MedicalRecord', {
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
        employee_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        record_type: {
            type: DataTypes.ENUM(
                'exam', 'certificate', 'study', 'prescription',
                'antecedent', 'aptitude', 'disability', 'accident'
            ),
            allowNull: false
        },
        template_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'medical_exam_templates',
                key: 'id'
            }
        },

        // Datos del registro
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [3, 255]
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        exam_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        expiration_date: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },

        // Resultado
        result: {
            type: DataTypes.ENUM(
                'apto', 'apto_con_observaciones', 'no_apto',
                'pendiente', 'vencido', 'suspendido'
            ),
            allowNull: true,
            defaultValue: 'pendiente'
        },
        result_details: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        observations: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        restrictions: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'Restricciones laborales'
        },

        // Archivos
        attachments: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: '[{filename, original_name, url, mime_type, size_bytes, uploaded_at, checksum_sha256}]'
        },

        // Estudios y documentos
        completed_studies: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: '[{study_name, completed, date, result, notes, attachment_index}]'
        },
        submitted_documents: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: '[{document_name, submitted, date, verified_by, attachment_index}]'
        },

        // Firma digital
        digital_signature: {
            type: DataTypes.STRING(64),
            allowNull: true,
            comment: 'SHA-256 del contenido'
        },
        signature_timestamp: {
            type: DataTypes.DATE,
            allowNull: true
        },
        signature_data: {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: 'Datos incluidos en la firma'
        },
        signed_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },

        // Sistema de inmutabilidad
        editable_until: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Ventana de 48 horas desde creacion'
        },
        is_locked: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        locked_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        locked_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        locked_reason: {
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: 'Ventana de edicion expirada'
        },

        // Contadores
        edit_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        last_edited_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        last_edited_at: {
            type: DataTypes.DATE,
            allowNull: true
        },

        // Soft delete
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        deleted_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        deletion_reason: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        deletion_authorized_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        deletion_authorization_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        // Auditoria
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        metadata: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        version: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        }
    }, {
        tableName: 'medical_records',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        paranoid: false, // Usamos soft delete manual
        indexes: [
            { fields: ['company_id'] },
            { fields: ['employee_id'] },
            { fields: ['record_type'] },
            { fields: ['exam_date'] },
            { fields: ['result'] },
            { fields: ['is_locked'] },
            { fields: ['is_deleted'] },
            { fields: ['expiration_date'] }
        ],
        hooks: {
            beforeCreate: (record) => {
                // Calcular editable_until (48 horas)
                const now = new Date();
                record.editable_until = new Date(now.getTime() + 48 * 60 * 60 * 1000);
            },
            beforeUpdate: (record) => {
                // Incrementar version para optimistic locking
                record.version = (record.version || 1) + 1;
            }
        }
    });

    // Metodos de instancia

    /**
     * Verifica si el registro es editable
     * @param {number} userId - ID del usuario que intenta editar
     * @returns {Object} {editable, reason, requiresAuthorization, authorizationId}
     */
    MedicalRecord.prototype.isEditable = async function(userId = null) {
        // Si esta eliminado, no es editable
        if (this.is_deleted) {
            return {
                editable: false,
                reason: 'Registro eliminado',
                requiresAuthorization: false
            };
        }

        // Verificar ventana de edicion normal
        const now = new Date();
        if (!this.is_locked && this.editable_until && new Date(this.editable_until) > now) {
            const remainingMs = new Date(this.editable_until) - now;
            const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
            const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

            return {
                editable: true,
                reason: 'Dentro de ventana de edicion',
                editableUntil: this.editable_until,
                remainingTime: `${remainingHours}h ${remainingMinutes}m`,
                requiresAuthorization: false
            };
        }

        // Verificar autorizacion activa
        const MedicalEditAuthorization = sequelize.models.MedicalEditAuthorization;
        if (MedicalEditAuthorization) {
            const whereClause = {
                record_id: this.id,
                status: 'approved',
                window_used: false,
                authorization_window_end: { [Op.gt]: now }
            };

            if (userId) {
                whereClause.requested_by = userId;
            }

            const authorization = await MedicalEditAuthorization.findOne({
                where: whereClause,
                order: [['authorized_at', 'DESC']]
            });

            if (authorization) {
                const windowEnd = new Date(authorization.authorization_window_end);
                const remainingMs = windowEnd - now;
                const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
                const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

                return {
                    editable: true,
                    reason: 'Autorizacion activa',
                    authorizationId: authorization.id,
                    windowEnd: authorization.authorization_window_end,
                    remainingTime: `${remainingHours}h ${remainingMinutes}m`,
                    requiresAuthorization: false
                };
            }
        }

        // No editable
        return {
            editable: false,
            reason: 'Registro bloqueado - requiere autorizacion',
            lockedAt: this.locked_at,
            requiresAuthorization: true
        };
    };

    /**
     * Genera firma digital SHA-256
     * @param {number} signedByUserId - ID del usuario que firma
     * @returns {string} Firma SHA-256
     */
    MedicalRecord.prototype.generateSignature = function(signedByUserId) {
        const dataToSign = {
            id: this.id,
            company_id: this.company_id,
            employee_id: this.employee_id,
            record_type: this.record_type,
            title: this.title,
            description: this.description || '',
            exam_date: this.exam_date,
            result: this.result || '',
            created_at: this.created_at,
            created_by: this.created_by
        };

        const dataString = JSON.stringify(dataToSign);
        const signature = crypto.createHash('sha256').update(dataString).digest('hex');

        this.digital_signature = signature;
        this.signature_timestamp = new Date();
        this.signature_data = dataToSign;
        this.signed_by = signedByUserId;

        return signature;
    };

    /**
     * Verifica la integridad de la firma
     * @returns {boolean} true si la firma es valida
     */
    MedicalRecord.prototype.verifySignature = function() {
        if (!this.digital_signature || !this.signature_data) {
            return false;
        }

        const dataString = JSON.stringify(this.signature_data);
        const expectedSignature = crypto.createHash('sha256').update(dataString).digest('hex');

        return this.digital_signature === expectedSignature;
    };

    /**
     * Bloquea el registro manualmente
     * @param {number} userId - ID del usuario que bloquea
     * @param {string} reason - Razon del bloqueo
     */
    MedicalRecord.prototype.lock = async function(userId, reason = 'Bloqueo manual') {
        this.is_locked = true;
        this.locked_at = new Date();
        this.locked_by = userId;
        this.locked_reason = reason;
        await this.save();
    };

    /**
     * Marca como usado una autorizacion de edicion
     * @param {number} authorizationId - ID de la autorizacion
     * @param {string} action - Accion realizada ('edited', 'deleted')
     */
    MedicalRecord.prototype.useAuthorization = async function(authorizationId, action) {
        const MedicalEditAuthorization = sequelize.models.MedicalEditAuthorization;
        if (MedicalEditAuthorization) {
            await MedicalEditAuthorization.update({
                window_used: true,
                window_used_at: new Date(),
                window_action_performed: action
            }, {
                where: { id: authorizationId }
            });
        }
    };

    // Metodos de clase

    /**
     * Obtiene registros activos de un empleado
     */
    MedicalRecord.getForEmployee = async function(companyId, employeeId, options = {}) {
        const where = {
            company_id: companyId,
            employee_id: employeeId,
            is_deleted: false
        };

        if (options.recordType) {
            where.record_type = options.recordType;
        }

        if (options.result) {
            where.result = options.result;
        }

        return this.findAll({
            where,
            order: [['exam_date', 'DESC']],
            include: options.include || []
        });
    };

    /**
     * Obtiene registros por vencer
     */
    MedicalRecord.getExpiringSoon = async function(companyId, daysAhead = 30) {
        const today = new Date();
        const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

        return this.findAll({
            where: {
                company_id: companyId,
                is_deleted: false,
                expiration_date: {
                    [Op.between]: [today, futureDate]
                }
            },
            order: [['expiration_date', 'ASC']],
            include: [{
                model: sequelize.models.User,
                as: 'employee',
                attributes: ['user_id', 'firstName', 'lastName', 'email']
            }]
        });
    };

    /**
     * Bloquea registros expirados (batch)
     */
    MedicalRecord.lockExpiredRecords = async function() {
        const now = new Date();

        const [affectedCount] = await this.update({
            is_locked: true,
            locked_at: now,
            locked_reason: 'Ventana de edicion expirada (automatico)'
        }, {
            where: {
                is_locked: false,
                is_deleted: false,
                editable_until: { [Op.lt]: now }
            }
        });

        return affectedCount;
    };

    // Asociaciones
    MedicalRecord.associate = function(models) {
        MedicalRecord.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        MedicalRecord.belongsTo(models.User, {
            foreignKey: 'employee_id',
            as: 'employee'
        });
        MedicalRecord.belongsTo(models.User, {
            foreignKey: 'created_by',
            as: 'creator'
        });
        MedicalRecord.belongsTo(models.User, {
            foreignKey: 'signed_by',
            as: 'signer'
        });
        MedicalRecord.belongsTo(models.MedicalExamTemplate, {
            foreignKey: 'template_id',
            as: 'template'
        });
        MedicalRecord.hasMany(models.MedicalEditAuthorization, {
            foreignKey: 'record_id',
            as: 'authorizations'
        });
        MedicalRecord.hasMany(models.MedicalRecordAuditLog, {
            foreignKey: 'record_id',
            as: 'auditLogs'
        });
    };

    return MedicalRecord;
};
