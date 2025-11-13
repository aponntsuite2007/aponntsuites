const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    user_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    employeeId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'employeeId',
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 50]
      }
    },
    legajo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'legajo',
      comment: 'Employee file number or badge number'
    },
    usuario: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 50]
      },
      comment: 'Username for login (simple name like admin, pedro, juan)'
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'firstName',
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'lastName',
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [6, 255]
      }
    },
    role: {
      type: DataTypes.ENUM('employee', 'supervisor', 'manager', 'admin', 'super_admin', 'vendor'),
      allowNull: false,
      defaultValue: 'employee',
      index: true
    },
    departmentId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id'
      },
      index: true
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'company_id',
      references: {
        model: 'companies',
        key: 'id'
      },
      index: true,
      comment: 'Company that this user belongs to'
    },
    defaultBranchId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'defaultBranchId',
      references: {
        model: 'branches',
        key: 'id'
      },
      index: true
    },
    hireDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'hireDate',
      index: true
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'birthDate'
    },
    dni: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
      index: true
    },
    cuil: {
      type: DataTypes.STRING(15),
      allowNull: true,
      unique: true,
      index: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    emergencyContact: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'emergency_contact',
      comment: 'Emergency contact information in JSON format'
    },
    salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    position: {
      type: DataTypes.STRING(100),
      allowNull: true,
      index: true
    },
    workSchedule: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      field: 'work_schedule',
      comment: 'Weekly work schedule in JSON format'
    },
    // Security and authentication
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login',
      index: true
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'failed_login_attempts'
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'locked_until'
    },
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'password_reset_token'
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'password_reset_expires'
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'two_factor_enabled',
      index: true
    },
    twoFactorSecret: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'two_factor_secret'
    },
    // Email verification (MANDATORY since 2025-11-01)
    email_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'email_verified',
      index: true,
      comment: 'Email verification is MANDATORY - account cannot be activated until verified'
    },
    verification_pending: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'verification_pending',
      comment: 'Indicates if email verification is still pending'
    },
    account_status: {
      type: DataTypes.ENUM('pending_verification', 'active', 'suspended', 'inactive'),
      allowNull: false,
      defaultValue: 'pending_verification',
      field: 'account_status',
      index: true,
      comment: 'Account status - pending_verification = cannot login until email verified'
    },
    email_verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'email_verified_at',
      comment: 'Timestamp when email was verified'
    },
    // Status and permissions
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,  // CHANGED: Default to false - activated only after email verification
      field: 'is_active',  // ✅ FIX: Usar is_active (snake_case) que es la columna principal en la BD
      index: true
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'User permissions in JSON format'
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'User preferences and settings'
    },
    // Late Arrival Authorization System
    can_authorize_late_arrivals: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      index: true,
      comment: 'Indica si el usuario puede autorizar llegadas fuera de tolerancia'
    },
    authorized_departments: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array de department_ids que este usuario puede autorizar (ej: [1,3,5])'
    },
    notification_preference_late_arrivals: {
      type: DataTypes.ENUM('email', 'whatsapp', 'both'),
      allowNull: false,
      defaultValue: 'email',
      comment: 'Canal preferido para recibir notificaciones de autorización'
    },
    // Kiosk and Mobile App Authorization System
    can_use_mobile_app: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      index: true,
      comment: 'Indica si el empleado puede usar app móvil para fichar'
    },
    can_use_kiosk: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      index: true,
      comment: 'Indica si el empleado puede usar kioscos físicos para fichar'
    },
    can_use_all_kiosks: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Si true, puede usar cualquier kiosko; si false, solo authorized_kiosks'
    },
    authorized_kiosks: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array de kiosk IDs autorizados para este empleado (ej: [1,3,5])'
    },
    has_flexible_schedule: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      index: true,
      comment: 'Si true, puede fichar a cualquier hora (sin restricciones de turno)'
    },
    flexible_schedule_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas sobre horario flexible (ej: "Supervisor de turno - 24/7")'
    },
    // Biometric data flags for optimization
    hasFingerprint: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'has_fingerprint',
      index: true
    },
    hasFacialData: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'has_facial_data',
      index: true
    },
    biometricLastUpdated: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'biometric_last_updated'
    },
    // Biometric photo with expiration (annual renewal)
    biometricPhotoUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'biometric_photo_url',
      comment: 'URL of visible photo captured during biometric enrollment'
    },
    biometricPhotoDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'biometric_photo_date',
      index: true,
      comment: 'Date when biometric photo was captured'
    },
    biometricPhotoExpiration: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'biometric_photo_expiration',
      index: true,
      comment: 'Expiration date for biometric photo (1 year from capture, requires renewal)'
    },
    // Location and GPS settings
    gpsEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'gps_enabled',
      index: true
    },
    allowedLocations: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      field: 'allowed_locations',
      comment: 'Allowed GPS locations for check-in/out'
    },
    // Performance tracking for high-concurrency scenarios
    concurrentSessions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'concurrent_sessions',
      comment: 'Current number of active sessions'
    },
    lastActivity: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_activity',
      index: true
    },
    // Caching fields for faster lookups
    fullName: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${this.firstName} ${this.lastName}`;
      }
    },
    displayName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'display_name',
      comment: 'Cached full name for faster queries'
    },
    // Vendor-specific fields
    vendorCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
      field: 'vendor_code',
      comment: 'Unique vendor identification code'
    },
    whatsapp_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'WhatsApp number for notifications'
    },
    accepts_support_packages: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether vendor accepts support package assignments'
    },
    accepts_auctions: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether vendor accepts auction participation'
    },
    accepts_email_notifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Email notification preferences'
    },
    accepts_whatsapp_notifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'WhatsApp notification preferences'
    },
    accepts_sms_notifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'SMS notification preferences'
    },
    communication_consent_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when communication consent was given'
    },
    global_rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Global rating across all companies (calculated)'
    },
    cbu: {
      type: DataTypes.STRING(22),
      allowNull: true,
      comment: 'CBU for commission payments'
    },
    bank_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Bank name for payments'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes about vendor'
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Optimistic locking version'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    underscored: false,
    
    // Database-level optimizations
    indexes: [
      // Most common lookup patterns
      {
        name: 'idx_users_employee_id_active',
        fields: ['employeeId', 'is_active'],
        using: 'BTREE'
      },
      {
        name: 'idx_users_email_active',
        fields: ['email', 'is_active'],
        using: 'BTREE'
      },
      // Role-based queries
      {
        name: 'idx_users_role_active',
        fields: ['role', 'is_active'],
        using: 'BTREE'
      },
      // Department-based queries
      {
        name: 'idx_users_department_active',
        fields: ['department_id', 'is_active'],
        using: 'BTREE'
      },
      // Branch-based queries
      {
        name: 'idx_users_branch_active',
        fields: ['default_branch_id', 'is_active'],
        using: 'BTREE'
      },
      // Authentication queries
      {
        name: 'idx_users_last_login',
        fields: ['last_login'],
        using: 'BTREE'
      },
      // Biometric queries
      {
        name: 'idx_users_biometric_flags',
        fields: ['has_fingerprint', 'has_facial_data', 'is_active'],
        using: 'BTREE'
      },
      // GPS and location queries
      {
        name: 'idx_users_gps_enabled',
        fields: ['gps_enabled', 'is_active'],
        using: 'BTREE'
      },
      // JSONB indexes for better performance
      {
        name: 'idx_users_permissions_gin',
        fields: ['permissions'],
        using: 'GIN'
      },
      {
        name: 'idx_users_work_schedule_gin',
        fields: ['work_schedule'],
        using: 'GIN'
      },
      // Full-text search index
      {
        name: 'idx_users_search',
        fields: ['firstName', 'lastName', 'employeeId'],
        using: 'GIN',
        operator: 'gin_trgm_ops'
      }
    ],
    
    // Hooks for optimization and security
    hooks: {
      beforeCreate: async (user, options) => {
        // Hash password
        if (user.password) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
        
        // Set displayName for caching
        user.displayName = `${user.firstName} ${user.lastName}`;
      },
      
      beforeUpdate: async (user, options) => {
        // Hash password if changed
        if (user.changed('password') && user.password) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
        
        // Update displayName if name changed
        if (user.changed('firstName') || user.changed('lastName')) {
          user.displayName = `${user.firstName} ${user.lastName}`;
        }
        
        // Reset failed login attempts on successful update
        if (user.changed('lastLogin')) {
          user.failedLoginAttempts = 0;
          user.lockedUntil = null;
        }
      }
    },
    
    // Scopes for optimized queries
    scopes: {
      active: {
        where: {
          isActive: true
        }
      },
      employees: {
        where: {
          role: ['employee', 'supervisor'],
          isActive: true
        }
      },
      managers: {
        where: {
          role: ['manager', 'admin', 'super_admin'],
          is_active: true
        }
      },
      withBiometric: {
        where: {
          [sequelize.Sequelize.Op.or]: [
            { has_fingerprint: true },
            { has_facial_data: true }
          ],
          is_active: true
        }
      },
      byDepartment: (departmentId) => ({
        where: {
          department_id: departmentId,
          is_active: true
        }
      }),
      // High-performance scope for bulk operations
      minimal: {
        attributes: ['id', 'employeeId', 'display_name', 'email', 'role', 'is_active'],
        raw: true
      },
      // For authentication
      withAuth: {
        attributes: ['id', 'employeeId', 'usuario', 'email', 'password', 'role', 'is_active',
                   'failed_login_attempts', 'locked_until', 'two_factor_enabled']
      }
    },
    
    // Custom validation
    validate: {
      emailFormat() {
        if (this.email && !this.email.includes('@')) {
          throw new Error('Invalid email format');
        }
      },
      roleHierarchy() {
        const hierarchy = ['employee', 'supervisor', 'manager', 'admin', 'super_admin'];
        if (!hierarchy.includes(this.role)) {
          throw new Error('Invalid role');
        }
      }
    },
    
    paranoid: false, // No soft deletes for performance
    freezeTableName: true
  });

  // Class methods for high-concurrency operations
  User.authenticate = async function(usuario, password) {
    const user = await User.scope('withAuth').findOne({
      where: { usuario, is_active: true }
    });
    
    if (!user) {
      return null;
    }
    
    // Check if account is locked
    if (user.locked_until && user.locked_until > new Date()) {
      throw new Error('Account temporarily locked');
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      // Increment failed attempts
      await user.increment('failed_login_attempts');
      
      // Lock account after 5 failed attempts
      if (user.failed_login_attempts >= 4) {
        await user.update({
          locked_until: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
        });
      }
      
      return null;
    }
    
    // Update last login and reset failed attempts
    await user.update({
      last_login: new Date(),
      last_activity: new Date(),
      failed_login_attempts: 0,
      locked_until: null
    });
    
    return user;
  };

  User.bulkUpdateActivity = async function(userIds) {
    const now = new Date();
    return await User.update(
      { last_activity: now },
      {
        where: {
          id: userIds,
          is_active: true
        }
      }
    );
  };

  User.getActiveUserStats = async function() {
    return await User.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_users'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN has_fingerprint = true THEN 1 END")), 'users_with_fingerprint'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN has_facial_data = true THEN 1 END")), 'users_with_facial'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN last_activity > NOW() - INTERVAL '1 hour' THEN 1 END")), 'active_last_hour']
      ],
      where: {
        is_active: true
      },
      raw: true
    });
  };

  // Instance methods
  User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  User.prototype.incrementConcurrentSessions = async function() {
    return await this.increment('concurrent_sessions');
  };

  User.prototype.decrementConcurrentSessions = async function() {
    return await this.decrement('concurrent_sessions');
  };

  User.prototype.hasPermission = function(permission) {
    if (!this.permissions || typeof this.permissions !== 'object') {
      return false;
    }
    
    // Check specific permission
    if (this.permissions[permission] === true) {
      return true;
    }
    
    // Check role-based permissions
    const rolePermissions = {
      'super_admin': ['*'],
      'admin': ['user_management', 'attendance_management', 'reporting'],
      'manager': ['attendance_management', 'reporting'],
      'supervisor': ['attendance_view'],
      'employee': ['attendance_self']
    };
    
    const userRolePermissions = rolePermissions[this.role] || [];
    return userRolePermissions.includes('*') || userRolePermissions.includes(permission);
  };

  User.prototype.canAccessBranch = function(branchId) {
    // Super admin and admin can access all branches
    if (['super_admin', 'admin'].includes(this.role)) {
      return true;
    }
    
    // Check if user's default branch
    if (this.default_branch_id == branchId) {
      return true;
    }
    
    // Check authorized branches (would need association data)
    return false;
  };

  User.prototype.isAccountLocked = function() {
    return this.locked_until && this.locked_until > new Date();
  };

  User.prototype.toSafeJSON = function() {
    const user = this.toJSON();
    delete user.password;
    delete user.password_reset_token;
    delete user.two_factor_secret;
    return user;
  };

  return User;
};