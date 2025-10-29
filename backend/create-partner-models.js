const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'src', 'models');

// Modelo 1: PartnerRole
const partnerRoleModel = `const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerRole = sequelize.define('PartnerRole', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    role_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    requires_license: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    requires_insurance: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'partner_roles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return PartnerRole;
};
`;

// Modelo 2: Partner
const partnerModel = `const { DataTypes } = require('sequelize');
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
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending'
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
`;

// Modelo 3: PartnerDocument
const partnerDocumentModel = `const { DataTypes } = require('sequelize');

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
`;

// Modelo 4: PartnerNotification
const partnerNotificationModel = `const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerNotification = sequelize.define('PartnerNotification', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    partner_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    notification_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    related_service_request_id: {
      type: DataTypes.INTEGER
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    read_at: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'partner_notifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return PartnerNotification;
};
`;

// Modelo 5: PartnerAvailability
const partnerAvailabilityModel = `const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerAvailability = sequelize.define('PartnerAvailability', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    partner_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    day_of_week: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    unavailable_reason: {
      type: DataTypes.TEXT
    },
    recurrence_type: {
      type: DataTypes.STRING(20),
      defaultValue: 'weekly'
    }
  }, {
    tableName: 'partner_availability',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return PartnerAvailability;
};
`;

// Modelo 6: PartnerServiceRequest
const partnerServiceRequestModel = `const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerServiceRequest = sequelize.define('PartnerServiceRequest', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    partner_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    service_type: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    service_description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending'
    },
    priority: {
      type: DataTypes.STRING(20),
      defaultValue: 'normal'
    },
    scheduled_date: {
      type: DataTypes.DATE
    },
    scheduled_time: {
      type: DataTypes.TIME
    },
    estimated_duration: {
      type: DataTypes.INTEGER
    },
    actual_start_time: {
      type: DataTypes.DATE
    },
    actual_end_time: {
      type: DataTypes.DATE
    },
    completion_notes: {
      type: DataTypes.TEXT
    },
    partner_notes: {
      type: DataTypes.TEXT
    },
    location: {
      type: DataTypes.TEXT
    },
    cancellation_reason: {
      type: DataTypes.TEXT
    },
    cancelled_by: {
      type: DataTypes.STRING(20)
    },
    cancelled_at: {
      type: DataTypes.DATE
    },
    sla_deadline: {
      type: DataTypes.DATE
    },
    sla_met: {
      type: DataTypes.BOOLEAN
    }
  }, {
    tableName: 'partner_service_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return PartnerServiceRequest;
};
`;

// Modelo 7: PartnerReview
const partnerReviewModel = `const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerReview = sequelize.define('PartnerReview', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    partner_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    reviewer_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    service_request_id: {
      type: DataTypes.INTEGER
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    professionalism_rating: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 5
      }
    },
    quality_rating: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 5
      }
    },
    timeliness_rating: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 5
      }
    },
    comment: {
      type: DataTypes.TEXT
    },
    partner_response: {
      type: DataTypes.TEXT
    },
    partner_response_at: {
      type: DataTypes.DATE
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'partner_reviews',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return PartnerReview;
};
`;

// Modelo 8: PartnerServiceConversation
const partnerServiceConversationModel = `const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerServiceConversation = sequelize.define('PartnerServiceConversation', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    service_request_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    sender_type: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    attachments: {
      type: DataTypes.JSONB
    },
    response_deadline: {
      type: DataTypes.DATE
    },
    is_urgent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    requires_response: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    read_at: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'partner_service_conversations',
    timestamps: true,
    createdAt: 'sent_at',
    updatedAt: false
  });

  return PartnerServiceConversation;
};
`;

// Modelo 9: PartnerMediationCase
const partnerMediationCaseModel = `const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerMediationCase = sequelize.define('PartnerMediationCase', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    service_request_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    partner_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    complainant_type: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    complaint_reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    mediator_id: {
      type: DataTypes.INTEGER
    },
    assigned_at: {
      type: DataTypes.DATE
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending'
    },
    resolution_notes: {
      type: DataTypes.TEXT
    },
    resolution_action: {
      type: DataTypes.STRING(50)
    },
    resolved_at: {
      type: DataTypes.DATE
    },
    resolved_by: {
      type: DataTypes.INTEGER
    },
    partner_penalized: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    company_penalized: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    penalty_amount: {
      type: DataTypes.DECIMAL(10, 2)
    }
  }, {
    tableName: 'partner_mediation_cases',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return PartnerMediationCase;
};
`;

// Modelo 10: PartnerLegalConsent
const partnerLegalConsentModel = `const { DataTypes } = require('sequelize');

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
`;

// Modelo 11: PartnerCommissionLog
const partnerCommissionLogModel = `const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerCommissionLog = sequelize.define('PartnerCommissionLog', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    partner_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    service_request_id: {
      type: DataTypes.INTEGER
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    calculation_method: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    base_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    commission_percentage: {
      type: DataTypes.DECIMAL(5, 2)
    },
    commission_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'ARS'
    },
    payment_status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending'
    },
    payment_date: {
      type: DataTypes.DATEONLY
    },
    payment_reference: {
      type: DataTypes.STRING(100)
    },
    period_start: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    period_end: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    calculation_details: {
      type: DataTypes.JSONB
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'partner_commissions_log',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return PartnerCommissionLog;
};
`;

// Array de todos los modelos
const models = [
  { name: 'PartnerRole', content: partnerRoleModel },
  { name: 'Partner', content: partnerModel },
  { name: 'PartnerDocument', content: partnerDocumentModel },
  { name: 'PartnerNotification', content: partnerNotificationModel },
  { name: 'PartnerAvailability', content: partnerAvailabilityModel },
  { name: 'PartnerServiceRequest', content: partnerServiceRequestModel },
  { name: 'PartnerReview', content: partnerReviewModel },
  { name: 'PartnerServiceConversation', content: partnerServiceConversationModel },
  { name: 'PartnerMediationCase', content: partnerMediationCaseModel },
  { name: 'PartnerLegalConsent', content: partnerLegalConsentModel },
  { name: 'PartnerCommissionLog', content: partnerCommissionLogModel }
];

// Crear archivos
console.log('🏗️  Creando modelos Sequelize para el sistema de Partners...\n');

models.forEach(model => {
  const filePath = path.join(modelsDir, `${model.name}.js`);
  fs.writeFileSync(filePath, model.content);
  console.log(`✓ Created ${model.name}.js`);
});

console.log('\n✅ Partner models created successfully!');
console.log('\n📊 Resumen:');
console.log('  ✓ 11 modelos Sequelize creados');
console.log('  ✓ Ubicación: src/models/');
console.log('\n📋 Modelos creados:');
models.forEach((model, index) => {
  console.log(`  ${index + 1}. ${model.name}`);
});
console.log('\n🔗 Próximo paso: Registrar modelos en src/config/database.js');
