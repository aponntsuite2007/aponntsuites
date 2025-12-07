'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class DocumentVersion extends Model {
    static associate(models) {
      DocumentVersion.belongsTo(models.Document, {
        foreignKey: 'document_id',
        as: 'document'
      });

      DocumentVersion.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });
    }
  }

  DocumentVersion.init({
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
    version_number: {
      type: DataTypes.INTEGER,
      allowNull: false
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
    checksum_sha256: {
      type: DataTypes.STRING(64),
      allowNull: false
    },

    // Cambios
    change_summary: {
      type: DataTypes.TEXT
    },
    changed_fields: {
      type: DataTypes.JSONB
    },

    // Auditoría
    created_by: {
      type: DataTypes.UUID,
      allowNull: false
    },
    created_from_ip: {
      type: DataTypes.STRING(45)
    }
  }, {
    sequelize,
    modelName: 'DocumentVersion',
    tableName: 'dms_document_versions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['document_id', 'version_number']
      }
    ]
  });

  return DocumentVersion;
};
