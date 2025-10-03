/*
 * 🐘 BIOMETRIC TEMPLATE MODEL - FASE 3
 * ====================================
 * Modelo PostgreSQL optimizado para millones de templates
 * Particionado por empresa, índices especializados
 * Fecha: 2025-09-26
 * Versión: 2.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    console.log('🐘 [BIOMETRIC-MODEL] Definiendo modelo BiometricTemplate...');

    const BiometricTemplate = sequelize.define('BiometricTemplate', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            comment: 'Identificador único del template biométrico'
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'companies',
                key: 'id'
            },
            comment: 'ID de la empresa (para particionado y aislación)'
        },
        employee_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'employees',
                key: 'id'
            },
            comment: 'ID del empleado propietario del template'
        },
        template_data: {
            type: DataTypes.TEXT, // BYTEA en PostgreSQL
            allowNull: false,
            comment: 'Template biométrico encriptado (512 dimensiones FaceNet)'
        },
        template_hash: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: false, // Único por empresa, no globalmente
            comment: 'SHA-256 hash del template para detección de duplicados'
        },
        quality_score: {
            type: DataTypes.DECIMAL(5, 4), // Precisión: 0.9999
            allowNull: false,
            defaultValue: 0.0000,
            validate: {
                min: 0.0,
                max: 1.0
            },
            comment: 'Score de calidad de la captura (0.0 - 1.0)'
        },
        algorithm_version: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: '2.0.0',
            comment: 'Versión del algoritmo de generación de template'
        },
        device_id: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'ID del dispositivo que capturó el template'
        },
        capture_metadata: {
            type: DataTypes.JSONB, // JSON binario optimizado en PostgreSQL
            allowNull: true,
            comment: 'Metadatos de captura (liveness, anti-spoofing, etc.)'
        },
        verification_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Número de verificaciones realizadas con este template'
        },
        last_verification_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp de la última verificación exitosa'
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            comment: 'Fecha y hora de creación del template'
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            comment: 'Fecha y hora de última actualización'
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Fecha de expiración del template (para auto-cleanup)'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Estado activo del template'
        }
    }, {
        tableName: 'biometric_templates',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',

        // 📊 ÍNDICES ESPECIALIZADOS MULTI-TENANT
        indexes: [
            // Índice principal por empresa y empleado (más usado)
            {
                name: 'idx_biometric_templates_company_employee',
                fields: ['company_id', 'employee_id'],
                using: 'btree'
            },
            // Índice para búsquedas por calidad
            {
                name: 'idx_biometric_templates_quality',
                fields: ['company_id', 'quality_score'],
                where: {
                    quality_score: {
                        [sequelize.Op.gte]: 0.7
                    }
                },
                using: 'btree'
            },
            // Índice para templates activos
            {
                name: 'idx_biometric_templates_active',
                fields: ['company_id', 'is_active', 'expires_at'],
                where: {
                    is_active: true,
                    expires_at: {
                        [sequelize.Op.gt]: new Date()
                    }
                },
                using: 'btree'
            },
            // Índice para detección de duplicados por empresa
            {
                name: 'idx_biometric_templates_hash_company',
                fields: ['company_id', 'template_hash'],
                unique: true, // Único por empresa
                using: 'btree'
            },
            // Índice para cleanup automático
            {
                name: 'idx_biometric_templates_expires',
                fields: ['expires_at'],
                where: {
                    expires_at: {
                        [sequelize.Op.lt]: new Date()
                    }
                },
                using: 'btree'
            },
            // Índice para métricas de uso
            {
                name: 'idx_biometric_templates_usage',
                fields: ['company_id', 'verification_count', 'last_verification_at'],
                using: 'btree'
            },
            // Índice JSONB para metadatos (PostgreSQL específico)
            {
                name: 'idx_biometric_templates_metadata',
                fields: ['capture_metadata'],
                using: 'gin' // GIN index para JSONB
            }
        ],

        // 🔗 ASOCIACIONES
        associations: {
            belongsTo: [
                { model: 'Company', foreignKey: 'company_id' },
                { model: 'Employee', foreignKey: 'employee_id' }
            ]
        },

        // 🔧 CONFIGURACIONES POSTGRESQL AVANZADAS
        sequelize: {
            define: {
                // Configuraciones específicas de tabla
                charset: 'utf8mb4',
                collate: 'utf8mb4_unicode_ci'
            }
        },

        // 📏 VALIDACIONES PERSONALIZADAS
        validate: {
            // Validar que expires_at sea futuro si se especifica
            futureExpirationDate() {
                if (this.expires_at && this.expires_at <= new Date()) {
                    throw new Error('La fecha de expiración debe ser futura');
                }
            },

            // Validar formato del template_hash
            validTemplateHash() {
                if (this.template_hash && !/^[a-f0-9]{64}$/.test(this.template_hash)) {
                    throw new Error('template_hash debe ser un hash SHA-256 válido');
                }
            }
        },

        // 📊 HOOKS PARA OPERACIONES AUTOMÁTICAS
        hooks: {
            // Auto-actualizar updated_at
            beforeUpdate: (instance, options) => {
                instance.updated_at = new Date();
            },

            // Incrementar contador de verificación
            afterFind: (instances, options) => {
                if (options.incrementVerificationCount && instances) {
                    const templates = Array.isArray(instances) ? instances : [instances];
                    templates.forEach(template => {
                        if (template) {
                            template.increment('verification_count');
                            template.update({ last_verification_at: new Date() });
                        }
                    });
                }
            }
        },

        // 📈 MÉTODOS DE INSTANCIA
        instanceMethods: {
            // Verificar si el template está activo
            isActive() {
                return this.is_active &&
                       (!this.expires_at || this.expires_at > new Date());
            },

            // Obtener edad del template en días
            getAgeInDays() {
                const now = new Date();
                const created = new Date(this.created_at);
                return Math.floor((now - created) / (1000 * 60 * 60 * 24));
            },

            // Marcar template como usado
            async markAsUsed() {
                await this.increment('verification_count');
                await this.update({ last_verification_at: new Date() });
            }
        },

        // 📊 MÉTODOS DE CLASE
        classMethods: {
            // Obtener templates activos por empresa
            async getActiveByCompany(companyId, limit = 1000) {
                return await this.findAll({
                    where: {
                        company_id: companyId,
                        is_active: true,
                        expires_at: {
                            [sequelize.Op.or]: [
                                null,
                                { [sequelize.Op.gt]: new Date() }
                            ]
                        }
                    },
                    order: [['created_at', 'DESC']],
                    limit
                });
            },

            // Cleanup automático de templates expirados
            async cleanupExpired() {
                const result = await this.destroy({
                    where: {
                        expires_at: {
                            [sequelize.Op.lt]: new Date()
                        }
                    }
                });
                console.log(`🧹 [CLEANUP] ${result} templates expirados eliminados`);
                return result;
            },

            // Estadísticas por empresa
            async getCompanyStats(companyId) {
                const stats = await this.findOne({
                    where: { company_id: companyId },
                    attributes: [
                        [sequelize.fn('COUNT', sequelize.col('*')), 'total'],
                        [sequelize.fn('COUNT', sequelize.literal(
                            'CASE WHEN is_active = true AND (expires_at IS NULL OR expires_at > NOW()) THEN 1 END'
                        )), 'active'],
                        [sequelize.fn('AVG', sequelize.col('quality_score')), 'avgQuality'],
                        [sequelize.fn('COUNT', sequelize.literal('DISTINCT employee_id')), 'uniqueEmployees'],
                        [sequelize.fn('SUM', sequelize.col('verification_count')), 'totalVerifications']
                    ],
                    raw: true
                });

                return {
                    total: parseInt(stats.total || 0),
                    active: parseInt(stats.active || 0),
                    expired: parseInt(stats.total || 0) - parseInt(stats.active || 0),
                    averageQuality: parseFloat(stats.avgQuality || 0),
                    uniqueEmployees: parseInt(stats.uniqueEmployees || 0),
                    totalVerifications: parseInt(stats.totalVerifications || 0)
                };
            }
        }
    });

    // 🔗 Definir asociaciones después de la creación del modelo
    BiometricTemplate.associate = (models) => {
        BiometricTemplate.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });

        BiometricTemplate.belongsTo(models.Employee, {
            foreignKey: 'employee_id',
            as: 'employee'
        });
    };

    console.log('✅ [BIOMETRIC-MODEL] Modelo BiometricTemplate definido exitosamente');

    return BiometricTemplate;
};