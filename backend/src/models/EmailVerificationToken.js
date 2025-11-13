const { DataTypes } = require('sequelize');
const { Op } = require('sequelize');

module.exports = (sequelize) => {
  const EmailVerificationToken = sequelize.define('EmailVerificationToken', {
    token_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique token identifier'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID of the user this token belongs to'
    },
    user_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['employee', 'vendor', 'leader', 'supervisor', 'partner', 'admin']]
      },
      comment: 'Type of user (employee, vendor, leader, supervisor, partner, admin)'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true
      },
      comment: 'Email address to verify'
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'Verification token (unique string)'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Token expiration timestamp'
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when token was verified (null if not yet verified)'
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this token has been verified'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Token creation timestamp'
    }
  }, {
    tableName: 'email_verification_tokens',
    timestamps: false, // Manual handling via created_at
    underscored: true,
    indexes: [
      { fields: ['token'], unique: true },
      { fields: ['email'] },
      { fields: ['user_id', 'user_type'] },
      { fields: ['is_verified'] },
      { fields: ['expires_at'] }
    ]
  });

  /**
   * Instance Methods
   */

  /**
   * Check if token is expired
   * @returns {boolean} True if token is expired
   */
  EmailVerificationToken.prototype.isExpired = function() {
    return new Date() > this.expires_at;
  };

  /**
   * Mark token as verified
   * @returns {Promise<EmailVerificationToken>} Updated token
   */
  EmailVerificationToken.prototype.markAsVerified = async function() {
    this.is_verified = true;
    this.verified_at = new Date();
    await this.save();
    return this;
  };

  /**
   * Get token status
   * @returns {string} Status: 'expired', 'verified', or 'valid'
   */
  EmailVerificationToken.prototype.getStatus = function() {
    if (this.is_verified) return 'verified';
    if (this.isExpired()) return 'expired';
    return 'valid';
  };

  /**
   * Class Methods
   */

  /**
   * Find a valid (not expired, not verified) token
   * @param {string} token - Token string to find
   * @returns {Promise<EmailVerificationToken|null>} Token if found and valid
   */
  EmailVerificationToken.findValidToken = async function(token) {
    return await this.findOne({
      where: {
        token,
        is_verified: false,
        expires_at: { [Op.gt]: new Date() }
      }
    });
  };

  /**
   * Cleanup expired tokens older than N days
   * @param {number} daysOld - Delete tokens older than this many days (default: 7)
   * @returns {Promise<number>} Number of deleted tokens
   */
  EmailVerificationToken.cleanupExpired = async function(daysOld = 7) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await this.destroy({
      where: {
        is_verified: false,
        expires_at: { [Op.lt]: cutoffDate }
      }
    });

    return result;
  };

  /**
   * Find all tokens for a user
   * @param {number} userId - User ID
   * @param {string} userType - User type
   * @returns {Promise<EmailVerificationToken[]>} All tokens for this user
   */
  EmailVerificationToken.findByUser = async function(userId, userType) {
    return await this.findAll({
      where: {
        user_id: userId,
        user_type: userType
      },
      order: [['created_at', 'DESC']]
    });
  };

  /**
   * Find all unverified tokens for a user
   * @param {number} userId - User ID
   * @param {string} userType - User type
   * @returns {Promise<EmailVerificationToken[]>} Unverified tokens
   */
  EmailVerificationToken.findUnverifiedByUser = async function(userId, userType) {
    return await this.findAll({
      where: {
        user_id: userId,
        user_type: userType,
        is_verified: false,
        expires_at: { [Op.gt]: new Date() }
      },
      order: [['created_at', 'DESC']]
    });
  };

  /**
   * Invalidate all tokens for a user (mark as verified to prevent use)
   * @param {number} userId - User ID
   * @param {string} userType - User type
   * @returns {Promise<number>} Number of invalidated tokens
   */
  EmailVerificationToken.invalidateUserTokens = async function(userId, userType) {
    const [affectedCount] = await this.update(
      {
        is_verified: true,
        verified_at: new Date()
      },
      {
        where: {
          user_id: userId,
          user_type: userType,
          is_verified: false
        }
      }
    );

    return affectedCount;
  };

  return EmailVerificationToken;
};
