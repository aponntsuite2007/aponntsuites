'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class DocumentAlert extends Model {
    static associate(models) {
      DocumentAlert.belongsTo(models.Document, {
        foreignKey: 'document_id',
        as: 'document'
      });

      DocumentAlert.belongsTo(models.DocumentRequest, {
        foreignKey: 'request_id',
        as: 'request'
      });

      DocumentAlert.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }

    // Tipos de alerta
    static get TYPES() {
      return {
        EXPIRATION: 'expiration',
        PENDING_UPLOAD: 'pending_upload',
        PENDING_REVIEW: 'pending_review',
        PENDING_SIGNATURE: 'signature_required',
        PENDING_APPROVAL: 'pending_approval',
        OVERDUE: 'overdue',
        VERSION_CREATED: 'version_created',
        SHARED_WITH_YOU: 'shared_with_you',
        APPROVED: 'approved',
        REJECTED: 'rejected'
      };
    }

    // Severidades
    static get SEVERITIES() {
      return {
        INFO: 'info',
        WARNING: 'warning',
        ERROR: 'error',
        CRITICAL: 'critical'
      };
    }

    // Marcar como leída
    async markAsRead() {
      this.is_read = true;
      this.read_at = new Date();
      await this.save();
    }

    // Descartar
    async dismiss() {
      this.is_dismissed = true;
      this.dismissed_at = new Date();
      await this.save();
    }
  }

  DocumentAlert.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    document_id: {
      type: DataTypes.UUID,
      references: {
        model: 'dms_documents',
        key: 'id'
      }
    },
    request_id: {
      type: DataTypes.UUID,
      references: {
        model: 'dms_document_requests',
        key: 'id'
      }
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    alert_type: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    severity: {
      type: DataTypes.STRING(20),
      defaultValue: 'warning',
      validate: {
        isIn: [['info', 'warning', 'error', 'critical']]
      }
    },

    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT
    },

    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },

    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_dismissed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    trigger_date: {
      type: DataTypes.DATEONLY
    },
    read_at: {
      type: DataTypes.DATE
    },
    dismissed_at: {
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'DocumentAlert',
    tableName: 'dms_document_alerts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['user_id', 'is_read', 'is_dismissed'] },
      { fields: ['company_id', 'created_at'] }
    ]
  });

  return DocumentAlert;
};
