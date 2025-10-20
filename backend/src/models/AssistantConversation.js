/**
 * AssistantConversation Model
 *
 * Sequelize model para tabla assistant_conversations
 * MULTI-TENANT: Historial de conversaciones privado por empresa
 *
 * @technology Sequelize + PostgreSQL + JSONB
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AssistantConversation = sequelize.define('AssistantConversation', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },

    // MULTI-TENANT: Obligatorio
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'company_id'
      },
      comment: 'OBLIGATORIO - Historial es PRIVADO por empresa'
    },

    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },

    // Conversación
    question: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    answer: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    // Relación con knowledge base (si usó una respuesta del cache global)
    knowledge_entry_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'assistant_knowledge_base',
        key: 'id'
      },
      comment: 'Si la respuesta vino del knowledge base global'
    },

    // Contexto de la conversación
    context: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },

    module_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    screen_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    // Metadata de la respuesta
    answer_source: {
      type: DataTypes.STRING(50),
      defaultValue: 'ollama',
      validate: {
        isIn: [['ollama', 'cache', 'diagnostic', 'registry', 'fallback']]
      },
      comment: 'Origen de la respuesta'
    },

    confidence: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.0,
      validate: {
        min: 0,
        max: 1
      }
    },

    response_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },

    // Feedback del usuario
    helpful: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null,
      comment: 'NULL = sin feedback aún'
    },

    feedback_comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    feedback_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // Flags
    diagnostic_triggered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // Timestamps
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'assistant_conversations',
    timestamps: false, // Solo created_at (no updated_at en conversaciones)
    underscored: true,

    indexes: [
      { fields: ['company_id', 'created_at'] },
      { fields: ['user_id', 'created_at'] },
      { fields: ['module_name', 'created_at'] },
      { fields: ['helpful', 'created_at'] },
      { fields: ['company_id', 'module_name', 'helpful', 'created_at'] }
    ]
  });

  // Métodos de instancia
  AssistantConversation.prototype.submitFeedback = async function(helpful, comment = null) {
    this.helpful = helpful;
    this.feedback_comment = comment;
    this.feedback_at = new Date();
    return await this.save();
  };

  // Métodos estáticos
  AssistantConversation.getCompanyHistory = async function(companyId, options = {}) {
    const { limit = 20, module = null, onlyWithFeedback = false } = options;

    const where = { company_id: companyId };
    if (module) where.module_name = module;
    if (onlyWithFeedback) where.helpful = { [sequelize.Sequelize.Op.ne]: null };

    return await this.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['user_id', 'firstName', 'lastName', 'email']
        }
      ]
    });
  };

  AssistantConversation.getUserHistory = async function(userId, limit = 20) {
    return await this.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit
    });
  };

  return AssistantConversation;
};
