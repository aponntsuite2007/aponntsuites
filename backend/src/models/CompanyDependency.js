/**
 * CompanyDependency Model
 * Dependencias definidas por cada empresa (multi-tenant)
 * Cada empresa crea sus propias dependencias: "Certificado Escolaridad", "Factura Guardería", etc.
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CompanyDependency = sequelize.define('CompanyDependency', {
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
        dependency_code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Código único por empresa: CERT_ESCOLARIDAD, FACTURA_GUARDERIA'
        },
        dependency_name: {
            type: DataTypes.STRING(150),
            allowNull: false,
            comment: 'Nombre legible: "Certificado de Escolaridad"'
        },
        dependency_name_i18n: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        dependency_type_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'dependency_types',
                key: 'id'
            },
            comment: 'Tipo base: DOCUMENT_VALID, ATTENDANCE_RULE, etc.'
        },
        config: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Configuración específica según el tipo de dependencia'
        },
        icon: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        color_hex: {
            type: DataTypes.STRING(7),
            allowNull: true
        },
        display_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'user_id'
            }
        }
    }, {
        tableName: 'company_dependencies',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['company_id', 'dependency_code']
            }
        ]
    });

    CompanyDependency.associate = (models) => {
        CompanyDependency.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });

        CompanyDependency.belongsTo(models.DependencyType, {
            foreignKey: 'dependency_type_id',
            as: 'dependencyType'
        });

        CompanyDependency.belongsTo(models.User, {
            foreignKey: 'created_by',
            as: 'creator'
        });

        CompanyDependency.hasMany(models.ConceptDependency, {
            foreignKey: 'dependency_id',
            as: 'conceptDependencies'
        });

        CompanyDependency.hasMany(models.EmployeeDependencyDocument, {
            foreignKey: 'dependency_id',
            as: 'documents'
        });
    };

    return CompanyDependency;
};
