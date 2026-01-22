const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Company = sequelize.define('Company', {
    company_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // Basic Company Information
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255]
      },
      comment: 'Company name'
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [2, 255]
      },
      comment: 'URL-friendly company identifier for subdomains'
    },
    displayName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'display_name',
      comment: 'Full company display name'
    },
    legalName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'legal_name',
      comment: 'Legal company name'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Company description'
    },
    
    // Contact Information
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      },
      comment: 'Company main email'
    },
    fallback_notification_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      },
      comment: 'Email fallback si no hay autorizador asignado (ej: rrhh@empresa.com)'
    },
    fallback_notification_whatsapp: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'WhatsApp fallback si no hay autorizador asignado'
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Company phone number'
    },
    contactPhone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'contact_phone',
      comment: 'Alternative contact phone'
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Company address'
    },
    city: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Company city'
    },
    state: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Company state/province'
    },
    country: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'Argentina',
      comment: 'Company country'
    },
    website: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: true
      },
      comment: 'Company website URL'
    },
    
    // Legal Information
    taxId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'tax_id',
      comment: 'Tax identification number (CUIT/CUIL)'
    },
    registrationNumber: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'registration_number',
      comment: 'Company registration number'
    },
    
    // System Configuration
    timezone: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'America/Argentina/Buenos_Aires',
      comment: 'Company timezone'
    },
    locale: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'es-AR',
      comment: 'Company locale (language-country)'
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'ARS',
      comment: 'Currency code (ISO 4217)'
    },
    
    // Database Schema Information (for multi-tenant) - REMOVIDO para PostgreSQL
    // databaseSchema: {
    //   type: DataTypes.STRING(255),
    //   allowNull: true,
    //   unique: true,
    //   field: 'database_schema',
    //   comment: 'Database schema name for this company'
    // },
    
    // Branding
    logo: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Company logo in base64 format'
    },
    primaryColor: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#0066CC',
      field: 'primary_color',
      validate: {
        is: /^#[0-9A-F]{6}$/i
      },
      comment: 'Primary brand color (hex)'
    },
    secondaryColor: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#666666',
      field: 'secondary_color',
      validate: {
        is: /^#[0-9A-F]{6}$/i
      },
      comment: 'Secondary brand color (hex)'
    },
    
    // Subscription & Licensing
    licenseType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'basic',
      field: 'license_type',
      comment: 'License type (basic, professional, enterprise)'
    },
    subscriptionType: {
      type: DataTypes.ENUM('free', 'basic', 'professional', 'enterprise'),
      allowNull: false,
      defaultValue: 'basic',
      field: 'subscription_type',
      comment: 'Subscription plan type'
    },
    maxEmployees: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50,
      field: 'max_employees',
      validate: {
        min: 1,
        max: 10000
      },
      comment: 'Maximum number of employees allowed'
    },
    contractedEmployees: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'contracted_employees',
      validate: {
        min: 1,
        max: 10000
      },
      comment: 'Number of employees contracted (what the company pays for)'
    },
    maxBranches: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 5,
      field: 'max_branches',
      validate: {
        min: 1
      },
      comment: 'Maximum number of branches allowed'
    },
    
    // Status & Trial
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,  // CAMBIO: false por defecto hasta que se active
      field: 'is_active',
      comment: 'Whether the company is active (true solo después de pago confirmado)'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',  // CAMBIO: pending por defecto
      validate: {
        isIn: [['pending', 'active', 'suspended', 'trial', 'expired', 'cancelled']]
      },
      comment: 'Company status: pending (creada sin activar), active (pago confirmado), suspended, trial, expired, cancelled'
    },

    // ═══════════════════════════════════════════════════════════
    // ONBOARDING & TRAZABILIDAD
    // ═══════════════════════════════════════════════════════════
    onboardingStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
      field: 'onboarding_status',
      validate: {
        isIn: [[
          null,
          'PENDING',                  // Pendiente inicial
          'BUDGET_ACCEPTED',          // Presupuesto aceptado
          'CONTRACT_SENT',            // Contrato enviado para firma
          'CONTRACT_SIGNED',          // Contrato firmado (empresa creada INACTIVA)
          'INVOICE_GENERATED',        // Factura generada
          'INVOICE_SUPERVISED',       // Factura supervisada
          'PAYMENT_PENDING',          // Pago pendiente
          'PAYMENT_CONFIRMED',        // Pago confirmado
          'ACTIVE',                   // Empresa activada completamente
          'SUSPENDED',                // Empresa suspendida
          'CANCELLED'                 // Proceso cancelado
        ]]
      },
      comment: 'Estado del proceso de onboarding'
    },
    traceId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      field: 'trace_id',
      comment: 'ONBOARDING-{UUID} - Trazabilidad del proceso de alta'
    },
    activatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'activated_at',
      comment: 'Fecha de activación definitiva (después de pago)'
    },
    activatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'activated_by',
      comment: 'Usuario que activó la empresa'
    },

    isTrial: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_trial',
      comment: 'Whether this is a trial account'
    },
    trialEndsAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'trial_ends_at',
      comment: 'Trial expiration date'
    },
    subscriptionExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'subscription_expires_at',
      comment: 'Subscription expiration date'
    },
    
    // Features & Modules
    activeModules: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        biometric: true,
        attendance: true,
        medical: false,
        reports: true,
        departments: true,
        gpsTracking: false
      },
      field: 'active_modules',
      comment: 'Active modules for this company'
    },
    features: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        biometric: true,
        attendance: true,
        medical: false,
        reports: true,
        departments: true,
        gpsTracking: false,
        multiuser: true,
        realTimeSync: true,
        offlineMode: false,
        advancedReports: false,
        apiAccess: false,
        customBranding: false,
        ssoIntegration: false
      },
      comment: 'Enabled features for this company'
    },
    
    // Pricing Information
    modulesPricing: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      field: 'modules_pricing',
      comment: 'Pricing configuration for modules'
    },
    pricingInfo: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      field: 'pricing_info',
      comment: 'General pricing information'
    },
    
    // Security Settings
    passwordPolicy: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        minLength: 6,
        requireUppercase: false,
        requireLowercase: false,
        requireNumbers: false,
        requireSymbols: false,
        maxAge: null
      },
      field: 'password_policy',
      comment: 'Password policy configuration'
    },
    twoFactorRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'two_factor_required',
      comment: 'Whether 2FA is required for all users'
    },
    sessionTimeout: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 480, // 8 hours in minutes
      field: 'session_timeout',
      validate: {
        min: 30,
        max: 1440 // 24 hours
      },
      comment: 'Session timeout in minutes'
    },
    
    // Configuration & Settings
    settings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Company-specific settings'
    },
    
    // Admin Information
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by',
      comment: 'User who created this company'
    },
    lastConfigUpdate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_config_update',
      comment: 'Last time configuration was updated'
    },

    // Vendor Assignment (Sistema de Roles y Comisiones)
    createdByStaffId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by_staff_id',
      comment: 'Aponnt staff who created this company'
    },
    assignedVendorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'assigned_vendor_id',
      comment: 'Sales vendor assigned to this company (permanent commission)'
    },
    supportVendorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'support_vendor_id',
      comment: 'Support vendor assigned to this company (temporary commission)'
    },

    // Commission Tracking (calculated automatically)
    salesCommissionUsd: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      field: 'sales_commission_usd',
      comment: 'Total sales commission in USD for assigned vendor'
    },
    supportCommissionUsd: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      field: 'support_commission_usd',
      comment: 'Total support commission in USD for support vendor'
    },

    // Metadata
    // Multi-Branch Feature Flag (Fase MB-1)
    multiBranchEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'multi_branch_enabled',
      comment: 'Feature flag para habilitar funcionalidad multi-sucursal'
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Additional company metadata'
    }
    
  }, {
    tableName: 'companies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      { fields: ['slug'], unique: true },
      { fields: ['tax_id'] },
      { fields: ['is_active'] },
      { fields: ['status'] },
      { fields: ['license_type'] }
    ]
  });

  // Instance Methods
  Company.prototype.isTrialExpired = function() {
    if (!this.trialEndsAt) return false;
    return new Date() > this.trialEndsAt;
  };

  Company.prototype.isSubscriptionExpired = function() {
    if (!this.subscriptionExpiresAt) return false;
    return new Date() > this.subscriptionExpiresAt;
  };

  Company.prototype.isOperational = function() {
    return this.isActive && 
           this.status === 'active' && 
           !this.isSubscriptionExpired() && 
           (!this.isTrial || !this.isTrialExpired());
  };

  Company.prototype.getDaysUntilExpiration = function() {
    const expirationDate = this.subscriptionExpiresAt || this.trialEndsAt;
    if (!expirationDate) return null;
    
    const now = new Date();
    const diffTime = expirationDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  Company.prototype.hasFeature = function(featureName) {
    return this.features && this.features[featureName] === true;
  };

  Company.prototype.hasModule = function(moduleName) {
    return this.activeModules && this.activeModules[moduleName] === true;
  };

  Company.prototype.canAddEmployees = function(currentCount) {
    return currentCount < this.maxEmployees;
  };

  Company.prototype.canAddBranches = function(currentCount) {
    return !this.maxBranches || currentCount < this.maxBranches;
  };

  // Class Methods
  Company.findBySlug = function(slug) {
    return this.findOne({ where: { slug, isActive: true } });
  };

  Company.findActiveCompanies = function() {
    return this.findAll({
      where: {
        isActive: true,
        status: 'active'
      },
      order: [['name', 'ASC']]
    });
  };

  // Associations (Sistema de Roles y Comisiones)
  Company.associate = function(models) {
    // Vendor assignments
    Company.belongsTo(models.AponntStaff, {
      foreignKey: 'created_by_staff_id',
      as: 'createdByStaff'
    });

    Company.belongsTo(models.AponntStaff, {
      foreignKey: 'assigned_vendor_id',
      as: 'assignedVendor'
    });

    Company.belongsTo(models.AponntStaff, {
      foreignKey: 'support_vendor_id',
      as: 'supportVendor'
    });
  };

  return Company;
};