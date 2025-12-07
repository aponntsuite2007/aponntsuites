/**
 * Modelo: EppInspection
 * Historial de inspecciones periodicas de EPP
 *
 * @version 1.0.0
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const EppInspection = sequelize.define('EppInspection', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        delivery_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'epp_deliveries', key: 'id' }
        },
        inspection_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        inspector_id: {
            type: DataTypes.UUID,
            allowNull: false,
            comment: 'Usuario que realizo la inspeccion'
        },

        // Resultado
        condition: {
            type: DataTypes.STRING(30),
            allowNull: false,
            validate: {
                isIn: [['good', 'fair', 'poor', 'damaged', 'unusable']]
            },
            comment: 'good, fair, poor, damaged, unusable'
        },
        is_compliant: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Cumple normativa?'
        },

        // Checklist items (dinamico por tipo de EPP)
        checklist_results: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
            comment: '{"integridad": true, "limpieza": true, "ajuste": false}'
        },

        // Acciones
        action_required: {
            type: DataTypes.STRING(50),
            allowNull: true,
            validate: {
                isIn: [['none', 'repair', 'replace', 'training', null]]
            },
            comment: 'none, repair, replace, training'
        },
        action_notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        action_deadline: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        action_completed: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        photos: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
            comment: 'URLs de fotos de la inspeccion'
        }
    }, {
        tableName: 'epp_inspections',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    EppInspection.associate = (models) => {
        if (models.EppDelivery) {
            EppInspection.belongsTo(models.EppDelivery, {
                foreignKey: 'delivery_id',
                as: 'delivery'
            });
        }

        if (models.User) {
            EppInspection.belongsTo(models.User, {
                foreignKey: 'inspector_id',
                as: 'inspector'
            });
        }
    };

    return EppInspection;
};
