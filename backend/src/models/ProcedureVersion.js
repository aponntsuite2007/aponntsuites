/**
 * PROCEDURE VERSION MODEL - Historial de versiones
 *
 * @version 1.0.0
 * @date 2025-12-07
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcedureVersion = sequelize.define('ProcedureVersion', {
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

        version_number: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        version_label: {
            type: DataTypes.STRING(20),
            allowNull: false
        },

        // Snapshot del contenido
        objective: DataTypes.TEXT,
        scope: DataTypes.TEXT,
        definitions: DataTypes.TEXT,
        responsibilities: DataTypes.TEXT,
        procedure_content: DataTypes.TEXT,
        references: DataTypes.TEXT,
        annexes: DataTypes.TEXT,

        // Control de cambios
        changes_summary: {
            type: DataTypes.TEXT,
            comment: 'Resumen de cambios respecto a version anterior'
        },
        change_reason: {
            type: DataTypes.TEXT,
            comment: 'Motivo del cambio'
        },

        // Workflow
        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        published_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        published_at: DataTypes.DATE,

        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'current',
            validate: {
                isIn: [['current', 'superseded', 'draft']]
            }
        }
    }, {
        tableName: 'procedure_versions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { unique: true, fields: ['procedure_id', 'version_number'] },
            { fields: ['status'] }
        ]
    });

    return ProcedureVersion;
};
