/**
 * PROCEDURE MODEL - Manual de Procedimientos ISO 9001
 * Modelo principal para procedimientos e instructivos
 *
 * @version 1.0.0
 * @date 2025-12-07
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Procedure = sequelize.define('Procedure', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'companies', key: 'company_id' }
        },

        // Identificacion ISO 9001
        code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Codigo unico del procedimiento (ej: PRO-RRHH-001)'
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        type: {
            type: DataTypes.STRING(20),
            defaultValue: 'instructivo',
            validate: {
                isIn: [['procedimiento', 'instructivo', 'manual', 'politica']]
            }
        },

        // Versionado
        current_version: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        version_label: {
            type: DataTypes.STRING(20),
            defaultValue: '1.0'
        },

        // Estado del documento
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'draft',
            validate: {
                isIn: [['draft', 'pending_review', 'approved', 'published', 'obsolete']]
            }
        },

        // Contenido ISO 9001
        objective: {
            type: DataTypes.TEXT,
            comment: 'Objetivo del procedimiento'
        },
        scope: {
            type: DataTypes.TEXT,
            comment: 'Alcance'
        },
        definitions: {
            type: DataTypes.TEXT,
            comment: 'Definiciones y terminologia'
        },
        responsibilities: {
            type: DataTypes.TEXT,
            comment: 'Responsabilidades'
        },
        procedure_content: {
            type: DataTypes.TEXT,
            comment: 'Descripcion detallada del procedimiento'
        },
        references: {
            type: DataTypes.TEXT,
            comment: 'Referencias a otros documentos'
        },
        annexes: {
            type: DataTypes.TEXT,
            comment: 'Anexos'
        },

        // Segmentacion organizacional
        branch_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'branches', key: 'id' }
        },
        department_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'departments', key: 'id' }
        },
        sector_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'sectors', key: 'id' }
        },

        // Fechas importantes
        effective_date: {
            type: DataTypes.DATEONLY,
            comment: 'Fecha de entrada en vigor'
        },
        review_date: {
            type: DataTypes.DATEONLY,
            comment: 'Proxima fecha de revision'
        },
        obsolete_date: {
            type: DataTypes.DATEONLY,
            comment: 'Fecha de obsolescencia'
        },

        // Workflow
        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        reviewed_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        approved_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        published_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },

        reviewed_at: DataTypes.DATE,
        approved_at: DataTypes.DATE,
        published_at: DataTypes.DATE,

        // Metadata
        tags: {
            type: DataTypes.ARRAY(DataTypes.TEXT),
            defaultValue: []
        },
        is_critical: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        requires_training: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        training_module_id: {
            type: DataTypes.UUID,
            allowNull: true
        }
    }, {
        tableName: 'procedures',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'code'] },
            { fields: ['status'] },
            { fields: ['type'] },
            { fields: ['branch_id'] },
            { fields: ['department_id'] }
        ]
    });

    return Procedure;
};
