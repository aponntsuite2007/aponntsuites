const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerDocument = sequelize.define('PartnerDocument', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    partner_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    document_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    document_url: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    file_name: {
      type: DataTypes.STRING(255)
    },
    file_size: {
      type: DataTypes.INTEGER
    },
    mime_type: {
      type: DataTypes.STRING(100)
    },
    expiry_date: {
      type: DataTypes.DATE
    },
    verification_status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending'
    },
    verified_by: {
      type: DataTypes.INTEGER
    },
    verified_at: {
      type: DataTypes.DATE
    },
    rejection_reason: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'partner_documents',
    timestamps: true,
    createdAt: 'uploaded_at',
    updatedAt: false
  });

  return PartnerDocument;
};
