/**
 * Modelo: EppCategory
 * Categorias globales de EPP segun ISO 45001 y estandares internacionales
 *
 * @version 1.0.0
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const EppCategory = sequelize.define('EppCategory', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        code: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true,
            comment: 'HEAD, EYES, EARS, RESP, HANDS, FEET, BODY, FALL, ELEC, CHEM, HIVIS, OTHER'
        },
        name_es: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Nombre en espanol'
        },
        name_en: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Nombre en ingles'
        },
        icon: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Icono para UI (FontAwesome o similar)'
        },
        body_zone: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'head, face, torso, hands, feet, full_body, other'
        },
        iso_reference: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Referencia ISO 45001'
        },
        sort_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'epp_categories',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    EppCategory.associate = (models) => {
        if (models.EppCatalog) {
            EppCategory.hasMany(models.EppCatalog, {
                foreignKey: 'category_id',
                as: 'catalogItems'
            });
        }
    };

    return EppCategory;
};
