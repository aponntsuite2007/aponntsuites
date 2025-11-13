const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const Partner = sequelize.define('Partner', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    partner_role_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    first_name: {
      type: DataTypes.STRING(100)
    },
    last_name: {
      type: DataTypes.STRING(100)
    },
    phone: {
      type: DataTypes.STRING(20)
    },
    mobile: {
      type: DataTypes.STRING(20)
    },
    profile_photo_url: {
      type: DataTypes.TEXT
    },
    bio: {
      type: DataTypes.TEXT
    },
    languages: {
      type: DataTypes.JSONB
    },
    professional_licenses: {
      type: DataTypes.JSONB
    },
    education: {
      type: DataTypes.JSONB
    },
    certifications: {
      type: DataTypes.JSONB
    },
    experience_years: {
      type: DataTypes.INTEGER
    },
    specialties: {
      type: DataTypes.JSONB
    },
    contract_type: {
      type: DataTypes.STRING(50),
      defaultValue: 'per_service'
    },
    commission_calculation: {
      type: DataTypes.STRING(50),
      defaultValue: 'per_module_user'
    },
    commission_percentage: {
      type: DataTypes.DECIMAL(5, 2)
    },
    fixed_monthly_rate: {
      type: DataTypes.DECIMAL(10, 2)
    },
    fixed_per_employee_rate: {
      type: DataTypes.DECIMAL(10, 2)
    },
    city: {
      type: DataTypes.STRING(100)
    },
    province: {
      type: DataTypes.STRING(100)
    },
    country: {
      type: DataTypes.STRING(100)
    },
    service_area: {
      type: DataTypes.JSONB
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.00
    },
    total_reviews: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_services: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    // Email verification (MANDATORY since 2025-11-01)
    email_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'email_verified'
    },
    verification_pending: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'verification_pending'
    },
    account_status: {
      type: DataTypes.ENUM('pending_verification', 'active', 'suspended', 'inactive'),
      allowNull: false,
      defaultValue: 'pending_verification',
      field: 'account_status'
    },
    email_verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'email_verified_at'
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false  // CHANGED: Default to false - activated only after email verification
    },
    approved_at: {
      type: DataTypes.DATE
    },
    approved_by: {
      type: DataTypes.INTEGER
    }
  }, {
    tableName: 'partners',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Partner.prototype.validatePassword = function(password) {
    return bcrypt.compare(password, this.password_hash);
  };

  return Partner;
};
