const { DataTypes } = require('sequelize');
const { Op } = require('sequelize');

module.exports = (sequelize) => {
  const UserConsent = sequelize.define('UserConsent', {
    user_consent_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique user consent record identifier'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID of the user who gave/rejected consent'
    },
    user_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['employee', 'vendor', 'leader', 'supervisor', 'partner', 'admin']]
      },
      comment: 'Type of user (employee, vendor, leader, supervisor, partner, admin)'
    },
    consent_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'consent_definitions',
        key: 'consent_id'
      },
      comment: 'Foreign key to consent_definitions table'
    },
    consent_version: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Version of consent accepted/rejected (snapshot for audit)'
    },
    accepted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when consent was accepted (null if not accepted)'
    },
    rejected_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when consent was rejected (null if not rejected)'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'accepted', 'rejected', 'revoked']]
      },
      comment: 'Current consent status'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP address from which consent action was taken (IPv4/IPv6)'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Browser user agent string (for audit trail)'
    },
    signature_data: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Digital signature or additional verification data (JSON or base64)'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes (e.g., rejection reason, revocation reason)'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Creation timestamp'
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
      comment: 'Last update timestamp'
    }
  }, {
    tableName: 'user_consents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      { fields: ['user_id', 'user_type'] },
      { fields: ['consent_id'] },
      { fields: ['status'] },
      { fields: ['accepted_at'] },
      { fields: ['rejected_at'] },
      // Composite index for common queries
      { fields: ['user_id', 'consent_id', 'status'] }
    ]
  });

  /**
   * Instance Methods
   */

  /**
   * Accept this consent
   * @param {Object} metadata - Metadata about the acceptance
   * @param {string} metadata.ip_address - IP address
   * @param {string} metadata.user_agent - User agent
   * @param {string} metadata.signature_data - Signature data
   * @returns {Promise<UserConsent>} Updated consent
   */
  UserConsent.prototype.accept = async function(metadata = {}) {
    this.status = 'accepted';
    this.accepted_at = new Date();
    this.rejected_at = null;

    if (metadata.ip_address) this.ip_address = metadata.ip_address;
    if (metadata.user_agent) this.user_agent = metadata.user_agent;
    if (metadata.signature_data) this.signature_data = metadata.signature_data;

    await this.save();
    return this;
  };

  /**
   * Reject this consent
   * @param {string|null} reason - Rejection reason
   * @param {Object} metadata - Metadata about the rejection
   * @param {string} metadata.ip_address - IP address
   * @param {string} metadata.user_agent - User agent
   * @returns {Promise<UserConsent>} Updated consent
   */
  UserConsent.prototype.reject = async function(reason = null, metadata = {}) {
    this.status = 'rejected';
    this.rejected_at = new Date();
    this.accepted_at = null;

    if (reason) this.notes = reason;
    if (metadata.ip_address) this.ip_address = metadata.ip_address;
    if (metadata.user_agent) this.user_agent = metadata.user_agent;

    await this.save();
    return this;
  };

  /**
   * Revoke previously accepted consent
   * @param {string|null} reason - Revocation reason
   * @returns {Promise<UserConsent>} Updated consent
   */
  UserConsent.prototype.revoke = async function(reason = null) {
    this.status = 'revoked';

    if (reason) {
      this.notes = this.notes
        ? `${this.notes}\n\nRevocation reason: ${reason}`
        : `Revocation reason: ${reason}`;
    }

    await this.save();
    return this;
  };

  /**
   * Check if consent is currently active (accepted and not revoked)
   * @returns {boolean} True if consent is active
   */
  UserConsent.prototype.isActive = function() {
    return this.status === 'accepted';
  };

  /**
   * Get consent summary
   * @returns {Object} Summary object
   */
  UserConsent.prototype.getSummary = function() {
    return {
      user_consent_id: this.user_consent_id,
      user_id: this.user_id,
      user_type: this.user_type,
      consent_id: this.consent_id,
      consent_version: this.consent_version,
      status: this.status,
      accepted_at: this.accepted_at,
      rejected_at: this.rejected_at,
      created_at: this.created_at
    };
  };

  /**
   * Class Methods
   */

  /**
   * Get all pending consents for a user
   * @param {number} userId - User ID
   * @param {string} userType - User type
   * @returns {Promise<UserConsent[]>} Pending consents
   */
  UserConsent.getPendingForUser = async function(userId, userType) {
    return await this.findAll({
      where: {
        user_id: userId,
        user_type: userType,
        status: 'pending'
      },
      order: [['created_at', 'ASC']]
    });
  };

  /**
   * Get all accepted consents for a user
   * @param {number} userId - User ID
   * @param {string} userType - User type
   * @returns {Promise<UserConsent[]>} Accepted consents
   */
  UserConsent.getAcceptedForUser = async function(userId, userType) {
    return await this.findAll({
      where: {
        user_id: userId,
        user_type: userType,
        status: 'accepted'
      },
      order: [['accepted_at', 'DESC']]
    });
  };

  /**
   * Get all consents for a user (any status)
   * @param {number} userId - User ID
   * @param {string} userType - User type
   * @returns {Promise<UserConsent[]>} All consents
   */
  UserConsent.getAllForUser = async function(userId, userType) {
    return await this.findAll({
      where: {
        user_id: userId,
        user_type: userType
      },
      order: [['created_at', 'DESC']]
    });
  };

  /**
   * Check if user has accepted a specific consent
   * @param {number} userId - User ID
   * @param {string} userType - User type
   * @param {string} consentId - Consent definition ID
   * @returns {Promise<boolean>} True if user has accepted this consent
   */
  UserConsent.hasUserAccepted = async function(userId, userType, consentId) {
    const consent = await this.findOne({
      where: {
        user_id: userId,
        user_type: userType,
        consent_id: consentId,
        status: 'accepted'
      }
    });

    return !!consent;
  };

  /**
   * Get acceptance rate for a consent definition
   * @param {string} consentId - Consent definition ID
   * @returns {Promise<Object>} Acceptance statistics
   */
  UserConsent.getAcceptanceRate = async function(consentId) {
    const total = await this.count({
      where: { consent_id: consentId }
    });

    const accepted = await this.count({
      where: {
        consent_id: consentId,
        status: 'accepted'
      }
    });

    const rejected = await this.count({
      where: {
        consent_id: consentId,
        status: 'rejected'
      }
    });

    const pending = await this.count({
      where: {
        consent_id: consentId,
        status: 'pending'
      }
    });

    const revoked = await this.count({
      where: {
        consent_id: consentId,
        status: 'revoked'
      }
    });

    return {
      total,
      accepted,
      rejected,
      pending,
      revoked,
      acceptance_rate: total > 0 ? ((accepted / total) * 100).toFixed(2) : 0
    };
  };

  /**
   * Get user consent for a specific consent definition
   * @param {number} userId - User ID
   * @param {string} userType - User type
   * @param {string} consentId - Consent definition ID
   * @returns {Promise<UserConsent|null>} User consent record
   */
  UserConsent.findByUserAndConsent = async function(userId, userType, consentId) {
    return await this.findOne({
      where: {
        user_id: userId,
        user_type: userType,
        consent_id: consentId
      },
      order: [['created_at', 'DESC']]
    });
  };

  /**
   * Get consents by status
   * @param {string} status - Status to filter by
   * @param {Object} options - Additional query options
   * @returns {Promise<UserConsent[]>} Consents with this status
   */
  UserConsent.getByStatus = async function(status, options = {}) {
    const where = { status };

    if (options.consentId) where.consent_id = options.consentId;
    if (options.userType) where.user_type = options.userType;

    return await this.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: options.limit || 100
    });
  };

  return UserConsent;
};
