/**
 * ⚖️ MODELO: BIOMETRIC CONSENT (SEQUELIZE)
 * ========================================
 * Modelo para consentimientos legales
 * Cumplimiento Ley 25.326
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BiometricConsent = sequelize.define('BiometricConsent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id'
  },

  userId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'user_id'
  },

  consentType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'consent_type'
  },

  consentGiven: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    field: 'consent_given'
  },

  consentDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'consent_date'
  },

  consentText: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'consent_text'
  },

  consentVersion: {
    type: DataTypes.STRING(20),
    defaultValue: '1.0',
    field: 'consent_version'
  },

  // Trazabilidad
  ipAddress: {
    type: DataTypes.STRING(45),
    field: 'ip_address'
  },

  userAgent: {
    type: DataTypes.TEXT,
    field: 'user_agent'
  },

  acceptanceMethod: {
    type: DataTypes.STRING(50),
    field: 'acceptance_method'
  },

  // Revocación
  revoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  revokedDate: {
    type: DataTypes.DATE,
    field: 'revoked_date'
  },

  revokedReason: {
    type: DataTypes.TEXT,
    field: 'revoked_reason'
  },

  revokedIpAddress: {
    type: DataTypes.STRING(45),
    field: 'revoked_ip_address'
  },

  expiresAt: {
    type: DataTypes.DATE,
    field: 'expires_at'
  }

}, {
  tableName: 'biometric_consents',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_consents_active',
      fields: ['company_id', 'user_id', 'consent_type'],
      where: { revoked: false }
    }
  ]
});

module.exports = BiometricConsent;
