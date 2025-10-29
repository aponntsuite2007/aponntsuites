/**
 * SOLUCIÓN DEFINITIVA: Partners System
 *
 * Estrategia: Crear TODAS las tablas SIN Foreign Keys primero,
 * luego agregar todas las FKs con ALTER TABLE
 *
 * Uso: node migrations-sequelize/20251024-partners-no-fk-first.js
 */

const { Client } = require('pg');
require('dotenv').config();

async function runMigration() {
  console.log('🚀 [PARTNERS MIGRATION] Estrategia: Crear tablas sin FKs, agregar FKs después...\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost')
      ? false
      : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // ========================================
    // PASO 1: DROP TABLES
    // ========================================
    console.log('🗑️  Eliminando tablas existentes...\n');

    const dropTables = [
      'DROP TABLE IF EXISTS partner_commissions_log CASCADE',
      'DROP TABLE IF EXISTS partner_legal_consents CASCADE',
      'DROP TABLE IF EXISTS partner_mediation_cases CASCADE',
      'DROP TABLE IF EXISTS partner_service_conversations CASCADE',
      'DROP TABLE IF EXISTS partner_reviews CASCADE',
      'DROP TABLE IF EXISTS partner_availability CASCADE',
      'DROP TABLE IF EXISTS partner_service_requests CASCADE',
      'DROP TABLE IF EXISTS partner_notifications CASCADE',
      'DROP TABLE IF EXISTS partner_documents CASCADE',
      'DROP TABLE IF EXISTS partners CASCADE',
      'DROP TABLE IF EXISTS partner_roles CASCADE'
    ];

    for (const sql of dropTables) {
      await client.query(sql);
    }

    console.log('✅ Tablas eliminadas\n');

    // ========================================
    // PASO 2: CREAR TABLAS SIN FOREIGN KEYS
    // ========================================
    console.log('📦 Creando tablas SIN Foreign Keys...\n');

    // Tabla 1: partner_roles (no tiene FKs)
    await client.query(`
      CREATE TABLE partner_roles (
        id SERIAL PRIMARY KEY,
        role_name VARCHAR(100) NOT NULL UNIQUE,
        category VARCHAR(50) NOT NULL,
        description TEXT,
        requires_license BOOLEAN DEFAULT false,
        requires_insurance BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_partner_role_category CHECK (
          category IN ('legal', 'medical', 'safety', 'coaching', 'audit', 'emergency', 'health', 'transport')
        )
      )
    `);
    console.log('   ✅ partner_roles');

    // Tabla 2: partners (sin FK a partner_roles aún)
    await client.query(`
      CREATE TABLE partners (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        partner_role_id INTEGER NOT NULL,

        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        mobile VARCHAR(20),
        profile_photo_url TEXT,
        bio TEXT,
        languages VARCHAR[],

        professional_licenses JSONB DEFAULT '[]'::jsonb,
        education JSONB DEFAULT '[]'::jsonb,
        certifications JSONB DEFAULT '[]'::jsonb,
        experience_years INTEGER,
        specialties VARCHAR[],

        contract_type VARCHAR(50) NOT NULL DEFAULT 'per_service',
        commission_calculation VARCHAR(50) NOT NULL DEFAULT 'per_module_user',
        commission_percentage DECIMAL(5, 2),
        fixed_monthly_rate DECIMAL(10, 2),
        fixed_per_employee_rate DECIMAL(10, 2),

        city VARCHAR(100),
        province VARCHAR(100),
        country VARCHAR(2) DEFAULT 'AR',
        service_area VARCHAR[],

        rating DECIMAL(3, 2) DEFAULT 0.00,
        total_reviews INTEGER DEFAULT 0,
        total_services INTEGER DEFAULT 0,

        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        approved_at TIMESTAMP,
        approved_by INTEGER,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT valid_contract_type CHECK (contract_type IN ('per_service', 'eventual', 'part_time', 'full_time')),
        CONSTRAINT valid_partner_status CHECK (status IN ('pending', 'approved', 'active', 'suspended', 'inactive')),
        CONSTRAINT valid_partner_rating CHECK (rating >= 0 AND rating <= 5)
      )
    `);
    console.log('   ✅ partners');

    // Tabla 3: partner_documents (sin FKs)
    await client.query(`
      CREATE TABLE partner_documents (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER NOT NULL,

        document_type VARCHAR(50) NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        document_url TEXT NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),

        is_verified BOOLEAN DEFAULT false,
        verified_by INTEGER,
        verified_at TIMESTAMP,
        verification_notes TEXT,

        expiry_date DATE,
        is_expired BOOLEAN DEFAULT false,

        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT valid_document_type CHECK (
          document_type IN ('license', 'insurance', 'certification', 'id_document', 'tax_document', 'cv', 'portfolio', 'other')
        )
      )
    `);
    console.log('   ✅ partner_documents');

    // Tabla 4: partner_notifications (sin FKs)
    await client.query(`
      CREATE TABLE partner_notifications (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER NOT NULL,

        notification_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,

        related_service_request_id INTEGER,

        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT valid_notification_type CHECK (
          notification_type IN ('new_service_request', 'service_confirmed', 'service_completed',
                                'payment_received', 'document_expiring', 'review_received',
                                'status_change', 'message_received', 'system')
        )
      )
    `);
    console.log('   ✅ partner_notifications');

    // Tabla 5: partner_availability (sin FKs)
    await client.query(`
      CREATE TABLE partner_availability (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER NOT NULL,

        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,

        availability_status VARCHAR(20) NOT NULL DEFAULT 'available',
        notes TEXT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT valid_date_range CHECK (end_date >= start_date),
        CONSTRAINT valid_time_range CHECK (end_time > start_time OR start_time IS NULL),
        CONSTRAINT valid_availability_status CHECK (
          availability_status IN ('available', 'busy', 'vacation', 'unavailable')
        )
      )
    `);
    console.log('   ✅ partner_availability');

    // Tabla 6: partner_service_requests (sin FKs)
    await client.query(`
      CREATE TABLE partner_service_requests (
        id SERIAL PRIMARY KEY,

        partner_id INTEGER NOT NULL,
        company_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,

        service_type VARCHAR(100) NOT NULL,
        service_description TEXT NOT NULL,

        requested_date DATE,
        requested_time TIME,
        is_urgent BOOLEAN DEFAULT false,
        is_emergency BOOLEAN DEFAULT false,

        service_location VARCHAR(20) DEFAULT 'on_site',
        service_address TEXT,

        status VARCHAR(20) NOT NULL DEFAULT 'pending',

        partner_response TEXT,
        partner_response_at TIMESTAMP,
        declined_reason TEXT,
        cancellation_reason TEXT,
        cancelled_by VARCHAR(20),

        completed_at TIMESTAMP,
        completion_notes TEXT,

        quoted_price DECIMAL(10, 2),
        final_price DECIMAL(10, 2),
        currency VARCHAR(3) DEFAULT 'ARS',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT valid_service_location CHECK (service_location IN ('on_site', 'partner_location', 'remote')),
        CONSTRAINT valid_service_status CHECK (status IN ('pending', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled'))
      )
    `);
    console.log('   ✅ partner_service_requests');

    // Tabla 7: partner_reviews (sin FKs)
    await client.query(`
      CREATE TABLE partner_reviews (
        id SERIAL PRIMARY KEY,

        partner_id INTEGER NOT NULL,
        reviewer_id INTEGER NOT NULL,
        service_request_id INTEGER,

        rating INTEGER NOT NULL,
        professionalism_rating INTEGER,
        punctuality_rating INTEGER,
        quality_rating INTEGER,
        communication_rating INTEGER,

        comment TEXT,
        pros TEXT[],
        cons TEXT[],

        partner_response TEXT,
        partner_response_at TIMESTAMP,

        is_public BOOLEAN DEFAULT true,
        is_verified_service BOOLEAN DEFAULT false,
        is_flagged BOOLEAN DEFAULT false,
        flagged_reason TEXT,
        moderated_by INTEGER,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5),
        CONSTRAINT valid_professionalism_rating CHECK (professionalism_rating IS NULL OR (professionalism_rating >= 1 AND professionalism_rating <= 5)),
        CONSTRAINT valid_punctuality_rating CHECK (punctuality_rating IS NULL OR (punctuality_rating >= 1 AND punctuality_rating <= 5)),
        CONSTRAINT valid_quality_rating CHECK (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5)),
        CONSTRAINT valid_communication_rating CHECK (communication_rating IS NULL OR (communication_rating >= 1 AND communication_rating <= 5)),
        UNIQUE(partner_id, reviewer_id, service_request_id)
      )
    `);
    console.log('   ✅ partner_reviews');

    // Tabla 8: partner_service_conversations (sin FKs)
    await client.query(`
      CREATE TABLE partner_service_conversations (
        id SERIAL PRIMARY KEY,

        service_request_id INTEGER NOT NULL,

        sender_type VARCHAR(20) NOT NULL,
        sender_id INTEGER,
        partner_sender_id INTEGER,

        message TEXT NOT NULL,
        attachments JSONB,

        parent_message_id INTEGER,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        response_deadline TIMESTAMP,
        is_urgent BOOLEAN DEFAULT false,

        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,

        CONSTRAINT valid_sender_type CHECK (sender_type IN ('client', 'partner', 'admin', 'mediator')),
        CONSTRAINT valid_sender CHECK (
          (sender_type = 'partner' AND partner_sender_id IS NOT NULL AND sender_id IS NULL) OR
          (sender_type != 'partner' AND sender_id IS NOT NULL AND partner_sender_id IS NULL)
        )
      )
    `);
    console.log('   ✅ partner_service_conversations');

    // Tabla 9: partner_mediation_cases (sin FKs)
    await client.query(`
      CREATE TABLE partner_mediation_cases (
        id SERIAL PRIMARY KEY,

        service_request_id INTEGER NOT NULL,
        partner_id INTEGER NOT NULL,
        company_id INTEGER NOT NULL,

        case_type VARCHAR(50) NOT NULL,
        filed_by VARCHAR(20) NOT NULL,
        description TEXT NOT NULL,
        evidence_urls TEXT[],

        status VARCHAR(20) NOT NULL DEFAULT 'open',

        resolution TEXT,
        resolved_by INTEGER,
        resolved_at TIMESTAMP,
        outcome VARCHAR(50),

        refund_amount DECIMAL(10, 2),
        compensation_amount DECIMAL(10, 2),

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT valid_case_type CHECK (case_type IN ('payment_dispute', 'service_quality', 'cancellation_dispute', 'contract_breach', 'other')),
        CONSTRAINT valid_filed_by CHECK (filed_by IN ('client', 'partner')),
        CONSTRAINT valid_mediation_status CHECK (status IN ('open', 'under_review', 'resolved', 'closed'))
      )
    `);
    console.log('   ✅ partner_mediation_cases');

    // Tabla 10: partner_legal_consents (sin FKs)
    await client.query(`
      CREATE TABLE partner_legal_consents (
        id SERIAL PRIMARY KEY,

        partner_id INTEGER NOT NULL,

        consent_type VARCHAR(50) NOT NULL,
        consent_version VARCHAR(20) NOT NULL,

        digital_signature TEXT NOT NULL,
        signature_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        signature_ip VARCHAR(50) NOT NULL,
        user_agent TEXT,

        consent_text TEXT NOT NULL,
        consent_text_hash VARCHAR(64) NOT NULL,

        commission_rate DECIMAL(5, 2),
        commission_calculation VARCHAR(50),

        is_valid BOOLEAN DEFAULT true,
        revoked_at TIMESTAMP,
        revoked_reason TEXT,

        CONSTRAINT valid_consent_type CHECK (
          consent_type IN ('terms_of_service', 'privacy_policy', 'commission_agreement', 'liability_waiver', 'data_processing')
        )
      )
    `);
    console.log('   ✅ partner_legal_consents');

    // Tabla 11: partner_commissions_log (sin FKs)
    await client.query(`
      CREATE TABLE partner_commissions_log (
        id SERIAL PRIMARY KEY,

        partner_id INTEGER NOT NULL,
        service_request_id INTEGER,
        company_id INTEGER NOT NULL,

        calculation_method VARCHAR(50) NOT NULL,
        base_amount DECIMAL(10, 2) NOT NULL,
        commission_percentage DECIMAL(5, 2),
        fixed_amount DECIMAL(10, 2),
        commission_amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'ARS',

        period_start DATE,
        period_end DATE,

        payment_status VARCHAR(20) DEFAULT 'pending',
        paid_at TIMESTAMP,
        payment_reference VARCHAR(255),
        notes TEXT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT valid_calculation_method CHECK (
          calculation_method IN ('per_module_user', 'per_employee', 'per_company', 'per_service')
        ),
        CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'processing', 'paid', 'cancelled'))
      )
    `);
    console.log('   ✅ partner_commissions_log');

    console.log('\n✅ TODAS LAS TABLAS CREADAS (sin FKs)\n');

    // ========================================
    // PASO 3: AGREGAR FOREIGN KEYS
    // ========================================
    console.log('🔗 Agregando Foreign Keys...\n');

    const foreignKeys = [
      // partners → partner_roles
      `ALTER TABLE partners ADD CONSTRAINT fk_partners_role
       FOREIGN KEY (partner_role_id) REFERENCES partner_roles(id) ON DELETE RESTRICT`,

      // partner_documents → partners
      `ALTER TABLE partner_documents ADD CONSTRAINT fk_partner_documents_partner
       FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE`,

      // partner_notifications → partners
      `ALTER TABLE partner_notifications ADD CONSTRAINT fk_partner_notifications_partner
       FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE`,

      // partner_availability → partners
      `ALTER TABLE partner_availability ADD CONSTRAINT fk_partner_availability_partner
       FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE`,

      // partner_service_requests → partners, companies, users
      `ALTER TABLE partner_service_requests ADD CONSTRAINT fk_partner_service_requests_partner
       FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE RESTRICT`,
      `ALTER TABLE partner_service_requests ADD CONSTRAINT fk_partner_service_requests_company
       FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE`,
      `ALTER TABLE partner_service_requests ADD CONSTRAINT fk_partner_service_requests_user
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`,

      // partner_notifications → partner_service_requests
      `ALTER TABLE partner_notifications ADD CONSTRAINT fk_partner_notifications_service_request
       FOREIGN KEY (related_service_request_id) REFERENCES partner_service_requests(id) ON DELETE SET NULL`,

      // partner_reviews → partners, users, partner_service_requests
      `ALTER TABLE partner_reviews ADD CONSTRAINT fk_partner_reviews_partner
       FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE`,
      `ALTER TABLE partner_reviews ADD CONSTRAINT fk_partner_reviews_reviewer
       FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE`,
      `ALTER TABLE partner_reviews ADD CONSTRAINT fk_partner_reviews_service_request
       FOREIGN KEY (service_request_id) REFERENCES partner_service_requests(id) ON DELETE SET NULL`,
      `ALTER TABLE partner_reviews ADD CONSTRAINT fk_partner_reviews_moderator
       FOREIGN KEY (moderated_by) REFERENCES users(id)`,

      // partner_service_conversations → partner_service_requests, users, partners
      `ALTER TABLE partner_service_conversations ADD CONSTRAINT fk_partner_conversations_service_request
       FOREIGN KEY (service_request_id) REFERENCES partner_service_requests(id) ON DELETE CASCADE`,
      `ALTER TABLE partner_service_conversations ADD CONSTRAINT fk_partner_conversations_sender
       FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL`,
      `ALTER TABLE partner_service_conversations ADD CONSTRAINT fk_partner_conversations_partner_sender
       FOREIGN KEY (partner_sender_id) REFERENCES partners(id) ON DELETE SET NULL`,
      `ALTER TABLE partner_service_conversations ADD CONSTRAINT fk_partner_conversations_parent
       FOREIGN KEY (parent_message_id) REFERENCES partner_service_conversations(id)`,

      // partner_mediation_cases → partner_service_requests, partners, companies, users
      `ALTER TABLE partner_mediation_cases ADD CONSTRAINT fk_partner_mediation_service_request
       FOREIGN KEY (service_request_id) REFERENCES partner_service_requests(id) ON DELETE CASCADE`,
      `ALTER TABLE partner_mediation_cases ADD CONSTRAINT fk_partner_mediation_partner
       FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE`,
      `ALTER TABLE partner_mediation_cases ADD CONSTRAINT fk_partner_mediation_company
       FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE`,
      `ALTER TABLE partner_mediation_cases ADD CONSTRAINT fk_partner_mediation_resolver
       FOREIGN KEY (resolved_by) REFERENCES users(id)`,

      // partner_legal_consents → partners
      `ALTER TABLE partner_legal_consents ADD CONSTRAINT fk_partner_consents_partner
       FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE`,

      // partner_commissions_log → partners, partner_service_requests, companies
      `ALTER TABLE partner_commissions_log ADD CONSTRAINT fk_partner_commissions_partner
       FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE RESTRICT`,
      `ALTER TABLE partner_commissions_log ADD CONSTRAINT fk_partner_commissions_service_request
       FOREIGN KEY (service_request_id) REFERENCES partner_service_requests(id) ON DELETE SET NULL`,
      `ALTER TABLE partner_commissions_log ADD CONSTRAINT fk_partner_commissions_company
       FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT`
    ];

    let fkCount = 0;
    for (const sql of foreignKeys) {
      await client.query(sql);
      fkCount++;
      console.log(`   ✅ FK ${fkCount}/${foreignKeys.length}`);
    }

    console.log('\n✅ TODAS LAS FOREIGN KEYS AGREGADAS\n');

    // ========================================
    // PASO 4: CREAR ÍNDICES
    // ========================================
    console.log('📑 Creando índices...\n');

    const indexes = [
      'CREATE INDEX idx_partner_documents_partner ON partner_documents(partner_id)',
      'CREATE INDEX idx_partner_documents_type ON partner_documents(document_type)',
      'CREATE INDEX idx_partner_notifications_partner ON partner_notifications(partner_id)',
      'CREATE INDEX idx_partner_availability_partner ON partner_availability(partner_id)',
      'CREATE INDEX idx_partner_service_requests_partner ON partner_service_requests(partner_id)',
      'CREATE INDEX idx_partner_service_requests_company ON partner_service_requests(company_id)',
      'CREATE INDEX idx_partner_service_requests_status ON partner_service_requests(status)',
      'CREATE INDEX idx_partner_reviews_partner ON partner_reviews(partner_id)',
      'CREATE INDEX idx_partner_reviews_reviewer ON partner_reviews(reviewer_id)',
      'CREATE INDEX idx_partner_reviews_public ON partner_reviews(is_public) WHERE is_public = true',
      'CREATE INDEX idx_partner_conversations_service ON partner_service_conversations(service_request_id)',
      'CREATE INDEX idx_partner_mediation_partner ON partner_mediation_cases(partner_id)',
      'CREATE INDEX idx_partner_mediation_company ON partner_mediation_cases(company_id)',
      'CREATE INDEX idx_partner_consents_partner ON partner_legal_consents(partner_id)',
      'CREATE INDEX idx_partner_commissions_partner ON partner_commissions_log(partner_id)',
      'CREATE INDEX idx_partner_commissions_company ON partner_commissions_log(company_id)'
    ];

    for (const sql of indexes) {
      await client.query(sql);
    }

    console.log('✅ Índices creados\n');

    // ========================================
    // PASO 5: INSERTAR DATOS INICIALES
    // ========================================
    console.log('📝 Insertando datos iniciales...\n');

    await client.query(`
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
    // PASO 6: CREAR TRIGGERS
    // ========================================
    console.log('🔧 Creando triggers...\n');

    await client.query(`
      CREATE OR REPLACE FUNCTION update_partner_rating()
      RETURNS TRIGGER AS $$
      BEGIN
          UPDATE partners
          SET
              rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM partner_reviews WHERE partner_id = NEW.partner_id AND is_public = true),
              total_reviews = (SELECT COUNT(*) FROM partner_reviews WHERE partner_id = NEW.partner_id AND is_public = true),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = NEW.partner_id;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      CREATE TRIGGER trigger_update_partner_rating
      AFTER INSERT OR UPDATE ON partner_reviews
      FOR EACH ROW
      EXECUTE FUNCTION update_partner_rating()
    `);
    console.log('   ✅ Trigger: update_partner_rating');

    await client.query(`
      CREATE OR REPLACE FUNCTION increment_partner_services()
      RETURNS TRIGGER AS $$
      BEGIN
          IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
              UPDATE partners SET total_services = total_services + 1, updated_at = CURRENT_TIMESTAMP WHERE id = NEW.partner_id;
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      CREATE TRIGGER trigger_increment_partner_services
      AFTER UPDATE ON partner_service_requests
      FOR EACH ROW
      EXECUTE FUNCTION increment_partner_services()
    `);
    console.log('   ✅ Trigger: increment_partner_services');

    await client.query(`
      CREATE OR REPLACE FUNCTION create_initial_conversation()
      RETURNS TRIGGER AS $$
      BEGIN
          INSERT INTO partner_service_conversations (service_request_id, sender_type, sender_id, message, sent_at)
          VALUES (NEW.id, 'client', NEW.user_id, 'Solicitud de servicio creada: ' || NEW.service_description, NEW.created_at);
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      CREATE TRIGGER trigger_create_initial_conversation
      AFTER INSERT ON partner_service_requests
      FOR EACH ROW
      EXECUTE FUNCTION create_initial_conversation()
    `);
    console.log('   ✅ Trigger: create_initial_conversation');

    await client.query(`
      CREATE OR REPLACE FUNCTION notify_partner_new_request()
      RETURNS TRIGGER AS $$
      BEGIN
          INSERT INTO partner_notifications (partner_id, notification_type, title, message, related_service_request_id, created_at)
          VALUES (NEW.partner_id, 'new_service_request', 'Nueva solicitud de servicio',
                  'Tienes una nueva solicitud de servicio de ' || (SELECT name FROM companies WHERE id = NEW.company_id),
                  NEW.id, NEW.created_at);
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      CREATE TRIGGER trigger_notify_partner_new_request
      AFTER INSERT ON partner_service_requests
      FOR EACH ROW
      EXECUTE FUNCTION notify_partner_new_request()
    `);
    console.log('   ✅ Trigger: notify_partner_new_request');

    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query('CREATE TRIGGER trigger_partners_updated_at BEFORE UPDATE ON partners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()');
    await client.query('CREATE TRIGGER trigger_partner_reviews_updated_at BEFORE UPDATE ON partner_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()');
    await client.query('CREATE TRIGGER trigger_partner_service_requests_updated_at BEFORE UPDATE ON partner_service_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()');
    await client.query('CREATE TRIGGER trigger_partner_mediation_updated_at BEFORE UPDATE ON partner_mediation_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()');
    console.log('   ✅ Triggers: update_updated_at (4 tablas)');

    console.log('\n✅ Triggers creados\n');

    // ========================================
    // PASO 7: VERIFICACIÓN FINAL
    // ========================================
    console.log('🔍 Verificando instalación...\n');

    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name LIKE 'partner%'
      ORDER BY table_name
    `);

    console.log('📊 Tablas creadas:');
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    const rolesResult = await client.query('SELECT COUNT(*) as count FROM partner_roles');
    console.log(`\n✅ Roles insertados: ${rolesResult.rows[0].count}`);

    const triggersResult = await client.query(`
      SELECT trigger_name, event_object_table FROM information_schema.triggers
      WHERE trigger_name LIKE '%partner%' ORDER BY trigger_name
    `);

    console.log('\n🔧 Triggers instalados:');
    triggersResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.trigger_name} → ${row.event_object_table}`);
    });

    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE!\n');
    console.log('📋 Próximos pasos:');
    console.log('   1. Crear modelos Sequelize');
    console.log('   2. Crear API REST');
    console.log('   3. Frontend Admin + Empresa + Registro\n');

  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error(`   ${error.message}`);
    console.error(`\n   Stack:`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Error fatal:', error.message);
      process.exit(1);
    });
}

module.exports = { runMigration };
