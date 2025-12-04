/**
 * DependencyType Model
 * Tipos base de dependencias (del sistema)
 * Solo 4 tipos genéricos: DOCUMENT_VALID, ATTENDANCE_RULE, FAMILY_CONDITION, CUSTOM_FORMULA
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const DependencyType = sequelize.define('DependencyType', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        type_code: {
            type: DataTypes.STRING(30),
            allowNull: false,
            unique: true,
            comment: 'Código único del tipo: DOCUMENT_VALID, ATTENDANCE_RULE, FAMILY_CONDITION, CUSTOM_FORMULA'
        },
        type_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        type_name_i18n: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Nombres localizados: {"es": "...", "en": "...", "pt": "..."}'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        icon: {
            type: DataTypes.STRING(50),
            defaultValue: 'file-text'
        },
        color_hex: {
            type: DataTypes.STRING(7),
            defaultValue: '#6c757d'
        },
        requires_expiration: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '¿Este tipo tiene fecha de vencimiento?'
        },
        requires_file: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '¿Requiere archivo adjunto?'
        },
        requires_family_member: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '¿Se asocia a un familiar?'
        },
        is_system: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'TRUE = tipo del sistema, no se puede eliminar'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        display_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'dependency_types',
        timestamps: false,
        underscored: true
    });

    DependencyType.associate = (models) => {
        DependencyType.hasMany(models.CompanyDependency, {
            foreignKey: 'dependency_type_id',
            as: 'companyDependencies'
        });
    };

    return DependencyType;
};
