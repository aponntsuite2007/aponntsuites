const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupplierCommunicationAttachment = sequelize.define('SupplierCommunicationAttachment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    communication_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'supplier_communications',
        key: 'id'
      }
    },

    // ARCHIVO
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    original_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    file_path: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 52428800 // 50 MB
      }
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false
    },

    // METADATA
    uploaded_by_type: {
      type: DataTypes.ENUM('company', 'supplier'),
      allowNull: false
    },
    uploaded_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'supplier_communication_attachments',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['communication_id'] }
    ]
  });

  return SupplierCommunicationAttachment;
};
