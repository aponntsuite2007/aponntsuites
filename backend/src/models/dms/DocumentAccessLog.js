'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class DocumentAccessLog extends Model {
    static associate(models) {
      DocumentAccessLog.belongsTo(models.Document, {
        foreignKey: 'document_id',
        as: 'document'
      });

      DocumentAccessLog.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }

    // Acciones válidas
    static get ACTIONS() {
      return {
        VIEW: 'view',
        DOWNLOAD: 'download',
        PRINT: 'print',
        SHARE: 'share',
        EDIT: 'edit',
        SIGN: 'sign',
        APPROVE: 'approve',
        REJECT: 'reject',
        UPLOAD: 'upload',
        DELETE: 'delete',
        RESTORE: 'restore',
        CHECKOUT: 'checkout',
        CHECKIN: 'checkin',
        LOCK: 'lock',
        UNLOCK: 'unlock',
        EXPORT: 'export',
        METADATA_UPDATE: 'metadata_update',
        STATUS_CHANGE: 'status_change',
        PERMISSION_CHANGE: 'permission_change'
      };
    }

    // Método estático para crear log (acepta snake_case y camelCase)
    static async logAction(data, transaction = null) {
      return await DocumentAccessLog.create({
        document_id: data.documentId || data.document_id,
        document_version: data.version || data.version_number,
        company_id: data.companyId || data.company_id,
        user_id: data.userId || data.user_id,
        user_name: data.userName || data.user_name,
        user_role: data.userRole || data.user_role,
        action: data.action,
        action_detail: data.detail || data.details ? JSON.stringify(data.detail || data.details) : null,
        ip_address: data.ipAddress || data.ip_address,
        user_agent: data.userAgent || data.user_agent,
        session_id: data.sessionId || data.session_id,
        device_type: data.deviceType || data.device_type,
        success: data.success !== false,
        error_message: data.errorMessage || data.error_message
      }, { transaction });
    }
  }

  DocumentAccessLog.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    document_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    document_version: {
      type: DataTypes.INTEGER
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    // Usuario
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    user_name: {
      type: DataTypes.STRING(255)
    },
    user_role: {
      type: DataTypes.STRING(50)
    },

    // Acción
    action: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    action_detail: {
      type: DataTypes.TEXT
    },

    // Contexto
    ip_address: {
      type: DataTypes.STRING(45)
    },
    user_agent: {
      type: DataTypes.TEXT
    },
    session_id: {
      type: DataTypes.STRING(100)
    },
    device_type: {
      type: DataTypes.STRING(20)
    },

    // Resultado
    success: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    error_message: {
      type: DataTypes.TEXT
    }
  }, {
    sequelize,
    modelName: 'DocumentAccessLog',
    tableName: 'dms_access_log',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['document_id', 'created_at'] },
      { fields: ['user_id', 'created_at'] },
      { fields: ['company_id', 'created_at'] },
      { fields: ['action', 'created_at'] }
    ]
  });

  return DocumentAccessLog;
};
