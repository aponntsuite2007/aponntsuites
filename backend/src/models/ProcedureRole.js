/**
 * PROCEDURE ROLE MODEL - Roles alcanzados por procedimiento
 *
 * @version 1.0.0
 * @date 2025-12-07
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcedureRole = sequelize.define('ProcedureRole', {
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

        // Referencia a posicion organizacional
        organizational_position_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'organizational_positions', key: 'id' }
        },

        // Nombre del rol si no existe en positions
        role_name: {
            type: DataTypes.STRING(100),
            allowNull: true
        },

        // Tipo de alcance
        scope_type: {
            type: DataTypes.STRING(20),
            defaultValue: 'must_read',
            validate: {
                isIn: [['must_read', 'must_execute', 'must_supervise']]
            },
            comment: 'must_read=debe leer, must_execute=debe ejecutar, must_supervise=debe supervisar'
        }
    }, {
        tableName: 'procedure_roles',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { unique: true, fields: ['procedure_id', 'organizational_position_id'] },
            { fields: ['organizational_position_id'] }
        ]
    });

    return ProcedureRole;
};
