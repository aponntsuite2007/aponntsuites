const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerLegalConsent = sequelize.define('PartnerLegalConsent', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    partner_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    consent_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    consent_version: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    consent_text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    signature_hash: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    signature_data: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    ip_address: {
      type: DataTypes.STRING(45)
    },
    user_agent: {
      type: DataTypes.TEXT
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    verified_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    is_revoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    revoked_at: {
      type: DataTypes.DATE
    },
    revocation_reason: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'partner_legal_consents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return PartnerLegalConsent;
};
