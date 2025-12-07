'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class DocumentMetadata extends Model {
    static associate(models) {
      DocumentMetadata.belongsTo(models.Document, {
        foreignKey: 'document_id',
        as: 'document'
      });
    }

    // Convertir valor según tipo
    getValue() {
      if (!this.metadata_value) return null;

      switch (this.data_type) {
        case 'number':
          return parseFloat(this.metadata_value);
        case 'integer':
          return parseInt(this.metadata_value, 10);
        case 'boolean':
          return this.metadata_value === 'true' || this.metadata_value === '1';
        case 'date':
          return new Date(this.metadata_value);
        case 'json':
          try {
            return JSON.parse(this.metadata_value);
          } catch {
            return this.metadata_value;
          }
        default:
          return this.metadata_value;
      }
    }

    // Establecer valor con tipo
    static formatValue(value, dataType) {
      if (value === null || value === undefined) return null;

      switch (dataType) {
        case 'json':
          return typeof value === 'string' ? value : JSON.stringify(value);
        case 'date':
          return value instanceof Date ? value.toISOString() : value;
        case 'boolean':
          return value ? 'true' : 'false';
        default:
          return String(value);
      }
    }
  }

  DocumentMetadata.init({
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

    metadata_key: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    metadata_value: {
      type: DataTypes.TEXT
    },
    data_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'string',
      validate: {
        isIn: [['string', 'number', 'integer', 'boolean', 'date', 'json']]
      }
    },

    is_searchable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'DocumentMetadata',
    tableName: 'dms_document_metadata',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['document_id', 'metadata_key']
      },
      {
        fields: ['metadata_key', 'metadata_value'],
        where: { is_searchable: true }
      }
    ]
  });

  return DocumentMetadata;
};
