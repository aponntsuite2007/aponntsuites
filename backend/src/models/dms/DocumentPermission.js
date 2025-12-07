'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class DocumentPermission extends Model {
    static associate(models) {
      DocumentPermission.belongsTo(models.Document, {
        foreignKey: 'document_id',
        as: 'document'
      });

      DocumentPermission.belongsTo(models.User, {
        foreignKey: 'grantee_id',
        as: 'grantee'
      });

      DocumentPermission.belongsTo(models.User, {
        foreignKey: 'granted_by',
        as: 'granter'
      });
    }

    // Niveles de permiso predefinidos
    static get LEVELS() {
      return {
        VIEW: 'view',
        DOWNLOAD: 'download',
        EDIT: 'edit',
        SIGN: 'sign',
        APPROVE: 'approve',
        MANAGE: 'manage'
      };
    }

    // Obtener permisos por nivel
    static getPermissionsByLevel(level) {
      const permissions = {
        can_view: false,
        can_download: false,
        can_edit: false,
        can_sign: false,
        can_approve: false,
        can_share: false,
        can_delete: false
      };

      switch (level) {
        case 'manage':
          permissions.can_delete = true;
          permissions.can_share = true;
          // fall through
        case 'approve':
          permissions.can_approve = true;
          // fall through
        case 'sign':
          permissions.can_sign = true;
          // fall through
        case 'edit':
          permissions.can_edit = true;
          // fall through
        case 'download':
          permissions.can_download = true;
          // fall through
        case 'view':
          permissions.can_view = true;
          break;
      }

      return permissions;
    }

    // Verificar si el permiso está activo
    isActive() {
      if (!this.is_active) return false;
      if (this.valid_until && new Date(this.valid_until) < new Date()) return false;
      if (this.valid_from && new Date(this.valid_from) > new Date()) return false;
      return true;
    }
  }

  DocumentPermission.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    document_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'dms_documents',
        key: 'id'
      }
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    // Destinatario
    grantee_type: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    grantee_id: {
      type: DataTypes.UUID
    },
    grantee_role: {
      type: DataTypes.STRING(50)
    },

    // Nivel
    permission_level: {
      type: DataTypes.STRING(20),
      allowNull: false
    },

    // Permisos específicos
    can_view: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    can_download: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    can_edit: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    can_sign: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    can_approve: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    can_share: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    can_delete: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // Vigencia
    valid_from: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    valid_until: {
      type: DataTypes.DATE
    },

    // Auditoría
    granted_by: {
      type: DataTypes.UUID,
      allowNull: false
    },
    granted_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    revoked_by: {
      type: DataTypes.UUID
    },
    revoked_at: {
      type: DataTypes.DATE
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'DocumentPermission',
    tableName: 'dms_document_permissions',
    timestamps: false,
    indexes: [
      { fields: ['document_id', 'grantee_type', 'grantee_id'] }
    ],
    hooks: {
      beforeCreate: (permission) => {
        // Aplicar permisos según nivel
        const levelPermissions = DocumentPermission.getPermissionsByLevel(permission.permission_level);
        Object.assign(permission, levelPermissions);
      }
    }
  });

  return DocumentPermission;
};
