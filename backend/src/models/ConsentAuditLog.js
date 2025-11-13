const { DataTypes } = require('sequelize');
const { Op } = require('sequelize');

module.exports = (sequelize) => {
  const ConsentAuditLog = sequelize.define('ConsentAuditLog', {
    audit_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique audit log identifier'
    },
    user_consent_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'user_consents',
        key: 'user_consent_id'
      },
      comment: 'Foreign key to user_consents table'
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['created', 'accepted', 'rejected', 'revoked', 'updated']]
      },
      comment: 'Action performed on the consent'
    },
    old_status: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Previous status before this action (null for creation)'
    },
    new_status: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'New status after this action'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP address from which action was performed (IPv4/IPv6)'
    },
    changed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User ID who performed this action (null if self-action)'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes about this action (reasons, context, etc.)'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Timestamp when this audit log entry was created'
    }
  }, {
    tableName: 'consent_audit_log',
    timestamps: false, // Manual handling via created_at
    underscored: true,
    indexes: [
      { fields: ['user_consent_id'] },
      { fields: ['action'] },
      { fields: ['created_at'] },
      { fields: ['changed_by'] },
      // Composite index for common queries
      { fields: ['user_consent_id', 'created_at'] }
    ]
  });

  /**
   * Instance Methods
   */

  /**
   * Get formatted audit entry
   * @returns {Object} Formatted audit log entry
   */
  ConsentAuditLog.prototype.getFormattedEntry = function() {
    return {
      audit_id: this.audit_id,
      user_consent_id: this.user_consent_id,
      action: this.action,
      status_change: this.old_status
        ? `${this.old_status} → ${this.new_status}`
        : this.new_status,
      ip_address: this.ip_address,
      changed_by: this.changed_by,
      notes: this.notes,
      created_at: this.created_at
    };
  };

  /**
   * Check if this was a status change
   * @returns {boolean} True if status changed
   */
  ConsentAuditLog.prototype.isStatusChange = function() {
    return this.old_status !== null && this.old_status !== this.new_status;
  };

  /**
   * Class Methods
   */

  /**
   * Log an action on a user consent
   * @param {string} userConsentId - User consent ID
   * @param {string} action - Action performed
   * @param {Object} metadata - Additional metadata
   * @param {string} metadata.old_status - Previous status
   * @param {string} metadata.new_status - New status
   * @param {string} metadata.ip_address - IP address
   * @param {number} metadata.changed_by - User ID who made the change
   * @param {string} metadata.notes - Additional notes
   * @returns {Promise<ConsentAuditLog>} Created audit log entry
   */
  ConsentAuditLog.logAction = async function(userConsentId, action, metadata = {}) {
    return await this.create({
      user_consent_id: userConsentId,
      action,
      old_status: metadata.old_status || null,
      new_status: metadata.new_status || null,
      ip_address: metadata.ip_address || null,
      changed_by: metadata.changed_by || null,
      notes: metadata.notes || null
    });
  };

  /**
   * Get full audit trail for a user consent
   * @param {string} userConsentId - User consent ID
   * @returns {Promise<ConsentAuditLog[]>} All audit log entries for this consent
   */
  ConsentAuditLog.getAuditTrail = async function(userConsentId) {
    return await this.findAll({
      where: { user_consent_id: userConsentId },
      order: [['created_at', 'DESC']]
    });
  };

  /**
   * Get audit logs by action type
   * @param {string} action - Action to filter by
   * @param {Object} options - Additional options
   * @param {Date} options.startDate - Start date filter
   * @param {Date} options.endDate - End date filter
   * @param {number} options.limit - Max results to return
   * @returns {Promise<ConsentAuditLog[]>} Filtered audit logs
   */
  ConsentAuditLog.getByAction = async function(action, options = {}) {
    const where = { action };

    if (options.startDate) {
      where.created_at = { [Op.gte]: options.startDate };
    }

    if (options.endDate) {
      if (where.created_at) {
        where.created_at[Op.lte] = options.endDate;
      } else {
        where.created_at = { [Op.lte]: options.endDate };
      }
    }

    return await this.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: options.limit || 1000
    });
  };

  /**
   * Get audit logs by user who made changes
   * @param {number} changedBy - User ID
   * @param {Object} options - Additional options
   * @returns {Promise<ConsentAuditLog[]>} Audit logs for this user
   */
  ConsentAuditLog.getByChangedBy = async function(changedBy, options = {}) {
    return await this.findAll({
      where: { changed_by: changedBy },
      order: [['created_at', 'DESC']],
      limit: options.limit || 1000
    });
  };

  /**
   * Get recent audit activity
   * @param {number} hours - Number of hours to look back (default: 24)
   * @param {number} limit - Max results (default: 100)
   * @returns {Promise<ConsentAuditLog[]>} Recent audit logs
   */
  ConsentAuditLog.getRecentActivity = async function(hours = 24, limit = 100) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return await this.findAll({
      where: {
        created_at: { [Op.gte]: since }
      },
      order: [['created_at', 'DESC']],
      limit
    });
  };

  /**
   * Get audit statistics for a time period
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Audit statistics
   */
  ConsentAuditLog.getStatistics = async function(startDate, endDate) {
    const where = {};

    if (startDate && endDate) {
      where.created_at = {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      };
    } else if (startDate) {
      where.created_at = { [Op.gte]: startDate };
    } else if (endDate) {
      where.created_at = { [Op.lte]: endDate };
    }

    const [created, accepted, rejected, revoked, updated] = await Promise.all([
      this.count({ where: { ...where, action: 'created' } }),
      this.count({ where: { ...where, action: 'accepted' } }),
      this.count({ where: { ...where, action: 'rejected' } }),
      this.count({ where: { ...where, action: 'revoked' } }),
      this.count({ where: { ...where, action: 'updated' } })
    ]);

    const total = created + accepted + rejected + revoked + updated;

    return {
      total,
      by_action: {
        created,
        accepted,
        rejected,
        revoked,
        updated
      },
      period: {
        start: startDate,
        end: endDate
      }
    };
  };

  /**
   * Delete old audit logs (cleanup)
   * @param {number} daysToKeep - Keep logs newer than this many days (default: 365)
   * @returns {Promise<number>} Number of deleted logs
   */
  ConsentAuditLog.cleanupOldLogs = async function(daysToKeep = 365) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await this.destroy({
      where: {
        created_at: { [Op.lt]: cutoffDate }
      }
    });

    return result;
  };

  return ConsentAuditLog;
};
