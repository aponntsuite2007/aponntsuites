const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost')
      ? false
      : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    // ============================================================
    // PARTE 1: Crear tablas faltantes
    // ============================================================

    console.log('\n[1/6] Creando partner_reviews...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_reviews (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        reviewer_id INTEGER NOT NULL,
        service_request_id INTEGER REFERENCES partner_service_requests(id) ON DELETE SET NULL,
        company_id INTEGER NOT NULL,

        -- Ratings (1-5 stars)
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
        quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
        timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),

        -- Review content
        comment TEXT,

        -- Partner Response (bidirectional)
        partner_response TEXT,
        partner_response_at TIMESTAMP,

        -- Visibility
        is_public BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_partner_reviews_partner ON partner_reviews(partner_id);
      CREATE INDEX IF NOT EXISTS idx_partner_reviews_company ON partner_reviews(company_id);
      CREATE INDEX IF NOT EXISTS idx_partner_reviews_public ON partner_reviews(is_public) WHERE is_public = true;
    `);
    console.log('OK: partner_reviews creada');

    console.log('\n[2/6] Creando partner_service_conversations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_service_conversations (
        id SERIAL PRIMARY KEY,
        service_request_id INTEGER NOT NULL REFERENCES partner_service_requests(id) ON DELETE CASCADE,

        -- Sender info
        sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('client', 'partner', 'admin', 'mediator')),
        sender_id INTEGER NOT NULL,

        -- Message
        message TEXT NOT NULL,
        attachments JSONB,

        -- SLA tracking
        response_deadline TIMESTAMP,
        is_urgent BOOLEAN DEFAULT false,
        requires_response BOOLEAN DEFAULT true,

        -- Status
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,

        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_request ON partner_service_conversations(service_request_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_unread ON partner_service_conversations(is_read) WHERE is_read = false;
    `);
    console.log('OK: partner_service_conversations creada');

    console.log('\n[3/6] Creando partner_mediation_cases...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_mediation_cases (
        id SERIAL PRIMARY KEY,
        service_request_id INTEGER NOT NULL REFERENCES partner_service_requests(id) ON DELETE CASCADE,
        partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL,

        -- Complainant (quien inicia la mediación)
        complainant_type VARCHAR(20) NOT NULL CHECK (complainant_type IN ('partner', 'company')),
        complaint_reason TEXT NOT NULL,

        -- Mediador asignado (sin FK para evitar problemas de transacción)
        mediator_id INTEGER,
        assigned_at TIMESTAMP,

        -- Resolution
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'escalated')),
        resolution_notes TEXT,
        resolution_action VARCHAR(50),
        resolved_at TIMESTAMP,
        resolved_by INTEGER,

        -- Resultados
        partner_penalized BOOLEAN DEFAULT false,
        company_penalized BOOLEAN DEFAULT false,
        penalty_amount DECIMAL(10, 2),

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_mediation_partner ON partner_mediation_cases(partner_id);
      CREATE INDEX IF NOT EXISTS idx_mediation_company ON partner_mediation_cases(company_id);
      CREATE INDEX IF NOT EXISTS idx_mediation_status ON partner_mediation_cases(status);
    `);
    console.log('OK: partner_mediation_cases creada');

    console.log('\n[4/6] Creando partner_legal_consents...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_legal_consents (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

        -- Consent document
        consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('registration', 'terms_update', 'commission_change')),
        consent_version VARCHAR(20) NOT NULL,
        consent_text TEXT NOT NULL,

        -- Digital Signature (SHA256)
        signature_hash VARCHAR(64) NOT NULL,
        signature_data JSONB NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,

        -- Verification
        is_verified BOOLEAN DEFAULT true,
        verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- Revocation
        is_revoked BOOLEAN DEFAULT false,
        revoked_at TIMESTAMP,
        revocation_reason TEXT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_consents_partner ON partner_legal_consents(partner_id);
      CREATE INDEX IF NOT EXISTS idx_consents_type ON partner_legal_consents(consent_type);
      CREATE INDEX IF NOT EXISTS idx_consents_active ON partner_legal_consents(is_verified, is_revoked);
    `);
    console.log('OK: partner_legal_consents creada');

    console.log('\n[5/6] Creando partner_commissions_log...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_commissions_log (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        service_request_id INTEGER REFERENCES partner_service_requests(id) ON DELETE SET NULL,
        company_id INTEGER NOT NULL,

        -- Calculation base
        calculation_method VARCHAR(50) NOT NULL CHECK (calculation_method IN ('per_module_user', 'per_employee', 'per_company', 'per_service')),
        base_amount DECIMAL(10, 2) NOT NULL,
        commission_percentage DECIMAL(5, 2),

        -- Result
        commission_amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'ARS',

        -- Payment tracking
        payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
        payment_date DATE,
        payment_reference VARCHAR(100),

        -- Period
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,

        -- Metadata
        calculation_details JSONB,
        notes TEXT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_commissions_partner ON partner_commissions_log(partner_id);
      CREATE INDEX IF NOT EXISTS idx_commissions_company ON partner_commissions_log(company_id);
      CREATE INDEX IF NOT EXISTS idx_commissions_status ON partner_commissions_log(payment_status);
      CREATE INDEX IF NOT EXISTS idx_commissions_period ON partner_commissions_log(period_start, period_end);
    `);
    console.log('OK: partner_commissions_log creada');

    // ============================================================
    // PARTE 2: Crear triggers automáticos
    // ============================================================

    console.log('\n[6/6] Creando triggers automáticos...');

    // Trigger 1: Update partner rating on new review
    await client.query(`
      CREATE OR REPLACE FUNCTION update_partner_rating()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE partners
        SET
          rating = (SELECT ROUND(AVG(rating)::numeric, 2)
                    FROM partner_reviews
                    WHERE partner_id = NEW.partner_id AND is_public = true),
          total_reviews = (SELECT COUNT(*)
                          FROM partner_reviews
                          WHERE partner_id = NEW.partner_id AND is_public = true),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.partner_id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_update_partner_rating ON partner_reviews;
      CREATE TRIGGER trigger_update_partner_rating
      AFTER INSERT OR UPDATE OF rating, is_public ON partner_reviews
      FOR EACH ROW
      EXECUTE FUNCTION update_partner_rating();
    `);
    console.log('  ✓ Trigger: update_partner_rating');

    // Trigger 2: Increment partner services on completion
    await client.query(`
      CREATE OR REPLACE FUNCTION increment_partner_services()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
          UPDATE partners
          SET total_services = total_services + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = NEW.partner_id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_increment_partner_services ON partner_service_requests;
      CREATE TRIGGER trigger_increment_partner_services
      AFTER INSERT OR UPDATE OF status ON partner_service_requests
      FOR EACH ROW
      EXECUTE FUNCTION increment_partner_services();
    `);
    console.log('  ✓ Trigger: increment_partner_services');

    // Trigger 3: Auto-create conversation on new service request
    await client.query(`
      CREATE OR REPLACE FUNCTION create_initial_conversation()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO partner_service_conversations (
          service_request_id,
          sender_type,
          sender_id,
          message,
          requires_response
        ) VALUES (
          NEW.id,
          'client',
          NEW.user_id,
          NEW.service_description,
          true
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_create_initial_conversation ON partner_service_requests;
      CREATE TRIGGER trigger_create_initial_conversation
      AFTER INSERT ON partner_service_requests
      FOR EACH ROW
      EXECUTE FUNCTION create_initial_conversation();
    `);
    console.log('  ✓ Trigger: create_initial_conversation');

    // Trigger 4: Notify partner on new service request
    await client.query(`
      CREATE OR REPLACE FUNCTION notify_partner_new_request()
      RETURNS TRIGGER AS $$
      DECLARE
        company_name_var VARCHAR;
      BEGIN
        SELECT name INTO company_name_var FROM companies WHERE company_id = NEW.company_id;

        INSERT INTO partner_notifications (
          partner_id,
          notification_type,
          title,
          message,
          related_service_request_id
        ) VALUES (
          NEW.partner_id,
          'new_service_request',
          'Nueva solicitud de servicio',
          'Tienes una nueva solicitud de servicio de ' || COALESCE(company_name_var, 'una empresa'),
          NEW.id
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_notify_partner_new_request ON partner_service_requests;
      CREATE TRIGGER trigger_notify_partner_new_request
      AFTER INSERT ON partner_service_requests
      FOR EACH ROW
      EXECUTE FUNCTION notify_partner_new_request();
    `);
    console.log('  ✓ Trigger: notify_partner_new_request');

    // Trigger 5: Update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_update_partner_reviews_timestamp ON partner_reviews;
      CREATE TRIGGER trigger_update_partner_reviews_timestamp
      BEFORE UPDATE ON partner_reviews
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS trigger_update_mediation_cases_timestamp ON partner_mediation_cases;
      CREATE TRIGGER trigger_update_mediation_cases_timestamp
      BEFORE UPDATE ON partner_mediation_cases
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS trigger_update_commissions_timestamp ON partner_commissions_log;
      CREATE TRIGGER trigger_update_commissions_timestamp
      BEFORE UPDATE ON partner_commissions_log
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('  ✓ Trigger: update_updated_at_column (3 tablas)');

    console.log('\n✅ Migración completada exitosamente!');
    console.log('\n📊 Resumen:');
    console.log('  ✓ 5 tablas creadas: reviews, conversations, mediation, consents, commissions');
    console.log('  ✓ 5 funciones de trigger creadas');
    console.log('  ✓ 8 triggers configurados');
    console.log('  ✓ 15 índices para optimización');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
