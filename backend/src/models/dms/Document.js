'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Document extends Model {
    static associate(models) {
      // Relaciones
      Document.belongsTo(models.User, {
        foreignKey: 'owner_id',
        as: 'owner'
      });

      Document.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });

      Document.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company'
      });

      Document.belongsTo(models.Folder, {
        foreignKey: 'folder_id',
        as: 'folder'
      });

      Document.belongsTo(Document, {
        foreignKey: 'parent_document_id',
        as: 'parentDocument'
      });

      Document.hasMany(models.DocumentVersion, {
        foreignKey: 'document_id',
        as: 'versions'
      });

      Document.hasMany(models.DocumentMetadata, {
        foreignKey: 'document_id',
        as: 'metadata'
      });

      Document.hasMany(models.DocumentPermission, {
        foreignKey: 'document_id',
        as: 'permissions'
      });

      Document.hasMany(models.DocumentAccessLog, {
        foreignKey: 'document_id',
        as: 'accessLogs'
      });
    }

    // Métodos de instancia
    async incrementViewCount(userId) {
      this.view_count = (this.view_count || 0) + 1;
      this.last_accessed_at = new Date();
      this.last_accessed_by = userId;
      await this.save();
    }

    async incrementDownloadCount() {
      this.download_count = (this.download_count || 0) + 1;
      await this.save();
    }

    isEditable() {
      return !this.is_locked &&
             !this.is_deleted &&
             !['LOCKED', 'DELETED', 'ARCHIVED'].includes(this.status);
    }

    isExpiringSoon(daysThreshold = 30) {
      if (!this.expiration_date) return false;
      const now = new Date();
      const expirationDate = new Date(this.expiration_date);
      const diffDays = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= daysThreshold;
    }

    isExpired() {
      if (!this.expiration_date) return false;
      return new Date(this.expiration_date) < new Date();
    }

    toJSON() {
      const values = { ...this.get() };
      // Agregar campos calculados
      values.is_editable = this.isEditable();
      values.is_expiring_soon = this.isExpiringSoon();
      values.is_expired = this.isExpired();
      return values;
    }
  }

  Document.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    // Identificación
    document_number: {
      type: DataTypes.STRING(50),
      unique: true
    },
    external_reference: {
      type: DataTypes.STRING(100)
    },

    // Clasificación
    category_code: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    type_code: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    folder_id: {
      type: DataTypes.UUID,
      references: {
        model: 'dms_folders',
        key: 'id'
      }
    },
    parent_document_id: {
      type: DataTypes.UUID,
      references: {
        model: 'dms_documents',
        key: 'id'
      }
    },

    // Información básica
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },

    // Archivo
    original_filename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    stored_filename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    storage_path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    file_size_bytes: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    file_extension: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    checksum_sha256: {
      type: DataTypes.STRING(64),
      allowNull: false
    },

    // Propietario
    owner_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'user'
    },
    owner_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    owner_name: {
      type: DataTypes.STRING(255)
    },

    // Origen
    source_module: {
      type: DataTypes.STRING(50)
    },
    source_entity_type: {
      type: DataTypes.STRING(50)
    },
    source_entity_id: {
      type: DataTypes.UUID
    },

    // Estado
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'DRAFT'
    },
    previous_status: {
      type: DataTypes.STRING(30)
    },
    status_changed_at: {
      type: DataTypes.DATE
    },
    status_changed_by: {
      type: DataTypes.UUID
    },
    status_reason: {
      type: DataTypes.TEXT
    },

    // Versionamiento
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    is_current_version: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    superseded_by_id: {
      type: DataTypes.UUID
    },
    supersedes_id: {
      type: DataTypes.UUID
    },
    version_notes: {
      type: DataTypes.TEXT
    },

    // Fechas
    issue_date: {
      type: DataTypes.DATEONLY
    },
    effective_date: {
      type: DataTypes.DATEONLY
    },
    expiration_date: {
      type: DataTypes.DATEONLY
    },
    expiration_alert_days: {
      type: DataTypes.INTEGER,
      defaultValue: 30
    },
    last_expiration_alert_at: {
      type: DataTypes.DATE
    },

    // Firma
    requires_signature: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_signed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    signature_data: {
      type: DataTypes.JSONB
    },
    signed_by: {
      type: DataTypes.UUID
    },
    signed_at: {
      type: DataTypes.DATE
    },
    signature_ip: {
      type: DataTypes.STRING(45)
    },

    // Seguridad
    visibility: {
      type: DataTypes.STRING(20),
      defaultValue: 'private'
    },
    is_confidential: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_sensitive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    access_level: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },

    // Bloqueo
    is_locked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    locked_at: {
      type: DataTypes.DATE
    },
    locked_by: {
      type: DataTypes.UUID
    },
    locked_reason: {
      type: DataTypes.TEXT
    },
    lock_expires_at: {
      type: DataTypes.DATE
    },

    // Check-out
    is_checked_out: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    checked_out_by: {
      type: DataTypes.UUID
    },
    checked_out_at: {
      type: DataTypes.DATE
    },
    checkout_expires_at: {
      type: DataTypes.DATE
    },

    // Búsqueda
    content_text: {
      type: DataTypes.TEXT
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },

    // Retención
    retention_until: {
      type: DataTypes.DATEONLY
    },
    disposal_action: {
      type: DataTypes.STRING(20)
    },
    disposal_date: {
      type: DataTypes.DATEONLY
    },

    // Auditoría
    created_by: {
      type: DataTypes.UUID,
      allowNull: false
    },
    updated_by: {
      type: DataTypes.UUID
    },

    // Soft delete
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    deleted_by: {
      type: DataTypes.UUID
    },
    deleted_at: {
      type: DataTypes.DATE
    },
    deletion_reason: {
      type: DataTypes.TEXT
    },

    // Métricas
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    download_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    share_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    last_accessed_at: {
      type: DataTypes.DATE
    },
    last_accessed_by: {
      type: DataTypes.UUID
    }
  }, {
    sequelize,
    modelName: 'Document',
    tableName: 'dms_documents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: false,
    indexes: [
      { fields: ['company_id'] },
      { fields: ['owner_type', 'owner_id'] },
      { fields: ['category_code', 'type_code'] },
      { fields: ['status'] },
      { fields: ['expiration_date'] },
      { fields: ['source_module', 'source_entity_type', 'source_entity_id'] },
      { fields: ['folder_id'] }
    ]
  });

  return Document;
};
