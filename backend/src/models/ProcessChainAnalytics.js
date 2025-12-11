/**
 * ============================================================================
 * MODELO: Process Chain Analytics
 * ============================================================================
 *
 * Sequelize model para tracking de uso y performance de process chains
 *
 * @version 1.0.0
 * @date 2025-12-11
 * ============================================================================
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcessChainAnalytics = sequelize.define('ProcessChainAnalytics', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        // Multi-tenant
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'companies',
                key: 'company_id'
            },
            onDelete: 'CASCADE'
        },

        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'user_id'
            },
            onDelete: 'CASCADE'
        },

        // Action info
        action_key: {
            type: DataTypes.STRING(100),
            allowNull: false
        },

        action_name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },

        module_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },

        // Chain details
        total_steps: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },

        prerequisites_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },

        prerequisites_fulfilled: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },

        prerequisites_missing: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },

        can_proceed: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        // Lifecycle tracking
        generated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },

        started_at: {
            type: DataTypes.DATE,
            allowNull: true
        },

        completed_at: {
            type: DataTypes.DATE,
            allowNull: true
        },

        abandoned_at: {
            type: DataTypes.DATE,
            allowNull: true
        },

        // Status
        status: {
            type: DataTypes.ENUM('generated', 'started', 'completed', 'abandoned'),
            defaultValue: 'generated'
        },

        // Performance metrics
        generation_time_ms: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        completion_time_ms: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        // User agent & context
        user_agent: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        ip_address: {
            type: DataTypes.STRING(50),
            allowNull: true
        },

        referrer_module: {
            type: DataTypes.STRING(100),
            allowNull: true
        },

        // Metadata
        warnings_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },

        tips_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },

        has_alternative_route: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        // Feedback
        feedback_rating: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: {
                min: 1,
                max: 5
            }
        },

        feedback_comment: {
            type: DataTypes.TEXT,
            allowNull: true
        }

    }, {
        tableName: 'process_chain_analytics',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['company_id'] },
            { fields: ['user_id'] },
            { fields: ['action_key'] },
            { fields: ['module_name'] },
            { fields: ['status'] },
            { fields: ['generated_at'] },
            { fields: ['completed_at'] },
            { fields: ['company_id', 'action_key', 'generated_at'] },
            { fields: ['company_id', 'module_name', 'generated_at'] }
        ]
    });

    // Asociaciones
    ProcessChainAnalytics.associate = (models) => {
        ProcessChainAnalytics.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });

        ProcessChainAnalytics.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });
    };

    return ProcessChainAnalytics;
};
