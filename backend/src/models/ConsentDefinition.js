const { DataTypes } = require('sequelize');
const { Op } = require('sequelize');

module.exports = (sequelize) => {
  const ConsentDefinition = sequelize.define('ConsentDefinition', {
    consent_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique consent definition identifier'
    },
    consent_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Unique key identifier (e.g., "biometric_data_consent", "gdpr_consent")'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Consent title (user-facing)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Short description of what this consent covers'
    },
    full_text: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Full legal text of the consent'
    },
    version: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '1.0',
      comment: 'Version number (auto-incremented on updates)'
    },
    applicable_roles: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
      comment: 'Array of roles this consent applies to (["employee", "vendor", "partner"])'
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this consent is mandatory (blocking registration if not accepted)'
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['data_protection', 'biometric', 'employment', 'medical', 'safety', 'privacy', 'marketing', 'legal', 'custom']]
      },
      comment: 'Consent category for grouping'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this consent is currently active'
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
    tableName: 'consent_definitions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      { fields: ['consent_key'], unique: true },
      { fields: ['category'] },
      { fields: ['is_active'] },
      { fields: ['is_required'] },
      { fields: ['version'] }
    ],
    hooks: {
      /**
       * Auto-increment version on updates
       */
      beforeUpdate: (consent) => {
        // Only auto-increment if full_text or applicable_roles changed
        if (consent.changed('full_text') || consent.changed('applicable_roles')) {
          const currentVersion = parseFloat(consent.version) || 1.0;
          consent.version = (currentVersion + 0.1).toFixed(1);
        }
      }
    }
  });

  /**
   * Instance Methods
   */

  /**
   * Check if consent applies to a specific role
   * @param {string} role - Role to check (employee, vendor, partner, etc.)
   * @returns {boolean} True if consent applies to this role
   */
  ConsentDefinition.prototype.appliesToRole = function(role) {
    return this.applicable_roles && this.applicable_roles.includes(role);
  };

  /**
   * Create new version of consent with updates
   * @param {Object} updates - Fields to update in new version
   * @returns {Promise<ConsentDefinition>} New consent version
   */
  ConsentDefinition.prototype.createNewVersion = async function(updates) {
    const newVersion = parseFloat(this.version) + 1.0;

    const newConsent = await ConsentDefinition.create({
      consent_key: this.consent_key,
      title: updates.title || this.title,
      description: updates.description || this.description,
      full_text: updates.full_text || this.full_text,
      version: newVersion.toFixed(1),
      applicable_roles: updates.applicable_roles || this.applicable_roles,
      is_required: updates.is_required !== undefined ? updates.is_required : this.is_required,
      category: updates.category || this.category,
      is_active: updates.is_active !== undefined ? updates.is_active : this.is_active
    });

    return newConsent;
  };

  /**
   * Get consent summary for display
   * @returns {Object} Summary object
   */
  ConsentDefinition.prototype.getSummary = function() {
    return {
      consent_id: this.consent_id,
      consent_key: this.consent_key,
      title: this.title,
      version: this.version,
      category: this.category,
      is_required: this.is_required,
      is_active: this.is_active
    };
  };

  /**
   * Class Methods
   */

  /**
   * Get all active consents for a specific role
   * @param {string} role - Role to filter by
   * @returns {Promise<ConsentDefinition[]>} Active consents for this role
   */
  ConsentDefinition.getActiveForRole = async function(role) {
    return await this.findAll({
      where: {
        is_active: true,
        applicable_roles: { [Op.contains]: [role] }
      },
      order: [['created_at', 'ASC']]
    });
  };

  /**
   * Get all required consents for a specific role
   * @param {string} role - Role to filter by
   * @returns {Promise<ConsentDefinition[]>} Required consents for this role
   */
  ConsentDefinition.getRequiredForRole = async function(role) {
    return await this.findAll({
      where: {
        is_active: true,
        is_required: true,
        applicable_roles: { [Op.contains]: [role] }
      },
      order: [['created_at', 'ASC']]
    });
  };

  /**
   * Get all versions of a consent by key
   * @param {string} consentKey - Consent key
   * @returns {Promise<ConsentDefinition[]>} All versions of this consent
   */
  ConsentDefinition.getVersionHistory = async function(consentKey) {
    return await this.findAll({
      where: { consent_key: consentKey },
      order: [['version', 'DESC']]
    });
  };

  /**
   * Get latest version of a consent by key
   * @param {string} consentKey - Consent key
   * @returns {Promise<ConsentDefinition|null>} Latest version of consent
   */
  ConsentDefinition.getLatestVersion = async function(consentKey) {
    return await this.findOne({
      where: { consent_key: consentKey },
      order: [['version', 'DESC']]
    });
  };

  /**
   * Get all consents by category
   * @param {string} category - Category to filter by
   * @returns {Promise<ConsentDefinition[]>} Consents in this category
   */
  ConsentDefinition.getByCategory = async function(category) {
    return await this.findAll({
      where: {
        category,
        is_active: true
      },
      order: [['created_at', 'ASC']]
    });
  };

  /**
   * Get consent by key (latest active version)
   * @param {string} consentKey - Consent key
   * @returns {Promise<ConsentDefinition|null>} Consent definition
   */
  ConsentDefinition.findByKey = async function(consentKey) {
    return await this.findOne({
      where: {
        consent_key: consentKey,
        is_active: true
      },
      order: [['version', 'DESC']]
    });
  };

  return ConsentDefinition;
};
