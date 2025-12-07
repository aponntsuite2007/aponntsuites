'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class DocumentRequest extends Model {
    static associate(models) {
      DocumentRequest.belongsTo(models.Document, {
        foreignKey: 'document_id',
        as: 'document'
      });

      DocumentRequest.belongsTo(models.User, {
        foreignKey: 'requested_from_id',
        as: 'requestedFrom'
      });

      DocumentRequest.belongsTo(models.User, {
        foreignKey: 'requested_by',
        as: 'requestedBy'
      });
    }

    // Estados de solicitud
    static get STATUSES() {
      return {
        PENDING: 'pending',
        UPLOADED: 'uploaded',
        CANCELLED: 'cancelled',
        EXPIRED: 'expired'
      };
    }

    // Prioridades
    static get PRIORITIES() {
      return {
        LOW: 'low',
        NORMAL: 'normal',
        HIGH: 'high',
        URGENT: 'urgent'
      };
    }

    // Verificar si está vencida
    isOverdue() {
      if (!this.due_date) return false;
      if (this.status !== 'pending') return false;
      return new Date(this.due_date) < new Date();
    }

    // Días restantes
    getDaysRemaining() {
      if (!this.due_date) return null;
      const now = new Date();
      const due = new Date(this.due_date);
      return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    }
  }

  DocumentRequest.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    type_code: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255)
    },
    description: {
      type: DataTypes.TEXT
    },

    // Destinatario
    requested_from_type: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    requested_from_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    requested_from_name: {
      type: DataTypes.STRING(255)
    },

    // Solicitante
    requested_by: {
      type: DataTypes.UUID,
      allowNull: false
    },
    requested_by_name: {
      type: DataTypes.STRING(255)
    },

    // Urgencia
    priority: {
      type: DataTypes.STRING(20),
      defaultValue: 'normal',
      validate: {
        isIn: [['low', 'normal', 'high', 'urgent']]
      }
    },
    due_date: {
      type: DataTypes.DATEONLY
    },

    // Estado
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'uploaded', 'cancelled', 'expired']]
      }
    },

    // Documento subido
    document_id: {
      type: DataTypes.UUID,
      references: {
        model: 'dms_documents',
        key: 'id'
      }
    },
    uploaded_at: {
      type: DataTypes.DATE
    },

    // Recordatorios
    reminder_sent_at: {
      type: DataTypes.DATE
    },
    reminder_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'DocumentRequest',
    tableName: 'dms_document_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['requested_from_id', 'status'] },
      { fields: ['company_id', 'status'] },
      { fields: ['due_date'] }
    ]
  });

  return DocumentRequest;
};
