/**
 * AdditionalRoleType Model
 *
 * Catálogo de roles adicionales disponibles para asignar a empleados
 * Ejemplos: bombero interno, capacitador, auditor, brigadista, primeros auxilios, etc.
 *
 * MULTI-TENANT: Cada empresa puede tener sus propios roles adicionales
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const AdditionalRoleType = sequelize.define('AdditionalRoleType', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        // Identificador único del rol
        roleKey: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'role_key',
            comment: 'Clave única del rol (bombero_interno, capacitador, etc.)'
        },

        // Nombre visible del rol
        roleName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'role_name',
            comment: 'Nombre del rol para mostrar'
        },

        // Descripción detallada
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Descripción de las responsabilidades del rol'
        },

        // Categoría del rol
        category: {
            type: DataTypes.ENUM(
                'seguridad',      // Bombero, brigadista, evacuación
                'salud',          // Primeros auxilios, socorrista
                'capacitacion',   // Capacitador, mentor, instructor
                'auditoria',      // Auditor interno, inspector
                'supervision',    // Líder de equipo, coordinador
                'representacion', // Delegado sindical, representante
                'otros'           // Otros roles especiales
            ),
            allowNull: false,
            defaultValue: 'otros',
            comment: 'Categoría del rol adicional'
        },

        // Icono para mostrar en UI
        icon: {
            type: DataTypes.STRING(10),
            allowNull: true,
            defaultValue: '🏷️',
            comment: 'Emoji o icono para el rol'
        },

        // Color para badges en UI
        color: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: '#6c757d',
            comment: 'Color hexadecimal para mostrar en UI'
        },

        // Requiere certificación
        requiresCertification: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'requires_certification',
            comment: 'Si el rol requiere certificación válida'
        },

        // Duración de la certificación en meses (0 = sin vencimiento)
        certificationValidityMonths: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 12,
            field: 'certification_validity_months',
            comment: 'Meses de validez de la certificación'
        },

        // Puntaje bonus para el scoring del Expediente 360°
        scoringBonus: {
            type: DataTypes.DECIMAL(3, 2),
            allowNull: false,
            defaultValue: 0.05,
            field: 'scoring_bonus',
            comment: 'Bonus porcentual (0.05 = +5%) para scoring del Expediente 360°'
        },

        // Capacitación requerida
        requiredTraining: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
            field: 'required_training',
            comment: 'Lista de capacitaciones requeridas para este rol'
        },

        // Responsabilidades asociadas
        responsibilities: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
            comment: 'Lista de responsabilidades del rol'
        },

        // Multi-tenant: empresa dueña del rol
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: true, // NULL = rol global disponible para todas las empresas
            field: 'company_id',
            references: {
                model: 'companies',
                key: 'id'
            },
            comment: 'Empresa dueña del rol (NULL = global)'
        },

        // Estado
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },

        // Metadata de creación
        createdBy: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'created_by'
        }
    }, {
        tableName: 'additional_role_types',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['role_key', 'company_id'],
                name: 'idx_role_key_company'
            },
            {
                fields: ['company_id']
            },
            {
                fields: ['category']
            },
            {
                fields: ['is_active']
            }
        ]
    });

    // Asociaciones
    AdditionalRoleType.associate = (models) => {
        // Pertenece a una empresa (opcional)
        AdditionalRoleType.belongsTo(models.Company, {
            foreignKey: 'companyId',
            as: 'company'
        });
    };

    return AdditionalRoleType;
};
