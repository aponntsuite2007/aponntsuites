/**
 * SEQUELIZE MIGRATION: Partners System
 *
 * Crea las 11 tablas del sistema de Partners en orden correcto
 * para evitar errores de Foreign Keys
 *
 * Uso:
 *   node migrations-sequelize/20251024-create-partners-system.js
 */

const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

async function runMigration() {
  console.log('🚀 [PARTNERS MIGRATION] Iniciando migración Sequelize...\n');

  // Conectar a la base de datos
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: process.env.DATABASE_URL.includes('localhost')
        ? false
        : { rejectUnauthorized: false }
    }
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    // ========================================
    // PASO 1: DROP TABLES (si existen)
    // ========================================
    console.log('🗑️  Eliminando tablas existentes (si existen)...\n');

    await sequelize.query('DROP TABLE IF EXISTS partner_commissions_log CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS partner_legal_consents CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS partner_mediation_cases CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS partner_service_conversations CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS partner_reviews CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS partner_availability CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS partner_service_requests CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS partner_notifications CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS partner_documents CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS partners CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS partner_roles CASCADE');

    console.log('✅ Tablas eliminadas\n');

    // ========================================
    // PASO 2: CREAR TABLAS BASE
    // ========================================
    console.log('📦 [PARTE 1/4] Creando tablas base...\n');

    // Tabla 1: partner_roles
    await sequelize.getQueryInterface().createTable('partner_roles', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
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
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await sequelize.getQueryInterface().addConstraint('partner_roles', {
      fields: ['category'],
      type: 'check',
      name: 'valid_partner_role_category',
      where: {
        category: ['legal', 'medical', 'safety', 'coaching', 'audit', 'emergency', 'health', 'transport']
      }
    });

    console.log('   ✅ partner_roles creada');

    // Tabla 2: partners
    await sequelize.getQueryInterface().createTable('partners', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      partner_role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'partner_roles',
          key: 'id'
        },
        onDelete: 'RESTRICT'
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
        type: DataTypes.ARRAY(DataTypes.STRING)
      },
      professional_licenses: {
        type: DataTypes.JSONB,
        defaultValue: []
      },
      education: {
        type: DataTypes.JSONB,
        defaultValue: []
      },
      certifications: {
        type: DataTypes.JSONB,
        defaultValue: []
      },
      experience_years: {
        type: DataTypes.INTEGER
      },
      specialties: {
        type: DataTypes.ARRAY(DataTypes.STRING)
      },
      contract_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'per_service'
      },
      commission_calculation: {
        type: DataTypes.STRING(50),
        allowNull: false,
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
        type: DataTypes.STRING(2),
        defaultValue: 'AR'
      },
      service_area: {
        type: DataTypes.ARRAY(DataTypes.STRING)
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
        allowNull: false,
        defaultValue: 'pending'
      },
      approved_at: {
        type: DataTypes.DATE
      },
      approved_by: {
        type: DataTypes.INTEGER
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await sequelize.getQueryInterface().addConstraint('partners', {
      fields: ['contract_type'],
      type: 'check',
      name: 'valid_contract_type',
      where: {
        contract_type: ['per_service', 'eventual', 'part_time', 'full_time']
      }
    });

    await sequelize.getQueryInterface().addConstraint('partners', {
      fields: ['status'],
      type: 'check',
      name: 'valid_partner_status',
      where: {
        status: ['pending', 'approved', 'active', 'suspended', 'inactive']
      }
    });

    console.log('   ✅ partners creada');
    console.log('✅ [PARTE 1/4] Completada\n');

    // ========================================
    // PASO 3: CREAR TABLAS DEPENDIENTES
    // ========================================
    console.log('📦 [PARTE 2/4] Creando tablas dependientes...\n');

    // Tabla 3: partner_documents
    await sequelize.getQueryInterface().createTable('partner_documents', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      partner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'partners',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      document_type: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      document_name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      document_url: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      file_size: {
        type: DataTypes.INTEGER
      },
      mime_type: {
        type: DataTypes.STRING(100)
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      verified_by: {
        type: DataTypes.INTEGER
      },
      verified_at: {
        type: DataTypes.DATE
      },
      verification_notes: {
        type: DataTypes.TEXT
      },
      expiry_date: {
        type: DataTypes.DATEONLY
      },
      is_expired: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      uploaded_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await sequelize.getQueryInterface().addConstraint('partner_documents', {
      fields: ['document_type'],
      type: 'check',
      name: 'valid_document_type',
      where: {
        document_type: ['license', 'insurance', 'certification', 'id_document', 'tax_document', 'cv', 'portfolio', 'other']
      }
    });

    console.log('   ✅ partner_documents creada');

    // Tabla 4: partner_notifications
    await sequelize.getQueryInterface().createTable('partner_notifications', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      partner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'partners',
          key: 'id'
        },
        onDelete: 'CASCADE'
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
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await sequelize.getQueryInterface().addConstraint('partner_notifications', {
      fields: ['notification_type'],
      type: 'check',
      name: 'valid_notification_type',
      where: {
        notification_type: ['new_service_request', 'service_confirmed', 'service_completed', 'payment_received', 'document_expiring', 'review_received', 'status_change', 'message_received', 'system']
      }
    });

    console.log('   ✅ partner_notifications creada');

    // Tabla 5: partner_availability
    await sequelize.getQueryInterface().createTable('partner_availability', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      partner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'partners',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      start_time: {
        type: DataTypes.TIME
      },
      end_time: {
        type: DataTypes.TIME
      },
      availability_status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'available'
      },
      notes: {
        type: DataTypes.TEXT
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await sequelize.getQueryInterface().addConstraint('partner_availability', {
      fields: ['availability_status'],
      type: 'check',
      name: 'valid_availability_status',
      where: {
        availability_status: ['available', 'busy', 'vacation', 'unavailable']
      }
    });

    console.log('   ✅ partner_availability creada');

    // Tabla 6: partner_service_requests
    await sequelize.getQueryInterface().createTable('partner_service_requests', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      partner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'partners',
          key: 'id'
        },
        onDelete: 'RESTRICT'
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      service_type: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      service_description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      requested_date: {
        type: DataTypes.DATEONLY
      },
      requested_time: {
        type: DataTypes.TIME
      },
      is_urgent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      is_emergency: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      service_location: {
        type: DataTypes.STRING(20),
        defaultValue: 'on_site'
      },
      service_address: {
        type: DataTypes.TEXT
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending'
      },
      partner_response: {
        type: DataTypes.TEXT
      },
      partner_response_at: {
        type: DataTypes.DATE
      },
      declined_reason: {
        type: DataTypes.TEXT
      },
      cancellation_reason: {
        type: DataTypes.TEXT
      },
      cancelled_by: {
        type: DataTypes.STRING(20)
      },
      completed_at: {
        type: DataTypes.DATE
      },
      completion_notes: {
        type: DataTypes.TEXT
      },
      quoted_price: {
        type: DataTypes.DECIMAL(10, 2)
      },
      final_price: {
        type: DataTypes.DECIMAL(10, 2)
      },
      currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'ARS'
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await sequelize.getQueryInterface().addConstraint('partner_service_requests', {
      fields: ['service_location'],
      type: 'check',
      name: 'valid_service_location',
      where: {
        service_location: ['on_site', 'partner_location', 'remote']
      }
    });

    await sequelize.getQueryInterface().addConstraint('partner_service_requests', {
      fields: ['status'],
      type: 'check',
      name: 'valid_service_status',
      where: {
        status: ['pending', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled']
      }
    });

    console.log('   ✅ partner_service_requests creada');
    console.log('✅ [PARTE 2/4] Completada\n');

    // ========================================
    // PASO 4: CREAR TABLAS DE INTERACCIÓN
    // ========================================
    console.log('📦 [PARTE 3/4] Creando tablas de interacción...\n');

    // Tabla 7: partner_reviews
    await sequelize.getQueryInterface().createTable('partner_reviews', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      partner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'partners',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      reviewer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      service_request_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'partner_service_requests',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      professionalism_rating: {
        type: DataTypes.INTEGER
      },
      punctuality_rating: {
        type: DataTypes.INTEGER
      },
      quality_rating: {
        type: DataTypes.INTEGER
      },
      communication_rating: {
        type: DataTypes.INTEGER
      },
      comment: {
        type: DataTypes.TEXT
      },
      pros: {
        type: DataTypes.ARRAY(DataTypes.TEXT)
      },
      cons: {
        type: DataTypes.ARRAY(DataTypes.TEXT)
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
      is_verified_service: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      is_flagged: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      flagged_reason: {
        type: DataTypes.TEXT
      },
      moderated_by: {
        type: DataTypes.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await sequelize.getQueryInterface().addConstraint('partner_reviews', {
      fields: ['rating'],
      type: 'check',
      name: 'valid_rating_range',
      where: Sequelize.literal('rating >= 1 AND rating <= 5')
    });

    console.log('   ✅ partner_reviews creada');

    // Tabla 8: partner_service_conversations
    await sequelize.getQueryInterface().createTable('partner_service_conversations', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      service_request_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'partner_service_requests',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      sender_type: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      sender_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      partner_sender_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'partners',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      attachments: {
        type: DataTypes.JSONB
      },
      parent_message_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'partner_service_conversations',
          key: 'id'
        }
      },
      sent_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      response_deadline: {
        type: DataTypes.DATE
      },
      is_urgent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      read_at: {
        type: DataTypes.DATE
      }
    });

    await sequelize.getQueryInterface().addConstraint('partner_service_conversations', {
      fields: ['sender_type'],
      type: 'check',
      name: 'valid_sender_type',
      where: {
        sender_type: ['client', 'partner', 'admin', 'mediator']
      }
    });

    console.log('   ✅ partner_service_conversations creada');

    // Agregar FK a partner_notifications ahora que partner_service_requests existe
    await sequelize.getQueryInterface().addConstraint('partner_notifications', {
      fields: ['related_service_request_id'],
      type: 'foreign key',
      name: 'fk_partner_notifications_service_request',
      references: {
        table: 'partner_service_requests',
        field: 'id'
      },
      onDelete: 'SET NULL'
    });

    console.log('   ✅ FK agregada a partner_notifications');
    console.log('✅ [PARTE 3/4] Completada\n');

    // ========================================
    // PASO 5: CREAR TABLAS FINALES
    // ========================================
    console.log('📦 [PARTE 4/4] Creando tablas finales...\n');

    // Tabla 9: partner_mediation_cases
    await sequelize.getQueryInterface().createTable('partner_mediation_cases', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      service_request_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'partner_service_requests',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      partner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'partners',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      case_type: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      filed_by: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      evidence_urls: {
        type: DataTypes.ARRAY(DataTypes.TEXT)
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'open'
      },
      resolution: {
        type: DataTypes.TEXT
      },
      resolved_by: {
        type: DataTypes.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      resolved_at: {
        type: DataTypes.DATE
      },
      outcome: {
        type: DataTypes.STRING(50)
      },
      refund_amount: {
        type: DataTypes.DECIMAL(10, 2)
      },
      compensation_amount: {
        type: DataTypes.DECIMAL(10, 2)
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await sequelize.getQueryInterface().addConstraint('partner_mediation_cases', {
      fields: ['case_type'],
      type: 'check',
      name: 'valid_case_type',
      where: {
        case_type: ['payment_dispute', 'service_quality', 'cancellation_dispute', 'contract_breach', 'other']
      }
    });

    console.log('   ✅ partner_mediation_cases creada');

    // Tabla 10: partner_legal_consents
    await sequelize.getQueryInterface().createTable('partner_legal_consents', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      partner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'partners',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      consent_type: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      consent_version: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      digital_signature: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      signature_timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      signature_ip: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      user_agent: {
        type: DataTypes.TEXT
      },
      consent_text: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      consent_text_hash: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      commission_rate: {
        type: DataTypes.DECIMAL(5, 2)
      },
      commission_calculation: {
        type: DataTypes.STRING(50)
      },
      is_valid: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      revoked_at: {
        type: DataTypes.DATE
      },
      revoked_reason: {
        type: DataTypes.TEXT
      }
    });

    await sequelize.getQueryInterface().addConstraint('partner_legal_consents', {
      fields: ['consent_type'],
      type: 'check',
      name: 'valid_consent_type',
      where: {
        consent_type: ['terms_of_service', 'privacy_policy', 'commission_agreement', 'liability_waiver', 'data_processing']
      }
    });

    console.log('   ✅ partner_legal_consents creada');

    // Tabla 11: partner_commissions_log
    await sequelize.getQueryInterface().createTable('partner_commissions_log', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      partner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'partners',
          key: 'id'
        },
        onDelete: 'RESTRICT'
      },
      service_request_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'partner_service_requests',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id'
        },
        onDelete: 'RESTRICT'
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
      fixed_amount: {
        type: DataTypes.DECIMAL(10, 2)
      },
      commission_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'ARS'
      },
      period_start: {
        type: DataTypes.DATEONLY
      },
      period_end: {
        type: DataTypes.DATEONLY
      },
      payment_status: {
        type: DataTypes.STRING(20),
        defaultValue: 'pending'
      },
      paid_at: {
        type: DataTypes.DATE
      },
      payment_reference: {
        type: DataTypes.STRING(255)
      },
      notes: {
        type: DataTypes.TEXT
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await sequelize.getQueryInterface().addConstraint('partner_commissions_log', {
      fields: ['calculation_method'],
      type: 'check',
      name: 'valid_calculation_method',
      where: {
        calculation_method: ['per_module_user', 'per_employee', 'per_company', 'per_service']
      }
    });

    console.log('   ✅ partner_commissions_log creada');
    console.log('✅ [PARTE 4/4] Completada\n');

    // ========================================
    // PASO 6: CREAR ÍNDICES
    // ========================================
    console.log('📑 Creando índices...\n');

    await sequelize.query('CREATE INDEX idx_partner_documents_partner ON partner_documents(partner_id)');
    await sequelize.query('CREATE INDEX idx_partner_documents_type ON partner_documents(document_type)');
    await sequelize.query('CREATE INDEX idx_partner_notifications_partner ON partner_notifications(partner_id)');
    await sequelize.query('CREATE INDEX idx_partner_availability_partner ON partner_availability(partner_id)');
    await sequelize.query('CREATE INDEX idx_partner_service_requests_partner ON partner_service_requests(partner_id)');
    await sequelize.query('CREATE INDEX idx_partner_service_requests_company ON partner_service_requests(company_id)');
    await sequelize.query('CREATE INDEX idx_partner_reviews_partner ON partner_reviews(partner_id)');
    await sequelize.query('CREATE INDEX idx_partner_reviews_reviewer ON partner_reviews(reviewer_id)');
    await sequelize.query('CREATE INDEX idx_partner_conversations_service ON partner_service_conversations(service_request_id)');
    await sequelize.query('CREATE INDEX idx_partner_mediation_partner ON partner_mediation_cases(partner_id)');
    await sequelize.query('CREATE INDEX idx_partner_consents_partner ON partner_legal_consents(partner_id)');
    await sequelize.query('CREATE INDEX idx_partner_commissions_partner ON partner_commissions_log(partner_id)');

    console.log('✅ Índices creados\n');

    // ========================================
    // PASO 7: INSERTAR DATOS INICIALES
    // ========================================
    console.log('📝 Insertando datos iniciales (10 roles)...\n');

    await sequelize.query(`
      INSERT INTO partner_roles (role_name, category, description, requires_license, requires_insurance) VALUES
      ('Abogado Laboralista', 'legal', 'Especialista en derecho laboral y relaciones laborales', true, true),
      ('Médico Laboral', 'medical', 'Médico especializado en salud ocupacional', true, true),
      ('Responsable de Seguridad e Higiene', 'safety', 'Profesional certificado en seguridad e higiene laboral', true, true),
      ('Coach Empresarial', 'coaching', 'Coach certificado para desarrollo de equipos', false, false),
      ('Auditor Externo', 'audit', 'Auditor independiente para procesos empresariales', true, true),
      ('Servicio de Emergencias', 'emergency', 'Servicios de emergencia médica empresarial', true, true),
      ('Enfermero Ocupacional', 'health', 'Enfermero especializado en salud laboral', true, false),
      ('Nutricionista Empresarial', 'health', 'Nutricionista para programas de bienestar', true, false),
      ('Psicólogo Laboral', 'health', 'Psicólogo especializado en salud mental laboral', true, false),
      ('Transporte Corporativo', 'transport', 'Servicios de transporte para empresas', false, true)
    `);

    console.log('✅ 10 roles insertados\n');

    // ========================================
    // PASO 8: CREAR TRIGGERS
    // ========================================
    console.log('🔧 Creando triggers y funciones...\n');

    // Trigger 1: Actualizar rating promedio
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION update_partner_rating()
      RETURNS TRIGGER AS $$
      BEGIN
          UPDATE partners
          SET
              rating = (
                  SELECT ROUND(AVG(rating)::numeric, 2)
                  FROM partner_reviews
                  WHERE partner_id = NEW.partner_id AND is_public = true
              ),
              total_reviews = (
                  SELECT COUNT(*)
                  FROM partner_reviews
                  WHERE partner_id = NEW.partner_id AND is_public = true
              ),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = NEW.partner_id;

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await sequelize.query(`
      CREATE TRIGGER trigger_update_partner_rating
      AFTER INSERT OR UPDATE ON partner_reviews
      FOR EACH ROW
      EXECUTE FUNCTION update_partner_rating();
    `);

    console.log('   ✅ Trigger: update_partner_rating');

    // Trigger 2: Incrementar contador de servicios
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION increment_partner_services()
      RETURNS TRIGGER AS $$
      BEGIN
          IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
              UPDATE partners
              SET
                  total_services = total_services + 1,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = NEW.partner_id;
          END IF;

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await sequelize.query(`
      CREATE TRIGGER trigger_increment_partner_services
      AFTER UPDATE ON partner_service_requests
      FOR EACH ROW
      EXECUTE FUNCTION increment_partner_services();
    `);

    console.log('   ✅ Trigger: increment_partner_services');

    // Trigger 3: Crear conversación inicial
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION create_initial_conversation()
      RETURNS TRIGGER AS $$
      BEGIN
          INSERT INTO partner_service_conversations (
              service_request_id,
              sender_type,
              sender_id,
              message,
              sent_at
          ) VALUES (
              NEW.id,
              'client',
              NEW.user_id,
              'Solicitud de servicio creada: ' || NEW.service_description,
              NEW.created_at
          );

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await sequelize.query(`
      CREATE TRIGGER trigger_create_initial_conversation
      AFTER INSERT ON partner_service_requests
      FOR EACH ROW
      EXECUTE FUNCTION create_initial_conversation();
    `);

    console.log('   ✅ Trigger: create_initial_conversation');

    // Trigger 4: Notificar partner nueva solicitud
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION notify_partner_new_request()
      RETURNS TRIGGER AS $$
      BEGIN
          INSERT INTO partner_notifications (
              partner_id,
              notification_type,
              title,
              message,
              related_service_request_id,
              created_at
          ) VALUES (
              NEW.partner_id,
              'new_service_request',
              'Nueva solicitud de servicio',
              'Tienes una nueva solicitud de servicio de ' ||
              (SELECT name FROM companies WHERE id = NEW.company_id),
              NEW.id,
              NEW.created_at
          );

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await sequelize.query(`
      CREATE TRIGGER trigger_notify_partner_new_request
      AFTER INSERT ON partner_service_requests
      FOR EACH ROW
      EXECUTE FUNCTION notify_partner_new_request();
    `);

    console.log('   ✅ Trigger: notify_partner_new_request');

    // Trigger 5: Updated_at automático
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await sequelize.query(`
      CREATE TRIGGER trigger_partners_updated_at
      BEFORE UPDATE ON partners
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    await sequelize.query(`
      CREATE TRIGGER trigger_partner_reviews_updated_at
      BEFORE UPDATE ON partner_reviews
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    await sequelize.query(`
      CREATE TRIGGER trigger_partner_service_requests_updated_at
      BEFORE UPDATE ON partner_service_requests
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    await sequelize.query(`
      CREATE TRIGGER trigger_partner_mediation_updated_at
      BEFORE UPDATE ON partner_mediation_cases
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('   ✅ Trigger: update_updated_at_column (4 tablas)');
    console.log('✅ Triggers creados\n');

    // ========================================
    // PASO 9: VERIFICACIÓN FINAL
    // ========================================
    console.log('🔍 Verificando instalación...\n');

    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'partner%'
      ORDER BY table_name
    `);

    console.log('📊 Tablas creadas:');
    tables.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    const [roles] = await sequelize.query('SELECT COUNT(*) as count FROM partner_roles');
    console.log(`\n✅ Roles insertados: ${roles[0].count}`);

    const [triggers] = await sequelize.query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name LIKE '%partner%'
      ORDER BY trigger_name
    `);

    console.log('\n🔧 Triggers instalados:');
    triggers.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.trigger_name} → ${row.event_object_table}`);
    });

    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE!\n');
    console.log('📋 Próximos pasos:');
    console.log('   1. Crear modelos Sequelize (Partner, PartnerRole, etc.)');
    console.log('   2. Crear API REST (/api/partners)');
    console.log('   3. Crear formulario de registro público');
    console.log('   4. Implementar sistema de firma digital');
    console.log('   5. Crear sección admin en panel-administrativo.html');
    console.log('   6. Crear marketplace en panel-empresa.html\n');

  } catch (error) {
    console.error('\n❌ ERROR EJECUTANDO MIGRACIÓN:');
    console.error(`   Mensaje: ${error.message}`);
    console.error(`\n   Stack completo:`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✅ Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error.message);
      process.exit(1);
    });
}

module.exports = { runMigration };
