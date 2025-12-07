/**
 * PROCEDURE ACKNOWLEDGEMENT MODEL - Acuses de recibo
 *
 * @version 1.0.0
 * @date 2025-12-07
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcedureAcknowledgement = sequelize.define('ProcedureAcknowledgement', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        procedure_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'procedures', key: 'id' }
        },
        procedure_version_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'procedure_versions', key: 'id' }
        },

        // Usuario que debe dar acuse
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        employee_id: {
            type: DataTypes.STRING(50),
            comment: 'Legajo del empleado (snapshot)'
        },
        employee_name: {
            type: DataTypes.STRING(255),
            comment: 'Nombre completo (snapshot)'
        },

        // Estado del acuse
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'acknowledged', 'expired']]
            }
        },

        // Notificacion asociada
        notification_id: {
            type: DataTypes.UUID,
            comment: 'Referencia a notification del sistema central'
        },
        notification_sent_at: DataTypes.DATE,

        // Acuse de recibo
        acknowledged_at: DataTypes.DATE,
        acknowledgement_ip: {
            type: DataTypes.STRING(45),
            comment: 'IP desde donde se dio acuse'
        },
        acknowledgement_method: {
            type: DataTypes.STRING(20),
            validate: {
                isIn: [['web', 'mobile', 'email', null]]
            }
        },

        // Recordatorios
        reminder_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        last_reminder_at: DataTypes.DATE
    }, {
        tableName: 'procedure_acknowledgements',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['procedure_id', 'procedure_version_id', 'user_id'] },
            { fields: ['user_id'] },
            { fields: ['status'] }
        ]
    });

    return ProcedureAcknowledgement;
};
