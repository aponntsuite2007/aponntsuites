/**
 * AssistantKnowledgeBase Model
 *
 * Sequelize model para tabla assistant_knowledge_base
 *
 * @technology Sequelize + PostgreSQL + JSONB
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AssistantKnowledgeBase = sequelize.define('AssistantKnowledgeBase', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },

    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'companies',
        key: 'company_id'
      }
    },

    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },

    user_role: {
      type: DataTypes.STRING(50),
      allowNull: true
    },

    question: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    question_normalized: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    context: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },

    module_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    answer: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    answer_source: {
      type: DataTypes.STRING(50),
      defaultValue: 'ollama',
      validate: {
        isIn: [['ollama', 'cache', 'diagnostic', 'registry', 'fallback']]
      }
    },

    model_used: {
      type: DataTypes.STRING(100),
      defaultValue: 'llama3.1:8b'
    },

    tokens_used: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    response_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    confidence_score: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 1
      }
    },

    diagnostic_triggered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    diagnostic_execution_id: {
      type: DataTypes.UUID,
      allowNull: true
    },

    diagnostic_results: {
      type: DataTypes.JSONB,
      allowNull: true
    },

    suggested_actions: {
      type: DataTypes.JSONB,
      allowNull: true
    },

    quick_replies: {
      type: DataTypes.JSONB,
      allowNull: true
    },

    helpful: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },

    feedback_comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    feedback_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    reused_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    improved_answer: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    verified_by_admin: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },

    verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },

    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'assistant_knowledge_base',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

    indexes: [
      { fields: ['company_id'] },
      { fields: ['module_name'] },
      { fields: ['helpful'] },
      { fields: ['created_at'] },
      { fields: ['company_id', 'module_name', 'helpful'] }
    ]
  });

  return AssistantKnowledgeBase;
};
